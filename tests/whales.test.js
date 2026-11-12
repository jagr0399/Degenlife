const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const { load, CORE } = require('./helpers');
const files = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').match(/src="(game\/[^"]+)"/g).map((s) => s.slice(5, -1));
const BH = load(...CORE, 'chart/model.js', ...files);
function game(seed) { const g = BH.createGame(); g.newGame(seed || 1201); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('there_is_a_named_whale_roster_with_three_styles', () => {
  const g = game(), w = g.sys.whales;
  assert.strictEqual(w.list.length, 20);
  for (const s of ['conviction', 'swing', 'early']) assert.ok(w.list.some((x) => x.style === s));
  assert.ok(w.byAddr(w.list[0].addr));
});

test('whales_trade_and_conviction_whales_size_big_and_hold', () => {
  const g = game(1202), W = g.sys.whales, buys = [], sells = [];
  const exec = g.sim.exec.bind(g.sim);
  g.sim.exec = function (tk, addr, kind, side, amt) { const f = exec(tk, addr, kind, side, amt); const w = f && W.byAddr(addr); if (w) (side === 'buy' ? buys : sells).push({ w, tk: tk.id, t: g.sim.t, sol: f.sol, rug: !!(tk.rugged || tk.dead) }); return f; };
  run(g, 1800);
  assert.ok(buys.length > 10, 'whale buys ' + buys.length);
  for (const s of sells) { const b = buys.filter((x) => x.w === s.w && x.tk === s.tk && x.t <= s.t); if (!b.length || s.rug) continue;   // bought during the warm-up, before we started watching
    const first = Math.max(...b.map((x) => x.t)); assert.ok(s.t - first > (s.w.style === 'early' ? 3 : 20), s.w.name + ' sold ' + (s.t - first).toFixed(1) + 's after buying'); }
  const conv = buys.filter((x) => x.w.style === 'conviction');
  if (conv.length) { const per = {}; for (const b of conv) per[b.w.id + b.tk] = (per[b.w.id + b.tk] || 0) + b.sol; assert.ok(Object.values(per).some((v) => v >= 15), 'conviction sizes ' + JSON.stringify(Object.values(per).map((v) => +v.toFixed(1)))); }
});

test('no_director_wallet_flips_whale_sized_buys_straight_back', () => {
  const g = game(1203), flips = {};
  const exec = g.sim.exec.bind(g.sim), last = {};
  g.sim.exec = function (tk, addr, kind, side, amt) {
    const f = exec(tk, addr, kind, side, amt);
    if (f && kind === 'whale') { const k = tk.id + addr; if (last[k] && last[k] !== side && g.sim.t - (last[k + 't'] || 0) < 10) flips[addr] = (flips[addr] || 0) + 1; last[k] = side; last[k + 't'] = g.sim.t; }
    return f;
  };
  run(g, 900);
  const worst = Math.max(0, ...Object.values(flips));
  assert.ok(worst <= 2, 'a whale wallet flipped ' + worst + ' times within 10 s');
});

test('whale_bubbles_have_names_and_a_thesis', () => {
  const g = game(1204); run(g, 1800);
  const bub = g.sim.tokens.flatMap((t) => t.bubbles || []).filter((b) => b.kind === 'whale' && g.sys.whales.byAddr(b.addr));
  assert.ok(bub.length > 0, 'named whale bubbles');
  assert.ok(bub.every((b) => b.thesis && b.name === g.sys.whales.byAddr(b.addr).name));
});
