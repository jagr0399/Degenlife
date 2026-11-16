/* Callouts app (replaces the Trencher page; game/callouts.js). Our take on pump.fun's Callouts:
   - Make a callout: pick a coin (the one open, your bags, hot coins), write a short thesis, Call (you hold it) or Buy & Call.
     One callout every 6 game hours; it goes to your followers as a push notification.
   - Feed: every callout (yours and the KOLs'): entry market cap, now, x now, peak x, followers' PnL at 1 h and 4 h.
   - Leaderboard: today / week / all, ranked by followers' profit, with hit rate (2x+), median and best x, and rewards.
   - My calls, Rewards (daily pot history) and Offers (shill offers + copy trading). Loaded after hustle.js (BH.addApp). */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, icon = BH.icon, esc = BH.esc, F = BH.fmt, V = BH.SocialView;
  const $ = (s, el) => (el || document).querySelector(s);
  const game = () => UI.game;
  const setHTML = (el, v) => { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } };
  const toast = (r) => UI.toast(r.ok ? 'info' : 'fail', r.ok ? r.text : r.reason);
  const BASE = '../assets/';
  const ago = (s) => (s < 60 ? Math.max(0, Math.floor(s)) + 's' : s < 3600 ? Math.floor(s / 60) + 'm' : Math.floor(s / 3600) + 'h');
  const xf = (x) => (x >= 100 ? Math.round(x) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + 'x';
  const sol = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(Math.abs(v) >= 10 ? 1 : 2) + ' SOL';
  const kf = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n)));

  function who(c) {
    const gm = game();
    if (!c.npc) { const t = gm.sys.trencher; return { name: 'You', handle: t.handle || '@you', followers: c.notified || t.followers, pic: gm.meta && gm.meta.pfpData ? gm.meta.pfpData : V.pfp(BASE, gm.meta && gm.meta.pfp != null ? gm.meta.pfp : 47), you: true }; }
    const j = gm.sys.j7, a = j && j.acc(c.who);
    return a ? { name: a.name, handle: a.handle, followers: a.followers, pic: a.pfpUrl || V.pfp(BASE, a.pfp), fb: V.pfp(BASE, a.pfp) } : { name: c.who, handle: '@' + c.who, followers: c.notified || 0, pic: V.pfp(BASE, 1) };
  }
  function card(c) {
    const gm = game(), sim = gm.sim, tk = sim.byId.get(c.coin), w = who(c), age = sim.t - c.t;
    const now = c.live ? (tk && !tk.dead ? sim.mc(tk) : 0) : c.now || 0, xNow = now / c.mcAt, maxX = c.peak / c.mcAt;
    const H = BH.Trencher.CALLOUT;
    const pnl = (v, at) => (v != null ? '<b class="' + (v >= 0 ? 'up' : 'down') + '">' + sol(v) + '</b>' : '<span class="dim">in ' + Math.max(1, Math.ceil((at - age) / 60 * 60)) + 'm</span>');
    return '<div class="co-card' + (w.you ? ' you' : '') + (c.live ? ' live' : '') + '">' +
      '<div class="co-top"><img class="co-av" src="' + esc(w.pic) + '" referrerpolicy="no-referrer"' + (w.fb ? ' onerror="this.onerror=null;this.src=\'' + esc(w.fb) + '\'"' : '') + '>' +
        '<div class="co-who"><b>' + esc(w.name) + '</b><span class="dim">' + esc(w.handle) + ' · ' + kf(w.followers) + ' followers</span></div><span class="spacer"></span>' +
        (c.live ? '<span class="co-pill live">' + icon('radio', 'sm') + 'LIVE</span>' : c.hit ? '<span class="co-pill hit">HIT</span>' : '<span class="co-pill">closed</span>') + '<span class="dim">' + ago(age) + '</span></div>' +
      (c.thesis ? '<div class="co-thesis">' + esc(c.thesis) + '</div>' : '') +
      '<div class="co-coin" data-coin="' + esc(c.coin) + '">' + (tk && tk.img != null ? '<img class="co-ci" src="' + V.coinImg(BASE, tk) + '" onerror="this.remove()">' : '') + '<b>$' + esc(c.ticker) + '</b>' +
        '<span class="co-k"><small>Called at</small>' + F.usd(c.mcAt) + '</span><span class="co-k"><small>Now</small>' + (now ? F.usd(now) : 'dead') + '</span>' +
        '<span class="co-k"><small>x now</small><b class="' + (xNow >= 1 ? 'up' : 'down') + '">' + xf(xNow) + '</b></span><span class="co-k"><small>Peak</small><b class="' + (maxX >= 2 ? 'up' : '') + '">' + xf(maxX) + '</b></span></div>' +
      '<div class="co-foot"><span>' + icon('bell', 'sm') + kf(c.notified || 0) + ' notified</span><span>Followers 1h ' + pnl(c.pnl1h, H.H1) + '</span><span>4h ' + pnl(c.pnl4h, H.H4) + '</span>' +
        (c.entryMc && !c.npc ? '<span class="dim">your entry ' + F.usd(c.entryMc) + '</span>' : '') + '</div></div>';
  }

  const page = {
    tab: 'feed', period: 'day', pick: null, buy: 0.5,
    build(el) {
      el.innerHTML = '<div class="xp co"><h1>' + icon('megaphone', 'lg') + 'Callouts <span class="dim">· call coins to your followers, get paid when they profit</span></h1>' +
        '<div id="coStats" class="grid-4"></div>' +
        '<div class="grid-2 co-main"><div class="card co-make"><h2>' + icon('megaphone') + 'Make a callout</h2><div id="coPickWrap"></div>' +
          '<textarea id="coText" class="input" rows="2" maxlength="140" placeholder="Your thesis (optional): why this coin, why now"></textarea>' +
          '<div class="co-buyrow"><span class="dim">Buy &amp; Call</span><div class="seg" id="coBuy">' + [0.25, 0.5, 1, 2].map((v) => '<button data-cb="' + v + '">' + v + ' SOL</button>').join('') + '</div></div>' +
          '<div class="row-btns"><button class="btn primary" data-co="call" id="coGo"></button></div><div id="coCd"></div>' +
          '<p class="note">A callout posts with your buy and your real entry, and goes to your followers as a push notification. One every 6 hours. ' +
          'A <b>hit</b> is a 2x peak. Callout Rewards pay a share of a $3,000 daily pot by how much your followers made (4 h), and low-cap calls count less. Dumping on your own callout costs trust.</p></div>' +
          '<div class="card"><div class="seg co-tabs" id="coTabs">' + [['feed', 'Feed'], ['board', 'Leaderboard'], ['mine', 'My calls'], ['rewards', 'Rewards'], ['offers', 'Offers']].map(([k, l]) => '<button data-ct="' + k + '">' + l + '</button>').join('') + '</div><div id="coBody"></div></div></div></div>';
      el.addEventListener('click', (e) => {
        const gm = game(), T = gm.sys.trencher;
        const ct = e.target.closest('[data-ct]'); if (ct) { this.tab = ct.dataset.ct; this.render(true); return; }
        const cp = e.target.closest('[data-cp]'); if (cp) { this.period = cp.dataset.cp; this.render(true); return; }
        const cb = e.target.closest('[data-cb]'); if (cb) { this.buy = +cb.dataset.cb; this.render(true); return; }
        const pk = e.target.closest('[data-pick]'); if (pk) { this.pick = pk.dataset.pick; this.render(true); return; }
        const co = e.target.closest('[data-co]');
        if (co) {
          const a = co.dataset.co;
          if (a === 'call') { const id = this.pick, held = id && gm.player.pos.has(id); const r = T.call(id, $('#coText').value, held ? {} : { buy: this.buy }); toast(r); if (r.ok) { $('#coText').value = ''; this.tab = 'mine'; } this.render(true); return; }
          if (a === 'accept') toast(T.acceptOffer(co.dataset.id));
          if (a === 'decline') toast(T.declineOffer(co.dataset.id));
          if (a === 'pause') { T.paused = !T.paused; toast({ ok: true, text: T.paused ? 'Copy trading paused' : 'Copy trading on' }); }
          this.render(true); return;
        }
        const c = e.target.closest('[data-coin]'); if (c && gm.sim.byId.get(c.dataset.coin)) UI.openToken(c.dataset.coin);
      });
      $('#coText', el).addEventListener('keydown', (e) => e.stopPropagation());
    },
    render(full) {
      const gm = game(), T = gm.sys.trencher, sim = gm.sim; if (!T || !$('#coStats')) return;
      const st = T.myStats(), today = T.leaderboard('day').find((x) => x.who === 'you');
      setHTML($('#coStats'),
        '<div class="card stat"><span>Followers</span><b class="big">' + Math.round(T.followers).toLocaleString() + '</b><small class="dim">trust ' + Math.round(T.trust) + '/100' + (T.copiers ? ' · ' + T.copiers + ' copy traders' : '') + '</small></div>' +
        '<div class="card stat"><span>Hit rate (2x+)</span><b class="big">' + Math.round(st.hitRate * 100) + '%</b><small class="dim">' + st.closed + ' closed · median ' + xf(st.median || 1) + ' · best ' + xf(st.best || 1) + '</small></div>' +
        '<div class="card stat"><span>Followers\' PnL</span><b class="big ' + (st.pnl >= 0 ? 'up' : 'down') + '">' + sol(st.pnl) + '</b><small class="dim">all your callouts, 4 h after each</small></div>' +
        '<div class="card stat"><span>Callout Rewards</span><b class="big up">$' + T.rewardsTotal().toFixed(2) + '</b><small class="dim">today so far ≈ $' + (today ? today.est : 0).toFixed(2) + ' of $' + BH.Trencher.CALLOUT.POT.toLocaleString() + '</small></div>');
      // coin picker: the open coin, your bags, hot coins
      const cur = UI.tokenId && sim.byId.get(UI.tokenId);
      const bags = [...gm.player.pos.values()].map((p) => sim.byId.get(p.id)).filter((t) => t && !t.dead);
      const hot = sim.tokens.filter((t) => !t.dead && !bags.includes(t)).sort((a, b) => sim.vol5m(b) - sim.vol5m(a)).slice(0, 6);
      const list = [];
      for (const t of [cur].concat(bags, hot)) if (t && !t.dead && !list.includes(t)) list.push(t);
      if (!this.pick || !list.some((t) => t.id === this.pick)) this.pick = list[0] ? list[0].id : null;
      setHTML($('#coPickWrap'), '<div class="co-picks">' + list.slice(0, 9).map((t) => '<button class="co-pick' + (t.id === this.pick ? ' on' : '') + '" data-pick="' + t.id + '">' + (t.img != null ? '<img src="' + V.coinImg(BASE, t) + '" onerror="this.remove()">' : '') + '<b>$' + esc(t.ticker) + '</b><small>' + F.usd(sim.mc(t)) + (gm.player.pos.has(t.id) ? ' · held' : '') + '</small></button>').join('') + '</div>');
      for (const b of document.querySelectorAll('[data-cb]')) b.classList.toggle('on', +b.dataset.cb === this.buy);
      const held = this.pick && gm.player.pos.has(this.pick), wait = T.nextCallIn();
      const go = $('#coGo'); if (go) { go.disabled = !this.pick || wait > 0; go.textContent = wait > 0 ? 'Next callout in ' + BH.Trencher.fmtH(wait) : held ? 'Call (you hold it)' : 'Buy ' + this.buy + ' SOL & Call'; }
      setHTML($('#coCd'), wait > 0 ? '<div class="co-cd"><i style="width:' + Math.round((1 - wait / BH.Trencher.CALLOUT.COOLDOWN_H) * 100) + '%"></i></div>' : '');
      for (const b of document.querySelectorAll('[data-ct]')) b.classList.toggle('on', b.dataset.ct === this.tab);
      let html = '';
      if (this.tab === 'feed') { const f = T.feed(30); html = f.length ? f.map(card).join('') : '<div class="sv-empty">No callouts yet. KOLs call coins every minute or so.</div>'; }
      if (this.tab === 'mine') { const m = T.myCallouts().slice().reverse(); html = m.length ? m.map(card).join('') : '<div class="sv-empty">No callouts yet. Pick a coin on the left and call it.</div>'; }
      if (this.tab === 'board') {
        const rows = T.leaderboard(this.period);
        html = '<div class="seg co-per">' + [['day', 'Today'], ['week', 'Week'], ['all', 'All time']].map(([k, l]) => '<button data-cp="' + k + '" class="' + (this.period === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
          '<table class="co-tab"><thead><tr><th>#</th><th class="l">Caller</th><th>Calls</th><th>Hit rate</th><th>Median</th><th>Best</th><th>Followers\' PnL</th><th>Rewards today</th></tr></thead><tbody>' +
          rows.slice(0, 30).map((r, i) => { const w = who({ npc: r.who !== 'you', who: r.who }); return '<tr class="' + (r.who === 'you' ? 'you' : '') + '"><td>' + (i + 1) + '</td><td class="l"><img class="co-mini" src="' + esc(w.pic) + '" referrerpolicy="no-referrer"' + (w.fb ? ' onerror="this.onerror=null;this.src=\'' + esc(w.fb) + '\'"' : '') + '>' + esc(w.name) + '</td><td>' + r.calls + '</td><td>' + (r.closed ? Math.round(r.hitRate * 100) + '%' : '—') + '</td><td>' + (r.closed ? xf(r.median) : '—') + '</td><td>' + (r.closed ? xf(r.best) : '—') + '</td><td class="' + (r.pnl >= 0 ? 'up' : 'down') + '">' + sol(r.pnl) + '</td><td>$' + r.est.toFixed(2) + '</td></tr>'; }).join('') + '</tbody></table>' +
          '<p class="note">Ranked by how much each caller\'s followers made 4 hours after their callouts. Hit rate = share of closed callouts that peaked at 2x or more.</p>';
      }
      if (this.tab === 'rewards') {
        const rw = (T.rewards || []).slice().reverse();
        html = '<p class="note">Every game day, a <b>$3,000</b> pot is split between callers by their share of followers\' profit (4 h after each callout, losses count as 0). Calls made under $30K market cap count 35%, under $100K 70%. Paid in cash at midnight.</p>' +
          (rw.length ? rw.map((x) => '<div class="kv"><span>Day ' + x.day + (x.rank ? ' · rank #' + x.rank + ' of ' + x.of : '') + '</span><b class="' + (x.usd > 0 ? 'up' : 'dim') + '">$' + x.usd.toFixed(2) + '</b></div>').join('') : '<div class="sv-empty">No payouts yet. The first one comes at midnight.</div>');
      }
      if (this.tab === 'offers') {
        html = '<h3>Shill offers</h3>' + (T.offers.length ? T.offers.map((o) => '<div class="trw"><div><b>$' + esc(o.ticker) + '</b><span class="dim">pays ' + o.pay + ' SOL · ' + Math.max(0, Math.ceil(o.until - sim.t)) + 's left · uses your callout</span></div><div class="spacer"></div><button class="btn sm" data-co="accept" data-id="' + o.id + '">Take it</button><button class="btn sm" data-co="decline" data-id="' + o.id + '">No</button></div>').join('') : '<div class="sv-empty">Devs pay for callouts once you have 500+ followers.</div>') +
          '<h3>Copy traders</h3><div class="kv"><span>Copy traders</span><b>' + T.copiers + '</b></div><div class="kv"><span>Fees earned (10% of their profit)</span><b class="up">' + T.copyEarned.toFixed(3) + ' SOL</b></div>' + (T.copiers ? '<button class="btn sm" data-co="pause">' + (T.paused ? 'Resume copying' : 'Pause copying') + '</button>' : '<p class="note">Copy traders unlock at 1,000 followers.</p>');
      }
      setHTML($('#coBody'), html);
      void full;
    },
  };
  BH.addApp('trencher', 'Callouts', 'megaphone', '#ff5fa2', page);
})(window);
