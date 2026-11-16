// Nov 16: your own launches get snipers, a buyer wave sized by an attention score, a launch report and paid milestones
const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/chirp.js', 'game/world.js', 'game/macro.js', 'game/fates.js', 'game/director.js', 'game/build.js', 'game/trencher.js', 'game/devflow.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 2001); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
function launch(g, name, socials, devBuy) {
  g.player.sol = 20;
  const r = g.player.launchCoin({ name, ticker: name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8), desc: 'x', socials, devBuy, lp: 'pumplab' });
  assert.ok(r.ok, r.reason); return r.token;
}

test('a_good_launch_gets_snipers_buyers_and_a_report', () => {
  const g = game(), s = g.sys.social, hot = s.hottest()[0];
  const tk = launch(g, 'Baby ' + hot.words[0], { x: true, tg: true, web: true }, 1);
  const cash0 = g.bills.cash;
  run(g, 120);
  assert.ok(tk.launchReport && tk.launchReport.score > 0.4, 'score ' + (tk.launchReport && tk.launchReport.score));
  const hs = [...tk.holders.values()];   // (tk.trades only keeps the last 120)
  assert.ok(hs.length >= 30, 'holders ' + hs.length);
  assert.ok(hs.some((h) => h.kind === 'sniper'), 'snipers');
  assert.ok(g.bills.cash >= cash0 + 100 || g.sys.devflow.ms.first, 'first-launch milestone');
});

test('a_bare_launch_gets_less_and_the_report_says_what_to_fix', () => {
  const g = game(2002);
  const tk = launch(g, 'Qwerty Zzz', { x: false, tg: false, web: false }, 0);
  run(g, 3);
  const S = tk.launchReport;
  assert.ok(S && S.score < 0.4 && S.fix.length >= 2, JSON.stringify(S && S.fix));
});

test('the_deployer_license_is_bought_anywhere_and_works_right_away', () => {
  const g = game(2003), b = g.sys.build; g.bills.cash = 1000;
  assert.ok(!b.effects().devdesk);
  const r = b.buy('devdesk'); assert.ok(r.ok, r.reason);
  assert.ok(b.effects().devdesk, 'active right away');
});
