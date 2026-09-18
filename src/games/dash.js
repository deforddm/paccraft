/* Cheetah Dash — a blocky speed-runner. Tear across rolling block hills, loop-the-loops and
 * springs collecting emeralds, stomp cube monsters, and spin-dash through ore blocks.
 * Original character: Zip the cheetah. */
PCCab.register((function () {
  'use strict';
  var W = 400, H = 340, ZOOM = 1.5, VW = W / ZOOM, VH = H / ZOOM, TS = 16, GRAV = 1500, RUN_ACC = 760, FRICTION = 640, MAX_RUN = 300, MAX_ANY = 470, JUMP_V = -430;
  var ZONES = [
    { name: 'Meadow Hills', biome: 'meadow', sky: ['#5cb4f2', '#c8ecff'], far: '#6ea86a', top: 'GRASS', under: 'DIRT', music: 'meadow' },
    { name: 'Sandy Dunes', biome: 'desert', sky: ['#f6b26b', '#ffe9b8'], far: '#c79a5c', top: 'SAND', under: 'SANDSTONE', music: 'desert' },
    { name: 'Frosty Ridge', biome: 'snow', sky: ['#7d9dc9', '#e4f1ff'], far: '#a8bcd6', top: 'SNOW', under: 'STONE', music: 'snow' },
    { name: 'Magma Run', biome: 'lava', sky: ['#3a1210', '#8a3a1a'], far: '#5a2a1a', top: 'MAGMA', under: 'BASALT', music: 'lava' },
    { name: 'Crystal Rush', biome: 'crystal', sky: ['#2a1a4a', '#6a4aa8'], far: '#4a3a7a', top: 'CRYSTAL', under: 'STONE', music: 'crystal' }
  ];

  // ---------- Zip the cheetah (drawn in code) ----------
  var zipCache = null;
  function zipSprites() {
    if (zipCache) return zipCache;
    var Y = '#f2c230', YD = '#d9a41c', B = '#1b1822', Wt = '#fff6d8', P = '#f19a8f';
    function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function body(frame) { // 24x16 facing right; frame 0 idle, 1-4 run, 5 jump
      var c = mk(24, 16), g = c.getContext('2d');
      function p(x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
      function r(x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
      // tail
      [[4, 7], [3, 6], [2, 5], [1, 4], [1, 3]].forEach(function (q, i) { p(q[0], q[1], i > 2 ? B : Y); });
      // body
      r(5, 5, 14, 6, Y); r(6, 10, 12, 2, Wt); r(5, 9, 1, 2, YD); r(18, 9, 1, 2, YD);
      // head
      r(16, 2, 8, 7, Y); r(19, 6, 5, 3, Wt); p(23, 6, B); p(21, 4, B); p(21, 5, B); p(21, 6, B); // eye + tear stripe
      p(17, 1, Y); p(21, 1, Y); p(17, 0, B); p(21, 0, B);
      // spots
      [[7, 6], [10, 7], [13, 6], [9, 9], [15, 8], [17, 4]].forEach(function (q) { p(q[0], q[1], B); });
      // legs
      var legs = [[[6, 12, 2, 3], [10, 12, 2, 3], [14, 12, 2, 3], [17, 12, 2, 3]],
        [[4, 12, 2, 3], [9, 12, 2, 2], [14, 12, 2, 2], [19, 12, 2, 3]],
        [[7, 12, 2, 2], [8, 13, 2, 2], [15, 12, 2, 2], [16, 13, 2, 2]],
        [[9, 12, 2, 3], [11, 12, 2, 2], [12, 12, 2, 2], [15, 12, 2, 3]],
        [[3, 11, 2, 3], [8, 12, 2, 2], [15, 12, 2, 2], [20, 11, 2, 3]],
        [[5, 12, 2, 2], [8, 12, 2, 2], [15, 12, 2, 2], [18, 12, 2, 2]]][frame];
      legs.forEach(function (l) { r(l[0], l[1], l[2], l[3], Y); p(l[0], l[1] + l[3] - 1, YD); });
      return PCTex.outline(c);
    }
    function ball(frame) { // 16x16 rolling ball
      var c = mk(16, 16), g = c.getContext('2d');
      function p(x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
      for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var dx = x - 7.5, dy = y - 7.5; if (dx * dx + dy * dy <= 49) p(x, y, Y); }
      var a = frame * Math.PI / 2;
      for (var k = 0; k < 6; k++) { var ang = a + k * 1.05, rr = 4.5; p(Math.round(7.5 + Math.cos(ang) * rr), Math.round(7.5 + Math.sin(ang) * rr), B); }
      p(Math.round(7.5 + Math.cos(a) * 6.5), Math.round(7.5 + Math.sin(a) * 6.5), Wt);
      return PCTex.outline(c);
    }
    zipCache = { run: [body(0), body(1), body(2), body(3), body(4)], jump: body(5), ball: [ball(0), ball(1), ball(2), ball(3)] };
    zipCache.runL = zipCache.run.map(flip); zipCache.jumpL = flip(zipCache.jump);
    return zipCache;
  }
  function flip(c) { var o = document.createElement('canvas'); o.width = c.width; o.height = c.height; var g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; }

  // ---------- level generator ----------
  function genLevel(zoneNum, Wd) {
    var r = Wd.rng(zoneNum * 104729 + 99), z = ZONES[(zoneNum - 1) % ZONES.length];
    var L = { zone: z, zoneNum: zoneNum, h: [], emeralds: [], springs: [], loops: [], plats: [], enemies: [], ores: [], checks: [], goalX: 0 };
    var base = 224, cur = base, x = 0;
    function flat(n, y) { for (var i = 0; i < n; i++) L.h.push(y); x += n; }
    function ring(cx, cy, n, rad) { for (var i = 0; i < n; i++) { var a = -Math.PI * 0.85 + i / (n - 1) * Math.PI * 0.7; L.emeralds.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad * 0.7 }); } }
    function row(x0, y, n, gap) { for (var i = 0; i < n; i++) L.emeralds.push({ x: x0 + i * (gap || 20), y: y }); }
    flat(14, base); row(4 * TS, base - 40, 5);
    var segs = 12 + zoneNum * 2, hard = Math.min(1, (zoneNum - 1) * 0.15);
    for (var s = 0; s < segs; s++) {
      var t = r(), y0 = cur;
      if (t < 0.22) { // rolling hill
        var n = 18 + Math.floor(r() * 10), amp = 40 + r() * 50 * (1 + hard), x0 = x;
        for (var i = 0; i < n; i++) L.h.push(Math.round(y0 - Math.sin(i / (n - 1) * Math.PI) * amp)); x += n;
        row((x0 + 4) * TS, y0 - amp - 36, 6, 24); if (r() < 0.5) L.enemies.push({ x: (x0 + Math.floor(n / 2)) * TS, kind: 'rumble' });
      } else if (t < 0.40) { // gap
        var run = 8 + Math.floor(r() * 4), gap = 3 + Math.floor(r() * (2 + hard * 2)), x0b = x;
        flat(run, y0); for (var g = 0; g < gap; g++) L.h.push(null); x += gap; flat(6, y0);
        ring((x0b + run + gap / 2) * TS, y0 - 60, 5, 40);
        if (r() < 0.7) L.springs.push({ x: (x0b + run - 1) * TS + 8, y: y0 });
      } else if (t < 0.56) { // loop-the-loop
        var rad = 44 + Math.floor(r() * 12), x0c = x; flat(12, y0);
        L.loops.push({ x: x * TS + rad, y: y0 - rad, r: rad, entryX: x * TS });
        flat(Math.ceil(rad * 2 / TS) + 2, y0); flat(8, y0);
        var lc = L.loops[L.loops.length - 1]; for (var k = 0; k < 8; k++) { var a2 = Math.PI / 2 - k / 7 * Math.PI * 2; L.emeralds.push({ x: lc.x + Math.cos(a2) * (rad - 14), y: lc.y + Math.sin(a2) * (rad - 14) }); }
        row((x0c + 2) * TS, y0 - 30, 5, 20);
      } else if (t < 0.72) { // platforms / ore blocks
        var n2 = 16 + Math.floor(r() * 8), x0d = x; flat(n2, y0);
        var py = y0 - 56 - Math.floor(r() * 30);
        L.plats.push({ x: (x0d + 3) * TS, y: py, w: 4 + Math.floor(r() * 3) });
        row((x0d + 3) * TS + 8, py - 22, 4, 16);
        var okind = ['coal', 'coal', 'iron', 'gold', 'diamond', 'ember'][Math.min(5, Math.floor(r() * (2.5 + zoneNum * 0.7)))];
        L.ores.push({ x: (x0d + 10) * TS, y: y0 - 48 - Math.floor(r() * 24), kind: okind });
        if (r() < 0.6 + hard * 0.3) L.enemies.push({ x: (x0d + 12) * TS, kind: r() < 0.5 ? 'sly' : 'mudge' });
      } else if (t < 0.84) { // step up / down via spring or slope
        var n3 = 10, x0e = x, dy = (r() < 0.5 ? -1 : 1) * (32 + Math.floor(r() * 32));
        if (y0 + dy < 100) dy = 48; if (y0 + dy > 250) dy = -48;
        flat(n3, y0);
        if (dy < 0 && r() < 0.6) { L.springs.push({ x: x * TS - 8, y: y0 }); flat(2, y0); for (var q = 0; q < 2; q++) L.h.push(null); x += 2; }
        else { for (var j = 0; j < 8; j++) L.h.push(Math.round(y0 + dy * (j + 1) / 8)); x += 8; }
        cur = y0 + dy; flat(6, cur); row((x0e + 2) * TS, y0 - 34, 4, 20);
      } else { // valley with enemies
        var n4 = 22, x0f = x, dep = 30 + r() * 30;
        for (var v = 0; v < n4; v++) L.h.push(Math.round(y0 + Math.sin(v / (n4 - 1) * Math.PI) * dep)); x += n4;
        L.enemies.push({ x: (x0f + 8) * TS, kind: 'frost' }); L.enemies.push({ x: (x0f + 14) * TS, kind: 'rumble' });
        ring((x0f + n4 / 2) * TS, y0 - 20, 6, 60);
      }
      if (s % 4 === 3) { flat(4, cur); L.checks.push({ x: x * TS - 24, y: cur }); }
    }
    flat(16, cur); L.goalX = (x - 6) * TS; flat(6, cur);
    L.len = L.h.length * TS;
    L.emeralds = L.emeralds.filter(function (e) { return e.y > 20; });
    return L;
  }

  function create(ctx) {
    var tex = ctx.tex, Wd = window.PCWorld, T = Wd.TILE, zip = zipSprites();
    var S = {}, bgCache = null;
    var onceKeys = {};
    function groundAt(x) { // surface y at world x (interpolated); null over a pit
      var c = x / TS, i = Math.floor(c), f = c - i;
      var a = S.L.h[i], b = S.L.h[i + 1];
      if (a === null || a === undefined) return null;
      if (b === null || b === undefined) return a;
      return a + (b - a) * f;
    }
    function reset() { S.zoneNum = 1; S.lives = 3; S.score = 0; S.total = 0; newZone(); }
    function newZone() {
      S.L = genLevel(S.zoneNum, Wd); S.z = S.L.zone;
      S.emeralds = S.L.emeralds.map(function (e) { return { x: e.x, y: e.y, got: false }; });
      S.enemies = S.L.enemies.map(function (e) { return { x: e.x, y: 0, kind: e.kind, dir: -1, dead: false, anim: Math.random() * 5, home: e.x }; });
      S.ores = S.L.ores.map(function (o) { return { x: o.x, y: o.y, kind: o.kind, gone: false }; });
      S.check = { x: 40, y: S.L.h[2] }; S.lost = []; S.parts = []; S.pops = []; S.time = 0; S.zoneT = 0; S.msg = { text: S.z.name.toUpperCase(), sub: 'ZONE ' + S.zoneNum, t: 2.2 };
      S.done = false; bgCache = null; ctx.A.startMusic(S.z.music);
      S.hintT = S.zoneNum === 1 ? 4 : 0;
      spawn();
    }
    function spawn() {
      S.p = { x: S.check.x, y: S.check.y - 8, vx: 0, vy: 0, ground: true, face: 1, spin: false, charge: 0, hurt: 0, dead: 0, anim: 0, loop: null, jumpHeld: false, count: S.p ? S.p.count : 0 };
      S.p.count = 0;
      ctx.pet.reset(S.p.x - 20, S.p.y, 3);
      S.cam = { x: Math.max(0, S.p.x - 100), y: Math.max(0, S.p.y - 130) };
      S.safeT = 1.5;
    }
    function burst(x, y, col, n, sp) { for (var i = 0; i < n; i++) S.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * (sp || 160), vy: -Math.random() * 140, g: 500, life: 0.4 + Math.random() * 0.3, t: 0, col: col, s: 2 + Math.random() * 3 }); }
    function pop(x, y, text, col) { S.pops.push({ x: x, y: y, text: text, col: col || '#fff', t: 0 }); }
    function addScore(n) { S.score += n; ctx.score(S.score); }

    function hurt(p) {
      if (p.hurt > 0 || S.safeT > 0 || p.dead > 0) return;
      if (p.count > 0) {
        var n = Math.min(12, p.count);
        for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + (i / n - 0.5) * Math.PI * 1.4; S.lost.push({ x: p.x, y: p.y - 8, vx: Math.cos(a) * 170 + (Math.random() - 0.5) * 60, vy: Math.sin(a) * 240 - 60, t: 0 }); }
        p.count = 0; p.hurt = 1.4; p.vx = -p.face * 150; p.vy = -260; p.ground = false; p.spin = false; p.loop = null;
        ctx.fx('death'); ctx.buzz([40, 30, 60]);
      } else die();
    }
    function die() {
      var p = S.p; if (p.dead > 0) return;
      p.dead = 0.001; p.vy = -380; p.vx = 0; p.loop = null; ctx.fx('over'); ctx.buzz([60, 40, 100]);
    }
    function collectEmerald(e) { e.got = true; S.p.count++; addScore(10); ctx.fx('gem'); burst(e.x, e.y, '#5ef0a8', 3, 60); }
    function bonk(en) { en.dead = true; addScore(100); pop(en.x, en.y - 20, '100', '#7df9ff'); burst(en.x, en.y - 8, '#ffffff', 10); ctx.fx('eat'); ctx.buzz(20); }
    function breakOre(o) { o.gone = true; ctx.addOre(o.kind, 1); addScore(50); pop(o.x, o.y - 16, '+1 ' + o.kind.toUpperCase(), '#ffe680'); burst(o.x, o.y, (tex.blocks[T[o.kind.toUpperCase()]] || {}).avg || '#aaa', 10); ctx.fx('mined', { tile: T.STONE, drop: o.kind }); ctx.buzz(15); }

    function update(dt) {
      S.time += dt; S.zoneT += dt;
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.p.dead <= 0) { ctx.pet.follow(S.p.x, S.p.y, dt, { dist: 26, snap: 220, speed: 320 }); var gy = groundAt(ctx.pet.x); if (gy !== null) ctx.pet.y += (gy - 8 - ctx.pet.y) * Math.min(1, dt * 14); }   // the wolf runs the ground under Zip's path
      else ctx.pet.sit(dt);
      if (S.hintT > 0) { S.hintT -= dt; if (S.hintT <= 0) S.msg = { text: 'HOLD SPIN - LET GO!', sub: 'JUMP ON MONSTERS', t: 3 }; }
      if (S.safeT > 0) S.safeT -= dt;
      var p = S.p, held = ctx.held;
      if (S.done) { S.doneT -= dt; if (S.doneT <= 0) { S.zoneNum++; newZone(); } return; }
      if (p.dead > 0) {
        p.dead += dt; p.vy += GRAV * dt; p.y += p.vy * dt;
        if (p.dead > 1.6) {
          S.lives--;
          if (S.lives <= 0) { ctx.over({ lines: [['Zone reached', S.zoneNum], ['Emeralds', S.total]] }); return; }
          spawn(); S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 };
        }
        return;
      }
      if (p.hurt > 0) p.hurt -= dt;
      var dir = held.dir === 1 ? -1 : held.dir === 3 ? 1 : 0;

      // ----- loop rail -----
      if (p.loop) {
        var lp = p.loop, sp = Math.max(190, Math.abs(p.vx));
        lp.a -= sp / lp.r * dt;
        p.x = lp.x + Math.cos(lp.a) * (lp.r - 10); p.y = lp.y + Math.sin(lp.a) * (lp.r - 10);
        p.anim += dt * 14;
        if (lp.a <= Math.PI / 2 - Math.PI * 2) { p.loop = null; p.y = groundAt(p.x) - 8; p.ground = true; p.vx = sp; }
        collectStuff(p); return;
      }
      // ----- spin dash charge -----
      if (held.b && p.ground && Math.abs(p.vx) < 40 && !p.spin) { p.charge = Math.min(1, p.charge + dt * 1.4); p.vx = 0; if (Math.floor(S.time * 20) % 4 === 0) burst(p.x - p.face * 10, p.y, '#ffffff', 1, 40); p.anim += dt * 30; }
      else if (p.charge > 0) { p.vx = p.face * (220 + 220 * p.charge); p.charge = 0; p.spin = true; ctx.fx('tnt'); ctx.buzz(15); }
      // ----- running -----
      var g = groundAt(p.x), slope = 0;
      if (g !== null) { var g2 = groundAt(p.x + 8); if (g2 !== null) slope = (g2 - g) / 8; }
      if (!p.charge) {
        if (dir !== 0 && p.hurt <= 0) {
          if (p.spin) { p.vx += dir * RUN_ACC * 0.15 * dt; }
          else { if (dir * p.vx < MAX_RUN) p.vx += dir * RUN_ACC * dt; p.face = dir; }   // no pushing past top speed
        } else if (p.ground) { p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx), (p.spin ? FRICTION * 0.3 : FRICTION) * dt); }
        if (p.ground) p.vx += slope * 900 * dt;   // downhill = faster, uphill = slower
        if (Math.abs(p.vx) > MAX_ANY) p.vx = Math.sign(p.vx) * Math.max(MAX_ANY, Math.abs(p.vx) - 1400 * dt);
        else if (Math.abs(p.vx) > MAX_RUN && p.ground && slope <= 0.05 && !p.spin) p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx) - MAX_RUN, 260 * dt);
        if (p.spin && Math.abs(p.vx) < 70 && p.ground) p.spin = false;
      }
      // ----- jump -----
      if (held.a && !p.jumpHeld && p.ground && p.hurt <= 0) { p.vy = JUMP_V - Math.min(90, Math.abs(p.vx) * 0.25); p.ground = false; p.jumpHeld = true; p.spin = false; p.charge = 0; ctx.fx('undo'); p.jumpT = 0; }
      if (!held.a) p.jumpHeld = false;
      if (!p.ground && !held.a && p.vy < -150 && p.jumpT !== undefined && p.jumpT < 0.25) p.vy = -150;
      if (!p.ground) { p.vy += GRAV * dt; p.jumpT = (p.jumpT || 0) + dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 8) { p.x = 8; if (p.vx < 0) p.vx = 0; }
      p.anim += dt * Math.abs(p.vx) / 18;
      // ----- ground / pits -----
      var gy = groundAt(p.x);
      if (gy === null) { p.ground = false; if (p.y > 330) { die(); } }
      else {
        if (p.ground) { if (gy - (p.y + 8) < 14 && gy - (p.y + 8) > -14) { p.y = gy - 8; } else { p.ground = false; } }
        if (!p.ground && p.vy >= 0 && p.y + 8 >= gy - 2) { p.y = gy - 8; p.vy = 0; if (!p.ground) { p.ground = true; burst(p.x, p.y + 8, '#c9b28a', 2, 60); } }
        if (p.ground) p.vy = 0;
      }
      // ----- platforms (top-only) -----
      S.L.plats.forEach(function (pl) {
        if (p.vy >= 0 && p.x > pl.x - 6 && p.x < pl.x + pl.w * TS + 6) {
          var top = pl.y, feet = p.y + 8;
          if (feet >= top - 2 && feet - p.vy * dt <= top + 4) { p.y = top - 8; p.vy = 0; p.ground = true; }
        }
      });
      // ----- springs -----
      S.L.springs.forEach(function (sp) { if (Math.abs(p.x - sp.x) < 12 && p.y + 8 >= sp.y - 14 && p.y + 8 <= sp.y + 6 && p.vy >= -10) { p.vy = -560; p.ground = false; p.spin = false; sp.t = 0.3; ctx.fx('bonus'); ctx.buzz(12); } if (sp.t > 0) sp.t -= dt; });
      // ----- loops -----
      S.L.loops.forEach(function (lp) {
        if (p.ground && p.vx > 200 && p.x >= lp.entryX + 6 && p.x < lp.entryX + 22 && Math.abs(p.y + 8 - (lp.y + lp.r)) < 12) { p.loop = { x: lp.x, y: lp.y, r: lp.r, a: Math.PI / 2 }; p.ground = false; p.spin = true; ctx.fx('bonus'); }
      });
      // ----- ore blocks -----
      S.ores.forEach(function (o) {
        if (o.gone) return;
        if (Math.abs(p.x - o.x) < 14 && Math.abs(p.y - o.y) < 14) {
          if (p.spin || (p.vy < 0 && p.y > o.y)) breakOre(o);
          else if (p.vy < 0 && p.y > o.y + 6) { p.vy = 60; }
          else if (p.vy > 0 && p.y < o.y - 6) { p.y = o.y - 16; p.vy = 0; p.ground = true; }
          else if (!p.spin) { p.vx = -Math.sign(p.x - o.x) * -80; }
        }
      });
      // ----- enemies -----
      S.enemies.forEach(function (en) {
        if (en.dead) return;
        en.anim += dt * 6;
        var eg = groundAt(en.x + en.dir * 10), eg0 = groundAt(en.x);
        if (eg === null || Math.abs(en.x - en.home) > 70) en.dir = -en.dir; else en.x += en.dir * 40 * dt;
        en.y = (eg0 !== null ? eg0 : en.y) - 8;
        if (en.x < S.cam.x - 40 || en.x > S.cam.x + VW + 40) return;
        if (Math.abs(p.x - en.x) < 13 && Math.abs(p.y - en.y) < 14) {
          if (p.spin || (p.vy > 0 && p.y < en.y - 4)) { bonk(en); if (!p.spin) p.vy = -300; }
          else hurt(p);
        }
      });
      // ----- checkpoints & goal -----
      S.L.checks.forEach(function (c) { if (!c.hit && p.x > c.x) { c.hit = true; S.check = { x: c.x, y: c.y }; pop(c.x, c.y - 40, 'CHECKPOINT', '#7dff8a'); ctx.fx('line'); ctx.pet.bark(); } });
      if (p.x > S.L.goalX && !S.done) {
        S.done = true; S.doneT = 2.6; var bonus = 1000 + Math.max(0, 60 - Math.floor(S.zoneT)) * 20 + p.count * 5;
        addScore(bonus); S.total += p.count; ctx.addOre('coal', 1 + Math.floor(S.zoneNum / 2)); ctx.fx('clear'); ctx.buzz(30);
        S.msg = { text: 'ZONE CLEAR!', sub: 'BONUS ' + bonus, t: 2.6 }; ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop();
      }
      collectStuff(p);
      // lost emeralds physics
      S.lost.forEach(function (e) { e.t += dt; e.vy += 700 * dt; e.x += e.vx * dt; e.y += e.vy * dt; var gy2 = groundAt(e.x); if (gy2 !== null && e.y > gy2 - 3) { e.y = gy2 - 3; e.vy = -Math.abs(e.vy) * 0.5; e.vx *= 0.7; } if (e.t > 0.5 && Math.abs(e.x - p.x) < 12 && Math.abs(e.y - p.y) < 14 && p.dead === 0) { e.t = 99; p.count++; addScore(10); ctx.fx('gem'); } });
      S.lost = S.lost.filter(function (e) { return e.t < 3.5; });
      S.parts.forEach(function (q) { q.t += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }); S.parts = S.parts.filter(function (q) { return q.t < q.life; });
      S.pops.forEach(function (q) { q.t += dt; }); S.pops = S.pops.filter(function (q) { return q.t < 1; });
      // ----- camera -----
      var look = Math.max(-60, Math.min(120, p.vx * 0.35));
      var tx = p.x - VW * 0.4 + look, ty = p.y - VH * 0.62;
      S.cam.x += (tx - S.cam.x) * Math.min(1, dt * 6); S.cam.y += (ty - S.cam.y) * Math.min(1, dt * 4);
      S.cam.x = Math.max(0, Math.min(S.L.len - VW, S.cam.x)); S.cam.y = Math.max(-40, Math.min(110, S.cam.y));
    }
    function collectStuff(p) {
      S.emeralds.forEach(function (e) { if (!e.got && Math.abs(e.x - p.x) < 14 && Math.abs(e.y - p.y) < 16) collectEmerald(e); });
    }

    // ---------- drawing ----------
    function drawBg(g) {
      var z = S.z;
      if (!bgCache) {
        bgCache = document.createElement('canvas'); bgCache.width = W; bgCache.height = H;
        var b = bgCache.getContext('2d');
        var sky = b.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, z.sky[0]); sky.addColorStop(1, z.sky[1]); b.fillStyle = sky; b.fillRect(0, 0, W, H);
      }
      g.drawImage(bgCache, 0, 0);
      // far blocky hills (parallax)
      g.fillStyle = z.far;
      var off = -(S.cam.x * 0.25) % 200;
      for (var i = -1; i < 4; i++) { var hx = off + i * 200; g.fillRect(hx, 230 - S.cam.y * 0.3, 60, 200); g.fillRect(hx + 40, 195 - S.cam.y * 0.3, 80, 200); g.fillRect(hx + 110, 245 - S.cam.y * 0.3, 70, 200); }
      g.fillStyle = 'rgba(255,255,255,0.75)';
      var co = -(S.cam.x * 0.5) % 260;
      for (var c = -1; c < 3; c++) { var cx = co + c * 260; g.fillRect(cx + 20, 40 - S.cam.y * 0.3, 40, 10); g.fillRect(cx + 28, 34 - S.cam.y * 0.3, 20, 8); g.fillRect(cx + 150, 70 - S.cam.y * 0.3, 50, 10); }
    }
    function draw(g, w, h, dt) {
      var p = S.p, cam = S.cam, z = S.z, L = S.L;
      drawBg(g);
      g.save(); g.scale(ZOOM, ZOOM); g.translate(-Math.round(cam.x), -Math.round(cam.y));
      var top = tex.blocks[T[z.top]], under = tex.blocks[T[z.under]];
      var c0 = Math.max(0, Math.floor(cam.x / TS) - 1), c1 = Math.min(L.h.length - 1, Math.ceil((cam.x + VW) / TS) + 1);
      // terrain columns
      for (var c = c0; c <= c1; c++) {
        var hy = L.h[c]; if (hy === null) continue;
        var X = c * TS, Y = Math.round(hy / 4) * 4;
        g.drawImage(top.top, 0, 0, 16, 16, X, Y, TS, TS);
        for (var yy = Y + TS; yy < cam.y + VH + TS; yy += TS) g.drawImage(under.top, 0, 0, 16, 16, X, yy, TS, TS);
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(X + TS - 1, Y, 1, cam.y + VH - Y + TS);
        var nh = L.h[c + 1]; if (nh !== null && nh !== undefined && Math.round(nh / 4) * 4 > Y) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(X + TS - 2, Y, 2, Math.round(nh / 4) * 4 - Y); }
      }
      // loops (ring of blocks)
      L.loops.forEach(function (lp) {
        if (lp.x + lp.r < cam.x || lp.x - lp.r > cam.x + VW) return;
        var n = Math.round(lp.r * 0.45);
        for (var k = 0; k < n; k++) {
          var a = k / n * Math.PI * 2; if (a > Math.PI * 0.35 && a < Math.PI * 0.65) continue;   // open at the bottom
          var bx = lp.x + Math.cos(a) * lp.r, by = lp.y + Math.sin(a) * lp.r;
          g.drawImage(tex.blocks[T.COBBLE].top, 0, 0, 16, 16, Math.round(bx - 7), Math.round(by - 7), 14, 14);
          g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(Math.round(bx - 7), Math.round(by + 5), 14, 2);
        }
      });
      // platforms, ores, springs, checkpoints, goal
      L.plats.forEach(function (pl) { for (var i = 0; i < pl.w; i++) { g.drawImage(top.top, 0, 0, 16, 16, pl.x + i * TS, pl.y, TS, 12); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(pl.x + i * TS, pl.y + 10, TS, 2); } });
      S.ores.forEach(function (o) { if (!o.gone) { g.drawImage(tex.blocks[T[o.kind.toUpperCase()]].top, 0, 0, 16, 16, o.x - 8, o.y - 8, 16, 16); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(o.x - 8, o.y - 8, 16, 1); } });
      L.springs.forEach(function (sp) { var sq = sp.t > 0 ? 4 : 0; g.fillStyle = '#8b8b8f'; g.fillRect(sp.x - 8, sp.y - 6 + sq, 16, 6 - sq); g.fillStyle = '#d8322b'; g.fillRect(sp.x - 9, sp.y - 10 + sq, 18, 4); g.fillStyle = '#ff8a7a'; g.fillRect(sp.x - 9, sp.y - 10 + sq, 18, 1); });
      L.checks.forEach(function (ck) { g.fillStyle = '#5a5a60'; g.fillRect(ck.x - 2, ck.y - 30, 4, 30); g.fillStyle = ck.hit ? '#7dff8a' : '#d8322b'; g.fillRect(ck.x - 6, ck.y - 40, 12, 10); g.fillStyle = '#fff'; g.fillRect(ck.x - 3, ck.y - 37, 3, 3); });
      g.fillStyle = '#6b4f2c'; g.fillRect(L.goalX - 3, L.h[Math.floor(L.goalX / TS)] - 34, 6, 34); g.drawImage(tex.blocks[T.PLANKS].top, 0, 0, 16, 16, L.goalX - 16, L.h[Math.floor(L.goalX / TS)] - 46, 32, 16); PCTex.drawText(g, 'GOAL', L.goalX - 12, L.h[Math.floor(L.goalX / TS)] - 42, 1, '#1b1822');
      // emeralds
      var bob = Math.sin(S.time * 6) * 1.5;
      S.emeralds.forEach(function (e) { if (e.got || e.x < cam.x - 10 || e.x > cam.x + VW + 10) return; drawEmerald(g, e.x, e.y + bob); });
      S.lost.forEach(function (e) { if (Math.floor(e.t * 10) % 2 === 0 || e.t < 2) drawEmerald(g, e.x, e.y); });
      // enemies
      S.enemies.forEach(function (en) { if (en.dead || en.x < cam.x - 20 || en.x > cam.x + VW + 20) return; var fr = Math.floor(en.anim) % 2; g.drawImage(tex.mons[en.kind][fr], Math.round(en.x - 8), Math.round(en.y - 8), 16, 16); PCTex.drawEyes(g, Math.round(en.x - 8), Math.round(en.y - 8), 1, en.dir > 0 ? 3 : 1, false); });
      // the wolf, then Zip
      ctx.pet.draw(g, ctx.pet.x, ctx.pet.y + 8, 16);
      // Zip
      var blink = (p.hurt > 0 || S.safeT > 0) && Math.floor(S.time * 14) % 2 === 0;
      if (!blink) {
        if (p.spin || p.loop || p.charge > 0) {
          var bf = Math.floor(p.anim) % 4, sc = 1 + p.charge * 0.15;
          g.save(); g.translate(Math.round(p.x), Math.round(p.y)); if (p.face < 0) g.scale(-1, 1);
          g.drawImage(zip.ball[bf], -8 * sc, -8 * sc, 16 * sc, 16 * sc); g.restore();
        } else if (p.dead > 0) {
          g.save(); g.translate(Math.round(p.x), Math.round(p.y)); g.rotate(p.dead * 6); g.drawImage(zip.jump, -12, -8, 24, 16); g.restore();
        } else {
          var set = p.face > 0 ? zip.run : zip.runL, fr2 = !p.ground ? null : (Math.abs(p.vx) < 15 ? 0 : 1 + Math.floor(p.anim) % 4);
          var spr = fr2 === null ? (p.face > 0 ? zip.jump : zip.jumpL) : set[fr2];
          g.drawImage(spr, Math.round(p.x - 12), Math.round(p.y - 8), 24, 16);
        }
      }
      // particles & popups
      S.parts.forEach(function (q) { g.globalAlpha = 1 - q.t / q.life; g.fillStyle = q.col; g.fillRect(q.x, q.y, q.s, q.s); }); g.globalAlpha = 1;
      S.pops.forEach(function (q) { g.globalAlpha = 1 - q.t; PCTex.drawText(g, q.text, q.x - PCTex.textWidth(q.text, 1) / 2, q.y - q.t * 24, 1, q.col, '#000'); }); g.globalAlpha = 1;
      g.restore();
      // HUD
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, W, 22);
      drawEmerald(g, 12, 11); PCTex.drawText(g, String(p.count), 22, 5, 2, p.count === 0 && Math.floor(S.time * 4) % 2 ? '#ff7a6a' : '#fff', '#000');
      for (var i = 0; i < S.lives; i++) g.drawImage(tex.heart[1], 70 + i * 15, 6, 12, 11);
      var tstr = Math.floor(S.zoneT / 60) + ':' + ('0' + Math.floor(S.zoneT % 60)).slice(-2);
      PCTex.drawText(g, tstr, W / 2 - 14, 5, 2, '#fff', '#000');
      PCTex.drawText(g, 'ZONE ' + S.zoneNum, W - 74, 5, 2, '#ffe680', '#000');
      var spd = Math.round(Math.abs(p.vx) / 4); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(6, H - 12, 60, 6); g.fillStyle = spd > 90 ? '#ff8a1f' : '#5ef0a8'; g.fillRect(6, H - 12, Math.min(60, spd * 0.5), 6);
      if (p.charge > 0) { g.fillStyle = '#ffe680'; g.fillRect((p.x - cam.x - 12) * ZOOM, (p.y - cam.y - 20) * ZOOM, 36 * p.charge, 4); }
      if (S.msg) { var s = 3, tw = PCTex.textWidth(S.msg.text, s); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(W / 2 - tw / 2 - 12, 100, tw + 24, S.msg.sub ? 52 : 36); PCTex.drawText(g, S.msg.text, W / 2 - tw / 2, 110, s, '#ffe680', '#000'); if (S.msg.sub) PCTex.drawText(g, S.msg.sub, W / 2 - PCTex.textWidth(S.msg.sub, 2) / 2, 134, 2, '#fff', '#000'); }
    }
    function drawEmerald(g, x, y) { g.fillStyle = '#1d6b4a'; g.fillRect(x - 3, y - 2, 6, 6); g.fillStyle = '#5ef0a8'; g.fillRect(x - 3, y - 3, 6, 5); g.fillStyle = '#d6ffe9'; g.fillRect(x - 3, y - 3, 2, 2); }
    function input(e) { }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S };
  }

  return {
    id: 'dash', name: 'Cheetah Dash', blurb: 'Zip the cheetah tears through loops and hills. Grab emeralds, stomp monsters.',
    view: { w: W, h: H }, music: 'meadow',
    controls: { dpad: 'lr', a: 'JUMP', b: 'SPIN' },
    thumb: function (g, w, h, tex) {
      var T2 = window.PCWorld.TILE, z = zipSprites();
      var sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#5cb4f2'); sky.addColorStop(1, '#c8ecff'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      for (var x = 0; x < w; x += 8) { var hy = 32 - Math.round(Math.sin(x / w * Math.PI) * 10); g.drawImage(tex.blocks[T2.GRASS].top, 0, 0, 16, 16, x, hy, 8, 8); g.drawImage(tex.blocks[T2.DIRT].top, 0, 0, 16, 16, x, hy + 8, 8, 16); }
      g.strokeStyle = '#8e8e90'; g.lineWidth = 3; g.beginPath(); g.arc(48, 24, 9, 0, Math.PI * 2); g.stroke();
      g.drawImage(z.run[2], 8, 12, 24, 16);
      [[36, 10], [42, 8], [48, 9]].forEach(function (q) { g.fillStyle = '#5ef0a8'; g.fillRect(q[0], q[1], 3, 3); });
    },
    create: create
  };
})());
