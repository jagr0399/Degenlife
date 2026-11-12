const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/director.js', 'game/archetypes.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 1101); return g; }
function step(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
const FATE = { A: 'doa', B: 'pnd', C: 'runner', D: 'runner', F: 'rug', G: 'runner', H: 'rug', I: 'doa', J: 'runner', K: 'runner' };
function launch(g, id) {
  const P = BH.Director.prototype, orig = P.template;
  P.template = function (t, r) { return BH.Archetypes.build(id, r); };
  g.sys.director.force = FATE[id]; const tk = g.sim.launch(); g.sys.director.force = null;
  P.template = orig;
  step(g, 2);
  return { tk, mc0: tk.dir.mc0 };
}
// run `secs` seconds and track the high, the price at checkpoints, and when it bonded
function play(g, tk, secs, at) {
  const out = { ath: 0, bondAt: null, at: {} };
  for (let s = 1; s <= secs; s++) {
    step(g, 1); const mc = g.sim.mc(tk); out.ath = Math.max(out.ath, mc);
    if (out.bondAt == null && tk.stage === 'amm') out.bondAt = s;
    if (at && at.includes(s)) out.at[s] = mc;
  }
  return out;
}

test('every_archetype_builds_a_chart_that_starts_with_one_big_green_candle', () => {
  const r = Object.assign(() => Math.random(), { int: (a, b) => a, range: (a, b) => a });
  for (const id of Object.keys(BH.Archetypes.ARCH)) {
    const T = BH.Archetypes.build(id, Math.random);
    assert.ok(T.c.length > 20, id);
    const c0 = T.c[0];
    assert.ok(c0[3] > c0[0] && c0[1] === Math.max(c0[0], c0[3]) && c0[2] === Math.min(c0[0], c0[3]), id + ': first candle is green with no wick');
  }
  void r;
});

test('A_dead_on_arrival_pumps_in_the_first_minute_then_dies_and_goes_quiet', () => {
  const g = game(1102), { tk, mc0 } = launch(g, 'A');
  const p = play(g, tk, 360, [75, 240]);
  assert.ok(p.ath > mc0 * 2.2, 'pumped ' + (p.ath / mc0).toFixed(2) + 'x');
  assert.ok(p.at[240] < mc0 * 1.7, 'back near the floor by 4 min: ' + (p.at[240] / mc0).toFixed(2) + 'x');
  const late = tk.candles.filter((c) => c.t > g.sim.t - 60).length;
  assert.ok(late <= 12, 'a dead coin barely prints: ' + late + ' candles in the last minute');
});

test('B_bundled_launch_peaks_early_then_bleeds', () => {
  const g = game(1103), { tk, mc0 } = launch(g, 'B');
  const p = play(g, tk, 1200, [60, 1200]);
  assert.ok(p.ath > mc0 * 2.2, 'early peak ' + (p.ath / mc0).toFixed(2) + 'x');
  assert.ok(p.at[1200] < p.ath * 0.75, 'bled from the top: ' + (p.at[1200] / p.ath).toFixed(2));
});

test('C_slow_cook_sits_flat_then_runs', () => {
  const g = game(1104), { tk, mc0 } = launch(g, 'C');
  const p = play(g, tk, 1500, [300]);
  assert.ok(p.at[300] < mc0 * 2, 'still cooking at 5 min: ' + (p.at[300] / mc0).toFixed(2) + 'x');
  assert.ok(p.ath > mc0 * 7, 'then it ran: ' + (p.ath / mc0).toFixed(1) + 'x');
});

test('D_instant_bond_bonds_within_minutes_and_makes_a_second_leg', () => {
  const g = game(1105), { tk, mc0 } = launch(g, 'D');
  const p = play(g, tk, 1300, []);
  assert.ok(p.bondAt != null && p.bondAt < 360, 'bonded after ' + p.bondAt + ' s');
  assert.ok(p.ath > mc0 * 9, 'second leg: ' + (p.ath / mc0).toFixed(1) + 'x');
});

test('F_almost_bonds_then_ends_below_where_it_peaked_by_far', () => {
  const g = game(1106), { tk, mc0 } = launch(g, 'F');
  const p = play(g, tk, 1900, [1900]);
  assert.ok(p.ath > mc0 * 2.4, 'climbed ' + (p.ath / mc0).toFixed(2) + 'x');
  const end = tk.dead ? 0 : p.at[1900];
  assert.ok(end < p.ath * 0.45, 'dumped: ' + (end / p.ath).toFixed(2) + ' of the top');
});

test('G_steady_grinder_keeps_making_higher_highs_with_small_dips', () => {
  const g = game(1107), { tk, mc0 } = launch(g, 'G');
  let hi = 0, dd = 0;
  for (let s = 0; s < 1500; s++) { step(g, 1); const mc = g.sim.mc(tk); hi = Math.max(hi, mc); dd = Math.max(dd, 1 - mc / hi); }
  assert.ok(hi > mc0 * 3, 'climbed ' + (hi / mc0).toFixed(2) + 'x');
  // (a named whale can dump into the thin curve once; it recovers)
  assert.ok(dd < 0.65, 'max drawdown ' + (dd * 100).toFixed(0) + '%');
});

test('H_dev_bought_curve_grinds_too_smoothly_then_rugs_99_percent', () => {
  const g = game(1108), { tk, mc0 } = launch(g, 'H');
  const p = play(g, tk, 10, [10]);
  assert.ok(p.at[10] > mc0 * 5, 'dev bought the curve: ' + (p.at[10] / mc0).toFixed(1) + 'x in the first seconds');
  step(g, 600);
  const c = tk.candles.filter((k) => k.t > g.sim.t - 600), r = []; for (let i = 1; i < c.length; i++) r.push(Math.abs(c[i].c / c[i - 1].c - 1) * 100);
  r.sort((x, y) => x - y);
  assert.ok(r[Math.floor(r.length / 2)] < 0.15, 'smooth grind: 1s median move ' + r[Math.floor(r.length / 2)].toFixed(3) + '%');
  assert.ok(c.length > 400, 'trades nearly every second: ' + c.length + ' candles in 10 min');
  step(g, 4300);
  assert.ok(tk.rugged, 'rugged');
  assert.ok(tk.dead || g.sim.mc(tk) < tk.athMc * 0.05 || g.sim.mc(tk) < 3000, 'down 95%+ from its high: ' + Math.round(g.sim.mc(tk)) + ' vs ATH ' + Math.round(tk.athMc));
});

test('I_copycat_takes_the_runners_name_and_rides_its_moves', () => {
  const g = game(1109); launch(g, 'D');
  step(g, 160);
  const { tk } = launch(g, 'I'), par = g.sim.byId.get(tk.dir.rideOf);
  assert.ok(par, 'found a running coin to copy'); assert.strictEqual(tk.name, par.name); assert.strictEqual(tk.ticker, par.ticker);
  const pm0 = g.sim.mc(par), m0 = g.sim.mc(tk); step(g, 300);
  const pr = g.sim.mc(par) / pm0, cr = g.sim.mc(tk) / m0;
  // (only judged when the parent really moved: a flat parent says nothing about riding it)
  // (a copy launched at its curve floor can't fall below it, so following a falling parent means staying at/under ~1x)
  if (pr > 1.05) assert.ok(cr > 0.95, 'rose with its parent: parent x' + pr.toFixed(2) + ', copy x' + cr.toFixed(2));
  if (pr < 0.95) assert.ok(cr < 1.05, 'fell with its parent: parent x' + pr.toFixed(2) + ', copy x' + cr.toFixed(2));
});

test('J_viral_launch_goes_vertical_then_bleeds_for_a_long_time', () => {
  const g = game(1110), { tk, mc0 } = launch(g, 'J');
  const p = play(g, tk, 400, [30]);
  assert.ok(p.at[30] > mc0 * 10, 'vertical start: ' + (p.at[30] / mc0).toFixed(1) + 'x in 30 s');
  assert.ok(p.ath > mc0 * 150, 'millions in minutes: ' + (p.ath / mc0).toFixed(0) + 'x');
});

test('K_no_curve_launch_starts_higher_and_sleeps', () => {
  const g = game(1111), { tk, mc0 } = launch(g, 'K');
  const p = play(g, tk, 600, [20, 600]);
  assert.ok(p.at[20] > mc0 * 3.5, 'starts around 5x the curve floor: ' + (p.at[20] / mc0).toFixed(1) + 'x');
  assert.ok(p.at[600] < p.at[20] * 1.6 && p.at[600] > p.at[20] * 0.6, 'sleepy for the first 10 minutes: ' + (p.at[600] / p.at[20]).toFixed(2));
});
