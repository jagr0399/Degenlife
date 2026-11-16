/* Token page redesign (the playtester's Axiom reference, Nov 15). Wraps the generated token page; ui.js is not edited.
   - Header: TICKER with pair / launchpad / DIV badges, name, age, socials, CA; big market cap; Price, Liquidity, Supply,
     Global Fees, Holders; KOLs-only bubbles toggle; Instant Trade button.
   - Right column: 5m / 1h / 6h / 24h change tiles; Vol, Buys, Sells, Net flow with a buy/sell bar; Market / Limit / Adv. row;
     8 buy presets; Bought / Sold / Holding / PnL boxes; a 3x3 Token Info grid (Top 10, Dev, Snipers, Insiders, Bundlers,
     LP Burned, Holders, Pro Traders, Dex Paid). The old risk grid is hidden (its vamp warning stays).
   - Bottom tabs like Axiom (Nov 16): Trades / Positions / Orders / Holders (N) / Top Traders / Early Buyers / Dev Tokens (N) /
     Callouts, with an Instant Trade button on the right.
   Loaded last in apps/terminal.html. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, C = BH.C, F = BH.fmt, icon = BH.icon, esc = BH.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const set = (el, html) => { if (el && el._h !== html) { el._h = html; el.innerHTML = html; } };
  // 8 presets in two rows (keys 1-4 still buy the first four)
  C.BUY_PRESETS = [0.1, 0.25, 0.5, 1, 2, 3, 5, 10];
  const SOLI = '<i class="tp-sol"></i>';
  const padOf = (tk) => (BH.PADS || []).find((p) => p.id === tk.lp) || { name: 'Launchpad', short: 'L', color: '#f4b23e', fee: C.CURVE_FEE };
  const padName = (p) => (p.id === 'pumplab' ? 'Pump' : p.name);
  // big moves read as a multiple (a 2-minute-old coin's "24h" change is its whole life)
  const pct = (v) => (Math.abs(v) >= 1000 ? (1 + v / 100).toFixed(v >= 9900 ? 0 : 1) + 'x' : (v >= 0 ? '+' : '') + v.toFixed(Math.abs(v) >= 100 ? 0 : 2) + '%');

  function ensure() {
    const head = $('#thead'), side = $('#tside');
    if (!head || !side) return false;
    document.body.classList.add('tp2');
    if (!$('#thead2')) { const h = document.createElement('div'); h.id = 'thead2'; h.className = 'thead2'; head.parentNode.insertBefore(h, head); h.addEventListener('click', onHead); }
    if (!$('#tsTop')) { const t = document.createElement('div'); t.id = 'tsTop'; t.className = 'panel ts-top'; side.insertBefore(t, side.firstChild); }
    const first = side.querySelector('.panel:not(#tsTop)');
    if (first && !$('#tpMode')) {
      const m = document.createElement('div'); m.id = 'tpMode'; m.className = 'tp-mode';
      m.innerHTML = '<button data-m="market" class="on">Market</button><button data-m="limit">Limit</button><button data-m="adv">Adv.</button><span class="spacer"></span><span class="tp-bal" id="tpBal"></span>';
      const bs = $('#bs', first); if (bs) bs.parentNode.insertBefore(m, bs.nextSibling);
      m.addEventListener('click', (e) => {
        const b = e.target.closest('[data-m]'); if (!b) return;
        for (const x of m.querySelectorAll('[data-m]')) x.classList.toggle('on', x === b);
        const sr = first.querySelector('.settingsrow');
        if (b.dataset.m === 'adv') { if (sr) sr.classList.toggle('show'); }
        if (b.dataset.m === 'limit') { const o = [...document.querySelectorAll('#tside .panel h3')].find((h) => /Orders/.test(h.textContent)); if (o) o.parentNode.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      });
      const go = $('#go', first);
      if (go && !$('#tpMini')) { const mini = document.createElement('div'); mini.id = 'tpMini'; mini.className = 'tp-mini'; go.parentNode.insertBefore(mini, go.nextSibling); }
    }
    if (!$('#tpInfo')) { const info = document.createElement('div'); info.id = 'tpInfo'; info.className = 'panel tp-info'; const at = side.querySelector('.panel:not(#tsTop)'); side.insertBefore(info, at ? at.nextSibling : null); }
    const tabs = $('#ttabs');
    if (tabs && !$('#tpTabIT')) {
      const k = document.createElement('button'); k.id = 'tpTabKol'; k.className = 'tp-kol sm'; k.dataset.h = 'kols'; k.title = 'Show only KOL (and your) bubbles on the chart'; k.innerHTML = icon('crown', 'sm') + 'KOLs';
      k.onclick = (e) => { e.stopPropagation(); onHead({ target: k }); k.classList.toggle('on', !!(UI.chart && UI.chart._kolOnly)); };
      const b = document.createElement('button'); b.id = 'tpTabIT'; b.className = 'tp-it sm'; b.innerHTML = icon('zap', 'sm') + 'Instant Trade'; b.onclick = (e) => { e.stopPropagation(); UI.instantPanel && UI.instantPanel(true); };
      tabs.appendChild(k); tabs.appendChild(b);
    }
    return true;
  }

  function onHead(e) {
    const b = e.target.closest('[data-h]'); if (!b) return;
    const a = b.dataset.h, ch = UI.chart;
    if (a === 'it' && UI.instantPanel) UI.instantPanel(true);
    if (a === 'ca') { const tk = UI.game.sim.byId.get(UI.tokenId); if (tk && navigator.clipboard) navigator.clipboard.writeText(tk.ca).catch(() => {}); UI.toast('info', 'Contract address copied'); }
    if (a === 'kols' && ch && ch.L && ch.L.disp) {
      const mk = ch.L.disp.mk;
      if (ch._kolOnly) { Object.assign(mk, ch._kolOnly); ch._kolOnly = null; }
      else { ch._kolOnly = Object.assign({}, mk); for (const k of Object.keys(mk)) mk[k] = k === 'kol' || k === 'you' || k === 'calls'; }
      if (ch.draw) ch.draw();
      render(true);
    }
  }

  function header(tk) {
    const sim = UI.game.sim, p = UI.game.player, risk = sim.risk(tk), mc = sim.mc(tk), ch = sim.change(tk, 60);
    const pad = padOf(tk), price = sim.price(tk) * C.SOL_USD, fees = tk.vol * (tk.stage === 'curve' ? pad.fee : C.AMM_FEE);
    const ava = ($('#thead .tok-ava') || {}).innerHTML || '';
    const soc = tk.socials || {};
    const pos = p.pos.get(tk.id), ps = pos && pos.tokens >= 1 ? UI.posStats(pos) : null;
    const kolOnly = UI.chart && UI.chart._kolOnly;
    return '<div class="tp-ava tok-ava">' + ava + '</div>' +
      '<div class="tp-id"><div class="tp-l1"><b class="tp-tk">' + esc(tk.ticker) + '</b>' +
        '<span class="tp-bdg pair">' + icon('link', 'sm') + '/' + esc(tk.pair || 'SOL') + '</span>' +
        (tk.rewards === 'holders' ? '<span class="tp-bdg div">DIV</span>' : '') +
        (tk.mayhem ? (() => { const M = tk.mayhem, now = UI.game.sim.t, live = !M.done && now >= M.start; return '<span class="tp-bdg mh' + (live ? ' live' : '') + '" title="Mayhem Mode: pump.fun\'s bot got 1B extra tokens (2B supply) and trades this coin at random. Tiny trades, big jumps; prices often end far below launch.">' + icon('bot', 'sm') + (M.done ? 'MAYHEM ENDED · ' + M.trades + ' trades' : now < M.start ? 'MAYHEM · starting' : 'MAYHEM · ' + M.trades + ' trades') + '</span>'; })() : '') +
        '<span class="tp-nm">' + esc(tk.name) + '</span>' +
        '<button class="tp-ic" data-h="ca" title="Copy contract address">' + icon('copy', 'sm') + '</button>' +
        (tk.isPlayer ? '<span class="tp-bdg you">' + icon('crown', 'sm') + 'Your coin</span>' : '') + (tk.rugged ? '<span class="tp-bdg bad">Rugged</span>' : '') + (tk.vampOf ? '<span class="tp-bdg bad">Vamp?</span>' : '') + '</div>' +
        '<div class="tp-l2"><span class="tp-age">' + F.age(sim.t - tk.born) + '</span>' +
        '<span class="tp-pad" style="--c:' + pad.color + '"><i></i>' + esc(padName(pad)) + '</span>' +
        (soc.x ? '<span class="tp-s" title="X account">' + icon('at-sign', 'sm') + '</span>' : '') + (soc.tg ? '<span class="tp-s" title="Telegram">' + icon('send', 'sm') + '</span>' : '') + (soc.web ? '<span class="tp-s" title="Website">' + icon('globe', 'sm') + '</span>' : '') +
        '<span class="tp-s" title="Search X for the ticker">' + icon('search', 'sm') + '</span>' +
        '<span class="tp-ca">' + F.short(tk.ca) + '</span>' + (tk.stage === 'amm' ? '<span class="tp-mig">Migrated</span>' : '<span class="tp-mig curve">' + sim.progress(tk).toFixed(0) + '% bonded</span>') + '</div></div>' +
      '<b class="tp-mc ' + (ch >= 0 ? 'up' : 'down') + '">' + F.usd(mc) + '</b>' +
      '<div class="tp-st" data-k="price"><span>Price</span><b>$' + (price >= 0.01 ? price.toFixed(4) : F.price(price)) + '</b></div>' +
      '<div class="tp-st" data-k="liq"><span>Liquidity</span><b>' + F.usd(sim.liquidity(tk) * C.SOL_USD) + '</b></div>' +
      '<div class="tp-st" data-k="supply"><span>Supply</span><b>1B</b></div>' +
      '<div class="tp-st" data-k="fees"><span>Global Fees</span><b>' + SOLI + F.sol(fees, 2) + '</b></div>' +
      '<div class="tp-st" data-k="holders"><span>Holders</span><b>' + F.num(risk.holders) + '</b></div>' +
      (ps ? '<div class="tp-st" data-k="bag"><span>Your bag</span><b class="' + (ps.total >= 0 ? 'up' : 'down') + '">' + F.sol(ps.value) + ' SOL</b></div>' : '') +
      '';   // the KOLs toggle and Instant Trade live in the tab bar under the chart (room for them there)
    void kolOnly;
  }

  function sideTop(tk) {
    const sim = UI.game.sim;
    const tiles = [['5m', 300], ['1h', 3600], ['6h', 21600], ['24h', 86400]].map(([l, s]) => { const v = sim.change(tk, s); return '<div class="tp-tile"><span>' + l + '</span><b class="' + (v >= 0 ? 'up' : 'down') + '">' + pct(v) + '</b></div>'; }).join('');
    let bS = 0, sS = 0, bN = 0, sN = 0;
    for (const t of tk.trades) { if (t.side === 'buy') { bS += t.sol; bN++; } else { sS += t.sol; sN++; } }
    const tot = Math.max(1e-9, bS + sS), net = (bS - sS) * C.SOL_USD;
    return '<div class="tp-tiles">' + tiles + '</div>' +
      '<div class="tp-flow"><div><span>Vol</span><b>' + F.usd(tk.vol * C.SOL_USD) + '</b><small>' + F.num(tk.buys + tk.sells) + ' txns</small></div>' +
      '<div><span>Buys</span><b class="up">' + F.num(tk.buys) + '</b><small>' + F.usd(bS * C.SOL_USD) + '</small></div>' +
      '<div><span>Sells</span><b class="down">' + F.num(tk.sells) + '</b><small>' + F.usd(sS * C.SOL_USD) + '</small></div>' +
      '<div><span>Net flow</span><b class="' + (net >= 0 ? 'up' : 'down') + '">' + (net >= 0 ? '+' : '−') + F.usd(Math.abs(net)) + '</b><small>last ' + tk.trades.length + ' trades</small></div></div>' +
      '<div class="tp-bar"><i style="width:' + (bS / tot * 100).toFixed(1) + '%"></i></div>';
  }

  function mini(tk) {
    const p = UI.game.player, pos = p.pos.get(tk.id), s = UI.posStats(pos);
    const box = (l, v, cls) => '<div><span>' + l + '</span><b class="' + (cls || '') + '">' + SOLI + v + '</b></div>';
    return box('Bought', F.sol(s.invested, 3)) + box('Sold', F.sol(s.sold, 3)) + box('Holding', F.sol(s.value, 3)) + box('PnL', (s.total >= 0 ? '+' : '') + F.sol(s.total, 3), s.total > 0 ? 'up' : s.total < 0 ? 'down' : '');
  }

  function info(tk) {
    const sim = UI.game.sim, r = sim.risk(tk);
    let pros = 0; for (const h of tk.holders.values()) if (h.tokens > 1 && (h.kind === 'whale' || h.kind === 'kol')) pros++;
    const lp = tk.stage === 'amm' ? (tk.hint && tk.hint.lp === false ? 0 : 100) : null;
    const tile = (v, lbl, ic, cls) => '<div class="tp-it2"><b class="' + (cls || '') + '">' + v + '</b><span>' + icon(ic, 'sm') + lbl + '</span></div>';
    const bad = (v, a, b) => (v >= b ? 'down' : v >= a ? 'warn' : 'up');
    return '<h3>Token Info</h3><div class="tp-grid">' +
      tile(F.pctPlain(r.top10), 'Top 10 H.', 'users-round', bad(r.top10, 30, 50)) +
      tile(tk.devSold ? 'Sold' : F.pctPlain(r.dev), 'Dev H.', 'code', tk.devSold ? 'down' : bad(r.dev, 5, 12)) +
      tile(F.pctPlain(r.snipers), 'Snipers H.', 'crosshair', bad(r.snipers, 5, 15)) +
      tile(F.pctPlain(r.insiders), 'Insiders', 'ghost', bad(r.insiders, 5, 12)) +
      tile(F.pctPlain(r.bundle), 'Bundlers', 'boxes', bad(r.bundle, 8, 20)) +
      tile(lp == null ? '—' : lp + '%', 'LP Burned', 'flame', lp == null ? '' : lp ? 'up' : 'down') +
      tile(F.num(r.holders), 'Holders', 'users', '') +
      tile(String(pros), 'Pro Traders', 'briefcase', '') +
      tile(tk.dexPaid || tk.paid ? 'Paid' : 'Unpaid', 'Dex Paid', 'badge-check', tk.dexPaid || tk.paid ? 'up' : 'down') + '</div>';
  }

  const TABS = [['trades', 'Trades'], ['positions', 'Positions'], ['orders', 'Orders'], ['holders', 'Holders'], ['top', 'Top Traders'], ['early', 'Early Buyers'], ['dev', 'Dev Tokens'], ['callouts', 'Callouts']];
  const NEW_TABS = { positions: 1, orders: 1, early: 1, dev: 1, callouts: 1 };
  function tabsBar() {
    const bar = document.getElementById('ttabs'); if (!bar || bar._axiom) return;
    bar._axiom = true;
    bar.innerHTML = TABS.map(([t, l]) => '<button data-t="' + t + '">' + l + '</button>').join('');
    if (UI.tab === 'mine') UI.tab = 'positions';
  }
  const usdS = (sol) => F.usd(sol * BH.C.SOL_USD);
  const tagK = (k) => '<span class="kind ' + esc(k) + '">' + ({ you: 'YOU', dev: 'DEV', sniper: 'SNIPER', insider: 'EARLY', kol: 'KOL', whale: 'WHALE', mayhem: 'MAYHEM', retail: 'TRADER' }[k] || 'TRADER') + '</span>';
  const who = (addr, kind) => { const kn = BH.J7 && BH.J7.names && (BH.J7.names[addr] || (kind === 'kol' && BH.J7.kolFor ? BH.J7.kolFor(addr) : null)); return kn ? '<b>@' + esc(String(kn.name)) + '</b>' : addr === 'YOU' ? '<b>You</b>' : '<span class="dim">' + esc(String(addr).slice(0, 4) + '…' + String(addr).slice(-4)) + '</span>'; };
  // a dev's other launches: how many and how they went (made up from the dev wallet, the same every time)
  function devTokens(tk) {
    const seed = [...String(tk.devAddr || tk.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7), r = BH.makeRng(seed);
    const x = r(), count = x < 0.55 ? r.int(1, 12) : x < 0.85 ? r.int(13, 400) : r.int(401, 9000);
    const migr = Math.round(count * (count > 400 ? r.range(0.001, 0.01) : r.range(0, 0.06)));
    const list = Array.from({ length: Math.min(12, count - 1) }, () => { const t = BH.Names.token(r); const ath = r.logn(4000, 1.3); return { t, ath, ago: r.int(5, 60 * 24 * 30), mig: ath > 34000 }; });
    return { count, migr, list };
  }
  function newTable(tk, tab) {
    const sim = UI.game.sim, gm = UI.game;
    if (tab === 'positions') {
      const rows = [...gm.player.pos.values()].map((p) => ({ p, t: sim.byId.get(p.id) })).filter((x) => x.t);
      if (!rows.length) return '<div class="empty">No open positions. Your bags show up here.</div>';
      return '<table class="tbl"><thead><tr><th class="l">Token</th><th>Bought</th><th>Sold</th><th>Remaining</th><th>PnL</th><th></th></tr></thead><tbody>' + rows.map(({ p, t }) => {
        const S = UI.posStats(p), pct = S.invested > 0 ? S.total / S.invested * 100 : 0;
        return '<tr class="' + (t.id === tk.id ? 'you' : '') + '" data-open="' + t.id + '"><td class="l"><b>$' + esc(t.ticker) + '</b> <span class="dim">' + F.usd(sim.mc(t)) + '</span></td><td>' + F.sol(S.invested, 3) + '</td><td>' + F.sol(S.sold, 3) + '</td><td>' + F.sol(S.value, 3) + '</td><td class="' + (S.total >= 0 ? 'up' : 'down') + '">' + (S.total >= 0 ? '+' : '') + F.sol(S.total, 3) + ' <span class="dim">(' + (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%)</span></td><td><button class="btn sm" data-sellall="' + t.id + '">Sell all</button></td></tr>';
      }).join('') + '</tbody></table>';
    }
    if (tab === 'orders') {
      const O = gm.sys.orders, list = O ? O.list.slice() : [];
      if (!list.length) return '<div class="empty">No open orders. Set a take-profit, stop-loss or limit from the trade panel or by dragging on the chart.</div>';
      const kn = { tp: 'Take profit', sl: 'Stop loss', limit: 'Limit buy', alert: 'Alert' };
      return '<table class="tbl"><thead><tr><th class="l">Token</th><th class="l">Type</th><th>Trigger MC</th><th>Amount</th><th>MC now</th><th></th></tr></thead><tbody>' + list.map((o) => {
        const t = sim.byId.get(o.coin); if (!t) return '';
        return '<tr class="' + (t.id === tk.id ? 'you' : '') + '"><td class="l"><b>$' + esc(t.ticker) + '</b></td><td class="l">' + (kn[o.kind] || esc(o.kind)) + '</td><td>' + F.usd(o.mc) + '</td><td>' + (o.kind === 'limit' ? F.sol(o.amount, 2) + ' SOL' : o.kind === 'alert' ? '—' : Math.round((o.amount || 1) * 100) + '%') + '</td><td>' + F.usd(sim.mc(t)) + '</td><td><button class="btn sm" data-cancel="' + o.id + '">Cancel</button></td></tr>';
      }).join('') + '</tbody></table>';
    }
    if (tab === 'early') {
      const seen = new Set(), first = [];
      for (const b of tk.bubbles || []) { if (b.side !== 'buy' || seen.has(b.addr)) continue; seen.add(b.addr); first.push(b); if (first.length >= 30) break; }
      if (!first.length) return '<div class="empty">No buyers yet.</div>';
      return '<table class="tbl"><thead><tr><th>#</th><th class="l">Wallet</th><th>Bought at</th><th>Spent</th><th class="l">Now</th><th>PnL</th></tr></thead><tbody>' + first.map((b, i) => {
        const h = tk.holders.get(b.addr), price = sim.price(tk), pnl = h ? h.sold + h.tokens * price - h.bought : 0, hold = h && h.tokens > 1;
        const st = !h ? 'gone' : hold ? (h.sold > 0 ? 'Sold part' : 'Holding') : 'Sold all';
        return '<tr class="' + (b.addr === 'YOU' ? 'you' : '') + '"><td class="dim">' + (i + 1) + '</td><td class="l">' + tagK(b.kind === 'you' ? 'you' : b.kind) + ' ' + who(b.addr) + '</td><td>' + F.usd(b.mc) + '</td><td>' + F.sol(b.sol, 2) + '</td><td class="l ' + (hold ? 'up' : 'dim') + '">' + st + '</td><td class="' + (pnl >= 0 ? 'up' : 'down') + '">' + (pnl >= 0 ? '+' : '') + F.sol(pnl, 2) + '</td></tr>';
      }).join('') + '</tbody></table>';
    }
    if (tab === 'dev') {
      const d = devTokens(tk), age = (m) => (m < 60 ? m + 'm' : m < 1440 ? Math.floor(m / 60) + 'h' : Math.floor(m / 1440) + 'd');
      return '<div class="tp-devsum">' + (d.count > 400 ? '<span class="kind sniper">SERIAL DEV</span> ' : '') + 'This dev launched <b>' + d.count.toLocaleString() + '</b> tokens · <b>' + d.migr.toLocaleString() + '</b> migrated (' + (d.count ? (d.migr / d.count * 100).toFixed(1) : 0) + '%)</div>' +
        '<table class="tbl"><thead><tr><th class="l">Token</th><th>ATH MC</th><th class="l">Status</th><th>Age</th></tr></thead><tbody>' +
        '<tr class="you"><td class="l"><b>$' + esc(tk.ticker) + '</b> <span class="dim">this coin</span></td><td>' + F.usd(tk.athMc || sim.mc(tk)) + '</td><td class="l">' + (tk.stage === 'amm' ? 'Migrated' : 'Bonding') + '</td><td>' + F.age(sim.t - tk.born) + '</td></tr>' +
        d.list.map((x) => '<tr><td class="l">$' + esc(x.t.ticker) + ' <span class="dim">' + esc(x.t.name) + '</span></td><td>' + F.usd(x.ath) + '</td><td class="l ' + (x.mig ? 'up' : 'dim') + '">' + (x.mig ? 'Migrated' : 'Dead') + '</td><td>' + age(x.ago) + '</td></tr>').join('') + '</tbody></table>';
    }
    if (tab === 'callouts') {
      const now = sim.mc(tk), rows = [];
      for (const c of tk.calls || []) rows.push({ t: c.t, who: c.who === 'you' ? 'You' : '@' + String(c.who).replace(/^@+/, ''), mc: c.mc, text: c.text || '' });
      const T = gm.sys.trencher; if (T && T.feed) for (const c of T.feed(200)) if (c.coin === tk.id && c.npc) { const j = gm.sys.j7, a = j && j.acc(c.who); rows.push({ t: c.t, who: a ? a.handle : c.who, mc: c.mcAt, text: c.thesis || '', peak: c.peak / c.mcAt }); }
      rows.sort((a, b) => b.t - a.t);
      if (!rows.length) return '<div class="empty">Nobody has called this coin yet.</div>';
      return '<table class="tbl"><thead><tr><th class="l">Caller</th><th>Called at</th><th>x since</th><th class="l">Thesis</th><th>Age</th></tr></thead><tbody>' + rows.slice(0, 30).map((c) => { const x = c.mc > 0 ? now / c.mc : 0; return '<tr><td class="l"><b>' + esc(c.who) + '</b></td><td>' + F.usd(c.mc) + '</td><td class="' + (x >= 1 ? 'up' : 'down') + '">' + x.toFixed(2) + 'x</td><td class="l dim">' + esc(c.text.slice(0, 80)) + '</td><td>' + F.age(sim.t - c.t) + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    return '';
  }
  const origTable = UI.renderTable;
  UI.renderTable = function (tk, risk) {
    tabsBar();
    if (!NEW_TABS[this.tab]) return origTable.apply(this, arguments);
    const host = document.getElementById('tbl'); if (!host) return;
    host._last = null;
    const html = newTable(tk, this.tab);
    if (host._h !== html) { host._h = html; host.innerHTML = html; }
  };
  document.addEventListener('click', (e) => {
    const host = document.getElementById('tbl'); if (!host || !host.contains(e.target)) return;
    const op = e.target.closest('[data-open]'), sa = e.target.closest('[data-sellall]'), cn = e.target.closest('[data-cancel]');
    if (sa) { e.stopPropagation(); const r = UI.game.player.sell(sa.dataset.sellall, 1); if (r && r.ok === false) UI.toast('fail', r.reason); return; }
    if (cn) { e.stopPropagation(); UI.game.sys.orders.remove(+cn.dataset.cancel || cn.dataset.cancel); UI.renderTable(UI.game.sim.byId.get(UI.tokenId), null); return; }
    if (op && op.dataset.open !== UI.tokenId) UI.openToken(op.dataset.open);
  });

  function render(force) {
    try {
      if (UI.view !== 'token' || !UI.tokenId) return;
      const tk = UI.game.sim.byId.get(UI.tokenId); if (!tk || !ensure()) return;
      set($('#thead2'), header(tk));
      set($('#tsTop'), sideTop(tk));
      if ($('#tpMini')) set($('#tpMini'), mini(tk));
      set($('#tpInfo'), info(tk));
      const bal = $('#tpBal'); if (bal) bal.innerHTML = SOLI + F.sol(UI.game.player.sol, 2);
      // tab labels like the reference
      tabsBar();
      const risk = UI.game.sim.risk(tk);
      for (const b of document.querySelectorAll('#ttabs button[data-t]')) {
        const lbl = { trades: 'Trades', positions: 'Positions', orders: 'Orders', holders: 'Holders (' + Math.round(risk.holders).toLocaleString() + ')', top: 'Top Traders', early: 'Early Buyers', dev: 'Dev Tokens (' + devTokens(tk).count.toLocaleString() + ')', callouts: 'Callouts' }[b.dataset.t];
        if (lbl && b._lbl !== lbl) { b._lbl = lbl; b.textContent = lbl; }
      }
      void force;
    } catch (e) { /* the redesign is a skin: never break trading */ }
  }

  const orig = UI.renderToken;
  UI.renderToken = function () { const out = orig.apply(this, arguments); render(false); return out; };
  BH.TokenPage = { render: () => render(true) };
})(window);
