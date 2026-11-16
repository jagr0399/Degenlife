/* Dev launches that people actually buy (Nov 16, playtester: "I just made my first coin and no one is buying it").
   Before: a self-launched coin started with hype 0.2-0.6 that faded in 12-25 s, and nothing else came.
   Now, on every coin you deploy:
   - SNIPERS: 3-8 bots buy 0.1-1 SOL in the first ~2 s, like every real launch; they sell at 1.5-3x or within 20-90 s.
   - ATTENTION SCORE (0-1) from things you control: a name that matches a hot narrative (and how hot), socials + website,
     your followers and dev reputation, a sensible dev buy (0.5-3 SOL; a huge dev bag scares buyers), winning a J7 meme race.
   - A BUYER WAVE sized by the score (organic hype and how long it lasts); a strong score can also draw a KOL (2-5 SOL).
   - A LAUNCH REPORT toast that says what worked and what to fix.
   - DEV MILESTONES pay cash: first launch $100, your coin hits $10K $150, graduates $500, $100K $1,000 (once each per coin type).
   No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};

  function DevFlow(game, saved) {
    this.game = game; this.ms = {}; this.watch = []; this.launches = 0;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = DevFlow.prototype;
  P.save = function () { return { ms: this.ms, watch: this.watch.slice(-20), launches: this.launches }; };

  // how much attention a launch gets, and why
  P.score = function (tk) {
    const gm = this.game, s = gm.sys.social, why = [], fix = [];
    let sc = 0.15;
    const name = String(tk.name || '').toLowerCase();
    let nar = null, heat = 0;
    if (s && BH.Social) for (const n of BH.Social.NARRATIVES) { if (n.words.some((w) => name.includes(w.toLowerCase())) || name.includes(n.label.toLowerCase())) { const h = s.heat[n.id] || 0; if (h > heat) { heat = h; nar = n; } } }
    if (nar) { sc += 0.1 + heat / 250; why.push(nar.label + ' narrative (heat ' + Math.round(heat) + ')'); tk.narrative = nar.id; }
    else { const hot = s && s.hottest ? s.hottest()[0] : null; fix.push(hot ? 'name it after a hot narrative (' + hot.label + ' is hottest)' : 'name it after a hot narrative'); }
    const soc = tk.socials || {}, ns = (soc.x ? 1 : 0) + (soc.tg ? 1 : 0) + (soc.web ? 1 : 0);
    sc += ns * 0.05; if (ns >= 2) why.push(ns + ' socials'); else fix.push('add socials (X post, website)');
    const t = gm.sys.trencher, fol = t ? t.followers : 100;
    sc += Math.min(0.2, Math.log10(Math.max(10, fol)) / 25); if (fol >= 1000) why.push(Math.round(fol).toLocaleString() + ' followers');
    const f = gm.sys.factory; if (f && f.rep != null) { sc += Math.max(-0.15, Math.min(0.1, (f.rep - 50) / 300)); if (f.rep < 35) fix.push('your dev reputation is low (past rugs)'); }
    const dh = tk.holders.get('YOU'), devPct = dh ? dh.tokens / BH.C.TOTAL_SUPPLY * 100 : 0;
    if (devPct > 12) { sc -= 0.12; fix.push('your dev bag is ' + devPct.toFixed(0) + '% of supply: buyers get scared'); }
    else if (devPct >= 1) { sc += 0.05; why.push('a sensible dev buy'); }
    else fix.push('a small dev buy (0.5-3 SOL) shows you believe in it');
    if (tk.j7Right) { sc += 0.35; why.push('you won the J7 meme race'); }
    return { score: Math.max(0.05, Math.min(1, sc)), why, fix, nar };
  };

  P.onLaunchMine = function (tk) {
    const gm = this.game, sim = gm.sim, r = sim.r;
    this.launches++;
    // let the J7 race / socials settle first (0.5 s), then the crowd comes
    (this.q = this.q || []).push({ at: sim.t + 0.5, launched: tk.id });
    for (let i = 0; i < 3 + Math.floor(r() * 6); i++) (this.q).push({ at: sim.t + 0.3 + r() * 2, snipe: tk.id, sol: 0.1 + r() * 0.9 });
    if (!this.ms.first) { this.ms.first = true; this.pay(100, 'First coin deployed'); }
    this.watch.push({ id: tk.id, ticker: tk.ticker, ms: {} });
  };

  P.pay = function (usd, what) {
    const b = this.game.bills; if (b) b.cash += usd;
    if (this.game.emit) this.game.emit('toast', { kind: 'buy', text: 'Dev milestone: ' + what + ' (+$' + usd.toLocaleString() + ')' });
  };

  P.onStep = function () {
    const gm = this.game, sim = gm.sim, r = sim.r;
    if (this.q && this.q.length) {
      const due = this.q.filter((x) => x.at <= sim.t); this.q = this.q.filter((x) => x.at > sim.t);
      for (const x of due) {
        const tk = sim.byId.get(x.launched || x.snipe || x.wave || x.out || x.kol); if (!tk || tk.dead) continue;
        if (x.snipe) { const a = 'SNIPE' + BH.Names.addr(r).slice(5); sim.exec(tk, a, 'sniper', 'buy', x.sol); this.q.push({ at: sim.t + 20 + r() * 70, out: tk.id, addr: a, tp: 1.5 + r() * 1.5, mc0: sim.mc(tk) }); continue; }
        if (x.out) { const h = tk.holders.get(x.addr); if (h && h.tokens > 1) sim.exec(tk, x.addr, 'sniper', 'sell', h.tokens * (sim.mc(tk) >= x.mc0 * x.tp ? 1 : 0.7 + r() * 0.3)); continue; }
        if (x.wave) { sim.exec(tk, BH.Names.addr(r), 'retail', 'buy', x.sol); continue; }
        if (x.kol) { const j = gm.sys.j7, k = j && BH.J7 ? BH.J7.ACCOUNTS.filter((a) => a[7] === 'kol') : []; if (k.length) { const a = k[Math.floor(r() * k.length)], w = j.wallets[a[0]]; if (w) { sim.exec(tk, w, 'kol', 'buy', 2 + r() * 3); j.bags = j.bags || []; j.bags.push({ who: a[0], coin: tk.id, entry: sim.mc(tk), tp: 1.8 + r() * 2, until: sim.t + 60 + r() * 200 }); } } continue; }
        if (x.launched) {
          const S = this.score(tk);
          // organic attention: hype and how long it lasts
          tk.hype = Math.max(tk.hype || 0, 0.5 + S.score * 2.2); tk.half = Math.max(tk.half || 0, 30 + S.score * 120);
          // a first wave of buyers over ~2 min
          const n = Math.round(4 + S.score * 30);
          for (let i = 0; i < n; i++) this.q.push({ at: sim.t + 1 + Math.pow(r(), 1.3) * 120, wave: tk.id, sol: Math.min(4, r.logn(0.25 + S.score * 0.4, 0.9)) });
          if (S.score > 0.55 && r() < S.score * 0.7) this.q.push({ at: sim.t + 5 + r() * 40, kol: tk.id });
          tk.launchReport = S;
          if (gm.emit) gm.emit('toast', { kind: S.score >= 0.5 ? 'buy' : 'info', text: 'Launch report $' + tk.ticker + ': attention ' + Math.round(S.score * 100) + '/100' + (S.why.length ? '. Worked: ' + S.why.join(', ') : '') + (S.fix.length ? '. Next time: ' + S.fix.slice(0, 2).join('; ') : '') });
        }
      }
    }
    // dev milestones on your coins
    for (const w of this.watch) {
      const tk = sim.byId.get(w.id); if (!tk) continue;
      const mc = sim.mc(tk);
      if (mc >= 10000 && !this.ms.mc10k) { this.ms.mc10k = true; this.pay(150, '$' + tk.ticker + ' hit $10K'); }
      if (tk.stage === 'amm' && !this.ms.grad) { this.ms.grad = true; this.pay(500, '$' + tk.ticker + ' graduated'); }
      if (mc >= 100000 && !this.ms.mc100k) { this.ms.mc100k = true; this.pay(1000, '$' + tk.ticker + ' hit $100K'); }
    }
    if (this.watch.length > 20) this.watch.splice(0, this.watch.length - 20);
  };

  BH.DevFlow = DevFlow;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'devflow', create(game, saved) { const d = new DevFlow(game, saved); d.hooks = { launchMine: (tk) => d.onLaunchMine(tk), step: () => d.onStep() }; return d; } });
})(typeof window !== 'undefined' ? window : globalThis);
