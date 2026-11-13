/* Five new apps: You (skills, mood, people), History (every closed trade, click to replay it on the chart),
   Inspector (the rug-or-safe minigame), Bots (trading rules) and Hotkeys (rebind the trading keys + panic sell).
   Also: quick price alerts in the instant-trade panel, and the gut-feeling read in the token header.
   Loaded after hustle.js (BH.addApp), suites.js and traits.js. */
(function (g) {
  'use strict';
  const BH = g.BH, UI = BH.UI, icon = BH.icon, esc = BH.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const game = () => UI.game;
  const setHTML = (el, v) => { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } };
  const toast = (r) => UI.toast(r.ok ? 'info' : 'fail', r.ok ? r.text : r.reason);
  const bar = (pct, col) => '<span class="pg-bar"><i style="width:' + Math.round(Math.max(0, Math.min(100, pct))) + '%;background:' + (col || '#f4b23e') + '"></i></span>';
  const ago = (s) => (s < 60 ? Math.round(s) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : Math.round(s / 3600) + 'h');

  // ---------------- You: skills, mood, people ----------------
  BH.addApp('skills', 'You', 'user-round', '#f4b23e', {
    build(el) { el.innerHTML = '<div class="xp pg"><h1>' + icon('user-round', 'lg') + 'You <span class="dim">· skills, mood and the people in your life</span></h1><div class="grid-2"><div class="card"><h2>Trader skills</h2><div id="pgSk"></div></div><div><div class="card"><h2>Mood</h2><div id="pgMood"></div></div><div class="card"><h2>People</h2><div id="pgRel"></div></div></div></div></div>'; },
    render() {
      const gm = game(), pr = gm && gm.sys && gm.sys.progress; if (!pr) return;
      const S = BH.Progress.SKILLS, XP = (l) => Math.round(60 * Math.pow(l, 1.6));
      setHTML($('#pgSk'), Object.keys(S).map((k) => { const s = pr.skills[k], need = XP(s.lvl); return '<div class="pg-sk"><div class="pg-row">' + icon(S[k].ic, 'sm') + '<b>' + S[k].name + '</b><span class="pg-lvl">Lv ' + s.lvl + '</span></div>' + bar(s.lvl >= 10 ? 100 : s.xp / need * 100) + '<div class="note">' + S[k].perk(s.lvl) + (s.lvl < 10 ? ' · next level in ' + Math.max(0, Math.ceil(need - s.xp)) + ' xp' : ' · max level') + '</div></div>'; }).join('') +
        '<p class="note">Charting grows with every trade (more for good ones). Risk grows when you cut a loser early. Social grows with followers and streaming. Hustle grows with contracts, gigs and donations.</p>');
      const m = pr.mood && pr.mood.until > gm.clock.total ? pr.mood : null;
      setHTML($('#pgMood'), m ? (m.id === 'heater' ? '<div class="pg-mood good">🔥 <b>On a heater</b><span>3 wins in a row: focus is up. Ends in ' + Math.max(1, Math.round((m.until - gm.clock.total) * 60)) + ' min.</span></div>' : '<div class="pg-mood bad">😤 <b>Revenge trading</b><span>After a big loss your focus is down, so orders land late. Ends in ' + Math.max(1, Math.round((m.until - gm.clock.total) * 60)) + ' min, or sleep it off.</span></div>') : '<div class="pg-mood"><b>Steady</b><span>Win 3 in a row for a heater. A big loss puts you in revenge mode.</span></div>');
      const P2 = BH.Progress.PEOPLE, tip = { dex: 'Owing money annoys him; when he likes you he chips in for groceries, when he doesn\'t he eats your food.', mom: 'Big losses worry her. When things are good with Mom she sends money on rough days.', chat: 'Big wins make them happy. Go quiet too long and they wonder if you\'re alive.' };
      setHTML($('#pgRel'), Object.keys(P2).map((k) => { const v = Math.round(pr.rel[k] || 50); return '<div class="pg-sk"><div class="pg-row"><b>' + P2[k].name + '</b><span class="dim">' + P2[k].role + '</span><span class="pg-lvl">' + v + '/100</span></div>' + bar(v, v >= 60 ? '#2bd67b' : v >= 35 ? '#f4b23e' : '#ff4d5e') + '<div class="note">' + tip[k] + '</div></div>'; }).join(''));
    },
  });

  // ---------------- History: closed trades, click to replay ----------------
  BH.addApp('history', 'History', 'history', '#4aa8ff', {
    build(el) {
      el.innerHTML = '<div class="xp pg"><h1>' + icon('history', 'lg') + 'Trade history <span class="dim">· click a trade to replay it on its chart</span></h1><div class="card" id="hsT"></div></div>';
      el.addEventListener('click', (e) => {
        const r = e.target.closest('[data-replay]'); if (!r) return;
        const gm = game(), tk = gm.sim.byId.get(r.dataset.replay), t0 = +r.dataset.t;
        if (!tk || tk.dead) { toast({ ok: false, reason: 'That coin is gone (dead coins are cleared from the market)' }); return; }
        UI.openApp('terminal'); UI.openToken(tk.id);
        setTimeout(() => { if (UI.chart && UI.chart.focusTime) UI.chart.focusTime(t0); }, 250);
      });
    },
    render() {
      const gm = game(); if (!gm) return;
      const cl = gm.player.closed.slice(0, 60), now = gm.sim.t;
      setHTML($('#hsT'), cl.length ? '<table class="tbl"><thead><tr><th class="l">Coin</th><th>Invested</th><th>P&amp;L</th><th>Result</th><th>Held</th><th>Closed</th><th></th></tr></thead><tbody>' + cl.map((c) => '<tr><td class="l"><b>$' + esc(c.ticker) + '</b>' + (c.rugged ? ' <span class="down">rugged</span>' : '') + '</td><td>' + (c.invested || 0).toFixed(2) + '</td><td class="' + (c.pnl >= 0 ? 'up' : 'down') + '">' + (c.pnl >= 0 ? '+' : '') + c.pnl.toFixed(3) + '</td><td class="' + (c.mult >= 1 ? 'up' : 'down') + '">' + (c.mult >= 1 ? c.mult.toFixed(2) + 'x' : '−' + Math.round((1 - c.mult) * 100) + '%') + '</td><td>' + ago(c.held || 0) + '</td><td>' + ago(now - c.at) + ' ago</td><td><button class="btn sm" data-replay="' + esc(c.id) + '" data-t="' + (c.at - (c.held || 0)) + '">' + icon('play', 'sm') + 'Replay</button></td></tr>').join('') + '</tbody></table>' : '<p class="note">No closed trades yet. Every trade you close shows up here; Replay jumps the chart to the moment you bought, with your B and S marks on it.</p>');
    },
  });

  // ---------------- Inspector: safe or rug? ----------------
  const insp = {
    cur: null, until: 0, streak: 0, score: { right: 0, wrong: 0 }, last: null,
    build(el) {
      el.innerHTML = '<div class="xp pg"><h1>' + icon('search-check', 'lg') + 'Rug inspector <span class="dim">· read the coin, beat the clock</span></h1><div class="grid-2"><div class="card" id="inCard"></div><div class="card"><h2>How it works</h2><p class="note">You get a fresh coin\'s numbers: holders, top 10, dev and sniper bags, bundles, socials and its age. You have 20 seconds to call it <b>Safe</b> (it will run or at least hold) or <b>Rug</b> (it will rug, dump or die). The market decides who was right, a few minutes later.<br><br>Right calls pay $25 (more on a streak), add trust and Charting xp. Wrong calls cost a little trust.</p><div id="inScore"></div></div></div></div>';
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-in]'); if (!b) return;
        if (b.dataset.in === 'new') return this.deal();
        this.answer(b.dataset.in);
      });
    },
    deal() {
      const gm = game(), sim = gm.sim, live = sim.tokens.filter((t) => !t.dead && t.dir && sim.t - t.born < 240 && !t.isPlayer && t.fate2 && t.fate2 !== 'legend');
      if (!live.length) { toast({ ok: false, reason: 'No fresh coins right now; try again in a moment' }); return; }
      this.cur = live[Math.floor(Math.random() * live.length)].id; this.until = performance.now() + 20000; this.last = null; this.render(true);
    },
    answer(pick) {
      const gm = game(), tk = this.cur && gm.sim.byId.get(this.cur); if (!tk) return;
      const late = performance.now() > this.until, bad = tk.fate2 === 'rug' || tk.fate2 === 'pnd' || tk.fate2 === 'doa';
      const right = !late && ((pick === 'rug') === bad);
      if (right) { this.streak++; this.score.right++; const pay = 25 + Math.min(100, (this.streak - 1) * 15); gm.bills.earn(pay, 'Rug inspector'); const tr = gm.sys.trencher; if (tr) tr.bump('trust', 1); if (gm.sys.progress) gm.sys.progress.gain('chart', 10); this.last = { ok: true, text: 'Right! It was ' + (bad ? (tk.fate2 === 'doa' ? 'a dud' : 'a rug / dump') : 'a real one') + '. +$' + pay + (this.streak > 1 ? ' (' + this.streak + ' in a row)' : '') }; }
      else { this.streak = 0; this.score.wrong++; const tr = gm.sys.trencher; if (tr && !late) tr.bump('trust', -0.5); this.last = { ok: false, text: late ? 'Too slow: the 20 seconds ran out.' : 'Wrong. It was ' + (bad ? (tk.fate2 === 'doa' ? 'a dud' : 'a rug / dump') : 'a real one') + '.' }; }
      this.cur = null; this.render(true);
    },
    render() {
      const gm = game(); if (!gm) return;
      const tk = this.cur && gm.sim.byId.get(this.cur);
      if (!tk) setHTML($('#inCard'), (this.last ? '<div class="pg-mood ' + (this.last.ok ? 'good' : 'bad') + '"><b>' + esc(this.last.text) + '</b></div>' : '') + '<button class="btn primary" data-in="new">' + icon('shuffle', 'sm') + 'Inspect a new coin</button>');
      else {
        const r = gm.sim.risk(tk), left = Math.max(0, Math.ceil((this.until - performance.now()) / 1000)), so = tk.socials || {};
        const row = (k, v, warn) => '<div class="kv"><span>' + k + '</span><b class="' + (warn ? 'down' : '') + '">' + v + '</b></div>';
        setHTML($('#inCard'), '<div class="pg-row"><b style="font-size:18px">$' + esc(tk.ticker) + '</b><span class="dim">' + esc(tk.name) + '</span><span class="pg-lvl ' + (left <= 5 ? 'down' : '') + '">' + left + 's</span></div>' + bar(left / 20 * 100, left <= 5 ? '#ff4d5e' : '#f4b23e') +
          row('Age', ago(gm.sim.t - tk.born)) + row('Holders', r.holders) + row('Top 10 hold', Math.round(r.top10) + '%', r.top10 > 45) + row('Dev holds', (r.dev != null ? Math.round(r.dev * 10) / 10 : '?') + '%', r.dev > 8) + row('Snipers', (r.snipers != null ? Math.round(r.snipers * 10) / 10 : '?') + '%', r.snipers > 15) + row('Bundled', (r.bundle != null ? Math.round(r.bundle) : '?') + '%', r.bundle > 20) +
          row('Socials', [so.x ? 'X' : null, so.tg ? 'Telegram' : null, so.web ? 'Website' : null].filter(Boolean).join(' · ') || 'none', !so.x && !so.tg && !so.web) + row('Market cap', BH.fmt.usd(gm.sim.mc(tk))) +
          '<div class="row-btns" style="margin-top:12px"><button class="btn buy" data-in="safe">Safe</button><button class="btn sell" data-in="rug">Rug</button></div>');
      }
      setHTML($('#inScore'), '<div class="kv"><span>Right · wrong</span><b>' + this.score.right + ' · ' + this.score.wrong + '</b></div><div class="kv"><span>Streak</span><b>' + this.streak + '</b></div>');
    },
  };
  BH.addApp('inspector', 'Inspector', 'search-check', '#3fd2c7', insp);

  // ---------------- Bots ----------------
  BH.addApp('bots', 'Bots', 'bot', '#a77bff', {
    build(el) {
      const T = BH.Bots.TRIGS;
      el.innerHTML = '<div class="xp pg"><h1>' + icon('bot', 'lg') + 'Trading bots <span class="dim">· rules that trade for you, even while you sleep</span></h1>' +
        '<div class="card"><h2>New bot</h2><div class="pg-form">' +
        '<label>When<select id="btT">' + Object.keys(T).map((k) => '<option value="' + k + '">' + T[k].name + '</option>').join('') + '</select></label>' +
        '<label>On coins under ($)<input id="btM" value="50000"></label><label>Buy (SOL)<input id="btB" value="0.1"></label><label>Take profit (x)<input id="btP" value="2"></label><label>Stop loss (%)<input id="btS" value="30"></label>' +
        '<button class="btn primary" id="btGo">' + icon('plus', 'sm') + 'Start bot</button></div><p class="note">Each bot buys each coin once, holds at most 2 coins at a time, and sets your take-profit and stop-loss orders for you. It trades from your wallet, so keep some SOL in it. Up to 5 bots.</p></div>' +
        '<div class="grid-2"><div class="card"><h2>Your bots</h2><div id="btList"></div></div><div class="card"><h2>Bot log</h2><div id="btLog"></div></div></div></div>';
      el.addEventListener('click', (e) => {
        const b = game().sys.bots;
        if (e.target.closest('#btGo')) { toast(b.add({ trig: $('#btT').value, maxMc: $('#btM').value, buy: $('#btB').value, tp: $('#btP').value, sl: $('#btS').value })); $('#btList')._h = null; return; }
        const t = e.target.closest('[data-bt]'); if (t) { toast(t.dataset.do === 'rm' ? b.remove(t.dataset.bt) : b.toggle(t.dataset.bt)); $('#btList')._h = null; }
      });
    },
    render() {
      const gm = game(), b = gm && gm.sys && gm.sys.bots; if (!b) return;
      const T = BH.Bots.TRIGS;
      setHTML($('#btList'), b.rules.length ? b.rules.map((r) => '<div class="pg-sk"><div class="pg-row"><b>' + r.id + '</b><span class="dim">' + T[r.trig].name + ' · under ' + BH.fmt.usd(r.maxMc) + '</span><span class="pg-lvl ' + (r.pnl >= 0 ? 'up' : 'down') + '">' + (r.pnl >= 0 ? '+' : '') + r.pnl.toFixed(3) + ' SOL</span></div><div class="note">Buy ' + r.buy + ' SOL · sell at ' + r.tp + 'x or −' + r.sl + '% · ' + r.trades + ' trades, ' + r.wins + ' wins · holding ' + r.coins.length + '</div><div class="row-btns"><button class="btn sm" data-bt="' + r.id + '">' + (r.on ? 'Pause' : 'Resume') + '</button><button class="btn sm sell" data-bt="' + r.id + '" data-do="rm">Remove</button></div></div>').join('') : '<p class="note">No bots yet.</p>');
      setHTML($('#btLog'), b.log.length ? b.log.slice(0, 14).map((l) => '<div class="logline">Day ' + l.day + ' · ' + esc(l.text) + '</div>').join('') : '<p class="note">Nothing yet.</p>');
    },
  });

  // ---------------- Hotkeys ----------------
  const ACTIONS = [['buy0', 'Buy preset 1', 'Digit1'], ['buy1', 'Buy preset 2', 'Digit2'], ['buy2', 'Buy preset 3', 'Digit3'], ['buy3', 'Buy preset 4', 'Digit4'], ['sell0', 'Sell preset 1 (25%)', 'KeyQ'], ['sell1', 'Sell preset 2 (50%)', 'KeyW'], ['sell2', 'Sell preset 3 (75%)', 'KeyE'], ['sell3', 'Sell preset 4 (100%)', 'KeyR'], ['panic', 'Panic: sell every bag', 'Shift+KeyX'], ['last', 'Open the last coin', 'KeyL'], ['pulse', 'Go to Pulse', 'KeyP']];
  const binds = () => { const s = UI.settings; s.keys = s.keys || {}; return s.keys; };
  const keyOf = (id) => binds()[id] || ACTIONS.find((a) => a[0] === id)[2];
  const pretty = (k) => k.replace('Digit', '').replace('Key', '').replace('Shift+', 'Shift + ');
  const combo = (e) => (e.shiftKey ? 'Shift+' : '') + (e.ctrlKey ? 'Ctrl+' : '') + e.code;
  const cfg = () => (UI.settings.instant && UI.settings.instant.presets ? UI.settings.instant.presets[UI.settings.instant.p || 0] : null);
  const run = (id) => {
    const gm = game(), P = cfg();
    if (id === 'panic') { let n = 0; for (const [cid, p] of gm.player.pos) if (p.tokens > 1) { UI.trade('sell', 1, cid); n++; } UI.toast(n ? 'info' : 'fail', n ? 'Panic sell: selling ' + n + ' bag' + (n > 1 ? 's' : '') : 'No bags to sell'); return; }
    if (id === 'last') { if (UI.lastTok && gm.sim.byId.get(UI.lastTok)) UI.openToken(UI.lastTok); return; }
    if (id === 'pulse') { UI.go('pulse'); return; }
    if (!UI.tokenId || !P) return;
    if (id.startsWith('buy')) { const usd = UI.settings.unit === 'usd', v = (usd ? P.usd : P.buys)[+id.slice(3)]; if (v) UI.trade('buy', usd ? v / BH.C.SOL_USD : v, UI.tokenId); }
    if (id.startsWith('sell')) { const v = P.sells[+id.slice(4)]; if (v) UI.trade('sell', v / 100, UI.tokenId); }
  };
  // remember the coin you had open, for "last coin"
  const origOpen = UI.openToken; UI.openToken = function (id) { if (UI.tokenId && UI.tokenId !== id) UI.lastTok = UI.tokenId; return origOpen.apply(this, arguments); };
  let capturing = null;
  document.addEventListener('keydown', (e) => {
    if (capturing) { e.preventDefault(); e.stopImmediatePropagation(); if (e.code === 'Escape') { capturing = null; } else if (!/^(Shift|Control|Alt|Meta)/.test(e.code)) { binds()[capturing] = combo(e); UI.saveSettings(); capturing = null; } const el = $('#hkList'); if (el) el._h = null; return; }
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const c = combo(e);
    for (const [id, , def] of ACTIONS) {
      const k = keyOf(id);
      if (c === k && (k !== def || id === 'panic' || id === 'last')) { e.preventDefault(); e.stopImmediatePropagation(); run(id); return; }
      if (c === def && k !== def) { e.preventDefault(); e.stopImmediatePropagation(); return; }   // the old key of a rebound action does nothing now
    }
  }, true);
  BH.addApp('hotkeys', 'Hotkeys', 'keyboard', '#e8ecf3', {
    build(el) {
      el.innerHTML = '<div class="xp pg"><h1>' + icon('keyboard', 'lg') + 'Hotkeys <span class="dim">· click a key to change it, Esc to cancel</span></h1><div class="card" id="hkList"></div><button class="btn sm" id="hkReset">Reset to defaults</button></div>';
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-hk]'); if (b) { capturing = b.dataset.hk; $('#hkList')._h = null; this.render(); return; } if (e.target.closest('#hkReset')) { UI.settings.keys = {}; UI.saveSettings(); $('#hkList')._h = null; } });
    },
    render() { setHTML($('#hkList'), ACTIONS.map(([id, name]) => '<div class="kv"><span>' + name + '</span><button class="btn sm hk" data-hk="' + id + '">' + (capturing === id ? 'press a key…' : pretty(keyOf(id))) + '</button></div>').join('')); },
  });

  // ---------------- quick price alerts in the instant panel, and the gut feeling in the token header ----------------
  const origInst = UI.renderInstant;
  if (origInst) UI.renderInstant = function () {
    const out = origInst.apply(this, arguments);
    try {
      const el = $('#instant'); if (!el || el.hidden || el.classList.contains('editing') || !UI.tokenId) return out;
      let a = el.querySelector('.in-alerts');
      // your Charting skill's read on this coin (right more often as Charting levels up)
      const gm2 = game(), pr = gm2.sys.progress, tk2 = gm2.sim.byId.get(UI.tokenId), gt = pr && tk2 && pr.gut(tk2);
      let gu = el.querySelector('.in-gut');
      if (gt) { if (!gu) { gu = document.createElement('div'); gu.className = 'in-gut'; const foot = el.querySelector('.in-foot'); if (foot) foot.before(gu); else el.appendChild(gu); }
        const gh = '<span>' + icon('sparkles', 'sm') + 'Gut feeling</span><b class="' + (gt.read === 'runner' ? 'up' : gt.read === 'rug' ? 'down' : '') + '">' + gt.text + '</b><span class="dim">' + gt.conf + '%</span>';
        if (gu._h !== gh) { gu._h = gh; gu.innerHTML = gh; gu.title = 'Your Charting skill (level ' + pr.lvl('chart') + ') reads this coin. It is right about ' + gt.conf + '% of the time.'; } }
      if (!a) { a = document.createElement('div'); a.className = 'in-alerts'; a.innerHTML = '<span>' + icon('bell', 'sm') + 'Alert me at</span><button data-al="1.5">+50%</button><button data-al="2">2x</button><button data-al="0.7">−30%</button>'; const foot = el.querySelector('.in-foot'); if (foot) foot.before(a); else el.appendChild(a); }
    } catch (e) { /* decoration only */ }
    return out;
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('#instant [data-al]'); if (!b) return;
    e.stopPropagation();
    const gm = game(), tk = gm.sim.byId.get(UI.tokenId); if (!tk) return;
    const mc = gm.sim.mc(tk) * +b.dataset.al, o = gm.sys.orders && gm.sys.orders.add(tk.id, 'alert', mc, 1);
    UI.toast(o ? 'info' : 'fail', o ? 'Alert set: $' + tk.ticker + ' at ' + BH.fmt.usd(mc) + '. You\'ll get pinged anywhere, even away from the desk.' : 'Could not set the alert');
  }, true);
  // (the gut feeling lives in the instant-trade panel: the token header is already full)
  // suites: History and Bots in Trade, You and Hotkeys in Life, Inspector in Safety
  const S = BH.Suites || [];
  const put = (suite, id) => { const s = S.find((x) => x.id === suite); if (s && !s.apps.includes(id)) s.apps.push(id); };
  put('trade', 'history'); put('trade', 'bots'); put('life', 'skills'); put('life', 'hotkeys'); put('safety', 'inspector');
  if (BH.ViewDesc) Object.assign(BH.ViewDesc, {
    skills: 'Your trader skills and their perks, your mood, and how things stand with Dex, Mom and the group chat.',
    history: 'Every trade you closed. Replay jumps the chart to the moment you bought, with your buys and sells marked.',
    inspector: 'Read a fresh coin\'s numbers and call it safe or rug in 20 seconds. Right calls pay and build trust.',
    bots: 'Build trading bots from simple rules. They buy, set your take-profit and stop-loss, and keep their own P&L.',
    hotkeys: 'Change the trading keys. Includes panic sell (sell every bag) and "open the last coin".',
  });
  const css = document.createElement('style');
  css.textContent = '.pg .pg-sk{margin-bottom:12px}.pg-row{display:flex;align-items:center;gap:8px}.pg-lvl{margin-left:auto;font-weight:800;color:#f4b23e}.pg-bar{display:block;height:6px;border-radius:3px;background:#1d222a;overflow:hidden;margin:6px 0 3px}.pg-bar i{display:block;height:100%}' +
    '.pg-mood{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:8px;background:#11141a;margin-bottom:10px}.pg-mood.good{background:rgba(43,214,123,.1)}.pg-mood.bad{background:rgba(255,77,94,.1)}.pg-mood span{color:var(--text-2);font-size:12.5px}' +
    '.pg-form{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}.pg-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-2)}.pg-form input,.pg-form select{width:120px;height:30px;background:var(--bg-2);border:1px solid var(--line-2);color:var(--text);border-radius:6px;padding:0 8px}.pg-form select{width:220px}' +
    '.hk{min-width:110px;justify-content:center}#instant .in-alerts{display:flex;align-items:center;gap:4px;padding:4px 8px;font-size:11px;color:var(--text-2)}#instant .in-alerts span{display:flex;align-items:center;gap:4px;margin-right:auto}#instant .in-alerts button{height:22px;padding:0 8px;border-radius:5px;background:var(--bg-2);border:1px solid var(--line-2);color:var(--text);font-weight:700;font-size:11px}#instant .in-alerts button:hover{border-color:#f4b23e}#instant .in-gut{display:flex;align-items:center;gap:6px;padding:2px 8px 4px;font-size:11px;color:var(--text-2)}#instant .in-gut span:first-child{display:flex;align-items:center;gap:4px}#instant .in-gut b{font-weight:700}#instant .in-gut .dim{margin-left:auto}';
  document.head.appendChild(css);
})(window);
