// Examine the classic game's actual combo state on the GL thread.
Java.perform(function () {
  var Bridge = Java.use('org.cocos2dx.lib.Cocos2dxJavascriptJavaBridge');
  var Helper = Java.use('org.cocos2dx.lib.Cocos2dxHelper');
  var Runnable = Java.use('java.lang.Runnable');
  var Probe = Java.registerClass({name:'ai.arena.blockblast.runtime.ComboProbe', implements:[Runnable], methods:{run:function () {
    var code = '(' + function () {
      function log(data) { jsb.reflection.callStaticMethod('android/util/Log', 'i', '(Ljava/lang/String;Ljava/lang/String;)I', 'ArenaComboProbe', JSON.stringify(data)); }
      try {
        var game = cc.find('persist/gameUiLayer/ClassGame');
        var component = game && game.getComponent('BlocksProducerTouch');
        if (!component) throw Error('BlocksProducerTouch not found');
        log({kind:'initial', combo:component._continuousEliminateTimes, un:component._unEliminateTimes});
        for (var level=0; level<160; level++) {
          var key='__arena_combo_registry_' + level + '__', visits=0, table=null, cache=null;
          var entry=[function(req,mod,exp,other,modules,loaded){ table=modules; cache=loaded; },{}];
          Object.defineProperty(Object.prototype,key,{configurable:true,get:function(){return ++visits>=2+3*level ? entry : undefined;},set:function(v){Object.defineProperty(this,key,{configurable:true,writable:true,value:v});}});
          try { window.__require(key,true); } catch (_) {} finally { delete Object.prototype[key]; if(cache) delete cache[key]; }
          if (!table) break;
          Object.keys(table).forEach(function(name) {
            if (!/BlocksProducerTouch|ClassGameInfo|ClassScore_Proxy/.test(name)) return;
            var source=String(table[name][0]), regex=/prototype[.](computeContinuousEliminateTimes|computeUnEliminateTimes|resetComboState)|_continuousEliminateTimes/g, match, count=0;
            while ((match=regex.exec(source)) && count++<80) log({kind:'factory',module:name,context:source.slice(Math.max(0,match.index-350),match.index+650)});
          });
        }

        ['getContinuousEliminateTimes','computeContinuousEliminateTimes','resetComboState','reset','createEliminate','precessUnEliminateTimes','touchFollowUpEliminateTimes','traitEnableInitUnEliminateTimes'].forEach(function(name) {
          log({kind:'method', name:name, source:String(component[name]).slice(0,4000)});
        });
        var original=component.computeContinuousEliminateTimes;
        component.computeContinuousEliminateTimes=function() {
          var before=this._continuousEliminateTimes;
          var args=Array.prototype.map.call(arguments,function(x){return typeof x === 'object' ? String(x) : x;});
          var result=original.apply(this,arguments);
          log({kind:'computed',before:before,after:this._continuousEliminateTimes,args:args,result:result});
          return result;
        };
        component.resetComboState(90, 0);
        log({kind:'set',combo:component._continuousEliminateTimes,un:component._unEliminateTimes});
        var old = component._putEliminates;
        component._putEliminates = [{}];
        component.computeContinuousEliminateTimes(component._comboAllowNoContinuousTimes);
        log({kind:'simulated-clear',combo:component._continuousEliminateTimes,un:component._unEliminateTimes});
        component._putEliminates = old;
        component.resetComboState(90,0);
      } catch(e) { log({kind:'error',message:String(e),stack:String(e.stack)}); }
    }.toString() + ')();';
    send({type:'eval_return',value:Bridge.evalString(code)});
  }}});
  Helper.runOnGLThread(Probe.$new());
});
setTimeout(function(){send({type:'done'});},12000);
