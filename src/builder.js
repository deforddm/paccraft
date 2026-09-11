/* PacCraft — level builder: paint blocks on a top-down grid, then test-play it. */
var PCBuilder = (function () {
  'use strict';
  var Wd = window.PCWorld, TILE = Wd.TILE, W = Wd.W, H = Wd.H, PEN = Wd.PEN;

  var TOOLS = [
    { id: 'erase', name: 'Path' },
    { id: TILE.GRASS, name: 'Grass' }, { id: TILE.DIRT, name: 'Dirt' }, { id: TILE.STONE, name: 'Stone' },
    { id: TILE.COBBLE, name: 'Cobble' }, { id: TILE.LOG, name: 'Log' }, { id: TILE.LEAVES, name: 'Leaves' },
    { id: TILE.PLANKS, name: 'Planks' }, { id: TILE.SAND, name: 'Sand' }, { id: TILE.SANDSTONE, name: 'Sandstn' },
    { id: TILE.SNOW, name: 'Snow' }, { id: TILE.ICE, name: 'Ice' }, { id: TILE.CLAY, name: 'Clay' }, { id: TILE.MOSS, name: 'Moss' },
    { id: TILE.MAGMA, name: 'Magma' }, { id: TILE.BASALT, name: 'Basalt' }, { id: TILE.CRYSTAL, name: 'Crystal' },
    { id: TILE.COAL, name: 'Coal' }, { id: TILE.IRON, name: 'Iron' }, { id: TILE.GOLD, name: 'Gold' }, { id: TILE.DIAMOND, name: 'Diamond' },
    { id: TILE.BORDER, name: 'Bedrock' },
    { id: 'crystal', name: 'Power' }, { id: 'start', name: 'Start' }
  ];

  function locked(x, y, tunnel) {
    if (Wd.inPen(x, y)) return true;
    if (x === PEN.spawnX && y === PEN.spawnY) return true;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return true;
    return false;
  }

  function Builder(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.tex = PCTex.build();
    this.tool = TILE.STONE; this.mirror = true;
    this.data = null;
    this.onChange = null;
    var self = this, painting = false, lastKey = null, erasing = null;
    function at(ev) {
      var r = canvas.getBoundingClientRect();
      var x = Math.floor((ev.clientX - r.left) / r.width * W), y = Math.floor((ev.clientY - r.top) / r.height * H);
      return (x >= 0 && y >= 0 && x < W && y < H) ? { x: x, y: y } : null;
    }
    canvas.addEventListener('pointerdown', function (ev) {
      ev.preventDefault(); canvas.setPointerCapture(ev.pointerId);
      painting = true; lastKey = null;
      var p = at(ev); if (!p) return;
      // tapping a block with the same block tool erases it (quick undo while drawing)
      var cur = self.data.tiles[p.y * W + p.x];
      erasing = (typeof self.tool === 'number' && cur === self.tool);
      if (self.tool === 'crystal') erasing = self.hasCrystal(p.x, p.y);
      self.paint(p.x, p.y, erasing); lastKey = p.x + ',' + p.y;
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (!painting) return; var p = at(ev); if (!p) return;
      var k = p.x + ',' + p.y; if (k === lastKey) return; lastKey = k;
      if (self.tool === 'start') return;
      self.paint(p.x, p.y, erasing);
    });
    function end() { painting = false; }
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }
  var B = Builder.prototype;

  B.load = function (data) {
    this.data = JSON.parse(JSON.stringify(data));
    if (!this.data.crystals) this.data.crystals = [];
    if (!this.data.start) this.data.start = { x: Wd.START.x, y: Wd.START.y };
    this.draw();
  };
  B.hasCrystal = function (x, y) { return this.data.crystals.some(function (c) { return c[0] === x && c[1] === y; }); };
  B.setCrystal = function (x, y, on) {
    this.data.crystals = this.data.crystals.filter(function (c) { return !(c[0] === x && c[1] === y); });
    if (on) this.data.crystals.push([x, y]);
  };
  B.tunnelOn = function () { return this.data.tiles[Wd.TUNNEL_ROW * W] === TILE.FLOOR; };
  B.setTunnel = function (on) {
    var r = Wd.TUNNEL_ROW;
    this.data.tiles[r * W] = on ? TILE.FLOOR : TILE.BORDER; this.data.tiles[r * W + W - 1] = on ? TILE.FLOOR : TILE.BORDER;
    if (on) { this.data.tiles[r * W + 1] = TILE.FLOOR; this.data.tiles[r * W + W - 2] = TILE.FLOOR; }
    this.draw(); this.changed();
  };

  B.paint = function (x, y, erase) {
    var pts = [[x, y]];
    if (this.mirror && x !== W - 1 - x) pts.push([W - 1 - x, y]);
    for (var i = 0; i < pts.length; i++) this.paintOne(pts[i][0], pts[i][1], erase, i > 0);
    this.draw(); this.changed();
  };
  B.paintOne = function (x, y, erase, isMirror) {
    if (locked(x, y)) return;
    var d = this.data, i = y * W + x, t = this.tool, st = d.start;
    if (t === 'start') { if (isMirror) return; d.tiles[i] = TILE.FLOOR; d.start = { x: x, y: y }; this.setCrystal(x, y, false); return; }
    if (x === st.x && y === st.y) return;
    if (t === 'erase' || erase) { d.tiles[i] = TILE.FLOOR; if (t === 'crystal' || t === 'erase') this.setCrystal(x, y, false); return; }
    if (t === 'crystal') { d.tiles[i] = TILE.FLOOR; this.setCrystal(x, y, true); return; }
    d.tiles[i] = t; this.setCrystal(x, y, false);
  };

  B.changed = function () { if (this.onChange) this.onChange(); };

  B.randomize = function () {
    var seed = Math.floor(Math.random() * 1e9);
    var tiles = Wd.generateLayout(seed);
    Wd.paintBlocks(tiles, Wd.biomeById(this.data.biome), seed, 1);
    this.data.tiles = Array.prototype.slice.call(tiles);
    this.data.crystals = [[1, 3], [W - 2, 3], [1, H - 4], [W - 2, H - 4]];
    this.data.start = { x: Wd.START.x, y: Wd.START.y };
    this.draw(); this.changed();
  };
  B.clearAll = function () {
    this.data.tiles = Wd.blankLayout();
    this.data.crystals = [];
    this.data.start = { x: Wd.START.x, y: Wd.START.y };
    this.draw(); this.changed();
  };

  B.resize = function (cssW, cssH) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var T = Math.max(6, Math.floor(Math.min(cssW * dpr / W, cssH * dpr / H)));
    this.T = T;
    this.cv.width = W * T; this.cv.height = H * T;
    this.cv.style.width = (W * T / dpr) + 'px'; this.cv.style.height = (H * T / dpr) + 'px';
    this.draw();
  };

  B.draw = function () {
    if (!this.data || !this.T) return;
    var g = this.g, T = this.T, d = this.data, tex = this.tex;
    g.imageSmoothingEnabled = false;
    var floor = (tex.floors[d.biome] || tex.floors.meadow)[0];
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var t = d.tiles[y * W + x];
      g.drawImage(floor, 0, 0, 16, 16, x * T, y * T, T, T);
      if (t !== TILE.FLOOR && tex.blocks[t]) g.drawImage(tex.blocks[t].top, 0, 0, 16, 16, x * T, y * T, T, T);
      if (locked(x, y) && !(x === PEN.spawnX && y === PEN.spawnY)) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x * T, y * T, T, T); }
    }
    // grid
    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (var gx = 1; gx < W; gx++) g.fillRect(gx * T, 0, 1, H * T);
    for (var gy = 1; gy < H; gy++) g.fillRect(0, gy * T, W * T, 1);
    // mirror guide
    if (this.mirror) { g.fillStyle = 'rgba(255,210,60,0.25)'; g.fillRect(Math.floor(W / 2) * T + T / 2 - 1, 0, 2, H * T); }
    // crystals, start, monster spawn
    var cr = tex.crystal;
    d.crystals.forEach(function (c) { g.drawImage(cr, c[0] * T + T * 0.2, c[1] * T + T * 0.1, T * 0.6, T * 0.8); });
    var hero = PCTex.hero(this.look)['down'][0];
    g.drawImage(hero, d.start.x * T, d.start.y * T, T, T);
    g.drawImage(tex.mons.rumble[0], PEN.spawnX * T + T * 0.1, PEN.spawnY * T + T * 0.1, T * 0.8, T * 0.8);
  };

  // tiny map picture for level cards
  function thumbnail(data, scale) {
    scale = scale || 4;
    var c = PCTex.mk(W * scale, H * scale), g = c.getContext('2d'), tex = PCTex.build();
    var floorCol = (PCTex.FLOOR[data.biome] || PCTex.FLOOR.meadow).pal[0];
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var t = data.tiles[y * W + x];
      g.fillStyle = t === TILE.FLOOR ? floorCol : ((tex.blocks[t] && tex.blocks[t].avg) || '#555');
      g.fillRect(x * scale, y * scale, scale, scale);
    }
    (data.crystals || []).forEach(function (cc) { g.fillStyle = '#e36bff'; g.fillRect(cc[0] * scale, cc[1] * scale, scale, scale); });
    return c;
  }

  return { Builder: Builder, TOOLS: TOOLS, thumbnail: thumbnail };
})();
