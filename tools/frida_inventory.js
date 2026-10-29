// Runtime inventory only; no score manipulation or gameplay modifications.
setTimeout(function () {
  try {
    var mods = Process.enumerateModules().filter(function (m) {
      return /cocos|nesec|nms/i.test(m.name);
    });
    mods.forEach(function (m) {
      var hits = m.enumerateExports().filter(function (e) {
        return /eval|script|decrypt|xxtea|jsb/i.test(e.name);
      }).slice(0, 100).map(function (e) { return e.name; });
      send({type: 'module', name: m.name, exports: hits});
    });
    if (Java.available) {
      Java.perform(function () {
        var names = Java.enumerateLoadedClassesSync().filter(function (n) {
          return /cocos2dx\.javascript|JavascriptJavaBridge|Cocos2dxHelper/.test(n);
        });
        send({type: 'classes', names: names.slice(0, 200)});
      });
    } else {
      send({type: 'error', detail: 'Java bridge unavailable'});
    }
  } catch (e) { send({type: 'error', detail: String(e)}); }
}, 1000);
