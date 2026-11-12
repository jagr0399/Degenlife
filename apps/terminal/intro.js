/* Descriptions for every DegenOS app (desktop hover + a one-time intro card when you first open it)
   and the tutorial card inside the computer (the 3D HUD is hidden while you're seated). Loaded last. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, icon = BH.icon, esc = BH.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const game = () => UI.game;

  const INFO = {
    terminal: ['The trading terminal', 'Pulse shows coins as they launch (New Pairs), coins close to bonding (Final Stretch) and coins that made it to a DEX (Migrated). Click a card to open its chart; buy with the presets or the floating instant panel.', 'Read the risk badges before you buy: a high top-10 %, a big dev bag, snipers or bundles usually mean a rug.'],
    chirp: ['Chirp, the timeline', 'A Twitter-style feed. Post your thoughts or call a coin to your followers; like, repost and reply to anyone. Your posts gather likes, reposts and replies over time.', 'KOL calls really move prices. Big accounts often sell into their own followers.'],
    scope: ['Scope, the call tracker', 'Every post that mentions a coin, rated STRONG / MEDIUM / WEAK by the account\'s real hit rate.', 'A STRONG call on a young coin is the closest thing to a signal. It still fails a lot.'],
    shop: ['Shop', 'Gear and places, paid in cash. Boxes arrive at your door; open them with E. Leases unlock the Apartment, Office and Tower.', 'Gear has real effects: focus, energy, sanity, sleep, desks, server racks.'],
    bank: ['Bank', 'Move money between SOL and cash, pay debt, restock the fridge and do quick side gigs.', 'Rent and bills are paid in cash. Keep enough for rent day.'],
    dev: ['Coin Factory', 'Launch your own coins from the dev desk, run giveaways, and (if you must) pull the rug.', 'Clean launches build reputation; rugs make every future launch start colder and raise your heat.'],
    firm: ['Firm', 'Hire traders with different styles and fund their wallets. They trade the same market you do.', 'Watch their mood and PnL. Bad traders lose your money fast.'],
    pad: ['LaunchLab', 'Your own launchpad: fees from every coin launched on it, server racks, moderation and marketing.', 'A rival pad fights you on fees and poaches staff.'],
    trencher: ['Trencher', 'Your caller career: call coins, grow followers and trust, unlock copy traders and paid shill offers.', 'Selling right after your own call is "dumping on followers" and costs trust.'],
    news: ['News', 'Market events, viral narratives, hacks, regulators and what happened overnight.', 'Narratives decide which coins launch hot.'],
    radio: ['Radio', 'Music stations while you trade: Lofi, Synthwave, Jazz, Chiptune, Ambient.', ''],
    hustle: ['Hustle: your memecoin business', 'Meme Lab mixes traits into coin recipes (find the combos that work). Clients buy your launches early. Hire a crew. Watch your heat.', 'Heat above 40 brings sleuths, 60 gets your launches limited, 80 brings fines.'],
    clout: ['Clout', 'Your posts and the replies to answer, named copy traders, the weekly leaderboard, a paid alpha group, brand deals, Spaces streams and a rival crew.', 'Top 3 on the weekly leaderboard get a verified badge and more reach.'],
    toolkit: ['Toolkit', 'Your own sniper bot, detective cases on suspicious coins, a DM inbox full of phishing, a hardware wallet and a safe.', 'Never sign anything to "receive" SOL. Keep savings in cold storage.'],
    finance: ['Finance', 'Side gigs that fast-forward time, a loan shark, a prop firm challenge, airdrop farming, an insurance desk, market regimes and the night market.', 'Vinnie\'s loans cost 8% a day. Really.'],
    empire: ['Empire', 'Suppliers for the Meme Lab, communities to take over, side businesses (bar, merch, course...), a job board, co-op devs and the town.', 'Businesses pay every morning. Some partners will rug you first.'],
    life: ['Life', 'Daily challenges and seasons, the group chat, pets, collectibles, trips, the journal and tilt warning, the cemetery, the museum, sandbox and challenge runs.', 'Three losses in a row? The journal will tell you to step away.'],
  };
  BH.AppInfo = INFO;

  // desktop: hover a tile to see what the app does
  const origDesk = UI.showDesktop;
  UI.showDesktop = function () {
    origDesk.apply(this, arguments);
    for (const el of document.querySelectorAll('.dk-app')) { const i = INFO[el.dataset.app]; if (i && !el.title) el.title = i[0] + ': ' + i[1]; }
  };
  // first time an app opens: a short intro card on top of it
  const origOpen = UI.openApp;
  UI.openApp = function (id, view) {
    origOpen.apply(this, arguments);
    const gm = game(); if (!gm) return;
    gm.flags = gm.flags || {};
    if (['hustle', 'clout', 'toolkit', 'finance', 'empire', 'life'].includes(id)) gm.flags.newApp = true;
    const seen = gm.flags.seenApp = gm.flags.seenApp || {};
    const info = INFO[id]; if (!info || seen[id] || !UI.el) return;
    seen[id] = true;
    const card = document.createElement('div'); card.className = 'app-intro';
    card.innerHTML = '<div><b>' + icon('info', 'sm') + esc(info[0]) + '</b><p>' + esc(info[1]) + '</p>' + (info[2] ? '<p class="tip">' + icon('lightbulb', 'sm') + esc(info[2]) + '</p>' : '') + '</div><button class="btn sm" data-x>Got it</button>';
    card.querySelector('[data-x]').onclick = () => card.remove();
    UI.el.prepend(card);
  };

  // the tutorial inside the computer
  function tutCard() {
    let el = $('#termTut');
    const gm = game(), tu = gm && gm.sys && gm.sys.tutorial, st = tu && tu.current();
    if (!st || st.id === 'goal') { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'termTut';
      document.body.appendChild(el);
      el.addEventListener('click', (e) => { if (e.target.closest('[data-skip]')) { tu.skip(); el.remove(); } if (e.target.closest('[data-min]')) el.classList.toggle('min'); });
    }
    const n = BH.Tutorial.STEPS.indexOf(st) + 1;
    const html = '<div class="tt-top"><span>Tutorial ' + n + '/' + BH.Tutorial.STEPS.length + '</span><button data-min title="Minimize">' + icon('minus', 'sm') + '</button><button data-skip>Skip</button></div><div class="tt-bar"><i style="width:' + Math.round((n - 1) / BH.Tutorial.STEPS.length * 100) + '%"></i></div><b>' + esc(st.title) + '</b><p>' + esc(st.text) + '</p>' + (st.why ? '<p class="tt-why">' + esc(st.why) + '</p>' : '');
    if (el._h !== html) { el._h = html; el.innerHTML = html; }
  }
  const origRender = UI.render;
  UI.render = function (full) { origRender.call(this, full); try { tutCard(); } catch (e) { /* ignore */ } };
})(window);
