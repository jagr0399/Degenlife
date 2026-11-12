/* Vamp warnings on the token page: how many live coins share this ticker, and which one is the OG.
   Pulse cards stay identical on purpose (that's how vamps catch people); the token page and risk scan tell the truth. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const orig = UI.renderToken;
  UI.renderToken = function () {
    const out = orig.apply(this, arguments);
    try {
      const gm = this.game, V = gm && gm.sys && gm.sys.vamps, tk = this.tokenId && gm.sim.byId.get(this.tokenId);
      const grid = document.getElementById('riskgrid');
      if (!V || !tk || !grid) return out;
      const fam = V.family(tk), n = fam.list.length;
      let el = document.getElementById('vampRow');
      if (n < 2) { if (el) el.remove(); return out; }
      if (!el) { el = document.createElement('div'); el.id = 'vampRow'; el.className = 'vamp-row'; grid.parentNode.insertBefore(el, grid.nextSibling); }
      const isOg = fam.og && fam.og.id === tk.id;
      const ogAge = fam.og ? BH.fmt.age(gm.sim.t - fam.og.born) : '';
      const sig = tk.id + ':' + n + ':' + isOg;
      if (el._sig === sig) return out;
      el._sig = sig;
      el.className = 'vamp-row ' + (isOg ? 'og' : 'vamp');
      el.innerHTML = isOg
        ? '<b>OG</b> ' + (n - 1) + ' other live coin' + (n > 2 ? 's use' : ' uses') + ' $' + esc(tk.ticker) + '. This is the oldest one.'
        : '<b>Possible vamp</b> ' + n + ' live coins use $' + esc(tk.ticker) + '. The OG is ' + ogAge + ' old: <button class="btn sm" data-og="' + esc(fam.og.id) + '">Open the OG</button>';
      const b = el.querySelector('[data-og]');
      if (b) b.onclick = () => UI.openToken(b.dataset.og);
    } catch (e) { /* decoration: never break the token page */ }
    return out;
  };
})(window);
