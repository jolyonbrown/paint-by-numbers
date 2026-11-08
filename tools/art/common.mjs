// Small helpers for the hand-made placeholder pictures (flat-colour SVG, 750 x 1000 portrait).
export const W = 750, H = 1000;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => +n.toFixed(1);

export const INK = '#2b2421';

/**
 * Wrap shapes in an SVG document. With outline (the default) every shape gets a dark ink stroke,
 * like a colouring book; convert these with lineArt so the strokes become the puzzle's borders.
 * Very small shapes (snow dots, tiny stars) are left unstroked so they don't vanish into ink.
 */
export function svg(body, bg = '#ffffff', { outline = true, ink = INK, width = 1.7 } = {}) {
  if (outline) body = markSmall(body);
  const style = outline
    ? `<style>path:not([fill="none"]):not(.ns),rect:not(.ns),circle:not(.ns),ellipse:not(.ns),polygon:not(.ns){stroke:${ink};stroke-width:${width};stroke-linejoin:round}</style>\n`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n${style}<rect width="${W}" height="${H}" fill="${bg}" class="ns"/>\n${body}\n</svg>\n`;
}

function markSmall(body, min = 13) {
  const num = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([-\\d.]+)"`)); return m ? +m[1] : null; };
  return body.replace(/<(circle|ellipse|rect|polygon)\b[^>]*>/g, (tag, kind) => {
    let size = Infinity;
    if (kind === 'circle') size = 2 * num(tag, 'r');
    else if (kind === 'ellipse') size = 2 * Math.min(num(tag, 'rx'), num(tag, 'ry'));
    else if (kind === 'rect') size = Math.min(num(tag, 'width'), num(tag, 'height'));
    else {
      const pts = (tag.match(/points="([^"]+)"/) || [, ''])[1].trim().split(/\s+/).map((p) => p.split(',').map(Number));
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      size = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    }
    return size < min ? tag.replace(/^<(\w+)/, '<$1 class="ns"') : tag;
  });
}

export const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" ${extra}/>`;
export const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
export const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${extra}/>`;
export const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
export const poly = (pts, fill, extra = '') => `<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${fill}" ${extra}/>`;
export const g = (body, transform = '') => `<g${transform ? ` transform="${transform}"` : ''}>${Array.isArray(body) ? body.join('\n') : body}</g>`;

/** Closed smooth blob through points (Catmull-Rom -> cubic Bezier). */
export function smoothPath(pts, closed = true) {
  const n = pts.length;
  const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

/** A wavy horizontal band edge from x0 to x1 around y, returning points. */
export function wave(x0, x1, y, amp, steps, rand, phase = 0) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    pts.push([x, y + Math.sin(i * 1.3 + phase) * amp * 0.6 + (rand() - 0.5) * amp]);
  }
  return pts;
}

/** Filled shape below a wavy line down to yBottom. */
export function band(x0, x1, y, amp, steps, yBottom, fill, rand, phase = 0) {
  const top = wave(x0, x1, y, amp, steps, rand, phase);
  const d = smoothPath(top, false) + `L${x1},${yBottom}L${x0},${yBottom}Z`;
  return path(d, fill);
}

export function star(cx, cy, r, points, fill, inner = 0.45, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = rot + (i * Math.PI) / points;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return poly(pts, fill);
}

/** A stylised pine: stacked tiers with optional snow on each tier. */
export function pine(cx, base, height, width, colors, rand, { tiers = 4, snow = null, trunk = null } = {}) {
  const out = [];
  if (trunk) out.push(rect(cx - width * 0.07, base - height * 0.06, width * 0.14, height * 0.1, trunk));
  const tierH = (height * 0.95) / tiers;
  for (let t = 0; t < tiers; t++) {
    const yb = base - height * 0.05 - t * tierH * 0.78;
    const w = width * (1 - t / (tiers + 0.6)) * 0.5;
    const top = yb - tierH * 1.25;
    const col = colors[t % colors.length];
    const jag = 6;
    const pts = [[cx, top], [cx + w, yb]];
    for (let i = 1; i < jag; i++) pts.push([cx + w - (2 * w * i) / jag, yb - (i % 2 ? tierH * 0.12 : 0) + (rand() - 0.5) * 2]);
    pts.push([cx - w, yb]);
    out.push(poly(pts, col));
    if (snow) {
      const sw = w * 0.85;
      const sy = yb - tierH * 0.42;
      const s = [[cx - sw * 0.55, sy + tierH * 0.12], [cx - sw * 0.2, sy - tierH * 0.05], [cx, sy - tierH * 0.35], [cx + sw * 0.25, sy - tierH * 0.02], [cx + sw * 0.6, sy + tierH * 0.15], [cx + sw * 0.2, sy + tierH * 0.1], [cx - sw * 0.15, sy + tierH * 0.16]];
      out.push(path(smoothPath(s), snow));
    }
  }
  return out.join('\n');
}
