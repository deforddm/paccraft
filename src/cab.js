/* Blockcade — shared "cabinet" runtime for the canvas games (Block Breaker, Tunnel Trouble,
 * Cheetah Dash). A game registers a definition; the cab owns the canvas, scaling, input
 * (joystick / buttons / drag / keyboard), pause + game-over overlays, and ore rewards. */
var PCCab = (function () {
  'use strict';
  var games = {}, order = [];
  var $ = function (id) { return document.getElementById(id); };
  var api = null;              // filled by app.js: { save, persist, A, ICON, toast, show, back, addOre, img }
  var cur = null;              // { def, inst, running, paused, over }
  var cv, g, view = { w: 320, h: 480, scale: 1 }, dpr = 1;
  var held = { dir: -1, dx: 0, dy: 0, a: false, b: false };
  var last = 0, raf = 0;

  function register(def) { games[def.id] = def; order.push(def.id); }
  function list() { return order.map(function (id) { return games[id]; }); }
  function setApi(a) { api = a; }

  // ---------- layout ----------
  function resize() {
    if (!cur) return;
    var st = $('cab-stage'), r = st.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    var d = cur.def, vw = d.view.w, vh = d.view.h;
    var s = Math.min((r.width - 6) / vw, (r.height - 6) / vh);
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    var pix = Math.max(1, Math.floor(s * dpr * 4) / 4);   // quarter-step pixel scale: crisp enough, uses the screen
    cv.width = vw * pix; cv.height = vh * pix;
    cv.style.width = (vw * pix / dpr) + 'px'; cv.style.height = (vh * pix / dpr) + 'px';
    view.w = vw; view.h = vh; view.scale = pix;
    g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    if (cur.inst.resize) cur.inst.resize(vw, vh);
  }

  // ---------- input ----------
  function bindInput() {
    var pad = $('cab-dpad'), knob = $('cab-knob'), arrows = pad.querySelectorAll('.dpad-arrow'), pid = null;
    function setDir(d, dx, dy) {
      arrows.forEach(function (a, i) { a.classList.toggle('lit', i === d); });
      var changed = d !== held.dir;
      held.dir = d; held.dx = dx; held.dy = dy;
      if (cur && cur.inst.input && changed) cur.inst.input({ type: 'dir', dir: d, dx: dx, dy: dy });
    }
    function track(e) {
      var r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = e.clientX - cx, dy = e.clientY - cy, rad = r.width / 2, len = Math.hypot(dx, dy);
      var k = Math.min(1, len / (rad * 0.55));
      knob.style.transform = 'translate(calc(-50% + ' + (len ? dx / len * k * rad * 0.42 : 0) + 'px), calc(-50% + ' + (len ? dy / len * k * rad * 0.42 : 0) + 'px))';
      if (len < rad * 0.14) { setDir(-1, 0, 0); return; }
      var nx = dx / len, ny = dy / len;
      var lr = cur && cur.def.controls.dpad === 'lr';
      var d = lr ? (nx > 0 ? 3 : 1) : (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : (dy > 0 ? 2 : 0));
      setDir(d, nx, ny);
    }
    pad.addEventListener('pointerdown', function (e) { e.preventDefault(); pid = e.pointerId; try { pad.setPointerCapture(pid); } catch (x) { } track(e); });
    pad.addEventListener('pointermove', function (e) { if (e.pointerId === pid) track(e); });
    function end(e) { if (e.pointerId !== pid) return; pid = null; knob.style.transform = ''; setDir(-1, 0, 0); }
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);

    ['a', 'b'].forEach(function (k) {
      var b = $('cab-' + k);
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); b.classList.add('pressed'); held[k] = true; if (cur && cur.inst.input) cur.inst.input({ type: k, down: true }); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { b.addEventListener(ev, function () { if (!held[k]) return; b.classList.remove('pressed'); held[k] = false; if (cur && cur.inst.input) cur.inst.input({ type: k, down: false }); }); });
    });

    // drag / tap on the stage (for paddle games and tap-to-jump)
    var st = $('cab-stage'), spid = null;
    function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * view.w, y: (e.clientY - r.top) / r.height * view.h }; }
    st.addEventListener('pointerdown', function (e) { if (!cur) return; spid = e.pointerId; try { st.setPointerCapture(spid); } catch (x) { } var p = pt(e); if (cur.inst.input) cur.inst.input({ type: 'touch', phase: 'down', x: p.x, y: p.y }); });
    st.addEventListener('pointermove', function (e) { if (!cur || e.pointerId !== spid) return; var p = pt(e); if (cur.inst.input) cur.inst.input({ type: 'touch', phase: 'move', x: p.x, y: p.y }); });
    function sEnd(e) { if (!cur || e.pointerId !== spid) return; spid = null; if (cur.inst.input) cur.inst.input({ type: 'touch', phase: 'up' }); }
    st.addEventListener('pointerup', sEnd); st.addEventListener('pointercancel', sEnd);

    var KEYS = { ArrowUp: 0, KeyW: 0, ArrowLeft: 1, KeyA: 1, ArrowDown: 2, KeyS: 2, ArrowRight: 3, KeyD: 3 };
    var keyDirs = {};
    function keyDir() { // most recent held direction wins
      var best = -1, bestT = -1;
      for (var k in keyDirs) if (keyDirs[k] > bestT) { bestT = keyDirs[k]; best = +k; }
      var dx = best === 1 ? -1 : best === 3 ? 1 : 0, dy = best === 0 ? -1 : best === 2 ? 1 : 0;
      setDir(best, dx, dy);
    }
    document.addEventListener('keydown', function (e) {
      if (!cur || !api.isCab()) return;
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.code in KEYS) { e.preventDefault(); if (!e.repeat) { keyDirs[KEYS[e.code]] = performance.now(); keyDir(); } }
      else if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'KeyK') { e.preventDefault(); if (!e.repeat && !held.a) { held.a = true; cur.inst.input && cur.inst.input({ type: 'a', down: true }); } }
      else if (e.code === 'KeyX' || e.code === 'KeyJ' || e.code === 'KeyL' || e.code === 'ShiftLeft') { if (!e.repeat && !held.b) { held.b = true; cur.inst.input && cur.inst.input({ type: 'b', down: true }); } }
      else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    });
    document.addEventListener('keyup', function (e) {
      if (!cur) return;
      if (e.code in KEYS) { delete keyDirs[KEYS[e.code]]; keyDir(); }
      else if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'KeyK') { held.a = false; cur.inst.input && cur.inst.input({ type: 'a', down: false }); }
      else if (e.code === 'KeyX' || e.code === 'KeyJ' || e.code === 'KeyL' || e.code === 'ShiftLeft') { held.b = false; cur.inst.input && cur.inst.input({ type: 'b', down: false }); }
    });
    window.addEventListener('resize', function () { requestAnimationFrame(resize); });
    window.addEventListener('orientationchange', function () { setTimeout(resize, 250); });
  }

  // ---------- lifecycle ----------
  function start(id) {
    var def = games[id]; if (!def) return;
    stop();
    var save = api.save();
    var ctx = {
      view: view, save: save, A: api.A, ICON: api.ICON, tex: PCTex.build(), held: held,
      addOre: function (k, n) { api.addOre(k, n); refreshOres(); },
      toast: api.toast,
      score: function (n) { setScore(n); },
      over: function (info) { gameOver(info); },
      fx: function (name, data) { api.A.play(name, data); },
      buzz: function (p) { api.A.buzz(p); },
      look: save.look
    };
    cur = { def: def, inst: def.create(ctx), running: true, paused: false, over: false, score: 0, ores: {} };
    ctx.addOre = function (k, n) { api.addOre(k, n); cur.ores[k] = (cur.ores[k] || 0) + n; refreshOres(); };
    cur.inst.ctx = ctx;
    // controls layout
    var c = def.controls || {};
    $('cab-controls').hidden = !c.dpad && !c.a && !c.b;
    $('cab-dpad').style.visibility = c.dpad ? 'visible' : 'hidden';
    $('cab-dpad').classList.toggle('lr', c.dpad === 'lr');
    $('cab-a').hidden = !c.a; $('cab-b').hidden = !c.b;
    $('cab-a').querySelector('span').textContent = c.a || ''; $('cab-b').querySelector('span').textContent = c.b || '';
    $('cab-a').className = 'act act-a' + (c.aClass ? ' ' + c.aClass : ''); $('cab-b').className = 'act act-b';
    $('cab-title').textContent = def.name;
    $('cab-hi').textContent = 'BEST ' + (save.hi[id] || 0);
    setScore(0); refreshOres();
    $('cab-pause').hidden = true; $('cab-over').hidden = true;
    api.show('cab');
    api.A.startMusic(def.music || 'title');
    held.dir = -1; held.a = held.b = false;
    requestAnimationFrame(function () { resize(); cur.inst.start(); last = performance.now(); loop(last); });
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (cur && cur.inst.destroy) cur.inst.destroy();
    cur = null;
  }
  function loop(now) {
    if (!cur) return;
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (!cur.paused && !cur.over) cur.inst.update(dt);
    if (g) {
      g.setTransform(view.scale, 0, 0, view.scale, 0, 0); g.imageSmoothingEnabled = false;
      cur.inst.draw(g, view.w, view.h, dt);
    }
    raf = requestAnimationFrame(loop);
  }
  function setScore(n) {
    if (!cur) return;
    cur.score = n; $('cab-score').textContent = n;
    var save = api.save(), id = cur.def.id;
    if (n > (save.hi[id] || 0)) { save.hi[id] = n; $('cab-hi').textContent = 'BEST ' + n; }
  }
  function refreshOres() {
    var save = api.save(), s = '';
    ['coal', 'iron', 'gold', 'diamond', 'ember'].forEach(function (k) { if (save.ores[k]) s += '<span class="oc">' + api.img(api.ICON.ore[k]) + save.ores[k] + '</span>'; });
    $('cab-ores').innerHTML = s;
  }
  function togglePause(force) {
    if (!cur || cur.over) return;
    var on = typeof force === 'boolean' ? force : !cur.paused;
    cur.paused = on; $('cab-pause').hidden = !on;
    if (on) { api.A.stopMusic(); if (cur.inst.pause) cur.inst.pause(true); }
    else { api.A.startMusic(cur.def.music || 'title'); last = performance.now(); if (cur.inst.pause) cur.inst.pause(false); }
  }
  function gameOver(info) {
    if (!cur || cur.over) return;
    cur.over = true;
    info = info || {};
    api.persist(true);
    api.A.stopMusic();
    api.A.play(info.win ? 'clear' : 'over');
    var save = api.save(), id = cur.def.id;
    save.stats.plays = save.stats.plays || {}; save.stats.plays[id] = (save.stats.plays[id] || 0) + 1;
    var h = '<div class="line"><span>Score</span><span>' + cur.score + '</span></div>';
    h += '<div class="line"><span>Best</span><span class="best">' + (save.hi[id] || 0) + '</span></div>';
    if (info.lines) info.lines.forEach(function (l) { h += '<div class="line"><span>' + l[0] + '</span><span>' + l[1] + '</span></div>'; });
    var ok = Object.keys(cur.ores).filter(function (k) { return cur.ores[k] > 0; });
    h += '<div class="line"><span>Ores found</span></div><div class="ores">' + (ok.length ? ok.map(function (k) { return '<span>' + api.img(api.ICON.ore[k]) + ' ×' + cur.ores[k] + '</span>'; }).join('') : '<span style="color:var(--muted)">None this time</span>') + '</div>';
    if (cur.score > 0 && cur.score >= (save.hi[id] || 0)) h += '<div class="best">★ New best score! ★</div>';
    $('cab-over-stats').innerHTML = h;
    $('cab-over-title').textContent = info.title || (info.win ? 'You Win!' : 'Game Over');
    $('cab-over-title').className = info.win ? 'win' : 'lose';
    $('cab-over').hidden = false;
    api.persist(true);
  }
  function restart() { if (!cur) return; var id = cur.def.id; start(id); }
  function quit() { stop(); api.A.stopMusic(); api.back(); }

  function init() {
    cv = $('cab-canvas'); g = cv.getContext('2d');
    bindInput();
    $('cab-pause-btn').addEventListener('click', function () { api.A.play('click'); togglePause(true); });
    $('cab-resume').addEventListener('click', function () { api.A.play('click'); togglePause(false); });
    $('cab-restart').addEventListener('click', function () { api.A.play('click'); restart(); });
    $('cab-quit').addEventListener('click', function () { api.A.play('click'); quit(); });
    $('cab-again').addEventListener('click', function () { api.A.play('click'); restart(); });
    $('cab-menu').addEventListener('click', function () { api.A.play('click'); quit(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && cur) togglePause(true); });
  }

  return { register: register, list: list, games: games, setApi: setApi, init: init, start: start, stop: stop, resize: resize, isRunning: function () { return !!cur; }, current: function () { return cur; }, held: held };
})();
