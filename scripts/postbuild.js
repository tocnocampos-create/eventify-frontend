/**
 * Post-build script for Expo web export.
 *
 * Expo generates its own index.html and favicon.ico, ignoring web/index.html
 * and the app.config.js web.favicon setting. This script:
 *   1. Copies assets/logo.png → dist/favicon.png (the original Eventify logo)
 *   2. Patches dist/index.html: lang=es, correct title, PNG favicon link
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

// 1. Copy logo.png as favicon.png into dist/
fs.copyFileSync(
  path.join(root, 'assets', 'logo.png'),
  path.join(dist, 'favicon.png')
);
console.log('postbuild: assets/logo.png copied to dist/favicon.png');

// 2. Patch dist/index.html
const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Fix lang attribute
html = html.replace('<html lang="en">', '<html lang="es">');

// Fix title
html = html.replace('<title>Eventify</title>', '<title>Eventify · Descubre Santiago</title>');

// Replace ico-only link with PNG + ico fallback (no SVG)
html = html.replace(
  '<link rel="icon" href="/favicon.ico" />',
  [
    '<link rel="icon" type="image/png" href="/favicon.png" />',
    '<link rel="icon" href="/favicon.ico" />',
    '<link rel="apple-touch-icon" href="/favicon.png" />',
  ].join('')
);

fs.writeFileSync(indexPath, html);
console.log('postbuild: dist/index.html patched (lang, title, favicon links)');
