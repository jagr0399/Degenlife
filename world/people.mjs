// Office people (Nov 12): a seated person on an office chair, built from shapes so they can sit, type and look around.
// person(seed, shirt) faces +z (towards the desk). userData.anim(t, mood) drives typing, breathing and head turns.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const rbox = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, r);
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
const UP = new THREE.Vector3(0, 1, 0);
// a capsule from a to b (local points)
function limb(a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const m = mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, L - r * 2), 4, 10), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const SKIN = [0xf1c7a5, 0xe0ac86, 0xc68b62, 0x9c6a45, 0x6e4a32, 0xf6d5bf];
const HAIR = [0x1d1612, 0x3b2618, 0x6b4426, 0xa77843, 0xd9b26f, 0x2a2a2e, 0x8a3b22, 0x9aa0a6];
const PANTS = [0x1f2937, 0x2d3748, 0x3b3f46, 0x4a3b2c, 0x1e3a5f];
const STYLES = ['short', 'long', 'bun', 'buzz', 'cap', 'curly', 'short', 'ponytail'];

function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

export function officeChair() {
  const c = new THREE.Group(), blk = std({ color: 0x1b1d22, roughness: 0.6 }), mesh2 = std({ color: 0x2a2d33, roughness: 0.8 }), chrome = std({ color: 0x9a9da3, metalness: 0.9, roughness: 0.25 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, leg = new THREE.Group(); leg.rotation.y = a; leg.add(mesh(rbox(0.28, 0.03, 0.045, 0.01), blk, 0.14, 0.07, 0)); leg.add(mesh(new THREE.SphereGeometry(0.028, 10, 8), blk, 0.28, 0.028, 0)); c.add(leg); }
  c.add(mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.3, 12), chrome, 0, 0.23, 0));
  c.add(mesh(rbox(0.48, 0.07, 0.46, 0.03), blk, 0, 0.43, 0));
  c.add(mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), blk, 0, 0.6, -0.24));
  const back = mesh(rbox(0.44, 0.52, 0.05, 0.03), mesh2, 0, 0.92, -0.27); back.rotation.x = -0.1; c.add(back);
  return c;
}

export function person(seed = 1, shirt = 0x334155) {
  const r = rng(seed + 7), pick = (a) => a[Math.floor(r() * a.length)];
  const g = new THREE.Group();
  const skin = std({ color: pick(SKIN), roughness: 0.65 }), hairC = pick(HAIR), hair = std({ color: hairC, roughness: 0.8 });
  const shirtM = std({ color: shirt, roughness: 0.85 }), pants = std({ color: pick(PANTS), roughness: 0.9 }), shoe = std({ color: r() < 0.5 ? 0x111111 : 0xeeeeee, roughness: 0.6 });
  const style = STYLES[Math.floor(r() * STYLES.length)];
  g.add(officeChair());

  // legs: thighs forward on the seat, shins down to the floor
  for (const x of [-0.1, 0.1]) {
    g.add(limb(V(x, 0.53, -0.08), V(x * 1.1, 0.53, 0.3), 0.075, pants));
    g.add(limb(V(x * 1.1, 0.53, 0.3), V(x * 1.15, 0.08, 0.34), 0.06, pants));
    g.add(mesh(rbox(0.1, 0.07, 0.22, 0.03), shoe, x * 1.15, 0.035, 0.4));
  }
  // torso, leaning a little towards the screen; it breathes
  const body = new THREE.Group(); body.position.set(0, 0.56, -0.08); body.rotation.x = 0.1; g.add(body);
  body.add(mesh(rbox(0.38, 0.5, 0.22, 0.09), shirtM, 0, 0.27, 0));
  body.add(mesh(rbox(0.36, 0.08, 0.24, 0.04), pants, 0, 0.02, 0));
  const collar = mesh(new THREE.TorusGeometry(0.065, 0.018, 8, 16), shirtM, 0, 0.53, 0.0); collar.rotation.x = Math.PI / 2; body.add(collar);
  body.add(mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 12), skin, 0, 0.57, 0.0));

  // head
  const head = new THREE.Group(); head.position.set(0, 0.72, 0.01); body.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.11, 24, 18), skin, 0, 0, 0); skull.scale.set(0.92, 1.08, 1); head.add(skull);
  for (const x of [-0.1, 0.1]) { const e = mesh(new THREE.SphereGeometry(0.025, 10, 8), skin, x, -0.005, -0.005); e.scale.set(0.5, 1, 0.8); head.add(e); }
  const nose = mesh(new THREE.ConeGeometry(0.018, 0.045, 8), skin, 0, -0.01, 0.112); nose.rotation.x = Math.PI / 2; head.add(nose);
  const white = std({ color: 0xffffff, roughness: 0.3 }), dark = std({ color: 0x16120f, roughness: 0.3 });
  const eyes = [];
  for (const x of [-0.038, 0.038]) {
    const ew = mesh(new THREE.SphereGeometry(0.017, 12, 10), white, x, 0.02, 0.092); ew.scale.z = 0.5; head.add(ew);
    const p = mesh(new THREE.SphereGeometry(0.009, 10, 8), dark, x, 0.02, 0.1); head.add(p); eyes.push(p);
    const brow = mesh(new THREE.BoxGeometry(0.035, 0.007, 0.01), hair, x, 0.05, 0.1); brow.rotation.z = x > 0 ? -0.12 : 0.12; head.add(brow);
  }
  head.add(mesh(new THREE.BoxGeometry(0.04, 0.007, 0.01), std({ color: 0x8a4a3c, roughness: 0.5 }), 0, -0.055, 0.1));
  // hair styles
  const cap = (sx, sy, sz, y = 0.02, z = -0.012, phiLen = Math.PI * 0.55) => { const h = mesh(new THREE.SphereGeometry(0.118, 24, 14, 0, Math.PI * 2, 0, phiLen), hair, 0, y, z); h.scale.set(sx, sy, sz); head.add(h); return h; };
  if (style === 'short' || style === 'curly' || style === 'ponytail' || style === 'bun' || style === 'long') cap(0.97, 1.05, 1.02);
  if (style === 'buzz') cap(0.94, 1.0, 0.98, 0.012, -0.005, Math.PI * 0.5);
  if (style === 'curly') for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; head.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), hair, Math.cos(a) * 0.085, 0.07 + Math.sin(i) * 0.015, Math.sin(a) * 0.085 - 0.01)); }
  if (style === 'long') { head.add(mesh(rbox(0.22, 0.26, 0.08, 0.035), hair, 0, -0.1, -0.075)); }
  if (style === 'bun') head.add(mesh(new THREE.SphereGeometry(0.05, 12, 10), hair, 0, 0.1, -0.09));
  if (style === 'ponytail') { const pt = limb(V(0, 0.03, -0.11), V(0, -0.14, -0.16), 0.03, hair); head.add(pt); }
  if (style === 'cap') {
    const cc = std({ color: [0xc81e1e, 0x1f6feb, 0x111111, 0x2bd67b][Math.floor(r() * 4)], roughness: 0.7 });
    const h = mesh(new THREE.SphereGeometry(0.12, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), cc, 0, 0.025, -0.005); head.add(h);
    const brim = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 20, 1, false, -Math.PI / 2, Math.PI), cc, 0, 0.03, 0.09); brim.scale.z = 1.2; head.add(brim);
  }
  if (r() < 0.3) { const fr = std({ color: 0x111111, roughness: 0.3, metalness: 0.4 }); for (const x of [-0.038, 0.038]) { const lens = mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 16), fr, x, 0.02, 0.105); head.add(lens); } head.add(mesh(new THREE.BoxGeometry(0.03, 0.004, 0.004), fr, 0, 0.022, 0.107)); }

  // arms: upper arm down from the shoulder, forearm (a pivot at the elbow) out to the keyboard
  const forearms = [];
  for (const s of [-1, 1]) {
    const sh = V(s * 0.21, 0.47, 0.0), el = V(s * 0.23, 0.2, 0.12);
    body.add(limb(sh, el, 0.055, shirtM));
    const fa = new THREE.Group(); fa.position.copy(el); body.add(fa);
    const wr = V(-s * 0.08, 0.02, 0.28);
    fa.add(limb(V(0, 0, 0), wr, 0.045, skin));
    fa.add(mesh(rbox(0.07, 0.03, 0.09, 0.012), skin, wr.x, wr.y, wr.z + 0.04));
    forearms.push(fa);
  }
  const ph = r() * 10, lookEvery = 4 + r() * 5;
  g.userData.head = head;
  g.userData.anim = (t, mood = 60) => {
    body.scale.y = 1 + Math.sin(t * 1.6 + ph) * 0.008;
    forearms[0].rotation.x = -Math.max(0, Math.sin(t * 13 + ph)) * 0.06;
    forearms[1].rotation.x = -Math.max(0, Math.sin(t * 11 + ph + 1.3)) * 0.06;
    const k = (t + ph) % lookEvery, look = k < 1.4 ? Math.sin(k / 1.4 * Math.PI) : 0;   // now and then glance to the side
    head.rotation.y = look * (ph > 5 ? 0.6 : -0.6);
    head.rotation.x = 0.12 + Math.sin(t * 0.7 + ph) * 0.03;
    head.rotation.z = mood < 25 ? Math.sin(t * 9) * 0.07 : 0;   // stressed: head shakes
    const blink = ((t + ph * 3) % 4) < 0.12; for (const e of eyes) e.scale.y = blink ? 0.1 : 1;
  };
  return g;
}

// a walking person for the street and the view outside (no chair; arms and legs swing). Faces +z and walks along +z.
const SHIRTS = [0x334155, 0x7c2d12, 0x14532d, 0x1e3a8a, 0x581c87, 0xe5e7eb, 0x0f766e, 0x9d174d, 0xf4b23e, 0x111111, 0xb91c1c, 0x64748b];
export function walker(seed = 1) {
  const r = rng(seed + 31), pick = (a) => a[Math.floor(r() * a.length)];
  const g = new THREE.Group();
  const skin = std({ color: pick(SKIN), roughness: 0.65 }), hair = std({ color: pick(HAIR), roughness: 0.8 });
  const shirt = std({ color: pick(SHIRTS), roughness: 0.85 }), pants = std({ color: pick(PANTS), roughness: 0.9 }), shoe = std({ color: r() < 0.5 ? 0x111111 : 0xeeeeee, roughness: 0.6 });
  const s = 0.92 + r() * 0.16; g.scale.setScalar(s);
  const legs = [], arms = [];
  for (const x of [-0.09, 0.09]) {
    const hip = new THREE.Group(); hip.position.set(x, 0.86, 0); g.add(hip);
    hip.add(limb(V(0, 0, 0), V(0, -0.78, 0), 0.07, pants));
    hip.add(mesh(rbox(0.1, 0.07, 0.22, 0.03), shoe, 0, -0.82, 0.05));
    legs.push(hip);
  }
  g.add(mesh(rbox(0.36, 0.5, 0.2, 0.08), shirt, 0, 1.12, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10), skin, 0, 1.4, 0));
  for (const x of [-0.22, 0.22]) {
    const sh = new THREE.Group(); sh.position.set(x, 1.32, 0); g.add(sh);
    sh.add(limb(V(0, 0, 0), V(0, -0.3, 0), 0.05, shirt));
    sh.add(limb(V(0, -0.3, 0), V(0, -0.56, 0.04), 0.042, skin));
    arms.push(sh);
  }
  const head = new THREE.Group(); head.position.y = 1.56; g.add(head);
  const sk = mesh(new THREE.SphereGeometry(0.11, 18, 14), skin); sk.scale.set(0.92, 1.08, 1); head.add(sk);
  const dark = std({ color: 0x16120f });
  for (const x of [-0.038, 0.038]) head.add(mesh(new THREE.SphereGeometry(0.012, 8, 6), dark, x, 0.02, 0.098));
  const hc = mesh(new THREE.SphereGeometry(0.118, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.02, -0.012); head.add(hc);
  if (r() < 0.4) head.add(mesh(rbox(0.22, 0.24, 0.08, 0.035), hair, 0, -0.09, -0.075));
  if (r() < 0.25) { const bag = mesh(rbox(0.26, 0.32, 0.12, 0.04), std({ color: pick([0x222222, 0x8b5e34, 0x1e3a8a]) }), 0, 1.12, -0.16); g.add(bag); }
  const ph = r() * 6, speed = 0.9 + r() * 0.5;
  g.userData.speed = speed;
  g.userData.anim = (t) => { const k = Math.sin(t * speed * 6 + ph); legs[0].rotation.x = k * 0.45; legs[1].rotation.x = -k * 0.45; arms[0].rotation.x = -k * 0.35; arms[1].rotation.x = k * 0.35; g.children[2] && (g.position.y = g.userData.y0 + Math.abs(Math.cos(t * speed * 6 + ph)) * 0.025); };
  return g;
}
