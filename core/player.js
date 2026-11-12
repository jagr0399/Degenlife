/* The player's fake wallet: SOL balance, bags, fills, run stats and score. */
(function (g) {
  'use strict';
  const BH = g.BH;
  const C = BH.C;

  function Player(sim, opts) {
    opts = opts || {};
    this.sim = sim;
    sim.player = this;
    this.sol = opts.startSol || C.START_SOL;
    this.startSol = this.sol;
    this.pos = new Map();      // tokenId -> position
    this.closed = [];          // closed positions
    this.activity = [];        // fills, failures, fees
    this.notices = [];         // things the UI should toast
    this.myCoins = [];         // token ids the player launched
    this.st = { trades: 0, buys: 0, sells: 0, failed: 0, vol: 0, fees: 0, wins: 0, losses: 0, rugs: 0, creatorFees: 0, kolSpend: 0, peak: this.sol, maxDD: 0, best: null, worst: null };
  }
  const P = Player.prototype;

  P.position = function (id) { return this.pos.get(id); };
  P.markValue = function (p) {
    const tk = this.sim.byId.get(p.id);
    if (!tk) return 0;
    return p.tokens * this.sim.price(tk);
  };
  P.exitValue = function (p) {
    const tk = this.sim.byId.get(p.id);
    if (!tk || tk.dead || p.tokens < 1) return 0;
    const q = this.sim.quote(tk, 'sell', p.tokens);
    return q ? q.out : 0;
  };
  P.netWorth = function () {
    let v = this.sol;
    for (const p of this.pos.values()) v += this.markValue(p);
    return v;
  };
  P.openCount = function () { let n = 0; for (const p of this.pos.values()) if (p.tokens >= 1) n++; return n; };

  P.log = function (a) {
    a.t = this.sim.t;
    this.activity.unshift(a);
    if (this.activity.length > 200) this.activity.length = 200;
  };
  P.notify = function (kind, text, extra) { this.notices.push(Object.assign({ kind, text }, extra || {})); };

  // ---- orders -----------------------------------------------------------------------
  P.buy = function (tokenId, sol, s) {
    s = s || {};
    const prio = s.priority != null ? s.priority : C.DEFAULT_PRIORITY;
    sol = Math.round(sol * 1e6) / 1e6;
    if (!(sol > 0)) return { ok: false, reason: 'Enter an amount' };
    if (sol + prio + C.BASE_TX_FEE > this.sol + 1e-9) return { ok: false, reason: 'Not enough SOL' };
    return this.sim.submit({ tokenId, side: 'buy', delay: this.extraDelay || 0, amount: sol, slippage: s.slippage != null ? s.slippage : C.DEFAULT_SLIPPAGE, priority: prio });
  };
  P.sell = function (tokenId, frac, s) {
    s = s || {};
    const p = this.pos.get(tokenId);
    if (!p || p.tokens < 1) return { ok: false, reason: 'You hold none' };
    const prio = s.priority != null ? s.priority : C.DEFAULT_PRIORITY;
    if (prio + C.BASE_TX_FEE > this.sol + 1e-9) return { ok: false, reason: 'Not enough SOL for fees' };
    const amt = frac >= 0.999 ? p.tokens : p.tokens * frac;
    return this.sim.submit({ tokenId, side: 'sell', delay: this.extraDelay || 0, amount: amt, frac, slippage: s.slippage != null ? s.slippage : C.DEFAULT_SLIPPAGE, priority: prio });
  };

  // called by the sim when the order's block comes around
  P.land = function (o) {
    const sim = this.sim;
    const tk = sim.byId.get(o.tokenId);
    const txFee = o.priority + C.BASE_TX_FEE;
    const fail = (why) => {
      this.sol -= Math.min(this.sol, txFee);
      this.st.failed++; this.st.fees += txFee;
      this.log({ type: 'fail', side: o.side, ticker: tk ? tk.ticker : '?', id: o.tokenId, why, fee: txFee });
      this.notify('fail', 'Tx failed: ' + why, { id: o.tokenId });
      return { ok: false, why, order: o };
    };
    if (!tk || tk.dead) return fail('token is gone');
    if (o.side === 'buy') {
      if (o.amount + txFee > this.sol + 1e-9) return fail('not enough SOL');
      const q = sim.quote(tk, 'buy', o.amount);
      if (!q || q.avg > o.quote.avg * (1 + o.slippage)) return fail('slippage exceeded (' + BH.fmt.pct((q.avg / o.quote.avg - 1) * 100) + ')');
      const f = sim.exec(tk, 'YOU', 'you', 'buy', o.amount);
      if (!f) return fail('no fill');
      this.sol -= f.sol + txFee;
      let p = this.pos.get(tk.id);
      if (!p || p.tokens < 1) {
        p = { id: tk.id, ticker: tk.ticker, name: tk.name, hue: tk.hue, seed: tk.seed, tokens: 0, cost: 0, invested: 0, realized: 0, first: sim.t, peak: 1, rugSeen: false, mine: tk.isPlayer };
        this.pos.set(tk.id, p);
      }
      p.tokens += f.tok; p.cost += f.sol + txFee; p.invested += f.sol + txFee;
      sim.keep.add(tk.id);
      this.st.trades++; this.st.buys++; this.st.vol += f.sol; this.st.fees += f.fee + txFee;
      this.log({ type: 'buy', ticker: tk.ticker, id: tk.id, sol: f.sol, tok: f.tok, mc: f.mc, fee: f.fee + txFee });
      this.notify('buy', 'Bought ' + BH.fmt.num(f.tok) + ' $' + tk.ticker + ' for ' + BH.fmt.sol(f.sol) + ' SOL', { id: tk.id });
      return { ok: true, fill: f, order: o };
    }
    const p = this.pos.get(tk.id);
    if (!p || p.tokens < 1) return fail('you hold none');
    if (txFee > this.sol + 1e-9) return fail('not enough SOL for fees');
    const amt = o.frac >= 0.999 ? p.tokens : Math.min(o.amount, p.tokens);
    const q = sim.quote(tk, 'sell', amt);
    const expect = o.quote.out * (amt / o.amount);
    if (!q || q.out < expect * (1 - o.slippage)) return fail('slippage exceeded (' + BH.fmt.pct((q ? q.out / expect - 1 : -1) * 100) + ')');
    const f = sim.exec(tk, 'YOU', 'you', 'sell', amt);
    if (!f) return fail('no fill');
    const frac = Math.min(1, f.tok / p.tokens);
    const basis = p.cost * frac;
    const gain = f.net - txFee - basis;
    this.sol += f.net - txFee;
    p.tokens -= f.tok; p.cost -= basis; p.realized += gain;
    if (p.tokens < 1) p.tokens = 0;
    this.st.trades++; this.st.sells++; this.st.vol += f.sol; this.st.fees += f.fee + txFee;
    this.log({ type: 'sell', ticker: tk.ticker, id: tk.id, sol: f.net, tok: f.tok, mc: f.mc, pnl: gain, fee: f.fee + txFee });
    this.notify('sell', 'Sold ' + BH.fmt.num(f.tok) + ' $' + tk.ticker + ' for ' + BH.fmt.sol(f.net) + ' SOL (' + BH.fmt.signedSol(gain) + ')', { id: tk.id, pnl: gain });
    if (p.tokens === 0) this.close(p, tk);
    return { ok: true, fill: f, order: o };
  };

  P.close = function (p, tk) {
    const pnl = p.realized;
    const rec = { id: p.id, ticker: p.ticker, name: p.name, pnl, invested: p.invested, mult: p.invested > 0 ? (p.invested + pnl) / p.invested : 0, held: this.sim.t - p.first, at: this.sim.t, rugged: !!(tk && tk.rugged), mine: p.mine };
    this.closed.unshift(rec);
    if (pnl >= 0) this.st.wins++; else this.st.losses++;
    if (!this.st.best || pnl > this.st.best.pnl) this.st.best = rec;
    if (!this.st.worst || pnl < this.st.worst.pnl) this.st.worst = rec;
    this.pos.delete(p.id);
    if (!p.mine) this.sim.keep.delete(p.id);
  };

  P.creatorFee = function (tk, sol) { this.sol += sol; this.st.creatorFees += sol; };

  // ---- launching your own coin ----------------------------------------------------------
  P.launchCoin = function (spec) {
    const devBuy = Math.max(0, +spec.devBuy || 0);
    const cost = devBuy + C.BASE_TX_FEE + 0.02; // ~0.02 SOL rent/network to create
    if (cost > this.sol) return { ok: false, reason: 'Not enough SOL' };
    const tk = this.sim.launch(spec);   // spec: name, ticker, desc, hue, socials, devBuy, lp, img, rewards, pair
    this.sol -= C.BASE_TX_FEE + 0.02; this.st.fees += C.BASE_TX_FEE + 0.02;
    this.myCoins.push(tk.id);
    this.sim.keep.add(tk.id);
    if (devBuy > 0) {
      const f = this.sim.exec(tk, 'YOU', 'dev', 'buy', devBuy);
      this.sol -= f.sol;
      const p = { id: tk.id, ticker: tk.ticker, name: tk.name, hue: tk.hue, seed: tk.seed, tokens: f.tok, cost: f.sol, invested: f.sol, realized: 0, first: this.sim.t, peak: 1, rugSeen: false, mine: true };
      this.pos.set(tk.id, p);
      this.st.vol += f.sol; this.st.fees += f.fee; this.st.trades++; this.st.buys++;
      this.log({ type: 'buy', ticker: tk.ticker, id: tk.id, sol: f.sol, tok: f.tok, mc: f.mc, fee: f.fee, dev: true });
    }
    this.log({ type: 'launch', ticker: tk.ticker, id: tk.id, sol: devBuy });
    return { ok: true, token: tk };
  };
  P.hireKol = function (tokenId, tier) {
    const tk = this.sim.byId.get(tokenId);
    const cost = C.KOL_HIRE_COST[tier];
    if (!tk || tk.dead) return { ok: false, reason: 'Coin is gone' };
    if (cost > this.sol) return { ok: false, reason: 'Not enough SOL' };
    this.sol -= cost; this.st.kolSpend += cost;
    const handle = this.sim.hireKol(tk, tier);
    this.log({ type: 'kol', ticker: tk.ticker, id: tk.id, sol: cost, kol: handle });
    return { ok: true, handle };
  };

  // ---- per tick bookkeeping (rugs on your bags, drawdown) ----------------------------------
  P.tick = function () {
    // the player's own sells on their coin count as a dev sell
    for (const id of this.myCoins) {
      const tk = this.sim.byId.get(id);
      if (!tk || tk.devSoldSeen) continue;
      const h = tk.holders.get('YOU');
      if (tk.stage === 'curve' && h && h.sold > 0 && h.tokens < 1 && h.bought > 0) {
        tk.devSoldSeen = true; tk.devSold = true; tk.hype *= 0.35;
        this.sim.event('devsold', tk, 'Dev (you) sold everything on $' + tk.ticker, { you: true });
      }
    }
    for (const p of this.pos.values()) {
      const tk = this.sim.byId.get(p.id);
      if (!tk) continue;
      if (p.cost > 0) p.peak = Math.max(p.peak, this.markValue(p) / p.cost);
      if (tk.rugged && !p.rugSeen && p.tokens >= 1) {
        p.rugSeen = true; this.st.rugs++;
        this.notify('rug', '$' + tk.ticker + ' rugged while you held it', { id: tk.id });
      }
      if (tk.dead && p.tokens >= 1) { // dead coin: the bag is worth nothing now
        p.realized -= p.cost; p.cost = 0; p.tokens = 0;
        this.notify('rug', '$' + tk.ticker + ' died. Bag written off.', { id: tk.id });
        this.close(p, tk);
      }
    }
    const nw = this.netWorth();
    if (nw > this.st.peak) this.st.peak = nw;
    const dd = this.st.peak > 0 ? 1 - nw / this.st.peak : 0;
    if (dd > this.st.maxDD) this.st.maxDD = dd;
  };

  // ---- score -----------------------------------------------------------------------------------
  P.summary = function () {
    let exit = this.sol;
    for (const p of this.pos.values()) exit += this.exitValue(p);
    const pnl = exit - this.startSol;
    const closed = this.st.wins + this.st.losses;
    return {
      net: exit, pnl, mult: exit / this.startSol,
      score: Math.max(0, Math.round(exit * 1000 + Math.max(0, pnl) * 250 + this.st.creatorFees * 300)),
      winRate: closed ? this.st.wins / closed : 0,
      closed, ...this.st,
    };
  };
  P.rank = function (mult) {
    if (mult >= 20) return 'Cabal Member';
    if (mult >= 8) return 'Trench Legend';
    if (mult >= 3) return 'Certified Degen';
    if (mult >= 1.5) return 'Profitable (rare)';
    if (mult >= 1) return 'Break-even Survivor';
    if (mult >= 0.5) return 'Exit Liquidity';
    if (mult >= 0.1) return 'Bagholder';
    return 'Fully Rekt';
  };

  BH.Player = Player;
})(typeof window !== 'undefined' ? window : globalThis);
