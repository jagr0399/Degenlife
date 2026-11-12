/* Stage 5: your launchpad. A share of new coins launch on it; you earn platform fees on their trades.
   Server racks set capacity, a moderation queue lets you ban sketchy coins, a featured slot pumps one coin,
   and a rival launchpad fights you for market share. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const PRICE = 40000;

  function Pad(game, saved) {
    this.game = game;
    this.owned = false; this.name = 'LaunchLab'; this.share = 0.08; this.feePct = 1.0; this.trust = 60;
    this.earned = 0; this.earnedToday = 0; this.pending = 0; this.queue = []; this.featured = null; this.banned = 0;
    this.rival = { name: 'PumpCity', share: 0.6, mood: 'calm' }; this.outageUntil = 0; this.log = [];
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Pad.prototype;
  Pad.PRICE = PRICE;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  P.note = function (text) { this.log.unshift({ day: this.game.clock.day, text }); if (this.log.length > 40) this.log.length = 40; };
  P.capacity = function () { return (this.game.sys.build ? this.game.sys.build.effects().racks : 0) * 8; };
  P.live = function () { return this.game.sim.tokens.filter((t) => t.pad === 'you' && !t.dead); };
  P.buy = function () {
    if (this.owned) return { ok: false, reason: 'Already yours' };
    if (!this.game.sys.build.places.includes('tower')) return { ok: false, reason: 'You need the Tower first' };
    if (this.game.bills.cash < PRICE) return { ok: false, reason: 'Needs $' + PRICE.toLocaleString() + ' cash' };
    this.game.bills.pay(PRICE); this.owned = true; this.note('You launched ' + this.name + '.');
    return { ok: true, text: this.name + ' is live. Buy server racks to host more coins.' };
  };
  P.setFee = function (pct) { this.feePct = Math.max(0.5, Math.min(2.5, pct)); };
  P.market = function (usd) {
    if (!this.owned) return { ok: false, reason: 'No launchpad yet' };
    if (!this.game.bills.pay(usd)) return { ok: false, reason: 'Not enough cash' };
    this.share = Math.min(0.85, this.share + usd / 200000);
    return { ok: true, text: 'Marketing campaign is live. Market share up.' };
  };
  P.onLaunch = function (tk, r) {
    if (!this.owned) return;
    const cap = this.capacity();
    if (r() < this.share && this.live().length < cap && this.game.sim.t >= this.outageUntil) {
      tk.pad = 'you';
      const risk = (tk.bundle && tk.bundle.length > 2) || tk.fate === 'rug' || tk.fate === 'pnd';
      if (risk && r() < 0.6) this.queue.push({ coin: tk.id, why: tk.fate === 'rug' ? 'Dev wallet funded from a known rugger' : tk.bundle && tk.bundle.length > 2 ? 'Same-block bundle at launch' : 'Coordinated buys look like a pump group', t: this.game.sim.t });
    }
  };
  // platform fees on your coins: the base curve fee scaled by your fee setting
  P.onFee = function (tk, feeSol, tr) {
    if (tk.pad !== 'you' || this.game.sim.t < this.outageUntil || (tr && tr.you)) return;
    // your cut is a share of the fee actually charged; a higher fee setting raises the share (max half) but costs users
    const cut = feeSol * Math.min(1, this.feePct / 2.5) * 0.5;
    this.pending += cut; this.earned += cut; this.earnedToday += cut;
  };
  P.moderate = function (coinId, ban) {
    const i = this.queue.findIndex((q) => q.coin === coinId); if (i < 0) return { ok: false, reason: 'Not in the queue' };
    this.queue.splice(i, 1);
    const tk = this.game.sim.byId.get(coinId);
    if (ban && tk && !tk.dead) { const held = this.game.player.pos.has(tk.id); this.game.sim.kill(tk); tk.banned = true; if (held) this.game.emit('toast', { kind: 'bad', text: 'You held $' + tk.ticker + ': banning it wrote your bag off.' }); this.trust = Math.min(100, this.trust + 3); this.banned++; this.note('Banned $' + tk.ticker + '.'); return { ok: true, text: '$' + tk.ticker + ' banned. Trust up.' }; }
    if (tk) tk.allowed = true;
    return { ok: true, text: 'Allowed.' };
  };
  P.feature = function (coinId) { const tk = this.game.sim.byId.get(coinId); if (!tk || tk.dead) return { ok: false, reason: 'Pick a live coin' }; this.featured = coinId; return { ok: true, text: '$' + tk.ticker + ' is on the billboard.' }; };
  P.onStep = function (dt) {
    if (!this.owned) return;
    const sim = this.game.sim, r = sim.r;
    if (this.pending > 0.05) { this.game.player.sol += this.pending; this.pending = 0; }
    if (this.queue.length) this.queue = this.queue.filter((q) => { const t = sim.byId.get(q.coin); return t && !t.dead; });
    const f = this.featured && sim.byId.get(this.featured);
    if (f && !f.dead) f.hype += 0.02 * dt; else this.featured = null;
    // allowed coins that rug hurt your platform's trust
    for (const tk of this.live()) if (tk.rugged && !tk._padCounted) { tk._padCounted = true; this.trust = Math.max(0, this.trust - (tk.allowed ? 6 : 3)); }
    // hot servers: over 85% full without cooling -> outages
    const cap = this.capacity(), load = cap ? this.live().length / cap : 1;
    const cooling = this.game.sys.build ? this.game.sys.build.effects().cooling : 0;
    if (sim.t >= this.outageUntil && load > 0.85 && r() < dt * 0.002 / (1 + cooling)) { this.outageUntil = sim.t + 30; this.trust = Math.max(0, this.trust - 4); this.note('Server outage! Trading on your coins paused for 30 s.'); this.game.emit('toast', { kind: 'bad', text: 'Server outage on ' + this.name + '!' }); }
    // share drifts with trust and fees; the rival pulls the other way
    const target = Math.min(0.85, 0.05 + this.trust / 140 - (this.feePct - 1) * 0.12);
    this.share += (target - this.share) * 0.0008 * dt;
    this.rival.share = Math.max(0.1, 1 - this.share - 0.15);
  };
  P.afterTime = function () {
    if (!this.owned) return;
    const day = this.game.clock.day, r = this.game.sim.r;
    if (this.day === day) return;
    this.day = day;
    if (this.earnedToday > 0) this.note('Earned ' + this.earnedToday.toFixed(2) + ' SOL in fees yesterday.');
    this.earnedToday = 0;
    const roll = r();
    if (roll < 0.25) { this.share = Math.max(0.03, this.share - 0.05); this.rival.mood = 'fee war'; this.note(this.rival.name + ' cut their fees to steal your users.'); if (this.game.sys.social) this.game.sys.social.post({ name: this.rival.name, handle: '@pumpcity', pfp: 30, followers: 400000, verified: true }, 'chatter', 'zero fee weekend on PumpCity. why launch anywhere else?', {}); }
    else if (roll < 0.35 && this.game.sys.firm && this.game.sys.firm.staff.length) { const t = this.game.sys.firm.staff[r.int(0, this.game.sys.firm.staff.length - 1)]; if (t.loyalty < 60) { this.note(this.rival.name + ' poached ' + t.name + '.'); this.game.sys.firm.fire(t.id); } }
    else this.rival.mood = 'calm';
  };
  BH.Pad = Pad;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'pad', create(game, saved) { const p = new Pad(game, saved); p.hooks = { launch: (tk, r) => p.onLaunch(tk, r), fee: (tk, fee, tr) => p.onFee(tk, fee, tr), step: (dt) => p.onStep(dt) }; return p; } });
})(typeof window !== 'undefined' ? window : globalThis);
