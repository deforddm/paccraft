// node tools/make-icons.js  — renders icons/*.png from tools/icons.html using Playwright
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'icons.html')); await p.waitForFunction(() => window.ICONS);
  const icons = await p.evaluate(() => window.ICONS);
  const out = path.join(__dirname, '..', 'icons'); fs.mkdirSync(out, { recursive: true });
  const map = { i192: 'icon-192.png', i512: 'icon-512.png', m512: 'maskable-512.png', apple: 'apple-touch-icon.png', fav: 'favicon-64.png' };
  for (const k in map) fs.writeFileSync(path.join(out, map[k]), Buffer.from(icons[k].split(',')[1], 'base64'));
  await b.close(); console.log('icons written');
})();
