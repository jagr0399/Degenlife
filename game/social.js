/* Stage 2: Chirp (fake social app), Scope (J7-style KOL tracker) and narratives.
   Narrative heat (0-100) decides which themes launch, how fast coins launch and how much hype they start with.
   KOL posts push heat and hype; your coins' pumps and rugs make the timeline react. All accounts are made up. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;

  const NARRATIVES = [
    { id: 'cats', label: 'Cats', words: ['Cat', 'Kitty', 'Meow', 'Purr', 'Whisker', 'Tabby', 'Catnip', 'Chonk'] },
    { id: 'dogs', label: 'Dogs', words: ['Doge', 'Pup', 'Shiba', 'Bark', 'Woof', 'Corgi', 'Hound', 'Doggo'] },
    { id: 'ai', label: 'AI agents', words: ['Agent', 'Neural', 'GPT', 'Bot', 'Sentient', 'Swarm', 'Oracle', 'Cortex'] },
    { id: 'food', label: 'Food', words: ['Burger', 'Noodle', 'Taco', 'Pizza', 'Donut', 'Pickle', 'Ramen', 'Waffle'] },
    { id: 'space', label: 'Space', words: ['Moon', 'Rocket', 'Mars', 'Comet', 'Astro', 'Orbit', 'Nebula', 'Alien'] },
    { id: 'frogs', label: 'Swamp', words: ['Toad', 'Swamp', 'Lily', 'Croak', 'Newt', 'Bog', 'Gecko', 'Axolotl'] },
    { id: 'weather', label: 'Weather', words: ['Storm', 'Rain', 'Cloud', 'Thunder', 'Fog', 'Hail', 'Tornado', 'Drizzle'] },
    { id: 'sports', label: 'Sports', words: ['Dunk', 'Goal', 'Slam', 'Pitch', 'Sprint', 'Golf', 'Bowl', 'Rally'] },
    { id: 'absurd', label: 'Absurd', words: ['Spoon', 'Brick', 'Sock', 'Chair', 'Rock', 'Toaster', 'Lamp', 'Bucket'] },
    // more themes (Nov 12)
    { id: 'pengu', label: 'Penguins', words: ['Pengu', 'Waddle', 'Iceberg', 'Flipper', 'Tux', 'Igloo', 'Snowball', 'Puffin'] },
    { id: 'anime', label: 'Anime', words: ['Senpai', 'Waifu', 'Chibi', 'Kawaii', 'Sensei', 'Neko', 'Ninja', 'Mecha'] },
    { id: 'gaming', label: 'Gaming', words: ['Pixel', 'Noob', 'Speedrun', 'Respawn', 'Loot', 'Quest', 'Boss', 'Combo'] },
    { id: 'brainrot', label: 'Brainrot', words: ['Skibidi', 'Rizz', 'Sigma', 'Aura', 'Mewing', 'Gyatt', 'Fanum', 'Delulu'] },
    { id: 'monke', label: 'Monke', words: ['Monke', 'Ape', 'Chimp', 'Banana', 'Gorilla', 'Kong', 'Baboon', 'Lemur'] },
    { id: 'ocean', label: 'Ocean', words: ['Shark', 'Octo', 'Squid', 'Crab', 'Shrimp', 'Kraken', 'Jelly', 'Narwhal'] },
    { id: 'spooky', label: 'Spooky', words: ['Ghost', 'Goblin', 'Zombie', 'Witch', 'Skull', 'Pumpkin', 'Vampire', 'Gremlin'] },
    { id: 'music', label: 'Music', words: ['Bass', 'Vinyl', 'Beat', 'Rapper', 'Synth', 'Mixtape', 'Drop', 'Choir'] },
    { id: 'retro', label: 'Retro', words: ['Floppy', 'Pager', 'Dialup', 'Arcade', 'Cassette', 'Tamagotchi', 'Walkman', 'Pixelart'] },
    { id: 'cars', label: 'Cars', words: ['Turbo', 'Drift', 'Nitro', 'Lambo', 'Burnout', 'Pitstop', 'Muscle', 'Rally'] },
    { id: 'celeb', label: 'Celebrity', words: ['Tweet', 'Meme', 'Post', 'Reply', 'Ratio', 'Viral', 'Trend', 'Hashtag'] },
  ];
  const ADJ = ['Based', 'Tiny', 'Angry', 'Sad', 'Giga', 'Baby', 'Golden', 'Sleepy', 'Rich', 'Hungry', 'Chill', 'Cursed', 'Super', 'Lil'];

  // 24 hand-made KOLs. honesty: 1 = calls early and holds, 0 = dumps on followers. reach: how much a call moves price.
  const KOLS = [
    ['Ape Lord', 'apelord', 182000, 'caps', 0.3, 1.0], ['chart wizard', 'chartwiz', 64000, 'analytic', 0.7, 0.6],
    ['Moon Mommy', 'moonmommy', 121000, 'emoji', 0.4, 0.9], ['the quiet whale', 'quietwhale', 38000, 'cryptic', 0.8, 0.7],
    ['degen dan', 'degendan', 22000, 'caps', 0.35, 0.4], ['Gem Hunter', 'gemhunter_', 91000, 'emoji', 0.5, 0.8],
    ['sol summer', 'solsummer', 47000, 'chill', 0.6, 0.5], ['rug radar', 'rugradar', 56000, 'analytic', 0.9, 0.3],
    ['Captain Pump', 'captpump', 150000, 'caps', 0.2, 1.0], ['ser bags', 'serbags', 18000, 'chill', 0.5, 0.3],
    ['insider ivy', 'insiderivy', 33000, 'cryptic', 0.25, 0.7], ['Narrative Nick', 'narrativenick', 72000, 'analytic', 0.65, 0.6],
    ['froggy fren', 'froggyfren', 26000, 'emoji', 0.55, 0.4], ['100x Hannah', '100xhannah', 99000, 'caps', 0.3, 0.9],
    ['the dev watcher', 'devwatcher', 41000, 'analytic', 0.95, 0.3], ['Lambo Larry', 'lambolarry', 130000, 'caps', 0.15, 0.95],
    ['mid curve mo', 'midcurvemo', 15000, 'chill', 0.5, 0.25], ['Alpha Gal', 'alphagal', 87000, 'cryptic', 0.6, 0.75],
    ['bonding bob', 'bondingbob', 29000, 'analytic', 0.7, 0.4], ['Wen Lambo', 'wenlambo', 54000, 'emoji', 0.4, 0.6],
    ['exit liquidity', 'exitliq', 12000, 'chill', 0.45, 0.2], ['Sniper Sam', 'snipersam', 68000, 'cryptic', 0.35, 0.7],
    ['news bot 3000', 'newsbot3000', 205000, 'news', 1.0, 0.5], ['burned out bert', 'bertburned', 9000, 'chill', 0.8, 0.15],
  ].map(([name, handle, followers, style, honesty, reach], i) => ({ id: 'k' + i, name, handle: '@' + handle, followers, style, honesty, reach, pfp: i, verified: followers > 50000, calls: 0, hits: 0 }));

  const say = {
    caps: (s) => s.toUpperCase(), emoji: (s) => s + ' ' + ['🚀', '🔥', '💎', '🌕', '👀', '🫡'][Math.floor(Math.random() * 6)],
    cryptic: (s) => s.toLowerCase().replace(/[.!]$/, '') + '…', analytic: (s) => s, chill: (s) => s.toLowerCase(), news: (s) => 'NEWS: ' + s,
  };
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  function Social(game, saved) {
    this.game = game;
    const r = game.sim.r;
    this.heat = {}; NARRATIVES.forEach((n, i) => { this.heat[n.id] = i < 9 ? 15 + r() * 35 : 12 + ((i * 37) % 30); });
    this.posts = []; this.seq = 0; this.nextPost = 2; this.season = null; this.nextSeason = 120; this.lockHeat = false;
    this.kols = KOLS.map((k) => Object.assign({}, k));
    this.pending = [];        // calls waiting to be scored {post, coin, mcAt, t, peak}
    this.watch = {};          // coin id -> last mc we reacted to (feedback on your coins)
    if (saved) Object.assign(this, saved, { game });
    for (const n of NARRATIVES) if (!(this.heat[n.id] >= 0)) this.heat[n.id] = 20;   // themes added after this save was made
    this.lockHeat = false;
  }
  const P = Social.prototype;
  Social.NARRATIVES = NARRATIVES;

  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; const live = new Set(this.game.sim.tokens.map((t) => t.id)); o.watch = Object.fromEntries(Object.entries(this.watch).filter(([k]) => live.has(k))); return o; };
  P.label = function (id) { const n = NARRATIVES.find((x) => x.id === id); return n ? n.label : id; };
  P.hottest = function () { return NARRATIVES.slice().sort((a, b) => this.heat[b.id] - this.heat[a.id]); };
  P.bump = function (id, d) { if (this.heat[id] == null) return; this.heat[id] = Math.max(0, Math.min(100, this.heat[id] + d)); };

  P.post = function (acc, kind, text, extra) {
    const p = Object.assign({ id: 'p' + (++this.seq), t: this.game.sim.t, acc: acc.id || null, name: acc.name, handle: acc.handle, pfp: acc.pfp, verified: !!acc.verified, followers: acc.followers, kind, text, likes: Math.round(acc.followers * (0.002 + Math.random() * 0.01)), reposts: Math.round(acc.followers * Math.random() * 0.002) }, extra || {});
    this.posts.push(p);
    if (this.posts.length > 500) this.posts.splice(0, this.posts.length - 500);
    if (this.game.emit) this.game.emit('chirp', p);
    return p;
  };

  // ---- the launch hook: theme the coin, give it a photo and a dev "launch post" ----
  P.onLaunch = function (tk, r) {
    let total = 0; for (const n of NARRATIVES) total += 4 + this.heat[n.id] * this.heat[n.id] / 25;
    let x = r() * total, nar = NARRATIVES[0];
    for (const n of NARRATIVES) { x -= 4 + this.heat[n.id] * this.heat[n.id] / 25; if (x <= 0) { nar = n; break; } }
    tk.narrative = nar.id;
    const w = pick(r, nar.words);
    const roll = r();
    tk.name = roll < 0.45 ? pick(r, ADJ) + ' ' + w : roll < 0.7 ? w + ' ' + pick(r, ['Coin', 'Club', 'Season', 'Mode', 'Inu', 'World', 'Army', 'Gang', 'Cult', 'Maxi', 'Era', 'Core', 'Town']) : roll < 0.85 ? w + ' Wif ' + pick(r, ['Hat', 'Bag', 'Chain', 'Cape', 'Crown']) : tk.name;
    tk.ticker = BH.Names.ticker(tk.name, r);
    tk.img = r.int(0, 199);
    const real = BH.RealCoins && BH.RealCoins.next();
    if (real) BH.RealCoins.apply(tk, real);   // a real coin with no picture shows its first letter, never a stock photo
    tk.hype *= 1 + this.heat[nar.id] / 140;
    tk.dd = this.ddPost(tk, nar, r);
  };
  P.onLaunchMine = function (tk, r) {
    tk.img = tk.img != null ? tk.img : r.int(0, 199);
    tk.narrative = tk.narrative || this.hottest()[0].id;
    tk.dd = this.ddPost(tk, NARRATIVES.find((n) => n.id === tk.narrative) || NARRATIVES[0], r, true);
  };
  P.ddPost = function (tk, nar, r, mine) {
    const dev = mine ? { name: 'You', handle: '@you', pfp: (this.game.meta && this.game.meta.pfp != null ? this.game.meta.pfp : 47), followers: 140 + Math.round(this.game.player.st.creatorFees * 40), joined: 'Nov 2026', verified: false }
      : { name: pick(r, ['Kane', 'Mira', 'Tobi', 'Ash', 'Rex', 'Juno', 'Nova', 'Zed']) + ' ' + pick(r, ['Devs', 'Labs', 'Builds', 'Ships', 'Cooks']), handle: '@' + tk.ticker.toLowerCase() + pick(r, ['dev', 'labs', '_cto', 'onsol', 'hq']), pfp: r.int(0, 142), followers: r.int(40, 2600), joined: pick(r, ['Jun', 'Aug', 'Sep', 'Oct', 'Nov']) + ' 2026', verified: r() < 0.2 };
    const hooks = [
      'THIS IS THE BIGGEST TREND I HAVE SEEN IN MONTHS AND IT HAS NEVER BEEN TOKENIZED YET',
      'ok hear me out.', 'nobody is talking about this yet.', 'the ' + nar.label.toLowerCase() + ' meta is just getting started.',
      'I built this in one night and I am not sleeping until it hits a million.', 'fair launch. no team bag. no presale. just vibes.',
    ];
    const bodies = [
      'Everyone is posting ' + tk.name + ' memes right now and the common thread is the same joke. It started in the last 24h and the timeline is full of it.',
      tk.name + ' is the only ' + nar.label.toLowerCase() + ' coin with a real community. Join the chat, the raids start at 9.',
      'We are giving 5% of creator fees to a ' + nar.words[0].toLowerCase() + ' charity. Not financial advice, but look at the chart.',
      'Dev is doxxed (trust me). LP gets burned at graduation. Roadmap: memes → more memes → the moon.',
      'Saw this on a stream with 40k viewers and nobody had launched it. So I did. $' + tk.ticker + ' is here.',
    ];
    return { acc: dev, text: pick(r, hooks) + '\n\n' + pick(r, bodies), t: this.game.sim.t };
  };

  // ---- the step hook: posts, heat decay, seasons, scoring calls ----
  P.onStep = function (dt) {
    const sim = this.game.sim, r = sim.r;
    if (!this.lockHeat) for (const n of NARRATIVES) this.heat[n.id] += (25 - this.heat[n.id]) * 0.004 * dt;   // drift back toward normal
    if (sim.t >= this.nextSeason) {
      this.nextSeason = sim.t + 150 + r() * 200;
      const n = pick(r, NARRATIVES);
      if (!this.lockHeat) this.bump(n.id, 30 + r() * 30);
      this.season = n.id;
      this.post(this.kols[22], 'narrative', say.news(n.label + ' coins are trending across the timeline'), { nar: n.id });
    }
    let avg = 0; for (const n of NARRATIVES) avg += this.heat[n.id]; avg /= NARRATIVES.length;
    sim.launchMul = Math.max(0.5, Math.min(2.2, 0.55 + avg / 45 + (this.boost || 0)));
    this.boost = Math.max(0, (this.boost || 0) - 0.01 * dt);
    if (sim.t >= this.nextPost) { this.nextPost = sim.t + 2.5 + r() * 5; this.randomPost(r); }
    // score calls after 120 s: a hit = peak at least +50% over the MC at the post
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const c = this.pending[i], tk = sim.byId.get(c.coin);
      if (tk) c.peak = Math.max(c.peak, sim.mc(tk));
      if (sim.t - c.t > 120 || !tk) {
        const k = this.kols.find((x) => x.id === c.acc);
        if (k) { k.calls++; if (c.peak >= c.mcAt * 1.5) k.hits++; }
        this.pending.splice(i, 1);
      }
    }
    this.react();
  };

  P.randomPost = function (r) {
    const sim = this.game.sim;
    const live = sim.tokens.filter((t) => !t.dead && t.narrative);
    const k = pick(r, this.kols);
    const roll = r();
    if (roll < 0.45 && live.length) {
      // a call: KOLs like coins that are moving, in hot narratives
      let best = null, bs = -1;
      for (let i = 0; i < 6; i++) { const t = pick(r, live); const s = (sim.change(t, 30) + 5) * (1 + this.heat[t.narrative] / 50) * (0.5 + r()); if (s > bs) { bs = s; best = t; } }
      if (!best) return;
      const p = this.post(k, 'call', say[k.style]((r() < 0.5 ? 'aping ' : 'this one is going to send: ') + '$' + best.ticker + (r() < 0.5 ? ' — ' + this.label(best.narrative).toLowerCase() + ' season' : '')), { coin: best.id, mcAt: sim.mc(best) });
      best.hype += k.reach * (0.6 + r() * 0.6) * (k.honesty < 0.4 ? 0.7 : 1);
      this.bump(best.narrative, 2 + k.reach * 4);
      this.pending.push({ acc: k.id, coin: best.id, mcAt: p.mcAt, t: sim.t, peak: p.mcAt });
    } else if (roll < 0.7) {
      const n = r() < 0.6 ? this.hottest()[r.int(0, 2)] : pick(r, NARRATIVES);
      const up = r() < 0.65;
      this.post(k, 'narrative', say[k.style](up ? n.label + ' meta is so back' : n.label + ' coins are cooked, rotating out'), { nar: n.id });
      this.bump(n.id, (up ? 1 : -1) * (3 + k.reach * 6));
    } else if (roll < 0.85) {
      this.post(k, 'flex', say[k.style](pick(r, ['up ', 'down ', 'closed ']) + r.int(2, 90) + (r() < 0.5 ? 'x' : '%') + ' today. gn'), {});
    } else {
      const lines = ['who is still trading at this hour', 'touch grass they said', 'the trenches are quiet today', 'every chart looks the same', 'fees are eating me alive', 'just one more trade'];
      this.post(k, 'chatter', say[k.style](pick(r, lines)), {});
    }
  };

  // react to market events (rugs, migrations) and to your coins moving
  P.react = function () {
    const sim = this.game.sim, r = sim.r, p = this.game.player;
    const ev = sim.events;
    for (let i = ev.length - 1; i >= 0 && ev[i].t > sim.t - 0.6; i--) {
      const e = ev[i];
      if (e._chirp) continue; e._chirp = true;
      const tk = sim.byId.get(e.id);
      if (e.type === 'rug' && tk && r() < 0.5) { this.post(this.kols[r() < 0.5 ? 7 : 14], 'callout', say.analytic('$' + tk.ticker + ' just rugged. Dev and bundle out. Stay safe.'), { coin: tk.id }); if (tk.narrative) this.bump(tk.narrative, -4); }
      if (e.type === 'migrate' && tk && r() < 0.6) { this.post(pick(r, this.kols), 'call', say.emoji('$' + tk.ticker + ' graduated. still early?'), { coin: tk.id, mcAt: sim.mc(tk) }); if (tk.narrative) this.bump(tk.narrative, 6); }
    }
    // your bags and coins: pumps get posts and copycats, dumps get FUD
    const ids = new Set([...p.pos.keys(), ...p.myCoins]);
    for (const id of ids) {
      const tk = sim.byId.get(id); if (!tk || tk.dead) continue;
      const mc = sim.mc(tk), last = this.watch[id] || mc;
      if (mc > last * 1.8 && mc > 15000) {
        this.watch[id] = mc;
        this.post(pick(r, this.kols), 'call', say.caps('$' + tk.ticker + ' is ripping, who called this'), { coin: id, mcAt: mc, aboutYou: true });
        if (tk.narrative) { this.bump(tk.narrative, 8); this.boost = Math.min(0.6, (this.boost || 0) + 0.25); }
      } else if (mc < last * 0.45) {
        this.watch[id] = mc;
        this.post(pick(r, this.kols), 'fud', say.chill('$' + tk.ticker + ' holders in shambles'), { coin: id, aboutYou: true });
        if (tk.narrative) this.bump(tk.narrative, -5);
      } else if (!this.watch[id]) this.watch[id] = mc;
    }
  };

  // chart bubbles: notable wallets (KOLs, devs, whales, your firm, you, and big traders) get a PFP on the chart
  const NICK = ['DaniWorldwide', 'fauni', 'zenbags', 'kodo', 'lilsnipe', 'mavrik', 'oxjune', 'cashcow', 'gwei.eth', 'trenchrat', 'solami', 'nofomo', 'bagz', 'pumpqueen', 'rektangle', 'moonboi', 'wifhat', 'deltaneutral', 'gmgmgm', 'apecity'];
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  P.onTrade = function (tk, tr, h) {
    const k = tr.kind, hs = hash(tr.addr);
    if (k === 'bot') return;   // wash-trading bots would flood the chart
    // like real charts: only wallets worth watching get a bubble (KOLs, whales, devs, insiders, snipers on bigger trades, tracked wallets, you)
    const tracked = this.game.sys.tracker && this.game.sys.tracker.get(tr.addr);
    const notable = tr.you || tracked || k === 'kol' || k === 'dev' || k === 'whale' || k === 'firm' || ((k === 'insider' || k === 'sniper') && tr.sol >= 1) || (tr.sol >= 2.5 && hs % 2 === 0);
    if (!notable) return;
    let name, pf;
    if (tr.you) { name = 'You'; pf = 47; }
    else if (k === 'firm' && this.game.sys.firm) { const t = this.game.sys.firm.staff.find((x) => 'FIRM-' + x.id === tr.addr); name = t ? t.name : 'Your firm'; pf = t ? t.pfp : 3; }
    else if (tracked) { name = tracked.name; pf = hs % 143; }
    else if (k === 'whale' && this.game.sys.whales && this.game.sys.whales.byAddr(tr.addr)) { const wh = this.game.sys.whales.byAddr(tr.addr); name = wh.name; pf = wh.pfp % 143; }
    else if (k === 'kol' && tk.kol) { name = (tk.kol.handle || 'caller').replace('@', ''); pf = hs % 143; }
    else if (k === 'dev') { name = tk.dd ? tk.dd.acc.handle.replace('@', '') : 'dev'; pf = tk.dd ? tk.dd.acc.pfp : hs % 143; }
    else { name = NICK[hs % NICK.length] + (hs % 7 === 0 ? '' : String(hs % 97)); pf = hs % 143; }
    const b = tk.bubbles || (tk.bubbles = []);
    const last = b[b.length - 1];
    if (last && last.addr === tr.addr && last.side === tr.side && tr.t - last.t < 4) { last.sol += tr.sol; last.mc = tr.mc; last.n = (last.n || 1) + 1; return; }
    let thesis = tk._nextThesis || null;
    if (!thesis && k === 'kol') { for (let q = this.posts.length - 1; q >= 0 && q > this.posts.length - 120; q--) { const pp = this.posts[q]; if (pp.coin === tk.id && pp.kind === 'call') { thesis = pp.text; break; } } }
    b.push({ t: tr.t, side: tr.side, sol: tr.sol, mc: tr.mc, addr: tr.addr, kind: tr.you ? 'you' : k, name, pfp: pf, plat: hs % 3, thesis: thesis || undefined });
    // keep the whole history (bubbles used to vanish); past 600, drop the smallest old retail trades first
    if (b.length > 4000) { const i = b.findIndex((x) => x.kind !== 'you' && x.kind !== 'whale' && x.kind !== 'kol' && x.kind !== 'dev' && x.sol < 2); b.splice(i >= 0 ? i : 0, 1); }
  };

  P.onPlayerRug = function (tk) {
    this.post(this.kols[14], 'callout', 'The dev of $' + tk.ticker + ' just pulled everything. Wallet saved. Never touching their coins again.', { coin: tk.id, aboutYou: true });
    if (tk.narrative) this.bump(tk.narrative, -25);
    this.game.sim.launchMul = Math.max(0.5, (this.game.sim.launchMul || 1) * 0.7);
    this.boost = -0.4;
  };

  // ---- Scope: posts that mention a coin, tiered like J7 (STRONG only for live coins on the curve or under $2M) ----
  P.hitRate = function (accId) { const k = this.kols.find((x) => x.id === accId); return k && k.calls ? k.hits / k.calls : 0.35; };
  P.scope = function (limit) {
    const sim = this.game.sim, out = [];
    for (let i = this.posts.length - 1; i >= 0 && out.length < (limit || 60); i--) {
      const post = this.posts[i];
      if (!post.coin) continue;
      const tk = sim.byId.get(post.coin);
      const k = this.kols.find((x) => x.id === post.acc);
      const hr = this.hitRate(post.acc), reach = k ? k.reach : 0.3;
      const live = tk && !tk.dead && sim.mc(tk) < 2e6;
      const score = hr * 0.6 + reach * 0.4;
      const tier = live && score >= 0.5 ? 'STRONG' : live && score >= 0.33 ? 'MEDIUM' : 'WEAK';
      const mcNow = tk ? sim.mc(tk) : 0;
      out.push({ post, tier, hitRate: hr, mcAt: post.mcAt || mcNow, mcNow, change: post.mcAt ? (mcNow / post.mcAt - 1) * 100 : 0, alive: !!(tk && !tk.dead) });
    }
    return out;
  };

  BH.Social = Social;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({
    name: 'social',
    create(game, saved) {
      const s = new Social(game, saved);
      s.hooks = { launch: (tk, r) => s.onLaunch(tk, r), launchMine: (tk, r) => s.onLaunchMine(tk, r), step: (dt) => s.onStep(dt), trade: (tk, tr, h) => s.onTrade(tk, tr, h) };
      return s;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
