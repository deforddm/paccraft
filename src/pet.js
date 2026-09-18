/* Blockcade — the wolf companion. Once Max adopts the wolf on the Hero screen it tags along
 * in every cabinet: trotting behind the hero, sitting beside a paddle, cheering from the
 * sidelines. It is purely cosmetic — games call follow()/draw()/bark() and nothing else. */
var PCPet = (function () {
  'use strict';
  var DIRN = ['up', 'left', 'down', 'right'];

  function make(look, fx) {
    var on = !!(look && look.pet && look.pet !== 'none');
    var set = on ? PCTex.wolf(look.shirt) : null;
    var p = { on: on, set: set, x: 0, y: 0, dir: 3, anim: 0, idle: 9, trail: [], barkT: 0, barkText: 'WOOF!', hopT: 0, time: 0, wagT: 0 };

    p.reset = function (x, y, dir) { p.x = x; p.y = y; p.trail.length = 0; p.trail.push({ x: x, y: y }); p.idle = 9; p.anim = 0; if (dir != null) p.dir = dir; };
    p.tick = function (dt) { p.time += dt; if (p.barkT > 0) p.barkT -= dt; if (p.hopT > 0) p.hopT -= dt; if (p.wagT > 0) p.wagT -= dt; };

    /* Walk the leader's own trail a fixed distance behind it (any coordinate system).
     * opts: dist (trail distance), speed (units/s, default: always keeps up), snap (teleport when
     * the leader jumps further than this), lockY (1-D follow along a floor). */
    p.follow = function (tx, ty, dt, opts) {
      opts = opts || {}; p.tick(dt);
      if (!on) return;
      var dist = opts.dist || 1, tr = p.trail, last = tr.length ? tr[tr.length - 1] : null;
      var snap = opts.snap || dist * 6;
      if (!last || Math.hypot(tx - last.x, ty - last.y) > snap) { p.reset(tx, ty); return; }
      var d = Math.hypot(tx - last.x, ty - last.y);
      if (d > dist * 0.05) tr.push({ x: tx, y: ty });
      if (tr.length > 240) tr.splice(0, tr.length - 240);
      var want = dist, acc = 0, gx = tr[0].x, gy = tr[0].y;
      for (var i = tr.length - 1; i > 0; i--) {
        var seg = Math.hypot(tr[i].x - tr[i - 1].x, tr[i].y - tr[i - 1].y);
        if (acc + seg >= want) { var f = (want - acc) / (seg || 1); gx = tr[i].x + (tr[i - 1].x - tr[i].x) * f; gy = tr[i].y + (tr[i - 1].y - tr[i].y) * f; break; }
        acc += seg; gx = tr[i - 1].x; gy = tr[i - 1].y;
      }
      if (opts.lockY != null) gy = opts.lockY;
      var dx = gx - p.x, dy = gy - p.y, dd = Math.hypot(dx, dy);
      var sp = opts.speed != null ? Math.max(opts.speed, dd * 6) : Math.max(dd * 10, dist * 8);
      if (dd > dist * 0.02) {
        var step = Math.min(dd, sp * dt);
        p.x += dx / dd * step; p.y += dy / dd * step;
        p.anim += step / dist * 2.6; p.idle = 0;
        if (opts.lockY != null || Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 3 : 1; else p.dir = dy > 0 ? 2 : 0;
      } else p.idle += dt;
    };
    /* Stay put (sit) somewhere and just animate. */
    p.sit = function (dt) { p.tick(dt); p.idle += dt; };
    p.moving = function () { return p.idle < 0.25; };
    p.frame = function () {
      if (p.moving()) return 1 + (Math.floor(p.anim) % 2);
      if (p.idle > 0.9) return (p.wagT > 0 && Math.floor(p.time * 8) % 2) ? 0 : 3;   // sitting, wagging = fidget
      return 0;
    };
    p.bark = function (text) { if (!on) return; p.barkT = 0.8; p.barkText = text || 'WOOF!'; p.wagT = 1.5; if (fx) fx('bark'); };
    p.hop = function () { if (!on) return; p.hopT = 0.5; p.wagT = 2; };

    /* Draw the wolf with its feet at (cx, baseY) in the current transform, `size` px tall. */
    p.draw = function (g, cx, baseY, size, dir) {
      if (!on) return;
      var d = dir != null ? dir : p.dir, img = set[DIRN[d] || 'right'][p.frame()];
      var bob = p.moving() ? -Math.abs(Math.sin(p.anim * Math.PI)) * size * 0.05 : 0;
      if (p.hopT > 0) bob -= Math.sin(p.hopT / 0.5 * Math.PI) * size * 0.5;
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(Math.round(cx - size * 0.3), Math.round(baseY - 1), Math.round(size * 0.6), 2);
      g.drawImage(img, Math.round(cx - size / 2), Math.round(baseY - size + bob), size, size);
      if (p.barkT > 0) {
        var sc = size >= 20 ? 1 : 1, tw = PCTex.textWidth(p.barkText, sc), bx = Math.round(cx - tw / 2), by = Math.round(baseY - size - 12 + bob);
        g.fillStyle = '#fff'; g.fillRect(bx - 3, by - 2, tw + 6, 11); g.fillRect(bx + tw / 2 - 2, by + 9, 4, 2);
        PCTex.drawText(g, p.barkText, bx, by, sc, '#1b1822');
      }
    };
    return p;
  }
  return { make: make };
})();
