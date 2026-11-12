/* Stage 4: the trading firm. Hire traders from resumes; each has a style, stats and a wallet you fund.
   They trade the same market (through sim.exec, like every other actor), get tilted, and cause drama. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};

  const STYLES = {
    sniper: { label: 'Sniper', desc: 'Buys brand-new launches fast, takes quick profits.' },
    diamond: { label: 'Diamond hands', desc: 'Buys STRONG calls and holds through the noise.' },
    scalper: { label: 'Scalper', desc: 'Trades momentum in and out, many small wins.' },
    gambler: { label: 'Gambler', desc: 'Big random bets. Huge wins or huge losses.' },
    quant: { label: 'Quant', desc: 'Buys dips on graduated coins, sells into strength.' },
    intern: { label: 'Intern', desc: 'Cheap and eager. Tiny trades, mostly harmless.' },
  };
  const FIRST = ['Mia', 'Leo', 'Ava', 'Kai', 'Zoe', 'Eli', 'Ivy', 'Max', 'Ren', 'Sky', 'Jax', 'Nia', 'Oli', 'Tess', 'Remy', 'Cole'];
  const LAST = ['Park', 'Diaz', 'Stone', 'Vance', 'Okafor', 'Silva', 'Novak', 'Reyes', 'Kim', 'Moss', 'Hart', 'Cruz'];

  function Firm(game, saved) {
    this.game = game;
    this.staff = []; this.resumes = []; this.seq = 0; this.resumeDay = 0; this.log = [];
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Firm.prototype;
  Firm.STYLES = STYLES;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  P.desks = function () { return this.game.sys.build ? this.game.sys.build.effects().desks : 0; };
  P.newResumes = function () {
    const r = this.game.sim.r; this.resumes = [];
    const styles = Object.keys(STYLES);
    for (let i = 0; i < 5; i++) {
      const style = styles[r.int(0, styles.length - 1)];
      const skill = Math.round(r.range(20, 90)), nerves = Math.round(r.range(20, 90)), greed = Math.round(r.range(10, 90)), loyalty = Math.round(r.range(20, 95));
      this.resumes.push({ id: 'r' + (++this.seq), name: FIRST[r.int(0, FIRST.length - 1)] + ' ' + LAST[r.int(0, LAST.length - 1)], style, skill, nerves, greed, loyalty, salary: Math.round((style === 'intern' ? 15 : 30) + skill * 0.6), pfp: r.int(0, 142) });
    }
  };
  P.hire = function (rid) {
    const i = this.resumes.findIndex((x) => x.id === rid);
    if (i < 0) return { ok: false, reason: 'That resume is gone' };
    if (!this.game.sys.build.places.includes('office')) return { ok: false, reason: 'You need an office first' };
    if (this.staff.length >= this.desks()) return { ok: false, reason: 'Buy another trader desk first' };
    const t = Object.assign({}, this.resumes[i], { id: 's' + (++this.seq), wallet: 0, pnl: 0, pnlToday: 0, mood: 70, pos: {}, maxTrade: 1, minMc: 0, nextAct: 0, hiredDay: this.game.clock.day });
    this.resumes.splice(i, 1);
    this.staff.push(t);
    this.note(t.name + ' joined as a ' + STYLES[t.style].label + '.');
    return { ok: true, text: t.name + ' is hired. Fund their wallet in the Firm tab.' };
  };
  P.fire = function (sid) {
    const t = this.staff.find((x) => x.id === sid); if (!t) return { ok: false, reason: 'Not on staff' };
    this.closeAll(t); this.game.player.sol += t.wallet; t.wallet = 0;
    this.staff = this.staff.filter((x) => x !== t);
    this.note(t.name + ' was let go. Their wallet came back to you.');
    return { ok: true, text: t.name + ' was let go.' };
  };
  P.fund = function (sid, sol) {
    const t = this.staff.find((x) => x.id === sid), p = this.game.player;
    if (!t) return { ok: false, reason: 'Not on staff' };
    if (sol < 0) { const back = Math.min(t.wallet, -sol); t.wallet -= back; p.sol += back; return { ok: true, text: 'Pulled ' + back.toFixed(2) + ' SOL back.' }; }
    if (!(sol > 0) || sol > p.sol) return { ok: false, reason: 'Not enough SOL' };
    p.sol -= sol; t.wallet += sol;
    return { ok: true, text: 'Sent ' + sol + ' SOL to ' + t.name + '.' };
  };
  P.setRules = function (sid, rules) { const t = this.staff.find((x) => x.id === sid); if (t) { if (rules.maxTrade > 0) t.maxTrade = rules.maxTrade; if (rules.minMc >= 0) t.minMc = rules.minMc; } };
  P.note = function (text) { this.log.unshift({ t: this.game.sim.t, day: this.game.clock.day, text }); if (this.log.length > 60) this.log.length = 60; };
  P.addr = function (t) { return 'FIRM-' + t.id; };

  P.buy = function (t, tk, sol) {
    sol = Math.min(sol, t.maxTrade, t.wallet);
    if (sol < 0.01 || sim_mc(this.game.sim, tk) < t.minMc) return;
    const f = this.game.sim.exec(tk, this.addr(t), 'firm', 'buy', sol);
    if (!f) return;
    t.wallet -= f.sol;
    const p = t.pos[tk.id] || (t.pos[tk.id] = { cost: 0, at: this.game.sim.t, peak: f.mc });
    p.cost += f.sol;
  };
  P.sell = function (t, tk) {
    const h = tk.holders.get(this.addr(t)), p = t.pos[tk.id];
    delete t.pos[tk.id];
    if (!h || h.tokens < 1 || !p) return;
    const f = this.game.sim.exec(tk, this.addr(t), 'firm', 'sell', h.tokens);
    const got = f ? f.net : 0;
    t.wallet += got;
    const pnl = got - p.cost;
    t.pnl += pnl; t.pnlToday += pnl;
    t.mood = Math.max(0, Math.min(100, t.mood + (pnl >= 0 ? 4 : -6 - (100 - t.nerves) / 20)));
  };
  P.closeAll = function (t) { const sim = this.game.sim; for (const id of Object.keys(t.pos)) { const tk = sim.byId.get(id); if (tk) this.sell(t, tk); else delete t.pos[id]; } };
  function sim_mc(sim, tk) { return sim.mc(tk); }

  // each trader acts every few seconds; skill decides how often they read the market right
  P.onStep = function () {
    const sim = this.game.sim, r = sim.r;
    for (const t of this.staff) {
      if (sim.t < t.nextAct) continue;
      t.nextAct = sim.t + r.range(2, 6) * (t.style === 'diamond' ? 3 : 1);
      const tilted = t.mood < 25;
      // exits first
      for (const id of Object.keys(t.pos)) {
        const tk = sim.byId.get(id);
        if (!tk || tk.dead) { const p = t.pos[id]; delete t.pos[id]; if (p) { t.pnl -= p.cost; t.pnlToday -= p.cost; t.mood = Math.max(0, t.mood - 10); } continue; }
        const h = tk.holders.get(this.addr(t)); if (!h) continue;
        const val = h.tokens * sim.price(tk), p = t.pos[id], x = val / Math.max(1e-9, p.cost);
        const tp = { sniper: 1.3, diamond: 2.5, scalper: 1.15, gambler: 2.2, quant: 1.25, intern: 1.3 }[t.style];
        const sl = { sniper: 0.6, diamond: 0.45, scalper: 0.88, gambler: 0.55, quant: 0.78, intern: 0.7 }[t.style];
        const read = r() * 100 < t.skill;   // skilled traders exit on time
        if (x >= tp * (read ? 1 : 1.4) || x <= sl * (read ? 1 : 0.8) || (t.style !== 'diamond' && sim.t - p.at > 180) || sim.t - p.at > 600) this.sell(t, tk);
      }
      if (t.wallet < 0.02 || Object.keys(t.pos).length >= (t.style === 'diamond' ? 2 : 3)) continue;
      // balance pass (Nov 11): skilled traders skip coins that look risky from public info, like a real trader reading the risk scan
      const careful = r() * 100 < t.skill;
      const looksOk = (x) => { if (!careful) return true; if (x.devSold || x.rugged) return false; const k = sim.risk(x); return k.dev < 10 && k.bundle < 20 && k.snipers < 25; };
      const live = sim.tokens.filter((x) => !x.dead && !t.pos[x.id]);
      if (!live.length) continue;
      const size = t.wallet * ({ gambler: 0.25, intern: 0.05, sniper: 0.08, scalper: 0.1, quant: 0.15 }[t.style] || 0.2) * (tilted ? 1.6 : 1) * (0.5 + t.greed / 100);
      let pick = null;
      if (t.style === 'sniper') { if (r() < 0.35) pick = live.filter((x) => sim.t - x.born < 20).pop(); }
      else if (t.style === 'diamond' || t.style === 'intern') { const sc = this.game.sys.social ? this.game.sys.social.scope(15).filter((s) => s.tier === 'STRONG' && s.alive) : []; pick = sc.length ? sim.byId.get(sc[r.int(0, Math.min(2, sc.length - 1))].post.coin) : null; if (pick && !looksOk(pick)) pick = null; }
      else if (t.style === 'scalper') pick = live.filter((x) => sim.vol5m(x) > 20 && sim.change(x, 30) < -10 && sim.change(x, 300) > 0).sort((a, b) => sim.vol5m(b) - sim.vol5m(a))[0];
      else if (t.style === 'quant') pick = live.filter((x) => x.stage === 'amm' && sim.change(x, 60) < -15)[0];
      else if (r() < (tilted ? 0.5 : 0.2)) { const top = live.slice().sort((a, b) => sim.vol5m(b) - sim.vol5m(a)).slice(0, 10); pick = top[r.int(0, top.length - 1)]; }
      if (pick && !pick.dead && !t.pos[pick.id] && looksOk(pick)) this.buy(t, pick, size);
    }
  };
  P.afterTime = function () {
    const day = this.game.clock.day, r = this.game.sim.r;
    if (this.resumeDay !== day) {
      this.resumeDay = day; this.newResumes();
      for (const t of this.staff.slice()) {
        this.game.bills.charge(t.salary, t.name + ' salary');
        t.pnlToday = 0;
        // drama
        const roll = r();
        if (roll < 0.04 * (1 - t.loyalty / 100) && t.wallet > 0.2) { const s = t.wallet * 0.15; t.wallet -= s; this.note(t.name + ' skimmed ' + s.toFixed(2) + ' SOL from the firm wallet.'); this.game.emit('toast', { kind: 'bad', text: t.name + ' skimmed the firm wallet!' }); }
        else if (roll < 0.08 && t.mood < 30 && t.loyalty < 50) { this.note(t.name + ' quit for the rival firm.'); this.game.emit('toast', { kind: 'bad', text: t.name + ' quit for a rival.' }); this.fire(t.id); }
        else if (roll > 0.97 && t.pnl > 2) { this.note(t.name + ' went viral for a huge win.'); if (this.game.sys.social) this.game.sys.social.post({ name: t.name, handle: '@' + t.name.split(' ')[0].toLowerCase() + 'trades', pfp: t.pfp, followers: 3000 }, 'flex', 'just made the firm ' + t.pnl.toFixed(1) + ' SOL this week. not bragging.', {}); }
      }
    }
  };
  P.coach = function (sid) { const t = this.staff.find((x) => x.id === sid); if (!t) return { ok: false, reason: 'Not on staff' }; t.mood = Math.min(100, t.mood + 20); return { ok: true, text: t.name + ' feels better.' }; };
  BH.Firm = Firm;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'firm', create(game, saved) { const f = new Firm(game, saved); f.hooks = { step: () => f.onStep() }; return f; } });
})(typeof window !== 'undefined' ? window : globalThis);
