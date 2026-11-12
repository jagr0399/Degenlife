/* ProChart: a TradingView-style candlestick chart on one canvas (our own code and look).
   Wheel = zoom at cursor · drag = pan · drag the price axis = stretch prices (double-click resets) ·
   drag the time axis = widen/narrow candles · drag pane dividers / the bottom edge = resize ·
   crosshair with OHLC readout · timeframes · MC/Price · USD/SOL · Log/% · Vol, EMA, VWAP, RSI ·
   drawing tools (horizontal line, trend, ray, box, fib, note) · B/S/D markers · maximize. */
(function (g) {
  'use strict';
  const BH = g.BH;
  const C = BH.C;
  const COL = { up: '#34d8a0', down: '#ff5f78', grid: 'rgba(255,255,255,0.045)', axis: '#7b828e', text: '#c9ced6', bg: '#050608', brand: '#f4b23e', cross: 'rgba(200,210,225,0.45)', ema1: '#f4b23e', ema2: '#a77bff', vwap: '#4aa8ff', rsi: '#c58cff', draw: '#4aa8ff', sel: '#f4b23e' };
  const AXIS_W = 74, TIME_H = 22, SPLIT_HIT = 5, TOOLS = ['cursor', 'hline', 'trend', 'ray', 'rect', 'fib', 'text', 'alert'];
  const IVS = [[1, '1s'], [5, '5s'], [15, '15s'], [30, '30s'], [60, '1m'], [300, '5m']];
  const LAYOUT_KEY = 'degen.chart.layout';
  const TOOL_ICON = { alert: 'bell', cursor: 'mouse-pointer-2', hline: 'minus', trend: 'trending-up', ray: 'move-up-right', rect: 'square', fib: 'align-justify', text: 'type' };
  const TOOL_TIP = { alert: 'Price alert: click a level', cursor: 'Cursor (Esc)', hline: 'Horizontal line', trend: 'Trend line', ray: 'Ray', rect: 'Box', fib: 'Fib retracement', text: 'Text note' };

  function loadLayout() {
    const d = { vol: 0.18, rsi: 0.2, height: 470, ind: { vol: true, ema: true, vwap: false, rsi: false }, iv: 1, mode: 'linear', series: 'mc', unit: 'usd' };
    try { const s = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}'); return Object.assign(d, s, { ind: Object.assign(d.ind, s.ind || {}) }); } catch (e) { return d; }
  }

  function niceStep(range, target) {
    const raw = range / Math.max(1, target), mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }

  function ProChart(container, opts) {
    opts = opts || {};
    this.root = container;
    this.doc = container.ownerDocument;
    this.win = this.doc.defaultView;
    this.icon = opts.icon || BH.icon || (() => '');
    this.drawings = opts.drawings || new BH.Drawings({});
    this.L = loadLayout();
    this.m = new BH.ChartModel({ priceMode: this.L.mode });
    this.tool = 'cursor';
    this.sel = null; this.hover = null; this.drag = null; this.creating = null;
    this.tk = null; this.now = 0; this.bars = [];
    this.onBubble = opts.onBubble || null;
    this.game = opts.game || null; this.base = opts.assetBase || '../assets/'; this.imgs = {}; this._bub = []; this.showBubbles = true;
    const DISP = { avgBuy: true, avgSell: true, migLine: true, migMark: true, ath: true, mk: { calls: true, you: true, dev: true, sniper: true, kol: true, whale: true, insider: true, firm: true, tracked: true, retail: true } };
    this.L.disp = Object.assign({}, DISP, this.L.disp || {}); this.L.disp.mk = Object.assign({}, DISP.mk, (this.L.disp && this.L.disp.mk) || {});
    this.build();
  }
  const P = ProChart.prototype;

  P.saveLayout = function () { try { this.win.localStorage.setItem(LAYOUT_KEY, JSON.stringify(this.L)); } catch (e) { /* ignore */ } };

  P.build = function () {
    const ic = this.icon, L = this.L;
    const seg = (cls, items) => '<div class="pc-seg ' + cls + '">' + items + '</div>';
    this.root.classList.add('pc');
    this.root.style.height = L.height + 'px';
    this.root.innerHTML =
      '<div class="pc-tools">' +
        seg('pc-ivs', IVS.map(([v, l]) => '<button data-iv="' + v + '">' + l + '</button>').join('')) +
        seg('pc-series', '<button data-series="mc" data-tip="Market cap">MC</button><button data-series="price" data-tip="Price per token">Price</button>') +
        seg('pc-unit', '<button data-unit="usd">USD</button><button data-unit="sol">SOL</button>') +
        seg('pc-mode', '<button data-mode="linear" data-tip="Linear scale">Lin</button><button data-mode="log" data-tip="Log scale">Log</button><button data-mode="percent" data-tip="Percent from the first visible bar">%</button>') +
        seg('pc-bub', '<button data-act="bub" data-tip="Trader bubbles on the chart">PFP</button>') +
        '<button class="pc-btn pc-disp" data-act="disp" data-tip="Choose which lines and markers show">Display ' + ic('chevron-down', 'sm') + '</button>' +
        seg('pc-ind', ['vol', 'ema', 'vwap', 'rsi'].map((k) => '<button data-ind="' + k + '">' + { vol: 'Vol', ema: 'EMA 9/21', vwap: 'VWAP', rsi: 'RSI' }[k] + '</button>').join('')) +
        '<div class="pc-sp"></div>' +
        seg('pc-draw', TOOLS.map((t) => '<button data-tool="' + t + '" data-tip="' + TOOL_TIP[t] + '">' + ic(TOOL_ICON[t], 'sm') + '</button>').join('')) +
        '<button class="pc-btn" data-act="first" data-tip="Jump to the first candle">' + ic('chevrons-left', 'sm') + '</button>' +
        '<button class="pc-btn" data-act="undo" data-tip="Undo drawing (Ctrl+Z)">' + ic('undo-2', 'sm') + '</button>' +
        '<button class="pc-btn" data-act="redo" data-tip="Redo drawing (Ctrl+Y)">' + ic('redo-2', 'sm') + '</button>' +
        '<button class="pc-btn" data-act="shot" data-tip="Save a chart screenshot">' + ic('camera', 'sm') + '</button>' +
        '<button class="pc-btn" data-act="clear" data-tip="Delete all drawings on this coin">' + ic('trash-2', 'sm') + '</button>' +
        '<button class="pc-btn" data-act="max" data-tip="Maximize chart (F)">' + ic('maximize-2', 'sm') + '</button>' +
      '</div>' +
      '<div class="pc-body"><div class="pc-menu" hidden></div><canvas class="pc-cv"></canvas><div class="pc-tip" hidden></div><button class="pc-live" hidden>' + ic('chevrons-right', 'sm') + 'Live</button></div>' +
      '<div class="pc-grip" data-tip="Drag to resize the chart"></div>';
    this.cv = this.root.querySelector('.pc-cv');
    this.ctx = this.cv.getContext('2d');
    this.liveBtn = this.root.querySelector('.pc-live');
    this.liveBtn.onclick = () => { this.m.goLive(); this.draw(); };
    this.root.querySelector('.pc-tools').addEventListener('click', (e) => this.onTool(e));
    this.bind();
    this.syncTools();
  };

  P.syncTools = function () {
    const L = this.L, q = (s) => this.root.querySelectorAll(s);
    for (const b of q('[data-iv]')) b.classList.toggle('on', +b.dataset.iv === L.iv);
    for (const b of q('[data-series]')) b.classList.toggle('on', b.dataset.series === L.series);
    for (const b of q('[data-unit]')) b.classList.toggle('on', b.dataset.unit === L.unit);
    for (const b of q('[data-mode]')) b.classList.toggle('on', b.dataset.mode === L.mode);
    for (const b of q('[data-ind]')) b.classList.toggle('on', !!L.ind[b.dataset.ind]);
    for (const b of q('[data-tool]')) b.classList.toggle('on', b.dataset.tool === this.tool);
    for (const b of q('[data-act="bub"]')) b.classList.toggle('on', this.showBubbles !== false);
    this.root.classList.toggle('pc-drawing', this.tool !== 'cursor');
  };

  P.onTool = function (e) {
    const b = e.target.closest('button'); if (!b) return;
    const L = this.L;
    if (b.dataset.iv) { L.iv = +b.dataset.iv; this.m.goLive(); }
    if (b.dataset.series) L.series = b.dataset.series;
    if (b.dataset.unit) L.unit = b.dataset.unit;
    if (b.dataset.mode) { L.mode = b.dataset.mode; this.m.priceMode = L.mode; this.m.resetPrice(); }
    if (b.dataset.ind) L.ind[b.dataset.ind] = !L.ind[b.dataset.ind];
    if (b.dataset.tool) this.setTool(b.dataset.tool);
    if (b.dataset.act === 'max') this.maximize(!this.root.classList.contains('pc-max'));
    if (b.dataset.act === 'bub') { this.showBubbles = !this.showBubbles; b.classList.toggle('on', this.showBubbles); }
    if (b.dataset.act === 'disp') { this.menuOpen = !this.menuOpen; this.renderMenu(); return; }
    if (b.dataset.act === 'clear' && this.tk) { this.snap(); this.drawings.forCoin(this.tk.id).length = 0; this.sel = null; }
    if (b.dataset.act === 'first') this.firstCandle();
    if (b.dataset.act === 'undo') this.undoDraw();
    if (b.dataset.act === 'redo') this.redoDraw();
    if (b.dataset.act === 'shot') this.screenshot();
    this.saveLayout(); this.syncTools(); this.rebuild(); this.draw();
  };
  // the Display menu: lines and marker types, like a pro terminal
  const DISP_LINES = [['avgBuy', 'Average buy line'], ['avgSell', 'Average sell line'], ['migLine', 'Migration line (graduation market cap)'], ['migMark', 'Migration marker (when it migrated)'], ['ath', 'ATH line']];
  const DISP_MK = [['calls', 'Callouts (calls on the candle)'], ['you', 'My trades'], ['dev', 'Dev trades'], ['sniper', 'Sniper trades'], ['kol', 'KOL trades'], ['whale', 'Whale trades'], ['insider', 'Insider trades'], ['firm', 'My firm\'s trades'], ['tracked', 'Tracked wallets'], ['retail', 'Other traders']];
  P.renderMenu = function () {
    const el = this.root.querySelector('.pc-menu'); if (!el) return;
    el.hidden = !this.menuOpen; if (!this.menuOpen) return;
    const d = this.L.disp, row = (k, label, on, grp) => '<label class="pc-row"><span>' + label + '</span><input type="checkbox" data-disp="' + grp + ':' + k + '"' + (on ? ' checked' : '') + '></label>';
    el.innerHTML = '<div class="pc-mcol"><b>Lines</b>' + DISP_LINES.map(([k, l]) => row(k, l, d[k], 'l')).join('') + '</div><div class="pc-mcol"><b>Markers</b>' + DISP_MK.map(([k, l]) => row(k, l, d.mk[k], 'm')).join('') + '</div>';
    if (!el._bound) {
      el._bound = true;
      el.addEventListener('change', (e) => { const i = e.target.closest('[data-disp]'); if (!i) return; const [g, k] = i.dataset.disp.split(':'); if (g === 'l') this.L.disp[k] = i.checked; else this.L.disp.mk[k] = i.checked; this.saveLayout(); this.draw(); });
      this.win.document.addEventListener('mousedown', (e) => { if (this.menuOpen && !e.target.closest('.pc-menu') && !e.target.closest('[data-act="disp"]')) { this.menuOpen = false; this.renderMenu(); } });
    }
  };
  // undo / redo for drawings on the current coin
  P.snap = function () { if (!this.tk) return; this.hist = this.hist || { u: [], r: [] }; this.hist.u.push(JSON.stringify(this.drawings.forCoin(this.tk.id))); if (this.hist.u.length > 60) this.hist.u.shift(); this.hist.r = []; };
  P.restore = function (json) { const list = this.drawings.forCoin(this.tk.id); list.length = 0; for (const d of JSON.parse(json)) list.push(d); this.sel = null; this.rebuild(); this.draw(); };
  P.undoDraw = function () { const h = this.hist; if (!this.tk || !h || !h.u.length) return; h.r.push(JSON.stringify(this.drawings.forCoin(this.tk.id))); this.restore(h.u.pop()); };
  P.redoDraw = function () { const h = this.hist; if (!this.tk || !h || !h.r.length) return; h.u.push(JSON.stringify(this.drawings.forCoin(this.tk.id))); this.restore(h.r.pop()); };
  P.firstCandle = function () { this.m.rightIdx = this.m.w / this.m.barSpacing - 3; this.m.following = false; this.m.fit(); this.draw(); };
  P.screenshot = function () { const a = this.doc.createElement('a'); a.download = 'chart-' + (this.tk ? this.tk.ticker : 'coin') + '.png'; a.href = this.cv.toDataURL('image/png'); a.click(); };
  P.setTool = function (t) { this.tool = TOOLS.includes(t) ? t : 'cursor'; this.creating = null; this.syncTools(); };
  P.setInterval = function (s) { this.L.iv = s; this.saveLayout(); this.syncTools(); this.rebuild(); this.draw(); };
  P.setPriceMode = function (m) { this.L.mode = m; this.m.priceMode = m; this.m.resetPrice(); this.saveLayout(); this.syncTools(); this.draw(); };
  P.toggleIndicator = function (k, on) { this.L.ind[k] = on == null ? !this.L.ind[k] : !!on; this.saveLayout(); this.syncTools(); this.draw(); };
  P.maximize = function (on) { this.root.classList.toggle('pc-max', on); this.draw(); };
  P.destroy = function () { this.win.removeEventListener('pointermove', this._wm); this.win.removeEventListener('pointerup', this._wu); this.win.removeEventListener('keydown', this._wk); this.root.innerHTML = ''; };

  // value shown on the axis: MC or price, USD or SOL (the model and drawings stay in MC USD)
  P.factor = function () { return (this.L.unit === 'sol' ? 1 / C.SOL_USD : 1) * (this.L.series === 'price' ? 1 / C.TOTAL_SUPPLY : 1); };
  P.fmt = function (v) {
    if (this.L.mode === 'percent') { const pc = this.m.percentOf(v); return (pc >= 0 ? '+' : '') + pc.toFixed(Math.abs(pc) < 10 ? 2 : 1) + '%'; }
    const x = v * this.factor();
    if (this.L.unit === 'usd' && this.L.series === 'mc') return BH.fmt.usd(x);
    if (x === 0) return '0';
    if (Math.abs(x) >= 1000) return x.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (Math.abs(x) >= 1) return x.toFixed(2);
    return x.toPrecision(3);
  };

  // ---- data ----
  P.setData = function (tk, now) {
    if (!tk) return;
    if (!this.tk || this.tk.id !== tk.id) { this.m.goLive(); this.sel = null; this.creating = null; }
    this.tk = tk; this.now = now;
    this.rebuild();
    this.draw();
  };
  P.rebuild = function () {
    if (!this.tk) return;
    this.bars = BH.ChartModel.aggregate(this.tk.candles, this.L.iv, this.now);
    this.m.setBars(this.bars);
    // drawings are stored by time; recompute their bar index for this timeframe
    for (const d of this.drawings.forCoin(this.tk.id)) for (const p of d.points) if (p.t != null) p.i = BH.ChartModel.idxOfT(this.bars, p.t, this.L.iv);
  };
  P.pointAt = function (x, y) {
    const i = this.m.indexOfX(x);
    return { i, p: this.m.priceOfY(y - this.paneTop), t: BH.ChartModel.tOfIdx(this.bars, i, this.L.iv) };
  };

  // ---- layout ----
  P.layout = function () {
    const W = this.cv.clientWidth, H = this.cv.clientHeight, L = this.L;
    const plotW = Math.max(50, W - AXIS_W);
    const avail = H - TIME_H;
    const volH = L.ind.vol ? Math.round(avail * L.vol) : 0, rsiH = L.ind.rsi ? Math.round(avail * L.rsi) : 0;
    const mainH = Math.max(60, avail - volH - rsiH);
    this.paneTop = 0;
    this.lay = { W, H, plotW, mainH, volY: mainH, volH, rsiY: mainH + volH, rsiH, timeY: H - TIME_H };
    this.m.setSize(plotW, mainH);
    return this.lay;
  };
  P.region = function (x, y) {
    const l = this.lay;
    if (l.volH && Math.abs(y - l.volY) <= SPLIT_HIT && x < l.plotW) return 'split-vol';
    if (l.rsiH && Math.abs(y - l.rsiY) <= SPLIT_HIT && x < l.plotW) return 'split-rsi';
    if (y >= l.timeY) return 'time';
    if (x >= l.plotW && y < l.mainH) return 'price';
    if (x < l.plotW && y < l.mainH) return 'main';
    return 'other';
  };

  // ---- input ----
  P.bind = function () {
    const cv = this.cv;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = pos(e);
      const f = Math.exp(-e.deltaY * 0.0015 * (e.ctrlKey ? 3 : 1));
      if (this.region(p.x, p.y) === 'price') this.m.scalePrice(e.deltaY * 0.5); else this.m.zoomAt(Math.min(p.x, this.lay.plotW), f);
      if (this.game && this.game.flags) this.game.flags.chartZoom = true;
      this.draw();
    }, { passive: false });
    cv.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const p = pos(e), reg = this.region(p.x, p.y);
      cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
      if (reg === 'split-vol' || reg === 'split-rsi') { this.drag = { kind: reg, y: p.y, start: reg === 'split-vol' ? this.L.vol : this.L.rsi }; return; }
      if (reg === 'price') { this.drag = { kind: 'price', y: p.y }; return; }
      if (reg === 'time') { this.drag = { kind: 'time', x: p.x }; return; }
      if (reg !== 'main' || !this.tk) return;
      if (this.tool !== 'cursor') {
        const pt = this.pointAt(p.x, p.y);
        if (this.tool === 'alert') { if (this.game && this.game.sys.orders) { const o = this.game.sys.orders.add(this.tk.id, 'alert', pt.p, 1); if (o && BH.UI) BH.UI.toast('info', 'Alert set at ' + this.fmt(pt.p)); } this.setTool('cursor'); this.draw(); return; }
        this.snap();
        if (this.tool === 'hline' || this.tool === 'text') {
          const id = this.drawings.add(this.tk.id, this.tool, [pt], this.tool === 'text' ? { text: 'note' } : null);
          this.sel = id;
          if (this.tool === 'text') this.editText(id, p);
          this.setTool('cursor');
        } else if (!this.creating) {
          this.creating = { kind: this.tool, a: pt, b: pt };
        } else {
          this.sel = this.drawings.add(this.tk.id, this.creating.kind, [this.creating.a, this.creating.b]);
          this.creating = null; this.setTool('cursor');
        }
        this.draw(); return;
      }
      const hb = this.onBubble && this._bub.find((q) => Math.hypot(q.x - p.x, q.y - p.y) <= q.r + 2);
      if (hb) { this.onBubble(hb.b); return; }
      const oh = (this._ord || []).find((q) => Math.abs(q.y - p.y) <= 6);
      if (oh) {
        if (p.x >= oh.x1 - 16 && p.x <= oh.x1) { this.game.sys.orders.remove(oh.o.id); this.draw(); return; }
        this.drag = { kind: 'order', o: oh.o }; return;
      }
      const hit = this.drawings.hitTest(this.tk.id, p.x, p.y, this.m);
      this.sel = hit;
      if (hit) { this.snap(); const pt = this.pointAt(p.x, p.y); this.drag = { kind: 'drawing', id: hit, last: pt }; }
      else this.drag = { kind: 'pan', x: p.x, y: p.y };
      this.draw();
    });
    this._wm = (e) => {
      const p = pos(e);
      const d = this.drag;
      if (d) {
        if (d.kind === 'pan') { this.m.pan(p.x - d.x); this.m.panPrice(p.y - d.y); d.x = p.x; d.y = p.y; }
        if (d.kind === 'price') { this.m.scalePrice(p.y - d.y); d.y = p.y; }
        if (d.kind === 'time') { this.m.zoomAt(this.lay.plotW, Math.exp((p.x - d.x) * 0.006)); d.x = p.x; }
        if (d.kind === 'split-vol' || d.kind === 'split-rsi') {
          const avail = this.lay.H - TIME_H, k = d.kind === 'split-vol' ? 'vol' : 'rsi';
          this.L[k] = Math.max(0.08, Math.min(0.5, d.start - (p.y - d.y) / avail));
        }
        if (d.kind === 'order') this.game.sys.orders.move(d.o.id, this.m.priceOfY(Math.max(0, Math.min(this.lay.mainH, p.y))));
        if (d.kind === 'drawing') {
          const pt = this.pointAt(p.x, p.y);
          this.drawings.move(d.id, pt.i - d.last.i, pt.p - d.last.p, pt.t - d.last.t);
          d.last = pt;
        }
        if (d.kind === 'grip') {
          const h = Math.max(220, Math.min(1400, d.h + (e.clientY - d.y)));
          this.L.height = h; this.root.style.height = h + 'px';
        }
        this.draw(); return;
      }
      if (e.target === cv) {
        this.hover = p;
        const hb = this._bub.find((q) => Math.hypot(q.x - p.x, q.y - p.y) <= q.r + 2);
        this.showTip(hb, p);
        if (this.creating) { this.creating.b = this.pointAt(Math.min(p.x, this.lay.plotW), Math.min(p.y, this.lay.mainH)); }
        const reg = this.region(p.x, p.y);
        cv.style.cursor = reg.startsWith('split') ? 'row-resize' : reg === 'price' ? 'ns-resize' : reg === 'time' ? 'ew-resize' : this.tool !== 'cursor' ? 'crosshair' : (this.tk && this.drawings.hitTest(this.tk.id, p.x, p.y, this.m)) ? 'move' : 'crosshair';
        this.draw();
      }
    };
    this._wu = () => { if (this.drag) { if (this.drag.kind.startsWith('split') || this.drag.kind === 'grip') this.saveLayout(); this.drag = null; } };
    this._wk = (e) => {
      if (/INPUT|TEXTAREA/.test((this.doc.activeElement || {}).tagName || '')) return;
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { this.undoDraw(); e.preventDefault(); return; }
      if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) { this.redoDraw(); e.preventDefault(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) { this.snap(); this.drawings.remove(this.sel); this.sel = null; this.draw(); e.preventDefault(); }
      if (e.key === 'Escape' && (this.creating || this.tool !== 'cursor' || this.root.classList.contains('pc-max'))) { this.creating = null; this.setTool('cursor'); this.maximize(false); e.stopPropagation(); e.preventDefault(); }
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && this.root.isConnected) { this.maximize(!this.root.classList.contains('pc-max')); }
    };
    this.win.addEventListener('pointermove', this._wm);
    this.win.addEventListener('pointerup', this._wu);
    this.win.addEventListener('keydown', this._wk, true);
    cv.addEventListener('pointerleave', () => { this.hover = null; this.showTip(null); this.draw(); });
    cv.addEventListener('dblclick', (e) => {
      const p = pos(e), reg = this.region(p.x, p.y);
      if (reg === 'price') this.m.resetPrice();
      else if (reg === 'main' && this.tk) {
        const hit = this.drawings.hitTest(this.tk.id, p.x, p.y, this.m);
        const d = hit && this.drawings.get(hit);
        if (d && d.kind === 'text') this.editText(hit, p); else this.m.goLive();
      }
      this.draw();
    });
    this.root.querySelector('.pc-grip').addEventListener('pointerdown', (e) => { this.drag = { kind: 'grip', y: e.clientY, h: this.root.offsetHeight }; e.preventDefault(); });
  };
  P.editText = function (id, p) {
    const d = this.drawings.get(id); if (!d) return;
    const inp = this.doc.createElement('input');
    inp.className = 'pc-note'; inp.value = d.text || ''; inp.style.left = (p.x + 4) + 'px'; inp.style.top = (p.y + 38) + 'px';
    this.root.appendChild(inp); inp.focus(); inp.select();
    const done = () => { d.text = inp.value.trim() || 'note'; inp.remove(); this.draw(); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.stopPropagation(); done(); } });
    inp.addEventListener('blur', done);
  };

  // ---- drawing ----
  P.draw = function () {
    const cv = this.cv, ctx = this.ctx;
    const dpr = this.win.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const l = this.layout(), m = this.m, L = this.L;
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    ctx.font = '11px Inter, system-ui, sans-serif';
    this.liveBtn.hidden = m.following || !this.bars.length;
    if (!this.bars.length) { ctx.fillStyle = COL.axis; ctx.fillText('Waiting for trades…', 14, 24); return; }
    const r = m.visibleRange(), bars = this.bars;

    // grid + price labels
    const pr = m.priceRange, lines = [];
    if (L.mode === 'log') {
      const a = Math.log10(pr.lo), b = Math.log10(pr.hi), step = niceStep(b - a, 6);
      for (let v = Math.ceil(a / step) * step; v <= b && lines.length < 60; v += step) lines.push(Math.pow(10, v));
    } else {
      const step = niceStep(pr.hi - pr.lo, Math.max(3, Math.floor(l.mainH / 55)));
      for (let v = Math.ceil(pr.lo / step) * step; v <= pr.hi && lines.length < 60; v += step) lines.push(v);
    }
    ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; ctx.fillStyle = COL.axis; ctx.textAlign = 'left';
    for (const v of lines) { const y = Math.round(m.yOfPrice(v)) + 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(l.plotW, y); ctx.stroke(); ctx.fillText(this.fmt(v), l.plotW + 8, y + 4); }
    // time grid + labels
    const tStep = Math.max(1, Math.round(90 / m.barSpacing));
    ctx.textAlign = 'center';
    for (let i = Math.ceil(r.from / tStep) * tStep; i <= r.to; i += tStep) {
      const x = Math.round(m.xOfIndex(i)) + 0.5;
      ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, l.timeY); ctx.stroke();
      ctx.fillText(BH.fmt.clock(Math.max(0, bars[i].t - (this.tk.born || 0))), x, l.timeY + 15);
    }

    // clip to the main pane for candles and overlays
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, l.plotW, l.mainH); ctx.clip();
    const bw = Math.max(1, m.barSpacing * 0.72);
    for (let i = r.from; i <= r.to; i++) {
      const b = bars[i], x = m.xOfIndex(i), up = b.c >= b.o;
      ctx.strokeStyle = ctx.fillStyle = up ? COL.up : COL.down;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, m.yOfPrice(b.h)); ctx.lineTo(Math.round(x) + 0.5, m.yOfPrice(b.l)); ctx.stroke();
      const yo = m.yOfPrice(b.o), yc = m.yOfPrice(b.c);
      ctx.fillRect(x - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yc - yo)));
      if (b.m && m.barSpacing >= 2) {
        const seen = new Set(b.m);
        let k = 0;
        for (const tag of ['B', 'S', 'D']) if (seen.has(tag)) {
          const below = tag === 'B', y = below ? m.yOfPrice(b.l) + 16 + k * 22 : m.yOfPrice(b.h) - 16 - k * 22;
          ctx.fillStyle = tag === 'B' ? COL.up : tag === 'S' ? COL.down : COL.brand;
          ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#f7f8fa'; ctx.stroke();
          ctx.fillStyle = '#05140d'; ctx.font = '800 12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(tag, x, y + 4.2);
          ctx.font = '11px Inter, system-ui, sans-serif'; k++;
        }
      }
    }
    // indicators on price
    const closes = bars.map((b) => b.c);
    const line = (vals, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); let on = false; for (let i = r.from; i <= r.to; i++) { const v = vals[i]; if (v == null) { on = false; continue; } const x = m.xOfIndex(i), y = m.yOfPrice(v); if (on) ctx.lineTo(x, y); else { ctx.moveTo(x, y); on = true; } } ctx.stroke(); ctx.lineWidth = 1; };
    if (L.ind.ema) { line(BH.Ind.ema(closes, 9), COL.ema1); line(BH.Ind.ema(closes, 21), COL.ema2); }
    if (L.ind.vwap) line(BH.Ind.vwap(bars), COL.vwap);
    // migration: a horizontal line at the market cap where the bonding curve completes; the price crosses it sideways
    {
      const gradMc = this.game ? this.game.sim.gradMc(this.tk) : 61600, ym = m.yOfPrice(gradMc), DP = L.disp || {};
      if (DP.migLine !== false && !(ym > 8 && ym < l.mainH)) {   // off screen: pin a small tag to the edge so it never just vanishes
        const top = ym <= 8, yy = top ? 14 : l.mainH - 6; ctx.fillStyle = '#3fd2c7'; ctx.textAlign = 'left';
        ctx.fillText((top ? '▲ ' : '▼ ') + (this.tk.stage === 'amm' ? 'Migrated · ' : 'Migration · ') + this.fmt(gradMc), 10, yy);
      }
      if (DP.migMark !== false && this.tk.migratedAt != null && bars.length) {   // a vertical marker at the moment it migrated
        const mi = Math.floor(BH.ChartModel.idxOfT(bars, this.tk.migratedAt, L.iv));
        if (mi >= r.from && mi <= r.to) { const xm = Math.round(m.xOfIndex(mi)) + 0.5; ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(63,210,199,.7)'; ctx.beginPath(); ctx.moveTo(xm, 0); ctx.lineTo(xm, l.mainH); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#3fd2c7'; ctx.textAlign = 'left'; ctx.fillText('Migrated', xm + 4, l.mainH - 8); }
      }
      if (DP.migLine !== false && ym > 8 && ym < l.mainH) { ctx.setLineDash([6, 5]); ctx.strokeStyle = '#3fd2c7'; ctx.beginPath(); ctx.moveTo(0, ym); ctx.lineTo(l.plotW, ym); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#3fd2c7'; const top = ym < 44; ctx.textAlign = top ? 'right' : 'left'; ctx.fillText(this.tk.stage === 'amm' ? 'Migrated · ' + this.fmt(gradMc) : 'Migration · ' + this.fmt(gradMc), top ? l.plotW - 8 : 10, top ? ym + 14 : ym - 5); }   // near the top it moves to the right, under the line, so it never covers the price readout
    }
    // ATH market cap
    // your average buy / sell market cap on this coin (weighted by tokens, from your fills)
    {
      const DP = L.disp || {}, mine = (this.tk.bubbles || []).filter((b) => b.kind === 'you');
      const avg = (side) => { let sol = 0, tok = 0; for (const b of mine) if (b.side === side && b.mc > 0) { sol += b.sol; tok += b.sol / b.mc; } return tok > 0 ? sol / tok : 0; };
      const hline = (v, col, label) => { const y = m.yOfPrice(v); if (!(y > 8 && y < l.mainH)) return; ctx.setLineDash([8, 4]); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(l.plotW, y); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(label + ' · ' + this.fmt(v), 10, y - 5); (this._tags = this._tags || []).push({ y, col, text: label === 'Avg buy' ? 'AVG B' : 'AVG S' }); };
      if (DP.avgBuy !== false) { const v = avg('buy'); if (v) hline(v, '#34d8a0', 'Avg buy'); }
      if (DP.avgSell !== false) { const v = avg('sell'); if (v) hline(v, '#ff5f78', 'Avg sell'); }
    }
    if (this.tk.athMc && (L.disp || {}).ath !== false) { const ya = m.yOfPrice(this.tk.athMc); if (ya > 8 && ya < l.mainH) { ctx.setLineDash([2, 4]); ctx.strokeStyle = '#f4d03e'; ctx.beginPath(); ctx.moveTo(0, ya); ctx.lineTo(l.plotW, ya); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#f4d03e'; ctx.textAlign = 'right'; ctx.fillText('ATH Market Cap', l.plotW - 8, ya - 5); } }
    // trader bubbles: PFP, green ring = buy, red = sell, gold = you, plus a platform badge
    this._bub = [];
    if (this.showBubbles !== false && this.tk.bubbles && m.barSpacing >= 0.3) {
      // Axiom style: each bubble sits centered over its candle, just above the wick, never on top of the candles.
      // More trades in the same spot stack upward (at most 2 high); the same wallet again shows a count instead;
      // anything that would still overlap is left out, so the chart stays readable. Biggest trades (and yours) win.
      const rad = m.barSpacing >= 7 ? 11 : 9, gap = 3, placed = [];
      // speed (Nov 12): a spatial grid for the overlap test, a lookup for "same wallet nearby", and at most 3 bubbles per
      // candle (the rest fold into a count right away), so thousands of trades no longer make this O(n²)
      const cell = rad * 2 + 2, grid = new Map(), byWallet = new Map(), perCol = new Map();
      const gkey = (x, y) => Math.floor(x / cell) + ',' + Math.floor(y / cell);
      const near = (x, y) => { const out = [], cx = Math.floor(x / cell), cy = Math.floor(y / cell); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const a = grid.get((cx + dx) + ',' + (cy + dy)); if (a) for (const q of a) out.push(q); } return out; };
      const vis = [];
      const mk = (L.disp && L.disp.mk) || {}, trk = this.game && this.game.sys && this.game.sys.tracker;
      for (const b of this.tk.bubbles) {
        const i = Math.floor(BH.ChartModel.idxOfT(bars, b.t, L.iv));
        if (i < r.from || i > r.to || !bars[i]) continue;
        const cat = b.kind === 'you' ? 'you' : trk && trk.get(b.addr) ? 'tracked' : ['dev', 'sniper', 'kol', 'whale', 'insider', 'firm'].includes(b.kind) ? b.kind : 'retail';
        if (mk[cat] === false) continue;
        vis.push({ i, b });
      }
      const rank = (b) => (b.kind === 'you' ? 3 : b.kind === 'dev' || b.kind === 'kol' || b.kind === 'whale' || b.kind === 'firm' ? 2 : 0);
      vis.sort((a, b) => rank(b.b) - rank(a.b) || b.b.sol - a.b.sol);
      const hits = (x, y) => near(x, y).some((q) => Math.hypot(q.x - x, q.y - y) < rad * 2 + 1);
      const put = (q) => { placed.push(q); const k = gkey(q.x, q.y); (grid.get(k) || grid.set(k, []).get(k)).push(q); const w = q.b.addr + '|' + q.b.side; (byWallet.get(w) || byWallet.set(w, []).get(w)).push(q); const c = perCol.get(q.col) || []; c.push(q); perCol.set(q.col, c); };
      for (const v of vis) {
        const x = m.xOfIndex(v.i), bar = bars[v.i];
        const mine = byWallet.get(v.b.addr + '|' + v.b.side), same = mine && mine.find((q) => Math.abs(q.x - x) < rad * 3);
        if (same) { same.all.push(v.b); continue; }
        const col = perCol.get(v.i); if (col && col.length >= 3 && v.b.kind !== 'you') { col[col.length - 1].all.push(v.b); continue; }
        // above the candle's high; if there's no room at the top of the chart, hang it under the low instead
        let y = m.yOfPrice(bar.h) - rad - gap, dir = -1;
        if (y < rad + 2) { y = m.yOfPrice(bar.l) + rad + gap; dir = 1; }
        let level = 0;
        while (level < 2 && hits(x, y)) { y += dir * (rad * 2 + 2); level++; }
        if (hits(x, y) || y < rad || y > l.mainH - rad) {
          // no room: fold it into the nearest bubble's count instead of hiding it
          let best = null, bd = 1e9; for (const q of near(x, y).concat(col || [])) { const dd = Math.abs(q.x - x) + Math.abs(q.y - y) * 0.2; if (dd < bd) { bd = dd; best = q; } }
          if (best) best.all.push(v.b);
          continue;
        }
        put({ x, y, r: rad, b: v.b, all: [v.b], col: v.i });
      }
      placed.sort((a, b) => a.b.sol - b.b.sol);
      for (const q of placed) { this.drawBubble(q.x, q.y, q.r, q.b, q.all.length); this._bub.push(q); }
    }
    // callouts: a flag on the candle each call was made at, with the call's market cap and how it has done since
    this._calls = [];
    if (((L.disp && L.disp.mk) || {}).calls !== false && this.tk.calls && bars.length) {
      const now = this.game ? this.game.sim.mc(this.tk) : 0;
      for (const c of this.tk.calls) {
        const ci = Math.floor(BH.ChartModel.idxOfT(bars, c.t, L.iv)); if (ci < r.from || ci > r.to || !bars[ci]) continue;
        const x = Math.round(m.xOfIndex(ci)) + 0.5, yb = m.yOfPrice(bars[ci].l) + 6, mine = c.who === 'you', col = mine ? '#f4b23e' : '#b59cff';
        const ch = c.mc > 0 && now > 0 ? (now / c.mc - 1) * 100 : 0;
        const label = (mine ? 'YOUR CALL ' : '@' + String(c.who).replace(/^@+/, '') + ' ') + this.fmt(c.mc) + (mine ? ' ' + (ch >= 0 ? '+' : '') + Math.round(ch) + '%' : '');
        ctx.font = '700 10px Inter, system-ui, sans-serif';
        const w = ctx.measureText(label).width + 12, y = Math.min(l.mainH - 20, yb + 10);
        ctx.strokeStyle = col; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(x, m.yOfPrice(bars[ci].l)); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = col; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - 6, y, w, 16, 4); else ctx.rect(x - 6, y, w, 16); ctx.fill();
        ctx.fillStyle = '#0b0d12'; ctx.textAlign = 'left'; ctx.fillText(label, x, y + 11.5);
        this._calls.push({ x: x - 6, y, w, h: 16, c });
      }
      ctx.font = '11px Inter, system-ui, sans-serif';
    }
    // drawings
    for (const d of this.drawings.forCoin(this.tk.id)) this.drawShape(d, d.id === this.sel);
    // your TP / SL / limit orders (drag them to move)
    this._ord = [];
    if (this.game && this.game.sys && this.game.sys.orders) for (const o of this.game.sys.orders.forCoin(this.tk.id)) {
      const yo = m.yOfPrice(o.mc), col = o.kind === 'tp' ? COL.up : o.kind === 'sl' ? COL.down : o.kind === 'alert' ? '#f4d03e' : COL.vwap;
      ctx.strokeStyle = col; ctx.setLineDash([6, 3]); ctx.beginPath(); ctx.moveTo(0, yo); ctx.lineTo(l.plotW, yo); ctx.stroke(); ctx.setLineDash([]);
      const lab = o.kind === 'alert' ? 'ALERT  ' + this.fmt(o.mc) + '  ✕' : (o.kind === 'tp' ? 'TP ' + Math.round(o.amount * 100) + '%' : o.kind === 'sl' ? 'SL ' + Math.round(o.amount * 100) + '%' : 'LIMIT ' + o.amount + ' SOL') + '  ' + this.fmt(o.mc) + '  ✕';
      ctx.font = '600 10.5px Inter, sans-serif'; const w = ctx.measureText(lab).width + 12;
      ctx.fillStyle = col; ctx.fillRect(8, yo - 9, w, 18); ctx.fillStyle = '#05140d'; ctx.textAlign = 'left'; ctx.fillText(lab, 14, yo + 4); ctx.font = '11px Inter, system-ui, sans-serif';
      this._ord.push({ o, y: yo, x0: 8, x1: 8 + w });
    }
    if (this.creating) this.drawShape({ kind: this.creating.kind, points: [this.creating.a, this.creating.b] }, true, true);
    // last price line
    const last = bars[bars.length - 1], ly = m.yOfPrice(last.c);
    ctx.setLineDash([2, 3]); ctx.strokeStyle = last.c >= last.o ? COL.up : COL.down; ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(l.plotW, ly); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // axis tags for the average lines (drawn on the price axis so bubbles never hide them)
    for (const tg of this._tags || []) { ctx.fillStyle = tg.col; ctx.fillRect(l.plotW + 2, tg.y - 8, 58, 16); ctx.fillStyle = '#050608'; ctx.textAlign = 'left'; ctx.fillText(tg.text, l.plotW + 7, tg.y + 4); }
    this._tags = [];
    this.axisTag(ly, this.fmt(last.c), last.c >= last.o ? COL.up : COL.down, '#05140d');

    // volume pane
    if (l.volH) {
      let vmax = 0; for (let i = r.from; i <= r.to; i++) vmax = Math.max(vmax, bars[i].v);
      const top = l.volY + 4, h = l.volH - 6;
      for (let i = r.from; i <= r.to; i++) {
        const b = bars[i], hh = vmax ? b.v / vmax * h : 0;
        ctx.fillStyle = b.c >= b.o ? 'rgba(52,216,160,0.38)' : 'rgba(255,95,120,0.38)';
        ctx.fillRect(m.xOfIndex(i) - bw / 2, top + h - hh, bw, hh);
      }
      this.divider(l.volY, 'Vol ' + BH.fmt.sol(vmax) + ' SOL max');
    }
    // RSI pane
    if (l.rsiH) {
      const rs = BH.Ind.rsi(closes, 14), top = l.rsiY + 6, h = l.rsiH - 10, y = (v) => top + h - v / 100 * h;
      ctx.fillStyle = 'rgba(197,140,255,0.06)'; ctx.fillRect(0, y(70), l.plotW, y(30) - y(70));
      ctx.strokeStyle = COL.grid; for (const v of [30, 70]) { ctx.beginPath(); ctx.moveTo(0, y(v)); ctx.lineTo(l.plotW, y(v)); ctx.stroke(); ctx.fillStyle = COL.axis; ctx.textAlign = 'left'; ctx.fillText(String(v), l.plotW + 8, y(v) + 4); }
      ctx.strokeStyle = COL.rsi; ctx.lineWidth = 1.4; ctx.beginPath(); let on = false;
      for (let i = r.from; i <= r.to; i++) { const v = rs[i]; if (v == null) continue; const x = m.xOfIndex(i); if (on) ctx.lineTo(x, y(v)); else { ctx.moveTo(x, y(v)); on = true; } }
      ctx.stroke(); ctx.lineWidth = 1;
      const lastR = rs[rs.length - 1];
      this.divider(l.rsiY, 'RSI 14' + (lastR != null ? '  ' + lastR.toFixed(1) : ''));
    }
    // axes borders
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(l.plotW + 0.5, 0); ctx.lineTo(l.plotW + 0.5, l.H); ctx.moveTo(0, l.timeY + 0.5); ctx.lineTo(l.W, l.timeY + 0.5); ctx.stroke();

    // crosshair + OHLC readout
    const hv = this.hover;
    let bi = r.to;
    if (hv && hv.x < l.plotW && hv.y < l.timeY && !this.drag) {
      bi = Math.max(r.from, Math.min(r.to, Math.round(m.indexOfX(hv.x))));
      const x = Math.round(m.xOfIndex(bi)) + 0.5;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = COL.cross; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, l.timeY); ctx.moveTo(0, Math.round(hv.y) + 0.5); ctx.lineTo(l.plotW, Math.round(hv.y) + 0.5); ctx.stroke(); ctx.setLineDash([]);
      if (hv.y < l.mainH) this.axisTag(hv.y, this.fmt(m.priceOfY(hv.y)), '#2a2f38', COL.text);
      const tl = BH.fmt.clock(Math.max(0, bars[bi].t - (this.tk.born || 0)));
      ctx.fillStyle = '#2a2f38'; const tw = ctx.measureText(tl).width + 12; ctx.fillRect(x - tw / 2, l.timeY + 2, tw, TIME_H - 4);
      ctx.fillStyle = COL.text; ctx.textAlign = 'center'; ctx.fillText(tl, x, l.timeY + 15);
    }
    const b = bars[bi], ch = b.o ? (b.c / b.o - 1) * 100 : 0, cc = b.c >= b.o ? COL.up : COL.down;
    ctx.textAlign = 'left'; ctx.font = '11.5px Inter, system-ui, sans-serif';
    let x = 10;
    const seg = (label, val, col) => { ctx.fillStyle = COL.axis; ctx.fillText(label, x, 16); x += ctx.measureText(label).width + 3; ctx.fillStyle = col || COL.text; ctx.fillText(val, x, 16); x += ctx.measureText(val).width + 10; };
    ctx.fillStyle = COL.text; ctx.font = '600 11.5px Inter, sans-serif'; const head = '$' + this.tk.ticker + ' · ' + (IVS.find((v) => v[0] === L.iv) || [0, L.iv + 's'])[1] + '  '; ctx.fillText(head, x, 16); x += ctx.measureText(head).width; ctx.font = '11.5px Inter, sans-serif';
    seg('O', this.fmt(b.o), cc); seg('H', this.fmt(b.h), cc); seg('L', this.fmt(b.l), cc); seg('C', this.fmt(b.c), cc); seg('', (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%', cc); seg('Vol', BH.fmt.sol(b.v));
    if (L.ind.ema) { x = 10; ctx.fillStyle = COL.ema1; ctx.fillText('EMA 9', x, 32); ctx.fillStyle = COL.ema2; ctx.fillText('EMA 21', x + 46, 32); }
  };
  P.img = function (i) {
    const k = i % 144;
    let im = this.imgs[k];
    if (!im) { im = this.imgs[k] = new this.win.Image(); im.onload = () => this.draw(); im.src = this.base + 'pfp/p' + String(k + 1).padStart(2, '0') + '.svg'; }
    return im.complete && im.naturalWidth ? im : null;
  };
  P.bubbleSprite = function (b, rad, ring) {
    const dpr = (this.win && this.win.devicePixelRatio) || 1, im = this.img(b.pfp); if (!im) return null;
    const key = (b.pfp % 144) + '|' + ring + '|' + (b.plat || 0) + '|' + rad + '|' + dpr;
    const cache = this._spr || (this._spr = new Map()); let c = cache.get(key); if (c) return c;
    const S = rad * 2 + 6; c = this.win.document.createElement('canvas'); c.width = Math.ceil(S * dpr); c.height = Math.ceil(S * dpr);
    const g = c.getContext('2d'); g.scale(dpr, dpr); const x = S / 2, y = S / 2;
    g.beginPath(); g.arc(x, y, rad + 1, 0, Math.PI * 2); g.fillStyle = '#07080b'; g.fill();
    g.save(); g.beginPath(); g.arc(x, y, rad - 1.5, 0, Math.PI * 2); g.clip(); g.drawImage(im, x - rad, y - rad, rad * 2, rad * 2); g.restore();
    g.beginPath(); g.arc(x, y, rad - 0.75, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = ring; g.stroke();
    const bx = x + rad * 0.72, by = y + rad * 0.72, br = 4.6;
    g.beginPath(); g.arc(bx, by, br + 1.2, 0, Math.PI * 2); g.fillStyle = '#07080b'; g.fill();
    g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fillStyle = ['#f4b23e', '#22c55e', '#60a5fa'][b.plat || 0]; g.fill();
    g.fillStyle = '#07080b'; g.font = '800 6px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('BPF'[b.plat || 0], bx, by + 2.1);
    if (cache.size > 900) cache.clear();
    cache.set(key, c); c._S = S; return c;
  };
  P.drawBubble = function (x, y, rad, b, count) {
    const ctx = this.ctx, ring = b.kind === 'you' ? '#f4b23e' : b.side === 'buy' ? '#22c55e' : '#ef4444';
    const spr = this.bubbleSprite(b, rad, ring);
    if (spr) {
      ctx.drawImage(spr, x - spr._S / 2, y - spr._S / 2, spr._S, spr._S);
      if (count > 1) { ctx.save(); const cx = x - rad * 0.78, cy = y - rad * 0.78; ctx.beginPath(); ctx.arc(cx, cy, 6.2, 0, Math.PI * 2); ctx.fillStyle = '#0b0d12'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#e8ecf3'; ctx.stroke(); ctx.fillStyle = '#e8ecf3'; ctx.font = '700 7.5px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(count > 9 ? '9+' : String(count), cx, cy + 2.6); ctx.restore(); ctx.font = '11px Inter, system-ui, sans-serif'; }
      return;
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, rad + 1, 0, Math.PI * 2); ctx.fillStyle = '#07080b'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, rad - 1.5, 0, Math.PI * 2); ctx.closePath();
    const im = this.img(b.pfp);
    if (im) { ctx.save(); ctx.clip(); ctx.drawImage(im, x - rad, y - rad, rad * 2, rad * 2); ctx.restore(); } else { ctx.fillStyle = '#1f2430'; ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, y, rad - 0.75, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = ring; ctx.stroke();
    // trading-app badge, bottom right
    const bx = x + rad * 0.72, by = y + rad * 0.72, br = 4.6;
    ctx.beginPath(); ctx.arc(bx, by, br + 1.2, 0, Math.PI * 2); ctx.fillStyle = '#07080b'; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fillStyle = ['#f4b23e', '#22c55e', '#60a5fa'][b.plat || 0]; ctx.fill();
    ctx.fillStyle = '#07080b'; ctx.font = '800 6px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BPF'[b.plat || 0], bx, by + 2.1);
    if (count > 1) { const cx = x - rad * 0.78, cy = y - rad * 0.78; ctx.beginPath(); ctx.arc(cx, cy, 6.2, 0, Math.PI * 2); ctx.fillStyle = '#0b0d12'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#e8ecf3'; ctx.stroke(); ctx.fillStyle = '#e8ecf3'; ctx.font = '800 7.5px Inter, sans-serif'; ctx.fillText(count > 9 ? '9+' : String(count), cx, cy + 2.7); }
    ctx.restore(); ctx.font = '11px Inter, system-ui, sans-serif';
  };
  P.showTip = function (hit, p) {
    const tip = this.root.querySelector('.pc-tip');
    if (!hit) { if (!tip.hidden) tip.hidden = true; return; }
    const b = hit.b, tk = this.tk, sim = this.game && this.game.sim;
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const same = (tk.bubbles || []).filter((x) => x.addr === b.addr && x.side === b.side).length;
    let pnl = '';
    if (sim) {
      const h = tk.holders.get(b.addr);
      if (h && h.bought > 0) {
        const val = h.tokens * sim.price(tk), total = val + h.sold - h.bought, unreal = h.tokens > 1 ? val - h.cost : 0;
        const pc = (v, base) => (v >= 0 ? '+' : '') + (base > 0 ? Math.round(v / base * 100) : 0) + '%';
        pnl = (h.tokens > 1 ? '<div class="pt-row"><span>Unrealized PnL</span><b class="' + (unreal >= 0 ? 'up' : 'down') + '">' + (unreal >= 0 ? '+' : '') + unreal.toFixed(3) + ' SOL (' + pc(unreal, h.cost) + ')</b></div>' : '') +
          '<div class="pt-row"><span>' + (h.tokens > 1 ? 'Total' : 'Realized') + ' PnL</span><b class="' + (total >= 0 ? 'up' : 'down') + '">' + (total >= 0 ? '+' : '') + total.toFixed(3) + ' SOL (' + pc(total, h.bought) + ')</b></div>';
      }
    }
    const ago = sim ? sim.t - b.t : 0;
    const thesisHTML = b.thesis ? '<div class="pt-thesis">\u201C' + esc(b.thesis) + '\u201D</div>' : '';
    tip.innerHTML = '<div class="pt-head"><img src="' + this.base + 'pfp/p' + String((b.pfp % 144) + 1).padStart(2, '0') + '.svg"><b>' + esc(b.name) + '</b><span class="pt-plat p' + (b.plat || 0) + '">' + ['Bagholder', 'PumpLab', 'Fomoz'][b.plat || 0] + '</span></div>' +
      '<div class="pt-amt ' + (b.side === 'buy' ? 'up' : 'down') + '">' + b.sol.toFixed(3) + ' SOL</div>' +
      (hit.all && hit.all.length > 1 ? '<div class="pt-more">' + hit.all.length + ' trades here · newest shown</div>' : '') +
      '<div class="pt-sub"><span class="pt-chip ' + b.side + '">' + same + ' ' + (b.side === 'buy' ? 'Buy' : 'Sell') + (same > 1 ? 's' : '') + '</span> @ ' + this.fmt(b.mc) + ' MC, ' + (ago < 60 ? Math.round(ago) + 's' : Math.round(ago / 60) + 'm') + ' ago</div>' + thesisHTML + pnl;
    tip.hidden = false;
    const W = this.cv.clientWidth;
    tip.style.left = Math.min(W - 250, p.x + 14) + 'px'; tip.style.top = Math.max(4, p.y - 20) + 'px';
  };
  P.axisTag = function (y, text, bg, fg) {
    const ctx = this.ctx, l = this.lay;
    ctx.fillStyle = bg; ctx.fillRect(l.plotW + 1, y - 9, AXIS_W - 2, 18);
    ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.font = '600 11px Inter, sans-serif'; ctx.fillText(text, l.plotW + 7, y + 4); ctx.font = '11px Inter, system-ui, sans-serif';
  };
  P.divider = function (y, label) {
    const ctx = this.ctx, l = this.lay;
    ctx.fillStyle = '#0e1116'; ctx.fillRect(0, y - 1, l.W, 3);
    ctx.fillStyle = COL.axis; ctx.textAlign = 'left'; ctx.fillText(label, 8, y + 15);
  };
  P.drawShape = function (d, selected, preview) {
    const ctx = this.ctx, m = this.m, l = this.lay;
    const s = d.points.map((p) => ({ x: m.xOfIndex(p.i), y: m.yOfPrice(p.p) }));
    const col = selected ? COL.sel : COL.draw;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = selected ? 1.8 : 1.3;
    if (preview) ctx.setLineDash([5, 4]);
    if (d.kind === 'hline') { ctx.beginPath(); ctx.moveTo(0, s[0].y); ctx.lineTo(l.plotW, s[0].y); ctx.stroke(); }
    if (d.kind === 'trend' || d.kind === 'ray') {
      let b = s[1];
      if (d.kind === 'ray') { const dx = s[1].x - s[0].x, dy = s[1].y - s[0].y, k = dx ? (l.plotW * 2) / Math.abs(dx) : 0; b = { x: s[0].x + dx * Math.max(1, k), y: s[0].y + dy * Math.max(1, k) }; }
      ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    if (d.kind === 'rect') { ctx.globalAlpha = 0.12; ctx.fillRect(s[0].x, s[0].y, s[1].x - s[0].x, s[1].y - s[0].y); ctx.globalAlpha = 1; ctx.strokeRect(s[0].x, s[0].y, s[1].x - s[0].x, s[1].y - s[0].y); }
    if (d.kind === 'fib') {
      const x0 = Math.min(s[0].x, s[1].x), x1 = Math.max(s[0].x, s[1].x);
      for (const f of BH.Drawings.FIB) {
        const v = d.points[0].p + (d.points[1].p - d.points[0].p) * (1 - f), y = m.yOfPrice(v);
        ctx.globalAlpha = f === 0.5 || f === 0.618 ? 1 : 0.7; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 + 60, y); ctx.stroke();
        ctx.textAlign = 'left'; ctx.fillText(f.toFixed(3) + '  ' + this.fmt(v), x1 + 64, y + 4); ctx.globalAlpha = 1;
      }
    }
    if (d.kind === 'text') { ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(d.text || 'note', s[0].x + 4, s[0].y); ctx.font = '11px Inter, system-ui, sans-serif'; }
    if (selected && !preview) for (const p of s) { ctx.fillStyle = COL.bg; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.setLineDash([]); ctx.lineWidth = 1;
  };

  BH.ProChart = ProChart;
})(window);
