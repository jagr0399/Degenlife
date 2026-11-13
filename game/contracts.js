/* Daily contracts: three small trading goals every game day ("2x a coin", "catch a frenzy", "get 10 buyers on a call"...).
   Finish one for cash, SOL or followers; unfinished ones expire at midnight. A streak of days with all three done pays a bonus.
   Hooks: step (checks the day and progress), trade (your trades). */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  // id, text, goal, reward kind, reward range
  const POOL = [
    { id: 'x2', text: 'Sell a coin at 2x or more', goal: 1, pay: ['cash', 120, 300] },
    { id: 'x5', text: 'Sell a coin at 5x or more', goal: 1, pay: ['sol', 0.4, 1], hard: true },
    { id: 'newpair', text: 'Buy a new pair under $15K and sell it for a profit', goal: 1, pay: ['cash', 80, 200] },
    { id: 'frenzy', text: 'Trade a coin while it is in a frenzy', goal: 1, pay: ['cash', 60, 150] },
    { id: 'cut', text: 'Cut a loser: sell between −10% and −30%', goal: 1, pay: ['cash', 50, 120] },
    { id: 'trades', text: 'Make 10 trades', goal: 10, pay: ['cash', 60, 140] },
    { id: 'volume', text: 'Trade 5 SOL of volume', goal: 5, pay: ['sol', 0.1, 0.3] },
    { id: 'wins', text: 'Close 3 trades in profit', goal: 3, pay: ['cash', 100, 220] },
    { id: 'call', text: 'Make a callout that gets 10+ buyers', goal: 1, pay: ['followers', 80, 250] },
    { id: 'stream', text: 'Stream for 10 minutes', goal: 10, pay: ['cash', 60, 160] },
    { id: 'viewers', text: 'Hit 50 viewers on stream', goal: 50, pay: ['followers', 60, 200], hard: true },
    { id: 'migrated', text: 'Hold a coin while it migrates', goal: 1, pay: ['cash', 90, 220] },
  ];
  function Contracts(game, saved) {
    this.game = game; this.day = null; this.list = []; this.streak = 0; this.done = 0; this.held = {};
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Contracts.prototype;
  Contracts.POOL = POOL;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  P.roll = function () {
    const gm = this.game, r = gm.sim.r, day = gm.clock ? gm.clock.day : 1;
    // yesterday: all three done keeps the streak going
    if (this.day != null) this.streak = this.list.length && this.list.every((c) => c.done) ? this.streak + 1 : 0;
    this.day = day;
    const pool = POOL.filter((p) => !p.hard || r() < 0.35 || day > 4).slice();
    const pick = [];
    while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    this.list = pick.map((p) => ({ id: p.id, text: p.text, goal: p.goal, have: 0, done: false, pay: p.pay[0], amount: p.pay[0] === 'sol' ? +r.range(p.pay[1], p.pay[2]).toFixed(2) : Math.round(r.range(p.pay[1], p.pay[2]) * (1 + Math.min(1, this.streak * 0.15))) }));
    this.held = {};
  };
  P.progress = function (id, n, abs) {
    for (const c of this.list) if (c.id === id && !c.done) { c.have = abs ? Math.max(c.have, n) : c.have + n; if (c.have >= c.goal) this.finish(c); }
  };
  P.finish = function (c) {
    const gm = this.game; c.done = true; c.have = c.goal; this.done++;
    let what;
    if (c.pay === 'cash') { gm.bills.earn(c.amount, 'Contract: ' + c.text); what = '$' + c.amount; }
    else if (c.pay === 'sol') { gm.player.sol += c.amount; what = c.amount + ' SOL'; }
    else { const tr = gm.sys.trencher; if (tr) tr.followers += c.amount; what = '+' + c.amount + ' followers'; }
    gm.emit('toast', { kind: 'buy', text: 'Contract done: ' + c.text + ' (' + what + ')' });
    if (this.list.every((x) => x.done)) { const bonus = 100 + 50 * this.streak; gm.bills.earn(bonus, 'All contracts done'); gm.emit('toast', { kind: 'buy', text: 'All 3 contracts done today! Bonus $' + bonus + (this.streak ? ' (' + (this.streak + 1) + '-day streak)' : '') }); }
  };
  P.onTrade = function (tk, tr) {
    if (!tr.you || !this.list.length) return;
    const gm = this.game, sim = gm.sim, p = gm.player.pos.get(tk.id);
    this.progress('trades', 1); this.progress('volume', tr.sol || 0);
    if (tk.dir && tk.dir.fzUntil > sim.t) this.progress('frenzy', 1);
    if (tr.side === 'buy') { if (sim.mc(tk) < 15000 && tk.stage === 'curve') this.held[tk.id] = 'newpair'; return; }
    const entry = p && p.tokens > 0 ? p.cost / p.tokens : 0, px = tr.tok > 0 ? tr.sol / tr.tok : 0, x = entry > 0 ? px / entry : 1;
    if (x >= 2) this.progress('x2', 1);
    if (x >= 5) this.progress('x5', 1);
    if (x > 1.02) { this.progress('wins', 1); if (this.held[tk.id] === 'newpair') this.progress('newpair', 1); }
    if (x <= 0.9 && x >= 0.7) this.progress('cut', 1);
  };
  P.onStep = function () {
    const gm = this.game; if (!gm.sim || !gm.clock) return;
    if (this.day !== gm.clock.day) this.roll();
    const st = gm.sys.stream; if (st) { this.progress('stream', Math.floor(st.live ? (gm.sim.t - st.liveSince) / 60 : 0), true); if (st.live) this.progress('viewers', st.viewers, true); }
    const tr = gm.sys.trencher; if (tr) for (const c of tr.calls) if ((c.buyers || 0) >= 10 && gm.sim.t - c.t < 700) { this.progress('call', 1, true); break; }
    // holding through a migration
    for (const [id, p] of gm.player.pos) { if (p.tokens < 1) continue; const tk = gm.sim.byId.get(id); if (tk && tk.stage === 'amm' && tk.migratedAt != null && tk.migratedAt > p.first) { this.progress('migrated', 1, true); break; } }
  };
  BH.Contracts = Contracts;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'contracts', create(game, saved) { const c = new Contracts(game, saved); c.hooks = { step: () => c.onStep(), trade: (tk, tr) => c.onTrade(tk, tr) }; return c; } });
})(typeof window !== 'undefined' ? window : globalThis);
