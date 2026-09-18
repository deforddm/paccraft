/* Block Stack — falling-block puzzle built from real blocks. Slide and spin the pieces,
 * fill rows to clear them; ore blocks hidden in the pieces drop into your bag when their
 * row clears. The wolf keeps score beside the well. */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 480, CS = 20, COLS = 10, ROWS = 20, OX = 10, OY = 40;
  // pieces: cells of the 4 rotations, texture name
  var PIECES = {
    I: { tex: 'ICE', rot: [[[0, 1], [1, 1], [2, 1], [3, 1]], [[2, 0], [2, 1], [2, 2], [2, 3]], [[0, 2], [1, 2], [2, 2], [3, 2]], [[1, 0], [1, 1], [1, 2], [1, 3]]] },
    O: { tex: 'GOLD', rot: [[[1, 0], [2, 0], [1, 1], [2, 1]]] },
    T: { tex: 'CRYSTAL', rot: [[[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [1, 2]]] },
    S: { tex: 'GRASS', rot: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]]] },
    Z: { tex: 'MAGMA', rot: [[[0, 0], [1, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1], [1, 2]]] },
    J: { tex: 'DIAMOND', rot: [[[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [0, 2], [1, 2]]] },
    L: { tex: 'SAND', rot: [[[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]], [[0, 1], [1, 1], [2, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]]] }
  };
  var NAMES = Object.keys(PIECES), LINE_PTS = [0, 100, 300, 500, 800];
  var ORES = ['coal', 'coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'];

  function create(ctx) {
    var tex = ctx.tex, Wd = window.PCWorld, T = Wd.TILE;
    var S = {}, bg = null;
    function idx(x, y) { return y * COLS + x; }
    function reset() {
      S.level = 1; S.lines = 0; S.score = 0; S.time = 0; S.parts = []; S.pops = []; S.msg = { text: 'BLOCK STACK', t: 1.4 }; S.clearing = null; S.overF = false;
      S.grid = new Array(COLS * ROWS).fill(null); S.bag = []; S.next = draw1(); S.held = null;
      S.das = 0; S.dasDir = 0; S.lockT = 0;
      S.hintT = 1.5;
      newPiece(); ctx.A.play('ready');
      ctx.pet.reset(0, 0, 1);
    }
    function draw1() { if (!S.bag.length) { S.bag = NAMES.slice(); for (var i = S.bag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = S.bag[i]; S.bag[i] = S.bag[j]; S.bag[j] = t; } } return S.bag.pop(); }
    function newPiece() {
      var name = S.next; S.next = draw1();
      S.cur = { name: name, r: 0, x: 3, y: -1, ore: Math.random() < 0.28 ? { cell: Math.floor(Math.random() * 4), kind: ORES[Math.min(ORES.length - 1, Math.floor(Math.random() * (3 + S.level)))] } : null };
      S.fallT = 0; S.lockT = 0;
      if (collides(S.cur, 0, 0, S.cur.r)) { S.overF = true; ctx.over({ lines: [['Lines', S.lines], ['Level', S.level]] }); }
    }
    function cells(p, r) { var rot = PIECES[p.name].rot; return rot[((r == null ? p.r : r) % rot.length + rot.length) % rot.length]; }
    function collides(p, dx, dy, r) {
      var cs = cells(p, r);
      for (var i = 0; i < 4; i++) { var x = p.x + cs[i][0] + dx, y = p.y + cs[i][1] + dy; if (x < 0 || x >= COLS || y >= ROWS) return true; if (y >= 0 && S.grid[idx(x, y)]) return true; }
      return false;
    }
    function move(dx) { if (S.clearing || S.overF) return false; if (!collides(S.cur, dx, 0)) { S.cur.x += dx; ctx.fx('click'); if (S.lockT > 0) S.lockT = 0; return true; } return false; }
    function rotate() {
      if (S.clearing || S.overF) return;
      var p = S.cur, nr = p.r + 1, kicks = [0, -1, 1, -2, 2];
      for (var k = 0; k < kicks.length; k++) if (!collides(p, kicks[k], 0, nr)) { p.x += kicks[k]; p.r = nr; ctx.fx('hop'); if (S.lockT > 0) S.lockT = 0; return; }
      if (!collides(p, 0, -1, nr)) { p.y -= 1; p.r = nr; ctx.fx('hop'); }
    }
    function hardDrop() { if (S.clearing || S.overF) return; var n = 0; while (!collides(S.cur, 0, 1)) { S.cur.y++; n++; } addScore(n * 2); lock(); ctx.buzz(12); }
    function lock() {
      var p = S.cur, cs = cells(p);
      for (var i = 0; i < 4; i++) { var x = p.x + cs[i][0], y = p.y + cs[i][1]; if (y < 0) { S.overF = true; ctx.over({ lines: [['Lines', S.lines], ['Level', S.level]] }); return; } S.grid[idx(x, y)] = { tex: PIECES[p.name].tex, ore: p.ore && p.ore.cell === i ? p.ore.kind : null }; }
      ctx.fx('drop');
      var full = [];
      for (var yy = 0; yy < ROWS; yy++) { var ok = true; for (var xx = 0; xx < COLS; xx++) if (!S.grid[idx(xx, yy)]) { ok = false; break; } if (ok) full.push(yy); }
      if (full.length) { S.clearing = { rows: full, t: 0.35 }; ctx.fx('line', { n: full.length }); }
      else newPiece();
    }
    function finishClear() {
      var rows = S.clearing.rows, n = rows.length, ores = {};
      rows.forEach(function (y) { for (var x = 0; x < COLS; x++) { var c = S.grid[idx(x, y)]; if (c && c.ore) ores[c.ore] = (ores[c.ore] || 0) + 1; burst(OX + x * CS + CS / 2, OY + y * CS + CS / 2, (tex.blocks[T[c.tex]] || {}).avg || '#aaa', 2); } });
      rows.sort(function (a, b) { return a - b; }).forEach(function (y) { for (var yy = y; yy > 0; yy--) for (var x = 0; x < COLS; x++) S.grid[idx(x, yy)] = S.grid[idx(x, yy - 1)]; for (var x2 = 0; x2 < COLS; x2++) S.grid[idx(x2, 0)] = null; });
      var pts = LINE_PTS[n] * S.level; addScore(pts); pop(OX + COLS * CS / 2, OY + rows[0] * CS, (n === 4 ? 'BLOCKCADE! ' : '') + pts, n === 4 ? '#ffe680' : '#fff');
      Object.keys(ores).forEach(function (k, i) { ctx.addOre(k, ores[k]); pop(OX + COLS * CS / 2, OY + rows[0] * CS + 14 + i * 12, '+' + ores[k] + ' ' + k.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: k }); });
      if (n === 4) { ctx.addOre('iron', 1); ctx.buzz([30, 30, 60]); ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop(); } else ctx.pet.bark(n >= 2 ? 'WOOF!' : 'YIP!');
      S.lines += n;
      var lv = 1 + Math.floor(S.lines / 10);
      if (lv > S.level) { S.level = lv; S.msg = { text: 'LEVEL ' + lv, t: 1.4 }; ctx.addOre('coal', 1 + Math.floor(lv / 3)); ctx.fx('clear'); }
      S.clearing = null; newPiece();
    }
    function gravity() { return Math.max(0.08, 0.8 * Math.pow(0.82, S.level - 1)); }
    function burst(x, y, col, n) { for (var i = 0; i < n; i++) S.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 100 - 10, g: 260, life: 0.4 + Math.random() * 0.3, t: 0, col: col, s: 2 + Math.random() * 3 }); }
    function pop(x, y, text, col) { S.pops.push({ x: x, y: y, text: text, col: col || '#fff', t: 0 }); }
    function addScore(n) { S.score += n; ctx.score(S.score); }
    function update(dt) {
      S.time += dt;
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.hintT > 0) { S.hintT -= dt; if (S.hintT <= 0) S.msg = { text: 'FILL A ROW!', t: 2 }; }
      ctx.pet.sit(dt); if (S.clearing) ctx.pet.wagT = 1;
      S.parts.forEach(function (q) { q.t += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }); S.parts = S.parts.filter(function (q) { return q.t < q.life; });
      S.pops.forEach(function (q) { q.t += dt; }); S.pops = S.pops.filter(function (q) { return q.t < 1.2; });
      if (S.overF) return;
      if (S.clearing) { S.clearing.t -= dt; if (S.clearing.t <= 0) finishClear(); return; }
      // sideways auto-repeat
      var hd = ctx.held.dir;
      if (hd === 1 || hd === 3) { var d = hd === 3 ? 1 : -1; if (S.dasDir !== d) { S.dasDir = d; S.das = 0.22; move(d); } else { S.das -= dt; if (S.das <= 0) { S.das = 0.06; move(d); } } }
      else S.dasDir = 0;
      var soft = hd === 2 || S.softTouch;
      S.fallT += dt * (soft ? 8 : 1);
      var gv = gravity();
      while (S.fallT >= gv) {
        S.fallT -= gv;
        if (!collides(S.cur, 0, 1)) { S.cur.y++; if (soft) addScore(1); S.lockT = 0; }
        else { S.lockT += gv; if (S.lockT >= 0.45 || soft) { lock(); break; } }
      }
    }
    function drawCell(g, X, Y, c, alpha) {
      g.globalAlpha = alpha == null ? 1 : alpha;
      g.drawImage(tex.blocks[T[c.tex]].top, 0, 0, 16, 16, X, Y, CS, CS);
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(X, Y, CS, 2); g.fillRect(X, Y, 2, CS);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X, Y + CS - 2, CS, 2); g.fillRect(X + CS - 2, Y, 2, CS);
      if (c.ore) { g.drawImage(tex.ores[c.ore], X + 4, Y + 4, 12, 12); }
      g.globalAlpha = 1;
    }
    function drawBg(g) {
      if (!bg) {
        bg = document.createElement('canvas'); bg.width = W; bg.height = H; var b = bg.getContext('2d'); b.imageSmoothingEnabled = false;
        b.fillStyle = '#1a1420'; b.fillRect(0, 0, W, H);
        for (var y = 0; y < H; y += 16) for (var x = 0; x < W; x += 16) { b.globalAlpha = 0.35; b.drawImage(tex.blocks[T.STONE].top, x, y, 16, 16); } b.globalAlpha = 1;
        b.fillStyle = 'rgba(0,0,0,0.5)'; b.fillRect(0, 0, W, H);
        // well
        b.fillStyle = '#0d0910'; b.fillRect(OX, OY, COLS * CS, ROWS * CS);
        b.fillStyle = 'rgba(255,255,255,0.05)'; for (var gx = 1; gx < COLS; gx++) b.fillRect(OX + gx * CS, OY, 1, ROWS * CS); for (var gy = 1; gy < ROWS; gy++) b.fillRect(OX, OY + gy * CS, COLS * CS, 1);
        var bed = tex.blocks[T.BORDER].top;
        for (var i = -1; i <= ROWS; i++) { b.drawImage(bed, OX - 10, OY + i * CS, 10, CS); b.drawImage(bed, OX + COLS * CS, OY + i * CS, 10, CS); }
        for (var j = 0; j < COLS * CS + 20; j += 10) b.drawImage(bed, OX - 10 + j, OY + ROWS * CS, 10, 10);
        // side panel
        b.fillStyle = 'rgba(0,0,0,0.45)'; b.fillRect(222, OY, 90, 96); b.fillRect(222, OY + 106, 90, 70); b.fillRect(222, OY + 300, 90, 100);
      }
      g.drawImage(bg, 0, 0);
    }
    function draw(g, w, h, dt) {
      drawBg(g);
      // settled blocks
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) { var c = S.grid[idx(x, y)]; if (!c) continue; var flash = S.clearing && S.clearing.rows.indexOf(y) >= 0 && Math.floor(S.time * 16) % 2; drawCell(g, OX + x * CS, OY + y * CS, c, flash ? 0.25 : 1); }
      // ghost + current
      if (!S.clearing && !S.overF && S.cur) {
        var p = S.cur, gy = 0; while (!collides(p, 0, gy + 1)) gy++;
        var cs = cells(p);
        for (var i = 0; i < 4; i++) { var X = OX + (p.x + cs[i][0]) * CS, Y = OY + (p.y + gy + cs[i][1]) * CS; if (p.y + gy + cs[i][1] >= 0) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(X + 2, Y + 2, CS - 4, CS - 4); } }
        for (var k = 0; k < 4; k++) { var X2 = OX + (p.x + cs[k][0]) * CS, Y2 = OY + (p.y + cs[k][1]) * CS; if (p.y + cs[k][1] >= 0) drawCell(g, X2, Y2, { tex: PIECES[p.name].tex, ore: p.ore && p.ore.cell === k ? p.ore.kind : null }); }
      }
      // side panel: next, stats, wolf
      PCTex.drawText(g, 'NEXT', 240, OY + 6, 2, '#fff', '#000');
      var np = { name: S.next, r: 0, x: 0, y: 0 }, ncs = cells(np), minx = Math.min.apply(null, ncs.map(function (c) { return c[0]; })), maxx = Math.max.apply(null, ncs.map(function (c) { return c[0]; }));
      var nw = (maxx - minx + 1) * 16, nx0 = 267 - nw / 2;
      ncs.forEach(function (c) { var X = nx0 + (c[0] - minx) * 16, Y = OY + 34 + c[1] * 16; g.drawImage(tex.blocks[T[PIECES[S.next].tex]].top, 0, 0, 16, 16, X, Y, 16, 16); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X, Y + 14, 16, 2); });
      PCTex.drawText(g, 'LEVEL', 240, OY + 112, 1.5, '#ffe680', '#000'); PCTex.drawText(g, String(S.level), 240, OY + 126, 2, '#fff', '#000');
      PCTex.drawText(g, 'LINES', 240, OY + 146, 1.5, '#ffe680', '#000'); PCTex.drawText(g, String(S.lines), 240, OY + 160, 2, '#fff', '#000');
      ctx.pet.draw(g, 267, OY + 386, 30, 1);
      S.parts.forEach(function (q) { g.globalAlpha = 1 - q.t / q.life; g.fillStyle = q.col; g.fillRect(q.x, q.y, q.s, q.s); }); g.globalAlpha = 1;
      S.pops.forEach(function (q) { g.globalAlpha = 1 - q.t / 1.2; PCTex.drawText(g, q.text, q.x - PCTex.textWidth(q.text, 1) / 2, q.y - q.t * 20, 1, q.col, '#000'); }); g.globalAlpha = 1;
      // top strip
      PCTex.drawText(g, 'BLOCK STACK', OX, 8, 2, '#fff', '#000');
      if (S.msg) { var s = S.msg.text.length > 12 ? 2 : 3, tw = PCTex.textWidth(S.msg.text, s), cx = OX + COLS * CS / 2; g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(cx - tw / 2 - 10, H / 2 - 20, tw + 20, 36); PCTex.drawText(g, S.msg.text, cx - tw / 2, H / 2 - 10, s, '#ffe680', '#000'); }
    }
    var touch = null;
    function input(e) {
      if (e.type === 'a' && e.down) rotate();
      else if (e.type === 'b' && e.down) hardDrop();
      else if (e.type === 'dir' && e.dir === 0) rotate();
      else if (e.type === 'touch') {
        if (e.phase === 'down') touch = { x: e.x, y: e.y, sx: e.x, moved: false, t: S.time };
        else if (e.phase === 'move' && touch) {
          var dx = e.x - touch.x, dy = e.y - touch.y;
          while (dx > CS * 0.9) { move(1); touch.x += CS * 0.9; dx -= CS * 0.9; touch.moved = true; }
          while (dx < -CS * 0.9) { move(-1); touch.x -= CS * 0.9; dx += CS * 0.9; touch.moved = true; }
          if (dy > 34 && !touch.moved && Math.abs(e.x - touch.sx) < 20) { hardDrop(); touch.moved = true; touch.dropped = true; }
        } else if (e.phase === 'up') { if (touch && !touch.moved) rotate(); touch = null; }
      }
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { move: move, rotate: rotate, hardDrop: hardDrop, lock: lock } };
  }

  return {
    id: 'stack', name: 'Block Stack', blurb: 'Stack falling blocks and fill rows. Ore blocks in a cleared row are yours.',
    view: { w: W, h: H }, music: 'snow',
    controls: { dpad: true, a: 'SPIN', b: 'DROP' },
    thumb: function (g, w, h, tex) {
      var T2 = window.PCWorld.TILE;
      g.fillStyle = '#0d0910'; g.fillRect(0, 0, w, h);
      var rows = [[null, null, null, null, null, null, 'ICE', null], ['GOLD', 'GOLD', null, 'CRYSTAL', null, null, 'ICE', null], ['GOLD', 'GOLD', 'CRYSTAL', 'CRYSTAL', 'CRYSTAL', 'SAND', 'ICE', 'GRASS'], ['MAGMA', 'MAGMA', 'DIAMOND', 'SAND', 'SAND', 'SAND', 'ICE', 'GRASS']];
      rows.forEach(function (r, y) { r.forEach(function (t, x) { if (!t) return; g.drawImage(tex.blocks[T2[t]].top, 0, 0, 16, 16, x * 8, 16 + y * 8, 8, 8); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x * 8, 16 + y * 8 + 7, 8, 1); }); });
      g.drawImage(tex.blocks[T2.DIAMOND].top, 0, 0, 16, 16, 24, 2, 8, 8); g.drawImage(tex.blocks[T2.DIAMOND].top, 0, 0, 16, 16, 24, 10, 8, 8); g.drawImage(tex.blocks[T2.DIAMOND].top, 0, 0, 16, 16, 32, 10, 8, 8);
      g.drawImage(tex.ores.gold, 41, 33, 6, 6);
    },
    create: create
  };
})());
