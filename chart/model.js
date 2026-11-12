/* Pro chart viewport math: which bars are visible, where each bar and price sits on screen,
   zoom around the cursor, pan, axis dragging, auto-scale, linear / log / percent price modes.
   Pure (no DOM), so it is unit tested in Node. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const MIN_SP = 1.5, MAX_SP = 60, MAX_BARS = 5000, TINY = 1e-12;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function ChartModel(opts) {
    opts = opts || {};
    this.barSpacing = opts.barSpacing || 8;
    this.rightOffset = opts.rightOffset != null ? opts.rightOffset : 4;
    this.following = true;
    this.priceMode = opts.priceMode || 'linear';
    this.autoScale = true;
    this.priceRange = { lo: 1, hi: 2 };
    this.bars = [];
    this.w = 1; this.h = 1;
    this.rightIdx = this.rightOffset - 1; // fractional bar index at the right edge of the plot
  }
  const P = ChartModel.prototype;

  P.lastIndex = function () { return this.bars.length - 1; };
  P.setSize = function (w, h) { this.w = Math.max(1, w); this.h = Math.max(1, h); this.fit(); };
  P.setBars = function (bars) {
    this.bars = bars || [];
    if (this.following) this.rightIdx = this.lastIndex() + this.rightOffset;
    this.fit();
  };

  // ---- time axis ----
  P.xOfIndex = function (i) { return this.w - (this.rightIdx - i) * this.barSpacing; };
  P.indexOfX = function (x) { return this.rightIdx - (this.w - x) / this.barSpacing; };
  P.visibleRange = function () {
    const n = this.bars.length;
    if (!n) return { from: 0, to: -1 };
    const from = clamp(Math.floor(this.indexOfX(0)), 0, n - 1);
    const to = clamp(Math.ceil(this.indexOfX(this.w)), 0, n - 1);
    return to < from ? { from, to: from - 1 } : { from, to };
  };
  P._syncFollow = function () { this.following = Math.abs(this.rightIdx - (this.lastIndex() + this.rightOffset)) < 0.5; };
  P.zoomAt = function (x, factor) {
    const idx = this.indexOfX(x);
    this.barSpacing = clamp(this.barSpacing * factor, MIN_SP, MAX_SP);
    this.rightIdx = idx + (this.w - x) / this.barSpacing;
    this._syncFollow();
    this.fit();
  };
  P.pan = function (dxPx) {
    this.rightIdx -= dxPx / this.barSpacing;
    // never scroll fully past the data
    const n = this.bars.length;
    this.rightIdx = clamp(this.rightIdx, Math.min(5, n - 1), Math.max(this.lastIndex() + this.w / this.barSpacing - 5, 5));
    this.following = false;
    this.fit();
  };
  P.goLive = function () { this.following = true; this.rightIdx = this.lastIndex() + this.rightOffset; this.fit(); };

  // ---- price axis ----
  P._base = function () {
    const r = this.visibleRange();
    const b = this.bars[r.from];
    return b ? b.c || b.o || 1 : 1;
  };
  P.T = function (p) {
    if (this.priceMode === 'log') return Math.log(Math.max(p, TINY));
    return p;
  };
  P.invT = function (v) { return this.priceMode === 'log' ? Math.exp(v) : v; };
  P.fit = function () {
    if (!this.autoScale) return;
    const r = this.visibleRange();
    let lo = Infinity, hi = -Infinity;
    for (let i = r.from; i <= r.to; i++) { const b = this.bars[i]; if (b.l < lo) lo = b.l; if (b.h > hi) hi = b.h; }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = 1; hi = 2; }
    if (this.priceMode === 'log') { lo = Math.max(lo, TINY); hi = Math.max(hi, lo); }
    let tl = this.T(lo), th = this.T(hi);
    if (th - tl < 1e-9 * Math.max(1, Math.abs(th))) { const d = Math.max(Math.abs(th) * 0.01, 1e-9); tl -= d; th += d; }
    const pad = (th - tl) * 0.08;
    this.priceRange = { lo: this.invT(tl - pad), hi: this.invT(th + pad) };
  };
  P.yOfPrice = function (p) {
    const tl = this.T(this.priceRange.lo), th = this.T(this.priceRange.hi);
    return this.h - (this.T(p) - tl) / (th - tl) * this.h;
  };
  P.priceOfY = function (y) {
    const tl = this.T(this.priceRange.lo), th = this.T(this.priceRange.hi);
    return this.invT(tl + (this.h - y) / this.h * (th - tl));
  };
  // label for a price in the current mode (percent mode is relative to the first visible bar)
  P.percentOf = function (p) { return (p / this._base() - 1) * 100; };
  P.scalePrice = function (dyPx) {
    this.autoScale = false;
    const tl = this.T(this.priceRange.lo), th = this.T(this.priceRange.hi);
    const mid = (tl + th) / 2;
    const minHalf = this.priceMode === 'log' ? 1e-6 : Math.max(Math.abs(mid) * 1e-6, 1e-12);
    const half = Math.max(minHalf, (th - tl) / 2 * Math.exp(dyPx * 0.005));
    this.priceRange = { lo: this.invT(mid - half), hi: this.invT(mid + half) };
  };
  P.panPrice = function (dyPx) {
    if (this.autoScale) return;
    const tl = this.T(this.priceRange.lo), th = this.T(this.priceRange.hi);
    const d = dyPx / this.h * (th - tl);
    this.priceRange = { lo: this.invT(tl + d), hi: this.invT(th + d) };
  };
  P.resetPrice = function () { this.autoScale = true; this.fit(); };

  // ---- aggregation of 1s source candles (moved from v1.0 Chart.build) ----
  // Like Axiom: an interval with no trades prints NO bar (the time axis just skips it). playtest feedback: "all these candles
  // are flat" — the old version drew a flat dash for every empty second, which on a quiet coin was half the chart.
  // Pass fill = true for the old evenly spaced bars.
  ChartModel.aggregate = function (src, iv, now, fill) {
    const out = [];
    if (!src || !src.length) return out;
    let start = Math.floor(src[0].t / iv) * iv;
    const end = Math.floor(now / iv) * iv;
    start = Math.max(start, end - iv * (MAX_BARS - 1));
    let j = 0;
    while (j < src.length && src[j].t < start) j++;
    let last = j > 0 ? src[j - 1].c : src[0].o;
    for (let t = start; t <= end; t += iv) {
      let b = null;
      while (j < src.length && src[j].t < t + iv) {
        const c = src[j];
        if (!b) b = { t, o: last, h: Math.max(last, c.h), l: Math.min(last, c.l), c: c.c, v: 0, m: null };
        b.h = Math.max(b.h, c.h); b.l = Math.min(b.l, c.l); b.c = c.c; b.v += c.v;
        if (c.m) b.m = (b.m || []).concat(c.m);
        j++;
      }
      if (!b) { if (!fill) continue; b = { t, o: last, h: last, l: last, c: last, v: 0, m: null }; }
      last = b.c;
      out.push(b);
    }
    return out;
  };
  // bars skip empty intervals, so time <-> bar index goes through the bars' own times
  // idxOfT: fractional index of time t (inside bar k -> k..k+1); tOfIdx: the inverse
  ChartModel.idxOfT = function (bars, t, iv) {
    const n = bars.length; if (!n) return 0;
    if (t <= bars[0].t) return (t - bars[0].t) / iv;
    let lo = 0, hi = n - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (bars[mid].t <= t) lo = mid; else hi = mid - 1; }
    if (lo === n - 1) return lo + (t - bars[lo].t) / iv;
    return lo + Math.min(0.999, (t - bars[lo].t) / iv);
  };
  ChartModel.tOfIdx = function (bars, i, iv) {
    const n = bars.length; if (!n) return 0;
    if (i <= 0) return bars[0].t + i * iv;
    if (i >= n - 1) return bars[n - 1].t + (i - (n - 1)) * iv;
    const k = Math.floor(i); return bars[k].t + (i - k) * iv;
  };
  ChartModel.MIN_SP = MIN_SP; ChartModel.MAX_SP = MAX_SP;
  BH.ChartModel = ChartModel;
})(typeof window !== 'undefined' ? window : globalThis);
