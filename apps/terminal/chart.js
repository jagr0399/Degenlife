/* Candlestick chart on canvas: market cap (USD) candles, volume, your buys/sells, dev sells, migration line. */
(function (g) {
  'use strict';
  const BH = g.BH;
  const COL = { up: '#34d8a0', down: '#ff5f78', grid: '#1a1d22', text: '#6c727d', text2: '#a4aab4', brand: '#f4b23e', bg: '#0a0b0d', violet: '#b59cff' };

  function Chart(canvas, ohlcEl) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.ohlc = ohlcEl;
    this.interval = 1; this.log = false; this.hover = null; this.bars = []; this.layout = null;
    canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); this.hover = { x: e.clientX - r.left, y: e.clientY - r.top }; this.draw(); });
    canvas.addEventListener('mouseleave', () => { this.hover = null; this.draw(); });
  }
  const P = Chart.prototype;

  P.setData = function (tk, now) { this.tk = tk; this.now = now; this.build(); this.draw(); };

  // aggregate 1s candles into the chosen interval, filling empty buckets with flat bars
  P.build = function () {
    const tk = this.tk, iv = this.interval;
    const out = [];
    if (!tk || !tk.candles.length) { this.bars = out; return; }
    const src = tk.candles;
    let start = Math.floor(src[0].t / iv) * iv;
    const end = Math.floor(this.now / iv) * iv;
    // only build what can be shown (about 400 bars max)
    start = Math.max(start, end - iv * 400);
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
      if (!b) b = { t, o: last, h: last, l: last, c: last, v: 0, m: null };
      last = b.c;
      out.push(b);
    }
    this.bars = out;
  };

  P.draw = function () {
    const cv = this.cv, ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const axisW = 64, padT = 30, volH = Math.round(H * 0.16), padB = 20;
    const plotW = W - axisW, plotH = H - padT - padB - volH;
    const bw = 8, gap = 2, step = bw + gap;
    const n = Math.min(this.bars.length, Math.floor((plotW - 10) / step));
    const bars = this.bars.slice(this.bars.length - n);
    if (!bars.length) { ctx.fillStyle = COL.text; ctx.font = '12px Inter'; ctx.fillText('Waiting for trades…', 14, 40); return; }
    let lo = Infinity, hi = -Infinity, vmax = 0;
    for (const b of bars) { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); vmax = Math.max(vmax, b.v); }
    if (hi - lo < hi * 0.02) { hi *= 1.01; lo *= 0.99; }
    const fy = this.log ? (v) => Math.log(v) : (v) => v;
    let a = fy(lo), z = fy(hi);
    const pad = (z - a) * 0.08; a -= pad; z += pad;
    if (!this.log) a = Math.max(0, a);
    const y = (v) => padT + (1 - (fy(v) - a) / (z - a)) * plotH;
    const x0 = plotW - 6 - n * step;
    const xb = (i) => x0 + i * step;
    this.layout = { x0, step, n, bars, y, plotW, padT, plotH, a, z };

    // grid + axis labels
    ctx.font = '11px Inter'; ctx.textBaseline = 'middle';
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const yy = padT + plotH * i / ticks;
      const fv = z - (z - a) * i / ticks;
      const v = this.log ? Math.exp(fv) : fv;
      ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, Math.round(yy) + .5); ctx.lineTo(plotW, Math.round(yy) + .5); ctx.stroke();
      ctx.fillStyle = COL.text; ctx.fillText(BH.fmt.usd(v), plotW + 8, yy);
    }
    // time labels
    ctx.textBaseline = 'alphabetic';
    const every = Math.max(1, Math.round(90 / step));
    for (let i = 0; i < n; i += every) {
      const b = bars[i];
      const age = b.t - this.tk.born;
      ctx.fillStyle = COL.text; ctx.fillText(BH.fmt.clock(Math.max(0, age)), xb(i), H - 5);
    }
    // migration line
    const tk = this.tk;
    if (tk.migratedAt != null) {
      const i = bars.findIndex((b) => b.t + this.interval > tk.migratedAt);
      if (i >= 0) {
        const xx = Math.round(xb(i) + bw / 2) + .5;
        ctx.strokeStyle = 'rgba(52,216,160,.5)'; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(xx, padT - 10); ctx.lineTo(xx, padT + plotH); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = COL.up; ctx.fillText('Migrated', xx > plotW - 70 ? xx - 56 : xx + 4, padT + 12);
      }
    }
    // graduation level while on the curve
    if (tk.stage === 'curve') {
      const gradMc = (BH.C.CURVE_V_SOL * BH.C.CURVE_V_TOKENS / Math.pow(BH.C.CURVE_V_TOKENS - BH.C.CURVE_REAL_TOKENS, 2)) * BH.C.TOTAL_SUPPLY * BH.C.SOL_USD;
      if (gradMc < Math.exp(0) * Infinity && (this.log ? Math.log(gradMc) : gradMc) < z) {
        const yy = Math.round(y(gradMc)) + .5;
        ctx.strokeStyle = 'rgba(244,178,62,.35)'; ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(plotW, yy); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = COL.brand; ctx.fillText('Graduation', 8, yy - 4);
      }
    }
    // volume + candles
    const vBase = H - padB;
    for (let i = 0; i < n; i++) {
      const b = bars[i], xx = xb(i);
      const up = b.c >= b.o;
      const col = up ? COL.up : COL.down;
      if (vmax > 0 && b.v > 0) {
        const vh = Math.max(1, b.v / vmax * (volH - 4));
        ctx.fillStyle = up ? 'rgba(52,216,160,.28)' : 'rgba(255,95,120,.28)';
        ctx.fillRect(xx, vBase - vh, bw, vh);
      }
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      const cx = Math.round(xx + bw / 2) + .5;
      ctx.beginPath(); ctx.moveTo(cx, Math.round(y(b.h))); ctx.lineTo(cx, Math.round(y(b.l)) + 1); ctx.stroke();
      const yo = y(b.o), yc = y(b.c);
      ctx.fillRect(xx, Math.min(yo, yc), bw, Math.max(1, Math.abs(yc - yo)));
      if (b.m) {
        const seen = new Set(b.m);
        let k = 0;
        for (const m of seen) {
          const isBuy = m === 'B';
          const yy = isBuy ? y(b.l) + 10 + k * 13 : y(b.h) - 10 - k * 13;
          ctx.fillStyle = m === 'B' ? COL.up : m === 'S' ? COL.brand : '#f07a3a';
          ctx.beginPath(); ctx.arc(cx, yy, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#0a0b0d'; ctx.font = '700 8px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(m === 'D' ? 'D' : m, cx, yy + .5);
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = '11px Inter';
          k++;
        }
      }
    }
    // last price tag
    const last = bars[bars.length - 1];
    const ly = y(last.c);
    const up = last.c >= bars[0].o;
    ctx.strokeStyle = up ? 'rgba(52,216,160,.6)' : 'rgba(255,95,120,.6)'; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(0, Math.round(ly) + .5); ctx.lineTo(plotW, Math.round(ly) + .5); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = up ? COL.up : COL.down;
    ctx.fillRect(plotW + 2, ly - 9, axisW - 4, 18);
    ctx.fillStyle = '#0a0b0d'; ctx.font = '700 11px Inter'; ctx.textBaseline = 'middle';
    ctx.fillText(BH.fmt.usd(last.c), plotW + 7, ly + .5);
    ctx.font = '11px Inter'; ctx.textBaseline = 'alphabetic';

    // crosshair
    let show = last;
    if (this.hover && this.hover.x < plotW) {
      const i = Math.max(0, Math.min(n - 1, Math.floor((this.hover.x - x0) / step)));
      show = bars[i];
      ctx.strokeStyle = 'rgba(164,170,180,.35)';
      ctx.beginPath(); ctx.moveTo(Math.round(xb(i) + bw / 2) + .5, padT); ctx.lineTo(Math.round(xb(i) + bw / 2) + .5, vBase); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, Math.round(this.hover.y) + .5); ctx.lineTo(plotW, Math.round(this.hover.y) + .5); ctx.stroke();
      const fv = a + (1 - (this.hover.y - padT) / plotH) * (z - a);
      const v = this.log ? Math.exp(fv) : fv;
      ctx.fillStyle = COL.text2; ctx.fillRect(plotW + 2, this.hover.y - 9, axisW - 4, 18);
      ctx.fillStyle = '#0a0b0d'; ctx.textBaseline = 'middle'; ctx.fillText(BH.fmt.usd(v), plotW + 7, this.hover.y + .5); ctx.textBaseline = 'alphabetic';
    }
    if (this.ohlc && show) {
      const ch = show.o ? (show.c / show.o - 1) * 100 : 0;
      this.ohlc.innerHTML = 'O <b>' + BH.fmt.usd(show.o) + '</b> H <b>' + BH.fmt.usd(show.h) + '</b> L <b>' + BH.fmt.usd(show.l) + '</b> C <b class="' + (ch >= 0 ? 'up' : 'down') + '">' + BH.fmt.usd(show.c) + '</b> <span>Vol <b>' + BH.fmt.sol(show.v) + '</b> SOL</span>';
    }
  };

  // static bonding curve picture for the launch page
  BH.drawCurve = function (cv, soldFrac) {
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const C = BH.C, k = C.CURVE_V_SOL * C.CURVE_V_TOKENS;
    const mcAt = (sold) => (k / Math.pow(C.CURVE_V_TOKENS - sold, 2)) * C.TOTAL_SUPPLY * C.SOL_USD;
    const max = mcAt(C.CURVE_REAL_TOKENS);
    const pl = 46, pb = 22, pt = 12, pw = W - pl - 24, ph = H - pb - pt;
    ctx.font = '11px Inter'; ctx.fillStyle = COL.text;
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4, yy = pt + ph - ph * i / 4;
      ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(pl, yy + .5); ctx.lineTo(W - 10, yy + .5); ctx.stroke();
      ctx.fillText(BH.fmt.usd(v), 2, yy + 4);
    }
    for (let i = 0; i <= 4; i++) ctx.fillText(Math.round(i * 25) + '%', pl + pw * i / 4 - 10, H - 5);
    const grad = ctx.createLinearGradient(pl, 0, pl + pw, 0);
    grad.addColorStop(0, '#c78a24'); grad.addColorStop(1, '#ffcf73');
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const s = C.CURVE_REAL_TOKENS * i / 100, xx = pl + pw * i / 100, yy = pt + ph - ph * mcAt(s) / max;
      if (!i) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.strokeStyle = grad; ctx.lineWidth = 2.5; ctx.stroke(); ctx.lineWidth = 1;
    ctx.lineTo(pl + pw, pt + ph); ctx.lineTo(pl, pt + ph); ctx.closePath();
    ctx.fillStyle = 'rgba(244,178,62,.07)'; ctx.fill();
    if (soldFrac != null) {
      const xx = pl + pw * soldFrac, yy = pt + ph - ph * mcAt(C.CURVE_REAL_TOKENS * soldFrac) / max;
      ctx.fillStyle = COL.brand; ctx.beginPath(); ctx.arc(xx, yy, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = COL.up; ctx.fillText('Graduation ≈ ' + BH.fmt.usd(max), pl + pw - 130, pt + 12);
  };

  BH.Chart = Chart;
})(window);
