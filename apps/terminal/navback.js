/* Mouse side buttons (playtester, Nov 16): button 4 = back, button 5 = forward, like a browser. Works across the computer's apps,
   terminal pages and coins you opened. Alt+Left / Alt+Right do the same. Loaded after watchlist.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI;
  const back = [], fwd = [];
  let cur = null, restoring = 0;
  const snap = () => ({ app: UI.app || '', view: UI.view || '', tok: UI.view === 'token' ? UI.tokenId : null });
  const key = (s) => s ? s.app + '|' + s.view + '|' + (s.tok || '') : '';
  // record every place you land on (polled, so it catches every way of getting there)
  setInterval(() => {
    if (!UI.game) return;
    const s = snap(); if (!s.app && !s.view) return;
    if (key(s) === key(cur)) return;
    if (restoring > 0) { restoring--; cur = s; return; }
    if (cur) { back.push(cur); if (back.length > 60) back.shift(); fwd.length = 0; }
    cur = s;
  }, 250);
  function go(s) {
    if (!s) return;
    restoring = 1;
    try {
      if (s.app && s.app !== UI.app && UI.openApp) UI.openApp(s.app, s.view === 'token' ? null : s.view);
      if (s.view === 'token' && s.tok && UI.game.sim.byId.get(s.tok)) UI.openToken(s.tok);
      else if (s.view && s.view !== UI.view && UI.go) UI.go(s.view);
    } catch (e) { restoring = 0; }
    cur = snap();
  }
  function goBack() { const s = back.pop(); if (!s) return; if (cur) fwd.push(cur); go(s); }
  function goFwd() { const s = fwd.pop(); if (!s) return; if (cur) back.push(cur); go(s); }
  // mouse 4/5 (button 3/4); stop the browser's own back navigation in the frame
  const onBtn = (e) => { if (e.button === 3) { e.preventDefault(); if (e.type === 'mouseup') goBack(); } else if (e.button === 4) { e.preventDefault(); if (e.type === 'mouseup') goFwd(); } };
  document.addEventListener('mousedown', onBtn, true);
  document.addEventListener('mouseup', onBtn, true);
  document.addEventListener('keydown', (e) => { if (!e.altKey) return; if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); } else if (e.key === 'ArrowRight') { e.preventDefault(); goFwd(); } });
  BH.NavBack = { back: goBack, forward: goFwd, history: () => back.slice() };
})(window);
/* test hooks: #...&twc=1 opens the newest tweet runner (screenshots); #...&navtest=1 opens Pulse, then a coin, then presses
   mouse button 4 and logs where it landed (app log) */
(function (g) {
  try {
    const h = (parent && parent.location && parent.location.hash) || '', BH = g.BH, UI = BH.UI, lg = (parent.degen && parent.degen.log) || console.log;
    if (/[#&]twc=1/.test(h)) { const iv = setInterval(() => { const tk = UI.game && UI.game.sim.tokens.filter((t) => t.j7Right && !t.dead).pop(); if (tk && UI.view === 'token') { clearInterval(iv); UI.openToken(tk.id); } }, 400); }
    if (/[#&]navtest=1/.test(h)) setTimeout(() => {
      UI.go('pulse');
      setTimeout(() => { const tk = UI.game.sim.tokens.filter((t) => !t.dead)[0]; UI.openToken(tk.id);
        setTimeout(() => { const before = UI.view; document.dispatchEvent(new MouseEvent('mouseup', { button: 3, bubbles: true }));
          setTimeout(() => { lg('NAVTEST before=' + before + ' after=' + UI.view); }, 600); }, 900); }, 900);
    }, 3000);
  } catch (e) { /* not in the game frame */ }
})(window);
