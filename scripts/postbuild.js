/**
 * Post-build script for Expo web export.
 *
 * Expo generates its own index.html and favicon.ico, ignoring web/index.html
 * and sometimes ignoring app.config.js web.favicon. This script:
 *   1. Copies assets/favicon.svg  → dist/favicon.svg
 *   2. Copies assets/favicon.png  → dist/favicon.png
 *   3. Patches dist/index.html to inject SVG + PNG favicon links and fix the title/lang
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

// 1. Copy favicon assets into dist/
fs.copyFileSync(
  path.join(root, 'assets', 'favicon.svg'),
  path.join(dist, 'favicon.svg')
);
fs.copyFileSync(
  path.join(root, 'assets', 'favicon.png'),
  path.join(dist, 'favicon.png')
);
console.log('postbuild: favicon.svg and favicon.png copied to dist/');

// 2. Patch dist/index.html
const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Fix lang attribute
html = html.replace('<html lang="en">', '<html lang="es">');

// Fix title
html = html.replace('<title>Eventify</title>', '<title>Eventify · Descubre Santiago</title>');

// Replace the ico-only favicon link with SVG + PNG + ico fallback
// SVG is preferred by modern browsers; PNG as fallback; ico kept for legacy
html = html.replace(
  '<link rel="icon" href="/favicon.ico" />',
  [
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '<link rel="icon" type="image/png" href="/favicon.png" />',
    '<link rel="icon" href="/favicon.ico" />',
    '<link rel="apple-touch-icon" href="/favicon.png" />',
  ].join('')
);

fs.writeFileSync(indexPath, html);
console.log('postbuild: dist/index.html patched (lang, title, favicon links)');
