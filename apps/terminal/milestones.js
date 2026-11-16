/* Multiplier milestones (Nov 16, playtester): when YOUR position on the coin you're looking at hits 2x, 3x, 4x, 5x, 10x, 20x, 50x,
   100x and up (market cap now vs your average entry), a big "5X" pops over the chart with a burst of particles, your profit and
   a sound. Each milestone fires once per coin per session. Respects prefers-reduced-motion (a plain fade instead).
   UI only (no game state). Loaded after tokenpage.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, esc = BH.esc;
  const STEPS = [2, 3, 4, 5, 10, 20, 50, 100, 250, 500, 1000];
  const done = new Map();   // coin id -> highest milestone shown
  const reduce = g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pop(x, tk, pnlSol, hold) {
    const host = UI.chart && UI.chart.root; if (!host) return;
    const el = document.createElement('div');
    const tier = x >= 100 ? 't4' : x >= 20 ? 't3' : x >= 5 ? 't2' : 't1';
    el.className = 'ms-pop ' + tier + (reduce ? ' calm' : '') + (hold ? ' hold' : '');
    let parts = '';
    if (!reduce) for (let i = 0; i < (x >= 10 ? 36 : 22); i++) {
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * (x >= 10 ? 220 : 150);
      parts += '<i style="--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d) + 'px;--dl:' + Math.round(Math.random() * 120) + 'ms;--sz:' + (3 + Math.random() * 5).toFixed(1) + 'px"></i>';
    }
    el.innerHTML = '<div class="ms-burst">' + parts + '</div><div class="ms-x">' + x + 'X</div><div class="ms-sub">$' + esc(tk.ticker) + ' · ' + (pnlSol >= 0 ? '+' : '') + pnlSol.toFixed(2) + ' SOL</div>';
    document.body.appendChild(el);   // on the page itself, so it sits in the middle of the screen
    if (BH.Sound) BH.Sound.play(x >= 10 ? 'ach' : 'coin', { gain: 0.8, rate: 1 });
    if (!hold) setTimeout(() => el.remove(), 2200);
  }

  function check() {
    try {
      if (UI.view !== 'token' || !UI.tokenId || !UI.game) return;
      const gm = UI.game, sim = gm.sim, tk = sim.byId.get(UI.tokenId), pos = tk && gm.player.pos.get(tk.id);
      if (!tk || !pos || !(pos.tokens > 1) || !(pos.cost > 0)) return;
      const entry = pos.cost / pos.tokens * BH.C.TOTAL_SUPPLY * BH.C.SOL_USD, x = sim.mc(tk) / entry;
      const shown = done.get(tk.id) || 1;
      let hit = 0; for (const s of STEPS) if (x >= s && s > shown) hit = s;
      if (!done.has(tk.id)) { done.set(tk.id, hit || 1); return; }   // opening a coin that's already up: no replay of old milestones
      if (!hit) return;
      done.set(tk.id, hit);
      const S = UI.posStats ? UI.posStats(pos) : null;
      pop(hit, tk, S ? S.total : 0);
    } catch (e) { /* decoration only */ }
  }
  setInterval(check, 300);

  const css = document.createElement('style');
  css.textContent = `
.ms-pop { position: fixed; left: 50%; top: 46%; transform: translate(-50%, -50%); z-index: 9000;   /* center of the screen (playtester, Nov 16; was centered on the chart) */ pointer-events: none; text-align: center; }
.ms-x { font: 900 84px/1 Inter, sans-serif; letter-spacing: -0.04em; background: linear-gradient(180deg, #fff3c4, #f4b23e 55%, #c97a12); -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 18px rgba(244, 178, 62, .55)); animation: msIn 2.1s cubic-bezier(.2, 1.4, .3, 1) forwards; }
.ms-pop.t2 .ms-x { background-image: linear-gradient(180deg, #e6fff2, #2bd67b 55%, #0f8f4c); filter: drop-shadow(0 0 22px rgba(43, 214, 123, .6)); font-size: 104px; }
.ms-pop.t3 .ms-x { background-image: linear-gradient(180deg, #f2e8ff, #a77bff 55%, #6b3fe0); filter: drop-shadow(0 0 26px rgba(167, 123, 255, .65)); font-size: 120px; }
.ms-pop.t4 .ms-x { background-image: linear-gradient(90deg, #ff5fa2, #f4b23e, #2bd67b, #4aa8ff, #a77bff); filter: drop-shadow(0 0 30px rgba(255, 255, 255, .5)); font-size: 136px; }
.ms-sub { margin-top: 6px; font: 700 15px Inter, sans-serif; color: #e8ecf3; text-shadow: 0 2px 10px rgba(0, 0, 0, .8); opacity: 0; animation: msSub 2.1s ease forwards; }
.ms-burst { position: absolute; left: 50%; top: 45%; width: 0; height: 0; }
.ms-burst i { position: absolute; width: var(--sz); height: var(--sz); border-radius: 50%; background: #f4b23e; opacity: 0; animation: msPart 1.3s cubic-bezier(.1, .7, .3, 1) var(--dl) forwards; }
.ms-pop.t2 .ms-burst i { background: #2bd67b; } .ms-pop.t3 .ms-burst i { background: #a77bff; }
.ms-pop.t4 .ms-burst i:nth-child(3n) { background: #ff5fa2; } .ms-pop.t4 .ms-burst i:nth-child(3n+1) { background: #4aa8ff; }
@keyframes msIn { 0% { transform: scale(.3); opacity: 0; } 18% { transform: scale(1.12); opacity: 1; } 30% { transform: scale(1); } 75% { opacity: 1; transform: scale(1) translateY(0); } 100% { opacity: 0; transform: scale(.96) translateY(-18px); } }
@keyframes msSub { 0%, 15% { opacity: 0; transform: translateY(6px); } 30%, 75% { opacity: 1; transform: none; } 100% { opacity: 0; } }
@keyframes msPart { 0% { opacity: 1; transform: translate(0, 0) scale(1); } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(.4); } }
.ms-pop.calm .ms-x, .ms-pop.calm .ms-sub { animation: msCalm 2.1s ease forwards; }
/* screenshot hold: the pop frozen mid-burst */
.ms-pop.hold .ms-x, .ms-pop.hold .ms-sub { animation: none; opacity: 1; }
.ms-pop.hold .ms-burst i { animation: none; opacity: .9; transform: translate(calc(var(--dx) * .6), calc(var(--dy) * .6)); }
@keyframes msCalm { 0% { opacity: 0; } 15%, 75% { opacity: 1; } 100% { opacity: 0; } }
`;
  document.head.appendChild(css);
  // screenshot helper (#...&ms=5): show a milestone right away
  try { const h = (parent && parent.location && parent.location.hash) || ''; const m = h.match(/[#&]ms=(\d+)/); if (m) { const iv = setInterval(() => { const tk = UI.game && UI.view === 'token' && UI.chart && UI.chart.root && UI.game.sim.byId.get(UI.tokenId); if (tk) { clearInterval(iv); setTimeout(() => pop(+m[1], tk, 1.23, true), 800); } }, 200); } } catch (e) { /* not in the game frame */ }
  BH.Milestones = { pop, STEPS };
})(window);
