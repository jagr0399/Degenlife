/* Pulse performance: cards that are scrolled out of view refresh every 2 s instead of 4x a second
   (each card does a risk scan and redraws its sparkline). Visibility comes from an IntersectionObserver, so no layout reads. */
(function (g) {
  'use strict';
  const UI = g.BH.UI;
  const io = new IntersectionObserver((ents) => { for (const e of ents) e.target._vis = e.isIntersecting; }, { rootMargin: '200px 0px' });
  const origRowEl = UI.rowEl;
  UI.rowEl = function (tk) { const r = origRowEl.apply(this, arguments); if (!r._io) { r._io = true; r._vis = true; io.observe(r); } return r; };
  const origFill = UI.fillRow;
  UI.fillRow = function (r) {
    const now = performance.now();
    if (r._vis === false && r._filled && now - r._filled < 2000) return;
    r._filled = now;
    return origFill.apply(this, arguments);
  };
})(window);
