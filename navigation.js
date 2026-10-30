/* Навигационные проверки: запустить статический сайт на localhost:8080,
   затем выполнить node navigation.js (нужен Playwright и Chromium). */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = process.env.SITE_URL || 'http://127.0.0.1:8080';
const short = { timeout: 15000 };

async function atTarget(page, id) {
  // Poll inside one browser evaluation: CSP deliberately disallows dynamic eval.
  await page.evaluate(({ id, timeout }) => new Promise((resolve, reject) => {
    const start = performance.now();
    function check() {
      const el = document.getElementById(id), r = el?.getBoundingClientRect();
      if (r && scrollY > 50 && r.top >= 60 && r.top <= 140 && r.bottom > 85 && Number(getComputedStyle(el).opacity) > 0.2) return resolve();
      if (performance.now() - start > timeout) return reject(new Error(`Target ${id} not reached (scroll=${scrollY}, top=${r?.top})`));
      requestAnimationFrame(check);
    }
    check();
  }), {id, timeout:short.timeout});
  const result = await page.evaluate(id => {
    const el = document.getElementById(id), r = el.getBoundingClientRect();
    return { y:Math.round(scrollY), top:Math.round(r.top), opacity:Number(getComputedStyle(el).opacity), text:el.textContent.trim().slice(0,100) };
  }, id);
  assert(result.opacity > 0.2, `${id} is not visible: ${JSON.stringify(result)}`);
  return result;
}
async function ready(page) {
  await page.waitForSelector('script[src="main.js"]', {state:'attached'});
  await page.waitForFunction(() => window.__wnBoot === true, null, short);
}
async function load(page, path) { await page.goto(`${BASE}/${path}`, {waitUntil:'load'}); await ready(page); }
async function follow(page, selector, expectedPath, target) {
  await Promise.all([
    page.waitForURL(url => url.pathname.endsWith(expectedPath), short),
    page.locator(selector).first().click(short),
  ]);
  await ready(page);
  return atTarget(page, target);
}

(async () => {
  const browser = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
  try {
    const ctx = await browser.newContext({viewport:{width:1365,height:850},reducedMotion:'reduce'});
    await ctx.addInitScript(() => {sessionStorage.setItem('wn_loader','1'); localStorage.removeItem('wn_cart');});
    const p = await ctx.newPage(); const errors = []; p.on('pageerror', e=>errors.push(e.message));
    await load(p, 'index.html');
    await p.locator('a[href="#about"]').click(short); await atTarget(p,'about');
    assert.equal(new URL(p.url()).hash,'#about');
    assert((await p.locator('#about').textContent()).toLowerCase().includes('студии'));
    await p.locator('#menuBtn').click(); await p.locator('.menu-row[href="index.html#team"]').click();
    await atTarget(p,'team'); assert.equal(new URL(p.url()).hash,'#team');
    assert.equal(await p.locator('#menu').getAttribute('aria-hidden'),'true');
    await p.locator('#menuBtn').click(); await p.locator('.menu-row[href="index.html#contact"]').click();
    await atTarget(p,'contact'); assert.equal(new URL(p.url()).hash,'#contact');
    await p.goBack(); await atTarget(p,'team'); assert.equal(new URL(p.url()).hash,'#team');
    await p.goForward(); await atTarget(p,'contact'); assert.equal(new URL(p.url()).hash,'#contact');
    await p.locator('.nav-logo').click();
    await p.evaluate(() => new Promise((resolve,reject) => { const start=performance.now(); function check(){ if(scrollY<10) return resolve(); if(performance.now()-start>15000) return reject(new Error('Home not reached')); requestAnimationFrame(check); } check(); }));
    assert.equal(new URL(p.url()).hash,'#home');
    console.log('PASS same-page links, menu, browser history and home');

    const projects = [
      ['project-status','сТАТУс'], ['project-phoenix','Феникс'],
      ['project-bot','@webnicss_bot'], ['project-automation','автоматизация заказов']
    ];
    for (const [id,name] of projects) {
      await load(p,'index.html');
      const point = await follow(p,`.pj-mini[href="projects.html#${id}"]`,'projects.html',id);
      assert((await p.locator(`#${id} .pj-title`).textContent()).toLowerCase().includes(name.toLowerCase()), JSON.stringify(point));
      assert.equal(new URL(p.url()).hash,`#${id}`);
      assert.equal(await p.locator(`#${id}`).evaluate(el=>el.matches(':target')),true);
      console.log('PASS project card →',id,point.top,'px');
    }
    await load(p,'index.html');
    await follow(p,'a.btn-chip[href="projects.html#projects-list"]','projects.html','projects-list');
    console.log('PASS all projects button → list');

    for (const [category,count] of [['ai',8],['tg',5]]) {
      await load(p,'index.html');
      await follow(p,`.good-mini[href="shop.html?category=${category}#catalog"]`,'shop.html','catalog');
      assert.equal(new URL(p.url()).searchParams.get('category'),category);
      assert.equal(await p.locator('#shopList .good-card').count(),count);
      assert.equal(await p.locator(`[data-filter="${category}"]`).getAttribute('aria-pressed'),'true');
      const names = await p.locator('.good-name').allTextContents();
      assert(names.every(name => category==='tg' ? /Telegram/.test(name) : !/Telegram/.test(name)), names.join(', '));
      console.log('PASS home category →',category,count,'items');
    }
    await p.locator('[data-filter="all"]').click();
    assert.equal(await p.locator('#shopList .good-card').count(),13);
    assert.equal(new URL(p.url()).searchParams.has('category'),false);
    await p.locator('[data-filter="ai"]').click();
    assert.equal(new URL(p.url()).searchParams.get('category'),'ai');
    assert.equal(await p.locator('#shopList .good-card').count(),8);
    console.log('PASS filter tabs keep address and content in sync');

    const services = ['sites','miniapp','bots','ai','design','model3d','video','tg','ads','integrations'];
    for (const id of services) {
      await load(p,'index.html');
      const point = await follow(p,`.sv-row[href="service.html#${id}"]`,'service.html',id);
      assert.equal(new URL(p.url()).hash,`#${id}`);
      assert.equal(await p.locator(`#svPills [data-sv="${id}"]`).evaluate(el=>el.classList.contains('active')),true);
      assert(point.text.length>10);
      console.log('PASS service →',id,point.top,'px');
    }
    await load(p,'service.html#ai'); await atTarget(p,'ai');
    await p.locator('#svPills [data-sv="bots"]').click(); await atTarget(p,'bots');
    assert.equal(new URL(p.url()).hash,'#bots');
    await p.goBack(); await atTarget(p,'ai');
    assert.equal(await p.locator('#svPills [data-sv="ai"]').evaluate(el=>el.classList.contains('active')),true);
    await p.goForward(); await atTarget(p,'bots');
    console.log('PASS service selection and history');

    for (const id of ['a1','a2','a3','a4','a7','a8','a9','a10','t1','t2','t5','t3','t4']) {
      await load(p,'shop.html');
      await follow(p,`.good-card[data-id="${id}"] .good-media`,'product.html',id);
      assert.equal(new URL(p.url()).hash,`#${id}`);
      assert(await p.locator(`#${id} .prod-name`).textContent());
      console.log('PASS product card →',id);
    }
    await load(p,'product.html#a1'); await atTarget(p,'a1');
    await p.locator('.prod-rel[data-prod="a2"]').click(); await atTarget(p,'a2');
    assert((await p.locator('.prod-name').textContent()).includes('Claude'));
    await p.goBack(); await atTarget(p,'a1'); assert((await p.locator('.prod-name').textContent()).includes('ChatGPT'));
    console.log('PASS related product and history');

    await load(p,'shop.html'); await p.locator('#openCart').click();
    await p.locator('#cartOverlay.open').waitFor({state:'attached', ...short});
    const emptyLink=p.locator('#cartBody a[data-cart-close]');
    assert.equal(await emptyLink.getAttribute('href'),'shop.html#catalog');
    await emptyLink.click(); await atTarget(p,'catalog');
    assert.equal(await p.locator('#cartOverlay').getAttribute('aria-hidden'),'true');
    console.log('PASS empty-cart link closes overlay and opens catalog');
    assert.deepEqual(errors,[]); await ctx.close();

    // A fresh visitor opening a deep link must end at its content after the full loader.
    const fresh=await browser.newContext({viewport:{width:1365,height:850},reducedMotion:'reduce'});
    const first=await fresh.newPage(); const firstErrors=[]; first.on('pageerror',e=>firstErrors.push(e.message));
    await load(first,'projects.html#project-automation');
    await first.locator('body:not(.is-loading)').waitFor({state:'attached', ...short});
    await atTarget(first,'project-automation'); assert.deepEqual(firstErrors,[]);
    console.log('PASS direct project link on a first visit'); await fresh.close();

    // Mobile layout, touch browser, and links from a different page.
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    await mobile.addInitScript(()=>sessionStorage.setItem('wn_loader','1'));
    const m=await mobile.newPage(); const mobileErrors=[]; m.on('pageerror',e=>mobileErrors.push(e.message));
    await load(m,'index.html'); await m.locator('a[href="#about"]').click(); await atTarget(m,'about');
    await load(m,'index.html'); await follow(m,'.pj-mini[href="projects.html#project-automation"]','projects.html','project-automation');
    await load(m,'index.html'); await follow(m,'.good-mini[href="shop.html?category=tg#catalog"]','shop.html','catalog');
    assert.equal(await m.locator('#shopList .good-card').count(),5);
    await load(m,'index.html'); await follow(m,'.sv-row[href="service.html#ai"]','service.html','ai');
    await m.goto(`${BASE}/privacy.html`, {waitUntil:'load'});
    await Promise.all([m.waitForURL(url=>url.pathname.endsWith('index.html'),short),m.locator('.legal-nav-links a[href="index.html#contact"]').click()]);
    await atTarget(m,'contact'); assert.deepEqual(mobileErrors,[]);
    console.log('PASS mobile links and cross-page contact'); await mobile.close();

    // Navigation works when animation libraries cannot be loaded.
    const fallback=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
    await fallback.addInitScript(()=>sessionStorage.setItem('wn_loader','1'));
    await fallback.route(/\/(gsap\.min|ScrollTrigger\.min|lenis\.min)\.js$/,route=>route.abort());
    const f=await fallback.newPage(); const fallbackErrors=[]; f.on('pageerror',e=>fallbackErrors.push(e.message));
    await load(f,'index.html'); await f.locator('a[href="#about"]').click(); await atTarget(f,'about');
    await load(f,'index.html'); await follow(f,'.pj-mini[href="projects.html#project-automation"]','projects.html','project-automation');
    await load(f,'service.html#ai'); await atTarget(f,'ai');
    await f.locator('#svPills [data-sv="bots"]').click(); await atTarget(f,'bots');
    await load(f,'product.html#a1'); await atTarget(f,'a1');
    await f.locator('.prod-rel[data-prod="a2"]').click(); await atTarget(f,'a2');
    assert.equal(await f.locator('#a2 .prod-info').evaluate(el=>getComputedStyle(el).opacity),'1');
    assert.deepEqual(fallbackErrors,[]);
    console.log('PASS navigation without GSAP/Lenis'); await fallback.close();

    const smooth=await browser.newContext({viewport:{width:1365,height:850},reducedMotion:'no-preference'});
    await smooth.addInitScript(()=>sessionStorage.setItem('wn_loader','1'));
    const s=await smooth.newPage(); const smoothErrors=[]; s.on('pageerror',e=>smoothErrors.push(e.message));
    await load(s,'index.html'); await s.locator('a[href="#about"]').click(); await atTarget(s,'about');
    await s.waitForTimeout(1800); await atTarget(s,'about');
    await s.locator('#menuBtn').click(); await s.locator('.menu-row[href="index.html#team"]').click(); await atTarget(s,'team');
    await s.locator('#menuBtn').click(); await s.locator('.menu-row[href="index.html#contact"]').click(); await atTarget(s,'contact');
    await s.goBack(); await atTarget(s,'team');
    await load(s,'index.html'); await follow(s,'.pj-mini[href="projects.html#project-automation"]','projects.html','project-automation');
    await load(s,'service.html#ai'); await atTarget(s,'ai'); assert.deepEqual(smoothErrors,[]);
    console.log('PASS smooth motion, history and delayed loader'); await smooth.close();
    console.log('ALL NAVIGATION CHECKS PASSED');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
