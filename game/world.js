/* Stage 6: the world around you. Random market events, the news, visitors at the door, the cat,
   achievements (trophy wall), endings and retiring (prestige). */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;

  const ACH = [
    ['first_trade', 'First trade', 'Buy any coin'], ['first_10x', 'First 10x', 'Close a trade at 10x or better'],
    ['first_launch', 'Dev era', 'Launch your own coin'], ['clean_dev', 'Clean dev', 'Have a launch count as clean'],
    ['rugger', 'Villain arc', 'Pull a rug'], ['first_hire', 'Boss', 'Hire a trader'], ['pad_owner', 'Platform', 'Own a launchpad'],
    ['apartment', 'Moved out', 'Lease the apartment'], ['tower', 'Top floor', 'Get the Tower'], ['rugged_5', 'Bag holder', 'Get rugged 5 times'],
    ['millionaire', 'Seven figures', 'Reach $1,000,000 net worth'], ['touch_grass', 'Touched grass', 'Visit the park'],
  ];
  const VISITORS = [
    { id: 'caller', who: 'A shady caller', text: '"I can get 40k followers to look at your coin tonight. 1 SOL, cash only. No refunds."', choices: [['Pay 1 SOL', 'caller_pay'], ['No thanks', 'none']] },
    { id: 'mom', who: 'Mom (phone call)', text: '"Are you eating? Your cousin says you are doing internet money now. Is that like a job?"', choices: [['I\'m fine, mom', 'mom_ok'], ['Ask for $100', 'mom_cash']] },
    { id: 'landlord', who: 'The landlord', text: '"Just checking in. Rent is due soon. The hallway smells like energy drinks."', choices: [['Will do', 'none']] },
    { id: 'rivaldev', who: 'A rival dev', text: '"Let\'s do a collab. You shill mine, I shill yours. Totally not a rug."', choices: [['Deal', 'rival_deal'], ['Hard pass', 'rep_up']] },
    { id: 'whale', who: 'A whale (DM)', text: '"saw your trades. you have taste. want a tip? ... buy whatever pumps next. gl"', choices: [['Thanks?', 'none']] },
    { id: 'cat', who: 'A stray cat', text: 'A cat is sitting outside your door, staring at you. It looks like it trades.', choices: [['Adopt the cat', 'cat_adopt'], ['Close the door', 'none']] },
    { id: 'intern', who: 'A nervous intern', text: '"H-hi, I can work for free if you teach me charts?"', choices: [['Sure', 'intern_resume'], ['Not now', 'none']] },
  ];

  function World(game, saved) {
    this.game = game;
    this.news = []; this.ach = {}; this.visitors = []; this.cat = false; this.catTrades = true; this.eventDay = 0; this.parkDay = 0; this.gymDay = 0; this.ending = null;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = World.prototype;
  World.ACH = ACH; World.VISITORS = VISITORS;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  P.headline = function (text) { this.news.unshift({ day: this.game.clock.day, hour: Math.floor(this.game.clock.hour), text }); if (this.news.length > 40) this.news.length = 40; this.game.emit('news', text); };
  P.unlock = function (id) {
    if (this.ach[id]) return;
    const a = ACH.find((x) => x[0] === id); if (!a) return;
    this.ach[id] = this.game.clock.day;
    this.game.emit('toast', { kind: 'info', text: 'Achievement: ' + a[1] });
  };
  P.netUsd = function () { return this.game.player.netWorth() * C.SOL_USD + this.game.bills.cash - this.game.bills.debt; };

  P.event = function (kind) {
    const sim = this.game.sim, r = sim.r, s = this.game.sys.social;
    if (kind === 'crash') { for (const tk of sim.tokens) if (!tk.dead) tk.hype *= 0.3; this.headline('MARKET CRASH: memecoins bleed as a whale panic-sells everything'); this.game.life.bump('sanity', -5); }
    if (kind === 'viral') { const n = BH.Social.NARRATIVES[r.int(0, BH.Social.NARRATIVES.length - 1)]; if (s) s.heat[n.id] = 100; this.headline('A ' + n.label.toLowerCase() + ' video goes viral. ' + n.label + ' coins are everywhere.'); }
    if (kind === 'hack') { const pad = this.game.sys.pad; if (pad && pad.owned) { const lost = this.game.player.sol * 0.05; this.game.player.sol -= lost; pad.trust = Math.max(0, pad.trust - 8); this.headline('Exploit on ' + pad.name + '! ' + lost.toFixed(2) + ' SOL drained before the fix.'); } else this.headline('A rival launchpad got exploited overnight. Users are nervous.'); }
    if (kind === 'outage') { this.headline('Network congestion: transactions are landing slowly today'); }
    if (kind === 'regulator') { const fine = Math.min(this.game.bills.cash, 50); this.game.bills.pay(fine); this.headline('The Fictional Department of Vibes visited town. Several degens fined $50 for "excessive aping".'); }
    if (kind === 'power') { this.headline('Power cut in your building for an hour. Hope you set stop losses.'); this.game.emit('power', true); }
    if (this.game.sys.macro) this.game.sys.macro.onWorldEvent(kind);   // crashes, hacks and outages move the SOL price too
  };
  P.afterTime = function () {
    const day = this.game.clock.day, r = this.game.sim.r, p = this.game.player;
    // achievements from state
    if (p.st.buys > 0) this.unlock('first_trade');
    if (p.closed.some((c) => c.mult >= 10)) this.unlock('first_10x');
    if (p.myCoins.length) this.unlock('first_launch');
    if (p.st.rugs >= 5) this.unlock('rugged_5');
    const f = this.game.sys.factory; if (f) { if (f.clean) this.unlock('clean_dev'); if (f.rugs) this.unlock('rugger'); }
    const fm = this.game.sys.firm; if (fm && fm.staff.length) this.unlock('first_hire');
    const pad = this.game.sys.pad; if (pad && pad.owned) this.unlock('pad_owner');
    const b = this.game.sys.build; if (b) { if (b.places.includes('apartment')) this.unlock('apartment'); if (b.places.includes('tower')) this.unlock('tower'); }
    if (this.netUsd() >= 1e6) this.unlock('millionaire');
    // eviction: two missed rents in a row and you lose the apartment
    if (this.game.bills.evictionLevel() >= 2 && b && b.places.includes('apartment') && !this.evicted) { this.evicted = true; b.loseHome(); this.game.emit('toast', { kind: 'bad', text: 'Evicted! You are back in the bedroom.' }); this.game.emit('evicted'); }
    if (this.game.bills.evictionLevel() < 2) this.evicted = false;
    if (this.eventDay === day) return;
    this.eventDay = day;
    if (day > 1 && r() < 0.45) this.event(['crash', 'viral', 'viral', 'hack', 'outage', 'regulator', 'power'][r.int(0, 6)]);
    if (r() < 0.55) { const v = VISITORS[r.int(0, VISITORS.length - 1)]; if (!(v.id === 'cat' && this.cat)) this.visitors.push(v.id); }
  };
  P.resolve = function (visitorId, action) {
    const i = this.visitors.indexOf(visitorId); if (i >= 0) this.visitors.splice(i, 1);
    const p = this.game.player, b = this.game.bills, f = this.game.sys.factory;
    const out = {
      none: 'They leave.',
      caller_pay: () => { if (p.sol < 1) return 'You do not have 1 SOL.'; p.sol -= 1; const mine = p.myCoins.map((id) => this.game.sim.byId.get(id)).filter((t) => t && !t.dead).pop(); if (mine) { mine.hype += 0.8; return 'They post about $' + mine.ticker + '. It moves... a bit.'; } return 'They take the SOL and promise to "remember you". Classic.'; },
      mom_ok: () => { this.game.life.bump('sanity', 6); return 'She tells you she is proud of you anyway. Sanity +6.'; },
      mom_cash: () => { b.earn(100, 'Mom'); this.game.life.bump('sanity', -2); return 'She sends $100 with a sigh you can hear through the phone.'; },
      rival_deal: () => { if (f) f.bumpRep(-6); return 'They dumped on your followers within the hour. Reputation -6.'; },
      rep_up: () => { if (f) f.bumpRep(3); return 'Word gets around that you said no. Reputation +3.'; },
      cat_adopt: () => { this.cat = true; this.game.life.bump('sanity', 10); return 'You have a cat now. It immediately sits on your keyboard. Sanity +10.'; },
      intern_resume: () => { const fm = this.game.sys.firm; if (fm) { fm.newResumes(); fm.resumes.unshift({ id: 'r' + (++fm.seq), name: 'Pip Intern', style: 'intern', skill: 30, nerves: 40, greed: 20, loyalty: 95, salary: 0, pfp: 12 }); } return 'Their resume is on top of the pile in the Firm tab.'; },
    }[action];
    return typeof out === 'function' ? out() : (out || 'Nothing happens.');
  };
  // the cat: once in a while it walks on the keyboard and buys a tiny bit of something
  P.onStep = function (dt) {
    if (!this.cat || !this.catTrades) return;
    const sim = this.game.sim, r = sim.r;
    if (r() < dt * 0.0015 && this.game.player.sol > 0.1) {
      const live = sim.tokens.filter((t) => !t.dead); const tk = live[r.int(0, live.length - 1)];
      if (tk) { const res = this.game.player.buy(tk.id, 0.02); if (res.ok) this.game.emit('toast', { kind: 'info', text: 'The cat walked on your keyboard and bought 0.02 SOL of $' + tk.ticker + '.' }); }
    }
  };
  P.visitPark = function () { if (this.parkDay === this.game.clock.day) return { ok: false, text: 'You already sat in the park today.' }; this.parkDay = this.game.clock.day; this.game.life.bump('sanity', 15); this.unlock('touch_grass'); this.game.clock.advanceHours(1); return { ok: true, text: 'You touched grass for an hour. Sanity +15.' }; };
  P.gym = function () { if (this.gymDay === this.game.clock.day) return { ok: false, text: 'One workout a day is plenty.' }; if (!this.game.bills.pay(15)) return { ok: false, text: 'The gym costs $15.' }; this.gymDay = this.game.clock.day; this.game.life.bump('sanity', 8); this.game.life.bump('hunger', 15); this.game.clock.advanceHours(1); return { ok: true, text: 'Good workout. Sanity +8, but now you are hungry.' }; };
  P.coffeeShop = function () { if (!this.game.bills.pay(6)) return { ok: false, text: 'A latte is $6.' }; this.game.life.bump('energy', 20); return { ok: true, text: 'Oat latte acquired. Energy +20.' }; };

  // endings: available once you reach $1M; retiring starts a new life with a perk
  P.endingFor = function () {
    const f = this.game.sys.factory, pad = this.game.sys.pad;
    if (pad && pad.owned && pad.trust >= 60) return { id: 'tycoon', title: 'Tower Tycoon', text: 'You own the platform everyone launches on. The trenches work for you now.' };
    if (f && f.rugs >= 3 && f.rep < 30) return { id: 'rugger', title: 'Serial Rugger', text: 'You got rich. Nobody will ever buy a coin with your name near it again.' };
    if (f && f.rep >= 70) return { id: 'clean', title: 'Clean Dev', text: 'You made it without burning anyone. They still tell stories about your launches.' };
    return { id: 'survivor', title: 'Survivor', text: 'You made a million in the trenches and got out. Most people never do.' };
  };
  P.canRetire = function () { return this.netUsd() >= 1e6; };
  BH.World = World;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'world', create(game, saved) { const w = new World(game, saved); w.hooks = { step: (dt) => w.onStep(dt) }; return w; } });

  // retiring: the next life starts in the bedroom with one perk per retirement
  BH.Prestige = {
    PERKS: [['fastpc', 'Fast fingers', 'Being tired never delays your orders'], ['savings', 'Savings', 'Start with +$500 cash'], ['famous', 'Famous', 'Start with 70 reputation'], ['stamina', 'Stamina', 'Energy drains 25% slower']],
    retire(game) {
      const w = game.sys.world, end = w.endingFor();
      const meta = { prestige: (game.meta.prestige || 0) + 1, perks: (game.meta.perks || []).slice(), endings: (game.meta.endings || []).concat(end.id), tutorial: false };
      const next = BH.Prestige.PERKS.find((p) => !meta.perks.includes(p[0]));
      if (next) meta.perks.push(next[0]);
      return { end, meta };
    },
    apply(game) {
      const perks = game.meta.perks || [];
      if (perks.includes('savings')) game.bills.cash += 500;
      if (perks.includes('famous') && game.sys.factory) game.sys.factory.rep = 70;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
