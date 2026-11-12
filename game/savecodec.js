/* Save codec: turns the live market + wallet + game state into plain JSON and back.
   Handles Map, Set and shared references (e.g. sim.byId values are the same objects as sim.tokens),
   drops the sim<->player back-links and the rng closure, and rewires them on decode. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const VERSION = 1;

  function SaveVersionError(v) { const e = new Error('Unsupported save version ' + v); e.name = 'SaveVersionError'; return e; }

  // keys never written (back-links and closures); restored by decode()
  const SKIP = { sim: ['player', 'r', 'hooks'], player: ['sim'] };

  function encodeGraph(root, skipFor) {
    const seen = new Map();   // object -> count
    (function mark(v) {
      if (!v || typeof v !== 'object') return;
      const n = seen.get(v) || 0;
      seen.set(v, n + 1);
      if (n) return;
      if (v instanceof Map) { for (const [k, x] of v) { mark(k); mark(x); } return; }
      if (v instanceof Set) { for (const x of v) mark(x); return; }
      const skip = skipFor(v);
      for (const k of Object.keys(v)) if (!skip || !skip.includes(k)) mark(v[k]);
    })(root);
    const ids = new Map(); let next = 0;
    const shapes = [], shapeIdx = new Map();   // objects with the same keys store their keys once
    const packed = (function enc(v) {
      if (v === undefined) return { $u: 1 };
      if (typeof v === 'number') { if (!Number.isFinite(v)) return { $n: String(v) }; return Number.isInteger(v) ? v : +v.toPrecision(7); } // 7 significant digits keeps saves small
      if (!v || typeof v !== 'object') return v;
      if (ids.has(v)) return { $ref: ids.get(v) };
      const shared = seen.get(v) > 1;
      const id = shared ? next++ : null;
      if (shared) ids.set(v, id);
      let out;
      if (v instanceof Map) out = { $map: [...v].map(([k, x]) => [enc(k), enc(x)]) };
      else if (v instanceof Set) out = { $set: [...v].map(enc) };
      else if (Array.isArray(v)) out = shared ? { $arr: v.map(enc) } : v.map(enc);
      else {
        const skip = skipFor(v);
        const keys = Object.keys(v).filter((k) => !skip || !skip.includes(k));
        if (keys.length >= 4 && !keys.some((k) => k[0] === '$')) {
          const sig = keys.join('');
          let si = shapeIdx.get(sig);
          if (si == null) { si = shapes.length; shapes.push(keys); shapeIdx.set(sig, si); }
          out = { $s: si, $v: keys.map((k) => enc(v[k])) };
        } else {
          out = {};
          for (const k of keys) out[k] = enc(v[k]);
        }
      }
      if (shared) out.$id = id;
      return out;
    })(root);
    return { r: packed, s: shapes };
  }

  function decodeGraph(packed) {
    const shapes = packed.s || [], data = packed.r;
    const ids = new Map();
    const fix = [];
    function dec(v) {
      if (!v || typeof v !== 'object') return v;
      if (Array.isArray(v)) return v.map(dec);
      if (v.$u) return undefined;
      if (v.$n != null) return Number(v.$n);
      if (v.$ref != null) {
        if (ids.has(v.$ref)) return ids.get(v.$ref);
        const holder = {}; fix.push([holder, v.$ref]); return holder; // forward ref (shouldn't happen with DFS order)
      }
      let out;
      if (v.$map) { out = new Map(); if (v.$id != null) ids.set(v.$id, out); for (const [k, x] of v.$map) out.set(dec(k), dec(x)); return out; }
      if (v.$set) { out = new Set(); if (v.$id != null) ids.set(v.$id, out); for (const x of v.$set) out.add(dec(x)); return out; }
      if (v.$arr) { out = []; if (v.$id != null) ids.set(v.$id, out); for (const x of v.$arr) out.push(dec(x)); return out; }
      out = {};
      if (v.$id != null) ids.set(v.$id, out);
      if (v.$s != null) { const keys = shapes[v.$s]; for (let i = 0; i < keys.length; i++) out[keys[i]] = dec(v.$v[i]); return out; }
      for (const k of Object.keys(v)) if (k !== '$id') out[k] = dec(v[k]);
      return out;
    }
    const root = dec(data);
    if (fix.length) throw new Error('Save has unresolved references');
    return root;
  }

  const SaveCodec = {
    VERSION,
    SaveVersionError,
    encode(state) {
      const { sim, player } = state;
      const skipFor = (o) => (o === sim ? SKIP.sim : o === player ? SKIP.player : null);
      return {
        version: VERSION,
        savedAt: Date.now(),
        rng: sim.r.getState(),
        graph: encodeGraph({ sim, player, game: state.game || {} }, skipFor),
      };
    },
    decode(obj) {
      if (!obj || obj.version !== VERSION) throw SaveVersionError(obj && obj.version);
      const plain = decodeGraph(obj.graph);
      const sim = Object.create(BH.Sim.prototype);
      Object.assign(sim, plain.sim);
      sim.r = BH.makeRng(1); sim.r.setState(obj.rng);
      const player = Object.create(BH.Player.prototype);
      Object.assign(player, plain.player);
      sim.player = player; player.sim = sim;
      return { sim, player, game: plain.game };
    },
  };
  BH.SaveCodec = SaveCodec;
})(typeof window !== 'undefined' ? window : globalThis);
