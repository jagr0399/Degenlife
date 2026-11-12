// The starting bedroom: 4.2 x 3.6 m, 2.6 m high. Origin = floor centre. Back wall (window) at z = -1.8.
import * as THREE from 'three';
import * as P from '../props.mjs';
import { carpet, drywall, cityNight, cityDay, poster, canvasTex } from '../textures.mjs';
import * as Out from '../outside.mjs';

export const ROOM = { w: 4.2, d: 3.6, h: 2.6 };

export function buildBedroom(scene, { screenTex }) {
  const g = new THREE.Group(); g.name = 'bedroom';
  scene.add(g);
  const W = ROOM.w, D = ROOM.d, H = ROOM.h, hw = W / 2, hd = D / 2;
  const interactables = [];
  const colliders = [];
  const solid = (minX, maxX, minZ, maxZ) => colliders.push({ minX, maxX, minZ, maxZ });

  // ---- shell ----
  const floorTex = carpet([3, 2.6]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ ...floorTex, bumpScale: 1.2, roughness: 0.97 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const wallTex = drywall([2, 1.3]);
  const wallMat = new THREE.MeshStandardMaterial({ ...wallTex, bumpScale: 0.4, roughness: 0.92 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xb9bcbc, roughness: 0.95 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H; g.add(ceil);
  const wall = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; m.castShadow = true; g.add(m); return m; };
  // back wall with a window hole (x -0.9..0.3, y 0.95..2.0)
  const wx0 = -0.9, wx1 = 0.3, wy0 = 0.95, wy1 = 2.0;
  wall(wx0 + hw, H, (-hw + wx0) / 2, H / 2, -hd, 0);
  wall(hw - wx1, H, (wx1 + hw) / 2, H / 2, -hd, 0);
  wall(wx1 - wx0, wy0, (wx0 + wx1) / 2, wy0 / 2, -hd, 0);
  wall(wx1 - wx0, H - wy1, (wx0 + wx1) / 2, (H + wy1) / 2, -hd, 0);
  wall(W, H, 0, H / 2, hd, Math.PI);
  wall(D, H, -hw, H / 2, 0, Math.PI / 2);
  wall(D, H, hw, H / 2, 0, -Math.PI / 2);
  // baseboards
  const bb = new THREE.MeshStandardMaterial({ color: 0xd8d6cf, roughness: 0.6 });
  for (const [w, x, z, ry] of [[W, 0, -hd + 0.006, 0], [W, 0, hd - 0.006, 0], [D, -hw + 0.006, 0, Math.PI / 2], [D, hw - 0.006, 0, Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.012), bb); m.position.set(x, 0.04, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m);
  }
  solid(-hw - 1, -hw + 0.05, -hd - 1, hd + 1); solid(hw - 0.05, hw + 1, -hd - 1, hd + 1);
  solid(-hw - 1, hw + 1, -hd - 1, -hd + 0.05); solid(-hw - 1, hw + 1, hd - 0.05, hd + 1);

  // ---- window: frame, sill, glass, the city outside, moonlight ----
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.5 });
  const fw = 0.05, cx = (wx0 + wx1) / 2, cy = (wy0 + wy1) / 2, ww = wx1 - wx0, wh = wy1 - wy0;
  for (const [w, h, x, y] of [[ww + fw * 2, fw, cx, wy0 - fw / 2], [ww + fw * 2, fw, cx, wy1 + fw / 2], [fw, wh, wx0 - fw / 2, cy], [fw, wh, wx1 + fw / 2, cy], [fw * 0.6, wh, cx, cy]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameMat); m.position.set(x, y, -hd); m.castShadow = true; g.add(m);
  }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.2, 0.03, 0.2), frameMat); sill.position.set(cx, wy0 - 0.01, -hd + 0.08); sill.castShadow = sill.receiveShadow = true; g.add(sill);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshPhysicalMaterial({ color: 0x99aabb, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12 }));
  glass.position.set(cx, cy, -hd - 0.02); g.add(glass);
  // the real outside: we're one floor up, looking down on the street, the park and the skyline
  const outside = Out.cityView({ floorY: -4.5, width: 160, seed: 2 }); outside.group.position.x = cx; outside.group.position.z = -hd - 0.6; g.add(outside.group);
  const skyDome = Out.sky(); g.add(skyDome);
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0.9);
  moon.position.set(cx - 1.2, 3.4, -hd - 4); moon.target.position.set(cx + 0.6, 0, 0.2);
  moon.castShadow = true; moon.shadow.camera.left = -3; moon.shadow.camera.right = 3; moon.shadow.camera.top = 3; moon.shadow.camera.bottom = -3; moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.03;
  g.add(moon, moon.target);
  interactables.push({ id: 'window', mesh: glass, prompt: 'Look outside' });

  // ---- furniture ----
  const mat = P.mattress(); mat.position.set(-1.5, 0, -0.66); mat.rotation.y = 0; g.add(mat);
  solid(-2.05, -0.98, -1.68, 0.36);
  interactables.push({ id: 'bed', mesh: mat, prompt: 'Sleep' });

  const desk = P.box(); desk.position.set(1.25, 0, -1.5); g.add(desk);
  solid(0.92, 1.58, -1.75, -1.25);
  const lap = P.laptop(screenTex); lap.group.position.set(1.18, 0.46, -1.5); lap.group.rotation.y = 0.0; g.add(lap.group);
  interactables.push({ id: 'laptop', mesh: lap.group, prompt: 'Sit at laptop' });
  const lamp = P.deskLamp(); lamp.group.position.set(1.47, 0.46, -1.62); lamp.group.rotation.y = -0.4; g.add(lamp.group);
  interactables.push({ id: 'lamp', mesh: lamp.group, prompt: 'Toggle lamp' });
  const bag = P.beanbag(); bag.position.set(1.22, 0, -0.85); g.add(bag);

  const fr = P.fridge(); fr.position.set(1.8, 0, 0.35); fr.rotation.y = -Math.PI / 2; g.add(fr);
  solid(1.52, 2.1, 0.08, 0.62);
  interactables.push({ id: 'fridge', mesh: fr, prompt: 'Eat' });

  const dr = P.door(); dr.position.set(hw - 0.025, 0, 1.15); dr.rotation.y = -Math.PI / 2; g.add(dr);
  interactables.push({ id: 'door', mesh: dr, prompt: 'Locked' });

  // ---- tidied up (Nov 12): one neat pizza stack, two cans, a rug; the clothes pile and floor cans are gone ----
  const pz = P.pizzaBox(2); pz.position.set(1.05, 0, 1.55); pz.rotation.y = 0; g.add(pz);
  const canCols = [0x1fd18a, 0x1fd18a, 0xf4b23e, 0x3a7bff, 0xff4d5e];
  const canSpots = [[-0.8, -1.4, false], [1.62, -1.15, false]];
  canSpots.forEach(([x, z, t], i) => g.add(P.can(canCols[i % canCols.length], x, z, t)));
  const ph = P.phone(); ph.position.set(-0.86, 0, -1.25); ph.rotation.y = 0.4; g.add(ph);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.15), new THREE.MeshStandardMaterial({ roughness: 0.95, map: canvasTex(256, 192, (c, w, h) => { c.fillStyle = '#2a2f3d'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9a35a'; c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28); c.strokeStyle = '#3c4458'; c.lineWidth = 3; c.strokeRect(28, 28, w - 56, h - 56); for (let i = 0; i < 400; i++) { c.fillStyle = 'rgba(255,255,255,.025)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }) }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0.05, 0.004, 0.45); rug.receiveShadow = true; g.add(rug);

  // wall art: an original poster and sticky notes by the laptop
  const post = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshStandardMaterial({ map: poster(['TO THE', 'MOON', 'not financial advice'], ['#1d2a5c', '#0c0f1e']), roughness: 0.7 }));
  post.position.set(-hw + 0.01, 1.55, 0.6); post.rotation.y = Math.PI / 2; post.rotation.z = 0.02; g.add(post);
  const noteCols = ['#fff3a6', '#ffc6d9', '#bff3d2'], noteTxt = ['BUY LOW', 'rent fri!!', 'no more\nrugs'];
  noteTxt.forEach((t, i) => {
    const tex = canvasTex(128, 128, (c) => { c.fillStyle = noteCols[i]; c.fillRect(0, 0, 128, 128); c.fillStyle = '#333'; c.font = '600 22px "Comic Sans MS", cursive'; t.split('\n').forEach((l, k) => c.fillText(l, 12, 50 + k * 26)); });
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    n.position.set(0.85 + i * 0.12, 1.0 + (i % 2) * 0.1, -hd + 0.005); n.rotation.z = (i - 1) * 0.1; g.add(n);
  });

  // dim ceiling bounce so the far corners are not pitch black
  const hemi = new THREE.HemisphereLight(0x4a5a80, 0x2a2018, 0.35);
  g.add(hemi);

  // time of day: swaps the view outside and blends moonlight into sunlight
  const moonCol = new THREE.Color(0x8fa8ff), sunCol = new THREE.Color(0xffe6c4);
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function setTime(hour, scene) {
    const d = smooth(5.5, 8, hour) * (1 - smooth(18, 20.5, hour));
    Out.daylight({ sun: moon, hemi, scene, skyDome, outside, hour, d, wallZ: -hd, cx, nightLights: g.userData.nightLights || [] });
    return d;
  }

  return {
    group: g, setTime, colliders, interactables,
    spawn: { pos: new THREE.Vector3(-0.2, 0, 0.9), yaw: 0.45 },
    laptopScreen: lap.screen, laptopGlow: lap.glow, lamp, moon, hemi, outside,
    seat: { pos: new THREE.Vector3(1.19, 0.92, -1.08), look: new THREE.Vector3(1.18, 0.62, -1.62) },
  };
}
