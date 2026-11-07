// The puzzle screen: wires the canvas view, colour row, help buttons, saving and the finish.
import { PuzzleView } from './puzzle-view.js';
import { PaletteBar } from './palette-bar.js';
import { progress } from './storage.js';
import { sfx } from './sound.js';
import { confetti, clearConfetti } from './confetti.js';

const ICONS = {
  home: '<svg viewBox="0 0 24 24"><path d="M4 11.2 12 4.5l8 6.7V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5h-6v5.5H5.5A1.5 1.5 0 0 1 4 19z"/></svg>',
  hint: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/><path d="M10.5 7.5v6M7.5 10.5h6"/></svg>',
  shade: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path class="fillp" d="M4 7a3 3 0 0 1 3-3h1v4H4zM12 4h4v4h-4zM8 8h4v4H8zM16 8h4v4h-4zM4 12h4v4H4zM12 12h4v4h-4zM8 16h4v4H8zM16 16h4v1a3 3 0 0 1-3 3h-1z"/></svg>',
  fit: '<svg viewBox="0 0 24 24"><path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/></svg>',
};

export class Game {
  /**
   * @param {HTMLElement} root  container for the puzzle screen
   * @param {object} pz        decoded puzzle
   * @param {object|null} saved progress from storage
   * @param {object} opts      { settings, saveSettings(), onExit(), onRestart() , fast }
   */
  constructor(root, pz, saved, opts) {
    this.root = root;
    this.pz = pz;
    this.opts = opts;
    this.filled = new Uint8Array(pz.S);
    this.order = [];
    for (const s of saved?.order || []) {
      if (s < pz.S && !this.filled[s]) { this.filled[s] = 1; this.order.push(s); }
    }
    this.total = pz.colorSections.map((l) => l.length);
    this.doneCount = this.total.map(() => 0);
    for (const s of this.order) this.doneCount[pz.sectionColor[s]]++;
    this.selected = -1;
    this.finished = this.order.length === pz.S;

    root.innerHTML = `
      <div class="stage"><canvas aria-label="${pz.title}"></canvas>
      <div class="hud">
        <button class="round home" type="button" aria-label="Back to pictures">${ICONS.home}</button>
        <div class="pill pct" aria-live="polite"></div>
        <div class="tools">
          <button class="round hint" type="button" aria-label="Show me one">${ICONS.hint}</button>
          <button class="round shade" type="button" aria-label="Shade sections of this colour">${ICONS.shade}</button>
        </div>
        <button class="round fit" type="button" aria-label="Whole picture">${ICONS.fit}</button>
      </div></div>
      <div class="bottom"><div class="palette"></div></div>
      <div class="done-card" hidden>
        <div class="done-title">Finished!</div>
        <div class="done-sub"></div>
        <div class="done-buttons">
          <button type="button" class="btn replay">Watch it again</button>
          <button type="button" class="btn primary back">Back to pictures</button>
        </div>
        <button type="button" class="link restart">Colour it again from the start</button>
      </div>
      <div class="dialog" hidden>
        <div class="dialog-box">
          <p>Start this picture again? Your colouring will be cleared.</p>
          <div class="done-buttons">
            <button type="button" class="btn no">Keep it</button>
            <button type="button" class="btn primary yes">Start again</button>
          </div>
        </div>
      </div>`;
    const $ = (sel) => root.querySelector(sel);
    this.$ = $;
    $('.done-sub').textContent = pz.title;

    this.view = new PuzzleView($('canvas'), pz, this.filled, {
      onTap: (mx, my, r) => this.onTap(mx, my, r),
      onViewChange: () => this.scheduleSave(),
    });
    this.view.showShading = opts.settings.shading;
    $('.shade').classList.toggle('on', opts.settings.shading);

    this.bar = new PaletteBar($('.palette'), pz, (c) => this.select(c, true));
    pz.palette.forEach((_, c) => {
      if (this.doneCount[c] >= this.total[c]) this.bar.remove(c);
      else this.bar.setProgress(c, this.doneCount[c], this.total[c]);
    });

    $('.home').addEventListener('click', () => this.exit());
    $('.hint').addEventListener('click', () => this.hint());
    $('.fit').addEventListener('click', () => this.view.fit(true));
    $('.shade').addEventListener('click', () => {
      const on = !this.view.showShading;
      this.view.showShading = on;
      $('.shade').classList.toggle('on', on);
      opts.settings.shading = on;
      opts.saveSettings();
      this.view.requestDraw();
    });
    $('.back').addEventListener('click', () => this.exit());
    $('.replay').addEventListener('click', () => this.playReplay());
    $('.restart').addEventListener('click', () => { $('.dialog').hidden = false; });
    $('.dialog .no').addEventListener('click', () => { $('.dialog').hidden = true; });
    $('.dialog .yes').addEventListener('click', () => {
      progress.clear(pz.id);
      this.destroy();
      opts.onRestart();
    });

    this.onHide = () => { if (document.visibilityState === 'hidden') this.saveNow(); };
    document.addEventListener('visibilitychange', this.onHide);
    window.addEventListener('pagehide', this.onHide);

    this.updatePct();
    if (this.finished) {
      this.showFinished();
    } else {
      const rem = this.bar.remaining();
      const sel = saved && rem.includes(saved.selected) ? saved.selected : rem[0];
      this.select(sel, false);
      requestAnimationFrame(() => this.bar.select(sel, true));
      if (saved?.view) this.view.setView(saved.view);
    }
  }

  destroy() {
    clearTimeout(this.saveT);
    clearConfetti();
    document.removeEventListener('visibilitychange', this.onHide);
    window.removeEventListener('pagehide', this.onHide);
    this.view.destroy();
    this.root.innerHTML = '';
  }

  exit() {
    this.saveNow();
    this.destroy();
    this.opts.onExit();
  }

  select(c, sound) {
    if (c == null || c < 0) return;
    this.selected = c;
    this.bar.select(c, !sound);
    this.view.setSelected(c);
    if (sound) sfx.select();
    this.scheduleSave();
  }

  updatePct() {
    this.$('.pct').textContent = `${Math.floor((100 * this.order.length) / this.pz.S)}%`;
  }

  onTap(mx, my, radius) {
    if (this.finished) return;
    const { W, H, map, sectionColor } = this.pz;
    const x = Math.floor(mx), y = Math.floor(my);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const s = map[y * W + x];
    if (!this.filled[s] && sectionColor[s] === this.selected) { this.fill(s, mx, my); return; }
    // Forgiving taps: if a section of the selected colour is right next to the finger, fill that.
    const near = this.findNear(x, y, Math.min(48, Math.max(2, radius)));
    if (near >= 0) { this.fill(near, mx, my); return; }
    if (!this.filled[s]) { this.view.wiggle(s); sfx.wrong(); }
  }

  findNear(x0, y0, r) {
    const { W, H, map, sectionColor } = this.pz;
    let best = -1, bd = r * r + 1;
    const R = Math.ceil(r);
    for (let y = Math.max(0, y0 - R); y <= Math.min(H - 1, y0 + R); y++) {
      for (let x = Math.max(0, x0 - R); x <= Math.min(W - 1, x0 + R); x++) {
        const d = (x - x0) ** 2 + (y - y0) ** 2;
        if (d >= bd) continue;
        const s = map[y * W + x];
        if (!this.filled[s] && sectionColor[s] === this.selected) { bd = d; best = s; }
      }
    }
    return best;
  }

  fill(s, mx, my, { animate = true, quiet = false } = {}) {
    if (this.filled[s]) return;
    this.filled[s] = 1;
    this.order.push(s);
    this.view.fillSection(s, mx, my, animate);
    if (!quiet) sfx.fill();
    const c = this.pz.sectionColor[s];
    this.doneCount[c]++;
    this.bar.setProgress(c, this.doneCount[c], this.total[c]);
    this.updatePct();
    this.scheduleSave();
    if (this.doneCount[c] === this.total[c]) this.colorDone(c, quiet);
    if (this.order.length === this.pz.S) this.finish();
  }

  colorDone(c, quiet) {
    if (!quiet) setTimeout(() => sfx.colorDone(), 120);
    const rem = this.bar.remaining();
    const i = rem.indexOf(c);
    const next = rem[i + 1] ?? rem[i - 1] ?? -1;
    this.bar.vanish(c, () => {
      if (this.selected === c && next >= 0 && !this.finished) {
        this.selected = next;
        this.bar.select(next, true);
        this.view.setSelected(next);
        this.scheduleSave();
      }
    });
  }

  /** Fly to the unfilled section of the selected colour closest to the middle of the screen. */
  hint() {
    if (this.finished || this.selected < 0) return;
    const pz = this.pz, v = this.view;
    const [cx, cy] = v.toMap(v.cssW / 2, v.cssH / 2);
    let best = -1, bd = Infinity;
    for (const s of pz.colorSections[this.selected]) {
      if (this.filled[s]) continue;
      const li = pz.pole[s];
      const d = (pz.labels.x[li] - cx) ** 2 + (pz.labels.y[li] - cy) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    if (best < 0) return;
    const li = pz.pole[best], b = pz.bbox, bw = b[best * 4 + 2] - b[best * 4] + 1, bh = b[best * 4 + 3] - b[best * 4 + 1] + 1;
    const px = pz.labels.x[li], py = pz.labels.y[li], r = pz.labels.r[li];
    // Zoom so the section is comfortably big (and its number readable) without losing the surroundings.
    let scale = Math.min((v.cssW * 0.4) / bw, (v.cssH * 0.4) / bh);
    scale = Math.max(scale, 20 / Math.max(1, r * 1.3));
    scale = Math.min(scale, v.maxScale);
    if (v.scale > scale && bw * v.scale < v.cssW * 0.8 && bh * v.scale < v.cssH * 0.8) scale = v.scale;
    sfx.hint();
    v.flyTo(scale, px, py, 800, () => v.pulseAt(px, py, Math.max(r, 4)));
  }

  // ---------- finishing ----------
  finish() {
    this.finished = true;
    this.saveNow();
    this.root.classList.add('is-finished');
    this.view.locked = true;
    this.view.setSelected(-1);
    const fast = this.opts.fast;
    setTimeout(() => {
      this.view.flyTo(this.view.fitScale, this.pz.W / 2, this.pz.H / 2, fast ? 50 : 650, () => {
        confetti(this.pz.paletteHex);
        sfx.finish();
        setTimeout(() => this.playReplay(true), fast ? 0 : 900);
      });
    }, fast ? 0 : 450);
  }

  showFinished() {
    this.root.classList.add('is-finished');
    this.view.setSelected(-1);
    this.view.setLinesAlpha(0);
    this.$('.done-card').hidden = false;
  }

  playReplay(first = false) {
    const v = this.view, card = this.$('.done-card');
    if (this.replaying) return;
    this.replaying = true;
    v.locked = true;
    if (!first) card.classList.add('dim');
    v.fit(!first);
    v.setLinesAlpha(1, 250);
    const dur = this.opts.fast ? 200 : Math.min(7000, Math.max(3500, this.pz.S * 5));
    setTimeout(() => {
      v.replay(this.order, dur, () => {
        v.setLinesAlpha(0, this.opts.fast ? 50 : 1100);
        this.replaying = false;
        v.locked = false;
        card.classList.remove('dim');
        card.hidden = false;
      });
    }, first ? 0 : 300);
  }

  // ---------- saving ----------
  scheduleSave() {
    clearTimeout(this.saveT);
    this.saveT = setTimeout(() => this.saveNow(), 600);
  }

  saveNow() {
    clearTimeout(this.saveT);
    if (!this.order.length && this.selected < 0) return;
    progress.save(this.pz.id, this.pz.hash, {
      order: this.order, selected: this.selected, view: this.finished ? null : this.view.getView(), done: this.finished,
    });
  }

  // ---------- debug (used by the smoke test) ----------
  debugFillAll(leave = 0) {
    const todo = [];
    for (let s = 0; s < this.pz.S; s++) if (!this.filled[s]) todo.push(s);
    const last = todo.splice(todo.length - leave, leave);
    for (const s of todo) this.fill(s, null, null, { animate: false, quiet: true });
    return last;
  }
}
