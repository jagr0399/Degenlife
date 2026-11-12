/* Desktop cleanup: 19 app icons become 6 suites (Trade, Social, Business, Money, Safety, Life). Opening a suite opens its
   first app with tabs for the rest in the top bar. Also a cleaner Discover page modeled on a trending table:
   Top / Trending / Callouts, a time window, one row per coin. Loaded after intro.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, icon = BH.icon, esc = BH.esc, F = BH.fmt, C = BH.C;
  const $ = (s, el) => (el || document).querySelector(s);
  const game = () => UI.game;
  const SUITES = [
    { id: 'trade', name: 'Trade', ic: 'candlestick-chart', col: '#f4b23e', apps: ['terminal', 'scope'], desc: 'The trading terminal (Discover, Pulse, Trackers, Perps, Predictions, Portfolio) and Scope.' },
    { id: 'social', name: 'Social', ic: 'message-circle', col: '#4aa8ff', apps: ['chirp', 'clout', 'trencher'], desc: 'Chirp timeline, your Clout (copiers, leaderboard, alpha group, deals, Spaces) and the Trencher caller career.' },
    { id: 'business', name: 'Business', ic: 'briefcase', col: '#a77bff', apps: ['hustle', 'dev', 'firm', 'pad', 'empire'], desc: 'Meme Lab and crew, Coin Factory, your trading Firm, LaunchLab and side businesses.' },
    { id: 'money', name: 'Money', ic: 'landmark', col: '#2bd67b', apps: ['bank', 'finance', 'shop'], desc: 'Bank, Finance (gigs, loans, prop firm, airdrops) and the Shop.' },
    { id: 'safety', name: 'Safety', ic: 'shield', col: '#3fd2c7', apps: ['toolkit'], desc: 'Sniper bot, detective cases, phishing inbox, cold storage.' },
    { id: 'life', name: 'Life', ic: 'heart', col: '#ff6b9a', apps: ['life', 'news', 'radio'], desc: 'Challenges, group chat, pets, journal, museum, plus News and Radio.' },
  ];
  BH.Suites = SUITES;
  const suiteOf = (appId) => SUITES.find((s) => s.apps.includes(appId)) || null;
  const appInfo = (id) => (BH.AppsUI.APPS.find((a) => a[0] === id) || [id, id, 'square', '#999']);

  function drawSuites() {
    const host = $('#desktop .dk-icons'); if (!host || host._suites) return;
    host._suites = true;
    host.innerHTML = SUITES.map((s) => '<button class="dk-app dk-suite" data-suite="' + s.id + '" title="' + esc(s.name + ': ' + s.desc) + '"><span class="dk-ic" style="--c:' + s.col + '">' + icon(s.ic) + '</span><span>' + s.name + '</span><small>' + s.apps.length + ' app' + (s.apps.length > 1 ? 's' : '') + '</small></button>').join('');
    host.addEventListener('click', (e) => { const b = e.target.closest('[data-suite]'); if (!b) return; e.stopPropagation(); const s = SUITES.find((x) => x.id === b.dataset.suite); UI.openApp(s.apps[0]); }, true);
  }
  function drawTabs(appId) {
    const bar = $('#appbar'); if (!bar) return;
    let t = $('#abTabs'); if (!t) { t = document.createElement('div'); t.id = 'abTabs'; t.className = 'ab-tabs'; $('#abName').after(t); t.addEventListener('click', (e) => { const b = e.target.closest('[data-tab-app]'); if (b) UI.openApp(b.dataset.tabApp); }); }
    const s = suiteOf(appId);
    if (!s || s.apps.length < 2) { t.innerHTML = ''; return; }
    t.innerHTML = s.apps.map((id) => { const a = appInfo(id); return '<button data-tab-app="' + id + '" class="' + (id === appId ? 'on' : '') + '"><span style="color:' + a[3] + '">' + icon(a[2], 'sm') + '</span>' + esc(a[1]) + '</button>'; }).join('');
    $('#abName').textContent = s.name;
  }
  const origDesk = UI.showDesktop, origOpen = UI.openApp;
  UI.showDesktop = function () { origDesk.apply(this, arguments); drawSuites(); };
  UI.openApp = function (id, view) { origOpen.apply(this, arguments); drawTabs(id); };

  // ---------------- Discover: one clean trending table ----------------
  const disc = {
    tab: 'trending', win: 300,
    build(el) {
      el.innerHTML = '<div class="xp disc"><div class="dc-top"><div class="dc-tabs"><button data-dt="top">Top</button><button data-dt="trending">Trending</button><button data-dt="callouts">Callouts</button><button data-dt="watch">Watchlist</button></div><div class="spacer"></div>' +
        '<div class="seg dc-win">' + [[60, '1m'], [300, '5m'], [1800, '30m'], [3600, '1h']].map(([v, l]) => '<button data-dw="' + v + '">' + l + '</button>').join('') + '</div></div><div id="dcBody"></div></div>';
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-dt]'); if (t) { this.tab = t.dataset.dt; this.render(true); return; }
        const w = e.target.closest('[data-dw]'); if (w) { this.win = +w.dataset.dw; this.render(true); return; }
        const st = e.target.closest('[data-star]'); if (st) { e.stopPropagation(); const m = game().meta, id = st.dataset.star; m.watch = m.watch || []; const i = m.watch.indexOf(id); if (i >= 0) m.watch.splice(i, 1); else m.watch.unshift(id); if (m.watch.length > 30) m.watch.length = 30; $('#dcBody')._t = 0; this.render(); return; }
        const b = e.target.closest('[data-qb]'); if (b) { e.stopPropagation(); UI.trade('buy', (UI.settings.quick || 0.25) * (e.shiftKey ? 2 : 1), b.dataset.qb); return; }   // Shift-click buys double
        const r = e.target.closest('[data-open]'); if (r && game().sim.byId.get(r.dataset.open)) UI.openToken(r.dataset.open);
      });
    },
    render() {
      const gm = game(), sim = gm.sim, W = this.win;
      for (const b of document.querySelectorAll('[data-dt]')) b.classList.toggle('on', b.dataset.dt === this.tab);
      for (const b of document.querySelectorAll('[data-dw]')) b.classList.toggle('on', +b.dataset.dw === W);
      const body = $('#dcBody'); if (!body) return;
      if (body._t && performance.now() - body._t < 900) return;   // a table this big doesn't need 4 redraws a second
      body._t = performance.now();
      const live = sim.tokens.filter((t) => !t.dead && t.trades.length);
      const vol = (tk) => { let v = 0, b = 0, s = 0; for (let i = tk.trades.length - 1; i >= 0 && tk.trades[i].t >= sim.t - W; i--) { v += tk.trades[i].sol; if (tk.trades[i].side === 'buy') b++; else s++; } return { v, b, s }; };
      let rows;
      if (this.tab === 'watch') { const w = gm.meta.watch || []; rows = w.map((id) => sim.byId.get(id)).filter((t) => t && !t.dead && t.trades.length); }
      else if (this.tab === 'callouts') {
        rows = live.filter((t) => t.calls && t.calls.some((c) => sim.t - c.t <= W)).sort((a, b) => b.calls[b.calls.length - 1].t - a.calls[a.calls.length - 1].t);
      } else if (this.tab === 'top') rows = live.slice().sort((a, b) => sim.mc(b) - sim.mc(a));
      else rows = live.map((t) => ({ t, s: vol(t).v * (1 + Math.max(0, sim.change(t, W)) / 100) })).sort((a, b) => b.s - a.s).map((x) => x.t);
      rows = rows.slice(0, 40);
      const usd = (n) => F.usd(n);
      const chip = (v, lbl, bad) => '<span class="dc-chip ' + (v >= bad ? 'bad' : v >= bad / 2 ? 'warn' : 'ok') + '" title="' + lbl + '">' + lbl + ' ' + v.toFixed(0) + '%</span>';
      const html = rows.length ? '<table class="tbl dc-tbl"><thead><tr><th></th><th class="l">Pair</th><th>Market cap</th><th>Liquidity</th><th>Volume</th><th>Txns</th><th class="l">Token info</th><th></th></tr></thead><tbody>' + rows.map((tk) => {
        const mc = sim.mc(tk), ch = sim.change(tk, W), vv = vol(tk), risk = sim.risk(tk), age = F.age(sim.t - tk.born);
        const lastCall = tk.calls && tk.calls[tk.calls.length - 1];
        const callTxt = this.tab === 'callouts' && lastCall ? '<div class="dc-call">' + (lastCall.who === 'you' ? 'You' : '@' + esc(lastCall.who)) + ' called at ' + usd(lastCall.mc) + ' · <b class="' + (mc >= lastCall.mc ? 'up' : 'down') + '">' + (mc >= lastCall.mc ? '+' : '') + Math.round((mc / lastCall.mc - 1) * 100) + '%</b></div>' : '';
        const starred = (gm.meta.watch || []).includes(tk.id);
        return '<tr data-open="' + tk.id + '"><td><button class="dc-star' + (starred ? ' on' : '') + '" data-star="' + tk.id + '" title="' + (starred ? 'Remove from watchlist' : 'Add to watchlist (also shows on your HUD while walking)') + '">' + (starred ? '★' : '☆') + '</button></td><td class="l"><div class="dc-pair">' + (BH.SocialView && BH.SocialView.coinImg ? '<img src="' + BH.SocialView.coinImg('../assets/', tk) + '">' : '') + '<div><b>$' + esc(tk.ticker) + '</b> <span class="dim">' + esc(tk.name) + '</span><div class="dim">' + age + ' · ' + (tk.stage === 'amm' ? 'Migrated' : Math.round(sim.progress(tk)) + '% bonded') + ' · ' + risk.holders + ' holders</div>' + callTxt + '</div></div></td>' +
          '<td><b>' + usd(mc) + '</b><div class="' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '+' : '') + ch.toFixed(1) + '%</div></td><td>' + usd(sim.liquidity(tk) * C.SOL_USD) + '</td><td>' + usd(vv.v * C.SOL_USD) + '</td><td>' + (vv.b + vv.s) + (tk.trades.length >= 100 && vv.b + vv.s >= tk.trades.length - 1 ? '+' : '') + '<div><span class="up">' + vv.b + '</span> / <span class="down">' + vv.s + '</span></div></td>' +
          '<td class="l"><div class="dc-info">' + chip(risk.top10, 'Top 10', 50) + chip(risk.dev, 'Dev', 10) + chip(risk.snipers, 'Snipers', 15) + chip(risk.bundle, 'Bundle', 20) + '</div></td>' +
          '<td><button class="btn sm dc-buy" title="Shift-click to buy double" data-qb="' + tk.id + '">' + icon('zap', 'sm') + 'Buy ' + (UI.settings.quick || 0.25) + '</button></td></tr>';
      }).join('') + '</tbody></table>' : '<div class="empty">' + (this.tab === 'callouts' ? 'No calls in this window yet.' : this.tab === 'watch' ? 'Star coins with ☆ to watch them here and on your HUD.' : 'Nothing trading yet.') + '</div>';
      if (body._h !== html) { body._h = html; body.innerHTML = html; }
    },
  };
  BH.MorePages.discover = disc;
})(window);
