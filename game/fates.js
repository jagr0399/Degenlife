/* New coin types from the Nov 10, 2026 pump.fun study (docs/research/2026-11-11-pumpfun-nov10-study.md):
   whale ladder pumps, instant bonders, slow runners (some with a late rug), wash-traded fakes, and copycat launches.
   A coin picked for one of these styles gets its own script here; the core dev script skips it. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;
  // the template director (game/director.js) now shapes every coin; these scripted styles only run when forced (tests)
  const STYLES = { whale: 0, instant: 0, slowRunner: 0, washed: 0 };

  function Fates(game, saved) {
    this.game = game; this.copy = null; this.copied = {}; this.counts = { whale: 0, instant: 0, slowRunner: 0, washed: 0, copycat: 0 };
    this.force = null;   // tests: force the next launch's style
    if (saved) Object.assign(this, saved, { game, force: null });
  }
  const P = Fates.prototype;
  Fates.STYLES = STYLES;
  P.save = function () { return { copy: this.copy, copied: this.copied, counts: this.counts }; };

  P.onLaunch = function (tk, r) {
    const dir = this.game.sys && this.game.sys.director, pending = dir && (dir.force || dir.forceOnce);
    if (!this.force && !pending && this.copy && this.copy.left > 0) {   // a copycat of a coin that just ran (never a coin whose fate was forced)
      tk.name = this.copy.name; tk.ticker = this.copy.ticker; tk.copyOf = this.copy.id; tk.narrative = this.copy.narrative || tk.narrative;
      this.copy.left--; this.counts.copycat++;
      if (this.copy.left <= 0) this.copy = null;
      return;
    }
    let style = this.force;
    if (!style) { let x = r(); for (const [k, p] of Object.entries(STYLES)) { if ((x -= p) < 0) { style = k; break; } } }
    if (style) { tk.style = style; this.counts[style]++; }
  };

  // first step a styled coin is seen: take it over from the core dev script
  P.setup = function (tk) {
    const r = this.game.sim.r, pl = tk.plan;
    tk.fate = 'x-' + tk.style; pl.graduates = tk.style === 'instant' || tk.style === 'slowRunner';
    tk.s = { t0: this.game.sim.t, mc0: Math.max(3000, this.game.sim.mc(tk)) };
    const S = tk.s;
    if (tk.style === 'whale') {
      S.whales = []; const n = r() < 0.35 ? 2 : 1;
      for (let i = 0; i < n; i++) S.whales.push({ addr: BH.Names.addr(r), steps: r.int(4, 14), done: 0, next: this.game.sim.t + r.range(8, 40), chunks: r.int(6, 19), sold: 0, selling: false });
      S.target = S.mc0 * r.range(6, 25);
      tk.hype = Math.max(tk.hype, 0.9);
    }
    if (tk.style === 'instant') {
      S.group = []; const n = r.int(5, 10);
      for (let i = 0; i < n; i++) S.group.push({ addr: BH.Names.addr(r), at: this.game.sim.t + r.range(2, 70), sol: r.range(3, 9), done: false });
      S.dumpAfter = r.range(25, 150);   // seconds after migration
      tk.hype = Math.max(tk.hype, 2.2); tk.half = Math.max(tk.half, 60);
    }
    if (tk.style === 'slowRunner') {
      S.target = r.range(250000, 2500000); S.lateRug = r() < 0.5;
      S.insiders = []; for (let i = 0; i < r.int(3, 6); i++) S.insiders.push({ addr: BH.Names.addr(r), sol: r.range(1, 4), done: false });
      tk.half = 120;
    }
    if (tk.style === 'washed') {
      S.bot = BH.Names.addr(r); S.size = r.range(4, 14); S.pullAt = this.game.sim.t + r.range(180, 600);
      tk.hype = Math.min(tk.hype, 0.5);
    }
  };

  P.onStep = function (dt) {
    const sim = this.game.sim, r = sim.r;
    for (const tk of sim.tokens) {
      if (!tk.style || tk.dead || tk.isPlayer) continue;
      if (!tk.s) this.setup(tk);
      const S = tk.s, mc = sim.mc(tk), age = sim.t - tk.born;
      if (S.over) continue;

      if (tk.style === 'whale') {
        // whales ladder in as the price climbs (each step about 1-6% of MC), retail follows; then they sell in chunks
        for (const w of S.whales) {
          if (!w.selling && w.done < w.steps && sim.t >= w.next) {
            const sol = Math.min(45, Math.max(0.8, mc * r.range(0.01, 0.06) / C.SOL_USD));
            if (sim.exec(tk, w.addr, 'whale', 'buy', sol)) { w.done++; tk.hype += r.range(0.25, 0.6); }
            w.next = sim.t + r.range(6, 45);
          }
          if (!w.selling && (w.done >= w.steps || mc >= S.target)) { w.selling = true; w.next = sim.t + r.range(5, 30); }
          if (w.selling && sim.t >= w.next) {
            const h = tk.holders.get(w.addr);
            if (h && h.tokens > 1) { const left = w.chunks - w.sold; sim.exec(tk, w.addr, 'whale', 'sell', left <= 1 ? h.tokens : h.tokens / left * r.range(0.7, 1.3)); w.sold++; tk.hype *= 0.85; }
            w.next = sim.t + r.range(3, 14);
          }
        }
        if (S.whales.every((w) => w.selling && !(tk.holders.get(w.addr) || {}).tokens)) { S.over = true; tk.half = 18; tk.hype *= 0.5; sim.event('news', tk, 'Whales finished selling $' + tk.ticker); }
      }

      if (tk.style === 'instant') {
        // a coordinated group buys hard right after launch: huge 1-min candles, graduation within minutes
        for (const b of S.group) if (!b.done && sim.t >= b.at && tk.stage === 'curve') { b.done = true; sim.exec(tk, b.addr, 'insider', 'buy', b.sol); }
        if (tk.stage === 'curve') tk.hype = Math.max(tk.hype, 2.0);
        if (tk.stage === 'amm' && tk.migratedAt != null && sim.t - tk.migratedAt > S.dumpAfter) {
          sim.dumpGroup(tk, ['insider', 'dev', 'bundler'], 1);
          tk.hype *= 0.1; tk.half = 6; tk.rugged = true; S.over = true; sim.stats.rugged++;
          sim.event('rug', tk, '$' + tk.ticker + ' instant bond, instant dump');
        }
        if (tk.stage === 'curve' && age > 400) { S.over = true; tk.half = 10; }
      }

      if (tk.style === 'slowRunner') {
        // steady grind: dips get bought, hype never quite dies until the target
        for (const s of S.insiders) if (!s.done && age > 3) { s.done = true; sim.exec(tk, s.addr, 'insider', 'buy', s.sol); }
        if (mc < S.target) {
          tk.hype = Math.max(tk.hype, 0.95 + Math.min(1.2, age / 900));
          const h = tk.mcHist; if (h.length > 10 && mc < h[0] * 0.85 && r() < 0.5 * dt) tk.hype += r.range(0.3, 0.9);   // dip buyers
        } else if (S.lateRug) {
          sim.dumpGroup(tk, ['insider', 'dev', 'bundler'], 1);
          tk.hype *= 0.05; tk.half = 5; tk.rugged = true; S.over = true; sim.stats.rugged++;
          sim.event('rug', tk, '$' + tk.ticker + ' late rug after a long run');
        } else { S.over = true; tk.half = 45; sim.event('ath', tk, '$' + tk.ticker + ' slow runner topped out at ' + BH.fmt.usd(mc)); }
      }

      if (tk.style === 'washed') {
        // huge matched volume from one bot, tiny price moves, few real wallets; then the dev pulls everything
        const n = r.poisson(3 * dt);
        // real wash bots keep each print small next to the liquidity (MONTRA never moved more than about 6% a minute)
        const liq = tk.stage === 'curve' ? tk.vSol : (tk.poolSol || 30), size = Math.max(0.05, liq * 0.012);
        for (let i = 0; i < n * 3; i++) { const f = sim.exec(tk, S.bot, 'bot', 'buy', size * r.range(0.7, 1.3)); if (f) sim.exec(tk, S.bot, 'bot', 'sell', f.tok); }
        if (sim.t >= S.pullAt) {
          sim.dumpGroup(tk, ['dev', 'bundler', 'insider', 'sniper'], 1);
          tk.hype *= 0.05; tk.half = 5; tk.rugged = true; S.over = true; sim.stats.rugged++;
          sim.event('rug', tk, '$' + tk.ticker + ' rugged: the volume was fake');
        }
      }
    }
    // copycats: a coin that runs hard gets 1-3 same-name launches within minutes
    if (!this.copy) {
      for (const tk of sim.tokens) {
        if (tk.dead || tk.copyOf || this.copied[tk.ticker] || tk.isPlayer) continue;
        const mc = sim.mc(tk), h = tk.mcHist;
        if (mc > 30000 && h.length > 20 && mc > h[0] * 2.5) {
          this.copied[tk.ticker] = 1;
          this.copy = { id: tk.id, name: tk.name, ticker: tk.ticker, narrative: tk.narrative, left: r.int(1, 3) };
          sim.nextLaunch = Math.min(sim.nextLaunch, sim.t + r.range(5, 40));
          break;
        }
      }
    }
  };
  BH.Fates = Fates;
  BH.Systems = BH.Systems || [];
  // registered right after 'social' so its launch hook sees the themed name first
  const def = { name: 'fates', create(game, saved) { const f = new Fates(game, saved); f.hooks = { launch: (tk, r) => f.onLaunch(tk, r), step: (dt) => f.onStep(dt) }; return f; } };
  const i = BH.Systems.findIndex((s) => s.name === 'social');
  if (i >= 0) BH.Systems.splice(i + 1, 0, def); else BH.Systems.push(def);
})(typeof window !== 'undefined' ? window : globalThis);
