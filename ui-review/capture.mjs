import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('./artifacts/', import.meta.url));
const base = process.env.REVIEW_URL || 'http://127.0.0.1:3000';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local review URLs only');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const observations = [];
try {
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: device === 'mobile', hasTouch: device === 'mobile' });
    for (const [name, route] of [['library', '/'], ['overview', '/sets/spanish-basics'], ['flashcards', '/sets/spanish-basics/flashcards'], ['learn', '/sets/spanish-basics/learn'], ['test', '/sets/spanish-basics/test'], ['match', '/sets/spanish-basics/match'], ['create', '/create']]) {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      await page.getByRole('banner').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${out}${device}-${name}.png`, fullPage: true });
      observations.push({ device, name, text: await page.locator('body').innerText(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), controls: await page.locator('button,input,select,textarea,a').evaluateAll(es => es.map(e => ({tag:e.tagName, text:e.innerText, label:e.getAttribute('aria-label'), title:e.getAttribute('title'), width:e.getBoundingClientRect().width, height:e.getBoundingClientRect().height}))) });
    }
    await page.close();
  }
  await writeFile(`${out}observations.json`, JSON.stringify(observations, null, 2));
} finally { await browser.close(); }
console.log(`Screenshots saved in ${out}`);
