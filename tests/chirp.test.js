const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/chirp.js', 'game/fates.js', 'game/orders.js', 'game/build.js', 'game/factory.js', 'game/firm.js', 'game/pad.js', 'game/world.js', 'game/tracker.js', 'game/markets.js', 'game/director.js', 'game/trencher.js', 'game/tutorial.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 951); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('you_can_post_and_call_a_coin', () => {
  const g = game(), s = g.sys.social;
  assert.ok(s.compose('gm trenches').ok);
  const tk = g.sim.tokens.filter((t) => !t.dead).pop();
  assert.ok(s.compose('this one looks good', tk.id).ok);
  const mine = s.myPosts();
  assert.strictEqual(mine.length, 2); assert.strictEqual(mine[1].coin, tk.id);
  assert.ok(!s.compose('   ').ok);
});
test('like_and_repost_toggle_and_reposts_land_on_your_timeline', () => {
  const g = game(), s = g.sys.social; run(g, 20);
  const p = s.posts.filter((x) => x.acc !== 'you').pop(), l0 = p.likes || 0, r0 = p.reposts || 0;
  s.like(p.id); assert.strictEqual(p.likes, l0 + 1); assert.ok(p.liked);
  s.like(p.id); assert.strictEqual(p.likes, l0); assert.ok(!p.liked);
  s.repost(p.id); assert.strictEqual(p.reposts, r0 + 1);
  assert.ok(s.myPosts().some((x) => x.repostOf === p.id));
  assert.ok(s.reply(p.id, 'based').ok); assert.strictEqual(p.replies, 1);
});
test('your_posts_gather_likes_views_and_replies_over_time', () => {
  const g = game(952), s = g.sys.social; g.sys.trencher.followers = 20000; g.sys.trencher.trust = 80;
  s.compose('the trenches are so back');
  const p = s.myPosts()[0];
  run(g, 120);
  assert.ok(p.views > 100, 'views ' + p.views);
  assert.ok(p.likes > 0, 'likes ' + p.likes);
  assert.ok((s.notes || []).length > 0);
});
test('tutorial_has_the_new_steps_with_reasons', () => {
  const S = BH.Tutorial.STEPS;
  assert.ok(S.length >= 14);
  assert.ok(S.every((x) => x.why && x.text && x.title));
  assert.ok(S.some((x) => x.id === 'post') && S.some((x) => x.id === 'apps'));
  const g = game(); assert.ok(!S.find((x) => x.id === 'post').done(g)); g.sys.social.compose('hi'); assert.ok(S.find((x) => x.id === 'post').done(g));
});
