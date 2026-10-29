/* Classic mode score-award hook. Loaded on the Cocos GL thread. */
(function () {
  try {
    if (!window.__require || !window.jsb || !jsb.reflection) return;
    var exports = window.__require('ClassScore_Proxy');
    var cls = exports && exports.ClassScore_Proxy;
    var proto = cls && cls.prototype;
    if (!proto || typeof proto.increaseScoreByRound !== 'function' ||
        proto.increaseScoreByRound.__arenaScoreHook) return;
    var original = proto.increaseScoreByRound;
    function log(message) {
      try { jsb.reflection.callStaticMethod('android/util/Log', 'i',
        '(Ljava/lang/String;Ljava/lang/String;)I', 'ArenaScoreHook', message); } catch (_) {}
    }
    function wrapped(group) {
      var result = original.apply(this, arguments);
      if (!result || typeof result !== 'object') return result;
      var multiplier = 1;
      try { multiplier = Number(jsb.reflection.callStaticMethod(
        'ai/arena/blockblast/menu/ScoreMultiplier', 'get', '()I')); } catch (_) {}
      if (multiplier !== 10 && multiplier !== 100 && multiplier !== 1000) multiplier = 1;
      var keys = ['baseScore', 'comboScore', 'screenScore', 'blockScore'];
      var current = Number(result.curScore);
      if (!Number.isFinite(current) || current < 0) return result;
      if (multiplier === 1) {
        var unchanged = keys.reduce(function (sum, key) {
          var value = result[key];
          return sum + (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);
        }, 0);
        log(JSON.stringify({factor: 1, before: unchanged, after: unchanged, current: current}));
        return result;
      }
      var budget = Math.max(0, 2147483647 - current);
      var before = 0, after = 0;
      keys.forEach(function (key) {
        var value = result[key];
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
          before += value;
          var scaled = Math.min(budget, value * multiplier);
          result[key] = scaled;
          after += scaled;
          budget -= scaled;
        }
      });
      log(JSON.stringify({factor: multiplier, before: before, after: after, current: current}));
      return result;
    }
    wrapped.__arenaScoreHook = true;
    proto.increaseScoreByRound = wrapped;
    log('installed');
    try { log('loaded-score:' + Number(window.__require('ClassScoreInfo').classScoreInfo.score)); } catch (_) {}
  } catch (_) {
    // Bundles are loaded asynchronously; the lifecycle bridge retries later.
  }
})();
