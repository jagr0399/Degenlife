/* number formatting shared by the sim and the UI */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const abbr = (n, d) => {
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(d) + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(d) + 'M';
    if (a >= 1e3) return (n / 1e3).toFixed(d) + 'K';
    return n.toFixed(a >= 100 ? 0 : d);
  };
  BH.fmt = {
    usd(n) { return (n < 0 ? '-$' : '$') + abbr(Math.abs(n), Math.abs(n) >= 1e6 ? 2 : 1); },
    num(n) { return abbr(n, 1); },
    sol(n, d) {
      if (d == null) d = Math.abs(n) >= 100 ? 1 : Math.abs(n) >= 1 ? 2 : Math.abs(n) >= 0.01 ? 3 : 4;
      return n.toFixed(d);
    },
    signedSol(n) { return (n >= 0 ? '+' : '-') + BH.fmt.sol(Math.abs(n)); },
    pct(n, d) { if (!isFinite(n)) return '—'; d = d == null ? (Math.abs(n) >= 100 ? 0 : 1) : d; return (n >= 0 ? '+' : '') + n.toFixed(d) + '%'; },
    pctPlain(n) { return (n >= 10 ? n.toFixed(0) : n.toFixed(1)) + '%'; },
    age(s) {
      s = Math.max(0, Math.floor(s));
      if (s < 60) return s + 's';
      if (s < 3600) return Math.floor(s / 60) + 'm';
      return Math.floor(s / 3600) + 'h';
    },
    clock(s) { s = Math.floor(s); const m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; },
    // tiny prices like 0.0₅41 (subscript zero count), the way terminals show them
    price(p) {
      if (!(p > 0)) return '0';
      if (p >= 0.01) return p.toFixed(4);
      const e = Math.floor(-Math.log10(p));
      const digits = (p * Math.pow(10, e + 3)).toFixed(0);
      const sub = String(e - 1).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[+d]).join('');
      return '0.0' + sub + digits;
    },
    short(a) { return a === 'YOU' ? 'You' : a.slice(0, 4) + '…' + a.slice(-4); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
