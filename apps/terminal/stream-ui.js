/* Stream and Contracts apps (game/stream.js, game/contracts.js).
   Stream: go live, see viewers, chat, donations and clips; a red LIVE pill sits in the top bar while you're on.
   Contracts: today's three goals with progress bars and rewards. Loaded after hustle.js (BH.addApp) and suites.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, icon = BH.icon, esc = BH.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const game = () => UI.game;
  const setHTML = (el, v) => { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } };
  const toast = (r) => UI.toast(r.ok ? 'info' : 'fail', r.ok ? r.text : r.reason);
  const num = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(Math.round(n)));

  // ---------------- Stream ----------------
  const stream = {
    build(el) {
      el.innerHTML = '<div class="xp st"><div class="st-top"><h1>' + icon('radio', 'lg') + 'Stream</h1><div class="spacer"></div><button class="btn" id="stGo"></button></div>' +
        '<div class="st-grid"><div class="card st-stats" id="stStats"></div><div class="card st-chat"><h2>Chat</h2><div id="stChat" class="st-lines"></div></div></div>' +
        '<div class="grid-2"><div class="card"><h2>How streaming works</h2><p class="note">Go live, then trade in the terminal as usual. <b>Viewers come for action</b>: buys, big wins, brutal losses, frenzies and rugs. ' +
        'Go quiet for a minute and they drift away. <b>Donations and subs</b> pay real in-game cash. A <b>2x win or a −50% loss gets clipped</b> and goes around Chirp, which brings new followers ' +
        '(people love watching someone lose). Streaming uses energy; you stop when you are exhausted.</p></div><div class="card"><h2>Clips</h2><div id="stClips"></div></div></div></div>';
      el.addEventListener('click', (e) => {
        if (!e.target.closest('#stGo')) return;
        const s = game().sys.stream; toast(s.live ? s.stop() : s.start()); this.render(true);
      });
    },
    render() {
      const gm = game(); if (!gm || !gm.sys || !gm.sys.stream) return;
      const s = gm.sys.stream, go = $('#stGo');
      if (go) { const h = s.live ? icon('square', 'sm') + 'End stream' : icon('radio', 'sm') + 'Go live'; setHTML(go, h); go.className = 'btn ' + (s.live ? 'sell' : 'buy'); }
      const kv = (k, v, c) => '<div class="kv"><span>' + k + '</span><b class="' + (c || '') + '">' + v + '</b></div>';
      setHTML($('#stStats'), (s.live ? '<div class="st-live">● LIVE · ' + Math.floor((gm.sim.t - s.liveSince) / 60) + ' min</div>' : '<div class="st-off">Offline</div>') +
        kv(icon('eye', 'sm') + ' Viewers', s.live ? num(s.viewers) : '–') + kv('Hype', s.live ? '<span class="st-bar"><i style="width:' + Math.round(Math.min(100, s.excite * 10)) + '%"></i></span>' : '–') +
        kv('Stream followers', num(s.followers)) + kv('Subs', num(s.subs)) + kv('Earned this stream', '$' + Math.round(s.earnedToday || 0), 'up') + kv('Earned all time', '$' + Math.round(s.earned || 0)) + kv('Peak viewers', num(s.peak)));
      setHTML($('#stChat'), s.chat.length ? s.chat.slice(-18).map((c) => '<div class="st-line ' + c.kind + '"><b>' + esc(c.who) + '</b> ' + esc(c.text) + '</div>').join('') : '<p class="note">' + (s.live ? 'Chat is warming up…' : 'Go live to open chat.') + '</p>');
      const lines = $('#stChat'); if (lines) lines.scrollTop = lines.scrollHeight;
      setHTML($('#stClips'), s.clips.length ? s.clips.slice(-6).reverse().map((c) => '<div class="kv"><span>Day ' + c.day + ' · $' + esc(c.ticker) + ' ' + (c.x >= 1 ? c.x + 'x' : '−' + Math.round((1 - c.x) * 100) + '%') + '</span><b class="up">+' + c.gain + ' followers</b></div>').join('') : '<p class="note">No clips yet. Hit a 2x (or lose half) on stream.</p>');
    },
  };
  BH.addApp('stream', 'Stream', 'radio', '#ff4d5e', stream);

  // ---------------- Contracts ----------------
  const contracts = {
    build(el) {
      el.innerHTML = '<div class="xp ct"><h1>' + icon('clipboard-check', 'lg') + 'Daily contracts <span class="dim" id="ctDay"></span></h1><div id="ctList"></div>' +
        '<p class="note">Three new goals every game day. Finish one for its reward; finish all three for a bonus, and keep a streak going for bigger rewards. Unfinished contracts expire at midnight.</p></div>';
    },
    render() {
      const gm = game(); if (!gm || !gm.sys || !gm.sys.contracts) return;
      const c = gm.sys.contracts;
      setHTML($('#ctDay'), 'Day ' + (gm.clock ? gm.clock.day : '') + (c.streak ? ' · ' + c.streak + '-day streak 🔥' : ''));
      const pay = (x) => x.pay === 'cash' ? '$' + x.amount : x.pay === 'sol' ? x.amount + ' SOL' : '+' + x.amount + ' followers';
      setHTML($('#ctList'), c.list.map((x) => {
        const pct = Math.round(Math.min(1, x.have / x.goal) * 100), prog = x.goal > 1 ? (x.id === 'volume' ? x.have.toFixed(1) : Math.floor(x.have)) + ' / ' + x.goal : '';
        return '<div class="card ct-item ' + (x.done ? 'done' : '') + '"><div class="ct-row"><span class="ct-ic">' + icon(x.done ? 'check-circle-2' : 'circle', 'sm') + '</span><b>' + esc(x.text) + '</b><div class="spacer"></div><span class="ct-pay">' + pay(x) + '</span></div>' +
          '<div class="ct-prog"><i style="width:' + pct + '%"></i></div>' + (prog ? '<div class="note">' + prog + '</div>' : '') + '</div>';
      }).join('') || '<p class="note">New contracts arrive with the next day.</p>');
    },
  };
  BH.addApp('contracts', 'Contracts', 'clipboard-check', '#2bd67b', contracts);

  // suites: Stream joins Social, Contracts joins Trade
  const S = BH.Suites || [];
  const soc = S.find((x) => x.id === 'social'); if (soc && !soc.apps.includes('stream')) { soc.apps.push('stream'); soc.desc += ' Plus Stream (go live while you trade).'; }
  const trd = S.find((x) => x.id === 'trade'); if (trd && !trd.apps.includes('contracts')) { trd.apps.push('contracts'); trd.desc += ' Plus daily Contracts.'; }

  // a red LIVE pill in the top bar while streaming (click it to open the Stream app)
  setInterval(() => {
    const gm = game(), s = gm && gm.sys && gm.sys.stream, bar = $('#appbar'); if (!bar) return;
    let p = $('#abLive');
    if (!s || !s.live) { if (p) p.remove(); return; }
    if (!p) { p = document.createElement('button'); p.id = 'abLive'; p.className = 'ab-live'; p.addEventListener('click', () => UI.openApp('stream')); const sp = bar.querySelector('.spacer'); bar.insertBefore(p, sp ? sp.nextSibling : null); }
    setHTML(p, '● LIVE ' + icon('eye', 'sm') + num(s.viewers));
  }, 500);

  const css = document.createElement('style');
  css.textContent = '.st-top{display:flex;align-items:center;gap:10px}.st-grid{display:grid;grid-template-columns:minmax(260px,1fr) 2fr;gap:14px;margin-bottom:14px}' +
    '.st-live{color:#ff4d5e;font-weight:800;margin-bottom:8px}.st-off{color:var(--muted,#8b93a1);font-weight:700;margin-bottom:8px}.st-bar{display:inline-block;width:110px;height:6px;border-radius:3px;background:#1d222a;overflow:hidden;vertical-align:middle}.st-bar i{display:block;height:100%;background:linear-gradient(90deg,#f4b23e,#ff4d5e)}' +
    '.st-lines{height:300px;overflow-y:auto;font-size:13px;line-height:1.55}.st-line b{color:#a77bff;font-weight:700}.st-line.win{color:#2bd67b}.st-line.loss,.st-line.rug{color:#ff4d5e}.st-line.tip,.st-line.sub{color:#f4b23e;font-weight:700}' +
    '.ct-item{margin-bottom:10px}.ct-item.done{opacity:.65}.ct-row{display:flex;align-items:center;gap:8px}.ct-pay{color:#2bd67b;font-weight:700}.ct-prog{height:6px;border-radius:3px;background:#1d222a;overflow:hidden;margin:8px 0 2px}.ct-prog i{display:block;height:100%;background:#2bd67b}' +
    '#appbar .ab-live{color:#ff4d5e !important;font-weight:800;gap:4px}@media (max-width:900px){.st-grid{grid-template-columns:1fr}}';
  document.head.appendChild(css);
})(window);
