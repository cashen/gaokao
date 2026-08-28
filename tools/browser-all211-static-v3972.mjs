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

async function verifyMobileModuleNavigation(page, name) {
  await page.locator('[data-ui-mobile-module-nav]').waitFor({ state: 'visible' });
  const metrics = await page.locator('[data-ui-mobile-module-nav]').evaluate(node => {
    const roots = node.querySelector('.ui-mobile-module-nav__roots');
    const head = node.querySelector('.ui-mobile-module-nav__head');
    const links = [...(roots?.querySelectorAll('a') || [])].map(link => {
      const rect = link.getBoundingClientRect();
      return { text: link.textContent?.trim(), left: rect.left, right: rect.right, width: rect.width };
    });
    const navRect = node.getBoundingClientRect();
    const rootRect = roots?.getBoundingClientRect();
    const navStyle = getComputedStyle(node);
    const rootStyle = roots ? getComputedStyle(roots) : null;
    return {
      navWidth: navRect.width,
      navHeight: navRect.height,
      headHeight: head?.getBoundingClientRect().height || 0,
      rootWidth: rootRect?.width || 0,
      rootScrollWidth: roots?.scrollWidth || 0,
      gridTemplateAreas: navStyle.gridTemplateAreas,
      rootOverflowX: rootStyle?.overflowX || '',
      links
    };
  });
  assert.ok(metrics.navHeight >= 86, `${name}: mobile module nav did not get a separate root row ${JSON.stringify(metrics)}`);
  assert.ok(metrics.headHeight > 0 && metrics.rootWidth > 0, `${name}: mobile module nav row collapsed ${JSON.stringify(metrics)}`);
  assert.equal(metrics.rootOverflowX, 'auto', `${name}: root module strip is not horizontally scrollable`);
  assert.ok(metrics.rootScrollWidth > metrics.rootWidth + 1, `${name}: root module strip is not scrollable ${JSON.stringify(metrics)}`);
  assert.equal(metrics.links.length, 6, `${name}: root module count`);
  assert.ok(metrics.links.every(link => link.width >= 50), `${name}: root link shrank below a readable width ${JSON.stringify(metrics.links)}`);
  assert.ok(metrics.links.every((link, index, links) => index === 0 || link.left >= links[index - 1].right - 1), `${name}: root links overlap ${JSON.stringify(metrics.links)}`);
  assert.equal(metrics.gridTemplateAreas.includes('head') && metrics.gridTemplateAreas.includes('roots'), true, `${name}: two-row grid areas missing`);
  const pageGeometry = await page.locator('body').evaluate(node => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }));
  assert.ok(pageGeometry.scrollWidth <= pageGeometry.clientWidth + 1, `${name}: page horizontal overflow ${JSON.stringify(pageGeometry)}`);
  return { metrics, pageGeometry };
}

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
    const navigation = testCase.viewport.width <= 767 ? await verifyMobileModuleNavigation(page, `${testCase.name}:211`) : null;
    assert.equal(await page.getAttribute('body', 'data-release'), 'v3.9.90.2', `${testCase.name}: release`);
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
    results.push({ name: testCase.name, viewport: testCase.viewport, bandColumns, geometry, navigation });
    await context.close();
  }

  const localContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const localPage = await localContext.newPage();
  await localPage.goto(`${baseUrl}/ln-rank/local-mainline.html`, { waitUntil: 'domcontentloaded' });
  await localPage.waitForFunction(() => document.body.dataset.localStrengthRuntime === 'ready');
  const localNavigation = await verifyMobileModuleNavigation(localPage, 'android-360:local-strength');
  await localPage.screenshot({ path: path.join(artifactDir, 'android-360-local-strength.png'), fullPage: true });
  results.push({ name: 'android-360-local-strength', viewport: { width: 360, height: 800 }, navigation: localNavigation });
  await localContext.close();

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
console.log(JSON.stringify({ ok: true, release: 'v3.9.90.2', package: 'all-211-static-v3972_0', cases: results, meta: index.meta, scoreBands: index.scoreBands }, null, 2));
