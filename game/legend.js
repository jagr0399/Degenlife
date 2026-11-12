/* Legend runners: the rarest coin type, modeled on coins that ran for weeks, not minutes.
   From docs/research/2026-11-12-runners-and-vamps.md:
   - mihao ("ni hao cat", Oct 25 2026): about 21x in 17 days on the hourly chart, 51 new highs, and pullbacks of 31-60%
     that were each bought back to a new high. 21 coins share its ticker (14 with real volume) and dozens of spin-offs
     (Grand Theft Mihao VI, MIHAO MUSK, ni hao dog...).
   - CATE (Jul 26 2026): 21x over 55 days on the daily chart, with recovered drawdowns of 44%, 71% and 66%, then a slow
     fade (-81% from the top by day 110). 11 coins share its ticker, plus spin-offs (Baby Catecoin, Cate Pepe, CATerpillar...).
   In the game: fate 'legend' (0.4% of launches) plays one of those real charts (or a generated variant with the same
   habits), slowed so that one real hour or day takes 20-60 game seconds. A legend keeps running for several game days,
   with brutal pullbacks that recover, and it draws vamps (game/vamps.js) and beta spin-offs like the real ones did. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};

  // generated variant: a staircase with 3-6 deep pullbacks that recover, then a slow fade
  // Each leg climbs by a set factor (2.5-5x) with noisy hourly candles, then pulls back 30-65%; at least 184 candles,
  // so at 20-30 game s per candle it lasts more than a game hour. The top is kept between ~10x and 40x like mihao/CATE (~21x).
  function genLegend(r) {
    const out = []; let p = 1;
    const push = (o, c, v) => { const h = Math.max(o, c) * (1 + r() * 0.06), l = Math.min(o, c) * (1 - r() * 0.06); out.push([o, h, l, c, v]); };
    const legs = r.int(4, 6);
    for (let L = 0; L < legs; L++) {
      const n = r.int(32, 50), mu = Math.log(r.range(2.5, 5)) / n;
      for (let i = 0; i < n; i++) { const o = p; p *= Math.exp(mu + r.range(-0.07, 0.07)); push(o, p, r.range(0.6, 2.5)); }
      const depth = r.range(0.3, 0.65);
      for (let i = 0, m = r.int(4, 10); i < m; i++) { const o = p; p *= Math.pow(1 - depth, 1 / m) * (1 + r.range(-0.03, 0.03)); push(o, p, r.range(1, 3)); }
    }
    for (let i = 0, n = r.int(40, 80); i < n; i++) { const o = p; p *= 1 + r.range(-0.06, 0.045); push(o, p, r.range(0.3, 1.2)); }
    // keep the top in the studied range: rescale the log path if it ran too far or not far enough
    const top = Math.max(...out.map((k) => k[1])), want = Math.min(40, Math.max(10, top));
    if (top > 1.01 && want !== top) { const e = Math.log(want) / Math.log(top); for (const k of out) for (let j = 0; j < 4; j++) k[j] = Math.pow(k[j], e); }
    return { src: 'generated (legend-style)', unit: 'hour', c: out };
  }
  BH.Legend = { genLegend, trimFlat };

  // Skip the quiet first days so a legend starts moving within a minute or two of game time.
  // The real mihao and CATE charts are nearly flat at first; we start 2 candles (hourly) or 1 candle (daily) before the first close above 1.5x.
  // Returns a shallow copy so the shared LEGENDS data is left alone.
  const TRIMMED = typeof WeakSet !== 'undefined' ? new WeakSet() : null;   // candle arrays already trimmed (trim only once)
  function trimFlat(T) {
    if (!T || !T.c || T.c.length < 8) return T;
    if (TRIMMED && TRIMMED.has(T.c)) return T;
    const closes = T.c.map((x) => x[3]);
    const first3 = closes.slice(0, 3).slice().sort((a, b) => a - b);
    const base = first3[1] || closes[0] || 1;
    let i = 0;
    for (; i < T.c.length; i++) if (closes[i] / base > 1.5) break;
    if (i >= T.c.length) return T;
    const start = Math.max(0, i - (T.unit === 'day' ? 1 : 2));   // a day candle plays ~2x as long as an hour candle
    if (!start) { if (TRIMMED) TRIMMED.add(T.c); return T; }
    const out = Object.assign({}, T, { c: T.c.slice(start) });
    if (TRIMMED) TRIMMED.add(out.c);
    return out;
  }

  function Legend(game, saved) { this.game = game; this.seen = {}; this.count = 0; if (saved) Object.assign(this, saved, { game }); }
  const P = Legend.prototype;
  P.save = function () { return { seen: this.seen, count: this.count }; };
  P.onStep = function () {
    const sim = this.game.sim, r = sim.r;
    for (const tk of sim.tokens) {
      if (tk.dead || tk.fate2 !== 'legend') continue;
      const st = this.seen[tk.id] = this.seen[tk.id] || { m1: false, m10: false, betas: 0, nextBeta: 0, day: 0 };
      const mc = sim.mc(tk);
      if (!st.m1 && mc >= 1e6) { st.m1 = true; sim.event('ath', tk, '$' + tk.ticker + ' passed $1M and it is still going. Holders are calling it the next big one'); }
      if (!st.m10 && mc >= 1e7) { st.m10 = true; if (this.game.sys.world) this.game.sys.world.headline('$' + tk.ticker + ' is still running days after launch: $10M and counting'); }
      // spin-offs over the coin's life (Baby X, X Inu... from game/mega.js)
      const mega = this.game.sys.mega;
      if (mega && mc >= 200000 && st.betas < 6 && sim.t >= st.nextBeta) { st.betas++; st.nextBeta = sim.t + r.range(90, 400); const b = mega.spawnBeta(tk); if (b) sim.event('launch', b, '$' + b.ticker + ' launched: a spin-off of $' + tk.ticker); }
    }
    if (r() < 0.005) for (const id of Object.keys(this.seen)) if (!sim.byId.get(id)) delete this.seen[id];
  };
  P.afterTime = function () { };
  BH.LegendSys = Legend;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'legend', create(game, saved) { const l = new Legend(game, saved); l.hooks = { step: () => l.onStep() }; return l; } });

  // ---- teach the director the new fate ----
  if (BH.Director) {
    const D = BH.Director;
    if (!D.WEIGHTS.some((w) => w[0] === 'legend')) {
      const doa = D.WEIGHTS.find((w) => w[0] === 'doa'); if (doa) doa[1] -= 0.004;
      D.WEIGHTS.push(['legend', 0.004]);
      D.LABEL.legend = 'Legend runner';
    }
    const tpl = D.prototype.template;
    D.prototype.template = function (type, r) {
      if (type !== 'legend') return tpl.call(this, type, r);
      const L = BH.LEGENDS || {}, real = [L.mihao, L.cate].filter(Boolean);
      const raw = real.length && r() < 0.6 ? real[r.int(0, real.length - 1)] : genLegend(r);
      return trimFlat(raw);
    };
    const onLaunch = D.prototype.onLaunch;
    D.prototype.onLaunch = function (tk, r) {
      onLaunch.call(this, tk, r);
      if (tk.fate2 !== 'legend' || !tk.dir) return;
      // trim here too, in case template() was replaced (trimFlat only trims a chart once)
      const trimmed = trimFlat({ src: tk.dir.src, unit: tk.dir.c.length < 150 ? 'day' : 'hour', c: tk.dir.c });
      if (trimmed && trimmed.c) tk.dir.c = trimmed.c;
      // one real hour = 20-30 game s (a 360-hour chart lasts ~2-3 game days); one real day = 45-60 game s
      tk.dir.sec = this.legendSec || (tk.dir.c.length < 150 ? r.range(45, 60) : r.range(20, 30));
      tk.dir.amp = r.range(0.8, 0.95);
      if (tk.hint) { tk.hint.top = Math.round(r.range(12, 20)); tk.hint.dev = Math.round(r.range(0, 2) * 10) / 10; tk.hint.insiders = r.int(0, 1); tk.hint.lp = true; tk.hint.xAge = r.int(0, 3); }
      tk.socials = Object.assign({}, tk.socials, { x: true, tg: true, web: true });
      tk.rewards = 'creator';
      this.game.sys.legend && this.game.sys.legend.count++;
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
