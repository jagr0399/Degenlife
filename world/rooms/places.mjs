// Apartment, Office floor, Tower and Street, plus owned gear (boxes, plants, RGB, coffee, radio, cat) for any room.
// Every builder returns { group, colliders, interactables, spawn, seat, screens, setTime(hour, scene), update(dt, game) }.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as P from '../props.mjs';
import { carpet, drywall, cityNight, cityDay, canvasTex, cardboard } from '../textures.mjs';
import { makeScreen } from '../walls.mjs';
import { model } from '../models.mjs';
import * as Dec from '../decor.mjs';
import { person } from '../people.mjs';
import * as Out from '../outside.mjs';

const std = (o) => new THREE.MeshStandardMaterial(o);
const rbox = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, r);
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function woodFloor(rep) {
  return canvasTex(512, 512, (c, w, h) => {
    for (let i = 0; i < 8; i++) { const y = i * h / 8; c.fillStyle = ['#6b4a30', '#73502f', '#5f4128', '#7a5634'][i % 4]; c.fillRect(0, y, w, h / 8); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, y, w, 2); c.fillRect(((i * 197) % w), y, 2, h / 8); for (let k = 0; k < 40; k++) { c.fillStyle = 'rgba(40,25,10,.12)'; c.fillRect(Math.random() * w, y + Math.random() * h / 8, 30 + Math.random() * 60, 1); } }
  }, { repeat: rep });
}
function tileFloor(rep, a, b) { return canvasTex(256, 256, (c, w, h) => { for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? a : b; c.fillRect(x * 64, y * 64, 64, 64); c.strokeStyle = 'rgba(0,0,0,.35)'; c.strokeRect(x * 64 + .5, y * 64 + .5, 63, 63); } }, { repeat: rep }); }

// ---- the shell: floor, ceiling, walls with window holes in the back wall, a door on the right wall, the city outside ----
function shell(o) {
  const g = new THREE.Group(), colliders = [], hw = o.w / 2, hd = o.d / 2, H = o.h;
  const solid = (minX, maxX, minZ, maxZ) => colliders.push({ minX, maxX, minZ, maxZ });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.d), o.floor); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.d), std({ color: o.ceil || 0xb9bcbc, roughness: 0.95 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; g.add(ceil);
  const wt = drywall([2, 1.3], o.wallTint);
  const wallMat = std({ ...wt, bumpScale: 0.4, roughness: 0.92 });
  const wall = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = m.castShadow = true; g.add(m); };
  const wins = (o.windows || []).slice().sort((a, b) => a[0] - b[0]), wy0 = o.winY0 || 0.95, wy1 = o.winY1 || 2.0;
  let x = -hw;
  for (const [x0, x1] of wins) { if (x0 > x) wall(x0 - x, H, (x + x0) / 2, H / 2, -hd, 0); wall(x1 - x0, wy0, (x0 + x1) / 2, wy0 / 2, -hd, 0); wall(x1 - x0, H - wy1, (x0 + x1) / 2, (H + wy1) / 2, -hd, 0); x = x1; }
  if (x < hw) wall(hw - x, H, (x + hw) / 2, H / 2, -hd, 0);
  wall(o.w, H, 0, H / 2, hd, Math.PI); wall(o.d, H, -hw, H / 2, 0, Math.PI / 2); wall(o.d, H, hw, H / 2, 0, -Math.PI / 2);
  solid(-hw - 1, -hw + 0.05, -hd - 1, hd + 1); solid(hw - 0.05, hw + 1, -hd - 1, hd + 1); solid(-hw - 1, hw + 1, -hd - 1, -hd + 0.05); solid(-hw - 1, hw + 1, hd - 0.05, hd + 1);
  const frame = std({ color: 0xe8e6e0, roughness: 0.5 });
  for (const [x0, x1] of wins) {
    for (const [w, h, px, py] of [[x1 - x0 + 0.1, 0.05, (x0 + x1) / 2, wy0 - 0.025], [x1 - x0 + 0.1, 0.05, (x0 + x1) / 2, wy1 + 0.025], [0.05, wy1 - wy0, x0 - 0.025, (wy0 + wy1) / 2], [0.05, wy1 - wy0, x1 + 0.025, (wy0 + wy1) / 2]]) g.add(mesh(new THREE.BoxGeometry(w, h, 0.12), frame, px, py, -hd));
  }
  // the real outside: a 3D street, park and skyline below the windows, and a sky dome
  const outside = Out.cityView({ floorY: o.floorY != null ? o.floorY : -8, width: 160, seed: o.seed || 1, walkers: (o.floorY || -8) > -30 });
  outside.group.position.z = -hd - 0.6; g.add(outside.group);
  const skyDome = Out.sky(); g.add(skyDome);
  const facadeMat = std({ color: 0x8b8f96, roughness: 0.9 });   // the outer wall of our building around the windows
  const fz = -hd - 0.3; g.add(mesh(new THREE.BoxGeometry(o.w + 0.6, 0.6, 0.6), facadeMat, 0, -0.3, fz));
  const sun = new THREE.DirectionalLight(0x8fa8ff, 0.9); sun.position.set(-1.5, 3.5, -hd - 4); sun.target.position.set(0.5, 0, 0.3);
  sun.castShadow = true; Object.assign(sun.shadow.camera, { left: -hw - 1, right: hw + 1, top: 4, bottom: -4 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; g.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0x4a5a80, 0x2a2018, 0.4); g.add(hemi);
  const dr = P.door(); dr.position.set(hw - 0.025, 0, hd - 0.9); dr.rotation.y = -Math.PI / 2; g.add(dr);
  const moonCol = new THREE.Color(0x8fa8ff), sunCol = new THREE.Color(0xffe6c4);
  function setTime(hour, scene) {
    const d = smooth(5.5, 8, hour) * (1 - smooth(18, 20.5, hour));
    Out.daylight({ sun, hemi, scene, skyDome, outside, hour, d, wallZ: -hd, cx: 0, nightLights: g.userData.nightLights || [] });
    return d;
  }
  return { g, colliders, solid, setTime, door: dr, hw, hd, outside };
}

// ---- props ----
export function desk(w = 1.6, d = 0.7) { const g = new THREE.Group(); const top = std({ color: 0x3b2a1e, roughness: 0.55 }); g.add(mesh(rbox(w, 0.04, d, 0.01), top, 0, 0.74, 0)); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.BoxGeometry(0.04, 0.72, 0.04), P.MAT.plasticDark, x * (w / 2 - 0.05), 0.36, z * (d / 2 - 0.05))); return g; }
export function monitor(tex, w = 0.62) {
  const g = new THREE.Group(), h = w * 0.58;
  g.add(mesh(rbox(w + 0.03, h + 0.03, 0.03, 0.006), P.MAT.plasticDark, 0, 0.18 + h / 2, 0));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.0 })); scr.position.set(0, 0.18 + h / 2, 0.017); g.add(scr);
  g.add(mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), P.MAT.plasticDark, 0, 0.09, -0.03)); g.add(mesh(rbox(0.22, 0.015, 0.16, 0.005), P.MAT.plasticDark, 0, 0.008, -0.03));
  return g;
}
function bed() { const g = new THREE.Group(); g.add(mesh(rbox(1.5, 0.35, 2.1, 0.04), std({ color: 0x3a2c22, roughness: 0.7 }), 0, 0.18, 0)); g.add(mesh(rbox(1.4, 0.22, 2.0, 0.08), P.MAT.sheet, 0, 0.45, 0)); g.add(mesh(rbox(1.42, 0.08, 1.3, 0.04), std({ color: 0x2f4a6b, roughness: 0.95 }), 0, 0.58, 0.32)); for (const x of [-0.35, 0.35]) g.add(mesh(rbox(0.55, 0.12, 0.35, 0.05), std({ color: 0xe8e4da, roughness: 0.95 }), x, 0.62, -0.75)); g.add(mesh(rbox(1.5, 0.9, 0.08, 0.03), std({ color: 0x3a2c22, roughness: 0.7 }), 0, 0.6, -1.06)); return g; }
function couch() { const g = new THREE.Group(), m = std({ color: 0x4b5563, roughness: 0.9 }); g.add(mesh(rbox(1.9, 0.42, 0.85, 0.08), m, 0, 0.25, 0)); g.add(mesh(rbox(1.9, 0.5, 0.2, 0.08), m, 0, 0.6, -0.33)); for (const x of [-0.88, 0.88]) g.add(mesh(rbox(0.18, 0.55, 0.85, 0.06), m, x, 0.38, 0)); return g; }
function rack(seed) {
  const g = new THREE.Group(); g.add(mesh(rbox(0.6, 2.0, 0.9, 0.02), std({ color: 0x3a3f4a, roughness: 0.35, metalness: 0.5 }), 0, 1.0, 0));
  const leds = []; for (let i = 0; i < 14; i++) { const on = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.012), new THREE.MeshBasicMaterial({ color: i % 5 === 0 ? 0xff6b3d : 0x2bd67b, toneMapped: false })); on.position.set(-0.22 + (i % 7) * 0.03, 0.35 + Math.floor(i / 7) * 0.7 + (seed % 3) * 0.1, 0.452); g.add(on); leds.push(on); }
  for (let i = 0; i < 8; i++) g.add(mesh(new THREE.BoxGeometry(0.54, 0.008, 0.01), std({ color: 0x2a2e36 }), 0, 0.25 + i * 0.22, 0.451));
  g.userData.leds = leds; return g;
}
const pfpTex = {};
function pfpTexture(i) { const k = i % 144; if (!pfpTex[k]) { const t = new THREE.TextureLoader().load('assets/pfp/p' + String(k + 1).padStart(2, '0') + '.svg'); t.colorSpace = THREE.SRGBColorSpace; pfpTex[k] = t; } return pfpTex[k]; }
export function npc(pfpIdx, shirt) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 12), std({ color: shirt || 0x334155, roughness: 0.85 }), 0, 0.82, 0));
  const head = mesh(new THREE.SphereGeometry(0.15, 20, 14), std({ color: 0xd9a77e, roughness: 0.7 }), 0, 1.33, 0); g.add(head);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), new THREE.MeshBasicMaterial({ map: pfpTexture(pfpIdx) })); face.position.set(0, 1.33, 0.152); g.add(face);
  g.userData.head = head; g.userData.face = face; return g;
}
export function cat() {
  const g = new THREE.Group(), fur = std({ color: 0xd08a3c, roughness: 0.95 });
  g.add(mesh(new THREE.CapsuleGeometry(0.09, 0.22, 4, 10), fur, 0, 0.12, 0)); g.children[0].rotation.x = Math.PI / 2;
  const head = mesh(new THREE.SphereGeometry(0.08, 14, 10), fur, 0, 0.2, 0.18); g.add(head);
  for (const x of [-0.045, 0.045]) { const ear = mesh(new THREE.ConeGeometry(0.03, 0.06, 8), fur, x, 0.28, 0.18); g.add(ear); }
  const tail = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.3, 6), fur, 0, 0.22, -0.2); tail.rotation.x = -0.9; g.add(tail);
  g.userData.tail = tail; return g;
}
function radio() { const g = new THREE.Group(); g.add(mesh(rbox(0.34, 0.2, 0.12, 0.02), std({ color: 0x8b5e34, roughness: 0.6 }), 0, 0.1, 0)); g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 20), P.MAT.plasticDark, -0.08, 0.1, 0.061)); g.children[1].rotation.x = Math.PI / 2; g.add(mesh(new THREE.BoxGeometry(0.1, 0.05, 0.01), new THREE.MeshBasicMaterial({ color: 0xf4b23e, toneMapped: false }), 0.08, 0.12, 0.061)); return g; }
function coffeeMachine() { const g = new THREE.Group(); g.add(mesh(rbox(0.28, 0.38, 0.3, 0.03), std({ color: 0x1c1f26, roughness: 0.35, metalness: 0.5 }), 0, 0.19, 0)); g.add(mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 14), std({ color: 0xffffff }), 0, 0.06, 0.07)); g.add(mesh(new THREE.BoxGeometry(0.06, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0x2bd67b, toneMapped: false }), 0.08, 0.3, 0.151)); return g; }
function plant() { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.25, 16), std({ color: 0xb85c38, roughness: 0.8 }), 0, 0.125, 0)); const leaf = std({ color: 0x3f8f4a, roughness: 0.8 }); for (let i = 0; i < 7; i++) { const l = mesh(new THREE.SphereGeometry(0.12, 8, 6), leaf, Math.cos(i) * 0.08, 0.35 + (i % 3) * 0.1, Math.sin(i) * 0.08); l.scale.set(0.6, 1.4, 0.6); l.rotation.z = Math.cos(i * 2) * 0.5; g.add(l); } return g; }
function rgbStrip(len, color) { const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.015, 0.015), new THREE.MeshBasicMaterial({ color, toneMapped: false })); const l = new THREE.PointLight(color, 0.8, 2.5, 2); l.position.y = 0.05; m.add(l); return m; }
function rugButton() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.05, 24), std({ color: 0x222222, roughness: 0.5 }), 0, 0.025, 0));
  const btn = mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.05, 24), new THREE.MeshStandardMaterial({ color: 0xc81e1e, emissive: 0x6b0000, emissiveIntensity: 0.6, roughness: 0.3 }), 0, 0.07, 0); g.add(btn);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.13, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.18, roughness: 0.05, side: THREE.DoubleSide })); glass.position.y = 0.09; g.add(glass);
  const lid = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), glass.material); lid.rotation.x = -Math.PI / 2; lid.position.y = 0.155; g.add(lid);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (c) => { c.fillStyle = '#f4b23e'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#111'; c.font = '900 40px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('RUG', 128, 46); }) }));
  label.position.set(0, 0.03, 0.125); g.add(label);
  return g;
}
function sign(text, bg, fg, w = 1.6, h = 0.4) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: canvasTex(512, 128, (c) => { c.fillStyle = bg; c.fillRect(0, 0, 512, 128); c.fillStyle = fg; c.font = '800 64px Inter, sans-serif'; c.textAlign = 'center'; c.fillText(text, 256, 88); }), toneMapped: false })); }
function boxStack(n) { const g = new THREE.Group(), mat = std({ map: cardboard(), roughness: 0.85 }); for (let i = 0; i < n; i++) { const b = mesh(rbox(0.45, 0.32, 0.38, 0.01), mat, (i % 2) * 0.1, 0.16 + i * 0.33, (i % 2) * 0.05); b.rotation.y = i * 0.3; g.add(b); } return g; }

const hangLamp = (x, z, H) => { const l = model('hanging_industrial_lamp', 1.0, { fit: 'h', onLoad: (m, lg) => { lg.position.y = H - lg.userData.height; } }); l.position.set(x, 0, z); return l; };
// ---- owned gear for any room: real 3D models (Poly Haven CC0, world/models.mjs) with the old shapes as fallbacks ----
// spots: boxes, plants[], rgb[[pos,len,rot]], coffee [pos,rot] | pos, radio, cat, and decor spots [pos, rotY]:
// stand (TV stand: tv + console + gamepad on top), shelf, clock, megaphone, armchair, coffeetable.
// Small idle animations go in room.anims (called every frame by world/main.mjs).
function tvStand() {
  const g = new THREE.Group(), wood = std({ color: 0x2b2018, roughness: 0.55 }), dark = std({ color: 0x15171c, roughness: 0.4 });
  g.add(mesh(rbox(1.1, 0.05, 0.4, 0.01), wood, 0, 0.425, 0));
  g.add(mesh(rbox(1.1, 0.04, 0.4, 0.01), wood, 0, 0.06, 0));
  for (const x of [-0.53, 0.53]) g.add(mesh(new THREE.BoxGeometry(0.04, 0.4, 0.4), wood, x, 0.24, 0));
  for (const x of [-0.27, 0.27]) g.add(mesh(new THREE.BoxGeometry(0.5, 0.3, 0.01), dark, x, 0.24, 0.195));
  return g;
}
const STAND_TOP = 0.45;
function steam() {
  const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false });
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), mat.clone()); p.userData.o = i / 5; g.add(p); }
  g.userData.tick = (t) => { for (const p of g.children) { const k = (t * 0.35 + p.userData.o) % 1; p.position.set(Math.sin(k * 9 + p.userData.o * 7) * 0.015, k * 0.22, 0); p.scale.setScalar(0.6 + k * 1.6); p.material.opacity = 0.22 * Math.sin(k * Math.PI); } };
  return g;
}
export function addOwned(room, game, spots) {
  const b = game.sys.build, g = room.group, list = room.interactables, anims = room.anims || (room.anims = []);
  const cols = room.colliders || (room.colliders = []);
  const hitBox = (o, w, h, d, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.y = y != null ? y : h / 2; o.add(m); return o; };
  const at = (o, s) => { const [p, r] = s instanceof THREE.Vector3 ? [s, 0] : s; o.position.copy(p); o.rotation.y = r || 0; g.add(o); return o; };
  const block = (s, w, d) => { const [p, r] = s instanceof THREE.Vector3 ? [s, 0] : s; const sw = Math.abs(Math.sin(r || 0)) > 0.7; const hx = (sw ? d : w) / 2, hz = (sw ? w : d) / 2; cols.push({ minX: p.x - hx, maxX: p.x + hx, minZ: p.z - hz, maxZ: p.z + hz }); };
  // delivery boxes: real cardboard boxes, stacked square to the wall
  if (b.boxes.length && spots.boxes) {
    const s = new THREE.Group(), n = Math.min(3, b.boxes.length);
    for (let i = 0; i < n; i++) { const bx = model('cardboard_box_01', 0, { fallback: () => boxStack(1) }); bx.position.set(i === 2 ? 0.42 : 0, i === 1 ? 0.34 : 0, 0); bx.rotation.y = i === 1 ? 0.12 : 0; s.add(bx); }
    hitBox(s, 0.9, 1.0, 0.7, 0.5); at(s, spots.boxes); list.push({ id: 'box', action: 'box', mesh: s, prompt: 'Open box (' + b.boxes.length + ')' });
  }
  // plants: real potted anthurium / calathea, swaying a little
  (spots.plants || []).slice(0, b.count('plant')).forEach((p, i) => {
    const pl = at(model(i % 2 ? 'calathea_orbifolia_01' : 'anthurium_botany_01', i === 1 ? 0.55 : 0.75, { fit: 'h', pick: i >> 1, fallback: plant }), p);
    const ph = i * 1.7; anims.push((dt, t) => { pl.rotation.z = Math.sin(t * 0.7 + ph) * 0.012; pl.rotation.x = Math.sin(t * 0.53 + ph) * 0.01; });
  });
  // RGB strips slowly drift through the hue wheel
  if (b.count('rgb') && spots.rgb) spots.rgb.slice(0, b.count('rgb')).forEach(([p, len, rot], i) => {
    const s = rgbStrip(len, i ? 0xa77bff : 0x4aa8ff); s.position.copy(p); s.rotation.y = rot || 0; g.add(s);
    const light = s.children[0]; anims.push((dt, t) => { s.material.color.setHSL(((t * 0.02 + i * 0.4) % 1), 0.85, 0.55); light.color.copy(s.material.color); });
  });
  // coffee machine with steam
  if (b.count('coffee') && spots.coffee) {
    const c = at(coffeeMachine(), spots.coffee), st = steam(); st.position.set(0, 0.12, 0.08); c.add(st);
    anims.push((dt, t) => st.userData.tick(t));
    list.push({ id: 'coffee', action: 'coffee', mesh: c, prompt: 'Make coffee' });
  }
  // the radio is a real boombox; it bobs to the beat
  if (spots.radio) {
    const r = at(hitBox(model('boombox', 0.42, { fit: 'w', fallback: radio }), 0.46, 0.3, 0.2), spots.radio);
    anims.push((dt, t) => { const k = Math.max(0, Math.sin(t * Math.PI * 2 * 1.6)); r.scale.set(1 + k * 0.012, 1 + k * 0.025, 1 + k * 0.012); });
    list.push({ id: 'radio', action: 'radio', mesh: r, prompt: 'Radio: next station / off' });
  }
  if (game.sys.world.cat && spots.cat) { const c = cat(); c.position.copy(spots.cat instanceof THREE.Vector3 ? spots.cat : spots.cat[0]); g.add(c); room.cat = c; list.push({ id: 'cat', action: 'cat', mesh: c, prompt: 'Pet the cat' }); }
  // ---- furniture from the Shop ----
  const hasTv = b.count('tv'), hasCon = b.count('console');
  if ((hasTv || hasCon) && spots.stand) {
    const st = at(tvStand(), spots.stand); block(spots.stand, 1.1, 0.4);
    if (hasTv) {
      const tv = model('Television_01', 0.62, { fit: 'w' }); tv.position.set(hasCon ? 0.12 : 0, STAND_TOP, -0.02); st.add(tv);
      const glow = new THREE.PointLight(0x6aa8ff, 0.35, 2.2, 2); glow.position.set(hasCon ? 0.12 : 0, STAND_TOP + 0.25, 0.4); st.add(glow);
      anims.push((dt, t) => { glow.intensity = 0.3 + 0.08 * Math.sin(t * 7.3) + 0.06 * Math.sin(t * 13.1); glow.color.setHSL(0.6 + 0.04 * Math.sin(t * 0.4), 0.7, 0.6); });
    }
    if (hasCon) {
      const con = model('gaming_console', 0.3, { fit: 'w' }); con.position.set(-0.36, STAND_TOP, 0.02); st.add(con);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.004), new THREE.MeshBasicMaterial({ color: 0x2bd67b, toneMapped: false })); led.position.set(-0.36, STAND_TOP + 0.03, 0.17); st.add(led);
      anims.push((dt, t) => { led.material.color.setScalar(0).setRGB(0.17, 0.84 * (0.55 + 0.45 * Math.sin(t * 2.2)), 0.48 * (0.55 + 0.45 * Math.sin(t * 2.2))); });
      const pad = model('gamepad', 0.16, { fit: 'w' }); pad.position.set(0.4, STAND_TOP, 0.1); pad.rotation.y = -0.35; st.add(pad);
    }
  }
  let megaOnShelf = false;
  if (b.count('shelf') && spots.shelf) {
    const wantMega = b.count('megaphone') > 0; megaOnShelf = wantMega;
    at(model('Shelf_01', 1.7, { fit: 'h', onLoad: (m, sg) => {
      // find the shelf boards by casting a ray down through the middle, then stock them: books, a trophy, the megaphone
      sg.updateMatrixWorld(true);
      const rc = new THREE.Raycaster(), lv = []; let y = 1.75;
      while (y > 0.1 && lv.length < 10) { rc.set(sg.localToWorld(new THREE.Vector3(0, y, 0.02)), new THREE.Vector3(0, -1, 0)); const h = rc.intersectObject(m, true)[0]; if (!h) break; const ly = sg.worldToLocal(h.point.clone()).y; if (ly < 0.08) break; lv.push(ly); y = ly - 0.05; }
      const cols = [0x8b2e2e, 0x2e4a8b, 0xc9a35a, 0x2f6b4a, 0x5a3d7a, 0xd8d2c4];
      lv.forEach((ly, i) => {
        if (i === 0) return;
        if (i === 2 && wantMega) { const mg = model('Megaphone_01', 0.26); mg.position.set(0.1, ly, 0); mg.rotation.y = -0.6; sg.add(mg); return; }
        if (i % 2) { let x = -0.34; for (let k = 0; k < 5 + (i % 3); k++) { const w = 0.03 + ((k * 7 + i) % 3) * 0.01, h = 0.16 + ((k * 5 + i) % 4) * 0.02; const bk = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.15), std({ color: cols[(k + i) % cols.length], roughness: 0.8 })); bk.position.set(x + w / 2, ly + h / 2, 0); bk.rotation.z = k === 4 ? 0.25 : 0; bk.castShadow = true; sg.add(bk); x += w + 0.004; } }
        else if (i === 4) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.14, 12), std({ color: 0xf4b23e, metalness: 0.9, roughness: 0.25 })); tr.position.set(-0.2, ly + 0.07, 0); sg.add(tr); }
      });
    } }), spots.shelf); block(spots.shelf, 0.82, 0.24);
  }
  if (b.count('clock') && spots.clock) {
    const ck = at(model('alarm_clock_01', 0.14), spots.clock);
    anims.push((dt, t) => { const ring = (t % 60) < 1.2; ck.rotation.z = ring ? Math.sin(t * 60) * 0.04 : 0; });
  }
  if (b.count('megaphone') && spots.megaphone && !megaOnShelf) at(model('Megaphone_01', 0.3), spots.megaphone);
  if (b.count('armchair') && spots.armchair) { at(model('ArmChair_01', 0), spots.armchair); block(spots.armchair, 0.85, 0.77); }
  if (b.count('coffeetable') && spots.coffeetable) { at(model('CoffeeTable_01', 1.0, { fit: 'w' }), spots.coffeetable); block(spots.coffeetable, 1.0, 0.63); }
}

// ---- Apartment ----
export function buildApartment(scene, game, laptopTex) {
  const W = 6.4, D = 5.2, H = 2.7;
  const sh = shell({ w: W, d: D, h: H, floorY: -9, seed: 4, floor: std({ map: woodFloor([3, 2.6]), roughness: 0.6 }), wallTint: '#9a958c', windows: [[-2.6, -1.0], [0.2, 1.8]] });
  const g = sh.g; scene.add(g);
  const interactables = [], screens = [], b = game.sys.build;
  const room = { group: g, colliders: sh.colliders, interactables, screens, setTime: sh.setTime, outside: sh.outside, spawn: { pos: new THREE.Vector3(2.2, 0, 1.6), yaw: 0.9 } };
  // main desk with monitors (1 + bought monitors)
  const dk = desk(1.9, 0.75); dk.position.set(1.2, 0, -2.15); g.add(dk); sh.solid(0.25, 2.15, -2.6, -1.75);
  const nMon = 1 + Math.min(3, b.count('monitor'));
  for (let i = 0; i < nMon; i++) { const s = makeScreen(512, 300, i === 0 ? 'chart' : i === 1 ? 'heat' : 'chart', { index: i }); screens.push(s); const m = monitor(i === 0 ? laptopTex : s.texture); m.position.set(1.2 + (i - (nMon - 1) / 2) * 0.66, 0.76, -2.35); m.rotation.y = (i - (nMon - 1) / 2) * -0.12; g.add(m); if (i === 0) room.mainMonitor = m; }
  if (b.count('chair')) { const ch = Dec.gamingChair(); ch.position.set(1.2, 0, -1.4); ch.rotation.y = 0.15; g.add(ch); }
  const seatMain = { pos: new THREE.Vector3(1.2, 1.22, -1.35), look: new THREE.Vector3(1.2, 0.98, -2.4), view: null };
  room.seat = seatMain;
  interactables.push({ id: 'pc', action: 'sit', seat: seatMain, mesh: dk, prompt: 'Sit at the computer' });
  // bed
  const bd = b.count('bed') ? bed() : P.mattress(); bd.position.set(-2.2, 0, 0.6); g.add(bd); sh.solid(-3.2, -1.4, -0.5, 1.7);
  interactables.push({ id: 'bed', action: 'sleep', mesh: bd, prompt: 'Sleep' });
  // couch facing the community wall
  const cc = model('Sofa_01', 1.9, { fit: 'w', fallback: couch }); cc.position.set(0.15, 0, 1.75); cc.rotation.y = Math.PI; g.add(cc); sh.solid(-0.85, 1.15, 1.4, 2.1);
  // community wall: Chirp + heat screens on the left wall
  for (const [k, z] of [['chirp', -1.2], ['heat', -2.25]]) { const s = makeScreen(640, 400, k); screens.push(s); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffffff, emissiveMap: s.texture, emissiveIntensity: 0.9 })); m.position.set(-W / 2 + 0.02, 1.55, z); m.rotation.y = Math.PI / 2; g.add(m); }
  // dev desk with the RUG button
  if (b.count('devdesk')) {
    const dd = desk(1.3, 0.65); dd.position.set(-1.6, 0, -2.2); g.add(dd); sh.solid(-2.3, -0.9, -2.6, -1.85);
    const s = makeScreen(512, 300, 'heat'); screens.push(s); const m = monitor(s.texture, 0.5); m.position.set(-1.8, 0.76, -2.4); g.add(m);
    const rb = rugButton(); rb.position.set(-1.2, 0.76, -2.05); g.add(rb);
    interactables.push({ id: 'rug', action: 'rug', mesh: rb, prompt: 'The RUG button' });
    const seatDev = { pos: new THREE.Vector3(-1.6, 1.22, -1.4), look: new THREE.Vector3(-1.7, 0.95, -2.4), view: 'dev' };
    interactables.push({ id: 'devdesk', action: 'sit', seat: seatDev, mesh: dd, prompt: 'Sit at the dev desk' });
  }
  const fr = P.fridge(); fr.position.set(2.85, 0, 0.1); fr.rotation.y = -Math.PI / 2; g.add(fr); sh.solid(2.55, 3.2, -0.2, 0.4);
  interactables.push({ id: 'fridge', action: 'eat', mesh: fr, prompt: 'Eat' });
  interactables.push({ id: 'door', action: 'door', mesh: sh.door, prompt: 'Leave (map)' });
  addOwned(room, game, { boxes: new THREE.Vector3(2.6, 0, 2.2), plants: [new THREE.Vector3(-2.9, 0, -2.3), new THREE.Vector3(2.9, 0, -2.3), new THREE.Vector3(-2.9, 0, 2.3), new THREE.Vector3(0.7, 0, 2.3)], rgb: [[new THREE.Vector3(1.2, 0.75, -2.55), 1.8], [new THREE.Vector3(-2.2, 0.4, -0.5), 1.4]], coffee: [new THREE.Vector3(2.85, 0.85, 0.1), -Math.PI / 2], radio: [new THREE.Vector3(1.8, 0, 2.38), Math.PI], stand: [new THREE.Vector3(-0.35, 0, -2.35), 0], shelf: [new THREE.Vector3(3.06, 0, -1.4), -Math.PI / 2], clock: [new THREE.Vector3(-1.2, 0.7, -0.22), -1.2], megaphone: [new THREE.Vector3(3.0, 0, -0.6), -2.2], armchair: [new THREE.Vector3(1.5, 0, 0.75), -Math.PI / 2], coffeetable: [new THREE.Vector3(0.15, 0, 0.75), 0], cat: new THREE.Vector3(-0.4, 0, 0.2) });
  // make it read as a real apartment: kitchenette, curtains, lights, a fan, art, rug, clock, floor lamp, doormat
  { const an = room.anims; Dec.baseboards(g, W, D); Dec.curtains(g, [[-2.6, -1.0], [0.2, 1.8]], -D / 2, { top: 2.3 }); Dec.ceilingLight(g, 1.2, -1.2, H, { intensity: 0.7 }); Dec.ceilingFan(g, an, 0.2, 0.9, H);
    Dec.wallClock(g, an, game, -0.35, 1.75, -D / 2 + 0.02, 0); Dec.frames(g, [[-0.5, 1.6, D / 2 - 0.02, Math.PI, 0.5, 0.65, 0], [0.15, 1.65, D / 2 - 0.02, Math.PI, 0.7, 0.5, 1], [0.8, 1.6, D / 2 - 0.02, Math.PI, 0.5, 0.65, 3], [-W / 2 + 0.02, 1.55, 0.6, Math.PI / 2, 0.9, 0.6, 2]]);
    Dec.rug(g, 0.2, 1.0, 2.2, 1.6, { base: '#4a3f3a', edge: '#d9c7a0' }); Dec.floorLamp(g, 1.35, 2.3); Dec.doormat(g, W / 2 - 0.45, D / 2 - 0.9, Math.PI / 2);
    Dec.kitchenette(g, an, W / 2, 0.45, 1.2); sh.solid(W / 2 - 0.62, W / 2, 0.45, 1.2);
    // the bed gets its own room: two partition walls with a doorway by the front wall, a nightstand, a wardrobe, its own light
    Dec.partition(g, -W / 2, -0.6, -0.9, -0.6, H); sh.solid(-W / 2, -0.85, -0.66, -0.54);
    Dec.partition(g, -0.95, -0.6, -0.95, 1.55, H); sh.solid(-1.01, -0.89, -0.6, 1.55);
    const jamb = std({ color: 0xece9e2, roughness: 0.6 }); g.add(mesh(new THREE.BoxGeometry(0.14, 2.1, 0.05), jamb, -0.95, 1.05, 1.575)); g.add(mesh(new THREE.BoxGeometry(0.14, 0.06, 1.05), jamb, -0.95, 2.1, 2.08));
    g.add(mesh(new THREE.BoxGeometry(0.1, H - 2.13, 1.05), std({ color: 0x9a958c, roughness: 0.92 }), -0.95, (H + 2.13) / 2, 2.08));
    const ns = model('ClassicNightstand_01', 0); ns.position.set(-1.2, 0, -0.27); ns.rotation.y = -Math.PI / 2; g.add(ns); sh.solid(-1.42, -0.98, -0.55, 0.02);
    const wd = model('drawer_cabinet', 1.7, { fit: 'h' }); wd.position.set(-2.55, 0, D / 2 - 0.27); wd.rotation.y = Math.PI; g.add(wd); sh.solid(-3.1, -2.0, D / 2 - 0.52, D / 2);
    Dec.ceilingLight(g, -2.1, 0.9, H, { intensity: 0.45, range: 4 }); Dec.rug(g, -1.2, 0.6, 0.45, 1.5, { base: '#2f3b52', edge: '#9fb4d8' }); }
  const lamp = P.deskLamp(); lamp.group.position.set(2.0, 0.76, -2.4); g.add(lamp.group);
  room.lamp = lamp;
  interactables.push({ id: 'lamp', action: 'lamp', mesh: lamp.group, prompt: 'Toggle lamp' });
  return room;
}

// ---- Office floor ----
export function buildOffice(scene, game, laptopTex) {
  const W = 10, D = 7, H = 2.9;
  const sh = shell({ w: W, d: D, h: H, floorY: -24, seed: 7, floor: std({ map: tileFloor([5, 3.5], '#3b3f47', '#353941'), roughness: 0.85 }), wallTint: '#a3a8ad', windows: [[-4.5, -2.0], [-1.5, 1.0], [1.5, 4.0]], ceil: 0xd8dadb });
  const g = sh.g; scene.add(g);
  const interactables = [], screens = [], fm = game.sys.firm, b = game.sys.build;
  const room = { group: g, colliders: sh.colliders, interactables, screens, setTime: sh.setTime, outside: sh.outside, spawn: { pos: new THREE.Vector3(4.1, 0, 2.7), yaw: 0.8 }, npcs: [] };
  const panel = new THREE.PointLight(0xfff3e0, 4, 9, 2); panel.position.set(0, 2.7, 0); g.add(panel);
  // trader desks in two rows
  const nDesk = Math.min(8, b.count('desk'));
  for (let i = 0; i < nDesk; i++) {
    const col = i % 4, row = Math.floor(i / 4), x = -3.4 + col * 2.0, z = -1.2 + row * 2.2;
    const dk = desk(1.4, 0.7); dk.position.set(x, 0, z); g.add(dk); sh.solid(x - 0.75, x + 0.75, z - 0.4, z + 0.4);
    const s = makeScreen(400, 240, 'chart', { index: i + 3 }); screens.push(s); const m = monitor(s.texture, 0.5); m.position.set(x, 0.76, z - 0.2); g.add(m);
    const t = fm.staff[i];
    if (t) { const n = person(t.pfp || i + 1, [0x334155, 0x7c2d12, 0x14532d, 0x1e3a8a, 0x581c87, 0xe5e7eb, 0x0f766e, 0x9d174d][(t.pfp || i) % 8]); n.position.set(x, 0, z + 0.62); n.rotation.y = Math.PI; g.add(n); room.npcs.push({ mesh: n, t }); interactables.push({ id: 'staff' + i, action: 'staff', staff: t.id, mesh: n, prompt: t.name + ' · ' + (t.pnl >= 0 ? '+' : '') + t.pnl.toFixed(2) + ' SOL' }); }
  }
  // PnL wall
  const s = makeScreen(720, 420, 'pnl'); screens.push(s);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffffff, emissiveMap: s.texture, emissiveIntensity: 0.9 })); wall.position.set(-W / 2 + 0.02, 1.6, 0.6); wall.rotation.y = Math.PI / 2; g.add(wall);
  // your desk
  const my = desk(1.8, 0.8); my.position.set(3.6, 0, -2.7); g.add(my); sh.solid(2.65, 4.55, -3.2, -2.25);
  const m1 = monitor(laptopTex); m1.position.set(3.6, 0.76, -2.9); g.add(m1);
  const seat = { pos: new THREE.Vector3(3.6, 1.22, -1.9), look: new THREE.Vector3(3.6, 0.98, -2.95), view: 'firm' };
  room.seat = seat;
  interactables.push({ id: 'boss', action: 'sit', seat, mesh: my, prompt: 'Sit at your desk (Firm)' });
  interactables.push({ id: 'door', action: 'door', mesh: sh.door, prompt: 'Leave (map)' });
  addOwned(room, game, { boxes: new THREE.Vector3(4.4, 0, 3.0), plants: [new THREE.Vector3(-4.7, 0, -3.2), new THREE.Vector3(4.7, 0, -1.0), new THREE.Vector3(-4.7, 0, 3.2), new THREE.Vector3(1.0, 0, 3.2)], coffee: new THREE.Vector3(4.2, 0.78, -2.6), radio: new THREE.Vector3(3.0, 0.78, -2.9) });
  // office dressing: blinds, LED panels, hanging lamps over your desk, whiteboard, wall clock, water cooler, a lounge sofa, tall plants
  { const an = room.anims; Dec.baseboards(g, W, D); Dec.blinds(g, [[-4.5, -2.0], [-1.5, 1.0], [1.5, 4.0]], -D / 2, { open: 0.45 });
    Dec.ceilingPanels(g, [[-3.4, -1.2], [-1.4, -1.2], [0.6, -1.2], [2.6, -1.2], [-3.4, 1.0], [-1.4, 1.0], [0.6, 1.0], [2.6, 1.0]], H);
    for (const x of [3.1, 4.1]) g.add(hangLamp(x, -2.6, H));
    Dec.whiteboard(g, 0.2, 1.55, D / 2 - 0.03, Math.PI, 2.0, 1.1);
    const wc = model('wall_clock', 0.36); wc.position.set(-W / 2 + 0.03, 2.25, 0.6); wc.rotation.y = Math.PI / 2; g.add(wc);
    Dec.waterCooler(g, an, W / 2 - 0.3, 0.9, -Math.PI / 2); sh.solid(W / 2 - 0.48, W / 2, 0.72, 1.08);
    const so = model('Sofa_01', 1.9, { fit: 'w' }); so.position.set(-3.2, 0, D / 2 - 0.4); so.rotation.y = Math.PI; g.add(so); sh.solid(-4.2, -2.2, D / 2 - 0.75, D / 2);
    for (const [x, id] of [[-1.6, 'potted_plant_01'], [2.4, 'potted_plant_02']]) { const p = model(id, 1.1, { fit: 'h' }); p.position.set(x, 0, D / 2 - 0.4); g.add(p); const ph = x; an.push((dt, t) => { p.rotation.z = Math.sin(t * 0.6 + ph) * 0.01; }); }
    Dec.frames(g, [[2.0, 1.6, D / 2 - 0.02, Math.PI, 0.6, 0.8, 2], [-W / 2 + 0.02, 1.6, 2.5, Math.PI / 2, 0.7, 0.5, 1]]); }
  if (!nDesk) { const sg = sign('Buy trader desks in the Shop', '#111418', '#f4b23e', 3.2, 0.5); sg.position.set(0, 1.8, -D / 2 + 0.03); g.add(sg); }
  room.update = (dt, gm, t) => { for (const n of room.npcs) n.mesh.userData.anim(t, n.t.mood); };
  return room;
}

// ---- Tower (server room + billboard + moderation desk) ----
export function buildTower(scene, game, laptopTex) {
  const W = 10, D = 8, H = 3.2;
  const sh = shell({ w: W, d: D, h: H, floorY: -70, seed: 11, floor: std({ color: 0x15171c, roughness: 0.25, metalness: 0.4 }), wallTint: '#5b616b', windows: [[-4.6, 4.6]], winY0: 0.2, winY1: 3.0, cityY: 0.2, cityDist: 6, ceil: 0x2a2d33 });
  const g = sh.g; scene.add(g);
  const interactables = [], screens = [], b = game.sys.build;
  const room = { group: g, colliders: sh.colliders, interactables, screens, setTime: sh.setTime, outside: sh.outside, spawn: { pos: new THREE.Vector3(4.0, 0, 3.2), yaw: 0.7 }, racks: [] };
  const tl = new THREE.PointLight(0x9fc3ff, 3, 10, 2); tl.position.set(0, 2.9, 1); g.add(tl);
  const n = Math.min(8, b.count('rack'));
  for (let i = 0; i < n; i++) { const r = rack(i), x = -4.0 + i * 0.75; r.position.set(x, 0, 0.9); g.add(r); room.racks.push(r); sh.solid(x - 0.32, x + 0.32, 0.43, 1.37); }
  for (const [x, z, c] of [[-2.5, 2.2, 0x4aa8ff], [2.5, 2.2, 0xa77bff], [0, -2.5, 0xfff3e0]]) { const pl = new THREE.PointLight(c, 3, 8, 2); pl.position.set(x, 2.9, z); g.add(pl); }
  for (let i = 0; i < 3; i++) { const strip = new THREE.Mesh(new THREE.BoxGeometry(8, 0.03, 0.08), new THREE.MeshBasicMaterial({ color: 0x9fc3ff, toneMapped: false })); strip.position.set(0, 3.15, -2.5 + i * 2.5); g.add(strip); }
  if (!n) { const sg = sign('Buy server racks in the Shop', '#0d1015', '#4aa8ff', 3.0, 0.5); sg.position.set(-2.4, 1.4, 3.95); sg.rotation.y = Math.PI; g.add(sg); }
  room.spawn = { pos: new THREE.Vector3(3.8, 0, 3.2), yaw: 0.9 };
  // billboard
  const bb = makeScreen(1024, 400, 'billboard', { every: 700 }); screens.push(bb);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.4), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffffff, emissiveMap: bb.texture, emissiveIntensity: 1.1 })); board.position.set(-W / 2 + 0.03, 1.8, -0.6); board.rotation.y = Math.PI / 2; g.add(board);
  // moderation desk
  const dk = desk(1.8, 0.8); dk.position.set(2.2, 0, -1.6); g.add(dk); sh.solid(1.25, 3.15, -2.05, -1.15);
  const m1 = monitor(laptopTex); m1.position.set(2.0, 0.76, -1.8); g.add(m1);
  const sv = makeScreen(512, 300, 'servers'); screens.push(sv); const m2 = monitor(sv.texture, 0.5); m2.position.set(2.75, 0.76, -1.75); m2.rotation.y = -0.2; g.add(m2);
  const seat = { pos: new THREE.Vector3(2.2, 1.22, -0.8), look: new THREE.Vector3(2.2, 0.98, -1.9), view: 'pad' };
  room.seat = seat;
  interactables.push({ id: 'mod', action: 'sit', seat, mesh: dk, prompt: 'Sit at the moderation desk (Pad)' });
  interactables.push({ id: 'door', action: 'door', mesh: sh.door, prompt: 'Leave (map)' });
  addOwned(room, game, { boxes: new THREE.Vector3(4.4, 0, 3.6), plants: [new THREE.Vector3(4.6, 0, -3.6), new THREE.Vector3(-4.6, 0, -3.6)], coffee: new THREE.Vector3(2.9, 0.78, -1.5), radio: new THREE.Vector3(1.4, 0.78, -1.8) });
  // tower dressing: steel shelving with boxes, hanging lamps over the desk, a rug, a clock, plants, a cable tray
  { const an = room.anims; Dec.baseboards(g, W, D);
    for (const x of [-3.6, -2.0]) { const sf = model('steel_frame_shelves_01', 2.1, { fit: 'h' }); sf.position.set(x, 0, D / 2 - 0.35); sf.rotation.y = Math.PI; g.add(sf); sh.solid(x - 0.6, x + 0.6, D / 2 - 0.6, D / 2); }
    for (const x of [1.7, 2.7]) g.add(hangLamp(x, -1.6, H));
    Dec.rug(g, 2.2, -1.1, 2.6, 1.8, { base: '#1b1f27', edge: '#4aa8ff' });
    const wc = model('wall_clock', 0.4); wc.position.set(W / 2 - 0.03, 2.3, -1.0); wc.rotation.y = -Math.PI / 2; g.add(wc);
    for (const [x, z] of [[3.8, -2.4], [-0.6, 3.5]]) { const p = model('potted_plant_01', 1.2, { fit: 'h' }); p.position.set(x, 0, z); g.add(p); }
    const tray = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.06, 0.3), std({ color: 0x2a2d33, metalness: 0.6, roughness: 0.4 })); tray.position.set(-1.0, H - 0.35, 0.9); g.add(tray);
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6), std({ color: [0x3a7bff, 0xf4b23e, 0x2bd67b][i % 3] })); c.position.set(-3.9 + i * 0.75, H - 0.52, 0.9); g.add(c); } }
  room.update = (dt, gm, t) => { for (const r of room.racks) for (const [i, l] of r.userData.leds.entries()) l.visible = Math.sin(t * (3 + i) + i * 1.7) > -0.3; };
  return room;
}

// ---- Street ----
export function buildStreet(scene, game) {
  const g = new THREE.Group(); scene.add(g);
  const colliders = [], interactables = [], screens = [];
  const solid = (minX, maxX, minZ, maxZ) => colliders.push({ minX, maxX, minZ, maxZ });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), std({ color: 0x2b2d31, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(40, 5), std({ map: tileFloor([20, 2.5], '#7d7f84', '#76787d'), roughness: 0.9 })); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.01, -3); walk.receiveShadow = true; g.add(walk);
  const facadeTex = (lit) => canvasTex(256, 256, (c, w, h) => { c.fillStyle = lit ? '#1a1d26' : '#9aa6b8'; c.fillRect(0, 0, w, h); for (let y = 8; y < h; y += 32) for (let x = 8; x < w; x += 32) { const on = lit && ((x * 7 + y * 13) % 5 < 2); c.fillStyle = lit ? (on ? '#ffcf73' : '#0b0d12') : '#5c6b80'; c.fillRect(x, y, 18, 22); c.fillStyle = 'rgba(255,255,255,.18)'; if (!lit) c.fillRect(x, y, 6, 22); } }, { repeat: [2, 2] });
  const day = facadeTex(false), night = facadeTex(true);
  const facade = (x, w, h, color, label, act, prompt) => {
    const b = mesh(new THREE.BoxGeometry(w, h, 4), std({ color, roughness: 0.85 }), x, h / 2, -7.5); g.add(b);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.6), new THREE.MeshStandardMaterial({ map: night, roughness: 0.4, metalness: 0.2 })); win.position.set(x, h * 0.6, -5.49); g.add(win);
    solid(x - w / 2, x + w / 2, -9.5, -5.5);
    if (label) { const sg = sign(label, '#111418', '#f4b23e', Math.min(w * 0.8, 3), 0.55); sg.position.set(x, 3.0, -5.45); g.add(sg); const doorM = mesh(new THREE.BoxGeometry(1.1, 2.1, 0.08), std({ color: 0x1b2430, roughness: 0.3, metalness: 0.4 }), x, 1.05, -5.45); g.add(doorM); interactables.push({ id: act, action: act, mesh: doorM, prompt }); }
    return win;
  };
  const wins = [facade(-12, 5, 9, 0x6b5b4b), facade(-6.5, 4.5, 6, 0x8a6a4a, 'Bean There', 'cafe', 'Buy a latte ($6)'), facade(-1.2, 4.8, 12, 0x4b5563, 'HOME', 'home', 'Go home (map)'), facade(4.2, 4.5, 7, 0x3f4a5a, 'Iron Gym', 'gym', 'Work out ($15)'), facade(9.8, 5.2, 10, 0x5a4b5b)];
  // the bench at the edge of the plaza faces the park across the road
  const bench = new THREE.Group(); bench.add(mesh(new THREE.BoxGeometry(1.6, 0.06, 0.45), std({ color: 0x7a5634 }), 0, 0.45, 0)); bench.add(mesh(new THREE.BoxGeometry(1.6, 0.4, 0.05), std({ color: 0x7a5634 }), 0, 0.7, -0.2)); bench.position.set(-6.5, 0, 3.7); g.add(bench); solid(-7.3, -5.7, 7.2, 7.8);
  interactables.push({ id: 'park', action: 'park', mesh: bench, prompt: 'Sit in the park (touch grass)' });
  // news kiosk + billboard
  const kiosk = mesh(rbox(1.4, 2.0, 1.0, 0.05), std({ color: 0x1e3a8a, roughness: 0.6 }), 6, 1.0, 0); g.add(kiosk); solid(5.3, 6.7, -0.5, 0.5);
  const ks = sign('DNN NEWS', '#0b1220', '#ffffff', 1.3, 0.3); ks.position.set(6, 1.75, 0.51); g.add(ks);
  interactables.push({ id: 'kiosk', action: 'kiosk', mesh: kiosk, prompt: 'Read the news' });
  const bb = makeScreen(1024, 400, 'billboard', { every: 800 }); screens.push(bb);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.75), new THREE.MeshBasicMaterial({ map: bb.texture, toneMapped: false })); board.position.set(12, 4.2, 1); board.rotation.y = -Math.PI / 2.5; g.add(board);
  const pole = mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8), std({ color: 0x333333 }), 12.6, 1.7, 1.4); g.add(pole);
  // street lamps
  const lamps = [];
  for (const x of [-10, -3, 4, 11]) { const p = mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.6, 8), std({ color: 0x222 }), x, 1.8, -0.8); g.add(p); const l = new THREE.PointLight(0xffc27a, 0, 9, 2); l.position.set(x, 3.6, -0.6); g.add(l); lamps.push(l); const bulb = mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false }), x, 3.6, -0.6); g.add(bulb); }
  for (const z of [-30, 30]) solid(-30, 30, z - 1, z + 1); for (const x of [-30, 30]) solid(x - 1, x + 1, -30, 30);
  solid(-30, 30, 4.5, 5.5);   // the road edge: stay on this side
  // the living street (Nov 12): a real road with traffic, people on both sidewalks, a park across the road, a skyline behind it
  const anims = [], parkLights = [];
  Out.sidewalk(g, { x0: -110, x1: 110, z: 1.75, width: 4.5 });   // the plaza between the shops' sidewalk and the road
  Out.road(g, { x0: -110, x1: 110, z: 7.5, width: 7 });
  const tr = Out.traffic(g, anims, { x0: -110, x1: 110, z: 7.5, n: 14, seed: 5 });
  Out.sidewalk(g, { x0: -110, x1: 110, z: 12.6, width: 3.2 });
  Out.pedestrians(g, anims, { x0: -28, x1: 28, lanes: [-1.6, -3.8], n: 9, seed: 8 });
  Out.pedestrians(g, anims, { x0: -50, x1: 50, lanes: [12.2, 13.1], n: 10, seed: 9 });
  Out.park(g, anims, { x: 0, z: 23.5, w: 70, d: 18, seed: 6, lights: parkLights });
  const far = new THREE.Group(); far.rotation.y = Math.PI; g.add(far);
  const sk = Out.skyline(far, { x0: -120, x1: 120, z: -40, depth: 40, seed: 12 });
  for (const it of interactables) if (it.mesh) it.mesh.userData.dyn = true;   // keep what you can use as real objects
  { const street = new THREE.Group(); for (const c of g.children.slice()) street.add(c); g.add(street); Out.mergeStatic(street); }   // fewer draw calls for all the static street pieces
  const skyDome = Out.sky(); g.add(skyDome);
  const sun = new THREE.DirectionalLight(0xffe6c4, 3); sun.position.set(-8, 14, 6); sun.target.position.set(0, 0, -2); sun.castShadow = true; Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, far: 40 }); sun.shadow.bias = -0.0005; g.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0x9fb4d8, 0x3a3a30, 0.8); g.add(hemi);
  const skyDay = new THREE.Color(0x8fb4e3), skyNight = new THREE.Color(0x070a14);
  function setTime(hour, scene) {
    const d = smooth(5.5, 8, hour) * (1 - smooth(18, 20.5, hour));
    skyDome.userData.setTime(d, hour); const fc = skyDome.material.uniforms.low.value; scene.background = fc.clone(); if (!scene.fog) scene.fog = new THREE.Fog(fc.clone(), 70, 330); else scene.fog.color.copy(fc);
    sk.setTime(d); tr.setTime(d); for (const m of parkLights) m.emissiveIntensity = 0.2 + (1 - d) * 3;
    sun.intensity = 0.25 + 3 * d; sun.color.set(d > 0.5 ? 0xffe6c4 : 0x8fa8ff); hemi.intensity = 0.25 + 0.7 * d;
    for (const l of lamps) l.intensity = (1 - d) * 6;
    for (const w of wins) { const t = d > 0.5 ? day : night; if (w.material.map !== t) { w.material.map = t; w.material.needsUpdate = true; } }
    scene.environmentIntensity = 0.15 + 0.35 * d;
  }
  return { group: g, colliders, interactables, screens, setTime, anims, spawn: { pos: new THREE.Vector3(-1.2, 0, -4.4), yaw: Math.PI }, outdoor: true };
}
