const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'game/loop.js', 'game/actions.js');
const C = BH.C;

function fresh(seed) { const g = BH.createGame(); g.newGame(seed || 5); return g; }

test('order_delay_block', () => {
  const g = fresh(5);
  const tk = g.sim.tokens[g.sim.tokens.length - 1];
  g.player.extraDelay = 1;
  g.player.buy(tk.id, 0.2);
  g.sim.step(0.25); g.player.tick();
  assert.strictEqual(g.sim.orders.length, 1, 'still waiting after one block');
  g.sim.step(0.25); g.player.tick();
  assert.strictEqual(g.sim.orders.length, 0, 'landed on the second block');
});

test('tick_advances_clock_life_and_bills', () => {
  const g = fresh(6);
  const e0 = g.life.energy, h0 = g.clock.total;
  g.tickReal(60);
  assert.ok(Math.abs(g.clock.total - h0 - 1) < 1e-9, 'one game hour');
  assert.ok(g.life.energy < e0);
  assert.strictEqual(g.player.extraDelay, g.life.orderDelayBlocks());
});

test('tick_survives_sim_exception', () => {
  const g = fresh(7);
  const toasts = [];
  g.on('toast', (t) => toasts.push(t));
  const orig = g.sim.step;
  g.sim.step = () => { throw new Error('boom'); };
  g.tickReal(1);
  assert.strictEqual(g.speed, 0, 'paused');
  assert.ok(toasts.some((t) => t.kind === 'error'));
  g.sim.step = orig;
});

test('sleep_fast_forward_bounded', () => {
  const g = fresh(3);
  for (let i = 0; i < 2400; i++) { g.sim.step(0.25); g.player.tick(); }
  g.life.energy = 20;
  const h0 = g.clock.total, t0 = Date.now();
  const s = BH.Actions.sleep(g, C.SLEEP_HOURS);
  assert.ok(Date.now() - t0 < 3000, 'took ' + (Date.now() - t0) + ' ms');
  assert.ok(Math.abs(g.clock.total - h0 - 8) < 1e-9);
  assert.strictEqual(g.life.energy, 100);
  assert.ok(s && typeof s.launched === 'number');
});

test('sleep_summary_counts', () => {
  const g = fresh(4);
  const before = Object.assign({}, g.sim.stats);
  const s = BH.Actions.sleep(g, 2);
  assert.strictEqual(s.launched, g.sim.stats.launched - before.launched);
  assert.strictEqual(s.rugged, g.sim.stats.rugged - before.rugged);
  assert.strictEqual(s.migrated, g.sim.stats.migrated - before.migrated);
});

test('save_load_roundtrip_game', () => {
  const g = fresh(8);
  g.tickReal(90);
  g.bills.cash = 321; g.life.hunger = 44; g.world = { x: 1, z: -0.5, yaw: 2 };
  g.drawings.t1 = [{ id: 'd1', kind: 'hline', points: [{ i: 3, p: 10 }] }];
  const json = JSON.stringify(g.serialize());
  const h = BH.createGame();
  h.start(JSON.parse(json));
  assert.strictEqual(h.bills.cash, 321);
  assert.strictEqual(h.life.hunger, 44);
  assert.strictEqual(h.clock.total, g.clock.total);
  assert.deepStrictEqual(h.world, g.world);
  assert.deepStrictEqual(h.drawings, g.drawings);
  assert.strictEqual(h.player.sol, g.player.sol);
  assert.strictEqual(h.bills.clock, h.clock);
});

test('start_without_save_is_new_game', () => {
  const g = BH.createGame();
  g.start(null);
  assert.ok(g.sim.tokens.length > 0, 'market warmed up');
  assert.strictEqual(g.bills.cash, C.START_CASH);
});

test('resume_restarts_market_after_error', () => {
  const g = fresh(12);
  const orig = g.sim.step;
  g.sim.step = () => { throw new Error('boom'); };
  g.tickReal(1);
  assert.strictEqual(g.speed, 0);
  g.sim.step = orig;
  g.resume();
  const t0 = g.sim.t; g.tickReal(1);
  assert.ok(g.sim.t > t0, 'market moves again');
});

test('side_gig_steps_market_and_needs_energy', () => {
  const g = fresh(13);
  const t0 = g.sim.t, hunger0 = g.life.hunger;
  const r = BH.Actions.sideGig(g);
  assert.ok(r.ok);
  assert.ok(g.sim.t - t0 >= C.SIDE_GIG_HOURS * C.GAME_HOUR_S - 1, 'market moved during the shift');
  assert.ok(g.life.hunger > hunger0, 'got hungry');
  g.life.energy = 20;
  const cash = g.bills.cash;
  assert.strictEqual(BH.Actions.sideGig(g).ok, false, 'too tired to work');
  assert.strictEqual(g.bills.cash, cash);
});
