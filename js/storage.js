// Saved progress and settings. Every localStorage access is wrapped: private mode / full storage
// must never break the game, it just stops saving.
import { fromBase64, toBase64 } from './codec.js';

const PREFIX = 'pbn:';

function get(key) {
  try { const v = localStorage.getItem(PREFIX + key); return v ? JSON.parse(v) : null; } catch { return null; }
}
function set(key, val) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; } catch { return false; }
}
function del(key) {
  try { localStorage.removeItem(PREFIX + key); } catch {}
}

export const settings = {
  load() { return { sound: true, shading: true, ...(get('settings') || {}) }; },
  save(s) { set('settings', s); },
};

/**
 * Progress for one picture: { order: number[] (sections in the order she filled them), selected, view, updated, done }.
 * Saved progress is tied to the picture's hash so a re-generated picture can't load mismatched data.
 */
export const progress = {
  load(id, hash) {
    const p = get('progress:' + id);
    if (!p || p.hash !== hash) return null;
    try {
      const bytes = fromBase64(p.order || '');
      const order = Array.from(new Uint16Array(bytes.buffer, 0, bytes.length >> 1));
      return { ...p, order };
    } catch { return null; }
  },
  save(id, hash, { order, selected, view, done, finishedAt }) {
    const u16 = Uint16Array.from(order);
    return set('progress:' + id, {
      hash, order: toBase64(new Uint8Array(u16.buffer)), selected, view, done: !!done, finishedAt: finishedAt || null, updated: Date.now(),
    });
  },
  /** Lightweight summary for the menu without decoding the order. */
  summary(id, hash) {
    const p = get('progress:' + id);
    if (!p || p.hash !== hash) return null;
    let count = 0;
    try { count = Math.floor((atob(p.order || '').length) / 2); } catch {}
    return { count, done: !!p.done, updated: p.updated || 0, finishedAt: p.finishedAt || p.updated || 0, order: p.order };
  },
  clear(id) { del('progress:' + id); },
};

// Ask the browser not to evict our storage (harmless where unsupported).
try { navigator.storage?.persist?.(); } catch {}
