// End-to-end checks use real browser input and read-only game diagnostics.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/forest-preview\//, '/');
    const file = path.resolve(root, '.' + (urlPath.endsWith('/') ? urlPath + 'index.html' : urlPath));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
let browser;
const errors = [], failures = [];
const observe = page => {
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
};
const debug = page => page.evaluate(() => window.forestDebug());
const ready = page => page.waitForFunction(() => window.forestDebug?.().state === 'ready');
async function mouseJump(page, duration) {
  const box = await page.locator('#jump').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(duration); await page.mouse.up();
}
(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const options = { headless: true };
    if (process.env.BROWSER_EXECUTABLE) options.executablePath = process.env.BROWSER_EXECUTABLE;
    browser = await chromium.launch(options);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await context.newPage(); observe(page);
    await page.goto(origin + '/forest-preview/'); await ready(page);
    assert.equal((await debug(page)).sprites.length, 4);
    assert.equal(await page.locator('h1').textContent(), '小黑，跳一跳。');

    // Short, repeated jumps stay on the current island and never farm points.
    await mouseJump(page, 8); await ready(page);
    assert.equal((await debug(page)).score, 0);
    assert.equal((await debug(page)).jumps, 0);
    await page.locator('#restart').click();
    for (let i = 0; i < 6; i++) {
      const before = await debug(page);
      await mouseJump(page, before.perfectHoldMs - 4);
      await ready(page);
      const after = await debug(page);
      assert.equal(after.jumps, i + 1, 'Aimed jumps must reach the next island');
      assert.equal(after.combo, i + 1, 'Center landings must extend the perfect combo');
      assert.equal(after.score - before.score, Math.min(i + 2, 6));
    }
    const best = (await debug(page)).score;
    assert.equal(await page.locator('#best').innerText(), String(best).padStart(2, '0'));
    await page.reload(); await ready(page);
    assert.equal((await debug(page)).score, 0);
    assert.equal(await page.locator('#best').innerText(), String(best).padStart(2, '0'));

    // Escape cancels a charge. Space works on the actual canvas focus target.
    await page.locator('#game').focus();
    await page.keyboard.down('Space'); await page.waitForTimeout(100); await page.keyboard.press('Escape'); await page.keyboard.up('Space');
    assert.equal((await debug(page)).state, 'ready');
    assert.equal((await debug(page)).charge, 0);
    const hold = (await debug(page)).perfectHoldMs;
    await page.keyboard.down('Space'); await page.waitForTimeout(hold - 4); await page.keyboard.up('Space'); await ready(page);
    assert.equal((await debug(page)).score, 2);

    // Help must pause an in-flight jump and close cleanly with Escape.
    await mouseJump(page, (await debug(page)).perfectHoldMs - 4);
    await page.locator('#help').click();
    await assertDialog(page, '#info-dialog', true);
    await page.waitForTimeout(800);
    assert.equal((await debug(page)).state, 'jumping');
    await page.keyboard.press('Escape'); await ready(page);
    await page.locator('#credits').click();
    assert.equal(await page.locator('.source-list a').count(), 4);
    await page.locator('.modal-close').click();

    // Sound preferences, aim assistance and all four real sprite sets.
    await page.locator('#sound').click(); assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'true');
    await page.locator('#assist').uncheck();
    for (const id of ['heixiu', 'wuxian', 'shanxin', 'xiaohei']) {
      await page.locator(`[data-character="${id}"]`).click(); await ready(page);
      assert.equal((await debug(page)).score, 0);
      assert.equal(await page.locator(`[data-character="${id}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal((await debug(page)).sprites.length, 4);
    }
    await page.reload(); await ready(page);
    assert.equal(await page.locator('#assist').isChecked(), false);
    assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'true');
    await page.locator('#sound').click(); await page.locator('#assist').check();

    // Maximum charge misses the first target; the result dialog allows retry.
    await mouseJump(page, 1340);
    await page.waitForFunction(() => document.querySelector('#result-dialog').open);
    assert.equal((await debug(page)).state, 'over');
    await page.locator('#play-again').click(); await ready(page);
    assert.equal((await debug(page)).score, 0);
    // A blur while charging must never launch a surprise jump.
    await page.locator('#game').focus(); await page.keyboard.down('Space');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.keyboard.up('Space'); assert.equal((await debug(page)).state, 'ready');

    // Rapid switching must leave the last selection active after image decoding.
    await page.evaluate(() => {
      document.querySelector('[data-character="heixiu"]').click();
      document.querySelector('[data-character="wuxian"]').click();
      document.querySelector('[data-character="shanxin"]').click();
    });
    await ready(page); assert.equal(await page.locator('[data-character="shanxin"]').getAttribute('aria-pressed'), 'true');

    // Touch input in a mobile viewport uses native CDP touch events.
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const mobile = await mobileContext.newPage(); observe(mobile);
    await mobile.goto(origin + '/forest-preview/'); await ready(mobile);
    const cdp = await mobileContext.newCDPSession(mobile);
    const box = await mobile.locator('#game').boundingBox();
    const touch = { x: Math.round(box.x + box.width * .4), y: Math.round(box.y + box.height * .5), id: 1 };
    const duration = (await debug(mobile)).perfectHoldMs;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
    await mobile.waitForTimeout(duration - 4);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await ready(mobile); assert.equal((await debug(mobile)).score, 2);
    // A second finger must not reset or release the first finger's charge.
    await mobile.locator('#restart').tap(); await ready(mobile);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
    await mobile.waitForTimeout(100);
    const second = { ...touch, id: 2, x: touch.x + 50 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch, second] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [second] });
    assert.equal((await debug(mobile)).state, 'charging');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    assert.equal((await debug(mobile)).state, 'ready');
    await mobile.locator('#restart').tap();
    await mobile.screenshot({ path: path.join(root, 'preview-mobile.png'), fullPage: true });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No horizontal overflow at ${width}px`);
    }
    await page.locator('[data-character="xiaohei"]').click(); await ready(page);
    await page.locator('#restart').click();
    await page.screenshot({ path: path.join(root, 'preview-desktop.png'), fullPage: true });
    assert.deepEqual(errors, []); assert.deepEqual(failures, []);
    console.log('PASS: game loading under a Pages subpath, 6-jump combo, no score farming, persistence, keyboard, cancellation, paused help, credits, settings, 4 characters, game over/retry, rapid switching, touch, multi-touch and 5 responsive widths.');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
async function assertDialog(page, selector, expected) { assert.equal(await page.locator(selector).evaluate(el => el.open), expected); }
