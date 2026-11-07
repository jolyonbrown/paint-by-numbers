// The scrolling row of numbered colours along the bottom, with a progress ring on each.

function textColor([r, g, b]) {
  const L = 0.2126 * (r / 255) ** 2.2 + 0.7152 * (g / 255) ** 2.2 + 0.0722 * (b / 255) ** 2.2;
  return L > 0.33 ? '#1f1b18' : '#ffffff';
}

export class PaletteBar {
  /**
   * @param {HTMLElement} el container (scrolls horizontally)
   * @param {object} pz decoded puzzle
   * @param {(c:number)=>void} onSelect
   */
  constructor(el, pz, onSelect) {
    this.el = el;
    this.pz = pz;
    this.onSelect = onSelect;
    this.buttons = new Map();
    this.selected = -1;
    el.innerHTML = '';
    pz.palette.forEach((rgb, c) => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.type = 'button';
      b.dataset.c = c;
      b.setAttribute('aria-label', `Colour ${c + 1}`);
      b.style.setProperty('--c', pz.paletteHex[c]);
      b.style.setProperty('--fg', textColor(rgb));
      b.innerHTML = `
        <svg class="ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle class="track" cx="32" cy="32" r="29.5"/>
          <circle class="prog" cx="32" cy="32" r="29.5" pathLength="100" stroke-dasharray="0 100"/>
        </svg>
        <span class="dot"><span class="num">${c + 1}</span></span>
        <svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
      b.addEventListener('click', () => this.onSelect(c));
      el.appendChild(b);
      this.buttons.set(c, b);
    });
  }

  setProgress(c, done, total) {
    const b = this.buttons.get(c);
    if (!b) return;
    const pct = total ? (100 * done) / total : 100;
    const prog = b.querySelector('.prog');
    prog.setAttribute('stroke-dasharray', `${pct.toFixed(2)} 100`);
    prog.classList.toggle('zero', done === 0);
  }

  select(c, scroll = true) {
    if (this.selected >= 0) this.buttons.get(this.selected)?.classList.remove('sel');
    this.selected = c;
    const b = this.buttons.get(c);
    if (!b) return;
    b.classList.add('sel');
    if (scroll) this.scrollTo(b);
  }

  scrollTo(b) {
    const el = this.el;
    const target = b.offsetLeft + b.offsetWidth / 2 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }

  /** Colour finished: little celebration on the swatch, then it folds away. */
  vanish(c, done) {
    const b = this.buttons.get(c);
    if (!b) { done?.(); return; }
    this.buttons.delete(c);
    b.classList.add('finished');
    b.disabled = true;
    setTimeout(() => {
      b.style.width = b.offsetWidth + 'px';
      void b.offsetWidth;
      b.classList.add('collapse');
      setTimeout(() => { b.remove(); }, 380);
      done?.();
    }, 650);
  }

  /** Remove instantly (colours already finished when the puzzle opens). */
  remove(c) { this.buttons.get(c)?.remove(); this.buttons.delete(c); }

  remaining() { return [...this.buttons.keys()]; }
}
