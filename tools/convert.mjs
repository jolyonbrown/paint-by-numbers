#!/usr/bin/env node
// Turn any PNG or JPG into a paint-by-numbers puzzle the game can load.
//
//   node tools/convert.mjs <image> --id robin --title "Robin" --category Christmas [options]
//
// Options (all optional):
//   --colors N        maximum number of colours (default 24; aim for 12-30)
//   --min-area N      smallest section, in output pixels; smaller ones are merged into a neighbour (default 40)
//   --min-width N     thinnest section, in output pixels; thinner slivers are merged (default 3)
//   --size N          output resolution: length of the longer side in pixels (default 2000)
//   --smooth N        speck-smoothing passes (default 2; 0 to disable)
//   --merge-delta N   merge palette colours closer than this (CIE76 delta-E, default 7)
//   --out DIR         output folder (default: pictures)
//   --preview FILE    also write a full-size PNG preview of the result (colours + outlines)
//   --no-index        don't add/update the entry in <out>/index.json
//
// Writes <out>/<id>/puzzle.json, <out>/<id>/thumb.json, <out>/<id>/lines.png and updates <out>/index.json.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadImage, resize, savePNG } from './lib/image-io.mjs';
import { quantize, rgbToLab, dist2, hex } from './lib/color.mjs';
import { modeFilter, components, mergeTiny, boundaryDistance, placeLabels, traceOutlines } from './lib/segment.mjs';
import { VarintWriter, toBase64 } from './lib/encode.mjs';

export const DEFAULTS = { colors: 24, minArea: 40, minWidth: 3, size: 2000, smooth: 2, mergeDelta: 7, out: 'pictures', thumbSize: 720 };

export async function convert(input, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const log = o.quiet ? () => {} : (...a) => console.log(...a);
  if (!o.id) o.id = path.basename(input).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (!o.title) o.title = o.id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const t0 = Date.now();

  // 1. Load and resize.
  let img = loadImage(input);
  const scale = o.size / Math.max(img.width, img.height);
  const W = Math.round(img.width * scale), H = Math.round(img.height * scale);
  log(`${o.id}: ${img.width}x${img.height} -> ${W}x${H}`);
  img = resize(img, W, H);

  // 2. Reduce colours.
  let { palette, index } = quantize(img, o.colors);
  const labs = palette.map((c) => rgbToLab(...c));
  // Merge colours that are too close to tell apart.
  const counts = new Array(palette.length).fill(0);
  for (let i = 0; i < index.length; i++) counts[index[i]]++;
  const remap = palette.map((_, i) => i);
  const byCount = palette.map((_, i) => i).sort((a, b) => counts[b] - counts[a]);
  for (let ai = 0; ai < byCount.length; ai++) {
    const a = byCount[ai];
    if (remap[a] !== a) continue;
    for (let bi = ai + 1; bi < byCount.length; bi++) {
      const b = byCount[bi];
      if (remap[b] === b && Math.sqrt(dist2(labs[a], labs[b])) < o.mergeDelta) remap[b] = a;
    }
  }
  for (let i = 0; i < index.length; i++) index[i] = remap[index[i]];

  // 3. Smooth away specks, then merge sections too small or thin to tap.
  if (o.smooth > 0) index = modeFilter(index, W, H, o.smooth);
  const labDist = (a, b) => Math.sqrt(dist2(labs[a], labs[b]));
  mergeTiny(index, W, H, { minArea: o.minArea, minWidth: o.minWidth, labDist, log });

  // 4. Renumber colours: drop unused ones, order by hue so the colour row reads like a gradient.
  const used = new Array(palette.length).fill(0);
  for (let i = 0; i < index.length; i++) used[index[i]]++;
  const live = palette.map((_, i) => i).filter((i) => used[i] > 0);
  const sortKey = (i) => {
    const [L, a, b] = labs[i];
    const C = Math.hypot(a, b);
    if (C < 10) return 1000 + (100 - L); // neutrals last, light to dark
    let hDeg = (Math.atan2(b, a) * 180) / Math.PI;
    hDeg = (hDeg + 360 - 15) % 360; // start the wheel at red
    return hDeg + (100 - L) / 1000;
  };
  live.sort((a, b) => sortKey(a) - sortKey(b));
  const newIndexOf = new Int32Array(palette.length).fill(-1);
  live.forEach((old, ni) => { newIndexOf[old] = ni; });
  for (let i = 0; i < index.length; i++) index[i] = newIndexOf[index[i]];
  const finalPalette = live.map((i) => palette[i]);

  // 5. Final sections, number positions and outlines.
  const { labels, count, color } = components(index, W, H);
  if (count > 65535) throw new Error(`Too many sections (${count}); raise --min-area or lower --size`);
  const dist = boundaryDistance(labels, W, H);
  const labelList = placeLabels(labels, count, dist, W, H);
  const chains = traceOutlines(labels, W, H);
  const nPts = chains.reduce((s, c) => s + c.length / 2, 0);
  log(`  ${finalPalette.length} colours, ${count} sections, ${labelList.length / 4} numbers, ${chains.length} outline chains (${nPts} points)`);

  // 6. Encode.
  const mapW = new VarintWriter();
  let run = 0, cur = labels[0];
  for (let i = 1; i <= labels.length; i++) {
    if (i < labels.length && labels[i] === cur) { run++; continue; }
    mapW.u(cur); mapW.u(run);
    if (i < labels.length) { cur = labels[i]; run = 0; }
  }
  const labW = new VarintWriter();
  labW.u(labelList.length / 4);
  for (let i = 0; i < labelList.length; i += 4) {
    labW.u(labelList[i]); labW.u(labelList[i + 1]); labW.u(labelList[i + 2]); labW.u(Math.round(labelList[i + 3] * 4));
  }
  const linW = new VarintWriter();
  linW.u(chains.length);
  let px = 0, py = 0;
  for (const c of chains) {
    linW.u(c.length / 2);
    for (let i = 0; i < c.length; i += 2) {
      const x = Math.round(c[i] * 4), y = Math.round(c[i + 1] * 4);
      linW.s(x - px); linW.s(y - py);
      px = x; py = y;
    }
  }
  const puzzle = {
    format: 1,
    id: o.id,
    title: o.title,
    category: o.category || '',
    width: W,
    height: H,
    palette: finalPalette.map(hex),
    sections: count,
    sectionColor: toBase64(Uint8Array.from(color)),
    map: mapW.base64(),
    labels: labW.base64(),
    lines: linW.base64(),
  };
  const hash = crypto.createHash('sha1').update(puzzle.map).update(puzzle.sectionColor).digest('hex').slice(0, 10);
  puzzle.hash = hash;

  // 7. Thumbnail data: a small section map (for showing progress in colour) and antialiased line art.
  const ts = o.thumbSize / Math.max(W, H);
  const TW = Math.round(W * ts), TH = Math.round(H * ts);
  const tmap = new VarintWriter();
  {
    let prev = -1, r = 0, first = true;
    for (let y = 0; y < TH; y++) {
      const sy = Math.min(H - 1, Math.floor((y + 0.5) / ts));
      for (let x = 0; x < TW; x++) {
        const sx = Math.min(W - 1, Math.floor((x + 0.5) / ts));
        const l = labels[sy * W + sx];
        if (first) { prev = l; r = 0; first = false; } else if (l === prev) r++; else { tmap.u(prev); tmap.u(r); prev = l; r = 0; }
      }
    }
    tmap.u(prev); tmap.u(r);
  }
  const lines = renderThumbLines(labels, W, H, TW, TH);
  const thumb = { format: 1, id: o.id, hash, width: TW, height: TH, sections: count, palette: puzzle.palette, sectionColor: puzzle.sectionColor, map: tmap.base64() };

  // 8. Write.
  const dir = path.join(o.out, o.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'puzzle.json'), JSON.stringify(puzzle));
  fs.writeFileSync(path.join(dir, 'thumb.json'), JSON.stringify(thumb));
  savePNG(path.join(dir, 'lines.png'), TW, TH, lines);
  const size = fs.statSync(path.join(dir, 'puzzle.json')).size;
  log(`  wrote ${dir}/ (puzzle ${(size / 1024).toFixed(0)} KB) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  if (o.preview) savePNG(o.preview, W, H, renderPreview(labels, color, finalPalette, W, H));

  if (o.index !== false) {
    const idxFile = path.join(o.out, 'index.json');
    let idx = { pictures: [] };
    try { idx = JSON.parse(fs.readFileSync(idxFile, 'utf8')); } catch {}
    const entry = { id: o.id, title: o.title, category: o.category || '', width: W, height: H, sections: count, colors: finalPalette.length, hash };
    const at = idx.pictures.findIndex((p) => p.id === o.id);
    if (at >= 0) idx.pictures[at] = entry; else idx.pictures.push(entry);
    fs.writeFileSync(idxFile, JSON.stringify(idx, null, 2) + '\n');
  }
  return { id: o.id, width: W, height: H, sections: count, colors: finalPalette.length, hash };
}

/** Thumbnail line art: section borders at full size, area-averaged down to an antialiased transparent PNG. */
function renderThumbLines(labels, W, H, TW, TH) {
  const cov = new Float32Array(TW * TH);
  const sx = TW / W, sy = TH / H;
  for (let y = 0; y < H; y++) {
    const ty = Math.min(TH - 1, Math.floor(y * sy));
    for (let x = 0; x < W; x++) {
      const p = y * W + x, l = labels[p];
      const edge = (x < W - 1 && labels[p + 1] !== l) || (x > 0 && labels[p - 1] !== l) ||
        (y < H - 1 && labels[p + W] !== l) || (y > 0 && labels[p - W] !== l);
      if (edge) cov[ty * TW + Math.min(TW - 1, Math.floor(x * sx))] += 1;
    }
  }
  const perPixel = (W / TW) * (H / TH);
  const out = new Uint8Array(TW * TH * 4);
  for (let i = 0; i < cov.length; i++) {
    const a = Math.min(1, (cov[i] / perPixel) * 1.6);
    out[i * 4] = 52; out[i * 4 + 1] = 48; out[i * 4 + 2] = 46; out[i * 4 + 3] = Math.round(a * 255);
  }
  return out;
}

function renderPreview(labels, color, palette, W, H) {
  const out = new Uint8Array(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    const l = labels[p], x = p % W;
    const edge = (x < W - 1 && labels[p + 1] !== l) || (p + W < W * H && labels[p + W] !== l);
    const c = edge ? [40, 40, 40] : palette[color[l]];
    out[p * 4] = c[0]; out[p * 4 + 1] = c[1]; out[p * 4 + 2] = c[2]; out[p * 4 + 3] = 255;
  }
  return out;
}

// ---- CLI ----
function parseArgs(argv) {
  const opts = {}, rest = [];
  const num = { '--colors': 'colors', '--min-area': 'minArea', '--min-width': 'minWidth', '--size': 'size', '--smooth': 'smooth', '--merge-delta': 'mergeDelta' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (num[a]) opts[num[a]] = Number(argv[++i]);
    else if (a === '--id') opts.id = argv[++i];
    else if (a === '--title') opts.title = argv[++i];
    else if (a === '--category') opts.category = argv[++i];
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--preview') opts.preview = argv[++i];
    else if (a === '--no-index') opts.index = false;
    else if (a === '-h' || a === '--help') opts.help = true;
    else rest.push(a);
  }
  return { opts, rest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { opts, rest } = parseArgs(process.argv.slice(2));
  if (opts.help || rest.length !== 1) {
    const src = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
    console.log(src.split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
    process.exit(opts.help ? 0 : 1);
  }
  convert(rest[0], opts).catch((e) => { console.error(e); process.exit(1); });
}
