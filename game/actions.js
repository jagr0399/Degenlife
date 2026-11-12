/* Things you do with your body: sleep (fast-forward), eat, look outside, side gigs. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;

  const Actions = {
    // runs the market for a number of game hours in 0.5 s steps
    fastForward(game, hours) {
      const sim = game.sim, p = game.player;
      const seconds = hours * C.GAME_HOUR_S;
      const steps = Math.ceil(seconds / 0.5);
      try {
        for (let i = 0; i < steps; i++) { sim.step(seconds / steps); p.tick(); }
      } catch (e) { if (g.degen) g.degen.log('fast-forward sim error: ' + e.message); }
      game.afterMarket(seconds);
    },
    // fast-forwards the market and the clock; returns an overnight summary
    sleep(game, hours) {
      hours = hours || C.SLEEP_HOURS;
      const sim = game.sim, p = game.player;
      const st0 = Object.assign({}, sim.stats), nw0 = p.netWorth();
      const ids0 = new Set(sim.tokens.map((t) => t.id));
      Actions.fastForward(game, hours);
      return Actions.wake(game, hours, st0, nw0, ids0);
    },
    // the same night, run in small slices between frames so the screen never freezes; onProgress(0..1) after each slice
    async sleepAsync(game, hours, onProgress) {
      hours = hours || C.SLEEP_HOURS;
      const sim = game.sim, p = game.player;
      const st0 = Object.assign({}, sim.stats), nw0 = p.netWorth();
      const ids0 = new Set(sim.tokens.map((t) => t.id));
      const seconds = hours * C.GAME_HOUR_S, steps = Math.ceil(seconds / 0.5), dt = seconds / steps;
      const now = () => (g.performance ? g.performance.now() : Date.now());
      let i = 0;
      while (i < steps) {
        const end = now() + 14;   // about one frame of work, then let the page draw
        try { while (i < steps && now() < end) { sim.step(dt); p.tick(); i++; } } catch (e) { if (g.degen) g.degen.log('sleep sim error: ' + e.message); break; }
        if (onProgress) onProgress(i / steps);
        await new Promise((res) => setTimeout(res, 0));
      }
      game.afterMarket(seconds);
      return Actions.wake(game, hours, st0, nw0, ids0);
    },
    wake(game, hours, st0, nw0, ids0) {
      const sim = game.sim, p = game.player;
      let biggest = null;
      for (const tk of sim.tokens) if (!ids0.has(tk.id) && (!biggest || tk.athMc > biggest.athMc)) biggest = tk;
      game.clock.advanceHours(hours);
      game.life.tick(hours, game.lifeOpts ? game.lifeOpts({ asleep: true }) : { asleep: true });
      game.afterTime();
      return {
        hours,
        pnlSol: p.netWorth() - nw0,
        launched: sim.stats.launched - st0.launched,
        rugged: sim.stats.rugged - st0.rugged,
        migrated: sim.stats.migrated - st0.migrated,
        biggestMover: biggest ? { ticker: biggest.ticker, athMc: biggest.athMc } : null,
      };
    },
    eat(game) {
      if (game.bills.eat(game.life)) return { ok: true, text: 'Ate a cold slice. Hunger down.' };
      return { ok: false, text: 'The fridge is empty. Restock it from the Bank tab on the laptop.' };
    },
    lookOutside(game) {
      if (game.lookedDay === game.clock.day) return { ok: false, text: 'The city looks the same as earlier.' };
      game.lookedDay = game.clock.day;
      game.life.bump('sanity', 5);
      return { ok: true, text: 'You stare at the city for a while. Sanity +5' };
    },
    sideGig(game) {
      if (game.life.energy < 25) return { ok: false, text: 'Too tired to work a shift. Sleep first.' };
      const h = C.SIDE_GIG_HOURS;
      Actions.fastForward(game, h);
      game.clock.advanceHours(h);
      game.life.tick(h, {});
      game.life.bump('energy', -4);
      game.bills.earn(C.SIDE_GIG_PAY, 'Side gig');
      game.afterTime();
      return { ok: true, text: 'Did a ' + h + '-hour delivery shift: +$' + C.SIDE_GIG_PAY + '. The market kept moving.' };
    },
  };
  BH.Actions = Actions;
})(typeof window !== 'undefined' ? window : globalThis);
