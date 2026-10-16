// Browser smoke test: opens the game, every panel and every mini-game on desktop and phone sizes,
// and fails on any page error. Needs Chrome; set CHROME_PATH if it is not in a usual place.
import { existsSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';

const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((p) => p && existsSync(p));
if (!CHROME) {
  console.error('Chrome not found; set CHROME_PATH.');
  process.exit(1);
}

const MINIS = ['checkout', 'oden', 'deli', 'bakery', 'coffee', 'bagging'];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false },
  { name: 'phone', width: 390, height: 760, isMobile: true, hasTouch: true },
];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({ server: { port: 5198, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const failures = [];

async function step(vp, name, fn, page) {
  try {
    await fn();
    console.log(`  ok   ${vp} · ${name}`);
  } catch (e) {
    failures.push(`${vp} · ${name}: ${e.message}`);
    console.log(`  FAIL ${vp} · ${name}: ${e.message}`);
  }
  await page.keyboard.press('Escape').catch(() => {});
}

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ ...vp, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const check = (what) => {
    if (errors.length) throw new Error(`${what}: ${errors.splice(0).join(' | ')}`);
  };
  await page.goto('http://localhost:5198/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(500);

  await step(vp.name, 'loads', async () => {
    const ok = await page.evaluate(() => !!window.game && !!document.querySelector('canvas'));
    if (!ok) throw new Error('game not created');
    check('load');
  }, page);

  await step(vp.name, 'panels', async () => {
    const labels = await page.$$eval('.bar .btn', (bs) => bs.map((b) => b.textContent));
    for (const label of labels) {
      await page.evaluate((l) => [...document.querySelectorAll('.bar .btn')].find((b) => b.textContent === l)?.click(), label);
      await wait(150);
      await page.evaluate(() => document.querySelector('.modal .btn.icon, .modal-close')?.click());
      await page.evaluate(() => window.game.ui.closeModal());
      await wait(50);
      check(`panel ${label}`);
    }
  }, page);

  for (const m of MINIS) {
    await step(vp.name, `mini-game ${m}`, async () => {
      await page.evaluate((k) => window.debug[k](), m);
      await wait(500);
      const box = await page.$eval('.mini-canvas', (c) => { const r = c.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
      await page.mouse.click(box[0] + box[2] / 2, box[1] + box[3] / 2);
      await wait(200);
      await page.evaluate(() => document.querySelectorAll('.mini-bottom > .btn.ghost').forEach((b) => b.click()));
      await wait(100);
      check(m);
      if (await page.$('.mini')) throw new Error('did not close');
    }, page);
  }

  await step(vp.name, 'a day of business', async () => {
    await page.evaluate(() => {
      const g = window.game;
      g.state.level = 5;
      g.state.money = 1e5;
      g.rebuild();
      g.startDay();
      for (let i = 0; i < 3000 && !g.sim.done; i++) {
        g.sim.tickReal(0.04);
        g.sim.update(0.25);
      }
    });
    await wait(400);
    check('day');
  }, page);

  await step(vp.name, 'languages', async () => {
    for (const code of ['zh', 'ja', 'ko', 'en']) {
      await page.evaluate(async (c) => (await import('/src/i18n/index.ts')).setLocale(c), code);
      await wait(100);
    }
    check('locale');
  }, page);
  await page.close();
}

await browser.close();
await server.close();
if (failures.length) {
  console.error(`\n${failures.length} smoke check(s) failed`);
  process.exit(1);
}
console.log('\nsmoke checks passed');
