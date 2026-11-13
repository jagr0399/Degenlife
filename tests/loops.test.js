const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/director.js', 'game/trencher.js', 'game/views.js', 'game/stream.js', 'game/contracts.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 3101); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
const liveCoin = (g) => g.sim.tokens.filter((t) => !t.dead && t.dir && !t.dir.done).sort((a, b) => g.sim.mc(b) - g.sim.mc(a))[0];

test('every_live_coin_has_viewers_and_hot_coins_draw_more', () => {
  const g = game(); run(g, 90);
  const live = g.sim.tokens.filter((t) => !t.dead);
  assert.ok(live.length > 3);
  for (const t of live) { assert.ok(Number.isInteger(t.views) && t.views >= 1, t.ticker + ' views ' + t.views); assert.ok(t.viewsBoost >= 0.5 && t.viewsBoost <= 3); }
  // a frenzy pulls a crowd
  const tk = g.sim.tokens.filter((t) => !t.dead && t.dir && !t.dir.done && !(t.dir.fzUntil > g.sim.t) && g.sim.mc(t) < 3e6 && t.fate2 !== 'doa').pop(), v0 = tk.views; tk.dir.fzUntil = g.sim.t + 60; run(g, 20);
  assert.ok(tk.views > v0 * 1.3, 'frenzy viewers ' + v0 + ' -> ' + tk.views);
});

test('streaming_pays_and_gets_bored_without_trades', () => {
  const g = game(3102); run(g, 30);
  const s = g.sys.stream; s.followers = 4000;
  assert.ok(s.start().ok);
  const cash0 = g.bills.cash;
  const tk = liveCoin(g);
  for (let i = 0; i < 6; i++) { g.player.buy(tk.id, 0.2); run(g, 10); }
  const hot = s.viewers;
  assert.ok(hot > 20, 'viewers while trading: ' + hot);
  run(g, 300);
  assert.ok(s.viewers < hot, 'bored viewers leave: ' + hot + ' -> ' + s.viewers);
  assert.ok(g.bills.cash > cash0 || s.earned > 0, 'donations or subs came in');
  assert.ok(s.chat.length > 5, 'chat talks');
  assert.ok(s.stop().ok); assert.strictEqual(s.live, false);
});

test('a_2x_sell_on_stream_gets_clipped', () => {
  const g = game(3103); run(g, 30);
  const s = g.sys.stream; s.start();
  const tk = liveCoin(g); g.player.buy(tk.id, 0.5); run(g, 3);
  assert.ok(g.player.pos.get(tk.id), 'bought');
  const f0 = s.followers;
  s.onTrade(tk, { you: true, side: 'sell', sol: 1, tok: (g.player.pos.get(tk.id).tokens) / 2.5 * 0.5 });   // sold at 2.5x the entry
  assert.ok(s.clips.length === 1 && s.followers > f0, 'clipped');
});

test('three_contracts_a_day_that_pay_when_done', () => {
  const g = game(3104); run(g, 5);
  const c = g.sys.contracts;
  assert.strictEqual(c.list.length, 3);
  assert.strictEqual(new Set(c.list.map((x) => x.id)).size, 3);
  const cash0 = g.bills.cash, sol0 = g.player.sol, k = c.list[0];
  c.progress(k.id, k.goal);
  assert.ok(k.done);
  assert.ok(g.bills.cash > cash0 || g.player.sol > sol0 || k.pay === 'followers', 'paid');
  // a new day brings new contracts, and all-done days build a streak
  for (const x of c.list) c.progress(x.id, x.goal);
  g.clock.total += 24; c.onStep();
  assert.strictEqual(c.streak, 1);
  assert.ok(c.list.every((x) => !x.done));
});

test('trades_count_toward_contracts', () => {
  const g = game(3105); run(g, 30);
  const c = g.sys.contracts; c.list = [{ id: 'trades', text: 'Make 10 trades', goal: 10, have: 0, done: false, pay: 'cash', amount: 50 }];
  const tk = liveCoin(g);
  for (let i = 0; i < 3; i++) { g.player.buy(tk.id, 0.05); run(g, 2); }
  assert.ok(c.list[0].have >= 3, 'counted ' + c.list[0].have);
});
