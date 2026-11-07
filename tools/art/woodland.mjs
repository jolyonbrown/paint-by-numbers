// An autumn woodland path: golden canopy, falling leaves, mushrooms and a hedgehog.
import { svg, rect, circle, ellipse, path, poly, g, smoothPath, star, rng, W, H } from './common.mjs';

const leaf = (x, y, len, wid, ang, fill) =>
  path(`M0,${-len / 2} Q${wid},0 0,${len / 2} Q${-wid},0 0,${-len / 2}Z`, fill, `transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(0)})"`);

export default function woodland() {
  const R = rng(5);
  const C = {
    sky: '#f6e6c2', sun: '#fbd27a', haze: '#efc995', far1: '#d9a066', far2: '#c78452',
    trunk: '#5e4030', trunkL: '#7c573f', trunkD: '#3f2a20',
    ground: '#b8572a', groundL: '#d2783a', groundD: '#8e3f1f', path: '#e7c592', pathD: '#d4a96f',
    l1: '#e8912f', l2: '#d25b2a', l3: '#f2c045', l4: '#a8361f', l5: '#9aa046',
    cap: '#c7372b', dot: '#f8efe0', stem: '#efe2c8', hog: '#6b4b35', hogL: '#a07a55', face: '#ecd2a8', nose: '#2a1f1a',
    fern: '#b5652a',
  };
  const o = [rect(0, 0, W, H, C.sky)];
  o.push(circle(560, 250, 70, C.haze), circle(560, 250, 48, C.sun));
  // Distant tree line.
  for (let i = 0; i < 16; i++) o.push(circle(i * 52 - 10, 470 + R() * 40, 50 + R() * 30, i % 2 ? C.far1 : C.far2));
  o.push(rect(0, 520, W, 120, C.far2));
  // Ground.
  o.push(rect(0, 560, W, H - 560, C.ground));
  o.push(path(smoothPath([[-20, 640], [200, 610], [420, 650], [600, 620], [780, 640], [780, 700], [-20, 700]]), C.groundL));
  // Winding path.
  o.push(path(smoothPath([[330, 580], [400, 580], [430, 650], [520, 760], [560, 880], [600, 1010], [180, 1010], [300, 880], [340, 760], [310, 650]]), C.path));
  o.push(path(smoothPath([[350, 600], [390, 600], [410, 660], [480, 760], [500, 840], [430, 760], [360, 660]]), C.pathD));

  // Trees: trunks with bark strips and a couple of branches.
  const trees = [[90, 70, 1000], [250, 44, 640], [520, 40, 660], [660, 80, 1010], [430, 28, 600], [20, 30, 640]];
  for (const [x, w, base] of trees) {
    o.push(poly([[x - w / 2, base], [x - w * 0.32, 0], [x + w * 0.32, 0], [x + w / 2, base]], C.trunk));
    for (let k = 0; k < 4; k++) {
      const bx = x - w * 0.25 + k * w * 0.16;
      o.push(poly([[bx, base - 10], [bx + w * 0.02, 120 + R() * 60], [bx + w * 0.06, 140 + R() * 80], [bx + w * 0.07, base - 30]], k % 2 ? C.trunkD : C.trunkL));
    }
    o.push(poly([[x, 260], [x + w * 1.6, 150], [x + w * 1.65, 162], [x + 4, 285]], C.trunk));
    o.push(poly([[x, 330], [x - w * 1.4, 230], [x - w * 1.45, 242], [x - 4, 352]], C.trunk));
  }
  // Canopy: overlapping clusters of round leaf masses.
  const cols = [C.l1, C.l2, C.l3, C.l4, C.l1, C.l3];
  for (let i = 0; i < 70; i++) {
    const x = R() * W, y = R() * 300 - 20;
    if (Math.hypot(x - 560, y - 250) < 90) continue;
    o.push(circle(x, y, 34 + R() * 40, cols[i % cols.length]));
  }
  // Leaf detail on the canopy edge.
  for (let i = 0; i < 60; i++) {
    const x = R() * W, y = 220 + R() * 140;
    if (Math.hypot(x - 560, y - 250) < 90) continue;
    o.push(leaf(x, y, 30, 15, R() * 360, cols[(i + 2) % cols.length]));
  }
  // Leaves on the ground (avoid the path a little).
  for (let i = 0; i < 160; i++) {
    const y = 600 + R() * 400, x = R() * W;
    const pathMid = 330 + (y - 580) * 0.55, inPath = Math.abs(x - pathMid) < 50 + (y - 580) * 0.35;
    if (inPath && R() < 0.75) continue;
    const s = 0.7 + (y - 600) / 400;
    if (R() < 0.3) o.push(star(x, y, 13 * s, 5, cols[i % cols.length], 0.55, R() * 6));
    else o.push(leaf(x, y, 26 * s, 12 * s, R() * 360, [C.l1, C.l3, C.l4, C.l5, C.l2][i % 5]));
  }
  // Ferns.
  const fern = (x, y, len, ang) => {
    const out = [];
    const a = ang * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
    for (let t = 8; t < len; t += 14) {
      const bx = x + dx * t, by = y + dy * t, s = (1 - t / len) * 34 + 8;
      for (const side of [-1, 1]) {
        const na = a + side * 1.2;
        out.push(poly([[bx, by], [bx + Math.sin(na) * s, by - Math.cos(na) * s], [bx + dx * 10, by + dy * 10]], C.fern));
      }
    }
    out.push(poly([[x - 2, y], [x + dx * len, y + dy * len], [x + 2, y]], C.trunkD));
    return out.join('\n');
  };
  o.push(fern(40, 800, 170, -20), fern(80, 820, 150, 15), fern(700, 780, 160, 20), fern(660, 800, 140, -15));

  // Mushrooms.
  const shroom = (x, y, s) => [
    rect(x - 9 * s, y - 32 * s, 18 * s, 34 * s, C.stem),
    path(`M${x - 34 * s},${y - 28 * s} Q${x},${y - 80 * s} ${x + 34 * s},${y - 28 * s}Z`, C.cap),
    circle(x - 14 * s, y - 42 * s, 5 * s, C.dot), circle(x + 10 * s, y - 50 * s, 6 * s, C.dot), circle(x + 22 * s, y - 34 * s, 4 * s, C.dot),
  ].join('\n');
  o.push(shroom(150, 960, 1.4), shroom(205, 975, 1), shroom(620, 950, 1.2), shroom(90, 700, 0.8));

  // Hedgehog.
  const hx = 250, hy = 905;
  for (let i = 0; i < 16; i++) {
    const a = Math.PI * (1.05 + i * 0.06);
    const bx = hx + Math.cos(a) * 62, by = hy + Math.sin(a) * 44;
    o.push(poly([[bx - 9, by + 5], [bx + Math.cos(a) * 30, by + Math.sin(a) * 30], [bx + 9, by - 5]], i % 2 ? C.hog : C.trunkD));
  }
  o.push(ellipse(hx, hy, 66, 46, C.hog));
  for (let i = 0; i < 10; i++) o.push(ellipse(hx - 20 + (i % 5) * 18, hy - 22 + Math.floor(i / 5) * 18, 9, 5, C.hogL, 'transform="rotate(-20 ' + (hx - 20 + (i % 5) * 18) + ' ' + (hy - 22 + Math.floor(i / 5) * 18) + ')"'));
  o.push(path(smoothPath([[hx + 40, hy - 26], [hx + 80, hy + 2], [hx + 100, hy + 20], [hx + 70, hy + 34], [hx + 40, hy + 30]]), C.face));
  o.push(circle(hx + 100, hy + 20, 7, C.nose), circle(hx + 64, hy + 4, 5, C.nose));
  o.push(ellipse(hx - 25, hy + 44, 12, 6, C.trunkD), ellipse(hx + 30, hy + 44, 12, 6, C.trunkD));

  // Falling leaves in the air.
  for (let i = 0; i < 28; i++) {
    const x = R() * W, y = 330 + R() * 330;
    o.push(R() < 0.4 ? star(x, y, 13, 5, cols[i % cols.length], 0.55, R() * 6) : leaf(x, y, 28, 13, R() * 360, cols[(i + 1) % cols.length]));
  }
  return svg(g(o));
}
