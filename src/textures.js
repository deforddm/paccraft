/* PacCraft — all pixel art is drawn here in code (no image files): block textures, the hero,
 * the four cube monsters, items, UI icons and a tiny bitmap font. */
var PCTex = (function () {
  'use strict';
  var Wd = window.PCWorld, TILE = Wd.TILE;

  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function hex(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function toHex(r, g, b) { return '#' + ((1 << 24) | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).slice(1); }
  function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
  function shade(h, f) { var c = hex(h); return f < 0 ? toHex(c[0] * (1 + f), c[1] * (1 + f), c[2] * (1 + f)) : toHex(c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f); }

  // pixel painter over a canvas
  function painter(c) {
    var g = c.getContext('2d');
    return {
      g: g,
      p: function (x, y, col) { if (!col) return; g.fillStyle = col; g.fillRect(x, y, 1, 1); },
      r: function (x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    };
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

  // automatic 1px outline around opaque pixels
  function outline(c, col) {
    var g = c.getContext('2d'), w = c.width, h = c.height, d = g.getImageData(0, 0, w, h), a = d.data, out = [];
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (a[(y * w + x) * 4 + 3] > 0) continue;
      var n = 0;
      if (x > 0 && a[(y * w + x - 1) * 4 + 3] > 0) n++;
      if (x < w - 1 && a[(y * w + x + 1) * 4 + 3] > 0) n++;
      if (y > 0 && a[((y - 1) * w + x) * 4 + 3] > 0) n++;
      if (y < h - 1 && a[((y + 1) * w + x) * 4 + 3] > 0) n++;
      if (n) out.push(x, y);
    }
    g.fillStyle = col || '#1b1822';
    for (var i = 0; i < out.length; i += 2) g.fillRect(out[i], out[i + 1], 1, 1);
    return c;
  }
  function flipX(c) { var o = mk(c.width, c.height), g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; }

  // ---------------- block textures (16x16 top, 16x6 side) ----------------
  var PAL = {
    grass: ['#5dab3a', '#4f9a31', '#68b945', '#46902c', '#74c450'],
    dirt: ['#8a5a36', '#7a4e2e', '#946340', '#6e4528', '#9c6c48'],
    stone: ['#8e8e90', '#808083', '#9a9a9c', '#76767a', '#a4a4a6'],
    sand: ['#e8d7a0', '#e0cc91', '#efdfad', '#d8c487', '#f3e6ba'],
    snow: ['#f3f7fd', '#e7eef8', '#ffffff', '#dce6f3'],
    ice: ['#a4d2f4', '#96c8ee', '#b4dcf8', '#8bbfe8'],
    leaves: ['#3a7d27', '#2f6b1f', '#468f30', '#265a18', '#52a03a'],
    bark: ['#6b4f2c', '#5b4225', '#7a5a33', '#4e381f'],
    wood: ['#b88a4f', '#a87c45', '#c49859'],
    magma: ['#7a2a24', '#6a221d', '#88322a', '#5c1c18'],
    basalt: ['#45434a', '#3c3a41', '#4f4d55', '#35333a'],
    crystal: ['#8e5bd6', '#a673e6', '#7444b8', '#b88cf0'],
    clay: ['#b86b4b', '#aa5f41', '#c47858', '#9c563a'],
    bedrock: ['#2e2e31', '#48484c', '#1d1d20', '#5a5a5e', '#3a3a3e']
  };

  function noiseTex(r, pal, w, h) { var c = mk(w || 16, h || 16), P = painter(c); for (var y = 0; y < c.height; y++) for (var x = 0; x < c.width; x++) P.p(x, y, pick(r, pal)); return c; }

  function blockTop(t, r) {
    var c, P;
    switch (t) {
      case TILE.GRASS: c = noiseTex(r, PAL.grass); P = painter(c);
        for (var i = 0; i < 10; i++) { var x = Math.floor(r() * 16), y = Math.floor(r() * 15); P.p(x, y, '#84d15c'); P.p(x, y + 1, '#3d8526'); }
        return c;
      case TILE.DIRT: c = noiseTex(r, PAL.dirt); P = painter(c);
        for (i = 0; i < 5; i++) P.p(Math.floor(r() * 16), Math.floor(r() * 16), '#a7a09a');
        return c;
      case TILE.STONE: case TILE.MOSS: c = noiseTex(r, PAL.stone); P = painter(c);
        for (i = 0; i < 4; i++) { var sx = Math.floor(r() * 13), sy = Math.floor(r() * 15), len = 2 + Math.floor(r() * 3); for (var k = 0; k < len; k++) P.p(sx + k, sy + (k % 2), '#66666a'); }
        if (t === TILE.MOSS) for (i = 0; i < 40; i++) { var mx = Math.floor(r() * 16), my = Math.floor(r() * 16); if (r() < 0.6) P.p(mx, my, pick(r, ['#4f8f32', '#5d9f3a', '#3f7a28'])); }
        return c;
      case TILE.COBBLE: c = mk(16, 16); P = painter(c); P.r(0, 0, 16, 16, '#58585c');
        [[0, 0, 5, 4], [6, 0, 5, 3], [12, 0, 4, 5], [0, 5, 3, 5], [4, 5, 6, 4], [11, 6, 5, 4], [0, 11, 6, 5], [7, 10, 4, 6], [12, 11, 4, 5], [4, 4, 1, 1]].forEach(function (b) {
          var col = pick(r, PAL.stone);
          P.r(b[0], b[1], b[2] - 1 > 0 ? b[2] - 1 : 1, b[3] - 1 > 0 ? b[3] - 1 : 1, col);
          P.p(b[0], b[1], shade(col, 0.25));
        });
        return c;
      case TILE.LOG: c = mk(16, 16); P = painter(c);
        P.r(0, 0, 16, 16, PAL.bark[0]);
        for (var ring = 1; ring < 8; ring++) { var col2 = ring % 2 ? '#c49a62' : '#b1874f'; P.r(ring, ring, 16 - ring * 2, 16 - ring * 2, col2); }
        P.r(7, 7, 2, 2, '#9a7442');
        for (i = 0; i < 16; i++) { P.p(i, 0, pick(r, PAL.bark)); P.p(i, 15, pick(r, PAL.bark)); P.p(0, i, pick(r, PAL.bark)); P.p(15, i, pick(r, PAL.bark)); }
        return c;
      case TILE.LEAVES: c = noiseTex(r, PAL.leaves); P = painter(c);
        for (i = 0; i < 14; i++) P.p(Math.floor(r() * 16), Math.floor(r() * 16), '#1c4412');
        for (i = 0; i < 8; i++) P.p(Math.floor(r() * 16), Math.floor(r() * 16), '#6cbc4c');
        if (r() < 0.7) { var ax = 3 + Math.floor(r() * 10), ay = 3 + Math.floor(r() * 10); P.p(ax, ay, '#e0413a'); P.p(ax + 1, ay, '#c22f2a'); }
        return c;
      case TILE.SAND: return noiseTex(r, PAL.sand);
      case TILE.SANDSTONE: c = noiseTex(r, ['#e3cf95', '#dcc68a', '#e8d6a0']); P = painter(c);
        for (i = 0; i < 16; i++) { P.p(i, 0, '#f0e2b4'); P.p(i, 15, '#c9b172'); P.p(0, i, '#f0e2b4'); P.p(15, i, '#c9b172'); }
        P.r(3, 3, 10, 10, '#dcc48a'); P.r(4, 4, 8, 8, '#e5d19c');
        return c;
      case TILE.SNOW: c = noiseTex(r, PAL.snow); P = painter(c);
        for (i = 0; i < 5; i++) P.p(Math.floor(r() * 16), Math.floor(r() * 16), '#cfdcef');
        return c;
      case TILE.ICE: c = noiseTex(r, PAL.ice); P = painter(c);
        for (i = 0; i < 3; i++) { var ix = Math.floor(r() * 16); for (k = 0; k < 6; k++) P.p((ix + k) % 16, (2 + i * 5 + k) % 16, '#e2f3ff'); }
        return c;
      case TILE.MAGMA: c = noiseTex(r, PAL.magma); P = painter(c);
        var cx0 = Math.floor(r() * 16), cy0 = Math.floor(r() * 16);
        for (i = 0; i < 22; i++) { P.p(cx0, cy0, i % 4 === 0 ? '#ffd23d' : '#ff8a1f'); if (r() < 0.5) cx0 = (cx0 + (r() < 0.5 ? 1 : 15)) % 16; else cy0 = (cy0 + (r() < 0.5 ? 1 : 15)) % 16; }
        return c;
      case TILE.BASALT: c = mk(16, 16); P = painter(c);
        for (var col3 = 0; col3 < 16; col3++) { var base = pick(r, PAL.basalt); for (var yy = 0; yy < 16; yy++) P.p(col3, yy, r() < 0.8 ? base : pick(r, PAL.basalt)); }
        return c;
      case TILE.CRYSTAL: c = noiseTex(r, ['#6d3fae', '#7a4bbd', '#6437a3']); P = painter(c);
        for (i = 0; i < 4; i++) { var px0 = 1 + Math.floor(r() * 12), py0 = 1 + Math.floor(r() * 12), sz = 2 + Math.floor(r() * 3); for (k = 0; k < sz; k++) { P.p(px0 + k, py0 + sz - k, '#c9a3ff'); P.p(px0 + k, py0 + sz - k + 1, '#a06ae8'); } P.p(px0, py0 + sz, '#f1e4ff'); }
        return c;
      case TILE.CLAY: return noiseTex(r, PAL.clay);
      case TILE.BORDER: c = mk(16, 16); P = painter(c);
        for (var by = 0; by < 16; by += 2) for (var bx = 0; bx < 16; bx += 2) P.r(bx, by, 2, 2, pick(r, PAL.bedrock));
        for (i = 0; i < 20; i++) P.p(Math.floor(r() * 16), Math.floor(r() * 16), pick(r, PAL.bedrock));
        return c;
      case TILE.PEN: case TILE.DOOR: c = mk(16, 16); P = painter(c);
        P.r(0, 0, 16, 16, t === TILE.DOOR ? 'rgba(0,0,0,0)' : '#1d2433');
        if (t === TILE.PEN) { for (i = 0; i < 16; i += 4) { P.r(i, 0, 2, 16, '#5b6780'); P.r(0, i, 16, 2, '#5b6780'); P.r(i, 0, 1, 16, '#7d8aa3'); P.r(0, i, 16, 1, '#7d8aa3'); } }
        else { P.r(0, 6, 16, 4, '#e7a6c6'); P.r(0, 6, 16, 1, '#ffd6ea'); }
        return c;
      case TILE.PLANKS: c = mk(16, 16); P = painter(c);
        for (var row = 0; row < 4; row++) {
          var pc = PAL.wood[row % 3];
          for (var px = 0; px < 16; px++) for (var py = 0; py < 4; py++) P.p(px, row * 4 + py, r() < 0.85 ? pc : shade(pc, -0.08));
          P.r(0, row * 4 + 3, 16, 1, '#7a5a30');
          P.r(((row * 7) % 12) + 2, row * 4, 1, 3, '#7a5a30');
        }
        return c;
    }
    if (t >= TILE.COAL && t <= TILE.DIAMOND) { // ore = stone + mineral clusters
      c = noiseTex(r, PAL.stone); P = painter(c);
      var ore = { 30: ['#1e1e22', '#34343a', '#2a2a2e'], 31: ['#d8ae90', '#c49a7c', '#ecc9ae'], 32: ['#fbe44a', '#e6bd28', '#fff58c'], 33: ['#5ce1e6', '#35c0c8', '#bdfcff'] }[t];
      [[2, 2], [9, 3], [4, 9], [11, 10], [7, 6]].forEach(function (s) {
        var ox = s[0] + Math.floor(r() * 2), oy = s[1] + Math.floor(r() * 2);
        P.p(ox, oy, ore[0]); P.p(ox + 1, oy, ore[1]); P.p(ox, oy + 1, ore[1]); P.p(ox + 1, oy + 1, ore[0]);
        if (r() < 0.6) P.p(ox + 2, oy + 1, ore[0]);
        P.p(ox, oy, ore[2]);
      });
      return c;
    }
    return noiseTex(r, ['#ff00ff', '#000000']);
  }

  function blockSide(t, r, top) {
    var c = mk(16, 6), P = painter(c), i, x, y;
    switch (t) {
      case TILE.GRASS:
        for (y = 0; y < 6; y++) for (x = 0; x < 16; x++) P.p(x, y, shade(pick(r, PAL.dirt), -0.12));
        for (x = 0; x < 16; x++) { var dd = 1 + (r() < 0.45 ? 1 : 0) + (r() < 0.15 ? 1 : 0); for (y = 0; y < dd; y++) P.p(x, y, shade(pick(r, PAL.grass), -0.12)); }
        return c;
      case TILE.LOG:
        for (x = 0; x < 16; x++) { var bc = pick(r, PAL.bark); for (y = 0; y < 6; y++) P.p(x, y, r() < 0.8 ? shade(bc, -0.1) : shade(pick(r, PAL.bark), -0.2)); }
        return c;
      case TILE.SNOW:
        for (y = 0; y < 6; y++) for (x = 0; x < 16; x++) P.p(x, y, y < 2 ? '#dbe6f3' : shade(pick(r, PAL.stone), -0.15));
        for (x = 0; x < 16; x++) if (r() < 0.4) P.p(x, 2, '#dbe6f3');
        return c;
      case TILE.SANDSTONE:
        for (y = 0; y < 6; y++) for (x = 0; x < 16; x++) P.p(x, y, y === 2 || y === 5 ? '#b89c5c' : shade(pick(r, PAL.sand), -0.14));
        return c;
      case TILE.PLANKS:
        for (y = 0; y < 6; y++) for (x = 0; x < 16; x++) P.p(x, y, y === 2 || y === 5 ? '#5e4424' : shade(pick(r, PAL.wood), -0.2));
        return c;
      case TILE.PEN:
        P.r(0, 0, 16, 6, '#141925'); for (i = 0; i < 16; i += 4) P.r(i, 0, 2, 6, '#46516a');
        return c;
      case TILE.DOOR: return c;
    }
    // default: darker copy of the top texture
    var g = c.getContext('2d');
    g.drawImage(top, 0, 0, 16, 6, 0, 0, 16, 6);
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, 16, 6);
    return c;
  }

  var FLOOR = {
    meadow: { pal: ['#a3845a', '#9a7b50', '#ad8e63', '#94764c'], dots: ['#7f6441', '#c0a47a'], grassEdge: true },
    forest: { pal: ['#5e4a33', '#56432d', '#66513a', '#4e3c28'], dots: ['#3f7a2a', '#7a6242'] },
    desert: { pal: ['#c9a36a', '#c19a60', '#d0ab74', '#b8925a'], dots: ['#a98251', '#dcbc8a'] },
    snow: { pal: ['#86a2bf', '#7d99b6', '#8eaac6', '#7792ae'], dots: ['#a9c2da', '#6a86a3'] },
    caves: { pal: ['#4c4c52', '#45454b', '#54545a', '#3f3f45'], dots: ['#303035', '#6a6a70'] },
    lava: { pal: ['#2e2427', '#281f22', '#34292c', '#231b1e'], dots: ['#ff6a1f', '#44373a'] },
    crystal: { pal: ['#2c2344', '#261e3c', '#33294c', '#221a36'], dots: ['#b48cff', '#3d3160'] }
  };
  function floorTex(biome, r) {
    var f = FLOOR[biome] || FLOOR.meadow, c = noiseTex(r, f.pal), P = painter(c);
    for (var i = 0; i < 6; i++) P.p(Math.floor(r() * 16), Math.floor(r() * 16), pick(r, f.dots));
    return c;
  }

  // crack overlays for mining progress (stage 1..5): branching lines from the middle out
  function cracks() {
    var r = Wd.rng(4242), stages = [], branches = [];
    for (var b = 0; b < 7; b++) {
      var ang = b / 7 * Math.PI * 2 + r() * 0.6, x = 7.5, y = 7.5, pts = [];
      for (var k = 0; k < 9; k++) {
        ang += (r() - 0.5) * 0.9;
        x += Math.cos(ang) * 1.1; y += Math.sin(ang) * 1.1;
        if (x < 0 || y < 0 || x > 15 || y > 15) break;
        pts.push([Math.floor(x), Math.floor(y)]);
        if (r() < 0.2) pts.push([Math.floor(x + (r() < 0.5 ? 1 : -1)), Math.floor(y)]);
      }
      branches.push(pts);
    }
    for (var s = 1; s <= 5; s++) {
      var c = mk(16, 16), P = painter(c);
      branches.forEach(function (pts, bi) {
        var n = Math.ceil(pts.length * Math.min(1, s / 5 + (bi % 3) * 0.05));
        if (bi >= 3 + s) n = Math.floor(n / 2);
        for (var k = 0; k < n; k++) P.p(pts[k][0], pts[k][1], 'rgba(24,18,24,0.9)');
      });
      stages.push(c);
    }
    return stages;
  }

  // ---------------- hero ----------------
  var HATS = ['miner', 'cap', 'none', 'crown', 'diamond', 'knight'];
  function heroSprite(view, frame, look) {
    // view: 'down' | 'up' | 'side' (faces right). frame: 0 stand, 1 step A, 2 step B
    var c = mk(16, 16), P = painter(c);
    var skin = look.skin, skinD = shade(skin, -0.15), hair = look.hair, shirt = look.shirt, shirtD = shade(shirt, -0.22);
    var pants = look.pants || '#3b5cc4', pantsD = shade(pants, -0.2), boot = '#4b3322';
    var hatCol = look.hatColor || '#e0392f';
    if (view !== 'side') {
      // legs
      var lA = frame === 1 ? 1 : 0, lB = frame === 2 ? 1 : 0;
      P.r(5, 13, 2, 2 - lA, pants); P.r(5, 15 - lA, 2, 1, boot);
      P.r(9, 13, 2, 2 - lB, pants); P.r(9, 15 - lB, 2, 1, boot);
      // body + arms
      P.r(4, 10, 8, 3, shirt); P.r(4, 12, 8, 1, shirtD);
      P.r(3, 10, 1, 2, shirt); P.r(12, 10, 1, 2, shirt); P.p(3, 12, skin); P.p(12, 12, skin);
      P.r(4, 13, 8, 1, pants);
      if (view === 'down') { P.p(7, 10, shirtD); P.p(8, 10, shirtD); }
      // head
      P.r(3, 2, 10, 8, skin); P.r(3, 9, 10, 1, skinD);
      if (view === 'down') {
        P.r(3, 2, 10, 3, hair); P.p(3, 5, hair); P.p(12, 5, hair); P.p(4, 5, hair); P.p(6, 5, hair); P.p(9, 5, hair); P.p(11, 5, hair);
        P.r(5, 6, 2, 2, '#2b2440'); P.r(9, 6, 2, 2, '#2b2440'); P.p(5, 6, '#ffffff'); P.p(9, 6, '#ffffff');
        P.p(4, 8, '#f19a8f'); P.p(11, 8, '#f19a8f');
        P.r(7, 8, 2, 1, '#8a3b32');
      } else {
        P.r(3, 2, 10, 7, hair); P.r(4, 8, 8, 1, shade(hair, -0.15));
      }
      drawHat(P, look.hat, view, hatCol);
    } else {
      // side view facing right
      var f1 = frame === 1, f2 = frame === 2;
      P.r(f1 ? 5 : 6, 13, 2, 2, pants); P.r(f1 ? 5 : 6, 15, 2, 1, boot);
      P.r(f2 ? 10 : 8, 13, 2, 2, pantsD); P.r(f2 ? 10 : 8, 15, 2, 1, shade(boot, -0.2));
      P.r(5, 10, 6, 3, shirt); P.r(5, 12, 6, 1, shirtD); P.r(5, 13, 6, 1, pants);
      P.r(7, 10, 2, 2, shirtD); P.p(f1 ? 8 : 7, 12, skin);
      P.r(4, 2, 9, 8, skin); P.r(4, 9, 9, 1, skinD);
      P.r(4, 2, 9, 3, hair); P.r(4, 5, 3, 3, hair); P.p(12, 5, hair);
      P.r(10, 6, 2, 2, '#2b2440'); P.p(11, 6, '#ffffff');
      P.p(10, 8, '#f19a8f'); P.p(12, 8, '#8a3b32');
      drawHat(P, look.hat, 'side', hatCol);
    }
    return outline(c);
  }
  function drawHat(P, hat, view, hatCol) {
    var side = view === 'side';
    var x0 = side ? 4 : 3, w = side ? 9 : 10;
    switch (hat) {
      case 'miner':
        P.r(x0 + 1, 0, w - 2, 1, '#f2c230'); P.r(x0, 1, w, 3, '#f2c230'); P.r(x0 - (side ? 0 : 1), 4, w + (side ? 2 : 2), 1, '#c99a1c');
        P.r(x0 + 1, 1, 2, 1, '#ffe27a');
        if (view === 'down') { P.r(7, 1, 2, 2, '#fff7c2'); P.r(7, 3, 2, 1, '#9b9b9b'); }
        if (side) { P.r(12, 1, 1, 2, '#fff7c2'); P.p(13, 2, '#fff7c2'); }
        break;
      case 'cap':
        P.r(x0, 1, w, 3, hatCol); P.r(x0 + 1, 0, w - 2, 1, hatCol); P.r(x0 + 1, 1, 2, 1, shade(hatCol, 0.3));
        if (view === 'down') { P.r(x0, 4, w, 1, shade(hatCol, -0.3)); P.p(7, 0, shade(hatCol, -0.3)); P.p(8, 0, shade(hatCol, -0.3)); }
        else if (side) P.r(11, 4, 4, 1, shade(hatCol, -0.3));
        break;
      case 'crown':
        P.r(x0 + 1, 2, w - 2, 2, '#f7c936'); P.r(x0 + 1, 1, 1, 1, '#f7c936'); P.r(x0 + w - 2, 1, 1, 1, '#f7c936');
        P.r(x0 + Math.floor(w / 2) - 1, 0, 2, 2, '#f7c936'); P.r(x0 + 1, 3, w - 2, 1, '#d69d1e');
        if (!side || true) { P.p(x0 + 2, 2, '#e0392f'); P.p(x0 + Math.floor(w / 2), 2, '#3fb8e8'); P.p(x0 + w - 3, 2, '#3fcf6b'); }
        break;
      case 'diamond':
        P.r(x0 + 1, 0, w - 2, 1, '#5fe3e8'); P.r(x0, 1, w, 4, '#5fe3e8'); P.r(x0, 4, w, 1, '#2fb3bd');
        P.r(x0 + 1, 1, 3, 1, '#c8feff'); P.p(x0 + 1, 2, '#c8feff');
        if (view === 'down') { P.r(x0, 4, 1, 3, '#2fb3bd'); P.r(x0 + w - 1, 4, 1, 3, '#2fb3bd'); }
        break;
      case 'knight':
        P.r(x0 + 1, 0, w - 2, 1, '#c7ccd6'); P.r(x0, 1, w, 4, '#b4bac6'); P.r(x0, 4, w, 1, '#8b92a1');
        P.r(x0 + 1, 1, 2, 1, '#eef1f6');
        if (view === 'down') { P.r(x0, 4, 1, 4, '#8b92a1'); P.r(x0 + w - 1, 4, 1, 4, '#8b92a1'); P.r(7, 0, 2, 1, '#e0392f'); }
        if (side) P.r(5, 0, 3, 1, '#e0392f');
        break;
    }
  }

  // pickaxe 12x12, head at top-right
  function pickaxe(tier) {
    var cols = [['#b8894d', '#8a6331'], ['#9a9a9e', '#6e6e74'], ['#e4e6ea', '#a8adb6'], ['#5fe3e8', '#2aa9b3']][tier] || ['#b8894d', '#8a6331'];
    var c = mk(12, 12), P = painter(c);
    // handle
    for (var i = 0; i < 7; i++) { P.p(2 + i, 9 - i, '#7a5530'); P.p(2 + i, 10 - i, '#5a3c20'); }
    // head arc
    [[3, 1], [4, 1], [5, 1], [6, 1], [7, 2], [8, 2], [9, 3], [9, 4], [10, 5], [10, 6], [10, 7]].forEach(function (q) { P.p(q[0], q[1], cols[0]); });
    [[4, 2], [5, 2], [6, 2], [8, 3], [9, 5], [9, 6], [7, 3]].forEach(function (q) { P.p(q[0], q[1], cols[1]); });
    P.p(3, 1, shade(cols[0], 0.35)); P.p(10, 7, shade(cols[0], 0.35));
    return outline(c);
  }

  // ---------------- monsters ----------------
  var MON = {
    rumble: { body: '#d2402f', dark: '#8f2419', light: '#f0674f' },
    sly: { body: '#a85fe2', dark: '#6f35a8', light: '#cf9af5' },
    frost: { body: '#62cff0', dark: '#2f9bc4', light: '#d7f6ff' },
    mudge: { body: '#d68a3c', dark: '#9c5a22', light: '#f0ad63' },
    fright: { body: '#3847c9', dark: '#232e8f', light: '#5e6cf0' },
    flash: { body: '#e8ecff', dark: '#b3b9d9', light: '#ffffff' }
  };
  function monsterSprite(kind, frame) {
    var c = mk(16, 16), P = painter(c), m = MON[kind], i;
    // feet
    var up = frame === 1;
    P.r(3, up ? 13 : 14, 3, 2, m.dark); P.r(10, up ? 14 : 13, 3, 2, m.dark);
    // body cube
    P.r(2, 3, 12, 11, m.body); P.r(2, 11, 12, 2, m.dark); P.r(3, 4, 3, 1, m.light); P.p(3, 5, m.light);
    if (kind === 'rumble') {
      [[8, 3], [8, 4], [9, 5], [10, 5], [11, 6], [4, 10], [5, 9], [6, 9], [7, 10], [12, 9], [11, 10]].forEach(function (q) { P.p(q[0], q[1], '#ffb13b'); });
      P.p(9, 5, '#ffe16a'); P.p(5, 9, '#ffe16a');
      P.r(4, 5, 3, 1, '#4a0f0a'); P.r(9, 5, 3, 1, '#4a0f0a'); // angry brows
    } else if (kind === 'sly') {
      P.r(5, 6, 6, 5, m.dark); P.r(3, 13, 2, 1, m.body); P.p(12, 13, m.body); P.p(7, 13, m.body);
      P.p(11, 4, '#e8c8ff'); P.p(12, 5, '#e8c8ff');
    } else if (kind === 'frost') {
      for (i = 0; i < 4; i++) P.p(9 + i, 3 + i, '#e9fbff');
      P.p(6, 14, '#bff0ff'); P.p(8, 14, '#bff0ff'); P.p(8, 15, '#bff0ff');
    } else if (kind === 'mudge') {
      P.r(7, 1, 1, 2, '#3f8f2c'); P.r(5, 0, 2, 1, '#5fbf3a'); P.r(8, 0, 2, 1, '#5fbf3a'); P.p(6, 1, '#4caa33'); P.p(8, 1, '#4caa33');
      [[4, 9], [10, 10], [12, 7], [6, 11]].forEach(function (q) { P.p(q[0], q[1], m.dark); });
    } else if (kind === 'fright' || kind === 'flash') {
      var mc = kind === 'fright' ? '#ffd9a8' : '#e0393a';
      [[4, 10], [5, 9], [6, 10], [7, 9], [8, 10], [9, 9], [10, 10], [11, 9]].forEach(function (q) { P.p(q[0], q[1], mc); });
    }
    return outline(c);
  }
  // eyes drawn separately so they can look where the monster is going
  function drawEyes(g, x, y, s, dir, scared) {
    // x,y = top-left of the 16x16 sprite in canvas px, s = scale
    var ox = [0, -1, 0, 1][dir] || 0, oy = [-1, 0, 1, 0][dir] || 0;
    if (dir < 0) { ox = 0; oy = 0; }
    if (scared) {
      g.fillStyle = '#ffd9a8';
      g.fillRect(x + 5 * s, y + 6 * s, 2 * s, 2 * s); g.fillRect(x + 9 * s, y + 6 * s, 2 * s, 2 * s);
      return;
    }
    g.fillStyle = '#ffffff';
    g.fillRect(x + 4 * s, y + 5 * s, 3 * s, 3 * s); g.fillRect(x + 9 * s, y + 5 * s, 3 * s, 3 * s);
    g.fillStyle = '#1e1a2e';
    g.fillRect(x + (5 + ox) * s, y + (6 + oy) * s, 1.5 * s, 1.5 * s); g.fillRect(x + (10 + ox) * s, y + (6 + oy) * s, 1.5 * s, 1.5 * s);
  }

  // ---------------- items ----------------
  function crystalSprite() {
    var c = mk(12, 14), P = painter(c);
    var shape = ['.....a......', '....aab.....', '...aaabb....', '..aaaabbb...', '..aawabbb...', '.aaawabbbb..', '.aaaaabbbb..', '.aaaaabbbb..', '.aaaaabbbb..', '..aaaabbb...', '..aaaabbb...', '...aaabb....', '....aab.....', '.....a......'];
    var colr = { a: '#e36bff', b: '#b03fd9', w: '#ffffff' };
    shape.forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (colr[row[x]]) P.p(x, y, colr[row[x]]); });
    P.p(4, 3, '#ffd6ff'); P.p(3, 5, '#ffd6ff');
    return outline(c, '#3a1250');
  }
  function foodSprite(kind) {
    var c = mk(12, 12), P = painter(c);
    switch (kind) {
      case 'apple': case 'goldapple': {
        var a = kind === 'apple' ? ['#e0392f', '#b8261f', '#ff8a7a'] : ['#f7c936', '#d69d1e', '#fff1a0'];
        P.r(2, 3, 8, 7, a[0]); P.r(3, 2, 2, 1, a[0]); P.r(7, 2, 2, 1, a[0]); P.r(3, 10, 6, 1, a[1]); P.r(2, 8, 8, 2, a[1]);
        P.p(3, 4, a[2]); P.p(3, 5, a[2]); P.r(6, 0, 1, 3, '#6b4f2c'); P.r(7, 0, 2, 1, '#4caa33');
        if (kind === 'goldapple') { P.p(8, 4, '#ffffff'); P.p(9, 6, '#ffffff'); }
        break;
      }
      case 'carrot':
        for (var i = 0; i < 7; i++) { P.p(2 + i, 9 - i, '#f08a24'); P.p(3 + i, 9 - i, '#f08a24'); P.p(2 + i, 10 - i, '#c8641a'); }
        P.p(1, 10, '#c8641a'); P.r(9, 1, 2, 2, '#4caa33'); P.p(11, 0, '#4caa33'); P.p(8, 0, '#4caa33'); P.p(10, 0, '#6cc44c');
        break;
      case 'bread':
        P.r(1, 4, 10, 5, '#c9893c'); P.r(2, 3, 8, 1, '#c9893c'); P.r(1, 8, 10, 1, '#9c6424'); P.r(3, 4, 1, 2, '#e8b36a'); P.r(6, 4, 1, 2, '#e8b36a'); P.r(9, 5, 1, 2, '#e8b36a');
        break;
      case 'melon':
        P.r(1, 6, 10, 2, '#3f9b2e'); P.r(2, 4, 8, 2, '#e8483e'); P.r(3, 3, 6, 1, '#e8483e'); P.r(1, 5, 10, 1, '#f2f2d0');
        P.p(4, 4, '#2a1a1a'); P.p(7, 4, '#2a1a1a'); P.p(5, 3, '#2a1a1a');
        break;
      case 'cookie':
        P.r(2, 2, 8, 8, '#c98a45'); P.r(1, 3, 10, 6, '#c98a45'); P.r(3, 1, 6, 10, '#c98a45');
        [[4, 3], [7, 4], [3, 7], [8, 8], [6, 6]].forEach(function (q) { P.p(q[0], q[1], '#4a2a16'); });
        break;
      case 'cake':
        P.r(1, 5, 10, 5, '#f4ecd8'); P.r(1, 4, 10, 2, '#ffffff'); P.r(1, 9, 10, 1, '#c28a5a'); P.r(1, 7, 10, 1, '#e8c28a');
        [[2, 4], [5, 4], [8, 4]].forEach(function (q) { P.p(q[0], q[1], '#e0392f'); });
        P.r(5, 1, 1, 3, '#f7f7f7'); P.p(5, 0, '#ffb13b');
        break;
    }
    return outline(c);
  }
  function tntSprite(lit) {
    var c = mk(12, 12), P = painter(c);
    var red = lit ? '#ffffff' : '#d8322b', redD = lit ? '#e8e8e8' : '#9c1f1a';
    [1, 4, 7].forEach(function (x) { P.r(x + 1, 3, 3, 8, red); P.r(x + 3, 3, 1, 8, redD); P.p(x + 1, 3, lit ? '#fff' : '#ff7a6a'); });
    P.r(1, 6, 10, 2, '#e8d59a'); P.r(1, 7, 10, 1, '#b89c5c');
    P.p(6, 2, '#5a3c20'); P.p(7, 1, '#5a3c20'); P.p(8, 0, '#ffb13b');
    return outline(c);
  }

  // ---------------- UI icons ----------------
  function oreIcon(kind) {
    var c = mk(12, 12), P = painter(c);
    if (kind === 'coal') { P.r(2, 3, 8, 6, '#2c2c31'); P.r(3, 2, 5, 1, '#2c2c31'); P.r(4, 9, 5, 1, '#2c2c31'); P.p(3, 4, '#5a5a62'); P.p(4, 3, '#5a5a62'); P.p(7, 6, '#46464d'); }
    else if (kind === 'diamond') {
      P.r(3, 2, 6, 1, '#8ff3f6'); P.r(2, 3, 8, 2, '#5ce1e6'); P.r(3, 5, 6, 1, '#3fc3c9'); P.r(4, 6, 4, 1, '#3fc3c9'); P.r(5, 7, 2, 2, '#2aa9b3');
      P.p(3, 3, '#ffffff'); P.p(4, 3, '#dfffff');
    } else { // ingots
      var col = kind === 'gold' ? ['#fbe44a', '#e6bd28', '#fff7b0', '#b8901a'] : ['#e6e8ec', '#b8bcc6', '#ffffff', '#8b909c'];
      P.r(1, 6, 10, 3, col[0]); P.r(2, 4, 8, 2, col[0]); P.r(1, 8, 10, 1, col[1]); P.r(2, 4, 6, 1, col[2]); P.r(10, 6, 1, 3, col[3]);
    }
    return outline(c);
  }
  function heartIcon(full) {
    var c = mk(9, 8), P = painter(c);
    var rows = ['.XX...XX.', 'XXXX.XXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....'];
    rows.forEach(function (row, y) { for (var x = 0; x < 9; x++) if (row[x] === 'X') P.p(x, y, full ? (y > 4 ? '#b81f24' : '#e8323a') : '#3a2f3a'); });
    if (full) { P.p(1, 1, '#ff9aa0'); P.p(2, 1, '#ffc0c4'); }
    var o = mk(11, 10); o.getContext('2d').drawImage(c, 1, 1); return outline(o);
  }
  function bootIcon() { var c = mk(12, 12), P = painter(c); P.r(3, 1, 4, 7, '#3f8fe0'); P.r(3, 7, 8, 3, '#3f8fe0'); P.r(3, 10, 8, 1, '#23508a'); P.r(3, 1, 4, 1, '#9fd0ff'); P.r(8, 7, 2, 1, '#9fd0ff'); P.r(4, 3, 2, 1, '#ffffff'); return outline(c); }
  function magnetIcon() { var c = mk(12, 12), P = painter(c); P.r(1, 2, 3, 7, '#e0392f'); P.r(8, 2, 3, 7, '#e0392f'); P.r(1, 8, 10, 3, '#e0392f'); P.r(1, 2, 3, 2, '#e6e8ec'); P.r(8, 2, 3, 2, '#e6e8ec'); P.r(2, 9, 8, 1, '#ff7a6a'); return outline(c); }
  function bagIcon() { var c = mk(12, 12), P = painter(c); P.r(2, 4, 8, 7, '#a0703a'); P.r(3, 3, 6, 1, '#a0703a'); P.r(4, 1, 4, 2, '#7a5226'); P.r(2, 10, 8, 1, '#7a5226'); P.r(5, 5, 2, 2, '#f2c230'); return outline(c); }

  // isometric cube icon from a block's textures (for palettes and HUD)
  function cubeIcon(tex, size) {
    size = size || 48;
    var c = mk(size, size), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    var s = size / 2, top = tex.top, side = tex.top;
    // top face
    g.save(); g.translate(s, size * 0.04); g.scale(1, 0.5); g.rotate(Math.PI / 4); g.drawImage(top, 0, 0, 16, 16, 0, 0, s * 1.414 * 0.99, s * 1.414 * 0.99); g.restore();
    // left face
    g.save(); g.setTransform(s / 16, (s * 0.5) / 16, 0, (s * 1.0) / 16, 0, size * 0.04 + s * 0.5); g.drawImage(tex.sideFull || side, 0, 0); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, 16, 16); g.restore();
    // right face
    g.save(); g.setTransform(s / 16, -(s * 0.5) / 16, 0, (s * 1.0) / 16, s, size * 0.04 + s); g.drawImage(tex.sideFull || side, 0, 0); g.fillStyle = 'rgba(0,0,0,0.36)'; g.fillRect(0, 0, 16, 16); g.restore();
    return c;
  }
  function sideFull(t, r, top) { // 16x16 side texture for cube icons
    var c = mk(16, 16), g = c.getContext('2d');
    if (t === TILE.GRASS) {
      var P = painter(c);
      for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P.p(x, y, pick(r, PAL.dirt));
      for (x = 0; x < 16; x++) { var d = 3 + (r() < 0.5 ? 1 : 0); for (y = 0; y < d; y++) P.p(x, y, pick(r, PAL.grass)); }
      return c;
    }
    if (t === TILE.LOG) { var P2 = painter(c); for (var xx = 0; xx < 16; xx++) { var bc = pick(r, PAL.bark); for (var yy = 0; yy < 16; yy++) P2.p(xx, yy, r() < 0.8 ? bc : pick(r, PAL.bark)); } return c; }
    g.drawImage(top, 0, 0); return c;
  }

  // ---------------- bitmap font (5x7) ----------------
  var GLYPH = {
    'A': '01110100011000111111100011000110001', 'B': '11110100011000111110100011000111110', 'C': '01110100011000010000100001000101110',
    'D': '11110100011000110001100011000111110', 'E': '11111100001000011110100001000011111', 'F': '11111100001000011110100001000010000',
    'G': '01110100011000010111100011000101111', 'H': '10001100011000111111100011000110001', 'I': '01110001000010000100001000010001110',
    'J': '00111000100001000010000101001001100', 'K': '10001100101010011000101001001010001', 'L': '10000100001000010000100001000011111',
    'M': '10001110111010110101100011000110001', 'N': '10001100011100110101100111000110001', 'O': '01110100011000110001100011000101110',
    'P': '11110100011000111110100001000010000', 'Q': '01110100011000110001101011001001101', 'R': '11110100011000111110101001001010001',
    'S': '01111100001000001110000010000111110', 'T': '11111001000010000100001000010000100', 'U': '10001100011000110001100011000101110',
    'V': '10001100011000110001100010101000100', 'W': '10001100011000110101101011010101010', 'X': '10001100010101000100010101000110001',
    'Y': '10001100010101000100001000010000100', 'Z': '11111000010001000100010001000011111',
    '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111',
    '3': '11111000100010000010000011000101110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
    '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110',
    '9': '01110100011000101111000010001001100', '!': '00100001000010000100001000000000100', '?': '01110100010000100010001000000000100',
    '+': '00000001000010011111001000010000000', '-': '00000000000000011111000000000000000', '.': '00000000000000000000000000110001100',
    ':': '00000011000110000000011000110000000', ' ': '00000000000000000000000000000000000', 'x': '00000000001000101010001000101010001',
    "'": '00100001000100000000000000000000000', '/': '00001000010001000100010001000010000'
  };
  function textWidth(str, s) { return str.length * 6 * s - s; }
  function drawText(g, str, x, y, s, col, shadow) {
    str = String(str).toUpperCase();
    for (var pass = shadow ? 0 : 1; pass < 2; pass++) {
      g.fillStyle = pass === 0 ? shadow : col;
      var off = pass === 0 ? s : 0;
      for (var i = 0; i < str.length; i++) {
        var gl = GLYPH[str[i]] || GLYPH['?'];
        for (var k = 0; k < 35; k++) if (gl[k] === '1') g.fillRect(Math.round(x + (i * 6 + k % 5) * s + off), Math.round(y + Math.floor(k / 5) * s + off), Math.ceil(s), Math.ceil(s));
      }
    }
  }

  // ---------------- build everything once ----------------
  var cache = null;
  var LOOK_DEFAULT = { hat: 'miner', skin: '#f1c49b', hair: '#5a3a22', shirt: '#e0662f', pants: '#3b5cc4', hatColor: '#e0392f' };
  function build() {
    if (cache) return cache;
    var r = Wd.rng(20260911);
    var blocks = {};
    Object.keys(TILE).forEach(function (k) {
      var t = TILE[k]; if (t === TILE.FLOOR) return;
      var top = blockTop(t, r);
      blocks[t] = { top: top, side: blockSide(t, r, top), sideFull: sideFull(t, r, top), avg: avgColor(top) };
    });
    var floors = {};
    Object.keys(FLOOR).forEach(function (b) { floors[b] = [floorTex(b, r), floorTex(b, r), floorTex(b, r)]; });
    var mons = {};
    ['rumble', 'sly', 'frost', 'mudge', 'fright', 'flash'].forEach(function (k) { mons[k] = [monsterSprite(k, 0), monsterSprite(k, 1)]; });
    var food = {};
    ['apple', 'carrot', 'bread', 'melon', 'cookie', 'cake', 'goldapple'].forEach(function (k) { food[k] = foodSprite(k); });
    cache = {
      blocks: blocks, floors: floors, mons: mons, food: food, cracks: cracks(),
      crystal: crystalSprite(), tnt: [tntSprite(false), tntSprite(true)],
      picks: [pickaxe(0), pickaxe(1), pickaxe(2), pickaxe(3)],
      ores: { coal: oreIcon('coal'), iron: oreIcon('iron'), gold: oreIcon('gold'), diamond: oreIcon('diamond') },
      heart: [heartIcon(false), heartIcon(true)], boot: bootIcon(), magnet: magnetIcon(), bag: bagIcon()
    };
    var gb = noiseTex(r, ['#f7d23a', '#f2c42a', '#fbe05a', '#e8b820']), gp = painter(gb);
    for (var e = 0; e < 16; e++) { gp.p(e, 0, '#fff29a'); gp.p(0, e, '#fff29a'); gp.p(e, 15, '#c99a10'); gp.p(15, e, '#c99a10'); }
    gp.r(2, 2, 3, 1, '#fff7c0');
    var gs = mk(16, 6), gsp = painter(gs); for (var yy = 0; yy < 6; yy++) for (var xx = 0; xx < 16; xx++) gsp.p(xx, yy, pick(r, ['#c99a10', '#b8890c', '#d6a818']));
    cache.goldBlock = { top: gb, side: gs };
    return cache;
  }
  function avgColor(c) {
    var d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, r = 0, g = 0, b = 0, n = 0;
    for (var i = 0; i < d.length; i += 4) if (d[i + 3] > 0) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return n ? toHex(r / n, g / n, b / n) : '#888888';
  }
  // hero sprite sets are cached per look
  var heroCache = {};
  function hero(look) {
    look = look || LOOK_DEFAULT;
    var key = [look.hat, look.skin, look.hair, look.shirt, look.pants, look.hatColor].join('|');
    if (heroCache[key]) return heroCache[key];
    var set = { down: [], up: [], right: [], left: [] };
    for (var f = 0; f < 3; f++) {
      set.down.push(heroSprite('down', f, look)); set.up.push(heroSprite('up', f, look));
      var s = heroSprite('side', f, look); set.right.push(s); set.left.push(flipX(s));
    }
    heroCache[key] = set;
    return set;
  }
  // export a small canvas as a crisp, scaled-up data URL for <img> tags
  function dataURL(c, scale) {
    scale = scale || 4;
    var o = mk(c.width * scale, c.height * scale), g = o.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(c, 0, 0, o.width, o.height);
    return o.toDataURL();
  }

  return {
    build: build, hero: hero, HATS: HATS, LOOK_DEFAULT: LOOK_DEFAULT, drawEyes: drawEyes, cubeIcon: cubeIcon,
    drawText: drawText, textWidth: textWidth, dataURL: dataURL, mk: mk, shade: shade, outline: outline, GLYPH: GLYPH, FLOOR: FLOOR
  };
})();
