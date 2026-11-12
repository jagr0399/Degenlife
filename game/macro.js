/* The SOL price. It starts at the real price ($83.44, Nov 2026) and moves on its own:
   a slow random drift, the weekly market mood (bull / chop / bear), and news events that push it up or down.
   Every USD number in the game reads BH.C.SOL_USD, so market caps, your net worth and where coins graduate (in USD)
   all move with it, like the real thing. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;
  const START = 83.44;
  // random headlines: [chance weight, move in % (min, max), text]
  const NEWS = [
    [3, 2, 5, 'SOL climbs as a big fund files for a spot Solana ETF'],
    [3, 1.5, 4, 'SOL up: record day for on-chain volume'],
    [2, 3, 7, 'SOL rips after a payments giant says it will settle on Solana'],
    [2, 1, 3, 'SOL edges higher with the rest of the market'],
    [3, -5, -2, 'SOL slides as a large holder moves coins to an exchange'],
    [3, -4, -1.5, 'SOL dips: traders take profit after the weekend run'],
    [2, -8, -4, 'SOL drops hard on macro fears. Everything is red.'],
    [1, -10, -6, 'SOL tumbles after a validator bug halts blocks for 20 minutes'],
    [1, 6, 10, 'SOL squeezes higher as shorts get liquidated'],
  ];
  // what the game's own world events do to SOL (in %)
  const WORLD = { crash: [-14, -7], viral: [1.5, 4], hack: [-5, -2], outage: [-6, -3], regulator: [-3, -1] };

  function Macro(game, saved) {
    this.game = game;
    this.sol = START; this.anchor = START; this.day0 = START; this.next = 0; this.last = null; this.hist = [];
    if (saved) Object.assign(this, saved, { game });
    C.SOL_USD = this.sol;
  }
  const P = Macro.prototype;
  Macro.START = START;
  P.save = function () { return { sol: this.sol, anchor: this.anchor, day0: this.day0, next: this.next, last: this.last, hist: this.hist.slice(-120) }; };
  // change since the start of the game day, in %
  P.dayChange = function () { return (this.sol / this.day0 - 1) * 100; };

  // a news shock: the price does not jump, it travels there over the next minute or two
  P.shock = function (pct, text) {
    this.anchor = Math.max(8, Math.min(900, this.anchor * (1 + pct / 100)));
    this.last = { t: this.game.sim.t, pct, text };
    const w = this.game.sys.world;
    if (text) { if (w && w.headline) w.headline(text); else if (this.game.emit) this.game.emit('news', text); }
    if (this.game.emit) this.game.emit('toast', { kind: pct >= 0 ? 'buy' : 'fail', text: 'SOL ' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%' + (text ? ': ' + text : '') });
  };
  // the game's own events (crash, viral wave, hack, outage...) move SOL too
  P.onWorldEvent = function (kind) {
    const m = WORLD[kind]; if (!m) return;
    this.shock(this.game.sim.r.range(m[0], m[1]), null);   // the world event already printed its own headline
  };

  P.onStep = function (dt) {
    const sim = this.game.sim, r = sim.r;
    if (!this.next) this.next = sim.t + r.range(240, 600);
    // random news every 5-12 game hours (1 game hour = 1 real minute)
    if (sim.t >= this.next) {
      this.next = sim.t + r.range(300, 720);
      let tot = 0; for (const n of NEWS) tot += n[0];
      let x = r() * tot, pick = NEWS[0]; for (const n of NEWS) { if ((x -= n[0]) < 0) { pick = n; break; } }
      this.shock(r.range(pick[1], pick[2]), pick[3]);
    }
    // the weekly mood leans on the anchor: bull weeks drift up, bear weeks drift down (about 6% per game day at most)
    const fin = this.game.sys.finance, mood = fin && fin.regime === 'bull' ? 1 : fin && fin.regime === 'bear' ? -1 : 0;
    const DAY = C.GAME_HOUR_S * 24;
    this.anchor *= Math.exp(mood * 0.045 * dt / DAY + r.normal() * 0.012 * Math.sqrt(dt / DAY));
    // the price chases its anchor (half-way in ~40 s) with a little tick noise
    this.sol *= Math.exp(Math.log(this.anchor / this.sol) * (1 - Math.exp(-dt / 55)) + r.normal() * 0.00035 * Math.sqrt(dt));
    this.sol = Math.max(5, Math.min(1000, this.sol));
    C.SOL_USD = this.sol;
    if (!this.hist.length || sim.t - this.hist[this.hist.length - 1][0] >= 30) { this.hist.push([Math.round(sim.t), +this.sol.toFixed(2)]); if (this.hist.length > 240) this.hist.splice(0, this.hist.length - 240); }
  };
  // a new game day: remember the open, for the "today" change
  P.afterTime = function () { const d = this.game.clock.day; if (d !== this._day) { this._day = d; this.day0 = this.sol; } };

  BH.Macro = Macro;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'macro', create(game, saved) { const m = new Macro(game, saved); m.hooks = { step: (dt) => m.onStep(dt) }; return m; } });
})(typeof window !== 'undefined' ? window : globalThis);
