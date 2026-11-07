// App entry: switches between the picture menu and a puzzle, handles updates and audio unlock.
import { Menu } from './menu.js';
import { Game } from './game.js';
import { decodePuzzle } from './codec.js';
import { progress, settings as settingsStore } from './storage.js';
import { unlockAudio, setSoundEnabled, sfx } from './sound.js';

const settings = settingsStore.load();
setSoundEnabled(settings.sound);
const saveSettings = () => settingsStore.save(settings);

const menuEl = document.getElementById('menu');
const gameEl = document.getElementById('game');
const loadingEl = document.getElementById('loading');
let screen = 'menu';
let game = null;
let pendingReload = false;

// iOS: stop Safari zooming the page itself, and unlock audio on the first touch.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
const unlock = () => unlockAudio();
document.addEventListener('pointerdown', unlock, true);
document.addEventListener('touchend', unlock, true);

const soundBtn = document.querySelector('.sound-toggle');
const renderSound = () => { soundBtn.classList.toggle('off', !settings.sound); soundBtn.setAttribute('aria-pressed', String(settings.sound)); };
soundBtn.addEventListener('click', () => {
  settings.sound = !settings.sound;
  setSoundEnabled(settings.sound);
  saveSettings();
  renderSound();
  if (settings.sound) { unlockAudio(); sfx.select(); }
});
renderSound();

const menu = new Menu(menuEl, { onOpen: (e) => openPicture(e) });

const puzzleCache = new Map();
async function loadPuzzle(entry) {
  const key = entry.id + ':' + entry.hash;
  if (puzzleCache.has(key)) return puzzleCache.get(key);
  const json = await fetch(`pictures/${entry.id}/puzzle.json`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const pz = decodePuzzle(json);
  pz.hash = entry.hash; // progress is keyed to the menu's hash
  puzzleCache.clear(); // keep memory low: only the current puzzle
  puzzleCache.set(key, pz);
  return pz;
}

async function openPicture(entry) {
  loadingEl.hidden = false;
  let pz;
  try {
    pz = await loadPuzzle(entry);
  } catch (err) {
    loadingEl.hidden = true;
    console.error(err);
    alert('Sorry, that picture could not be loaded. Please check the connection and try again.');
    return;
  }
  const saved = progress.load(entry.id, entry.hash);
  screen = 'puzzle';
  gameEl.className = 'screen game';
  menuEl.hidden = true;
  gameEl.hidden = false;
  game = new Game(gameEl, pz, saved, {
    settings,
    saveSettings,
    fast: !!window.__app?.fast,
    onExit: () => showMenu(),
    onRestart: () => { game = null; openPicture(entry); },
  });
  loadingEl.hidden = true;
}

function showMenu() {
  game = null;
  screen = 'menu';
  gameEl.hidden = true;
  gameEl.className = 'screen game';
  menuEl.hidden = false;
  if (pendingReload) { location.reload(); return; }
  menu.refresh();
}

menu.load().catch((err) => {
  console.error(err);
  menuEl.querySelector('.menu-list').innerHTML = '<p class="empty">Pictures could not be loaded.</p>';
});

// ---- Offline + updates ----
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch((err) => console.warn('service worker', err));
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // first install: nothing to refresh
    // Never reload in the middle of a picture; wait until she is back on the menu.
    if (screen === 'menu') location.reload(); else pendingReload = true;
  });
}

// Debug hook for tests.
const app = window.__app || (window.__app = {});
Object.defineProperties(app, {
  game: { get: () => game, configurable: true },
  screen: { get: () => screen, configurable: true },
});
app.menu = menu;
app.openPicture = (id) => openPicture(menu.entries.find((e) => e.id === id));
app.entries = () => menu.entries;
