/* Real coin names, tickers and pictures from GeckoTerminal's newest Solana pools (refreshed every 30 s).
   New coins in the game take the next one from the queue. Pictures that fail to load fall back to the ticker's first letter.
   Optional banner art: Dexscreener token profiles, Solana only. Turn off in Settings ("Real coin data"). */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const SAFE_IMG = /^https:\/\/[^\s"'<>()]+$/;   // no quotes or brackets: safe inside src="..."
  const clean = () => true;   // real coin names stay exactly as they are on-chain; no filter
  const R = {
    clean,
    queue: [], pool: [], seen: new Set(), banners: {}, on: true, last: 0, errors: 0,
    async refresh() {
      if (!this.on || !g.degen || !g.degen.fetchJson) return;
      this.last = Date.now();
      const r = await g.degen.fetchJson('https://api.geckoterminal.com/api/v2/networks/solana/new_pools?include=base_token');
      if (!r || !r.ok || !r.json) { this.errors++; if (g.degen.log && this.errors < 4) g.degen.log('realcoins: fetch failed ' + JSON.stringify(r).slice(0, 200)); return; }
      const toks = {}; for (const inc of r.json.included || []) if (inc.type === 'token') toks[inc.id] = inc.attributes;
      for (const p of r.json.data || []) {
        const rel = p.relationships && p.relationships.base_token && p.relationships.base_token.data;
        const t = rel && toks[rel.id]; if (!t || this.seen.has(t.address)) continue;
        this.seen.add(t.address);
        const sym = String(t.symbol || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase();
        const name = String(t.name || '').replace(/[\u0000-\u001f]/g, '').slice(0, 32).trim();
        if (!sym || !name || !clean(sym) || !clean(name)) continue;   // offensive name: skip the coin
        const img = t.image_url && /^https:\/\/[^\s"'<>()]+$/.test(t.image_url) && !/missing/.test(t.image_url) ? t.image_url : null;   // no quotes or brackets: safe inside src="..."
        const c = { name, ticker: sym, img, mint: t.address };   // (pool entries are re-checked on load)
        if (this.pool.some((p) => p.ticker === sym)) continue;   // one coin per ticker (real copycats share them)
        this.queue.push(c); this.pool.push(c);
      }
      this.reskin();
      if (this.pool.length > 400) this.pool.splice(0, this.pool.length - 400);
      this.store();
      if (this.queue.length > 120) this.queue.splice(0, this.queue.length - 120);
      // banner art (optional): Solana profiles only
      const d = await g.degen.fetchJson('https://api.dexscreener.com/token-profiles/latest/v1');
      if (d && d.ok && Array.isArray(d.json)) for (const x of d.json) if (x.chainId === 'solana' && x.header && /^https:\/\//.test(x.header)) this.banners[x.tokenAddress] = x.header;
    },
    // fresh pools first; when the game launches faster than real pools appear, reuse a real coin seen before (never the made-up names)
    // give a real coin's name, ticker and picture to a game coin
    apply(tk, real) { tk.name = real.name; tk.ticker = real.ticker; tk.realImg = real.img; if (!real.img) tk.img = null; tk.realMint = real.mint; tk.banner = this.banners[real.mint] || null; },
    // once per world (new game, loaded save, menu): coins already on screen get real names too,
    // except coins you launched yourself
    reskin() {
      const game = this.game && this.game(); if (!this.on || !game || !game.sim || this.reskinned === game.sim || !this.pool.length) return;
      this.reskinned = game.sim;   // remember which world was done (the menu builds a throwaway one before Continue loads yours)
      const used = new Set(game.sim.tokens.filter((t) => !t.dead && t.realMint).map((t) => t.ticker));
      // newest coins first, so the ones on screen get fresh names before old pool repeats
      for (const tk of game.sim.tokens.slice().reverse()) {
        if (tk.dead || (tk.realMint && clean(tk.name) && clean(tk.ticker)) || tk.style || tk.devAddr === 'YOU' || tk.custom) continue;   // only coins you launched keep their own names; offensive real names in an old save get replaced
        const real = this.next(used); if (real) { this.apply(tk, real); used.add(real.ticker); }
      }
    },
    next(avoid) {
      if (!this.on) return null;
      const game = this.game && this.game(), live = avoid || new Set(game && game.sim ? game.sim.tokens.filter((t) => !t.dead).map((t) => t.ticker) : []);
      // fresh pools first (skipping any already on screen), then reuse one that is not on screen right now (no twin coins side by side)
      while (this.queue.length) { const q = this.queue.shift(); if (!live.has(q.ticker)) return q; }
      if (!this.pool.length) return null;
      let c = null;
      for (let i = 0; i < 40 && (!c || live.has(c.ticker)); i++) c = this.pool[Math.floor(Math.random() * this.pool.length)];
      return Object.assign({}, c);
    },
    store() { try { localStorage.setItem('degen.realcoins', JSON.stringify(this.pool.slice(-400))); } catch (e) { /* storage blocked: fine */ } },
    load() { try { const p = JSON.parse(localStorage.getItem('degen.realcoins') || '[]'); if (Array.isArray(p)) for (const c of p) if (c && c.name && c.ticker && clean(c.name) && clean(c.ticker) &&(!c.img || SAFE_IMG.test(c.img)) && !this.pool.some((p) => p.ticker === c.ticker)) { this.pool.push(c); this.seen.add(c.mint); } } catch (e) { /* none saved */ } },
    start() { this.load(); this.reskin(); this.refresh(); setInterval(() => this.refresh(), 30000); },
  };
  BH.RealCoins = R;
})(window);
