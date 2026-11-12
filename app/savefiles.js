/* Save files: slot1.json with slot1.bak.json as the previous good copy.
   Writes go to slot1.tmp first, so a crash mid-write never damages both copies. */
const fs = require('fs');
const path = require('path');

const parsesOk = (s) => { try { JSON.parse(s); return true; } catch { return false; } };

function writeSave(dir, json, opts) {
  const rotate = !opts || opts.rotate !== false, n = (opts && opts.slot) || 1;
  fs.mkdirSync(dir, { recursive: true });
  const main = path.join(dir, 'slot' + n + '.json'), bak = path.join(dir, 'slot' + n + '.bak.json'), tmp = path.join(dir, 'slot' + n + '.tmp');
  if (opts && opts.meta) fs.writeFileSync(path.join(dir, 'slot' + n + '.meta.json'), JSON.stringify(opts.meta));
  fs.writeFileSync(tmp, json);
  if (rotate && fs.existsSync(main)) {
    // only keep a backup that is itself readable
    const cur = fs.readFileSync(main, 'utf8');
    if (parsesOk(cur)) fs.copyFileSync(main, bak);
  }
  fs.renameSync(tmp, main);
}

function readText(p) { try { const s = fs.readFileSync(p, 'utf8'); return s && parsesOk(s) ? s : null; } catch { return null; } }
function readSave(dir, slot) {
  const n = slot || 1;
  const main = readText(path.join(dir, 'slot' + n + '.json')), bak = readText(path.join(dir, 'slot' + n + '.bak.json'));
  if (main) return bak ? { json: main, from: 'main', backup: bak } : { json: main, from: 'main' };
  if (bak) return { json: bak, from: 'backup' };
  return { json: null, from: null };
}

function listSlots(dir) {
  return [1, 2, 3].map((n) => { let meta = null; try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'slot' + n + '.meta.json'), 'utf8')); } catch { /* none */ } const has = fs.existsSync(path.join(dir, 'slot' + n + '.json')); return { slot: n, has, meta }; });
}

module.exports = { writeSave, readSave, listSlots };
