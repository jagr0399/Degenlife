/* Wallet tracker: follow any wallet (from chart bubbles, KOLs, whales, your traders). Each tracked wallet has a name,
   an emoji and a sound you pick, so you know by ear who just bought. Trades by tracked wallets fire a 'walletTrade' event
   that the game shows as a toast (coin image, age, wallet, bought / sold all, amount at MC). */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const SOUNDS = [['coin', 'Coin'], ['buy', 'Cash'], ['chirp', 'Tick'], ['glass', 'Glass'], ['ach', 'Level up'], ['bad', 'Bong'], ['info', 'Pluck'], ['select', 'Select'], ['confirm', 'Confirm'], ['delivery', 'Chime'], ['door', 'Switch'], ['key1', 'Key click']];
  const EMOJI = ['🐋', '🦈', '🐸', '🤡', '👑', '🔥', '💎', '🐍', '🦊', '🤖', '🎯', '🍀'];

  function Tracker(game, saved) {
    this.game = game; this.wallets = []; this.feed = []; this.muted = false;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Tracker.prototype;
  Tracker.SOUNDS = SOUNDS; Tracker.EMOJI = EMOJI;
  P.save = function () { return { wallets: this.wallets, feed: this.feed.slice(-80), muted: this.muted }; };
  P.get = function (addr) { return this.wallets.find((w) => w.addr === addr) || null; };
  P.track = function (addr, opts) {
    if (!addr) return null;
    let w = this.get(addr);
    if (!w) { w = { addr, name: 'wallet ' + addr.slice(0, 4), emoji: EMOJI[this.wallets.length % EMOJI.length], sound: SOUNDS[this.wallets.length % SOUNDS.length][0], on: true }; this.wallets.push(w); }
    Object.assign(w, opts || {});
    return w;
  };
  P.untrack = function (addr) { this.wallets = this.wallets.filter((w) => w.addr !== addr); };
  P.onTrade = function (tk, tr, h) {
    const w = this.get(tr.addr); if (!w || !w.on) return;
    const soldAll = tr.side === 'sell' && (!h || h.tokens < 1);
    const ev = { t: tr.t, addr: w.addr, name: w.name, emoji: w.emoji, sound: w.sound, coin: tk.id, ticker: tk.ticker, img: tk.img, born: tk.born, side: tr.side, sol: tr.sol, mc: tr.mc, soldAll };
    this.feed.push(ev); if (this.feed.length > 200) this.feed.shift();
    const last = this.lastToast && this.lastToast[w.addr];
    this.lastToast = this.lastToast || {};
    if (!this.muted && (!last || last.side !== tr.side || soldAll || tr.t - last.t > 3)) { this.lastToast[w.addr] = { t: tr.t, side: tr.side }; this.game.emit('walletTrade', ev); }
  };
  // quick start: track the busiest KOL/whale wallets seen on live coins
  P.suggest = function (n) {
    const sim = this.game.sim, seen = new Map();
    for (const tk of sim.tokens) for (const b of tk.bubbles || []) if ((b.kind === 'kol' || b.kind === 'whale' || b.sol >= 3) && !this.get(b.addr)) { const e = seen.get(b.addr) || { addr: b.addr, name: b.name, kind: b.kind, vol: 0 }; e.vol += b.sol; seen.set(b.addr, e); }
    return [...seen.values()].sort((a, b) => b.vol - a.vol).slice(0, n || 8);
  };
  BH.Tracker = Tracker;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'tracker', create(game, saved) { const t = new Tracker(game, saved); t.hooks = { trade: (tk, tr, h) => t.onTrade(tk, tr, h) }; return t; } });
})(typeof window !== 'undefined' ? window : globalThis);
