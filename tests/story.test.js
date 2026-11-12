const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/orders.js', 'game/build.js', 'game/factory.js', 'game/firm.js', 'game/pad.js', 'game/world.js', 'game/tracker.js', 'game/markets.js', 'game/director.js', 'game/trencher.js', 'game/tutorial.js', 'game/story.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 501); return g; }

test('story_starts_in_act_1_with_the_intro_scene', () => {
  const g = game(), st = g.sys.story;
  g.afterTime();
  assert.strictEqual(st.act, 1);
  assert.strictEqual(st.next().id, 'intro');
});

test('choices_move_path_relationships_and_log', () => {
  const g = game(), st = g.sys.story; g.afterTime();
  const reply = st.choose('intro', 1);
  assert.ok(reply.length > 5);
  assert.strictEqual(st.path.builder, 1); assert.strictEqual(st.rel.dex, 1);
  assert.strictEqual(st.log.length, 1); assert.ok(st.seen.intro);
});

test('scenes_are_spaced_out_in_game_time', () => {
  const g = game(), st = g.sys.story;
  g.clock.total += 24 * 3; g.afterTime();
  const a = st.next(); st.choose(a.id, 0);
  assert.strictEqual(st.next(), null, 'next scene waits ~2 game hours');
  g.clock.total += 3; assert.ok(st.next());
});

test('park_visit_meets_old_sol_and_completes_the_goal', () => {
  const g = game(), st = g.sys.story;
  g.sys.world.visitPark(); g.afterTime();
  assert.ok(st.queue.includes('sol1'));
  st.lastSceneHour = -99; st.queue = ['sol1']; st.choose('sol1', 0);
  g.afterTime();
  assert.ok(st.done['1:park']);
});

test('acts_advance_when_all_goals_are_done', () => {
  const g = game(), st = g.sys.story; let acts = 0;
  g.on('storyAct', () => acts++);
  st.flags.metSol = true; g.bills.cash = 5000; g.clock.total = 24 * 8 + 10; g.afterTime(); g.afterTime();
  assert.strictEqual(st.act, 2); assert.strictEqual(acts, 1);
});

test('kai_climbs_daily_and_posts_on_chirp', () => {
  const g = game(), st = g.sys.story, n0 = g.sys.social.posts.length;
  g.clock.total += 24 * 10; g.afterTime();
  assert.strictEqual(st.kai.day, g.clock.day);
  assert.ok(st.kai.history.length >= 10);
  assert.ok(g.sys.social.posts.length > n0);
});

test('story_ending_follows_your_path', () => {
  const g = game(), st = g.sys.story;
  st.path = { builder: 1, degen: 0, villain: 6 };
  assert.strictEqual(g.sys.world.endingFor().id, 'story_villain');
  st.path = { builder: 7, degen: 1, villain: 0 };
  assert.strictEqual(g.sys.world.endingFor().title, 'The Builder');
});

test('story_survives_save_and_load', () => {
  const g = game(), st = g.sys.story; g.afterTime(); st.choose('intro', 0); st.flags.race = true;
  const g2 = BH.createGame(); g2.start(JSON.parse(JSON.stringify(g.serialize())));
  const s2 = g2.sys.story;
  assert.strictEqual(s2.path.degen, 1); assert.ok(s2.flags.race); assert.ok(s2.seen.intro); assert.strictEqual(typeof s2.choose, 'function');
});
