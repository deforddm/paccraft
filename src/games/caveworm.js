/* Cave Worm — Centipede in a mossy cave. A long cave worm winds down through the blocks;
 * every segment you shoot turns into a new block and splits the worm. Blast mossy ore blocks
 * for ore, and look out for the jumping cave spider in your zone. */
PCCab.register((function () {
  'use strict';
  var CS = 16, COLS = 20, ROWS = 28, OY = 24, W = COLS * CS, H = OY + ROWS * CS, ZONE = 22, HP = 4;

  function create(ctx) {
    var tex = ctx.tex, Wd = window.PCWorld, T = Wd.TILE, hero = PCTex.hero(ctx.look), K = PCCab.kit();
    var S = {}, bg = null;
    function idx(x, y) { return y * COLS + x; }
    function addScore(n) { S.score += n; ctx.score(S.score); }
    function cxp(x) { return x * CS + CS / 2; }
    function cyp(y) { return OY + y * CS + CS / 2; }

    function reset() {
      S.wave = 1; S.lives = 3; S.score = 0; S.time = 0; S.msg = null;
      S.hp = new Uint8Array(COLS * ROWS); S.ore = {};
      var r = Wd.rng(4242);
      for (var i = 0; i < 38; i++) { var x = Math.floor(r() * COLS), y = 1 + Math.floor(r() * (ZONE - 1)); S.hp[idx(x, y)] = HP; if (r() < 0.16) S.ore[idx(x, y)] = pickOre(); }
      newWave(); spawnHero();
      S.hintT = 1.8;
    }
    function pickOre() { return ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'][Math.min(6, Math.floor(Math.random() * (2.5 + S.wave * 0.6)))]; }
    function newWave(count) {
      var n = count || Math.min(18, 9 + S.wave);
      S.segs = [];
      for (var i = 0; i < n; i++) S.segs.push({ x: n - 1 - i, y: 0, px: n - 1 - i, py: 0, dir: 1, vdir: 1, head: i === 0 });
      S.stepGap = Math.max(0.045, 0.1 - S.wave * 0.006); S.stepT = 0;
      if (!count) { S.msg = { text: 'WAVE ' + S.wave, t: 1.5 }; ctx.A.play('ready'); }
    }
    function spawnHero() { S.p = { x: W / 2, y: cyp(ROWS - 2), dead: 0, anim: 0 }; S.shot = null; S.spider = null; S.spiderT = 5; S.safeT = 1.5; ctx.pet.reset(S.p.x - 20, S.p.y, 3); }

    function blocked(x, y) { return x < 0 || x >= COLS || (y >= 0 && y < ROWS && S.hp[idx(x, y)] > 0); }
    function stepWorm() {
      S.segs.forEach(function (s) {
        s.px = s.x; s.py = s.y;
        var nx = s.x + s.dir;
        if (blocked(nx, s.y)) {
          var ny = s.y + s.vdir;
          if (ny >= ROWS) { s.vdir = -1; ny = s.y - 1; }
          else if (ny < ZONE && s.vdir < 0) { s.vdir = 1; ny = s.y + 1; }
          s.y = ny; s.dir = -s.dir;
        } else s.x = nx;
      });
    }
    function killSeg(i) {
      var s = S.segs[i], pts = s.head ? 100 : 10;
      addScore(pts); K.pop(cxp(s.x), cyp(s.y) - 8, pts, s.head ? '#7df9ff' : '#fff'); K.burst(cxp(s.x), cyp(s.y), '#e36b9a', 8); ctx.fx('bonk');
      if (s.y >= 0 && s.y < ROWS && s.x >= 0 && s.x < COLS && s.y < ROWS - 1) { S.hp[idx(s.x, s.y)] = HP; if (Math.random() < 0.08) S.ore[idx(s.x, s.y)] = pickOre(); }
      if (S.segs[i + 1]) S.segs[i + 1].head = true;
      S.segs.splice(i, 1);
      if (!S.segs.length) {
        addScore(500 * S.wave); ctx.addOre('coal', 1 + Math.floor(S.wave / 3)); ctx.fx('clear'); ctx.buzz(30); ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop();
        S.wave++; newWave();
      }
    }
    function hitBlock(x, y) {
      var i = idx(x, y); S.hp[i]--; ctx.fx('hit', { tile: T.STONE }); K.burst(cxp(x), cyp(y), '#6a8a5a', 3, 80);
      if (S.hp[i] <= 0) {
        addScore(5);
        if (S.ore[i]) { var k = S.ore[i]; delete S.ore[i]; ctx.addOre(k, 1); addScore(100); K.pop(cxp(x), cyp(y) - 10, '+1 ' + k.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: k }); ctx.buzz(15); ctx.pet.bark(); }
      }
    }
    function fire() { var p = S.p; if (S.shot || p.dead > 0) return; S.shot = { x: p.x, y: p.y - 12 }; ctx.fx('shoot'); }
    function die() {
      var p = S.p; if (p.dead > 0 || S.safeT > 0) return;
      p.dead = 1.5; S.lives--; ctx.fx('death'); ctx.buzz([60, 40, 80]); K.burst(p.x, p.y, '#ffb37a', 16);
    }

    function update(dt) {
      S.time += dt; K.tick(dt);
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.hintT > 0) { S.hintT -= dt; if (S.hintT <= 0) S.msg = { text: 'SHOOT THE WORM!', t: 2.2 }; }
      if (S.safeT > 0) S.safeT -= dt;
      var p = S.p;
      if (p.dead > 0) {
        p.dead -= dt; ctx.pet.sit(dt);
        if (p.dead <= 0) {
          if (S.lives <= 0) { ctx.over({ lines: [['Wave reached', S.wave]] }); return; }
          var left = S.segs.length; newWave(left); spawnHero(); S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 };
        }
        return;
      }
      // hero movement (analog joystick, keys, or relative drag)
      var mx = 0, my = 0, SP = 190;
      if (ctx.held.dir >= 0) { mx = ctx.held.dx * SP * dt; my = ctx.held.dy * SP * dt; p.anim += dt * 8; }
      if (S.drag) { mx += S.drag.dx; my += S.drag.dy; S.drag.dx = S.drag.dy = 0; if (mx || my) p.anim += dt * 8; }
      var nx = Math.max(8, Math.min(W - 8, p.x + mx)), ny = Math.max(OY + ZONE * CS + 8, Math.min(H - 8, p.y + my));
      if (!blocked(Math.floor(nx / CS), Math.floor((p.y - OY) / CS))) p.x = nx;
      if (!blocked(Math.floor(p.x / CS), Math.floor((ny - OY) / CS))) p.y = ny;
      if (ctx.held.a || S.drag) fire();
      ctx.pet.follow(p.x, p.y, dt, { dist: 24, snap: 200, speed: 200 });
      // shot
      if (S.shot) {
        var steps = 4;
        for (var k = 0; k < steps && S.shot; k++) {
          S.shot.y -= 760 * dt / steps;
          var sx = Math.floor(S.shot.x / CS), sy = Math.floor((S.shot.y - OY) / CS);
          if (S.shot.y < OY) { S.shot = null; break; }
          if (sy >= 0 && S.hp[idx(sx, sy)] > 0) { hitBlock(sx, sy); S.shot = null; break; }
          for (var i = 0; i < S.segs.length; i++) { var s = S.segs[i]; if (s.x === sx && s.y === sy) { killSeg(i); S.shot = null; break; } }
          if (S.shot && S.spider && Math.abs(S.spider.x - S.shot.x) < 10 && Math.abs(S.spider.y - S.shot.y) < 9) {
            var d = Math.abs(S.spider.y - p.y), pts = d < 40 ? 900 : d < 80 ? 600 : 300;
            addScore(pts); K.pop(S.spider.x, S.spider.y - 10, pts, '#7df9ff'); K.burst(S.spider.x, S.spider.y, '#333', 12); ctx.fx('boom'); S.spider = null; S.spiderT = 5 + Math.random() * 4; S.shot = null;
          }
        }
      }
      // worm
      S.stepT += dt;
      while (S.stepT >= S.stepGap) { S.stepT -= S.stepGap; stepWorm(); }
      var f = S.stepT / S.stepGap;
      S.segs.forEach(function (s) { var X = cxp(s.px + (s.x - s.px) * f), Y = cyp(s.py + (s.y - s.py) * f); if (Math.abs(X - p.x) < 12 && Math.abs(Y - p.y) < 12) die(); });
      // spider
      if (!S.spider) { S.spiderT -= dt; if (S.spiderT <= 0) { var fromL = Math.random() < 0.5; S.spider = { x: fromL ? -10 : W + 10, y: OY + (ZONE + 2) * CS, vx: (fromL ? 1 : -1) * (55 + S.wave * 4), vy: 90, anim: 0 }; } }
      else {
        var sp = S.spider; sp.anim += dt * 10; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
        if (sp.y < OY + (ZONE - 2) * CS) { sp.y = OY + (ZONE - 2) * CS; sp.vy = Math.abs(sp.vy); }
        if (sp.y > H - 10) { sp.y = H - 10; sp.vy = -Math.abs(sp.vy); }
        if (Math.random() < dt * 1.2) sp.vy = -sp.vy;
        var bx = Math.floor(sp.x / CS), by = Math.floor((sp.y - OY) / CS);
        if (bx >= 0 && bx < COLS && by >= 0 && by < ROWS && S.hp[idx(bx, by)] > 0 && Math.random() < dt * 3) { S.hp[idx(bx, by)] = 0; delete S.ore[idx(bx, by)]; }
        if (sp.x < -20 || sp.x > W + 20) { S.spider = null; S.spiderT = 5 + Math.random() * 5; }
        else if (Math.abs(sp.x - p.x) < 12 && Math.abs(sp.y - p.y) < 12) die();
      }
    }

    function drawBg(g) {
      if (!bg) {
        bg = document.createElement('canvas'); bg.width = W; bg.height = H; var b = bg.getContext('2d'); b.imageSmoothingEnabled = false;
        for (var y = 0; y < H; y += 16) for (var x = 0; x < W; x += 16) b.drawImage(tex.floors.caves[((x + y) / 16) % 3], 0, 0, 16, 16, x, y, 16, 16);
        b.fillStyle = 'rgba(6,4,12,0.55)'; b.fillRect(0, 0, W, H);
        b.fillStyle = 'rgba(94,240,168,0.06)'; b.fillRect(0, OY + ZONE * CS, W, H - OY - ZONE * CS);
        b.fillStyle = 'rgba(94,240,168,0.25)'; for (var x2 = 0; x2 < W; x2 += 8) b.fillRect(x2, OY + ZONE * CS, 4, 1);
      }
      g.drawImage(bg, 0, 0);
    }
    function draw(g) {
      drawBg(g);
      // blocks
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
        var hp = S.hp[idx(x, y)]; if (!hp) continue;
        var X = x * CS, Y = OY + y * CS, o = S.ore[idx(x, y)];
        g.drawImage(tex.blocks[o ? T[o.toUpperCase()] : T.MOSS].top, 0, 0, 16, 16, X + 1, Y + 1, CS - 2, CS - 2);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X + 1, Y + CS - 3, CS - 2, 2);
        if (hp < HP) g.drawImage(tex.cracks[Math.min(4, (HP - hp) + 1)], 0, 0, 16, 16, X + 1, Y + 1, CS - 2, CS - 2);
      }
      // worm
      var f = Math.min(1, S.stepT / S.stepGap);
      for (var i = S.segs.length - 1; i >= 0; i--) {
        var s = S.segs[i], X2 = Math.round(cxp(s.px + (s.x - s.px) * f)), Y2 = Math.round(cyp(s.py + (s.y - s.py) * f)), bob = Math.sin(S.time * 14 + i) * 1;
        g.fillStyle = s.head ? '#d84b7a' : (i % 2 ? '#e87aa0' : '#d9678f'); g.fillRect(X2 - 7, Y2 - 7 + bob, 14, 14);
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(X2 - 7, Y2 - 7 + bob, 14, 3);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X2 - 7, Y2 + 5 + bob, 14, 2);
        if (s.head) { var ex = s.dir * 2; g.fillStyle = '#fff'; g.fillRect(X2 - 5 + ex, Y2 - 4, 4, 4); g.fillRect(X2 + 1 + ex, Y2 - 4, 4, 4); g.fillStyle = '#1b1822'; g.fillRect(X2 - 4 + ex + s.dir, Y2 - 3, 2, 2); g.fillRect(X2 + 2 + ex + s.dir, Y2 - 3, 2, 2); g.fillStyle = '#ffd23d'; g.fillRect(X2 - 7 + (s.dir > 0 ? 12 : 0), Y2 - 9, 2, 3); }
      }
      // spider
      if (S.spider) {
        var sp = S.spider, lg = Math.floor(sp.anim) % 2 ? 2 : -2;
        g.fillStyle = '#1b1822'; for (var l = -1; l <= 1; l += 2) { g.fillRect(sp.x - 13, sp.y + l * 3 + lg, 7, 2); g.fillRect(sp.x + 6, sp.y + l * 3 - lg, 7, 2); }
        g.drawImage(tex.mons.sly[0], sp.x - 8, sp.y - 8, 16, 16); PCTex.drawEyes(g, sp.x - 8, sp.y - 8, 1, sp.vx > 0 ? 3 : 1, false);
      }
      // shot
      if (S.shot) { g.fillStyle = '#c9a15a'; g.fillRect(S.shot.x - 1, S.shot.y, 2, 10); g.fillStyle = '#e8e8ee'; g.fillRect(S.shot.x - 2, S.shot.y - 2, 4, 3); }
      // wolf + hero
      ctx.pet.draw(g, ctx.pet.x, ctx.pet.y + 8, 16);
      var p = S.p;
      if (p.dead > 0) { g.save(); g.translate(p.x, p.y); g.rotate((1.5 - p.dead) * 8); var sc = Math.max(0, p.dead / 1.5); g.scale(sc, sc); g.drawImage(hero.up[0], -9, -9, 18, 18); g.restore(); }
      else if (!(S.safeT > 0 && Math.floor(S.time * 10) % 2)) { g.drawImage(hero.up[Math.floor(p.anim) % 3 === 0 ? 0 : 1 + Math.floor(p.anim) % 2], Math.round(p.x - 9), Math.round(p.y - 10), 18, 18); g.fillStyle = '#6b4f2c'; g.fillRect(p.x - 6, p.y - 14, 12, 2); }
      K.draw(g);
      // hud
      g.fillStyle = '#120e18'; g.fillRect(0, 0, W, OY);
      K.hearts(g, tex, S.lives, 6, 5);
      PCTex.drawText(g, 'WAVE ' + S.wave, W - 74, 6, 2, '#ffe680', '#000');
      PCTex.drawText(g, 'WORM ' + S.segs.length, 110, 6, 2, '#e87aa0', '#000');
      K.banner(g, W, H, S.msg);
    }
    function input(e) {
      if (e.type === 'a' && e.down) fire();
      else if (e.type === 'touch') {
        if (e.phase === 'down') { S.drag = { lx: e.x, ly: e.y, dx: 0, dy: 0 }; fire(); }
        else if (e.phase === 'move' && S.drag) { S.drag.dx += (e.x - S.drag.lx) * 1.3; S.drag.dy += (e.y - S.drag.ly) * 1.3; S.drag.lx = e.x; S.drag.ly = e.y; }
        else if (e.phase === 'up') S.drag = null;
      }
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { killSeg: killSeg, stepWorm: stepWorm, fire: fire } };
  }

  return {
    id: 'caveworm', name: 'Cave Worm', blurb: 'A long cave worm winds down through the blocks. Shoot it apart before it reaches you.',
    view: { w: W, h: H }, music: 'caves',
    controls: { dpad: true, a: 'SHOOT', b: null },
    thumb: function (g, w, h, tex, look) {
      var T2 = window.PCWorld.TILE;
      g.fillStyle = '#15121c'; g.fillRect(0, 0, w, h);
      [[6, 8], [40, 6], [22, 20], [52, 24], [10, 30], [34, 32]].forEach(function (q, i) { g.drawImage(tex.blocks[i === 3 ? T2.GOLD : T2.MOSS].top, 0, 0, 16, 16, q[0], q[1], 7, 7); });
      for (var i = 0; i < 6; i++) { g.fillStyle = i === 0 ? '#d84b7a' : '#e87aa0'; g.fillRect(44 - i * 6, 14, 6, 6); }
      g.fillStyle = '#fff'; g.fillRect(46, 15, 2, 2);
      g.drawImage(PCTex.hero(look || PCTex.LOOK_DEFAULT).up[0], 28, 36, 10, 10); g.fillStyle = '#e8e8ee'; g.fillRect(32, 26, 1, 6);
    },
    create: create
  };
})());
