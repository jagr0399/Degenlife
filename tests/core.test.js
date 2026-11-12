const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE);

test('rng_state_roundtrip', () => {
  const r = BH.makeRng(7); r();
  const s = r.getState();
  const a = [r(), r()];
  r.setState(s);
  assert.deepStrictEqual([r(), r()], a);
});

test('sim_still_runs', () => {
  const sim = new BH.Sim({ seed: 42, mode: 'arcade' });
  const pl = new BH.Player(sim);
  for (let i = 0; i < 7200; i++) { sim.step(0.25); pl.tick(); }
  assert.ok(sim.stats.launched > 50, 'launched ' + sim.stats.launched);
});

test('economy_constants', () => {
  assert.strictEqual(BH.C.SOL_USD, 83.44);
  assert.strictEqual(BH.C.RENT_BEDROOM, 300);
  assert.strictEqual(BH.C.GAME_HOUR_S, 60);
});

test('launchpads_have_their_own_curves', () => {
  const sim = new BH.Sim({ seed: 9 }); new BH.Player(sim);
  const seen = {};
  for (let i = 0; i < 4000; i++) sim.step(0.25);
  for (const t of sim.tokens) seen[t.lp] = (seen[t.lp] || 0) + 1;
  assert.ok(Object.keys(seen).length >= 3, 'pads seen ' + JSON.stringify(seen));
  const mc = (lp) => { const t = sim.tokens.find((x) => x.lp === lp); return t ? sim.gradMc(t) : null; };
  const p = mc('pumplab'), r = mc('raylaunch');
  assert.ok(p > 30000 && p < 40000, 'PumpLab graduates near $35K: ' + p);
  if (r) assert.ok(r > 70000, 'RayLaunch graduates higher: ' + r);
  for (const t of sim.tokens.filter((x) => x.stage === 'amm')) assert.ok(t.poolTok > 0 && t.poolSol > 0);
});
