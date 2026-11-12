// First-person walking: pointer-lock mouse look, WASD, Shift to hurry, C to crouch, head bob. Collision via BH.Collide.
import * as THREE from 'three';

const EYE = 1.65, CROUCH = 1.1, SPEED = 1.9, RUN = 1.7;

export function createController(camera, dom, colliders, opts = {}) {
  const BH = window.BH;
  const keys = new Set();
  const state = { yaw: 0, pitch: 0, x: 0, z: 0, eye: EYE, bobT: 0, enabled: true, locked: false };
  const settings = opts.settings || { sens: 1, bob: '1' };
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');

  function onMove(e) {
    if (!state.locked || !state.enabled) return;
    const k = 0.0022 * (settings.sens || 1);
    state.yaw -= e.movementX * k;
    state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch - e.movementY * k));
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('pointerlockchange', () => { state.locked = document.pointerLockElement === dom; if (opts.onLockChange) opts.onLockChange(state.locked); });
  window.addEventListener('keydown', (e) => { if (!e.repeat) keys.add(e.code); });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  function apply() {
    euler.set(state.pitch, state.yaw, 0);
    camera.quaternion.setFromEuler(euler);
    const bob = settings.bob === '0' ? 0 : Math.sin(state.bobT * 9) * 0.025;
    camera.position.set(state.x, state.eye + bob, state.z);
  }

  return {
    state,
    place(x, z, yaw) { state.x = x; state.z = z; state.yaw = yaw || 0; state.pitch = -0.05; apply(); },
    lock() { try { const p = dom.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed yet */ } },
    unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
    update(dt) {
      if (!state.enabled) return;
      dt = Math.min(dt, 0.05);
      let f = 0, s = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;
      const crouch = keys.has('KeyC') || keys.has('ControlLeft');
      state.eye += ((crouch ? CROUCH : EYE) - state.eye) * Math.min(1, dt * 10);
      const len = Math.hypot(f, s);
      if (len) {
        const sp = SPEED * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : 1) * (crouch ? 0.5 : 1) / len;
        const sin = Math.sin(state.yaw), cos = Math.cos(state.yaw);
        const mx = (-sin * f + cos * s) * sp * dt, mz = (-cos * f - sin * s) * sp * dt;
        const p = BH.Collide.slide({ x: state.x, z: state.z }, { x: mx, z: mz }, 0.28, colliders);
        state.x = p.x; state.z = p.z;
        state.bobT += dt * (sp * len / SPEED);
      } else state.bobT *= 0.9;
      apply();
    },
  };
}
