/* PacCraft — canvas renderer: 3/4-view blocky maze, sprites, particles, popups, lighting. */
var PCRender = (function () {
  'use strict';
  var Wd = window.PCWorld, TILE = Wd.TILE, W = Wd.W, H = Wd.H;
  var WALL_H = 0.34; // wall side height as a fraction of a tile

  function Renderer(canvas) {
    this.cv = canvas;
    this.g = canvas.getContext('2d');
    this.tex = PCTex.build();
    this.particles = [];
    this.popups = [];
    this.shake = 0;
    this.flash = 0;
    this.T = 16; this.h = 5; this.oy = 5;
    this.look = PCTex.LOOK_DEFAULT;
    this.game = null;
    this.dirty = true;
  }
  var R = Renderer.prototype;

  R.setLook = function (look) { this.look = look; this.heroSet = PCTex.hero(look); };

  R.resize = function (cssW, cssH) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var T = Math.floor(Math.min(cssW * dpr / W, cssH * dpr / (H + WALL_H)));
    T = Math.max(8, T);
    this.dpr = dpr; this.T = T; this.h = Math.round(T * WALL_H); this.oy = this.h;
    this.cv.width = W * T; this.cv.height = H * T + this.h;
    this.cv.style.width = (W * T / dpr) + 'px';
    this.cv.style.height = ((H * T + this.h) / dpr) + 'px';
    this.g = this.cv.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.dirty = true;
  };

  R.setGame = function (game) {
    this.game = game; this.particles = []; this.popups = []; this.shake = 0; this.flash = 0;
    this.biome = game.L.biome; this.dirty = true;
    if (!this.heroSet) this.heroSet = PCTex.hero(this.look);
  };

  // screen position of a tile's "ground centre"
  R.gx = function (x) { return x * this.T + this.T / 2; };
  R.gy = function (y) { return this.oy + y * this.T + (this.T - this.h) / 2; };

  // ---------- static layers ----------
  R.rebuild = function () {
    var game = this.game, T = this.T, h = this.h, tex = this.tex, tiles = game.tiles;
    var floors = tex.floors[this.biome] || tex.floors.meadow;
    // floor layer
    var fl = this.floorLayer || document.createElement('canvas');
    fl.width = W * T; fl.height = H * T + h;
    var g = fl.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#111'; g.fillRect(0, 0, fl.width, fl.height);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var f = floors[(x * 7 + y * 13) % 3];
      g.drawImage(f, 0, 0, 16, 16, x * T, this.oy + y * T, T, T);
      if (Wd.penInterior(x, y)) { g.fillStyle = 'rgba(20,10,40,0.55)'; g.fillRect(x * T, this.oy + y * T, T, T); }
    }
    // soft shadows cast by walls onto the floor (below and to the right)
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (tiles[y * W + x] !== TILE.FLOOR) continue;
      var up = y > 0 && tiles[(y - 1) * W + x] !== TILE.FLOOR;
      var left = x > 0 && tiles[y * W + x - 1] !== TILE.FLOOR && tiles[y * W + x - 1] !== TILE.DOOR;
      if (up) { var gr = g.createLinearGradient(0, this.oy + y * T, 0, this.oy + y * T + T * 0.35); gr.addColorStop(0, 'rgba(0,0,0,0.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x * T, this.oy + y * T, T, T * 0.35); }
      if (left) { var gl = g.createLinearGradient(x * T, 0, x * T + T * 0.22, 0); gl.addColorStop(0, 'rgba(0,0,0,0.25)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(x * T, this.oy + y * T - h, T * 0.22, T); }
    }
    this.floorLayer = fl;
    // wall rows
    this.rows = this.rows || [];
    for (y = 0; y < H; y++) this.rebuildRow(y);
    this.dirty = false;
  };

  R.rebuildRow = function (y) {
    var T = this.T, h = this.h, tiles = this.game.tiles, tex = this.tex;
    var c = this.rows[y] || document.createElement('canvas');
    if (c.width !== W * T || c.height !== T + h) { c.width = W * T; c.height = T + h; }
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    for (var x = 0; x < W; x++) {
      var t = tiles[y * W + x];
      if (t === TILE.FLOOR) continue;
      var b = tex.blocks[t]; if (!b) continue;
      var below = y < H - 1 ? tiles[(y + 1) * W + x] : TILE.BORDER;
      if (t === TILE.DOOR) { g.drawImage(b.top, 0, 0, 16, 16, x * T, h * 0.5, T, T); continue; }
      if (below === TILE.FLOOR || below === TILE.DOOR || y === H - 1) g.drawImage(b.side, 0, 0, 16, 6, x * T, T, T, h);
      g.drawImage(b.top, 0, 0, 16, 16, x * T, 0, T, T);
      // block edges: subtle grid + lit top edge + darker right edge where exposed
      var e = Math.max(1, Math.round(T / 16));
      g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x * T, T - e, T, e); g.fillRect(x * T + T - e, 0, e, T);
      var above = y > 0 ? tiles[(y - 1) * W + x] : TILE.BORDER;
      if (above === TILE.FLOOR) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x * T, 0, T, e); }
      var right = x < W - 1 ? tiles[y * W + x + 1] : TILE.BORDER;
      if (right === TILE.FLOOR) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x * T + T - e * 2, 0, e * 2, T); }
    }
    this.rows[y] = c;
  };

  R.tileChanged = function (x, y) {
    // floor shadows change too, so rebuild the floor layer lazily plus the affected rows
    this.dirty = true;
  };

  // ---------- events → effects ----------
  R.onEvents = function (events) {
    var T = this.T;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      switch (e.type) {
        case 'mined': this.dirty = true; this.burst(e.x, e.y, (this.tex.blocks[e.tile] || {}).avg || '#888', 14, 1); if (e.pts) this.popup(e.x, e.y, '+' + e.pts, '#ffe680'); break;
        case 'mine-hit': this.burst(e.x, e.y, (this.tex.blocks[e.tile] || {}).avg || '#888', 3, 0.5); break;
        case 'place': case 'crumble': this.dirty = true; this.puff(e.x, e.y, 5, '#d9c7a0'); break;
        case 'eat': this.popup(e.x, e.y, String(e.pts), '#7df9ff'); this.puff(e.x, e.y, 8, '#ffffff'); break;
        case 'boom': this.boom(e.x, e.y); break;
        case 'food': this.popup(e.x, e.y, '+' + e.pts, '#ffd23d'); if (e.healed) this.popup(e.x, e.y - 0.8, '+1 HEART', '#ff6b7a'); this.puff(e.x, e.y, 6, '#ffe8a0'); break;
        case 'crystal': this.ring(e.x, e.y, '#e36bff'); break;
        case 'extralife': this.popup(this.game.player.x, this.game.player.y - 1, 'EXTRA HEART!', '#ff6b7a'); break;
        case 'death': this.deathAt = { x: e.x, y: e.y }; break;
        case 'clear': this.flash = 0; this.clearT = 0; break;
      }
    }
  };
  R.burst = function (x, y, col, n, power) {
    var T = this.T, px = this.gx(x), py = this.gy(y) - this.h * 0.5;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (0.5 + Math.random()) * T * 3.2 * power;
      this.particles.push({ x: px + (Math.random() - 0.5) * T * 0.6, y: py + (Math.random() - 0.5) * T * 0.4, vx: Math.cos(a) * sp, vy: -Math.abs(Math.sin(a)) * sp - T * 2 * power, g: T * 18, life: 0, max: 0.5 + Math.random() * 0.4, size: T * (0.1 + Math.random() * 0.12), col: Math.random() < 0.3 ? PCTex.shade(col, -0.25) : (Math.random() < 0.3 ? PCTex.shade(col, 0.2) : col), floor: py + T * 0.35 });
    }
  };
  R.puff = function (x, y, n, col) {
    var T = this.T, px = this.gx(x), py = this.gy(y);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      this.particles.push({ x: px, y: py, vx: Math.cos(a) * T * 1.8, vy: Math.sin(a) * T * 1.2 - T * 0.8, g: 0, life: 0, max: 0.45 + Math.random() * 0.3, size: T * 0.22, grow: T * 0.5, col: col, alpha: 0.8 });
    }
  };
  R.ring = function (x, y, col) { this.particles.push({ ring: true, x: this.gx(x), y: this.gy(y), life: 0, max: 0.5, col: col, g: 0, vx: 0, vy: 0 }); };
  R.boom = function (x, y) {
    this.shake = 0.45; this.flash = 0.25;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) this.puff(x + dx, y + dy, 4, dx === 0 && dy === 0 ? '#ffd23d' : '#bbbbbb');
    this.burst(x, y, '#ff8a1f', 16, 1.4);
    this.burst(x, y, '#444444', 10, 1.2);
    this.ring(x, y, '#ffd23d');
  };
  R.popup = function (x, y, text, col) { this.popups.push({ x: this.gx(x), y: this.gy(y) - this.T * 0.4, text: text, col: col, life: 0, max: 1.0 }); };

  // ---------- frame ----------
  R.draw = function (dt) {
    var game = this.game; if (!game) return;
    if (this.dirty) this.rebuild();
    var g = this.g, T = this.T, h = this.h, now = game.time;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, this.cv.width, this.cv.height);
    if (this.shake > 0) { this.shake -= dt; var m = T * 0.18 * Math.min(1, this.shake * 3); g.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m); }
    g.drawImage(this.floorLayer, 0, 0);

    // floor items
    this.drawGems(g, now);
    if (game.food) this.drawFood(g, game.food, now);
    for (var k = 0; k < game.tnts.length; k++) this.drawTnt(g, game.tnts[k], now);

    // entity list bucketed by row
    var buckets = [];
    var ents = [];
    ents.push({ kind: 'player', e: game.player });
    for (var i = 0; i < game.monsters.length; i++) ents.push({ kind: 'monster', e: game.monsters[i] });
    for (i = 0; i < ents.length; i++) { var row = Math.max(0, Math.min(H - 1, Math.floor(ents[i].e.y + 0.5))); (buckets[row] = buckets[row] || []).push(ents[i]); }

    var mining = game.player.mining;
    for (var y = 0; y < H; y++) {
      g.drawImage(this.rows[y], 0, this.oy + y * T - h);
      if (mining && mining.y === y) this.drawCracks(g, mining);
      this.drawPlankTimers(g, y);
      var b = buckets[y];
      if (b) {
        b.sort(function (a, c) { return a.e.y - c.e.y; });
        for (var j = 0; j < b.length; j++) { if (b[j].kind === 'player') this.drawPlayer(g, b[j].e, now); else this.drawMonster(g, b[j].e, now); }
      }
    }

    this.drawParticles(g, dt);
    this.drawLighting(g, now);

    // overlays
    if (game.state === 'ready') {
      var txt = game.stateT > 0.6 ? 'READY?' : 'GO!';
      this.bigText(g, txt, game.stateT > 0.6 ? '#ffe680' : '#7dff8a');
    }
    if (game.state === 'clear' || game.state === 'done') {
      this.clearT = (this.clearT || 0) + dt;
      var on = Math.floor(this.clearT * 6) % 2 === 0 && this.clearT < 1.6;
      if (on) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, this.cv.width, this.cv.height); }
      this.bigText(g, 'LEVEL CLEAR!', '#7dff8a');
    }
    if (this.flash > 0) { this.flash -= dt; g.fillStyle = 'rgba(255,240,200,' + Math.max(0, this.flash * 2.5) + ')'; g.fillRect(0, 0, this.cv.width, this.cv.height); }
  };

  R.bigText = function (g, txt, col) {
    var s = Math.max(2, Math.floor(this.T / 5)), w = PCTex.textWidth(txt, s);
    var x = (this.cv.width - w) / 2, y = this.gy(Wd.START.y - 2) - s * 3;
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x - s * 3, y - s * 3, w + s * 6, s * 13);
    PCTex.drawText(g, txt, x, y, s, col, '#000');
  };

  R.drawGems = function (g, now) {
    var game = this.game, T = this.T, s = T / 16, gems = game.gems, tiles = game.tiles;
    var cr = this.tex.crystal;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var v = gems[y * W + x]; if (!v || tiles[y * W + x] !== TILE.FLOOR) continue;
      var cx = this.gx(x), cy = this.gy(y);
      if (v === 1) {
        var tw = ((x * 13 + y * 7 + Math.floor(now * 2)) % 23) === 0;
        g.fillStyle = '#1d6b4a'; g.fillRect(Math.round(cx - 2 * s), Math.round(cy - 1 * s), Math.ceil(4 * s), Math.ceil(3 * s));
        g.fillStyle = '#5ef0a8'; g.fillRect(Math.round(cx - 1.5 * s), Math.round(cy - 2 * s), Math.ceil(3 * s), Math.ceil(3 * s));
        g.fillStyle = '#d6ffe9'; g.fillRect(Math.round(cx - 1.5 * s), Math.round(cy - 2 * s), Math.ceil(1 * s), Math.ceil(1 * s));
        if (tw) { g.fillStyle = '#ffffff'; g.fillRect(cx - 0.5 * s, cy - 4.5 * s, s, 2 * s); g.fillRect(cx - 1.5 * s, cy - 3.5 * s, 3 * s, s * 0.8); }
      } else {
        var pulse = 1 + Math.sin(now * 6 + x) * 0.08, w = T * 0.62 * pulse, hh = w * 14 / 12;
        var glow = g.createRadialGradient(cx, cy, 0, cx, cy, T * 0.75);
        glow.addColorStop(0, 'rgba(227,107,255,0.45)'); glow.addColorStop(1, 'rgba(227,107,255,0)');
        g.fillStyle = glow; g.fillRect(cx - T, cy - T, 2 * T, 2 * T);
        g.drawImage(cr, cx - w / 2, cy - hh / 2 - T * 0.12, w, hh);
      }
    }
  };

  R.drawFood = function (g, f, now) {
    if (f.t < 3 && Math.floor(now * 8) % 2) return;
    var T = this.T, s = T * 0.8, cx = this.gx(f.x), cy = this.gy(f.y) + Math.sin(now * 5) * T * 0.06;
    this.shadow(g, cx, this.gy(f.y) + T * 0.28, T * 0.3);
    g.drawImage(this.tex.food[f.kind] || this.tex.food.apple, cx - s / 2, cy - s * 0.62, s, s);
  };

  R.drawTnt = function (g, b, now) {
    var T = this.T, s = T * 0.85, cx = this.gx(b.x), cy = this.gy(b.y);
    var rate = b.t < 0.8 ? 14 : 6, lit = Math.floor(now * rate) % 2 === 0;
    var sc = 1 + (b.t < 0.8 ? (0.8 - b.t) * 0.3 : 0);
    this.shadow(g, cx, cy + T * 0.28, T * 0.32);
    g.drawImage(this.tex.tnt[lit ? 1 : 0], cx - s * sc / 2, cy - s * sc * 0.65, s * sc, s * sc);
  };

  R.drawCracks = function (g, m) {
    var T = this.T, st = Math.min(4, Math.floor(m.t / m.total * 5));
    var jx = (Math.random() - 0.5) * T * 0.04;
    g.drawImage(this.tex.cracks[st], 0, 0, 16, 16, m.x * T + jx, this.oy + m.y * T - this.h, T, T);
  };

  R.drawPlankTimers = function (g, y) {
    var game = this.game, T = this.T;
    for (var key in game.placed) {
      var i = +key; if (Math.floor(i / W) !== y) continue;
      var left = game.placed[key];
      if (left < 3) {
        var x = i % W, st = Math.min(4, Math.floor((3 - left) / 3 * 5));
        g.drawImage(this.tex.cracks[st], 0, 0, 16, 16, x * T, this.oy + y * T - this.h, T, T);
      }
    }
  };

  R.shadow = function (g, cx, cy, rx) {
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.beginPath(); g.ellipse(cx, cy, rx, rx * 0.4, 0, 0, Math.PI * 2); g.fill();
  };

  R.drawPlayer = function (g, p, now) {
    var game = this.game, T = this.T, S = Math.round(T * 1.12);
    var dirName = ['up', 'left', 'down', 'right'][p.facing] || 'down';
    var set = this.heroSet || PCTex.hero(this.look);
    var moving = p.dir >= 0 && game.state === 'play';
    var frame = moving ? 1 + (Math.floor(p.anim * 2.4) % 2) : 0;
    var cx = this.gx(p.x), base = this.gy(p.y) + (T - this.h) / 2 + T * 0.02;
    var bob = moving ? -Math.abs(Math.sin(p.anim * Math.PI * 1.2)) * T * 0.05 : 0;
    var draws = [cx];
    if (p.x < 0.5) draws.push(cx + W * T); else if (p.x > W - 1.5) draws.push(cx - W * T);
    for (var d = 0; d < draws.length; d++) {
      var x0 = draws[d];
      if (game.state === 'dying' || (game.state === 'over')) { this.drawDying(g, set, x0, base, S, p.deadT); continue; }
      if (game.powerT > 0) {
        var gl = g.createRadialGradient(x0, base - S * 0.45, 0, x0, base - S * 0.45, T * 0.9);
        gl.addColorStop(0, 'rgba(255,230,120,' + (0.35 + Math.sin(now * 10) * 0.1) + ')'); gl.addColorStop(1, 'rgba(255,230,120,0)');
        g.fillStyle = gl; g.fillRect(x0 - T, base - S - T * 0.5, 2 * T, 2 * T);
      }
      this.shadow(g, x0, base - T * 0.04, T * 0.32);
      var clearJump = (game.state === 'clear' || game.state === 'done') ? -Math.abs(Math.sin(now * 8)) * T * 0.3 : 0;
      var top = base - S + bob + clearJump;
      g.drawImage(set[dirName][frame], Math.round(x0 - S / 2), Math.round(top), S, S);
      this.drawPick(g, p, x0, top, S, now, dirName);
    }
  };

  R.drawPick = function (g, p, x0, top, S, now, dirName) {
    var pick = this.tex.picks[this.game.up.pick] || this.tex.picks[0];
    var ps = S * 0.62, ang, hx, hy, flip = false;
    var swing = p.mining ? Math.sin(p.mining.t * 20) : 0;
    if (dirName === 'right' || dirName === 'left') {
      flip = dirName === 'left';
      hx = x0 + (flip ? -1 : 1) * S * 0.08; hy = top + S * 0.72;
      ang = p.mining ? -0.3 + swing * 0.9 : -0.5 + Math.sin(p.anim * 7) * 0.08;
    } else if (dirName === 'down') {
      hx = x0 + S * 0.34; hy = top + S * 0.76;
      ang = p.mining ? 0.6 + swing * 0.8 : -0.2;
    } else {
      hx = x0 + S * 0.4; hy = top + S * 0.62;
      ang = p.mining ? -0.7 + swing * 0.7 : -0.25;
    }
    g.save(); g.translate(hx, hy); if (flip) g.scale(-1, 1); g.rotate(ang);
    g.drawImage(pick, -ps * 0.18, -ps * 0.86, ps, ps);
    g.restore();
  };

  R.drawDying = function (g, set, x0, base, S, t) {
    if (t < 1.0) {
      var sc = 1 - t * 0.5;
      g.save(); g.translate(x0, base - S * 0.5); g.rotate(t * 10); g.scale(sc, sc);
      g.globalAlpha = 1; g.drawImage(set.down[0], -S / 2, -S / 2, S, S); g.restore();
    } else if (!this._poofed) {
      this._poofed = true;
      if (this.deathAt) this.puff(this.deathAt.x, this.deathAt.y, 12, '#eeeeee');
    }
    if (t < 0.2) this._poofed = false;
  };

  R.drawMonster = function (g, m, now) {
    var game = this.game, T = this.T, S = Math.round(T * 1.08), tex = this.tex;
    var cx = this.gx(m.x), base = this.gy(m.y) + (T - this.h) / 2;
    var hop = (m.mode === 'roam' || m.mode === 'leave') ? -Math.abs(Math.sin(m.anim * 1.4)) * T * 0.1 : 0;
    var frame = Math.floor(m.anim) % 2;
    var draws = [cx];
    if (m.x < 0.5) draws.push(cx + W * T); else if (m.x > W - 1.5) draws.push(cx - W * T);
    for (var d = 0; d < draws.length; d++) {
      var x0 = draws[d], top = base - S + hop, left = Math.round(x0 - S / 2);
      if (m.mode === 'eyes' || m.mode === 'enter') {
        g.globalAlpha = 0.9;
        PCTex.drawEyes(g, left, Math.round(top), S / 16, m.dir, false);
        g.globalAlpha = 1;
        continue;
      }
      this.shadow(g, x0, base - T * 0.04, T * 0.34 * (1 + hop / T));
      var scared = m.fright && game.powerT > 0;
      var kind = m.kind;
      if (scared) kind = (game.powerT < 2 && Math.floor(now * 8) % 2 === 0) ? 'flash' : 'fright';
      g.drawImage(tex.mons[kind][frame], left, Math.round(top), S, S);
      var dir = m.mode === 'pen' ? (Math.sin(now * 3 + m.i) > 0 ? 0 : 2) : m.dir;
      PCTex.drawEyes(g, left, Math.round(top), S / 16, dir, scared);
    }
  };

  R.drawParticles = function (g, dt) {
    var ps = this.particles;
    for (var i = ps.length - 1; i >= 0; i--) {
      var p = ps[i];
      p.life += dt;
      if (p.life >= p.max) { ps.splice(i, 1); continue; }
      var a = 1 - p.life / p.max;
      if (p.ring) {
        g.strokeStyle = p.col; g.globalAlpha = a; g.lineWidth = Math.max(2, this.T * 0.12);
        g.beginPath(); g.arc(p.x, p.y, this.T * (0.3 + p.life * 5), 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
        continue;
      }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.floor && p.y > p.floor) { p.y = p.floor; p.vy *= -0.35; p.vx *= 0.6; }
      var sz = p.size + (p.grow || 0) * p.life;
      g.globalAlpha = (p.alpha || 1) * Math.min(1, a * 1.8);
      g.fillStyle = p.col; g.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), Math.ceil(sz), Math.ceil(sz));
    }
    g.globalAlpha = 1;
    if (ps.length > 300) ps.splice(0, ps.length - 300);
    var pu = this.popups, s = Math.max(1, Math.floor(this.T / 9));
    for (i = pu.length - 1; i >= 0; i--) {
      var q = pu[i]; q.life += dt;
      if (q.life >= q.max) { pu.splice(i, 1); continue; }
      var yy = q.y - q.life * this.T * 1.2, w = PCTex.textWidth(q.text, s);
      g.globalAlpha = Math.min(1, (1 - q.life / q.max) * 2);
      PCTex.drawText(g, q.text, Math.round(q.x - w / 2), Math.round(yy), s, q.col, '#000');
      g.globalAlpha = 1;
    }
  };

  R.drawLighting = function (g, now) {
    var b = this.biome;
    if (b !== 'caves' && b !== 'crystal' && b !== 'lava') return;
    var p = this.game.player, T = this.T, cx = this.gx(p.x), cy = this.gy(p.y) - T * 0.4;
    var gr = g.createRadialGradient(cx, cy, T * 3.5, cx, cy, T * 11);
    var col = b === 'lava' ? '40,8,0' : (b === 'crystal' ? '10,0,30' : '0,0,0');
    var strength = b === 'lava' ? 0.3 : 0.42;
    gr.addColorStop(0, 'rgba(' + col + ',0)'); gr.addColorStop(1, 'rgba(' + col + ',' + strength + ')');
    g.fillStyle = gr; g.fillRect(-T, -T, this.cv.width + 2 * T, this.cv.height + 2 * T);
    if (b === 'lava') { g.fillStyle = 'rgba(255,90,20,' + (0.04 + Math.sin(now * 2) * 0.02) + ')'; g.fillRect(0, 0, this.cv.width, this.cv.height); }
  };

  return { Renderer: Renderer, WALL_H: WALL_H };
})();
