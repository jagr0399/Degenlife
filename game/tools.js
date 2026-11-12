/* Phase 4, Toolkit: your own sniper bot (8), detective mode (10), wallet laundering (21, fiction only),
   phishing DMs you have to spot (36), and a hardware wallet + home safe (35). No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const C = BH.C;
  const FATE_WORD = { doa: 'dead on arrival', rug: 'a rug', pnd: 'a pump and dump', whale: 'a whale play', runner: 'a real runner', mega: 'a mega-runner (Max-style)' };
  const PHISH = [
    { from: 'Phantasm Support', text: 'Your wallet has been flagged. Verify within 24h or funds will be frozen: phantasm-support-verify.co/restore', scam: true, tell: 'Real support never DMs you first, and that is not their domain.' },
    { from: 'BonkPad Airdrop', text: 'Congrats! You qualify for 4,200 $BPAD. Claim: bonkpad.claims-airdrop.xyz', scam: true, tell: 'Unasked-for airdrop + a weird domain = drainer.' },
    { from: 'Chirp Verification', text: 'Get your blue check free today. Connect wallet: chirp-verify.app', scam: true, tell: 'Verification never asks you to connect a wallet.' },
    { from: 'Nova', text: 'yo I shipped the holder dashboard I told you about, no wallet needed: novabuilds.dev/holders', scam: false, tell: 'A friend, a known site, and it asks for nothing.' },
    { from: 'A famous KOL', text: 'loved your last call. sending you 2 SOL as thanks, just sign the receive tx: kol-gift.link', scam: true, tell: 'You never have to sign anything to RECEIVE SOL.' },
    { from: 'LaunchLab ops', text: 'Weekly fee report attached (no login): reports.launchlab.internal/week', scam: false, tell: 'Internal, expected, no wallet.' },
    { from: 'Job offer', text: 'We love your trading! Paid role, $8k/mo. Run our "trading test" app first: degen-careers.exe', scam: true, tell: 'Never run an .exe from a stranger.' },
    { from: 'Mom', text: 'Honey I set up a wallet like you said, is this the right word list to send you? (12 words)', scam: false, tell: 'Not a scam, but tell her NEVER to send anyone her seed phrase.', momSeed: true },
  ];

  function Tools(game, saved) {
    this.game = game;
    this.sniper = { on: false, speed: 1, gas: 1, size: 0.1, tp: 2, sl: 0.5, maxDev: 8, maxBundle: 15, needSocials: true, narrative: '', dailyCap: 2, spentDay: 0, spent: 0, buys: 0, wins: 0, losses: 0, pnl: 0, open: [] };
    this.cases = []; this.skill = 1;
    this.inbox = []; this.phished = 0; this.reported = 0;
    this.cold = 0; this.hw = false; this.safe = false; this.burgled = 0; this.lastDay = 0; this.launderLog = [];
    if (saved) Object.assign(this, saved, { game });
  }
  const P = Tools.prototype;
  P.save = function () { const o = Object.assign({}, this); delete o.game; delete o.hooks; return o; };
  const R = (s) => s.game.sim.r;

  // ---------------- 8. sniper bot ----------------
  const UPG = { speed: [0, 300, 900, 2500, 6000], gas: [0, 200, 600, 1500, 4000] };
  P.upgrade = function (k) {
    const s = this.sniper, lvl = s[k]; if (!UPG[k]) return { ok: false };
    if (lvl >= 5) return { ok: false, reason: 'Maxed out' };
    const cost = UPG[k][lvl]; if (!this.game.bills.pay(cost)) return { ok: false, reason: 'Upgrade costs $' + cost };
    s[k]++; return { ok: true, text: (k === 'speed' ? 'Bot speed' : 'Gas strategy') + ' level ' + s[k] + '.' };
  };
  P.setSniper = function (k, v) {
    const s = this.sniper;
    if (k === 'on') s.on = !s.on;
    else if (k === 'needSocials') s.needSocials = !s.needSocials;
    else if (k === 'narrative') s.narrative = v || '';
    else if (['size', 'tp', 'sl', 'maxDev', 'maxBundle', 'dailyCap'].includes(k)) { const n = +v; if (!(n >= 0)) return { ok: false, reason: 'Bad number' }; s[k] = n; }
    return { ok: true, text: k === 'on' ? (s.on ? 'Sniper bot armed.' : 'Sniper bot off.') : 'Saved.' };
  };
  P.onLaunch = function (tk) {
    const s = this.sniper, gm = this.game, p = gm.player;
    if (!s.on || tk.isPlayer) return;
    if (s.spentDay !== gm.clock.day) { s.spentDay = gm.clock.day; s.spent = 0; }
    if (s.spent + s.size > s.dailyCap || p.sol < s.size + 0.01) return;
    const risk = gm.sim.risk(tk);
    if (risk.dev > s.maxDev || risk.bundle > s.maxBundle) return;
    if (s.needSocials && !(tk.socials && (tk.socials.x || tk.socials.tg))) return;
    if (s.narrative && tk.narrative !== s.narrative) return;
    // speed decides whether you beat the NPC snipers into the first block
    const prio = s.speed >= 3 ? C.FAST_PRIORITY : 0.0005 * s.gas;
    const res = p.buy(tk.id, s.size, { priority: prio, slippage: 0.3 + s.gas * 0.05 });
    if (res.ok) { s.spent += s.size; s.buys++; s.open.push({ coin: tk.id, ticker: tk.ticker }); }
  };
  P.botStep = function () {
    const s = this.sniper, p = this.game.player;
    for (let i = s.open.length - 1; i >= 0; i--) {
      const o = s.open[i], pos = p.pos.get(o.coin);
      if (!pos) { if (!o.filled) { o.wait = (o.wait || 0) + 1; if (o.wait > 40) s.open.splice(i, 1); continue; } s.open.splice(i, 1); continue; }
      o.filled = true;
      const mult = pos.cost > 0 ? p.markValue(pos) / pos.cost : 1;
      if ((mult >= s.tp || mult <= s.sl) && !o.selling) {
        o.selling = true;
        const r = p.sell(o.coin, 1, { priority: 0.001, slippage: 0.5 });
        if (r.ok) { if (mult >= s.tp) s.wins++; else s.losses++; s.pnl += pos.cost * (mult - 1); }
      }
    }
  };

  // ---------------- 10. detective mode ----------------
  P.investigate = function (coinId) {
    const gm = this.game, sim = gm.sim, tk = sim.byId.get(coinId);
    if (!tk || tk.dead) return { ok: false, reason: 'Coin is gone' };
    if (this.cases.some((c) => c.coin === coinId)) return { ok: false, reason: 'Already investigated' };
    if (!gm.bills.pay(20)) return { ok: false, reason: 'Data tools cost $20 per case' };
    gm.clock.advanceHours(1);
    const rr = R(this), acc = Math.min(0.92, 0.55 + this.skill * 0.07);
    const linked = Array.from(tk.holders.values()).filter((h) => h.tokens > 0 && (h.kind === 'insider' || h.kind === 'bundler' || h.kind === 'dev'));
    const found = linked.filter(() => rr() < acc);
    const truth = tk.fate2 || (tk.rugged ? 'rug' : 'doa');
    const guess = rr() < acc ? truth : ['doa', 'rug', 'pnd', 'whale', 'runner', 'mega'][rr.int(0, 5)];
    const share = found.reduce((a, h) => a + h.tokens, 0) / C.TOTAL_SUPPLY * 100;
    const c = { coin: coinId, ticker: tk.ticker, day: gm.clock.day, wallets: found.length, share: +share.toFixed(1), sameSource: tk.hint ? tk.hint.insiders : found.length, guess, truth, verdict: FATE_WORD[guess], solved: null };
    this.cases.unshift(c); if (this.cases.length > 20) this.cases.length = 20;
    this.skill = Math.min(5, this.skill + 0.15);
    return { ok: true, text: 'Case on $' + tk.ticker + ': ' + found.length + ' linked wallets hold ' + c.share + '%. Your read: ' + c.verdict + '.' };
  };
  P.publish = function (coinId) {
    const c = this.cases.find((x) => x.coin === coinId); if (!c || c.published) return { ok: false, reason: 'Nothing to publish' };
    c.published = true;
    const right = c.guess === c.truth, t = this.game.sys.trencher;
    if (t) { t.bump('trust', right ? 5 : -6); t.bump('followers', right ? 0.03 : -0.01); }
    const tk = this.game.sim.byId.get(coinId); if (tk && (c.guess === 'rug' || c.guess === 'pnd')) tk.hype *= 0.6;
    return { ok: true, text: right ? 'Your thread was right. Trust +5, followers +3%.' : 'You called it wrong in public. Trust −6.' };
  };

  // ---------------- 21. laundering (fiction): hop funds through fresh wallets to cool heat ----------------
  P.launder = function (hops) {
    hops = Math.max(1, Math.min(6, Math.round(+hops || 2)));
    const gm = this.game, b = gm.sys.biz, p = gm.player;
    const fee = 0.02 * hops; if (p.sol < fee + 0.05) return { ok: false, reason: 'You need ' + fee.toFixed(2) + ' SOL for fees' };
    p.sol -= fee; gm.clock.advanceHours(hops * 0.5);
    const caught = b && b.heat > 50 && R(this)() < 0.5 / hops;
    if (b) { if (caught) b.addHeat(12, 'Sloppy wallet hops got linked'); else b.addHeat(-hops * 6); }
    this.launderLog.unshift({ day: gm.clock.day, hops, fee, caught });
    if (this.launderLog.length > 12) this.launderLog.length = 12;
    return { ok: true, text: caught ? 'A sleuth linked the hops anyway. Heat +12.' : hops + ' hops through fresh wallets. Heat −' + hops * 6 + '.' };
  };

  // ---------------- 36. phishing ----------------
  P.dm = function () {
    const rr = R(this), m = PHISH[rr.int(0, PHISH.length - 1)];
    this.inbox.unshift(Object.assign({ id: 'dm' + rr.int(1, 1e9), day: this.game.clock.day, state: 'new' }, m));
    if (this.inbox.length > 15) this.inbox.length = 15;
  };
  P.openLink = function (id) {
    const m = this.inbox.find((x) => x.id === id); if (!m || m.state !== 'new') return { ok: false, reason: 'Already handled' };
    m.state = 'opened';
    const p = this.game.player;
    if (m.scam) { const lost = p.sol * (this.hw ? 0.05 : 0.35); p.sol -= lost; this.phished++; this.game.life.bump('sanity', -10); return { ok: false, reason: 'Drainer. ' + lost.toFixed(2) + ' SOL gone from your hot wallet.' + (this.hw ? ' Your hardware wallet saved the rest.' : ' Keep savings in a hardware wallet.') + ' Tell: ' + m.tell }; }
    if (m.momSeed) return { ok: true, text: 'You call Mom and make her promise to never send those words to anyone. Even you.' };
    this.game.life.bump('sanity', 2);
    return { ok: true, text: 'Safe. ' + m.tell };
  };
  P.report = function (id) {
    const m = this.inbox.find((x) => x.id === id); if (!m || m.state !== 'new') return { ok: false, reason: 'Already handled' };
    m.state = 'reported';
    if (m.scam) { this.reported++; const t = this.game.sys.trencher; if (t) t.bump('trust', 1); return { ok: true, text: 'Reported. Good eye. ' + m.tell }; }
    return { ok: true, text: 'That one was actually fine. ' + m.tell };
  };

  // ---------------- 35. hardware wallet + safe ----------------
  P.buyHw = function () { if (this.hw) return { ok: false, reason: 'You have one' }; if (!this.game.bills.pay(150)) return { ok: false, reason: 'A hardware wallet costs $150' }; this.hw = true; return { ok: true, text: 'Hardware wallet set up. Move savings into cold storage.' }; };
  P.buySafe = function () { if (this.safe) return { ok: false, reason: 'You have one' }; if (!this.game.bills.pay(400)) return { ok: false, reason: 'A safe costs $400' }; this.safe = true; return { ok: true, text: 'Safe bolted to the floor. Cash at home is protected.' }; };
  P.deposit = function (amt) { if (!this.hw) return { ok: false, reason: 'Buy a hardware wallet first' }; amt = Math.min(+amt || 0, this.game.player.sol); if (!(amt > 0)) return { ok: false, reason: 'Enter an amount' }; this.game.player.sol -= amt; this.cold += amt; return { ok: true, text: amt.toFixed(2) + ' SOL moved to cold storage. It can\'t be traded or drained.' }; };
  P.withdraw = function (amt) { amt = Math.min(+amt || 0, this.cold); if (!(amt > 0)) return { ok: false, reason: 'Enter an amount' }; this.cold -= amt; this.game.player.sol += amt; this.game.clock.advanceHours(0.5); return { ok: true, text: amt.toFixed(2) + ' SOL back in your hot wallet (it took 30 minutes to find the cable).' }; };

  P.afterTime = function () {
    const gm = this.game, day = gm.clock.day, rr = R(this);
    if (this.lastDay === day) return;
    this.lastDay = day;
    if (day > 1 && rr() < 0.6) this.dm();
    if (!this.safe && gm.bills.cash > 2500 && rr() < 0.06) {
      const lost = Math.round(gm.bills.cash * 0.25); gm.bills.pay(lost); this.burgled++;
      gm.emit('toast', { kind: 'bad', text: 'Break-in! $' + lost.toLocaleString() + ' in cash is gone. A safe would have stopped it.' });
      if (gm.sys.world) gm.sys.world.headline('Break-ins reported in your building. Police say "maybe stop posting your PnL".');
    }
  };

  BH.Tools = Tools;
  BH.Systems = BH.Systems || [];
  BH.Systems.push({ name: 'tools', create(game, saved) { const t = new Tools(game, saved); t.hooks = { launch: (tk) => t.onLaunch(tk), step: () => t.botStep() }; return t; } });
  // cold storage counts toward net worth
  if (BH.World) {
    const orig = BH.World.prototype.netUsd;
    BH.World.prototype.netUsd = function () { const t = this.game.sys.tools; return orig.call(this) + (t ? t.cold * C.SOL_USD : 0); };
  }
})(typeof window !== 'undefined' ? window : globalThis);
