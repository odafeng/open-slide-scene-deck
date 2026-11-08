#!/usr/bin/env node
// Records a full walkthrough of a deck as a video: presses → once per page with a per-page dwell.
// usage: PW=<playwright module> [EXE=<chrome>] [DWELL_JSON='{"1":3500,"8":8500}'] node record-walkthrough.cjs <url> <pages> <outDir>
// Then: ffmpeg -i <outDir>/*.webm -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart walkthrough.mp4
const fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const [url, nPages, out] = [process.argv[2], +process.argv[3], process.argv[4]];
if (!url || !nPages || !out) {
  console.error('usage: node record-walkthrough.cjs <url> <pages> <outDir>');
  process.exit(2);
}
const dwell = Object.assign({ default: 5500 }, JSON.parse(process.env.DWELL_JSON || '{}'));
const wait = (p) => dwell[p] ?? dwell.default;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.EXE || undefined, headless: false, args: ['--window-size=1920,1080'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: out, size: { width: 1920, height: 1080 } } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.keyboard.press('f');
  await page.waitForTimeout(2000);
  const t0 = Date.now();
  await page.waitForTimeout(wait(1));
  for (let p = 2; p <= nPages; p++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(wait(p));
  }
  console.log('walkthrough ms:', Date.now() - t0);
  const v = page.video();
  await ctx.close();
  const path = await v.path();
  console.log('video:', path);
  if (!fs.existsSync(path)) console.log('no file written: Playwright’s ffmpeg probably lacks a VP8 encoder, see references/verification.md');
  await browser.close();
  process.exit(0);
})();
