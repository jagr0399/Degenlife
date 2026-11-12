/* Stage 3: Coin Factory. Your reputation as a dev, community hype for your coins, giveaways, and the RUG button. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};

  function Factory(game, saved) {
    this.game = game;
    this.rep = 50; this.rugs = 0; this.clean = 0; this.launches = 0; this.checked = {};
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Factory.prototype;
  P.save = function () { return { rep: this.rep, rugs: this.rugs, clean: this.clean, launches: this.launches, checked: this.checked }; };
  P.bumpRep = function (d) { this.rep = Math.max(0, Math.min(100, this.rep + d)); };
  P.onLaunchMine = function (tk) {
    this.launches++;
    // reputation sets how warm your launches start, and whether dev-wallet watchers wait to dump on you
    tk.hype *= 0.55 + this.rep / 90;
    if (this.rep < 30) tk.half *= 0.7;
  };
  P.myCoins = function () { const sim = this.game.sim; return this.game.player.myCoins.map((id) => sim.byId.get(id)).filter(Boolean); };
  P.giveaway = function (coinId, sol) {
    const tk = this.game.sim.byId.get(coinId), p = this.game.player;
    if (!tk || tk.dead || !tk.isPlayer) return { ok: false, reason: 'Not your live coin' };
    if (!(sol > 0) || sol > p.sol) return { ok: false, reason: 'Not enough SOL' };
    p.sol -= sol; tk.hype += sol * 0.9; tk.half += 3;
    if (this.game.sys.social) this.game.sys.social.post({ name: 'You', handle: '@you', pfp: (this.game.meta && this.game.meta.pfp != null ? this.game.meta.pfp : 47), followers: 500 }, 'flex', 'GIVEAWAY: ' + sol + ' SOL to holders of $' + tk.ticker + '. RT + hold.', { coin: tk.id, aboutYou: true });
    return { ok: true, text: 'Giveaway posted. Hype up.' };
  };
  P.rug = function (coinId) {
    const tk = this.game.sim.byId.get(coinId), p = this.game.player;
    if (!tk || tk.dead || !tk.isPlayer) return { ok: false, reason: 'Not your live coin' };
    if (!p.pos.has(coinId)) return { ok: false, reason: 'Your dev bag is already gone' };
    const r = p.sell(coinId, 1, { priority: 0.01, slippage: 0.9 });
    if (!r.ok) return r;
    this.rugs++; this.bumpRep(-25);
    tk.half = 2; tk.hype = 0;
    if (this.game.sys.social) this.game.sys.social.onPlayerRug(tk);
    this.game.life.bump('sanity', -6);
    return { ok: true, text: 'You pulled the rug on $' + tk.ticker + '. The timeline noticed.' };
  };
  P.afterTime = function () {
    // clean launches: your coin graduated, or lived 10 minutes while you still held the dev bag
    const sim = this.game.sim, p = this.game.player;
    for (const tk of this.myCoins()) {
      if (this.checked[tk.id]) continue;
      if (tk.stage === 'amm' || (sim.t - tk.born > 600 && p.pos.has(tk.id))) { this.checked[tk.id] = 1; this.clean++; this.bumpRep(8); this.game.emit('toast', { kind: 'info', text: '$' + tk.ticker + ' counts as a clean launch. Reputation up.' }); }
    }
  };
  BH.Factory = Factory;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'factory', create(game, saved) { const f = new Factory(game, saved); f.hooks = { launchMine: (tk) => f.onLaunchMine(tk) }; return f; } });
})(typeof window !== 'undefined' ? window : globalThis);
