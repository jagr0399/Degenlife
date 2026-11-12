const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/orders.js', 'game/build.js', 'game/factory.js', 'game/firm.js', 'game/pad.js', 'game/world.js', 'game/tracker.js', 'game/markets.js', 'game/director.js', 'game/mega.js', 'game/trencher.js', 'game/tutorial.js', 'game/story.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 901); return g; }
function step(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
function forceMega(g, real) {
  const d = g.sys.director, r = g.sim.r;
  if (real != null) { const orig = BH.Director.prototype.template; BH.Director.prototype.template = function (t, rr) { return t === 'mega' ? (real ? BH.Mega.MAX : BH.Mega.genMega(rr)) : orig.call(this, t, rr); }; }
  d.force = 'mega'; const tk = g.sim.launch(); d.force = null; void r;
  return tk;
}

test('mega_is_a_rare_weighted_fate', () => {
  const w = BH.Director.WEIGHTS, tot = w.reduce((a, x) => a + x[1], 0);
  assert.ok(Math.abs(tot - 1) < 1e-9, 'weights sum ' + tot);
  assert.strictEqual(w.find((x) => x[0] === 'mega')[1], 0.015);
});

test('the_real_max_template_has_the_studied_shape', () => {
  const c = BH.Mega.MAX.c, closes = c.map((x) => x[3]), highs = c.map((x) => x[1]);
  assert.ok(c.length >= 100);
  assert.ok(Math.max(...highs) > 3000, 'peak ' + Math.max(...highs));
  assert.ok(closes[4] / closes[3] > 5, 'bonds in one candle');
  let crashes = 0; for (let i = 1; i < c.length; i++) if (c[i][2] / c[i - 1][3] < 0.5) crashes++;
  assert.ok(crashes >= 2, 'flash wicks ' + crashes);
});

for (const real of [true, false]) {
  test('a_' + (real ? 'real' : 'generated') + '_mega_runner_bonds_fast_runs_to_millions_and_spawns_betas', () => {
    const g = game(real ? 902 : 903), tk = forceMega(g, real);
    assert.strictEqual(tk.fate2, 'mega');
    let bondAt = null, peak = 0;
    for (let s = 0; s < 900 && !tk.dead; s++) { step(g, 1); if (!bondAt && tk.stage === 'amm') bondAt = g.sim.t - tk.born; peak = Math.max(peak, g.sim.mc(tk)); }
    assert.ok(bondAt != null && bondAt < 90, 'bonded after ' + bondAt + 's');
    assert.ok(peak > 2e6, 'peak $' + Math.round(peak));
    const betas = g.sim.tokens.filter((t) => t.betaOf === tk.id);
    // dead betas get pruned from the live list, so count what the mega system launched
    const launched = g.sys.mega && g.sys.mega.parents[tk.id] ? g.sys.mega.parents[tk.id].betas : betas.length;
    assert.ok(launched >= 3, 'betas launched ' + launched + ' (still listed ' + betas.length + ')');
    assert.ok(betas.every((b) => b.ticker.includes(tk.ticker.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)) || /BABY|MINI|CEO|MRS/.test(b.ticker)));
    const ev = g.sim.events.filter((e) => e.id === tk.id).map((e) => e.text).join(' | ');
    assert.ok(/bonded in/.test(ev) && /\$1M/.test(ev), ev.slice(0, 300));
  });
}

test('betas_follow_their_parent', () => {
  const g = game(904), tk = forceMega(g, true);
  for (let s = 0; s < 400; s++) step(g, 1);
  const b = g.sim.tokens.find((t) => t.betaOf === tk.id && t.dir && !t.dead);
  assert.ok(b, 'a live beta');
  const off0 = b.dir.off;
  tk.mcHist.push(g.sim.mc(tk) * 2);   // parent doubles
  g.sys.mega.onStep(0.25);
  assert.ok(b.dir.off > off0 + 0.5);
});
