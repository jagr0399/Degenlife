/* Hover impact on buy/sell buttons: before you click, see what the trade does.
   Hover a buy or sell button (instant-trade panel, the token page's preset row, ⚡ quick-buys on Discover and J7) and a small
   card shows what you get, the price move and the market cap before → after.
   Constant-product math (curve and AMM alike): price = SOL² / k, so the market cap after = MC × (SOL after / SOL before)².
   Loaded after milestones.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, F = BH.fmt;
  const game = () => UI.game;
  let tip = null, cur = null;
  const css = document.createElement('style');
  css.textContent = '.imp-tip{position:fixed;z-index:9999;pointer-events:none;min-width:190px;max-width:260px;padding:8px 10px;border-radius:8px;background:rgba(10,12,16,.97);border:1px solid #2a303b;box-shadow:0 8px 24px rgba(0,0,0,.45);font-size:11.5px;line-height:1.5;color:#c8ced8}' +
    '.imp-tip b{color:#f2f4f8;font-weight:700}.imp-tip .up{color:#2bd67b}.imp-tip .down{color:#ff4d5e}.imp-tip .r{display:flex;justify-content:space-between;gap:10px}.imp-tip .h{font-weight:800;color:#f2f4f8;margin-bottom:2px}.imp-tip .w{color:#f4b23e}';
  document.head.appendChild(css);

  const num = (n) => (F && F.num ? F.num(n) : (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(2)));
  const usd = (n) => (F && F.usd ? F.usd(n) : '$' + Math.round(n));
  // what a trade does: side 'buy' with SOL, or 'sell' with a fraction of your bag
  function impact(tk, side, amt) {
    const gm = game(), sim = gm.sim; if (!tk || tk.dead) return null;
    const curve = tk.stage === 'curve', x = curve ? tk.vSol : tk.poolSol; if (!(x > 0)) return null;
    const mc0 = sim.mc(tk);
    if (side === 'buy') {
      const q = sim.quote(tk, 'buy', amt); if (!q || !(q.out > 0)) return null;
      const fee = curve ? sim.cv(tk).fee : BH.C.AMM_FEE, x1 = x + amt * (1 - fee), mc1 = mc0 * Math.pow(x1 / x, 2);
      return { side, sol: amt, tok: q.out, mc0, mc1, move: mc1 / mc0 - 1, fee: q.fee, grad: curve && tk.realTok + q.out >= sim.cv(tk).real - 1 };
    }
    const p = gm.player.pos.get(tk.id); if (!p || !(p.tokens > 1)) return { side, none: true, mc0 };
    const tok = p.tokens * Math.min(1, amt), q = sim.quote(tk, 'sell', tok); if (!q) return null;
    const gross = q.out + q.fee, x1 = Math.max(1e-9, x - gross), mc1 = mc0 * Math.pow(x1 / x, 2);
    return { side, tok, sol: q.out, mc0, mc1, move: mc1 / mc0 - 1, fee: q.fee, frac: amt };
  }
  function html(tk, r) {
    if (!r) return '';
    if (r.none) return '<div class="h">Sell</div>You don\'t hold any $' + tk.ticker + ' yet.';
    const pct = (r.move * 100), mv = '<b class="' + (pct >= 0 ? 'up' : 'down') + '">' + (pct >= 0 ? '+' : '') + pct.toFixed(Math.abs(pct) < 10 ? 2 : 1) + '%</b>';
    const big = Math.abs(pct) >= 10 ? '<div class="w">Big move: you are a large part of this pool.</div>' : '';
    if (r.side === 'buy') return '<div class="h">Buy ' + r.sol + ' SOL of $' + tk.ticker + '</div>' +
      '<div class="r"><span>You get</span><b>' + num(r.tok) + ' $' + tk.ticker + '</b></div>' +
      '<div class="r"><span>Price</span>' + mv + '</div>' +
      '<div class="r"><span>Market cap</span><b>' + usd(r.mc0) + ' → ' + usd(r.mc1) + '</b></div>' +
      '<div class="r"><span>Fees</span><span>' + r.fee.toFixed(4) + ' SOL</span></div>' + (r.grad ? '<div class="w">This buy completes the bonding curve.</div>' : '') + big;
    return '<div class="h">Sell ' + Math.round(r.frac * 100) + '% of your $' + tk.ticker + '</div>' +
      '<div class="r"><span>You sell</span><b>' + num(r.tok) + ' $' + tk.ticker + '</b></div>' +
      '<div class="r"><span>You get</span><b>' + r.sol.toFixed(4) + ' SOL</b></div>' +
      '<div class="r"><span>Price</span>' + mv + '</div>' +
      '<div class="r"><span>Market cap</span><b>' + usd(r.mc0) + ' → ' + usd(r.mc1) + '</b></div>' + big;
  }
  // which button is this, and what would it trade?
  function read(el) {
    const gm = game(); if (!gm || !gm.sim) return null;
    const usdUnit = UI.settings && UI.settings.unit === 'usd', solOf = (v) => (usdUnit ? v / BH.C.SOL_USD : v);
    const inst = el.closest('#instant [data-i="buy"], #instant [data-i="sell"]');
    if (inst) { const tk = gm.sim.byId.get(UI.tokenId); return tk && { tk, side: inst.dataset.i, amt: inst.dataset.i === 'buy' ? solOf(+inst.dataset.v) : +inst.dataset.v / 100 }; }
    const pre = el.closest('#presets button[data-v]');
    if (pre) { const tk = gm.sim.byId.get(UI.tokenId); const side = UI.side === 'sell' ? 'sell' : 'buy'; return tk && { tk, side, amt: side === 'buy' ? +pre.dataset.v : +pre.dataset.v / 100 }; }
    const qb = el.closest('[data-qb], [data-buy]');
    if (qb) { const tk = gm.sim.byId.get(qb.dataset.qb || qb.dataset.buy); return tk && { tk, side: 'buy', amt: UI.settings.quick || 0.25 }; }
    return null;
  }
  function show(el) {
    const t = read(el); if (!t) return hide();
    const h = html(t.tk, impact(t.tk, t.side, t.amt)); if (!h) return hide();
    if (!tip) { tip = document.createElement('div'); tip.className = 'imp-tip'; document.body.appendChild(tip); }
    if (tip._h !== h) { tip._h = h; tip.innerHTML = h; }
    const r = el.getBoundingClientRect(), w = tip.offsetWidth || 220, hh = tip.offsetHeight || 110;
    let x = r.left + r.width / 2 - w / 2, y = r.top - hh - 8;
    if (y < 6) y = r.bottom + 8;
    x = Math.max(6, Math.min(window.innerWidth - w - 6, x));
    tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.style.display = 'block';
  }
  function hide() { cur = null; if (tip) tip.style.display = 'none'; }
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest && e.target.closest('#instant [data-i="buy"], #instant [data-i="sell"], #presets button[data-v], [data-qb], [data-buy]');
    if (!el) { if (cur) hide(); return; }
    cur = el; show(el);
  });
  document.addEventListener('mouseout', (e) => { if (cur && (!e.relatedTarget || !cur.contains(e.relatedTarget))) hide(); });
  document.addEventListener('mousedown', hide, true);
  // keep the numbers live while you hover (the market keeps moving)
  setInterval(() => { if (cur && document.body.contains(cur)) show(cur); else if (cur) hide(); }, 400);
  BH.TradeImpact = impact;
  // screenshot scene: #...&imp=1 shows the card over the first buy button on the token page (tools/shot.sh only)
  try {
    const h = (parent && parent.location && parent.location.hash) || '';
    // #...&kolpic=1 opens the coin with the most KOL bubbles (screenshot of real KOL pictures on the chart)
    if (/[#&]kolpic=1/.test(h)) { const iv2 = setInterval(() => { const gm = UI.game; if (!gm || UI.view !== 'token') return; let best = null, n = 0; for (const tk of gm.sim.tokens) { const k = (tk.bubbles || []).filter((b) => b.kind === 'kol').length; if (k > n && !tk.dead) { n = k; best = tk; } } if (best) { clearInterval(iv2); UI.openToken(best.id); setTimeout(() => { const k = document.getElementById('tpTabKol'); if (k) k.click(); }, 1500); } }, 500); }
    if (/[#&]imp=1/.test(h)) { const iv = setInterval(() => { const el = UI.view === 'token' && document.querySelector('#instant [data-i="buy"], #presets button[data-v]'); if (el) { clearInterval(iv); cur = el; show(el); } }, 300); }
  } catch (e) { /* no hash, no scene */ }
})(window);
/* KOL wallets show as @name in trade lists (Trades, Holders, Top Traders), like on Axiom: wraps fmt.short for KOL wallets only. */
(function (g) {
  'use strict';
  const BH = g.BH, F = BH.fmt; if (!F || !F.short || F.short._kol) return;
  const orig = F.short;
  F.short = function (s) {
    if (typeof s === 'string' && BH.J7 && BH.J7.names && BH.J7.names[s]) { const n = BH.J7.names[s]; if (n && n.name) return '@' + BH.esc(String(n.name)); }
    return orig.apply(this, arguments);
  };
  F.short._kol = true;
})(window);
/* screenshot scene #...&kolpic=1: log every KOL bubble's picture state to the app log (debugging pictures) */
(function (g) {
  try {
    const h = (parent && parent.location && parent.location.hash) || ''; if (!/[#&]kolpic=1/.test(h)) return;
    setTimeout(() => {
      const UI = g.BH.UI, ch = UI.chart, tk = UI.game.sim.byId.get(UI.tokenId), lg = (parent.degen && parent.degen.log) || console.log;
      const seen = {};
      for (const b of (tk && tk.bubbles) || []) if (b.kind === 'kol' && !seen[b.addr]) {
        seen[b.addr] = 1; const kn = ch.kolOf(b), url = ch.realPic(b), im = url && ch.urlImgs && ch.urlImgs[url];
        lg('KOLPIC ' + b.addr + ' -> ' + (kn ? kn.name : 'none') + ' | ' + String(url).slice(0, 70) + ' | ' + (im ? (im.failed ? 'FAILED' : im.complete && im.naturalWidth ? 'loaded' : 'pending') : 'not requested'));
      }
    }, 12000);
  } catch (e) { /* debug only */ }
})(window);
