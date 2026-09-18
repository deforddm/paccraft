/* Slime Snake — Snake with a growing slime. Gobble emeralds to grow, grab the ore blocks
 * that pop up, dodge the cobble and your own tail. The wolf chases the tip of your tail. */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 380, CS = 20, COLS = 16, ROWS = 17, OX = 0, OY = 28;
  var DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];

  function create(ctx) {
    var tex = ctx.tex, Wd = window.PCWorld, T = Wd.TILE;
    var S = {}, bg = null;
    function idx(x, y) { return y * COLS + x; }
    function reset() { S.level = 1; S.lives = 3; S.score = 0; S.time = 0; S.parts = []; S.pops = []; S.msg = null; S.gems = 0; newLevel(); }
    function newLevel() {
      var r = Wd.rng(S.level * 4451 + 9);
      S.wall = new Uint8Array(COLS * ROWS);
      for (var x = 0; x < COLS; x++) { S.wall[idx(x, 0)] = 1; S.wall[idx(x, ROWS - 1)] = 1; }
      for (var y = 0; y < ROWS; y++) { S.wall[idx(0, y)] = 1; S.wall[idx(COLS - 1, y)] = 1; }
      var n = Math.min(10, (S.level - 1) * 2);
      for (var i = 0; i < n; i++) { var wx = 2 + Math.floor(r() * (COLS - 4)), wy = 2 + Math.floor(r() * (ROWS - 4)); if (Math.abs(wy - Math.floor(ROWS / 2)) < 2 && wx > 3 && wx < 10) continue; S.wall[idx(wx, wy)] = 2; if (r() < 0.5 && wx + 1 < COLS - 1) S.wall[idx(wx + 1, wy)] = 2; }
      bg = null;
      spawn();
      S.msg = { text: 'LEVEL ' + S.level, t: 1.5 }; ctx.A.play('ready');
      if (S.level === 1) S.hintT = 1.6;
    }
    function spawn() {
      S.body = [{ x: 6, y: Math.floor(ROWS / 2) }, { x: 5, y: Math.floor(ROWS / 2) }, { x: 4, y: Math.floor(ROWS / 2) }];
      S.dir = 3; S.next = 3; S.stepT = 0; S.grow = 0; S.dead = 0; S.wait = 1.0; S.ore = null; S.oreT = 6 + Math.random() * 4;
      S.gem = null; placeGem();
      ctx.pet.reset(S.body[S.body.length - 1].x - 1, S.body[S.body.length - 1].y, 3);
    }
    function free(x, y) { if (S.wall[idx(x, y)]) return false; for (var i = 0; i < S.body.length; i++) if (S.body[i].x === x && S.body[i].y === y) return false; if (S.gem && S.gem.x === x && S.gem.y === y) return false; if (S.ore && S.ore.x === x && S.ore.y === y) return false; return true; }
    function randFree() { for (var t = 0; t < 200; t++) { var x = 1 + Math.floor(Math.random() * (COLS - 2)), y = 1 + Math.floor(Math.random() * (ROWS - 2)); if (free(x, y)) return { x: x, y: y }; } return null; }
    function placeGem() { S.gem = randFree(); }
    function stepGap() { return Math.max(0.075, 0.2 - (S.level - 1) * 0.012 - Math.min(0.05, S.body.length * 0.0015)); }
    function burst(x, y, col, n) { for (var i = 0; i < n; i++) S.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 100 - 10, g: 260, life: 0.4 + Math.random() * 0.3, t: 0, col: col, s: 2 + Math.random() * 3 }); }
    function pop(x, y, text, col) { S.pops.push({ x: x, y: y, text: text, col: col || '#fff', t: 0 }); }
    function addScore(n) { S.score += n; ctx.score(S.score); }
    function px(x) { return OX + x * CS + CS / 2; }
    function py(y) { return OY + y * CS + CS / 2; }
    function turn(d) { if (d < 0 || S.dead > 0) return; if ((d + 2) % 4 === S.dir && S.body.length > 1) return; S.next = d; if (S.wait > 0) S.wait = 0; }
    function die() {
      S.dead = 1.2; S.lives--; ctx.fx('death'); ctx.buzz([60, 40, 80]);
      var h = S.body[0]; burst(px(h.x), py(h.y), '#4fc96a', 14);
    }
    function step() {
      S.dir = S.next;
      var h = S.body[0], nx = h.x + DX[S.dir], ny = h.y + DY[S.dir];
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || S.wall[idx(nx, ny)]) { die(); return; }
      var tailIdx = S.body.length - 1;
      for (var i = 0; i < S.body.length; i++) if (S.body[i].x === nx && S.body[i].y === ny && !(i === tailIdx && S.grow === 0)) { die(); return; }
      S.body.unshift({ x: nx, y: ny });
      if (S.gem && S.gem.x === nx && S.gem.y === ny) {
        S.grow += 1; S.gems++; addScore(10 * S.level); ctx.fx('gem'); burst(px(nx), py(ny), '#5ef0a8', 6);
        placeGem();
        if (S.gems % 10 === 0) { addScore(200 * S.level); ctx.addOre('coal', 1 + Math.floor(S.level / 3)); ctx.fx('clear'); ctx.buzz(30); ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop(); S.level++; S.msg = { text: 'LEVEL ' + S.level, t: 1.4 }; rebuildWalls(); }
      } else if (S.ore && S.ore.x === nx && S.ore.y === ny) {
        S.grow += 2; addScore(50 * S.level); ctx.addOre(S.ore.kind, 1); pop(px(nx), py(ny) - 10, '+1 ' + S.ore.kind.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: S.ore.kind }); ctx.buzz(15); ctx.pet.bark();
        S.ore = null; S.oreT = 8 + Math.random() * 6;
      }
      if (S.grow > 0) S.grow--; else S.body.pop();
    }
    function rebuildWalls() { // keep the snake, refresh obstacles (only where the snake isn't)
      var r = Wd.rng(S.level * 4451 + 9);
      for (var i = 0; i < S.wall.length; i++) if (S.wall[i] === 2) S.wall[i] = 0;
      var n = Math.min(10, (S.level - 1) * 2);
      for (var k = 0; k < n; k++) { var wx = 2 + Math.floor(r() * (COLS - 4)), wy = 2 + Math.floor(r() * (ROWS - 4)); var near = S.body.some(function (b) { return Math.abs(b.x - wx) <= 1 && Math.abs(b.y - wy) <= 1; }); if (near) continue; S.wall[idx(wx, wy)] = 2; if (r() < 0.5 && wx + 1 < COLS - 1 && !S.body.some(function (b) { return Math.abs(b.x - wx - 1) <= 1 && Math.abs(b.y - wy) <= 1; })) S.wall[idx(wx + 1, wy)] = 2; }
      if (S.gem && S.wall[idx(S.gem.x, S.gem.y)]) placeGem();
      bg = null;
    }
    function update(dt) {
      S.time += dt;
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.hintT > 0) { S.hintT -= dt; if (S.hintT <= 0) S.msg = { text: 'EAT THE EMERALDS!', t: 2.2 }; }
      if (S.dead > 0) {
        S.dead -= dt; ctx.pet.sit(dt);
        if (S.dead <= 0) { if (S.lives <= 0) { ctx.over({ lines: [['Level reached', S.level], ['Longest', S.longest || S.body.length]] }); return; } spawn(); S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 }; }
        return;
      }
      if (ctx.held.dir >= 0) turn(ctx.held.dir);
      if (S.wait > 0) { S.wait -= dt; }
      else {
        S.stepT += dt;
        while (S.stepT >= stepGap() && S.dead <= 0) { S.stepT -= stepGap(); step(); }
      }
      S.longest = Math.max(S.longest || 0, S.body.length);
      if (!S.ore) { S.oreT -= dt; if (S.oreT <= 0) { var c = randFree(); if (c) { S.ore = { x: c.x, y: c.y, kind: ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'][Math.min(6, Math.floor(Math.random() * (2.5 + S.level * 0.8)))], life: 9 }; ctx.fx('foodspawn'); } else S.oreT = 3; } }
      else { S.ore.life -= dt; if (S.ore.life <= 0) { S.ore = null; S.oreT = 6 + Math.random() * 4; } }
      var tail = S.body[S.body.length - 1];
      ctx.pet.follow(tail.x, tail.y, dt, { dist: 1.1, snap: 4, speed: 1 / stepGap() * 0.9 });
      S.parts.forEach(function (q) { q.t += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }); S.parts = S.parts.filter(function (q) { return q.t < q.life; });
      S.pops.forEach(function (q) { q.t += dt; }); S.pops = S.pops.filter(function (q) { return q.t < 1; });
    }
    function drawBg(g) {
      if (!bg) {
        bg = document.createElement('canvas'); bg.width = W; bg.height = H; var b = bg.getContext('2d'); b.imageSmoothingEnabled = false;
        b.fillStyle = '#1a1420'; b.fillRect(0, 0, W, H);
        for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
          var w = S.wall[idx(x, y)], X = OX + x * CS, Y = OY + y * CS;
          if (w === 1) b.drawImage(tex.blocks[T.BORDER].top, 0, 0, 16, 16, X, Y, CS, CS);
          else if (w === 2) { b.drawImage(tex.blocks[T.COBBLE].top, 0, 0, 16, 16, X, Y, CS, CS); b.fillStyle = 'rgba(0,0,0,0.35)'; b.fillRect(X, Y + CS - 2, CS, 2); }
          else { b.drawImage(tex.floors.forest[(x * 7 + y * 3) % 3], X, Y, CS, CS); b.fillStyle = (x + y) % 2 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.03)'; b.fillRect(X, Y, CS, CS); }
        }
      }
      g.drawImage(bg, 0, 0);
    }
    function draw(g, w, h, dt) {
      drawBg(g);
      // gem & ore
      if (S.gem) { var gx = px(S.gem.x), gy = py(S.gem.y) + Math.sin(S.time * 6) * 1.5; g.fillStyle = '#1d6b4a'; g.fillRect(gx - 5, gy - 4, 10, 10); g.fillStyle = '#5ef0a8'; g.fillRect(gx - 5, gy - 5, 10, 9); g.fillStyle = '#d6ffe9'; g.fillRect(gx - 5, gy - 5, 3, 3); }
      if (S.ore) { var o = S.ore, blink = o.life < 3 && Math.floor(S.time * 8) % 2; if (!blink) { g.drawImage(tex.blocks[T[o.kind.toUpperCase()]].top, 0, 0, 16, 16, OX + o.x * CS + 1, OY + o.y * CS + 1, CS - 2, CS - 2); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(OX + o.x * CS + 1, OY + o.y * CS + 1, CS - 2, 1); } }
      // wolf (under the snake)
      ctx.pet.draw(g, px(ctx.pet.x), py(ctx.pet.y) + CS / 2 - 2, CS);
      // snake
      var f = S.wait > 0 ? 1 : Math.min(1, S.stepT / stepGap());
      var n = S.body.length;
      for (var i = n - 1; i >= 0; i--) {
        var b = S.body[i], X = OX + b.x * CS, Y = OY + b.y * CS, sh = i === 0 ? 0 : 1;
        var lum = i === 0 ? 1 : 0.85 - Math.min(0.35, i * 0.01);
        if (S.dead > 0 && Math.floor(S.time * 12) % 2) continue;
        g.fillStyle = i === 0 ? '#5fd97a' : (i % 2 ? '#4fc96a' : '#45b85e'); g.fillRect(X + sh, Y + sh, CS - sh * 2, CS - sh * 2);
        g.fillStyle = 'rgba(255,255,255,' + (0.35 * lum) + ')'; g.fillRect(X + sh, Y + sh, CS - sh * 2, 3); g.fillRect(X + sh, Y + sh, 3, CS - sh * 2);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X + sh, Y + CS - sh - 2, CS - sh * 2, 2); g.fillRect(X + CS - sh - 2, Y + sh, 2, CS - sh * 2);
        if (i === 0) { // eyes look where we're going
          var ex = DX[S.dir] * 3, ey = DY[S.dir] * 3;
          g.fillStyle = '#1b1822'; g.fillRect(X + 5 + ex, Y + 6 + ey, 3, 4); g.fillRect(X + 12 + ex, Y + 6 + ey, 3, 4);
          g.fillStyle = '#fff'; g.fillRect(X + 5 + ex, Y + 6 + ey, 1, 1); g.fillRect(X + 12 + ex, Y + 6 + ey, 1, 1);
          if (S.wait > 0 && S.dead <= 0) PCTex.drawText(g, 'GO!', X + 3, Y - 12, 1.5, '#ffe680', '#000');
        }
      }
      S.parts.forEach(function (q) { g.globalAlpha = 1 - q.t / q.life; g.fillStyle = q.col; g.fillRect(q.x, q.y, q.s, q.s); }); g.globalAlpha = 1;
      S.pops.forEach(function (q) { g.globalAlpha = 1 - q.t; PCTex.drawText(g, q.text, q.x - PCTex.textWidth(q.text, 1) / 2, q.y - q.t * 24, 1, q.col, '#000'); }); g.globalAlpha = 1;
      // hud
      g.fillStyle = '#1a1420'; g.fillRect(0, 0, W, OY);
      for (var k = 0; k < S.lives; k++) g.drawImage(tex.heart[1], 6 + k * 16, 6, 14, 13);
      PCTex.drawText(g, 'LV ' + S.level, W - 50, 8, 2, '#ffe680', '#000');
      PCTex.drawText(g, 'LEN ' + S.body.length, 110, 8, 2, '#5ef0a8', '#000');
      if (S.msg) { var s = S.msg.text.length > 12 ? 2 : 3, tw = PCTex.textWidth(S.msg.text, s); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(W / 2 - tw / 2 - 10, H / 2 - 20, tw + 20, 36); PCTex.drawText(g, S.msg.text, W / 2 - tw / 2, H / 2 - 10, s, '#ffe680', '#000'); }
    }
    var touch = null;
    function input(e) {
      if (e.type === 'dir') turn(e.dir);
      else if (e.type === 'touch') {
        if (e.phase === 'down') touch = { x: e.x, y: e.y, done: false };
        else if (e.phase === 'move' && touch && !touch.done) { var dx = e.x - touch.x, dy = e.y - touch.y; if (Math.hypot(dx, dy) > 16) { turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : (dy > 0 ? 2 : 0)); touch.done = true; } }
        else if (e.phase === 'up') { if (touch && !touch.done) { var h = S.body[0], ox = touch.x - px(h.x), oy = touch.y - py(h.y); turn(Math.abs(ox) > Math.abs(oy) ? (ox > 0 ? 3 : 1) : (oy > 0 ? 2 : 0)); } touch = null; }
      }
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { step: step, turn: turn } };
  }

  return {
    id: 'snake', name: 'Slime Snake', blurb: 'Gobble emeralds and grow. Grab the ore blocks, dodge the cobble and your tail.',
    view: { w: W, h: H }, music: 'meadow',
    controls: { dpad: true, a: null, b: null },
    thumb: function (g, w, h, tex) {
      var T2 = window.PCWorld.TILE;
      for (var y = 0; y < h; y += 8) for (var x = 0; x < w; x += 8) g.drawImage(tex.floors.forest[0], x, y, 8, 8);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, w, h);
      [[8, 24], [16, 24], [24, 24], [24, 16], [32, 16], [40, 16]].forEach(function (p, i) { g.fillStyle = i === 5 ? '#5fd97a' : '#4fc96a'; g.fillRect(p[0], p[1], 8, 8); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(p[0], p[1], 8, 2); });
      g.fillStyle = '#1b1822'; g.fillRect(45, 18, 1, 2); g.fillRect(45, 21, 1, 2);
      g.fillStyle = '#5ef0a8'; g.fillRect(52, 32, 5, 5); g.fillStyle = '#d6ffe9'; g.fillRect(52, 32, 2, 2);
      g.drawImage(tex.blocks[T2.COBBLE].top, 0, 0, 16, 16, 10, 8, 8, 8); g.drawImage(tex.blocks[T2.GOLD].top, 0, 0, 16, 16, 48, 4, 8, 8);
    },
    create: create
  };
})());
