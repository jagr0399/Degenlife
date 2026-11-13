/* Viewers: how many "people" are looking at each coin right now (the eye count on Pulse, the token header and the chart).
   It follows the market cap, hype, how hot the coin's narrative is, fresh buys, frenzies and KOL attention, and it drifts
   (people come and go). The chart director reads it back: a coin with more eyes on it trades faster.
   tk.views = whole people; tk.viewsBoost = the activity multiplier the director uses (1 = normal). */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  function Views(game) { this.game = game; this.acc = 0; }
  const P = Views.prototype;
  P.save = function () { return {}; };
  // what the crowd would settle at for this coin
  P.target = function (tk) {
    const sim = this.game.sim, mc = Math.max(1, sim.mc(tk)), soc = this.game.sys && this.game.sys.social;
    const heat = soc && tk.narrative && soc.heat ? (soc.heat[tk.narrative] || 25) : 25;
    let buySol = 0;   // fresh buys pull people in (the last 10 seconds)
    for (let q = tk.trades.length - 1; q >= 0 && tk.trades[q].t > sim.t - 10; q--) if (tk.trades[q].side === 'buy') buySol += tk.trades[q].sol || 0;
    let v = 4 + 55 * Math.sqrt(mc / 10000);                 // $10K ~ 60, $100K ~ 180, $1M ~ 550, $10M ~ 1,700
    v *= 0.55 + Math.min(3, tk.hype || 0) * 0.45;            // hype
    v *= 0.5 + heat / 50;                                    // a hot narrative draws a crowd (heat 25 = 1x, 75 = 2x)
    v += Math.min(600, buySol * 18);                         // buys
    if (tk.dir && tk.dir.fzUntil > sim.t) v *= 2.4;          // a frenzy
    if (tk.calls && tk.calls.length) { const fresh = tk.calls.filter((c) => sim.t - c.t < 120).length; v *= 1 + Math.min(1.5, fresh * 0.35); }   // KOL calls
    if (tk.rugged || tk.dead) v *= 0.08;
    return v;
  };
  P.onStep = function (dt) {
    this.acc += dt; if (this.acc < 1) return;
    const step = this.acc; this.acc = 0;
    const sim = this.game.sim, r = sim.r;
    for (const tk of sim.tokens) {
      if (tk.dead) { tk.views = 0; tk.viewsBoost = 0.3; continue; }
      const t = this.target(tk);
      const v = tk.viewsF != null ? tk.viewsF : t * 0.6;
      // people arrive fast and leave slowly, plus a little churn
      const k = t > v ? 0.25 : 0.06;
      tk.viewsF = Math.max(0, v + (t - v) * Math.min(1, k * step) + r.normal() * Math.sqrt(v + 1) * 0.35);
      tk.views = Math.max(tk.dead ? 0 : 1, Math.round(tk.viewsF));
      // the activity multiplier: ~1 at the usual crowd for its size, up to 3x when far more eyes than usual are on it
      const usual = 4 + 55 * Math.sqrt(Math.max(1, sim.mc(tk)) / 10000);
      tk.viewsBoost = Math.max(0.5, Math.min(3, Math.pow(tk.viewsF / Math.max(1, usual), 0.6)));
    }
  };
  BH.Views = Views;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'views', create(game, saved) { const v = new Views(game, saved); v.hooks = { step: (dt) => v.onStep(dt) }; return v; } });
})(typeof window !== 'undefined' ? window : globalThis);
