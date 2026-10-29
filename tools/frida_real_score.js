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
          name: 'ai.arena.blockblast.runtime.RealScoreTraceProbe',
          implements: [Runnable],
          methods: {run: function () {
            try {
              var code = '(function(){try{' +
                'var log=function(o){jsb.reflection.callStaticMethod("android/util/Log","i","(Ljava/lang/String;Ljava/lang/String;)I","ArenaJS",JSON.stringify(o));};' +
                'var top=cc.find("persist/gameUiLayer/ClassGame/topContainer/ClassTopInfo").getComponent("ClassTopInfo"),state=top._state;' +
                'try{var game=cc.find("persist/gameUiLayer/ClassGame").getComponent("ClassGame"),em=game._eventManager;log({kind:"dispatcher-details",keys:em?Object.getOwnPropertyNames(em):[],proto:em?Object.getOwnPropertyNames(Object.getPrototypeOf(em)||{}):[],cls:em&&em.constructor&&em.constructor.name});if(em&&typeof em.dispatchModuleEvent==="function"){var dispatch=em.dispatchModuleEvent;em.dispatchModuleEvent=function(){var args=Array.prototype.map.call(arguments,function(a){try{return JSON.stringify(a).slice(0,1000)}catch(e){return String(a)}});log({kind:"dispatch",args:args});return dispatch.apply(this,arguments)}}}catch(e){log({kind:"dispatch-error",error:String(e)})}' +
                "try { var cls=window.__require(\"ClassScore_Proxy\").ClassScore_Proxy, model=window.__require(\"ClassScoreInfo\").classScoreInfo; var original=cls.prototype.increaseScoreByRound; log({kind:\"candidate-hook\",originalType:typeof original,score:model.score}); cls.prototype.increaseScoreByRound=function(group){ var result=original.apply(this,arguments); var before={curScore:result.curScore,baseScore:result.baseScore,comboScore:result.comboScore,screenScore:result.screenScore,blockScore:result.blockScore}; [\"baseScore\",\"comboScore\",\"screenScore\",\"blockScore\"].forEach(function(k){if(result[k]>0)result[k]*=10}); log({kind:\"candidate-award\",before:before,after:result}); return result; }; } catch(e) {log({kind:\"candidate-error\",error:String(e)})}" +
                '["onScoreUpdate","receivedEvents","setState"].forEach(function(k){var orig=top[k];if(typeof orig!=="function")return;top[k]=function(){var vals=Array.prototype.map.call(arguments,function(a){try{return JSON.stringify(a,function(key,v){if(v&&typeof v==="object"&&key==="parent")return "[parent]";return v}).slice(0,2500)}catch(e){return String(a)}});log({kind:"event-call",name:k,args:vals});return orig.apply(this,arguments)}});' +
                '["currentScore","addScore","highScore"].forEach(function(k){try{var d=Object.getOwnPropertyDescriptor(state,k);log({kind:"score-descriptor",name:k,configurable:d&&d.configurable,writable:d&&d.writable,value:state[k]});if(d&&d.configurable&&d.writable&&!d.get&&!d.set){var val=state[k];Object.defineProperty(state,k,{configurable:true,enumerable:d.enumerable,get:function(){return val},set:function(v){log({kind:"score-write",name:k,before:val,after:v,stack:String(new Error().stack).slice(0,2000)});val=v}})}}catch(e){log({kind:"hook-error",name:k,error:String(e)})}});' +
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
