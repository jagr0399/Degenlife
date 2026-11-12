/* Whale and KOL agents, round 2 (Nov 12), from a study of real wallets.
   Four more agent types next to game/whales.js (conviction / swing / early):
     chaser   (momentum chaser): buys tops in 2-4 clips after a big run, capitulates in 3-5 slices at -40%
     scalper  (market-maker): big clips into bounces and breakouts, out fast at +12-20% or -15%, re-buys later
     rotator  (bag rotator): two equal clips into steady big coins, holds, then a TWAP dump in 2-3 huge clips
     sniper   (sniper farm): fixed 0.6 / 2.4 SOL into nearly every brand-new launch, takes 2-5x or cuts at -50%
   Clip size follows market cap (<$100K: 2-30 SOL · $100K-1M: 10-45 · $1-10M: 20-120 · $10M+: 30-800), often a "human"
   preset (2.4, 6, 10, 24, 50, 100...). How the market answers a whale (measured on Max and Shiqi):
     small caps (<$300K) FOLLOW a whale buy: a wave of follower buys over 5-120 s
     big caps (>$2M) FADE it: dip sellers sell most of it back within ~40 s (a tall upper wick)
     a whale SELL on a small cap pulls 2-4 copy-sellers with it
   These effects apply to the whales in game/whales.js too (it wraps Whales.prototype.trade). No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const W = BH.Whales; if (!W) return;
  const AGENTS = [
    ['brez.sol', 'chaser'], ['poor goat', 'chaser'], ['top tick tim', 'chaser'],
    ['rasmr.mm', 'scalper'], ['bounce bot', 'scalper'], ['wick hunter', 'scalper'],
    ['tjr rotations', 'rotator'], ['bag rotator', 'rotator'],
    ['chairman²', 'sniper'], ['launch farm', 'sniper'], ['0.6 sol sam', 'sniper'],
  ];
  const THESIS = {
    chaser: ['Everyone is talking about it. Getting in before it goes higher.', 'Momentum is insane, adding.', 'Breakout confirmed, size up.'],
    scalper: ['Bounce off the flush, quick scalp.', 'Breakout retest, in and out.', 'Liquidity grab, fading it.'],
    rotator: ['Rotating into strength.', 'Clean chart, parking size here.'],
    sniper: ['New launch, small bag.', 'Sniped.'],
  };
  const PRESETS = [2.4, 6, 10, 24, 50, 100, 150, 200, 300, 500];
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  // a clip sized for the coin's market cap, rounded to a preset half the time (the study's clips mix presets and odd sizes)
  function clipFor(mc, r) {
    const [lo, hi] = mc < 1e5 ? [2, 30] : mc < 1e6 ? [10, 45] : mc < 1e7 ? [20, 120] : [30, 800];
    let s = lo * Math.pow(hi / lo, r());
    if (r() < 0.5) { let best = PRESETS[0]; for (const p of PRESETS) if (Math.abs(p - s) < Math.abs(best - s)) best = p; s = best; }
    return s;
  }

  function Agents(game, saved) {
    this.game = game; this.list = []; this.queue = []; this.seenLaunch = 0;
    if (saved) Object.assign(this, saved, { game });
    const r = game.sim.r;
    if (!this.list.length) this.list = AGENTS.map(([name, style], i) => ({ id: 'ag' + i, name, style, addr: BH.Names.addr(r), pfp: 20 + i * 5, bank: style === 'sniper' ? 400 : style === 'rotator' ? 4000 : 1500, pos: {}, next: 0, pnl: 0, wins: 0, losses: 0, last: {} }));
  }
  Agents.clipFor = clipFor;
  const P = Agents.prototype;
  P.save = function () { return { list: this.list, queue: this.queue.slice(0, 200), seenLaunch: this.seenLaunch }; };
  P.trade = function (a, tk, side, amt, thesis) {
    const wh = this.game.sys.whales; if (!wh) return null;
    return W.prototype.trade.call(wh, a, tk, side, amt, thesis);   // same tagging as the named whales (bubble thesis, director keeps the move)
  };
  P.wants = function (a, tk) {
    const sim = this.game.sim, mc = sim.mc(tk), age = sim.t - tk.born;
    if (tk.dead || tk.rugged || tk.isPlayer || a.pos[tk.id]) return false;
    if (a.style === 'sniper') return age < 25 && tk.stage === 'curve' && mc < 6000;
    if (a.style === 'chaser') return mc > 4e5 && mc < 3e7 && sim.change(tk, 300) > 60;   // buys after the run, near the top
    if (a.style === 'scalper') { const back = a.last[tk.id]; if (back && sim.t - back < 600) return false; const ch5 = sim.change(tk, 300), ch1 = sim.change(tk, 60); return mc > 3e5 && mc < 4e7 && ((ch5 < -25 && ch1 > 3) || ch1 > 12); }
    if (a.style === 'rotator') return mc > 1e6 && mc < 4e7 && tk.stage === 'amm' && Math.abs(sim.change(tk, 300)) < 25 && sim.t - tk.born > 300;
    return false;
  };
  P.onStep = function () {
    const gm = this.game, sim = gm.sim, r = sim.r;
    this.runQueue();
    for (const a of this.list) {
      for (const id of Object.keys(a.pos)) {
        const p = a.pos[id], tk = sim.byId.get(id), h = tk && tk.holders.get(a.addr);
        if (!tk || !h || h.tokens < 1) { delete a.pos[id]; continue; }
        if (p.clips > 0 && sim.t >= p.nextClip) { p.clips--; p.nextClip = sim.t + r.range(3, 40); p.lb = sim.t; const f = this.trade(a, tk, 'buy', p.clip, pick(r, THESIS[a.style])); if (f) { p.cost += f.sol || p.clip; a.bank -= p.clip; } continue; }
        if (p.slices > 0) { if (sim.t >= p.nextSlice) { p.slices--; p.nextSlice = sim.t + r.range(8, 60); const frac = p.slices ? r.range(0.2, 0.4) : 1; this.sell(a, tk, h, p, frac, p.why); } continue; }
        const mult = sim.price(tk) / p.entry, held = sim.t - p.t;
        if (tk.rugged) { this.sell(a, tk, h, p, 1, 'Rugged. Out.'); continue; }
        if (p.lb && sim.t - p.lb < 12) continue;   // nobody sells seconds after adding (a real wallet doesn't flip its own clip)
        if (a.style === 'sniper') { if (held < 10) continue; if (mult >= p.tp || mult <= 0.5 || held > p.hold) this.sell(a, tk, h, p, 1, mult >= p.tp ? 'Took the snipe profit.' : 'Next.'); }
        else if (a.style === 'chaser') { if (held < 30) continue; if (mult <= 0.6) { p.slices = r.int(3, 5); p.nextSlice = sim.t; p.why = 'Capitulating. This one hurt.'; } else if (mult >= 1.5 && !p.half) { p.half = true; this.sell(a, tk, h, p, 0.5, 'Half off into strength.'); } else if (held > p.hold) this.sell(a, tk, h, p, 1, 'Moving on.'); }
        else if (a.style === 'scalper') { if (held < 20) continue; if (mult >= p.tp || mult <= 0.85 || held > p.hold) { a.last[id] = sim.t; this.sell(a, tk, h, p, 1, mult >= p.tp ? 'Scalp done.' : 'Stopped, waiting for the next bounce.'); } }
        else if (a.style === 'rotator') { if (held < 300) continue; if (held > p.hold || mult <= 0.7 || mult >= 2) { p.slices = r.int(2, 3); p.nextSlice = sim.t; p.why = 'Rotating out (TWAP).'; } }
      }
      if (sim.t < a.next) continue;
      a.next = sim.t + (a.style === 'sniper' ? r.range(4, 20) : a.style === 'scalper' ? r.range(30, 150) : r.range(90, 400));
      if (Object.keys(a.pos).length >= (a.style === 'sniper' ? 6 : 2)) continue;
      const cands = sim.tokens.filter((tk) => this.wants(a, tk)); if (!cands.length) continue;
      const tk = cands[Math.floor(r() * Math.min(4, cands.length))], mc = sim.mc(tk);
      let total = a.style === 'sniper' ? (r() < 0.7 ? 0.6 : 2.4) : clipFor(mc, r) * (a.style === 'rotator' ? 2 : r.range(1.2, 3));
      total = Math.min(total, a.bank * 0.4); if (total < 0.3) continue;
      const clips = a.style === 'sniper' ? 1 : a.style === 'rotator' ? 2 : r.int(2, 4);
      const clip = a.style === 'rotator' ? total / 2 : total / clips;
      const f = this.trade(a, tk, 'buy', clip, pick(r, THESIS[a.style])); if (!f) continue;
      a.bank -= clip;
      a.pos[tk.id] = { t: sim.t, entry: sim.price(tk), cost: clip, clips: clips - 1, clip, nextClip: sim.t + r.range(2, 40), slices: 0, tp: a.style === 'sniper' ? r.range(2, 5) : r.range(1.12, 1.2),
        hold: a.style === 'sniper' ? r.range(180, 600) : a.style === 'scalper' ? r.range(60, 600) : a.style === 'chaser' ? r.range(600, 1800) : r.range(1200, 5400) };
    }
  };
  P.sell = function (a, tk, h, p, frac, why) {
    const f = this.trade(a, tk, 'sell', h.tokens * frac, why);
    if (!f) return;
    a.bank += f.net || 0; const gain = (f.net || 0) - p.cost * frac; a.pnl += gain; p.cost *= 1 - frac;
    if (frac >= 1) { if (gain >= 0) a.wins++; else a.losses++; delete a.pos[tk.id]; }
  };
  // scheduled market answers to whale trades
  P.runQueue = function () {
    const sim = this.game.sim, r = sim.r;
    while (this.queue.length && this.queue[0].at <= sim.t) {
      const q = this.queue.shift(), tk = sim.byId.get(q.coin); if (!tk || tk.dead) continue;
      if (q.kind === 'follow') {   // a follower (copy-trader, alert bot) buys after the whale; the director keeps it
        const f = sim.exec(tk, BH.Names.addr(r), 'retail', 'buy', q.sol); if (f) { const t = tk.trades[tk.trades.length - 1]; if (t && t.side === 'buy') t.rw = 'follow'; }
      } else if (q.kind === 'fade') {   // dip sellers sell into the whale's spike; most of its push goes away
        let h = null; for (let i = 0; i < 12 && !h; i++) { const x = tk.hl[Math.floor(r() * tk.hl.length)]; if (x && x.tokens > 1 && x.addr !== 'YOU' && !x.rw && x.kind !== 'dev') h = x; }
        if (h) { const tok = Math.min(h.tokens, q.sol / Math.max(1e-12, sim.price(tk))); sim.exec(tk, h.addr, h.kind, 'sell', tok); }
        if (tk.dir) tk.dir.off = (tk.dir.off || 0) * 0.55;
      } else if (q.kind === 'cascade') {   // copy-sellers follow a whale out of a small coin; the director keeps the drop
        let h = null; for (let i = 0; i < 12 && !h; i++) { const x = tk.hl[Math.floor(r() * tk.hl.length)]; if (x && x.tokens > 1 && x.addr !== 'YOU' && !x.rw && x.kind !== 'dev') h = x; }
        if (h) { const f = sim.exec(tk, h.addr, h.kind, 'sell', h.tokens * r.range(0.5, 1)); if (f) { const t = tk.trades[tk.trades.length - 1]; if (t && t.side === 'sell') t.rw = 'follow'; } }
      }
    }
  };
  P.react = function (tk, side, sol) {
    const sim = this.game.sim, r = sim.r, mc = sim.mc(tk);
    if (side === 'buy' && mc < 3e5) {
      const n = Math.min(25, Math.round(sol * 1.2 * Math.pow(3e5 / Math.max(5000, mc), 0.3)));
      for (let i = 0; i < n; i++) this.queue.push({ at: sim.t + 5 + Math.pow(r(), 1.6) * 115, coin: tk.id, kind: 'follow', sol: Math.min(3, r.logn(0.25, 1.1)) });
    } else if (side === 'buy' && mc > 2e6) {
      const n = r.int(2, 5), tot = sol * r.range(0.6, 1.0);
      for (let i = 0; i < n; i++) this.queue.push({ at: sim.t + 3 + r() * 37, coin: tk.id, kind: 'fade', sol: tot / n });
    } else if (side === 'sell' && mc < 3e5) {
      const n = r.int(2, 4);
      for (let i = 0; i < n; i++) this.queue.push({ at: sim.t + 4 + r() * 60, coin: tk.id, kind: 'cascade' });
    }
    this.queue.sort((a, b) => a.at - b.at);
    if (this.queue.length > 400) this.queue.length = 400;
  };

  // every whale trade (old whales and new agents) gets the market's answer
  const orig = W.prototype.trade;
  W.prototype.trade = function (w, tk, side, amount, thesis) {
    const mc0 = this.game.sim.mc(tk), f = orig.call(this, w, tk, side, amount, thesis);
    const ag = this.game.sys.agents;
    if (f && ag && w.style !== 'sniper') ag.react(tk, side, side === 'buy' ? (f.sol || amount) : (f.sol || amount * this.game.sim.price(tk)), mc0);
    return f;
  };

  BH.Agents = Agents;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'agents', create(game, saved) { const a = new Agents(game, saved); a.hooks = { step: () => a.onStep() }; return a; } });
})(typeof window !== 'undefined' ? window : globalThis);
