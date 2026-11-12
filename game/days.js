/* Market days (Nov 12): every game day gets a mood, so no two days trade the same.
   Bull day, Bear day, Runner season (several runners and a mega), Rug season, Degen frenzy, Quiet day, Whale day and
   "<narrative> meta" days. The mood biases which coin fates the chart director picks, how fast coins launch, and the SOL
   price, and it is announced in the news and shown on the HUD. On top of that, 1-3 surprise events happen during the day
   (a KOL hour, a flash dip, a viral video, a short squeeze on SOL, a forced runner...). Uses its own random stream. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  // id, label, short HUD text, icon, weight, fate multipliers, launch speed, SOL move (%), description
  const TYPES = [
    { id: 'normal', label: 'Normal day', hud: 'Normal day', ic: 'sun', w: 30, fate: {}, launch: 1, sol: [-1, 1], text: 'A regular day in the trenches.' },
    { id: 'bull', label: 'Bull day', hud: 'Bull day', ic: 'trending-up', w: 12, fate: { runner: 1.8, pnd: 1.2, rug: 0.7, doa: 0.85 }, launch: 1.3, sol: [3, 6], text: 'Green day: SOL is ripping and buyers are everywhere. More coins run.' },
    { id: 'bear', label: 'Bear day', hud: 'Bear day', ic: 'trending-down', w: 12, fate: { runner: 0.4, whale: 0.7, rug: 1.4, doa: 1.3 }, launch: 0.7, sol: [-8, -4], text: 'Red day: SOL is bleeding and nobody wants to buy. Most launches die.' },
    { id: 'runners', label: 'Runner season', hud: 'Runner season', ic: 'rocket', w: 9, fate: { runner: 3, whale: 1.5, doa: 0.8 }, launch: 1.15, sol: [0, 3], megas: 2, text: 'Runner season: several coins will run today, and one could go to the moon.' },
    { id: 'rugs', label: 'Rug season', hud: 'Rug season', ic: 'skull', w: 8, fate: { rug: 2.5, pnd: 1.3, runner: 0.6 }, launch: 1.1, sol: [-2, 0], text: 'Rug season: devs are pulling liquidity left and right. Check the dev wallet.' },
    { id: 'frenzy', label: 'Degen frenzy', hud: 'Frenzy', ic: 'flame', w: 8, fate: { pnd: 1.6, runner: 1.2 }, launch: 1.8, sol: [1, 4], text: 'Degen frenzy: launches every few seconds, everything pumps and dumps fast.' },
    { id: 'quiet', label: 'Quiet day', hud: 'Quiet day', ic: 'moon', w: 8, fate: { doa: 1.2, runner: 0.8 }, launch: 0.55, sol: [-1, 1], text: 'Quiet day: low volume. Good day to plan, bad day to ape.' },
    { id: 'whales', label: 'Whale day', hud: 'Whale day', ic: 'fish', w: 7, fate: { whale: 2.5, runner: 1.3 }, launch: 1, sol: [0, 2], text: 'Whale day: big wallets are hunting. Watch for 50+ SOL buys.' },
    { id: 'meta', label: 'Meta day', hud: 'Meta', ic: 'sparkles', w: 8, fate: { pnd: 1.2, runner: 1.3 }, launch: 1.2, sol: [0, 2], meta: true, text: '' },
  ];
  const EVENTS = ['kol_hour', 'flash_dip', 'viral', 'squeeze', 'forced_runner', 'dev_meta'];
  function mulberry(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function Days(game, saved) {
    this.game = game; this.day = 0; this.type = 'normal'; this.meta = null; this.events = []; this.megasLeft = 0; this.megaAt = []; this.rs = 98765; this.history = [];
    if (saved) Object.assign(this, saved, { game });
    this._r = mulberry(this.rs);
  }
  Days.TYPES = TYPES;
  const P = Days.prototype;
  P.save = function () { return { day: this.day, type: this.type, meta: this.meta, events: this.events, megaAt: this.megaAt, rs: Math.floor(this._r() * 2147483647), history: this.history.slice(-30) }; };
  P.info = function () { const t = TYPES.find((x) => x.id === this.type) || TYPES[0]; const n = this.meta && BH.Social && BH.Social.NARRATIVES.find((x) => x.id === this.meta); return Object.assign({}, t, t.meta && n ? { label: n.label + ' meta', hud: n.label + ' meta', text: n.label + ' meta: one narrative owns the timeline today. Its coins launch fast and run harder.' } : {}); };
  // the director asks this when it picks a coin's fate
  P.fateMul = function (fate) { const t = TYPES.find((x) => x.id === this.type); return (t && t.fate[fate]) || 1; };

  P.roll = function (day) {
    const r = this._r, gm = this.game, fin = gm.sys.finance, wd = (day - 1) % 7;
    // the weekly regime leans the dice: bull weeks get more bull days, bear weeks more bear days; weekends are quieter
    const w = TYPES.map((t) => {
      let x = t.w;
      if (fin && fin.regime === 'bull' && (t.id === 'bull' || t.id === 'runners' || t.id === 'frenzy')) x *= 1.8;
      if (fin && fin.regime === 'bear' && (t.id === 'bear' || t.id === 'rugs' || t.id === 'quiet')) x *= 1.8;
      if (wd >= 5 && t.id === 'quiet') x *= 2;
      if (day === 1 && t.id !== 'normal') x = 0;   // the first day is always normal: the tutorial runs on it
      return x;
    });
    let tot = w.reduce((a, b) => a + b, 0), x = r() * tot, pick = TYPES[0];
    for (let i = 0; i < TYPES.length; i++) { if ((x -= w[i]) < 0) { pick = TYPES[i]; break; } }
    this.day = day; this.type = pick.id; this.meta = null;
    if (pick.meta && BH.Social) { const ns = BH.Social.NARRATIVES; this.meta = ns[Math.floor(r() * ns.length)].id; }
    // surprise events at random hours (8:00-23:00), and mega runners on runner days
    const D = BH.C.GAME_HOUR_S * 24, start = (day - 1) * D, n = day === 1 ? 0 : 1 + Math.floor(r() * 3);
    this.events = [];
    for (let i = 0; i < n; i++) this.events.push({ at: start + (8 + r() * 15) * BH.C.GAME_HOUR_S, kind: EVENTS[Math.floor(r() * EVENTS.length)], done: false });
    this.megaAt = []; for (let i = 0; i < (pick.megas || 0); i++) this.megaAt.push(start + (9 + r() * 12) * BH.C.GAME_HOUR_S);
    this.history.push({ day, type: this.type, meta: this.meta });
    const info = this.info();
    // the SOL price reacts to the day's mood
    const mac = gm.sys.macro, pct = pick.sol[0] + r() * (pick.sol[1] - pick.sol[0]);
    if (mac && day > 1 && Math.abs(pct) >= 1) mac.shock(pct, null);
    if (pick.id === 'bear' && gm.sim) for (const tk of gm.sim.tokens) if (!tk.dead) tk.hype *= 0.75;
    if (gm.sys.world && day > 1) gm.sys.world.headline('Day ' + day + ': ' + info.text);
    if (day > 1) gm.emit('toast', { kind: pick.id === 'bear' || pick.id === 'rugs' ? 'bad' : 'info', text: info.label + ': ' + info.text });
  };

  P.fire = function (ev) {
    const gm = this.game, sim = gm.sim, s = gm.sys.social, w = gm.sys.world, r = this._r;
    if (ev.kind === 'kol_hour') { if (s) s.boost = Math.min(0.9, (s.boost || 0) + 0.6); if (w) w.headline('KOL hour: the big accounts are all posting calls at once. Volume is up.'); }
    if (ev.kind === 'flash_dip') { for (const tk of sim.tokens) if (!tk.dead) tk.hype *= 0.6; if (gm.sys.macro) gm.sys.macro.shock(-(3 + r() * 4), 'Flash dip: a big wallet market-sells SOL. Memes wobble.'); }
    if (ev.kind === 'viral' && w) w.event('viral');
    if (ev.kind === 'squeeze' && gm.sys.macro) gm.sys.macro.shock(4 + r() * 5, 'Short squeeze: SOL shorts get liquidated in a cascade.');
    if (ev.kind === 'forced_runner') { const d = gm.sys.director; if (d) d.forceOnce = r() < 0.5 ? 'runner' : 'whale'; if (w) w.headline('Rumor: a well-known team is about to launch something. Watch New Pairs.'); }
    if (ev.kind === 'dev_meta' && s) { const ns = BH.Social.NARRATIVES, n = ns[Math.floor(r() * ns.length)]; s.heat[n.id] = 100; if (w) w.headline('Out of nowhere, ' + n.label.toLowerCase() + ' coins are the new meta.'); }
  };

  P.onStep = function () {
    const gm = this.game, ck = gm.clock, sim = gm.sim; if (!ck || !sim) return;
    if (ck.day !== this.day) this.roll(ck.day);
    const t = TYPES.find((x) => x.id === this.type) || TYPES[0];
    sim.launchMul = Math.max(0.3, (sim.launchMul || 1) * t.launch);   // social sets it fresh every step; the day scales it
    if (this.meta && gm.sys.social) { const s = gm.sys.social; s.heat[this.meta] = Math.max(s.heat[this.meta] || 0, 85); }
    const nowS = gm.clock.total * BH.C.GAME_HOUR_S;
    for (const ev of this.events) if (!ev.done && nowS >= ev.at) { ev.done = true; this.fire(ev); }
    if (this.megaAt.length && nowS >= this.megaAt[0]) { this.megaAt.shift(); const d = gm.sys.director; if (d) d.forceOnce = 'mega'; }
  };

  // the hooks run after social (which resets launchMul each step) because this file loads later
  BH.Systems.push({ name: 'days', create(game, saved) { const d = new Days(game, saved); d.hooks = { step: () => d.onStep() }; return d; } });
  BH.Days = Days;
})(typeof window !== 'undefined' ? window : globalThis);
