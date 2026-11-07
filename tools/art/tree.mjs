// A decorated Christmas tree with presents, in a cosy room with a snowy window.
import { svg, rect, circle, ellipse, path, poly, g, smoothPath, star, rng, W, H } from './common.mjs';

export default function tree() {
  const R = rng(23);
  const C = {
    wall: '#efe0c4', wall2: '#e2cca6', panel: '#c99b6b', panelD: '#a77a4f',
    floor1: '#9a6640', floor2: '#b47d51', seam: '#6e4528',
    night: '#24365e', snow: '#f7f8fb', frame: '#fbf6ec', curtain: '#a8323a', curtainD: '#842630',
    rug: '#b33d34', rugGold: '#e2b04a', rugD: '#7f2a26',
    tree1: '#1f5a3a', tree2: '#2f7a4c', tree3: '#16442c', trunk: '#5a3b28',
    pot: '#b8383a', potBand: '#e2b04a',
    gold: '#e8b847', goldL: '#f6dc8c', red: '#cf3a35', blue: '#3d6fb0', blueL: '#8fb3e0', purple: '#7c4f9e',
    white: '#fbf6ec', pink: '#e98da0', light: '#fff1a8',
    green: '#3f8a4f', ribbon: '#f3ecdf',
  };
  const o = [];
  // Striped wallpaper.
  o.push(rect(0, 0, W, 700, C.wall));
  for (let x = 0; x < W; x += 60) o.push(rect(x + 30, 0, 30, 640, C.wall2));
  // Wainscot panels.
  o.push(rect(0, 600, W, 120, C.panelD));
  for (let x = 12; x < W; x += 124) o.push(rect(x, 614, 106, 90, C.panel));
  o.push(rect(0, 592, W, 14, C.frame));
  // Floorboards.
  for (let i = 0, y = 720; y < H; i++, y += 34) {
    o.push(rect(0, y, W, 34, i % 2 ? C.floor1 : C.floor2));
    const off = (i * 137) % 250;
    for (let x = off; x < W; x += 250) o.push(rect(x, y, 5, 34, C.seam));
  }

  // Window with curtains.
  o.push(rect(40, 110, 200, 300, C.frame));
  o.push(rect(56, 126, 168, 268, C.night));
  for (let i = 0; i < 26; i++) o.push(circle(60 + R() * 160, 130 + R() * 230, 3 + R() * 3, C.snow));
  o.push(path(smoothPath([[56, 394], [90, 350], [140, 360], [190, 340], [224, 360], [224, 394]]), C.snow));
  o.push(rect(56, 258, 168, 10, C.frame), rect(135, 126, 10, 268, C.frame));
  o.push(path(`M20,90 L90,90 Q70,250 100,430 L20,430 Z`, C.curtain), path(`M260,90 L190,90 Q210,250 180,430 L260,430 Z`, C.curtain));
  o.push(path(`M20,90 L50,90 Q40,250 60,430 L20,430 Z`, C.curtainD), path(`M260,90 L230,90 Q240,250 220,430 L260,430 Z`, C.curtainD));
  o.push(rect(10, 78, 262, 16, C.panelD));

  // Wreath on the wall.
  o.push(circle(640, 220, 70, C.tree1), circle(640, 220, 38, C.wall));
  for (let a = 0; a < 12; a++) {
    const x = 640 + Math.cos(a * 0.5236) * 54, y = 220 + Math.sin(a * 0.5236) * 54;
    o.push(ellipse(x, y, 20, 11, a % 2 ? C.tree2 : C.green, `transform="rotate(${a * 30 + 60} ${x} ${y})"`));
  }
  for (let a = 0; a < 6; a++) o.push(circle(640 + Math.cos(a * 1.05 + 0.3) * 54, 220 + Math.sin(a * 1.05 + 0.3) * 54, 7, C.red));
  o.push(poly([[640, 290], [606, 272], [606, 308]], C.red), poly([[640, 290], [674, 272], [674, 308]], C.red), circle(640, 290, 9, C.curtainD));

  // Rug.
  o.push(ellipse(375, 880, 360, 100, C.rugD), ellipse(375, 880, 340, 88, C.rugGold), ellipse(375, 880, 318, 76, C.rug));
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; o.push(circle(375 + Math.cos(a) * 280, 880 + Math.sin(a) * 60, 7, C.rugGold)); }

  // Pot and trunk.
  o.push(rect(350, 700, 50, 50, C.trunk));
  o.push(poly([[300, 735], [450, 735], [430, 830], [320, 830]], C.pot), rect(296, 735, 158, 18, C.potBand));

  // Tree tiers.
  const cx = 375, top = 95;
  const tiers = 6;
  const tierInfo = [];
  for (let t = 0; t < tiers; t++) {
    const yb = 230 + t * 100, wHalf = 70 + t * 45, yt = top + t * 85;
    tierInfo.push({ yb, wHalf, yt });
  }
  for (let t = tiers - 1; t >= 0; t--) {
    const { yb, wHalf, yt } = tierInfo[t];
    const pts = [[cx, yt]];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const x = cx + wHalf - (2 * wHalf * i) / n;
      pts.push([x, yb + (i % 2 ? -14 : 6)]);
    }
    o.push(poly(pts, t % 2 ? C.tree1 : C.tree2));
    // shadow side
    o.push(poly([[cx, yt + 20], [cx + wHalf * 0.98, yb + 4], [cx + wHalf * 0.55, yb - 6], [cx + 6, yb - 30]], C.tree3));
  }
  // Garlands (gold swoops) with lights.
  const garland = (y0, half, sag, dir) => {
    const x0 = cx - half, x1 = cx + half;
    const y1 = y0 + dir * 40;
    return { d: `M${x0},${y0} Q${cx},${(y0 + y1) / 2 + sag} ${x1},${y1}`, x0, x1, y0, y1, sag };
  };
  const gs = [garland(250, 100, 40, 1), garland(370, 160, 45, -1), garland(480, 210, 50, 1), garland(590, 260, 55, -1)];
  for (const gg of gs) {
    o.push(`<path d="${gg.d}" fill="none" stroke="${C.gold}" stroke-width="12" stroke-linecap="round"/>`);
    for (let k = 1; k < 9; k++) {
      const t = k / 9, x = (1 - t) ** 2 * gg.x0 + 2 * (1 - t) * t * cx + t * t * gg.x1;
      const y = (1 - t) ** 2 * gg.y0 + 2 * (1 - t) * t * ((gg.y0 + gg.y1) / 2 + gg.sag) + t * t * gg.y1;
      o.push(circle(x, y - 14, 7, C.light));
    }
  }
  // Baubles.
  const bcol = [C.red, C.blue, C.gold, C.purple, C.white, C.pink];
  const placed = [];
  for (let tries = 0; placed.length < 30 && tries < 2000; tries++) {
    const y = 180 + R() * 520;
    const t = (y - 95) / 650;
    const half = 50 + t * 270;
    const x = cx + (R() * 2 - 1) * half * 0.85;
    const r = 13 + R() * 10;
    if (placed.some(([px, py, pr]) => Math.hypot(px - x, py - y) < pr + r + 10)) continue;
    placed.push([x, y, r]);
    const col = bcol[placed.length % bcol.length];
    o.push(rect(x - 4, y - r - 6, 8, 7, C.goldL));
    o.push(circle(x, y, r, col));
    o.push(ellipse(x - r * 0.35, y - r * 0.35, r * 0.28, r * 0.18, col === C.white ? C.blueL : C.white, `transform="rotate(-40 ${x - r * 0.35} ${y - r * 0.35})"`));
    if (r > 18) o.push(rect(x - r * 0.95, y - 2, r * 1.9, 5, col === C.gold ? C.red : C.gold));
  }
  // Star on top.
  o.push(star(cx, 78, 46, 5, C.gold, 0.45), star(cx, 80, 24, 5, C.goldL, 0.45));

  // Presents.
  const present = (x, y, w, h, paper, pattern, ribbonCol) => {
    const out = [rect(x, y, w, h, paper)];
    if (pattern === 'dots') for (let yy = y + 14; yy < y + h - 6; yy += 22) for (let xx = x + 12 + ((yy - y) % 44 ? 11 : 0); xx < x + w - 8; xx += 22) out.push(circle(xx, yy, 5, C.white));
    if (pattern === 'stripes') for (let yy = y + 10; yy < y + h; yy += 24) out.push(rect(x, yy, w, 10, C.white));
    if (pattern === 'stars') for (let yy = y + 20; yy < y + h - 10; yy += 34) for (let xx = x + 18 + ((yy - y) % 68 > 30 ? 17 : 0); xx < x + w - 12; xx += 34) out.push(star(xx, yy, 9, 5, C.goldL, 0.45));
    out.push(rect(x - 6, y, w + 12, 22, paper), rect(x - 6, y + 22, w + 12, 4, C.seam));
    out.push(rect(x + w / 2 - 9, y, 18, h, ribbonCol));
    out.push(ellipse(x + w / 2 - 22, y - 12, 24, 13, ribbonCol, `transform="rotate(-20 ${x + w / 2 - 22} ${y - 12})"`));
    out.push(ellipse(x + w / 2 + 22, y - 12, 24, 13, ribbonCol, `transform="rotate(20 ${x + w / 2 + 22} ${y - 12})"`));
    out.push(circle(x + w / 2, y - 6, 10, ribbonCol === C.gold ? C.goldL : C.white));
    return out.join('\n');
  };
  o.push(present(120, 770, 130, 110, C.red, 'dots', C.gold));
  o.push(present(470, 760, 150, 120, C.blue, 'stars', C.red));
  o.push(present(250, 820, 110, 90, C.green, 'stripes', C.red));
  o.push(present(395, 850, 100, 70, C.gold, 'plain', C.purple));
  o.push(present(30, 860, 90, 80, C.purple, 'stripes', C.gold));
  o.push(present(620, 860, 100, 80, C.pink, 'dots', C.green));
  return svg(g(o));
}
