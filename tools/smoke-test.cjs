#!/usr/bin/env node
// Smoke test: opens every picture on an emulated iPad, does a real tap-to-fill, fills the rest
// through the debug hook (window.__app), finishes the last section with a hint + real tap, and
// checks the completion card appears and that there were no console errors.
//
//   node tools/smoke-test.cjs            # starts its own local server
//   node tools/smoke-test.cjs --shots    # also saves screenshots to tmp/smoke/

const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}/`;
const shots = process.argv.includes('--shots');
const SHOTS = path.join(ROOT, 'tmp', 'smoke');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE + 'index.html'); if (r.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error('server did not start');
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  let failed = 0;
  const browser = await chromium.launch();
  try {
    await waitForServer();
    if (shots) fs.mkdirSync(SHOTS, { recursive: true });
    const ctx = await browser.newContext({ ...devices['iPad (gen 7)'], serviceWorkers: 'block' });
    await ctx.addInitScript(() => { window.__app = { fast: true }; });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('page error: ' + e.message));
    page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });

    await page.goto(BASE + 'index.html');
    await page.waitForFunction(() => document.querySelectorAll('.card.ready').length > 0);
    const ids = await page.evaluate(() => window.__app.entries().map((e) => e.id));
    console.log(`pictures: ${ids.join(', ')}`);

    for (const id of ids) {
      const t0 = Date.now();
      const errBefore = errors.length;
      await page.evaluate(() => { try { localStorage.clear(); } catch {} });
      await page.click(`.card[data-id="${id}"]`);
      await page.waitForFunction(() => window.__app.game && window.__app.screen === 'puzzle');
      await sleep(300);

      // 1. A real tap on a section of the selected colour.
      const target = await page.evaluate(() => {
        const g = window.__app.game, v = g.view, pz = g.pz;
        const s = pz.colorSections[g.selected].slice().sort((a, b) => pz.labels.r[pz.pole[b]] - pz.labels.r[pz.pole[a]])[0];
        const li = pz.pole[s];
        v.setCenter(Math.max(v.scale, 14 / pz.labels.r[li]), pz.labels.x[li], pz.labels.y[li]);
        const r = v.canvas.getBoundingClientRect();
        return { s, x: r.left + pz.labels.x[li] * v.scale + v.tx, y: r.top + pz.labels.y[li] * v.scale + v.ty };
      });
      await sleep(100);
      await page.touchscreen.tap(target.x, target.y);
      await sleep(600);
      const tapped = await page.evaluate((s) => !!window.__app.game.filled[s], target.s);
      if (!tapped) { console.error(`  ✗ ${id}: tapping section ${target.s} did not fill it`); failed++; }

      // 2. Fill everything but one section through the debug hook.
      await page.evaluate(() => window.__app.game.debugFillAll(1));
      await sleep(1200); // let the colour row animations settle
      if (shots) await page.screenshot({ path: path.join(SHOTS, `${id}-almost.png`) });

      // 3. Ask for a hint, then tap the last section where the hint flew to.
      await page.click('.hud .hint');
      await sleep(1100);
      const last = await page.evaluate(() => {
        const g = window.__app.game, v = g.view, pz = g.pz;
        let s = -1;
        for (let i = 0; i < pz.S; i++) if (!g.filled[i]) s = i;
        const li = pz.pole[s];
        const r = v.canvas.getBoundingClientRect();
        return { s, color: pz.sectionColor[s], selected: g.selected, x: r.left + pz.labels.x[li] * v.scale + v.tx, y: r.top + pz.labels.y[li] * v.scale + v.ty };
      });
      if (last.color !== last.selected) { console.error(`  ✗ ${id}: last colour was not auto-selected`); failed++; }
      await page.touchscreen.tap(last.x, last.y);

      // 4. Completion card.
      try {
        await page.waitForSelector('.done-card:not([hidden])', { timeout: 8000 });
        await sleep(400);
      } catch {
        console.error(`  ✗ ${id}: completion card did not appear`); failed++;
      }
      if (shots) await page.screenshot({ path: path.join(SHOTS, `${id}-done.png`) });
      await page.click('.done-card .back');
      await page.waitForFunction(() => window.__app.screen === 'menu');
      const state = await page.textContent(`.card[data-id="${id}"] .state`);
      if (!/Finished/.test(state)) { console.error(`  ✗ ${id}: menu card does not say Finished (got "${state}")`); failed++; }

      const newErrors = errors.slice(errBefore);
      if (newErrors.length) { console.error(`  ✗ ${id}: console errors:\n    ${newErrors.join('\n    ')}`); failed++; }
      else console.log(`  ✓ ${id} (${Date.now() - t0} ms)`);
    }
    if (shots) await page.screenshot({ path: path.join(SHOTS, `menu-finished.png`) });
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  } catch (e) {
    console.error(e);
    failed++;
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(failed ? `\nFAILED (${failed})` : '\nAll good.');
  process.exit(failed ? 1 : 0);
})();
