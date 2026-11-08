// A stained-glass church window: a rose window above three lancets of diamond quarries with
// medallions (holly, the Christmas star, a candle), set in a stone wall with candles on the sill.
import { svg, rect, circle, ellipse, path, poly, g, star, rng, W, H } from './common.mjs';

const f = (n) => +n.toFixed(1);

/** Pointed (gothic) arch outline from x0..x1, springing at y = spring, down to y = bottom. */
function arch(x0, x1, spring, bottom, k = 0.75) {
  const w = x1 - x0, r = w * k;
  const apexY = spring - Math.sqrt(r * r - (r - w / 2) ** 2);
  return `M${f(x0)},${f(bottom)}V${f(spring)}A${f(r)},${f(r)} 0 0 1 ${f((x0 + x1) / 2)},${f(apexY)}A${f(r)},${f(r)} 0 0 1 ${f(x1)},${f(spring)}V${f(bottom)}Z`;
}

export default function windowArt() {
  const R = rng(41);
  const C = {
    stone: '#9c958c', stone2: '#b3aca2', stone3: '#857e76', frame: '#cfc6b8', frameD: '#b8ad9d',
    night: '#1f2d6b', blue: '#2f56a8', sky: '#6f9fd8', ruby: '#b3243a', rose: '#e0607a', emerald: '#1f7a4d',
    leaf: '#4fa35f', amber: '#e9a826', gold: '#f3cf55', amethyst: '#6d3d93', violet: '#9b72c4',
    pale1: '#dbe8ef', pale2: '#eaf0d5', pale3: '#f4e4c3', pale4: '#f0d6dc', white: '#fbf7ec',
    candle: '#f2ead8', flame: '#f7b733', flameL: '#fde68a', wood: '#7a5233',
  };
  const jewels = [C.ruby, C.blue, C.emerald, C.amber, C.amethyst];
  const o = [rect(0, 0, W, H, C.stone)];

  // Stone wall blocks.
  for (let r = 0, y = 0; y < H; r++, y += 46) {
    for (let x = (r % 2) * -45; x < W; x += 90) {
      o.push(rect(x + 3, y + 3, 84, 40, [C.stone, C.stone2, C.stone3][Math.floor(R() * 3)]));
    }
  }

  // Window frame (stone tracery) and the glass ground.
  const X0 = 95, X1 = 655, SPRING = 450, BOTTOM = 905;
  o.push(path(arch(X0 - 26, X1 + 26, SPRING, BOTTOM + 20), C.frame));
  o.push(path(arch(X0 - 12, X1 + 12, SPRING, BOTTOM + 10), C.frameD));
  o.push(path(arch(X0, X1, SPRING, BOTTOM), C.night));

  // ---- Rose window ----
  const cx = 375, cy = 318;
  o.push(circle(cx, cy, 172, C.frame));
  o.push(circle(cx, cy, 160, C.night));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    o.push(circle(cx + Math.cos(a) * 146, cy + Math.sin(a) * 146, 11, i % 2 ? C.gold : C.ruby));
  }
  o.push(circle(cx, cy, 132, C.frame));
  o.push(circle(cx, cy, 124, C.blue));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 360, rad = (a * Math.PI) / 180;
    const px = cx + Math.cos(rad) * 80, py = cy + Math.sin(rad) * 80;
    o.push(ellipse(px, py, 44, 19, i % 2 ? C.ruby : C.amethyst, `transform="rotate(${a} ${f(px)} ${f(py)})"`));
    o.push(ellipse(px, py, 24, 8, i % 2 ? C.rose : C.violet, `transform="rotate(${a} ${f(px)} ${f(py)})"`));
    const b = rad + Math.PI / 12;
    o.push(circle(cx + Math.cos(b) * 108, cy + Math.sin(b) * 108, 12, C.emerald));
    o.push(circle(cx + Math.cos(b) * 108, cy + Math.sin(b) * 108, 5, C.leaf));
  }
  o.push(circle(cx, cy, 42, C.gold), star(cx, cy, 36, 8, C.white, 0.5), circle(cx, cy, 10, C.amber));

  // Spandrels around the rose: small coloured quarries.
  const spandrel = (sx, sy) => {
    for (let i = 0; i < 9; i++) {
      const a = R() * Math.PI * 2, d = R() * 26;
      o.push(circle(sx + Math.cos(a) * d, sy + Math.sin(a) * d, 9, jewels[i % jewels.length]));
    }
  };
  // Trefoils between the lancet tops, and stars in the blue.
  for (const [tx, ty] of [[288, 568], [462, 568]]) {
    for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3; o.push(circle(tx + Math.cos(a) * 13, ty + Math.sin(a) * 13, 12, [C.ruby, C.emerald, C.amber][k])); }
    o.push(circle(tx, ty, 7, C.gold));
  }
  for (const [sx, sy, r] of [[150, 470, 16], [600, 470, 16], [375, 545, 12], [215, 520, 10], [535, 520, 10]]) o.push(star(sx, sy, r, 4, C.white, 0.4));
  void spandrel;

  // ---- Three lancets ----
  const lancets = [[128, 276, 'holly'], [301, 449, 'star'], [474, 622, 'candle']];
  const top = 600, bottom = 885;
  o.push(`<defs>${lancets.map(([a, b], i) => `<clipPath id="lan${i}"><path d="${arch(a + 14, b - 14, top, bottom - 14, 0.9)}"/></clipPath>`).join('')}</defs>`);
  lancets.forEach(([a, b, motif], i) => {
    o.push(path(arch(a - 8, b + 8, top, bottom + 8, 0.9), C.frame));
    o.push(path(arch(a, b, top, bottom, 0.9), C.gold));
    // Border beads down the straight sides.
    for (let y = top + 6; y < bottom - 14; y += 24) {
      o.push(rect(a + 1, y, 13, 18, (y / 24) % 2 < 1 ? C.ruby : C.blue), rect(b - 14, y, 13, 18, (y / 24) % 2 < 1 ? C.blue : C.ruby));
    }
    // Diamond quarries, clipped to the inner lancet.
    const qs = [];
    const s = 26;
    const pales = [C.pale1, C.pale2, C.pale3, C.pale4];
    for (let row = 0; row < 40; row++) {
      for (let col = -1; col < 8; col++) {
        const qx = a + 14 + col * s + (row % 2) * (s / 2), qy = top - 160 + row * (s / 2);
        const col2 = R() < 0.14 ? jewels[Math.floor(R() * jewels.length)] : pales[(row + col) % pales.length];
        qs.push(poly([[qx, qy - s / 2], [qx + s / 2, qy], [qx, qy + s / 2], [qx - s / 2, qy]], col2));
      }
    }
    o.push(`<g clip-path="url(#lan${i})">${qs.join('')}</g>`);
    // Medallion.
    const mx = (a + b) / 2, my = 730;
    o.push(circle(mx, my, 56, C.gold), circle(mx, my, 47, C.night));
    if (motif === 'star') {
      o.push(star(mx, my, 40, 8, C.gold, 0.42), star(mx, my, 20, 8, C.white, 0.5));
      for (let k = 0; k < 3; k++) o.push(circle(mx + [-28, 30, 0][k], my + [30, 24, -36][k], 4.5, C.white));
    } else if (motif === 'holly') {
      const leaf = (lx, ly, ang, colr) => path(`M0,-26 Q16,-14 9,-4 Q20,4 8,10 Q14,22 0,28 Q-14,22 -8,10 Q-20,4 -9,-4 Q-16,-14 0,-26Z`, colr, `transform="translate(${lx} ${ly}) rotate(${ang})"`);
      o.push(leaf(mx - 18, my - 6, -40, C.emerald), leaf(mx + 18, my - 6, 40, C.leaf), leaf(mx, my + 16, 180, C.emerald));
      o.push(circle(mx - 7, my + 3, 8, C.ruby), circle(mx + 8, my + 4, 8, C.ruby), circle(mx, my - 9, 8, C.ruby));
    } else {
      o.push(rect(mx - 11, my - 8, 22, 46, C.candle), ellipse(mx, my - 26, 10, 18, C.flame), ellipse(mx, my - 22, 5, 9, C.flameL));
      o.push(poly([[mx - 30, my + 38], [mx + 30, my + 38], [mx + 22, my + 30], [mx - 22, my + 30]], C.amber));
      for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2; o.push(circle(mx + Math.cos(ang) * 34, my - 22 + Math.sin(ang) * 30, 4, C.gold)); }
    }
  });

  // Stone sill with candles.
  o.push(rect(50, 905, 650, 30, C.frame), rect(36, 935, 678, 26, C.frameD), rect(0, 961, W, 39, C.stone3));
  for (const [x, h] of [[120, 70], [170, 52], [580, 66], [630, 48]]) {
    o.push(rect(x - 13, 905 - h, 26, h, C.candle), ellipse(x, 905 - h - 18, 9, 16, C.flame), ellipse(x, 905 - h - 14, 4.5, 8, C.flameL));
  }
  // Holly sprigs on the sill.
  for (const [x, flip] of [[290, 1], [460, -1]]) {
    o.push(path(`M${x},905 q${30 * flip},-40 ${60 * flip},-12 q${-30 * flip},18 ${-60 * flip},12Z`, C.emerald));
    o.push(path(`M${x},905 q${-24 * flip},-34 ${-50 * flip},-8 q${26 * flip},14 ${50 * flip},8Z`, C.leaf));
    o.push(circle(x, 897, 7, C.ruby), circle(x + 12 * flip, 893, 7, C.ruby));
  }
  return svg(g(o), C.stone, { width: 3.2 });
}
