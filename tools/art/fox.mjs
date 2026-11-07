// A fox sitting in the snow among birch trees at a pink winter dusk.
import { svg, rect, circle, ellipse, path, poly, g, smoothPath, band, star, pine, rng, W, H } from './common.mjs';

export default function fox() {
  const R = rng(31);
  const C = {
    sky1: '#e9b9b4', sky2: '#f2d2c7', sky3: '#f8e6d8', sun: '#fff1d6',
    hill1: '#c9d6e8', hill2: '#aebfd8', pineD: '#5f7f8f', pineL: '#7d9aa8',
    snow: '#f8f9fc', sh1: '#d5e0ef', sh2: '#b8c8e0',
    birch: '#f4f1ea', birchSh: '#d8d2c6', mark: '#3b3534',
    fox: '#d9652a', foxD: '#b04c1f', foxL: '#ec8d4a', white: '#fbf7f0', dark: '#2e211c', inner: '#f3d7bd',
    grass: '#c8a46a', grassD: '#9b7a45', berry: '#c8323a', twig: '#6a4a3a',
  };
  const o = [rect(0, 0, W, H, C.sky1)];
  o.push(band(0, W, 200, 30, 6, H, C.sky2, R, 1), band(0, W, 330, 26, 6, H, C.sky3, R, 2));
  o.push(circle(200, 390, 60, C.sun));
  // Hills with pale pines.
  o.push(path(smoothPath([[-20, 470], [150, 420], [330, 455], [520, 410], [780, 450], [780, 600], [-20, 600]]), C.hill1));
  for (let i = 0; i < 18; i++) {
    const x = i * 44 + R() * 20, base = 470 + R() * 20 - Math.sin(i * 0.5) * 20;
    o.push(pine(x, base, 70 + R() * 30, 34, [i % 2 ? C.pineD : C.pineL], R, { tiers: 3 }));
  }
  o.push(path(smoothPath([[-20, 520], [200, 490], [420, 520], [620, 495], [780, 515], [780, 640], [-20, 640]]), C.hill2));
  o.push(path(smoothPath([[-20, 560], [180, 540], [400, 575], [600, 545], [780, 565], [780, 1020], [-20, 1020]]), C.snow));

  // Birch trees.
  const birch = (x, w, top, base) => {
    const out = [rect(x, top, w, base - top, C.birch), rect(x + w * 0.62, top, w * 0.38, base - top, C.birchSh)];
    for (let y = top + 20; y < base - 20; y += 30 + R() * 40) {
      const mw = w * (0.3 + R() * 0.5), mx = x + (R() < 0.5 ? 0 : w - mw);
      out.push(path(smoothPath([[mx, y], [mx + mw, y - 3], [mx + mw * 0.9, y + 7], [mx + mw * 0.1, y + 8]]), C.mark));
    }
    out.push(path(smoothPath([[x - 18, base], [x + w / 2, base - 18], [x + w + 18, base], [x + w / 2, base + 8]]), C.sh1));
    return out.join('\n');
  };
  o.push(birch(40, 44, -10, 760), birch(140, 30, -10, 640), birch(610, 50, -10, 800), birch(700, 32, -10, 660), birch(520, 22, 100, 600));
  // Branches on birches.
  o.push(poly([[84, 200], [170, 130], [176, 138], [84, 214]], C.mark), poly([[610, 260], [520, 180], [514, 188], [610, 276]], C.mark));

  // Snow shadows and tufts of grass.
  o.push(path(smoothPath([[-20, 830], [150, 800], [260, 840], [120, 870], [-20, 870]]), C.sh1));
  o.push(path(smoothPath([[480, 900], [640, 870], [780, 890], [780, 940], [600, 940]]), C.sh1));
  const tuft = (x, y) => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const a = -1.1 + i * 0.36, l = 40 + R() * 30;
      out.push(poly([[x - 4 + i * 1.5, y], [x + Math.sin(a) * l, y - Math.cos(a) * l], [x + 4 + i * 1.5, y]], i % 2 ? C.grass : C.grassD));
    }
    return out.join('\n');
  };
  [[90, 900], [230, 980], [560, 960], [700, 860], [470, 700], [300, 640]].forEach(([x, y]) => o.push(tuft(x, y)));
  // A snowy bush with berries.
  o.push(circle(660, 760, 55, C.twig), circle(610, 790, 40, C.twig), circle(710, 800, 45, C.twig));
  o.push(path(smoothPath([[560, 780], [600, 740], [650, 705], [700, 720], [755, 770], [700, 760], [640, 750]]), C.snow));
  for (let i = 0; i < 9; i++) o.push(circle(590 + R() * 150, 770 + R() * 50, 7, C.berry));

  // ---- Fox ----
  // Shadow in the snow.
  o.push(ellipse(420, 850, 220, 32, C.sh2));
  // Tail wrapping round the front.
  o.push(path(smoothPath([[460, 740], [570, 700], [660, 730], [670, 800], [600, 850], [470, 862], [350, 852], [290, 832], [320, 808], [430, 815], [540, 795], [580, 765], [520, 760]]), C.fox));
  o.push(path(smoothPath([[540, 720], [620, 720], [660, 770], [640, 800], [610, 760]]), C.foxD));
  o.push(path(smoothPath([[288, 832], [318, 806], [372, 816], [366, 852], [318, 850]]), C.white));
  // Body.
  o.push(path(smoothPath([[320, 470], [282, 560], [266, 680], [292, 790], [380, 812], [470, 790], [496, 680], [482, 560], [440, 470]]), C.fox));
  o.push(path(smoothPath([[440, 480], [482, 565], [496, 680], [474, 790], [452, 700], [458, 590]]), C.foxD));
  o.push(path(smoothPath([[330, 480], [380, 505], [430, 480], [446, 565], [424, 660], [380, 700], [336, 660], [316, 565]]), C.white));
  for (let i = 0; i < 5; i++) o.push(poly([[340 + i * 18, 650 + Math.abs(2 - i) * -8], [349 + i * 18, 690 - Math.abs(2 - i) * 8], [358 + i * 18, 650 + Math.abs(2 - i) * -8]], C.white));
  // Front legs.
  for (const lx of [338, 394]) {
    o.push(rect(lx, 640, 34, 120, C.foxL), rect(lx, 730, 34, 78, C.dark));
    o.push(ellipse(lx + 17, 810, 24, 11, C.dark));
  }
  // Ears (behind head).
  o.push(poly([[300, 395], [280, 275], [356, 350]], C.dark), poly([[460, 395], [480, 275], [404, 350]], C.dark));
  o.push(poly([[304, 392], [290, 302], [350, 352]], C.fox), poly([[456, 392], [470, 302], [410, 352]], C.fox));
  o.push(poly([[312, 378], [298, 318], [338, 356]], C.inner), poly([[448, 378], [462, 318], [422, 356]], C.inner));
  // Head.
  o.push(path(smoothPath([[300, 385], [340, 342], [380, 334], [420, 342], [460, 385], [474, 425], [440, 458], [400, 484], [380, 492], [360, 484], [320, 458], [286, 425]]), C.fox));
  o.push(path(smoothPath([[360, 345], [380, 338], [400, 345], [392, 400], [380, 420], [368, 400]]), C.foxL));
  o.push(path(smoothPath([[286, 428], [322, 440], [356, 450], [380, 455], [404, 450], [438, 440], [474, 428], [440, 462], [404, 488], [380, 496], [356, 488], [320, 462]]), C.white));
  o.push(ellipse(380, 478, 15, 11, C.dark));
  o.push(ellipse(343, 408, 15, 8, C.dark, 'transform="rotate(18 343 408)"'), ellipse(417, 408, 15, 8, C.dark, 'transform="rotate(-18 417 408)"'));
  o.push(circle(339, 405, 3.5, C.white), circle(413, 405, 3.5, C.white));

  // Falling snow.
  for (let i = 0; i < 60; i++) {
    const x = R() * W, y = R() * 760;
    o.push(R() < 0.25 ? star(x, y, 7 + R() * 5, 6, C.snow, 0.35, R()) : circle(x, y, 3 + R() * 3.5, C.snow));
  }
  return svg(g(o));
}
