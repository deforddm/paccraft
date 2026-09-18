/* Creek Crossing — Frogger with minecarts and logs. Hop across five rails of runaway carts,
 * ride logs and lily pads over the creek, and fill the five burrows on the far bank. */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 360, TS = 24, COLS = 13, OX = 4, OY = 28, ROWS = 13;
  var HOME = 0, RIVER0 = 1, RIVER1 = 5, MED = 6, ROAD0 = 7, ROAD1 = 11, START = 12;
  var SLOTS = [0, 3, 6, 9, 12];
  var TIME = 30;

  function create(ctx) {
    var tex = ctx.tex, Wd = window.PCWorld, T = Wd.TILE, hero = PCTex.hero(ctx.look);
    var S = {}, bg = null;

    function reset() { S.level = 1; S.lives = 3; S.score = 0; S.time = 0; S.parts = []; S.pops = []; S.msg = null; newLevel(); }
    function newLevel() {
      var r = Wd.rng(S.level * 311 + 5), lv = S.level, sp = 1 + (lv - 1) * 0.18;
      S.lanes = [];
      // river lanes 1..5 (row → {dir, speed, items:[{x,len,kind}]})
      for (var row = RIVER0; row <= RIVER1; row++) {
        var dir = row % 2 ? 1 : -1, speed = (0.9 + r() * 0.8) * sp * (row === 3 ? 1.3 : 1);
        var kind = row === 3 ? 'pad' : (r() < 0.3 && lv >= 2 ? 'ice' : 'log');
        var len = kind === 'pad' ? 1 : (kind === 'ice' ? 2 : 2 + Math.floor(r() * 3));
        var gap = 2 + Math.floor(r() * 2) + (lv >= 3 ? 1 : 0), items = [], x = r() * 3;
        while (x < COLS + 6) { items.push({ x: x, len: len, kind: kind, dive: kind === 'pad' && lv >= 2 && r() < 0.5, ph: r() * 6 }); x += len + gap; }
        S.lanes[row] = { dir: dir, speed: speed, items: items, span: x, river: true };
      }
      // road lanes 7..11
      for (var row2 = ROAD0; row2 <= ROAD1; row2++) {
        var d2 = row2 % 2 ? -1 : 1, s2 = (0.8 + r() * 1.1) * sp, len2 = r() < 0.25 ? 2 : 1, items2 = [], x2 = r() * 4, gap2 = 3 + Math.floor(r() * 3);
        var mk = ['rumble', 'sly', 'frost', 'mudge'][Math.floor(r() * 4)];
        while (x2 < COLS + 6) { items2.push({ x: x2, len: len2, kind: 'cart', mon: mk }); x2 += len2 + gap2; }
        S.lanes[row2] = { dir: d2, speed: s2, items: items2, span: x2, river: false };
      }
      S.homes = SLOTS.map(function (c) { return { c: c, filled: false, ore: null }; });
      S.oreT = 3;
      spawn();
      S.msg = { text: 'LEVEL ' + S.level, t: 1.6 }; ctx.A.play('ready');
      if (S.level === 1) S.hintT = 1.7;
    }
    function spawn() {
      S.p = { x: 6, row: START, hop: 0, fx: 6, frow: START, dead: 0, face: 0, splash: false };
      S.timer = TIME; S.safeT = 1;
      ctx.pet.reset(S.p.x - 1.2, START, 3);
    }
    function burst(x, y, col, n) { for (var i = 0; i < n; i++) S.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 100 - 10, g: 260, life: 0.4 + Math.random() * 0.3, t: 0, col: col, s: 2 + Math.random() * 3 }); }
    function pop(x, y, text, col) { S.pops.push({ x: x, y: y, text: text, col: col || '#fff', t: 0 }); }
    function addScore(n) { S.score += n; ctx.score(S.score); }
    function px(x) { return OX + x * TS + TS / 2; }
    function py(row) { return OY + row * TS + TS / 2; }
    function itemX(lane, it) { // wrap items around the lane's span
      var x = it.x + lane.dir * S.time * lane.speed, span = lane.span;
      x = ((x + 3) % span + span) % span - 3;
      return x;
    }
    function platformUnder(row, x) {
      var lane = S.lanes[row]; if (!lane || !lane.river) return null;
      for (var i = 0; i < lane.items.length; i++) { var it = lane.items[i], ix = itemX(lane, it); if (it.dive && Math.sin(S.time * 1.2 + it.ph) > 0.55) continue; if (x > ix - 0.45 && x < ix + it.len - 0.55) return { lane: lane, it: it }; }
      return null;
    }
    function hop(dir) {
      var p = S.p; if (p.dead > 0 || p.hop > 0 || S.msg && S.msg.t > 1.4 && S.msg.text.indexOf('LEVEL') === 0) return;
      var nx = Math.round(p.x), nr = p.row;
      if (dir === 0) nr--; else if (dir === 2) nr++; else if (dir === 1) nx = Math.round(p.x - 1); else if (dir === 3) nx = Math.round(p.x + 1);
      if (nx < 0 || nx >= COLS || nr < HOME || nr > START) { ctx.fx('nope'); return; }
      if (nr === HOME) {
        var home = S.homes.filter(function (h) { return h.c === nx; })[0];
        if (!home || home.filled) { ctx.fx('nope'); p.bump = 0.2; return; }
      }
      p.face = dir; p.fx = p.x; p.frow = p.row; p.x = nx; p.row = nr; p.hop = 0.14; ctx.fx('hop');
      if (nr < (p.best == null ? START : p.best)) { p.best = nr; addScore(10); }
    }
    function die(how) {
      var p = S.p; if (p.dead > 0) return;
      p.dead = 1.1; p.splash = how === 'splash'; S.lives--;
      ctx.fx(how === 'splash' ? 'splash' : 'death'); ctx.buzz([60, 40, 80]);
      burst(px(p.x), py(p.row), how === 'splash' ? '#6fb7ff' : '#ffb37a', 12);
    }
    function reachHome(home) {
      home.filled = true; var bonus = 50 + Math.ceil(S.timer) * 10; addScore(bonus); pop(px(home.c), py(HOME) - 10, String(bonus), '#7dff8a'); ctx.fx('crystal'); ctx.buzz(20); ctx.pet.bark();
      if (home.ore) { ctx.addOre(home.ore, 1); pop(px(home.c), py(HOME) - 22, '+1 ' + home.ore.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: home.ore }); home.ore = null; }
      if (S.homes.every(function (h) { return h.filled; })) {
        addScore(500 * S.level); ctx.addOre('coal', 1 + Math.floor(S.level / 2)); ctx.fx('clear'); ctx.buzz(30); ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop();
        S.level++; newLevel(); return;
      }
      spawn();
    }
    function update(dt) {
      S.time += dt;
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.hintT > 0) { S.hintT -= dt; if (S.hintT <= 0) S.msg = { text: 'HOP TO THE BURROWS!', t: 2.4 }; }
      if (S.safeT > 0) S.safeT -= dt;
      var p = S.p;
      // ore bonus wanders between empty burrows
      S.oreT -= dt;
      if (S.oreT <= 0) { S.oreT = 7 + Math.random() * 5; S.homes.forEach(function (h) { h.ore = null; }); var empt = S.homes.filter(function (h) { return !h.filled; }); if (empt.length && Math.random() < 0.7) empt[Math.floor(Math.random() * empt.length)].ore = ['coal', 'coal', 'iron', 'gold', 'diamond'][Math.min(4, Math.floor(Math.random() * (2 + S.level)))]; }
      if (p.dead > 0) {
        p.dead -= dt; ctx.pet.sit(dt);
        if (p.dead <= 0) { if (S.lives <= 0) { ctx.over({ lines: [['Level reached', S.level]] }); return; } spawn(); S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 }; }
        return;
      }
      if (p.bump > 0) p.bump -= dt;
      if (p.hop > 0) { p.hop -= dt; if (p.hop <= 0 && p.row === HOME) { var home = S.homes.filter(function (h) { return h.c === Math.round(p.x); })[0]; if (home) { reachHome(home); return; } } }
      S.timer -= dt; if (S.timer <= 0) { die('time'); return; }
      // ride platforms on the river
      if (p.hop <= 0 && p.row >= RIVER0 && p.row <= RIVER1) {
        var pl = platformUnder(p.row, p.x);
        if (!pl) { die('splash'); return; }
        p.x += pl.lane.dir * pl.lane.speed * dt;
        if (p.x < -0.5 || p.x > COLS - 0.5) { die('splash'); return; }
      }
      // carts
      if (p.row >= ROAD0 && p.row <= ROAD1 && S.safeT <= 0) {
        var lane = S.lanes[p.row], hx = p.hop > 0 ? (p.fx + (p.x - p.fx) * (1 - p.hop / 0.14)) : p.x;
        for (var i = 0; i < lane.items.length; i++) { var it = lane.items[i], ix = itemX(lane, it); if (hx > ix - 0.6 && hx < ix + it.len - 0.4) { die('cart'); return; } }
      }
      // joystick held → keep hopping
      if (ctx.held.dir >= 0 && p.hop <= 0) { if (!S.heldT || S.heldT <= 0) { hop(ctx.held.dir); S.heldT = 0.22; } else S.heldT -= dt; } else S.heldT = 0;
      ctx.pet.follow(p.x, START, dt, { dist: 1.2, lockY: START, snap: 20, speed: 5 });
      S.parts.forEach(function (q) { q.t += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }); S.parts = S.parts.filter(function (q) { return q.t < q.life; });
      S.pops.forEach(function (q) { q.t += dt; }); S.pops = S.pops.filter(function (q) { return q.t < 1; });
    }
    function drawBg(g) {
      if (!bg) {
        bg = document.createElement('canvas'); bg.width = W; bg.height = H; var b = bg.getContext('2d'); b.imageSmoothingEnabled = false;
        b.fillStyle = '#1a1420'; b.fillRect(0, 0, W, H);
        for (var row = 0; row < ROWS; row++) for (var c = 0; c < COLS; c++) {
          var x = OX + c * TS, y = OY + row * TS, t;
          if (row === HOME) t = SLOTS.indexOf(c) >= 0 ? null : T.DIRT;
          else if (row >= RIVER0 && row <= RIVER1) t = null;
          else if (row === MED || row === START) t = T.GRASS;
          else t = T.GRAVEL || T.STONE;
          if (t != null) b.drawImage(tex.blocks[t].top, 0, 0, 16, 16, x, y, TS, TS);
          else if (row === HOME) { b.fillStyle = '#0d0910'; b.fillRect(x, y, TS, TS); b.fillStyle = '#2a1e12'; b.fillRect(x, y + TS - 4, TS, 4); }
          else { b.fillStyle = (row + c) % 2 ? '#2b6fc4' : '#2f79d2'; b.fillRect(x, y, TS, TS); b.fillStyle = 'rgba(255,255,255,0.12)'; b.fillRect(x + 3, y + 6 + (row * 5) % 10, 8, 2); }
          if (row >= ROAD0 && row <= ROAD1) { b.fillStyle = '#6b6b72'; b.fillRect(x, y + 7, TS, 2); b.fillRect(x, y + 15, TS, 2); b.fillStyle = '#5a3f22'; b.fillRect(x + 4, y + 5, 3, 14); b.fillRect(x + 16, y + 5, 3, 14); }
        }
        b.fillStyle = 'rgba(0,0,0,0.25)'; b.fillRect(OX, OY + MED * TS, COLS * TS, 1); b.fillRect(OX, OY + START * TS, COLS * TS, 1);
      }
      g.drawImage(bg, 0, 0);
    }
    function drawItem(g, lane, it, row) {
      var ix = itemX(lane, it), X = OX + ix * TS, Y = OY + row * TS;
      if (X > W + 10 || X + it.len * TS < -10) return;
      if (it.kind === 'log') { for (var i = 0; i < it.len; i++) g.drawImage(tex.blocks[T.LOG].top, 0, 0, 16, 16, X + i * TS, Y + 3, TS, TS - 6); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X, Y + TS - 4, it.len * TS, 2); }
      else if (it.kind === 'ice') { for (var j = 0; j < it.len; j++) g.drawImage(tex.blocks[T.ICE].top, 0, 0, 16, 16, X + j * TS, Y + 2, TS, TS - 4); }
      else if (it.kind === 'pad') {
        var under = it.dive && Math.sin(S.time * 1.2 + it.ph) > 0.55, warn = it.dive && Math.sin(S.time * 1.2 + it.ph) > 0.2;
        if (under) { g.fillStyle = 'rgba(120,200,120,0.35)'; g.fillRect(X + 4, Y + 6, TS - 8, TS - 12); return; }
        g.fillStyle = warn ? '#5aa04a' : '#4fc96a'; g.fillRect(X + 2, Y + 3, TS - 4, TS - 6); g.fillStyle = '#8df0a0'; g.fillRect(X + 4, Y + 5, 8, 4); g.fillStyle = '#2f79d2'; g.fillRect(X + TS / 2 - 1, Y + 3, 3, 6);
      } else { // minecart with a monster riding
        for (var k = 0; k < it.len; k++) { g.fillStyle = '#4a4a52'; g.fillRect(X + k * TS + 1, Y + 6, TS - 2, 14); g.fillStyle = '#7a7a84'; g.fillRect(X + k * TS + 2, Y + 7, TS - 4, 4); g.fillStyle = '#26262c'; g.fillRect(X + k * TS + 3, Y + 19, 6, 4); g.fillRect(X + k * TS + TS - 9, Y + 19, 6, 4); }
        g.drawImage(tex.mons[it.mon][Math.floor(S.time * 6) % 2], X + (it.len * TS) / 2 - 7, Y - 2, 14, 13); PCTex.drawEyes(g, X + (it.len * TS) / 2 - 7, Y - 2, 14 / 16, lane.dir > 0 ? 3 : 1, false);
      }
    }
    function draw(g, w, h, dt) {
      drawBg(g);
      // burrows
      S.homes.forEach(function (hm) {
        var X = OX + hm.c * TS, Y = OY;
        if (hm.filled) { g.drawImage(hero.down[0], X + 2, Y + 2, TS - 4, TS - 4); }
        else if (hm.ore) { g.drawImage(tex.ores[hm.ore], X + 5, Y + 5 + Math.sin(S.time * 5) * 1.5, 14, 14); }
      });
      for (var row = 0; row < ROWS; row++) { var lane = S.lanes[row]; if (!lane) continue; lane.items.forEach(function (it) { drawItem(g, lane, it, row); }); }
      // wolf on the bank
      ctx.pet.draw(g, px(ctx.pet.x), py(START) + TS / 2 - 2, TS - 2);
      // hero
      var p = S.p;
      if (p.dead > 0) {
        if (p.splash) { g.globalAlpha = Math.max(0, p.dead - 0.3); g.drawImage(hero.down[0], px(p.x) - TS / 2, py(p.row) - TS / 2 + (1.1 - p.dead) * 14, TS, TS); g.globalAlpha = 1; }
        else { g.save(); g.translate(px(p.x), py(p.row)); g.rotate((1.1 - p.dead) * 8); var sc = Math.max(0, p.dead); g.scale(sc, sc); g.drawImage(hero.down[0], -TS / 2, -TS / 2, TS, TS); g.restore(); }
      } else {
        var f = p.hop > 0 ? 1 - p.hop / 0.14 : 1, hx = p.fx + (p.x - p.fx) * f, hr = p.frow + (p.row - p.frow) * f;
        if (p.hop > 0) { hx = p.fx + (p.x - p.fx) * f; }
        var lift = p.hop > 0 ? -Math.sin(f * Math.PI) * 8 : 0, view = ['up', 'left', 'down', 'right'][p.face];
        if (!(S.safeT > 0 && Math.floor(S.time * 10) % 2)) {
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(px(hx) - 7, py(hr) + 8, 14, 3);
          g.drawImage(hero[view][p.hop > 0 ? 1 : 0], Math.round(px(hx) - TS / 2), Math.round(py(hr) - TS / 2 + lift - 2), TS, TS);
        }
      }
      S.parts.forEach(function (q) { g.globalAlpha = 1 - q.t / q.life; g.fillStyle = q.col; g.fillRect(q.x, q.y, q.s, q.s); }); g.globalAlpha = 1;
      S.pops.forEach(function (q) { g.globalAlpha = 1 - q.t; PCTex.drawText(g, q.text, q.x - PCTex.textWidth(q.text, 1) / 2, q.y - q.t * 24, 1, q.col, '#000'); }); g.globalAlpha = 1;
      // hud
      g.fillStyle = '#1a1420'; g.fillRect(0, 0, W, OY);
      for (var i = 0; i < S.lives; i++) g.drawImage(tex.heart[1], 6 + i * 16, 6, 14, 13);
      PCTex.drawText(g, 'LV ' + S.level, W - 50, 8, 2, '#ffe680', '#000');
      var tf = Math.max(0, S.timer / TIME); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(90, 10, 120, 8); g.fillStyle = tf < 0.25 ? '#ff7a6a' : '#5ef0a8'; g.fillRect(90, 10, 120 * tf, 8);
      g.fillStyle = '#1a1420'; g.fillRect(0, OY + ROWS * TS, W, H - OY - ROWS * TS);
      if (S.msg) { var s = S.msg.text.length > 12 ? 2 : 3, tw = PCTex.textWidth(S.msg.text, s); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(W / 2 - tw / 2 - 10, H / 2 - 20, tw + 20, 36); PCTex.drawText(g, S.msg.text, W / 2 - tw / 2, H / 2 - 10, s, '#ffe680', '#000'); }
    }
    var touch = null;
    function input(e) {
      if (e.type === 'dir' && e.dir >= 0) { hop(e.dir); S.heldT = 0.3; }
      else if (e.type === 'touch') {
        if (e.phase === 'down') touch = { x: e.x, y: e.y };
        else if (e.phase === 'up' && touch) {
          var dx = touch.lx != null ? touch.lx - touch.x : 0, dy = touch.ly != null ? touch.ly - touch.y : 0, d;
          if (Math.hypot(dx, dy) > 14) d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : (dy > 0 ? 2 : 0);
          else { var ox = touch.x - px(S.p.x), oy = touch.y - py(S.p.row); d = Math.abs(ox) > Math.abs(oy) * 1.4 ? (ox > 0 ? 3 : 1) : (oy > 0 ? 2 : 0); }
          hop(d); touch = null;
        } else if (e.phase === 'move' && touch) { touch.lx = e.x; touch.ly = e.y; }
      }
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { hop: hop, platformUnder: platformUnder } };
  }

  return {
    id: 'crossing', name: 'Creek Crossing', blurb: 'Hop past runaway minecarts, ride logs over the creek, fill the five burrows.',
    view: { w: W, h: H }, music: 'forest',
    controls: { dpad: true, a: null, b: null },
    thumb: function (g, w, h, tex, look) {
      var T2 = window.PCWorld.TILE;
      for (var x = 0; x < w; x += 8) { g.drawImage(tex.blocks[T2.DIRT].top, 0, 0, 16, 16, x, 0, 8, 8); g.drawImage(tex.blocks[T2.GRASS].top, 0, 0, 16, 16, x, 40, 8, 8); g.drawImage(tex.blocks[T2.GRASS].top, 0, 0, 16, 16, x, 22, 8, 6); }
      g.fillStyle = '#2f79d2'; g.fillRect(0, 8, w, 14); g.fillStyle = '#6b6b72'; g.fillRect(0, 28, w, 12);
      g.drawImage(tex.blocks[T2.LOG].top, 0, 0, 16, 16, 6, 10, 20, 6); g.drawImage(tex.blocks[T2.LOG].top, 0, 0, 16, 16, 40, 15, 22, 6);
      g.fillStyle = '#4a4a52'; g.fillRect(10, 30, 14, 8); g.fillRect(44, 30, 14, 8);
      g.drawImage(tex.mons.sly[0], 13, 25, 8, 7); g.drawImage(tex.mons.rumble[0], 47, 25, 8, 7);
      g.drawImage(PCTex.hero(look || PCTex.LOOK_DEFAULT).up[0], 28, 36, 10, 10);
      g.fillStyle = '#0d0910'; g.fillRect(28, 0, 8, 8);
    },
    create: create
  };
})());
