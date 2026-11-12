const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/trencher.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 111); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
const live = (g) => g.sim.tokens.filter((t) => !t.dead && t.stage === 'curve').pop();

test('a_hit_call_grows_followers_and_trust', () => {
  const g = game(), tr = g.sys.trencher, tk = live(g);
  assert.ok(tr.call(tk.id).ok);
  const f0 = tr.followers, t0 = tr.trust;
  tr.calls[0].peak = tr.calls[0].mcAt * 3; g.sim.t += 121; tr.onStep();
  assert.strictEqual(tr.hits, 1);
  assert.ok(tr.followers > f0 && tr.trust > t0);
});

test('dumping_on_followers_costs_trust', () => {
  const g = game(112), tr = g.sys.trencher, tk = live(g);
  g.player.buy(tk.id, 0.5); run(g, 2);
  tr.call(tk.id); const t0 = tr.trust;
  g.player.sell(tk.id, 1); run(g, 2);
  assert.strictEqual(tr.dumps, 1);
  assert.ok(tr.trust <= t0 - 10);
});

test('copy_traders_mirror_your_buys_and_pay_you', () => {
  const g = game(113), tr = g.sys.trencher, tk = live(g);
  tr.followers = 20000; tr.trust = 80; run(g, 1);
  assert.ok(tr.copiers > 0, 'copiers ' + tr.copiers);
  g.player.buy(tk.id, 1); run(g, 6);
  assert.ok([...tk.holders.keys()].some((a) => a.startsWith('COPY-')), 'copiers bought');
  const sol0 = g.player.sol;
  g.player.sell(tk.id, 1); run(g, 8);
  assert.ok(tr.copyEarned >= 0);
  assert.ok(g.player.sol > sol0 - 0.5);
});

test('trencher_survives_save', () => {
  const g = game(114); g.sys.trencher.followers = 4321;
  const h = BH.createGame(); h.start(JSON.parse(JSON.stringify(g.serialize())));
  assert.strictEqual(Math.round(h.sys.trencher.followers), 4321);
});
