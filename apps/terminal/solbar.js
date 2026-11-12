/* Bottom status bar, Axiom style: the live SOL price (green when up today, red when down) and where a PumpLab coin
   graduates right now in USD (it moves with SOL). Hover for the last news that moved the price. */
(function (g) {
  'use strict';
  const BH = g.BH, C = BH.C;
  const MARK = '<svg class="solmark3" viewBox="0 0 16 14" aria-hidden="true"><defs><linearGradient id="solg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9945ff"/><stop offset="1" stop-color="#14f195"/></linearGradient></defs><path fill="url(#solg)" d="M3 0h13l-3 3H0zM0 5.5h13l3 3H3zM3 11h13l-3 3H0z"/></svg>';
  const LINK = '<svg class="sb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';
  function ensure() {
    let el = document.getElementById('solBar');
    if (el) return el;
    const foot = document.querySelector('footer.foot'), mkt = document.getElementById('mkt');
    if (!foot) return null;
    el = document.createElement('span'); el.id = 'solBar'; el.className = 'solbar';
    el.innerHTML = '<span class="sb-sol" id="sbSol">' + MARK + '<b></b><i></i></span><span class="sb-grad" id="sbGrad" title="Where a PumpLab coin graduates right now (it moves with the SOL price)">' + LINK + '<b></b></span>';
    foot.insertBefore(el, mkt || foot.firstChild);
    return el;
  }
  function render() {
    const game = BH.UI && BH.UI.game; if (!game || !game.sim) return;
    const el = ensure(); if (!el) return;
    const m = game.sys && game.sys.macro, price = C.SOL_USD, ch = m ? m.dayChange() : 0;
    const sol = el.querySelector('#sbSol');
    sol.classList.toggle('down', ch < -0.005);
    sol.querySelector('b').textContent = '$' + price.toFixed(2);
    sol.querySelector('i').textContent = m ? (ch >= 0 ? '+' : '') + ch.toFixed(1) + '%' : '';
    sol.title = 'SOL price' + (m && m.last && m.last.text ? ' · last news: ' + m.last.text + ' (' + (m.last.pct >= 0 ? '+' : '') + m.last.pct.toFixed(1) + '%)' : ' · moves with the news and the weekly market mood');
    const pad = BH.PADS && BH.PADS[0];
    if (pad) {
      const vTokEnd = C.CURVE_V_TOKENS - pad.real, vSolEnd = pad.vSol * C.CURVE_V_TOKENS / vTokEnd;
      el.querySelector('#sbGrad b').textContent = BH.fmt.usd(vSolEnd / vTokEnd * C.TOTAL_SUPPLY * price);
    }
  }
  setInterval(() => { try { render(); } catch (e) { /* the bar is decoration: never break the terminal */ } }, 1000);
  setTimeout(render, 300);
})(window);
