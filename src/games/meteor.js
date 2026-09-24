/* Meteor Miner — Asteroids with ore. Steer a little mining rocket through a field of tumbling
 * stone and ore blocks; shots split big blocks into smaller ones, and the last bits of an ore
 * meteor leave a glowing ore chunk to scoop up. Your wolf rides along in a space bubble. */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 440, TOP = 22, SIZES = [0, 13, 22, 34], PTS = [0, 100, 50, 20];

  function create(ctx) {
    var tex = ctx.tex, T = window.PCWorld.TILE, K = PCCab.kit();
    var S = {};
    function addScore(n) { S.score += n; ctx.score(S.score); }
    function wrap(o) { if (o.x < -20) o.x += W + 40; if (o.x > W + 20) o.x -= W + 40; if (o.y < TOP - 20) o.y += H - TOP + 40; if (o.y > H + 20) o.y -= H - TOP + 40; }
    function reset() { S.wave = 1; S.lives = 3; S.score = 0; S.time = 0; S.msg = null; S.chunks = []; newWave(); spawnShip(); S.hintT = 1.8; }
    function oreKind() { return ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'][Math.min(6, Math.floor(Math.random() * (2.5 + S.wave * 0.6)))]; }
    function newWave() {
      S.rocks = []; S.ufo = null; S.ufoT = 14 + Math.random() * 8; S.ubul = []; K.clear();
      var n = Math.min(8, 3 + S.wave);
      for (var i = 0; i < n; i++) {
        var edge = Math.random() < 0.5, x = edge ? (Math.random() < 0.5 ? 0 : W) : Math.random() * W, y = edge ? TOP + Math.random() * (H - TOP) : (Math.random() < 0.5 ? TOP : H);
        addRock(x, y, 3, Math.random() < 0.3 ? oreKind() : null);
      }
      S.msg = { text: 'WAVE ' + S.wave, t: 1.5 }; ctx.A.play('ready');
    }
    function addRock(x, y, size, ore) {
      var a = Math.random() * Math.PI * 2, sp = (18 + Math.random() * 30) * (4 - size) * 0.7 + S.wave * 3;
      S.rocks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: size, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 2, ore: ore, tile: ore ? T[ore.toUpperCase()] : (Math.random() < 0.5 ? T.STONE : T.COBBLE) });
    }
    function spawnShip() { S.ship = { x: W / 2, y: (H + TOP) / 2, vx: 0, vy: 0, a: -Math.PI / 2, dead: 0, thrust: false }; S.inv = 2.5; S.bullets = []; S.cool = 0; ctx.pet.reset(S.ship.x, S.ship.y + 20, 2); }
    function fire() {
      var s = S.ship; if (s.dead > 0 || S.cool > 0 || S.bullets.length >= 5) return;
      S.bullets.push({ x: s.x + Math.cos(s.a) * 10, y: s.y + Math.sin(s.a) * 10, vx: Math.cos(s.a) * 390 + s.vx * 0.5, vy: Math.sin(s.a) * 390 + s.vy * 0.5, t: 0.85 });
      S.cool = 0.16; ctx.fx('shoot');
    }
    function breakRock(r) {
      S.rocks.splice(S.rocks.indexOf(r), 1); addScore(PTS[r.size] * S.wave); K.pop(r.x, r.y - 10, PTS[r.size] * S.wave, '#fff');
      K.burst(r.x, r.y, (tex.blocks[r.tile] || {}).avg || '#999', 6 + r.size * 3); ctx.fx(r.size === 3 ? 'boom' : 'hit', { tile: T.STONE });
      if (r.size > 1) { addRock(r.x, r.y, r.size - 1, r.ore); addRock(r.x, r.y, r.size - 1, r.ore && Math.random() < 0.5 ? r.ore : null); }
      else if (r.ore) S.chunks.push({ x: r.x, y: r.y, vx: r.vx * 0.3, vy: r.vy * 0.3, kind: r.ore, t: 9 });
      if (!S.rocks.length) { addScore(500 * S.wave); ctx.addOre('coal', 1 + Math.floor(S.wave / 3)); ctx.fx('clear'); ctx.buzz(30); ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop(); S.wave++; newWave(); S.inv = Math.max(S.inv, 1.5); }
    }
    function crash() {
      var s = S.ship; if (s.dead > 0 || S.inv > 0) return;
      s.dead = 1.6; S.lives--; ctx.fx('death'); ctx.buzz([60, 40, 80]); K.burst(s.x, s.y, '#ff8a1f', 20, 220); K.burst(s.x, s.y, '#c9ccd4', 10, 160);
    }
    function update(dt) {
      S.time += dt; K.tick(dt);
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.hintT > 0) { S.hintT -= dt; if (S.hintT <= 0) S.msg = { text: 'STEER + SHOOT', t: 2 }; }
      if (S.inv > 0) S.inv -= dt; if (S.cool > 0) S.cool -= dt;
      var s = S.ship;
      if (s.dead > 0) {
        s.dead -= dt; ctx.pet.sit(dt);
        if (s.dead <= 0) { if (S.lives <= 0) { ctx.over({ lines: [['Wave reached', S.wave]] }); return; } spawnShip(); S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 }; }
      } else {
        s.thrust = false;
        if (ctx.held.dir >= 0) {
          var want = Math.atan2(ctx.held.dy, ctx.held.dx), d = want - s.a; d = Math.atan2(Math.sin(d), Math.cos(d));
          s.a += Math.max(-7 * dt, Math.min(7 * dt, d));
          if (Math.abs(d) < 1.3) { s.vx += Math.cos(s.a) * 230 * dt; s.vy += Math.sin(s.a) * 230 * dt; s.thrust = true; }
        }
        var sp = Math.hypot(s.vx, s.vy); if (sp > 230) { s.vx *= 230 / sp; s.vy *= 230 / sp; }
        s.vx *= 1 - 0.55 * dt; s.vy *= 1 - 0.55 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt; wrap(s);
        if (ctx.held.a || S.touchFire) fire();
        ctx.pet.follow(s.x, s.y, dt, { dist: 22, snap: 90, speed: 420 });
      }
      // bullets
      S.bullets = S.bullets.filter(function (b) {
        b.t -= dt; b.x += b.vx * dt; b.y += b.vy * dt; wrap(b); if (b.t <= 0) return false;
        for (var i = 0; i < S.rocks.length; i++) { var r = S.rocks[i]; if (Math.hypot(r.x - b.x, r.y - b.y) < SIZES[r.size] * 0.55) { breakRock(r); return false; } }
        if (S.ufo && Math.hypot(S.ufo.x - b.x, S.ufo.y - b.y) < 13) { addScore(500 * S.wave); K.pop(S.ufo.x, S.ufo.y - 12, 500 * S.wave, '#7df9ff'); K.burst(S.ufo.x, S.ufo.y, '#d8322b', 16); ctx.fx('boom'); S.chunks.push({ x: S.ufo.x, y: S.ufo.y, vx: 0, vy: 20, kind: 'gold', t: 9 }); S.ufo = null; S.ufoT = 15 + Math.random() * 10; return false; }
        return true;
      });
      // rocks
      S.rocks.forEach(function (r) { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; wrap(r); if (s.dead <= 0 && Math.hypot(r.x - s.x, r.y - s.y) < SIZES[r.size] * 0.48 + 6) crash(); });
      // ore chunks (magnet toward the ship)
      S.chunks = S.chunks.filter(function (c) {
        c.t -= dt; var dx = s.x - c.x, dy = s.y - c.y, d = Math.hypot(dx, dy);
        if (s.dead <= 0 && d < 60) { c.vx += dx / d * 300 * dt; c.vy += dy / d * 300 * dt; }
        c.x += c.vx * dt; c.y += c.vy * dt; wrap(c);
        if (s.dead <= 0 && d < 14) { ctx.addOre(c.kind, 1); addScore(150); K.pop(c.x, c.y - 12, '+1 ' + c.kind.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: c.kind }); ctx.buzz(15); ctx.pet.bark(); return false; }
        return c.t > 0;
      });
      // Rumble saucer
      if (!S.ufo) { if (S.wave >= 2) { S.ufoT -= dt; if (S.ufoT <= 0) { var fromL = Math.random() < 0.5; S.ufo = { x: fromL ? -16 : W + 16, y: TOP + 40 + Math.random() * (H - TOP - 80), vx: fromL ? 60 : -60, t: 0, shoot: 1.2 }; ctx.fx('foodspawn'); } } }
      else {
        var u = S.ufo; u.t += dt; u.x += u.vx * dt; u.y += Math.sin(u.t * 2) * 30 * dt;
        u.shoot -= dt; if (u.shoot <= 0 && s.dead <= 0) { u.shoot = 1.6; var a = Math.atan2(s.y - u.y, s.x - u.x) + (Math.random() - 0.5) * 0.4; S.ubul.push({ x: u.x, y: u.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, t: 2.2 }); ctx.fx('nope'); }
        if (u.x < -30 || u.x > W + 30) { S.ufo = null; S.ufoT = 15 + Math.random() * 10; }
        else if (s.dead <= 0 && Math.hypot(u.x - s.x, u.y - s.y) < 16) crash();
      }
      S.ubul = S.ubul.filter(function (b) { b.t -= dt; b.x += b.vx * dt; b.y += b.vy * dt; if (s.dead <= 0 && Math.hypot(b.x - s.x, b.y - s.y) < 8) { crash(); return false; } return b.t > 0; });
    }
    function drawShip(g, s) {
      g.save(); g.translate(Math.round(s.x), Math.round(s.y)); g.rotate(s.a);
      if (s.thrust && Math.floor(S.time * 20) % 2) { g.fillStyle = '#ff8a1f'; g.fillRect(-15, -3, 6, 6); g.fillStyle = '#ffd23d'; g.fillRect(-13, -2, 4, 4); }
      g.fillStyle = '#9a9aa6'; g.fillRect(-9, -5, 15, 10); g.fillStyle = '#c9ccd4'; g.fillRect(-9, -5, 15, 3);
      g.fillStyle = '#d8322b'; g.fillRect(6, -4, 4, 8); g.fillRect(10, -2, 2, 4); g.fillRect(-10, -9, 5, 4); g.fillRect(-10, 5, 5, 4);
      g.fillStyle = '#7df9ff'; g.fillRect(0, -2, 4, 4); g.fillStyle = '#fff'; g.fillRect(1, -2, 1, 1);
      g.restore();
    }
    function draw(g) {
      g.fillStyle = '#05060f'; g.fillRect(0, 0, W, H);
      for (var i = 0; i < 60; i++) { var x = (i * 131 + Math.floor(S.time * (i % 3 + 1) * 3)) % W, y = TOP + (i * 71) % (H - TOP); g.fillStyle = i % 5 ? '#6a70a8' : '#fff'; g.fillRect(x, y, 1, 1); }
      // chunks
      S.chunks.forEach(function (c) { if (c.t < 2 && Math.floor(S.time * 8) % 2) return; g.fillStyle = 'rgba(255,230,128,0.25)'; g.fillRect(c.x - 9, c.y - 9, 18, 18); g.drawImage(tex.ores[c.kind], c.x - 7, c.y - 7, 14, 14); });
      // rocks
      S.rocks.forEach(function (r) { var sz = SIZES[r.size]; g.save(); g.translate(Math.round(r.x), Math.round(r.y)); g.rotate(r.rot); g.drawImage(tex.blocks[r.tile].top, 0, 0, 16, 16, -sz / 2, -sz / 2, sz, sz); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-sz / 2, sz / 2 - 2, sz, 2); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-sz / 2, -sz / 2, sz, 2); g.restore(); });
      // ufo
      if (S.ufo) { var u = S.ufo; g.fillStyle = '#6a6a78'; g.fillRect(u.x - 14, u.y + 2, 28, 5); g.drawImage(tex.mons.rumble[Math.floor(S.time * 5) % 2], u.x - 9, u.y - 13, 18, 18); PCTex.drawEyes(g, u.x - 9, u.y - 13, 18 / 16, u.vx > 0 ? 3 : 1, false); g.fillStyle = '#ffd23d'; g.fillRect(u.x - 12 + (Math.floor(S.time * 8) % 4) * 7, u.y + 4, 3, 2); }
      S.ubul.forEach(function (b) { g.fillStyle = '#4fc96a'; g.fillRect(b.x - 3, b.y - 3, 6, 6); });
      // bullets
      S.bullets.forEach(function (b) { g.fillStyle = '#fff3a0'; g.fillRect(b.x - 2, b.y - 2, 4, 4); });
      // wolf in its space bubble, then the ship
      var s = S.ship;
      if (ctx.pet.on) { var wx = Math.round(ctx.pet.x), wy = Math.round(ctx.pet.y); ctx.pet.draw(g, wx, wy + 7, 14, ctx.pet.dir); g.strokeStyle = 'rgba(125,249,255,0.6)'; g.lineWidth = 1; g.beginPath(); g.arc(wx, wy, 10, 0, Math.PI * 2); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(wx - 5, wy - 7, 2, 2); }
      if (s.dead <= 0 && !(S.inv > 0 && Math.floor(S.time * 10) % 2)) drawShip(g, s);
      K.draw(g);
      // hud
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, W, TOP);
      K.hearts(g, tex, S.lives, 6, 4);
      PCTex.drawText(g, 'WAVE ' + S.wave, W - 74, 5, 2, '#ffe680', '#000');
      K.banner(g, W, H, S.msg);
    }
    function input(e) {
      if (e.type === 'a' && e.down) fire();
      else if (e.type === 'touch') { S.touchFire = e.phase !== 'up'; if (e.phase === 'down') fire(); }
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { breakRock: breakRock, fire: fire } };
  }

  return {
    id: 'meteor', name: 'Meteor Miner', blurb: 'Fly a mining rocket through tumbling ore meteors. Blast them apart and scoop the ore.',
    view: { w: W, h: H }, music: 'crystal',
    controls: { dpad: true, a: 'SHOOT', b: null },
    thumb: function (g, w, h, tex) {
      var T2 = window.PCWorld.TILE;
      g.fillStyle = '#05060f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; [[5, 5], [30, 40], [58, 10], [12, 38]].forEach(function (q) { g.fillRect(q[0], q[1], 1, 1); });
      [[12, 12, 14, T2.STONE, 0.4], [48, 30, 12, T2.GOLD, -0.3], [40, 8, 8, T2.COBBLE, 0.8]].forEach(function (r) { g.save(); g.translate(r[0], r[1]); g.rotate(r[4]); g.drawImage(tex.blocks[r[3]].top, 0, 0, 16, 16, -r[2] / 2, -r[2] / 2, r[2], r[2]); g.restore(); });
      g.save(); g.translate(26, 34); g.rotate(-0.6); g.fillStyle = '#9a9aa6'; g.fillRect(-6, -3, 10, 6); g.fillStyle = '#d8322b'; g.fillRect(4, -2, 3, 4); g.fillStyle = '#ff8a1f'; g.fillRect(-9, -1, 3, 2); g.restore();
      g.fillStyle = '#fff3a0'; g.fillRect(34, 26, 2, 2);
    },
    create: create
  };
})());
