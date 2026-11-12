/* HUD additions for stages 2-6: tutorial panel, visitor cards, retire/ending card, save slots, audio settings, radio, news ticker. */
(function (g) {
  'use strict';
  const BH = g.BH, H = BH.HUD;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  H.extraInit = function () {
    const root = this.el;
    const tut = document.createElement('div'); tut.className = 'tut'; tut.id = 'hTut'; tut.hidden = true; root.appendChild(tut);
    const radio = document.createElement('div'); radio.className = 'pill radio'; radio.id = 'hRadio'; root.querySelector('.hud-top').insertBefore(radio, root.querySelector('.hud-top .spacer'));
    const place = document.createElement('div'); place.className = 'pill place'; place.id = 'hPlace'; root.querySelector('.hud-top').insertBefore(place, radio);
    tut.addEventListener('click', (e) => { if (e.target.closest('[data-skip]') && BH.Game) { BH.Game.sys.tutorial.skip(); tut.hidden = true; } });
  };
  H.renderExtra = function (game) {
    const tu = game.sys.tutorial, st = tu && tu.current(), el = this.$('hTut');
    if (el) {
      if (!st) el.hidden = true;
      else { const n = BH.Tutorial.STEPS.indexOf(st) + 1, html = '<div class="tut-top"><span>Tutorial ' + n + '/' + BH.Tutorial.STEPS.length + '</span><button data-skip>Skip</button></div><div class="tut-bar"><i style="width:' + Math.round((n - 1) / BH.Tutorial.STEPS.length * 100) + '%"></i></div><b>' + esc(st.title) + '</b><p>' + esc(st.text) + '</p>' + (st.why ? '<p class="tut-why">' + esc(st.why) + '</p>' : ''); if (el._h !== html) { el._h = html; el.innerHTML = html; } el.hidden = false; }
    }
    const r = this.$('hRadio'); if (r && BH.Sound) { const t = this.icon('radio', 'sm') + '<span>' + esc(BH.Sound.nowPlaying()) + '</span>'; if (r._h !== t) { r._h = t; r.innerHTML = t; } }
    const p = this.$('hPlace'); if (p) { const pl = BH.Build.PLACES[game.meta.place]; const t = this.icon('map-pin', 'sm') + '<span>' + esc(pl ? pl.name : '') + '</span>'; if (p._h !== t) { p._h = t; p.innerHTML = t; } }
  };
  H.walletToast = function (ev) {
    const host = this.$('hToasts'); if (!host) return;
    const t = document.createElement('div'); t.className = 'wtoast'; t.innerHTML = BH.SocialView.walletToastHTML(BH.Game, 'assets/', ev);
    host.appendChild(t); t.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) t.remove(); });
    while (host.children.length > 4) host.firstChild.remove();
    setTimeout(() => t.remove(), 6000);
  };
  H.tutorialToast = function (done, next) { this.toast('save', 'Done: ' + done.title + (next ? '. Next: ' + next.title : '')); if (BH.Sound) BH.Sound.play('confirm', { gain: 0.6 }); };

  H.visitorCard = function (v, onPick) {
    const bg = this.card('<h2>' + this.icon('door-open', 'sm') + esc(v.who) + '</h2><p class="fine big">' + esc(v.text) + '</p><div class="menu-btns">' + v.choices.map(([label, act], i) => '<button class="btn ' + (i === 0 ? 'primary' : '') + '" data-a="' + act + '">' + esc(label) + '</button>').join('') + '</div>');
    bg.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) onPick(b.dataset.a); });
  };
  H.message = function (title, text, onOk) {
    const bg = this.card('<h2>' + esc(title) + '</h2><p class="fine big">' + esc(text) + '</p><div class="menu-btns"><button class="btn primary" data-a="ok">OK</button></div>');
    bg.addEventListener('click', (e) => { if (e.target.closest('[data-a]')) { this.closeCard(); if (onOk) onOk(); } });
  };
  H.retireCard = function (game, onPick) {
    const end = game.sys.world.endingFor(), next = BH.Prestige.PERKS.find((p) => !(game.meta.perks || []).includes(p[0]));
    const bg = this.card('<h2>' + this.icon('crown', 'sm') + 'Ending: ' + esc(end.title) + '</h2><p class="fine big">' + esc(end.text) + '</p><p class="fine">Retire to start a new life in the bedroom with a perk' + (next ? ': <b>' + esc(next[1]) + '</b> (' + esc(next[2]) + ')' : '') + '. Achievements and endings are kept.</p><div class="menu-btns"><button class="btn primary" data-a="retire">Retire and start over</button><button class="btn" data-a="stay">Keep playing</button></div>');
    bg.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) onPick(b.dataset.a); });
  };
  // save slots on the main menu
  H.slotsMenu = function (slots, onPick, onBack) {
    const bg = this.card('<h2>' + this.icon('save', 'sm') + 'Choose a save slot</h2><div class="menu-btns">' + slots.map((s) => '<button class="btn slot" data-slot="' + s.slot + '"><b>Slot ' + s.slot + '</b><span>' + (s.info ? esc(s.info) : 'Empty') + '</span></button>').join('') + '<button class="btn ghost" data-a="back">Back</button></div>');
    bg.addEventListener('click', (e) => { const b = e.target.closest('[data-slot]'); if (b) onPick(+b.dataset.slot); if (e.target.closest('[data-a="back"]')) onBack(); });
  };
  // audio settings: extend the settings card with sliders and the radio
  const origSettings = H.settings;
  H.settings = function (s, onChange, onBack) {
    origSettings.call(this, s, onChange, onBack);
    const card = document.querySelector('#hCard .card'), btns = card.querySelector('.menu-btns');
    const rng = (k, label) => '<label class="set"><span>' + label + '</span><input type="range" data-k="' + k + '" min="0" max="1" step="0.05" value="' + (s[k] != null ? s[k] : 0.5) + '"><b>' + Math.round((s[k] != null ? s[k] : 0.5) * 100) + '</b></label>';
    const extra = document.createElement('div');
    extra.innerHTML = rng('volMusic', 'Music') + rng('volSfx', 'Sound effects') + rng('volAmb', 'Ambience') +
      '<label class="set"><span>Radio</span><select data-k="radio"><option value="1"' + (s.radio !== '0' ? ' selected' : '') + '>On</option><option value="0"' + (s.radio === '0' ? ' selected' : '') + '>Off</option></select></label>' +
      '<label class="set"><span>Real coin data</span><select data-k="realCoins"><option value="1"' + (s.realCoins !== '0' ? ' selected' : '') + '>On (online)</option><option value="0"' + (s.realCoins === '0' ? ' selected' : '') + '>Off</option></select></label>' +
      '<label class="set"><span>Cat buys coins</span><select data-k="catTrades"><option value="1"' + (s.catTrades !== '0' ? ' selected' : '') + '>Yes</option><option value="0"' + (s.catTrades === '0' ? ' selected' : '') + '>No</option></select></label>' +
      '<label class="set"><span>Tutorial</span><select data-k="tutorial"><option value="keep">As is</option><option value="restart">Restart it</option><option value="off">Turn off</option></select></label>';
    card.insertBefore(extra, btns);
    extra.querySelectorAll('input[type=range]').forEach((i) => i.addEventListener('input', () => { i.nextElementSibling.textContent = Math.round(i.value * 100); }));
  };
})(window);
