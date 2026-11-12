// Live in-world monitor textures: the laptop shows a mini Pulse + chart of your biggest bag (or the hottest coin).
// Redrawn a few times a second, not every frame.
import * as THREE from 'three';

export function createLaptopScreen() {
  const cv = document.createElement('canvas');
  cv.width = 640; cv.height = 400;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const ctx = cv.getContext('2d');
  let last = 0;

  function pickCoin(game) {
    const p = game.player, sim = game.sim;
    let best = null, bestV = -1;
    for (const pos of p.pos.values()) { const tk = sim.byId.get(pos.id); if (tk && !tk.dead) { const v = p.markValue(pos); if (v > bestV) { bestV = v; best = tk; } } }
    if (best) return { tk: best, mine: true };
    let hot = null, hv = -1;
    for (const tk of sim.tokens) { if (tk.dead) continue; const v = sim.vol5m(tk); if (v > hv) { hv = v; hot = tk; } }
    return hot ? { tk: hot, mine: false } : null;
  }

  function draw(game) {
    const W = cv.width, H = cv.height, F = window.BH.fmt, C = window.BH.C;
    ctx.fillStyle = '#0a0b0d'; ctx.fillRect(0, 0, W, H);
    // top bar
    ctx.fillStyle = '#121418'; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = '#f4b23e'; ctx.font = '800 20px Inter, sans-serif'; ctx.fillText('Bagholder', 16, 27);
    ctx.fillStyle = '#a4aab4'; ctx.font = '600 15px Inter, sans-serif';
    const nw = game.player.netWorth();
    ctx.textAlign = 'right'; ctx.fillText(nw.toFixed(2) + ' SOL', W - 16, 26); ctx.textAlign = 'left';
    const pick = pickCoin(game);
    if (!pick) return;
    const tk = pick.tk, sim = game.sim;
    ctx.fillStyle = '#e9ebee'; ctx.font = '700 22px Inter, sans-serif';
    ctx.fillText('$' + tk.ticker, 16, 74);
    ctx.fillStyle = '#6c727d'; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(pick.mine ? 'YOUR BIGGEST BAG' : 'HOTTEST COIN', 16, 94);
    const ch = sim.change(tk, 60);
    ctx.textAlign = 'right'; ctx.font = '700 22px Inter, sans-serif'; ctx.fillStyle = '#e9ebee';
    ctx.fillText(F.usd(sim.mc(tk)), W - 16, 74);
    ctx.font = '700 15px Inter, sans-serif'; ctx.fillStyle = ch >= 0 ? '#34d8a0' : '#ff5f78';
    ctx.fillText((ch >= 0 ? '+' : '') + ch.toFixed(1) + '%', W - 16, 94); ctx.textAlign = 'left';
    // mini candles (5s)
    const bars = window.BH.ChartModel.aggregate(tk.candles, 5, sim.t).slice(-60);
    if (bars.length) {
      let lo = Infinity, hi = -Infinity;
      for (const b of bars) { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); }
      if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
      const top = 110, bot = H - 20, x0 = 16, bw = (W - 32) / 60;
      const y = (v) => bot - (v - lo) / (hi - lo) * (bot - top);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) { const yy = top + i * (bot - top) / 3; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(W - 16, yy); ctx.stroke(); }
      bars.forEach((b, i) => {
        const up = b.c >= b.o, x = x0 + i * bw + bw / 2;
        ctx.strokeStyle = ctx.fillStyle = up ? '#34d8a0' : '#ff5f78';
        ctx.beginPath(); ctx.moveTo(x, y(b.h)); ctx.lineTo(x, y(b.l)); ctx.stroke();
        const yo = y(b.o), yc = y(b.c);
        ctx.fillRect(x - bw * 0.35, Math.min(yo, yc), bw * 0.7, Math.max(1.5, Math.abs(yc - yo)));
      });
    }
    void C;
  }

  return {
    texture: tex,
    update(game, now) {
      if (!game || !game.sim || now - last < 330) return;
      last = now;
      draw(game);
      tex.needsUpdate = true;
    },
  };
}
