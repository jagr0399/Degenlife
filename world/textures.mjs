// Canvas-generated textures (no image files needed): carpet, drywall, cardboard, the night city, posters.
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function canvasTex(w, h, draw, opts = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = opts.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  return t;
}

function noise(ctx, w, h, r, amount, alpha) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n; if (alpha) d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export function carpet(repeat) {
  const r = rng(11);
  const map = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#4a4740'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '30,28,25' : '95,90,80'},${0.25 * r()})`; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    // worn patches and a coffee stain
    for (let i = 0; i < 5; i++) { const x = r() * w, y = r() * h; const g = c.createRadialGradient(x, y, 0, x, y, 60 + r() * 90); g.addColorStop(0, 'rgba(120,112,98,0.18)'); g.addColorStop(1, 'rgba(120,112,98,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
    noise(c, w, h, r, 18);
  }, { repeat });
  const bump = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); noise(c, w, h, r, 120); }, { repeat: [repeat[0] * 2, repeat[1] * 2], data: true });
  return { map, bumpMap: bump };
}

export function drywall(repeat, tint = '#8f9496') {
  const r = rng(23);
  const map = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = tint; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) { const x = r() * w, y = r() * h; const g = c.createRadialGradient(x, y, 0, x, y, 80 + r() * 140); g.addColorStop(0, 'rgba(70,66,58,0.10)'); g.addColorStop(1, 'rgba(70,66,58,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
    noise(c, w, h, r, 8);
  }, { repeat });
  const bump = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); noise(c, w, h, r, 40); }, { repeat, data: true });
  return { map, bumpMap: bump };
}

export function cardboard() {
  const r = rng(5);
  return canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#a77d4f'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(80,55,30,0.18)'; for (let x = 0; x < w; x += 6) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 2, h); c.stroke(); }
    c.fillStyle = 'rgba(210,190,150,0.55)'; c.fillRect(0, h / 2 - 14, w, 28); // packing tape
    c.fillStyle = 'rgba(40,30,20,0.6)'; c.font = 'bold 22px sans-serif'; c.fillText('THIS SIDE UP ↑', 20, 50);
    noise(c, w, h, r, 14);
  });
}

export function cityNight() {
  const r = rng(77);
  return canvasTex(1024, 512, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#05070f'); sky.addColorStop(0.6, '#141a33'); sky.addColorStop(1, '#3a2a3a');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; c.fillRect(r() * w, r() * h * 0.45, 1.2, 1.2); }
    c.fillStyle = 'rgba(235,235,215,0.95)'; c.beginPath(); c.arc(820, 90, 26, 0, Math.PI * 2); c.fill();
    for (let layer = 0; layer < 3; layer++) {
      let x = -20;
      while (x < w) {
        const bw = 40 + r() * 90, bh = h * (0.25 + r() * 0.45) * (1 - layer * 0.18);
        const top = h - bh;
        c.fillStyle = ['#0b0e18', '#0f1322', '#151a2c'][layer]; c.fillRect(x, top, bw, bh);
        for (let wy = top + 8; wy < h - 6; wy += 11) for (let wx = x + 5; wx < x + bw - 6; wx += 9) {
          if (r() < 0.32) { c.fillStyle = r() < 0.8 ? `rgba(255,${190 + r() * 50 | 0},120,${0.55 + r() * 0.4})` : 'rgba(120,200,255,0.8)'; c.fillRect(wx, wy, 4, 6); }
        }
        if (r() < 0.15) { c.fillStyle = 'rgba(255,60,60,0.9)'; c.fillRect(x + bw / 2, top - 6, 3, 3); }
        x += bw + 4 + r() * 10;
      }
    }
  });
}

export function poster(lines, colors) {
  return canvasTex(384, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 12; i++) c.fillRect(0, i * 46, w, 2);
    c.fillStyle = '#fff'; c.textAlign = 'center';
    c.font = '900 64px Inter, sans-serif'; c.fillText(lines[0], w / 2, 170);
    c.font = '800 44px Inter, sans-serif'; c.fillText(lines[1], w / 2, 240);
    c.font = '600 22px Inter, sans-serif'; c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillText(lines[2] || '', w / 2, h - 50);
    // a little rocket and moon
    c.fillStyle = '#f4b23e'; c.beginPath(); c.arc(w / 2, 360, 46, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.arc(w / 2 - 14, 350, 9, 0, Math.PI * 2); c.arc(w / 2 + 16, 372, 6, 0, Math.PI * 2); c.fill();
  });
}

export function cityDay() {
  const r = rng(78);
  return canvasTex(1024, 512, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#5d8fd6'); sky.addColorStop(0.55, '#a9c6ea'); sky.addColorStop(1, '#e6d9c8');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) { const x = r() * w, y = 30 + r() * 120; const g = c.createRadialGradient(x, y, 0, x, y, 70 + r() * 60); g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x - 140, y - 70, 280, 140); }
    for (let layer = 0; layer < 3; layer++) {
      let x = -20;
      while (x < w) {
        const bw = 40 + r() * 90, bh = h * (0.25 + r() * 0.45) * (1 - layer * 0.18);
        const top = h - bh;
        c.fillStyle = ['#6f7c90', '#7f8ba0', '#95a1b5'][layer]; c.fillRect(x, top, bw, bh);
        c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x, top, bw * 0.18, bh);
        for (let wy = top + 8; wy < h - 6; wy += 11) for (let wx = x + 5; wx < x + bw - 6; wx += 9) { c.fillStyle = r() < 0.15 ? 'rgba(230,240,255,0.55)' : 'rgba(40,52,70,0.45)'; c.fillRect(wx, wy, 4, 6); }
        x += bw + 4 + r() * 10;
      }
    }
  });
}
