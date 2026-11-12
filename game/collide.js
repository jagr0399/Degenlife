/* Player collision: a circle of `radius` against axis-aligned boxes on the floor plane.
   Moves in small substeps (no tunneling) and resolves X then Z, so you slide along walls. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  function hits(x, z, r, b) { return x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r; }
  function slide(pos, move, radius, boxes) {
    const r = radius == null ? 0.3 : radius;
    let x = pos.x, z = pos.z;
    const len = Math.hypot(move.x, move.z);
    const n = Math.max(1, Math.ceil(len / (r * 0.5)));
    const dx = move.x / n, dz = move.z / n;
    for (let i = 0; i < n; i++) {
      if (dx) {
        x += dx;
        for (const b of boxes) if (hits(x, z, r, b)) x = dx > 0 ? b.minX - r : b.maxX + r;
      }
      if (dz) {
        z += dz;
        for (const b of boxes) if (hits(x, z, r, b)) z = dz > 0 ? b.minZ - r : b.maxZ + r;
      }
    }
    return { x, z };
  }
  BH.Collide = { slide };
})(typeof window !== 'undefined' ? window : globalThis);
