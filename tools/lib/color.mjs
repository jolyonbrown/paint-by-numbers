// Colour helpers: sRGB <-> CIE Lab, and palette quantisation with weighted k-means in Lab space.

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const LIN = new Float64Array(256).map((_, i) => lin(i));
const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

export function rgbToLab(r, g, b) {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labToRgb(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
  const x = inv(fx) * 0.95047, y = inv(fy), z = inv(fz) * 1.08883;
  const rl = x * 3.2404542 - y * 1.5371385 - z * 0.4985314;
  const gl = -x * 0.9692660 + y * 1.8760108 + z * 0.0415560;
  const bl = x * 0.0556434 - y * 0.2040259 + z * 1.0572252;
  const g = (c) => {
    c = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(c * 255)));
  };
  return [g(rl), g(gl), g(bl)];
}

export const dist2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;

export const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

/**
 * Quantise an RGBA image to at most k colours.
 * Returns { palette: [[r,g,b]...], index: Uint8Array (palette index per pixel) }.
 */
export function quantize(img, k, { seed = 1 } = {}) {
  const { data, width, height } = img;
  const n = width * height;
  // Histogram on 6-bit-per-channel bins: plenty of precision, and k-means runs on bins instead of pixels.
  const BITS = 6, SHIFT = 8 - BITS, SIZE = 1 << BITS;
  const binOf = new Uint32Array(n);
  const counts = new Map();
  for (let i = 0; i < n; i++) {
    const b = ((data[i * 4] >> SHIFT) << (2 * BITS)) | ((data[i * 4 + 1] >> SHIFT) << BITS) | (data[i * 4 + 2] >> SHIFT);
    binOf[i] = b;
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  const bins = [...counts.keys()];
  const weights = bins.map((b) => counts.get(b));
  const labs = bins.map((b) => {
    const r = ((b >> (2 * BITS)) & (SIZE - 1)) << SHIFT | (1 << (SHIFT - 1));
    const g = ((b >> BITS) & (SIZE - 1)) << SHIFT | (1 << (SHIFT - 1));
    const bl = (b & (SIZE - 1)) << SHIFT | (1 << (SHIFT - 1));
    return rgbToLab(r, g, bl);
  });
  k = Math.min(k, bins.length);

  // Deterministic PRNG so the same input always gives the same puzzle.
  let s = seed >>> 0 || 1;
  const rand = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };

  // k-means++ initialisation (weighted).
  const centers = [];
  let bestIdx = 0;
  for (let i = 1; i < bins.length; i++) if (weights[i] > weights[bestIdx]) bestIdx = i;
  centers.push(labs[bestIdx].slice());
  const d2 = labs.map((l) => dist2(l, centers[0]));
  while (centers.length < k) {
    let total = 0;
    for (let i = 0; i < bins.length; i++) total += d2[i] * weights[i];
    if (total === 0) break;
    let r = rand() * total, pick = 0;
    for (let i = 0; i < bins.length; i++) { r -= d2[i] * weights[i]; if (r <= 0) { pick = i; break; } }
    centers.push(labs[pick].slice());
    for (let i = 0; i < bins.length; i++) d2[i] = Math.min(d2[i], dist2(labs[i], centers[centers.length - 1]));
  }

  // Lloyd iterations.
  const assign = new Int32Array(bins.length);
  for (let iter = 0; iter < 30; iter++) {
    let moved = 0;
    for (let i = 0; i < bins.length; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const dd = dist2(labs[i], centers[c]);
        if (dd < bd) { bd = dd; best = c; }
      }
      if (assign[i] !== best) moved++;
      assign[i] = best;
    }
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < bins.length; i++) {
      const sc = sum[assign[i]], w = weights[i], l = labs[i];
      sc[0] += l[0] * w; sc[1] += l[1] * w; sc[2] += l[2] * w; sc[3] += w;
    }
    for (let c = 0; c < centers.length; c++) {
      if (sum[c][3] > 0) centers[c] = [sum[c][0] / sum[c][3], sum[c][1] / sum[c][3], sum[c][2] / sum[c][3]];
    }
    if (iter > 0 && moved === 0) break;
  }

  // Map pixels -> centre via their bin.
  const binToCenter = new Map();
  bins.forEach((b, i) => binToCenter.set(b, assign[i]));
  const index = new Uint8Array(n);
  for (let i = 0; i < n; i++) index[i] = binToCenter.get(binOf[i]);

  // Final palette colour = mean of the actual pixels assigned (so flat colours come out exact).
  const acc = centers.map(() => [0, 0, 0, 0]);
  for (let i = 0; i < n; i++) {
    const a = acc[index[i]];
    a[0] += data[i * 4]; a[1] += data[i * 4 + 1]; a[2] += data[i * 4 + 2]; a[3]++;
  }
  const palette = acc.map((a, c) => (a[3] ? [Math.round(a[0] / a[3]), Math.round(a[1] / a[3]), Math.round(a[2] / a[3])] : labToRgb(...centers[c])));
  return { palette, index };
}
