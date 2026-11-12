/* Audio: music radio (CC0 lofi playlist), ambience (rain), sound effects and footsteps/typing. Web Audio, three volume channels.
   All files are CC0; see docs/CREDITS.md. Missing files are skipped silently. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};
  const A = 'assets/audio/';
  const FILES = {
    buy: 'sfx/coin-1.ogg', sell: 'sfx/coin-6.ogg', coin: 'sfx/coin-3.ogg', fail: 'sfx/error_004.wav', bad: 'sfx/bong_001.wav', info: 'sfx/pluck_001.wav',
    click: 'sfx/click_002.wav', open: 'sfx/open_001.wav', close: 'sfx/close_001.wav', purchase: 'sfx/purchase.wav', confirm: 'sfx/confirmation_001.wav',
    delivery: 'sfx/confirmation_002.wav', ach: 'sfx/maximize_006.wav', sit: 'sfx/drop_002.wav', door: 'sfx/switch_002.wav', chirp: 'sfx/tick_002.wav',
    select: 'sfx/select_002.wav', glass: 'sfx/glass_002.wav', rug: 'sfx/error_004.wav', step: 'sfx/footsteps.ogg', typing: 'sfx/typing.wav',
    key1: 'sfx/key-001.wav', key2: 'sfx/key-004.wav', key3: 'sfx/key-009.wav', rain: 'amb/rain.ogg',
  };
  // [title, file, station]. More tracks come from assets/audio/music/stations.json ({station, title, author, file}).
  const MUSIC = [['Lofi Loop', 'music/lofi-loop.ogg', 'Lofi'], ['Chill Lofi', 'music/chill-lofi.ogg', 'Lofi'], ['Lofi Again', 'music/lofi-again.ogg', 'Lofi'], ['Chill (Loopable)', 'music/chill-loopable.mp3', 'Lofi']];
  const STATION_ORDER = ['Lofi', 'Synthwave', 'Jazz', 'Chiptune', 'Ambient'];
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

  const S = {
    ctx: null, buf: {}, gains: {}, vol: { music: 0.45, sfx: 0.7, amb: 0.5 }, radioOn: true, track: 0, station: ls('bh.station') || 'Lofi', shuffle: ls('bh.shuffle') === '1', musicEl: null, rainSrc: null, stepSrc: null, ready: false,
    init(vol) {
      if (this.ctx) return;
      Object.assign(this.vol, vol || {});
      try { this.ctx = new (g.AudioContext || g.webkitAudioContext)(); } catch (e) { return; }
      for (const k of ['sfx', 'amb']) { const gn = this.ctx.createGain(); gn.gain.value = this.vol[k]; gn.connect(this.ctx.destination); this.gains[k] = gn; }
      // music streams through an <audio> element (long files), routed into Web Audio for the volume channel
      const el = this.musicEl = new Audio(); el.preload = 'auto'; el.loop = false;
      el.addEventListener('ended', () => this.next());
      el.volume = this.vol.music;
      for (const [k, f] of Object.entries(FILES)) this.load(k, f);
      fetch(A + 'music/stations.json').then((r) => (r.ok ? r.json() : [])).then((list) => { for (const t of list || []) if (t && t.file && !MUSIC.some((m) => m[1] === t.file)) MUSIC.push([t.title, t.file, t.station || 'Lofi', t.author || '']); if (!this.inStation().length) this.station = 'Lofi'; }).catch(() => {});
      this.ready = true;
    },
    async load(k, f) {
      try { const r = await fetch(A + f); if (!r.ok) return; const ab = await r.arrayBuffer(); this.buf[k] = await this.ctx.decodeAudioData(ab); } catch (e) { /* missing or undecodable: skip */ }
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); if (this.radioOn && this.musicEl && this.musicEl.paused) this.playTrack(); },
    play(k, opts) {
      if (!this.ctx || !this.buf[k]) return null;
      opts = opts || {};
      const src = this.ctx.createBufferSource(); src.buffer = this.buf[k];
      src.playbackRate.value = opts.rate || (0.94 + Math.random() * 0.12);
      const gn = this.ctx.createGain(); gn.gain.value = opts.gain != null ? opts.gain : 1;
      src.connect(gn); gn.connect(this.gains[opts.ch || 'sfx']);
      src.loop = !!opts.loop;
      src.start(0, opts.offset || 0, opts.duration);
      return src;
    },
    forToast(kind) { const k = { buy: 'buy', sell: 'sell', fail: 'fail', error: 'fail', rug: 'bad', bad: 'bad', call: 'chirp', save: null, info: 'info' }[kind]; if (k) this.play(k, { gain: k === 'info' ? 0.5 : 0.9 }); },
    key() { this.play('key' + (1 + Math.floor(Math.random() * 3)), { gain: 0.35 }); },
    // walking: loop the footstep clip while moving
    walking(on, run) {
      if (!this.ctx) return;
      if (on && !this.stepSrc && this.buf.step) this.stepSrc = this.play('step', { loop: true, gain: 0.55, rate: run ? 1.35 : 1 });
      else if (!on && this.stepSrc) { try { this.stepSrc.stop(); } catch (e) { /* stopped */ } this.stepSrc = null; }
      if (on && this.stepSrc) this.stepSrc.playbackRate.value = run ? 1.35 : 1;
    },
    rain(on) {
      if (!this.ctx) return;
      if (on && !this.rainSrc && this.buf.rain) this.rainSrc = this.play('rain', { loop: true, ch: 'amb', gain: 0.8, rate: 1 });
      else if (!on && this.rainSrc) { try { this.rainSrc.stop(); } catch (e) { /* stopped */ } this.rainSrc = null; }
    },
    stations() { const have = new Set(MUSIC.map((m) => m[2])); return STATION_ORDER.filter((s) => have.has(s)).concat([...have].filter((s) => !STATION_ORDER.includes(s))); },
    inStation(st) { st = st || this.station; return MUSIC.map((m, i) => i).filter((i) => MUSIC[i][2] === st); },
    setStation(st) { const list = this.inStation(st); if (!list.length) return; this.station = st; ls('bh.station', st); this.track = this.shuffle ? list[Math.floor(Math.random() * list.length)] : list[0]; this.radioOn = true; this.playTrack(); },
    setShuffle(on) { this.shuffle = !!on; ls('bh.shuffle', on ? '1' : '0'); },
    playIndex(i) { if (!MUSIC[i]) return; this.track = i; this.station = MUSIC[i][2]; ls('bh.station', this.station); this.radioOn = true; this.playTrack(); },
    playTrack() { if (!this.musicEl) return; if (MUSIC[this.track % MUSIC.length][2] !== this.station) { const l = this.inStation(); if (l.length) this.track = l[0]; } const t = MUSIC[this.track % MUSIC.length]; this.musicEl.src = A + t[1]; this.musicEl.volume = this.vol.music; const p = this.musicEl.play(); if (p && p.catch) p.catch(() => {}); },
    next() { const l = this.inStation(); if (!l.length) return; const at = l.indexOf(this.track); this.track = this.shuffle && l.length > 2 ? l.filter((i) => i !== this.track)[Math.floor(Math.random() * (l.length - 1))] : l[(at + 1) % l.length]; if (this.radioOn) this.playTrack(); },
    setRadio(on) { this.radioOn = on; if (!this.musicEl) return; if (on) this.playTrack(); else this.musicEl.pause(); },
    nowPlaying() { return this.radioOn ? MUSIC[this.track % MUSIC.length][0] : 'Off'; },
    nowStation() { return this.radioOn ? this.station : 'Off'; },
    setVol(ch, v) { this.vol[ch] = v; if (ch === 'music' && this.musicEl) this.musicEl.volume = v; else if (this.gains[ch]) this.gains[ch].gain.value = v; },
    // muffle music while seated at a screen? keep simple: duck a little
    duck(on) { if (this.musicEl) this.musicEl.volume = this.vol.music * (on ? 0.6 : 1); },
  };
  S.MUSIC = MUSIC; S.STATION_ORDER = STATION_ORDER;
  BH.Sound = S;
})(window);
