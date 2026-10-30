/* WEBNICSS release check: start the static site on port 8080, then run this file.
   npm i playwright && npx playwright install chromium (outside the deployed web root). */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.SITE_URL || 'http://127.0.0.1:8080';
const pages = ['index.html', 'projects.html', 'shop.html', 'product.html#a4', 'service.html#sites', 'privacy.html', 'terms.html', 'security.html'];

function collect(page, errors, statuses, external) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(BASE) && response.status() >= 400) statuses.push(`${response.status()} ${response.url()}`);
  });
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith(BASE)) external.push(request.url());
  });
}
async function context(browser, view = {width: 1365, height: 850}) {
  const ctx = await browser.newContext({ viewport: view, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('wn_loader', '1'); } catch (_) {} });
  return ctx;
}
async function instrumentCanvas(ctx) {
  await ctx.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    const move = CanvasRenderingContext2D.prototype.moveTo;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.id === 'coreCanvas') window.__testFirstMovePending = true;
      return clear.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.moveTo = function (...args) {
      if (this.canvas.id === 'coreCanvas' && window.__testFirstMovePending) {
        window.__testFirstMovePending = false;
        window.__testCorePoint = args.slice(0, 2);
      }
      return move.apply(this, args);
    };
  });
}
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const errors = [], statuses = [], external = [];
    let ctx = await context(browser);
    let p = await ctx.newPage(); collect(p, errors, statuses, external);
    const contact = [
      ['https://t.me/webnicssmng', 'Менеджер'], ['https://t.me/webnicss_bot', 'Бот'],
      ['https://t.me/webnicss', 'Канал'], ['https://t.me/webnicss_reviews', 'Отзывы'],
      ['https://vk.ru/webnicss', 'ВКонтакте']
    ];
    for (const path of pages) {
      const response = await p.goto(`${BASE}/${path}`, {waitUntil: 'load'});
      assert.equal(response.status(), 200, path);
      for (const [href, text] of contact) {
        const social = p.locator(`footer .ft-social[href="${href}"]`);
        assert.equal(await social.count(), 1, `${path}: ${href}`);
        assert((await social.innerText()).includes(text), `${path}: label ${text}`);
      }
      for (const doc of ['privacy.html', 'terms.html', 'security.html']) {
        assert.equal(await p.locator(`footer a[href="${doc}"]`).count(), 1, `${path}: ${doc}`);
      }
      assert.equal(await p.locator('footer a[href="mailto:vladkarpovic21@gmail.com"]').count(), 1);
      assert.equal(await p.locator('footer a[href="tel:+79608714367"]').count() >= 1, true);
      assert.equal(await p.locator('a[href="admin.html"]').count(), 0);
      assert(!/только\s+ч[её]рный\s+премиум/i.test(await p.locator('footer').innerText()));
      assert.equal(await p.locator('script:not([src])').count(), 0, `${path}: inline script`);
      const unsafeBlankLinks = await p.locator('a[target="_blank"]').evaluateAll(links => links.filter(a => !a.relList.contains('noopener') || !a.relList.contains('noreferrer')).map(a => a.href));
      assert.deepEqual(unsafeBlankLinks, [], `${path}: unsafe external links`);
      const csp = await p.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
      assert.match(csp, /script-src 'self'/);
      assert(!/script-src[^;]*unsafe-inline/.test(csp));
      console.log('PASS labels, docs, CSP', path);
    }
    assert.deepEqual(errors, []); assert.deepEqual(statuses, []); assert.deepEqual(external, []);
    await p.goto(`${BASE}/privacy.html`);
    const privacy = await p.locator('article').innerText();
    for (const part of ['Карпович Владислав Александрович', 'vladkarpovic21@gmail.com', '+7 (961) 660-58-70', 'wn_cart']) assert(privacy.includes(part), part);
    assert((await p.locator('article').innerText()).includes('До публикации оператору необходимо'));
    console.log('PASS privacy identifies operator and flags pre-launch review');

    // CSP has to actually block injected inline code, not merely contain a meta tag.
    const cspResult = await p.evaluate(async () => {
      const violations = [];
      document.addEventListener('securitypolicyviolation', e => violations.push(e.effectiveDirective));
      const s = document.createElement('script'); s.textContent = 'window.__badInlineExecuted = true'; document.body.appendChild(s);
      const img = document.createElement('img'); img.setAttribute('onerror', 'window.__badHandlerExecuted = true'); img.src = 'data:image/png;base64,AA=='; document.body.appendChild(img);
      await new Promise(resolve => setTimeout(resolve, 300));
      return {inline: !!window.__badInlineExecuted, handler: !!window.__badHandlerExecuted, violations};
    });
    assert.equal(cspResult.inline, false); assert.equal(cspResult.handler, false);
    assert(cspResult.violations.some(x => x.startsWith('script-src')));
    console.log('PASS CSP blocked injected inline script and event handler');
    await ctx.close();

    // Invalid URL fragments should neither throw nor escape catalogue/service allowlists.
    ctx = await context(browser); p = await ctx.newPage(); const urlErrors = []; p.on('pageerror', e => urlErrors.push(e.message));
    for (const path of ['index.html#%5B', 'index.html#%E0%A4%A', 'service.html#constructor', 'service.html?id=__proto__', 'product.html#%3Csvg%20onload=alert(1)%3E']) {
      await p.goto(`${BASE}/${path}`, {waitUntil:'load'}); await p.waitForTimeout(150);
    }
    assert.deepEqual(urlErrors, []); assert.equal(await p.locator('#prodRoot svg[onload]').count(), 0);
    assert((await p.locator('#prodRoot').textContent()).includes('Товар недоступен'));
    console.log('PASS invalid hashes and untrusted service/product identifiers'); await ctx.close();

    // Duplicates are combined, unreasonable quantities dropped, and fields rebuilt from the catalogue.
    ctx = await browser.newContext({viewport:{width:1280,height:820}, reducedMotion:'reduce'});
    await ctx.addInitScript(() => {
      sessionStorage.setItem('wn_loader','1');
      localStorage.setItem('wn_cart', JSON.stringify([
        {id:'a1', name:'ChatGPT Plus — месяц', price:1, qty:1, img:'https://evil.invalid/x.png'},
        {id:'a1', name:'ChatGPT Plus — месяц', price:2490, qty:2, img:'" onerror="alert(1)'},
        {id:'a1', name:'ChatGPT Plus — месяц', price:2490, qty:999999999},
        {id:'a2', name:'<img src=x onerror=alert(1)>', price:1, qty:1},
        {id:'t2', name:'Telegram Premium — 12 месяцев', price:2400, qty:-2},
        {id:'a9', name:'Gemini Advanced', price:0, qty:2},
        {id:'not-a-product', name:'x', price:1, qty:1}
      ]));
    });
    p = await ctx.newPage(); const cartErrors = []; p.on('pageerror', e => cartErrors.push(e.message));
    await p.goto(`${BASE}/shop.html`, {waitUntil:'load'}); await p.locator('#menuCart').evaluate(e=>e.click());
    await p.locator('#cartBody img').waitFor({state:'attached', timeout:3000});
    const normalized = await p.evaluate(() => JSON.parse(localStorage.getItem('wn_cart')));
    assert.deepEqual(normalized, [{id:'a1', qty:3, name:'ChatGPT Plus — месяц', price:2490, img:'product-chatgpt.jpg'}]);
    assert.equal(await p.locator('#cartBody img').count(), 1);
    assert.equal(await p.locator('#cartBody img[onerror]').count(), 0);
    assert((await p.locator('#cartBody').innerText()).includes('Пожалуйста, проверьте корзину'));
    assert.deepEqual(cartErrors, []);
    console.log('PASS cart rejects altered fields, invalid quantities and unknown products'); await ctx.close();

    ctx = await browser.newContext({viewport:{width:1280,height:820}, reducedMotion:'reduce'});
    await ctx.addInitScript(() => {
      sessionStorage.setItem('wn_loader','1');
      localStorage.setItem('wn_cart', JSON.stringify([
        {id:'a1', name:'ChatGPT Plus — месяц', price:2490, qty:80},
        {id:'a1', name:'ChatGPT Plus — месяц', price:2490, qty:80}
      ]));
    });
    p = await ctx.newPage(); await p.goto(`${BASE}/shop.html`, {waitUntil:'load'});
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('wn_cart'))[0].qty), 99);
    await p.locator('#menuCart').evaluate(e=>e.click());
    await p.locator('#cartBody [data-cplus]').evaluate(e=>e.click());
    assert.equal(await p.locator('#cartBody .qty b').textContent(), '99');
    console.log('PASS cart quantity cap 99 even for duplicates and repeated clicks'); await ctx.close();

    // Corrupt and blocked storages must not prevent browsing; files remain functional in memory.
    for (const mode of ['corrupt', 'blocked']) {
      ctx = await browser.newContext({viewport:{width:1280,height:820}, reducedMotion:'reduce'});
      await ctx.addInitScript(mode => {
        if (mode === 'corrupt') {sessionStorage.setItem('wn_loader','1'); localStorage.setItem('wn_cart','[{broken-json');}
        else for (const key of ['localStorage','sessionStorage']) Object.defineProperty(window, key, {get() {throw new Error('storage disabled');}});
      }, mode);
      p = await ctx.newPage(); const storageErrors=[]; p.on('pageerror',e=>storageErrors.push(e.message));
      await p.goto(`${BASE}/shop.html`, {waitUntil:'load'}); await p.waitForSelector('.good-card');
      await p.locator('[data-id="a1"] [data-add="a1"]').evaluate(e=>e.click());
      await p.waitForTimeout(400);
      assert((await p.locator('#cartBody').innerText()).includes('ChatGPT Plus'));
      assert.deepEqual(storageErrors, []);
      console.log('PASS', mode, 'browser storage'); await ctx.close();
    }

    // Main canvas: record the first projected, stationary orbital point each frame.
    // Under reduced motion it can move only in response to the drag (not auto-spin).
    ctx = await context(browser); await instrumentCanvas(ctx); p = await ctx.newPage(); const threeErrors=[]; p.on('pageerror',e=>threeErrors.push(e.message));
    await p.goto(`${BASE}/index.html`, {waitUntil:'load'});
    await p.locator('#coreCanvas').scrollIntoViewIfNeeded(); await p.waitForFunction(() => Array.isArray(window.__testCorePoint));
    const bb = await p.locator('#coreCanvas').boundingBox(); assert(bb && bb.width > 100);
    await p.mouse.move(bb.x+bb.width/2, bb.y+bb.height/2); await p.mouse.down();
    assert(await p.locator('.sv-core').evaluate(e => e.classList.contains('is-grabbing')));
    const before = await p.evaluate(() => window.__testCorePoint.slice());
    await p.mouse.move(bb.x+bb.width/2+110, bb.y+bb.height/2+28, {steps:12}); await p.waitForTimeout(120);
    const after = await p.evaluate(() => window.__testCorePoint.slice());
    assert(distance(before, after) > 5, `core projection did not react to drag: ${before} -> ${after}`);
    await p.mouse.up(); assert.equal(await p.locator('.sv-core').evaluate(e=>e.classList.contains('is-grabbing')), false);
    console.log('PASS interactive 3D core drag changes projected geometry', distance(before,after).toFixed(1), 'px');

    await p.goto(`${BASE}/projects.html`, {waitUntil:'load'});
    await p.locator('[data-watch]').scrollIntoViewIfNeeded();
    await p.waitForFunction(() => window.__watch3d?.ready === true, {timeout:15000});
    assert.equal(await p.locator('#watchCanvas canvas').count(), 1);
    const watchBB = await p.locator('#watchCanvas').boundingBox(); assert(watchBB && watchBB.width > 100);
    const angleBefore = await p.evaluate(() => window.__watch3d.controls.getAzimuthalAngle());
    await p.mouse.move(watchBB.x+watchBB.width/2, watchBB.y+watchBB.height/2); await p.mouse.down();
    await p.mouse.move(watchBB.x+watchBB.width/2+110, watchBB.y+watchBB.height/2, {steps:12}); await p.mouse.up(); await p.waitForTimeout(250);
    const angleAfter = await p.evaluate(() => window.__watch3d.controls.getAzimuthalAngle());
    assert(Math.abs(angleAfter-angleBefore)>0.05, `watch controls angle ${angleBefore} -> ${angleAfter}`);
    assert.deepEqual(threeErrors, []);
    console.log('PASS 3D watch loads locally and OrbitControls responds to drag'); await ctx.close();

    // Exercise the same figure with an actual touch stream on a mobile-sized viewport.
    ctx = await browser.newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true, reducedMotion:'reduce'});
    await ctx.addInitScript(() => sessionStorage.setItem('wn_loader','1')); await instrumentCanvas(ctx);
    p = await ctx.newPage(); await p.goto(`${BASE}/index.html`, {waitUntil:'load'});
    await p.locator('#coreCanvas').scrollIntoViewIfNeeded(); await p.waitForFunction(() => Array.isArray(window.__testCorePoint));
    const touchBB = await p.locator('#coreCanvas').boundingBox();
    const x = Math.round(touchBB.x + touchBB.width / 2), y = Math.round(touchBB.y + touchBB.height / 2);
    const touchBefore = await p.evaluate(() => window.__testCorePoint.slice());
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x,y,id:1}]});
    assert(await p.locator('.sv-core').evaluate(e=>e.classList.contains('is-grabbing')));
    for (let i=1;i<=9;i++) await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:x+i*10,y:y+1,id:1}]});
    await p.waitForTimeout(150); const touchAfter = await p.evaluate(() => window.__testCorePoint.slice());
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    assert(distance(touchBefore,touchAfter)>5, `core did not react to touch: ${touchBefore} -> ${touchAfter}`);
    assert.equal(await p.locator('.sv-core').evaluate(e=>e.classList.contains('is-grabbing')), false);
    console.log('PASS interactive 3D core touch drag'); await ctx.close();

    for (const width of [320, 390]) {
      ctx = await context(browser,{width,height:844}); p = await ctx.newPage(); const mobileErrors=[]; p.on('pageerror',e=>mobileErrors.push(e.message));
      for (const path of pages) {
        await p.goto(`${BASE}/${path}`, {waitUntil:'load'}); await p.waitForTimeout(100);
        const metrics = await p.evaluate(() => ({w:document.documentElement.scrollWidth, v:innerWidth}));
        assert(metrics.w<=metrics.v, `${path} width=${width}: ${JSON.stringify(metrics)}`);
      }
      await p.goto(`${BASE}/privacy.html`);
      const bounds = await p.locator('.privacy-title em').boundingBox();
      assert(bounds.x >= 0 && bounds.x+bounds.width <= width+1, `privacy title overflow at ${width}: ${JSON.stringify(bounds)}`);
      assert.deepEqual(mobileErrors, []); console.log('PASS all pages and legal heading on mobile width',width); await ctx.close();
    }
    console.log('ALL RELEASE CHECKS PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
