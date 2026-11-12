const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/orders.js', 'game/build.js', 'game/world.js', 'game/markets.js', 'game/finance.js', 'game/macro.js', 'game/director.js', 'game/days.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 91); return g; }

test('every_day_gets_a_mood_and_day_1_is_normal', () => {
  const g = game(), d = g.sys.days;
  g.sim.step(0.25);
  assert.strictEqual(d.day, 1); assert.strictEqual(d.type, 'normal');
  const seen = new Set();
  for (let day = 2; day <= 40; day++) { d.roll(day); seen.add(d.type); }
  assert.ok(seen.size >= 5, 'many kinds of days: ' + [...seen].join(','));
  assert.ok(d.history.length >= 39);
});

test('the_day_mood_leans_the_coin_fates', () => {
  const g = game(92), d = g.sys.days, dir = g.sys.director;
  const count = (type) => { d.type = type; const c = {}; let s = 1; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 4000; i++) { const f = dir.pickFate(r); c[f] = (c[f] || 0) + 1; } return c; };
  const normal = count('normal'), runners = count('runners'), rugs = count('rugs');
  assert.ok(runners.runner > normal.runner * 2, 'runner season has more runners');
  assert.ok(rugs.rug > normal.rug * 1.7, 'rug season has more rugs');
  dir.forceOnce = 'mega'; assert.strictEqual(dir.pickFate(Math.random), 'mega'); assert.notStrictEqual(dir.pickFate(Math.random), 'mega', 'forceOnce is used once');
});

test('day_events_fire_and_survive_a_save', () => {
  const g = game(93), d = g.sys.days;
  g.clock.total = 2 * 24 + 10; d.roll(3); d.events.forEach((e) => { e.at = 0; });
  const n = d.events.length; d.onStep();
  assert.strictEqual(d.events.filter((e) => e.done).length, n);
  const back = new BH.Days(g, JSON.parse(JSON.stringify(d.save())));
  assert.strictEqual(back.type, d.type); assert.strictEqual(back.day, 3);
});

test('sleeping_in_slices_advances_the_night_like_the_old_sleep', async () => {
  const g = game(97), h0 = g.clock.total, n0 = g.sim.tokens.length; let calls = 0, last = 0;
  const s = await BH.Actions.sleepAsync(g, 8, (f) => { calls++; assert.ok(f >= last); last = f; });
  assert.strictEqual(g.clock.total, h0 + 8);
  assert.ok(calls > 3, 'reported progress ' + calls + ' times');
  assert.strictEqual(last, 1);
  assert.ok(s.launched > 0 && g.sim.tokens.length > n0, 'coins launched overnight: ' + s.launched);
});
