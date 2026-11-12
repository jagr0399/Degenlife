const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./helpers');
const BH = load('game/collide.js');

const wall = [{ minX: 1, maxX: 2, minZ: -5, maxZ: 5 }];

test('slide_along_wall', () => {
  const p = BH.Collide.slide({ x: 0.5, z: 0 }, { x: 0.4, z: 0.4 }, 0.3, wall);
  assert.ok(p.x <= 0.7 + 1e-9, 'stopped at wall: ' + p.x);
  assert.ok(Math.abs(p.z - 0.4) < 1e-9, 'kept parallel motion: ' + p.z);
});

test('no_tunneling', () => {
  const thin = [{ minX: 1, maxX: 1.2, minZ: -5, maxZ: 5 }];
  const p = BH.Collide.slide({ x: 0, z: 0 }, { x: 5, z: 0 }, 0.3, thin);
  assert.ok(p.x <= 0.7 + 1e-9, 'stopped before the box: ' + p.x);
});

test('corner_no_stick', () => {
  const boxes = [{ minX: 1, maxX: 2, minZ: -5, maxZ: 5 }, { minX: -5, maxX: 5, minZ: 1, maxZ: 2 }];
  const p = BH.Collide.slide({ x: 0.7, z: 0.0 }, { x: 0.1, z: -0.5 }, 0.3, boxes);
  assert.ok(Math.abs(p.z + 0.5) < 1e-9, 'slides away from the corner: ' + p.z);
  assert.ok(p.x <= 0.7 + 1e-9);
});

test('free_move', () => {
  const p = BH.Collide.slide({ x: 0, z: 0 }, { x: 0.2, z: -0.1 }, 0.3, wall);
  assert.deepStrictEqual(p, { x: 0.2, z: -0.1 });
});
