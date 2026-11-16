const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/chirp.js', 'game/narratives.js', 'game/fates.js', 'game/director.js', 'game/world.js', 'game/j7.js');

test('kol_bubbles_on_charts_are_real_kols_with_pictures', () => {
  const g = BH.createGame(); g.newGame(5150);
  for (let i = 0; i < 600 * 4; i++) { g.sim.step(0.25); g.player.tick(); }
  let kol = 0, named = 0, pics = 0;
  for (const tk of g.sim.tokens) for (const b of tk.bubbles || []) if (b.kind === 'kol') { kol++; const n = BH.J7.kolFor(b.addr); if (n) named++; if (n && n.pfpUrl) pics++; }
  assert.ok(kol > 5, 'kol bubbles: ' + kol);
  assert.strictEqual(named, kol, 'every KOL bubble has a KOL account');
  assert.strictEqual(pics, kol, 'and a real picture');
  const withCall = g.sim.tokens.filter((t) => t.kol);
  assert.ok(withCall.length && withCall.every((t) => t.kol.j7 || t.kol.state !== 'wait'), 'market KOL callers are real KOLs');
});
