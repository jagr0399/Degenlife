/* HTML for Chirp, Scope, the narrative heat bar, the due-diligence card, news and trophies.
   Pure string builders, so the phone (game page) and the laptop terminal (iframe) share them.
   `base` is the path to assets/ from the calling page. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // -1 = your own uploaded picture (saved with the game as meta.pfpData)
  const custom = () => { const gm = BH.UI && BH.UI.game; return (gm && gm.meta && gm.meta.pfpData) || null; };
  const pfp = (base, i) => (i === -1 && custom() ? custom() : base + 'pfp/p' + String(((i > 0 ? i : 0) % 144) + 1).padStart(2, '0') + '.svg');
  const coinImg = (base, tk) => tk && tk.realImg ? tk.realImg : tk && tk.img != null ? base + 'coins/c' + tk.img + '.jpg' : '';
  const kfmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n));
  const usd = (n) => BH.fmt ? BH.fmt.usd(n) : '$' + kfmt(n);
  const ago = (s) => s < 60 ? Math.max(0, Math.round(s)) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : Math.round(s / 3600) + 'h';
  const goldTick = '<svg class="vf" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f4b23e" d="M12 1l2.6 2.2 3.4-.4.9 3.3 3 1.7-1.2 3.2 1.2 3.2-3 1.7-.9 3.3-3.4-.4L12 23l-2.6-2.2-3.4.4-.9-3.3-3-1.7L3.3 13 2.1 9.8l3-1.7.9-3.3 3.4.4z"/><path d="M7.5 12.2l3 3 6-6.2" stroke="#111" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  const tick = '<svg class="vf" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4aa8ff" d="M12 1l2.6 2.2 3.4-.4.9 3.3 3 1.7-1.2 3.2 1.2 3.2-3 1.7-.9 3.3-3.4-.4L12 23l-2.6-2.2-3.4.4-.9-3.3-3-1.7L3.3 13 2.1 9.8l3-1.7.9-3.3 3.4.4z"/><path d="M7.5 12.2l3 3 6-6.2" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';

  const V = {
    esc, pfp, coinImg, ago,
    heatHTML(game) {
      const s = game.sys.social; if (!s) return '';
      return '<div class="sv-heat">' + s.hottest().map((n) => { const h = Math.round(s.heat[n.id]); return '<div class="sv-hrow' + (s.season === n.id ? ' season' : '') + '"><span>' + esc(n.label) + '</span><i><b style="width:' + h + '%;background:' + (h > 70 ? '#ff7a45' : h > 40 ? '#f4b23e' : '#5d6470') + '"></b></i><em>' + h + (h > 70 ? ' 🔥' : '') + '</em></div>'; }).join('') + '</div>';
    },
    postHTML(game, base, p) {
      const sim = game.sim, tk = p.coin && sim.byId.get(p.coin);
      const chip = tk ? '<button class="sv-coin" data-coin="' + esc(tk.id) + '">' + (tk.img != null ? '<img src="' + coinImg(base, tk) + '">' : '') + '$' + esc(tk.ticker) + ' <b>' + usd(sim.mc(tk)) + '</b> <em class="' + (sim.change(tk, 60) >= 0 ? 'up' : 'down') + '">' + (sim.change(tk, 60) >= 0 ? '+' : '') + sim.change(tk, 60).toFixed(1) + '%</em></button>' : '';
      const ico = (n) => (BH.icon ? BH.icon(n, 'sm') : BH.HUD && BH.HUD.icon ? BH.HUD.icon(n, 'sm') : '');
      const pre = p.repostOf ? '<div class="sv-pre">' + ico('repeat-2') + 'You reposted ' + esc(p.repostHandle || '') + '</div>' : p.replyTo ? '<div class="sv-pre">' + ico('corner-down-right') + 'Replying to ' + esc(p.replyHandle || '') + '</div>' : '';
      const who = p.repostOf ? { name: p.repostName, handle: p.repostHandle } : p;
      const acts = '<div class="sv-acts">' +
        '<button data-rep="' + esc(p.id) + '" title="Reply">' + ico('message-circle') + '<span>' + kfmt(p.replies || 0) + '</span></button>' +
        '<button data-rt="' + esc(p.id) + '" class="' + (p.reposted ? 'on rt' : '') + '" title="Repost">' + ico('repeat-2') + '<span>' + kfmt(p.reposts || 0) + '</span></button>' +
        '<button data-like="' + esc(p.id) + '" class="' + (p.liked ? 'on lk' : '') + '" title="Like">' + ico('heart') + '<span>' + kfmt(p.likes || 0) + '</span></button>' +
        '<span class="sv-views">' + ico('bar-chart-2') + kfmt(p.views || Math.round((p.likes || 0) * 12)) + '</span>' +
        (p.kind && p.kind !== 'chatter' && p.kind !== 'reply' && p.kind !== 'repost' ? '<span class="sv-kind ' + p.kind + '">' + p.kind + '</span>' : '') + '</div>';
      return '<article class="sv-post' + (p.aboutYou ? ' you' : '') + (p.toYou ? ' toyou' : '') + (p.fol ? ' fol' : '') + '">' + (p.fol ? '<span class="sv-folbadge">Following</span>' : '') + '<img class="sv-pfp" src="' + pfp(base, p.pfp) + '"><div class="sv-body">' + pre + '<div class="sv-head"><b>' + esc(who.name || p.name) + '</b>' + (p.gold ? goldTick : p.verified ? tick : '') + '<span>' + esc(who.handle || p.handle) + ' · ' + ago(sim.t - p.t) + '</span></div>' +
        '<div class="sv-text">' + esc(p.text) + '</div>' + (tk && tk.img != null && (p.kind === 'call' || p.kind === 'launch' || p.celeb || p.media) ? '<button class="sv-media" data-coin="' + esc(tk.id) + '"><img src="' + coinImg(base, tk) + '" loading="lazy"><span>$' + esc(tk.ticker) + ' · ' + esc(tk.name) + '</span></button>' : '') + (p.quote ? '<div class="sv-quote"><div class="sv-head"><img class="sv-qpfp" src="' + pfp(base, p.quote.pfp) + '"><b>' + esc(p.quote.name) + '</b>' + (p.quote.gold ? goldTick : '') + '<span>' + esc(p.quote.handle) + '</span></div><div class="sv-text">' + esc(p.quote.text) + '</div></div>' : '') + chip + acts + '<div class="sv-replybox" data-box="' + esc(p.id) + '" hidden><input placeholder="Post your reply" maxlength="280"><button data-send="' + esc(p.id) + '">Reply</button></div></div></article>';
    },
    // likes / reposts / replies on any rendered feed; returns true when it handled the click
    feedClick(game, e, rerender) {
      const s = game.sys.social; if (!s) return false;
      const lk = e.target.closest('[data-like]'); if (lk) { s.like(lk.dataset.like); rerender(); return true; }
      const rt = e.target.closest('[data-rt]'); if (rt) { s.repost(rt.dataset.rt); rerender(); return true; }
      const rp = e.target.closest('[data-rep]'); if (rp) { const box = e.target.closest('.sv-post').querySelector('[data-box]'); box.hidden = !box.hidden; if (!box.hidden) box.querySelector('input').focus(); return true; }
      const sd = e.target.closest('[data-send]'); if (sd) { const inp = sd.parentNode.querySelector('input'); const r = s.reply(sd.dataset.send, inp.value); if (r.ok) { inp.value = ''; rerender(); } return true; }
      return false;
    },
    chirpHTML(game, base, limit, filter) {
      const s = game.sys.social; if (!s) return '';
      const list = filter ? s.posts.filter(filter) : s.posts;
      return list.slice(-(limit || 40)).reverse().map((p) => V.postHTML(game, base, p)).join('');
    },
    // "What's happening": the hottest narratives as trends, with how many posts mention them lately
    trendsHTML(game) {
      const s = game.sys.social; if (!s) return '';
      const recent = s.posts.slice(-200), sim = game.sim;
      return s.hottest().slice(0, 6).map((n, i) => { const words = n.words.map((w) => w.toLowerCase()), cnt = recent.filter((p) => { const tk = p.coin && sim.byId.get(p.coin); return (tk && tk.narrative === n.id) || p.nar === n.id || words.some((w) => String(p.text).toLowerCase().includes(w)); }).length;
        return '<div class="sv-trend"><span class="dim">' + (i + 1) + ' · Trending in Crypto</span><b>#' + esc(n.label.split(' ').join('')) + '</b><span class="dim">' + kfmt(cnt * 137 + Math.round(s.heat[n.id] * 40)) + ' posts</span></div>'; }).join('');
    },
    // who to follow: celebrities and the KOLs with the best record
    whoHTML(game, base) {
      const s = game.sys.social; if (!s) return '';
      const fol = s.following || {};
      const allC = (BH.Celebs ? BH.Celebs.CELEBS : []).map((c) => ({ name: c.name, handle: c.handle, pfp: c.pfp, gold: true, followers: c.followers }));
      const allK = s.kols.slice().sort((a, b) => (b.hits || 0) - (a.hits || 0) || b.followers - a.followers);
      const allR = (BH.Rivals ? BH.Rivals.RIVALS : []).map((r) => ({ name: r.name, handle: r.handle, pfp: r.pfp, verified: true, followers: 20000 + r.pfp * 600 }));
      // rotate: a new set every 2 game minutes, people you already follow drop out (they're in your Following tab)
      const rot = Math.floor((game.sim ? game.sim.t : 0) / 120), take = (arr, n) => { const free = arr.filter((a) => !fol[a.handle]); const out = []; for (let i = 0; i < Math.min(n, free.length); i++) out.push(free[(rot * n + i) % free.length]); return out; };
      const picks = take(allC, 3).concat(take(allK, 2), take(allR, 1));
      const nFol = Object.values(fol).filter(Boolean).length;
      return (nFol ? '<div class="dim sv-folcount">You follow ' + nFol + ' account' + (nFol > 1 ? 's' : '') + '. Their posts are highlighted.</div>' : '') + picks.map((a) => '<div class="sv-who"><img class="sv-pfp" src="' + pfp(base, a.pfp) + '"><div><b>' + esc(a.name) + '</b>' + (a.gold ? goldTick : a.verified ? tick : '') + '<span class="dim">' + esc(a.handle) + ' · ' + kfmt(a.followers) + '</span></div><button class="btn sm' + (fol[a.handle] ? '' : ' primary') + '" data-follow="' + esc(a.handle) + '">' + (fol[a.handle] ? 'Following' : 'Follow') + '</button></div>').join('');
    },
    scopeHTML(game, base, limit) {
      const s = game.sys.social; if (!s) return '';
      const rows = s.scope(limit || 40);
      if (!rows.length) return '<div class="sv-empty">No coin mentions yet. Give it a minute.</div>';
      return '<table class="sv-scope"><thead><tr><th>Tier</th><th class="l">Account</th><th class="l">Coin</th><th>Hit rate</th><th>MC at post</th><th>Since</th><th>Age</th></tr></thead><tbody>' + rows.map((r) => {
        const tk = game.sim.byId.get(r.post.coin);
        return '<tr data-coin="' + esc(r.post.coin) + '" class="' + (r.alive ? '' : 'dead') + '"><td><span class="tier ' + r.tier + '">' + r.tier + '</span></td><td class="l"><img class="sv-mini" src="' + pfp(base, r.post.pfp) + '">' + esc(r.post.handle) + '</td><td class="l">' + (tk && tk.img != null ? '<img class="sv-mini sq" src="' + coinImg(base, tk) + '">' : '') + '$' + esc(tk ? tk.ticker : '?') + '</td><td>' + Math.round(r.hitRate * 100) + '%</td><td>' + usd(r.mcAt) + '</td><td class="' + (r.change >= 0 ? 'up' : 'down') + '">' + (r.change >= 0 ? '+' : '') + r.change.toFixed(0) + '%</td><td>' + ago(game.sim.t - r.post.t) + '</td></tr>';
      }).join('') + '</tbody></table>';
    },
    ddHTML(game, base, tk) {
      if (!tk || !tk.dd) return '<div class="sv-dd"><div class="sv-text">No info posted for this coin. That is a red flag too.</div></div>';
      const a = tk.dd.acc;
      return '<div class="sv-dd"><div class="sv-ddhead"><img class="sv-pfp lg" src="' + pfp(base, a.pfp) + '"><div><b>' + esc(a.name) + '</b>' + (a.verified ? tick : '') + '<span>' + esc(a.handle) + '</span></div><em>' + ago(game.sim.t - tk.dd.t) + '</em></div>' +
        '<div class="sv-ddmeta"><span>Joined ' + esc(a.joined) + '</span><b>' + kfmt(a.followers) + ' followers</b></div><div class="sv-text big">' + esc(tk.dd.text).replace(/\n/g, '<br>') + '</div>' +
        '<div class="sv-ddfoot">' + (tk.narrative && game.sys.social ? 'Narrative: <b>' + esc(game.sys.social.label(tk.narrative)) + '</b> · heat ' + Math.round(game.sys.social.heat[tk.narrative]) : '') + '</div></div>';
    },
    walletToastHTML(game, base, ev) {
      const sim = game.sim, tk = sim.byId.get(ev.coin), age = ago(sim.t - ev.born);
      const what = ev.side === 'buy' ? '<span class="up">bought</span>' : '<span class="down">' + (ev.soldAll ? 'sold all' : 'sold') + '</span>';
      return '<div class="wt-l"><img src="' + (tk ? coinImg(base, tk) : '') + '"><span class="wt-age">' + age + '</span></div><div class="wt-m"><div class="wt-1"><span class="wt-emo">' + esc(ev.emoji) + '</span><b>' + esc(ev.name) + '</b> ' + what + ' <b>' + esc(ev.ticker) + '</b></div><div class="wt-2"><b class="' + (ev.side === 'buy' ? 'up' : 'down') + '">' + ev.sol.toFixed(3) + ' SOL</b> at ' + usd(ev.mc) + ' MC</div></div><span class="wt-bell">🔔</span><button class="wt-x" data-x>✕</button>';
    },
    walletRowHTML(game, base, ev) {
      const sim = game.sim, tk = sim.byId.get(ev.coin);
      return '<div class="trw" data-coin="' + esc(ev.coin) + '"><span class="emo">' + esc(ev.emoji) + '</span>' + (tk ? '<img class="cimg" src="' + coinImg(base, tk) + '">' : '') + '<div><b>' + esc(ev.name) + '</b> <span class="' + (ev.side === 'buy' ? 'up' : 'down') + '">' + (ev.side === 'buy' ? 'bought' : ev.soldAll ? 'sold all' : 'sold') + '</span> $' + esc(ev.ticker) + '<span class="dim">' + ev.sol.toFixed(3) + ' SOL at ' + usd(ev.mc) + ' · ' + ago(sim.t - ev.t) + ' ago</span></div></div>';
    },
    newsHTML(game) {
      const w = game.sys.world; if (!w || !w.news.length) return '<div class="sv-empty">Quiet day. No news yet.</div>';
      return w.news.map((n) => '<div class="sv-news"><span>Day ' + n.day + ' · ' + String(n.hour).padStart(2, '0') + ':00</span>' + esc(n.text) + '</div>').join('');
    },
    trophiesHTML(game) {
      const w = game.sys.world; if (!w) return '';
      return '<div class="sv-ach">' + BH.World.ACH.map(([id, t, d]) => '<div class="' + (w.ach[id] ? 'got' : '') + '"><b>' + (w.ach[id] ? '🏆 ' : '🔒 ') + esc(t) + '</b><span>' + esc(d) + (w.ach[id] ? ' · day ' + w.ach[id] : '') + '</span></div>').join('') + '</div>';
    },
  };
  BH.SocialView = V;
})(typeof window !== 'undefined' ? window : globalThis);
