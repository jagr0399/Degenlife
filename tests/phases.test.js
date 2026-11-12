const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/orders.js', 'game/build.js', 'game/factory.js', 'game/firm.js', 'game/pad.js', 'game/world.js', 'game/tracker.js', 'game/markets.js', 'game/director.js', 'game/trencher.js', 'game/tutorial.js', 'game/story.js', 'game/business.js', 'game/clout.js', 'game/tools.js', 'game/finance.js', 'game/empire.js', 'game/extras.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 701); g.bills.cash = 20000; BH.Game = g; return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
const live = (g) => g.sim.tokens.filter((t) => !t.dead && t.stage === 'curve').pop();

// ---- shared plumbing ----
test('injected_scenes_run_named_actions', () => {
  const g = game(), st = g.sys.story; g.player.sol = 5;
  st.inject({ id: 'x1', who: 'shark', lines: ['hi'], choices: [['ok', { do: 'clout.refund' }, 'done.']] });
  st.lastSceneHour = -99;
  assert.strictEqual(st.next().id, 'x1');
  const reply = st.choose('x1', 0);
  assert.ok(reply.startsWith('done.') && reply.includes('Refunded'));
  assert.strictEqual(g.player.sol, 4);
});
test('side_gig_warps_time_and_pays', () => {
  const g = game(), f = g.sys.finance, cash0 = g.bills.cash;
  if (g.sys.tools) g.sys.tools.safe = true;   // (a random break-in would take cash during the warp; this test is about the gig)
  assert.ok(f.startGig('delivery', 2).ok);
  assert.strictEqual(g.warp, 20);
  const h0 = g.clock.total; g.tickReal(1);
  assert.ok(g.clock.total - h0 > 0.2, 'time ran fast');
  g.clock.total = f.gig.start + 2.1; g.afterTime();
  assert.strictEqual(f.gig, null); assert.strictEqual(g.warp, 1);
  assert.ok(g.bills.cash > cash0);
});

// ---- phase 3 ----
test('calls_become_posts_with_replies_you_can_answer', () => {
  const g = game(), c = g.sys.clout, tk = live(g);
  assert.ok(g.sys.trencher.call(tk.id).ok);
  assert.strictEqual(c.posts.length, 1);
  c.posts[0].replies.push({ id: 'r1', who: 'a', kind: 'fan', text: 'gg', answered: null });
  const t0 = g.sys.trencher.trust;
  assert.ok(c.reply(c.posts[0].id, 'r1', 'thank').ok);
  assert.ok(g.sys.trencher.trust > t0);
});
test('frontrunning_your_call_and_dumping_can_get_you_exposed', () => {
  const g = game(702), c = g.sys.clout, tk = live(g);
  g.player.buy(tk.id, 0.5, { slippage: 0.9 }); run(g, 2);   // wide slippage: young coins can move 20%+ in a second
  g.sys.trencher.call(tk.id);
  assert.strictEqual(c.watch.length, 1);
  g.sim.r = Object.assign(() => 0.01, g.sim.r);   // force the exposure roll
  g.player.sell(tk.id, 1); run(g, 2); c.checkWatch();
  assert.strictEqual(c.frontruns, 1); assert.strictEqual(c.exposed, 1);
  assert.ok(g.sys.story.queue.some((id) => id.startsWith('callout')));
});
test('alpha_group_needs_followers_and_pays_daily', () => {
  const g = game(), c = g.sys.clout, t = g.sys.trencher;
  assert.ok(!c.alphaOpen().ok);
  t.followers = 20000; t.trust = 80; assert.ok(c.alphaOpen().ok);
  for (let i = 0; i < 6; i++) c.alphaTick();
  assert.ok(c.alpha.subs > 50, 'subs ' + c.alpha.subs);
  g.clock.total += 24; const cash0 = g.bills.cash; c.alphaTick();
  assert.ok(g.bills.cash > cash0);
});
test('brand_deals_and_spaces_and_feuds_work', () => {
  const g = game(), c = g.sys.clout, t = g.sys.trencher; t.followers = 3000;
  g.clock.total += 24 * 3; c.dealTick(); assert.ok(c.deals.length >= 1);
  assert.ok(c.takeDeal(c.deals[0].id).ok);
  const tk = live(g); g.player.buy(tk.id, 0.3); run(g, 2);
  const r = c.host(); assert.ok(r.ok, r.reason);
  assert.ok(c.spaces[0].viewers > 0);
  assert.ok(c.feud().ok);
});
test('leaderboard_includes_you_and_awards_weekly', () => {
  const g = game(), c = g.sys.clout;
  const rows = c.leaderboard(); assert.ok(rows.some((r) => r.you));
  g.clock.total += 24 * 7; c.weekly(); assert.strictEqual(c.board.length, 1);
});

// ---- phase 4 ----
test('sniper_bot_buys_launches_that_pass_filters', () => {
  const g = game(), t = g.sys.tools;
  t.setSniper('on'); t.sniper.needSocials = false; t.sniper.maxDev = 100; t.sniper.maxBundle = 100; t.sniper.dailyCap = 5;
  run(g, 20);
  assert.ok(t.sniper.buys > 0, 'snipes ' + t.sniper.buys);
  assert.ok(t.upgrade('speed').ok); assert.strictEqual(t.sniper.speed, 2);
});
test('detective_cases_and_publishing', () => {
  const g = game(), t = g.sys.tools, tk = live(g);
  const r = t.investigate(tk.id); assert.ok(r.ok, r.reason);
  assert.strictEqual(t.cases.length, 1);
  assert.ok(t.publish(tk.id).ok);
});
test('phishing_drains_hot_wallet_but_cold_storage_is_safe', () => {
  const g = game(), t = g.sys.tools; g.player.sol = 10;
  assert.ok(t.buyHw().ok); assert.ok(t.deposit(6).ok);
  assert.strictEqual(g.player.sol, 4); assert.strictEqual(t.cold, 6);
  t.inbox = [{ id: 'd1', from: 'x', text: 'y', scam: true, tell: 'z', state: 'new' }];
  t.openLink('d1');
  assert.ok(g.player.sol > 3.7 && g.player.sol < 4); assert.strictEqual(t.cold, 6);
  assert.ok(Math.abs(g.sys.world.netUsd() - (g.player.netWorth() * BH.C.SOL_USD + g.bills.cash - g.bills.debt + 6 * BH.C.SOL_USD)) < 1e-6);
});
test('laundering_cools_heat', () => {
  const g = game(), t = g.sys.tools; g.sys.biz.heat = 30; g.player.sol = 5;
  assert.ok(t.launder(4).ok); assert.ok(g.sys.biz.heat <= 6.0001);
});

// ---- phase 5 ----
test('loan_shark_charges_interest_and_visits_when_late', () => {
  const g = game(), f = g.sys.finance;
  assert.ok(f.borrow(1000).ok);
  g.clock.total += 24 * 9; f.loanDaily();
  assert.ok(f.loan.owed > 1500, 'owed ' + f.loan.owed);
  assert.ok(g.sys.story.queue.some((id) => id.startsWith('shark')));
  assert.ok(f.repay().ok);
});
test('prop_firm_challenge_passes_on_20_percent', () => {
  const g = game(), f = g.sys.finance;
  assert.ok(f.propStart().ok);
  g.player.sol *= 1.25; f.propTick();
  assert.strictEqual(f.prop.state, 'funded');
});
test('regimes_night_market_airdrops_insurance', () => {
  const g = game(), f = g.sys.finance;
  g.clock.total = 24 * 7 + 2; f.regimeTick(); assert.ok(['bull', 'chop', 'bear'].includes(f.regime));
  run(g, 30); assert.ok(f.nightCount > 0, 'night launches');
  g.player.sol = 5; assert.ok(f.farm('bridgey').ok); assert.ok(!f.farm('bridgey').ok);
  assert.ok(f.insOpen().ok); g.clock.total += 24; f.insTick(); assert.ok(f.ins.premiums > 0);
});

// ---- phase 6 ----
test('suppliers_deliver_and_improve_recipes', () => {
  const g = game(), e = g.sys.empire, b = g.sys.biz;
  const base = { art: 'pixel', narrative: 'frogs', mascot: 'sad', lore: 'oneline', ticker: 'word' };
  const s0 = b.scoreOf(base);
  assert.ok(e.order('studio9', 'art', 3).ok);
  g.clock.total += 7; e.receive();
  assert.strictEqual(e.stock.art, 3);
  assert.ok(b.scoreOf(base) > s0 + 10);
  b.develop(base); assert.strictEqual(e.stock.art, 2);
});
test('ventures_territories_contracts_and_pawn', () => {
  const g = game(), e = g.sys.empire;
  assert.ok(e.open('bar').ok); const cash0 = g.bills.cash; e.ventureDaily(); assert.ok(g.bills.cash > cash0);
  g.sim.r = Object.assign(() => 0.01, g.sim.r);
  assert.ok(e.capture('frogpond').ok);
  e.refreshBoard(); assert.strictEqual(e.board.length, 3); assert.ok(e.accept(e.board[0].id).ok);
  g.sys.build.owned.chair = 1; assert.ok(e.pawn('chair').ok);
  assert.ok(BH.Build.CATALOG.some((x) => x.id === 'keyboard'));
  assert.ok(!Number.isNaN(g.sys.build.effects().focus));
});
test('court_of_vibes_and_viral_clips_queue_scenes', () => {
  const g = game(), e = g.sys.empire; g.sys.biz.heat = 99; e.afterTime();
  assert.ok(g.sys.story.queue.some((id) => id.startsWith('trial')));
  assert.ok(e.verdict('guilty').ok); assert.ok(g.sys.biz.heat < 50);
});

// ---- phase 7 ----
test('daily_challenges_seasons_and_pets', () => {
  const g = game(), l = g.sys.life; g.afterTime();
  assert.strictEqual(l.daily.ids.length, 3);
  assert.ok(l.adopt('goldfish').ok); l.oracleDaily(); assert.strictEqual(l.oracle.length, 1);
  l.season.xp = 2000; l.checkDaily(); assert.ok(l.season.rewards.length >= 5);
});
test('trips_house_hackathon_and_real_job_ending', () => {
  const g = game(), l = g.sys.life;
  assert.ok(l.conference().ok); assert.ok(l.ghostwrite('quick').ok); assert.ok(l.hackathon().ok); assert.ok(!l.hackathon().ok);
  g.sys.trencher.followers = 6000; assert.ok(l.moveIn().ok);
  l.realJob(); assert.strictEqual(g.sys.world.endingFor().title, 'The Real Job'); assert.ok(g.sys.world.canRetire());
});
test('sandbox_and_challenge_runs', () => {
  const g = game(), l = g.sys.life;
  assert.ok(l.enableSandbox().ok); assert.ok(g.bills.cash > 1e6); assert.ok(g.sys.build.places.includes('tower'));
  l.setChallenge('debt'); const r = BH.Prestige.retire(g); assert.strictEqual(r.meta.challenge, 'debt');
});

// ---- everything saves ----
test('all_new_systems_survive_save_and_load', () => {
  const g = game(); run(g, 5);
  g.sys.clout.alpha.price = 77; g.sys.tools.cold = 2; g.sys.finance.loan.owed = 123; g.sys.empire.stock.art = 4; g.sys.life.pets.goldfish = { since: 1 };
  const g2 = BH.createGame(); g2.start(JSON.parse(JSON.stringify(g.serialize())));
  assert.strictEqual(g2.sys.clout.alpha.price, 77); assert.strictEqual(g2.sys.tools.cold, 2); assert.strictEqual(g2.sys.finance.loan.owed, 123); assert.strictEqual(g2.sys.empire.stock.art, 4); assert.ok(g2.sys.life.pets.goldfish);
  run(g2, 5); g2.clock.total += 30; g2.afterTime();
});
test('a_long_run_with_everything_on_does_not_throw', () => {
  const g = game(777);
  g.sys.tools.setSniper('on'); g.sys.tools.sniper.needSocials = false; g.sys.tools.sniper.maxDev = 100; g.sys.tools.sniper.maxBundle = 100;
  g.sys.life.adopt('goldfish'); g.sys.empire.open('bar'); g.sys.finance.insOpen();
  for (let d = 0; d < 12; d++) { run(g, 15); g.clock.total += 12; g.afterTime(); g.clock.total += 12; g.afterTime(); }
  assert.ok(g.clock.day >= 12);
  assert.ok(Number.isFinite(g.player.sol) && Number.isFinite(g.bills.cash));
});
