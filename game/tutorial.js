/* Tutorial: a guided first day. Each step has a goal the game checks for you; the HUD shows the current one. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};

  // each step: what to do (text), why it matters (why), and a check the game runs for you
  const STEPS = [
    { id: 'look', title: 'Look around your room', text: 'Click the game window, then move the mouse to look. Walk with W A S D (Shift to hurry).', why: 'This is your whole life right now: a mattress, a laptop on a box and 10 SOL. Rent is due on day 8.', done: (g) => g.flags.looked && g.flags.walked },
    { id: 'sit', title: 'Sit at the laptop', text: 'Walk up to the laptop on the box and press E. The computer opens on the DegenOS desktop.', why: 'Every app lives on this computer: the trading terminal, Chirp, the Shop, the Bank and more later.', done: (g) => g.flags.sat },
    { id: 'buy', title: 'Buy your first coin', text: 'Open Bagholder, go to Pulse, click any coin card, then press Buy (or 1-4). Start small: 0.1-0.5 SOL.', why: 'New Pairs are coins that launched seconds ago. Most die within minutes. Small buys let you learn without going broke.', done: (g) => g.player.st.buys > 0 },
    { id: 'chart', title: 'Read the chart', text: 'Scroll on the chart to zoom, drag to pan, drag the price axis to stretch it. Open Display to pick which lines and bubbles show.', why: 'Bubbles are real trades: green = buy, red = sell, gold = you. The dashed lines are your average buy/sell, migration and the all-time high.', done: (g) => g.flags.chartZoom },
    { id: 'dd', title: 'Do your due diligence', text: 'Hover the little quill next to a coin\'s name to read what the dev posted, and check the risk badges (top 10 %, dev %, snipers, bundles).', why: 'About 98% of real launches are rugs or pump-and-dumps. The badges are how you dodge most of them.', done: (g) => g.flags.dd },
    { id: 'sell', title: 'Take profit (or a loss)', text: 'Sell with the Sell tab, the instant panel, or Q W E R for 25/50/75/100%.', why: 'Nobody ever went broke taking profit. Your PnL shows the same number in the side panel and the instant panel.', done: (g) => g.player.st.sells > 0 || g.player.closed.length > 0 },
    { id: 'post', title: 'Post on Chirp', text: 'Open Chirp and write a post. Pick a coin in the box to "call" it to your followers.', why: 'Followers and trust are a second career: good calls grow them, dumping on them kills them. Likes and replies come in over time.', done: (g) => g.sys.social && g.sys.social.myPosts && g.sys.social.myPosts().length > 0 },
    { id: 'phone', title: 'Check your phone', text: 'Stand up (Esc), then press Tab. Chirp, Scope, News, the Map and your Story are all here.', why: 'The Story tab shows your act, your goals, the people in your life and the race against Kai.', done: (g) => g.flags.phone },
    { id: 'bank', title: 'Mind the rent', text: 'Open the Bank app. Cash out some SOL or do a side gig (Finance app) so you have cash for rent.', why: 'Rent, food and bills are paid in cash, not SOL. Miss rent twice and you get evicted.', done: (g) => g.flags.bank },
    { id: 'eat', title: 'Eat something', text: 'Use the fridge (E). Restock it from the Bank app when it runs out.', why: 'Low food and low energy drain your focus. With low focus your orders land a block late.', done: (g) => g.flags.ate },
    { id: 'sleep', title: 'Sleep', text: 'When energy gets low, sleep on the mattress (E).', why: 'The market keeps moving while you sleep. Set take-profits and stop-losses first.', done: (g) => g.flags.slept },
    { id: 'shop', title: 'Grow your setup', text: 'Buy something in the Shop app. Boxes arrive at your door; open them with E.', why: 'Gear has real effects: monitors and a fast PC add focus, a chair saves energy, plants keep you sane.', done: (g) => g.flags.unboxed },
    { id: 'apps', title: 'Explore the business apps', text: 'Open Hustle, Clout, Toolkit, Finance, Empire or Life on the desktop. Each one explains itself the first time.', why: 'This is where the game opens up: coin recipes, a crew, a sniper bot, a loan shark, side businesses, pets...', done: (g) => g.flags.newApp },
    { id: 'goal', title: 'Follow your story', text: 'From here the Story goals in this panel lead the way: rent, $3K, the old man in the park, then the apartment.', why: 'Five acts from the bedroom to the Tower, and your choices decide which ending you get.', done: () => false },
  ];

  function Tutorial(game, saved) {
    this.game = game; this.step = 0; this.on = !!(game.meta && game.meta.tutorial); this.doneAt = {};
    game.flags = (saved && saved.flags) || game.flags || {};
    if (saved) { this.step = saved.step || 0; this.on = !!saved.on; this.doneAt = saved.doneAt || {}; }
  }
  const P = Tutorial.prototype;
  Tutorial.STEPS = STEPS;
  P.save = function () { return { step: this.step, on: this.on, doneAt: this.doneAt, flags: this.game.flags }; };
  P.current = function () { return this.on ? STEPS[this.step] || null : null; };
  P.skip = function () { this.on = false; };
  P.check = function () {
    if (!this.on) return null;
    let advanced = null;
    while (this.step < STEPS.length && STEPS[this.step].done(this.game)) {
      this.doneAt[STEPS[this.step].id] = this.game.clock.total;
      advanced = STEPS[this.step];
      this.step++;
    }
    if (advanced) this.game.emit('tutorial', { done: advanced, next: STEPS[this.step] || null });
    return advanced;
  };
  P.afterTime = function () { this.check(); };
  P.tickReal = function () { this.check(); };
  BH.Tutorial = Tutorial;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'tutorial', create(game, saved) { return new Tutorial(game, saved); } });
})(typeof window !== 'undefined' ? window : globalThis);
