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
        component._continuousEliminateTimes=90;
        log({kind:'set',combo:component._continuousEliminateTimes,un:component._unEliminateTimes});
      } catch(e) { log({kind:'error',message:String(e),stack:String(e.stack)}); }
    }.toString() + ')();';
    send({type:'eval_return',value:Bridge.evalString(code)});
  }}});
  Helper.runOnGLThread(Probe.$new());
});
setTimeout(function(){send({type:'done'});},12000);
