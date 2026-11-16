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

// Nov 16: flex a PnL; narrative coins quote the tweet they're about
test('flexing_a_win_posts_a_pnl_card_and_draws_followers', () => {
  const g = BH.createGame(); g.newGame(1901); const s = g.sys.social, t = g.sys.trencher;
  const f0 = t.followers;
  const r = s.flex({ ticker: 'WIN', coin: null, pnl: 2.5, invested: 1, mult: 3.5, open: false });
  assert.ok(r.ok);
  const p = s.posts[s.posts.length - 1];
  assert.ok(p.flex && p.flex.pnl === 2.5 && p.kind === 'flex' && /\+2\.50 SOL on \$WIN/.test(p.text));
  assert.ok(t.followers > f0);
  assert.ok(!s.flex(null).ok, 'nothing to flex');
});
test('most_coins_quote_the_tweet_they_are_about', () => {
  const g = BH.createGame(); g.newGame(1902);
  for (let i = 0; i < 600 * 4; i++) { g.sim.step(0.25); g.player.tick(); }
  const dd = g.sim.tokens.map((t) => t.dd).filter(Boolean), q = dd.filter((d) => d.quote);
  assert.ok(q.length / dd.length > 0.35, 'quoted ' + q.length + '/' + dd.length);
  assert.ok(q.every((d) => d.quote.text && d.quote.acc && d.link && d.link.startsWith('x.com/')));
});
