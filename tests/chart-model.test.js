const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./helpers');
const BH = load('chart/model.js', 'chart/indicators.js');

function bars(n, f) {
  const out = [];
  for (let i = 0; i < n; i++) { const c = f ? f(i) : 100 + 10 * Math.sin(i / 7); out.push({ t: i, o: c, h: c + 2, l: c - 2, c, v: 1 }); }
  return out;
}
function model(n) { const m = new BH.ChartModel(); m.setSize(1000, 500); m.setBars(bars(n)); return m; }

test('zoom_keeps_anchor', () => {
  const m = model(300);
  const i = m.indexOfX(600);
  const sp = m.barSpacing;
  m.zoomAt(600, 2);
  assert.ok(Math.abs(m.indexOfX(600) - i) < 0.01);
  assert.strictEqual(m.barSpacing, sp * 2);
});

test('zoom_clamps', () => {
  const m = model(300);
  for (let k = 0; k < 50; k++) m.zoomAt(500, 2);
  assert.strictEqual(m.barSpacing, 60);
  for (let k = 0; k < 50; k++) m.zoomAt(500, 0.5);
  assert.strictEqual(m.barSpacing, 1.5);
});

test('pan_stops_following', () => {
  const m = model(300);
  m.pan(-200);
  assert.strictEqual(m.following, false);
  m.goLive();
  assert.strictEqual(m.following, true);
  assert.ok(Math.abs(m.xOfIndex(299) - (1000 - m.rightOffset * m.barSpacing)) < 1e-6);
});

test('price_drag_scales', () => {
  const m = model(300);
  const before = m.priceRange.hi - m.priceRange.lo;
  m.scalePrice(100);
  assert.strictEqual(m.autoScale, false);
  assert.ok(m.priceRange.hi - m.priceRange.lo > before);
  m.resetPrice();
  assert.strictEqual(m.autoScale, true);
});

test('log_roundtrip', () => {
  const m = model(300);
  m.priceMode = 'log';
  m.fit();
  const p = m.priceOfY(m.yOfPrice(104.5));
  assert.ok(Math.abs(p - 104.5) / 104.5 < 1e-6);
});

test('flat_and_empty_series', () => {
  for (const data of [[], bars(1), bars(10, () => 50)]) {
    const m = new BH.ChartModel(); m.setSize(800, 400); m.setBars(data);
    for (const mode of ['linear', 'log', 'percent']) {
      m.priceMode = mode; m.fit();
      assert.ok(Number.isFinite(m.yOfPrice(50)), mode + ' y finite');
      assert.ok(Number.isFinite(m.priceOfY(200)), mode + ' p finite');
      const r = m.visibleRange();
      assert.ok(r.from <= r.to + 1 && Number.isInteger(r.from) && Number.isInteger(r.to));
    }
  }
});

test('ema_rsi_vwap_known_values', () => {
  const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const e = BH.Ind.ema(v, 3);
  assert.strictEqual(e.length, 10);
  assert.strictEqual(e[0], null);
  assert.ok(Math.abs(e[9] - 9) < 1e-9);
  const r = BH.Ind.rsi(v.concat([11, 12, 13, 14, 15, 16]), 14);
  assert.strictEqual(r[15], 100);
  const b = [{ h: 3, l: 1, c: 2, v: 1 }, { h: 5, l: 3, c: 4, v: 1 }, { h: 7, l: 5, c: 6, v: 1 }];
  const w = BH.Ind.vwap(b);
  assert.deepStrictEqual(w, [2, 3, 4]);
});

test('aggregate_5s', () => {
  const src = [
    { t: 0, o: 10, h: 12, l: 9, c: 11, v: 1, m: null },
    { t: 1, o: 11, h: 15, l: 11, c: 14, v: 2, m: ['B'] },
    { t: 3, o: 14, h: 14, l: 8, c: 9, v: 3, m: null },
    { t: 6, o: 9, h: 10, l: 9, c: 10, v: 1, m: ['S'] },
  ];
  const filled = BH.ChartModel.aggregate(src, 5, 12, true);
  assert.deepStrictEqual(filled.map((b) => [b.t, b.o, b.h, b.l, b.c, b.v]), [
    [0, 10, 15, 8, 9, 6], [5, 9, 10, 9, 10, 1], [10, 10, 10, 10, 10, 0],
  ]);
  // like Axiom, an empty interval prints no bar unless asked to fill
  const out = BH.ChartModel.aggregate(src, 5, 12);
  assert.deepStrictEqual(out.map((b) => b.t), [0, 5]);
  assert.strictEqual(BH.ChartModel.idxOfT(out, 6, 5), 1.2);
  assert.strictEqual(BH.ChartModel.tOfIdx(out, 1.2, 5), 6);
  assert.deepStrictEqual(out[0].m, ['B']);
  assert.deepStrictEqual(out[1].m, ['S']);
});

test('price_scale_has_a_floor', () => {
  const m = model(300);
  for (let k = 0; k < 2000; k++) m.scalePrice(-50);
  const mid = (m.priceRange.hi + m.priceRange.lo) / 2;
  assert.ok(m.priceRange.hi - m.priceRange.lo >= mid * 1e-6, 'range ' + (m.priceRange.hi - m.priceRange.lo));
});
