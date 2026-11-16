// Mayhem coins (game/mayhem.js), checked against the pump.fun study (docs/research/mayhem-mode.md)
const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/world.js', 'game/macro.js', 'game/fates.js', 'game/director.js', 'game/mega.js', 'game/vamps.js', 'game/j7.js', 'game/mayhem.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 1801); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('the_agent_makes_tiny_trades_with_big_jumps_and_drifts_below_launch', () => {
  const ends = []; let long = 0;
  for (const seed of [1801, 1802, 1803, 1804, 1805, 1806]) {
    const g = game(seed), sim = g.sim, m = g.sys.mayhem;
    const pump = BH.PADS.find((p) => p.id === 'pumplab'); sim.pickPad = () => pump; const tk = sim.launch(); delete sim.pickPad; m.enable(tk, { start: 0.5, stay: 60, survive: false });
    run(g, 70);
    const ag = tk.trades.filter((t) => t.addr === BH.Mayhem.AGENT);
    if (ag.length >= 15) long++;   // (a crashed curve sometimes graduates early, like real Mayhem coins)
    const sz = ag.map((t) => t.sol).sort((x, y) => x - y);   // live sample: median 0.028 SOL, p90 0.137
    assert.ok(sz[sz.length >> 1] < 0.06 && sz[sz.length - 1] <= 0.41, 'tiny trades: median ' + sz[sz.length >> 1].toFixed(3) + ', max ' + sz[sz.length - 1].toFixed(3));
    assert.ok(tk.mayhem.done, 'stopped');
    ends.push(tk.mayhem.endMc / tk.mayhem.launchMc);
  }
  assert.ok(long >= 4, 'coins with 15+ agent trades: ' + long + '/6');
  ends.sort((a, b) => a - b);
  const med = (ends[2] + ends[3]) / 2;
  assert.ok(med < 1, 'median end below launch: ' + ends.map((x) => x.toFixed(2)).join(','));
});

test('about_a_quarter_of_pump_launches_are_mayhem_and_most_end_within_minutes', () => {
  const g = game(1810);
  run(g, 1200);
  const m = g.sys.mayhem, L = m.log || [];
  assert.ok(m.stats.coins >= 15, 'mayhem coins in 20 min: ' + m.stats.coins);
  const under60 = L.filter((x) => x.secs < 60).length / Math.max(1, L.length);
  assert.ok(under60 > 0.4 && under60 < 0.85, 'share done within a minute: ' + under60.toFixed(2));
});

test('kols_skip_mayhem_coins_and_it_survives_save', () => {
  const g = game(1811), sim = g.sim, m = g.sys.mayhem, j = g.sys.j7;
  const pump = BH.PADS.find((p) => p.id === 'pumplab'); sim.pickPad = () => pump; const tk = sim.launch(); delete sim.pickPad; m.enable(tk, { start: 0.5, stay: 30 });
  j.snipeCheck(tk);
  assert.ok(!(j.queue || []).some((q) => q.snipeBuy && q.coin === tk.id), 'no KOL snipe');
  run(g, 40);
  const g2 = BH.createGame(); g2.start(JSON.parse(JSON.stringify(g.serialize())));
  assert.strictEqual(g2.sys.mayhem.stats.coins, m.stats.coins);
});
