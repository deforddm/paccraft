// Headless simulation tests: maze invariants + thousands of simulated seconds of play.
'use strict';
const Wd = require('../src/world.js');
global.PCWorld = Wd;
const { Game, DX, DY } = require('../src/game.js');
let fails = 0;
function ok(c, msg) { if (!c) { fails++; console.log('FAIL', msg); } }

// ---- maze invariants over many seeds ----
for (let lv = 1; lv <= 14; lv++) for (let s = 0; s < 40; s++) {
  const seed = s * 7919 + lv;
  const L = Wd.makeLevel(lv, seed);
  const t = L.tiles, W = Wd.W, H = Wd.H;
  // symmetry of floor/wall layout
  let sym = true;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((t[y*W+x] === 0) !== (t[y*W+W-1-x] === 0)) sym = false;
  ok(sym, 'symmetric ' + seed);
  // no dead ends among floor tiles outside pen
  let dead = 0;
  for (let y = 1; y < H-1; y++) for (let x = 1; x < W-1; x++) {
    if (t[y*W+x] !== 0 || Wd.penInterior(x,y)) continue;
    let n = 0; for (let d = 0; d < 4; d++) { const nx = x+DX[d], ny=y+DY[d]; if (nx<0||nx>=W) { n++; continue; } if (t[ny*W+nx]===0) n++; }
    if (n <= 1) dead++;
  }
  ok(dead === 0, 'no dead ends ' + seed + ' dead=' + dead);
  // all floor connected (without mining)
  const seen = new Set([L.start.y*W+L.start.x]), q=[L.start.y*W+L.start.x];
  while (q.length) { const c=q.pop(), x=c%W, y=(c-x)/W; for (let d=0;d<4;d++){ let nx=x+DX[d], ny=y+DY[d]; if(nx<0) nx=W-1; if(nx>=W) nx=0; const n=ny*W+nx; if(ny<0||ny>=H||seen.has(n)) continue; if(t[n]===0 && !Wd.penInterior(nx,ny)){seen.add(n);q.push(n);} } }
  let gemsReach = true; for (let i=0;i<t.length;i++) if (L.gems[i] && !seen.has(i)) gemsReach=false;
  ok(gemsReach, 'gems reachable without digging ' + seed);
  ok(t[L.pen.spawnY*W+L.pen.spawnX] === 0, 'spawn open');
  ok(t[L.pen.doorY*W+L.pen.doorX] === Wd.TILE.DOOR, 'door');
  ok(Wd.countGems(L.gems) > 120, 'enough gems');
  // border intact except tunnel
  for (let x=0;x<W;x++){ ok(t[x]===Wd.TILE.BORDER && t[(H-1)*W+x]===Wd.TILE.BORDER, 'top/bottom border'); }
}

// ---- simulation: random-ish player, check invariants and that levels can be cleared ----
function simulate(seed, difficulty, secs, smart) {
  const L = Wd.makeLevel(1 + (seed % 7), seed);
  const g = new Game(L, { difficulty, levelNum: 1 + (seed % 7), upgrades: { pick: seed % 4, magnet: seed % 2, bag: 1 } });
  g.tnt = 2;
  const r = Wd.rng(seed);
  let t = 0, deaths = 0, clears = 0, eats = 0, mined = 0, maxStuck = 0;
  const dt = 1 / 60;
  while (t < secs) {
    if (r() < 0.04) g.setWant(Math.floor(r() * 4), true);
    if (smart && r() < 0.08) { // steer toward nearest gem via BFS
      const p = g.player, W = Wd.W, sx = Math.round(p.x), sy = Math.round(p.y);
      const prev = new Map(), q = [[sx, sy]]; prev.set(sy*W+sx, -1); let found = null;
      while (q.length && !found) { const [x,y] = q.shift(); for (let d=0; d<4; d++) { let nx=(x+DX[d]+W)%W, ny=y+DY[d]; const k=ny*W+nx; if (prev.has(k) || !g.passP(nx,ny)) continue; prev.set(k, (y*W+x)*4+d); if (g.gems[k]) { found=k; break; } q.push([nx,ny]); } }
      if (found != null) { let k = found, dir = -1; while (prev.get(k) !== -1) { const v = prev.get(k); dir = v % 4; k = (v - dir) / 4; } g.setWant(dir, true); }
    }
    if (r() < 0.004) g.mine();
    if (r() < 0.003) g.place();
    if (r() < 0.001) g.dropTnt();
    g.update(dt);
    for (const e of g.drain()) {
      if (e.type === 'death') deaths++;
      if (e.type === 'eat') eats++;
      if (e.type === 'mined') mined++;
      if (e.type === 'levelclear') clears++;
      if (e.type === 'gameover' || e.type === 'levelclear') { return { deaths, clears, eats, mined, t, over: e.type === 'gameover', score: g.score }; }
    }
    // invariants
    const p = g.player;
    ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'player finite');
    ok(Math.abs(p.x - Math.round(p.x)) < 1e-6 || Math.abs(p.y - Math.round(p.y)) < 1e-6, 'player on a lane ' + p.x + ',' + p.y);
    if (g.state === 'play') ok(g.tileAt(Math.round(p.x), Math.round(p.y)) === 0 || p.mining, 'player on floor');
    for (const m of g.monsters) {
      ok(Number.isFinite(m.x) && Number.isFinite(m.y), 'monster finite');
      if (m.mode === 'roam') {
        ok(Math.abs(m.x - Math.round(m.x)) < 1e-6 || Math.abs(m.y - Math.round(m.y)) < 1e-6, 'monster on lane ' + m.kind + ' ' + m.x + ',' + m.y);
        ok(g.tileAt(Math.round(m.x), Math.round(m.y)) === 0, 'monster on floor');
      }
    }
    t += dt;
  }
  return { deaths, clears, eats, mined, t, over: false, score: g.score };
}
let agg = { deaths: 0, clears: 0, eats: 0, mined: 0, over: 0 };
for (let s = 1; s <= 60; s++) {
  const res = simulate(s * 13, ['easy', 'normal', 'hard'][s % 3], 240, s % 2 === 0);
  for (const k in agg) agg[k] += (k === 'over' ? (res.over ? 1 : 0) : res[k]);
}
console.log('sim totals', agg);
ok(agg.clears > 0, 'some simulated runs clear a level');
ok(agg.eats > 0, 'monsters get eaten');
ok(agg.mined > 0, 'blocks get mined');

// eyes always get home & re-leave: force-eat all and run
{
  const L = Wd.makeLevel(3, 99); const g = new Game(L, { difficulty: 'normal' });
  g.update(2.1); g.update(0.01);
  for (let i = 0; i < 300; i++) g.update(1/60);
  g.monsters.forEach(m => { if (m.mode === 'roam') { m.mode = 'eyes'; } });
  let home = false;
  for (let i = 0; i < 60 * 8; i++) { g.update(1/60); g.drain(); if (g.state !== 'play') break; if (g.monsters.every(m => m.mode !== 'eyes' && m.mode !== 'enter')) { home = true; break; } }
  ok(home || g.state !== 'play', 'eyes return home');
}
console.log(fails ? fails + ' FAILURES' : 'all tests passed');
process.exit(fails ? 1 : 0);
