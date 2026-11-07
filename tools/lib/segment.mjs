// Segmentation: speck smoothing, connected sections, tiny-section merging, distance transform,
// number placement and outline tracing. Everything works on flat typed arrays (row-major).

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
export function components(index, w, h) {
  const n = w * h;
  const labels = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  const color = [];
  let count = 0;
  for (let start = 0; start < n; start++) {
    if (labels[start] !== -1) continue;
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
  const n = w * h, INF = 1e20;
  const f = new Float64Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x, l = labels[p];
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
        labels[p - 1] !== l || labels[p + 1] !== l || labels[p - w] !== l || labels[p + w] !== l;
      f[p] = edge ? 0 : INF;
    }
  }
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
    for (let r = 0; r < count; r++) if (area[r] < minArea || thick[r] < minRadius) small.push(r);
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
        // Prefer the longest shared border; break near-ties by colour similarity.
        const score = c - 0.01 * labDist(color[r], color[o]);
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
    let closed = false;
    while (cur) {
      pts.push(cur[0], cur[1]);
      if (deg[cur[1] * W1 + cur[0]] !== 2) break;
      if (closedOk && cur[0] === sx && cur[1] === sy) { closed = true; break; }
      cur = nextEdge(cur[0], cur[1]);
    }
    chains.push({ pts, closed });
  };
  for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) {
    const d = deg[y * W1 + x];
    if (d && d !== 2) { for (let k = 0; k < d; k++) walk(x, y, false); }
  }
  for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) {
    if (deg[y * W1 + x] === 2) { while (true) { const before = chains.length; walk(x, y, true); if (chains.length === before) break; } }
  }
  return chains.map((c) => smoothChain(c.pts, c.closed, tolerance));
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
      if (!first) { nx.push(0.75 * ax + 0.25 * bx); ny.push(0.75 * ay + 0.25 * by); }
      if (!last) { nx.push(0.25 * ax + 0.75 * bx); ny.push(0.25 * ay + 0.75 * by); }
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
