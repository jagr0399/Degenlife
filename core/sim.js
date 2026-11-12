/* Bagholder market simulation.
   Coins launch on a pump.fun-style bonding curve, a cast of scripted actors (dev, bundlers, snipers,
   insiders, KOLs, volume bots, whales) plus organic retail trade them, and a few graduate to a DEX pool.
   Prices are never scripted: they only move when someone trades against the curve or pool. */
(function (g) {
  'use strict';
  const BH = g.BH;
  const C = BH.C;
  const FATES = ['dud', 'rug', 'pnd', 'bleed', 'gradDump', 'gradBleed', 'runner'];
  // Degen Life: several launchpads, each with its own bonding curve (made-up names modeled on real ones).
  // PumpLab uses the real pump.fun curve: 30 virtual SOL and 1.073B virtual tokens, 793.1M sold on the curve, ~85 SOL raised.
  // A coin starts near $2.3K and graduates at ~411 SOL of market cap, which is ~$34K with SOL at $83 (it moves with the SOL price).
  // The others raise more before they graduate: BonkPad ~$39K, Stonkz ~$48K, RayLaunch ~$72K.
  const PADS = [
    { id: 'pumplab', name: 'PumpLab', short: 'P', color: '#2bd67b', vSol: 30, real: C.CURVE_REAL_TOKENS, fee: 0.0125, cshare: 0.0030, w: 0.50 },
    { id: 'bonkpad', name: 'BonkPad', short: 'B', color: '#ff9f43', vSol: 34, real: C.CURVE_REAL_TOKENS, fee: 0.010, cshare: 0.0025, w: 0.10 },
    { id: 'stonkz', name: 'Stonkz', short: 'S', color: '#a77bff', vSol: 42, real: C.CURVE_REAL_TOKENS, fee: 0.010, cshare: 0.0020, w: 0.10 },
    { id: 'raylaunch', name: 'RayLaunch', short: 'R', color: '#4aa8ff', vSol: 60, real: 800_000_000, fee: 0.010, cshare: 0.0020, w: 0.10 },
    { id: 'flap', name: 'Flap', short: 'F', color: '#c6f432', vSol: 32, real: C.CURVE_REAL_TOKENS, fee: 0.010, cshare: 0.0030, w: 0.12 },
    { id: 'pons', name: 'Pons', short: 'N', color: '#e8ecf3', vSol: 46, real: C.CURVE_REAL_TOKENS, fee: 0.010, cshare: 0.0025, w: 0.08 },
  ];
  const LEGACY = { id: 'legacy', name: 'Launchpad', short: 'L', color: '#f4b23e', vSol: C.CURVE_V_SOL, real: C.CURVE_REAL_TOKENS, fee: C.CURVE_FEE, cshare: C.CURVE_CREATOR_SHARE, w: 0 };
  const PAD_BY = Object.fromEntries(PADS.map((p) => [p.id, p]));
  BH.PADS = PADS;

  function Sim(opts) {
    opts = opts || {};
    this.r = BH.makeRng(opts.seed || (Date.now() & 0xffffffff));
    this.mode = opts.mode || 'arcade';
    this.t = 0;                 // game seconds
    this.tokens = [];           // live tokens (newest last)
    this.byId = new Map();
    this.events = [];           // global feed: launches, calls, migrations, rugs
    this.orders = [];           // player orders waiting to land
    this.results = [];          // landed / failed player orders since the UI last looked
    this.nextLaunch = 0.5;
    this.seq = 0;
    this.stats = { launched: 0, migrated: 0, rugged: 0, dead: 0, fates: {} };
    this.player = null;         // set by BH.Player
    this.keep = new Set();      // token ids that must not be pruned (player holds / viewing)
  }
  const P = Sim.prototype;

  // ---- helpers -------------------------------------------------------------------
  const rr = (r, a) => r.range(a[0], a[1]);
  P.price = function (tk) { return tk.stage === 'amm' ? tk.poolSol / tk.poolTok : tk.vSol / tk.vTok; };
  P.mc = function (tk) { return this.price(tk) * C.TOTAL_SUPPLY * C.SOL_USD; };
  P.cv = function (tk) { return PAD_BY[tk.lp] || LEGACY; };
  P.gradMc = function (tk) { const lp = this.cv(tk), vTokEnd = C.CURVE_V_TOKENS - lp.real, vSolEnd = lp.vSol * C.CURVE_V_TOKENS / vTokEnd; return vSolEnd / vTokEnd * C.TOTAL_SUPPLY * C.SOL_USD; };
  P.pickPad = function (r) { let x = r(); for (const p of PADS) { if ((x -= p.w) < 0) return p; } return PADS[0]; };
  P.progress = function (tk) { return tk.stage === 'curve' ? Math.min(100, tk.realTok / this.cv(tk).real * 100) : 100; };
  P.liquidity = function (tk) { return tk.stage === 'amm' ? tk.poolSol * 2 : tk.realSol; };
  P.event = function (type, tk, text, extra) {
    const e = Object.assign({ t: this.t, type, id: tk ? tk.id : null, ticker: tk ? tk.ticker : '', text }, extra || {});
    this.events.push(e);
    if (this.events.length > 300) this.events.splice(0, this.events.length - 300);
    return e;
  };
  P.pickFate = function () {
    const w = C.FATES[this.mode] || C.FATES.arcade;
    let x = this.r(), acc = 0;
    for (const f of FATES) { acc += w[f]; if (x < acc) return f; }
    return 'dud';
  };

  // ---- launching -----------------------------------------------------------------
  P.launch = function (custom) {
    const r = this.r;
    const id = 't' + (++this.seq);
    const ident = custom ? { name: custom.name, ticker: custom.ticker, desc: custom.desc || '' } : BH.Names.token(r);
    const fate = custom ? 'player' : this.pickFate();
    const lp = (custom && PAD_BY[custom.lp]) || (custom ? PADS[0] : this.pickPad(r));
    const tk = {
      id, fate, name: ident.name, ticker: ident.ticker, desc: ident.desc,
      ca: BH.Names.addr(r, 44, 'bag'),
      hue: custom && custom.hue != null ? custom.hue : r.int(0, 359),
      seed: r.int(1, 1e9),
      socials: custom ? custom.socials : { x: r.chance(0.7), tg: r.chance(0.45), web: r.chance(0.3) },
      born: this.t, stage: 'curve',
      lp: lp.id, vSol: lp.vSol, vTok: C.CURVE_V_TOKENS, realSol: 0, realTok: 0, poolSol: 0, poolTok: 0,
      holders: new Map(), hl: [], trades: [], candles: [],
      vol: 0, buys: 0, sells: 0, lastTrade: this.t, athMc: 0, creatorFees: 0,
      hype: 0, half: 20, devSold: false, migratedAt: null, rugged: false, dead: false,
      bundle: [], snipers: [], insiders: [], kol: null, bot: null, whaleCD: 0,
      plan: {}, mcHist: [], isPlayer: !!custom,
      // Degen Life: 'holders' = dividends (creator fees go to holders), 'creator' = the dev keeps them; pair SOL or USD1
      rewards: custom ? (custom.rewards === 'holders' ? 'holders' : 'creator') : (r.chance(0.2) ? 'holders' : 'creator'),
      pair: custom ? (custom.pair === 'USD1' ? 'USD1' : 'SOL') : (r.chance(0.12) ? 'USD1' : 'SOL'),
      img: custom && custom.img != null ? custom.img : undefined,
    };
    if (tk.img === undefined) delete tk.img;
    tk.athMc = this.mc(tk);
    this.tokens.push(tk); this.byId.set(id, tk);
    this.stats.launched++; this.stats.fates[fate] = (this.stats.fates[fate] || 0) + 1;

    if (custom) {
      // most self-launched coins die like everyone else's: modest start, fast fade
      tk.hype = r.range(0.2, 0.6) + (tk.socials.x ? 0.08 : 0) + (tk.socials.tg ? 0.05 : 0) + (tk.socials.web ? 0.05 : 0) + Math.min(0.12, (tk.desc || '').length / 1000);
      tk.half = r.range(12, 25);
      tk.devAddr = 'YOU';
      // snipers watch every launch, including yours, and dump into your pump
      if (r.chance(0.6)) {
        const n = r.int(1, 4);
        for (let i = 0; i < n; i++) tk.snipers.push({ addr: BH.Names.addr(r), at: this.t + r.range(0.3, 2.5), sol: rr(r, C.SNIPER_SOL), tp: r.range(1.3, 2.2), done: false });
      }
      if (this.hooks && this.hooks.launchMine) this.hooks.launchMine(tk, r);   // Degen Life (after hype is set)
      this.event('launch', tk, 'You launched $' + tk.ticker, { you: true });
      return tk;
    }

    const H = C.HYPE[fate];
    tk.hype = rr(r, H.h0); tk.half = rr(r, H.half);
    const pl = tk.plan;
    pl.devMaxHold = rr(r, C.DEV_MAX_HOLD_S);
    pl.rugAt = rr(r, C.RUG_AT_MC);
    pl.pndExit = rr(r, C.PND_EXIT_MC);
    pl.runnerTarget = rr(r, C.RUNNER_TARGET_MC);
    pl.postGradDump = r.range(6, 40);
    pl.graduates = fate === 'gradDump' || fate === 'gradBleed' || fate === 'runner';

    // dev buy, in the creation tx
    tk.devAddr = BH.Names.addr(r);
    const devSol = rr(r, C.DEV_BUY[fate]);
    if (devSol > 0.02) this.exec(tk, tk.devAddr, 'dev', 'buy', devSol);
    else { const dh = this.holder(tk.devAddr, 'dev'); tk.holders.set(tk.devAddr, dh); tk.hl.push(dh); }

    // same-block bundle (dev-linked wallets)
    if (r.chance(C.BUNDLE_CHANCE[fate])) {
      const n = r.int(C.BUNDLE_WALLETS[0], C.BUNDLE_WALLETS[1]);
      let total = rr(r, C.BUNDLE_SOL) * (fate === 'dud' ? 0.3 : 1);
      for (let i = 0; i < n; i++) {
        const a = BH.Names.addr(r);
        tk.bundle.push(a);
        this.exec(tk, a, 'bundler', 'buy', total / n * r.range(0.6, 1.4));
      }
    }
    // snipers land in the first second or two
    if (r.chance(C.SNIPE_CHANCE)) {
      const n = r.int(C.SNIPERS[0], C.SNIPERS[1]);
      for (let i = 0; i < n; i++) tk.snipers.push({ addr: BH.Names.addr(r), at: this.t + r.range(0.1, 2.2), sol: rr(r, C.SNIPER_SOL), tp: rr(r, C.SNIPER_TP), done: false });
    }
    // insiders (look like normal early buyers)
    const ins = C.INSIDERS[fate];
    if (ins) {
      const n = r.int(ins[0], ins[1]);
      for (let i = 0; i < n; i++) tk.insiders.push({ addr: BH.Names.addr(r), at: this.t + r.range(1, 12), sol: r.range(0.4, 2.5), done: false });
    }
    // KOL call
    if (r.chance(C.KOL_CALL_CHANCE[fate])) {
      const big = r.chance(0.35);
      tk.kol = {
        handle: BH.Names.kol(r), addr: BH.Names.addr(r), big,
        // call when the coin reaches some market cap, or after migration for graduates
        atMc: pl.graduates ? r.range(25000, 55000) : r.range(9000, 30000),
        sol: rr(r, C.KOL_FRONTRUN_SOL) * (big ? 1.4 : 1),
        hold: rr(r, C.KOL_HOLD_S) * (big ? 0.6 : 1),
        state: 'wait',
      };
    }
    if (r.chance(C.VOLUME_BOT_CHANCE)) tk.bot = { addr: BH.Names.addr(r), until: this.t + r.range(30, 160), size: r.range(0.3, 1.8) };
    if (this.hooks && this.hooks.launch) this.hooks.launch(tk, r);   // Degen Life: narratives theme the coin (after fate setup)
    return tk;
  };

  P.holder = function (addr, kind) {
    return { addr, kind, tokens: 0, cost: 0, bought: 0, sold: 0, entry: 0, first: this.t, buys: 0, sells: 0, tp: 0, sl: 0 };
  };

  // ---- the one place where reserves change ------------------------------------------
  // buy: amount = SOL in (fees included). sell: amount = tokens. Returns the fill or null.
  P.exec = function (tk, addr, kind, side, amount) {
    if (tk.dead || amount <= 0) return null;
    const curve = tk.stage === 'curve';
    const lp = this.cv(tk);
    const fee = curve ? lp.fee : C.AMM_FEE;
    const cshare = curve ? lp.cshare : C.AMM_CREATOR_SHARE;
    let sol, tok, feeSol;
    if (side === 'buy') {
      sol = amount;
      feeSol = sol * fee;
      let net = sol - feeSol;
      if (curve) {
        const k = tk.vSol * tk.vTok;
        tok = tk.vTok - k / (tk.vSol + net);
        const left = lp.real - tk.realTok;
        if (tok >= left) { // last buy fills the curve; the rest of the SOL is refunded
          tok = left;
          net = k / (tk.vTok - tok) - tk.vSol;
          feeSol = net * fee / (1 - fee);
          sol = net + feeSol;
        }
        tk.vSol += net; tk.vTok -= tok; tk.realSol += net; tk.realTok += tok;
      } else {
        const k = tk.poolSol * tk.poolTok;
        tok = tk.poolTok - k / (tk.poolSol + net);
        tk.poolSol += net; tk.poolTok -= tok;
      }
    } else {
      const h = tk.holders.get(addr);
      tok = Math.min(amount, h ? h.tokens : 0);
      if (h && h.tokens - tok < 1) tok = h.tokens; // never leave dust behind
      if (tok <= 1) return null;
      let gross;
      if (curve) {
        const k = tk.vSol * tk.vTok;
        gross = tk.vSol - k / (tk.vTok + tok);
        gross = Math.min(gross, tk.realSol);
        tk.vSol -= gross; tk.vTok += tok; tk.realSol -= gross; tk.realTok -= tok;
      } else {
        const k = tk.poolSol * tk.poolTok;
        gross = tk.poolSol - k / (tk.poolTok + tok);
        tk.poolSol -= gross; tk.poolTok += tok;
      }
      feeSol = gross * fee;
      sol = gross - feeSol;
    }
    // creator fee
    const cf = (side === 'buy' ? sol : sol + feeSol) * cshare;
    tk.creatorFees += cf;
    if (tk.rewards === 'holders') tk.divPaid = (tk.divPaid || 0) + cf;   // dividends: shared out to holders
    else if (tk.isPlayer && this.player && addr !== 'YOU') this.player.creatorFee(tk, cf);

    // holder book
    let h = tk.holders.get(addr);
    if (!h) { h = this.holder(addr, kind); tk.holders.set(addr, h); tk.hl.push(h); }
    if (side === 'buy') {
      h.entry = (h.entry * h.tokens + (sol / tok) * tok) / (h.tokens + tok);
      h.tokens += tok; h.cost += sol; h.bought += sol; h.buys++;
    } else {
      const frac = h.tokens > 0 ? tok / h.tokens : 1;
      h.cost *= (1 - frac); h.tokens -= tok; h.sold += sol; h.sells++;
    }
    const price = this.price(tk);
    const mc = price * C.TOTAL_SUPPLY * C.SOL_USD;
    const notional = side === 'buy' ? sol : sol + feeSol;
    tk.vol += notional; tk.lastTrade = this.t;
    if (side === 'buy') tk.buys++; else tk.sells++;
    if (mc > tk.athMc) tk.athMc = mc;
    const tr = { t: this.t, side, kind, addr, sol: notional, tok, mc, you: addr === 'YOU' };
    tk.trades.push(tr);
    if (this.hooks) { if (this.hooks.fee) this.hooks.fee(tk, feeSol, tr); if (this.hooks.trade) this.hooks.trade(tk, tr, h); }   // Degen Life hooks
    if (tk.trades.length > 120) tk.trades.splice(0, tk.trades.length - 120);
    this.candle(tk, mc, notional, tr);
    if (kind === 'dev' && side === 'sell' && !tk.devSold && h.tokens < 1) { tk.devSold = true; if (!tk.isPlayer && (mc > 6000 || this.r() < 0.15)) this.event('devsold', tk, 'Dev sold everything on $' + tk.ticker); }
    if (curve && tk.realTok >= lp.real - 1) this.migrate(tk);
    return { sol: notional, net: sol, tok, fee: feeSol, price: notional / tok, mc };
  };

  P.candle = function (tk, mc, vol, tr) {
    const s = Math.floor(this.t);
    let c = tk.candles[tk.candles.length - 1];
    if (!c || c.t !== s) {
      const o = c ? c.c : mc;
      c = { t: s, o, h: Math.max(o, mc), l: Math.min(o, mc), c: mc, v: 0, m: null };
      tk.candles.push(c);
      if (tk.candles.length > 2400) tk.candles.splice(0, tk.candles.length - 2400);
    }
    c.h = Math.max(c.h, mc); c.l = Math.min(c.l, mc); c.c = mc; c.v += vol;
    if (tr.you) (c.m = c.m || []).push(tr.side === 'buy' ? 'B' : 'S');
    else if (tr.kind === 'dev' && tr.side === 'sell') (c.m = c.m || []).push('D');
  };

  P.migrate = function (tk) {
    tk.stage = 'amm';
    tk.poolSol = tk.realSol - C.MIGRATION_FEE_SOL;
    tk.poolTok = C.TOTAL_SUPPLY - this.cv(tk).real;
    tk.migratedAt = this.t;
    tk.hype += tk.fate === 'runner' ? 1.6 : 0.8;
    tk.half = Math.max(tk.half, tk.fate === 'runner' ? 120 : 60);
    this.stats.migrated++;
    this.event('migrate', tk, '$' + tk.ticker + ' graduated to the DEX');
  };

  // ---- quotes for the trade panel --------------------------------------------------
  P.quote = function (tk, side, amount) {
    if (!tk || tk.dead || amount <= 0) return null;
    const curve = tk.stage === 'curve';
    const fee = curve ? this.cv(tk).fee : C.AMM_FEE;
    const p0 = this.price(tk);
    if (side === 'buy') {
      const net = amount * (1 - fee);
      let tok;
      if (curve) { tok = tk.vTok - tk.vSol * tk.vTok / (tk.vSol + net); tok = Math.min(tok, this.cv(tk).real - tk.realTok); }
      else tok = tk.poolTok - tk.poolSol * tk.poolTok / (tk.poolSol + net);
      const avg = amount / tok;
      return { out: tok, avg, impact: avg / p0 - 1, fee: amount * fee };
    }
    let gross = curve ? tk.vSol - tk.vSol * tk.vTok / (tk.vTok + amount) : tk.poolSol - tk.poolSol * tk.poolTok / (tk.poolTok + amount);
    if (curve) gross = Math.min(gross, tk.realSol);
    const out = gross * (1 - fee);
    return { out, avg: out / amount, impact: 1 - (gross / amount) / p0, fee: gross * fee };
  };

  // ---- player orders (land next block; priority fee decides if you beat the bots) ----
  P.submit = function (o) {
    const tk = this.byId.get(o.tokenId);
    if (!tk || tk.dead) return { ok: false, reason: 'Token is gone' };
    const q = this.quote(tk, o.side, o.amount);
    if (!q || !(q.out > 0)) return { ok: false, reason: 'Nothing to trade' };
    o.quote = q; o.at = this.t; o.id = ++this.seq;
    this.orders.push(o);
    return { ok: true, order: o };
  };
  P.landOrders = function (fast) {
    const keep = [];
    for (const o of this.orders) {
      const isFast = o.priority >= C.FAST_PRIORITY;
      if (isFast !== fast || o.at === this.t) { keep.push(o); continue; }
      if (o.delay > 0) { o.delay--; keep.push(o); continue; }   // Degen Life: tired players land a block late
      this.results.push(this.player ? this.player.land(o) : { ok: false });
    }
    this.orders = keep;
  };

  // ---- one simulation step --------------------------------------------------------
  P.step = function (dt) {
    this.t += dt;
    if (this.hooks && this.hooks.step) this.hooks.step(dt);   // Degen Life systems tick with the market (also while asleep)
    const r = this.r;
    // fast (high-priority) player txs land before the bots in this block
    this.landOrders(true);
    // launches
    while (this.t >= this.nextLaunch) {
      if (this.tokens.length < C.MAX_LIVE_TOKENS) this.launch();
      this.nextLaunch += -Math.log(1 - r()) * C.LAUNCH_EVERY_S / (this.launchMul || 1);
    }
    for (let i = 0; i < this.tokens.length; i++) {
      const tk = this.tokens[i];
      if (!tk.dead) this.actors(tk, dt);
    }
    this.landOrders(false);
    this.prune();
  };

  P.actors = function (tk, dt) {
    const r = this.r;
    const age = this.t - tk.born;
    const mc = this.mc(tk);
    const pl = tk.plan;
    // momentum: price rises bring buyers (FOMO), drops scare them
    tk.mcHist.push(mc);
    if (tk.mcHist.length > 40) tk.mcHist.shift();
    const ref = tk.mcHist[0];
    const ret = ref > 0 ? mc / ref - 1 : 0;
    tk.hype *= Math.pow(0.5, dt / tk.half);
    if (ret > 0.15) tk.hype += Math.min(0.5, ret * 0.25) * dt;
    if (ret < -0.3) tk.hype *= Math.pow(0.6, dt);
    // graduating fates keep a floor until they make it (the "it's sending" phase)
    if (pl.graduates && tk.stage === 'curve' && age < 260) tk.hype = Math.max(tk.hype, 1.15 + this.progress(tk) / 120);
    if (tk.fate === 'runner' && tk.stage === 'amm' && mc < pl.runnerTarget) {
      tk.hype = Math.max(tk.hype, 1.4 + Math.log10(Math.max(1, mc / 60000)));
      if (r.chance(0.02 * dt)) { tk.hype += r.range(0.8, 2.5); this.event('news', tk, '$' + tk.ticker + ' trending: ' + r.pick(['new ATH', 'CTO formed', 'DEX banner paid', 'whale accumulating', 'meme went viral'])); }
    }

    // retail buys
    let lam = C.RETAIL_BASE_RATE * tk.hype * dt * (tk.stage === 'amm' ? 1.5 : 1);
    if (tk.isPlayer) { // buyers check the dev wallet on player coins
      const dh = tk.holders.get('YOU');
      const devPct = dh ? dh.tokens / C.TOTAL_SUPPLY * 100 : 0;
      if (devPct > 3) lam *= Math.max(0.2, 1 - (devPct - 3) / 10);
    }
    const directed = tk.dir && !tk.dir.done;   // Degen Life: the chart director runs this coin's crowd itself
    const nb = directed ? 0 : r.poisson(lam);
    for (let i = 0; i < nb; i++) {
      let size = Math.min(40, r.logn(C.RETAIL_BUY_SOL_MEDIAN, C.RETAIL_BUY_SOL_SIGMA));
      let kind = 'retail', addr;
      if (tk.hype > 1.5 && r.chance(0.025)) { kind = 'whale'; size = r.range(5, tk.stage === 'amm' ? 40 : 18); }
      const reuse = tk.holders.size > 350 ? 0.7 : 0.15;
      if (r.chance(reuse)) {
        for (let k = 0; k < 4; k++) { const h = tk.hl[Math.floor(r() * tk.hl.length)]; if (h && h.kind === 'retail') { addr = h.addr; kind = 'retail'; break; } }
      }
      if (!addr) addr = BH.Names.addr(r);
      const f = this.exec(tk, addr, kind, 'buy', size);
      if (f) { const h = tk.holders.get(addr); if (!h.tp) { h.tp = rr(r, C.RETAIL_TP); h.sl = rr(r, C.RETAIL_SL); } }
      if (tk.stage === 'amm' && tk.fate !== 'runner') break; // post-dump coins don't stay hot
      if (tk.dead) return;
    }

    // retail sells: sample some holders each step
    const price = this.price(tk);
    // (a coin whose chart story has ended is a dead chart: only the odd holder still sells, not a stream every second)
    const samp = directed ? 0 : tk.dir && tk.dir.done ? (r.chance(0.25 * dt) ? 1 : 0) : Math.min(tk.hl.length, Math.ceil(6 * dt * 4));
    if (samp > 0) {
      const all = tk.hl;
      for (let i = 0; i < samp; i++) {
        const h = all[Math.floor(r() * all.length)];
        if ((h.kind !== 'retail' && h.kind !== 'whale') || h.rw || h.tokens < 1 || !h.entry) continue;   // named whales manage their own bags
        const m = price / h.entry;
        let frac = 0;
        if (m >= h.tp && r.chance(0.5)) frac = r.range(0.5, 1);
        else if (m <= 1 - h.sl && r.chance(0.55)) frac = 1;
        else if (r.chance(0.04 / Math.max(0.4, tk.hype) * (tk.rewards === 'holders' ? 0.6 : 1))) frac = r.range(0.3, 1);  // paper hands (dividend holders hold longer)
        if (frac > 0) this.exec(tk, h.addr, h.kind, 'sell', h.tokens * frac);
      }
    }

    // snipers
    for (const s of tk.snipers) {
      if (!s.done && this.t >= s.at) { s.done = true; s.in = true; this.exec(tk, s.addr, 'sniper', 'buy', s.sol); continue; }
      if (!s.in) continue;
      const h = tk.holders.get(s.addr);
      if (!h || h.tokens < 1) continue;
      const m = price / h.entry;
      if (m >= s.tp || (age > 25 && tk.hype < 0.7) || m < 0.55) this.exec(tk, s.addr, 'sniper', 'sell', h.tokens * (m >= s.tp ? r.range(0.5, 1) : 1));
    }
    // insiders buy early, quietly
    for (const s of tk.insiders) if (!s.done && this.t >= s.at) { s.done = true; this.exec(tk, s.addr, 'insider', 'buy', s.sol); }

    // KOL
    const k = tk.kol;
    if (k) {
      if (k.state === 'wait' && mc >= k.atMc && (!pl.graduates || tk.stage === 'amm' || tk.fate === 'gradDump')) {
        this.exec(tk, k.addr, 'kol', 'buy', k.sol); k.state = 'bought'; k.callAt = this.t + r.range(0.8, 3);
      } else if (k.state === 'bought' && this.t >= k.callAt) {
        k.state = 'called'; k.sellAt = this.t + k.hold;
        tk.hype += k.big ? r.range(2.5, 4.5) : r.range(1, 2.4);
        this.event('call', tk, '@' + k.handle + ' called $' + tk.ticker, { kol: k.handle, big: k.big });
      } else if (k.state === 'called' && this.t >= k.sellAt) {
        k.state = 'sold';
        const h = tk.holders.get(k.addr);
        if (h && h.tokens > 0) this.exec(tk, k.addr, 'kol', 'sell', h.tokens);
      }
    }

    // volume bot: matched buy/sell pairs
    if (tk.bot && this.t < tk.bot.until && r.chance(0.8 * dt * 4 / 4)) {
      // sized to the coin's liquidity (about a 1% print), so wash trades add volume without drawing a tall wick every second
      const f = this.exec(tk, tk.bot.addr, 'bot', 'buy', Math.min(tk.bot.size, (tk.stage === 'amm' ? tk.poolSol : tk.vSol) * 0.006) * r.range(0.7, 1.3));
      if (f) this.exec(tk, tk.bot.addr, 'bot', 'sell', f.tok);
    }

    if (!tk.isPlayer) this.devScript(tk, age, mc, dt);
    if (tk.dead) return;
    // dead coins leave the feed
    if (this.t - tk.lastTrade > C.DEAD_AFTER_S && mc < C.DEAD_MC_USD) this.kill(tk);
  };

  P.dumpGroup = function (tk, kinds, frac) {
    for (const h of Array.from(tk.holders.values())) if (kinds.includes(h.kind) && h.tokens > 1) this.exec(tk, h.addr, h.kind, 'sell', h.tokens * frac < 2e5 ? h.tokens : h.tokens * frac);
  };

  P.devScript = function (tk, age, mc, dt) {
    const r = this.r, pl = tk.plan, f = tk.fate;
    if (pl.done) return;
    const devH = tk.holders.get(tk.devAddr);
    const devHas = devH && devH.tokens > 1;
    const rug = (why) => {
      pl.done = true;
      this.dumpGroup(tk, ['dev', 'bundler', 'insider'], 1);
      tk.hype *= 0.08; tk.half = 6; tk.rugged = true;
      this.stats.rugged++;
      this.event('rug', tk, '$' + tk.ticker + ' rugged: ' + why);
    };
    if (f === 'dud') {
      if (devHas && age > pl.devMaxHold * 0.4 && r.chance(0.08 * dt)) { this.dumpGroup(tk, ['dev', 'bundler'], 1); pl.done = true; }
    } else if (f === 'rug') {
      if (mc >= pl.rugAt || age > pl.devMaxHold) rug('dev and bundle dumped');
    } else if (f === 'pnd') {
      if (mc >= pl.pndExit || (age > pl.devMaxHold * 1.5 && tk.hype < 0.8)) {
        // insiders ease out over a few seconds instead of one candle; the chart watchers notice
        if (!pl.exiting) tk.hype *= 0.45;
        pl.exiting = true;
      }
      if (pl.exiting) {
        this.dumpGroup(tk, ['dev', 'bundler', 'insider'], Math.min(1, r.range(0.25, 0.6) * dt * 4));
        tk.hype *= Math.pow(0.55, dt);
        const left = Array.from(tk.holders.values()).some((h) => (h.kind === 'dev' || h.kind === 'bundler' || h.kind === 'insider') && h.tokens > 1);
        if (!left) { pl.done = true; tk.rugged = true; this.stats.rugged++; this.event('rug', tk, '$' + tk.ticker + ' insiders cashed out'); }
      }
    } else if (f === 'bleed') {
      if (devHas && age > 20 && r.chance(0.06 * dt)) this.exec(tk, tk.devAddr, 'dev', 'sell', devH.tokens * r.range(0.15, 0.4));
      if (age > 200) pl.done = true;
    } else if (f === 'gradDump') {
      if (tk.stage === 'amm' && this.t - tk.migratedAt > pl.postGradDump) rug('insiders dumped after migration');
      if (tk.stage === 'curve' && age > 300) rug('dev gave up and dumped');
    } else if (f === 'gradBleed') {
      if (tk.stage === 'amm' && devHas && r.chance(0.05 * dt)) this.exec(tk, tk.devAddr, 'dev', 'sell', devH.tokens * r.range(0.2, 0.5));
      if (tk.stage === 'amm' && this.t - tk.migratedAt > 30) tk.half = Math.min(tk.half, 25);
    } else if (f === 'runner') {
      if (tk.stage === 'amm' && mc >= pl.runnerTarget) { pl.done = true; tk.half = 40; this.event('ath', tk, '$' + tk.ticker + ' topped out at ' + BH.fmt.usd(mc)); }
    }
  };

  P.kill = function (tk) {
    tk.dead = true; tk.diedAt = this.t;
    this.stats.dead++;
  };
  P.prune = function () {
    if (this.tokens.length < 40) return;
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const tk = this.tokens[i];
      if (tk.dead && !this.keep.has(tk.id) && this.t - tk.diedAt > 5) {
        this.tokens.splice(i, 1); this.byId.delete(tk.id);
      }
    }
  };

  // ---- player-made coins --------------------------------------------------------------
  P.hireKol = function (tk, tier) {
    const r = this.r;
    let boost = [r.range(0.3, 0.8), r.range(0.5, 1.2), r.range(1.0, 2.2)][tier];
    const flop = r.chance(0.3); // followers shrug sometimes
    if (flop) boost *= 0.25;
    tk.hype += boost;
    tk.half = Math.max(tk.half, 18);
    const handle = BH.Names.kol(r);
    this.event('call', tk, '@' + handle + ' (paid) called $' + tk.ticker, { kol: handle, big: tier === 2, paid: true });
    // the caller front-runs their own call and dumps on the followers, like the real ones
    const addr = BH.Names.addr(r);
    this.exec(tk, addr, 'kol', 'buy', [0.6, 1.6, 4][tier] * r.range(0.8, 1.2));
    tk.kols = tk.kols || [];
    tk.kols.push({ addr, sellAt: this.t + rr(r, C.KOL_HOLD_S) });
    return handle;
  };
  // paid callers on player coins sell on their own clock
  const _actors = P.actors;
  P.actors = function (tk, dt) {
    if (tk.kols) for (const k of tk.kols) if (!k.sold && this.t >= k.sellAt) { k.sold = true; const h = tk.holders.get(k.addr); if (h && h.tokens > 0) this.exec(tk, k.addr, 'kol', 'sell', h.tokens); }
    return _actors.call(this, tk, dt);
  };

  // ---- read-outs for risk panels -------------------------------------------------------
  P.risk = function (tk) {
    let dev = 0, snipers = 0, bundle = 0, insiders = 0, n = 0;
    const tops = [];
    const holders = [];
    for (const h of tk.holders.values()) {
      if (h.tokens < 1) continue;
      n++;
      holders.push(h);
      if (h.kind === 'dev') dev += h.tokens;
      else if (h.kind === 'sniper') snipers += h.tokens;
      else if (h.kind === 'bundler') bundle += h.tokens;
      else if (h.kind === 'insider') insiders += h.tokens;
    }
    holders.sort((a, b) => b.tokens - a.tokens);
    // the curve / pool itself is not a holder; top 10 excludes it like real tools do
    let top10 = 0;
    for (let i = 0; i < Math.min(10, holders.length); i++) top10 += holders[i].tokens;
    const S = C.TOTAL_SUPPLY;
    // insiders are only partly detectable (they look like normal early buyers)
    return { holders: n, top10: top10 / S * 100, dev: dev / S * 100, snipers: snipers / S * 100, bundle: bundle / S * 100, insiders: insiders * 0.6 / S * 100, list: holders };
  };
  P.vol5m = function (tk) {
    let v = 0; const since = this.t - 300;
    for (let i = tk.trades.length - 1; i >= 0 && tk.trades[i].t >= since; i--) v += tk.trades[i].sol;
    return v;
  };
  P.change = function (tk, secs) {
    const c = tk.candles; if (!c.length) return 0;
    const since = this.t - secs;
    let ref = c[0].o;
    for (let i = c.length - 1; i >= 0; i--) { if (c[i].t < since) { ref = c[i].c; break; } }
    return ref > 0 ? (this.mc(tk) / ref - 1) * 100 : 0;
  };

  BH.Sim = Sim;
  BH.FATES = FATES;
})(typeof window !== 'undefined' ? window : globalThis);
