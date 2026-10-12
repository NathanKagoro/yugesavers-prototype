// Browser check used by CI: serves dist/ from the Pages subfolder, walks the core
// flow (staff publishes a bundle, shopper adds it, basket adds up, order placed),
// then screenshots every page at 1440, 390 and 360 px. Fails on any console error,
// failed request, horizontal overflow or broken expectation.
//   CHROME=/path/to/chrome node scripts/screenshots.mjs
import { mkdirSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { serve } from './serve.mjs';

const PORT = 4389;
const BASE = `http://127.0.0.1:${PORT}/yugesavers-prototype/`;
const PAGES = ['index.html', 'shop.html', 'offers.html', 'recipes.html', 'recipe.html?id=6', 'basket.html', 'profile.html', 'staff.html'];
const WIDTHS = [1440, 390, 360];
const chrome = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync);
if (!chrome) throw new Error('Chrome not found. Set CHROME to its path.');

const server = await serve('dist', PORT);
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
const problems = [];

async function open(path, width = 390) {
  const page = await browser.newPage();
  const mobile = width < 600;
  await page.setViewport({ width, height: mobile ? 800 : 900, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${path}: console error: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${path}: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${path}: ${r.status()} ${r.url()}`); });
  await page.goto(BASE + path, { waitUntil: 'networkidle0' });
  return page;
}
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.trim());
const clickText = (page, sel, label) => page.evaluate((s, l) => {
  const el = [...document.querySelectorAll(s)].find((b) => b.textContent.trim().startsWith(l));
  if (!el) throw new Error(`No ${s} starting "${l}"`);
  el.click();
}, sel, label);

try {
  // ---- The core flow, in one browser profile so localStorage is shared ----
  const staff = await open('staff.html');
  assert.equal(await staff.$$eval('#liveList > li', (l) => l.length), 2, 'two bundles are live at the start');
  await staff.click('#generate');
  assert.equal(await text(staff, '.hh-big'), 'Chicken Fajita Night');
  await clickText(staff, '#proposal button', 'Publish to app');
  assert.equal(await staff.$$eval('#liveList > li', (l) => l.length), 3, 'published bundle is live');
  await staff.close();

  const home = await open('index.html');
  assert.match(await text(home, '#homeBundles'), /Chicken Fajita Night/, 'shopper sees the new bundle on Home');
  assert.match(await text(home, '#staffNote'), /3 bundles today, 1 of them by you/);
  const card = 'article.bundle:nth-of-type(3)';
  assert.equal(await text(home, `${card} .left strong`), '12');
  await clickText(home, `${card} button`, 'Add bundle');
  assert.equal(await text(home, `${card} .left strong`), '11', 'left count drops when added');
  assert.equal(await text(home, '#basketCount'), '1', 'nav badge counts the basket');
  await home.close();

  const shop = await open('shop.html?q=pasta');
  assert.equal(await shop.$$eval('#shelves .bay', (l) => l.length), 1, 'search for pasta leaves one product');
  await shop.click('#shelves .bay button');
  await shop.close();
  const dairy = await open('shop.html?cat=dairy');
  assert.equal(await dairy.$$eval('#shelves .bay', (l) => l.length), 3, 'category link filters the shop');
  await dairy.close();

  const basket = await open('basket.html');
  // 1 fajita bundle at £6.95 + penne £1.40 = £8.35, plus £2.50 delivery.
  assert.equal(await text(basket, '.r-total dd'), '£10.85');
  assert.match(await text(basket, '.r-delivery p'), /Spend £21\.65 more for free delivery/);
  assert.match(await text(basket, '.r-waste'), /1\.05 kg/);
  await basket.click('.btn-checkout');
  assert.match(await text(basket, '.deli-text'), /Nothing was charged/);
  await basket.close();

  const recipe = await open('recipe.html?id=1');
  assert.equal(await text(recipe, '.buy .left strong'), '11', 'sold bundle stays off the count after checkout');
  assert.deepEqual(await recipe.$$eval('.steps li', (l) => l.map((x) => x.textContent.slice(0, 2))), ['Sl', 'Cu', 'Ad', 'Wa'], 'steps carry no hand-typed numbers');
  await recipe.close();

  // Refill the basket so its screenshot shows a full receipt.
  const refill = await open('offers.html');
  await clickText(refill, '#offerBundles button', 'Add bundle');
  await clickText(refill, '#offerShelves button', 'Add');
  await clickText(refill, '#coupons button', 'Clip');
  assert.equal(await text(refill, '#basketCount'), '2');
  await refill.close();

  // ---- Screenshots, with the state the flow left behind ----
  mkdirSync('screenshots', { recursive: true });
  for (const width of WIDTHS) {
    for (const path of PAGES) {
      const page = await open(path, width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) problems.push(`${path} @${width}: ${overflow}px horizontal overflow`);
      await new Promise((r) => setTimeout(r, 800));
      await page.screenshot({ path: `screenshots/${path.replace(/\.html.*/, '')}-${width}.png`, fullPage: true });
      await page.close();
    }
  }
} catch (err) {
  problems.push(err.stack || String(err));
} finally {
  await browser.close();
  server.close();
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Flow passed; ${PAGES.length * WIDTHS.length} screenshots in screenshots/`);
