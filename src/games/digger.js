/* Tunnel Trouble — dig tunnels under the meadow, pump the cube monsters until they pop,
 * and drop boulders on the ones you can't reach. Deeper pops are worth more. */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 480, TS = 24, COLS = 13, ROWS = 18, SKY = 2, OX = 4, OY = 24;
  var DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  var LAYER_PTS = [200, 300, 400, 500];

  function create(ctx) {
    var tex = ctx.tex, Wd = window.PCWorld, T = Wd.TILE;
    var hero = PCTex.hero(ctx.look);
    var S = {}, layers = null;

    function layerOf(row) { return Math.min(3, Math.max(0, Math.floor((row - SKY) / 4))); }
    function inb(x, y) { return x >= 0 && x < COLS && y >= SKY - 1 && y < ROWS; }
    function idx(x, y) { return y * COLS + x; }
    function dug(x, y) { return y === SKY - 1 || (inb(x, y) && S.dug[idx(x, y)] === 1); }
    function rockAt(x, y, self) { return S.rocks.some(function (r) { return r !== self && !r.gone && Math.round(r.x) === x && Math.round(r.y) === y; }); }
    function walkable(x, y) { return inb(x, y) && !rockAt(x, y); }

    function reset() { S.round = 1; S.lives = 3; S.score = 0; newRound(); }
    function newRound() {
      var r = Wd.rng(S.round * 6151 + 3);
      S.dug = new Uint8Array(COLS * ROWS); S.ore = new Uint8Array(COLS * ROWS);
      S.rocks = []; S.enemies = []; S.parts = []; S.pops = []; S.flames = []; S.time = 0; S.msg = { text: 'ROUND ' + S.round, t: 1.5 };
      S.hose = null; S.shake = 0; S.hintT = S.round === 1 ? 2.2 : 0;
      // starting shaft under the hero
      var cx = Math.floor(COLS / 2);
      for (var y = SKY; y < SKY + 5; y++) S.dug[idx(cx, y)] = 1;
      // enemy dens: short tunnels
      var n = Math.min(8, 3 + S.round), tries = 0;
      while (S.enemies.length < n && tries++ < 200) {
        var ex = 1 + Math.floor(r() * (COLS - 2)), ey = SKY + 2 + Math.floor(r() * (ROWS - SKY - 3));
        if (Math.abs(ex - cx) < 3 && ey < SKY + 7) continue;
        if (S.enemies.some(function (e) { return Math.abs(e.hx - ex) < 3 && Math.abs(e.hy - ey) < 2; })) continue;
        var horiz = r() < 0.6, len = 2 + Math.floor(r() * 2);
        for (var k = 0; k < len; k++) { var tx = horiz ? Math.min(COLS - 1, ex + k) : ex, ty = horiz ? ey : Math.min(ROWS - 1, ey + k); S.dug[idx(tx, ty)] = 1; }
        var flamer = r() < 0.3 + S.round * 0.05;
        S.enemies.push({ x: ex, y: ey, hx: ex, hy: ey, dir: horiz ? 3 : 2, kind: flamer ? 'flamer' : 'blob', inflate: 0, deflT: 0, ghost: false, ghostT: 6 + r() * 10, ghostMin: 0, anim: r() * 9, charge: 0, flameT: 0, dead: false });
      }
      // rocks
      var rocks = 3 + Math.floor(S.round / 2);
      tries = 0;
      while (S.rocks.length < rocks && tries++ < 200) {
        var rx = Math.floor(r() * COLS), ry = SKY + 1 + Math.floor(r() * (ROWS - SKY - 4));
        if (S.dug[idx(rx, ry)] || S.dug[idx(rx, ry + 1)] || Math.abs(rx - cx) < 2) continue;
        if (S.rocks.some(function (q) { return Math.abs(q.x - rx) < 2 && Math.abs(q.y - ry) < 2; })) continue;
        S.rocks.push({ x: rx, y: ry, state: 'sit', t: 0, gone: false, crushed: 0 });
      }
      // ore veins by depth
      for (var i = 0; i < COLS * ROWS; i++) {
        var yy = Math.floor(i / COLS); if (yy < SKY || S.dug[i]) continue;
        var L = layerOf(yy), p = r();
        if (p < 0.035) S.ore[i] = L === 0 ? 1 : (L === 1 ? (r() < 0.5 ? 1 : 2) : (L === 2 ? (r() < 0.5 ? 2 : 3) : (r() < 0.6 ? 3 : 4)));
      }
      spawnPlayer();
      layers = null;
      ctx.A.play('ready');
    }
    function spawnPlayer() {
      S.p = { x: Math.floor(COLS / 2), y: SKY, dir: -1, facing: 2, want: -1, dead: 0, anim: 0, pumpT: 0 };
      S.hose = null; ctx.pet.reset(S.p.x, S.p.y, 2);
      S.enemies.forEach(function (e) { if (!e.dead) { e.x = e.hx; e.y = e.hy; e.inflate = 0; e.ghost = false; e.charge = 0; e.flameT = 0; } });
      S.flames = [];
      S.safeT = 1.2;
    }
    function burst(x, y, col, n) { for (var i = 0; i < n; i++) S.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 100, g: 260, life: 0.5 + Math.random() * 0.3, t: 0, col: col, s: 2 + Math.random() * 3 }); }
    function pop(x, y, text, col) { S.pops.push({ x: x, y: y, text: text, col: col || '#fff', t: 0 }); }
    function px(x) { return OX + x * TS + TS / 2; }
    function py(y) { return OY + y * TS + TS / 2; }
    function addScore(n) { S.score += n; ctx.score(S.score); }

    function digTile(x, y) {
      if (!inb(x, y) || y < SKY || S.dug[idx(x, y)]) return;
      S.dug[idx(x, y)] = 1; layers = null;
      addScore(10);
      var o = S.ore[idx(x, y)];
      if (o) {
        var k = ['', 'coal', 'iron', 'gold', 'diamond'][o];
        ctx.addOre(k, 1); S.ore[idx(x, y)] = 0; ctx.pet.bark();
        pop(px(x), py(y) - 8, '+1 ' + k.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.COAL, drop: k }); ctx.buzz(15);
      } else ctx.fx('hit', { tile: T.DIRT });
      burst(px(x), py(y), ['#8a5a36', '#7a4e2e', '#5c3a22', '#40281a'][layerOf(y)], 4);
      // rocks above a fresh hole start to wobble
      S.rocks.forEach(function (r) { if (!r.gone && r.state === 'sit' && Math.round(r.x) === x && Math.round(r.y) === y - 1) { r.state = 'wobble'; r.t = 0; } });
    }

    // ---------- update ----------
    function update(dt) {
      S.time += dt;
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.p.dead > 0) ctx.pet.sit(dt); else ctx.pet.follow(S.p.x, S.p.y, dt, { dist: 1.1, snap: 3, speed: 4.5 });
      if (S.hintT > 0) { S.hintT -= dt; if (S.hintT <= 0) S.msg = { text: 'FACE A MONSTER + PUMP', t: 2.8 }; }
      if (S.shake > 0) S.shake -= dt;
      if (S.safeT > 0) S.safeT -= dt;
      var p = S.p;
      if (p.dead > 0) {
        p.dead += dt;
        if (p.dead > 1.6) {
          S.lives--;
          if (S.lives <= 0) { ctx.over({ lines: [['Round reached', S.round]] }); return; }
          spawnPlayer(); S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 };
        }
      } else updatePlayer(dt);
      S.enemies.forEach(function (e) { if (!e.dead) updateEnemy(e, dt); });
      S.rocks.forEach(function (r) { if (!r.gone) updateRock(r, dt); });
      S.flames.forEach(function (f) { f.t -= dt; });
      S.flames = S.flames.filter(function (f) { return f.t > 0; });
      // flames hurt
      if (p.dead === 0 && S.safeT <= 0) S.flames.forEach(function (f) { if (Math.abs(f.x - p.x) < 0.6 && Math.abs(f.y - p.y) < 0.6) killPlayer('burned'); });
      S.parts.forEach(function (q) { q.t += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }); S.parts = S.parts.filter(function (q) { return q.t < q.life; });
      S.pops.forEach(function (q) { q.t += dt; }); S.pops = S.pops.filter(function (q) { return q.t < 1; });
      // round clear
      if (!S.enemies.some(function (e) { return !e.dead; }) && p.dead === 0) {
        addScore(500 * S.round); ctx.addOre('coal', 1 + Math.floor(S.round / 2)); ctx.fx('clear'); ctx.buzz(30);
        S.round++; newRound();
      }
    }
    function atCenter(e) { return Math.abs(e.x - Math.round(e.x)) < 0.02 && Math.abs(e.y - Math.round(e.y)) < 0.02; }
    function stepTo(e, speed, dt) { // move along e.dir; returns true when it reaches a tile centre this step
      var tx = Math.round(e.x) + (atCenter(e) ? DX[e.dir] : 0), ty = Math.round(e.y) + (atCenter(e) ? DY[e.dir] : 0);
      if (!atCenter(e)) { // heading toward the next centre in the movement axis
        var cx = e.dir === 1 ? Math.floor(e.x) : e.dir === 3 ? Math.ceil(e.x) : Math.round(e.x);
        var cy = e.dir === 0 ? Math.floor(e.y) : e.dir === 2 ? Math.ceil(e.y) : Math.round(e.y);
        tx = cx; ty = cy;
      }
      var d = Math.hypot(tx - e.x, ty - e.y), st = speed * dt;
      if (d <= st) { e.x = tx; e.y = ty; return true; }
      e.x += (tx - e.x) / d * st; e.y += (ty - e.y) / d * st; return false;
    }
    function updatePlayer(dt) {
      var p = S.p, held = ctx.held.dir;
      if (S.hose) { // pumping: stand still; move to let go
        if (held >= 0) { S.hose = null; }
        else {
          p.pumpT += dt;
          var e = S.hose.e;
          if (e.dead || Math.abs(e.x - p.x) > 3 || Math.abs(e.y - p.y) > 3) S.hose = null;
          else if (ctx.held.a && p.pumpT > 0.4) { p.pumpT = 0; inflate(e); }
          return;
        }
      }
      var speed = 3.4;
      if (atCenter(p)) {
        var cx = Math.round(p.x), cy = Math.round(p.y);
        digTile(cx, cy);
        p.x = cx; p.y = cy;
        if (held >= 0 && walkable(cx + DX[held], cy + DY[held]) && !(cy + DY[held] < SKY - 1)) { p.dir = held; p.facing = held; }
        else p.dir = -1;
        if (p.dir < 0) return;
        if (!dug(cx + DX[p.dir], cy + DY[p.dir])) speed = 2.3;
      } else if (held >= 0 && held === (p.dir + 2) % 4) { p.dir = held; p.facing = held; }
      else if (held >= 0 && held !== p.dir && p.dir >= 0) { /* keep going to the next centre, then turn */ }
      if (p.dir < 0) return;
      p.anim += dt * speed;
      var nx = Math.round(p.x) + DX[p.dir], ny = Math.round(p.y) + DY[p.dir];
      if (atCenter(p) && !walkable(nx, ny)) { p.dir = -1; return; }
      // dig the tile we're moving into once we're past halfway
      stepTo(p, speed, dt);
      var tx = p.dir === 1 ? Math.floor(p.x) : p.dir === 3 ? Math.ceil(p.x) : Math.round(p.x);
      var ty = p.dir === 0 ? Math.floor(p.y) : p.dir === 2 ? Math.ceil(p.y) : Math.round(p.y);
      if (Math.abs(p.x - tx) + Math.abs(p.y - ty) < 0.55) digTile(tx, ty);
    }
    function tryPump() {
      var p = S.p; if (p.dead > 0) return;
      if (S.hose) { if (p.pumpT > 0.12) { p.pumpT = 0; inflate(S.hose.e); } return; }
      var f = p.facing, cx = Math.round(p.x), cy = Math.round(p.y);
      for (var d = 1; d <= 3; d++) {
        var tx = cx + DX[f] * d, ty = cy + DY[f] * d;
        if (!inb(tx, ty) || rockAt(tx, ty)) break;
        var e = S.enemies.filter(function (q) { return !q.dead && !q.ghost && Math.abs(q.x - tx) < 0.6 && Math.abs(q.y - ty) < 0.6; })[0];
        if (e) { S.hose = { e: e, len: d }; p.dir = -1; p.pumpT = 0; inflate(e); return; }
        if (!dug(tx, ty)) break;
      }
      ctx.fx('nope');
    }
    function inflate(e) {
      e.inflate = Math.min(4, e.inflate + 1); e.deflT = 0; e.charge = 0;
      ctx.fx('place'); ctx.buzz(10);
      if (e.inflate >= 4) popEnemy(e, 'pump');
    }
    function popEnemy(e, how) {
      e.dead = true; S.hose = null; ctx.pet.bark(how === 'rock' ? 'WOOF!' : 'YIP!');
      var L = layerOf(Math.round(e.y)), pts = LAYER_PTS[L] * (e.kind === 'flamer' ? 2 : 1) * (how === 'rock' ? 2 : 1);
      addScore(pts); pop(px(e.x), py(e.y) - 10, String(pts), '#7df9ff');
      burst(px(e.x), py(e.y), e.kind === 'flamer' ? '#d2402f' : '#a85fe2', 14);
      ctx.fx('eat'); ctx.buzz(25);
      var alive = S.enemies.filter(function (q) { return !q.dead; });
      if (alive.length === 1) { alive[0].fleeing = true; alive[0].ghost = true; alive[0].ghostMin = 99; }
    }
    function killPlayer(how) {
      var p = S.p; if (p.dead > 0) return;
      p.dead = 0.001; S.hose = null; ctx.fx('death'); ctx.buzz([60, 40, 80]); S.shake = 0.3;
      burst(px(p.x), py(p.y), '#ffffff', 10);
    }
    function updateEnemy(e, dt) {
      e.anim += dt * 6;
      var p = S.p;
      if (e.inflate > 0) { // frozen while inflated; slowly deflates
        e.deflT += dt;
        if (e.deflT > 1.1) { e.deflT = 0; e.inflate--; }
        return;
      }
      var speed = (2.0 + S.round * 0.12) * (e.kind === 'flamer' ? 0.9 : 1);
      if (e.flameT > 0) { e.flameT -= dt; return; }
      if (e.charge > 0) { e.charge -= dt; if (e.charge <= 0) breatheFire(e); return; }
      // ghosting through dirt toward the hero (or the exit when fleeing)
      e.ghostT -= dt;
      if (!e.ghost && e.ghostT <= 0 && !atCenter(e) === false) { e.ghost = true; e.ghostMin = 1.5; }
      if (e.ghost) {
        e.ghostMin -= dt;
        var tx = e.fleeing ? 0 : p.x, ty = e.fleeing ? SKY - 1 : p.y;
        var dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1, gs = 1.25 + S.round * 0.08;
        e.x += dx / d * gs * dt; e.y += dy / d * gs * dt;
        if (e.fleeing && e.y <= SKY - 0.9 && e.x <= 0.3) { e.dead = true; return; }
        var cx = Math.round(e.x), cy = Math.round(e.y);
        if (e.ghostMin <= 0 && dug(cx, cy) && cy >= SKY && !rockAt(cx, cy)) { e.ghost = false; e.x = cx; e.y = cy; e.ghostT = 8 + Math.random() * 10 - Math.min(5, S.round); e.dir = -1; }
        checkTouch(e); return;
      }
      if (atCenter(e)) {
        e.x = Math.round(e.x); e.y = Math.round(e.y);
        // flamer: breathe fire when the hero is in line within 3 tiles of open tunnel
        if (e.kind === 'flamer' && Math.random() < 0.6) {
          for (var f = 0; f < 4; f++) {
            if (f !== 1 && f !== 3) continue;
            var hit = false;
            for (var k = 1; k <= 3; k++) { var qx = e.x + DX[f] * k, qy = e.y; if (!dug(qx, qy) || rockAt(qx, qy)) break; if (Math.abs(p.x - qx) < 0.6 && Math.abs(p.y - qy) < 0.6) hit = true; }
            if (hit) { e.dir = f; e.charge = 0.7; return; }
          }
        }
        var opts = [];
        for (var d2 = 0; d2 < 4; d2++) { var nx = e.x + DX[d2], ny = e.y + DY[d2]; if (ny >= SKY && dug(nx, ny) && walkable(nx, ny)) opts.push(d2); }
        if (!opts.length) { e.ghost = true; e.ghostMin = 1.5; return; }
        var back = (e.dir + 2) % 4, fwd = opts.filter(function (o) { return o !== back; });
        var cand = fwd.length ? fwd : opts;
        // chase with some noise
        var best = cand[0], bd = 1e9;
        cand.forEach(function (o) { var nx = e.x + DX[o], ny = e.y + DY[o], dd = Math.hypot(nx - p.x, ny - p.y) + Math.random() * 2.5; if (dd < bd) { bd = dd; best = o; } });
        e.dir = best;
      }
      if (e.dir < 0) e.dir = 0;
      stepTo(e, speed, dt);
      checkTouch(e);
    }
    function checkTouch(e) {
      var p = S.p;
      if (p.dead === 0 && S.safeT <= 0 && Math.abs(e.x - p.x) < 0.55 && Math.abs(e.y - p.y) < 0.55) killPlayer('touch');
    }
    function breatheFire(e) {
      e.flameT = 0.9; ctx.fx('tnt');
      for (var k = 1; k <= 3; k++) { var qx = e.x + DX[e.dir] * k, qy = e.y; if (!dug(qx, qy) || rockAt(qx, qy) || !inb(qx, qy)) break; S.flames.push({ x: qx, y: qy, t: 0.9 }); }
    }
    function updateRock(r, dt) {
      var p = S.p;
      if (r.state === 'sit') { if (dug(Math.round(r.x), Math.round(r.y) + 1) && !rockAt(Math.round(r.x), Math.round(r.y) + 1)) { r.state = 'wobble'; r.t = 0; } return; }
      if (r.state === 'wobble') { r.t += dt; if (r.t > 1.0) { r.state = 'fall'; r.vy = 0; ctx.fx('crumble'); } return; }
      if (r.state === 'fall') {
        r.vy = Math.min(9, r.vy + 22 * dt);
        var ny = r.y + r.vy * dt, below = Math.floor(r.y) + 1;
        // crush anyone in the column between old and new position
        S.enemies.forEach(function (e) { if (!e.dead && !e.ghost && Math.abs(e.x - r.x) < 0.6 && e.y >= r.y - 0.3 && e.y <= ny + 0.6) { r.crushed++; popEnemy(e, 'rock'); } });
        if (p.dead === 0 && S.safeT <= 0 && Math.abs(p.x - r.x) < 0.6 && p.y >= r.y - 0.3 && p.y <= ny + 0.6) killPlayer('rock');
        var stopY = null;
        for (var yy = Math.floor(r.y) + 1; yy < ROWS; yy++) { if (!dug(r.x, yy) || rockAt(r.x, yy, r)) { stopY = yy - 1; break; } }
        if (stopY === null) stopY = ROWS - 1;
        if (ny >= stopY) { r.y = stopY; r.state = 'break'; r.t = 0; ctx.fx('boom'); ctx.buzz([30, 20, 40]); S.shake = 0.25; burst(px(r.x), py(r.y), '#8e8e90', 12); if (r.crushed > 1) { addScore(1000 * r.crushed); pop(px(r.x), py(r.y) - 14, 'x' + r.crushed + '!', '#ffe680'); } }
        else r.y = ny;
        return;
      }
      if (r.state === 'break') { r.t += dt; if (r.t > 0.5) r.gone = true; }
    }

    // ---------- draw ----------
    function buildLayers() {
      layers = document.createElement('canvas'); layers.width = W; layers.height = H;
      var g = layers.getContext('2d'); g.imageSmoothingEnabled = false;
      // sky
      var sky = g.createLinearGradient(0, 0, 0, OY + SKY * TS); sky.addColorStop(0, '#5aa7e8'); sky.addColorStop(1, '#a9d8ff');
      g.fillStyle = sky; g.fillRect(0, 0, W, OY + SKY * TS);
      g.fillStyle = '#fff3a0'; g.fillRect(W - 44, 30, 16, 16); g.fillStyle = '#ffffff'; g.fillRect(30, 36, 26, 8); g.fillRect(36, 30, 14, 8); g.fillRect(120, 42, 22, 7);
      // grass line on the surface row
      var gb = tex.blocks[T.GRASS];
      for (var x = 0; x < COLS; x++) g.drawImage(gb.side, 0, 0, 16, 6, OX + x * TS, OY + SKY * TS - 8, TS, 8);
      var tints = ['rgba(0,0,0,0)', 'rgba(40,20,10,0.25)', 'rgba(30,10,10,0.45)', 'rgba(10,5,10,0.62)'];
      var dirtTex = [tex.blocks[T.DIRT].top, tex.blocks[T.DIRT].top, tex.blocks[T.CLAY].top, tex.blocks[T.BASALT].top];
      for (var y = SKY; y < ROWS; y++) for (var xx = 0; xx < COLS; xx++) {
        var i = idx(xx, y), X = OX + xx * TS, Y = OY + y * TS, L = layerOf(y);
        if (S.dug[i]) {
          g.fillStyle = ['#3a2416', '#2f1c12', '#24140f', '#170c0b'][L]; g.fillRect(X, Y, TS, TS);
          g.fillStyle = 'rgba(0,0,0,0.25)'; if (!dug(xx, y - 1)) g.fillRect(X, Y, TS, 3); if (!dug(xx - 1, y)) g.fillRect(X, Y, 3, TS);
        } else {
          g.drawImage(dirtTex[L], 0, 0, 16, 16, X, Y, TS, TS);
          g.fillStyle = tints[L]; g.fillRect(X, Y, TS, TS);
          if (S.ore[i]) { var ok = ['', 'coal', 'iron', 'gold', 'diamond'][S.ore[i]]; g.drawImage(tex.ores[ok], X + 5, Y + 5, 14, 14); }
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, OY + ROWS * TS, W, H - OY - ROWS * TS);
      // bedrock walls
      var bed = tex.blocks[T.BORDER].top;
      for (var by = OY + SKY * TS; by < H; by += 16) { g.drawImage(bed, 0, 0, 16, 16, 0, by, OX, 16); g.drawImage(bed, 0, 0, 16, 16, OX + COLS * TS, by, W - OX - COLS * TS, 16); }
    }
    function drawEnemy(g, e) {
      var sc = 1 + e.inflate * 0.28, S2 = TS * 0.9 * sc, cx = px(e.x), cy = py(e.y);
      var kind = e.kind === 'flamer' ? 'rumble' : 'sly', fr = Math.floor(e.anim) % 2;
      if (e.ghost) { g.globalAlpha = 0.45; }
      if (e.charge > 0 && Math.floor(S.time * 12) % 2) g.globalAlpha = 0.6;
      g.drawImage(tex.mons[kind][fr], Math.round(cx - S2 / 2), Math.round(cy - S2 / 2), S2, S2);
      PCTex.drawEyes(g, Math.round(cx - S2 / 2), Math.round(cy - S2 / 2), S2 / 16, e.dir, e.inflate >= 3);
      g.globalAlpha = 1;
    }
    function draw(g, w, h, dt) {
      if (!layers) buildLayers();
      g.save();
      if (S.shake > 0) g.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      g.drawImage(layers, 0, 0);
      // flames
      S.flames.forEach(function (f) { var X = px(f.x), Y = py(f.y); g.fillStyle = '#ff8a1f'; g.fillRect(X - 10, Y - 8, 20, 16); g.fillStyle = '#ffd23d'; g.fillRect(X - 6, Y - 4, 12, 8); g.fillStyle = '#fff3a0'; g.fillRect(X - 2 + Math.sin(S.time * 30) * 2, Y - 2, 4, 4); });
      // rocks
      S.rocks.forEach(function (r) {
        if (r.gone) return;
        var X = px(r.x), Y = py(r.y), wob = r.state === 'wobble' ? Math.sin(r.t * 40) * 2 : 0;
        if (r.state === 'break') { g.globalAlpha = 1 - r.t / 0.5; }
        g.fillStyle = '#1b1822'; g.fillRect(X - 11 + wob, Y - 10, 22, 21);
        g.drawImage(tex.blocks[T.COBBLE].top, 0, 0, 16, 16, X - 10 + wob, Y - 9, 20, 19);
        g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(X - 8 + wob, Y - 8, 8, 3);
        g.globalAlpha = 1;
      });
      // hose
      if (S.hose) { var p0 = S.p, e = S.hose.e; g.strokeStyle = '#e8e8ee'; g.lineWidth = 3; g.beginPath(); g.moveTo(px(p0.x), py(p0.y)); g.lineTo(px(e.x), py(e.y)); g.stroke(); g.fillStyle = '#d8322b'; g.fillRect(px(e.x) - 3, py(e.y) - 3, 6, 6); }
      // enemies
      S.enemies.forEach(function (e) { if (!e.dead) drawEnemy(g, e); });
      // wolf, then hero
      ctx.pet.draw(g, px(ctx.pet.x), py(ctx.pet.y) + TS / 2 - 2, TS);
      var p = S.p, hx = px(p.x), hy = py(p.y), HS = TS * 1.0;
      if (p.dead > 0) { g.save(); g.translate(hx, hy); g.rotate(p.dead * 8); var sc = Math.max(0, 1 - p.dead * 0.6); g.scale(sc, sc); g.drawImage(hero.down[0], -HS / 2, -HS / 2, HS, HS); g.restore(); }
      else {
        if (S.safeT > 0 && Math.floor(S.time * 10) % 2) g.globalAlpha = 0.5;
        var view = ['up', 'left', 'down', 'right'][p.facing], fr = p.dir >= 0 ? 1 + Math.floor(p.anim * 2) % 2 : 0;
        g.drawImage(hero[view][fr], Math.round(hx - HS / 2), Math.round(hy - HS / 2) - 2, HS, HS);
        g.globalAlpha = 1;
        // pump/pick in hand
        var pk = tex.picks[Math.min(4, ctx.save.up.pick || 0)]; g.drawImage(pk, hx + (p.facing === 1 ? -14 : 4), hy - 4, 11, 11);
      }
      // particles / popups
      S.parts.forEach(function (q) { g.globalAlpha = 1 - q.t / q.life; g.fillStyle = q.col; g.fillRect(q.x, q.y, q.s, q.s); }); g.globalAlpha = 1;
      S.pops.forEach(function (q) { g.globalAlpha = 1 - q.t; PCTex.drawText(g, q.text, q.x - PCTex.textWidth(q.text, 1.5) / 2, q.y - q.t * 24, 1.5, q.col, '#000'); }); g.globalAlpha = 1;
      // hud strip
      g.fillStyle = '#1a1420'; g.fillRect(0, 0, W, OY);
      for (var i = 0; i < S.lives; i++) g.drawImage(tex.heart[1], 6 + i * 16, 5, 14, 13);
      PCTex.drawText(g, 'ROUND ' + S.round, W - 88, 7, 2, '#fff', '#000');
      var left = S.enemies.filter(function (e) { return !e.dead; }).length;
      PCTex.drawText(g, left + ' LEFT', 120, 7, 2, '#ffe680', '#000');
      if (S.msg) { var s = S.msg.text.length > 12 ? 2 : 3, tw = PCTex.textWidth(S.msg.text, s); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(W / 2 - tw / 2 - 10, H / 2 - 20, tw + 20, 36); PCTex.drawText(g, S.msg.text, W / 2 - tw / 2, H / 2 - 10, s, '#ffe680', '#000'); }
      g.restore();
    }
    function input(e) { if (e.type === 'a' && e.down) tryPump(); }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { dug: dug, rockAt: rockAt, updateRock: updateRock } };
  }

  return {
    id: 'digger', name: 'Tunnel Trouble', blurb: 'Dig deep, pump the monsters till they pop, drop boulders on the rest.',
    view: { w: W, h: H }, music: 'forest',
    controls: { dpad: true, a: 'PUMP', b: null },
    thumb: function (g, w, h, tex) {
      var T2 = window.PCWorld.TILE;
      g.fillStyle = '#7cc0f0'; g.fillRect(0, 0, w, 12);
      for (var y = 12; y < h; y += 12) for (var x = 0; x < w; x += 12) { g.drawImage(tex.blocks[T2.DIRT].top, 0, 0, 16, 16, x, y, 12, 12); g.fillStyle = 'rgba(20,8,5,' + ((y - 12) / h * 0.7) + ')'; g.fillRect(x, y, 12, 12); }
      g.fillStyle = '#2f1c12'; g.fillRect(26, 12, 12, 30); g.fillRect(14, 30, 36, 12);
      g.drawImage(PCTex.hero(PCTex.LOOK_DEFAULT).down[0], 24, 10, 16, 16);
      g.drawImage(tex.mons.sly[0], 40, 28, 14, 14); g.drawImage(tex.blocks[T2.COBBLE].top, 0, 0, 16, 16, 4, 16, 12, 12);
    },
    create: create
  };
})());
