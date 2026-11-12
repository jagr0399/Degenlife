const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'game/loop.js', 'game/actions.js',
  'game/social.js', 'game/fates.js', 'game/orders.js', 'game/build.js', 'game/factory.js', 'game/firm.js', 'game/pad.js', 'game/world.js', 'game/tracker.js', 'game/markets.js', 'game/tutorial.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 81); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('pad_fees_never_exceed_the_fee_paid_and_skip_your_trades', () => {
  const g = game(82), pad = g.sys.pad;
  g.sys.build.places.push('tower'); g.sys.build.owned.rack = 4; g.bills.cash = 50000; pad.buy(); pad.setFee(2.5);
  const tk = g.sim.tokens.find((t) => !t.dead); tk.pad = 'you';
  const e0 = pad.earned;
  const f = g.sim.exec(tk, 'SOMEONE', 'retail', 'buy', 5);
  assert.ok(pad.earned - e0 <= f.fee + 1e-12, 'pad cut ' + (pad.earned - e0) + ' > fee ' + f.fee);
  const e1 = pad.earned; g.sim.exec(tk, 'YOU', 'retail', 'buy', 1);
  assert.strictEqual(pad.earned, e1, 'no pad income from your own trades');
});

test('no_bets_on_decided_or_closing_markets', () => {
  const g = game(83), pr = g.sys.predict;
  const tk = g.sim.tokens.find((t) => !t.dead && t.stage === 'curve');
  pr.open.push({ id: 'pmX', kind: 'grad', coin: tk.id, q: 'q', ends: g.sim.t + 300, odds: { yes: 0.3, no: 0.7 } });
  tk.stage = 'amm'; tk.migratedAt = g.sim.t;
  assert.strictEqual(pr.bet('pmX', 'yes', 0.1).ok, false, 'already decided');
  pr.open.push({ id: 'pmY', kind: 'above', coin: tk.id, target: 1e12, q: 'q', ends: g.sim.t + 10, odds: { yes: 0.3, no: 0.7 } });
  assert.strictEqual(pr.bet('pmY', 'no', 0.1).ok, false, 'betting closes 30 s before the end');
});

test('perps_never_push_sol_negative', () => {
  const g = game(84); g.player.sol = 1;
  assert.strictEqual(g.sys.perps.open('long', 1, 50).ok, false);
  assert.ok(g.player.sol >= 0);
});

test('launch_hooks_see_real_hype_so_reputation_matters', () => {
  const g = game(85), f = g.sys.factory;
  const mk = (rep) => { f.rep = rep; g.player.sol = 10; const r = g.player.launchCoin({ name: 'Rep ' + rep, ticker: 'R' + rep, desc: '', hue: 1, socials: { x: false, tg: false, web: false }, devBuy: 0 }); assert.ok(r.ok, r.reason); return g.sim.byId.get(g.player.myCoins[g.player.myCoins.length - 1]).hype; };
  const lo = mk(0), hi = mk(100);
  assert.ok(lo > 0 && hi > lo * 1.5, 'hype rep0 ' + lo + ' rep100 ' + hi);
});
