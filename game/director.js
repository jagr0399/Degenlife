/* The chart director: every new coin secretly gets a fate (dead on arrival, rug, pump and dump, whale-driven, slow runner)
   and one random real chart of that type (assets/templates/templates.json, built from real Solana memecoins), time-stretched,
   scaled and noised so no two coins look the same. Each step the director places buys and sells, tagged as
   whale / dev / sniper / insider / retail, that steer the bonding curve or pool along that path. Your own trades still move
   the price; the director only pulls it back gradually. If a fate has no real templates yet, a generated shape is used.
   It also gives each coin hints (top holder %, dev %, insiders, LP locked, X account age) that lean toward the truth, with noise. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;
  // round-2 study mix (most launches die, about 1 in 5 makes something): see game/archetypes.js for how each fate becomes an archetype
  const WEIGHTS = [['doa', 0.41], ['rug', 0.22], ['pnd', 0.12], ['whale', 0.03], ['runner', 0.22]];
  const LABEL = { doa: 'Dead on arrival', rug: 'Rug pull', pnd: 'Pump and dump', whale: 'Whale-driven', runner: 'Slow runner' };
  const realTicks = () => { if (!BH.RealTicks && typeof require === 'function') { try { require('./realticks.js'); } catch (e) { BH.RealTicks = []; } } return BH.RealTicks; };
  let TEMPLATES = null;   // { doa: [{src, c: [[o,h,l,c,v],...]}], ... } prices relative to the first open, volume relative to the median

  // generated fallback shapes (used when a fate has no real templates)
  function gen(type, r) {
    const out = []; let p = 1;
    const push = (o, c, v) => { const h = Math.max(o, c) * (1 + r() * 0.04), l = Math.min(o, c) * (1 - r() * 0.04); out.push([o, h, l, c, v]); };
    const n = { doa: 40, rug: 70, pnd: 90, whale: 110, runner: 160 }[type] || 160;
    const rugAt = r.int(25, 55), peak = r.int(8, 25), wAt = r.int(10, 40);
    for (let i = 0; i < n; i++) {
      let o = p, v = 1;
      if (type === 'doa') p *= i < 4 ? 1 + r() * 0.2 : 1 - r() * 0.05;
      if (type === 'rug') { if (i < rugAt) p *= 1 + (r() - 0.35) * 0.12; else if (i === rugAt) { p *= r.range(0.05, 0.2); v = 12; } else p *= 1 + (r() - 0.5) * 0.02; }
      if (type === 'pnd') { if (i < peak) { p *= 1 + r() * 0.25; v = 4; } else p *= 1 + (r() - 0.6) * 0.1; }
      if (type === 'whale') { if (i === wAt) { p *= r.range(1.8, 3.5); v = 9; } else if (i > wAt && r() < 0.5) p *= 1 + (r() - 0.35) * 0.08; else p *= 1 + (r() - 0.55) * 0.05; }
      if (type === 'runner') { p *= 1 + (r() - 0.4) * 0.07; if (r() < 0.05) p *= 0.78; }
      push(o, p, v * (0.5 + r()));
    }
    return { src: 'generated', c: out };
  }

  function Director(game, saved) {
    this.game = game; this.counts = {}; this.force = null;
    if (saved) Object.assign(this, saved, { game, force: null });
  }
  const P = Director.prototype;
  Director.LABEL = LABEL; Director.WEIGHTS = WEIGHTS;
  Director.setTemplates = function (t) { TEMPLATES = t; };
  Director.templates = function () { return TEMPLATES; };
  P.save = function () { return { counts: this.counts }; };

  P.pickFate = function (r) {
    if (this.force) return this.force;
    if (this.forceOnce) { const f = this.forceOnce; this.forceOnce = null; return f; }   // a market-day event asked for one
    const days = this.game.sys && this.game.sys.days, W = days ? WEIGHTS.map(([k, w]) => [k, w * days.fateMul(k)]) : WEIGHTS;   // the day's mood leans the dice
    let tot = 0; for (const [, w] of W) tot += w;
    let x = r() * tot; for (const [k, w] of W) { if ((x -= w) < 0) return k; } return 'doa';
  };
  P.template = function (type, r) {
    const list = TEMPLATES && TEMPLATES[type];
    return list && list.length && r() < 0.85 ? list[r.int(0, list.length - 1)] : gen(type, r);
  };

  P.onLaunch = function (tk, r) {
    if (tk.style) return;   // a scripted test style owns this coin
    const forced = this.force || this.forceOnce; if (tk.copyOf && !forced) { tk.fate2 = r() < 0.75 ? 'doa' : 'rug'; } else { if (forced) { tk.copyOf = null; tk.forcedFate = true; } tk.fate2 = this.pickFate(r); }   // a forced fate (scenes, market days, celebrity tweets) beats the copycat rule
    this.counts[tk.fate2] = (this.counts[tk.fate2] || 0) + 1;
    const T = this.template(tk.fate2, r);
    // seconds per template candle: slow runners play out longest
    const sec = T.sec ? T.sec * (T.arch === 'H' || T.arch === 'J' ? 1 : 0.85 * Math.pow(1.35 / 0.85, r()))   /* each coin plays at its own pace (0.85-1.35x) */ : { doa: r.range(3, 5), rug: r.range(3, 7), pnd: r.range(3, 6), whale: r.range(3, 7), runner: r.range(5, 10) }[tk.fate2] || r.range(5, 10);   // (mega and legend set their own speed when their modules are loaded)
    const amp = T.arch ? r.range(0.9, 1.1) : r.range(0.75, 1.3);   // how dramatic this copy is (archetypes are calibrated, so less)
    tk.dir = { src: T.src, c: T.c, sec, amp, t0: this.game.sim.t + 1, mc0: null, off: 0, noise: 0, seed: r.int(1, 1e6), done: false, rugged: false, warned: false, arch: T.arch || null, endHype: T.endHype, devBuy: T.devBuy || 0, momArch: T.mom != null ? T.mom : null };
    // archetype I: a copycat of a coin that's running: same name, and it rides the parent's moves
    if (T.ride) { const sim = this.game.sim, par = sim.tokens.filter((x) => !x.dead && x !== tk && !x.isPlayer && sim.mc(x) > 40000 && (x.fate2 === 'runner' || x.fate2 === 'mega' || x.fate2 === 'legend')).sort((a, b) => sim.vol5m(b) - sim.vol5m(a))[0]; if (par) { tk.name = par.name; tk.ticker = par.ticker; tk.img = par.img; tk.realImg = par.realImg; tk.custom = true; tk.dir.rideOf = par.id; } }
    if (T.arch) tk.arch = T.arch;   // the launch archetype (A-H), secret like the fate
    tk.fate = 'x-dir';   // the core dev script stands down; the director runs this coin
    tk.plan.graduates = false;
    // hints: lean toward the truth, with noise
    const f = tk.fate2, bad = f === 'rug' || f === 'pnd', good = f === 'runner' || f === 'whale';
    const nz = () => r.range(-1, 1);
    tk.hint = {
      top: Math.round(Math.max(8, Math.min(70, (bad ? 34 : good ? 20 : 26) + nz() * 12))),
      dev: Math.round(Math.max(0, Math.min(25, (f === 'rug' ? 9 : 4) + nz() * 5)) * 10) / 10,
      insiders: Math.max(0, Math.round((bad ? 5 : 2) + nz() * 3)),
      lp: r() < (f === 'rug' ? 0.25 : bad ? 0.5 : good ? 0.85 : 0.6),
      xAge: Math.max(0, Math.round((f === 'rug' ? 3 : good ? 60 : 12) * (0.3 + r() * 1.7))),
    };
    if (tk.dd && tk.dd.acc) tk.dd.acc.joined = tk.hint.xAge < 2 ? 'today' : tk.hint.xAge + ' days ago';
  };

  // SOL to buy (or tokens to sell) to move this coin's price to `targetMc`
  // crowd tuning (human-chart spec): trade rate scale, chance a burst continues, how sharply trades lean toward the path, momentum
  const TUNE = { RATE: +(g.process && g.process.env.H_RATE || 0.09), CLU: +(g.process && g.process.env.H_CLU || 0.42), TEMP: +(g.process && g.process.env.H_TEMP || 0.18), MOM: +(g.process && g.process.env.H_MOM || 0.5), PUSHG: +(g.process && g.process.env.H_PUSHG || 0.12), SOLMED: +(g.process && g.process.env.H_SOLMED || 0.08) };
  Director.TUNE = TUNE;
  function steer(sim, tk, targetMc) {
    const mc = sim.mc(tk); if (!(mc > 0) || !(targetMc > 0)) return null;
    const ratio = targetMc / mc;
    if (Math.abs(Math.log(ratio)) < 0.0002) return null;
    const curve = tk.stage === 'curve';
    const x = curve ? tk.vSol : tk.poolSol, y = curve ? tk.vTok : tk.poolTok;
    const k = x * y, x2 = x * Math.sqrt(ratio);   // price = x / y = x^2 / k
    if (ratio > 1) { const fee = curve ? sim.cv(tk).fee : C.AMM_FEE; return { side: 'buy', amt: (x2 - x) / (1 - fee) }; }
    return { side: 'sell', amt: k / x2 - y };
  }

  // Where the real chart says the price should be, inside template candle i at fraction fr.
  // Open -> first extreme -> second extreme -> close, eased, with the timing of the extremes different for every candle.
  function pathRel(D, i, fr) {
    const k = D.c[i];
    const u = (n) => { const x = Math.sin(D.seed * 12.9898 + i * 78.233 + n * 37.719) * 43758.5453; return x - Math.floor(x); };
    const t1 = 0.12 + 0.33 * u(1), t2 = Math.min(0.93, t1 + 0.18 + 0.4 * u(2));
    // green candles usually dip first, red ones usually pop first, but not always
    const lowFirst = (k[3] >= k[0]) !== (u(3) < 0.22);
    // a real minute's wick is a price touched for a moment; replayed in a few seconds it would be a rollercoaster,
    // so the path only reaches part of the way into each wick (how far differs per candle); the crowd draws the rest
    const top = Math.max(k[0], k[3]), bot = Math.min(k[0], k[3]);
    const hi = top + (k[1] - top) * (0.15 + 0.5 * u(4)), lo = bot - (bot - k[2]) * (0.15 + 0.5 * u(5));
    const p = lowFirst ? [k[0], lo, hi, k[3]] : [k[0], hi, lo, k[3]], t = [0, t1, t2, 1];
    const sgm = fr < t1 ? 0 : fr < t2 ? 1 : 2;
    const x = (fr - t[sgm]) / (t[sgm + 1] - t[sgm]), e = x * x * (3 - 2 * x);
    return p[sgm] + (p[sgm + 1] - p[sgm]) * e;
  }

  // one crowd trade: who buys (a fresh wallet, the scalper, someone adding to a bag, a whale on a push) or who sells (someone holding enough)
  P.act = function (tk, D, side, amt, push, i, volSpike) {
    const sim = this.game.sim, r = sim.r, st = { amt };
    if (side === 'buy') {
      const kind = push && st.amt > 1 ? 'whale' : sim.t - tk.born < 20 ? 'sniper' : r() < 0.12 ? 'insider' : 'retail';
      let addr = kind === 'whale' ? (D.pwI === i && (D.pwN = (D.pwN || 0) + 1) < 5 ? D.pw : (D.pwI = i, D.pwN = 0, D.pw = BH.Names.addr(r))) : kind === 'insider' ? (D.ins || (D.ins = BH.Names.addr(r))) : kind === 'sniper' ? (D.snp || (D.snp = BH.Names.addr(r))) : null;
      // every busy coin has a scalper who flips small bags over and over (one real wallet made 136 trades in 24 minutes)
      if (!D.scalp || sim.t > (D.scalpUntil || 0)) { D.scalp = BH.Names.addr(r); D.scalpUntil = sim.t + r.range(90, 300); }   // scalpers come and go
      if (!addr && !push && r() < 0.12) addr = D.scalp;
      // a third of retail buys are people adding to a bag they already hold
      if (!addr && tk.hl.length > 6 && r() < 0.33) { const h = tk.hl[Math.floor(r() * tk.hl.length)]; if (h && h.kind === 'retail') addr = h.addr; }
      const fb = sim.exec(tk, addr || BH.Names.addr(r), kind, 'buy', Math.max(0.005, st.amt));
      if (fb && kind === 'whale') { const hb = tk.holders.get(addr); if (hb) hb.pt = sim.t; }
    } else {
      // sells come from someone who holds the coin: the whale or insiders on a push, otherwise a random holder
      // (never you, your firm or your copy traders, and never the dev before a rug)
      const WH = this.game.sys.whales;
      const part = st.amt, ok = (x) => x && x.tokens >= part && x.addr !== 'YOU' && x.addr !== D.pw && !(String(x.addr).startsWith('FIRM-') || String(x.addr).startsWith('COPY-')) && (x.kind !== 'dev' || D.rugged) && !x.rw && x.kind !== 'whale' && !(x.pt && sim.t - x.pt < 60);
      let h = null;
      if (push || volSpike) for (const w of [D.ins, D.snp]) { const x = w && tk.holders.get(w); if (ok(x)) { h = x; break; } }
      if (!h && r() < 0.3) { const x = D.scalp && tk.holders.get(D.scalp); if (ok(x)) h = x; }
      for (let t = 0; t < 10 && !h; t++) { const x = tk.hl[Math.floor(r() * tk.hl.length)]; if (ok(x)) h = x; }
      if (h) sim.exec(tk, h.addr, h.kind, 'sell', part);
      else {
        // the biggest eligible holder, in one pass (no filter + sort over thousands of wallets on every trade)
        let any = null; for (const x of tk.hl) { if (x.tokens > 1 && (!any || x.tokens > any.tokens) && x.addr !== 'YOU' && !x.rw && x.addr !== D.pw && !(x.pt && sim.t - x.pt < 60) && !(String(x.addr).startsWith('FIRM-') || String(x.addr).startsWith('COPY-')) && (x.kind !== 'dev' || D.rugged) && x.kind !== 'whale') any = x; }
        // nobody in the crowd can sell: a whale bag that has sat for a minute sells into it (otherwise the
        // whale owns the float, every sell fails, and the chart can only go up)
        if (!any) for (const x of tk.hl) { if (x.tokens > 1 && (!any || x.tokens > any.tokens) && x.addr !== 'YOU' && !x.rw && !(x.pt && sim.t - x.pt < 60) && !(String(x.addr).startsWith('FIRM-') || String(x.addr).startsWith('COPY-')) && (x.kind !== 'dev' || D.rugged)) any = x; }
        if (any) sim.exec(tk, any.addr, any.kind, 'sell', Math.min(any.tokens, part));
      }
    }
  };

  // ---- the flow crowd (playtest feedback: "candles still look boring and don't match axiom") ----
  // Real 1s charts: a live coin prints nearly every second, each candle has a real body (bigger on small caps), colours come in
  // runs, quiet stretches print dashes, and now and then a needle wick or one big candle made of several buys.
  // So each second is planned as a candle first: a drift toward the path, a heavy-tailed random move sized to the coin's
  // market cap and its current mood, wicks, and then 1-8 trades that walk the price open -> wick -> wick -> close.
  P.flow = function (tk, D, dt, gap, rate, wild, i, k) {
    const sim = this.game.sim, r = sim.r;
    if (!D.F) { const lg = (a, b) => a * Math.pow(b / a, r()); D.F = { vol: lg(0.55, 1.7), act: lg(0.7, 1.6), mom: r.range(0.1, 0.55), wick: lg(0.02, 0.12), big: lg(0.008, 0.04), kap: r.range(0.16, 0.3) }; D.h = 0; D.mo = 0; D.plan = []; }
    const F = D.F, sec = Math.floor(sim.t + 1e-9);
    // the mood: volatility comes in regimes (quiet consolidation, then a lively leg), half-life ~25 s
    D.h = D.h * Math.exp(-dt / 25) + r.normal() * 0.5 * Math.sqrt(2 * dt / 25);
    if (D.fsec !== sec) {
      D.fsec = sec; D.plan = [];
      const RT = realTicks();
      this.study(tk, D, F, sec, gap, rate, wild);   // (the real-tape replay, this.replay, is kept for comparison: RT = realTicks())
      void RT;
    }
    // play the planned trades that are due
    while (D.plan.length && D.plan[0].at <= sim.t + 1e-9 && !tk.dead) {
      // a study plan aims at price levels within the second: if a trade came up short (no holder had enough to sell),
      // the next one makes up the difference, so a frenzy can't ratchet one way. Your own and whales' trades still count.
      const p = D.plan.shift(), now = sim.mc(tk), d = p.lv != null ? p.lv - (D.lvDone || 0) : p.d, st = steer(sim, tk, now * Math.exp(d));
      if (!st || !(st.amt > 0)) { if (p.lv != null) D.lvDone = p.lv; continue; }
      this.act(tk, D, st.side, st.amt, tk.fate2 === 'whale' && !p.fz && Math.abs(d) > 0.03, i, k[4] >= 5);   // (a whale coin's big prints are its whale; a frenzy is the crowd)
      // (a trade that couldn't move the price at all, like a sell at the curve floor, is accepted: the plan moves on)
      if (p.lv != null) { const moved = Math.log(Math.max(1e-9, sim.mc(tk)) / now); D.lvDone = Math.abs(moved) < 1e-6 ? p.lv : (D.lvDone || 0) + moved; }
    }
  };

  // the old synthetic second (only used if game/realticks.js is missing)
  P.synth = function (tk, D, F, sec, gap, rate, wild) {
    const sim = this.game.sim, r = sim.r;
    const lam = rate * 0.5 * F.act * (1 + 0.3 * Math.max(0, D.h));
    if (r() < 1 - Math.exp(-lam)) {
      const mc = sim.mc(tk);
      const sig = Math.max(0.0015, Math.min(0.06, 0.014 * Math.pow(60000 / mc, 0.35))) * F.vol * Math.exp(D.h) * Math.max(0.6, Math.min(2, Math.sqrt(wild / 0.04)));
      // Student-t (3 dof): mostly modest moves, sometimes a big one
      const t3 = r.normal() / Math.sqrt((r.normal() ** 2 + r.normal() ** 2 + r.normal() ** 2) / 3) / 1.73;
      let m = gap * F.kap * (gap > 0.4 || gap < -0.4 ? 1.6 : 1) + sig * Math.max(-6, Math.min(6, t3)) + F.mom * D.mo;
      // one big candle from several same-side buys (or sells), leaning the way the path goes
      if (r() < F.big) m = (r() < 0.5 + Math.max(-0.3, Math.min(0.3, gap * 3)) ? 1 : -1) * sig * r.range(3, 7);
      D.mo = 0.6 * D.mo + 0.4 * (m - gap * F.kap);
      // wicks: usually short, sometimes a needle that tags a level and gets rejected inside the same second
      let wu = r() < 0.55 ? sig * Math.abs(r.normal()) * 0.5 : 0, wl = r() < 0.55 ? sig * Math.abs(r.normal()) * 0.5 : 0;
      if (r() < F.wick) { const w = sig * r.range(2.5, 8); if (r() < 0.5 + Math.max(-0.3, Math.min(0.3, -gap * 2))) wu += w; else wl += w; }
      const hi = Math.max(0, m) + wu, lo = Math.min(0, m) - wl;
      const legs = (m >= 0) !== (r() < 0.25) ? [lo, hi, m] : [hi, lo, m];
      // turn the three legs into trades (a long leg is several trades), at random moments inside the second
      let at = 0, n = 0;
      for (const tgt of legs) {
        const d = tgt - at; at = tgt; if (Math.abs(d) < 1e-4) continue;
        const parts = Math.min(4, 1 + r.poisson(Math.min(3, lam * 0.25 + Math.abs(d) / Math.max(sig, 1e-4) * 0.3)));
        let left = d; for (let q = 0; q < parts; q++) { const p = q === parts - 1 ? left : d / parts * r.range(0.5, 1.5); left -= p; D.plan.push({ d: p }); n++; }
      }
      const ts = D.plan.map(() => r() * 0.95).sort((x, y) => x - y);
      D.plan.forEach((p, j) => { p.at = sec + ts[j]; });
    }
  };

  // ---- replaying real seconds (playtest feedback: "use the data I gave you") ----
  // Every chart plays real recorded trading seconds back to back (docs/research/ticks + coin-5qaP): the price path each
  // second took through its trades, rescaled to this coin's market cap. Quiet stretches, colour runs, needles, bursts and
  // the rhythm between them are all real. The director's path only adds the slow trend on top (a small drift per second).
  const pull = (F, gap) => { const a = Math.abs(gap); return a > 1 ? 0.7 : a > 0.25 ? Math.max(F.kap * 1.6, 0.5) : F.kap; };
  P.replay = function (tk, D, F, sec, gap, rate, RT, wild) {
    const sim = this.game.sim, r = sim.r;
    const W = { 'mihao / SOL': 3, '5qaP main': 3, '5qaP curve': 1 };
    const pick = () => { let tot = 0; for (const x of RT) tot += W[x.name] || 1; let u = r() * tot; for (let j = 0; j < RT.length; j++) { u -= W[RT[j].name] || 1; if (u <= 0) return j; } return 0; };
    // a coin plays one recording from a random second, and now and then the tape jumps to another stretch (a new mood)
    if (D.rt == null || r() < 1 / 400) { D.rt = pick(); D.rp = r.int(0, RT[D.rt].s.length - 1); }
    const T = RT[D.rt];
    const hot = 1 - Math.exp(-rate * 0.2 * F.act);   // a busy coin skips most of the tape's empty seconds; a dead one keeps them
    let x = T.s[D.rp % T.s.length]; D.rp++;
    // a quieter coin than the tape's coin sits out some of the tape's busy seconds (a dead coin barely prints)
    if (x && sim.t - tk.lastTrade <= 20 && r() > hot / Math.max(0.05, T.act)) x = 0;
    // (and a coin still playing its story never sits 20 s without a trade: the feed would delist it)
    const starving = sim.t - tk.lastTrade > 20;
    for (let q = 0; !x && q < 60 && (starving || r() < hot); q++) { x = T.s[D.rp % T.s.length]; D.rp++; }
    // a quiet second on the tape: nothing prints, unless the coin is behind its path (then one trade nudges it)
    if (!x) { const dq = gap * pull(F, gap); if (Math.abs(gap) > 0.1 && r() < Math.min(1, Math.abs(gap) * 2) * Math.max(hot, 0.12)) D.plan.push({ d: dq, at: sec + r() * 0.9 }); return; }
    const mc = sim.mc(tk);
    const want = Math.max(0.0012, Math.min(0.04, 0.008 * Math.pow(60000 / mc, 0.35))) * F.vol * Math.max(0.5, Math.min(2, Math.sqrt((wild || 0.04) / 0.04))) * (tk.fate2 === 'doa' ? 0.6 : 1);   // the median 1s move at this cap
    // the trend: a small drift toward the path, spread over the second's trades
    const drift = gap * pull(F, gap);
    // a coin that's moving hard has bigger candles too (otherwise a pump draws a staircase of dashes)
    const sc = Math.max(0.3, Math.min(60, Math.min(0.04, want + 0.6 * Math.abs(drift)) / T.med));   // (never more than a 4% median move: no runaway)
    const lim = 5 * Math.min(0.04, want + 0.6 * Math.abs(drift));   // a real fat-tail print stays a fat tail, not a 10x
    let pts = x[0]; if (pts.length > 10) { const keep = new Set([0, pts.length - 1]); let hi = 0, lo = 0; pts.forEach((v, j) => { if (v > pts[hi]) hi = j; if (v < pts[lo]) lo = j; }); keep.add(hi); keep.add(lo); while (keep.size < 10) keep.add(r.int(0, pts.length - 1)); pts = [...keep].sort((p, q) => p - q).map((j) => pts[j]); }
    let prev = 0;
    const ts = pts.map(() => r() * 0.95).sort((p, q) => p - q);
    pts.forEach((v, j) => { const tgt = Math.max(-lim, Math.min(lim, v / 1e5 * sc)) + drift * (j + 1) / pts.length; D.plan.push({ d: tgt - prev, at: sec + ts[j] }); prev = tgt; });
  };

  // ---- the Axiom study generator (a 1s chart study of live coins, Nov 2026: 12 coins + this week's runners) ----
  // Every second is drawn from what real 1s candles look like at this coin's stage:
  //   how often a second trades, the candle-size mix, wick odds, colour runs and trades per candle.
  // Small coins move in a few big candles (one candle often does 60-95% of a pump), have almost no wicks
  // and skip seconds; bigger coins grind with lots of opposite colours; hot $1M+ coins trade every
  // second, with wicks. Playtest feedback: "it shouldn't be flat", so dashes stay rare and the mix leans a notch bigger than
  // the study (a 0.3% body is one pixel on a chart spanning 40%, which reads as a dash).
  const STAGE = {
    //        trades a second: dead / normal / hot          body mix: dash, small, medium, big, huge              keep colour  wick  biggest  trades/candle
    nw: { act: [0.10, 0.45, 0.85], mix: [0.01, 0.10, 0.38, 0.30, 0.21], keep: 0.62, wick: 0.025, huge: 0.25, tpc: [2, 6] },
    fs: { act: [0.06, 0.32, 0.72], mix: [0.02, 0.16, 0.40, 0.31, 0.11], keep: 0.66, wick: 0.025, huge: 0.15, tpc: [1, 3] },
    mg: { act: [0.45, 0.75, 1.00], mix: [0.04, 0.34, 0.39, 0.17, 0.06], keep: 0.52, wick: 0.012, huge: 0.12, tpc: [1, 4] },
    bh: { act: [0.60, 1.00, 1.00], mix: [0.06, 0.30, 0.42, 0.20, 0.02], keep: 0.47, wick: 0.13, huge: 0.10, tpc: [8, 14] },    // $1M+ and hot
    bc: { act: [0.55, 0.85, 1.00], mix: [0.10, 0.42, 0.34, 0.12, 0.02], keep: 0.50, wick: 0.02, huge: 0.06, tpc: [1, 3] },     // $1M+ and cooling
  };
  // FRENZY (playtest feedback: "charts that are volatile as fuck, instant trades, candles filling up and down, fast charts"):
  // now and then a coin gets swarmed for 20-90 s: every second trades, 6-16 trades a second, big and huge candles in both
  // directions, the live candle whipping up and down inside the second (long wicks both ways), colours flipping.
  // About 1 coin in 7 is a "degen" coin: it plays its story faster and frenzies far more often.
  STAGE.fz = { act: [1, 1, 1], mix: [0, 0.04, 0.22, 0.38, 0.36], keep: 0.42, wick: 0.35, huge: 0.3, tpc: [9, 16] };
  const BODY = [[0.0001, 0.0005], [0.0005, 0.005], [0.005, 0.02], [0.02, 0.05]];
  P.study = function (tk, D, F, sec, gap, rate, wild) {
    const sim = this.game.sim, r = sim.r, mc = sim.mc(tk);
    const heat = 1 - Math.exp(-rate * 0.25 * F.act);   // 0 = dead, 1 = hot (template volume, momentum, how far it has to go)
    // frenzies: a degen coin (1 in 7) plays its story ~1.6x faster and frenzies often; any lively coin under $3M can frenzy
    if (F.degen == null) { F.degen = !D.arch && tk.fate2 !== 'legend' && r() < 0.14; if (F.degen) { const pos = (sim.t - D.t0) / D.sec; D.sec *= 0.62; D.t0 = sim.t - pos * D.sec; } }
    const canFz = mc < 3e6 && tk.fate2 !== 'doa' && !(D.arch === 'H' && !D.rugged) && D.arch !== 'G' && D.arch !== 'K' && tk.fate2 !== 'legend';
    if (canFz && !(D.fzUntil > sim.t) && (Director.FORCE_FRENZY || r() < (F.degen ? 0.012 : 0.0015) * (heat > 0.6 || Math.abs(gap) > 0.1 ? 3 : 1))) {
      D.fzUntil = sim.t + (Director.FORCE_FRENZY ? 1e9 : r.range(20, 90));
      tk.hype = Math.max(tk.hype || 0, 2.2);
      if (!Director.FORCE_FRENZY && sim.event && mc > 8000 && r() < 0.5) sim.event('news', tk, '$' + tk.ticker + ' is going crazy: ' + r.pick(['bots and degens piling in', 'the chart is moving every second', 'whales flipping it back and forth', 'someone is sniping every dip']));
    }
    const frenzy = canFz && D.fzUntil > sim.t;
    if (frenzy) tk.hype = Math.max(tk.hype || 0, 2.2);
    const st = frenzy ? STAGE.fz : mc < 15000 ? STAGE.nw : mc < 60000 ? STAGE.fs : mc < 1e6 ? STAGE.mg : heat > 0.6 ? STAGE.bh : STAGE.bc;
    const lerp = (a, b, t) => a + (b - a) * t;
    const pAct = heat < 0.5 ? lerp(st.act[0], st.act[1], heat * 2) : lerp(st.act[1], st.act[2], heat * 2 - 1);
    const far = Math.abs(gap) > 0.15;   // behind its story: it trades now
    if (!(r() < pAct * (tk.fate2 === 'doa' ? 0.6 : 1) || far || sim.t - tk.lastTrade > 20)) return;   // an empty second: no candle at all (not a dash)
    // colour: keep the last one (runs), lean toward where the story goes
    const lean = Math.max(-0.45, Math.min(0.45, gap * 5));
    let up = D.lastUp != null && r() < st.keep ? D.lastUp : r() < 0.5;
    if (Math.abs(lean) > 0.02 && r() < Math.abs(lean) * 1.6) up = lean > 0;
    if (frenzy && far && r() < 0.85) up = gap > 0;   // a frenzy chops both ways, but a coin far off its story still gets there
    D.lastUp = up;
    // size: drawn from this stage's mix (wilder stretches of the real template lean bigger)
    const mix = st.mix.slice(); const wf = Math.max(0.6, Math.min(1.8, Math.sqrt((wild || 0.04) / 0.04)));
    mix[3] *= wf; mix[4] *= wf; mix[0] /= wf;
    let u = r() * mix.reduce((a, b) => a + b, 0), b = 0; while (b < 4 && (u -= mix[b]) > 0) b++;
    const lg = (a, z) => a * Math.pow(z / a, r());
    let size = b < 4 ? lg(BODY[b][0], BODY[b][1]) : lg(0.05, st.huge);
    if (tk.fate2 === 'doa') size *= 0.7;
    // far from the story: small coins jump there in one big candle (60-95% of the leg), bigger coins grind toward it
    const small = st === STAGE.nw || st === STAGE.fs;
    if (far && (up === gap > 0)) size = small && r() < 0.55 ? Math.min(Math.abs(gap) * r.range(0.6, 0.95), Math.max(st.huge * 2, 0.3)) : Math.max(size, Math.min(Math.abs(gap) * pull(F, gap), st.huge * 1.5));
    // plus a steady pull back toward the story on every candle (so pushes fade and quiet coins settle where they should)
    const m = (up ? size : -size) + (far ? 0 : gap * F.kap * 0.75);
    // wicks: rare below $1M (and usually down), common when a big coin is hot
    let wu = 0, wl = 0;
    const wcap = st === STAGE.bh || frenzy ? 0.3 : 0.12;   // study: small-coin wicks top out around 3-14%; a hot big coin's up to ~30%
    if (r() < st.wick) { const w = Math.min(wcap, Math.max(0.003, size * r.range(1.5, 4))); if (r() < (st === STAGE.bh ? 0.55 : 0.35)) wu = w; else wl = w; }
    if ((st === STAGE.bh && r() < 0.06) || (frenzy && r() < 0.3)) { const w = Math.min(wcap, size * r.range(2, 6)); if (r() < 0.5) wu += w; else wl += w; }   // blow-off spikes when hot
    const hi = Math.max(0, m) + wu, lo = Math.min(0, m) - wl;
    let legs = wu && wl ? (up ? [lo, hi, m] : [hi, lo, m]) : wu ? [hi, m] : wl ? [lo, m] : [m];
    if (frenzy) {   // a few extra swings inside the range before it closes: the candle fills up, then down, then up again
      const lo2 = Math.min(lo, m - size * 0.6), hi2 = Math.max(hi, m + size * 0.6), zz = [];
      for (let q = r.int(2, 4); q > 0; q--) zz.push(q % 2 === (up ? 0 : 1) ? lo2 + (hi2 - lo2) * r.range(0, 0.35) : hi2 - (hi2 - lo2) * r.range(0, 0.35));
      legs = zz.concat(legs);
    }
    // trades in this second: a few on a small coin, a crowd on a hot big one; a wick is a buy and a sell landing together
    const nT = Math.max(legs.length, Math.min(frenzy ? 18 : 12, Math.round(st.tpc[0] * Math.exp(r.normal() * 0.6))));
    let at = 0, left = nT - legs.length;
    const out = [];
    for (const tgt of legs) {
      const d = tgt - at; at = tgt; if (Math.abs(d) < 2e-5) continue;
      const parts = 1 + (left > 0 ? r.int(0, Math.min(left, 4)) : 0); left -= parts - 1;
      // inside a leg most trades push the same way, with a little dust against it
      let rem = d; for (let q = 0; q < parts; q++) { const p = q === parts - 1 ? rem : d / parts * r.range(0.4, 1.6); rem -= p; out.push(p); }
    }
    const ts = out.map(() => r() * 0.95).sort((p, q) => p - q);
    D.lvDone = 0; let lv = 0;
    out.forEach((d, j) => { lv += d; D.plan.push({ lv, at: sec + ts[j], fz: frenzy }); });
  };

  P.onStep = function (dt) {
    const sim = this.game.sim, r = sim.r;
    for (const tk of sim.tokens) {
      const D = tk.dir; if (!D || D.done || tk.dead || tk.isPlayer) continue;
      if (sim.t < D.t0) continue;
      if (D.mc0 == null) {
        // rugs, pump-and-dumps and whale coins start with insiders holding a bag bought at the bottom (bundled at launch)
        if (tk.fate2 === 'rug' || tk.fate2 === 'pnd' || tk.fate2 === 'whale') { D.ins = D.ins || BH.Names.addr(r); for (let j = 0; j < r.int(2, 4); j++) sim.exec(tk, BH.Names.addr(r), 'insider', 'buy', r.range(0.8, 2)); }
        D.mc0 = Math.max(2000, sim.mc(tk)); D.sol0 = C.SOL_USD;   // the path is in USD at this SOL price
        // archetype H: the dev buys most of the curve in the very first second (one huge green candle)
        if (D.devBuy && !D.devBought && tk.devAddr) { D.devBought = true; const st0 = steer(sim, tk, sim.mc(tk) * D.devBuy); if (st0 && st0.side === 'buy') sim.exec(tk, tk.devAddr, 'dev', 'buy', st0.amt); D.t0 -= D.sec * 0.98; }   // (that buy IS the first candle: the path starts after it, so the crowd doesn't sell it back down)
      }
      const pos = (sim.t - D.t0) / D.sec, i = Math.floor(pos), fr = pos - i;
      // a copycat rides its parent: the parent's move since last step pushes this chart too (it fades slowly)
      if (D.rideOf) { const par = sim.byId.get(D.rideOf), pm = par && !par.dead ? sim.mc(par) : 0; if (pm > 0 && D.rideLast > 0) { D.off = (D.off || 0) + Math.log(pm / D.rideLast) * 1.5; D.offHalf = 600; } D.rideLast = pm; }
      // right after bonding: a -45-65% shakeout within 2-5 minutes, then it recovers (60%) or keeps bleeding (round-2 study)
      if (tk.stage === 'amm' && D.bondT == null) { D.bondT = sim.t; if (tk.fate2 !== 'mega' && tk.fate2 !== 'legend' && D.arch !== 'H' && D.arch !== 'J' && D.arch !== 'G' && r() < 0.75) { D.shakeAt = sim.t + r.range(60, 240); D.shakeD = r.range(0.45, 0.65); D.shakeBack = r() < 0.6; } }
      if (D.shakeAt && sim.t >= D.shakeAt) { D.shakeAt = 0; D.off = (D.off || 0) + Math.log(1 - D.shakeD); D.offHalf = D.shakeBack ? 110 : 900; if (sim.event) sim.event('news', tk, '$' + tk.ticker + ' shakeout after bonding: -' + Math.round(D.shakeD * 100) + '%'); }
      // a quiet archetype coin (a slow cook) is kept alive by a volume bot: a tiny buy when nothing traded for 25 s
      if (D.arch && i < D.c.length && sim.t - tk.lastTrade > 25) { sim.exec(tk, D.bot || (D.bot = BH.Names.addr(r)), 'retail', 'buy', r.range(0.003, 0.02)); }
      if (i >= D.c.length) { D.done = true; tk.half = 8; tk.hype = Math.min(tk.hype, D.endHype != null ? D.endHype : 0.3); continue; }   // a dead archetype stops printing
      const k = D.c[i];
      const rel = Math.pow(Math.max(1e-4, pathRel(D, i, fr)), D.amp);   // amplitude: exaggerate or soften the real move
      // two wandering drifts (a quick one and a slow one), sized to how wild this stretch of the real chart was
      const wild = Math.min(0.25, Math.max(0.01, Math.log(k[1] / Math.max(1e-9, k[2])) * D.amp));
      D.noise = D.noise * Math.exp(-dt / 4) + r.normal() * wild * 0.05 * Math.sqrt(dt);
      D.n2 = (D.n2 || 0) * Math.exp(-dt / 30) + r.normal() * wild * 0.035 * Math.sqrt(dt);
      // your own trades push the price; that push decays back toward the path (half-life ~25 s)
      const mc = sim.mc(tk);
      // when SOL itself moves, every coin's USD market cap moves with it; the path follows instead of fighting it
      // USD1-paired coins keep their USD market cap when SOL moves
      const target0 = D.mc0 * rel * Math.exp(D.noise + D.n2) * (tk.pair === 'USD1' ? 1 : C.SOL_USD / (D.sol0 || 150));
      // your trades and named whales' trades move the price for real; that push fades back toward the path
      // (half-life 25 s for you, longer for whales: a conviction bag sitting in the pool doesn't vanish)
      let pushT = null;
      for (let q = tk.trades.length - 1; q >= 0 && tk.trades[q].t > sim.t - dt - 1e-9; q--) { const tq = tk.trades[q]; if (tq.you || tq.rw) { pushT = tq; break; } }
      if (pushT) { D.off = Math.log(mc / target0); D.offHalf = pushT.side === 'buy' && pushT.rw === 'conviction' ? 150 : pushT.side === 'buy' && pushT.rw ? 60 : 25; }   // a whale's sell gets absorbed quickly; its buys linger
      D.off *= Math.exp(-dt / (D.offHalf || 25));
      const target = target0 * Math.exp(D.off);
      // the template's volume sets the hype (what Pulse shows as activity)
      tk.hype = Math.max(0.05, Math.min(3, 0.4 + Math.log10(1 + k[4]) * 0.8));
      tk.half = 30;
      // rugs: a small dev sell shortly before the big red candle (an early clue, 60% of the time)
      const drop = D.c[i + 1] ? D.c[i + 1][3] / k[3] : 1;
      if (tk.fate2 === 'rug' && !D.warned && drop < 0.4 && fr > 0.3) { D.warned = true; const dh = tk.holders.get(tk.devAddr); if (dh && dh.tokens > 1 && r() < 0.6) sim.exec(tk, tk.devAddr, 'dev', 'sell', dh.tokens * r.range(0.1, 0.3)); }
      const big = i > 0 && k[2] / Math.max(1e-9, D.c[i - 1][3]) < 0.35;   // (never the launch candle: a big first jump isn't a rug)
      if (tk.fate2 === 'rug' && big && !D.rugged) {
        D.rugged = true; tk.rugged = true; sim.stats.rugged++;
        sim.dumpGroup(tk, ['dev', 'insider', 'bundler'], 1);
        sim.event('rug', tk, '$' + tk.ticker + ' rugged: one candle, −' + Math.round((1 - Math.min(sim.mc(tk) / mc, Math.pow(Math.min(1, k[3] / Math.max(1e-9, (D.c[i - 1] || k)[3])), D.amp))) * 100) + '%');   // the drop the candle is heading for, not just the first tick
      }
      // ---- the crowd: people trade one at a time, in bursts, and not all in the same direction ----
      // (the old director nudged the price onto the line every tick, which drew robotic zigzags)
      D.heat = (D.heat || 0) * Math.exp(-dt / 2.5);                        // a trade brings more trades for a few seconds
      D.rev = (D.rev || 0) * Math.exp(-dt / 1.5);                          // a big print gets partly faded right after (dip buyers, profit takers): that is a wick
      if (D.RATE == null) Object.assign(D, TUNE);
      const gap0 = Math.log(target / mc);
      const busy = Math.max(0.8, Math.min(3, 1 + Math.log10(Math.max(1, mc / 8000)))) * ({ doa: 0.45, rug: 1, pnd: 1.2, whale: 1.2, runner: 1.3 }[tk.fate2] || 1);   // bigger and livelier coins trade more often
      // trades per second. Tick study (every trade on 4 big coins): 40-90% of seconds have no trade at all,
      // and the busiest 10% of seconds hold more than half of the trades.
      let rate = (0.6 + 8 * Math.log10(1 + k[4])) * busy * (1 + D.heat * 0.4) + Math.min(10, Math.abs(gap0) * 40);
      if (D.rugged && gap0 < -0.2) rate += 8;                              // a rug is a stampede
      if (!(D.arch === 'H' && !D.rugged) && !D.oldCrowd) { this.flow(tk, D, dt, gap0, rate, wild, i, k); continue; }
      // real trades arrive in clusters (in the big-coin study 70% landed in the same second as the one before)
      // every coin trades in its own way (playtest feedback: "every chart looks the same"): its own typical trade size, how busy it
      // is, how much colour carries on, how wicky it is and how often a burst hits. Rolled once per coin.
      if (!D.P) { const lg = (a, b) => a * Math.pow(b / a, r()); D.P = { size: lg(0.06, 0.35), act: lg(0.55, 1.8), mom: r.range(0.15, 0.65), wick: lg(0.006, 0.07), burst: lg(0.004, 0.03), same: r.range(0.6, 0.9) }; }
      const PP = D.P;
      let n = r.poisson(rate * dt * D.RATE * PP.act); if (n) while (n < 12 && r() < D.CLU) n++;
      D.q = D.q || [];
      if (n > 0 && !(D.arch === 'H' && !D.rugged) && !D.rugged) {   // only in seconds that already trade: a dead coin stays silent
        const capW = Math.max(0.008, Math.min(0.12, 0.3 * Math.pow(30000 / mc, 0.75)));
        // a wick: a spike and its fade land in the same second, so the candle has a small body and a long wick up or down
        if (r() < PP.wick * dt) { const up = r() < 0.5 + Math.max(-0.3, Math.min(0.3, gap0 * 2)), m = capW * r.range(0.35, 1); D.q.push({ side: up ? 'buy' : 'sell', move: m }, { side: up ? 'sell' : 'buy', move: m * r.range(0.75, 1.05) }); }
        // a burst: several medium trades on one side in the same second, one big green or red candle with real volume under it
        else if (r() < PP.burst * dt) { const sd = r() < 0.5 + Math.max(-0.35, Math.min(0.35, gap0 * 3)) ? 'buy' : 'sell', k = r.int(2, 6), tot = capW * r.range(0.3, 0.9); for (let q = 0; q < k; q++) D.q.push({ side: sd, move: tot / k }); }
      }
      n += D.q.length;
      if (D.arch === 'H' && !D.rugged && Math.floor(tk.lastTrade) < Math.floor(sim.t) && sim.t % 1 >= 0.5) sim.exec(tk, D.bot || (D.bot = BH.Names.addr(r)), 'retail', 'buy', r.range(0.002, 0.01));   // the fake grind prints a tiny buy every second (PAID: 99% of seconds active)   // one trade usually brings a few more in the same moment
      for (let j = 0; j < n && !tk.dead; j++) {
        const now = sim.mc(tk), gap = Math.log(target / now);
        const qd = D.q.length ? D.q.shift() : null;
        // most trades lean toward where the coin is heading; some go the other way (profit takers, dip buyers)
        // side: leans to where the coin is heading, and people pile in behind the last trade
        // (in the tick study the next trade was on the same side 57-76% of the time)
        let side = r() < 1 / (1 + Math.exp(-(gap + D.rev + (tk.rewards === 'holders' ? 0.004 : 0) + (D.arch === 'H' && !D.rugged ? 0.05 : 0)) / D.TEMP)) ? 'buy' : 'sell';
        // a burst is mostly one side (wicks only appear when a buy and a sell land in the same second), and people pile in
        // behind the last trade (human-chart spec: 1s candle colour persists, sign autocorrelation +0.18 to +0.31)
        const big = Math.min(1, Math.max(0, Math.log10(now / 3e5) / 1.2));   // 0 below $300K, 1 above ~$5M: large caps alternate colours
        if (j > 0 && r() < PP.same - 0.3 * big) side = D.burst || side; else if (D.last && r() < (D.momArch != null ? D.momArch : PP.mom) * (1 - big)) side = D.last;
        if (qd) side = qd.side;
        D.last = side; if (j === 0) D.burst = side;
        const toward = (side === 'buy') === (gap > 0);
        // size as a price move: usually a fraction of a percent, sometimes a real push that closes much of the gap
        // both sides trade the same sizes (that back-and-forth is what draws wicks); the heavy tail is from the study:
        // the 99th percentile trade was ~100x the median
        let move, push = false, st = null;
        if (qd) { move = qd.move; push = true; st = steer(sim, tk, now * Math.exp(side === 'buy' ? move : -move)); }
        else if (toward && Math.abs(gap) > (D.PUSHG || 0.08) && r() < (Math.abs(gap) > 0.25 ? 0.8 : 0.25)) {
          // a real push toward the path; a deep pool needs it split into several trades (no 30% one-trade jumps on a $4M coin)
          const cap = D.arch === 'H' && !D.rugged ? 0.004 : Math.max(0.006, Math.min(0.16, 0.2 * Math.pow(30000 / now, 0.75))) * (Math.abs(gap) > 0.4 ? 3 : 1);   // (way behind a vertical path, like a mega's bonding minute: catch up faster)   // per second: a pump climbs over many seconds (study: +1-3%/s for 10-40 s), not in one candle   // (the fake grind never jumps)   // $30K: 45% · $200K: 11% · $2M: 2%
          const M = Math.min(cap, Math.abs(gap) * r.range(0.25, 0.6)), parts = D.arch === 'H' && !D.rugged ? 1 : r.int(2, 6);
          move = M / parts; push = true;
          for (let q = 1; q < parts; q++) { D.q.push({ side, move: M / parts * r.range(0.6, 1.4) }); n++; }
          st = steer(sim, tk, now * Math.exp(side === 'buy' ? move : -move));
        } else {
          // an ordinary trade is sized in SOL (12% tiny bot trades, the rest lognormal around 0.2 SOL) and the pool decides how far
          // it moves the price: thin curve coins jump, deep large caps barely tick (constant-product impact, human-chart spec 3.1/3.3)
          let sol = r() < 0.12 ? r.range(0.003, 0.04) : r.logn(PP.size, 1.35);
          sol = Math.min(sol, now > 50000 ? 60 : 4);   // 10+ SOL whales only on coins above $50K
          if (D.arch === 'H' && !D.rugged) sol *= 0.05;   // archetype H: the dev's "too clean" chart, tiny trades and almost no red
          const depth = Math.max(1, tk.stage === 'curve' ? tk.vSol : tk.poolSol);
          move = Math.min(0.9, 2 * sol / depth);
          st = { side, amt: side === 'buy' ? sol : sol / Math.max(1e-12, sim.price(tk)) };
        }
        if (!st || !(st.amt > 0)) continue;
        D.heat = Math.min(3, D.heat + (push ? 0.5 : 0.08));
        if (move > 0.012) D.rev += (side === 'buy' ? -1 : 1) * move * r.range(0.3, 0.7); else if ((side === 'buy') === (D.rev > 0)) D.rev -= Math.sign(D.rev) * Math.min(Math.abs(D.rev), move);
        this.act(tk, D, side, st.amt, push, i, k[4] >= 5);
      }
      D.q.length = 0;   // whatever didn't fill this second is dropped
    }
  };
  BH.Director = Director;
  BH.Systems = BH.Systems || [];
  const def = { name: 'director', create(game, saved) { const d = new Director(game, saved); d.hooks = { launch: (tk, r) => d.onLaunch(tk, r), step: (dt) => d.onStep(dt) }; return d; } };
  const i = BH.Systems.findIndex((x) => x.name === 'fates');
  if (i >= 0) BH.Systems.splice(i + 1, 0, def); else BH.Systems.push(def);
})(typeof window !== 'undefined' ? window : globalThis);
