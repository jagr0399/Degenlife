// Looks for the interactable under the crosshair (<= 2.2 m), highlights it and shows "E: ..." on the HUD.
import * as THREE from 'three';

const REACH = 2.2;

export function createInteractor(camera, interactables, hud) {
  const ray = new THREE.Raycaster();
  ray.far = REACH;
  const center = new THREE.Vector2(0, 0);
  let current = null;
  const glow = new Map(); // material -> original emissive
  const owner = new Map(); // mesh -> interactable
  for (const it of interactables) it.mesh.traverse((o) => { if (o.isMesh) owner.set(o, it); });
  const targets = [...owner.keys()];

  function highlight(it, on) {
    if (!it) return;
    it.mesh.traverse((o) => {
      if (!o.isMesh || !o.material || !o.material.emissive || o.material.emissiveMap) return;
      if (on) { if (!glow.has(o.material)) glow.set(o.material, o.material.emissive.getHex()); o.material.emissive.setHex(0x2a2010); }
      else if (glow.has(o.material)) { o.material.emissive.setHex(glow.get(o.material)); glow.delete(o.material); }
    });
  }

  return {
    get current() { return current; },
    update(promptFor) {
      ray.setFromCamera(center, camera);
      const hit = ray.intersectObjects(targets, false)[0];
      const it = hit ? owner.get(hit.object) : null;
      if (it !== current) { highlight(current, false); current = it; highlight(current, true); }
      hud.prompt(current ? (promptFor ? promptFor(current) : current.prompt) : '');
      return current;
    },
    clear() { highlight(current, false); current = null; hud.prompt(''); },
  };
}
