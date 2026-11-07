#!/usr/bin/env node
// Draw the app icon in code and render it at 180/192/512 px with Playwright.
//   node tools/make-icons.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..', 'icons');

function iconSVG() {
  // A six-petal flower, partly painted, with numbers on the unpainted petals.
  const cx = 256, cy = 262, petals = [];
  const colors = ['#d9553f', '#f0a43a', null, '#4c8f6a', '#4a78b5', null];
  const nums = ['', '', '3', '', '', '6'];
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 - 90) * Math.PI / 180;
    const px = cx + Math.cos(a) * 92, py = cy + Math.sin(a) * 92;
    const deg = i * 60;
    petals.push(`<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="62" ry="88" transform="rotate(${deg} ${px.toFixed(1)} ${py.toFixed(1)})" fill="${colors[i] || '#ffffff'}" stroke="#3d3835" stroke-width="9"/>`);
    if (nums[i]) petals.push(`<text x="${px.toFixed(1)}" y="${(py + 22).toFixed(1)}" font-family="-apple-system, system-ui, Helvetica, Arial, sans-serif" font-size="64" font-weight="600" fill="#6f6964" text-anchor="middle">${nums[i]}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#f4efe8"/>
  <circle cx="256" cy="262" r="210" fill="#ebe3d6"/>
  ${petals.join('\n  ')}
  <circle cx="${cx}" cy="${cy}" r="50" fill="#f6cf4f" stroke="#3d3835" stroke-width="9"/>
</svg>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const svg = iconSVG();
  fs.writeFileSync(path.join(OUT, 'icon.svg'), svg);
  const browser = await chromium.launch();
  for (const size of [180, 192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<html><body style="margin:0">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await page.screenshot({ path: path.join(OUT, `icon-${size}.png`), clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
  }
  await browser.close();
  console.log('icons written to', OUT);
})();
