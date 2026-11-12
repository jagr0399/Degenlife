/* DegenOS apps for phases 4-7: Toolkit, Finance, Empire, Life. Built with BH.makeApp (hustle.js); loaded after apps2.js. */
(function (g) {
  'use strict';
  const BH = g.BH, F = BH.fmt;
  const H = BH.AppKit, esc = H.esc, icon = H.icon, usd = H.usd;
  const { sol, coinLink } = BH.Apps2;
  const inp = (id, v, w) => '<input class="input sm" id="' + id + '" value="' + esc(v) + '"' + (w ? ' style="width:' + w + 'px"' : '') + '>';
  const doBtn = (label, act, inputSel, cls) => '<button class="btn sm ' + (cls || '') + '" data-do="' + esc(act) + '"' + (inputSel ? ' data-input="' + inputSel + '"' : '') + '>' + label + '</button>';
  const msg = (title, body, btns, cls) => '<div class="msg ' + (cls || '') + '"><b>' + title + '</b>' + body + (btns ? '<div class="row-btns">' + btns + '</div>' : '') + '</div>';

  // ================= Toolkit (phase 4) =================
  BH.makeApp('toolkit', 'Toolkit', 'crosshair', '#2bd67b', {
    sub: 'bots, sleuthing and staying safe',
    badge: (gm) => { const t = gm.sys.tools; return '<span class="ma-badge">' + icon('shield', 'sm') + (t.hw ? 'cold ' + sol(t.cold) : 'no hardware wallet') + '</span>'; },
    tabs: [
      ['sniper', 'Sniper bot', (gm) => {
        const s = gm.sys.tools.sniper;
        const f = (k, label) => '<div class="kv"><span>' + label + '</span><b>' + inp('sn_' + k, s[k], 70) + ' ' + doBtn('Set', 'tools.setSniper|' + k, '#sn_' + k) + '</b></div>';
        return '<div class="grid-2">' + H.card('Your sniper bot', 'crosshair', H.note('Buys brand-new launches that pass your filters the moment they appear, then sells at your take-profit or stop-loss. Speed 3+ lands in the first block, ahead of the NPC snipers.') +
          '<div class="row-btns">' + H.btn(icon('power', 'sm') + (s.on ? 'Bot is ON' : 'Bot is off'), 'tools.setSniper|on', s.on ? 'primary' : '') + H.btn('Socials required: ' + (s.needSocials ? 'yes' : 'no'), 'tools.setSniper|needSocials') + '</div>' +
          f('size', 'Buy size (SOL)') + f('dailyCap', 'Daily budget (SOL)') + f('tp', 'Take profit (x)') + f('sl', 'Stop loss (x)') + f('maxDev', 'Max dev %') + f('maxBundle', 'Max bundle %') +
          '<div class="kv"><span>Only narrative</span><b>' + inp('sn_nar', s.narrative || '', 90) + ' ' + doBtn('Set', 'tools.setSniper|narrative', '#sn_nar') + '</b></div>' + H.note('Narratives: cats, dogs, ai, food, space, frogs, weather, sports, absurd (blank = any).')) +
          H.card('Upgrades & results', 'gauge', H.kv('Speed', s.speed + '/5') + H.meter(s.speed * 20, '#2bd67b') + '<div class="row-btns">' + H.btn('Upgrade speed', 'tools.upgrade|speed') + '</div>' + H.kv('Gas strategy', s.gas + '/5') + H.meter(s.gas * 20, '#4aa8ff') + '<div class="row-btns">' + H.btn('Upgrade gas', 'tools.upgrade|gas') + '</div>' +
          H.kv('Snipes', s.buys) + H.kv('Hit TP / hit SL', s.wins + ' / ' + s.losses) + H.kv('Bot PnL', H.sign(s.pnl, 2) + ' SOL') + H.kv('Spent today', sol(s.spent) + ' of ' + sol(s.dailyCap))) + '</div>';
      }],
      ['detective', 'Detective', (gm) => {
        const t = gm.sys.tools, live = gm.sim.tokens.filter((x) => !x.dead).sort((a, b) => gm.sim.vol5m(b) - gm.sim.vol5m(a)).slice(0, 10);
        return '<div class="grid-2">' + H.card('Open a case ($20 · 1h)', 'search', H.note('Trace funding wallets, timing and same-block buys to unmask insider clusters before they dump. Skill ' + t.skill.toFixed(1) + '/5 sets how often you read it right. Publish a thread for trust (if you are right).') +
          H.table(['Coin', 'MC', ''], live.map((tk) => [coinLink(gm, tk.id, tk.ticker), F.usd(gm.sim.mc(tk)), t.cases.some((c) => c.coin === tk.id) ? '<span class="dim">done</span>' : H.btn('Investigate', 'tools.investigate|' + tk.id)]))) +
          H.card('Case files', 'folder-search', t.cases.length ? t.cases.map((c) => msg('$' + esc(c.ticker) + ' · day ' + c.day, c.wallets + ' linked wallets hold ' + c.share + '%. Funding overlaps with ' + c.sameSource + ' other launches. Your read: <b>' + esc(c.verdict) + '</b>.' + (c.published ? ' <span class="dim">(published)</span>' : ''), c.published ? '' : H.btn('Publish thread', 'tools.publish|' + c.coin))).join('') : H.empty('No cases yet.')) + '</div>';
      }],
      ['inbox', 'Inbox', (gm) => {
        const t = gm.sys.tools;
        return H.card('Direct messages', 'mail-warning', H.note('Some DMs are drainers. Read the domain, ask yourself why they messaged first, and never sign anything to "receive". Opening a scam drains your hot wallet (a hardware wallet limits the damage).') +
          (t.inbox.length ? t.inbox.map((m) => msg(esc(m.from) + ' · day ' + m.day + (m.state !== 'new' ? ' · ' + m.state : ''), esc(m.text), m.state === 'new' ? H.btn('Open link', 'tools.openLink|' + m.id) + H.btn('Report scam', 'tools.report|' + m.id, 'primary') : '', m.state === 'new' ? '' : 'dim')).join('') : H.empty('No messages.')) +
          H.kv('Times you got phished', t.phished, t.phished ? 'down' : '') + H.kv('Scams reported', t.reported, 'up'));
      }],
      ['vault', 'Vault', (gm) => {
        const t = gm.sys.tools;
        return '<div class="grid-2">' + H.card('Hardware wallet (cold storage)', 'lock-keyhole', H.note('SOL in cold storage counts toward your net worth but can\'t be traded, phished or hacked. Taking it back out takes 30 minutes.') +
          (t.hw ? H.kv('Cold', sol(t.cold)) + H.kv('Hot (tradable)', sol(gm.player.sol)) + '<div class="row-btns">' + inp('vAmt', '1', 70) + doBtn('Move to cold', 'tools.deposit', '#vAmt', 'primary') + doBtn('Move to hot', 'tools.withdraw', '#vAmt') + '</div>' : H.btn('Buy a hardware wallet ($150)', 'tools.buyHw', 'primary'))) +
          H.card('Home safe', 'shield', H.note('Burglars go after homes with lots of cash lying around (over $2,500). A safe stops them.') + (t.safe ? '<p class="up">Safe installed.</p>' : H.btn('Buy a safe ($400)', 'tools.buySafe', 'primary')) + H.kv('Break-ins', t.burgled, t.burgled ? 'down' : '')) + '</div>';
      }],
      ['launder', 'Wallet hops', (gm) => {
        const t = gm.sys.tools, b = gm.sys.biz;
        return H.card('Hop funds through fresh wallets', 'shuffle', H.note('Fiction only. Split funds through fresh wallets so sleuths have a harder time linking you. Each hop costs 0.02 SOL and 30 minutes and cools heat by 6. Rushing it (few hops) while your heat is high can get you linked anyway.') +
          H.kv('Heat now', Math.round(b ? b.heat : 0)) + '<div class="row-btns">' + [1, 2, 4, 6].map((n) => H.btn(n + ' hop' + (n > 1 ? 's' : ''), 'tools.launder|' + n)).join('') + '</div>' +
          (t.launderLog.length ? H.table(['Day', 'Hops', 'Fee', 'Result'], t.launderLog.map((l) => [l.day, l.hops, l.fee.toFixed(2) + ' SOL', l.caught ? '<span class="down">linked</span>' : '<span class="up">clean</span>'])) : ''));
      }],
    ],
  });

  // ================= Finance (phase 5) =================
  BH.makeApp('finance', 'Finance', 'banknote', '#f4d03e', {
    sub: 'debt, firms, gigs and other people\'s money',
    badge: (gm) => { const f = gm.sys.finance, R = BH.Finance.REGIMES[f.regime]; return '<span class="ma-badge">' + icon(f.regime === 'bull' ? 'trending-up' : f.regime === 'bear' ? 'trending-down' : 'activity', 'sm') + R.label + (f.gig ? ' · working' : '') + '</span>'; },
    tabs: [
      ['gigs', 'Side gigs', (gm) => {
        const f = gm.sys.finance, act = gm.sys.story ? gm.sys.story.act : 1;
        if (f.gig) { const d = BH.Finance.GIGS[f.gig.kind], done = gm.clock.total - f.gig.start; return H.card('Working: ' + d.name, 'briefcase', H.note('Time is running 20x faster. The market keeps moving; you can stop any time.') + H.kv('Hours worked', done.toFixed(1) + ' / ' + f.gig.hours) + H.meter(done / f.gig.hours * 100, '#f4d03e') + H.kv('Earned so far', usd(done * d.rate)) + H.btn('Stop and get paid', 'finance.stopGig', 'primary')); }
        return H.card('Pick up a shift', 'briefcase', H.note('Time fast-forwards while you work (20x) and you get paid per hour. Events can still interrupt you.') +
          Object.entries(BH.Finance.GIGS).map(([id, d]) => msg(esc(d.name) + ' · $' + d.rate + '/h', act < d.act ? '<span class="dim">Unlocks in act ' + d.act + '.</span>' : '', act < d.act ? '' : [2, 4, 8].map((h) => H.btn(h + 'h', 'finance.startGig|' + id + '|' + h)).join(''))).join('') +
          (f.gigLog.length ? H.table(['Day', 'Gig', 'Hours', 'Pay'], f.gigLog.map((l) => [l.day, esc(l.name), l.hours, usd(l.pay)])) : ''));
      }],
      ['shark', 'Loan shark', (gm) => {
        const l = gm.sys.finance.loan, lim = gm.sys.finance.limit();
        return H.card('Vinnie\'s Easy Money', 'skull', H.note('Cash now, 8% a day, due in 7 days. Miss it and Vinnie visits. Then his friend visits. They take your stuff.') +
          H.kv('You owe', usd(l.owed), l.owed ? 'down' : '') + H.kv('Due', l.due ? 'day ' + l.due + (l.overdue ? ' (' + l.overdue + ' days late)' : '') : '—', l.overdue ? 'down' : '') + H.kv('Limit', usd(lim)) +
          '<div class="row-btns">' + inp('lnAmt', '500', 80) + doBtn('Borrow', 'finance.borrow', '#lnAmt') + doBtn('Repay', 'finance.repay', '#lnAmt', 'primary') + H.btn('Repay everything', 'finance.repay') + '</div>');
      }],
      ['prop', 'Prop firm', (gm) => {
        const p = gm.sys.finance.prop, n = gm.player.netWorth();
        const st = { none: 'Not started', challenge: 'Challenge running', funded: 'Funded', failed: 'Failed (you can try again)' }[p.state];
        return H.card('Degen Capital prop challenge', 'building', H.note('Pay $' + p.fee + '. Grow your net worth 20% within 3 days without dropping 12% below your peak. Pass and you trade a 100 SOL firm account: every green day pays you 80% of its profit. A 10% loss on the firm account ends it.') +
          H.kv('Status', st, p.state === 'funded' ? 'up' : p.state === 'failed' ? 'down' : '') +
          (p.state === 'challenge' ? H.kv('Progress', ((n / p.start - 1) * 100).toFixed(1) + '% of +20%') + H.kv('Drawdown from peak', ((1 - n / p.peak) * 100).toFixed(1) + '% (max 12%)') + H.kv('Deadline', 'day ' + (p.day0 + 3)) : '') +
          (p.state === 'funded' ? H.kv('Firm account', sol(p.eq)) + H.kv('Paid to you', sol(p.paid), 'up') : '') +
          (p.state === 'challenge' || p.state === 'funded' ? '' : H.btn('Start the challenge ($' + p.fee + ')', 'finance.propStart', 'primary')) + H.kv('Failed attempts', p.fails));
      }],
      ['air', 'Airdrops', (gm) => {
        const a = gm.sys.finance.air, day = gm.clock.day;
        return H.card('Airdrop farming', 'gift', H.note('Click through fake protocols once a day each (0.02 SOL gas, 30 min). One day one of them drops. Sometimes it is big. Sometimes you get flagged as a sybil and get nothing.') +
          H.table(['Protocol', 'Points', ''], BH.Finance.PROTOCOLS.map(([id, name]) => [esc(name), a.points[id] || 0, a.farmedDay[id] === day ? '<span class="dim">done today</span>' : H.btn('Farm', 'finance.farm|' + id)])) +
          H.kv('Total airdropped', usd(a.paid), 'up') + (a.drops.length ? H.table(['Day', 'Protocol', 'Days farmed', 'Paid'], a.drops.map((d) => [d.day, esc(d.name), d.pts, d.usd ? usd(d.usd) : '<span class="down">sybil</span>'])) : ''));
      }],
      ['ins', 'RugShield', (gm) => {
        const i = gm.sys.finance.ins;
        return H.card('RugShield: rug insurance desk', 'umbrella', H.note('Sell rug insurance to other traders. Premiums come in daily; claims go out every time an insured coin rugs. Your reputation sells policies. If the pool goes negative you cover it from cash, and if you can\'t, it goes bust.') +
          (i.open ? H.kv('Pool', usd(i.pool), i.pool < 500 ? 'down' : '') + H.kv('Active policies', i.policies) + H.kv('Premiums collected', usd(i.premiums), 'up') + H.kv('Claims paid', usd(i.claims), 'down') + H.btn('Withdraw profit (keeps $500)', 'finance.insWithdraw') : H.btn('Open the desk ($1,000 reserve)', 'finance.insOpen', 'primary')));
      }],
      ['market', 'Market', (gm) => {
        const f = gm.sys.finance, night = gm.sim.tokens.filter((t) => !t.dead && t.night).slice(-10).reverse();
        return '<div class="grid-2">' + H.card('Market regime', 'activity', H.note('Every week the market shifts between a bull run, chop and a bear market. The same strategy stops working; adapt.') + Object.entries(BH.Finance.REGIMES).map(([id, r]) => H.kv((id === f.regime ? '▶ ' : '') + r.label, 'launch hype ×' + r.mul, id === f.regime ? 'brand' : 'dim')).join('')) +
          H.card('Night market (midnight to 5 am)', 'moon', H.note('After midnight, launches get wild: crazier hype swings, faster deaths. ' + f.nightCount + ' night launches so far.') + (night.length ? H.table(['Coin', 'MC'], night.map((t) => [coinLink(gm, t.id, t.ticker), F.usd(gm.sim.mc(t))])) : H.empty('No night coins alive. Come back after midnight.'))) + '</div>';
      }],
    ],
  });

  // ================= Empire (phase 6) =================
  BH.makeApp('empire', 'Empire', 'castle', '#ff7a45', {
    sub: 'suppliers, turf, side businesses and contracts',
    badge: (gm) => { const e = gm.sys.empire, W = BH.Empire.WEATHER.find((w) => w[0] === e.weather); return '<span class="ma-badge">' + icon('cloud-sun', 'sm') + (W ? W[1] : '') + ' · ' + ({ us: 'US hours', asia: 'Asia hours', eu: 'EU hours' }[e.window()]) + '</span>'; },
    tabs: [
      ['contracts', 'Contracts', (gm) => {
        const e = gm.sys.empire;
        return '<div class="grid-2">' + H.card('Job board', 'clipboard-list', H.note('One-off jobs from people around town. New ones every day. Hold up to 3.') + (e.board.length ? e.board.map((c) => msg(usd(c.reward) + ' · ' + c.days + ' days', esc(c.text), H.btn('Take it', 'empire.accept|' + c.id, 'primary'))).join('') : H.empty('Board is empty until tomorrow.'))) +
          H.card('Your contracts', 'clipboard-check', e.contracts.length ? e.contracts.map((c) => msg(usd(c.reward) + ' · due day ' + c.deadline, esc(c.text))).join('') : H.empty('None taken.')) + '</div>';
      }],
      ['supply', 'Suppliers', (gm) => {
        const e = gm.sys.empire;
        return H.card('Supply chain', 'truck', H.note('Meme Lab recipes use one art pack and one meme pack each (better art = higher score). Bot followers pump your follower count and your heat. The Telegram guy is cheap and sometimes never delivers.') +
          H.kv('Art packs', e.stock.art + (e.stock.art ? ' (quality +' + Math.round(e.stock.artQ) + ')' : '')) + H.kv('Meme packs', e.stock.memes) + H.kv('On the way', e.orders.length) +
          H.table(['Supplier', 'Art pack', 'Meme pack', 'Bot followers', 'Order'], BH.Empire.SUPPLIERS.map((s) => [esc(s.name), s.art ? usd(s.art[0]) + ' (q ' + s.art[1] + ')' : '—', s.memes ? usd(s.memes[0]) : '—', s.bots ? usd(s.bots[0]) : '—',
            (s.art ? H.btn('Art ×3', 'empire.order|' + s.id + '|art|3') : '') + ' ' + (s.memes ? H.btn('Memes ×3', 'empire.order|' + s.id + '|memes|3') : '') + ' ' + (s.bots ? H.btn('Bots ×1', 'empire.order|' + s.id + '|bots|1') : '')])));
      }],
      ['ventures', 'Businesses', (gm) => {
        const e = gm.sys.empire;
        return '<div class="xgrid">' + Object.entries(BH.Empire.VENTURES).map(([id, v]) => { const run = e.ventures[id]; return '<div class="card item' + (run ? ' owned' : '') + '"><b>' + esc(v.name) + '</b><span class="price">' + usd(v.cost) + '</span><p>' + esc(v.desc) + '</p>' + (run ? '<small class="dim">Running since day ' + run.since + ' · earned ' + usd(run.earned) + (id === 'course' ? ' · ' + run.mode : '') + '</small>' + H.btn('Close', 'empire.close|' + id, 'ghost') : (id === 'course' ? '<div class="row-btns">' + H.btn('Honest course', 'empire.open|course|honest', 'primary') + H.btn('Hype course', 'empire.open|course|hype') + '</div>' : H.btn('Open', 'empire.open|' + id, 'primary'))) + '</div>'; }).join('') + '</div>';
      }],
      ['turf', 'Territories', (gm) => {
        const e = gm.sys.empire;
        return H.card('Communities you run', 'flag', H.note('Take over chat communities (raiders help a lot). Each one pays creator fees every day. The Rush Gang raids them; mods help you hold them.') +
          H.table(['Community', 'Cost', 'Pays/day', 'Defense', ''], BH.Empire.TERRITORIES.map((t) => [esc(t.name), usd(t.cost), usd(t.pay), t.defense, e.terr[t.id] ? '<span class="up">yours · ' + usd(e.terr[t.id].earned) + '</span>' : H.btn('Raid', 'empire.capture|' + t.id)])));
      }],
      ['coop', 'Co-op devs', (gm) => {
        const e = gm.sys.empire;
        return H.card('Launch with a partner', 'handshake', H.note('A partner dev brings their followers to a shared launch. Some are honest. Some will rug you first. You can only guess from their history. Needs the dev desk.') +
          e.partners.map((pt) => msg(esc(pt.name), 'Wants a ' + pt.share + '% split. Their last coins: ' + (pt.honesty > 70 ? 'mostly clean' : pt.honesty > 40 ? 'mixed' : 'a lot of "dev went to sleep"') + '.', H.btn('Co-launch', 'empire.coLaunch|' + pt.id, 'primary'))).join('') +
          (e.coops.length ? H.table(['Coin', 'Partner', 'Outcome'], e.coops.map((c) => [coinLink(gm, c.coin, c.ticker), esc(c.partner), c.done ? '<span class="down">rugged you</span>' : c.rugAt ? '…' : '<span class="up">loyal</span>'])) : ''));
      }],
      ['town', 'Around town', (gm) => {
        const e = gm.sys.empire, b = gm.sys.build, owned = BH.Build.CATALOG.filter((it) => b.count(it.id) > 0);
        return '<div class="grid-2">' + H.card('Pawn shop', 'store', H.note('Broke? Sell gear for 45% of what you paid.') + (owned.length ? H.table(['Item', 'Owned', 'Pays', ''], owned.map((it) => [esc(it.name), b.count(it.id), usd(it.price * 0.45), H.btn('Pawn', 'empire.pawn|' + it.id)])) : H.empty('Nothing to pawn.'))) +
          H.card('Your day', 'sun', H.kv('Weather', (BH.Empire.WEATHER.find((w) => w[0] === e.weather) || ['', '?'])[1]) + H.kv('Time window', { us: 'US hours (2pm-10pm): calls land harder', asia: 'Asia hours (midnight-6am): your launches start hotter', eu: 'EU hours' }[e.window()]) + H.kv('Internet', e.lag ? '<span class="down">flaky today</span>' : 'fine') +
            H.kv('Paper-hands meter', Math.round(e.paper) + '%', e.paper > 60 ? 'down' : '') + H.meter(e.paper, '#ff4d5e') + H.kv('Lucky items record', e.rituals.green + ' green / ' + e.rituals.red + ' red') + H.kv('Mentor skills', Object.keys(e.skills).join(', ') || 'none yet') + H.kv('Dates', e.dates) + H.kv('Court appearances', e.trials) +
            H.note('New gear in the Shop: mechanical keyboard, router, lucky candle and socks, AC, streaming setup, meme studio, car.')) + '</div>';
      }],
    ],
  });

  // ================= Life (phase 7) =================
  BH.makeApp('life', 'Life', 'heart', '#2bd67b', {
    sub: 'everything that isn\'t a chart',
    badge: (gm) => { const l = gm.sys.life; return '<span class="ma-badge">' + icon('trophy', 'sm') + 'Season ' + l.season.n + ' · ' + Math.round(l.season.xp) + ' XP' + (l.tilt() >= 3 ? ' · tilted' : '') + '</span>'; },
    tabs: [
      ['daily', 'Challenges', (gm) => {
        const l = gm.sys.life, d = l.daily;
        return '<div class="grid-2">' + H.card('Today\'s challenges', 'target', d ? d.ids.map((id) => { const c = BH.Life2.CHALLENGES.find((x) => x.id === id); const ok = d.done.includes(id); return msg((ok ? '✓ ' : '') + usd(c.reward), esc(c.text), '', ok ? 'dim' : ''); }).join('') : H.empty('New challenges tomorrow.')) +
          H.card('Season ' + l.season.n + ' pass', 'medal', H.kv('XP', Math.round(l.season.xp)) + BH.Life2.TIERS.map(([xp, item]) => H.kv((l.season.rewards.includes(item) ? '✓ ' : '') + esc(item), xp + ' XP', l.season.rewards.includes(item) ? 'up' : 'dim')).join('') + H.note('A new season starts every 14 days.')) + '</div>';
      }],
      ['chat', 'Group chat', (gm) => {
        const l = gm.sys.life;
        return H.card('the group chat', 'message-circle', l.chat.length ? l.chat.slice(0, 30).map((m) => msg(esc(m.who) + ' · day ' + m.day + ' ' + m.hour + ':00', esc(m.text))).join('') : H.empty('Quiet. Make a big trade and they will have opinions.'));
      }],
      ['out', 'Go out', (gm) => {
        const l = gm.sys.life, t = gm.sys.trencher;
        return '<div class="grid-2">' + H.card('Trips & work', 'plane',
          msg('Degen conference · $1,500 · 24h', 'Panels, parties and people. +2 clients, +6% followers, very tired.', H.btn('Go', 'life.conference', 'primary')) +
          msg('Ghost-write a thread for a KOL', 'Quick (2h, $80) or well-researched (5h, $250, might go viral).', H.btn('Quick', 'life.ghostwrite|quick') + H.btn('Well-researched', 'life.ghostwrite|good', 'primary')) +
          msg('Weekly hackathon · 6h', 'Build a "utility" coin for a grant. Better with Meme Lab experience and in later acts.' + (l.hacks.length ? ' <span class="dim">Last: score ' + l.hacks[0].score + (l.hacks[0].place ? ', place ' + l.hacks[0].place : '') + '</span>' : ''), H.btn('Enter', 'life.hackathon', 'primary'))) +
          H.card('The influencer house', 'house', H.note('Live with other traders: shared rent ($120/day), +2% followers a day, alpha tips, and drama. Someone always steals your calls. Needs 5,000 followers (' + Math.round(t ? t.followers : 0).toLocaleString() + ' now).') + (l.house ? H.btn('Move out', 'life.moveOut') : H.btn('Move in', 'life.moveIn', 'primary'))) + '</div>';
      }],
      ['pets', 'Pets', (gm) => {
        const l = gm.sys.life;
        return '<div class="grid-2">' + Object.entries(BH.Life2.PETS).map(([id, p]) => H.card(p.name, 'fish', H.note(p.desc) + (l.pets[id] ? '<p class="up">Yours since day ' + l.pets[id].since + '.</p>' : H.btn('Adopt ($' + p.cost + ')', 'life.adopt|' + id, 'primary')))).join('') + '</div>' +
          (l.oracle.length ? H.card('Goldfish picks', 'sparkles', H.table(['Day', 'Pick', 'Result'], l.oracle.map((o) => [o.day, coinLink(gm, o.coin, o.ticker), o.result ? (o.result === '2x!' ? '<span class="up">2x!</span>' : '<span class="down">' + o.result + '</span>') : '…']))) : '');
      }],
      ['cards', 'Collectibles', (gm) => {
        const l = gm.sys.life;
        return H.card('Holder PFP drops', 'gem', H.note('When one of your coins passes 40 holders, a collectible may drop. Rarer ones sell for more.') + (l.cards.length ? H.table(['Card', 'Rarity', 'Value', ''], l.cards.map((c) => [esc(c.name), c.rarity, usd(c.value), H.btn('Sell', 'life.sellCard|' + c.id)])) : H.empty('No collectibles yet. Launch a coin that people actually hold.')));
      }],
      ['journal', 'Journal', (gm) => {
        const l = gm.sys.life, p = gm.player, tilt = l.tilt();
        return '<div class="grid-2">' + H.card('Trading journal', 'notebook-pen', (tilt >= 3 ? '<div class="banner">' + icon('triangle-alert') + tilt + ' losses in a row. You are tilted. Step away, eat something, or at least size down.</div>' : H.kv('Tilt', tilt + ' losses in a row', tilt ? 'down' : 'up')) +
          (p.closed.length ? H.table(['Coin', 'PnL', 'x', 'Note'], p.closed.slice(0, 15).map((c, i) => ['$' + esc(c.ticker), H.sign(c.pnl, 2), (c.mult || 0).toFixed(2), esc(l.notes[c.id + ':' + c.at] || '') + ' ' + inp('jn' + i, '', 110) + doBtn('Save', 'life.note|' + i, '#jn' + i)])) : H.empty('No closed trades yet.'))) +
          H.card('Dreams', 'moon', l.dreams.length ? l.dreams.map((d) => msg('Night ' + d.day, esc(d.text))).join('') : H.empty('You sleep fine. For now.')) + '</div>';
      }],
      ['cemetery', 'Cemetery', (gm) => {
        const list = gm.sys.life.cemetery();
        return H.card('Coin cemetery', 'skull', H.note('Every coin you held that rugged or went to near zero. Rest in peace.') + (list.length ? '<div class="xgrid">' + list.map((c) => '<div class="card item"><b>' + icon('skull', 'sm') + ' $' + esc(c.ticker) + '</b><p>' + (c.rugged ? 'Rugged' : 'Faded away') + ' · you lost ' + Math.abs(c.pnl).toFixed(2) + ' SOL</p></div>').join('') + '</div>' : H.empty('Empty. Enjoy it while it lasts.')));
      }],
      ['museum', 'Museum', (gm) => {
        const l = gm.sys.life, p = gm.player, best = p.st && p.st.best, pct = (p.netWorth() / p.startSol - 1) * 100;
        return '<div class="grid-2">' + H.card('Stats museum', 'landmark', l.museum().map(([k, v]) => H.kv(esc(k), esc(String(v)))).join('')) +
          H.card('Flex card', 'camera', '<div class="flex-card"><div class="fc-top">' + BH.LOGO + '<span>Degen Life</span></div><div class="fc-big ' + (pct >= 0 ? 'up' : 'down') + '">' + (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%</div><div class="fc-row"><span>Net worth</span><b>' + p.netWorth().toFixed(2) + ' SOL</b></div><div class="fc-row"><span>Best trade</span><b>' + (best ? '$' + esc(best.ticker) + ' ' + (best.pnl >= 0 ? '+' : '') + best.pnl.toFixed(2) : '—') + '</b></div><div class="fc-row"><span>Day</span><b>' + gm.clock.day + '</b></div></div>' + H.note('Screenshot it (Win+Shift+S) and post it. Fake SOL, real flex.')) + '</div>';
      }],
      ['modes', 'Modes', (gm) => {
        const l = gm.sys.life, nc = gm.meta.nextChallenge || 'none';
        return '<div class="grid-2">' + H.card('Challenge runs', 'dice-5', H.note('Pick a handicap for your next life (it starts after you retire). Current: <b>' + esc(nc) + '</b>. Retiring is in the pause menu once you reach $1M (or take the real job).') + '<div class="row-btns">' + [['none', 'None'], ['debt', 'Start $3,000 in debt'], ['broke', 'Start with 1 SOL'], ['bear', 'Start in a bear market']].map(([id, l2]) => H.btn(l2, 'life.setChallenge|' + id, nc === id ? 'primary' : '')).join('') + '</div>') +
          H.card('Sandbox', 'box', H.note('Infinite money, every floor unlocked, just build your dream setup. This save stops counting for endings.') + (l.sandbox ? '<p class="brand">Sandbox is on.</p>' : H.btn('Turn this save into a sandbox', 'life.enableSandbox')) + H.note('Mods: edit mods/mod.json in the game folder to add your own coin names, Chirp lines and headlines.')) + '</div>';
      }],
    ],
  });
})(window);
