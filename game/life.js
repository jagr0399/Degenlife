/* Life stats 0-100: energy, hunger, sanity, and focus derived from them. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const clamp = (v) => Math.max(0, Math.min(100, v));
  function Life() { this.energy = 100; this.hunger = 20; this.sanity = 70; }
  const P = Life.prototype;
  Object.defineProperty(P, 'focus', {
    get() { return clamp(Math.min(this.energy, 100 - this.hunger) + (this.sanity - 50) / 8 + (this.focusBonus || 0)); },
  });
  // hours of game time passing; opts.seated (at a screen), opts.asleep
  P.tick = function (hours, opts) {
    opts = opts || {};
    if (opts.asleep) { this.energy = clamp(this.energy + (12.5 + (opts.sleepBonus || 0)) * hours); this.sanity = clamp(this.sanity + 2 * hours); }
    else this.energy = clamp(this.energy - Math.max(1, (opts.seated ? 6 - (opts.seatedSave || 0) : 4)) * (opts.drainMul || 1) * hours);
    this.hunger = clamp(this.hunger + 5 * hours);
  };
  P.eat = function () { this.hunger = clamp(this.hunger - 40); };
  P.onClose = function (pnlSol) { this.sanity = clamp(this.sanity + (pnlSol >= 0 ? 3 : -3)); };
  P.onRug = function () { this.sanity = clamp(this.sanity - 8); };
  P.bump = function (k, d) { this[k] = clamp(this[k] + d); };
  P.orderDelayBlocks = function () { return this.focus < 30 ? 1 : 0; };
  BH.Life = Life;
})(typeof window !== 'undefined' ? window : globalThis);
