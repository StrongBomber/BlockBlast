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
      if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 2147483647) multiplier = 1;
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

/* Apply a one-shot combo request to the classic game's own counter on its GL thread. */
(function () {
  try {
    if (!window.jsb || !jsb.reflection || typeof cc === 'undefined') return;
    var pending = Number(jsb.reflection.callStaticMethod(
      'ai/arena/blockblast/menu/ComboControl', 'getPending', '()I'));
    if (!Number.isInteger(pending) || pending < 0 || pending > 1000000) return;
    var game = cc.find('persist/gameUiLayer/ClassGame');
    var producer = game && game.getComponent('BlocksProducerTouch');
    if (!producer || typeof producer.resetComboState !== 'function') return;
    var compute = producer.computeContinuousEliminateTimes;
    if (typeof compute === 'function' && !compute.__arenaComboTrace) {
      var traced = function () {
        var old = this._continuousEliminateTimes;
        var result = compute.apply(this, arguments);
        try {
          jsb.reflection.callStaticMethod('android/util/Log', 'i',
            '(Ljava/lang/String;Ljava/lang/String;)I', 'ArenaComboHook',
            JSON.stringify({step: true, before: old, after: this._continuousEliminateTimes,
              cleared: this._putEliminates && this._putEliminates.length}));
        } catch (_) {}
        return result;
      };
      traced.__arenaComboTrace = true;
      producer.computeContinuousEliminateTimes = traced;
    }
    var before = producer._continuousEliminateTimes;
    producer.resetComboState(pending, 0);
    if (producer._continuousEliminateTimes !== pending) return;
    jsb.reflection.callStaticMethod('ai/arena/blockblast/menu/ComboControl',
      'acknowledge', '(I)V', pending);
    jsb.reflection.callStaticMethod('android/util/Log', 'i',
      '(Ljava/lang/String;Ljava/lang/String;)I', 'ArenaComboHook',
      JSON.stringify({applied: pending, before: before, unEliminateTimes: producer._unEliminateTimes}));
  } catch (err) {
    try {
      jsb.reflection.callStaticMethod('android/util/Log', 'w',
        '(Ljava/lang/String;Ljava/lang/String;)I', 'ArenaComboHook', 'error: ' + String(err));
    } catch (_) {}
    // Keep the request pending while the classic game is not ready.
  }
})();
