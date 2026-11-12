/* Day Trading app (Nov 12): trade stock shares with your cash during the US session (game/daytrade.js).
   Watchlist on the left, 5-minute candles in the middle, an order ticket on the right, positions and today's results below.
   Lives in the Trade suite. Loaded after hustle.js (BH.addApp) and suites.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, icon = BH.icon, esc = BH.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const game = () => UI.game;
  const setHTML = (el, v) => { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } };
  const usd = (n, d) => (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d });
  const sgn = (n) => (n >= 0 ? '+' : '−') + '$' + Math.abs(n).toFixed(2);
  const toast = (r) => UI.toast(r.ok ? 'info' : 'fail', r.ok ? r.text : r.reason);

  const page = {
    sel: 'TSLA', drawT: 0,
    build(el) {
      el.innerHTML = '<div class="xp dt"><div class="dt-top"><h1>' + icon('line-chart', 'lg') + 'Day Trading</h1><span class="dt-sess" id="dtSess"></span><div class="spacer"></div><div class="dt-kpis" id="dtKpi"></div></div>' +
        '<div class="dt-grid"><div class="card dt-list" id="dtList"></div>' +
        '<div class="card dt-main"><div id="dtHead"></div><canvas id="dtChart"></canvas></div>' +
        '<div class="card dt-ticket"><h2>Order</h2><div class="kv"><span>Shares</span><div class="amt" style="width:150px"><input id="dtSh" value="10" inputmode="numeric"><span class="solmark">SH</span></div></div>' +
        '<div class="row-btns dt-quick">' + [500, 1000, 2500, 5000].map((v) => '<button class="btn sm" data-dq="' + v + '">$' + (v >= 1000 ? v / 1000 + 'K' : v) + '</button>').join('') + '<button class="btn sm" data-dq="max">Max</button></div>' +
        '<div class="note" id="dtEst"></div><div class="row-btns"><button class="btn buy" data-do="buy">Buy</button><button class="btn sell" data-do="sell">Sell / Short</button></div>' +
        '<div id="dtPosBox"></div><label class="dt-flat"><input type="checkbox" id="dtFlat"> Close everything at the 16:00 bell</label>' +
        '<p class="note">Market orders, $' + BH.DayTrade.FEE.toFixed(2) + ' each. Shorting needs half the value as cash margin. Prices also move on news and celebrity tweets.</p></div></div>' +
        '<div class="grid-2"><div class="card"><h2>Positions</h2><div id="dtPos"></div></div><div class="card"><h2>Today</h2><div id="dtDay"></div></div></div></div>';
      el.addEventListener('click', (e) => {
        const d = game().sys.daytrade;
        const s = e.target.closest('[data-ds]'); if (s) { this.sel = s.dataset.ds; $('#dtList')._h = null; $('#dtPosBox')._h = null; this.drawT = 0; return; }
        const q = e.target.closest('[data-dq]'); if (q) { const px = d.price(this.sel); const usdAmt = q.dataset.dq === 'max' ? Math.max(0, d.cash() - 1) : +q.dataset.dq; $('#dtSh').value = Math.max(1, Math.floor(usdAmt / px)); this.est(); return; }
        const o = e.target.closest('[data-do]'); if (o) { toast(d.order(this.sel, o.dataset.do, parseFloat($('#dtSh').value))); this.drawT = 0; return; }
        const c = e.target.closest('[data-dc]'); if (c) { const p = d.pos[c.dataset.dc]; if (p) toast(d.order(c.dataset.dc, p.sh > 0 ? 'sell' : 'buy', Math.abs(p.sh))); return; }
      });
      el.addEventListener('input', (e) => { if (e.target.id === 'dtSh') this.est(); });
      el.addEventListener('change', (e) => { if (e.target.id === 'dtFlat') game().sys.daytrade.flatten = e.target.checked; });
    },
    est() { const d = game().sys.daytrade, n = Math.floor(parseFloat($('#dtSh').value) || 0), px = d.price(this.sel); const e = $('#dtEst'); if (e) e.innerHTML = n + ' × ' + usd(px) + ' = <b>' + usd(n * px, 0) + '</b> · cash ' + usd(d.cash(), 0); },
    render() {
      const gm = game(), d = gm.sys.daytrade; if (!d) return;
      const open = d.isOpen(), F = (n) => usd(n);
      const sess = $('#dtSess'); if (sess) { sess.textContent = d.sessionText(); sess.className = 'dt-sess ' + (open ? 'open' : ''); }
      const pnl = d.dayPnl();
      setHTML($('#dtKpi'), '<span>Cash <b>' + usd(d.cash(), 0) + '</b></span><span>Equity <b>' + usd(d.equity(), 0) + '</b></span><span>Today <b class="' + (pnl >= 0 ? 'up' : 'down') + '">' + sgn(pnl) + '</b></span>');
      const fl = $('#dtFlat'); if (fl && document.activeElement !== fl) fl.checked = !!d.flatten;
      setHTML($('#dtList'), d.symbols().map((s) => { const m = d.market(s), ch = d.change(s), held = d.pos[s]; return '<button class="dt-row' + (s === this.sel ? ' on' : '') + '" data-ds="' + s + '"><b>' + s + (held ? ' <i class="dt-held">' + (held.sh > 0 ? 'L' : 'S') + '</i>' : '') + '</b><span class="dim">' + esc(m.name) + '</span><span class="dt-px">' + F(d.price(s)) + '</span><span class="' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%</span></button>'; }).join(''));
      const s = this.sel, ch = d.change(s), p = d.pos[s];
      setHTML($('#dtHead'), '<div class="dt-h"><b>' + s + '</b><span class="dim">' + esc(d.market(s).name) + '</span><span class="dt-big">' + F(d.price(s)) + '</span><span class="' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '+' : '') + ch.toFixed(2) + '% today</span></div>');
      setHTML($('#dtPosBox'), p ? '<div class="dt-pos"><span>' + (p.sh > 0 ? 'Long ' : 'Short ') + Math.abs(p.sh) + ' @ ' + F(p.avg) + '</span><b class="' + (d.unreal(s) >= 0 ? 'up' : 'down') + '">' + sgn(d.unreal(s)) + '</b></div>' : '<div class="dt-pos dim">No ' + s + ' position</div>');
      for (const b of document.querySelectorAll('.dt [data-do]')) b.disabled = !open;
      if (!$('#dtEst').innerHTML) this.est();
      // chart: 5-minute candles, redrawn at most 4 times a second
      const cv = $('#dtChart'), now = performance.now();
      if (cv && now - this.drawT > 250) {
        this.drawT = now;
        const W = cv.clientWidth, H = 280; cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
        ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, W, H);
        const c = (d.candles[s] || []).slice(-80);
        if (c.length < 2) { ctx.fillStyle = '#8a93a3'; ctx.font = '13px Inter'; ctx.fillText(open ? 'Waiting for the first candles…' : 'Candles print while the market is open (Mon-Fri 9:30-16:00).', 16, 30); }
        else {
          let lo = Infinity, hi = -Infinity; for (const k of c) { lo = Math.min(lo, k.l); hi = Math.max(hi, k.h); } if (p) { lo = Math.min(lo, p.avg); hi = Math.max(hi, p.avg); }
          const pad = (hi - lo) * 0.08 || hi * 0.01; lo -= pad; hi += pad;
          const PW = W - 64, Y = (v) => 10 + (hi - v) / (hi - lo) * (H - 30), SL = 80, bw = Math.max(2, PW / SL * 0.65), X = (i) => (i + 0.5 + SL - c.length) * PW / SL;   // 80 fixed slots, newest on the right
          ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.fillStyle = '#8a93a3'; ctx.font = '11px Inter';
          for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, y = Y(v); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PW, y); ctx.stroke(); ctx.fillText(v.toFixed(2), PW + 6, y + 4); }
          c.forEach((k, i) => { const x = X(i), up = k.c >= k.o; ctx.strokeStyle = ctx.fillStyle = up ? '#2bd67b' : '#ff4d5e'; ctx.beginPath(); ctx.moveTo(x, Y(k.h)); ctx.lineTo(x, Y(k.l)); ctx.stroke(); ctx.fillRect(x - bw / 2, Math.min(Y(k.o), Y(k.c)), bw, Math.max(1, Math.abs(Y(k.o) - Y(k.c)))); });
          if (p) { const y = Y(p.avg); ctx.setLineDash([5, 4]); ctx.strokeStyle = p.sh > 0 ? '#2bd67b' : '#ff4d5e'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PW, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = ctx.strokeStyle; ctx.fillText((p.sh > 0 ? 'LONG ' : 'SHORT ') + Math.abs(p.sh) + ' @ ' + p.avg.toFixed(2), 6, y - 5); }
          const last = c[c.length - 1], y = Y(last.c); ctx.fillStyle = last.c >= last.o ? '#2bd67b' : '#ff4d5e'; ctx.fillRect(PW, y - 9, 64, 18); ctx.fillStyle = '#05140d'; ctx.font = '700 11px Inter'; ctx.fillText(last.c.toFixed(2), PW + 6, y + 4);
        }
      }
      const pos = Object.entries(d.pos);
      setHTML($('#dtPos'), pos.length ? '<table class="tbl"><thead><tr><th class="l">Stock</th><th>Shares</th><th>Avg</th><th>Price</th><th>P&L</th><th></th></tr></thead><tbody>' + pos.map(([k, v]) => '<tr><td class="l"><b>' + k + '</b></td><td class="' + (v.sh > 0 ? 'up' : 'down') + '">' + v.sh + '</td><td>' + F(v.avg) + '</td><td>' + F(d.price(k)) + '</td><td class="' + (d.unreal(k) >= 0 ? 'up' : 'down') + '">' + sgn(d.unreal(k)) + '</td><td><button class="btn sm" data-dc="' + k + '"' + (open ? '' : ' disabled') + '>Close</button></td></tr>').join('') + '</tbody></table>' : '<div class="dim">No open positions.</div>');
      const day = d.day && d.day.d === gm.clock.day ? d.day : null, hist = d.history.slice(-5).reverse();
      setHTML($('#dtDay'), (day ? '<div class="kv"><span>Realized</span><b class="' + (day.realized >= 0 ? 'up' : 'down') + '">' + sgn(day.realized) + '</b></div><div class="kv"><span>Orders · wins / losses</span><b>' + day.trades + ' · ' + day.wins + ' / ' + day.losses + '</b></div><div class="kv"><span>Fees</span><b>' + F(day.fees) + '</b></div>' + (day.best ? '<div class="kv"><span>Best trade</span><b class="up">' + day.best.s + ' ' + sgn(day.best.pnl) + '</b></div>' : '') : '<div class="dim">No trades today yet.</div>') +
        (hist.length ? '<h3 class="xh">Past days</h3>' + hist.map((h) => '<div class="kv"><span>Day ' + h.d + ' · ' + h.trades + ' orders</span><b class="' + (h.pnl >= 0 ? 'up' : 'down') + '">' + sgn(h.pnl) + '</b></div>').join('') : '') +
        (d.log.length ? '<h3 class="xh">Recent orders</h3>' + d.log.slice(-6).reverse().map((l) => '<div class="logline">' + l.side + ' ' + l.shares + ' ' + l.s + ' @ ' + F(l.px) + (l.pnl != null ? ' · <b class="' + (l.pnl >= 0 ? 'up' : 'down') + '">' + sgn(l.pnl) + '</b>' : '') + '</div>').join('') : ''));
    },
  };
  BH.addApp('daytrade', 'Day Trading', 'line-chart', '#4aa8ff', page);
  // it belongs in the Trade suite, next to the terminal and Scope
  const tr = BH.Suites && BH.Suites.find((x) => x.id === 'trade');
  if (tr && !tr.apps.includes('daytrade')) { tr.apps.push('daytrade'); tr.desc += ' Plus Day Trading (stocks with your cash).'; }
  const intro = BH.AppInfo;
  if (intro && !intro.daytrade) intro.daytrade = ['Day Trading', 'Trade stock shares with your cash during the US session (9:30-16:00 game time). Everything closes at the bell.', ''];
})(window);
