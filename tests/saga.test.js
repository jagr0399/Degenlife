const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/orders.js', 'game/build.js', 'game/factory.js', 'game/firm.js', 'game/pad.js', 'game/world.js', 'game/tracker.js', 'game/markets.js', 'game/director.js', 'game/celebs.js', 'game/trencher.js', 'game/tutorial.js', 'game/story.js', 'game/saga.js', 'game/business.js', 'game/stream.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 7001); g.afterTime(); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
// play out whatever scene is queued with the given choice index
function playScene(st, idx) { const sc = st.next() || st.sceneById(st.queue[0]); assert.ok(sc, 'a scene is queued'); st.lastSceneHour = -99; return { sc, text: st.choose(sc.id, idx || 0) }; }
function toAct(g, n) { const st = g.sys.story; st.act = n; st.saga.actSince = g.clock.total - 10; st.queue = []; st.lastSceneHour = -99; }

test('ten_acts_and_a_ghost_per_save', () => {
  assert.strictEqual(BH.Story.ACTS.length, 10);
  const seen = new Set();
  for (let s = 1; s <= 40; s++) { const g = game(s * 17); seen.add(g.sys.story.saga.culprit); }
  assert.ok(seen.size >= 4, 'the Ghost is a different person across saves: ' + [...seen].join(','));
  for (const id of BH.Story.SUSPECTS) assert.ok(BH.Story.CLUES[id].length >= 5);
});

test('the_dex_rug_set_piece_starts_and_can_be_won_by_trading_the_ghost_coin', () => {
  const g = game(7002), st = g.sys.story; toAct(g, 2);
  g.afterTime();
  assert.ok(st.saga.active && st.saga.active.id === 'dexrug', 'set piece offered');
  const { sc } = playScene(st, 0);
  assert.strictEqual(sc.setpiece, 'dexrug');
  const tk = g.sim.byId.get(st.saga.active.coin); assert.ok(tk && tk.ghost, 'a ghost coin launched');
  assert.ok(st.goals()[0].sp, 'objective shown in the goals');
  const buy = g.player.buy(tk.id, 0.5); assert.ok(buy.ok !== false, 'bought: ' + (buy.reason || ''));
  run(g, 2); assert.ok(g.player.pos.get(tk.id), 'holding');
  // the coin runs before the Ghost pulls: fake a closed winning trade on it (the sell path is tested elsewhere)
  g.player.closed.unshift({ id: tk.id, ticker: tk.ticker, pnl: 0.4, rugged: false }); g.player.pos.delete(tk.id);
  g.afterTime();
  assert.strictEqual(st.saga.sp.dexrug, 'won');
  assert.ok(st.saga.clues.length >= 1, 'a clue');
  assert.ok(st.saga.titles.includes('Ghost Rider'));
});

test('warning_everyone_wins_the_set_piece_with_followers', () => {
  const g = game(7003), st = g.sys.story; toAct(g, 2); g.afterTime();
  const f0 = g.sys.trencher.followers;
  playScene(st, 1);
  assert.strictEqual(st.saga.sp.dexrug, 'won');
  assert.ok(g.sys.trencher.followers > f0);
});

test('clues_come_from_ghost_coins_and_some_are_red_herrings', () => {
  const g = game(7004), st = g.sys.story;
  for (let i = 0; i < 9; i++) st.addClue('test');
  const s = st.saga;
  assert.ok(s.clues.length >= 7);
  const mine = s.clues.filter((c) => c.about === s.culprit).length;
  assert.ok(mine > s.clues.length / 2, 'most clues point at the real Ghost');
  assert.strictEqual(s.clues[0].about, s.culprit, 'the first clues are real');
});

test('unmasking_the_right_suspect_catches_the_ghost', () => {
  const g = game(7005), st = g.sys.story; toAct(g, 10);
  for (let i = 0; i < 3; i++) st.addClue('test');
  g.afterTime();
  assert.strictEqual(st.saga.active.id, 'unmask');
  const sc = st.next(); const idx = BH.Story.SUSPECTS.indexOf(st.saga.culprit);
  st.choose(sc.id, idx);
  assert.strictEqual(st.saga.sp.unmask, 'won'); assert.ok(st.flags.ghostCaught);
  assert.ok(/Ghost/.test(st.ending().text));
});

test('a_wrong_accusation_costs_followers_and_gives_one_more_try', () => {
  const g = game(7006), st = g.sys.story; toAct(g, 10);
  for (let i = 0; i < 3; i++) st.addClue('test');
  g.afterTime(); const sc = st.next();
  const wrong = BH.Story.SUSPECTS.findIndex((x) => x !== st.saga.culprit), f0 = g.sys.trencher.followers;
  st.choose(sc.id, wrong);
  assert.ok(!st.saga.sp.unmask, 'not over yet');
  assert.ok(g.sys.trencher.followers < f0);
});

test('three_missed_rents_is_game_over_evicted', () => {
  const g = game(7007), st = g.sys.story; const overs = []; g.on('gameOver', (o) => overs.push(o));
  g.clock.total += 24 * 5; g.bills.missed = 3; g.afterTime();
  assert.strictEqual(st.saga.over.why, 'evicted'); assert.strictEqual(overs.length, 1);
  assert.strictEqual(g.meta.over.why, 'evicted');
  g.afterTime(); assert.strictEqual(overs.length, 1, 'only once');
});

test('flat_broke_for_two_days_is_game_over', () => {
  const g = game(7008), st = g.sys.story;
  g.clock.total += 24 * 4; g.afterTime();
  g.player.sol = 0; g.player.pos.clear(); g.bills.cash = 0; g.bills.debt = 300;
  for (let h = 0; h < 50; h++) { g.clock.total += 1; g.bills.rentDueDay = 999; g.afterTime(); g.player.sol = 0; g.bills.cash = 0; }
  assert.strictEqual(st.saga.over && st.saga.over.why, 'broke');
});

test('the_subpoena_bans_you_if_heat_stays_high', () => {
  const g = game(7009), st = g.sys.story; toAct(g, 7); g.afterTime();
  assert.strictEqual(st.saga.active.id, 'subpoena'); playScene(st, 0);
  g.sys.biz.heat = 90;
  g.clock.total += 80; g.bills.rentDueDay = 999; g.afterTime();
  assert.strictEqual(st.saga.sp.subpoena, 'lost');
  assert.strictEqual(st.saga.over && st.saga.over.why, 'banned');
});

test('saga_survives_save_and_load', () => {
  const g = game(7010), st = g.sys.story; toAct(g, 3); st.addClue('test'); st.saga.titles.push('Ghost Rider');
  const obj = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = BH.createGame(); g2.start(obj); g2.afterTime();
  const s2 = g2.sys.story.saga;
  assert.strictEqual(s2.culprit, st.saga.culprit); assert.strictEqual(s2.clues.length, 1); assert.deepStrictEqual(s2.titles, ['Ghost Rider']);
  assert.strictEqual(g2.sys.story.act, 3);
});

test('old_five_act_saves_move_to_the_matching_new_act', () => {
  const g = BH.createGame(); g.newGame(7011);
  const st = g.sys.story; delete st.saga; st.v = undefined; st.act = 3; g.afterTime();
  assert.strictEqual(st.act, 4, 'old act 3 (dev) is new act 4 (Launch Day)');
});
