// Real 3D models (Poly Haven, CC0) from assets/models/<id>/. model(id, size) returns a Group right away and fills it
// once the glTF loads: scaled so its largest side (or height with fit:'h') is `size` metres, centred, standing on y=0.
// If a file is missing it calls `fallback()` (the old procedural prop) so a room is never left empty.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();   // id -> Promise<Object3D>
const FILES = {};          // id -> gltf file name (from model.json), filled lazily

function load(id) {
  if (!cache.has(id)) {
    cache.set(id, (async () => {
      let file = FILES[id];
      if (!file) { const r = await fetch('assets/models/' + id + '/model.json'); if (!r.ok) throw new Error('no model ' + id); file = FILES[id] = (await r.json()).file; }
      const gl = await loader.loadAsync('assets/models/' + id + '/' + file);
      gl.scene.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material && o.material.map) o.material.map.anisotropy = 4; } });
      return gl.scene;
    })());
  }
  return cache.get(id);
}

export function model(id, size, opt = {}) {
  const g = new THREE.Group(); g.userData.model = id;
  load(id).then((src) => {
    const m = opt.pick != null ? src.children[opt.pick % src.children.length].clone(true) : src.clone(true);
    if (opt.pick != null) m.position.set(0, 0, 0);
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m), s = box.getSize(new THREE.Vector3());
    const k = !size ? 1 : size / (opt.fit === 'h' ? s.y : opt.fit === 'w' ? s.x : Math.max(s.x, s.y, s.z));
    m.scale.setScalar(k);
    const c = box.getCenter(new THREE.Vector3());
    m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
    g.add(m); g.userData.ready = true; g.userData.height = s.y * k;
    if (opt.onLoad) opt.onLoad(m, g);
  }).catch(() => { if (opt.fallback) g.add(opt.fallback()); });
  return g;
}
export const preload = (ids) => ids.forEach((id) => load(id).catch(() => {}));
