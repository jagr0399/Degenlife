/* Callouts, reworked after pump.fun's Callouts (Nov 16, 2026). Extends BH.Trencher (game/trencher.js); old saves keep working.
   - One callout every 6 game hours (1 real minute = 1 game hour, so 6 minutes). A callout posts WITH your buy and shows your real
     entry: call a coin you hold, or Buy & Call (the callout goes out when the buy fills).
   - It goes to your followers as a push notification: a wave of real follower wallets (FOL-*) buys over the next ~40 s, sized by
     your followers and trust. They take half off at 2x and bail at -50%.
   - Each callout tracks: entry market cap, market cap now, peak multiple (max x), and your followers' PnL at 1 h and 4 h
     (60 s / 240 s). A HIT is a peak of 2x or more (pump.fun's caller stats use max multiple and "2x+ rate").
   - NPC callers (the J7 KOLs) make callouts too, with their 2-5 SOL whale buy; their followers are simulated from their follower count.
   - Leaderboard (today / week / all): callers ranked by followers' profit, with calls, hit rate, median and best multiple, rewards.
   - Callout Rewards: every game day a $3,000 pot is split by each caller's share of followers' profit (4 h PnL, never negative).
     Low-cap calls count less (under $30K at call: 35 %, under $100K: 70 %). Paid in cash (USD), like pump.fun's daily USDC.
   No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  if (!BH.Trencher) return;
  const T = BH.Trencher, P = T.prototype, C = BH.C;
  const COOLDOWN_H = 6, H1 = 60, H4 = 240, POT = 3000;
  T.CALLOUT = { COOLDOWN_H, H1, H4, POT };
  const hours = (gm) => (gm.clock ? gm.clock.total : gm.sim.t / 60);
  const dayOf = (gm) => (gm.clock ? gm.clock.day : Math.floor(gm.sim.t / 1440) + 1);
  const lowcap = (mc) => (mc < 30000 ? 0.35 : mc < 100000 ? 0.7 : 1);
  T.lowcap = lowcap;
  const fmtH = (h) => { const m = Math.ceil(h * 60); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm'; };
  T.fmtH = fmtH;
  const mcOfPrice = (p) => p * C.TOTAL_SUPPLY * C.SOL_USD;

  function init(t) {
    if (!t.npc) t.npc = [];
    if (!t.rewards) t.rewards = [];
    if (!t.folQ) t.folQ = [];
    if (t.rewDay == null) t.rewDay = dayOf(t.game);
    if (t.cseq == null) t.cseq = 0;
    if (t.npcNext == null) t.npcNext = t.game.sim.t + 25;
  }

  // ---- your callouts ----
  P.myCallouts = function () { return this.calls.filter((c) => c.v2); };
  P.nextCallIn = function () { const last = this.myCallouts().pop(); return last ? Math.max(0, last.th + COOLDOWN_H - hours(this.game)) : 0; };
  const origCall = P.call;
  P.call = function (coinId, text, opts) {
    init(this); opts = opts || {};
    const gm = this.game, sim = gm.sim, tk = sim.byId.get(coinId);
    if (!tk || tk.dead) return { ok: false, reason: 'That coin is gone' };
    const wait = this.nextCallIn();
    if (wait > 0 && !opts.free) return { ok: false, reason: 'One callout every 6 hours. Next one in ' + fmtH(wait) };
    const pos = gm.player.pos.get(tk.id);
    if (!pos || pos.tokens <= 1) {
      if (opts.buy > 0) {
        const r = gm.player.buy(tk.id, opts.buy);
        if (r && r.ok === false) return r;
        this.pending = { coin: tk.id, text: text || '', until: sim.t + 15 };
        return { ok: true, text: 'Buying ' + opts.buy + ' SOL of $' + tk.ticker + '. Your callout goes out with the fill.' };
      }
      return { ok: false, reason: 'A callout posts with your buy: hold $' + tk.ticker + ' first, or use Buy & Call' };
    }
    const res = origCall.call(this, coinId, text && text.trim() ? text.trim().slice(0, 140) : '$' + tk.ticker + ' 📣', opts);
    if (!res.ok) return res;
    const c = this.calls[this.calls.length - 1];
    const entryMc = pos.tokens > 0 ? mcOfPrice(pos.cost / pos.tokens) : sim.mc(tk);
    Object.assign(c, { v2: true, id: 'co' + (++this.cseq), done: true, live: true, th: hours(gm), entryMc, thesis: (text || '').trim().slice(0, 140), notified: Math.round(this.followers), fol: [], who: 'you' });
    // the push notification: followers ape in over the next ~40 s (front-loaded)
    const r = sim.r, n = Math.max(2, Math.min(45, Math.round(Math.sqrt(this.followers) * (0.22 + this.trust / 220))));
    const big = this.followers > 5000 ? 2 : this.followers > 1500 ? 1.4 : 1;
    for (let i = 0; i < n; i++) { const addr = 'FOL' + c.id + '-' + i; c.fol.push(addr); this.folQ.push({ at: sim.t + 0.8 + r() * r() * 40, coin: tk.id, addr, sol: (0.05 + r() * 0.45) * big }); }
    return { ok: true, text: 'Callout sent: ' + c.notified.toLocaleString() + ' followers notified. Entry ' + BH.fmt.usd(entryMc) + ' MC' };
  };

  // followers' PnL in SOL (realized + what they still hold)
  P.folPnl = function (c) {
    const sim = this.game.sim, tk = sim.byId.get(c.coin); if (!tk) return 0;
    const px = tk.dead ? 0 : sim.price(tk);
    let pnl = 0;
    for (const a of c.fol || []) { const h = tk.holders.get(a); if (h) pnl += h.tokens * px + h.sold - h.bought; }
    return pnl;
  };
  // NPC followers: bought ~followers/8000 SOL; half sold into the peak (up to 3x), half held
  function npcPnl(sim, c) {
    const tk = sim.byId.get(c.coin), now = tk && !tk.dead ? sim.mc(tk) / c.mcAt : 0, maxX = c.peak / c.mcAt;
    return c.folSol * (0.5 * Math.min(maxX, 3) + 0.5 * now - 1);
  }

  // ---- NPC callers: the J7 KOLs make callouts with a whale buy ----
  const THESIS = ['clean chart, dev still holding. small bag', 'this one has a real community', 'early. narrative is hot', 'volume picking up, holders growing', 'cto looks strong here', 'best ticker on the meta', 'chart is a staircase. riding it', 'risky but the setup is there', 'whales are loading quietly', 'my highest conviction today'];
  P.npcCallout = function () {
    const gm = this.game, sim = gm.sim, j = gm.sys.j7, r = sim.r;
    if (!j || !BH.J7) return null;
    const kols = BH.J7.ACCOUNTS.filter((a) => a[7] === 'kol');
    const live = sim.tokens.filter((t) => !t.dead && !t.isPlayer && sim.mc(t) > 8000 && sim.mc(t) < 2e6 && sim.t - t.born < 900);
    if (!kols.length || !live.length) return null;
    const a = kols[r.int(0, kols.length - 1)], acc = j.acc(a[0]), tk = live[r.int(0, live.length - 1)], w = j.wallets[a[0]];
    const mc = sim.mc(tk), sol = 2 + r() * 3;   // whale buy-in, 2-5 SOL
    if (w) sim.exec(tk, w, 'kol', 'buy', sol);
    const thesis = '$' + tk.ticker + ' ' + THESIS[r.int(0, THESIS.length - 1)];
    const tw = j.post(a[0], thesis, { coin: tk.id, kind: 'kol', callout: true, mcAt: mc });
    // a small wave of their followers buys for real
    for (let i = 0; i < 3 + Math.floor(r() * 6 * (a[8] || 0.5)); i++) this.folQ.push({ at: sim.t + 1 + r() * 20, coin: tk.id, addr: BH.Names.addr(sim.r), sol: 0.1 + r() * 0.8 });
    if (tk.dir) tk.dir.off = (tk.dir.off || 0) + 0.03 + r() * 0.06;
    const c = { id: 'co' + (++this.cseq), npc: true, who: a[0], coin: tk.id, ticker: tk.ticker, mcAt: mc, entryMc: mc, t: sim.t, th: hours(gm), peak: mc, thesis, live: true, notified: acc.followers, folSol: Math.min(80, acc.followers / 8000), tw: tw && tw.id };
    this.npc.push(c); if (this.npc.length > 160) this.npc.splice(0, this.npc.length - 160);
    return c;
  };

  // ---- the step: follower buys, pending Buy & Call, tracking, NPC callouts, daily rewards ----
  const origStep = P.onStep;
  P.onStep = function () {
    const out = origStep.apply(this, arguments);
    init(this);
    const gm = this.game, sim = gm.sim, r = sim.r;
    // Buy & Call: the buy filled, now the callout goes out
    if (this.pending) {
      const pd = this.pending, pos = gm.player.pos.get(pd.coin);
      if (pos && pos.tokens > 1) { this.pending = null; const res = this.call(pd.coin, pd.text); if (gm.emit) gm.emit('toast', { kind: res.ok ? 'call' : 'fail', text: res.ok ? res.text : res.reason }); }
      else if (sim.t > pd.until) this.pending = null;
    }
    for (let i = this.folQ.length - 1; i >= 0; i--) {
      const q = this.folQ[i]; if (sim.t < q.at) continue;
      this.folQ.splice(i, 1);
      const tk = sim.byId.get(q.coin); if (tk && !tk.dead) sim.exec(tk, q.addr, 'retail', 'buy', q.sol);
    }
    // your live callouts
    for (const c of this.calls) {
      if (!c.v2 || !c.live) continue;
      const tk = sim.byId.get(c.coin), age = sim.t - c.t;
      if (tk && !tk.dead) {
        const mc = sim.mc(tk); c.peak = Math.max(c.peak, mc); c.now = mc;
        // followers take half at 2x, bail at -50%
        if (!c.tp && mc >= c.mcAt * 2) { c.tp = true; for (const a of c.fol) { const h = tk.holders.get(a); if (h && h.tokens > 1) sim.exec(tk, a, 'retail', 'sell', h.tokens * 0.5); } }
        if (!c.sl && age > 20 && mc <= c.mcAt * 0.5) { c.sl = true; for (const a of c.fol) { const h = tk.holders.get(a); if (h && h.tokens > 1) sim.exec(tk, a, 'retail', 'sell', h.tokens); } }
      } else c.now = 0;
      if (c.pnl1h == null && age >= H1) c.pnl1h = this.folPnl(c);
      if (age >= H4 || !tk) {
        c.pnl4h = this.folPnl(c); c.live = false; c.maxX = c.peak / c.mcAt; c.hit = c.maxX >= 2; c.day = dayOf(gm);
        c.score = Math.max(0, c.pnl4h) * lowcap(c.mcAt);
        if (c.hit) this.hits++; else this.misses++;
        const rugged = tk && (tk.rugged || tk.dead);
        if (c.pnl4h > 0) { this.bump('followers', Math.min(0.25, 0.03 + c.pnl4h / 40)); this.bump('trust', 3); }
        else if (!rugged) { this.bump('followers', -0.02); this.bump('trust', -2); }
        if (gm.emit) gm.emit('toast', { kind: c.pnl4h >= 0 ? 'buy' : 'info', text: 'Callout $' + c.ticker + ' closed: peak ' + c.maxX.toFixed(2) + 'x' + (c.hit ? ' (hit)' : '') + ', followers ' + (c.pnl4h >= 0 ? '+' : '') + c.pnl4h.toFixed(2) + ' SOL' });
      }
    }
    // NPC callouts
    for (const c of this.npc) {
      if (!c.live) continue;
      const tk = sim.byId.get(c.coin), age = sim.t - c.t;
      if (tk && !tk.dead) { const mc = sim.mc(tk); c.peak = Math.max(c.peak, mc); c.now = mc; } else c.now = 0;
      if (c.pnl1h == null && age >= H1) c.pnl1h = npcPnl(sim, c);
      if (age >= H4 || !tk) { c.pnl4h = npcPnl(sim, c); c.live = false; c.maxX = c.peak / c.mcAt; c.hit = c.maxX >= 2; c.day = dayOf(gm); c.score = Math.max(0, c.pnl4h) * lowcap(c.mcAt); }
    }
    if (sim.t >= this.npcNext) { this.npcNext = sim.t + 35 + r() * 55; this.npcCallout(); }
    // daily Callout Rewards
    const d = dayOf(gm);
    if (d > this.rewDay) { this.payRewards(this.rewDay); this.rewDay = d; }
    return out;
  };

  // split the day's pot by share of followers' profit
  P.dayScores = function (day) {
    const s = {};
    for (const c of this.myCallouts()) if (!c.live && c.day === day) s.you = (s.you || 0) + (c.score || 0);
    for (const c of this.npc || []) if (!c.live && c.day === day) s[c.who] = (s[c.who] || 0) + (c.score || 0);
    return s;
  };
  P.payRewards = function (day) {
    const s = this.dayScores(day), total = Object.values(s).reduce((a, b) => a + b, 0);
    const mine = s.you || 0, usd = total > 0 ? Math.round(POT * mine / total * 100) / 100 : 0;
    const rank = Object.entries(s).sort((a, b) => b[1] - a[1]).findIndex(([k]) => k === 'you') + 1;
    this.rewards.push({ day, usd, rank: rank || null, of: Object.keys(s).length, share: total > 0 ? mine / total : 0 });
    if (this.rewards.length > 60) this.rewards.shift();
    if (usd > 0 && this.game.bills) this.game.bills.cash += usd;
    if (this.game.emit && (usd > 0 || this.myCallouts().some((c) => c.day === day))) this.game.emit('toast', { kind: usd > 0 ? 'buy' : 'info', text: usd > 0 ? 'Callout Rewards for day ' + day + ': $' + usd.toFixed(2) + ' (rank #' + rank + ')' : 'No Callout Rewards for day ' + day + ': your followers did not profit' });
    return usd;
  };
  P.rewardsTotal = function () { return (this.rewards || []).reduce((a, x) => a + x.usd, 0); };

  // ---- stats and leaderboard ----
  const median = (xs) => { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  function stats(list) {
    const done = list.filter((c) => !c.live), xs = done.map((c) => c.maxX || 1);
    return { calls: list.length, closed: done.length, hits: done.filter((c) => c.hit).length, hitRate: done.length ? done.filter((c) => c.hit).length / done.length : 0, median: median(xs), best: xs.length ? Math.max(...xs) : 0, pnl: done.reduce((a, c) => a + (c.pnl4h || 0), 0) };
  }
  P.myStats = function () { return stats(this.myCallouts()); };
  // period: 'day' | 'week' | 'all'
  P.leaderboard = function (period) {
    init(this);
    const d = dayOf(this.game), keep = (c) => period === 'all' || (period === 'week' ? (c.day || d) > d - 7 : (c.day || d) === d);
    const by = { you: this.myCallouts().filter(keep) };
    for (const c of this.npc) if (keep(c)) (by[c.who] = by[c.who] || []).push(c);
    const today = this.dayScores(d), tot = Object.values(today).reduce((a, b) => a + b, 0);
    return Object.entries(by).filter(([k, l]) => l.length || k === 'you').map(([who, l]) => Object.assign({ who, est: tot > 0 ? POT * (today[who] || 0) / tot : 0 }, stats(l))).sort((a, b) => b.pnl - a.pnl || b.hitRate - a.hitRate);
  };
  // the callout feed: yours and the NPCs', newest first
  P.feed = function (n) { init(this); return this.myCallouts().concat(this.npc).sort((a, b) => b.t - a.t).slice(0, n || 40); };
})(typeof window !== 'undefined' ? window : globalThis);
