/* Blockcade v4.0 — puzzle pack 2 (all against the clock): Lamp Flip, Slide Tiles, Ice Slide, Pipe Twist, Pixel Picross. */
(function () {
  'use strict';
  var R = PCMini.reg, DX = PCMini.DX, DY = PCMini.DY;
  function solved(c, pts, bonusT, msg) { c.add(pts, c.W / 2, c.H / 2 - 20, '#ffe680'); c.fx('clear'); c.clock = Math.min(c.clockMax, c.clock + bonusT); c.levelUp(true); c.say(msg || 'SOLVED!', '+' + bonusT + ' SECONDS', 1.1); if (c.level % 2 === 1) c.ore(null, c.W / 2, c.H / 2 - 50); }

  // ---------- Lamp Flip: light every lamp ----------
  R({
    id: 'lamps', name: 'Lamp Flip', cat: 'puzzle', medals: [300, 1000, 2500], music: 'crystal', lives: 0, clock: 90,
    blurb: 'Tap a lamp to flip it AND its four neighbours. Light up every lamp before time runs out.',
    pet: [18, 418],
    thumb: function (g, w, h, tex, T) { for (var y = 0; y < 3; y++) for (var x = 0; x < 4; x++) { var on = (x + y * 2) % 3 !== 0; g.drawImage(tex.blocks[on ? T.GOLD : T.BASALT].top, 0, 0, 16, 16, 4 + x * 14, 3 + y * 14, 13, 13); if (on) { g.fillStyle = 'rgba(255,240,140,0.45)'; g.fillRect(4 + x * 14, 3 + y * 14, 13, 13); } } },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, N = 5, CS = 58, OX = 15, OY = 70, cells, moves, wait = 0, done = 0;
      function flip(i) { var x = i % N, y = Math.floor(i / N); cells[i] ^= 1; for (var d = 0; d < 4; d++) { var nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < N && ny < N) cells[ny * N + nx] ^= 1; } }
      function setup() { cells = []; for (var i = 0; i < N * N; i++) cells.push(1); var k = Math.min(12, 2 + c.level), used = {}; while (k > 0) { var j = c.ri(N * N); if (used[j]) continue; used[j] = 1; flip(j); k--; } if (cells.every(function (v) { return v; })) flip(12); moves = 0; }
      setup();
      return {
        tap: function (px, py) {
          if (wait > 0) return; var x = Math.floor((px - OX) / CS), y = Math.floor((py - OY) / CS); if (x < 0 || y < 0 || x >= N || y >= N) return;
          flip(y * N + x); moves++; c.fx('click');
          if (cells.every(function (v) { return v; })) { done++; solved(c, Math.max(60, 300 - moves * 8) * c.level, 25, 'ALL LIT!'); wait = 1.1; }
        },
        lines: function () { return [['Boards lit', done]]; },
        update: function (dt) { if (wait > 0) { wait -= dt; if (wait <= 0) setup(); } },
        draw: function (g) {
          g.fillStyle = '#16122a'; g.fillRect(0, 0, W, H);
          cells.forEach(function (v, i) { var x = OX + (i % N) * CS, y = OY + Math.floor(i / N) * CS; g.fillStyle = '#0c080f'; g.fillRect(x + 1, y + 1, CS - 2, CS - 2); c.block(g, v ? T.GOLD : T.BASALT, x + 4, y + 4, CS - 8); if (v) { g.fillStyle = 'rgba(255,240,140,' + (0.4 + Math.sin(c.time * 4 + i) * 0.1) + ')'; g.fillRect(x + 4, y + 4, CS - 8, CS - 8); } else { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 4, y + 4, CS - 8, CS - 8); } });
          c.text(g, 'LIGHT THEM ALL', 15, 34, 2, '#ffe680'); c.text(g, 'MOVES ' + moves, 15, 52, 1, '#fff');
        }
      };
    }
  });

  // ---------- Slide Tiles: put the numbered blocks back in order ----------
  R({
    id: 'slide', name: 'Slide Tiles', cat: 'puzzle', medals: [300, 1000, 2500], music: 'snow', lives: 0, clock: 100,
    blurb: 'Tap a block next to the gap to slide it. Put the numbers back in order, 1 first.',
    pet: [18, 418],
    thumb: function (g, w, h, tex, T) { [1, 2, 3, 4, 0, 6, 7, 5, 8].forEach(function (v, i) { if (!v) return; var x = 12 + (i % 3) * 14, y = 3 + Math.floor(i / 3) * 14; g.drawImage(tex.blocks[T.PLANKS].top, 0, 0, 16, 16, x, y, 13, 13); PCTex.drawText(g, String(v), x + 4, y + 3, 1, '#fff', '#000'); }); },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, N, cells, CS, OX, OY = 76, moves, wait = 0, done = 0;
      var SKIN = [T.PLANKS, T.SANDSTONE, T.ICE, T.CLAY];
      function hole() { return cells.indexOf(0); }
      function move(i) { var hl = hole(), dx = Math.abs(i % N - hl % N), dy = Math.abs(Math.floor(i / N) - Math.floor(hl / N)); if (dx + dy !== 1) return false; cells[hl] = cells[i]; cells[i] = 0; return true; }
      function isDone() { for (var i = 0; i < N * N - 1; i++) if (cells[i] !== i + 1) return false; return true; }
      function setup() {
        N = c.level >= 4 ? 4 : 3; cells = []; for (var i = 1; i < N * N; i++) cells.push(i); cells.push(0);
        var n = 14 + c.level * 10, last = -1;
        while (n > 0 || isDone()) { var hl = hole(), opts = []; for (var d = 0; d < 4; d++) { var x = hl % N + DX[d], y = Math.floor(hl / N) + DY[d]; if (x >= 0 && y >= 0 && x < N && y < N && y * N + x !== last) opts.push(y * N + x); } var pk = c.pick(opts); last = hl; move(pk); n--; }
        CS = Math.floor(288 / N); OX = (W - CS * N) / 2; moves = 0;
      }
      setup();
      return {
        tap: function (px, py) {
          if (wait > 0) return; var x = Math.floor((px - OX) / CS), y = Math.floor((py - OY) / CS); if (x < 0 || y < 0 || x >= N || y >= N) return;
          if (!move(y * N + x)) { c.fx('nope'); return; } moves++; c.fx('place');
          if (isDone()) { done++; solved(c, (N === 4 ? 600 : 250) * c.level, N === 4 ? 60 : 30, 'IN ORDER!'); wait = 1.1; }
        },
        lines: function () { return [['Puzzles solved', done]]; },
        update: function (dt) { if (wait > 0) { wait -= dt; if (wait <= 0) setup(); } },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H); g.fillStyle = '#0c080f'; g.fillRect(OX - 6, OY - 6, CS * N + 12, CS * N + 12);
          cells.forEach(function (v, i) { if (!v) return; var x = OX + (i % N) * CS, y = OY + Math.floor(i / N) * CS, ok = v === i + 1; c.block(g, SKIN[Math.floor((v - 1) / N) % 4], x + 2, y + 2, CS - 4); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x + 2, y + 2, CS - 4, 4); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 2, y + CS - 7, CS - 4, 5); c.ctext(g, v, x + CS / 2, y + CS / 2 - 14, 4, ok ? '#7dff8a' : '#fff'); });
          c.text(g, 'MOVES ' + moves, OX, 34, 2, '#ffe680'); c.text(g, '1 GOES TOP LEFT', OX, 54, 1, '#fff');
        }
      };
    }
  });

  // ---------- Ice Slide: you only stop when you hit something ----------
  R({
    id: 'iceslide', name: 'Ice Slide', cat: 'puzzle', medals: [800, 2500, 6000], music: 'snow', lives: 0, clock: 90,
    blurb: 'On the ice you slide until you bump into something. Swipe your way to the emerald.',
    controls: { dpad: true, a: null, b: null }, pet: [18, 418],
    thumb: function (g, w, h, tex, T) { for (var y = 0; y < h; y += 16) for (var x = 0; x < w; x += 16) g.drawImage(tex.blocks[T.ICE].top, x, y); [[16, 0], [48, 16], [0, 32]].forEach(function (p) { g.drawImage(tex.blocks[T.COBBLE].top, p[0], p[1]); }); g.drawImage(PCTex.hero(PCTex.LOOK_DEFAULT).right[1], 2, 15, 14, 14); g.fillStyle = '#5ef0a8'; g.fillRect(38, 20, 7, 7); },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, COLS = 9, ROWS = 10, CS = 34, OX = 7, OY = 60, rock, p, goal, par, moves, anim = null, face = 2, wait = 0, done = 0, start;
      function blocked(x, y) { return x < 0 || y < 0 || x >= COLS || y >= ROWS || rock[y * COLS + x]; }
      function slideFrom(x, y, d) { while (!blocked(x + DX[d], y + DY[d])) { x += DX[d]; y += DY[d]; } return [x, y]; }
      function setup() {
        for (var tries = 0; tries < 200; tries++) {
          rock = []; for (var i = 0; i < COLS * ROWS; i++) rock.push(Math.random() < 0.15 ? 1 : 0);
          var sx = c.ri(COLS), sy = c.ri(ROWS); rock[sy * COLS + sx] = 0;
          var dist = {}, q = [[sx, sy]]; dist[sy * COLS + sx] = 0; var far = null;
          while (q.length) { var cur = q.shift(), cd = dist[cur[1] * COLS + cur[0]]; for (var d = 0; d < 4; d++) { var e = slideFrom(cur[0], cur[1], d), id = e[1] * COLS + e[0]; if (dist[id] == null) { dist[id] = cd + 1; q.push(e); } } }
          var want = Math.max(2, Math.min(7, 2 + Math.ceil(c.level / 2)) - Math.floor(tries / 30)), cands = Object.keys(dist).filter(function (k) { return dist[k] === want; });
          if (!cands.length) continue; far = +c.pick(cands);
          p = { x: sx, y: sy }; start = { x: sx, y: sy }; goal = { x: far % COLS, y: Math.floor(far / COLS) }; par = want; moves = 0; anim = null; return;
        }
      }
      function go(d) {
        if (d < 0 || anim || wait > 0) return; var e = slideFrom(p.x, p.y, d); face = d; if (e[0] === p.x && e[1] === p.y) { c.fx('nope'); return; }
        anim = { fx: p.x, fy: p.y, tx: e[0], ty: e[1], t: 0, dur: 0.05 * (Math.abs(e[0] - p.x) + Math.abs(e[1] - p.y)) + 0.04 }; moves++; c.fx('hop');
      }
      setup();
      return {
        dir: go, up: function () { go(PCMini.swipe(c)); }, lines: function () { return [['Emeralds reached', done]]; },
        b: function () { }, update: function (dt) {
          if (wait > 0) { wait -= dt; if (wait <= 0) setup(); return; }
          if (!anim) return; anim.t += dt; if (anim.t < anim.dur) return;
          p.x = anim.tx; p.y = anim.ty; anim = null; c.fx('hit', { tile: T.ICE });
          if (p.x === goal.x && p.y === goal.y) { done++; solved(c, (moves <= par ? 300 : 150) * c.level, 22, moves <= par ? 'PERFECT!' : 'GOT IT!'); wait = 1.1; }
          else if (moves >= par + 6) { c.say('TRY AGAIN', null, 0.8); p.x = start.x; p.y = start.y; moves = 0; }
        },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H);
          for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) { c.block(g, T.ICE, OX + x * CS, OY + y * CS, CS); if (rock[y * COLS + x]) { c.block(g, T.COBBLE, OX + x * CS + 1, OY + y * CS - 3, CS - 2); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(OX + x * CS + 1, OY + y * CS + CS - 6, CS - 2, 4); } }
          var gx = OX + goal.x * CS + CS / 2, gy = OY + goal.y * CS + CS / 2 + Math.sin(c.time * 5) * 2; g.fillStyle = '#1d6b4a'; g.fillRect(gx - 8, gy - 7, 16, 16); g.fillStyle = '#5ef0a8'; g.fillRect(gx - 7, gy - 8, 14, 14); g.fillStyle = '#c8ffe4'; g.fillRect(gx - 5, gy - 6, 4, 4);
          var px = p.x, py = p.y; if (anim) { var f = Math.min(1, anim.t / anim.dur); px = anim.fx + (anim.tx - anim.fx) * f; py = anim.fy + (anim.ty - anim.fy) * f; }
          c.hero(g, OX + px * CS + 3, OY + py * CS + 1, CS - 6, ['up', 'left', 'down', 'right'][face], anim ? 1 : 0);
          c.text(g, 'MOVES ' + moves + '  BEST ' + par, OX, 30, 2, moves <= par ? '#7dff8a' : '#ffe680'); c.text(g, 'SWIPE TO SLIDE', OX, 48, 1, '#fff');
        }
      };
    }
  });

  // ---------- Pipe Twist: turn the pipes so water reaches the drain ----------
  R({
    id: 'pipes', name: 'Pipe Twist', cat: 'puzzle', medals: [300, 1000, 2500], music: 'caves', lives: 0, clock: 90,
    blurb: 'Tap a pipe to turn it. Join the pipes so the water flows from the tap all the way to the drain.',
    pet: [18, 418],
    thumb: function (g, w, h, tex, T) { for (var y = 0; y < h; y += 16) for (var x = 0; x < w; x += 16) g.drawImage(tex.blocks[T.STONE].top, x, y); g.fillStyle = '#3fa7e0'; g.fillRect(0, 6, 24, 5); g.fillRect(19, 6, 5, 22); g.fillRect(19, 24, 26, 5); g.fillStyle = '#8b8b96'; g.fillRect(40, 24, 5, 20); g.fillRect(40, 39, 24, 5); },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, COLS, ROWS, CS, OX, OY, cells, wet, wait = 0, done = 0, taps = 0;
      var BIT = [1, 8, 4, 2];      // opening bits for up, left, down, right (N=1, E=2, S=4, W=8)
      function rot(m) { return ((m << 1) | (m >> 3)) & 15; }
      function flow() {
        wet = {}; if (!(cells[0] & 8)) return false; var st = [0]; wet[0] = 1;
        while (st.length) { var i = st.pop(), x = i % COLS, y = Math.floor(i / COLS); for (var d = 0; d < 4; d++) { if (!(cells[i] & BIT[d])) continue; var nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue; var j = ny * COLS + nx; if (wet[j] || !(cells[j] & BIT[(d + 2) % 4])) continue; wet[j] = 1; st.push(j); } }
        var last = COLS * ROWS - 1; return !!wet[last] && !!(cells[last] & 2);
      }
      function setup() {
        COLS = c.level > 3 ? 5 : 4; ROWS = c.level > 1 ? 5 : 4; CS = Math.floor(Math.min(300 / COLS, 320 / ROWS)); OX = (W - COLS * CS) / 2; OY = 66;
        var path = [0], seen = { 0: 1 }, goal = COLS * ROWS - 1;
        (function walk(i) { if (i === goal) return true; var ds = c.shuffle([0, 1, 2, 3]); for (var k = 0; k < 4; k++) { var x = i % COLS + DX[ds[k]], y = Math.floor(i / COLS) + DY[ds[k]]; if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue; var j = y * COLS + x; if (seen[j]) continue; seen[j] = 1; path.push(j); if (walk(j)) return true; path.pop(); } return false; })(0);
        cells = []; for (var n = 0; n < COLS * ROWS; n++) cells.push(c.pick([5, 10, 3, 6, 12, 9, 7]));
        path.forEach(function (i, k) { var m = 0, pv = k ? path[k - 1] : null, nx = k < path.length - 1 ? path[k + 1] : null; [pv, nx].forEach(function (o) { if (o == null) return; var dx = o % COLS - i % COLS, dy = Math.floor(o / COLS) - Math.floor(i / COLS); m |= dx === 1 ? 2 : dx === -1 ? 8 : dy === 1 ? 4 : 1; }); if (k === 0) m |= 8; if (k === path.length - 1) m |= 2; cells[i] = m; });
        do { for (var q = 0; q < cells.length; q++) { var r = c.ri(4); while (r--) cells[q] = rot(cells[q]); } } while (flow());
        taps = 0;
      }
      setup();
      return {
        tap: function (px, py) {
          if (wait > 0) return; var x = Math.floor((px - OX) / CS), y = Math.floor((py - OY) / CS); if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
          cells[y * COLS + x] = rot(cells[y * COLS + x]); taps++; c.fx('click');
          if (flow()) { done++; c.fx('splash'); solved(c, 200 * c.level + COLS * ROWS * 5, 28, 'IT FLOWS!'); wait = 1.2; }
        },
        lines: function () { return [['Pipes joined', done]]; },
        update: function (dt) { if (wait > 0) { wait -= dt; if (wait <= 0) setup(); } },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H); var pw = Math.round(CS * 0.3), hf = CS / 2;
          g.fillStyle = '#3fa7e0'; g.fillRect(0, OY + hf - pw / 2, OX, pw); g.fillStyle = wet && wet[COLS * ROWS - 1] && (cells[COLS * ROWS - 1] & 2) ? '#3fa7e0' : '#5a5a60'; g.fillRect(OX + COLS * CS, OY + (ROWS - 1) * CS + hf - pw / 2, OX, pw);
          cells.forEach(function (m, i) {
            var x = OX + (i % COLS) * CS, y = OY + Math.floor(i / COLS) * CS, cx = x + hf, cy = y + hf; c.block(g, T.STONE, x + 1, y + 1, CS - 2); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + 1, y + 1, CS - 2, CS - 2);
            [['#2a2a30', 3], [wet && wet[i] ? '#3fa7e0' : '#9a9aa4', 0]].forEach(function (ly) { g.fillStyle = ly[0]; var e = ly[1], t = pw + e * 2; g.fillRect(cx - t / 2, cy - t / 2, t, t); if (m & 1) g.fillRect(cx - t / 2, y, t, hf); if (m & 4) g.fillRect(cx - t / 2, cy, t, hf); if (m & 8) g.fillRect(x, cy - t / 2, hf, t); if (m & 2) g.fillRect(cx, cy - t / 2, hf, t); });
          });
          c.text(g, 'TAP', 2, OY - 12, 1, '#7df9ff'); c.text(g, 'DRAIN', W - 32, OY + ROWS * CS + 4, 1, '#7df9ff'); c.text(g, 'TURNS ' + taps, OX, 34, 2, '#ffe680');
        }
      };
    }
  });

  // ---------- Pixel Picross: fill the squares the numbers describe ----------
  var PICS = [
    ['HEART', '0101011111111110111000100'], ['HOUSE', '0010001110111110101001110'], ['TREE', '0010001110111110010000100'], ['ARROW', '0010001110101010010000100'],
    ['CUP', '1111110001100010111011111'], ['BOAT', '0010000110011101111101110'], ['FISH', '0000001101111110110100000'], ['KEY', '0110010010011000010000110'],
    ['DIAMOND', '0010001110111110111000100'], ['MUSHROOM', '0111011111111110010001110'], ['LADDER', '1000111111100011111110001'], ['FLAG', '1110011110111001000010000'],
    ['CROWN', '1010110101111111111100000'], ['SMILE', '0101001010000001000101110'], ['STAIRS', '0000100011001110111111111'],
    ['PLUS', '0010000100111110010000100'], ['ROCKET', '0010001110011100111010101'], ['DUCK', '0110011100011111111001100'], ['LAMP', '0111001110001000010001110']
  ];
  function clues(bits, n, row) { var out = [], run = 0; for (var k = 0; k < 5; k++) { var v = bits[row ? n * 5 + k : k * 5 + n] === '1'; if (v) run++; else if (run) { out.push(run); run = 0; } } if (run) out.push(run); return out.length ? out : [0]; }
  R({
    id: 'picross', name: 'Pixel Picross', cat: 'puzzle', medals: [300, 1000, 2500], music: 'forest', lives: 3, clock: 120,
    blurb: 'The numbers say how many squares to fill in each row and column. Find the hidden picture! X marks an empty square.',
    controls: { dpad: false, a: null, b: 'X' }, pet: [18, 418],
    thumb: function (g, w, h) { g.fillStyle = '#fbf7ff'; g.fillRect(14, 4, 40, 40); var b = PICS[0][1]; for (var i = 0; i < 25; i++) { g.fillStyle = b[i] === '1' ? '#d8322b' : '#e2dcec'; g.fillRect(15 + (i % 5) * 8, 5 + Math.floor(i / 5) * 8, 7, 7); } },
    make: function (c) {
      var W = c.W, H = c.H, CS = 44, OX = 86, OY = 110, pic, st, xmode = false, wait = 0, done = 0, order = c.shuffle(PICS.slice()), rc, cc, need;
      function setup() { pic = order[done % order.length]; st = []; for (var i = 0; i < 25; i++) st.push(0); rc = []; cc = []; for (var n = 0; n < 5; n++) { rc.push(clues(pic[1], n, true)); cc.push(clues(pic[1], n, false)); } need = pic[1].split('').filter(function (v) { return v === '1'; }).length; xmode = false; }
      setup();
      return {
        b: function () { xmode = !xmode; c.fx('click'); },
        tap: function (px, py) {
          if (wait > 0) return; var x = Math.floor((px - OX) / CS), y = Math.floor((py - OY) / CS); if (x < 0 || y < 0 || x >= 5 || y >= 5) return; var i = y * 5 + x;
          if (xmode) { if (st[i] !== 1) { st[i] = st[i] === 2 ? 0 : 2; c.fx('place'); } return; }
          if (st[i]) return;
          if (pic[1][i] === '1') { st[i] = 1; need--; c.add(10 * c.level); c.fx('mined', { tile: c.T.STONE }); if (need <= 0) { done++; solved(c, 250 * c.level, 40, pic[0] + '!'); wait = 1.6; } }
          else { st[i] = 2; c.hit(px, py); }
        },
        lines: function () { return [['Pictures found', done]]; },
        update: function (dt) { if (wait > 0) { wait -= dt; if (wait <= 0) setup(); } },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H); g.fillStyle = '#0c080f'; g.fillRect(OX - 3, OY - 3, CS * 5 + 6, CS * 5 + 6);
          for (var i = 0; i < 25; i++) { var x = OX + (i % 5) * CS, y = OY + Math.floor(i / 5) * CS; g.fillStyle = st[i] === 1 ? (wait > 0 ? '#f7c936' : '#3fa7e0') : '#fbf7ff'; g.fillRect(x + 2, y + 2, CS - 4, CS - 4); if (st[i] === 1) { g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x + 2, y + 2, CS - 4, 4); } if (st[i] === 2) c.ctext(g, 'x', x + CS / 2, y + CS / 2 - 12, 3, '#b9adc6'); }
          for (var n = 0; n < 5; n++) {
            var r = rc[n].join(' '); c.text(g, r, OX - 8 - PCTex.textWidth(r, 2), OY + n * CS + 15, 2, '#ffe680');
            cc[n].forEach(function (v, k) { c.ctext(g, v, OX + n * CS + CS / 2, OY - 18 - (cc[n].length - 1 - k) * 18, 2, '#ffe680'); });
          }
          c.text(g, xmode ? 'MARKING X' : 'FILLING', 8, 28, 2, xmode ? '#ff7a6a' : '#7dff8a'); c.text(g, 'PICTURE ' + (done + 1), 8, 46, 1, '#fff');
        }
      };
    }
  });
  PCMini.PICS = PICS; PCMini.clues = clues;
})();
