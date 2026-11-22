/* Blockcade v4.0 — action pack 2: Road Rush, Canyon Flyer, Mob Arena, Block Chop, Flip Runner, Rail Race. */
(function () {
  'use strict';
  var R = PCMini.reg, DX = PCMini.DX, DY = PCMini.DY;

  // ---------- Road Rush: swerve between four lanes ----------
  R({
    id: 'racer', name: 'Road Rush', cat: 'action', medals: [300, 1000, 2500], music: 'desert',
    blurb: 'Swerve your cart between the lanes. Tap left or right. Grab emeralds, miss the boulders.',
    controls: { dpad: 'lr', a: null, b: null }, pet: [16, 417],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#4fa132'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3a44'; g.fillRect(10, 0, 44, h);
      g.fillStyle = '#ffe680'; for (var y = 2; y < h; y += 12) { g.fillRect(21, y, 1, 6); g.fillRect(32, y, 1, 6); g.fillRect(43, y, 1, 6); }
      g.drawImage(tex.blocks[T.COBBLE].top, 0, 0, 16, 16, 23, 6, 9, 9); g.fillStyle = '#5ef0a8'; g.fillRect(46, 18, 4, 4); g.fillStyle = '#d8322b'; g.fillRect(34, 32, 8, 12);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, LW = 60, RX = 40, lane = 1, lx = 0, obs = [], sp = 0.6, dist = 0, sc = 0, inv = 0, PY = H - 70, gems = 0;
      function lcx(l) { return RX + l * LW + LW / 2; }
      function move(d) { var n = c.clamp(lane + d, 0, 3); if (n !== lane) { lane = n; c.fx('click'); } }
      lx = lcx(1);
      return {
        dir: function (d) { if (d === 1) move(-1); if (d === 3) move(1); }, tap: function (x) { move(x < W / 2 ? -1 : 1); },
        lines: function () { return [['Emeralds', gems]]; },
        update: function (dt) {
          var v = 170 + c.level * 22; lx += (lcx(lane) - lx) * Math.min(1, dt * 16); if (inv > 0) inv -= dt;
          dist += v * dt; var ns = Math.floor(dist / 25); if (ns > sc) { c.add(ns - sc); sc = ns; }
          if (dist > c.level * 3200) c.levelUp();
          sp -= dt;
          if (sp <= 0) {
            sp = Math.max(0.42, 0.95 - c.level * 0.05); var lanes = c.shuffle([0, 1, 2, 3]), n = Math.random() < 0.25 + c.level * 0.05 ? 2 : 1;
            for (var i = 0; i < n; i++) obs.push({ lane: lanes[i], y: -20, kind: 'rock' });
            if (Math.random() < 0.55) obs.push({ lane: lanes[3], y: -20, kind: Math.random() < 0.1 ? 'ore' : 'gem', ore: c.oreRoll() });
          }
          obs.forEach(function (o) {
            o.y += v * dt; if (o.lane !== lane || Math.abs(o.y - PY) > 22) return;
            if (o.kind === 'rock') { if (inv <= 0) { o.dead = true; c.K.burst(lx, PY, '#8b8b96', 10); if (!c.hit(lx, PY)) inv = 1.2; } }
            else { o.dead = true; if (o.kind === 'gem') { gems++; c.add(25, lx, PY - 20, '#5ef0a8'); c.fx('gem'); } else c.ore(o.ore, lx, PY - 24); }
          });
          obs = obs.filter(function (o) { return !o.dead && o.y < H + 30; });
        },
        draw: function (g) {
          c.fill(g, T.GRASS, 0, 0, W, H, 32); g.fillStyle = '#34343c'; g.fillRect(RX, 0, LW * 4, H); g.fillStyle = '#5a5a60'; g.fillRect(RX - 4, 0, 4, H); g.fillRect(RX + LW * 4, 0, 4, H);
          g.fillStyle = '#ffe680'; for (var l = 1; l < 4; l++) for (var y = (dist % 40) - 40; y < H; y += 40) g.fillRect(RX + l * LW - 2, y, 3, 20);
          obs.forEach(function (o) { var x = lcx(o.lane); if (o.kind === 'rock') { c.block(g, T.COBBLE, x - 16, o.y - 16, 32); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 16, o.y + 13, 32, 3); } else if (o.kind === 'gem') { g.fillStyle = '#1d6b4a'; g.fillRect(x - 6, o.y - 5, 12, 12); g.fillStyle = '#5ef0a8'; g.fillRect(x - 5, o.y - 6, 10, 10); } else c.oreIcon(g, o.ore, x - 9, o.y - 9, 18); });
          if (!(inv > 0 && Math.floor(c.time * 12) % 2)) {
            g.fillStyle = '#2a2a30'; g.fillRect(lx - 16, PY - 12, 5, 9); g.fillRect(lx + 11, PY - 12, 5, 9); g.fillRect(lx - 16, PY + 8, 5, 9); g.fillRect(lx + 11, PY + 8, 5, 9);
            g.fillStyle = '#7d1f19'; g.fillRect(lx - 13, PY - 18, 26, 38); g.fillStyle = '#d8322b'; g.fillRect(lx - 11, PY - 16, 22, 32); c.hero(g, lx - 9, PY - 12, 18, 'up', 0);
          }
        }
      };
    }
  });

  // ---------- Canyon Flyer: thread a rocket up a winding canyon ----------
  R({
    id: 'canyon', name: 'Canyon Flyer', cat: 'action', medals: [400, 1500, 4000], music: 'desert',
    blurb: 'Fly up the twisting canyon. Blast the boulders in your way and never touch the walls.',
    controls: { dpad: 'lr', a: null, b: null }, pet: [16, 417],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#3b2a4a'; g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 8) { var o = Math.sin(y / 9) * 8; for (var x = 0; x < 14 + o; x += 8) g.drawImage(tex.blocks[T.SANDSTONE].top, 0, 0, 16, 16, x, y, 8, 8); for (var x2 = 48 + o; x2 < w; x2 += 8) g.drawImage(tex.blocks[T.SANDSTONE].top, 0, 0, 16, 16, x2, y, 8, 8); }
      g.fillStyle = '#e8e8ee'; g.fillRect(30, 30, 6, 10); g.fillStyle = '#d8322b'; g.fillRect(31, 27, 4, 3); g.fillStyle = '#ff8a1f'; g.fillRect(31, 40, 4, 4); g.drawImage(tex.blocks[T.COBBLE].top, 0, 0, 16, 16, 28, 8, 9, 9);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, rows = [], off = 0, mid = W / 2, px = W / 2, PY = H - 80, tg = [], shots = [], fireT = 0, inv = 0, dist = 0, blasted = 0;
      function next() { mid = c.clamp(mid + c.rnd(-16, 16), 90, W - 90); var wd = Math.max(112, 200 - c.level * 9); return { l: mid - wd / 2, r: mid + wd / 2 }; }
      for (var i = 0; i < 30; i++) rows.push({ l: 60, r: W - 60 });
      return {
        lines: function () { return [['Boulders blasted', blasted]]; },
        update: function (dt) {
          var v = 105 + c.level * 13;
          if (c.dir === 1) px -= 200 * dt; if (c.dir === 3) px += 200 * dt;
          if (c.touching) px += (c.tx - px) * Math.min(1, dt * 12);
          px = c.clamp(px, 8, W - 8); if (inv > 0) inv -= dt;
          off += v * dt;
          while (off >= 16) {
            off -= 16; rows.pop(); var n = next(); rows.unshift(n); dist++; c.add(1);
            if (dist % 70 === 0) c.levelUp();
            if (Math.random() < 0.16 + c.level * 0.012) { var ore = Math.random() < 0.14; tg.push({ x: c.rnd(n.l + 14, n.r - 14), y: -16, hp: ore ? 2 : 1, ore: ore ? c.oreRoll() : null }); }
          }
          fireT -= dt; if (fireT <= 0) { fireT = 0.34; shots.push({ x: px, y: PY - 12 }); }
          shots.forEach(function (s) { s.y -= 330 * dt; tg.forEach(function (t) { if (s.dead || t.dead || Math.abs(t.x - s.x) > 12 || Math.abs(t.y - s.y) > 12) return; s.dead = true; if (--t.hp > 0) { c.fx('hit'); return; } t.dead = true; blasted++; c.K.burst(t.x, t.y, '#8b8b96', 8); c.fx('crumble'); if (t.ore) c.ore(t.ore, t.x, t.y - 10); else c.add(15, t.x, t.y - 10); }); });
          shots = shots.filter(function (s) { return !s.dead && s.y > 20; });
          tg.forEach(function (t) { t.y += v * dt; if (inv <= 0 && Math.abs(t.x - px) < 15 && Math.abs(t.y - PY) < 15) { t.dead = true; if (!c.hit(px, PY)) inv = 1.5; } });
          tg = tg.filter(function (t) { return !t.dead && t.y < H + 20; });
          var row = rows[c.clamp(Math.floor((PY - off + 16) / 16), 0, rows.length - 1)];
          if (inv <= 0 && (px - 6 < row.l || px + 6 > row.r)) { if (!c.hit(px, PY)) { inv = 1.6; px = (row.l + row.r) / 2; } }
        },
        draw: function (g) {
          g.fillStyle = '#2a1f38'; g.fillRect(0, 0, W, H);
          rows.forEach(function (r, i) {
            var y = i * 16 + off - 16;
            for (var x = r.l - 16; x > -16; x -= 16) c.block(g, T.SANDSTONE, x, y, 16);
            for (var x2 = r.r; x2 < W; x2 += 16) c.block(g, T.SANDSTONE, x2, y, 16);
            g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(r.l - 3, y, 3, 16); g.fillRect(r.r, y, 3, 16);
          });
          tg.forEach(function (t) { c.block(g, t.ore ? c.oreTile(t.ore) : T.COBBLE, t.x - 11, t.y - 11, 22); });
          g.fillStyle = '#ffe680'; shots.forEach(function (s) { g.fillRect(s.x - 1, s.y - 6, 3, 10); });
          if (!(inv > 0 && Math.floor(c.time * 12) % 2)) {
            g.fillStyle = Math.floor(c.time * 16) % 2 ? '#ff8a1f' : '#ffd23b'; g.fillRect(px - 3, PY + 12, 6, 8);
            g.fillStyle = '#8b8b96'; g.fillRect(px - 10, PY + 2, 5, 10); g.fillRect(px + 5, PY + 2, 5, 10);
            g.fillStyle = '#e8e8ee'; g.fillRect(px - 5, PY - 10, 10, 22); g.fillStyle = '#d8322b'; g.fillRect(px - 3, PY - 15, 6, 6); g.fillStyle = '#3fa7e0'; g.fillRect(px - 3, PY - 5, 6, 5);
          }
        }
      };
    }
  });

  // ---------- Mob Arena: survive the waves; your bow fires by itself ----------
  R({
    id: 'arena', name: 'Mob Arena', cat: 'action', medals: [600, 2500, 7000], music: 'forest',
    blurb: 'Monsters rush in from every side. Keep moving — your bow shoots the nearest one by itself.',
    controls: { dpad: true, a: null, b: null }, pet: [16, 417],
    thumb: function (g, w, h, tex, T) {
      for (var y = 0; y < h; y += 16) for (var x = 0; x < w; x += 16) g.drawImage(tex.blocks[T.MOSS].top, x, y);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, w, h); g.drawImage(PCTex.hero(PCTex.LOOK_DEFAULT).down[0], 24, 16, 16, 16);
      g.drawImage(tex.mons.sly[0], 2, 4, 12, 12); g.drawImage(tex.mons.frost[0], 48, 6, 12, 12); g.drawImage(tex.mons.mudge[0], 46, 34, 12, 12); g.fillStyle = '#ffe680'; g.fillRect(16, 12, 5, 2);
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, p = { x: W / 2, y: H / 2 }, mobs = [], shots = [], drops = [], toSpawn = 0, spawnT = 0, fireT = 0, inv = 0, kills = 0, face = 2;
      var KINDS = ['mudge', 'sly', 'frost', 'rumble'];
      function wave() { toSpawn = 5 + c.level * 4; spawnT = 1; }
      wave();
      return {
        lines: function () { return [['Monsters beaten', kills]]; },
        update: function (dt) {
          var mx = c.dx, my = c.dy;
          if (c.touching) { var ddx = c.tx - p.x, ddy = c.ty - p.y, dl = Math.hypot(ddx, ddy); if (dl > 6) { mx = ddx / dl; my = ddy / dl; } else { mx = my = 0; } }
          if (mx || my) { p.x += mx * 125 * dt; p.y += my * 125 * dt; face = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 3 : 1) : (my > 0 ? 2 : 0); }
          p.x = c.clamp(p.x, 12, W - 12); p.y = c.clamp(p.y, 34, H - 12); if (inv > 0) inv -= dt;
          spawnT -= dt;
          if (toSpawn > 0 && spawnT <= 0) {
            spawnT = Math.max(0.25, 0.9 - c.level * 0.07); toSpawn--; var s = c.ri(4), k = KINDS[Math.min(3, c.ri(1 + Math.ceil(c.level / 2)))];
            mobs.push({ x: s === 1 ? -12 : s === 3 ? W + 12 : c.rnd(10, W - 10), y: s === 0 ? 22 : s === 2 ? H + 12 : c.rnd(34, H - 10), kind: k, sp: { mudge: 42, sly: 58, frost: 76, rumble: 50 }[k] + c.level * 4, hp: k === 'rumble' ? 3 : 1 });
          }
          var near = null, nd = 1e9;
          mobs.forEach(function (m) {
            var dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1; m.x += dx / d * m.sp * dt; m.y += dy / d * m.sp * dt;
            if (d < nd) { nd = d; near = m; }
            if (d < 16 && inv <= 0) { if (!c.hit(p.x, p.y)) inv = 1.3; }
          });
          fireT -= dt;
          if (fireT <= 0 && near && nd < 170) { fireT = Math.max(0.36, 0.58 - c.level * 0.012); var a = Math.atan2(near.y - p.y, near.x - p.x); shots.push({ x: p.x, y: p.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, t: 0 }); c.fx('shoot'); }
          shots.forEach(function (s) {
            s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
            mobs.forEach(function (m) { if (s.dead || m.dead || Math.hypot(m.x - s.x, m.y - s.y) > 13) return; s.dead = true; if (--m.hp > 0) return; m.dead = true; kills++; c.add(m.kind === 'rumble' ? 50 : 20, m.x, m.y - 12); c.K.burst(m.x, m.y, '#c9ccd4', 8); c.fx('bonk'); if (Math.random() < 0.08) drops.push({ x: m.x, y: m.y, kind: c.oreRoll(), t: 8 }); });
          });
          shots = shots.filter(function (s) { return !s.dead && s.t < 0.9; }); mobs = mobs.filter(function (m) { return !m.dead; });
          drops.forEach(function (o) { o.t -= dt; if (Math.hypot(o.x - p.x, o.y - p.y) < 18) { o.t = 0; c.ore(o.kind, p.x, p.y - 22); } });
          drops = drops.filter(function (o) { return o.t > 0; });
          if (!mobs.length && toSpawn <= 0) { c.add(100 * c.level, W / 2, H / 2 - 50, '#ffe680'); c.levelUp(); wave(); }
        },
        draw: function (g) {
          c.fill(g, T.MOSS, 0, 0, W, H, 32); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, W, H);
          drops.forEach(function (o) { if (o.t > 2 || Math.floor(c.time * 8) % 2) c.oreIcon(g, o.kind, o.x - 8, o.y - 8, 16); });
          mobs.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (m) { var s = m.kind === 'rumble' ? 28 : 22; c.mon(g, m.kind, m.x - s / 2, m.y - s / 2, s, Math.abs(p.x - m.x) > Math.abs(p.y - m.y) ? (p.x > m.x ? 3 : 1) : (p.y > m.y ? 2 : 0)); });
          g.fillStyle = '#ffe680'; shots.forEach(function (s) { g.fillRect(s.x - 2, s.y - 2, 4, 4); });
          if (!(inv > 0 && Math.floor(c.time * 12) % 2)) c.hero(g, p.x - 12, p.y - 14, 24, ['up', 'left', 'down', 'right'][face], (c.dx || c.dy || c.touching) ? 1 + Math.floor(c.time * 8) % 2 : 0);
          c.text(g, 'WAVE ' + c.level + '  LEFT ' + (mobs.length + toSpawn), 6, 26, 1, '#fff');
        }
      };
    }
  });

  // ---------- Block Chop: slice the flying blocks, never the TNT ----------
  R({
    id: 'chop', name: 'Block Chop', cat: 'action', medals: [300, 900, 2000], music: 'forest', lives: 3, clock: 60,
    blurb: 'Blocks fly up — swipe across them to chop! 60 seconds. Slice the TNT and it goes boom.',
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#20301c'; g.fillRect(0, 0, w, h); g.drawImage(tex.blocks[T.LOG].top, 0, 0, 16, 16, 8, 22, 14, 14); g.drawImage(tex.blocks[T.GOLD].top, 0, 0, 16, 16, 42, 8, 14, 14); g.drawImage(tex.tnt[0], 26, 28, 12, 12);
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(4, 40); g.lineTo(58, 6); g.stroke();
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, items = [], sp = 0.8, trail = [], combo = 0, sliced = 0;
      var KINDS = [T.LOG, T.PLANKS, T.LEAVES, T.MOSS, T.CLAY, T.SAND, T.ICE];
      function toss() { var x = c.rnd(40, W - 40), r = Math.random(); items.push({ x: x, y: H + 16, vx: (W / 2 - x) * c.rnd(0.2, 0.9) , vy: -c.rnd(430, 520), rot: 0, vr: c.rnd(-4, 4), kind: r < 0.14 ? 'tnt' : r < 0.19 ? 'ore' : 'block', tile: c.pick(KINDS), ore: c.oreRoll() }); }
      function segHit(o, x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy, t = l2 ? c.clamp(((o.x - x1) * dx + (o.y - y1) * dy) / l2, 0, 1) : 0; return Math.hypot(o.x - (x1 + dx * t), o.y - (y1 + dy * t)) < 20; }
      function cut(x, y, px, py) {
        trail.push({ x: x, y: y, t: 0.18 });
        items.forEach(function (o) {
          if (o.cut || !segHit(o, px, py, x, y)) return; o.cut = true;
          if (o.kind === 'tnt') { combo = 0; c.fx('boom'); c.K.burst(o.x, o.y, '#ff6a1f', 20, 220); c.clock = Math.max(0.1, c.clock - 5); c.hit(o.x, o.y); return; }
          sliced++; combo++; c.fx('crumble'); c.K.burst(o.x, o.y, c.tex.blocks[o.kind === 'ore' ? c.oreTile(o.ore) : o.tile].avg, 10, 160);
          if (o.kind === 'ore') c.ore(o.ore, o.x, o.y - 14); c.add(10 + Math.min(40, combo * 2), o.x, o.y - 4);
          if (sliced % 20 === 0) c.levelUp(true);
        });
      }
      return {
        tap: function (x, y) { trail = [{ x: x, y: y, t: 0.18 }]; }, drag: cut, lines: function () { return [['Blocks chopped', sliced]]; },
        update: function (dt) {
          sp -= dt; if (sp <= 0) { sp = Math.max(0.35, 0.9 - c.level * 0.07) * c.rnd(0.7, 1.3); toss(); if (Math.random() < 0.3) toss(); }
          items.forEach(function (o) { o.vy += 620 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; if (o.y > H + 30 && o.vy > 0) { o.gone = true; if (!o.cut && o.kind !== 'tnt') combo = 0; } });
          items = items.filter(function (o) { return !o.gone && !o.cut; });
          trail.forEach(function (t) { t.t -= dt; }); trail = trail.filter(function (t) { return t.t > 0; });
        },
        draw: function (g) {
          var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#16261a'); gr.addColorStop(1, '#2c4426'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
          items.forEach(function (o) {
            g.save(); g.translate(o.x, o.y); g.rotate(o.rot);
            if (o.kind === 'tnt') g.drawImage(c.tex.tnt[Math.floor(c.time * 8) % 2], -15, -15, 30, 30); else c.block(g, o.kind === 'ore' ? c.oreTile(o.ore) : o.tile, -15, -15, 30);
            g.restore();
          });
          if (trail.length > 1) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); trail.forEach(function (t, i) { if (i) g.lineTo(t.x, t.y); else g.moveTo(t.x, t.y); }); g.stroke(); }
          if (combo >= 3) c.ctext(g, combo + ' COMBO', W / 2, 28, 2, '#ffe680');
        }
      };
    }
  });

  // ---------- Flip Runner: tap to flip gravity between floor and ceiling ----------
  R({
    id: 'gravflip', name: 'Flip Runner', cat: 'action', medals: [200, 600, 1500], music: 'crystal',
    blurb: 'Tap to flip gravity! Run on the floor or the ceiling to miss the crystal spikes.',
    controls: { dpad: false, a: 'FLIP', b: null }, pet: [18, 417],
    thumb: function (g, w, h, tex, T) {
      g.fillStyle = '#131028'; g.fillRect(0, 0, w, h);
      for (var x = 0; x < w; x += 8) { g.drawImage(tex.blocks[T.BASALT].top, 0, 0, 16, 16, x, 4, 8, 8); g.drawImage(tex.blocks[T.BASALT].top, 0, 0, 16, 16, x, 36, 8, 8); }
      g.drawImage(tex.blocks[T.CRYSTAL].top, 0, 0, 16, 16, 40, 22, 8, 14); g.drawImage(tex.blocks[T.CRYSTAL].top, 0, 0, 16, 16, 20, 12, 8, 10);
      g.save(); g.translate(18, 24); g.drawImage(PCTex.hero(PCTex.LOOK_DEFAULT).right[1], -12, -1, 12, 12); g.restore();
    },
    make: function (c) {
      var W = c.W, H = c.H, T = c.T, TOP = 110, BOT = 320, HX = 62, y = BOT, vy = 0, gd = 1, obs = [], sp = 1.2, dist = 0, sc = 0, inv = 0, flips = 0;
      function flip() { gd = -gd; flips++; c.fx('hop'); }
      return {
        tap: flip, a: flip, lines: function () { return [['Distance', Math.floor(dist / 10) + ' m']]; },
        update: function (dt) {
          var v = 150 + c.level * 18;
          vy += gd * 1700 * dt; y += vy * dt; if (y > BOT) { y = BOT; vy = 0; } if (y < TOP + 24) { y = TOP + 24; vy = 0; }
          if (inv > 0) inv -= dt;
          dist += v * dt; var ns = Math.floor(dist / 20); if (ns > sc) { c.add(ns - sc); sc = ns; } if (dist > c.level * 2600) c.levelUp();
          sp -= dt;
          if (sp <= 0) {
            sp = c.rnd(0.75, 1.35) * Math.max(0.6, 1 - c.level * 0.04); var r = Math.random();
            if (r < 0.18) obs.push({ x: W + 20, w: 16, kind: 'ore', top: c.pick([TOP + 14, BOT - 40, (TOP + BOT) / 2 - 8]), ore: c.oreRoll() });
            else { var hh = c.rnd(46, 96), up = Math.random() < 0.5; obs.push({ x: W + 20, w: 20, kind: 'spike', top: up ? TOP : BOT - hh, h: hh }); }
          }
          obs.forEach(function (o) {
            o.x -= v * dt; if (o.x > HX + 9 || o.x + o.w < HX - 9) return;
            if (o.kind === 'ore') { if (y > o.top - 4 && y - 24 < o.top + 20) { o.dead = true; c.ore(o.ore, HX, y - 36); } }
            else if (inv <= 0 && y > o.top + 3 && y - 24 < o.top + o.h - 3) { if (!c.hit(HX, y - 12)) inv = 1.3; }
          });
          obs = obs.filter(function (o) { return !o.dead && o.x > -40; });
        },
        draw: function (g) {
          g.fillStyle = '#131028'; g.fillRect(0, 0, W, H);
          g.fillStyle = '#2a2450'; for (var i = 0; i < 14; i++) g.fillRect(((i * 61 - dist * 0.4) % (W + 30) + W + 30) % (W + 30) - 15, TOP + 20 + (i * 37) % (BOT - TOP - 40), 3, 3);
          for (var x = -(dist % 16); x < W; x += 16) { c.block(g, T.BASALT, x, TOP - 16, 16); c.block(g, T.BASALT, x, BOT, 16); }
          c.fill(g, T.BASALT, 0, 22, W, TOP - 38, 16); c.fill(g, T.BASALT, 0, BOT + 16, W, H - BOT - 16, 16); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 22, W, TOP - 38); g.fillRect(0, BOT + 16, W, H - BOT - 16);
          obs.forEach(function (o) { if (o.kind === 'ore') c.oreIcon(g, o.ore, o.x, o.top, 18); else { for (var yy = o.top; yy < o.top + o.h - 1; yy += 16) c.block(g, T.CRYSTAL, o.x, yy, 20, Math.min(16, o.top + o.h - yy)); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(o.x, o.top, 3, o.h); } });
          if (inv > 0 && Math.floor(c.time * 12) % 2) return;
          g.save(); g.translate(HX, y - 12); if (gd < 0) g.scale(1, -1); c.hero(g, -12, -12, 24, 'right', 1 + Math.floor(c.time * 10) % 2); g.restore();
        }
      };
    }
  });

  // ---------- Rail Race: lay rails, box the other carts in ----------
  R({
    id: 'railrace', name: 'Rail Race', cat: 'action', medals: [300, 1200, 3500], music: 'caves', w: 320, h: 420,
    blurb: 'Your cart leaves a rail behind it. Steer so the monster carts crash before you do!',
    controls: { dpad: true, a: null, b: null }, pet: [16, 418],
    thumb: function (g, w, h) {
      g.fillStyle = '#16121e'; g.fillRect(0, 0, w, h); g.fillStyle = '#3fa7e0'; g.fillRect(8, 36, 30, 3); g.fillRect(36, 16, 3, 23); g.fillStyle = '#d8322b'; g.fillRect(50, 6, 3, 30); g.fillRect(22, 6, 30, 3);
      g.fillStyle = '#fff'; g.fillRect(35, 13, 5, 5); g.fillRect(20, 5, 5, 5);
    },
    make: function (c) {
      var W = c.W, H = c.H, CS = 10, COLS = 32, ROWS = 38, OY = 28, grid, carts, stepT = 0, wait = 1.2, wins = 0;
      var COLS_ = ['#3fa7e0', '#d8322b', '#f2c230', '#8a5ad6'];
      function free(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS && !grid[y * COLS + x]; }
      function run(x, y, d) { var n = 0; while (n < 12 && free(x + DX[d] * (n + 1), y + DY[d] * (n + 1))) n++; return n; }
      function round() {
        grid = new Uint8Array(COLS * ROWS); var n = Math.min(3, 1 + Math.floor((c.level - 1) / 2));
        carts = [{ x: 16, y: 32, d: 0, me: true, alive: true }];
        [[16, 5, 2], [5, 18, 3], [26, 18, 1]].slice(0, n).forEach(function (s) { carts.push({ x: s[0], y: s[1], d: s[2], alive: true }); });
        carts.forEach(function (k, i) { k.col = i + 1; grid[k.y * COLS + k.x] = i + 1; }); wait = 1.2; c.say('ROUND ' + c.level, 'DO NOT CRASH!', 1.1);
      }
      function turn(d) { var me = carts[0]; if (d >= 0 && (d + 2) % 4 !== me.d) me.nd = d; }
      round();
      return {
        dir: turn, up: function () { turn(PCMini.swipe(c, 12)); }, lines: function () { return [['Rounds won', wins]]; },
        update: function (dt) {
          if (wait > 0) { wait -= dt; return; }
          stepT += dt; var step = Math.max(0.055, 0.1 - c.level * 0.005); if (stepT < step) return; stepT = 0;
          carts.forEach(function (k) {
            if (!k.alive) return;
            if (k.me) { if (k.nd != null) { k.d = k.nd; k.nd = null; } }
            else {
              var ahead = free(k.x + DX[k.d], k.y + DY[k.d]);
              if (!ahead || Math.random() < 0.04) { var best = ahead ? k.d : -1, bl = ahead ? run(k.x, k.y, k.d) : -1; [(k.d + 1) % 4, (k.d + 3) % 4].forEach(function (d) { var l = free(k.x + DX[d], k.y + DY[d]) ? run(k.x, k.y, d) + Math.random() : -1; if (l > bl) { bl = l; best = d; } }); if (best >= 0) k.d = best; }
            }
            var nx = k.x + DX[k.d], ny = k.y + DY[k.d];
            if (!free(nx, ny)) { k.alive = false; c.K.burst(k.x * CS + 5, OY + k.y * CS + 5, COLS_[k.col - 1], 14, 160); c.fx('boom'); if (!k.me) c.add(100 * c.level, k.x * CS, OY + k.y * CS); return; }
            k.x = nx; k.y = ny; grid[ny * COLS + nx] = k.col;
          });
          if (!carts[0].alive) { if (!c.hit()) round(); return; }
          if (carts.every(function (k) { return k.me || !k.alive; })) { wins++; c.add(200 * c.level, W / 2, H / 2, '#ffe680'); c.levelUp(true); if (wins % 2 === 0) c.ore(); round(); }
        },
        draw: function (g) {
          g.fillStyle = '#16121e'; g.fillRect(0, 0, W, H); g.fillStyle = '#211a2c'; for (var x = 0; x < COLS; x += 2) for (var y = 0; y < ROWS; y += 2) g.fillRect(x * CS, OY + y * CS, CS, CS);
          g.strokeStyle = '#5a5a60'; g.lineWidth = 2; g.strokeRect(1, OY - 1, W - 2, ROWS * CS + 2);
          for (var i = 0; i < grid.length; i++) if (grid[i]) { g.fillStyle = COLS_[grid[i] - 1]; g.fillRect((i % COLS) * CS + 2, OY + Math.floor(i / COLS) * CS + 2, CS - 4, CS - 4); }
          carts.forEach(function (k) { if (!k.alive) return; g.fillStyle = '#fff'; g.fillRect(k.x * CS - 1, OY + k.y * CS - 1, CS + 2, CS + 2); g.fillStyle = COLS_[k.col - 1]; g.fillRect(k.x * CS + 1, OY + k.y * CS + 1, CS - 2, CS - 2); });
        }
      };
    }
  });
})();
