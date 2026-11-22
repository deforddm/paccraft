// Pixel Picross: print pictures, check each has exactly one solution for its clues
global.window = {}; global.PCMini = { reg() {}, DX: [], DY: [] }; global.PCTex = {};
require('../src/games/pack-puzzle2.js');
const { PICS, clues } = PCMini;
const key = a => a.join(',');
function rowsFor(cl) { const out = []; for (let m = 0; m < 32; m++) { const bits = m.toString(2).padStart(5, '0'); const runs = bits.split('0').filter(x => x).map(x => x.length); if (key(runs.length ? runs : [0]) === key(cl)) out.push(bits); } return out; }
PICS.forEach(([name, bits]) => {
  if (bits.length !== 25) { console.log(name, 'BAD LENGTH', bits.length); return; }
  const rc = [0, 1, 2, 3, 4].map(n => clues(bits, n, true)), cc = [0, 1, 2, 3, 4].map(n => clues(bits, n, false));
  const opts = rc.map(rowsFor); let sols = 0;
  (function rec(r, acc) { if (r === 5) { const b = acc.join(''); if ([0, 1, 2, 3, 4].every(n => key(clues(b, n, false)) === key(cc[n]))) sols++; return; } opts[r].forEach(o => rec(r + 1, acc.concat(o))); })(0, []);
  if (sols !== 1) { console.log('FAIL', name, 'has', sols, 'solutions'); process.exitCode = 1; }
  if (process.argv[2]) for (let y = 0; y < 5; y++) console.log('   ' + bits.slice(y * 5, y * 5 + 5).replace(/1/g, '##').replace(/0/g, '. '));
});

if (!process.exitCode) console.log('picross tests passed (' + PICS.length + ' pictures)');
