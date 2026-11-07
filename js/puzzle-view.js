// Canvas view of a puzzle: layered rendering, pinch-zoom / pan / tap, fill animations, numbers,
// shading of the selected colour, hint fly-to and the finishing replay.
//
// Coordinates: "map" = puzzle pixels; "css" = CSS pixels on screen; device = css * dpr.
// View transform: css = map * scale + (tx, ty).

const BG = '#ebe6df';
const LINE = '#3d3835';
const UNFILLED = [255, 255, 255];
const LINE_RASTER_WIDTH = 1.5; // outline width in map px when drawn from the pre-rendered layer
const VECTOR_FROM = 1.7; // device px per map px above which outlines are drawn as crisp vectors
const MIN_FONT = 10, MAX_FONT = 34; // css px
const CELL = 128; // spatial grid for outline culling (map px)
const TAP_SLOP = 10; // css px

const now = () => performance.now();
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export class PuzzleView {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} pz decoded puzzle (codec.decodePuzzle)
   * @param {Uint8Array} filled 1 per filled section (shared with the game; the view only reads it)
   * @param {object} cb { onTap(mapX, mapY, mapRadius), onViewChange() }
   */
  constructor(canvas, pz, filled, cb = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pz = pz;
    this.filled = filled;
    this.cb = { ...cb, onViewChange: () => { this.settle(); cb.onViewChange?.(); } };
    this.scale = 1; this.tx = 0; this.ty = 0;
    this.cssW = 1; this.cssH = 1; this.dpr = 1;
    this.selected = -1;
    this.showShading = true;
    this.linesAlpha = 1;
    this.fills = [];
    this.tweens = [];
    this.wiggles = new Map();
    this.pulses = [];
    this.pointers = new Map();
    this.velocity = null;
    this.raf = 0;
    this.destroyed = false;

    this.buildLayers();
    this.buildLabels();
    this.bindGestures();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement);
    this.resize();
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.unbind();
    // Free big canvases promptly (iOS has a tight canvas memory budget).
    for (const c of [this.fillCanvas, this.hlCanvas, this.lineCanvas]) { c.width = c.height = 0; }
  }

  // ---------- layers ----------
  buildLayers() {
    const { W, H, S, map, sectionColor, palette } = this.pz;
    this.fillCanvas = makeCanvas(W, H);
    this.fillCtx = this.fillCanvas.getContext('2d');
    const img = this.fillCtx.createImageData(W, H);
    const d = img.data;
    const rgb = new Uint8Array(S * 3);
    for (let s = 0; s < S; s++) {
      const c = this.filled[s] ? palette[sectionColor[s]] : UNFILLED;
      rgb[s * 3] = c[0]; rgb[s * 3 + 1] = c[1]; rgb[s * 3 + 2] = c[2];
    }
    for (let p = 0, q = 0; p < map.length; p++, q += 4) {
      const s = map[p] * 3;
      d[q] = rgb[s]; d[q + 1] = rgb[s + 1]; d[q + 2] = rgb[s + 2]; d[q + 3] = 255;
    }
    this.fillCtx.putImageData(img, 0, 0);

    this.hlCanvas = makeCanvas(W, H);
    this.hlCtx = this.hlCanvas.getContext('2d');

    // Outline paths, split into short pieces binned into a grid so we only stroke what is on screen.
    const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
    const cells = Array.from({ length: cols * rows }, () => ({ path: new Path2D(), x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, n: 0 }));
    const all = new Path2D();
    for (const pts of this.pz.chains) {
      const n = pts.length / 2;
      for (let a = 0; a < n - 1; a += 24) {
        const b = Math.min(n - 1, a + 24);
        const cx = Math.min(cols - 1, Math.max(0, Math.floor(pts[a * 2] / CELL)));
        const cy = Math.min(rows - 1, Math.max(0, Math.floor(pts[a * 2 + 1] / CELL)));
        const cell = cells[cy * cols + cx];
        cell.path.moveTo(pts[a * 2], pts[a * 2 + 1]);
        for (let i = a; i <= b; i++) {
          const x = pts[i * 2], y = pts[i * 2 + 1];
          if (i > a) cell.path.lineTo(x, y);
          if (x < cell.x0) cell.x0 = x; if (x > cell.x1) cell.x1 = x;
          if (y < cell.y0) cell.y0 = y; if (y > cell.y1) cell.y1 = y;
        }
        cell.n++;
      }
      all.moveTo(pts[0], pts[1]);
      for (let i = 1; i < n; i++) all.lineTo(pts[i * 2], pts[i * 2 + 1]);
    }
    this.cells = cells.filter((c) => c.n > 0);
    this.lineCanvas = makeCanvas(W, H);
    const lc = this.lineCanvas.getContext('2d');
    lc.lineWidth = LINE_RASTER_WIDTH; lc.lineJoin = 'round'; lc.lineCap = 'round'; lc.strokeStyle = LINE;
    lc.stroke(all);
    lc.strokeRect(0.75, 0.75, W - 1.5, H - 1.5);

  }

  buildLabels() {
    const L = this.pz.labels, n = L.section.length;
    this.labelFont = new Float32Array(n);
    this.labelText = new Array(n);
    for (let i = 0; i < n; i++) {
      const num = String(this.pz.sectionColor[L.section[i]] + 1);
      const r = Math.max(0, L.r[i] - 0.8); // leave room for the outline
      this.labelFont[i] = r * (num.length === 1 ? 1.55 : num.length === 2 ? 1.08 : 0.8);
      this.labelText[i] = num;
    }
  }

  /**
   * Shade the unfilled sections of colour c (or none for -1) with a checker pattern drawn in
   * picture space. The checker's square size is picked for the current zoom (about 6 CSS px on
   * screen) and rebuilt when a gesture ends at a very different zoom, so drawing a frame is a
   * single drawImage.
   */
  setSelected(c) {
    this.selected = c;
    this.buildShading();
  }

  shadingPeriod() {
    return Math.max(1, Math.round(6 / this.scale));
  }

  buildShading() {
    const c = this.selected;
    const { W, H, map, bbox, colorSections } = this.pz;
    const hc = this.hlCtx;
    hc.clearRect(0, 0, W, H);
    this.hlPeriod = this.shadingPeriod();
    if (c < 0) { this.requestDraw(); return; }
    const want = new Uint8Array(this.pz.S);
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const s of colorSections[c]) {
      if (this.filled[s]) continue;
      want[s] = 1;
      x0 = Math.min(x0, bbox[s * 4]); y0 = Math.min(y0, bbox[s * 4 + 1]);
      x1 = Math.max(x1, bbox[s * 4 + 2]); y1 = Math.max(y1, bbox[s * 4 + 3]);
    }
    if (x1 >= 0) {
      const w = x1 - x0 + 1, h = y1 - y0 + 1, P = this.hlPeriod;
      const img = hc.createImageData(w, h), d = new Uint32Array(img.data.buffer);
      // Little-endian RGBA packed: 0xAABBGGRR.
      const A = 0xffcccac9, B = 0xffecebea;
      for (let y = 0; y < h; y++) {
        const ry = Math.floor((y0 + y) / P);
        let p = (y0 + y) * W + x0, q = y * w;
        for (let x = 0; x < w; x++, p++, q++) {
          if (want[map[p]]) d[q] = ((Math.floor((x0 + x) / P) + ry) & 1) ? A : B;
        }
      }
      hc.putImageData(img, x0, y0);
    }
    this.requestDraw();
  }

  /** Called when a gesture settles: re-density the checker if the zoom changed a lot. */
  settle() {
    if (this.selected < 0 || !this.showShading) return;
    const want = this.shadingPeriod(), have = this.hlPeriod || want;
    if (Math.max(want / have, have / want) >= 1.6) {
      clearTimeout(this.settleT);
      this.settleT = setTimeout(() => this.buildShading(), 60);
    }
  }

  /** A canvas the size of section s's bounding box with the section's pixels in rgb. */
  sectionCanvas(s, rgb) {
    const { W, map, bbox } = this.pz;
    const x0 = bbox[s * 4], y0 = bbox[s * 4 + 1], w = bbox[s * 4 + 2] - x0 + 1, h = bbox[s * 4 + 3] - y0 + 1;
    const c = makeCanvas(w, h), cx = c.getContext('2d');
    const img = cx.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      let p = (y0 + y) * W + x0, q = y * w * 4;
      for (let x = 0; x < w; x++, p++, q += 4) {
        if (map[p] === s) { d[q] = rgb[0]; d[q + 1] = rgb[1]; d[q + 2] = rgb[2]; d[q + 3] = 255; }
      }
    }
    cx.putImageData(img, 0, 0);
    return { c, x0, y0, w, h };
  }

  /** Fill section s (already marked filled by the caller) with a reveal growing from (mx, my). */
  fillSection(s, mx, my, animate = true) {
    const rgb = this.pz.palette[this.pz.sectionColor[s]];
    const sc = this.sectionCanvas(s, rgb);
    // Remove its shading straight away.
    this.hlCtx.globalCompositeOperation = 'destination-out';
    this.hlCtx.drawImage(sc.c, sc.x0, sc.y0);
    this.hlCtx.globalCompositeOperation = 'source-over';
    if (!animate) { this.fillCtx.drawImage(sc.c, sc.x0, sc.y0); sc.c.width = 0; this.requestDraw(); return; }
    if (mx == null) { mx = this.pz.labels.x[this.pz.pole[s]]; my = this.pz.labels.y[this.pz.pole[s]]; }
    const maxR = Math.max(Math.hypot(mx - sc.x0, my - sc.y0), Math.hypot(mx - sc.x0 - sc.w, my - sc.y0), Math.hypot(mx - sc.x0, my - sc.y0 - sc.h), Math.hypot(mx - sc.x0 - sc.w, my - sc.y0 - sc.h));
    // Duration grows gently with how big the section looks on screen.
    const dur = Math.min(520, 220 + Math.sqrt(sc.w * sc.h) * this.scale * 0.6);
    this.fills.push({ ...sc, s, mx, my, maxR, t0: now(), dur });
    this.requestDraw();
  }

  wiggle(s) { this.wiggles.set(s, now()); this.requestDraw(); }

  pulseAt(mx, my, r, color = '#ffffff') { this.pulses.push({ mx, my, r, color, t0: now() }); this.requestDraw(); }

  // ---------- view transform ----------
  resize() {
    const el = this.canvas.parentElement;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const oldW = this.cssW, oldH = this.cssH, first = !this.sized;
    const center = first ? null : this.toMap(oldW / 2, oldH / 2);
    const oldFit = this.fitScale;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.cssW = r.width; this.cssH = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.canvas.style.width = r.width + 'px';
    this.canvas.style.height = r.height + 'px';
    const pad = 12;
    this.fitScale = Math.min((this.cssW - pad * 2) / this.pz.W, (this.cssH - pad * 2) / this.pz.H);
    this.minScale = this.fitScale;
    this.maxScale = Math.max(this.fitScale * 4, 9);
    this.sized = true;
    if (first) {
      if (this.pendingView) { this.setView(this.pendingView); this.pendingView = null; } else this.fit(false);
    } else {
      const s = this.scale * (this.fitScale / oldFit);
      this.setCenter(Math.max(this.minScale, Math.min(this.maxScale, s)), center[0], center[1]);
    }
    this.settle();
    this.draw();
  }

  toMap(x, y) { return [(x - this.tx) / this.scale, (y - this.ty) / this.scale]; }

  setCenter(scale, mx, my) {
    this.scale = scale;
    this.tx = this.cssW / 2 - mx * scale;
    this.ty = this.cssH / 2 - my * scale;
    this.clamp();
    this.requestDraw();
  }

  getView() {
    const [cx, cy] = this.toMap(this.cssW / 2, this.cssH / 2);
    return { z: this.scale / this.fitScale, cx, cy };
  }

  setView(v) {
    if (!this.sized) { this.pendingView = v; return; }
    if (!v || !(v.z > 0)) { this.fit(false); return; }
    this.setCenter(Math.max(this.minScale, Math.min(this.maxScale, v.z * this.fitScale)), v.cx, v.cy);
    this.settle();
  }

  clamp() {
    const pw = this.pz.W * this.scale, ph = this.pz.H * this.scale, m = 60;
    if (pw <= this.cssW) this.tx = (this.cssW - pw) / 2;
    else this.tx = Math.min(m, Math.max(this.cssW - pw - m, this.tx));
    if (ph <= this.cssH) this.ty = (this.cssH - ph) / 2;
    else this.ty = Math.min(m, Math.max(this.cssH - ph - m, this.ty));
  }

  fit(animate = true) {
    if (animate) this.flyTo(this.fitScale, this.pz.W / 2, this.pz.H / 2, 450);
    else this.setCenter(this.fitScale, this.pz.W / 2, this.pz.H / 2);
  }

  /** Smoothly move the view to show map point (mx, my) at the given scale. */
  flyTo(scale, mx, my, dur = 700, done) {
    this.stopMotion();
    scale = Math.max(this.minScale, Math.min(this.maxScale, scale));
    const [cx0, cy0] = this.toMap(this.cssW / 2, this.cssH / 2);
    const s0 = this.scale;
    // If the target is far away (in screen terms), zoom out a little on the way, like a map app.
    const travel = Math.hypot(mx - cx0, my - cy0) * Math.min(s0, scale) / Math.max(this.cssW, this.cssH);
    const dip = Math.max(0, Math.min(0.6, (travel - 0.6) * 0.35));
    this.flight = { t0: now(), dur, s0, s1: scale, cx0, cy0, mx, my, dip, done };
    this.requestDraw();
  }

  stopMotion() { this.velocity = null; this.flight = null; }

  // ---------- gestures ----------
  bindGestures() {
    const c = this.canvas;
    const down = (e) => this.onDown(e), move = (e) => this.onMove(e), up = (e) => this.onUp(e);
    const wheel = (e) => this.onWheel(e);
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', wheel, { passive: false });
    this.unbind = () => {
      c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up);
      c.removeEventListener('wheel', wheel);
    };
  }

  localPoint(e) {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  onDown(e) {
    if (this.locked) return;
    e.preventDefault();
    try { this.canvas.setPointerCapture(e.pointerId); } catch {}
    this.stopMotion();
    const [x, y] = this.localPoint(e);
    this.pointers.set(e.pointerId, { x, y });
    if (this.pointers.size === 1) {
      this.tap = { id: e.pointerId, x, y, t: now() };
      this.samples = [{ x, y, t: now() }];
      this.pinch = null;
    } else if (this.pointers.size === 2) {
      this.tap = null;
      this.startPinch();
    }
  }

  startPinch() {
    const [a, b] = [...this.pointers.values()];
    const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    this.pinch = { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), scale: this.scale, map: this.toMap(...mid) };
  }

  onMove(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    const [x, y] = this.localPoint(e);
    const dx = x - p.x, dy = y - p.y;
    p.x = x; p.y = y;
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.pinch.scale * dist / this.pinch.dist));
      this.tx = mid[0] - this.pinch.map[0] * this.scale;
      this.ty = mid[1] - this.pinch.map[1] * this.scale;
      this.clamp();
      this.viewChanged();
    } else if (this.pointers.size === 1) {
      if (this.tap && Math.hypot(x - this.tap.x, y - this.tap.y) > TAP_SLOP) this.tap = null;
      this.tx += dx; this.ty += dy;
      this.clamp();
      this.samples.push({ x, y, t: now() });
      if (this.samples.length > 8) this.samples.shift();
      this.viewChanged();
    }
  }

  onUp(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 1 && this.pinch) {
      // Pinch ended with one finger still down: carry on panning with it.
      this.pinch = null;
      const q = [...this.pointers.values()][0];
      this.samples = [{ x: q.x, y: q.y, t: now() }];
      this.wasPinch = true;
      return;
    }
    if (this.pointers.size > 0) return;
    if (e.type !== 'pointercancel' && this.tap && this.tap.id === e.pointerId && now() - this.tap.t < 600 && !this.pinch) {
      const [mx, my] = this.toMap(this.tap.x, this.tap.y);
      this.tap = null;
      this.cb.onTap?.(mx, my, 16 / this.scale);
      return;
    }
    this.tap = null;
    const pinchEnded = !!this.pinch || this.wasPinch;
    this.pinch = null; this.wasPinch = false;
    // Momentum after a pan flick.
    const s = this.samples || [];
    const t = now();
    const recent = s.filter((q) => t - q.t < 90);
    if (!pinchEnded && recent.length >= 2) {
      const a = recent[0], b = recent[recent.length - 1];
      const dt = Math.max(8, b.t - a.t);
      const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
      if (Math.hypot(vx, vy) > 0.15) { this.velocity = { vx, vy, t }; this.requestDraw(); }
    }
    this.cb.onViewChange?.();
  }

  onWheel(e) {
    e.preventDefault();
    if (this.locked) return;
    this.stopMotion();
    const [x, y] = this.localPoint(e);
    const m = this.toMap(x, y);
    const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025));
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * k));
    this.tx = x - m[0] * this.scale; this.ty = y - m[1] * this.scale;
    this.clamp();
    this.viewChanged();
    clearTimeout(this.wheelT);
    this.wheelT = setTimeout(() => this.cb.onViewChange?.(), 300);
  }

  viewChanged() { this.requestDraw(); }

  // ---------- animation loop ----------
  requestDraw() {
    if (!this.raf && !this.destroyed) this.raf = requestAnimationFrame(() => this.frame());
  }

  frame() {
    this.raf = 0;
    if (this.destroyed) return;
    const t = now();
    let active = false;
    if (this.velocity) {
      const v = this.velocity, dt = Math.min(40, t - v.t);
      v.t = t;
      const wantX = this.tx + v.vx * dt, wantY = this.ty + v.vy * dt;
      this.tx = wantX; this.ty = wantY;
      this.clamp();
      const decay = Math.exp(-dt / 325);
      v.vx = Math.abs(this.tx - wantX) > 0.01 ? 0 : v.vx * decay; // stop at the edges
      v.vy = Math.abs(this.ty - wantY) > 0.01 ? 0 : v.vy * decay;
      if (Math.hypot(v.vx, v.vy) < 0.02) { this.velocity = null; this.cb.onViewChange?.(); } else active = true;
    }
    if (this.flight) {
      const f = this.flight, k = Math.min(1, (t - f.t0) / f.dur), e = easeInOut(k);
      const ls = Math.log(f.s0) + (Math.log(f.s1) - Math.log(f.s0)) * e - f.dip * Math.sin(Math.PI * e);
      const cx = f.cx0 + (f.mx - f.cx0) * e, cy = f.cy0 + (f.my - f.cy0) * e;
      this.setCenter(Math.max(this.minScale, Math.min(this.maxScale, Math.exp(ls))), cx, cy);
      if (k >= 1) { this.flight = null; f.done?.(); this.cb.onViewChange?.(); } else active = true;
    }
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i], k = Math.min(1, (t - tw.t0) / tw.dur);
      tw.set(tw.from + (tw.to - tw.from) * easeInOut(k));
      if (k >= 1) { this.tweens.splice(i, 1); tw.done?.(); } else active = true;
    }
    for (let i = this.fills.length - 1; i >= 0; i--) {
      const f = this.fills[i];
      if (t - f.t0 >= f.dur) {
        this.fillCtx.drawImage(f.c, f.x0, f.y0);
        f.c.width = 0;
        this.fills.splice(i, 1);
      } else active = true;
    }
    for (const [s, t0] of this.wiggles) { if (t - t0 > 450) this.wiggles.delete(s); else active = true; }
    this.pulses = this.pulses.filter((p) => t - p.t0 < 1800);
    if (this.pulses.length) active = true;
    if (this.replayState) { this.replayStep(t); active = true; }
    this.draw(t);
    if (active) this.requestDraw();
  }

  tween(from, to, dur, set, done) { this.tweens.push({ from, to, dur, set, done, t0: now() }); this.requestDraw(); }

  // ---------- drawing ----------
  draw(t = now()) {
    if (!this.sized || this.destroyed) return;
    const ctx = this.ctx, d = this.dpr, W = this.pz.W, H = this.pz.H;
    const s = this.scale * d, tx = this.tx * d, ty = this.ty * d;
    const cw = this.canvas.width, ch = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cw, ch);
    // Soft shadow under the picture.
    ctx.fillStyle = 'rgba(60,40,20,0.08)';
    ctx.fillRect(tx - 1 * d, ty + 2 * d, W * s + 2 * d, H * s + 3 * d);
    ctx.fillStyle = 'rgba(60,40,20,0.06)';
    ctx.fillRect(tx - 2 * d, ty + 4 * d, W * s + 4 * d, H * s + 6 * d);

    ctx.setTransform(s, 0, 0, s, tx, ty);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = s < 1 ? 'high' : 'low';
    ctx.drawImage(this.fillCanvas, 0, 0);

    // Fills in progress: a circle growing from the tap point.
    for (const f of this.fills) {
      const k = easeOut(Math.min(1, (t - f.t0) / f.dur));
      ctx.save();
      ctx.beginPath();
      ctx.arc(f.mx, f.my, Math.max(0.5, f.maxR * k), 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(f.c, f.x0, f.y0);
      ctx.restore();
    }

    // Shading of the selected colour's unfilled sections.
    if (this.showShading && this.selected >= 0 && this.linesAlpha > 0) ctx.drawImage(this.hlCanvas, 0, 0);

    // Outlines.
    if (this.linesAlpha > 0) {
      ctx.globalAlpha = this.linesAlpha;
      if (s <= VECTOR_FROM) {
        ctx.drawImage(this.lineCanvas, 0, 0);
      } else {
        const x0 = -tx / s, y0 = -ty / s, x1 = (cw - tx) / s, y1 = (ch - ty) / s;
        const lw = Math.max(1.0, LINE_RASTER_WIDTH * Math.pow(VECTOR_FROM / s, 0.3));
        ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = LINE;
        const pad = lw;
        for (const c of this.cells) {
          if (c.x1 + pad < x0 || c.x0 - pad > x1 || c.y1 + pad < y0 || c.y0 - pad > y1) continue;
          ctx.stroke(c.path);
        }
        ctx.strokeRect(lw / 2, lw / 2, W - lw, H - lw);
      }
      ctx.globalAlpha = 1;
    }

    // Numbers.
    if (this.linesAlpha > 0.5) this.drawLabels(t);

    // Hint pulses.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const p of this.pulses) {
      const k = (t - p.t0) / 1800;
      const cx = p.mx * s + tx, cy = p.my * s + ty;
      for (let i = 0; i < 2; i++) {
        const kk = (k * 2 - i * 0.35) % 1;
        if (kk < 0) continue;
        const r = (p.r * s) * (0.8 + kk * 1.6) + 6 * d;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = 4 * d; ctx.strokeStyle = `rgba(255,255,255,${(1 - kk) * 0.95})`; ctx.stroke();
        ctx.lineWidth = 2 * d; ctx.strokeStyle = `rgba(40,35,30,${(1 - kk) * 0.8})`; ctx.stroke();
      }
    }
  }

  drawLabels(t) {
    const ctx = this.ctx, d = this.dpr, L = this.pz.labels, n = L.section.length;
    const s = this.scale * d, tx = this.tx * d, ty = this.ty * d, cw = this.canvas.width, ch = this.canvas.height;
    const sc = this.scale, sel = this.selected, colorOf = this.pz.sectionColor, filled = this.filled;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let lastFont = '', lastFill = '';
    for (let i = 0; i < n; i++) {
      const sec = L.section[i];
      if (filled[sec]) continue;
      const fcss = this.labelFont[i] * sc;
      if (fcss < MIN_FONT) continue;
      const x = L.x[i] * s + tx, y = L.y[i] * s + ty;
      if (x < -60 || y < -60 || x > cw + 60 || y > ch + 60) continue;
      const fpx = Math.round(Math.min(fcss, MAX_FONT) * d);
      const isSel = colorOf[sec] === sel;
      const font = `${isSel ? 600 : 400} ${fpx}px -apple-system, system-ui, "Segoe UI", Roboto, sans-serif`;
      if (font !== lastFont) { ctx.font = font; lastFont = font; }
      const fill = isSel ? '#1c1917' : '#6f6964';
      if (fill !== lastFill) { ctx.fillStyle = fill; lastFill = fill; }
      let ox = 0;
      const w0 = this.wiggles.get(sec);
      if (w0 != null) { const k = (t - w0) / 450; ox = Math.sin(k * Math.PI * 6) * (1 - k) * 5 * d; }
      ctx.fillText(this.labelText[i], x + ox, y + fpx * 0.04);
    }
  }

  // ---------- finishing ----------
  setLinesAlpha(a, dur = 0) {
    if (!dur) { this.linesAlpha = a; this.requestDraw(); return; }
    this.tween(this.linesAlpha, a, dur, (v) => { this.linesAlpha = v; });
  }

  /** Replay the colouring in the given section order over `dur` ms. */
  replay(order, dur, done) {
    const { W, H, S, map, sectionColor, palette } = this.pz;
    // Bucket pixels by the step at which their section was filled.
    const rank = new Int32Array(S).fill(order.length);
    order.forEach((s, i) => { rank[s] = i; });
    const starts = new Uint32Array(order.length + 2);
    for (let p = 0; p < map.length; p++) starts[rank[map[p]] + 1]++;
    for (let i = 0; i < order.length + 1; i++) starts[i + 1] += starts[i];
    const pos = starts.slice(0, order.length + 1), pix = new Uint32Array(map.length);
    for (let p = 0; p < map.length; p++) pix[pos[rank[map[p]]]++] = p;
    const img = this.fillCtx.createImageData(W, H);
    img.data.fill(255);
    this.fillCtx.putImageData(img, 0, 0);
    this.fills = [];
    this.replayState = { order, starts, pix, img, done: 0, t0: now(), dur, onDone: done, colorOf: sectionColor, palette };
    this.requestDraw();
  }

  replayStep(t) {
    const r = this.replayState, { W } = this.pz;
    const k = Math.min(1, (t - r.t0) / r.dur);
    const target = Math.round(r.order.length * (k * k * (3 - 2 * k)) * 0.85 + r.order.length * k * 0.15);
    if (target > r.done) {
      const d = r.img.data;
      let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
      const bb = this.pz.bbox;
      for (let i = r.done; i < target; i++) {
        const s = r.order[i], c = r.palette[r.colorOf[s]];
        for (let j = r.starts[i]; j < r.starts[i + 1]; j++) {
          const q = r.pix[j] * 4;
          d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2];
        }
        x0 = Math.min(x0, bb[s * 4]); y0 = Math.min(y0, bb[s * 4 + 1]); x1 = Math.max(x1, bb[s * 4 + 2]); y1 = Math.max(y1, bb[s * 4 + 3]);
      }
      if (x1 >= 0) this.fillCtx.putImageData(r.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
      r.done = target;
    }
    void W;
    if (k >= 1) {
      this.replayState = null;
      r.onDone?.();
    }
  }

  cancelReplay() { this.replayState = null; }
}
