/* Degen Life — Electron main process.
 * - serves the game over degen://game/ (same origin for the terminal iframe)
 * - dev: serves the project folder (edits show on reload); built: serves app/bundled
 * - saves in userData/saves (slot1.json + slot1.bak.json), log in userData/degenlife.log
 * - no network: every request outside degen:// is blocked
 * - `--shot=<file.png> [--scene=<hash>] [--wait=<ms>] [--size=WxH]` renders offscreen, saves a screenshot, quits
 */
const { app, BrowserWindow, Menu, ipcMain, protocol, session, net } = require('electron');
const fs = require('fs');
const path = require('path');
const { writeSave, readSave, listSlots } = require('./savefiles');

app.setPath('userData', path.join(app.getPath('appData'), 'Degen Life'));
const USER = app.getPath('userData');
const SAVES = path.join(USER, 'saves');
const LOG = path.join(USER, 'degenlife.log');
const DEV_ROOT = path.dirname(__dirname);
const ROOT = fs.existsSync(path.join(DEV_ROOT, 'index.html')) ? DEV_ROOT : path.join(__dirname, 'bundled');

const arg = (k) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const SHOT = arg('shot');

function log(msg) {
  try { fs.mkdirSync(USER, { recursive: true }); fs.appendFileSync(LOG, new Date().toISOString() + ' ' + String(msg).slice(0, 2000) + '\n'); } catch { /* ignore */ }
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

protocol.registerSchemesAsPrivileged([{ scheme: 'degen', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

function serve(req) {
  const u = new URL(req.url);
  let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) return new Response('Forbidden', { status: 403 });
  try {
    const buf = fs.readFileSync(file);
    return new Response(buf, { headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' } });
  } catch {
    return new Response('Not found: ' + rel, { status: 404 });
  }
}

ipcMain.handle('degen:save', (_e, json, opts) => { try { writeSave(SAVES, json, opts || undefined); return { ok: true }; } catch (e) { log('save failed: ' + e.message); return { ok: false, error: e.message }; } });
ipcMain.handle('degen:load', (_e, slot) => readSave(SAVES, slot));
ipcMain.handle('degen:slots', () => listSlots(SAVES));
// real coin data (opt-in): only these two public APIs, GET only, JSON only
const ALLOW_API = ['https://api.geckoterminal.com/api/v2/', 'https://api.dexscreener.com/'];
ipcMain.handle('degen:fetchJson', async (_e, url) => {
  if (typeof url !== 'string' || !ALLOW_API.some((p) => url.startsWith(p))) return { ok: false, error: 'not allowed' };
  try { const r = await net.fetch(url, { headers: { accept: 'application/json' } }); if (!r.ok) return { ok: false, status: r.status }; return { ok: true, json: await r.json() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.on('degen:log', (_e, msg) => log(msg));
let quitting = false;
ipcMain.on('degen:quit', () => { quitting = true; app.quit(); });

function createWindow() {
  const size = (arg('size') || '1600x900').split('x').map(Number);
  const win = new BrowserWindow({
    width: size[0], height: size[1], show: false, backgroundColor: '#07080b', title: 'Degen Life',
    useContentSize: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, offscreen: !!SHOT, backgroundThrottling: false },
  });
  win.webContents.on('console-message', (e) => { const lvl = e.level; if (lvl === 'error' || lvl === 'warning' || lvl === 3 || lvl === 2) log('page ' + lvl + ': ' + e.message); });
  win.webContents.on('render-process-gone', (_e, d) => log('renderer gone: ' + d.reason));
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') win.setFullScreen(!win.isFullScreen());
    if (input.key === 'F12') win.webContents.toggleDevTools();
  });
  // closing the window: let the page save, then close (never hangs longer than 3 s)
  win.on('close', (e) => {
    if (quitting || SHOT) return;
    e.preventDefault();
    quitting = true;
    win.webContents.send('degen:flush');
    setTimeout(() => { if (!win.isDestroyed()) win.destroy(); }, 3000);
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('degen://')) e.preventDefault(); });
  const scene = arg('scene');
  win.loadURL('degen://game/index.html' + (scene ? '#' + scene : ''));
  if (SHOT) {
    win.webContents.setFrameRate(30);
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const img = await win.webContents.capturePage();
          fs.mkdirSync(path.dirname(SHOT), { recursive: true });
          fs.writeFileSync(SHOT, img.toPNG());
          console.log('shot ' + SHOT);
        } catch (e) { console.error('shot failed ' + e.message); }
        app.quit();
      }, Number(arg('wait') || 6000));
    });
  } else {
    win.once('ready-to-show', () => { win.show(); });
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('degen', serve);
  // fake money, no network: block everything that is not our own protocol or devtools
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => {
    // offline by default; the only outside traffic is coin pictures (https images) — API calls go through degen:fetchJson in this process
    const ok = /^(degen|devtools|data|blob|chrome-extension):/.test(d.url) || (d.resourceType === 'image' && d.url.startsWith('https://')) || ALLOW_API.some((p) => d.url.startsWith(p));   // the two read-only coin APIs (net.fetch here goes through this filter too)
    if (!ok) log('blocked request ' + d.url);
    cb({ cancel: !ok });
  });
  log('start ' + app.getVersion() + ' root=' + ROOT + (SHOT ? ' shot=' + SHOT : ''));
  createWindow();
});
app.on('window-all-closed', () => app.quit());
