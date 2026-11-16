/* J7 panel: the tweet tracker docked beside the terminal (left or right), our take on TX Gym's feed.
   J7 is the one feed (Nov 16): the old Chirp timeline is merged in (celebrity tweets, KOL calls, your posts), every post can be
   liked, reposted and replied to, and the Post box posts or calls the coin you have open. The J7 app page uses the same cards.
   - Tweets from movers, KOLs, alert bots and noise accounts (game/j7.js), newest first. The meme name glows pink.
   - Meme tweets list the coins launched off them, live: ticker, launchpad, Dividends, market cap, age, with a ⚡ quick-buy each.
     Spot the right one (best ticker, Pump, Dividends) before it runs.
   - ⚡ DEPLOY on a meme tweet opens Token Deploy prefilled with the name, a guessed symbol and the meme picture.
     Land the right setup before the bots and the snipers buy yours.
   - Hovering the feed pauses it. Settings: side, pace (Chill / Mix / TX), real or parody names, noise, ping sound.
   Settings are per-viewer conveniences (localStorage). Loaded after deploy.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, icon = BH.icon, esc = BH.esc, F = BH.fmt;
  const $ = (s, el) => (el || document).querySelector(s);
  const KEY = 'degen.j7ui';
  const pref = Object.assign({ on: true, side: 'left', width: 360, ping: true }, (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })());
  const savePref = () => { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) { /* storage blocked: fine */ } };
  const sys = () => UI.game && UI.game.sys && UI.game.sys.j7;
  const pfp = (n) => '../assets/pfp/p' + String((Math.abs(n) % 144) + 1).padStart(2, '0') + '.svg';
  const ago = (s) => (s < 60 ? Math.max(0, Math.floor(s)) + 's' : s < 3600 ? Math.floor(s / 60) + 'm' : Math.floor(s / 3600) + 'h');
  const fol = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));

  let root, feed, hover = false, lastSeq = 0, missed = 0, lastPingT = 0;
  const openReply = new Set();
  const keyOf = (it) => (it.tw ? 'j7:' + it.tw.acc : 'h:' + String((it.p && it.p.handle) || '').toLowerCase());
  const handleOf = (it) => { if (it.tw) { const j = sys(), a = j && j.acc(it.tw.acc); return a ? a.handle : '@?'; } return (it.p && it.p.handle) || '@?'; };
  const AL = () => BH.J7Alerts;
  const more = (k, h) => '<button class="j7-more" data-jmenu="' + esc(k) + '" data-jh="' + esc(h) + '" title="Alerts, filter, pin">' + icon('more-vertical', 'sm') + '</button>';
  const hl = (k) => { const d = AL() && AL().deco(k); return d && d.color ? ' style="--hl:' + esc(d.color) + '"' : ''; };
  const hlc = (k) => { const d = AL() && AL().deco(k); return (d && d.color ? ' hl' : '') + (d && d.sound ? ' snd' : ''); };
  const soc = () => UI.game && UI.game.sys && UI.game.sys.social;
  const kf = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n || 0)));

  function build() {
    root = document.createElement('aside');
    root.id = 'j7';
    root.innerHTML = '<div class="j7-head"><b>J7</b><span class="j7-sim">SIM</span><span class="j7-live"><i></i>Live</span><span class="spacer"></span>' +
      '<button class="j7-btn" data-j="pace" title="How often big accounts tweet a meme"></button>' +
      '<button class="j7-btn" data-j="names" title="Real names or parody names"></button>' +
      '<button class="j7-ic" data-j="ping" title="Ping sound when a big account tweets a meme"></button>' +
      '<button class="j7-ic" data-j="side" title="Move the feed to the other side">' + icon('arrow-left-right', 'sm') + '</button>' +
      '<button class="j7-ic" data-j="hide" title="Hide J7 (the J7 button in the bottom bar brings it back)">' + icon('x', 'sm') + '</button></div>' +
      '<div class="j7-noise"><span>Noise</span><input type="range" min="0" max="3" step="0.5" id="j7Noise"><span class="dim" id="j7NoiseV"></span><button class="j7-btn" data-j="filtered" id="j7Filt" title="Accounts you filtered out">Filtered</button></div>' +
      '<div class="j7-compose"><input id="j7Txt" maxlength="280" placeholder="Post to your followers…"><button class="j7-btn" data-j="post" title="Post (Enter)">Post</button><button class="j7-btn" data-j="call" title="Call the coin you have open to your followers">Call</button><button class="j7-btn flex" data-j="flex" title="Flex your PnL: the coin you have open, or your last closed trade">Flex</button></div>' +
      '<div class="j7-new" id="j7New" hidden></div><div class="j7-feed" id="j7Feed"></div>';
    document.body.appendChild(root);
    feed = $('#j7Feed', root);
    root.addEventListener('mouseenter', () => { hover = true; });
    root.addEventListener('mouseleave', () => { hover = false; render(true); });
    root.addEventListener('click', onClick);
    root.addEventListener('contextmenu', ctxMenu);
    $('#j7Txt', root).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); compose(false); } e.stopPropagation(); });
    $('#j7Noise', root).addEventListener('input', (e) => { const j = sys(); if (j) { j.noise = +e.target.value; head(); } });
    // bottom-bar toggle
    const foot = document.querySelector('footer.foot');
    if (foot && !document.getElementById('j7Toggle')) {
      const b = document.createElement('button'); b.id = 'j7Toggle'; b.className = 'j7-toggle'; b.textContent = 'J7';
      b.title = 'Show or hide the J7 tweet feed'; b.onclick = () => { pref.on = !pref.on; savePref(); layout(); };
      foot.insertBefore(b, foot.firstChild);
    }
    layout(); head();
  }

  function layout() {
    document.body.classList.toggle('j7on', !!pref.on);
    document.body.classList.toggle('j7-right', pref.side === 'right');
    document.body.style.setProperty('--j7w', pref.width + 'px');
    if (root) root.hidden = !pref.on;
    const t = document.getElementById('j7Toggle'); if (t) t.classList.toggle('on', !!pref.on);
    // the chart canvas sizes itself to its box: tell it the box changed
    setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  }

  function head() {
    const j = sys(); if (!j || !root) return;
    $('[data-j="pace"]', root).textContent = ({ chill: 'Chill', mix: 'Mix', tx: 'TX' })[j.pace] || 'Mix';
    $('[data-j="names"]', root).textContent = j.real ? 'Real' : 'Parody';
    $('[data-j="ping"]', root).innerHTML = icon(pref.ping ? 'bell-ring' : 'bell-off', 'sm');
    const fc = AL() ? AL().hiddenCount() : 0; $('#j7Filt', root).textContent = fc ? 'Filtered ' + fc : 'Filtered';
    $('#j7Noise', root).value = j.noise; $('#j7NoiseV', root).textContent = j.noise ? '×' + j.noise : 'off';
  }

  function flexSubject() {
    const gm = UI.game, pl = gm.player, id = UI.view === 'token' && UI.tokenId, pos = id && pl.pos.get(id), tk = id && gm.sim.byId.get(id);
    if (pos && tk && UI.posStats) { const S = UI.posStats(pos); if (S.invested > 0) return { ticker: tk.ticker, coin: tk.id, pnl: S.total, invested: S.invested, mult: (S.invested + S.total) / S.invested, open: true }; }
    const c = pl.closed && pl.closed[0];
    return c ? { ticker: c.ticker, coin: c.id, pnl: c.pnl, invested: c.invested, mult: c.mult, open: false } : null;
  }
  function flex() {
    const s = soc(), inp = $('#j7Txt', root); if (!s || !s.flex) return;
    const r = s.flex(flexSubject(), inp ? inp.value : '');
    UI.toast(r.ok ? 'info' : 'fail', r.ok ? r.text : r.reason);
    if (r.ok && inp) { inp.value = ''; render(true); }
  }
  function compose(call) {
    const s = soc(), inp = $('#j7Txt', root); if (!s || !inp) return;
    const coin = call ? (UI.view === 'token' && UI.tokenId) : null;
    if (call && !coin) { UI.toast('fail', 'Open a coin first, then press Call'); return; }
    const r = s.compose(inp.value, coin || null);
    UI.toast(r.ok ? 'info' : 'fail', r.ok ? r.text : r.reason);
    if (r.ok) { inp.value = ''; render(true); }
  }
  // like, repost and reply: the same on the panel and on the J7 app page. Returns true when it handled the click.
  function social(e, after) {
    const m = e.target.closest('[data-jmenu]'); if (m) { e.stopPropagation(); if (AL()) AL().menu(m, m.dataset.jmenu, m.dataset.jh); return true; }
    const s = soc(); if (!s) return false;
    const lk = e.target.closest('[data-jlike]'); if (lk) { s.like(lk.dataset.jlike); after(); return true; }
    const rt = e.target.closest('[data-jrt]'); if (rt) { s.repost(rt.dataset.jrt); after(); return true; }
    const rp = e.target.closest('[data-jrep]'); if (rp) { const id = rp.dataset.jrep; if (openReply.has(id)) openReply.delete(id); else openReply.add(id); after(); const i = document.querySelector('[data-rbox="' + id + '"] input'); if (i) i.focus(); return true; }
    const sd = e.target.closest('[data-jsend]'); if (sd) { const inp = sd.parentNode.querySelector('input'); const r = s.reply(sd.dataset.jsend, inp.value); UI.toast(r.ok ? 'info' : 'fail', r.ok ? r.text : r.reason); if (r.ok) { openReply.delete(sd.dataset.jsend); inp.value = ''; inp.blur(); after(); } return true; }
    return false;
  }
  // right-click a post: the same menu as ⋮, at the mouse, with Track wallet
  function ctxMenu(e) {
    const art = e.target.closest('.j7-tw'), m = art && art.querySelector('[data-jmenu]');
    if (!m || !AL()) return;
    e.preventDefault(); e.stopPropagation();
    AL().menu(m, m.dataset.jmenu, m.dataset.jh, { x: e.clientX, y: e.clientY });
  }
  document.addEventListener('contextmenu', (e) => { if (!root || root.contains(e.target)) return; if (e.target.closest('.j7page .j7-tw')) ctxMenu(e); }, true);
  function onClick(e) {
    if (social(e, () => render(true))) return;
    if (e.target.closest('input')) return;
    const j = sys(); if (!j) return;
    const b = e.target.closest('[data-j]');
    if (b) {
      const a = b.dataset.j;
      if (a === 'pace') { j.pace = j.pace === 'chill' ? 'mix' : j.pace === 'mix' ? 'tx' : 'chill'; j.next = Math.min(j.next, UI.game.sim.t + (j.pace === 'tx' ? 8 : 30)); UI.toast('info', 'J7 pace: ' + ({ chill: 'Chill (a big meme tweet every 5-12 min)', mix: 'Mix (every 1.5-4 min)', tx: 'TX (every 30-60 s)' })[j.pace]); }
      if (a === 'names') { if (j.setReal) j.setReal(!j.real); else j.real = !j.real; }
      if (a === 'ping') { pref.ping = !pref.ping; savePref(); }
      if (a === 'side') { pref.side = pref.side === 'right' ? 'left' : 'right'; savePref(); layout(); }
      if (a === 'hide') { pref.on = false; savePref(); layout(); }
      if (a === 'post' || a === 'call') { compose(a === 'call'); return; }
      if (a === 'flex') { flex(); return; }
      if (a === 'filtered') { if (AL()) AL().filtered(b); return; }
      head(); render(true); return;
    }
    const buy = e.target.closest('[data-buy]');
    if (buy) { e.stopPropagation(); UI.trade('buy', UI.settings.quick, buy.dataset.buy); return; }
    const dep = e.target.closest('[data-deploy]');
    if (dep) {
      const tw = j.tweets.find((x) => x.id === dep.dataset.deploy); if (!tw) return;
      if (!devDesk()) { UI.toast('fail', 'Deploying coins needs the Deployer license: buy it in the Shop ($250, works right away)'); return; }
      // auto-gen symbol: usually right, sometimes a guess (like TX Gym's AUTO-GEN)
      const best = tw.meme.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10), r = Math.random();
      const guess = r < 0.75 ? best : r < 0.88 ? 'THE' + best : best.slice(0, Math.max(3, best.length - 1));
      UI.deployForm = Object.assign(UI.deployForm || {}, { name: tw.meme, ticker: guess, auto: false, img: Math.abs(hashStr(tw.meme)) % 200, realImg: null });
      UI.go('launch');
      return;
    }
    const coin = e.target.closest('[data-coin]');
    if (coin && UI.game.sim.byId.get(coin.dataset.coin)) UI.openToken(coin.dataset.coin);
    const nw = e.target.closest('#j7New'); if (nw) { hover = false; render(true); }
  }
  function hashStr(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }

  function text(tw) {
    let t = esc(tw.text);
    if (tw.meme) t = t.split(esc(tw.meme)).join('<mark>' + esc(tw.meme) + '</mark>');
    return t.replace(/\$([A-Za-z0-9]{2,12})/g, '<b class="j7-tk">$$$1</b>');
  }
  function coinRows(j, tw, live) {
    const sim = UI.game.sim, all = j.coinsOf(tw), list = all.slice(0, 7), pads = BH.PADS || [];
    // realistic (playtester, Nov 16): a tweet doesn't list the coins made off it. You find them yourself on Pulse / search.
    // Only your own coin off this tweet is noted.
    if (!BH.J7_SHOW_COINS) { const mine = all.find((tk) => tk.isPlayer); return mine ? '<div class="j7-coins j7-sum" data-coin="' + mine.id + '">Your coin off this tweet: <b>$' + esc(mine.ticker) + '</b> ' + (mine.dead ? 'dead' : F.usd(sim.mc(mine))) + (tw.won ? ' · <b class="up">you won the race</b>' : '') + '</div>' : ''; }
    // an old race: one quiet summary line, no buy buttons (J7 is a feed, not a wall of tickers)
    if (!live && list.length) { const top = list[0]; return '<div class="j7-coins j7-sum" data-coin="' + top.id + '">' + all.length + ' coins off this tweet · top <b>$' + esc(top.ticker) + '</b> ' + (top.dead ? 'dead' : F.usd(sim.mc(top))) + (tw.won ? ' · <b class="up">you won</b>' : '') + '</div>'; }
    if (!list.length) return '<div class="j7-coins dim">' + (sim.t - tw.t < 20 ? 'bots are deploying…' : 'no coins on it') + '</div>';
    return '<div class="j7-coins"><div class="j7-ch"><span>' + (tw.coins || []).length + ' coins off this tweet</span>' + (tw.won ? '<b class="up">you won the race</b>' : '') + '</div>' + list.map((tk) => {
      const pad = pads.find((p) => p.id === tk.lp) || { color: '#888', short: '?', name: '?' }, mc = sim.mc(tk), ch = sim.change ? sim.change(tk, 30) : 0;
      return '<div class="j7-coin' + (tk.dead ? ' dead' : '') + (tk.isPlayer ? ' mine' : '') + '" data-coin="' + tk.id + '" title="' + esc(tk.name) + ' · ' + ago(sim.t - tk.born) + ' old">' +
        '<span class="j7-pad" style="background:' + pad.color + '" title="' + esc(pad.name === 'PumpLab' ? 'Pump' : pad.name) + '">' + esc(pad.short) + '</span>' +
        '<b>$' + esc(tk.ticker) + '</b>' + (tk.rewards === 'holders' ? '<span class="j7-div" title="Dividends on">DIV</span>' : '') + (tk.isPlayer ? '<span class="j7-div you">YOU</span>' : '') +
        '<span class="spacer"></span>' +
        '<span class="j7-mc ' + (ch >= 0 ? 'up' : 'down') + '">' + (tk.dead ? 'dead' : F.usd(mc)) + '</span>' +
        (tk.dead ? '' : '<button class="j7-qb" data-buy="' + tk.id + '" title="Quick buy ' + UI.settings.quick + ' SOL">' + icon('zap', 'sm') + UI.settings.quick + '</button>') + '</div>';
    }).join('') + '</div>';
  }
  function thread(p) {
    const s = soc(), sim = UI.game.sim, mine = s ? s.posts.filter((x) => x.replyTo === p.id).map((x) => ({ name: x.name || 'You', handle: x.handle || '@you', pfp: x.pfp, text: x.text, t: x.t, you: x.acc === 'you' || x.mine })) : [];
    const list = (p.thread || []).concat(mine).sort((a, b) => a.t - b.t);
    if (!list.length) return '<div class="j7-thread empty">No replies yet. Be the first.</div>';
    return '<div class="j7-thread">' + (p.replies > list.length ? '<div class="j7-tmore">' + kf(p.replies) + ' replies · showing ' + list.length + '</div>' : '') + list.map((x) => '<div class="j7-tr' + (x.you ? ' you' : '') + '"><img src="' + esc(x.you && UI.game.meta && UI.game.meta.pfpData ? UI.game.meta.pfpData : pfp(x.pfp == null ? 47 : x.pfp)) + '" alt=""><div><b>' + esc(x.name) + '</b> <span class="dim">' + esc(x.handle) + ' · ' + ago(sim.t - x.t) + '</span><div>' + esc(x.text) + '</div></div></div>').join('') + '</div>';
  }
  function acts(p) {
    if (!p) return '';
    const ic = (n) => icon(n, 'sm');
    return '<div class="j7-acts"><button data-jrep="' + p.id + '" title="Reply">' + ic('message-circle') + kf(p.replies) + '</button>' +
      '<button data-jrt="' + p.id + '" class="' + (p.reposted ? 'on rt' : '') + '" title="Repost">' + ic('repeat-2') + kf(p.reposts) + '</button>' +
      '<button data-jlike="' + p.id + '" class="' + (p.liked ? 'on lk' : '') + '" title="Like">' + ic('heart') + kf(p.likes) + '</button>' +
      '<span>' + ic('bar-chart-2') + kf(p.views || (p.likes || 0) * 12) + '</span></div>' +
      (openReply.has(p.id) ? thread(p) + '<div class="j7-rbox" data-rbox="' + p.id + '"><input maxlength="280" placeholder="Reply to ' + esc(p.handle || '') + '"><button class="j7-btn" data-jsend="' + p.id + '">Reply</button></div>' : '');
  }
  const postOf = (tw) => { const s = soc(); if (!s || !tw.pid) return null; for (let i = s.posts.length - 1; i >= 0; i--) if (s.posts[i].id === tw.pid) return s.posts[i]; return null; };
  // a timeline post that did not come from J7 (celebrity tweets, Chirp KOL calls, your posts, replies to you)
  function pcard(p) {
    const sim = UI.game.sim, tk = p.coin && sim.byId.get(p.coin);
    const pic = p.acc === 'you' && UI.game.meta && UI.game.meta.pfpData ? UI.game.meta.pfpData : pfp(p.pfp == null ? 47 : p.pfp);
    const pre = p.repostOf ? '<div class="j7-pre">' + icon('repeat-2', 'sm') + 'You reposted ' + esc(p.repostHandle || '') + '</div>' : p.replyTo ? '<div class="j7-pre">' + icon('corner-down-right', 'sm') + 'Replying to ' + esc(p.replyHandle || '') + '</div>' : '';
    const who = p.repostOf ? { name: p.repostName, handle: p.repostHandle } : p;
    const k = 'h:' + String(p.handle || '').toLowerCase(), mine = p.mine || p.acc === 'you';
    return '<article' + (mine ? '' : hl(k)) + ' class="j7-tw k-' + esc(p.kind || 'post') + (mine ? ' mine' : hlc(k)) + (p.toYou ? ' toyou' : '') + '">' +
      '<img class="j7-av" src="' + esc(pic) + '" alt="">' +
      '<div class="j7-body">' + pre + '<div class="j7-who"><b>' + esc(who.name || p.name || '') + '</b>' + (p.verified || p.gold ? '<span class="j7-ver">' + icon('badge-check', 'sm') + '</span>' : '') +
      '<span class="dim">' + esc(who.handle || p.handle || '') + (p.followers ? ' · ' + fol(p.followers) : '') + '</span><span class="spacer"></span><span class="dim">' + ago(sim.t - p.t) + '</span>' + (mine ? '' : more(k, p.handle || '')) + '</div>' +
      '<div class="j7-text">' + esc(p.text).replace(/\$([A-Za-z0-9]{2,12})/g, '<b class="j7-tk">$$$1</b>') + '</div>' +
      (p.flex ? '<div class="j7-flex ' + (p.flex.pnl >= 0 ? 'up' : 'down') + '"' + (tk ? ' data-coin="' + tk.id + '"' : '') + '><div class="j7-flex-t"><b>$' + esc(p.flex.ticker) + '</b><span>' + (p.flex.open ? 'open position' : 'closed') + '</span></div><div class="j7-flex-p">' + (p.flex.pnl >= 0 ? '+' : '') + p.flex.pnl.toFixed(2) + ' SOL</div><div class="j7-flex-s">' + (p.flex.pct >= 0 ? '+' : '') + p.flex.pct.toFixed(0) + '% · ' + p.flex.mult.toFixed(2) + 'x · in ' + p.flex.invested.toFixed(2) + ' SOL</div></div>' :
      tk ? '<div class="j7-coin solo" data-coin="' + tk.id + '"><b>$' + esc(tk.ticker) + '</b><span class="spacer"></span><span class="j7-mc">' + (tk.dead ? 'dead' : F.usd(sim.mc(tk))) + '</span></div>' : '') +
      acts(p) + '</div></article>';
  }
  function card(j, tw, live) {
    const acc = j.acc(tw.acc); if (!acc) return '';
    const sim = UI.game.sim;
    const q = tw.quote && j.tweets.find((x) => x.id === tw.quote);
    const qa = q && j.acc(q.acc);
    const k = 'j7:' + tw.acc;
    return '<article' + hl(k) + ' class="j7-tw k-' + (tw.kind || 'noise') + (tw.deleted ? ' deleted' : '') + hlc(k) + '">' +
      '<img class="j7-av" src="' + esc(acc.pfpUrl || pfp(acc.pfp)) + '" alt="" referrerpolicy="no-referrer"' + (acc.pfpUrl ? ' onerror="this.onerror=null;this.src=\'' + pfp(acc.pfp) + '\'"' : '') + '>' +
      '<div class="j7-body"><div class="j7-who"><b>' + esc(acc.name) + '</b>' + (acc.verified ? '<span class="j7-ver" title="Verified">' + icon('badge-check', 'sm') + '</span>' : '') +
      '<span class="dim">' + esc(acc.handle) + ' · ' + fol(acc.followers) + '</span><span class="spacer"></span><span class="dim">' + ago(sim.t - tw.t) + '</span>' + more(k, acc.handle) + '</div>' +
      (tw.deleted ? '<div class="j7-del">' + icon('trash-2', 'sm') + 'deleted</div>' : '') +
      '<div class="j7-text">' + text(tw) + '</div>' +
      (tw.callout && tw.mcAt ? '<div class="j7-callout">' + icon('megaphone', 'sm') + 'CALLOUT · entry ' + F.usd(tw.mcAt) + (tw.coin && UI.game.sim.byId.get(tw.coin) ? ' · now ' + (UI.game.sim.byId.get(tw.coin).dead ? 'dead' : (UI.game.sim.mc(UI.game.sim.byId.get(tw.coin)) / tw.mcAt).toFixed(2) + 'x') : '') + '</div>' : '') +
      (qa ? '<div class="j7-quote"><b>' + esc(qa.name) + '</b> ' + text(q) + '</div>' : '') +
      (tw.kind === 'meme' ? coinRows(j, tw, live) + (live ? '<button class="j7-deploy' + (devDesk() ? '' : ' locked') + '" data-deploy="' + tw.id + '" title="' + (devDesk() ? 'Open Token Deploy with this meme filled in' : 'Deploying needs the Deployer license (Shop, $250)') + '">' + icon(devDesk() ? 'zap' : 'lock', 'sm') + 'DEPLOY ' + esc(tw.meme) + '</button>' : '') : '') +
      (tw.coin && tw.kind !== 'meme' && sim.byId.get(tw.coin) ? (() => { const tk = sim.byId.get(tw.coin); return '<div class="j7-coin solo" data-coin="' + tk.id + '"><b>$' + esc(tk.ticker) + '</b><span class="spacer"></span><span class="j7-mc">' + (tk.dead ? 'dead' : F.usd(sim.mc(tk))) + '</span>' + '</div>'; })() : '') +
      acts(postOf(tw)) +
      '</div></article>';
  }

  function render(force) {
    const j = sys(); if (!j || !root || !pref.on) return;
    const newest = j.tweets.length ? j.tweets[j.tweets.length - 1].id : '';
    const s0 = soc(), seq = j.seq + (s0 ? s0.seq : 0);
    // a big account tweeted a meme: ping
    const lastMeme = j.tweets.slice().reverse().find((x) => x.kind === 'meme');
    if (lastMeme && pref.ping && lastMeme.t > lastPingT) { if (lastPingT && BH.Sound) BH.Sound.play('chirp', { gain: 0.5 }); lastPingT = lastMeme.t; }
    if (hover && !force) { missed += Math.max(0, seq - lastSeq); lastSeq = seq; const n = $('#j7New', root); n.hidden = !missed; n.textContent = missed + ' new · paused while you hover'; updateLive(j); return; }
    missed = 0; lastSeq = seq; $('#j7New', root).hidden = true;
    // the newest meme tweet stays pinned on top for 2 minutes, so the race stays in view
    const sim = UI.game.sim, list = j.tweets.slice(-50).reverse();
    const pin = list.find((x) => x.kind === 'meme' && sim.t - x.t < 120);
    if (feed.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') { updateLive(j); return; }   // don't wipe a reply you're typing
    const html = (pin ? '<div class="j7-pin">' + BH.icon('pin', 'sm') + 'Live race</div>' + card(j, pin, true) : '') + feedHTML(50, pin);
    if (feed._h !== html) { feed._h = html; feed.innerHTML = html; }
    void newest;
  }
  function devDesk() { const b = UI.game && UI.game.sys && UI.game.sys.build; return !b || !!b.effects().devdesk; }
  // the merged feed (J7 tweets + timeline posts), newest first; skip = a tweet already pinned on top
  function items(n) {
    const j = sys(), s = soc(), out = j ? j.tweets.slice(-n).map((tw) => ({ tw, t: tw.t })) : [];
    if (s) for (const p of s.posts.slice(-n * 3)) { if (p.j7) continue; if (p.kind === 'reply' && !p.toYou && !p.aboutYou) continue; out.push({ p, t: p.t }); }
    return out.sort((a, b) => b.t - a.t).slice(0, n);
  }
  function feedHTML(n, skip) {
    const j = sys(), sim = UI.game.sim;
    const al = AL(), list = items(n || 50).filter((x) => x.tw !== skip && !(al && al.deco(keyOf(x)).hide));
    const one = (x) => (x.tw ? card(j, x.tw, x.tw.kind === 'meme' && sim.t - x.tw.t < 120) : pcard(x.p));
    // pinned accounts: their newest post stays on top (one each, up to 3)
    const seen = new Set(), pins = al ? list.filter((x) => { const k = keyOf(x); if (!al.deco(k).pin || seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3) : [];
    return (pins.length ? '<div class="j7-pin">' + icon('pin', 'sm') + 'Pinned</div>' + pins.map(one).join('') + '<div class="j7-pin dim">Latest</div>' : '') + list.filter((x) => !pins.includes(x)).map(one).join('');
  }
  // while paused, still refresh the live coin numbers in place
  function updateLive(j) {
    const sim = UI.game.sim;
    for (const el of feed.querySelectorAll('.j7-coin[data-coin]')) {
      const tk = sim.byId.get(el.dataset.coin), m = el.querySelector('.j7-mc'); if (tk && m) m.textContent = tk.dead ? 'dead' : F.usd(sim.mc(tk));
    }
  }

  function tick() {
    try {
      if (!root && document.querySelector('footer.foot') && sys()) build();
      if (root) render(false);
    } catch (e) { /* the feed is extra: never break the terminal */ }
  }
  // screenshot helper (#...&j7open=1): open the latest race's runner, then show a KOL bubble card
  try {
    const hash = (parent && parent.location && parent.location.hash) || '';
    if (/[#&]j7open=1/.test(hash)) {
      setTimeout(() => { const j = sys(); const tw = j && j.tweets.slice().reverse().find((x) => x.kind === 'meme'); const tk = tw && j.coinsOf(tw).find((t) => t.j7Right); if (tk) UI.openToken(tk.id); }, 1500);
      setTimeout(() => {
        const c = UI.chart; if (!c || !c._bub) return;
        const isKol = (b) => b && (b.kind === 'kol' || Object.values(BH.J7.names).some((a) => a.name === b.name));
        const hit = c._bub.slice().reverse().find((q) => isKol(q.b) || (q.all || []).some(isKol)) || c._bub[c._bub.length - 1];
        if (hit && !isKol(hit.b)) { const k = (hit.all || []).find(isKol); if (k) hit.b = k; }
        if (hit) { c.hover = { x: hit.x, y: hit.y }; c.showTip(hit, { x: hit.x, y: hit.y }); }
      }, 5000);
    }
  } catch (e) { /* not in the game frame */ }
  setInterval(tick, 700);
  setTimeout(tick, 300);
  // the J7 app page reuses the cards and clicks
  BH.J7UI = { pref, layout, render: () => { head(); render(true); }, feedHTML, devDesk, items, keyOf, handleOf, click: (e, after) => { if (social(e, after)) return true; if (!e.target.closest('[data-buy],[data-deploy],[data-coin]') || !sys()) return false; onClick(e); return true; } };
})(window);
