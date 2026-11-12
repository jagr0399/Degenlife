/* Performance helpers.
   Saves: dead coins you don't hold are skipped, and coins you don't hold or watch keep only their recent trades, candles and
   bubbles in the file. This cut a long session's save from ~12-20 MB (0.35-0.6 s freeze) to a fraction. The live game
   keeps everything; only the file is trimmed. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const orig = BH.createGame;
  if (!orig || orig._perf) return;
  BH.createGame = function () {
    const game = orig.apply(this, arguments);
    const ser = game.serialize;
    game.serialize = function () {
      const sim = this.sim, keep = sim.keep || new Set(), held = new Set(this.player.pos.keys());
      for (const id of this.player.myCoins || []) held.add(id);
      const allT = sim.tokens, allMap = sim.byId, swaps = [];
      const live = allT.filter((t) => !t.dead || keep.has(t.id) || held.has(t.id));
      sim.tokens = live; sim.byId = new Map(live.map((t) => [t.id, t]));
      for (const t of live) {
        const vip = keep.has(t.id) || held.has(t.id) || t.isPlayer;
        const cut = (k, n) => { if (t[k] && t[k].length > n) { swaps.push([t, k, t[k]]); t[k] = t[k].slice(-n); } };
        cut('trades', vip ? 120 : 40);
        if (!vip) { cut('candles', 600); cut('bubbles', 300); if (t.mcHist) cut('mcHist', 40); }
        if (!vip && t.holders && t.holders.size > 60) {   // wallets that sold out are history; keep them only for the biggest traders
          const big = new Set(Array.from(t.holders.values()).sort((x, y) => (y.bought || 0) - (x.bought || 0)).slice(0, 30));
          const m = new Map(); for (const [k, h] of t.holders) if (h.tokens >= 1 || big.has(h) || h.addr === 'YOU') m.set(k, h);
          swaps.push([t, 'holders', t.holders]); t.holders = m;
          if (t.hl) { swaps.push([t, 'hl', t.hl]); t.hl = t.hl.filter((h) => m.has(h.addr)); }
        }
      }
      try { return ser.apply(this, arguments); }
      finally { sim.tokens = allT; sim.byId = allMap; for (const [t, k, v] of swaps) t[k] = v; }
    };
    return game;
  };
  BH.createGame._perf = true;
  // risk scans sort every holder; cache each coin's scan for one second of game time (Pulse asks for it on every card, every tick)
  if (BH.Sim && !BH.Sim.prototype._riskCached) {
    const risk = BH.Sim.prototype.risk;
    BH.Sim.prototype.risk = function (tk) {
      const c = tk._risk;
      if (c && this.t - c.t < 1 && c.n === tk.trades.length) return c.v;
      const v = risk.call(this, tk);
      Object.defineProperty(tk, '_risk', { value: { t: this.t, n: tk.trades.length, v }, writable: true, configurable: true, enumerable: false });
      return v;
    };
    BH.Sim.prototype._riskCached = true;
  }
})(typeof window !== 'undefined' ? window : globalThis);
