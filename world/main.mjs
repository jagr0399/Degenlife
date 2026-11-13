// Degen Life: boots the world, the game, the HUD, phone, audio and terminal; handles places, travel, actions and the frame loop.
import * as THREE from 'three';
import { createRenderer } from './renderer.mjs';
import { buildBedroom } from './rooms/bedroom.mjs';
import { buildApartment, buildOffice, buildTower, buildStreet, addOwned } from './rooms/places.mjs';
import * as Dec from './decor.mjs';
import { createController } from './controller.mjs';
import { createInteractor } from './interact.mjs';
import { createLaptopScreen } from './screens.mjs';

const BH = window.BH, C = BH.C, HUD = BH.HUD, Sound = BH.Sound;
const params = new URLSearchParams(location.hash.slice(1));
// frenzy=1: every coin is in a frenzy (screenshots of the wild charts)
if (params.get('frenzy') && window.BH && BH.Director) BH.Director.FORCE_FRENZY = true;
const SCENE = params.get('scene');   // test / screenshot scenes (see README)
const log = (m) => { try { window.degen ? window.degen.log(m) : console.log(m); } catch (e) { /* ignore */ } };
window.addEventListener('error', (e) => log('page error: ' + e.message + ' @' + (e.filename || '') + ':' + (e.lineno || '')));

// ---- settings ----
const SETTINGS_KEY = 'degen.settings';
const settings = Object.assign({ quality: 'high', fov: 72, sens: 1, bob: '1', volMusic: 0.45, volSfx: 0.7, volAmb: 0.5, radio: '1', catTrades: '1', slot: 1 }, (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; } })());
if (params.get('q')) settings.quality = params.get('q');
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } };

// ---- world ----
const canvas = document.getElementById('view');
const R = createRenderer(canvas, settings.quality);
R.camera.fov = settings.fov; R.camera.updateProjectionMatrix();
const laptop = createLaptopScreen();
HUD.init(document.getElementById('hud'));
HUD.extraInit();
const colliders = [];                         // shared with the controller; refilled on travel
const controller = createController(R.camera, canvas, colliders, { settings, onLockChange: (on) => onLock(on) });
let room = null, interactor = null;

// ---- game ----
const game = BH.createGame();
BH.Game = game;
let mode = 'menu';           // menu | walk | paused | transition | seated | sleeping | phone | card
let lastSave = performance.now(), rotateOk = true, slot = +settings.slot || 1;
if (window.degen && window.degen.onFlush) window.degen.onFlush(async () => { if (game.sim && mode !== 'menu') await save(true, true); window.degen.quit(); });

function buildPlace(place) {
  if (room) { R.scene.remove(room.group); room.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  R.scene.background = new THREE.Color(0x05060a);
  if (place === 'apartment') room = buildApartment(R.scene, game, laptop.texture);
  else if (place === 'office') room = buildOffice(R.scene, game, laptop.texture);
  else if (place === 'tower') room = buildTower(R.scene, game, laptop.texture);
  else if (place === 'street') room = buildStreet(R.scene, game);
  else {
    room = buildBedroom(R.scene, { screenTex: laptop.texture });
    const map = { laptop: 'sit', bed: 'sleep', fridge: 'eat', lamp: 'lamp', window: 'window', door: 'door' };
    for (const it of room.interactables) { it.action = map[it.id]; if (it.id === 'door') it.prompt = 'Leave (map)'; if (it.id === 'laptop') it.seat = room.seat; }
    addOwned(room, game, { boxes: new THREE.Vector3(1.55, 0, 1.55), plants: [new THREE.Vector3(-1.85, 0, 0.6), new THREE.Vector3(0.66, 0, -1.6)], rgb: [[new THREE.Vector3(1.25, 0.47, -1.73), 0.6]], coffee: [new THREE.Vector3(1.8, 0.85, 0.35), -Math.PI / 2], radio: new THREE.Vector3(-0.3, 0.96, -1.72), cat: new THREE.Vector3(0.3, 0, 0.4), stand: [new THREE.Vector3(-0.6, 0, 1.56), Math.PI], shelf: [new THREE.Vector3(-1.96, 0, 1.3), Math.PI / 2], clock: [new THREE.Vector3(-0.75, 0.96, -1.72), 0.25], megaphone: [new THREE.Vector3(0.55, 0, 1.6), Math.PI + 0.5] });
    { const g = room.group, an = room.anims || (room.anims = []); Dec.curtains(g, [[-0.9, 0.3]], -1.8, { top: 2.2, color: 0x3c4a63 }); Dec.ceilingLight(g, 0.1, 0.3, 2.6, { intensity: 0.5 }); Dec.wallClock(g, an, game, -0.6, 1.72, 1.78, Math.PI); Dec.frames(g, [[-1.5, 1.5, -1.78, 0, 0.5, 0.65, 3], [0.45, 1.55, 1.78, Math.PI, 0.45, 0.6, 0]]); }
  }
  colliders.length = 0; colliders.push(...room.colliders);
  interactor = createInteractor(R.camera, room.interactables, HUD);
  room.setTime(game.clock ? game.clock.hour : 9, R.scene);
  R.setQuality(settings.quality);   // re-apply shadow sizes to the new lights
  game.meta.place = place;
  Sound.rain(rainy() && !room.outdoor ? true : rainy());
}
function rainy() { return game.clock && ((game.clock.day * 7919) % 5 === 0) && game.clock.isNight(); }
function travel(place) {
  if (mode === 'phone') BH.Phone.toggle(false);
  HUD.fade(true); mode = 'transition'; Sound.play('door');
  setTimeout(() => {
    buildPlace(place);
    controller.place(room.spawn.pos.x, room.spawn.pos.z, room.spawn.yaw);
    game.clock.advanceHours(0.25);   // travel takes 15 minutes
    HUD.fade(false); enterWalk(); controller.lock();
    HUD.toast('info', 'Arrived: ' + BH.Build.PLACES[place].name);
  }, 600);
}

// ---- toasts, sounds, events ----
game.on('toast', (t) => {
  if (mode === 'seated' && BH.UI && BH.UI.toast) BH.UI.toast(t.kind === 'bad' || t.kind === 'error' ? 'fail' : t.kind, t.text, { id: t.id });
  else HUD.toast(t.kind, t.text);
  Sound.forToast(t.kind);
});
game.on('exitScreen', () => standUp());
game.on('walletTrade', (ev) => {
  const w = game.sys.tracker.get(ev.addr); Sound.play(w ? w.sound : 'coin', { gain: 0.9 });
  if (mode === 'seated' && BH.UI && BH.UI.walletToast) BH.UI.walletToast(ev); else HUD.walletToast(ev);
});
game.on('menu', () => { if (mode === 'seated') standUp(); });
game.on('day', (d) => game.emit('toast', { kind: 'info', text: 'Day ' + d + ' begins' }));
// today's market mood: a banner across the top (and a toast in the terminal)
const marketBanner = (info) => { if (!info || SCENE) return; HUD.banner(info.ic, 'Day ' + (info.day || game.clock.day) + ': ' + info.label, info.text, info.id === 'bear' || info.id === 'rugs' ? 'bad' : info.id === 'bull' || info.id === 'runners' ? 'good' : ''); if (BH.UI && BH.UI.toast && mode === 'seated') BH.UI.toast('info', info.label + ': ' + info.text); };
game.on('marketday', marketBanner);
game.on('news', (text) => { if (mode !== 'seated') HUD.toast('info', 'DNN: ' + text); });
game.on('tutorial', (e) => HUD.tutorialToast(e.done, e.next));
game.on('evicted', () => { if (game.meta.place === 'apartment') setTimeout(() => travel('bedroom'), 1200); });

// ---- saving ----
// In a plain browser (the web demo) saves go to IndexedDB: a save is ~10 MB, more than localStorage holds (~5 MB).
// Older browser saves in localStorage are still read.
const webSave = (() => {
  let db = null;
  const open = () => db || (db = new Promise((ok, no) => { const q = indexedDB.open('degen-life', 1); q.onupgradeneeded = () => q.result.createObjectStore('saves'); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); }));
  const tx = (mode, fn) => open().then((d) => new Promise((ok, no) => { const t = d.transaction('saves', mode), r = fn(t.objectStore('saves')); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); }));
  return {
    get: async (k) => { try { const v = await tx('readonly', (st) => st.get(k)); if (v != null) return v; } catch (e) { /* fall back */ } try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: async (k, v) => { await tx('readwrite', (st) => st.put(v, k)); try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    has: async (k) => !!(await webSave.get(k)),
  };
})();
async function readSave(n) {
  if (window.degen) { try { return await window.degen.load(n || slot); } catch (e) { return { json: null }; } }
  try { const j = await webSave.get('degen.save.' + (n || slot)); return { json: j, from: j ? 'main' : null }; } catch (e) { return { json: null }; }
}
let saving = null;
async function save(quiet, force) {
  if (!game.sim || SCENE) return;   // test / screenshot scenes never touch the real save
  if (saving) return saving;
  if (!force && quiet && performance.now() - lastSave < 20000) return;
  saving = doSave(quiet).finally(() => { saving = null; });
  return saving;
}
async function doSave(quiet) {
  const s = controller.state;
  game.world = { x: s.x, z: s.z, yaw: s.yaw };
  const json = JSON.stringify(game.serialize());
  const meta = { day: game.clock.day, place: BH.Build.PLACES[game.meta.place].name, net: Math.round(game.sys.world.netUsd()), savedAt: Date.now(), prestige: game.meta.prestige || 0 };
  let ok = true;
  if (window.degen) { const r = await window.degen.save(json, { rotate: rotateOk, slot, meta }); ok = r && r.ok; if (ok) rotateOk = true; }
  else { try { await webSave.set('degen.save.' + slot, json); } catch (e) { ok = false; } }
  lastSave = performance.now();
  if (!quiet || !ok) HUD.toast(ok ? 'save' : 'error', ok ? 'Game saved' : 'Could not save the game');
}
function startGame(saveText, backupText, opts) {
  let how;
  const tryStart = (txt) => { try { return game.start(txt ? JSON.parse(txt) : null); } catch (e) { log('load failed: ' + e.message); return null; } };
  if (opts && opts.meta) { game.newGame(undefined, { meta: opts.meta }); BH.Prestige.apply(game); how = 'new'; }
  else how = tryStart(saveText);
  if (!how && saveText) {
    rotateOk = false;
    how = backupText ? tryStart(backupText) : null;
    if (how) HUD.toast('bad', 'Your last save was damaged, so the backup copy was loaded.');
    else { game.start(null); how = 'new'; HUD.toast('error', 'Your save could not be read, so a new life started. The old files were kept.'); }
  }
  game.sys.world.catTrades = settings.catTrades !== '0';
  buildPlace(game.meta.place || 'bedroom');
  if (game.world && how === 'loaded') controller.place(game.world.x, game.world.z, game.world.yaw);
  else controller.place(room.spawn.pos.x, room.spawn.pos.z, room.spawn.yaw);
  if (game.sys.days) setTimeout(() => marketBanner(Object.assign({ day: game.clock.day }, game.sys.days.info())), 2500);   // what kind of day it is, every time you start or load
  return how;
}

// ---- modes ----
function enterWalk() {
  mode = 'walk';
  HUD.closeCard(); HUD.showWorld(true);
  // the "click to look around" hint only if the mouse really wasn't captured (closing the phone used to flash it every time)
  HUD.hint(false); clearTimeout(enterWalk.t); enterWalk.t = setTimeout(() => { if (mode === 'walk' && !document.pointerLockElement) HUD.hint(true); }, 900);
  controller.state.enabled = true;
}
let justSat = false;
function onLock(on) {
  HUD.hint(!on && mode === 'walk');
  if (on) { game.flags.looked = true; Sound.resume(); }
  if (!on && mode === 'walk' && !justSat) openPause();   // Esc while walking = the pause menu (T goes to Pulse)
}
// T while walking = straight to Pulse at the nearest computer (or the pause menu where there is none)
function quickPulse() {
  if (mode !== 'walk') return;
  if (room && room.seat) sit(room.seat, 'pulse'); else openPause();
}
// the browser refuses to grab the mouse again for about a second after Esc; retry once instead of ignoring the click
let lockRetry = 0;
document.addEventListener('pointerlockerror', () => { if (mode === 'walk' && performance.now() - lockRetry > 1500) { lockRetry = performance.now(); setTimeout(() => { if (mode === 'walk' && !document.pointerLockElement) controller.lock(); }, 1100); } });
// a click anywhere outside the HUD's buttons takes the mouse back (not only on the 3D canvas)
document.addEventListener('mousedown', (e) => { if (mode !== 'walk' || document.pointerLockElement) return; if (e.target.closest && e.target.closest('button, input, select, textarea, a, .card, .menu, .phone')) return; Sound.resume(); controller.lock(); });
window.addEventListener('blur', () => { if (mode === 'walk') openPause(); });

let pausedAt = 0;
function openPause() {
  mode = 'paused'; pausedAt = performance.now();
  save(true);
  if (interactor) interactor.clear();
  Sound.walking(false);
  HUD.pauseMenu(async (a) => {
    Sound.play('click', { gain: 0.5 });
    if (a === 'resume') { game.resume(); enterWalk(); controller.lock(); }
    if (a === 'save') save(false, true);
    if (a === 'settings') openSettings(openPause);
    if (a === 'quit') { await save(true, true); if (window.degen) window.degen.quit(); else HUD.toast('info', 'Saved. You can close this tab.'); }
  });
  // retiring becomes possible at $1M
  if (game.sys.world.canRetire()) {
    const card = document.querySelector('#hCard .menu-btns');
    const b = document.createElement('button'); b.className = 'btn'; b.innerHTML = HUD.icon('crown', 'sm') + 'Retire (ending)'; card.insertBefore(b, card.lastChild);
    b.onclick = () => retire();
  }
}
function openSettings(back) {
  HUD.settings(settings, (k, v) => {
    if (k === 'tutorial') { if (game.sys && game.sys.tutorial) { if (v === 'restart') { game.sys.tutorial.step = 0; game.sys.tutorial.on = true; } if (v === 'off') game.sys.tutorial.skip(); } return; }
    settings[k] = v; saveSettings();
    if (k === 'quality') R.setQuality(v);
    if (k === 'fov') { R.camera.fov = v; R.camera.updateProjectionMatrix(); }
    if (k === 'volMusic') Sound.setVol('music', v); if (k === 'volSfx') Sound.setVol('sfx', v); if (k === 'volAmb') Sound.setVol('amb', v);
    if (k === 'radio') Sound.setRadio(v !== '0');
    if (k === 'catTrades' && game.sys) game.sys.world.catTrades = v !== '0';
    if (k === 'realCoins' && BH.RealCoins) BH.RealCoins.on = v !== '0';
  }, back);
}
async function mainMenu() {
  mode = 'menu';
  HUD.showWorld(false);
  const s = await readSave(slot);
  HUD.mainMenu(!!s.json, async (a) => {
    Sound.resume(); Sound.play('click', { gain: 0.5 });
    if (a === 'continue') { startGame(s.json, s.backup); if (s.from === 'backup') { rotateOk = false; HUD.toast('bad', 'Your last save was damaged, so the backup copy was loaded.'); } enterWalk(); controller.lock(); }
    if (a === 'new') pickSlot(async (n) => { slot = n; settings.slot = n; saveSettings(); startGame(null); enterWalk(); controller.lock(); await save(true, true); HUD.toast('info', 'Rent is $' + C.RENT_BEDROOM + ', due on day ' + game.bills.rentDueDay + '. Good luck.'); });
    if (a === 'settings') openSettings(mainMenu);
    if (a === 'quit') { if (window.degen) window.degen.quit(); }
  });
  // a "Load slot" button under Continue
  const btns = document.querySelector('#hCard .menu-btns');
  const lb = document.createElement('button'); lb.className = 'btn'; lb.innerHTML = HUD.icon('folder-open', 'sm') + 'Load slot (now: ' + slot + ')';
  btns.insertBefore(lb, btns.children[1] || null);
  lb.onclick = () => pickSlot(async (n) => { slot = n; settings.slot = n; saveSettings(); mainMenu(); }, true);
}
async function pickSlot(then, loadOnly) {
  const list = window.degen && window.degen.slots ? await window.degen.slots() : await Promise.all([1, 2, 3].map(async (n) => ({ slot: n, has: await webSave.has('degen.save.' + n), meta: null })));
  HUD.slotsMenu(list.map((x) => ({ slot: x.slot, info: x.has ? (x.meta ? 'Day ' + x.meta.day + ' · ' + x.meta.place + ' · $' + (x.meta.net || 0).toLocaleString() + (x.meta.prestige ? ' · ★' + x.meta.prestige : '') : 'Saved game') + (loadOnly ? '' : ' (will be replaced)') : '' })), then, mainMenu);
}
async function retire() {
  HUD.retireCard(game, async (a) => {
    if (a === 'stay') return openPause();
    const out = BH.Prestige.retire(game);
    HUD.message('Ending: ' + out.end.title, out.end.text + ' A new life starts now, with the perk you earned.', async () => { startGame(null, null, { meta: out.meta }); enterWalk(); controller.lock(); await save(true, true); });
  });
}

// ---- the computer / terminal ----
let frame = null, terminalReady = false, pendingView = null, sceneCoin = null;   // sceneCoin: screenshot scenes (legend=, fate=, vamp=) open this coin
function applyView() {
  if (!BH.UI) return;
  const v = pendingView; pendingView = null;
  const A = BH.AppsUI;
  if (!v || v === 'desktop') { if (A) A.showDesktop(); }
  else if (v === 'token') { if (A) A.openApp('terminal'); const pick = sceneCoin && game.sim.byId.get(sceneCoin); const tk = (pick && !pick.dead && pick) || game.sim.tokens.filter((t) => !t.dead).sort((a, b) => game.sim.vol5m(b) - game.sim.vol5m(a))[0]; if (tk) BH.UI.openToken(tk.id); }
  else if (A && A.APP_OF_VIEW[v]) A.openApp(A.APP_OF_VIEW[v], v);
  else if (A) A.openApp('terminal', v); else BH.UI.go(v);
  BH.UI.render(true);
  if (params.get('demo') && BH.UI.chart) chartDemo(BH.UI.chart);
  // zoom=N: zoom the chart in N times (screenshots that look like Axiom's default 1s view)
  if (params.get('zoom') && BH.UI.chart) { const ch = BH.UI.chart; setTimeout(() => { ch.m.zoomAt(ch.lay ? ch.lay.plotW : 800, +params.get('zoom')); ch.draw(); }, 600); }
}
function chartDemo(ch) {
  const bars = ch.bars, n = bars.length; if (n < 10) return;
  ch.toggleIndicator('rsi', true); ch.toggleIndicator('vwap', true);
  const hi = Math.max(...bars.map((b) => b.h)), lo = Math.min(...bars.map((b) => b.l)), t0 = bars[0].t, iv = ch.L.iv;
  const pt = (i, p) => ({ i, p, t: t0 + i * iv });
  ch.drawings.add(ch.tk.id, 'hline', [pt(n - 5, lo + (hi - lo) * 0.2)]);
  ch.drawings.add(ch.tk.id, 'fib', [pt(Math.max(0, n - 20), hi), pt(n - 4, lo)]);
  ch.drawings.add(ch.tk.id, 'text', [pt(Math.max(0, n - 28), hi * 0.95)], { text: 'ape zone' });
  ch.m.zoomAt(ch.lay ? ch.lay.plotW : 800, 1.4);
  ch.draw();
}
window.addEventListener('message', (e) => { if (e.data && e.data.type === 'terminal-ready') { terminalReady = true; applyView(); } });
function showTerminal(view) {
  if (!frame) { frame = document.createElement('iframe'); frame.id = 'screen'; frame.src = 'apps/terminal.html'; document.body.appendChild(frame); }
  pendingView = view || 'desktop';
  frame.classList.add('show');
  requestAnimationFrame(() => frame.classList.add('in'));
  if (terminalReady) applyView();
  setTimeout(() => { try { frame.contentWindow.focus(); } catch (e) { /* ignore */ } }, 50);
}
function hideTerminal() { if (frame) frame.classList.remove('in', 'show'); window.focus(); }

const tween = { t: 0, dur: 0, from: null, to: null, done: null };
function moveCamera(toPos, toLook, dur, done) {
  const q0 = R.camera.quaternion.clone(), p0 = R.camera.position.clone();
  const m = new THREE.Matrix4().lookAt(toPos, toLook, new THREE.Vector3(0, 1, 0));
  Object.assign(tween, { t: 0, dur, from: { p: p0, q: q0 }, to: { p: toPos.clone(), q: new THREE.Quaternion().setFromRotationMatrix(m) }, done });
}
let lastTok = null;
function sit(seat, view) {
  seat = seat || room.seat;
  if (!view && seat && !seat.view && lastTok) { const tk = game.sim.byId.get(lastTok); if (tk && !tk.dead) { sceneCoin = lastTok; view = 'token'; } }
  if (!seat) { HUD.toast('info', 'There is no computer here.'); enterWalk(); return; }
  mode = 'transition'; justSat = true;
  if (interactor) interactor.clear(); HUD.hint(false);
  controller.state.enabled = false; controller.unlock(); Sound.walking(false); Sound.play('sit', { gain: 0.6 });
  setTimeout(() => { justSat = false; }, 300);
  game.flags.sat = true;
  moveCamera(seat.pos, seat.look, 0.6, () => { mode = 'seated'; game.seated = true; HUD.showWorld(false); Sound.duck(true); showTerminal(view || seat.view); });
}
function standUp() {
  if (mode !== 'seated') return;
  lastTok = BH.UI && BH.UI.app === 'terminal' && BH.UI.view === 'token' ? BH.UI.tokenId : null;
  hideTerminal(); HUD.showWorld(true); Sound.duck(false);
  game.seated = false; mode = 'transition';
  const s = controller.state;
  const stand = new THREE.Vector3(s.x, s.eye, s.z);
  const look = stand.clone().add(new THREE.Vector3(-Math.sin(s.yaw), -0.05, -Math.cos(s.yaw)));
  moveCamera(stand, look, 0.45, () => { controller.place(s.x, s.z, s.yaw); enterWalk(); controller.lock(); if (performance.now() - lastSave > 300000) save(true); });
}

// ---- using things ----
function sleep() {
  mode = 'sleeping'; if (interactor) interactor.clear(); controller.unlock(); Sound.walking(false); HUD.fade(true);
  const h0 = game.clock.total, H = C.SLEEP_HOURS, tSleep = performance.now();
  const hhmm = (t) => { const h = ((t % 24) + 24) % 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
  setTimeout(async () => {
    // the night runs in slices between frames (no frozen black screen); the panel shows the clock moving
    HUD.sleepProgress(0, hhmm(h0), hhmm(h0 + H));
    const summary = await BH.Actions.sleepAsync(game, H, (f) => HUD.sleepProgress(f, hhmm(h0 + f * H), hhmm(h0 + H)));
    HUD.sleepProgress(null);
    log('sleep: ' + H + ' game hours took ' + Math.round(performance.now() - tSleep) + ' ms');
    game.flags.slept = true;
    save(true, true);
    HUD.fade(false);
    HUD.sleepSummary(summary, () => { enterWalk(); controller.lock(); maybeVisitor(); });
  }, 450);
}
function card(fn) { if (SCENE === 'look') return; mode = 'card'; controller.unlock(); Sound.walking(false); fn(); }
function maybeStory() {
  const st = game.sys.story; if (!st || mode !== 'walk') return false;
  if (st.pendingAct) { const a = BH.Story.ACTS[st.pendingAct - 1]; st.pendingAct = null; Sound.play('confirm', { gain: 0.7 }); card(() => HUD.actCard(a, () => { enterWalk(); controller.lock(); })); return true; }
  const sc = st.next(); if (!sc) return false;
  Sound.play(sc.who === 'pruitt' ? 'door' : 'info');
  card(() => HUD.storyCard(sc, (i) => { const text = st.choose(sc.id, i); HUD.message(BH.Story.CAST[sc.who].name, text, () => { enterWalk(); controller.lock(); }); }));
  return true;
}
game.on('storyAct', (a) => { const st = game.sys.story; if (st) st.pendingAct = a.n; });
function maybeVisitor() {
  if (maybeStory()) return;
  const w = game.sys.world; if (!w.visitors.length || mode !== 'walk') return;
  const v = BH.World.VISITORS.find((x) => x.id === w.visitors[0]); if (!v) { w.visitors.shift(); return; }
  Sound.play('door');
  card(() => HUD.visitorCard(v, (act) => { const text = w.resolve(v.id, act); HUD.message(v.who, text, () => { enterWalk(); controller.lock(); }); }));
}
const ACTIONS = {
  sit: (it) => sit(it.seat, it.seat && it.seat.view),
  sleep: () => { if (game.life.energy > 85) return HUD.toast('info', "You're not tired yet."); sleep(); },
  eat: () => { const r = BH.Actions.eat(game); if (r.ok) { game.flags.ate = true; Sound.play('confirm', { gain: 0.5 }); } HUD.toast(r.ok ? 'info' : 'fail', r.text); },
  lamp: () => { const L = room.lamp; const on = !L.light.visible; L.light.visible = L.fill.visible = on; L.bulb.material.emissiveIntensity = on ? 6 : 0; Sound.play('click', { gain: 0.6 }); },
  window: () => { const r = BH.Actions.lookOutside(game); HUD.toast(r.ok ? 'info' : 'fail', r.text); },
  door: () => { BH.Phone.tab = 'map'; openPhone(); },
  home: () => { BH.Phone.tab = 'map'; openPhone(); },
  box: () => { const it = game.sys.build.unbox(); if (it) { game.flags.unboxed = true; Sound.play('delivery'); HUD.toast('info', 'Unboxed: ' + it.name + '. ' + it.desc); buildPlace(game.meta.place); } },
  coffee: () => { const r = game.sys.build.useCoffee(); if (r.ok) Sound.play('glass', { gain: 0.6 }); HUD.toast(r.ok ? 'info' : 'fail', r.text); },
  radio: () => {   // the radio in the room flips through the stations, then off
    const st = Sound.stations(), at = st.indexOf(Sound.station);
    if (!Sound.radioOn) { Sound.setStation(st[0]); settings.radio = '1'; } else if (at >= st.length - 1) { Sound.setRadio(false); settings.radio = '0'; } else Sound.setStation(st[at + 1]);
    saveSettings(); HUD.toast('info', 'Radio: ' + (Sound.radioOn ? Sound.station + ' · ' + Sound.nowPlaying() : 'Off'));
  },
  cat: () => { game.life.bump('sanity', 2); HUD.toast('info', 'The cat purrs. Sanity +2.'); },
  rug: () => { sit({ pos: room.seat.pos, look: room.seat.look }, 'dev'); },
  staff: (it) => { const t = game.sys.firm.staff.find((x) => x.id === it.staff); if (t) HUD.toast('info', t.name + ': "' + (t.mood < 25 ? 'I need a break, boss.' : t.pnl >= 0 ? 'We are so back.' : 'It is just a dip.') + '" Mood ' + Math.round(t.mood)); },
  park: () => { const r = game.sys.world.visitPark(); HUD.toast(r.ok ? 'info' : 'fail', r.text); },
  gym: () => { const r = game.sys.world.gym(); HUD.toast(r.ok ? 'info' : 'fail', r.text); },
  cafe: () => { const r = game.sys.world.coffeeShop(); if (r.ok) Sound.play('purchase', { gain: 0.6 }); HUD.toast(r.ok ? 'info' : 'fail', r.text); },
  kiosk: () => { BH.Phone.tab = 'news'; openPhone(); },
};
function use(it) { if (!it) return; const fn = ACTIONS[it.action || it.id]; if (fn) fn(it); }
const promptFor = (it) => it.action === 'eat' ? 'Eat (' + game.bills.meals + ' left)' : it.action === 'sleep' ? 'Sleep ' + C.SLEEP_HOURS + ' hours' : it.action === 'lamp' && room.lamp ? (room.lamp.light.visible ? 'Turn lamp off' : 'Turn lamp on') : it.action === 'box' ? 'Open box (' + game.sys.build.boxes.length + ')' : it.prompt;

// ---- phone ----
function openPhone() { mode = 'phone'; controller.unlock(); controller.state.enabled = false; Sound.walking(false); if (interactor) interactor.clear(); BH.Phone.toggle(true); }
function closePhone() { BH.Phone.toggle(false); enterWalk(); controller.lock(); }
// opening a coin from the phone: close the phone WITHOUT grabbing the mouse (that raced with sitting down and froze input),
// sit at this room's computer, then open the coin once the terminal is really up. Rooms without a computer just say so.
BH.Phone.init((place) => travel(place), (coinId) => {
  BH.Phone.toggle(false);
  if (!room || !room.seat) { enterWalk(); HUD.toast('info', 'There is no computer here. Go home or to the office (Map) to trade it.'); return; }
  sit(room.seat, 'pulse');
  let tries = 0;
  const open = () => {
    if (mode === 'seated' && BH.UI && BH.UI.openToken) { if (game.sim.byId.get(coinId)) { if (BH.AppsUI) BH.AppsUI.openApp('terminal'); BH.UI.openToken(coinId); } }
    else if (tries++ < 30) setTimeout(open, 150);
  };
  setTimeout(open, 250);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') { e.preventDefault(); if (mode === 'walk') openPhone(); else if (mode === 'phone') closePhone(); return; }
  if (mode === 'walk' && e.code === 'KeyE') use(interactor && interactor.current);
  if (e.code === 'Escape' && mode === 'phone') { closePhone(); return; }
  if (e.code === 'Escape' && mode === 'walk' && !document.pointerLockElement) { controller.unlock(); openPause(); return; }
  if (mode === 'walk' && (e.code === 'KeyP' || e.code === 'F10')) { e.preventDefault(); controller.unlock(); openPause(); return; }
  if (mode === 'walk' && e.code === 'KeyT') { quickPulse(); return; }
  else if (e.code === 'Escape' && mode === 'paused' && performance.now() - pausedAt > 400) { game.resume(); enterWalk(); controller.lock(); }   // (the same Esc that released the mouse doesn't also close the menu)
});

// ---- frame loop ----
let last = performance.now(), hudT = 0, uiT = 0, todT = 0, visT = 0, moved = 0;
const smooth = (t) => t * t * (3 - 2 * t);
let loopErrors = 0;
R.renderer.setAnimationLoop(() => { try { frame_(); } catch (e) {
  if (loopErrors++ < 5) log('frame error: ' + (e.stack || e.message));
  game.setSpeed(0);
  if (loopErrors === 1) HUD.toast('error', 'Something broke and the game paused. Press Esc, then Resume.');
} });
function frame_() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const playing = ['walk', 'seated', 'transition', 'phone', 'card'].includes(mode) && game.sim;
  // safety net: the mouse is only ever captured while walking (pop-up events used to leave it stuck)
  if (mode !== 'walk' && document.pointerLockElement) document.exitPointerLock();
  if (playing) game.tickReal(dt);
  if (mode === 'walk') {
    const x0 = controller.state.x, z0 = controller.state.z;
    controller.update(dt); interactor.update(promptFor);
    const d = Math.hypot(controller.state.x - x0, controller.state.z - z0);
    if (d > 0.0005) { moved += d; if (moved > 0.8) game.flags.walked = true; }
    Sound.walking(d / Math.max(dt, 1e-3) > 0.4, d / Math.max(dt, 1e-3) > 2.5);
  }
  if (tween.done) {
    tween.t = Math.min(1, tween.t + dt / tween.dur);
    const k = smooth(tween.t);
    R.camera.position.lerpVectors(tween.from.p, tween.to.p, k);
    R.camera.quaternion.slerpQuaternions(tween.from.q, tween.to.q, k);
    if (tween.t >= 1) { const d = tween.done; tween.done = null; d(); }
  }
  if (game.sim && room) {
    laptop.update(game, now);
    for (const s of room.screens || []) s.update(game, now);
    if (room.update) room.update(dt, game, now / 1000);
    if (room.anims) for (const f of room.anims) f(dt, now / 1000);
    if (room.outside) for (const f of room.outside.anims) f(dt, now / 1000);
    if (room.cat) { room.cat.rotation.y += dt * 0.3; room.cat.position.x = Math.sin(now / 9000) * 0.6; room.cat.userData.tail && (room.cat.userData.tail.rotation.z = Math.sin(now / 300) * 0.4); }
    if (now - todT > 1000) { todT = now; room.setTime(game.clock.hour, R.scene); Sound.rain(rainy()); }
    if (now - hudT > 250) { hudT = now; if (BH.RealCoins) BH.RealCoins.reskin(); HUD.render(game); HUD.renderExtra(game); if (mode === 'phone') BH.Phone.render(false); }
    if (mode === 'seated' && BH.UI && BH.UI.render && now - uiT > C.TICK_MS) { uiT = now; try { BH.UI.render(false); } catch (e) { log('terminal render: ' + e.message); } }
    if (mode === 'walk' && now - visT > 5000) { visT = now; maybeVisitor(); }
    if ((mode === 'walk' || (mode === 'seated' && !game.sim.orders.length)) && now - lastSave > C.AUTOSAVE_S * 1000) save(true);
  }
  if (mode !== 'seated') R.render();
}

// ---- boot ----
Sound.init({ music: +settings.volMusic, sfx: +settings.volSfx, amb: +settings.volAmb });
if (BH.RealCoins) { BH.RealCoins.on = settings.realCoins !== '0' && (!SCENE || params.get('real') === '1'); BH.RealCoins.game = () => game; BH.RealCoins.start(); }
fetch('assets/templates/templates.json').then((r) => (r.ok ? r.json() : null)).then((t) => { if (t && BH.Director) BH.Director.setTemplates(t); }).catch(() => {});
Sound.radioOn = settings.radio !== '0';
const VIEWS = { door: { pos: [1.4, 1.62, 1.35], look: [-0.4, 0.9, -1.2] }, desk: { pos: [0.2, 1.55, 0.2], look: [1.3, 0.6, -1.55] } };
if (!SCENE || SCENE === 'menu') { game.newGame(7); buildPlace('bedroom'); room.setTime(22, R.scene); controller.place(1.4, 1.35, 0.7); mainMenu(); }
else {
  game.newGame(+(params.get('seed') || 42));
  for (let i = 0; i < 1200; i++) { game.sim.step(0.25); game.player.tick(); }
  const place = params.get('place') || 'bedroom', b = game.sys.build;
  if (params.get('rich')) { b.places.push('apartment', 'office', 'tower'); Object.assign(b.owned, { monitor: 3, devdesk: 1, chair: 1, plant: 3, rgb: 2, coffee: 1, desk: 6, rack: 6, bed: 1, tv: 1, console: 1, shelf: 1, clock: 1, megaphone: 1, armchair: 1, coffeetable: 1 }); game.bills.cash = 90000; b.syncRent(); game.sys.pad.buy(); game.sys.world.cat = true; const fm = game.sys.firm; fm.newResumes(); for (let i = 0; i < 4; i++) { fm.newResumes(); fm.hire(fm.resumes[0].id); fm.fund(fm.staff[i].id, 0.5); } for (let i = 0; i < 1200; i++) { game.sim.step(0.25); game.player.tick(); } game.afterTime(); b.boxes.push('plant'); }
  if (params.get('hour')) game.clock.total = +params.get('hour');
  if (params.get('tut') === '0') game.sys.tutorial.skip();
  buildPlace(place);
  controller.place(room.spawn.pos.x, room.spawn.pos.z, room.spawn.yaw);
  enterWalk();
  if (VIEWS[SCENE]) { const v = VIEWS[SCENE]; controller.state.enabled = false; R.camera.position.set(...v.pos); R.camera.lookAt(...v.look); mode = 'transition'; }
  if (SCENE === 'walk' && place === 'bedroom') { controller.place(0.55, -0.15, -0.35); controller.state.pitch = -0.55; HUD.hint(false); }
  if (SCENE === 'look') { if (game.sys.story) game.sys.story.on = false; if (params.get('sleepnow')) setTimeout(() => sleep(), 1500); if (params.get('bags')) { const live = game.sim.tokens.filter((t) => !t.dead && t.trades.length).sort((x, y) => game.sim.mc(y) - game.sim.mc(x)); for (const tk of live.slice(0, 3)) game.player.buy(tk.id, 0.6); for (let i = 0; i < 40; i++) { game.sim.step(0.25); game.player.tick(); } game.clock.total = Math.max(game.clock.total, 12); game.sys.perps.open('long', 0.5, 10, 'BTC'); game.sys.perps.open('short', 0.3, 5, 'TSLA'); game.meta.watch = live.slice(3, 5).map((t) => t.id); } const p = params.get('at') ? params.get('at').split(',').map(Number) : null; if (p) { controller.place(p[0], p[1], p[2]); controller.state.pitch = p[3] || -0.1; } HUD.hint(false); }
  if (params.get('track')) { const tk = game.sim.tokens.filter((t) => (t.bubbles || []).length > 5).pop(); if (tk) for (const b of tk.bubbles.slice(-6)) game.sys.tracker.track(b.addr, { name: b.name }); }
  if (['seated', 'token', 'bank', 'daytrade', 'chirp', 'scope', 'shop', 'dev', 'firm', 'pad', 'desktop', 'discover', 'trackers', 'perps', 'predict', 'rewards', 'news', 'radio', 'trencher', 'hustle', 'clout', 'toolkit', 'finance', 'empire', 'life', 'launch', 'stream', 'contracts'].includes(SCENE)) {
    for (let i = 0; i < +(params.get('run') || 0) * 4; i++) { game.sim.step(0.25); game.player.tick(); }   // run=N: fast-forward N seconds (busy charts for screenshots)
    let megaTk = null;
    if (params.get('mega')) { const d = game.sys.director; d.force = 'mega'; megaTk = game.sim.launch(); d.force = null; for (let i = 0; i < +params.get('mega') * 4; i++) { game.sim.step(0.25); game.player.tick(); } }
    // arch=A..H&secs=N: launch a coin playing that launch archetype and run it N seconds (screenshots)
    if (params.get('arch') && BH.Archetypes) { const id = params.get('arch'), d = game.sys.director, P = BH.Director.prototype, o = P.template; P.template = function (t, r) { return BH.Archetypes.build(id, r); }; d.force = { A: 'doa', B: 'pnd', C: 'runner', D: 'runner', F: 'rug', G: 'runner', H: 'rug' }[id]; megaTk = game.sim.launch(); d.force = null; P.template = o; for (let i = 0; i < +(params.get('secs') || 300) * 4; i++) { game.sim.step(0.25); game.player.tick(); } }
    if (params.get('legend') && !megaTk) { const d = game.sys.director; d.force = 'legend'; megaTk = game.sim.launch(); d.force = null; for (let i = 0; i < +params.get('legend') * 4; i++) { game.sim.step(0.25); game.player.tick(); } }   // legend=N: a legend runner, N s after launch
    const wantFate = params.get('fate');   // fate=runner|rug|pnd|whale|doa: the chart shot shows a coin of that kind
    const live = game.sim.tokens.filter((t) => !t.dead);
    const vampTk = params.get('vamp') ? live.filter((t) => t.vampOf && !t.fakeLiq).sort((a, b) => b.candles.length - a.candles.length)[0] || live.find((t) => t.vampOf) : null;
    const divTk = params.get('div') ? live.filter((t) => t.rewards === 'holders').sort((a, b) => (b.pair === 'USD1') - (a.pair === 'USD1') || b.candles.length - a.candles.length)[0] : null;
    const tk = vampTk || divTk || megaTk || (wantFate && live.filter((t) => t.fate2 === wantFate).sort((a, b) => b.candles.length - a.candles.length)[0]) || (SCENE === 'token' ? live.slice().sort((a, b) => (b.bubbles || []).length - (a.bubbles || []).length)[0] : live.slice(-1)[0]);   // the chart shot uses the busiest coin
    if (tk && (params.get('legend') || params.get('arch') || wantFate || vampTk || divTk)) sceneCoin = tk.id;
    if (tk) { game.player.buy(tk.id, 0.8); for (let i = 0; i < 8; i++) { game.sim.step(0.25); game.player.tick(); } }
    if (tk && params.get('sellall')) { for (let i = 0; i < 40; i++) { game.sim.step(0.25); game.player.tick(); } game.player.buy(tk.id, 0.6, { slippage: 0.9 }); for (let i = 0; i < 160; i++) { game.sim.step(0.25); game.player.tick(); } setTimeout(() => { if (BH.UI && BH.UI.openToken) BH.UI.openToken(tk.id); setTimeout(() => { game.player.sell(tk.id, 1, { slippage: 0.9 }); }, 1500); }, 2500); }
    if (tk && params.get('sellhalf')) { for (let i = 0; i < 80; i++) { game.sim.step(0.25); game.player.tick(); } game.player.buy(tk.id, 0.5, { slippage: 0.9 }); for (let i = 0; i < 60; i++) { game.sim.step(0.25); game.player.tick(); } game.player.buy(tk.id, 0.4, { slippage: 0.9 }); for (let i = 0; i < 60; i++) { game.sim.step(0.25); game.player.tick(); } game.player.sell(tk.id, 0.5, { slippage: 0.9 }); for (let i = 0; i < 12; i++) { game.sim.step(0.25); game.player.tick(); } }
    if (tk && params.get('sellhalf')) setTimeout(() => { if (BH.UI && BH.UI.openToken) BH.UI.openToken(tk.id); }, 2800);
    if (tk && params.get('call')) { game.sys.trencher.call(tk.id, 'chart looks clean here, small bag'); for (let i = 0; i < 240; i++) { game.sim.step(0.25); game.player.tick(); } setTimeout(() => { if (BH.UI && BH.UI.openToken) BH.UI.openToken(tk.id); }, 2800); }
    if (params.get('celeb') && game.sys.celebs) { const c = BH.Celebs.CELEBS[0]; game.sys.celebs.tweet(c, c.tweets[2]); for (let i = 0; i < 100; i++) { game.sim.step(0.25); game.player.tick(); } }
    if (params.get('disp')) setTimeout(() => { const c = BH.UI && BH.UI.chart; if (c) { c.menuOpen = true; c.renderMenu(); } }, 3500);
    if (params.get('post')) { const so = game.sys.social; game.sys.trencher.followers = 4200; so.compose('gm. the trenches are quiet today, which usually means something is about to send'); if (tk) so.compose('$' + tk.ticker + ' chart looks clean, dev wallet tiny. small bag', tk.id); for (let i = 0; i < 400; i++) { game.sim.step(0.25); game.player.tick(); } const other = so.posts.filter((x) => !x.mine && x.acc !== 'you').slice(-3); if (other[0]) so.like(other[0].id); if (other[1]) so.repost(other[1].id); }
    if (['clout', 'toolkit', 'finance', 'empire', 'life'].includes(SCENE)) {
      const gs = game.sys, t = gs.trencher; game.bills.cash = 30000; t.followers = 6200; t.trust = 64;
      if (params.get('tab')) BH.appTab = { [SCENE]: params.get('tab') };
      const coins = game.sim.tokens.filter((x) => !x.dead).slice(-4);
      for (const c of coins) { t.call(c.id); }
      const cp = gs.clout; for (const p of cp.posts) for (let i = 0; i < 3; i++) cp.growPosts();
      cp.posts.forEach((p, i) => { p.likes += 120 * (i + 1); p.replies.push({ id: 'rx' + i, who: ['ape_andy', 'jeetjim', 'frogmom', 'tinyfish'][i % 4], kind: ['fan', 'hater', 'question', 'fan'][i % 4], text: ['called it, legend', 'you dumped on us', 'entry?', 'printed thanks to you'][i % 4], answered: null }); });
      cp.syncCopiers(); cp.alphaOpen(); for (let i = 0; i < 6; i++) cp.alphaTick(); game.clock.total += 30; cp.dealTick(); cp.dealTick();
      gs.tools.investigate(coins[0].id); gs.tools.investigate(coins[1].id); gs.tools.dm(); gs.tools.dm(); gs.tools.dm(); gs.tools.buyHw(); game.player.sol += 3; gs.tools.deposit(3); gs.tools.setSniper('on');
      gs.finance.borrow(800); gs.finance.propStart(); gs.finance.insOpen(); game.player.sol += 0.2; gs.finance.farm('bridgey'); gs.finance.farm('restake');
      gs.empire.refreshBoard(); gs.empire.accept(gs.empire.board[0].id); gs.empire.open('bar'); gs.empire.open('billboard'); gs.empire.order('studio9', 'art', 3); gs.empire.newPartner();
      const l = gs.life; game.afterTime(); l.adopt('goldfish'); l.oracleDaily(); l.chat.unshift({ day: 2, hour: 14, who: 'Jess', text: 'YOU HIT 6.2x ON $FROG?? dinner on you' }, { day: 2, hour: 15, who: 'Dex', text: 'bro stop revenge trading' }); l.season.xp = 340; l.checkDaily(); l.dreams.unshift({ day: 2, text: 'You dreamt you were trapped in a bonding curve at 99.9%. It never graduated.' });
    }
    // stream: go live, trade a little for two minutes so the screen has viewers, chat and money
    if (SCENE === 'stream' && game.sys.stream) { const st = game.sys.stream; st.followers = 3000; st.start(); const live = game.sim.tokens.filter((t) => !t.dead && t.dir).slice(-3); for (let s = 0; s < 120; s++) { if (s % 15 === 0 && live[s % live.length]) game.player.buy(live[s % live.length].id, 0.2); for (let i = 0; i < 4; i++) { game.sim.step(0.25); game.player.tick(); } } }
    if (SCENE === 'contracts' && game.sys.contracts) { const c = game.sys.contracts; c.onStep(); if (c.list[0]) c.progress(c.list[0].id, c.list[0].goal); if (c.list[1]) c.progress(c.list[1].id, c.list[1].goal / 2); }
    if (SCENE === 'hustle') { const b = game.sys.biz; game.bills.cash = 8000; b.develop({ art: 'pixel', narrative: 'frogs', mascot: 'sad', lore: 'oneline', ticker: 'word' }); b.newApplicants(); b.hire(b.applicants[0].id); b.hire(b.applicants[1].id); b.addClient(); b.addClient(); b.addHeat(42, 'Bot volume'); b.addHeat(8, 'Shilling'); if (params.get('tab')) BH.hustleTab = params.get('tab'); }
    sit(room.seat, SCENE === 'seated' ? 'pulse' : SCENE);
  }
  if (SCENE === 'phone') { BH.Phone.tab = params.get('tab') || 'chirp'; openPhone(); }
  if (SCENE === 'visitor') { game.sys.world.visitors.push(params.get('who') || 'cat'); maybeVisitor(); }
  if (SCENE === 'checks') runChecks();
  if (SCENE === 'perf') {   // measure terminal rendering in the real app: #scene=perf&view=pulse|token
    for (let i = 0; i < 2400; i++) { game.sim.step(0.25); game.player.tick(); }
    const v = params.get('view') || 'pulse';
    sit(room.seat, v === 'token' ? 'token' : 'pulse');
    setTimeout(() => {
      const U = BH.UI, T = { render: [], chart: [], frame: [] };
      const wrap = (obj, k, arr) => { const o = obj[k]; obj[k] = function () { const t = performance.now(); const r = o.apply(this, arguments); arr.push(performance.now() - t); return r; }; };
      T.pulse = []; T.fill = []; T.feed = []; T.desk = []; T.wallet = [];
      wrap(U, 'render', T.render); if (U.chart) wrap(U.chart, 'draw', T.chart); if (U.renderPulse) wrap(U, 'renderPulse', T.pulse); if (U.fillRow) wrap(U, 'fillRow', T.fill); if (U.renderFeed) wrap(U, 'renderFeed', T.feed); if (U.renderWallet) wrap(U, 'renderWallet', T.wallet); if (U.renderInstant) wrap(U, 'renderInstant', T.desk);
      let last = performance.now(); const fr = () => { const n = performance.now(); T.frame.push(n - last); last = n; if (T.frame.length < 600) requestAnimationFrame(fr); }; requestAnimationFrame(fr);
      setTimeout(() => {
        const st = (a) => a.length ? 'n=' + a.length + ' avg=' + (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) + 'ms max=' + Math.max(...a).toFixed(0) + 'ms' : 'none';
        const out = 'PERF ' + v + ' | UI.render ' + st(T.render) + ' | chart.draw ' + st(T.chart) + ' | renderPulse ' + st(T.pulse) + ' | fillRow ' + st(T.fill) + ' | renderFeed ' + st(T.feed) + ' | renderWallet ' + st(T.wallet) + ' | instant ' + st(T.desk) + ' | frame ' + st(T.frame) + ' | tokens ' + game.sim.tokens.length;
        log(out); HUD.card('<h2>Perf</h2><pre style="white-space:pre-wrap;font:12px monospace;color:#cfd5de">' + out.split(' | ').join(String.fromCharCode(10)) + '</pre>');
      }, 8000);
    }, 4000);
  }
  if (SCENE === 'story') { const st = game.sys.story; game.afterTime(); if (params.get('id')) st.queue = [params.get('id')]; if (params.get('act')) { st.pendingAct = +params.get('act'); } st.lastSceneHour = -99; maybeStory(); }
  if (SCENE === 'sleep') { mode = 'sleeping'; HUD.sleepSummary(BH.Actions.sleep(game, 8), () => {}); }
}
window.__world = { R, get room() { return room; }, game, controller, THREE, get mode() { return mode; }, travel };

// ---- in-app self-test (#scene=checks) ----
async function runChecks() {
  const out = [];
  const ok = (name, cond, extra) => { out.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' (' + extra + ')' : '')); };
  try {
    const tk = game.sim.tokens.filter((t) => !t.dead && t.stage === 'curve').slice(-1)[0];
    const sol0 = game.player.sol;
    ok('buy accepted', game.player.buy(tk.id, 0.3).ok);
    for (let i = 0; i < 6; i++) { game.sim.step(0.25); game.player.tick(); }
    ok('buy landed', game.player.st.buys + game.player.st.failed === 1, 'sol ' + sol0.toFixed(2) + ' -> ' + game.player.sol.toFixed(2));
    if (game.player.pos.has(tk.id)) { game.player.sell(tk.id, 1); for (let i = 0; i < 6; i++) { game.sim.step(0.25); game.player.tick(); } ok('sell landed', game.player.st.sells + game.player.st.failed >= 1); }
    const h0 = game.clock.total; const s = BH.Actions.sleep(game, 8); ok('sleep advances 8h', Math.abs(game.clock.total - h0 - 8) < 1e-9, s.launched + ' launched overnight');
    const json = JSON.stringify(game.serialize()); const g2 = BH.createGame(); g2.start(JSON.parse(json));
    ok('save/load round trip', Math.abs(g2.player.sol - game.player.sol) < 1e-5 && Math.abs(g2.clock.total - game.clock.total) < 1e-4, (json.length / 1024).toFixed(0) + ' KB');
    ok('chirp posts', game.sys.social.posts.length > 5, game.sys.social.posts.length + ' posts');
    ok('coins have photos', game.sim.tokens.filter((t) => t.img != null).length > 10);
    for (let i = 0; i < 30 && Object.keys(Sound.buf).length < 10; i++) await new Promise((r) => setTimeout(r, 200));
    ok('audio loaded', Object.keys(Sound.buf).length >= 10, Object.keys(Sound.buf).length + ' sounds');
    for (const p of ['apartment', 'office', 'tower', 'street', 'bedroom']) { buildPlace(p); ok('place ' + p, room.interactables.length > 0 && colliders.length > 0, room.interactables.length + ' things to use'); }
    const t0 = performance.now(); for (let i = 0; i < 30; i++) R.render(); const ms = (performance.now() - t0) / 30;
    ok('3D frame time', ms < 16.7, ms.toFixed(1) + ' ms/frame (offscreen, ' + settings.quality + ')');
  } catch (e) { out.push('FAIL exception ' + e.message); }
  const pass = out.filter((l) => l.startsWith('PASS')).length;
  out.unshift('CHECKS ' + pass + '/' + out.length);
  log(out.join(' | '));
  HUD.card('<h2>Self-test</h2><pre style="white-space:pre-wrap;font:12px/1.6 ui-monospace,monospace;color:#cfd5de">' + out.join('\n') + '</pre>');
}
