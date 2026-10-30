// Staging-only smoke test: start the static site before running this script.
const { chromium } = require('playwright');
const assert = require('assert');
const origin = process.env.SITE_URL || 'http://127.0.0.1:8080';
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1365, height: 850 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => sessionStorage.setItem('wn_loader', '1'));
  const page = await ctx.newPage();
  const errors = [], bad = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.url().startsWith(origin) && r.status() >= 400) bad.push([r.status(), r.url()]); });
  const paths = ['index.html', 'service.html', 'shop.html', 'product.html#a4', 'projects.html'];
  const contacts = ['https://t.me/webnicssmng', 'https://t.me/webnicss_bot', 'https://t.me/webnicss', 'https://t.me/webnicss_reviews', 'tel:+79608714367'];
  for (const path of paths) {
    await page.goto(`${origin}/${path}`, { waitUntil: 'load' });
    for (const href of contacts) assert(await page.locator(`footer a[href="${href}"]`).count(), `${path} missing ${href}`);
    assert.equal(await page.locator('a[href^="mailto:hello@"]').count(), 0, path);
    assert.equal(await page.locator('footer a[href="admin.html"]').count(), 0, path);
    console.log('PASS footer', path);
  }
  // The projects page has a cart overlay too.
  await page.locator('#menuCart').evaluate(e => e.click());
  await page.waitForTimeout(500);
  assert(await page.locator('#cartOverlay').evaluate(e => e.classList.contains('open')));
  await page.locator('[data-cart-close]').first().evaluate(e => e.click());
  await page.goto(`${origin}/shop.html`);
  await page.waitForSelector('.good-card');
  const names = await page.locator('.good-name').allTextContents();
  assert.equal(names.length, 13);
  assert(!names.some(n => /cursor|suno|контент.мейкер/i.test(n)));
  const pairs = await page.locator('.good-card').evaluateAll(cards => Object.fromEntries(cards.map(c => [c.querySelector('.good-name').textContent.trim(), c.querySelector('.good-price').textContent.replace(/\s/g, '')])));
  const expected = {
    'ChatGPT Plus — месяц':'2490', 'Claude Pro — месяц':'2590', 'Midjourney Standard — месяц':'2990', 'Perplexity Pro — 12 месяцев':'3990',
    'Telegram Premium — 3 месяца':'950', 'Telegram Premium — 12 месяцев':'2400', 'Telegram Stars — 100':'140', 'Telegram Stars — 500':'700', 'Telegram Stars — 1 000':'1400'
  };
  for (const [name, price] of Object.entries(expected)) assert(pairs[name]?.startsWith(price), `${name}: ${pairs[name]}`);
  for (const id of ['a7', 'a8', 'a9', 'a10']) {
    assert.equal((await page.locator(`[data-id="${id}"] .good-price`).textContent()).trim(), 'по запросу');
    assert.equal(await page.locator(`[data-id="${id}"] [data-add]`).count(), 0);
    assert.equal(await page.locator(`[data-id="${id}"] a.good-add[href="https://t.me/webnicssmng"]`).count(), 1);
  }
  await page.locator('[data-id="a1"] [data-add="a1"]').evaluate(e => e.click());
  await page.waitForTimeout(500);
  const cart = await page.locator('#cartBody').textContent();
  assert(cart.includes('ChatGPT Plus')); assert(cart.includes('Оплата на сайте подключается'));
  assert(cart.includes('выберите эти товары там ещё раз'));
  assert.equal(await page.locator('#cartBody a[href="https://t.me/webnicss_bot"]').count(), 1);
  assert.equal(await page.locator('#runPay').count(), 0);
  console.log('PASS 9 screenshot prices, 13 cards, cart leads to bot; no simulated payment');
  await page.goto(`${origin}/service.html#ai`);
  await page.waitForFunction(() => document.querySelector('#svRoot')?.textContent.includes('Подписки на нейросети'));
  assert(!/Cursor|Suno/i.test(await page.locator('#svRoot').textContent()));
  await page.goto(`${origin}/product.html#a4`);
  await page.waitForSelector('.prod-name');
  assert((await page.locator('.prod-name').textContent()).includes('12 месяцев'));
  assert((await page.locator('.prod-price').textContent()).replace(/\s/g, '').includes('3990'));
  await page.goto(`${origin}/product.html#a9`);
  await page.waitForSelector('.prod-name');
  assert((await page.locator('.prod-price').textContent()).includes('по запросу'));
  assert.equal(await page.locator('#prodRoot [data-add]').count(), 0);
  await page.goto(`${origin}/product.html#a5`);
  await page.waitForFunction(() => document.querySelector('#prodRoot')?.textContent.includes('Товар недоступен'));
  assert.equal(await page.locator('#prodRoot [data-add]').count(), 0);
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await mobile.addInitScript(() => sessionStorage.setItem('wn_loader', '1'));
  const m = await mobile.newPage(); m.on('pageerror', e => errors.push('mobile ' + e.message));
  for (const path of ['index.html', 'shop.html']) {
    await m.goto(`${origin}/${path}`, { waitUntil: 'load' });
    const widths = await m.evaluate(() => ({ w: document.documentElement.scrollWidth, v: innerWidth }));
    assert(widths.w <= widths.v, `${path}: ${JSON.stringify(widths)}`);
  }
  await m.goto(`${origin}/index.html`); await m.locator('#contact').scrollIntoViewIfNeeded(); await m.waitForTimeout(800);
  if (process.env.SCREENSHOT) await m.screenshot({ path: process.env.SCREENSHOT, fullPage: false });
  assert.deepEqual(errors, []); assert.deepEqual(bad, []);
  console.log('PASS mobile, page errors, HTTP responses');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
