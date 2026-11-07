// The picture menu: line-art thumbnails that show progress in colour, grouped by season.
import { decodeMap, fromBase64, hexToRgb } from './codec.js';
import { progress } from './storage.js';

const thumbCache = new Map(); // id -> { meta, map, colors, lines(Image) }

async function loadThumb(entry) {
  const key = entry.id + ':' + entry.hash;
  if (thumbCache.has(key)) return thumbCache.get(key);
  const base = `pictures/${entry.id}/`;
  const [json, lines] = await Promise.all([
    fetch(base + 'thumb.json').then((r) => r.json()),
    new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = base + 'lines.png?v=' + entry.hash; }),
  ]);
  const t = {
    w: json.width, h: json.height,
    map: decodeMap(json.map, json.width * json.height, json.sections),
    sectionColor: fromBase64(json.sectionColor),
    palette: json.palette.map(hexToRgb),
    sections: json.sections,
    lines,
  };
  thumbCache.set(key, t);
  return t;
}

/** Draw a thumbnail: line art, with filled sections in colour (finished: full colour, no lines). */
export function paintThumb(canvas, t, filledOrderB64, done) {
  canvas.width = t.w; canvas.height = t.h;
  const ctx = canvas.getContext('2d');
  const filled = new Uint8Array(t.sections);
  if (done) filled.fill(1);
  else if (filledOrderB64) {
    const bytes = fromBase64(filledOrderB64);
    const order = new Uint16Array(bytes.buffer, 0, bytes.length >> 1);
    for (const s of order) if (s < t.sections) filled[s] = 1;
  }
  const img = ctx.createImageData(t.w, t.h), d = img.data;
  for (let p = 0, q = 0; p < t.map.length; p++, q += 4) {
    const s = t.map[p];
    if (filled[s]) { const c = t.palette[t.sectionColor[s]]; d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; }
    else { d[q] = d[q + 1] = d[q + 2] = 255; }
    d[q + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (!done) ctx.drawImage(t.lines, 0, 0);
}

export class Menu {
  constructor(root, { onOpen }) {
    this.root = root;
    this.onOpen = onOpen;
    this.list = root.querySelector('.menu-list');
    this.entries = [];
  }

  async load() {
    const res = await fetch('pictures/index.json');
    const idx = await res.json();
    this.entries = idx.pictures;
    this.render();
  }

  render() {
    this.list.innerHTML = '';
    this.cards = new Map();
    const withProgress = this.entries.map((e) => ({ e, p: progress.summary(e.id, e.hash) }));
    const started = withProgress.filter(({ p }) => p && p.count > 0 && !p.done).sort((a, b) => b.p.updated - a.p.updated);
    const finished = withProgress.filter(({ p }) => p && p.done).sort((a, b) => b.p.finishedAt - a.p.finishedAt);
    const notDone = withProgress.filter(({ p }) => !p || !p.done).map((x) => x.e);
    const groups = [];
    if (started.length) groups.push(['Carry on colouring', started.map((x) => x.e)]);
    // Season sections only show pictures still to finish; a finished season's section disappears.
    const cats = [];
    for (const e of this.entries) if (!cats.includes(e.category || 'Pictures')) cats.push(e.category || 'Pictures');
    for (const c of cats) groups.push([c, notDone.filter((e) => (e.category || 'Pictures') === c)]);
    if (finished.length) groups.push([`Finished (${finished.length})`, finished.map((x) => x.e)]);
    for (const [title, list] of groups) {
      if (!list.length) continue;
      const h = document.createElement('h2');
      h.textContent = title;
      const grid = document.createElement('div');
      grid.className = 'grid';
      for (const e of list) grid.appendChild(this.card(e));
      this.list.append(h, grid);
    }
  }

  card(e) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card';
    b.dataset.id = e.id;
    b.innerHTML = `<div class="thumb" style="aspect-ratio:${e.width}/${e.height}"><canvas></canvas></div>
      <div class="meta"><span class="title"></span><span class="state"></span></div>
      <div class="bar"><i></i></div>`;
    b.querySelector('.title').textContent = e.title;
    b.addEventListener('click', () => this.onOpen(e));
    if (!this.cards.has(e.id)) this.cards.set(e.id, []);
    this.cards.get(e.id).push(b);
    this.refreshCard(b, e);
    return b;
  }

  async refreshCard(b, e) {
    const p = progress.summary(e.id, e.hash);
    const pct = p ? (p.done ? 100 : Math.floor((100 * p.count) / e.sections)) : 0;
    b.classList.toggle('done', !!p?.done);
    b.querySelector('.state').textContent = p?.done ? 'Finished' : pct > 0 ? `${pct}%` : '';
    b.querySelector('.bar i').style.width = `${pct}%`;
    b.querySelector('.bar').hidden = !(pct > 0 && !p?.done);
    try {
      const t = await loadThumb(e);
      paintThumb(b.querySelector('canvas'), t, p?.order, p?.done);
      b.classList.add('ready');
    } catch (err) {
      console.warn('thumbnail failed', e.id, err);
    }
  }

  /** After returning from a puzzle: re-sort if needed and refresh that picture's card(s). */
  refresh() { this.render(); }
}
