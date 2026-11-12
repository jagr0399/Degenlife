// Measures generated 1s / 15s candles against the human-chart targets in docs/research/human-charts-spec.md.
// FORCE_MEGA=1 also launches two mega runners with the real Max template, so there are large caps to measure.
// usage: node tools/chartstats.js [seed] [minutes]   (runs the full game headless, then reports per market-cap class)
const { load } = require('../tests/helpers');
const BH = load('core/config.js','core/names.js','core/fmt.js','core/sim.js','core/player.js','game/savecodec.js','game/clock.js','game/life.js','game/bills.js','chart/model.js','chart/indicators.js','chart/drawings.js','game/loop.js','game/perf.js','game/actions.js','game/collide.js','game/social.js','game/chirp.js','game/fates.js','game/orders.js','game/build.js','game/factory.js','game/firm.js','game/pad.js','game/world.js','game/macro.js','game/tracker.js','game/markets.js','game/director.js','game/archetypes.js','game/whales.js','game/agents.js','game/days.js','game/celebs.js','game/daytrade.js','game/mega.js','game/legend-data.js','game/legend.js','game/vamps.js','game/trencher.js','game/tutorial.js','game/story.js','game/business.js','game/clout.js','game/tools.js','game/finance.js','game/empire.js','game/extras.js');
const seed = +(process.argv[2] || 42), minutes = +(process.argv[3] || 30);
const g = BH.createGame(); g.newGame(seed);
if (process.env.FORCE_MEGA) { const orig = BH.Director.prototype.template; BH.Director.prototype.template = function (t, r) { return t === 'mega' ? BH.Mega.MAX : orig.call(this, t, r); }; for (let m = 0; m < 2; m++) { g.sys.director.force = 'mega'; g.sim.launch(); g.sys.director.force = null; } BH.Director.prototype.template = orig; }
for (let i = 0; i < minutes * 60 * 4; i++) { g.sim.step(0.25); g.player.tick(); }
const sim = g.sim, now = sim.t, WIN = 600;   // last 10 min
if (process.env.FORCE_MEGA) for (const tk of sim.tokens.filter((t) => t.fate2 === 'mega')) console.log('mega', tk.ticker, 'mc', Math.round(sim.mc(tk)), 'dead', !!tk.dead, 'candles in window', tk.candles.filter((k) => k.t >= sim.t - 600).length);
const q = (a, p) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
const acf = (a) => { if (a.length < 10) return NaN; const m = a.reduce((x, y) => x + y, 0) / a.length; let n = 0, d = 0; for (let i = 0; i < a.length; i++) { d += (a[i] - m) ** 2; if (i) n += (a[i] - m) * (a[i - 1] - m); } return d ? n / d : 0; };
function agg(c, sec) { const out = []; for (const k of c) { const b = Math.floor(k.t / sec) * sec, l = out[out.length - 1]; if (l && l.t === b) { l.h = Math.max(l.h, k.h); l.l = Math.min(l.l, k.l); l.c = k.c; } else out.push({ t: b, o: k.o, h: k.h, l: k.l, c: k.c }); } return out; }
function stats(c, secs) {
  if (c.length < 40) return null;
  const r = [], ar = [], sg = []; let gap = 0, nowick = 0, doji = 0, uw = 0, lw = 0, big = 0, bigNext = 0;
  for (let i = 0; i < c.length; i++) {
    const k = c[i], body = Math.abs(k.c - k.o), top = Math.max(k.o, k.c), bot = Math.min(k.o, k.c), eps = top * 1e-9;
    if (i && Math.abs(k.o - c[i - 1].c) > eps) gap++;
    if (k.h - top <= eps && bot - k.l <= eps) nowick++;
    if (body / k.o < 0.0005) doji++;
    if (k.h - top > body + eps) uw++; if (bot - k.l > body + eps) lw++;
    if (i) { const x = (k.c / c[i - 1].c - 1) * 100; r.push(x); ar.push(Math.abs(x)); sg.push(Math.sign(x)); }
  }
  for (let i = 0; i < ar.length; i++) if (ar[i] >= 5) { big++; if (ar.slice(i + 1, i + 6).some((x) => x >= 5)) bigNext++; }
  const n = c.length, bins = [0, 0, 0, 0, 0, 0]; let wickC = 0, bigC = 0;
  for (const k of c) { const b = Math.abs(k.c - k.o) / k.o * 100, rg = (k.h - k.l) / k.o * 100; bins[b < 0.1 ? 0 : b < 0.5 ? 1 : b < 1 ? 2 : b < 3 ? 3 : b < 10 ? 4 : 5]++; if (rg > 2 && rg > 3 * b) wickC++; if (b >= 5) bigC++; }
  return { bins: bins.map((x) => x / n), wickC: wickC / n, bigC: bigC / n, n, gaps: gap / n, nowick: nowick / n, doji: doji / n, p50: q(ar, 0.5), p90: q(ar, 0.9), p99: q(ar, 0.99), max: Math.max(...ar), sacf: acf(sg.filter((x) => x)), aacf: acf(ar), active: secs ? n / secs : NaN, uw: uw / n, lw: lw / n, bigNext: big ? bigNext / big : NaN };
}
const rows = { small: [], mid: [], large: [] }, rows15 = { small: [], mid: [], large: [] };
for (const tk of sim.tokens) {
  if (tk.dead || tk.isPlayer) continue;
  const c = tk.candles.filter((k) => k.t >= now - WIN); if (c.length < 40) continue;
  const mc = sim.mc(tk), cls = mc > 1e6 ? 'large' : mc > 25000 ? 'mid' : 'small';
  const span = Math.min(WIN, now - tk.born);
  const s1 = stats(c, span); if (s1) rows[cls].push(s1);
  const s15 = stats(agg(c, 15), span / 15); if (s15) rows15[cls].push(s15);
}
const med = (arr, k) => q(arr.map((x) => x[k]).filter((v) => isFinite(v)), 0.5);
const pct = (v) => (v * 100).toFixed(0) + '%', f = (v, d = 2) => (isFinite(v) ? v.toFixed(d) : '-');
for (const [tf, R] of [['1s', rows], ['15s', rows15]]) for (const cls of ['small', 'mid']) {
  const a = R[cls]; if (!a.length) continue;
  const hb = [0, 1, 2, 3, 4, 5].map((i) => pct(q(a.map((x) => x.bins[i]), 0.5)));
  const spread = (k) => f(q(a.map((x) => x[k]), 0.1)) + '..' + f(q(a.map((x) => x[k]), 0.9));
  console.log(tf.padEnd(4) + cls.padEnd(6) + 'bodies <0.1/0.1-0.5/0.5-1/1-3/3-10/>10%: ' + hb.join(' / ') + ' | wick candles ' + pct(med(a, 'wickC')) + ' | big (>=5%) ' + pct(med(a, 'bigC')) + ' | coin-to-coin |r| p50 ' + spread('p50') + ' p90 ' + spread('p90'));
}
for (const [tf, R] of [['1s', rows], ['15s', rows15]]) for (const cls of ['small', 'mid', 'large']) {
  const a = R[cls]; if (!a.length) continue;
  console.log(tf.padEnd(4) + cls.padEnd(6) + 'coins ' + String(a.length).padEnd(3) + '| gaps ' + pct(med(a, 'gaps')) + ' | nowick ' + pct(med(a, 'nowick')) + ' | doji ' + pct(med(a, 'doji')) + ' | |r| p50 ' + f(med(a, 'p50')) + ' p90 ' + f(med(a, 'p90')) + ' p99 ' + f(med(a, 'p99')) + ' max ' + f(med(a, 'max'), 1) + ' | signACF ' + f(med(a, 'sacf')) + ' | absACF ' + f(med(a, 'aacf')) + ' | active ' + pct(med(a, 'active')) + ' | wick>body up ' + pct(med(a, 'uw')) + ' lo ' + pct(med(a, 'lw')) + ' | big->big ' + pct(med(a, 'bigNext')));
}
