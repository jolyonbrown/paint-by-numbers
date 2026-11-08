// A cut-away Christmas house: a tall snowy house with its front open, every room busy with
// festive detail (inspired by a cosy advent-calendar jigsaw, not copied from it).
import { svg, rect, circle, ellipse, path, poly, g, smoothPath, star, pine, rng, W, H } from './common.mjs';

export default function house() {
  const R = rng(57);
  const C = {
    sky1: '#2a1f4d', sky2: '#3f2c66', sky3: '#5b4185', mtn: '#b8a6d9', mtnSnow: '#efeaf7', pineD: '#2c4a45',
    snow: '#f7f6fb', snowSh: '#d9d2ea', star: '#fff1b8', bulb: '#ffe066',
    beam: '#5a3626', plaster: '#efdcbc', brick: '#c96a4a', roof: '#6b3b2e',
    bath: '#9ad6bd', nursery: '#ee98b8', bedroom: '#9c6dbb', dining: '#d65a6f', library: '#7a4f3a', kitchen: '#e7bb4b', cellar: '#2f8f8c', living: '#4f9c5c',
    white: '#fbf8f2', pinkL: '#f8c9d8', purpleL: '#c8a6dd', red: '#c8303f', redD: '#8e2433', gold: '#e9b949', green: '#2f7a46', greenL: '#7cc06b',
    blue: '#3d6fb5', teal: '#58b7b0', wood: '#8a5a38', woodD: '#5e3a24', cream: '#f3e6c8', grey: '#9aa3ad', black: '#2b2421',
    orange: '#e8873a', fire: '#f2a33a', fireL: '#fde58a', turkey: '#b8742f', bottle1: '#7a2a3a', bottle2: '#3f6b3a', bottle3: '#c9b45a',
  };
  const o = [];
  // ---- Night sky, stars and snowy mountains ----
  o.push(rect(0, 0, W, H, C.sky1), rect(0, 260, W, 300, C.sky2), rect(0, 420, W, 600, C.sky3));
  for (let i = 0; i < 40; i++) {
    const x = R() * W, y = R() * 520;
    if (x > 40 && x < 710 && y > 60) continue; // keep stars around the house
    o.push(star(x, y, 4 + R() * 6, 4, C.star, 0.35));
  }
  o.push(poly([[-20, 620], [40, 470], [110, 620]], C.mtn), poly([[25, 506], [40, 470], [56, 505], [44, 498], [35, 510]], C.mtnSnow));
  o.push(poly([[640, 620], [715, 440], [790, 620]], C.mtn), poly([[697, 484], [715, 440], [734, 485], [720, 476], [708, 490]], C.mtnSnow));

  // ---- House shell ----
  const L = 60, Rt = 690, eave = 268;
  o.push(rect(L, eave, Rt - L, 690, C.beam));
  // Attic gable (timber framing on plaster).
  o.push(poly([[L - 10, eave + 10], [375, 70], [Rt + 10, eave + 10]], C.plaster));
  o.push(poly([[200, 200], [218, 186], [300, 300], [282, 300]], C.beam), poly([[550, 200], [532, 186], [450, 300], [468, 300]], C.beam));
  // Attic window with a cat on the sill and a telescope.
  o.push(circle(375, 200, 52, C.beam), circle(375, 200, 42, C.sky2));
  for (let i = 0; i < 5; i++) o.push(star(350 + i * 12, 175 + (i % 2) * 12, 4, 4, C.star, 0.4));
  o.push(ellipse(392, 224, 14, 10, C.black), circle(380, 210, 8, C.black), poly([[374, 205], [376, 196], [381, 204]], C.black), poly([[382, 204], [386, 196], [388, 206]], C.black));
  o.push(poly([[245, 290], [300, 236], [306, 242], [252, 296]], C.grey), poly([[268, 276], [255, 300], [262, 300]], C.woodD), poly([[268, 276], [285, 300], [278, 300]], C.woodD));
  for (const [x, y, w, h] of [[440, 262, 46, 34], [492, 270, 34, 26], [458, 240, 30, 22]]) o.push(rect(x, y, w, h, C.wood), rect(x + w / 2 - 3, y, 6, h, C.cream));
  // Roof with thick snow and fairy lights along the eaves.
  o.push(poly([[L - 40, eave + 20], [375, 34], [Rt + 40, eave + 20], [Rt + 40, eave + 40], [375, 58], [L - 40, eave + 40]], C.roof));
  o.push(path(smoothPath([[L - 52, eave + 26], [100, eave - 10], [375, 24], [650, eave - 10], [Rt + 52, eave + 26], [Rt + 30, eave + 32], [640, eave + 8], [375, 48], [110, eave + 8], [L - 30, eave + 32]]), C.snow));
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, x = L - 30 + t * (Rt - L + 60), y = eave + 34 - Math.sin(Math.PI * t) * (eave - 52) + (i % 2) * 6;
    o.push(circle(x, y + 10, 5, i % 3 ? C.bulb : C.pinkL));
  }

  // Helpers.
  const room = (x, y, w, h, col) => o.push(rect(x, y, w, h, col));
  const lights = (x0, x1, y, sag, n = 9) => {
    for (let i = 0; i <= n; i++) { const t = i / n; o.push(circle(x0 + (x1 - x0) * t, y + Math.sin(Math.PI * t) * sag, 4.5, i % 2 ? C.bulb : C.white)); }
  };
  const chain = (x0, x1, y, sag, cols) => {
    const n = Math.round((x1 - x0) / 15);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, yy = y + Math.sin(Math.PI * t) * sag;
      o.push(ellipse(x, yy, 9, 6, cols[i % cols.length], `transform="rotate(${i % 2 ? 30 : -30} ${x.toFixed(1)} ${yy.toFixed(1)})"`));
    }
  };
  const windowCurtains = (x, y, w, h, glass, curtain) => {
    o.push(rect(x, y, w, h, C.cream), rect(x + 6, y + 6, w - 12, h - 12, glass), rect(x + w / 2 - 3, y + 6, 6, h - 12, C.cream), rect(x + 6, y + h / 2 - 3, w - 12, 6, C.cream));
    o.push(path(`M${x - 10},${y - 8} h${w * 0.38} q-6,${h * 0.6} 6,${h + 16} h-${w * 0.38 - 4} z`, curtain));
    o.push(path(`M${x + w + 10},${y - 8} h-${w * 0.38} q6,${h * 0.6} -6,${h + 16} h${w * 0.38 - 4} z`, curtain));
  };
  const cat = (x, y, col, flip = 1) => {
    o.push(ellipse(x, y, 22, 13, col), circle(x + 20 * flip, y - 10, 10, col));
    o.push(poly([[x + 13 * flip, y - 16], [x + 15 * flip, y - 28], [x + 21 * flip, y - 18]], col), poly([[x + 21 * flip, y - 18], [x + 27 * flip, y - 28], [x + 28 * flip, y - 14]], col));
    o.push(path(`M${x - 20 * flip},${y + 2} q${-22 * flip},-4 ${-18 * flip},-22 l${4 * flip},2 q${-2 * flip},14 ${16 * flip},14 z`, col));
  };
  const presents = (x, y, list) => {
    for (const [dx, w, h, col, rib] of list) {
      o.push(rect(x + dx, y - h, w, h, col), rect(x + dx + w / 2 - 3, y - h, 6, h, rib), rect(x + dx, y - h / 2 - 3, w, 6, rib));
      o.push(ellipse(x + dx + w / 2 - 7, y - h - 5, 7, 5, rib), ellipse(x + dx + w / 2 + 7, y - h - 5, 7, 5, rib));
    }
  };

  // ======== Top floor: bathroom, nursery, bedroom ========
  const t0 = 300, t1 = 500;
  room(78, t0, 196, t1 - t0, C.bath);
  room(284, t0, 186, t1 - t0, C.nursery);
  room(480, t0, 192, t1 - t0, C.bedroom);
  // Bathroom: floor, clawfoot tub with bubbles, sink, mirror, shelf with bottles.
  o.push(rect(78, 470, 196, 30, C.teal));
  for (let x = 84; x < 270; x += 22) o.push(circle(x, 486, 7, x % 44 < 22 ? C.white : C.pinkL));
  o.push(rect(102, 330, 26, 40, C.cream), ellipse(115, 350, 9, 14, C.teal));
  o.push(rect(150, 352, 110, 7, C.wood));
  [[158, C.red], [176, C.blue], [196, C.gold], [218, C.purpleL], [238, C.pinkL]].forEach(([x, col]) => o.push(rect(x, 334, 12, 18, col), rect(x + 3, 328, 6, 7, C.grey)));
  o.push(path(`M150,420 h112 q0,38 -40,40 h-32 q-40,-2 -40,-40 z`, C.white));
  o.push(rect(160, 456, 8, 14, C.gold), rect(244, 456, 8, 14, C.gold));
  for (let i = 0; i < 12; i++) o.push(circle(158 + i * 9 + (i % 2) * 3, 416 - (i % 3) * 7, 7 + (i % 3) * 2, C.white));
  o.push(rect(96, 410, 34, 10, C.white), rect(108, 420, 10, 50, C.white));
  lights(84, 268, 312, 14, 8);
  // Nursery: cot, mobile, balloons, blocks, rug.
  o.push(ellipse(377, 482, 70, 12, C.pinkL));
  o.push(rect(320, 404, 120, 8, C.wood), rect(320, 456, 120, 8, C.wood), rect(318, 396, 8, 80, C.wood), rect(434, 396, 8, 80, C.wood));
  for (let x = 334; x < 432; x += 14) o.push(rect(x, 412, 5, 44, C.wood));
  o.push(rect(330, 440, 102, 16, C.white));
  o.push(rect(372, 312, 3, 26, C.black));
  for (const [dx, col] of [[-26, C.blue], [-8, C.gold], [10, C.greenL], [28, C.pinkL]]) o.push(rect(376 + dx - 1, 338, 2, 12, C.black), star(376 + dx, 356, 8, 5, col, 0.45));
  for (const [x, y, col] of [[300, 330, C.red], [318, 346, C.blue], [298, 356, C.gold]]) o.push(ellipse(x, y, 11, 14, col), rect(x - 1, y + 14, 2, 26, C.black));
  for (const [x, col] of [[446, C.red], [458, C.blue]]) o.push(rect(x, 486, 12, 12, col));
  o.push(rect(452, 474, 12, 12, C.gold));
  chain(288, 466, 314, 10, [C.white, C.gold]);
  // Bedroom: window, bed with patchwork quilt, lamps, presents on the bed.
  windowCurtains(540, 322, 72, 60, C.sky2, C.purpleL);
  o.push(rect(500, 404, 152, 30, C.woodD));
  o.push(rect(500, 430, 152, 44, C.white));
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) o.push(rect(504 + c * 24.5, 442 + r * 16, 22, 14, (r + c) % 3 === 0 ? C.pinkL : (r + c) % 3 === 1 ? C.purpleL : C.cream));
  o.push(rect(500, 474, 8, 22, C.woodD), rect(644, 474, 8, 22, C.woodD));
  o.push(ellipse(530, 424, 22, 10, C.white), ellipse(622, 424, 22, 10, C.white));
  o.push(rect(484, 420, 12, 60, C.wood), poly([[478, 420], [502, 420], [496, 398], [484, 398]], C.pinkL));
  presents(565, 442, [[0, 22, 18, C.green, C.red], [26, 18, 14, C.blue, C.gold]]);
  lights(486, 668, 312, 12, 8);

  // ======== Middle floor: dining room and library ========
  const m0 = 510, m1 = 730;
  room(78, m0, 330, m1 - m0, C.dining);
  room(418, m0, 254, m1 - m0, C.library);
  // Dining: windows, paper chains, stars, long table, chairs, food, candles.
  windowCurtains(112, 540, 70, 74, C.sky2, C.redD);
  windowCurtains(304, 540, 70, 74, C.sky2, C.redD);
  o.push(ellipse(243, 578, 18, 24, C.redD), ellipse(243, 578, 11, 16, C.pinkL));
  chain(84, 245, 526, 22, [C.gold, C.cream, C.red]);
  chain(245, 402, 526, 22, [C.cream, C.gold, C.red]);
  for (const [x, y] of [[100, 600], [210, 560], [282, 616], [392, 600], [160, 640]]) o.push(star(x, y, 9, 5, C.gold, 0.45));
  o.push(rect(108, 660, 270, 16, C.white), rect(116, 676, 254, 26, C.pinkL));
  o.push(ellipse(243, 652, 34, 12, C.white), ellipse(243, 646, 24, 14, C.turkey));
  o.push(ellipse(160, 654, 14, 6, C.green), ellipse(320, 654, 14, 6, C.gold), circle(196, 652, 7, C.red), circle(290, 652, 7, C.orange));
  for (const x of [130, 356]) o.push(rect(x - 4, 620, 8, 40, C.cream), ellipse(x, 612, 5, 9, C.fire));
  for (const x of [128, 192, 300, 364]) {
    o.push(path(`M${x},700 c-16,-26 -14,-40 0,-30 c14,-10 16,4 0,30 z`, C.redD), rect(x - 12, 698, 24, 8, C.redD), rect(x - 10, 706, 4, 22, C.woodD), rect(x + 6, 706, 4, 22, C.woodD));
  }
  // Library: bookshelves full of books, clock, fireplace with stockings, armchairs, ladder, rug.
  const shelf = (x, y, w, h, rows) => {
    o.push(rect(x, y, w, h, C.woodD));
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let bx = x + 4;
      const by = y + r * rh + 4;
      while (bx < x + w - 10) {
        const bw = 7 + Math.floor(R() * 5), bh = rh - 8 - Math.floor(R() * 8);
        if (bx + bw > x + w - 4) break;
        o.push(rect(bx, by + (rh - 8 - bh), bw, bh, [C.red, C.blue, C.green, C.gold, C.purpleL, C.teal, C.orange, C.cream][Math.floor(R() * 8)]));
        bx += bw + 1;
      }
      o.push(rect(x, y + (r + 1) * rh - 4, w, 4, C.wood));
    }
  };
  shelf(426, 518, 238, 52, 2);
  shelf(426, 578, 70, 120, 4);
  shelf(594, 578, 70, 120, 4);
  o.push(rect(506, 580, 80, 16, C.woodD), circle(546, 600, 14, C.cream), rect(545, 590, 2, 10, C.black), rect(545, 599, 8, 2, C.black));
  o.push(rect(506, 622, 80, 10, C.wood), rect(512, 632, 68, 66, C.brick), path(`M524,698 v-34 a22,22 0 0 1 44,0 v34 z`, C.black));
  o.push(path(smoothPath([[530, 698], [536, 676], [544, 682], [547, 662], [552, 680], [560, 672], [564, 698]]), C.fire), path(smoothPath([[538, 698], [544, 684], [548, 688], [552, 676], [556, 698]]), C.fireL));
  for (const [x, col] of [[518, C.red], [540, C.green], [562, C.red]]) o.push(path(`M${x},632 h12 v18 q0,8 -8,10 h-10 q-6,-2 -2,-8 l8,-4 z`, col));
  o.push(rect(502, 704, 92, 22, C.green));
  for (const x of [470, 620]) o.push(rect(x - 20, 670, 40, 34, C.redD), rect(x - 24, 660, 8, 44, C.redD), rect(x + 16, 660, 8, 44, C.redD), rect(x - 20, 650, 40, 22, C.redD));
  o.push(rect(430, 584, 5, 118, C.wood), rect(452, 584, 5, 118, C.wood));
  for (let y = 600; y < 700; y += 20) o.push(rect(430, y, 27, 4, C.wood));
  cat(600, 716, C.orange, -1);
  lights(426, 664, 574, 6, 10);

  // ======== Ground floor: kitchen, cellar, living room ========
  const g0 = 740, g1 = 950;
  room(78, g0, 246, g1 - g0, C.kitchen);
  room(334, g0, 130, g1 - g0, C.cellar);
  room(474, g0, 198, g1 - g0, C.living);
  // Kitchen: upper cupboards, hood, tiles, oven, worktop, checker floor, jars.
  o.push(rect(92, 760, 56, 46, C.woodD), rect(250, 760, 60, 46, C.woodD), rect(98, 766, 20, 34, C.wood), rect(122, 766, 20, 34, C.wood), rect(256, 766, 22, 34, C.wood), rect(282, 766, 22, 34, C.wood));
  o.push(poly([[172, 744], [226, 744], [226, 780], [244, 806], [154, 806], [172, 780]], C.grey));
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
    const x = 150 + c * 16, y = 812 + r * 16;
    o.push(rect(x, y, 15, 15, (r + c) % 2 ? C.cream : C.blue));
    if ((r + c) % 2) o.push(star(x + 7.5, y + 7.5, 5, 4, C.blue, 0.4));
  }
  o.push(rect(160, 846, 80, 56, C.grey), rect(168, 862, 64, 32, C.black), rect(170, 852, 60, 6, C.white));
  o.push(rect(90, 846, 64, 10, C.wood), rect(92, 856, 60, 48, C.woodD), rect(246, 846, 70, 10, C.wood), rect(248, 856, 66, 48, C.woodD));
  for (const [x, col] of [[98, C.red], [118, C.gold], [262, C.green], [284, C.orange]]) o.push(rect(x, 828, 14, 18, col), rect(x - 1, 824, 16, 5, C.woodD));
  for (let c = 0; c < 15; c++) o.push(rect(78 + c * 16.4, 904, 16.4, 46, c % 2 ? C.cream : C.woodD));
  for (let c = 0; c < 15; c++) o.push(rect(78 + c * 16.4, 927, 16.4, 23, c % 2 ? C.woodD : C.cream));
  cat(130, 896, C.black, 1);
  lights(84, 318, 750, 10, 10);
  // Cellar: shelves of bottles and a barrel.
  for (const y of [790, 840, 890]) {
    o.push(rect(340, y, 118, 6, C.wood));
    for (let i = 0; i < 6; i++) {
      const x = 346 + i * 19, col = [C.bottle1, C.bottle2, C.bottle3][(i + y) % 3];
      o.push(rect(x, y - 30, 12, 30, col), rect(x + 3, y - 40, 6, 11, col), rect(x + 2, y - 20, 8, 9, C.cream));
    }
  }
  o.push(ellipse(400, 925, 34, 22, C.wood), rect(366, 908, 68, 8, C.woodD), rect(366, 930, 68, 8, C.woodD));
  o.push(rect(395, 744, 10, 14, C.black), poly([[384, 758], [416, 758], [410, 766], [390, 766]], C.gold));
  // Living room: Christmas tree with baubles and lights, presents, window, paper chain, dog.
  windowCurtains(590, 770, 58, 70, C.sky2, C.red);
  chain(480, 666, 754, 14, [C.gold, C.greenL]);
  o.push(pine(540, 930, 170, 110, [C.green, C.pineD], R, { tiers: 5, trunk: C.woodD }));
  o.push(star(540, 762, 13, 5, C.gold, 0.45));
  for (let i = 0; i < 16; i++) {
    const y = 800 + R() * 100, half = (y - 770) * 0.36, x = 540 + (R() * 2 - 1) * half * 0.7;
    o.push(circle(x, y, i % 3 ? 4.5 : 7, [C.red, C.gold, C.blue, C.white, C.pinkL][i % 5]));
  }
  presents(484, 948, [[0, 30, 24, C.red, C.gold], [34, 24, 18, C.blue, C.white], [92, 28, 22, C.gold, C.red], [124, 22, 16, C.purpleL, C.green]]);
  o.push(ellipse(632, 930, 26, 12, C.wood), circle(654, 914, 11, C.wood), ellipse(660, 916, 6, 10, C.woodD), rect(612, 932, 6, 16, C.wood), rect(644, 932, 6, 16, C.wood));
  lights(480, 584, 746, 8, 6);

  // ---- Snow outside, front step and a little path ----
  o.push(path(smoothPath([[-20, 956], [120, 950], [375, 962], [620, 952], [780, 958], [780, 1020], [-20, 1020]]), C.snow));
  o.push(path(smoothPath([[-20, 982], [180, 974], [380, 988], [560, 976], [780, 984], [780, 1020], [-20, 1020]]), C.snowSh));
  o.push(pine(30, 960, 120, 60, [C.pineD], R, { tiers: 4, snow: C.snow }), pine(720, 960, 120, 60, [C.pineD], R, { tiers: 4, snow: C.snow }));
  return svg(g(o), C.sky1);
}
