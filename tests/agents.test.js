const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'game/clock.js', 'game/life.js', 'game/bills.js', 'chart/model.js', 'game/loop.js', 'game/actions.js', 'game/social.js', 'game/fates.js', 'game/director.js', 'game/archetypes.js', 'game/whales.js', 'game/agents.js');
function game(seed) { const g = BH.createGame(); g.newGame(seed || 1401); return g; }
function run(g, s) { for (let i = 0; i < s * 4; i++) { g.sim.step(0.25); g.player.tick(); } }

test('clip_sizes_follow_market_cap_like_the_study', () => {
  const r = Math.random;
  for (let i = 0; i < 200; i++) {
    const a = BH.Agents.clipFor(5e4, r), b = BH.Agents.clipFor(5e6, r), c = BH.Agents.clipFor(5e7, r);
    assert.ok(a >= 2 && a <= 30, 'small cap clip ' + a); assert.ok(b >= 10 && b <= 150, '$5M clip ' + b); assert.ok(c >= 24 && c <= 800, '$50M clip ' + c);
  }
});

test('the_sniper_farm_buys_new_launches_with_fixed_sizes', () => {
  const g = game(), A = g.sys.agents, buys = [];
  const exec = g.sim.exec.bind(g.sim);
  g.sim.exec = function (tk, addr, kind, side, amt) { const f = exec(tk, addr, kind, side, amt); const a = f && A.list.find((x) => x.addr === addr); if (a && side === 'buy') buys.push({ style: a.style, sol: amt, age: g.sim.t - tk.born }); return f; };
  run(g, 600);
  const sn = buys.filter((b) => b.style === 'sniper');
  assert.ok(sn.length >= 3, 'sniper buys ' + sn.length);
  assert.ok(sn.every((b) => b.sol === 0.6 || b.sol === 2.4), 'fixed preset sizes');
  assert.ok(sn.every((b) => b.age < 26), 'only brand-new launches');
});

test('small_caps_follow_a_whale_buy_and_cascade_after_a_whale_sell', () => {
  const g = game(1402), A = g.sys.agents; run(g, 120);
  const tk = g.sim.tokens.filter((t) => !t.dead && t.dir && g.sim.mc(t) < 2e5 && t.hl.length > 10)[0];
  assert.ok(tk, 'a small coin');
  const t0 = g.sim.t;
  A.react(tk, 'buy', 10); run(g, 130);
  const follows = tk.trades.filter((t) => t.t > t0).filter((t) => t.rw === 'follow' && t.side === 'buy');
  assert.ok(follows.length >= 5, 'follower buys ' + follows.length);
  const t1 = g.sim.t; A.react(tk, 'sell', 10); run(g, 70);
  assert.ok(tk.trades.filter((t) => t.t > t1).some((t) => t.rw === 'follow' && t.side === 'sell'), 'copy-sellers followed the whale out');
});

test('big_caps_fade_a_whale_buy', () => {
  const g = game(1403), A = g.sys.agents; run(g, 60);
  const tk = g.sim.tokens.find((t) => !t.dead && t.dir);
  tk.dir.off = 0.4; const mc = g.sim.mc.bind(g.sim); g.sim.mc = (t) => (t === tk ? 5e6 : mc(t));
  A.react(tk, 'buy', 50); g.sim.mc = mc;
  assert.ok(A.queue.some((q) => q.kind === 'fade' && q.coin === tk.id), 'fade sells queued');
  run(g, 45);
  assert.ok(tk.dir.off < 0.4 * 0.6, 'most of the whale push was sold back: off ' + tk.dir.off.toFixed(3));
});
