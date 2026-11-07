#!/usr/bin/env node
// Rebuild every picture listed in art/pictures.json.
//
//   node tools/build-pictures.mjs            # all pictures
//   node tools/build-pictures.mjs robin fox  # just these ids
//
// Each entry in art/pictures.json looks like:
//   { "id": "robin", "title": "Robin", "category": "Christmas", "source": "robin.svg", "options": { "colors": 24 } }
// "source" is a file in art/ (PNG, JPG or SVG). SVGs are rasterised with Playwright first.
// If tools/art/<id>.mjs exists it is run to (re)generate art/<id>.svg.
// pictures/index.json is rewritten in manifest order (so you can reorder the menu by reordering the manifest).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { convert } from './convert.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ART = path.join(ROOT, 'art');
const OUT = path.join(ROOT, 'pictures');
const TMP = path.join(ROOT, 'tmp');

const manifest = JSON.parse(fs.readFileSync(path.join(ART, 'pictures.json'), 'utf8'));
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const preview = process.argv.includes('--preview');

async function rasterise(svgFile, pngFile, longSide) {
  const { chromium } = require('playwright');
  const svgText = fs.readFileSync(svgFile, 'utf8');
  const m = svgText.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const vw = m ? +m[1] : 750, vh = m ? +m[2] : 1000;
  const scale = longSide / Math.max(vw, vh);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: Math.round(vw), height: Math.round(vh) }, deviceScaleFactor: scale });
  await page.setContent(`<html><body style="margin:0">${svgText}</body></html>`);
  await page.locator('svg').screenshot({ path: pngFile });
  await browser.close();
}

fs.mkdirSync(TMP, { recursive: true });
const results = [];
for (const entry of manifest.pictures) {
  if (only.length && !only.includes(entry.id)) continue;
  const gen = path.join(ROOT, 'tools', 'art', `${entry.id}.mjs`);
  if (fs.existsSync(gen) && entry.source.endsWith('.svg')) {
    const mod = await import(pathToFileURL(gen).href + `?t=${Date.now()}`);
    fs.writeFileSync(path.join(ART, entry.source), mod.default());
  }
  let src = path.join(ART, entry.source);
  const opts = { id: entry.id, title: entry.title, category: entry.category, out: OUT, index: false, ...(entry.options || {}) };
  if (src.endsWith('.svg')) {
    const png = path.join(TMP, `${entry.id}.png`);
    await rasterise(src, png, opts.size || 2000);
    src = png;
  }
  if (preview) opts.preview = path.join(TMP, `${entry.id}-preview.png`);
  results.push(await convert(src, opts));
}

// Rewrite the index in manifest order, keeping entries we didn't rebuild this time.
let old = { pictures: [] };
try { old = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8')); } catch {}
const byId = new Map(old.pictures.map((p) => [p.id, p]));
for (const r of results) {
  const e = manifest.pictures.find((p) => p.id === r.id);
  byId.set(r.id, { id: r.id, title: e.title, category: e.category, width: r.width, height: r.height, sections: r.sections, colors: r.colors, hash: r.hash });
}
const index = { pictures: manifest.pictures.map((p) => byId.get(p.id)).filter(Boolean) };
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`index.json: ${index.pictures.length} pictures`);
