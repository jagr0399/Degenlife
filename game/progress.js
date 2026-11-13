/* Progression and people (ideas from The Sims, Stardew Valley and sports sims):
   - Trader skills: Charting, Risk, Social and Hustle level up (1-10) from what you do, and each level is a real perk:
       Charting  a "gut feeling" read on each coin (shown on the token page), right more often as you level
       Risk      losses hurt your sanity less, revenge mood ends sooner
       Social    more followers from calls and clips, more stream viewers
       Hustle    more cash from contracts, gigs and stream donations
   - Mood streaks: "On a heater" after 3 winning closes in a row (focus up), "Revenge trading" after a big loss
     (focus down, so orders land late, until you sleep or it wears off).
   - Degen Con: every 7th day is a festival day (see game/days.js); your best trade that day can win the contest.
   - Relationships: your roommate Dex, Mom and the group chat react to how you trade and pay rent; they help or hurt.
   - The day report: what happened today (best / worst trade, followers, contracts, rival rank) and while you were away.
   Hooks: step, trade. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const SKILLS = {
    chart: { name: 'Charting', ic: 'line-chart', perk: (l) => 'Gut feeling on coins, right ' + Math.round(55 + l * 4) + '% of the time' },
    risk: { name: 'Risk', ic: 'shield', perk: (l) => 'Losses cost ' + l * 8 + '% less sanity; revenge mood ' + l * 8 + '% shorter' },
    social: { name: 'Social', ic: 'megaphone', perk: (l) => '+' + l * 5 + '% followers from calls and clips, +' + l * 5 + '% stream viewers' },
    hustle: { name: 'Hustle', ic: 'briefcase', perk: (l) => '+' + l * 5 + '% cash from contracts, gigs and donations' },
  };
  const XP = (lvl) => Math.round(60 * Math.pow(lvl, 1.6));   // xp needed to reach the next level
  const PEOPLE = { dex: { name: 'Dex', role: 'roommate' }, mom: { name: 'Mom', role: 'family' }, chat: { name: 'Group chat', role: 'friends' } };

  function Progress(game, saved) {
    this.game = game;
    this.skills = { chart: { lvl: 1, xp: 0 }, risk: { lvl: 1, xp: 0 }, social: { lvl: 1, xp: 0 }, hustle: { lvl: 1, xp: 0 } };
    this.mood = null; this.streak = 0; this.rel = { dex: 50, mom: 60, chat: 55 }; this.seenClosed = 0; this.day = null; this.today = null; this.away = []; this.con = null; this.acc = 0;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Progress.prototype;
  Progress.SKILLS = SKILLS; Progress.PEOPLE = PEOPLE;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; o.away = this.away.slice(0, 30); return o; };
  P.lvl = function (k) { return this.skills[k] ? this.skills[k].lvl : 1; };
  P.gain = function (k, xp) {
    const s = this.skills[k]; if (!s || s.lvl >= 10) return;
    s.xp += xp;
    while (s.lvl < 10 && s.xp >= XP(s.lvl)) { s.xp -= XP(s.lvl); s.lvl++; this.game.emit('toast', { kind: 'buy', text: SKILLS[k].name + ' level ' + s.lvl + '! ' + SKILLS[k].perk(s.lvl) }); }
  };
  P.chat = function (who, text) { const ex = this.game.sys.extras; if (ex && ex.chat) { ex.chat.unshift({ day: this.game.clock.day, hour: Math.floor(this.game.clock.hour), who, text }); if (ex.chat.length > 60) ex.chat.length = 60; } };
  P.relBump = function (k, d) { this.rel[k] = Math.max(0, Math.min(100, (this.rel[k] || 50) + d)); };
  // the charting perk: a gut read on a coin (right more often as you level); stable per coin and level
  P.gut = function (tk) {
    if (!tk || !tk.fate2) return null;
    const l = this.lvl('chart'), acc = 0.55 + l * 0.04;
    const h = (String(tk.id).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 1000) / 1000;
    const truth = tk.fate2 === 'rug' || tk.fate2 === 'pnd' ? 'rug' : tk.fate2 === 'doa' ? 'dud' : 'runner';
    const opts = ['rug', 'dud', 'runner'], read = h < acc ? truth : opts[(opts.indexOf(truth) + 1 + Math.floor(h * 10) % 2) % 3];
    return { read, text: read === 'rug' ? 'smells like a rug' : read === 'dud' ? 'probably goes nowhere' : 'could run', conf: Math.round(acc * 100) };
  };
  P.setMood = function (id, hours) {
    const gm = this.game, life = gm.life;
    if (this.mood && this.mood.id === id) { this.mood.until = gm.clock.total + hours; return; }
    this.mood = { id, until: gm.clock.total + hours };
    if (id === 'heater') { if (life) life.moodFocus = 15; gm.emit('toast', { kind: 'buy', text: 'On a heater 🔥 3 wins in a row. Focus up.' }); }
    if (id === 'revenge') { if (life) { life.moodFocus = -20; life.bump('sanity', -6); } gm.emit('toast', { kind: 'bad', text: 'Revenge trading 😤 after that loss. Focus is down (orders land late). Sleep it off or take a walk.' }); }
  };
  // a position you closed: skills, moods, people and today's report
  P.onClose = function (rec) {
    const gm = this.game, x = rec.mult || 0, pnl = rec.pnl || 0, T = this.today;
    if (T) { T.closes++; if (!T.best || x > T.best.mult) T.best = { ticker: rec.ticker, mult: x, pnl }; if (!T.worst || x < T.worst.mult) T.worst = { ticker: rec.ticker, mult: x, pnl }; T.pnl += pnl; }
    this.gain('chart', 6 + Math.max(0, Math.min(40, (x - 1) * 20)));
    if (x < 1 && x >= 0.6) this.gain('risk', 12);   // cutting a loser early
    if (pnl > 0) { this.streak = Math.max(0, this.streak) + 1; if (this.streak >= 3) this.setMood('heater', 2); }
    else { this.streak = Math.min(0, this.streak) - 1; if (x <= 0.6 && !rec.rugged) this.setMood('revenge', 1.5 * (1 - this.lvl('risk') * 0.08)); }
    // the people around you
    if (x >= 3) { this.relBump('chat', 4); this.chat('Group chat', ['YOU HIT ' + x.toFixed(1) + 'X ON $' + rec.ticker + '??', 'dinner is on you', 'teach me ser'][Math.floor(Math.random() * 3)]); }
    if (pnl < -1.5) { this.relBump('mom', -3); if (this.rel.mom < 40) this.chat('Mom', 'honey are you ok? you sound stressed. call me'); }
    if (this.con && this.con.day === gm.clock.day && x > (this.con.best || 0)) this.con.best = x;
  };
  P.onTrade = function (tk, tr) { if (tr.you && tr.side === 'buy') { if (this.today) this.today.trades++; this.gain('chart', 1); } };
  P.newDay = function (day) {
    const gm = this.game;
    // Degen Con: yesterday's contest result
    if (this.con && this.con.day === day - 1 && !this.con.paid) {
      this.con.paid = true;
      if ((this.con.best || 0) >= 2) { gm.bills.earn(500, 'Degen Con trading contest'); const tr = gm.sys.trencher; if (tr) tr.followers += 250; gm.emit('toast', { kind: 'buy', text: 'You won the Degen Con trading contest with a ' + this.con.best.toFixed(1) + 'x! $500 and 250 followers.' }); }
      else gm.emit('toast', { kind: 'info', text: 'Degen Con is over. Best trade needed 2x to win the contest' + (this.con.best ? ' (yours: ' + this.con.best.toFixed(2) + 'x)' : '') + '.' });
    }
    if (day % 7 === 0) { this.con = { day, best: 0, paid: false }; gm.emit('toast', { kind: 'call', text: 'Degen Con today! Launches everywhere, KOLs on stage. Trading contest: close a 2x or better today to win $500.' }); }
    // relationships drift and do things
    const r = gm.sim ? gm.sim.r : Math.random;
    if (gm.bills && gm.bills.debt > 0) this.relBump('dex', -4);   // owing money makes the roommate nervous
    if (this.rel.dex < 30 && gm.bills && gm.bills.meals > 0 && r() < 0.5) { gm.bills.meals--; this.chat('Dex', 'ate one of your meals. you owe me anyway'); }
    if (this.rel.dex > 75 && r() < 0.3) { gm.bills.earn(40, 'Dex chipped in for groceries'); this.chat('Dex', 'got groceries, we\'re good'); }
    if (this.rel.mom > 70 && gm.bills && gm.bills.cash < 150 && r() < 0.5) { gm.bills.earn(60, 'Mom sent money'); this.chat('Mom', 'sent you a little something. eat a vegetable'); this.relBump('mom', -2); }
    if (this.rel.chat < 35 && r() < 0.4) this.chat('Group chat', 'nobody has heard from you in days. you alive?');
    this.relBump('mom', 1); this.relBump('chat', -1);
    // a fresh report for the new day
    const tr = gm.sys.trencher;
    this.today = { day, trades: 0, closes: 0, pnl: 0, best: null, worst: null, f0: tr ? Math.round(tr.followers) : 0, c0: gm.sys.contracts ? gm.sys.contracts.done : 0 };
  };
  // the day report (shown with the sleep summary)
  P.report = function () {
    const gm = this.game, T = this.today || {}, tr = gm.sys.trencher, rv = gm.sys.rivals, ct = gm.sys.contracts;
    return { day: T.day, trades: T.trades || 0, closes: T.closes || 0, pnl: T.pnl || 0, best: T.best, worst: T.worst, followers: tr ? Math.round(tr.followers) - (T.f0 || 0) : 0, contracts: ct ? ct.done - (T.c0 || 0) : 0, rank: rv ? rv.rank() : null, mood: this.mood && this.mood.until > gm.clock.total ? this.mood.id : null };
  };
  // headlines while you were away (sleep, gigs): collected from the world's headlines
  // (world news is newest-first: remember the newest item when you leave, everything above it is what you missed)
  P.markAway = function () { const w = this.game.sys.world; this._awayRef = w && w.news ? w.news[0] || null : null; this.sleepRep = this.report(); };
  P.awayList = function () {
    const w = this.game.sys.world; if (!w || !w.news) return [];
    const out = []; for (const n of w.news) { if (n === this._awayRef) break; out.push(n.text); if (out.length >= 8) break; }
    return out;
  };
  P.onStep = function (dt) {
    const gm = this.game; if (!gm.clock || !gm.sim) return;
    if (this.day !== gm.clock.day) { this.day = gm.clock.day; this.newDay(this.day); }
    if (this.mood && this.mood.until <= gm.clock.total) { this.mood = null; if (gm.life) gm.life.moodFocus = 0; }
    const cl = gm.player.closed; if (cl.length > this.seenClosed) { for (let i = cl.length - this.seenClosed - 1; i >= 0; i--) this.onClose(cl[i]); this.seenClosed = cl.length; } else if (cl.length < this.seenClosed) this.seenClosed = cl.length;
    this.acc += dt; if (this.acc < 30) return; this.acc = 0;
    // slow xp from what you're doing: streaming and calls (social), contracts and gigs (hustle)
    const st = gm.sys.stream; if (st && st.live) this.gain('social', 2 + st.viewers / 50);
    const fin = gm.sys.finance; if (fin && fin.gig) this.gain('hustle', 4);
    // Degen Con: KOLs on stage call coins every so often
    if (this.con && this.con.day === gm.clock.day && gm.sim.r() < 0.25) { const s = gm.sys.social, live = gm.sim.tokens.filter((t) => !t.dead && t.dir); const tk = live[Math.floor(gm.sim.r() * live.length)]; if (s && tk) { const k = s.kols[Math.floor(gm.sim.r() * s.kols.length)]; s.post(k, 'call', 'on stage at Degen Con: $' + tk.ticker + ' is my pick', { coin: tk.id, mcAt: gm.sim.mc(tk) }); tk.hype = (tk.hype || 0) + 0.8; } }
  };
  BH.Progress = Progress;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'progress', create(game, saved) { const p = new Progress(game, saved); p.hooks = { step: (dt) => p.onStep(dt), trade: (tk, tr) => p.onTrade(tk, tr) }; return p; } });

  // ---- perks wired into the other systems ----
  const lv = (gm, k) => (gm && gm.sys && gm.sys.progress ? gm.sys.progress.lvl(k) : 1);
  // Social: more followers from calls/clips
  if (BH.Trencher) { const ob = BH.Trencher.prototype.bump; BH.Trencher.prototype.bump = function (k, d) { if (k === 'followers' && d > 0) d *= 1 + (lv(this.game, 'social') - 1) * 0.05; if (k === 'followers' && d > 0 && this.game.sys.progress) this.game.sys.progress.gain('social', 5); return ob.call(this, k, d); }; }
  // Hustle: more cash from contracts, gigs and donations (bills.earn with those labels)
  if (BH.Bills) { const oe = BH.Bills.prototype.earn; BH.Bills.prototype.earn = function (usd, what) { const gm = this.game || BH.Game; if (usd > 0 && /^(Contract|Stream donation|Stream sub)|gig|Gig|delivery/i.test(what || '')) { const k = lv(gm, 'hustle'); usd = Math.round(usd * (1 + (k - 1) * 0.05)); if (gm && gm.sys && gm.sys.progress) gm.sys.progress.gain('hustle', 3); } return oe.call(this, usd, what); }; }
  // Risk: losses cost less sanity
  if (BH.Life) { const oc = BH.Life.prototype.onClose; if (oc) BH.Life.prototype.onClose = function (pnl) { const s0 = this.sanity; oc.call(this, pnl); if (pnl < 0) { const gm = BH.Game; const cut = (lv(gm, 'risk') - 1) * 0.08; this.sanity = s0 + (this.sanity - s0) * (1 - cut); } }; }
})(typeof window !== 'undefined' ? window : globalThis);
