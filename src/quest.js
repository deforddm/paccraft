/* Blockcade — "Level Up": the arcade-wide progress layer.
 * Every game pays XP into one Arcade Level. Levels open reward chests and unlock pets,
 * each cabinet has Bronze / Silver / Gold medals, and three fresh quests appear every day.
 * Games never talk to this file directly: the cabinet runtime and PacCraft call report()
 * when a run ends, and everything else (hub widget, Quest Book, level-up party) hangs off that. */
var PCQuest = (function () {
  'use strict';
  var api = null;          // filled by app.js: { save, persist, A, ICON, img, toast, modal, show, games, startGame }
  var bonus = null;        // game id that pays double XP on its next finished run (Mystery Box)
  var mar = null;          // Arcade Marathon in progress: { list: [{id, name}], i, pts: [], total }
  var MAR_N = 5, MAR_SECS = 60;
  var ORES = ['coal', 'iron', 'gold', 'diamond', 'ember'];
  var MAX_LEVEL = 99;

  // score needed for Bronze / Silver / Gold in each cabinet
  var MEDALS = {
    paccraft: [1500, 5000, 12000], dash: [500, 1500, 4000], digger: [800, 3000, 8000], breaker: [500, 2000, 5000],
    invaders: [500, 2000, 5000], crossing: [300, 1500, 4000], snake: [150, 600, 1500], stack: [500, 2500, 8000],
    tntmaze: [500, 2500, 7000], cubehop: [800, 3000, 8000], tower: [500, 2000, 6000], caveworm: [500, 2500, 7000],
    skyguard: [500, 2500, 7000], meteor: [500, 2500, 7000], minecart: [500, 2000, 6000], bonk: [300, 700, 1200]
  };
  var TIER = ['', 'Bronze', 'Silver', 'Gold'], TIER_XP = [0, 30, 60, 120];
  var RANKS = [[1, 'Dirt Digger'], [5, 'Stone Scout'], [10, 'Iron Miner'], [15, 'Gold Hunter'], [20, 'Diamond Ace'], [30, 'Emberite Legend']];
  var PET_NAMES = { wolf: 'Wolf', fox: 'Fox', panda: 'Panda Pup', ember: 'Ember Hound', crystal: 'Crystal Wolf', golden: 'Golden Pup', shadow: 'Shadow Wolf' };
  var UNLOCKS = [
    { lvl: 3, pet: 'fox', text: 'New pet: the Fox!' },
    { lvl: 7, pet: 'panda', text: 'New pet: the Panda Pup!' },
    { lvl: 10, sign: true, text: 'The BLOCKCADE sign turns to solid gold!' },
    { lvl: 12, pet: 'ember', text: 'New pet: the Ember Hound!' },
    { lvl: 18, pet: 'crystal', text: 'New pet: the Crystal Wolf!' },
    { lvl: 25, pet: 'golden', text: 'New pet: the Golden Pup!' },
    { lvl: 35, pet: 'shadow', text: 'New pet: the Shadow Wolf!' }
  ];

  // ---------- pure rules ----------
  function need(l) { return 80 + 30 * (l - 1); }                 // XP to go from level l to l + 1
  function rank(l) { var r = RANKS[0][1]; RANKS.forEach(function (x) { if (l >= x[0]) r = x[1]; }); return r; }
  function chest(l) {                                             // what the chest holds when you reach level l
    var c = { coal: 2, iron: 1 };
    if (l % 2 === 0) c.gold = 1;
    if (l % 5 === 0) c.diamond = 1;
    if (l % 10 === 0) c.ember = 1;
    return c;
  }
  function tierFor(game, score) { var m = MEDALS[game], t = 0; if (!m) return 0; for (var i = 0; i < 3; i++) if (score >= m[i]) t = i + 1; return t; }
  function dayKey(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function nice(n) { return n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n / 50) * 50; }

  /* Three quests for a day: try a game, hit a score in another, and one "any game" goal.
   * games: [{id, name}], plays: {id: count}, hi: {id: best}. Same key → same quests. */
  function roll(key, games, plays, hi) {
    var r = rng(hash('blockcade-' + key));
    var byPlays = games.slice().sort(function (a, b) { return ((plays[a.id] || 0) - (plays[b.id] || 0)) || (a.id < b.id ? -1 : 1); });
    var g1 = byPlays[Math.floor(r() * Math.min(5, byPlays.length))];
    var rest = games.filter(function (g) { return g.id !== g1.id; });
    var g2 = rest[Math.floor(r() * rest.length)] || g1;
    var m = MEDALS[g2.id] || [500, 2000, 5000], best = hi[g2.id] || 0;
    var target = best >= m[0] * 2 ? Math.min(m[2], Math.max(m[0], nice(best * 0.5))) : m[0];
    var third = [
      { t: 'ores', n: 3 + Math.floor(r() * 4), text: 'Find {n} ores in any games' },
      { t: 'variety', n: 3, text: 'Play 3 different games' },
      { t: 'xp', n: 150, text: 'Earn 150 XP today' }
    ][Math.floor(r() * 3)];
    third.text = third.text.replace('{n}', third.n);
    return [
      { t: 'play', game: g1.id, n: 1, text: 'Play ' + g1.name, xp: 30, ore: { coal: 2 }, done: false },
      { t: 'score', game: g2.id, n: target, text: 'Score ' + target + ' in ' + g2.name, xp: 60, ore: { gold: 1 }, done: false },
      { t: third.t, n: third.n, text: third.text, xp: 40, ore: { iron: 2 }, done: false }
    ];
  }
  function questProgress(q, T) {
    if (q.done) return q.n;
    if (q.t === 'play') return Math.min(1, T.plays[q.game] || 0);
    if (q.t === 'score') return Math.min(q.n, T.best[q.game] || 0);
    if (q.t === 'ores') return Math.min(q.n, T.ores || 0);
    if (q.t === 'variety') return Math.min(q.n, Object.keys(T.plays).length);
    if (q.t === 'xp') return Math.min(q.n, T.xp || 0);
    return 0;
  }
  // add XP to a progress record; returns null or { from, to, ores, unlocks }
  function gain(P, xp) {
    if (P.lvl >= MAX_LEVEL) return null;
    P.xp += xp; P.total = (P.total || 0) + xp;
    var from = P.lvl, ores = {}, unlocks = [];
    while (P.lvl < MAX_LEVEL && P.xp >= need(P.lvl)) {
      P.xp -= need(P.lvl); P.lvl++;
      var c = chest(P.lvl); Object.keys(c).forEach(function (k) { ores[k] = (ores[k] || 0) + c[k]; });
      UNLOCKS.forEach(function (u) { if (u.lvl === P.lvl) unlocks.push(u); });
      if (rank(P.lvl) !== rank(P.lvl - 1)) unlocks.push({ lvl: P.lvl, rank: rank(P.lvl), text: 'New rank: ' + rank(P.lvl) + '!' });
    }
    if (P.lvl >= MAX_LEVEL) P.xp = 0;
    return P.lvl > from ? { from: from, to: P.lvl, ores: ores, unlocks: unlocks } : null;
  }
  function blank() { return { xp: 0, lvl: 1, total: 0, medals: {}, day: '', quests: [], today: { plays: {}, best: {}, ores: 0, xp: 0, all: false }, streak: 0, lastAll: '', intro: false }; }

  // ---------- state ----------
  function prog() {
    var s = api.save(), b = blank();
    if (!s.prog) s.prog = b;
    Object.keys(b).forEach(function (k) { if (s.prog[k] === undefined) s.prog[k] = b[k]; });
    var T = s.prog.today; ['plays', 'best'].forEach(function (k) { if (!T[k]) T[k] = {}; });
    return s.prog;
  }
  function allPlays() { var s = api.save(), p = Object.assign({}, (s.stats && s.stats.plays) || {}); p.paccraft = (s.stats && s.stats.games) || 0; return p; }
  function allBests() { var s = api.save(), h = Object.assign({}, s.hi || {}); h.paccraft = s.best || 0; return h; }
  function ensureDay(P) {
    var key = dayKey(new Date());
    if (P.day === key && P.quests && P.quests.length === 3) return;
    P.day = key; P.today = { plays: {}, best: {}, ores: 0, xp: 0, all: false };
    P.quests = roll(key, api.games(), allPlays(), allBests());
  }
  function streak(P) {             // a streak only counts if it was kept up yesterday or today
    var y = new Date(); y.setDate(y.getDate() - 1);
    return (P.lastAll === dayKey(new Date()) || P.lastAll === dayKey(y)) ? (P.streak || 0) : 0;
  }
  function grant(ores) { var s = api.save(); Object.keys(ores).forEach(function (k) { s.ores[k] = (s.ores[k] || 0) + ores[k]; }); }

  /* A run (or a PacCraft level) just ended.
   * r: { game, score, ores: {kind: n}, seconds, final, newBest } → what it earned. */
  function report(r) {
    var s = api.save(), P = prog(); ensureDay(P);
    var out = { parts: [], xp: 0, medals: [], quests: [], level: null, all: false, game: r.game };
    function add(label, n, cls) { if (n > 0) { out.parts.push([label, n, cls || '']); out.xp += n; } }
    var base = r.final ? ((r.seconds || 0) >= 15 ? 10 : 3) : 25, time = Math.min(60, Math.floor((r.seconds || 0) / 3));
    add(r.final ? 'Played a round' : 'Level clear', base);
    add('Play time', time);
    if (r.final && bonus && bonus === r.game) add('Mystery Box ×2', base + time, 'gold');
    if (r.final) bonus = null;
    if (r.newBest) add('New best score', 20);
    // Arcade Marathon: each game is worth up to 100 points (score measured against its Gold medal)
    if (mar && r.final && mar.list[mar.i] && mar.list[mar.i].id === r.game) {
      var gold = (MEDALS[r.game] || [0, 0, 1000])[2], mp = Math.min(100, Math.round((r.score || 0) / gold * 100));
      mar.pts.push(mp); mar.total += mp;
      out.mar = { i: mar.i + 1, n: mar.list.length, pts: mp, total: mar.total, done: mar.i + 1 >= mar.list.length, next: mar.list[mar.i + 1] ? mar.list[mar.i + 1].name : null };
      if (out.mar.done) {
        add('Marathon finished', 40 + Math.round(mar.total / 4), 'gold');
        var prize = { coal: 1 + Math.floor(mar.total / 60) }; if (mar.total >= 120) prize.iron = 1; if (mar.total >= 200) prize.gold = 1; if (mar.total >= 320) prize.diamond = 1;
        grant(prize); out.mar.prize = prize; out.mar.best = Math.max(P.marBest || 0, mar.total); out.mar.record = mar.total > (P.marBest || 0); P.marBest = out.mar.best; P.marRuns = (P.marRuns || 0) + 1;
      }
    }
    var T = P.today, found = 0;
    Object.keys(r.ores || {}).forEach(function (k) { found += r.ores[k] || 0; });
    T.plays[r.game] = (T.plays[r.game] || 0) + 1;
    T.best[r.game] = Math.max(T.best[r.game] || 0, r.score || 0);
    T.ores = (T.ores || 0) + found;
    var tier = tierFor(r.game, r.score || 0), prev = P.medals[r.game] || 0;
    for (var t = prev + 1; t <= tier; t++) { add(TIER[t] + ' medal', TIER_XP[t], 'medal m' + t); out.medals.push(t); }
    if (tier > prev) P.medals[r.game] = tier;
    T.xp = (T.xp || 0) + out.xp;
    P.quests.forEach(function (q) {
      if (q.done || questProgress(q, T) < q.n) return;
      q.done = true; add('Quest: ' + q.text, q.xp, 'quest'); grant(q.ore); out.quests.push(q);
    });
    if (!T.all && P.quests.every(function (q) { return q.done; })) {
      T.all = true; out.all = true;
      add('All 3 quests!', 100, 'quest'); grant({ diamond: 1 });
      var y = new Date(); y.setDate(y.getDate() - 1);
      P.streak = (P.lastAll === dayKey(y) ? (P.streak || 0) : 0) + 1; P.lastAll = P.day;
    }
    out.level = gain(P, out.xp);
    if (out.level) {
      grant(out.level.ores);
      out.level.unlocks.forEach(function (u) { if (u.pet && s.pets.indexOf(u.pet) < 0) s.pets.push(u.pet); });
    }
    out.lvl = P.lvl; out.cur = P.xp; out.need = need(P.lvl);
    api.persist(true);
    return out;
  }

  // ---------- drawing helpers ----------
  function oreRow(ores) { return ORES.filter(function (k) { return ores[k]; }).map(function (k) { return '<span>' + api.img(api.ICON.ore[k]) + '×' + ores[k] + '</span>'; }).join(''); }
  function pips(tier) { var h = '<span class="medals">'; for (var i = 1; i <= 3; i++) h += '<i class="pip' + (tier >= i ? ' m' + i : '') + '"></i>'; return h + '</span>'; }
  function bar(cur, max) { return '<div class="xpbar"><i style="width:' + Math.max(2, Math.min(100, Math.round(cur / max * 100))) + '%"></i></div>'; }
  function petImg(kind) { return api.img(PCTex.dataURL(PCTex.wolf(api.save().look.shirt, kind).right[1], 4), 'petpic'); }

  // the block appended to a game-over / level-clear card
  function resultHTML(out) {
    var h = '<div class="xpbox"><div class="xphead"><span class="lvbadge">LV ' + out.lvl + '</span><span class="xptot">+' + out.xp + ' XP</span></div>';
    h += bar(out.cur, out.need) + '<div class="xpnote">' + (out.lvl >= MAX_LEVEL ? 'Max level!' : out.cur + ' / ' + out.need + ' XP to Level ' + (out.lvl + 1)) + '</div>';
    out.parts.forEach(function (p) { h += '<div class="xpline ' + p[2] + '"><span>' + p[0] + '</span><span>+' + p[1] + '</span></div>'; });
    h += '</div>';
    if (out.mar) {
      var m = out.mar;
      h += '<div class="xpbox marbox"><div class="xphead"><span class="lvbadge">MARATHON ' + m.i + '/' + m.n + '</span><span class="xptot">' + m.pts + ' pts</span></div>' + bar(m.total, m.n * 100) +
        '<div class="xpnote">Total ' + m.total + ' / ' + m.n * 100 + '</div>' +
        (m.done ? '<div class="xpline gold"><span>' + (m.record ? '★ New marathon record! ★' : 'Marathon complete! Best ' + m.best) + '</span></div><div class="ores">' + oreRow(m.prize) + '</div>'
          : '<div class="xpline"><span>Up next</span><span>' + m.next + '</span></div>') + '</div>';
    }
    return h;
  }

  // ---------- Arcade Marathon: five random quick games, 60 seconds each ----------
  function marathonStart() {
    var pool = api.games().filter(function (g) { return g.mar; }), list = [];
    while (list.length < MAR_N && pool.length) list.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    mar = { list: list, i: 0, pts: [], total: 0 }; bonus = null;
    api.toast('Marathon! ' + MAR_N + ' games, ' + MAR_SECS + ' seconds each', 2600);
    api.startGame(list[0].id);
  }
  // what the cabinet should do for this game: null (normal play) or { limit, label }
  function marathonFor(id) { return mar && mar.list[mar.i] && mar.list[mar.i].id === id ? { limit: MAR_SECS, label: (mar.i + 1) + '/' + mar.list.length } : null; }
  // after a marathon game's game-over card: id of the next game, or null when the marathon is finished
  function marathonNext() { if (!mar) return null; mar.i++; if (mar.i >= mar.list.length) { mar = null; return null; } return mar.list[mar.i].id; }

  // ---------- level-up party ----------
  function celebrate(out) {
    var L = out && out.level; if (!L) return;
    var el = document.getElementById('lvlup');
    var conf = '', cols = ['#f7c936', '#5ef0a8', '#7df9ff', '#ff6bd6', '#ff8a1f', '#ffffff'];
    for (var i = 0; i < 28; i++) conf += '<i style="left:' + (i * 3.6 + Math.random() * 3).toFixed(1) + '%;background:' + cols[i % cols.length] + ';animation-delay:' + (Math.random() * 0.9).toFixed(2) + 's;animation-duration:' + (1.8 + Math.random() * 1.6).toFixed(2) + 's"></i>';
    var h = '<div class="confetti">' + conf + '</div><div class="card lvcard"><div class="lvup-top">LEVEL UP!</div>';
    h += '<div class="lvup-num">' + L.to + '</div><div class="lvup-rank">' + rank(L.to) + '</div>';
    h += '<div class="lvup-chest"><div class="lvup-label">Reward chest</div><div class="ores">' + oreRow(L.ores) + '</div></div>';
    L.unlocks.forEach(function (u) { h += '<div class="lvup-unlock">' + (u.pet ? petImg(u.pet) : '') + '<span>' + u.text + (u.pet ? '<small>Pick it on the Hero screen.</small>' : '') + '</span></div>'; });
    h += '<button class="btn btn-gold btn-lg" id="lvlup-ok">Awesome!</button></div>';
    el.innerHTML = h; el.hidden = false;
    api.A.play('levelup'); api.A.buzz([30, 40, 30, 40, 80]);
    document.getElementById('lvlup-ok').addEventListener('click', function () { api.A.play('click'); el.hidden = true; el.innerHTML = ''; });
  }

  // ---------- hub ----------
  function hubHTML() {
    var P = prog(); ensureDay(P);
    var done = P.quests.filter(function (q) { return q.done; }).length, st = streak(P);
    return '<span class="lvbadge big">LV ' + P.lvl + '</span><span class="hl-mid"><b>' + rank(P.lvl) + '</b>' + bar(P.xp, need(P.lvl)) +
      '<small>' + (P.lvl >= MAX_LEVEL ? 'Max level!' : P.xp + ' / ' + need(P.lvl) + ' XP') + '</small></span>' +
      '<span class="hl-q' + (done === 3 ? ' all' : '') + '"><b>' + done + '/3</b><small>QUESTS</small>' + (st > 1 ? '<em>' + st + ' days!</em>' : '') + '</span>';
  }
  function decorate(card, id, isNew) {       // medals + QUEST / NEW ribbon on a hub cabinet card
    var P = prog(); ensureDay(P);
    if (MEDALS[id]) { var m = document.createElement('div'); m.className = 'cab-medals'; m.innerHTML = pips(P.medals[id] || 0); card.appendChild(m); }
    if (P.quests.some(function (q) { return q.game === id && !q.done; })) { var r = document.createElement('div'); r.className = 'cab-ribbon'; r.textContent = 'QUEST'; card.appendChild(r); }
    else if (isNew && !allPlays()[id]) { var n = document.createElement('div'); n.className = 'cab-ribbon new'; n.textContent = 'NEW'; card.appendChild(n); }
  }
  function mystery() {                // the Mystery Box card: a random cabinet at double XP
    var list = api.games().filter(function (g) { return g.id !== 'paccraft'; });
    var pick = list[Math.floor(Math.random() * list.length)];
    bonus = pick.id;
    api.toast('Mystery Box: ' + pick.name + ' — double XP!', 2600);
    api.startGame(pick.id);
  }
  // first visit after the update: hand out medals already earned, then say hello
  function welcome() {
    var P = prog();
    if (P.intro && P.intro !== 4) {   // already met Level Up: just announce the v4.0 arcade
      P.intro = 4; api.persist(true);
      api.modal('48 GAMES!', 'The arcade just tripled: 32 brand-new cabinets — action, skill, puzzle and brain games. Use the tabs to find them (look for the NEW ribbons), try the Arcade Marathon for 5 random games in a row, and level up to meet the Golden Pup and the Shadow Wolf.', [{ label: 'Let\'s go!', cls: 'btn-gold btn-sm' }]);
      return;
    }
    if (P.intro) return;
    var bests = allBests(), n = 0;
    Object.keys(MEDALS).forEach(function (id) { var t = tierFor(id, bests[id] || 0); if (t > (P.medals[id] || 0)) { n += t - (P.medals[id] || 0); P.medals[id] = t; } });
    P.intro = 4; api.persist(true);
    api.modal('LEVEL UP!', 'New in the arcade: every game now earns XP for your Arcade Level. Level up to open reward chests and unlock new pets, win Bronze, Silver and Gold medals on every cabinet, and finish 3 new quests every day.' +
      (n ? ' Your old high scores already earned you ' + n + ' medal' + (n === 1 ? '' : 's') + '!' : ''),
      [{ label: 'Show me!', cls: 'btn-gold btn-sm', fn: function () { api.show('quests'); } }, { label: 'Play', cls: 'btn-green btn-sm' }]);
    return n;
  }

  // ---------- Quest Book screen ----------
  function render() {
    var P = prog(); ensureDay(P);
    var T = P.today, st = streak(P), names = {}; api.games().forEach(function (g) { names[g.id] = g.name; });
    var h = '<div class="panel qb-level"><span class="lvbadge huge">' + P.lvl + '</span><div class="qb-lv-mid"><div class="qb-rank">' + rank(P.lvl) + '</div>' + bar(P.xp, need(P.lvl)) +
      '<div class="hint">' + (P.lvl >= MAX_LEVEL ? 'Max level!' : P.xp + ' / ' + need(P.lvl) + ' XP to Level ' + (P.lvl + 1)) + ' · ' + (P.total || 0) + ' XP all-time</div></div></div>';
    h += '<div class="panel"><h3>Today\'s Quests</h3>';
    P.quests.forEach(function (q, i) {
      var p = questProgress(q, T);
      h += '<div class="quest' + (q.done ? ' done' : '') + '"><span class="q-check">' + (q.done ? '✔' : '') + '</span><span class="q-mid"><b>' + q.text + '</b>' +
        (q.n > 1 && !q.done ? bar(p, q.n) + '<small>' + p + ' / ' + q.n + '</small>' : '') +
        '<small class="q-rew">+' + q.xp + ' XP ' + oreRow(q.ore) + '</small></span>' +
        (!q.done && q.game ? '<button class="btn btn-sm btn-green q-go" data-go="' + q.game + '">GO</button>' : '') + '</div>';
    });
    h += '<div class="hint">' + (T.all ? 'All done! Come back tomorrow for 3 new quests.' : 'Finish all 3 for a bonus diamond and +100 XP.') +
      (st > 0 ? ' Quest streak: ' + st + ' day' + (st === 1 ? '' : 's') + '.' : '') + '</div></div>';
    var nextU = UNLOCKS.concat(RANKS.slice(1).map(function (r) { return { lvl: r[0], text: 'New rank: ' + r[1] }; })).filter(function (u) { return u.lvl > P.lvl; }).sort(function (a, b) { return a.lvl - b.lvl; }).slice(0, 4);
    if (nextU.length) {
      h += '<div class="panel"><h3>Coming Up</h3>';
      nextU.forEach(function (u) { h += '<div class="unlock-row"><span class="lvbadge">LV ' + u.lvl + '</span>' + (u.pet ? petImg(u.pet) : '') + '<span>' + u.text + '</span></div>'; });
      h += '<div class="hint">Every level also opens a chest of ores.</div></div>';
    }
    var got = 0; Object.keys(MEDALS).forEach(function (id) { got += P.medals[id] || 0; });
    h += '<div class="panel"><h3>Medals <small>' + got + ' / ' + Object.keys(MEDALS).length * 3 + '</small></h3><div class="medal-wall">';
    var bests = allBests();
    api.games().forEach(function (g) {
      var m = MEDALS[g.id]; if (!m) return;
      var t = P.medals[g.id] || 0;
      h += '<button class="medal-row" data-go="' + g.id + '"><span class="mr-name">' + g.name + '</span>' + pips(t) +
        '<span class="mr-next">' + (t >= 3 ? 'All gold!' : TIER[t + 1] + ' at ' + m[t]) + '</span><span class="mr-best">BEST ' + (bests[g.id] || 0) + '</span></button>';
    });
    h += '</div></div>';
    var box = document.getElementById('quest-body'); box.innerHTML = h;
    box.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { api.A.unlock(); api.A.play('click'); api.startGame(b.getAttribute('data-go')); }); });
  }

  function init(a) { api = a; prog(); }
  return {
    init: init, report: report, resultHTML: resultHTML, celebrate: celebrate, hubHTML: hubHTML, decorate: decorate, mystery: mystery, welcome: welcome, render: render,
    level: function () { return prog().lvl; }, clearBonus: function () { bonus = null; mar = null; }, bonus: function () { return bonus; },
    marathonStart: marathonStart, marathonFor: marathonFor, marathonNext: marathonNext, marathon: function () { return mar; }, marBest: function () { return prog().marBest || 0; },
    MEDALS: MEDALS, PET_NAMES: PET_NAMES, UNLOCKS: UNLOCKS,
    _: { need: need, rank: rank, chest: chest, tierFor: tierFor, roll: roll, gain: gain, blank: blank, questProgress: questProgress, dayKey: dayKey }
  };
})();
if (typeof module !== 'undefined') module.exports = PCQuest;
