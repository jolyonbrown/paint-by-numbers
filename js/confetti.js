// A short confetti burst on a full-screen canvas, in the picture's own colours.
export function confetti(colors, { duration = 2600, count = 160 } = {}) {
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.appendChild(c);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth, H = window.innerHeight;
  c.width = W * dpr; c.height = H * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const fromLeft = i % 2 === 0;
    const a = (35 + Math.random() * 45) * Math.PI / 180;
    const sp = 14 + Math.random() * 12;
    parts.push({
      x: fromLeft ? -10 : W + 10, y: H * (0.6 + Math.random() * 0.3),
      vx: Math.cos(a) * sp * (fromLeft ? 1 : -1) * (W / 800), vy: -Math.sin(a) * sp * Math.sqrt(H / 1000),
      w: 6 + Math.random() * 7, h: 4 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      color: colors[i % colors.length], wob: Math.random() * 6,
    });
  }
  const t0 = performance.now();
  let last = t0;
  const frame = (t) => {
    const dt = Math.min(2, (t - last) / 16.7); last = t;
    const k = (t - t0) / duration;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1;
    for (const p of parts) {
      p.vy += 0.32 * dt; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.wob += 0.1 * dt;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.wob));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (k < 1 && c.isConnected) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
}

export function clearConfetti() { document.querySelectorAll('canvas.confetti').forEach((c) => c.remove()); }
