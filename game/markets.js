/* Perpetuals, Predictions and Rewards (the extra terminal tabs). Fake money only.
   - Perps: MEMEX (the made-up meme index) plus simulated crypto, stocks and futures with trading hours, 2-50x, liquidation.
   - Predictions: short bets on live coins and narratives, resolved by the simulation.
   - Rewards: points from your trading volume, tiers, and fee cashback you can claim. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;
  const TIERS = [['Bronze', 0, 0.05], ['Silver', 500, 0.08], ['Gold', 2500, 0.12], ['Platinum', 10000, 0.18], ['Diamond', 40000, 0.25]];

  // ---------------- Perpetuals ----------------
  // MEMEX (the meme-market index, made up) plus simulated crypto, stocks and futures. Prices are a random walk with
  // realistic daily volatility (1 game day = 1440 s), a shared crypto factor (which also follows SOL), a shared stock
  // factor, trading hours (stocks 9:30-16:00 on weekdays and they gap at the open; futures pause 17:00-18:00) and
  // per-market max leverage. Not real prices. They use their own random stream so the meme market stays the same.
  const DAY_S = 1440;
  const MARKETS = [
    // id, name, kind, start price, daily vol (fraction), max leverage, factor beta
    ['MEMEX', 'Meme index (made up)', 'Index', 100, 0, 50, 0],
    ['BTC', 'Bitcoin', 'Crypto', 95000, 0.03, 50, 1.0], ['ETH', 'Ether', 'Crypto', 3400, 0.04, 50, 1.2], ['SOL', 'Solana (live SOL price)', 'Crypto', 0, 0, 50, 0],
    ['DOGE', 'Dogecoin', 'Crypto', 0.18, 0.06, 25, 1.4], ['XRP', 'XRP', 'Crypto', 2.2, 0.05, 25, 1.1], ['AVAX', 'Avalanche', 'Crypto', 28, 0.055, 25, 1.3], ['LINK', 'Chainlink', 'Crypto', 18, 0.05, 25, 1.2],
    ['AAPL', 'Apple', 'Stock', 230, 0.015, 10, 0.9], ['TSLA', 'Tesla', 'Stock', 330, 0.035, 10, 1.6], ['NVDA', 'Nvidia', 'Stock', 180, 0.03, 10, 1.5], ['MSFT', 'Microsoft', 'Stock', 470, 0.013, 10, 0.9],
    ['AMZN', 'Amazon', 'Stock', 220, 0.018, 10, 1.1], ['META', 'Meta', 'Stock', 680, 0.022, 10, 1.2], ['GME', 'GameStop', 'Stock', 26, 0.06, 5, 1.0], ['COIN', 'Coinbase', 'Stock', 300, 0.04, 10, 1.3], ['MSTR', 'Strategy', 'Stock', 380, 0.05, 5, 1.4],
    ['ES', 'S&P 500 futures', 'Future', 6400, 0.01, 25, 1.0], ['NQ', 'Nasdaq 100 futures', 'Future', 23000, 0.013, 25, 1.25], ['GC', 'Gold futures', 'Future', 3500, 0.01, 25, 0],
    ['SI', 'Silver futures', 'Future', 40, 0.018, 25, 0], ['CL', 'Crude oil futures', 'Future', 65, 0.025, 20, 0], ['NG', 'Natural gas futures', 'Future', 3.4, 0.04, 10, 0],
  ].map(([id, name, kind, p0, vol, maxLev, beta]) => ({ id, name, kind, p0, vol, maxLev, beta }));
  const MK = Object.fromEntries(MARKETS.map((m) => [m.id, m]));
  function mulberry(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function fmtP(p) { return p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 0 }) : p >= 10 ? p.toFixed(2) : p >= 1 ? p.toFixed(3) : p.toFixed(4); }

  function Perps(game, saved) {
    this.game = game; this.price = 100; this.hist = []; this.pos = []; this.seq = 0; this.closed = []; this.vol = 0.0025;
    this.mk = {}; this.rs = 1234567; this.sel = 'MEMEX'; this.lastSol = null;
    if (saved) Object.assign(this, saved, { game });
    for (const m of MARKETS) if (m.id !== 'MEMEX' && !this.mk[m.id]) this.mk[m.id] = { price: m.id === 'SOL' ? (C.SOL_USD || 83) : m.p0, hist: [], wasOpen: true };
    this._r = mulberry(this.rs);
  }
  Perps.MARKETS = MARKETS; Perps.fmtP = fmtP;
  Perps.prototype.save = function () {
    const mk = {}; for (const [k, v] of Object.entries(this.mk)) mk[k] = { price: v.price, hist: v.hist.slice(-300), wasOpen: v.wasOpen };
    return { price: this.price, hist: this.hist.slice(-600), pos: this.pos, seq: this.seq, closed: this.closed.slice(-40), vol: this.vol, mk, rs: Math.floor(this._r() * 2147483647), sel: this.sel };
  };
  Perps.prototype.market = function (id) { return MK[id || 'MEMEX']; };
  Perps.prototype.priceOf = function (id) { return !id || id === 'MEMEX' ? this.price : (this.mk[id] ? this.mk[id].price : NaN); };
  Perps.prototype.histOf = function (id) { return !id || id === 'MEMEX' ? this.hist : (this.mk[id] ? this.mk[id].hist : []); };
  // like perp DEXes, every market trades 24/7. Stocks are busiest in the US session (Mon-Fri 9:30-16:00 game time) and calm
  // overnight; futures calm down on weekends. Day 1 is a Monday.
  Perps.prototype.isOpen = function (id) { return !!MK[id || 'MEMEX']; };
  Perps.prototype.session = function (id) {
    const m = MK[id || 'MEMEX'], ck = this.game.clock; if (!m || !ck) return { live: true, mul: 1, text: '24/7' };
    const h = ck.hour, wd = (ck.day - 1) % 7, weekday = wd < 5;
    if (m.kind === 'Stock') { const live = weekday && h >= 9.5 && h < 16; return { live, mul: live ? 1.35 : 0.45, text: live ? 'US session open' : 'After hours (calmer)' }; }
    if (m.kind === 'Future') return { live: weekday, mul: weekday ? 1 : 0.5, text: weekday ? 'Futures session' : 'Weekend (calmer)' };
    return { live: true, mul: 1, text: '24/7' };
  };
  Perps.prototype.hoursText = function (id) { return this.session(id).text; };
  // change over the last `secs` game seconds, in %
  Perps.prototype.change = function (id, secs) {
    const h = this.histOf(id); if (!h.length) return 0;
    const now = this.priceOf(id), t0 = h[h.length - 1].t - (secs || 600); let ref = h[0].p;
    for (let i = h.length - 1; i >= 0; i--) { if (h[i].t <= t0) { ref = h[i].p; break; } }
    return (now / ref - 1) * 100;
  };
  Perps.prototype.onStep = function (dt) {
    const sim = this.game.sim, r = sim.r, s = this.game.sys.social;
    // MEMEX: the meme market (same as before, on the sim's own random stream)
    let heat = 0; if (s) { for (const n of BH.Social.NARRATIVES) heat += s.heat[n.id]; heat /= BH.Social.NARRATIVES.length; }
    const drift = (heat - 30) / 30 * 0.00004 * dt;
    const shock = r.normal() * this.vol * Math.sqrt(dt);
    const jump = r() < 0.0008 * dt ? r.range(-0.08, 0.06) : 0;
    this.price = Math.max(1, this.price * Math.exp(drift + shock + jump));
    const t = Math.floor(sim.t);
    const last = this.hist[this.hist.length - 1];
    if (!last || last.t !== t) this.hist.push({ t, p: this.price }); else last.p = this.price;
    if (this.hist.length > 900) this.hist.shift();
    // the other markets, on their own random stream
    const R = this._r, nrm = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const sq = Math.sqrt(dt / DAY_S), solNow = C.SOL_USD || 83, solRet = this.lastSol ? Math.log(solNow / this.lastSol) : 0; this.lastSol = solNow;
    const cryptoF = nrm() * 0.025 * sq + solRet * 0.6, stockF = nrm() * 0.009 * sq;
    for (const m of MARKETS) {
      if (m.id === 'MEMEX') continue;
      const st = this.mk[m.id];
      if (m.id === 'SOL') st.price = solNow;
      else {
        const ses = this.session(m.id);
        if (!ses.live) st.wasOpen = false;
        let ret = nrm() * m.vol * sq * (m.beta ? 0.75 : 1) * ses.mul;
        if (m.kind === 'Crypto') ret += m.beta * cryptoF; else if (m.beta) ret += m.beta * stockF;
        if (ses.live && !st.wasOpen) { ret += nrm() * m.vol * 0.3; st.wasOpen = true; }   // a jump when the session opens
        if (R() < 0.00004 * dt) ret += (R() < 0.5 ? -1 : 1) * m.vol * (1 + R() * 2);   // news / earnings jump
        st.price = Math.max(m.p0 * 0.02, st.price * Math.exp(ret));
      }
      const h = st.hist, lt = h[h.length - 1];
      if (!lt || t - lt.t >= 2) { h.push({ t, p: st.price }); if (h.length > 400) h.shift(); } else lt.p = st.price;
    }
    for (const p of this.pos.slice()) { const pnl = this.pnl(p); if (pnl <= -p.margin * 0.9) this.close(p.id, true); }
  };
  Perps.prototype.pnl = function (p) { const ch = this.priceOf(p.mk) / p.entry - 1; return p.margin * p.lev * (p.side === 'long' ? ch : -ch); };
  Perps.prototype.liqPrice = function (p) { const k = 0.9 / p.lev; return p.side === 'long' ? p.entry * (1 - k) : p.entry * (1 + k); };
  Perps.prototype.open = function (side, margin, lev, mkId) {
    const pl = this.game.player, m = MK[mkId || 'MEMEX'];
    if (!m) return { ok: false, reason: 'Unknown market' };
    if (!this.isOpen(m.id)) return { ok: false, reason: m.id + ' is closed (' + this.hoursText(m.id) + ')' };
    lev = Math.max(2, Math.min(m.maxLev, Math.round(lev))); margin = +margin;
    const fee = margin * lev * 0.0005;
    if (!(margin > 0) || margin + fee > pl.sol) return { ok: false, reason: 'Not enough SOL (margin + fee)' };
    pl.sol -= margin + fee;
    const p = { id: 'pp' + (++this.seq), mk: m.id, side, lev, margin, entry: this.priceOf(m.id), at: this.game.sim.t };
    this.pos.push(p); this.game.emit('volume', margin * lev);
    return { ok: true, text: (side === 'long' ? 'Long ' : 'Short ') + lev + 'x ' + m.id + ' at ' + fmtP(p.entry) };
  };
  Perps.prototype.close = function (id, liquidated) {
    const i = this.pos.findIndex((p) => p.id === id); if (i < 0) return { ok: false, reason: 'No position' };
    const p = this.pos[i], mkId = p.mk || 'MEMEX';
    if (!liquidated && !this.isOpen(mkId)) return { ok: false, reason: mkId + ' is closed (' + this.hoursText(mkId) + ')' };
    const pnl = liquidated ? -p.margin : this.pnl(p);
    const back = Math.max(0, p.margin + pnl - (liquidated ? 0 : p.margin * p.lev * 0.0005));
    this.game.player.sol += back; this.pos.splice(i, 1);
    this.closed.push({ mk: mkId, side: p.side, lev: p.lev, pnl: back - p.margin, entry: p.entry, exit: this.priceOf(mkId), liq: !!liquidated });
    if (this.closed.length > 60) this.closed.shift();
    if (liquidated) this.game.emit('toast', { kind: 'bad', text: 'Liquidated: ' + p.lev + 'x ' + p.side + ' ' + mkId });
    return { ok: true, text: liquidated ? 'Liquidated' : 'Closed ' + mkId + ' for ' + (back - p.margin >= 0 ? '+' : '') + (back - p.margin).toFixed(3) + ' SOL' };
  };
  BH.Perps = Perps;

  // ---------------- Predictions ----------------
  function Predict(game, saved) {
    this.game = game; this.open = []; this.done = []; this.bets = []; this.seq = 0; this.next = 0;
    if (saved) Object.assign(this, saved, { game });
  }
  Predict.prototype.save = function () { return { open: this.open, done: this.done.slice(-30), bets: this.bets, seq: this.seq, next: this.next }; };
  Predict.prototype.make = function () {
    const sim = this.game.sim, r = sim.r, s = this.game.sys.social;
    const live = sim.tokens.filter((t) => !t.dead);
    const roll = r();
    const final = live.filter((t) => t.stage === 'curve' && sim.progress(t) > 45);
    if (roll < 0.4 && final.length) {
      const tk = final[r.int(0, final.length - 1)];
      const p = Math.min(0.85, Math.max(0.15, sim.progress(tk) / 100 * 0.7 + Math.min(0.3, tk.hype / 6)));
      this.open.push({ id: 'pm' + (++this.seq), kind: 'grad', coin: tk.id, q: 'Will $' + tk.ticker + ' graduate in the next 5 minutes?', ends: sim.t + 300, odds: { yes: p, no: 1 - p } });
    } else if (roll < 0.75 && live.length) {
      const tk = live.sort((a, b) => sim.vol5m(b) - sim.vol5m(a))[r.int(0, Math.min(5, live.length - 1))];
      const mc = sim.mc(tk), target = mc * r.range(1.2, 2);
      this.open.push({ id: 'pm' + (++this.seq), kind: 'above', coin: tk.id, target, q: 'Will $' + tk.ticker + ' be above ' + BH.fmt.usd(target) + ' in 3 minutes?', ends: sim.t + 180, odds: { yes: 0.3, no: 0.7 } });
    } else if (s) {
      const top = s.hottest().slice(0, 3);
      const tot = top.reduce((a, n) => a + s.heat[n.id], 0) || 1, odds = {};
      for (const n of top) odds[n.id] = Math.max(0.1, s.heat[n.id] / tot);
      this.open.push({ id: 'pm' + (++this.seq), kind: 'nar', q: 'Which narrative will be hottest in 4 minutes?', ends: sim.t + 240, odds, labels: Object.fromEntries(top.map((n) => [n.id, n.label])) });
    }
  };
  Predict.prototype.bet = function (mid, pick, stake) {
    const m = this.open.find((x) => x.id === mid), pl = this.game.player;
    if (!m || m.odds[pick] == null) return { ok: false, reason: 'That market closed' };
    if (this.game.sim.t > m.ends - 30) return { ok: false, reason: 'Betting closed (last 30 s)' };
    if (this.decided(m) != null) return { ok: false, reason: 'Already decided' };
    if (!(stake > 0) || stake > pl.sol) return { ok: false, reason: 'Not enough SOL' };
    pl.sol -= stake; this.bets.push({ mid, pick, stake, payout: stake / m.odds[pick] * 0.95 });
    return { ok: true, text: 'Bet placed: pays ' + (stake / m.odds[pick] * 0.95).toFixed(3) + ' SOL if right' };
  };
  // a market whose answer is already known (coin graduated or died) settles right away
  Predict.prototype.decided = function (m) {
    const tk = m.coin && this.game.sim.byId.get(m.coin);
    if (m.kind === 'grad') { if (tk && tk.stage === 'amm') return 'yes'; if (!tk || tk.dead) return 'no'; }
    if (m.kind === 'above' && (!tk || tk.dead)) return 'no';
    return null;
  };
  Predict.prototype.onStep = function () {
    const sim = this.game.sim;
    if (sim.t >= this.next) { this.next = sim.t + 60 + sim.r() * 60; if (this.open.length < 6) this.make(); }
    for (let i = this.open.length - 1; i >= 0; i--) {
      const m = this.open[i]; const early = this.decided(m); if (sim.t < m.ends && early == null) continue;
      const tk = m.coin && sim.byId.get(m.coin);
      let ans;
      if (early != null) ans = early;
      else if (m.kind === 'grad') ans = tk && tk.stage === 'amm' ? 'yes' : 'no';
      else if (m.kind === 'above') ans = tk && !tk.dead && sim.mc(tk) >= m.target ? 'yes' : 'no';
      else { const s = this.game.sys.social; ans = Object.keys(m.odds).sort((a, b) => s.heat[b] - s.heat[a])[0]; }
      m.answer = ans; this.open.splice(i, 1); this.done.push(m); if (this.done.length > 40) this.done.shift();
      for (const b of this.bets.filter((x) => x.mid === m.id)) {
        if (b.pick === ans) { this.game.player.sol += b.payout; this.game.emit('toast', { kind: 'buy', text: 'Prediction won: +' + b.payout.toFixed(3) + ' SOL' }); }
        else this.game.emit('toast', { kind: 'fail', text: 'Prediction lost: ' + m.q });
      }
      this.bets = this.bets.filter((x) => x.mid !== m.id);
    }
  };

  // ---------------- Rewards ----------------
  function Rewards(game, saved) {
    this.game = game; this.points = 0; this.cashback = 0; this.claimed = 0; this.feesPaid = 0;
    if (saved) Object.assign(this, saved, { game });
  }
  Rewards.TIERS = TIERS;
  Rewards.prototype.save = function () { return { points: this.points, cashback: this.cashback, claimed: this.claimed, feesPaid: this.feesPaid }; };
  Rewards.prototype.tier = function () { let t = TIERS[0]; for (const x of TIERS) if (this.points >= x[1]) t = x; const i = TIERS.indexOf(t); return { name: t[0], rate: t[2], next: TIERS[i + 1] || null, idx: i }; };
  Rewards.prototype.onTrade = function (tk, tr) {
    if (!tr.you) return;
    const fee = tr.sol * (tk.stage === 'curve' ? this.game.sim.cv(tk).fee : C.AMM_FEE);
    this.points += tr.sol * 10; this.feesPaid += fee; this.cashback += fee * this.tier().rate;
  };
  Rewards.prototype.claim = function () { if (this.cashback < 0.0001) return { ok: false, reason: 'Nothing to claim yet' }; const v = this.cashback; this.game.player.sol += v; this.claimed += v; this.cashback = 0; return { ok: true, text: 'Claimed ' + v.toFixed(4) + ' SOL cashback' }; };

  BH.Perps = Perps; BH.Predict = Predict; BH.Rewards = Rewards;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'perps', create(game, s) { const x = new Perps(game, s); x.hooks = { step: (dt) => x.onStep(dt) }; return x; } });
  BH.Systems.push({ name: 'predict', create(game, s) { const x = new Predict(game, s); x.hooks = { step: () => x.onStep() }; return x; } });
  BH.Systems.push({ name: 'rewards', create(game, s) { const x = new Rewards(game, s); x.hooks = { trade: (tk, tr) => x.onTrade(tk, tr) }; return x; } });
})(typeof window !== 'undefined' ? window : globalThis);
