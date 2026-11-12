/* Chirp as a real timeline: you can post (with or without a coin), like, repost and reply; your posts gather likes,
   reposts, views and replies over time based on your followers and trust; notifications list who interacted.
   Extends BH.Social (game/social.js). No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  if (!BH.Social) return;
  const S = BH.Social.prototype;
  const FANS = ['ape_andy', 'mooncat99', 'bagwatcher', 'solsister', 'chartgoblin', 'gm_greg', 'wenlambo_', 'frogmom', 'tinyfish', 'lurker_lou', 'diamondpaw', 'ser_sam', 'pixelpete', 'degenella', 'cope_lord'];
  const REPLY = { good: ['this is the way', 'ser this is alpha', 'say less', 'bookmarked', 'W post', 'you never miss'], bad: ['ratio', 'who asked', 'you said that last time', 'down bad on your last call', 'paid post?'], q: ['entry?', 'thoughts on the dev?', 'still early?', 'what is your exit?', 'source?'] };
  const r = (s) => s.game.sim.r;
  const me = (s) => (s.game.sys.trencher ? s.game.sys.trencher.acc() : { id: 'you', name: 'You', handle: '@you', pfp: (s.game.meta && s.game.meta.pfp != null ? s.game.meta.pfp : 47), followers: 100 });
  const find = (s, id) => s.posts.find((p) => p.id === id);

  const origPost = S.post;
  S.post = function (acc, kind, text, extra) {
    const p = origPost.apply(this, arguments);
    if (kind === 'call' && extra && extra.coin) {
      const tk = this.game.sim.byId.get(extra.coin);
      if (tk) { const c = tk.calls || (tk.calls = []); c.push({ t: this.game.sim.t, mc: this.game.sim.mc(tk), who: acc.id === 'you' ? 'you' : (acc.handle || acc.name || 'caller'), text: String(text || '').slice(0, 140) }); if (c.length > 40) c.shift(); }
    }
    return p;
  };
  S.notes = null;
  S.note = function (text, postId) { this.notes = this.notes || []; this.notes.unshift({ t: this.game.sim.t, text, post: postId, seen: false }); if (this.notes.length > 60) this.notes.length = 60; };

  // ---- your actions ----
  S.compose = function (text, coinId) {
    text = String(text || '').trim().slice(0, 280);
    if (!text) return { ok: false, reason: 'Write something first' };
    const t = this.game.sys.trencher;
    let res;
    if (coinId && t) res = t.call(coinId, text);
    else if (t) res = t.say(text);
    else { this.post(me(this), 'chatter', text, { aboutYou: true }); res = { ok: true }; }
    if (!res.ok) return res;
    const p = this.posts[this.posts.length - 1];
    if (p && p.acc === 'you') { p.likes = 0; p.reposts = 0; p.views = 0; p.replies = 0; p.mine = true; }
    return { ok: true, text: 'Posted to ' + Math.round(me(this).followers).toLocaleString() + ' followers' };
  };
  S.like = function (id) {
    const p = find(this, id); if (!p) return { ok: false };
    p.liked = !p.liked; p.likes = Math.max(0, (p.likes || 0) + (p.liked ? 1 : -1));
    return { ok: true };
  };
  S.repost = function (id) {
    const p = find(this, id); if (!p) return { ok: false };
    p.reposted = !p.reposted; p.reposts = Math.max(0, (p.reposts || 0) + (p.reposted ? 1 : -1));
    if (p.reposted && p.acc !== 'you') {
      const t = this.game.sys.trencher;
      this.post(me(this), 'repost', p.text, { aboutYou: true, repostOf: p.id, repostName: p.name, repostHandle: p.handle, coin: p.coin, mcAt: p.mcAt, mine: true, likes: 0, reposts: 0, views: 0, replies: 0 });
      // reposting a coin call spreads it a little (and puts your name on it)
      const tk = p.coin && this.game.sim.byId.get(p.coin); if (tk && t) tk.hype += 0.05 * t.reach();
    }
    return { ok: true };
  };
  S.reply = function (id, text) {
    const p = find(this, id); text = String(text || '').trim().slice(0, 280);
    if (!p || !text) return { ok: false, reason: 'Write a reply' };
    p.replies = (p.replies || 0) + 1;
    this.post(me(this), 'reply', text, { aboutYou: true, replyTo: p.id, replyHandle: p.handle, mine: true, likes: 0, reposts: 0, views: 0, replies: 0 });
    const t = this.game.sys.trencher; if (t && p.followers > 20000) t.followers += 1 + Math.random() * 4;   // replying to big accounts gets you seen
    return { ok: true, text: 'Replied to ' + p.handle };
  };

  // ---- your posts gather engagement; people reply ----
  const origStep = S.onStep;
  S.onStep = function (dt) {
    const out = origStep.apply(this, arguments);
    const sim = this.game.sim, rr = r(this), t = this.game.sys.trencher;
    const fol = t ? t.followers : 100, trust = t ? t.trust : 50;
    for (let i = this.posts.length - 1; i >= 0 && i >= this.posts.length - 120; i--) {
      const p = this.posts[i];
      if (!p.mine && p.acc !== 'you') { if (p.views == null) p.views = Math.round((p.likes || 0) * (8 + rr() * 10)); continue; }
      const age = sim.t - p.t; if (age > 600) continue;
      const fade = Math.exp(-age / 160), base = fol * (0.4 + trust / 100) * fade * dt;
      const tk = p.coin && sim.byId.get(p.coin), mult = tk && p.mcAt ? sim.mc(tk) / p.mcAt : 1;
      p.views = (p.views || 0) + Math.round(base * 0.05 * (0.5 + rr()));
      const dl = rr() < base * 0.0006 ? 1 + Math.floor(base * 0.0006 * rr()) : 0;
      const drt = rr() < base * 0.00012 ? 1 : 0;
      if (dl) { p.likes = (p.likes || 0) + dl; if (rr() < 0.3) this.note('@' + FANS[rr.int(0, FANS.length - 1)] + ' and ' + Math.max(0, dl - 1) + ' others liked your post', p.id); }
      if (drt) { p.reposts = (p.reposts || 0) + 1; this.note('@' + FANS[rr.int(0, FANS.length - 1)] + ' reposted you', p.id); if (t) t.followers += rr.range(0.5, 3); }
      if (rr() < base * 0.00008 && (p.replies || 0) < 12) {
        const kind = mult >= 1.5 ? 'good' : mult < 0.6 ? 'bad' : ['good', 'bad', 'q'][rr.int(0, 2)];
        const who = FANS[rr.int(0, FANS.length - 1)];
        p.replies = (p.replies || 0) + 1;
        this.post({ id: 'fan_' + who, name: who, handle: '@' + who, pfp: (who.length * 13) % 143, followers: rr.int(80, 4000) }, 'reply', REPLY[kind][rr.int(0, REPLY[kind].length - 1)], { replyTo: p.id, replyHandle: p.handle, toYou: true });
        this.note('@' + who + ' replied to you', p.id);
      }
    }
    return out;
  };
  S.myPosts = function () { return this.posts.filter((p) => p.mine || p.acc === 'you'); };
  S.unseen = function () { return (this.notes || []).filter((n) => !n.seen).length; };
  S.seeNotes = function () { for (const n of this.notes || []) n.seen = true; return { ok: true }; };
})(typeof window !== 'undefined' ? window : globalThis);
