/* Blockcade v4.0 — skill pack: Sky Tower, Soft Landing, Plinko Drop, Slime Golf, Target Range, Beat Blocks. */
(function () {
  'use strict';
  var R = PCMini.reg;

  // ---------- Sky Tower: drop each sliding block square on the stack ----------
  R({
    id: 'towerstack', name: 'Sky Tower', cat: 'skill', medals: [150, 450, 1000], music: 'snow',
    blurb: 'Tap to drop the sliding block. Whatever hangs over the edge falls off. How high can you build?',
    controls: { dpad: false, a: 'DROP', b: null }, pet: [20, 417],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#6fb7ff'; g.fillRect(0, 0, w, h);
      [[14, 40, 36, T.STONE], [16, 32, 32, T.PLANKS], [20, 24, 26, T.GOLD], [22, 16, 22, T.ICE]].forEach(function (b) { g.drawImage(tex.blocks[b[3]].top, 0, 0, 16, 8, b[0], b[1], b[2], 8); });
      g.drawImage(tex.blocks[T.DIAMOND].top, 0, 0, 16, 8, 34, 5, 22, 8);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, BH = 22, stack = [{ x: 70, w: 180, tile: T.STONE }], cur, cam = 0, combo = 0, falls = [];
      var TILES = [T.PLANKS, T.COBBLE, T.SANDSTONE, T.ICE, T.CLAY, T.LOG, T.GOLD, T.BASALT, T.DIAMOND, T.MOSS];
      function next(w) { var left = stack.length % 2 === 0; cur = { x: left ? -w : W, w: w, dir: left ? 1 : -1, tile: TILES[stack.length % TILES.length] }; }
      function drop() {
        var top = stack[stack.length - 1], l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w), ov = r - l;
        if (ov < 5) { combo = 0; falls.push({ x: cur.x, w: cur.w, y: 0, tile: cur.tile }); c.fx('nope'); if (!c.hit(cur.x + cur.w / 2, 120)) next(cur.w); return; }
        var perfect = Math.abs(cur.x - top.x) < 5;
        if (perfect) { l = top.x; ov = top.w; combo++; c.fx('crystal'); } else { combo = 0; c.fx('place'); if (cur.x < top.x) falls.push({ x: cur.x, w: top.x - cur.x, y: 0, tile: cur.tile }); else falls.push({ x: r, w: cur.x + cur.w - r, y: 0, tile: cur.tile }); }
        stack.push({ x: l, w: ov, tile: cur.tile });
        c.add(10 + combo * 5, l + ov / 2, 110, perfect ? '#ffe680' : '#fff');
        if ((stack.length - 1) % 8 === 0) { c.levelUp(); c.ore(null, W / 2, 150); }
        next(ov);
      }
      next(180);
      return {
        tap: drop, a: drop, lines: function () { return [['Blocks stacked', stack.length - 1]]; },
        update: function (dt) {
          cur.x += cur.dir * (120 + c.level * 22 + stack.length * 2) * dt;
          if (cur.x > W - cur.w + 30) cur.dir = -1; if (cur.x < -30) cur.dir = 1;
          cam += (Math.max(0, stack.length - 9) * BH - cam) * Math.min(1, dt * 6);
          falls.forEach(function (f) { f.y += (200 + f.y * 3) * dt; }); falls = falls.filter(function (f) { return f.y < H; });
        },
        draw: function (g) {
          var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a6fd0'); gr.addColorStop(1, '#a8dcff'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
          g.fillStyle = 'rgba(255,255,255,0.7)'; [[30, 90], [210, 160], [120, 250]].forEach(function (cl) { var y = (cl[1] + cam * 0.4) % (H + 40) - 20; g.fillRect(cl[0], y, 60, 12); g.fillRect(cl[0] + 12, y - 8, 30, 8); });
          var base = H - 30 + cam;
          c.fill(g, T.GRASS, 0, base, W, 48, 16);
          stack.forEach(function (b, i) { var y = base - (i + 1) * BH; if (y > H || y < -BH) return; c.block(g, b.tile, b.x, y, b.w, BH); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(b.x, y + BH - 3, b.w, 3); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(b.x, y, b.w, 2); });
          var cy = base - (stack.length + 1) * BH - 4;
          c.block(g, cur.tile, cur.x, cy, cur.w, BH); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(cur.x, cy, cur.w, 2);
          falls.forEach(function (f) { if (f.w > 0) c.block(g, f.tile, f.x, cy + f.y, f.w, BH); });
          c.text(g, (stack.length - 1) + ' HIGH', 6, 26, 2, '#fff'); if (combo > 1) c.ctext(g, 'PERFECT x' + combo, W / 2, 46, 2, '#ffe680');
        }
      };
    }
  });

  // ---------- Soft Landing: set the rocket down gently on the gold pad ----------
  R({
    id: 'lander', name: 'Soft Landing', cat: 'skill', medals: [300, 1200, 3000], music: 'crystal',
    blurb: 'Land the rocket gently on the gold pad. THRUST slows your fall; arrows nudge you sideways.',
    controls: { dpad: 'lr', a: 'THRUST', b: null }, pet: [16, 40],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#0d0b1e'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; [[6, 5], [50, 10], [24, 18]].forEach(function (s) { g.fillRect(s[0], s[1], 1, 1); });
      [[0, 34], [8, 38], [16, 30], [40, 36], [48, 28], [56, 34]].forEach(function (p) { g.drawImage(tex.blocks[T.STONE].top, 0, 0, 16, 16, p[0], p[1], 8, 20); });
      g.drawImage(tex.blocks[T.GOLD].top, 0, 0, 16, 16, 24, 40, 16, 8); g.fillStyle = '#e8e8ee'; g.fillRect(29, 20, 6, 10); g.fillStyle = '#d8322b'; g.fillRect(30, 17, 4, 3); g.fillStyle = '#ff8a1f'; g.fillRect(30, 30, 4, 4);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, CW = 16, N = 20, hts, pad, pw, s, wait = 0, landed = 0;
      function setup() {
        pw = Math.max(2, 5 - Math.floor(c.level / 2)); pad = 1 + c.ri(N - pw - 2); var ph = c.rnd(30, 110); hts = [];
        var hh = c.rnd(40, 120); for (var i = 0; i < N; i++) { hh = c.clamp(hh + c.rnd(-34, 34), 24, 170); hts.push(i >= pad && i < pad + pw ? ph : hh); }
        s = { x: pad < N / 2 ? W - 50 : 50, y: 48, vx: pad < N / 2 ? -22 : 22, vy: 0, fuel: 100 }; wait = 0;
      }
      function gy(x) { return H - hts[c.clamp(Math.floor(x / CW), 0, N - 1)]; }
      setup();
      return {
        lines: function () { return [['Landings', landed]]; },
        update: function (dt) {
          if (wait > 0) { wait -= dt; if (wait <= 0) setup(); return; }
          var th = (c.a || c.touching) && s.fuel > 0, lf = c.dir === 1 || (c.touching && c.tx < s.x - 34), rt = c.dir === 3 || (c.touching && c.tx > s.x + 34);
          if (th) { s.vy -= 150 * dt; s.fuel -= 14 * dt; if (Math.random() < 0.5) c.K.burst(s.x, s.y + 12, '#ff8a1f', 1, 40); }
          if (s.fuel > 0) { if (lf) { s.vx -= 75 * dt; s.fuel -= 4 * dt; } if (rt) { s.vx += 75 * dt; s.fuel -= 4 * dt; } }
          s.th = th; s.vy += (42 + c.level * 6) * dt; s.x += s.vx * dt; s.y += s.vy * dt;
          if (s.x < 8) { s.x = 8; s.vx = Math.abs(s.vx) * 0.4; } if (s.x > W - 8) { s.x = W - 8; s.vx = -Math.abs(s.vx) * 0.4; } if (s.y < 30) { s.y = 30; s.vy = Math.max(0, s.vy); }
          var ground = Math.min(gy(s.x - 6), gy(s.x + 6));
          if (s.y + 10 >= ground) {
            var c1 = Math.floor((s.x - 6) / CW), c2 = Math.floor((s.x + 6) / CW), on = c1 >= pad && c2 < pad + pw;
            if (on && s.vy < 72 && Math.abs(s.vx) < 46) {
              landed++; var bonus = Math.round(s.fuel) * 2; c.add(100 * c.level + bonus, s.x, s.y - 30, '#ffe680'); c.fx('clear'); s.y = ground - 10; s.vx = s.vy = 0; c.levelUp(true); c.say('LANDED!', 'FUEL BONUS ' + bonus, 1.3); if (landed % 2 === 0) c.ore(null, s.x, s.y - 50); wait = 1.5;
            } else { c.fx('boom'); c.K.burst(s.x, s.y, '#ff8a1f', 22, 220); if (!c.hit(s.x, s.y)) { c.say(on ? 'TOO FAST!' : 'MISSED THE PAD', null, 1.1); wait = 1.2; s.y = -100; s.vx = s.vy = 0; } }
          }
        },
        draw: function (g) {
          g.fillStyle = '#0d0b1e'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; for (var i = 0; i < 36; i++) g.fillRect((i * 89) % W, 24 + (i * 53) % 240, 1 + i % 2, 1 + i % 2);
          for (var k = 0; k < N; k++) { var top = H - hts[k], isPad = k >= pad && k < pad + pw; for (var y = top; y < H; y += 16) c.block(g, isPad && y === top ? T.GOLD : T.STONE, k * CW, y, 16); if (isPad) { g.fillStyle = Math.floor(c.time * 4) % 2 ? '#fff3a8' : '#f7c936'; g.fillRect(k * CW, top - 3, CW, 3); } }
          if (s.y > -50) {
            if (s.th) { g.fillStyle = Math.floor(c.time * 16) % 2 ? '#ff8a1f' : '#ffd23b'; g.fillRect(s.x - 3, s.y + 10, 6, 9); }
            g.fillStyle = '#8b8b96'; g.fillRect(s.x - 9, s.y + 4, 4, 7); g.fillRect(s.x + 5, s.y + 4, 4, 7);
            g.fillStyle = '#e8e8ee'; g.fillRect(s.x - 5, s.y - 9, 10, 19); g.fillStyle = '#d8322b'; g.fillRect(s.x - 3, s.y - 14, 6, 6); g.fillStyle = '#3fa7e0'; g.fillRect(s.x - 3, s.y - 5, 6, 5);
          }
          g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(6, 28, 80, 7); g.fillStyle = s.fuel < 25 ? '#ff7a6a' : '#ffd23b'; g.fillRect(6, 28, Math.max(0, s.fuel) * 0.8, 7); c.text(g, 'FUEL', 92, 28, 1);
          var ok = s.vy < 72 && Math.abs(s.vx) < 46; c.text(g, 'SPEED ' + Math.round(Math.hypot(s.vx, s.vy)), 6, 40, 1, ok ? '#7dff8a' : '#ff7a6a');
        }
      };
    }
  });

  // ---------- Plinko Drop: bounce ten balls down the pegs into the buckets ----------
  R({
    id: 'plinko', name: 'Plinko Drop', cat: 'skill', medals: [2000, 8000, 20000], music: 'meadow', lives: 0,
    blurb: 'Slide to aim, let go to drop. Ten slime balls bounce down the pegs — reach the target to play on.',
    controls: { dpad: 'lr', a: 'DROP', b: null }, pet: [16, 60],
    thumb: function (g, w, h, tex) {
      g.fillStyle = '#1e1a30'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9ccd4'; for (var r = 0; r < 4; r++) for (var i = 0; i < 6; i++) g.fillRect(6 + i * 10 + (r % 2) * 5, 8 + r * 8, 2, 2);
      ['#8b8b96', '#f2c230', '#7df9ff', '#f2c230', '#8b8b96'].forEach(function (col, i) { g.fillStyle = col; g.fillRect(2 + i * 12, 40, 11, 8); }); g.fillStyle = '#5ef0a8'; g.fillRect(30, 2, 5, 5);
    },
    make: function (c) {
      var W = c.W, H = c.H, pegs = [], balls = [], ax = W / 2, left = 10, round = 0, target = 0, gotOre = false, BY = H - 34, VALS = [10, 50, 100, 300, 100, 50, 10], BW = W / 7;
      for (var r = 0; r < 9; r++) for (var i = 0; i < (r % 2 ? 7 : 8); i++) pegs.push({ x: (r % 2 ? 40 : 20) + i * 40, y: 96 + r * 30 });
      function start() { left = 10; round = 0; gotOre = false; target = c.level * (700 + 60 * c.level); c.say('TARGET ' + target, '10 BALLS', 1.4); }
      function drop() { if (left <= 0 || balls.length > 2) return; left--; balls.push({ x: ax + c.rnd(-0.5, 0.5), y: 64, vx: c.rnd(-10, 10), vy: 0 }); c.fx('drop'); }
      start();
      return {
        a: drop, up: drop, lines: function () { return [['Round score', round + ' / ' + target]]; },
        update: function (dt) {
          if (c.dir === 1) ax -= 180 * dt; if (c.dir === 3) ax += 180 * dt; if (c.touching) ax = c.tx; ax = c.clamp(ax, 14, W - 14);
          balls.forEach(function (b) {
            for (var st = 0; st < 2; st++) {
              var h = dt / 2; b.vy += 480 * h; b.x += b.vx * h; b.y += b.vy * h;
              if (b.x < 6) { b.x = 6; b.vx = Math.abs(b.vx) * 0.6; } if (b.x > W - 6) { b.x = W - 6; b.vx = -Math.abs(b.vx) * 0.6; }
              pegs.forEach(function (p) {
                var dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy); if (d >= 9 || d === 0) return;
                var nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; b.x = p.x + nx * 9; b.y = p.y + ny * 9;
                if (vn < 0) { b.vx -= 1.55 * vn * nx; b.vy -= 1.55 * vn * ny; b.vx += c.rnd(-14, 14); p.t = 0.15; if (Math.abs(vn) > 60) c.fx('click'); }
              });
            }
            if (b.y > BY) { b.dead = true; var k = c.clamp(Math.floor(b.x / BW), 0, 6), v = VALS[k] * c.level; round += v; c.add(v, b.x, BY - 14, k === 3 ? '#ffe680' : '#fff'); c.fx(k === 3 ? 'crystal' : 'gem'); if (k === 3 && !gotOre) { gotOre = true; c.ore(null, b.x, BY - 34); } }
          });
          balls = balls.filter(function (b) { return !b.dead; }); pegs.forEach(function (p) { if (p.t > 0) p.t -= dt; });
          if (left <= 0 && !balls.length && !c.done) { if (round >= target) { c.levelUp(); start(); } else c.end(false, 'Out of Balls!'); }
        },
        draw: function (g) {
          g.fillStyle = '#1e1a30'; g.fillRect(0, 0, W, H);
          pegs.forEach(function (p) { g.fillStyle = p.t > 0 ? '#ffe680' : '#c9ccd4'; g.fillRect(p.x - 3, p.y - 3, 6, 6); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(p.x - 3, p.y + 1, 6, 2); });
          VALS.forEach(function (v, i) { g.fillStyle = ['#5a5a60', '#b98a4a', '#f2c230', '#3fd0e0', '#f2c230', '#b98a4a', '#5a5a60'][i]; g.fillRect(i * BW + 2, BY, BW - 4, 34); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(i * BW + 2, BY + 26, BW - 4, 8); c.ctext(g, v * c.level, i * BW + BW / 2, BY + 10, 1, '#fff'); });
          g.fillStyle = '#5ef0a8'; balls.forEach(function (b) { g.fillRect(b.x - 5, b.y - 5, 10, 10); });
          if (left > 0) { g.fillStyle = 'rgba(94,240,168,0.5)'; g.fillRect(ax - 5, 58, 10, 10); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(ax - 1, 70, 2, 18); }
          c.text(g, 'BALLS ' + left, 6, 28, 2, '#fff'); c.text(g, round + ' / ' + target, 6, 44, 1, round >= target ? '#7dff8a' : '#ffe680');
        }
      };
    }
  });

  // ---------- Slime Golf: pull back, let go, sink the slime ----------
  R({
    id: 'golf', name: 'Slime Golf', cat: 'skill', medals: [400, 1500, 4000], music: 'meadow',
    blurb: 'Pull back from the slime and let go to putt it. Bank off the blocks and sink it in the hole!',
    pet: [16, 417],
    thumb: function (g, w, h, tex, T) {
      for (var y = 0; y < h; y += 16) for (var x = 0; x < w; x += 16) g.drawImage(tex.blocks[T.GRASS].top, x, y);
      g.drawImage(tex.blocks[T.LOG].top, 0, 0, 16, 16, 26, 16, 12, 12); g.fillStyle = '#140c08'; g.fillRect(48, 8, 8, 8); g.fillStyle = '#d8322b'; g.fillRect(55, 0, 2, 10); g.fillRect(50, 0, 5, 4);
      g.fillStyle = '#5ef0a8'; g.fillRect(10, 36, 6, 6); g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(13, 39); g.lineTo(26, 30); g.stroke();
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, TOP = 26, b, hole, walls, sand, strokes, aim = null, sunk = 0, wait = 0, holes = 0;
      function rectHit(r, x, y, m) { return x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m; }
      function setup() {
        b = { x: c.rnd(40, W - 40), y: H - 50, vx: 0, vy: 0 }; hole = { x: c.rnd(40, W - 40), y: c.rnd(60, 130) }; walls = []; sand = []; strokes = 0; aim = null;
        var n = Math.min(9, 2 + c.level), tries = 0;
        while (walls.length < n && tries++ < 200) { var horiz = Math.random() < 0.6, r = { x: c.rnd(10, W - 110), y: c.rnd(150, H - 130), w: horiz ? c.pick([64, 96]) : 20, h: horiz ? 20 : c.pick([64, 96]) }; if (!rectHit(r, b.x, b.y, 34) && !rectHit(r, hole.x, hole.y, 34) && !walls.some(function (o) { return r.x < o.x + o.w + 26 && r.x + r.w + 26 > o.x && r.y < o.y + o.h + 26 && r.y + r.h + 26 > o.y; })) walls.push(r); }
        if (c.level > 2) sand.push({ x: c.rnd(20, W - 110), y: c.rnd(140, 240), w: 90, h: 50 });
      }
      function moving() { return Math.hypot(b.vx, b.vy) > 4; }
      setup();
      return {
        tap: function (x, y) { if (!moving() && wait <= 0) aim = { x: x, y: y }; },
        drag: function (x, y) { if (aim) { aim.x = x; aim.y = y; } },
        up: function () {
          if (!aim) return; var dx = c.sx - aim.x, dy = c.sy - aim.y, p = Math.min(150, Math.hypot(dx, dy)); aim = null; if (p < 10) return;
          var a = Math.atan2(dy, dx); b.vx = Math.cos(a) * p * 4.2; b.vy = Math.sin(a) * p * 4.2; strokes++; c.fx('bonk');
        },
        lines: function () { return [['Holes sunk', holes]]; },
        update: function (dt) {
          if (wait > 0) { wait -= dt; if (wait <= 0) setup(); return; }
          if (!moving()) { b.vx = b.vy = 0; if (strokes >= 6) { if (!c.hit(b.x, b.y)) { c.say('TOO MANY PUTTS', 'NEXT HOLE', 1.1); wait = 1.2; strokes = 0; } } return; }
          for (var st = 0; st < 3; st++) {
            var h = dt / 3, ox = b.x, oy = b.y; b.x += b.vx * h; b.y += b.vy * h;
            if (b.x < 7) { b.x = 7; b.vx = Math.abs(b.vx) * 0.8; } if (b.x > W - 7) { b.x = W - 7; b.vx = -Math.abs(b.vx) * 0.8; }
            if (b.y < TOP + 7) { b.y = TOP + 7; b.vy = Math.abs(b.vy) * 0.8; } if (b.y > H - 7) { b.y = H - 7; b.vy = -Math.abs(b.vy) * 0.8; }
            walls.forEach(function (r) {
              if (!rectHit(r, b.x, b.y, 6)) return;
              if (!rectHit(r, ox, b.y, 6)) { b.x = ox; b.vx = -b.vx * 0.8; } else if (!rectHit(r, b.x, oy, 6)) { b.y = oy; b.vy = -b.vy * 0.8; } else { b.x = ox; b.y = oy; b.vx = -b.vx * 0.8; b.vy = -b.vy * 0.8; }
              c.fx('click');
            });
          }
          var fr = sand.some(function (r) { return rectHit(r, b.x, b.y, 0); }) ? 4.2 : 1.25; b.vx -= b.vx * fr * dt; b.vy -= b.vy * fr * dt;
          if (Math.hypot(b.x - hole.x, b.y - hole.y) < 11 && Math.hypot(b.vx, b.vy) < 330) {
            holes++; var pts = Math.max(50, (7 - strokes) * 100) * c.level; c.add(pts, hole.x, hole.y - 20, '#ffe680'); c.fx('clear');
            c.say(strokes === 1 ? 'HOLE IN ONE!' : strokes <= 3 ? 'NICE PUTT!' : 'IN THE HOLE', strokes + (strokes === 1 ? ' PUTT' : ' PUTTS'), 1.3);
            if (strokes <= 2) c.ore(null, hole.x, hole.y - 40); c.levelUp(true); b.vx = b.vy = 0; b.x = hole.x; b.y = hole.y; wait = 1.5;
          }
        },
        draw: function (g) {
          c.fill(g, T.GRASS, 0, 0, W, H, 32); g.fillStyle = 'rgba(0,0,0,0.12)'; for (var y = TOP; y < H; y += 64) g.fillRect(0, y, W, 32);
          sand.forEach(function (r) { c.fill(g, T.SAND, r.x, r.y, r.w, r.h, 16); });
          g.fillStyle = '#0c080f'; g.fillRect(hole.x - 10, hole.y - 10, 20, 20); g.fillStyle = '#1b1822'; g.fillRect(hole.x - 8, hole.y - 8, 16, 16); g.fillStyle = '#e8e8ee'; g.fillRect(hole.x + 6, hole.y - 34, 2, 30); g.fillStyle = '#d8322b'; g.fillRect(hole.x + 8, hole.y - 34, 14, 10);
          walls.forEach(function (r) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(r.x + 3, r.y + 4, r.w, r.h); for (var yy = r.y; yy < r.y + r.h; yy += 16) for (var xx = r.x; xx < r.x + r.w; xx += 16) c.block(g, T.LOG, xx, yy, Math.min(16, r.x + r.w - xx), Math.min(16, r.y + r.h - yy)); });
          if (aim) {
            var dx = c.sx - aim.x, dy = c.sy - aim.y, p = Math.min(150, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
            g.fillStyle = '#fff'; for (var i = 1; i <= 6; i++) g.fillRect(b.x + Math.cos(a) * p * i * 0.16 - 2, b.y + Math.sin(a) * p * i * 0.16 - 2, 4, 4);
            g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(W - 14, H - 150, 8, 120); g.fillStyle = p > 110 ? '#ff7a6a' : '#ffe680'; g.fillRect(W - 14, H - 30 - p * 0.8, 8, p * 0.8);
          }
          if (wait <= 0 || Math.floor(c.time * 8) % 2) { g.fillStyle = '#2f8a5a'; g.fillRect(b.x - 7, b.y - 7, 14, 14); g.fillStyle = '#5ef0a8'; g.fillRect(b.x - 6, b.y - 6, 12, 11); g.fillStyle = '#123'; g.fillRect(b.x - 3, b.y - 2, 2, 3); g.fillRect(b.x + 2, b.y - 2, 2, 3); }
          c.text(g, 'HOLE ' + c.level + '  PUTTS ' + strokes + '/6', 6, 28, 1, '#fff');
        }
      };
    }
  });

  // ---------- Target Range: lead the moving targets with your arrows ----------
  R({
    id: 'range', name: 'Target Range', cat: 'skill', medals: [400, 1500, 4000], music: 'forest', lives: 0,
    blurb: 'Tap where the monster is GOING to be — arrows take a moment to fly. Hit enough before you run out!',
    pet: [18, 417],
    thumb: function (g, w, h, tex, T) {
      for (var x = 0; x < w; x += 16) { g.drawImage(tex.blocks[T.PLANKS].top, x, 0); g.drawImage(tex.blocks[T.PLANKS].top, x, 16); g.drawImage(tex.blocks[T.PLANKS].top, x, 32); }
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, w, h); g.drawImage(tex.mons.sly[0], 8, 6, 12, 12); g.drawImage(tex.mons.frost[0], 40, 20, 12, 12); g.fillStyle = '#ffe680'; g.fillRect(31, 28, 2, 12); g.fillStyle = '#6b4f2c'; g.fillRect(22, 44, 20, 3);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, tg = [], arrows = [], ammo, need, hits, sp = 0.5, total = 0, ROWS = [78, 138, 198, 258];
      function start() { ammo = 24; hits = 0; need = 8 + c.level * 2; c.say('HIT ' + need, ammo + ' ARROWS', 1.3); }
      start();
      return {
        tap: function (x, y) { if (ammo <= 0 || y < 40) return; ammo--; var bx = W / 2, by = H - 30, d = Math.hypot(x - bx, y - by); arrows.push({ x: bx, y: by, tx: x, ty: y, t: 0, dur: d / 560 }); c.fx('shoot'); },
        lines: function () { return [['Targets hit', total]]; },
        update: function (dt) {
          sp -= dt;
          if (sp <= 0) { sp = Math.max(0.4, 1.05 - c.level * 0.06); var row = c.ri(ROWS.length), dir = row % 2 ? -1 : 1, r = Math.random(); tg.push({ x: dir > 0 ? -16 : W + 16, y: ROWS[row], vx: dir * (58 + c.level * 9 + row * 10), kind: r < 0.07 ? 'ore' : r < 0.18 ? 'tnt' : c.pick(['sly', 'frost', 'mudge', 'rumble']), ore: c.oreRoll() }); }
          tg.forEach(function (t) { t.x += t.vx * dt; }); tg = tg.filter(function (t) { return !t.dead && t.x > -30 && t.x < W + 30; });
          arrows.forEach(function (a) {
            a.t += dt; if (a.t < a.dur) return; a.dead = true; var hit = null;
            tg.forEach(function (t) { if (!hit && !t.dead && Math.abs(t.x - a.tx) < 15 && Math.abs(t.y - a.ty) < 15) hit = t; });
            if (!hit) { c.K.burst(a.tx, a.ty, '#6b4f2c', 4, 60); return; }
            hit.dead = true;
            if (hit.kind === 'tnt') { c.fx('boom'); c.K.burst(hit.x, hit.y, '#ff6a1f', 18, 200); ammo = Math.max(0, ammo - 3); c.K.pop(hit.x, hit.y - 16, '-3 ARROWS', '#ff7a6a'); c.shake = 0.3; return; }
            hits++; total++; c.fx('bonk'); c.K.burst(hit.x, hit.y, '#c9ccd4', 8);
            if (hit.kind === 'ore') c.ore(hit.ore, hit.x, hit.y - 16); c.add((20 + Math.round(Math.abs(hit.vx) / 4)) * c.level, hit.x, hit.y - 6);
            if (hits >= need) { c.add(ammo * 10 * c.level, W / 2, H / 2, '#ffe680'); c.levelUp(); start(); }
          });
          arrows = arrows.filter(function (a) { return !a.dead; });
          if (ammo <= 0 && !arrows.length && hits < need) c.end(false, 'Out of Arrows!');
        },
        draw: function (g) {
          c.fill(g, T.PLANKS, 0, 0, W, H, 32); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, W, H);
          ROWS.forEach(function (y) { g.fillStyle = '#4e381f'; g.fillRect(0, y + 14, W, 5); g.fillStyle = '#6b4f2c'; g.fillRect(0, y + 14, W, 2); });
          tg.forEach(function (t) { if (t.kind === 'tnt') g.drawImage(c.tex.tnt[0], t.x - 12, t.y - 12, 24, 24); else if (t.kind === 'ore') c.block(g, c.oreTile(t.ore), t.x - 12, t.y - 12, 24); else c.mon(g, t.kind, t.x - 12, t.y - 12, 24, t.vx > 0 ? 3 : 1); });
          arrows.forEach(function (a) { var f = a.t / a.dur, x = a.x + (a.tx - a.x) * f, y = a.y + (a.ty - a.y) * f, s = 10 - f * 5; g.fillStyle = '#ffe680'; g.fillRect(x - s / 4, y - s, s / 2, s * 2); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.strokeRect(a.tx - 6, a.ty - 6, 12, 12); });
          g.fillStyle = '#6b4f2c'; g.fillRect(W / 2 - 22, H - 28, 44, 5); g.fillStyle = '#e8e8ee'; g.fillRect(W / 2 - 1, H - 44, 2, 20);
          c.text(g, 'ARROWS ' + ammo, 6, 28, 2, ammo < 6 ? '#ff7a6a' : '#fff'); c.text(g, 'HIT ' + hits + '/' + need, 6, 46, 1, '#ffe680');
        }
      };
    }
  });

  // ---------- Beat Blocks: tap each lane as its block reaches the line ----------
  R({
    id: 'beat', name: 'Beat Blocks', cat: 'skill', medals: [400, 1500, 4000], music: 'title', lives: 6,
    blurb: 'Blocks fall in four lanes. Tap the lane the moment a block reaches the glowing line!',
    controls: { dpad: true, a: null, b: null }, pet: [16, 44],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#16122a'; g.fillRect(0, 0, w, h); [T.GRASS, T.GOLD, T.DIAMOND, T.MAGMA].forEach(function (t, i) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(4 + i * 14, 0, 13, h); g.drawImage(tex.blocks[t].top, 0, 0, 16, 16, 5 + i * 14, [10, 26, 4, 18][i], 11, 11); });
      g.fillStyle = '#ffe680'; g.fillRect(2, 38, 60, 2);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, LW = 70, LX = 20, LINE = H - 70, notes = [], sp = 1, hitN = 0, combo = 0, flash = [0, 0, 0, 0], best = 0;
      var TILES = [T.GRASS, T.GOLD, T.DIAMOND, T.MAGMA], TONES = ['gem', 'hop', 'bonk', 'click'];
      function press(l) {
        if (l < 0 || l > 3) return; flash[l] = 0.15; var bestN = null, bd = 1e9;
        notes.forEach(function (n) { var d = Math.abs(n.y - LINE); if (n.lane === l && !n.dead && d < bd) { bd = d; bestN = n; } });
        if (!bestN || bd > 34) { combo = 0; c.fx('nope'); return; }
        bestN.dead = true; hitN++; combo++; best = Math.max(best, combo); var perfect = bd < 13;
        c.add((perfect ? 20 : 10) * (1 + Math.floor(combo / 10)), LX + l * LW + LW / 2, LINE - 24, perfect ? '#ffe680' : '#fff'); c.fx(TONES[l]); c.K.burst(LX + l * LW + LW / 2, LINE, c.tex.blocks[TILES[l]].avg, 8, 120);
        if (hitN % 20 === 0) { c.levelUp(); c.lives = Math.min(6, c.lives + 1); c.ore(null, W / 2, 120); }
      }
      return {
        tap: function (x) { press(Math.floor((x - LX) / LW)); }, dir: function (d) { press([2, 0, 1, 3][d]); },
        lines: function () { return [['Notes hit', hitN], ['Best combo', best]]; },
        update: function (dt) {
          var v = 150 + c.level * 20;
          sp -= dt; if (sp <= 0) { sp = Math.max(0.26, 0.62 - c.level * 0.04) * c.pick([1, 1, 1, 0.5, 2]); notes.push({ lane: c.ri(4), y: 18 }); if (c.level > 3 && Math.random() < 0.15) notes.push({ lane: c.ri(4), y: 18 }); }
          notes.forEach(function (n) { n.y += v * dt; if (!n.dead && n.y > LINE + 40) { n.dead = true; combo = 0; c.hit(LX + n.lane * LW + LW / 2, LINE + 20); } });
          notes = notes.filter(function (n) { return !n.dead; });
          for (var i = 0; i < 4; i++) if (flash[i] > 0) flash[i] -= dt;
        },
        draw: function (g) {
          g.fillStyle = '#16122a'; g.fillRect(0, 0, W, H);
          for (var l = 0; l < 4; l++) { g.fillStyle = flash[l] > 0 ? 'rgba(255,255,255,0.22)' : (l % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'); g.fillRect(LX + l * LW, 22, LW, H - 22); g.globalAlpha = 0.35; c.block(g, TILES[l], LX + l * LW + 15, LINE - 20, 40); g.globalAlpha = 1; }
          g.fillStyle = Math.floor(c.time * 4) % 2 ? '#ffe680' : '#fff3a8'; g.fillRect(LX, LINE - 22, LW * 4, 3); g.fillRect(LX, LINE + 20, LW * 4, 3);
          notes.forEach(function (n) { c.block(g, TILES[n.lane], LX + n.lane * LW + 15, n.y - 20, 40); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(LX + n.lane * LW + 15, n.y - 20, 40, 3); });
          if (combo >= 5) c.ctext(g, combo + ' COMBO', W / 2, 30, 2, '#ffe680');
          ['◀', '▼', '▲', '▶'].forEach(function (a, i) { c.ctext(g, ['L', 'D', 'U', 'R'][i], LX + i * LW + LW / 2, H - 22, 2, 'rgba(255,255,255,0.4)'); });
        }
      };
    }
  });
})();
