const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/orders.js', 'game/build.js', 'game/world.js', 'game/markets.js', 'game/finance.js', 'game/macro.js', 'game/director.js', 'game/days.js', 'game/celebs.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 95); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('a_celebrity_tweet_launches_coins_on_it_and_the_timeline_reacts', () => {
  const g = game(), c = g.sys.celebs, s = g.sys.social, elon = BH.Celebs.CELEBS[0];
  run(g, 5);
  const n0 = g.sim.tokens.length, posts0 = s.posts.length;
  c.tweet(elon, ['the frog knows', 'Frog King', 'frogs']);
  assert.ok(s.posts.some((p) => p.celeb && p.handle === '@elontusk'), 'the tweet is on the timeline');
  run(g, 90);
  const born = g.sim.tokens.filter((t) => t.celeb === '@elontusk');
  assert.ok(born.length >= 3, 'copies launched: ' + born.length);
  assert.ok(born.some((t) => /Frog King/.test(t.name)), 'named after the tweet');
  assert.ok(['mega', 'runner', 'pnd'].includes(born[0].fate2), 'the first one usually runs: ' + born[0].fate2);
  assert.ok(g.sim.tokens.length > n0 && s.posts.length > posts0 + 2, 'reactions posted');
  assert.ok(s.posts.some((p) => p.quote && p.quote.handle === '@elontusk'), 'someone quoted the tweet');
});

test('new_narratives_exist_and_old_saves_get_heat_for_them', () => {
  const g = game(96), s = g.sys.social;
  assert.ok(BH.Social.NARRATIVES.length >= 20);
  const saved = JSON.parse(JSON.stringify(s.save())); delete saved.heat.brainrot;
  const back = new (Object.getPrototypeOf(s).constructor)(g, saved);
  assert.ok(back.heat.brainrot >= 0);
});

test('new_tweet_kinds_shill_inverse_stock_own_and_hack_do_their_thing', () => {
  const load2 = require('./helpers').load; load2('game/markets.js');
  const g = game(98), c = g.sys.celebs, s = g.sys.social, C = BH.Celebs.CELEBS, by = (h) => C.find((x) => x.handle === h);
  run(g, 120);
  // shill: a live coin gets pushed up
  const before = g.sim.tokens.filter((t) => !t.dead && t.dir).map((t) => [t, t.dir.off || 0]);
  c.special(by('@elontusk'), ['{coin} 👀', null, 'celeb', 'shill']);
  assert.ok(before.some(([t, o]) => (t.dir.off || 0) > o + 0.2), 'a coin got shilled up');
  // inverse: down
  const b2 = g.sim.tokens.filter((t) => !t.dead && t.dir).map((t) => [t, t.dir.off || 0]);
  c.special(by('@jimcrammer'), ['{coin}? I like it.', null, 'celeb', 'inverse']);
  assert.ok(b2.some(([t, o]) => (t.dir.off || 0) < o - 0.2), 'the inverse curse hit a coin');
  // stock tweets move the stock
  if (g.sys.perps) { const p0 = g.sys.perps.mk.MSTR.price; c.tweet(by('@msailor'), ['buy more', 'stock:MSTR:+', 'celeb']); assert.ok(g.sys.perps.mk.MSTR.price > p0, 'MSTR jumped'); }
  // own coin and hack: coins launch, and the hacked account warns later
  c.special(by('@vitalikb'), ['free ETH giveaway, buy $VITA now!!', 'Vita Airdrop', 'celeb', 'hack']);
  run(g, 30);   // (check the launch early: the hacked coin is a fast rug and a dead coin gets cleared from the list)
  assert.ok(g.sim.tokens.some((t) => t.celeb === '@vitalikb' && /Vita/.test(t.name)), 'the hacked coin launched');
  run(g, 230);
  assert.ok(s.posts.some((p) => p.handle === '@vitalikb' && /hacked/.test(p.text)), 'the owner warned everyone');
});
