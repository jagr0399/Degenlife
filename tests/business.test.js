const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/orders.js', 'game/build.js', 'game/factory.js', 'game/firm.js', 'game/pad.js', 'game/world.js', 'game/tracker.js', 'game/markets.js', 'game/director.js', 'game/trencher.js', 'game/tutorial.js', 'game/story.js', 'game/business.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 601); g.bills.cash = 5000; return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
const base = { art: 'pixel', narrative: 'frogs', mascot: 'sad', lore: 'oneline', ticker: 'word' };

test('locked_traits_need_research_money', () => {
  const g = game(), b = g.sys.biz;
  assert.ok(!b.develop(Object.assign({}, base, { art: '3d' })).ok);
  assert.ok(b.unlock('art', '3d').ok);
  assert.strictEqual(g.bills.cash, 4600);
  assert.ok(b.develop(Object.assign({}, base, { art: '3d' })).ok);
});

test('synergies_score_higher_and_get_discovered', () => {
  const g = game(), b = g.sys.biz;
  const good = b.develop(base), bad = b.develop(Object.assign({}, base, { art: 'photo', mascot: 'baby' }));
  assert.ok(good.recipe.score > bad.recipe.score + 15, good.recipe.score + ' vs ' + bad.recipe.score);
  assert.ok(good.newly.length >= 2); assert.ok(b.knownCombos().length >= 2);
});

test('a_recipe_is_used_by_your_next_launch_and_clients_buy_early', () => {
  const g = game(), b = g.sys.biz;
  b.develop(base);
  for (const c of b.clients) { c.taste = 'frogs'; c.loyalty = 100; }
  const res = g.player.launchCoin({ name: 'Sad Toad', ticker: 'STOAD', desc: 'x', socials: { x: true }, devBuy: 0 });
  assert.ok(res.ok);
  const tk = res.token;
  assert.strictEqual(tk.narrative, 'frogs'); assert.ok(b.recipes[0].used);
  run(g, 8);
  assert.ok((tk.clientBuys || 0) >= 1, 'client buys ' + tk.clientBuys);
});

test('crew_get_paid_daily_and_shillers_add_heat', () => {
  const g = game(), b = g.sys.biz;
  b.newApplicants(); b.applicants[0].role = 'shiller'; b.applicants[0].honesty = 99;
  assert.ok(b.hire(b.applicants[0].id).ok);
  g.player.launchCoin({ name: 'Heat Coin', ticker: 'HEAT', desc: 'x', socials: {}, devBuy: 0 });
  const cash0 = g.bills.cash;
  g.clock.total += 30; g.afterTime();
  assert.ok(b.heat > 0, 'heat ' + b.heat);
  assert.ok(g.bills.cash < cash0, 'paid');
});

test('rugging_adds_heat_and_villain_path', () => {
  const g = game(), b = g.sys.biz;
  const res = g.player.launchCoin({ name: 'Rug Coin', ticker: 'RUGC', desc: 'x', socials: {}, devBuy: 0.5 });
  run(g, 2);
  const r = g.sys.factory.rug(res.token.id);
  assert.ok(r.ok, r.reason);
  assert.ok(b.heat >= 25); assert.ok(g.sys.story.path.villain >= 2);
});

test('heat_cools_faster_when_lying_low', () => {
  const g = game(), b = g.sys.biz;
  b.heat = 50; b.lastHour = Math.floor(g.clock.total);
  g.clock.total += 10; g.afterTime(); const normal = 50 - b.heat;
  b.heat = 50; b.goQuiet(); g.clock.total += 10; g.afterTime(); const low = 50 - b.heat;
  assert.ok(low > normal * 2, low + ' vs ' + normal);
});

test('business_survives_save_and_load', () => {
  const g = game(), b = g.sys.biz; b.develop(base); b.heat = 33;
  const g2 = BH.createGame(); g2.start(JSON.parse(JSON.stringify(g.serialize())));
  assert.strictEqual(g2.sys.biz.heat, 33); assert.strictEqual(g2.sys.biz.recipes.length, 1); assert.strictEqual(typeof g2.sys.biz.develop, 'function');
});
