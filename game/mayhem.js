/* Mayhem coins (pump.fun's Mayhem Mode, studied Nov 16, 2026). See docs/research/mayhem-mode.md.
   How the real thing works (pump.fun docs, Bitquery's study of 9M launches, and live Mayhem coins we pulled on-chain):
   - Chosen at creation, Pump curve only. The Mayhem agent (one public wallet, "BUPA") gets 1B extra tokens (2B supply) and trades
     the coin in a random walk: buys and sells with about equal odds, sells a bit bigger. Unsold tokens are burned after 24 h.
   - Its trades are TINY (0.003-0.07 SOL) but move the price a lot: a tiny buy +17%, a sell -35%. It sells its extra minted tokens,
     so it takes out almost no SOL while the price falls, often far BELOW the normal launch floor (live GRRR: $2.0K -> $156 in 38 s;
     BTC: $2.0K -> $2.8K -> $113 in 91 s). Finished Mayhem curves sit at ~28% of the launch price (median).
   - It stays briefly: median 39 s; 61% of coins done within a minute, 31% 1-5 min, 7% 5-60 min, ~1% longer. Never in block 0.
   - Few humans: only a handful of wallets (mostly bots trading against it, sandwich bots took ~6% of outside SOL).
     Outside buyers put in ~4x less SOL than on normal coins. Still trading on day two: about the same as normal coins (~3.6%).
   - ~20-30% of all launches used Mayhem in 2026. The agent lost ~39K SOL overall; outside wallets lost ~61K SOL in week one.
   In the game: ~30% of Pump launches are Mayhem (not J7 race coins, megas or legends). The agent starts 1-8 s in, trades every
   0.3-2.5 s for a duration from the real distribution, each trade 0.003-0.07 SOL with a +3..+20% / -8..-35% price jump. 2-6 bot
   wallets trade against it. When it stops, most coins are done; a few survive and play their chart from the new (low) level.
   You can launch a Mayhem coin from Token Deploy (Pump only). No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const AGENT = 'MAYHEMbupa' + 'Agent1';   // the game's one public Mayhem agent wallet
  const SHARE = 0.30;   // pump.fun 2026: 26-30% of launches
  // how long the agent stays on a coin (seconds), from Bitquery's distribution
  function stay(r) {
    const x = r();
    if (x < 0.18) return 2 + r() * 8;
    if (x < 0.42) return 10 + r() * 20;
    if (x < 0.60) return 30 + r() * 30;
    if (x < 0.91) return 60 + r() * 240;
    if (x < 0.99) return 300 + r() * 600;     // (real: 5-60 min; capped at 15 so the screen isn't one coin)
    return 900 + r() * 600;
  }

  function Mayhem(game, saved) {
    this.game = game; this.stats = { coins: 0, trades: 0, survivors: 0 };
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Mayhem.prototype;
  Mayhem.AGENT = AGENT;
  P.save = function () { return { stats: this.stats, log: (this.log || []).slice(-60) }; };

  // turn Mayhem on for a coin (sim launches, or yours from Token Deploy)
  P.enable = function (tk, opts) {
    const sim = this.game.sim, r = sim.r;
    if (!tk || tk.dead || tk.mayhem || tk.stage !== 'curve' || tk.lp !== 'pumplab') return null;   // Pump curve only
    opts = opts || {};
    const start = sim.t + (opts.start != null ? opts.start : 1 + r() * 7);
    const runnerFate = tk.fate2 === 'runner' || tk.fate2 === 'pnd' || tk.fate2 === 'whale';
    tk.mayhem = {
      start, until: start + (opts.stay || stay(r)), next: start, trades: 0, launchMc: sim.mc(tk),
      survive: opts.survive != null ? opts.survive : r() < (runnerFate ? 0.18 : 0.03),
      bots: Array.from({ length: 2 + Math.floor(r() * 5) }, () => 'MEV' + BH.Names.addr(r).slice(3)),
      active: false, done: false,
      moon: opts.moon != null ? opts.moon : tk.fate2 !== 'rug' && r() < 0.03, moonAt: 3 + Math.floor(r() * 25),
    };
    if (tk.mayhem.moon) tk.mayhem.until = Math.max(tk.mayhem.until, start + 8 + tk.mayhem.moonAt * 2.6);   // (stays long enough to print it)
    tk.supply2b = true;
    tk.hype = Math.min(tk.hype || 0.3, 0.35);   // fewer humans show up
    this.stats.coins++;
    return tk.mayhem;
  };

  // one agent trade: a tiny SOL amount, a big jump (it trades its extra minted supply)
  P.agentTrade = function (tk) {
    const sim = this.game.sim, r = sim.r, M = tk.mayhem;
    // Mayhem moonshot, the way FARSIM did it (5wJER1...pump, Sep 18 2026, studied in docs/research/mayhem-mode.md):
    // the agent crashed the curve from $3K to $21 in 2 min, the coin graduated into a near-EMPTY PumpSwap pool, and with almost no
    // SOL in the pool ordinary buys sent it $171 -> $660K -> $29M -> $136M in 3 minutes ($142M top) on only ~$250K/min of volume,
    // then it was back under $1K 15 minutes later. ~3% of Mayhem coins get this: drained, empty-pool graduation, frenzy, dump.
    const moon = M.moon && !M.mooned && M.trades >= M.moonAt;
    if (moon) {
      M.mooned = true;
      const lp = sim.cv(tk), left = 0.02 + r() * 0.28;
      tk.realSol = Math.min(Math.max(0, tk.realSol), left);   // the agent's sells took the SOL out
      tk.realTok = lp.real - 2e6;                               // the curve is all but sold out
      sim.exec(tk, AGENT, 'mayhem', 'buy', 0.05);              // the last buy graduates it into a near-empty pool
      if (tk.stage === 'amm') {
        this.stats.moons = (this.stats.moons || 0) + 1;
        if (sim.event) sim.event('news', tk, '$' + tk.ticker + ' (Mayhem) graduated with an almost empty pool. Any buy moves it like crazy');
        tk.hype = Math.max(tk.hype || 0, 2.5); tk.half = 90;
        const q = (this.q = this.q || []), n = 40 + Math.floor(r() * 50);
        for (let i = 0; i < n; i++) q.push({ at: sim.t + 0.5 + Math.pow(r(), 1.4) * 240, coin: tk.id, addr: BH.Names.addr(r), side: 'buy', sol: 0.1 + r() * r() * 4 });   // the frenzy builds over ~4 min
        for (let i = 0; i < 25; i++) q.push({ at: sim.t + 170 + Math.pow(r(), 0.8) * 780, coin: tk.id, dump: true });   // then the top holders dump (back near nothing in ~15 min)
      }
      M.trades++; this.stats.trades++;
      return;
    }
    const buy = M.trades === 0 ? true : r() < 0.46;   // live sample (Nov 16): 99 buys / 114 sells
    const p0 = sim.price(tk);
    // live sample of 32 coins (Nov 16): median end 10% of start, 37% still went over 2x at some point: sells hit harder, and now and then a buy rips
    const jump = buy ? (r() < 0.08 ? 1.4 + r() * 0.8 : 1 + (0.04 + r() * 0.18)) : 1 - (0.09 + r() * 0.24);
    // move the curve's price without the matching SOL (the extra supply), down to ~$1 market cap (FARSIM hit $21 on the curve; some go to ~$1)
    const floor = (1 / Math.max(1e-9, sim.mc(tk))) * p0;   // = the price at a $1 market cap
    const target = Math.max(floor, p0 * jump);
    // the extra supply goes into (or comes out of) the curve: count it, so a cheap curve is not an easy graduation
    // (realTok may go below 0; the bonding % shown is clamped at 0)
    if (tk.vSol > 0 && target > 0) { const v1 = tk.vSol / target; tk.realTok -= v1 - tk.vTok; tk.vTok = v1; }
    tk.hype = Math.min(tk.hype || 0, 0.2);   // few humans on Mayhem coins
    const sol = Math.min(0.4, Math.max(0.002, 0.028 * Math.exp(1.2 * r.normal())));   // live sample: median 0.028 SOL, p10 0.004, p90 0.137
    if (buy) sim.exec(tk, AGENT, 'mayhem', 'buy', sol);
    else {
      let h = tk.holders.get(AGENT);
      if (!h || h.tokens < 1) { sim.exec(tk, AGENT, 'mayhem', 'buy', 0.003); h = tk.holders.get(AGENT); }
      if (h) { const tok = sol / Math.max(1e-12, sim.price(tk)); h.tokens += tok; sim.exec(tk, AGENT, 'mayhem', 'sell', Math.min(h.tokens, tok)); }   // sells newly minted supply
    }
    M.trades++; this.stats.trades++;
    // the bots trade against it
    if (r() < 0.6 && M.bots.length) {
      const b = M.bots[Math.floor(r() * M.bots.length)], amt = 0.006 + r() * r() * 0.12;
      const at = sim.t + 0.1 + r() * 0.8;
      (this.q = this.q || []).push({ at, coin: tk.id, addr: b, side: buy ? 'sell' : 'buy', sol: amt });
    }
  };

  P.onLaunch = function (tk) {
    const sim = this.game.sim;
    (this.q = this.q || []).push({ at: sim.t + 0.2, pick: tk.id });   // (before the J7 snipe check at 0.3 s)
  };
  P.onStep = function () {
    const sim = this.game.sim, r = sim.r;
    if (this.q && this.q.length) {
      const due = this.q.filter((x) => x.at <= sim.t); this.q = this.q.filter((x) => x.at > sim.t);
      for (const x of due) {
        const tk = sim.byId.get(x.coin || x.pick); if (!tk || tk.dead) continue;
        if (x.pick) {
          // ~30% of Pump launches; not J7 race coins, the player's own (unless chosen in Token Deploy), megas or legends
          if (tk.lp === 'pumplab' && !tk.j7 && !tk.isPlayer && tk.fate2 !== 'mega' && tk.fate2 !== 'legend' && r() < SHARE) this.enable(tk);
          continue;
        }
        if (x.dump) { let best = null; for (const h of tk.holders.values()) if (h.addr !== AGENT && h.addr !== 'YOU' && !h.rw && h.tokens > 1 && (!best || h.tokens > best.tokens)) best = h; /* named whales manage their own bags */ if (best) sim.exec(tk, best.addr, best.kind || 'retail', 'sell', best.tokens * (0.5 + r() * 0.5)); continue; }
        if (x.side === 'buy') sim.exec(tk, x.addr, 'retail', 'buy', x.sol);
        else { const h = tk.holders.get(x.addr); if (h && h.tokens > 1) sim.exec(tk, x.addr, 'retail', 'sell', h.tokens * (0.4 + r() * 0.6)); else sim.exec(tk, x.addr, 'retail', 'buy', x.sol * 0.5); }
      }
    }
    for (const tk of sim.tokens) {
      const M = tk.mayhem; if (!M || M.done || tk.dead) continue;
      if (sim.t < M.start) continue;
      if (sim.t >= M.until || tk.stage !== 'curve') {
        M.done = true; M.active = false; M.endMc = sim.mc(tk);
        (this.log = this.log || []).push({ t: sim.t, ticker: tk.ticker, launchMc: M.launchMc, endMc: M.endMc, secs: Math.min(M.until, sim.t) - M.start, trades: M.trades, survive: M.survive, grad: tk.stage !== 'curve' }); if (this.log.length > 300) this.log.shift();
        if (M.survive) this.stats.survivors++;
        if (sim.event) sim.event('news', tk, '$' + tk.ticker + ': Mayhem agent stopped after ' + M.trades + ' trades (' + Math.round(M.endMc / M.launchMc * 100) + '% of launch price)');
        continue;
      }
      M.active = true;
      if (sim.t >= M.next) { this.agentTrade(tk); M.next = sim.t + 0.3 + r() * 2.2; }
    }
  };

  BH.Mayhem = Mayhem;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'mayhem', create(game, saved) { const m = new Mayhem(game, saved); m.hooks = { launch: (tk) => m.onLaunch(tk), step: () => m.onStep() }; return m; } });
})(typeof window !== 'undefined' ? window : globalThis);
