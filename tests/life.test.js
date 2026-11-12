const test = require('node:test');
const assert = require('node:assert');
const { load, CORE } = require('./helpers');
const BH = load(...CORE, 'game/clock.js', 'game/life.js', 'game/bills.js');
const C = BH.C;

test('clock_minute_is_hour', () => {
  const c = new BH.Clock(9);
  c.advance(60);
  assert.ok(Math.abs(c.hour - 10) < 1e-9);
  assert.strictEqual(c.day, 1);
  c.advance(60 * 15);
  assert.strictEqual(c.day, 2);
  assert.ok(Math.abs(c.hour - 1) < 1e-9);
  assert.strictEqual(c.label(), 'Day 2 · 01:00');
  assert.strictEqual(c.isNight(), true);
});

test('energy_drains_faster_seated', () => {
  const a = new BH.Life(), b = new BH.Life();
  a.tick(1, {}); b.tick(1, { seated: true });
  assert.strictEqual(a.energy, 96);
  assert.strictEqual(b.energy, 94);
});

test('sleep_restores', () => {
  const l = new BH.Life(); l.energy = 20;
  l.tick(8, { asleep: true });
  assert.strictEqual(l.energy, 100);
});

test('focus_from_energy_and_hunger', () => {
  const l = new BH.Life(); l.energy = 70; l.hunger = 50; l.sanity = 50;
  assert.strictEqual(l.focus, 50);
  l.hunger = 10;
  assert.strictEqual(l.focus, 70);
  l.sanity = 90;
  assert.strictEqual(l.focus, 75);
});

test('low_focus_adds_block', () => {
  const l = new BH.Life(); l.energy = 25; l.hunger = 0; l.sanity = 50;
  assert.strictEqual(l.orderDelayBlocks(), 1);
  l.energy = 80;
  assert.strictEqual(l.orderDelayBlocks(), 0);
});

test('eat_needs_meals', () => {
  const l = new BH.Life(), c = new BH.Clock(9), b = new BH.Bills(c);
  b.meals = 0; l.hunger = 80;
  assert.strictEqual(b.eat(l), false);
  b.meals = 1;
  assert.strictEqual(b.eat(l), true);
  assert.strictEqual(l.hunger, 40);
  assert.strictEqual(b.meals, 0);
});

test('rent_charged_weekly', () => {
  const c = new BH.Clock(9), b = new BH.Bills(c);
  b.cash = 1000;
  c.advance(C.GAME_HOUR_S * 24 * 6); b.tick();
  const beforeRent = b.cash;
  c.advance(C.GAME_HOUR_S * 24); b.tick(); b.tick();
  assert.strictEqual(c.day, 8);
  assert.strictEqual(beforeRent - b.cash, C.RENT_BEDROOM + C.POWER_PER_DAY);
  assert.strictEqual(b.rentDueDay, 15);
});

test('rent_short_becomes_debt', () => {
  const c = new BH.Clock(9), b = new BH.Bills(c);
  b.cash = 100;
  c.advance(C.GAME_HOUR_S * 24 * 7); b.tick();
  assert.ok(b.cash >= 0);
  assert.strictEqual(b.cash, 0);
  assert.ok(b.debt >= 200);
  assert.strictEqual(b.evictionLevel(), 1);
  assert.strictEqual(b.pay(50), false);
  b.cash = 60;
  assert.strictEqual(b.payDebt(), 60);
  assert.strictEqual(b.evictionLevel(), 1);
});

test('side_gig_always_pays', () => {
  const c = new BH.Clock(9), b = new BH.Bills(c), l = new BH.Life();
  b.cash = 0;
  b.sideGig(l, c);
  assert.strictEqual(b.cash, C.SIDE_GIG_PAY);
  assert.strictEqual(l.energy, 80);
  assert.ok(Math.abs(c.hour - 13) < 1e-9);
});

test('side_gig_pays_debt_first', () => {
  const c = new BH.Clock(9), b = new BH.Bills(c), l = new BH.Life();
  b.cash = 0; b.debt = 50;
  b.sideGig(l, c);
  assert.strictEqual(b.debt, 0);
  assert.strictEqual(b.cash, C.SIDE_GIG_PAY - 50);
});

test('bank_conversion', () => {
  const sim = new BH.Sim({ seed: 1 }), p = new BH.Player(sim), c = new BH.Clock(9), b = new BH.Bills(c);
  const sol0 = p.sol, cash0 = b.cash;
  assert.strictEqual(BH.Bank.toCash(p, b, 1), true);
  assert.strictEqual(p.sol, sol0 - 1);
  assert.strictEqual(b.cash, cash0 + BH.C.SOL_USD);   // 1 SOL at the current SOL price
  assert.strictEqual(BH.Bank.toCash(p, b, 999), false);
  assert.strictEqual(BH.Bank.toSol(p, b, BH.C.SOL_USD), true);
  assert.strictEqual(p.sol, sol0);
  assert.strictEqual(BH.Bank.toSol(p, b, 1e9), false);
});
