/* Vamp coins: other coins with the SAME name, ticker and picture as a runner.
   From the $Max study (docs/research/2026-11-12-runners-and-vamps.md), Nov 11 2026:
   - a NAME RACE: ~20 "Maxcoin"/"MAX" coins went up on pump.fun and bags.fm between 20:27 and 20:55; the one that ran
     launched at 20:56. The OG is not the first coin with the name, it's the one the crowd picked.
   - EARLY VAMPS during the run (other launchpads, Meteora pools): mostly dead or rugged within the hour.
   - LATE VAMPS 3 hours later ("Max coin" on PumpSwap, 23:46-00:23): several did $1-2M volume each, one reached a
     $13M FDV. Late vamps can run on their own.
   - a FAKE-LIQUIDITY copy: a "Max coin" pool showing a $14.9M market cap and $10.9M liquidity with almost no trades.
   In the game: when a mega-runner or a runner shows up, a few young coins get renamed to the same name (the race),
   early vamps launch during the run (mostly rugs), and late vamps launch after it peaks (1 in 4 runs).
   They all look identical on Pulse; only the CA, age, holders and the token page's warning tell them apart. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};

  function Vamps(game, saved) {
    this.game = game; this.drawn = {}; this.count = 0; this.flips = 0; this.raced = 0;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Vamps.prototype;
  P.save = function () { return { drawn: this.drawn, count: this.count, flips: this.flips, raced: this.raced }; };

  // a copy of the OG's look onto another coin
  function lookLike(tk, og) {
    tk.name = og.name; tk.ticker = og.ticker; tk.hue = og.hue; tk.img = og.img; tk.realImg = og.realImg || null; tk.banner = og.banner || null;
    tk.narrative = og.narrative; tk.desc = og.desc; tk.socials = Object.assign({}, og.socials);
  }
  P.lookLike = lookLike;

  // is this coin a runner that vamps would target, and how hard?
  P.kind = function (tk) {
    if (tk.dead || tk.vampOf || tk.betaOf || tk.isPlayer || tk.copyOf) return null;
    const sim = this.game.sim, mc = sim.mc(tk);
    if (tk.fate2 === 'mega') return 'mega';
    if (mc >= 250000 || (tk.stage === 'amm' && tk.migratedAt != null && sim.t - tk.migratedAt > 20 && mc >= 3 * sim.gradMc(tk))) return 'runner';
    return null;
  };

  // launch a vamp: fate 'early' (mostly rugs), 'late' (1 in 4 runs) or 'fake' (fake liquidity: big numbers, no trades)
  P.spawn = function (og, wave) {
    const sim = this.game.sim, d = this.game.sys.director, r = sim.r;
    if (!d) return null;
    let fate, flip = false;
    if (wave === 'late') { flip = r() < 0.25; fate = flip ? (r() < 0.5 ? 'runner' : 'whale') : r() < 0.5 ? 'pnd' : 'rug'; }
    else { flip = r() < 0.06; fate = flip ? 'runner' : r() < 0.55 ? 'rug' : r() < 0.6 ? 'pnd' : 'doa'; }
    d.force = fate;
    const tk = sim.launch(); d.force = null;
    if (!tk) return null;
    // most vamps go up on a different launchpad than the OG
    const pads = BH.PADS || [], other = pads.filter((p) => p.id !== og.lp);
    if (other.length && r() < 0.7 && tk.realTok === 0) { const p = other[r.int(0, other.length - 1)]; tk.lp = p.id; tk.vSol = p.vSol; }
    lookLike(tk, og);
    tk.vampOf = og.id; tk.vampFlip = flip; tk.vampWave = wave;
    this.count++; if (flip) this.flips++;
    return tk;
  };

  // the name race: rename 1-4 young coins (launched in the last ~90 s, nobody you know holds them) to the runner's name
  P.race = function (og) {
    const sim = this.game.sim, r = sim.r, pl = this.game.player;
    const young = sim.tokens.filter((t) => t !== og && !t.dead && !t.isPlayer && !t.vampOf && !t.betaOf && t.fate2 !== 'mega' && og.born - t.born >= 0 && og.born - t.born < 90 && !(pl && pl.pos && pl.pos.has(t.id)) && !(t.trades || []).some((x) => x.you));
    let n = Math.min(young.length, r.int(1, 4));
    while (n-- > 0) {
      const t = young.splice(r.int(0, young.length - 1), 1)[0];
      lookLike(t, og); t.vampOf = og.id; t.vampWave = 'race';
      // the losers of the race fade out
      if (t.dir) { t.fate2 = r() < 0.7 ? 'doa' : t.fate2; }
      this.raced++;
    }
  };

  P.onStep = function () {
    const sim = this.game.sim, r = sim.r;
    for (const tk of sim.tokens) {
      if (tk.dead) continue;
      if (tk.fakeLiq) {
        tk.hype = Math.min(tk.hype, 0.02);
        if (sim.t >= tk.pullAt && tk.poolSol > 1) {
          // the dev pulls the liquidity: almost all SOL leaves the pool, anyone holding is stuck
          const k = tk.poolSol * tk.poolTok; tk.poolSol *= 0.015; tk.poolTok = k / tk.poolSol;
          tk.rugged = true; sim.stats.rugged++; tk.lastTrade = sim.t;
          sim.candle(tk, sim.mc(tk), 0, { side: 'sell', kind: 'dev' });
          sim.event('rug', tk, '$' + tk.ticker + ' (fake-liquidity vamp) pulled its pool: −98%');
        }
        continue;
      }
      // early and late vamps follow the OG for their first couple of minutes (people buy them thinking it's the same coin)
      if (tk.vampOf && tk.vampWave !== 'race' && tk.vampWave !== 'fake' && tk.dir && sim.t - tk.born < 150) {
        const og = sim.byId.get(tk.vampOf);
        if (og && !og.dead && og.mcHist && og.mcHist.length > 2) {
          const h = og.mcHist, ret = Math.log(h[h.length - 1] / h[h.length - 2]);
          if (isFinite(ret)) tk.dir.off = (tk.dir.off || 0) + ret * 0.6;
        }
      }
      const kind = this.kind(tk);
      if (!kind) continue;
      let st = this.drawn[tk.id];
      if (!st) {
        st = this.drawn[tk.id] = { kind, early: kind === 'mega' ? r.int(2, 5) : r.int(1, 2), late: kind === 'mega' ? r.int(2, 4) : r() < 0.4 ? 1 : 0, madeE: 0, madeL: 0, next: sim.t + r.range(5, 25), peakAt: null, fake: kind === 'mega' && r() < 0.6 };
        if (kind === 'mega') this.race(tk);
      }
      const mc = sim.mc(tk);
      if (!st.peak || mc > st.peak) { st.peak = mc; st.peakAt = sim.t; }
      if (sim.t < st.next) continue;
      // early vamps while it runs, late vamps once it has cooled off from its high
      if (st.madeE < st.early) {
        st.madeE++; st.next = sim.t + r.range(10, 40);
        const v = this.spawn(tk, 'early'); if (v) sim.event('launch', v, '$' + v.ticker + ' launched again on ' + (sim.cv(v).name || 'another pad') + ': a vamp (check the CA)');
      } else if (st.madeL < st.late && st.peakAt && sim.t - st.peakAt > 40 && mc < st.peak * 0.8) {
        st.madeL++; st.next = sim.t + r.range(15, 50);
        const v = this.spawn(tk, 'late'); if (v) sim.event('launch', v, '$' + v.ticker + ' vamp launched after the top. Some of these run on their own');
      } else if (st.fake && st.madeE >= st.early) {
        st.fake = false;
        const v = this.spawn(tk, 'fake');
        // fake liquidity: the dev seeds a DEX pool at the OG's market cap with deep liquidity, so the card looks like
        // the real thing; almost nobody trades it, and the dev pulls the pool a few minutes later
        if (v) {
          const C = BH.C, price = mc * r.range(0.8, 1.6) / (C.TOTAL_SUPPLY * C.SOL_USD), liqSol = mc * r.range(0.4, 0.75) / C.SOL_USD;
          v.stage = 'amm'; v.migratedAt = sim.t; v.poolSol = liqSol / 2; v.poolTok = v.poolSol / price;
          v.fakeLiq = true; v.pullAt = sim.t + r.range(60, 200); v.hype = 0.02; v.half = 4;
          if (v.dir) v.dir.done = true;
          v.plan = Object.assign(v.plan || {}, { done: true, graduates: false });
          v.athMc = sim.mc(v);
        }
      }
    }
    if (r() < 0.01) for (const id of Object.keys(this.drawn)) if (!sim.byId.get(id)) delete this.drawn[id];
  };

  // every live coin with this ticker; the OG is the one the crowd picked (most holders), not the first one launched
  P.family = function (tk) {
    const sim = this.game.sim, t = String(tk.ticker).toUpperCase();
    const list = sim.tokens.filter((x) => !x.dead && String(x.ticker).toUpperCase() === t);
    const score = (x) => (x.holders ? x.holders.size : 0) + (x.vampOf ? 0 : 5);
    const og = list.slice().sort((a, b) => score(b) - score(a))[0] || null;
    return { list: list.sort((a, b) => a.born - b.born), og };
  };
  P.afterTime = function () { };

  BH.Vamps = Vamps;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'vamps', create(game, saved) { const v = new Vamps(game, saved); v.hooks = { step: () => v.onStep() }; return v; } });
})(typeof window !== 'undefined' ? window : globalThis);
