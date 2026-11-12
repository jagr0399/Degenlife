/* Bagholder UI: shell, Pulse feed, token page, launch page, portfolio, runs, wallet drawer, toasts. */
(function (g) {
  'use strict';
  const BH = g.BH, C = BH.C, F = BH.fmt;
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  BH.esc = esc;

  // ---- icons (Lucide nodes -> svg strings) ------------------------------------------------
  const iconCache = {};
  const pascal = (n) => n.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
  function icon(name, cls) {
    const key = name + '|' + (cls || '');
    if (iconCache[key]) return iconCache[key];
    const node = g.lucide && g.lucide.icons && g.lucide.icons[pascal(name)];
    if (!node) return '';
    const kids = (node[2] || []).map(([tag, at]) => '<' + tag + ' ' + Object.entries(at).map(([k, v]) => k + '="' + v + '"').join(' ') + '/>').join('');
    return (iconCache[key] = '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + kids + '</svg>');
  }
  BH.icon = icon;
  const SOL = '<span class="solmark">SOL</span>';
  const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 6.5c1.5 1.6 3.2 2.3 5 2.3s3.5-.7 5-2.3l-1.6 4.3h-6.8z" fill="#c78a24"/><path d="M12.6 10.8h6.8c4.6 2.6 7.6 7 7.6 11 0 4-3.4 5.7-11 5.7S5 25.8 5 21.8c0-4 3-8.4 7.6-11z" fill="#f4b23e"/><path d="M9.5 21.2l3.4-3.4 2.8 2.4 4.9-5.3" stroke="#1b1305" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.4 14.9h2.4v2.4" stroke="#1b1305" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  BH.LOGO = LOGO;

  // ---- generated token art: mirrored 5x5 pixel sigil ----------------------------------------
  const avaCache = new Map();
  function avatar(tk) {
    if (tk.realImg || tk.img != null) return '<span class="cletter">' + esc(tk.ticker.charAt(0)) + '</span><img class="cimg" src="' + esc(tk.realImg || ('../assets/coins/c' + tk.img + '.jpg')) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">';
    const key = tk.seed + ':' + tk.hue;
    if (avaCache.has(key)) return avaCache.get(key);
    const r = BH.makeRng(tk.seed);
    const fg = 'hsl(' + tk.hue + ' 72% 62%)', fg2 = 'hsl(' + ((tk.hue + 40) % 360) + ' 70% 72%)', bg = 'hsl(' + tk.hue + ' 30% 14%)';
    let cells = '';
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
      if (r() < 0.5) continue;
      const c = r() < 0.25 ? fg2 : fg;
      cells += '<rect x="' + (x * 6 + 3) + '" y="' + (y * 6 + 3) + '" width="6" height="6" fill="' + c + '"/>';
      if (x < 2) cells += '<rect x="' + ((4 - x) * 6 + 3) + '" y="' + (y * 6 + 3) + '" width="6" height="6" fill="' + c + '"/>';
    }
    const svg = '<svg viewBox="0 0 36 36"><rect width="36" height="36" fill="' + bg + '"/>' + cells + '</svg>';
    avaCache.set(key, svg);
    return svg;
  }
  BH.avatar = avatar;

  function setText(el, v) { if (el && el.textContent !== v) el.textContent = v; }
  function setHTML(el, v) { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } }
  function cls(n, good, bad) { return n >= bad ? 'bad' : n >= good ? 'warn' : 'ok'; }

  // ---- UI object -------------------------------------------------------------------------------
  const UI = {
    view: 'pulse', tokenId: null, tab: 'trades', side: 'buy', amount: '0.5', search: '',
    settings: { slippage: C.DEFAULT_SLIPPAGE, priority: C.DEFAULT_PRIORITY, quick: C.QUICK_BUY },
    launchForm: { name: '', ticker: '', desc: '', hue: 38, socials: { x: true, tg: false, web: false }, devBuy: '0.5' },
  };
  BH.UI = UI;

  UI.init = function (game) {
    this.game = game;
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem('bagholder.settings') || '{}')); } catch (e) { /* private mode */ }
    document.getElementById('app').innerHTML =
      '<header class="top">' +
        '<div class="logo">' + LOGO + '<span>Bagholder</span></div>' +
        '<nav class="nav" id="nav">' +
          '<button data-view="pulse" title="Live token feed (P)">' + icon('activity') + 'Pulse</button>' +
          '<button data-view="token" id="navToken" title="Last token you opened">' + icon('candlestick-chart') + '<span>Token</span></button>' +
          '<button data-view="launch" title="Launch your own coin (L)">' + icon('rocket') + 'Launch</button>' +
          '<button data-view="portfolio" title="Positions, PnL and stats">' + icon('briefcase') + 'Portfolio</button>' +
          '<button data-view="bank" title="Cash, rent, fridge and side gigs">' + icon('landmark') + 'Bank</button>' +
        '</nav>' +
        '<label class="search">' + icon('search', 'sm') + '<input id="search" placeholder="Search name, ticker or address" autocomplete="off"><kbd>/</kbd></label>' +
        '<div class="spacer"></div>' +
        '<span class="chip" id="solChip" title="Fixed fake SOL price">' + SOL + '<b>$' + C.SOL_USD + '</b></span>' +
        '<span class="chip" id="clock" title="Game time (1 real minute = 1 game hour)">' + icon('clock', 'sm') + '<b>Day 1</b></span>' +
        '<span class="chip" id="cashChip" title="Cash for rent and food">' + icon('banknote', 'sm') + '<b>$0</b></span>' +
        '<button class="btn ghost sm" id="standUp" title="Stand up (Esc)">' + icon('log-out', 'sm') + 'Stand up</button>' +
        '<button class="walletbtn" id="walletBtn" title="Wallet (W)"><span class="ava"></span><b id="wBal">10.00</b>' + SOL + '<span id="wPnl" class="up">+0%</span>' + icon('chevron-down', 'sm') + '</button>' +
      '</header>' +
      '<main id="view"></main>' +
      '<footer class="foot"><span class="live" id="live"><i></i>LIVE</span><span class="dim" id="mkt"></span><div class="feed" id="feed"></div><span class="dim">Fake SOL only · no wallets</span></footer>';
    const drawer = document.createElement('aside'); drawer.className = 'drawer hide'; drawer.id = 'wallet'; document.body.appendChild(drawer);
    const toasts = document.createElement('div'); toasts.id = 'toasts'; document.body.appendChild(toasts);
    const tip = document.createElement('div'); tip.className = 'tip'; tip.id = 'tip'; document.body.appendChild(tip);

    $('#nav').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this.go(b.dataset.view); });
    $('#standUp').addEventListener('click', () => game.exitScreen());
    $('#walletBtn').addEventListener('click', (e) => { e.stopPropagation(); this.toggleWallet(); });
    document.addEventListener('click', (e) => { if (!e.target.closest('#wallet') && !e.target.closest('#walletBtn')) this.toggleWallet(false); });
    $('#search').addEventListener('input', (e) => { this.search = e.target.value.trim().toLowerCase(); if (this.view !== 'pulse') this.go('pulse'); else this.render(true); });
    $('#feed').addEventListener('click', (e) => { const ev = e.target.closest('[data-id]'); if (ev) this.openToken(ev.dataset.id); });
    $('#toasts').addEventListener('click', (e) => { const t = e.target.closest('.toast'); if (t && t.dataset.id) this.openToken(t.dataset.id); });
    // tooltips for anything with data-tip
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-tip]');
      const tipEl = $('#tip');
      if (!el) { tipEl.classList.remove('show'); return; }
      tipEl.textContent = el.dataset.tip;
      const r = el.getBoundingClientRect();
      tipEl.style.left = Math.min(window.innerWidth - 270, Math.max(6, r.left)) + 'px';
      tipEl.style.top = (r.bottom + 6) + 'px';
      tipEl.classList.add('show');
    });
    document.addEventListener('keydown', (e) => this.key(e));
    window.addEventListener('resize', () => this.render(true));
    this.go('pulse');
  };

  UI.saveSettings = function () { try { localStorage.setItem('bagholder.settings', JSON.stringify(this.settings)); } catch (e) { /* ignore */ } };

  UI.go = function (view) {
    if (view === 'token' && !this.tokenId) view = 'pulse';
    if (this.chart && this.chart.destroy) { this.chart.destroy(); this.chart = null; }
    this.view = view;
    for (const b of document.querySelectorAll('#nav button')) b.classList.toggle('on', b.dataset.view === view);
    const host = $('#view');
    host.innerHTML = '';
    const el = document.createElement('div'); el.className = 'view'; host.appendChild(el);
    this.el = el;
    this.cache = {};
    if (view === 'pulse') this.buildPulse(el);
    if (view === 'token') this.buildToken(el);
    if (view === 'launch') this.buildLaunch(el);
    if (view === 'portfolio') this.buildPortfolio(el);
    if (view === 'bank') this.buildBank(el);
    this.render(true);
  };
  UI.openToken = function (id) {
    const sim = this.game.sim;
    if (!sim.byId.get(id)) { this.toast('info', 'That coin is gone from the feed.'); return; }
    if (this.tokenId && this.tokenId !== id && !this.game.player.pos.has(this.tokenId) && !this.game.player.myCoins.includes(this.tokenId)) sim.keep.delete(this.tokenId);
    this.tokenId = id; sim.keep.add(id);
    this.tab = 'trades';
    this.go('token');
  };

  // ---- keyboard ---------------------------------------------------------------------------------
  UI.key = function (e) {
    const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === 'Escape') { if (inField) document.activeElement.blur(); else if ($('#modal')) this.closeModal(); else if (!$('#wallet').classList.contains('hide')) this.toggleWallet(false); else this.game.exitScreen(); return; }
    if (inField || e.ctrlKey || e.metaKey || e.altKey || this.game.modalOpen) return;
    const k = e.key.toLowerCase();
    if (k === '/') { e.preventDefault(); $('#search').focus(); return; }
    
    if (k === 'p') return this.go('pulse');
    if (k === 'l') return this.go('launch');
    if (k === 'w') return this.toggleWallet();
    if (this.view === 'token') {
      if ('1234'.includes(k)) return this.trade('buy', C.BUY_PRESETS[+k - 1]);
      const si = 'qwer'.indexOf(k);
      if (si >= 0) return this.trade('sell', C.SELL_PRESETS[si]);
    }
  };

  // ---- trading actions ---------------------------------------------------------------------------
  UI.trade = function (side, amt, tokenId) {
    const id = tokenId || this.tokenId;
    const p = this.game.player;
    const res = side === 'buy' ? p.buy(id, amt, this.settings) : p.sell(id, amt, this.settings);
    if (!res.ok) this.toast('fail', res.reason);
    else this.toast('info', (side === 'buy' ? 'Buying ' + F.sol(amt) + ' SOL' : 'Selling ' + Math.round(amt * 100) + '%') + ' of $' + this.game.sim.byId.get(id).ticker + '…', { id, short: true });
  };

  // ---- toasts ---------------------------------------------------------------------------------------
  UI.toast = function (kind, text, opt) {
    opt = opt || {};
    const host = $('#toasts');
    const ic = { buy: 'circle-check', sell: 'coins', fail: 'circle-x', rug: 'skull', call: 'megaphone', info: 'send' }[kind] || 'info';
    const el = document.createElement('div');
    el.className = 'toast ' + kind; if (opt.id) el.dataset.id = opt.id;
    el.innerHTML = icon(ic) + '<div>' + esc(text) + '</div>';
    host.appendChild(el);
    while (host.children.length > 5) host.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 220); }, opt.short ? 1600 : 3600);
  };

  // ---- wallet drawer (phone-style wallet) ---------------------------------------------------------------
  UI.toggleWallet = function (force) {
    const d = $('#wallet');
    const show = force != null ? force : d.classList.contains('hide');
    d.classList.toggle('hide', !show);
    if (show) { this.wTab = this.wTab || 'tokens'; this.renderWallet(true); }
  };
  UI.renderWallet = function (full) {
    const d = $('#wallet');
    if (d.classList.contains('hide')) return;
    const p = this.game.player, s = p.summary();
    const nw = p.netWorth();
    const ch = nw - p.startSol;
    if (full || !d.firstChild) {
      d.innerHTML = '<div class="w-top"><div class="w-acct"><span>' + icon('wallet', 'sm') + ' Degen Wallet · fake</span><button class="btn ghost sm" id="wClose" aria-label="Close wallet">' + icon('x', 'sm') + '</button></div>' +
        '<div class="w-bal" id="wUsd"></div><div id="wChg"></div></div>' +
        '<div class="w-actions"><button data-a="pulse">' + icon('activity') + 'Pulse</button><button data-a="launch">' + icon('rocket') + 'Launch</button><button data-a="portfolio">' + icon('chart-pie') + 'Stats</button><button data-a="bank">' + icon('landmark') + 'Bank</button></div>' +
        '<div class="tabs" style="padding:0 14px"><button data-w="tokens">Tokens</button><button data-w="activity">Activity</button></div>' +
        '<div class="w-list" id="wList"></div>';
      $('#wClose', d).onclick = () => this.toggleWallet(false);
      d.querySelector('.w-actions').onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        this.toggleWallet(false);
        this.go(b.dataset.a);
      };
      d.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) { this.wTab = b.dataset.w; this.renderWallet(true); } };
      $('#wList', d).onclick = (e) => { const it = e.target.closest('[data-id]'); if (it) { this.toggleWallet(false); this.openToken(it.dataset.id); } };
    }
    for (const b of d.querySelectorAll('.tabs button')) b.classList.toggle('on', b.dataset.w === this.wTab);
    setText($('#wUsd', d), '$' + (nw * C.SOL_USD).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }));
    setHTML($('#wChg', d), '<span class="' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '+' : '-') + '$' + Math.abs(ch * C.SOL_USD).toFixed(2) + ' · ' + F.pct((nw / p.startSol - 1) * 100) + '</span> <span class="dim">this run</span>');
    let html = '';
    if (this.wTab === 'tokens') {
      html += '<div class="w-item"><div class="solcoin">' + SOL + '</div><div><b>Solana</b><br><small>' + F.sol(p.sol) + ' SOL</small></div><div class="r"><b>$' + (p.sol * C.SOL_USD).toFixed(2) + '</b><small>fake</small></div></div>';
      for (const pos of p.pos.values()) {
        if (pos.tokens < 1) continue;
        const v = p.markValue(pos), pnl = v - pos.cost;
        html += '<div class="w-item" data-id="' + pos.id + '"><div class="tok-ava">' + avatar(pos) + '</div><div><b>' + esc(pos.name) + '</b><br><small>' + F.num(pos.tokens) + ' ' + esc(pos.ticker) + '</small></div><div class="r"><b>$' + (v * C.SOL_USD).toFixed(2) + '</b><small class="' + (pnl >= 0 ? 'up' : 'down') + '">' + F.signedSol(pnl) + ' SOL</small></div></div>';
      }
      if (!p.openCount()) html += '<div class="empty">No bags yet. Hit a ' + icon('zap', 'sm') + ' button on Pulse to ape.</div>';
    } else {
      html += this.activityHTML(p.activity.slice(0, 40));
    }
    setHTML($('#wList', d), html);
    void s;
  };
  UI.activityHTML = function (list) {
    if (!list.length) return '<div class="empty">Nothing yet.</div>';
    return list.map((a) => {
      const ic = { buy: 'arrow-down-left', sell: 'arrow-up-right', fail: 'circle-x', launch: 'rocket', kol: 'megaphone' }[a.type];
      const title = { buy: a.dev ? 'Dev buy' : 'Bought', sell: 'Sold', fail: 'Failed ' + a.side, launch: 'Launched', kol: 'Paid @' + a.kol }[a.type];
      const amt = a.type === 'buy' ? '<span class="down">-' + F.sol(a.sol) + ' SOL</span>' : a.type === 'sell' ? '<span class="up">+' + F.sol(a.sol) + ' SOL</span>' : a.type === 'fail' ? '<span class="dim">-' + F.sol(a.fee) + ' fee</span>' : a.sol ? '<span class="down">-' + F.sol(a.sol) + ' SOL</span>' : '';
      const sub = a.type === 'sell' ? '<small class="' + (a.pnl >= 0 ? 'up' : 'down') + '">PnL ' + F.signedSol(a.pnl) + '</small>' : a.type === 'fail' ? '<small>' + esc(a.why) + '</small>' : a.mc ? '<small>at ' + F.usd(a.mc) + ' MC</small>' : '<small>' + F.clock(a.t) + '</small>';
      return '<div class="w-item" data-id="' + a.id + '"><div class="solcoin">' + icon(ic) + '</div><div><b>' + title + ' $' + esc(a.ticker) + '</b><br>' + sub + '</div><div class="r">' + amt + '<small>' + F.clock(a.t) + '</small></div></div>';
    }).join('');
  };

  // ---- per tick render -------------------------------------------------------------------------------
  UI.render = function (full) {
    const g = this.game, p = g.player, sim = g.sim;
    const nw = p.netWorth();
    setText($('#wBal'), F.sol(p.sol, 2));
    const pc = (nw / p.startSol - 1) * 100;
    const wp = $('#wPnl'); setText(wp, F.pct(pc)); wp.className = pc >= 0 ? 'up' : 'down';
    setHTML($('#clock'), icon('clock', 'sm') + '<b>' + esc(g.clock.label()) + '</b>');
    setHTML($('#cashChip'), icon('banknote', 'sm') + '<b' + (g.bills.debt > 0 ? ' class="down"' : '') + '>$' + Math.floor(g.bills.cash).toLocaleString() + (g.bills.debt > 0 ? ' · debt $' + Math.ceil(g.bills.debt) : '') + '</b>');
    $('#live').classList.toggle('paused', !g.speed);
    setHTML($('#live'), '<i></i>' + (g.speed ? 'LIVE' : 'PAUSED'));
    setText($('#mkt'), sim.stats.launched + ' launched · ' + sim.stats.migrated + ' graduated · ' + sim.stats.rugged + ' rugged');
    const nt = $('#navToken');
    const tk = this.tokenId && sim.byId.get(this.tokenId);
    nt.style.display = tk ? '' : 'none';
    if (tk) setText(nt.querySelector('span'), '$' + tk.ticker);
    this.renderFeed();
    this.renderWallet(false);
    if (this.view === 'pulse') this.renderPulse(full);
    else if (this.view === 'token') this.renderToken(full);
    else if (this.view === 'portfolio') this.renderPortfolio(full);
    else if (this.view === 'launch') this.renderLaunch(full);
    else if (this.view === 'bank') this.renderBank(full);
  };

  UI.renderFeed = function () {
    const ev = this.game.sim.events;
    const feed = $('#feed');
    const lastSeen = this.feedSeen || 0;
    const fresh = [];
    for (let i = ev.length - 1; i >= 0 && fresh.length < 14; i--) {
      if (ev[i]._n == null) ev[i]._n = ++BH._evn || (BH._evn = 1);
      if (ev[i]._n <= lastSeen) break;
      if (ev[i].type === 'launch' && !ev[i].you) continue;
      fresh.push(ev[i]);
    }
    if (ev.length) this.feedSeen = ev[ev.length - 1]._n;
    const ic = { call: 'megaphone', migrate: 'graduation-cap', rug: 'skull', devsold: 'user-minus', news: 'flame', ath: 'mountain', launch: 'rocket' };
    for (let i = fresh.length - 1; i >= 0; i--) {
      const e = fresh[i];
      const el = document.createElement('span');
      el.className = 'ev ' + e.type; el.dataset.id = e.id;
      el.innerHTML = icon(ic[e.type] || 'dot', 'sm') + esc(e.text);
      feed.prepend(el);
    }
    while (feed.children.length > 24) feed.lastChild.remove();
  };

  // ---- Pulse ---------------------------------------------------------------------------------------------
  UI.buildPulse = function (el) {
    const col = (id, title, ic, tip) => '<section class="col"><div class="colhead"><h2 data-tip="' + tip + '">' + icon(ic) + title + '</h2><span class="count" id="n-' + id + '">0</span><div class="spacer"></div>' +
      (id === 'new' ? '<span class="dim" style="font-size:12px">Quick buy</span><div class="amt" style="height:28px;width:96px"><input id="quick" value="' + this.settings.quick + '" aria-label="Quick buy amount in SOL">' + SOL + '</div>' : '') +
      '</div><div class="rows" id="rows-' + id + '"></div></section>';
    el.innerHTML = '<div class="pulse">' +
      col('new', 'New Pairs', 'sparkles', 'Fresh launches still low on the bonding curve') +
      col('final', 'Final Stretch', 'flame', 'Bonding curve over ' + C.FINAL_STRETCH_PCT + '%: close to graduating') +
      col('mig', 'Migrated', 'graduation-cap', 'Graduated: now trading in a DEX pool') + '</div>';
    $('#quick', el).addEventListener('change', (e) => { const v = parseFloat(e.target.value); if (v > 0) { this.settings.quick = v; this.saveSettings(); this.render(true); } else e.target.value = this.settings.quick; });
    el.addEventListener('click', (e) => {
      const q = e.target.closest('.qb');
      if (q) { e.stopPropagation(); this.trade('buy', this.settings.quick, q.dataset.id); return; }
      const row = e.target.closest('.row');
      if (row) this.openToken(row.dataset.id);
    });
    this.rowEls = new Map();
  };

  UI.rowEl = function (tk) {
    let r = this.rowEls.get(tk.id);
    if (r) return r;
    r = document.createElement('div');
    r.className = 'row'; r.dataset.id = tk.id;
    r.innerHTML = '<div class="ava-wrap"><svg class="ring" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" fill="none" stroke="#1f2228" stroke-width="3"/><circle class="prog" cx="26" cy="26" r="24" fill="none" stroke="#f4b23e" stroke-width="3" stroke-linecap="round" stroke-dasharray="150.8" stroke-dashoffset="150.8"/></svg><div class="tok-ava">' + avatar(tk) + '</div></div>' +
      '<div class="r-body"><div class="r-l1"><span class="r-name"></span><span class="r-tk"></span><span class="ddq" data-dd="' + tk.id + '">' + icon('feather', 'sm') + '</span></div><div class="r-l2"><span class="r-age"></span><span class="r-soc"></span><span class="r-hold"></span></div><div class="r-stats"></div><div class="badges"></div></div>' +
      '<div class="r-side"><div class="r-mc"><div class="lbl">MC</div><b></b></div><button class="qb" data-id="' + tk.id + '"></button></div>';
    r._f = { prog: r.querySelector('.prog'), name: r.querySelector('.r-name'), tk: r.querySelector('.r-tk'), age: r.querySelector('.r-age'), soc: r.querySelector('.r-soc'), hold: r.querySelector('.r-hold'), stats: r.querySelector('.r-stats'), badges: r.querySelector('.badges'), mc: r.querySelector('.r-mc b'), qb: r.querySelector('.qb') };
    setText(r._f.name, tk.name);
    setText(r._f.tk, '$' + tk.ticker);
    r._f.soc.innerHTML = (tk.socials.x ? '<span data-tip="Has an X account">' + icon('at-sign', 'sm') + '</span>' : '') + (tk.socials.tg ? '<span data-tip="Has a Telegram">' + icon('send', 'sm') + '</span>' : '') + (tk.socials.web ? '<span data-tip="Has a website">' + icon('globe', 'sm') + '</span>' : '');
    this.rowEls.set(tk.id, r);
    return r;
  };

  UI.renderPulse = function () {
    const sim = this.game.sim, p = this.game.player;
    const q = this.search;
    const match = (tk) => !q || tk.name.toLowerCase().includes(q) || tk.ticker.toLowerCase().includes(q) || tk.ca.toLowerCase().includes(q);
    const live = sim.tokens.filter((t) => !t.dead && match(t));
    const cols = {
      new: live.filter((t) => t.stage === 'curve' && sim.progress(t) < C.FINAL_STRETCH_PCT).sort((a, b) => b.born - a.born).slice(0, 30),
      final: live.filter((t) => t.stage === 'curve' && sim.progress(t) >= C.FINAL_STRETCH_PCT).sort((a, b) => sim.progress(b) - sim.progress(a)).slice(0, 30),
      mig: live.filter((t) => t.stage === 'amm').sort((a, b) => b.migratedAt - a.migratedAt).slice(0, 30),
    };
    const used = new Set();
    for (const [id, list] of Object.entries(cols)) {
      const host = $('#rows-' + id);
      if (!host) continue;
      setText($('#n-' + id), String(list.length));
      let prev = null;
      for (const tk of list) {
        const r = this.rowEl(tk);
        used.add(tk.id);
        this.fillRow(r, tk, p);
        const want = prev ? prev.nextSibling : host.firstChild;
        if (r.parentNode !== host || want !== r) host.insertBefore(r, want);
        prev = r;
      }
      // drop rows that left this column
      for (const ch of Array.from(host.children)) if (!list.some((t) => t.id === ch.dataset.id)) ch.remove();
      if (!list.length && !host.querySelector('.empty')) host.innerHTML = '<div class="empty">' + (q ? 'No matches.' : id === 'mig' ? 'Nothing has graduated yet. Most coins never do.' : id === 'final' ? 'No coin is close to graduating right now.' : 'Waiting for launches…') + '</div>';
      else if (list.length) { const em = host.querySelector('.empty'); if (em) em.remove(); }
    }
    for (const id of Array.from(this.rowEls.keys())) if (!used.has(id)) { const r = this.rowEls.get(id); r.remove(); this.rowEls.delete(id); }
  };

  UI.fillRow = function (r, tk, p) {
    const sim = this.game.sim, f = r._f;
    const prog = sim.progress(tk);
    f.prog.setAttribute('stroke-dashoffset', String(150.8 * (1 - prog / 100)));
    f.prog.setAttribute('stroke', tk.stage === 'amm' ? '#34d8a0' : '#f4b23e');
    setText(f.age, F.age(sim.t - tk.born));
    const pos = p.pos.get(tk.id);
    r.classList.toggle('held', !!(pos && pos.tokens >= 1));
    setHTML(f.hold, pos && pos.tokens >= 1 ? '<span class="brand" data-tip="You hold this">' + icon('briefcase', 'sm') + '</span>' : tk.isPlayer ? '<span class="brand" data-tip="Your coin">' + icon('crown', 'sm') + '</span>' : '');
    const risk = sim.risk(tk);
    const v5 = sim.vol5m(tk);
    setHTML(f.stats, '<span data-tip="Volume (5m)">V <b>' + F.usd(v5 * C.SOL_USD) + '</b></span><span data-tip="Holders">' + icon('users', 'sm') + ' <b>' + risk.holders + '</b></span><span data-tip="Transactions: buys / sells">TX <b class="up">' + tk.buys + '</b>/<b class="down">' + tk.sells + '</b></span>' + (tk.stage === 'curve' ? '<span data-tip="Bonding curve progress">' + icon('gauge', 'sm') + ' <b>' + prog.toFixed(0) + '%</b></span>' : '<span data-tip="Liquidity">LQ <b>' + F.usd(sim.liquidity(tk) * C.SOL_USD) + '</b></span>'));
    let b = '';
    b += '<span class="bdg ' + cls(risk.top10, 30, 50) + '" data-tip="Top 10 holders own this share">' + icon('users-round', 'sm') + F.pctPlain(risk.top10) + '</span>';
    b += tk.devSold ? '<span class="bdg bad" data-tip="Dev sold their bag">' + icon('user-minus', 'sm') + 'DS</span>' : '<span class="bdg ' + cls(risk.dev, 5, 12) + '" data-tip="Dev holds">' + icon('code', 'sm') + F.pctPlain(risk.dev) + '</span>';
    if (risk.snipers > 0.05) b += '<span class="bdg ' + cls(risk.snipers, 5, 15) + '" data-tip="Snipers hold">' + icon('crosshair', 'sm') + F.pctPlain(risk.snipers) + '</span>';
    if (risk.bundle > 0.05) b += '<span class="bdg ' + cls(risk.bundle, 8, 20) + '" data-tip="Same-block bundle holds">' + icon('boxes', 'sm') + F.pctPlain(risk.bundle) + '</span>';
    if (tk.kol && tk.kol.state !== 'wait' && tk.kol.state !== 'bought') b += '<span class="bdg info" data-tip="Called by @' + tk.kol.handle + '">' + icon('megaphone', 'sm') + 'Called</span>';
    if (tk.rugged) b += '<span class="bdg bad">' + icon('skull', 'sm') + 'Rugged</span>';
    setHTML(f.badges, b);
    const mc = sim.mc(tk);
    setText(f.mc, F.usd(mc));
    // flash on new trades
    const lt = tk.trades[tk.trades.length - 1];
    if (lt && r._lt !== lt) { if (r._lt) { r.classList.remove('flash-buy', 'flash-sell'); void r.offsetWidth; r.classList.add(lt.side === 'buy' ? 'flash-buy' : 'flash-sell'); } r._lt = lt; }
    setHTML(f.qb, icon('zap', 'sm') + F.sol(this.settings.quick));
  };

  // ---- Token page -----------------------------------------------------------------------------------------
  UI.buildToken = function (el) {
    const tk = this.game.sim.byId.get(this.tokenId);
    el.innerHTML = '<div class="tpage"><div class="tmain">' +
      '<div class="thead" id="thead"></div>' +
      '<div class="chartbox" id="pc"></div>' +
      '<div class="bottom"><div class="tabs" id="ttabs"><button data-t="trades">' + icon('list', 'sm') + 'Trades</button><button data-t="holders">' + icon('users', 'sm') + 'Holders</button><button data-t="top">' + icon('trophy', 'sm') + 'Top traders</button><button data-t="mine">' + icon('briefcase', 'sm') + 'Your trades</button></div><div class="tbl-wrap" id="tbl"></div></div>' +
      '</div><aside class="tside" id="tside"></aside></div>';
    this.chart = new BH.ProChart($('#pc', el), { icon, drawings: new BH.Drawings(this.game.drawings), game: this.game, assetBase: '../assets/', onBubble: (b) => UI.trackDialog && UI.trackDialog(b) });
    $('#ttabs', el).onclick = (e) => { const b = e.target.closest('button'); if (b) { this.tab = b.dataset.t; this.render(true); } };
    this.buildSide($('#tside', el), tk);
  };

  UI.buildSide = function (side, tk) {
    const mine = tk.isPlayer;
    side.innerHTML =
      '<div class="panel"><div class="seg bs" id="bs"><button data-side="buy">Buy</button><button data-side="sell">Sell</button></div>' +
        '<div class="presets" id="presets"></div>' +
        '<div class="amt"><input id="amt" inputmode="decimal" aria-label="Amount"><span id="amtUnit"></span></div>' +
        '<div class="kv"><span>You get</span><b id="quoteOut">—</b></div>' +
        '<div class="kv"><span>Price impact</span><b id="quoteImp">—</b></div>' +
        '<div class="kv"><span>Fees (curve/DEX + priority)</span><b id="quoteFee">—</b></div>' +
        '<div class="tired" id="tired" style="display:none" data-tip="Low focus: your orders land one block late. Sleep or eat to fix it.">' + icon('battery-low', 'sm') + ' Tired: +1 block</div>' +
        '<button class="btn lg" id="go"></button>' +
        '<div class="settingsrow" data-tip="Max price move you accept before the tx fails"><span>' + icon('sliders-horizontal', 'sm') + ' Slippage</span><input class="input" id="slip" value="' + Math.round(this.settings.slippage * 100) + '">%' +
          '<span style="margin-left:8px" data-tip="Priority fee. ' + C.FAST_PRIORITY + '+ SOL lands before the bots in the same block">' + icon('fuel', 'sm') + ' Prio</span><input class="input" id="prio" value="' + this.settings.priority + '"></div>' +
        '<div class="note">Keys: <kbd>1</kbd>–<kbd>4</kbd> buy presets · <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd><kbd>R</kbd> sell 25/50/75/100%</div></div>' +
      '<div class="panel" id="posPanel"></div>' +
      (mine ? '<div class="panel"><h3>' + icon('crown', 'sm') + 'Creator tools</h3><div class="kv"><span>Creator fees earned</span><b id="cfees">0</b></div>' +
        '<div class="note">Pay a caller to shill your coin. They front-run their own call and sell into the followers, like the real ones.</div>' +
        '<div class="presets" style="grid-template-columns:repeat(3,1fr)" id="kols">' + C.KOL_HIRE_COST.map((c, i) => '<button data-k="' + i + '" data-tip="Hire a ' + ['small', 'mid', 'big'][i] + ' account for ' + c + ' SOL">' + ['Small', 'Mid', 'Big'][i] + '<br><small class="dim">' + c + ' SOL</small></button>').join('') + '</div></div>' : '') +
      '<div class="panel"><h3>' + icon('gauge', 'sm') + '<span id="curveTitle">Bonding curve</span></h3><div class="curvebar"><i id="curveBar"></i></div><div class="kv"><span id="curveTxt"></span><b id="curvePct"></b></div><div class="note" id="curveNote"></div></div>' +
      '<div class="panel"><h3>' + icon('shield-alert', 'sm') + 'Risk scan</h3><div class="riskgrid" id="riskgrid"></div><div class="note">Estimated from on-chain-style patterns. Insiders look like normal buyers, so they are only partly caught.</div></div>' +
      '<div class="panel"><h3>' + icon('info', 'sm') + 'About</h3><div class="note" id="about"></div></div>';
    $('#bs', side).onclick = (e) => { const b = e.target.closest('button'); if (b) { this.side = b.dataset.side; this.amount = this.side === 'buy' ? '0.5' : '50'; this.render(true); } };
    $('#presets', side).onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const v = +b.dataset.v;
      this.trade(this.side, this.side === 'buy' ? v : v / 100);
    };
    $('#amt', side).oninput = (e) => { this.amount = e.target.value; this.renderQuote(); };
    $('#go', side).onclick = () => {
      const v = parseFloat(this.amount);
      if (!(v > 0)) return this.toast('fail', 'Enter an amount');
      this.trade(this.side, this.side === 'buy' ? v : Math.min(100, v) / 100);
    };
    $('#slip', side).onchange = (e) => { const v = parseFloat(e.target.value); if (v > 0 && v <= 100) { this.settings.slippage = v / 100; this.saveSettings(); } else e.target.value = Math.round(this.settings.slippage * 100); };
    $('#prio', side).onchange = (e) => { const v = parseFloat(e.target.value); if (v >= 0 && v < 1) { this.settings.priority = v; this.saveSettings(); } else e.target.value = this.settings.priority; };
    const kols = $('#kols', side);
    if (kols) kols.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const res = this.game.player.hireKol(tk.id, +b.dataset.k);
      if (!res.ok) this.toast('fail', res.reason); else this.toast('call', '@' + res.handle + ' is shilling $' + tk.ticker, { id: tk.id });
    };
    $('#posPanel', side).onclick = (e) => { const b = e.target.closest('[data-sellall]'); if (b) this.trade('sell', 1); };
  };

  UI.renderQuote = function () {
    const sim = this.game.sim, tk = sim.byId.get(this.tokenId), p = this.game.player;
    if (!tk) return;
    const v = parseFloat(this.amount);
    const pos = p.pos.get(tk.id);
    let q = null;
    if (v > 0) q = this.side === 'buy' ? sim.quote(tk, 'buy', v) : pos ? sim.quote(tk, 'sell', pos.tokens * Math.min(100, v) / 100) : null;
    setText($('#quoteOut'), q ? (this.side === 'buy' ? F.num(q.out) + ' $' + tk.ticker : F.sol(q.out) + ' SOL') : '—');
    const imp = $('#quoteImp');
    setText(imp, q ? F.pctPlain(Math.max(0, q.impact * 100)) : '—');
    if (imp) imp.className = q && q.impact > 0.1 ? 'down' : '';
    setText($('#quoteFee'), q ? F.sol(q.fee + this.settings.priority + C.BASE_TX_FEE) + ' SOL' : '—');
    const tired = $('#tired'); if (tired) tired.style.display = this.game.life.orderDelayBlocks() ? '' : 'none';
  };

  // one source of truth for position numbers (side panel, instant panel, header)
  UI.posStats = function (pos) {
    const p = this.game.player;
    if (!pos) return { value: 0, cost: 0, invested: 0, realized: 0, sold: 0, unreal: 0, total: 0, pct: 0 };
    const value = p.markValue(pos), cost = pos.cost || 0, invested = pos.invested || 0, realized = pos.realized || 0;
    const sold = Math.max(0, realized + invested - cost), unreal = value - cost, total = unreal + realized;
    return { value, cost, invested, realized, sold, unreal, total, pct: invested > 0 ? total / invested * 100 : 0 };
  };
  UI.renderPos = function () {
    const sim = this.game.sim, p = this.game.player, tk = sim.byId.get(this.tokenId), el = $('#posPanel');
    if (!tk || !el) return;
    const pos = p.pos.get(tk.id);
    let ph = '<h3>' + icon('briefcase', 'sm') + 'Your position</h3>';
    if (pos && pos.tokens >= 1) {
      const s = this.posStats(pos);
      ph += '<div class="pos-card"><div class="kv"><span>Value now</span><b>' + F.sol(s.value) + ' SOL</b></div><div class="big-pnl ' + (s.total >= 0 ? 'up' : 'down') + '">' + F.signedSol(s.total) + ' SOL <span style="font-size:14px">' + F.pct(s.pct) + '</span></div>' +
        '<div class="kv"><span>Invested</span><b>' + F.sol(s.invested) + ' SOL</b></div><div class="kv"><span>Sold</span><b>' + F.sol(s.sold) + ' SOL</b></div>' +
        '<div class="kv"><span>Holding</span><b>' + F.num(pos.tokens) + ' (' + F.pctPlain(pos.tokens / C.TOTAL_SUPPLY * 100) + ')</b></div>' +
        '<div class="kv"><span>Unrealized / realized</span><b><span class="' + (s.unreal >= 0 ? 'up' : 'down') + '">' + F.signedSol(s.unreal) + '</span> / <span class="' + (s.realized >= 0 ? 'up' : 'down') + '">' + F.signedSol(s.realized) + '</span></b></div>' +
        '<button class="btn sell sm" data-sellall="1">' + icon('log-out', 'sm') + 'Sell all</button></div>';
    } else ph += '<div class="note">No bag. Balance: <b>' + F.sol(p.sol) + ' SOL</b></div>';
    const pending = sim.orders.filter((o) => o.tokenId === tk.id).length;
    if (pending) ph += '<div class="note">' + icon('loader', 'sm') + ' ' + pending + ' tx waiting for the next block…</div>';
    setHTML(el, ph);
  };
  UI.renderToken = function (full) {
    const sim = this.game.sim, p = this.game.player;
    const tk = sim.byId.get(this.tokenId);
    if (!tk) { this.go('pulse'); return; }
    const mc = sim.mc(tk), risk = sim.risk(tk);
    const ch5 = sim.change(tk, 60);
    setHTML($('#thead'),
      '<div class="tok-ava">' + avatar(tk) + '</div>' +
      '<div class="nm"><b>' + esc(tk.name) + ' <span class="ddq" data-dd="' + tk.id + '">' + icon('feather', 'sm') + '</span>' + ' <span class="muted" style="font-weight:500">$' + esc(tk.ticker) + '</span>' + (tk.isPlayer ? ' <span class="bdg warn">' + icon('crown', 'sm') + 'Your coin</span>' : '') + (tk.rugged ? ' <span class="bdg bad">' + icon('skull', 'sm') + 'Rugged</span>' : '') + (tk.dead ? ' <span class="bdg bad">Dead</span>' : '') + '</b>' +
        '<span class="ca">' + icon('copy', 'sm') + F.short(tk.ca) + ' · ' + F.age(sim.t - tk.born) + ' old · ' + (tk.stage === 'amm' ? 'DEX pool' : 'Bonding curve') + '</span></div>' +
      '<div class="stat"><span>MARKET CAP</span><b class="big">' + F.usd(mc) + '</b></div>' +
      '<div class="stat bal"><span>YOUR SOL</span><b>' + F.sol(p.sol, 2) + ' SOL</b></div>' + (p.pos.get(tk.id) && p.pos.get(tk.id).tokens >= 1 ? '<div class="stat bal"><span>YOUR BAG</span><b class="' + (this.posStats(p.pos.get(tk.id)).total >= 0 ? 'up' : 'down') + '">' + F.sol(this.posStats(p.pos.get(tk.id)).value) + ' SOL</b></div>' : '') +
      '<div class="stat"><span>1M CHANGE</span><b class="' + (ch5 >= 0 ? 'up' : 'down') + '">' + F.pct(ch5) + '</b></div>' +
      '<div class="stat"><span>PRICE</span><b>' + F.price(sim.price(tk)) + ' SOL</b></div>' +
      '<div class="stat"><span>LIQUIDITY</span><b>' + F.usd(sim.liquidity(tk) * C.SOL_USD) + '</b></div>' +
      '<div class="stat"><span>VOL 5M</span><b>' + F.usd(sim.vol5m(tk) * C.SOL_USD) + '</b></div>' +
      '<div class="stat"><span>ATH</span><b>' + F.usd(tk.athMc) + '</b></div>' +
      '<div class="stat"><span>HOLDERS</span><b>' + risk.holders + '</b></div>');
    this.chart.setData(tk, sim.t);
    for (const b of document.querySelectorAll('#ttabs button')) b.classList.toggle('on', b.dataset.t === this.tab);
    this.renderTable(tk, risk, full);
    // side panel
    for (const b of document.querySelectorAll('#bs button')) b.classList.toggle('on', b.dataset.side === this.side);
    const go = $('#go');
    go.className = 'btn lg ' + (this.side === 'buy' ? 'buy' : 'sell');
    setHTML(go, this.side === 'buy' ? icon('zap') + 'Buy $' + esc(tk.ticker) : icon('coins') + 'Sell $' + esc(tk.ticker));
    setHTML($('#presets'), (this.side === 'buy' ? C.BUY_PRESETS.map((v) => '<button data-v="' + v + '">' + v + '</button>') : C.SELL_PRESETS.map((v) => '<button data-v="' + v * 100 + '">' + v * 100 + '%</button>')).join(''));
    const amt = $('#amt');
    if (document.activeElement !== amt) amt.value = this.amount;
    setHTML($('#amtUnit'), this.side === 'buy' ? SOL : '<span class="dim">%</span>');
    this.renderQuote();
    try { this.renderPos(); } catch (e) { /* keep rendering the rest */ }
    if ($('#cfees')) setText($('#cfees'), F.sol(tk.creatorFees) + ' SOL');
    // curve
    const prog = sim.progress(tk);
    $('#curveBar').style.width = prog + '%';
    setText($('#curveTitle'), tk.stage === 'amm' ? 'Graduated' : 'Bonding curve');
    setText($('#curvePct'), prog.toFixed(1) + '%');
    setText($('#curveTxt'), tk.stage === 'amm' ? 'Pool: ' + F.sol(tk.poolSol) + ' SOL / ' + F.num(tk.poolTok) : F.sol(tk.realSol) + ' / ~85 SOL raised');
    setText($('#curveNote'), tk.stage === 'amm' ? 'Migrated at ' + F.clock(tk.migratedAt - tk.born) + '. DEX fee ' + (C.AMM_FEE * 100).toFixed(2) + '%.' : 'When ' + F.num(C.CURVE_REAL_TOKENS) + ' tokens are sold the coin graduates and its liquidity moves to a DEX pool. ' + F.num(C.CURVE_REAL_TOKENS - tk.realTok) + ' left. Curve fee ' + (C.CURVE_FEE * 100).toFixed(2) + '%.');
    const rk = (lbl, ic, v, good, bad, tip) => '<div class="risk" data-tip="' + tip + '"><span>' + icon(ic, 'sm') + lbl + '</span><b class="' + (v >= bad ? 'down' : v >= good ? 'brand' : 'up') + '">' + F.pctPlain(v) + '</b></div>';
    setHTML($('#riskgrid'),
      rk('Top 10', 'users-round', risk.top10, 30, 50, 'Share of supply in the 10 biggest wallets') +
      (tk.devSold ? '<div class="risk"><span>' + icon('code', 'sm') + 'Dev</span><b class="down">Sold</b></div>' : rk('Dev', 'code', risk.dev, 5, 12, 'Dev wallet holds')) +
      rk('Snipers', 'crosshair', risk.snipers, 5, 15, 'Wallets that bought in the first seconds') +
      rk('Bundle', 'boxes', risk.bundle, 8, 20, 'Wallets that bought in the same block as the launch') +
      rk('Insiders', 'eye', risk.insiders, 5, 12, 'Linked wallets that we could spot (estimate)') +
      '<div class="risk" data-tip="Wash-trading bot detected"><span>' + icon('bot', 'sm') + 'Bot vol</span><b class="' + (tk.bot ? 'brand' : 'up') + '">' + (tk.bot ? 'Yes' : 'No') + '</b></div>');
    setHTML($('#about'), esc(tk.desc || 'No description.') + '<br><span class="dim">CA ' + tk.ca + '</span>' + (tk.kol && tk.kol.state !== 'wait' ? '<br>' + icon('megaphone', 'sm') + ' Called by @' + tk.kol.handle + (tk.kol.big ? ' (big account)' : '') : ''));
  };

  UI.renderTable = function (tk, risk) {
    const sim = this.game.sim;
    const host = $('#tbl');
    const kindTag = (k) => '<span class="kind ' + k + '">' + ({ you: 'YOU', dev: 'DEV', sniper: 'SNIPER', bundler: 'BUNDLE', insider: 'EARLY', kol: 'KOL', whale: 'WHALE', bot: 'BOT', retail: 'TRADER' }[k] || k) + '</span>';
    let html = '';
    if (this.tab === 'trades' || this.tab === 'mine') {
      const list = tk.trades.filter((t) => this.tab === 'trades' || t.you).slice(-60).reverse();
      const last = list[0];
      if (host._last === last && host._tab === this.tab && host._n === list.length) return;
      host._last = last; host._tab = this.tab;
      const prevN = host._n || 0; host._n = list.length;
      html = '<table class="tbl"><thead><tr><th>Age</th><th class="l">Type</th><th class="l">Trader</th><th>MC</th><th>Amount</th><th>SOL</th></tr></thead><tbody>' +
        list.map((t, i) => '<tr class="' + (t.you ? 'you ' : '') + (i < list.length - prevN && prevN ? 'new' : '') + '"><td class="dim">' + F.age(sim.t - t.t) + '</td><td class="l ' + (t.side === 'buy' ? 'up' : 'down') + '">' + (t.side === 'buy' ? 'Buy' : 'Sell') + '</td><td class="l">' + kindTag(t.kind === 'retail' ? 'retail' : t.kind) + ' <span class="dim">' + F.short(t.addr) + '</span></td><td>' + F.usd(t.mc) + '</td><td>' + F.num(t.tok) + '</td><td class="' + (t.side === 'buy' ? 'up' : 'down') + '">' + F.sol(t.sol) + '</td></tr>').join('') +
        '</tbody></table>' + (list.length ? '' : '<div class="empty">' + (this.tab === 'mine' ? 'You have not traded this coin.' : 'No trades yet.') + '</div>');
    } else if (this.tab === 'holders') {
      host._last = null;
      const list = risk.list.slice(0, 40);
      const price = sim.price(tk);
      html = '<table class="tbl"><thead><tr><th>#</th><th class="l">Wallet</th><th class="l">Share</th><th>Tokens</th><th>Value</th><th>Avg entry MC</th></tr></thead><tbody>' +
        (tk.stage === 'curve' ? '<tr><td class="dim">—</td><td class="l">' + icon('gauge', 'sm') + ' Bonding curve</td><td class="l"><div class="bar"><i style="width:' + ((C.CURVE_REAL_TOKENS - tk.realTok + (C.TOTAL_SUPPLY - C.CURVE_REAL_TOKENS)) / C.TOTAL_SUPPLY * 100) + '%"></i></div></td><td>' + F.num(C.CURVE_REAL_TOKENS - tk.realTok) + '</td><td>—</td><td>—</td></tr>' : '<tr><td class="dim">—</td><td class="l">' + icon('droplets', 'sm') + ' DEX pool</td><td class="l">' + F.pctPlain(tk.poolTok / C.TOTAL_SUPPLY * 100) + '</td><td>' + F.num(tk.poolTok) + '</td><td>' + F.sol(tk.poolSol) + ' SOL</td><td>—</td></tr>') +
        list.map((h, i) => { const sh = h.tokens / C.TOTAL_SUPPLY * 100; return '<tr class="' + (h.addr === 'YOU' ? 'you' : '') + '"><td class="dim">' + (i + 1) + '</td><td class="l">' + kindTag(h.addr === 'YOU' ? 'you' : h.kind === 'insider' && h.tokens / C.TOTAL_SUPPLY < 0.004 ? 'retail' : h.kind) + ' <span class="dim">' + F.short(h.addr) + '</span></td><td class="l"><div style="display:flex;gap:8px;align-items:center"><div class="bar"><i style="width:' + Math.min(100, sh * 5) + '%"></i></div>' + F.pctPlain(sh) + '</div></td><td>' + F.num(h.tokens) + '</td><td>' + F.sol(h.tokens * price) + ' SOL</td><td>' + F.usd(h.entry * C.TOTAL_SUPPLY * C.SOL_USD) + '</td></tr>'; }).join('') + '</tbody></table>';
    } else {
      host._last = null;
      const price = sim.price(tk);
      const list = Array.from(tk.holders.values()).map((h) => ({ h, pnl: h.sold + h.tokens * price - h.bought })).sort((a, b) => b.pnl - a.pnl).slice(0, 30);
      html = '<table class="tbl"><thead><tr><th>#</th><th class="l">Wallet</th><th>Bought</th><th>Sold</th><th>Holding</th><th>PnL</th></tr></thead><tbody>' +
        list.map((x, i) => '<tr class="' + (x.h.addr === 'YOU' ? 'you' : '') + '"><td class="dim">' + (i + 1) + '</td><td class="l">' + kindTag(x.h.addr === 'YOU' ? 'you' : x.h.kind) + ' <span class="dim">' + F.short(x.h.addr) + '</span></td><td>' + F.sol(x.h.bought) + '</td><td>' + F.sol(x.h.sold) + '</td><td>' + F.sol(x.h.tokens * price) + '</td><td class="' + (x.pnl >= 0 ? 'up' : 'down') + '">' + F.signedSol(x.pnl) + ' SOL</td></tr>').join('') + '</tbody></table>';
    }
    host.innerHTML = html;
  };

  // ---- Launch page -------------------------------------------------------------------------------------------
  UI.buildLaunch = function (el) {
    const f = this.launchForm;
    el.innerHTML = '<div class="page"><h1>' + icon('rocket', 'lg') + 'Launch a coin</h1><p>Create a coin on the bonding curve. Free to create, you only pay network rent. Everything is fake.</p>' +
      '<div class="grid2"><div class="card"><h2>' + icon('pencil') + 'Details</h2>' +
        '<label class="field">Name<input class="input" id="lName" maxlength="28" placeholder="Sleepy Toad"></label>' +
        '<label class="field">Ticker<input class="input" id="lTick" maxlength="8" placeholder="SLEEPY" style="text-transform:uppercase"></label>' +
        '<label class="field">Description<textarea class="input" id="lDesc" rows="3" maxlength="160" placeholder="the only toad that matters."></textarea></label>' +
        '<label class="field">Colour<input type="range" class="hue" id="lHue" min="0" max="359"></label>' +
        '<div class="field" style="display:grid;gap:6px;font-size:12px;color:var(--text-2);font-weight:550">Socials (more socials, more trust)<div class="toggles" id="lSoc"><button class="toggle" data-s="x">' + icon('at-sign', 'sm') + 'X</button><button class="toggle" data-s="tg">' + icon('send', 'sm') + 'Telegram</button><button class="toggle" data-s="web">' + icon('globe', 'sm') + 'Website</button></div></div>' +
        '<label class="field">Dev buy (SOL, optional)<div class="amt"><input id="lDev" inputmode="decimal">' + SOL + '</div></label>' +
        '<div class="note" id="lDevNote"></div>' +
        '<button class="btn primary lg" id="lGo">' + icon('rocket') + 'Launch coin</button></div>' +
      '<div style="display:grid;gap:18px"><div class="card"><h2>' + icon('eye') + 'Preview</h2><div class="preview"><div class="tok-ava" id="lAva"></div><div><b id="lPName" style="font-size:18px"></b><div class="muted" id="lPTick"></div><div class="note" id="lPDesc"></div></div></div></div>' +
        '<div class="card"><h2>' + icon('chart-spline') + 'How the bonding curve works</h2><canvas class="curve" id="lCurve"></canvas>' +
        '<div class="note">Price rises with every token sold. ~' + F.num(C.CURVE_REAL_TOKENS) + ' of 1B tokens sell on the curve (about 85 SOL). Then the coin graduates and the SOL plus the last ' + F.num(C.TOTAL_SUPPLY - C.CURVE_REAL_TOKENS) + ' tokens move into a DEX pool. Curve trades pay ' + (C.CURVE_FEE * 100).toFixed(2) + '% (you, the creator, get ' + (C.CURVE_CREATOR_SHARE * 100).toFixed(2) + '% of every trade). Fewer than 1 in 50 real launches ever graduate.</div></div></div></div></div>';
    $('#lName', el).value = f.name; $('#lTick', el).value = f.ticker; $('#lDesc', el).value = f.desc; $('#lHue', el).value = f.hue; $('#lDev', el).value = f.devBuy;
    const upd = () => {
      f.name = $('#lName', el).value; f.ticker = $('#lTick', el).value.toUpperCase().replace(/[^A-Z0-9]/g, ''); f.desc = $('#lDesc', el).value; f.hue = +$('#lHue', el).value; f.devBuy = $('#lDev', el).value;
      for (const b of el.querySelectorAll('#lSoc button')) b.classList.toggle('on', !!f.socials[b.dataset.s]);
      $('#lAva', el).innerHTML = avatar({ seed: this.previewSeed || (this.previewSeed = Math.floor(Math.random() * 1e9)), hue: f.hue });
      setText($('#lPName', el), f.name || 'Your coin');
      setText($('#lPTick', el), '$' + (f.ticker || 'TICKER'));
      setText($('#lPDesc', el), f.desc || 'No description yet.');
      const d = parseFloat(f.devBuy) || 0;
      const q = d > 0 ? (d * (1 - C.CURVE_FEE)) : 0;
      const tok = q > 0 ? C.CURVE_V_TOKENS - C.CURVE_V_SOL * C.CURVE_V_TOKENS / (C.CURVE_V_SOL + q) : 0;
      setText($('#lDevNote', el), d > 0 ? 'Buys ~' + F.num(tok) + ' tokens (' + F.pctPlain(tok / C.TOTAL_SUPPLY * 100) + ' of supply). Traders see your dev %; a big dev bag scares them, and selling it marks your coin "DS".' : 'No dev buy: you start with no bag, only creator fees.');
    };
    el.addEventListener('input', upd);
    $('#lSoc', el).onclick = (e) => { const b = e.target.closest('button'); if (b) { f.socials[b.dataset.s] = !f.socials[b.dataset.s]; upd(); } };
    $('#lGo', el).onclick = () => {
      upd();
      if (f.name.trim().length < 2) return this.toast('fail', 'Give your coin a name');
      if (f.ticker.length < 2) return this.toast('fail', 'Ticker needs 2+ letters');
      const res = this.game.player.launchCoin({ name: f.name.trim(), ticker: f.ticker, desc: f.desc.trim(), hue: f.hue, socials: Object.assign({}, f.socials), devBuy: parseFloat(f.devBuy) || 0 });
      if (!res.ok) return this.toast('fail', res.reason);
      this.toast('buy', '$' + res.token.ticker + ' is live on the curve', { id: res.token.id });
      this.launchForm = { name: '', ticker: '', desc: '', hue: Math.floor(Math.random() * 360), socials: { x: true, tg: false, web: false }, devBuy: '0.5' };
      this.previewSeed = 0;
      this.openToken(res.token.id);
    };
    upd();
    requestAnimationFrame(() => BH.drawCurve($('#lCurve', el), 0.35));
  };
  UI.renderLaunch = function (full) { if (full && $('#lCurve')) BH.drawCurve($('#lCurve'), 0.35); };

  // ---- Portfolio -------------------------------------------------------------------------------------------------
  UI.buildPortfolio = function (el) {
    el.innerHTML = '<div class="page" id="pf"></div>';
    el.addEventListener('click', (e) => {
      if (e.target.closest('#endRun')) return this.game.confirmEnd();
      const sa = e.target.closest('[data-sell]');
      if (sa) { e.stopPropagation(); this.trade('sell', 1, sa.dataset.sell); return; }
      const r = e.target.closest('[data-id]');
      if (r) this.openToken(r.dataset.id);
    });
  };
  UI.renderPortfolio = function () {
    const p = this.game.player, s = p.summary(), sim = this.game.sim;
    const nw = p.netWorth();
    const m = (lbl, v, c) => '<div class="metric"><span>' + lbl + '</span><b class="' + (c || '') + '">' + v + '</b></div>';
    let rows = '';
    for (const pos of p.pos.values()) {
      if (pos.tokens < 1) continue;
      const tk = sim.byId.get(pos.id);
      const v = p.markValue(pos), pnl = v - pos.cost;
      rows += '<tr data-id="' + pos.id + '" style="cursor:pointer"><td><div style="display:flex;gap:8px;align-items:center"><div class="tok-ava" style="position:relative;inset:auto;width:26px;height:26px;border-radius:6px">' + avatar(pos) + '</div><b>' + esc(pos.name) + '</b> <span class="dim">$' + esc(pos.ticker) + '</span>' + (pos.mine ? ' <span class="bdg warn">' + icon('crown', 'sm') + 'yours</span>' : '') + '</div></td><td>' + (tk ? F.usd(sim.mc(tk)) : '—') + '</td><td>' + F.sol(pos.cost) + '</td><td>' + F.sol(v) + '</td><td class="' + (pnl >= 0 ? 'up' : 'down') + '">' + F.signedSol(pnl) + ' (' + F.pct(pos.cost > 0 ? pnl / pos.cost * 100 : 0) + ')</td><td><button class="btn sell sm" data-sell="' + pos.id + '">Sell all</button></td></tr>';
    }
    const closed = p.closed.slice(0, 40).map((c) => '<tr data-id="' + c.id + '"><td><b>$' + esc(c.ticker) + '</b>' + (c.rugged ? ' <span class="bdg bad">rugged</span>' : '') + '</td><td>' + F.sol(c.invested) + '</td><td class="' + (c.pnl >= 0 ? 'up' : 'down') + '">' + F.signedSol(c.pnl) + '</td><td>' + c.mult.toFixed(2) + 'x</td><td class="dim">' + F.age(c.held) + '</td></tr>').join('');
    const html = '<h1>' + icon('briefcase', 'lg') + 'Portfolio <div class="spacer"></div></h1>' +
      '<div class="grid4">' + m('Net worth', F.sol(nw) + ' SOL') + m('Run PnL', F.signedSol(nw - p.startSol) + ' SOL', nw >= p.startSol ? 'up' : 'down') + m('Cash', F.sol(p.sol) + ' SOL') + m('Win rate', s.closed ? Math.round(s.winRate * 100) + '% (' + s.wins + '/' + s.closed + ')' : '—') +
      m('Trades', s.trades + (s.failed ? ' <span class="dim" style="font-size:12px">+' + s.failed + ' failed</span>' : '')) + m('Fees paid', F.sol(s.fees) + ' SOL') + m('Rugged on you', String(s.rugs), s.rugs ? 'down' : '') + m('Max drawdown', Math.round(s.maxDD * 100) + '%') +
      m('Best trade', s.best ? '$' + esc(s.best.ticker) + ' ' + F.signedSol(s.best.pnl) : '—', s.best && s.best.pnl < 0 ? 'down' : 'up') + m('Worst trade', s.worst ? '$' + esc(s.worst.ticker) + ' ' + F.signedSol(s.worst.pnl) : '—', s.worst && s.worst.pnl >= 0 ? 'up' : 'down') + m('Creator fees', F.sol(s.creatorFees) + ' SOL') + m('Score if you end now', s.score.toLocaleString(), 'brand') + '</div>' +
      '<div class="card"><h2>' + icon('wallet') + 'Open positions</h2>' + (rows ? '<table class="tbl"><thead><tr><th>Token</th><th>MC</th><th>Cost (SOL)</th><th>Value (SOL)</th><th>PnL</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' : '<div class="empty">No open bags.</div>') + '</div>' +
      '<div class="grid2"><div class="card"><h2>' + icon('history') + 'Closed trades</h2>' + (closed ? '<table class="tbl"><thead><tr><th>Token</th><th>In (SOL)</th><th>PnL</th><th>Multiple</th><th>Held</th></tr></thead><tbody>' + closed + '</tbody></table>' : '<div class="empty">Nothing closed yet.</div>') + '</div>' +
      '<div class="card"><h2>' + icon('scroll-text') + 'Activity</h2><div class="w-list" style="max-height:420px;padding:0">' + this.activityHTML(p.activity.slice(0, 30)) + '</div></div></div>';
    setHTML($('#pf'), html);
  };

  // ---- modals -------------------------------------------------------------------------------------------------------
  UI.modal = function (html, onBind) {
    this.closeModal();
    const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.id = 'modal';
    bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(bg);
    this.game.modalOpen = true;
    if (onBind) onBind(bg);
    return bg;
  };
  UI.closeModal = function () { const m = $('#modal'); if (m) m.remove(); if (this.game) this.game.modalOpen = false; };

  BH.UI = UI;
})(window);
