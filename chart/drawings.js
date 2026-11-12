/* Chart drawings per coin (horizontal line, trend line, ray, rectangle, fib retracement, text note).
   Stored in a plain object { coinId: [drawing] } that lives in the game save (game.drawings).
   A point is { i: bar index, p: price, t?: bar time } — t keeps drawings in place across timeframes. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const TOL = 6;
  const FIB = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  let seq = 0;

  function distSeg(px, py, ax, ay, bx, by, ray) {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
    t = ray ? Math.max(0, t) : Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function Drawings(store) { this.store = store || {}; }
  const P = Drawings.prototype;
  P.forCoin = function (coin) { return this.store[coin] || (this.store[coin] = []); };
  P.add = function (coin, kind, points, extra) {
    const d = Object.assign({ id: 'd' + Date.now().toString(36) + (++seq), coin, kind, points: points.map((p) => Object.assign({}, p)) }, extra || {});
    this.forCoin(coin).push(d);
    return d.id;
  };
  P.get = function (id) {
    for (const k of Object.keys(this.store)) { const d = this.store[k].find((x) => x.id === id); if (d) return d; }
    return null;
  };
  P.remove = function (id) {
    for (const k of Object.keys(this.store)) { const i = this.store[k].findIndex((x) => x.id === id); if (i >= 0) { this.store[k].splice(i, 1); return true; } }
    return false;
  };
  P.move = function (id, dI, dP, dT) {
    const d = this.get(id); if (!d) return;
    for (const p of d.points) { p.i += dI; p.p += dP; if (p.t != null && dT) p.t += dT; }
  };
  // screen-space geometry of a drawing, shared by hit testing and the renderer
  P.shape = function (d, m) {
    const pts = d.points.map((p) => ({ x: m.xOfIndex(p.i), y: m.yOfPrice(p.p) }));
    return pts;
  };
  P.hitTest = function (coin, x, y, m) {
    const list = this.forCoin(coin);
    for (let k = list.length - 1; k >= 0; k--) {
      const d = list[k], s = this.shape(d, m);
      let hit = false;
      if (d.kind === 'hline') hit = Math.abs(y - s[0].y) <= TOL;
      else if (d.kind === 'trend') hit = distSeg(x, y, s[0].x, s[0].y, s[1].x, s[1].y, false) <= TOL;
      else if (d.kind === 'ray') hit = distSeg(x, y, s[0].x, s[0].y, s[1].x, s[1].y, true) <= TOL;
      else if (d.kind === 'rect') {
        const x0 = Math.min(s[0].x, s[1].x) - TOL, x1 = Math.max(s[0].x, s[1].x) + TOL, y0 = Math.min(s[0].y, s[1].y) - TOL, y1 = Math.max(s[0].y, s[1].y) + TOL;
        hit = x >= x0 && x <= x1 && y >= y0 && y <= y1;
      } else if (d.kind === 'fib') {
        const x0 = Math.min(s[0].x, s[1].x), x1 = Math.max(s[0].x, s[1].x) + 60;
        if (x >= x0 - TOL && x <= x1) hit = FIB.some((f) => Math.abs(y - m.yOfPrice(d.points[0].p + (d.points[1].p - d.points[0].p) * (1 - f))) <= TOL);
      } else if (d.kind === 'text') hit = x >= s[0].x - 4 && x <= s[0].x + 8 + 7 * String(d.text || '').length && y >= s[0].y - 16 && y <= s[0].y + 6;
      if (hit) return d.id;
    }
    return null;
  };
  Drawings.FIB = FIB;
  Drawings.distSeg = distSeg;
  BH.Drawings = Drawings;
})(typeof window !== 'undefined' ? window : globalThis);
