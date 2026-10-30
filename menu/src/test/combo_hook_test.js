const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const hook = fs.readFileSync('menu/src/main/assets/arena_score_hook.js', 'utf8');
let pending = 90;
let calls = 0;
let present = true;
const producer = {
  _continuousEliminateTimes: 3,
  _unEliminateTimes: 2,
  _putEliminates: [{}],
  computeContinuousEliminateTimes() { if (this._putEliminates.length) this._continuousEliminateTimes++; },
  resetComboState(value, un) { calls++; this._continuousEliminateTimes = value; this._unEliminateTimes = un; }
};
const cc = {find(path) { assert.equal(path, 'persist/gameUiLayer/ClassGame'); return present ? {getComponent: () => producer} : null; }};
const jsb = {reflection: {callStaticMethod(cls, name, signature, arg) {
  if (cls.endsWith('ComboControl') && name === 'getPending') return pending;
  if (cls.endsWith('ComboControl') && name === 'acknowledge') { assert.equal(arg, pending); pending = -1; return; }
  return 0;
}}};
const context = vm.createContext({window: {jsb, cc}, jsb, cc});
vm.runInContext(hook, context);
assert.equal(producer._continuousEliminateTimes, 90);
assert.equal(producer._unEliminateTimes, 0);
assert.equal(pending, -1);
producer.computeContinuousEliminateTimes();
assert.equal(producer._continuousEliminateTimes, 91, 'game logic continues from requested 90');
vm.runInContext(hook, context);
assert.equal(calls, 1, 'request must not be re-applied on every poll');
pending = 0;
present = false;
vm.runInContext(hook, context);
assert.equal(pending, 0, 'keep the request until the game component exists');
present = true;
vm.runInContext(hook, context);
assert.equal(producer._continuousEliminateTimes, 0);
assert.equal(pending, -1);
console.log('Combo hook tests passed');
