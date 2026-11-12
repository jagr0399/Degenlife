// Live wall screens: Chirp feed, firm PnL board, launchpad billboard, chart monitors. Canvas textures redrawn a few times a second.
import * as THREE from 'three';

const imgCache = {};
function img(src) {
  let im = imgCache[src];
  if (!im) { im = imgCache[src] = new Image(); im.src = src; }
  return im.complete && im.naturalWidth ? im : null;
}
const pfp = (i) => img('assets/pfp/p' + String(((i || 0) % 144) + 1).padStart(2, '0') + '.svg');
const coin = (tk) => (tk && tk.img != null ? img('assets/coins/c' + tk.img + '.jpg') : null);
function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function circleImg(ctx, im, x, y, r) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip(); if (im) ctx.drawImage(im, x - r, y - r, r * 2, r * 2); else { ctx.fillStyle = '#1a1e25'; ctx.fill(); } ctx.restore(); }

export function makeScreen(w, h, kind, opts = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const ctx = cv.getContext('2d');
  let last = 0;
  const DRAW = {
    chirp(game) {
      ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#4aa8ff'; ctx.font = '800 30px Inter, sans-serif'; ctx.fillText('Chirp', 20, 42);
      const s = game.sys.social; if (!s) return;
      const posts = s.posts.slice(-6).reverse(); let y = 70;
      for (const p of posts) {
        circleImg(ctx, pfp(p.pfp), 42, y + 22, 20);
        ctx.fillStyle = '#e8ecf3'; ctx.font = '700 17px Inter, sans-serif'; ctx.fillText(p.name, 72, y + 16);
        ctx.fillStyle = '#6b7380'; ctx.font = '14px Inter, sans-serif'; ctx.fillText(p.handle, 72 + ctx.measureText(p.name).width + 30, y + 16);
        ctx.fillStyle = '#c9ced6'; ctx.font = '16px Inter, sans-serif'; ctx.fillText(p.text.slice(0, Math.floor((w - 90) / 8.4)), 72, y + 40);
        y += 70; if (y > h - 40) break;
      }
    },
    heat(game) {
      ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f4b23e'; ctx.font = '800 28px Inter, sans-serif'; ctx.fillText('Narrative heat', 20, 40);
      const s = game.sys.social; if (!s) return;
      s.hottest().slice(0, 6).forEach((n, i) => { const y = 70 + i * 44, v = s.heat[n.id]; ctx.fillStyle = '#c9ced6'; ctx.font = '600 18px Inter, sans-serif'; ctx.fillText(n.label, 20, y + 18); ctx.fillStyle = '#161a21'; round(ctx, 150, y + 4, w - 240, 16, 8); ctx.fill(); ctx.fillStyle = v > 70 ? '#ff7a45' : v > 40 ? '#f4b23e' : '#5d6470'; round(ctx, 150, y + 4, (w - 240) * v / 100, 16, 8); ctx.fill(); ctx.fillStyle = '#9aa1ad'; ctx.fillText(Math.round(v), w - 70, y + 18); });
    },
    pnl(game) {
      ctx.fillStyle = '#06080a'; ctx.fillRect(0, 0, w, h);
      const fm = game.sys.firm; ctx.fillStyle = '#2bd67b'; ctx.font = '800 30px Inter, sans-serif'; ctx.fillText('FIRM PnL', 24, 44);
      if (!fm) return;
      const tot = fm.staff.reduce((a, t) => a + t.pnl, 0);
      ctx.fillStyle = tot >= 0 ? '#2bd67b' : '#ff4d5e'; ctx.font = '800 54px Inter, sans-serif'; ctx.fillText((tot >= 0 ? '+' : '') + tot.toFixed(2) + ' SOL', 24, 108);
      fm.staff.slice(0, 6).forEach((t, i) => { const y = 140 + i * 42; circleImg(ctx, pfp(t.pfp), 42, y + 14, 16); ctx.fillStyle = '#e8ecf3'; ctx.font = '600 18px Inter, sans-serif'; ctx.fillText(t.name, 70, y + 20); ctx.fillStyle = t.pnl >= 0 ? '#2bd67b' : '#ff4d5e'; ctx.textAlign = 'right'; ctx.fillText((t.pnl >= 0 ? '+' : '') + t.pnl.toFixed(2), w - 24, y + 20); ctx.textAlign = 'left'; });
      if (!fm.staff.length) { ctx.fillStyle = '#6b7380'; ctx.font = '18px Inter, sans-serif'; ctx.fillText('Hire traders in the Firm tab', 24, 160); }
    },
    billboard(game) {
      const pad = game.sys.pad, sim = game.sim;
      let tk = pad && pad.featured && sim.byId.get(pad.featured);
      if (!tk || tk.dead) tk = sim.tokens.filter((t) => !t.dead).sort((a, b) => sim.vol5m(b) - sim.vol5m(a))[0];
      ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(244,178,62,.25)'); g.addColorStop(1, 'rgba(167,123,255,.2)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (!tk) return;
      const im = coin(tk); if (im) ctx.drawImage(im, 30, 30, h - 60, h - 60);
      ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(h * 0.18) + 'px Inter, sans-serif'; ctx.fillText('$' + tk.ticker, h, h * 0.36);
      ctx.font = '700 ' + Math.round(h * 0.1) + 'px Inter, sans-serif'; ctx.fillStyle = '#f4b23e'; ctx.fillText(window.BH.fmt.usd(sim.mc(tk)) + ' MC', h, h * 0.58);
      ctx.fillStyle = '#c9ced6'; ctx.font = '600 ' + Math.round(h * 0.07) + 'px Inter, sans-serif'; ctx.fillText(pad && pad.owned && pad.featured === tk.id ? 'FEATURED ON ' + pad.name.toUpperCase() : 'TRENDING NOW', h, h * 0.78);
    },
    chart(game) {
      ctx.fillStyle = '#0a0b0d'; ctx.fillRect(0, 0, w, h);
      const sim = game.sim, list = sim.tokens.filter((t) => !t.dead);
      const tk = list[(opts.index || 0) % Math.max(1, list.length)];
      if (!tk) return;
      ctx.fillStyle = '#e9ebee'; ctx.font = '700 22px Inter, sans-serif'; ctx.fillText('$' + tk.ticker, 14, 30);
      ctx.fillStyle = '#9aa1ad'; ctx.font = '600 16px Inter, sans-serif'; ctx.fillText(window.BH.fmt.usd(sim.mc(tk)), 14, 54);
      const bars = window.BH.ChartModel.aggregate(tk.candles, 5, sim.t).slice(-48); if (!bars.length) return;
      let lo = Infinity, hi = -Infinity; for (const b of bars) { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); } if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
      const bw = (w - 20) / 48, y = (v) => h - 12 - (v - lo) / (hi - lo) * (h - 80);
      bars.forEach((b, i) => { const x = 10 + i * bw + bw / 2, up = b.c >= b.o; ctx.strokeStyle = ctx.fillStyle = up ? '#34d8a0' : '#ff5f78'; ctx.beginPath(); ctx.moveTo(x, y(b.h)); ctx.lineTo(x, y(b.l)); ctx.stroke(); ctx.fillRect(x - bw * 0.35, Math.min(y(b.o), y(b.c)), bw * 0.7, Math.max(1.5, Math.abs(y(b.c) - y(b.o)))); });
    },
    servers(game) {
      ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, w, h);
      const pad = game.sys.pad; ctx.fillStyle = '#4aa8ff'; ctx.font = '800 26px Inter, sans-serif'; ctx.fillText('SERVER LOAD', 20, 38);
      if (!pad || !pad.owned) { ctx.fillStyle = '#6b7380'; ctx.font = '18px Inter, sans-serif'; ctx.fillText('No launchpad yet', 20, 80); return; }
      const cap = pad.capacity(), live = pad.live().length, load = cap ? live / cap : 1;
      ctx.fillStyle = '#161a21'; round(ctx, 20, 60, w - 40, 26, 13); ctx.fill(); ctx.fillStyle = load > 0.85 ? '#ff4d5e' : '#2bd67b'; round(ctx, 20, 60, (w - 40) * Math.min(1, load), 26, 13); ctx.fill();
      ctx.fillStyle = '#e8ecf3'; ctx.font = '700 20px Inter, sans-serif'; ctx.fillText(live + ' / ' + cap + ' coins · trust ' + Math.round(pad.trust) + ' · share ' + Math.round(pad.share * 100) + '%', 20, 120);
      ctx.fillStyle = '#9aa1ad'; ctx.font = '16px Inter, sans-serif'; ctx.fillText('Fees earned: ' + pad.earned.toFixed(2) + ' SOL', 20, 150);
      if (game.sim.t < pad.outageUntil) { ctx.fillStyle = '#ff4d5e'; ctx.font = '900 34px Inter, sans-serif'; ctx.fillText('OUTAGE', 20, 200); }
    },
  };
  return {
    texture: tex,
    update(game, now) { if (!game || !game.sim || now - last < (opts.every || 400)) return; last = now; try { DRAW[kind](game); } catch (e) { /* keep going */ } tex.needsUpdate = true; },
  };
}
