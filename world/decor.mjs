// Apartment dressing (Nov 12): the details that make a box of walls read as a lived-in apartment.
// Every helper adds to group `g` and returns what it built; animated pieces push a function onto `anims`.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex } from './textures.mjs';

const std = (o) => new THREE.MeshStandardMaterial(o);
function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; return m; }
const rbox = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, r);

// curtains: a rod and two gathered panels per window on the back wall (z = wallZ)
export function curtains(g, wins, wallZ, { y0 = 0.95, y1 = 2.0, color = 0xd9d2c3, top = 2.25 } = {}) {
  const cloth = std({ color, roughness: 0.95, side: THREE.DoubleSide }), rod = std({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.35 });
  for (const [x0, x1] of wins) {
    const r = mesh(new THREE.CylinderGeometry(0.012, 0.012, x1 - x0 + 0.6, 10), rod, (x0 + x1) / 2, top, wallZ + 0.1, false); r.rotation.z = Math.PI / 2; g.add(r);
    const h = top - 0.05;
    for (const side of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(0.42, h, 14, 1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 38) * 0.025);   // folds
      geo.computeVertexNormals();
      const c = mesh(geo, cloth, side < 0 ? x0 - 0.12 : x1 + 0.12, h / 2 + 0.02, wallZ + 0.11);
      g.add(c);
    }
  }
}

// a ceiling light (flush dome) with a soft warm point light
export function ceilingLight(g, x, z, H, { intensity = 0.9, range = 6 } = {}) {
  const dome = mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1d6, emissiveIntensity: 0.9, roughness: 0.4 }), x, H - 0.005, z, false);
  dome.rotation.x = Math.PI; dome.scale.y = 0.35; g.add(dome);
  const l = new THREE.PointLight(0xffe2b8, intensity, range, 2); l.position.set(x, H - 0.25, z); g.add(l); (g.userData.nightLights = g.userData.nightLights || []).push({ l, base: intensity });
  return l;
}

// a ceiling fan whose blades turn slowly
export function ceilingFan(g, anims, x, z, H) {
  const f = new THREE.Group(), wood = std({ color: 0x5b3f2a, roughness: 0.6 }), metal = std({ color: 0xc9c4b8, metalness: 0.8, roughness: 0.3 });
  f.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8), metal, 0, -0.14, 0, false));
  f.add(mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.1, 18), metal, 0, -0.3, 0));
  const blades = new THREE.Group(); blades.position.y = -0.33; f.add(blades);
  for (let i = 0; i < 5; i++) { const b = mesh(rbox(0.5, 0.012, 0.11, 0.005), wood, 0.32, 0, 0); const arm = new THREE.Group(); arm.rotation.y = i * Math.PI * 2 / 5; b.rotation.x = 0.12; arm.add(b); blades.add(arm); }
  f.add(mesh(new THREE.SphereGeometry(0.07, 16, 10), new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff1d6, emissiveIntensity: 0.6 }), 0, -0.38, 0, false));
  f.position.set(x, H, z); g.add(f);
  anims.push((dt) => { blades.rotation.y += dt * 2.4; });
  return f;
}

// a wall clock that shows the in-game time. ry faces it into the room.
export function wallClock(g, anims, game, x, y, z, ry) {
  const c = new THREE.Group();
  const face = canvasTex(256, 256, (cx, w) => { cx.fillStyle = '#f4f1ea'; cx.beginPath(); cx.arc(128, 128, 124, 0, 7); cx.fill(); cx.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; cx.save(); cx.translate(128 + Math.sin(a) * 104, 128 - Math.cos(a) * 104); cx.rotate(a); cx.fillRect(-3, -10, 6, i % 3 ? 12 : 22); cx.restore(); } });
  c.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 40), std({ color: 0x1d1d1f, roughness: 0.5 }), 0, 0, 0));
  c.children[0].rotation.x = Math.PI / 2;
  const f = new THREE.Mesh(new THREE.CircleGeometry(0.155, 40), std({ map: face, roughness: 0.6 })); f.position.z = 0.019; c.add(f);
  const hand = (len, w, col) => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.004), std({ color: col })); m.position.y = len / 2 - 0.015; p.add(m); p.position.z = 0.024; c.add(p); return p; };
  const hr = hand(0.08, 0.012, 0x111111), mn = hand(0.12, 0.008, 0x111111), sc = hand(0.13, 0.003, 0xc81e1e);
  c.position.set(x, y, z); c.rotation.y = ry; g.add(c);
  anims.push((dt, t) => {
    const hour = game && game.clock ? game.clock.hour : 9, m = hour % 1 * 60;
    hr.rotation.z = -(hour % 12) / 12 * Math.PI * 2; mn.rotation.z = -m / 60 * Math.PI * 2; sc.rotation.z = -Math.floor(t) % 60 / 60 * Math.PI * 2;
  });
  return c;
}

// framed prints (abstract art drawn on canvases) in a row; ry faces them into the room
const ART = [
  (c, w, h) => { c.fillStyle = '#e9e1d2'; c.fillRect(0, 0, w, h); c.fillStyle = '#d0623d'; c.beginPath(); c.arc(w * 0.4, h * 0.45, w * 0.28, 0, 7); c.fill(); c.fillStyle = '#23395b'; c.fillRect(w * 0.45, h * 0.5, w * 0.4, h * 0.35); },
  (c, w, h) => { c.fillStyle = '#1f2a33'; c.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { c.strokeStyle = ['#f4b23e', '#e9e1d2', '#5aa58f'][i % 3]; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, h * 1.05, 40 + i * 26, Math.PI, 0); c.stroke(); } },
  (c, w, h) => { c.fillStyle = '#efe9df'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2b2b2b'; c.lineWidth = 4; c.beginPath(); for (let x = 0; x <= w; x += 4) c.lineTo(x, h * 0.6 - Math.sin(x / 30) * 30 - Math.sin(x / 11) * 8 - x * 0.25); c.stroke(); c.fillStyle = '#2bd67b'; c.font = '700 26px Inter, sans-serif'; c.fillText('HODL', 20, h - 24); },
  (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f2b880'); gr.addColorStop(1, '#6b4c7a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2140'; c.beginPath(); c.moveTo(0, h); c.lineTo(w * 0.35, h * 0.5); c.lineTo(w * 0.6, h * 0.75); c.lineTo(w * 0.8, h * 0.45); c.lineTo(w, h); c.fill(); },
];
export function frames(g, list) {
  const frameMat = std({ color: 0x1a1a1a, roughness: 0.5 }), mat = std({ color: 0xf3efe7, roughness: 0.9 });
  list.forEach(([x, y, z, ry, w, h, art]) => {
    const fr = new THREE.Group();
    fr.add(mesh(new THREE.BoxGeometry(w, h, 0.025), frameMat, 0, 0, 0));
    fr.add(mesh(new THREE.PlaneGeometry(w - 0.04, h - 0.04), mat, 0, 0, 0.0131, false));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, h - 0.12), std({ map: canvasTex(256, Math.round(256 * h / w), ART[art % ART.length]), roughness: 0.7 })); pic.position.z = 0.014; fr.add(pic);
    fr.position.set(x, y, z); fr.rotation.y = ry; g.add(fr);
  });
}

// a woven rug
export function rug(g, x, z, w, d, { base = '#3b3f4f', edge = '#c9a35a', ry = 0 } = {}) {
  const tex = canvasTex(512, Math.round(512 * d / w), (c, W, H) => { c.fillStyle = base; c.fillRect(0, 0, W, H); c.strokeStyle = edge; c.lineWidth = 10; c.strokeRect(22, 22, W - 44, H - 44); c.lineWidth = 3; c.strokeRect(42, 42, W - 84, H - 84); for (let i = 0; i < 2500; i++) { c.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.04) + ')'; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); } });
  const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std({ map: tex, roughness: 1 })); r.rotation.x = -Math.PI / 2; r.rotation.z = ry; r.position.set(x, 0.005, z); r.receiveShadow = true; g.add(r);
  return r;
}

// a floor lamp with a glowing shade
export function floorLamp(g, x, z) {
  const l = new THREE.Group(), metal = std({ color: 0x1d1d1f, metalness: 0.6, roughness: 0.4 });
  l.add(mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.03, 24), metal, 0, 0.015, 0));
  l.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.45, 10), metal, 0, 0.74, 0));
  l.add(mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.26, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xf1e6cf, emissive: 0xffd9a0, emissiveIntensity: 0.55, side: THREE.DoubleSide, roughness: 0.9 }), 0, 1.5, 0, false));
  const p = new THREE.PointLight(0xffd29a, 0.6, 3.2, 2); p.position.y = 1.42; l.add(p); (g.userData.nightLights = g.userData.nightLights || []).push({ l: p, base: 0.6 });
  l.position.set(x, 0, z); g.add(l);
  return l;
}

// baseboards along the four walls
export function baseboards(g, w, d) {
  const m = std({ color: 0xece9e2, roughness: 0.6 }), hw = w / 2, hd = d / 2;
  for (const [len, x, z, ry] of [[w, 0, -hd + 0.006, 0], [w, 0, hd - 0.006, Math.PI], [d, -hw + 0.006, 0, Math.PI / 2], [d, hw - 0.006, 0, -Math.PI / 2]]) { const b = mesh(new THREE.BoxGeometry(len, 0.09, 0.012), m, x, 0.045, z, false); b.rotation.y = ry; g.add(b); }
}

// a kitchenette run against the right wall (x = wallX, facing -x): base cabinets + counter + sink + upper cabinets + kettle
export function kitchenette(g, anims, wallX, z0, z1) {
  const k = new THREE.Group(), len = z1 - z0, cab = std({ color: 0x31363f, roughness: 0.55 }), top = std({ color: 0xd8d4cc, roughness: 0.35 }), steel = std({ color: 0xb8bcc2, metalness: 0.85, roughness: 0.25 });
  k.add(mesh(rbox(0.6, 0.86, len, 0.01), cab, -0.3, 0.43, 0));
  k.add(mesh(rbox(0.64, 0.04, len + 0.02, 0.008), top, -0.32, 0.88, 0));
  const doors = Math.max(1, Math.round(len / 0.45));
  for (let i = 0; i < doors; i++) { const zz = -len / 2 + (i + 0.5) * len / doors; k.add(mesh(new THREE.BoxGeometry(0.01, 0.7, len / doors - 0.03), std({ color: 0x3a404a, roughness: 0.5 }), -0.605, 0.45, zz)); k.add(mesh(new THREE.BoxGeometry(0.02, 0.012, 0.12), steel, -0.62, 0.74, zz)); }
  k.add(mesh(new THREE.BoxGeometry(0.4, 0.012, 0.44), std({ color: 0x9aa0a6, metalness: 0.8, roughness: 0.3 }), -0.32, 0.905, -len / 4));
  const tap = mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 16, Math.PI), steel, -0.12, 0.96, -len / 4); tap.rotation.y = Math.PI / 2; k.add(tap);
  for (let i = 0; i < doors; i++) { const zz = -len / 2 + (i + 0.5) * len / doors; k.add(mesh(rbox(0.34, 0.6, len / doors - 0.02, 0.01), cab, -0.17, 1.75, zz)); }
  const kettle = new THREE.Group(); kettle.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.2, 20), std({ color: 0xc81e1e, roughness: 0.35 }), 0, 0.1, 0)); kettle.position.set(-0.32, 0.9, len / 4); k.add(kettle);
  k.add(mesh(rbox(0.3, 0.02, 0.22, 0.005), std({ color: 0x8b5e34, roughness: 0.6 }), -0.34, 0.91, len / 4 - 0.25));
  k.position.set(wallX, 0, (z0 + z1) / 2); g.add(k);
  return k;
}

export function doormat(g, x, z, ry = 0) {
  const t = canvasTex(256, 160, (c, w, h) => { c.fillStyle = '#5b4632'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a1f15'; c.font = '800 38px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('GM', w / 2, h / 2 + 14); });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.015, 0.48), std({ map: t, roughness: 1 })); m.position.set(x, 0.008, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m);
}

// a racing-style gaming chair: five-star base on casters, gas lift, bucket seat with bolsters, tall back with
// headrest and lumbar pillows, armrests. Faces -z (sit facing the desk); the back is on +z.
export function gamingChair(accent = 0xc81e1e) {
  const c = new THREE.Group(), blk = std({ color: 0x15161a, roughness: 0.55 }), red = std({ color: accent, roughness: 0.5 }), chrome = std({ color: 0x9a9da3, metalness: 0.9, roughness: 0.25 });
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, leg = new THREE.Group(); leg.rotation.y = a;
    const l = mesh(rbox(0.3, 0.035, 0.05, 0.012), blk, 0.15, 0.08, 0); l.rotation.z = 0.12; leg.add(l);
    const w = mesh(new THREE.SphereGeometry(0.03, 10, 8), blk, 0.3, 0.03, 0); w.scale.set(1, 1, 0.7); leg.add(w);
    c.add(leg);
  }
  c.add(mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.3, 12), chrome, 0, 0.25, 0));
  const top = new THREE.Group(); top.position.y = 0.44; c.add(top);
  top.add(mesh(rbox(0.52, 0.09, 0.5, 0.04), blk, 0, 0.04, 0));
  top.add(mesh(rbox(0.3, 0.02, 0.44, 0.01), red, 0, 0.09, 0));
  for (const x of [-0.24, 0.24]) top.add(mesh(rbox(0.07, 0.07, 0.48, 0.03), blk, x, 0.1, 0));   // bolsters
  const back = new THREE.Group(); back.position.set(0, 0.1, 0.23); back.rotation.x = -0.12; top.add(back);
  back.add(mesh(rbox(0.5, 0.8, 0.09, 0.05), blk, 0, 0.42, 0));
  back.add(mesh(rbox(0.22, 0.62, 0.02, 0.01), red, 0, 0.38, -0.046));
  for (const x of [-0.2, 0.2]) back.add(mesh(rbox(0.09, 0.66, 0.11, 0.04), red, x, 0.36, -0.01));
  back.add(mesh(rbox(0.34, 0.12, 0.06, 0.05), blk, 0, 0.74, -0.07));                                  // headrest pillow
  back.add(mesh(rbox(0.32, 0.14, 0.07, 0.05), blk, 0, 0.18, -0.07));                                  // lumbar pillow
  for (const x of [-0.3, 0.3]) { top.add(mesh(new THREE.BoxGeometry(0.03, 0.22, 0.04), blk, x, 0.2, 0.02)); top.add(mesh(rbox(0.08, 0.035, 0.26, 0.015), blk, x, 0.32, 0)); }
  return c;
}

// office blinds: horizontal slats over a window on the back wall
export function blinds(g, wins, wallZ, { y0 = 0.95, y1 = 2.0, open = 0.55 } = {}) {
  const m = std({ color: 0xe6e4df, roughness: 0.6 });
  for (const [x0, x1] of wins) {
    const w = x1 - x0, low = y1 - (y1 - y0) * open;
    g.add(mesh(new THREE.BoxGeometry(w + 0.06, 0.06, 0.06), m, (x0 + x1) / 2, y1 + 0.06, wallZ + 0.07, false));
    for (let y = y1; y > low; y -= 0.035) { const s = mesh(new THREE.BoxGeometry(w, 0.004, 0.045), m, (x0 + x1) / 2, y, wallZ + 0.07, false); s.rotation.x = 0.5; g.add(s); }
    g.add(mesh(new THREE.BoxGeometry(w, 0.02, 0.05), m, (x0 + x1) / 2, low, wallZ + 0.07, false));
  }
}

// a whiteboard with some trading scribbles; ry faces it into the room
export function whiteboard(g, x, y, z, ry, w = 1.8, h = 1.0) {
  const tex = canvasTex(512, Math.round(512 * h / w), (c, W, H) => {
    c.fillStyle = '#f7f7f4'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#1f6feb'; c.lineWidth = 4; c.beginPath(); c.moveTo(30, H - 40); for (let i = 0; i < 12; i++) c.lineTo(30 + i * 22, H - 40 - Math.pow(i, 1.6) * 6 + (i % 3) * 10); c.stroke();
    c.fillStyle = '#c81e1e'; c.font = '700 30px "Comic Sans MS", cursive'; c.fillText('Q4 TARGET: 10x', 300, 60);
    c.fillStyle = '#222'; c.font = '22px "Comic Sans MS", cursive'; ['1. no rugs', '2. take profits', '3. touch grass?'].forEach((t, i) => c.fillText(t, 310, 110 + i * 34));
  });
  const fr = new THREE.Group();
  fr.add(mesh(new THREE.BoxGeometry(w + 0.05, h + 0.05, 0.03), std({ color: 0xb8bcc2, metalness: 0.7, roughness: 0.3 }), 0, 0, 0));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map: tex, roughness: 0.25 })); face.position.z = 0.017; fr.add(face);
  fr.add(mesh(new THREE.BoxGeometry(w * 0.6, 0.03, 0.06), std({ color: 0xb8bcc2, metalness: 0.7, roughness: 0.3 }), 0, -h / 2 - 0.02, 0.03));
  fr.position.set(x, y, z); fr.rotation.y = ry; g.add(fr);
}

// a water cooler with a bubbling jug
export function waterCooler(g, anims, x, z, ry = 0) {
  const w = new THREE.Group();
  w.add(mesh(rbox(0.32, 0.95, 0.32, 0.03), std({ color: 0xe9eaec, roughness: 0.45 }), 0, 0.475, 0));
  w.add(mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), std({ color: 0x3a7bff }), -0.06, 0.75, 0.165));
  w.add(mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), std({ color: 0xc81e1e }), 0.06, 0.75, 0.165));
  const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.4, 24), new THREE.MeshPhysicalMaterial({ color: 0x8fc3ff, transparent: true, opacity: 0.45, roughness: 0.05 })); jug.position.y = 1.15; w.add(jug);
  const bub = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); w.add(bub);
  anims.push((dt, t) => { const k = (t * 0.6) % 1; bub.position.set(Math.sin(t * 3) * 0.03, 0.97 + k * 0.36, 0); bub.material.opacity = k < 0.9 ? 0.6 : 0; });
  w.position.set(x, 0, z); w.rotation.y = ry; g.add(w);
}

// flat LED ceiling panels
export function ceilingPanels(g, list, H) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4f8ff, emissiveIntensity: 1, roughness: 0.4 });
  for (const [x, z, w = 1.2, d = 0.6] of list) { const p = mesh(new THREE.BoxGeometry(w, 0.02, d), m, x, H - 0.012, z, false); g.add(p); }
}

// an interior partition wall from (x0,z0) to (x1,z1), full height, both sides painted
export function partition(g, x0, z0, x1, z1, H, color = 0x9a958c) {
  const len = Math.hypot(x1 - x0, z1 - z0), m = std({ color, roughness: 0.92 });
  const w = mesh(new THREE.BoxGeometry(len, H, 0.1), m, (x0 + x1) / 2, H / 2, (z0 + z1) / 2); w.rotation.y = -Math.atan2(z1 - z0, x1 - x0); g.add(w);
  const bb = std({ color: 0xece9e2, roughness: 0.6 });
  for (const s of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(len, 0.09, 0.012), bb, 0, 0, 0, false); b.position.set((x0 + x1) / 2 + s * 0.056 * Math.sin(w.rotation.y), 0.045, (z0 + z1) / 2 + s * 0.056 * Math.cos(w.rotation.y)); b.rotation.y = w.rotation.y; g.add(b); }
  return w;
}
