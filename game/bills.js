/* Real-world money (USD cash), rent, power, food, debt, side gigs, and the SOL<->cash bank. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;
  function Bills(clock) {
    this.clock = clock;
    this.cash = C.START_CASH; this.debt = 0; this.meals = 3;
    this.rentDueDay = 1 + C.RENT_EVERY_DAYS;
    this.powerDay = clock.day;
    this.missed = 0;
    this.log = [];            // {day, what, usd}
    this.events = [];         // for the game to toast: {kind, text}
  }
  const P = Bills.prototype;
  P.charge = function (usd, what) {
    this.log.push({ day: this.clock.day, what, usd: -usd });
    if (this.log.length > 200) this.log.splice(0, this.log.length - 200);
    if (this.cash >= usd) { this.cash -= usd; return true; }
    this.debt += usd - this.cash; this.cash = 0;
    return false;
  };
  P.tick = function () {
    const day = this.clock.day;
    while (this.powerDay < day) { this.powerDay++; this.charge(C.POWER_PER_DAY, 'Power'); }
    while (day >= this.rentDueDay) {
      const ok = this.charge(this.rent || C.RENT_BEDROOM, 'Rent');
      this.rentDueDay += C.RENT_EVERY_DAYS;
      if (!ok) { this.missed++; this.events.push({ kind: 'bad', text: this.missed >= 2 ? 'Rent missed again. Eviction warning!' : 'Rent short: $' + Math.round(this.debt) + ' in debt' }); }
      else this.events.push({ kind: 'info', text: 'Rent paid: $' + (this.rent || C.RENT_BEDROOM) });
    }
  };
  P.pay = function (usd) { if (!(usd > 0) || usd > this.cash + 1e-9) return false; this.cash -= usd; return true; };
  P.payDebt = function () {
    const amt = Math.min(this.cash, this.debt);
    this.cash -= amt; this.debt -= amt;
    if (this.debt <= 1e-9) { this.debt = 0; this.missed = 0; }
    return amt;
  };
  P.earn = function (usd, what) {
    this.log.push({ day: this.clock.day, what, usd });
    this.cash += usd;
    if (this.debt > 0) this.payDebt();
  };
  P.eat = function (life) { if (this.meals <= 0) return false; this.meals--; life.eat(); return true; };
  P.restockFridge = function () { if (!this.pay(C.FRIDGE_RESTOCK)) return false; this.meals += C.FRIDGE_MEALS; return true; };
  P.sideGig = function (life, clock) {
    this.earn(C.SIDE_GIG_PAY, 'Side gig');
    life.bump('energy', -20);
    (clock || this.clock).advanceHours(C.SIDE_GIG_HOURS);
  };
  P.evictionLevel = function () { return Math.min(2, this.missed); };
  BH.Bills = Bills;

  BH.Bank = {
    toCash(player, bills, sol) {
      if (!(sol > 0) || sol > player.sol + 1e-9) return false;
      player.sol -= sol; bills.earn(sol * C.SOL_USD, 'Cash out');
      return true;
    },
    toSol(player, bills, usd) {
      if (!bills.pay(usd)) return false;
      player.sol += usd / C.SOL_USD;
      return true;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
