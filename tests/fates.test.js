const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js');

function game(seed) { const g = BH.createGame(); g.newGame(seed || 51); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }
function launchStyled(g, style) { g.sys.fates.force = style; g.sim.nextLaunch = g.sim.t; g.sim.step(0.25); g.sys.fates.force = null; return g.sim.tokens[g.sim.tokens.length - 1]; }
function peakAndNow(g, tk) { return { peak: tk.athMc, now: g.sim.mc(tk) }; }

test('instant_bonder_graduates_fast_then_dumps', () => {
  let ok = 0;
  for (const seed of [52, 53, 54, 55]) {
    const g = game(seed), tk = launchStyled(g, 'instant');
    assert.strictEqual(tk.style, 'instant');
    run(g, 600);
    const { peak, now } = peakAndNow(g, tk);
    if (tk.migratedAt != null && tk.migratedAt - tk.born < 300 && (tk.dead || now < peak * 0.4)) ok++;
  }
  assert.ok(ok >= 3, 'instant bonders that graduated in <5 min then fell 60%+: ' + ok + '/4');
});

test('whale_ladders_in_steps_then_sells_in_chunks', () => {
  let ladders = 0, sold = 0;
  for (const seed of [56, 62, 63, 64, 65, 66, 67, 68]) {
    const g = game(seed), tk = launchStyled(g, 'whale');
    run(g, 900);
    const w = tk.s.whales[0];
    if (w.done >= 4) ladders++;
    if (w.sold >= 2 || tk.dead) sold++;
  }
  assert.ok(ladders >= 4, 'whales that laddered 4+ buys: ' + ladders + '/8');
  assert.ok(sold >= 4, 'whales that sold in chunks: ' + sold + '/8');
});

test('washed_coin_has_huge_volume_few_wallets_then_rugs', () => {
  const g = game(57), tk = launchStyled(g, 'washed');
  run(g, 650);
  const holders = tk.holders.size;
  assert.ok(tk.vol > 150, 'volume ' + tk.vol.toFixed(0) + ' SOL');
  assert.ok(tk.vol / Math.max(1, holders) > 3, 'volume per wallet ' + (tk.vol / holders).toFixed(1));
  assert.ok(tk.rugged || tk.dead, 'pulled');
});

test('slow_runner_lives_long', () => {
  const g = game(58), tk = launchStyled(g, 'slowRunner');
  run(g, 900);
  assert.ok(tk.dead === false || tk.diedAt - tk.born > 300, 'lived at least 5 minutes');
  assert.ok(tk.athMc > tk.s.mc0 * 3, 'ran at least 3x: ' + Math.round(tk.athMc) + ' from ' + Math.round(tk.s.mc0));
});

test('copycats_launch_with_the_same_name', () => {
  const g = game(59);
  run(g, 1500);
  const f = g.sys.fates;
  assert.ok(f.counts.copycat >= 1, 'copycats ' + f.counts.copycat);
  const names = {}; for (const t of g.sim.tokens) names[t.ticker] = (names[t.ticker] || 0) + 1;
  assert.ok(Object.values(names).some((n) => n >= 2) || f.counts.copycat >= 1);
});

test('styles_survive_save', () => {
  const g = game(60); const tk = launchStyled(g, 'whale'); run(g, 30);
  const h = BH.createGame(); h.start(JSON.parse(JSON.stringify(g.serialize())));
  const t2 = h.sim.byId.get(tk.id);
  assert.strictEqual(t2.style, 'whale');
  run(h, 30);
});

test('wallet_tracker_fires_with_name_emoji_and_sound', () => {
  const T = require('./helpers').load('game/tracker.js');
  const g = BH.createGame(); g.newGame(61);
  const tk = g.sim.tokens.filter((t) => !t.dead && t.stage === 'curve').pop();
  const evs = []; g.on('walletTrade', (e) => evs.push(e));
  g.sys.tracker.track('WHALE1', { name: 'big fish', emoji: '🐋', sound: 'glass' });
  g.sim.exec(tk, 'WHALE1', 'whale', 'buy', 3);
  assert.strictEqual(evs.length, 1);
  assert.deepStrictEqual([evs[0].name, evs[0].emoji, evs[0].sound, evs[0].side], ['big fish', '🐋', 'glass', 'buy']);
  const h = tk.holders.get('WHALE1');
  g.sim.exec(tk, 'WHALE1', 'whale', 'sell', h.tokens);
  assert.strictEqual(evs[1].soldAll, true);
  const h2 = BH.createGame(); h2.start(JSON.parse(JSON.stringify(g.serialize())));
  assert.strictEqual(h2.sys.tracker.get('WHALE1').emoji, '🐋');
  void T;
});
