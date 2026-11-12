// Room props built from shapes with PBR materials (swap-in GLB models later through assets/manifest.json).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { cardboard } from './textures.mjs';

const std = (o) => new THREE.MeshStandardMaterial(o);
export const MAT = {
  plasticDark: std({ color: 0x1b1d22, roughness: 0.45, metalness: 0.1 }),
  plasticWhite: std({ color: 0xd9dbd6, roughness: 0.35 }),
  alu: std({ color: 0xa9adb3, roughness: 0.32, metalness: 0.9 }),
  fabricGrey: std({ color: 0x6d7077, roughness: 0.95 }),
  fabricBlue: std({ color: 0x2f4a6b, roughness: 0.92 }),
  sheet: std({ color: 0xc9c4b8, roughness: 0.9 }),
  wood: std({ color: 0x6b4a2f, roughness: 0.7 }),
  chrome: std({ color: 0xdddddd, roughness: 0.15, metalness: 1 }),
  rubber: std({ color: 0x111111, roughness: 0.9 }),
};

function mesh(geo, mat, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true;
  return m;
}
const rbox = (w, h, d, r = 0.02, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);

export function mattress() {
  const g = new THREE.Group();
  g.add(mesh(rbox(1.0, 0.2, 2.0, 0.06), MAT.sheet, 0, 0.1, 0));
  const pillow = mesh(rbox(0.6, 0.12, 0.38, 0.05), std({ color: 0xe8e4da, roughness: 0.95 }), 0, 0.26, -0.75);
  pillow.rotation.y = 0.12; g.add(pillow);
  // rumpled blanket: a displaced plane
  const geo = new THREE.PlaneGeometry(1.05, 1.25, 24, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, 0.035 + 0.03 * Math.sin(x * 9 + y * 3) + 0.02 * Math.cos(y * 11) + 0.012 * Math.sin(x * 23) - 0.06 * Math.max(0, Math.abs(x) - 0.42) * 10); }
  geo.computeVertexNormals();
  const blanket = mesh(geo, std({ color: 0x2f4a6b, roughness: 0.95, side: THREE.DoubleSide }), 0.02, 0.232, 0.3);
  blanket.rotation.x = -Math.PI / 2; blanket.rotation.z = 0.05; g.add(blanket);
  return g;
}

export function box(w = 0.62, h = 0.46, d = 0.46) {
  const mat = std({ map: cardboard(), roughness: 0.85 });
  const g = new THREE.Group();
  g.add(mesh(rbox(w, h, d, 0.01, 1), mat, 0, h / 2, 0));
  return g;
}

// laptop: returns the group, the screen mesh (gets the live CanvasTexture) and a point light for screen glow
export function laptop(screenTex) {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.34, 0.018, 0.235, 0.006), MAT.alu, 0, 0.009, 0));
  const keys = mesh(new THREE.PlaneGeometry(0.29, 0.1), std({ color: 0x15161a, roughness: 0.6 }), 0, 0.0185, 0.02, false);
  keys.rotation.x = -Math.PI / 2; g.add(keys);
  const lid = new THREE.Group();
  lid.position.set(0, 0.018, -0.115);
  lid.rotation.x = -0.28;
  lid.add(mesh(rbox(0.34, 0.225, 0.008, 0.005), MAT.alu, 0, 0.1125, -0.004));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.315, 0.197), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 1.0, roughness: 0.25 }));
  screen.position.set(0, 0.1125, 0.0005);
  lid.add(screen);
  g.add(lid);
  const glow = new THREE.PointLight(0x7fb0ff, 0.6, 1.6, 2);
  glow.position.set(0, 0.16, 0.05);
  g.add(glow);
  return { group: g, screen, glow };
}

export function deskLamp() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 24), MAT.plasticDark, 0, 0.01, 0));
  const arm = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 8), MAT.plasticDark, 0, 0.19, 0);
  arm.rotation.z = 0.25; g.add(arm);
  const shade = mesh(new THREE.ConeGeometry(0.07, 0.11, 24, 1, true), std({ color: 0x23262c, roughness: 0.5, side: THREE.DoubleSide }), -0.05, 0.37, 0.02);
  shade.rotation.z = 0.9; g.add(shade);
  const bulb = mesh(new THREE.SphereGeometry(0.022, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffc27a, emissiveIntensity: 6 }), -0.07, 0.345, 0.02, false);
  g.add(bulb);
  const light = new THREE.SpotLight(0xffb36b, 9, 5, 1.0, 0.6, 2);
  light.position.set(-0.07, 0.345, 0.02);
  light.target.position.set(-0.45, -0.4, 0.25);
  light.castShadow = true; light.shadow.bias = -0.0004; light.shadow.normalBias = 0.02;
  g.add(light, light.target);
  const fill = new THREE.PointLight(0xffa860, 1.2, 4, 2);
  fill.position.set(-0.07, 0.4, 0.02);
  g.add(fill);
  return { group: g, light, fill, bulb };
}

export function fridge() {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.5, 0.85, 0.52, 0.03), MAT.plasticWhite, 0, 0.425, 0));
  g.add(mesh(rbox(0.02, 0.3, 0.03, 0.008), MAT.chrome, -0.2, 0.55, 0.27));
  g.add(mesh(new THREE.BoxGeometry(0.46, 0.006, 0.01), std({ color: 0x9a9c99 }), 0, 0.62, 0.262, false));
  // magnets / a takeout menu
  const note = mesh(new THREE.PlaneGeometry(0.12, 0.16), std({ color: 0xfff3a6, roughness: 0.9 }), 0.08, 0.42, 0.262, false); note.rotation.z = -0.08; g.add(note);
  return g;
}

export function can(color, x = 0, z = 0, tipped = false) {
  const m = mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.123, 20), std({ color, roughness: 0.3, metalness: 0.7 }), x, tipped ? 0.033 : 0.0615, z);
  if (tipped) { m.rotation.z = Math.PI / 2; m.rotation.y = Math.random() * 3; }
  return m;
}

export function pizzaBox(stack = 1) {
  const g = new THREE.Group();
  const mat = std({ color: 0xc9a273, roughness: 0.85 });
  for (let i = 0; i < stack; i++) { const b = mesh(rbox(0.4, 0.045, 0.4, 0.004, 1), mat, (Math.random() - 0.5) * 0.04, 0.0225 + i * 0.046, (Math.random() - 0.5) * 0.04); b.rotation.y = (Math.random() - 0.5) * 0.3; g.add(b); }
  const logo = mesh(new THREE.CircleGeometry(0.08, 24), std({ color: 0xb8322a, roughness: 0.8 }), 0, stack * 0.046 + 0.0005, 0, false);
  logo.rotation.x = -Math.PI / 2; g.add(logo);
  return g;
}

export function phone() {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.075, 0.009, 0.155, 0.006), MAT.plasticDark, 0, 0.0045, 0));
  const scr = mesh(new THREE.PlaneGeometry(0.068, 0.145), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x2a3550, emissiveIntensity: 0.6 }), 0, 0.0092, 0, false);
  scr.rotation.x = -Math.PI / 2; g.add(scr);
  const cable = mesh(new THREE.TorusGeometry(0.12, 0.003, 6, 40, Math.PI * 1.3), std({ color: 0xeeeeee, roughness: 0.6 }), 0.05, 0.004, 0.16, false);
  cable.rotation.x = -Math.PI / 2; g.add(cable);
  return g;
}

export function beanbag() {
  const geo = new THREE.SphereGeometry(0.42, 32, 20);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setY(i, y < 0 ? y * 0.35 : y * 0.55); const s = 1 + 0.04 * Math.sin(pos.getX(i) * 14) * Math.cos(pos.getZ(i) * 11); pos.setX(i, pos.getX(i) * s); pos.setZ(i, pos.getZ(i) * s); }
  geo.computeVertexNormals();
  const m = mesh(geo, std({ color: 0x5a3d6e, roughness: 0.88 }), 0, 0.17, 0);
  const g = new THREE.Group(); g.add(m); return g;
}

export function clothesPile() {
  const g = new THREE.Group();
  const cols = [0x2b2b30, 0x7b2d2d, 0x3d5a40, 0x9a9488];
  for (let i = 0; i < 6; i++) {
    const geo = new THREE.SphereGeometry(0.16 + Math.random() * 0.06, 10, 6);
    geo.scale(1.3, 0.28, 1);
    const m = mesh(geo, std({ color: cols[i % cols.length], roughness: 0.97 }), (Math.random() - 0.5) * 0.35, 0.04 + i * 0.025, (Math.random() - 0.5) * 0.3);
    m.rotation.y = Math.random() * 3; g.add(m);
  }
  return g;
}

export function door() {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.9, 2.05, 0.045, 0.01), std({ color: 0x5b5249, roughness: 0.6 }), 0, 1.025, 0));
  for (const y of [0.55, 1.5]) g.add(mesh(rbox(0.7, 0.75, 0.01, 0.01), std({ color: 0x544b42, roughness: 0.6 }), 0, y, 0.026, false));
  g.add(mesh(new THREE.SphereGeometry(0.03, 16, 12), MAT.chrome, 0.36, 1.0, 0.05));
  return g;
}
