/* Launch archetypes (Nov 12), from a study of real launches.
   Each archetype is a chart the director plays back (prices relative to the curve floor at launch), built from segments:
     jump   one big candle, no wick (the creator's buy, or bundled / sniper buys landing in the same second)
     stairs climbing in steps with small dips          chop  sideways, mean-reverting
     bleed  down with lower highs                       dump  fast decline over a few candles
     flat   barely trades (slow-cook phase)             smooth tiny green candles, almost no red (a too-clean "fake" chart)
     nuke   one vertical red candle (a rug)
   A Dead on arrival: +80-100% first candle, 3-4x within a minute, back at the floor by 2-3 minutes, then nothing.
   B Bundled launch, then bleed: +170% first candle, chop, then a 20-minute bleed with lower highs.
   C Slow cook -> runner: flat for minutes with rare trades, then a staircase breakout to ~20x and a fade.
   D Instant bond -> second leg: +55% first candle, 2.5x in seconds, bonds in 2-3 min, sideways, then a 2-3x second leg.
   E Slow start, then hyper-bond: that's the mega runner (game/mega.js), not here.
   F Almost bonds, then rug: a choppy staircase to ~3.6x, then dumped below the launch.
   G Steady grinder: a clean staircase, dips stay small.
   H Dev-bought fake chart: the dev buys most of the curve in the first candle, a too-smooth grind, then -99% in one candle.
   Loaded after director.js: it wraps Director.prototype.template. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const D = BH.Director; if (!D) return;

  // [candles, end level (x launch), kind, volume]
  const ARCH = {
    A: { name: 'Dead on arrival', sec: 3, endHype: 0.02, seg: [[1, 1.9, 'jump', 14], [20, 3.6, 'stairs', 8], [40, 1.05, 'dump', 5], [30, 1.0, 'flat', 0.02]] },
    B: { name: 'Bundled launch, then bleed', sec: 4, seg: [[1, 2.7, 'jump', 16], [15, 3.2, 'chop', 5], [280, 1.4, 'bleed', 1.5]] },
    C: { name: 'Slow cook, then runner', sec: 6, seg: [[1, 1.08, 'jump', 2], [60, 1.1, 'flat', 0.08], [10, 2.2, 'stairs', 8], [40, 7, 'stairs', 6], [30, 20, 'stairs', 9], [60, 5, 'bleed', 3], [80, 8, 'chop', 2]] },
    // (this sim bonds at ~14x the launch value, so 'bonds in 2-3 minutes' means ~16x by then)
    D: { name: 'Instant bond, second leg', sec: 3, seg: [[1, 1.55, 'jump', 10], [5, 2.5, 'stairs', 10], [50, 16, 'stairs', 7], [200, 17, 'chop', 2.5], [150, 38, 'stairs', 5], [200, 9, 'bleed', 2]] },
    F: { name: 'Almost bonds, then rug', sec: 4, seg: [[1, 1.4, 'jump', 8], [10, 1.2, 'chop', 1.5], [170, 3.6, 'stairs', 3], [50, 1.15, 'dump', 4], [150, 0.8, 'bleed', 1]] },
    G: { name: 'Steady grinder', sec: 5, calm: 0.35, mom: 0.72, seg: [[1, 1.35, 'jump', 7], [35, 2.8, 'stairs', 3], [110, 3.3, 'chop', 2], [170, 4.3, 'stairs', 2.5]] },
    // round 2 (PAID): ~+4,000% first candle, then a too-smooth grind (1s median 0.01%, max ~2%, trades every second), -99% after ~1-1.5 h
    H: { name: 'Dev-bought fake chart', sec: 6, endHype: 0.02, devBuy: 40, mom: 0, seg: [[1, 40, 'jump', 30], [700, 88, 'smooth', 0.05], [1, 0.6, 'nuke', 40], [40, 0.6, 'flat', 0.01]] },
    // round 2 additions
    // I: a copycat with the same name as a coin that's running; it sits dead and pumps when its parent pumps (see the director)
    I: { name: 'Copycat riding its parent', sec: 6, ride: true, seg: [[1, 1.98, 'jump', 8], [3, 1.3, 'dump', 3], [500, 1.4, 'flat', 0.08]] },
    // J: viral mega-launch (YMB, Kimchi): +30-50% every second at first, $1M+ within minutes, then a long bleed (game days)
    J: { name: 'Viral mega-launch', sec: 3, seg: [[1, 1.45, 'jump', 20], [4, 8, 'stairs', 25], [20, 80, 'stairs', 20], [40, 300, 'stairs', 14], [60, 700, 'chop', 8], [200, 800, 'chop', 5], [1200, 90, 'bleed', 2]] },
    // K: no-curve launch (Ozempig): starts around $12K with no launch rush, sleepy hair-thin candles, a slow 3x, then a fade
    K: { name: 'No-curve launch', sec: 8, devBuy: 5, mom: 0.2, seg: [[1, 5, 'jump', 0.5], [120, 4.6, 'flat', 0.05], [200, 15, 'stairs', 1.5], [150, 8, 'bleed', 1], [200, 3, 'bleed', 0.5]] },
  };
  // which archetypes each fate can play, and how often the archetype replaces the old templates for that fate
  // round-2 mix for New Pairs: A 40 / F 18 / B 12 / G 10 / D 8 / C 4 / H 4 / I 3 / E 1 (E = mega runner, J = 30% of megas, K = rare)
  const BY_FATE = { doa: [['A', 0.93], ['I', 0.07]], pnd: [['B', 1]], rug: [['F', 0.82], ['H', 0.18]], runner: [['G', 0.42], ['D', 0.33], ['C', 0.17], ['K', 0.08]] };
  const SHARE = 0.8;

  function build(id, r) {
    const A = ARCH[id], out = []; let p = 1, cm = A.calm || 1;
    const N0 = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }, N = () => N0() * cm;
    for (const [n, end, kind, vol] of A.seg) {
      for (let i = 0; i < n; i++) {
        const o = p, left = n - i, step = Math.log(end / p) / left;
        let c, w = 0.02, v = vol * (0.6 + r() * 0.8);
        if (kind === 'jump' || kind === 'nuke') { c = end; w = 0; v = vol; }
        else if (kind === 'stairs') { c = p * Math.exp(step + N() * 0.06 + (r() < 0.15 ? -0.08 * cm : 0)); w = 0.03; if (r() < 0.25) v *= 2; }
        else if (kind === 'chop') { c = p * Math.exp(step + N() * 0.07); w = 0.04; }
        else if (kind === 'bleed') { c = p * Math.exp(step + N() * 0.05 + (r() < 0.12 ? 0.08 : 0)); w = 0.03; }
        else if (kind === 'dump') { c = p * Math.exp(step * 1.2 + N() * 0.06); w = 0.035; }
        else if (kind === 'flat') { c = p * Math.exp(step + N() * 0.025); w = 0.008; v = vol * r(); }
        else /* smooth */ { c = p * Math.exp(step + Math.abs(N()) * 0.004 - (r() < 0.06 ? 0.006 : 0)); w = 0.002; }
        if (i === n - 1 && kind !== 'stairs' && kind !== 'chop' && kind !== 'bleed') c = end;
        c = Math.max(0.02, c);
        const h = Math.max(o, c) * (1 + Math.abs(N()) * w), l = Math.min(o, c) * (1 - Math.abs(N()) * w);
        out.push([o, h, l, c, v]); p = c;
      }
    }
    return { src: 'arch:' + id, arch: id, archName: A.name, sec: A.sec, endHype: A.endHype, devBuy: A.devBuy, mom: A.mom, ride: !!A.ride, c: out };
  }

  const orig = D.prototype.template;
  D.prototype.template = function (type, r) {
    const opts = BY_FATE[type];
    if (opts && !this.noArch && r() < SHARE) {
      let x = r(), id = opts[opts.length - 1][0];
      for (const [k, w] of opts) { if ((x -= w) < 0) { id = k; break; } }
      return build(id, r);
    }
    return orig.call(this, type, r);
  };
  BH.Archetypes = { ARCH, BY_FATE, build };
})(typeof window !== 'undefined' ? window : globalThis);
