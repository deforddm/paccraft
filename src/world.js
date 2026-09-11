/* PacCraft — world data: block types, biomes, seeded RNG, maze generator, level builder.
 * Pure logic (no DOM) so it can be tested in Node. */
(function (root) {
  'use strict';

  var W = 19, H = 23;

  // ---------- tiles ----------
  var TILE = {
    FLOOR: 0, BORDER: 1, PEN: 2, DOOR: 3, PLANKS: 4,
    GRASS: 10, DIRT: 11, STONE: 12, COBBLE: 13, LOG: 14, LEAVES: 15, SAND: 16, SANDSTONE: 17,
    SNOW: 18, ICE: 19, MAGMA: 20, BASALT: 21, CRYSTAL: 22, CLAY: 23, MOSS: 24,
    COAL: 30, IRON: 31, GOLD: 32, DIAMOND: 33
  };

  // hard = seconds to mine with the starting (wooden) pickaxe. Infinity = can't be mined.
  var BLOCKS = {};
  function def(id, name, hard, drop, pts) { BLOCKS[id] = { id: id, name: name, hard: hard, drop: drop || null, pts: pts || 5 }; }
  def(TILE.BORDER, 'Bedrock', Infinity);
  def(TILE.PEN, 'Spawner Cage', Infinity);
  def(TILE.DOOR, 'Cage Door', Infinity);
  def(TILE.PLANKS, 'Planks', 0.45);
  def(TILE.GRASS, 'Grass', 0.35);
  def(TILE.DIRT, 'Dirt', 0.35);
  def(TILE.STONE, 'Stone', 0.9);
  def(TILE.COBBLE, 'Cobblestone', 0.9);
  def(TILE.LOG, 'Log', 0.6);
  def(TILE.LEAVES, 'Leaves', 0.25);
  def(TILE.SAND, 'Sand', 0.3);
  def(TILE.SANDSTONE, 'Sandstone', 0.6);
  def(TILE.SNOW, 'Snow', 0.3);
  def(TILE.ICE, 'Ice', 0.55);
  def(TILE.MAGMA, 'Magma Rock', 0.8);
  def(TILE.BASALT, 'Basalt', 0.9);
  def(TILE.CRYSTAL, 'Crystal', 0.8);
  def(TILE.CLAY, 'Clay', 0.45);
  def(TILE.MOSS, 'Mossy Stone', 0.8);
  def(TILE.COAL, 'Coal Ore', 1.0, 'coal', 50);
  def(TILE.IRON, 'Iron Ore', 1.2, 'iron', 100);
  def(TILE.GOLD, 'Gold Ore', 1.3, 'gold', 200);
  def(TILE.DIAMOND, 'Diamond Ore', 1.6, 'diamond', 500);

  function isMineable(t) { var b = BLOCKS[t]; return !!b && isFinite(b.hard); }
  function isWall(t) { return t !== TILE.FLOOR; }

  // ---------- biomes ----------
  // walls: weighted block mix (clustered by noise). ores: chance per inner wall block.
  var BIOMES = [
    { id: 'meadow', short: 'Meadow', name: 'Grassy Meadow', walls: [[TILE.GRASS, 7], [TILE.DIRT, 1], [TILE.STONE, 2], [TILE.LOG, 1]],
      ores: { coal: 0.06, iron: 0.025, gold: 0.008 }, food: 'apple' },
    { id: 'forest', short: 'Forest', name: 'Deep Forest', walls: [[TILE.LEAVES, 5], [TILE.LOG, 3], [TILE.MOSS, 2]],
      ores: { coal: 0.05, iron: 0.035, gold: 0.012 }, food: 'carrot' },
    { id: 'desert', short: 'Desert', name: 'Sunny Desert', walls: [[TILE.SAND, 5], [TILE.SANDSTONE, 4], [TILE.CLAY, 1]],
      ores: { coal: 0.03, iron: 0.035, gold: 0.035 }, food: 'bread' },
    { id: 'snow', short: 'Snow', name: 'Snowy Peaks', walls: [[TILE.SNOW, 5], [TILE.ICE, 3], [TILE.STONE, 2]],
      ores: { coal: 0.03, iron: 0.045, gold: 0.02, diamond: 0.008 }, food: 'melon' },
    { id: 'caves', short: 'Caves', name: 'Dark Caves', walls: [[TILE.STONE, 6], [TILE.COBBLE, 3], [TILE.MOSS, 1]],
      ores: { coal: 0.08, iron: 0.05, gold: 0.03, diamond: 0.015 }, food: 'cookie' },
    { id: 'lava', short: 'Lava', name: 'Lava Caves', walls: [[TILE.MAGMA, 6], [TILE.BASALT, 4]],
      ores: { coal: 0.04, gold: 0.05, diamond: 0.02 }, food: 'cake' },
    { id: 'crystal', short: 'Crystal', name: 'Crystal Caverns', walls: [[TILE.CRYSTAL, 5], [TILE.STONE, 3], [TILE.COBBLE, 1]],
      ores: { iron: 0.03, gold: 0.045, diamond: 0.04 }, food: 'goldapple' }
  ];
  function biomeFor(levelNum) { return BIOMES[(levelNum - 1) % BIOMES.length]; }
  function biomeById(id) { for (var i = 0; i < BIOMES.length; i++) if (BIOMES[i].id === id) return BIOMES[i]; return BIOMES[0]; }

  // ---------- seeded RNG ----------
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { // mulberry32
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(a, r) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // smooth value noise on a coarse lattice (for clustered block patches)
  function noiseField(r, w, h, cell) {
    var gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, g = [];
    for (var i = 0; i < gw * gh; i++) g.push(r());
    return function (x, y) {
      var fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      var a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1], c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };
  }

  // ---------- fixed layout pieces ----------
  var PEN = { doorX: 9, doorY: 10, spawnX: 9, spawnY: 9, slots: [[7, 11], [9, 11], [11, 11]], x0: 6, x1: 12, y0: 10, y1: 12 };
  var START = { x: 9, y: 17 };
  var FOOD = { x: 9, y: 13 };
  var TUNNEL_ROW = 11;

  function inPen(x, y) { return x >= PEN.x0 && x <= PEN.x1 && y >= PEN.y0 && y <= PEN.y1; }
  function penInterior(x, y) { return y === 11 && x >= 7 && x <= 11; }
  function inRing(x, y) { return (x >= 5 && x <= 13 && (y === 9 || y === 13)) || ((x === 5 || x === 13) && y >= 9 && y <= 13); }

  function stampPen(tiles) {
    for (var y = PEN.y0; y <= PEN.y1; y++) for (var x = PEN.x0; x <= PEN.x1; x++) {
      tiles[y * W + x] = penInterior(x, y) ? TILE.FLOOR : TILE.PEN;
    }
    tiles[PEN.doorY * W + PEN.doorX] = TILE.DOOR;
  }

  // ---------- maze generation (symmetric, braided, Pac-Man style) ----------
  function generateLayout(seed) {
    var r = rng(seed);
    var tiles = new Uint8Array(W * H);
    for (var i = 0; i < tiles.length; i++) tiles[i] = 1; // 1 = wall placeholder
    var cells = [];
    function isCell(x, y) { return x > 0 && y > 0 && x < W - 1 && y < H - 1 && (x & 1) && (y & 1) && !penInterior(x, y); }
    for (var y = 1; y < H - 1; y += 2) for (var x = 1; x < W - 1; x += 2) if (isCell(x, y)) { cells.push(y * W + x); tiles[y * W + x] = 0; }

    // union-find
    var parent = {};
    function find(a) { while (parent[a] !== undefined && parent[a] !== a) { parent[a] = parent[parent[a]] !== undefined ? parent[parent[a]] : parent[a]; a = parent[a]; } return a; }
    cells.forEach(function (c) { parent[c] = c; });
    function union(a, b) { a = find(a); b = find(b); if (a !== b) parent[a] = b; }

    // edges: wall tile between two cells; pair each edge with its mirror
    var edges = []; // {w, a, b}
    for (var yy = 1; yy < H - 1; yy++) for (var xx = 1; xx < W - 1; xx++) {
      if ((xx & 1) && !(yy & 1)) { // vertical neighbours (x odd, y even)
        if (isCell(xx, yy - 1) && isCell(xx, yy + 1)) edges.push({ w: yy * W + xx, a: (yy - 1) * W + xx, b: (yy + 1) * W + xx });
      } else if (!(xx & 1) && (yy & 1)) { // horizontal neighbours
        if (isCell(xx - 1, yy) && isCell(xx + 1, yy)) edges.push({ w: yy * W + xx, a: yy * W + xx - 1, b: yy * W + xx + 1 });
      }
    }
    var byWall = {}; edges.forEach(function (e) { byWall[e.w] = e; });
    function mirrorIdx(idx) { var x = idx % W, y = (idx - x) / W; return y * W + (W - 1 - x); }
    function openEdge(e) { tiles[e.w] = 0; union(e.a, e.b); var m = byWall[mirrorIdx(e.w)]; if (m) { tiles[m.w] = 0; union(m.a, m.b); } }

    // forced openings: ring around the pen, and the tunnel corridor to the ring
    var forced = [];
    for (var x2 = 6; x2 <= 12; x2 += 2) { forced.push(9 * W + x2); forced.push(13 * W + x2); }
    forced.push(10 * W + 5, 12 * W + 5, 10 * W + 13, 12 * W + 13);
    forced.push(TUNNEL_ROW * W + 2, TUNNEL_ROW * W + 4, TUNNEL_ROW * W + 14, TUNNEL_ROW * W + 16);
    forced.forEach(function (w) { if (byWall[w]) openEdge(byWall[w]); });

    // symmetric Kruskal over the left half (+ centre column); mirror gives the right half
    var half = edges.filter(function (e) { return e.w % W <= 9; });
    shuffle(half, r);
    half.forEach(function (e) { if (tiles[e.w] === 1 && find(e.a) !== find(e.b)) openEdge(e); });
    // safety: make sure everything is connected (mirroring may leave rare splits)
    edges.forEach(function (e) { if (tiles[e.w] === 1 && find(e.a) !== find(e.b)) openEdge(e); });

    // braid: remove dead ends (Pac-Man mazes have none)
    function degree(c) {
      var x = c % W, y = (c - x) / W, n = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var w = (y + d[1]) * W + x + d[0]; if (byWall[w] && tiles[w] === 0) n++; });
      return n;
    }
    for (var pass = 0; pass < 6; pass++) {
      var changed = false;
      shuffle(cells.slice(), r).forEach(function (c) {
        if (degree(c) !== 1) return;
        var x = c % W, y = (c - x) / W, opts = [];
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var w = (y + d[1]) * W + x + d[0];
          if (byWall[w] && tiles[w] === 1) { var other = (y + 2 * d[1]) * W + x + 2 * d[0]; opts.push({ e: byWall[w], dead: degree(other) === 1 }); }
        });
        if (!opts.length) return;
        var pick = opts.filter(function (o) { return o.dead; });
        if (!pick.length) pick = opts;
        openEdge(pick[Math.floor(r() * pick.length)].e);
        changed = true;
      });
      if (!changed) break;
    }
    // a few extra loops so it feels open and chase-y
    shuffle(half.slice(), r).forEach(function (e) { if (tiles[e.w] === 1 && r() < 0.08) openEdge(e); });

    // tunnel ends
    tiles[TUNNEL_ROW * W + 0] = 0; tiles[TUNNEL_ROW * W + W - 1] = 0;
    stampPen(tiles);
    return tiles; // 0 floor, 1 wall placeholder, pen tiles stamped
  }

  // paint wall placeholders with biome blocks + ores
  function paintBlocks(tiles, biome, seed, levelNum) {
    var r = rng(seed ^ 0x9e3779b9);
    var n1 = noiseField(r, W, H, 4), n2 = noiseField(r, W, H, 3);
    var total = 0; biome.walls.forEach(function (w) { total += w[1]; });
    var oreBoost = 1 + Math.min(1.5, Math.floor((levelNum - 1) / BIOMES.length) * 0.35);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var i = y * W + x;
      if (tiles[i] !== 1) continue;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { tiles[i] = TILE.BORDER; continue; }
      var v = (n1(x, y) * 0.75 + n2(x + 7, y + 3) * 0.25) * total, acc = 0, t = biome.walls[0][0];
      for (var k = 0; k < biome.walls.length; k++) { acc += biome.walls[k][1]; if (v < acc) { t = biome.walls[k][0]; break; } }
      tiles[i] = t;
      var roll = r(), o = biome.ores, a = 0;
      if (roll < (a += (o.diamond || 0) * oreBoost)) tiles[i] = TILE.DIAMOND;
      else if (roll < (a += (o.gold || 0) * oreBoost)) tiles[i] = TILE.GOLD;
      else if (roll < (a += (o.iron || 0) * oreBoost)) tiles[i] = TILE.IRON;
      else if (roll < (a += (o.coal || 0) * oreBoost)) tiles[i] = TILE.COAL;
    }
  }

  // ---------- reachability (floor + mineable blocks) from start ----------
  function reachable(tiles, sx, sy) {
    var seen = new Uint8Array(W * H), q = [sy * W + sx]; seen[q[0]] = 1;
    while (q.length) {
      var c = q.pop(), x = c % W, y = (c - x) / W;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = x + d[0], ny = y + d[1];
        if (ny < 0 || ny >= H) return;
        if (nx < 0 || nx >= W) { if (tiles[y * W] === 0 && tiles[y * W + W - 1] === 0) nx = (nx + W) % W; else return; }
        var n = ny * W + nx;
        if (seen[n]) return;
        var t = tiles[n];
        if (t === TILE.FLOOR || isMineable(t)) { seen[n] = 1; q.push(n); }
      });
    }
    return seen;
  }

  function placeGems(tiles, crystals, start) {
    var gems = new Uint8Array(W * H);
    var reach = reachable(tiles, start.x, start.y);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var i = y * W + x;
      if (tiles[i] !== TILE.FLOOR || !reach[i]) continue;
      if (inPen(x, y) || inRing(x, y)) continue;
      if (x === 0 || x === W - 1) continue;             // tunnel mouths
      if (x === start.x && y === start.y) continue;
      gems[i] = 1;
    }
    crystals.forEach(function (c) { var i = c[1] * W + c[0]; if (tiles[i] === TILE.FLOOR && reach[i]) gems[i] = 2; });
    return gems;
  }

  // ---------- public: build a level ----------
  function makeLevel(levelNum, seed) {
    var biome = biomeFor(levelNum);
    var tiles = generateLayout(seed);
    paintBlocks(tiles, biome, seed, levelNum);
    var crystals = [[1, 3], [W - 2, 3], [1, H - 4], [W - 2, H - 4]];
    return finalize({ tiles: tiles, crystals: crystals, biome: biome.id, seed: seed, levelNum: levelNum, custom: false });
  }

  // custom (builder) level: { tiles:Array(W*H), crystals:[[x,y]], biome, start:{x,y} }
  function makeCustomLevel(data) {
    var tiles = new Uint8Array(W * H);
    for (var i = 0; i < W * H; i++) tiles[i] = data.tiles[i] | 0;
    enforceFrame(tiles);
    var start = data.start && tiles[data.start.y * W + data.start.x] === TILE.FLOOR && !inPen(data.start.x, data.start.y) ? data.start : { x: START.x, y: START.y };
    tiles[start.y * W + start.x] = TILE.FLOOR;
    return finalize({ tiles: tiles, crystals: data.crystals || [], biome: data.biome || 'meadow', seed: 0, levelNum: 0, custom: true, start: start, name: data.name || 'My Level' });
  }

  // border + pen + keep the spot above the door open
  function enforceFrame(tiles) {
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      if (edge && !(y === TUNNEL_ROW && (x === 0 || x === W - 1) && tiles[y * W + x] === TILE.FLOOR)) {
        if (tiles[y * W + x] === TILE.FLOOR && !(y === TUNNEL_ROW)) tiles[y * W + x] = TILE.BORDER;
        else if (tiles[y * W + x] !== TILE.FLOOR) tiles[y * W + x] = TILE.BORDER;
      }
    }
    // tunnel must be open on both sides or neither
    var l = TUNNEL_ROW * W, rr = TUNNEL_ROW * W + W - 1;
    if (!(tiles[l] === TILE.FLOOR && tiles[rr] === TILE.FLOOR)) { tiles[l] = TILE.BORDER; tiles[rr] = TILE.BORDER; }
    stampPen(tiles);
    tiles[PEN.spawnY * W + PEN.spawnX] = TILE.FLOOR;
  }

  function finalize(L) {
    var start = L.start || { x: START.x, y: START.y };
    L.tiles[start.y * W + start.x] = TILE.FLOOR;
    L.start = start;
    L.W = W; L.H = H;
    L.pen = PEN;
    L.food = { x: FOOD.x, y: FOOD.y };
    if (L.tiles[FOOD.y * W + FOOD.x] !== TILE.FLOOR) L.food = { x: PEN.spawnX, y: PEN.spawnY };
    L.gems = placeGems(L.tiles, L.crystals, start);
    return L;
  }

  function countGems(gems) { var n = 0; for (var i = 0; i < gems.length; i++) if (gems[i]) n++; return n; }

  // blank template for the builder: border, pen, ring, open floor
  function blankLayout() {
    var tiles = new Array(W * H);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      tiles[y * W + x] = edge ? TILE.BORDER : TILE.FLOOR;
    }
    var t8 = Uint8Array.from(tiles); stampPen(t8);
    return Array.prototype.slice.call(t8);
  }

  var api = {
    W: W, H: H, TILE: TILE, BLOCKS: BLOCKS, BIOMES: BIOMES, PEN: PEN, START: START, TUNNEL_ROW: TUNNEL_ROW,
    isMineable: isMineable, isWall: isWall, inPen: inPen, penInterior: penInterior, inRing: inRing,
    biomeFor: biomeFor, biomeById: biomeById, rng: rng, shuffle: shuffle,
    generateLayout: generateLayout, paintBlocks: paintBlocks, makeLevel: makeLevel, makeCustomLevel: makeCustomLevel,
    reachable: reachable, countGems: countGems, blankLayout: blankLayout, enforceFrame: enforceFrame
  };
  root.PCWorld = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
