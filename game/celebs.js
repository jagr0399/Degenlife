/* Celebrities and a timeline that reacts (Nov 12).
   - A handful of famous accounts (made-up parodies) tweet now and then. When one of them tweets a meme, the trenches
     launch coins on it within seconds: 3-7 copies, and usually one of them runs (sometimes all the way).
   - The timeline reacts to what happens: launches off a tweet, graduations, rugs, new highs, big buys and your wins,
     liquidations, and the mood of the day. Accounts are made up. Uses its own random stream for timing. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  // name, handle, followers, pfp, tweets: [text, coin name (null = no coin, only hype), narrative]
  const CELEBS = [
    { name: 'Elon Tusk', handle: '@elontusk', followers: 212000000, pfp: 101, gold: true, power: 1.0, tweets: [
      ['my dog is wearing a hat now', 'Hat Dog', 'dogs'], ['Kekius Tuskimus', 'Kekius', 'frogs'], ['the frog knows', 'Frog King', 'frogs'],
      ['who let the cat on the rocket', 'Rocket Cat', 'space'], ['Gork', 'Gork', 'ai'], ['Department of Memes', 'DOME', 'absurd'],
      ['Marvin the robot would approve', 'Marvin', 'ai'], ['🐸', 'Pepe Tusk', 'frogs'], ['I am become meme', 'Meme Lord', 'celeb'],
      ['the penguins are plotting something', 'Plotting Pengu', 'pengu'], ['Mars by 2030. Bringing the dog.', 'Mars Dog', 'space'], ['ratio', null, 'celeb'] ] },
    { name: 'Vitalik B.', handle: '@vitalikb', followers: 5400000, pfp: 88, gold: true, power: 0.6, tweets: [
      ['just donated to a dog shelter. the dogs were very good', 'Good Boy', 'dogs'], ['unicorns are underrated', 'Unicorn', 'absurd'],
      ['wrote a 9,000 word post about sock puppets', 'Sock Puppet', 'absurd'], ['ok the narwhal thing is funny', 'Narwhal', 'ocean'] ] },
    { name: 'CZee', handle: '@czee_bnb', followers: 9800000, pfp: 64, gold: true, power: 0.75, tweets: [
      ['4', 'FOUR', 'absurd'], ['my dog Broccoli says hi', 'Broccoli', 'dogs'], ['ignore FUD. build.', 'Build Coin', 'ai'],
      ['the cat in my office has opinions', 'Office Cat', 'cats'], ['4', null, 'absurd'] ] },
    { name: 'Alon', handle: '@alon_pump', followers: 380000, pfp: 23, gold: false, power: 0.5, tweets: [
      ['the trenches are so back', null, 'celeb'], ['someone launch a coin about my lunch. it was ramen', 'Alon Ramen', 'food'],
      ['brainrot season loading', 'Skibidi Pump', 'brainrot'], ['gm to everyone except the snipers', 'Anti Sniper', 'absurd'] ] },
    { name: 'Mr Feast', handle: '@mrfeast', followers: 41000000, pfp: 132, gold: true, power: 0.8, tweets: [
      ['I bought the biggest burger in the world', 'Giga Burger', 'food'], ['first 100 replies win a car', 'Feast Car', 'cars'],
      ['my new video: 100 people vs 1 monkey', 'Feast Monke', 'monke'] ] },
    { name: 'Snoop Frogg', handle: '@snoopfrogg', followers: 23000000, pfp: 77, gold: true, power: 0.6, tweets: [
      ['frogg life fo shizzle', 'Frogg Life', 'frogs'], ['dropping a new beat tonight', 'Frogg Beat', 'music'], ['chill vibes only', null, 'music'] ] },
    { name: 'Anime Girl Daily', handle: '@animegirldaily', followers: 2100000, pfp: 140, gold: false, power: 0.45, tweets: [
      ['senpai noticed the chart', 'Senpai', 'anime'], ['new waifu just dropped', 'Waifu', 'anime'] ] },
  ];
  const VARIANTS = [(w) => w, (w) => 'Baby ' + w, (w) => w + ' CTO', (w) => 'Real ' + w, (w) => w + ' Inu', (w) => w + ' Coin', (w) => 'The ' + w, (w) => w + ' 2.0'];

  // more famous accounts (parodies) and more kinds of tweets (Nov 12)
  CELEBS.push(
    { name: 'Jim Crammer', handle: '@jimcrammer', followers: 2300000, pfp: 52, gold: true, power: 0.7, tweets: [
      ['{stock} is a screaming buy here!', 'stock:TSLA', 'celeb', 'inverse'], ['{coin}? I like it. I like it a lot!', null, 'celeb', 'inverse'],
      ['{stock} has never looked better', 'stock:NVDA', 'celeb', 'inverse'], ['crypto is finished. sell everything.', 'Crypto Is Dead', 'celeb'] ] },
    { name: 'Taylor Shift', handle: '@taylorshift', followers: 95000000, pfp: 118, gold: true, power: 0.85, tweets: [
      ['13 is my lucky number', 'Lucky 13', 'music'], ['new era starts friday ✨', 'Shift Era', 'music'], ['my cat runs this house', 'Shift Cat', 'cats'] ] },
    { name: 'Kim Kardashi', handle: '@kimkardashi', followers: 360000000, pfp: 126, gold: true, power: 0.75, tweets: [
      ['are you guys into crypto? check this out', 'Kardashi Coin', 'celeb', 'own'], ['new skincare line, glow up season', 'Glow Up', 'celeb'] ] },
    { name: 'Logan Pawl', handle: '@loganpawl', followers: 23000000, pfp: 34, gold: true, power: 0.6, tweets: [
      ['my new project is going to change everything. trust me.', 'PawlZoo', 'celeb', 'own-rug'], ['the boxing coin is live, LFG', 'Pawl Punch', 'sports', 'own-rug'], ['gm to my 23 million fans', null, 'celeb'] ] },
    { name: 'Michael Sailor', handle: '@msailor', followers: 4200000, pfp: 91, gold: true, power: 0.6, tweets: [
      ['buy more', 'stock:MSTR:+', 'celeb'], ['bitcoin is hope', null, 'celeb'], ['we bought more. again.', 'stock:MSTR:+', 'celeb'] ] },
    { name: 'Mark Zuckerbird', handle: '@zuckerbird', followers: 14000000, pfp: 15, gold: true, power: 0.55, tweets: [
      ['smoking meats today', 'Zuck Meat', 'food'], ['we are renaming the company. again.', 'stock:META:+', 'celeb'], ['surfing with a flag', 'Surf Zuck', 'sports'] ] },
    { name: 'Kathy Woods', handle: '@kathywoods', followers: 1600000, pfp: 102, gold: true, power: 0.5, tweets: [
      ['our price target for TSLA is unchanged: way higher', 'stock:TSLA:+', 'celeb'], ['innovation is on sale', 'stock:COIN:+', 'celeb'] ] },
    { name: 'Gary Veeee', handle: '@garyveeee', followers: 3400000, pfp: 60, gold: true, power: 0.5, tweets: [
      ['{coin} is the kind of community I love. patience!', null, 'celeb', 'shill'], ['buy the dip, build the brand', null, 'celeb'] ] },
    { name: 'pump.fun', handle: '@pumpdotfun', followers: 410000, pfp: 3, gold: false, power: 0.45, tweets: [
      ['the trenches never sleep', null, 'celeb'], ['{coin} is trending on the front page', null, 'celeb', 'shill'] ] },
  );
  const ADD = {
    '@elontusk': [['{coin} 👀', null, 'celeb', 'shill'], ['the tesla stock price is too high imo', 'stock:TSLA:-', 'celeb'], ['a dog in space would be funny', 'Space Doge', 'space']],
    '@czee_bnb': [['{coin}?', null, 'celeb', 'shill']],
    '@mrfeast': [['bought some {coin} for the stream lol', null, 'celeb', 'shill']],
    '@vitalikb': [['free ETH giveaway, buy $VITA now!!', 'Vita Airdrop', 'celeb', 'hack']],
    '@snoopfrogg': [['{coin} got that smooth vibe', null, 'celeb', 'shill']],
  };
  for (const c of CELEBS) if (ADD[c.handle]) c.tweets.push(...ADD[c.handle]);
  function mulberry(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const usd = (n) => (BH.fmt && BH.fmt.usd ? BH.fmt.usd(n) : '$' + Math.round(n));

  function Celebs(game, saved) {
    this.game = game; this.next = {}; this.queue = []; this.evSeen = 0; this.lastReact = -99; this.ms = {}; this.rs = 4242; this.tweets = [];
    if (saved) Object.assign(this, saved, { game });
    const r = this._r = mulberry(this.rs);   // with the helpers the name generator expects
    Object.assign(r, { int: (a, b) => a + Math.floor(r() * (b - a + 1)), pick: (arr) => arr[Math.floor(r() * arr.length)], range: (a, b) => a + r() * (b - a), chance: (p) => r() < p });
  }
  Celebs.CELEBS = CELEBS;
  const P = Celebs.prototype;
  P.save = function () { return { next: this.next, queue: this.queue, evSeen: this.evSeen, lastReact: this.lastReact, ms: this.ms, rs: Math.floor(this._r() * 2147483647), tweets: this.tweets.slice(-20) }; };
  P.acc = function (c) { return { id: 'celeb:' + c.handle, name: c.name, handle: c.handle, pfp: c.pfp, verified: true, gold: c.gold, followers: c.followers }; };
  P.kol = function () { const s = this.game.sys.social; return s ? pick(this._r, s.kols) : null; };

  // move a live coin: shove its chart path up or down (the director's push fades back over ~90 s) and its hype
  P.nudge = function (tk, mult) {
    if (!tk || tk.dead) return;
    if (tk.dir) { tk.dir.off = (tk.dir.off || 0) + Math.log(mult); tk.dir.offHalf = 90; }
    tk.hype = Math.max(0.05, (tk.hype || 1) * (mult > 1 ? 1 + (mult - 1) * 2 : mult));
  };
  // a coin worth tweeting about: something alive with volume, not brand new
  P.hotCoin = function () { const sim = this.game.sim, r = this._r; const live = sim.tokens.filter((t) => !t.dead && !t.isPlayer && sim.t - t.born > 60 && t.trades.length > 20).sort((a, b) => sim.vol5m(b) - sim.vol5m(a)).slice(0, 8); return live.length ? live[Math.floor(r() * live.length)] : null; };

  // a celebrity tweets. tw = [text, coin name, narrative, type]. Types:
  //   (none)       a meme: coins launch on it within seconds (and 15% of the time the tweet gets deleted later: the copies dump)
  //   'shill'      mentions a live coin ({coin} in the text): it pumps
  //   'inverse'    the inverse-guru effect: whatever he likes ({coin} or 'stock:SYM') drops
  //   'stock:SYM:+' / 'stock:SYM:-'  moves a stock on the Perps / Day Trading markets
  //   'own'        launches "their own" coin: a pump and dump        'own-rug': ...that rugs
  //   'hack'       the account got hacked: the "official" coin is a fast rug; the real owner warns everyone later
  P.tweet = function (c, tw) {
    const gm = this.game, s = gm.sys.social, sim = gm.sim, r = this._r; if (!s) return null;
    tw = tw || pick(r, c.tweets);
    if (!tw[3] && /^stock:/.test(tw[1] || '')) tw = [tw[0], null, tw[2], tw[1]];   // ['text', 'stock:SYM:+', nar] is a stock tweet
    if (tw[3]) return this.special(c, tw);
    const [text, coin, nar] = tw;
    const post = s.post(this.acc(c), 'celeb', text, { celeb: true, gold: c.gold, likes: Math.round(c.followers * (0.002 + r() * 0.006)), reposts: Math.round(c.followers * (0.0004 + r() * 0.001)), views: Math.round(c.followers * (0.08 + r() * 0.3)) });
    s.bump(nar, 25 * c.power + 10); s.boost = Math.min(0.9, (s.boost || 0) + 0.3 * c.power);
    this.tweets.push({ t: sim.t, who: c.handle, text, coin });
    if (gm.sys.world) gm.sys.world.headline(c.name + ' tweeted: "' + text + '"' + (coin ? '. Coins are launching on it.' : ''));
    gm.emit('toast', { kind: 'call', text: c.name + ' tweeted: "' + text + '"' + (coin ? ' · coins launching on it' : '') });
    if (coin) {
      const n = 3 + Math.floor(r() * 5 * c.power), base = sim.t;
      const order = VARIANTS.slice(); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      order.splice(order.indexOf(VARIANTS[0]), 1); order.unshift(VARIANTS[0]);   // the plain name tends to come first
      for (let i = 0; i < n; i++) {
        const fate = i === 0 ? (r() < 0.22 * c.power ? 'mega' : r() < 0.6 ? 'runner' : 'pnd') : (r() < 0.15 ? 'pnd' : r() < 0.55 ? 'doa' : 'rug');
        this.queue.push({ at: base + 2 + i * (2 + r() * 9), name: order[i % order.length](coin), nar, fate, hype: (2.2 - i * 0.25) * (0.6 + c.power), celeb: c.handle, post: post.id });
      }
      // sometimes the tweet gets deleted a few minutes later, and every copy dumps
      if (r() < 0.15) this.react(base + 90 + r() * 120, () => {
        for (const tk of sim.tokens) if (tk.celeb === c.handle && !tk.dead && sim.t - tk.born < 400) this.nudge(tk, 0.55);
        if (gm.sys.world) gm.sys.world.headline(c.name + ' deleted the tweet. The copies are dumping.');
        gm.emit('toast', { kind: 'bad', text: c.name + ' deleted the "' + text.slice(0, 40) + '" tweet. The copies are dumping.' });
        const k = s.kols.find((x) => x.handle === '@rugradar') || this.kol(); return k && [k, c.handle + ' deleted the tweet. every $' + BH.Names.ticker(coin, r).replace(/^\$/, '') + ' copy is bleeding. told you'];
      });
      this.react(base + 6, () => { const k = this.kol(); return k && [k, '🚨 ' + c.handle + ' just tweeted "' + text + '". $' + BH.Names.ticker(coin, r).replace(/^\$/, '') + ' is already live. which one is the real one?', { quote: { name: c.name, handle: c.handle, pfp: c.pfp, gold: c.gold, text } }]; });
    } else {
      this.react(base0(sim) + 5, () => { const k = this.kol(); return k && [k, c.handle + ' is posting again. ' + (s.label(nar) || nar).toLowerCase() + ' coins about to go crazy']; });
    }
    return post;
  };
  const base0 = (sim) => sim.t;

  P.special = function (c, tw) {
    const gm = this.game, s = gm.sys.social, sim = gm.sim, r = this._r, px = gm.sys.perps;
    let [text, coin, nar, type] = tw;
    const say = (t, extra) => s.post(this.acc(c), 'celeb', t, Object.assign({ celeb: true, gold: c.gold, likes: Math.round(c.followers * (0.002 + r() * 0.006)), reposts: Math.round(c.followers * (0.0004 + r() * 0.001)), views: Math.round(c.followers * (0.08 + r() * 0.3)) }, extra || {}));
    const news = (h, kind) => { if (gm.sys.world) gm.sys.world.headline(h); gm.emit('toast', { kind: kind || 'call', text: h }); };
    s.bump(nar || 'celeb', 12 * c.power + 6);
    this.tweets.push({ t: sim.t, who: c.handle, text, type });
    if (type === 'shill' || type === 'inverse') {
      const isStock = /^stock:/.test(coin || '');
      if (isStock) { const sym = coin.split(':')[1], m = px && px.mk[sym]; if (m) { const k = 1 + (type === 'inverse' ? -1 : 1) * (0.03 + r() * 0.05) * c.power; m.price *= k; } say(text.replace('{stock}', '$' + sym)); news(c.name + ' on $' + sym + ': "' + text.replace('{stock}', '$' + sym) + '"' + (type === 'inverse' ? '. Traders fade him, as usual.' : '')); return null; }
      const tk = this.hotCoin(); if (!tk) return null;
      const t2 = text.replace('{coin}', '$' + tk.ticker), post = say(t2, { coin: tk.id, media: true });
      this.nudge(tk, type === 'inverse' ? 0.6 + r() * 0.15 : 1.35 + r() * 0.5 * c.power);
      news(c.name + ' tweeted about $' + tk.ticker + (type === 'inverse' ? '. The inverse curse strikes: it dumps.' : '. It is pumping.'), type === 'inverse' ? 'bad' : 'call');
      this.react(sim.t + 4, () => { const k = this.kol(); return k && [k, type === 'inverse' ? 'inverse ' + c.handle + ' never misses. $' + tk.ticker + ' down bad' : c.handle + ' tweeted $' + tk.ticker + '. send it', { coin: tk.id, quote: { name: c.name, handle: c.handle, pfp: c.pfp, gold: c.gold, text: t2 } }]; });
      return post;
    }
    if (/^stock:/.test(type)) {
      const [, sym, dir] = type.split(':'), m = px && px.mk[sym];
      if (m) m.price *= 1 + (dir === '-' ? -1 : 1) * (0.025 + r() * 0.05) * c.power;
      const post = say(text);
      news(c.name + ': "' + text + '" · $' + sym + ' ' + (dir === '-' ? 'drops' : 'jumps') + ' on it');
      return post;
    }
    if (type === 'own' || type === 'own-rug' || type === 'hack') {
      const post = say(text);
      this.queue.push({ at: sim.t + 3, name: coin, nar: nar || 'celeb', fate: type === 'own' ? 'pnd' : 'rug', hype: 2.5 * (0.6 + c.power), celeb: c.handle, post: post.id });
      for (let i = 1; i < 3; i++) this.queue.push({ at: sim.t + 6 + i * 5, name: VARIANTS[i](coin), nar: nar || 'celeb', fate: 'doa', hype: 1.2, celeb: c.handle, post: post.id });
      news(c.name + ' launched a coin: $' + BH.Names.ticker(coin, r).replace(/^\$/, ''));
      if (type === 'hack') this.react(sim.t + 150 + r() * 90, () => { news(c.name + ': "my account was hacked. I did not launch any coin. do not buy."', 'bad'); say('my account was hacked. I did not launch any coin. please do not buy anything.'); return null; });
      if (type === 'own-rug') this.react(sim.t + 200 + r() * 100, () => { const k = s.kols.find((x) => x.handle === '@rugradar') || this.kol(); return k && [k, c.handle + '\'s coin is down 90%. again. how does this keep happening']; });
      return post;
    }
    return null;
  };

  // queue a reaction post a few seconds from now (fn returns [account, text, extra] or null)
  P.react = function (at, fn) { (this._later = this._later || []).push({ at, fn }); };

  P.launchQueued = function () {
    const gm = this.game, sim = gm.sim, d = gm.sys.director, s = gm.sys.social, r = this._r;
    while (this.queue.length && this.queue[0].at <= sim.t) {
      const q = this.queue.shift();
      if (d) d.forceOnce = q.fate;
      const tk = sim.launch && sim.launch(); if (!tk) continue;
      tk.name = q.name.slice(0, 32); tk.ticker = BH.Names.ticker(q.name, r).replace(/^\$/, '').slice(0, 10).toUpperCase();
      tk.narrative = q.nar; tk.custom = true; tk.realImg = null; tk.realMint = null; tk.img = Math.floor(r() * 200);
      tk.hype = Math.max(tk.hype || 1, q.hype); tk.celeb = q.celeb;
      if (tk.dd) tk.dd.text = 'Inspired by ' + q.celeb + '.\n\n' + q.name + ' is the one. Fair launch, LP burned at graduation. Let us cook.';
      if (sim.event) sim.event('news', tk, '$' + tk.ticker + ' launched off a ' + q.celeb + ' tweet');
      if (s && r() < 0.5) this.react(sim.t + 3 + r() * 6, () => { const k = this.kol(); return k && [k, pick(r, ['aping $' + tk.ticker + ' off the ' + q.celeb + ' tweet', '$' + tk.ticker + ' or the other one? sending both', 'too many copies of this already. $' + tk.ticker + ' looks like the og', 'dev of $' + tk.ticker + ' was fast lol']), { coin: tk.id, media: true }]; });
    }
  };

  // the timeline reacts to what happens on the market
  P.watchMarket = function () {
    const gm = this.game, sim = gm.sim, s = gm.sys.social, r = this._r; if (!s) return;
    const ev = sim.events || [];
    if (this.evSeen > ev.length) this.evSeen = 0;
    for (let i = this.evSeen; i < ev.length; i++) {
      const e = ev[i], tk = e.id && sim.byId.get(e.id); if (!tk) continue;
      if (sim.t - this.lastReact < 4) break;   // keep it a timeline, not a firehose
      const held = gm.player.pos.has(tk.id) && gm.player.pos.get(tk.id).tokens > 1;
      let k = null, text = null;
      if (e.type === 'rug' && (held || r() < 0.35)) { k = s.kols.find((x) => x.handle === '@rugradar') || this.kol(); text = '$' + tk.ticker + ' just rugged. ' + pick(r, ['dev pulled everything.', 'one candle to zero.', 'insiders out, holders left holding.', 'stay safe out there.']) + (held ? ' rip to everyone still in it' : ''); }
      else if (e.type === 'migrate' && r() < 0.3) { k = this.kol(); text = '$' + tk.ticker + ' graduated. ' + pick(r, ['next leg loading?', 'DEX chart looks clean.', 'now the real game starts.', 'paper hands already out']); }
      else if (e.type === 'ath' && sim.mc(tk) > 400000) { k = this.kol(); text = '$' + tk.ticker + ' ran to ' + usd(sim.mc(tk)) + '. who caught it?'; }
      else if (e.type === 'devsold' && held) { k = s.kols.find((x) => x.handle === '@devwatcher') || this.kol(); text = 'dev of $' + tk.ticker + ' just sold everything. you have been warned'; }
      if (k && text) { s.post(k, 'chatter', text, { coin: tk.id }); this.lastReact = sim.t; }
    }
    this.evSeen = ev.length;
    // market-cap milestones
    if (sim.t - this.lastReact >= 4) for (const tk of sim.tokens) {
      if (tk.dead) continue; const mc = sim.mc(tk), m = this.ms[tk.id] || 0;
      const steps = [100000, 1000000, 10000000], next = steps.find((x) => x > m && mc >= x);
      if (next) { this.ms[tk.id] = next; if (next >= 1000000 || r() < 0.25) { const k = this.kol(); s.post(k, 'chatter', '$' + tk.ticker + ' just crossed ' + usd(next) + (next >= 1000000 ? ' 🚀' : '') + '. ' + pick(r, ['still early?', 'who is holding?', 'the chart is insane.', 'told you.']), { coin: tk.id }); this.lastReact = sim.t; break; } }
    }
    if (Object.keys(this.ms).length > 400) { const live = new Set(sim.tokens.filter((t) => !t.dead).map((t) => t.id)); for (const id of Object.keys(this.ms)) if (!live.has(id)) delete this.ms[id]; }
  };

  // your own trades get noticed
  P.onTrade = function (tk, tr) {
    if (!tr.you) return;
    const gm = this.game, s = gm.sys.social, r = this._r, sim = gm.sim; if (!s || sim.t - this.lastReact < 3) return;
    if (tr.side === 'buy' && tr.sol >= 2 && r() < 0.5) { this.react(sim.t + 2 + r() * 4, () => { const k = this.kol(); return k && [k, 'someone just aped ' + tr.sol.toFixed(1) + ' SOL into $' + tk.ticker + ' 👀', { coin: tk.id }]; }); this.lastReact = sim.t; }
    if (tr.side === 'sell') { const h = tk.holders.get('YOU'); if (h && h.bought > 0.5 && h.sold > h.bought * 3 && !tk._youFlexed) { tk._youFlexed = true; this.react(sim.t + 3, () => { const k = this.kol(); return k && [k, '@you took ' + (h.sold / h.bought).toFixed(1) + 'x on $' + tk.ticker + '. respect', { coin: tk.id }]; }); this.lastReact = sim.t; } }
  };

  P.onStep = function () {
    const gm = this.game, sim = gm.sim, ck = gm.clock, r = this._r; if (!sim || !ck) return;
    const nowH = ck.total;
    // tweets: each celebrity every 5-16 game hours (more powerful accounts a bit less often); none on the first morning
    for (const c of CELEBS) {
      if (this.next[c.handle] == null) this.next[c.handle] = Math.max(nowH, 13) + 2 + r() * 14;
      if (nowH >= this.next[c.handle]) { this.next[c.handle] = nowH + (5 + r() * 11) * (0.7 + c.power * 0.6) * 1.6; this.tweet(c); break; }   // (x1.6: 16 accounts now, each tweets a bit less often)
    }
    this.launchQueued();
    if (this._later) { const due = this._later.filter((x) => x.at <= sim.t); if (due.length) { this._later = this._later.filter((x) => x.at > sim.t); const s = gm.sys.social; for (const d of due) { const out = d.fn(); if (out && out[0] && s) s.post(out[0], 'chatter', out[1], out[2] || {}); } } }
    this.watchMarket();
  };

  BH.Systems.push({ name: 'celebs', create(game, saved) { const c = new Celebs(game, saved); c.hooks = { step: () => c.onStep(), trade: (tk, tr) => c.onTrade(tk, tr) }; return c; } });
  BH.Celebs = Celebs;
})(typeof window !== 'undefined' ? window : globalThis);
