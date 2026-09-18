/* Cube Invaders — Space Invaders with cube monsters. Rows of Mudge, Sly and Frost march
 * down the sky; the hero fires arrows from behind plank shields. Rumble zooms across the top
 * carrying ore — shoot him and catch what falls. */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 480, GROUND = H - 34, HERO_Y = GROUND - 2;
  var COLS = 7, ROWS = 5, MW = 22, MH = 20, GX = 34, GY = 26;
  var ROWKIND = ['frost', 'sly', 'sly', 'mudge', 'mudge'], ROWPTS = [30, 20, 20, 10, 10];
  var ORES = ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'];

  function create(ctx) {
    var tex = ctx.tex, T = window.PCWorld.TILE, hero = PCTex.hero(ctx.look);
    var S = {}, bg = null;

    function reset() { S.wave = 1; S.lives = 3; S.score = 0; S.time = 0; S.parts = []; S.pops = []; S.msg = null; S.shake = 0; newWave(); }
    function newWave() {
      S.mons = []; S.arrows = []; S.bombs = []; S.drops = []; S.ufo = null; S.ufoT = 6 + Math.random() * 6;
      S.dir = 1; S.stepT = 0; S.stepGap = Math.max(0.16, 0.7 - S.wave * 0.05); S.anim = 0; S.bombT = 1.5;
      var oreCarriers = 1 + Math.floor(S.wave / 2);
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) S.mons.push({ c: c, r: r, x: GX + c * (MW + 12), y: GY + r * (MH + 8) + Math.min(60, (S.wave - 1) * 8), kind: ROWKIND[r], pts: ROWPTS[r], ore: null, dead: false });
      for (var i = 0; i < oreCarriers; i++) { var m = S.mons[Math.floor(Math.random() * S.mons.length)]; m.ore = ORES[Math.min(ORES.length - 1, Math.floor(Math.random() * (2 + S.wave)))]; }
      // plank shields: 4 × (4×3 chunks)
      S.shields = [];
      for (var s = 0; s < 4; s++) for (var yy = 0; yy < 3; yy++) for (var xx = 0; xx < 4; xx++) { if (yy === 2 && (xx === 1 || xx === 2)) continue; S.shields.push({ x: 28 + s * 76 + xx * 8, y: GROUND - 70 + yy * 8, hp: 2 }); }
      S.hero = { x: W / 2, cool: 0, dead: 0 };
      ctx.pet.reset(S.hero.x - 30, GROUND, 3);
      S.msg = { text: 'WAVE ' + S.wave, t: 1.6 }; ctx.A.play('ready');
      if (S.wave === 1) S.hintT = 1.7;
    }
    function burst(x, y, col, n) { for (var i = 0; i < n; i++) S.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120 - 10, g: 300, life: 0.4 + Math.random() * 0.3, t: 0, col: col, s: 2 + Math.random() * 3 }); }
    function pop(x, y, text, col) { S.pops.push({ x: x, y: y, text: text, col: col || '#fff', t: 0 }); }
    function addScore(n) { S.score += n; ctx.score(S.score); }
    function shoot() {
      if (S.hero.dead > 0 || S.hero.cool > 0 || S.arrows.length >= 2) return;
      S.arrows.push({ x: S.hero.x, y: HERO_Y - 22 }); S.hero.cool = 0.22; ctx.fx('shoot');
    }
    function killMon(m) {
      m.dead = true; addScore(m.pts * S.wave); ctx.fx('bonk'); ctx.buzz(10);
      burst(m.x + MW / 2, m.y + MH / 2, (tex.mons[m.kind] ? '#ccc' : '#fff'), 8);
      if (m.ore) { S.drops.push({ x: m.x + MW / 2, y: m.y + MH / 2, kind: m.ore, vy: 40 }); m.ore = null; }
      S.stepGap = Math.max(0.08, S.stepGap * 0.965);
    }
    function heroHit() {
      if (S.hero.dead > 0 || S.safeT > 0) return;
      S.hero.dead = 1.2; S.lives--; ctx.fx('death'); ctx.buzz([60, 40, 80]); S.shake = 0.4; burst(S.hero.x, HERO_Y - 8, '#ffb37a', 14);
      S.bombs = [];
    }
    function update(dt) {
      S.time += dt; S.anim += dt;
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.hintT > 0) { S.hintT -= dt; if (S.hintT <= 0) S.msg = { text: 'CATCH THE ORE!', t: 2.4 }; }
      if (S.shake > 0) S.shake -= dt; if (S.safeT > 0) S.safeT -= dt;
      var h = S.hero;
      if (h.dead > 0) {
        h.dead -= dt; ctx.pet.sit(dt);
        if (h.dead <= 0) { if (S.lives <= 0) { ctx.over({ lines: [['Wave reached', S.wave]] }); return; } h.x = W / 2; S.safeT = 1.5; S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 }; }
      } else {
        if (ctx.held.dir === 1 || ctx.held.dir === 3) h.x += (ctx.held.dir === 3 ? 1 : -1) * 190 * dt;
        if (S.targetX != null) h.x += (S.targetX - h.x) * Math.min(1, dt * 14);
        h.x = Math.max(14, Math.min(W - 14, h.x));
        if (h.cool > 0) h.cool -= dt;
        if (ctx.held.a) shoot();
        ctx.pet.follow(h.x, GROUND, dt, { dist: 30, lockY: GROUND, snap: 400, speed: 200 });
      }
      // march
      S.stepT += dt;
      var alive = S.mons.filter(function (m) { return !m.dead; });
      if (!alive.length) { if (!S.drops.length) { waveClear(); return; } }
      else if (S.stepT >= S.stepGap) {
        S.stepT = 0; S.frame = (S.frame || 0) ^ 1;
        var minX = Infinity, maxX = -Infinity; alive.forEach(function (m) { minX = Math.min(minX, m.x); maxX = Math.max(maxX, m.x + MW); });
        if ((S.dir > 0 && maxX + 8 > W - 6) || (S.dir < 0 && minX - 8 < 6)) { S.dir = -S.dir; alive.forEach(function (m) { m.y += 10; }); ctx.fx('drop'); }
        else alive.forEach(function (m) { m.x += 8 * S.dir; });
        if (alive.some(function (m) { return m.y + MH >= GROUND - 26; })) { S.lives = 0; heroHit(); S.hero.dead = 0.01; }
      }
      // bombs
      S.bombT -= dt;
      if (S.bombT <= 0 && alive.length) {
        S.bombT = Math.max(0.35, 1.4 - S.wave * 0.1) * (0.6 + Math.random() * 0.8);
        // lowest monster in a random column
        var col = alive[Math.floor(Math.random() * alive.length)].c, low = null;
        alive.forEach(function (m) { if (m.c === col && (!low || m.y > low.y)) low = m; });
        if (low) S.bombs.push({ x: low.x + MW / 2, y: low.y + MH, vy: 110 + S.wave * 10 });
      }
      S.bombs.slice().forEach(function (b) {
        b.y += b.vy * dt;
        if (hitShield(b.x, b.y)) { S.bombs.splice(S.bombs.indexOf(b), 1); return; }
        if (b.y > HERO_Y - 20 && b.y < HERO_Y + 4 && Math.abs(b.x - h.x) < 11) { S.bombs.splice(S.bombs.indexOf(b), 1); heroHit(); return; }
        if (b.y > H) S.bombs.splice(S.bombs.indexOf(b), 1);
      });
      // arrows
      S.arrows.slice().forEach(function (a) {
        a.y -= 380 * dt;
        if (a.y < 0) { S.arrows.splice(S.arrows.indexOf(a), 1); return; }
        if (hitShield(a.x, a.y)) { S.arrows.splice(S.arrows.indexOf(a), 1); return; }
        for (var i = 0; i < S.mons.length; i++) { var m = S.mons[i]; if (!m.dead && a.x > m.x - 2 && a.x < m.x + MW + 2 && a.y > m.y && a.y < m.y + MH) { killMon(m); S.arrows.splice(S.arrows.indexOf(a), 1); pop(m.x + MW / 2, m.y, String(m.pts * S.wave), '#fff'); return; } }
        if (S.ufo && a.x > S.ufo.x - 12 && a.x < S.ufo.x + 12 && a.y > S.ufo.y - 8 && a.y < S.ufo.y + 8) {
          var pts = [100, 150, 200, 300][Math.floor(Math.random() * 4)] * S.wave; addScore(pts); pop(S.ufo.x, S.ufo.y, String(pts), '#ffe680');
          S.drops.push({ x: S.ufo.x, y: S.ufo.y, kind: S.ufo.ore, vy: 50 }); burst(S.ufo.x, S.ufo.y, '#ff6a3d', 12); ctx.fx('boom'); ctx.buzz(25);
          S.ufo = null; S.arrows.splice(S.arrows.indexOf(a), 1);
        }
      });
      // rumble the raider
      if (S.ufo) { S.ufo.x += S.ufo.vx * dt; S.ufo.anim += dt; if (S.ufo.x < -20 || S.ufo.x > W + 20) S.ufo = null; }
      else { S.ufoT -= dt; if (S.ufoT <= 0) { S.ufoT = 9 + Math.random() * 8; var fromL = Math.random() < 0.5; S.ufo = { x: fromL ? -16 : W + 16, y: 14, vx: (fromL ? 1 : -1) * 70, ore: ORES[Math.min(ORES.length - 1, 2 + Math.floor(Math.random() * (1 + S.wave)))], anim: 0 }; ctx.fx('foodspawn'); } }
      // falling ore drops
      S.drops.slice().forEach(function (d) {
        d.vy += 60 * dt; d.y += d.vy * dt;
        if (d.y > HERO_Y - 24 && d.y < HERO_Y + 6 && Math.abs(d.x - h.x) < 16 && h.dead <= 0) {
          ctx.addOre(d.kind, 1); addScore(50); pop(d.x, d.y - 10, '+1 ' + d.kind.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: d.kind }); ctx.buzz(15); ctx.pet.bark();
          S.drops.splice(S.drops.indexOf(d), 1);
        } else if (d.y > GROUND) { burst(d.x, GROUND, '#888', 4); S.drops.splice(S.drops.indexOf(d), 1); pop(d.x, GROUND - 10, 'MISSED', '#ff7a6a'); }
      });
      S.parts.forEach(function (p) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }); S.parts = S.parts.filter(function (p) { return p.t < p.life; });
      S.pops.forEach(function (p) { p.t += dt; }); S.pops = S.pops.filter(function (p) { return p.t < 1; });
    }
    function hitShield(x, y) {
      for (var i = 0; i < S.shields.length; i++) { var s = S.shields[i]; if (x >= s.x && x < s.x + 8 && y >= s.y && y < s.y + 8) { s.hp--; burst(x, y, '#b98a4a', 3); ctx.fx('hit', { tile: T.PLANKS }); if (s.hp <= 0) S.shields.splice(i, 1); return true; } }
      return false;
    }
    function waveClear() {
      addScore(200 * S.wave); ctx.addOre('coal', 1 + Math.floor(S.wave / 3)); ctx.fx('clear'); ctx.buzz(30); ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop();
      S.wave++; newWave();
    }
    function drawBg(g) {
      if (!bg) {
        bg = document.createElement('canvas'); bg.width = W; bg.height = H; var b = bg.getContext('2d'); b.imageSmoothingEnabled = false;
        var gr = b.createLinearGradient(0, 0, 0, GROUND); gr.addColorStop(0, '#07061a'); gr.addColorStop(1, '#1d1240'); b.fillStyle = gr; b.fillRect(0, 0, W, GROUND);
        var r = window.PCWorld.rng(77); for (var i = 0; i < 70; i++) { b.fillStyle = r() < 0.2 ? '#fff' : '#9aa5ff'; b.fillRect(Math.floor(r() * W), Math.floor(r() * (GROUND - 40)), r() < 0.15 ? 2 : 1, 1); }
        b.fillStyle = '#c9c9d4'; b.fillRect(W - 60, 26, 14, 14); b.fillStyle = '#e9e9f2'; b.fillRect(W - 58, 28, 8, 8);   // moon
        for (var x = 0; x < W; x += 16) { b.drawImage(tex.blocks[T.GRASS].top, 0, 0, 16, 16, x, GROUND, 16, 16); b.drawImage(tex.blocks[T.DIRT].top, 0, 0, 16, 16, x, GROUND + 16, 16, 16); }
      }
      g.drawImage(bg, 0, 0);
    }
    function draw(g, w, h, dt) {
      g.save(); if (S.shake > 0) g.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      drawBg(g);
      // shields
      S.shields.forEach(function (s) { g.drawImage(tex.blocks[T.PLANKS].top, 0, 0, 16, 16, s.x, s.y, 8, 8); if (s.hp < 2) g.drawImage(tex.cracks[3], 0, 0, 16, 16, s.x, s.y, 8, 8); });
      // monsters
      var fr = S.frame || 0;
      S.mons.forEach(function (m) {
        if (m.dead) return;
        if (m.ore) { g.drawImage(tex.blocks[T[m.ore.toUpperCase()]].top, 0, 0, 16, 16, m.x + 3, m.y + 2, 16, 16); }
        g.drawImage(tex.mons[m.kind][fr], m.x, m.y, MW, MH);
        PCTex.drawEyes(g, m.x, m.y, MW / 16, 2, false);
      });
      if (S.ufo) { var u = S.ufo; g.drawImage(tex.blocks[T[u.ore.toUpperCase()]].top, 0, 0, 16, 16, u.x - 6, u.y - 2, 12, 12); g.drawImage(tex.mons.rumble[Math.floor(u.anim * 6) % 2], u.x - 12, u.y - 10, 24, 20); PCTex.drawEyes(g, u.x - 12, u.y - 10, 1.5, u.vx > 0 ? 3 : 1, false); }
      // bombs / arrows / drops
      S.bombs.forEach(function (b) { g.fillStyle = '#4fc96a'; g.fillRect(b.x - 3, b.y - 6, 6, 8); g.fillStyle = '#8df0a0'; g.fillRect(b.x - 3, b.y - 6, 6, 2); });
      S.arrows.forEach(function (a) { g.fillStyle = '#c9a15a'; g.fillRect(a.x - 1, a.y, 2, 14); g.fillStyle = '#e8e8ee'; g.fillRect(a.x - 2, a.y - 2, 4, 4); g.fillStyle = '#d8322b'; g.fillRect(a.x - 2, a.y + 12, 4, 3); });
      S.drops.forEach(function (d) { g.drawImage(tex.ores[d.kind], d.x - 7, d.y - 7, 14, 14); });
      // wolf + hero
      ctx.pet.draw(g, ctx.pet.x, GROUND, 20);
      var hh = S.hero;
      if (hh.dead <= 0 && !(S.safeT > 0 && Math.floor(S.time * 10) % 2)) {
        g.drawImage(hero.up[0], hh.x - 12, HERO_Y - 24, 24, 24);
        g.fillStyle = '#6b4f2c'; g.fillRect(hh.x - 8, HERO_Y - 30, 16, 2); g.fillRect(hh.x - 8, HERO_Y - 30, 2, 8); g.fillRect(hh.x + 6, HERO_Y - 30, 2, 8);   // bow
      }
      S.parts.forEach(function (p) { g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.col; g.fillRect(p.x, p.y, p.s, p.s); }); g.globalAlpha = 1;
      S.pops.forEach(function (p) { g.globalAlpha = 1 - p.t; PCTex.drawText(g, p.text, p.x - PCTex.textWidth(p.text, 1) / 2, p.y - p.t * 24, 1, p.col, '#000'); }); g.globalAlpha = 1;
      // hud
      for (var i = 0; i < S.lives; i++) g.drawImage(tex.heart[1], 6 + i * 16, 4, 14, 13);
      PCTex.drawText(g, 'WAVE ' + S.wave, W - 74, 6, 2, '#ffe680', '#000');
      if (S.msg) { var s = 3, tw = PCTex.textWidth(S.msg.text, s); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(W / 2 - tw / 2 - 10, H / 2 - 20, tw + 20, 36); PCTex.drawText(g, S.msg.text, W / 2 - tw / 2, H / 2 - 10, s, '#ffe680', '#000'); }
      g.restore();
    }
    function input(e) {
      if (e.type === 'touch') { if (e.phase === 'down' || e.phase === 'move') { S.targetX = e.x; if (e.phase === 'down') shoot(); } else S.targetX = null; }
      else if (e.type === 'a' && e.down) shoot();
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S };
  }

  return {
    id: 'invaders', name: 'Cube Invaders', blurb: 'Rows of cube monsters march down. Shoot arrows, catch the ore they drop.',
    view: { w: W, h: H }, music: 'crystal',
    controls: { dpad: 'lr', a: 'SHOOT', b: null },
    thumb: function (g, w, h, tex, look) {
      var T2 = window.PCWorld.TILE;
      g.fillStyle = '#0b0a24'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; [[5, 4], [20, 9], [50, 3], [58, 14], [34, 6]].forEach(function (p) { g.fillRect(p[0], p[1], 1, 1); });
      var ks = ['frost', 'sly', 'mudge'];
      for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) { g.drawImage(tex.mons[ks[r]][0], 8 + c * 14, 4 + r * 10, 10, 9); PCTex.drawEyes(g, 8 + c * 14, 4 + r * 10, 10 / 16, 2, false); }
      for (var x = 0; x < w; x += 16) g.drawImage(tex.blocks[T2.GRASS].top, 0, 0, 16, 16, x, 42, 16, 6);
      g.drawImage(tex.blocks[T2.PLANKS].top, 0, 0, 16, 16, 10, 34, 10, 5); g.drawImage(tex.blocks[T2.PLANKS].top, 0, 0, 16, 16, 44, 34, 10, 5);
      g.drawImage(PCTex.hero(look || PCTex.LOOK_DEFAULT).up[0], 26, 30, 12, 12);
      g.fillStyle = '#e8e8ee'; g.fillRect(31, 22, 2, 6);
    },
    create: create
  };
})());
