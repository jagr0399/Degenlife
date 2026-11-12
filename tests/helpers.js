// Loads the plain-script modules into globalThis.BH for Node tests.
const path = require('path');
global.window = undefined;
const ROOT = path.join(__dirname, '..');
const loaded = new Set();
function load(...files) {
  for (const f of files) {
    if (loaded.has(f)) continue;
    require(path.join(ROOT, f));
    loaded.add(f);
  }
  return globalThis.BH;
}
const CORE = ['core/config.js', 'core/names.js', 'core/fmt.js', 'core/sim.js', 'core/player.js'];
module.exports = { load, CORE };
