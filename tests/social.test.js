const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'game/loop.js', 'game/actions.js', 'game/social.js');

function game(seed) { const g = BH.createGame(); g.newGame(seed || 21); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } g.afterMarket(s); }

test('launches_get_narrative_photo_and_dd_post', () => {
  const g = game();
  const tk = g.sim.tokens[g.sim.tokens.length - 1];
  assert.ok(BH.Social.NARRATIVES.some((n) => n.id === tk.narrative), 'narrative ' + tk.narrative);
  assert.ok(Number.isInteger(tk.img) && tk.img >= 0 && tk.img < 200);
  assert.ok(tk.dd && tk.dd.text.length > 40 && tk.dd.acc.handle.startsWith('@'));
});

test('heat_stays_in_bounds_and_moves', () => {
  const g = game(22);
  const s = g.sys.social;
  run(g, 240);
  for (const n of BH.Social.NARRATIVES) { const h = s.heat[n.id]; assert.ok(h >= 0 && h <= 100, n.id + ' ' + h); }
  assert.ok(s.posts.length > 10, 'posts ' + s.posts.length);
});

test('hot_narrative_gets_more_launches', () => {
  const g = game(23);
  const s = g.sys.social;
  for (const n of BH.Social.NARRATIVES) s.heat[n.id] = 5;
  s.heat.cats = 100; s.lockHeat = true;
  const before = g.sim.stats.launched;
  run(g, 300);
  const fresh = g.sim.tokens.filter((t) => t.born > g.sim.t - 300);
  const cats = fresh.filter((t) => t.narrative === 'cats').length;
  assert.ok(cats / Math.max(1, fresh.length) > 0.3, 'cats share ' + cats + '/' + fresh.length);
  assert.ok(g.sim.stats.launched > before);
});

test('scope_tiers_posts_that_mention_coins', () => {
  const g = game(24);
  run(g, 300);
  const sc = g.sys.social.scope();
  assert.ok(sc.length > 0);
  for (const r of sc) assert.ok(['STRONG', 'MEDIUM', 'WEAK'].includes(r.tier));
  assert.ok(sc.every((r) => r.post.coin));
});

test('your_rug_gets_called_out_and_cools_narrative', () => {
  const g = game(25);
  const s = g.sys.social;
  const tk = g.sim.tokens.find((t) => !t.dead);
  const n = tk.narrative; s.heat[n] = 80;
  s.onPlayerRug(tk);
  assert.ok(s.heat[n] < 80);
  assert.ok(s.posts.some((p) => p.coin === tk.id && p.kind === 'callout'));
});

test('social_state_survives_save', () => {
  const g = game(26);
  run(g, 60);
  const h = BH.createGame();
  h.start(JSON.parse(JSON.stringify(g.serialize())));
  assert.strictEqual(h.sys.social.posts.length, g.sys.social.posts.length);
  assert.ok(Math.abs(h.sys.social.heat.cats - g.sys.social.heat.cats) < 1e-3);
  assert.ok(typeof h.sim.hooks.launch === 'function', 'hooks reattached');
});
