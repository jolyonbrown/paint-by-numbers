// Snowy cottage at night: glowing windows, smoking chimney, snowman, pines and falling snow.
import { svg, rect, circle, ellipse, path, poly, g, smoothPath, band, star, pine, rng, W, H } from './common.mjs';

export default function cottage() {
  const R = rng(7);
  const C = {
    sky1: '#1b2547', sky2: '#26345f', sky3: '#33467a', sky4: '#4b609a',
    moon: '#f3e7bd', crater: '#ddcd98', star: '#fff4c9',
    snow: '#f7f9fd', shade: '#d3dff0', shade2: '#aebfdc', hill: '#8ea3c8',
    pineD: '#1f3d3a', pineL: '#2f5b4c', trunk: '#4a3328',
    log1: '#8b5a3a', log2: '#a26c45', logEnd: '#d19a63', ring: '#b07a4a',
    roof: '#4e3029', mortar: '#6b2a20', brick1: '#b04a35', brick2: '#8d3828', smoke: '#c5cbe0',
    door: '#b8343a', wreath: '#2f6b3a', glow: '#ffd25e', glow2: '#ffeaa6', frame: '#f2e6cf',
    dark: '#26232b', carrot: '#ee8a2b', scarf: '#d8433e', path: '#d3dff0', ice: '#bcd6f2',
  };
  const o = [];

  // Sky bands (night, darkening upwards).
  o.push(rect(0, 0, W, H, C.sky1));
  o.push(band(0, W, 210, 30, 8, H, C.sky2, R, 0.5));
  o.push(band(0, W, 360, 26, 8, H, C.sky3, R, 1.7));
  o.push(band(0, W, 470, 20, 8, H, C.sky4, R, 2.9));

  // Moon with halo and craters.
  o.push(circle(585, 150, 78, C.sky2));
  o.push(circle(585, 150, 62, C.sky3));
  o.push(circle(585, 150, 46, C.moon));
  o.push(circle(570, 138, 9, C.crater), circle(598, 165, 12, C.crater), circle(600, 131, 5, C.crater), circle(568, 168, 5, C.crater));

  // Stars.
  for (let i = 0; i < 46; i++) {
    const x = 20 + R() * (W - 40), y = 20 + R() * 400;
    if (Math.hypot(x - 585, y - 150) < 95) continue;
    const r = 4 + R() * 7;
    o.push(R() < 0.6 ? star(x, y, r, 4, C.star, 0.32) : star(x, y, r * 0.9, 5, C.star, 0.45));
  }

  // Distant hills with little pines.
  o.push(path(smoothPath([[-20, 560], [90, 500], [220, 530], [360, 480], [500, 520], [640, 470], [780, 510], [780, 640], [-20, 640]]), C.hill));
  for (let i = 0; i < 26; i++) {
    const x = 10 + i * 29 + R() * 12, base = 545 + R() * 30 - (i > 9 && i < 15 ? 25 : 0);
    o.push(pine(x, base, 46 + R() * 24, 26 + R() * 8, [C.pineD], R, { tiers: 3, snow: R() < 0.5 ? C.shade : null }));
  }
  o.push(path(smoothPath([[-20, 600], [120, 560], [300, 590], [470, 565], [620, 585], [780, 560], [780, 700], [-20, 700]]), C.shade2));
  o.push(path(smoothPath([[-20, 640], [160, 610], [360, 625], [560, 605], [780, 625], [780, 1020], [-20, 1020]]), C.snow));

  // ---- Cottage ----
  const cx = 375, wallL = 215, wallR = 535, wallT = 585, wallB = 790;
  // Log walls: alternating logs.
  for (let i = 0, y = wallT; y < wallB; i++, y += 21) {
    o.push(path(`M${wallL},${y}H${wallR}V${Math.min(y + 21, wallB)}H${wallL}Z`, i % 2 ? C.log1 : C.log2));
  }
  // Log ends at the corners.
  for (let y = wallT + 10; y < wallB; y += 21) {
    for (const x of [wallL - 4, wallR + 4]) { o.push(circle(x, y, 11, C.logEnd), circle(x, y, 5, C.ring)); }
  }
  // Gable (vertical planks) and roof.
  const apexY = 405;
  o.push(poly([[wallL + 10, wallT], [cx, apexY + 30], [wallR - 10, wallT]], C.log1));
  for (let x = wallL + 40; x < wallR - 30; x += 26) {
    const t = Math.abs(x + 13 - cx) / (cx - wallL);
    const top = wallT - (1 - t) * (wallT - apexY - 40);
    o.push(rect(x, top, 13, wallT - top, C.log2));
  }
  // Attic round window.
  o.push(circle(cx, 520, 30, C.frame), circle(cx, 520, 23, C.glow));
  o.push(path(`M${cx - 23},520A23,23 0 0 0 ${cx},543V520Z`, C.glow2));
  o.push(rect(cx - 2.5, 497, 5, 46, C.frame), rect(cx - 23, 517.5, 46, 5, C.frame));

  // Chimney with bricks (behind the roof snow).
  const chX = 450, chT = 385, chW = 54;
  o.push(rect(chX, chT, chW, 120, '#6b2a20'));
  for (let r = 0; r < 7; r++) {
    for (let c = -1; c < 3; c++) {
      const bx = chX + c * 24 + (r % 2 ? 12 : 0) + 2, by = chT + r * 16 + 2;
      const x0 = Math.max(chX + 2, bx), x1 = Math.min(chX + chW - 2, bx + 21);
      if (x1 - x0 > 6) o.push(rect(x0, by, x1 - x0, 13, (r + c) % 3 ? C.brick1 : C.brick2));
    }
  }
  o.push(path(smoothPath([[chX - 8, chT + 4], [chX + 10, chT - 14], [chX + 30, chT - 10], [chX + 50, chT - 16], [chX + chW + 8, chT + 2], [chX + 30, chT + 10]]), C.snow));
  // Smoke puffs drifting up-left.
  [[468, 345, 18], [450, 312, 22], [425, 275, 26], [392, 240, 28], [352, 210, 30], [310, 190, 26]].forEach(([x, y, r], i) => {
    o.push(circle(x, y, r, i % 2 ? C.smoke : C.shade));
  });

  // Roof slab and thick snow.
  o.push(poly([[wallL - 45, wallT + 12], [cx, apexY - 8], [wallR + 45, wallT + 12], [wallR + 45, wallT + 30], [cx, apexY + 18], [wallL - 45, wallT + 30]], C.roof));
  const snowRoof = [[wallL - 60, wallT + 18], [wallL - 20, wallT - 25], [cx - 120, apexY + 60], [cx - 30, apexY - 22], [cx, apexY - 30], [cx + 40, apexY - 20], [cx + 130, apexY + 62], [wallR + 25, wallT - 22], [wallR + 62, wallT + 20], [wallR + 30, wallT + 26], [wallR - 10, wallT + 10], [cx + 90, apexY + 70], [cx, apexY + 22], [cx - 90, apexY + 72], [wallL + 10, wallT + 12], [wallL - 30, wallT + 28]];
  o.push(path(smoothPath(snowRoof), C.snow));
  o.push(path(smoothPath([[cx - 80, apexY + 40], [cx, apexY + 2], [cx + 80, apexY + 40], [cx + 50, apexY + 52], [cx, apexY + 26], [cx - 50, apexY + 54]]), C.shade));
  // Icicles under the roof edge.
  for (let x = wallL - 30; x < wallR + 30; x += 17) {
    if (x > cx - 40 && x < cx + 40) continue;
    const len = 14 + R() * 22;
    const y = wallT + 26;
    o.push(poly([[x, y], [x + 9, y], [x + 4.5, y + len]], C.ice));
  }

  // Windows with shutters and window boxes.
  for (const wx of [255, 455]) {
    const wy = 640, ww = 70, wh = 76;
    o.push(rect(wx - 30, wy - 4, 22, wh + 8, C.wreath), rect(wx + ww + 8, wy - 4, 22, wh + 8, C.wreath));
    o.push(rect(wx - 26, wy + 10, 14, 22, C.pineL), rect(wx - 26, wy + 44, 14, 22, C.pineL));
    o.push(rect(wx + ww + 12, wy + 10, 14, 22, C.pineL), rect(wx + ww + 12, wy + 44, 14, 22, C.pineL));
    o.push(rect(wx - 6, wy - 6, ww + 12, wh + 12, C.frame));
    o.push(rect(wx, wy, ww, wh, C.glow));
    o.push(poly([[wx, wy + wh], [wx, wy + wh * 0.45], [wx + ww * 0.55, wy + wh]], C.glow2));
    o.push(rect(wx + ww / 2 - 3, wy, 6, wh, C.frame), rect(wx, wy + wh / 2 - 3, ww, 6, C.frame));
    // window box with snow
    o.push(rect(wx - 10, wy + wh + 6, ww + 20, 16, C.roof));
    o.push(path(smoothPath([[wx - 14, wy + wh + 8], [wx + 10, wy + wh - 2], [wx + 35, wy + wh + 1], [wx + 60, wy + wh - 3], [wx + ww + 14, wy + wh + 8], [wx + 35, wy + wh + 12]]), C.snow));
  }

  // Door with wreath.
  const dx = cx - 34, dy = 660, dw = 68, dh = 130;
  o.push(path(`M${dx - 8},${dy + dh}V${dy + 26}A${dw / 2 + 8},${dw / 2 + 8} 0 0 1 ${dx + dw + 8},${dy + 26}V${dy + dh}Z`, C.frame));
  o.push(path(`M${dx},${dy + dh}V${dy + 26}A${dw / 2},${dw / 2} 0 0 1 ${dx + dw},${dy + 26}V${dy + dh}Z`, C.door));
  o.push(rect(dx + 8, dy + 50, 22, 70, C.brick2), rect(dx + dw - 30, dy + 50, 22, 70, C.brick2));
  o.push(circle(dx + dw - 12, dy + 92, 4, C.glow));
  o.push(circle(cx, dy + 26, 22, C.wreath), circle(cx, dy + 26, 12, C.door));
  for (let a = 0; a < 6; a++) o.push(circle(cx + Math.cos(a) * 17, dy + 26 + Math.sin(a) * 17, 3.6, C.scarf));
  o.push(poly([[cx, dy + 46], [cx - 14, dy + 38], [cx - 14, dy + 54]], C.scarf), poly([[cx, dy + 46], [cx + 14, dy + 38], [cx + 14, dy + 54]], C.scarf));
  // Lantern.
  o.push(rect(cx + 50, 668, 4, 16, C.dark), rect(cx + 42, 684, 20, 30, C.dark), rect(cx + 46, 688, 12, 22, C.glow));
  // Doorstep and path.
  o.push(rect(dx - 18, dy + dh, dw + 36, 14, C.shade2));
  o.push(path(smoothPath([[dx - 10, 804], [dx + dw + 10, 804], [dx + dw + 60, 880], [dx + dw + 150, 1010], [dx - 140, 1010], [dx - 60, 880]]), C.path));
  for (let i = 0; i < 9; i++) {
    const t = i / 8, px = cx - 6 + (i % 2 ? 14 : -14) + t * 10, py = 825 + t * 165;
    o.push(ellipse(px, py, 7 + t * 4, 11 + t * 6, C.shade2, `transform="rotate(${-8 + R() * 16} ${px} ${py})"`));
  }
  // Snow drift along the wall.
  o.push(path(smoothPath([[wallL - 30, 800], [wallL + 20, 770], [dx - 30, 788], [dx - 8, 800], [dx + dw + 8, 800], [dx + dw + 30, 786], [wallR - 20, 772], [wallR + 40, 802], [cx, 812]]), C.snow));
  o.push(path(smoothPath([[wallL - 20, 806], [wallL + 30, 790], [dx - 30, 800], [cx, 812]]), C.shade));

  // Fence on the right.
  for (let i = 0; i < 5; i++) {
    const fx = 560 + i * 42, fy = 770 + i * 9;
    o.push(rect(fx, fy, 12, 70, C.log1));
    o.push(path(smoothPath([[fx - 4, fy + 4], [fx + 6, fy - 8], [fx + 16, fy + 3], [fx + 6, fy + 7]]), C.snow));
  }
  o.push(poly([[555, 790], [760, 826], [760, 838], [555, 802]], C.log2), poly([[555, 818], [760, 856], [760, 868], [555, 830]], C.log2));

  // Big pine on the right (behind the fence would be odd, so in front at the edge).
  o.push(pine(700, 760, 300, 150, [C.pineD, C.pineL], R, { tiers: 5, snow: C.snow, trunk: C.trunk }));
  o.push(pine(615, 690, 170, 95, [C.pineL, C.pineD], R, { tiers: 4, snow: C.snow }));

  // Snowman on the left.
  const sx = 120;
  o.push(ellipse(sx, 900, 62, 52, C.snow), path(`M${sx - 60},912A62,52 0 0 0 ${sx + 52},926A58,40 0 0 1 ${sx - 60},912Z`, C.shade));
  o.push(ellipse(sx, 820, 46, 40, C.snow), path(`M${sx - 45},830A46,40 0 0 0 ${sx + 40},842A44,30 0 0 1 ${sx - 45},830Z`, C.shade));
  o.push(circle(sx, 752, 32, C.snow), path(`M${sx - 31},762A32,32 0 0 0 ${sx + 27},768A30,22 0 0 1 ${sx - 31},762Z`, C.shade));
  o.push(rect(sx - 36, 718, 72, 9, C.dark), rect(sx - 24, 670, 48, 50, C.dark), rect(sx - 24, 704, 48, 9, C.scarf));
  o.push(circle(sx - 11, 746, 4.5, C.dark), circle(sx + 11, 746, 4.5, C.dark));
  o.push(poly([[sx, 754], [sx + 34, 762], [sx, 765]], C.carrot));
  for (let i = 0; i < 5; i++) { const a = Math.PI * (0.25 + i * 0.125); o.push(circle(sx + Math.cos(a) * 18, 762 + Math.sin(a) * 9, 2.6, C.dark)); }
  for (const by of [805, 830, 880, 910]) o.push(circle(sx, by, 5, C.dark));
  // Scarf with stripes.
  o.push(path(smoothPath([[sx - 32, 780], [sx, 790], [sx + 32, 780], [sx + 30, 794], [sx, 802], [sx - 30, 794]]), C.scarf));
  o.push(path(`M${sx + 12},796L${sx + 30},846L${sx + 14},850L${sx},798Z`, C.scarf));
  o.push(rect(sx + 18, 818, 14, 7, C.wreath, `transform="rotate(-22 ${sx + 25} 821)"`), rect(sx + 24, 834, 14, 7, C.wreath, `transform="rotate(-22 ${sx + 31} 837)"`));
  // Stick arms.
  o.push(poly([[sx - 42, 812], [sx - 100, 770], [sx - 96, 765], [sx - 40, 806]], C.trunk), poly([[sx - 82, 782], [sx - 98, 790], [sx - 96, 794], [sx - 80, 787]], C.trunk));
  o.push(poly([[sx + 42, 812], [sx + 98, 778], [sx + 102, 784], [sx + 44, 818]], C.trunk), poly([[sx + 80, 790], [sx + 92, 768], [sx + 97, 770], [sx + 84, 792]], C.trunk));

  // Foreground drifts.
  o.push(path(smoothPath([[-20, 960], [150, 940], [330, 975], [520, 945], [780, 965], [780, 1020], [-20, 1020]]), C.shade));
  o.push(path(smoothPath([[-20, 985], [200, 970], [420, 992], [620, 975], [780, 990], [780, 1020], [-20, 1020]]), C.snow));

  // Falling snow (only where it shows against darker things).
  for (let i = 0; i < 90; i++) {
    const x = R() * W, y = R() * 600;
    if (Math.hypot(x - 585, y - 150) < 70) continue;
    o.push(circle(x, y, 2.6 + R() * 3, C.snow));
  }
  return svg(g(o));
}
