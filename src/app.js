/* PacCraft — app shell: screens, save data, input, HUD, crafting, hero, builder wiring, game loop. */
(function () {
  'use strict';
  var VERSION = '2.1.0';
  var Wd = PCWorld, TILE = Wd.TILE, W = Wd.W, H = Wd.H, A = PCAudio;
  var $ = function (id) { return document.getElementById(id); };
  var tex = PCTex.build();

  // ================= save data =================
  var SAVE_KEY = 'paccraft-save-v1';
  function defaults() {
    return {
      v: 1, name: 'Max', look: Object.assign({ pet: 'none' }, PCTex.LOOK_DEFAULT), hats: ['miner', 'cap', 'none'], pets: ['none'],
      ores: { coal: 0, iron: 0, gold: 0, diamond: 0, ember: 0 },
      up: { pick: 0, boots: 0, hearts: 0, power: 0, magnet: 0, bag: 0, armor: 0 }, tnt: 1,
      best: 0, maxLevel: 1, difficulty: 'easy',
      settings: { sfx: true, music: true, haptics: true, dpad: true, lefty: false, pushDig: true },
      levels: [], stats: { gems: 0, bonks: 0, mined: 0, games: 0 }, tips: 0, hi: {}
    };
  }
  function load() {
    var d = defaults();
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        Object.keys(d).forEach(function (k) {
          if (s[k] === undefined) return;
          if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) d[k] = Object.assign(d[k], s[k]); else d[k] = s[k];
        });
      }
    } catch (e) { /* private mode etc. */ }
    return d;
  }
  var save = load();
  var saveTimer = null;
  function persist(now) {
    if (saveTimer) clearTimeout(saveTimer);
    var go = function () { saveTimer = null; try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } };
    if (now) go(); else saveTimer = setTimeout(go, 400);
  }
  function applySettings() {
    A.setSfx(save.settings.sfx); A.setMusic(save.settings.music); A.setHaptics(save.settings.haptics);
    var c = $('controls');
    c.classList.toggle('lefty', !!save.settings.lefty);
    c.classList.toggle('nodpad', !save.settings.dpad);
  }

  // ================= icons =================
  function pix(rows, pal, scale) {
    var h = rows.length, w = rows[0].length, c = PCTex.mk(w, h), g = c.getContext('2d');
    rows.forEach(function (r, y) { for (var x = 0; x < w; x++) if (pal[r[x]]) { g.fillStyle = pal[r[x]]; g.fillRect(x, y, 1, 1); } });
    return PCTex.outline(c);
  }
  var ICON = {};
  function buildIcons() {
    var play = pix(['..........', '.XX.......', '.XXXX.....', '.XXXXXX...', '.XXXXXXXX.', '.XXXXXX...', '.XXXX.....', '.XX.......', '..........'], { X: '#ffffff' });
    var pause = pix(['.........', '.XX...XX.', '.XX...XX.', '.XX...XX.', '.XX...XX.', '.XX...XX.', '.........'], { X: '#ffffff' });
    var gear = pix(['....XX....', '.X.XXXX.X.', '..XXXXXX..', '.XXX..XXX.', 'XXX....XXX', 'XXX....XXX', '.XXX..XXX.', '..XXXXXX..', '.X.XXXX.X.', '....XX....'], { X: '#e8e8ee' });
    var help = pix(['..XXXX..', '.XX..XX.', '.....XX.', '....XX..', '...XX...', '...XX...', '........', '...XX...'], { X: '#ffe680' });
    var craftTable = PCTex.mk(16, 16), cg = craftTable.getContext('2d');
    cg.drawImage(tex.blocks[TILE.PLANKS].top, 0, 0);
    cg.fillStyle = '#6b4f2c'; cg.fillRect(0, 0, 16, 2); cg.fillRect(0, 0, 2, 16); cg.fillRect(14, 0, 2, 16); cg.fillRect(0, 14, 16, 2);
    cg.fillStyle = '#4e381f'; cg.fillRect(5, 2, 1, 12); cg.fillRect(10, 2, 1, 12); cg.fillRect(2, 5, 12, 1); cg.fillRect(2, 10, 12, 1);
    var tableCube = PCTex.cubeIcon({ top: craftTable, sideFull: tex.blocks[TILE.LOG].sideFull }, 48);
    ICON.play = PCTex.dataURL(play, 4); ICON.pause = PCTex.dataURL(pause, 4); ICON.gear = PCTex.dataURL(gear, 4); ICON.help = PCTex.dataURL(help, 4);
    ICON.craft = PCTex.dataURL(tableCube, 1);
    ICON.arcade = PCTex.dataURL(tex.tnt[0], 4);
    ICON.hero = PCTex.dataURL(PCTex.hero(save.look).down[0], 4);
    ICON.build = PCTex.dataURL(PCTex.cubeIcon(tex.blocks[TILE.GRASS], 48), 1);
    ICON.ore = {}; ['coal', 'iron', 'gold', 'diamond', 'ember'].forEach(function (k) { ICON.ore[k] = PCTex.dataURL(tex.ores[k], 4); });
    ICON.heart = [PCTex.dataURL(tex.heart[0], 4), PCTex.dataURL(tex.heart[1], 4)];
    ICON.pick = tex.picks.map(function (p) { return PCTex.dataURL(p, 4); });
    ICON.planks = PCTex.dataURL(PCTex.cubeIcon(tex.blocks[TILE.PLANKS], 48), 1);
    ICON.tnt = PCTex.dataURL(tex.tnt[0], 4);
    ICON.boot = PCTex.dataURL(tex.boot, 4); ICON.magnet = PCTex.dataURL(tex.magnet, 4); ICON.bag = PCTex.dataURL(tex.bag, 4);
    ICON.crystal = PCTex.dataURL(tex.crystal, 4);
    ICON.cube = {};
    Object.keys(tex.blocks).forEach(function (t) { ICON.cube[t] = PCTex.dataURL(PCTex.cubeIcon(tex.blocks[t], 48), 1); });
    ICON.blockTop = {};
    Object.keys(tex.blocks).forEach(function (t) { ICON.blockTop[t] = PCTex.dataURL(tex.blocks[t].top, 4); });
    ICON.floor = {};
    Object.keys(tex.floors).forEach(function (b) { ICON.floor[b] = PCTex.dataURL(tex.floors[b][0], 4); });
    document.querySelectorAll('[data-ico]').forEach(function (el) { var k = el.getAttribute('data-ico'); if (ICON[k]) el.style.backgroundImage = 'url(' + ICON[k] + ')'; });
    // tiled page background
    var bg = PCTex.mk(32, 32), bgg = bg.getContext('2d');
    bgg.drawImage(tex.blocks[TILE.STONE].top, 0, 0); bgg.drawImage(tex.blocks[TILE.COBBLE].top, 16, 0); bgg.drawImage(tex.blocks[TILE.DIRT].top, 0, 16); bgg.drawImage(tex.blocks[TILE.STONE].top, 16, 16);
    $('app').style.setProperty('--bgtex', 'url(' + PCTex.dataURL(bg, 2) + ')');
    $('act-mine').querySelector('img').src = ICON.pick[save.up.pick];
    $('act-block').querySelector('img').src = ICON.planks;
    $('act-tnt').querySelector('img').src = ICON.tnt;
  }
  function img(src, cls) { return '<img src="' + src + '" alt=""' + (cls ? ' class="' + cls + '"' : '') + '>'; }

  // ================= screens =================
  var current = 'hub', history = [];
  function show(id, noPush) {
    if (id === current) return;
    if (!noPush) history.push(current);
    $('screen-' + current).classList.remove('active');
    current = id;
    $('screen-' + id).classList.add('active');
    $('app').classList.toggle('in-game', id === 'game' || id === 'cab');
    if (id === 'hub') { history = []; enterHub(); }
    if (id === 'title') enterTitle();
    if (id === 'play') renderPlay();
    if (id === 'craft') renderCraft();
    if (id === 'arcade') renderArcade();
    if (id === 'hero') renderHero();
    if (id === 'settings') renderSettings();
    if (id === 'help') renderHelp();
    if (id !== 'game' && id !== 'cab') { A.sirenOff(); if (id === 'title' || id === 'hub') A.startMusic('title'); }
    if (id !== 'cab' && PCCab.isRunning()) PCCab.stop();
    requestAnimationFrame(layout);
  }
  function back() {
    var prev = history.pop() || 'hub';
    if (current === 'craft' && craftThen) { var f = craftThen; craftThen = null; f(); return; }
    if (current === 'arcade' && arcadeThen) { var fa = arcadeThen; arcadeThen = null; fa(); return; }
    show(prev, true);
  }
  document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { A.play('click'); back(); }); });

  function toast(msg, ms) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, ms || 1800);
  }
  function modal(title, text, buttons) {
    $('modal-title').textContent = title; $('modal-text').textContent = text;
    var box = $('modal-btns'); box.innerHTML = '';
    buttons.forEach(function (b) {
      var el = document.createElement('button'); el.className = 'btn ' + (b.cls || ''); el.textContent = b.label;
      el.addEventListener('click', function () { $('modal').hidden = true; A.play('click'); if (b.fn) b.fn(); });
      box.appendChild(el);
    });
    $('modal').hidden = false;
  }

  // ================= title =================
  var titleT = 0;
  function drawLogo() {
    var c = $('logo'), word = 'PACCRAFT', cols = word.length * 6 - 1, B = 10, side = Math.round(B * 0.4);
    c.width = cols * B + 8; c.height = 7 * B + side + 8;
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    var pac = tex.goldBlock, craft = tex.blocks[TILE.GRASS];
    for (var row = 0; row < 7; row++) {
      for (var i = 0; i < word.length; i++) {
        var gl = PCTex.GLYPH[word[i]], b = i < 3 ? pac : craft;
        for (var cx = 0; cx < 5; cx++) {
          if (gl[row * 5 + cx] !== '1') continue;
          var x = 4 + (i * 6 + cx) * B, y = 4 + row * B;
          var below = row < 6 && gl[(row + 1) * 5 + cx] === '1';
          g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 3, y + 4, B, B + side);
          if (!below) g.drawImage(b.side, 0, 0, 16, 6, x, y + B, B, side);
          g.drawImage(b.top, 0, 0, 16, 16, x, y, B, B);
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + B - 1, y, 1, B); g.fillRect(x, y + B - 1, B, 1);
        }
      }
    }
  }
  // Title strip, one continuous story: the monsters chase the hero right while he eats gems;
  // he grabs the Power Crystal, they turn blue and flee left, and he chases them off screen.
  function drawTitleScene(dt) {
    var c = $('title-scene'); if (!c.width) { c.width = 230; c.height = 42; }
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    titleT += dt;
    g.clearRect(0, 0, c.width, c.height);
    var gb = tex.blocks[TILE.GRASS];
    for (var x = 0; x < c.width; x += 12) { g.drawImage(gb.side, 0, 0, 16, 6, x, 34, 12, 5); g.drawImage(gb.top, 0, 0, 16, 16, x, 30, 12, 4); }
    var v = 62, CX = c.width - 34, legA = (CX + 20) / v, legB = (CX + 24) / v, rest = 0.5;
    var t = titleT % (legA + legB + rest), chase = t < legA, t2 = t - legA;
    var set = PCTex.hero(save.look), frame = 1 + Math.floor(titleT * 8) % 2;
    var hx = chase ? -20 + v * t : CX - v * t2;
    var kinds = ['rumble', 'sly', 'frost', 'mudge'];
    if (chase) {
      for (var gx = 8; gx < CX - 8; gx += 14) if (gx > hx + 8) { g.fillStyle = '#1d6b4a'; g.fillRect(gx, 23, 3, 3); g.fillStyle = '#5ef0a8'; g.fillRect(gx, 22, 3, 3); }
      var bob = Math.sin(titleT * 6) * 1;
      g.drawImage(tex.crystal, CX - 4, Math.round(12 + bob), 9, 11);
    } else if (t2 < 0.35) { // pickup flash
      g.strokeStyle = 'rgba(227,107,255,' + (1 - t2 / 0.35) + ')'; g.lineWidth = 2;
      g.beginPath(); g.arc(CX, 20, 4 + t2 * 40, 0, Math.PI * 2); g.stroke();
    }
    if (hx > -20 && hx < c.width + 20) g.drawImage(chase ? set.right[frame] : set.left[frame], Math.round(hx) - 8, 14, 16, 16);
    if (save.look.pet && save.look.pet !== 'none') {
      var pw = PCTex.wolf(save.look.shirt), px = chase ? hx - 13 : hx + 13;
      if (px > -16 && px < c.width + 16) g.drawImage(pw[chase ? 'right' : 'left'][1 + Math.floor(titleT * 9) % 2], Math.round(px) - 8, 17, 14, 14);
    }
    kinds.forEach(function (k, i) {
      var start = CX - 26 - i * 19;                  // where each monster is when the crystal is grabbed
      var mx = chase ? hx - 26 - i * 19 : start - v * 1.12 * t2;
      if (mx < -20 || mx > c.width + 20) return;
      var hop = Math.abs(Math.sin(titleT * 9 + i)) * 3;
      var ending = !chase && t2 > legB - 1.6;         // power running out: flash white
      var kind = chase ? k : (ending && Math.floor(titleT * 7) % 2 ? 'flash' : 'fright');
      g.drawImage(tex.mons[kind][Math.floor(titleT * 6 + i) % 2], Math.round(mx) - 8, Math.round(14 - hop), 16, 16);
      PCTex.drawEyes(g, Math.round(mx) - 8, Math.round(14 - hop), 1, chase ? 3 : 1, !chase);
    });
  }
  function enterTitle() {
    $('hello').textContent = 'Hi, ' + (save.name || 'Max') + '!';
    var st = '<span class="st">' + img(ICON.heart[1]) + 'Best ' + save.best + '</span><span class="st">Level ' + save.maxLevel + '</span>';
    ['coal', 'iron', 'gold', 'diamond', 'ember'].forEach(function (k) { st += '<span class="st">' + img(ICON.ore[k]) + save.ores[k] + '</span>'; });
    $('title-stats').innerHTML = st;
    var hi = document.querySelector('#btn-hero .ico'); if (hi) hi.style.backgroundImage = 'url(' + PCTex.dataURL(PCTex.hero(save.look).down[0], 4) + ')';
  }

  $('btn-title-hub').addEventListener('click', function () { A.play('click'); show('hub', true); });
  $('btn-play').addEventListener('click', function () { A.unlock(); A.play('click'); show('play'); });
  $('btn-craft').addEventListener('click', function () { A.play('click'); craftThen = null; show('craft'); });
  $('btn-hero').addEventListener('click', function () { A.play('click'); show('hero'); });
  $('btn-build').addEventListener('click', function () { A.play('click'); openBuilder(null); });
  $('btn-help').addEventListener('click', function () { A.play('click'); show('help'); });
  $('btn-settings').addEventListener('click', function () { A.play('click'); show('settings'); });

  // ================= arcade hub =================
  function drawSign() {
    var c = $('hub-sign'), word = 'BLOCKCADE', cols = word.length * 6 - 1, B = 9, side = Math.round(B * 0.4);
    c.width = cols * B + 8; c.height = 7 * B + side + 8;
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    var blocks = [tex.blocks[TILE.GRASS], tex.blocks[TILE.GOLD], tex.blocks[TILE.DIAMOND], tex.blocks[TILE.MAGMA], tex.blocks[TILE.CRYSTAL], tex.blocks[TILE.IRON], tex.blocks[TILE.EMBER], tex.blocks[TILE.SAND], tex.blocks[TILE.LEAVES]];
    for (var row = 0; row < 7; row++) for (var i = 0; i < word.length; i++) {
      var gl = PCTex.GLYPH[word[i]], b = blocks[i % blocks.length];
      for (var cx = 0; cx < 5; cx++) {
        if (gl[row * 5 + cx] !== '1') continue;
        var x = 4 + (i * 6 + cx) * B, y = 4 + row * B, below = row < 6 && gl[(row + 1) * 5 + cx] === '1';
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 3, y + 4, B, B + side);
        if (!below) g.drawImage(b.side, 0, 0, 16, 6, x, y + B, B, side);
        g.drawImage(b.top, 0, 0, 16, 16, x, y, B, B);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + B - 1, y, 1, B); g.fillRect(x, y + B - 1, B, 1);
      }
    }
  }
  var CABINETS = [
    { id: 'paccraft', cls: 'pac', name: 'PacCraft', blurb: 'Gobble gems, dig tunnels, bonk cube monsters.', start: function () { show('title'); },
      best: function () { return save.best; },
      thumb: function (g, w, h) {
        var gb = tex.blocks[TILE.GRASS], f = tex.floors.meadow[0];
        for (var y = 0; y < h; y += 16) for (var x = 0; x < w; x += 16) g.drawImage(f, x, y, 16, 16);
        [[0, 0], [16, 0], [32, 0], [48, 0], [0, 32], [48, 32]].forEach(function (p) { g.drawImage(gb.top, p[0], p[1], 16, 16); });
        for (var gx = 8; gx < w; gx += 16) { g.fillStyle = '#5ef0a8'; g.fillRect(gx - 1, 22, 3, 3); }
        g.drawImage(PCTex.hero(save.look).right[1], 14, 12, 16, 16);
        g.drawImage(tex.mons.rumble[0], 40, 12, 16, 16); PCTex.drawEyes(g, 40, 12, 1, 1);
        g.drawImage(tex.crystal, 4, 30, 9, 11);
      } }
  ];
  function enterHub() {
    $('hub-hello').textContent = 'Hi, ' + (save.name || 'Max') + '!';
    var bank = '';
    ['coal', 'iron', 'gold', 'diamond', 'ember'].forEach(function (k) { bank += '<span>' + img(ICON.ore[k]) + save.ores[k] + '</span>'; });
    $('hub-bank').innerHTML = bank;
    var box = $('cabinets'); box.innerHTML = '';
    var all = CABINETS.concat(PCCab.list().map(function (d) {
      return { id: d.id, cls: d.id, name: d.name, blurb: d.blurb, thumb: d.thumb, start: function () { PCCab.start(d.id); }, best: function () { return save.hi[d.id] || 0; } };
    }));
    all.forEach(function (c) {
      var card = document.createElement('button'); card.className = 'cab-card ' + c.cls;
      var cv = document.createElement('canvas'); cv.width = 64; cv.height = 48;
      var g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#1a1420'; g.fillRect(0, 0, 64, 48);
      try { c.thumb(g, 64, 48, tex, save.look); } catch (e) { }
      card.appendChild(cv);
      var m = document.createElement('div'); m.className = 'cab-marquee'; m.textContent = c.name; card.appendChild(m);
      var b = document.createElement('div'); b.className = 'cab-blurb'; b.textContent = c.blurb; card.appendChild(b);
      var best = document.createElement('div'); best.className = 'cab-best'; best.textContent = 'BEST ' + c.best(); card.appendChild(best);
      card.addEventListener('click', function () { A.unlock(); A.play('click'); c.start(); });
      box.appendChild(card);
    });
    var hi = document.querySelector('#hub-hero .ico'); if (hi) hi.style.backgroundImage = 'url(' + PCTex.dataURL(PCTex.hero(save.look).down[0], 4) + ')';
    hubPet = PCPet.make(save.look, function (n) { A.play(n); });
    if (!hubPetRaf) { hubPetLast = performance.now(); hubPetRaf = requestAnimationFrame(hubPetLoop); }
  }
  // the wolf sits by the greeting and barks when tapped; before adoption it's a shadow that leads to the Hero screen
  var hubPet = null, hubPetRaf = 0, hubPetLast = 0, hubPetT = 0;
  function hubPetLoop(now) {
    if (current !== 'hub' || !hubPet) { hubPetRaf = 0; return; }
    var dt = Math.min(0.05, (now - hubPetLast) / 1000); hubPetLast = now; hubPetT += dt;
    var c = $('hub-pet'), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
    if (hubPet.on) {
      hubPet.sit(dt); if (hubPet.wagT <= 0 && Math.floor(hubPetT) % 7 === 0 && Math.floor(hubPetT * 3) % 3 === 0) hubPet.wagT = 0.6;
      hubPet.draw(g, 24, 46, 22, 3);
    } else {
      g.globalAlpha = 0.3; g.drawImage(PCTex.wolf("#888").right[3], 13, 24, 22, 22); g.globalAlpha = 1;
      PCTex.drawText(g, "?", 34, 14, 2, "#ffe680", "#000");
    }
    hubPetRaf = requestAnimationFrame(hubPetLoop);
  }
  $('hub-pet').addEventListener('click', function () {
    if (!hubPet) return;
    if (hubPet.on) { A.unlock(); hubPet.bark(Math.random() < 0.3 ? 'YIP!' : 'WOOF!'); hubPet.hop(); A.buzz(10); }
    else { A.play('click'); toast('Adopt a wolf on the Hero screen!'); show('hero'); }
  });
  $('hub-arcade').addEventListener('click', function () { A.unlock(); A.play('click'); arcadeThen = null; show('arcade'); });
  $('hub-craft').addEventListener('click', function () { A.play('click'); craftThen = null; show('craft'); });
  $('hub-hero').addEventListener('click', function () { A.play('click'); show('hero'); });
  $('hub-settings').addEventListener('click', function () { A.play('click'); show('settings'); });

  // ================= play / level select =================
  var DIFF_DESC = {
    easy: 'Slow monsters, 5 hearts, long power-ups. Great for learning!',
    normal: 'The real deal: 3 hearts and sneaky monsters.',
    hard: 'Fast monsters and short power-ups. Good luck!'
  };
  function renderPlay() {
    document.querySelectorAll('#diff-seg button').forEach(function (b) { b.classList.toggle('active', b.dataset.diff === save.difficulty); });
    $('diff-desc').textContent = DIFF_DESC[save.difficulty];
    var grid = $('tab-adventure'); grid.innerHTML = '';
    var shown = Math.max(7, Math.ceil((save.maxLevel + 1) / 7) * 7);
    for (var n = 1; n <= shown; n++) {
      var bio = Wd.biomeFor(n), wallT = bio.walls[0][0];
      var b = document.createElement('button');
      b.className = 'lvl-btn' + (n > save.maxLevel ? ' locked' : '') + (n === save.maxLevel ? ' next' : '');
      b.style.backgroundImage = 'url(' + ICON.blockTop[wallT] + ')';
      b.innerHTML = '<span class="n">' + n + '</span><span class="b">' + bio.name + '</span>';
      (function (lv, locked) {
        b.addEventListener('click', function () {
          if (locked) { A.play('nope'); toast('Beat level ' + (lv - 1) + ' to unlock!'); return; }
          A.play('click'); startAdventure(lv);
        });
      })(n, n > save.maxLevel);
      grid.appendChild(b);
    }
    renderMyLevels();
  }
  document.querySelectorAll('#diff-seg button').forEach(function (b) {
    b.addEventListener('click', function () { A.play('click'); save.difficulty = b.dataset.diff; persist(); renderPlay(); });
  });
  document.querySelectorAll('#play-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      A.play('click');
      document.querySelectorAll('#play-tabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
      $('tab-adventure').hidden = b.dataset.tab !== 'adventure'; $('tab-mine').hidden = b.dataset.tab !== 'mine';
    });
  });
  function renderMyLevels() {
    var box = $('tab-mine'); box.innerHTML = '';
    var nb = document.createElement('button'); nb.className = 'btn btn-green'; nb.innerHTML = '<span class="ico" style="background-image:url(' + ICON.build + ')"></span>Build a New Level';
    nb.addEventListener('click', function () { A.play('click'); openBuilder(null); });
    box.appendChild(nb);
    if (!save.levels.length) { var e = document.createElement('div'); e.className = 'empty'; e.textContent = 'No levels yet. Build your own maze, then play it here!'; box.appendChild(e); return; }
    save.levels.forEach(function (lv, idx) {
      var card = document.createElement('div'); card.className = 'my-card';
      var th = PCBuilder.thumbnail(lv, 4);
      card.appendChild(th);
      var right = document.createElement('div');
      right.innerHTML = '<div class="nm"></div><div class="row"><button class="btn btn-sm btn-green">Play</button><button class="btn btn-sm">Edit</button><button class="btn btn-sm btn-red">✕</button></div>';
      right.querySelector('.nm').textContent = lv.name || 'My Level';
      var bs = right.querySelectorAll('button');
      bs[0].addEventListener('click', function () { A.play('click'); startCustom(lv, 'play'); });
      bs[1].addEventListener('click', function () { A.play('click'); openBuilder(idx); });
      bs[2].addEventListener('click', function () {
        modal('Delete level?', '"' + (lv.name || 'My Level') + '" will be gone for good.', [
          { label: 'Keep', cls: 'btn-sm' }, { label: 'Delete', cls: 'btn-red btn-sm', fn: function () { save.levels.splice(idx, 1); persist(); renderMyLevels(); } }]);
      });
      card.appendChild(right);
      box.appendChild(card);
    });
  }

  // ================= game session =================
  var renderer = new PCRender.Renderer($('board'));
  renderer.setLook(save.look);
  var session = null; // { game, mode:'adventure'|'custom', levelNum, custom, from }
  function seedFor(n) { return (n * 2654435761 + 12345) >>> 0; }

  function newGame(level, levelNum, carry) {
    carry = carry || {};
    var g = new PCGame.Game(level, {
      difficulty: save.difficulty, levelNum: levelNum, upgrades: save.up, settings: { pushDig: save.settings.pushDig },
      score: carry.score || 0, hearts: carry.hearts, blocks: carry.blocks, tnt: save.tnt, extraLifeGiven: carry.extraLifeGiven
    });
    return g;
  }
  function startAdventure(n, carry) {
    var level = Wd.makeLevel(n, seedFor(n));
    session = { mode: 'adventure', levelNum: n, game: newGame(level, n, carry) };
    save.stats.games++; persist();
    beginSession();
  }
  function startCustom(data, from) {
    var level = Wd.makeCustomLevel(data);
    session = { mode: 'custom', levelNum: 0, custom: data, from: from, game: newGame(level, 1, null) };
    beginSession();
  }
  function beginSession() {
    ['ov-pause', 'ov-clear', 'ov-over'].forEach(function (id) { $(id).hidden = true; });
    renderer.setLook(save.look);
    renderer.setGame(session.game);
    lastHud = {};
    $('act-mine').querySelector('img').src = ICON.pick[save.up.pick];
    show('game', true);
    history = ['title', 'play'];
    A.unlock();
    A.startMusic(session.game.L.biome);
    A.play('ready');
    layout();
  }

  function pauseGame(on) {
    if (!session || current !== 'game') return;
    var g = session.game;
    if (g.state === 'over' || g.state === 'done') return;
    g.paused = on;
    $('ov-pause').hidden = !on;
    if (on) { A.sirenOff(); A.stopMusic(); updatePauseToggles(); }
    else { A.startMusic(g.L.biome); if (g.powerT > 0) A.sirenOn(); }
  }
  function updatePauseToggles() {
    $('pause-sfx').textContent = 'Sound: ' + (save.settings.sfx ? 'On' : 'Off');
    $('pause-music').textContent = 'Music: ' + (save.settings.music ? 'On' : 'Off');
  }
  $('btn-pause').addEventListener('click', function () { A.play('click'); pauseGame(true); });
  $('btn-resume').addEventListener('click', function () { A.play('click'); pauseGame(false); });
  $('btn-restart').addEventListener('click', function () {
    A.play('click');
    if (session.mode === 'adventure') startAdventure(session.levelNum); else startCustom(session.custom, session.from);
  });
  $('btn-quit').addEventListener('click', function () { A.play('click'); quitSession(); });
  $('pause-sfx').addEventListener('click', function () { save.settings.sfx = !save.settings.sfx; applySettings(); persist(); updatePauseToggles(); A.play('click'); });
  $('pause-music').addEventListener('click', function () { save.settings.music = !save.settings.music; applySettings(); persist(); updatePauseToggles(); A.play('click'); });
  function quitSession() {
    A.sirenOff(); A.stopMusic();
    var from = session && session.mode === 'custom' && session.from === 'builder';
    session = null;
    if (from) { show('builder', true); layout(); } else { show('title', true); }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { pauseGame(true); persist(true); } });
  window.addEventListener('blur', function () { pauseGame(true); });

  // ---- events from the game ----
  function handleEvents(events) {
    var g = session.game;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      switch (e.type) {
        case 'gem': A.play('gem'); save.stats.gems++; break;
        case 'crystal': A.play('crystal'); A.sirenOn(); A.buzz(30); break;
        case 'power-end': A.sirenOff(); break;
        case 'mine-hit': A.play('hit', e); A.buzz(8); break;
        case 'mined':
          A.play('mined', e); if (e.byPlayer) A.buzz(18);
          save.stats.mined++;
          if (e.drop) { save.ores[e.drop]++; persist(); }
          break;
        case 'bonk': A.play('bonk'); break;
        case 'place': A.play('place'); A.buzz(15); break;
        case 'noblock': A.play('nope'); toastSoft('No blocks! Dig some walls first.'); break;
        case 'noplace': A.play('nope'); break;
        case 'notnt': A.play('nope'); toastSoft('No TNT! Craft some at the Crafting Table.'); break;
        case 'tnt-drop': A.play('tnt'); save.tnt = Math.max(0, save.tnt - 1); persist(); break;
        case 'boom': A.play('boom'); A.buzz([40, 30, 60]); break;
        case 'crumble': A.play('crumble'); break;
        case 'eat': A.play('eat'); A.buzz(25); save.stats.bonks++; break;
        case 'shield': A.play('shieldhit'); A.buzz([50, 40, 50]); toastSoft('Your armor took the hit!'); break;
        case 'food': A.play('food'); break;
        case 'food-spawn': A.play('foodspawn'); break;
        case 'extralife': A.play('extralife'); break;
        case 'go': A.play('go'); showTip(); break;
        case 'death': A.sirenOff(); A.play('death'); A.buzz([60, 40, 120]); break;
        case 'clear': A.sirenOff(); A.stopMusic(); A.play('clear'); break;
        case 'levelclear': onLevelClear(); break;
        case 'gameover': onGameOver(); break;
      }
    }
  }
  var TIPS = [
    'Move with the joystick — or swipe on the maze!',
    'Push into a wall (or tap DIG) to dig a shortcut!',
    'Grab a purple Power Crystal, then chase the monsters!',
    'Tap the block button to drop a wall behind you!',
    'Dig ore blocks for points and crafting stuff!'
  ];
  function showTip() {
    var n = save.tips || 0;
    if (n >= TIPS.length || session.mode !== 'adventure') return;
    save.tips = n + 1; persist();
    toast(TIPS[n], 3800);
  }
  var softT = 0;
  function toastSoft(m) { var n = performance.now(); if (n - softT > 2500) { softT = n; toast(m); } }

  function oreSummary(o) {
    var s = '';
    ['coal', 'iron', 'gold', 'diamond', 'ember'].forEach(function (k) { if (o[k]) s += '<span>' + img(ICON.ore[k]) + ' ×' + o[k] + '</span>'; });
    return s || '<span style="color:var(--muted)">No ores this time — try digging ore blocks!</span>';
  }
  function onLevelClear() {
    var g = session.game;
    var best = g.score > save.best; if (best) save.best = g.score;
    var html = '<div class="line"><span>Score</span><span>' + g.score + '</span></div>';
    html += '<div class="line"><span>Ores found</span></div><div class="ores">' + oreSummary(g.orestaken) + '</div>';
    if (best) html += '<div class="best">★ New best score! ★</div>';
    if (session.mode === 'adventure') {
      var nx = session.levelNum + 1;
      if (nx > save.maxLevel) save.maxLevel = nx;
      html += '<div class="line"><span>Next</span><span>Level ' + nx + ' · ' + Wd.biomeFor(nx).name + '</span></div>';
      $('btn-next').textContent = 'Next Level ▶';
      document.querySelector('#ov-clear h2').textContent = 'Level Clear!';
    } else {
      $('btn-next').textContent = 'Play Again';
      document.querySelector('#ov-clear h2').textContent = 'You Beat It!';
    }
    persist(true);
    $('clear-stats').innerHTML = html;
    $('ov-clear').hidden = false;
  }
  function onGameOver() {
    var g = session.game;
    var best = g.score > save.best; if (best) save.best = g.score;
    persist(true);
    A.stopMusic(); A.play('over');
    var html = '<div class="line"><span>Score</span><span>' + g.score + '</span></div>';
    html += '<div class="line"><span>Best</span><span class="best">' + save.best + '</span></div>';
    html += '<div class="line"><span>Ores found</span></div><div class="ores">' + oreSummary(g.orestaken) + '</div>';
    if (best) html += '<div class="best">★ New best score! ★</div>';
    html += '<div class="hint">Your ores are saved. Craft upgrades to get stronger!</div>';
    $('over-stats').innerHTML = html;
    $('ov-over').hidden = false;
  }
  $('btn-next').addEventListener('click', function () {
    A.play('click');
    if (session.mode === 'adventure') startAdventure(session.levelNum + 1, session.game.carry()); else startCustom(session.custom, session.from);
  });
  $('btn-retry').addEventListener('click', function () {
    A.play('click');
    if (session.mode === 'adventure') startAdventure(session.levelNum); else startCustom(session.custom, session.from);
  });
  var craftThen = null, arcadeThen = null;
  $('btn-clear-craft').addEventListener('click', function () {
    A.play('click');
    var s = session, carry = s.game.carry();
    craftThen = function () { if (s.mode === 'adventure') startAdventure(s.levelNum + 1, carry); else startCustom(s.custom, s.from); };
    show('craft', true);
  });
  $('btn-over-craft').addEventListener('click', function () {
    A.play('click');
    var s = session;
    craftThen = function () { if (s.mode === 'adventure') startAdventure(s.levelNum); else startCustom(s.custom, s.from); };
    show('craft', true);
  });
  $('btn-clear-arcade').addEventListener('click', function () {
    A.play('click');
    var s = session, carry = s.game.carry();
    arcadeThen = function () { if (s.mode === 'adventure') startAdventure(s.levelNum + 1, carry); else startCustom(s.custom, s.from); };
    show('arcade', true);
  });
  $('btn-over-arcade').addEventListener('click', function () {
    A.play('click');
    var s = session;
    arcadeThen = function () { if (s.mode === 'adventure') startAdventure(s.levelNum); else startCustom(s.custom, s.from); };
    show('arcade', true);
  });
  $('btn-clear-menu').addEventListener('click', function () { A.play('click'); quitSession(); });
  $('btn-over-menu').addEventListener('click', function () { A.play('click'); quitSession(); });

  // ---- HUD ----
  var lastHud = {};
  function updateHUD() {
    var g = session.game;
    if (lastHud.hearts !== g.hearts || lastHud.maxH !== g.maxHearts) {
      var h = '';
      for (var i = 0; i < g.maxHearts; i++) h += img(ICON.heart[i < g.hearts ? 1 : 0], lastHud.hearts != null && i === g.hearts - 1 && g.hearts > lastHud.hearts ? 'pop' : '');
      $('hud-hearts').innerHTML = h; lastHud.hearts = g.hearts; lastHud.maxH = g.maxHearts;
    }
    if (lastHud.shield !== g.shield) {
      var sh = '';
      for (var si = 0; si < (g.up.armor || 0); si++) sh += '<img src="' + ICON.ore.ember + '" alt="" class="' + (si < g.shield ? 'on' : 'off') + '">';
      $('hud-armor').innerHTML = sh; lastHud.shield = g.shield;
    }
    if (lastHud.score !== g.score) { $('hud-score').textContent = g.score; lastHud.score = g.score; }
    if (lastHud.gems !== g.gemsLeft) { $('hud-gems').textContent = g.gemsLeft; lastHud.gems = g.gemsLeft; }
    if (lastHud.blocks !== g.blocks) { $('cnt-block').textContent = g.blocks; $('act-block').classList.toggle('empty', g.blocks <= 0); lastHud.blocks = g.blocks; }
    if (lastHud.tnt !== g.tnt) { $('cnt-tnt').textContent = g.tnt; $('act-tnt').classList.toggle('empty', g.tnt <= 0); lastHud.tnt = g.tnt; }
    var ok = JSON.stringify(g.orestaken);
    if (lastHud.ores !== ok) {
      var s = '';
      ['coal', 'iron', 'gold', 'diamond', 'ember'].forEach(function (k) { if (g.orestaken[k]) s += '<span class="oc">' + img(ICON.ore[k]) + g.orestaken[k] + '</span>'; });
      $('hud-ores').innerHTML = s; lastHud.ores = ok;
    }
    var lv = session.mode === 'adventure' ? 'LV ' + session.levelNum : 'MY LEVEL';
    if (lastHud.lv !== lv) { $('hud-level').textContent = lv; $('hud-biome').textContent = session.mode === 'adventure' ? Wd.biomeById(g.L.biome).name : (session.custom.name || ''); lastHud.lv = lv; }
    var pw = g.powerT > 0;
    if (lastHud.pw !== pw) { $('hud-power').hidden = !pw; $('hud-biome').hidden = pw; lastHud.pw = pw; }
    if (pw) $('hud-power-fill').style.width = Math.max(0, g.powerT / g.powerDuration() * 100) + '%';
  }

  // ================= input =================
  var KEYS = { ArrowUp: 0, KeyW: 0, ArrowLeft: 1, KeyA: 1, ArrowDown: 2, KeyS: 2, ArrowRight: 3, KeyD: 3 };
  var keyHeld = -1;
  document.addEventListener('keydown', function (e) {
    if (current !== 'game' || !session) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    var g = session.game;
    if (e.code in KEYS) {
      e.preventDefault();
      if (!e.repeat) { g.setWant(KEYS[e.code], true); keyHeld = KEYS[e.code]; g.setHeld(keyHeld); }
    } else if (e.code === 'Space' || e.code === 'KeyJ') { e.preventDefault(); g.mine(); }
    else if (e.code === 'KeyB' || e.code === 'KeyK') g.place();
    else if (e.code === 'KeyT' || e.code === 'KeyL') g.dropTnt();
    else if (e.code === 'KeyP' || e.code === 'Escape') pauseGame(!g.paused);
  });
  document.addEventListener('keyup', function (e) {
    if (!session) return;
    if (e.code in KEYS && KEYS[e.code] === keyHeld) { keyHeld = -1; session.game.setHeld(-1); }
  });
  document.addEventListener('pointerdown', function () { A.unlock(); }, { passive: true });

  // swipe anywhere on the maze
  (function () {
    var st = $('stage'), sx = 0, sy = 0, active = false, pid = null;
    st.addEventListener('pointerdown', function (e) { active = true; pid = e.pointerId; sx = e.clientX; sy = e.clientY; try { st.setPointerCapture(e.pointerId); } catch (x) { } });
    st.addEventListener('pointermove', function (e) {
      if (!active || e.pointerId !== pid || !session) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (dx * dx + dy * dy < 18 * 18) return;
      var d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : (dy > 0 ? 2 : 0);
      session.game.setWant(d, true);
      sx = e.clientX; sy = e.clientY;
    });
    function end() { active = false; }
    st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  })();

  // joystick d-pad
  (function () {
    var pad = $('dpad'), knob = $('dpad-knob'), arrows = pad.querySelectorAll('.dpad-arrow'), pid = null, curDir = -1;
    function setDir(d) {
      arrows.forEach(function (a, i) { a.classList.toggle('lit', [0, 1, 2, 3][i] === d); });
      if (d !== curDir) {
        curDir = d;
        if (session) { if (d >= 0) { session.game.setWant(d, true); A.buzz(6); } session.game.setHeld(d); }
      }
    }
    function track(e) {
      var r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = e.clientX - cx, dy = e.clientY - cy, rad = r.width / 2, len = Math.hypot(dx, dy);
      var k = Math.min(1, len / (rad * 0.55));
      knob.style.transform = 'translate(calc(-50% + ' + (len ? dx / len * k * rad * 0.42 : 0) + 'px), calc(-50% + ' + (len ? dy / len * k * rad * 0.42 : 0) + 'px))';
      if (len < rad * 0.16) return;
      setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : (dy > 0 ? 2 : 0));
    }
    pad.addEventListener('pointerdown', function (e) { e.preventDefault(); pid = e.pointerId; try { pad.setPointerCapture(pid); } catch (x) { } curDir = -2; track(e); });
    pad.addEventListener('pointermove', function (e) { if (e.pointerId === pid) track(e); });
    function end(e) { if (e.pointerId !== pid) return; pid = null; knob.style.transform = ''; setDir(-1); }
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  })();

  function actBtn(id, fn) {
    var b = $(id);
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); b.classList.add('pressed'); if (session) fn(session.game); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { b.addEventListener(ev, function () { b.classList.remove('pressed'); }); });
  }
  actBtn('act-mine', function (g) { g.mine(); });
  actBtn('act-block', function (g) { g.place(); });
  actBtn('act-tnt', function (g) { g.dropTnt(); });

  // ================= layout =================
  function layout() {
    if (current === 'game') {
      var st = $('stage'), r = st.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) renderer.resize(r.width - 6, r.height - 6);
    } else if (current === 'cab') {
      PCCab.resize();
    } else if (current === 'builder' && builder) {
      var b = $('bld-stage').getBoundingClientRect();
      if (b.width > 0) builder.resize(b.width - 6, b.height - 6);
    }
  }
  window.addEventListener('resize', function () { requestAnimationFrame(layout); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });

  // ================= main loop =================
  var last = performance.now();
  function frame(now) {
    var dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
    if (current === 'game' && session) {
      var g = session.game;
      g.update(dt);
      var ev = g.drain();
      if (ev.length) { handleEvents(ev); renderer.onEvents(ev); }
      renderer.draw(g.paused ? 0 : dt);
      updateHUD();
    } else if (current === 'title') {
      drawTitleScene(dt);
    } else if (current === 'hero') {
      drawHeroPreview(dt);
    }
    requestAnimationFrame(frame);
  }

  // ================= crafting table =================
  var RECIPES = [
    { id: 'pick', max: 4, names: ['Stone Pickaxe', 'Iron Pickaxe', 'Diamond Pickaxe', 'Emberite Pickaxe'], desc: 'Dig through blocks faster. Ember Ore is so tough you need a good pickaxe for it.',
      cost: [{ coal: 4 }, { iron: 6, coal: 2 }, { diamond: 4, gold: 2 }, { ember: 3, diamond: 2 }], icon: function (lv) { return ICON.pick[Math.min(4, lv + 1)]; } },
    { id: 'boots', max: 4, names: ['Speedy Boots', 'Speedy Boots', 'Speedy Boots', 'Emberite Boots'], desc: 'Run a little faster than before.',
      cost: [{ iron: 3 }, { iron: 3, gold: 3 }, { gold: 3, diamond: 2 }, { ember: 2, gold: 4 }], icon: function () { return ICON.boot; } },
    { id: 'hearts', max: 2, names: ['Extra Heart'], desc: 'Start every level with one more heart.',
      cost: [{ iron: 3, gold: 4 }, { gold: 4, diamond: 3 }], icon: function () { return ICON.heart[1]; } },
    { id: 'power', max: 3, names: ['Crystal Power'], desc: 'Monsters stay scared 1.5 seconds longer.',
      cost: [{ coal: 3, iron: 1 }, { iron: 4, gold: 1 }, { gold: 4, diamond: 1 }], icon: function () { return ICON.crystal; } },
    { id: 'bag', max: 3, names: ['Block Bag'], desc: 'Carry 3 more blocks and start levels with extras.',
      cost: [{ coal: 2 }, { coal: 4, iron: 2 }, { iron: 4, gold: 2 }], icon: function () { return ICON.bag; } },
    { id: 'armor', max: 2, names: ['Emberite Armor'], desc: 'Tough ember plating soaks up one monster hit each level, then you flash and get a moment to run.',
      cost: [{ ember: 2, iron: 4 }, { ember: 4, diamond: 3 }], icon: function () { return ICON.ore.ember; } },
    { id: 'magnet', max: 1, names: ['Gem Magnet'], desc: 'Scoop up gems right next to you, too!',
      cost: [{ iron: 5, gold: 3 }], icon: function () { return ICON.magnet; } },
    { id: 'tnt', max: 5, consumable: true, names: ['TNT'], desc: 'Drop it and run! Blasts walls and bonks monsters. It won\'t hurt you.',
      cost: [{ coal: 3, iron: 1 }], icon: function () { return ICON.tnt; } }
  ];
  function canAfford(cost) { return Object.keys(cost).every(function (k) { return save.ores[k] >= cost[k]; }); }
  function renderCraft() {
    var bank = '';
    ['coal', 'iron', 'gold', 'diamond', 'ember'].forEach(function (k) { bank += '<span>' + img(ICON.ore[k]) + save.ores[k] + '</span>'; });
    $('ore-bank').innerHTML = bank;
    $('craft-foot').hidden = !craftThen;
    var box = $('recipes'); box.innerHTML = '';
    RECIPES.forEach(function (rc) {
      var lv = rc.consumable ? save.tnt : save.up[rc.id];
      var maxed = lv >= rc.max, cost = rc.consumable ? rc.cost[0] : rc.cost[Math.min(lv, rc.cost.length - 1)];
      var name = rc.names[Math.min(lv, rc.names.length - 1)];
      if (maxed && !rc.consumable) name = rc.names[rc.names.length - 1];
      var el = document.createElement('div'); el.className = 'recipe';
      var pips = '';
      if (!rc.consumable) { for (var i = 0; i < rc.max; i++) pips += '<span class="pip' + (i < lv ? ' on' : '') + '"></span>'; }
      else pips = '<span style="font-weight:900;color:var(--gold)">×' + lv + '</span>';
      var cs = '';
      Object.keys(cost).forEach(function (k) { cs += '<span class="' + (save.ores[k] < cost[k] ? 'short' : '') + '">' + img(ICON.ore[k]) + cost[k] + '</span>'; });
      el.innerHTML = '<div class="ric">' + img(rc.icon(lv)) + '</div><div><div class="rn">' + name + '<span class="pips">' + pips + '</span></div><div class="rd">' + rc.desc + '</div>' +
        '<div class="rbot"><span class="cost">' + (maxed ? '<span style="color:var(--gold)">' + (rc.consumable ? 'Bag full!' : 'Maxed out!') + '</span>' : cs) + '</span></div></div>';
      var btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-gold'; btn.textContent = 'Craft';
      btn.disabled = maxed || !canAfford(cost);
      btn.addEventListener('click', function () {
        if (maxed || !canAfford(cost)) return;
        Object.keys(cost).forEach(function (k) { save.ores[k] -= cost[k]; });
        if (rc.consumable) save.tnt++; else save.up[rc.id]++;
        persist(true); A.play('craft'); A.buzz(20);
        toast('Crafted ' + (rc.consumable ? 'TNT' : name) + '!');
        renderCraft();
        var n = box.children[RECIPES.indexOf(rc)]; if (n) n.classList.add('flash');
      });
      el.querySelector('.rbot').appendChild(btn);
      box.appendChild(el);
    });
  }
  $('btn-craft-continue').addEventListener('click', function () { A.play('click'); var f = craftThen; craftThen = null; if (f) f(); });

  // ================= Lucky Mine (between-level arcade) =================
  // Two booths, both paid for with ores. Payouts are tuned to return a bit less than
  // they take on average (~85-95%), with big swings, so it's a gamble rather than a farm.
  var STAKES = [
    { id: 'coal', cost: { coal: 3 } }, { id: 'iron', cost: { iron: 2 } }, { id: 'gold', cost: { gold: 2 } },
    { id: 'diamond', cost: { diamond: 1 } }, { id: 'ember', cost: { ember: 1 } }
  ];
  // Boom Blocks prizes per stake: [weight, {ore: n}]
  var BOOM_PRIZES = {
    coal:    [[25, { coal: 2 }], [30, { coal: 3 }], [22, { iron: 1 }], [13, { coal: 5 }], [10, { iron: 2 }]],
    iron:    [[28, { iron: 1 }], [30, { iron: 2 }], [24, { gold: 1 }], [10, { iron: 3 }], [8, { gold: 2 }]],
    gold:    [[32, { gold: 1 }], [30, { gold: 2 }], [24, { diamond: 1 }], [10, { gold: 3 }], [4, { diamond: 2 }]],
    diamond: [[32, { gold: 2 }], [46, { diamond: 1 }], [12, { diamond: 2 }], [10, { ember: 1 }]],
    ember:   [[42, { ember: 1 }], [30, { diamond: 2 }], [16, { diamond: 3 }], [12, { ember: 2 }]]
  };
  var BOOM_BOMBS = 3;
  // Ore Slots outcomes: [weight, kind]; payouts per stake
  var SLOT_ODDS = [[62, 'miss'], [22, 'pair'], [10, 'triple'], [4, 'big'], [2, 'jackpot']];
  var SLOT_BIG = { coal: { iron: 3 }, iron: { gold: 2 }, gold: { diamond: 2 }, diamond: { ember: 1, diamond: 1 }, ember: { ember: 3 } };
  var NEXT_ORE = { coal: 'iron', iron: 'gold', gold: 'diamond', diamond: 'ember', ember: 'ember' };
  var arcade = { game: 'boom', stake: null, boom: null, spinning: false };

  function pickWeighted(list) {
    var total = 0, i; for (i = 0; i < list.length; i++) total += list[i][0];
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) { r -= list[i][0]; if (r < 0) return list[i][1]; }
    return list[list.length - 1][1];
  }
  function canPay(cost) { return Object.keys(cost).every(function (k) { return save.ores[k] >= cost[k]; }); }
  function renderBank() {
    var bank = '';
    ['coal', 'iron', 'gold', 'diamond', 'ember'].forEach(function (k) { bank += '<span>' + img(ICON.ore[k]) + save.ores[k] + '</span>'; });
    $('arcade-bank').innerHTML = bank;
  }
  function pay(cost) { Object.keys(cost).forEach(function (k) { save.ores[k] -= cost[k]; }); save.stats.arcadeSpent = (save.stats.arcadeSpent || 0) + 1; persist(); renderBank(); }
  function award(prize) { Object.keys(prize).forEach(function (k) { save.ores[k] += prize[k]; }); persist(true); renderBank(); }
  function prizeHTML(prize) { return Object.keys(prize).map(function (k) { return '<span>' + img(ICON.ore[k]) + '×' + prize[k] + '</span>'; }).join(' '); }
  function mergePrize(into, prize) { Object.keys(prize).forEach(function (k) { into[k] = (into[k] || 0) + prize[k]; }); }
  function stakeLabel(st) { var k = Object.keys(st.cost)[0]; return st.cost[k] + ' ' + k; }

  function renderArcade() {
    renderBank();
    $('arcade-foot').hidden = !arcadeThen;
    renderChips();
    $('arcade-boom').hidden = arcade.game !== 'boom';
    $('arcade-slots').hidden = arcade.game !== 'slots';
    document.querySelectorAll('#arcade-tabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.game === arcade.game); });
    if (arcade.game === 'boom') renderBoom(); else renderSlots();
  }
  function renderChips() {
    var box = $('arcade-chips'); box.innerHTML = '';
    var busy = (arcade.boom && !arcade.boom.done) || arcade.spinning;
    STAKES.forEach(function (st) {
      var b = document.createElement('button'); b.className = 'chip-btn' + (arcade.stake === st.id ? ' active' : '');
      var k = Object.keys(st.cost)[0];
      b.innerHTML = img(ICON.ore[k]) + st.cost[k] + ' ' + k;
      b.disabled = busy || !canPay(st.cost);
      b.addEventListener('click', function () {
        A.play('click'); arcade.stake = st.id; renderChips();
        if (arcade.game === 'boom') renderBoom(); else renderSlots();
      });
      box.appendChild(b);
    });
    if (arcade.stake && !canPay(STAKES.filter(function (s) { return s.id === arcade.stake; })[0].cost)) arcade.stake = null;
  }
  document.querySelectorAll('#arcade-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      if ((arcade.boom && !arcade.boom.done) || arcade.spinning) { A.play('nope'); toast('Finish this round first!'); return; }
      A.play('click'); arcade.game = b.dataset.game; renderArcade();
    });
  });

  // ---- Boom Blocks: press your luck ----
  function newBoomRound() {
    var st = STAKES.filter(function (s) { return s.id === arcade.stake; })[0];
    var cells = [];
    for (var i = 0; i < 9; i++) cells.push(i < BOOM_BOMBS ? null : pickWeighted(BOOM_PRIZES[st.id]));
    Wd.shuffle(cells, Math.random);
    arcade.boom = { stake: st, cells: cells, open: [], haul: {}, done: false, dug: 0 };
  }
  function renderBoom() {
    var b = arcade.boom, grid = $('boom-grid'), take = $('boom-take');
    grid.innerHTML = '';
    var haulEl = $('boom-haul');
    if (!b || b.done) {
      haulEl.innerHTML = b && b.done ? haulEl.innerHTML : '<span class="empty-haul">' + (arcade.stake ? 'Tap a block to start digging (' + stakeLabel(STAKES.filter(function (s) { return s.id === arcade.stake; })[0]) + ')' : 'Pick what to pay first') + '</span>';
      for (var i = 0; i < 9; i++) {
        var c = document.createElement('button'); c.className = 'bblock' + (b && b.done ? (b.open.indexOf(i) >= 0 ? ' open' : ' dim') : '');
        c.style.backgroundImage = 'url(' + ICON.blockTop[TILE.STONE] + ')';
        if (b && b.done) { c.disabled = true; fillBlock(c, b.cells[i], b.open.indexOf(i) >= 0 && b.cells[i] === null); }
        else (function (idx) { c.addEventListener('click', function () { startBoomDig(idx); }); })(i);
        grid.appendChild(c);
      }
      take.disabled = true; take.textContent = b && b.done ? 'Play again' : 'Take it!';
      if (b && b.done) { take.disabled = false; take.onclick = function () { A.play('click'); arcade.boom = null; renderArcade(); }; }
      return;
    }
    var keys = Object.keys(b.haul);
    haulEl.innerHTML = keys.length ? '<span class="empty-haul">Bag:</span>' + prizeHTML(b.haul) : '<span class="empty-haul">Bag is empty — dig!</span>';
    for (var j = 0; j < 9; j++) {
      var cell = document.createElement('button'); cell.className = 'bblock';
      cell.style.backgroundImage = 'url(' + ICON.blockTop[TILE.STONE] + ')';
      if (b.open.indexOf(j) >= 0) { cell.classList.add('open'); cell.disabled = true; fillBlock(cell, b.cells[j], false); }
      else (function (idx) { cell.addEventListener('click', function () { digBoom(idx); }); })(j);
      grid.appendChild(cell);
    }
    take.disabled = !keys.length; take.textContent = 'Take it!';
    take.onclick = function () {
      if (!Object.keys(b.haul).length) return;
      award(b.haul); b.done = true; A.play('craft'); A.buzz(20);
      save.stats.arcadeWins = (save.stats.arcadeWins || 0) + 1;
      toast('Banked ' + Object.keys(b.haul).map(function (k) { return b.haul[k] + ' ' + k; }).join(', ') + '!');
      renderArcade();
    };
  }
  function fillBlock(el, content, exploded) {
    if (content === null) { el.innerHTML = img(ICON.tnt); if (exploded) el.classList.add('boom'); return; }
    var k = Object.keys(content)[0];
    el.innerHTML = img(ICON.ore[k]) + '<span class="cnt">×' + content[k] + '</span>';
  }
  function startBoomDig(idx) {
    if (!arcade.stake) { A.play('nope'); toast('Pick what to pay first!'); return; }
    var st = STAKES.filter(function (s) { return s.id === arcade.stake; })[0];
    if (!canPay(st.cost)) { A.play('nope'); toast('Not enough ' + Object.keys(st.cost)[0] + '!'); return; }
    pay(st.cost); newBoomRound(); renderChips();
    digBoom(idx);
  }
  function digBoom(idx) {
    var b = arcade.boom; if (!b || b.done || b.open.indexOf(idx) >= 0) return;
    b.open.push(idx); b.dug++;
    var content = b.cells[idx];
    if (content === null) {
      b.done = true; b.haul = {};
      A.play('boom'); A.buzz([60, 40, 80]);
      renderArcade();
      $('boom-haul').innerHTML = '<span class="empty-haul" style="color:#ff7a6a">BOOM! The bag blew up. Better luck next time!</span>';
      return;
    }
    mergePrize(b.haul, content);
    A.play('mined', { tile: TILE.STONE, drop: Object.keys(content)[0] }); A.buzz(15);
    if (b.dug === 9 - BOOM_BOMBS) { // cleared every safe block: auto-bank
      award(b.haul); b.done = true; A.play('unlock');
      toast('You found every ore! Banked it all.');
      renderArcade(); return;
    }
    renderBoom();
  }

  // ---- Ore Slots ----
  var SLOT_SYMBOLS = ['coal', 'iron', 'gold', 'diamond', 'ember', 'crystal'];
  function symImg(sym) { return sym === 'crystal' ? ICON.crystal : ICON.ore[sym]; }
  function renderSlots() {
    var st = arcade.stake ? STAKES.filter(function (s) { return s.id === arcade.stake; })[0] : null;
    $('slot-pull').disabled = !st || arcade.spinning;
    var reels = document.querySelectorAll('#reels .reel img');
    if (!arcade.spinning) reels.forEach(function (im, i) { if (!im.src) im.src = symImg(SLOT_SYMBOLS[(i * 2) % 6]); });
    var pt = $('paytable');
    if (!st) { pt.innerHTML = '<span>Pick what to pay to see the prizes.</span><span></span>'; $('slot-msg').textContent = 'Pick what to pay, then pull!'; return; }
    var k = st.id, n = st.cost[k];
    var big = SLOT_BIG[k], bigTxt = Object.keys(big).map(function (o) { return img(ICON.ore[o]) + '×' + big[o]; }).join(' + ');
    pt.innerHTML =
      '<span>' + img(symImg(k)) + img(symImg(k)) + ' any 2 match</span><b>' + img(ICON.ore[k]) + '×' + n + ' back</b>' +
      '<span>' + img(symImg(k)) + img(symImg(k)) + img(symImg(k)) + ' three ' + k + '</span><b>' + img(ICON.ore[k]) + '×' + (n * 3) + '</b>' +
      '<span>' + img(symImg(NEXT_ORE[k])) + img(symImg(NEXT_ORE[k])) + img(symImg(NEXT_ORE[k])) + ' three ' + NEXT_ORE[k] + '</span><b>' + bigTxt + '</b>' +
      '<span>' + img(ICON.crystal) + img(ICON.crystal) + img(ICON.crystal) + ' JACKPOT</span><b>' + img(ICON.ore[k]) + '×' + (n * 10) + '</b>';
    if (!arcade.spinning) $('slot-msg').textContent = 'Pull for ' + stakeLabel(st) + '!';
  }
  $('slot-pull').addEventListener('click', function () {
    if (arcade.spinning || !arcade.stake) return;
    var st = STAKES.filter(function (s) { return s.id === arcade.stake; })[0];
    if (!canPay(st.cost)) { A.play('nope'); toast('Not enough ' + Object.keys(st.cost)[0] + '!'); renderChips(); return; }
    pay(st.cost); arcade.spinning = true; renderChips(); $('slot-pull').disabled = true;
    var k = st.id, n = st.cost[k], outcome = pickWeighted(SLOT_ODDS), final;
    var others = SLOT_SYMBOLS.filter(function (x) { return x !== k && x !== 'crystal'; });
    function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    if (outcome === 'jackpot') final = ['crystal', 'crystal', 'crystal'];
    else if (outcome === 'big') { var nk = NEXT_ORE[k]; final = [nk, nk, nk]; }
    else if (outcome === 'triple') final = [k, k, k];
    else if (outcome === 'pair') { var a = rnd(SLOT_SYMBOLS.filter(function (x) { return x !== 'crystal'; })), o = rnd(SLOT_SYMBOLS.filter(function (x) { return x !== a; })); final = Wd.shuffle([a, a, o], Math.random); }
    else { // miss: three different, never three of a kind
      var pool = SLOT_SYMBOLS.slice(); Wd.shuffle(pool, Math.random); final = pool.slice(0, 3);
    }
    var reels = document.querySelectorAll('#reels .reel'), imgs = document.querySelectorAll('#reels .reel img');
    reels.forEach(function (r) { r.classList.add('spinning'); r.classList.remove('hit'); });
    $('slot-msg').textContent = 'Spinning…';
    var t0 = performance.now(), stops = [900, 1500, 2100], stopped = 0;
    A.play('tnt');
    var iv = setInterval(function () {
      var el = performance.now() - t0;
      imgs.forEach(function (im, i) {
        if (el < stops[i]) im.src = symImg(rnd(SLOT_SYMBOLS));
        else if (!reels[i].classList.contains('stopped')) { reels[i].classList.remove('spinning'); reels[i].classList.add('stopped'); im.src = symImg(final[i]); A.play('place'); stopped++; }
      });
      if (stopped === 3) {
        clearInterval(iv);
        reels.forEach(function (r) { r.classList.remove('stopped'); });
        arcade.spinning = false;
        var prize = null, msg = 'No match. Try again?';
        if (outcome === 'pair') { prize = {}; prize[k] = n; msg = 'A pair — you get your ' + k + ' back!'; }
        else if (outcome === 'triple') { prize = {}; prize[k] = n * 3; msg = 'THREE ' + k.toUpperCase() + '! ×3!'; }
        else if (outcome === 'big') { prize = SLOT_BIG[k]; msg = 'THREE ' + NEXT_ORE[k].toUpperCase() + '! Big win!'; }
        else if (outcome === 'jackpot') { prize = {}; prize[k] = n * 10; msg = 'JACKPOT!!! ×10!'; }
        if (prize) {
          award(prize); reels.forEach(function (r) { r.classList.add('hit'); });
          A.play(outcome === 'jackpot' ? 'clear' : (outcome === 'miss' ? 'nope' : 'unlock')); A.buzz(outcome === 'jackpot' ? [80, 50, 80, 50, 120] : 25);
          save.stats.arcadeWins = (save.stats.arcadeWins || 0) + 1;
        } else A.play('nope');
        renderArcade();
        $('slot-msg').innerHTML = msg + (prize ? ' ' + prizeHTML(prize) : '');
      }
    }, 70);
  });
  $('btn-arcade-continue').addEventListener('click', function () {
    if ((arcade.boom && !arcade.boom.done) || arcade.spinning) { A.play('nope'); toast('Finish this round first!'); return; }
    A.play('click'); var f = arcadeThen; arcadeThen = null; if (f) f();
  });

  // ================= hero =================
  var LOOKS = {
    shirt: ['#e0662f', '#3fa7e0', '#4fb84a', '#d8322b', '#8a5ad6', '#f2c230', '#f28bb8', '#3d3d48', '#ffffff'],
    pants: ['#3b5cc4', '#3d3d48', '#6b4f2c', '#2f8a5a', '#8a3b8a', '#c8c8d0'],
    hair: ['#5a3a22', '#2a1c14', '#d9a441', '#b5552a', '#e8e0d0', '#3a3a3a'],
    skin: ['#f1c49b', '#e0a877', '#c68a5c', '#9c6640', '#6e4428']
  };
  var HAT_COST = { knight: { iron: 6 }, crown: { gold: 6 }, diamond: { diamond: 5 }, ember: { ember: 3 } };
  var PETS = [
    { id: 'none', name: 'No pet' },
    { id: 'wolf', name: 'Wolf', cost: { gold: 5, iron: 3 }, desc: 'A blocky wolf that trots along behind you. Just for fun — monsters ignore it.' }
  ];
  var heroT = 0;
  function renderHero() {
    $('hero-name').value = save.name || '';
    var hb = $('sw-hat'); hb.innerHTML = '';
    PCTex.HATS.forEach(function (hat) {
      var b = document.createElement('button'); b.className = 'sw' + (save.look.hat === hat ? ' active' : '');
      var lk = Object.assign({}, save.look, { hat: hat, hatColor: save.look.shirt });
      b.style.backgroundImage = 'url(' + PCTex.dataURL(PCTex.hero(lk).down[0], 3) + ')';
      var owned = save.hats.indexOf(hat) >= 0;
      if (!owned) {
        var c = HAT_COST[hat], k = Object.keys(c)[0];
        b.innerHTML = '<span class="lock">' + img(ICON.ore[k]) + c[k] + '</span>';
      }
      b.addEventListener('click', function () {
        if (!owned) {
          var c = HAT_COST[hat], k = Object.keys(c)[0];
          if (save.ores[k] >= c[k]) {
            modal('Unlock this hat?', 'Costs ' + c[k] + ' ' + k + '. You have ' + save.ores[k] + '.', [
              { label: 'Not now', cls: 'btn-sm' },
              { label: 'Unlock!', cls: 'btn-gold btn-sm', fn: function () { save.ores[k] -= c[k]; save.hats.push(hat); save.look.hat = hat; persist(true); A.play('unlock'); lookChanged(); renderHero(); } }]);
          } else { A.play('nope'); toast('Need ' + c[k] + ' ' + k + ' to unlock (you have ' + save.ores[k] + ').'); }
          return;
        }
        A.play('click'); save.look.hat = hat; lookChanged(); renderHero();
      });
      hb.appendChild(b);
    });
    var pb = $('sw-pet'); pb.innerHTML = '';
    PETS.forEach(function (pet) {
      var b = document.createElement('button'); b.className = 'sw' + ((save.look.pet || 'none') === pet.id ? ' active' : '');
      b.title = pet.name;
      if (pet.id === 'none') b.innerHTML = '<span style="font-size:11px;font-weight:900;line-height:48px">NONE</span>';
      else b.style.backgroundImage = 'url(' + PCTex.dataURL(PCTex.wolf(save.look.shirt).right[1], 3) + ')';
      var owned = (save.pets || ['none']).indexOf(pet.id) >= 0;
      if (!owned && pet.cost) {
        var keys = Object.keys(pet.cost);
        b.innerHTML = '<span class="lock">' + keys.map(function (k) { return img(ICON.ore[k]) + pet.cost[k]; }).join(' ') + '</span>';
      }
      b.addEventListener('click', function () {
        if (!owned && pet.cost) {
          var can = Object.keys(pet.cost).every(function (k) { return save.ores[k] >= pet.cost[k]; });
          var priceTxt = Object.keys(pet.cost).map(function (k) { return pet.cost[k] + ' ' + k; }).join(' + ');
          if (can) {
            modal('Adopt the wolf?', pet.desc + ' Costs ' + priceTxt + '.', [
              { label: 'Not now', cls: 'btn-sm' },
              { label: 'Adopt!', cls: 'btn-gold btn-sm', fn: function () {
                Object.keys(pet.cost).forEach(function (k) { save.ores[k] -= pet.cost[k]; });
                save.pets.push(pet.id); save.look.pet = pet.id; persist(true); A.play('unlock'); lookChanged(); renderHero();
              } }]);
          } else { A.play('nope'); toast('Need ' + priceTxt + ' to adopt the wolf.'); }
          return;
        }
        A.play('click'); save.look.pet = pet.id; lookChanged(); renderHero();
      });
      pb.appendChild(b);
    });
    ['shirt', 'pants', 'hair', 'skin'].forEach(function (part) {
      var box = $('sw-' + part); box.innerHTML = '';
      LOOKS[part].forEach(function (col) {
        var b = document.createElement('button'); b.className = 'sw' + (save.look[part] === col ? ' active' : '');
        b.style.background = col;
        b.addEventListener('click', function () { A.play('click'); save.look[part] = col; lookChanged(); renderHero(); });
        box.appendChild(b);
      });
    });
  }
  function lookChanged() { save.look.hatColor = save.look.shirt; renderer.setLook(save.look); persist(); }
  $('hero-name').addEventListener('input', function () { save.name = this.value.trim().slice(0, 12) || 'Max'; persist(); });
  function drawHeroPreview(dt) {
    heroT += dt;
    var c = $('hero-preview'); if (c.width !== 64) { c.width = 64; c.height = 64; }
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
    var set = PCTex.hero(save.look), views = ['down', 'right', 'up', 'left'], v = views[Math.floor(heroT / 1.5) % 4];
    var f = 1 + Math.floor(heroT * 5) % 2;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 56, 16, 5, 0, 0, 7); g.fill();
    g.drawImage(set[v][f], 8, 6, 48, 48);
    if (save.look.pet && save.look.pet !== 'none') {
      var pw = PCTex.wolf(save.look.shirt), pv = v === 'up' ? 'up' : (v === 'down' ? 'down' : v);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(v === 'left' ? 50 : 14, 57, 10, 3, 0, 0, 7); g.fill();
      g.drawImage(pw[pv][1 + Math.floor(heroT * 5) % 2], v === 'left' ? 36 : 0, 30, 28, 28);
    }
    var pk = tex.picks[save.up.pick];
    g.save(); g.translate(v === 'left' ? 14 : 50, 42); if (v === 'left') g.scale(-1, 1); g.rotate(-0.4); g.drawImage(pk, -4, -22, 26, 26); g.restore();
  }

  // ================= builder =================
  var builder = null, editIdx = null;
  function openBuilder(idx) {
    if (!builder) {
      builder = new PCBuilder.Builder($('bld-canvas'));
      builder.onChange = function () { updateBuilderMsg(); };
      var pal = $('bld-palette');
      PCBuilder.TOOLS.forEach(function (t) {
        var b = document.createElement('button'); b.className = 'pal';
        var src = t.id === 'erase' ? ICON.floor.meadow : t.id === 'crystal' ? ICON.crystal : t.id === 'start' ? PCTex.dataURL(PCTex.hero(save.look).down[0], 3) : ICON.cube[t.id];
        b.innerHTML = img(src) + '<span>' + t.name + '</span>';
        b.addEventListener('click', function () { A.play('click'); builder.tool = t.id; pal.querySelectorAll('.pal').forEach(function (x) { x.classList.toggle('active', x === b); }); });
        if (t.id === TILE.STONE) b.classList.add('active');
        pal.appendChild(b);
      });
      var bio = $('bld-biome');
      Wd.BIOMES.forEach(function (bm) {
        var b = document.createElement('button'); b.dataset.biome = bm.id; b.textContent = bm.short;
        b.addEventListener('click', function () { A.play('click'); builder.data.biome = bm.id; syncBiome(); builder.draw(); });
        bio.appendChild(b);
      });
    }
    editIdx = idx;
    var data = idx != null ? save.levels[idx] : { name: (save.name || 'Max') + "'s Level " + (save.levels.length + 1), biome: 'meadow', tiles: null, crystals: [], start: null };
    if (!data.tiles) {
      var seed = Math.floor(Math.random() * 1e9), t = Wd.generateLayout(seed);
      Wd.paintBlocks(t, Wd.biomeById('meadow'), seed, 1);
      data.tiles = Array.prototype.slice.call(t); data.crystals = [[1, 3], [W - 2, 3], [1, H - 4], [W - 2, H - 4]];
    }
    builder.look = save.look;
    builder.load(data);
    $('bld-name').value = builder.data.name;
    $('bld-mirror').classList.toggle('on', builder.mirror);
    syncBiome(); updateBuilderMsg();
    show('builder');
    requestAnimationFrame(layout);
  }
  function syncBiome() { $('bld-biome').querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b.dataset.biome === builder.data.biome); }); }
  function builderGemCount() { try { return Wd.countGems(Wd.makeCustomLevel(builder.data).gems); } catch (e) { return 0; } }
  function updateBuilderMsg() {
    var n = builderGemCount();
    $('bld-tunnel').classList.toggle('on', builder.tunnelOn());
    $('bld-msg').textContent = n < 10 ? 'Make more open paths — gems go on every path you can reach.' : n + ' gems · tap a block type, then draw! Tap a block again to erase it.';
  }
  function saveBuilder(quiet) {
    builder.data.name = ($('bld-name').value || '').trim() || 'My Level';
    var copy = JSON.parse(JSON.stringify(builder.data));
    if (editIdx != null && save.levels[editIdx]) save.levels[editIdx] = copy; else { save.levels.unshift(copy); editIdx = 0; }
    persist(true);
    if (!quiet) { A.play('craft'); toast('Saved "' + copy.name + '"!'); }
    return copy;
  }
  $('bld-mirror').addEventListener('click', function () { A.play('click'); builder.mirror = !builder.mirror; this.classList.toggle('on', builder.mirror); builder.draw(); });
  $('bld-tunnel').addEventListener('click', function () { A.play('click'); builder.setTunnel(!builder.tunnelOn()); });
  $('bld-random').addEventListener('click', function () { A.play('click'); builder.randomize(); });
  $('bld-clear').addEventListener('click', function () {
    modal('Clear the maze?', 'This removes every block so you can start fresh.', [{ label: 'Cancel', cls: 'btn-sm' }, { label: 'Clear', cls: 'btn-red btn-sm', fn: function () { builder.clearAll(); } }]);
  });
  $('bld-save').addEventListener('click', function () { saveBuilder(false); });
  $('bld-test').addEventListener('click', function () {
    if (builderGemCount() < 10) { A.play('nope'); toast('Needs more open paths first!'); return; }
    A.play('click');
    var copy = saveBuilder(true);
    startCustom(copy, 'builder');
  });
  $('bld-back').addEventListener('click', function () { A.play('click'); saveBuilder(true); show('play', true); document.querySelector('#play-tabs [data-tab="mine"]').click(); });

  // ================= settings =================
  var SETTINGS = [
    { k: 'sfx', t: 'Sound effects' }, { k: 'music', t: 'Music' }, { k: 'haptics', t: 'Vibration', d: 'Buzz on digging and bonks (Android)' },
    { k: 'dpad', t: 'Joystick', d: 'Off = swipe on the maze to move' }, { k: 'lefty', t: 'Left-handed', d: 'Swap joystick and buttons' },
    { k: 'pushDig', t: 'Dig by pushing', d: 'Push into a wall to mine it' }
  ];
  function renderSettings() {
    var box = $('settings-list'); box.innerHTML = '';
    SETTINGS.forEach(function (s) {
      var row = document.createElement('div'); row.className = 'row';
      row.innerHTML = '<div><div class="t">' + s.t + '</div>' + (s.d ? '<div class="d">' + s.d + '</div>' : '') + '</div>';
      var sw = document.createElement('button'); sw.className = 'switch' + (save.settings[s.k] ? ' on' : ''); sw.setAttribute('aria-label', s.t);
      sw.addEventListener('click', function () { save.settings[s.k] = !save.settings[s.k]; applySettings(); persist(); A.play('click'); renderSettings(); });
      row.appendChild(sw); box.appendChild(row);
    });
    $('ver').textContent = VERSION;
  }
  $('btn-reset').addEventListener('click', function () {
    modal('Reset everything?', 'Ores, upgrades, hats, levels you built and high scores will all be erased.', [
      { label: 'Cancel', cls: 'btn-sm' },
      { label: 'Reset', cls: 'btn-red btn-sm', fn: function () { var keep = save.settings; save = defaults(); save.settings = keep; persist(true); renderer.setLook(save.look); toast('Progress reset.'); show('title', true); } }]);
  });

  // ================= help =================
  function renderHelp() {
    var box = $('help-list'); if (box.children.length) return;
    function scene(fn) { var c = PCTex.mk(32, 32), g = c.getContext('2d'); g.imageSmoothingEnabled = false; fn(g); return c; }
    var gemScene = scene(function (g) { g.fillStyle = '#a3845a'; g.fillRect(0, 0, 32, 32); [6, 16, 26].forEach(function (x) { g.fillStyle = '#1d6b4a'; g.fillRect(x - 2, 15, 4, 3); g.fillStyle = '#5ef0a8'; g.fillRect(x - 1.5, 14, 3, 3); }); });
    var items = [
      [gemScene, 'Gobble the gems', 'Eat every green gem to clear the level.'],
      [scene(function (g) { g.drawImage(tex.mons.rumble[0], 0, 8, 16, 16); PCTex.drawEyes(g, 0, 8, 1, 3); g.drawImage(tex.mons.sly[0], 16, 8, 16, 16); PCTex.drawEyes(g, 16, 8, 1, 1); }), 'Watch out!', 'Rumble, Sly, Frost and Mudge chase you. Each one hunts in its own way.'],
      [scene(function (g) { g.drawImage(tex.crystal, 2, 4, 12, 14); g.drawImage(tex.mons.fright[0], 16, 12, 16, 16); PCTex.drawEyes(g, 16, 12, 1, 0, true); }), 'Power Crystals', 'Grab one and the monsters turn blue. Now YOU chase THEM for big points!'],
      [scene(function (g) { g.drawImage(tex.blocks[TILE.STONE].top, 16, 8); g.drawImage(tex.cracks[3], 16, 8); g.drawImage(tex.picks[0], 2, 8, 14, 14); }), 'Dig!', 'Push into a wall or tap DIG to mine it and make a shortcut. The gray edge (bedrock) can\'t be dug.'],
      [scene(function (g) { g.drawImage(tex.blocks[TILE.GOLD].top, 0, 8); g.drawImage(tex.ores.gold, 18, 10, 12, 12); }), 'Find ores', 'Coal, iron, gold and diamond blocks give points and crafting stuff.'],
      [scene(function (g) { g.drawImage(tex.blocks[TILE.EMBER].top, 0, 8); g.drawImage(tex.ores.ember, 18, 10, 12, 12); }), 'Ember Ore',
        'The rarest block of all, hiding deep in the Lava Caves. It\'s tough — bring a Diamond Pickaxe. Trade ember for the Emberite Pickaxe, Emberite Armor and a glowing helmet.'],
      [scene(function (g) { g.drawImage(PCTex.cubeIcon(tex.blocks[TILE.PLANKS], 32), 0, 0); }), 'Build a wall', 'Tap the block button to drop a block behind you. Monsters bump into it! Dig walls to collect more blocks.'],
      [scene(function (g) { g.drawImage(tex.tnt[0], 4, 4, 24, 24); }), 'TNT', 'Drop it and run! It blasts walls and bonks monsters — but never hurts you.'],
      [scene(function (g) { g.drawImage(tex.food.apple, 2, 6, 14, 14); g.drawImage(tex.heart[1], 18, 10); }), 'Snacks', 'Food pops up under the monster cage. Eat it for points and a heart.'],
      [scene(function (g) { var ic = new Image(); ic.src = ICON.craft; g.drawImage(PCTex.cubeIcon(tex.blocks[TILE.PLANKS], 32), 0, 0); }), 'Crafting Table', 'Spend your ores on better pickaxes, speedy boots, extra hearts, TNT and more.'],
      [scene(function (g) { g.drawImage(tex.blocks[TILE.STONE].top, 0, 0, 16, 16, 0, 8, 16, 16); g.drawImage(tex.tnt[0], 16, 6, 16, 16); }), 'Lucky Mine', 'Between levels, bet some ores on Boom Blocks or Ore Slots. You might strike it rich… or go BOOM. Feeling lucky?'],
      [scene(function (g) { g.drawImage(PCTex.cubeIcon(tex.blocks[TILE.GRASS], 32), 0, 0); }), 'Build your own', 'Make your own maze in Build mode, then play it and show your friends!']
    ];
    items.forEach(function (it) {
      var d = document.createElement('div'); d.className = 'h';
      d.appendChild(it[0]);
      var t = document.createElement('div'); t.innerHTML = '<b>' + it[1] + '</b><span>' + it[2] + '</span>';
      d.appendChild(t); box.appendChild(d);
    });
    var k = document.createElement('div'); k.className = 'hint'; k.style.textAlign = 'center';
    k.textContent = 'Keyboard: arrows/WASD move · Space dig · B block · T TNT · P pause';
    box.appendChild(k);
  }

  // ================= boot =================
  buildIcons();
  applySettings();
  drawLogo();
  drawSign();
  PCCab.setApi({
    save: function () { return save; }, persist: persist, A: A, ICON: ICON, toast: toast, img: img,
    show: function (id) { show(id); }, back: function () { show('hub', true); },
    addOre: function (k, n) { save.ores[k] = (save.ores[k] || 0) + n; persist(); },
    isCab: function () { return current === 'cab'; }
  });
  PCCab.init();
  enterHub();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); });
  requestAnimationFrame(frame);
  // start title music on first touch (browsers need a gesture)
  document.addEventListener('pointerdown', function first() { A.unlock(); if (current === 'title' || current === 'hub') A.startMusic('title'); document.removeEventListener('pointerdown', first); });

  // ================= updates =================
  // A new version downloads quietly in the background. When it's ready we show a button;
  // tapping it saves progress, switches to the new version and reloads.
  var swReg = null, updateAsked = false, updateReady = false;
  function buildUpdateBar() {
    var bar = document.createElement('div');
    bar.id = 'update-bar'; bar.className = 'update-bar'; bar.hidden = true;
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<img alt="" src="' + ICON.crystal + '"><span><b>Update ready!</b><small>New stuff for PacCraft</small></span>' +
      '<button class="btn btn-sm btn-green" id="btn-update">Update</button><button class="upd-x" id="btn-update-later" aria-label="Later">✕</button>';
    $('app').appendChild(bar);
    $('btn-update').addEventListener('click', applyUpdate);
    $('btn-update-later').addEventListener('click', function () { A.play('click'); bar.hidden = true; updateReady = false; });
  }
  function showUpdateBar() {
    updateReady = true;
    var bar = $('update-bar'); if (!bar) return;
    bar.hidden = false; A.play('foodspawn');
  }
  function applyUpdate() {
    A.play('click');
    persist(true);
    $('btn-update').textContent = 'Updating…'; $('btn-update').disabled = true;
    updateAsked = true;
    if (swReg && swReg.waiting) swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    else location.reload();
    setTimeout(function () { location.reload(); }, 4000); // safety net
  }
  if (!window.PACCRAFT_SINGLE_FILE && 'serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    buildUpdateBar();
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (updateAsked) location.reload(); });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        swReg = reg;
        var hadController = !!navigator.serviceWorker.controller;
        if (reg.waiting && hadController) showUpdateBar();
        reg.addEventListener('updatefound', function () {
          var w = reg.installing; if (!w) return;
          w.addEventListener('statechange', function () {
            if (w.state === 'installed' && navigator.serviceWorker.controller && reg.waiting) showUpdateBar();
          });
        });
        function check() { reg.update().catch(function () { }); }
        document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
        setInterval(check, 20 * 60 * 1000);
      }).catch(function () { });
    });
  }
  window.PacCraft = { cab: PCCab, updateReady: function () { return updateReady; }, save: function () { return save; }, session: function () { return session; }, show: show, startAdventure: startAdventure, renderer: renderer, VERSION: VERSION };
})();
