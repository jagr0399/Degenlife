/* The computer: a desktop with apps (the Bagholder trading terminal, Chirp, Scope, Shop, Bank, Coin Factory, Firm, Pad, News, Radio).
   The trading terminal gets Axiom-style tabs: Discover, Pulse, Trackers, Perpetuals, Predictions, Portfolio, Rewards.
   Also: the floating instant-trade panel, wallet-trade toasts and "click a chart bubble to track that wallet". Loaded last. */
(function (g) {
  'use strict';
  const BH = g.BH, C = BH.C, F = BH.fmt, UI = BH.UI, icon = BH.icon, esc = BH.esc, V = BH.SocialView;
  const $ = (s, el) => (el || document).querySelector(s);
  const setHTML = (el, v) => { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } };
  const BASE = '../assets/';
  const game = () => UI.game;
  const toast = (r) => UI.toast(r.ok ? 'info' : 'fail', r.text || r.reason || '');
  const TRADE_TABS = [['discover', 'Discover'], ['pulse', 'Pulse'], ['trackers', 'Trackers'], ['perps', 'Perpetuals'], ['predict', 'Predictions'], ['portfolio', 'Portfolio'], ['rewards', 'Rewards']];
  const APPS = [
    ['terminal', 'Bagholder', 'candlestick-chart', '#f4b23e', 'pulse'], ['chirp', 'Chirp', 'message-circle', '#4aa8ff', 'chirp'], ['scope', 'Scope', 'radar', '#2bd67b', 'scope'],
    ['shop', 'Shop', 'shopping-bag', '#ff7a45', 'shop'], ['bank', 'Bank', 'landmark', '#a77bff', 'bank'], ['dev', 'Coin Factory', 'hammer', '#ff4d5e', 'dev'],
    ['firm', 'Firm', 'users', '#3fd2c7', 'firm'], ['pad', 'LaunchLab', 'building-2', '#6b8cff', 'pad'], ['trencher', 'Trencher', 'megaphone', '#ff5fa2', 'trencher'], ['news', 'News', 'newspaper', '#e8ecf3', 'news'], ['radio', 'Radio', 'radio', '#f4d03e', 'radio'],
  ];
  const APP_OF_VIEW = { trencher: 'trencher', chirp: 'chirp', scope: 'scope', shop: 'shop', bank: 'bank', dev: 'dev', launch: 'dev', firm: 'firm', pad: 'pad', news: 'news', radio: 'radio' };

  // ---------------- desktop ----------------
  function buildDesktop() {
    const d = document.createElement('div'); d.id = 'desktop';
    d.innerHTML = '<div class="dk-wall"><div class="dk-logo">' + BH.LOGO + '<span>DegenOS</span></div></div><div class="dk-icons">' +
      APPS.map(([id, name, ic, col]) => '<button class="dk-app" data-app="' + id + '"><span class="dk-ic" style="--c:' + col + '">' + icon(ic) + '</span><span>' + name + '</span></button>').join('') + '</div>' +
      '<div class="dk-bar"><button class="dk-start" data-stand>' + icon('log-out', 'sm') + 'Stand up</button><div class="dk-tasks" id="dkTasks"></div><div class="spacer"></div><span id="dkSol"></span><span id="dkClock"></span></div>';
    document.body.appendChild(d);
    d.addEventListener('click', (e) => { const a = e.target.closest('[data-app]'); if (a) UI.openApp(a.dataset.app); if (e.target.closest('[data-stand]')) game().exitScreen(); });
    const bar = document.createElement('div'); bar.id = 'appbar';
    bar.innerHTML = '<span class="ab-ic" id="abIc"></span><b id="abName"></b><div class="spacer"></div><button data-home title="Desktop (Esc)">' + icon('layout-grid', 'sm') + 'Desktop</button><button data-close title="Close">' + icon('x', 'sm') + '</button>';
    document.body.appendChild(bar);
    bar.addEventListener('click', (e) => { if (e.target.closest('[data-home]') || e.target.closest('[data-close]')) UI.showDesktop(); });
  }
  UI.showDesktop = function () { UI.instantPanel(false); document.body.dataset.app = ''; $('#desktop').hidden = false; UI.app = null; renderDesk(); };
  UI.openApp = function (id, view) {
    const a = APPS.find((x) => x[0] === id); if (!a) return;
    UI.app = id; document.body.dataset.app = id; $('#desktop').hidden = true;
    setHTML($('#abIc'), '<span style="color:' + a[3] + '">' + icon(a[2], 'sm') + '</span>'); $('#abName').textContent = a[1];
    if (BH.Sound) BH.Sound.play('open', { gain: 0.4 });
    UI.go(view || a[4]);
  };
  function renderDesk() {
    const gm = game(); if (!gm || !gm.sim) return;
    $('#dkClock') && ($('#dkClock').textContent = gm.clock.label());
    $('#dkSol') && ($('#dkSol').textContent = gm.player.netWorth().toFixed(2) + ' SOL · $' + Math.floor(gm.bills.cash).toLocaleString());
    const b = gm.sys.build; const lock = { shop: false, dev: !b.effects().devdesk, firm: !b.places.includes('office'), pad: !b.places.includes('tower') };
    for (const el of document.querySelectorAll('.dk-app')) el.classList.toggle('locked', !!lock[el.dataset.app]);
  }

  // ---------------- the new trading pages ----------------
  const PAGES = {
    discover: {
      build(el) { el.innerHTML = '<div class="xp"><h1>' + icon('compass', 'lg') + 'Discover</h1><div class="grid-2" id="dsc"></div></div>'; el.addEventListener('click', (e) => { const r = e.target.closest('[data-open]'); if (r) UI.openToken(r.dataset.open); }); },
      render() {
        const gm = game(), sim = gm.sim, live = sim.tokens.filter((t) => !t.dead);
        const list = (title, ic, arr, val) => '<div class="card"><h2>' + icon(ic) + title + '</h2>' + (arr.length ? arr.slice(0, 8).map((tk) => '<div class="dsc-row" data-open="' + tk.id + '"><img class="cimg" src="' + V.coinImg(BASE, tk) + '"><b>$' + esc(tk.ticker) + '</b><span class="dim">' + esc(tk.name) + '</span><div class="spacer"></div>' + val(tk) + '</div>').join('') : '<div class="dim">Nothing yet.</div>') + '</div>';
        const ch = (tk) => { const c = sim.change(tk, 300); return '<b class="' + (c >= 0 ? 'up' : 'down') + '">' + (c >= 0 ? '+' : '') + c.toFixed(0) + '%</b>'; };
        const s = gm.sys.social, hot = s ? s.hottest()[0] : null;
        setHTML($('#dsc'),
          list('Trending (5m volume)', 'flame', live.slice().sort((a, b) => sim.vol5m(b) - sim.vol5m(a)), (tk) => '<b>' + F.usd(sim.vol5m(tk) * C.SOL_USD) + '</b>') +
          list('Top gainers (5m)', 'trending-up', live.slice().sort((a, b) => sim.change(b, 300) - sim.change(a, 300)), ch) +
          list('Hot narrative: ' + (hot ? hot.label : '—'), 'sparkles', hot ? live.filter((t) => t.narrative === hot.id).sort((a, b) => sim.mc(b) - sim.mc(a)) : [], (tk) => '<b>' + F.usd(sim.mc(tk)) + '</b>') +
          list('Just graduated', 'graduation-cap', live.filter((t) => t.stage === 'amm').sort((a, b) => b.migratedAt - a.migratedAt), (tk) => '<b>' + F.usd(sim.mc(tk)) + '</b>') +
          list('Whale activity', 'fish', live.filter((t) => (t.bubbles || []).some((b) => b.kind === 'whale' && sim.t - b.t < 300)), ch) +
          list('Copycats', 'copy', live.filter((t) => t.copyOf), (tk) => '<b>' + F.usd(sim.mc(tk)) + '</b>'));
      },
    },
    trackers: {
      build(el) {
        this.sub = this.sub || 'wallets';
        el.innerHTML = '<div class="xp"><h1>' + icon('radar', 'lg') + 'Trackers<div class="spacer"></div><div class="seg" id="trSub"><button data-s="wallets">Wallets</button><button data-s="scope">Scope</button><button data-s="chirp">Chirp</button></div></h1><div id="trBody"></div></div>';
        el.addEventListener('click', (e) => {
          const s = e.target.closest('[data-s]'); if (s) { this.sub = s.dataset.s; $('#trBody')._h = null; this.render(); return; }
          const c = e.target.closest('[data-coin]'); if (c && game().sim.byId.get(c.dataset.coin)) { UI.openToken(c.dataset.coin); return; }
          const t = e.target.closest('[data-track]'); if (t) { const s2 = game().sys.tracker.suggest(20).find((x) => x.addr === t.dataset.track); UI.trackDialog({ addr: t.dataset.track, name: s2 ? s2.name : '' }); return; }
          const ed = e.target.closest('[data-edit]'); if (ed) { const w = game().sys.tracker.get(ed.dataset.edit); UI.trackDialog({ addr: w.addr, name: w.name }); return; }
          const pv = e.target.closest('[data-preview]'); if (pv && BH.Sound) BH.Sound.play(pv.dataset.preview);
          const mu = e.target.closest('[data-mute]'); if (mu) { const tr = game().sys.tracker; tr.muted = !tr.muted; $('#trBody')._h = null; this.render(); }
        });
      },
      render() {
        for (const b of document.querySelectorAll('#trSub button')) b.classList.toggle('on', b.dataset.s === this.sub);
        const gm = game(), tr = gm.sys.tracker, sim = gm.sim;
        if (this.sub === 'scope') return setHTML($('#trBody'), '<div class="card">' + V.scopeHTML(gm, BASE, 50) + '</div>');
        if (this.sub === 'chirp') return setHTML($('#trBody'), '<div class="grid-2 chirp2"><div class="sv-feed card">' + V.chirpHTML(gm, BASE, 30) + '</div><div class="card">' + V.heatHTML(gm) + '</div></div>');
        const feed = tr.feed.slice(-40).reverse();
        setHTML($('#trBody'), '<div class="grid-2"><div class="card"><h2>' + icon('eye') + 'Tracked wallets <span class="dim">' + tr.wallets.length + '</span><div class="spacer"></div><button class="btn sm" data-mute>' + icon(tr.muted ? 'bell-off' : 'bell', 'sm') + (tr.muted ? 'Muted' : 'Alerts on') + '</button></h2>' +
          (tr.wallets.length ? tr.wallets.map((w) => '<div class="trw"><span class="emo">' + esc(w.emoji) + '</span><div><b>' + esc(w.name) + '</b><span class="dim">' + esc(w.addr.slice(0, 6) + '…' + w.addr.slice(-4)) + '</span></div><div class="spacer"></div><button class="btn sm ghost" data-preview="' + w.sound + '" title="Play its sound">' + icon('volume-2', 'sm') + '</button><button class="btn sm" data-edit="' + esc(w.addr) + '">Edit</button></div>').join('') : '<div class="dim">Click any bubble on a chart to track that wallet, or pick one below.</div>') +
          '<h2 class="xh">' + icon('fish') + 'Busy whales and callers right now</h2>' + tr.suggest(8).map((s) => '<div class="trw"><span class="emo">' + (s.kind === 'kol' ? '📣' : '🐋') + '</span><div><b>' + esc(s.name) + '</b><span class="dim">' + s.vol.toFixed(1) + ' SOL traded</span></div><div class="spacer"></div><button class="btn sm primary" data-track="' + esc(s.addr) + '">Track</button></div>').join('') + '</div>' +
          '<div class="card"><h2>' + icon('activity') + 'Live feed</h2>' + (feed.length ? feed.map((ev) => V.walletRowHTML(gm, BASE, ev)).join('') : '<div class="dim">No tracked trades yet.</div>') + '</div></div>');
        void sim;
      },
    },
    perps: {
      kind: 'All',
      build(el) {
        el.innerHTML = '<div class="xp px2"><h1>' + icon('activity', 'lg') + 'Perpetuals <span class="dim">· crypto, stocks, futures and MEMEX. Simulated prices, fake SOL.</span></h1>' +
          '<div class="px-grid"><div class="card px-list"><div class="seg px-kinds">' + ['All', 'Crypto', 'Stock', 'Future', 'Index'].map((k) => '<button data-pk="' + k + '">' + (k === 'Stock' ? 'Stocks' : k === 'Future' ? 'Futures' : k) + '</button>').join('') + '</div><div id="pxList"></div></div>' +
          '<div class="card px-main"><div id="pxHead"></div><canvas id="pxChart"></canvas></div><div class="card" id="pxSide"></div></div><div class="card" id="pxPos"></div></div>';
        el.addEventListener('click', (e) => {
          const px = game().sys.perps;
          const k = e.target.closest('[data-pk]'); if (k) { this.kind = k.dataset.pk; $('#pxList')._h = null; return; }
          const m = e.target.closest('[data-pmk]'); if (m) { px.sel = m.dataset.pmk; $('#pxSide').innerHTML = ''; $('#pxList')._h = null; return; }
          const b = e.target.closest('[data-px]'); if (!b) return;
          if (b.dataset.px === 'close') return toast(px.close(b.dataset.id));
          const mg = parseFloat($('#pxM').value), l = parseFloat($('#pxL').value);
          toast(px.open(b.dataset.px, mg, l, px.sel || 'MEMEX'));
        });
        el.addEventListener('input', (e) => { if (e.target.id === 'pxL' || e.target.id === 'pxM') this.est(); });
      },
      est() {
        const px = game().sys.perps, lv = $('#pxLv'), l = $('#pxL'); if (!lv || !l) return;
        lv.textContent = l.value + 'x';
        const p = px.priceOf(px.sel), k = 0.9 / +l.value, m = parseFloat($('#pxM').value) || 0;
        const e = $('#pxEst'); if (e) e.innerHTML = 'Size <b>' + (m * +l.value).toFixed(2) + ' SOL</b> · liq. long <b>' + BH.Perps.fmtP(p * (1 - k)) + '</b> · short <b>' + BH.Perps.fmtP(p * (1 + k)) + '</b>';
      },
      render() {
        const px = game().sys.perps, F2 = BH.Perps.fmtP, sel = px.sel || 'MEMEX', mk = px.market(sel);
        for (const b of document.querySelectorAll('[data-pk]')) b.classList.toggle('on', b.dataset.pk === this.kind);
        const list = BH.Perps.MARKETS.filter((m) => this.kind === 'All' || m.kind === this.kind);
        setHTML($('#pxList'), list.map((m) => { const ch = px.change(m.id, 600), open = px.isOpen(m.id), held = px.pos.some((p) => (p.mk || 'MEMEX') === m.id);
          return '<button class="px-row' + (m.id === sel ? ' on' : '') + '" data-pmk="' + m.id + '"><span class="px-dot ' + (px.session(m.id).live ? 'open' : '') + '" title="' + esc(px.hoursText(m.id)) + '"></span><b>' + m.id + (held ? ' <span class="px-held">●</span>' : '') + '</b><span class="dim px-nm">' + esc(m.name) + '</span><span class="px-pr">' + F2(px.priceOf(m.id)) + '</span><span class="' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%</span></button>'; }).join(''));
        const open = px.isOpen(sel), ch = px.change(sel, 600);
        setHTML($('#pxHead'), '<div class="px-h"><b>' + sel + '</b><span class="dim">' + esc(mk.name) + ' · ' + mk.kind + '</span><span class="px-big">' + F2(px.priceOf(sel)) + '</span><span class="' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '+' : '') + ch.toFixed(2) + '% (10m)</span><div class="spacer"></div><span class="chip ' + (px.session(sel).live ? 'ok' : '') + '">' + px.hoursText(sel) + '</span><span class="chip">Max ' + mk.maxLev + 'x</span></div>');
        const cv = $('#pxChart');
        if (cv) { const W = cv.clientWidth, H = 280; cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, W, H); const h = px.histOf(sel).slice(-300); if (h.length > 2) { let lo = Infinity, hi = -Infinity; for (const p of h) { lo = Math.min(lo, p.p); hi = Math.max(hi, p.p); } if (hi - lo < hi * 1e-6) { hi *= 1.001; lo *= 0.999; } const Y = (v) => H - 14 - (v - lo) / (hi - lo) * (H - 34); ctx.beginPath(); h.forEach((p, i) => { const x = i / (h.length - 1) * (W - 60), y = Y(p.p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); const up = h[h.length - 1].p >= h[0].p; ctx.strokeStyle = up ? '#2bd67b' : '#ff4d5e'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineTo(W - 60, H); ctx.lineTo(0, H); ctx.closePath(); const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, up ? 'rgba(43,214,123,.18)' : 'rgba(255,77,94,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fill(); ctx.fillStyle = '#8a93a3'; ctx.font = '11px Inter'; for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4; ctx.fillText(F2(v), W - 56, Y(v) + 4); } for (const p of px.pos.filter((x) => (x.mk || 'MEMEX') === sel)) { for (const [v, col, lbl] of [[p.entry, p.side === 'long' ? '#2bd67b' : '#ff4d5e', p.side.toUpperCase() + ' ' + p.lev + 'x'], [px.liqPrice(p), '#f4b23e', 'LIQ']]) { if (v < lo || v > hi) continue; const y = Y(v); ctx.setLineDash([4, 4]); ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W - 60, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = col; ctx.fillText(lbl, 6, y - 4); } } } else { ctx.fillStyle = '#8a93a3'; ctx.font = '13px Inter'; ctx.fillText('Collecting prices…', 16, 30); } }
        const side = $('#pxSide');
        if (side && (!side.querySelector('#pxM') || side.dataset.mk !== sel)) {
          side.dataset.mk = sel;
          side.innerHTML = '<h2>Trade ' + sel + '</h2><div class="kv"><span>Margin</span><div class="amt" style="width:150px"><input id="pxM" value="0.5"><span class="solmark">SOL</span></div></div><div class="kv"><span>Leverage</span><input type="range" id="pxL" min="2" max="' + mk.maxLev + '" value="' + Math.min(10, mk.maxLev) + '"><b id="pxLv"></b></div><div class="note" id="pxEst"></div><div class="row-btns"><button class="btn buy" data-px="long">Long</button><button class="btn sell" data-px="short">Short</button></div><p class="note">Liquidation at −90% of margin. Fee 0.05% of size to open and to close. ' + (mk.kind === 'Stock' ? 'Trades 24/7. Busiest in the US session (Mon-Fri 9:30-16:00 game time), calmer after hours.' : mk.kind === 'Future' ? 'Trades 24/7, calmer on weekends.' : mk.id === 'SOL' ? 'Follows the live SOL price.' : mk.id === 'MEMEX' ? 'MEMEX follows narrative heat and crashes.' : 'Crypto trades 24/7 and moves with SOL.') + '</p>';
          this.est();
        }
        const btns = side && side.querySelectorAll('[data-px]'); if (btns) for (const b of btns) b.disabled = !open;
        setHTML($('#pxPos'), '<h2>Positions</h2>' + (px.pos.length ? '<table class="tbl"><thead><tr><th class="l">Market</th><th class="l">Side</th><th>Size</th><th>Entry</th><th>Mark</th><th>Liq.</th><th>PnL</th><th></th></tr></thead><tbody>' + px.pos.map((p) => { const id = p.mk || 'MEMEX', pnl = px.pnl(p); return '<tr><td class="l"><b>' + id + '</b></td><td class="l ' + (p.side === 'long' ? 'up' : 'down') + '">' + p.side.toUpperCase() + ' ' + p.lev + 'x</td><td>' + (p.margin * p.lev).toFixed(2) + ' SOL</td><td>' + F2(p.entry) + '</td><td>' + F2(px.priceOf(id)) + '</td><td>' + F2(px.liqPrice(p)) + '</td><td class="' + (pnl >= 0 ? 'up' : 'down') + '">' + (pnl >= 0 ? '+' : '') + pnl.toFixed(3) + ' (' + (pnl / p.margin * 100).toFixed(0) + '%)</td><td><button class="btn sm" data-px="close" data-id="' + p.id + '"' + (px.isOpen(id) ? '' : ' disabled title="Market closed"') + '>Close</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="dim">No open positions.</div>'));
      },
    },
    predict: {
      build(el) {
        el.innerHTML = '<div class="xp"><h1>' + icon('target', 'lg') + 'Predictions <span class="dim">· bets on coins and narratives, settled by the market</span></h1><div class="kv" style="max-width:320px"><span>Stake</span><div class="amt" style="width:150px"><input id="pmS" value="0.1"><span class="solmark">SOL</span></div></div><div class="xgrid wide" id="pmList"></div><h2 class="xh">Settled</h2><div class="card" id="pmDone"></div></div>';
        el.addEventListener('click', (e) => { const b = e.target.closest('[data-pm]'); if (b) { toast(game().sys.predict.bet(b.dataset.pm, b.dataset.pick, parseFloat($('#pmS').value))); $('#pmList')._h = null; } });
      },
      render() {
        const pr = game().sys.predict, sim = game().sim;
        setHTML($('#pmList'), pr.open.length ? pr.open.map((m) => { const tk = m.coin && sim.byId.get(m.coin); const mine = pr.bets.filter((b) => b.mid === m.id); return '<div class="card pm">' + (tk ? '<img class="cimg lg" src="' + V.coinImg(BASE, tk) + '">' : '<span class="pm-ic">' + icon('flame', 'lg') + '</span>') + '<b>' + esc(m.q) + '</b><span class="dim">Ends in ' + Math.max(0, Math.ceil(m.ends - sim.t)) + 's</span><div class="row-btns wrap">' + Object.entries(m.odds).map(([k, p]) => '<button class="btn sm" data-pm="' + m.id + '" data-pick="' + k + '">' + esc(m.labels ? m.labels[k] : k.toUpperCase()) + ' · ' + (1 / p * 0.95).toFixed(2) + 'x</button>').join('') + '</div>' + (mine.length ? '<span class="up">Your bets: ' + mine.map((b) => (m.labels ? m.labels[b.pick] : b.pick) + ' ' + b.stake + ' SOL').join(', ') + '</span>' : '') + '</div>'; }).join('') : '<div class="card dim">New markets open every minute or two.</div>');
        setHTML($('#pmDone'), pr.done.slice(-8).reverse().map((m) => '<div class="logline">' + esc(m.q) + ' → <b>' + esc(m.labels ? m.labels[m.answer] : String(m.answer).toUpperCase()) + '</b></div>').join('') || '<div class="dim">Nothing settled yet.</div>');
      },
    },
    rewards: {
      build(el) { el.innerHTML = '<div class="xp" id="rw"></div>'; el.addEventListener('click', (e) => { if (e.target.closest('[data-claim]')) { toast(game().sys.rewards.claim()); $('#rw')._h = null; } }); },
      render() {
        const rw = game().sys.rewards, t = rw.tier();
        const pct = t.next ? Math.min(100, (rw.points - BH.Rewards.TIERS[t.idx][1]) / (t.next[1] - BH.Rewards.TIERS[t.idx][1]) * 100) : 100;
        setHTML($('#rw'), '<h1>' + icon('gift', 'lg') + 'Rewards</h1><div class="grid-3"><div class="card stat"><span>Tier</span><b class="big">' + t.name + '</b><i class="meter"><b style="width:' + pct + '%"></b></i><small class="dim">' + (t.next ? Math.ceil(t.next[1] - rw.points).toLocaleString() + ' points to ' + t.next[0] : 'Top tier') + '</small></div><div class="card stat"><span>Points</span><b class="big">' + Math.floor(rw.points).toLocaleString() + '</b><small class="dim">10 points per SOL traded</small></div><div class="card stat"><span>Cashback ready</span><b class="big up">' + rw.cashback.toFixed(4) + ' SOL</b><button class="btn sm primary" data-claim>Claim</button></div></div>' +
          '<div class="card"><h2>Tiers</h2><table class="tbl"><thead><tr><th class="l">Tier</th><th>Points</th><th>Fee cashback</th></tr></thead><tbody>' + BH.Rewards.TIERS.map((x, i) => '<tr class="' + (i === t.idx ? 'on' : '') + '"><td class="l">' + x[0] + '</td><td>' + x[1].toLocaleString() + '</td><td>' + Math.round(x[2] * 100) + '%</td></tr>').join('') + '</tbody></table><p class="note">Fees paid: ' + rw.feesPaid.toFixed(3) + ' SOL · claimed so far: ' + rw.claimed.toFixed(4) + ' SOL</p></div>');
      },
    },
    trencher: {
      build(el) {
        el.innerHTML = '<div class="xp" id="trc"></div>';
        el.addEventListener('click', (e) => {
          const T = game().sys.trencher, b = e.target.closest('[data-tc]'); if (!b) { const c = e.target.closest('[data-coin]'); if (c && game().sim.byId.get(c.dataset.coin)) UI.openToken(c.dataset.coin); return; }
          const a = b.dataset.tc;
          if (a === 'post') { const ta = $('#tcText'); toast(T.say(ta.value.trim())); ta.value = ''; }
          if (a === 'call') toast(T.call(b.dataset.id, ($('#tcText').value || '').trim() || undefined));
          if (a === 'accept') toast(T.acceptOffer(b.dataset.id));
          if (a === 'decline') toast(T.declineOffer(b.dataset.id));
          if (a === 'pause') { T.paused = !T.paused; toast({ ok: true, text: T.paused ? 'Copy trading paused' : 'Copy trading on' }); }
          $('#trcDyn')._h = null;
        });
      },
      render() {
        const gm = game(), T = gm.sys.trencher, sim = gm.sim;
        const el = $('#trc'); if (!el) return;
        if (!el.querySelector('#tcText')) el.innerHTML = '<h1>' + icon('megaphone', 'lg') + 'Trencher <span class="dim">· your Chirp account</span></h1><div id="trcDyn"></div><div class="card"><h2>' + icon('pen-line') + 'Post</h2><textarea id="tcText" class="input" rows="3" placeholder="Say something, or write a caption, then press Call on a coin below"></textarea><div class="row-btns"><button class="btn primary" data-tc="post">Post</button></div></div>';
        const bags = [...gm.player.pos.values()].map((p) => sim.byId.get(p.id)).filter((t) => t && !t.dead);
        const cur = UI.tokenId && sim.byId.get(UI.tokenId);
        const coins = (cur && !cur.dead ? [cur] : []).concat(bags.filter((t) => !cur || t.id !== cur.id)).slice(0, 6);
        const pct = Math.min(100, T.followers / T.constructor.COPY_AT * 100);
        setHTML($('#trcDyn'), '<div class="grid-4"><div class="card stat"><span>Followers</span><b class="big">' + Math.round(T.followers).toLocaleString() + '</b>' + (T.followers < T.constructor.COPY_AT ? '<i class="meter"><b style="width:' + pct + '%"></b></i><small class="dim">Copy traders unlock at 1,000</small>' : '<small class="dim">' + T.copiers + ' copy traders</small>') + '</div>' +
          '<div class="card stat"><span>Trust</span><b class="big ' + (T.trust < 35 ? 'down' : T.trust > 65 ? 'up' : '') + '">' + Math.round(T.trust) + '</b><i class="meter"><b style="width:' + T.trust + '%"></b></i></div>' +
          '<div class="card stat"><span>Hit rate</span><b class="big">' + Math.round(T.hitRate() * 100) + '%</b><small class="dim">' + T.hits + ' hits · ' + T.misses + ' misses · ' + T.dumps + ' dumps</small></div>' +
          '<div class="card stat"><span>Copy fees earned</span><b class="big up">' + T.copyEarned.toFixed(3) + ' SOL</b>' + (T.copiers ? '<button class="btn sm" data-tc="pause">' + (T.paused ? 'Resume copying' : 'Pause copying') + '</button>' : '') + '</div></div>' +
          '<div class="grid-2"><div class="card"><h2>' + icon('crosshair') + 'Call a coin</h2>' + (coins.length ? coins.map((t) => '<div class="trw"><img class="cimg" src="' + V.coinImg(BASE, t) + '" onerror="this.remove()"><div><b>$' + esc(t.ticker) + '</b><span class="dim">' + F.usd(sim.mc(t)) + ' MC' + (gm.player.pos.has(t.id) ? ' · you hold it' : '') + '</span></div><div class="spacer"></div><button class="btn sm primary" data-tc="call" data-id="' + t.id + '">📣 Call</button></div>').join('') : '<div class="dim">Open a coin or buy one to call it.</div>') +
          '<p class="note">A hit = it runs +50% within 2 minutes of your call. Selling into your own call in the first minute is dumping on your followers.</p></div>' +
          '<div class="card"><h2>' + icon('mail') + 'Shill offers</h2>' + (T.offers.length ? T.offers.map((o) => '<div class="trw"><div><b>$' + esc(o.ticker) + '</b><span class="dim">pays ' + o.pay + ' SOL · ' + Math.max(0, Math.ceil(o.until - sim.t)) + 's left</span></div><div class="spacer"></div><button class="btn sm" data-tc="accept" data-id="' + o.id + '">Take it</button><button class="btn sm ghost" data-tc="decline" data-id="' + o.id + '">No</button></div>').join('') : '<div class="dim">' + (T.followers < 500 ? 'Devs start paying for shills at 500 followers.' : 'No offers right now.') + '</div>') + '</div></div>' +
          '<div class="card"><h2>' + icon('history') + 'Your calls</h2>' + (T.calls.length ? T.calls.slice(-10).reverse().map((c) => { const x = c.peak / c.mcAt; return '<div class="trw" data-coin="' + c.coin + '"><b>$' + esc(c.ticker) + '</b><span class="dim">at ' + F.usd(c.mcAt) + (c.paid ? ' · paid shill' : '') + '</span><div class="spacer"></div><b class="' + (x >= 1.5 ? 'up' : c.done ? 'down' : '') + '">' + (c.done ? (x >= 1.5 ? 'HIT ' : 'miss ') : 'live ') + x.toFixed(2) + 'x</b></div>'; }).join('') : '<div class="dim">No calls yet.</div>') + '</div>');
      },
    },
    news: { build(el) { el.innerHTML = '<div class="xp"><h1>' + icon('newspaper', 'lg') + 'Degen News Network</h1><div class="card" id="nw"></div></div>'; }, render() { setHTML($('#nw'), V.newsHTML(game())); } },
    radio: {
      build(el) { el.innerHTML = '<div class="xp"><h1>' + icon('radio', 'lg') + 'Radio</h1><div class="card" id="rd"></div></div>'; el.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (!b || !BH.Sound) return; const S = BH.Sound, r = b.dataset.r; if (r === 'toggle') S.setRadio(!S.radioOn); if (r === 'next') S.next(); if (r === 'shuffle') S.setShuffle(!S.shuffle); if (r === 'station') S.setStation(b.dataset.s); if (r === 'track') S.playIndex(+b.dataset.i); $('#rd')._h = null; }); },
      render() { const S = BH.Sound; if (!S) return; const cur = S.track % S.MUSIC.length; setHTML($('#rd'), '<div class="kv"><span>Now playing</span><b>' + esc(S.radioOn ? S.station + ' · ' + S.nowPlaying() : 'Off') + '</b></div>' +
        '<div class="seg rd-st">' + S.stations().map((st) => '<button data-r="station" data-s="' + esc(st) + '" class="' + (S.radioOn && S.station === st ? 'on' : '') + '">' + esc(st) + ' <small>' + S.inStation(st).length + '</small></button>').join('') + '</div>' +
        '<div class="row-btns"><button class="btn primary" data-r="toggle">' + (S.radioOn ? 'Turn off' : 'Turn on') + '</button><button class="btn" data-r="next">Next song</button><button class="btn' + (S.shuffle ? ' primary' : '') + '" data-r="shuffle">Shuffle ' + (S.shuffle ? 'on' : 'off') + '</button></div>' +
        S.inStation().map((i) => { const m = S.MUSIC[i]; return '<div class="trw"><span class="emo">' + (S.radioOn && cur === i ? '▶' : '♪') + '</span><b>' + esc(m[0]) + '</b>' + (m[3] ? ' <span class="dim">' + esc(m[3]) + '</span>' : '') + '<div class="spacer"></div><button class="btn sm" data-r="track" data-i="' + i + '">Play</button></div>'; }).join('') + '<p class="note">Free CC0 music; see docs/CREDITS.md. The radio in your room flips through the stations.</p>'); },
    },
  };

  // ---------------- wallet tracking: toast, dialog, bubble click ----------------
  UI.walletToast = function (ev) {
    const host = $('#toasts'); if (!host) return;
    const el = document.createElement('div'); el.className = 'wtoast'; el.dataset.id = ev.coin;
    el.innerHTML = V.walletToastHTML(game(), BASE, ev);
    host.appendChild(el);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) { el.remove(); return; } if (game().sim.byId.get(ev.coin)) UI.openToken(ev.coin); });
    while (host.children.length > 5) host.firstChild.remove();
    setTimeout(() => el.remove(), 6500);
  };
  UI.trackDialog = function (b) {
    const tr = game().sys.tracker, cur = tr.get(b.addr) || {};
    const T = BH.Tracker;
    UI.modal('<h2>' + icon('eye') + ' Track this wallet</h2><p class="dim">' + esc(b.addr) + '</p>' +
      '<div class="kv"><span>Name</span><input class="input" id="twN" value="' + esc(cur.name || b.name || '') + '"></div>' +
      '<div class="kv"><span>Emoji</span><div class="emopick" id="twE">' + T.EMOJI.map((e) => '<button class="' + ((cur.emoji || T.EMOJI[0]) === e ? 'on' : '') + '" data-e="' + e + '">' + e + '</button>').join('') + '</div></div>' +
      '<div class="kv"><span>Sound</span><select class="input" id="twS">' + T.SOUNDS.map(([k, l]) => '<option value="' + k + '"' + ((cur.sound || 'coin') === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select><button class="btn sm" data-play>' + icon('volume-2', 'sm') + '</button></div>' +
      '<div class="row-btns"><button class="btn primary" data-a="save">' + (cur.addr ? 'Save' : 'Track') + '</button>' + (cur.addr ? '<button class="btn sell" data-a="untrack">Untrack</button>' : '') + '<button class="btn ghost" data-a="cancel">Cancel</button></div>', (m) => {
      let emoji = cur.emoji || T.EMOJI[tr.wallets.length % T.EMOJI.length];
      m.addEventListener('click', (e) => {
        const eb = e.target.closest('[data-e]'); if (eb) { emoji = eb.dataset.e; for (const x of m.querySelectorAll('[data-e]')) x.classList.toggle('on', x === eb); return; }
        if (e.target.closest('[data-play]') && BH.Sound) { BH.Sound.play($('#twS', m).value); return; }
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'save') { tr.track(b.addr, { name: $('#twN', m).value.trim() || 'wallet', emoji, sound: $('#twS', m).value, on: true }); UI.toast('info', 'Tracking ' + ($('#twN', m).value.trim() || 'wallet')); }
        if (a.dataset.a === 'untrack') { tr.untrack(b.addr); UI.toast('info', 'Stopped tracking'); }
        UI.closeModal();
      });
    });
  };

  // ---------------- instant trade panel (floating, draggable, P1/P2/P3, SOL or USD) ----------------
  const IDEF = () => ({ p: 0, pos: { x: 0, y: 0 }, open: true, presets: [0, 1, 2].map((i) => ({ buys: [[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5], [0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5], [0.1, 0.25, 0.5, 1, 2, 3, 5, 10]][i], usd: [[1, 10, 15, 20, 100, 50, 75, 5], [5, 20, 50, 100, 150, 200, 300, 500], [10, 50, 100, 250, 500, 750, 1000, 1500]][i], sells: [10, 25, 50, 100], slip: 20, prio: 0.001 })) });
  function icfg() { const s = UI.settings; if (!s.instant || !s.instant.presets) s.instant = IDEF(); return s.instant; }
  UI.instantPanel = function (show) {
    let el = $('#instant');
    if (!show) { if (el) el.hidden = true; return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'instant'; document.body.appendChild(el);
      const I = icfg();
      el.style.left = (I.pos.x || window.innerWidth - 700) + 'px'; el.style.top = (I.pos.y || 160) + 'px';
      el.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.in-head') || e.target.closest('button')) return;
        const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
        const mv = (ev) => { el.style.left = Math.max(0, Math.min(window.innerWidth - 60, ev.clientX - dx)) + 'px'; el.style.top = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - dy)) + 'px'; };
        const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); const I2 = icfg(); I2.pos = { x: parseInt(el.style.left, 10), y: parseInt(el.style.top, 10) }; UI.saveSettings(); };
        document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
      });
      el.addEventListener('click', (e) => {
        const I2 = icfg(), P = I2.presets[I2.p], b = e.target.closest('[data-i]'); if (!b) return;
        const a = b.dataset.i;
        if (a === 'p') { I2.p = +b.dataset.v; UI.saveSettings(); el._h = null; }
        if (a === 'unit') { UI.settings.unit = UI.settings.unit === 'usd' ? 'sol' : 'usd'; UI.saveSettings(); el._h = null; }
        if (a === 'edit') { el.classList.toggle('editing'); el._h = null; }
        if (a === 'min') { I2.open = !I2.open; UI.saveSettings(); el._h = null; }
        if (a === 'buy') { const v = +b.dataset.v; const sol = UI.settings.unit === 'usd' ? v / C.SOL_USD : v; UI.trade('buy', sol, UI.tokenId); }
        if (a === 'sell') UI.trade('sell', +b.dataset.v / 100, UI.tokenId);
        if (a === 'call') toast(game().sys.trencher.call(UI.tokenId));
        void P;
        UI.renderInstant();
      });
      el.addEventListener('change', (e) => {
        const t = e.target, I2 = icfg(), P = I2.presets[I2.p]; if (!t.dataset.ed) return;
        const [k, i] = t.dataset.ed.split(':'), v = parseFloat(t.value); if (!(v >= 0)) return;
        if (k === 'buy') P[UI.settings.unit === 'usd' ? 'usd' : 'buys'][+i] = v; else if (k === 'sell') P.sells[+i] = v; else P[k] = v;
        UI.settings.slippage = P.slip / 100; UI.settings.priority = P.prio; UI.saveSettings();
      });
      // Enter saves the box and moves to the next one; Esc leaves edit mode
      el.addEventListener('keydown', (e) => {
        if (!e.target.dataset || !e.target.dataset.ed) return;
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); const ins = [...el.querySelectorAll('input[data-ed]')], i = ins.indexOf(e.target); if (ins[i + 1]) { ins[i + 1].focus(); ins[i + 1].select(); } else { e.target.blur(); el.classList.remove('editing'); el._h = null; UI.renderInstant(); } }
        if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); el.classList.remove('editing'); el._h = null; UI.renderInstant(); }
      });
      el.addEventListener('focusout', () => { setTimeout(() => { if (!el.contains(document.activeElement)) { el._h = null; UI.renderInstant(); } }, 0); });
    }
    el.hidden = false; UI.renderInstant();
  };
  UI.renderInstant = function () {
    const el = $('#instant'); if (!el || el.hidden) return;
    // editing presets: don't redraw while you're typing in one of the boxes (a redraw used to wipe what you typed)
    if (el.classList.contains('editing') && document.activeElement && el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    const I = icfg(), P = I.presets[I.p], usd = UI.settings.unit === 'usd', gm = game(), tk = gm.sim.byId.get(UI.tokenId), editing = el.classList.contains('editing');
    const pos = tk && gm.player.pos.get(tk.id);
    const amts = usd ? P.usd : P.buys;
    const btn = (kind, v, i, label) => editing ? '<input data-ed="' + kind + ':' + i + '" value="' + v + '">' : '<button data-i="' + kind + '" data-v="' + v + '">' + label + '</button>';
    const S = UI.posStats(pos), inv = S.invested, sold = S.sold, rem = S.value, pnl = S.total;
    const html = '<div class="in-head">' + [0, 1, 2].map((i) => '<button data-i="p" data-v="' + i + '" class="' + (I.p === i ? 'on' : '') + '">P' + (i + 1) + '</button>').join('') + '<button data-i="edit" title="Edit amounts">' + icon('pencil', 'sm') + '</button><button data-i="unit" class="unit">' + (usd ? 'USD' : 'SOL') + '</button><button data-i="call" title="Call this coin to your followers">📣</button><div class="spacer"></div><span class="dim">' + (tk ? '$' + esc(tk.ticker) : '') + '</span><button data-i="min">' + icon(I.open ? 'minus' : 'plus', 'sm') + '</button></div>' +
      (I.open ? '<div class="in-l">Buy <span class="dim">' + gm.player.sol.toFixed(2) + ' SOL</span></div><div class="in-grid buy">' + amts.map((v, i) => btn('buy', v, i, usd ? '$' + v : v + '')).join('') + '</div>' +
      '<div class="in-set">' + icon('sliders-horizontal', 'sm') + (editing ? '<input data-ed="slip:0" value="' + P.slip + '">%' : P.slip + '%') + ' ' + icon('fuel', 'sm') + (editing ? '<input data-ed="prio:0" value="' + P.prio + '">' : P.prio) + '</div>' +
      '<div class="in-l">Sell <span class="dim">' + (pos ? F.num(pos.tokens) + ' · ' + rem.toFixed(3) + ' SOL' : 'no bag') + '</span></div><div class="in-grid sell">' + P.sells.map((v, i) => btn('sell', v, i, v + '%')).join('') + '</div>' +
      '<div class="in-foot"><span>Invested <b>' + inv.toFixed(2) + '</b></span><span>Sold <b>' + sold.toFixed(2) + '</b></span><span>Holding <b>' + rem.toFixed(2) + '</b></span><span class="' + (pnl >= 0 ? 'up' : 'down') + '">' + (pnl >= 0 ? '+' : '') + pnl.toFixed(3) + '</span></div>' : '');
    setHTML(el, html);
  };

  // ---------------- wiring into the shell ----------------
  const origInit = UI.init, origGo = UI.go, origRender = UI.render, origKey = UI.key;
  UI.init = function (gm) {
    origInit.call(this, gm);
    // Axiom-style tabs for the trading terminal; the old game tabs live in their own desktop apps now
    const nav = $('#nav'), keep = nav.querySelector('#navToken');
    nav.innerHTML = '';
    for (const [id, label] of TRADE_TABS) { const b = document.createElement('button'); b.dataset.view = id; b.textContent = label; nav.appendChild(b); }
    if (keep) nav.insertBefore(keep, nav.children[2]);
    buildDesktop();
    // Esc: anything -> Pulse (quick access); Esc on Pulse -> the desktop; Esc on the desktop stands you up
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if (inField || $('#modal') || !$('#wallet').classList.contains('hide') || document.querySelector('.pc.pc-max')) return;
      if (UI.chart && (UI.chart.creating || UI.chart.tool !== 'cursor')) return;   // let the chart cancel its tool first
      if (UI.app) { e.stopImmediatePropagation(); e.preventDefault(); if (UI.app === 'terminal' && UI.view === 'pulse') UI.showDesktop(); else UI.openApp('terminal', 'pulse'); }
    }, true);
    UI.showDesktop();
  };
  UI.go = function (view) {
    if (view !== 'token') UI.instantPanel(false);
    if (APP_OF_VIEW[view] && UI.app !== APP_OF_VIEW[view] && UI.app !== 'terminal') { /* opened from inside the app itself */ }
    origGo.call(this, view);
    const p = PAGES[view];
    if (p) { p.build.call(p, this.el); this.el._x = view; p.render(true); }
    if (view === 'token') UI.instantPanel(icfg().open !== false || true);
    for (const b of document.querySelectorAll('#nav button')) b.classList.toggle('on', b.dataset.view === view);
  };
  UI.render = function (full) {
    origRender.call(this, full);
    const p = PAGES[this.view];
    if (p && this.el && this.el._x === this.view) { try { p.render(full); } catch (e) { if (g.parent && g.parent.degen) g.parent.degen.log('page ' + this.view + ': ' + e.message); } }
    if (this.view === 'token' && UI.app === 'terminal') { UI.renderInstant(); try { UI.renderPos(); } catch (e) { /* ignore */ } }
    if (!UI.app) renderDesk();
  };
  UI.key = function (e) { return origKey.call(this, e); };
  BH.AppsUI = { APPS, openApp: (id, v) => UI.openApp(id, v), showDesktop: () => UI.showDesktop(), APP_OF_VIEW };
})(window);
