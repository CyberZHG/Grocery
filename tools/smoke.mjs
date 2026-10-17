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

  await step(vp.name, 'collection', async () => {
    await page.evaluate(() => [...document.querySelectorAll('.bar .btn')].find((b) => b.textContent === 'Achievements')?.click());
    await wait(150);
    await page.evaluate(() => document.querySelectorAll('.tabs .btn')[1]?.click());
    await wait(150);
    const n = await page.$$eval('.col-grid', (g) => g.length);
    if (n !== 12) throw new Error(`expected 12 categories, got ${n}`);
    await page.click('.col-cell');
    check('collection');
    await page.evaluate(() => window.game.ui.closeModal());
  }, page);

  if (!vp.isMobile) {
    await step(vp.name, 'keyboard', async () => {
      const paused = () => page.evaluate(() => window.game.paused());
      const before = await paused();
      await page.keyboard.press('Space');
      if ((await paused()) === before) throw new Error('space did not toggle pause');
      await page.keyboard.press('Space');
      await page.evaluate(() => window.debug.checkout());
      await wait(300);
      await page.keyboard.press('Escape');
      await wait(100);
      if (await page.$('.mini')) throw new Error('escape did not close the mini-game');
      check('keyboard');
    }, page);

  }

  await step(vp.name, vp.isMobile ? 'drag fixture' : 'drag fixture and right click', async () => {
    const plan = await page.evaluate(async () => {
      const g = window.game;
      const { canPlace } = await import('/src/game/layout.ts');
      g.ui.openBuild(null);
      const f = g.state.fixtures.find((x) => x.placed && x.kind !== 'decor');
      const others = g.state.fixtures.filter((x) => x.placed && x.id !== f.id);
      let to = null;
      for (let dy = 1; dy < 6 && !to; dy++) for (let dx = -3; dx <= 3 && !to; dx++) {
        if (canPlace(g.sim.layout, others, { ...f, x: f.x + dx, y: f.y + dy })) to = { x: f.x + dx, y: f.y + dy };
      }
      const dpr = window.devicePixelRatio || 1;
      const screen = (x, y) => [((x * 32 + 16 - g.cam.x) * g.cam.zoom) / dpr, ((y * 32 + 16 - g.cam.y) * g.cam.zoom) / dpr];
      return { id: f.id, from: screen(f.x, f.y), to: to && screen(to.x, to.y), want: to };
    });
    if (!plan.to) throw new Error('no free spot to drag to');
    await wait(100);
    const path = (i) => [plan.from[0] + ((plan.to[0] - plan.from[0]) * i) / 8, plan.from[1] + ((plan.to[1] - plan.from[1]) * i) / 8];
    if (vp.isMobile) {
      // on touch a fixture must be selected before it can be dragged
      await page.touchscreen.tap(...plan.from);
      await wait(100);
      await page.touchscreen.touchStart(...plan.from);
      for (let i = 1; i <= 8; i++) {
        await page.touchscreen.touchMove(...path(i));
        await wait(20);
      }
      await page.touchscreen.touchEnd();
    } else {
      await page.mouse.move(...plan.from);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) {
        await page.mouse.move(...path(i));
        await wait(20);
      }
      await page.mouse.up();
    }
    await wait(100);
    const at = await page.evaluate((id) => { const f = window.game.state.fixtures.find((x) => x.id === id); return { x: f.x, y: f.y }; }, plan.id);
    if (at.x !== plan.want.x || at.y !== plan.want.y) throw new Error(`fixture at ${at.x},${at.y}, expected ${plan.want.x},${plan.want.y}`);
    if (vp.isMobile) {
      await page.evaluate(() => window.game.ui.closeBuild());
      check('drag');
      return;
    }
    const clickRight = () => page.mouse.click(5, 300, { button: 'right' });
    await clickRight();
    await wait(50);
    if (await page.evaluate(() => window.game.build?.selected !== null)) throw new Error('right click did not clear the selection');
    await clickRight();
    await wait(50);
    if (await page.evaluate(() => !!window.game.build)) throw new Error('right click did not leave build mode');
    await page.evaluate(() => [...document.querySelectorAll('.bar .btn')].find((b) => b.textContent === 'Staff')?.click());
    await wait(150);
    await clickRight();
    await wait(100);
    if (await page.$('.modal')) throw new Error('right click did not close the dialog');
    check('drag');
  }, page);

  await step(vp.name, 'cancel a purchase', async () => {
    const before = await page.evaluate(() => {
      const g = window.game;
      g.state.money = 5000;
      g.ui.openBuild(null);
      return { money: g.state.money, n: g.state.fixtures.length };
    });
    await wait(100);
    await page.evaluate(() => document.querySelector('.build .row.wrap .btn.small:not([disabled])').click());
    await wait(50);
    if (await page.evaluate(() => window.game.state.money) >= before.money) throw new Error('nothing was bought');
    await page.evaluate(() => [...document.querySelectorAll('.build .btn.ghost')].pop().click());
    await wait(50);
    const after = await page.evaluate(() => ({ money: window.game.state.money, n: window.game.state.fixtures.length }));
    await page.evaluate(() => window.game.ui.closeBuild());
    if (after.money !== before.money || after.n !== before.n) throw new Error(`not refunded: ${JSON.stringify({ before, after })}`);
    check('cancel purchase');
  }, page);

  await step(vp.name, 'store chain', async () => {
    await page.evaluate(() => {
      const g = window.game;
      g.state.level = 5;
      g.state.reputation.level = 20;
      g.state.money = 1e6;
      g.rebuild();
      g.checkChain();
      g.ui.refresh();
    });
    const openExpand = async () => {
      await page.evaluate(() => [...document.querySelectorAll('.bar .btn')].find((b) => b.textContent === 'Expand').click());
      await wait(100);
      await page.evaluate(() => [...document.querySelectorAll('.modal .tabs .btn')].find((b) => b.textContent === 'Chain').click());
    };
    await openExpand();
    await wait(150);
    await page.evaluate(() => [...document.querySelectorAll('.modal .btn.primary')].pop().click());
    await wait(100);
    await page.evaluate(() => document.querySelector('.modal .btn.warn').click());
    await wait(200);
    if (await page.evaluate(() => window.game.state.active) !== 1) throw new Error('branch did not open');
    await openExpand();
    await wait(150);
    await page.evaluate(() => document.querySelector('.chain-head .btn').click());
    await wait(200);
    const st = await page.evaluate(() => ({ active: window.game.state.active, level: window.game.state.level, stores: window.game.state.stores.length }));
    if (st.active !== 0 || st.level !== 5 || st.stores !== 2) throw new Error(`switch back failed: ${JSON.stringify(st)}`);
    await page.evaluate(() => [...document.querySelectorAll('.bar .btn')].find((b) => b.textContent === 'Goals').click());
    await wait(150);
    if (!(await page.$('.modal .challenge'))) throw new Error('goals panel has no store challenge');
    await page.evaluate(() => window.game.ui.closeModal());
    check('chain');
  }, page);

  await step(vp.name, 'street', async () => {
    await page.evaluate(() => {
      window.game.state.money = 1e6;
      window.game.ui.refresh();
      [...document.querySelectorAll('.bar .btn')].find((b) => b.textContent === 'Expand').click();
    });
    await wait(150);
    await page.evaluate(() => [...document.querySelectorAll('.modal .tabs .btn')].find((b) => b.textContent === 'Street').click());
    await wait(100);
    await page.evaluate(() => document.querySelector('.modal .lot').click());
    await wait(100);
    await page.evaluate(() => document.querySelector('.modal .bld-opt').click());
    await wait(100);
    const built = await page.evaluate(() => window.game.state.street[0]);
    if (!built) throw new Error('nothing was built');
    await page.evaluate(() => [...document.querySelectorAll('.modal .btn.primary')].pop().click());
    await wait(100);
    if (await page.evaluate(() => window.game.state.street[0].level) !== 2) throw new Error('upgrade failed');
    await page.evaluate(() => window.game.ui.closeModal());
    check('street');
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
