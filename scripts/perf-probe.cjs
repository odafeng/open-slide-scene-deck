#!/usr/bin/env node
// Measures main-thread long tasks and frame gaps across every page change of a deck, in headed Chrome.
// usage: PW=<playwright module> [EXE=<chrome binary>] node perf-probe.cjs <url> <pages>
// Do not add screenshots to this script: each one costs ~300 ms and shows up as a gap.
const { chromium } = require(process.env.PW || 'playwright');
const [url, nPages] = [process.argv[2], +process.argv[3]];
if (!url || !nPages) {
  console.error('usage: node perf-probe.cjs <url> <pages>');
  process.exit(2);
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.EXE || undefined, headless: false, args: ['--window-size=1920,1080'] });
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('console:', m.text().slice(0, 200));
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.keyboard.press('f');
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    window.__lt = [];
    window.__gaps = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]);
    }).observe({ type: 'longtask' });
    let last = performance.now();
    const tick = (t) => {
      if (t - last > 34) window.__gaps.push([Math.round(last), Math.round(t - last)]);
      last = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  let bad = 0;
  for (let p = 2; p <= nPages; p++) {
    const t0 = await page.evaluate(() => {
      window.__lt.length = 0;
      window.__gaps.length = 0;
      return performance.now();
    });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(3200);
    const r = await page.evaluate(
      (t0) => ({
        lt: window.__lt.map(([s, d]) => [Math.round(s - t0), d]),
        gaps: window.__gaps.filter(([, d]) => d > 50).map(([s, d]) => [Math.round(s - t0), d]),
      }),
      t0,
    );
    if (r.lt.length || r.gaps.length) bad++;
    console.log(`p${String(p).padStart(2, '0')}: longtasks=${JSON.stringify(r.lt)} gaps>50ms=${JSON.stringify(r.gaps)}`);
  }
  console.log(bad ? `${bad} page change(s) with jank` : 'clean: 0 long tasks, 0 gaps > 50 ms');
  await browser.close();
  process.exit(0);
})();
