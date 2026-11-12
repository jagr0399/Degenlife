/* Chart indicators. Each returns an array the same length as its input, null until warmed up. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};

  function ema(values, len) {
    const out = new Array(values.length).fill(null);
    if (values.length < len) return out;
    let s = 0;
    for (let i = 0; i < len; i++) s += values[i];
    let e = s / len;
    out[len - 1] = e;
    const k = 2 / (len + 1);
    for (let i = len; i < values.length; i++) { e = values[i] * k + e * (1 - k); out[i] = e; }
    return out;
  }

  // Wilder's RSI
  function rsi(values, len) {
    len = len || 14;
    const out = new Array(values.length).fill(null);
    if (values.length <= len) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= len; i++) { const d = values[i] - values[i - 1]; if (d > 0) gain += d; else loss -= d; }
    gain /= len; loss /= len;
    const val = () => (loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss));
    out[len] = val();
    for (let i = len + 1; i < values.length; i++) {
      const d = values[i] - values[i - 1];
      gain = (gain * (len - 1) + Math.max(d, 0)) / len;
      loss = (loss * (len - 1) + Math.max(-d, 0)) / len;
      out[i] = val();
    }
    return out;
  }

  // running VWAP of the typical price over the series
  function vwap(bars) {
    const out = new Array(bars.length);
    let pv = 0, vv = 0;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i], tp = (b.h + b.l + b.c) / 3;
      pv += tp * b.v; vv += b.v;
      out[i] = vv > 0 ? pv / vv : (i ? out[i - 1] : tp);
    }
    return out;
  }

  BH.Ind = { ema, rsi, vwap };
})(typeof window !== 'undefined' ? window : globalThis);
