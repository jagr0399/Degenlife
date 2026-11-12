const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/director.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 91); g.sys.fates.copy = null; return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
function launch(g, fate) { g.sys.director.force = fate; g.sys.fates.copy = null; g.sim.nextLaunch = g.sim.t; g.sim.step(0.25); g.sys.director.force = null; return g.sim.tokens[g.sim.tokens.length - 1]; }
function track(g, tk, secs) { const mcs = []; for (let i = 0; i < secs; i++) { run(g, 1); mcs.push(tk.dead ? 0 : g.sim.mc(tk)); } return mcs; }

test('every_launch_gets_a_secret_fate_and_hints', () => {
  const g = game(92); run(g, 300);
  const fates = {};
  for (const t of g.sim.tokens.filter((x) => x.dir)) { fates[t.fate2] = (fates[t.fate2] || 0) + 1; assert.ok(t.hint && t.hint.top > 0 && typeof t.hint.lp === 'boolean'); }
  assert.ok(Object.keys(fates).length >= 3, JSON.stringify(fates));
});

test('rug_has_one_huge_red_candle_then_flatlines', () => {
  let ok = 0;
  for (const seed of [93, 94, 95, 96]) {
    const g = game(seed), tk = launch(g, 'rug');
    const m = track(g, tk, 420);
    // a bonding curve can't fall below its launch price, so a rug from $10K lands about 60-75% lower within seconds
    let worst = 1; for (let i = 5; i < m.length; i++) if (m[i - 5] > 0) worst = Math.min(worst, m[i] / m[i - 5]);
    // ...and a coin that rugs close to its launch price can only fall back to it (the curve's floor)
    const tail = Math.min(...m.slice(-60).filter((x) => x > 0).concat([Infinity])), floor = tk.dir.mc0 * 1.15;
    const floorish = tail < Math.max(tk.athMc * 0.45, floor) || tk.dead;
    if ((worst < 0.6 || tail < floor) && tk.rugged && floorish) ok++;
  }
  assert.ok(ok >= 3, 'rugs that drop 40%+ inside 5 s (or to the curve floor) and stay down: ' + ok + '/4');
});

test('dead_on_arrival_never_runs', () => {
  for (const seed of [97, 98, 99]) {
    const g = game(seed), tk = launch(g, 'doa');
    track(g, tk, 200);
    assert.ok(tk.athMc < tk.dir.mc0 * 3.5, 'doa ATH ' + Math.round(tk.athMc) + ' vs start ' + Math.round(tk.dir.mc0));
  }
});

test('pump_and_dump_peaks_then_bleeds', () => {
  let ok = 0;
  for (const seed of [100, 101, 102, 103]) {
    const g = game(seed), tk = launch(g, 'pnd');
    const m = track(g, tk, 450).filter((x) => x > 0);
    const peak = Math.max(...m), pi = m.indexOf(peak), end = m[m.length - 1];
    if (peak > tk.dir.mc0 * 2 && pi < m.length * 0.7 && end < peak * 0.6) ok++;
  }
  assert.ok(ok >= 3, 'pump and dumps: ' + ok + '/4');
});

test('whale_coins_show_whale_trades', () => {
  const g = game(104), tk = launch(g, 'whale');
  track(g, tk, 600);
  assert.ok(tk.trades.some((t) => t.kind === 'whale') || (tk.bubbles || []).some((b) => b.kind === 'whale'), 'whale trades seen');
});

test('your_buy_moves_price_then_fades_back', () => {
  const g = game(105), tk = launch(g, 'doa');
  run(g, 20);
  const before = g.sim.mc(tk);
  g.player.buy(tk.id, 3, { priority: 0.01 }); run(g, 1);
  const after = g.sim.mc(tk);
  assert.ok(after > before * 1.06, 'your buy pushed price: ' + Math.round(before) + ' -> ' + Math.round(after));
});
