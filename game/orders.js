/* Stage 2: take-profit, stop-loss and limit-buy orders, triggered by market cap (shown and dragged on the chart). */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};

  function Orders(game, saved) {
    this.game = game; this.list = []; this.seq = 0;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Orders.prototype;
  P.save = function () { return { list: this.list, seq: this.seq }; };
  // kind: 'tp' (sell frac when MC >= mc), 'sl' (sell frac when MC <= mc), 'limit' (buy sol when MC <= mc)
  P.add = function (coin, kind, mc, amount) {
    if (!['tp', 'sl', 'limit', 'alert'].includes(kind) || !(mc > 0) || !(amount > 0)) return null;
    const o = { id: 'o' + (++this.seq), coin, kind, mc, amount };
    if (kind === 'alert') { const tk = this.game.sim.byId.get(coin); o.dir = tk && this.game.sim.mc(tk) > mc ? 'down' : 'up'; }
    this.list.push(o);
    return o;
  };
  P.remove = function (id) { const i = this.list.findIndex((o) => o.id === id); if (i >= 0) this.list.splice(i, 1); return i >= 0; };
  P.move = function (id, mc) { const o = this.list.find((x) => x.id === id); if (o && mc > 0) o.mc = mc; };
  P.forCoin = function (coin) { return this.list.filter((o) => o.coin === coin); };
  P.onStep = function () {
    const sim = this.game.sim, p = this.game.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const o = this.list[i], tk = sim.byId.get(o.coin);
      if (!tk || tk.dead) { this.list.splice(i, 1); continue; }
      const mc = sim.mc(tk);
      const hit = (o.kind === 'tp' && mc >= o.mc) || ((o.kind === 'sl' || o.kind === 'limit') && mc <= o.mc) || (o.kind === 'alert' && (o.dir === 'up' ? mc >= o.mc : mc <= o.mc));
      if (!hit) continue;
      if (o.kind === 'alert') { p.notify('call', 'Alert: $' + tk.ticker + ' ' + (o.dir === 'up' ? 'rose to ' : 'fell to ') + BH.fmt.usd(mc), { id: o.coin }); this.list.splice(i, 1); continue; }
      if (o.kind === 'limit') { const r = p.buy(o.coin, o.amount, { priority: 0.005 }); p.notify(r.ok ? 'info' : 'fail', r.ok ? 'Limit buy hit on $' + tk.ticker : 'Limit buy failed: ' + r.reason, { id: o.coin }); this.list.splice(i, 1); continue; }
      if (!p.pos.has(o.coin)) { this.list.splice(i, 1); continue; }
      const r = p.sell(o.coin, Math.min(1, o.amount), { priority: 0.005, slippage: 0.3 });
      p.notify(r.ok ? 'info' : 'fail', (o.kind === 'tp' ? 'Take profit' : 'Stop loss') + (r.ok ? ' hit on $' : ' failed on $') + tk.ticker, { id: o.coin });
      this.list.splice(i, 1);
    }
  };
  BH.Orders = Orders;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'orders', create(game, saved) { const o = new Orders(game, saved); o.hooks = { step: () => o.onStep() }; return o; } });
})(typeof window !== 'undefined' ? window : globalThis);
