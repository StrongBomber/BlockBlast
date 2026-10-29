const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const hook = fs.readFileSync('menu/src/main/assets/arena_score_hook.js', 'utf8');
let multiplier = 1;
let calls = 0;
function Proxy() {}
Proxy.prototype.increaseScoreByRound = function (value) { calls++; return value; };
const context = { window: {}, jsb: { reflection: { callStaticMethod: (cls) => cls === 'ai/arena/blockblast/menu/ScoreMultiplier' ? multiplier : 0 } } };
context.window.jsb = context.jsb;
context.window.__require = (name) => {
  if (name !== 'ClassScore_Proxy') throw Error('module unavailable');
  return { ClassScore_Proxy: Proxy };
};
vm.createContext(context);
vm.runInContext(hook, context);
const wrapped = Proxy.prototype.increaseScoreByRound;
vm.runInContext(hook, context);
assert.equal(Proxy.prototype.increaseScoreByRound, wrapped, 'install must be idempotent');
const proxy = new Proxy();
const group = () => ({curScore: 20, baseScore: 3, comboScore: 5, screenScore: 2, blockScore: 1});
for (const factor of [1, 10, 100, 1000]) {
  multiplier = factor;
  const value = proxy.increaseScoreByRound(group());
  assert.equal(value.curScore, 20);
  assert.equal(value.baseScore, 3 * factor);
  assert.equal(value.comboScore, 5 * factor);
  assert.equal(value.screenScore, 2 * factor);
  assert.equal(value.blockScore, factor);
}
multiplier = 1000;
const limited = proxy.increaseScoreByRound({curScore: 2147483640, baseScore: 2, comboScore: 3, screenScore: 0, blockScore: 0});
assert.equal(limited.curScore + limited.baseScore + limited.comboScore, 2147483647);
const penalties = proxy.increaseScoreByRound({curScore: 100, baseScore: -2, comboScore: 1, screenScore: 0, blockScore: 0});
assert.equal(penalties.baseScore, -2);
assert.equal(penalties.comboScore, 1000);
assert.equal(calls, 6, 'original executes once per award');
console.log('Score hook tests passed');
