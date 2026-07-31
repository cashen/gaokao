import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ALL211_BASE || 'http://127.0.0.1:8789';
const artifactDir = process.env.ALL211_ARTIFACT_DIR || '/tmp/all211-static-browser';
const index = JSON.parse(fs.readFileSync('ln-rank/data/211-static/211-static-index.v3972_0.json', 'utf8'));
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { name: 'pc-1440', viewport: { width: 1440, height: 1000 } },
  { name: 'pad-820', viewport: { width: 820, height: 1180 } },
  { name: 'android-360', viewport: { width: 360, height: 800 } }
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const testCase of cases) {
    const context = await browser.newContext({ viewport: testCase.viewport });
    const page = await context.newPage();
    const consoleErrors = [];
    const dynamicRequests = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => consoleErrors.push(error.message));
    page.on('request', request => { if (/\/api\/(?:academic-background|211-mainline)/.test(request.url())) dynamicRequests.push(request.url()); });

    await page.goto(`${baseUrl}/ln-rank/211-mainline.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.dataset.all211Runtime === 'ready');
    assert.equal(await page.getAttribute('body', 'data-release'), 'v3.9.72.2', `${testCase.name}: release`);
    assert.equal(await page.locator('#scoreBands [data-band]').count(), 8, `${testCase.name}: score bands`);
    assert.equal((await page.locator('#scoreBands [data-band]').first().innerText()).includes(index.scoreBands[0].label), true, `${testCase.name}: first band label`);
    assert.equal((await page.locator('#scoreBands [data-band]').last().innerText()).includes(index.scoreBands.at(-1).label), true, `${testCase.name}: last band label`);

    await page.locator('#scoreInput').fill('579');
    await page.locator('#scoreSubmit').click();
    await page.locator('.a211-card').first().waitFor({ state: 'visible' });
    const scoreContext = await page.locator('#scoreContext').innerText();
    assert.match(scoreContext, /579分参考位次/);
    assert.match(scoreContext, /573—595分/);
    assert.equal(await page.locator('#positionGroups').isVisible(), true, `${testCase.name}: position groups`);
    await page.locator('[data-group="upper"]').click();
    await page.locator('.a211-card').first().waitFor({ state: 'visible' });
    await page.locator('[data-group="lower"]').click();
    await page.locator('.a211-card').first().waitFor({ state: 'visible' });

    const geometry = await page.locator('body').evaluate(node => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }));
    assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `${testCase.name}: horizontal overflow ${JSON.stringify(geometry)}`);
    const bandColumns = await page.locator('#scoreBands').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length);
    const expectedColumns = testCase.viewport.width <= 767 ? 2 : testCase.viewport.width <= 1100 ? 4 : 8;
    assert.equal(bandColumns, expectedColumns, `${testCase.name}: band columns`);
    assert.deepEqual(dynamicRequests, [], `${testCase.name}: dynamic API requests`);
    assert.deepEqual(consoleErrors, [], `${testCase.name}: console errors ${consoleErrors.join(' | ')}`);

    await page.screenshot({ path: path.join(artifactDir, `${testCase.name}.png`), fullPage: true });
    results.push({ name: testCase.name, viewport: testCase.viewport, bandColumns, geometry });
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const dynamicRequests = [];
  page.on('request', request => { if (/\/api\/(?:academic-background|211-mainline)/.test(request.url())) dynamicRequests.push(request.url()); });
  await page.goto(`${baseUrl}/ln-rank/211-mainline.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.all211Runtime === 'ready');

  await page.locator('[data-view="school"]').click();
  await page.locator('#schoolInput').fill('东北大学');
  await page.locator('#schoolSubmit').click();
  await page.locator('.a211-card').first().waitFor({ state: 'visible' });
  assert.match(await page.locator('#resultSummary').innerText(), /找到/);
  assert.ok((await page.locator('.a211-card').count()) >= 1, 'school journey empty');

  await page.locator('[data-view="major"]').click();
  await page.locator('#majorInput').fill('计算机');
  await page.locator('#majorSubmit').click();
  await page.locator('.a211-card').first().waitFor({ state: 'visible' });
  assert.ok((await page.locator('.a211-card').count()) >= 1, 'major journey empty');

  await page.locator('[data-view="directory"]').click();
  await page.locator('#directorySubmit').click();
  await page.locator('.a211-card').first().waitFor({ state: 'visible' });
  assert.match(await page.locator('#resultSummary').innerText(), /2,494/);
  assert.equal(await page.locator('#pager').isVisible(), true, 'directory pager');
  await page.locator('#nextPage').click();
  assert.match(await page.locator('#pageInfo').innerText(), /2 \/ /);
  assert.deepEqual(dynamicRequests, [], 'journeys used dynamic API');
  await context.close();
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(artifactDir, 'result.json'), JSON.stringify({ ok: true, cases: results, meta: index.meta, scoreBands: index.scoreBands }, null, 2));
console.log(JSON.stringify({ ok: true, cases: results, meta: index.meta, scoreBands: index.scoreBands }, null, 2));
