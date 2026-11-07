#!/usr/bin/env node
// Regenerate the service worker's file list and bump its cache version.
// Run before every release:  node tools/update-sw.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const INCLUDE = ['index.html', 'manifest.webmanifest', 'css', 'js', 'icons', 'pictures'];
const files = [];
const walk = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;
  if (fs.statSync(abs).isDirectory()) for (const f of fs.readdirSync(abs).sort()) walk(path.posix.join(rel, f));
  else if (!path.basename(rel).startsWith('.')) files.push(rel);
};
INCLUDE.forEach(walk);
files.sort();

const swPath = path.join(ROOT, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
const today = new Date().toISOString().slice(0, 10);
const m = sw.match(/const VERSION = 'v([\d-]+)\.(\d+)';/);
const n = m && m[1] === today ? Number(m[2]) + 1 : 1;
const version = `v${today}.${n}`;
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
sw = sw.replace(/const FILES = \[[\s\S]*?\];/, `const FILES = [\n  './',\n${files.map((f) => `  '${f}',`).join('\n')}\n];`);
fs.writeFileSync(swPath, sw);
console.log(`sw.js: ${version}, ${files.length + 1} files`);
