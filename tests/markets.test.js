const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/markets.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 71); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('perps_open_close_and_liquidate', () => {
  const g = game(), px = g.sys.perps, sol0 = g.player.sol;
  assert.ok(px.open('long', 1, 10).ok);
  assert.ok(g.player.sol < sol0 - 1);
  run(g, 30);
  assert.ok(px.close(px.pos[0].id).ok);
  assert.strictEqual(px.pos.length, 0);
  px.open('long', 1, 50); px.price = px.pos[0].entry * 0.9; px.onStep(0.25);
  assert.strictEqual(px.pos.length, 0, 'a 10% drop liquidates a 50x long');
  assert.strictEqual(px.closed[px.closed.length - 1].liq, true);
  assert.strictEqual(px.open('long', 999, 5).ok, false);
});

test('predictions_open_resolve_and_pay', () => {
  const g = game(72), pr = g.sys.predict;
  run(g, 200);
  assert.ok(pr.open.length + pr.done.length > 0, 'markets appear');
  // a market you can still bet on: not already decided, and not in its last 30 s
  const m = pr.open.find((x) => pr.decided(x) == null && x.ends - g.sim.t > 60) || (pr.make(), pr.open[pr.open.length - 1]);
  const pick = Object.keys(m.odds)[0];
  assert.ok(pr.bet(m.id, pick, 0.2).ok);
  run(g, 320);
  assert.ok(pr.done.some((x) => x.id === m.id && x.answer != null), 'resolved');
  assert.strictEqual(pr.bets.filter((b) => b.mid === m.id).length, 0, 'bet settled');
});

test('rewards_points_tiers_cashback', () => {
  const g = game(73), rw = g.sys.rewards;
  const tk = g.sim.tokens.filter((t) => !t.dead && t.stage === 'curve').pop();
  g.player.buy(tk.id, 1); run(g, 2);
  assert.ok(rw.points >= 9, 'points ' + rw.points);
  assert.ok(rw.cashback > 0);
  rw.points = 3000; assert.strictEqual(rw.tier().name, 'Gold');
  const s0 = g.player.sol; assert.ok(rw.claim().ok); assert.ok(g.player.sol > s0);
});

test('perps_have_crypto_stocks_futures_with_hours_and_leverage_caps', () => {
  const g = game(73), px = g.sys.perps, kinds = new Set(BH.Perps.MARKETS.map((m) => m.kind));
  for (const k of ['Index', 'Crypto', 'Stock', 'Future']) assert.ok(kinds.has(k), k);
  g.clock.total = 12;   // Monday noon: everything open
  const btc0 = px.priceOf('BTC'), sol0 = px.priceOf('SOL');
  run(g, 120);
  assert.notStrictEqual(px.priceOf('BTC'), btc0, 'BTC moves');
  assert.ok(Math.abs(px.priceOf('SOL') - BH.C.SOL_USD) < 1e-9, 'SOL perp is the live SOL price');
  const o = px.open('long', 0.5, 99, 'TSLA'); assert.ok(o.ok, o.reason);
  assert.strictEqual(px.pos[px.pos.length - 1].lev, 10, 'stocks cap at 10x');
  g.clock.total = 22;   // Monday 22:00: stocks are after hours but still trade (24/7 perps), and keep moving
  assert.strictEqual(px.session('AAPL').live, false);
  const a0 = px.priceOf('AAPL'); run(g, 60); assert.notStrictEqual(px.priceOf('AAPL'), a0, 'after-hours stocks still move');
  assert.ok(px.open('long', 0.2, 5, 'AAPL').ok);
  assert.ok(px.open('short', 0.2, 5, 'ETH').ok);
  const p = px.pos.find((x) => x.mk === 'TSLA');
  assert.ok(px.close(p.id).ok);
  g.clock.total = 24 * 5 + 12;   // Saturday: futures are calmer but open
  assert.strictEqual(px.session('ES').live, false); assert.strictEqual(px.isOpen('ES'), true);
  const back = new BH.Perps(g, JSON.parse(JSON.stringify(px.save())));
  assert.strictEqual(back.priceOf('NVDA'), px.priceOf('NVDA'), 'prices survive a save');
});
