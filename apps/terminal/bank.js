/* Degen Life terminal: the Bank page (cash, debt, rent, fridge, side gigs, SOL <-> cash). Loaded after ui.js. */
(function (g) {
  'use strict';
  const BH = g.BH, C = BH.C, F = BH.fmt, UI = BH.UI, icon = BH.icon, esc = BH.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const setText = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
  const setHTML = (el, v) => { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } };
  const SOL = '<span class="solmark">SOL</span>';

  UI.buildBank = function (el) {
    el.innerHTML = '<div class="page bank"><h1>' + icon('landmark', 'lg') + 'Bank</h1><p>Real-life money. Rent and food are paid in cash; trading is in SOL. Fixed rate: 1 SOL = $' + C.SOL_USD + '.</p>' +
      '<div class="grid-3" id="bankCards"></div>' +
      '<div class="grid-2">' +
        '<div class="card"><h2>' + icon('arrow-left-right') + 'Move money</h2>' +
          '<div class="kv"><span>SOL to cash</span><div class="amt" style="width:170px"><input id="toCash" value="1" inputmode="decimal">' + SOL + '</div><button class="btn primary sm" id="toCashGo">Cash out</button></div>' +
          '<div class="kv"><span>Cash to SOL</span><div class="amt" style="width:170px"><input id="toSol" value="100" inputmode="decimal"><span class="solmark">USD</span></div><button class="btn sm" id="toSolGo">Deposit</button></div>' +
          '<div class="kv"><span>Pay off debt</span><b id="debtTxt"></b><button class="btn sm" id="payDebt">Pay</button></div></div>' +
        '<div class="card"><h2>' + icon('refrigerator') + 'Life</h2>' +
          '<div class="kv"><span>Fridge</span><b id="mealsTxt"></b><button class="btn sm" id="restock">Restock $' + C.FRIDGE_RESTOCK + ' (' + C.FRIDGE_MEALS + ' meals)</button></div>' +
          '<div class="kv"><span>Side gig</span><b>+$' + C.SIDE_GIG_PAY + ' · ' + C.SIDE_GIG_HOURS + ' h · −20 energy</b><button class="btn sm" id="gig">Do a delivery shift</button></div>' +
          '<div class="note">The market keeps moving while you work.</div></div>' +
      '</div>' +
      '<div class="card"><h2>' + icon('receipt') + 'Bills</h2><div id="billLog"></div></div></div>';
    const game = this.game, p = game.player, b = game.bills;
    $('#toCashGo', el).onclick = () => { const v = parseFloat($('#toCash', el).value); if (BH.Bank.toCash(p, b, v)) this.toast('info', 'Cashed out ' + F.sol(v) + ' SOL'); else this.toast('fail', 'Not enough SOL'); this.render(true); };
    $('#toSolGo', el).onclick = () => { const v = parseFloat($('#toSol', el).value); if (BH.Bank.toSol(p, b, v)) this.toast('info', 'Deposited $' + v); else this.toast('fail', 'Not enough cash'); this.render(true); };
    $('#payDebt', el).onclick = () => { const v = b.payDebt(); this.toast(v ? 'info' : 'fail', v ? 'Paid $' + Math.round(v) + ' of debt' : 'No cash to pay with'); this.render(true); };
    $('#restock', el).onclick = () => { const ok = b.restockFridge(); this.toast(ok ? 'info' : 'fail', ok ? 'Fridge stocked: ' + b.meals + ' meals' : 'Not enough cash'); this.render(true); };
    $('#gig', el).onclick = () => { const r = BH.Actions.sideGig(game); this.toast(r.ok ? 'info' : 'fail', r.text); this.render(true); };
  };

  UI.renderBank = function () {
    const b = this.game.bills, c = this.game.clock;
    const card = (ic, label, val, cls, sub) => '<div class="card stat"><span>' + icon(ic, 'sm') + ' ' + label + '</span><b class="big ' + (cls || '') + '">' + val + '</b><small class="dim">' + (sub || '') + '</small></div>';
    const daysLeft = b.rentDueDay - c.day;
    setHTML($('#bankCards'),
      card('banknote', 'Cash', '$' + Math.floor(b.cash).toLocaleString(), '', 'for rent, food and power') +
      card('house', 'Rent', '$' + C.RENT_BEDROOM, daysLeft <= 1 ? 'down' : '', 'due day ' + b.rentDueDay + (daysLeft <= 0 ? ' (today)' : ' · in ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's'))) +
      card('triangle-alert', 'Debt', '$' + Math.ceil(b.debt).toLocaleString(), b.debt > 0 ? 'down' : 'up', b.evictionLevel() >= 2 ? 'Eviction warning!' : b.evictionLevel() ? 'Missed rent once' : 'All clear'));
    setText($('#debtTxt'), '$' + Math.ceil(b.debt));
    setText($('#mealsTxt'), b.meals + ' meal' + (b.meals === 1 ? '' : 's'));
    setHTML($('#billLog'), b.log.length ? '<table class="tbl"><thead><tr><th class="l">Day</th><th class="l">What</th><th>Amount</th></tr></thead><tbody>' + b.log.slice(-12).reverse().map((l) => '<tr><td class="l">' + l.day + '</td><td class="l">' + esc(l.what) + '</td><td class="' + (l.usd >= 0 ? 'up' : 'down') + '">' + (l.usd >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(l.usd)) + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">No bills yet. Rent is due on day ' + b.rentDueDay + '.</div>');
  };
})(window);
