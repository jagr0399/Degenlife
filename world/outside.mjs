// The outside (Nov 12): a real 3D city block seen through every window and around the Street.
// Pieces: sky dome, road with cars driving both ways, sidewalks with people walking, a park (trees, paths, benches,
// fountain, lamps) and a skyline of buildings whose windows light up at night.
// cityView(opts) builds a whole block in its own group (local -z points away from the viewer's building);
// each piece is also exported so the Street can lay them out itself. Everything animated pushes onto `anims`,
// and setTime(d) (d: 0 night .. 1 day) relights it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex } from './textures.mjs';
import { walker } from './people.mjs';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const rbox = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 2, r);
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }
function rng(seed) { let s = seed % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ---------------- sky ----------------
export function sky(radius = 420) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x3d6fb6) }, mid: { value: new THREE.Color(0x9cc3ea) }, low: { value: new THREE.Color(0xe8eef2) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mid; c = mix(low, c, smoothstep(-0.02, 0.12, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat); m.renderOrder = -10; m.frustumCulled = false;
  const DAY = [0x3d6fb6, 0x9cc3ea, 0xe8eef2], DUSK = [0x2b2f6b, 0xd9825a, 0xf3c48c], NIGHT = [0x03050c, 0x0b1024, 0x1b2236];
  const c = new THREE.Color(), c2 = new THREE.Color();
  m.userData.setTime = (d, hour) => {
    const dusk = Math.max(0, 1 - Math.abs(d - 0.5) * 2.2) * (hour > 4 && hour < 22 ? 1 : 0);   // golden hour around sunrise / sunset
    ['top', 'mid', 'low'].forEach((k, i) => { c.setHex(NIGHT[i]).lerp(c2.setHex(DAY[i]), d); c.lerp(c2.setHex(DUSK[i]), dusk * 0.85); mat.uniforms[k].value.copy(c); });
  };
  return m;
}

// ---------------- buildings ----------------
const facade = (lit) => canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = lit ? '#10131b' : '#8d97a6'; c.fillRect(0, 0, w, h);
  for (let y = 10; y < h - 8; y += 32) for (let x = 8; x < w - 8; x += 24) {
    const on = (x * 7 + y * 13 + (x * y) % 11) % 6 < 2;
    c.fillStyle = lit ? (on ? ['#ffd79a', '#ffe7b8', '#cfe3ff'][(x + y) % 3] : '#1a1f2b') : ((x + y) % 5 ? '#5d6b80' : '#9fb4cf');
    c.fillRect(x, y, 14, 20);
  }
});
let FAC = null;
export function skyline(g, { x0 = -80, x1 = 80, z = -40, depth = 30, seed = 3, minH = 12, maxH = 60, front = null } = {}) {
  FAC = FAC || { day: facade(false), night: facade(true) };
  const r = rng(seed), list = [];
  const tints = [0x9aa3ad, 0xb7aa98, 0x7d8794, 0xa8b2bf, 0x8f8a84, 0xc9c2b6];
  for (let x = x0; x < x1;) {
    const w = 8 + r() * 14, h = minH + Math.pow(r(), 1.6) * (maxH - minH), d = 8 + r() * 10, zz = front != null ? front + d / 2 : z - r() * depth;
    const map = FAC.day.clone(), em = FAC.night.clone(); for (const t of [map, em]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 8))); t.needsUpdate = true; }
    const mat = std({ color: tints[Math.floor(r() * tints.length)], map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0, roughness: 0.75 });
    const b = mesh(new THREE.BoxGeometry(w, h, d), mat, x + w / 2, h / 2, zz); g.add(b); list.push(b);
    if (r() < 0.4) g.add(mesh(new THREE.BoxGeometry(w * 0.5, 1.6, d * 0.5), std({ color: 0x555b63 }), x + w / 2, h + 0.8, zz));   // roof box
    x += w + 1 + r() * 4;
  }
  return { list, setTime: (d) => { for (const b of list) b.material.emissiveIntensity = (1 - d) * 1.1; } };
}

// ---------------- road + cars ----------------
const CAR_COLS = [0xc81e1e, 0x1f6feb, 0xe5e7eb, 0x111418, 0x6b7280, 0x0f766e, 0xf4b23e, 0x7c3aed, 0x9ca3af, 0x14532d];
const glassM = std({ color: 0x1b2633, roughness: 0.1, metalness: 0.6 }), tyreM = std({ color: 0x111111, roughness: 0.9 }), rimM = std({ color: 0xb8bcc2, metalness: 0.9, roughness: 0.3 });
const headM = new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff2cc, emissiveIntensity: 0.4 }), tailM = new THREE.MeshStandardMaterial({ color: 0x7a0b0b, emissive: 0xff2020, emissiveIntensity: 0.4 });
export function car(seed) {
  const r = rng(seed * 97 + 5), c = new THREE.Group(), kind = r();
  const col = kind > 0.9 ? 0xf2c230 : CAR_COLS[Math.floor(r() * CAR_COLS.length)];   // ~1 in 10 is a cab
  const paint = std({ color: col, roughness: 0.3, metalness: 0.5 });
  const L = kind < 0.2 ? 4.8 : 4.2, H = kind < 0.2 ? 1.0 : 0.62;
  c.add(mesh(rbox(L, H, 1.8, 0.18), paint, 0, 0.32 + H / 2, 0));
  const cab = mesh(rbox(kind < 0.2 ? L * 0.7 : 2.2, kind < 0.2 ? 0.75 : 0.62, 1.62, 0.2), glassM, kind < 0.2 ? -0.4 : -0.25, 0.32 + H + 0.28, 0); c.add(cab);
  if (kind < 0.2) c.add(mesh(rbox(L * 0.72, 0.1, 1.66, 0.04), paint, -0.4, 0.32 + H + 0.66, 0));
  if (kind > 0.9) c.add(mesh(new THREE.BoxGeometry(0.5, 0.18, 0.25), std({ color: 0x111111, emissive: 0xfff2a0, emissiveIntensity: 0.5 }), -0.2, 0.32 + H + 0.68, 0));
  const wheels = [];
  for (const [x, z] of [[L * 0.32, 0.86], [L * 0.32, -0.86], [-L * 0.32, 0.86], [-L * 0.32, -0.86]]) { const w = new THREE.Group(); w.position.set(x, 0.34, z); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16), tyreM); t.rotation.x = Math.PI / 2; w.add(t); const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 10), rimM); rim.rotation.x = Math.PI / 2; w.add(rim); c.add(w); wheels.push(w); }
  for (const z of [-0.6, 0.6]) { c.add(mesh(new THREE.BoxGeometry(0.06, 0.12, 0.32), headM, L / 2, 0.32 + H * 0.6, z)); c.add(mesh(new THREE.BoxGeometry(0.06, 0.12, 0.32), tailM, -L / 2, 0.32 + H * 0.6, z)); }
  c.userData.wheels = wheels; c.userData.len = L;
  return c;
}
export function road(g, { x0 = -80, x1 = 80, z = -6.5, width = 7, y = 0 } = {}) {
  const asphalt = mesh(new THREE.PlaneGeometry(x1 - x0, width), std({ color: 0x2a2c30, roughness: 0.95 }), (x0 + x1) / 2, y + 0.01, z); asphalt.rotation.x = -Math.PI / 2; asphalt.receiveShadow = true; g.add(asphalt);
  const dash = std({ color: 0xe8d36a, roughness: 0.8 });
  for (let x = x0; x < x1; x += 4) { const l = mesh(new THREE.PlaneGeometry(2, 0.14), dash, x + 1, y + 0.015, z); l.rotation.x = -Math.PI / 2; g.add(l); }
  for (const s of [-1, 1]) { const curb = mesh(new THREE.BoxGeometry(x1 - x0, 0.15, 0.2), std({ color: 0x9a9a96, roughness: 0.9 }), (x0 + x1) / 2, y + 0.075, z + s * width / 2); g.add(curb); }
}
export function traffic(g, anims, { x0 = -80, x1 = 80, z = -6.5, y = 0, n = 10, seed = 1 } = {}) {
  const r = rng(seed * 13 + 1), cars = [];
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1, c = car(seed * 100 + i); c.rotation.y = dir > 0 ? 0 : Math.PI;
    c.position.set(x0 + r() * (x1 - x0), y, z + (dir > 0 ? 1.75 : -1.75)); c.userData.dyn = true; g.add(c);
    cars.push({ c, dir, v: 7 + r() * 6 });
  }
  anims.push((dt) => {
    dt = Math.min(dt, 0.1);
    for (const k of cars) {
      k.c.position.x += k.dir * k.v * dt;
      if (k.dir > 0 && k.c.position.x > x1) k.c.position.x = x0; if (k.dir < 0 && k.c.position.x < x0) k.c.position.x = x1;
      for (const w of k.c.userData.wheels) w.rotation.z -= k.v * dt / 0.34;
    }
  });
  return { setTime: (d) => { headM.emissiveIntensity = 0.4 + (1 - d) * 3; tailM.emissiveIntensity = 0.4 + (1 - d) * 2; } };
}

// ---------------- sidewalks + people ----------------
export function sidewalk(g, { x0 = -80, x1 = 80, z = -1.5, width = 3, y = 0 } = {}) {
  const tex = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#8c8e92'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke(); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set((x1 - x0) / 8, 1);
  const s = mesh(new THREE.PlaneGeometry(x1 - x0, width), std({ map: tex, roughness: 0.9 }), (x0 + x1) / 2, y + 0.02, z); s.rotation.x = -Math.PI / 2; s.receiveShadow = true; g.add(s);
}
export function pedestrians(g, anims, { x0 = -40, x1 = 40, lanes = [-1.0, -2.0], y = 0, n = 10, seed = 1 } = {}) {
  const r = rng(seed * 7 + 3), list = [];
  for (let i = 0; i < n; i++) {
    const w = walker(seed * 50 + i), dir = r() < 0.5 ? 1 : -1;
    w.userData.dyn = true; w.userData.y0 = y; w.position.set(x0 + r() * (x1 - x0), y, lanes[i % lanes.length] + (r() - 0.5) * 0.4); w.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(w);
    list.push({ w, dir, v: 1.1 * w.userData.speed });
  }
  anims.push((dt, t) => {
    dt = Math.min(dt, 0.1);
    for (const p of list) { p.w.position.x += p.dir * p.v * dt; if (p.dir > 0 && p.w.position.x > x1) p.w.position.x = x0; if (p.dir < 0 && p.w.position.x < x0) p.w.position.x = x1; p.w.userData.anim(t); }
  });
  return list;
}

// ---------------- park ----------------
const leafM = [0x2f6b34, 0x3c7d3a, 0x2a5e30, 0x4a8a3f].map((c) => std({ color: c, roughness: 0.9, flatShading: true })), barkM = std({ color: 0x5a3e2b, roughness: 0.95 });
const crownGeo = new THREE.IcosahedronGeometry(1, 1);
export function tree(seed, s = 1, sway = true) {
  const r = rng(seed * 31 + 7), t = new THREE.Group(), h = (2.2 + r() * 1.6) * s;
  t.add(mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, h, 8), barkM, 0, h / 2, 0));
  const crown = new THREE.Group(); crown.position.y = h; crown.userData.dyn = sway; t.add(crown);
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(crownGeo, leafM[Math.floor(r() * leafM.length)]); const k = (1.0 + r() * 0.7) * s; c.scale.set(k, k * 0.85, k); c.position.set((r() - 0.5) * 1.4 * s, (r() * 0.9) * s, (r() - 0.5) * 1.4 * s); c.castShadow = true; crown.add(c); }
  t.userData.crown = crown; return t;
}
export function bench() {
  const b = new THREE.Group(), wood = std({ color: 0x7a5634, roughness: 0.8 }), iron = std({ color: 0x222428, metalness: 0.6, roughness: 0.5 });
  for (let i = 0; i < 3; i++) b.add(mesh(new THREE.BoxGeometry(1.6, 0.04, 0.12), wood, 0, 0.45, -0.15 + i * 0.15));
  for (let i = 0; i < 2; i++) { const s = mesh(new THREE.BoxGeometry(1.6, 0.1, 0.03), wood, 0, 0.62 + i * 0.13, -0.24); s.rotation.x = -0.15; b.add(s); }
  for (const x of [-0.7, 0.7]) b.add(mesh(new THREE.BoxGeometry(0.05, 0.45, 0.45), iron, x, 0.225, -0.02));
  return b;
}
export function lampPost(lights) {
  const p = new THREE.Group(), iron = std({ color: 0x1f2226, metalness: 0.6, roughness: 0.45 });
  p.add(mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.6, 10), iron, 0, 1.8, 0));
  const bulb = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc27a, emissiveIntensity: 0.2 });
  p.add(mesh(new THREE.SphereGeometry(0.2, 14, 10), bulb, 0, 3.7, 0));
  if (lights) lights.push(bulb);
  return p;
}
export function park(g, anims, { x = 0, z = -22, w = 60, d = 18, y = 0, seed = 2, lights = [], sway = true } = {}) {
  const r = rng(seed * 11 + 9);
  const grassTex = canvasTex(256, 256, (c, W, H) => { c.fillStyle = '#4c8a3f'; c.fillRect(0, 0, W, H); for (let i = 0; i < 3000; i++) { c.fillStyle = ['rgba(30,70,25,.25)', 'rgba(120,170,80,.2)', 'rgba(60,110,45,.25)'][i % 3]; c.fillRect(Math.random() * W, Math.random() * H, 2, 3); } });
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(w / 6, d / 6);
  const grass = mesh(new THREE.PlaneGeometry(w, d), std({ map: grassTex, roughness: 1 }), x, y + 0.02, z); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; g.add(grass);
  const pathM = std({ color: 0xc9b99a, roughness: 0.95 });
  const p1 = mesh(new THREE.PlaneGeometry(w, 1.8), pathM, x, y + 0.03, z); p1.rotation.x = -Math.PI / 2; g.add(p1);
  const p2 = mesh(new THREE.PlaneGeometry(1.8, d), pathM, x, y + 0.031, z); p2.rotation.x = -Math.PI / 2; g.add(p2);
  // fountain in the middle
  const stone = std({ color: 0xb8b3a8, roughness: 0.8 }), water = new THREE.MeshStandardMaterial({ color: 0x5c9fd6, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 });
  const basin = mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.5, 32, 1, true), stone, x, y + 0.25, z); basin.material.side = THREE.DoubleSide; g.add(basin);
  const pool = mesh(new THREE.CircleGeometry(2.15, 32), water, x, y + 0.42, z); pool.rotation.x = -Math.PI / 2; g.add(pool);
  g.add(mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.4, 16), stone, x, y + 0.7, z));
  const jet = mesh(new THREE.ConeGeometry(0.25, 0.9, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.55, roughness: 0.1 }), x, y + 1.8, z); g.add(jet);
  jet.userData.dyn = pool.userData.dyn = true;
  anims.push((dt, t) => { jet.scale.set(1 + Math.sin(t * 5) * 0.08, 1 + Math.sin(t * 3.3) * 0.12, 1 + Math.cos(t * 5) * 0.08); pool.rotation.z = t * 0.05; });
  // trees, benches, lamps
  const trees = [];
  for (let i = 0; i < Math.round(w * d / 45); i++) {
    const tx = x + (r() - 0.5) * (w - 3), tz = z + (r() - 0.5) * (d - 3);
    if (Math.abs(tx - x) < 3.2 && Math.abs(tz - z) < 3.2) continue;   // keep the fountain clear
    if (Math.abs(tz - z) < 1.6 || Math.abs(tx - x) < 1.6) continue;  // and the paths
    const t = tree(seed * 100 + i, 0.85 + r() * 0.5, sway); t.position.set(tx, y, tz); g.add(t); trees.push(t);
  }
  if (sway) anims.push((dt, tm) => { for (let i = 0; i < trees.length; i++) { const c = trees[i].userData.crown; c.rotation.z = Math.sin(tm * 0.8 + i) * 0.02; c.rotation.x = Math.sin(tm * 0.6 + i * 1.7) * 0.015; } });
  for (let i = -2; i <= 2; i++) { if (!i) continue; const b = bench(); b.position.set(x + i * 7, y, z - 1.4); g.add(b); const b2 = bench(); b2.position.set(x + i * 7 + 2, y, z + 1.4); b2.rotation.y = Math.PI; g.add(b2); }
  for (let i = -3; i <= 3; i++) { const l = lampPost(lights); l.position.set(x + i * 8.5 + 1.5, y, z + 1.3); g.add(l); }
  return { trees, grass };
}

// ---------------- a whole block seen from a window ----------------
// The viewer's building front is at local z = 0, the street runs along x. floorY: how far below the window the street is.
export function cityView({ floorY = -8, width = 140, seed = 1, walkers = true, cars = 8 } = {}) {
  const g = new THREE.Group(), anims = [], lights = [];
  g.position.y = floorY;
  const ground = mesh(new THREE.PlaneGeometry(width * 2, 200), std({ color: 0x3a3c40, roughness: 1 }), 0, -0.02, -60); ground.rotation.x = -Math.PI / 2; g.add(ground);
  sidewalk(g, { x0: -width / 2, x1: width / 2, z: -1.6, width: 3.2 });
  road(g, { x0: -width / 2, x1: width / 2, z: -6.7, width: 7 });
  sidewalk(g, { x0: -width / 2, x1: width / 2, z: -11.8, width: 3.2 });
  const tr = traffic(g, anims, { x0: -width / 2, x1: width / 2, z: -6.7, n: cars, seed });
  if (walkers) { pedestrians(g, anims, { x0: -35, x1: 35, lanes: [-1.0, -2.2], n: 5, seed }); pedestrians(g, anims, { x0: -35, x1: 35, lanes: [-11.2, -12.4], n: 4, seed: seed + 5 }); }
  park(g, anims, { x: 0, z: -24, w: Math.min(90, width), d: 20, seed: seed + 2, lights, sway: false });
  for (let i = -5; i <= 5; i++) { const l = lampPost(lights); l.position.set(i * 12, 0, -10.6); g.add(l); }
  const sk = skyline(g, { x0: -width, x1: width, z: -44, depth: 40, seed: seed + 9 });
  // buildings on our side too, left and right of us, so the street looks lined
  const side = skyline(g, { x0: -width / 2, x1: -12, front: 0.2, seed: seed + 20, minH: 10, maxH: 30 }); const side2 = skyline(g, { x0: 12, x1: width / 2, front: 0.2, seed: seed + 21, minH: 10, maxH: 30 });
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; } });
  mergeStatic(g);
  const setTime = (d) => { sk.setTime(d); side.setTime(d); side2.setTime(d); tr.setTime(d); for (const b of lights) b.emissiveIntensity = 0.2 + (1 - d) * 3; };
  return { group: g, anims, setTime };
}

// ---------------- realistic daylight for a room ----------------
// The sun moves east to west across the windows during the day (warm and low at sunrise / sunset, white at noon),
// the moon takes over at night, the sky dome and fog follow, and the room's own lamps fade up after dark.
const SUN_NOON = new THREE.Color(0xfff1dc), SUN_LOW = new THREE.Color(0xff9a52), MOON = new THREE.Color(0x8fa8ff), tmpC = new THREE.Color();
export function daylight({ sun, hemi, scene, skyDome, outside, hour, d, wallZ = -2, cx = 0, nightLights = [], sunMax = 3.2 }) {
  const a = Math.PI * Math.min(1, Math.max(0, (hour - 6) / 12));   // 0 at 6:00, PI at 18:00
  const up = Math.sin(a);
  if (sun) {
    if (d > 0.05) { sun.position.set(cx + Math.cos(a) * 7, 1.6 + up * 6.5, wallZ - 5); sun.color.copy(SUN_LOW).lerp(SUN_NOON, Math.min(1, up * 1.6)); sun.intensity = 0.35 + sunMax * d * (0.45 + 0.55 * up); }
    else { sun.position.set(cx - 2.5, 5.5, wallZ - 5); sun.color.copy(MOON); sun.intensity = 0.55; }
  }
  if (hemi) { hemi.intensity = 0.3 + 0.75 * d; hemi.color.copy(tmpC.setHex(0x4a5a80)).lerp(SUN_NOON, d * 0.5); }
  if (skyDome) skyDome.userData.setTime(d, hour);
  if (outside) outside.setTime(d);
  if (scene) {
    scene.environmentIntensity = 0.12 + 0.3 * d;
    const fogC = skyDome ? skyDome.material.uniforms.low.value : tmpC.setHex(0x0b1024);
    if (!scene.fog) scene.fog = new THREE.Fog(fogC.clone(), 70, 330); else scene.fog.color.copy(fogC);
    scene.background = fogC.clone();
  }
  for (const n of nightLights) n.l.intensity = n.base * (0.25 + 0.95 * (1 - d));
}

// merge every static mesh under root into one mesh per material (fewer draw calls). Subtrees marked userData.dyn stay as they are.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map(), victims = [];
  const walk = (o) => {
    if (o.userData.dyn) return;
    if (o.isMesh && !o.isSkinnedMesh && !Array.isArray(o.material)) {
      const geo = o.geometry, key = o.material.uuid + '|' + Object.keys(geo.attributes).sort().join(',') + '|' + (geo.index ? 'i' : 'n') + '|' + o.castShadow + o.receiveShadow;
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [] });
      buckets.get(key).list.push(o);
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  const m4 = new THREE.Matrix4();
  for (const b of buckets.values()) {
    if (b.list.length < 2) continue;
    const geos = b.list.map((o) => o.geometry.clone().applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld)));
    const merged = mergeGeometries(geos, false); if (!merged) continue;
    const m = new THREE.Mesh(merged, b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; m.matrixAutoUpdate = false; root.add(m);
    for (const o of b.list) victims.push(o);
  }
  for (const o of victims) o.parent && o.parent.remove(o);
  return root;
}
