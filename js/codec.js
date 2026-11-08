// Decoding for puzzle files written by tools/convert.mjs (base64 + LEB128 varints).

export function fromBase64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function toBase64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

class Reader {
  constructor(bytes) { this.b = bytes; this.i = 0; }
  u() {
    let v = 0, mul = 1, byte;
    do { byte = this.b[this.i++]; v += (byte & 0x7f) * mul; mul *= 128; } while (byte & 0x80);
    return v;
  }
  s() { const v = this.u(); return v % 2 ? -(v + 1) / 2 : v / 2; }
}

/** Run-length section map -> Uint16Array (or Uint32Array) of section ids, row-major. */
export function decodeMap(b64, length, sections) {
  const r = new Reader(fromBase64(b64));
  const out = sections > 65535 ? new Uint32Array(length) : new Uint16Array(length);
  let p = 0;
  while (p < length) {
    const id = r.u(), run = r.u() + 1;
    out.fill(id, p, p + run);
    p += run;
  }
  return out;
}

export const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Full puzzle: section map, per-section info, number positions and outline polylines. */
export function decodePuzzle(json) {
  const W = json.width, H = json.height, S = json.sections;
  const map = decodeMap(json.map, W * H, S);
  const sectionColor = fromBase64(json.sectionColor);
  const palette = json.palette.map(hexToRgb);

  // Per-section bounding boxes and pixel counts.
  const bbox = new Int32Array(S * 4);
  for (let s = 0; s < S; s++) { bbox[s * 4] = W; bbox[s * 4 + 1] = H; bbox[s * 4 + 2] = -1; bbox[s * 4 + 3] = -1; }
  const area = new Uint32Array(S);
  for (let y = 0, p = 0; y < H; y++) {
    for (let x = 0; x < W; x++, p++) {
      const s = map[p], b = s * 4;
      area[s]++;
      if (x < bbox[b]) bbox[b] = x;
      if (x > bbox[b + 2]) bbox[b + 2] = x;
      if (y < bbox[b + 1]) bbox[b + 1] = y;
      if (y > bbox[b + 3]) bbox[b + 3] = y;
    }
  }

  // Numbers: [section, x, y, radius]; the first label of each section is its best spot.
  const lr = new Reader(fromBase64(json.labels));
  const nl = lr.u();
  const labels = { section: new Uint32Array(nl), x: new Float32Array(nl), y: new Float32Array(nl), r: new Float32Array(nl) };
  const pole = new Int32Array(S).fill(-1);
  for (let i = 0; i < nl; i++) {
    const s = lr.u();
    labels.section[i] = s;
    labels.x[i] = lr.u() + 0.5;
    labels.y[i] = lr.u() + 0.5;
    labels.r[i] = lr.u() / 4;
    if (pole[s] < 0) pole[s] = i;
  }

  // Outlines (polylines) and the optional ink layer (closed shapes), in pixel units.
  const readChains = (b64) => {
    const cr = new Reader(fromBase64(b64));
    const nc = cr.u(), out = [];
    let px = 0, py = 0;
    for (let c = 0; c < nc; c++) {
      const n = cr.u();
      const pts = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        px += cr.s(); py += cr.s();
        pts[i * 2] = px / 4; pts[i * 2 + 1] = py / 4;
      }
      out.push(pts);
    }
    return out;
  };
  const chains = readChains(json.lines);
  const ink = json.ink ? readChains(json.ink) : [];

  // Sections per colour.
  const colorSections = palette.map(() => []);
  for (let s = 0; s < S; s++) colorSections[sectionColor[s]].push(s);

  return { id: json.id, title: json.title, hash: json.hash, lineWidth: json.lineWidth || 1.6, W, H, S, map, sectionColor, palette, paletteHex: json.palette, bbox, area, labels, pole, chains, ink, colorSections };
}
