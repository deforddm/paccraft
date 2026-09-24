/* Minecart Rush — a Moon Patrol-style rail runner. Ride the minecart (your wolf rides along)
 * through the mine: jump the broken rails, shoot boulders ahead and bats above, and grab
 * floating ore. Checkpoints every stretch keep your progress. */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 320, RAIL = 246, CARTX = 88, CHECK = 1400;

  function create(ctx) {
    var tex = ctx.tex, Wd = window.PCWorld, T = Wd.TILE, hero = PCTex.hero(ctx.look), K = PCCab.kit();
    var S = {};
    function addScore(n) { S.score += n; ctx.score(S.score); }
    function reset() {
      S.lives = 3; S.score = 0; S.time = 0; S.msg = { text: 'MINECART RUSH', sub: 'JUMP GAPS - SHOOT ROCKS', t: 2.4 };
      S.dist = 0; S.check = 0; S.checks = 0; S.obs = []; S.genX = 420; S.bullets = []; K.clear();
      spawn(); ctx.A.play('ready');
    }
    function spawn() {
      S.cart = { y: RAIL, vy: 0, air: false, dead: 0, spin: 0 }; S.speed = 130; S.safeT = 1.2; S.bullets = [];
      // clear obstacles right in front of the restart point
      S.obs = S.obs.filter(function (o) { return o.x < S.dist - 50 || o.x > S.dist + 360; });
    }
    function level() { return 1 + S.checks; }
    function gen() {
      while (S.genX < S.dist + W + 260) {
        var x = S.genX, lv = level(), r = Math.random();
        var nextCheck = Math.ceil((x + 1) / CHECK) * CHECK;
        if (nextCheck - x < 360) { S.obs.push({ type: 'check', x: nextCheck }); S.genX = nextCheck + 280; continue; }
        if (r < 0.32) { var w = 42 + Math.random() * Math.min(48, 16 + lv * 8); S.obs.push({ type: 'gap', x: x, w: w }); if (Math.random() < 0.6) S.obs.push({ type: 'ore', x: x + w / 2, y: RAIL - 70, kind: oreKind() }); S.genX += w + 150 - Math.min(50, lv * 6) + Math.random() * 80; }
        else if (r < 0.58) { var big = lv >= 2 && Math.random() < 0.4; S.obs.push({ type: 'rock', x: x, hp: big ? 2 : 1, size: big ? 20 : 14, ore: Math.random() < 0.3 ? oreKind() : null }); S.genX += 140 + Math.random() * 90; }
        else if (r < 0.76) { var n = 2 + Math.min(3, Math.floor(lv / 2)); for (var i = 0; i < n; i++) S.obs.push({ type: 'bat', x: x + i * 46, y0: 120 + Math.random() * 50, ph: Math.random() * 6, dive: lv >= 2 && Math.random() < 0.5 }); S.genX += n * 46 + 120; }
        else if (r < 0.88) { for (var e = 0; e < 5; e++) S.obs.push({ type: 'gem', x: x + e * 18, y: RAIL - 20 - Math.sin(e / 4 * Math.PI) * 40 }); S.genX += 150; }
        else { S.obs.push({ type: 'gap', x: x, w: 36 }); S.obs.push({ type: 'rock', x: x + 110, hp: 1, size: 14 }); S.genX += 260; }
      }
      S.obs = S.obs.filter(function (o) { return o.x + (o.w || 0) > S.dist - 120 || o.type === 'check'; });
    }
    function oreKind() { return ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'][Math.min(6, Math.floor(Math.random() * (2.5 + level() * 0.6)))]; }
    function sx(x) { return x - S.dist + CARTX; }
    function onGap(wx) { for (var i = 0; i < S.obs.length; i++) { var o = S.obs[i]; if (o.type === 'gap' && wx > o.x + 4 && wx < o.x + o.w - 4) return true; } return false; }
    function jump() { var c = S.cart; if (c.dead > 0 || c.air) return; c.air = true; c.vy = -370; ctx.fx('hop'); }
    function shoot() {
      if (S.cart.dead > 0 || S.bullets.length > 5) return;
      S.bullets.push({ x: S.dist + 14, y: S.cart.y - 12, vx: 360, vy: 0 }); S.bullets.push({ x: S.dist, y: S.cart.y - 26, vx: 0, vy: -380 }); ctx.fx('shoot');
    }
    function crash(fall) {
      var c = S.cart; if (c.dead > 0 || S.safeT > 0) return;
      c.dead = 1.5; c.fall = fall; S.lives--; ctx.fx(fall ? 'splash' : 'death'); ctx.buzz([60, 40, 80]); K.burst(CARTX, c.y - 10, '#ffb37a', 14);
    }
    function update(dt) {
      S.time += dt; K.tick(dt);
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.safeT > 0) S.safeT -= dt;
      ctx.pet.sit(dt);
      var c = S.cart;
      if (c.dead > 0) {
        c.dead -= dt; c.spin += dt * 8; if (c.fall) c.y += 160 * dt;
        if (c.dead <= 0) { if (S.lives <= 0) { ctx.over({ lines: [['Distance', Math.floor(S.dist / 10) + ' M'], ['Checkpoints', S.checks]] }); return; } S.dist = S.check; spawn(); S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 }; }
        return;
      }
      var want = 130 + Math.min(70, S.checks * 10) + (ctx.held.dir === 3 ? 60 : ctx.held.dir === 1 ? -45 : 0);
      S.speed += (want - S.speed) * Math.min(1, dt * 3);
      S.dist += S.speed * dt; gen();
      if (ctx.held.b && (!S.autoT || S.autoT <= 0)) { shoot(); S.autoT = 0.28; } if (S.autoT > 0) S.autoT -= dt;
      // cart physics
      if (c.air) { c.vy += 900 * dt; c.y += c.vy * dt; if (c.vy > 0 && c.y >= RAIL) { if (onGap(S.dist)) { /* keep falling */ } else { c.y = RAIL; c.air = false; c.vy = 0; ctx.fx('drop'); } } if (c.y > RAIL + 30) crash(true); }
      else if (onGap(S.dist)) { c.air = true; c.vy = 40; }
      // bullets
      S.bullets = S.bullets.filter(function (b) {
        b.x += (b.vx + (b.vx ? 0 : S.speed)) * dt; b.y += b.vy * dt;
        if (b.y < 20 || b.x > S.dist + W) return false;
        for (var i = 0; i < S.obs.length; i++) {
          var o = S.obs[i];
          if (o.type === 'rock' && b.vx && Math.abs(b.x - o.x) < o.size / 2 + 4 && b.y > RAIL - o.size - 4) {
            o.hp--; K.burst(sx(o.x), RAIL - o.size / 2, '#8b8b8f', 4); ctx.fx('hit', { tile: T.STONE });
            if (o.hp <= 0) { S.obs.splice(i, 1); addScore(100 * o.size / 14); K.pop(sx(o.x), RAIL - 30, String(Math.round(100 * o.size / 14)), '#fff'); if (o.ore) { ctx.addOre(o.ore, 1); K.pop(sx(o.x), RAIL - 44, '+1 ' + o.ore.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: o.ore }); ctx.pet.bark(); } }
            return false;
          }
          if (o.type === 'bat' && !o.dead && Math.abs(b.x - o.x) < 11 && Math.abs(b.y - batY(o)) < 10) { o.dead = true; addScore(150); K.pop(sx(o.x), batY(o) - 10, '150', '#7df9ff'); K.burst(sx(o.x), batY(o), '#3a2a4a', 8); ctx.fx('bonk'); return false; }
        }
        return true;
      });
      // obstacles vs cart
      var cx = S.dist;
      S.obs.slice().forEach(function (o) {
        if (o.type === 'rock') { if (Math.abs(o.x - cx) < o.size / 2 + 11 && c.y > RAIL - o.size + 2) crash(false); }
        else if (o.type === 'bat' && !o.dead) { var by = batY(o); if (Math.abs(o.x - cx) < 14 && by > c.y - 34 && by < c.y) crash(false); }
        else if (o.type === 'ore' && Math.abs(o.x - cx) < 18 && Math.abs(o.y - (c.y - 22)) < 22) { S.obs.splice(S.obs.indexOf(o), 1); ctx.addOre(o.kind, 1); addScore(200); K.pop(CARTX, c.y - 50, '+1 ' + o.kind.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: o.kind }); ctx.buzz(15); ctx.pet.bark(); }
        else if (o.type === 'gem' && Math.abs(o.x - cx) < 14 && Math.abs(o.y - (c.y - 16)) < 18) { S.obs.splice(S.obs.indexOf(o), 1); addScore(20); ctx.fx('gem'); }
        else if (o.type === 'check' && !o.hit && cx >= o.x) {
          o.hit = true; S.check = o.x; S.checks++; addScore(500 * S.checks); ctx.fx('clear'); ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop();
          ctx.addOre('coal', 1 + Math.floor(S.checks / 2)); S.msg = { text: 'CHECKPOINT ' + S.checks, sub: 'FASTER NOW!', t: 1.8 };
        }
      });
      S.obs.forEach(function (o) { if (o.type === 'bat') { o.x -= 30 * dt; o.ph += dt * 3; } });
    }
    function batY(o) { var y = o.y0 + Math.sin(o.ph) * 18; if (o.dive) { var d = o.x - S.dist; if (d < 140 && d > -20) y += (140 - d) * 0.55; } return Math.min(RAIL - 18, y); }

    function draw(g) {
      // sky / cave backdrop with parallax
      var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a1f3a'); gr.addColorStop(1, '#5a3a2a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (var i = 0; i < 12; i++) { var mx = ((i * 90 - S.dist * 0.2) % (12 * 90) + 12 * 90) % (12 * 90) - 60, mh = 60 + (i * 37) % 50; g.fillStyle = '#3a2c44'; g.fillRect(mx, RAIL - 40 - mh, 70, mh + 40); g.fillStyle = '#44344f'; g.fillRect(mx + 10, RAIL - 40 - mh, 50, 8); }
      for (var j = 0; j < 8; j++) { var tx = ((j * 140 - S.dist * 0.6) % 1120 + 1120) % 1120 - 40; g.fillStyle = '#5a3f22'; g.fillRect(tx, RAIL - 90, 4, 90); g.fillStyle = '#ffb13b'; g.fillRect(tx - 1, RAIL - 96, 6, 6); g.fillStyle = 'rgba(255,177,59,0.15)'; g.fillRect(tx - 10, RAIL - 106, 26, 26); }
      // ground + rails
      var off = -((S.dist) % 16);
      for (var x = off; x < W; x += 16) {
        var wx = S.dist + x - CARTX + 8, gap = onGap(wx);
        if (!gap) { g.drawImage(tex.blocks[T.STONE].top, 0, 0, 16, 16, x, RAIL + 6, 16, 16); g.drawImage(tex.blocks[T.DIRT].top, 0, 0, 16, 16, x, RAIL + 22, 16, 16); g.drawImage(tex.blocks[T.DIRT].top, 0, 0, 16, 16, x, RAIL + 38, 16, 16); g.drawImage(tex.blocks[T.DIRT].top, 0, 0, 16, 16, x, RAIL + 54, 16, 16); g.fillStyle = '#5a3f22'; g.fillRect(x + 3, RAIL + 1, 4, 5); g.fillStyle = '#8b8b8f'; g.fillRect(x, RAIL, 16, 2); }
        else { g.fillStyle = '#0d0910'; g.fillRect(x, RAIL + 6, 16, H - RAIL); }
      }
      // checkpoint posts
      S.obs.forEach(function (o) { if (o.type !== 'check') return; var X = sx(o.x); if (X < -20 || X > W + 20) return; g.fillStyle = '#5a5a60'; g.fillRect(X - 2, RAIL - 50, 4, 50); g.fillStyle = o.hit ? '#7dff8a' : '#d8322b'; g.fillRect(X - 8, RAIL - 60, 16, 12); });
      // rocks, ore, gems, bats
      S.obs.forEach(function (o) {
        var X = sx(o.x); if (X < -30 || X > W + 30) return;
        if (o.type === 'rock') { var s = o.size; g.drawImage(tex.blocks[o.ore ? T[o.ore.toUpperCase()] : T.COBBLE].top, 0, 0, 16, 16, X - s / 2, RAIL - s, s, s); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X - s / 2, RAIL - 2, s, 2); if (o.hp < 2 && s > 14) g.drawImage(tex.cracks[3], 0, 0, 16, 16, X - s / 2, RAIL - s, s, s); }
        else if (o.type === 'ore') { g.fillStyle = 'rgba(255,230,128,0.2)'; g.fillRect(X - 10, o.y - 10 + Math.sin(S.time * 4) * 2, 20, 20); g.drawImage(tex.ores[o.kind], X - 7, o.y - 7 + Math.sin(S.time * 4) * 2, 14, 14); }
        else if (o.type === 'gem') { g.fillStyle = '#1d6b4a'; g.fillRect(X - 3, o.y - 2, 6, 6); g.fillStyle = '#5ef0a8'; g.fillRect(X - 3, o.y - 3, 6, 5); }
        else if (o.type === 'bat' && !o.dead) { var by = batY(o), fl = Math.floor(S.time * 10 + o.ph) % 2; g.fillStyle = '#2a1f3a'; g.fillRect(X - 10, by - (fl ? 4 : 0), 7, 3); g.fillRect(X + 3, by - (fl ? 4 : 0), 7, 3); g.fillStyle = '#4a3a5a'; g.fillRect(X - 4, by - 3, 8, 7); g.fillStyle = '#ff6a6a'; g.fillRect(X - 2, by - 1, 1, 1); g.fillRect(X + 1, by - 1, 1, 1); }
      });
      // bullets
      S.bullets.forEach(function (b) { g.fillStyle = '#fff3a0'; if (b.vx) g.fillRect(sx(b.x) - 4, b.y - 1, 8, 3); else g.fillRect(sx(b.x) - 1, b.y - 4, 3, 8); });
      // cart with hero + wolf
      var c = S.cart, blink = S.safeT > 0 && Math.floor(S.time * 10) % 2;
      if (!blink) {
        g.save(); g.translate(CARTX, Math.round(c.y)); if (c.dead > 0) g.rotate(-c.spin * 0.3);
        g.drawImage(hero.right[0], -10, -34, 18, 18);
        if (ctx.pet.on) ctx.pet.draw(g, -9, -12, 13, 3);
        g.fillStyle = '#5a5a64'; g.fillRect(-16, -16, 32, 12); g.fillStyle = '#8b8b96'; g.fillRect(-16, -16, 32, 3); g.fillStyle = '#3a3a44'; g.fillRect(-14, -8, 28, 2);
        var wr = Math.floor(S.dist / 6) % 2;
        g.fillStyle = '#26262c'; g.fillRect(-12, -5, 7, 7); g.fillRect(5, -5, 7, 7); g.fillStyle = '#8b8b96'; g.fillRect(-10 + wr * 2, -3, 2, 2); g.fillRect(7 + wr * 2, -3, 2, 2);
        g.restore();
      }
      K.draw(g);
      // hud
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, W, 22);
      K.hearts(g, tex, S.lives, 6, 4);
      PCTex.drawText(g, Math.floor(S.dist / 10) + ' M', 110, 5, 2, '#fff', '#000');
      var toNext = CHECK - (S.dist % CHECK); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(W - 90, 8, 80, 6); g.fillStyle = '#7dff8a'; g.fillRect(W - 90, 8, 80 * (1 - toNext / CHECK), 6);
      K.banner(g, W, H, S.msg, 90);
    }
    function input(e) {
      if (e.type === 'a' && e.down) jump();
      else if (e.type === 'b' && e.down) { shoot(); S.autoT = 0.35; }
      else if (e.type === 'touch' && e.phase === 'down') { if (e.x > W * 0.6) shoot(); else jump(); }
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { jump: jump, shoot: shoot, gen: gen } };
  }

  return {
    id: 'minecart', name: 'Minecart Rush', blurb: 'Ride the rails with your wolf. Jump broken track, shoot rocks and bats, grab ore.',
    view: { w: W, h: H }, music: 'desert',
    controls: { dpad: 'lr', a: 'JUMP', b: 'SHOOT' },
    thumb: function (g, w, h, tex, look) {
      var T2 = window.PCWorld.TILE;
      g.fillStyle = '#3a2c44'; g.fillRect(0, 0, w, h);
      for (var x = 0; x < w; x += 8) if (x < 30 || x > 44) { g.drawImage(tex.blocks[T2.STONE].top, 0, 0, 16, 16, x, 38, 8, 10); g.fillStyle = '#8b8b8f'; g.fillRect(x, 37, 8, 1); }
      g.drawImage(tex.blocks[T2.COBBLE].top, 0, 0, 16, 16, 52, 30, 7, 7);
      g.drawImage(PCTex.hero(look || PCTex.LOOK_DEFAULT).right[0], 12, 18, 11, 11);
      g.fillStyle = '#5a5a64'; g.fillRect(8, 27, 20, 8); g.fillStyle = '#26262c'; g.fillRect(10, 34, 4, 4); g.fillRect(22, 34, 4, 4);
      g.drawImage(tex.ores.gold, 34, 16, 8, 8);
    },
    create: create
  };
})());
