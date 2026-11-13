const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/chirp.js', 'game/narratives.js', 'game/fates.js', 'game/director.js', 'game/world.js', 'game/celebs.js', 'game/celebs2.js', 'game/days.js', 'game/rivals.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 4101); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('there_are_many_more_narratives', () => {
  assert.ok(BH.Social.NARRATIVES.length >= 36, 'narratives: ' + BH.Social.NARRATIVES.length);
  const ids = BH.Social.NARRATIVES.map((n) => n.id); assert.strictEqual(new Set(ids).size, ids.length, 'unique ids');
});

test('chirp_is_not_only_coins', () => {
  const g = game(); run(g, 400);
  const kinds = {}; for (const p of g.sys.social.posts) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  const everyday = (kinds.life || 0) + (kinds.world || 0) + (kinds.sports || 0) + (kinds.meme || 0);
  assert.ok(everyday >= 10, 'everyday posts: ' + JSON.stringify(kinds));
  assert.ok(everyday < g.sys.social.posts.length * 0.7, 'coins still dominate the trenches');
});

test('a_hot_meta_burns_out_and_rotates', () => {
  const g = game(4102), s = g.sys.social; run(g, 5);
  const n = BH.Social.NARRATIVES[3].id; s.heat[n] = 95; s.flow = s.flow || { hot: {}, nextViral: 1e9, seen: {} }; s.flow.hot[n] = 400;
  let rotated = false; for (let i = 0; i < 300 && !rotated; i++) { s.heat[n] = Math.max(s.heat[n], 80); run(g, 1); rotated = s.posts.some((p) => /meta is done/.test(p.text)); }
  assert.ok(rotated, 'a rotation post');
});

test('a_celebrity_shill_moves_the_coin_and_keeps_it_moving', () => {
  const g = game(4103); run(g, 60);
  const c = g.sys.celebs, tk = g.sim.tokens.filter((t) => !t.dead && t.dir && !t.dir.done && g.sim.mc(t) < 2e6).sort((a, b) => g.sim.mc(b) - g.sim.mc(a))[0];
  c.hotCoin = () => tk;
  const off0 = tk.dir.off || 0;
  c.special(BH.Celebs.CELEBS.find((x) => x.handle === '@elontusk'), ['{coin} 👀', null, 'celeb', 'shill']);
  assert.ok(tk.dir.off > off0 + 0.25, 'pushed: ' + off0.toFixed(2) + ' -> ' + tk.dir.off.toFixed(2));
  assert.ok(tk.dir.fzUntil > g.sim.t, 'a frenzy started');
  const mid = tk.dir.off; run(g, 70);
  assert.ok(tk.dir.off > mid * 0.6, 'still pushed a minute later (waves + slow fade): ' + mid.toFixed(2) + ' -> ' + tk.dir.off.toFixed(2));
});

test('more_parody_celebrities', () => {
  assert.ok(BH.Celebs.CELEBS.length >= 26, 'celebs: ' + BH.Celebs.CELEBS.length);
  for (const c of BH.Celebs.CELEBS) for (const t of c.tweets) if (t[3] === 'own' || t[3] === 'own-rug' || t[3] === 'hack') assert.ok(t[1], c.handle + ' own-coin tweet needs a coin name');
});

test('rivals_race_weekly_and_pay_the_winner', () => {
  const g = game(4104); run(g, 5);
  const rv = g.sys.rivals;
  assert.strictEqual(rv.table().length, 5);
  for (const r of BH.Rivals.RIVALS) rv.pnl[r.id] = -999999;   // everyone else had an awful week
  const cash0 = g.bills.cash;
  g.clock.total += 24 * 7; rv.acc = 0; rv.onStep(1);
  assert.ok(g.bills.cash >= cash0 + 1000 - 1, 'first place paid $1,000');
  assert.strictEqual(rv.hist[rv.hist.length - 1].place, 1);
  run(g, 120);
  assert.ok(g.sys.social.posts.some((p) => p.kind === 'rival') || Object.values(rv.pnl).some((v) => v !== 0), 'rivals are trading');
});
