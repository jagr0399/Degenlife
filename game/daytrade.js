/* Day trading (Nov 12): trade stock shares with your cash during the US session, like a day trader.
   - Prices come from the Perps markets (game/markets.js), so celebrity tweets and news move them too.
   - The session is 9:30-16:00 game time on weekdays (1 game minute = 1 real second, so a whole day is about 6.5 minutes).
     Orders only fill while the market is open. At the 16:00 bell, open positions are closed for you (can be turned off).
   - Long or short. Shorting needs half the position's value in cash as margin. $0.50 per order.
   - 5-minute candles per stock for the chart, a day P&L that resets at the open, stats, and a trade log.
   - Stock news during the session (earnings, upgrades, a CEO tweet...) moves single names and is posted to the news.
   Fake money only. Uses its own random stream. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const FEE = 0.5, CANDLE = 5;   // game minutes per candle
  const NEWS = [
    [0.06, 0.12, '{s} beats earnings, raises guidance'], [0.03, 0.07, 'Analyst upgrades {s} to Buy'], [0.04, 0.09, '{s} announces a surprise buyback'],
    [-0.12, -0.06, '{s} misses earnings and cuts guidance'], [-0.07, -0.03, 'Analyst downgrades {s}'], [-0.09, -0.04, '{s} CFO resigns unexpectedly'],
    [0.05, 0.15, '{s} short squeeze: shorts scramble to cover'], [-0.1, -0.05, 'Report: regulators open a probe into {s}'],
  ];
  function mulberry(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function DayTrade(game, saved) {
    this.game = game; this.pos = {}; this.candles = {}; this.log = []; this.day = null; this.history = []; this.flatten = true; this.rs = 31337; this.nextNews = 0; this.wasOpen = false;
    if (saved) Object.assign(this, saved, { game });
    this._r = mulberry(this.rs);
  }
  const P = DayTrade.prototype;
  DayTrade.FEE = FEE; DayTrade.CANDLE = CANDLE;
  P.save = function () { const c = {}; for (const [k, v] of Object.entries(this.candles)) c[k] = v.slice(-120); return { pos: this.pos, candles: c, log: this.log.slice(-60), day: this.day, history: this.history.slice(-30), flatten: this.flatten, rs: Math.floor(this._r() * 2147483647), nextNews: this.nextNews, wasOpen: this.wasOpen }; };
  P.symbols = function () { return BH.Perps ? BH.Perps.MARKETS.filter((m) => m.kind === 'Stock').map((m) => m.id) : []; };
  P.market = function (s) { return BH.Perps && BH.Perps.MARKETS.find((m) => m.id === s); };
  P.price = function (s) { const px = this.game.sys.perps; return px ? px.priceOf(s) : NaN; };
  P.isOpen = function () { const ck = this.game.clock; if (!ck) return false; const h = ck.hour, wd = (ck.day - 1) % 7; return wd < 5 && h >= 9.5 && h < 16; };
  P.sessionText = function () {
    const ck = this.game.clock, h = ck.hour, wd = (ck.day - 1) % 7, mins = (x) => { const m = Math.max(0, Math.round(x * 60)); return (m >= 60 ? Math.floor(m / 60) + 'h ' : '') + (m % 60) + 'm'; };
    if (this.isOpen()) return 'Market open · closes in ' + mins(16 - h);
    if (wd >= 5) return 'Weekend · opens Monday 9:30';
    return h < 9.5 ? 'Pre-market · opens in ' + mins(9.5 - h) : 'Closed · opens tomorrow 9:30';
  };
  P.cash = function () { return this.game.bills.cash; };
  P.posValue = function (s) { const p = this.pos[s]; return p ? p.sh * this.price(s) : 0; };
  P.equity = function () { let e = this.cash(); for (const s of Object.keys(this.pos)) e += this.posValue(s); return e; };
  P.unreal = function (s) { const p = this.pos[s]; return p ? (this.price(s) - p.avg) * p.sh : 0; };
  // today's trading result: what you closed today minus fees, plus what the open positions are up or down (rent and cash-outs don't count)
  P.dayPnl = function () { let u = 0; for (const s of Object.keys(this.pos)) u += this.unreal(s); return (this.day ? this.day.realized - this.day.fees : 0) + u; };

  // market orders: side 'buy' (also covers a short) or 'sell' (also opens a short)
  P.order = function (s, side, shares) {
    const m = this.market(s); if (!m) return { ok: false, reason: 'Unknown stock' };
    if (!this.isOpen()) return { ok: false, reason: 'The market is closed. ' + this.sessionText() };
    shares = Math.floor(+shares); if (!(shares > 0)) return { ok: false, reason: 'Enter a number of shares' };
    const px = this.price(s), b = this.game.bills, p = this.pos[s] || { sh: 0, avg: 0 }, sign = side === 'buy' ? 1 : -1;
    const slip = px * 0.0004 * (1 + shares * px / 50000);   // bigger orders fill a little worse
    const fill = px + sign * slip, cost = fill * shares;
    // cash check: buying long needs the cash; opening or adding to a short needs half its value as margin
    const opening = Math.max(0, sign > 0 ? shares - Math.max(0, -p.sh) : shares - Math.max(0, p.sh));
    if (sign > 0 && b.cash < opening * fill + FEE) return { ok: false, reason: 'Not enough cash (need $' + Math.ceil(opening * fill + FEE).toLocaleString() + ')' };
    if (sign < 0 && opening > 0 && b.cash < opening * fill * 0.5 + FEE) return { ok: false, reason: 'Shorting needs half the value as margin ($' + Math.ceil(opening * fill * 0.5).toLocaleString() + ')' };
    b.cash -= sign * cost + FEE;
    // realized P&L on the part that closes the existing position
    const closing = Math.min(shares, Math.abs(p.sh) * (Math.sign(p.sh) === -sign ? 1 : 0));
    let realized = 0;
    if (closing > 0) realized = (fill - p.avg) * closing * (p.sh > 0 ? 1 : -1);
    const newSh = p.sh + sign * shares;
    if (newSh === 0) delete this.pos[s];
    else {
      const avg = Math.sign(newSh) === Math.sign(p.sh) && Math.abs(newSh) > Math.abs(p.sh) ? (p.avg * Math.abs(p.sh) + fill * (Math.abs(newSh) - Math.abs(p.sh))) / Math.abs(newSh) : Math.sign(newSh) !== Math.sign(p.sh) ? fill : p.avg;
      this.pos[s] = { sh: newSh, avg, at: p.at || this.game.sim.t };
    }
    this.ensureDay();
    this.day.trades++; this.day.fees += FEE;
    if (closing > 0) { this.day.realized += realized; if (realized > 0) this.day.wins++; else this.day.losses++; if (!this.day.best || realized > this.day.best.pnl) this.day.best = { s, pnl: realized }; }
    this.log.push({ t: this.game.sim.t, day: this.game.clock.day, s, side: side === 'buy' ? (p.sh < 0 ? 'Cover' : 'Buy') : (p.sh > 0 ? 'Sell' : 'Short'), shares, px: fill, pnl: closing > 0 ? realized : null });
    if (this.log.length > 80) this.log.shift();
    if (this.game.emit) this.game.emit('volume', cost / (BH.C.SOL_USD || 80));
    return { ok: true, text: (side === 'buy' ? 'Bought ' : 'Sold ') + shares + ' ' + s + ' @ $' + fill.toFixed(2) + (closing > 0 ? ' · ' + (realized >= 0 ? '+' : '−') + '$' + Math.abs(realized).toFixed(2) : '') };
  };
  P.closeAll = function (why) {
    let n = 0, pnl = 0; const was = this.isOpen;
    this.isOpen = () => true;   // the bell auction still fills
    for (const [s, p] of Object.entries(this.pos)) { const r = this.order(s, p.sh > 0 ? 'sell' : 'buy', Math.abs(p.sh)); if (r.ok) { n++; pnl += this.log[this.log.length - 1].pnl || 0; } }
    this.isOpen = was;
    return { n, pnl, why };
  };
  P.ensureDay = function () {
    const d = this.game.clock.day;
    if (!this.day || this.day.d !== d) this.day = { d, startEq: this.equity(), cashIn: 0, realized: 0, trades: 0, wins: 0, losses: 0, fees: 0, best: null };
  };
  // cash that comes in or goes out from outside (rent, cash-outs) shouldn't count as trading P&L
  P.noteCash = function (delta) { if (this.day) this.day.cashIn = (this.day.cashIn || 0) + delta; };

  P.onStep = function () {
    const gm = this.game, sim = gm.sim, ck = gm.clock; if (!ck || !gm.sys.perps) return;
    const open = this.isOpen();
    // the open: a new trading day
    if (open && !this.wasOpen) { this.ensureDay(); this.day.startEq = this.equity(); this.day.cashIn = 0; }
    // the bell: close everything if the auto-flatten switch is on, and write the day down
    if (!open && this.wasOpen) {
      let msg = '';
      if (this.flatten && Object.keys(this.pos).length) { const r = this.closeAll('bell'); msg = ' Closed ' + r.n + ' position' + (r.n === 1 ? '' : 's') + ' at the bell.'; }
      if (this.day && this.day.trades) {
        const pnl = this.dayPnl(); this.history.push({ d: this.day.d, pnl, trades: this.day.trades, wins: this.day.wins, losses: this.day.losses });
        gm.emit('toast', { kind: pnl >= 0 ? 'buy' : 'bad', text: 'Day trading: ' + (pnl >= 0 ? '+' : '−') + '$' + Math.abs(pnl).toFixed(0) + ' today (' + this.day.trades + ' orders, ' + this.day.wins + ' wins).' + msg });
      }
    }
    this.wasOpen = open;
    // 5-minute candles (game minutes; one game minute is one second of sim time)
    const minute = Math.floor(ck.total * 60), bucket = Math.floor(minute / CANDLE) * CANDLE;
    if (open) for (const s of this.symbols()) {
      const px = this.price(s); if (!(px > 0)) continue;
      const arr = this.candles[s] || (this.candles[s] = []), c = arr[arr.length - 1];
      if (!c || c.m !== bucket) { arr.push({ m: bucket, o: c ? c.c : px, h: px, l: px, c: px }); if (arr.length > 160) arr.shift(); }
      else { c.h = Math.max(c.h, px); c.l = Math.min(c.l, px); c.c = px; }
    }
    // stock news while the market is open: one name jumps or drops
    if (open && sim.t >= this.nextNews) {
      const r = this._r; this.nextNews = sim.t + 45 + r() * 90;
      if (this.nextNews && r() < 0.7) {
        const syms = this.symbols(), s = syms[Math.floor(r() * syms.length)], n = NEWS[Math.floor(r() * NEWS.length)], mk = gm.sys.perps.mk[s];
        if (mk) {
          const k = n[0] + r() * (n[1] - n[0]); mk.price *= 1 + k;
          const text = n[2].replace('{s}', '$' + s) + ' (' + (k >= 0 ? '+' : '') + (k * 100).toFixed(1) + '%)';
          if (gm.sys.world) gm.sys.world.headline(text);
          if (this.pos[s]) gm.emit('toast', { kind: k >= 0 ? 'buy' : 'bad', text: 'You hold ' + s + ': ' + text });
        }
      }
    }
  };
  // the open session's change for a stock, from its first candle today
  P.change = function (s) { const a = this.candles[s]; if (!a || !a.length) return 0; const day0 = Math.floor(this.game.clock.total / 24) * 24 * 60; const first = a.find((c) => c.m >= day0 + 9.5 * 60) || a[0]; return (this.price(s) / first.o - 1) * 100; };

  BH.Systems.push({ name: 'daytrade', create(game, saved) { const d = new DayTrade(game, saved); d.hooks = { step: () => d.onStep() }; return d; } });
  BH.DayTrade = DayTrade;
})(typeof window !== 'undefined' ? window : globalThis);
