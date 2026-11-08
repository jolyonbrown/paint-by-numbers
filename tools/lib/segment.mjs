// Segmentation: speck smoothing, line-art outlines, connected sections, tiny-section merging, distance transform,
// number placement and outline tracing. Everything works on flat typed arrays (row-major).

/** Palette index used for outline pixels in line-art mode (never a real colour). */
export const LINE = 255;

/** 3x3 majority filter on a palette-index map. Removes specks and anti-aliasing fringes. */
export function modeFilter(index, w, h, passes = 2) {
  let src = index, dst = new Uint8Array(index.length);
  const counts = new Uint16Array(256);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const own = src[y * w + x];
        let best = own, bestCount = 0;
        const touched = [];
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= w) continue;
            const c = src[yy * w + xx];
            if (counts[c] === 0) touched.push(c);
            counts[c]++;
          }
        }
        bestCount = counts[own];
        for (const c of touched) { if (counts[c] > bestCount) { bestCount = counts[c]; best = c; } }
        // Only replace a pixel when a clear majority (5 of 9) disagrees with it.
        dst[y * w + x] = bestCount >= 5 ? best : own;
        for (const c of touched) counts[c] = 0;
      }
    }
    [src, dst] = [dst, src];
  }
  return src === index ? src.slice() : src;
}

/** 4-connected component labelling. Returns { labels: Int32Array, count, color: Int32Array (palette idx per label) }. */
export function components(index, w, h, barrier = -1) {
  const n = w * h;
  const labels = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  const color = [];
  let count = 0;
  for (let start = 0; start < n; start++) {
    if (labels[start] !== -1 || index[start] === barrier) continue;
    const c = index[start];
    let sp = 0;
    stack[sp++] = start; labels[start] = count;
    while (sp) {
      const p = stack[--sp];
      const x = p % w;
      if (x > 0 && labels[p - 1] === -1 && index[p - 1] === c) { labels[p - 1] = count; stack[sp++] = p - 1; }
      if (x < w - 1 && labels[p + 1] === -1 && index[p + 1] === c) { labels[p + 1] = count; stack[sp++] = p + 1; }
      if (p >= w && labels[p - w] === -1 && index[p - w] === c) { labels[p - w] = count; stack[sp++] = p - w; }
      if (p < n - w && labels[p + w] === -1 && index[p + w] === c) { labels[p + w] = count; stack[sp++] = p + w; }
    }
    color.push(c);
    count++;
  }
  return { labels, count, color: Int32Array.from(color) };
}

/**
 * Exact Euclidean distance (in pixels) from every pixel to the nearest section-boundary pixel
 * (a pixel with a differently-labelled 4-neighbour, or on the image edge).
 * Felzenszwalb & Huttenlocher's linear-time algorithm.
 */
export function boundaryDistance(labels, w, h) {
  const feature = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x, l = labels[p];
      feature[p] = x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
        labels[p - 1] !== l || labels[p + 1] !== l || labels[p - w] !== l || labels[p + w] !== l ? 1 : 0;
    }
  }
  return edt(feature, w, h);
}

/** Euclidean distance from every pixel to the nearest pixel where feature[p] is set. */
export function edt(feature, w, h) {
  const n = w * h, INF = 1e20;
  const f = new Float64Array(n);
  for (let p = 0; p < n; p++) f[p] = feature[p] ? 0 : INF;
  const maxLen = Math.max(w, h);
  const d = new Float64Array(maxLen), v = new Int32Array(maxLen), z = new Float64Array(maxLen + 1), col = new Float64Array(maxLen);
  const dt1 = (len) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s;
      while (true) {
        s = ((col[q] + q * q) - (col[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        if (s <= z[k]) { k--; if (k < 0) { k = 0; break; } } else break;
      }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) ** 2 + col[v[k]];
    }
  };
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) col[y] = f[y * w + x];
    dt1(h);
    for (let y = 0; y < h; y++) f[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) col[x] = f[y * w + x];
    dt1(w);
    for (let x = 0; x < w; x++) f[y * w + x] = d[x];
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sqrt(f[i]);
  return out;
}

/**
 * Repeatedly merge sections that are too small (area) or too thin (width) to tap into the
 * neighbour they share the longest border with. Mutates and returns the palette-index map.
 */
export function mergeTiny(index, w, h, { minArea, minWidth, labDist, log = () => {} }) {
  const n = w * h;
  const minRadius = Math.max(0, (minWidth - 1) / 2); // boundary-distance of the centre pixel of a minWidth-wide strip
  for (let pass = 0; pass < 12; pass++) {
    const { labels, count, color } = components(index, w, h);
    const dist = boundaryDistance(labels, w, h);
    const area = new Int32Array(count), thick = new Float32Array(count);
    for (let i = 0; i < n; i++) { area[labels[i]]++; if (dist[i] > thick[labels[i]]) thick[labels[i]] = dist[i]; }
    const small = [];
    for (let r = 0; r < count; r++) if (color[r] !== LINE && (area[r] < minArea || thick[r] < minRadius)) small.push(r);
    log(`  pass ${pass + 1}: ${count} sections, ${small.length} too small`);
    if (!small.length) return index;
    small.sort((a, b) => area[a] - area[b]);

    // Pixel lists per section (CSR).
    const start = new Int32Array(count + 1);
    for (let i = 0; i < n; i++) start[labels[i] + 1]++;
    for (let r = 0; r < count; r++) start[r + 1] += start[r];
    const fillPos = start.slice(0, count), pix = new Int32Array(n);
    for (let i = 0; i < n; i++) pix[fillPos[labels[i]]++] = i;

    const parent = Int32Array.from({ length: count }, (_, i) => i);
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const curArea = Int32Array.from(area);
    const nb = new Map();
    for (const r of small) {
      if (find(r) !== r) continue;
      if (curArea[r] >= minArea && thick[r] >= minRadius && curArea[r] !== area[r]) continue;
      nb.clear();
      for (let k = start[r]; k < start[r + 1]; k++) {
        const p = pix[k], x = p % w;
        const add = (q) => { const o = find(labels[q]); if (o !== r) nb.set(o, (nb.get(o) || 0) + 1); };
        if (x > 0) add(p - 1);
        if (x < w - 1) add(p + 1);
        if (p >= w) add(p - w);
        if (p < n - w) add(p + w);
      }
      let best = -1, bestScore = -Infinity;
      for (const [o, c] of nb) {
        // Prefer the longest shared border; break near-ties by colour similarity. Merging into an
        // outline is a last resort (it would make the speck disappear into the line).
        const score = color[o] === LINE ? c * 0.2 : c - 0.01 * labDist(color[r], color[o]);
        if (score > bestScore) { bestScore = score; best = o; }
      }
      if (best < 0) continue;
      parent[r] = best;
      curArea[best] += curArea[r];
    }
    for (let i = 0; i < n; i++) index[i] = color[find(labels[i])];
  }
  return index;
}

/**
 * Choose where numbers go. Each section gets its "pole" (the point furthest from its edges);
 * large sections get a few extra numbers spread out so one is usually in view when zoomed in.
 * Returns flat array [section, x, y, radius, ...] (x, y = pixel centre).
 */
export function placeLabels(labels, count, dist, w, h, { spacing = 260, minExtraRadius = 9, maxPerSection = 12 } = {}) {
  const n = w * h;
  const best = new Int32Array(count).fill(-1);
  for (let i = 0; i < n; i++) {
    const l = labels[i];
    if (best[l] < 0 || dist[i] > dist[best[l]]) best[l] = i;
  }
  const out = [];
  const perSection = Array.from({ length: count }, () => []);
  for (let s = 0; s < count; s++) {
    const p = best[s];
    perSection[s].push([p % w, (p / w) | 0]);
    out.push(s, p % w, (p / w) | 0, dist[p] + 0.5);
  }
  // Extra labels: local maxima of the distance field, greedily spaced apart.
  const cand = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x, d = dist[p];
      if (d < minExtraRadius) continue;
      if (d >= dist[p - 1] && d >= dist[p + 1] && d >= dist[p - w] && d >= dist[p + w] &&
          d >= dist[p - w - 1] && d >= dist[p - w + 1] && d >= dist[p + w - 1] && d >= dist[p + w + 1]) {
        cand.push(p);
      }
    }
  }
  cand.sort((a, b) => dist[b] - dist[a]);
  for (const p of cand) {
    const s = labels[p], list = perSection[s];
    if (list.length >= maxPerSection) continue;
    const x = p % w, y = (p / w) | 0;
    const sep = Math.max(spacing, dist[p] * 6);
    if (list.every(([lx, ly]) => (lx - x) ** 2 + (ly - y) ** 2 >= sep * sep)) {
      list.push([x, y]);
      out.push(s, x, y, dist[p] + 0.5);
    }
  }
  return out;
}

/**
 * Trace the borders between sections into polylines (shared by both neighbours, so no gaps),
 * smooth away the pixel staircase and simplify. Coordinates are in pixel units (corner lattice).
 */
export function traceOutlines(labels, w, h, { tolerance = 0.12 } = {}) {
  const W1 = w + 1;
  // hEdge[y*w+x]: edge from (x,y) to (x+1,y), between pixel (x,y-1) and (x,y).
  // vEdge[y*W1+x]: edge from (x,y) to (x,y+1), between pixel (x-1,y) and (x,y).
  const hEdge = new Uint8Array(w * (h + 1)), vEdge = new Uint8Array(W1 * h);
  const deg = new Uint8Array(W1 * (h + 1));
  for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) {
    if (labels[(y - 1) * w + x] !== labels[y * w + x]) { hEdge[y * w + x] = 1; deg[y * W1 + x]++; deg[y * W1 + x + 1]++; }
  }
  for (let y = 0; y < h; y++) for (let x = 1; x < w; x++) {
    if (labels[y * w + x - 1] !== labels[y * w + x]) { vEdge[y * W1 + x] = 1; deg[y * W1 + x]++; deg[(y + 1) * W1 + x]++; }
  }
  // Visit flags reuse the edge arrays: 1 = present & unvisited, 2 = visited.
  const nextEdge = (x, y) => {
    if (x < w && hEdge[y * w + x] === 1) { hEdge[y * w + x] = 2; return [x + 1, y]; }
    if (x > 0 && hEdge[y * w + x - 1] === 1) { hEdge[y * w + x - 1] = 2; return [x - 1, y]; }
    if (y < h && vEdge[y * W1 + x] === 1) { vEdge[y * W1 + x] = 2; return [x, y + 1]; }
    if (y > 0 && vEdge[(y - 1) * W1 + x] === 1) { vEdge[(y - 1) * W1 + x] = 2; return [x, y - 1]; }
    return null;
  };
  const chains = [];
  const walk = (sx, sy, closedOk) => {
    const pts = [sx, sy];
    let cur = nextEdge(sx, sy);
    if (!cur) return;
    // Which section lies on each side of the chain. "right" is the side reached by turning the
    // direction of travel 90 degrees clockwise on screen (y down); it stays the same along a chain.
    const dx = cur[0] - sx, dy = cur[1] - sy;
    let right, left;
    if (dx === 1) { right = labels[sy * w + sx]; left = labels[(sy - 1) * w + sx]; }
    else if (dx === -1) { right = labels[(sy - 1) * w + sx - 1]; left = labels[sy * w + sx - 1]; }
    else if (dy === 1) { right = labels[sy * w + sx - 1]; left = labels[sy * w + sx]; }
    else { right = labels[(sy - 1) * w + sx]; left = labels[(sy - 1) * w + sx - 1]; }
    let closed = false;
    while (cur) {
      pts.push(cur[0], cur[1]);
      if (deg[cur[1] * W1 + cur[0]] !== 2) break;
      if (closedOk && cur[0] === sx && cur[1] === sy) { closed = true; break; }
      cur = nextEdge(cur[0], cur[1]);
    }
    chains.push({ pts, closed, left, right });
  };
  for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) {
    const d = deg[y * W1 + x];
    if (d && d !== 2) { for (let k = 0; k < d; k++) walk(x, y, false); }
  }
  for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) {
    if (deg[y * W1 + x] === 2) { while (true) { const before = chains.length; walk(x, y, true); if (chains.length === before) break; } }
  }
  return chains.map((c) => ({ pts: smoothChain(c.pts, c.closed, tolerance), left: c.left, right: c.right }));
}

function smoothChain(pts, closed, tolerance) {
  const n = pts.length / 2;
  // Use edge midpoints: turns pixel staircases into straight diagonals.
  let xs = [], ys = [];
  if (!closed) { xs.push(pts[0]); ys.push(pts[1]); }
  for (let i = 0; i < n - 1; i++) {
    xs.push((pts[2 * i] + pts[2 * i + 2]) / 2);
    ys.push((pts[2 * i + 1] + pts[2 * i + 3]) / 2);
  }
  if (!closed) { xs.push(pts[2 * n - 2]); ys.push(pts[2 * n - 1]); }
  // Straighten the staircase: simplify generously (the true edge lies within half a pixel),
  // then round the remaining corners with Chaikin corner-cutting, then thin out the points.
  if (closed) { xs.push(xs[0]); ys.push(ys[0]); }
  let keep = douglasPeucker(xs, ys, 0.6);
  let px = [], py = [];
  for (let i = 0; i < xs.length; i++) if (keep[i]) { px.push(xs[i]); py.push(ys[i]); }
  for (let it = 0; it < 3; it++) {
    const m = px.length;
    if (m < 3) break;
    const nx = [], ny = [];
    if (!closed) { nx.push(px[0]); ny.push(py[0]); }
    for (let i = 0; i < m - 1; i++) {
      const ax = px[i], ay = py[i], bx = px[i + 1], by = py[i + 1];
      const first = !closed && i === 0, last = !closed && i === m - 2;
      // Cut corners by at most ~1px so long straight runs don't pull the line away from the edge.
      const t = Math.min(0.25, 1.0 / Math.max(1e-6, Math.hypot(bx - ax, by - ay)));
      if (!first) { nx.push(ax + t * (bx - ax)); ny.push(ay + t * (by - ay)); }
      if (!last) { nx.push(bx - t * (bx - ax)); ny.push(by - t * (by - ay)); }
    }
    if (!closed) { nx.push(px[m - 1]); ny.push(py[m - 1]); } else { nx.push(nx[0]); ny.push(ny[0]); }
    px = nx; py = ny;
  }
  keep = douglasPeucker(px, py, tolerance);
  const out = [];
  for (let i = 0; i < px.length; i++) if (keep[i]) out.push(px[i], py[i]);
  return out;
}

function douglasPeucker(xs, ys, tol) {
  const m = xs.length, keep = new Uint8Array(m);
  keep[0] = keep[m - 1] = 1;
  if (m <= 2) return keep;
  // Closed loops: also keep the point furthest from the start so the loop doesn't collapse.
  const stack = [];
  if (m > 3 && xs[0] === xs[m - 1] && ys[0] === ys[m - 1]) {
    let far = 1, fd = -1;
    for (let i = 1; i < m - 1; i++) { const d = (xs[i] - xs[0]) ** 2 + (ys[i] - ys[0]) ** 2; if (d > fd) { fd = d; far = i; } }
    keep[far] = 1; stack.push([0, far], [far, m - 1]);
  } else stack.push([0, m - 1]);
  const t2 = tol * tol;
  while (stack.length) {
    const [a, b] = stack.pop();
    const ax = xs[a], ay = ys[a], dx = xs[b] - ax, dy = ys[b] - ay, len2 = dx * dx + dy * dy;
    let worst = -1, wd = t2;
    for (let i = a + 1; i < b; i++) {
      let d;
      if (len2 === 0) d = (xs[i] - ax) ** 2 + (ys[i] - ay) ** 2;
      else { const c = dx * (ys[i] - ay) - dy * (xs[i] - ax); d = (c * c) / len2; }
      if (d > wd) { wd = d; worst = i; }
    }
    if (worst >= 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]); }
  }
  return keep;
}

/**
 * Redraw the section map from the smoothed outlines, so the colour layer agrees exactly with
 * the lines drawn on screen: every pixel takes the section on its side of the nearest line.
 * `chains` are { pts (in quarter pixels, integers), left, right }. Sections that would end up with
 * no pixels keep their original pixels. Returns a new Int32Array of labels.
 */
export function rasterizeOutlines(chains, w, h, labels, count) {
  const rows = Array.from({ length: h }, () => []);
  for (const { pts, left, right } of chains) {
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const x1 = pts[i], y1 = pts[i + 1], x2 = pts[i + 2], y2 = pts[i + 3];
      if (y1 === y2) continue;
      const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
      // Pixel-centre rows (in quarter units: 4y + 2) with lo <= centre < hi.
      let y = Math.max(0, Math.ceil((lo - 2) / 4));
      for (; y < h && 4 * y + 2 < hi; y++) {
        const yc = 4 * y + 2;
        if (yc < lo) continue;
        const x = x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1);
        // Going up the screen, the "right" side is the +x side.
        rows[y].push(x, y2 < y1 ? right : left, y2 < y1 ? left : right);
      }
    }
  }
  const out = new Int32Array(w * h);
  for (let y = 0; y < h; y++) {
    const r = rows[y], n = r.length / 3;
    const base = y * w;
    if (!n) { for (let x = 0; x < w; x++) out[base + x] = labels[base + x]; continue; }
    const order = Array.from({ length: n }, (_, k) => k).sort((a, b) => r[a * 3] - r[b * 3]);
    // Walk the spans between consecutive crossings. Each span has two candidate sections: the
    // one on the near side of the crossing before it and the one on the near side of the
    // crossing after it. Normally they agree; where two smoothed lines run very close and swap
    // order they don't, and the original pixels decide.
    let x = 0;
    for (let k = 0; k <= n; k++) {
      // pixels x .. end-1 have centres (4x+2, in quarter pixels) strictly before crossing k
      const end = k < n ? Math.min(w, Math.max(x, Math.ceil((r[order[k] * 3] - 2) / 4))) : w;
      const a = k > 0 ? r[order[k - 1] * 3 + 1] : r[order[0] * 3 + 2];
      const b = k < n ? r[order[k] * 3 + 2] : a;
      let pick = a;
      if (end > x) {
        // Count the original labels in the span. Normally the bounding lines' side (a or b) is
        // what's there; if something else clearly dominates, a crossing was inconsistent.
        let ca = 0, cb = 0, cm = 0, m = -1;
        for (let xx = x; xx < end; xx++) {
          const l = labels[base + xx];
          if (l === a) ca++; else if (l === b) cb++;
          else if (l === m) cm++; else if (cm === 0) { m = l; cm = 1; } else cm--; // majority vote
        }
        if (cb > ca) pick = b;
        if (m >= 0 && cm > 0) {
          let cnt = 0;
          for (let xx = x; xx < end; xx++) if (labels[base + xx] === m) cnt++;
          if (cnt >= 3 && cnt > 2 * Math.max(ca, cb)) pick = m;
        }
      }
      for (; x < end; x++) out[base + x] = pick;
    }
  }
  const area = new Int32Array(count);
  for (let i = 0; i < out.length; i++) area[out[i]]++;
  let restored = 0;
  for (let i = 0; i < labels.length; i++) if (area[labels[i]] === 0) { out[i] = labels[i]; restored++; }
  return { labels: out, restored };
}

/**
 * Line-art mode: find thin dark outlines. A pixel is an outline if its colour is dark and it is
 * part of a stroke no wider than maxWidth; wider dark areas (a hat, an eye) stay colourable.
 * Returns { mask, width } where width is the typical stroke width in pixels.
 */
export function findLines(index, w, h, isDark, maxWidth) {
  const n = w * h;
  const notDark = new Uint8Array(n);
  for (let p = 0; p < n; p++) notDark[p] = isDark[index[p]] ? 0 : 1;
  const inside = edt(notDark, w, h); // distance from a dark pixel to the nearest non-dark one
  const half = maxWidth / 2;
  const core = new Uint8Array(n);
  let anyCore = false;
  for (let p = 0; p < n; p++) if (!notDark[p] && inside[p] > half + 0.5) { core[p] = 1; anyCore = true; }
  const fromCore = anyCore ? edt(core, w, h) : null;
  const mask = new Uint8Array(n);
  const widths = [];
  for (let p = 0; p < n; p++) {
    if (notDark[p]) continue;
    if (fromCore && fromCore[p] <= half + 1) continue; // part of a thick dark area
    mask[p] = 1;
    // Ridge pixels (local maxima across the stroke) tell us the stroke's width.
    const x = p % w;
    if (x > 0 && x < w - 1 && p >= w && p < n - w) {
      const d = inside[p];
      if (d >= inside[p - 1] && d >= inside[p + 1] && d >= inside[p - w] && d >= inside[p + w]) widths.push(2 * d - 1);
    }
  }
  widths.sort((a, b) => a - b);
  const width = widths.length ? widths[Math.floor(widths.length * 0.7)] : 0; // 70th percentile: bold strokes win over tiny ones
  return { mask, width };
}

/** Give every outline pixel (label -1) to the nearest section, splitting each line down its middle. */
export function absorbLines(labels, w, h) {
  const n = w * h;
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (let p = 0; p < n; p++) if (labels[p] >= 0) queue[tail++] = p;
  while (head < tail) {
    const p = queue[head++], l = labels[p], x = p % w;
    if (x > 0 && labels[p - 1] < 0) { labels[p - 1] = l; queue[tail++] = p - 1; }
    if (x < w - 1 && labels[p + 1] < 0) { labels[p + 1] = l; queue[tail++] = p + 1; }
    if (p >= w && labels[p - w] < 0) { labels[p - w] = l; queue[tail++] = p - w; }
    if (p < n - w && labels[p + w] < 0) { labels[p + w] = l; queue[tail++] = p + w; }
  }
  for (let p = 0; p < n; p++) if (labels[p] < 0) labels[p] = 0;
  return labels;
}
