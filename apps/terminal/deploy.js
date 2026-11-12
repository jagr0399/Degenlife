/* Token Deploy panel (a reference screenshot): replaces the old Launch page.
   Name (+ presets), Symbol (+ Auto), Website, Post (X link), image picker, launchpad (Pump / Flap / Pons, more behind the gear),
   Dividends (holder rewards) vs creator rewards, paired to SOL or USD1, dev-buy presets 1/3/5/10, Deploy (Enter).
   Left out on purpose: Tasks, Multi, Fee Split, Bundle. Loaded after ui.js; wraps UI.buildLaunch. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, C = BH.C, icon = BH.icon, esc = BH.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const IMGS = 200;
  const SAFE_URL = /^https:\/\/[^\s"'<>()]+$/;

  const blank = () => ({ name: '', ticker: '', auto: true, web: '', post: '', img: Math.floor(Math.random() * IMGS), realImg: null, lp: 'pumplab', moreLp: false, rewards: 'creator', pair: 'SOL', devBuy: 1, editDev: false });
  UI.deployForm = UI.deployForm || blank();
  const autoTicker = (name) => String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

  function presets() {
    const out = [], seen = new Set();
    const add = (n, t, img) => { const k = (t || n).toUpperCase(); if (!n || seen.has(k)) return; seen.add(k); out.push({ name: n, ticker: t || autoTicker(n), img }); };
    const R = BH.RealCoins; if (R && R.pool) for (const c of R.pool.slice(-12).reverse()) add(c.name, c.ticker, c.img);
    const s = UI.game && UI.game.sys && UI.game.sys.social;
    if (s && s.hottest) for (const n of s.hottest().slice(0, 4)) add(n.label + ' Coin', null, null);
    return out.slice(0, 14);
  }

  UI.buildLaunch = function (el) {
    const f = UI.deployForm, pads = BH.PADS || [];
    const main = ['pumplab', 'flap', 'pons'].map((id) => pads.find((p) => p.id === id)).filter(Boolean);
    const rest = pads.filter((p) => !main.includes(p));
    const padBtn = (p, big) => '<button class="dp-pad' + (big ? ' big' : '') + '" data-lp="' + p.id + '"><i style="background:' + p.color + '"></i>' + esc(p.id === 'pumplab' ? 'Pump' : p.name) + '</button>';
    let thumbs = '';
    for (let i = 0; i < 24; i++) { const n = (f.img + i * 7) % IMGS; thumbs += '<button class="dp-img" data-img="' + n + '"><img src="../assets/coins/c' + n + '.jpg" alt=""></button>'; }
    const R = BH.RealCoins;
    if (R && R.pool) for (const c of R.pool.filter((x) => x.img && SAFE_URL.test(x.img)).slice(-8)) thumbs += '<button class="dp-img" data-real="' + esc(c.img) + '"><img src="' + esc(c.img) + '" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></button>';
    el.innerHTML = '<div class="dp-wrap"><div class="dp">' +
      '<div class="dp-head"><h1>Token Deploy</h1><span class="dim" id="dpBal"></span></div>' +
      '<div class="dp-row2"><label class="dp-f"><span>NAME <button class="dp-pre" id="dpPre">PRESETS ' + icon('chevron-down', 'sm') + '</button><em id="dpNameN"></em></span><input class="input" id="dpName" maxlength="32" placeholder="Coin name"></label>' +
        '<label class="dp-f"><span>SYMBOL <em id="dpTickN"></em><label class="dp-auto"><input type="checkbox" id="dpAuto"> Auto</label></span><input class="input" id="dpTick" maxlength="13" placeholder="TICKER" style="text-transform:uppercase"></label></div>' +
      '<div class="dp-menu" id="dpMenu" hidden></div>' +
      '<label class="dp-f"><span>WEBSITE</span><input class="input" id="dpWeb" placeholder="https://"></label>' +
      '<div class="dp-f"><span>POST</span><div class="dp-post"><input class="input" id="dpPost" placeholder="https://x.com/"><span class="dp-x">' + icon('at-sign', 'sm') + ' Post</span></div></div>' +
      '<div class="dp-f"><span>SELECT IMAGE</span><div class="dp-imgs" id="dpImgs"><div class="dp-cur" id="dpCur"></div>' + thumbs + '</div></div>' +
      '<div class="dp-pads">' + main.map((p, i) => padBtn(p, i === 0)).join('') + '<button class="dp-gear" id="dpGear" title="Other launchpads">' + icon('settings', 'sm') + '</button></div>' +
      '<div class="dp-pads more" id="dpMore"' + (f.moreLp ? '' : ' hidden') + '>' + rest.map((p) => padBtn(p)).join('') + '</div>' +
      '<div class="dp-opts"><button class="dp-div" id="dpDiv"><b class="dp-check"></b>' + icon('badge-dollar-sign', 'sm') + 'Dividends</button>' +
        '<button class="dp-pair" id="dpPair"><span class="dp-solmk"></span><b id="dpPairT"></b>' + icon('chevron-down', 'sm') + '</button></div>' +
      '<div class="dp-note" id="dpNote"></div>' +
      '<div class="dp-buys">' + [1, 3, 5, 10].map((v) => '<button class="dp-buy" data-dev="' + v + '"><span class="dp-solmk"></span>' + v + '</button>').join('') + '<button class="dp-edit" id="dpEdit" title="Custom dev buy">' + icon('pencil', 'sm') + '</button></div>' +
      '<div class="dp-custom" id="dpCustom"' + (f.editDev ? '' : ' hidden') + '><input class="input" id="dpDevIn" inputmode="decimal" placeholder="Dev buy in SOL (0 for none)"></div>' +
      '<button class="dp-go" id="dpGo">' + icon('zap', 'sm') + 'Deploy <span class="dp-solmk"></span><b id="dpGoAmt"></b> <span class="dim">(Enter)</span></button>' +
      '<div class="dp-foot dim" id="dpFoot"></div>' +
    '</div></div>';

    const upd = () => {
      const gm = UI.game, pl = gm && gm.player;
      f.name = $('#dpName', el).value; f.auto = $('#dpAuto', el).checked;
      if (f.auto) $('#dpTick', el).value = autoTicker(f.name);
      f.ticker = $('#dpTick', el).value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
      $('#dpTick', el).disabled = f.auto;
      f.web = $('#dpWeb', el).value.trim(); f.post = $('#dpPost', el).value.trim();
      $('#dpNameN', el).textContent = f.name.length + '/32'; $('#dpTickN', el).textContent = f.ticker.length + '/13';
      for (const b of el.querySelectorAll('.dp-pad')) b.classList.toggle('on', b.dataset.lp === f.lp);
      for (const b of el.querySelectorAll('.dp-buy')) b.classList.toggle('on', !f.editDev && +b.dataset.dev === f.devBuy);
      for (const b of el.querySelectorAll('.dp-img')) b.classList.toggle('on', f.realImg ? b.dataset.real === f.realImg : +b.dataset.img === f.img && !b.dataset.real);
      $('#dpCur', el).innerHTML = '<img src="' + esc(f.realImg || '../assets/coins/c' + f.img + '.jpg') + '" alt="" referrerpolicy="no-referrer">';
      $('#dpDiv', el).classList.toggle('on', f.rewards === 'holders');
      $('#dpPairT', el).textContent = f.pair;
      $('#dpGoAmt', el).textContent = String(f.devBuy);
      if (pl) $('#dpBal', el).textContent = pl.sol.toFixed(2) + ' SOL';
      const pad = (BH.PADS || []).find((p) => p.id === f.lp), grad = pad && gm ? gm.sim.gradMc({ lp: pad.id }) : 0;
      $('#dpNote', el).innerHTML = (pad ? '<b>' + esc(pad.id === 'pumplab' ? 'Pump' : pad.name) + '</b> curve graduates near <b>' + BH.fmt.usd(grad) + '</b> · fee ' + (pad.fee * 100).toFixed(2) + '%. ' : '') +
        (f.rewards === 'holders' ? 'Dividends on: creator fees are paid to your holders, not you. Holders hold longer; you earn only from your bag.' : 'Creator rewards: you keep the creator fee on every trade.') +
        ' ' + (f.pair === 'USD1' ? 'Paired to USD1: your market cap in $ ignores SOL\'s moves.' : 'Paired to SOL: your market cap in $ moves with SOL.');
      const d = f.devBuy, q = d > 0 ? d * (1 - (pad ? pad.fee : C.CURVE_FEE)) : 0, vS = pad ? pad.vSol : C.CURVE_V_SOL;
      const tok = q > 0 ? C.CURVE_V_TOKENS - vS * C.CURVE_V_TOKENS / (vS + q) : 0;
      $('#dpFoot', el).textContent = d > 0 ? 'Dev buy ' + d + ' SOL ≈ ' + (tok / C.TOTAL_SUPPLY * 100).toFixed(1) + '% of supply. Traders see your dev %; a big bag scares them.' : 'No dev buy: you start with no bag.';
    };

    // fill
    $('#dpName', el).value = f.name; $('#dpTick', el).value = f.ticker; $('#dpAuto', el).checked = f.auto; $('#dpWeb', el).value = f.web; $('#dpPost', el).value = f.post;
    el.addEventListener('input', upd);
    el.addEventListener('change', upd);
    el.addEventListener('click', (e) => {
      const t = e.target;
      const pad = t.closest('.dp-pad'); if (pad) { f.lp = pad.dataset.lp; upd(); return; }
      const im = t.closest('.dp-img'); if (im) { if (im.dataset.real) { f.realImg = im.dataset.real; } else { f.realImg = null; f.img = +im.dataset.img; } upd(); return; }
      const b = t.closest('.dp-buy'); if (b) { f.devBuy = +b.dataset.dev; f.editDev = false; $('#dpCustom', el).hidden = true; upd(); return; }
      if (t.closest('#dpEdit')) { f.editDev = !f.editDev; $('#dpCustom', el).hidden = !f.editDev; if (f.editDev) $('#dpDevIn', el).focus(); upd(); return; }
      if (t.closest('#dpGear')) { f.moreLp = !f.moreLp; $('#dpMore', el).hidden = !f.moreLp; return; }
      if (t.closest('#dpDiv')) { f.rewards = f.rewards === 'holders' ? 'creator' : 'holders'; upd(); return; }
      if (t.closest('#dpPair')) { f.pair = f.pair === 'SOL' ? 'USD1' : 'SOL'; upd(); return; }
      if (t.closest('#dpPre')) {
        const m = $('#dpMenu', el); m.hidden = !m.hidden;
        if (!m.hidden) m.innerHTML = presets().map((p, i) => '<button data-pre="' + i + '">' + esc(p.name) + ' <span class="dim">$' + esc(p.ticker) + '</span></button>').join('') || '<span class="dim">No presets yet</span>';
        m._list = presets();
        return;
      }
      const pr = t.closest('[data-pre]');
      if (pr) { const p = $('#dpMenu', el)._list[+pr.dataset.pre]; if (p) { $('#dpName', el).value = p.name; if (!f.auto) $('#dpTick', el).value = p.ticker; if (p.img && SAFE_URL.test(p.img)) f.realImg = p.img; } $('#dpMenu', el).hidden = true; upd(); return; }
      if (t.closest('#dpGo')) deploy();
    });
    $('#dpDevIn', el).addEventListener('input', (e) => { const v = parseFloat(e.target.value); f.devBuy = isFinite(v) && v >= 0 ? Math.round(v * 1000) / 1000 : 0; upd(); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); deploy(); } });

    const deploy = () => {
      upd();
      if (f.name.trim().length < 2) return UI.toast('fail', 'Give your coin a name');
      if (f.ticker.length < 2) return UI.toast('fail', 'Symbol needs 2+ letters');
      const socials = { x: !!f.post, tg: false, web: !!f.web };
      const res = UI.game.player.launchCoin({ name: f.name.trim(), ticker: f.ticker, desc: '', hue: Math.floor(Math.random() * 360), socials, devBuy: f.devBuy, lp: f.lp, img: f.realImg ? null : f.img, rewards: f.rewards, pair: f.pair });
      if (!res.ok) return UI.toast('fail', res.reason);
      if (f.realImg) res.token.realImg = f.realImg;
      if (f.web && SAFE_URL.test(f.web)) res.token.website = f.web;
      UI.toast('buy', '$' + res.token.ticker + ' deployed on ' + ((BH.PADS || []).find((p) => p.id === f.lp) || { name: 'the curve' }).name.replace('PumpLab', 'Pump'), { id: res.token.id });
      UI.deployForm = Object.assign(blank(), { lp: f.lp, rewards: f.rewards, pair: f.pair, devBuy: f.devBuy });
      UI.openToken(res.token.id);
    };
    upd();
    setTimeout(() => { const n = $('#dpName', el); if (n) n.focus(); }, 50);
  };
  UI.renderLaunch = function () { const el = document.getElementById('dpBal'); if (el && UI.game) el.textContent = UI.game.player.sol.toFixed(2) + ' SOL'; };
})(window);
