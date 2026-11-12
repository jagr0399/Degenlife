/* Trade results (Nov 12):
   1. The instant-trade panel's footer, like a real terminal: Invested (green) | Sold (red) | Holding | PnL with % up or
      down. Click it to switch SOL / USD.
   2. A PnL card that pops up when you close a position: ticker, the result in a big box, PnL %, invested, what you got
      back, your picture and handle, on generated art. Copy it as an image, save it as a PNG, or turn the pop-up off.
   Loaded after axiom.js (it wraps UI.renderInstant). Fake SOL only. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, C = BH.C;
  const $ = (s, el) => (el || document).querySelector(s);
  const game = () => UI.game;
  const BASE = '../assets/';
  const solMark = '<svg class="solm" viewBox="0 0 24 20" aria-hidden="true"><defs><linearGradient id="solg" x1="0" x2="1"><stop offset="0" stop-color="#9945ff"/><stop offset="1" stop-color="#14f195"/></linearGradient></defs><path fill="url(#solg)" d="M5 1h17l-3 4H2zM2 8h17l3 4H5zM5 15h17l-3 4H2z"/></svg>';

  // ---------------- 1. the footer ----------------
  const origRender = UI.renderInstant;
  UI.renderInstant = function () {
    origRender.apply(this, arguments);
    const el = $('#instant'); if (!el || el.hidden) return;
    const foot = el.querySelector('.in-foot');   // (no footer while the panel is minimized; the callout box still shows)
    const gm = game(), tk = gm.sim.byId.get(UI.tokenId), pos = tk && gm.player.pos.get(tk.id), S = UI.posStats(pos);
    const usd = UI.settings.footUnit === 'usd', k = usd ? C.SOL_USD : 1;
    const num = (v) => usd ? '$' + (Math.abs(v * k) >= 1000 ? (v * k / 1000).toFixed(1) + 'K' : (v * k).toFixed(Math.abs(v * k) >= 100 ? 0 : 2)) : (Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(Math.abs(v) >= 1 ? 2 : 3));
    const mark = usd ? '' : solMark;
    const pct = S.invested > 0 ? S.total / S.invested * 100 : 0, up = S.total >= 0;
    const html = '<button class="if-c inv" data-i="funit" title="Invested · click for ' + (usd ? 'SOL' : 'USD') + '">' + mark + num(S.invested) + '</button>' +
      '<button class="if-c sold" data-i="funit" title="Sold">' + mark + num(S.sold) + '</button>' +
      '<button class="if-c hold" data-i="funit" title="Holding (value now)">' + mark + num(S.value) + '</button>' +
      '<button class="if-c pnl ' + (up ? 'up' : 'down') + '" data-i="funit" title="Profit or loss, realized + unrealized">' + mark + (up ? '+' : '−') + num(Math.abs(S.total)) + '<span>(' + (up ? '+' : '−') + Math.abs(pct).toFixed(pct !== 0 && Math.abs(pct) < 10 ? 1 : 0) + '%)</span></button>';
    if (foot && foot._h !== html) { foot._h = html; foot.className = 'in-foot axf'; foot.innerHTML = html; }
    // your callout on this coin: how many wallets bought after it, how much SOL, and how the coin has done since
    const tr = gm.sys.trencher, call = tr && tk && tr.calls.slice().reverse().find((c) => c.coin === tk.id && gm.sim.t - c.t < 600);
    let box = el.querySelector('.in-call');
    if (!call) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.className = 'in-call'; if (foot) foot.after(box); else el.appendChild(box); }
    const since = (gm.sim.mc(tk) / call.mcAt - 1) * 100, left = Math.max(0, 600 - (gm.sim.t - call.t));
    const ch = '<span class="ic-ic">📣</span><span>Your call at <b>' + BH.fmt.usd(call.mcAt) + '</b></span><span class="ic-n" title="Different wallets that bought after your call"><b>' + (call.buyers || 0) + '</b> buyers</span><span title="SOL bought after your call"><b>' + (call.buySol || 0).toFixed(1) + '</b> SOL</span><span class="' + (since >= 0 ? 'up' : 'down') + '">' + (since >= 0 ? '+' : '') + since.toFixed(0) + '%</span><i class="ic-bar" style="width:' + (left / 600 * 100).toFixed(1) + '%" title="Counting for ' + Math.ceil(left) + ' more seconds"></i>';
    if (box._h !== ch) { box._h = ch; box.innerHTML = ch; }
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#instant [data-i="funit"]')) return;
    e.stopPropagation(); UI.settings.footUnit = UI.settings.footUnit === 'usd' ? 'sol' : 'usd'; UI.saveSettings(); UI.renderInstant();
  }, true);

  // ---------------- 2. the PnL card ----------------
  function rng(seed) { let s = seed % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

  async function drawCard(cv, rec, who) {
    const W = 760, H = 460, dpr = 2; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const win = rec.pnl >= 0, accent = win ? '#2fe0a4' : '#ff4d6d', r = rng(rec.at * 7 + rec.ticker.length * 131);
    // background: deep night with glowing glass shards
    const bg = c.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#05060c'); bg.addColorStop(1, win ? '#0a1024' : '#1a0710'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const cx = 430 + r() * 340, cy = r() * H, s = 60 + r() * 160, a = r() * Math.PI;
      c.save(); c.translate(cx, cy); c.rotate(a);
      const gr = c.createLinearGradient(-s, -s, s, s); gr.addColorStop(0, win ? 'rgba(88,110,255,0.55)' : 'rgba(255,70,110,0.45)'); gr.addColorStop(1, 'rgba(10,12,30,0.1)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(-s * 0.3, -s); c.lineTo(s * 0.5, -s * 0.6); c.lineTo(s * 0.35, s); c.lineTo(-s * 0.45, s * 0.7); c.closePath(); c.fill();
      c.strokeStyle = win ? 'rgba(140,160,255,0.55)' : 'rgba(255,120,150,0.5)'; c.lineWidth = 1.2; c.stroke(); c.restore();
    }
    c.strokeStyle = win ? 'rgba(150,170,255,0.8)' : 'rgba(255,140,170,0.8)'; c.lineWidth = 1.5; c.shadowColor = c.strokeStyle; c.shadowBlur = 12;
    for (let i = 0; i < 5; i++) { c.beginPath(); let x = 480 + r() * 260, y = r() * H; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 70; y += 25 + r() * 40; c.lineTo(x, y); } c.stroke(); }
    c.shadowBlur = 0;
    const fade = c.createLinearGradient(0, 0, 470, 0); fade.addColorStop(0, 'rgba(5,6,12,0.97)'); fade.addColorStop(0.75, 'rgba(5,6,12,0.85)'); fade.addColorStop(1, 'rgba(5,6,12,0)'); c.fillStyle = fade; c.fillRect(0, 0, 520, H);
    // our mark: a little bag, and the wordmark
    c.fillStyle = '#f4b23e'; c.beginPath(); c.moveTo(38, 52); c.lineTo(66, 52); c.lineTo(72, 80); c.lineTo(32, 80); c.closePath(); c.fill();
    c.strokeStyle = '#f4b23e'; c.lineWidth = 3; c.beginPath(); c.arc(52, 50, 8, Math.PI, 0); c.stroke();
    c.fillStyle = '#f2f4f8'; c.font = '600 30px Inter, sans-serif'; c.textAlign = 'right'; c.fillText('BAGHOLDER', W - 36, 76); c.textAlign = 'left';
    // ticker and the result box
    c.fillStyle = '#f2f4f8'; c.font = '600 34px Inter, sans-serif'; c.fillText(rec.ticker.slice(0, 14), 44, 150);
    c.fillStyle = accent; c.fillRect(44, 170, 330, 70);
    c.fillStyle = '#05140d'; c.font = '800 46px Inter, sans-serif';
    // solana-like mark drawn in the box
    const sx = 60, sy = 186; c.beginPath(); for (const [dy, flip] of [[0, 0], [14, 1], [28, 0]]) { const y = sy + dy; if (!flip) { c.moveTo(sx + 6, y); c.lineTo(sx + 38, y); c.lineTo(sx + 32, y + 8); c.lineTo(sx, y + 8); } else { c.moveTo(sx, y); c.lineTo(sx + 32, y); c.lineTo(sx + 38, y + 8); c.lineTo(sx + 6, y + 8); } c.closePath(); } c.fill();
    c.fillText((win ? '+' : '−') + Math.abs(rec.pnl).toFixed(3), 108, 222);
    // stats
    const pct = rec.invested > 0 ? rec.pnl / rec.invested * 100 : 0;
    const row = (label, val, y, col) => { c.fillStyle = '#e8ecf3'; c.font = '500 22px Inter, sans-serif'; c.fillText(label, 60, y); c.fillStyle = col || '#e8ecf3'; c.textAlign = 'right'; c.fillText(val, 380, y); c.textAlign = 'left'; };
    row('PNL', (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', 290, accent);
    row('Invested', rec.invested.toFixed(3) + ' SOL', 326);
    row('Position', (rec.invested + rec.pnl).toFixed(3) + ' SOL', 362);
    // you
    const im = await loadImg(BH.SocialView.pfp(BASE, who.pfp));
    c.save(); c.beginPath(); c.roundRect ? c.roundRect(44, 386, 46, 46, 6) : c.rect(44, 386, 46, 46); c.clip(); if (im) c.drawImage(im, 44, 386, 46, 46); else { c.fillStyle = '#1f2430'; c.fillRect(44, 386, 46, 46); } c.restore();
    c.strokeStyle = '#f4b23e'; c.lineWidth = 2; c.strokeRect(44, 386, 46, 46);
    c.fillStyle = '#f2f4f8'; c.font = '600 28px Inter, sans-serif'; c.fillText(who.handle, 104, 420);
    c.fillStyle = '#8a93a3'; c.font = '13px Inter, sans-serif'; c.fillText('Degen Life · held ' + fmtHeld(rec.held) + (rec.rugged ? ' · rugged' : '') + ' · fake SOL', 104, 442);
  }
  function fmtHeld(s) { s = Math.max(0, s || 0); return s < 60 ? Math.round(s) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : (s / 3600).toFixed(1) + 'h'; }

  function showCard(rec) {
    const old = $('#pnlCard'); if (old) old.remove();
    const gm = game(), t = gm.sys.trencher, who = { handle: (t && t.handle) || '@you', pfp: gm.meta.pfp != null ? gm.meta.pfp : 47 };
    const wrap = document.createElement('div'); wrap.id = 'pnlCard'; wrap.className = 'pnlcard';
    wrap.innerHTML = '<div class="pc-in"><canvas></canvas><div class="pc-bar"><button class="btn sm" data-pc="copy">Copy image</button><button class="btn sm" data-pc="save">Save PNG</button><label class="pc-off"><input type="checkbox" data-pc="off"> Don\'t show after trades</label><div class="spacer"></div><button class="btn sm primary" data-pc="close">Close</button></div></div>';
    document.body.appendChild(wrap);
    const cv = wrap.querySelector('canvas'); drawCard(cv, rec, who);
    wrap.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-pc]'); if (!b && e.target === wrap) return wrap.remove(); if (!b) return;
      const a = b.dataset.pc;
      if (a === 'close') wrap.remove();
      if (a === 'save') { const l = document.createElement('a'); l.download = 'pnl-' + rec.ticker + '.png'; l.href = cv.toDataURL('image/png'); l.click(); }
      if (a === 'copy') { try { const blob = await new Promise((res) => cv.toBlob(res, 'image/png')); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); b.textContent = 'Copied'; } catch (err) { b.textContent = 'Copy failed'; } }
      if (a === 'off') { UI.settings.pnlCard = b.checked ? 'off' : 'on'; UI.saveSettings(); }
    });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && document.getElementById('pnlCard')) { e.stopImmediatePropagation(); wrap.remove(); document.removeEventListener('keydown', esc, true); } }, true);
  }
  UI.showPnlCard = showCard;

  // watch for positions you close (sold out, TP/SL, or rugged)
  let seen = -1;
  setInterval(() => {
    const gm = game(); if (!gm || !gm.player) return;
    const n = gm.player.closed.length;
    if (seen < 0 || n < seen) { seen = n; return; }
    if (n > seen) { const rec = gm.player.closed[0]; seen = n; if (UI.settings.pnlCard !== 'off' && rec && rec.invested > 0.0005 && !rec.mine) showCard(rec); }
  }, 400);
})(window);
