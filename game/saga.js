/* The saga: the story grows to 10 acts with a mystery running through it (who is "the Ghost", the dev behind the
   biggest rugs?), big set-piece events (a rug, launch day, a leaked-chat scandal, a heist, a subpoena, a trial, a crash,
   the unmasking), rewards of every kind (cash, SOL, items, titles, followers) and real fail states: you can be evicted,
   banned or go broke, and then that life is over and you start a new save.
   Dynamic: the Ghost is a different person in every save (Kai, Nova, Dex, Mira Vale or Vinnie). Clues come from Ghost
   coins you trade and from the set pieces, and some clues are red herrings. No DOM: ui/saga.js and world/main.mjs show it.
   Loaded right after game/story.js. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const Story = BH.Story; if (!Story) return;
  const C = BH.C, CAST = Story.CAST, ACTS = Story.ACTS, SCENES = Story.SCENES;

  Object.assign(CAST, { mira: { name: 'Mira Vale', role: 'a top KOL', icon: 'megaphone', color: '#b59cff' } });

  // ---- helpers ------------------------------------------------------------------------------------------------
  const net = (gm) => (gm.sys.world ? gm.sys.world.netUsd() : gm.player.netWorth() * C.SOL_USD + gm.bills.cash - gm.bills.debt);
  const has = (gm, place) => gm.sys.build && gm.sys.build.places.includes(place);
  const tr = (gm) => gm.sys.trencher || { followers: 0, trust: 50 };
  const heat = (gm) => (gm.sys.biz ? gm.sys.biz.heat : 0);
  const sp = (id) => (gm, s) => !!(s.saga && s.saga.sp[id]);
  const clues = (n) => (gm, s) => !!(s.saga && s.saga.clues.length >= n);
  const usd = (n) => '$' + Math.round(n).toLocaleString();
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---- 10 acts (replaces the 5 in story.js; the old scenes are spread across them) --------------------------------
  const ACTS10 = [
    { n: 1, title: 'Rock Bottom', blurb: 'A mattress, a laptop, a roommate who eats your food and 10 SOL. Rent is due on day 8. Miss it three times and Mr. Pruitt changes the locks for good.',
      goals: [
        { id: 'rent', text: 'Pay your first rent (day 8)', done: (gm) => gm.clock.day >= 8 && gm.bills.missed === 0 },
        { id: 'k1', text: 'Reach $3,000 net worth', done: (gm) => net(gm) >= 3000 },
        { id: 'park', text: 'Find the old man in the park (Street → Park)', done: (gm, s) => !!s.flags.metSol },
      ] },
    { n: 2, title: 'The Ghost', blurb: 'Dex put his savings into a coin and the dev vanished with it. Everyone in the trenches has a name for that dev: the Ghost.',
      goals: [
        { id: 'dexrug', text: 'Set piece: Dex Got Rugged', done: sp('dexrug') },
        { id: 'scar', text: 'Survive a rug of your own', done: (gm) => gm.player.st.rugs >= 1 },
      ] },
    { n: 3, title: 'The Trenches', blurb: 'People start to notice your calls. Kai is already flexing on J7, and the Ghost keeps launching.',
      goals: [
        { id: 'follow', text: 'Grow to 300 followers', done: (gm) => tr(gm).followers >= 300 },
        { id: 'apt', text: 'Lease the Apartment', done: (gm) => has(gm, 'apartment') },
        { id: 'clue1', text: 'Find a clue about the Ghost (trade a 👻 Ghost coin)', done: clues(1) },
      ] },
    { n: 4, title: 'Launch Day', blurb: 'Nova thinks you can ship something people would actually hold. Time to be the dev.',
      goals: [
        { id: 'launchday', text: 'Set piece: Launch Day', done: sp('launchday') },
        { id: 'k20', text: 'Reach $20,000 net worth', done: (gm) => net(gm) >= 20000 },
      ] },
    { n: 5, title: 'The Leak', blurb: 'Screenshots of a pump group chat are going around. Your name is in them. You were never in that chat.',
      goals: [
        { id: 'leak', text: 'Set piece: The Leak', done: sp('leak') },
        { id: 'office', text: 'Lease the Office and hire a trader', done: (gm) => has(gm, 'office') && gm.sys.firm && gm.sys.firm.staff.length > 0 },
      ] },
    { n: 6, title: 'The Heist', blurb: 'A tip: the Ghost has a coin ready to rug tonight. Someone could get in first and out first.',
      goals: [
        { id: 'heist', text: 'Set piece: The Heist', done: sp('heist') },
        { id: 'clue3', text: 'Collect 3 clues about the Ghost', done: clues(3) },
        { id: 'k100', text: 'Reach $100,000 net worth', done: (gm) => net(gm) >= 100000 },
      ] },
    { n: 7, title: 'The Subpoena', blurb: 'The Department of Vibes wants your wallets. With too much heat, you get banned from every platform.',
      goals: [
        { id: 'subpoena', text: 'Set piece: The Subpoena', done: sp('subpoena') },
      ] },
    { n: 8, title: 'Court of Vibes', blurb: 'Rugged holders filed a class action. Your name is on it, next to the Ghost\'s.',
      goals: [
        { id: 'trial', text: 'Set piece: The Trial', done: sp('trial') },
        { id: 'tower', text: 'Lease the Tower', done: (gm) => has(gm, 'tower') },
        { id: 'k250', text: 'Reach $250,000 net worth', done: (gm) => net(gm) >= 250000 },
      ] },
    { n: 9, title: 'The Crash', blurb: 'Everything bleeds at once. Only the people who planned for this get to keep playing.',
      goals: [
        { id: 'crash', text: 'Set piece: The Crash', done: sp('crash') },
        { id: 'k400', text: 'Reach $400,000 net worth', done: (gm) => net(gm) >= 400000 },
      ] },
    { n: 10, title: 'The Unmasking', blurb: 'You know enough. Name the Ghost, reach a million, and see Old Sol one last time.',
      goals: [
        { id: 'unmask', text: 'Set piece: The Unmasking (name the Ghost)', done: sp('unmask') },
        { id: 'mil', text: 'Reach $1,000,000 net worth', done: (gm) => net(gm) >= 1e6 },
        { id: 'final', text: 'Meet Old Sol one last time (the park)', done: (gm, s) => !!s.flags.finalTalk },
      ] },
  ];
  const OLD_TO_NEW = { 1: 1, 2: 3, 3: 4, 4: 8, 5: 10 };
  if (!ACTS._saga) {
    ACTS.length = 0; for (const a of ACTS10) ACTS.push(a); ACTS._saga = true;
    for (const s of SCENES) s.act = OLD_TO_NEW[s.act] || s.act;
  }

  // ---- the Ghost: suspects and their clues ---------------------------------------------------------------------
  const SUSPECTS = ['kai', 'nova', 'dex', 'mira', 'shark'];
  const CLUES = {
    kai: ['The Ghost\'s deployer was funded from the exchange account that paid for Kai\'s "race to a mil" banner ad.',
      'Every Ghost coin launched within ten minutes of a Kai Rush flex post.',
      'The Ghost misspells "definately" in coin descriptions. So does Kai.',
      'A Ghost dev wallet sent 0.69 SOL to kairush.sol.',
      'PumpCity insiders, Kai\'s new employer, got in first on every Ghost coin.'],
    nova: ['The Ghost\'s contracts are too clean for a rug dev: comments, tests, a builder\'s habits.',
      'Ghost coins only launch while Nova is "offline, shipping".',
      'A Ghost coin website footer says "built with reasons".',
      'The deployer paid for hosting with the card from a cracked-laptop repair receipt.',
      'The Ghost\'s wallet buys a coffee at Nova\'s coffee shop every launch day.'],
    dex: ['The first Ghost coin was deployed from your apartment Wi-Fi.',
      'Dex "got rugged", but his wallet went up that day.',
      'The Ghost\'s first wallet once held a frog-in-a-cowboy-hat NFT.',
      'Ghost coin tickers match the cereal that keeps vanishing from your kitchen.',
      'Nobody has ever actually met Jess, the girlfriend Dex moved in with.'],
    mira: ['Mira Vale calls every Ghost coin within 90 seconds of launch.',
      'The Ghost and Mira\'s alt account sign off with the same emoji: 🫡🕯️.',
      'A leaked invoice from Mira lists "G. coins, weekly, 40% of the bag".',
      'Mira\'s followers were the exit liquidity on every Ghost coin so far.',
      'Mira deleted a post that said "the ghost is a friend of mine".'],
    shark: ['The Ghost\'s bundle wallets all took loans from Vinnie.',
      'Rug money goes through the pawn shop Vinnie owns.',
      'Ghost coin pictures were taken in the back room of Vinnie\'s shop.',
      'Vinnie\'s "collections" always start the day after a Ghost rug.',
      'A Ghost dev wallet paid off a Vinnie loan, to Vinnie.'],
  };
  const sname = (id) => (CAST[id] ? CAST[id].name : id);

  // ---- set pieces ----------------------------------------------------------------------------------------------
  // each: act, who, title, lines, choices [[label, plan, reply]]; plans are handled in spPlan; win/fail checks in spTick
  const SET = {
    eviction: { act: 1, who: 'pruitt', title: 'Eviction Notice', hours: 48,
      lines: ['Mr. Pruitt slides a paper under the door: a "late fee" and two weeks of rent up front, $300, within two days.', '"Or I start the paperwork. Three missed rents and you\'re out. For good."'],
      choices: [['"You\'ll have it."', 'pay', 'He grunts. You have 2 days to have $300 cash.'], ['"This isn\'t even legal."', 'argue', '"Take it up with the Court of Vibes," he says. You still have 2 days to have $300 cash.']] },
    dexrug: { act: 2, who: 'dex', title: 'Dex Got Rugged', hours: 3,
      lines: ['Dex calls, out of breath. "I put everything into a coin. EVERYTHING. The dev is that Ghost guy and it\'s still pumping. Do I sell??"', 'There is a 👻 Ghost coin live right now. Ghost coins always rug.'],
      choices: [['"I\'ll trade it and get out before he pulls."', 'ride', 'Buy the 👻 Ghost coin and sell it at a profit before it rugs (3 game hours).'],
        ['"Sell NOW. And I\'m warning everyone."', 'warn', 'You post a warning. Dex sells for a loss but keeps half. Your followers notice who warned them.'],
        ['"Not my problem."', 'ignore', 'Dex goes quiet. The coin rugs an hour later.']] },
    launchday: { act: 4, who: 'nova', title: 'Launch Day', hours: 24,
      lines: ['Nova: "Launch something today. Clean: no bundles, small dev bag. Get it to $30K market cap and people will start calling you a dev."'],
      choices: [['"Let\'s ship it."', 'go', 'Launch a coin (Deploy, needs the Deployer license) and get it to $30K market cap within a day.'], ['"Not today."', 'skip', 'Nova shrugs. "Boring wins, but only if you show up."']] },
    leak: { act: 5, who: 'sleuth', title: 'The Leak', hours: 12,
      lines: ['An on-chain sleuth posts screenshots: a pump group chat, and your name in it. You were never in that chat.', 'Your followers are asking questions. Someone made this up. The Ghost?'],
      choices: [['Go live and address it (Stream, within 12 h)', 'live', 'Go live on Stream within 12 game hours and tell your side.'],
        ['Pay the sleuth $2,000 to trace who made it', 'pay', 'The sleuth takes your money and starts digging.'],
        ['Say nothing', 'quiet', 'Silence reads like guilt. Followers leave, and the sleuths keep watching.']] },
    heist: { act: 6, who: 'crew', title: 'The Heist', hours: 4,
      lines: ['A text from an unknown number: "Ghost has a coin going live in a minute. It will rug. Get in first, get out first, and it\'s yours."', 'A 👻 Ghost coin is about to launch.'],
      choices: [['Front-run it (profit 0.5+ SOL before the rug)', 'rob', 'Buy early, sell before it rugs, make at least 0.5 SOL on it (4 game hours).'],
        ['Expose it before anyone buys', 'expose', 'You post the deployer wallet. The coin dies at launch. The Ghost knows your name now.'],
        ['Ask to join the Ghost\'s crew', 'join', 'A wallet sends you 10 SOL. "Welcome." The heat starts right away.']] },
    subpoena: { act: 7, who: 'judge', title: 'The Subpoena', hours: 72,
      lines: ['A letter from the Department of Vibes: they want your wallets and your heat under 40 within 3 days.', 'If your heat is still 80 or more when time is up, every platform bans you. That life is over.'],
      choices: [['"Understood."', 'ok', 'Lie low and get your heat under 40 within 3 days (Hustle app → Go quiet).']] },
    trial: { act: 8, who: 'judge', title: 'The Trial', hours: 1,
      lines: ['The Court of Vibes is in session. Judge Moody reads the class action: "Rugged holders versus the Ghost and also, somehow, you."'],
      choices: [['Show your receipts (clean history)', 'receipts', ''], ['Blame the Ghost (needs 4 clues)', 'blame', ''], ['Settle (10% of your cash)', 'settle', '']] },
    crash: { act: 9, who: 'sol', title: 'The Crash', hours: 24,
      lines: ['Old Sol, on the phone for the first time ever: "Get off the screens for a day if you can. It\'s coming."', 'The whole market is about to crash. Keep at least 75% of your net worth for one day.'],
      choices: [['"Thanks, Sol."', 'ok', 'Hold on to 75% of your net worth through the next game day.']] },
    unmask: { act: 10, who: 'sol', title: 'The Unmasking', hours: 0,
      lines: ['Old Sol spreads your clues on the park bench. "You know who it is. Say it on stream and it\'s real."'],
      choices: [] },   // filled with the suspects when it starts
  };
  const SET_ORDER = ['eviction', 'dexrug', 'launchday', 'leak', 'heist', 'subpoena', 'trial', 'crash', 'unmask'];

  // ---- state ---------------------------------------------------------------------------------------------------
  const P = Story.prototype;
  P.sagaInit = function () {
    if (this.saga) return this.saga;
    if (this.v !== 2) { this.act = OLD_TO_NEW[this.act] || this.act; this.v = 2; }
    const t0 = this.game.sim && this.game.sim.tokens[0], seed = ((this.game.sim && this.game.sim.seed) || (t0 && t0.seed) || Date.now()) * 2654435761 + 97;
    const r = rng(seed), culprit = SUSPECTS[Math.floor(r() * SUSPECTS.length)];
    this.saga = { seed: seed >>> 0, n: 0, culprit, clues: [], used: {}, sp: {}, active: null, titles: [], ghostNext: 0, ghostCoins: [], fail: { broke: 0, ban: 0, warned: {} }, accused: [], over: null, actSince: this.game.clock.total };
    return this.saga;
  };
  P.sagaR = function () { const s = this.saga; s.n++; return rng(s.seed + s.n * 7919)(); };

  // rewards: {cash, sol, title, item, followers, trust, sanity}
  P.reward = function (rw, why) {
    const gm = this.game, s = this.saga, bits = [];
    if (!rw) return '';
    if (rw.cash) { gm.bills.earn(rw.cash, why || 'Story'); bits.push(usd(rw.cash)); }
    if (rw.sol) { gm.player.sol += rw.sol; bits.push(rw.sol + ' SOL'); }
    if (rw.followers && gm.sys.trencher) { gm.sys.trencher.followers = Math.round(gm.sys.trencher.followers + rw.followers); bits.push('+' + rw.followers + ' followers'); }
    if (rw.trust && gm.sys.trencher && gm.sys.trencher.bump) { gm.sys.trencher.bump('trust', rw.trust); bits.push('trust ' + (rw.trust > 0 ? '+' : '') + rw.trust); }
    if (rw.sanity) { gm.life.bump('sanity', rw.sanity); bits.push('sanity +' + rw.sanity); }
    if (rw.item && gm.sys.build) {
      const b = gm.sys.build, it = (BH.Build.CATALOG || []).find((x) => x.id === rw.item);
      if (it && b.count(it.id) + b.deliveries.filter((d) => d.item === it.id).length < it.max) { if (it.instant) b.owned[it.id] = (b.owned[it.id] || 0) + 1; else b.deliveries.push({ item: it.id, at: gm.clock.total + 1 }); bits.push(it.name + ' (free)'); }
    }
    if (rw.title && !s.titles.includes(rw.title)) { s.titles.push(rw.title); bits.push('title "' + rw.title + '"'); }
    const text = bits.length ? 'Reward: ' + bits.join(', ') + '.' : '';
    if (text) gm.emit('toast', { kind: 'buy', text });
    return text;
  };

  // a clue: mostly about the culprit, sometimes a red herring about someone else (from the 3rd clue on)
  P.addClue = function (src) {
    const s = this.saga, gm = this.game;
    if (s.clues.length >= 9) return null;
    const left = (x) => (s.used[x] || 0) < CLUES[x].length;
    const others = SUSPECTS.filter((x) => x !== s.culprit && left(x));
    let about = s.culprit;
    // a red herring 30% of the time from the 3rd clue on, or whenever the real Ghost's clues are used up
    if (others.length && ((s.clues.length >= 2 && this.sagaR() < 0.3) || !left(s.culprit))) about = others[Math.floor(this.sagaR() * others.length)];
    if (!left(about)) return null;
    const list = CLUES[about], i = s.used[about] || 0;
    s.used[about] = i + 1;
    const c = { day: gm.clock.day, about, text: list[i], src: src || '' };
    s.clues.push(c);
    gm.emit('toast', { kind: 'info', text: '🔎 New clue about the Ghost: ' + c.text });
    return c;
  };

  // a 👻 Ghost coin: always rugs, launched by "the Ghost"
  P.ghostCoin = function (fate) {
    const gm = this.game, sim = gm.sim, d = gm.sys.director;
    if (d) d.forceOnce = fate || 'rug';
    let tk = null; try { tk = sim.launch(); } finally { if (d) d.forceOnce = null; }
    if (!tk) return null;
    tk.ghost = true; tk.hype = Math.max(tk.hype || 0, 1.6); tk.name = '👻 ' + String(tk.name || '').slice(0, 28);
    this.saga.ghostCoins.push(tk.id); if (this.saga.ghostCoins.length > 30) this.saga.ghostCoins.shift();
    const j = gm.sys.j7;
    if (j && j.post) { try { const k = (BH.J7.ACCOUNTS || []).filter((a) => a[7] === 'kol'); const a = k[Math.floor(this.sagaR() * k.length)]; if (a) j.post(a[0], '👻 new Ghost coin $' + tk.ticker + ' just went live. you know how this ends. or do you', { coin: tk.id, kind: 'kol' }); } catch (e) { /* feed only */ } }
    if (sim.event) sim.event('news', tk, '👻 The Ghost launched $' + tk.ticker);
    return tk;
  };

  // ---- set piece flow ------------------------------------------------------------------------------------------
  P.spStart = function (id) {
    const s = this.saga, def = SET[id]; if (!def || s.sp[id] || (s.active && s.active.id === id)) return;
    const choices = id === 'unmask'
      ? SUSPECTS.map((x) => ['Name ' + sname(x), { do: 'story.spPlan|unmask|' + x }, '']).concat([['"Not yet. I need more clues."', { do: 'story.spPlan|unmask|wait' }, '']])
      : def.choices.map((c) => [c[0], { do: 'story.spPlan|' + id + '|' + c[1] }, c[2]]);
    this.inject({ id: 'sp_' + id + '_' + (s.n + 1), who: def.who, act: def.act, lines: ['★ SET PIECE: ' + def.title].concat(def.lines), choices, setpiece: id });
    s.n++;
    s.active = { id, plan: null, offered: this.game.clock.total };
  };
  // the player's choice in a set piece
  P.spPlan = function (id, plan) {
    const gm = this.game, s = this.saga, def = SET[id], a = s.active && s.active.id === id ? s.active : (s.active = { id });
    a.plan = plan; a.start = gm.clock.total; a.until = gm.clock.total + (def.hours || 0); a.net0 = net(gm);
    const done = (won, text, rw) => this.spEnd(id, won, text, rw);
    switch (id) {
      case 'eviction': this.rel.pruitt += plan === 'pay' ? 1 : -1; return { ok: true };
      case 'dexrug': {
        const tk = this.ghostCoin('rug'); a.coin = tk && tk.id;
        if (plan === 'warn') { this.path.builder += 2; return done(true, 'Dex got out with half. "You saved my rent, man."', { trust: 6, followers: 60, title: 'Whistleblower' }); }
        if (plan === 'ignore') { this.path.villain += 1; this.rel.dex -= 2; return done(false, 'Dex lost everything. He stops answering your texts for a while.'); }
        this.path.degen += 1; return { ok: true };
      }
      case 'launchday': if (plan === 'skip') return done(false, 'Launch Day passed you by.'); a.coins0 = gm.player.myCoins.length; return { ok: true };
      case 'leak':
        if (plan === 'pay') { if (!gm.bills.pay(Math.min(2000, gm.bills.cash))) return done(false, 'You couldn\'t pay. The screenshots keep spreading.', { trust: -10 }); this.addClue('the sleuth traced the fake chat'); return done(true, 'The sleuth traces the fake chat to a burner wallet the Ghost used before.', { trust: 4 }); }
        if (plan === 'quiet') { if (gm.sys.trencher) gm.sys.trencher.followers = Math.round(gm.sys.trencher.followers * 0.7); if (gm.sys.biz) gm.sys.biz.addHeat(15, 'The Leak'); this.path.villain += 1; return done(false, 'You lost 30% of your followers, and the sleuths are watching you now.'); }
        return { ok: true };
      case 'heist': {
        if (plan === 'join') { gm.player.sol += 10; if (gm.sys.biz) gm.sys.biz.addHeat(30, 'Joined the Ghost\'s crew'); this.path.villain += 3; this.addClue('from inside the Ghost\'s crew'); return done(true, 'You\'re in the Ghost\'s crew. 10 SOL richer, and now the sleuths have a file on you.', { title: 'Made Man' }); }
        const tk = this.ghostCoin(plan === 'expose' ? 'doa' : 'rug'); a.coin = tk && tk.id;
        if (plan === 'expose') { this.path.builder += 2; this.addClue('the deployer wallet you exposed'); return done(true, 'The coin died at launch. Nobody got rugged tonight.', { trust: 10, followers: 150, title: 'Ghostbuster' }); }
        this.path.degen += 2; return { ok: true };
      }
      case 'subpoena': return { ok: true };
      case 'trial': {
        const p = this.path, n = s.clues.filter((c) => c.about === s.culprit).length;
        if (plan === 'receipts' && p.builder >= p.villain) return done(true, 'Your receipts are clean. Case dismissed. Judge Moody: "Next time, fewer screenshots."', { cash: 15000, title: 'Not Guilty' });
        if (plan === 'blame' && s.clues.length >= 4) { this.addClue('evidence read out in court'); return done(true, 'You walk the court through the Ghost\'s wallets. Dismissed, and now the whole trenches are hunting the Ghost too.', { cash: 20000, followers: 500, title: 'Expert Witness' }); }
        if (plan === 'settle') { const fee = Math.round(gm.bills.cash * 0.1); gm.bills.pay(fee); return done(true, 'You settle for ' + usd(fee) + '. Nobody admits anything.', null); }
        void n; const fine = Math.round(Math.max(2000, net(gm) * 0.2)); gm.bills.charge(fine, 'Court of Vibes fine'); if (gm.sys.biz) gm.sys.biz.addHeat(20, 'Lost in court');
        return done(false, 'The court doesn\'t buy it. Fine: ' + usd(fine) + ', and your heat goes up.');
      }
      case 'crash': {
        const sim = gm.sim, cel = gm.sys.celebs;
        for (const tk of sim.tokens) if (!tk.dead && !tk.rugged && cel && cel.nudge) cel.nudge(tk, 0.55);
        if (gm.sys.world) gm.sys.world.headline('CRASH: everything is down 40%+ and nobody knows why');
        return { ok: true };
      }
      case 'unmask': {
        if (plan === 'wait') { s.active = null; s.unmaskAt = gm.clock.total + 24; return { ok: true, text: 'Old Sol nods. "Come back when you\'re sure."' }; }
        s.accused.push(plan);
        if (plan === s.culprit) {
          this.flags.ghostCaught = true; this.flags['ghost_' + plan] = true;
          if (this.rel[plan] != null) this.rel[plan] -= 5;
          return done(true, sname(plan) + ' was the Ghost. The wallets match, the stream clip goes everywhere, and the rugs stop.', { cash: 50000, followers: 2000, trust: 20, title: 'Ghost Hunter' });
        }
        if (gm.sys.trencher) { gm.sys.trencher.followers = Math.round(gm.sys.trencher.followers * 0.5); gm.sys.trencher.bump('trust', -30); }
        if (gm.sys.biz) gm.sys.biz.addHeat(25, 'Accused the wrong person');
        if (s.accused.length >= 2) return done(false, 'Wrong again. ' + sname(plan) + ' sues you, and the Ghost is never caught.');
        s.active = null; s.unmaskAt = gm.clock.total + 48;
        return { ok: true, text: 'It wasn\'t ' + sname(plan) + '. Half your followers leave. You get one more try in 2 days.' };
      }
    }
    return { ok: true };
  };
  P.spEnd = function (id, won, text, rw) {
    const gm = this.game, s = this.saga;
    s.sp[id] = won ? 'won' : 'lost'; if (s.active && s.active.id === id) s.active = null;
    const rtext = won ? this.reward(rw || (SET[id] && SET[id].reward), SET[id].title) : (rw ? this.reward(rw, SET[id].title) : '');
    gm.emit('toast', { kind: won ? 'buy' : 'bad', text: '★ ' + SET[id].title + ': ' + (won ? 'done' : 'failed') + '. ' + text });
    this.log.unshift({ day: gm.clock.day, who: SET[id].who, scene: 'sp_' + id, choice: '★ ' + SET[id].title + (won ? ' (won)' : ' (failed)'), reply: text + (rtext ? ' ' + rtext : '') });
    if (this.log.length > 60) this.log.length = 60;
    return { ok: true, text: text + (rtext ? ' ' + rtext : '') };
  };
  Object.assign(SET.eviction, { reward: { title: 'Tenant of the Month', item: 'plant' } });
  Object.assign(SET.dexrug, { reward: { sol: 1, title: 'Ghost Rider' } });
  Object.assign(SET.launchday, { reward: { cash: 1500, title: 'Shipped It', item: 'rgb' } });
  Object.assign(SET.leak, { reward: { followers: 400, trust: 8, title: 'Receipts' } });
  Object.assign(SET.heist, { reward: { cash: 5000, title: 'Heister' } });
  Object.assign(SET.subpoena, { reward: { cash: 3000, title: 'Clean Record' } });
  Object.assign(SET.crash, { reward: { cash: 10000, title: 'Diamond Hands', item: 'tv' } });

  // checks while a set piece runs
  P.spTick = function () {
    const gm = this.game, s = this.saga, a = s.active; if (!a || !a.plan) return;
    const now = gm.clock.total, late = a.until != null && now > a.until, id = a.id;
    const coin = a.coin && gm.sim.byId.get(a.coin);
    switch (id) {
      case 'eviction':
        if (gm.bills.cash >= 300 && now >= a.start + 1) { gm.bills.pay(300); this.rel.pruitt += 1; return this.spEnd(id, true, 'Pruitt counts the cash twice and leaves you alone.'); }
        if (late) { gm.bills.missed++; return this.spEnd(id, false, 'You didn\'t have $300. Pruitt filed it as a missed rent.'); }
        break;
      case 'dexrug': case 'heist': {
        const need = id === 'heist' ? 0.5 : 0.01;
        const win = gm.player.closed.find((c) => c.id === a.coin && !c.rugged && c.pnl >= need);
        if (win) { this.addClue('the ' + (id === 'heist' ? 'heist' : 'Ghost coin') + ' you traded'); return this.spEnd(id, true, id === 'heist' ? 'You got in first and out first: +' + win.pnl.toFixed(2) + ' SOL off the Ghost.' : 'You got out with profit before the Ghost pulled. Dex is impressed.'); }
        if ((coin && coin.rugged) || late) { const p = coin && gm.player.pos.get(coin.id); if (p && p.tokens > 0 && id === 'heist') this.path.degen += 1; this.addClue('the rug you watched'); return this.spEnd(id, false, coin && coin.rugged ? 'The Ghost pulled first.' : 'Time ran out.'); }
        break;
      }
      case 'launchday': {
        const mine = gm.player.myCoins.slice(a.coins0 || 0).map((cid) => gm.sim.byId.get(cid)).filter(Boolean);
        if (mine.some((tk) => (tk.athMc || 0) >= 30000)) { this.path.builder += 1; return this.spEnd(id, true, 'Your coin hit $30K. Nova: "Told you. Boring wins."'); }
        if (late) return this.spEnd(id, false, 'No coin of yours reached $30K today.');
        break;
      }
      case 'leak':
        if (gm.sys.stream && gm.sys.stream.live) { this.path.builder += 1; this.addClue('a viewer who recognised the fake chat'); return this.spEnd(id, true, 'You went live and walked everyone through it. A viewer recognises the fake chat\'s style. Followers stay.'); }
        if (late) { if (gm.sys.trencher) gm.sys.trencher.followers = Math.round(gm.sys.trencher.followers * 0.8); return this.spEnd(id, false, 'You never addressed it. 20% of your followers leave.'); }
        break;
      case 'subpoena':
        if (heat(gm) < 40 && now >= a.start + 2) return this.spEnd(id, true, 'Your heat is under 40. The Department of Vibes closes the file.');
        if (late) {
          if (heat(gm) >= 80) { this.spEnd(id, false, 'Your heat was still ' + Math.round(heat(gm)) + '.'); return this.gameOver('banned'); }
          gm.bills.charge(5000, 'Department of Vibes fine'); return this.spEnd(id, false, 'Your heat was still over 40. Fine: $5,000.');
        }
        break;
      case 'crash':
        if (late) { const ok = net(gm) >= a.net0 * 0.75; if (!ok) gm.life.bump('sanity', -20); return this.spEnd(id, ok, ok ? 'You kept ' + Math.round(net(gm) / Math.max(1, a.net0) * 100) + '% through the crash.' : 'The crash took more than a quarter of everything. Sanity −20.'); }
        break;
    }
  };

  // ---- fail states: evicted, banned, broke ---------------------------------------------------------------------
  const OVER = {
    evicted: { title: 'Evicted', text: 'Three missed rents. Mr. Pruitt changed the locks and put your mattress on the curb. That life is over.' },
    banned: { title: 'Banned', text: 'Every platform banned your wallets and your accounts. You can\'t trade, post or launch anywhere. That life is over.' },
    broke: { title: 'Broke', text: 'No cash, no SOL, no bags and debt you can\'t pay. You sell the laptop for bus fare home. That life is over.' },
  };
  Story.OVER = OVER;
  P.gameOver = function (why) {
    const gm = this.game, s = this.saga; if (s.over) return s.over;
    const o = Object.assign({ why, day: gm.clock.day, net: Math.round(net(gm)), act: this.act, actTitle: (ACTS[this.act - 1] || {}).title, titles: s.titles.slice(), clues: s.clues.length }, OVER[why]);
    s.over = o; gm.meta = gm.meta || {}; gm.meta.over = o;
    gm.emit('toast', { kind: 'bad', text: 'GAME OVER: ' + o.title + '. ' + o.text });
    gm.emit('gameOver', o);
    return o;
  };
  P.failTick = function (hours) {
    const gm = this.game, s = this.saga, f = s.fail; if (s.over || gm.clock.day < 3) return;
    const warn = (k, text) => { if (!f.warned[k]) { f.warned[k] = true; gm.emit('toast', { kind: 'bad', text }); } };
    // evicted: three missed rents (two already cost you the apartment)
    if (gm.bills.missed >= 3) return this.gameOver('evicted');
    if (gm.bills.missed === 2) warn('evict', 'Two missed rents. One more and you are evicted for good: game over.'); else f.warned.evict = false;
    // banned: heat maxed out for a whole game day
    if (heat(gm) >= 100) { f.ban += hours; warn('ban', 'Heat 100: if it stays maxed for a day, every platform bans you (game over). Go quiet in the Hustle app.'); if (f.ban >= 24) return this.gameOver('banned'); } else { f.ban = 0; f.warned.ban = false; }
    // broke: nothing left and in debt for two game days
    const flat = gm.player.sol < 0.05 && gm.player.pos.size === 0 && gm.bills.cash < 25 && gm.bills.debt > 0;
    if (flat) { f.broke += hours; warn('broke', 'You are flat broke and in debt. Find money within 2 days (side gig, sell stuff) or it is game over.'); if (f.broke >= 48) return this.gameOver('broke'); } else { f.broke = 0; f.warned.broke = false; }
  };

  // ---- hooks ---------------------------------------------------------------------------------------------------
  const origAfter = P.afterTime;
  P.afterTime = function () {
    if (!this.on) return;
    const s = this.sagaInit(), gm = this.game, now = gm.clock.total;
    const prevAct = this.act;
    origAfter.call(this);
    if (this.act !== prevAct) s.actSince = now;
    const hours = s.lastHour != null ? Math.max(0, now - s.lastHour) : 0; s.lastHour = now;
    if (s.over) return;
    this.spTick();
    this.failTick(hours);
    // start this act's set piece a few game hours into the act (the unmasking waits for 3 clues)
    if (!s.active) for (const id of SET_ORDER) {
      const def = SET[id]; if (def.act !== this.act || s.sp[id]) continue;
      if (id === 'eviction' && gm.clock.day < 4) break;
      if (now - (s.actSince || 0) < 3) break;
      if (id === 'unmask' && (s.clues.length < 3 || now < (s.unmaskAt || 0))) break;
      this.spStart(id); break;
    }
    // older set pieces you skipped past (old saves, fast players) are let go without a penalty
    for (const id of SET_ORDER) if (SET[id].act < this.act - 1 && !s.sp[id] && !(s.active && s.active.id === id)) s.sp[id] = 'skipped';
    // Ghost coins from act 2 on, every ~1-2 game days
    if (this.act >= 2 && now >= s.ghostNext) { if (s.ghostNext) this.ghostCoin(this.sagaR() < 0.7 ? 'rug' : 'pnd'); s.ghostNext = now + 24 + this.sagaR() * 24; }
  };
  // goals show the running set piece's objective and time left
  const origGoals = P.goals;
  P.goals = function () {
    const out = origGoals.call(this), s = this.saga, a = s && s.active;
    if (a && a.plan && SET[a.id]) { const left = a.until != null ? Math.max(0, a.until - this.game.clock.total) : 0; out.unshift({ id: 'sp', text: '★ ' + SET[a.id].title + ': ' + this.spObjective() + (left ? ' (' + (left >= 24 ? Math.ceil(left / 24) + 'd' : Math.ceil(left) + 'h') + ' left)' : ''), done: false, sp: true }); }
    return out;
  };
  P.spObjective = function () {
    const a = this.saga && this.saga.active; if (!a) return '';
    const coin = a.coin && this.game.sim.byId.get(a.coin), t = coin ? ' $' + coin.ticker : '';
    return ({ eviction: 'have $300 cash', dexrug: 'trade the 👻 Ghost coin' + t + ' for profit before it rugs', launchday: 'get a coin of yours to $30K MC', leak: 'go live on Stream',
      heist: 'make 0.5+ SOL on 👻' + t + ' before it rugs', subpoena: 'get heat under 40', crash: 'keep 75% of your net worth', trial: 'face the court', unmask: 'name the Ghost' })[a.id] || '';
  };
  // trading a Ghost coin finds clues: closing a position on one, or getting rugged holding it (checked every 2 s)
  P.onTrade = function () { };
  P.onStep = function () {
    const s = this.saga; if (!s || !s.ghostCoins.length) return;
    const gm = this.game, t = gm.sim.t; if (t - (s.ghostT || 0) < 2) return; s.ghostT = t;
    s.ghostSeen = s.ghostSeen || {};
    for (const id of s.ghostCoins) {
      if (s.ghostSeen[id]) continue;
      const tk = gm.sim.byId.get(id), closed = gm.player.closed.find((c) => c.id === id), p = gm.player.pos.get(id);
      if (closed && (!p || p.tokens < 1)) { s.ghostSeen[id] = 1; this.addClue(closed.rugged ? 'getting rugged on $' + closed.ticker : '$' + closed.ticker + ', a Ghost coin you traded'); }
      else if (tk && tk.rugged && p && p.tokens > 0) { s.ghostSeen[id] = 1; this.addClue('getting rugged on $' + tk.ticker); }
    }
  };
  // the park: the old acts' park flags still work for the old scenes
  const origPark = P.onPark;
  P.onPark = function () { origPark.call(this); const old = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 3, 7: 3, 8: 4, 9: 4, 10: 5 }[this.act] || 1; this.flags[old === 1 ? 'parkVisit' : 'parkVisit' + old] = true; };
  // the ending mentions the Ghost and your titles
  const origEnding = P.ending;
  P.ending = function () {
    const e = origEnding.call(this), s = this.saga;
    if (s) {
      if (this.flags.ghostCaught) e.text += ' You unmasked the Ghost: it was ' + sname(s.culprit) + '.';
      else if (s.clues.length) e.text += ' The Ghost was never caught. (It was ' + sname(s.culprit) + '.)';
      if (s.titles.length) e.text += ' Titles: ' + s.titles.join(', ') + '.';
    }
    return e;
  };

  Story.SET = SET; Story.SET_ORDER = SET_ORDER; Story.SUSPECTS = SUSPECTS; Story.CLUES = CLUES; Story.ACTS10 = ACTS10;
  // give the story system the market hooks it needs (trades and steps)
  const ent = (BH.Systems || []).find((x) => x.name === 'story');
  if (ent && !ent._saga) {
    const origCreate = ent.create; ent._saga = true;
    ent.create = function (game, saved) { const st = origCreate.call(this, game, saved); st.hooks = { trade: (tk, t) => st.onTrade(tk, t), step: () => st.onStep() }; return st; };
  }
  // the saved story must not carry its hooks
  const origSave = P.save;
  P.save = function () { const o = origSave.call(this); delete o.hooks; return o; };
})(typeof window !== 'undefined' ? window : globalThis);
