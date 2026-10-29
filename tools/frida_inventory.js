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
                'var g=typeof window!=="undefined"?window:this;' +
                'var log=function(o){jsb.reflection.callStaticMethod("android/util/Log","i","(Ljava/lang/String;Ljava/lang/String;)I","ArenaJS",JSON.stringify(o));};' +
                'var fn=function(x){try{return typeof x==="function"?String(x).slice(0,700):typeof x}catch(e){return String(e)}};' +
                'log({kind:"loaders",req:fn(g.__require),reqProps:Object.keys(g.__require||{}),requireModule:fn(g.requireModule),combileRequire:fn(g.combileRequire)});' +
                'var root=(typeof cc!=="undefined"&&cc.director)?cc.director.getScene():null, hits=[],seen=0;' +
                'function walk(n,p){if(!n||seen++>1000)return;var path=p+"/"+n.name,cs=n._components||[];' +
                'cs.forEach(function(c){try{var cl=cc.js.getClassName(c)||"?",ks=Object.keys(c).filter(function(k){return /score|block|board|level/i.test(k)}).slice(0,12);if(ks.length||/score|block|board|game/i.test(cl))hits.push({path:path,cls:cl,keys:ks})}catch(e){}});' +
                'if(/score|block|board/i.test(n.name))hits.push({path:path});' +
                '(n.children||[]).forEach(function(c){walk(c,path)})}' +
                'if(root)walk(root,""); log({kind:"scene",name:root&&root.name,visited:seen,hits:hits.slice(0,60)});' +
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
