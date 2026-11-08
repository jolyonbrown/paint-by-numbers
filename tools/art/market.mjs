// A Christmas market at night, drawn in true perspective: a cobbled street of wooden stalls with
// snowy roofs, fir garlands, striped awnings and glowing goods (gingerbread hearts, striped glass
// baubles, candles, wreaths, sweets), shoppers in winter coats, star lanterns and strings of lights
// across the street, gabled townhouses with lit windows, a blue-lit Ferris wheel, a clock tower and
// a tall Christmas tree in the square. Inspired by festive market photos, not copied from them.
import { svg, rect, circle, ellipse, path, poly, g, smoothPath, star, rng, W } from './common.mjs';

// ---- Camera: world metres (X right, Y up, Z away) -> screen px ----
const VPX = 375, VPY = 610, F = 360, CAM = 1.7;
const P = (X, Y, Z) => [VPX + (F * X) / Z, VPY + (F * (CAM - Y)) / Z];
const k = (Z) => F / Z; // px per metre at depth Z
const f1 = (n) => +n.toFixed(1);
const polyP = (pts, fill, extra = '') => poly(pts.map(([X, Y, Z]) => P(X, Y, Z)), fill, extra);
/** Quad on the plane X = const (a side face), spanning Z0..Z1 and Y0..Y1. */
const faceX = (X, Z0, Z1, Y0, Y1, fill) => polyP([[X, Y0, Z0], [X, Y0, Z1], [X, Y1, Z1], [X, Y1, Z0]], fill);
/** Quad on the plane Z = const (facing the camera). */
const faceZ = (Z, X0, X1, Y0, Y1, fill) => polyP([[X0, Y0, Z], [X1, Y0, Z], [X1, Y1, Z], [X0, Y1, Z]], fill);

const heart = (cx, cy, s, fill) => path(`M${f1(cx)},${f1(cy + 0.36 * s)}C${f1(cx - 0.62 * s)},${f1(cy - 0.02 * s)} ${f1(cx - 0.46 * s)},${f1(cy - 0.56 * s)} ${f1(cx)},${f1(cy - 0.24 * s)}C${f1(cx + 0.46 * s)},${f1(cy - 0.56 * s)} ${f1(cx + 0.62 * s)},${f1(cy - 0.02 * s)} ${f1(cx)},${f1(cy + 0.36 * s)}Z`, fill);

export default function market() {
  const R = rng(2024);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const C = {
    sky1: '#0c1130', sky2: '#141c46', sky3: '#1e2960', starC: '#fff4c8', snow: '#f5f7fc', snowSh: '#c6d0e4',
    light: '#ffd45e', lightPale: '#fff3b8', glow1: '#f7a83d', glow2: '#b9622c', amber: '#f0892a',
    ferris: '#3d86f5', ferrisL: '#a6cdff', ferrisD: '#1b2a5e',
    tower: '#d8894c', towerSh: '#a65b34', slate: '#323855', cream: '#f2e5c6',
    bld1: '#c47667', bld2: '#d5ad66', bld3: '#8ca3b0', bld4: '#b18aab', bld5: '#9a6a4f', win: '#ffcd62', winD: '#2a3157', roof: '#3a2e3e',
    wood: '#8a552f', woodL: '#b8763d', woodD: '#55331e', inside: '#e9a24f',
    red: '#c92e35', redD: '#8a1e29', white: '#fbf5ea', green: '#2c6a3d', greenL: '#4f9a54', greenD: '#1d4a2c',
    gold: '#e6b03c', pink: '#ea849c', purple: '#7a4e9a', teal: '#2e8e8c', blue: '#3a62b0',
    cob1: '#45465a', cob2: '#5a596c', cob3: '#6b6676', wet: '#a37a52', street: '#3a3a4e',
    ginger: '#b5672c', icing: '#fbf2e2', skin: '#e2b28c', hair: '#4a3022', hair2: '#c99a5b',
    coat1: '#6b4834', coat2: '#c49a63', coat3: '#2f3a68', coat4: '#a32a34', coat5: '#3c6b4a', trousers: '#2a2632',
  };
  const o = [];

  // ---- Sky and stars ----
  o.push(rect(0, 0, W, 1000, C.sky1), rect(0, 230, W, 400, C.sky2), rect(0, 400, W, 300, C.sky3));
  for (let i = 0; i < 70; i++) o.push(R() < 0.7 ? circle(R() * W, R() * 420, 1.6 + R() * 1.6, C.starC) : star(R() * W, R() * 380, 4 + R() * 4, 4, C.starC, 0.35));

  // ---- Far square: row of gabled houses beyond the tree ----
  for (let X = -22; X < 22;) {
    const w = 4.5 + R() * 2.5, h = 10 + R() * 5, Z = 62;
    const col = pick([C.bld1, C.bld2, C.bld3, C.bld4, C.bld5]);
    o.push(polyP([[X, 0, Z], [X + w, 0, Z], [X + w, h, Z], [X + w / 2, h + 3, Z], [X, h, Z]], col));
    for (let fy = 2.5; fy < h - 1.5; fy += 3) for (let fx = 0.8; fx < w - 1; fx += 1.6) {
      o.push(faceZ(Z, X + fx, X + fx + 0.8, fy, fy + 1.3, R() < 0.6 ? C.win : C.winD));
    }
    X += w + 0.2;
  }

  // ---- Ferris wheel (left, behind the houses) ----
  {
    const [hx, hy] = P(-16, 20, 32), Rr = k(32) * 16;
    o.push(polyP([[-17, 20, 32], [-24, 0, 32], [-22.6, 0, 32]], C.ferrisD), polyP([[-15, 20, 32], [-8, 0, 32], [-9.4, 0, 32]], C.ferrisD));
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), px = -sa * 2.2, py = ca * 2.2;
      o.push(poly([[hx + px, hy + py], [hx + ca * Rr + px * 0.5, hy + sa * Rr + py * 0.5], [hx + ca * Rr - px * 0.5, hy + sa * Rr - py * 0.5], [hx - px, hy - py]], i % 3 ? C.ferris : C.ferrisL));
    }
    const ring = (r1, r2, col) => path(`M${f1(hx - r1)},${f1(hy)}a${f1(r1)},${f1(r1)} 0 1,0 ${f1(2 * r1)},0a${f1(r1)},${f1(r1)} 0 1,0 ${f1(-2 * r1)},0ZM${f1(hx - r2)},${f1(hy)}a${f1(r2)},${f1(r2)} 0 1,1 ${f1(2 * r2)},0a${f1(r2)},${f1(r2)} 0 1,1 ${f1(-2 * r2)},0Z`, col, 'fill-rule="evenodd"');
    o.push(ring(Rr + 4, Rr - 4, C.ferris), ring(Rr * 0.72 + 3, Rr * 0.72 - 3, C.ferrisL));
    for (let i = 0; i < 54; i++) { const a = (i / 54) * Math.PI * 2; o.push(circle(hx + Math.cos(a) * Rr, hy + Math.sin(a) * Rr, 2.4, i % 3 ? C.light : C.white)); }
    o.push(circle(hx, hy, 15, C.ferrisD), circle(hx, hy, 7, C.light));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.13, gx = hx + Math.cos(a) * Rr, gy = hy + Math.sin(a) * Rr;
      o.push(rect(gx - 1.2, gy, 2.4, 10, C.ferrisD), path(`M${f1(gx - 12)},${f1(gy + 10)}h24v12a5,5 0 0 1 -5,5h-14a5,5 0 0 1 -5,-5z`, [C.red, C.gold, C.teal, C.pink, C.greenL, C.purple][i % 6]), rect(gx - 8, gy + 13, 16, 6, C.lightPale));
    }
  }

  // ---- Clock tower (right) ----
  {
    const Z = 26, X0 = 7.5, X1 = 12.5;
    o.push(faceX(X0, Z, Z + 5, 0, 30, C.towerSh));
    o.push(faceZ(Z, X0, X1, 0, 30, C.tower));
    o.push(polyP([[X0 - 0.3, 30, Z], [X1 + 0.3, 30, Z], [(X0 + X1) / 2, 42, Z + 2.5]], C.slate), polyP([[X0 - 0.3, 30, Z], [(X0 + X1) / 2, 42, Z + 2.5], [X0 - 0.3, 30, Z + 5]], C.roof));
    const [sx, sy] = P((X0 + X1) / 2, 42.3, Z + 2.5);
    o.push(circle(sx, sy, 4, C.gold));
    o.push(faceZ(Z, X0 - 0.4, X1 + 0.4, 29, 30, C.cream), faceZ(Z, X0 - 0.4, X1 + 0.4, 17, 17.6, C.cream));
    const [cx, cy] = P((X0 + X1) / 2, 23, Z), cr = k(Z) * 1.7;
    o.push(circle(cx, cy, cr + 4, C.gold), circle(cx, cy, cr, C.cream));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; o.push(circle(cx + Math.cos(a) * cr * 0.82, cy + Math.sin(a) * cr * 0.82, 1.4, C.slate)); }
    o.push(poly([[cx - 1.5, cy], [cx + 1.5, cy], [cx + 0.5, cy - cr * 0.7], [cx - 0.5, cy - cr * 0.7]], C.slate), poly([[cx, cy - 1.5], [cx, cy + 1.5], [cx + cr * 0.5, cy + 0.5], [cx + cr * 0.5, cy - 0.5]], C.slate));
    for (const Y of [12, 26.2]) for (const X of [X0 + 1, X0 + 3]) {
      o.push(faceZ(Z, X, X + 1, Y, Y + 2, Y > 20 ? C.winD : C.win));
      const [ax, ay] = P(X + 0.5, Y + 2, Z);
      o.push(circle(ax, ay, k(Z) * 0.5, Y > 20 ? C.winD : C.win));
    }
    for (let i = 0; i < 9; i++) { const [lx, ly] = P(X0 - 0.4 + i * 0.66, 29.5, Z); o.push(circle(lx, ly + 3, 2.2, C.light)); }
  }

  // ---- Christmas tree in the square ----
  {
    const Z = 44, H0 = 0.4, Ht = 16;
    const tiers = 7;
    o.push(faceZ(Z, -0.5, 0.5, 0, 1.2, C.woodD));
    for (let t = 0; t < tiers; t++) {
      const yb = H0 + t * (Ht / tiers) * 0.95, yt = yb + (Ht / tiers) * 1.5, half = 4.4 * (1 - t / tiers) + 0.3;
      const pts = [[0, yt, Z]];
      for (let i = 0; i <= 8; i++) pts.push([half - (2 * half * i) / 8, yb + (i % 2 ? 0.35 : 0), Z]);
      o.push(polyP(pts, t % 2 ? C.green : C.greenD));
    }
    for (let i = 0; i < 60; i++) {
      const Y = H0 + 0.6 + R() * (Ht - 1.5), half = 4.2 * (1 - (Y - H0) / (Ht + 1)), X = (R() * 2 - 1) * half * 0.85;
      const [bx, by] = P(X, Y, Z);
      o.push(circle(bx, by, i % 4 ? 1.8 : 3, pick([C.light, C.lightPale, C.red, C.gold, C.white])));
    }
    const [tx, ty] = P(0, H0 + Ht + 1.6, Z);
    o.push(circle(tx, ty, 13, C.glow2), star(tx, ty, 10, 5, C.light, 0.45));
  }

  // ---- Townhouses along both sides ----
  const houses = (side) => {
    const X = side * 6.6;
    const spans = side < 0 ? [[3.5, 8, 11, C.bld1], [8, 12.5, 13, C.bld2], [12.5, 16.5, 10, C.bld4], [16.5, 21.5, 12, C.bld3], [21.5, 25, 9, C.bld5]]
      : [[3.5, 7.5, 12, C.bld3], [7.5, 12, 10, C.bld5], [12, 17, 13, C.bld1], [17, 20.5, 10.5, C.bld2], [20.5, 24.5, 9, C.bld4]];
    for (const [Z0, Z1, h, col] of spans.slice().reverse()) {
      const Zm = (Z0 + Z1) / 2;
      o.push(polyP([[X, 0, Z0], [X, 0, Z1], [X, h, Z1], [X, h + 2.6, Zm], [X, h, Z0]], col));
      o.push(polyP([[X, h, Z0], [X, h + 2.6, Zm], [X, h + 2.9, Zm], [X, h + 0.25, Z0 - 0.15]], C.roof));
      o.push(polyP([[X, h + 2.6, Zm], [X, h, Z1], [X, h + 0.25, Z1 + 0.15], [X, h + 2.9, Zm]], C.roof));
      // windows on each floor, with sills
      for (let fy = 4; fy < h - 1.2; fy += 3) {
        for (const u of [0.18, 0.55]) {
          const za = Z0 + (Z1 - Z0) * u, zb = za + (Z1 - Z0) * 0.24;
          const lit = R() < 0.65;
          o.push(faceX(X, za, zb, fy, fy + 1.6, lit ? C.win : C.winD));
          if (lit && Z0 < 15) o.push(faceX(X, za, zb, fy + 0.75, fy + 0.85, C.woodD), faceX(X, (za + zb) / 2 - 0.05, (za + zb) / 2 + 0.05, fy, fy + 1.6, C.woodD));
          o.push(faceX(X, za - 0.1, zb + 0.1, fy - 0.15, fy, C.cream));
          if (Z0 < 14) {
            const sh = col === C.bld3 ? C.redD : C.green;
            o.push(faceX(X, za - 0.42, za - 0.08, fy, fy + 1.6, sh), faceX(X, zb + 0.08, zb + 0.42, fy, fy + 1.6, sh));
            o.push(faceX(X, za - 0.05, zb + 0.05, fy - 0.55, fy - 0.15, C.woodD), faceX(X, za - 0.08, zb + 0.08, fy - 0.2, fy - 0.12, C.snow));
            for (let q = 0; q < 3; q++) { const [px, py] = P(X, fy - 0.12, za + ((zb - za) * (q + 0.5)) / 3); o.push(circle(px, py, k(za) * 0.08, q % 2 ? C.greenL : C.red)); }
          }
        }
      }
      // half-timbering on some houses
      if (col === C.bld1 || col === C.bld4) {
        for (let fy = 3.3; fy < h; fy += 3) o.push(faceX(X, Z0, Z1, fy, fy + 0.22, C.woodD));
        for (const u of [0.02, 0.98]) { const z = Z0 + (Z1 - Z0) * u; o.push(faceX(X, z - 0.12, z + 0.12, 3.3, h, C.woodD)); }
        for (let fy = 3.5; fy < h - 2.8; fy += 3) {
          for (const [ua, ub] of [[0.02, 0.15], [0.85, 0.98]]) {
            const za = Z0 + (Z1 - Z0) * ua, zb = Z0 + (Z1 - Z0) * ub;
            o.push(polyP([[X, fy, za], [X, fy, za + 0.2], [X, fy + 2.7, zb], [X, fy + 2.7, zb - 0.2]], C.woodD));
          }
        }
      }
      // lights along the gable edges
      for (let i = 0; i <= 10; i++) {
        const t = i / 10, Zl = t < 0.5 ? Z0 + (Zm - Z0) * t * 2 : Zm + (Z1 - Zm) * (t - 0.5) * 2, Yl = t < 0.5 ? h + 2.6 * t * 2 : h + 2.6 * (1 - (t - 0.5) * 2);
        const [lx, ly] = P(X, Yl - 0.15, Zl);
        o.push(circle(lx, ly, Math.max(1.8, k(Zl) * 0.09), i % 2 ? C.light : C.white));
      }
      // little round window in the gable
      const [gx, gy] = P(X, h + 1.1, Zm);
      o.push(circle(gx, gy, Math.max(2, k(Zm) * 0.45), R() < 0.5 ? C.win : C.winD));
      // snow on the roof ridge
      o.push(polyP([[X, h + 0.25, Z0 - 0.15], [X, h + 2.9, Zm], [X, h + 3.15, Zm], [X, h + 0.45, Z0 - 0.15]], C.snow));
    }
  };
  houses(-1); houses(1);

  // ---- Street: snowy far part, then cobbles near the camera ----
  o.push(poly([[0, VPY + 6], [W, VPY + 6], [W, 1000], [0, 1000]], C.street));
  o.push(polyP([[-6.6, 0, 26], [6.6, 0, 26], [6.6, 0, 4.6], [-6.6, 0, 4.6]], C.cob2));
  // footprint-trodden snow streaks and warm reflections in the far street
  for (let i = 0; i < 26; i++) {
    const Z = 4.8 + R() * 18, X = (R() * 2 - 1) * 1.8, len = 0.6 + R() * 1.5, wid = 0.12 + R() * 0.2;
    o.push(polyP([[X - wid, 0, Z], [X + wid, 0, Z], [X + wid * 0.8, 0, Z + len], [X - wid * 0.8, 0, Z + len]], R() < 0.55 ? C.snow : C.wet));
  }
  // cobbles
  for (let Z = 1.0, row = 0; Z < 4.6; row++) {
    const dz = 0.16 + Z * 0.04;
    const sw = 0.26 + Z * 0.05;
    let X = -2.6 + (row % 2) * sw * 0.5 - sw;
    while (X < 2.6) {
      const x0 = X + 0.03, x1 = X + sw - 0.03, z0 = Z + 0.025, z1 = Z + dz - 0.025;
      const nearStall = Math.abs(X + sw / 2) > 1.4;
      const col = nearStall && R() < 0.45 ? C.wet : pick([C.cob1, C.cob2, C.cob3, C.cob1]);
      o.push(polyP([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], col));
      X += sw;
    }
    Z += dz;
  }
  // snow patches and a trail of footprints on the cobbles
  for (const [X, Z, wd, ln] of [[-1.2, 1.5, 0.22, 0.25], [1.0, 2.4, 0.2, 0.3], [-0.6, 3.6, 0.25, 0.35], [1.5, 1.25, 0.18, 0.2], [0.3, 1.9, 0.14, 0.18], [-1.6, 2.9, 0.2, 0.3]]) {
    const pts = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, rr = 0.75 + R() * 0.35; pts.push(P(X + Math.cos(a) * wd * rr, 0, Z + Math.sin(a) * ln * rr)); }
    o.push(path(smoothPath(pts), C.snow));
  }
  for (let i = 0; i < 9; i++) {
    const Z = 1.25 + i * 0.36, X = -0.15 + (i % 2 ? 0.16 : -0.16) + i * 0.05;
    const [x, y] = P(X, 0, Z);
    o.push(ellipse(x, y, k(Z) * 0.055, k(Z) * 0.02, C.snowSh));
  }

  // snow drifts along the stall fronts
  for (const s of [-1, 1]) {
    o.push(polyP([[s * 2.35, 0, 0.9], [s * 2.35, 0, 22], [s * 1.9, 0, 22], [s * 1.6, 0, 12], [s * 1.8, 0, 5], [s * 1.55, 0, 0.9]], C.snow));
    o.push(polyP([[s * 2.35, 0, 0.9], [s * 2.35, 0, 22], [s * 2.1, 0, 22], [s * 1.9, 0, 9], [s * 2.0, 0, 0.9]], C.snowSh));
  }

  // ---- Strings of lights and star lanterns across the street ----
  const string = (Z, Y, sag, n) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push(P(-6.6 + 13.2 * t, Y - Math.sin(Math.PI * t) * sag, Z)); }
    o.push(`<path d="M${pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' L')}" fill="none" stroke="#2b2421" stroke-width="1.2"/>`);
    pts.forEach(([x, y], i) => { if (i % 1 === 0) o.push(circle(x, y + 2, Math.max(2.2, k(Z) * 0.13), i % 3 === 0 ? C.white : i % 3 === 1 ? C.light : C.amber)); });
  };
  string(24, 8.5, 1.2, 22); string(18, 8.2, 1.3, 22); string(13, 8.0, 1.4, 24); string(9, 7.6, 1.5, 26);
  const lantern = (X, Y, Z, r) => {
    const [x, y] = P(X, Y, Z), rr = k(Z) * r;
    const [, wy] = P(X, 8.4, Z);
    o.push(rect(x - 0.8, wy, 1.6, y - wy - rr, C.woodD));
    // An illuminated many-pointed paper star: long points, lit faces, a soft glow behind.
    o.push(circle(x, y, rr * 1.25, C.glow2));
    o.push(star(x, y, rr * 1.7, 9, C.amber, 0.28, -Math.PI / 2));
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 9, b = a + Math.PI / 9;
      o.push(poly([[x, y], [x + Math.cos(a) * rr * 1.7, y + Math.sin(a) * rr * 1.7], [x + Math.cos(b) * rr * 0.48, y + Math.sin(b) * rr * 0.48]], C.light));
    }
    o.push(circle(x, y, rr * 0.3, C.lightPale));
  };
  lantern(1.4, 6.6, 21, 0.75); lantern(-1.3, 6.3, 15, 0.8); lantern(1.5, 6.0, 9.5, 0.7); lantern(-1.1, 6.4, 6.0, 0.55);

  // ---- Market stalls ----
  const goods = {
    // Each takes face(u, v) -> [x, y, Z] over the lit opening, and how many rows/columns fit.
    gingerbread(face, { rows, cols }) {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const u = (c + 0.5 + (r % 2) * 0.3) / (cols + 0.3), v = 0.86 - r * (0.72 / rows);
        const [x, y, Z] = face(u, v), sz = k(Z) * 0.3;
        o.push(rect(x - 0.6, y - sz * 0.75, 1.2, sz * 0.4, C.redD));
        if ((r + c) % 3 === 2) {
          // gingerbread man with icing buttons and smile
          o.push(circle(x, y - sz * 0.25, sz * 0.2, C.ginger), poly([[x - sz * 0.42, y - sz * 0.02], [x + sz * 0.42, y - sz * 0.02], [x + sz * 0.38, y + sz * 0.1], [x + sz * 0.16, y + sz * 0.1], [x + sz * 0.28, y + sz * 0.5], [x + sz * 0.08, y + sz * 0.5], [x, y + sz * 0.28], [x - sz * 0.08, y + sz * 0.5], [x - sz * 0.28, y + sz * 0.5], [x - sz * 0.16, y + sz * 0.1], [x - sz * 0.38, y + sz * 0.1]], C.ginger));
          o.push(circle(x, y + sz * 0.05, Math.max(1.2, sz * 0.05), C.red), circle(x, y + sz * 0.18, Math.max(1.2, sz * 0.05), C.greenL));
          if (sz > 18) o.push(rect(x - sz * 0.38, y + sz * 0.01, sz * 0.14, sz * 0.05, C.icing), rect(x + sz * 0.24, y + sz * 0.01, sz * 0.14, sz * 0.05, C.icing), circle(x - sz * 0.07, y - sz * 0.28, sz * 0.03, C.icing), circle(x + sz * 0.07, y - sz * 0.28, sz * 0.03, C.icing));
        } else {
          // iced gingerbread heart with a sugar flower
          o.push(heart(x, y, sz * 1.15, C.icing), heart(x, y, sz * 0.95, (r + c) % 2 ? C.ginger : C.redD));
          const fc = (r + c) % 2 ? C.pink : C.white;
          if (sz > 16) { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; o.push(circle(x + Math.cos(a) * sz * 0.12, y - sz * 0.02 + Math.sin(a) * sz * 0.12, sz * 0.08, fc)); } o.push(circle(x, y - sz * 0.02, sz * 0.07, C.gold)); }
          else o.push(heart(x, y + sz * 0.02, sz * 0.38, fc));
        }
      }
    },
    baubles(face, { rows, cols }) {
      const sets = [[C.red, C.white, C.gold, C.green, C.red], [C.blue, C.gold, C.red, C.white, C.blue], [C.purple, C.pink, C.white, C.gold, C.teal], [C.green, C.red, C.gold, C.white, C.green], [C.teal, C.white, C.purple, C.gold, C.teal], [C.gold, C.red, C.white, C.blue, C.gold]];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const u = (c + 0.5 + (r % 2) * 0.35) / (cols + 0.4), v = 0.88 - r * (0.74 / rows);
        const [x, y, Z] = face(u, v), sz = k(Z) * (0.24 + ((r + c) % 3) * 0.03);
        const rx = sz * 0.42, ry = sz * 0.5, cy = y;
        const [, topY] = face(u, 1);
        o.push(rect(x - 0.6, topY, 1.2, cy - ry - topY, C.woodD));
        const band = sets[(r * cols + c) % sets.length], nb = 5;
        for (let b = 0; b < nb; b++) {
          const ya = cy - ry + (2 * ry * b) / nb, yb = cy - ry + (2 * ry * (b + 1)) / nb;
          const xs = (yy) => rx * Math.sqrt(Math.max(0, 1 - ((yy - cy) / ry) ** 2));
          const L = [], Rt = [];
          for (let t = 0; t <= 3; t++) { const yy = ya + ((yb - ya) * t) / 3; L.push([x - xs(yy), yy]); Rt.unshift([x + xs(yy), yy]); }
          o.push(poly([...L, ...Rt], band[b]));
        }
        o.push(poly([[x - rx * 0.35, cy + ry], [x + rx * 0.35, cy + ry], [x + rx * 0.25, cy + ry * 1.35], [x - rx * 0.25, cy + ry * 1.35]], C.gold));
      }
    },
    candles(face, { rows, cols }) {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols, v = 0.12 + r * (0.85 / rows);
        const [x, y, Z] = face(u, v), sz = k(Z);
        const h = sz * (0.16 + ((c * 7 + r * 3) % 4) * 0.035), w = sz * 0.06;
        const col = [C.red, C.white, C.gold, C.green, C.purple, C.pink, C.blue][(c + r * 3) % 7];
        o.push(rect(x - w, y - h, 2 * w, h, col), ellipse(x, y - h - sz * 0.04, w * 0.7, sz * 0.05, C.light));
        if (sz > 60) o.push(rect(x - w, y - h * 0.55, 2 * w, h * 0.12, C.gold));
        o.push(rect(x - w * 2.2, y, w * 4.4, sz * 0.03, C.woodD));
      }
    },
    wreaths(face, { rows, cols }) {
      cols = Math.max(3, Math.round(cols * 0.7));
      for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols; c++) {
        const u = (c + 0.5 + (r % 2) * 0.4) / (cols + 0.4), v = 0.78 - r * (0.8 / (rows - 1));
        const [x, y, Z] = face(u, v), rr = k(Z) * 0.2;
        o.push(circle(x, y, rr, (r + c) % 2 ? C.green : C.greenD), circle(x, y, rr * 0.5, C.inside));
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; o.push(circle(x + Math.cos(a) * rr * 0.75, y + Math.sin(a) * rr * 0.75, Math.max(1.4, rr * 0.11), i % 2 ? C.red : C.gold)); }
        o.push(poly([[x, y + rr * 0.85], [x - rr * 0.45, y + rr * 0.6], [x - rr * 0.45, y + rr * 1.1]], C.red), poly([[x, y + rr * 0.85], [x + rr * 0.45, y + rr * 0.6], [x + rr * 0.45, y + rr * 1.1]], C.red));
      }
    },
    sweets(face, { rows, cols }) {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols, v = 0.1 + r * (0.85 / rows);
        const [x, y, Z] = face(u, v), sz = k(Z);
        const jw = sz * 0.1, jh = sz * 0.17;
        o.push(rect(x - jw, y - jh, 2 * jw, jh, C.white), rect(x - jw, y - jh * 0.7, 2 * jw, jh * 0.7, [C.red, C.pink, C.gold, C.green, C.purple, C.teal][(c + r) % 6]), rect(x - jw * 1.1, y - jh - sz * 0.04, jw * 2.2, sz * 0.04, C.woodD));
        if (c % 2 === 0) o.push(rect(x + jw * 1.3, y - jh * 1.8, Math.max(1, sz * 0.015), jh * 1.8, C.white), circle(x + jw * 1.3, y - jh * 1.8, sz * 0.06, [C.pink, C.red, C.greenL][r % 3]));
        o.push(rect(x - jw * 2.4, y, jw * 4.8, sz * 0.03, C.woodD));
      }
    },
  };
  // A shelf of little wrapped boxes and jars along the bottom of every opening.
  const shelfRow = (face, cols) => {
    for (let c = 0; c < cols; c++) {
      const [x, y, Z] = face((c + 0.5) / cols, 0.02), sz = k(Z);
      const w = sz * 0.09, h = sz * (0.09 + (c % 3) * 0.03), col = [C.red, C.green, C.gold, C.blue, C.white, C.purple][c % 6];
      o.push(rect(x - w, y - h, 2 * w, h, col), rect(x - w * 0.2, y - h, w * 0.4, h, col === C.gold ? C.red : C.gold));
    }
  };

  const stall = (s, Z0, Z1, theme, roofCol) => {
    const Xf = s * 2.35, Xb = s * 5.3;
    // end wall facing us
    o.push(polyP([[Xf, 0, Z0], [Xb, 0, Z0], [Xb, 3.6, Z0], [Xf, 3.0, Z0]], C.woodD));
    for (let i = 1; i < 6; i++) { const X = Xf + ((Xb - Xf) * i) / 6; o.push(polyP([[X - s * 0.04, 0, Z0], [X + s * 0.04, 0, Z0], [X + s * 0.04, 3.0 + 0.6 * (i / 6), Z0], [X - s * 0.04, 3.0 + 0.6 * (i / 6), Z0]], C.wood)); }
    // front: lower counter panel, counter top, lit opening, header board
    o.push(faceX(Xf, Z0, Z1, 0, 1.0, C.wood));
    const planks = Math.max(3, Math.round((Z1 - Z0) / 0.45));
    for (let i = 0; i < planks; i += 2) o.push(faceX(Xf, Z0 + ((Z1 - Z0) * i) / planks, Z0 + ((Z1 - Z0) * (i + 1)) / planks, 0.05, 0.95, C.woodL));
    o.push(faceX(Xf, Z0, Z1, 2.45, 3.0, C.woodL));
    for (let z = Z0 + 0.3; z < Z1 - 0.2; z += 0.55) { const [x, y] = P(Xf, 2.72, z); o.push(star(x, y, k(z) * 0.13, 5, (Math.round(z * 2) % 2) ? C.red : C.gold, 0.45)); }
    o.push(faceX(Xf, Z0 + 0.15, Z1 - 0.15, 1.05, 2.45, C.inside));
    o.push(faceX(Xf, Z0, Z0 + 0.15, 1.0, 2.45, C.woodD), faceX(Xf, Z1 - 0.15, Z1, 1.0, 2.45, C.woodD));
    const face = (u, v) => { const Z = Z0 + 0.25 + (Z1 - Z0 - 0.5) * u; const [x, y] = P(Xf, 1.12 + 1.25 * v, Z); return [x, y, Z]; };
    const span = Z1 - Z0;
    const grid = { rows: span > 3 ? 4 : 3, cols: Math.max(4, Math.round(span / 0.42)) };
    goods[theme](face, grid);
    if (span > 2.5 && theme !== 'candles' && theme !== 'sweets') shelfRow(face, Math.round(span / 0.3));
    // counter top with a row of small boxes
    o.push(polyP([[Xf, 1.0, Z0], [Xf, 1.0, Z1], [Xf - s * 0.4, 1.0, Z1], [Xf - s * 0.4, 1.0, Z0]], C.woodL), faceX(Xf - s * 0.4, Z0, Z1, 0.92, 1.0, C.woodD));
    for (let z = Z0 + 0.3; z < Z1 - 0.3; z += 0.55) o.push(faceX(Xf - s * 0.2, z, z + 0.3, 1.0, 1.18, pick([C.red, C.green, C.gold, C.white, C.blue])));
    // fir swag along the counter front, with red bows and little lights
    const sN = Math.max(6, Math.round((Z1 - Z0) / 0.2));
    for (let i = 0; i <= sN; i++) {
      const Z = Z0 + ((Z1 - Z0) * i) / sN, sag = Math.sin(((i % 6) / 6) * Math.PI) * 0.12;
      const [x, y] = P(Xf - s * 0.02, 0.86 - sag, Z);
      o.push(circle(x, y, k(Z) * 0.11, i % 2 ? C.green : C.greenD));
      if (i % 6 === 0) { const r = k(Z) * 0.1; o.push(poly([[x, y], [x - r * 1.6, y - r], [x - r * 1.6, y + r]], C.red), poly([[x, y], [x + r * 1.6, y - r], [x + r * 1.6, y + r]], C.red), circle(x, y, r * 0.5, C.redD)); }
      else if (i % 2 === 0) o.push(circle(x, y + k(Z) * 0.05, Math.max(1.6, k(Z) * 0.04), C.light));
    }
    // striped awning with scalloped edge
    const n = Math.max(4, Math.round((Z1 - Z0) / 0.32));
    for (let i = 0; i < n; i++) {
      const za = Z0 + ((Z1 - Z0) * i) / n, zb = Z0 + ((Z1 - Z0) * (i + 1)) / n;
      const col = i % 2 ? C.white : C.red;
      o.push(polyP([[Xf, 2.55, za], [Xf, 2.55, zb], [Xf - s * 0.75, 2.2, zb], [Xf - s * 0.75, 2.2, za]], col));
      const [ax, ay] = P(Xf - s * 0.75, 2.2, za), [bx, by] = P(Xf - s * 0.75, 2.2, zb);
      const rr = Math.hypot(bx - ax, by - ay) / 2;
      if (rr > 1.5) o.push(path(`M${f1(ax)},${f1(ay)}A${f1(rr)},${f1(rr)} 0 0 0 ${f1(bx)},${f1(by)}Z`, col));
    }
    // roof, snow and fir garland with lights
    o.push(polyP([[Xf + s * 0.35, 2.95, Z0 - 0.2], [Xf + s * 0.35, 2.95, Z1 + 0.2], [Xb, 4.3, Z1 + 0.2], [Xb, 4.3, Z0 - 0.2]], roofCol));
    o.push(polyP([[Xf + s * 0.3, 3.05, Z0 - 0.25], [Xf + s * 0.3, 3.05, Z1 + 0.25], [Xb, 4.45, Z1 + 0.25], [Xb, 4.45, Z0 - 0.25]], C.snow));
    o.push(polyP([[Xf + s * 0.3, 3.05, Z0 - 0.25], [Xb, 4.45, Z0 - 0.25], [Xb, 4.2, Z0 - 0.25], [Xf + s * 0.3, 2.85, Z0 - 0.25]], C.snowSh));
    const gN = Math.max(6, Math.round((Z1 - Z0) / 0.22));
    for (let i = 0; i <= gN; i++) {
      const Z = Z0 - 0.2 + ((Z1 - Z0 + 0.4) * i) / gN;
      const [x, y] = P(Xf + s * 0.32, 2.9, Z), r = k(Z) * 0.2;
      o.push(circle(x, y, r, i % 2 ? C.green : C.greenD));
    }
    for (let i = 0; i <= gN; i++) {
      const Z = Z0 - 0.1 + ((Z1 - Z0 + 0.2) * i) / gN;
      const [x, y] = P(Xf + s * 0.3, 2.82 + (i % 2) * 0.12, Z);
      o.push(circle(x, y, Math.max(1.8, k(Z) * 0.07), i % 4 === 1 ? C.red : C.light));
    }
  };
  const left = [[19.6, 22.0, 'sweets', C.redD], [16.7, 19.2, 'candles', C.woodD], [13.6, 16.3, 'wreaths', C.redD], [10.2, 13.2, 'sweets', C.woodD], [6.4, 9.8, 'candles', C.redD], [0.8, 6.0, 'gingerbread', C.woodD]];
  const right = [[19.6, 22.0, 'wreaths', C.woodD], [16.7, 19.2, 'gingerbread', C.redD], [13.6, 16.3, 'sweets', C.woodD], [10.2, 13.2, 'candles', C.redD], [6.4, 9.8, 'wreaths', C.woodD], [0.8, 6.0, 'baubles', C.redD]];
  for (let i = 0; i < left.length; i++) { stall(-1, ...left[i]); stall(1, ...right[i]); }

  // ---- Shoppers, far to near ----
  const person = (X, Z, coat, hat, opts = {}) => {
    const s = k(Z), [bx, by] = P(X, 0, Z), h = opts.h || 1.7, w = opts.w || 1;
    const Y = (m) => by - m * s * (h / 1.7);
    const xw = (m) => m * s * w;
    // legs and boots
    o.push(rect(bx - xw(0.15), Y(0.78), xw(0.12), s * 0.72, C.trousers), rect(bx + xw(0.03), Y(0.78), xw(0.12), s * 0.72, C.trousers));
    o.push(rect(bx - xw(0.17), Y(0.12), xw(0.15), s * 0.12, C.woodD), rect(bx + xw(0.02), Y(0.12), xw(0.15), s * 0.12, C.woodD));
    // coat
    o.push(path(`M${f1(bx - xw(0.22))},${f1(Y(1.45))}Q${f1(bx)},${f1(Y(1.52))} ${f1(bx + xw(0.22))},${f1(Y(1.45))}L${f1(bx + xw(0.3))},${f1(Y(0.62))}Q${f1(bx)},${f1(Y(0.56))} ${f1(bx - xw(0.3))},${f1(Y(0.62))}Z`, coat));
    // arms
    o.push(poly([[bx - xw(0.2), Y(1.42)], [bx - xw(0.31), Y(1.4)], [bx - xw(0.36), Y(0.82)], [bx - xw(0.26), Y(0.82)]], coat));
    o.push(poly([[bx + xw(0.2), Y(1.42)], [bx + xw(0.31), Y(1.4)], [bx + xw(0.36), Y(0.82)], [bx + xw(0.26), Y(0.82)]], coat));
    if (opts.bag) o.push(rect(bx + xw(0.28), Y(0.85), xw(0.22), s * 0.26, opts.bag), rect(bx + xw(0.33), Y(0.9), xw(0.12), s * 0.06, C.white));
    if (s > 60) {
      // fur-trimmed hem and cuffs, a belt, and a scarf tail
      o.push(path(`M${f1(bx - xw(0.3))},${f1(Y(0.62))}Q${f1(bx)},${f1(Y(0.56))} ${f1(bx + xw(0.3))},${f1(Y(0.62))}L${f1(bx + xw(0.295))},${f1(Y(0.69))}Q${f1(bx)},${f1(Y(0.63))} ${f1(bx - xw(0.295))},${f1(Y(0.69))}Z`, C.cream));
      o.push(rect(bx - xw(0.37), Y(0.86), xw(0.12), s * 0.05, C.cream), rect(bx + xw(0.25), Y(0.86), xw(0.12), s * 0.05, C.cream));
      o.push(rect(bx - xw(0.27), Y(1.0), xw(0.54), s * 0.05, C.trousers));
      o.push(rect(bx + xw(0.04), Y(1.5), xw(0.09), s * 0.3, opts.scarf || C.red), rect(bx + xw(0.04), Y(1.22), xw(0.09), s * 0.04, C.white));
    }
    // scarf, head, hat with bobble
    o.push(rect(bx - xw(0.14), Y(1.52), xw(0.28), s * 0.09, opts.scarf || C.red));
    o.push(circle(bx, Y(1.62), s * 0.11 * w, opts.hair || C.hair));
    o.push(path(`M${f1(bx - xw(0.12))},${f1(Y(1.64))}a${f1(xw(0.12))},${f1(xw(0.12))} 0 0 1 ${f1(xw(0.24))},0z`, hat), rect(bx - xw(0.125), Y(1.66), xw(0.25), s * 0.04, C.white));
    if (s > 60) o.push(rect(bx - xw(0.11), Y(1.72), xw(0.22), s * 0.025, C.white));
    o.push(circle(bx, Y(1.79), s * 0.045 * w, C.white));
  };
  const people = [
    [0.6, 24, C.coat3, C.red], [-0.8, 23, C.coat2, C.green], [1.4, 22, C.coat4, C.white], [-1.5, 20.5, C.coat1, C.red], [0.2, 19, C.coat5, C.gold],
    [1.6, 17, C.coat1, C.blue, { bag: C.red }], [-1.2, 15.5, C.coat4, C.white], [0.9, 14, C.coat2, C.red, { hair: C.hair2 }], [-0.2, 12, C.coat3, C.pink],
    [1.3, 10, C.coat5, C.red, { bag: C.white }], [-1.2, 9, C.coat2, C.green, { scarf: C.gold }], [0.4, 7.2, C.coat4, C.white, { hair: C.hair2, scarf: C.green }],
    [1.0, 7.0, C.coat1, C.red, { h: 1.15, w: 0.75, scarf: C.blue }], [-0.9, 5.2, C.coat3, C.red, { bag: C.gold }], [1.1, 4.4, C.coat2, C.green, { scarf: C.red, hair: C.hair2 }],
    [-0.5, 3.0, C.coat4, C.white, { bag: C.gold, scarf: C.green, hair: C.hair2 }], [0.75, 2.6, C.coat3, C.red, { scarf: C.white }],
  ];
  for (const [X, Z, coat, hat, opts] of people) person(X, Z, coat, hat, opts || {});

  // ---- Foreground: a fir branch along the top with hanging ornaments ----
  for (let i = 0; i < 70; i++) {
    const t = i / 70, x = -10 + t * 330, y = 8 + Math.sin(t * 5) * 10 + R() * 18;
    const a = (R() - 0.5) * 1.6 + Math.PI / 2, l = 24 + R() * 22;
    o.push(poly([[x - 3, y], [x + Math.cos(a) * l, y + Math.sin(a) * l], [x + 3, y]], R() < 0.5 ? C.green : C.greenD));
  }
  o.push(path(smoothPath([[-10, 6], [80, 14], [180, 4], [320, 18], [330, 26], [180, 14], [80, 24], [-10, 16]]), C.woodD));
  // gingerbread man, bauble and striped balloon hanging from the branch
  {
    const x = 70, y = 120, sz = 70;
    o.push(rect(x - 1, 18, 2, y - 18 - sz * 0.42, C.red));
    o.push(circle(x, y - sz * 0.25, sz * 0.2, C.ginger), poly([[x - sz * 0.42, y - sz * 0.02], [x + sz * 0.42, y - sz * 0.02], [x + sz * 0.38, y + sz * 0.1], [x + sz * 0.16, y + sz * 0.1], [x + sz * 0.28, y + sz * 0.5], [x + sz * 0.08, y + sz * 0.5], [x, y + sz * 0.28], [x - sz * 0.08, y + sz * 0.5], [x - sz * 0.28, y + sz * 0.5], [x - sz * 0.16, y + sz * 0.1], [x - sz * 0.38, y + sz * 0.1]], C.ginger));
    o.push(circle(x - 5, y - sz * 0.28, 2.6, C.icing), circle(x + 5, y - sz * 0.28, 2.6, C.icing), path(`M${x - 6},${y - sz * 0.18} q6,5 12,0`, C.icing));
    for (const yy of [y, y + 12]) o.push(circle(x, yy, 3, C.red));
    o.push(rect(x - sz * 0.38, y + 2, sz * 0.18, 4, C.icing), rect(x + sz * 0.2, y + 2, sz * 0.18, 4, C.icing));
  }
  {
    const x = 175, y = 105, r = 26;
    o.push(rect(x - 1, 12, 2, y - r - 12, C.gold), rect(x - 6, y - r - 6, 12, 8, C.gold));
    o.push(circle(x, y, r, C.red), ellipse(x - 9, y - 9, 7, 4, C.white, `transform="rotate(-40 ${x - 9} ${y - 9})"`), rect(x - r, y - 3, 2 * r, 6, C.gold));
  }
  {
    const x = 262, y = 92, rx = 20, ry = 25, bands = [C.blue, C.gold, C.red, C.white, C.green];
    o.push(rect(x - 1, 20, 2, y - ry - 20, C.woodD));
    for (let b = 0; b < 5; b++) {
      const ya = y - ry + (2 * ry * b) / 5, yb = y - ry + (2 * ry * (b + 1)) / 5;
      const xs = (yy) => rx * Math.sqrt(Math.max(0, 1 - ((yy - y) / ry) ** 2));
      const L = [], Rt = [];
      for (let t = 0; t <= 4; t++) { const yy = ya + ((yb - ya) * t) / 4; L.push([x - xs(yy), yy]); Rt.unshift([x + xs(yy), yy]); }
      o.push(poly([...L, ...Rt], bands[b]));
    }
    o.push(poly([[x - 7, y + ry], [x + 7, y + ry], [x + 5, y + ry + 9], [x - 5, y + ry + 9]], C.gold));
  }

  // ---- Falling snow ----
  for (let i = 0; i < 160; i++) o.push(circle(R() * W, R() * 1000, 1.4 + R() * 2.2, C.snow));
  return svg(g(o), C.sky1, { width: 1.1 });
}
