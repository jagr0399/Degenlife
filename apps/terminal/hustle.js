/* Extra DegenOS apps. A small page registry (BH.MorePages) that later phases add to,
   plus the Hustle app: Meme Lab, Clients, Crew and Heat. Loaded after axiom.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, icon = BH.icon, esc = BH.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const setHTML = (el, v) => { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } };
  const game = () => UI.game;
  const toast = (r) => UI.toast(r.ok ? 'info' : 'fail', r.text || r.reason || (r.ok ? 'Done' : 'Failed'));
  const usd = (n) => '$' + Math.round(n).toLocaleString();

  // ---- registry: { id: { app: [id, name, icon, color], build(el), render() } } ----
  const PAGES = BH.MorePages = BH.MorePages || {};
  BH.addApp = function (id, name, ic, color, page) {
    PAGES[id] = page;
    if (!BH.AppsUI.APPS.some((a) => a[0] === id)) BH.AppsUI.APPS.push([id, name, ic, color, id]);
    BH.AppsUI.APP_OF_VIEW[id] = id;
  };
  const origGo = UI.go, origRender = UI.render;
  UI.go = function (view) {
    origGo.call(this, view);
    const p = PAGES[view];
    if (p && this.el) { p.build.call(p, this.el); this.el._x = view; try { p.render.call(p, true); } catch (e) { if (g.parent && g.parent.degen) g.parent.degen.log('page ' + view + ': ' + e.message); } }
  };
  UI.render = function (full) {
    origRender.call(this, full);
    const p = PAGES[this.view];
    if (p && this.el && this.el._x === this.view) { try { p.render.call(p, full); } catch (e) { if (g.parent && g.parent.degen) g.parent.degen.log('page ' + this.view + ': ' + e.message); } }
  };
  const tabs = (cur, list) => '<div class="seg" data-tabs>' + list.map(([id, l]) => '<button data-tab="' + id + '" class="' + (cur === id ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
  const meter = (v, col) => '<div class="hb-meter"><i style="width:' + Math.max(0, Math.min(100, v)) + '%;background:' + col + '"></i></div>';
  const heatCol = (h) => h >= 80 ? '#ff4d5e' : h >= 60 ? '#ff7a45' : h >= 40 ? '#f4b23e' : h >= 20 ? '#e8d36a' : '#2bd67b';

  // ---------------- Hustle ----------------
  const hustle = {
    tab: 'lab', pick: null,
    build(el) {
      const b = game().sys.biz;
      if (BH.hustleTab) { this.tab = BH.hustleTab; BH.hustleTab = null; }
      if (!this.pick) { this.pick = {}; for (const s of BH.Biz.SLOTS) this.pick[s] = BH.Biz.TRAITS[s][0][0]; }
      if (!b.applicants.length) b.newApplicants();
      el.innerHTML = '<div class="xp hustle"><h1>' + icon('flask-conical', 'lg') + 'Hustle <span class="dim">· your memecoin business</span><div class="spacer"></div><span id="hbHeat"></span>' + tabs(this.tab, [['lab', 'Meme Lab'], ['clients', 'Clients'], ['crew', 'Crew'], ['heat', 'Heat']]) + '</h1><div id="hbBody"></div></div>';
      el.addEventListener('click', (e) => {
        const gm = game(), b = gm.sys.biz;
        const t = e.target.closest('[data-tab]'); if (t) { this.tab = t.dataset.tab; el.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === t)); $('#hbBody')._h = null; this.render(true); return; }
        const tr = e.target.closest('[data-trait]'); if (tr) { const [s, id] = tr.dataset.trait.split(':'); const info = b.traitInfo(s, id); if (info.open) this.pick[s] = id; else toast(b.unlock(s, id)); this.render(true); return; }
        const a = e.target.closest('[data-act]'); if (!a) return;
        const [act, id] = a.dataset.act.split(':');
        let r = null;
        if (act === 'develop') { r = b.develop(this.pick); if (r.ok && BH.Sound) BH.Sound.play(r.newly.length ? 'ach' : 'confirm'); }
        if (act === 'scout') r = b.scout();
        if (act === 'hire') r = b.hire(id);
        if (act === 'fire') r = b.fire(id);
        if (act === 'bonus') r = b.bonus(id);
        if (act === 'refresh') { if (gm.bills.pay(40)) { b.newApplicants(); r = { ok: true, text: 'New applicants posted ($40 job ad).' }; } else r = { ok: false, reason: 'A job ad costs $40' }; }
        if (act === 'quiet') r = b.goQuiet();
        if (act === 'launch') { UI.openApp('dev'); return; }
        if (r) toast(r);
        $('#hbBody')._h = null; this.render(true);
      });
    },
    render() {
      const gm = game(), b = gm.sys.biz; if (!b) return;
      setHTML($('#hbHeat'), '<span class="hb-heat" style="--c:' + heatCol(b.heat) + '">' + icon('flame', 'sm') + 'Heat ' + Math.round(b.heat) + ' · ' + b.level() + '</span>');
      let html = '';
      if (this.tab === 'lab') {
        const score = b.scoreOf(this.pick), armed = b.armed();
        html = '<div class="grid-2"><div class="card"><h2>' + icon('flask-conical') + 'Mix a recipe</h2><p class="note">Pick one trait from each row. Some combos work much better together; find them by trying. The hot narrative on Chirp adds to the score. Locked traits cost research money.</p>' +
          BH.Biz.SLOTS.map((s) => '<div class="hb-row"><b>' + s[0].toUpperCase() + s.slice(1) + '</b><div class="hb-chips">' + BH.Biz.TRAITS[s].map(([id]) => { const t = b.traitInfo(s, id); return '<button class="hb-chip' + (this.pick[s] === id ? ' on' : '') + (t.open ? '' : ' locked') + '" data-trait="' + s + ':' + id + '">' + (t.open ? '' : icon('lock', 'sm')) + esc(t.name) + (t.open ? '' : ' <small>' + usd(t.cost) + '</small>') + '</button>'; }).join('') + '</div></div>').join('') +
          '<div class="hb-score"><span>Expected score</span><b>' + score + '</b>' + meter(score, '#a77bff') + '</div><button class="btn primary" data-act="develop">' + icon('sparkles', 'sm') + 'Develop recipe ($50 · 1 hour)</button></div>' +
          '<div class="card"><h2>' + icon('book-open') + 'Recipe book</h2>' + (armed ? '<div class="banner">' + icon('rocket') + 'Ready: your next launch in Coin Factory uses the ' + armed.score + '/100 recipe (' + esc(b.traitInfo('narrative', armed.traits.narrative).name) + '). <button class="btn sm" data-act="launch">Open Coin Factory</button></div>' : '<p class="dim">No recipe ready. Develop one, then launch in Coin Factory.</p>') +
          '<h3 class="xh">Combos you found</h3>' + (b.knownCombos().length ? b.knownCombos().map((c) => '<div class="kv"><span>' + esc(c) + '</span></div>').join('') : '<p class="dim">None yet.</p>') +
          '<h3 class="xh">Past recipes</h3>' + (b.recipes.length ? b.recipes.slice(0, 8).map((x) => '<div class="kv"><span>' + BH.Biz.SLOTS.map((s) => esc(b.traitInfo(s, x.traits[s]).name)).join(' · ') + '</span><b>' + x.score + (x.used ? ' · $' + esc(x.ticker || '') : ' · ready') + '</b></div>').join('') : '<p class="dim">Nothing yet.</p>') + '</div></div>';
      }
      if (this.tab === 'clients') {
        html = '<div class="card"><h2>' + icon('briefcase') + 'Client network <span class="dim">· they buy in the first seconds of your launches</span><div class="spacer"></div><button class="btn sm primary" data-act="scout">' + icon('search', 'sm') + 'Network for clients ($120 · 2h)</button></h2><p class="note">Clients who like a coin\'s narrative almost always buy early. If the coin does well (2.5x from their entry, no rug) they get more loyal and may refer friends. Rug them and they leave.</p>' +
          '<table class="tbl"><thead><tr><th class="l">Client</th><th>Buys</th><th class="l">Likes</th><th class="l">Loyalty</th><th>Wins</th><th>Losses</th></tr></thead><tbody>' +
          b.clients.map((c) => '<tr><td class="l"><b>' + esc(c.name) + '</b></td><td>' + c.size + ' SOL</td><td class="l">' + esc(BH.Social.prototype.label.call({}, c.taste)) + '</td><td class="l">' + meter(c.loyalty, c.loyalty > 60 ? '#2bd67b' : c.loyalty > 30 ? '#f4b23e' : '#ff4d5e') + '</td><td class="up">' + c.wins + '</td><td class="down">' + c.losses + '</td></tr>').join('') + '</tbody></table>' + (b.clients.length ? '' : '<p class="dim">No clients. Go network.</p>') + '</div>';
      }
      if (this.tab === 'crew') {
        const card = (c, hired) => '<div class="card item"><b>' + esc(c.name) + '</b><span class="price">' + usd(c.pay) + '/day</span><p>' + esc(BH.Biz.ROLES[c.role].name) + ': ' + esc(BH.Biz.ROLES[c.role].desc) + '</p><small class="dim">Level ' + c.level + ' · loyalty ' + Math.round(c.loyalty) + (hired ? '' : ' · honesty ' + (c.honesty > 60 ? 'seems fine' : c.honesty > 35 ? 'hard to read' : 'shifty eyes')) + '</small>' + (hired ? '<div class="hb-btns"><button class="btn sm" data-act="bonus:' + c.id + '">Bonus $100</button><button class="btn sm ghost" data-act="fire:' + c.id + '">Let go</button></div>' : '<button class="btn sm primary" data-act="hire:' + c.id + '">Hire</button>') + '</div>';
        html = '<h2 class="xh">Your crew (' + b.crew.length + '/8)</h2><div class="xgrid">' + (b.crew.length ? b.crew.map((c) => card(c, true)).join('') : '<p class="dim">Nobody yet.</p>') + '</div>' +
          '<h2 class="xh">Applicants <button class="btn sm" data-act="refresh">Post a job ad ($40)</button></h2><div class="xgrid">' + b.applicants.map((c) => card(c, false)).join('') + '</div><p class="note">Crew get paid every morning. Unpaid or unhappy crew quit, shifty ones skim cash, and disloyal ones talk to sleuths when your heat is up.</p>';
      }
      if (this.tab === 'heat') {
        html = '<div class="grid-2"><div class="card"><h2>' + icon('flame') + 'Heat: ' + Math.round(b.heat) + ' / 100 · ' + b.level() + '</h2>' + meter(b.heat, heatCol(b.heat)) +
          '<div class="hb-levels"><span' + (b.heat >= 20 ? ' class="on"' : '') + '>20 Noticed</span><span' + (b.heat >= 40 ? ' class="on"' : '') + '>40 Sleuth threads, trust drops</span><span' + (b.heat >= 60 ? ' class="on"' : '') + '>60 Platforms limit your launches</span><span' + (b.heat >= 80 ? ' class="on"' : '') + '>80 Fines from the Department of Vibes</span></div>' +
          '<p class="note">Rugs, bot volume and shilling raise heat. It cools every hour, faster with Mods and when you lie low.</p>' +
          (b.isLow() ? '<div class="banner">' + icon('moon') + 'Lying low until day ' + Math.floor(b.lieLow / 24 + 1) + '. Shillers and bot runners are paused.</div>' : '<button class="btn" data-act="quiet">' + icon('moon', 'sm') + 'Lie low for 2 days</button>') + '</div>' +
          '<div class="card"><h2>' + icon('scroll-text') + 'What raised it</h2>' + (b.heatLog.length ? b.heatLog.slice(0, 14).map((l) => '<div class="kv"><span>Day ' + l.day + ' · ' + esc(l.why) + '</span><b class="down">+' + l.d + '</b></div>').join('') : '<p class="dim">Nothing. Squeaky clean.</p>') + '</div></div>';
      }
      setHTML($('#hbBody'), html);
    },
  };
  BH.addApp('hustle', 'Hustle', 'flask-conical', '#a77bff', hustle);

  // ---- generic tabbed app: tabs = [[id, label, (gm, H) => html]]; buttons use data-do="sys.method|arg" ----
  const H = {
    esc, icon, usd, meter, heatCol,
    btn: (label, act, cls, title) => '<button class="btn sm ' + (cls || '') + '" data-do="' + esc(act) + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + label + '</button>',
    card: (title, ic, body, extra) => '<div class="card"><h2>' + (ic ? icon(ic) : '') + title + (extra ? '<div class="spacer"></div>' + extra : '') + '</h2>' + body + '</div>',
    kv: (k, v, cls) => '<div class="kv"><span>' + k + '</span><b class="' + (cls || '') + '">' + v + '</b></div>',
    note: (t) => '<p class="note">' + t + '</p>',
    table: (heads, rows) => '<table class="tbl"><thead><tr>' + heads.map((h, i) => '<th' + (i === 0 ? ' class="l"' : '') + '>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c, i) => '<td' + (i === 0 ? ' class="l"' : '') + '>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>',
    empty: (t) => '<p class="dim">' + t + '</p>',
    sign: (n, d) => '<span class="' + (n >= 0 ? 'up' : 'down') + '">' + (n >= 0 ? '+' : '') + (d != null ? n.toFixed(d) : Math.round(n).toLocaleString()) + '</span>',
  };
  BH.AppKit = H;
  BH.makeApp = function (id, name, ic, color, spec) {
    const page = {
      tab: spec.tabs[0][0],
      build(el) {
        if (BH.appTab && BH.appTab[id]) { this.tab = BH.appTab[id]; delete BH.appTab[id]; }
        el.innerHTML = '<div class="xp more-app"><h1>' + icon(ic, 'lg') + name + ' <span class="dim">· ' + esc(spec.sub || '') + '</span><div class="spacer"></div><span id="maBadge"></span>' + tabs(this.tab, spec.tabs.map((t) => [t[0], t[1]])) + '</h1><div id="maBody"></div></div>';
        el.addEventListener('click', (e) => {
          const t = e.target.closest('[data-tab]'); if (t) { this.tab = t.dataset.tab; el.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === t)); $('#maBody')._h = null; this.render(true); return; }
          const c = e.target.closest('[data-coin]'); if (c && game().sim.byId.get(c.dataset.coin)) { UI.openApp('terminal'); UI.openToken(c.dataset.coin); return; }
          const d = e.target.closest('[data-do]'); if (!d) return;
          let act = d.dataset.do;
          const inp = d.dataset.input && $(d.dataset.input); if (inp) act += '|' + inp.value;
          const r = BH.runAction(game(), act);
          if (r) { toast(r); if (r.ok && BH.Sound) BH.Sound.play('confirm', { gain: 0.5 }); }
          $('#maBody')._h = null; this.render(true);
        });
      },
      render() {
        const gm = game(); if (!gm || !gm.sys) return;
        if (spec.badge) setHTML($('#maBadge'), spec.badge(gm, H));
        const tab = spec.tabs.find((t) => t[0] === this.tab) || spec.tabs[0];
        let html; try { html = tab[2](gm, H); } catch (e) { html = '<p class="down">Error: ' + esc(e.message) + '</p>'; }
        const body = $('#maBody'); if (body && document.activeElement && body.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;   // don't wipe a field you're typing in
        setHTML(body, html);
      },
    };
    BH.addApp(id, name, ic, color, page);
    return page;
  };
})(window);
