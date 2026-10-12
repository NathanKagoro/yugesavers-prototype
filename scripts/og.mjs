// Regenerate the 1200x630 social preview (src/assets/og.png) from the site's own
// CSS and pack shots. Run after `npm run build`; commit the PNG it writes.
import { writeFileSync, rmSync, existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { serve } from './serve.mjs';

const packs = ['egg-noodles', 'closed-cup-mushrooms', 'baby-spinach', 'soy-sauce'];
const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="css/app.css">
<style>
  body { width: 1200px; height: 630px; overflow: hidden; background: #eceef0; }
  .wall { position: absolute; inset: 0 0 150px 0; background: #fff; }
  .row { position: absolute; left: 40px; bottom: 150px; display: flex; align-items: flex-end; gap: 6px; }
  .row img { width: 138px; height: 138px; }
  .rail { position: absolute; left: 0; right: 0; bottom: 96px; height: 54px; background: #c5cad0; border-top: 6px solid #8d949c; border-bottom: 4px solid #8d949c; }
  .label { position: absolute; left: 48px; bottom: 26px; padding: 12px 18px; background: #fff; border: 6px solid #c5cad0; font-size: 25px; font-weight: 600; max-width: 520px; line-height: 1.25; }
  .big { position: absolute; right: 56px; top: 44px; width: 500px; padding: 0 28px 26px; background: #ffe100; border-radius: 16px; transform: rotate(-5deg); box-shadow: 4px 7px 0 rgb(0 0 0 / .28); text-align: center; }
  .big .head { margin: 0 -28px 18px; padding: 8px 0; background: #111; color: #ffe100; border-radius: 16px 16px 0 0; font-size: 46px; font-weight: 900; font-stretch: 112%; letter-spacing: .04em; }
  .big h1 { font-size: 62px; font-weight: 900; font-stretch: 112%; line-height: .95; letter-spacing: -.02em; }
  .big p { margin-top: 14px; font-size: 31px; font-weight: 600; line-height: 1.2; }
  .big .price { font-size: 170px; margin-top: 12px; }
  .was { font-size: 30px; font-weight: 600; margin-top: 10px; }
  .sign { position: absolute; left: 40px; top: 0; padding: 18px 26px; background: #0a3ea6; color: #fff; font-size: 34px; font-weight: 900; font-stretch: 112%; border-radius: 0 0 6px 6px; }
</style>
<div class="wall"></div>
<div class="sign">Harbour Road store, aisle 1</div>
<div class="row">${packs.map((p) => `<img src="assets/packs/${p}.svg" alt="">`).join('')}</div>
<div class="rail"></div>
<div class="label">A supermarket app prototype: near-expiry stock becomes discounted meal bundles</div>
<div class="big">
  <div class="head">REDUCED</div>
  <h1>YugeSavers</h1>
  <p>Rescue bundles with a recipe</p>
  <p class="was">was <s>£4.85</s></p>
  <span class="price"><span class="price-in"><span class="price-cur">£</span><span>2</span><span class="price-small">40</span></span></span>
</div>`;

const chrome = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find(existsSync);
writeFileSync('dist/_og.html', html);
const server = await serve('dist', 4388);
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630 });
await page.goto('http://127.0.0.1:4388/yugesavers-prototype/_og.html', { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'src/assets/og.png', type: 'png' });
await browser.close();
server.close();
rmSync('dist/_og.html');
console.log('Wrote src/assets/og.png');
