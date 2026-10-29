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
                'var root=cc.director.getScene(),hits=[],seen=0,unique={};' +
                'function walk(n,p){if(!n||seen++>1500)return;var path=p+"/"+n.name;(n._components||[]).forEach(function(c){try{var cl=cc.js.getClassName(c)||"?";if(/score/i.test(cl)||/score/i.test(n.name)){var id=path+cl;if(!unique[id]){unique[id]=1;hits.push({path:path,cls:cl})}}}catch(e){}});(n.children||[]).forEach(function(c){walk(c,path)})}' +
                'walk(root,"");log({kind:"score-components",items:hits.slice(0,35),visited:seen});' +
                'function inspect(path,klass){var n=cc.find(path),c=n&&n.getComponent(klass);if(!c){log({kind:"missing",path:path,cls:klass});return;}' +
                'var own=Object.getOwnPropertyNames(c).slice(0,150),proto=Object.getPrototypeOf(c),names=[],methods=[];' +
                'for(var d=0;proto&&d<4;d++,proto=Object.getPrototypeOf(proto)){Object.getOwnPropertyNames(proto).forEach(function(k){if(names.indexOf(k)<0)names.push(k);try{var v=Object.getOwnPropertyDescriptor(proto,k).value;if(typeof v==="function"&&(/score|point|combo|elimin|place/i.test(k)||/score/i.test(String(v))))methods.push({name:k,source:String(v).slice(0,1000)})}catch(e){}})}' +
                'log({kind:"component",cls:klass,own:own,methods:names.filter(function(k){return /score|point|combo|elimin|place|block|data/i.test(k)})});' +
                'methods.slice(0,12).forEach(function(m){log({kind:"method-name",cls:klass,name:m.name})});' +
                'own.forEach(function(k){try{var v=Object.getOwnPropertyDescriptor(c,k).value;if(v&&typeof v==="object"&&!Array.isArray(v)){var a=Object.keys(v).filter(function(q){return /score|points|combo/i.test(q)});if(a.length)log({kind:"nested",cls:klass,key:k,keys:a.slice(0,25)})}}catch(e){}})}' +
                'inspect("persist/gameUiLayer/ClassGame","ClassGame");inspect("persist/gameUiLayer/ClassGame/boardContainer/Board","Board");' +
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
