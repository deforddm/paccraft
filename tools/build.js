// node tools/build.js
// Produces two single-file builds in dist/:
//   dist/paccraft.html  — the whole game in one file (double-click to play, email it, host it anywhere)
//   dist/artifact.html  — body-only variant for hosts that wrap the page themselves (no doctype/head/body)
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const dataUri = f => 'data:image/png;base64,' + fs.readFileSync(path.join(root, f)).toString('base64');

const html = read('index.html');
const css = read('src/style.css').replace(/url\(\.\.\/fonts\/([^)]+)\)/g, (m, f) => 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'fonts', f)).toString('base64') + ')');
const js = ['src/world.js', 'src/game.js', 'src/textures.js', 'src/audio.js', 'src/render.js', 'src/builder.js', 'src/app.js'].map(read).join('\n\n');
const a = html.indexOf('<!-- BEGIN APP -->') + '<!-- BEGIN APP -->'.length, b = html.indexOf('<!-- END APP -->');
const app = html.slice(a, b).trim();
const icon = dataUri('icons/favicon-64.png'), apple = dataUri('icons/apple-touch-icon.png');
const head = `<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<link rel="icon" type="image/png" href="${icon}">
<link rel="apple-touch-icon" href="${apple}">`;
const body = `${app}
<script>window.PACCRAFT_SINGLE_FILE = true;</script>
<script>
${js}
</script>`;
const standalone = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>PacCraft</title>
<meta name="theme-color" content="#1a1420">
${head}
<style>
${css}
</style>
</head>
<body>
${body}
</body>
</html>
`;
const artifact = `<title>PacCraft</title>
${head}
<style>
${css}
</style>
${body}
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/paccraft.html'), standalone);
fs.writeFileSync(path.join(root, 'dist/artifact.html'), artifact);
console.log('dist/paccraft.html', (standalone.length / 1024).toFixed(0) + ' KB');
console.log('dist/artifact.html', (artifact.length / 1024).toFixed(0) + ' KB');
