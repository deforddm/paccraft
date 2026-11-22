/* Blockcade v4.0 — brain pack: Four in a Row, Flip Stones, Word Miner, Math Mine. */
(function () {
  'use strict';
  var R = PCMini.reg;

  // ---------- Four in a Row: you (gold) against Rumble (magma) ----------
  R({
    id: 'connect4', name: 'Four in a Row', cat: 'brain', medals: [300, 1200, 3000], music: 'meadow',
    blurb: 'Drop gold blocks into the grid. Get four in a row — across, down or diagonal — before Rumble does.',
    pet: [18, 418],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#2a3d7a'; g.fillRect(4, 4, 56, 40); var b = '000000000100002100012210112122';
      for (var i = 0; i < 30; i++) { var x = 7 + (i % 6) * 9, y = 6 + Math.floor(i / 6) * 7.5; if (b[i] === '0') { g.fillStyle = '#16213f'; g.fillRect(x, y, 7, 6); } else if (b[i] === '1') { g.fillStyle = '#f7c936'; g.fillRect(x, y, 7, 6); } else g.drawImage(tex.blocks[T.MAGMA].top, 0, 0, 16, 16, x, y, 7, 6); }
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, COLS = 7, ROWS = 6, CS = 42, OX = 13, OY = 110, bd, turn, drop = null, think = 0, wait = 0, winCells = null, wins = 0, hover = 3;
      function setup() { bd = []; for (var i = 0; i < COLS * ROWS; i++) bd.push(0); turn = 1; drop = null; winCells = null; }
      function piece(g, who, x, y, s) { if (who === 1) c.gold(g, x, y, s); else c.block(g, T.MAGMA, x, y, s); }
      function rowFor(b, col) { for (var r = ROWS - 1; r >= 0; r--) if (!b[r * COLS + col]) return r; return -1; }
      function winAt(b, who) {
        var D = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) for (var d = 0; d < 4; d++) {
          var cells = [];
          for (var k = 0; k < 4; k++) { var nx = x + D[d][0] * k, ny = y + D[d][1] * k; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || b[ny * COLS + nx] !== who) break; cells.push(ny * COLS + nx); }
          if (cells.length === 4) return cells;
        }
        return null;
      }
      function tryMove(b, col, who) { var r = rowFor(b, col); if (r < 0) return null; var nb = b.slice(); nb[r * COLS + col] = who; return nb; }
      function cpuPick() {
        var ok = []; for (var col = 0; col < COLS; col++) if (rowFor(bd, col) >= 0) ok.push(col);
        var i, nb;
        for (i = 0; i < ok.length; i++) { nb = tryMove(bd, ok[i], 2); if (winAt(nb, 2)) return ok[i]; }
        if (c.level > 1 || Math.random() < 0.6) for (i = 0; i < ok.length; i++) { nb = tryMove(bd, ok[i], 1); if (winAt(nb, 1)) return ok[i]; }
        var safe = ok;
        if (c.level > 2) { safe = ok.filter(function (col) { var b2 = tryMove(bd, col, 2); for (var k = 0; k < COLS; k++) { var b3 = tryMove(b2, k, 1); if (b3 && winAt(b3, 1)) return false; } return true; }); if (!safe.length) safe = ok; }
        safe.sort(function (a, b) { return Math.abs(a - 3) - Math.abs(b - 3) + c.rnd(-1.6, 1.6); }); return safe[0];
      }
      function place(col, who) { var r = rowFor(bd, col); if (r < 0) return false; drop = { col: col, row: r, who: who, y: -1 }; return true; }
      function landed() {
        bd[drop.row * COLS + drop.col] = drop.who; c.fx('place'); var who = drop.who; drop = null; var wc = winAt(bd, who);
        if (wc) { winCells = wc; wait = 1.6; if (who === 1) { wins++; c.add(300 * c.level, W / 2, 90, '#ffe680'); c.fx('clear'); c.say('FOUR IN A ROW!', null, 1.3); c.levelUp(true); if (wins % 2 === 1) c.ore(null, W / 2, 70); } else { c.say('RUMBLE WINS', null, 1.3); c.hit(W / 2, 90); } return; }
        if (bd.every(function (v) { return v; })) { c.say('A DRAW!', null, 1.2); c.add(50); wait = 1.4; return; }
        turn = who === 1 ? 2 : 1; if (turn === 2) think = 0.55;
      }
      setup();
      return {
        tap: function (px) { if (turn !== 1 || drop || wait > 0) return; var col = c.clamp(Math.floor((px - OX) / CS), 0, COLS - 1); hover = col; if (!place(col, 1)) c.fx('nope'); },
        drag: function (px) { hover = c.clamp(Math.floor((px - OX) / CS), 0, COLS - 1); },
        lines: function () { return [['Games won', wins]]; },
        update: function (dt) {
          if (wait > 0) { wait -= dt; if (wait <= 0 && !c.done) setup(); return; }
          if (drop) { drop.y += dt * 16; if (drop.y >= drop.row) landed(); return; }
          if (turn === 2) { think -= dt; if (think <= 0) place(cpuPick(), 2); }
        },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H);
          if (turn === 1 && !drop && wait <= 0) { g.globalAlpha = 0.6; piece(g, 1, OX + hover * CS + 5, OY - 44, CS - 10); g.globalAlpha = 1; }
          g.fillStyle = '#2a3d7a'; g.fillRect(OX - 5, OY - 5, COLS * CS + 10, ROWS * CS + 10);
          for (var i = 0; i < bd.length; i++) {
            var x = OX + (i % COLS) * CS, y = OY + Math.floor(i / COLS) * CS; g.fillStyle = '#131a33'; g.fillRect(x + 3, y + 3, CS - 6, CS - 6);
            if (bd[i]) { piece(g, bd[i], x + 4, y + 4, CS - 8); if (winCells && winCells.indexOf(i) >= 0 && Math.floor(c.time * 6) % 2) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, CS - 6, CS - 6); } }
          }
          if (drop) piece(g, drop.who, OX + drop.col * CS + 4, OY + Math.min(drop.y, drop.row) * CS + 4, CS - 8);
          c.mon(g, 'rumble', W - 46, 30, 30, 1); c.block(g, T.MAGMA, W - 70, 38, 16); c.hero(g, 12, 30, 30, 'right', 0); piece(g, 1, 46, 38, 16);
          c.ctext(g, turn === 1 ? 'YOUR TURN' : 'RUMBLE THINKS...', W / 2, 40, 1, turn === 1 ? '#7dff8a' : '#ff9a5a');
        }
      };
    }
  });

  // ---------- Flip Stones: trap Rumble's blocks between yours to flip them ----------
  R({
    id: 'reversi', name: 'Flip Stones', cat: 'brain', medals: [300, 1200, 3000], music: 'forest',
    blurb: 'Place a diamond so Rumble\'s magma blocks are trapped in a line between two of yours — they all flip!',
    pet: [18, 418],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#1f5a2e'; g.fillRect(8, 0, 48, 48); var b = '000000001200012210021120002100000000';
      for (var i = 0; i < 36; i++) { var x = 8 + (i % 6) * 8, y = Math.floor(i / 6) * 8; g.strokeStyle = '#123'; g.strokeRect(x + 0.5, y + 0.5, 8, 8); if (b[i] !== '0') g.drawImage(tex.blocks[b[i] === '1' ? T.DIAMOND : T.MAGMA].top, 0, 0, 16, 16, x + 1, y + 1, 6, 6); }
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, N = 6, CS = 48, OX = 16, OY = 76, bd, turn, think = 0, wait = 0, wins = 0, last = -1;
      var D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], WT = [9, 1, 4, 4, 1, 9, 1, 0, 2, 2, 0, 1, 4, 2, 3, 3, 2, 4, 4, 2, 3, 3, 2, 4, 1, 0, 2, 2, 0, 1, 9, 1, 4, 4, 1, 9];
      function setup() { bd = []; for (var i = 0; i < N * N; i++) bd.push(0); bd[14] = bd[21] = 2; bd[15] = bd[20] = 1; turn = 1; last = -1; }
      function flips(b, i, who) {
        if (b[i]) return []; var x = i % N, y = Math.floor(i / N), out = [];
        D8.forEach(function (d) { var line = [], nx = x + d[0], ny = y + d[1]; while (nx >= 0 && ny >= 0 && nx < N && ny < N && b[ny * N + nx] === 3 - who) { line.push(ny * N + nx); nx += d[0]; ny += d[1]; } if (line.length && nx >= 0 && ny >= 0 && nx < N && ny < N && b[ny * N + nx] === who) out = out.concat(line); });
        return out;
      }
      function moves(who) { var m = []; for (var i = 0; i < N * N; i++) { var f = flips(bd, i, who); if (f.length) m.push({ i: i, f: f }); } return m; }
      function count(who) { return bd.filter(function (v) { return v === who; }).length; }
      function play(i, who) { var f = flips(bd, i, who); if (!f.length) return false; bd[i] = who; f.forEach(function (j) { bd[j] = who; }); last = i; c.fx('place'); c.K.burst(OX + (i % N) * CS + CS / 2, OY + Math.floor(i / N) * CS + CS / 2, who === 1 ? '#7df9ff' : '#ff8a1f', 6, 90); return true; }
      function nextTurn(who) {
        var other = 3 - who;
        if (moves(other).length) { turn = other; if (turn === 2) think = 0.7; return; }
        if (moves(who).length) { c.say(other === 1 ? 'NO MOVE - RUMBLE AGAIN' : 'RUMBLE IS STUCK!', null, 1); turn = who; if (turn === 2) think = 1.1; return; }
        var me = count(1), ru = count(2); turn = 0; wait = 2;
        if (me > ru) { wins++; c.add(400 * c.level + (me - ru) * 10, W / 2, 60, '#ffe680'); c.fx('clear'); c.say('YOU WIN ' + me + '-' + ru, null, 1.8); c.levelUp(true); c.ore(null, W / 2, 40); }
        else if (me === ru) { c.say('A DRAW!', null, 1.8); c.add(100); }
        else { c.say('RUMBLE WINS ' + ru + '-' + me, null, 1.8); c.hit(W / 2, 60); }
      }
      setup();
      return {
        tap: function (px, py) { if (turn !== 1 || wait > 0) return; var x = Math.floor((px - OX) / CS), y = Math.floor((py - OY) / CS); if (x < 0 || y < 0 || x >= N || y >= N) return; if (!play(y * N + x, 1)) { c.fx('nope'); return; } nextTurn(1); },
        lines: function () { return [['Games won', wins]]; },
        update: function (dt) {
          if (wait > 0) { wait -= dt; if (wait <= 0 && !c.done) setup(); return; }
          if (turn !== 2) return; think -= dt; if (think > 0) return;
          var m = moves(2); if (!m.length) { nextTurn(2); return; }
          var smart = Math.min(1, 0.35 + c.level * 0.2);
          m.forEach(function (o) { o.s = o.f.length + (Math.random() < smart ? WT[o.i] * 2 : 0) + Math.random() * 2; }); m.sort(function (a, b) { return b.s - a.s; });
          play(m[0].i, 2); nextTurn(2);
        },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H); g.fillStyle = '#0c080f'; g.fillRect(OX - 4, OY - 4, N * CS + 8, N * CS + 8);
          var hint = turn === 1 ? moves(1) : [];
          for (var i = 0; i < N * N; i++) {
            var x = OX + (i % N) * CS, y = OY + Math.floor(i / N) * CS; g.fillStyle = (i % N + Math.floor(i / N)) % 2 ? '#1f5a2e' : '#256b36'; g.fillRect(x + 1, y + 1, CS - 2, CS - 2);
            if (bd[i]) { c.block(g, bd[i] === 1 ? T.DIAMOND : T.MAGMA, x + 6, y + 6, CS - 12); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 6, y + CS - 10, CS - 12, 4); if (i === last) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(x + 5, y + 5, CS - 10, CS - 10); } }
          }
          g.fillStyle = 'rgba(255,255,255,0.35)'; hint.forEach(function (m) { g.fillRect(OX + (m.i % N) * CS + CS / 2 - 4, OY + Math.floor(m.i / N) * CS + CS / 2 - 4, 8, 8); });
          c.block(g, T.DIAMOND, 16, 30, 20); c.text(g, 'YOU ' + count(1), 42, 34, 2, '#7df9ff'); c.block(g, T.MAGMA, 170, 30, 20); c.text(g, 'RUMBLE ' + count(2), 196, 34, 2, '#ff9a5a');
          c.ctext(g, turn === 1 ? 'YOUR TURN - TAP A DOT' : turn === 2 ? 'RUMBLE THINKS...' : '', W / 2, 58, 1, '#fff');
        }
      };
    }
  });

  // ---------- Word Miner: guess the hidden word a letter at a time ----------
  var WORDS = [
    'CAVE', 'GOLD', 'IRON', 'COAL', 'ROCK', 'WOLF', 'BLOCK', 'STONE', 'MINER', 'EMBER', 'SLIME', 'TORCH', 'CHEST', 'SWORD', 'ARROW', 'CRAFT', 'LADDER', 'TUNNEL', 'PORTAL', 'ARCADE',
    'DIAMOND', 'CRYSTAL', 'PICKAXE', 'MONSTER', 'MINECART', 'TREASURE', 'EMERALD', 'CHEETAH', 'VOLCANO', 'COMPASS', 'LANTERN', 'BOULDER', 'CAVERN', 'DRAGON', 'ROCKET', 'METEOR', 'PUZZLE', 'JOYSTICK',
    'ADVENTURE', 'LABYRINTH', 'EXPLOSION', 'BLUEPRINT', 'STALACTITE', 'GEMSTONE', 'HIGHSCORE', 'AVALANCHE', 'TELESCOPE', 'MYSTERY', 'SAPPHIRE', 'OBSIDIAN', 'QUARTZ', 'WIZARD', 'KNIGHT', 'CASTLE', 'BRIDGE', 'ISLAND', 'JUNGLE', 'PIRATE', 'SHIELD', 'HAMMER'
  ];
  R({
    id: 'wordminer', name: 'Word Miner', cat: 'brain', medals: [300, 1000, 2500], music: 'caves',
    blurb: 'A secret word is buried in the rock. Guess its letters! Six wrong guesses and the tunnel caves in.',
    pet: [18, 196],
    thumb: function (g, w, h, tex, T) {
      for (var x = 0; x < w; x += 16) g.drawImage(tex.blocks[T.STONE].top, x, 0); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, w, 16);
      'G?LD'.split('').forEach(function (ch, i) { g.fillStyle = '#fbf7ff'; g.fillRect(6 + i * 14, 20, 12, 14); PCTex.drawText(g, ch, 9 + i * 14, 24, 1, ch === '?' ? '#b9adc6' : '#1b1822'); }); g.drawImage(tex.picks[2], 24, 0, 14, 14);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, word, shown, used, wrong, wait = 0, solvedN = 0, pool = [], KX = 9, KY = 222, KW = 43, KH = 38, ROWS = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZ'];
      function setup() {
        var lo = c.level < 3 ? 4 : c.level < 5 ? 5 : 6, hi = c.level < 2 ? 5 : c.level < 4 ? 7 : 10;
        pool = WORDS.filter(function (w2) { return w2.length >= lo && w2.length <= hi; }); word = c.pick(pool); shown = word.split('').map(function () { return false; }); used = {}; wrong = 0;
      }
      function guess(ch) {
        if (wait > 0 || used[ch]) return; used[ch] = 1; var hit = false;
        word.split('').forEach(function (l, i) { if (l === ch) { shown[i] = true; hit = true; } });
        if (hit) { c.fx('mined', { tile: T.STONE }); c.add(10 * c.level); if (shown.every(function (v) { return v; })) { solvedN++; c.add((100 + (6 - wrong) * 25) * c.level, W / 2, 110, '#ffe680'); c.fx('clear'); c.say('YOU GOT IT!', null, 1.1); if (solvedN % 3 === 0) { c.levelUp(true); c.ore(null, W / 2, 80); } wait = 1.4; } }
        else { wrong++; used[ch] = 2; c.fx('crumble'); c.shake = 0.15; if (wrong >= 6) { shown = shown.map(function () { return true; }); c.say('CAVE IN!', 'IT WAS ' + word, 1.6); if (!c.hit(W / 2, 100)) wait = 1.8; } }
      }
      setup();
      return {
        tap: function (px, py) { var r = Math.floor((py - KY) / KH), k = Math.floor((px - KX - (r === 3 ? KW : 0)) / KW); if (r < 0 || r > 3 || k < 0 || k >= ROWS[r].length) return; guess(ROWS[r][k]); },
        lines: function () { return [['Words found', solvedN]]; },
        update: function (dt) { if (wait > 0) { wait -= dt; if (wait <= 0 && !c.done) setup(); } },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H); c.fill(g, T.STONE, 0, 22, W, 176, 16); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 22, W, 176);
          for (var i = 0; i < 6; i++) { var bx = 40 + i * 42; if (i < wrong) { c.block(g, T.COBBLE, bx, 34, 34); g.drawImage(c.tex.cracks[3], 0, 0, 16, 16, bx, 34, 34, 34); } else { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(bx, 34, 34, 34); } }
          c.ctext(g, (6 - wrong) + ' MISSES LEFT', W / 2, 76, 1, wrong >= 4 ? '#ff7a6a' : '#fff');
          var n = word.length, lw = Math.min(30, Math.floor((W - 16) / n)), ox = (W - n * lw) / 2, sc = lw >= 26 ? 3 : 2;
          word.split('').forEach(function (l, k) { var x = ox + k * lw; g.fillStyle = shown[k] ? '#fbf7ff' : '#3a3140'; g.fillRect(x + 1, 110, lw - 2, 40); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 1, 146, lw - 2, 4); if (shown[k]) PCTex.drawText(g, l, Math.round(x + lw / 2 - PCTex.textWidth(l, sc) / 2), sc === 3 ? 119 : 123, sc, '#1b1822'); });
          c.ctext(g, 'WORD ' + (solvedN + 1), W / 2, 166, 1, '#ffe680');
          ROWS.forEach(function (row, r) { row.split('').forEach(function (ch, k) { var x = KX + k * KW + (r === 3 ? KW : 0), y = KY + r * KH, u = used[ch]; g.fillStyle = '#0c080f'; g.fillRect(x + 1, y + 1, KW - 2, KH - 2); g.fillStyle = u === 1 ? '#2f6b1f' : u === 2 ? '#3a2226' : '#85858a'; g.fillRect(x + 3, y + 3, KW - 6, KH - 6); if (!u) { g.fillStyle = '#b3b3b8'; g.fillRect(x + 3, y + 3, KW - 6, 3); } c.ctext(g, ch, x + KW / 2, y + 11, 2, u ? '#8a8494' : '#fff'); }); });
        }
      };
    }
  });

  // ---------- Math Mine: tap the right answer to break the block ----------
  R({
    id: 'mathmine', name: 'Math Mine', cat: 'brain', medals: [300, 1200, 3500], music: 'desert',
    blurb: 'Each block has a sum on it. Tap the right answer before the fuse burns down to mine it!',
    pet: [18, 418],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#241c2c'; g.fillRect(0, 0, w, h); g.drawImage(tex.blocks[T.GOLD].top, 0, 0, 16, 16, 14, 2, 36, 22); PCTex.drawText(g, '7+5', 23, 9, 1, '#fff', '#000');
      ['11', '12', '13', '10'].forEach(function (s, i) { g.fillStyle = i === 1 ? '#479a2c' : '#85858a'; g.fillRect(3 + i * 15, 30, 13, 13); PCTex.drawText(g, s, 4 + i * 15, 33, 1, '#fff', '#000'); });
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, q, t, tmax, right = 0, streak = 0, wait = 0, picked = -1, BX = 20, BY = 232, BW = 136, BH = 78;
      var SKIN = [T.STONE, T.COAL, T.IRON, T.GOLD, T.DIAMOND, T.EMBER];
      function make() {
        var L = c.level, a, b, ans, txt, kind = L < 2 ? 0 : L < 3 ? c.ri(2) : L < 5 ? c.ri(3) : c.ri(4);
        if (kind === 0) { a = 1 + c.ri(L < 2 ? 9 : 20 + L * 4); b = 1 + c.ri(L < 2 ? 9 : 15 + L * 3); ans = a + b; txt = a + ' + ' + b; }
        else if (kind === 1) { a = 4 + c.ri(12 + L * 5); b = 1 + c.ri(a - 1); ans = a - b; txt = a + ' - ' + b; }
        else if (kind === 2) { a = 2 + c.ri(L < 5 ? 4 : 9); b = 2 + c.ri(L < 6 ? 9 : 11); ans = a * b; txt = a + ' x ' + b; }
        else { b = 2 + c.ri(8); ans = 2 + c.ri(9); a = b * ans; txt = a + ' / ' + b; }
        var opts = [ans]; while (opts.length < 4) { var o = ans + c.pick([-10, -3, -2, -1, 1, 2, 3, 10]); if (o >= 0 && opts.indexOf(o) < 0) opts.push(o); }
        q = { txt: txt, ans: ans, opts: c.shuffle(opts) }; tmax = t = Math.max(3.2, 8 - L * 0.5); picked = -1;
      }
      function answer(i) {
        if (wait > 0) return; picked = i; wait = 0.55;
        if (q.opts[i] === q.ans) { right++; streak++; c.add(Math.round((10 + t / tmax * 20) * c.level) + Math.min(50, streak * 2), W / 2, 150, '#ffe680'); c.fx('mined', { tile: T.STONE, drop: 1 }); c.K.burst(W / 2, 120, '#c9ccd4', 12, 170); if (right % 8 === 0) { c.levelUp(); c.ore(null, W / 2, 80); } }
        else { streak = 0; c.hit(W / 2, 120); }
      }
      make();
      return {
        tap: function (px, py) { for (var i = 0; i < 4; i++) { var x = BX + (i % 2) * (BW + 8), y = BY + Math.floor(i / 2) * (BH + 8); if (px >= x && px < x + BW && py >= y && py < y + BH) answer(i); } },
        lines: function () { return [['Right answers', right]]; },
        update: function (dt) {
          if (wait > 0) { wait -= dt; if (wait <= 0 && !c.done) make(); return; }
          t -= dt; if (t <= 0) { streak = 0; picked = -2; wait = 0.7; c.fx('boom'); c.hit(W / 2, 120); }
        },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H);
          var hitOk = wait > 0 && picked >= 0 && q.opts[picked] === q.ans;
          if (!hitOk) { c.block(g, SKIN[Math.min(5, c.level - 1)], 40, 60, 240, 120); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(40, 60, 240, 120); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(40, 60, 240, 5); c.ctext(g, q.txt, W / 2, 100, q.txt.length > 7 ? 4 : 5, '#fff'); }
          g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(40, 192, 240, 10); g.fillStyle = t / tmax < 0.3 ? '#ff7a6a' : '#ffd23b'; g.fillRect(40, 192, 240 * Math.max(0, t / tmax), 10);
          q.opts.forEach(function (o, i) {
            var x = BX + (i % 2) * (BW + 8), y = BY + Math.floor(i / 2) * (BH + 8), col = '#85858a';
            if (wait > 0) { if (o === q.ans) col = '#479a2c'; else if (i === picked) col = '#b3322a'; }
            g.fillStyle = '#0c080f'; g.fillRect(x, y, BW, BH); g.fillStyle = col; g.fillRect(x + 3, y + 3, BW - 6, BH - 6); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 3, y + 3, BW - 6, 4); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 3, y + BH - 8, BW - 6, 5);
            c.ctext(g, o, x + BW / 2, y + BH / 2 - 14, 4, '#fff');
          });
          if (streak >= 3) c.ctext(g, streak + ' IN A ROW', W / 2, 34, 2, '#ffe680');
        }
      };
    }
  });
})();
