const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js');

function world(seed) {
  const sim = new BH.Sim({ seed, mode: 'arcade' });
  const player = new BH.Player(sim);
  return { sim, player, game: { day: 1 } };
}
function run(w, n) { for (let i = 0; i < n; i++) { w.sim.step(0.25); w.player.tick(); } }
function fingerprint(w) {
  return {
    stats: JSON.stringify(w.sim.stats),
    sol: w.player.sol,
    tokens: w.sim.tokens.map((t) => t.id + ':' + (t.candles.length ? t.candles[t.candles.length - 1].c : 0)).join('|'),
  };
}
function roundtrip(w) {
  const json = JSON.stringify(BH.SaveCodec.encode(w));
  return BH.SaveCodec.decode(JSON.parse(json));
}

test('roundtrip_close_and_keeps_running', () => {
  const a = world(9);
  run(a, 600);
  const newest = a.sim.tokens[a.sim.tokens.length - 1];
  a.player.buy(newest.id, 0.5);
  run(a, 40);
  const b = roundtrip(a);
  assert.strictEqual(b.game.day, 1);
  const fa = fingerprint(a), fb = fingerprint(b);
  assert.strictEqual(fb.tokens.split('|').length, fa.tokens.split('|').length);
  assert.ok(Math.abs(b.player.sol - a.player.sol) <= 1e-6 * Math.max(1, a.player.sol));
  assert.strictEqual(fb.stats, fa.stats);
  run(b, 400);
  assert.ok(b.sim.t > a.sim.t, 'restored market keeps running');
  const json = JSON.stringify(BH.SaveCodec.encode(a));
  assert.ok(json.length < 4e6, 'save stays small: ' + (json.length / 1e6).toFixed(1) + ' MB');
});

test('roundtrip_mid_order', () => {
  const a = world(11);
  run(a, 600);
  const tk = a.sim.tokens[a.sim.tokens.length - 1];
  a.player.buy(tk.id, 0.3);
  assert.strictEqual(a.sim.orders.length, 1);
  const b = roundtrip(a);
  assert.strictEqual(b.sim.player, b.player);
  assert.strictEqual(b.player.sim, b.sim);
  run(b, 4);
  assert.strictEqual(b.sim.orders.length, 0);
  assert.strictEqual(b.player.st.buys + b.player.st.failed, 1);
});

test('version_mismatch_throws', () => {
  assert.throws(() => BH.SaveCodec.decode({ version: 99 }), (e) => e.name === 'SaveVersionError');
});
