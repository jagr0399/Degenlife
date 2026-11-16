/* Market sound alerts (playtester, Nov 16): a bell in the top bar opens a panel where each market event can get its own sound:
   a new pair launches, a coin enters the final stretch, a coin migrates, a KOL calls a coin, one of your coins migrates /
   rugs / hits 2x. Each event: on/off, a sound (the same real CC0 sounds as J7 alerts), volume, and "only my coins" where it
   makes sense. Saved per viewer in localStorage 'degen.mktsnd'. Loaded after j7alerts.js / impact.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, icon = BH.icon, esc = BH.esc;
  const KEY = 'degen.mktsnd';
  const EVENTS = [
    ['new', 'New pair launches', 'Every new coin on Pulse (at most one sound every 4 s).', false],
    ['final', 'Final stretch', 'A coin gets close to graduating.', true],
    ['mig', 'Migrated', 'A coin graduates to the DEX.', true],
    ['call', 'KOL call', 'A KOL calls a coin.', true],
    ['rug', 'Rugged', 'A coin gets rugged.', true],
    ['x2', 'Your coin 2x', 'A coin you hold doubles from your entry.', null],
  ];
  const DEF = { mig: { on: true, sound: 'Fanfare', vol: 0.45, mine: true }, rug: { on: true, sound: 'Error', vol: 0.4, mine: true }, x2: { on: true, sound: 'Coin Drop', vol: 0.5 } };
  let cfg = {};
  try { cfg = JSON.parse(localStorage.getItem(KEY) || 'null') || JSON.parse(JSON.stringify(DEF)); } catch (e) { cfg = JSON.parse(JSON.stringify(DEF)); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* storage blocked */ } };
  const get = (id) => cfg[id] || {};
  const play = (id) => { const c = get(id); if (c.on && c.sound && BH.J7Alerts) BH.J7Alerts.play(c.sound, c.vol == null ? 0.5 : c.vol, 'market'); };

  // ---- watching the market ----
  let evN = null, seen = new Set(), finalSeen = new Set(), x2Seen = new Set(), lastNew = 0, lastAny = 0;
  function holds(gm, id) { const p = gm.player.pos.get(id); return !!(p && p.tokens > 1); }
  function tick() {
    const gm = UI.game; if (!gm || !gm.sim) return;
    const sim = gm.sim, now = sim.t, C = BH.C;
    if (evN == null) { evN = sim.events.length; for (const tk of sim.tokens) { seen.add(tk.id); if (tk.stage === 'curve' && sim.progress(tk) >= C.FINAL_STRETCH_PCT) finalSeen.add(tk.id); } return; }
    const ring = (id) => { if (now - lastAny < 0.8) return; lastAny = now; play(id); };
    // new pairs
    for (const tk of sim.tokens) if (!seen.has(tk.id)) { seen.add(tk.id); if (get('new').on && now - lastNew > 4) { lastNew = now; ring('new'); } }
    // final stretch
    const fc = get('final');
    if (fc.on) for (const tk of sim.tokens) if (!tk.dead && tk.stage === 'curve' && !finalSeen.has(tk.id) && sim.progress(tk) >= C.FINAL_STRETCH_PCT) { finalSeen.add(tk.id); if (!fc.mine || holds(gm, tk.id)) ring('final'); }
    // events: migrate, call, rug (the list is trimmed to 300, so read the new tail)
    const evs = sim.events;
    if (evs.length !== evN) {
      const fresh = evs.slice(evN > evs.length ? Math.max(0, evs.length - 20) : evN);
      evN = evs.length;
      for (const e of fresh) {
        const id = e.type === 'migrate' ? 'mig' : e.type === 'call' ? 'call' : e.type === 'rug' ? 'rug' : null; if (!id) continue;
        const c = get(id); if (!c.on) continue;
        if (c.mine && !(e.id && (holds(gm, e.id) || gm.player.myCoins.includes(e.id) || gm.player.closed.some((x) => x.id === e.id && now - x.at < 5)))) continue;
        ring(id);
      }
    }
    // your coins at 2x
    if (get('x2').on) for (const [id, p] of gm.player.pos) { if (x2Seen.has(id) || !(p.tokens > 1) || !(p.cost > 0)) continue; const tk = sim.byId.get(id); if (!tk) continue; const val = gm.player.markValue(p); if (val >= p.cost * 2) { x2Seen.add(id); ring('x2'); } }
  }
  setInterval(() => { try { tick(); } catch (e) { /* never break the terminal over a sound */ } }, 500);

  // ---- settings panel (bell in the top bar) ----
  let pop = null;
  function close() { if (pop) { pop.remove(); pop = null; } }
  function draw() {
    const S = (BH.J7Alerts && BH.J7Alerts.SOUNDS) || [];
    pop.innerHTML = '<div class="msnd-h">' + icon('bell-ring', 'sm') + '<b>Market sounds</b><span class="spacer"></span><button class="msnd-x" data-x>' + icon('x', 'sm') + '</button></div>' +
      EVENTS.map(([id, name, desc, mineOpt]) => {
        const c = get(id);
        return '<div class="msnd-row' + (c.on ? ' on' : '') + '" data-id="' + id + '"><label class="msnd-on"><input type="checkbox" data-k="on"' + (c.on ? ' checked' : '') + '><span><b>' + esc(name) + '</b><small>' + esc(desc) + '</small></span></label>' +
          '<div class="msnd-ctl"><select data-k="sound">' + S.map((n) => '<option' + (n === (c.sound || 'Ding') ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select>' +
          '<input type="range" min="0" max="1" step="0.05" data-k="vol" value="' + (c.vol == null ? 0.5 : c.vol) + '" title="Volume">' +
          '<button data-test title="Play">' + icon('play', 'sm') + '</button>' +
          (mineOpt !== null ? '<label class="msnd-mine" title="Only coins you hold or launched"><input type="checkbox" data-k="mine"' + (c.mine ? ' checked' : '') + '>My coins</label>' : '<span class="msnd-mine na">My coins</span>') + '</div></div>';
      }).join('');
  }
  function open(btn) {
    if (pop) return close();
    pop = document.createElement('div'); pop.className = 'msnd-pop'; document.body.appendChild(pop);
    const r = btn.getBoundingClientRect(); pop.style.top = Math.max(8, r.bottom + 6) + 'px'; pop.style.left = Math.max(8, Math.min(window.innerWidth - 610, r.right - 600)) + 'px';
    draw();
    // keep it fully on screen (the terminal frame can offset fixed elements)
    const pr = pop.getBoundingClientRect(); if (pr.top < 8) pop.style.top = (parseFloat(pop.style.top) + 8 - pr.top) + 'px';
    pop.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) return close();
      const row = e.target.closest('[data-id]'); if (!row) return;
      if (e.target.closest('[data-test]')) { const c = get(row.dataset.id); BH.J7Alerts && BH.J7Alerts.play(c.sound || 'Ding', c.vol == null ? 0.5 : c.vol, 'market'); }
    });
    pop.addEventListener('change', (e) => {
      const row = e.target.closest('[data-id]'), k = e.target.dataset.k; if (!row || !k) return;
      const id = row.dataset.id, c = Object.assign({ sound: 'Ding', vol: 0.5 }, get(id));
      c[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? +e.target.value : e.target.value;
      cfg[id] = c; save();
      if (k === 'sound' || k === 'vol') BH.J7Alerts && BH.J7Alerts.play(c.sound, c.vol, 'market');
      row.classList.toggle('on', !!c.on);
    });
  }
  document.addEventListener('mousedown', (e) => { if (pop && !pop.contains(e.target) && !e.target.closest('#abSnd')) close(); });
  setInterval(() => {
    const bar = document.getElementById('appbar'); if (!bar || document.getElementById('abSnd')) return;
    const b = document.createElement('button'); b.id = 'abSnd'; b.className = 'ab-snd'; b.title = 'Market sounds: new pairs, final stretch, migrations, calls, rugs'; b.innerHTML = icon('bell-ring', 'sm');
    b.addEventListener('click', () => open(b));
    const sp = bar.querySelector('.spacer'); bar.insertBefore(b, sp ? sp.nextSibling : null);
  }, 700);
  // screenshot helper (#...&mktsnd=1): open the panel (nothing is saved)
  try { const h = (parent && parent.location && parent.location.hash) || ''; if (/[#&]mktsnd=1/.test(h)) setTimeout(() => { const b = document.getElementById('abSnd'); if (b) open(b); }, 3000); } catch (e) { /* not in the game frame */ }

  const css = document.createElement('style');
  css.textContent = '#appbar .ab-snd{display:inline-flex;align-items:center;justify-content:center;width:30px;height:26px;border-radius:6px;color:var(--muted,#8b93a1)}#appbar .ab-snd:hover{color:#e8ecf3;background:rgba(255,255,255,.06)}' +
    '.msnd-pop{position:fixed;z-index:9999;width:600px;background:#0d1015;border:1px solid #262c36;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.55);padding:10px 12px;font-size:12px;color:#c8ced8}' +
    '.msnd-pop label{display:flex;align-items:center;gap:6px;margin:0;padding:0;font-size:12px;text-align:left;cursor:pointer}.msnd-pop input[type=checkbox]{width:14px;height:14px;margin:0;flex:none}' +
    '.msnd-h{display:flex;align-items:center;gap:6px;margin-bottom:6px;color:#f2f4f8}.msnd-h .spacer{flex:1}.msnd-x{color:#8b93a1}' +
    '.msnd-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;padding:6px 4px;border-top:1px solid #1a1f27;opacity:.7}.msnd-row.on{opacity:1}' +
    '.msnd-on span{display:flex;flex-direction:column;min-width:0}.msnd-on b{color:#f2f4f8;font-weight:700}.msnd-on small{color:#8b93a1;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.msnd-ctl{display:flex;align-items:center;gap:6px}.msnd-ctl select{background:#151a21;color:#e8ecf3;border:1px solid #262c36;border-radius:6px;padding:2px 4px;font-size:12px;width:110px}.msnd-ctl input[type=range]{width:70px;margin:0}' +
    '.msnd-ctl button{display:inline-flex;color:#c8ced8;padding:2px}.msnd-mine{color:#8b93a1;white-space:nowrap;width:78px}.msnd-mine.na{visibility:hidden}';
  document.head.appendChild(css);
  BH.MarketSounds = { get, play, EVENTS };
})(window);
