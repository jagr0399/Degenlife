/* Named whales with real habits (playtest feedback: a whale buys 50-150 SOL into a coin and holds; it doesn't buy and sell
   in the same breath). About 20 persistent wallets, each with a style, a bankroll and its own positions:
   - conviction: 20-150 SOL in 1-4 clips into coins already worth $200K+ with momentum, holds 15-120 game minutes,
     trims a third at 3x and 5x, gives up at -60% or a rug
   - swing: 5-40 SOL on movers, out in 2-15 minutes at 1.6-2.5x or -35%
   - early: 3-15 SOL into hot new launches in the first minute, half off at 2x, the rest at 4x or -50%
   Their buys move the price and the chart director keeps that move (it fades slowly) instead of selling it straight back.
   Every whale trade carries a short thesis that shows on its chart bubble. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const NAMES = [
    ['Ansel Cap', 'conviction'], ['raz.sol', 'conviction'], ['Orca Fund', 'conviction'], ['bluechip benji', 'conviction'], ['The Patient One', 'conviction'], ['Kaiju Capital', 'conviction'],
    ['frank.sol', 'swing'], ['momentum mia', 'swing'], ['tide trader', 'swing'], ['0xgrim', 'swing'], ['vega swings', 'swing'], ['dip buyer dan', 'swing'], ['latecomer lou', 'swing'],
    ['first block fin', 'early'], ['snipe queen', 'early'], ['launch lurker', 'early'], ['zero sec', 'early'], ['curve hunter', 'early'], ['tiny whale tom', 'early'], ['gm capital', 'early'],
  ];
  const THESIS = {
    conviction: ['Strong community, holders keep climbing. Sizing in and holding.', 'CTO forming, dev wallet tiny, chart reclaimed the breakout. Long hold.', 'This is the narrative of the week. Bought a starter, adding on dips.', 'Volume is organic, top 10 is spread out. Holding for a 5x.', 'Clean migration, LP burned, no bundles. Patient bag.'],
    swing: ['Breaking out on volume, quick trade.', 'Bounce off the dip, taking a swing.', 'Momentum is real for the next few minutes. In and out.', 'Range reclaim, scalping to the top of the range.'],
    early: ['Hot narrative, clean dev, aping the first minute.', 'Fresh launch, real socials, small early bag.', 'First block entry, taking profit fast.'],
  };
  const EXIT = { conviction: ['Trimming a third into strength.', 'Took profit, still holding the rest.', 'Thesis broke. Out.'], swing: ['Target hit, out.', 'Stopped out, next.'], early: ['Half off at 2x.', 'Rest off. GG.', 'Didn\'t work, cut it.'] };

  function Whales(game, saved) {
    this.game = game; this.list = []; this.stats = { buys: 0, sells: 0 };
    if (saved) Object.assign(this, saved, { game });
    else {
      const r = game.sim.r;
      this.list = NAMES.map(([name, style], i) => ({
        id: 'wh' + i, name, style, addr: BH.Names.addr(r), pfp: 60 + i * 3,
        bank: style === 'conviction' ? r.range(800, 5000) : style === 'swing' ? r.range(200, 1200) : r.range(60, 400),
        pos: {}, pnl: 0, wins: 0, losses: 0, next: r.range(20, 240),
      }));
    }
  }
  const P = Whales.prototype;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  P.byAddr = function (addr) { return this.list.find((w) => w.addr === addr) || null; };
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // a whale trade: tagged so the director keeps the move, and the bubble gets the thesis
  P.trade = function (w, tk, side, amount, thesis) {
    const sim = this.game.sim;
    tk._nextThesis = thesis; tk._nextWhale = w.id;
    const f = sim.exec(tk, w.addr, 'whale', side, amount);
    tk._nextThesis = null; tk._nextWhale = null;
    if (f) { const hh = tk.holders.get(w.addr); if (hh) hh.rw = w.style; for (let q = tk.trades.length - 1; q >= 0 && q >= tk.trades.length - 6; q--) if (tk.trades[q].addr === w.addr) { tk.trades[q].rw = w.style; break; } this.stats[side === 'buy' ? 'buys' : 'sells']++; }
    return f;
  };

  P.wants = function (w, tk) {
    const sim = this.game.sim, mc = sim.mc(tk), age = sim.t - tk.born;
    if (tk.dead || tk.rugged || tk.isPlayer || w.pos[tk.id]) return false;
    const ch = sim.change(tk, 60);
    if (w.style === 'conviction') return mc > 200000 && mc < 3e7 && tk.stage === 'amm' && ch > 15 && (sim.risk(tk).top10 < 35);
    if (w.style === 'swing') return mc > 40000 && mc < 1e7 && ch > 25;
    return age < 60 && tk.stage === 'curve' && mc < 15000 && tk.socials && (tk.socials.x || tk.socials.tg) && sim.risk(tk).bundle < 15;
  };

  P.onStep = function () {
    const sim = this.game.sim, r = sim.r;
    for (const w of this.list) {
      // manage open positions
      for (const id of Object.keys(w.pos)) {
        const p = w.pos[id], tk = sim.byId.get(id);
        const h = tk && tk.holders.get(w.addr);
        if (!tk || !h || h.tokens < 1) { delete w.pos[id]; continue; }
        // conviction whales add their remaining clips over the first minutes
        if (p.clips > 0 && sim.t >= p.nextClip) { p.clips--; p.nextClip = sim.t + r.range(10, 60); p.lb = sim.t; this.trade(w, tk, 'buy', p.clip, pick(r, THESIS[w.style])); continue; }
        const mult = sim.price(tk) / p.entry, held = sim.t - p.t;
        // real whales don't flip: swing whales sit at least 45 s, conviction whales 5 minutes (unless it rugs)
        if (!tk.rugged && !tk.dead && held < (w.style === 'conviction' ? 300 : w.style === 'swing' ? 45 : 0)) continue;
        if (!tk.rugged && !tk.dead && p.lb && sim.t - p.lb < 15) continue;   // never sells right after adding a clip
        let frac = 0, why = '';
        if (tk.rugged || tk.dead) { frac = 1; why = EXIT[w.style][w.style === 'early' ? 2 : w.style === 'swing' ? 1 : 2]; }
        else if (w.style === 'conviction') {
          if (mult >= 5 && !p.t5) { p.t5 = true; frac = 0.35; why = EXIT.conviction[0]; }
          else if (mult >= 3 && !p.t3) { p.t3 = true; frac = 0.33; why = EXIT.conviction[0]; }
          else if (mult <= 0.4) { frac = 1; why = EXIT.conviction[2]; }
          else if (held > p.hold) { frac = 1; why = EXIT.conviction[1]; }
        } else if (w.style === 'swing') {
          if (mult >= p.tp) { frac = 1; why = EXIT.swing[0]; } else if (mult <= 0.65 || held > p.hold) { frac = 1; why = EXIT.swing[1]; }
        } else if (held >= 10) {   // even a sniper's bot waits a few seconds for the buy to settle (10 s: real-tape chop would stop it out instantly)
          if (mult >= 2 && !p.half) { p.half = true; frac = 0.5; why = EXIT.early[0]; } else if (mult >= 4) { frac = 1; why = EXIT.early[1]; } else if (mult <= 0.5 || held > p.hold) { frac = 1; why = EXIT.early[2]; }
        }
        if (frac > 0) {
          const f = this.trade(w, tk, 'sell', h.tokens * frac, why);
          if (f) { w.bank += f.net; const gain = f.net - p.cost * frac; w.pnl += gain; p.cost *= 1 - frac; if (frac >= 1) { if (gain >= 0) w.wins++; else w.losses++; delete w.pos[id]; } }
        }
      }
      // find something new now and then
      if (sim.t < w.next) continue;
      w.next = sim.t + (w.style === 'conviction' ? r.range(120, 600) : w.style === 'swing' ? r.range(40, 200) : r.range(15, 90));
      if (Object.keys(w.pos).length >= (w.style === 'conviction' ? 2 : 3)) continue;
      const cands = sim.tokens.filter((tk) => this.wants(w, tk));
      if (!cands.length) continue;
      const tk = cands.sort((a, b) => sim.vol5m(b) - sim.vol5m(a))[Math.floor(r() * Math.min(3, cands.length))];
      const total = w.style === 'conviction' ? Math.min(w.bank * 0.25, r.range(20, 150)) : w.style === 'swing' ? Math.min(w.bank * 0.2, r.range(5, 40)) : Math.min(w.bank * 0.15, r.range(3, 15));
      if (total < 1) continue;
      const clips = w.style === 'conviction' ? r.int(1, 4) : 1, clip = total / clips;
      const f = this.trade(w, tk, 'buy', clip, pick(r, THESIS[w.style]));
      if (!f) continue;
      w.bank -= total;
      w.pos[tk.id] = { t: sim.t, entry: sim.price(tk), cost: total, clips: clips - 1, clip, nextClip: sim.t + r.range(10, 60),
        hold: w.style === 'conviction' ? r.range(900, 7200) : w.style === 'swing' ? r.range(120, 900) : r.range(60, 400), tp: r.range(1.6, 2.5) };
      if (w.style === 'conviction' && this.game.sys.social && r() < 0.5) this.game.sys.social.post({ id: w.id, name: w.name, handle: w.name.replace(/\s/g, '').toLowerCase(), pfp: w.pfp, followers: r.int(20000, 140000), verified: true }, 'call', 'Bought $' + tk.ticker + '. ' + pick(r, THESIS.conviction), { coin: tk.id, mcAt: sim.mc(tk) });
    }
  };

  BH.Whales = Whales;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'whales', create(game, saved) { const w = new Whales(game, saved); w.hooks = { step: () => w.onStep() }; return w; } });
})(typeof window !== 'undefined' ? window : globalThis);
