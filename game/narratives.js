/* More narratives, and narratives that move (all made up):
   - 16 more themes on top of game/social.js's list.
   - Metas burn out: a theme that stays above 75 heat for a few minutes starts to crash, and the money rotates into another theme
     (KOLs post the rotation).
   - Viral moments: every few minutes something random catches fire (a video, a news story, a meme) and spikes a theme.
   - Coins feed their theme: a coin in a theme passing $250K / $1M heats it up ("copycats incoming"); a rug cools it.
   - Chirp isn't only coins: everyday life, world news, sports, food and memes from normal accounts (about 4 in 10 posts).
   Extends BH.Social; load right after game/social.js and game/chirp.js. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const Soc = BH.Social; if (!Soc) return;
  const MORE = [
    { id: 'politics', label: 'Politics', words: ['Vote', 'Senator', 'Debate', 'Ballot', 'Mayor', 'Filibuster', 'Lobby', 'Rally'] },
    { id: 'tech', label: 'Big Tech', words: ['Chip', 'Cloud', 'Startup', 'Unicorn', 'Silicon', 'Server', 'Keynote', 'Gadget'] },
    { id: 'birds', label: 'Birds', words: ['Pigeon', 'Goose', 'Parrot', 'Owl', 'Duck', 'Seagull', 'Crow', 'Toucan'] },
    { id: 'fitness', label: 'Gym', words: ['Gains', 'Protein', 'Bulk', 'Deadlift', 'Swole', 'Cardio', 'Pump', 'Creatine'] },
    { id: 'dinos', label: 'Dinosaurs', words: ['Rex', 'Raptor', 'Dino', 'Fossil', 'Jurassic', 'Bronto', 'Stego', 'Ptero'] },
    { id: 'aliens', label: 'Aliens', words: ['Alien', 'UFO', 'Probe', 'Martian', 'Abduct', 'Saucer', 'Roswell', 'Zorg'] },
    { id: 'robots', label: 'Robots', words: ['Robot', 'Droid', 'Mech', 'Cyborg', 'Servo', 'Android', 'Bolt', 'Gearhead'] },
    { id: 'movies', label: 'Movies', words: ['Sequel', 'Blockbuster', 'Popcorn', 'Trailer', 'Director', 'Oscar', 'Remake', 'Villain'] },
    { id: 'tiktok', label: 'TikTok trends', words: ['Trend', 'Dance', 'Skibidi', 'Rizz', 'Aura', 'Sigma', 'Mewing', 'Gyatt'] },
    { id: 'money', label: 'Money printer', words: ['Printer', 'Stimmy', 'Dollar', 'Brrr', 'Fed', 'Bailout', 'Inflation', 'Bond'] },
    { id: 'zodiac', label: 'Zodiac', words: ['Gemini', 'Scorpio', 'Leo', 'Mercury', 'Retrograde', 'Horoscope', 'Taurus', 'Virgo'] },
    { id: 'fashion', label: 'Fashion', words: ['Drip', 'Sneaker', 'Runway', 'Hoodie', 'Designer', 'Fit', 'Couture', 'Vintage'] },
    { id: 'horses', label: 'Horses', words: ['Pony', 'Stallion', 'Mustang', 'Gallop', 'Saddle', 'Jockey', 'Unicorn', 'Clydesdale'] },
    { id: 'coffee', label: 'Coffee', words: ['Latte', 'Espresso', 'Brew', 'Barista', 'Mocha', 'Beans', 'Decaf', 'Frappe'] },
    { id: 'bears', label: 'Bears', words: ['Bear', 'Grizzly', 'Panda', 'Koala', 'Teddy', 'Polar', 'Cub', 'Honey'] },
    { id: 'wif', label: 'Hats', words: ['Hat', 'Beanie', 'Cap', 'Fedora', 'Wif', 'Sombrero', 'Crown', 'Bucket'] },
  ];
  const N = Soc.NARRATIVES;
  for (const n of MORE) if (!N.some((x) => x.id === n.id)) N.push(n);

  // ---- normal people on the timeline ----
  const FIRST = ['jess', 'mike', 'tay', 'nina', 'omar', 'ben', 'priya', 'leo', 'sam', 'zoe', 'kai', 'maya', 'dev', 'ari', 'noah', 'lena', 'max', 'rosa', 'tom', 'ivy'];
  const LIFE = [
    'my landlord raised rent again. the only thing going up in my life', 'made pasta from scratch. took 3 hours. ate it in 4 minutes', 'gym at 6am. i am the main character', 'my cat knocked my coffee onto my keyboard. bullish on new keyboards',
    'why is every coffee $9 now', 'slept 11 hours. still tired', 'got a parking ticket while buying the parking permit', 'my mom asked what i do for work. i said "charts"', 'first day at the new job. they have free snacks. never leaving',
    'it is raining and i have no umbrella. character development', 'the group chat is planning a trip that will never happen', 'just found $20 in my old jacket. best trade of the year', 'my roommate ate my leftovers again. war has begun',
    'tried meditating. thought about candles the whole time', 'grocery bill was $140 for 6 items', 'touch grass they said. the grass was wet', 'my dog learned to open the fridge. we are not the same',
  ];
  const WORLD = [
    'BREAKING: city announces a new bus line that goes nowhere', 'scientists discover a new species of frog that only eats ants. the frog people are thrilled', 'heat wave hits the east coast, ice cream shortages reported',
    'stock market opens flat as traders wait for the jobs report', 'a pigeon delayed a flight for 2 hours this morning', 'new phone launches with the same features as last year, now in purple', 'local man wins the lottery, loses ticket, finds it in his shoe',
    'the central bank says rates will stay "where they are" for now', 'world record: a dog skateboarded through 30 people\'s legs', 'big tech company announces layoffs and a new AI assistant on the same day', 'space agency delays the moon mission to "next year" again',
    'a giant pumpkin weighing 2,700 lb set a new record', 'gas prices up 12 cents overnight', 'a museum accidentally threw away a modern art piece. it was a bag of trash. or was it',
  ];
  const SPORTS = ['what a game last night. that buzzer beater was insane', 'my team lost again. i need a new team', 'fantasy league update: i am in last place and it is not close', 'refs were paid. no further questions'];
  const MEMES = ['me: i will go to bed early\nalso me at 3am: one more chart', 'nobody:\nabsolutely nobody:\nme: buying the top', 'POV: you sold too early', 'me explaining my portfolio to my parents 📉📈📉', 'the "it\'s just a joke coin" to "please go back up" pipeline',
    'brain: sleep\nme: what if the chart moves', 'they don\'t know i check my phone in the shower', 'every group chat has one guy who says "wagmi" while down 90%', 'normal people: weekends\ncrypto people: there are no weekends'];
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const S = Soc.prototype;
  S.personAcc = function (r) {
    const f = pick(r, FIRST), n = r.int(1, 999);
    return { id: 'person:' + f + n, name: f.charAt(0).toUpperCase() + f.slice(1) + (r() < 0.4 ? ' ' + pick(r, ['🌙', '✨', '🐸', '☕', '🏀', '🎮', '']) : ''), handle: '@' + f + (r() < 0.6 ? n : '_' + pick(r, ['irl', 'dot', 'xo', 'official', 'tv'])), pfp: r.int(0, 143), followers: r.int(40, 9000), verified: false };
  };
  const origRandom = S.randomPost;
  S.randomPost = function (r) {
    if (r() < 0.42) {
      const roll = r(), sim = this.game.sim;
      const text = roll < 0.4 ? pick(r, LIFE) : roll < 0.68 ? pick(r, WORLD) : roll < 0.8 ? pick(r, SPORTS) : pick(r, MEMES);
      const kind = roll < 0.4 ? 'life' : roll < 0.68 ? 'world' : roll < 0.8 ? 'sports' : 'meme';
      const acc = kind === 'world' ? { id: 'news:wire', name: pick(r, ['World Wire', 'Daily Brief', 'News Now', 'The Ticker']), handle: '@' + pick(r, ['worldwire', 'dailybrief', 'newsnow', 'theticker']), pfp: 140, followers: r.int(800000, 6000000), verified: true } : this.personAcc(r);
      const p = this.post(acc, kind, text, {});
      // the odd world story starts a theme (a frog discovery, a dog record, a pumpkin...)
      if (kind === 'world' && r() < 0.3) { const hit = N.find((x) => x.words.some((w) => text.toLowerCase().includes(w.toLowerCase()))); if (hit) this.bump(hit.id, 8 + r() * 12); }
      void sim; return p;
    }
    return origRandom.call(this, r);
  };

  // ---- narratives that move ----
  const origStep = S.onStep;
  S.onStep = function (dt) {
    origStep.call(this, dt);
    if (this.lockHeat) return;
    const sim = this.game.sim, r = sim.r;
    this.flow = this.flow || { hot: {}, nextViral: sim.t + 90 + r() * 120, seen: {} };
    const F = this.flow;
    // burnout and rotation: a theme hot for 4+ minutes starts crashing; money rotates into another
    for (const n of N) {
      const h = this.heat[n.id];
      if (h > 75) { F.hot[n.id] = (F.hot[n.id] || 0) + dt; } else F.hot[n.id] = 0;
      if (F.hot[n.id] > 240 && r() < 0.02 * dt) {
        F.hot[n.id] = 0;
        const to = pick(r, N.filter((x) => x.id !== n.id && this.heat[x.id] < 50));
        this.bump(n.id, -(25 + r() * 20)); if (to) this.bump(to.id, 25 + r() * 20);
        const k = pick(r, this.kols);
        if (k && to) this.post(k, 'narrative', n.label.toLowerCase() + ' meta is done. ' + to.label.toLowerCase() + ' is next. rotate or get left behind', { nar: to.id });
        if (this.game.sys.world && to) this.game.sys.world.headline('Rotation: ' + n.label + ' coins cool off, ' + to.label + ' heats up');
      }
    }
    // viral moments: something random catches fire
    if (sim.t >= F.nextViral) {
      F.nextViral = sim.t + 120 + r() * 240;
      const n = pick(r, N), w = pick(r, n.words);
      const what = pick(r, ['a video of a ' + w.toLowerCase() + ' just hit 50M views', 'a ' + w.toLowerCase() + ' meme is all over the timeline', 'a news story about a ' + w.toLowerCase() + ' went viral', 'everyone is posting ' + w.toLowerCase() + ' pics today']);
      this.bump(n.id, 15 + r() * 25);
      this.post(this.personAcc(r), 'meme', what + '. ' + pick(r, ['devs, do your thing', 'someone launch it', 'coin when', 'this is going to be a coin in 5 minutes']), { nar: n.id });
      this.boost = Math.min(0.9, (this.boost || 0) + 0.15);
    }
    // coins feed their theme: a runner heats it, a rug cools it
    if (!F.scanAt || sim.t - F.scanAt > 5) {
      F.scanAt = sim.t;
      for (const tk of sim.tokens) {
        if (!tk.narrative) continue;
        const mc = sim.mc(tk), key = tk.id;
        if (!tk.dead && mc > 250000 && !F.seen[key + ':250']) { F.seen[key + ':250'] = 1; this.bump(tk.narrative, 10); }
        if (!tk.dead && mc > 1e6 && !F.seen[key + ':1m']) { F.seen[key + ':1m'] = 1; this.bump(tk.narrative, 18); const k = pick(r, this.kols); if (k) this.post(k, 'narrative', '$' + tk.ticker + ' just hit a million. ' + this.label(tk.narrative).toLowerCase() + ' copycats incoming', { nar: tk.narrative, coin: tk.id }); }
        if (tk.rugged && !F.seen[key + ':rug']) { F.seen[key + ':rug'] = 1; this.bump(tk.narrative, -6); }
      }
      if (Object.keys(F.seen).length > 1500) F.seen = {};
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
