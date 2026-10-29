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
                'var k=Object.keys(g).filter(function(x){return /score|game|require|block/i.test(x)}).slice(0,80);' +
                'var s=(typeof cc!=="undefined"&&cc.director)?cc.director.getScene():null;' +
                'var o={keys:k,cc:typeof cc,requireType:typeof g.__require,scene:s&&s.name,children:s&&s.children?s.children.map(function(n){return n.name}).slice(0,50):[]};' +
                'jsb.reflection.callStaticMethod("android/util/Log","i","(Ljava/lang/String;Ljava/lang/String;)I","ArenaJS",JSON.stringify(o));' +
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
