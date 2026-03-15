#!/usr/bin/env node
// Build script: copies web assets from Livestream/ into www/
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../../Livestream');
const OUT = path.resolve(__dirname, '../www');

function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function cpDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dest, f);
    if (fs.statSync(s).isDirectory()) cpDir(s, d);
    else cp(s, d);
  }
}

// Main HTML → index.html
cp(path.join(SRC, 'nsmt-stats.html'), path.join(OUT, 'index.html'));

// Assets needed by the app
const assets = [
  'nsmt-ws-client.js',
  'nsmt-manifest.json',
  'nsmt-icon.jpg',
  'NSMTSecondaryLogo.png',
  'NSMTWordmarkBlue.png',
];
for (const a of assets) {
  const src = path.join(SRC, a);
  if (fs.existsSync(src)) cp(src, path.join(OUT, a));
  else console.warn(`⚠ Missing: ${a}`);
}

// Team logo uploads
cpDir(path.join(SRC, 'uploads'), path.join(OUT, 'uploads'));

console.log('✓ Build complete → www/');
