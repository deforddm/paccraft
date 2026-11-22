/* Blockcade v4.0 — puzzle pack 1: Ore Merge, Block Pop, TNT Sweeper, Block Pairs, Echo Blocks. */
(function () {
  'use strict';
  var R = PCMini.reg, DX = PCMini.DX, DY = PCMini.DY;

  // ---------- Ore Merge: slide and merge blocks up the ore ladder ----------
  R({
    id: 'merge', name: 'Ore Merge', cat: 'puzzle', medals: [2000, 6000, 15000], music: 'caves', lives: 0,
    blurb: 'Swipe to slide every block. Two of the same merge into the next one up — all the way to emberite!',
    controls: { dpad: true, a: null, b: null }, pet: [18, 416],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#241c2c'; g.fillRect(0, 0, w, h); [[T.DIRT, 0, 0], [T.STONE, 1, 0], [T.COAL, 2, 1], [T.IRON, 1, 1], [T.GOLD, 2, 2], [T.DIAMOND, 3, 2], [T.DIRT, 0, 2]].forEach(function (b) { g.drawImage(tex.blocks[b[0]].top, 0, 0, 16, 16, 8 + b[1] * 12, 6 + b[2] * 12, 11, 11); });
    },
    make: function (c) {
      var W = c.W, T = c.T, N = 4, CS = 68, OX = 24, OY = 70, cells = [], got = {}, moves = 0, top = 1;
      var TIERS = [T.DIRT, T.COBBLE, T.STONE, T.COAL, T.IRON, T.GOLD, T.DIAMOND, T.EMBER, T.CRYSTAL, T.MAGMA], ORE = { 4: 'coal', 5: 'iron', 6: 'gold', 7: 'diamond', 8: 'ember' };
      for (var i = 0; i < 16; i++) cells.push(0);
      function spawn() { var e = []; cells.forEach(function (v, i) { if (!v) e.push(i); }); if (e.length) cells[c.pick(e)] = Math.random() < 0.88 ? 1 : 2; }
      function canMove() { for (var i = 0; i < 16; i++) { if (!cells[i]) return true; var x = i % 4, y = i >> 2; if (x < 3 && cells[i + 1] === cells[i]) return true; if (y < 3 && cells[i + 4] === cells[i]) return true; } return false; }
      function slide(d) {
        if (d < 0) return; var moved = false;
        for (var a = 0; a < 4; a++) {
          var line = []; for (var b = 0; b < 4; b++) { var k = d === 1 ? b : d === 3 ? 3 - b : d === 0 ? b : 3 - b; line.push(d % 2 ? a * 4 + k : k * 4 + a); }
          var vals = line.map(function (ix) { return cells[ix]; }).filter(function (v) { return v; }), out = [];
          for (var j = 0; j < vals.length; j++) {
            if (vals[j] === vals[j + 1] && vals[j] < TIERS.length) { var nv = vals[j] + 1; out.push(nv); j++; c.add(Math.pow(2, nv) * 2); if (nv > top) { top = nv; if (ORE[nv] && !got[nv]) { got[nv] = 1; c.ore(ORE[nv], W / 2, OY - 14); } if (nv >= 4) c.levelUp(true); } }
            else out.push(vals[j]);
          }
          while (out.length < 4) out.push(0);
          line.forEach(function (ix, n) { if (cells[ix] !== out[n]) moved = true; cells[ix] = out[n]; });
        }
        if (!moved) return; moves++; c.fx('place'); spawn(); if (!canMove()) c.end(false, 'No Moves Left!');
      }
      spawn(); spawn();
      return {
        dir: slide, up: function () { slide(PCMini.swipe(c)); }, lines: function () { return [['Moves', moves]]; },
        update: function () { },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, c.H); g.fillStyle = '#0c080f'; g.fillRect(OX - 6, OY - 6, CS * 4 + 12, CS * 4 + 12);
          cells.forEach(function (v, i) { var x = OX + (i % 4) * CS, y = OY + (i >> 2) * CS; g.fillStyle = '#2a2230'; g.fillRect(x + 2, y + 2, CS - 4, CS - 4); if (!v) return; c.block(g, TIERS[v - 1], x + 3, y + 3, CS - 6); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 3, y + 3, CS - 6, 4); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 3, y + CS - 8, CS - 6, 5); c.text(g, v, x + 7, y + 8, 2, '#fff'); });
          c.text(g, 'SWIPE TO MERGE', 24, 34, 2, '#ffe680'); for (var t = 0; t < TIERS.length; t++) { g.globalAlpha = t < top ? 1 : 0.3; c.block(g, TIERS[t], 24 + t * 20, 50, 16); } g.globalAlpha = 1;
        }
      };
    }
  });

  // ---------- Block Pop: tap groups of matching blocks ----------
  R({
    id: 'samegame', name: 'Block Pop', cat: 'puzzle', medals: [2500, 7000, 15000], music: 'meadow', lives: 0,
    blurb: 'Tap a group of two or more matching blocks to pop them. Bigger groups score much more. Clear the board!',
    pet: [18, 418],
    thumb: function (g, w, h, tex, T) {
      var k = [T.GRASS, T.SAND, T.ICE, T.CLAY]; for (var y = 0; y < 4; y++) for (var x = 0; x < 6; x++) g.drawImage(tex.blocks[k[(x * 3 + y * 5 + (x * y) % 3) % 4]].top, 0, 0, 16, 16, 2 + x * 10, 6 + y * 10, 10, 10);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, COLS = 8, ROWS = 10, CS = 38, OX = 8, OY = 30, grid, hover = [], popped = 0;
      var KINDS = [T.GRASS, T.SAND, T.ICE, T.CLAY, T.MOSS, T.MAGMA];
      function at(x, y) { return x < 0 || y < 0 || x >= COLS || y >= ROWS ? 0 : grid[y * COLS + x]; }
      function group(x, y) { var k = at(x, y), out = [], seen = {}; if (!k) return out; var st = [[x, y]]; while (st.length) { var p = st.pop(), id = p[1] * COLS + p[0]; if (seen[id] || at(p[0], p[1]) !== k) continue; seen[id] = 1; out.push(id); for (var d = 0; d < 4; d++) st.push([p[0] + DX[d], p[1] + DY[d]]); } return out; }
      function fillBoard() { var n = Math.min(6, 3 + Math.ceil(c.level / 2)); grid = []; for (var i = 0; i < COLS * ROWS; i++) grid.push(1 + c.ri(n)); }
      function collapse() {
        for (var x = 0; x < COLS; x++) { var col = []; for (var y = ROWS - 1; y >= 0; y--) if (grid[y * COLS + x]) col.push(grid[y * COLS + x]); for (var y2 = ROWS - 1, i = 0; y2 >= 0; y2--, i++) grid[y2 * COLS + x] = col[i] || 0; }
        var keep = []; for (var x2 = 0; x2 < COLS; x2++) if (grid[(ROWS - 1) * COLS + x2]) keep.push(x2);
        var ng = []; for (var j = 0; j < COLS * ROWS; j++) ng.push(0); keep.forEach(function (sx, nx) { for (var y3 = 0; y3 < ROWS; y3++) ng[y3 * COLS + nx] = grid[y3 * COLS + sx]; }); grid = ng;
      }
      function anyMove() { for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) { var k = at(x, y); if (k && (at(x + 1, y) === k || at(x, y + 1) === k)) return true; } return false; }
      fillBoard();
      return {
        tap: function (px, py) {
          var x = Math.floor((px - OX) / CS), y = Math.floor((py - OY) / CS), gp = group(x, y);
          if (gp.length < 2) { c.fx('nope'); return; }
          var tile = KINDS[at(x, y) - 1]; gp.forEach(function (id) { grid[id] = 0; c.K.burst(OX + (id % COLS) * CS + CS / 2, OY + Math.floor(id / COLS) * CS + CS / 2, c.tex.blocks[tile].avg, 3, 100); });
          popped += gp.length; c.add(gp.length * gp.length * 5, px, py - 10, gp.length >= 6 ? '#ffe680' : '#fff'); c.fx(gp.length >= 6 ? 'crystal' : 'crumble'); if (gp.length >= 9) c.ore(null, px, py - 30);
          collapse();
          if (anyMove()) return;
          var leftN = grid.filter(function (v) { return v; }).length;
          if (leftN <= 8) { c.add((leftN === 0 ? 500 : 100) * c.level, W / 2, H / 2, '#ffe680'); if (leftN === 0) c.ore(null, W / 2, H / 2 - 30); c.levelUp(); fillBoard(); }
          else c.end(false, 'No More Groups!', [['Blocks left', leftN]]);
        },
        lines: function () { return [['Blocks popped', popped]]; },
        update: function () { },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H);
          for (var i = 0; i < grid.length; i++) { if (!grid[i]) continue; var x = OX + (i % COLS) * CS, y = OY + Math.floor(i / COLS) * CS; c.block(g, KINDS[grid[i] - 1], x + 1, y + 1, CS - 2); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x + 1, y + 1, CS - 2, 3); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 1, y + CS - 5, CS - 2, 4); }
        }
      };
    }
  });

  // ---------- TNT Sweeper: uncover every safe tile ----------
  R({
    id: 'sweeper', name: 'TNT Sweeper', cat: 'puzzle', medals: [400, 1500, 4000], music: 'caves',
    blurb: 'Dig every tile that is NOT hiding TNT. Numbers count the TNT touching that tile. FLAG marks a suspect.',
    controls: { dpad: false, a: null, b: 'FLAG' }, pet: [18, 418],
    thumb: function (g, w, h, tex, T) {
      for (var y = 0; y < 4; y++) for (var x = 0; x < 5; x++) { var open = (x + y) % 3 === 0 || (x === 2 && y < 3); g.drawImage(tex.blocks[open ? T.DIRT : T.GRASS].top, 0, 0, 16, 16, 2 + x * 12, 1 + y * 12, 11, 11); if (open) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(2 + x * 12, 1 + y * 12, 11, 11); } }
      g.drawImage(tex.tnt[0], 39, 14, 9, 9); PCTex.drawText(g, '2', 17, 15, 1, '#7dff8a', '#000');
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, COLS = 8, ROWS = 9, CS = 38, OX = 8, OY = 34, cells, first, flag = false, safeLeft, cleared = 0;
      var NUMC = ['', '#7df9ff', '#7dff8a', '#ffe680', '#ff9a5a', '#ff7a6a', '#ff6bd6', '#fff', '#fff'];
      function nb(i, fn) { var x = i % COLS, y = Math.floor(i / COLS); for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) fn(ny * COLS + nx); } }
      function setup() { cells = []; for (var i = 0; i < COLS * ROWS; i++) cells.push({ tnt: false, open: false, flag: false, n: 0 }); first = true; }
      function plant(safe) {
        var n = Math.min(22, 7 + c.level * 2), ban = {}; ban[safe] = 1; nb(safe, function (j) { ban[j] = 1; });
        while (n > 0) { var i = c.ri(cells.length); if (ban[i] || cells[i].tnt) continue; cells[i].tnt = true; n--; }
        cells.forEach(function (cl, i) { nb(i, function (j) { if (cells[j].tnt) cl.n++; }); }); safeLeft = cells.filter(function (cl) { return !cl.tnt; }).length;
      }
      function open(i) {
        var st = [i]; while (st.length) { var k = st.pop(), cl = cells[k]; if (cl.open || cl.flag || cl.tnt) continue; cl.open = true; safeLeft--; c.add(5); if (!cl.n) nb(k, function (j) { st.push(j); }); }
      }
      setup();
      return {
        b: function () { flag = !flag; c.fx('click'); },
        tap: function (px, py) {
          var x = Math.floor((px - OX) / CS), y = Math.floor((py - OY) / CS); if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return; var i = y * COLS + x, cl = cells[i];
          if (cl.open) return;
          if (flag) { cl.flag = !cl.flag; c.fx('place'); return; }
          if (cl.flag) return;
          if (first) { first = false; plant(i); }
          if (cl.tnt) { cl.open = true; cl.boom = true; cl.flag = false; c.fx('boom'); c.K.burst(px, py, '#ff6a1f', 18, 200); c.hit(px, py); return; }
          c.fx('mined', { tile: T.DIRT }); open(i);
          if (safeLeft <= 0) { cleared++; c.add(200 * c.level, W / 2, H / 2, '#ffe680'); c.fx('clear'); c.ore(null, W / 2, H / 2 - 30); c.levelUp(); setup(); }
        },
        lines: function () { return [['Fields cleared', cleared]]; },
        update: function () { },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H);
          cells.forEach(function (cl, i) {
            var x = OX + (i % COLS) * CS, y = OY + Math.floor(i / COLS) * CS;
            if (!cl.open) { c.block(g, T.GRASS, x + 1, y + 1, CS - 2); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x + 1, y + 1, CS - 2, 3); if (cl.flag) { g.fillStyle = '#e8e8ee'; g.fillRect(x + 12, y + 8, 3, 22); g.fillStyle = '#d8322b'; g.fillRect(x + 15, y + 8, 12, 9); } return; }
            c.block(g, T.DIRT, x + 1, y + 1, CS - 2); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x + 1, y + 1, CS - 2, CS - 2);
            if (cl.boom) g.drawImage(c.tex.tnt[1], x + 5, y + 5, CS - 10, CS - 10); else if (cl.n) c.ctext(g, cl.n, x + CS / 2, y + 9, 3, NUMC[cl.n]);
          });
          c.text(g, flag ? 'FLAG MODE' : 'DIG MODE', 100, 26, 1, flag ? '#ff7a6a' : '#7dff8a');
        }
      };
    }
  });

  // ---------- Block Pairs: memory match ----------
  R({
    id: 'pairs', name: 'Block Pairs', cat: 'puzzle', medals: [300, 1200, 3500], music: 'snow',
    blurb: 'Flip two cards. Find every matching pair. Five misses cost a heart, so remember what you saw!',
    pet: [18, 418],
    thumb: function (g, w, h, tex, T) {
      for (var y = 0; y < 3; y++) for (var x = 0; x < 4; x++) { g.fillStyle = '#3b5cc4'; g.fillRect(4 + x * 15, 2 + y * 15, 13, 13); g.fillStyle = '#5a7ae0'; g.fillRect(6 + x * 15, 4 + y * 15, 9, 9); }
      g.fillStyle = '#fbf7ff'; g.fillRect(19, 17, 13, 13); g.fillRect(49, 2, 13, 13); g.drawImage(tex.ores.gold, 20, 18, 11, 11); g.drawImage(tex.ores.gold, 50, 3, 11, 11);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, cards, cols, rows, CS, OX, OY, sel = [], lock = 0, left, miss = 0, found = 0;
      var FACES = [];
      ['coal', 'iron', 'gold', 'diamond', 'ember'].forEach(function (k) { FACES.push(function (g, x, y, s) { c.oreIcon(g, k, x, y, s); }); });
      ['rumble', 'sly', 'frost', 'mudge'].forEach(function (k) { FACES.push(function (g, x, y, s) { g.drawImage(c.tex.mons[k][0], x, y, s, s); PCTex.drawEyes(g, x, y, s / 16, 2); }); });
      [T.GRASS, T.PLANKS, T.ICE, T.MAGMA, T.CRYSTAL, T.LEAVES].forEach(function (t) { FACES.push(function (g, x, y, s) { c.block(g, t, x, y, s); }); });
      FACES.push(function (g, x, y, s) { g.drawImage(c.tex.tnt[0], x, y, s, s); }); FACES.push(function (g, x, y, s) { g.drawImage(c.tex.crystal, x + s * 0.12, y, s * 0.76, s); });
      ['apple', 'cake', 'carrot'].forEach(function (k) { FACES.push(function (g, x, y, s) { g.drawImage(c.tex.food[k], x, y, s, s); }); });
      function setup() {
        var sz = [[3, 4], [4, 4], [4, 5], [5, 6], [5, 6]][Math.min(4, c.level - 1)]; cols = sz[0]; rows = sz[1]; left = cols * rows / 2;
        var f = c.shuffle(FACES.map(function (_, i) { return i; })).slice(0, left), deck = c.shuffle(f.concat(f));
        cards = deck.map(function (v) { return { v: v, up: false, gone: false }; });
        CS = Math.min(Math.floor((W - 16) / cols), Math.floor((H - 50) / rows)); OX = (W - cols * CS) / 2; OY = 34 + (H - 44 - rows * CS) / 2; sel = []; lock = 0;
      }
      setup();
      return {
        tap: function (px, py) {
          if (lock > 0) return; var x = Math.floor((px - OX) / CS), y = Math.floor((py - OY) / CS); if (x < 0 || y < 0 || x >= cols || y >= rows) return;
          var cd = cards[y * cols + x]; if (cd.up || cd.gone) return; cd.up = true; sel.push(cd); c.fx('click');
          if (sel.length < 2) return;
          if (sel[0].v === sel[1].v) { sel[0].gone = sel[1].gone = true; sel = []; left--; found++; c.add(50 * c.level, px, py - 10, '#ffe680'); c.fx('crystal'); if (left <= 0) { c.add(150 * c.level, W / 2, H / 2, '#ffe680'); c.ore(null, W / 2, H / 2 - 30); c.levelUp(); lock = 0.9; setTimeout(setup, 800); } }
          else { lock = 0.75; miss++; if (miss % 5 === 0) c.hit(px, py); else c.fx('nope'); }
        },
        lines: function () { return [['Pairs found', found], ['Misses', miss]]; },
        update: function (dt) { if (lock > 0) { lock -= dt; if (lock <= 0 && sel.length === 2) { sel[0].up = sel[1].up = false; sel = []; } } },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H);
          cards.forEach(function (cd, i) {
            var x = OX + (i % cols) * CS, y = OY + Math.floor(i / cols) * CS;
            if (cd.gone && !cd.up) return; if (cd.gone) g.globalAlpha = 0.35;
            if (cd.up) { g.fillStyle = '#0c080f'; g.fillRect(x + 2, y + 2, CS - 4, CS - 4); g.fillStyle = '#fbf7ff'; g.fillRect(x + 4, y + 4, CS - 8, CS - 8); FACES[cd.v](g, x + 9, y + 9, CS - 18); }
            else { g.fillStyle = '#0c080f'; g.fillRect(x + 2, y + 2, CS - 4, CS - 4); g.fillStyle = '#3b5cc4'; g.fillRect(x + 4, y + 4, CS - 8, CS - 8); g.fillStyle = '#5a7ae0'; g.fillRect(x + 8, y + 8, CS - 16, CS - 16); c.ctext(g, '?', x + CS / 2, y + CS / 2 - 10, 3, '#fff'); }
            g.globalAlpha = 1;
          });
          c.text(g, 'MISSES ' + (miss % 5) + '/5', 100, 26, 1, '#fff');
        }
      };
    }
  });

  // ---------- Echo Blocks: repeat the growing pattern ----------
  R({
    id: 'echo', name: 'Echo Blocks', cat: 'puzzle', medals: [200, 600, 1500], music: 'crystal',
    blurb: 'Watch the blocks light up, then tap them back in the same order. The pattern grows every round!',
    controls: { dpad: true, a: null, b: null }, pet: [18, 418],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#16122a'; g.fillRect(0, 0, w, h); [[T.GRASS, 12, 4], [T.MAGMA, 34, 4], [T.DIAMOND, 12, 26], [T.GOLD, 34, 26]].forEach(function (b, i) { g.globalAlpha = i === 1 ? 1 : 0.45; g.drawImage(tex.blocks[b[0]].top, 0, 0, 16, 16, b[1], b[2], 18, 18); }); g.globalAlpha = 1;
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, seq = [], pos = 0, mode = 'show', t = 1, showI = 0, lit = -1, litT = 0, best = 0;
      var PADS = [{ x: 28, y: 70, t: T.GRASS, f: 392 }, { x: 168, y: 70, t: T.MAGMA, f: 494 }, { x: 28, y: 220, t: T.DIAMOND, f: 587 }, { x: 168, y: 220, t: T.GOLD, f: 784 }], PS = 124, SND = ['gem', 'hop', 'bonk', 'foodspawn'];
      function light(i) { lit = i; litT = 0.28; c.fx(SND[i]); }
      function grow() { seq.push(c.ri(4)); mode = 'show'; showI = 0; t = 0.7; pos = 0; }
      function press(i) {
        if (mode !== 'play' || i < 0) return; light(i);
        if (seq[pos] !== i) { mode = 'show'; showI = 0; pos = 0; t = 1.1; c.say('WATCH AGAIN', null, 0.9); c.hit(PADS[i].x + PS / 2, PADS[i].y + PS / 2); return; }
        pos++; c.add(10 * c.level);
        if (pos >= seq.length) { best = Math.max(best, seq.length); c.add(seq.length * 10, W / 2, 56, '#ffe680'); if (seq.length % 5 === 0) { c.levelUp(); c.ore(null, W / 2, 40); } grow(); }
      }
      grow();
      return {
        tap: function (x, y) { for (var i = 0; i < 4; i++) if (x >= PADS[i].x && x < PADS[i].x + PS && y >= PADS[i].y && y < PADS[i].y + PS) press(i); },
        dir: function (d) { press([0, 2, 3, 1][d]); },
        lines: function () { return [['Longest pattern', best]]; },
        update: function (dt) {
          if (litT > 0) { litT -= dt; if (litT <= 0) lit = -1; }
          if (mode !== 'show') return; t -= dt; if (t > 0) return;
          if (showI >= seq.length) { mode = 'play'; return; }
          light(seq[showI++]); t = Math.max(0.3, 0.62 - c.level * 0.05);
        },
        draw: function (g) {
          g.fillStyle = '#16122a'; g.fillRect(0, 0, W, H);
          PADS.forEach(function (p, i) { g.fillStyle = '#0c080f'; g.fillRect(p.x - 4, p.y - 4, PS + 8, PS + 8); g.globalAlpha = lit === i ? 1 : 0.42; c.block(g, p.t, p.x, p.y, PS); g.globalAlpha = 1; if (lit === i) { g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(p.x - 2, p.y - 2, PS + 4, PS + 4); } });
          c.ctext(g, mode === 'show' ? 'WATCH...' : 'YOUR TURN!', W / 2, 30, 2, mode === 'show' ? '#7df9ff' : '#7dff8a'); c.ctext(g, 'PATTERN ' + seq.length, W / 2, 360, 2, '#ffe680');
          for (var i = 0; i < seq.length && i < 24; i++) { g.fillStyle = i < pos ? '#7dff8a' : 'rgba(255,255,255,0.25)'; g.fillRect(W / 2 - Math.min(seq.length, 24) * 6 + i * 12, 382, 8, 8); }
        }
      };
    }
  });
})();
