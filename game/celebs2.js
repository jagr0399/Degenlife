/* Celebrity tweets with real teeth, and more parody accounts (all made up; names are parodies).
   - A shill or an "inverse" tweet doesn't fade in 90 s any more: the move follows through in 3 waves of FOMO (or panic) over a
     minute, the coin goes into a frenzy, and the push fades over ~10 minutes. The crowd (viewers) piles in.
   - A tweet about a theme (dogs, AI, frogs...) pumps the live coins of that narrative, not just the heat bar.
   Wraps BH.Celebs (game/celebs.js); load right after it. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.Celebs; if (!C) return;
  const MORE = [
    { name: 'Murad Memes', handle: '@muradmemes', followers: 720000, pfp: 12, gold: false, power: 0.7, tweets: [
      ['memecoins are the new religion. the cult is the product', 'Cult Coin', 'absurd'], ['{coin} has the strongest community on solana. not even close', null, 'absurd', 'shill'],
      ['you are not early. you are exit liquidity. unless', null, 'absurd'], ['the supercycle is only getting started', 'Supercycle', 'absurd'] ] },
    { name: 'Kanye Best', handle: '@kanyebest', followers: 32000000, pfp: 33, gold: true, power: 0.9, tweets: [
      ['I AM THE MEME', 'Ye Coin', 'music'], ['NEW ALBUM NEVER. NEW COIN SOON', 'Ye Season', 'music', 'own-rug'], ['my horse has better taste than the SEC', 'Horse Ye', 'absurd'] ] },
    { name: 'Iggy Azaleaa', handle: '@iggyazaleaa', followers: 7600000, pfp: 54, gold: true, power: 0.7, tweets: [
      ['mother is mothering on the blockchain', 'Mother', 'celeb'], ['launching my own coin today, for the fans', 'Mother Coin', 'celeb', 'own'], ['who wants a song about {coin}', null, 'music', 'shill'] ] },
    { name: 'Justin Sunburn', handle: '@justinsunburn', followers: 3400000, pfp: 71, gold: true, power: 0.8, tweets: [
      ['just bought a banana for 6 million dollars. ate it', 'Banana Art', 'food'], ['{coin} to the moon. I am buying', null, 'absurd', 'shill'], ['Tron is fast. very fast', null, 'ai'] ] },
    { name: 'Arthur Hayez', handle: '@arthurhayez', followers: 640000, pfp: 92, gold: false, power: 0.6, tweets: [
      ['the printer goes brrr. degens, assemble', 'Money Printer', 'absurd'], ['wrote 12,000 words on why {coin} is going to zero', null, 'absurd', 'inverse'], ['sold my yacht. bought frogs', 'Yacht Frog', 'frogs'] ] },
    { name: 'BitBoi', handle: '@bitboi_crypto', followers: 1450000, pfp: 18, gold: false, power: 0.55, tweets: [
      ['THIS COIN WILL 1000X (not financial advice)', 'BitBoi Coin', 'absurd', 'own-rug'], ['{coin} is my top pick for the week 🚀🚀', null, 'absurd', 'inverse'], ['my thumbnail face is a coin now', 'Shock Face', 'celeb'] ] },
    { name: 'Hailey Spit', handle: '@haileyspit', followers: 2900000, pfp: 40, gold: true, power: 0.75, tweets: [
      ['hawk tuah? more like hawk to the moon', 'Spit Coin', 'brainrot'], ['launching something for my fans 💦', 'Tuah Coin', 'brainrot', 'own-rug'], ['gm to everyone except bears', null, 'brainrot'] ] },
    { name: 'Andrew Tight', handle: '@andrewtight', followers: 9100000, pfp: 77, gold: true, power: 0.75, tweets: [
      ['escape the matrix. buy the dip. do pushups', 'Matrix', 'absurd'], ['{coin} is for top G only', null, 'absurd', 'shill'], ['my cars are faster than your coins', 'Bugatti', 'cars'] ] },
    { name: 'Cobie Wan', handle: '@cobiewan', followers: 820000, pfp: 6, gold: false, power: 0.6, tweets: [
      ['this cycle is just people trading cat pictures with each other', 'Cat Picture', 'cats'], ['honestly {coin} is kind of funny', null, 'cats', 'shill'], ['uponly', 'Up Only', 'absurd'] ] },
    { name: 'Gork', handle: '@grok_but_gork', followers: 4100000, pfp: 120, gold: true, power: 0.65, tweets: [
      ['i am the ai now', 'Gork Agent', 'ai'], ['analysis: {coin} has 0% fundamentals and 100% vibes. bullish', null, 'ai', 'shill'], ['beep boop the robots are buying penguins', 'Robo Pengu', 'pengu'] ] },
  ];
  for (const c of MORE) if (!C.CELEBS.some((x) => x.handle === c.handle)) C.CELEBS.push(c);

  const P = C.prototype;
  // a celebrity push lasts: it fades over ~10 minutes instead of 90 seconds, and a big one starts a frenzy
  const origNudge = P.nudge;
  P.nudge = function (tk, mult) {
    origNudge.call(this, tk, mult);
    if (!tk || tk.dead || !tk.dir) return;
    const sim = this.game.sim;
    tk.dir.offHalf = mult > 1 ? 600 : 420;
    if ((mult > 1.15 || mult < 0.85) && sim) tk.dir.fzUntil = Math.max(tk.dir.fzUntil || 0, sim.t + 40 + this._r() * 60);
    tk.hype = Math.min(4, (tk.hype || 0) + (mult > 1 ? 1.2 : 0.4));
    if (this._capture) this._capture.push([tk, mult]);
  };
  // shills and inverse calls follow through in waves (FOMO buyers, or panic sellers) over the next minute
  const origSpecial = P.special;
  P.special = function (c, tw) {
    this._capture = [];
    const out = origSpecial.call(this, c, tw);
    const caught = this._capture; this._capture = null;
    const sim = this.game.sim, r = this._r;
    this._waves = this._waves || [];
    for (const [tk, mult] of caught) for (const dt of [12, 30, 60]) this._waves.push({ at: sim.t + dt + r() * 6, id: tk.id, mult: mult > 1 ? 1.1 + r() * 0.15 * (0.6 + c.power) : 0.86 + r() * 0.06 });
    return out;
  };
  // a tweet about a theme pumps the live coins of that narrative (the tweeted coins launch on top of that)
  const origTweet = P.tweet;
  P.tweet = function (c, tw) {
    tw = tw || c.tweets[Math.floor(this._r() * c.tweets.length)];
    const out = origTweet.call(this, c, tw);
    try {
      const nar = tw && tw[2], special = tw && (tw[3] || /^stock:/.test(tw[1] || ''));
      if (out && !special && nar) {
        const sim = this.game.sim, r = this._r;
        const live = sim.tokens.filter((t) => !t.dead && !t.rugged && t.narrative === nar && t.dir && !t.dir.done).sort((a, b) => sim.mc(b) - sim.mc(a)).slice(0, 4);
        for (const tk of live) this.nudge(tk, 1.12 + r() * 0.3 * c.power);
        if (live.length) this.game.emit('toast', { kind: 'call', text: live.length + ' ' + (this.game.sys.social ? this.game.sys.social.label(nar) : nar) + ' coin' + (live.length > 1 ? 's are' : ' is') + ' pumping on the ' + c.name + ' tweet' });
      }
    } catch (e) { /* the tweet itself already happened */ }
    return out;
  };
  const origStep = P.onStep;
  P.onStep = function () {
    origStep.call(this);
    if (!this._waves || !this._waves.length) return;
    const sim = this.game.sim, due = this._waves.filter((w) => w.at <= sim.t);
    if (!due.length) return;
    this._waves = this._waves.filter((w) => w.at > sim.t);
    for (const w of due) { const tk = sim.byId.get(w.id); if (tk && !tk.dead) origNudge.call(this, tk, w.mult), tk.dir && (tk.dir.offHalf = w.mult > 1 ? 600 : 420); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
