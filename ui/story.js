/* Story UI: dialogue cards with choices, the act banner, and the Story page on the phone (acts, goals, cast, path, rival, journal). */
(function (g) {
  'use strict';
  const BH = g.BH, H = BH.HUD;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const usd = (n) => '$' + Math.round(n).toLocaleString();

  const face = (who, big) => { const c = BH.Story.CAST[who]; return '<span class="st-face' + (big ? ' big' : '') + '" style="--c:' + c.color + '">' + H.icon(c.icon, big ? '' : 'sm') + '</span>'; };

  H.storyCard = function (scene, onPick) {
    const c = BH.Story.CAST[scene.who];
    const bg = this.card('<div class="st-head">' + face(scene.who, true) + '<div><h2>' + esc(c.name) + '</h2><span class="dim">' + esc(c.role) + ' · Act ' + scene.act + '</span></div></div>' +
      scene.lines.map((l) => '<p class="fine big st-line">' + esc(l) + '</p>').join('') +
      '<div class="menu-btns st-choices">' + scene.choices.map((ch, i) => '<button class="btn ' + (i === 0 ? 'primary' : '') + '" data-c="' + i + '">' + esc(ch[0]) + '</button>').join('') + '</div>');
    bg.classList.add('story');
    bg.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) onPick(+b.dataset.c); });
  };
  H.actCard = function (act, onOk) {
    const bg = this.card('<div class="st-act"><span>Act ' + act.n + '</span><h2>' + esc(act.title) + '</h2><p class="fine big">' + esc(act.blurb) + '</p></div><div class="menu-btns"><button class="btn primary" data-a="ok">Continue</button></div>');
    bg.classList.add('story');
    bg.addEventListener('click', (e) => { if (e.target.closest('[data-a]')) { this.closeCard(); if (onOk) onOk(); } });
  };

  // the goal panel: tutorial first, then the story's current goal
  const origRender = H.renderExtra;
  H.renderExtra = function (game) {
    origRender.call(this, game);
    const tu = game.sys.tutorial, st = game.sys.story, el = this.$('hTut');
    if (!el || !st || !st.on) return;
    const step = tu && tu.current();
    if (step && step.id !== 'goal') return;   // the tutorial still has the panel
    const a = st.actInfo(), goals = st.goals();
    const html = '<div class="tut-top"><span>Act ' + a.n + ' · ' + esc(a.title) + '</span><button data-story>Story</button></div>' +
      goals.map((x) => '<div class="st-goal' + (x.done ? ' done' : '') + '">' + H.icon(x.done ? 'circle-check' : 'circle', 'sm') + '<span>' + esc(x.text) + '</span></div>').join('');
    if (el._h !== html) { el._h = html; el.innerHTML = html; }
    el.hidden = false;
    if (!el._storyBound) { el._storyBound = true; el.addEventListener('click', (e) => { if (e.target.closest('[data-story]') && g.__world) { BH.Phone.tab = 'story'; g.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' })); } }); }
  };

  // the phone's Story page
  BH.StoryView = {
    html(game) {
      const st = game.sys.story; if (!st) return '';
      const a = st.actInfo(), p = st.path, tot = Math.max(1, p.builder + p.degen + p.villain);
      const bar = (k, label, col) => '<div class="st-path"><span>' + label + '</span><div class="bar"><i style="width:' + Math.round(p[k] / tot * 100) + '%;background:' + col + '"></i></div><b>' + p[k] + '</b></div>';
      const mine = st.netUsd(), kai = st.kai.usd;
      return '<div class="ph-h">Story</div>' +
        '<div class="st-box"><small>Act ' + a.n + ' of ' + BH.Story.ACTS.length + '</small><b>' + esc(a.title) + '</b><p>' + esc(a.blurb) + '</p>' +
        st.goals().map((x) => '<div class="st-goal' + (x.done ? ' done' : '') + '">' + H.icon(x.done ? 'circle-check' : 'circle', 'sm') + '<span>' + esc(x.text) + '</span></div>').join('') + '</div>' +
        '<div class="st-box"><small>Who you are becoming</small>' + bar('builder', 'Builder', '#2bd67b') + bar('degen', 'Degen', '#f4b23e') + bar('villain', 'Villain', '#ff4d5e') + '</div>' +
        '<div class="st-box"><small>The race to $1M</small><div class="kv"><span>You</span><b>' + usd(mine) + '</b></div><div class="kv"><span>Kai Rush</span><b class="' + (kai > mine ? 'down' : 'up') + '">' + usd(kai) + '</b></div></div>' +
        '<div class="st-box"><small>People</small>' + Object.entries(BH.Story.CAST).map(([id, c]) => { const r = st.rel[id] || 0; return '<div class="st-person">' + face(id) + '<div><b>' + esc(c.name) + '</b><span>' + esc(c.role) + '</span></div><em class="' + (r > 0 ? 'up' : r < 0 ? 'down' : 'dim') + '">' + (r > 0 ? '+' : '') + r + '</em></div>'; }).join('') + '</div>' +
        '<div class="st-box"><small>Journal</small>' + (st.log.length ? st.log.slice(0, 12).map((l) => '<div class="st-log"><b>Day ' + l.day + ' · ' + esc(BH.Story.CAST[l.who].name) + '</b><span>You: ' + esc(l.choice) + '</span><em>' + esc(l.reply) + '</em></div>').join('') : '<span class="dim">Nothing yet. Someone will knock soon.</span>') + '</div>';
    },
  };
})(window);
