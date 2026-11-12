/* Phase 3, Clout: your Chirp timeline (replies you answer), named copy traders, a weekly calls leaderboard,
   a paid alpha group, call-outs when you dump on people, brand deals, Spaces (live hype streams) and a rival crew.
   Ideas 1-7 and 9. Builds on game/trencher.js. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;
  const NAMES = ['ape_andy', 'mooncat99', 'bagwatcher', 'solsister', 'chartgoblin', 'notadev', 'gm_greg', 'wenlambo_', 'jeetjim', 'frogmom', 'tinyfish', 'lurker_lou', 'diamondpaw', 'pumpkinpie', 'ser_sam', 'rugsurvivor'];
  const FAN = ['called it, legend', 'printed thanks to you', 'how do you find these so early', 'ser you are the alpha', 'bought on your call, up 3x'];
  const HATER = ['you dumped on us', 'paid shill', 'another one of your rugs?', 'down 80% on your call, thanks', 'unfollowed'];
  const QUESTION = ['entry?', 'still early?', 'is the dev doxxed?', 'what is your exit?', 'why this one?'];
  const BRANDS = [['NeonVPN', 400, 0.05], ['ChartPro Max', 600, 0.1], ['CasinoMoon', 1500, 0.45], ['GigaEnergy drinks', 300, 0], ['YieldFarm 9000', 2200, 0.6], ['RugSafe Wallet', 800, 0.25], ['Degen Merch Co', 350, 0.05], ['AirdropHunter app', 900, 0.4]];

  function Clout(game, saved) {
    this.game = game;
    this.posts = []; this.copiers = []; this.closedSeen = 0; this.week = 0; this.board = []; this.verified = false; this.reachMul = 1;
    this.alpha = { on: false, price: 25, subs: 0, earned: 0, paidDay: 0 }; this.frontruns = 0; this.exposed = 0;
    this.deals = []; this.nextDealDay = 2; this.spaces = []; this.rival = { name: 'Rush Gang', strength: 20, feuds: 0, wins: 0, stolen: 0 };
    this.seq = 0; this.watch = [];
    if (saved) Object.assign(this, saved, { game });
    else this.closedSeen = game.player.closed.length;
  }
  const P = Clout.prototype;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; o.posts = this.posts.slice(0, 40); return o; };
  const R = (s) => s.game.sim.r;
  const tr = (s) => s.game.sys.trencher;
  const say = (s, acc, kind, text, extra) => { const so = s.game.sys.social; return so ? so.post(acc, kind, text, Object.assign({ aboutYou: true }, extra || {})) : null; };
  const inject = (s, scene) => { const st = s.game.sys.story; return st ? st.inject(scene) : false; };

  // ---- 1. your timeline: every call becomes a post that gathers likes and replies ----
  P.onCall = function (coinId, res) {
    if (!res || !res.ok) return;
    const sim = this.game.sim, tk = sim.byId.get(coinId), t = tr(this);
    this.posts.unshift({ id: 'mp' + (++this.seq), t: sim.t, day: this.game.clock.day, coin: coinId, ticker: tk ? tk.ticker : '?', mcAt: tk ? sim.mc(tk) : 0, likes: 0, reposts: 0, replies: [], text: '$' + (tk ? tk.ticker : '?') + ' looking good here' });
    if (this.posts.length > 40) this.posts.length = 40;
    // 4. front-running your own group: you bought it in the minute before calling
    const p = this.game.player, pos = p.pos.get(coinId);
    if (pos && sim.t - (pos.first || 0) < 90) this.watch.push({ coin: coinId, t: sim.t, alpha: this.alpha.on });
    // 9. the rival crew front-runs your calls when they're strong enough
    if (tk && !tk.dead && R(this)() < this.rival.strength / 140) {
      const addr = 'RUSH-' + (this.seq % 4);
      const f = sim.exec(tk, addr, 'whale', 'buy', 1 + this.rival.strength / 25);
      if (f) { this.rival.dumps = (this.rival.dumps || []); this.rival.dumps.push({ coin: coinId, addr, at: sim.t + R(this).range(20, 70) }); this.rival.frontran = (this.rival.frontran || 0) + 1; }
    }
    if (t && this.reachMul > 1 && tk) tk.hype += 0.1 * (this.reachMul - 1) * t.reach();
  };
  P.reply = function (postId, replyId, how) {
    const p = this.posts.find((x) => x.id === postId), rp = p && p.replies.find((x) => x.id === replyId), t = tr(this);
    if (!rp || rp.answered) return { ok: false, reason: 'Already handled' };
    rp.answered = how;
    const fx = { thank: rp.kind === 'fan' ? [2, 0.004] : [0, 0], explain: rp.kind === 'question' ? [3, 0.006] : rp.kind === 'hater' ? [2, 0] : [1, 0], clap: rp.kind === 'hater' ? [-3, 0.01] : [-2, 0], block: [-1, -0.002] }[how] || [0, 0];
    if (t) { t.bump('trust', fx[0]); t.bump('followers', fx[1]); }
    return { ok: true, text: { thank: 'You thanked them.', explain: 'You explained your thinking.', clap: 'You clapped back. The ratio war begins.', block: 'Blocked.' }[how] + (fx[0] ? ' Trust ' + (fx[0] > 0 ? '+' : '') + fx[0] + '.' : '') };
  };
  P.growPosts = function () {
    const sim = this.game.sim, t = tr(this), rr = R(this); if (!t) return;
    for (const p of this.posts) {
      const age = sim.t - p.t; if (age > 900) continue;
      const tk = sim.byId.get(p.coin), mult = tk ? sim.mc(tk) / Math.max(1, p.mcAt) : 0.2;
      p.likes += Math.round(t.followers * 0.0008 * rr() * (0.5 + t.trust / 100));
      p.reposts += rr() < 0.3 ? Math.round(t.followers * 0.0002 * rr()) : 0;
      if (rr() < 0.08 && p.replies.length < 8) {
        const kind = mult >= 1.5 ? (rr() < 0.75 ? 'fan' : 'question') : mult < 0.6 ? (rr() < 0.7 ? 'hater' : 'question') : ['fan', 'question', 'hater'][rr.int(0, 2)];
        p.replies.push({ id: 'rp' + (++this.seq), who: NAMES[rr.int(0, NAMES.length - 1)], kind, text: (kind === 'fan' ? FAN : kind === 'hater' ? HATER : QUESTION)[rr.int(0, 4)], answered: null });
      }
    }
  };

  // ---- 2. copy traders with names and their own PnL ----
  P.syncCopiers = function () {
    const t = tr(this), rr = R(this); if (!t) return;
    const want = Math.min(30, Math.round(t.copiers / 10));
    while (this.copiers.length < want) this.copiers.push({ name: NAMES[rr.int(0, NAMES.length - 1)] + '_' + rr.int(10, 99), size: +(rr.range(0.2, 4)).toFixed(2), pnl: 0, trades: 0, since: this.game.clock.day });
    const p = this.game.player;
    const fresh = Math.max(0, Math.min(20, p.closed.length - this.closedSeen));   // closed trades are newest-first
    this.closedSeen = p.closed.length;
    for (let i = 0; i < fresh; i++) {
      const c = p.closed[i];
      const pct = c.invested > 0 ? c.pnl / c.invested : 0;
      for (const cp of this.copiers) { cp.pnl += cp.size * pct * 0.9; cp.trades++; }
    }
    const quitters = this.copiers.filter((c) => c.pnl < -c.size * 0.8 && c.trades >= 3);
    if (quitters.length) {
      this.copiers = this.copiers.filter((c) => !quitters.includes(c));
      const q = quitters[0];
      say(this, { name: q.name, handle: q.name, pfp: 20 + (q.name.length % 40), followers: 300 }, 'fud', 'stopped copying ' + (t.handle || '@you') + '. down ' + Math.abs(q.pnl).toFixed(2) + ' SOL following their trades. do better');
      t.bump('trust', -2 * quitters.length);
    }
  };

  // ---- 3. weekly leaderboard vs the KOLs ----
  P.leaderboard = function () {
    const s = this.game.sys.social, t = tr(this);
    const rows = (s ? s.kols : []).map((k) => ({ name: k.name, handle: k.handle, calls: k.calls || 0, hits: k.hits || 0, followers: k.followers, you: false }));
    if (t) rows.push({ name: 'You', handle: t.handle, calls: t.hits + t.misses, hits: t.hits, followers: Math.round(t.followers), you: true });
    for (const r of rows) r.score = Math.round((r.calls ? r.hits / r.calls : 0) * 100 * Math.log10(10 + r.calls) + Math.log10(Math.max(10, r.followers)) * 4);
    return rows.sort((a, b) => b.score - a.score);
  };
  P.weekly = function () {
    const wk = Math.floor((this.game.clock.day - 1) / 7);
    if (wk === this.week) return;
    this.week = wk;
    const rows = this.leaderboard(), rank = rows.findIndex((r) => r.you) + 1;
    this.board.unshift({ week: wk, rank });
    if (rank && rank <= 3) { this.verified = true; this.reachMul = 1.5; this.game.emit('toast', { kind: 'info', text: 'Weekly leaderboard: you ranked #' + rank + '. Verified badge and more reach.' }); }
    else if (rank) { this.reachMul = Math.max(1, this.reachMul - 0.1); this.game.emit('toast', { kind: 'info', text: 'Weekly leaderboard: you ranked #' + rank + ' of ' + rows.length + '.' }); }
  };

  // ---- 4. alpha group ----
  P.alphaOpen = function () {
    const t = tr(this); if (!t || t.followers < 2000) return { ok: false, reason: 'You need 2,000 followers' };
    this.alpha.on = true; return { ok: true, text: 'Your alpha group is open at $' + this.alpha.price + '/week.' };
  };
  P.alphaPrice = function (p) { p = Math.max(5, Math.min(500, Math.round(+p || 25))); this.alpha.price = p; return { ok: true, text: 'Price set to $' + p + '/week.' }; };
  P.alphaClose = function () { this.alpha.on = false; this.alpha.subs = 0; return { ok: true, text: 'Alpha group closed.' }; };
  P.alphaTick = function () {
    const t = tr(this); if (!this.alpha.on || !t) return;
    const target = Math.floor(t.followers * 0.012 * (t.trust / 70) * Math.pow(25 / this.alpha.price, 0.7));
    this.alpha.subs += Math.sign(target - this.alpha.subs) * Math.ceil(Math.abs(target - this.alpha.subs) * 0.3);
    if (this.alpha.paidDay !== this.game.clock.day) { this.alpha.paidDay = this.game.clock.day; const pay = Math.round(this.alpha.subs * this.alpha.price / 7); if (pay > 0) { this.game.bills.earn(pay, 'Alpha group'); this.alpha.earned += pay; } }
  };

  // ---- 5. call-outs: you sold your call into your followers ----
  P.checkWatch = function () {
    const sim = this.game.sim, p = this.game.player, rr = R(this);
    for (let i = this.watch.length - 1; i >= 0; i--) {
      const w = this.watch[i];
      const pos = p.pos.get(w.coin);
      if (!pos || pos.tokens < 1) {
        this.watch.splice(i, 1);
        if (sim.t - w.t < 300) {
          this.frontruns++;
          if (rr() < (w.alpha ? 0.55 : 0.35)) this.callOut(w.coin);
        }
      } else if (sim.t - w.t > 900) this.watch.splice(i, 1);
    }
  };
  P.callOut = function (coinId) {
    const tk = this.game.sim.byId.get(coinId), tick = tk ? tk.ticker : 'a coin';
    this.exposed++;
    say(this, { name: 'chain sleuth', handle: 'chainsleuth', pfp: 9, followers: 210000, verified: true }, 'callout', 'Thread: a mid-size caller bought $' + tick + ' 60s before "calling" it and sold into their own followers within minutes. Wallets below.');
    if (this.game.sys.biz) this.game.sys.biz.addHeat(10, 'Exposed for front-running');
    inject(this, { id: 'callout' + this.exposed, who: 'sleuth', lines: ['A sleuth just posted a thread: you bought $' + tick + ' right before calling it and sold into your followers.', 'Your replies are on fire. Everyone is waiting for your answer.'],
      choices: [['Deny everything', { path: { villain: 1 }, trust: -8 }, 'The sleuth posts the transactions. It gets worse.'], ['Apologize and refund some', { path: { builder: 2 }, trust: 4, do: 'clout.refund' }, 'Some people respect it. Most just take the refund.'], ['Go quiet for a while', { do: 'biz.goQuiet' }, 'The timeline moves on. Slowly.']] });
  };
  P.refund = function () { const amt = Math.min(this.game.player.sol, 1); this.game.player.sol -= amt; return { ok: true, text: 'Refunded ' + amt.toFixed(2) + ' SOL.' }; };

  // ---- 6. brand deals ----
  P.dealTick = function () {
    const t = tr(this), rr = R(this), day = this.game.clock.day;
    if (!t || t.followers < 500 || day < this.nextDealDay) return;
    this.nextDealDay = day + rr.int(1, 3);
    const b = BRANDS[rr.int(0, BRANDS.length - 1)];
    const pay = Math.round(b[1] * (0.6 + t.reach() * 0.25) * (this.verified ? 1.5 : 1));
    this.deals.unshift({ id: 'dl' + (++this.seq), brand: b[0], pay, scam: b[2], day });
    if (this.deals.length > 6) this.deals.length = 6;
  };
  P.takeDeal = function (id) {
    const d = this.deals.find((x) => x.id === id); if (!d) return { ok: false, reason: 'Offer expired' };
    this.deals = this.deals.filter((x) => x !== d);
    this.game.bills.earn(d.pay, d.brand);
    const t = tr(this), bad = R(this)() < d.scam;
    if (bad) { if (t) t.bump('trust', -12); if (this.game.sys.biz) this.game.sys.biz.addHeat(6, 'Shilled ' + d.brand); return { ok: true, text: 'Paid $' + d.pay + '. Then ' + d.brand + ' turned out to be a scam and your followers lost money. Trust −12.' }; }
    if (t) t.bump('followers', 0.01);
    return { ok: true, text: 'Paid $' + d.pay + ' for one post about ' + d.brand + '.' };
  };
  P.dropDeal = function (id) { this.deals = this.deals.filter((x) => x.id !== id); return { ok: true, text: 'Declined.' }; };

  // ---- 7. Spaces: a live stream about one coin; viewers buy during it ----
  P.host = function () {
    const t = tr(this), sim = this.game.sim, p = this.game.player; if (!t) return { ok: false, reason: 'No Trencher account' };
    if (t.followers < 300) return { ok: false, reason: 'You need 300 followers to host' };
    const held = Array.from(p.pos.values()).map((x) => sim.byId.get(x.id)).filter((x) => x && !x.dead).sort((a, b) => (b.isPlayer ? 1 : 0) - (a.isPlayer ? 1 : 0));
    const tk = held[0]; if (!tk) return { ok: false, reason: 'Hold a live coin to talk about' };
    const viewers = Math.round(t.followers * 0.03 * (0.4 + t.trust / 100) * (this.game.sys.build && this.game.sys.build.count && this.game.sys.build.count('streamkit') ? 1.6 : 1));
    const buys = Math.min(25, Math.round(viewers / 40)), rr = R(this);
    for (let i = 0; i < buys; i++) sim.exec(tk, BH.Names.addr(rr), 'retail', 'buy', rr.logn(0.2, 0.8));
    tk.hype += 0.4 + t.reach() * 0.2;
    this.spaces.unshift({ day: this.game.clock.day, coin: tk.id, ticker: tk.ticker, viewers, buys, mcAt: sim.mc(tk), t: sim.t, judged: false });
    if (this.spaces.length > 12) this.spaces.length = 12;
    this.game.clock.advanceHours(2);
    say(this, t.acc(), 'flex', 'LIVE on Spaces talking $' + tk.ticker + ' with ' + viewers + ' degens', { coin: tk.id });
    return { ok: true, text: viewers + ' people tuned in; ' + buys + ' aped during the stream.' };
  };
  P.judgeSpaces = function () {
    const sim = this.game.sim, t = tr(this);
    for (const s of this.spaces) { if (s.judged || sim.t - s.t < 300) continue; s.judged = true; const tk = sim.byId.get(s.coin); const ok = tk && !tk.rugged && tk.athMc > s.mcAt * 1.3; if (t) t.bump('trust', ok ? 3 : -4); s.result = ok ? 'pumped' : 'dumped'; }
  };

  // ---- 9. rival crew ----
  P.rivalTick = function () {
    const sim = this.game.sim, rv = this.rival;
    for (let i = (rv.dumps || []).length - 1; i >= 0; i--) { const d = rv.dumps[i]; if (sim.t < d.at) continue; rv.dumps.splice(i, 1); const tk = sim.byId.get(d.coin), h = tk && tk.holders.get(d.addr); if (tk && h && h.tokens > 0) sim.exec(tk, d.addr, 'whale', 'sell', h.tokens); }
  };
  P.rivalDaily = function () {
    const t = tr(this), rv = this.rival; if (!t) return;
    rv.strength = Math.min(100, rv.strength + 1.5);
    if (t.followers > 400 && R(this)() < 0.4) { const n = Math.round(t.followers * 0.01); t.followers -= n; rv.stolen += n; }
  };
  P.feud = function () {
    const t = tr(this), rv = this.rival; if (!t) return { ok: false };
    rv.feuds++;
    const win = R(this)() < (t.trust / 100) * 0.8 + (this.verified ? 0.15 : 0) - rv.strength / 300;
    say(this, t.acc(), 'callout', 'The ' + rv.name + ' front-runs every call they can find. Here are their wallets. Do better.');
    if (win) { rv.wins++; rv.strength = Math.max(5, rv.strength - 15); t.bump('followers', 0.05); t.bump('trust', 3); return { ok: true, text: 'The timeline is on your side. Rival strength −15, followers +5%.' }; }
    t.bump('trust', -5); if (this.game.sys.biz) this.game.sys.biz.addHeat(4, 'Public feud');
    return { ok: true, text: 'It turned into a mess and people think you are both clowns. Trust −5.' };
  };

  P.onStep = function () { this.rivalTick(); };
  P.afterTime = function () {
    const day = this.game.clock.day;
    this.growPosts(); this.syncCopiers(); this.checkWatch(); this.judgeSpaces(); this.alphaTick(); this.dealTick(); this.weekly();
    if (this.lastDaily !== day) { this.lastDaily = day; this.rivalDaily(); }
  };

  BH.Clout = Clout;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'clout', create(game, saved) { const c = new Clout(game, saved); c.hooks = { step: () => c.onStep() }; return c; } });
  if (BH.Trencher) {
    const orig = BH.Trencher.prototype.call;
    BH.Trencher.prototype.call = function (coinId, text) { const res = orig.call(this, coinId, text); if (this.game.sys.clout) this.game.sys.clout.onCall(coinId, res); return res; };
  }
})(typeof window !== 'undefined' ? window : globalThis);
