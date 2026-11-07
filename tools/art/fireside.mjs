// A cosy mug of hot chocolate by the fire: fireplace, stockings, knitted blanket and biscuits.
import { svg, rect, circle, ellipse, path, poly, g, smoothPath, star, rng, W, H } from './common.mjs';

export default function fireside() {
  const R = rng(17);
  const C = {
    wall: '#2f5b4f', wallL: '#3d6e60', brick1: '#b35a3d', brick2: '#9a4a31', mortar: '#7d3a26',
    mantel: '#6b4630', mantelL: '#8a5d3f', hearth: '#4a4040', soot: '#231c1c',
    log: '#6a4330', logEnd: '#c79a6b', flame1: '#d93b23', flame2: '#f07a24', flame3: '#f8b938', flame4: '#fde58e',
    stockR: '#c4313a', stockG: '#2f7a4c', cuff: '#f7f1e6', gold: '#e5b445', candle: '#f2e8d4', glow: '#ffd56b',
    blanket1: '#f1e6d2', blanket2: '#c9473f', blanket3: '#e0a64a',
    mug: '#d23d3d', mugD: '#a92e33', cocoa: '#6b3d26', cream: '#f9f2e7', marsh: '#f6c2cc',
    steam: '#e9eef0', biscuit: '#b86b35', icing: '#fbf5ea', plate: '#e8eef2', plateD: '#c7d3dc', cane: '#d9363e',
    leaf: '#2c6a45',
  };
  const o = [rect(0, 0, W, H, C.wall)];
  // Wallpaper diamonds.
  for (let y = 20; y < 560; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < W; x += 60) {
    o.push(poly([[x, y - 12], [x + 9, y], [x, y + 12], [x - 9, y]], C.wallL));
  }
  // Brick chimney breast.
  const fx = 130, fw = 490;
  o.push(rect(fx, 0, fw, 640, C.mortar));
  for (let r = 0; r * 26 < 640; r++) for (let c = -1; c * 60 < fw; c++) {
    const bx = fx + c * 60 + (r % 2 ? 30 : 0) + 3, by = r * 26 + 3;
    const x0 = Math.max(fx + 3, bx), x1 = Math.min(fx + fw - 3, bx + 54);
    if (x1 - x0 > 10) o.push(rect(x0, by, x1 - x0, 20, (r * 3 + c) % 4 ? C.brick1 : C.brick2));
  }
  // Firebox.
  o.push(path(`M210,640 V430 Q375,330 540,430 V640 Z`, C.hearth));
  o.push(path(`M232,640 V440 Q375,355 518,440 V640 Z`, C.soot));
  // Logs.
  o.push(poly([[250, 610], [500, 580], [506, 606], [256, 636]], C.log), poly([[260, 590], [480, 625], [474, 650], [254, 615]], C.log));
  o.push(ellipse(250, 625, 12, 14, C.logEnd), ellipse(505, 594, 11, 13, C.logEnd));
  // Flames, back to front.
  const flame = (x, y, w, h, col) => path(smoothPath([[x - w / 2, y], [x - w * 0.45, y - h * 0.4], [x - w * 0.1, y - h * 0.7], [x, y - h], [x + w * 0.15, y - h * 0.65], [x + w * 0.45, y - h * 0.35], [x + w / 2, y]]), col);
  o.push(flame(375, 600, 230, 230, C.flame1), flame(320, 600, 110, 170, C.flame1), flame(440, 600, 110, 180, C.flame1));
  o.push(flame(375, 600, 170, 180, C.flame2), flame(312, 600, 80, 120, C.flame2), flame(445, 600, 80, 130, C.flame2));
  o.push(flame(378, 600, 110, 130, C.flame3), flame(330, 600, 50, 80, C.flame3), flame(425, 600, 55, 90, C.flame3));
  o.push(flame(378, 600, 55, 75, C.flame4));
  // Hearth stone.
  o.push(rect(160, 640, 430, 40, C.hearth));
  // Mantel with garland, candles and stockings.
  o.push(rect(100, 300, 550, 36, C.mantel), rect(100, 300, 550, 10, C.mantelL));
  for (const cx of [170, 230, 520, 580]) {
    const h = cx % 3 ? 80 : 60;
    o.push(rect(cx - 12, 300 - h, 24, h, C.candle), ellipse(cx, 300 - h - 18, 8, 16, C.glow), ellipse(cx, 300 - h - 12, 4, 8, C.flame2));
  }
  o.push(star(375, 250, 34, 5, C.gold, 0.45));
  for (let i = 0; i < 14; i++) {
    const x = 110 + i * 38, y = 345 + Math.sin(i * 0.7) * 12;
    o.push(ellipse(x, y, 26, 14, i % 2 ? C.leaf : C.stockG, `transform="rotate(${i % 2 ? 20 : -20} ${x} ${y})"`));
    if (i % 3 === 1) o.push(circle(x, y + 10, 7, C.stockR));
  }
  const stocking = (x, col, pat) => {
    const out = [path(`M${x},360 h60 v120 q0,40 -40,50 l-60,12 q-30,4 -32,-26 q0,-22 30,-30 l42,-10 z`, col)];
    if (pat) for (let yy = 390; yy < 470; yy += 26) out.push(rect(x, yy, 60, 10, C.cuff));
    out.push(rect(x - 6, 350, 72, 30, C.cuff), star(x - 30, 505, 10, 5, C.gold, 0.45));
    return out.join('\n');
  };
  o.push(stocking(250, C.stockR, false), stocking(450, C.stockG, true));

  // Knitted blanket across the foreground (chevron rows).
  const rows = [C.blanket1, C.blanket2, C.blanket1, C.blanket3, C.blanket1, C.blanket2, C.blanket1, C.blanket3];
  for (let i = 0; i < 12; i++) {
    const y = 690 + i * 28;
    const pts = [];
    for (let x = -40, k = 0; x <= W + 40; x += 40, k++) pts.push([x, y + (k % 2 ? 14 : 0)]);
    const d = `M${pts.map(([x, yy]) => `${x},${yy}`).join(' L')} L${W + 40},${H + 20} L-40,${H + 20} Z`;
    o.push(path(d, rows[i % rows.length]));
  }

  // Plate of biscuits.
  o.push(ellipse(600, 880, 130, 50, C.plateD), ellipse(600, 872, 118, 42, C.plate));
  const gingerbread = (x, y, s) => [
    circle(x, y - 34 * s, 17 * s, C.biscuit),
    path(smoothPath([[x - 16 * s, y - 22 * s], [x - 42 * s, y - 14 * s], [x - 40 * s, y - 2 * s], [x - 14 * s, y - 6 * s], [x - 20 * s, y + 30 * s], [x - 6 * s, y + 34 * s], [x, y + 14 * s], [x + 6 * s, y + 34 * s], [x + 20 * s, y + 30 * s], [x + 14 * s, y - 6 * s], [x + 40 * s, y - 2 * s], [x + 42 * s, y - 14 * s], [x + 16 * s, y - 22 * s]]), C.biscuit),
    circle(x - 6 * s, y - 37 * s, 3 * s, C.icing), circle(x + 6 * s, y - 37 * s, 3 * s, C.icing),
    circle(x, y - 8 * s, 3.5 * s, C.stockR), circle(x, y + 4 * s, 3.5 * s, C.stockG),
  ].join('\n');
  o.push(gingerbread(560, 870, 1.0), gingerbread(650, 860, 0.9));
  // Candy cane.
  o.push(`<path d="M470,960 L520,850 Q535,820 560,835 Q580,850 568,872" fill="none" stroke="${C.cuff}" stroke-width="16" stroke-linecap="round"/>`);
  for (let i = 0; i < 6; i++) o.push(circle(478 + i * 8.5, 942 - i * 18.5, 6, C.cane));

  // The mug.
  const mx = 280, my = 760;
  o.push(ellipse(mx, my + 200, 135, 22, C.mugD));
  o.push(path(`M${mx + 115},${my + 50} q70,0 70,65 q0,65 -70,65 v-30 q40,0 40,-35 q0,-35 -40,-35 z`, C.mugD));
  o.push(path(`M${mx - 120},${my} V${my + 180} Q${mx},${my + 230} ${mx + 120},${my + 180} V${my} Z`, C.mug));
  o.push(path(`M${mx + 60},${my + 10} V${my + 190} Q${mx + 100},${my + 185} ${mx + 120},${my + 175} V${my + 10} Z`, C.mugD));
  // Snowflake pattern on the mug.
  for (const [x, y] of [[mx - 60, my + 80], [mx + 10, my + 140], [mx - 30, my + 175], [mx + 30, my + 60]]) o.push(star(x, y, 18, 6, C.cuff, 0.3));
  o.push(ellipse(mx, my, 120, 30, C.mugD), ellipse(mx, my + 3, 108, 24, C.cocoa));
  // Cream and marshmallows.
  o.push(path(smoothPath([[mx - 90, my + 2], [mx - 60, my - 30], [mx - 20, my - 40], [mx + 30, my - 34], [mx + 80, my - 12], [mx + 95, my + 6], [mx, my + 18]]), C.cream));
  [[-50, -20, 0], [-10, -30, 1], [30, -16, 0], [60, -4, 1], [-75, -2, 1], [10, -2, 0]].forEach(([dx, dy, k]) => {
    o.push(rect(mx + dx - 14, my + dy - 12, 28, 24, k ? C.marsh : C.cream, `transform="rotate(${dx % 30} ${mx + dx} ${my + dy})" rx="5"`));
  });
  // Steam.
  for (const [sx, d] of [[mx - 40, 0], [mx + 10, 1], [mx + 60, 0]]) {
    o.push(`<path d="M${sx},${my - 50} q${d ? 30 : -30},-40 0,-80 q${d ? -30 : 30},-40 0,-80" fill="none" stroke="${C.steam}" stroke-width="14" stroke-linecap="round"/>`);
  }
  return svg(g(o));
}
