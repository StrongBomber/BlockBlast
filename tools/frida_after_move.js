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
          name: 'ai.arena.blockblast.runtime.ReadOnlyProbeAfterMove',
          implements: [Runnable],
          methods: {run: function () {
            try {
              var code = '(function(){try{' +
                'var log=function(o){jsb.reflection.callStaticMethod("android/util/Log","i","(Ljava/lang/String;Ljava/lang/String;)I","ArenaJS",JSON.stringify(o));};' +
                'var top=cc.find("persist/gameUiLayer/ClassGame/topContainer/ClassTopInfo").getComponent("ClassTopInfo"),state=top._state;' +
                'var keys=Object.getOwnPropertyNames(state);log({kind:"state",cls:state.constructor&&state.constructor.name,keys:keys});' +
                'keys.filter(function(k){return /score|combo/i.test(k)}).forEach(function(k){try{var d=Object.getOwnPropertyDescriptor(state,k),v=state[k];log({kind:"field",name:k,type:typeof v,value:typeof v==="number"||typeof v==="string"?v:null,descriptor:{get:d&&d.get?String(d.get).slice(0,700):null,set:d&&d.set?String(d.set).slice(0,700):null},source:typeof v==="function"?String(v).slice(0,700):null})}catch(e){log({kind:"field-error",name:k,error:String(e)})}});' +
                'var names=["updateScore","updateCurrentScore","resetScore","modifyScoreInGuide"];names.forEach(function(k){try{log({kind:"method",name:k,source:String(top[k]).slice(0,900)})}catch(e){}});' +
                'var hits=[],seen=0,root=cc.director.getScene();function walk(n,p){if(!n||seen++>1500)return;var path=p+"/"+n.name;(n._components||[]).forEach(function(c){try{var s=c._state;if(s&&typeof s==="object"){var ks=Object.keys(s).filter(function(k){return /score/i.test(k)});if(ks.length)hits.push({path:path,cls:cc.js.getClassName(c),keys:ks})}}catch(e){}});(n.children||[]).forEach(function(c){walk(c,path)})}walk(root,"");hits.slice(0,30).forEach(function(x){log({kind:"component-state",item:x})});' +
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
