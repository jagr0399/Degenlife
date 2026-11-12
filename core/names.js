/* Random memecoin identities: names, tickers, blurbs, fake addresses, caller handles.
   All made up; no real people, brands or projects. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};

  // seeded rng (mulberry32) so test runs repeat
  BH.makeRng = function (seed) {
    let s = (seed >>> 0) || 1;
    const r = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (a, b) => a + (b - a) * r();
    r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    r.normal = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    r.logn = (median, sigma) => median * Math.exp(sigma * r.normal());
    r.poisson = (lam) => {
      if (lam <= 0) return 0;
      if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * r.normal()));
      const L = Math.exp(-lam); let k = 0, p = 1;
      do { k++; p *= r(); } while (p > L);
      return k - 1;
    };
    r.getState = () => s;
    r.setState = (n) => { s = n >>> 0; };
    return r;
  };

  const ADJ = ['Based', 'Sleepy', 'Feral', 'Tiny', 'Giga', 'Smol', 'Cursed', 'Lucky', 'Angry', 'Chill', 'Wet', 'Crispy', 'Shiny', 'Moist', 'Sad', 'Hyper', 'Retro', 'Quantum', 'Turbo', 'Baby', 'Chunky', 'Sus', 'Holy', 'Lazy', 'Rich', 'Broke', 'Unhinged', 'Cozy', 'Sigma', 'Rare', 'Cosmic', 'Spicy', 'Frozen', 'Golden', 'Haunted', 'Silly', 'Grumpy', 'Neon', 'Pixel', 'Wobbly'];
  const NOUN = ['Frog', 'Cat', 'Dog', 'Hamster', 'Goblin', 'Otter', 'Penguin', 'Toad', 'Capybara', 'Duck', 'Snail', 'Wizard', 'Banana', 'Potato', 'Goose', 'Raccoon', 'Shrimp', 'Moth', 'Possum', 'Llama', 'Pigeon', 'Seal', 'Bear', 'Bull', 'Monke', 'Worm', 'Crab', 'Beetle', 'Toast', 'Noodle', 'Pickle', 'Gremlin', 'Yeti', 'Robot', 'Cactus', 'Walrus', 'Axolotl', 'Hippo', 'Mole', 'Bean'];
  const SOLO = ['Wagmi', 'Ngmi', 'Gm', 'Cope', 'Seethe', 'Bonk Bonk', 'Rizz', 'Skibidi Bean', 'Lore', 'Vibes', 'Touch Grass', 'Cabal', 'Exit Liq', 'Dev Pls', 'Send It', 'Wen Moon', 'Jeet', 'Diamond Paws', 'Big Brain', 'Copium', 'Hopium', 'Rug Me', 'Ser', 'Fren', 'Degen Hours', 'Number Go Up', 'Floor Is Lava', 'Mid Curve', 'Bag Lady', 'Liquidity Goblin'];
  const SUFFIX = ['', '', '', '', ' Coin', ' AI', ' Inu', ' 2.0', ' Classic', ' On Sol', ' Season', ' Cult', ' Club', ' Mode'];
  const BLURB = [
    'the only {n} that matters.', 'community takeover. dev is gone, we are the dev now.', 'just a {n} trying to make it.',
    'no roadmap. no utility. just {n}.', '1B supply. 0 tax. 100% vibes.', '{n} saw the chart and said send it.',
    'born on the curve, raised by degens.', 'they laughed at {n}. then they bought the top.', 'fair launch. probably.',
    'the {n} you were warned about.', 'we are so early. (we are not early.)', 'this is not financial advice, it is a {n}.',
    'cto in progress, raid the replies.', 'the chart is the art.', '{n} is inevitable.', 'ai agent that only posts {n}.',
  ];
  const KOL = ['moonbagmike', 'degenoracle', 'lilwenlambo', 'chartwizard', 'sendoor', 'apebrain_cap', 'gemhunterx', 'callsbyvex', 'solsnipe', 'cookedcaller', 'bagsecured', 'trenchlord', 'pumpwhisper', 'notfinadvice', 'alpha_auntie', 'rugradar', 'x100or0', 'bondingbenny'];
  const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  BH.Names = {
    token(r) {
      let name;
      const roll = r();
      if (roll < 0.55) name = r.pick(ADJ) + ' ' + r.pick(NOUN);
      else if (roll < 0.75) name = r.pick(NOUN) + r.pick(SUFFIX);
      else if (roll < 0.9) name = r.pick(SOLO);
      else name = r.pick(NOUN) + ' Wif ' + r.pick(['Hat', 'Bag', 'Chain', 'Cape', 'Gun', 'Crown', 'Knife', 'Laptop']);
      name = name.trim();
      return { name, ticker: BH.Names.ticker(name, r), desc: r.pick(BLURB).replace('{n}', name.toLowerCase()) };
    },
    ticker(name, r) {
      const words = name.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean);
      let t;
      const roll = r();
      if (words.length > 1 && roll < 0.45) t = words.map((w) => w[0]).join('') + words[words.length - 1].slice(1, 3);
      else if (roll < 0.8) t = words[words.length - 1];
      else t = words.join('');
      t = t.toUpperCase().slice(0, r.int(3, 7));
      if (t.length < 3) t = (t + 'XX').slice(0, 3);
      return t;
    },
    addr(r, len = 44, suffix = '') {
      let s = '';
      for (let i = 0; i < len - suffix.length; i++) s += B58[Math.floor(r() * B58.length)];
      return s + suffix;
    },
    kol(r) { return r.pick(KOL); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
