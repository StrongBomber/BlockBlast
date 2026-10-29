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
                'var gn=cc.find("persist/gameUiLayer/ClassGame");(gn._components||[]).forEach(function(c){try{var p=Object.getPrototypeOf(c),keys=Object.getOwnPropertyNames(c),pk=Object.getOwnPropertyNames(p||{});log({kind:"game-component",className:cc.js.getClassName(c),keys:keys,prototype:pk})}catch(e){}});' +
                'try{var game=gn.getComponent("ClassGame"),op=game.operator,seen=[],result=[];function scan(o,path,depth){if(!o||typeof o!=="object"||seen.indexOf(o)>=0||seen.length>200||depth>3)return;seen.push(o);Object.keys(o).slice(0,150).forEach(function(k){try{var v=o[k],t=typeof v;if(/score|point/i.test(k))result.push({path:path+"."+k,type:t,value:t==="number"||t==="string"?v:null});if(t==="object"&&v&&!(v instanceof cc.Node))scan(v,path+"."+k,depth+1)}catch(e){}});var proto=Object.getPrototypeOf(o);if(proto){Object.getOwnPropertyNames(proto).filter(function(k){return /score|point/i.test(k)}).forEach(function(k){result.push({path:path+"."+k,type:typeof o[k],source:String(o[k]).slice(0,700)})})}}scan(op,"operator",0);scan(game._state,"gameState",0);log({kind:"operator-score-map",list:result.slice(0,80)})}catch(e){log({kind:"operator-error",error:String(e)})}' +
                'try{var topKeys=Object.getOwnPropertyNames(top),em=top._eventManager,emProto=em&&Object.getPrototypeOf(em);log({kind:"top-details",keys:topKeys,eventManagerType:typeof em,eventManagerClass:em&&em.constructor&&em.constructor.name,eventManagerKeys:em?Object.getOwnPropertyNames(em):[],eventManagerProto:emProto?Object.getOwnPropertyNames(emProto):[],eventManagerDispatch:em&&String(em.dispatchModuleEvent).slice(0,1200)});var game=gn.getComponent("ClassGame"),op=game.operator;log({kind:"operator-components",components:(op._components||[]).map(function(c){return {className:cc.js.getClassName(c),keys:Object.getOwnPropertyNames(c),proto:Object.getOwnPropertyNames(Object.getPrototypeOf(c)||{})}})})}catch(e){log({kind:"details-error",error:String(e)})}' +
                'try{var ls=cc.sys.localStorage, found=[];for(var i=0;i<ls.length&&i<400;i++){var k=ls.key(i),raw=ls.getItem(k),obj;try{obj=JSON.parse(raw)}catch(e){continue}function scan(v,p,d){if(d>5||v===null||typeof v!=="object")return;Object.keys(v).slice(0,250).forEach(function(n){var x=v[n],t=typeof x;if(/score/i.test(n))found.push({key:k,path:p+"."+n,type:t,value:t==="number"?x:null});if(x&&t==="object")scan(x,p+"."+n,d+1)})}scan(obj,"$",0)}log({kind:"storage-score-fields",list:found.slice(0,100),length:ls.length});log({kind:"global-score-keys",keys:Object.getOwnPropertyNames(window).filter(function(k){return /score|module|manager|game|data/i.test(k)}).slice(0,100)});log({kind:"require-source",source:String(window.__require).slice(0,2000)})}catch(e){log({kind:"storage-error",error:String(e)})}' +
                "try {\n for (var level=0; level<160; level++) {\n  var key=\"__arena_registry_probe_\"+level+\"__\", visits=0, table=null, cache=null;\n  var entry=[function(req,mod,exp,other,modules,loaded){table=modules;cache=loaded},{}];\n  Object.defineProperty(Object.prototype,key,{configurable:true,get:function(){return ++visits >= 2+3*level ? entry : undefined},set:function(v){Object.defineProperty(this,key,{configurable:true,writable:true,value:v})}});\n  try { window.__require(key,true); } catch(err) {} finally { delete Object.prototype[key]; if(cache)delete cache[key]; }\n  if(!table){log({kind:\"registry-end\",level:level,visits:visits});break;}\n  var keys=Object.keys(table), names=keys.filter(function(k){return /^(ClassScore|Score|ClassTopInfo)/i.test(k)});\n  if(names.length)log({kind:\"score-registry\",level:level,count:keys.length,names:names.slice(0,100)});\n  names.filter(function(k){return /^(ClassScore|Score)/i.test(k)}).slice(0,25).forEach(function(k){try{var src=String(table[k][0]),re=/prototype\.addScore|prototype\.setScore|classScoreInfo|setItem\(\"classScore\"|E_ClassScore_Add|E_ClassScore_Update/ig,m,count=0;while((m=re.exec(src))&&count++<5){log({kind:\"score-module\",level:level,module:k,context:src.slice(Math.max(0,m.index-180),Math.min(src.length,m.index+650))})}}catch(e){}});\n }\n}catch(err){log({kind:\"registry-error\",error:String(err)})}" +
                'var labels=[];function visit(n,path){if(!n)return;var np=path+"/"+n.name;(n._components||[]).forEach(function(c){try{if(c instanceof cc.Label||c instanceof cc.RichText){var text=c.string;if(text)labels.push({path:np,text:text,active:n.activeInHierarchy})}}catch(e){}});(n.children||[]).forEach(function(c){visit(c,np)})}visit(cc.director.getScene(),"");log({kind:"labels",list:labels.slice(0,80)});' +
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
