/* The one game object: the market (sim + player), the clock, life stats, bills, drawings and where you stand.
   No DOM here; the 3D world and the terminal read it and call tickReal() every frame. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;

  function createGame() {
    const handlers = {};
    const game = {
      sim: null, player: null, clock: null, life: null, bills: null,
      speed: 1, lastSpeed: 1, modalOpen: false, run: { mode: 'life', market: 'arcade' },
      seated: false, drawings: {}, world: null, closedSeen: 0, rugsSeen: 0, lastDay: 1,

      on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); },
      emit(evt, data) { for (const fn of handlers[evt] || []) { try { fn(data); } catch (e) { if (g.degen) g.degen.log('handler ' + evt + ': ' + e.message); } } },

      // ---- v1.0 terminal compatibility (UI.init(game) uses these) ----
      setSpeed(s) { if (s) this.lastSpeed = s; this.speed = s; },
      resume() { this.setSpeed(this.lastSpeed || 1); },
      loadRuns() { return []; },
      confirmEnd() { this.emit('menu'); },
      confirmNew() { this.emit('menu'); },
      exitScreen() { this.emit('exitScreen'); },
      elapsed() { return this.sim ? this.sim.t - (this.sim.t0 || 0) : 0; },

      newGame(seed, opts) {
        this.sim = new BH.Sim({ mode: 'arcade', seed: seed || ((Date.now() & 0x7fffffff) || 1) });
        this.player = new BH.Player(this.sim);
        this.clock = new BH.Clock(9);
        this.life = new BH.Life();
        this.bills = new BH.Bills(this.clock);
        this.drawings = {}; this.world = null;
        this.meta = Object.assign({ place: 'bedroom', prestige: 0, perks: [], tutorial: true }, (opts && opts.meta) || {});
        this.flags = {};
        this.attachSystems(null);
        for (let i = 0; i < 600; i++) this.sim.step(0.25);   // ~2.5 min of history so the feed isn't empty
        this.sim.t0 = this.sim.t; this.player.startT = this.sim.t;
        this.closedSeen = 0; this.rugsSeen = 0; this.lastDay = this.clock.day;
        this.speed = 1;
      },

      start(saveObj) {
        if (!saveObj) { this.newGame(); return 'new'; }
        const s = BH.SaveCodec.decode(saveObj);
        this.sim = s.sim; this.player = s.player;
        const gs = s.game || {};
        this.clock = new BH.Clock(0); this.clock.total = gs.clock || 9;
        this.life = Object.assign(new BH.Life(), gs.life || {});
        this.bills = new BH.Bills(this.clock);
        Object.assign(this.bills, gs.bills || {}, { clock: this.clock, events: [] });
        this.drawings = gs.drawings || {};
        this.world = gs.world || null;
        this.meta = Object.assign({ place: 'bedroom', prestige: 0, perks: [], tutorial: false }, gs.meta || {});
        this.attachSystems(gs.sys || null);
        this.closedSeen = this.player.closed.length; this.rugsSeen = this.player.st.rugs; this.lastDay = this.clock.day;
        this.speed = 1;
        return 'loaded';
      },

      serialize() {
        const b = this.bills;
        return BH.SaveCodec.encode({
          sim: this.sim, player: this.player,
          game: {
            clock: this.clock.total,
            life: { energy: this.life.energy, hunger: this.life.hunger, sanity: this.life.sanity },
            bills: { cash: b.cash, debt: b.debt, meals: b.meals, rentDueDay: b.rentDueDay, powerDay: b.powerDay, missed: b.missed, log: b.log, rent: b.rent },
            drawings: this.drawings, world: this.world, meta: this.meta,
            sys: Object.fromEntries(Object.entries(this.sys || {}).map(([k, v]) => [k, v.save ? v.save() : null])),
          },
        });
      },

      // stage 2-6 systems (social, orders, build, factory, firm, pad, world events, tutorial) register in BH.Systems.
      // Each gets create(game, savedState) -> { save(), hooks: {launch, launchMine, trade, fee, step}, tickReal(dt), afterTime() }
      // gear and perks change how your body ticks
      lifeOpts(extra) {
        const e = this.sys && this.sys.build ? this.sys.build.effects() : {};
        const perks = (this.meta && this.meta.perks) || [];
        this.life.focusBonus = Math.min(20, e.focus || 0);
        return Object.assign({ seated: this.seated, seatedSave: e.seatedDrain || 0, sleepBonus: e.sleep || 0, drainMul: perks.includes('stamina') ? 0.75 : 1 }, extra || {});
      },
      attachSystems(saved) {
        this.sys = {};
        for (const def of BH.Systems || []) this.sys[def.name] = def.create(this, saved ? saved[def.name] : null);
        const list = Object.values(this.sys);
        const each = (k) => { const fns = list.map((x) => x.hooks && x.hooks[k]).filter(Boolean); return fns.length ? (...a) => { for (const fn of fns) fn(...a); } : null; };
        this.sim.hooks = { launch: each('launch'), launchMine: each('launchMine'), trade: each('trade'), fee: each('fee'), step: each('step') };
      },

      // advance the market (real seconds) and everything that hangs off game time
      tickReal(dt) {
        if (!this.sim || !this.speed || this.modalOpen) return;
        dt *= this.warp || 1;   // side gigs fast-forward time (the market keeps moving)
        const n = Math.max(1, Math.ceil(dt / 0.5));
        try {
          for (let i = 0; i < n; i++) { this.sim.step(dt / n); this.player.tick(); }
        } catch (e) {
          if (g.degen) g.degen.log('sim error: ' + (e.stack || e.message));
          this.setSpeed(0);
          this.emit('toast', { kind: 'error', text: 'The market hit an error and paused. Press Esc → Resume to try again.' });
          return;
        }
        this.afterMarket(dt);
        for (const x of Object.values(this.sys || {})) if (x.tickReal) x.tickReal(dt);
        this.clock.advance(dt);
        this.life.tick(dt / C.GAME_HOUR_S, this.lifeOpts());
        this.afterTime();
      },

      // toasts + life reactions to what the market did
      afterMarket(dt) {
        const p = this.player, sim = this.sim;
        p.extraDelay = this.meta && (this.meta.perks || []).includes('fastpc') ? 0 : this.life.orderDelayBlocks();
        sim.results.splice(0);
        for (const nt of p.notices.splice(0)) this.emit('toast', nt);
        const fresh = p.closed.length - this.closedSeen;
        for (let i = fresh - 1; i >= 0; i--) this.life.onClose(p.closed[i].pnl);
        this.closedSeen = p.closed.length;
        while (this.rugsSeen < p.st.rugs) { this.rugsSeen++; this.life.onRug(); }
        const ev = sim.events;
        for (let i = ev.length - 1; i >= 0 && ev[i].t > sim.t - dt - 1e-9; i--) {
          const e = ev[i];
          if (e._toasted) continue;
          e._toasted = true;
          if ((e.type === 'call' || e.type === 'migrate' || e.type === 'devsold') && p.pos.has(e.id) && !e.you) this.emit('toast', { kind: e.type === 'call' ? 'call' : 'info', text: e.text, id: e.id });
        }
      },
      afterTime() {
        for (const x of Object.values(this.sys || {})) if (x.afterTime) x.afterTime();
        this.bills.tick();
        for (const e of this.bills.events.splice(0)) this.emit('toast', e);
        if (this.clock.day !== this.lastDay) { this.lastDay = this.clock.day; this.emit('day', this.clock.day); }
      },
    };
    return game;
  }
  BH.Systems = BH.Systems || [];
  BH.createGame = createGame;
})(typeof window !== 'undefined' ? window : globalThis);
