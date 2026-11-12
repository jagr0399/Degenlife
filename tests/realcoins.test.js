const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
// realcoins.js wraps itself around `window`; give it one that is the same BH world
global.window = global.window || global;
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'ui/realcoins.js');
const R = BH.RealCoins || global.BH.RealCoins;

const fakePool = () => Array.from({ length: 30 }, (_, i) => ({ name: 'Real Coin ' + i, ticker: 'REAL' + i, img: i % 2 ? 'https://example.com/' + i + '.png' : null, mint: 'mint' + i }));

test('coins_from_a_loaded_save_get_real_names_after_the_menu_world', () => {
  R.on = true; R.queue = []; R.pool = fakePool(); R.reskinned = null;
  let g = BH.createGame(); g.newGame(7);          // the main menu's throwaway world
  R.game = () => g; R.reskin();
  const menuSim = g.sim;
  const saved = BH.createGame(); saved.newGame(55); // "Continue": a different world replaces it
  for (const t of saved.sim.tokens) { t.realMint = null; t.name = 'Old Fake'; t.ticker = 'OLD'; }
  g = saved; R.reskin();
  assert.notStrictEqual(g.sim, menuSim);
  const live = g.sim.tokens.filter((t) => !t.dead && !t.style && t.devAddr !== 'YOU');
  assert.ok(live.length > 3);
  assert.ok(live.every((t) => t.ticker !== 'OLD'), 'every live coin in the loaded world is renamed');
  // a real coin with no picture never keeps a stock photo
  assert.ok(live.filter((t) => !t.realImg).every((t) => t.img == null));
});

test('coins_you_launched_keep_their_names', () => {
  R.on = true; R.queue = []; R.pool = fakePool(); R.reskinned = null;
  const g = BH.createGame(); g.newGame(56);
  const tk = g.sim.tokens.filter((t) => !t.dead && t.stage === 'curve').pop();
  tk.devAddr = 'YOU';
  tk.realMint = null; tk.ticker = 'MINE';
  R.reskinned = null; R.game = () => g; R.reskin();
  assert.strictEqual(tk.ticker, 'MINE');
});
