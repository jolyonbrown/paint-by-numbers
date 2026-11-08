// Photo mode: the extra steps that make photos, paintings and soft AI images convert into clean,
// tappable puzzles instead of speckled confetti. Pure JS, no extra dependencies.
//
//   1. bilateral()        edge-preserving smoothing before colours are reduced (flattens texture and
//                         gradients but keeps real edges)
//   2. gaussMajority()    replaces the 3x3 majority filter: each pixel takes the colour with the
//                         largest Gaussian-weighted share around it, which rounds off ragged borders
//   3. contrastMerge()    a section must be bigger the less it differs from its most similar
//                         neighbour; faint bands and blotches merge away, strong details survive
import { components } from './segment.mjs';
import { dist2 } from './color.mjs';

/** One pass of a bilateral filter on RGBA data. radius r, spatial sigma ss, range sigma sr (RGB units). */
export function bilateral(data, W, H, { r = 4, ss = 4, sr = 25 } = {}) {
  const offs = [], sw = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r) continue;
    offs.push(dx, dy); sw.push(Math.exp(-(dx * dx + dy * dy) / (2 * ss * ss)));
  }
  const rl = new Float32Array(3 * 255 * 255 + 1);
  for (let i = 0; i < rl.length; i++) rl[i] = Math.exp(-i / (2 * sr * sr));
  const o = new Uint8Array(data.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = (y * W + x) * 4, R = data[p], G = data[p + 1], B = data[p + 2];
    let wr = 0, wg = 0, wb = 0, ws = 0;
    for (let k = 0; k < sw.length; k++) {
      let xx = x + offs[2 * k], yy = y + offs[2 * k + 1];
      if (xx < 0) xx = -xx; else if (xx >= W) xx = 2 * W - 2 - xx;
      if (yy < 0) yy = -yy; else if (yy >= H) yy = 2 * H - 2 - yy;
      const q = (yy * W + xx) * 4, r2 = data[q], g2 = data[q + 1], b2 = data[q + 2];
      const wt = sw[k] * rl[(r2 - R) * (r2 - R) + (g2 - G) * (g2 - G) + (b2 - B) * (b2 - B)];
      wr += wt * r2; wg += wt * g2; wb += wt * b2; ws += wt;
    }
    o[p] = wr / ws + 0.5; o[p + 1] = wg / ws + 0.5; o[p + 2] = wb / ws + 0.5; o[p + 3] = 255;
  }
  return o;
}

/**
 * Gaussian-weighted majority vote on a palette-index map: each pixel takes the colour with the
 * highest blurred share around it (three box blurs approximate a Gaussian of the given sigma).
 * Exact integer running sums, one colour at a time.
 */
export function gaussMajority(index, W, H, sigma = 3) {
  const N = W * H;
  const bw = Math.max(1, Math.round((Math.sqrt(4 * sigma * sigma + 1) - 1) / 2));
  const a = new Uint32Array(N), b = new Uint32Array(N);
  const best = new Uint32Array(N), out = index.slice();
  const boxH = (s, d) => {
    for (let y = 0; y < H; y++) {
      const o = y * W; let acc = 0;
      for (let x = -bw; x < bw; x++) acc += s[o + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) { acc += s[o + Math.min(W - 1, x + bw)]; d[o + x] = acc; acc -= s[o + Math.max(0, x - bw)]; }
    }
  };
  const boxV = (s, d) => {
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let y = -bw; y < bw; y++) acc += s[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) { acc += s[Math.min(H - 1, y + bw) * W + x]; d[y * W + x] = acc; acc -= s[Math.max(0, y - bw) * W + x]; }
    }
  };
  for (const c of new Set(index)) {
    for (let i = 0; i < N; i++) a[i] = index[i] === c ? 1 : 0;
    boxH(a, b); boxH(b, a); boxH(a, b); boxV(b, a); boxV(a, b); boxV(b, a);
    for (let i = 0; i < N; i++) if (a[i] > best[i]) { best[i] = a[i]; out[i] = c; }
  }
  return out;
}

/**
 * Contrast-aware merge. A section needs at least minArea * clamp((ref / dE)^2, 1, 8) pixels, where
 * dE is the colour difference to its most similar neighbour; smaller ones take that neighbour's
 * colour. Mutates and returns the index map.
 */
export function contrastMerge(index, W, H, labs, { minArea = 100, ref = 12, log = () => {} } = {}) {
  const N = W * H;
  for (let pass = 0; pass < 6; pass++) {
    const { labels, count, color } = components(index, W, H);
    const area = new Int32Array(count);
    for (let i = 0; i < N; i++) area[labels[i]]++;
    const nb = Array.from({ length: count }, () => new Map());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x, l = labels[p];
      if (x < W - 1 && labels[p + 1] !== l) { const m = labels[p + 1]; nb[l].set(m, (nb[l].get(m) || 0) + 1); nb[m].set(l, (nb[m].get(l) || 0) + 1); }
      if (y < H - 1 && labels[p + W] !== l) { const m = labels[p + W]; nb[l].set(m, (nb[l].get(m) || 0) + 1); nb[m].set(l, (nb[m].get(l) || 0) + 1); }
    }
    const order = Array.from({ length: count }, (_, i) => i).sort((p, q) => area[p] - area[q]);
    const newColor = Int32Array.from(color), done = new Uint8Array(count);
    let merged = 0;
    for (const r of order) {
      let best = -1, bd = Infinity;
      for (const [m, len] of nb[r]) {
        if (len < 3) continue;
        const d = Math.sqrt(dist2(labs[newColor[r]], labs[newColor[m]]));
        if (d < bd) { bd = d; best = m; }
      }
      if (best < 0 || done[best]) continue;
      const need = minArea * Math.min(8, Math.max(1, (ref / Math.max(bd, 1e-3)) ** 2));
      if (area[r] < need) { newColor[r] = newColor[best]; done[r] = 1; merged++; }
    }
    for (let i = 0; i < N; i++) index[i] = newColor[labels[i]];
    log(`  contrast pass ${pass + 1}: ${count} sections, merged ${merged}`);
    if (!merged) break;
  }
  return index;
}
