/* Rumble Tower — Donkey Kong with blocks. Big Rumble rolls TNT kegs down sloping plank
 * girders; jump them, climb the ladders, grab a pickaxe to smash kegs, and reach the top
 * ledge where your wolf is waiting. */
PCCab.register((function () {
  'use strict';
  var W = 320, H = 480;
  var G = [ // girders bottom → top (6 = goal ledge)
    { x0: 0, x1: 320, y0: 462, y1: 462, dir: -1 },
    { x0: 0, x1: 296, y0: 396, y1: 408, dir: 1 },
    { x0: 24, x1: 320, y0: 338, y1: 326, dir: -1 },
    { x0: 0, x1: 296, y0: 258, y1: 270, dir: 1 },
    { x0: 24, x1: 320, y0: 200, y1: 188, dir: -1 },
    { x0: 0, x1: 296, y0: 120, y1: 132, dir: 1 },
    { x0: 214, x1: 314, y0: 66, y1: 66, dir: 0, ledge: true }
  ];
  var RLEDGE = { x0: 0, x1: 100, y: 72 };
  var LADDERS = [{ x: 250, lo: 0, hi: 1 }, { x: 70, lo: 1, hi: 2 }, { x: 172, lo: 1, hi: 2 }, { x: 262, lo: 2, hi: 3 }, { x: 60, lo: 3, hi: 4 }, { x: 150, lo: 3, hi: 4 }, { x: 250, lo: 4, hi: 5 }, { x: 276, lo: 5, hi: 6 }];
  function gy(k, x) { var g = G[k]; x = Math.max(g.x0, Math.min(g.x1, x)); return g.y0 + (g.y1 - g.y0) * (x - g.x0) / (g.x1 - g.x0); }

  function create(ctx) {
    var tex = ctx.tex, T = window.PCWorld.TILE, hero = PCTex.hero(ctx.look), K = PCCab.kit();
    var S = {};
    function addScore(n) { S.score += n; ctx.score(S.score); }
    function reset() { S.level = 1; S.lives = 3; S.score = 0; S.time = 0; S.msg = null; newLevel(); }
    function newLevel() {
      var lv = S.level, OK = ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'];
      S.picks = [{ x: 200, y: gy(1, 200) - 34, got: false }, { x: 110, y: gy(4, 110) - 34, got: false }];
      S.ores = [[140, 0], [110, 2], [210, 3], [180, 5]].map(function (o, i) { return { x: o[0], g: o[1], kind: OK[Math.min(6, Math.floor(Math.random() * (2.5 + lv * 0.6)) + (i === 3 ? 1 : 0))], got: false }; });
      S.bonus = 3000 + lv * 500; S.bonusT = 0; S.clearT = 0; K.clear();
      spawn(); S.msg = { text: 'LEVEL ' + lv, sub: lv === 1 ? 'CLIMB TO THE TOP' : null, t: 2 }; ctx.A.play('ready');
      S.cheerT = 4;
    }
    function spawn() {
      S.p = { x: 30, g: 0, y: gy(0, 30), vy: 0, vx: 0, air: false, climb: null, face: 3, dead: 0, anim: 0, pickT: 0 };
      S.barrels = []; S.throwT = 1.5; S.throwAnim = 0; S.safeT = 1.2;
    }
    function hitHero(b) {
      var p = S.p;
      if (p.pickT > 0) { smash(b); return; }
      if (S.safeT > 0 || p.dead > 0) return;
      p.dead = 1.4; S.lives--; ctx.fx('death'); ctx.buzz([60, 40, 80]); K.burst(p.x, p.y - 10, '#ffb37a', 14);
    }
    function smash(b) {
      S.barrels.splice(S.barrels.indexOf(b), 1); addScore(300); K.pop(b.x, b.y - 14, '300', '#7df9ff'); K.burst(b.x, b.y, '#d8322b', 10); ctx.fx('boom'); ctx.buzz(20);
      if (Math.random() < 0.3) { var k = ['coal', 'iron', 'gold'][Math.floor(Math.random() * 3)]; ctx.addOre(k, 1); K.pop(b.x, b.y - 26, '+1 ' + k.toUpperCase(), '#ffe680'); ctx.pet.bark(); }
    }
    function throwBarrel() {
      var lv = S.level;
      S.barrels.push({ x: 100, g: 5, y: gy(5, 100) - 6, state: 'roll', vy: 0, rot: 0, scored: false, sp: 62 + Math.min(60, lv * 7) + Math.random() * 10 });
      ctx.fx('drop');
    }
    function update(dt) {
      S.time += dt; K.tick(dt);
      if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
      if (S.safeT > 0) S.safeT -= dt;
      ctx.pet.sit(dt);
      S.cheerT -= dt; if (S.cheerT <= 0) { S.cheerT = 9 + Math.random() * 5; ctx.pet.bark(Math.random() < 0.5 ? 'WOOF!' : 'YIP!'); }
      if (S.clearT > 0) { S.clearT -= dt; if (S.clearT <= 0) { S.level++; newLevel(); } return; }
      var p = S.p;
      if (p.dead > 0) {
        p.dead -= dt;
        if (p.dead <= 0) { if (S.lives <= 0) { ctx.over({ lines: [['Level reached', S.level]] }); return; } spawn(); S.msg = { text: S.lives + (S.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), t: 1.2 }; }
        return;
      }
      S.bonusT += dt; if (S.bonusT >= 2) { S.bonusT = 0; S.bonus = Math.max(0, S.bonus - 100); }
      if (p.pickT > 0) p.pickT -= dt;
      var hd = ctx.held.dir, WALK = 72;
      if (p.climb) {
        var l = p.climb, yb = gy(l.lo, l.x), yt = l.hi === 6 ? G[6].y0 : gy(l.hi, l.x);
        if (hd === 0) { p.y -= 52 * dt; p.anim += dt * 6; }
        else if (hd === 2) { p.y += 52 * dt; p.anim += dt * 6; }
        if (p.y <= yt) { p.y = yt; p.g = l.hi; p.climb = null; if (p.g === 6) reachTop(); }
        else if (p.y >= yb) { p.y = yb; p.g = l.lo; p.climb = null; }
      } else if (p.air) {
        p.vy += 620 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        var gg = G[p.g]; p.x = Math.max(gg.x0 + 6, Math.min(gg.x1 - 6, p.x));
        if (p.vy > 0 && p.y >= gy(p.g, p.x)) { p.y = gy(p.g, p.x); p.air = false; p.vy = 0; }
      } else {
        var g = G[p.g];
        if (hd === 1 || hd === 3) { p.vx = (hd === 3 ? 1 : -1) * WALK; p.face = hd; p.x += p.vx * dt; p.anim += dt * 8; }
        else p.vx = 0;
        p.x = Math.max(g.x0 + 6, Math.min(g.x1 - 6, p.x)); p.y = g.ledge ? g.y0 : gy(p.g, p.x);
        if (hd === 0) { var up = LADDERS.filter(function (l) { return l.lo === p.g && Math.abs(l.x - p.x) < 9; })[0]; if (up) { p.climb = up; p.x = up.x; } }
        else if (hd === 2) { var dn = LADDERS.filter(function (l) { return l.hi === p.g && Math.abs(l.x - p.x) < 9; })[0]; if (dn) { p.climb = dn; p.x = dn.x; p.y += 2; } }
      }
      // ores
      S.ores.forEach(function (o) { if (o.got) return; var oy = gy(o.g, o.x) - 9; if (Math.abs(o.x - p.x) < 11 && Math.abs(oy - (p.y - 9)) < 14) { o.got = true; ctx.addOre(o.kind, 1); addScore(200); K.pop(o.x, oy - 12, '+1 ' + o.kind.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: o.kind }); ctx.buzz(15); ctx.pet.bark(); } });
      // pickaxes
      S.picks.forEach(function (k) { if (!k.got && Math.abs(k.x - p.x) < 12 && Math.abs(k.y - (p.y - 12)) < 16) { k.got = true; p.pickT = 8; ctx.fx('unlock'); K.pop(k.x, k.y - 10, 'SMASH TIME!', '#7df9ff'); } });
      // Rumble throws
      S.throwT -= dt; if (S.throwAnim > 0) S.throwAnim -= dt;
      if (S.throwT <= 0) { S.throwT = Math.max(1.3, 3 - S.level * 0.22) * (0.75 + Math.random() * 0.5); S.throwAnim = 0.4; setTimeout0(throwBarrel); }
      // barrels
      S.barrels.slice().forEach(function (b) {
        b.rot += dt * (b.state === 'ladder' ? 0 : 10) * (G[b.g] ? G[b.g].dir || 1 : 1);
        if (b.state === 'roll') {
          var g = G[b.g], nx = b.x + g.dir * b.sp * dt;
          // take a ladder down?
          LADDERS.forEach(function (l) { if (l.hi === b.g && l.hi < 6 && b.state === 'roll' && (b.x - l.x) * (nx - l.x) <= 0 && !b['L' + l.x] ) { b['L' + l.x] = 1; var bias = S.p.g < b.g ? 0.2 : 0; if (Math.random() < 0.18 + Math.min(0.2, S.level * 0.03) + bias) { b.state = 'ladder'; b.x = l.x; b.lad = l; } } });
          if (b.state === 'roll') {
            b.x = nx; b.y = gy(b.g, b.x) - 6;
            if (b.g === 0 && b.x < -10) { S.barrels.splice(S.barrels.indexOf(b), 1); return; }
            if (b.g > 0 && (b.x < g.x0 - 2 || b.x > g.x1 + 2)) { b.state = 'fall'; b.vy = 20; }
          }
        } else if (b.state === 'ladder') {
          b.y += 70 * dt;
          if (b.y >= gy(b.lad.lo, b.x) - 6) { b.g = b.lad.lo; b.state = 'roll'; b.y = gy(b.g, b.x) - 6; }
        } else if (b.state === 'fall') {
          b.vy += 600 * dt; b.y += b.vy * dt; b.x += (G[b.g].dir || 0) * 30 * dt;
          if (b.y >= gy(b.g - 1, b.x) - 6) { b.g--; b.state = 'roll'; b.y = gy(b.g, b.x) - 6; ctx.fx('drop'); }
        }
        // hero contact / jump-over scoring
        var hx = p.x, hyc = p.y - 10;
        if (Math.hypot(b.x - hx, b.y - hyc) < 12) { hitHero(b); return; }
        if (!b.scored && p.air && Math.abs(b.x - hx) < 9 && p.y < b.y - 4 && b.y - p.y < 40) { b.scored = true; addScore(100); K.pop(hx, p.y - 26, '100', '#fff'); ctx.fx('gem'); }
      });
    }
    function setTimeout0(f) { f(); }
    function reachTop() {
      var bonus = S.bonus; addScore(bonus + 500 * S.level); K.pop(W - 60, 40, 'BONUS ' + bonus, '#ffe680');
      ctx.addOre('coal', 1 + Math.floor(S.level / 2)); if (S.level % 2 === 0) ctx.addOre('iron', 1);
      ctx.fx('clear'); ctx.buzz(30); ctx.pet.bark('WOOF WOOF!'); ctx.pet.hop(); S.clearT = 2.2; S.barrels = [];
    }
    function jump() {
      var p = S.p; if (p.dead > 0 || p.air || p.climb || S.clearT > 0) return;
      p.air = true; p.vy = -205; var hd = ctx.held.dir; p.vx = hd === 1 ? -72 : hd === 3 ? 72 : 0; ctx.fx('hop');
    }

    // ---------- drawing ----------
    var bg = null;
    function drawBg(g) {
      if (bg) return g.drawImage(bg, 0, 0);
      bg = document.createElement('canvas'); bg.width = W; bg.height = H; var b = bg.getContext('2d'); b.imageSmoothingEnabled = false;
      var gr = b.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b0a24'); gr.addColorStop(1, '#241634'); b.fillStyle = gr; b.fillRect(0, 0, W, H);
      var r = window.PCWorld.rng(5); for (var i = 0; i < 50; i++) { b.fillStyle = r() < 0.3 ? '#fff' : '#8f96d8'; b.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1); }
      // ladders
      LADDERS.forEach(function (l) {
        var yb = gy(l.lo, l.x), yt = l.hi === 6 ? G[6].y0 : gy(l.hi, l.x);
        b.fillStyle = '#8a6331'; b.fillRect(l.x - 7, yt, 2, yb - yt); b.fillRect(l.x + 5, yt, 2, yb - yt);
        for (var y = yt + 4; y < yb; y += 7) { b.fillStyle = '#b8894d'; b.fillRect(l.x - 5, y, 10, 2); }
      });
      // girders
      G.forEach(function (gd, k) {
        for (var x = gd.x0; x < gd.x1; x += 16) {
          var w = Math.min(16, gd.x1 - x), y = Math.round(gy(k, x + w / 2));
          b.drawImage(tex.blocks[T.PLANKS].top, 0, 0, 16, 16, x, y, w, 8);
          b.fillStyle = 'rgba(255,255,255,0.18)'; b.fillRect(x, y, w, 1); b.fillStyle = 'rgba(0,0,0,0.45)'; b.fillRect(x, y + 7, w, 1);
        }
      });
      for (var x2 = RLEDGE.x0; x2 < RLEDGE.x1; x2 += 16) { b.drawImage(tex.blocks[T.COBBLE].top, 0, 0, 16, 16, x2, RLEDGE.y, 16, 8); }
      // keg pile beside Rumble
      [[6, 52], [18, 52], [12, 40]].forEach(function (q) { b.drawImage(tex.tnt[0], q[0], q[1], 14, 14); });
      g.drawImage(bg, 0, 0);
    }
    function draw(g) {
      drawBg(g);
      // goal: the wolf (or a diamond block) on the top ledge
      if (ctx.pet.on) ctx.pet.draw(g, 296, G[6].y0, 22, 1);
      else { g.drawImage(tex.blocks[T.DIAMOND].top, 0, 0, 16, 16, 286, G[6].y0 - 18, 18, 18); }
      g.fillStyle = 'rgba(255,230,128,' + (0.4 + Math.sin(S.time * 4) * 0.3) + ')'; PCTex.drawText(g, 'GOAL', 240, 44, 1.5, '#ffe680', '#000');
      // Rumble
      var rs = 38, rx = 46, ry = RLEDGE.y - rs + (S.throwAnim > 0 ? -6 : Math.abs(Math.sin(S.time * 3)) * -2);
      g.drawImage(tex.mons.rumble[Math.floor(S.time * 4) % 2], rx, ry, rs, rs); PCTex.drawEyes(g, rx, ry, rs / 16, 3, false);
      if (S.throwAnim > 0) g.drawImage(tex.tnt[1], rx + 11, ry - 8, 16, 16);
      // ores & pickaxes
      S.ores.forEach(function (o) { if (!o.got) g.drawImage(tex.ores[o.kind], o.x - 7, gy(o.g, o.x) - 16 + Math.sin(S.time * 4 + o.x) * 1.5, 14, 14); });
      var pk = tex.picks[Math.min(4, ctx.save.up.pick || 0)];
      S.picks.forEach(function (k) { if (!k.got) g.drawImage(pk, k.x - 8, k.y - 8 + Math.sin(S.time * 5) * 2, 16, 16); });
      // barrels
      S.barrels.forEach(function (b) { g.save(); g.translate(Math.round(b.x), Math.round(b.y)); g.rotate(b.state === 'ladder' ? 0 : Math.round(b.rot * 2) / 2 * Math.PI / 2); g.drawImage(tex.tnt[0], -7, -7, 14, 14); g.restore(); });
      // hero
      var p = S.p;
      if (p.dead > 0) { g.save(); g.translate(p.x, p.y - 10); g.rotate((1.4 - p.dead) * 8); g.drawImage(hero.down[0], -10, -10, 20, 20); g.restore(); }
      else if (!(S.safeT > 0 && Math.floor(S.time * 10) % 2)) {
        var view = p.climb ? 'up' : ['up', 'left', 'down', 'right'][p.face], moving = p.climb ? (ctx.held.dir === 0 || ctx.held.dir === 2) : p.vx !== 0;
        var fr = p.air ? 1 : moving ? 1 + Math.floor(p.anim) % 2 : 0;
        g.drawImage(hero[view][fr], Math.round(p.x - 10), Math.round(p.y - 20), 20, 20);
        if (p.pickT > 0) { var sw = Math.sin(S.time * 18) > 0; g.save(); g.translate(p.x + (p.face === 1 ? -6 : 6), p.y - 14); g.rotate(sw ? -0.8 : 0.4); g.drawImage(pk, -6, -12, 12, 12); g.restore(); }
      }
      K.draw(g);
      // hud
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, W, 24);
      K.hearts(g, tex, S.lives, 6, 5);
      PCTex.drawText(g, 'BONUS ' + S.bonus, 110, 7, 1.5, '#7df9ff', '#000');
      PCTex.drawText(g, 'LV ' + S.level, W - 54, 6, 2, '#ffe680', '#000');
      if (p.pickT > 0) PCTex.drawText(g, 'SMASH ' + Math.ceil(p.pickT), 110, 30, 1.5, '#ffe680', '#000');
      K.banner(g, W, H, S.clearT > 0 ? { text: 'YOU MADE IT!' } : S.msg, 200);
    }
    function input(e) {
      if (e.type === 'a' && e.down) jump();
      else if (e.type === 'touch' && e.phase === 'down') jump();
    }
    reset();
    return { start: function () { }, update: update, draw: draw, input: input, S: S, dbg: { gy: gy, G: G, LADDERS: LADDERS, jump: jump } };
  }

  return {
    id: 'tower', name: 'Rumble Tower', blurb: 'Rumble rolls TNT kegs down the girders. Jump them and climb to your wolf.',
    view: { w: W, h: H }, music: 'lava',
    controls: { dpad: true, a: 'JUMP', b: null },
    thumb: function (g, w, h, tex, look) {
      var T2 = window.PCWorld.TILE;
      g.fillStyle = '#120f2a'; g.fillRect(0, 0, w, h);
      [[4, 44, 60, 44], [4, 30, 56, 34], [8, 22, 60, 18]].forEach(function (s) { for (var x = s[0]; x < s[2]; x += 8) { var y = s[1] + (s[3] - s[1]) * (x - s[0]) / (s[2] - s[0]); g.drawImage(tex.blocks[T2.PLANKS].top, 0, 0, 16, 16, x, Math.round(y), 8, 3); } });
      g.fillStyle = '#8a6331'; g.fillRect(44, 34, 1, 10); g.fillRect(49, 34, 1, 10); g.fillRect(18, 21, 1, 11); g.fillRect(23, 21, 1, 11);
      g.drawImage(tex.mons.rumble[0], 4, 4, 16, 16); PCTex.drawEyes(g, 4, 4, 1, 3, false);
      g.drawImage(tex.tnt[0], 34, 26, 7, 7); g.drawImage(tex.tnt[0], 22, 38, 7, 7);
      g.drawImage(PCTex.hero(look || PCTex.LOOK_DEFAULT).right[1], 8, 34, 10, 10);
      g.drawImage(PCTex.wolf('#d8322b').left[3], 50, 4, 12, 12);
    },
    create: create
  };
})());
