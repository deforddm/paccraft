/* PacCraft — synthesized sound effects, original procedural chiptune music, and haptics.
 * No audio files: everything is made with the Web Audio API. */
var PCAudio = (function () {
  'use strict';
  var ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  var sfxOn = true, musicOn = true, hapticsOn = true;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.45; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.16 : 0; musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type, glideTo, when, vol, bus) {
    var c = ctx; if (!c) return;
    var t = c.currentTime + (when || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.5, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, freq, type, vol, when, q, glideTo) {
    var c = ctx; if (!c) return;
    var t = c.currentTime + (when || 0);
    var s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq || 1000, t); f.Q.value = q || 1;
    if (glideTo) f.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.5, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  // material → [noise centre frequency, thump pitch]
  function material(tile) {
    var T = window.PCWorld.TILE;
    if (tile === T.GRASS || tile === T.DIRT || tile === T.CLAY) return [500, 140];
    if (tile === T.SAND || tile === T.SNOW) return [2200, 200];
    if (tile === T.LEAVES) return [3000, 260];
    if (tile === T.LOG || tile === T.PLANKS) return [800, 170];
    if (tile === T.ICE || tile === T.CRYSTAL) return [3500, 420];
    return [1400, 110]; // stone-ish
  }

  var chomp = 0;
  var S = {
    gem: function () { chomp ^= 1; tone(chomp ? 620 : 820, 0.055, 'triangle', chomp ? 820 : 620, 0, 0.28); },
    crystal: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.09, 'square', null, i * 0.05, 0.18); }); },
    hit: function (d) { var m = material(d && d.tile); noise(0.07, m[0], 'bandpass', 0.5, 0, 1.2); tone(m[1], 0.07, 'sine', m[1] * 0.6, 0, 0.35); },
    mined: function (d) { var m = material(d && d.tile); noise(0.16, m[0], 'bandpass', 0.6, 0, 0.8, m[0] * 0.5); tone(300, 0.08, 'triangle', 640, 0.02, 0.25); if (d && d.drop) { tone(1320, 0.12, 'sine', null, 0.08, 0.3); tone(1760, 0.18, 'sine', null, 0.15, 0.3); } },
    place: function () { tone(190, 0.12, 'sine', 90, 0, 0.5); noise(0.08, 600, 'lowpass', 0.35); },
    nope: function () { tone(150, 0.12, 'square', 120, 0, 0.18); },
    bonk: function () { tone(1500, 0.06, 'sine', 1300, 0, 0.25); tone(2100, 0.05, 'sine', null, 0.03, 0.12); },
    eat: function () { tone(260, 0.28, 'square', 1300, 0, 0.22); noise(0.12, 2000, 'bandpass', 0.2, 0.05); },
    death: function () { tone(760, 1.0, 'square', 90, 0, 0.22); tone(380, 1.0, 'triangle', 60, 0.05, 0.25); noise(0.4, 900, 'bandpass', 0.35, 0.95); },
    clear: function () { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach(function (f, i) { tone(f, 0.16, 'triangle', null, i * 0.1, 0.4); }); },
    food: function () { noise(0.06, 1800, 'bandpass', 0.4); noise(0.06, 1500, 'bandpass', 0.4, 0.09); tone(988, 0.12, 'sine', null, 0.16, 0.35); tone(1319, 0.2, 'sine', null, 0.24, 0.35); },
    extralife: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.14, 'square', null, i * 0.09, 0.2); }); },
    tnt: function () { noise(2.1, 5000, 'highpass', 0.12, 0, 0.5, 2500); tone(900, 0.05, 'square', null, 0, 0.12); },
    boom: function () { noise(0.9, 900, 'lowpass', 1.0, 0, 0.7, 120); tone(90, 0.7, 'sine', 30, 0, 0.8); },
    crumble: function () { noise(0.14, 900, 'bandpass', 0.35); },
    ready: function () { tone(660, 0.1, 'square', null, 0, 0.18); tone(660, 0.1, 'square', null, 0.25, 0.18); },
    go: function () { tone(990, 0.2, 'square', null, 0, 0.2); },
    click: function () { tone(900, 0.04, 'square', null, 0, 0.12); },
    craft: function () { tone(1200, 0.08, 'square', null, 0, 0.14); tone(1800, 0.14, 'triangle', null, 0.07, 0.25); noise(0.05, 4000, 'bandpass', 0.3); tone(2400, 0.2, 'sine', null, 0.16, 0.2); },
    unlock: function () { [659, 880, 1175, 1760].forEach(function (f, i) { tone(f, 0.18, 'triangle', null, i * 0.07, 0.3); }); },
    over: function () { [523, 440, 392, 330, 262].forEach(function (f, i) { tone(f, 0.26, 'triangle', null, i * 0.2, 0.35); }); },
    shieldhit: function () { noise(0.18, 1600, 'bandpass', 0.5, 0, 1.5, 500); tone(220, 0.22, 'square', 140, 0, 0.3); tone(880, 0.12, 'triangle', 1320, 0.04, 0.22); },
    foodspawn: function () { tone(1568, 0.1, 'sine', null, 0, 0.2); tone(2093, 0.14, 'sine', null, 0.08, 0.2); },
    bark: function () { noise(0.07, 700, 'bandpass', 0.45, 0, 1.5); tone(330, 0.1, 'square', 170, 0, 0.22); noise(0.06, 900, 'bandpass', 0.4, 0.13, 1.5); tone(440, 0.09, 'square', 220, 0.13, 0.2); },
    shoot: function () { tone(880, 0.08, 'square', 330, 0, 0.16); noise(0.05, 3000, 'highpass', 0.2); },
    hop: function () { tone(520, 0.06, 'square', 780, 0, 0.16); },
    splash: function () { noise(0.35, 1200, 'lowpass', 0.6, 0, 0.6, 300); tone(300, 0.2, 'sine', 90, 0, 0.3); },
    line: function (d) { var n = (d && d.n) || 1; for (var i = 0; i < n; i++) tone(660 + i * 160, 0.12, 'triangle', null, i * 0.06, 0.3); noise(0.12, 2500, 'bandpass', 0.3); },
    drop: function () { tone(180, 0.08, 'sine', 80, 0, 0.5); noise(0.06, 500, 'lowpass', 0.4); }
  };

  function play(name, data) {
    if (!sfxOn || !S[name]) return;
    if (!ensure()) return;
    try { S[name](data); } catch (e) { /* best effort */ }
  }
  function buzz(p) { if (!hapticsOn) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } }

  // ---------- power-mode siren ----------
  var siren = null;
  function sirenOn() {
    if (!sfxOn || !ensure() || siren) return;
    var o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 330;
    lfo.frequency.value = 6; lg.gain.value = 90; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.1);
    o.connect(g); g.connect(sfxBus); o.start(); lfo.start();
    siren = { o: o, lfo: lfo, g: g };
  }
  function sirenOff() {
    if (!siren || !ctx) { siren = null; return; }
    var s = siren; siren = null;
    try { s.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1); s.o.stop(ctx.currentTime + 0.15); s.lfo.stop(ctx.currentTime + 0.15); } catch (e) { }
  }

  // ---------- procedural music ----------
  // Each biome gets a scale, a chord progression (scale degrees), a tempo and a seed; the
  // melody is a seeded random walk over chord tones, so every tune is original and loops.
  var SONGS = {
    title:   { root: 60, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 3, 4], bpm: 100, seed: 11 },
    meadow:  { root: 62, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 3, 5, 4], bpm: 118, seed: 3 },
    forest:  { root: 57, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 2, 6], bpm: 110, seed: 8 },
    desert:  { root: 60, scale: [0, 1, 4, 5, 7, 8, 10], prog: [0, 1, 0, 6], bpm: 124, seed: 21 },
    snow:    { root: 64, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 2, 3, 4], bpm: 96, seed: 5 },
    caves:   { root: 55, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 6, 0], bpm: 104, seed: 13 },
    lava:    { root: 53, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 1, 6, 0], bpm: 132, seed: 17 },
    crystal: { root: 65, scale: [0, 2, 4, 6, 7, 9, 11], prog: [0, 1, 4, 0], bpm: 108, seed: 29 }
  };
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function buildSong(def) {
    var r = window.PCWorld.rng(def.seed), notes = [], steps = 8; // 8 eighth-notes per bar, 4 bars
    function deg(d, oct) { var n = def.scale.length; var o = Math.floor(d / n); return def.root + def.scale[((d % n) + n) % n] + 12 * (o + (oct || 0)); }
    var mel = 7;
    for (var bar = 0; bar < 8; bar++) {
      var ch = def.prog[bar % 4];
      for (var s = 0; s < steps; s++) {
        var t = bar * steps + s;
        if (s === 0 || s === 4) notes.push({ t: t, m: deg(ch, -1), d: 3.5, type: 'triangle', v: 0.55 }); // bass
        if (s % 2 === 1) notes.push({ t: t, m: deg(ch + [0, 2, 4, 2][(s >> 1) % 4], 0), d: 0.9, type: 'square', v: 0.13 }); // arp
        if (bar % 4 !== 3 || s < 4) {
          if (r() < (s % 2 === 0 ? 0.62 : 0.3)) {
            var tones = [ch, ch + 2, ch + 4, ch + 7];
            if (r() < 0.55) mel += r() < 0.5 ? 1 : -1; else mel = tones[Math.floor(r() * 4)] + (r() < 0.5 ? 0 : 7);
            mel = Math.max(4, Math.min(14, mel));
            notes.push({ t: t, m: deg(mel, 1), d: r() < 0.3 ? 1.8 : 0.9, type: 'square', v: 0.2 });
          }
        }
        if (s % 4 === 2) notes.push({ t: t, noise: true, v: 0.08 });
      }
    }
    return { notes: notes, len: 8 * steps, step: 60 / def.bpm / 2 };
  }
  var song = null, songName = null, songStart = 0, nextIdx = 0, loopN = 0, timer = null;
  function schedule() {
    if (!ctx || !song) return;
    var ahead = ctx.currentTime + 0.25;
    for (var guard = 0; guard < 200; guard++) {
      var n = song.notes[nextIdx];
      var at = songStart + (loopN * song.len + n.t) * song.step;
      if (at > ahead) break;
      if (at >= ctx.currentTime - 0.05) {
        if (n.noise) noiseAt(at, n.v); else noteAt(at, n);
      }
      nextIdx++;
      if (nextIdx >= song.notes.length) { nextIdx = 0; loopN++; }
    }
  }
  function noteAt(at, n) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = n.type; o.frequency.value = mtof(n.m);
    var dur = n.d * song.step;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(n.v, at + 0.01);
    g.gain.exponentialRampToValueAtTime(n.v * 0.5, at + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(musicBus); o.start(at); o.stop(at + dur + 0.02);
  }
  function noiseAt(at, v) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    var g = ctx.createGain(); g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    s.connect(f); f.connect(g); g.connect(musicBus); s.start(at, Math.random() * 0.5); s.stop(at + 0.06);
  }
  function startMusic(name) {
    if (songName === name && timer) return;
    stopMusic();
    songName = name;
    if (!ensure()) return;
    song = buildSong(SONGS[name] || SONGS.meadow);
    songStart = ctx.currentTime + 0.1; nextIdx = 0; loopN = 0;
    timer = setInterval(schedule, 60);
    schedule();
  }
  function stopMusic() { if (timer) clearInterval(timer); timer = null; song = null; songName = null; }

  return {
    play: play, buzz: buzz, unlock: ensure, sirenOn: sirenOn, sirenOff: sirenOff,
    startMusic: startMusic, stopMusic: stopMusic,
    setSfx: function (v) { sfxOn = !!v; if (!v) sirenOff(); },
    setMusic: function (v) { musicOn = !!v; if (musicBus) musicBus.gain.value = v ? 0.16 : 0; },
    setHaptics: function (v) { hapticsOn = !!v; }
  };
})();
