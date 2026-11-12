/* Game clock: 1 real minute = 1 game hour (C.GAME_HOUR_S). Days start at 1. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  function Clock(startHour) { this.total = startHour != null ? startHour : 9; } // game hours since day 1, 00:00
  const P = Clock.prototype;
  Object.defineProperty(P, 'day', { get() { return Math.floor(this.total / 24 + 1e-9) + 1; } });
  Object.defineProperty(P, 'hour', { get() { const h = this.total - (this.day - 1) * 24; return h < 0 ? 0 : h; } });
  P.advance = function (realS) { this.total += realS / BH.C.GAME_HOUR_S; };
  P.advanceHours = function (h) { this.total += h; };
  P.label = function () {
    const h = this.hour, hh = Math.floor(h + 1e-9), mm = Math.floor((h - hh) * 60 + 1e-6);
    return 'Day ' + this.day + ' · ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  };
  P.isNight = function () { const h = this.hour; return h >= 20 || h < 6; };
  BH.Clock = Clock;
})(typeof window !== 'undefined' ? window : globalThis);
