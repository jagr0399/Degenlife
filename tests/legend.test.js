const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/director.js', 'game/mega.js', 'game/legend-data.js', 'game/legend.js', 'game/vamps.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 801); return g; }
function step(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
function forceLegend(g, which) {
  const orig = BH.Director.prototype.template;
  BH.Director.prototype.template = function (t, r) {
    if (t !== 'legend') return orig.call(this, t, r);
    return BH.Legend.trimFlat(which ? BH.LEGENDS[which] : BH.Legend.genLegend(r));
  };
  g.sys.director.force = 'legend'; const tk = g.sim.launch(); g.sys.director.force = null;
  BH.Director.prototype.template = orig;
  return tk;
}

test('legend_is_rare_and_weights_still_sum_to_one', () => {
  const w = BH.Director.WEIGHTS, tot = w.reduce((a, x) => a + x[1], 0);
  assert.ok(Math.abs(tot - 1) < 1e-9, 'weights sum ' + tot);
  assert.strictEqual(w.find((x) => x[0] === 'legend')[1], 0.004);
});

test('the_real_mihao_and_cate_charts_have_their_studied_shapes', () => {
  const m = BH.LEGENDS.mihao.c.map((x) => x[3]), c = BH.LEGENDS.cate.c.map((x) => x[3]);
  // stored charts are normalized to the median of the first 3 closes, so mihao peaks around 21x, not 100x+
  assert.ok(Math.max(...m) / m[0] > 15, 'mihao ran 15x+');
  assert.ok(Math.max(...c) / c[0] > 10, 'cate ran 10x+');
  // deep pullbacks that recover to a new high
  let hi = c[0], dd = 0, rec = 0; for (const x of c) { if (x > hi) { if (dd > 0.4) rec++; hi = x; dd = 0; } else dd = Math.max(dd, 1 - x / hi); }
  assert.ok(rec >= 2, 'cate recovered from 40%+ pullbacks ' + rec + ' times');
});

// fast-forward a running chart: same spot in the template, `sec` game seconds per candle from now on
function fastForward(g, tk, sec) { const D = tk.dir, pos = (g.sim.t - D.t0) / D.sec; D.sec = sec; D.t0 = g.sim.t - pos * sec; }

test('trimFlat_skips_the_flat_start_once', () => {
  const T = BH.Legend.trimFlat(BH.LEGENDS.mihao);
  assert.ok(T.c.length < BH.LEGENDS.mihao.c.length, 'mihao was trimmed');
  assert.strictEqual(BH.LEGENDS.mihao.c.length, 360, 'shared data left alone');
  assert.strictEqual(BH.Legend.trimFlat(T), T, 'a trimmed chart is not trimmed again');
  const c = T.c.map((x) => x[3]);
  assert.ok(c.slice(0, 5).some((x) => x > c[0] * 1.15), 'moves within the first few candles');
});

for (const [which, seed] of [['mihao', 802], ['cate', 804], [null, 803]]) {
  test('a_' + (which || 'generated') + '_legend_starts_moving_and_keeps_running_for_game_days', () => {
    const g = game(seed), tk = forceLegend(g, which);
    assert.strictEqual(tk.fate2, 'legend');
    assert.ok(tk.dir.sec >= 20, 'slow playback: ' + tk.dir.sec);
    const life = tk.dir.c.length * tk.dir.sec;
    assert.ok(life > 3600, 'lasts more than a game hour: ' + Math.round(life) + ' s');
    step(g, 2); const mc0 = g.sim.mc(tk);
    step(g, 178);
    // one seed can land on a slow opening (mihao measured 1.18x-1.56x over 12 seeds), so a single run only has to move;
    // the typical opening is checked over several seeds in legend_openings_move_on_most_seeds below
    assert.ok(tk.athMc > mc0 * 1.15, 'moving within 3 minutes: ' + Math.round(mc0) + ' -> ATH ' + Math.round(tk.athMc));
    step(g, 720);
    assert.ok(!tk.dead && !tk.dir.done, 'still alive after 15 minutes at normal speed (dead ' + tk.dead + ', done ' + tk.dir.done + ', mc ' + Math.round(g.sim.mc(tk)) + ', idle ' + Math.round(g.sim.t - tk.lastTrade) + ' s)');
    // the rest of the chart at 1 s per candle (a longer run without a long test)
    const left = tk.dir.c.length - (g.sim.t - tk.dir.t0) / tk.dir.sec;
    fastForward(g, tk, 1); step(g, Math.ceil(left) + 5);
    assert.ok(tk.athMc > mc0 * 5, 'ran: ' + Math.round(mc0) + ' -> ATH ' + Math.round(tk.athMc));
  });
}

test('legend_openings_move_on_most_seeds', () => {
  for (const which of ['mihao', null]) {
    const x = [];
    for (let seed = 820; seed < 825; seed++) { const g = game(seed), tk = forceLegend(g, which); step(g, 2); const mc0 = g.sim.mc(tk); step(g, 178); x.push(tk.athMc / mc0); }
    x.sort((a, b) => a - b);
    assert.ok(x[2] >= 1.3, (which || 'generated') + ': median 3-minute move ' + x[2].toFixed(2) + 'x (' + x.map((v) => v.toFixed(2)).join(', ') + ')');
  }
});
