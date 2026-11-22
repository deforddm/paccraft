// Rules of the Level Up layer: XP curve, chests, medals, daily quests, report() bookkeeping.
'use strict';
global.PCTex = { dataURL: () => '', wolf: () => ({ right: [0, 0] }) };
const Q = require('../src/quest.js'), R = Q._;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const games = ['paccraft', 'dash', 'digger', 'breaker', 'invaders', 'crossing', 'snake', 'stack', 'tntmaze', 'cubehop', 'tower', 'caveworm', 'skyguard', 'meteor', 'minecart', 'bonk'].map(id => ({ id, name: id }));
games.forEach(g => ok(Q.MEDALS[g.id] && Q.MEDALS[g.id][0] < Q.MEDALS[g.id][1] && Q.MEDALS[g.id][1] < Q.MEDALS[g.id][2], 'medal ladder ' + g.id));
ok(R.need(1) === 80 && R.need(2) === 110, 'xp curve');
ok(R.rank(1) === 'Dirt Digger' && R.rank(5) === 'Stone Scout' && R.rank(31) === 'Emberite Legend', 'ranks');
ok(R.tierFor('snake', 149) === 0 && R.tierFor('snake', 150) === 1 && R.tierFor('snake', 99999) === 3, 'tiers');
// level-ups: several at once, chests add up, unlocks fire once, cap holds
let P = R.blank(); let g = R.gain(P, 80 + 110 + 5);
ok(g && g.from === 1 && g.to === 3 && P.xp === 5, 'double level-up');
ok(g.ores.coal === 4 && g.ores.iron === 2 && g.ores.gold === 1, 'chests merged');
ok(g.unlocks.some(u => u.pet === 'fox'), 'fox at 3');
P = R.blank(); g = R.gain(P, 1e7); ok(P.lvl === 99 && P.xp === 0, 'level cap'); ok(R.gain(P, 50) === null, 'no xp past cap');
ok(g.unlocks.filter(u => u.pet).length === 6 && g.unlocks.filter(u => u.rank).length === 5, 'all unlocks on the way up');
// quests: deterministic per day, three of them, distinct games for the first two
for (let d = 1; d <= 60; d++) {
  const key = '2026-12-' + d, a = R.roll(key, games, {}, {}), b = R.roll(key, games, {}, {});
  ok(JSON.stringify(a) === JSON.stringify(b), 'same day same quests');
  ok(a.length === 3 && a[0].t === 'play' && a[1].t === 'score' && a[0].game !== a[1].game, 'quest shape ' + key);
  ok(a[1].n === Q.MEDALS[a[1].game][0], 'fresh player gets the bronze target');
}
ok(R.roll('x', games, {}, { snake: 1000 }).concat(R.roll('y', games, {}, { snake: 1000 })).every(q => q.game !== 'snake' || q.t !== 'score' || q.n === 500), 'target scales with own best');
// report(): full flow with a fake app
const save = { ores: { coal: 0, iron: 0, gold: 0, diamond: 0, ember: 0 }, pets: ['none'], hi: {}, best: 0, stats: { games: 0 }, look: {} };
Q.init({ save: () => save, persist: () => { }, games: () => games, img: () => '', ICON: { ore: {} } });
const q = save.prog; ok(q && q.lvl === 1, 'prog created');
let out = Q.report({ game: 'snake', score: 700, ores: { coal: 2, iron: 1 }, seconds: 90, final: true, newBest: true });
ok(out.medals.join() === '1,2', 'bronze + silver in one run');
ok(out.parts.some(p => p[0] === 'Play time' && p[1] === 30), 'time xp');
ok(out.xp >= 10 + 30 + 20 + 90, 'xp sum ' + out.xp);
ok(out.level && save.prog.lvl === out.level.to && save.ores.coal >= out.level.ores.coal, 'levelled and chest paid');
ok(save.prog.today.ores === 3 && save.prog.today.plays.snake === 1, 'today counters');
out = Q.report({ game: 'snake', score: 700, ores: {}, seconds: 3, final: true });
ok(out.medals.length === 0, 'medal only once');
// finish every quest → bonus + streak
const before = save.ores.diamond; let all = false;
save.prog.quests.forEach(qq => { if (qq.game) { const o = Q.report({ game: qq.game, score: 999999, ores: { coal: 9 }, seconds: 9999, final: true }); all = all || o.all; } });
for (let i = 0; i < 4 && !all; i++) all = Q.report({ game: games[i].id, score: 1, ores: { coal: 9 }, seconds: 600, final: true }).all;
ok(all && save.prog.quests.every(qq => qq.done), 'all quests done');
ok(save.ores.diamond > before && save.prog.streak === 1, 'bonus diamond + streak');
ok(Q.hubHTML().indexOf('3/3') > 0, 'hub shows 3/3');
console.log(fails ? fails + ' FAILED' : 'quest tests passed'); process.exit(fails ? 1 : 0);
