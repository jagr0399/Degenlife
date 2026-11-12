/* Phase 7, Life: daily challenges + seasons (11), collectibles (28), group chat (30), insomnia (31), nightmares (32),
   pets (33), conference trips (37), the influencer house (38), ghost-writing (39), coin cemetery (40), trading journal
   with a tilt warning (41), hackathons (43), family pressure + a "real job" ending (45), flex cards (46), sandbox (47),
   challenge runs (71), a mod folder (72) and the stats museum (73). Prestige (70) is the existing retire system. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;
  const CHALLENGES = [
    { id: 'x5', text: 'Close a trade at 5x or better', reward: 300, check: (s, d) => s.game.player.closed.slice(0, s.game.player.closed.length - d.closed0).some((c) => c.mult >= 5) },
    { id: 'norug', text: 'Make 5 trades without getting rugged', reward: 200, check: (s, d) => s.game.player.st.trades >= d.trades0 + 5 && s.game.player.st.rugs === d.rugs0 },
    { id: 'call2x', text: 'Make a call that hits (Trencher)', reward: 250, check: (s, d) => s.game.sys.trencher && s.game.sys.trencher.hits > d.hits0 },
    { id: 'cash', text: 'Earn $500 cash today', reward: 150, check: (s, d) => s.game.bills.cash >= d.cash0 + 500 },
    { id: 'detect', text: 'Investigate 2 coins', reward: 150, check: (s, d) => s.game.sys.tools && s.game.sys.tools.cases.filter((c) => c.day === d.day).length >= 2 },
    { id: 'green', text: 'End the day with more SOL than you started', reward: 120, check: (s, d) => s.game.player.netWorth() > d.net0 * 1.05 },
    { id: 'grass', text: 'Touch grass (visit the park)', reward: 80, check: (s, d) => s.game.sys.world && s.game.sys.world.parkDay === d.day },
  ];
  const TIERS = [[100, 'Desk cactus'], [300, 'Neon "GM" sign'], [600, 'Gold keyboard'], [1000, 'Diamond hands statue'], [1600, 'Season trophy']];
  const FRIENDS = ['Dex', 'Jess', 'Marco', 'Priya'];
  const RARITY = [['Common', 0.6, 20], ['Rare', 0.28, 90], ['Epic', 0.1, 400], ['Legendary', 0.02, 3000]];
  const PETS = { goldfish: { name: 'Goldfish oracle', cost: 30, desc: 'Where it swims in the bowl picks a coin each morning.' }, parrot: { name: 'Parrot', cost: 300, desc: 'Repeats whatever the timeline says. Sanity +1 a day.' } };

  function Life2(game, saved) {
    this.game = game;
    this.daily = null; this.done = {}; this.season = { n: 1, start: 1, xp: 0, rewards: [] };
    this.cards = []; this.chat = []; this.dreams = []; this.pets = {}; this.oracle = []; this.notes = {};
    this.house = false; this.trips = 0; this.threads = 0; this.hacks = []; this.lastDay = 0; this.closedSeen = 0; this.mom = 0; this.sandbox = false;
    this.records = { bestMult: 0, bestPnl: 0, worstPnl: 0, topAth: 0, maxFollowers: 0, longest: 0 };
    if (saved) Object.assign(this, saved, { game });
    else this.closedSeen = game.player.closed.length;
  }
  const P = Life2.prototype;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; o.chat = this.chat.slice(0, 40); return o; };
  const R = (s) => s.game.sim.r;
  const inject = (s, sc) => (s.game.sys.story ? s.game.sys.story.inject(sc) : false);
  const say = (s, who, text) => { s.chat.unshift({ day: s.game.clock.day, hour: Math.floor(s.game.clock.hour), who, text }); if (s.chat.length > 60) s.chat.length = 60; };

  // ---------------- 11. daily challenges + seasons ----------------
  P.newDaily = function () {
    const gm = this.game, rr = R(this), pool = CHALLENGES.slice(), pick = [];
    for (let i = 0; i < 3; i++) pick.push(pool.splice(rr.int(0, pool.length - 1), 1)[0].id);
    this.daily = { day: gm.clock.day, ids: pick, done: [], closed0: gm.player.closed.length, trades0: gm.player.st.trades, rugs0: gm.player.st.rugs, hits0: gm.sys.trencher ? gm.sys.trencher.hits : 0, cash0: gm.bills.cash, net0: gm.player.netWorth() };
    if (gm.clock.day - this.season.start >= 14) { this.season = { n: this.season.n + 1, start: gm.clock.day, xp: 0, rewards: [] }; gm.emit('toast', { kind: 'info', text: 'Season ' + this.season.n + ' started.' }); }
  };
  P.checkDaily = function () {
    const d = this.daily; if (!d) return;
    for (const id of d.ids) {
      if (d.done.includes(id)) continue;
      const c = CHALLENGES.find((x) => x.id === id);
      if (c.check(this, d)) { d.done.push(id); this.game.bills.earn(c.reward, 'Challenge'); this.season.xp += c.reward / 2; this.game.emit('toast', { kind: 'info', text: 'Challenge done: ' + c.text + ' (+$' + c.reward + ')' }); }
    }
    for (const [xp, item] of TIERS) if (this.season.xp >= xp && !this.season.rewards.includes(item)) { this.season.rewards.push(item); this.game.emit('toast', { kind: 'info', text: 'Season reward: ' + item + '. It is on your trophy shelf.' }); }
  };

  // ---------------- 28. collectibles ----------------
  P.dropCheck = function () {
    const gm = this.game, rr = R(this);
    for (const id of gm.player.myCoins) {
      const tk = gm.sim.byId.get(id); if (!tk || tk.dead || tk._dropped) continue;
      if (gm.sim.risk(tk).holders >= 40 && rr() < 0.5) {
        tk._dropped = true;
        let x = rr(), k = 0; while (k < RARITY.length - 1 && x > RARITY[k][1]) { x -= RARITY[k][1]; k++; }
        const r = RARITY[k];
        this.cards.unshift({ id: 'cd' + rr.int(1, 1e9), name: tk.ticker + ' holder #' + rr.int(1, 999), rarity: r[0], value: Math.round(r[2] * rr.range(0.7, 1.5)), coin: tk.ticker, pfp: rr.int(0, 143) });
        gm.emit('toast', { kind: 'info', text: 'A ' + r[0] + ' collectible dropped from $' + tk.ticker + '\'s holders.' });
      }
    }
  };
  P.sellCard = function (id) { const c = this.cards.find((x) => x.id === id); if (!c) return { ok: false }; this.cards = this.cards.filter((x) => x !== c); const p = Math.round(c.value * R(this).range(0.7, 1.4)); this.game.bills.earn(p, 'Collectible'); return { ok: true, text: 'Sold ' + c.name + ' for $' + p + '.' }; };

  // ---------------- 33. pets ----------------
  P.adopt = function (id) { const pt = PETS[id]; if (!pt) return { ok: false }; if (this.pets[id]) return { ok: false, reason: 'You already have one' }; if (!this.game.bills.pay(pt.cost)) return { ok: false, reason: 'Costs $' + pt.cost }; this.pets[id] = { since: this.game.clock.day }; return { ok: true, text: 'Welcome home, ' + pt.name.toLowerCase() + '.' }; };
  P.oracleDaily = function () {
    if (!this.pets.goldfish) return;
    const gm = this.game, live = gm.sim.tokens.filter((t) => !t.dead && t.stage === 'curve'); if (!live.length) return;
    const tk = live[R(this).int(0, live.length - 1)];
    this.oracle.unshift({ day: gm.clock.day, coin: tk.id, ticker: tk.ticker, mc: gm.sim.mc(tk), result: null }); if (this.oracle.length > 10) this.oracle.length = 10;
    say(this, 'Goldfish', 'swam to the left side of the bowl. that means $' + tk.ticker + '. probably.');
  };
  P.oracleJudge = function () { const sim = this.game.sim; for (const o of this.oracle) { if (o.result) continue; const tk = sim.byId.get(o.coin); if (!tk) { o.result = 'died'; continue; } if (tk.athMc >= o.mc * 2) o.result = '2x!'; else if (tk.dead) o.result = 'died'; } };

  // ---------------- 37. conference, 38. influencer house, 39. ghost-writing, 43. hackathon ----------------
  P.conference = function () {
    const gm = this.game; if (!gm.bills.pay(1500)) return { ok: false, reason: 'Tickets + flight cost $1,500' };
    gm.clock.advanceHours(24); this.trips++;
    const b = gm.sys.biz; if (b) { b.addClient(); b.addClient(); }
    const t = gm.sys.trencher; if (t) t.bump('followers', 0.06);
    gm.life.bump('sanity', 6); gm.life.bump('energy', -30);
    say(this, 'Marco', 'saw your selfie with the stage lights lol. bring back merch');
    return { ok: true, text: 'Three panels, two parties, one free hoodie. +2 clients, +6% followers. You are exhausted.' };
  };
  P.moveIn = function () {
    const t = this.game.sys.trencher; if (this.house) return { ok: false, reason: 'You already live there' };
    if (!t || t.followers < 5000) return { ok: false, reason: 'The house only takes accounts with 5,000+ followers' };
    this.house = true; return { ok: true, text: 'You moved into the influencer house. Shared rent, shared alpha, shared drama.' };
  };
  P.moveOut = function () { this.house = false; return { ok: true, text: 'You moved out. It is very quiet.' }; };
  P.houseDaily = function () {
    if (!this.house) return;
    const gm = this.game, t = gm.sys.trencher, rr = R(this);
    if (t) t.bump('followers', 0.02);
    gm.bills.pay(Math.min(gm.bills.cash, 120));
    const r = rr();
    if (r < 0.2) { if (t) t.bump('trust', -3); say(this, 'Jess', 'someone in the house posted your call 30 seconds before you did. again.'); }
    else if (r < 0.35) { gm.life.bump('sanity', -5); say(this, 'Priya', 'the house kitchen is a war zone. who left 14 energy drink cans in the sink'); }
    else if (r < 0.5) { const live = gm.sim.tokens.filter((x) => !x.dead && x.fate2 === 'runner'); if (live.length) say(this, 'House', 'housemate tip: $' + live[0].ticker + ' (they bought it already)'); }
  };
  P.ghostwrite = function (q) {
    const gm = this.game, good = q === 'good', h = good ? 5 : 2;
    gm.clock.advanceHours(h); this.threads++;
    const pay = good ? 250 : 80; gm.bills.earn(pay, 'Ghost-writing');
    if (good && R(this)() < 0.5) { const live = gm.sim.tokens.filter((x) => !x.dead); if (live.length) { const tk = live[R(this).int(0, live.length - 1)]; tk.hype += 0.8; return { ok: true, text: 'Your thread for a big KOL went viral and moved $' + tk.ticker + '. +$' + pay + '.' }; } }
    return { ok: true, text: 'Wrote a ' + (good ? 'well-researched' : 'quick') + ' thread for a KOL. +$' + pay + '.' };
  };
  P.hackathon = function () {
    const gm = this.game, wk = Math.floor(gm.clock.day / 7);
    if (this.hacks.some((x) => x.week === wk)) return { ok: false, reason: 'One hackathon a week' };
    gm.clock.advanceHours(6); gm.life.bump('energy', -25);
    const b = gm.sys.biz, skill = (b ? b.recipes.length : 0) * 2 + (gm.sys.story ? gm.sys.story.act : 1) * 8;
    const score = Math.round(R(this).range(10, 60) + skill), place = score > 85 ? 1 : score > 70 ? 2 : score > 55 ? 3 : 0;
    const prize = [0, 5000, 2000, 800][place];
    if (prize) gm.bills.earn(prize, 'Hackathon');
    this.hacks.unshift({ week: wk, score, place });
    if (place && gm.sys.story) gm.sys.story.path.builder += 1;
    return { ok: true, text: place ? 'Your "utility" coin won ' + ['', '1st', '2nd', '3rd'][place] + ' place: $' + prize.toLocaleString() + ' grant.' : 'You shipped something. The judges did not get it. Score ' + score + '.' };
  };

  // ---------------- 45. family pressure ----------------
  P.momDaily = function () {
    const gm = this.game, day = gm.clock.day, st = gm.sys.story; if (!st) return;
    const beats = [10, 20, 32];
    const i = beats.indexOf(day); if (i < 0 || this.mom > i) return;
    this.mom = i + 1;
    const lines = [['Mom found a job posting for you: "Junior analyst at a bank. Dental plan!"', '"Just apply. For me. You can still do the computer thing at night."'],
      ['Mom again, with your aunt on speaker. "Your cousin just bought a house."', '"Honey, I worry. Is this forever?"'],
      ['Mom sends a photo of your old room. She kept it the same.', '"The bank job is still open. They asked about you. Last chance, sweetheart."']][i];
    inject(this, { id: 'mom_pressure' + i, who: 'mom', lines, choices: [['"I\'m staying in the trenches."', { rel: { mom: -1 }, path: { degen: 1 } }, '"Okay. I love you. Eat something."'], ['"I\'ll think about it."', { rel: { mom: 1 } }, '"That\'s all I ask."'], ['Take the job (ends the game)', { do: 'life.realJob' }, 'You put on a tie for the first time in years.']] });
  };
  P.realJob = function () { const st = this.game.sys.story; if (st) st.flags.realJob = true; this.game.emit('ending', 'realjob'); return { ok: true, text: 'Ending unlocked: The Real Job. Retire from the pause menu, or keep playing on weekends.' }; };

  // ---------------- 47. sandbox, 71. challenge runs ----------------
  P.enableSandbox = function () {
    const gm = this.game; if (this.sandbox) return { ok: false, reason: 'Already sandbox' };
    this.sandbox = true; gm.meta.sandbox = true;
    gm.bills.cash += 10000000; gm.player.sol += 1000;
    const b = gm.sys.build; if (b) for (const p of ['apartment', 'office', 'tower']) if (!b.places.includes(p)) b.places.push(p);
    if (b && b.syncRent) b.syncRent();
    return { ok: true, text: 'Sandbox on: $10M cash, +1,000 SOL, every floor unlocked. This save no longer counts for endings or the leaderboard.' };
  };
  P.setChallenge = function (kind) { this.game.meta.nextChallenge = kind === 'none' ? null : kind; return { ok: true, text: kind === 'none' ? 'No challenge for your next life.' : 'Your next life (after you retire) starts with: ' + kind + '.' }; };

  // ---------------- 41. journal + tilt ----------------
  P.tilt = function () { let n = 0; for (const c of this.game.player.closed) { if (c.pnl < 0) n++; else break; } return n; };
  P.note = function (closedIdx, text) { const c = this.game.player.closed[+closedIdx]; if (!c) return { ok: false }; this.notes[c.id + ':' + c.at] = String(text || '').slice(0, 140); return { ok: true, text: 'Noted.' }; };

  // ---------------- per tick ----------------
  P.afterTime = function () {
    const gm = this.game, day = gm.clock.day, p = gm.player, rr = R(this);
    if (!this.daily || this.daily.day !== day) {
      if (this.lastDay && this.lastDay !== day) this.dayEnd();
      this.newDaily();
    }
    this.lastDay = day;
    this.checkDaily(); this.dropCheck(); this.oracleJudge();
    // records + group chat reactions to closed trades
    const fresh = Math.max(0, Math.min(10, p.closed.length - this.closedSeen)); this.closedSeen = p.closed.length;
    for (let i = 0; i < fresh; i++) {
      const c = p.closed[i], r = this.records;
      r.bestMult = Math.max(r.bestMult, c.mult || 0); r.bestPnl = Math.max(r.bestPnl, c.pnl); r.worstPnl = Math.min(r.worstPnl, c.pnl); r.longest = Math.max(r.longest, c.held || 0);
      if (c.mult >= 3) say(this, FRIENDS[rr.int(0, 3)], 'YOU HIT ' + c.mult.toFixed(1) + 'x ON $' + c.ticker + '?? dinner on you');
      else if (c.rugged) say(this, FRIENDS[rr.int(0, 3)], 'saw $' + c.ticker + ' rugged. you good? 🫂');
      else if (c.pnl < -1) say(this, FRIENDS[rr.int(0, 3)], 'bro stop revenge trading');
    }
    const t = gm.sys.trencher; if (t) this.records.maxFollowers = Math.max(this.records.maxFollowers, Math.round(t.followers));
    for (const id of p.myCoins) { const tk = gm.sim.byId.get(id); if (tk) this.records.topAth = Math.max(this.records.topAth, tk.athMc || 0); }
    // 31. insomnia: trading at 1-5 am on an empty tank
    const h = gm.clock.hour;
    if (gm.seated && h >= 1 && h < 5 && gm.life.energy < 25) { p.extraDelay = Math.max(p.extraDelay || 0, 1); if (!this.insomniaDay || this.insomniaDay !== day) { this.insomniaDay = day; gm.life.bump('sanity', -4); gm.emit('toast', { kind: 'bad', text: 'Insomnia: your hands shake and the screen swims. Orders land late until you sleep.' }); } }
  };
  // end of a day: nightmares after a bad one, pets, the house, Mom, a parrot
  P.dayEnd = function () {
    const gm = this.game, d = this.daily, rr = R(this);
    if (d && gm.player.netWorth() < d.net0 * 0.75) {
      const dreams = ['You dreamt the candles were stairs and you kept falling down them. Every step was red.', 'You dreamt your mom was a whale and dumped her whole bag on you at dinner.', 'You dreamt the chart flatlined and a doctor said "time of death: 3:42 am, cause: bundled".', 'You dreamt you were trapped in a bonding curve at 99.9%. It never graduated.'];
      const txt = dreams[rr.int(0, dreams.length - 1)]; this.dreams.unshift({ day: gm.clock.day, text: txt }); if (this.dreams.length > 10) this.dreams.length = 10;
      gm.life.bump('sanity', -5); gm.emit('toast', { kind: 'bad', text: 'Nightmare: ' + txt });
    }
    this.oracleDaily(); this.houseDaily(); this.momDaily();
    const m = BH.Mod;
    if (m && m.chirps && m.chirps.length && gm.sys.social && rr() < 0.6) gm.sys.social.post({ name: 'modded account', handle: 'mod', pfp: 3, followers: 1000 }, 'chatter', String(m.chirps[rr.int(0, m.chirps.length - 1)]).slice(0, 200), {});
    if (m && m.headlines && m.headlines.length && gm.sys.world && rr() < 0.4) gm.sys.world.headline(String(m.headlines[rr.int(0, m.headlines.length - 1)]).slice(0, 160));
    if (this.pets.parrot) { gm.life.bump('sanity', 1); say(this, 'Parrot', '"WAGMI! WAGMI! BUY THE DIP!"'); }
  };
  P.museum = function () {
    const gm = this.game, w = gm.sys.world, p = gm.player, r = this.records;
    return [['Best multiple', (r.bestMult || 0).toFixed(1) + 'x'], ['Best single trade', (r.bestPnl >= 0 ? '+' : '') + r.bestPnl.toFixed(2) + ' SOL'], ['Worst single trade', r.worstPnl.toFixed(2) + ' SOL'], ['Your highest coin', '$' + Math.round(r.topAth).toLocaleString() + ' MC'], ['Most followers', r.maxFollowers.toLocaleString()], ['Longest hold', Math.round(r.longest / 60) + ' min'], ['Times rugged', p.st.rugs], ['Achievements', w ? Object.keys(w.ach).length + ' / ' + BH.World.ACH.length : '—'], ['Season rewards', this.season.rewards.join(', ') || '—'], ['Collectibles', this.cards.length], ['Lives retired', gm.meta.prestige || 0]];
  };
  P.cemetery = function () { return this.game.player.closed.filter((c) => c.rugged || c.mult < 0.2).slice(0, 40); };

  // mods: mods/mod.json can add coin names, Chirp lines and headlines
  P.onLaunch = function (tk) {
    const m = BH.Mod; if (!m || !m.coinNames || !m.coinNames.length || R(this)() > 0.15) return;
    const n = m.coinNames[R(this).int(0, m.coinNames.length - 1)]; if (n && n.name) { tk.name = String(n.name).slice(0, 28); tk.ticker = String(n.ticker || n.name).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || tk.ticker; tk.modded = true; }
  };

  Life2.CHALLENGES = CHALLENGES; Life2.TIERS = TIERS; Life2.PETS = PETS;
  BH.Life2 = Life2;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'life', create(game, saved) { const l = new Life2(game, saved); l.hooks = { launch: (tk) => l.onLaunch(tk) }; return l; } });

  // the "real job" ending, and challenge runs carried into the next life
  if (BH.Story) {
    const end = BH.Story.prototype.ending;
    BH.Story.prototype.ending = function () { if (this.flags.realJob) return { id: 'story_realjob', title: 'The Real Job', text: 'You took the bank job. You still check charts in the bathroom at work. Mom tells everyone. You sleep eight hours a night now, mostly.' }; return end.call(this); };
  }
  if (BH.World) {
    const ef = BH.World.prototype.endingFor, can = BH.World.prototype.canRetire;
    BH.World.prototype.endingFor = function () { const st = this.game.sys.story; if (st && st.flags.realJob) return st.ending(); return ef.call(this); };
    BH.World.prototype.canRetire = function () { const st = this.game.sys.story; return (st && st.flags.realJob) || can.call(this); };
  }
  if (BH.Prestige) {
    const retire = BH.Prestige.retire, apply = BH.Prestige.apply;
    BH.Prestige.retire = function (game) { const r = retire(game); if (game.meta.nextChallenge) r.meta.challenge = game.meta.nextChallenge; return r; };
    BH.Prestige.apply = function (game) { apply(game); const c = game.meta.challenge; if (c === 'debt') game.bills.debt += 3000; if (c === 'broke') game.player.sol = 1; if (c === 'bear' && game.sys.finance) game.sys.finance.regime = 'bear'; };
  }
  // tilt warning on buys
  if (BH.Player) {
    const buy = BH.Player.prototype.buy;
    BH.Player.prototype.buy = function (id, sol, s) { const r = buy.call(this, id, sol, s); const gm = BH.Game; if (r.ok && gm && gm.player === this && gm.sys && gm.sys.life && gm.sys.life.tilt() >= 3 && !gm._tiltWarn) { gm._tiltWarn = true; setTimeout(() => { gm._tiltWarn = false; }, 30000); gm.emit('toast', { kind: 'bad', text: 'Tilt check: ' + gm.sys.life.tilt() + ' losses in a row. Is this a revenge trade?' }); } return r; };
  }
  // load the mod file in the app (not in tests)
  if (typeof window !== 'undefined' && typeof fetch === 'function') fetch('mods/mod.json').then((r) => (r.ok ? r.json() : null)).then((m) => { if (m) BH.Mod = m; }).catch(() => {});
})(typeof window !== 'undefined' ? window : globalThis);
