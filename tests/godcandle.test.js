// Nov 16: god candles are rare (a speed limit on scripted rises past $20K) and come from KOL apes; Day Trading is retired
const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/chirp.js', 'game/world.js', 'game/macro.js', 'game/fates.js', 'game/director.js', 'game/mega.js', 'game/vamps.js', 'game/j7.js', 'game/daytrade-retired.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 1701); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('a_kol_ape_of_20_40_sol_prints_a_god_candle_with_their_name', () => {
  const g = game(), sim = g.sim, j = g.sys.j7;
  run(g, 600);
  const tk = sim.tokens.filter((t) => !t.dead && sim.mc(t) > 20000 && sim.mc(t) < 120000)[0];
  assert.ok(tk, 'a coin between $20K and $120K');
  const mc0 = sim.mc(tk);
  const res = j.godApe({ coin: tk.id, who: 'poorgoat' });
  assert.ok(res && res.sol >= 20 && res.sol <= 40, 'size ' + (res && res.sol));
  // Measure the buy itself; unrelated trades during the next 15 seconds may sell the move.
  assert.ok(res.after / mc0 >= 1.3, 'big candle: ' + (res.after / mc0).toFixed(2) + 'x');
  run(g, 15);
  const name = BH.J7.names[j.wallets.poorgoat].name;
  assert.ok((tk.bubbles || []).some((b) => b.name === name && b.sol >= 20), 'named bubble on the chart');
});

test('kol_apes_are_rare', () => {
  const g = game(1702), j = g.sys.j7;
  let n = 0; const orig = j.godApe.bind(j); j.godApe = (o) => { n++; return orig(o); };
  run(g, 1800);
  assert.ok(n >= 1 && n <= 5, 'apes in 30 min: ' + n);
});

test('scripted_rises_past_20k_are_speed_limited_except_runners', () => {
  const g = game(1703), sim = g.sim;
  run(g, 1200);
  let big = 0, exempt = 0;
  for (const tk of sim.tokens) {
    const ex = tk.j7Right || tk.fate2 === 'mega' || tk.fate2 === 'legend' || (tk.dir && tk.dir.arch === 'J') || tk.godUntil;
    const agg = [];
    for (const k of tk.candles) { const t = Math.floor(k.t / 15) * 15, l = agg[agg.length - 1]; if (l && l.t === t) l.c = k.c; else agg.push({ t, o: k.o, c: k.c }); }
    for (const k of agg) if (k.o >= 20000 && k.c / k.o >= 1.5) { if (ex) exempt++; else big++; }
  }
  assert.ok(big <= 12, 'god candles on ordinary coins in 20 min: ' + big + ' (exempt runners: ' + exempt + ')');
});

test('retired_day_trading_gives_back_cash_in_open_positions', () => {
  const g = game(1704);
  const cash0 = g.bills.cash;
  const sys = BH.Systems.find((s) => s.name === 'daytrade').create(g, { pos: { TSLA: { sh: 10, avg: 250 }, NVDA: { sh: -4, avg: 100 } } });
  assert.strictEqual(sys.settle(), 2100);
  assert.strictEqual(g.bills.cash, cash0 + 2100);
  assert.strictEqual(sys.save(), null);
  assert.strictEqual(sys.settle(), 0, 'only once');
});

test('kols_fight_for_the_first_tx_on_pvp_races_and_exit_later', () => {
  const g = game(1705), sim = g.sim, j = g.sys.j7; j.next = 1e9;
  const W = new Set(Object.values(j.wallets));
  let early = 0, sells = 0;
  const orig = sim.exec.bind(sim);
  sim.exec = function (tk, addr, kind, side, amt) { const f = orig(tk, addr, kind, side, amt); if (W.has(addr)) { if (side === 'buy' && sim.t - tk.born <= 3) early++; if (side === 'sell') sells++; } return f; };
  for (let k = 0; k < 3; k++) { j.meme(['elon', 'toly', 'cz'][k]); run(g, 120); }
  run(g, 300);
  assert.ok(early >= 2, 'KOL first-tx buys on race copies: ' + early);
  assert.ok(sells >= 2, 'KOLs exited: ' + sells);
  assert.ok((j.bags || []).length < 40);
});
