const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/markets.js', 'game/daytrade.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 1301); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('day_trading_buys_and_sells_shares_with_cash_only_while_the_market_is_open', () => {
  const g = game(), d = g.sys.daytrade; g.bills.cash = 5000;
  g.clock.total = 8;   // Monday 8:00, before the open
  assert.strictEqual(d.order('AAPL', 'buy', 5).ok, false, 'closed before 9:30');
  g.clock.total = 10; run(g, 30);
  const cash0 = g.bills.cash, r = d.order('AAPL', 'buy', 10);
  assert.ok(r.ok, r.reason); assert.ok(g.bills.cash < cash0 - 10 * d.price('AAPL') * 0.99, 'cash paid');
  assert.strictEqual(d.pos.AAPL.sh, 10);
  run(g, 60);
  const s = d.order('AAPL', 'sell', 10); assert.ok(s.ok, s.reason);
  assert.ok(!d.pos.AAPL, 'flat again'); assert.strictEqual(d.day.trades, 2);
  assert.ok(Math.abs(d.dayPnl() - (d.day.realized - d.day.fees)) < 1e-6);
  assert.strictEqual(d.order('TSLA', 'buy', 1e6).ok, false, 'not enough cash');
});

test('shorting_needs_margin_and_the_bell_closes_positions', () => {
  const g = game(1302), d = g.sys.daytrade; g.bills.cash = 3000;
  g.clock.total = 15.5; run(g, 5);
  assert.ok(d.order('TSLA', 'sell', 3).ok, 'short opened'); assert.strictEqual(d.pos.TSLA.sh, -3);
  assert.strictEqual(d.order('NVDA', 'sell', 1000).ok, false, 'needs margin');
  for (let i = 0; i < 40 * 4 && d.isOpen(); i++) { g.sim.step(0.25); g.player.tick(); g.clock.total += 0.25 / 60; }
  g.clock.total = 16.01; run(g, 1);
  assert.ok(!Object.keys(d.pos).length, 'flattened at the bell');
  assert.strictEqual(d.history.length, 1);
  assert.ok((d.candles.TSLA || []).length > 0, 'candles recorded');
  const back = new BH.DayTrade(g, JSON.parse(JSON.stringify(d.save()))); assert.strictEqual(back.history.length, 1);
});
