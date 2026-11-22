/* Blockcade v4.0 — action pack 1: Bat Flap, Slime Pong, Sky Swarm, Lava Leap, Desert Run, Ore Rain. */
(function () {
  'use strict';
  var R = PCMini.reg;

  // ---------- Bat Flap: flap a cave bat through the gaps in the stone pillars ----------
  R({
    id: 'batflap', name: 'Bat Flap', cat: 'action', medals: [100, 300, 700], music: 'caves',
    blurb: 'Tap to flap! Squeeze a cave bat through the gaps in the stone pillars.',
    controls: { dpad: false, a: 'FLAP', b: null }, pet: [22, 417],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#1b1822'; g.fillRect(0, 0, w, h);
      [[14, 14], [42, 28]].forEach(function (p) { for (var y = 0; y < h; y += 8) if (y < p[1] - 2 || y > p[1] + 14) g.drawImage(tex.blocks[T.STONE].top, 0, 0, 16, 16, p[0], y, 10, 8); });
      g.fillStyle = '#6b4a9c'; g.fillRect(26, 20, 8, 6); g.fillRect(20, 17, 6, 4); g.fillRect(34, 17, 6, 4); g.fillStyle = '#fff'; g.fillRect(28, 21, 1, 2); g.fillRect(31, 21, 1, 2);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, BX = 70, y = 200, vy = 0, pipes = [], sp = 0.4, inv = 0, passed = 0, wait = 1.2;
      function flap() { if (wait > 0.4) return; vy = -215; c.fx('hop'); }
      function crash() { if (!c.hit(BX, y)) { inv = 1.6; y = 200; vy = -150; } }
      return {
        tap: flap, a: flap, lines: function () { return [['Pillars passed', passed]]; },
        update: function (dt) {
          if (wait > 0) { wait -= dt; return; }
          var v = 92 + c.level * 12;
          vy += 580 * dt; y += vy * dt; if (inv > 0) inv -= dt;
          sp -= dt;
          if (sp <= 0) { sp = 150 / v + c.rnd(0, 0.25); var gap = Math.max(92, 132 - c.level * 6); pipes.push({ x: W + 20, gy: c.rnd(40, H - 50 - gap), gap: gap, done: false, ore: Math.random() < 0.25 ? c.oreRoll() : null }); }
          pipes.forEach(function (p) {
            p.x -= v * dt;
            if (!p.done && p.x + 24 < BX - 8) { p.done = true; passed++; c.add(10, BX, y - 14); c.fx('gem'); if (passed % 8 === 0) c.levelUp(); }
            if (p.ore && Math.abs(p.x + 12 - BX) < 16 && Math.abs(y - (p.gy + p.gap / 2)) < 20) { c.ore(p.ore, BX, y - 12); p.ore = null; }
            if (inv <= 0 && p.x < BX + 8 && p.x + 24 > BX - 8 && (y - 6 < p.gy || y + 6 > p.gy + p.gap)) crash();
          });
          pipes = pipes.filter(function (p) { return p.x > -40; });
          if (y > H - 14) { y = H - 14; vy = 0; if (inv <= 0) crash(); }
          if (y < 28) { y = 28; vy = 0; }
        },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H);
          g.fillStyle = '#241c2c'; for (var i = 0; i < 8; i++) g.fillRect((i * 97 - c.time * 20) % (W + 40) + (i * 97 - c.time * 20 < 0 ? W + 40 : 0) - 20, 60 + (i * 53) % 300, 30, 14);
          pipes.forEach(function (p) {
            for (var yy = p.gy - 16; yy > 6; yy -= 16) c.block(g, T.STONE, p.x, yy, 24, 16);
            for (var y2 = p.gy + p.gap; y2 < H; y2 += 16) c.block(g, T.STONE, p.x, y2, 24, 16);
            c.block(g, T.COBBLE, p.x - 2, p.gy - 10, 28, 10); c.block(g, T.COBBLE, p.x - 2, p.gy + p.gap, 28, 10);
            if (p.ore) c.oreIcon(g, p.ore, p.x + 4, p.gy + p.gap / 2 - 8 + Math.sin(c.time * 5) * 2, 16);
          });
          c.fill(g, T.BASALT, 0, H - 8, W, 8, 16);
          if (inv > 0 && Math.floor(c.time * 12) % 2) return;
          var up = vy < 0 || Math.floor(c.time * 8) % 2;
          g.fillStyle = '#4a3370'; g.fillRect(BX - 14, y + (up ? -7 : 1), 9, 5); g.fillRect(BX + 5, y + (up ? -7 : 1), 9, 5);
          g.fillStyle = '#6b4a9c'; g.fillRect(BX - 6, y - 5, 12, 10); g.fillRect(BX - 5, y - 8, 3, 3); g.fillRect(BX + 2, y - 8, 3, 3);
          g.fillStyle = '#fff'; g.fillRect(BX - 3, y - 2, 2, 3); g.fillRect(BX + 2, y - 2, 2, 3);
        }
      };
    }
  });

  // ---------- Slime Pong: bat the slime past Rumble's paddle ----------
  R({
    id: 'pong', name: 'Slime Pong', cat: 'action', medals: [300, 1200, 3500], music: 'meadow',
    blurb: 'Bounce the slime past Rumble at the top. Drag to slide your plank.',
    controls: { dpad: 'lr', a: null, b: null },
    thumb: function (g, w, h, tex, T) {
      for (var y = 0; y < h; y += 16) for (var x = 0; x < w; x += 16) g.drawImage(tex.blocks[T.GRASS].top, x, y);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(0, 23, w, 2);
      g.drawImage(tex.blocks[T.PLANKS].top, 0, 0, 16, 5, 30, 40, 22, 5); g.drawImage(tex.mons.rumble[0], 12, 2, 12, 12); g.fillStyle = '#5ef0a8'; g.fillRect(36, 20, 6, 6);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, px = W / 2, cx = W / 2, b = { x: W / 2, y: H / 2, vx: 0, vy: 0 }, wait = 1, pts = 0, PY = H - 34, CY = 48;
      function serve(dir) { var a = c.rnd(-0.6, 0.6), s = 175 + c.level * 14; b.x = W / 2; b.y = H / 2; b.vx = Math.sin(a) * s; b.vy = dir * Math.cos(a) * s; wait = 0.9; }
      serve(1);
      return {
        lines: function () { return [['Points won', pts]]; },
        update: function (dt) {
          if (c.dir === 1) px -= 250 * dt; if (c.dir === 3) px += 250 * dt;
          if (c.touching) px += (c.tx - px) * Math.min(1, dt * 18);
          px = c.clamp(px, 28, W - 28);
          var ms = (72 + c.level * 15) * dt, tg = b.vy < 0 ? b.x : W / 2; cx += c.clamp(tg - cx, -ms, ms); cx = c.clamp(cx, 28, W - 28);
          if (wait > 0) { wait -= dt; return; }
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.x < 6) { b.x = 6; b.vx = Math.abs(b.vx); } if (b.x > W - 6) { b.x = W - 6; b.vx = -Math.abs(b.vx); }
          if (b.vy > 0 && b.y >= PY - 5 && b.y <= PY + 8 && Math.abs(b.x - px) < 32) { b.vy = -Math.abs(b.vy) * 1.04; b.vx += (b.x - px) * 4; b.y = PY - 5; c.add(5); c.fx('bonk'); }
          if (b.vy < 0 && b.y <= CY + 5 && b.y >= CY - 8 && Math.abs(b.x - cx) < 32) { b.vy = Math.abs(b.vy) * 1.04; b.vx += (b.x - cx) * 3; b.y = CY + 5; c.fx('hop'); }
          b.vx = c.clamp(b.vx, -270, 270); b.vy = c.clamp(b.vy, -430, 430);
          if (b.y < 24) { pts++; c.add(100 * c.level, W / 2, 90, '#ffe680'); c.fx('crystal'); if (pts % 3 === 0) { c.levelUp(); c.ore(null, W / 2, 130); } serve(1); }
          else if (b.y > H + 6) { if (!c.hit(b.x, H - 20)) serve(-1); }
        },
        draw: function (g) {
          c.fill(g, T.GRASS, 0, 0, W, H, 32); g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(0, 0, W, H);
          g.fillStyle = 'rgba(255,255,255,0.3)'; for (var x = 4; x < W; x += 24) g.fillRect(x, H / 2 - 1, 12, 3);
          c.block(g, T.COBBLE, cx - 28, CY - 5, 56, 10); c.mon(g, 'rumble', cx - 10, CY - 24, 20, b.x < cx ? 1 : 3);
          c.block(g, T.PLANKS, px - 28, PY, 56, 10); c.hero(g, px - 10, PY + 8, 20, 'up', 0);
          g.fillStyle = '#2f8a5a'; g.fillRect(b.x - 7, b.y - 7, 14, 14); g.fillStyle = '#5ef0a8'; g.fillRect(b.x - 6, b.y - 6, 12, 12); g.fillStyle = '#123'; g.fillRect(b.x - 4, b.y - 2, 2, 3); g.fillRect(b.x + 2, b.y - 2, 2, 3);
        }
      };
    }
  });

  // ---------- Sky Swarm: monsters hang in formation, then dive at you ----------
  R({
    id: 'swarm', name: 'Sky Swarm', cat: 'action', medals: [1500, 5000, 12000], music: 'crystal',
    blurb: 'A swarm of monsters hovers overhead and dives at you. Dodge and keep shooting!',
    controls: { dpad: 'lr', a: null, b: null }, pet: [18, 417],
    thumb: function (g, w, h, tex) {
      g.fillStyle = '#0d0b1e'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; [[5, 6], [50, 12], [30, 3], [58, 30]].forEach(function (s) { g.fillRect(s[0], s[1], 1, 1); });
      ['frost', 'sly', 'mudge'].forEach(function (k, i) { g.drawImage(tex.mons[k][0], 8 + i * 18, 6, 12, 12); }); g.drawImage(tex.mons.rumble[0], 40, 24, 12, 12);
      g.fillStyle = '#ffe680'; g.fillRect(31, 30, 2, 5); g.drawImage(PCTex.hero(PCTex.LOOK_DEFAULT).up[0], 24, 35, 14, 14);
    },
    make: function (c) {
      var W = c.W, H = c.H, px = W / 2, PY = H - 46, shots = [], en = [], drops = [], fireT = 0, diveT = 2, inv = 0, kills = 0;
      var KINDS = ['rumble', 'frost', 'sly', 'mudge'];
      function wave() {
        en = []; var rows = Math.min(5, 2 + Math.floor(c.level / 2));
        for (var r = 0; r < rows; r++) for (var i = 0; i < 6; i++) en.push({ hx: 50 + i * 44, hy: 52 + r * 30, x: 50 + i * 44, y: -30 - r * 20, kind: KINDS[r % 4], dive: false, t: 0, sx: 0, hp: r === 0 && c.level > 2 ? 2 : 1 });
        diveT = 1.8;
      }
      wave();
      return {
        lines: function () { return [['Monsters zapped', kills]]; },
        update: function (dt) {
          if (c.dir === 1) px -= 230 * dt; if (c.dir === 3) px += 230 * dt;
          if (c.touching) px += (c.tx - px) * Math.min(1, dt * 16);
          px = c.clamp(px, 14, W - 14); if (inv > 0) inv -= dt;
          fireT -= dt; if (fireT <= 0) { fireT = 0.3; shots.push({ x: px, y: PY - 8 }); }
          var off = Math.sin(c.time * 1.2) * 18;
          diveT -= dt;
          if (diveT <= 0) { var idle = en.filter(function (e) { return !e.dive && e.y >= e.hy - 1; }); if (idle.length) { var d = c.pick(idle); d.dive = true; d.t = 0; d.sx = d.x; c.fx('hop'); } diveT = Math.max(0.55, 2.2 - c.level * 0.16); }
          en.forEach(function (e) {
            if (!e.dive) { e.x = e.hx + off; e.y += Math.min(e.hy - e.y, 160 * dt); return; }
            e.t += dt; e.y += (115 + c.level * 10) * dt; e.x = e.sx + Math.sin(e.t * 4) * 46 + (px - e.sx) * Math.min(1, e.t * 0.45);
            if (e.y > H + 20) { e.dive = false; e.y = -20; }
            if (inv <= 0 && Math.abs(e.x - px) < 16 && Math.abs(e.y - PY) < 16) { e.dead = true; if (!c.hit(px, PY)) inv = 1.4; }
          });
          shots.forEach(function (s) {
            s.y -= 340 * dt;
            en.forEach(function (e) {
              if (s.dead || e.dead || Math.abs(e.x - s.x) > 13 || Math.abs(e.y - s.y) > 13) return;
              s.dead = true; if (--e.hp > 0) { c.fx('hit'); return; }
              e.dead = true; kills++; c.add((e.dive ? 40 : 20) * c.level, e.x, e.y - 10); c.K.burst(e.x, e.y, '#c9ccd4', 8); c.fx('bonk');
              if (Math.random() < 0.07) drops.push({ x: e.x, y: e.y, kind: c.oreRoll() });
            });
          });
          shots = shots.filter(function (s) { return !s.dead && s.y > 20; });
          en = en.filter(function (e) { return !e.dead; });
          drops.forEach(function (o) { o.y += 95 * dt; if (Math.abs(o.x - px) < 18 && Math.abs(o.y - PY) < 18) { o.dead = true; c.ore(o.kind, px, PY - 20); } });
          drops = drops.filter(function (o) { return !o.dead && o.y < H + 10; });
          if (!en.length && !c.done) { c.levelUp(); wave(); }
        },
        draw: function (g) {
          g.fillStyle = '#0d0b1e'; g.fillRect(0, 0, W, H);
          g.fillStyle = '#fff'; for (var i = 0; i < 40; i++) g.fillRect((i * 83) % W, (i * 47 + c.time * (10 + i % 3 * 12)) % H, 1 + i % 2, 1 + i % 2);
          en.forEach(function (e) { c.mon(g, e.kind, e.x - 11, e.y - 11, 22, e.dive ? 2 : -1); if (e.hp > 1) { g.fillStyle = 'rgba(247,201,54,0.45)'; g.fillRect(e.x - 11, e.y - 11, 22, 22); } });
          g.fillStyle = '#ffe680'; shots.forEach(function (s) { g.fillRect(s.x - 1, s.y - 6, 3, 10); });
          drops.forEach(function (o) { c.oreIcon(g, o.kind, o.x - 8, o.y - 8, 16); });
          if (!(inv > 0 && Math.floor(c.time * 12) % 2)) { g.fillStyle = '#8b8b96'; g.fillRect(px - 13, PY + 6, 26, 6); c.hero(g, px - 11, PY - 12, 22, 'up', Math.floor(c.time * 6) % 2 + 1); }
        }
      };
    }
  });

  // ---------- Lava Leap: bounce up the platforms, don't fall into the lava ----------
  R({
    id: 'lavaleap', name: 'Lava Leap', cat: 'action', medals: [150, 500, 1200], music: 'lava',
    blurb: 'Bounce higher and higher up the blocks. Slide your finger to steer. Mind the crumbly sand!',
    controls: { dpad: 'lr', a: null, b: null }, pet: [18, 418],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#2a1420'; g.fillRect(0, 0, w, h);
      [[6, 38, T.GRASS], [34, 26, T.SAND], [12, 12, T.ICE]].forEach(function (p) { g.drawImage(tex.blocks[p[2]].top, 0, 0, 16, 5, p[0], p[1], 22, 5); });
      g.drawImage(PCTex.hero(PCTex.LOOK_DEFAULT).right[1], 36, 10, 14, 14); for (var x = 0; x < w; x += 16) g.drawImage(tex.blocks[T.MAGMA].top, 0, 0, 16, 5, x, 44, 16, 5);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, p = { x: W / 2, y: 388, vx: 0, vy: -400 }, plats = [{ x: 0, y: 390, w: W, kind: 'norm' }], cam = 0, topY = 390, best = 0, face = 3;
      function gen() {
        while (topY > cam - 80) {
          topY -= c.rnd(40, Math.min(84, 54 + c.level * 4)); var r = Math.random();
          plats.push({ x: c.rnd(8, W - 60), y: topY, w: 50, kind: r < 0.12 + c.level * 0.02 ? 'move' : r < 0.3 + c.level * 0.02 ? 'crumble' : 'norm', vx: c.pick([-50, 50]), ore: Math.random() < 0.07 ? c.oreRoll() : null });
        }
      }
      gen();
      return {
        lines: function () { return [['Height', best + ' m']]; },
        update: function (dt) {
          var tv = c.dir === 1 ? -180 : c.dir === 3 ? 180 : 0;
          if (c.touching) tv = c.clamp((c.tx - p.x) * 7, -210, 210);
          p.vx += (tv - p.vx) * Math.min(1, dt * 10); if (Math.abs(p.vx) > 8) face = p.vx > 0 ? 3 : 1;
          p.x += p.vx * dt; if (p.x < -8) p.x = W + 8; if (p.x > W + 8) p.x = -8;
          var py = p.y; p.vy += 640 * dt; p.y += p.vy * dt;
          plats.forEach(function (pl) {
            if (pl.kind === 'move') { pl.x += pl.vx * dt; if (pl.x < 4 || pl.x + pl.w > W - 4) pl.vx = -pl.vx; }
            if (pl.dead) return;
            if (p.vy > 0 && py <= pl.y && p.y >= pl.y && p.x + 7 > pl.x && p.x - 7 < pl.x + pl.w) { p.y = pl.y; p.vy = -400; c.fx('hop'); if (pl.kind === 'crumble') { pl.dead = true; c.K.burst(pl.x + 25, pl.y, '#e3d29a', 10, 90); c.fx('crumble'); } }
            if (pl.ore && Math.abs(p.x - (pl.x + pl.w / 2)) < 18 && Math.abs(p.y - 12 - (pl.y - 16)) < 20) { c.ore(pl.ore, p.x, p.y - cam - 30); pl.ore = null; }
          });
          if (p.y - cam < 170) cam = p.y - 170;
          var hgt = Math.floor(-cam / 10);
          if (hgt > best) { c.add(hgt - best); best = hgt; if (best >= c.level * 120) c.levelUp(); }
          gen();
          plats = plats.filter(function (pl) { return pl.y < cam + H + 40 && !(pl.dead && pl.y > p.y + 40); });
          if (p.y - cam > H + 24) {
            if (!c.hit(p.x, H - 30)) { var lo = null; plats.forEach(function (pl) { if (!pl.dead && pl.y < cam + H - 60 && (!lo || pl.y > lo.y)) lo = pl; }); if (lo) { p.x = lo.x + lo.w / 2; p.y = lo.y - 1; } else { p.y = cam + 200; } p.vy = -420; p.vx = 0; }
          }
        },
        draw: function (g) {
          var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a1430'); gr.addColorStop(1, '#4a1a18'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
          plats.forEach(function (pl) {
            if (pl.dead) return; var y = pl.y - cam, tile = pl.kind === 'move' ? T.ICE : pl.kind === 'crumble' ? T.SAND : T.GRASS;
            for (var x = pl.x; x < pl.x + pl.w - 1; x += 10) c.block(g, tile, x, y, Math.min(10, pl.x + pl.w - x), 8);
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(pl.x, y + 8, pl.w, 2);
            if (pl.ore) c.oreIcon(g, pl.ore, pl.x + pl.w / 2 - 8, y - 22 + Math.sin(c.time * 5) * 2, 16);
          });
          c.hero(g, p.x - 11, p.y - cam - 22, 22, face === 3 ? 'right' : 'left', p.vy < 0 ? 1 : 2);
          for (var x = 0; x < W; x += 16) c.block(g, T.MAGMA, x, H - 10 + Math.sin(c.time * 3 + x) * 2, 16, 12);
          c.text(g, best + ' M', 6, 26, 2, '#ffe680');
        }
      };
    }
  });

  // ---------- Desert Run: endless runner with a double jump ----------
  R({
    id: 'dunerun', name: 'Desert Run', cat: 'action', medals: [200, 600, 1500], music: 'desert',
    blurb: 'Run the dunes! Tap to jump the cactus, tap again in the air for a double jump.',
    controls: { dpad: false, a: 'JUMP', b: null }, pet: [22, 346],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#ffcf87'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff3c4'; g.fillRect(44, 6, 10, 10);
      for (var x = 0; x < w; x += 16) g.drawImage(tex.blocks[T.SAND].top, x, 36);
      g.fillStyle = '#2f8a3a'; g.fillRect(44, 22, 5, 14); g.fillRect(40, 26, 4, 3); g.fillRect(49, 24, 4, 3); g.drawImage(PCTex.hero(PCTex.LOOK_DEFAULT).right[1], 12, 16, 16, 16);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, GY = 330, HX = 58, y = 0, vy = 0, jumps = 0, obs = [], sp = 1.2, dist = 0, sc = 0, inv = 0;
      function jump() { if (jumps < 2) { vy = jumps ? -300 : -345; jumps++; c.fx('hop'); } }
      return {
        tap: jump, a: jump, lines: function () { return [['Distance', Math.floor(dist / 10) + ' m']]; },
        update: function (dt) {
          var v = 150 + c.level * 18;
          vy += 920 * dt; y += vy * dt; if (y > 0) { y = 0; vy = 0; jumps = 0; }
          if (inv > 0) inv -= dt;
          dist += v * dt; var ns = Math.floor(dist / 20); if (ns > sc) { c.add(ns - sc); sc = ns; }
          if (dist > c.level * 2600) c.levelUp();
          sp -= dt;
          if (sp <= 0) {
            sp = c.rnd(0.85, 1.6) * Math.max(0.6, 1 - c.level * 0.04); var r = Math.random();
            if (r < 0.2) obs.push({ x: W + 20, kind: 'ore', w: 16, h: c.rnd(46, 92), ore: c.oreRoll() });
            else obs.push({ x: W + 20, kind: 'cactus', w: r < 0.6 ? 14 : 28, h: r < 0.82 ? 26 : 40 });
          }
          obs.forEach(function (o) {
            o.x -= v * dt; if (o.x > HX + 10 || o.x + o.w < HX - 8) return;
            if (o.kind === 'ore') { if (Math.abs((GY + y - 12) - (GY - o.h)) < 22) { o.dead = true; c.ore(o.ore, HX, GY + y - 34); } }
            else if (inv <= 0 && GY + y > GY - o.h + 4) { if (!c.hit(HX, GY + y - 10)) inv = 1.3; }
          });
          obs = obs.filter(function (o) { return !o.dead && o.x > -40; });
        },
        draw: function (g) {
          var gr = g.createLinearGradient(0, 0, 0, GY); gr.addColorStop(0, '#ff9a5a'); gr.addColorStop(1, '#ffe2a8'); g.fillStyle = gr; g.fillRect(0, 0, W, GY);
          g.fillStyle = '#fff3c4'; g.fillRect(230, 60, 34, 34);
          g.fillStyle = '#e0a868'; for (var i = 0; i < 4; i++) { var dx = ((i * 130 - dist * 0.3) % 520 + 520) % 520 - 100; g.fillRect(dx, GY - 40, 110, 40); g.fillRect(dx + 20, GY - 58, 70, 18); }
          for (var x = -(dist % 16); x < W; x += 16) { c.block(g, T.SAND, x, GY, 16); c.block(g, T.SANDSTONE, x, GY + 16, 16); }
          c.fill(g, T.SANDSTONE, 0, GY + 32, W, H - GY - 32, 16);
          obs.forEach(function (o) {
            if (o.kind === 'ore') { c.oreIcon(g, o.ore, o.x, GY - o.h - 8 + Math.sin(c.time * 5) * 2, 16); return; }
            g.fillStyle = '#1f6b2a'; g.fillRect(o.x, GY - o.h, o.w, o.h); g.fillStyle = '#2f8a3a'; g.fillRect(o.x + 2, GY - o.h + 2, o.w - 5, o.h - 2);
            g.fillStyle = '#1f6b2a'; g.fillRect(o.x - 5, GY - o.h + 10, 5, 4); g.fillRect(o.x + o.w, GY - o.h + 6, 5, 4);
          });
          if (!(inv > 0 && Math.floor(c.time * 12) % 2)) c.hero(g, HX - 12, GY + y - 24, 24, 'right', y < 0 ? 1 : 1 + Math.floor(c.time * 10) % 2);
          c.text(g, Math.floor(dist / 10) + ' M', 6, 26, 2, '#fff');
        }
      };
    }
  });

  // ---------- Ore Rain: catch the falling ore in a minecart, dodge the TNT ----------
  R({
    id: 'orerain', name: 'Ore Rain', cat: 'action', medals: [500, 2000, 6000], music: 'caves',
    blurb: 'It is raining ore! Roll your minecart under it. Do not catch the TNT.',
    controls: { dpad: 'lr', a: null, b: null }, pet: [18, 417],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#241c2c'; g.fillRect(0, 0, w, h);
      g.drawImage(tex.ores.gold, 10, 6, 10, 10); g.drawImage(tex.ores.diamond, 40, 14, 10, 10); g.drawImage(tex.tnt[0], 26, 2, 10, 10);
      g.fillStyle = '#8b8b96'; g.fillRect(20, 34, 24, 9); g.fillStyle = '#3a3a44'; g.fillRect(22, 43, 4, 3); g.fillRect(38, 43, 4, 3);
      for (var x = 0; x < w; x += 16) g.drawImage(tex.blocks[T.COBBLE].top, 0, 0, 16, 3, x, 46, 16, 3);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, px = W / 2, PY = H - 40, items = [], sp = 0.8, caught = 0, combo = 0;
      var PTS = { coal: 10, iron: 20, gold: 40, diamond: 80, ember: 150 };
      return {
        lines: function () { return [['Ore caught', caught]]; },
        update: function (dt) {
          if (c.dir === 1) px -= 260 * dt; if (c.dir === 3) px += 260 * dt;
          if (c.touching) px += (c.tx - px) * Math.min(1, dt * 18);
          px = c.clamp(px, 22, W - 22);
          sp -= dt;
          if (sp <= 0) { sp = Math.max(0.28, 0.85 - c.level * 0.055) * c.rnd(0.7, 1.3); items.push({ x: c.rnd(16, W - 16), y: 10, vy: c.rnd(110, 150) + c.level * 14, kind: Math.random() < 0.16 + c.level * 0.012 ? 'tnt' : c.oreRoll() }); }
          items.forEach(function (o) {
            o.y += o.vy * dt;
            if (o.y > PY - 8 && o.y < PY + 14 && Math.abs(o.x - px) < 24) {
              o.dead = true;
              if (o.kind === 'tnt') { combo = 0; c.fx('boom'); c.hit(px, PY); return; }
              caught++; combo++; c.add(PTS[o.kind] * (1 + Math.floor(combo / 8)), px, PY - 16); c.fx('gem');
              if (caught % 14 === 0) c.ore(o.kind, px, PY - 34);
              if (caught % 20 === 0) c.levelUp();
            } else if (o.y > H - 12) { o.dead = true; if (o.kind !== 'tnt') combo = 0; c.K.burst(o.x, H - 12, o.kind === 'tnt' ? '#ff6a1f' : '#8b8b96', 5, 80); }
          });
          items = items.filter(function (o) { return !o.dead; });
        },
        draw: function (g) {
          g.fillStyle = '#1b1822'; g.fillRect(0, 0, W, H); c.fill(g, T.STONE, 0, 0, W, 32, 16); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, W, 32);
          c.fill(g, T.COBBLE, 0, H - 12, W, 12, 16); g.fillStyle = '#5a5a60'; g.fillRect(0, H - 16, W, 2); g.fillRect(0, H - 22, W, 2);
          items.forEach(function (o) { if (o.kind === 'tnt') g.drawImage(c.tex.tnt[Math.floor(c.time * 8) % 2], o.x - 9, o.y - 9, 18, 18); else c.oreIcon(g, o.kind, o.x - 9, o.y - 9, 18); });
          c.hero(g, px - 9, PY - 16, 18, 'down', 0);
          g.fillStyle = '#5a5a60'; g.fillRect(px - 24, PY, 48, 18); g.fillStyle = '#8b8b96'; g.fillRect(px - 22, PY + 2, 44, 12); g.fillStyle = '#b3b3b8'; g.fillRect(px - 22, PY + 2, 44, 2);
          g.fillStyle = '#2a2a30'; g.fillRect(px - 18, PY + 16, 8, 6); g.fillRect(px + 10, PY + 16, 8, 6);
          if (combo >= 8) c.ctext(g, 'COMBO x' + (1 + Math.floor(combo / 8)), W / 2, 28, 2, '#ffe680');
        }
      };
    }
  });
})();
