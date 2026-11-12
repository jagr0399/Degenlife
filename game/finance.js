/* Phase 5, Finance: loan shark (12), prop firm challenge (13), night market (14), side gigs that fast-forward
   time (29), airdrop farming (34), a rug insurance desk (44) and market regimes (42). No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;
  const GIGS = { delivery: { name: 'Food delivery', rate: 18, energy: 4, act: 1 }, barista: { name: 'Barista shift', rate: 16, energy: 3, act: 1 }, charts: { name: 'Freelance chart art', rate: 35, energy: 3, act: 2 }, consult: { name: 'Degen consulting', rate: 90, energy: 2, act: 3 } };
  const PROTOCOLS = [['jupiterish', 'Jupiter-ish Perps'], ['marginfy', 'MarginFi-ish'], ['tensorish', 'Tensor-ish NFTs'], ['bridgey', 'Bridgey'], ['restake', 'ReStake Max']];
  const REGIMES = { bull: { label: 'Bull run', mul: 1.35, text: 'BULL RUN: everything is pumping and everyone is a genius again' }, chop: { label: 'Chop', mul: 1, text: 'Chop season: coins go up, then down, then sideways' }, bear: { label: 'Bear market', mul: 0.65, text: 'BEAR MARKET: volumes dry up, only the strong (and the scammers) remain' } };

  function Finance(game, saved) {
    this.game = game;
    this.loan = { owed: 0, borrowed: 0, due: 0, overdue: 0, visits: 0, lastDay: 0 };
    this.prop = { state: 'none', fee: 250, start: 0, peak: 0, low: 0, day0: 0, capital: 100, eq: 100, prev: 0, paid: 0, fails: 0 };
    this.gig = null; this.gigLog = [];
    this.air = { points: {}, farmedDay: {}, dropDay: 0, paid: 0, drops: [] };
    this.ins = { open: false, pool: 0, policies: 0, premiums: 0, claims: 0, lastDay: 0, seen: 0 };
    this.regime = 'chop'; this.regimeWeek = -1; this.nightCount = 0;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Finance.prototype;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  const R = (s) => s.game.sim.r;
  const actN = (s) => (s.game.sys.story ? s.game.sys.story.act : 1);
  const netSol = (s) => s.game.player.netWorth();

  // ---------------- 12. loan shark ----------------
  P.limit = function () { return 1500 + actN(this) * 1500; };
  P.borrow = function (usd) {
    usd = Math.round(+usd || 0); const l = this.loan;
    if (!(usd > 0)) return { ok: false, reason: 'Enter an amount' };
    if (l.owed + usd > this.limit()) return { ok: false, reason: 'Vinnie will only lend you $' + (this.limit() - Math.round(l.owed)).toLocaleString() + ' more' };
    l.owed += usd; l.borrowed += usd; if (!l.due) l.due = this.game.clock.day + 7; l.lastDay = this.game.clock.day;
    this.game.bills.earn(usd, 'Vinnie');
    return { ok: true, text: '$' + usd.toLocaleString() + ' in your hand. 8% a day. Due day ' + l.due + '. Vinnie smiles too much.' };
  };
  P.repay = function (usd) {
    const l = this.loan; usd = Math.min(Math.round(+usd || l.owed), Math.ceil(l.owed), Math.floor(this.game.bills.cash));
    if (!(usd > 0)) return { ok: false, reason: l.owed ? 'Not enough cash' : 'You owe nothing' };
    this.game.bills.pay(usd); l.owed = Math.max(0, l.owed - usd);
    if (l.owed < 1) { l.owed = 0; l.due = 0; l.overdue = 0; return { ok: true, text: 'Paid off. Vinnie seems almost disappointed.' }; }
    return { ok: true, text: 'Paid $' + usd.toLocaleString() + '. Still owe $' + Math.round(l.owed).toLocaleString() + '.' };
  };
  P.loanDaily = function () {
    const l = this.loan, gm = this.game, day = gm.clock.day;
    if (!l.owed) return;
    const days = Math.max(0, day - (l.lastDay || day)); l.lastDay = day;
    l.owed *= Math.pow(1.08, days);
    if (day > l.due) {
      l.overdue = day - l.due;
      const st = gm.sys.story;
      if (st) st.inject({ id: 'shark' + day, who: 'shark', lines: ['Vinnie is at your door with a friend who does not talk.', '"You owe $' + Math.round(l.owed).toLocaleString() + '. That was due ' + l.overdue + ' day' + (l.overdue > 1 ? 's' : '') + ' ago. I\'m a patient man. My friend isn\'t."'],
        choices: [['Pay what you can', { do: 'finance.repay' }, '"Good. See? Easy."'], ['"I need more time."', { sanity: -8, do: 'finance.extend' }, '"Three days. Then my friend gets creative."'], ['Hide in the bathroom', { sanity: -12, do: 'finance.repo' }, 'They take something on the way out.']] });
    }
  };
  P.extend = function () { this.loan.due = this.game.clock.day + 3; this.loan.owed *= 1.15; return { ok: true, text: 'Due day ' + this.loan.due + ' (+15% for the trouble).' }; };
  P.repo = function () {
    const b = this.game.sys.build; let what = 'your fridge food';
    if (b && b.owned) { const ids = Object.keys(b.owned).filter((k) => b.owned[k] > 0 && k !== 'devdesk' && k !== 'desk' && k !== 'rack'); if (ids.length) { const id = ids[R(this).int(0, ids.length - 1)]; b.owned[id]--; what = 'your ' + ((BH.Build.CATALOG.find((x) => x.id === id) || {}).name || id); this.loan.owed = Math.max(0, this.loan.owed - 200); } }
    else this.game.bills.meals = 0;
    return { ok: true, text: 'They took ' + what + '.' };
  };

  // ---------------- 13. prop firm ----------------
  P.propStart = function () {
    const p = this.prop; if (p.state === 'challenge' || p.state === 'funded') return { ok: false, reason: 'Already ' + p.state };
    if (!this.game.bills.pay(p.fee)) return { ok: false, reason: 'The challenge fee is $' + p.fee };
    const n = netSol(this); Object.assign(p, { state: 'challenge', start: n, peak: n, low: n, day0: this.game.clock.day });
    return { ok: true, text: 'Challenge started: +20% net worth in 3 days, never more than 12% below your peak.' };
  };
  P.propTick = function () {
    const p = this.prop, gm = this.game, n = netSol(this);
    if (p.state === 'challenge') {
      p.peak = Math.max(p.peak, n); p.low = Math.min(p.low, n);
      if (n < p.peak * 0.88) { p.state = 'failed'; p.fails++; gm.emit('toast', { kind: 'bad', text: 'Prop firm challenge failed: more than 12% drawdown.' }); }
      else if (n >= p.start * 1.2) { p.state = 'funded'; p.eq = p.capital; p.prev = n; gm.emit('toast', { kind: 'info', text: 'Challenge passed! You now trade a 100 SOL firm account. 80% profit split.' }); if (gm.sys.world) gm.sys.world.headline('Local degen passes a prop firm challenge. Firm "cautiously optimistic".'); }
      else if (gm.clock.day >= p.day0 + 3) { p.state = 'failed'; p.fails++; gm.emit('toast', { kind: 'bad', text: 'Prop firm challenge failed: time ran out.' }); }
    }
  };
  P.propDaily = function () {
    const p = this.prop, gm = this.game; if (p.state !== 'funded') return;
    const n = netSol(this), r = p.prev > 0 ? n / p.prev - 1 : 0; p.prev = n;
    const pnl = p.eq * Math.max(-0.5, Math.min(1, r));
    p.eq += pnl;
    if (pnl > 0) { const pay = pnl * 0.8; gm.player.sol += pay; p.eq -= pay; p.paid += pay; gm.emit('toast', { kind: 'info', text: 'Prop firm payout: ' + pay.toFixed(2) + ' SOL.' }); }
    if (p.eq < p.capital * 0.9) { p.state = 'failed'; p.fails++; gm.emit('toast', { kind: 'bad', text: 'The firm pulled your funded account (10% loss).' }); }
  };

  // ---------------- 14. night market + 42. regimes (launch hook) ----------------
  P.onLaunch = function (tk) {
    const gm = this.game, h = gm.clock.hour, rr = R(this);
    tk.hype *= (REGIMES[this.regime] || REGIMES.chop).mul;
    if (h < 5) { tk.night = true; tk.hype *= rr.range(0.4, 2.8); tk.half *= rr.range(0.6, 1.6); this.nightCount++; }
  };
  P.regimeTick = function () {
    const wk = Math.floor((this.game.clock.day - 1) / 7); if (wk === this.regimeWeek) return;
    this.regimeWeek = wk;
    if (wk === 0) { this.regime = 'chop'; return; }
    const rr = R(this), roll = rr();
    const next = roll < 0.38 ? 'bull' : roll < 0.72 ? 'chop' : 'bear';
    if (next !== this.regime) { this.regime = next; if (this.game.sys.world) this.game.sys.world.headline(REGIMES[next].text); this.game.emit('toast', { kind: 'info', text: 'Market regime: ' + REGIMES[next].label }); }
  };

  // ---------------- 29. side gigs that fast-forward time ----------------
  P.startGig = function (kind, hours) {
    const gg = GIGS[kind]; if (!gg) return { ok: false, reason: 'Unknown gig' };
    if (this.gig) return { ok: false, reason: 'You are already working' };
    if (actN(this) < gg.act) return { ok: false, reason: 'Unlocks in act ' + gg.act };
    if (this.game.life.energy < 15) return { ok: false, reason: 'Too tired to work' };
    hours = Math.max(1, Math.min(8, Math.round(+hours || 4)));
    this.gig = { kind, start: this.game.clock.total, hours };
    this.game.warp = 20;
    return { ok: true, text: gg.name + ' for up to ' + hours + 'h. Time runs 20x faster while you work; the market keeps moving.' };
  };
  P.stopGig = function (why) {
    const gm = this.game, gg = this.gig; if (!gg) return { ok: false, reason: 'Not working' };
    const def = GIGS[gg.kind], worked = Math.max(0, Math.min(gg.hours, gm.clock.total - gg.start));
    const pay = Math.round(worked * def.rate);
    if (pay) gm.bills.earn(pay, def.name);
    gm.life.bump('energy', -def.energy * worked);
    this.gig = null; gm.warp = 1;
    this.gigLog.unshift({ day: gm.clock.day, name: def.name, hours: +worked.toFixed(1), pay }); if (this.gigLog.length > 10) this.gigLog.length = 10;
    return { ok: true, text: (why ? why + ' ' : '') + 'Worked ' + worked.toFixed(1) + 'h, earned $' + pay + '.' };
  };
  P.gigTick = function () {
    const gg = this.gig; if (!gg) return;
    const gm = this.game;
    if (gm.clock.total - gg.start >= gg.hours) gm.emit('toast', { kind: 'info', text: this.stopGig('Shift over.').text });
    else if (gm.life.energy < 5) gm.emit('toast', { kind: 'bad', text: this.stopGig('Exhausted.').text });
  };

  // ---------------- 34. airdrop farming ----------------
  P.farm = function (id) {
    const pr = PROTOCOLS.find((x) => x[0] === id); if (!pr) return { ok: false };
    const a = this.air, day = this.game.clock.day;
    if (a.farmedDay[id] === day) return { ok: false, reason: 'Already farmed ' + pr[1] + ' today' };
    if (this.game.player.sol < 0.03) return { ok: false, reason: 'You need 0.03 SOL for gas' };
    this.game.player.sol -= 0.02; this.game.clock.advanceHours(0.5);
    a.farmedDay[id] = day; a.points[id] = (a.points[id] || 0) + 1;
    if (!a.dropDay) a.dropDay = day + R(this).int(5, 12);
    return { ok: true, text: 'Bridged, swapped, staked and clicked "claim test points". ' + pr[1] + ' points: ' + a.points[id] + '.' };
  };
  P.airTick = function () {
    const a = this.air, gm = this.game, rr = R(this);
    if (!a.dropDay || gm.clock.day < a.dropDay) return;
    const ids = Object.keys(a.points).filter((k) => a.points[k] > 0); if (!ids.length) { a.dropDay = 0; return; }
    const id = ids[rr.int(0, ids.length - 1)], pts = a.points[id], name = PROTOCOLS.find((x) => x[0] === id)[1];
    const sybil = rr() < 0.3, usd = sybil ? 0 : Math.round(pts * rr.range(40, 260) * (rr() < 0.1 ? 8 : 1));
    a.points[id] = 0; a.dropDay = gm.clock.day + rr.int(6, 14); a.paid += usd; a.drops.unshift({ day: gm.clock.day, name, pts, usd });
    if (usd) gm.bills.earn(usd, name + ' airdrop');
    gm.emit('toast', { kind: usd ? 'info' : 'bad', text: usd ? name + ' airdropped! $' + usd.toLocaleString() + ' for ' + pts + ' days of farming.' : name + ' flagged you as a sybil. $0 for ' + pts + ' days of clicking.' });
  };

  // ---------------- 44. rug insurance desk ----------------
  P.insOpen = function () { const i = this.ins; if (i.open) return { ok: false }; if (!this.game.bills.pay(1000)) return { ok: false, reason: 'Starting the desk needs a $1,000 reserve' }; i.open = true; i.pool = 1000; i.seen = this.game.sim.events.length; return { ok: true, text: 'RugShield is open. NPCs buy policies; you pay when their coins rug.' }; };
  P.insTick = function () {
    const i = this.ins, gm = this.game, rr = R(this); if (!i.open) return;
    const ev = gm.sim.events;
    // the sim keeps a rolling list; count rugs that are new since we last looked
    let rugs = 0; for (const e of ev) if (e.type === 'rug' && !e._ins) { e._ins = 1; rugs++; }
    for (let k = 0; k < rugs; k++) if (rr() < Math.min(0.35, i.policies / 400)) { const claim = rr.int(40, 220); i.pool -= claim; i.claims += claim; }
    if (i.lastDay !== gm.clock.day) {
      i.lastDay = gm.clock.day;
      const rep = gm.sys.factory ? gm.sys.factory.rep : 50;
      const sold = Math.round(rr.range(6, 18) * (0.5 + rep / 100));
      i.policies = Math.round(i.policies * 0.6) + sold;
      const prem = sold * 30; i.pool += prem; i.premiums += prem;
    }
    if (i.pool < 0) { const need = -i.pool; if (gm.bills.pay(Math.min(need, gm.bills.cash))) i.pool += Math.min(need, gm.bills.cash); if (i.pool < 0) { i.open = false; gm.emit('toast', { kind: 'bad', text: 'RugShield went bust. Too many rugs, not enough reserve.' }); } }
  };
  P.insWithdraw = function () { const i = this.ins; const take = Math.max(0, Math.floor(i.pool - 500)); if (!take) return { ok: false, reason: 'Keep at least $500 in reserve' }; i.pool -= take; this.game.bills.earn(take, 'RugShield'); return { ok: true, text: 'Took $' + take.toLocaleString() + ' out of the pool.' }; };

  P.afterTime = function () {
    this.regimeTick(); this.propTick(); this.gigTick(); this.insTick();
    if (this.lastDay !== this.game.clock.day) { this.lastDay = this.game.clock.day; this.loanDaily(); this.propDaily(); this.airTick(); }
  };

  Finance.GIGS = GIGS; Finance.PROTOCOLS = PROTOCOLS; Finance.REGIMES = REGIMES;
  BH.Finance = Finance;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'finance', create(game, saved) { const f = new Finance(game, saved); f.hooks = { launch: (tk) => f.onLaunch(tk) }; if (f.gig) game.warp = 20; return f; } });
})(typeof window !== 'undefined' ? window : globalThis);
