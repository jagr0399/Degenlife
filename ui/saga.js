/* Saga UI: the game-over card (evicted / banned / broke → a new save), and on the phone's Story page the Ghost case
   (suspects, clues), the set pieces and your titles. Loaded after ui/story.js. */
(function (g) {
  'use strict';
  const BH = g.BH, H = BH.HUD; if (!H || !BH.Story) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const usd = (n) => '$' + Math.round(n).toLocaleString();
  const ICON = { evicted: 'door-closed', banned: 'ban', broke: 'wallet' };

  H.gameOverCard = function (o, onPick) {
    const bg = this.card('<div class="go-wrap"><div class="go-ico">' + H.icon(ICON[o.why] || 'skull') + '</div><span class="go-k">Game over</span><h2>' + esc(o.title) + '</h2>' +
      '<p class="fine big">' + esc(o.text) + '</p>' +
      '<div class="go-stats"><div><small>Day</small><b>' + o.day + '</b></div><div><small>Net worth</small><b>' + usd(o.net) + '</b></div><div><small>Story</small><b>Act ' + o.act + '</b></div><div><small>Clues</small><b>' + (o.clues || 0) + '</b></div></div>' +
      (o.titles && o.titles.length ? '<p class="fine">Titles: ' + o.titles.map(esc).join(', ') + '</p>' : '') +
      '<p class="fine dim">This save is finished. Start a new life to keep playing.</p></div>' +
      '<div class="menu-btns"><button class="btn primary" data-go="new">' + H.icon('rotate-ccw', 'sm') + 'Start a new life</button><button class="btn" data-go="menu">Main menu</button></div>');
    bg.classList.add('story', 'gameover');
    bg.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) { this.closeCard(); onPick(b.dataset.go); } });
  };

  // the Story page: add the Ghost case, the set pieces and titles under the act box
  const V = BH.StoryView; if (!V) return;
  const origHtml = V.html;
  V.html = function (game) {
    let out = origHtml.call(this, game);
    const st = game.sys.story, s = st && st.saga; if (!s) return out;
    const S = BH.Story, cast = S.CAST;
    const counts = {}; for (const c of s.clues) counts[c.about] = (counts[c.about] || 0) + 1;
    const ghost = '<div class="st-box sg-ghost"><small>👻 The Ghost case</small>' +
      (st.flags.ghostCaught ? '<p><b>Solved:</b> it was ' + esc(cast[s.culprit].name) + '.</p>' : '<p class="dim">Trade 👻 Ghost coins and play the set pieces to find clues. Some clues are red herrings: the Ghost is whoever the most clues point to.</p>') +
      '<div class="sg-sus">' + S.SUSPECTS.map((id) => '<div class="sg-s' + (s.accused.includes(id) && id !== s.culprit ? ' cleared' : '') + '"><span class="st-face" style="--c:' + cast[id].color + '">' + H.icon(cast[id].icon, 'sm') + '</span><b>' + esc(cast[id].name) + '</b><em>' + (counts[id] || 0) + '</em></div>').join('') + '</div>' +
      (s.clues.length ? s.clues.slice().reverse().map((c) => '<div class="sg-clue"><b>Day ' + c.day + '</b> ' + esc(c.text) + (c.src ? ' <span class="dim">(' + esc(c.src) + ')</span>' : '') + '</div>').join('') : '<span class="dim">No clues yet.</span>') + '</div>';
    const sp = '<div class="st-box"><small>★ Set pieces</small>' + S.SET_ORDER.map((id) => {
      const d = S.SET[id], r = s.sp[id], act = s.active && s.active.id === id;
      const tag = act ? '<em class="up">now</em>' : r === 'won' ? '<em class="up">won</em>' : r === 'lost' ? '<em class="down">failed</em>' : r === 'skipped' ? '<em class="dim">missed</em>' : '<em class="dim">act ' + d.act + '</em>';
      return '<div class="kv"><span>' + esc(d.title) + '</span>' + tag + '</div>';
    }).join('') + '</div>';
    const titles = '<div class="st-box"><small>Titles</small>' + (s.titles.length ? '<div class="sg-titles">' + s.titles.map((t) => '<span>' + esc(t) + '</span>').join('') + '</div>' : '<span class="dim">Win set pieces to earn titles.</span>') + '</div>';
    // after the first box (the act)
    const i = out.indexOf('<div class="st-box"><small>Who you are becoming');
    return i > 0 ? out.slice(0, i) + ghost + sp + titles + out.slice(i) : out + ghost + sp + titles;
  };

  const css = document.createElement('style');
  css.textContent = '.gameover .card{max-width:520px}.go-wrap{text-align:center}.go-wrap .go-k{display:block}.go-wrap h2{font-size:30px;margin:2px 0 8px;color:#ff4d5e}.go-k{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted,#8b93a1)}' +
    '.go-ico{display:flex;margin-left:auto;margin-right:auto;width:54px;height:54px;border-radius:50%;align-items:center;justify-content:center;background:rgba(255,77,94,.12);color:#ff4d5e;margin-bottom:6px}.go-ico svg{width:28px;height:28px}' +
    '.go-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.go-stats div{background:rgba(255,255,255,.04);border-radius:8px;padding:8px}.go-stats small{display:block;color:var(--muted,#8b93a1);font-size:11px}.go-stats b{font-size:16px}' +
    '.sg-sus{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}.sg-s{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:8px;background:rgba(255,255,255,.04)}.sg-s b{flex:1;font-size:12px}.sg-s em{font-style:normal;font-weight:800;color:#f4b23e}.sg-s.cleared{opacity:.45;text-decoration:line-through}' +
    '.sg-clue{font-size:12px;line-height:1.4;margin-top:6px;color:#d6dae1}.sg-clue b{color:#b59cff;margin-right:4px}.sg-titles{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.sg-titles span{padding:3px 8px;border-radius:99px;background:rgba(244,178,62,.14);color:#f4b23e;font-size:12px;font-weight:700}';
  document.head.appendChild(css);
})(window);
