// Read-only runtime inventory and small Cocos global/scene probe.
setTimeout(function () {
  try {
    Process.enumerateModules().filter(function (m) {
      return /cocos|nesec|nms/i.test(m.name);
    }).forEach(function (m) {
      var hits = m.enumerateExports().filter(function (e) {
        return /eval|script|decrypt|xxtea|jsb/i.test(e.name);
      }).slice(0, 100).map(function (e) { return e.name; });
      send({type: 'module', name: m.name, exports: hits});
    });
    if (!Java.available) { send({type: 'error', detail: 'Java bridge unavailable'}); return; }
    Java.perform(function () {
      try {
        var Bridge = Java.use('org.cocos2dx.lib.Cocos2dxJavascriptJavaBridge');
        var Helper = Java.use('org.cocos2dx.lib.Cocos2dxHelper');
        var methods = function (c) { return c.class.getDeclaredMethods().map(function (m) { return m.toString(); }); };
        send({type: 'bridge_methods', names: methods(Bridge)});
        send({type: 'helper_methods', names: methods(Helper).filter(function (s) { return /Thread|thread/.test(s); })});
        var Runnable = Java.use('java.lang.Runnable');
        var Probe = Java.registerClass({
          name: 'ai.arena.blockblast.runtime.ReadOnlyProbe',
          implements: [Runnable],
          methods: {run: function () {
            try {
              var code = '(function(){try{' +
                'var log=function(o){jsb.reflection.callStaticMethod("android/util/Log","i","(Ljava/lang/String;Ljava/lang/String;)I","ArenaJS",JSON.stringify(o));};' +
                'function describe(label,o){if(!o)return log({kind:"missing",label:label});var own=Object.getOwnPropertyNames(o).slice(0,130),p=Object.getPrototypeOf(o),methods=[];' +
                'for(var d=0;p&&d<3;d++,p=Object.getPrototypeOf(p))Object.getOwnPropertyNames(p).forEach(function(k){if(methods.indexOf(k)<0)methods.push(k)});' +
                'log({kind:"describe",label:label,cls:o.constructor&&o.constructor.name,own:own,methods:methods.filter(function(k){return /score|points|combo|game|data|place|merge|elimin|board/i.test(k)})});' +
                'own.forEach(function(k){try{var desc=Object.getOwnPropertyDescriptor(o,k),v=desc&&desc.value;if(v&&typeof v==="object"&&!Array.isArray(v)&&!(v instanceof cc.Node)){var ks=Object.getOwnPropertyNames(v),score=ks.filter(function(q){return /score|points|combo/i.test(q)});if(score.length)log({kind:"nested-score",label:label,key:k,keys:score})}}catch(e){}})}' +
                'var n=cc.find("persist/gameUiLayer/ClassGame"),c=n&&n.getComponent("ClassGame");describe("ClassGame",c);describe("ClassGame.operator",c&&c.operator);' +
                'if(c&&c.operator)Object.getOwnPropertyNames(c.operator).forEach(function(k){try{var v=Object.getOwnPropertyDescriptor(c.operator,k).value;if(v&&typeof v==="object"&&!Array.isArray(v)&&!(v instanceof cc.Node))describe("operator."+k,v)}catch(e){}});' +
                'var top=cc.find("persist/gameUiLayer/ClassGame/topContainer/ClassTopInfo");if(top)(top._components||[]).forEach(function(c){describe("top:"+cc.js.getClassName(c),c)});' +
                '}catch(e){jsb.reflection.callStaticMethod("android/util/Log","e","(Ljava/lang/String;Ljava/lang/String;)I","ArenaJS",String(e))}})();';
              send({type: 'eval_return', value: Bridge.evalString(code)});
            } catch (e) { send({type: 'eval_error', detail: String(e)}); }
          }}
        });
        Helper.runOnGLThread(Probe.$new());
        send({type: 'scheduled'});
      } catch (e) { send({type: 'error', detail: String(e)}); }
    });
  } catch (e) { send({type: 'error', detail: String(e)}); }
  setTimeout(function () { send({type:'done'}); }, 12000);
}, 1000);
