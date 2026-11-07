// Image loading, saving and resampling for the picture tools (pure JS, no native deps).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

/** Load a PNG or JPG into { width, height, data: Uint8Array RGBA }, with transparency composited onto white. */
export function loadImage(file) {
  const buf = fs.readFileSync(file);
  let img;
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png' || buf.slice(1, 4).toString() === 'PNG') {
    const png = PNG.sync.read(buf);
    img = { width: png.width, height: png.height, data: new Uint8Array(png.data) };
  } else if (ext === '.jpg' || ext === '.jpeg' || (buf[0] === 0xff && buf[1] === 0xd8)) {
    const j = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 2048 });
    img = { width: j.width, height: j.height, data: new Uint8Array(j.data) };
  } else {
    throw new Error(`Unsupported image type: ${file} (use PNG or JPG)`);
  }
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a !== 255) {
      const f = a / 255;
      d[i] = Math.round(d[i] * f + 255 * (1 - f));
      d[i + 1] = Math.round(d[i + 1] * f + 255 * (1 - f));
      d[i + 2] = Math.round(d[i + 2] * f + 255 * (1 - f));
      d[i + 3] = 255;
    }
  }
  return img;
}

export function savePNG(file, width, height, rgba) {
  const png = new PNG({ width, height });
  png.data = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  fs.writeFileSync(file, PNG.sync.write(png, { colorType: 6 }));
}

/** Separable tent-filter resample (good for both up- and down-scaling). RGB only; alpha set to 255. */
export function resize(img, outW, outH) {
  if (outW === img.width && outH === img.height) return img;
  const tmp = resample1D(img.data, img.width, img.height, outW, true);
  const out = resample1D(tmp, outW, img.height, outH, false);
  return { width: outW, height: outH, data: out };
}

function weightsFor(inSize, outSize) {
  const scale = inSize / outSize;
  const support = Math.max(1, scale); // tent radius in source pixels
  const list = [];
  for (let o = 0; o < outSize; o++) {
    const center = (o + 0.5) * scale - 0.5;
    const lo = Math.max(0, Math.floor(center - support));
    const hi = Math.min(inSize - 1, Math.ceil(center + support));
    const idx = [], w = [];
    let sum = 0;
    for (let i = lo; i <= hi; i++) {
      const wt = Math.max(0, 1 - Math.abs(i - center) / support);
      if (wt > 0) { idx.push(i); w.push(wt); sum += wt; }
    }
    if (!idx.length) { idx.push(Math.min(inSize - 1, Math.max(0, Math.round(center)))); w.push(1); sum = 1; }
    list.push({ idx, w: w.map((x) => x / sum) });
  }
  return list;
}

function resample1D(src, w, h, outLen, horizontal) {
  const outW = horizontal ? outLen : w;
  const outH = horizontal ? h : outLen;
  const out = new Uint8Array(outW * outH * 4);
  const ws = weightsFor(horizontal ? w : h, outLen);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const { idx, w: wt } = ws[horizontal ? x : y];
      let r = 0, g = 0, b = 0;
      for (let k = 0; k < idx.length; k++) {
        const si = horizontal ? (y * w + idx[k]) * 4 : (idx[k] * w + x) * 4;
        r += src[si] * wt[k]; g += src[si + 1] * wt[k]; b += src[si + 2] * wt[k];
      }
      const o = (y * outW + x) * 4;
      out[o] = r + 0.5; out[o + 1] = g + 0.5; out[o + 2] = b + 0.5; out[o + 3] = 255;
    }
  }
  return out;
}
