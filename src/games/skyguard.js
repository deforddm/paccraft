/* Sky Guard — Missile Command. Fireballs rain on the village; tap the sky to launch firework
 * rockets from the three towers and burst them in mid-air. Grey ore meteors drop ore when
 * you pop them. Keep at least one house standing. */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 440, GROUND = 400, LAUNCH_Y = 380;
  var TOWERS = [20, 160, 300], HOUSES = [52, 88, 124, 196, 232, 268];

  function create(ctx) {
    var tex = ctx.tex, T = window.PCWorld.TILE, hero = PCTex.hero(ctx.look), K = PCCab.kit();
    var S = {}, bg = null;
    function addScore(n) { S.score += n; ctx.score(S.score); }
    function reset() {
      S.wave = 1; S.score = 0; S.time = 0; S.msg = null;
      S.houses = HOUSES.map(function (x) { return { x: x, alive: true }; });
      S.cross = { x: W / 2, y: 200 };
      newWave();
    }
    function newWave() {
      S.towers = TOWERS.map(function (x) { return { x: x, ammo: 10, alive: true }; });
      S.rockets = []; S.booms = []; S.fire = []; S.toSpawn = 10 + S.wave * 2; S.spawnT = 1.4; S.endT = 0; K.clear();
      S.msg = { text: 'WAVE ' + S.wave, sub: S.wave === 1 ? 'TAP THE SKY TO FIRE' : null, t: 2 }; ctx.A.play('ready');
      ctx.pet.reset(TOWERS[1] - 16, GROUND, 3);
    }
    function launch(x, y) {
      if (S.endT > 0) return;
      y = Math.min(y, LAUNCH_Y - 20);
      var best = null, bd = 1e9;
      S.towers.forEach(function (t) { if (t.alive && t.ammo > 0 && Math.abs(t.x - x) < bd) { bd = Math.abs(t.x - x); best = t; } });
      if (!best) { ctx.fx('nope'); return; }
      best.ammo--; S.lastTower = best.x;
      var sp = best.x === TOWERS[1] ? 520 : 400, d = Math.hypot(x - best.x, y - LAUNCH_Y);
      S.rockets.push({ x0: best.x, y0: LAUNCH_Y, x: best.x, y: LAUNCH_Y, tx: x, ty: y, t: 0, dur: d / sp });
      ctx.fx('shoot');
    }
    function boom(x, y, max, chain) {
      S.booms.push({ x: x, y: y, r: 0, t: 0, max: max || 28, hue: Math.floor(Math.random() * 4) });
      ctx.fx(chain ? 'bonk' : 'boom');
    }
    function spawnFire(from) {
      var targets = S.houses.filter(function (h) { return h.alive; }).map(function (h) { return h.x; }).concat(S.towers.filter(function (t) { return t.alive; }).map(function (t) { return t.x; }));
      if (!targets.length) return;
      var tx = targets[Math.floor(Math.random() * targets.length)] + (Math.random() - 0.5) * 8;
      var ore = !from && Math.random() < 0.16, x0 = from ? from.x : 10 + Math.random() * (W - 20), y0 = from ? from.y : 26;
      var sp = (22 + S.wave * 3.5) * (ore ? 0.8 : 1) * (0.85 + Math.random() * 0.3);
      S.fire.push({ x0: x0, y0: y0, x: x0, y: y0, tx: tx, ty: GROUND, sp: sp, ore: ore ? ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'][Math.min(6, Math.floor(Math.random() * (2.5 + S.wave * 0.6)))] : null, split: !from && !ore && S.wave >= 2 && Math.random() < 0.18 + S.wave * 0.02 ? 140 + Math.random() * 120 : 0 });
    }
    function update(dt) {
      S.time += dt; K.tick(dt);
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      // crosshair via keys / joystick
      if (ctx.held.dir >= 0) { S.cross.x = Math.max(6, Math.min(W - 6, S.cross.x + ctx.held.dx * 220 * dt)); S.cross.y = Math.max(30, Math.min(LAUNCH_Y - 20, S.cross.y + ctx.held.dy * 220 * dt)); }
      ctx.pet.follow(S.lastTower != null ? S.lastTower - 16 : TOWERS[1] - 16, GROUND, dt, { dist: 4, lockY: GROUND, snap: 999, speed: 150 });
      // spawn
      if (S.toSpawn > 0) { S.spawnT -= dt; if (S.spawnT <= 0) { S.spawnT = Math.max(0.45, 1.5 - S.wave * 0.08) * (0.6 + Math.random() * 0.8); S.toSpawn--; spawnFire(); if (S.wave >= 3 && Math.random() < 0.3 && S.toSpawn > 0) { S.toSpawn--; spawnFire(); } } }
      // rockets
      S.rockets = S.rockets.filter(function (r) { r.t += dt; var f = Math.min(1, r.t / r.dur); r.x = r.x0 + (r.tx - r.x0) * f; r.y = r.y0 + (r.ty - r.y0) * f; if (f >= 1) { boom(r.tx, r.ty); return false; } return true; });
      // explosions
      S.booms = S.booms.filter(function (b) { b.t += dt; b.r = b.t < 0.35 ? b.max * b.t / 0.35 : b.t < 0.65 ? b.max : b.max * Math.max(0, 1 - (b.t - 0.65) / 0.35); return b.t < 1; });
      // fireballs
      S.fire = S.fire.filter(function (f) {
        var d = Math.hypot(f.tx - f.x0, f.ty - f.y0); f.x += (f.tx - f.x0) / d * f.sp * dt; f.y += (f.ty - f.y0) / d * f.sp * dt;
        for (var i = 0; i < S.booms.length; i++) { var b = S.booms[i]; if (Math.hypot(b.x - f.x, b.y - f.y) < b.r + 3) {
          var pts = f.ore ? 50 : 25; addScore(pts * S.wave); boom(f.x, f.y, 20, true); K.pop(f.x, f.y - 10, pts * S.wave, '#fff');
          if (f.ore) { ctx.addOre(f.ore, 1); K.pop(f.x, f.y - 22, '+1 ' + f.ore.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: f.ore }); ctx.buzz(15); ctx.pet.bark(); }
          return false; } }
        if (f.split && f.y > f.split) { for (var k = 0; k < 2; k++) spawnFire({ x: f.x, y: f.y }); f.split = 0; }
        if (f.y >= GROUND - 2) {
          K.burst(f.x, GROUND - 4, '#ff6a1f', 12); ctx.fx('death'); ctx.buzz([40, 30, 40]);
          S.houses.forEach(function (h) { if (h.alive && Math.abs(h.x - f.x) < 14) { h.alive = false; K.burst(h.x, GROUND - 10, '#b98a4a', 16); } });
          S.towers.forEach(function (t) { if (t.alive && Math.abs(t.x - f.x) < 12) { t.alive = false; t.ammo = 0; } });
          if (!S.houses.some(function (h) { return h.alive; })) ctx.over({ win: false, title: 'Village Lost', lines: [['Wave reached', S.wave]] });
          return false;
        }
        return true;
      });
      // wave end
      if (S.endT > 0) { S.endT -= dt; if (S.endT <= 0) { S.wave++; newWave(); } return; }
      if (S.toSpawn <= 0 && !S.fire.length && !S.rockets.length && !S.booms.length) {
        var ammo = S.towers.reduce(function (a, t) { return a + t.ammo; }, 0), hs = S.houses.filter(function (h) { return h.alive; }).length;
        var bonus = ammo * 5 * S.wave + hs * 100 * S.wave; addScore(bonus);
        S.msg = { text: 'WAVE CLEAR', sub: 'BONUS ' + bonus, t: 2.4 }; S.endT = 2.6;
        ctx.addOre('coal', 1 + Math.floor(S.wave / 3)); ctx.fx('clear'); ctx.buzz(30); ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop();
        var lost = S.houses.filter(function (h) { return !h.alive; }); if (lost.length) { lost[0].alive = true; K.pop(lost[0].x, GROUND - 30, 'REBUILT!', '#7dff8a'); }
      }
    }

    function drawBg(g) {
      if (!bg) {
        bg = document.createElement('canvas'); bg.width = W; bg.height = H; var b = bg.getContext('2d'); b.imageSmoothingEnabled = false;
        var gr = b.createLinearGradient(0, 0, 0, GROUND); gr.addColorStop(0, '#060818'); gr.addColorStop(0.7, '#1b1440'); gr.addColorStop(1, '#4a2a3a'); b.fillStyle = gr; b.fillRect(0, 0, W, GROUND);
        var r = window.PCWorld.rng(9); for (var i = 0; i < 70; i++) { b.fillStyle = r() < 0.25 ? '#fff' : '#8f96d8'; b.fillRect(Math.floor(r() * W), Math.floor(r() * (GROUND - 80)), 1, 1); }
        b.fillStyle = '#d9d9e6'; b.fillRect(40, 50, 14, 14); b.fillStyle = '#f2f2fa'; b.fillRect(42, 52, 8, 8);
        for (var x = 0; x < W; x += 16) { b.drawImage(tex.blocks[T.GRASS].top, 0, 0, 16, 16, x, GROUND, 16, 16); b.drawImage(tex.blocks[T.DIRT].top, 0, 0, 16, 16, x, GROUND + 16, 16, 16); b.drawImage(tex.blocks[T.DIRT].top, 0, 0, 16, 16, x, GROUND + 32, 16, 16); }
      }
      g.drawImage(bg, 0, 0);
    }
    function drawHouse(g, x) {
      g.drawImage(tex.blocks[T.PLANKS].top, 0, 0, 16, 16, x - 10, GROUND - 14, 20, 14);
      g.fillStyle = '#8a2a22'; g.fillRect(x - 12, GROUND - 18, 24, 4); g.fillRect(x - 9, GROUND - 22, 18, 4); g.fillRect(x - 5, GROUND - 25, 10, 3);
      g.fillStyle = '#4a3020'; g.fillRect(x - 2, GROUND - 8, 5, 8); g.fillStyle = '#ffd23d'; g.fillRect(x + 5, GROUND - 11, 3, 3); g.fillRect(x - 8, GROUND - 11, 3, 3);
    }
    function draw(g) {
      drawBg(g);
      // houses & towers
      S.houses.forEach(function (h) { if (h.alive) drawHouse(g, h.x); else { g.fillStyle = '#3a2a22'; g.fillRect(h.x - 10, GROUND - 4, 20, 4); g.fillStyle = '#555'; g.fillRect(h.x - 6, GROUND - 7, 5, 3); } });
      S.towers.forEach(function (t) {
        if (!t.alive) { g.fillStyle = '#444'; g.fillRect(t.x - 8, GROUND - 6, 16, 6); return; }
        g.drawImage(tex.blocks[T.COBBLE].top, 0, 0, 16, 16, t.x - 8, GROUND - 22, 16, 22); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(t.x + 5, GROUND - 22, 3, 22);
        for (var i = 0; i < t.ammo; i++) { g.fillStyle = '#e36bff'; g.fillRect(t.x - 9 + (i % 5) * 4, GROUND + 4 + Math.floor(i / 5) * 5, 2, 4); }
      });
      g.drawImage(hero.up[0], TOWERS[1] + 12, GROUND - 18, 18, 18);
      ctx.pet.draw(g, ctx.pet.x, GROUND, 18);
      // fireball trails
      S.fire.forEach(function (f) {
        g.strokeStyle = f.ore ? 'rgba(200,200,210,0.5)' : 'rgba(255,120,40,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(f.x, f.y); g.stroke();
        if (f.ore) { g.drawImage(tex.blocks[T[f.ore.toUpperCase()]].top, 0, 0, 16, 16, f.x - 6, f.y - 6, 12, 12); }
        else { g.fillStyle = '#ff6a1f'; g.fillRect(f.x - 4, f.y - 4, 8, 8); g.fillStyle = '#ffd23d'; g.fillRect(f.x - 2, f.y - 2, 4, 4); }
      });
      // rockets
      S.rockets.forEach(function (r) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(r.x0, r.y0); g.lineTo(r.x, r.y); g.stroke(); g.fillStyle = '#e36bff'; g.fillRect(r.x - 2, r.y - 2, 4, 4); g.fillStyle = '#fff'; g.fillRect(r.tx - 3, r.ty, 7, 1); g.fillRect(r.tx, r.ty - 3, 1, 7); });
      // explosions (fireworks)
      var COLS2 = [['#ff6bd6', '#ffd1f2'], ['#7df9ff', '#e0fdff'], ['#ffe680', '#fff8d6'], ['#7dff8a', '#e2ffe6']];
      S.booms.forEach(function (b) {
        var c = COLS2[b.hue]; g.globalAlpha = 0.85; g.fillStyle = Math.floor(S.time * 20) % 2 ? c[0] : c[1];
        g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1; g.fillStyle = '#fff'; for (var k = 0; k < 8; k++) { var a = k / 8 * Math.PI * 2 + b.t * 3; g.fillRect(Math.round(b.x + Math.cos(a) * (b.r + 3)), Math.round(b.y + Math.sin(a) * (b.r + 3)), 2, 2); }
      });
      // crosshair
      var cx = Math.round(S.cross.x), cy = Math.round(S.cross.y);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(cx - 7, cy, 5, 1); g.fillRect(cx + 3, cy, 5, 1); g.fillRect(cx, cy - 7, 1, 5); g.fillRect(cx, cy + 3, 1, 5);
      K.draw(g);
      // hud
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, W, 22);
      var hs = S.houses.filter(function (h) { return h.alive; }).length;
      PCTex.drawText(g, 'HOUSES ' + hs, 6, 6, 1.5, '#fff', '#000');
      PCTex.drawText(g, 'WAVE ' + S.wave, W - 74, 5, 2, '#ffe680', '#000');
      K.banner(g, W, H, S.msg, 160);
    }
    function input(e) {
      if (e.type === 'touch' && e.phase === 'down') { S.cross.x = e.x; S.cross.y = Math.min(e.y, LAUNCH_Y - 20); launch(e.x, e.y); }
      else if (e.type === 'a' && e.down) launch(S.cross.x, S.cross.y);
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { launch: launch, spawnFire: spawnFire } };
  }

  return {
    id: 'skyguard', name: 'Sky Guard', blurb: 'Fireballs rain on the village. Tap the sky to burst them with fireworks.',
    view: { w: W, h: H }, music: 'desert',
    controls: { dpad: false, a: null, b: null },
    thumb: function (g, w, h, tex) {
      var T2 = window.PCWorld.TILE;
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#060818'); gr.addColorStop(1, '#4a2a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (var x = 0; x < w; x += 8) g.drawImage(tex.blocks[T2.GRASS].top, 0, 0, 16, 16, x, 42, 8, 6);
      [14, 28, 42, 54].forEach(function (x) { g.drawImage(tex.blocks[T2.PLANKS].top, 0, 0, 16, 16, x - 4, 36, 8, 6); g.fillStyle = '#8a2a22'; g.fillRect(x - 5, 34, 10, 2); });
      g.strokeStyle = 'rgba(255,120,40,0.7)'; g.beginPath(); g.moveTo(10, 0); g.lineTo(22, 22); g.moveTo(50, 0); g.lineTo(44, 16); g.stroke();
      g.fillStyle = '#ff6bd6'; g.beginPath(); g.arc(44, 16, 7, 0, 7); g.fill(); g.fillStyle = '#ff6a1f'; g.fillRect(20, 20, 4, 4);
    },
    create: create
  };
})());
