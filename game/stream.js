/* Streaming career: go live and your trading is the show.
   Viewers show up for action (trades, big swings, frenzies, rugs) and drift away when it's boring. Donations and subs pay
   in-game cash; stream followers decide how many people show up next time. A huge win or a brutal loss gets clipped and goes
   around Chirp: followers for both, but a clip of you dumping on your own callout costs trust. Streaming is tiring.
   Hooks: step (once a second while live), trade (your trades). */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const NAMES = ['solsniper', 'bagenjoyer', 'rugpullrandy', 'ape_daddy', 'mooncat', 'liquidated_larry', 'gmgm', 'chartwizard', 'degen_dana', 'exitliq', 'pumpenjoyer', 'jeetjeff', 'diamondhandz', 'notfinancialadvice', 'wagmi_will', 'lowcaplover', 'sendit_sam', 'paperhandpete', 'whalewatcher', 'trenchrat', 'cope_king', 'flipper_fin', 'botfarm7', 'lurker99'];
  const SAY = {
    buy: ['aped', 'LETS GOOO', 'what did he just buy', 'size??', 'this is the one', 'inb4 rug', 'following', 'copy traded lol', 'chart looks cooked', 'bullish'],
    win: ['SHEEEESH', 'printed', 'GIGA CHAD', 'clip it', 'teach me', 'w', 'thats rent paid', 'he cant keep getting away with this'],
    loss: ['LMAOOO', 'rip', 'bagholder arc', 'sell??', 'pain', 'its so over', 'f in chat', 'stop trading pls'],
    rug: ['RUGGED', 'dev ran lol', 'saw that coming', 'liquidity gone', 'L', 'classic'],
    bored: ['do something', 'zzz', 'trade something bro', 'is he afk', 'boring', 'ape something', 'stream died?'],
    frenzy: ['chart is going crazy', 'look at those candles', 'bots everywhere', 'this is a casino', 'who is buying this'],
    idle: ['gm', 'what are we buying', 'first time here', 'sol pumping?', 'any calls?', 'hi chat', 'lurking', 'how much is he up today'],
  };
  function Stream(game, saved) {
    this.game = game;
    this.live = false; this.viewers = 0; this.followers = 25; this.subs = 0; this.earned = 0; this.earnedToday = 0; this.peak = 0;
    this.excite = 0; this.lastTrade = -999; this.liveSince = 0; this.minutes = 0; this.clips = []; this.chat = []; this.acc = 0; this.sessions = 0;
    if (saved) Object.assign(this, saved, { game, chat: [], live: false, viewers: 0 });
  }
  const P = Stream.prototype;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; o.chat = []; o.clips = this.clips.slice(-20); return o; };
  P.rng = function () { return this.game.sim ? this.game.sim.r : Math.random; };
  P.say = function (kind, who) {
    const r = this.rng(), list = SAY[kind] || SAY.idle;
    this.chat.push({ who: who || NAMES[Math.floor(r() * NAMES.length)], text: list[Math.floor(r() * list.length)], kind, t: this.game.sim.t });
    if (this.chat.length > 60) this.chat.splice(0, this.chat.length - 60);
  };
  P.start = function () {
    if (this.live) return { ok: false, reason: 'You are already live' };
    const life = this.game.life; if (life && life.energy < 10) return { ok: false, reason: 'Too tired to stream' };
    this.live = true; this.liveSince = this.game.sim.t; this.viewers = Math.max(1, Math.round(this.followers * 0.04)); this.earnedToday = 0; this.sessions++;
    this.say('idle'); return { ok: true, text: 'You are live. ' + this.viewers + ' viewers came in. Trade something.' };
  };
  P.stop = function () {
    if (!this.live) return { ok: false, reason: 'You are not live' };
    this.live = false;
    const mins = Math.round((this.game.sim.t - this.liveSince) / 60);
    return { ok: true, text: 'Stream ended after ' + mins + ' min. Peak ' + this.peak + ' viewers, earned $' + Math.round(this.earnedToday) + '.' };
  };
  // something happened on stream: excitement jumps (viewers follow it)
  P.hype = function (amount, kind) { this.excite = Math.min(10, this.excite + amount); if (kind) for (let i = 0; i < 1 + Math.floor(amount); i++) this.say(kind); };
  P.onTrade = function (tk, tr) {
    if (!tr.you || !this.live) return;
    const sim = this.game.sim, p = this.game.player.pos.get(tk.id);
    this.lastTrade = sim.t;
    if (tr.side === 'buy') { this.hype(0.6 + Math.min(2, tr.sol), 'buy'); return; }
    // a sell: how did it go? (the position still holds its pre-sale cost here)
    const entry = p && p.tokens > 0 ? p.cost / p.tokens : 0, px = tr.tok > 0 ? tr.sol / tr.tok : 0, x = entry > 0 ? px / entry : 1;
    if (x >= 1.3) this.hype(1.5 + Math.min(5, (x - 1) * 2), 'win'); else if (x <= 0.7) this.hype(1 + Math.min(4, (1 - x) * 4), 'loss'); else this.hype(0.5);
    if (x >= 2 || x <= 0.5) this.clip(tk, x);
  };
  // a clip: a big win or a brutal loss goes around the timeline
  P.clip = function (tk, x) {
    const gm = this.game, win = x >= 1;
    const gain = Math.round(this.viewers * (win ? 0.6 : 0.8) + 20);   // people love watching someone lose
    this.followers += gain; this.clips.push({ t: gm.sim.t, day: gm.clock ? gm.clock.day : 0, ticker: tk.ticker, x: +x.toFixed(2), gain });
    const tr = gm.sys.trencher; if (tr) tr.bump('followers', Math.min(0.08, gain / 4000));
    const soc = gm.sys.social;
    const text = win ? 'this guy just ' + x.toFixed(1) + 'x\'d $' + tk.ticker + ' live on stream 😭' : 'watched this man lose ' + Math.round((1 - x) * 100) + '% on $' + tk.ticker + ' live. legendary';
    if (soc && soc.kols && soc.post) { try { soc.post(soc.kols[Math.floor(this.rng()() * soc.kols.length)], 'news', text, { coin: tk.id }); } catch (e) { /* timeline optional */ } }
    gm.emit('toast', { kind: win ? 'buy' : 'sell', text: 'Clipped! ' + (win ? 'Your ' + x.toFixed(1) + 'x' : 'Your −' + Math.round((1 - x) * 100) + '%') + ' on $' + tk.ticker + ' is going around. +' + gain + ' stream followers' });
  };
  P.onStep = function (dt) {
    if (!this.live) return;
    this.acc += dt; if (this.acc < 1) return;
    const s = this.acc; this.acc = 0;
    const gm = this.game, sim = gm.sim, r = sim.r;
    // excitement fades; long stretches with no trades bore people
    this.excite *= Math.pow(0.5, s / 25);
    const idle = sim.t - this.lastTrade;
    // watching a frenzy is a show too
    const ui = BH.UI, tk = ui && ui.tokenId && sim.byId.get(ui.tokenId);
    if (tk && tk.dir && tk.dir.fzUntil > sim.t && r() < 0.08 * s) this.hype(0.4, 'frenzy');
    if (tk && tk.rugged && !tk._streamRug) { tk._streamRug = true; this.hype(3, 'rug'); }
    // the crowd you'd have: your stream following, multiplied by how exciting it is right now
    const base = 3 + this.followers * 0.05;
    const target = base * (0.4 + this.excite * 0.45) * (idle > 90 ? 0.6 : 1);
    this.viewers = Math.max(0, Math.round(this.viewers + (target - this.viewers) * Math.min(1, 0.08 * s) + r.normal() * Math.sqrt(this.viewers + 1) * 0.4));
    this.peak = Math.max(this.peak, this.viewers);
    // money: donations and subs scale with viewers and how hyped they are
    if (r() < this.viewers * 0.0012 * (0.5 + this.excite * 0.3) * s) {
      const big = r() < 0.08, usd = big ? Math.round(r.range(50, 250)) : Math.round(r.range(1, 20));
      gm.bills.earn(usd, 'Stream donation'); this.earned += usd; this.earnedToday += usd;
      const who = NAMES[Math.floor(r() * NAMES.length)];
      this.chat.push({ who, text: 'donated $' + usd + (big ? ' 🔥 "' + (SAY.win[Math.floor(r() * SAY.win.length)]) + '"' : ''), kind: 'tip', t: sim.t });
      if (big) gm.emit('toast', { kind: 'buy', text: who + ' donated $' + usd + ' on stream' });
    }
    if (r() < this.viewers * 0.0003 * s) { this.subs++; gm.bills.earn(5, 'Stream sub'); this.earned += 5; this.earnedToday += 5; this.chat.push({ who: NAMES[Math.floor(r() * NAMES.length)], text: 'subscribed!', kind: 'sub', t: sim.t }); }
    // followers grow while people watch (more when it's exciting)
    this.followers += this.viewers * 0.0015 * (0.5 + this.excite * 0.2) * s;
    // chat chatter
    if (r() < Math.min(0.9, 0.05 + this.viewers * 0.01) * s) this.say(idle > 60 ? 'bored' : 'idle');
    // it's work: energy drains, and losses on stream sting
    if (gm.life) gm.life.bump('energy', -0.02 * s);
    this.minutes = (this.minutes || 0) + s / 60;
    if (gm.life && gm.life.energy < 5) { const out = this.stop(); gm.emit('toast', { kind: 'info', text: 'Too tired to keep streaming. ' + out.text }); }
  };
  BH.Stream = Stream;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'stream', create(game, saved) { const s = new Stream(game, saved); s.hooks = { step: (dt) => s.onStep(dt), trade: (tk, tr) => s.onTrade(tk, tr) }; return s; } });
})(typeof window !== 'undefined' ? window : globalThis);
