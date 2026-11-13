/* Stage 3: the shop, deliveries, owned gear with real bonuses, and the places you can lease or buy. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};

  const PLACES = {
    bedroom: { name: 'Bedroom', rent: 300, deposit: 0, needUsd: 0, kind: 'home', desc: 'Where it starts. A mattress, a laptop and a dream.' },
    apartment: { name: 'Apartment', rent: 700, deposit: 2000, needUsd: 4000, kind: 'home', desc: 'Real desk, room for monitors, and the dev desk for launching your own coins.' },
    office: { name: 'Office floor', rent: 1500, deposit: 6000, needUsd: 20000, kind: 'work', desc: 'Desks for hired traders. Run a trading firm.' },
    tower: { name: 'The Tower', rent: 4000, deposit: 25000, needUsd: 75000, kind: 'work', desc: 'A server room, a billboard and your own launchpad.' },
    street: { name: 'Street', rent: 0, deposit: 0, needUsd: 0, kind: 'out', desc: 'Coffee, the park, the gym and the news kiosk.' },
  };
  // effect keys: screens (+charts), focus (flat), seatedDrain (energy/h saved while seated), sanityDay, sleep (energy/h), desks, racks, coffee, devdesk
  const CATALOG = [
    { id: 'monitor', name: 'Second monitor', price: 250, place: 'apartment', max: 3, effect: { screens: 1, focus: 2 }, desc: 'Watch another chart. +2 focus each.' },
    { id: 'chair', name: 'Gaming chair', price: 180, place: 'any', max: 1, effect: { seatedDrain: 2 }, desc: 'Trading drains energy slower.' },
    { id: 'pc', name: 'Fast PC', price: 900, place: 'apartment', max: 1, effect: { focus: 8 }, desc: 'Snappier everything. +8 focus.' },
    { id: 'coffee', name: 'Coffee machine', price: 120, place: 'any', max: 1, effect: { coffee: 1 }, desc: 'Use it for +25 focus energy, once every 4 hours.' },
    { id: 'plant', name: 'Plant', price: 40, place: 'any', max: 4, effect: { sanityDay: 2 }, desc: '+2 sanity a day each. It needs nothing from you.' },
    { id: 'rgb', name: 'RGB light strip', price: 60, place: 'any', max: 2, effect: { sanityDay: 1, focus: 1 }, desc: 'Vibes. +1 sanity a day, +1 focus.' },
    { id: 'bed', name: 'Real bed', price: 300, place: 'apartment', max: 1, effect: { sleep: 3 }, desc: 'Sleep restores energy faster.' },
    { id: 'devdesk', name: 'Dev desk', price: 600, place: 'apartment', max: 1, effect: { devdesk: 1 }, desc: 'Launch, shill and (maybe) rug your own coins.' },
    { id: 'desk', name: 'Trader desk', price: 400, place: 'office', max: 8, effect: { desks: 1 }, desc: 'One hired trader per desk.' },
    { id: 'rack', name: 'Server rack', price: 2500, place: 'tower', max: 8, effect: { racks: 1 }, desc: 'Each rack hosts 8 live coins on your launchpad.' },
    { id: 'cooling', name: 'Server cooling', price: 1500, place: 'tower', max: 2, effect: { cooling: 1 }, desc: 'Fewer outages when the racks run hot.' },
    // physical furniture and decor (real 3D models in the room, Nov 12)
    { id: 'tv', name: 'TV + cabinet', price: 350, place: 'any', max: 1, effect: { sanityDay: 2 }, desc: 'A TV on a drawer cabinet. Charts on the big screen. +2 sanity a day.' },
    { id: 'console', name: 'Game console', price: 250, place: 'any', max: 1, effect: { sanityDay: 2 }, desc: 'Sits under the TV with a gamepad. Touch grass, digitally. +2 sanity a day.' },
    { id: 'shelf', name: 'Bookshelf', price: 110, place: 'any', max: 1, effect: { focus: 1 }, desc: 'Somewhere to put the trophies and the megaphone. +1 focus.' },
    { id: 'clock', name: 'Alarm clock', price: 25, place: 'any', max: 1, effect: { sleep: 1 }, desc: 'Ticks by the bed. Sleep a little better.' },
    { id: 'megaphone', name: 'Megaphone', price: 75, place: 'any', max: 1, effect: { sanityDay: 1 }, desc: 'For shilling in Spaces. Mostly decor.' },
    { id: 'armchair', name: 'Armchair', price: 220, place: 'apartment', max: 1, effect: { sanityDay: 1, sleep: 1 }, desc: 'A reading chair for the apartment.' },
    { id: 'coffeetable', name: 'Coffee table', price: 160, place: 'apartment', max: 1, effect: { sanityDay: 1 }, desc: 'Goes in front of the sofa.' },
  ];

  function Build(game, saved) {
    this.game = game;
    this.owned = {};            // item id -> count (delivered and unpacked)
    this.deliveries = [];       // { item, at (game hours) } boxes on the way
    this.boxes = [];            // arrived, waiting at the door: item ids
    this.places = ['bedroom', 'street'];
    this.lastCoffee = -99;
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Build.prototype;
  Build.PLACES = PLACES; Build.CATALOG = CATALOG;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  P.count = function (id) { return this.owned[id] || 0; };
  P.effects = function () {
    const e = { screens: 0, focus: 0, seatedDrain: 0, sanityDay: 0, sleep: 0, desks: 0, racks: 0, coffee: 0, devdesk: 0, cooling: 0 };
    for (const it of CATALOG) { const n = this.count(it.id); for (const [k, v] of Object.entries(it.effect)) e[k] = (e[k] || 0) + v * n; }
    return e;
  };
  P.netUsd = function () { return this.game.player.netWorth() * BH.C.SOL_USD + this.game.bills.cash - this.game.bills.debt; };
  P.canBuy = function (id) {
    const it = CATALOG.find((x) => x.id === id);
    if (!it) return { ok: false, reason: 'Unknown item' };
    if (this.count(id) + this.deliveries.filter((d) => d.item === id).length + this.boxes.filter((b) => b === id).length >= it.max) return { ok: false, reason: 'You have the maximum' };
    if (it.place !== 'any' && !this.places.includes(it.place)) return { ok: false, reason: 'Needs the ' + PLACES[it.place].name };
    if (this.game.bills.cash < it.price) return { ok: false, reason: 'Not enough cash' };
    return { ok: true, item: it };
  };
  P.buy = function (id) {
    const c = this.canBuy(id); if (!c.ok) return c;
    this.game.bills.pay(c.item.price);
    this.game.bills.log.push({ day: this.game.clock.day, what: c.item.name, usd: -c.item.price });
    this.deliveries.push({ item: id, at: this.game.clock.total + 1 });
    return { ok: true, text: c.item.name + ' ordered. The box arrives in about an hour.' };
  };
  P.unbox = function () {
    const id = this.boxes.shift(); if (!id) return null;
    this.owned[id] = this.count(id) + 1;
    return CATALOG.find((x) => x.id === id);
  };
  P.canLease = function (place) {
    const p = PLACES[place]; if (!p) return { ok: false, reason: 'Unknown place' };
    if (this.places.includes(place)) return { ok: false, reason: 'Already yours' };
    if (this.netUsd() < p.needUsd) return { ok: false, reason: 'Needs $' + p.needUsd.toLocaleString() + ' net worth' };
    if (this.game.bills.cash < p.deposit) return { ok: false, reason: 'Needs $' + p.deposit.toLocaleString() + ' cash for the deposit' };
    return { ok: true };
  };
  P.lease = function (place) {
    const c = this.canLease(place); if (!c.ok) return c;
    const p = PLACES[place];
    this.game.bills.pay(p.deposit);
    this.game.bills.log.push({ day: this.game.clock.day, what: p.name + ' deposit', usd: -p.deposit });
    this.places.push(place);
    this.syncRent();
    return { ok: true, text: p.name + ' is yours. Weekly cost: $' + p.rent.toLocaleString() + '.' };
  };
  P.loseHome = function () {   // eviction: back to the bedroom, the apartment lease ends
    this.places = this.places.filter((p) => p === 'bedroom' || p === 'street' || PLACES[p].kind === 'work');
    if (!this.places.includes('bedroom')) this.places.push('bedroom');
    this.syncRent();
  };
  P.syncRent = function () {
    let r = 0;
    const homes = this.places.filter((p) => PLACES[p].kind === 'home');
    // you pay rent for your best home only (you moved out of the bedroom), plus every work place
    const best = homes.includes('apartment') ? 'apartment' : 'bedroom';
    r += PLACES[best].rent;
    for (const p of this.places) if (PLACES[p].kind === 'work') r += PLACES[p].rent;
    this.game.bills.rent = r;
  };
  P.useCoffee = function () {
    if (!this.count('coffee')) return { ok: false, text: 'No coffee machine yet. Buy one in the Shop.' };
    if (this.game.clock.total - this.lastCoffee < 4) return { ok: false, text: 'Too much coffee already. Wait a few hours.' };
    this.lastCoffee = this.game.clock.total;
    this.game.life.bump('energy', 15); this.game.life.bump('hunger', -5);
    return { ok: true, text: 'Fresh coffee. Energy +15.' };
  };
  P.afterTime = function () {
    const now = this.game.clock.total;
    let came = false;
    for (let i = this.deliveries.length - 1; i >= 0; i--) if (now >= this.deliveries[i].at) { this.boxes.push(this.deliveries[i].item); this.game.emit('toast', { kind: 'info', text: 'Delivery! A box is at your door.' }); this.deliveries.splice(i, 1); came = true; }
    if (came) this.game.emit('delivered', this.boxes.length);   // the room puts the box down right away (world/main.mjs)
    const day = this.game.clock.day;
    if (this.sanityDayMark !== day) { this.sanityDayMark = day; const e = this.effects(); if (e.sanityDay) this.game.life.bump('sanity', e.sanityDay); }
  };
  BH.Build = Build;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'build', create(game, saved) { const b = new Build(game, saved); b.syncRent(); return b; } });
})(typeof window !== 'undefined' ? window : globalThis);
