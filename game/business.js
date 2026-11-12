/* The hustle: Meme Lab (coin recipes), a client network of early buyers, a crew you hire, and heat.
   Ideas 15, 17, 18 and 20. Recipes and clients feed your own launches (sim hook launchMine);
   crew work every game hour; heat rises with shady moves and brings sleuths, bans and fines. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;

  // ---- Meme Lab traits. Each slot has options; some unlock with research. ----
  const TRAITS = {
    art: [['pixel', 'Pixel art', 0], ['handdrawn', 'Hand-drawn', 0], ['3d', '3D render', 400], ['photo', 'Cursed photo', 0], ['aislop', 'AI slop', 0], ['anime', 'Anime', 900]],
    narrative: [['cats', 'Cats', 0], ['dogs', 'Dogs', 0], ['frogs', 'Swamp', 0], ['ai', 'AI agents', 600], ['food', 'Food', 0], ['space', 'Space', 300], ['absurd', 'Absurd', 0], ['weather', 'Weather', 200], ['sports', 'Sports', 200]],
    mascot: [['hat', 'Wears a hat', 0], ['sad', 'Sad eyes', 0], ['buff', 'Too buff', 300], ['baby', 'Baby version', 0], ['crown', 'Royal', 500]],
    lore: [['none', 'No lore', 0], ['oneline', 'One-liner', 0], ['saga', 'Full saga', 700], ['cult', 'Cult manifesto', 1200]],
    ticker: [['short', '3 letters', 0], ['word', 'One word', 0], ['meme', 'Meme spelling', 300], ['number', 'Has a number', 0]],
  };
  const SLOTS = Object.keys(TRAITS);
  // hidden synergies the player discovers by experimenting
  const SYNERGY = [
    [['art', 'pixel'], ['narrative', 'frogs'], 14], [['art', 'handdrawn'], ['narrative', 'cats'], 12], [['art', '3d'], ['narrative', 'space'], 16],
    [['art', 'aislop'], ['narrative', 'ai'], 18], [['art', 'photo'], ['narrative', 'absurd'], 15], [['art', 'anime'], ['narrative', 'dogs'], 14],
    [['mascot', 'hat'], ['narrative', 'dogs'], 10], [['mascot', 'sad'], ['narrative', 'frogs'], 12], [['mascot', 'buff'], ['narrative', 'sports'], 12],
    [['lore', 'cult'], ['narrative', 'ai'], 14], [['lore', 'saga'], ['art', 'anime'], 10], [['ticker', 'meme'], ['narrative', 'absurd'], 8],
    [['mascot', 'crown'], ['narrative', 'cats'], 9], [['ticker', 'number'], ['narrative', 'space'], 6],
  ];
  const CLASH = [[['art', 'photo'], ['lore', 'cult'], -10], [['mascot', 'baby'], ['lore', 'cult'], -8], [['art', 'aislop'], ['lore', 'saga'], -6]];

  // ---- crew roles ----
  const ROLES = {
    shiller: { name: 'Shiller', pay: 60, desc: 'Posts about your live coins every hour. More hype, a little heat.' },
    raider: { name: 'Raider', pay: 70, desc: 'Raids reply threads for you. Grows Trencher followers.' },
    artist: { name: 'Artist', pay: 80, desc: 'Makes your Meme Lab recipes better.' },
    mod: { name: 'Mod', pay: 50, desc: 'Keeps your chats calm. Heat cools faster, panic sells drop.' },
    botrunner: { name: 'Bot runner', pay: 90, desc: 'Runs volume bots on your coins. Big volume, lots of heat.' },
  };
  const FIRST = ['Milo', 'Zara', 'Jules', 'Rook', 'Tess', 'Omar', 'Pia', 'Vik', 'Lena', 'Bo', 'Nia', 'Cass', 'Remy', 'Ida', 'Sol', 'Kit'];
  const TAG = ['the Fast', 'from Discord', 'the Quiet', 'Night Shift', 'the Intern', 'OG', 'Two Phones', 'No Sleep'];
  const CLIENT_NAMES = ['Big Fish Bernie', 'Auntie Whale', 'Quiet Capital', 'Two-Wallet Tony', 'Degen Dentist', 'Lucky Lorraine', 'Mr. Bags', 'Night Owl Fund', 'Grandma Gwen', 'Crypto Carl', 'The Accountant', 'Shiba Steve', 'Vault 7', 'Lambo Lars', 'Ms. Floor', 'Swamp Sam'];

  function Biz(game, saved) {
    this.game = game;
    this.research = {};      // trait key -> true once unlocked
    this.recipes = [];       // {id, traits, score, used, coin}
    this.found = {};         // synergy index -> true once discovered
    this.clients = []; this.crew = []; this.applicants = [];
    this.heat = 0; this.heatLog = []; this.lieLow = 0; this.lastHour = 0; this.seq = 0; this.pendingBuys = [];
    if (saved) Object.assign(this, saved, { game });
    if (!saved) { this.addClient('Grandma Gwen', 0.4, 'cats', 70); this.addClient('Degen Dentist', 0.8, 'ai', 50); }
  }
  const P = Biz.prototype;
  Biz.TRAITS = TRAITS; Biz.ROLES = ROLES; Biz.SLOTS = SLOTS;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  const r = (self) => self.game.sim.r;
  const key = (slot, id) => slot + ':' + id;
  P.traitInfo = function (slot, id) { const t = TRAITS[slot].find((x) => x[0] === id); return t ? { id: t[0], name: t[1], cost: t[2], open: !t[2] || !!this.research[key(slot, id)] } : null; };

  // ---------------- Meme Lab ----------------
  P.unlock = function (slot, id) {
    const t = this.traitInfo(slot, id); if (!t) return { ok: false, reason: 'Unknown trait' };
    if (t.open) return { ok: false, reason: 'Already unlocked' };
    if (!this.game.bills.pay(t.cost)) return { ok: false, reason: 'Research costs $' + t.cost };
    this.research[key(slot, id)] = true;
    return { ok: true, text: 'Researched: ' + t.name };
  };
  P.scoreOf = function (traits) {
    let s = 30;
    const has = (pair) => traits[pair[0]] === pair[1];
    SYNERGY.forEach(([a, b, v]) => { if (has(a) && has(b)) s += v; });
    CLASH.forEach(([a, b, v]) => { if (has(a) && has(b)) s += v; });
    const soc = this.game.sys.social;
    if (soc && soc.heat && soc.heat[traits.narrative] != null) s += soc.heat[traits.narrative] * 0.25;   // ride the hot narrative
    s += this.crew.filter((c) => c.role === 'artist').reduce((a, c) => a + 4 + c.level * 2, 0);
    if (traits.lore === 'none') s -= 6;
    return Math.max(5, Math.min(100, Math.round(s)));
  };
  P.develop = function (traits) {
    for (const sl of SLOTS) { const t = this.traitInfo(sl, traits[sl]); if (!t) return { ok: false, reason: 'Pick a ' + sl }; if (!t.open) return { ok: false, reason: t.name + ' needs research' }; }
    if (!this.game.bills.pay(50)) return { ok: false, reason: 'A recipe costs $50 in art and memes' };
    const score = this.scoreOf(traits);
    const newly = [];
    SYNERGY.forEach(([a, b], i) => { if (traits[a[0]] === a[1] && traits[b[0]] === b[1] && !this.found[i]) { this.found[i] = true; newly.push(i); } });
    const rec = { id: 'rc' + (++this.seq), traits: Object.assign({}, traits), score, used: false, day: this.game.clock.day };
    this.recipes.unshift(rec); if (this.recipes.length > 20) this.recipes.length = 20;
    this.game.clock.advanceHours(1);
    return { ok: true, recipe: rec, text: 'Recipe scored ' + score + '/100' + (newly.length ? '. You found a combo that works!' : '.'), newly };
  };
  P.knownCombos = function () { return SYNERGY.map((s, i) => this.found[i] ? s : null).filter(Boolean).map(([a, b, v]) => this.traitInfo(a[0], a[1]).name + ' + ' + this.traitInfo(b[0], b[1]).name + ' (+' + v + ')'); };
  P.armed = function () { return this.recipes.find((x) => !x.used) || null; };

  // ---------------- clients ----------------
  P.addClient = function (name, size, taste, loyalty) {
    const rr = r(this);
    const c = { id: 'cl' + (++this.seq), name: name || this.freshName(rr), size: size || +(rr.range(0.2, 3) * (rr() < 0.15 ? 5 : 1)).toFixed(2), taste: taste || BH.Social.NARRATIVES[rr.int(0, BH.Social.NARRATIVES.length - 1)].id, loyalty: loyalty != null ? loyalty : rr.int(35, 65), wins: 0, losses: 0, addr: BH.Names.addr(rr) };
    this.clients.push(c);
    return c;
  };
  P.freshName = function (rr) {
    const used = new Set(this.clients.map((c) => c.name));
    const free = CLIENT_NAMES.filter((n) => !used.has(n));
    return free.length ? free[rr.int(0, free.length - 1)] : CLIENT_NAMES[rr.int(0, CLIENT_NAMES.length - 1)] + ' ' + (this.clients.length + 1);
  };
  P.scout = function () {
    if (this.clients.length >= 24) return { ok: false, reason: 'Your client list is full' };
    if (!this.game.bills.pay(120)) return { ok: false, reason: 'Networking costs $120 (drinks, coffee, a conference badge)' };
    this.game.clock.advanceHours(2);
    if (r(this)() < 0.35) return { ok: true, text: 'Two hours of small talk. Nobody bit.' };
    const c = this.addClient();
    return { ok: true, text: c.name + ' wants in early on your next launch (' + c.size + ' SOL, likes ' + BH.Social.prototype.label.call({}, c.taste) + ').' };
  };

  // ---------------- crew ----------------
  P.newApplicants = function () {
    const rr = r(this), roles = Object.keys(ROLES);
    this.applicants = [];
    for (let i = 0; i < 4; i++) {
      const role = roles[rr.int(0, roles.length - 1)];
      this.applicants.push({ id: 'ap' + (++this.seq), name: FIRST[rr.int(0, FIRST.length - 1)] + ' ' + TAG[rr.int(0, TAG.length - 1)], role, level: 1, xp: 0, loyalty: rr.int(30, 80), honesty: rr.int(20, 95), pay: Math.round(ROLES[role].pay * rr.range(0.8, 1.3)) });
    }
    return this.applicants;
  };
  P.hire = function (id) {
    const a = this.applicants.find((x) => x.id === id); if (!a) return { ok: false, reason: 'Applicant gone' };
    if (this.crew.length >= 8) return { ok: false, reason: 'Crew is full (8)' };
    if (this.game.bills.cash < a.pay) return { ok: false, reason: 'You need a day of pay ($' + a.pay + ') up front' };
    this.applicants = this.applicants.filter((x) => x !== a);
    a.hired = this.game.clock.day; this.crew.push(a);
    return { ok: true, text: a.name + ' joined as ' + ROLES[a.role].name + '.' };
  };
  P.fire = function (id) { this.crew = this.crew.filter((x) => x.id !== id); return { ok: true, text: 'Let go.' }; };
  P.bonus = function (id) { const c = this.crew.find((x) => x.id === id); if (!c) return { ok: false }; if (!this.game.bills.pay(100)) return { ok: false, reason: 'A bonus is $100' }; c.loyalty = Math.min(100, c.loyalty + 15); return { ok: true, text: c.name + ' appreciates it. Loyalty +15.' }; };

  // ---------------- heat ----------------
  P.addHeat = function (d, why) {
    const mods = this.crew.filter((c) => c.role === 'mod').length;
    if (d > 0) d *= Math.max(0.55, 1 - mods * 0.12);
    const before = this.heat;
    this.heat = Math.max(0, Math.min(100, this.heat + d));
    if (d >= 1 && why) { this.heatLog.unshift({ day: this.game.clock.day, d: Math.round(d), why }); if (this.heatLog.length > 30) this.heatLog.length = 30; }
    for (const [lvl, text] of [[40, 'Sleuths are watching your wallets (heat 40+).'], [60, 'The platforms are flagging your launches (heat 60+).'], [80, 'The Department of Vibes has opened a file on you (heat 80+).']]) if (before < lvl && this.heat >= lvl) this.game.emit('toast', { kind: 'bad', text });
  };
  P.goQuiet = function () { this.lieLow = this.game.clock.total + 48; return { ok: true, text: 'Lying low for 2 days: no launches, no shills. Heat cools 3x faster.' }; };
  P.isLow = function () { return this.game.clock.total < this.lieLow; };
  P.level = function () { return this.heat >= 80 ? 'Wanted' : this.heat >= 60 ? 'Flagged' : this.heat >= 40 ? 'Watched' : this.heat >= 20 ? 'Noticed' : 'Clean'; };

  // ---------------- hooks into the market ----------------
  P.onLaunchMine = function (tk) {
    const rec = this.armed();
    if (rec) {
      rec.used = true; rec.coin = tk.id; rec.ticker = tk.ticker;
      tk.hype *= 0.6 + rec.score / 70;
      tk.half *= 0.8 + rec.score / 200;
      tk.narrative = rec.traits.narrative; tk.recipe = rec.id;
    }
    if (this.heat >= 60 && r(this)() < (this.heat - 50) / 100) { tk.hype *= 0.4; this.game.emit('toast', { kind: 'bad', text: 'A platform shadow-limited $' + tk.ticker + ' (your heat is ' + Math.round(this.heat) + ').' }); }
    // clients who like this narrative buy in the first seconds
    for (const c of this.clients) {
      const like = c.taste === tk.narrative ? 0.9 : 0.25;
      if (r(this)() < like * (c.loyalty / 100)) this.pendingBuys.push({ coin: tk.id, client: c.id, at: this.game.sim.t + r(this).range(1, 6) });
    }
  };
  P.onStep = function () {
    const sim = this.game.sim;
    for (let i = this.pendingBuys.length - 1; i >= 0; i--) {
      const b = this.pendingBuys[i]; if (sim.t < b.at) continue;
      this.pendingBuys.splice(i, 1);
      const tk = sim.byId.get(b.coin), c = this.clients.find((x) => x.id === b.client);
      if (!tk || tk.dead || !c) continue;
      const f = sim.exec(tk, c.addr, 'whale', 'buy', c.size);
      if (f) { tk.clientBuys = (tk.clientBuys || 0) + 1; (tk.clientIds = tk.clientIds || []).push(c.id); tk.clientMc = tk.clientMc || {}; tk.clientMc[c.id] = f.mc; }
    }
  };
  // after a while, clients judge how your coin treated them
  P.judge = function () {
    const sim = this.game.sim;
    for (const id of this.game.player.myCoins) {
      const tk = sim.byId.get(id); if (!tk || !tk.clientIds || tk.judged) continue;
      if (sim.t - tk.born < 300 && !tk.dead && !tk.rugged) continue;
      tk.judged = true;
      for (const cid of tk.clientIds) {
        const c = this.clients.find((x) => x.id === cid); if (!c) continue;
        const good = tk.athMc >= (tk.clientMc[cid] || 1) * 2.5 && !tk.rugged;
        if (good) {
          c.wins++; c.loyalty = Math.min(100, c.loyalty + 10);
          if (r(this)() < 0.35 && this.clients.length < 24) { const n = this.addClient(); this.game.emit('toast', { kind: 'info', text: c.name + ' referred a friend: ' + n.name + '.' }); }
        } else { c.losses++; c.loyalty = Math.max(0, c.loyalty - (tk.rugged ? 30 : 12)); }
      }
      const before = this.clients.length;
      this.clients = this.clients.filter((c) => c.loyalty > 5);
      if (this.clients.length < before) this.game.emit('toast', { kind: 'bad', text: (before - this.clients.length) + ' client' + (before - this.clients.length > 1 ? 's' : '') + ' stopped answering your DMs.' });
    }
  };

  // every game hour: crew work, get paid daily, maybe skim or snitch; heat cools; heat consequences
  P.afterTime = function () {
    const gm = this.game, hour = Math.floor(gm.clock.total), rr = r(this);
    this.judge();
    if (hour <= this.lastHour) return;
    const hours = Math.min(48, hour - this.lastHour); this.lastHour = hour;
    const mine = gm.player.myCoins.map((id) => gm.sim.byId.get(id)).filter((t) => t && !t.dead);
    for (let h = 0; h < hours; h++) {
      for (const c of this.crew) {
        c.xp += 1; if (c.xp >= 24 * c.level) { c.xp = 0; c.level = Math.min(5, c.level + 1); }
        if (this.isLow() && (c.role === 'shiller' || c.role === 'botrunner')) continue;
        if (c.role === 'shiller' && mine.length) { const tk = mine[rr.int(0, mine.length - 1)]; tk.hype += 0.08 + c.level * 0.04; this.addHeat(0.5, 'Shilling'); }
        if (c.role === 'raider' && gm.sys.trencher) gm.sys.trencher.bump('followers', 0.004 + c.level * 0.002);
        if (c.role === 'botrunner' && mine.length) { const tk = mine[rr.int(0, mine.length - 1)]; if (!tk.bot) tk.bot = { addr: BH.Names.addr(rr), until: gm.sim.t + 120, size: 0.3 + c.level * 0.2 }; else tk.bot.until = gm.sim.t + 120; this.addHeat(0.9, 'Bot volume'); }
      }
      this.heat = Math.max(0, this.heat - (this.isLow() ? 0.9 : 0.3) * (1 + this.crew.filter((c) => c.role === 'mod').length * 0.25));
    }
    // daily: pay, loyalty drift, skims and snitches, heat events
    if (this.payDay !== gm.clock.day) {
      this.payDay = gm.clock.day;
      for (const c of this.crew.slice()) {
        if (!gm.bills.pay(c.pay)) { c.loyalty -= 25; gm.emit('toast', { kind: 'bad', text: 'You could not pay ' + c.name + '. Loyalty −25.' }); }
        else c.loyalty = Math.min(100, c.loyalty + 2);
        if (c.loyalty < 15) { this.crew = this.crew.filter((x) => x !== c); gm.emit('toast', { kind: 'bad', text: c.name + ' quit.' }); continue; }
        if (c.honesty < 40 && rr() < 0.18) { const amt = Math.min(gm.bills.cash, rr.int(40, 200)); gm.bills.pay(amt); gm.emit('toast', { kind: 'bad', text: 'Your books are $' + amt + ' short. ' + c.name + ' "doesn\'t know what happened".' }); }
        if (c.loyalty < 35 && this.heat > 30 && rr() < 0.15) { this.addHeat(15, c.name + ' talked to a sleuth'); gm.emit('toast', { kind: 'bad', text: c.name + ' talked to a sleuth. Heat +15.' }); }
      }
      if (this.heat >= 40 && rr() < 0.4 && gm.sys.social) { gm.sys.social.post({ name: 'rug radar', handle: 'rugradar', pfp: 7, followers: 56000 }, 'callout', 'Thread: following the wallets behind a "new" dev. Same funding source as 3 dead coins. Stay safe.', { aboutYou: true }); if (gm.sys.trencher) gm.sys.trencher.bump('trust', -4); }
      if (this.heat >= 80 && rr() < 0.5) { const fine = Math.min(gm.bills.cash, 500 + Math.round(this.heat * 20)); gm.bills.pay(fine); this.addHeat(-20); gm.emit('toast', { kind: 'bad', text: 'The Department of Vibes fined you $' + fine + ' for "aggravated aping". Heat −20.' }); if (gm.sys.world) gm.sys.world.headline('Local degen fined $' + fine + ' by the Department of Vibes'); }
      if (rr() < 0.5) this.newApplicants();
    }
  };

  BH.Biz = Biz;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'biz', create(game, saved) { const b = new Biz(game, saved); b.hooks = { launchMine: (tk) => b.onLaunchMine(tk), step: () => b.onStep() }; return b; } });

  // shady moves elsewhere add heat
  if (BH.Factory && BH.Factory.prototype.rug) {
    const origRug = BH.Factory.prototype.rug;
    BH.Factory.prototype.rug = function (coinId) { const res = origRug.call(this, coinId); if (res.ok && this.game.sys.biz) { this.game.sys.biz.addHeat(30, 'Pulled a rug'); const st = this.game.sys.story; if (st) st.path.villain += 2; } return res; };
  }
})(typeof window !== 'undefined' ? window : globalThis);
