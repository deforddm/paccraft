/* TNT Maze — Bomberman with blocks. Drop TNT to blast through dirt and planks, bonk the
 * cube monsters in the blast, grab ore and power-ups from the rubble, then find the portal. */
PCCab.register((function () {
  'use strict';
  var TS = 24, COLS = 13, ROWS = 13, OY = 28, W = COLS * TS, H = OY + ROWS * TS + 4;
  var DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  var MON = { mudge: { sp: 1.7, pts: 100, smart: 0 }, sly: { sp: 2.1, pts: 200, smart: 0.45 }, frost: { sp: 2.5, pts: 400, smart: 0.25 } };

  function create(ctx) {
    var tex = ctx.tex, Wd = window.PCWorld, T = Wd.TILE, hero = PCTex.hero(ctx.look), K = PCCab.kit();
    var S = {}, bg = null;
    function idx(x, y) { return y * COLS + x; }
    function inb(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
    function px(x) { return x * TS + TS / 2; }
    function py(y) { return OY + y * TS + TS / 2; }

    function reset() { S.level = 1; S.lives = 3; S.score = 0; S.time = 0; S.maxBombs = 1; S.range = 1; S.boots = 0; S.msg = null; newLevel(); }
    function newLevel() {
      var r = Wd.rng(S.level * 9173 + 3), lv = S.level;
      S.cell = new Uint8Array(COLS * ROWS); S.hide = {}; S.items = {}; S.bombs = []; S.flames = []; S.mons = []; K.clear();
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
        var c = 0;
        if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) c = 1;
        else if (x % 2 === 0 && y % 2 === 0) c = 2;
        else if (!(x <= 2 && y <= 2) && r() < 0.5) c = 3;
        S.cell[idx(x, y)] = c;
      }
      var soft = []; for (var i = 0; i < S.cell.length; i++) if (S.cell[i] === 3) soft.push(i);
      for (var k = soft.length - 1; k > 0; k--) { var j = Math.floor(r() * (k + 1)), t = soft[k]; soft[k] = soft[j]; soft[j] = t; }
      var n = 0;
      S.hide[soft[n++]] = 'exit';
      ['bomb', 'fire', lv % 2 ? 'fire' : 'bomb', 'speed'].forEach(function (pw, q) { if (q < 3 || lv >= 2) S.hide[soft[n++]] = 'pw:' + pw; });
      var ores = 3 + Math.min(4, lv), OK = ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'];
      for (var o = 0; o < ores && n < soft.length; o++) S.hide[soft[n++]] = 'ore:' + OK[Math.min(OK.length - 1, Math.floor(r() * (3 + lv * 0.7)))];
      // monsters on open cells far from the start
      var open = []; for (var yy = 1; yy < ROWS - 1; yy++) for (var xx = 1; xx < COLS - 1; xx++) if (S.cell[idx(xx, yy)] === 0 && xx + yy >= 8) open.push([xx, yy]);
      var count = Math.min(8, 3 + lv), kinds = lv >= 4 ? ['mudge', 'sly', 'frost'] : lv >= 2 ? ['mudge', 'sly'] : ['mudge'];
      for (var m = 0; m < count && open.length; m++) {
        var pick = open.splice(Math.floor(r() * open.length), 1)[0], kind = kinds[m % kinds.length];
        S.mons.push({ x: pick[0], y: pick[1], tx: pick[0], ty: pick[1], dir: Math.floor(r() * 4), kind: kind, dead: 0, anim: r() * 4 });
      }
      bg = null; spawn();
      S.msg = { text: 'LEVEL ' + lv, sub: lv === 1 ? 'DROP TNT - FIND THE PORTAL' : null, t: 2 }; ctx.A.play('ready');
    }
    function spawn() {
      S.p = { x: 1, y: 1, tx: 1, ty: 1, dir: 2, face: 2, dead: 0, anim: 0 };
      S.safeT = 2; S.bombs = []; S.flames = [];
      ctx.pet.reset(1, 1, 2);
    }
    function speed() { return 3.6 + S.boots * 0.6; }
    function bombAt(x, y) { for (var i = 0; i < S.bombs.length; i++) if (S.bombs[i].x === x && S.bombs[i].y === y) return S.bombs[i]; return null; }
    function open(x, y) { return inb(x, y) && S.cell[idx(x, y)] === 0 && !bombAt(x, y); }
    function addScore(n) { S.score += n; ctx.score(S.score); }

    // grid movers (player + monsters): step from tile to tile
    function stepMover(o, dt, sp, choose) {
      var left = sp * dt, guard = 0;
      while (left > 0 && guard++ < 4) {
        if (o.x === o.tx && o.y === o.ty) {
          var d = choose(o); if (d < 0) return;
          var nx = o.x + DX[d], ny = o.y + DY[d];
          if (!open(nx, ny)) { o.face = d; return; }
          o.tx = nx; o.ty = ny; o.dir = d; o.face = d;
        }
        var dx = o.tx - o.x, dy = o.ty - o.y, dist = Math.abs(dx) + Math.abs(dy);
        if (dist <= left) { o.x = o.tx; o.y = o.ty; left -= dist; o.anim += dist * 2; if (o.arrive) o.arrive(o); }
        else { o.x += Math.sign(dx) * left; o.y += Math.sign(dy) * left; o.anim += left * 2; left = 0; }
      }
    }
    function playerChoose(o) {
      var d = ctx.held.dir;
      if (d < 0) return -1;
      return d;
    }
    function monChoose(m) {
      var dirs = [0, 1, 2, 3].filter(function (d) { return open(m.x + DX[d], m.y + DY[d]); });
      if (!dirs.length) return -1;
      var info = MON[m.kind];
      if (Math.random() < info.smart + Math.min(0.2, S.level * 0.02)) {
        var best = dirs[0], bd = 1e9;
        dirs.forEach(function (d) { var dd = Math.abs(m.x + DX[d] - S.p.x) + Math.abs(m.y + DY[d] - S.p.y); if (dd < bd) { bd = dd; best = d; } });
        return best;
      }
      if (dirs.indexOf(m.dir) >= 0 && Math.random() < 0.75) return m.dir;
      var noBack = dirs.filter(function (d) { return d !== (m.dir + 2) % 4; });
      var pool = noBack.length ? noBack : dirs;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    function dropBomb() {
      var p = S.p; if (p.dead > 0) return;
      var bx = Math.round(p.x), by = Math.round(p.y);
      if (S.bombs.length >= S.maxBombs || bombAt(bx, by) || S.cell[idx(bx, by)] !== 0) return;
      S.bombs.push({ x: bx, y: by, t: 2.2, r: S.range }); ctx.fx('tnt');
    }
    function explode(b) {
      S.bombs.splice(S.bombs.indexOf(b), 1);
      ctx.fx('boom'); ctx.buzz([30, 20, 40]); S.shake = 0.25;
      addFlame(b.x, b.y);
      for (var d = 0; d < 4; d++) for (var k = 1; k <= b.r; k++) {
        var x = b.x + DX[d] * k, y = b.y + DY[d] * k; if (!inb(x, y)) break;
        var c = S.cell[idx(x, y)];
        if (c === 1 || c === 2) break;
        addFlame(x, y);
        if (c === 3) { breakBlock(x, y); break; }
        var other = bombAt(x, y); if (other) other.t = Math.min(other.t, 0.06);
      }
    }
    function addFlame(x, y) { S.flames.push({ x: x, y: y, t: 0.5 }); }
    function breakBlock(x, y) {
      var i = idx(x, y); S.cell[i] = 0; addScore(10);
      K.burst(px(x), py(y), '#8a5a36', 6);
      if (S.hide[i]) { S.items[i] = S.hide[i]; delete S.hide[i]; }
    }
    function killPlayer() {
      var p = S.p; if (p.dead > 0 || S.safeT > 0) return;
      p.dead = 1.3; S.lives--; ctx.fx('death'); ctx.buzz([60, 40, 80]); K.burst(px(p.x), py(p.y), '#ffb37a', 14);
    }
    function pickup() {
      var p = S.p, i = idx(Math.round(p.x), Math.round(p.y)), it = S.items[i];
      if (!it) return;
      if (it === 'exit') {
        if (S.mons.some(function (m) { return !m.dead; })) return;
        addScore(1000 * S.level); ctx.addOre('coal', 1 + Math.floor(S.level / 2)); ctx.fx('clear'); ctx.buzz(30); ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop();
        S.level++; newLevel(); return;
      }
      delete S.items[i];
      if (it.indexOf('ore:') === 0) { var k = it.slice(4); ctx.addOre(k, 1); addScore(200); K.pop(px(p.x), py(p.y) - 12, '+1 ' + k.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: k }); ctx.buzz(15); ctx.pet.bark(); }
      else {
        var pw = it.slice(3);
        if (pw === 'bomb') S.maxBombs = Math.min(5, S.maxBombs + 1); else if (pw === 'fire') S.range = Math.min(6, S.range + 1); else S.boots = Math.min(3, S.boots + 1);
        addScore(100); ctx.fx('unlock'); K.pop(px(p.x), py(p.y) - 12, { bomb: '+1 TNT', fire: 'BIGGER BLAST', speed: 'SPEEDY BOOTS' }[pw], '#7df9ff');
      }
    }

    function update(dt) {
      S.time += dt; K.tick(dt);
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.shake > 0) S.shake -= dt; if (S.safeT > 0) S.safeT -= dt;
      var p = S.p;
      // bombs & flames
      S.bombs.slice().forEach(function (b) { b.t -= dt; if (b.t <= 0) explode(b); });
      S.flames.forEach(function (f) { f.t -= dt; }); S.flames = S.flames.filter(function (f) { return f.t > 0; });
      function inFlame(x, y) { var rx = Math.round(x), ry = Math.round(y); return S.flames.some(function (f) { return f.x === rx && f.y === ry; }); }
      // player
      if (p.dead > 0) {
        p.dead -= dt; ctx.pet.sit(dt);
        if (p.dead <= 0) { if (S.lives <= 0) { ctx.over({ lines: [['Level reached', S.level]] }); return; } spawn(); S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 }; }
      } else {
        // allow turning back mid-step
        var hd = ctx.held.dir;
        if (hd >= 0 && (p.x !== p.tx || p.y !== p.ty) && hd === (p.dir + 2) % 4) { var ox = p.tx - DX[p.dir], oy = p.ty - DY[p.dir]; p.tx = ox; p.ty = oy; p.dir = hd; p.face = hd; }
        p.arrive = pickup;
        stepMover(p, dt, speed(), playerChoose);
        if (inFlame(p.x, p.y)) killPlayer();
        ctx.pet.follow(p.x, p.y, dt, { dist: 1.1, snap: 3, speed: speed() });
      }
      // monsters
      S.mons.forEach(function (m) {
        m.anim += dt * 3;
        if (m.dead > 0) { m.dead -= dt; if (m.dead <= 0) m.dead = -1; return; }
        if (m.dead < 0) return;
        stepMover(m, dt, MON[m.kind].sp * (1 + Math.min(0.4, (S.level - 1) * 0.04)), monChoose);
        if (inFlame(m.x, m.y)) {
          m.dead = 0.6; var pts = MON[m.kind].pts * S.level; addScore(pts); K.pop(px(m.x), py(m.y) - 12, pts, '#7df9ff'); K.burst(px(m.x), py(m.y), '#c9ccd4', 10); ctx.fx('bonk');
          if (!S.mons.some(function (o) { return o !== m && o.dead === 0; })) { ctx.fx('crystal'); K.pop(W / 2, OY + 40, 'PORTAL OPEN!', '#e36bff'); ctx.pet.bark(); }
        } else if (p.dead <= 0 && S.safeT <= 0 && Math.abs(m.x - p.x) + Math.abs(m.y - p.y) < 0.7) killPlayer();
      });
      S.mons = S.mons.filter(function (m) { return m.dead >= 0; });
    }

    function drawBg(g) {
      if (bg) return g.drawImage(bg, 0, 0);
      bg = document.createElement('canvas'); bg.width = W; bg.height = H; var b = bg.getContext('2d'); b.imageSmoothingEnabled = false;
      b.fillStyle = '#1a1420'; b.fillRect(0, 0, W, H);
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
        var c = S.cell[idx(x, y)], X = x * TS, Y = OY + y * TS;
        if (c === 1) b.drawImage(tex.blocks[T.BORDER].top, 0, 0, 16, 16, X, Y, TS, TS);
        else if (c === 2) { b.drawImage(tex.blocks[T.STONE].top, 0, 0, 16, 16, X, Y, TS, TS); b.fillStyle = 'rgba(255,255,255,0.18)'; b.fillRect(X, Y, TS, 2); b.fillStyle = 'rgba(0,0,0,0.35)'; b.fillRect(X, Y + TS - 3, TS, 3); }
        else { b.drawImage(tex.floors.meadow[(x * 3 + y * 5) % 3], 0, 0, 16, 16, X, Y, TS, TS); }
      }
      g.drawImage(bg, 0, 0);
    }
    function draw(g) {
      g.save(); if (S.shake > 0) g.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
      drawBg(g);
      var allDead = !S.mons.some(function (m) { return m.dead === 0; });
      // items revealed on the floor
      Object.keys(S.items).forEach(function (k) {
        var i = +k, x = i % COLS, y = Math.floor(i / COLS), X = x * TS, Y = OY + y * TS, it = S.items[k];
        if (it === 'exit') {
          g.fillStyle = '#1b1822'; g.fillRect(X + 2, Y + 1, TS - 4, TS - 2);
          g.fillStyle = allDead ? (Math.floor(S.time * 6) % 2 ? '#e36bff' : '#b24bdb') : '#5a3a6a'; g.fillRect(X + 5, Y + 4, TS - 10, TS - 8);
          if (allDead) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(X + 7 + Math.sin(S.time * 5) * 3, Y + 7, 3, 3); }
        } else if (it.indexOf('ore:') === 0) g.drawImage(tex.ores[it.slice(4)], X + 5, Y + 5 + Math.sin(S.time * 4 + i) * 1.5, 14, 14);
        else {
          var pw = it.slice(3); g.fillStyle = '#1b1822'; g.fillRect(X + 3, Y + 3, TS - 6, TS - 6);
          g.fillStyle = pw === 'bomb' ? '#d8322b' : pw === 'fire' ? '#ff8a1f' : '#3f8fe0'; g.fillRect(X + 4, Y + 4, TS - 8, TS - 8);
          if (pw === 'bomb') g.drawImage(tex.tnt[0], X + 6, Y + 6, 12, 12); else if (pw === 'speed') g.drawImage(tex.boot, X + 6, Y + 6, 12, 12);
          else { g.fillStyle = '#ffd23d'; g.fillRect(X + 9, Y + 7, 6, 10); g.fillStyle = '#fff3a0'; g.fillRect(X + 11, Y + 11, 2, 5); }
        }
      });
      // soft blocks
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
        if (S.cell[idx(x, y)] !== 3) continue;
        var X = x * TS, Y = OY + y * TS, tt = (x * 7 + y * 3) % 4 === 0 ? T.PLANKS : T.DIRT;
        g.drawImage(tex.blocks[tt].top, 0, 0, 16, 16, X, Y, TS, TS);
        g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(X, Y, TS, 2); g.fillStyle = 'rgba(0,0,0,0.32)'; g.fillRect(X, Y + TS - 3, TS, 3);
      }
      // bombs
      S.bombs.forEach(function (b) { var sc = 1 + Math.sin(S.time * (b.t < 0.8 ? 30 : 12)) * 0.08, s = 18 * sc; g.drawImage(tex.tnt[b.t < 0.8 && Math.floor(S.time * 12) % 2 ? 1 : 0], px(b.x) - s / 2, py(b.y) - s / 2, s, s); });
      // flames
      S.flames.forEach(function (f) { var X = f.x * TS, Y = OY + f.y * TS, a = Math.min(1, f.t * 3); g.globalAlpha = a; g.fillStyle = '#ff6a1f'; g.fillRect(X + 1, Y + 1, TS - 2, TS - 2); g.fillStyle = '#ffd23d'; g.fillRect(X + 5, Y + 5, TS - 10, TS - 10); g.fillStyle = '#fff3a0'; g.fillRect(X + 9, Y + 9, TS - 18, TS - 18); g.globalAlpha = 1; });
      // monsters
      S.mons.forEach(function (m) {
        var s = 22, X = Math.round(px(m.x) - s / 2), Y = Math.round(py(m.y) - s / 2) - 1;
        if (m.dead > 0) { g.globalAlpha = m.dead / 0.6; g.drawImage(tex.mons.flash[0], X, Y, s, s); g.globalAlpha = 1; return; }
        g.drawImage(tex.mons[m.kind][Math.floor(m.anim) % 2], X, Y, s, s); PCTex.drawEyes(g, X, Y, s / 16, m.face != null ? m.face : m.dir, false);
      });
      // wolf + hero
      ctx.pet.draw(g, px(ctx.pet.x), py(ctx.pet.y) + TS / 2 - 2, 20);
      var p = S.p, hx = px(p.x), hy = py(p.y);
      if (p.dead > 0) { g.save(); g.translate(hx, hy); g.rotate((1.3 - p.dead) * 8); var sc = Math.max(0, p.dead / 1.3); g.scale(sc, sc); g.drawImage(hero.down[0], -12, -12, 24, 24); g.restore(); }
      else if (!(S.safeT > 0 && Math.floor(S.time * 10) % 2)) {
        var mv = p.x !== p.tx || p.y !== p.ty, fr = mv ? 1 + Math.floor(p.anim) % 2 : 0;
        g.drawImage(hero[['up', 'left', 'down', 'right'][p.face]][fr], Math.round(hx - 12), Math.round(hy - 14), 24, 24);
      }
      K.draw(g);
      // hud
      g.fillStyle = '#1a1420'; g.fillRect(0, 0, W, OY);
      K.hearts(g, tex, S.lives, 6, 7);
      g.drawImage(tex.tnt[0], 100, 7, 14, 14); PCTex.drawText(g, 'x' + S.maxBombs, 116, 9, 2, '#fff', '#000');
      g.fillStyle = '#ff8a1f'; g.fillRect(152, 8, 8, 12); PCTex.drawText(g, String(S.range), 163, 9, 2, '#fff', '#000');
      PCTex.drawText(g, 'LV ' + S.level, W - 54, 9, 2, '#ffe680', '#000');
      K.banner(g, W, H, S.msg);
      g.restore();
    }
    function input(e) {
      if (e.type === 'a' && e.down) dropBomb();
      else if (e.type === 'touch' && e.phase === 'down') dropBomb();
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { explode: explode, dropBomb: dropBomb, idx: idx } };
  }

  return {
    id: 'tntmaze', name: 'TNT Maze', blurb: 'Drop TNT to blast through blocks and bonk monsters. Find the portal.',
    view: { w: W, h: H }, music: 'meadow',
    controls: { dpad: true, a: 'TNT', b: null },
    thumb: function (g, w, h, tex, look) {
      var T2 = window.PCWorld.TILE;
      for (var y = 0; y < h; y += 8) for (var x = 0; x < w; x += 8) {
        var gx = x / 8, gy = y / 8, t = (gx === 0 || gy === 0 || gx === 7 || gy === 5) ? T2.BORDER : (gx % 2 === 0 && gy % 2 === 0) ? T2.STONE : ((gx + gy * 3) % 4 === 1 ? T2.DIRT : null);
        if (t) g.drawImage(tex.blocks[t].top, 0, 0, 16, 16, x, y, 8, 8); else g.drawImage(tex.floors.meadow[0], 0, 0, 16, 16, x, y, 8, 8);
      }
      g.fillStyle = '#ff6a1f'; g.fillRect(24, 16, 24, 8); g.fillRect(32, 8, 8, 24); g.fillStyle = '#ffd23d'; g.fillRect(26, 18, 20, 4); g.fillRect(34, 10, 4, 20);
      g.drawImage(PCTex.hero(look || PCTex.LOOK_DEFAULT).down[0], 8, 30, 12, 12);
      g.drawImage(tex.mons.sly[0], 50, 30, 10, 10);
    },
    create: create
  };
})());
