/* A one-line description for every app and terminal page, shown in the top bar (the full text on hover), plus a plain
   explanation of how callouts work in the callout box. Loaded last: it only wraps UI.go / UI.renderInstant. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, esc = BH.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const D = {
    // trading terminal
    pulse: 'Every new coin as it launches, moves to the final stretch, and migrates. Click one to trade it. The eye shows how many people are watching.',
    discover: 'The biggest and fastest-moving coins right now, and the coins KOLs are calling.',
    token: 'One coin: the live chart, its trades, holders and top traders. Buy and sell on the right, or with the instant-trade panel.',
    trackers: 'Wallets and KOL accounts you follow. See what they buy and sell the moment they trade.',
    perps: 'Leveraged long and short bets on crypto, stocks and futures. Gains and losses are multiplied, and you can get liquidated.',
    predictions: 'Bet yes or no on what a coin or narrative does next. Pays out when the time is up.',
    portfolio: 'Everything you hold, what it is worth, and your profit or loss on each coin.',
    rewards: 'Fees and rewards you have earned from trading, referrals and your own coins.',
    launch: 'Make your own coin: name, ticker, picture, launchpad and dev buy. You are the dev now.',
    scope: 'A KOL tracker: which influencers called which coins, and how their calls did.',
    // social
    chirp: 'The crypto timeline. KOLs, celebrities and degens post calls and news here, and posts move prices. Your own posts and callouts show up here too.',
    clout: 'Your reputation as a caller: followers, trust, copy traders, your alpha group, paid deals and Spaces.',
    trencher: 'Call coins to your followers. If people buy after your call and it pumps, you gain followers and trust; dump on them and you lose it.',
    stream: 'Go live and trade on stream. Viewers come for big moves and leave when it is boring; donations and subs pay real in-game cash.',
    // business
    hustle: 'Meme Lab and your crew: make memes and content that pump the coins you hold.',
    dev: 'Coin Factory: launch coins and decide what to do with them. Build a community or rug it (heat follows rugs).',
    firm: 'Your trading firm: hire traders, give them capital, and take a cut of what they make.',
    pad: 'LaunchLab: run your own launchpad and earn fees on every coin launched on it.',
    empire: 'Businesses, property and side projects you own, and the trouble they bring.',
    // money
    bank: 'Swap cash and SOL, pay bills and rent, check debt and your savings.',
    finance: 'Side gigs (time runs fast while you work), loans, prop firm challenges and airdrops.',
    shop: 'Buy furniture, gear and upgrades for your place. Better gear helps focus and sanity.',
    daytrade: 'Trade real-looking stocks with cash during market hours. Positions close at the bell.',
    contracts: 'Daily contracts: small trading goals that refresh every day. Finish them for cash, gear and clout.',
    // safety & life
    toolkit: 'Stay safe: sniper bot settings, detective cases on rugs, a phishing inbox and cold storage for your SOL.',
    life: 'Challenges, group chat, pets, your journal and the museum of your best and worst trades.',
    news: 'Market news: launches, rugs, whales, celebrity tweets and what the market is doing today.',
    radio: 'Music while you trade. Pick a station.',
  };
  BH.ViewDesc = D;
  function show(view) {
    const bar = $('#appbar'); if (!bar) return;
    let el = $('#abDesc');
    if (!el) { el = document.createElement('span'); el.id = 'abDesc'; el.className = 'ab-desc'; const sp = bar.querySelector('.spacer'); if (sp) bar.insertBefore(el, sp); else bar.appendChild(el); }
    const t = D[view] || D[UI.app] || '';
    if (el._t !== t) { el._t = t; el.textContent = t; el.title = t; el.hidden = !t; }
  }
  const origGo = UI.go;
  UI.go = function (view) { const out = origGo.apply(this, arguments); try { show(this.view || view); } catch (e) { /* decoration only */ } return out; };

  // the callout box: say what the numbers mean, once, in plain words
  const origInst = UI.renderInstant;
  if (origInst) UI.renderInstant = function () {
    const out = origInst.apply(this, arguments);
    try {
      const box = $('#instant .in-call'); if (!box || box.querySelector('.ic-how')) return out;
      const how = document.createElement('div'); how.className = 'ic-how';
      how.innerHTML = '<b>How callouts work:</b> your call went to your followers on Chirp. <b>Buyers</b> = wallets that bought after it. ' +
        '<b>10+ buyers</b> grows your followers and trust. If it peaks <b>+50%</b> within 2 minutes it counts as a <b>hit</b>. ' +
        'Selling half your bag within 5 minutes of your own call is <b>dumping on followers</b> and costs trust. Getting rugged costs nothing.';
      box.appendChild(how);
    } catch (e) { /* decoration only */ }
    return out;
  };
  const css = document.createElement('style');
  css.textContent = '#appbar .ab-desc{flex:1 1 auto;min-width:0;margin:0 12px;color:var(--muted,#8b93a1);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#instant .in-call{flex-wrap:wrap}#instant .ic-how{flex-basis:100%;margin-top:4px;font-size:11px;line-height:1.35;color:var(--muted,#8b93a1)}#instant .ic-how b{color:var(--text,#e8ecf3);font-weight:600}';
  document.head.appendChild(css);
  void esc;
})(window);
