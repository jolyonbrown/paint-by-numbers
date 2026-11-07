// Tiny synthesised sounds (no audio files). The AudioContext is created and resumed on the first
// touch, because iOS only allows audio that starts from a user gesture.

let ctx = null;
let enabled = true;
let master = null;

export function setSoundEnabled(on) { enabled = on; }
export function isSoundEnabled() { return enabled; }

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state !== 'running') ctx.resume();
  } catch {}
}

// Re-resume after iOS suspends audio (e.g. app sent to background).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') { try { ctx.resume(); } catch {} }
});

function tone(freq, { at = 0, dur = 0.18, type = 'sine', gain = 0.3, attack = 0.005, slide = 0 } = {}) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

// A pentatonic scale so consecutive fills always sound pleasant together.
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
let step = 0;

export const sfx = {
  fill() {
    step = (step + 1 + Math.floor(Math.random() * 2)) % PENTA.length;
    const f = PENTA[step];
    tone(f, { dur: 0.16, gain: 0.22 });
    tone(f * 2, { dur: 0.08, gain: 0.05 });
  },
  wrong() {
    tone(220, { dur: 0.16, type: 'triangle', gain: 0.18, slide: 0.8 });
  },
  select() { tone(1318.5, { dur: 0.05, gain: 0.06 }); },
  colorDone() {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.22, gain: 0.16 }));
  },
  hint() {
    tone(660, { dur: 0.35, gain: 0.08, slide: 1.5 });
    tone(990, { at: 0.12, dur: 0.3, gain: 0.06, slide: 1.3 });
  },
  finish() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
    notes.forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.5, gain: 0.16 }));
    [1046.5, 1318.51, 1567.98].forEach((f) => tone(f, { at: 0.75, dur: 1.2, gain: 0.1, type: 'triangle' }));
  },
};
