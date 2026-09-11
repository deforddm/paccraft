/* PacCraft — game rules and simulation (no DOM). The renderer and app read game state
 * and drain game.events for sounds, particles and UI. */
(function (root) {
  'use strict';
  var Wd = root.PCWorld || (typeof require !== 'undefined' ? require('./world.js') : null);
  var TILE = Wd.TILE, W = Wd.W, H = Wd.H, PEN = Wd.PEN;

  // directions: 0 up, 1 left, 2 down, 3 right (also the Pac-Man tie-break order)
  var DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  function opp(d) { return (d + 2) & 3; }

  var DIFF = {
    easy:   { hearts: 5, mSpeed: 0.68, power: 10, release: 5, phases: [9, 10, 9, 10, 9, 12, 9, 1e9], elroy: false },
    normal: { hearts: 3, mSpeed: 0.79, power: 8, release: 3.5, phases: [8, 14, 7, 16, 6, 18, 5, 1e9], elroy: true },
    hard:   { hearts: 3, mSpeed: 0.9, power: 6, release: 2, phases: [6, 20, 5, 22, 4, 1e9], elroy: true }
  };
  var BASE_SPEED = 5.6;              // player tiles / second
  var PICK_SPEED = [1, 1.6, 2.5, 4]; // wood, stone, iron, diamond
  var FOOD_PTS = { apple: 100, carrot: 300, bread: 500, melon: 700, cookie: 1000, cake: 2000, goldapple: 5000 };
  var MONSTERS = [
    { kind: 'rumble', name: 'Rumble', corner: [W - 3, -4] },
    { kind: 'sly', name: 'Sly', corner: [2, -4] },
    { kind: 'frost', name: 'Frost', corner: [W, H + 1] },
    { kind: 'mudge', name: 'Mudge', corner: [-1, H + 1] }
  ];
  var PLANK_LIFE = 12;

  function Game(level, opts) {
    opts = opts || {};
    this.L = level;
    this.tiles = Uint8Array.from(level.tiles);
    this.gems = Uint8Array.from(level.gems);
    this.difficulty = DIFF[opts.difficulty] ? opts.difficulty : 'normal';
    this.diff = DIFF[this.difficulty];
    this.up = Object.assign({ pick: 0, boots: 0, hearts: 0, power: 0, magnet: 0, bag: 0 }, opts.upgrades || {});
    this.settings = Object.assign({ pushDig: true }, opts.settings || {});
    this.levelNum = opts.levelNum || level.levelNum || 1;
    this.lf = Math.min(Math.max(this.levelNum, 1) - 1, 12); // level factor for speed-ups
    this.maxHearts = this.diff.hearts + this.up.hearts;
    this.hearts = Math.min(opts.hearts || this.maxHearts, this.maxHearts);
    this.score = opts.score || 0;
    this.bagMax = 6 + 3 * this.up.bag;
    this.blocks = Math.min(opts.blocks != null ? opts.blocks : 2 + 2 * this.up.bag, this.bagMax);
    this.tnt = opts.tnt || 0;
    this.extraLifeGiven = !!opts.extraLifeGiven;
    this.rand = Wd.rng((level.seed || 7) * 31 + this.levelNum * 977);
    this.events = [];
    this.time = 0;
    this.placed = {};
    this.tnts = [];
    this.food = null; this.foodSpawned = 0;
    this.orestaken = { coal: 0, iron: 0, gold: 0, diamond: 0 };
    this.gemsTotal = Wd.countGems(this.gems);
    this.gemsLeft = this.gemsTotal;
    this.gemsEaten = 0;
    this.wrapRow = {};
    for (var y = 0; y < H; y++) this.wrapRow[y] = this.tiles[y * W] === TILE.FLOOR && this.tiles[y * W + W - 1] === TILE.FLOOR;
    this.held = -1; this.holdT = 0;
    this.freeze = 0;
    this.paused = false;
    this.computeEyesField();
    this.resetPositions();
  }

  var G = Game.prototype;

  G.emit = function (type, data) { var e = data || {}; e.type = type; this.events.push(e); };
  G.drain = function () { var e = this.events; this.events = []; return e; };

  G.speedScale = function () { return 1 + 0.012 * this.lf; };
  G.playerSpeed = function () { return BASE_SPEED * (1 + 0.06 * this.up.boots) * (this.levelNum > 1 ? 1 + 0.004 * this.lf : 1); };
  G.monsterSpeed = function () { return BASE_SPEED * this.diff.mSpeed * this.speedScale(); };
  G.powerDuration = function () { return this.diff.power * Math.max(0.45, 1 - 0.05 * this.lf) + 1.5 * this.up.power; };
  G.releaseGap = function () { return this.diff.release * Math.max(0.4, 1 - 0.07 * this.lf); };

  G.resetPositions = function () {
    var L = this.L;
    this.player = { x: L.start.x, y: L.start.y, dir: -1, facing: 1, want: -1, fresh: false, mining: null, anim: 0, deadT: 0, digQ: 0 };
    this.monsters = [];
    var gap = this.releaseGap();
    for (var i = 0; i < 4; i++) {
      var m = { i: i, kind: MONSTERS[i].kind, name: MONSTERS[i].name, corner: MONSTERS[i].corner, dir: 1, fright: false, chewT: 0, anim: this.rand() * 10, fly: false };
      if (i === 0) { m.mode = 'roam'; m.x = PEN.spawnX; m.y = PEN.spawnY; }
      else { m.mode = 'pen'; m.x = PEN.slots[i - 1][0]; m.y = PEN.slots[i - 1][1]; m.releaseT = gap * i + 0.5; }
      this.monsters.push(m);
    }
    // keep the start and the spawn tile free of placed planks
    [[L.start.x, L.start.y], [PEN.spawnX, PEN.spawnY]].forEach(function (p) {
      var idx = p[1] * W + p[0];
      if (this.tiles[idx] === TILE.PLANKS) { this.tiles[idx] = TILE.FLOOR; delete this.placed[idx]; }
    }, this);
    this.powerT = 0; this.combo = 0;
    this.phase = 0; this.phaseT = this.diff.phases[0];
    this.tnts = [];
    this.state = 'ready'; this.stateT = 2.0;
    this.freeze = 0;
    this.computeEyesField();
  };

  G.globalMode = function () { return (this.phase % 2 === 0) ? 'scatter' : 'chase'; };

  // ---------- tiles ----------
  G.tileAt = function (x, y) {
    if (y < 0 || y >= H) return TILE.BORDER;
    if (x < 0 || x >= W) { if (this.wrapRow[y]) x = (x + W) % W; else return TILE.BORDER; }
    return this.tiles[y * W + x];
  };
  G.passP = function (x, y) { return this.tileAt(x, y) === TILE.FLOOR && !Wd.penInterior(((x % W) + W) % W, y); };
  G.passM = function (x, y) { return this.tileAt(x, y) === TILE.FLOOR; };
  G.idx = function (x, y) { x = ((x % W) + W) % W; return y * W + x; };

  G.computeEyesField = function () {
    var dist = new Int16Array(W * H).fill(-1), q = [PEN.spawnY * W + PEN.spawnX];
    dist[q[0]] = 0;
    for (var h = 0; h < q.length; h++) {
      var c = q[h], x = c % W, y = (c - x) / W;
      for (var d = 0; d < 4; d++) {
        var nx = x + DX[d], ny = y + DY[d];
        if (!this.passM(nx, ny) || Wd.penInterior(nx, ny)) continue;
        var n = this.idx(nx, ny);
        if (dist[n] >= 0) continue;
        dist[n] = dist[c] + 1; q.push(n);
      }
    }
    this.eyesDist = dist;
  };

  // ---------- input ----------
  G.setWant = function (d, fresh) { this.player.want = d; if (fresh) this.player.fresh = true; };
  G.setHeld = function (d) { this.held = d; if (d < 0) this.holdT = 0; };

  function nearestCenter(p) { return { x: Math.round(p.x), y: Math.round(p.y) }; }
  function wrapX(x) { return ((x % W) + W) % W; }

  G.canMineAt = function (x, y) {
    if (y <= 0 || y >= H - 1) return false;
    if (x <= 0 || x >= W - 1) return false;
    return Wd.isMineable(this.tileAt(x, y));
  };

  // Mine button: dig the block you're pointing at (joystick direction first, then facing)
  G.mine = function (queued) {
    if (this.state !== 'play') return false;
    var p = this.player;
    if (p.mining) return true;
    var c = nearestCenter(p);
    var off = Math.abs(p.x - c.x) + Math.abs(p.y - c.y);
    if (!queued) p.digQ = 0.55; // tapped mid-stride: keep trying for a moment at the next tile
    if (off > 0.45) return !queued;
    var cands = [p.want, p.facing, p.dir].filter(function (d, i, a) { return d >= 0 && a.indexOf(d) === i; });
    for (var i = 0; i < cands.length; i++) {
      var d = cands[i], tx = c.x + DX[d], ty = c.y + DY[d];
      if (this.canMineAt(tx, ty)) { p.x = wrapX(c.x); p.y = c.y; p.digQ = 0; this.startMine(d); return true; }
    }
    if (queued) return false;
    // bonk on something unbreakable?
    for (var j = 0; j < cands.length; j++) {
      var t = this.tileAt(c.x + DX[cands[j]], c.y + DY[cands[j]]);
      if (t !== TILE.FLOOR) { this.emit('bonk', { x: c.x + DX[cands[j]], y: c.y + DY[cands[j]] }); p.digQ = 0; return false; }
    }
    return true;
  };

  G.startMine = function (d) {
    var p = this.player, tx = Math.round(p.x) + DX[d], ty = Math.round(p.y) + DY[d];
    var t = this.tileAt(tx, ty), b = Wd.BLOCKS[t];
    p.dir = -1; p.facing = d;
    p.mining = { dir: d, x: tx, y: ty, t: 0, total: b.hard / PICK_SPEED[this.up.pick], tile: t, hitT: 0 };
    this.emit('mine-hit', { x: tx, y: ty, tile: t, stage: 0 });
  };

  G.finishMine = function () {
    var m = this.player.mining, idx = this.idx(m.x, m.y), t = this.tiles[idx], b = Wd.BLOCKS[t];
    this.player.mining = null;
    if (!b || !isFinite(b.hard)) return;
    this.breakBlock(m.x, m.y, true);
  };

  G.breakBlock = function (x, y, byPlayer) {
    var idx = this.idx(x, y), t = this.tiles[idx], b = Wd.BLOCKS[t];
    if (!b || !isFinite(b.hard)) return false;
    this.tiles[idx] = TILE.FLOOR;
    delete this.placed[idx];
    if (b.drop) { this.orestaken[b.drop]++; this.addScore(b.pts); }
    else if (byPlayer) { this.blocks = Math.min(this.bagMax, this.blocks + 1); this.addScore(b.pts); }
    this.emit('mined', { x: x, y: y, tile: t, drop: b.drop, pts: b.drop ? b.pts : 0, byPlayer: !!byPlayer });
    this.computeEyesField();
    return true;
  };

  // Block button: drop a plank block behind you to stop a chaser
  G.place = function () {
    if (this.state !== 'play') return false;
    var p = this.player;
    if (this.blocks <= 0) { this.emit('noblock'); return false; }
    var back = opp(p.dir >= 0 ? p.dir : p.facing), tx, ty;
    if (p.dir >= 0) {
      var s = (p.dir === 1 || p.dir === 0) ? -1 : 1;
      if (p.dir & 1) { tx = s > 0 ? Math.floor(p.x - 1 + 1e-6) : Math.ceil(p.x + 1 - 1e-6); ty = Math.round(p.y); }
      else { ty = s > 0 ? Math.floor(p.y - 1 + 1e-6) : Math.ceil(p.y + 1 - 1e-6); tx = Math.round(p.x); }
    } else { tx = Math.round(p.x) + DX[back]; ty = Math.round(p.y) + DY[back]; }
    var spots = [[tx, ty]];
    if (p.dir < 0) { // standing still: any open neighbour, behind first
      for (var d = 0; d < 4; d++) if (d !== back) spots.push([Math.round(p.x) + DX[d], Math.round(p.y) + DY[d]]);
    }
    for (var i = 0; i < spots.length; i++) {
      var x = spots[i][0], y = spots[i][1];
      if (this.canPlaceAt(x, y)) {
        var idx = this.idx(x, y);
        this.tiles[idx] = TILE.PLANKS; this.placed[idx] = PLANK_LIFE; this.blocks--;
        this.emit('place', { x: wrapX(x), y: y });
        this.computeEyesField();
        return true;
      }
    }
    this.emit('noplace');
    return false;
  };

  G.canPlaceAt = function (x, y) {
    if (x <= 0 || x >= W - 1 || y <= 0 || y >= H - 1) return false;
    if (this.tileAt(x, y) !== TILE.FLOOR) return false;
    if (Wd.inPen(x, y) || (x === PEN.spawnX && y === PEN.spawnY)) return false;
    var p = this.player;
    if (Math.abs(p.x - x) < 0.75 && Math.abs(p.y - y) < 0.75) return false;
    for (var i = 0; i < this.monsters.length; i++) {
      var m = this.monsters[i];
      if (Math.abs(m.x - x) < 1.25 && Math.abs(m.y - y) < 1.25) return false;
    }
    for (var j = 0; j < this.tnts.length; j++) if (this.tnts[j].x === x && this.tnts[j].y === y) return false;
    return true;
  };

  G.dropTnt = function () {
    if (this.state !== 'play') return false;
    if (this.tnt <= 0) { this.emit('notnt'); return false; }
    var c = nearestCenter(this.player); c.x = wrapX(c.x);
    for (var j = 0; j < this.tnts.length; j++) if (this.tnts[j].x === c.x && this.tnts[j].y === c.y) return false;
    this.tnts.push({ x: c.x, y: c.y, t: 2.2 });
    this.tnt--;
    this.emit('tnt-drop', { x: c.x, y: c.y });
    return true;
  };

  G.explode = function (bx, by) {
    this.emit('boom', { x: bx, y: by });
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      var x = bx + dx, y = by + dy;
      if (x <= 0 || x >= W - 1 || y <= 0 || y >= H - 1) continue;
      if (Wd.isMineable(this.tiles[y * W + x])) this.breakBlock(x, y, false);
    }
    for (var i = 0; i < this.monsters.length; i++) {
      var m = this.monsters[i];
      if ((m.mode === 'roam' || m.mode === 'leave') && Math.hypot(m.x - bx, m.y - by) < 1.7) {
        m.mode = 'eyes'; m.fright = false; m.fly = false;
        this.addScore(200);
        this.emit('eat', { x: m.x, y: m.y, pts: 200, kind: m.kind, tnt: true });
      }
    }
  };

  G.addScore = function (n) {
    this.score += n;
    if (!this.extraLifeGiven && this.score >= 10000) {
      this.extraLifeGiven = true;
      if (this.hearts < this.maxHearts) this.hearts++;
      else { this.maxHearts++; this.hearts++; }
      this.emit('extralife');
    }
  };

  // ---------- main update ----------
  G.update = function (dt) {
    if (this.paused) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    if (this.freeze > 0) { this.freeze -= dt; return; }
    switch (this.state) {
      case 'ready':
        this.stateT -= dt;
        for (var k = 0; k < this.monsters.length; k++) if (this.monsters[k].mode === 'pen') this.bob(this.monsters[k]);
        if (this.stateT <= 0) { this.state = 'play'; this.emit('go'); }
        break;
      case 'play':
        var n = dt > 0.02 ? 2 : 1;
        for (var s = 0; s < n && this.state === 'play'; s++) this.step(dt / n);
        break;
      case 'dying':
        this.stateT -= dt;
        this.player.deadT += dt;
        if (this.stateT <= 0) {
          this.hearts--;
          if (this.hearts <= 0) { this.state = 'over'; this.emit('gameover'); }
          else { this.resetPositions(); this.emit('respawn'); }
        }
        break;
      case 'clear':
        this.stateT -= dt;
        if (this.stateT <= 0) { this.state = 'done'; this.emit('levelclear'); }
        break;
    }
  };

  G.step = function (dt) {
    // timers
    if (this.powerT > 0) {
      this.powerT -= dt;
      if (this.powerT <= 0) { this.powerT = 0; this.monsters.forEach(function (m) { m.fright = false; }); this.emit('power-end'); }
    } else {
      this.phaseT -= dt;
      if (this.phaseT <= 0 && this.phase < this.diff.phases.length - 1) {
        this.phase++; this.phaseT = this.diff.phases[this.phase];
        this.monsters.forEach(function (m) { if (m.mode === 'roam') m.reverse = true; });
      }
    }
    for (var key in this.placed) {
      this.placed[key] -= dt;
      if (this.placed[key] <= 0) {
        var i = +key; delete this.placed[key];
        if (this.tiles[i] === TILE.PLANKS) { this.tiles[i] = TILE.FLOOR; this.emit('crumble', { x: i % W, y: (i - i % W) / W }); this.computeEyesField(); }
      }
    }
    for (var t = this.tnts.length - 1; t >= 0; t--) {
      var b = this.tnts[t]; b.t -= dt;
      if (b.t <= 0) { this.tnts.splice(t, 1); this.explode(b.x, b.y); }
    }
    if (this.food) { this.food.t -= dt; if (this.food.t <= 0) { this.food = null; this.emit('food-gone'); } }

    this.updatePlayer(dt);
    this.collect();
    if (this.state !== 'play') return;
    for (var mi = 0; mi < this.monsters.length; mi++) this.updateMonster(this.monsters[mi], dt);
    this.collide();
    if (this.state === 'play' && this.gemsLeft <= 0) {
      this.state = 'clear'; this.stateT = 2.2; this.player.mining = null; this.emit('clear');
    }
  };

  // generic grid mover: walks `dist` tiles along e.dir, calling onCenter at every tile centre
  G.move = function (e, dist, onCenter) {
    var guard = 0;
    while (dist > 1e-7 && e.dir >= 0 && guard++ < 12) {
      var horiz = (e.dir & 1) === 1, s = (e.dir === 1 || e.dir === 0) ? -1 : 1;
      var p = horiz ? e.x : e.y;
      var next = s > 0 ? Math.floor(p + 1e-6) + 1 : Math.ceil(p - 1e-6) - 1;
      var d = Math.abs(next - p), arrived = false;
      if (dist < d - 1e-6) { p += s * dist; dist = 0; }
      else { p = next; dist = Math.max(0, dist - d); arrived = true; }
      if (horiz) e.x = p; else e.y = p;
      if (e.x < -0.5) e.x += W; else if (e.x > W - 0.5) e.x -= W;
      if (arrived) {
        e.x = Math.round(e.x); e.y = Math.round(e.y);
        if (e.x < 0) e.x += W; else if (e.x > W - 1) e.x -= W;
        onCenter.call(this, e);
      }
    }
  };

  G.updatePlayer = function (dt) {
    var p = this.player;
    if (p.mining) {
      var m = p.mining;
      if (p.want >= 0 && p.want !== m.dir && this.passP(Math.round(p.x) + DX[p.want], Math.round(p.y) + DY[p.want])) {
        p.mining = null; // walked away
      } else if (this.tileAt(m.x, m.y) !== m.tile) {
        p.mining = null; // block vanished (TNT)
      } else {
        m.t += dt; m.hitT += dt;
        if (m.hitT >= 0.2) { m.hitT = 0; this.emit('mine-hit', { x: m.x, y: m.y, tile: m.tile, stage: m.t / m.total }); }
        if (m.t >= m.total) this.finishMine();
        return;
      }
    }
    if (p.digQ > 0) {
      p.digQ -= dt;
      if (Math.abs(p.x - Math.round(p.x)) + Math.abs(p.y - Math.round(p.y)) < 0.15 && this.mine(true)) return;
    }
    var cx = Math.round(p.x), cy = Math.round(p.y);
    if (p.dir < 0) {
      if (p.want >= 0 && this.passP(cx + DX[p.want], cy + DY[p.want])) { p.dir = p.want; p.facing = p.want; p.fresh = false; p.x = wrapX(cx); p.y = cy; }
      else if (p.want >= 0 && this.settings.pushDig && this.canMineAt(cx + DX[p.want], cy + DY[p.want])) {
        if (this.held === p.want) this.holdT += dt;
        if (p.fresh || this.holdT > 0.25) { p.fresh = false; this.holdT = 0; p.x = wrapX(cx); p.y = cy; this.startMine(p.want); return; }
      } else p.fresh = false;
      if (p.dir < 0) return;
    }
    // reversing is always allowed; perpendicular turns snap back if we just passed the centre
    if (p.want >= 0 && p.want !== p.dir) {
      var atC = Math.abs(p.x - Math.round(p.x)) < 1e-6 && Math.abs(p.y - Math.round(p.y)) < 1e-6;
      if (atC) {
        if (this.passP(Math.round(p.x) + DX[p.want], Math.round(p.y) + DY[p.want])) { p.dir = p.want; p.facing = p.want; p.fresh = false; }
      } else if (p.want === opp(p.dir)) { p.dir = p.want; p.facing = p.want; p.fresh = false; }
      else {
        var horiz = (p.dir & 1) === 1, s = (p.dir === 1 || p.dir === 0) ? -1 : 1;
        var pos = horiz ? p.x : p.y, c = Math.round(pos), past = (pos - c) * s;
        if (past >= 0 && past < 0.42) {
          var ccx = horiz ? c : Math.round(p.x), ccy = horiz ? Math.round(p.y) : c;
          if (this.passP(ccx + DX[p.want], ccy + DY[p.want])) {
            p.x = wrapX(ccx); p.y = ccy; p.dir = p.want; p.facing = p.want; p.fresh = false;
          }
        }
      }
    }
    var sp = this.playerSpeed();
    p.anim += dt * sp;
    this.move(p, sp * dt, function (e) {
      if (e.want >= 0 && e.want !== e.dir && this.passP(e.x + DX[e.want], e.y + DY[e.want])) { e.dir = e.want; e.facing = e.want; e.fresh = false; }
      if (!this.passP(e.x + DX[e.dir], e.y + DY[e.dir])) { e.facing = e.dir; e.dir = -1; if (e.want === e.facing) e.fresh = false; }
    });
  };

  G.collect = function () {
    var p = this.player, cx = Math.round(p.x), cy = Math.round(p.y);
    if (Math.abs(p.x - cx) > 0.34 || Math.abs(p.y - cy) > 0.34) return;
    cx = wrapX(cx);
    this.takeGem(cx, cy, false);
    if (this.up.magnet) for (var d = 0; d < 4; d++) {
      var nx = cx + DX[d], ny = cy + DY[d];
      if (this.passP(nx, ny) && this.gems[this.idx(nx, ny)] === 1) this.takeGem(wrapX(nx), ny, true);
    }
    if (this.food && this.food.x === cx && this.food.y === cy) {
      var pts = FOOD_PTS[this.food.kind] || 100;
      this.addScore(pts);
      var healed = this.hearts < this.maxHearts;
      if (healed) this.hearts++;
      this.emit('food', { x: cx, y: cy, pts: pts, kind: this.food.kind, healed: healed });
      this.food = null;
    }
  };

  G.takeGem = function (x, y, magnet) {
    var i = y * W + x, g = this.gems[i];
    if (!g || this.tiles[i] !== TILE.FLOOR) return;
    this.gems[i] = 0; this.gemsLeft--; this.gemsEaten++;
    if (g === 1) { this.addScore(10); this.emit('gem', { x: x, y: y, magnet: magnet }); }
    else { this.addScore(50); this.startPower(); this.emit('crystal', { x: x, y: y }); }
    // bonus food appears twice per level
    var thresholds = [0.3, 0.7];
    if (this.foodSpawned < 2 && this.gemsEaten >= Math.floor(this.gemsTotal * thresholds[this.foodSpawned])) {
      this.foodSpawned++;
      var f = this.L.food, fi = f.y * W + f.x;
      if (this.tiles[fi] === TILE.FLOOR) {
        var kind = Wd.biomeById(this.L.biome).food;
        this.food = { x: f.x, y: f.y, kind: kind, t: 10 };
        this.emit('food-spawn', { x: f.x, y: f.y, kind: kind });
      }
    }
  };

  G.startPower = function () {
    this.powerT = this.powerDuration(); this.combo = 0;
    this.monsters.forEach(function (m) {
      if (m.mode === 'eyes' || m.mode === 'enter') return;
      m.fright = true;
      if (m.mode === 'roam') m.reverse = true;
    });
    this.emit('power');
  };

  G.bob = function (m) {
    var slot = PEN.slots[Math.max(0, m.i - 1)];
    m.y = slot[1] + Math.sin(this.time * 5 + m.i * 1.7) * 0.18;
  };

  G.updateMonster = function (m, dt) {
    m.anim += dt * 6;
    var sp = this.monsterSpeed();
    switch (m.mode) {
      case 'pen':
        this.bob(m);
        m.releaseT -= dt;
        if (m.releaseT <= 0) { m.mode = 'leave'; m.leaveStage = 0; }
        break;
      case 'leave': {
        var ls = 2.6 * dt;
        if (m.leaveStage === 0) { // settle into the row, then slide to the door column
          m.y += Math.sign(11 - m.y) * Math.min(Math.abs(11 - m.y), ls);
          if (Math.abs(m.y - 11) < 1e-3) { m.y = 11; m.x += Math.sign(PEN.doorX - m.x) * Math.min(Math.abs(PEN.doorX - m.x), ls); }
          if (m.y === 11 && Math.abs(m.x - PEN.doorX) < 1e-3) { m.x = PEN.doorX; m.leaveStage = 1; }
        } else {
          m.y -= Math.min(ls, m.y - PEN.spawnY);
          if (m.y <= PEN.spawnY + 1e-3) {
            m.y = PEN.spawnY; m.x = PEN.spawnX; m.mode = 'roam';
            m.dir = this.rand() < 0.5 ? 1 : 3; m.reverse = false;
            if (!this.passM(m.x + DX[m.dir], m.y)) m.dir = opp(m.dir);
          }
        }
        break;
      }
      case 'enter': {
        var es = 6 * dt;
        m.x += Math.sign(PEN.doorX - m.x) * Math.min(Math.abs(PEN.doorX - m.x), es);
        m.y += Math.min(es, 11 - m.y);
        if (m.y >= 11 - 1e-3) {
          m.y = 11; m.mode = 'leave'; m.leaveStage = 1; m.fright = false;
          m.mode = 'pen'; m.releaseT = 0.8;
          m.x = PEN.doorX;
          m.homeSlot = true;
        }
        break;
      }
      case 'eyes': {
        var target = { x: PEN.spawnX, y: PEN.spawnY };
        var cur = this.eyesDist[this.idx(Math.round(m.x), Math.round(m.y))];
        if (m.fly || cur < 0) { // walled off: float straight home
          m.fly = true;
          var dx = target.x - m.x, dy = target.y - m.y, dd = Math.hypot(dx, dy), st = 10 * dt;
          if (dd <= st) { m.x = target.x; m.y = target.y; m.fly = false; m.mode = 'enter'; }
          else { m.x += dx / dd * st; m.y += dy / dd * st; }
          break;
        }
        if (m.dir < 0) m.dir = 0;
        if (Math.round(m.x) === target.x && Math.round(m.y) === target.y && Math.abs(m.x - target.x) < 0.05 && Math.abs(m.y - target.y) < 0.05) {
          m.x = target.x; m.y = target.y; m.mode = 'enter'; break;
        }
        // if we're sitting on a centre, choose first
        if (Math.abs(m.x - Math.round(m.x)) < 1e-6 && Math.abs(m.y - Math.round(m.y)) < 1e-6) this.eyesChoose(m);
        this.move(m, 11 * dt, function (e) {
          if (e.x === target.x && e.y === target.y) { e.mode = 'enter'; e.dir = -1; return; }
          this.eyesChoose(e);
        });
        break;
      }
      case 'roam': {
        if (m.reverse) {
          m.reverse = false;
          if (m.dir >= 0) {
            var atc = Math.abs(m.x - Math.round(m.x)) < 1e-6 && Math.abs(m.y - Math.round(m.y)) < 1e-6;
            if (!atc || this.passM(Math.round(m.x) + DX[opp(m.dir)], Math.round(m.y) + DY[opp(m.dir)])) m.dir = opp(m.dir);
          }
        }
        var s2 = sp;
        if (m.fright) s2 = sp * 0.55;
        else if (this.wrapRow[Math.round(m.y)] && Math.round(m.y) === Wd.TUNNEL_ROW && (m.x < 4.5 || m.x > W - 5.5)) s2 = sp * 0.55;
        else if (m.i === 0 && this.diff.elroy && this.phase >= 0) {
          if (this.gemsLeft < 12) s2 = sp * 1.1; else if (this.gemsLeft < 25) s2 = sp * 1.05;
        }
        if (m.dir < 0) { // stuck (sealed in by planks): try to get out or chew
          this.chooseDir(m, true);
          if (m.dir < 0) { this.chew(m, dt); break; }
        }
        this.move(m, s2 * dt, function (e) { this.chooseDir(e, false); });
        break;
      }
    }
  };

  G.eyesChoose = function (m) {
    var best = -1, bestD = 1e9;
    for (var d = 0; d < 4; d++) {
      var nx = Math.round(m.x) + DX[d], ny = Math.round(m.y) + DY[d];
      if (!this.passM(nx, ny)) continue;
      var v = this.eyesDist[this.idx(nx, ny)];
      if (v >= 0 && v < bestD) { bestD = v; best = d; }
    }
    if (best < 0) { m.fly = true; m.dir = -1; } else m.dir = best;
  };

  G.target = function (m) {
    var p = this.player, f = p.dir >= 0 ? p.dir : p.facing;
    var px = Math.round(p.x), py = Math.round(p.y);
    if (this.globalMode() === 'scatter') return { x: m.corner[0], y: m.corner[1] };
    switch (m.kind) {
      case 'rumble': return { x: px, y: py };
      case 'sly': return { x: px + DX[f] * 4, y: py + DY[f] * 4 };
      case 'frost': {
        var r = this.monsters[0], vx = px + DX[f] * 2, vy = py + DY[f] * 2;
        return { x: vx * 2 - r.x, y: vy * 2 - r.y };
      }
      default: { // mudge: brave from afar, shy up close
        var dd = Math.hypot(m.x - p.x, m.y - p.y);
        return dd > 8 ? { x: px, y: py } : { x: m.corner[0], y: m.corner[1] };
      }
    }
  };

  G.chooseDir = function (m, stuck) {
    var cx = Math.round(m.x), cy = Math.round(m.y), opts = [];
    var back = m.dir >= 0 ? opp(m.dir) : -1;
    for (var d = 0; d < 4; d++) {
      if (d === back) continue;
      if (this.passM(cx + DX[d], cy + DY[d]) && !(cx === PEN.spawnX && cy === PEN.spawnY && d === 2)) opts.push(d);
    }
    if (!opts.length && back >= 0 && this.passM(cx + DX[back], cy + DY[back])) opts.push(back);
    if (!opts.length) { m.dir = -1; return; }
    if (m.fright) { m.dir = opts[Math.floor(this.rand() * opts.length)]; return; }
    var t = this.target(m), best = opts[0], bestD = 1e12;
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i], nx = cx + DX[o], ny = cy + DY[o], dd = (nx - t.x) * (nx - t.x) + (ny - t.y) * (ny - t.y);
      if (dd < bestD - 1e-9) { bestD = dd; best = o; }
    }
    m.dir = best;
  };

  G.chew = function (m, dt) {
    var cx = Math.round(m.x), cy = Math.round(m.y);
    for (var d = 0; d < 4; d++) {
      var nx = cx + DX[d], ny = cy + DY[d];
      if (this.tileAt(nx, ny) === TILE.PLANKS) {
        m.chewT += dt;
        if (m.chewT > 1.3) {
          m.chewT = 0;
          var idx = this.idx(nx, ny);
          this.tiles[idx] = TILE.FLOOR; delete this.placed[idx];
          this.emit('crumble', { x: wrapX(nx), y: ny, chewed: true });
          this.computeEyesField();
        }
        return;
      }
    }
  };

  G.collide = function () {
    var p = this.player;
    for (var i = 0; i < this.monsters.length; i++) {
      var m = this.monsters[i];
      if (m.mode !== 'roam') continue;
      var dx = Math.abs(m.x - p.x); if (dx > W / 2) dx = W - dx;
      var dy = Math.abs(m.y - p.y);
      if (dx < 0.6 && dy < 0.6) {
        if (m.fright) {
          this.combo++;
          var pts = 200 * Math.pow(2, Math.min(this.combo, 4) - 1);
          this.addScore(pts);
          m.mode = 'eyes'; m.fright = false; m.fly = false;
          this.freeze = 0.4;
          this.emit('eat', { x: m.x, y: m.y, pts: pts, kind: m.kind });
        } else {
          this.state = 'dying'; this.stateT = 1.8; p.mining = null; p.deadT = 0;
          this.emit('death', { x: p.x, y: p.y, by: m.kind });
          return;
        }
      }
    }
  };

  // snapshot of what should carry over to the next level
  G.carry = function () {
    return { score: this.score, hearts: this.hearts, blocks: this.blocks, tnt: this.tnt, extraLifeGiven: this.extraLifeGiven };
  };

  var api = { Game: Game, DX: DX, DY: DY, opp: opp, DIFF: DIFF, PICK_SPEED: PICK_SPEED, FOOD_PTS: FOOD_PTS, MONSTERS: MONSTERS, BASE_SPEED: BASE_SPEED };
  root.PCGame = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
