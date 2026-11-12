/* DegenOS apps for phases 3-7: Clout, Toolkit, Finance, Empire, Life. Built with BH.makeApp (hustle.js). */
(function (g) {
  'use strict';
  const BH = g.BH, F = BH.fmt, C = BH.C;
  const H = BH.AppKit, esc = H.esc, icon = H.icon, usd = H.usd;
  const sol = (n) => (+n).toFixed(2) + ' SOL';
  const coinLink = (gm, id, ticker) => gm.sim.byId.get(id) ? '<a class="lnk" data-coin="' + id + '">$' + esc(ticker) + '</a>' : '$' + esc(ticker);

  // ================= Clout (phase 3) =================
  BH.makeApp('clout', 'Clout', 'users-round', '#ff5fa2', {
    sub: 'your timeline, your followers, your enemies',
    badge: (gm) => { const t = gm.sys.trencher, c = gm.sys.clout; return '<span class="ma-badge">' + icon('users', 'sm') + Math.round(t.followers).toLocaleString() + ' · trust ' + Math.round(t.trust) + (c.verified ? ' · ' + icon('badge-check', 'sm') + 'verified' : '') + '</span>'; },
    tabs: [
      ['feed', 'Timeline', (gm) => {
        const c = gm.sys.clout;
        if (!c.posts.length) return H.card('Your posts', 'message-circle', H.empty('No posts yet. Call a coin (Trencher, or 📣 in the trade panel) and it shows up here with likes and replies.'));
        return c.posts.slice(0, 12).map((p) => H.card(coinLink(gm, p.coin, p.ticker) + ' <span class="dim">· day ' + p.day + ' · called at ' + F.usd(p.mcAt) + '</span>', 'message-circle',
          '<div class="kv"><span>' + icon('heart', 'sm') + ' ' + p.likes.toLocaleString() + ' likes · ' + icon('repeat-2', 'sm') + ' ' + p.reposts.toLocaleString() + ' reposts</span></div>' +
          (p.replies.length ? p.replies.map((r) => '<div class="msg ' + (r.kind === 'hater' ? 'warn' : '') + '"><b>@' + esc(r.who) + ' · ' + r.kind + '</b>' + esc(r.text) +
            (r.answered ? ' <span class="dim">(' + r.answered + ')</span>' : '<div class="row-btns">' + H.btn('Thank', 'clout.reply|' + p.id + '|' + r.id + '|thank') + H.btn('Explain', 'clout.reply|' + p.id + '|' + r.id + '|explain') + H.btn('Clap back', 'clout.reply|' + p.id + '|' + r.id + '|clap') + H.btn('Block', 'clout.reply|' + p.id + '|' + r.id + '|block', 'ghost') + '</div>') + '</div>').join('') : H.empty('No replies yet.')))).join('');
      }],
      ['copiers', 'Copy traders', (gm) => {
        const c = gm.sys.clout, t = gm.sys.trencher;
        return H.card('Who copies you (' + t.copiers + ')', 'copy', H.note('Copy traders mirror your buys and sells (you earn ' + '10% of their profits: ' + sol(t.copyEarned || 0) + ' so far). Lose them money and they unfollow, loudly. Unlocks at 1,000 followers.') +
          (c.copiers.length ? H.table(['Copier', 'Size', 'Trades', 'Their PnL', 'Since'], c.copiers.slice().sort((a, b) => b.pnl - a.pnl).map((x) => ['@' + esc(x.name), sol(x.size), x.trades, H.sign(x.pnl, 2) + ' SOL', 'day ' + x.since])) : H.empty('Nobody yet.')));
      }],
      ['board', 'Leaderboard', (gm) => {
        const c = gm.sys.clout, rows = c.leaderboard();
        return H.card('Weekly calls leaderboard', 'trophy', H.note('Ranked by hit rate, number of calls and reach. Top 3 at the end of each week get a verified badge and more reach for their calls.') +
          H.table(['#', 'Account', 'Calls', 'Hit rate', 'Score'], rows.slice(0, 26).map((r, i) => [(r.you ? '<b class="brand">' : '') + (i + 1) + (r.you ? '</b>' : ''), (r.you ? '<b class="brand">You</b>' : esc(r.name)) + ' <span class="dim">@' + esc(String(r.handle).replace('@', '')) + '</span>', r.calls, r.calls ? Math.round(r.hits / r.calls * 100) + '%' : '—', r.score])) +
          (c.board.length ? H.note('Past weeks: ' + c.board.slice(0, 6).map((b) => 'week ' + (b.week + 1) + ' #' + b.rank).join(' · ')) : ''));
      }],
      ['alpha', 'Alpha group', (gm) => {
        const c = gm.sys.clout, a = c.alpha, t = gm.sys.trencher;
        return H.card('Paid alpha group', 'lock-keyhole', H.note('Subscribers pay weekly (paid out daily). Your calls go here first. More trust and more followers mean more subscribers; a higher price means fewer. Buying right before you call and selling into them can get you exposed.') +
          (a.on ? H.kv('Subscribers', a.subs.toLocaleString()) + H.kv('Price', '$' + a.price + '/week') + H.kv('Earned', usd(a.earned)) + '<div class="row-btns"><input class="input sm" id="alphaP" value="' + a.price + '">' + '<button class="btn sm" data-do="clout.alphaPrice" data-input="#alphaP">Set price</button>' + H.btn('Close group', 'clout.alphaClose', 'ghost') + '</div>'
            : (t.followers >= 2000 ? H.btn('Open the alpha group', 'clout.alphaOpen', 'primary') : H.empty('Unlocks at 2,000 followers (' + Math.round(t.followers).toLocaleString() + ' now).'))) +
          H.kv('Times you front-ran a call', c.frontruns) + H.kv('Times you got exposed', c.exposed, c.exposed ? 'down' : ''));
      }],
      ['deals', 'Brand deals', (gm) => {
        const c = gm.sys.clout;
        return H.card('Sponsored post offers', 'handshake', H.note('Brands pay you for one post. Some are scams that cost your followers money (and you, trust). Offers start at 500 followers; verified accounts get paid more.') +
          (c.deals.length ? c.deals.map((d) => '<div class="msg"><b>' + esc(d.brand) + ' · day ' + d.day + '</b>Pays ' + usd(d.pay) + ' for one post. ' + (d.scam > 0.3 ? '<span class="down">The replies under their last campaign look… angry.</span>' : d.scam > 0.1 ? '<span class="dim">Mixed reviews.</span>' : '<span class="up">Seems legit.</span>') + '<div class="row-btns">' + H.btn('Take it', 'clout.takeDeal|' + d.id, 'primary') + H.btn('Decline', 'clout.dropDeal|' + d.id, 'ghost') + '</div></div>').join('') : H.empty('No offers right now.')));
      }],
      ['spaces', 'Spaces', (gm) => {
        const c = gm.sys.clout;
        return H.card('Host a Spaces', 'radio-tower', H.note('A 2-hour live stream about the coin you hold (your own coin first). Viewers buy during it. If the coin holds up afterwards, trust goes up; if it dumps, people remember. Needs 300 followers.') + H.btn(icon('mic', 'sm') + 'Go live', 'clout.host', 'primary') +
          (c.spaces.length ? H.table(['Coin', 'Day', 'Viewers', 'Buys', 'After'], c.spaces.map((s) => [coinLink(gm, s.coin, s.ticker), s.day, s.viewers, s.buys, s.result ? (s.result === 'pumped' ? '<span class="up">held up</span>' : '<span class="down">dumped</span>') : '…'])) : ''));
      }],
      ['rival', 'Rival crew', (gm) => {
        const rv = gm.sys.clout.rival;
        return H.card('The ' + esc(rv.name), 'swords', H.note('Kai\'s crew watches your calls. When they are strong they buy right before your followers do and dump on them a minute later. They also poach followers.') +
          H.kv('Strength', Math.round(rv.strength) + '/100', rv.strength > 50 ? 'down' : '') + H.meter(rv.strength, '#ff4d5e') + H.kv('Calls they front-ran', rv.frontran || 0) + H.kv('Followers they poached', (rv.stolen || 0).toLocaleString()) + H.kv('Feuds won', rv.wins + ' of ' + rv.feuds) +
          '<div class="row-btns">' + H.btn(icon('swords', 'sm') + 'Call them out publicly', 'clout.feud', 'primary') + '</div>');
      }],
    ],
  });

  BH.Apps2 = { sol, coinLink };
})(window);
