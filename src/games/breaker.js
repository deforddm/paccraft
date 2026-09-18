/* Block Breaker — Breakout with blocks. Bounce a slime ball off a plank paddle to smash
 * dirt, stone, basalt and ore blocks; ores go straight into your bag. */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 480, COLS = 10, BW = 30, BH = 16, BX0 = 10, BY0 = 44;
  var T; // tile ids
  var KIND = { dirt: { hp: 1, pts: 10 }, planks: { hp: 1, pts: 10 }, sand: { hp: 1, pts: 10 }, stone: { hp: 2, pts: 20 }, cobble: { hp: 2, pts: 20 }, ice: { hp: 1, pts: 15 },
    basalt: { hp: 3, pts: 40 }, bedrock: { hp: 99, pts: 0 }, tnt: { hp: 1, pts: 30 }, crystal: { hp: 1, pts: 50 },
    coal: { hp: 1, pts: 50, ore: 'coal' }, iron: { hp: 2, pts: 80, ore: 'iron' }, gold: { hp: 2, pts: 120, ore: 'gold' }, diamond: { hp: 3, pts: 200, ore: 'diamond' }, ember: { hp: 3, pts: 400, ore: 'ember' } };
  var POWERS = ['wide', 'multi', 'slow', 'fire', 'sticky', 'life'];
  var PCOL = { wide: '#3fa7e0', multi: '#5ef0a8', slow: '#c9ccd4', fire: '#ff8a1f', sticky: '#e36bff', life: '#ff6b7a' };
  var PLET = { wide: 'W', multi: 'M', slow: 'S', fire: 'F', sticky: 'G', life: '+' };

  function create(ctx) {
    var tex = ctx.tex, Wd = window.PCWorld; T = Wd.TILE;
    var texOf = { dirt: T.DIRT, planks: T.PLANKS, sand: T.SANDSTONE, stone: T.STONE, cobble: T.COBBLE, ice: T.ICE, basalt: T.BASALT, bedrock: T.BORDER, tnt: null, crystal: T.CRYSTAL, coal: T.COAL, iron: T.IRON, gold: T.GOLD, diamond: T.DIAMOND, ember: T.EMBER };
    var S = {};
    var bg = null;

    function reset() {
      S.level = 1; S.lives = 3; S.score = 0; S.combo = 0; S.time = 0;
      S.parts = []; S.pops = []; S.powers = []; S.msg = null; S.shake = 0;
      newLevel();
    }
    function newLevel() {
      S.blocks = []; S.balls = []; S.powers = [];
      S.paddle = { x: W / 2, w: 56, wideT: 0, stickyT: 0 };
      S.fireT = 0; S.slowT = 0; S.speed = 170 + Math.min(120, (S.level - 1) * 12);
      var r = Wd.rng(S.level * 7919 + 17), lv = S.level;
      var rows = Math.min(11, 5 + Math.floor(lv / 2));
      var pattern = lv % 5;
      for (var row = 0; row < rows; row++) for (var col = 0; col < COLS; col++) {
        var keep = true;
        if (pattern === 1) keep = (row + col) % 2 === 0;                       // checker
        else if (pattern === 2) keep = Math.abs(col - 4.5) <= row * 0.9 + 0.5;   // pyramid
        else if (pattern === 3) keep = col % 3 !== 1 || row % 4 === 0;          // columns
        else if (pattern === 4) keep = r() < 0.78;                              // swiss cheese
        if (!keep) continue;
        var t = r(), kind;
        var hard = Math.min(0.5, 0.08 + lv * 0.04);
        if (t < 0.045 + lv * 0.004) kind = ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'][Math.min(6, Math.floor(r() * (3 + lv * 0.6)))];
        else if (t < 0.075) kind = 'tnt';
        else if (t < 0.09) kind = 'crystal';
        else if (t < 0.09 + hard * 0.35 && lv >= 3) kind = 'basalt';
        else if (t < 0.09 + hard) kind = r() < 0.5 ? 'stone' : 'cobble';
        else if (t < 0.09 + hard + 0.04 && lv >= 5 && row < 2) kind = 'bedrock';
        else kind = ['dirt', 'dirt', 'planks', 'sand', 'ice'][Math.floor(r() * 5)];
        S.blocks.push({ col: col, row: row, x: BX0 + col * BW, y: BY0 + row * BH, kind: kind, hp: KIND[kind].hp });
      }
      spawnBall(true);
      S.msg = { text: 'LEVEL ' + S.level, t: 1.6 };
      ctx.A.play('ready');
    }
    function spawnBall(stuck) {
      S.balls.push({ x: S.paddle.x, y: H - 52, vx: 0, vy: 0, stuck: stuck, r: 5, trail: [] });
    }
    function launch(b) {
      if (!b.stuck) return;
      b.stuck = false;
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      var sp = S.speed * (S.slowT > 0 ? 0.65 : 1);
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      ctx.A.play('place');
    }
    function burst(x, y, col, n) {
      for (var i = 0; i < n; i++) S.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120 - 20, g: 300, life: 0.5 + Math.random() * 0.3, t: 0, col: col, s: 2 + Math.random() * 3 });
    }
    function pop(x, y, text, col) { S.pops.push({ x: x, y: y, text: text, col: col || '#fff', t: 0 }); }
    function killBlock(b, byBall) {
      var i = S.blocks.indexOf(b); if (i < 0) return;
      S.blocks.splice(i, 1);
      var k = KIND[b.kind], pts = k.pts * (1 + Math.min(4, Math.floor(S.combo / 4)));
      S.score += pts; ctx.score(S.score);
      var col = b.kind === 'tnt' ? '#ff6a3d' : (tex.blocks[texOf[b.kind]] || {}).avg || '#aaa';
      burst(b.x + BW / 2, b.y + BH / 2, col, 8);
      if (k.ore) { ctx.addOre(k.ore, 1); pop(b.x + BW / 2, b.y, '+1 ' + k.ore.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: texOf[b.kind], drop: k.ore }); }
      else if (b.kind === 'tnt') {
        ctx.fx('boom'); ctx.buzz([40, 30, 60]); S.shake = 0.3;
        S.blocks.slice().forEach(function (o) { if (Math.abs(o.col - b.col) <= 1 && Math.abs(o.row - b.row) <= 1 && o.kind !== 'bedrock') killBlock(o, false); });
      } else if (b.kind === 'crystal') { ctx.fx('crystal'); spawnExtraBall(b.x + BW / 2, b.y + BH); pop(b.x + BW / 2, b.y, 'EXTRA BALL', '#e36bff'); }
      else ctx.fx('mined', { tile: texOf[b.kind] });
      if (byBall && Math.random() < 0.13 && b.kind !== 'tnt') {
        var p = POWERS[Math.floor(Math.random() * (Math.random() < 0.06 ? 6 : 5))];
        S.powers.push({ x: b.x + BW / 2, y: b.y + BH / 2, kind: p, vy: 70 });
      }
    }
    function spawnExtraBall(x, y) {
      var src = S.balls.filter(function (b) { return !b.stuck; })[0];
      var sp = S.speed * (S.slowT > 0 ? 0.65 : 1), a = Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      S.balls.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a)) * sp, stuck: false, r: 5, trail: [] });
    }
    function applyPower(p) {
      ctx.fx('unlock'); ctx.buzz(20);
      switch (p.kind) {
        case 'wide': S.paddle.wideT = 14; break;
        case 'multi': for (var i = 0; i < 2; i++) spawnExtraBall(S.paddle.x, H - 60); break;
        case 'slow': S.slowT = 10; S.balls.forEach(function (b) { if (!b.stuck) { var sp = Math.hypot(b.vx, b.vy) || 1; var ns = S.speed * 0.65; b.vx *= ns / sp; b.vy *= ns / sp; } }); break;
        case 'fire': S.fireT = 8; break;
        case 'sticky': S.paddle.stickyT = 12; break;
        case 'life': S.lives = Math.min(6, S.lives + 1); break;
      }
      pop(S.paddle.x, H - 70, { wide: 'WIDE!', multi: 'MULTI BALL!', slow: 'SLOW-MO', fire: 'FIRE BALL!', sticky: 'STICKY', life: '+1 LIFE' }[p.kind], PCOL[p.kind]);
    }
    function loseBall(b) {
      S.balls.splice(S.balls.indexOf(b), 1);
      if (S.balls.length) return;
      S.lives--; S.combo = 0; S.fireT = 0; S.paddle.stickyT = 0;
      ctx.fx('death'); ctx.buzz([60, 40, 80]); S.shake = 0.35;
      if (S.lives <= 0) { ctx.over({ lines: [['Level reached', S.level]] }); return; }
      spawnBall(true);
      S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 };
    }

    function update(dt) {
      S.time += dt;
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.shake > 0) S.shake -= dt;
      var pd = S.paddle;
      // keyboard / joystick paddle
      if (ctx.held.dir === 1 || ctx.held.dir === 3) pd.x += (ctx.held.dir === 3 ? 1 : -1) * 320 * dt;
      if (S.targetX != null) { pd.x += (S.targetX - pd.x) * Math.min(1, dt * 22); }
      pd.w = pd.wideT > 0 ? 84 : 56;
      pd.x = Math.max(pd.w / 2 + 2, Math.min(W - pd.w / 2 - 2, pd.x));
      if (pd.wideT > 0) pd.wideT -= dt; if (pd.stickyT > 0) pd.stickyT -= dt; if (S.fireT > 0) S.fireT -= dt; if (S.slowT > 0) S.slowT -= dt;
      var maxSp = S.speed * (S.slowT > 0 ? 0.65 : 1) + Math.min(80, S.time * 1.2);
      S.balls.slice().forEach(function (b) {
        if (b.stuck) { b.x = pd.x + (b.off || 0); b.y = H - 52; return; }
        // speed normalise (slowly ramps up)
        var sp = Math.hypot(b.vx, b.vy) || 1, want = Math.min(maxSp, sp + 4 * dt);
        b.vx *= want / sp; b.vy *= want / sp;
        if (Math.abs(b.vy) < 40) b.vy = (b.vy < 0 ? -1 : 1) * 40;   // never a flat shot
        var steps = 3;
        for (var s = 0; s < steps; s++) {
          b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
          if (b.x < b.r + 2) { b.x = b.r + 2; b.vx = Math.abs(b.vx); ctx.fx('bonk'); }
          if (b.x > W - b.r - 2) { b.x = W - b.r - 2; b.vx = -Math.abs(b.vx); ctx.fx('bonk'); }
          if (b.y < 24 + b.r) { b.y = 24 + b.r; b.vy = Math.abs(b.vy); ctx.fx('bonk'); }
          // paddle
          var py = H - 46;
          if (b.vy > 0 && b.y + b.r >= py && b.y + b.r <= py + 12 && b.x > pd.x - pd.w / 2 - b.r && b.x < pd.x + pd.w / 2 + b.r) {
            var rel = (b.x - pd.x) / (pd.w / 2), ang = -Math.PI / 2 + rel * 1.05;
            var v = Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(ang) * v; b.vy = Math.sin(ang) * v; b.y = py - b.r;
            S.combo = 0; ctx.fx('gem');
            if (pd.stickyT > 0) { b.stuck = true; b.off = b.x - pd.x; b.vx = b.vy = 0; }
          }
          // blocks
          for (var i = 0; i < S.blocks.length; i++) {
            var bl = S.blocks[i];
            if (b.x + b.r < bl.x || b.x - b.r > bl.x + BW || b.y + b.r < bl.y || b.y - b.r > bl.y + BH) continue;
            var fire = S.fireT > 0 && bl.kind !== 'bedrock';
            if (!fire) {
              var ox = Math.min(b.x + b.r - bl.x, bl.x + BW - (b.x - b.r)), oy = Math.min(b.y + b.r - bl.y, bl.y + BH - (b.y - b.r));
              if (ox < oy) { b.vx = -b.vx; b.x += b.vx > 0 ? ox : -ox; } else { b.vy = -b.vy; b.y += b.vy > 0 ? oy : -oy; }
            }
            S.combo++;
            if (bl.kind === 'bedrock') { ctx.fx('bonk'); burst(b.x, b.y, '#777', 3); }
            else { bl.hp -= fire ? 99 : 1; if (bl.hp <= 0) killBlock(bl, true); else { ctx.fx('hit', { tile: texOf[bl.kind] }); burst(b.x, b.y, (tex.blocks[texOf[bl.kind]] || {}).avg || '#aaa', 3); } }
            break;
          }
          if (b.y > H + 10) { loseBall(b); return; }
        }
        b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 6) b.trail.shift();
      });
      // powers
      S.powers.slice().forEach(function (p) {
        p.y += p.vy * dt;
        if (p.y > H - 52 && p.y < H - 30 && Math.abs(p.x - pd.x) < pd.w / 2 + 8) { applyPower(p); S.powers.splice(S.powers.indexOf(p), 1); }
        else if (p.y > H + 10) S.powers.splice(S.powers.indexOf(p), 1);
      });
      // particles
      S.parts.forEach(function (p) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
      S.parts = S.parts.filter(function (p) { return p.t < p.life; });
      S.pops.forEach(function (p) { p.t += dt; }); S.pops = S.pops.filter(function (p) { return p.t < 1; });
      // level clear
      if (!S.blocks.some(function (b) { return b.kind !== 'bedrock'; })) {
        S.score += 100 * S.level; ctx.score(S.score);
        ctx.addOre('coal', 1 + Math.floor(S.level / 3)); ctx.fx('clear'); ctx.buzz(30);
        S.level++; newLevel(); S.msg = { text: 'LEVEL ' + S.level, t: 1.6 };
      }
    }

    function drawBg(g) {
      if (!bg) {
        bg = document.createElement('canvas'); bg.width = W; bg.height = H;
        var b = bg.getContext('2d'); b.imageSmoothingEnabled = false;
        var st = tex.blocks[T.STONE].top, cb = tex.blocks[T.COBBLE].top;
        for (var y = 0; y < H; y += 16) for (var x = 0; x < W; x += 16) b.drawImage(((x + y) / 16) % 3 === 0 ? cb : st, x, y, 16, 16);
        b.fillStyle = 'rgba(8,4,14,0.72)'; b.fillRect(0, 0, W, H);
        var gr = b.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.4, 360); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.55)');
        b.fillStyle = gr; b.fillRect(0, 0, W, H);
        // bedrock frame
        var bed = tex.blocks[T.BORDER].top;
        for (var i = 0; i < W; i += 16) b.drawImage(bed, i, 8, 16, 16);
        for (var j = 8; j < H; j += 16) { b.drawImage(bed, -8, j, 16, 16); b.drawImage(bed, W - 8, j, 16, 16); }
      }
      g.drawImage(bg, 0, 0);
    }
    function draw(g, w, h, dt) {
      g.save();
      if (S.shake > 0) g.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      drawBg(g);
      // blocks
      S.blocks.forEach(function (b) {
        if (b.kind === 'tnt') { g.drawImage(tex.tnt[0], b.x + 8, b.y + 1, 14, 14); g.fillStyle = '#8a1f1a'; g.fillRect(b.x + 1, b.y + 1, 7, BH - 2); g.fillRect(b.x + BW - 8, b.y + 1, 7, BH - 2); g.fillStyle = '#d8322b'; g.fillRect(b.x + 2, b.y + 2, 5, BH - 4); g.fillRect(b.x + BW - 7, b.y + 2, 5, BH - 4); }
        else g.drawImage(tex.blocks[texOf[b.kind]].top, 0, 0, 16, 16, b.x, b.y, BW, BH);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(b.x, b.y, BW, 1); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(b.x, b.y + BH - 1, BW, 1); g.fillRect(b.x + BW - 1, b.y, 1, BH);
        var k = KIND[b.kind]; if (b.hp < k.hp && k.hp < 99) g.drawImage(tex.cracks[Math.min(4, Math.floor((1 - b.hp / k.hp) * 5))], 0, 0, 16, 16, b.x, b.y, BW, BH);
      });
      // powers
      S.powers.forEach(function (p) {
        g.fillStyle = '#1b1822'; g.fillRect(p.x - 8, p.y - 8, 16, 16); g.fillStyle = PCOL[p.kind]; g.fillRect(p.x - 7, p.y - 7, 14, 14);
        PCTex.drawText(g, PLET[p.kind], p.x - 2.5, p.y - 3.5, 1, '#1b1822');
      });
      // paddle
      var pd = S.paddle, px = pd.x - pd.w / 2, py = H - 46;
      g.drawImage(tex.blocks[T.PLANKS].top, 0, 0, 16, 16, px, py, pd.w, 10);
      if (pd.stickyT > 0) { g.fillStyle = 'rgba(227,107,255,0.6)'; g.fillRect(px, py - 2, pd.w, 3); }
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(px, py, pd.w, 1); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(px, py + 9, pd.w, 1);
      // balls
      S.balls.forEach(function (b) {
        var fire = S.fireT > 0;
        b.trail.forEach(function (t, i) { g.globalAlpha = (i + 1) / b.trail.length * 0.35; g.fillStyle = fire ? '#ff8a1f' : '#5ef0a8'; g.fillRect(t.x - 3, t.y - 3, 6, 6); });
        g.globalAlpha = 1;
        g.fillStyle = fire ? '#ff6a1f' : '#4fc96a'; g.fillRect(b.x - 5, b.y - 5, 10, 10);
        g.fillStyle = fire ? '#ffd23d' : '#8df0a0'; g.fillRect(b.x - 5, b.y - 5, 10, 3); g.fillRect(b.x - 5, b.y - 5, 3, 10);
        g.fillStyle = '#1b1822'; g.fillRect(b.x - 3, b.y - 1, 2, 2); g.fillRect(b.x + 1, b.y - 1, 2, 2);
        if (b.stuck) { g.fillStyle = 'rgba(255,255,255,' + (0.4 + Math.sin(S.time * 8) * 0.3) + ')'; PCTex.drawText(g, 'TAP TO LAUNCH', b.x - 37, b.y - 22, 1.5, '#fff', '#000'); }
      });
      // particles / popups
      S.parts.forEach(function (p) { g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.col; g.fillRect(p.x, p.y, p.s, p.s); }); g.globalAlpha = 1;
      S.pops.forEach(function (p) { g.globalAlpha = 1 - p.t; PCTex.drawText(g, p.text, p.x - PCTex.textWidth(p.text, 1) / 2, p.y - p.t * 24, 1, p.col, '#000'); }); g.globalAlpha = 1;
      // hud strip
      for (var i = 0; i < S.lives; i++) g.drawImage(tex.heart[1], 6 + i * 16, 4, 14, 13);
      PCTex.drawText(g, 'LV ' + S.level, W - 50, 6, 2, '#fff', '#000');
      var st = [];
      if (S.fireT > 0) st.push('FIRE ' + Math.ceil(S.fireT)); if (pd.wideT > 0) st.push('WIDE ' + Math.ceil(pd.wideT)); if (S.slowT > 0) st.push('SLOW ' + Math.ceil(S.slowT)); if (pd.stickyT > 0) st.push('STICKY ' + Math.ceil(pd.stickyT));
      if (st.length) PCTex.drawText(g, st.join(' '), 110, 6, 1.5, '#ffe680', '#000');
      if (S.msg) { var s = 3, tw = PCTex.textWidth(S.msg.text, s); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(W / 2 - tw / 2 - 10, H / 2 - 20, tw + 20, 36); PCTex.drawText(g, S.msg.text, W / 2 - tw / 2, H / 2 - 10, s, '#ffe680', '#000'); }
      g.restore();
    }
    function input(e) {
      if (e.type === 'touch') {
        if (e.phase === 'down' || e.phase === 'move') { S.targetX = e.x; if (e.phase === 'down') { S.balls.forEach(launch); } }
        else S.targetX = null;
      } else if (e.type === 'a' && e.down) S.balls.forEach(launch);
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input };
  }

  return {
    id: 'breaker', name: 'Block Breaker', blurb: 'Smash blocks with a bouncy slime. Ores drop right into your bag.',
    view: { w: W, h: H }, music: 'caves',
    controls: { dpad: false, a: null, b: null },   // drag anywhere to move, tap to launch
    thumb: function (g, w, h, tex) {
      var T2 = window.PCWorld.TILE, kinds = [T2.DIRT, T2.STONE, T2.GOLD, T2.COBBLE, T2.DIAMOND, T2.SANDSTONE];
      g.fillStyle = '#16101c'; g.fillRect(0, 0, w, h);
      for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) if ((r + c) % 5 !== 2) g.drawImage(tex.blocks[kinds[(r * 2 + c) % 6]].top, 0, 0, 16, 16, 2 + c * 10, 3 + r * 6, 9, 5);
      g.drawImage(tex.blocks[T2.PLANKS].top, 0, 0, 16, 16, 22, 42, 20, 4);
      g.fillStyle = '#4fc96a'; g.fillRect(30, 30, 5, 5); g.fillStyle = '#8df0a0'; g.fillRect(30, 30, 5, 2);
    },
    create: create
  };
})());
