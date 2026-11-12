/* HUD over the 3D view: clock, cash and SOL, life bars, crosshair, use prompt, toasts, and modal cards
   (main menu, pause, settings, sleep summary). Plain DOM; reads BH.Game. */
(function (g) {
  'use strict';
  const BH = g.BH;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pascal = (n) => n.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
  function icon(name, cls) {
    const node = g.lucide && g.lucide.icons && g.lucide.icons[pascal(name)];
    if (!node) return '';
    const kids = (node[2] || []).map(([tag, at]) => '<' + tag + ' ' + Object.entries(at).map(([k, v]) => k + '="' + v + '"').join(' ') + '/>').join('');
    return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + kids + '</svg>';
  }
  const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 6.5c1.5 1.6 3.2 2.3 5 2.3s3.5-.7 5-2.3l-1.6 4.3h-6.8z" fill="#c78a24"/><path d="M12.6 10.8h6.8c4.6 2.6 7.6 7 7.6 11 0 4-3.4 5.7-11 5.7S5 25.8 5 21.8c0-4 3-8.4 7.6-11z" fill="#f4b23e"/><path d="M9.5 21.2l3.4-3.4 2.8 2.4 4.9-5.3" stroke="#1b1305" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const STATS = [
    { k: 'energy', label: 'Energy', ic: 'zap' },
    { k: 'food', label: 'Food', ic: 'utensils' },
    { k: 'focus', label: 'Focus', ic: 'brain' },
    { k: 'sanity', label: 'Sanity', ic: 'smile' },
  ];

  const HUD = {
    el: null,
    init(root) {
      this.el = root;
      root.innerHTML =
        '<div class="hud-top"><div class="pill clock" id="hClock"></div><div class="spacer"></div>' +
          '<div class="pill" id="hCash" title="Cash (rent, food)"></div><div class="pill" id="hSol" title="Trading wallet"></div></div>' +
        '<div class="hud-stats" id="hStats">' + STATS.map((s) => '<div class="stat" data-k="' + s.k + '">' + icon(s.ic, 'sm') + '<span>' + s.label + '</span><div class="bar"><i></i></div></div>').join('') + '</div>' +
        '<div class="crosshair" id="hCross"></div>' +
        '<div class="prompt" id="hPrompt"></div>' +
        '<div class="toasts" id="hToasts"></div>' +
        '<div class="hint" id="hHint">Click to look around · WASD to walk · E to use · Esc or T for Pulse · P for menu</div>';
      this.$ = (id) => document.getElementById(id);
    },
    render(game) {
      if (!this.el || !game.sim) return;
      const set = (id, html) => { const e = this.$(id); if (e && e._h !== html) { e._h = html; e.innerHTML = html; } };
      set('hClock', icon(game.clock.isNight() ? 'moon' : 'sun', 'sm') + '<b>' + esc(game.clock.label()) + '</b>');
      const b = game.bills;
      set('hCash', icon('banknote', 'sm') + '<b>$' + Math.floor(b.cash).toLocaleString() + '</b>' + (b.debt > 0 ? '<em class="down">−$' + Math.ceil(b.debt) + '</em>' : ''));
      const nw = game.player.netWorth(), pc = (nw / game.player.startSol - 1) * 100;
      set('hSol', '<span class="sol">SOL</span><b>' + nw.toFixed(2) + '</b><em class="' + (pc >= 0 ? 'up' : 'down') + '">' + (pc >= 0 ? '+' : '') + pc.toFixed(1) + '%</em>');
      const L = game.life, vals = { energy: L.energy, food: 100 - L.hunger, focus: L.focus, sanity: L.sanity };
      for (const s of this.el.querySelectorAll('.hud-stats .stat')) {
        const v = vals[s.dataset.k];
        const bar = s.querySelector('i');
        const w = Math.round(v) + '%';
        if (bar.style.width !== w) bar.style.width = w;
        s.classList.toggle('low', v < 30);
      }
    },
    prompt(text, key) {
      const e = this.$('hPrompt');
      const html = text ? '<kbd>' + (key || 'E') + '</kbd>' + esc(text) : '';
      if (e._h !== html) { e._h = html; e.innerHTML = html; e.classList.toggle('show', !!text); }
      this.$('hCross').classList.toggle('on', !!text);
    },
    hint(show) { this.$('hHint').classList.toggle('hide', !show); },
    toast(kind, text) {
      const host = this.$('hToasts');
      const ic = { buy: 'circle-check', sell: 'coins', fail: 'circle-x', rug: 'skull', call: 'megaphone', bad: 'triangle-alert', error: 'octagon-alert', save: 'save' }[kind] || 'info';
      const t = document.createElement('div');
      t.className = 'toast ' + kind;
      t.innerHTML = icon(ic, 'sm') + '<span>' + esc(text) + '</span>';
      host.appendChild(t);
      while (host.children.length > 4) host.firstChild.remove();
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3800);
    },
    showWorld(on) { this.el.classList.toggle('hidden', !on); },

    // ---- cards (menus, summaries) ----
    card(html, opts) {
      this.closeCard();
      const bg = document.createElement('div');
      bg.className = 'cardbg' + (opts && opts.menu ? ' menu' : '');
      bg.id = 'hCard';
      bg.innerHTML = '<div class="card">' + html + '</div>';
      document.body.appendChild(bg);
      return bg;
    },
    closeCard() { const c = document.getElementById('hCard'); if (c) c.remove(); },
    cardOpen() { return !!document.getElementById('hCard'); },

    mainMenu(hasSave, onPick) {
      const bg = this.card(
        '<div class="brand">' + LOGO + '<div><h1>Degen Life</h1><p>A Bagholder story · fake money only</p></div></div>' +
        '<div class="menu-btns">' +
          (hasSave ? '<button class="btn primary" data-a="continue">' + icon('play', 'sm') + 'Continue</button>' : '') +
          '<button class="btn ' + (hasSave ? '' : 'primary') + '" data-a="new">' + icon('sparkles', 'sm') + 'New life</button>' +
          '<button class="btn" data-a="settings">' + icon('settings', 'sm') + 'Settings</button>' +
          '<button class="btn ghost" data-a="quit">' + icon('log-out', 'sm') + 'Quit</button>' +
        '</div><p class="fine">No wallets, chains or real money. Everything here is made up.</p>', { menu: true });
      bg.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) onPick(b.dataset.a); });
    },
    pauseMenu(onPick) {
      const bg = this.card('<h2>' + icon('pause', 'sm') + 'Paused</h2><p class="fine">The market is paused while this menu is open.</p><div class="menu-btns">' +
        '<button class="btn primary" data-a="resume">' + icon('play', 'sm') + 'Resume</button>' +
        '<button class="btn" data-a="save">' + icon('save', 'sm') + 'Save</button>' +
        '<button class="btn" data-a="settings">' + icon('settings', 'sm') + 'Settings</button>' +
        '<button class="btn ghost" data-a="quit">' + icon('log-out', 'sm') + 'Save and quit</button></div>');
      bg.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) onPick(b.dataset.a); });
    },
    settings(s, onChange, onBack) {
      const row = (k, label, input) => '<label class="set"><span>' + label + '</span>' + input + '</label>';
      const sel = (k, opts) => '<select data-k="' + k + '">' + opts.map(([v, l]) => '<option value="' + v + '"' + (String(s[k]) === String(v) ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>';
      const rng = (k, a, b, st) => '<input type="range" data-k="' + k + '" min="' + a + '" max="' + b + '" step="' + st + '" value="' + s[k] + '"><b>' + s[k] + '</b>';
      const bg = this.card('<h2>' + icon('settings', 'sm') + 'Settings</h2>' +
        row('quality', 'Graphics', sel('quality', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']])) +
        row('fov', 'Field of view', rng('fov', 60, 95, 1)) +
        row('sens', 'Mouse sensitivity', rng('sens', 0.2, 3, 0.1)) +
        row('bob', 'Head bob', sel('bob', [['1', 'On'], ['0', 'Off']])) +
        '<div class="menu-btns"><button class="btn primary" data-a="back">' + icon('arrow-left', 'sm') + 'Back</button></div>');
      bg.addEventListener('input', (e) => {
        const k = e.target.dataset.k; if (!k) return;
        let v = e.target.value; if (e.target.type === 'range') { v = +v; e.target.nextElementSibling.textContent = v; }
        onChange(k, v);
      });
      bg.addEventListener('click', (e) => { if (e.target.closest('[data-a="back"]')) onBack(); });
    },
    sleepSummary(s, onDone) {
      const pnl = s.pnlSol;
      const bg = this.card('<h2>' + icon('moon', 'sm') + 'You slept ' + s.hours + ' hours</h2>' +
        '<div class="sum">' +
          '<div><span>Your bags overnight</span><b class="' + (pnl >= 0 ? 'up' : 'down') + '">' + (pnl >= 0 ? '+' : '') + pnl.toFixed(3) + ' SOL</b></div>' +
          '<div><span>Coins launched</span><b>' + s.launched + '</b></div>' +
          '<div><span>Graduated</span><b>' + s.migrated + '</b></div>' +
          '<div><span>Rugged</span><b class="down">' + s.rugged + '</b></div>' +
        '</div>' +
        (s.biggestMover ? '<p class="fine">Biggest new coin while you slept: <b>$' + esc(s.biggestMover.ticker) + '</b>, peaked at $' + Math.round(s.biggestMover.athMc).toLocaleString() + ' market cap.</p>' : '') +
        '<div class="menu-btns"><button class="btn primary" data-a="ok">' + icon('sunrise', 'sm') + 'Get up</button></div>');
      bg.addEventListener('click', (e) => { if (e.target.closest('[data-a="ok"]')) { this.closeCard(); onDone(); } });
    },
    fade(on) {
      let f = document.getElementById('hFade');
      if (!f) { f = document.createElement('div'); f.id = 'hFade'; document.body.appendChild(f); }
      f.classList.toggle('on', on);
    },
  };
  HUD.icon = icon;
  BH.HUD = HUD;
})(window);
