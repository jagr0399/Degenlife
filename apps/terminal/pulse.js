/* Pulse, Axiom-style: dense rows with a big square coin image (progress ring + address under it), name + full name,
   age / icons / holders, colored stat chips, and a right box with V / MC / F / NB over a sparkline and a quick-buy button.
   Per-column search, filters, P1/P2/P3 quick-buy presets and mute. No flashing or slide animations anywhere. */
(function (g) {
  'use strict';
  const BH = g.BH, C = BH.C, F = BH.fmt, UI = BH.UI, icon = BH.icon, esc = BH.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const setHTML = (el, v) => { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } };
  const setText = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
  const COLS = [['new', 'New Pairs'], ['final', 'Final Stretch'], ['mig', 'Migrated']];
  const DEF = { presets: [0.1, 0.25, 0.5], preset: 1, q: '', minMc: '', maxMc: '', maxAge: '', minHold: '', minVol: '', muted: false };

  function cfg() {
    const s = UI.settings;
    if (!s.pulse) s.pulse = {};
    for (const [id] of COLS) s.pulse[id] = Object.assign({}, DEF, s.pulse[id] || {});
    if (!s.unit) s.unit = 'sol';
    return s.pulse;
  }
  const money = (sol) => UI.settings.unit === 'usd' ? '$' + (sol * C.SOL_USD).toLocaleString(undefined, { maximumFractionDigits: sol * C.SOL_USD < 10 ? 2 : 0 }) : F.sol(sol);
  const solMark = '<span class="solmark">SOL</span>';

  UI.buildPulse = function (el) {
    const P = cfg();
    const col = (id, title) => '<section class="col pcol" data-col="' + id + '"><div class="colhead ax">' +
      '<h2>' + title + '</h2><label class="csearch">' + icon('search', 'sm') + '<input data-q="' + id + '" placeholder="Search by ticker or name" value="' + esc(P[id].q) + '"></label>' +
      '<div class="qbx" title="Quick buy amount">' + icon('zap', 'sm') + '<input data-amt="' + id + '" value="' + P[id].presets[P[id].preset] + '"><span>' + (UI.settings.unit === 'usd' ? '$' : 'SOL') + '</span></div>' +
      '<div class="pp">' + [0, 1, 2].map((i) => '<button data-pre="' + id + ':' + i + '" class="' + (P[id].preset === i ? 'on' : '') + '">P' + (i + 1) + '</button>').join('') + '</div>' +
      '<button class="ib" data-mute="' + id + '" title="Mute new-coin sounds">' + icon(P[id].muted ? 'volume-x' : 'volume-2', 'sm') + '</button>' +
      '<button class="ib" data-filt="' + id + '" title="Filters">' + icon('sliders-horizontal', 'sm') + '</button>' +
      '</div><div class="fpanel" id="fp-' + id + '" hidden></div><div class="rows" id="rows-' + id + '"></div></section>';
    el.innerHTML = '<div class="pulse ax"><div class="pulsebar"><h1>Pulse</h1><div class="spacer"></div><div class="seg unit"><button data-unit="sol" class="' + (UI.settings.unit === 'sol' ? 'on' : '') + '">SOL</button><button data-unit="usd" class="' + (UI.settings.unit === 'usd' ? 'on' : '') + '">USD</button></div></div><div class="pcols">' + COLS.map(([id, t]) => col(id, t)).join('') + '</div></div>';
    el.addEventListener('input', (e) => {
      const t = e.target, P2 = cfg();
      if (t.dataset.q) { P2[t.dataset.q].q = t.value.trim().toLowerCase(); this.saveSettings(); this.render(true); }
      if (t.dataset.amt) { const v = parseFloat(t.value); if (v > 0) { const c = P2[t.dataset.amt]; c.presets[c.preset] = v; this.saveSettings(); } }
      if (t.dataset.f) { const [id, k] = t.dataset.f.split(':'); P2[id][k] = t.value; this.saveSettings(); this.render(true); }
    });
    el.addEventListener('click', (e) => {
      const P2 = cfg();
      const u = e.target.closest('[data-unit]'); if (u) { this.settings.unit = u.dataset.unit; this.saveSettings(); this.go('pulse'); return; }
      const pre = e.target.closest('[data-pre]'); if (pre) { const [id, i] = pre.dataset.pre.split(':'); P2[id].preset = +i; this.saveSettings(); this.go('pulse'); return; }
      const mu = e.target.closest('[data-mute]'); if (mu) { const c = P2[mu.dataset.mute]; c.muted = !c.muted; this.saveSettings(); mu.innerHTML = icon(c.muted ? 'volume-x' : 'volume-2', 'sm'); return; }
      const fb = e.target.closest('[data-filt]'); if (fb) { const id = fb.dataset.filt, p = $('#fp-' + id); p.hidden = !p.hidden; if (!p.hidden) this.filterPanel(p, id); return; }
      if (e.target.closest('.fpanel')) { if (e.target.closest('[data-reset]')) { const id = e.target.closest('[data-reset]').dataset.reset; Object.assign(P2[id], { minMc: '', maxMc: '', maxAge: '', minHold: '', minVol: '' }); this.saveSettings(); this.filterPanel($('#fp-' + id), id); this.render(true); } return; }
      const q = e.target.closest('.qb'); if (q) { e.stopPropagation(); const c = P2[q.dataset.col]; const amt = c.presets[c.preset]; this.trade('buy', this.settings.unit === 'usd' ? amt / C.SOL_USD : amt, q.dataset.id); return; }
      const dd = e.target.closest('[data-dd]'); if (dd) return;
      const row = e.target.closest('.axrow'); if (row) this.openToken(row.dataset.id);
    });
    this.rowEls = new Map();
  };
  UI.filterPanel = function (p, id) {
    const c = cfg()[id];
    const f = (k, label, ph) => '<label><span>' + label + '</span><input data-f="' + id + ':' + k + '" value="' + esc(c[k]) + '" placeholder="' + ph + '"></label>';
    p.innerHTML = '<div class="fgrid">' + f('minMc', 'Min MC ($K)', 'any') + f('maxMc', 'Max MC ($K)', 'any') + f('maxAge', 'Max age (min)', 'any') + f('minHold', 'Min holders', 'any') + f('minVol', 'Min 5m vol ($K)', 'any') + '</div><button class="btn sm ghost" data-reset="' + id + '">Reset</button>';
  };

  UI.rowEl = function (tk) {
    let r = this.rowEls.get(tk.id);
    if (r && r._mint === (tk.realMint || null)) return r;   // a coin that just got its real name and picture is rebuilt
    if (r) { r.remove(); this.rowEls.delete(tk.id); }
    r = document.createElement('div');
    r.className = 'axrow'; r.dataset.id = tk.id;
    const src = tk.realImg || (tk.img != null ? '../assets/coins/c' + tk.img + '.jpg' : null);
    const img = '<span class="ax-letter">' + esc(tk.ticker.charAt(0)) + '</span>' + (src ? '<img src="' + esc(src) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '');
    r.innerHTML = '<div class="ax-l"><div class="ax-img"><svg class="ax-ring" viewBox="0 0 76 76"><rect x="2" y="2" width="72" height="72" rx="10" fill="none" stroke="#1d222a" stroke-width="3"/><rect class="prog" x="2" y="2" width="72" height="72" rx="10" fill="none" stroke-width="3" pathLength="100" stroke-dasharray="0 100"/></svg><div class="ax-pic">' + img + '</div><span class="ax-plat" style="background:' + UI.game.sim.cv(tk).color + '" title="' + esc(UI.game.sim.cv(tk).name) + '">' + UI.game.sim.cv(tk).short + '</span><span class="ax-watch"></span></div><div class="ax-ca">' + esc(tk.ca.slice(0, 4) + '…' + tk.ca.slice(-4)) + '</div></div>' +
      '<div class="ax-m"><div class="ax-l1"><b class="ax-tk"></b><span class="ax-nm"></span>' + icon('copy', 'sm') + '</div><div class="ax-l2"><span class="ax-age"></span><span class="ax-ic"></span><span class="ax-hold"></span></div><div class="ax-chips"></div></div>' +
      '<div class="ax-r"><canvas class="ax-spark"></canvas><div class="ax-v"></div><div class="ax-f"></div><button class="qb"></button></div>';
    const q = (s) => r.querySelector(s);
    r._f = { prog: q('.prog'), tk: q('.ax-tk'), nm: q('.ax-nm'), age: q('.ax-age'), ic: q('.ax-ic'), hold: q('.ax-hold'), chips: q('.ax-chips'), v: q('.ax-v'), f: q('.ax-f'), qb: q('.qb'), spark: q('.ax-spark'), watch: q('.ax-watch') };
    setText(r._f.tk, tk.ticker); setText(r._f.nm, tk.name);
    r._f.ic.innerHTML = '<span class="ddq" data-dd="' + tk.id + '">' + icon('feather', 'sm') + '</span>' + (tk.socials.x ? icon('at-sign', 'sm') : '') + (tk.socials.tg ? icon('send', 'sm') : '') + (tk.socials.web ? icon('globe', 'sm') : '') + icon('search', 'sm');
    r._mint = tk.realMint || null;
    this.rowEls.set(tk.id, r);
    return r;
  };

  function chip(ic, v, good, bad, tip) { const c = v >= bad ? 'bad' : v >= good ? 'warn' : 'ok'; return '<span class="axc ' + c + '" data-tip="' + tip + '">' + icon(ic, 'sm') + v.toFixed(v < 10 ? 0 : 0) + '%</span>'; }
  function spark(cv, tk, sim) {
    const now = performance.now(); if (cv._t && now - cv._t < 1000) return; cv._t = now;
    // the size is read once (reading it every redraw forced a full page re-layout per card)
    if (!cv._W || cv._chk++ > 30) { cv._W = cv.clientWidth; cv._H = cv.clientHeight; cv._chk = 0; }
    const W = cv._W, H = cv._H; if (!W || !H) return;
    const dpr = g.devicePixelRatio || 1; if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const bars = BH.ChartModel.aggregate(tk.candles.length > 420 ? tk.candles.slice(-420) : tk.candles, 10, sim.t).slice(-40); if (bars.length < 2) return;
    let lo = Infinity, hi = -Infinity; for (const b of bars) { lo = Math.min(lo, b.c); hi = Math.max(hi, b.c); } if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const up = bars[bars.length - 1].c >= bars[0].c, col = up ? '43,214,123' : '255,77,94';
    ctx.beginPath(); bars.forEach((b, i) => { const x = i / (bars.length - 1) * W, y = H - 4 - (b.c - lo) / (hi - lo) * (H - 10); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.strokeStyle = 'rgba(' + col + ',.7)'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(' + col + ',.22)'); gr.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = gr; ctx.fill();
  }
  UI.fillRow = function (r, tk, p, colId) {
    const sim = this.game.sim, f = r._f, P = cfg();
    const prog = tk.stage === 'curve' ? sim.progress(tk) : 100;
    f.prog.setAttribute('stroke-dasharray', prog.toFixed(1) + ' 100');
    f.prog.setAttribute('stroke', tk.stage === 'amm' ? '#f4b23e' : prog > 45 ? '#4aa8ff' : '#2bd67b');
    setText(f.age, F.age(sim.t - tk.born));
    const risk = sim.risk(tk);
    const watchers = Math.max(1, Math.round(risk.holders / 9 + tk.hype * 4));
    setHTML(f.watch, icon('eye', 'sm') + watchers);
    const pos = p.pos.get(tk.id);
    setHTML(f.hold, icon('users', 'sm') + risk.holders + (pos && pos.tokens >= 1 ? ' <span class="brand">' + icon('briefcase', 'sm') + '</span>' : '') + (tk.isPlayer ? ' <span class="brand">' + icon('crown', 'sm') + '</span>' : ''));
    let c = chip('users-round', risk.top10, 30, 50, 'Top 10 holders');
    c += tk.devSold ? '<span class="axc bad" data-tip="Dev sold">' + icon('code', 'sm') + 'DS</span>' : chip('code', risk.dev, 5, 12, 'Dev holds');
    c += chip('crosshair', risk.snipers, 5, 15, 'Snipers hold') + chip('ghost', risk.insiders || 0, 5, 15, 'Insiders hold') + chip('boxes', risk.bundle, 8, 20, 'Bundlers hold');
    if (tk.kol && tk.kol.state !== 'wait' && tk.kol.state !== 'bought') c += '<span class="axc info">' + icon('megaphone', 'sm') + 'Called</span>';
    if (tk.hint) {
      const h = tk.hint;
      c += '<span class="axc ' + (h.lp ? 'ok' : 'bad') + '" data-tip="Liquidity locked?">' + icon(h.lp ? 'lock' : 'lock-open', 'sm') + 'LP</span>';
      c += '<span class="axc ' + (h.xAge < 3 ? 'bad' : h.xAge < 20 ? 'warn' : 'ok') + '" data-tip="X account age">X ' + (h.xAge < 1 ? 'new' : h.xAge + 'd') + '</span>';
      if (h.insiders) c += '<span class="axc ' + (h.insiders >= 5 ? 'bad' : 'warn') + '" data-tip="Insider wallets spotted">' + icon('ghost', 'sm') + h.insiders + '</span>';
    }
    if (tk.rewards === 'holders') c += '<span class="axc ok" data-tip="Dividends: creator fees go to holders">' + icon('badge-dollar-sign', 'sm') + 'Div</span>';
    if (tk.pair === 'USD1') c += '<span class="axc" data-tip="Paired to USD1 (market cap ignores SOL moves)">USD1</span>';
    if (tk.copyOf) c += '<span class="axc warn" data-tip="A copy of a coin that just ran">' + icon('copy', 'sm') + 'Copy</span>';
    if (tk.rugged) c += '<span class="axc bad">' + icon('skull', 'sm') + 'Rugged</span>';
    setHTML(f.chips, c);
    const v5 = sim.vol5m(tk) * C.SOL_USD, mc = sim.mc(tk);
    let nb = 0; for (let i = tk.trades.length - 1; i >= 0 && tk.trades[i].t > sim.t - 300; i--) nb += (tk.trades[i].side === 'buy' ? 1 : -1) * tk.trades[i].sol;
    const fees = tk.vol * (tk.stage === 'curve' ? sim.cv(tk).fee : C.AMM_FEE);
    setHTML(f.v, '<span>V</span><b>' + F.usd(v5) + '</b><span>MC</span><b class="mc' + (mc >= 30000 ? ' hot' : '') + '">' + F.usd(mc) + '</b>');
    setHTML(f.f, '<span>F</span><b>' + F.sol(fees) + '</b><span>NB</span><b class="' + (nb >= 0 ? 'up' : 'down') + '">' + (nb >= 0 ? '+' : '−') + F.usd(Math.abs(nb) * C.SOL_USD) + '</b>');
    const pc = P[colId] || P.new, amt = pc.presets[pc.preset];
    f.qb.dataset.col = colId; f.qb.dataset.id = tk.id;
    setHTML(f.qb, icon('zap', 'sm') + (this.settings.unit === 'usd' ? '$' + amt : amt + ' ' + solMark));
    spark(f.spark, tk, sim);
  };

  UI.renderPulse = function () {
    const sim = this.game.sim, p = this.game.player, P = cfg();
    const pass = (tk, c) => {
      if (c.q && !(tk.name.toLowerCase().includes(c.q) || tk.ticker.toLowerCase().includes(c.q) || tk.ca.toLowerCase().includes(c.q))) return false;
      const mc = sim.mc(tk) / 1000;
      if (c.minMc !== '' && mc < +c.minMc) return false; if (c.maxMc !== '' && mc > +c.maxMc) return false;
      if (c.maxAge !== '' && (sim.t - tk.born) / 60 > +c.maxAge) return false;
      if (c.minHold !== '' && sim.risk(tk).holders < +c.minHold) return false;
      if (c.minVol !== '' && sim.vol5m(tk) * C.SOL_USD / 1000 < +c.minVol) return false;
      return true;
    };
    const live = sim.tokens.filter((t) => !t.dead && (!this.search || t.name.toLowerCase().includes(this.search) || t.ticker.toLowerCase().includes(this.search)));
    const cols = {
      new: live.filter((t) => t.stage === 'curve' && sim.progress(t) < C.FINAL_STRETCH_PCT && pass(t, P.new)).sort((a, b) => b.born - a.born).slice(0, 30),
      final: live.filter((t) => t.stage === 'curve' && sim.progress(t) >= C.FINAL_STRETCH_PCT && pass(t, P.final)).sort((a, b) => sim.progress(b) - sim.progress(a)).slice(0, 30),
      mig: live.filter((t) => t.stage === 'amm' && pass(t, P.mig)).sort((a, b) => b.migratedAt - a.migratedAt).slice(0, 30),
    };
    const used = new Set();
    for (const [id, list] of Object.entries(cols)) {
      const host = $('#rows-' + id); if (!host) continue;
      // new coin at the top of New Pairs: a soft tick unless that column is muted (no visual flash)
      if (id === 'new' && list[0] && host._top && host._top !== list[0].id && !P.new.muted && BH.Sound) BH.Sound.play('chirp', { gain: 0.15 });
      host._top = list[0] ? list[0].id : null;
      let prev = null;
      for (const tk of list) {
        const r = this.rowEl(tk); used.add(tk.id);
        this.fillRow(r, tk, p, id);
        const want = prev ? prev.nextSibling : host.firstChild;
        if (r.parentNode !== host || want !== r) host.insertBefore(r, want);
        prev = r;
      }
      for (const ch of Array.from(host.children)) if (!list.some((t) => t.id === ch.dataset.id)) ch.remove();
      if (!list.length && !host.querySelector('.empty')) host.innerHTML = '<div class="empty">' + (id === 'mig' ? 'Nothing has graduated yet.' : id === 'final' ? 'No coin is close to graduating.' : 'No coins match.') + '</div>';
      else if (list.length) { const em = host.querySelector('.empty'); if (em) em.remove(); }
    }
    for (const id of Array.from(this.rowEls.keys())) if (!used.has(id)) { const r = this.rowEls.get(id); r.remove(); this.rowEls.delete(id); }
  };
})(window);
