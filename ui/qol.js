/* Quality of life (Nov 12): things you see while walking around, so you don't have to sit down to know what's going on.
   - a pill with today's market mood (Bull day, Runner season...) next to the place pill
   - a mini bar with your open bags and perps (value and PnL), plus your watchlist
   - alerts on your bags: 2x / 3x / 5x / 10x from your cost and −50%, and a warning before a perp gets liquidated
   Loaded after hud2.js; it wraps HUD.renderExtra. */
(function (g) {
  'use strict';
  const BH = g.BH, H = BH.HUD;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const UP = [2, 3, 5, 10];

  const origInit = H.extraInit, origRender = H.renderExtra;
  H.extraInit = function () {
    origInit.apply(this, arguments);
    const root = this.el, top = root.querySelector('.hud-top');
    const day = document.createElement('div'); day.className = 'pill dayp'; day.id = 'hDay';
    const place = this.$('hPlace'); if (top && place) top.insertBefore(day, place.nextSibling);
    const bags = document.createElement('div'); bags.className = 'bags'; bags.id = 'hBags'; root.appendChild(bags);
  };

  let alertT = 0;
  function alerts(game) {
    const pl = game.player, sim = game.sim;
    for (const p of pl.pos.values()) {
      if (p.tokens < 1 || !(p.cost > 0)) continue;
      const tk = sim.byId.get(p.id); if (!tk || tk.dead) continue;
      const x = pl.markValue(p) / p.cost; p._al = p._al || {};
      for (const m of UP) if (x >= m && !p._al[m]) { p._al[m] = 1; game.emit('toast', { kind: 'buy', text: '$' + tk.ticker + ' is a ' + m + 'x on your bag. Take some profit?' }); }
      if (x <= 0.5 && !p._al.down) { p._al.down = 1; game.emit('toast', { kind: 'bad', text: '$' + tk.ticker + ' is down 50% on your bag.' }); }
    }
    const px = game.sys.perps;
    if (px) for (const p of px.pos) { const r = px.pnl(p) / p.margin; if (r <= -0.6 && !p._warn) { p._warn = 1; game.emit('toast', { kind: 'bad', text: 'Your ' + p.lev + 'x ' + p.side + ' ' + (p.mk || 'MEMEX') + ' is close to liquidation (' + Math.round(r * 100) + '% of margin).' }); } }
  }

  H.renderExtra = function (game) {
    origRender.apply(this, arguments);
    const d = game.sys.days, dp = this.$('hDay');
    if (dp && d) { const i = d.info(), t = this.icon(i.ic || 'sun', 'sm') + '<span>' + esc(i.hud) + '</span>'; if (dp._h !== t) { dp._h = t; dp.innerHTML = t; dp.title = i.text; dp.dataset.kind = d.type; } }
    const now = performance.now();
    if (now - alertT > 1000) { alertT = now; try { alerts(game); } catch (e) { /* never break the HUD */ } }
    const el = this.$('hBags'); if (!el) return;
    if (el._t && now - el._t < 250) return; el._t = now;   // 4 updates a second is plenty for this panel
    const pl = game.player, sim = game.sim, rows = [];
    for (const p of pl.pos.values()) {
      if (p.tokens < 1) continue; const tk = sim.byId.get(p.id); if (!tk) continue;
      const v = pl.markValue(p), pnl = p.cost > 0 ? (v / p.cost - 1) * 100 : 0;
      rows.push({ v, html: '<div class="bg-row"><b>$' + esc(tk.ticker) + '</b><span>' + v.toFixed(2) + ' SOL</span><span class="' + (pnl >= 0 ? 'up' : 'down') + '">' + (pnl >= 0 ? '+' : '') + pnl.toFixed(0) + '%</span></div>' });
    }
    rows.sort((a, b) => b.v - a.v);
    const px = game.sys.perps, perps = px ? px.pos.map((p) => { const r = px.pnl(p) / p.margin * 100; return '<div class="bg-row"><b>' + (p.mk || 'MEMEX') + ' ' + p.lev + 'x</b><span>' + p.side + '</span><span class="' + (r >= 0 ? 'up' : 'down') + '">' + (r >= 0 ? '+' : '') + r.toFixed(0) + '%</span></div>'; }) : [];
    const watch = (game.meta.watch || []).map((id) => sim.byId.get(id)).filter((t) => t && !t.dead).slice(0, 3).map((tk) => { const ch = sim.change(tk, 300); return '<div class="bg-row dim"><b>☆ $' + esc(tk.ticker) + '</b><span>' + BH.fmt.usd(sim.mc(tk)) + '</span><span class="' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '+' : '') + ch.toFixed(0) + '%</span></div>'; });
    const html = rows.length + perps.length + watch.length ? '<div class="bg-h">Your bags</div>' + (rows.slice(0, 4).map((r) => r.html).join('') || '') + (rows.length > 4 ? '<div class="bg-more">+' + (rows.length - 4) + ' more</div>' : '') + perps.slice(0, 3).join('') + (watch.length ? '<div class="bg-h">Watchlist</div>' + watch.join('') : '') : '';
    if (el._h !== html) { el._h = html; el.innerHTML = html; el.hidden = !html; }
  };
})(window);

/* Sleeping (Nov 12): a calm panel over the dark screen with the clock moving and a progress bar, instead of a frozen black screen. */
(function (g) {
  'use strict';
  const H = g.BH.HUD;
  H.sleepProgress = function (f, now, wake) {
    let el = document.getElementById('hSleep');
    if (f == null) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'hSleep'; el.className = 'sleepbox'; el.innerHTML = '<div class="sl-moon">☾</div><div class="sl-t">Sleeping<span class="sl-z">z z z</span></div><div class="sl-clock"></div><div class="sl-bar"><i></i></div><div class="sl-note">The market keeps moving while you sleep.</div>'; document.body.appendChild(el); }
    el.querySelector('.sl-clock').textContent = now + '  →  ' + wake;
    el.querySelector('.sl-bar i').style.width = Math.round(f * 100) + '%';
  };
})(window);
