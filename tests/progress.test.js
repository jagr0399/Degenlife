const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/orders.js', 'game/director.js', 'game/world.js', 'game/trencher.js', 'game/days.js', 'game/contracts.js', 'game/rivals.js', 'game/extras.js', 'game/progress.js', 'game/bots.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 5101); BH.Game = g; return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
const close = (g, mult, pnl) => { g.player.closed.unshift({ id: 'x' + Math.random(), ticker: 'TEST', pnl, invested: 1, mult, held: 30, at: g.sim.t }); run(g, 1); };

test('skills_level_up_from_trading_and_give_perks', () => {
  const g = game(); run(g, 5);
  const pr = g.sys.progress, c0 = pr.lvl('chart');
  for (let i = 0; i < 12; i++) close(g, 2.5, 1.5);
  assert.ok(pr.lvl('chart') > c0, 'charting level ' + pr.lvl('chart'));
  const tk = g.sim.tokens.find((t) => t.fate2); const gut = pr.gut(tk);
  assert.ok(gut && ['rug', 'dud', 'runner'].includes(gut.read), 'gut feeling');
});

test('three_wins_make_a_heater_and_a_big_loss_makes_revenge', () => {
  const g = game(5102); run(g, 5);
  const pr = g.sys.progress;
  close(g, 1.5, 0.5); close(g, 1.4, 0.4); close(g, 1.3, 0.3);
  assert.strictEqual(pr.mood && pr.mood.id, 'heater');
  close(g, 0.3, -0.7);
  assert.strictEqual(pr.mood && pr.mood.id, 'revenge');
});

test('every_7th_day_is_degen_con_and_a_2x_wins_the_contest', () => {
  const g = game(5103); run(g, 5);
  const d = g.sys.days, pr = g.sys.progress;
  d.roll(7); assert.strictEqual(d.type, 'con');
  g.clock.total = 6 * 24 + 10; run(g, 1);   // day 7
  assert.ok(pr.con && pr.con.day === 7);
  close(g, 2.6, 1.6);
  const cash0 = g.bills.cash;
  g.clock.total = 7 * 24 + 1; run(g, 1);    // day 8: the contest pays
  assert.ok(g.bills.cash >= cash0 + 500 - 1, 'contest paid');
});

test('people_react_and_the_day_report_adds_up', () => {
  const g = game(5104); run(g, 5);
  const pr = g.sys.progress, m0 = pr.rel.mom;
  close(g, 0.2, -2);
  assert.ok(pr.rel.mom < m0, 'mom worried');
  close(g, 4, 3);
  const r = pr.report();
  assert.ok(r.closes >= 2 && r.best.mult >= 4 && r.worst.mult <= 0.2, JSON.stringify(r));
});

test('a_bot_buys_on_its_trigger_and_sets_tp_and_sl', () => {
  const g = game(5105); run(g, 60);
  const b = g.sys.bots;
  assert.ok(b.add({ trig: 'newpair', maxMc: 1e9, buy: 0.05, tp: 2, sl: 30 }).ok);
  run(g, 90);
  assert.ok(b.rules[0].trades >= 1, 'bot traded ' + b.rules[0].trades);
  assert.ok(g.sys.orders.list.some((o) => o.kind === 'tp') && g.sys.orders.list.some((o) => o.kind === 'sl'), 'tp and sl set');
  assert.ok(b.log.length >= 1);
});
