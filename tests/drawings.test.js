const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/savecodec.js', 'chart/model.js', 'chart/drawings.js');

function model() {
  const m = new BH.ChartModel(); m.setSize(1000, 500);
  const bars = []; for (let i = 0; i < 200; i++) bars.push({ t: i, o: 100, h: 110, l: 90, c: 100, v: 1 });
  m.setBars(bars); return m;
}

test('hit_hline_within_tolerance', () => {
  const m = model(), d = new BH.Drawings({});
  const id = d.add('c1', 'hline', [{ i: 50, p: 100 }]);
  const y = m.yOfPrice(100);
  assert.strictEqual(d.hitTest('c1', 300, y + 5, m), id);
  assert.strictEqual(d.hitTest('c1', 300, y + 9, m), null);
});

test('hit_trend_segment_not_past_end', () => {
  const m = model(), d = new BH.Drawings({});
  const trend = d.add('c1', 'trend', [{ i: 150, p: 95 }, { i: 170, p: 105 }]);
  const x2 = m.xOfIndex(170), y2 = m.yOfPrice(105);
  const xFar = m.xOfIndex(190), yFar = m.yOfPrice(115);
  assert.strictEqual(d.hitTest('c1', (m.xOfIndex(150) + x2) / 2, (m.yOfPrice(95) + y2) / 2, m), trend);
  assert.strictEqual(d.hitTest('c1', xFar, yFar, m), null, 'trend line ends at its second point');
  d.remove(trend);
  const ray = d.add('c1', 'ray', [{ i: 150, p: 95 }, { i: 170, p: 105 }]);
  assert.strictEqual(d.hitTest('c1', xFar, yFar, m), ray, 'a ray keeps going');
});

test('move_keeps_shape', () => {
  const d = new BH.Drawings({});
  const id = d.add('c1', 'rect', [{ i: 10, p: 100 }, { i: 20, p: 120 }]);
  d.move(id, 5, -10);
  assert.deepStrictEqual(d.get(id).points, [{ i: 15, p: 90 }, { i: 25, p: 110 }]);
});

test('drawings_survive_save', () => {
  const store = {};
  const d = new BH.Drawings(store);
  d.add('c9', 'fib', [{ i: 1, p: 10 }, { i: 9, p: 30 }]);
  d.add('c9', 'text', [{ i: 4, p: 20 }], { text: 'buy zone' });
  const sim = new BH.Sim({ seed: 2 }), player = new BH.Player(sim);
  const out = BH.SaveCodec.decode(JSON.parse(JSON.stringify(BH.SaveCodec.encode({ sim, player, game: { drawings: store } }))));
  const d2 = new BH.Drawings(out.game.drawings);
  assert.strictEqual(d2.forCoin('c9').length, 2);
  assert.strictEqual(d2.forCoin('c9')[1].text, 'buy zone');
});

test('drawings_use_time_not_index', () => {
  // points are stored by bar time so they stay put when the interval changes
  const d = new BH.Drawings({});
  const id = d.add('c1', 'hline', [{ i: 3, p: 1, t: 30 }]);
  assert.strictEqual(d.get(id).points[0].t, 30);
});
