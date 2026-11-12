/* Phase 6, Empire: supply chain (16), territories (19), property/gear upgrades (22, 48-52), routine (23),
   contracts (24), co-op devs (26), side businesses: merch, bar, course, signal bot, billboards, franchise,
   validator room (27, 59-64), and the living world: weather, seasons, neighbors, pawn shop, roommate,
   dating, viral clips, the Court of Vibes, lag, paper hands, mentor skills (53-58, 65-69). No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;

  // new gear in the Shop (effects are read here and by other systems)
  const GEAR = [
    { id: 'keyboard', name: 'Mechanical keyboard', price: 160, place: 'any', max: 1, effect: { focus: 4, keyboard: 1 }, desc: 'Macros and a satisfying clack. +4 focus, trades never land late from fumbling.' },
    { id: 'router', name: 'Mesh router + 5G backup', price: 220, place: 'any', max: 1, effect: { router: 1 }, desc: 'No more "internet dropped mid-trade" days.' },
    { id: 'candle', name: 'Lucky candle', price: 25, place: 'any', max: 1, effect: { ritual: 1, sanityDay: 1 }, desc: 'Does nothing. The game tracks whether it "worked" anyway.' },
    { id: 'socks', name: 'Lucky socks', price: 15, place: 'any', max: 1, effect: { ritual: 1 }, desc: 'Worn only on green days. Probably.' },
    { id: 'ac', name: 'Air conditioner', price: 700, place: 'apartment', max: 1, effect: { ac: 1, sanityDay: 1 }, desc: 'Keeps a validator room from overheating.' },
    { id: 'streamkit', name: 'Streaming setup', price: 1200, place: 'apartment', max: 1, effect: { streamkit: 1 }, desc: 'Ring light, mic, green screen. Spaces get 60% more viewers.' },
    { id: 'studio', name: 'Meme studio', price: 2000, place: 'apartment', max: 1, effect: { studio: 1 }, desc: 'A drawing tablet and a wall of references. Meme Lab recipes +8.' },
    { id: 'car', name: 'Used sports car', price: 9000, place: 'any', max: 1, effect: { car: 1, sanityDay: 1 }, desc: 'Flex on Chirp, faster deliveries (+30% gig pay), and you finally leave the house.' },
  ];
  if (BH.Build) for (const it of GEAR) if (!BH.Build.CATALOG.some((x) => x.id === it.id)) BH.Build.CATALOG.push(it);

  const SUPPLIERS = [
    { id: 'fiverrish', name: 'Gig-site artists', art: [35, 6], memes: [20, 4], bots: [60, 0.7] },
    { id: 'studio9', name: 'Studio 9 (pro)', art: [110, 14], memes: [60, 10], bots: null },
    { id: 'shady', name: 'A guy on Telegram', art: [15, -2], memes: [10, 1], bots: [25, 1.2] },
  ];
  const TERRITORIES = [
    { id: 'frogpond', name: 'The Frog Pond (chat server)', cost: 600, pay: 40, defense: 20 }, { id: 'catcafe', name: 'Cat Cafe Degens', cost: 900, pay: 60, defense: 25 },
    { id: 'aiden', name: 'AI Agent Den', cost: 1800, pay: 120, defense: 40 }, { id: 'trenchradio', name: 'Trench Radio', cost: 2500, pay: 150, defense: 45 },
    { id: 'moonclub', name: 'Moon Club', cost: 5000, pay: 320, defense: 60 }, { id: 'whalepod', name: 'The Whale Pod', cost: 12000, pay: 800, defense: 75 },
  ];
  const VENTURES = {
    merch: { name: 'Merch shop', cost: 800, desc: 'Hoodies of your best coin. Needs one of your coins to have hit $100K.', need: (s) => s.bestCoinAth() >= 100000 },
    bar: { name: 'Degen bar', cost: 15000, desc: 'Drinks, chart screens and overheard alpha. Daily income and a tip.', need: () => true },
    course: { name: 'Trading course', cost: 500, desc: 'Teach what you know. Honest content grows slowly; a hype course pays fast and blows up later.', need: (s) => s.followers() >= 1000 },
    signal: { name: 'Signal bot subscription', cost: 1500, desc: 'Sell your Scope-style alerts. Pays by your call hit rate.', need: (s) => s.followers() >= 1500 },
    billboard: { name: 'City billboards', cost: 3000, desc: 'Your face on the street. Followers every day. Rivals deface it sometimes.', need: () => true },
    franchise: { name: 'Launchpad franchise', cost: 40000, desc: 'A LaunchLab branch in another city. Needs your own launchpad.', need: (s) => s.game.sys.pad && s.game.sys.pad.owned },
    validator: { name: 'Validator room', cost: 8000, desc: 'Passive staking income. Runs hot: without AC it has outages.', need: () => true },
  };
  const CONTRACTS = [
    { kind: 'pump', text: 'Get one of your coins to a $50K market cap', reward: 900, days: 3, check: (s, c) => s.bestCoinAth(c.since) >= 50000 },
    { kind: 'cases', text: 'Investigate 3 coins with the Toolkit', reward: 300, days: 2, check: (s, c) => (s.game.sys.tools ? s.game.sys.tools.cases.filter((x) => x.day >= c.day).length : 0) >= 3 },
    { kind: 'mascot', text: 'Develop a Meme Lab recipe that scores 70+', reward: 400, days: 2, check: (s, c) => s.game.sys.biz && s.game.sys.biz.recipes.some((r) => r.score >= 70 && r.day >= c.day) },
    { kind: 'clean', text: 'Go 3 days without a rug (yours)', reward: 500, days: 3, check: (s, c) => s.game.clock.day >= c.day + 3 && (s.game.sys.factory ? s.game.sys.factory.rugs : 0) === c.rugs0 },
    { kind: 'followers', text: 'Gain 300 followers', reward: 450, days: 3, check: (s, c) => s.followers() >= c.f0 + 300 },
    { kind: 'profit', text: 'Close 3 winning trades', reward: 350, days: 2, check: (s, c) => s.game.player.closed.filter((x) => x.pnl > 0).length >= c.w0 + 3 },
  ];
  const WEATHER = [['sunny', 'Sunny', 2], ['cloudy', 'Cloudy', 0], ['rain', 'Rainy', -3], ['storm', 'Stormy', -5], ['snow', 'Snowing', 1]];
  const NEIGHBOR = ['4C says the guy in 5A "got rugged so hard he moved back to his mom\'s"', 'Somebody in the lobby is selling a "guaranteed 100x" ebook for $3', '2B\'s cat apparently has a bigger PnL than 2B', 'The super put up a sign: NO LAPTOPS IN THE LAUNDRY ROOM', 'Rumor: the building WiFi password is a seed phrase', '6D just bought a car with "trench money". It has already been towed.'];
  const SEASONS = [[30, 'Dead Coin Party', 'Halloween-style night: every dead coin you touched comes back as a costume. Sanity +5.'], [60, 'Winter bull run', 'The holiday pump. Bull regime for a week.'], [90, 'Summer slowdown', 'Everyone is at the beach. Chop for a week.']];

  function Empire(game, saved) {
    this.game = game;
    this.stock = { art: 0, memes: 0, artQ: 0 }; this.orders = [];
    this.terr = {}; this.ventures = {}; this.course = null; this.contracts = []; this.board = []; this.boardDay = 0;
    this.partners = []; this.coops = [];
    this.weather = 'sunny'; this.lastDay = 0; this.lag = false; this.rituals = { green: 0, red: 0 }; this.paper = 0; this.skills = {};
    this.dates = 0; this.clips = 0; this.trials = 0; this.pawned = 0; this.closedSeen = 0; this.burnout = 0;
    if (saved) Object.assign(this, saved, { game });
    else this.closedSeen = game.player.closed.length;
  }
  const P = Empire.prototype;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  const R = (s) => s.game.sim.r;
  const fx = (s) => (s.game.sys.build ? s.game.sys.build.effects() : {});
  const inject = (s, sc) => (s.game.sys.story ? s.game.sys.story.inject(sc) : false);
  P.followers = function () { return this.game.sys.trencher ? this.game.sys.trencher.followers : 0; };
  P.bestCoinAth = function (since) { const sim = this.game.sim; let best = 0; for (const id of this.game.player.myCoins) { const t = sim.byId.get(id); if (t && (!since || t.born >= since)) best = Math.max(best, t.athMc || 0); } return Math.max(best, since ? 0 : (this.bestAthEver || 0)); };

  // ---------------- 16. supply chain ----------------
  P.order = function (supplier, item, qty) {
    const s = SUPPLIERS.find((x) => x.id === supplier); if (!s || !s[item]) return { ok: false, reason: 'They don\'t sell that' };
    qty = Math.max(1, Math.min(10, Math.round(+qty || 1)));
    const [price, q] = s[item], cost = price * qty;
    if (!this.game.bills.pay(cost)) return { ok: false, reason: 'That costs $' + cost };
    const late = supplier === 'shady' && R(this)() < 0.25;
    this.orders.push({ item, qty, q, at: this.game.clock.total + (supplier === 'studio9' ? 6 : 2), lost: late, from: s.name });
    return { ok: true, text: qty + ' × ' + item + ' ordered from ' + s.name + ' ($' + cost + ').' };
  };
  P.receive = function () {
    const now = this.game.clock.total;
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const o = this.orders[i]; if (now < o.at) continue; this.orders.splice(i, 1);
      if (o.lost) { this.game.emit('toast', { kind: 'bad', text: 'The guy on Telegram never delivered. Classic.' }); continue; }
      if (o.item === 'art') { this.stock.artQ = (this.stock.artQ * this.stock.art + o.q * o.qty) / (this.stock.art + o.qty); this.stock.art += o.qty; }
      if (o.item === 'memes') this.stock.memes += o.qty;
      if (o.item === 'bots') { const t = this.game.sys.trencher; if (t) t.followers += o.qty * 120 * o.q; if (this.game.sys.biz) this.game.sys.biz.addHeat(o.qty * 2, 'Bought bot followers'); }
      this.game.emit('toast', { kind: 'info', text: o.qty + ' × ' + o.item + ' delivered from ' + o.from + '.' });
    }
  };

  // ---------------- 19. territories ----------------
  P.capture = function (id) {
    const t = TERRITORIES.find((x) => x.id === id); if (!t) return { ok: false };
    if (this.terr[id]) return { ok: false, reason: 'Already yours' };
    if (!this.game.bills.pay(t.cost)) return { ok: false, reason: 'Taking it over costs $' + t.cost.toLocaleString() };
    const raiders = this.game.sys.biz ? this.game.sys.biz.crew.filter((c) => c.role === 'raider').length : 0;
    const odds = Math.min(0.95, 0.35 + raiders * 0.15 + Math.log10(Math.max(10, this.followers())) * 0.06 - t.defense / 200);
    if (R(this)() > odds) return { ok: false, reason: 'The mods held. Your raid failed (odds were ' + Math.round(odds * 100) + '%). Hire raiders.' };
    this.terr[id] = { since: this.game.clock.day, earned: 0 };
    return { ok: true, text: t.name + ' is yours. It pays ~$' + t.pay + '/day in creator fees.' };
  };

  // ---------------- 22/27/59-64. ventures ----------------
  P.open = function (id, mode) {
    const v = VENTURES[id]; if (!v) return { ok: false };
    if (this.ventures[id]) return { ok: false, reason: 'Already running' };
    if (!v.need(this)) return { ok: false, reason: 'Not unlocked yet: ' + v.desc };
    if (!this.game.bills.pay(v.cost)) return { ok: false, reason: 'Opening costs $' + v.cost.toLocaleString() };
    this.ventures[id] = { since: this.game.clock.day, earned: 0, mode: mode || 'honest', level: 1 };
    if (id === 'course' && mode === 'hype') { const st = this.game.sys.story; if (st) st.path.villain += 2; }
    if (id === 'course' && mode !== 'hype') { const st = this.game.sys.story; if (st) st.path.builder += 1; }
    return { ok: true, text: v.name + ' is open.' };
  };
  P.close = function (id) { if (!this.ventures[id]) return { ok: false }; delete this.ventures[id]; return { ok: true, text: VENTURES[id].name + ' closed.' }; };
  P.ventureDaily = function () {
    const gm = this.game, rr = R(this), t = gm.sys.trencher, f = fx(this), st = gm.sys.story;
    let total = 0;
    const pay = (id, usd, why) => { usd = Math.round(usd); if (usd <= 0) return; this.ventures[id].earned += usd; total += usd; gm.bills.earn(usd, why || VENTURES[id].name); };
    for (const [id, v] of Object.entries(this.ventures)) {
      if (id === 'merch') pay(id, 40 + this.bestCoinAth() / 2500 * rr.range(0.5, 1.2));
      if (id === 'bar') { pay(id, rr.range(250, 700)); const live = gm.sim.tokens.filter((x) => !x.dead && (x.fate2 === 'runner' || x.fate2 === 'whale' || x.fate2 === 'mega')); if (live.length && rr() < 0.5) { const tk = live[rr.int(0, live.length - 1)]; gm.emit('toast', { kind: 'info', text: 'Overheard at your bar: "keep an eye on $' + tk.ticker + '".', id: tk.id }); } }
      if (id === 'course') {
        if (v.mode === 'hype') { pay(id, rr.range(300, 900)); if (rr() < 0.12) { delete this.ventures[id]; if (t) t.bump('trust', -15); if (gm.sys.biz) gm.sys.biz.addHeat(15, 'Course exposed as a scam'); gm.emit('toast', { kind: 'bad', text: 'Your hype course got exposed. Refund requests everywhere. Trust −15.' }); } }
        else { v.level = Math.min(10, v.level + 0.2); pay(id, 30 * v.level); if (t) t.bump('trust', 0.3); }
      }
      if (id === 'signal' && t) pay(id, (t.hitRate() * 600 + 50) * (0.4 + t.trust / 100));
      if (id === 'billboard') { if (t) t.bump('followers', 0.01); if (rr() < 0.15) { gm.emit('toast', { kind: 'bad', text: 'Someone drew a clown nose on your billboard. Followers −1%.' }); if (t) t.bump('followers', -0.01); } }
      if (id === 'franchise') pay(id, rr.range(600, 1800));
      if (id === 'validator') { if (!f.ac && rr() < 0.35) gm.emit('toast', { kind: 'bad', text: 'Validator room overheated and went offline today. Buy an AC.' }); else pay(id, rr.range(150, 260)); }
    }
    if (st && total > 2000) st.path.degen += 0;   // no story points for passive income
    // territories pay and get raided
    for (const [id, d] of Object.entries(this.terr)) {
      const tt = TERRITORIES.find((x) => x.id === id), got = Math.round(tt.pay * rr.range(0.7, 1.3)); d.earned += got; gm.bills.earn(got, tt.name);
      const mods = gm.sys.biz ? gm.sys.biz.crew.filter((c) => c.role === 'mod').length : 0;
      if (rr() < 0.08 - mods * 0.02) { delete this.terr[id]; gm.emit('toast', { kind: 'bad', text: 'The Rush Gang raided ' + tt.name + ' and took it. Mods would have helped.' }); }
    }
  };

  // ---------------- 24. contracts ----------------
  P.refreshBoard = function () {
    const rr = R(this), day = this.game.clock.day; this.boardDay = day;
    const pool = CONTRACTS.slice(); this.board = [];
    for (let i = 0; i < 3 && pool.length; i++) { const c = pool.splice(rr.int(0, pool.length - 1), 1)[0]; this.board.push({ id: 'ct' + rr.int(1, 1e9), kind: c.kind, text: c.text, reward: Math.round(c.reward * (0.8 + (this.game.sys.story ? this.game.sys.story.act : 1) * 0.3)), days: c.days }); }
  };
  P.accept = function (id) {
    const b = this.board.find((x) => x.id === id); if (!b) return { ok: false, reason: 'Gone' };
    if (this.contracts.length >= 3) return { ok: false, reason: 'You can hold 3 contracts at once' };
    const gm = this.game;
    this.board = this.board.filter((x) => x !== b);
    this.contracts.push(Object.assign({}, b, { day: gm.clock.day, deadline: gm.clock.day + b.days, since: gm.sim.t, rugs0: gm.sys.factory ? gm.sys.factory.rugs : 0, f0: this.followers(), w0: gm.player.closed.filter((x) => x.pnl > 0).length }));
    return { ok: true, text: 'Contract taken: ' + b.text + ' (by day ' + (gm.clock.day + b.days) + ').' };
  };
  P.checkContracts = function () {
    const gm = this.game;
    for (let i = this.contracts.length - 1; i >= 0; i--) {
      const c = this.contracts[i], def = CONTRACTS.find((x) => x.kind === c.kind);
      if (def.check(this, c)) { this.contracts.splice(i, 1); gm.bills.earn(c.reward, 'Contract'); gm.emit('toast', { kind: 'info', text: 'Contract done: ' + c.text + '. +$' + c.reward + '.' }); }
      else if (gm.clock.day > c.deadline) { this.contracts.splice(i, 1); gm.emit('toast', { kind: 'bad', text: 'Contract expired: ' + c.text + '.' }); }
    }
  };

  // ---------------- 26. co-op devs ----------------
  P.newPartner = function () {
    const rr = R(this), names = ['Juno', 'Rex', 'Mika', 'Tobi', 'Sage', 'Lux'];
    this.partners = [{ id: 'pt' + rr.int(1, 1e9), name: names[rr.int(0, names.length - 1)] + ' (dev)', honesty: rr.int(10, 95), share: rr.int(30, 50), trust: 50 }];
  };
  P.coLaunch = function (pid) {
    const gm = this.game, pt = this.partners.find((x) => x.id === pid); if (!pt) return { ok: false, reason: 'No partner' };
    if (!gm.sys.build || !gm.sys.build.effects().devdesk) return { ok: false, reason: 'You need the dev desk (Apartment)' };
    const name = pt.name.split(' ')[0] + ' & You', ticker = (pt.name.slice(0, 2) + 'YOU').toUpperCase();
    const res = gm.player.launchCoin({ name, ticker, desc: 'a collab launch', socials: { x: true, tg: true }, devBuy: 0.3 });
    if (!res.ok) return res;
    const tk = res.token; gm.sim.exec(tk, 'PARTNER-' + pt.id, 'insider', 'buy', 0.8); tk.hype *= 1.4;
    const rug = R(this)() * 100 > pt.honesty;
    this.coops.unshift({ coin: tk.id, ticker: tk.ticker, partner: pt.name, rugAt: rug ? gm.sim.t + R(this).range(40, 160) : 0, done: false });
    return { ok: true, text: 'Co-launched $' + tk.ticker + ' with ' + pt.name + '. Their followers are piling in.' };
  };
  P.coopStep = function () {
    const sim = this.game.sim;
    for (const c of this.coops) {
      if (c.done || !c.rugAt || sim.t < c.rugAt) continue; c.done = true;
      const tk = sim.byId.get(c.coin), addr = 'PARTNER-' + (this.partners[0] ? this.partners[0].id : ''), h = tk && Array.from(tk.holders.values()).find((x) => String(x.addr).startsWith('PARTNER-'));
      if (tk && h && h.tokens > 0) { sim.exec(tk, h.addr, 'insider', 'sell', h.tokens); tk.hype *= 0.2; this.game.emit('toast', { kind: 'bad', text: c.partner + ' dumped their whole bag on $' + c.ticker + '. They rugged you first.' }); }
      void addr;
    }
  };

  // ---------------- 68. pawn shop ----------------
  P.pawn = function (id) {
    const b = this.game.sys.build, it = BH.Build.CATALOG.find((x) => x.id === id);
    if (!b || !it || !b.count(id)) return { ok: false, reason: 'You don\'t own that' };
    b.owned[id]--; const got = Math.round(it.price * 0.45); this.game.bills.earn(got, 'Pawn shop'); this.pawned++;
    return { ok: true, text: 'Pawned your ' + it.name + ' for $' + got + '.' };
  };

  // ---------------- 23. routine ----------------
  P.window = function () { const h = this.game.clock.hour; return h >= 14 && h < 22 ? 'us' : h < 6 ? 'asia' : 'eu'; };
  P.onLaunchMine = function (tk) { if (this.window() === 'asia') tk.hype *= 1.15; const f = fx(this); if (f.studio && tk.recipe) tk.hype *= 1.05; };

  // ---------------- daily world ----------------
  P.daily = function () {
    const gm = this.game, rr = R(this), day = gm.clock.day, t = gm.sys.trencher, st = gm.sys.story, f = fx(this);
    // weather + rituals + lag
    const w = WEATHER[rr.int(0, WEATHER.length - 1)]; this.weather = w[0];
    gm.life.bump('sanity', w[2] + (f.sanityDay ? 0 : 0));
    this.lag = !f.router && rr() < 0.15;
    if (this.lag) gm.emit('toast', { kind: 'bad', text: 'Your internet is flaky today: orders land a block late. A router fixes this.' });
    // neighbors gossip
    if (gm.sys.social && rr() < 0.5) gm.sys.social.post({ name: 'Building 4 group', handle: 'bldg4', pfp: 5, followers: 60 }, 'chatter', NEIGHBOR[rr.int(0, NEIGHBOR.length - 1)], {});
    // seasons
    for (const [d, name, text] of SEASONS) if (day === d) { if (gm.sys.world) gm.sys.world.headline(name + ': ' + text); if (name.startsWith('Winter') && gm.sys.finance) gm.sys.finance.regime = 'bull'; if (name.startsWith('Summer') && gm.sys.finance) gm.sys.finance.regime = 'chop'; if (name.startsWith('Dead')) gm.life.bump('sanity', 5); }
    // roommate (act 1) eats your food
    if (st && st.act === 1 && gm.bills.meals > 0 && rr() < 0.35) { gm.bills.meals--; gm.emit('toast', { kind: 'info', text: 'Dex ate one of your meals. Again.' }); }
    // dating (sanity decent, act 2+)
    if (st && st.act >= 2 && gm.life.sanity > 40 && rr() < 0.12 && this.dates < 5) {
      this.dates++;
      inject(this, { id: 'date' + this.dates, who: 'date', lines: ['Dinner with Riley. They\'re funny. Your phone keeps buzzing with price alerts.', '"Do you need to get that?"'],
        choices: [['Put the phone face down', { sanity: 10, rel: {} }, 'You actually have a great time. Sanity +10.'], ['"Sorry, one sec, a coin is pumping"', { sanity: -4, do: 'empire.dateFail' }, 'Riley pays for their half and leaves. The coin dumped anyway.']] });
    }
    // contract board, partners
    if (this.boardDay !== day) this.refreshBoard();
    if (!this.partners.length || rr() < 0.3) this.newPartner();
    // mentor skills from Old Sol
    const rel = st ? st.rel.sol || 0 : 0;
    if (rel >= 2 && !this.skills.readDev) { this.skills.readDev = true; if (gm.sys.tools) gm.sys.tools.skill += 1; gm.emit('toast', { kind: 'info', text: 'Old Sol\'s lessons sink in: Detective skill +1 ("read the dev").' }); }
    if (rel >= 4 && !this.skills.patience) { this.skills.patience = true; gm.emit('toast', { kind: 'info', text: 'Skill unlocked: patience. Paper-hands panic builds slower.' }); }
    // burnout
    if (gm.life.energy < 10) { this.burnout++; if (this.burnout >= 2) { gm.life.bump('sanity', -10); gm.emit('toast', { kind: 'bad', text: 'Burnout. You stared at a chart for an hour without seeing it. Sanity −10.' }); } } else this.burnout = 0;
    this.ventureDaily();
  };
  P.dateFail = function () { return { ok: true, text: '' }; };

  // ---------------- per tick: paper hands, viral clips, court, rituals ----------------
  P.afterTime = function () {
    const gm = this.game, p = gm.player, st = gm.sys.story, rr = R(this), f = fx(this);
    this.receive(); this.checkContracts();
    if (this.lastDay !== gm.clock.day) { this.lastDay = gm.clock.day; this.daily(); }
    // lag days add a block of delay unless you have a keyboard and router
    if (this.lag && !f.router) p.extraDelay = Math.max(p.extraDelay || 0, 1);
    // closed trades: rituals, viral clips, paper hands
    const fresh = Math.max(0, Math.min(10, p.closed.length - this.closedSeen)); this.closedSeen = p.closed.length;
    for (let i = 0; i < fresh; i++) {
      const c = p.closed[i];
      if (f.ritual) { if (c.pnl >= 0) this.rituals.green++; else this.rituals.red++; }
      if (c.invested > 0.3 && (c.mult >= 8 || c.mult <= 0.1) && this.clips < 8) {
        this.clips++;
        const win = c.mult >= 8;
        inject(this, { id: 'clip' + this.clips, who: 'friends', lines: [win ? 'Someone clipped your reaction to the $' + c.ticker + ' ' + c.mult.toFixed(1) + 'x. It has 400k views.' : 'Someone clipped you watching $' + c.ticker + ' go to zero. It has 400k views.', 'Everyone wants a reaction.'],
          choices: [[win ? 'Flex it' : 'Laugh at yourself', { do: 'empire.clip|' + (win ? 1 : 0) + '|1' }, win ? 'The flex works. Followers pour in.' : 'Self-awareness is rare out here. People love it.'], ['Ignore it', { do: 'empire.clip|' + (win ? 1 : 0) + '|0' }, 'It fades in a day.']] });
      }
    }
    // paper hands: a big open loss pressures you (shown in Empire)
    let worst = 0; for (const pos of p.pos.values()) { if (pos.cost > 0) worst = Math.min(worst, p.markValue(pos) / pos.cost - 1); }
    this.paper = Math.max(0, Math.min(100, this.paper * 0.9 + (-worst * 100 - gm.life.sanity / 5) * (this.skills.patience ? 0.6 : 1) * 0.1));
    // the Court of Vibes
    const biz = gm.sys.biz;
    if (biz && biz.heat >= 95 && !this.inCourt) {
      this.inCourt = true; this.trials++;
      inject(this, { id: 'trial' + this.trials, who: 'judge', lines: ['You have been summoned to the Court of Vibes. Judge Moody wears sunglasses indoors.', '"You stand accused of aggravated aping, reckless shilling and at least one rug. How do you plead?"'],
        choices: [['Hire a lawyer ($2,000)', { do: 'empire.verdict|lawyer' }, 'Your lawyer calls the chart "a work of abstract art".'], ['"Guilty, your honor."', { path: { builder: 1 }, do: 'empire.verdict|guilty' }, 'Honesty earns you a lighter sentence.'], ['Argue it yourself', { do: 'empire.verdict|self' }, 'You present a 40-slide deck.']] });
    }
    if (biz && biz.heat < 60) this.inCourt = false;
    void rr;
  };
  P.clip = function (win, lean) {
    const t = this.game.sys.trencher; if (!t) return { ok: true };
    if (+lean) t.bump('followers', +win ? 0.12 : 0.06); else t.bump('followers', 0.02);
    return { ok: true, text: '' };
  };
  P.verdict = function (how) {
    const gm = this.game, biz = gm.sys.biz, rr = R(this);
    if (how === 'lawyer') { if (!gm.bills.pay(2000)) return this.verdict('self'); biz.addHeat(-50); return { ok: true, text: 'Case dismissed on a technicality. Heat −50.' }; }
    if (how === 'guilty') { const fine = Math.min(gm.bills.cash, 1500); gm.bills.pay(fine); biz.addHeat(-60); return { ok: true, text: 'Fined $' + fine + ' and 20 hours of community service (moderating a chat). Heat −60.' }; }
    if (rr() < 0.35) { biz.addHeat(-70); return { ok: true, text: 'Somehow, it works. Not guilty. Heat −70.' }; }
    const fine = Math.min(gm.bills.cash, 4000); gm.bills.pay(fine); biz.addHeat(-30); gm.life.bump('sanity', -10);
    return { ok: true, text: 'Slide 31 was a meme. Fined $' + fine + '. Heat −30.' };
  };

  Empire.SUPPLIERS = SUPPLIERS; Empire.TERRITORIES = TERRITORIES; Empire.VENTURES = VENTURES; Empire.WEATHER = WEATHER; Empire.GEAR = GEAR;
  BH.Empire = Empire;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'empire', create(game, saved) { const e = new Empire(game, saved); e.hooks = { launchMine: (tk) => e.onLaunchMine(tk), step: () => e.coopStep() }; return e; } });

  // Meme Lab recipes use art packs when you have them (quality adds to the score); the studio adds +8
  if (BH.Biz) {
    const orig = BH.Biz.prototype.scoreOf;
    BH.Biz.prototype.scoreOf = function (traits) {
      let s = orig.call(this, traits); const e = this.game.sys.empire, b = this.game.sys.build;
      if (e && e.stock.art > 0) s += Math.round(e.stock.artQ); else if (e) s -= 4;
      if (e && e.stock.memes > 0) s += 3;
      if (b && b.effects().studio) s += 8;
      return Math.max(5, Math.min(100, s));
    };
    const dev = BH.Biz.prototype.develop;
    BH.Biz.prototype.develop = function (traits) { const r = dev.call(this, traits); const e = this.game.sys.empire; if (r.ok && e) { if (e.stock.art > 0) e.stock.art--; if (e.stock.memes > 0) e.stock.memes--; } return r; };
  }
})(typeof window !== 'undefined' ? window : globalThis);
