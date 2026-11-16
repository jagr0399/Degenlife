const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/chirp.js', 'game/world.js', 'game/macro.js', 'game/fates.js', 'game/director.js', 'game/mega.js', 'game/vamps.js', 'game/j7.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 1501); return g; }
function step(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('a_mover_meme_tweet_launches_a_race_and_the_right_coin_insta_bonds_and_runs', () => {
  let bonded = 0, ran = 0;
  for (const seed of [1501, 1502, 1503]) {
    const g = game(seed), j = g.sys.j7; j.next = 1e9;   // only our tweet
    const tw = j.meme('elon');
    step(g, 15);
    const coins = j.coinsOf(tw);
    assert.ok(coins.length >= 4, 'coins launched on the tweet: ' + coins.length);
    const right = coins.find((t) => t.j7Right);
    assert.ok(right, 'one right coin');
    assert.strictEqual(right.ticker, tw.meme.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
    assert.strictEqual(right.lp, 'pumplab'); assert.strictEqual(right.rewards, 'holders');
    for (const c of coins.filter((t) => !t.j7Right)) assert.ok(c.ticker !== right.ticker || c.lp !== 'pumplab' || c.rewards !== 'holders', 'look-alikes get one thing wrong');
    if (right.stage === 'amm' && right.migratedAt - right.born < 25) bonded++;
    step(g, 60);
    if (right.athMc > 300000) ran++;
  }
  assert.ok(bonded >= 2, 'the right coin bonds within ~25 s: ' + bonded + '/3');
  assert.ok(ran >= 2, 'and runs past $300K within ~75 s: ' + ran + '/3');
});

test('kols_post_with_real_names_and_their_trades_carry_their_name', () => {
  const g = game(1510), j = g.sys.j7;
  step(g, 240);
  const kolTweets = j.tweets.filter((t) => t.kind === 'kol');
  assert.ok(kolTweets.length >= 3, 'KOL tweets: ' + kolTweets.length);
  const names = new Set(kolTweets.map((t) => j.acc(t.acc).name));
  assert.ok([...names].some((n) => ['Cupsey', 'Cented', 'decu', 'Gake', 'Jijo', 'theo', 'dv', 'Euris', 'Orangie', 'poorgoat', 'Ansem'].includes(n)), [...names].join(','));
  assert.strictEqual(BH.J7.names[j.wallets.cupsey].name, 'Cupsey');
  j.real = false;
  assert.strictEqual(j.acc('elon').name, 'Elon Tusk', 'parody names when real names are off');
});

test('feed_has_alerts_and_noise_and_survives_save', () => {
  const g = game(1520), j = g.sys.j7;
  step(g, 300);
  const kinds = new Set(j.tweets.map((t) => t.kind));
  assert.ok(kinds.has('meme') && kinds.has('noise'), [...kinds].join(','));
  const s = JSON.parse(JSON.stringify(j.save()));
  const j2 = new BH.J7(g, s);
  assert.strictEqual(j2.tweets.length, Math.min(60, j.tweets.length));
  assert.strictEqual(j2.wallets.cupsey, j.wallets.cupsey);
});

test('tx_pace_tweets_much_more_often', () => {
  const g = game(1530), j = g.sys.j7; j.pace = 'tx'; j.next = g.sim.t;
  step(g, 200);
  assert.ok(j.tweets.filter((t) => t.kind === 'meme').length >= 3);
});

test('deploying_the_right_coin_before_the_bots_wins_the_race', () => {
  const g = game(1540), j = g.sys.j7; j.next = 1e9; g.player.sol = 20;
  const tw = j.meme('toly');
  const best = tw.meme.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  // land it right away (bots need at least 0.4 s)
  const res = g.player.launchCoin({ name: tw.meme, ticker: best, socials: { x: true }, devBuy: 1, lp: 'pumplab', rewards: 'holders', pair: 'SOL' });
  assert.ok(res.ok);
  assert.ok(res.token.j7Right && tw.won, 'you won the race');
  step(g, 20);
  const bots = j.coinsOf(tw).filter((t) => t.id !== res.token.id);
  assert.ok(!bots.some((t) => t.j7Right), 'no bot coin is the right one');
  assert.ok(g.sim.mc(res.token) > 8000 || res.token.athMc > 8000, 'snipers pumped yours: ATH ' + Math.round(res.token.athMc));
});

test('a_wrong_setup_does_not_win', () => {
  const g = game(1541), j = g.sys.j7; j.next = 1e9; g.player.sol = 20;
  const tw = j.meme('elon');
  const res = g.player.launchCoin({ name: tw.meme, ticker: 'WRONG', socials: { x: true }, devBuy: 0.5, lp: 'pumplab', rewards: 'holders', pair: 'SOL' });
  assert.ok(res.ok && !res.token.j7Right && !tw.won);
});

test('some_runners_go_mega_past_5M_and_kols_trade_them_with_named_bubbles', () => {
  let megas = 0, over5 = 0, kolBubbles = 0;
  for (let seed = 1550; seed < 1562; seed++) {
    const g = game(seed), j = g.sys.j7; j.next = 1e9; j.nextKol = 1e9;
    const tw = j.meme('elon');
    step(g, 160);
    const right = j.coinsOf(tw).find((t) => t.j7Right) || g.sim.tokens.find((t) => t.j7 === tw.id && t.j7Right);
    if (!right) continue;
    if (right.j7Mega) { megas++; if (right.athMc > 5e6) over5++; }
    const names = new Set((right.bubbles || []).map((b) => b.name));
    if ([...names].some((n) => Object.values(BH.J7.names).some((a) => a.name === n))) kolBubbles++;
  }
  assert.ok(megas >= 1, 'some J7 runners are megas: ' + megas + '/12');
  assert.ok(over5 >= 1, 'a mega goes past $5M: ' + over5 + '/' + megas);
  assert.ok(kolBubbles >= 8, 'KOL bubbles with real names on runners: ' + kolBubbles + '/12');
});

// Nov 16: J7 and the Chirp timeline are one feed; KOLs are whales; voices post takes, not tickers
test('j7_tweets_are_timeline_posts_you_can_like_and_reply_to', () => {
  const g = game(1560), j = g.sys.j7, s = g.sys.social;
  const tw = j.meme('cz');
  assert.ok(tw.pid, 'mirrored');
  const p = s.posts.find((x) => x.id === tw.pid);
  assert.ok(p && p.j7 === tw.id && p.text === tw.text);
  const likes = p.likes; s.like(p.id); assert.strictEqual(p.likes, likes + 1);
});

test('kol_buy_ins_are_2_to_5_sol_and_voices_post_no_coins', () => {
  const g = game(1561), j = g.sys.j7;
  j.next = 1e9; j.meme('elon');
  step(g, 240);
  const kolWallets = new Set(Object.values(j.wallets));
  const buys = [];
  for (const tk of g.sim.tokens) for (const tr of tk.trades || []) if (tr.side === 'buy' && kolWallets.has(tr.who || tr.addr || tr.wallet)) buys.push(tr.sol);
  assert.ok(buys.length > 0, 'kols bought');
  // 2-5 SOL; a buy that fills the last of a bonding curve gets trimmed, so allow a few under 2
  for (const b of buys) assert.ok(b <= 5.1, 'kol buy ' + b);
  assert.ok(buys.filter((b) => b >= 1.9).length / buys.length > 0.85, 'most kol buys are 2-5 SOL');
  const voices = j.tweets.filter((t) => t.kind === 'voice');
  assert.ok(voices.length > 0, 'voices posted');
  assert.ok(voices.every((t) => !t.coin), 'voices never call a coin');
  assert.ok(j.acc('cz').pfpUrl && j.acc('cz').pfpUrl.startsWith('https://pbs.twimg.com/'), 'real X picture');
  j.setReal(false); assert.strictEqual(j.acc('cz').pfpUrl, null);
});
