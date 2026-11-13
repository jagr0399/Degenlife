/* Rival traders (the rival / league-table loop from sports and management sims).
   Four named NPC degens race you every game week on profit. They trade on their own (a steady drift plus big swings),
   post their wins and losses on Chirp, talk trash when they're ahead, and call coins that are live in your market.
   At the end of each week (every 7 game days) the table pays out: 1st $1,000 + followers, 2nd $400, 3rd $150.
   Your weekly profit = how much your net worth (cash + SOL + bags, in $) changed since the week started.
   Hooks: step. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const RIVALS = [
    { id: 'chad', name: 'Chad Capital', handle: '@chadcapital', pfp: 9, skill: 0.6, vol: 1.3, style: 'loud', lines: { ahead: ['imagine not being up this week', 'another green week. who is second?', '@you nice try'], behind: ['market is rigged', 'down this week but i am still better than you', 'taking a break (not)'], win: ['just {x} on ${t}. easy', '${t} printed. thank me later'], loss: ['${t} rugged me. whatever', 'down bad on ${t} lol'] } },
    { id: 'nina', name: 'Nina Nodes', handle: '@ninanodes', pfp: 58, skill: 0.85, vol: 0.8, style: 'calm', lines: { ahead: ['slow and steady', 'risk management is a superpower'], behind: ['tough week, sticking to the plan'], win: ['small win on ${t}. {x}', 'took profit on ${t}'], loss: ['cut ${t} at -20%. next'] } },
    { id: 'gambler', name: 'Gambler Gus', handle: '@gamblergus', pfp: 103, skill: 0.35, vol: 2.2, style: 'degen', lines: { ahead: ['ALL IN AND IT WORKED', 'i am a genius (for now)'], behind: ['liquidated again', 'one more trade and i am back'], win: ['${t} {x}!!!!! LETS GOOO', 'MAX LEVERAGE ON ${t} PAID'], loss: ['${t} took everything', 'rent money gone on ${t}'] } },
    { id: 'quant', name: 'Quant Quinn', handle: '@quantquinn', pfp: 131, skill: 0.75, vol: 1.0, style: 'nerd', lines: { ahead: ['my bot is up {p}% this week', 'statistically you should give up'], behind: ['variance', 'backtest said otherwise'], win: ['bot caught ${t} for {x}', 'model flagged ${t}. {x}'], loss: ['bot bought ${t} at the top. fixing it', 'slippage on ${t} ate me'] } },
  ];
  function Rivals(game, saved) {
    this.game = game; this.week = null; this.start = 0; this.pnl = {}; this.hist = []; this.acc = 0; this.nextPost = 0;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Rivals.prototype;
  Rivals.RIVALS = RIVALS;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  P.weekOf = function (day) { return Math.floor((day - 1) / 7) + 1; };
  P.net = function () { const w = this.game.sys.world; return w && w.netUsd ? w.netUsd() : (this.game.bills ? this.game.bills.cash : 0) + this.game.player.sol * (BH.C.SOL_USD || 80); };
  // the table: you and the rivals, best first
  P.table = function () {
    const you = { id: 'you', name: 'You', handle: '@you', pfp: (this.game.meta && this.game.meta.pfp != null ? this.game.meta.pfp : 47), pnl: Math.round(this.net() - this.start), you: true };
    return RIVALS.map((r) => ({ id: r.id, name: r.name, handle: r.handle, pfp: r.pfp, pnl: Math.round(this.pnl[r.id] || 0) })).concat([you]).sort((a, b) => b.pnl - a.pnl);
  };
  P.rank = function () { return this.table().findIndex((x) => x.you) + 1; };
  P.newWeek = function (wk) {
    const gm = this.game;
    if (this.week != null) {
      // pay out last week's table
      const t = this.table(), place = t.findIndex((x) => x.you) + 1, prize = [1000, 400, 150][place - 1] || 0;
      this.hist.push({ week: this.week, place, pnl: t.find((x) => x.you).pnl, winner: t[0].name });
      if (this.hist.length > 20) this.hist.shift();
      if (prize) { gm.bills.earn(prize, 'Rivals: week ' + this.week + ' place ' + place); const tr = gm.sys.trencher; if (tr && place === 1) tr.followers += 300; }
      gm.emit('toast', { kind: place === 1 ? 'buy' : 'info', text: 'Week ' + this.week + ' is over: you finished #' + place + ' of 5' + (prize ? ' and won $' + prize : '') + '. ' + t[0].name + ' ' + (place === 1 ? 'is furious.' : 'won the week.') });
      if (gm.sys.world) gm.sys.world.headline('Weekly trader race: ' + t[0].name + ' finishes first');
    }
    this.week = wk; this.start = this.net(); this.pnl = {};
    for (const r of RIVALS) this.pnl[r.id] = 0;
  };
  P.say = function (r, text, extra) {
    const s = this.game.sys.social; if (!s || !s.post) return;
    s.post({ id: 'rival:' + r.id, name: r.name, handle: r.handle, pfp: r.pfp, followers: 20000 + r.pfp * 600, verified: true }, 'rival', text, extra || {});
  };
  P.onStep = function (dt) {
    const gm = this.game; if (!gm.sim || !gm.clock) return;
    const wk = this.weekOf(gm.clock.day); if (this.week !== wk) this.newWeek(wk);
    this.acc += dt; if (this.acc < 30) return;   // rivals update every 30 game seconds
    const step = this.acc; this.acc = 0;
    const sim = gm.sim, rr = sim.r, scale = 1 + Math.max(0, this.net()) / 20000;   // they keep pace with you as you grow
    for (const r of RIVALS) {
      // a drift that depends on skill, with swings that depend on how degen they are
      this.pnl[r.id] += ((r.skill - 0.5) * 8 + rr.normal() * 25 * r.vol) * scale * step / 30;
      // now and then a big trade on a coin that's live right now
      if (rr() < 0.012 * r.vol * step / 30) {
        const live = sim.tokens.filter((t) => !t.dead && t.dir); const tk = live.length ? live[Math.floor(rr() * live.length)] : null;
        const win = rr() < 0.35 + r.skill * 0.35, x = win ? 1.5 + rr() * 6 * r.vol : 0.2 + rr() * 0.5, usd = (80 + rr() * 600 * r.vol) * scale;
        this.pnl[r.id] += win ? usd * (x - 1) : -usd * (1 - x);
        if (tk && rr() < 0.7) {
          const lines = win ? r.lines.win : r.lines.loss;
          this.say(r, lines[Math.floor(rr() * lines.length)].replace('{x}', x.toFixed(1) + 'x').replace('{t}', tk.ticker).replace('${t}', '$' + tk.ticker), { coin: tk.id });
          if (win) tk.hype = (tk.hype || 0) + 0.3;   // their followers pile in
        }
      }
    }
    // trash talk / mood posts every ~4 game minutes
    if (sim.t >= this.nextPost) {
      this.nextPost = sim.t + 200 + rr() * 200;
      const t = this.table(), r = RIVALS[Math.floor(rr() * RIVALS.length)], me = t.findIndex((x) => x.id === r.id), you = t.findIndex((x) => x.you);
      const lines = me < you ? r.lines.ahead : r.lines.behind;
      this.say(r, lines[Math.floor(rr() * lines.length)].replace('{p}', String(Math.max(1, Math.round((this.pnl[r.id] || 0) / 100)))));
    }
  };
  BH.Rivals = Rivals;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'rivals', create(game, saved) { const r = new Rivals(game, saved); r.hooks = { step: (dt) => r.onStep(dt) }; return r; } });
})(typeof window !== 'undefined' ? window : globalThis);
