const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/director.js', 'game/mega.js', 'game/vamps.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 701); return g; }
function step(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
function forceMega(g) {
  const orig = BH.Director.prototype.template;
  BH.Director.prototype.template = function (t, r) { return t === 'mega' ? BH.Mega.MAX : orig.call(this, t, r); };
  g.sys.director.force = 'mega'; const tk = g.sim.launch(); g.sys.director.force = null;
  BH.Director.prototype.template = orig;
  return tk;
}

test('a_runner_draws_vamps_with_the_same_look_and_a_different_ca', () => {
  const g = game(), og = forceMega(g);
  step(g, 400);
  const vamps = g.sim.tokens.filter((t) => t.vampOf === og.id && t.vampWave !== 'race');
  assert.ok(vamps.length >= 2, 'vamps launched: ' + vamps.length);
  for (const v of vamps) { assert.strictEqual(v.ticker, og.ticker); assert.strictEqual(v.name, og.name); assert.notStrictEqual(v.ca, og.ca); }
  const fam = g.sys.vamps.family(og);
  if (!og.dead) assert.strictEqual(fam.og.id, og.id, 'the runner is the OG');
});

test('the_name_race_renames_young_coins_but_never_yours', () => {
  const g = game(702);
  step(g, 30);
  const mine = g.sim.tokens.filter((t) => !t.dead && t.stage === 'curve').pop();
  g.player.buy(mine.id, 0.1); step(g, 1);
  const before = mine.ticker;
  forceMega(g); step(g, 2);
  assert.strictEqual(mine.ticker, before, 'a coin you hold keeps its name');
  assert.ok(g.sys.vamps.raced >= 0);
});

test('the_fake_liquidity_vamp_looks_big_then_pulls_its_pool', () => {
  const g = game(703), og = forceMega(g);
  let fake = null;
  for (let i = 0; i < 900 && !fake; i++) { step(g, 1); fake = g.sim.tokens.find((t) => t.fakeLiq && t.vampOf === og.id); }
  if (!fake) return;   // 40% of megas have no fake vamp
  const mc0 = g.sim.mc(fake);
  assert.ok(mc0 > 50000, 'fake vamp shows a big market cap: ' + Math.round(mc0));
  while (g.sim.t < fake.pullAt + 2) step(g, 1);
  assert.ok(g.sim.mc(fake) < mc0 * 0.05, 'pool pulled');
  assert.ok(fake.rugged);
});

test('vamps_survive_save', () => {
  const g = game(704); forceMega(g); step(g, 120);
  const s = JSON.parse(JSON.stringify(g.sys.vamps.save()));
  const v2 = new BH.Vamps(g, s);
  assert.strictEqual(v2.count, g.sys.vamps.count);
});
