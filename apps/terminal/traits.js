/* Coin traits in the token header: who gets the creator fees (creator or holders = dividends) and what the coin is paired to (SOL or USD1).
   Wraps UI.renderToken (apps/terminal/ui.js is generated, so this lives in its own file, like vampui.js). Inserted right after MARKET CAP
   so it stays visible on narrow windows (app.css hides header stats from the 7th on below 1300px). */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI;
  const orig = UI.renderToken;
  UI.renderToken = function () {
    const out = orig.apply(this, arguments);
    try {
      const gm = this.game, tk = this.tokenId && gm && gm.sim.byId.get(this.tokenId), head = document.getElementById('thead');
      if (!tk || !head) return out;
      const div = tk.rewards === 'holders', usd1 = tk.pair === 'USD1';
      const paid = div ? (tk.divPaid || 0) : 0;
      const tip = (div ? 'Dividends: creator fees go to holders' + (paid > 0 ? ' (' + BH.fmt.sol(paid) + ' SOL paid so far)' : '') : 'Creator rewards: creator fees go to the dev') +
        '. ' + (usd1 ? 'Paired to USD1: the market cap in $ ignores SOL moves.' : 'Paired to SOL: the market cap in $ moves with SOL.');
      const html = '<span>REWARDS · PAIR</span><b><span class="' + (div ? 'up' : '') + '">' + (div ? 'Dividends' : 'Creator') + '</span> · <span class="' + (usd1 ? 'brand' : '') + '">' + (usd1 ? 'USD1' : 'SOL') + '</span></b>';
      let el = document.getElementById('tkTraits');
      if (!el || el.parentNode !== head) {
        el = document.createElement('div'); el.id = 'tkTraits'; el.className = 'stat traits';
        const mcStat = head.querySelector('.stat');
        if (mcStat && mcStat.nextSibling) head.insertBefore(el, mcStat.nextSibling); else head.appendChild(el);
      }
      if (el._h !== html) { el._h = html; el.innerHTML = html; }
      if (el.dataset.tip !== tip) el.dataset.tip = tip;
      // viewers (game/views.js): how many people are watching this coin right now
      if (tk.views != null) {
        let ve = document.getElementById('tkViews');
        if (!ve || ve.parentNode !== head) { ve = document.createElement('div'); ve.id = 'tkViews'; ve.className = 'stat views'; ve.dataset.tip = 'People watching this chart right now. More eyes = more trades = a faster chart. Hot narratives, buys, KOL calls and frenzies pull people in.'; head.insertBefore(ve, el.nextSibling); }
        const vh = '<span>VIEWERS</span><b>' + (g.lucide || BH.icon ? (BH.icon ? BH.icon('eye', 'sm') : '') : '') + ' ' + (tk.views >= 1000 ? (tk.views / 1000).toFixed(1) + 'K' : tk.views) + '</b>';
        if (ve._h !== vh) { ve._h = vh; ve.innerHTML = vh; }
      }
    } catch (e) { /* decoration: never break the token page */ }
    return out;
  };
})(window);
