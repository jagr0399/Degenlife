/* Watchlist bar like Axiom's (playtester, Nov 16): a strip under the terminal's top bar with three lists:
   ★ Favorites (star a coin on its token page), 📈 Holding (coins you hold, plus coins you have a limit-buy bid on), and
   ⟲ Recent (coins you traded before). Each chip: picture, ticker, live market cap and a ⚡ quick-buy. Click a chip to open
   the coin. Favorites are saved with the game (game.meta.favs); the open tab is a per-viewer setting. Loaded after mktsounds.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, F = BH.fmt, icon = BH.icon, esc = BH.esc, C = BH.C;
  const TABKEY = 'degen.wl.tab';
  let tab = 'hold';
  try { tab = localStorage.getItem(TABKEY) || 'hold'; } catch (e) { /* storage blocked */ }
  const gm = () => UI.game;
  const favs = () => { const m = gm().meta = gm().meta || {}; return (m.favs = m.favs || []); };
  const isFav = (id) => favs().includes(id);
  function toggleFav(id) {
    const f = favs(), i = f.indexOf(id), tk = gm().sim.byId.get(id);
    if (i >= 0) f.splice(i, 1); else f.unshift(id);
    if (f.length > 40) f.length = 40;
    UI.toast('info', (i >= 0 ? 'Removed $' : 'Added $') + (tk ? tk.ticker : 'coin') + (i >= 0 ? ' from' : ' to') + ' favorites');
    render(true); star();
  }
  // the three lists
  function lists() {
    const g2 = gm(), sim = g2.sim, pl = g2.player, byId = (id) => sim.byId.get(id);
    const hold = [...pl.pos.values()].filter((p) => p.tokens >= 1).map((p) => ({ tk: byId(p.id) })).filter((x) => x.tk);
    const held = new Set(hold.map((x) => x.tk.id));
    const ord = g2.sys.orders ? g2.sys.orders.list.filter((o) => o.kind === 'limit') : [];
    for (const o of ord) if (!held.has(o.coin)) { const tk = byId(o.coin); if (tk) { held.add(o.coin); hold.push({ tk, bid: o }); } }
    const seen = new Set(), recent = [];
    for (const c of pl.closed) { if (seen.has(c.id) || recent.length >= 25) continue; seen.add(c.id); const tk = byId(c.id); if (tk && !held.has(c.id)) recent.push({ tk, pnl: c.pnl }); }
    const fav = favs().map((id) => ({ tk: byId(id) })).filter((x) => x.tk);
    return { fav, hold, recent };
  }
  function chip(x) {
    const tk = x.tk, sim = gm().sim, mc = sim.mc(tk), q = UI.settings.quick || 0.25, usd = UI.settings.unit === 'usd';
    const tag = x.bid ? '<span class="wl-tag bid" title="Limit buy at ' + F.usd(x.bid.mc) + '">bid</span>' : x.pnl != null ? '<span class="wl-tag ' + (x.pnl >= 0 ? 'up' : 'down') + '">' + (x.pnl >= 0 ? '+' : '') + x.pnl.toFixed(2) + '</span>' : '';
    return '<div class="wl-chip' + (tk.dead || tk.rugged ? ' dead' : '') + '" data-open="' + tk.id + '" title="' + esc(tk.name) + '">' +
      '<span class="wl-ava tok-ava">' + BH.avatar(tk) + '</span><b>' + esc(tk.ticker) + '</b><span class="wl-mc">' + (tk.rugged ? 'rugged' : tk.dead ? 'dead' : F.usd(mc)) + '</span>' + tag +
      (tk.dead || tk.rugged ? '' : '<button class="wl-qb" data-qb="' + tk.id + '" title="Quick buy ' + q + ' SOL">' + icon('zap', 'sm') + (usd ? '$' + Math.round(q * C.SOL_USD) : q) + '</button>') + '</div>';
  }
  let bar = null, lastH = '';
  function render(force) {
    if (!bar || !gm() || !gm().sim) return;
    const L = lists(), cur = tab === 'fav' ? L.fav : tab === 'recent' ? L.recent : L.hold;
    const empty = { fav: 'No favorites yet. Star a coin on its page (☆ next to the ticker).', hold: 'Nothing held and no open bids.', recent: 'No closed trades yet.' }[tab];
    const btn = (id, ic, title, n) => '<button class="wl-t' + (tab === id ? ' on' : '') + '" data-tab="' + id + '" title="' + title + '">' + icon(ic, 'sm') + (n ? '<i>' + n + '</i>' : '') + '</button>';
    const h = '<div class="wl-tabs">' + btn('fav', 'star', 'Favorites', L.fav.length) + btn('hold', 'trending-up', 'Holding and open bids', L.hold.length) + btn('recent', 'history', 'Recently traded', L.recent.length) + '</div>' +
      '<div class="wl-list">' + (cur.length ? cur.map(chip).join('') : '<span class="wl-empty">' + empty + '</span>') + '</div>';
    if (force || h !== lastH) { lastH = h; bar.innerHTML = h; }
  }
  function mount() {
    const app = document.getElementById('app'), main = document.getElementById('view'); if (!app || !main || document.getElementById('wlBar')) return;
    bar = document.createElement('div'); bar.id = 'wlBar'; app.insertBefore(bar, main);
    bar.addEventListener('click', (e) => {
      const qb = e.target.closest('[data-qb]'); if (qb) { e.stopPropagation(); UI.trade('buy', (UI.settings.quick || 0.25) * (e.shiftKey ? 2 : 1), qb.dataset.qb); return; }
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; try { localStorage.setItem(TABKEY, tab); } catch (e2) { /* blocked */ } render(true); return; }
      const o = e.target.closest('[data-open]'); if (o) UI.openToken(o.dataset.open);
    });
    render(true);
  }
  // the star on the token page header
  let obs = null;
  function star() {
    const h2 = document.getElementById('thead2');
    // the header is redrawn often: put the star back the moment it is
    if (h2 && !obs && g.MutationObserver) { obs = new MutationObserver(() => { if (!h2.querySelector('.tp-fav')) star(); }); obs.observe(h2, { childList: true, subtree: true }); }
    const l1 = document.querySelector('#thead2 .tp-l1'), id = UI.tokenId; if (!l1 || !id) return;
    let b = l1.querySelector('.tp-fav');
    if (!b) { b = document.createElement('button'); b.className = 'tp-ic tp-fav'; b.addEventListener('click', (e) => { e.stopPropagation(); toggleFav(UI.tokenId); }); const tk = l1.querySelector('.tp-tk'); l1.insertBefore(b, tk ? tk.nextSibling : l1.firstChild); }
    const on = isFav(id);
    if (b._on !== on || !b.innerHTML) { b._on = on; b.classList.toggle('on', on); b.title = on ? 'Remove from favorites' : 'Add to favorites'; b.innerHTML = icon('star', 'sm'); }
  }
  setInterval(() => { try { mount(); render(); star(); } catch (e) { /* decoration only */ } }, 700);
  // screenshot helper (#...&wl=1): star the open coin (memory only until the game saves) and show the favorites tab
  try { const h = (parent && parent.location && parent.location.hash) || ''; if (/[#&]wl=1/.test(h)) setTimeout(() => { const g2 = gm(); if (!g2) return; const ids = g2.sim.tokens.filter((t) => !t.dead).sort((a, b) => g2.sim.mc(b) - g2.sim.mc(a)).slice(0, 8).map((t) => t.id); g2.meta.favs = ids; tab = 'fav'; render(true); }, 2500); } catch (e) { /* not in the game frame */ }

  const css = document.createElement('style');
  css.textContent = 'body[data-app="terminal"] #app, body:not([data-app]) #app{grid-template-rows:48px 32px 1fr 30px}body[data-app]:not([data-app="terminal"]) #app{grid-template-rows:0 0 1fr 30px}body[data-app]:not([data-app="terminal"]) #wlBar{visibility:hidden;overflow:hidden;border:0;padding:0;min-height:0;height:0}' +
    '#wlBar{display:flex;align-items:center;gap:10px;padding:0 10px;border-bottom:1px solid var(--line,#1d222a);background:#0b0d11;overflow:hidden;min-width:0}' +
    '.wl-tabs{display:flex;gap:2px;flex:none}.wl-t{position:relative;display:inline-flex;align-items:center;justify-content:center;width:28px;height:24px;border-radius:6px;color:var(--muted,#8b93a1)}.wl-t:hover{color:#e8ecf3;background:rgba(255,255,255,.05)}.wl-t.on{color:#f4b23e;background:rgba(244,178,62,.1)}' +
    '.wl-t i{position:absolute;top:0;right:0;font-style:normal;font-size:9px;font-weight:800;color:#8b93a1}' +
    '.wl-list{display:flex;align-items:center;gap:18px;overflow-x:auto;scrollbar-width:none;min-width:0;flex:1}.wl-list::-webkit-scrollbar{display:none}' +
    '.wl-chip{display:flex;align-items:center;gap:6px;white-space:nowrap;cursor:pointer;font-size:12.5px;color:#e8ecf3}.wl-chip:hover b{text-decoration:underline}.wl-chip.dead{opacity:.5}' +
    '.wl-ava{width:18px;height:18px;border-radius:4px;overflow:hidden;position:relative;flex:none;display:inline-block}.wl-ava img,.wl-ava svg{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}.wl-ava .cletter{font-size:10px}' +
    '.wl-chip b{font-weight:700}.wl-mc{color:var(--muted,#8b93a1)}.wl-tag{font-size:10.5px;font-weight:700;padding:0 4px;border-radius:4px}.wl-tag.bid{background:rgba(74,141,255,.15);color:#6ea8ff}.wl-tag.up{color:#2bd67b}.wl-tag.down{color:#ff4d5e}' +
    '.wl-qb{display:inline-flex;align-items:center;gap:3px;height:22px;padding:0 8px;border-radius:12px;background:rgba(91,108,255,.14);color:#8a97ff;font-weight:700;font-size:12px}.wl-qb:hover{background:rgba(91,108,255,.28)}' +
    '.wl-empty{color:var(--muted,#8b93a1);font-size:12px}.tp-fav{color:var(--muted,#8b93a1)}.tp-fav.on{color:#f4b23e}.tp-fav.on svg{fill:#f4b23e}';
  document.head.appendChild(css);
  BH.Watchlist = { lists, toggleFav, isFav };
})(window);
