/* Day Trading was removed (Nov 16, 2026: playtester has a separate day trading game, Bagholder: Prop Desk).
   game/daytrade.js and apps/terminal/daytrade-ui.js stay in the repo but are no longer loaded. This stand-in keeps old saves fair:
   any stock position left open in a save is closed at its entry price, so the cash in it comes back (shorts give back what they
   borrowed). After that the day trading data is dropped from the save. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  BH.Systems = BH.Systems || [];
  BH.Systems.push({
    name: 'daytrade',
    create(game, saved) {
      let pending = saved && saved.pos && Object.keys(saved.pos).length ? saved.pos : null;
      const sys = {
        retired: true,
        save() { return null; },
        settle() {
          if (!pending || !game.bills) return 0;
          let back = 0; for (const p of Object.values(pending)) if (p && p.sh && p.avg > 0) back += p.sh * p.avg;
          pending = null;
          game.bills.cash += back;
          if (back && game.emit) game.emit('toast', { kind: 'info', text: 'Day Trading was removed: your open stock positions were closed at their entry price ($' + Math.round(back).toLocaleString() + ' back to cash).' });
          return back;
        },
      };
      sys.hooks = { step: () => { if (pending) sys.settle(); } };
      return sys;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
