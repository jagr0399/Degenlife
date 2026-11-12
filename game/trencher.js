/* Trencher career: your own Chirp account. Call coins, grow followers and trust, unlock copy traders who mirror your buys
   and sells (you earn 10% of their profits), and get paid shill offers. Dumping on your followers costs trust fast. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const COPY_AT = 1000;

  function Trencher(game, saved) {
    this.game = game;
    this.followers = 120; this.trust = 50; this.calls = []; this.hits = 0; this.misses = 0; this.dumps = 0;
    this.copyQueue = []; this.copyEarned = 0; this.copiers = 0; this.offers = []; this.nextOffer = 0; this.handle = '@you';
    this.paused = false;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Trencher.prototype;
  Trencher.COPY_AT = COPY_AT;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; o.calls = this.calls.slice(-60).map((c) => (c.done && c.ws ? Object.assign({}, c, { ws: undefined }) : c)); return o; };
  P.hitRate = function () { const n = this.hits + this.misses; return n ? this.hits / n : 0; };
  P.acc = function () { return { id: 'you', name: 'You', handle: this.handle, pfp: (this.game.meta && this.game.meta.pfp != null ? this.game.meta.pfp : 47), followers: Math.round(this.followers), verified: this.followers >= 25000 }; };
  P.bump = function (k, d) { if (k === 'trust') this.trust = Math.max(0, Math.min(100, this.trust + d)); else this.followers = Math.max(10, this.followers * (1 + d)); };
  P.reach = function () { return Math.log10(Math.max(10, this.followers)) - 1; };   // 120 followers ~1, 10K ~3, 1M ~5

  // call a coin to your followers
  P.call = function (coinId, text) {
    const sim = this.game.sim, tk = sim.byId.get(coinId);
    if (!tk || tk.dead) return { ok: false, reason: 'That coin is gone' };
    const recent = this.calls.find((c) => c.coin === coinId && sim.t - c.t < 120);
    if (recent) return { ok: false, reason: 'You already called it' };
    const mc = sim.mc(tk);
    const s = this.game.sys.social;
    const post = s ? s.post(this.acc(), 'call', text || ('$' + tk.ticker + ' looking good here'), { coin: tk.id, mcAt: mc, aboutYou: true }) : null;
    // your reach and trust move the price a little (followers ape in)
    tk.hype += 0.15 * this.reach() * (0.4 + this.trust / 100);
    this.calls.push({ coin: tk.id, ticker: tk.ticker, mcAt: mc, t: sim.t, peak: mc, done: false, held: this.game.player.pos.has(tk.id), sold: false, post: post && post.id });
    this.followers += 1 + Math.random() * 3;
    return { ok: true, text: 'Called $' + tk.ticker + ' to ' + Math.round(this.followers).toLocaleString() + ' followers' };
  };
  P.say = function (text) {
    const s = this.game.sys.social; if (!s || !text) return { ok: false, reason: 'Write something first' };
    s.post(this.acc(), 'chatter', text.slice(0, 220), { aboutYou: true });
    this.followers += Math.random() * 2;
    return { ok: true, text: 'Posted' };
  };

  // your trades: copiers mirror them a few seconds later; selling right after your own call is "dumping on followers"
  P.onTrade = function (tk, tr) {
    const sim = this.game.sim;
    if (tr.you) {
      if (tr.side === 'sell') { const hh = tk.holders.get('YOU'), left = hh ? Math.max(0, hh.tokens) : 0, frac = tr.tok / Math.max(1e-9, tr.tok + left); const p0 = this.game.player.pos.get(tk.id), avg = p0 && p0.tokens > 0 ? p0.cost / p0.tokens : 0, px = tr.sol / Math.max(1e-12, tr.tok), lossy = tk.rugged || tk.dead || (avg > 0 && px < avg * 0.5);
        if (!lossy) for (const c of this.calls) if (c.coin === tk.id && !c.done && sim.t - c.t < 300 && !c.sold) { c.soldFrac = (c.soldFrac || 0) + frac * (1 - (c.soldFrac || 0)); if (c.soldFrac >= 0.5) { c.sold = true; this.dumps++; this.bump('trust', -10); this.bump('followers', -0.08); this.game.emit('toast', { kind: 'bad', text: 'You dumped most of your bag right after your own call. Followers noticed: trust −10.' }); } else if (!c.clipNote) { c.clipNote = true; this.game.emit('toast', { kind: 'info', text: 'Took some profit on your call. Fine: you still hold most of it.' }); } } }
      if (this.copiers > 0 && !this.paused) this.copyQueue.push({ at: sim.t + 1 + sim.r() * 3, coin: tk.id, side: tr.side, sol: tr.sol, frac: tr.side === 'sell' ? this.lastSellFrac(tk) : 0 });
    }
    // who buys after your callout (shown in the instant-trade panel): unique wallets and SOL, for 10 minutes after the call
    if (!tr.you && tr.side === 'buy') for (const c of this.calls) if (c.coin === tk.id && sim.t - c.t < 600 && sim.t >= c.t) {
      c.ws = c.ws || {}; if (!c.ws[tr.addr]) { c.ws[tr.addr] = 1; c.buyers = (c.buyers || 0) + 1; if (Object.keys(c.ws).length > 400) c.ws = {}; }
      c.buySol = (c.buySol || 0) + tr.sol;
    }
    if (String(tr.addr).startsWith('COPY-') && tr.side === 'sell') {
      // you earn 10% of your copiers' profits
      const h = tk.holders.get(tr.addr);
      if (h && h.sold > h.bought) { const prof = h.sold - h.bought - (h._paid || 0); if (prof > 0) { const fee = prof * 0.1; this.game.player.sol += fee; this.copyEarned += fee; h._paid = (h._paid || 0) + prof; } }
    }
  };
  P.lastSellFrac = function (tk) { const p = this.game.player.pos.get(tk.id); return p && p.tokens > 1 ? 0.5 : 1; };

  P.onStep = function () {
    const sim = this.game.sim, r = sim.r;
    // copy traders: about 1 per 250 followers once you pass 1,000, fewer when trust is low
    this.copiers = this.followers >= COPY_AT ? Math.floor(this.followers / 250 * (0.3 + this.trust / 140)) : 0;
    for (let i = this.copyQueue.length - 1; i >= 0; i--) {
      const q = this.copyQueue[i]; if (sim.t < q.at) continue;
      this.copyQueue.splice(i, 1);
      const tk = sim.byId.get(q.coin); if (!tk || tk.dead) continue;
      const n = Math.min(12, Math.max(1, Math.round(this.copiers / 20)));   // copiers grouped into a few wallets
      for (let j = 0; j < n; j++) {
        const addr = 'COPY-' + j;
        if (q.side === 'buy') sim.exec(tk, addr, 'copy', 'buy', Math.min(20, q.sol * Math.min(3, this.copiers / 40) / n * r.range(0.6, 1.2)));
        else { const h = tk.holders.get(addr); if (h && h.tokens > 1) sim.exec(tk, addr, 'copy', 'sell', h.tokens * (q.frac >= 1 ? 1 : 0.5)); }
      }
    }
    // score calls after 2 minutes: a hit = peak at least +50% over the MC at your call
    for (const c of this.calls) {
      if (c.done) continue;
      const tk = sim.byId.get(c.coin);
      if (tk && !tk.dead) c.peak = Math.max(c.peak, sim.mc(tk));
      if (sim.t - c.t < 120 && tk && !tk.dead) continue;
      c.done = true;
      const x = c.peak / c.mcAt;
      if ((c.buyers || 0) >= 10) { this.bump('followers', Math.min(0.15, c.buyers / 600)); this.bump('trust', Math.min(3, Math.floor(c.buyers / 15))); this.game.emit('toast', { kind: 'call', text: c.buyers + ' wallets bought $' + c.ticker + ' after your call (' + (c.buySol || 0).toFixed(1) + ' SOL). Your reach grows.' }); }
      if (x >= 1.5) { this.hits++; this.bump('followers', Math.min(0.6, 0.06 + (x - 1.5) * 0.08) * (0.6 + this.trust / 120)); this.bump('trust', 4); this.game.emit('toast', { kind: 'buy', text: 'Your $' + c.ticker + ' call hit ' + x.toFixed(1) + 'x. Followers +' + Math.round(this.followers * 0.06) }); }
      else { this.misses++; this.bump('followers', -0.03); const low = tk && !tk.dead ? sim.mc(tk) / c.mcAt : 0; if (!(tk && tk.rugged) && !(tk && tk.dead) && low > 0.5) this.bump('trust', -2); }   // rugged, dead or down 50%+: you got hit too, no trust lost
    }
    // shill offers from devs once you have an audience
    if (this.followers >= 500 && sim.t >= this.nextOffer) {
      this.nextOffer = sim.t + 90 + r() * 120;
      const live = sim.tokens.filter((t) => !t.dead && t.stage === 'curve' && sim.t - t.born < 120);
      if (live.length && this.offers.length < 4) { const tk = live[r.int(0, live.length - 1)]; this.offers.push({ id: 'of' + Math.floor(sim.t), coin: tk.id, ticker: tk.ticker, pay: Math.round(Math.max(0.2, this.followers / 4000) * r.range(0.6, 1.6) * 100) / 100, until: sim.t + 90 }); }
    }
    this.offers = this.offers.filter((o) => sim.t < o.until && sim.byId.get(o.coin));
    // slow organic growth when your hit rate is good
    if (this.hits + this.misses >= 3 && r() < 0.01) this.followers *= 1 + (this.hitRate() - 0.4) * 0.01;
  };
  P.acceptOffer = function (id) {
    const o = this.offers.find((x) => x.id === id); if (!o) return { ok: false, reason: 'Offer expired' };
    this.offers = this.offers.filter((x) => x !== o);
    const r = this.call(o.coin, '$' + o.ticker + ' is the one. trust me 🚀'); if (!r.ok) return r;
    this.game.player.sol += o.pay; this.bump('trust', -3);
    const c = this.calls[this.calls.length - 1]; c.paid = true;
    return { ok: true, text: 'Paid ' + o.pay + ' SOL to shill $' + o.ticker + '. If it rugs, your followers will remember.' };
  };
  P.declineOffer = function (id) { this.offers = this.offers.filter((x) => x.id !== id); return { ok: true, text: 'Declined' }; };
  BH.Trencher = Trencher;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'trencher', create(game, saved) { const t = new Trencher(game, saved); t.hooks = { trade: (tk, tr) => t.onTrade(tk, tr), step: () => t.onStep() }; return t; } });
})(typeof window !== 'undefined' ? window : globalThis);
