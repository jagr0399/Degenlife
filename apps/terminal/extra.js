/* Degen Life terminal pages for stages 2-6: Chirp, Scope, Shop, Dev (Coin Factory), Firm, Pad,
   plus the due-diligence quill card and TP/SL orders on the token page. Loaded after ui.js and bank.js. */
(function (g) {
  'use strict';
  const BH = g.BH, C = BH.C, F = BH.fmt, UI = BH.UI, icon = BH.icon, esc = BH.esc, V = BH.SocialView;
  const $ = (s, el) => (el || document).querySelector(s);
  const setHTML = (el, v) => { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } };
  const BASE = '../assets/';
  const usd = (n) => '$' + Math.round(n).toLocaleString();
  const game = () => UI.game;
  const lockCard = (ic, title, text, go) => '<div class="page"><div class="card lock">' + icon(ic, 'lg') + '<h2>' + title + '</h2><p>' + text + '</p>' + (go ? '<button class="btn primary" data-go="' + go + '">' + icon('arrow-right', 'sm') + 'Open ' + go + '</button>' : '') + '</div></div>';
  function bindGo(el) { el.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) UI.go(b.dataset.go); const c = e.target.closest('[data-coin]'); if (c && game().sim.byId.get(c.dataset.coin)) UI.openToken(c.dataset.coin); }); }
  const toast = (r) => UI.toast(r.ok ? 'info' : 'fail', r.text || r.reason || (r.ok ? 'Done' : 'Failed'));

  const PAGES = {
    chirp: {
      nav: ['message-circle', 'Chirp'],
      tab: 'all',
      build(el) {
        const gm = game(), t = gm.sys.trencher;
        el.innerHTML = '<div class="xp chirp"><section class="xcol"><h1>' + icon('message-circle', 'lg') + 'Chirp</h1>' +
          '<div class="cw"><img class="sv-pfp" id="cwAv" src="' + V.pfp(BASE, game().meta.pfp != null ? game().meta.pfp : 47) + '"><div class="cw-main"><textarea id="cwText" maxlength="280" placeholder="What\'s happening in the trenches?"></textarea>' +
          '<div class="cw-bar"><select id="cwCoin"><option value="">No coin</option></select><span class="dim" id="cwCount">0/280</span><div class="spacer"></div><button class="btn primary sm" id="cwPost">Post</button></div></div></div>' +
          '<div class="seg cw-tabs"><button data-ft="all">For you</button><button data-ft="following">Following</button><button data-ft="mine">Your posts</button><button data-ft="notes">Notifications <b id="cwN"></b></button></div>' +
          '<div id="xFeed" class="sv-feed"></div></section>' +
          '<aside class="xside"><div class="card"><h2>' + icon('user') + 'You</h2><div id="cwMe"></div><div id="cwPick" class="cw-pick" hidden></div></div><div class="card"><h2>' + icon('trending-up') + 'What\'s happening</h2><div id="xTrend"></div></div><div class="card"><h2>' + icon('user-plus') + 'Who to follow</h2><div id="xWho"></div></div><div class="card"><h2>' + icon('flame') + 'Narrative heat</h2><div id="xHeat"></div><p class="note">Hot narratives launch more coins and start them with more hype. Heat cools over time; a new season starts every few minutes.</p></div></aside></div>';
        bindGo(el);
        const txt = $('#cwText', el);
        txt.addEventListener('input', () => { $('#cwCount', el).textContent = txt.value.length + '/280'; });
        $('#cwPost', el).onclick = () => { const r = gm.sys.social.compose(txt.value, $('#cwCoin', el).value || null); toast(r); if (r.ok) { txt.value = ''; $('#cwCount', el).textContent = '0/280'; this.tab = 'mine'; this.render(true); } };
        el.addEventListener('click', (e) => {
          const ft = e.target.closest('[data-ft]'); if (ft) { this.tab = ft.dataset.ft; if (this.tab === 'notes') gm.sys.social.seeNotes(); this.render(true); return; }
          const fo = e.target.closest('[data-follow]'); if (fo) { const s2 = gm.sys.social; s2.following = s2.following || {}; s2.following[fo.dataset.follow] = !s2.following[fo.dataset.follow]; $('#xWho')._h = null; this.render(true); return; }
          if (e.target.closest('[data-pickpfp]')) { const pk = $('#cwPick'); pk.hidden = !pk.hidden; if (!pk.hidden && !pk.innerHTML) pk.innerHTML = '<button class="cw-up" data-pfpup title="Use a picture from your PC">Upload</button>' + Array.from({ length: 144 }, (_, i) => '<button data-pfp="' + i + '"><img src="' + V.pfp(BASE, i) + '" loading="lazy"></button>').join(''); return; }
          // your own picture: pick any image on your PC; it's cropped to a square and shrunk to 128 px (saved with the game)
          if (e.target.closest('[data-pfpup]')) {
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/gif';
            inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; if (f.size > 15e6) { toast({ ok: false, reason: 'That image is too big (15 MB max)' }); return; }
              const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 128; const s = Math.min(im.width, im.height), cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 128, 128);
                gm.meta.pfpData = c.toDataURL('image/png'); gm.meta.pfp = -1; $('#cwAv').src = gm.meta.pfpData; $('#cwPick').hidden = true; $('#cwMe')._h = null; $('#xFeed')._h = null; toast({ ok: true, text: 'Profile picture updated' }); this.render(true); };
                im.onerror = () => toast({ ok: false, reason: 'Could not read that image' }); im.src = rd.result; }; rd.readAsDataURL(f); };
            inp.click(); return;
          }
          const pf = e.target.closest('[data-pfp]'); if (pf) { gm.meta.pfp = +pf.dataset.pfp; $('#cwAv').src = V.pfp(BASE, gm.meta.pfp); $('#cwPick').hidden = true; $('#cwMe')._h = null; toast({ ok: true, text: 'Profile picture updated' }); this.render(true); return; }
          V.feedClick(gm, e, () => { $('#xFeed')._h = null; this.render(true); });
        });
        void t;
      },
      render(full) {
        const gm = game(), s = gm.sys.social, t = gm.sys.trencher, p = gm.player;
        for (const b of document.querySelectorAll('[data-ft]')) b.classList.toggle('on', b.dataset.ft === this.tab);
        const n = s.unseen ? s.unseen() : 0; const nb = $('#cwN'); if (nb) nb.textContent = n ? n : '';
        // coin picker: your bags first, then the hottest coins
        const sel = $('#cwCoin');
        if (sel && document.activeElement !== sel && (full || !sel._t || gm.sim.t - sel._t > 10)) {
          sel._t = gm.sim.t; const keep = sel.value;
          const held = Array.from(p.pos.values()).map((x) => gm.sim.byId.get(x.id)).filter((x) => x && !x.dead);
          const hot = gm.sim.tokens.filter((x) => !x.dead && !held.includes(x)).sort((a, b) => gm.sim.vol5m(b) - gm.sim.vol5m(a)).slice(0, 12);
          sel.innerHTML = '<option value="">No coin</option>' + held.map((x) => '<option value="' + x.id + '">Call $' + esc(x.ticker) + ' (you hold)</option>').join('') + hot.map((x) => '<option value="' + x.id + '">Call $' + esc(x.ticker) + '</option>').join('');
          sel.value = keep;
        }
        const feed = $('#xFeed'); if (!feed) return;
        if (feed.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;   // don't wipe a reply you're typing
        let html;
        if (this.tab === 'notes') html = (s.notes || []).length ? s.notes.slice(0, 40).map((x) => '<div class="cw-note' + (x.seen ? '' : ' new') + '">' + icon(/liked/.test(x.text) ? 'heart' : /repost/.test(x.text) ? 'repeat-2' : 'message-circle', 'sm') + '<span>' + esc(x.text) + '</span></div>').join('') : '<div class="sv-empty">No notifications yet. Post something.</div>';
        else if (this.tab === 'mine') { const mine = s.myPosts().slice(-40).reverse(); html = mine.length ? mine.map((x) => V.postHTML(gm, BASE, x)).join('') : '<div class="sv-empty">You have not posted yet. Say something above, or pick a coin to call it.</div>'; }
        else if (this.tab === 'following') { const fol = s.following || {}; html = Object.values(fol).some(Boolean) ? V.chirpHTML(gm, BASE, 50, (x) => fol[x.handle]) : '<div class="sv-empty">Follow accounts from "Who to follow" to see only their posts here.</div>'; }
        else html = V.chirpHTML(gm, BASE, 50);
        setHTML(feed, html);
        const nowT = performance.now(); if (full || !this._sideT || nowT - this._sideT > 1000) { this._sideT = nowT; setHTML($('#xTrend'), V.trendsHTML(gm)); setHTML($('#xWho'), V.whoHTML(gm, BASE)); }   // the side cards change slowly: once a second
        setHTML($('#cwMe'), t ? '<div class="cw-me"><img class="sv-pfp" src="' + V.pfp(BASE, gm.meta.pfp != null ? gm.meta.pfp : 47) + '"><div><b>You</b><span class="dim">' + esc(t.handle || '@you') + '</span></div><button class="btn sm" data-pickpfp>Change picture</button></div><div class="kv"><span>Followers</span><b>' + Math.round(t.followers).toLocaleString() + '</b></div><div class="kv"><span>Trust</span><b>' + Math.round(t.trust) + '/100</b></div><div class="kv"><span>Posts</span><b>' + s.myPosts().length + '</b></div><div class="kv"><span>Likes on your posts</span><b>' + s.myPosts().reduce((a, x) => a + (x.likes || 0), 0).toLocaleString() + '</b></div>' : '');
        setHTML($('#xHeat'), V.heatHTML(gm));
      },
    },
    scope: {
      nav: ['radar', 'Scope'],
      build(el) { el.innerHTML = '<div class="xp"><h1>' + icon('radar', 'lg') + 'Scope <span class="dim">· every post that mentions a coin, rated by the account\'s track record</span></h1><div class="card"><div id="xScope"></div></div><p class="note">STRONG = proven caller (hit rate × reach) on a live coin under $2M. A hit = the coin peaked 50%+ above the market cap at the post within 2 minutes.</p></div>'; bindGo(el); },
      render() { setHTML($('#xScope'), V.scopeHTML(game(), BASE, 50)); },
    },
    shop: {
      nav: ['shopping-bag', 'Shop'],
      build(el) {
        el.innerHTML = '<div class="xp"><h1>' + icon('shopping-bag', 'lg') + 'Shop <span class="dim">· paid in cash, delivered to your door</span></h1><div id="xBoxes"></div><h2 class="xh">Gear</h2><div class="xgrid" id="xCat"></div><h2 class="xh">Places</h2><div class="xgrid" id="xPlaces"></div></div>';
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-buy]'); if (b) { const r = game().sys.build.buy(b.dataset.buy); toast(r); if (r.ok && BH.Sound) BH.Sound.play('purchase'); this.render(true); }
          const l = e.target.closest('[data-lease]'); if (l) { const r = game().sys.build.lease(l.dataset.lease); toast(r); if (r.ok && BH.Sound) BH.Sound.play('confirm'); this.render(true); }
        });
      },
      render() {
        const b = game().sys.build;
        setHTML($('#xBoxes'), (b.boxes.length ? '<div class="banner">' + icon('package') + b.boxes.length + ' box' + (b.boxes.length > 1 ? 'es are' : ' is') + ' waiting at your door. Stand up and open ' + (b.boxes.length > 1 ? 'them' : 'it') + ' (E).</div>' : '') + (b.deliveries.length ? '<div class="banner dim">' + icon('truck') + b.deliveries.length + ' on the way.</div>' : ''));
        setHTML($('#xCat'), BH.Build.CATALOG.map((it) => { const c = b.canBuy(it.id); return '<div class="card item"><b>' + esc(it.name) + '</b><span class="price">' + usd(it.price) + '</span><p>' + esc(it.desc) + '</p><small class="dim">Owned ' + b.count(it.id) + '/' + it.max + (it.place !== 'any' ? ' · ' + BH.Build.PLACES[it.place].name : '') + '</small><button class="btn sm ' + (c.ok ? 'primary' : '') + '" data-buy="' + it.id + '"' + (c.ok ? '' : ' disabled title="' + esc(c.reason) + '"') + '>' + (c.ok ? 'Buy' : esc(c.reason)) + '</button></div>'; }).join(''));
        setHTML($('#xPlaces'), Object.entries(BH.Build.PLACES).filter(([id]) => id !== 'street').map(([id, p]) => { const own = b.places.includes(id), c = b.canLease(id); return '<div class="card item' + (own ? ' owned' : '') + '"><b>' + esc(p.name) + '</b><span class="price">' + (p.rent ? usd(p.rent) + '/wk' : 'free') + '</span><p>' + esc(p.desc) + '</p><small class="dim">' + (own ? 'Yours' : 'Deposit ' + usd(p.deposit) + ' · needs ' + usd(p.needUsd) + ' net worth') + '</small>' + (own ? '' : '<button class="btn sm ' + (c.ok ? 'primary' : '') + '" data-lease="' + id + '"' + (c.ok ? '' : ' disabled') + '>' + (c.ok ? 'Lease' : esc(c.reason)) + '</button>') + '</div>'; }).join(''));
      },
    },
    dev: {
      nav: ['hammer', 'Dev'],
      build(el) {
        el.innerHTML = '<div class="xp" id="xDev"></div>';
        el.addEventListener('click', (e) => {
          const f = game().sys.factory;
          const gv = e.target.closest('[data-give]'); if (gv) { toast(f.giveaway(gv.dataset.coin, +gv.dataset.give)); }
          const rg = e.target.closest('[data-rug]');
          if (rg) {
            const tk = game().sim.byId.get(rg.dataset.rug);
            UI.modal('<h2>' + icon('triangle-alert') + ' Pull the rug on $' + esc(tk ? tk.ticker : '') + '?</h2><p>You sell your whole dev bag into your holders. You get the SOL now, but your reputation drops by 25, the timeline calls you out, and your future launches start colder.</p><div class="row-btns"><button class="btn" data-x="no">Keep building</button><button class="btn sell" data-x="yes">' + icon('skull', 'sm') + 'RUG</button></div>', (m) => {
              m.addEventListener('click', (ev) => { const b = ev.target.closest('[data-x]'); if (!b) return; UI.closeModal(); if (b.dataset.x === 'yes') { const r = f.rug(rg.dataset.rug); toast(r); if (r.ok && BH.Sound) BH.Sound.play('rug'); } });
            });
          }
          const gb = e.target.closest('[data-go]'); if (gb) UI.go(gb.dataset.go);
          const c = e.target.closest('[data-open]'); if (c) UI.openToken(c.dataset.open);
        });
      },
      render() {
        const gm = game(), f = gm.sys.factory, b = gm.sys.build;
        if (!b.effects().devdesk) { setHTML($('#xDev'), '<div class="card lock">' + icon('hammer', 'lg') + '<h2>Coin Factory needs a Dev desk</h2><p>Lease the Apartment, then buy the Dev desk in the Shop. You can still launch coins from the Launch tab, but community tools and the RUG button live at the dev desk.</p><button class="btn primary" data-go="shop">' + icon('shopping-bag', 'sm') + 'Open Shop</button></div>'); return; }
        const coins = f.myCoins().filter((t) => !t.dead);
        const sim = gm.sim;
        setHTML($('#xDev'), '<h1>' + icon('hammer', 'lg') + 'Coin Factory<div class="spacer"></div><button class="btn primary" data-go="launch">' + icon('rocket', 'sm') + 'Launch a coin</button></h1>' +
          '<div class="grid-3"><div class="card stat"><span>Reputation</span><b class="big ' + (f.rep >= 60 ? 'up' : f.rep < 30 ? 'down' : '') + '">' + Math.round(f.rep) + '</b><i class="meter"><b style="width:' + f.rep + '%"></b></i></div><div class="card stat"><span>Clean launches</span><b class="big up">' + f.clean + '</b></div><div class="card stat"><span>Rugs</span><b class="big down">' + f.rugs + '</b></div></div>' +
          '<h2 class="xh">Your live coins</h2>' + (coins.length ? coins.map((tk) => { const h = Math.min(100, tk.hype * 40); return '<div class="card coinrow"><img class="cimg lg" src="' + V.coinImg(BASE, tk) + '"><div class="cr-main"><b>' + esc(tk.name) + ' <span class="dim">$' + esc(tk.ticker) + '</span></b><span class="dim">' + F.usd(sim.mc(tk)) + ' MC · ' + sim.risk(tk).holders + ' holders · fees earned ' + F.sol(tk.creatorFees) + ' SOL</span><div class="hype"><span>Hype</span><i><b style="width:' + h + '%"></b></i></div></div><div class="cr-btns"><button class="btn sm" data-open="' + tk.id + '">Chart</button><button class="btn sm" data-give="0.1" data-coin="' + tk.id + '">Giveaway 0.1</button><button class="btn sm" data-give="0.5" data-coin="' + tk.id + '">Giveaway 0.5</button><button class="btn sm sell" data-rug="' + tk.id + '">' + icon('skull', 'sm') + 'RUG</button></div></div>'; }).join('') : '<div class="card empty">No live coins. Launch one, then come back to grow (or betray) the community.</div>'));
      },
    },
    firm: {
      nav: ['users', 'Firm'],
      build(el) {
        el.innerHTML = '<div class="xp" id="xFirm"></div>';
        el.addEventListener('click', (e) => {
          const fm = game().sys.firm, b = e.target.closest('[data-f]'); if (!b) { const gb = e.target.closest('[data-go]'); if (gb) UI.go(gb.dataset.go); return; }
          const id = b.dataset.id, a = b.dataset.f;
          if (a === 'hire') toast(fm.hire(id));
          if (a === 'fire') toast(fm.fire(id));
          if (a === 'coach') toast(fm.coach(id));
          if (a === 'fund' || a === 'pull') { const v = parseFloat($('#fa-' + id).value); toast(fm.fund(id, a === 'pull' ? -v : v)); }
          if (a === 'rules') { fm.setRules(id, { maxTrade: parseFloat($('#fm-' + id).value), minMc: parseFloat($('#fn-' + id).value) * 1000 }); toast({ ok: true, text: 'Rules saved' }); }
          $('#xFirm')._h = null;
        });
      },
      render() {
        const gm = game(), fm = gm.sys.firm, b = gm.sys.build;
        if (!b.places.includes('office')) { setHTML($('#xFirm'), '<div class="card lock">' + icon('users', 'lg') + '<h2>Trading Firm needs an office</h2><p>Lease the Office floor in the Shop, buy trader desks, then hire from the pile of resumes.</p><button class="btn primary" data-go="shop">' + icon('shopping-bag', 'sm') + 'Open Shop</button></div>'); return; }
        const el = $('#xFirm');
        if (document.activeElement && el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;   // don't redraw while typing
        const sty = BH.Firm.STYLES, bar = (v, c) => '<i class="meter"><b style="width:' + v + '%;' + (c ? 'background:' + c : '') + '"></b></i>';
        setHTML(el, '<h1>' + icon('users', 'lg') + 'Trading Firm <span class="dim">· ' + fm.staff.length + '/' + fm.desks() + ' desks</span></h1>' +
          '<h2 class="xh">Staff</h2>' + (fm.staff.length ? '<div class="xgrid wide">' + fm.staff.map((t) => '<div class="card trader"><div class="tr-head"><img class="sv-pfp" src="' + V.pfp(BASE, t.pfp) + '"><div><b>' + esc(t.name) + '</b><span class="dim">' + sty[t.style].label + ' · $' + t.salary + '/day</span></div><div class="spacer"></div><b class="' + (t.pnl >= 0 ? 'up' : 'down') + '">' + (t.pnl >= 0 ? '+' : '') + t.pnl.toFixed(2) + ' SOL</b></div>' +
            '<div class="tr-stats"><span>Skill ' + t.skill + '</span><span>Nerves ' + t.nerves + '</span><span>Greed ' + t.greed + '</span><span>Loyalty ' + t.loyalty + '</span></div><div class="hype"><span>Mood</span>' + bar(t.mood, t.mood < 25 ? '#ff4d5e' : null) + '</div>' +
            '<div class="kv"><span>Wallet</span><b>' + t.wallet.toFixed(2) + ' SOL · ' + Object.keys(t.pos).length + ' open</b></div>' +
            '<div class="tr-row"><input class="input" id="fa-' + t.id + '" value="1"><button class="btn sm primary" data-f="fund" data-id="' + t.id + '">Fund</button><button class="btn sm" data-f="pull" data-id="' + t.id + '">Pull</button></div>' +
            '<div class="tr-row"><label>Max/trade <input class="input" id="fm-' + t.id + '" value="' + t.maxTrade + '"></label><label>Min MC $K <input class="input" id="fn-' + t.id + '" value="' + Math.round(t.minMc / 1000) + '"></label><button class="btn sm" data-f="rules" data-id="' + t.id + '">Save</button></div>' +
            '<div class="tr-row"><button class="btn sm" data-f="coach" data-id="' + t.id + '">Coach</button><button class="btn sm ghost" data-f="fire" data-id="' + t.id + '">Fire</button></div></div>').join('') + '</div>' : '<div class="card empty">Nobody yet. Hire from the resumes below.</div>') +
          '<h2 class="xh">Resumes <span class="dim">· new pile every morning</span></h2><div class="xgrid">' + fm.resumes.map((r) => '<div class="card trader"><div class="tr-head"><img class="sv-pfp" src="' + V.pfp(BASE, r.pfp) + '"><div><b>' + esc(r.name) + '</b><span class="dim">' + sty[r.style].label + '</span></div></div><p class="note">' + sty[r.style].desc + '</p><div class="tr-stats"><span>Skill ' + r.skill + '</span><span>Nerves ' + r.nerves + '</span><span>Greed ' + r.greed + '</span><span>Loyalty ' + r.loyalty + '</span></div><div class="kv"><span>Salary</span><b>$' + r.salary + '/day</b></div><button class="btn sm primary" data-f="hire" data-id="' + r.id + '">Hire</button></div>').join('') + '</div>' +
          '<h2 class="xh">Firm log</h2><div class="card">' + (fm.log.slice(0, 12).map((l) => '<div class="logline">Day ' + l.day + ' · ' + esc(l.text) + '</div>').join('') || '<div class="dim">Nothing yet.</div>') + '</div>');
      },
    },
    pad: {
      nav: ['building-2', 'Pad'],
      build(el) {
        el.innerHTML = '<div class="xp" id="xPad"></div>';
        el.addEventListener('click', (e) => {
          const pad = game().sys.pad, b = e.target.closest('[data-p]'); if (!b) { const gb = e.target.closest('[data-go]'); if (gb) UI.go(gb.dataset.go); const c = e.target.closest('[data-open]'); if (c) UI.openToken(c.dataset.open); return; }
          const a = b.dataset.p;
          if (a === 'buy') toast(pad.buy());
          if (a === 'mkt') toast(pad.market(+b.dataset.v));
          if (a === 'ban' || a === 'allow') toast(pad.moderate(b.dataset.id, a === 'ban'));
          if (a === 'feat') toast(pad.feature(b.dataset.id));
          if (a === 'fee') { pad.setFee(pad.feePct + (+b.dataset.v)); }
          $('#xPad')._h = null;
        });
      },
      render() {
        const gm = game(), pad = gm.sys.pad, b = gm.sys.build, sim = gm.sim;
        if (!b.places.includes('tower')) { setHTML($('#xPad'), '<div class="card lock">' + icon('building-2', 'lg') + '<h2>Launchpad Tycoon needs the Tower</h2><p>Lease the Tower in the Shop, then launch your own launchpad and buy server racks.</p><button class="btn primary" data-go="shop">' + icon('shopping-bag', 'sm') + 'Open Shop</button></div>'); return; }
        if (!pad.owned) { setHTML($('#xPad'), '<div class="card lock">' + icon('rocket', 'lg') + '<h2>Start ' + esc(pad.name) + '</h2><p>Your own launchpad. A share of new coins launches on it and you earn platform fees on every trade. Costs ' + usd(BH.Pad.PRICE) + ' cash.</p><button class="btn primary" data-p="buy">Launch the platform</button></div>'); return; }
        const live = pad.live(), cap = pad.capacity();
        setHTML($('#xPad'), '<h1>' + icon('building-2', 'lg') + esc(pad.name) + ' <span class="dim">· your launchpad</span>' + (sim.t < pad.outageUntil ? ' <span class="bdg bad">OUTAGE</span>' : '') + '</h1>' +
          '<div class="grid-4"><div class="card stat"><span>Market share</span><b class="big">' + Math.round(pad.share * 100) + '%</b><i class="meter"><b style="width:' + pad.share * 100 + '%"></b></i><small class="dim">' + esc(pad.rival.name) + ': ' + Math.round(pad.rival.share * 100) + '% (' + esc(pad.rival.mood) + ')</small></div>' +
          '<div class="card stat"><span>Trust</span><b class="big ' + (pad.trust < 40 ? 'down' : 'up') + '">' + Math.round(pad.trust) + '</b><i class="meter"><b style="width:' + pad.trust + '%"></b></i></div>' +
          '<div class="card stat"><span>Fees earned</span><b class="big up">' + pad.earned.toFixed(2) + ' SOL</b><small class="dim">today ' + pad.earnedToday.toFixed(2) + '</small></div>' +
          '<div class="card stat"><span>Servers</span><b class="big">' + live.length + '/' + cap + '</b><small class="dim">coins live / capacity</small></div></div>' +
          '<div class="grid-2"><div class="card"><h2>' + icon('sliders-horizontal') + 'Platform fee <b>' + pad.feePct.toFixed(2) + '%</b></h2><div class="row-btns"><button class="btn sm" data-p="fee" data-v="-0.25">−0.25%</button><button class="btn sm" data-p="fee" data-v="0.25">+0.25%</button></div><p class="note">Higher fees earn more per trade but push users to ' + esc(pad.rival.name) + '.</p><h2>' + icon('megaphone') + 'Marketing</h2><div class="row-btns"><button class="btn sm" data-p="mkt" data-v="2000">$2,000 campaign</button><button class="btn sm" data-p="mkt" data-v="10000">$10,000 campaign</button></div></div>' +
          '<div class="card"><h2>' + icon('shield-alert') + 'Moderation queue <span class="dim">' + pad.queue.length + '</span></h2>' + (pad.queue.slice(0, 6).map((q) => { const tk = sim.byId.get(q.coin); return tk ? '<div class="modrow"><img class="cimg" src="' + V.coinImg(BASE, tk) + '"><div><b>$' + esc(tk.ticker) + '</b><span class="dim">' + esc(q.why) + '</span></div><button class="btn sm sell" data-p="ban" data-id="' + tk.id + '">Ban</button><button class="btn sm" data-p="allow" data-id="' + tk.id + '">Allow</button></div>' : ''; }).join('') || '<div class="dim">Nothing flagged.</div>') + '</div></div>' +
          '<h2 class="xh">Live on ' + esc(pad.name) + ' <span class="dim">· click Feature to put a coin on the billboard</span></h2><div class="card"><table class="tbl"><tbody>' + live.slice(-12).reverse().map((tk) => '<tr><td class="l"><img class="cimg" src="' + V.coinImg(BASE, tk) + '"> $' + esc(tk.ticker) + (pad.featured === tk.id ? ' <span class="bdg warn">FEATURED</span>' : '') + '</td><td>' + F.usd(sim.mc(tk)) + '</td><td><button class="btn sm" data-open="' + tk.id + '">Chart</button> <button class="btn sm" data-p="feat" data-id="' + tk.id + '">Feature</button></td></tr>').join('') + '</tbody></table></div>' +
          '<h2 class="xh">Log</h2><div class="card">' + (pad.log.slice(0, 10).map((l) => '<div class="logline">Day ' + l.day + ' · ' + esc(l.text) + '</div>').join('') || '<div class="dim">Quiet.</div>') + '</div>');
      },
    },
  };

  // ---- wire the pages into the v1 shell ----
  const origInit = UI.init, origGo = UI.go, origRender = UI.render, origRenderToken = UI.renderToken;
  UI.init = function (gm) {
    origInit.call(this, gm);
    const nav = $('#nav'), bank = nav.querySelector('[data-view="bank"]');
    for (const [k, p] of Object.entries(PAGES)) { const b = document.createElement('button'); b.dataset.view = k; b.innerHTML = icon(p.nav[0]) + p.nav[1]; nav.insertBefore(b, bank); }
    document.addEventListener('keydown', (e) => { if (BH.Sound && e.key && e.key.length === 1) BH.Sound.key(); });
    document.addEventListener('click', (e) => { if (BH.Sound && e.target.closest('button')) BH.Sound.play('click', { gain: 0.35 }); });
    const card = document.createElement('div'); card.id = 'ddcard'; card.hidden = true; document.body.appendChild(card);
    document.addEventListener('mouseover', (e) => {
      const q = e.target.closest('[data-dd]');
      if (!q) { if (!card.hidden && !e.target.closest('#ddcard')) card.hidden = true; return; }
      const tk = gm.sim.byId.get(q.dataset.dd);
      card.innerHTML = V.ddHTML(gm, BASE, tk); card.hidden = false;
      const r = q.getBoundingClientRect();
      card.style.left = Math.min(window.innerWidth - 360, r.left) + 'px'; card.style.top = Math.min(window.innerHeight - 380, r.bottom + 8) + 'px';
      gm.flags.dd = true;
    });
  };
  UI.go = function (view) {
    origGo.call(this, view);
    if (view === 'bank') game().flags.bank = true;
    const p = PAGES[view];
    if (p) { p.build.call(p, this.el); this.el._x = view; p.render(true); }
  };
  UI.render = function (full) {
    origRender.call(this, full);
    const p = PAGES[this.view];
    if (p && this.el && this.el._x === this.view) { try { p.render(full); } catch (e) { if (g.parent && g.parent.degen) g.parent.degen.log('page ' + this.view + ': ' + e.message); } }
  };
  // take-profit / stop-loss / limit buy panel on the token page
  UI.renderToken = function (full) {
    origRenderToken.call(this, full);
    const side = $('#tside'); if (!side) return;
    let panel = $('#ordPanel');
    if (!panel) {
      panel = document.createElement('div'); panel.className = 'panel'; panel.id = 'ordPanel';
      side.insertBefore(panel, side.children[1] || null);
      panel.addEventListener('click', (e) => {
        const b = e.target.closest('[data-o]'); if (!b) return;
        const gm = game(), tk = gm.sim.byId.get(this.tokenId); if (!tk) return;
        const mc = gm.sim.mc(tk), [kind, mult, amt] = b.dataset.o.split(':');
        if (kind === 'x') { gm.sys.orders.remove(mult); return; }
        if (kind !== 'limit' && !gm.player.pos.has(tk.id)) return UI.toast('fail', 'Buy first, then set a TP or SL');
        const o = gm.sys.orders.add(tk.id, kind, mc * +mult, +amt);
        UI.toast(o ? 'info' : 'fail', o ? (kind === 'tp' ? 'Take profit' : kind === 'sl' ? 'Stop loss' : 'Limit buy') + ' set at ' + F.usd(o.mc) + '. Drag its line on the chart to move it.' : 'Could not set that');
      });
    }
    const gm = game(), list = gm.sys.orders.forCoin(this.tokenId);
    setHTML(panel, '<h3>' + icon('target', 'sm') + 'Orders <span class="dim">· by market cap</span></h3>' +
      '<div class="presets" style="grid-template-columns:repeat(3,1fr)"><button data-o="tp:1.5:0.5">TP +50%<br><small class="dim">sell half</small></button><button data-o="tp:2:1">TP 2x<br><small class="dim">sell all</small></button><button data-o="tp:5:1">TP 5x<br><small class="dim">sell all</small></button>' +
      '<button data-o="sl:0.7:1">SL −30%</button><button data-o="sl:0.5:1">SL −50%</button><button data-o="limit:0.8:0.5">Limit −20%<br><small class="dim">buy 0.5</small></button></div>' +
      (list.length ? list.map((o) => '<div class="kv"><span>' + o.kind.toUpperCase() + ' ' + (o.kind === 'limit' ? o.amount + ' SOL' : Math.round(o.amount * 100) + '%') + '</span><b>' + F.usd(o.mc) + ' <button class="btn ghost sm" data-o="x:' + o.id + '">✕</button></b></div>').join('') : ''));
  };
})(window);
