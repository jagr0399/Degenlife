/* Story mode: five acts, a small cast, scenes with choices, act goals, a rival racing you to $1M,
   three reputation paths (Builder / Degen / Villain) and story endings. No DOM: the HUD and phone read it. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;

  const CAST = {
    dex: { name: 'Dex', role: 'your roommate', icon: 'sofa', color: '#ff9f43' },
    mom: { name: 'Mom', role: 'family', icon: 'heart', color: '#ff6b9a' },
    sol: { name: 'Old Sol', role: 'the man in the park', icon: 'tree-pine', color: '#2bd67b' },
    kai: { name: 'Kai Rush', role: 'your rival', icon: 'swords', color: '#ff4d5e' },
    pruitt: { name: 'Mr. Pruitt', role: 'the landlord', icon: 'key-round', color: '#c7cbd3' },
    nova: { name: 'Nova', role: 'a dev who builds', icon: 'hammer', color: '#6b8cff' },
  };

  const net = (gm) => gm.sys.world ? gm.sys.world.netUsd() : gm.player.netWorth() * C.SOL_USD + gm.bills.cash - gm.bills.debt;
  const has = (gm, place) => gm.sys.build && gm.sys.build.places.includes(place);
  const tr = (gm) => gm.sys.trencher || { followers: 0, calls: [] };

  const ACTS = [
    { n: 1, title: 'Rock Bottom', blurb: 'A mattress, a laptop, a roommate who eats your food and 10 SOL. Rent is due on day 8.',
      goals: [
        { id: 'rent', text: 'Pay your first rent (day 8)', done: (gm) => gm.clock.day >= 8 && gm.bills.missed === 0 },
        { id: 'k1', text: 'Reach $3,000 net worth', done: (gm) => net(gm) >= 3000 },
        { id: 'park', text: 'Find the old man in the park (Street → Park)', done: (gm, s) => !!s.flags.metSol },
      ] },
    { n: 2, title: 'The Trenches', blurb: 'People start to notice your calls. Kai is already flexing on Chirp.',
      goals: [
        { id: 'follow', text: 'Grow to 300 followers on Trencher', done: (gm) => tr(gm).followers >= 300 },
        { id: 'apt', text: 'Lease the Apartment', done: (gm) => has(gm, 'apartment') },
        { id: 'scar', text: 'Survive your first rug', done: (gm) => gm.player.st.rugs >= 1 },
      ] },
    { n: 3, title: 'Moving Up', blurb: 'A real desk. Now you can make coins, not just trade them.',
      goals: [
        { id: 'launch', text: 'Launch your first coin (dev desk)', done: (gm) => gm.player.myCoins.length > 0 },
        { id: 'k20', text: 'Reach $20,000 net worth', done: (gm) => net(gm) >= 20000 },
        { id: 'office', text: 'Lease the Office and hire a trader', done: (gm) => has(gm, 'office') && gm.sys.firm && gm.sys.firm.staff.length > 0 },
      ] },
    { n: 4, title: 'The Tower', blurb: 'The view from up here is great. The people below are watching you.',
      goals: [
        { id: 'tower', text: 'Lease the Tower', done: (gm) => has(gm, 'tower') },
        { id: 'pad', text: 'Run your own launchpad', done: (gm) => gm.sys.pad && gm.sys.pad.owned },
        { id: 'k250', text: 'Reach $250,000 net worth', done: (gm) => net(gm) >= 250000 },
      ] },
    { n: 5, title: 'Endgame', blurb: 'One million. Then you decide who you were the whole time.',
      goals: [
        { id: 'mil', text: 'Reach $1,000,000 net worth', done: (gm) => net(gm) >= 1e6 },
        { id: 'final', text: 'Meet Old Sol one last time (the park)', done: (gm, s) => !!s.flags.finalTalk },
      ] },
  ];

  // effects: path {builder, degen, villain}, rel {who: d}, sanity, cash, sol, rep, flag, followers, trust
  const SCENES = [
    // ---------------- act 1 ----------------
    { id: 'intro', act: 1, who: 'dex', when: () => true,
      lines: ['Dex is on the couch-mattress, eating your cereal out of the box.', '"Bro. You\'re doing the coin thing again? Last time you lost my PlayStation money."'],
      choices: [['"This time is different."', { path: { degen: 1 }, rel: { dex: -1 } }, '"That\'s what you said last time," he says, and keeps eating.'],
        ['"I just need to make rent."', { path: { builder: 1 }, rel: { dex: 1 } }, '"Respect. Make rent and I\'ll buy the next cereal."']] },
    { id: 'kai_intro', act: 1, who: 'kai', when: (gm) => gm.clock.day >= 2,
      lines: ['A DM on Chirp from @kairush, 41k followers:', '"saw you in the trenches. we started the same week lol. race you to a mil? loser has to post \'I am exit liquidity\' pinned for a month"'],
      choices: [['"You\'re on."', { flag: 'race', path: { degen: 1 } }, 'Kai: "lfg. I\'m already up 3x btw."'], ['"Not racing anyone."', { path: { builder: 1 } }, 'Kai: "scared money don\'t make money." He races you anyway.']] },
    { id: 'mom1', act: 1, who: 'mom', when: (gm) => gm.clock.day >= 3,
      lines: ['Your phone buzzes. Mom.', '"Honey, your aunt says you quit the warehouse to do computer gambling. Tell me that is not true."'],
      choices: [['"It\'s trading, Mom. It\'s different."', { rel: { mom: -1 }, path: { degen: 1 } }, '"Your grandfather said the same thing about horses."'],
        ['"It\'s temporary. I\'m being careful."', { rel: { mom: 1 }, path: { builder: 1 } }, '"Okay. Eat something green this week. Love you."'],
        ['"Can you send $100?"', { rel: { mom: -2 }, cash: 100 }, 'A long sigh. Then a $100 transfer with the note "for FOOD".']] },
    { id: 'sol_rumor', act: 1, who: 'dex', when: (gm) => gm.clock.day >= 3,
      lines: ['"Yo, there\'s an old guy in the park who keeps asking about \'the kid in 4B who buys at the top\'. Pretty sure that\'s you."', 'He says the old man used to run a trading desk before any of this existed.'],
      choices: [['"I\'ll go find him."', {}, 'Leave through the door and go to the Street, then the park.']] },
    { id: 'sol1', act: 1, who: 'sol', when: (gm, s) => s.flags.parkVisit && !s.flags.metSol,
      lines: ['An old man on a bench is feeding pigeons out of a bag labeled "EXIT LIQUIDITY".', '"Every chart is a story somebody else is telling you. Before you buy, ask who is telling it, and when they plan to stop."'],
      choices: [['"So how do I know when they stop?"', { flag: 'metSol', path: { builder: 1 }, rel: { sol: 2 } }, '"Watch the dev wallet, the bundles and the people who got in first. And never buy what you can\'t explain to your mother." Lesson unlocked: the risk scan matters.'],
        ['"I just want a 100x."', { flag: 'metSol', path: { degen: 1 }, rel: { sol: 1 } }, '"Everyone does. That\'s why somebody can always sell you one." He tosses you a pigeon cracker.']] },
    { id: 'dex_borrow', act: 1, who: 'dex', when: (gm) => gm.clock.day >= 5 && gm.player.sol > 1.5,
      lines: ['"Okay don\'t be mad. I need half a SOL. There\'s a coin with a frog in a cowboy hat and I KNOW it\'s going."'],
      choices: [['Lend him 0.5 SOL', { sol: -0.5, flag: 'lentDex', rel: { dex: 2 } }, '"You\'re a real one." He immediately apes all of it.'], ['"No."', { rel: { dex: -1 } }, '"Fine. When it 50x\'s I\'m not sharing."']] },
    { id: 'pruitt1', act: 1, who: 'pruitt', when: (gm) => gm.clock.day >= 6,
      lines: ['A knock. Mr. Pruitt, the landlord, in a cardigan.', '"Rent on the eighth. Cash. I don\'t take magic internet beans. And tell your roommate the hallway is not a gym."'],
      choices: [['"It\'ll be there."', { path: { builder: 1 } }, 'He nods and shuffles off.'], ['"Ever heard of crypto, Mr. Pruitt?"', { path: { degen: 1 }, rel: { pruitt: -1 } }, '"I\'ve heard of eviction," he says.']] },
    // ---------------- act 2 ----------------
    { id: 'act2', act: 2, who: 'dex', when: () => true,
      lines: ['Dex is packing a duffel bag.', '"I\'m moving in with Jess. You can have the whole mattress. Also I ate your last meal. Love you bro."'],
      choices: [['"Good luck, man."', { rel: { dex: 1 }, sanity: 3 }, 'He leaves you a sticky note: "dont buy the top".'], ['"You still owe me."', { rel: { dex: -1 } }, '"I\'ll pay you back when the frog runs."']] },
    { id: 'dex_repay', act: 2, who: 'dex', when: (gm, s) => s.flags.lentDex,
      lines: ['A text from Dex: "THE FROG RAN. here\'s your half SOL back plus a little extra. told you."'],
      choices: [['"No way."', { sol: 1.0, rel: { dex: 2 }, sanity: 4 }, '+1.0 SOL. Sometimes the frog does run.']] },
    { id: 'kai_deal', act: 2, who: 'kai', when: (gm) => tr(gm).followers >= 180,
      lines: ['Kai again: "ok you\'re not bad. I\'m launching something tonight with my group. You get in at the bottom, you call it to your followers at 30k, we all exit at 80k. easy."'],
      choices: [['"I\'m in."', { path: { villain: 2 }, sol: 2, trust: -12, flag: 'kaiDeal' }, 'It works. +2 SOL. Three of your followers DM you screenshots of their losses. Trust −12.'],
        ['"I don\'t dump on my people."', { path: { builder: 2 }, trust: 6, rel: { kai: -1 } }, 'Kai: "ngmi." Later, a sleuth exposes his group. Your followers notice you weren\'t in it. Trust +6.']] },
    { id: 'sol2', act: 2, who: 'sol', when: (gm, s) => s.flags.parkVisit2,
      lines: ['Old Sol is doing a crossword. "Followers are a loan," he says without looking up.', '"Every call you make, they lend you trust. Rug them once and the loan gets called in."'],
      choices: [['"What if the call is just wrong?"', { rel: { sol: 1 }, path: { builder: 1 } }, '"Then say so, loudly. Wrong is forgiven. Hidden isn\'t."'], ['"Trust doesn\'t pay rent."', { rel: { sol: -1 }, path: { villain: 1 } }, '"No," he says. "It pays everything after rent."']] },
    { id: 'bigloss', act: 2, who: 'mom', when: (gm) => gm.player.closed.some((c) => c.pnl <= -1.5),
      lines: ['You lost a lot on one trade. Your hands are shaking a little. Your phone buzzes: Mom, again.', '"You sound tired on the phone lately. Are you sleeping?"'],
      choices: [['Tell her the truth', { rel: { mom: 2 }, sanity: 8 }, 'She doesn\'t understand charts, but she understands you. Sanity +8.'], ['"I\'m fine."', { sanity: -3 }, '"Okay," she says, in the voice that means she knows.']] },
    // ---------------- act 3 ----------------
    { id: 'nova', act: 3, who: 'nova', when: () => true,
      lines: ['At the coffee shop, a dev named Nova is shipping code on a cracked laptop.', '"Everyone launches a ticker. Nobody launches a reason. Give people a reason to hold and you won\'t need to rug them."'],
      choices: [['"Teach me."', { path: { builder: 2 }, rel: { nova: 2 }, flag: 'novaFriend' }, 'Nova: "Clean launches, no bundles, small dev bag. Boring wins." Your clean launches give extra reputation now.'],
        ['"Reasons don\'t send."', { path: { degen: 1 }, rel: { nova: -1 } }, 'Nova shrugs and goes back to coding.']] },
    { id: 'firstrug', act: 3, who: 'mom', when: (gm) => gm.sys.factory && gm.sys.factory.rugs > 0,
      lines: ['Mom calls. Her voice is quiet.', '"Your cousin showed me a post. It says you took people\'s money and ran. Tell me that\'s not you."'],
      choices: [['"It\'s just how the game works."', { rel: { mom: -3 }, path: { villain: 2 } }, 'She hangs up without saying goodbye.'], ['"It was a mistake. It won\'t happen again."', { rel: { mom: 1 }, path: { builder: 1 }, rep: 3 }, '"Then make it right," she says.']] },
    { id: 'sol3', act: 3, who: 'sol', when: (gm, s) => s.flags.parkVisit3,
      lines: ['Old Sol: "You moved. Bigger room, I hear."', '"Money changes the room you\'re in. It doesn\'t change who\'s sitting in it. Check who\'s sitting in it once a week."'],
      choices: [['"Who was sitting in yours?"', { rel: { sol: 2 } }, '"Somebody I didn\'t like very much, for about ten years." He smiles. "Then somebody better."']] },
    // ---------------- act 4 ----------------
    { id: 'pruitt2', act: 4, who: 'pruitt', when: () => true,
      lines: ['Mr. Pruitt shows up at the Tower lobby in the same cardigan.', '"Never thought I\'d see the kid from 4B in a tower. You still owe me for the hallway carpet, by the way."'],
      choices: [['Pay for the carpet ($300)', { cash: -300, rel: { pruitt: 3 }, path: { builder: 1 } }, '"Huh," he says. "You turned out okay."'], ['"Send me an invoice."', { rel: { pruitt: -1 } }, '"I did. Six times."']] },
    { id: 'buyout', act: 4, who: 'kai', when: (gm) => gm.sys.pad && gm.sys.pad.owned,
      lines: ['Kai now works for PumpCity, the rival launchpad.', '"They want to buy your pad. Big number. Of course, you\'d have to let their insiders front-run every launch. Everyone does it."'],
      choices: [['Take the deal (+$40,000)', { cash: 40000, path: { villain: 3 }, flag: 'soldOut' }, 'The money lands. Your moderation queue fills with bundled launches overnight.'],
        ['"My pad stays clean."', { path: { builder: 3 }, rep: 8, flag: 'stayedClean' }, 'Kai: "your funeral." Users start calling your pad "the safe one". Reputation +8.']] },
    { id: 'momvisit', act: 4, who: 'mom', when: (gm) => gm.clock.day >= 20,
      lines: ['Mom visits the Tower. She looks at the screens for a long time.', '"So this is the internet money. Are you happy, honey?"'],
      choices: [['"I think so."', { rel: { mom: 2 }, sanity: 6 }, 'She hugs you and steals a pen from reception.'], ['"I don\'t know anymore."', { rel: { mom: 3 }, sanity: 10 }, '"Then come home for dinner on Sunday. We\'ll figure it out." Sanity +10.']] },
    // ---------------- act 5 ----------------
    { id: 'sol_final', act: 5, who: 'sol', when: (gm, s) => s.flags.parkVisit5 && net(gm) >= 1e6,
      lines: ['The park, early morning. Old Sol is on the same bench, but the bag says "RETIRED" now.', '"A million. So. Was it the money, or was it the game?"'],
      choices: [['"It was the game."', { flag: 'finalTalk', path: { degen: 1 } }, '"Then you\'ll never really leave," he says, and that seems to make him happy.'],
        ['"It was the people."', { flag: 'finalTalk', path: { builder: 1 } }, '"Good answer. Go call your mother."'],
        ['"It was the money."', { flag: 'finalTalk', path: { villain: 1 } }, '"Honest, at least," he says. "That\'s rarer than a 100x."']] },
  ];

  const ENDINGS = {
    builder: { id: 'story_builder', title: 'The Builder', text: 'You made a million without making anyone exit liquidity. Your pad is "the safe one", Nova ships on it, and Mom tells the neighbors you are "in technology".' },
    degen: { id: 'story_degen', title: 'The Degen', text: 'You made a million the hard way: clicks, coffee and nerves. You still check charts at dinner. You always will.' },
    villain: { id: 'story_villain', title: 'The Villain', text: 'You made a million on other people\'s worst days. The sleuths have a thread about you. You never read it. You don\'t have to.' },
  };

  function Story(game, saved) {
    this.game = game;
    this.act = 1; this.done = {}; this.seen = {}; this.queue = []; this.flags = {};
    this.path = { builder: 0, degen: 0, villain: 0 };
    this.rel = { dex: 0, mom: 0, sol: 0, kai: 0, pruitt: 0, nova: 0 };
    this.log = []; this.lastSceneHour = -99;
    this.kai = { usd: 1500, day: 1, history: [1500], passed: false, ahead: true };
    this.on = true;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Story.prototype;
  Story.CAST = CAST; Story.ACTS = ACTS; Story.SCENES = SCENES; Story.ENDINGS = ENDINGS;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  P.actInfo = function () { return ACTS[this.act - 1]; };
  P.goals = function () { const a = this.actInfo(); return a.goals.map((x) => ({ id: x.id, text: x.text, done: !!this.done[a.n + ':' + x.id] })); };
  P.current = function () { return this.goals().find((x) => !x.done) || null; };
  P.netUsd = function () { return net(this.game); };
  P.dominant = function () { const p = this.path; return ['builder', 'villain', 'degen'].reduce((a, b) => (p[b] > p[a] ? b : a), 'degen'); };

  // the park counts as a visit for whichever act you're in
  P.onPark = function () { const k = this.act === 1 ? 'parkVisit' : 'parkVisit' + this.act; this.flags[k] = true; this.flags.parkVisit = true; };

  P.check = function () {
    const gm = this.game, a = this.actInfo();
    for (const x of a.goals) {
      const key = a.n + ':' + x.id;
      if (!this.done[key] && x.done(gm, this)) { this.done[key] = gm.clock.day; gm.emit('toast', { kind: 'info', text: 'Story goal done: ' + x.text }); }
    }
    if (a.goals.every((x) => this.done[a.n + ':' + x.id]) && this.act < ACTS.length) {
      this.act++;
      const nx = this.actInfo();
      gm.emit('toast', { kind: 'info', text: 'Act ' + nx.n + ': ' + nx.title });
      gm.emit('storyAct', nx);
      if (gm.sys.world) gm.sys.world.headline('A new chapter: ' + nx.title);
    }
    // queue scenes that are ready (one at a time, at least ~2 game hours apart)
    for (const s of SCENES) {
      if (s.act > this.act || this.seen[s.id] || this.queue.includes(s.id)) continue;
      if (s.act < this.act - 1 && s.id !== 'dex_repay') { this.seen[s.id] = 'skipped'; continue; }   // missed an old beat: let it go
      let ok = false; try { ok = s.when(gm, this); } catch (e) { ok = false; }
      if (ok) this.queue.push(s.id);
    }
  };
  // other systems queue their own scenes: {id, who, act?, lines, choices: [[label, fx, reply]]}; fx.do = 'sys.method|arg'
  P.inject = function (scene) {
    this.extra = this.extra || [];
    if (this.extra.some((x) => x.id === scene.id) || this.seen[scene.id]) return false;
    scene.act = scene.act || this.act; scene.injected = true;
    this.extra.push(scene); this.queue.unshift(scene.id);
    return true;
  };
  P.sceneById = function (id) { return SCENES.find((s) => s.id === id) || (this.extra || []).find((s) => s.id === id) || null; };
  P.next = function () {
    if (!this.on || !this.queue.length) return null;
    if (this.game.clock.total - this.lastSceneHour < 2 && this.lastSceneHour > 0) return null;
    const sc = this.sceneById(this.queue[0]);
    if (!sc) { this.queue.shift(); return null; }
    return sc;
  };
  // apply a choice; returns the reply text
  P.choose = function (sceneId, idx) {
    const s = this.sceneById(sceneId); if (!s) return '';
    const qi = this.queue.indexOf(sceneId); if (qi >= 0) this.queue.splice(qi, 1);
    const c = s.choices[idx] || s.choices[0];
    const fx = c[1] || {}, gm = this.game;
    for (const [k, v] of Object.entries(fx.path || {})) this.path[k] += v;
    for (const [k, v] of Object.entries(fx.rel || {})) this.rel[k] = (this.rel[k] || 0) + v;
    if (fx.sanity) gm.life.bump('sanity', fx.sanity);
    if (fx.cash) { if (fx.cash > 0) gm.bills.earn(fx.cash, CAST[s.who].name); else gm.bills.pay(Math.min(gm.bills.cash, -fx.cash)); }
    if (fx.sol) gm.player.sol = Math.max(0, gm.player.sol + Math.max(fx.sol, -gm.player.sol));
    if (fx.rep && gm.sys.factory) gm.sys.factory.bumpRep(fx.rep);
    if (fx.trust && gm.sys.trencher && gm.sys.trencher.bump) gm.sys.trencher.bump('trust', fx.trust);
    if (fx.flag) this.flags[fx.flag] = true;
    let extraText = '';
    if (fx.do) { const res = BH.runAction(gm, fx.do); if (res && res.text) extraText = ' ' + res.text; }
    if (s.injected) this.extra = this.extra.filter((x) => x.id !== sceneId);
    this.seen[sceneId] = gm.clock.day;
    this.lastSceneHour = gm.clock.total;
    this.log.unshift({ day: gm.clock.day, who: s.who, scene: sceneId, choice: c[0], reply: c[2] + extraText });
    if (this.log.length > 60) this.log.length = 60;
    return c[2] + extraText;
  };

  // Kai races you: a noisy daily climb with the odd blow-up
  P.tickKai = function () {
    const gm = this.game, r = gm.sim.r, k = this.kai;
    while (k.day < gm.clock.day) {
      k.day++;
      const shock = r() < 0.08 ? -0.55 : r() < 0.06 ? 0.9 : 0;
      k.usd = Math.max(300, k.usd * Math.exp(0.16 + 0.32 * r.normal() + shock));
      k.history.push(Math.round(k.usd)); if (k.history.length > 120) k.history.shift();
      const s = gm.sys.social;
      if (s && r() < 0.6) {
        const up = k.history.length > 1 && k.usd >= k.history[k.history.length - 2];
        s.post({ id: 'kai', name: 'Kai Rush', handle: 'kairush', pfp: 31, verified: true, followers: 41000 + Math.round(k.usd / 20) }, 'flex', up ? 'up to $' + Math.round(k.usd).toLocaleString() + ' net. someone tell 4B to keep up' : 'rough day. down to $' + Math.round(k.usd).toLocaleString() + '. still ahead of 4B lol', { aboutYou: true });
      }
    }
    const mine = net(gm), ahead = k.usd > mine;
    if (k.ahead && !ahead && mine > 2000) gm.emit('toast', { kind: 'info', text: 'You just passed Kai: $' + Math.round(mine).toLocaleString() + ' vs $' + Math.round(k.usd).toLocaleString() + '.' });
    if (!k.ahead && ahead && mine > 2000) gm.emit('toast', { kind: 'bad', text: 'Kai passed you again ($' + Math.round(k.usd).toLocaleString() + ').' });
    k.ahead = ahead;
  };

  P.ending = function () {
    const d = this.dominant(), e = Object.assign({}, ENDINGS[d]);
    const beat = this.kai.usd < net(this.game);
    e.text += beat ? ' Kai pinned "I am exit liquidity" to his profile, as promised.' : ' Kai got there first. He will never let you forget it.';
    if (this.rel.mom >= 3) e.text += ' You go home for Sunday dinner.';
    return e;
  };

  P.afterTime = function () { if (!this.on) return; this.tickKai(); this.check(); };
  P.tickReal = function () { };

  // run 'sys.method|arg1|arg2' against a game system; used by scene choices and app buttons
  BH.runAction = function (gm, str) {
    const [path, ...args] = String(str).split('|');
    const [sys, method] = path.split('.');
    const obj = gm.sys[sys];
    if (!obj || typeof obj[method] !== 'function') return { ok: false, reason: 'Unknown action ' + path };
    try { return obj[method](...args.map((a) => (a !== '' && !isNaN(+a) ? +a : a))) || { ok: true }; } catch (e) { return { ok: false, reason: e.message }; }
  };
  // extra cast for the later systems
  Object.assign(CAST, {
    shark: { name: 'Vinnie', role: 'a loan shark', icon: 'skull', color: '#ff4d5e' },
    sleuth: { name: 'zachxbt-adjacent', role: 'an on-chain sleuth', icon: 'search', color: '#4aa8ff' },
    crew: { name: 'Your crew', role: 'work', icon: 'users', color: '#a77bff' },
    friends: { name: 'The group chat', role: 'friends', icon: 'message-circle', color: '#2bd67b' },
    judge: { name: 'Judge Moody', role: 'the Court of Vibes', icon: 'gavel', color: '#f4b23e' },
    date: { name: 'Riley', role: 'a date', icon: 'heart-handshake', color: '#ff6b9a' },
  });
  BH.Story = Story;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'story', create(game, saved) { return new Story(game, saved); } });

  // story endings take over once there's a story path to tell
  if (BH.World) {
    const orig = BH.World.prototype.endingFor;
    BH.World.prototype.endingFor = function () {
      const st = this.game.sys.story;
      if (st && st.on && (st.path.builder + st.path.degen + st.path.villain) >= 3) return st.ending();
      return orig.call(this);
    };
    const origPark = BH.World.prototype.visitPark;
    BH.World.prototype.visitPark = function () {
      const r = origPark.call(this);
      if (this.game.sys.story) this.game.sys.story.onPark();
      return r;
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
