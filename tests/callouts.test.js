// Callouts reworked after pump.fun (game/callouts.js)
const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/chirp.js', 'game/world.js', 'game/macro.js', 'game/fates.js', 'game/director.js', 'game/mega.js', 'game/vamps.js', 'game/j7.js', 'game/trencher.js', 'game/callouts.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 1601); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); if (g.clock) g.clock.advance(0.25); } }
const live = (g) => g.sim.tokens.filter((t) => !t.dead && t.stage === 'curve').sort((a, b) => g.sim.mc(b) - g.sim.mc(a))[0];

test('a_callout_needs_your_buy_and_has_a_6_hour_cooldown', () => {
  const g = game(), tr = g.sys.trencher, tk = live(g);
  const no = tr.call(tk.id, 'gm');
  assert.ok(!no.ok && /buy/i.test(no.reason), no.reason);
  g.player.buy(tk.id, 0.5); run(g, 2);
  const ok = tr.call(tk.id, 'clean chart');
  assert.ok(ok.ok, ok.reason);
  const c = tr.myCallouts().pop();
  assert.ok(c.entryMc > 0 && c.notified > 0 && c.fol.length >= 2 && c.thesis === 'clean chart');
  const tk2 = g.sim.tokens.filter((t) => !t.dead && t.id !== tk.id).pop();
  g.player.buy(tk2.id, 0.3); run(g, 2);
  const cd = tr.call(tk2.id);
  assert.ok(!cd.ok && /6 hours/.test(cd.reason), cd.reason);
  assert.ok(tr.nextCallIn() > 5);
});

test('buy_and_call_posts_when_the_buy_fills_and_followers_ape_in', () => {
  const g = game(1602), tr = g.sys.trencher, tk = live(g);
  tr.followers = 4000; tr.trust = 70;
  const r = tr.call(tk.id, '', { buy: 0.5 });
  assert.ok(r.ok, r.reason);
  run(g, 3);
  const c = tr.myCallouts().pop();
  assert.ok(c, 'callout went out after the fill');
  run(g, 45);
  const fol = c.fol.filter((a) => tk.holders.has(a));
  assert.ok(fol.length >= 5, 'follower wallets bought: ' + fol.length);
});

test('follower_pnl_is_tracked_at_1h_and_4h_and_hits_are_2x', () => {
  const g = game(1603), tr = g.sys.trencher, tk = live(g);
  g.player.buy(tk.id, 0.5); run(g, 2);
  assert.ok(tr.call(tk.id).ok);
  run(g, 65);
  const c = tr.myCallouts().pop();
  assert.ok(c.pnl1h != null, '1h pnl');
  run(g, 190);
  assert.ok(!c.live && c.pnl4h != null && c.maxX >= 1);
  assert.strictEqual(c.hit, c.maxX >= 2);
  assert.strictEqual(tr.hits + tr.misses >= 1, true);
});

test('kols_make_callouts_and_the_leaderboard_ranks_callers', () => {
  const g = game(1604), tr = g.sys.trencher;
  run(g, 400);
  assert.ok(tr.npc.length >= 3, 'npc callouts: ' + tr.npc.length);
  const rows = tr.leaderboard('all');
  assert.ok(rows.length >= 3 && rows.some((r) => r.who === 'you'));
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].pnl >= rows[i].pnl);
  assert.ok(tr.feed(10).length > 0);
});

test('daily_rewards_split_the_pot_by_followers_profit_and_lowcaps_count_less', () => {
  const g = game(1605), tr = g.sys.trencher;
  assert.strictEqual(BH.Trencher.lowcap(20000), 0.35);
  assert.strictEqual(BH.Trencher.lowcap(50000), 0.7);
  assert.strictEqual(BH.Trencher.lowcap(500000), 1);
  const d = g.clock.day;
  tr.calls.push({ v2: true, live: false, day: d, score: 3, coin: 'x', t: 0, mcAt: 1, peak: 1 });
  tr.npc.push({ npc: true, who: 'cupsey', live: false, day: d, score: 1, coin: 'y', t: 0, mcAt: 1, peak: 1 });
  const cash0 = g.bills.cash, usd = tr.payRewards(d);
  assert.ok(Math.abs(usd - 2250) < 0.01, 'got ' + usd);
  assert.ok(Math.abs(g.bills.cash - cash0 - 2250) < 0.01);
  assert.strictEqual(tr.rewards.pop().rank, 1);
});

test('callouts_survive_save', () => {
  const g = game(1606), tr = g.sys.trencher, tk = live(g);
  g.player.buy(tk.id, 0.5); run(g, 2); tr.call(tk.id, 'save me'); run(g, 80);
  const g2 = BH.createGame(); g2.start(JSON.parse(JSON.stringify(g.serialize())));
  const t2 = g2.sys.trencher;
  assert.ok(t2.myCallouts().length === 1 && t2.myCallouts()[0].thesis === 'save me');
  assert.ok(t2.nextCallIn() > 0);
});
