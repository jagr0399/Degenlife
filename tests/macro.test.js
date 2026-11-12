const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/world.js', 'game/macro.js', 'game/fates.js', 'game/director.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 501); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('sol_starts_at_the_real_price_and_drifts_gently', () => {
  const g = game(), m = g.sys.macro;
  assert.strictEqual(BH.Macro.START, 83.44);
  // a new game has already run a couple of minutes of market, so SOL has moved a few cents from the start
  assert.ok(Math.abs(m.sol / 83.44 - 1) < 0.02, 'SOL opens near $83.44: ' + m.sol.toFixed(2));
  m.next = 1e9;   // no news in this stretch
  run(g, 120);
  assert.ok(Math.abs(BH.C.SOL_USD / 83.44 - 1) < 0.03, 'two quiet minutes move SOL less than 3%: ' + BH.C.SOL_USD.toFixed(2));
  assert.strictEqual(BH.C.SOL_USD, m.sol, 'every USD number reads the live price');
});

test('pump_curve_is_the_real_one_and_graduates_at_30_to_40k', () => {
  const g = game(502), sim = g.sim;
  const pump = BH.PADS.find((p) => p.id === 'pumplab');
  assert.strictEqual(pump.vSol, 30);
  const fake = { lp: 'pumplab' };
  BH.C.SOL_USD = 83.44;
  const grad = sim.gradMc(fake);
  assert.ok(grad > 30000 && grad < 40000, 'PumpLab graduates at $' + Math.round(grad));
  // the other pads raise more before they graduate
  for (const p of BH.PADS) if (p.id !== 'pumplab') assert.ok(sim.gradMc({ lp: p.id }) > grad, p.name + ' graduates higher than Pump');
  const w = BH.PADS.reduce((a, p) => a + p.w, 0);
  assert.ok(Math.abs(w - 1) < 1e-9, 'pad weights sum to 1: ' + w);
  // ...and the cap in USD moves with SOL
  BH.C.SOL_USD = 100;
  assert.ok(sim.gradMc(fake) > grad * 1.15);
  BH.C.SOL_USD = g.sys.macro.sol;
});

test('news_moves_sol_toward_a_new_level_without_a_jump', () => {
  const g = game(503), m = g.sys.macro; m.next = 1e9;
  const before = m.sol;
  m.shock(8, 'test pump');
  run(g, 1);
  assert.ok(m.sol < before * 1.03, 'no instant jump: ' + m.sol.toFixed(2));
  run(g, 240);
  assert.ok(m.sol > before * 1.05, 'SOL travelled most of the way up: ' + m.sol.toFixed(2));
  assert.ok(m.dayChange() > 4);
});

test('a_market_crash_drags_sol_down', () => {
  const g = game(504), m = g.sys.macro; m.next = 1e9;
  const before = m.sol;
  g.sys.world.event('crash');
  run(g, 240);
  assert.ok(m.sol < before * 0.96, 'SOL after the crash: ' + m.sol.toFixed(2));
});

test('coins_follow_sol_instead_of_fighting_it', () => {
  const g = game(505), m = g.sys.macro; m.next = 1e9;
  run(g, 60);
  const tk = g.sim.tokens.filter((t) => t.dir && !t.dir.done && !t.dead && t.dir.mc0).pop();
  assert.ok(tk, 'a directed coin is live');
  const sol0 = tk.dir.sol0;
  assert.ok(sol0 > 0);
  // SOL +20%: the coin's path in USD is now 20% higher, so nobody has to sell it back down
  m.sol = m.anchor = sol0 * 1.2; BH.C.SOL_USD = m.sol;
  const priceSol = g.sim.price(tk);
  run(g, 3);
  assert.ok(g.sim.price(tk) > priceSol * 0.8, 'the price in SOL was not dumped to cancel the SOL move');
});

test('sol_price_survives_save_and_load', () => {
  const g = game(506), m = g.sys.macro;
  m.shock(-6, 'test dip'); run(g, 120);
  const sol = m.sol, saved = JSON.parse(JSON.stringify(m.save()));
  BH.C.SOL_USD = 1;
  const m2 = new BH.Macro(g, saved);
  assert.strictEqual(m2.sol, sol);
  assert.strictEqual(BH.C.SOL_USD, sol);
});
