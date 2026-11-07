// A robin on a snowy branch with holly, against soft winter-green bokeh and snowflakes.
import { svg, rect, circle, ellipse, path, poly, g, smoothPath, star, rng, W, H } from './common.mjs';

export function hollyLeaf(cx, cy, len, wid, angle, dark, light, spikes = 4) {
  // Leaf along +x before rotation; spiky edge on both sides; top half lighter.
  const top = [], bot = [];
  for (let i = 0; i <= spikes * 2; i++) {
    const t = i / (spikes * 2);
    const x = -len / 2 + t * len;
    const env = Math.sin(Math.PI * t) ** 0.7 * wid / 2;
    const k = i % 2 ? 0.62 : 1.0;
    top.push([x, -env * k]);
    bot.push([x, env * k]);
  }
  const tf = `rotate(${angle} ${cx} ${cy}) translate(${cx} ${cy})`;
  const full = [...top, ...bot.reverse()];
  return g([
    poly(full, dark),
    poly([...top, [len / 2, 0], [-len / 2, 0]], light),
  ], tf);
}

export function berries(cx, cy, r, red, shine, n = 3) {
  const o = [];
  const offs = [[0, 0], [r * 1.6, r * 0.5], [r * 0.6, r * 1.6], [-r * 1.0, r * 1.3]].slice(0, n);
  for (const [dx, dy] of offs) {
    o.push(circle(cx + dx, cy + dy, r, red));
    o.push(circle(cx + dx - r * 0.35, cy + dy - r * 0.35, r * 0.3, shine));
  }
  return o.join('\n');
}

export default function robin() {
  const R = rng(11);
  const C = {
    bg: '#2d5a4a', bok1: '#41775f', bok2: '#5a8c72', bok3: '#1d4134', bok4: '#7ba58b', pine: '#173f2c', pineL: '#2c6a45',
    flake: '#f4f6f2', snow: '#f7f6f1', snowSh: '#cfdbe0',
    branch: '#5b4232', bark: '#7a5a43', barkD: '#3e2c22',
    back: '#8a6b4c', backD: '#6d533b', backL: '#a8875f', grey: '#a9adb0',
    breast: '#e0662f', breastL: '#ef8a4c', belly: '#f2ece0', bellySh: '#dcd3c3',
    eye: '#1f1a19', beak: '#3a302c', leg: '#9a6b5a',
    holly: '#1f5a36', hollyL: '#3d8a50', berry: '#c8202f', shine: '#f6b3a8',
  };
  const o = [rect(0, 0, W, H, C.bg)];

  // Bokeh circles.
  for (let i = 0; i < 34; i++) {
    const x = R() * W, y = R() * H, r = 30 + R() * 80;
    const col = [C.bok1, C.bok2, C.bok3, C.bok1, C.bok4][i % 5];
    o.push(circle(x, y, r, col));
  }
  // Snowflakes: six-pointed stars of varying size.
  for (let i = 0; i < 64; i++) {
    const x = R() * W, y = R() * H, r = 7 + R() * 14;
    o.push(star(x, y, r, 6, C.flake, 0.35, R()));
  }

  // Branch.
  const br = smoothPath([[-30, 742], [150, 718], [330, 706], [480, 690], [640, 662], [790, 630], [790, 668], [640, 704], [480, 734], [330, 752], [150, 766], [-30, 790]]);
  o.push(path(br, C.branch));
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 85 + R() * 20, y = 760 - x * 0.11;
    o.push(path(smoothPath([[x, y - 6], [x + 40, y - 12], [x + 70, y - 10], [x + 40, y - 4]]), i % 2 ? C.bark : C.barkD));
  }
  // Twig up to the right.
  o.push(path(smoothPath([[600, 676], [660, 600], [720, 540], [735, 548], [676, 612], [630, 682]]), C.branch));
  // Snow on the branch.
  o.push(path(smoothPath([[-30, 738], [40, 712], [120, 718], [200, 700], [280, 708], [300, 716], [200, 724], [100, 730], [-30, 748]]), C.snow));
  o.push(path(smoothPath([[420, 696], [500, 672], [580, 676], [660, 650], [760, 628], [790, 622], [790, 640], [660, 664], [520, 690]]), C.snow));
  o.push(path(smoothPath([[40, 728], [120, 722], [200, 712], [120, 734]]), C.snowSh));
  o.push(path(smoothPath([[540, 684], [620, 670], [700, 652], [620, 680]]), C.snowSh));
  o.push(path(smoothPath([[655, 604], [690, 566], [728, 538], [735, 552], [690, 590]]), C.snow));

  // Holly sprigs.
  o.push(hollyLeaf(120, 790, 150, 64, 25, C.holly, C.hollyL));
  o.push(hollyLeaf(60, 700, 140, 60, -35, C.holly, C.hollyL));
  o.push(hollyLeaf(190, 690, 130, 56, -70, C.holly, C.hollyL));
  o.push(berries(118, 718, 15, C.berry, C.shine, 4));
  o.push(hollyLeaf(640, 740, 140, 60, 20, C.holly, C.hollyL));
  o.push(hollyLeaf(700, 700, 130, 56, -40, C.holly, C.hollyL));
  o.push(berries(650, 690, 14, C.berry, C.shine, 3));

  // ---- Robin (facing left) ----
  // Tail.
  o.push(poly([[520, 560], [690, 610], [700, 640], [680, 660], [510, 615]], C.backD));
  o.push(poly([[530, 585], [690, 630], [684, 650], [520, 610]], C.back));
  // Body.
  o.push(ellipse(410, 540, 165, 128, C.back, 'transform="rotate(-12 410 540)"'));
  // Head.
  o.push(circle(300, 410, 92, C.back));
  // Grey band, then the orange face and breast.
  o.push(path(smoothPath([[220, 360], [270, 345], [320, 380], [345, 450], [370, 530], [360, 610], [300, 640], [235, 600], [205, 520], [205, 440]]), C.grey));
  o.push(path(smoothPath([[222, 372], [262, 360], [305, 392], [325, 455], [345, 530], [335, 600], [290, 625], [240, 590], [215, 520], [212, 440]]), C.breast));
  o.push(path(smoothPath([[245, 470], [290, 470], [310, 530], [300, 585], [262, 590], [240, 540]]), C.breastL));
  // Belly.
  o.push(path(smoothPath([[300, 620], [345, 560], [420, 560], [500, 590], [520, 640], [450, 670], [360, 668]]), C.belly));
  o.push(path(smoothPath([[360, 650], [430, 640], [500, 625], [470, 662], [400, 670]]), C.bellySh));
  // Feather texture on the back and crown.
  for (let y = 350; y < 540; y += 26) {
    for (let x = 250 + ((y / 26) % 2) * 15; x < 560; x += 32) {
      const inBody = ((x - 410) / 150) ** 2 + ((y - 535) / 115) ** 2 < 1;
      const inHead = (x - 300) ** 2 + (y - 410) ** 2 < 80 ** 2;
      const onFace = x < 330 && y > 360;
      if ((inBody || inHead) && !onFace && y < 560 - (x - 300) * 0.1) o.push(ellipse(x, y, 13, 8, C.backL, `transform="rotate(-12 ${x} ${y})"`));
    }
  }
  // Wing with feathers.
  o.push(ellipse(470, 515, 120, 72, C.backD, 'transform="rotate(-18 470 515)"'));
  for (let i = 0; i < 5; i++) {
    const x = 420 + i * 30, y = 548 - i * 8;
    o.push(ellipse(x + 40, y + 8, 70, 15, i % 2 ? C.back : C.backL, `transform="rotate(${-14 - i * 2} ${x + 40} ${y + 8})"`));
  }
  for (let i = 0; i < 6; i++) o.push(ellipse(410 + i * 24, 500 - i * 8, 16, 11, i % 2 ? C.backL : C.back, `transform="rotate(-18 ${410 + i * 24} ${500 - i * 8})"`));
  for (let i = 0; i < 5; i++) o.push(ellipse(420 + i * 26, 523 - i * 8, 14, 9, i % 2 ? C.back : C.backL, `transform="rotate(-18 ${420 + i * 26} ${523 - i * 8})"`));
  // Eye and beak.
  o.push(circle(268, 396, 15, C.eye), circle(263, 391, 5, C.flake));
  o.push(poly([[214, 402], [168, 414], [212, 426]], C.beak));
  // Legs and toes.
  o.push(rect(360, 655, 9, 48, C.leg), rect(408, 655, 9, 46, C.leg));
  o.push(poly([[340, 702], [390, 700], [392, 709], [340, 711]], C.leg), poly([[390, 698], [440, 696], [442, 705], [390, 707]], C.leg));

  // Pine sprig in the bottom corner.
  const sprig = (sx, sy, ang, len) => {
    const out = [];
    const a = ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
    out.push(poly([[sx - dy * 3, sy + dx * 3], [sx + dx * len - dy * 2, sy + dy * len + dx * 2], [sx + dx * len + dy * 2, sy + dy * len - dx * 2], [sx + dy * 3, sy - dx * 3]], C.branch));
    for (let t = 10; t < len; t += 12) {
      for (const side of [-1, 1]) {
        const bx = sx + dx * t, by = sy + dy * t;
        const na = a + side * 0.75, nl = 46 - t * 0.12;
        const ex = bx + Math.cos(na) * nl, ey = by + Math.sin(na) * nl;
        const px = -Math.sin(na) * 3, py = Math.cos(na) * 3;
        out.push(poly([[bx + px, by + py], [ex, ey], [bx - px, by - py]], (t / 12 + (side > 0 ? 1 : 0)) % 2 < 1 ? C.pine : C.pineL));
      }
    }
    return out.join('\n');
  };
  o.push(sprig(800, 930, 200, 230));
  o.push(sprig(780, 1010, 225, 200));
  o.push(sprig(-40, 960, -15, 220));
  o.push(berries(560, 900, 15, C.berry, C.shine, 4));
  o.push(berries(150, 880, 14, C.berry, C.shine, 3));

  // A few drifting flakes in front.
  for (let i = 0; i < 14; i++) o.push(circle(R() * W, R() * H, 4 + R() * 4, C.flake));
  return svg(g(o));
}
