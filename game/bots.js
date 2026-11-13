/* Trading bots you build from simple rules (the automation loop from Bitburner-style games).
   A rule: WHEN <trigger> on a coin under <max market cap> → BUY <SOL> → sell at <take-profit x> or <stop-loss %>.
   Triggers: a frenzy starts · a brand-new pair · a KOL calls it · a celebrity coin launches · a crowd (500+ viewers) shows up.
   Bots trade from your wallet with real (fake) SOL, keep running while you sleep or work, and keep their own P&L.
   Each rule holds at most 2 coins at once and buys each coin once. Hooks: step. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const TRIGS = {
    frenzy: { name: 'A frenzy starts', test: (gm, tk) => tk.dir && tk.dir.fzUntil > gm.sim.t },
    newpair: { name: 'A brand-new pair launches', test: (gm, tk) => gm.sim.t - tk.born < 15 },
    kolcall: { name: 'A KOL calls it', test: (gm, tk) => (tk.calls || []).some((c) => gm.sim.t - c.t < 5 && c.who !== 'you') || (gm.sys.social && gm.sys.social.posts.slice(-6).some((p) => p.kind === 'call' && p.coin === tk.id && gm.sim.t - p.t < 5)) },
    celeb: { name: 'A celebrity coin launches', test: (gm, tk) => !!tk.celeb && gm.sim.t - tk.born < 30 },
    crowd: { name: '500+ people are watching', test: (gm, tk) => (tk.views || 0) >= 500 },
  };
  function Bots(game, saved) {
    this.game = game; this.rules = []; this.seq = 0; this.log = []; this.held = {}; this.acc = 0; this.seenClosed = 0;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Bots.prototype;
  Bots.TRIGS = TRIGS;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; o.log = this.log.slice(0, 40); return o; };
  P.add = function (r) {
    if (this.rules.length >= 5) return { ok: false, reason: 'You can run 5 bots at most' };
    if (!TRIGS[r.trig]) return { ok: false, reason: 'Pick a trigger' };
    const rule = { id: 'b' + (++this.seq), trig: r.trig, maxMc: Math.max(3000, +r.maxMc || 50000), buy: Math.max(0.01, Math.min(5, +r.buy || 0.1)), tp: Math.max(1.1, +r.tp || 2), sl: Math.max(5, Math.min(90, +r.sl || 30)), on: true, pnl: 0, trades: 0, wins: 0, coins: [] };
    this.rules.push(rule);
    return { ok: true, text: 'Bot ' + rule.id + ' is running: ' + TRIGS[rule.trig].name.toLowerCase() + ' → buy ' + rule.buy + ' SOL' };
  };
  P.toggle = function (id) { const r = this.rules.find((x) => x.id === id); if (!r) return { ok: false, reason: 'No such bot' }; r.on = !r.on; return { ok: true, text: 'Bot ' + id + (r.on ? ' on' : ' paused') }; };
  P.remove = function (id) { const i = this.rules.findIndex((x) => x.id === id); if (i < 0) return { ok: false, reason: 'No such bot' }; this.rules.splice(i, 1); return { ok: true, text: 'Bot removed (its open bags stay yours)' }; };
  P.note = function (text) { this.log.unshift({ t: this.game.sim.t, day: this.game.clock ? this.game.clock.day : 0, text }); if (this.log.length > 40) this.log.length = 40; };
  P.onStep = function (dt) {
    const gm = this.game; if (!gm.sim || !this.rules.length) return;
    // closed positions that a bot opened: credit the bot
    const cl = gm.player.closed; if (cl.length > this.seenClosed) { for (let i = cl.length - this.seenClosed - 1; i >= 0; i--) { const c = cl[i], bid = this.held[c.id]; if (bid) { const r = this.rules.find((x) => x.id === bid); if (r) { r.pnl += c.pnl; if (c.pnl > 0) r.wins++; } this.note('Bot ' + bid + ' closed $' + c.ticker + ': ' + (c.pnl >= 0 ? '+' : '') + c.pnl.toFixed(3) + ' SOL'); delete this.held[c.id]; } } } this.seenClosed = cl.length;
    this.acc += dt; if (this.acc < 1) return; this.acc = 0;
    const sim = gm.sim, p = gm.player, ord = gm.sys.orders;
    for (const r of this.rules) {
      if (!r.on) continue;
      r.coins = r.coins.filter((id) => p.pos.has(id) && p.pos.get(id).tokens > 1);
      if (r.coins.length >= 2) continue;
      if (p.sol < r.buy + 0.02) continue;
      const tk = sim.tokens.find((t) => !t.dead && !t.rugged && !t.isPlayer && sim.mc(t) <= r.maxMc && !r.coins.includes(t.id) && !this.held[t.id] && !(r.bought || {})[t.id] && TRIGS[r.trig].test(gm, t));
      if (!tk) continue;
      const res = p.buy(tk.id, r.buy, { priority: 0.003 });
      if (!res || !res.ok) continue;
      r.bought = r.bought || {}; r.bought[tk.id] = 1; const keys = Object.keys(r.bought); if (keys.length > 300) delete r.bought[keys[0]];
      r.coins.push(tk.id); r.trades++; this.held[tk.id] = r.id;
      const mc = sim.mc(tk);
      if (ord) { ord.add(tk.id, 'tp', mc * r.tp, 1); ord.add(tk.id, 'sl', mc * (1 - r.sl / 100), 1); }
      this.note('Bot ' + r.id + ' bought $' + tk.ticker + ' at ' + BH.fmt.usd(mc) + ' (' + TRIGS[r.trig].name.toLowerCase() + ')');
      gm.emit('toast', { kind: 'info', text: '🤖 Bot ' + r.id + ' bought $' + tk.ticker + ' for ' + r.buy + ' SOL' });
    }
  };
  BH.Bots = Bots;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'bots', create(game, saved) { const b = new Bots(game, saved); b.hooks = { step: (dt) => b.onStep(dt) }; return b; } });
})(typeof window !== 'undefined' ? window : globalThis);
