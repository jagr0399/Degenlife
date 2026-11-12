/* Mega-runners: a rare coin type modeled on a real coin, "Max coin" (5qaP…pump, launched Nov 11 2026 20:56 UTC).
   What the real one did (docs/research/2026-11-12-max-coin-study.md):
   - 4 quiet minutes on the bonding curve ($3K -> $5K, ~224 small trades), then bonded in ONE minute ($5K -> $35K).
   - First DEX minute: 10x ($33K -> $334K). By minute 4: $2M. Then a staircase with brutal wicks:
     -55% (minute 6), -70% (minute 24), then the main leg to $13.7M in 4 minutes on $2M+/min volume.
   - Ranged $5-11M with a second peak, then a -65% flash dump in 1 minute (51 wallets sold $239K in 2 min)
     that was bought straight back. 27K buyers and $44M volume in under 2 hours.
   - Within 2-20 minutes of migration, a swarm of "beta" coins paired to it launched (BabyMax x3, MaxPayne,
     SAXON, TILLY, CELON, CYBRON...) that moved with it and mostly faded.
   The game version: fate 'mega' (about 1.5% of launches) plays the real chart or a generated variant with the same phases,
   then spawns 3-7 beta coins that follow the parent's moves. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const MAX = {"src":"Max coin (5qaP…pump), Nov 11 2026, real 1-min chart","c":[[1,1.224,1,1.138,0.002306],[1.138,1.708,1.121,1.708,0.003605],[1.708,1.952,1.665,1.938,0.002533],[1.938,2.014,1.932,1.932,0.0008776],[1.932,13.46,1.691,13.46,0.05158],[130,219.3,89.63,139.1,1.839],[139.1,247.2,123.1,238.8,1.221],[238.8,392.5,208,305.8,1.774],[305.8,787.2,197.4,700.1,1.651],[700.1,700.1,257.8,323.4,2.29],[323.4,479.7,299.6,401.9,0.84],[401.9,438,229.2,263.4,1.023],[263.4,349.3,229.8,331.5,0.5108],[331.5,427.1,304.5,383.7,0.455],[383.7,578.6,368.1,472.2,1.085],[472.2,588.7,363.4,393,0.6581],[393,472.3,334.7,451.4,0.4037],[451.4,490.6,365.4,427.1,0.489],[427.1,498.2,358.6,489.9,0.5315],[489.9,667.6,413,547.7,1.07],[547.7,688.1,477.9,656.3,0.7683],[656.3,710.5,524.4,676.2,0.9007],[676.2,786.3,642.9,747.7,0.9942],[747.7,973,726.1,954.7,1.33],[954.7,1447,887.8,1343,1.76],[1343,1470,1115,1256,1.625],[1256,1804,1138,1155,2.848],[1155,1155,407.1,596.1,4.548],[596.1,879.7,417.9,555.8,2.392],[555.8,1090,506.2,1052,1.229],[1052,1141,855.5,1031,1.294],[1031,4568,1002,3153,8.956],[3153,4364,2497,3377,10.54],[3377,5173,2834,4374,8.475],[4374,5341,3236,3650,9.037],[3650,4149,2780,3542,6.135],[3542,4453,3264,3553,4.514],[3553,4028,3173,3674,4.042],[3674,4165,3223,3535,2.894],[3535,4222,3210,3692,2.499],[3692,3866,2120,2349,4.041],[2349,2598,1548,2233,4.771],[2233,2656,1956,2397,2.195],[2397,2975,2364,2893,1.772],[2893,3257,2639,2796,1.564],[2796,2853,1671,1772,2.261],[1772,2243,1637,2098,1.581],[2098,2390,1926,2281,0.7335],[2281,2309,1732,2184,1.375],[2184,3070,2166,2967,1.882],[2967,3006,2514,2700,0.9173],[2700,3343,2506,3189,1.303],[3189,4415,2955,3972,4.698],[3972,4062,3245,3705,2.956],[3705,4029,3063,3298,2.097],[3298,3539,2967,3040,1.525],[3040,3219,2129,2571,2.432],[2571,2856,2096,2482,2.062],[2482,2923,2482,2801,1.061],[2801,4562,2698,3405,3.61],[3405,3613,2434,2782,3.197],[2782,3246,2685,3157,1],[3157,3203,2554,2610,1.046],[2610,2846,2397,2582,0.8998],[2582,3070,2540,2785,0.6984],[2785,3049,2713,2943,0.5378],[2943,3492,2883,3011,0.9798],[3011,3365,2895,3068,0.7755],[3068,3110,2685,2879,0.6929],[2879,3272,2850,2932,0.5664],[2932,3276,2742,2902,0.3968],[2902,3023,2496,2569,0.8942],[2569,2913,2565,2792,0.4429],[2792,3292,2527,2874,0.6775],[2874,3035,2586,2960,0.6544],[2960,3604,2792,3098,1.089],[3098,3252,2978,3111,0.3867],[3111,3249,3005,3125,0.4611],[3125,3156,2860,2906,0.3333],[2906,3096,2827,3043,0.2386],[3043,3300,2715,2892,0.818],[2892,3173,2852,3016,0.4853],[3016,3112,2789,2894,0.3481],[2894,3143,2894,3120,0.2562],[3120,3618,2957,3460,0.5696],[3460,3599,3106,3162,0.5806],[3162,3460,3058,3340,0.4585],[3340,3418,3137,3314,0.4432],[3314,3718,3272,3362,0.7238],[3362,3534,3308,3458,0.4406],[3458,3720,3411,3708,0.5263],[3708,3809,3510,3610,0.5504],[3610,3848,3356,3624,0.7217],[3624,3705,922.8,1260,3.457],[1260,2304,1254,2200,5.474],[2200,2331,1583,1953,2.006],[1953,2551,1940,2227,1.309],[2227,2387,2170,2214,0.5529],[2214,2441,2121,2316,0.4697],[2316,2624,2229,2592,0.5174],[2592,2814,2504,2620,0.6356],[2620,2690,2181,2197,0.4336]]};
  const BETA_NAMES = [(n) => 'Baby ' + n, (n) => n + ' Payne', (n) => 'Mini ' + n, (n) => n + ' Wif Hat', (n) => 'CEO of ' + n, (n) => n + ' 2.0', (n) => 'Based ' + n, (n) => n + ' Inu', (n) => 'Mrs ' + n, (n) => n + "'s Cat"];
  const BETA_TICK = [(t) => 'BABY' + t, (t) => t + 'PAYNE', (t) => 'MINI' + t, (t) => t + 'WIF', (t) => 'CEO' + t, (t) => t + '2', (t) => 'B' + t, (t) => t + 'INU', (t) => 'MRS' + t, (t) => t + 'CAT'];

  // generated variant with the same phases as the real one (so every mega-runner looks different)
  function genMega(r) {
    const out = []; let p = 1;
    const push = (o, c, v, wickDown) => { const h = Math.max(o, c) * (1 + r() * 0.08), l = Math.min(o, c) * (1 - r() * 0.08) * (wickDown || 1); out.push([o, h, l, c, v]); };
    const crawl = r.int(3, 6);
    for (let i = 0; i < crawl; i++) { const o = p; p *= 1 + r.range(0.05, 0.18); push(o, p, r.range(0.3, 1.2)); }
    let o = p; p *= r.range(5, 9); push(o, p, r.range(20, 40));                       // bonds in one candle
    o = p; p *= r.range(6, 12); push(o, p, r.range(60, 120));                         // first DEX minute
    const legs = r.int(2, 4);
    for (let L = 0; L < legs; L++) {
      const steps = r.int(4, 10);
      for (let i = 0; i < steps; i++) { o = p; p *= 1 + r.range(-0.12, 0.35); push(o, p, r.range(10, 40)); }
      o = p; const crash = r.range(0.3, 0.55); p *= crash; push(o, p, r.range(60, 140), 0.9);   // flash wick
      for (let i = 0; i < r.int(1, 4); i++) { o = p; p *= 1 + r.range(0.1, 0.45); push(o, p, r.range(20, 60)); }   // V recovery
    }
    for (let i = 0; i < r.int(3, 5); i++) { o = p; p *= r.range(1.3, 1.9); push(o, p, r.range(150, 300)); }   // main leg
    const range = r.int(20, 45), top = p;
    for (let i = 0; i < range; i++) { o = p; p = Math.max(top * 0.35, Math.min(top * 1.15, p * (1 + r.range(-0.18, 0.17)))); push(o, p, r.range(8, 50)); }
    o = p; p *= r.range(0.3, 0.45); push(o, p, r.range(100, 160), 0.85);                // late flash dump
    for (let i = 0; i < r.int(5, 12); i++) { o = p; p *= 1 + r.range(-0.05, 0.14); push(o, p, r.range(10, 30)); }
    // a mega-runner is huge by definition: stretch weak draws so the top is at least ~1000x, keeping the shape
    const peakX = Math.max(...out.map((x) => x[1]));
    if (peakX > 1 && peakX < 1000) { const k = Math.log(r.range(1000, 2500)) / Math.log(peakX); for (const x of out) for (let j = 0; j < 4; j++) x[j] = Math.pow(x[j], k); }
    return { src: 'generated (Max-style)', c: out };
  }
  BH.Mega = { MAX, genMega };

  function Mega(game, saved) {
    this.game = game; this.parents = {}; this.count = 0; this.betas = 0;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Mega.prototype;
  P.save = function () { return { parents: this.parents, count: this.count, betas: this.betas }; };

  P.spawnBeta = function (parent) {
    const sim = this.game.sim, d = this.game.sys.director, r = sim.r;
    if (!d) return null;
    const k = r.int(0, BETA_NAMES.length - 1);
    d.force = r() < 0.6 ? 'pnd' : r() < 0.5 ? 'doa' : 'rug';
    const tk = sim.launch();
    d.force = null;
    if (!tk) return null;
    tk.name = BETA_NAMES[k](parent.name.replace(/ coin$/i, '')).slice(0, 28);
    tk.ticker = BETA_TICK[k](parent.ticker.toUpperCase()).replace(/[^A-Z0-9]/g, '').slice(0, 9);
    tk.betaOf = parent.id; tk.narrative = parent.narrative;
    tk.desc = 'the ' + parent.ticker + ' beta play. if $' + parent.ticker + ' sends, this sends harder (trust me)';
    this.betas++;
    return tk;
  };

  P.onStep = function (dt) {
    const sim = this.game.sim, r = sim.r;
    for (const tk of sim.tokens) {
      if (tk.dead) continue;
      // betas move with their parent: the parent's last step return pushes the beta's path
      if (tk.betaOf && tk.dir) {
        const par = sim.byId.get(tk.betaOf);
        if (par && !par.dead && par.mcHist && par.mcHist.length > 2) {
          const h = par.mcHist, ret = Math.log(h[h.length - 1] / h[h.length - 2]);
          if (isFinite(ret)) tk.dir.off = (tk.dir.off || 0) + ret * 0.9;
        }
      }
      if (tk.fate2 !== 'mega') continue;
      const st = this.parents[tk.id] = this.parents[tk.id] || { bonded: false, m1: false, m10: false, betas: 0, nextBeta: 0, lastMc: sim.mc(tk) };
      const mc = sim.mc(tk), soc = this.game.sys.social;
      if (!st.bonded && tk.stage === 'amm') {
        st.bonded = true; st.nextBeta = sim.t + r.range(8, 20); st.want = r.int(3, 7);
        sim.event('migrate', tk, '$' + tk.ticker + ' bonded in ' + Math.max(1, Math.round((sim.t - tk.born) / 10) / 6).toFixed(1) + ' min. Volume is going vertical');
      }
      if (!st.m1 && mc >= 1e6) { st.m1 = true; sim.event('ath', tk, '$' + tk.ticker + ' just hit a $1M market cap'); if (soc && soc.kols) soc.post(soc.kols[r.int(0, soc.kols.length - 1)], 'call', '$' + tk.ticker + ' is the runner of the day. if you are not in, you are watching', { coin: tk.id, mcAt: mc }); }
      if (!st.m10 && mc >= 1e7) { st.m10 = true; sim.event('ath', tk, '$' + tk.ticker + ' is at $10M. The whole timeline is talking about it'); if (this.game.sys.world) this.game.sys.world.headline('$' + tk.ticker + ' goes from $3K to $10M in under an hour'); }
      // flash dumps: a big one-step drop on a mega coin is mass panic, then dip buyers
      if (st.lastMc > 5e5 && mc < st.lastMc * 0.6 && !(st.panicAt > sim.t - 30)) { st.panicAt = sim.t; sim.event('rug', tk, '$' + tk.ticker + ' flash dump: dozens of wallets panic-sold at once (it is not over)'); }
      st.lastMc = mc;
      // the beta swarm launches over the minutes after migration
      if (st.bonded && st.betas < st.want && sim.t >= st.nextBeta) { st.betas++; st.nextBeta = sim.t + r.range(8, 30); const b = this.spawnBeta(tk); if (b) sim.event('launch', b, '$' + b.ticker + ' launched: a beta play on $' + tk.ticker); }
    }
  };
  P.afterTime = function () { };

  BH.MegaSys = Mega;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'mega', create(game, saved) { const m = new Mega(game, saved); m.hooks = { step: (dt) => m.onStep(dt) }; return m; } });

  // ---- teach the director the new fate ----
  if (BH.Director) {
    const D = BH.Director;
    if (!D.WEIGHTS.some((w) => w[0] === 'mega')) {
      const doa = D.WEIGHTS.find((w) => w[0] === 'doa'); if (doa) doa[1] -= 0.015;
      D.WEIGHTS.push(['mega', 0.015]);
      D.LABEL.mega = 'Mega-runner';
    }
    const tpl = D.prototype.template;
    D.prototype.template = function (type, r) { if (type === 'mega') { if (BH.Archetypes && !this.noArch && r() < 0.3) return BH.Archetypes.build('J', r); return r() < 0.35 ? MAX : genMega(r); } return tpl.call(this, type, r); };   // 30% of megas play archetype J (viral mega-launch)
    const onLaunch = D.prototype.onLaunch;
    D.prototype.onLaunch = function (tk, r) {
      onLaunch.call(this, tk, r);
      if (tk.fate2 === 'mega' && tk.dir) {
        if (!tk.dir.arch) tk.dir.sec = r.range(5, 8);   // (archetype J keeps its own speed)
        void 0;          // seconds per real minute: a 100-minute chart plays out in ~10 minutes
        tk.dir.amp = r.range(0.85, 1.0);     // never exaggerate a 5000x
        if (tk.hint) { tk.hint.top = Math.round(r.range(12, 22)); tk.hint.dev = Math.round(r.range(0, 3) * 10) / 10; tk.hint.insiders = r.int(0, 2); tk.hint.lp = true; tk.hint.xAge = r.int(0, 2); }
        tk.socials = Object.assign({}, tk.socials, { x: true, tg: true });
      }
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
