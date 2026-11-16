/* J7 account alerts (the playtester's J7 Tracker reference): every post has a ⋮ menu -> "Add sound to @x", "Filter out @x", "Pin @x".
   The account popup sets: Pin tweets, a Highlight color for their posts, an alert Sound (built-in synth sounds, the game's own
   sounds, Voice = read the name out loud, or a Custom sound file from your PC) and its volume. When that account posts, the sound plays.
   Settings are per-viewer conveniences (localStorage 'degen.j7acc'), keyed by account (J7 id, or handle for other posts).
   Sounds are real recorded CC0 sounds bundled with the game (assets/audio/alerts). Loaded after j7ui.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, icon = BH.icon, esc = BH.esc;
  const KEY = 'degen.j7acc';
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { prefs = {}; }
  // the playtester's real J7 Tracker setup (read from J7 Nov 16): highlight colors, sounds (closest built-in sound) and pins.
  // Seeded once per account; anything changed in the game wins after that.
  const J7_SETUP = {
    'j7:elon': { color: '#4a8dff', sound: 'Blip' }, 'j7:trump': { color: '#ff4d4d', sound: 'Vibrate', pin: true },
    'j7:donjr': { color: '#ff4d4d', sound: 'Chime' }, 'j7:whitehouse': { color: '#ff4d4d', sound: 'Chime' },
    'j7:cz': { color: '#ffe81a', sound: 'Vibrate', pin: true }, 'j7:binance': { color: '#ffe81a', sound: 'Chime' },
    'j7:solana': { color: '#a45cff', sound: 'Blip' }, 'j7:pump': { color: '#2bff3a', sound: 'Blip' },
    'j7:bubblemaps': { color: '#ffffff', sound: 'Pop' }, 'j7:chainchomp': { color: '#ff6fb5', sound: 'Voice' },
  };
  try {
    const seeded = JSON.parse(localStorage.getItem(KEY + '.seed') || '{}') || {};
    let ch = false;
    for (const k of Object.keys(J7_SETUP)) if (!seeded[k]) { if (!prefs[k]) prefs[k] = Object.assign({ vol: 0.5 }, J7_SETUP[k]); seeded[k] = 1; ch = true; }
    if (ch) { localStorage.setItem(KEY + '.seed', JSON.stringify(seeded)); localStorage.setItem(KEY, JSON.stringify(prefs)); }
  } catch (e2) { for (const k of Object.keys(J7_SETUP)) if (!prefs[k]) prefs[k] = Object.assign({ vol: 0.5 }, J7_SETUP[k]); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* storage full or blocked: the custom sound is the big one */ } };
  const get = (k) => prefs[k] || {};
  const set = (k, patch) => { const p = Object.assign({}, get(k), patch); for (const x of Object.keys(p)) if (p[x] == null || p[x] === false) delete p[x]; if (Object.keys(p).filter((x) => x !== 'name').length) prefs[k] = p; else delete prefs[k]; save(); if (BH.J7UI) BH.J7UI.render(); };

  // ---- sounds ----
  // Real recorded sounds (CC0): "SFX Kit" by Wyzowl (github.com/wyzowl/sfx-kit) and "Interface Sounds" by Kenney (kenney.nl),
  // converted to small .ogg files in assets/audio/alerts. See docs/CREDITS.md.
  const DIR = '../assets/audio/alerts/';
  const LIST = [
    ['Alert', 'notification-alert-clear'], ['Attention', 'notification-attention-clear'], ['Message', 'notification-message-in-clear'],
    ['Chime', 'notification-success-chime'], ['Ding Ding', 'notification-success-ding-ding'], ['Ding', 'tone-ding-mid'], ['Ding High', 'tone-ding-high'], ['Ding Low', 'tone-ding-low'],
    ['Sparkle', 'notification-success-sparkle'], ['Bubble', 'notification-success-bubble'], ['Pop', 'pop-medium-bubble'], ['Pluck', 'notification-success-pluck'], ['Warm', 'notification-success-warm'],
    ['Fanfare', 'notification-success-fanfare'], ['Flourish', 'notification-success-flourish'], ['Popper', 'celebration-popper'], ['Fireworks', 'celebration-fireworks'],
    ['Coin Drop', 'money-coin-drop'], ['Coins Pour', 'money-coins-pour'], ['Coin Stack', 'money-coin-stack'], ['Coin Spin', 'money-coin-spin'],
    ['Shop Bell', 'props-shop-bell'], ['Doorbell', 'props-doorbell'], ['Phone Ring', 'phone-ring-classic'], ['Ring Modern', 'phone-ring-modern'], ['Vibrate', 'phone-vibrate-table'],
    ['Blip', 'digital-blip-clear'], ['Power Up', 'digital-power-up'], ['Scan', 'digital-scan-clear'], ['Glitch', 'digital-glitch-clear'], ['Hacker', 'digital-hacker'], ['Breach', 'digital-breach'],
    ['Error', 'notification-error-clear'], ['Wobble', 'notification-failure-wobble'],
    ['Metal Clang', 'cinematic-metal-big'], ['Slam', 'cinematic-slam-big'], ['Thunder', 'cinematic-thunder-big'], ['808', 'bass-808-short'], ['Sub Drop', 'bass-sub-drop-short'],
    ['Tech Sting', 'sting-tech-short'], ['Bright Sting', 'sting-bright-short'],
    ['Glass', 'glass_004'], ['Confirm', 'confirmation_003'], ['Rise', 'maximize_008'], ['Question', 'question_001'], ['Glitch 2', 'glitch_002'], ['Toggle', 'toggle_002'],
  ];
  const FILE_OF = Object.fromEntries(LIST);
  // names saved before Nov 16 (the old synth sounds) map to the closest real one
  const OLD = { Beep: 'Blip', Coin: 'Coin Drop', Buzz: 'Error', 'Harsh Buzz': 'Breach', 'Electric Shock': 'Glitch', Chainsaw: 'Hacker', Destroyer: 'Slam', 'Beep+Boop': 'Blip', Ching: 'Shop Bell', UX1: 'Rise', UX2: 'Pop', UX3: 'Confirm', UX4: 'Toggle', UX5: 'Power Up', UX6: 'Sparkle', Tick: 'Blip', Bong: 'Metal Clang', Cash: 'Coins Pour', 'Level up': 'Fanfare' };
  const ALL = LIST.map((x) => x[0]);
  let ctx = null;
  const bufs = {};
  function audio() {
    if (!ctx) { try { ctx = (BH.Sound && BH.Sound.ctx) || new (g.AudioContext || g.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  async function buffer(name) {
    const file = FILE_OF[name]; if (!file) return null;
    if (bufs[file]) return bufs[file];
    const c = audio(); if (!c) return null;
    try { const r = await fetch(DIR + file + '.ogg'); if (!r.ok) return null; bufs[file] = await c.decodeAudioData(await r.arrayBuffer()); return bufs[file]; } catch (e) { return null; }
  }
  async function play(sound, vol, name, custom) {
    vol = vol == null ? 0.5 : vol;
    if (!sound) return;
    if (OLD[sound]) sound = OLD[sound];
    if (sound === 'Voice') { try { const u = new SpeechSynthesisUtterance(String(name || 'someone').replace(/^@/, '') + ' posted'); u.volume = Math.min(1, vol * 1.6); u.rate = 1.1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* no voices */ } return; }
    if (sound === 'Custom') { if (custom) { try { const el = new Audio(custom); el.volume = Math.min(1, vol); el.play().catch(() => {}); } catch (e) { /* bad file */ } } return; }
    const c = audio(), buf = await buffer(sound); if (!c || !buf) return;
    const src = c.createBufferSource(), gn = c.createGain(); src.buffer = buf; gn.gain.value = vol * 1.8;
    src.connect(gn); gn.connect(c.destination); src.start();
  }

  // ---- alerts: a tracked account posted ----
  let lastT = null;
  function check() {
    try {
      if (!BH.J7UI || !BH.J7UI.items || !UI.game) return;
      const now = UI.game.sim.t;
      if (lastT == null || now < lastT) { lastT = now; return; }   // first look (or a loaded save): don't ring for old posts
      let rang = 0;
      for (const it of BH.J7UI.items(40)) {
        if (it.t <= lastT) break;
        const k = BH.J7UI.keyOf(it), p = get(k);
        if (p.sound && !p.hide && rang < 2) { play(p.sound, p.vol, p.name || BH.J7UI.handleOf(it), p.custom); rang++; }
      }
      lastT = now;
    } catch (e) { /* alerts are extra: never break the terminal */ }
  }
  setInterval(check, 400);

  // ---- the ⋮ menu ----
  let pop = null;
  function close() { if (pop) { pop.remove(); pop = null; } document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', onKey, true); }
  function outside(e) { if (pop && !pop.contains(e.target)) close(); }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  function open(html, x, y, cls) {
    close();
    pop = document.createElement('div'); pop.className = 'j7a j7a-' + cls; pop.innerHTML = html;
    document.body.appendChild(pop);
    const w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(6, Math.min(x, innerWidth - w - 6)) + 'px';
    pop.style.top = Math.max(6, Math.min(y, innerHeight - h - 6)) + 'px';
    setTimeout(() => { document.addEventListener('mousedown', outside, true); document.addEventListener('keydown', onKey, true); }, 0);
    return pop;
  }
  // which wallet an account trades from (J7 KOLs); null for accounts that never trade
  function walletOf(k) { const gm = UI.game, j = gm && gm.sys.j7; if (!j || !String(k).startsWith('j7:')) return null; return j.wallets[String(k).slice(3)] || null; }
  function menu(btn, k, handle, at) {
    const p = get(k), r = at ? { right: at.x + 220, bottom: at.y } : btn.getBoundingClientRect();
    const w = walletOf(k), tr = UI.game && UI.game.sys.tracker, tracked = !!(w && tr && tr.get(w));
    open((w ? '<button data-a="track">' + icon(tracked ? 'radar' : 'crosshair', 'sm') + (tracked ? 'Untrack ' : 'Track ') + esc(handle) + '\'s wallet</button>' : '<div class="j7a-empty">' + esc(handle) + ' has no trading wallet</div>') +'<button data-a="sound">' + icon('volume-2', 'sm') + (p.sound ? 'Edit sound for ' : 'Add sound to ') + esc(handle) + '</button>' +
      '<button data-a="hide">' + icon('eye-off', 'sm') + 'Filter out ' + esc(handle) + '</button>' +
      '<button data-a="pin">' + icon(p.pin ? 'pin-off' : 'pin', 'sm') + (p.pin ? 'Unpin ' : 'Pin ') + esc(handle) + '</button>', r.right - 220, r.bottom + 4, 'menu');
    pop.onclick = (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'sound') { panel(k, handle); return; }
      if (a.dataset.a === 'track' && w && tr) {
        if (tracked) { tr.untrack(w); UI.toast('info', 'Stopped tracking ' + handle); }
        else { tr.track(w, { name: handle.replace(/^@/, '') }); UI.toast('info', 'Tracking ' + handle + '\'s wallet: their buys and sells pop up, and they show in Trackers'); }
      }
      if (a.dataset.a === 'hide') { set(k, { hide: true, name: handle }); UI.toast('info', handle + ' is filtered out of J7. The Filtered button in J7 brings them back.'); }
      if (a.dataset.a === 'pin') { set(k, { pin: !p.pin, name: handle }); UI.toast('info', (p.pin ? 'Unpinned ' : 'Pinned ') + handle); }
      close();
    };
  }
  // the filtered list (J7 header button): bring accounts back
  function filtered(btn) {
    const list = Object.entries(prefs).filter(([, p]) => p.hide), r = btn.getBoundingClientRect();
    open(list.length ? list.map(([k, p]) => '<button data-k="' + esc(k) + '">' + icon('eye', 'sm') + 'Show ' + esc(p.name || k) + ' again</button>').join('') : '<div class="j7a-empty">No accounts filtered out. Use ⋮ on a post to filter one.</div>', r.left, r.bottom + 4, 'menu');
    pop.onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; set(b.dataset.k, { hide: false }); close(); };
  }

  const COLORS = ['#ff4d4d', '#ff8a1f', '#ffe81a', '#2bff3a', '#22c55e', '#1ff1ff', '#4a8dff', '#a45cff', '#ff1fff', '#ff6fb5', '#ffffff', '#ffc61a'];
  function panel(k, handle) {
    const p = get(k);
    let q = '';
    const draw = () => {
      const cur = Object.assign({}, get(k)); if (OLD[cur.sound]) cur.sound = OLD[cur.sound]; const vol = cur.vol == null ? 0.5 : cur.vol;
      const chips = ALL.filter((n) => !q || n.toLowerCase().includes(q)).map((n) => '<button class="j7a-chip' + (cur.sound === n ? ' on' : '') + '" data-snd="' + esc(n) + '">' + esc(n) + '</button>').join('');
      pop.querySelector('.j7a-body').innerHTML =
        '<div class="j7a-row"><span class="j7a-lab">' + icon('pin', 'sm') + 'PIN TWEETS</span><button class="j7a-tog' + (cur.pin ? ' on' : '') + '" data-pin><i></i></button></div>' +
        '<div class="j7a-sec"><span class="j7a-lab">HIGHLIGHT</span><div class="j7a-cols"><button class="j7a-col none' + (cur.color ? '' : ' on') + '" data-col="" title="No highlight">' + icon('ban', 'sm') + '</button>' +
          COLORS.map((c) => '<button class="j7a-col' + (cur.color === c ? ' on' : '') + '" data-col="' + c + '" style="background:' + c + '"></button>').join('') +
          '<label class="j7a-col plus" title="Any color">' + icon('plus', 'sm') + '<input type="color" data-colpick value="' + esc(cur.color || '#4a8dff') + '"></label></div></div>' +
        '<div class="j7a-sec"><span class="j7a-lab">SOUND</span><div class="j7a-srow"><input class="j7a-q" placeholder="Search sounds…" value="' + esc(q) + '">' +
          '<button class="j7a-b' + (cur.sound === 'Voice' ? ' on' : '') + '" data-snd="Voice" title="Read the name out loud">' + icon('mic', 'sm') + 'Voice</button>' +
          '<button class="j7a-b' + (cur.sound === 'Custom' ? ' on' : '') + '" data-custom title="A sound file from your PC (up to 400 KB)">' + icon('plus', 'sm') + (cur.custom ? 'Custom ✓' : 'Custom') + '</button></div>' +
          '<div class="j7a-chips"><button class="j7a-chip mute' + (cur.sound ? '' : ' on') + '" data-snd="" title="No sound">' + icon('volume-x', 'sm') + '</button>' + chips + '</div></div>' +
        '<div class="j7a-vol">' + icon('volume-1', 'sm') + '<input type="range" min="0" max="1" step="0.05" value="' + vol + '" data-vol><b>' + Math.round(vol * 100) + '%</b></div>';
      const qi = pop.querySelector('.j7a-q'); qi.addEventListener('input', () => { q = qi.value.trim().toLowerCase(); const pos = qi.selectionStart; draw(); const n = pop.querySelector('.j7a-q'); n.focus(); n.setSelectionRange(pos, pos); });
      qi.addEventListener('keydown', (e) => e.stopPropagation());
      pop.querySelector('[data-vol]').addEventListener('input', (e) => { set(k, { vol: +e.target.value, name: handle }); e.target.nextSibling.textContent = Math.round(e.target.value * 100) + '%'; });
      pop.querySelector('[data-vol]').addEventListener('change', () => { const c2 = get(k); play(c2.sound, c2.vol, handle, c2.custom); });
      pop.querySelector('[data-colpick]').addEventListener('change', (e) => { set(k, { color: e.target.value, name: handle }); draw(); });
    };
    open('<div class="j7a-head"><b>' + esc(handle) + '</b><button class="j7a-x" data-close title="Close">' + icon('x', 'sm') + '</button></div><div class="j7a-body"></div>', innerWidth / 2 - 175, innerHeight / 2 - 210, 'panel');
    draw();
    pop.onclick = (e) => {
      if (e.target.closest('[data-close]')) { close(); return; }
      if (e.target.closest('[data-pin]')) { set(k, { pin: !get(k).pin, name: handle }); draw(); return; }
      const col = e.target.closest('[data-col]'); if (col) { set(k, { color: col.dataset.col || null, name: handle }); draw(); return; }
      if (e.target.closest('[data-custom]')) {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*';
        inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; if (f.size > 400e3) { UI.toast('fail', 'That sound is too big (400 KB max)'); return; }
          const rd = new FileReader(); rd.onload = () => { set(k, { custom: rd.result, sound: 'Custom', name: handle }); play('Custom', get(k).vol, handle, rd.result); draw(); }; rd.readAsDataURL(f); };
        inp.click(); return;
      }
      const s = e.target.closest('[data-snd]');
      if (s) { const n = s.dataset.snd || null; if (n === 'Custom' && !get(k).custom) return; set(k, { sound: n, name: handle }); const c2 = get(k); play(n, c2.vol, handle, c2.custom); draw(); }
    };
  }

  // screenshot helper (#...&j7acc=1): demo settings held in memory only (never saved), then the popup opens
  try {
    const hash = (parent && parent.location && parent.location.hash) || '';
    if (/[#&]j7acc=1/.test(hash)) setTimeout(() => {
      const its = BH.J7UI ? BH.J7UI.items(30).filter((x) => x.tw) : [];
      const a = its[0], b = its.find((x) => BH.J7UI.keyOf(x) !== BH.J7UI.keyOf(a));
      if (a) prefs[BH.J7UI.keyOf(a)] = { sound: 'Ding Ding', vol: 0.5, color: '#2bff3a', name: BH.J7UI.handleOf(a) };
      if (b) prefs[BH.J7UI.keyOf(b)] = { pin: true, color: '#a45cff', name: BH.J7UI.handleOf(b) };
      BH.J7UI.render();
      if (a) setTimeout(() => panel(BH.J7UI.keyOf(a), BH.J7UI.handleOf(a)), 300);
    }, 2500);
  } catch (e) { /* not in the game frame */ }
  // screenshot helper (#...&j7ctx=1): right-click the newest KOL post (opens the menu only; nothing is saved)
  try {
    const hash2 = (parent && parent.location && parent.location.hash) || '';
    if (/[#&]j7ctx=1/.test(hash2)) setTimeout(() => {
      const m = [...document.querySelectorAll('#j7 .j7-tw [data-jmenu^="j7:"]')].find((b) => { const j = UI.game.sys.j7; return j && j.wallets[b.dataset.jmenu.slice(3)]; });
      if (m) { const r = m.getBoundingClientRect(); menu(m, m.dataset.jmenu, m.dataset.jh, { x: r.left - 150, y: r.bottom + 2 }); }
    }, 3000);
  } catch (e) { /* not in the game frame */ }
  BH.J7Alerts = {
    get, set, play, menu, filtered, SOUNDS: ALL,
    // how a post looks: highlight color and pinned/filtered state
    deco: (k) => { const p = get(k); return { hide: !!p.hide, pin: !!p.pin, color: p.color || null, sound: !!p.sound }; },
    hiddenCount: () => Object.values(prefs).filter((p) => p.hide).length,
  };
})(window);
