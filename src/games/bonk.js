/* Bonk-a-Mob — whack-a-mole with cube monsters. Tap monsters as they pop out of the nine
 * holes, tap ore blocks to mine them, but never bonk the TNT — or your wolf! */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 420, TIME = 50;
  var HX = [62, 160, 258], HY = [150, 250, 350];
  var MONS = ['rumble', 'sly', 'frost', 'mudge'];

  function create(ctx) {
    var tex = ctx.tex, T = window.PCWorld.TILE, K = PCCab.kit();
    var S = {}, bg = null;
    function addScore(n) { S.score += n; ctx.score(S.score); }
    function reset() {
      S.score = 0; S.time = 0; S.left = TIME; S.lives = 3; S.combo = 0; S.best = 0; S.bonks = 0; S.spawnT = 1.2; S.swing = null; S.cursor = 4; S.done = false;
      S.holes = []; for (var i = 0; i < 9; i++) S.holes.push({ x: HX[i % 3], y: HY[Math.floor(i / 3)], st: 'empty', t: 0, dur: 0, kind: null });
      S.msg = { text: 'BONK-A-MOB', sub: 'NOT THE TNT - OR YOUR WOLF!', t: 2.2 }; K.clear(); ctx.A.play('ready');
    }
    function spawn() {
      var empty = S.holes.filter(function (h) { return h.st === 'empty'; }); if (!empty.length) return;
      var h = empty[Math.floor(Math.random() * empty.length)], r = Math.random(), wolf = ctx.pet.on && !S.holes.some(function (o) { return o.kind === 'wolf' && o.st !== 'empty'; });
      var k;
      if (r < 0.06) k = 'gold'; else if (r < 0.19) k = 'ore'; else if (r < 0.28) k = 'tnt'; else if (r < 0.35 && wolf) k = 'wolf'; else k = MONS[Math.floor(Math.random() * 4)];
      h.kind = k; h.st = 'up'; h.t = 0; h.dur = Math.max(0.55, 1.25 - S.time * 0.013) * (k === 'gold' ? 0.7 : 1); h.ore = k === 'ore' ? ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'][Math.min(6, Math.floor(Math.random() * (3 + S.time / 12)))] : null;
      h.face = Math.floor(Math.random() * 4);
    }
    function rise(h) { if (h.st === 'up') return Math.min(1, h.t / 0.14); if (h.st === 'down' || h.st === 'hit') return Math.max(0, 1 - h.t / 0.18); return 0; }
    function bonk(h) {
      if (S.done) return;
      S.swing = { x: h.x, y: h.y - 30, t: 0.18 };
      if (h.st !== 'up' || rise(h) < 0.35) { ctx.fx('click'); return; }
      h.st = 'hit'; h.t = 0;
      if (h.kind === 'tnt') { S.lives--; S.combo = 0; ctx.fx('boom'); ctx.buzz([50, 30, 60]); K.burst(h.x, h.y - 20, '#ff6a1f', 18, 200); K.pop(h.x, h.y - 50, 'BOOM!', '#ff7a6a'); S.shake = 0.3; if (S.lives <= 0) end(); return; }
      if (h.kind === 'wolf') { S.combo = 0; S.left = Math.max(0, S.left - 3); ctx.pet.bark('YIP!'); K.pop(h.x, h.y - 50, 'NOT YOUR PAL! -3', '#ff7a6a'); ctx.fx('nope'); return; }
      S.combo++; S.best = Math.max(S.best, S.combo); var mult = 1 + Math.floor(S.combo / 5);
      if (h.kind === 'ore') { ctx.addOre(h.ore, 1); addScore(30 * mult); K.pop(h.x, h.y - 50, '+1 ' + h.ore.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: h.ore }); ctx.buzz(15); ctx.pet.bark(); return; }
      var pts = (h.kind === 'gold' ? 100 : 10) * mult; S.bonks++;
      addScore(pts); K.pop(h.x, h.y - 50, pts + (mult > 1 ? ' x' + mult : ''), h.kind === 'gold' ? '#ffe680' : '#fff'); K.burst(h.x, h.y - 24, h.kind === 'gold' ? '#f2c230' : '#c9ccd4', 8); ctx.fx('bonk'); ctx.buzz(10);
      if (h.kind === 'gold') { ctx.fx('crystal'); S.left = Math.min(TIME, S.left + 3); K.pop(h.x, h.y - 64, '+3 SEC', '#7df9ff'); }
    }
    function end() {
      if (S.done) return; S.done = true;
      ctx.addOre('coal', 1 + Math.floor(S.bonks / 15)); if (S.bonks >= 40) ctx.addOre('iron', 1);
      ctx.pet.bark('WOOF WOOF!');
      ctx.over({ win: S.lives > 0, title: S.lives > 0 ? 'Time Up!' : 'Kaboom!', lines: [['Monsters bonked', S.bonks], ['Best combo', S.best]] });
    }
    function update(dt) {
      S.time += dt; K.tick(dt);
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.shake > 0) S.shake -= dt;
      if (S.swing) { S.swing.t -= dt; if (S.swing.t <= 0) S.swing = null; }
      ctx.pet.sit(dt);
      if (S.done) return;
      if (S.time > 1.2) { S.left -= dt; if (S.left <= 0) { S.left = 0; end(); return; } }
      S.spawnT -= dt;
      if (S.spawnT <= 0) { S.spawnT = Math.max(0.32, 0.95 - S.time * 0.012) * (0.7 + Math.random() * 0.6); spawn(); if (S.time > 20 && Math.random() < 0.3) spawn(); }
      S.holes.forEach(function (h) {
        if (h.st === 'empty') return; h.t += dt;
        if (h.st === 'up' && h.t >= h.dur) { h.st = 'down'; h.t = 0; if (MONS.indexOf(h.kind) >= 0 || h.kind === 'gold') S.combo = 0; if (h.kind === 'wolf') { ctx.pet.bark('WOOF!'); addScore(20); } }
        else if ((h.st === 'down' || h.st === 'hit') && h.t >= 0.2) { h.st = 'empty'; h.kind = null; }
      });
    }
    function drawBg(g) {
      if (!bg) {
        bg = document.createElement('canvas'); bg.width = W; bg.height = H; var b = bg.getContext('2d'); b.imageSmoothingEnabled = false;
        b.fillStyle = '#6fb7ff'; b.fillRect(0, 0, W, 90);
        b.fillStyle = '#fff'; [[30, 30], [180, 20], [250, 50]].forEach(function (c) { b.fillRect(c[0], c[1], 36, 8); b.fillRect(c[0] + 8, c[1] - 6, 18, 6); });
        for (var y = 80; y < H; y += 16) for (var x = 0; x < W; x += 16) b.drawImage(tex.blocks[T.GRASS].top, 0, 0, 16, 16, x, y, 16, 16);
        b.fillStyle = 'rgba(0,0,0,0.08)'; for (var yy = 80; yy < H; yy += 32) b.fillRect(0, yy, W, 16);
      }
      g.drawImage(bg, 0, 0);
    }
    function drawPopper(g, h) {
      var r = rise(h), top = h.y - 44 * r, k = h.kind;
      if (r <= 0) return;
      g.save(); g.beginPath(); g.rect(h.x - 40, h.y - 80, 80, 80); g.clip();
      if (k === 'tnt') g.drawImage(tex.tnt[Math.floor(S.time * 10) % 2], h.x - 18, top, 36, 36);
      else if (k === 'ore') { g.drawImage(tex.blocks[T[h.ore.toUpperCase()]].top, 0, 0, 16, 16, h.x - 18, top, 36, 36); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(h.x - 18, top, 36, 3); }
      else if (k === 'wolf') ctx.pet.draw(g, h.x, top + 40, 40, 2);
      else {
        var kind = k === 'gold' ? 'rumble' : k, dazed = h.st === 'hit';
        g.drawImage(tex.mons[dazed ? 'flash' : kind][Math.floor(S.time * 5) % 2], h.x - 20, top, 40, 40);
        if (k === 'gold') { g.globalAlpha = 0.55; g.fillStyle = '#f2c230'; g.fillRect(h.x - 20, top, 40, 40); g.globalAlpha = 1; }
        if (!dazed) PCTex.drawEyes(g, h.x - 20, top, 2.5, h.face, false);
        else PCTex.drawText(g, 'x x', h.x - 8, top + 12, 1.5, '#1b1822');
      }
      g.restore();
    }
    function draw(g) {
      g.save(); if (S.shake > 0) g.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      drawBg(g);
      S.holes.forEach(function (h, i) {
        // hole back
        g.fillStyle = '#2a1a10'; g.fillRect(h.x - 36, h.y - 12, 72, 22); g.fillStyle = '#140c08'; g.fillRect(h.x - 32, h.y - 10, 64, 16);
        drawPopper(g, h);
        // front rim
        g.drawImage(tex.blocks[T.DIRT].top, 0, 0, 16, 16, h.x - 38, h.y + 4, 76, 12); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(h.x - 38, h.y + 14, 76, 2);
        if (i === S.cursor && S.keys) { g.strokeStyle = '#ffe680'; g.lineWidth = 2; g.strokeRect(h.x - 40, h.y - 60, 80, 78); }
      });
      // swing
      if (S.swing) { var pk = tex.picks[Math.min(4, ctx.save.up.pick || 0)], a = S.swing.t / 0.18; g.save(); g.translate(S.swing.x + 14, S.swing.y); g.rotate(-1.2 * a + 0.3); g.drawImage(pk, -24, -24, 28, 28); g.restore(); }
      // cheering wolf in the corner (when it isn't popping out of a hole)
      if (!S.holes.some(function (h) { return h.kind === 'wolf'; })) ctx.pet.draw(g, 26, H - 6, 24, 3);
      K.draw(g);
      // hud
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, W, 24);
      K.hearts(g, tex, S.lives, 6, 5);
      var f = S.left / TIME; g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(70, 8, 150, 8); g.fillStyle = f < 0.2 ? '#ff7a6a' : '#5ef0a8'; g.fillRect(70, 8, 150 * f, 8);
      PCTex.drawText(g, Math.ceil(S.left) + 'S', 226, 6, 2, '#fff', '#000');
      if (S.combo >= 5) PCTex.drawText(g, 'COMBO x' + (1 + Math.floor(S.combo / 5)), W / 2 - 40, 32, 2, '#ffe680', '#000');
      K.banner(g, W, H, S.msg, 190);
      g.restore();
    }
    function nearest(x, y) { var best = null, bd = 1e9; S.holes.forEach(function (h) { var d = Math.hypot(h.x - x, (h.y - 20) - y); if (d < bd) { bd = d; best = h; } }); return bd < 60 ? best : null; }
    function input(e) {
      if (e.type === 'touch' && e.phase === 'down') { S.keys = false; var h = nearest(e.x, e.y); if (h) bonk(h); else S.swing = { x: e.x, y: e.y, t: 0.18 }; }
      else if (e.type === 'dir' && e.dir >= 0) { S.keys = true; var c = S.cursor % 3, r = Math.floor(S.cursor / 3); if (e.dir === 1) c = Math.max(0, c - 1); if (e.dir === 3) c = Math.min(2, c + 1); if (e.dir === 0) r = Math.max(0, r - 1); if (e.dir === 2) r = Math.min(2, r + 1); S.cursor = r * 3 + c; }
      else if (e.type === 'a' && e.down) { S.keys = true; bonk(S.holes[S.cursor]); }
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { bonk: bonk, spawn: spawn } };
  }

  return {
    id: 'bonk', name: 'Bonk-a-Mob', blurb: 'Bonk the monsters popping out of the holes. Mine the ore. Never bonk the TNT or your wolf!',
    view: { w: W, h: H }, music: 'meadow',
    controls: { dpad: false, a: null, b: null },
    thumb: function (g, w, h, tex) {
      var T2 = window.PCWorld.TILE;
      for (var y = 0; y < h; y += 8) for (var x = 0; x < w; x += 8) g.drawImage(tex.blocks[T2.GRASS].top, 0, 0, 16, 16, x, y, 8, 8);
      [[12, 18], [32, 18], [52, 18], [12, 38], [32, 38], [52, 38]].forEach(function (q, i) { g.fillStyle = '#140c08'; g.fillRect(q[0] - 8, q[1] - 2, 16, 5); if (i === 1) { g.drawImage(tex.mons.rumble[0], q[0] - 6, q[1] - 12, 12, 12); } if (i === 3) g.drawImage(tex.tnt[0], q[0] - 5, q[1] - 10, 10, 10); if (i === 5) g.drawImage(tex.blocks[T2.GOLD].top, 0, 0, 16, 16, q[0] - 5, q[1] - 10, 10, 10); g.drawImage(tex.blocks[T2.DIRT].top, 0, 0, 16, 16, q[0] - 9, q[1] + 2, 18, 3); });
      g.drawImage(tex.picks[0], 36, 2, 12, 12);
    },
    create: create
  };
})());
