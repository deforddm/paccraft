/* Cube Hop — Q*bert on a pyramid of blocks. Hop diagonally to turn every grass top to gold,
 * dodge the bouncing slimes and Rumble, catch crystals (freeze) and ore, and ride a floating
 * lift back to the top when you're cornered. */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 400, ROWS = 7, CW = 40, TOPY = 78, STEP = 30, HOP = 0.28;
  var MODES = [['GRASS', 'GOLD'], ['GRASS', 'SAND', 'GOLD'], ['GRASS', 'GOLD']];   // 3rd mode: gold flips back

  function create(ctx) {
    var tex = ctx.tex, T = window.PCWorld.TILE, hero = PCTex.hero(ctx.look), K = PCCab.kit();
    var S = {};
    function cx(r, c) { return W / 2 + (c - r / 2) * CW; }
    function cy(r) { return TOPY + r * STEP; }
    function valid(r, c) { return r >= 0 && r < ROWS && c >= 0 && c <= r; }
    function addScore(n) { S.score += n; ctx.score(S.score); }

    function reset() { S.level = 1; S.lives = 3; S.score = 0; S.time = 0; S.msg = null; newLevel(); }
    function newLevel() {
      var lv = S.level;
      S.mode = Math.floor((lv - 1) / 2) % 3; S.states = MODES[S.mode]; S.target = S.states.length - 1; S.flip = S.mode === 2;
      S.cubes = []; for (var r = 0; r < ROWS; r++) { S.cubes[r] = []; for (var c = 0; c <= r; c++) S.cubes[r][c] = 0; }
      S.lifts = [{ r: lv >= 3 ? 4 : 3, c: -1 }, { r: lv >= 3 ? 5 : 4, c: (lv >= 3 ? 5 : 4) + 1 }];
      S.clearT = 0; K.clear();
      spawnHero();
      S.msg = { text: 'LEVEL ' + lv, sub: 'TURN THE TOPS ' + S.states[S.target], t: 2.2 }; ctx.A.play('ready');
      if (lv === 1) S.hintT = 2.3;
    }
    function spawnHero() {
      S.p = { r: 0, c: 0, fr: 0, fc: 0, t: 1, dead: 0, fall: false, lift: null, face: 'down' };
      S.enemies = []; S.freezeT = 0; S.spawnT = 2.2; S.safeT = 1.2;
      ctx.pet.reset(cx(0, 0), cy(0), 2);
    }
    function pos(o) { // screen position of an actor (feet), with hop arc
      var t = Math.min(1, o.t), x0 = cx(o.fr, o.fc), y0 = cy(o.fr), x1 = cx(o.r, o.c), y1 = cy(o.r);
      return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 14 };
    }
    function cell(o) { return o.t >= 0.5 ? { r: o.r, c: o.c } : { r: o.fr, c: o.fc }; }

    function hopDir(dx, dy) { // quadrant → [dr, dc]
      if (dy < 0) return dx < 0 ? [-1, -1] : [-1, 0];
      return dx < 0 ? [1, 0] : [1, 1];
    }
    function tryHop(dr, dc) {
      var p = S.p; if (p.dead > 0 || p.t < 1 || p.lift || S.clearT > 0) return;
      var nr = p.r + dr, nc = p.c + dc;
      p.fr = p.r; p.fc = p.c; p.r = nr; p.c = nc; p.t = 0; p.face = dr < 0 ? 'up' : 'down'; p.side = dc === 0 && dr < 0 || dc === 1 ? 'right' : 'left';
      ctx.fx('hop');
    }
    function land() {
      var p = S.p;
      if (valid(p.r, p.c)) {
        var st = S.cubes[p.r][p.c];
        if (st < S.target) { S.cubes[p.r][p.c] = st + 1; addScore(25); if (st + 1 === S.target) { ctx.fx('gem'); K.burst(cx(p.r, p.c), cy(p.r), '#f2c230', 5, 90); } }
        else if (S.flip && st === S.target) { S.cubes[p.r][p.c] = 0; ctx.fx('nope'); }
        checkClear();
        return;
      }
      var lift = S.lifts.filter(function (l) { return l.r === p.r && l.c === p.c; })[0];
      if (lift) {
        S.lifts.splice(S.lifts.indexOf(lift), 1);
        p.lift = { t: 0, x0: cx(p.r, p.c), y0: cy(p.r) }; ctx.fx('unlock'); addScore(50);
        S.enemies.forEach(function (e) { if (e.kind === 'rumble' && !e.fall) { e.fall = true; e.vy = -60; addScore(500); K.pop(pos(e).x, pos(e).y - 20, '500', '#7df9ff'); ctx.pet.bark(); } });
        return;
      }
      p.fall = true; p.vy = -40; die();
    }
    function checkClear() {
      for (var r = 0; r < ROWS; r++) for (var c = 0; c <= r; c++) if (S.cubes[r][c] !== S.target) return;
      S.clearT = 1.8; addScore(1000 + 250 * S.level); ctx.addOre('coal', 1 + Math.floor(S.level / 2)); ctx.fx('clear'); ctx.buzz(30); ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop();
      S.enemies = [];
    }
    function die() {
      var p = S.p; if (p.dead > 0) return;
      p.dead = 1.4; S.lives--; ctx.fx('death'); ctx.buzz([60, 40, 80]);
      var q = pos(p); K.burst(q.x, q.y - 8, '#ffb37a', 12);
    }
    function spawnEnemy() {
      var lv = S.level, roll = Math.random(), kind;
      var hasRumble = S.enemies.some(function (e) { return e.kind === 'rumble' || e.kind === 'purple'; });
      if (!hasRumble && roll < 0.3) kind = 'purple';
      else if (roll < 0.42) kind = 'crystal';
      else if (roll < 0.56) kind = 'ore';
      else if (roll < 0.68 && lv >= 3) kind = 'frost';
      else kind = 'ball';
      var c = Math.random() < 0.5 ? 0 : 1;
      S.enemies.push({ kind: kind, r: 1, c: c, fr: 0, fc: 0, t: 0, drop: 0.35, wait: 0.2, ore: ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'][Math.min(6, Math.floor(Math.random() * (2.5 + lv * 0.6)))] });
      ctx.fx('foodspawn');
    }
    function enemyNext(e) {
      if (e.kind === 'rumble') { // chase the hero
        var p = S.p, target = { x: cx(p.r, p.c), y: cy(p.r) }, best = null, bd = 1e9;
        [[-1, -1], [-1, 0], [1, 0], [1, 1]].forEach(function (d) { var nr = e.r + d[0], nc = e.c + d[1]; if (!valid(nr, nc)) return; var dd = Math.hypot(cx(nr, nc) - target.x, cy(nr) - target.y); if (dd < bd) { bd = dd; best = d; } });
        return best;
      }
      return [1, Math.random() < 0.5 ? 0 : 1];
    }
    function updateEnemy(e, dt) {
      if (e.fall) { e.vy += 700 * dt; e.fy = (e.fy || 0) + e.vy * dt; return e.fy < 400; }
      if (e.drop > 0) { e.drop -= dt; return true; }
      if (S.freezeT > 0) return true;
      if (e.t < 1) { e.t += dt / (e.kind === 'rumble' ? 0.32 : 0.3); if (e.t >= 1) { e.t = 1; e.wait = e.kind === 'rumble' ? 0.55 - Math.min(0.25, S.level * 0.03) : 0.4; if (e.kind === 'frost' && valid(e.r, e.c) && S.cubes[e.r][e.c] > 0) S.cubes[e.r][e.c]--; if (!valid(e.r, e.c)) { e.fall = true; e.vy = 0; } } return true; }
      e.wait -= dt; if (e.wait > 0) return true;
      if (e.kind === 'purple' && e.r === ROWS - 1) { e.kind = 'rumble'; ctx.fx('ready'); }
      var d = enemyNext(e); if (!d) return true;
      e.fr = e.r; e.fc = e.c; e.r += d[0]; e.c += d[1]; e.t = 0;
      return true;
    }

    function update(dt) {
      S.time += dt; K.tick(dt);
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.hintT > 0) { S.hintT -= dt; if (S.hintT <= 0) S.msg = { text: 'TAP WHERE TO HOP', t: 2.4 }; }
      if (S.safeT > 0) S.safeT -= dt; if (S.freezeT > 0) S.freezeT -= dt;
      if (S.clearT > 0) { S.clearT -= dt; ctx.pet.sit(dt); if (S.clearT <= 0) { S.level++; newLevel(); } return; }
      var p = S.p;
      if (p.dead > 0) {
        p.dead -= dt; ctx.pet.sit(dt);
        if (p.fall) { p.vy += 700 * dt; p.fy = (p.fy || 0) + p.vy * dt; }
        if (p.dead <= 0) {
          if (S.lives <= 0) { ctx.over({ lines: [['Level reached', S.level]] }); return; }
          var keep = !p.fall && valid(p.r, p.c) ? { r: p.r, c: p.c } : null;
          spawnHero(); if (keep) { p = S.p; p.r = p.fr = keep.r; p.c = p.fc = keep.c; ctx.pet.reset(cx(keep.r, keep.c), cy(keep.r), 2); }
          S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 };
        }
        return;
      }
      if (p.lift) {
        p.lift.t += dt / 1.4;
        if (p.lift.t >= 1) { p.lift = null; p.fr = 0; p.fc = 0; p.r = 0; p.c = 0; p.t = 0.5; ctx.pet.reset(cx(0, 0), cy(0), 2); }
      } else if (p.t < 1) { p.t += dt / HOP; if (p.t >= 1) { p.t = 1; land(); } }
      else if (ctx.held.dir >= 0) {
        var hx = ctx.held.dx, hy = ctx.held.dy, d;
        if (Math.abs(hx) > 0.3 && Math.abs(hy) > 0.3) d = hopDir(hx, hy);
        else d = [[-1, 0], [-1, -1], [1, 0], [1, 1]][ctx.held.dir];   // keys: up = up-right, left = up-left, down = down-left, right = down-right
        tryHop(d[0], d[1]);
      }
      if (S.p.dead > 0) return;
      var q = p.lift ? { x: p.lift.x0 + (cx(0, 0) - p.lift.x0) * p.lift.t, y: p.lift.y0 + (cy(0) - 40 - p.lift.y0) * Math.min(1, p.lift.t * 1.2) } : pos(p);
      ctx.pet.follow(q.x, q.y, dt, { dist: 26, snap: 140, speed: 160 });
      // enemies
      S.spawnT -= dt;
      if (S.spawnT <= 0) { S.spawnT = Math.max(1.4, 3.6 - S.level * 0.25) * (0.7 + Math.random() * 0.6); if (S.enemies.length < 3 + Math.floor(S.level / 3)) spawnEnemy(); }
      S.enemies = S.enemies.filter(function (e) { return updateEnemy(e, dt); });
      // collisions (same cube)
      if (!p.lift) {
        var pc = cell(p);
        S.enemies.slice().forEach(function (e) {
          if (e.fall || e.drop > 0) return;
          var ec = cell(e); if (ec.r !== pc.r || ec.c !== pc.c) return;
          var ep = pos(e);
          if (e.kind === 'crystal') { S.freezeT = 3.2; addScore(100); K.pop(ep.x, ep.y - 20, 'FREEZE!', '#7df9ff'); ctx.fx('crystal'); remove(e); }
          else if (e.kind === 'ore') { ctx.addOre(e.ore, 1); addScore(150); K.pop(ep.x, ep.y - 20, '+1 ' + e.ore.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: e.ore }); ctx.buzz(15); ctx.pet.bark(); remove(e); }
          else if (e.kind === 'frost') { addScore(300); K.pop(ep.x, ep.y - 20, '300', '#7df9ff'); ctx.fx('bonk'); remove(e); }
          else if (S.freezeT <= 0 && S.safeT <= 0) die();
        });
      }
    }
    function remove(e) { var i = S.enemies.indexOf(e); if (i >= 0) S.enemies.splice(i, 1); }

    // ---------- drawing ----------
    function face(g, pts, fill) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } }
    function drawCube(g, r, c, st, flash) {
      var x = Math.round(cx(r, c)), y = Math.round(cy(r)), hw = CW / 2;
      // left and right faces: dirt sides
      g.save(); face(g, [x - hw, y, x, y + 10, x, y + 30, x - hw, y + 20]); g.clip(); g.drawImage(tex.blocks[T.DIRT].top, 0, 0, 16, 16, x - hw, y, hw, 30); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x - hw, y, hw, 30); g.restore();
      g.save(); face(g, [x + hw, y, x, y + 10, x, y + 30, x + hw, y + 20]); g.clip(); g.drawImage(tex.blocks[T.DIRT].top, 0, 0, 16, 16, x, y, hw, 30); g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(x, y, hw, 30); g.restore();
      // top face textured by its state
      g.save(); face(g, [x, y - 10, x + hw, y, x, y + 10, x - hw, y]); g.clip(); g.drawImage(topImg(st), 0, 0, 16, 16, x - hw, y - 10, CW, 20);
      if (flash) { g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x - hw, y - 10, CW, 20); }
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; face(g, [x, y - 10, x + hw, y, x, y + 10, x - hw, y]); g.stroke();
    }
    function topImg(st) { var n = S.states[st]; return n === 'GOLD' ? tex.goldBlock.top : tex.blocks[T[n]].top; }
    function drawLift(g, l) {
      var x = cx(l.r, l.c), y = cy(l.r) + Math.sin(S.time * 3 + l.r) * 3;
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 10, y + 12, 20, 3);
      g.drawImage(tex.blocks[T.CRYSTAL].top, 0, 0, 16, 16, x - 11, y - 6, 22, 10);
      g.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.sin(S.time * 8) * 0.2) + ')'; g.fillRect(x - 11, y - 6, 22, 2);
    }
    function drawEnemy(g, e) {
      var q = pos(e), x = q.x, y = q.y + (e.fy || 0) - (e.drop > 0 ? e.drop * 200 : 0);
      if (e.kind === 'ball' || e.kind === 'purple' || e.kind === 'crystal') {
        var col = e.kind === 'ball' ? ['#d8322b', '#ff8a7a'] : e.kind === 'purple' ? ['#8a4bd8', '#c9a0ff'] : ['#4fc96a', '#b8ffc8'];
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 6, y - 1, 12, 2);
        g.fillStyle = col[0]; g.fillRect(x - 6, y - 12, 12, 11); g.fillStyle = col[1]; g.fillRect(x - 5, y - 11, 4, 3);
        if (e.kind === 'crystal') g.drawImage(tex.crystal, x - 4, y - 12, 8, 9);
      } else if (e.kind === 'ore') {
        g.drawImage(tex.blocks[T[e.ore.toUpperCase()]].top, 0, 0, 16, 16, x - 7, y - 14, 14, 13);
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x - 7, y - 14, 14, 1);
      } else {
        var k = e.kind === 'rumble' ? 'rumble' : 'frost', s = 18;
        g.drawImage(tex.mons[S.freezeT > 0 ? 'fright' : k][Math.floor(S.time * 5) % 2], Math.round(x - s / 2), Math.round(y - s), s, s);
        PCTex.drawEyes(g, Math.round(x - s / 2), Math.round(y - s), s / 16, e.r > e.fr ? 2 : 0, S.freezeT > 0);
      }
    }
    function draw(g) {
      var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d1030'); gr.addColorStop(1, '#2a1846'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.6)'; for (var s = 0; s < 30; s++) g.fillRect((s * 97) % W, (s * 53) % 300 + 30, 1, 1);
      var flashAll = S.clearT > 0 && Math.floor(S.time * 10) % 2;
      for (var r = 0; r < ROWS; r++) for (var c = 0; c <= r; c++) drawCube(g, r, c, S.cubes[r][c], flashAll);
      S.lifts.forEach(function (l) { drawLift(g, l); });
      // actors
      var p = S.p, hq = p.lift ? { x: p.lift.x0 + (cx(0, 0) - p.lift.x0) * p.lift.t, y: p.lift.y0 + (cy(0) - 40 - p.lift.y0) * Math.min(1, p.lift.t * 1.2) } : pos(p);
      var actors = S.enemies.map(function (e) { return { y: pos(e).y + (e.fy || 0), f: function () { drawEnemy(g, e); } }; });
      actors.push({ y: ctx.pet.y, f: function () { ctx.pet.draw(g, ctx.pet.x, ctx.pet.y, 16); } });
      actors.push({ y: hq.y + 0.1, f: function () {
        if (p.dead > 0 && !p.fall && Math.floor(S.time * 12) % 2) return;
        var y = hq.y + (p.fy || 0);
        if (p.lift) { g.drawImage(tex.blocks[T.CRYSTAL].top, 0, 0, 16, 16, hq.x - 11, y + 2, 22, 10); }
        if (S.safeT > 0 && Math.floor(S.time * 10) % 2) return;
        g.fillStyle = 'rgba(0,0,0,0.25)'; if (!p.fall && !p.lift) g.fillRect(hq.x - 7, cy(cell(p).r) - 1, 14, 2);
        var spr = hero[p.face === 'up' ? 'up' : 'down'][p.t < 1 ? 1 : 0];
        g.drawImage(spr, Math.round(hq.x - 10), Math.round(y - 19), 20, 20);
      } });
      actors.sort(function (a, b) { return a.y - b.y; }).forEach(function (a) { a.f(); });
      // hint arrows around the hero on level 1
      if (S.level === 1 && S.time < 12 && p.t >= 1 && !p.dead) {
        g.fillStyle = 'rgba(255,230,128,' + (0.5 + Math.sin(S.time * 6) * 0.3) + ')';
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) { var x = hq.x + d[0] * 20, y = hq.y - 10 + d[1] * 16; g.fillRect(x - 2, y - 2, 4, 4); g.fillRect(x - 2 + d[0] * 3, y - 2 + d[1] * 3, 3, 3); });
      }
      K.draw(g);
      // hud
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, W, 26);
      K.hearts(g, tex, S.lives, 6, 6);
      PCTex.drawText(g, 'TURN TO', 104, 9, 1.5, '#fff', '#000');
      g.drawImage(topImg(S.target), 0, 0, 16, 16, 172, 5, 16, 16);
      if (S.flip) PCTex.drawText(g, 'FLIPS BACK!', 192, 9, 1, '#ff7a6a', '#000');
      PCTex.drawText(g, 'LV ' + S.level, W - 54, 8, 2, '#ffe680', '#000');
      if (S.freezeT > 0) PCTex.drawText(g, 'FREEZE ' + Math.ceil(S.freezeT), W / 2 - 30, 34, 2, '#7df9ff', '#000');
      K.banner(g, W, H, S.msg, H - 110);
    }
    function input(e) {
      if (e.type === 'touch' && e.phase === 'down') {
        var q = S.p.lift ? null : pos(S.p); if (!q) return;
        var d = hopDir(e.x - q.x, e.y - (q.y - 8)); tryHop(d[0], d[1]);
      } else if (e.type === 'dir' && e.dir >= 0 && S.p.t >= 1) {
        var hx = e.dx, hy = e.dy, dd;
        if (Math.abs(hx) > 0.3 && Math.abs(hy) > 0.3) dd = hopDir(hx, hy); else dd = [[-1, 0], [-1, -1], [1, 0], [1, 1]][e.dir];
        tryHop(dd[0], dd[1]);
      }
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { tryHop: tryHop, cx: cx, cy: cy } };
  }

  return {
    id: 'cubehop', name: 'Cube Hop', blurb: 'Hop down a block pyramid turning every top to gold. Dodge the slimes.',
    view: { w: W, h: H }, music: 'crystal',
    controls: { dpad: true, a: null, b: null },
    thumb: function (g, w, h, tex, look) {
      var T2 = window.PCWorld.TILE;
      g.fillStyle = '#141236'; g.fillRect(0, 0, w, h);
      for (var r = 0; r < 4; r++) for (var c = 0; c <= r; c++) {
        var x = 32 + (c - r / 2) * 14, y = 8 + r * 10;
        g.drawImage(tex.blocks[T2.DIRT].top, 0, 0, 16, 16, x - 7, y, 14, 9); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, y, 7, 9);
        g.drawImage((r + c) % 2 ? tex.goldBlock.top : tex.blocks[T2.GRASS].top, 0, 0, 16, 16, x - 7, y - 3, 14, 5);
      }
      g.drawImage(PCTex.hero(look || PCTex.LOOK_DEFAULT).down[0], 26, 10, 11, 11);
      g.fillStyle = '#d8322b'; g.fillRect(40, 27, 6, 5);
    },
    create: create
  };
})());
