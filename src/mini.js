/* Blockcade — PCMini: a small framework for the v4.0 cabinets. A game hands reg() a definition
 * and a make(c) function; the framework owns the things every cabinet shares — score, hearts,
 * level, an optional countdown clock, banner messages, particles, the pet in the corner, the
 * HUD strip, and turning cab input events into simple hooks (tap / drag / up / dir / a / b).
 *
 * def: { id, name, blurb, cat: 'action'|'skill'|'puzzle'|'brain', medals: [bronze, silver, gold],
 *        w, h, music, controls, lives (0 = no hearts), clock (seconds, optional), pet: [x, y],
 *        thumb(g, w, h, tex, T), make(c) → { update(dt), draw(g), tap, drag, up, dir, a, aUp, b, lines } } */
var PCMini = (function () {
  'use strict';
  var ORE_ODDS = ['coal', 'coal', 'iron', 'iron', 'gold', 'diamond', 'ember'];

  function make(d, ctx) {
    var W = d.w || 320, H = d.h || 420, tex = ctx.tex, T = window.PCWorld.TILE, K = PCCab.kit(), heroSet = PCTex.hero(ctx.look), game;
    var c = {
      W: W, H: H, tex: tex, T: T, K: K, ctx: ctx, score: 0, lives: d.lives == null ? 3 : d.lives, level: 1, time: 0, done: false,
      msg: null, shake: 0, dir: -1, dx: 0, dy: 0, a: false, b: false, tx: W / 2, ty: H / 2, touching: false, clock: d.clock || 0, clockMax: d.clock || 0
    };
    c.rnd = function (a, b) { return a + Math.random() * (b - a); };
    c.ri = function (n) { return Math.floor(Math.random() * n); };
    c.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    c.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    c.shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    c.fx = function (n, data) { ctx.fx(n, data); };
    c.buzz = function (p) { ctx.buzz(p); };
    c.add = function (n, x, y, col) { n = Math.round(n); if (n <= 0) return; c.score += n; ctx.score(c.score); if (x != null) K.pop(x, y, '+' + n, col); };
    c.oreRoll = function () { return ORE_ODDS[Math.min(6, Math.floor(Math.random() * (2.5 + c.level * 0.8)))]; };
    c.ore = function (kind, x, y) { kind = kind || c.oreRoll(); ctx.addOre(kind, 1); K.pop(x == null ? W / 2 : x, y == null ? H / 2 : y, '+1 ' + kind.toUpperCase(), '#ffe680'); ctx.fx('mined', { tile: T.STONE, drop: kind }); ctx.buzz(15); ctx.pet.bark(); };
    c.say = function (text, sub, t) { c.msg = { text: text, sub: sub, t: t || 1.6 }; };
    c.end = function (win, title, lines) {
      if (c.done) return; c.done = true;
      if (win) ctx.pet.bark('WOOF!');
      ctx.over({ win: !!win, title: title, lines: (lines || []).concat(game && game.lines ? game.lines() : []).concat([['Level reached', c.level]]) });
    };
    // lose a heart; returns true when that ended the game
    c.hit = function (x, y) {
      if (c.done) return true;
      c.lives--; c.shake = 0.3; ctx.fx('shieldhit'); ctx.buzz([40, 30, 40]);
      K.burst(x == null ? W / 2 : x, y == null ? H / 2 : y, '#ff7a6a', 14, 180);
      if (c.lives <= 0) { c.end(false); return true; }
      return false;
    };
    c.levelUp = function (quiet) { c.level++; ctx.addOre('coal', 1); if (!quiet) c.say('LEVEL ' + c.level); ctx.fx('extralife'); ctx.pet.hop(); };
    c.text = function (g, s, x, y, sz, col) { PCTex.drawText(g, String(s), Math.round(x), Math.round(y), sz || 1, col || '#fff', '#000'); };
    c.ctext = function (g, s, cx, y, sz, col) { s = String(s); c.text(g, s, cx - PCTex.textWidth(s, sz || 1) / 2, y, sz, col); };
    c.block = function (g, tile, x, y, s, h) { g.drawImage(tex.blocks[tile].top, 0, 0, 16, 16, Math.round(x), Math.round(y), s, h || s); };
    c.fill = function (g, tile, x, y, w, h, s) { s = s || 16; for (var yy = y; yy < y + h; yy += s) for (var xx = x; xx < x + w; xx += s) g.drawImage(tex.blocks[tile].top, 0, 0, 16, 16, xx, yy, s, s); };
    c.mon = function (g, kind, x, y, s, face) { g.drawImage(tex.mons[kind][Math.floor(c.time * 5) % 2], Math.round(x), Math.round(y), s, s); PCTex.drawEyes(g, Math.round(x), Math.round(y), s / 16, face == null ? 2 : face, kind === 'fright'); };
    c.hero = function (g, x, y, s, view, frame) { g.drawImage(heroSet[view || 'down'][frame || 0], Math.round(x), Math.round(y), s, s); };
    c.gold = function (g, x, y, s) { g.fillStyle = '#9c7410'; g.fillRect(x, y, s, s); g.fillStyle = '#f7c936'; g.fillRect(x, y, s - 3, s - 3); g.fillStyle = '#fff0a0'; g.fillRect(x, y, s - 3, 3); g.fillRect(x, y, 3, s - 3); };
    c.oreIcon = function (g, kind, x, y, s) { g.drawImage(tex.ores[kind], Math.round(x), Math.round(y), s, s); };
    c.oreTile = function (kind) { return T[kind.toUpperCase()]; };
    game = d.make(c);

    return {
      S: c, game: game,
      start: function () { ctx.fx('ready'); },
      update: function (dt) {
        c.time += dt; K.tick(dt);
        if (c.msg && (c.msg.t -= dt) <= 0) c.msg = null;
        if (c.shake > 0) c.shake -= dt;
        ctx.pet.sit(dt);
        if (c.done) return;
        if (c.clockMax) { c.clock -= dt; if (c.clock <= 0) { c.clock = 0; c.end(false, 'Time Up!'); return; } }
        game.update(dt);
      },
      draw: function (g) {
        g.save();
        if (c.shake > 0) g.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        game.draw(g);
        K.draw(g);
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, W, 22);
        if (d.lives !== 0) K.hearts(g, tex, Math.max(0, c.lives), 5, 4);
        if (c.clockMax) {
          var f = Math.min(1, c.clock / c.clockMax), bx = d.lives !== 0 ? 92 : 8, bw = W - bx - 122;
          g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(bx, 7, bw, 8); g.fillStyle = c.clock < 10 ? '#ff7a6a' : '#5ef0a8'; g.fillRect(bx, 7, bw * f, 8);
          var cs = String(Math.ceil(c.clock)); c.text(g, cs, W - 76 - PCTex.textWidth(cs, 2), 5, 2);
        }
        c.text(g, 'LV ' + c.level, W - PCTex.textWidth('LV ' + c.level, 2) - 5, 5, 2, '#ffe680');
        var pp = d.pet || [W - 18, H - 3]; ctx.pet.draw(g, pp[0], pp[1], 20, 1);
        K.banner(g, W, H, c.msg, Math.round(H / 2) - 30);
        g.restore();
      },
      input: function (e) {
        if (e.type === 'dir') { c.dir = e.dir; c.dx = e.dx; c.dy = e.dy; if (e.dir >= 0 && game.dir && !c.done) game.dir(e.dir); }
        else if (e.type === 'a') { c.a = e.down; if (c.done) return; if (e.down && game.a) game.a(); if (!e.down && game.aUp) game.aUp(); }
        else if (e.type === 'b') { c.b = e.down; if (e.down && game.b && !c.done) game.b(); }
        else if (e.type === 'touch') {
          if (e.phase === 'down') { c.touching = true; c.tx = e.x; c.ty = e.y; c.sx = e.x; c.sy = e.y; if (game.tap && !c.done) game.tap(e.x, e.y); }
          else if (e.phase === 'move') { var px = c.tx, py = c.ty; c.tx = e.x; c.ty = e.y; if (game.drag && !c.done) game.drag(e.x, e.y, px, py); }
          else { c.touching = false; if (game.up && !c.done) game.up(c.tx, c.ty); }
        }
      }
    };
  }
  // swipe helper: direction (0 up, 1 left, 2 down, 3 right) of a finished drag, or -1 for a tap
  function swipe(c, min) { var dx = c.tx - c.sx, dy = c.ty - c.sy; if (Math.hypot(dx, dy) < (min || 14)) return -1; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : (dy > 0 ? 2 : 0); }

  function reg(d) {
    PCQuest.MEDALS[d.id] = d.medals;
    PCCab.register({
      id: d.id, name: d.name, blurb: d.blurb, cat: d.cat, isNew: true, view: { w: d.w || 320, h: d.h || 420 }, music: d.music || 'meadow',
      controls: d.controls || { dpad: false, a: null, b: null },
      thumb: function (g, w, h, tex) { d.thumb(g, w, h, tex, window.PCWorld.TILE); },
      create: function (ctx) { return make(d, ctx); }
    });
  }
  return { reg: reg, swipe: swipe, DX: [0, -1, 0, 1], DY: [-1, 0, 1, 0] };
})();
