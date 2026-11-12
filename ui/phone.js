/* The phone (Tab): Chirp, Bank, Scope, News, Map (travel and leases), Trophies and Story. Works while walking around. */
(function (g) {
  'use strict';
  const BH = g.BH;
  const V = () => BH.SocialView;
  const TABS = [['chirp', 'message-circle', 'Chirp'], ['bank', 'landmark', 'Bank'], ['scope', 'radar', 'Scope'], ['news', 'newspaper', 'News'], ['map', 'map', 'Map'], ['trophies', 'trophy', 'Trophies'], ['story', 'book-open', 'Story']];

  const Phone = {
    el: null, tab: 'chirp', open: false, onTravel: null, onCoin: null,
    init(onTravel, onCoin) {
      this.onTravel = onTravel; this.onCoin = onCoin;
      const el = this.el = document.createElement('div');
      el.id = 'phone'; el.hidden = true;
      const ic = BH.HUD.icon;
      el.innerHTML = '<div class="ph-frame"><div class="ph-status"><b id="phClock"></b><span id="phSol"></span></div><div class="ph-body" id="phBody"></div><nav class="ph-tabs">' + TABS.map(([id, i, l]) => '<button data-tab="' + id + '">' + ic(i, 'sm') + '<span>' + l + '</span></button>').join('') + '</nav></div><div class="ph-hint">Tab to close</div>';
      document.body.appendChild(el);
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tab]'); if (t) { this.tab = t.dataset.tab; this.render(true); if (BH.Sound) BH.Sound.play('click', { gain: 0.5 }); return; }
        const go = e.target.closest('[data-go]'); if (go && this.onTravel) { this.onTravel(go.dataset.go); return; }
        const pb = e.target.closest('[data-pb]'); if (pb && BH.Game) { this.bankAction(pb.dataset.pb, pb.dataset.v); return; }
        if (BH.SocialView && BH.Game && BH.SocialView.feedClick(BH.Game, e, () => this.render(true))) return;
        const c = e.target.closest('[data-coin]'); if (c && this.onCoin) this.onCoin(c.dataset.coin);
      });
    },
    toggle(force) {
      this.open = force != null ? force : !this.open;
      this.el.hidden = !this.open;
      if (this.open) { this.render(true); if (BH.Game) BH.Game.flags.phone = true; }
      if (BH.Sound) BH.Sound.play(this.open ? 'open' : 'close', { gain: 0.6 });
    },
    // the Bank app: move money and pay bills from anywhere
    bankAction(a, v) {
      const gm = BH.Game, p = gm.player, b = gm.bills, toast = (k, t) => { if (BH.HUD) BH.HUD.toast(k, t); };
      if (a === 'out') { const sol = v === 'all' ? Math.max(0, p.sol - 0.01) : +v; if (BH.Bank.toCash(p, b, sol)) toast('info', 'Cashed out ' + sol.toFixed(2) + ' SOL ($' + Math.round(sol * BH.C.SOL_USD) + ')'); else toast('fail', 'Not enough SOL'); }
      if (a === 'in') { if (BH.Bank.toSol(p, b, +v)) toast('info', 'Deposited $' + v + ' as SOL'); else toast('fail', 'Not enough cash'); }
      if (a === 'debt') { const paid = b.payDebt(); toast(paid ? 'info' : 'fail', paid ? 'Paid $' + Math.round(paid) + ' of debt' : 'No cash to pay with'); }
      if (a === 'fridge') { const ok = b.restockFridge(); toast(ok ? 'info' : 'fail', ok ? 'Fridge stocked: ' + b.meals + ' meals' : 'Not enough cash'); }
      if (BH.Sound) BH.Sound.play('click', { gain: 0.5 });
      this.render(true);
    },
    bankHTML(game) {
      const b = game.bills, p = game.player, C = BH.C, c = game.clock, v = V(), days = b.rentDueDay - c.day, usd = (n) => '$' + Math.floor(n).toLocaleString();
      const card = (label, val, cls, sub) => '<div class="pb-card"><span>' + label + '</span><b class="' + (cls || '') + '">' + val + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
      return '<div class="ph-h">Bank</div><div class="pb-grid">' +
        card('Cash', usd(b.cash), '', 'rent, food, power') + card('SOL', p.sol.toFixed(2), '', '≈ ' + usd(p.sol * C.SOL_USD)) +
        card('Rent ' + usd(C.RENT_BEDROOM), days <= 0 ? 'Due today' : 'In ' + days + ' day' + (days === 1 ? '' : 's'), days <= 1 ? 'down' : '', 'day ' + b.rentDueDay) +
        card('Debt', usd(Math.ceil(b.debt)), b.debt > 0 ? 'down' : 'up', b.evictionLevel() >= 2 ? 'Eviction warning!' : b.evictionLevel() ? 'Missed rent once' : 'All clear') + '</div>' +
        '<div class="pb-sec">SOL → cash</div><div class="pb-row">' + ['0.5', '1', '5'].map((x) => '<button data-pb="out" data-v="' + x + '">' + x + ' SOL</button>').join('') + '<button data-pb="out" data-v="all">All</button></div>' +
        '<div class="pb-sec">Cash → SOL</div><div class="pb-row">' + ['50', '100', '500'].map((x) => '<button data-pb="in" data-v="' + x + '">$' + x + '</button>').join('') + '</div>' +
        '<div class="pb-row"><button data-pb="debt"' + (b.debt > 0 ? '' : ' disabled') + '>Pay debt</button><button data-pb="fridge">Restock fridge $' + C.FRIDGE_RESTOCK + ' (' + b.meals + ' left)</button></div>' +
        '<div class="pb-sec">Recent</div>' + ((b.log || []).slice(-6).reverse().map((l) => '<div class="pb-log"><span>Day ' + l.day + ' · ' + v.esc(l.what) + '</span><b class="' + (l.usd >= 0 ? 'up' : 'down') + '">' + (l.usd >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(l.usd)).toLocaleString() + '</b></div>').join('') || '<div class="pb-log dim">Nothing yet.</div>');
    },
    render(full) {
      if (!this.open) return;
      const game = BH.Game, v = V();
      document.getElementById('phClock').textContent = game.clock.label();
      document.getElementById('phSol').textContent = game.player.netWorth().toFixed(2) + ' SOL · $' + Math.floor(game.bills.cash);
      for (const b of this.el.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === this.tab);
      const body = document.getElementById('phBody');
      let html = '';
      if (this.tab === 'chirp') html = '<div class="ph-h">Chirp</div><div class="ph-heat">' + v.heatHTML(game) + '</div><div class="sv-feed">' + v.chirpHTML(game, 'assets/', 25) + '</div>';
      if (this.tab === 'bank') html = this.bankHTML(game);
      if (this.tab === 'scope') html = '<div class="ph-h">Scope</div>' + v.scopeHTML(game, 'assets/', 25);
      if (this.tab === 'news') html = '<div class="ph-h">Degen News Network</div>' + v.newsHTML(game);
      if (this.tab === 'story' && BH.StoryView) html = BH.StoryView.html(game);
      if (this.tab === 'trophies') html = '<div class="ph-h">Trophies</div>' + v.trophiesHTML(game);
      if (this.tab === 'map') {
        const b = game.sys.build, P = BH.Build.PLACES, here = game.meta.place;
        html = '<div class="ph-h">Map</div>' + Object.entries(P).map(([id, p]) => {
          const own = b.places.includes(id);
          return '<div class="ph-place' + (id === here ? ' here' : '') + '"><div><b>' + v.esc(p.name) + '</b><span>' + v.esc(p.desc) + '</span><small>' + (own ? (id === here ? 'You are here' : 'Yours') : 'Lease in the Shop · deposit $' + p.deposit.toLocaleString() + ', needs $' + p.needUsd.toLocaleString() + ' net worth') + '</small></div>' + (own && id !== here ? '<button class="btn sm primary" data-go="' + id + '">Go</button>' : '') + '</div>';
        }).join('');
      }
      if (full || body._h !== html) { body._h = html; const st = body.scrollTop; body.innerHTML = html; body.scrollTop = full ? 0 : st; }
    },
  };
  BH.Phone = Phone;
})(window);
