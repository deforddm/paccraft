// Balance bot: plays like a careful (not perfect) kid — heads for the nearest gem, avoids
// monsters it can see nearby, grabs crystals, reacts with some delay. Reports clear rates.
'use strict';
const Wd = require('../src/world.js'); global.PCWorld = Wd;
const { Game, DX, DY } = require('../src/game.js');
const W = Wd.W;

function bfsDir(g, danger, targetFn) {
  const p = g.player, sx = ((Math.round(p.x) % W) + W) % W, sy = Math.round(p.y);
  const prev = new Map(), q = [[sx, sy]]; prev.set(sy * W + sx, -1);
  while (q.length) {
    const [x, y] = q.shift();
    for (let d = 0; d < 4; d++) {
      const nx = (x + DX[d] + W) % W, ny = y + DY[d], k = ny * W + nx;
      if (prev.has(k) || !g.passP(nx, ny) || danger.has(k)) continue;
      prev.set(k, (y * W + x) * 4 + d);
      if (targetFn(nx, ny)) { let kk = k, dir = -1; while (prev.get(kk) !== -1) { const v = prev.get(kk); dir = v % 4; kk = (v - dir) / 4; } return dir; }
      q.push([nx, ny]);
    }
  }
  return -1;
}
function field(g, sources) { // multi-source BFS distance over walkable tiles
  const dist = new Int16Array(W * Wd.H).fill(999), q = [];
  for (const [x, y] of sources) { const k = y * W + ((x + W) % W); if (dist[k] > 0) { dist[k] = 0; q.push(k); } }
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % W, y = (c - x) / W;
    for (let d = 0; d < 4; d++) { const nx = (x + DX[d] + W) % W, ny = y + DY[d]; if (ny < 0 || ny >= Wd.H || !g.passM(nx, ny)) continue; const k = ny * W + nx; if (dist[k] > dist[c] + 1) { dist[k] = dist[c] + 1; q.push(k); } }
  }
  return dist;
}
function play(levelNum, difficulty, skill, upgrades) {
  const L = Wd.makeLevel(levelNum, (levelNum * 2654435761 + 12345) >>> 0);
  const g = new Game(L, { difficulty, levelNum, upgrades: upgrades || {} });
  const r = Wd.rng(levelNum * 99 + Math.round(skill * 1000));
  let t = 0, deaths = 0, react = 0;
  while (t < 400) {
    react -= 1 / 60;
    if (g.state === 'play' && react <= 0) {
      react = 0.1 + (1 - skill) * 0.4 * r();
      const p = g.player, px = ((Math.round(p.x) % W) + W) % W, py = Math.round(p.y);
      const threats = g.monsters.filter(m => m.mode === 'roam' && !(m.fright && g.powerT > 1.2)).map(m => [Math.round(m.x), Math.round(m.y)]);
      const mdist = field(g, threats);
      const gemSrc = []; for (let i = 0; i < g.gems.length; i++) if (g.gems[i]) gemSrc.push([i % W, (i - i % W) / W]);
      const prey = g.powerT > 1.5 ? g.monsters.filter(m => m.mode === 'roam' && m.fright).map(m => [Math.round(m.x), Math.round(m.y)]) : [];
      const gdist = field(g, prey.length && skill > 0.5 ? prey : gemSrc);
      let best = -1, bestS = -1e9;
      const safeR = 1 + Math.round(skill * 2);
      for (let d = 0; d < 4; d++) {
        const nx = (px + DX[d] + W) % W, ny = py + DY[d];
        if (!g.passP(nx, ny)) continue;
        const k = ny * W + nx, md = mdist[k], gd = gdist[k];
        let sc = -gd;
        if (md <= safeR) sc -= 100 * (safeR + 1 - md);
        sc += Math.min(md, 6) * 0.3;
        if (sc > bestS) { bestS = sc; best = d; }
      }
      if (r() < (1 - skill) * 0.12) best = Math.floor(r() * 4);
      if (best >= 0) g.setWant(best, true);
    }
    g.update(1 / 60);
    for (const e of g.drain()) {
      if (e.type === 'death') deaths++;
      if (e.type === 'levelclear') return { clear: true, deaths, t };
      if (e.type === 'gameover') return { clear: false, deaths, t, left: g.gemsLeft };
    }
    t += 1 / 60;
  }
  return { clear: false, deaths, t, timeout: true };
}
for (const diff of ['easy', 'normal', 'hard']) for (const skill of [0.3, 0.6, 0.9]) {
  let clears = 0, deaths = 0, n = 0, time = 0;
  for (let lv = 1; lv <= 14; lv++) { const res = play(lv, diff, skill); n++; if (res.clear) { clears++; time += res.t; } deaths += res.deaths; }
  console.log(diff.padEnd(6), 'skill', skill, 'clear', clears + '/' + n, 'avg deaths', (deaths / n).toFixed(1), 'avg clear time', clears ? (time / clears).toFixed(0) + 's' : '-');
}
