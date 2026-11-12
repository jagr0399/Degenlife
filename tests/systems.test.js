const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'game/loop.js', 'game/actions.js',
  'game/social.js', 'game/orders.js', 'game/build.js', 'game/factory.js', 'game/firm.js', 'game/pad.js', 'game/world.js', 'game/tutorial.js');
const C = BH.C;
function game(seed) { const g = BH.createGame(); g.newGame(seed || 31); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } g.afterMarket(s); g.afterTime(); }
function liveCoin(g) { return g.sim.tokens.filter((t) => !t.dead && t.stage === 'curve').pop(); }

test('all_systems_attach_in_order', () => {
  const g = game();
  assert.deepStrictEqual(Object.keys(g.sys), ['social', 'orders', 'build', 'factory', 'firm', 'pad', 'world', 'tutorial']);
});

test('take_profit_and_stop_loss_fire', () => {
  const g = game(32), tk = liveCoin(g);
  g.player.buy(tk.id, 0.5); run(g, 2);
  assert.ok(g.player.pos.has(tk.id));
  const mc = g.sim.mc(tk);
  g.sys.orders.add(tk.id, 'sl', mc * 10, 1);   // already below -> fires now
  run(g, 2);
  assert.strictEqual(g.sys.orders.list.length, 0);
  assert.ok(!g.player.pos.has(tk.id) || g.player.st.sells + g.player.st.failed > 0);
  assert.strictEqual(g.sys.orders.add(tk.id, 'bogus', 1, 1), null);
});

test('shop_delivery_unbox_and_effects', () => {
  const g = game(33), b = g.sys.build;
  g.bills.cash = 1000;
  assert.strictEqual(b.buy('monitor').ok, false, 'monitor needs the apartment');
  assert.ok(b.buy('chair').ok);
  assert.strictEqual(b.boxes.length, 0);
  g.clock.advanceHours(1.1); g.afterTime();
  assert.deepStrictEqual(b.boxes, ['chair']);
  assert.strictEqual(b.unbox().id, 'chair');
  assert.strictEqual(b.effects().seatedDrain, 2);
  assert.strictEqual(b.buy('chair').ok, false, 'max 1');
});

test('lease_needs_net_worth_and_raises_rent', () => {
  const g = game(34), b = g.sys.build;
  assert.strictEqual(b.lease('apartment').ok, false);
  g.bills.cash = 5000;
  assert.ok(b.lease('apartment').ok);
  assert.strictEqual(g.bills.rent, 700);
  assert.strictEqual(g.bills.cash, 3000);
});

test('rug_drops_rep_and_clean_raises_it', () => {
  const g = game(35), f = g.sys.factory;
  const r = g.player.launchCoin({ name: 'Test Coin', ticker: 'TEST', desc: 'x', hue: 10, socials: { x: true, tg: false, web: false }, devBuy: 0.5 });
  assert.ok(r.ok, r.reason);
  run(g, 2);
  const id = g.player.myCoins[0], tk = g.sim.byId.get(id);
  assert.ok(Number.isInteger(tk.img) && tk.dd, 'your coin gets a photo and a dd post');
  const rep0 = f.rep;
  const res = f.rug(id);
  assert.ok(res.ok, res.reason);
  assert.strictEqual(f.rep, rep0 - 25);
  assert.strictEqual(f.rugs, 1);
});

test('firm_hire_fund_and_trade_within_wallet', () => {
  const g = game(36), fm = g.sys.firm, b = g.sys.build;
  b.places.push('office'); b.owned.desk = 1;
  fm.newResumes();
  assert.ok(fm.hire(fm.resumes[0].id).ok);
  assert.strictEqual(fm.hire(fm.resumes[0].id).ok, false, 'one desk = one trader');
  const t = fm.staff[0]; t.style = 'gambler';
  assert.ok(fm.fund(t.id, 2).ok);
  const sol0 = g.player.sol;
  run(g, 120);
  assert.ok(t.wallet >= 0 && t.wallet <= 2 + 1e-9 + Math.max(0, t.pnl), 'wallet ' + t.wallet);
  assert.ok(g.player.sol <= sol0 + 1e-9);
  assert.ok(fm.fire(t.id).ok);
});

test('pad_earns_fees_and_moderates', () => {
  const g = game(37), pad = g.sys.pad, b = g.sys.build;
  assert.strictEqual(pad.buy().ok, false);
  b.places.push('tower'); b.owned.rack = 2; g.bills.cash = 50000;
  assert.ok(pad.buy().ok);
  pad.share = 0.9;
  const sol0 = g.player.sol;
  run(g, 300);
  assert.ok(pad.live().length + g.sim.tokens.filter((t) => t.pad === 'you').length > 0, 'coins launched on your pad');
  assert.ok(pad.earned > 0 && g.player.sol > sol0, 'fees earned ' + pad.earned);
  if (pad.queue.length) { const q = pad.queue[0]; assert.ok(pad.moderate(q.coin, true).ok); assert.ok(g.sim.byId.get(q.coin) == null || g.sim.byId.get(q.coin).dead); }
});

test('world_events_achievements_and_endings', () => {
  const g = game(38), w = g.sys.world;
  w.event('crash'); w.event('viral');
  assert.ok(w.news.length >= 2);
  g.player.st.buys = 1; g.afterTime();
  assert.ok(w.ach.first_trade);
  assert.strictEqual(w.canRetire(), false);
  g.bills.cash = 2e6;
  assert.ok(w.canRetire());
  const out = BH.Prestige.retire(g);
  assert.ok(out.end.title && out.meta.prestige === 1 && out.meta.perks.length === 1);
  assert.match(w.resolve('mom', 'mom_ok'), /proud/);
});

test('tutorial_advances_on_goals', () => {
  const g = game(39), tu = g.sys.tutorial;
  assert.ok(tu.on);
  assert.strictEqual(tu.current().id, 'look');
  g.flags.looked = g.flags.walked = true; g.flags.sat = true;
  tu.check();
  assert.strictEqual(tu.current().id, 'buy');
});

test('gear_and_perks_change_life', () => {
  const g = game(40);
  g.sys.build.owned.chair = 1; g.seated = true;
  const e0 = g.life.energy; g.life.tick(1, g.lifeOpts());
  assert.strictEqual(e0 - g.life.energy, 4, 'chair saves 2 energy/hour while seated');
  g.sys.build.owned.pc = 1; g.lifeOpts();
  assert.ok(g.life.focusBonus >= 8);
});

test('everything_survives_save', () => {
  const g = game(41);
  g.sys.build.places.push('office'); g.sys.build.owned.desk = 2; g.sys.firm.newResumes(); g.sys.firm.hire(g.sys.firm.resumes[0].id);
  g.flags.sat = true; g.sys.world.cat = true; g.sys.factory.rep = 77;
  run(g, 30);
  const h = BH.createGame(); h.start(JSON.parse(JSON.stringify(g.serialize())));
  assert.strictEqual(h.sys.firm.staff.length, 1);
  assert.ok(h.sys.build.places.includes('office'));
  assert.strictEqual(h.sys.factory.rep, 77);
  assert.strictEqual(h.sys.world.cat, true);
  assert.strictEqual(h.flags.sat, true);
  run(h, 10);
});

test('price_alert_fires_once', () => {
  const g = game(42), tk = liveCoin(g);
  const mc = g.sim.mc(tk);
  const o = g.sys.orders.add(tk.id, 'alert', mc * 0.5, 1);
  assert.strictEqual(o.dir, 'down');
  o.mc = mc * 10; o.dir = 'down';   // already below -> fires on the next step
  run(g, 1);
  assert.strictEqual(g.sys.orders.list.length, 0);
});
