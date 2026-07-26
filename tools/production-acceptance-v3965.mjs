import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PRODUCTION_BASE_URL || 'https://gaokao.powers.org.cn';
const artifactDir = process.env.PRODUCTION_ARTIFACT_DIR || '/tmp/v3965-production';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { name: 'pc-1366', width: 1366, height: 768 },
  { name: 'pad-820', width: 820, height: 1180, touch: true },
  { name: 'android-390', width: 390, height: 844, touch: true, mobile: true }
];

function failOnBadConsole(message) {
  const text = message.text();
  if (message.type() !== 'error') return false;
  return !/favicon|ERR_BLOCKED_BY_CLIENT/i.test(text);
}

async function waitRuntime(page, name) {
  await page.waitForFunction(() => document.body?.dataset?.runtimeState === 'ready', null, { timeout: 60000 });
  const state = await page.evaluate(() => ({
    release: document.body.dataset.release || '',
    runtime: document.body.dataset.runtimeState || '',
    workspace: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.version || '',
    schoolMode: globalThis.__GAOKAO_SCHOOL_ALL_MODE__?.version || ''
  }));
  assert.equal(state.release, 'v3.9.65.0', `${name}: release mismatch`);
  assert.equal(state.runtime, 'ready', `${name}: runtime not ready`);
  assert.equal(state.workspace, 'selection-workspace-orchestration-v3965_0', `${name}: workspace owner mismatch`);
  assert.equal(state.schoolMode, 'school-all-mode-v3964_0', `${name}: school owner mismatch`);
  return state;
}

async function validateLnRank(browser, testCase) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    hasTouch: Boolean(testCase.touch),
    isMobile: Boolean(testCase.mobile),
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = [];
  const consoleErrors = [];
  const majorRequests = [];
  const schoolRequests = [];
  page.on('pageerror', error => errors.push(String(error?.stack || error)));
  page.on('console', message => { if (failOnBadConsole(message)) consoleErrors.push(message.text()); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/major-bands') majorRequests.push(url);
    if (url.pathname === '/api/school-majors') schoolRequests.push(url);
  });

  try {
    await page.goto(`${baseUrl}/ln-rank/?acceptance=v3965`, { waitUntil: 'networkidle', timeout: 90000 });
    const runtime = await waitRuntime(page, testCase.name);
    await page.locator('#candidateScore').fill('600');
    await page.locator('#majorKeyword').fill('电气/自动化');
    await page.locator('#queryButton').click();
    await page.locator('.major-card').first().waitFor({ state: 'visible', timeout: 90000 });
    await page.waitForFunction(() => document.querySelectorAll('.major-card').length >= 16, null, { timeout: 30000 });

    const initialCount = await page.locator('.major-card').count();
    const resultText = await page.locator('#resultsPanel').textContent();
    assert.equal(initialCount, 16, `${testCase.name}: expected first 16 cards, got ${initialCount}`);
    assert.match(resultText || '', /符合当前条件\s*128\s*条/, `${testCase.name}: production total is not 128`);
    assert.equal(majorRequests.length, 1, `${testCase.name}: score query submitted ${majorRequests.length} times`);
    assert.equal(majorRequests[0].searchParams.get('candidateScore'), '600');
    assert.equal(majorRequests[0].searchParams.get('majorKeyword'), '电气/自动化');

    const loadMore = page.getByRole('button', { name: /加载更多/ }).last();
    if (await loadMore.count()) {
      await loadMore.click();
      await page.waitForFunction(count => document.querySelectorAll('.major-card').length > count, initialCount, { timeout: 60000 });
    }
    const loadedCount = await page.locator('.major-card').count();
    assert.ok(loadedCount > initialCount, `${testCase.name}: loading more did not increase cards`);

    const addButton = page.getByRole('button', { name: /加入已选/ }).first();
    await addButton.waitFor({ state: 'visible', timeout: 20000 });
    await addButton.click();
    await page.waitForFunction(() => /移出已选|已加入/.test(document.querySelector('.major-card button')?.textContent || '')
      || /已选\s*[1-9]/.test(document.body.textContent || ''), null, { timeout: 20000 });
    const selectedBeforeMode = await page.evaluate(() => {
      const text = document.querySelector('[data-ui-mobile-selection] span')?.textContent || '';
      const stored = Object.keys(localStorage).filter(key => /selection|selected/i.test(key)).map(key => localStorage.getItem(key));
      return { text, stored };
    });
    assert.ok(/已选\s*[1-9]/.test(selectedBeforeMode.text) || selectedBeforeMode.stored.some(value => /东北|电气|自动化/.test(value || '')), `${testCase.name}: selected item not persisted`);

    const schoolEntry = page.locator('.major-card .school-all-entry-button').first();
    await schoolEntry.waitFor({ state: 'visible', timeout: 20000 });
    await schoolEntry.click();
    await page.locator('.school-major-row').first().waitFor({ state: 'visible', timeout: 90000 });
    assert.ok(schoolRequests.length >= 1, `${testCase.name}: school handoff did not query`);
    const handoff = schoolRequests.at(-1);
    assert.ok(handoff.searchParams.get('school'), `${testCase.name}: school handoff missing school`);
    assert.ok(handoff.searchParams.get('schoolEntityId'), `${testCase.name}: school handoff missing entity`);
    assert.equal(handoff.searchParams.get('candidateScore'), '600');

    const countWithScore = await page.locator('.school-major-row').count();
    assert.ok(countWithScore > 0, `${testCase.name}: school mode empty with score`);
    await page.locator('#candidateScore').fill('');
    await page.waitForFunction(() => /更新学校专业/.test(document.getElementById('queryButton')?.textContent || ''), null, { timeout: 20000 });
    await page.locator('#queryButton').click();
    await page.waitForFunction(() => globalThis.__GAOKAO_SCHOOL_ALL_MODE__?.getState?.().schoolAll.loading === false, null, { timeout: 90000 });
    const countWithoutScore = await page.locator('.school-major-row').count();
    assert.equal(countWithoutScore, countWithScore, `${testCase.name}: score incorrectly reduced school records`);

    await page.locator('[data-school-view-mode="score-bands"]').click();
    await page.locator('#resultsPanel').waitFor({ state: 'visible', timeout: 20000 });
    assert.ok(await page.locator('.major-card').count() >= initialCount, `${testCase.name}: score results lost after mode switch`);
    const selectedAfterMode = await page.locator('[data-ui-mobile-selection] span').textContent();
    assert.match(selectedAfterMode || '', /已选\s*[1-9]/, `${testCase.name}: selected count lost after mode switches`);

    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      queryHeight: document.getElementById('queryButton')?.getBoundingClientRect().height || 0,
      unhandled: globalThis.__productionUnhandled || ''
    }));
    assert.ok(metrics.overflow <= 1, `${testCase.name}: horizontal overflow ${metrics.overflow}`);
    if (testCase.touch) assert.ok(metrics.queryHeight >= 44, `${testCase.name}: query touch target ${metrics.queryHeight}`);
    assert.deepEqual(errors, [], `${testCase.name}: page errors\n${errors.join('\n')}`);
    assert.deepEqual(consoleErrors, [], `${testCase.name}: console errors\n${consoleErrors.join('\n')}`);

    if (testCase.name === 'pc-1366') {
      await page.goto(`${baseUrl}/ln-rank/selection-pool.html?from=acceptance&score=600`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForFunction(() => document.body.dataset.runtimeState === 'ready', null, { timeout: 60000 });
      const beforeRefresh = await page.locator('[data-selection-item], .selection-card, .pool-item').count();
      assert.ok(beforeRefresh >= 1 || /东北|电气|自动化/.test(await page.locator('body').textContent()), 'selection page did not restore selected item');
      await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForFunction(() => document.body.dataset.runtimeState === 'ready', null, { timeout: 60000 });
      assert.match(await page.locator('body').textContent(), /东北|电气|自动化/, 'selection item did not survive refresh');
    }

    return { name: testCase.name, runtime, initialCount, loadedCount, countWithScore, countWithoutScore, majorRequests: majorRequests.length, schoolRequests: schoolRequests.length, overflow: metrics.overflow };
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      url: location.href,
      bodyText: document.body?.innerText?.slice(0, 12000) || '',
      runtime: document.body?.dataset?.runtimeState || '',
      release: document.body?.dataset?.release || ''
    })).catch(() => null);
    fs.writeFileSync(path.join(artifactDir, `${testCase.name}-ln-rank-error.txt`), `${String(error?.stack || error)}\n\n${JSON.stringify({ errors, consoleErrors, majorRequests: majorRequests.map(String), schoolRequests: schoolRequests.map(String), diagnostic }, null, 2)}`);
    await page.screenshot({ path: path.join(artifactDir, `${testCase.name}-ln-rank-failure.png`), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

async function validateTongxue(browser, testCase) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    hasTouch: Boolean(testCase.touch),
    isMobile: Boolean(testCase.mobile),
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = [];
  const consoleErrors = [];
  const summaryRequests = [];
  page.on('pageerror', error => errors.push(String(error?.stack || error)));
  page.on('console', message => { if (failOnBadConsole(message)) consoleErrors.push(message.text()); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/tongxue-summary') summaryRequests.push(url);
  });

  try {
    await page.goto(`${baseUrl}/tongxue/?acceptance=v159`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForFunction(() => globalThis.__TONGXUE_RUNTIME_V159__?.getState?.().ready === true, null, { timeout: 60000 });
    const initial = await page.evaluate(() => globalThis.__TONGXUE_RUNTIME_V159__.getState());
    assert.equal(initial.observerCount, 0);
    const input = page.locator('#school');
    const button = page.locator('#queryButton');

    for (const region of ['深圳', '大连', '辽宁']) {
      await input.fill(region);
      await button.click();
      await page.waitForFunction(expected => document.getElementById('result')?.dataset.viewState === 'region'
        && document.getElementById('resultTitle')?.textContent?.includes(expected), region, { timeout: 30000 });
    }
    assert.equal(summaryRequests.length, 0, `${testCase.name}: region selection submitted summary API`);
    assert.ok(await page.locator('[data-region-query]').count() > 0, `${testCase.name}: Liaoning city list empty`);

    for (const region of ['深圳', '大连', '辽宁', '深圳', '大连']) {
      await input.fill(region);
      await button.click();
    }
    await page.waitForFunction(() => document.getElementById('result')?.dataset.viewState === 'region'
      && /大连/.test(document.getElementById('resultTitle')?.textContent || '')
      && document.querySelectorAll('[data-region-school]').length > 0, null, { timeout: 30000 });
    const afterSwitch = await page.evaluate(() => globalThis.__TONGXUE_RUNTIME_V159__.getState());
    assert.equal(afterSwitch.listenerCount, initial.listenerCount, `${testCase.name}: listeners duplicated`);
    assert.equal(afterSwitch.observerCount, 0);

    const firstSchool = page.locator('[data-region-school]').first();
    const school = await firstSchool.getAttribute('data-region-school');
    await firstSchool.click();
    await page.waitForFunction(() => ['success', 'empty'].includes(document.getElementById('result')?.dataset.viewState), null, { timeout: 90000 });
    assert.ok(summaryRequests.length >= 1, `${testCase.name}: school selection did not call API`);
    assert.equal(summaryRequests.at(-1).searchParams.get('school'), school);

    await page.goBack({ waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForFunction(() => document.getElementById('result')?.dataset.viewState === 'region', null, { timeout: 30000 });
    await page.goForward({ waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForFunction(() => ['success', 'empty'].includes(document.getElementById('result')?.dataset.viewState), null, { timeout: 90000 });
    await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForFunction(() => globalThis.__TONGXUE_RUNTIME_V159__?.getState?.().ready === true
      && ['success', 'empty'].includes(document.getElementById('result')?.dataset.viewState), null, { timeout: 90000 });

    await page.goto(`${baseUrl}/tongxue/?school=${encodeURIComponent('哈尔滨工业大学（深圳）')}&entity=hit-shenzhen`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForFunction(() => globalThis.__TONGXUE_RUNTIME_V159__?.getState?.().ready === true
      && ['success', 'empty', 'error'].includes(document.getElementById('result')?.dataset.viewState), null, { timeout: 90000 });
    const direct = await page.evaluate(() => ({
      state: globalThis.__TONGXUE_RUNTIME_V159__.getState(),
      view: document.getElementById('result')?.dataset.viewState || '',
      entity: document.querySelector('[data-school-entity]')?.getAttribute('data-school-entity') || '',
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      buttonHeight: document.getElementById('queryButton')?.getBoundingClientRect().height || 0
    }));
    assert.equal(direct.state.currentEntityId, 'hit-shenzhen', `${testCase.name}: direct entity lost`);
    assert.ok(summaryRequests.some(url => url.searchParams.get('entity') === 'hit-shenzhen'), `${testCase.name}: direct API request lost entity`);
    assert.ok(direct.overflow <= 1, `${testCase.name}: Tongxue horizontal overflow ${direct.overflow}`);
    if (testCase.touch) assert.ok(direct.buttonHeight >= 44, `${testCase.name}: Tongxue touch target ${direct.buttonHeight}`);
    assert.deepEqual(errors, [], `${testCase.name}: Tongxue page errors\n${errors.join('\n')}`);
    assert.deepEqual(consoleErrors, [], `${testCase.name}: Tongxue console errors\n${consoleErrors.join('\n')}`);

    return { name: testCase.name, listenerCount: direct.state.listenerCount, observerCount: direct.state.observerCount, summaryRequests: summaryRequests.length, directView: direct.view, directEntity: direct.state.currentEntityId, overflow: direct.overflow };
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      url: location.href,
      view: document.getElementById('result')?.dataset.viewState || '',
      bodyText: document.body?.innerText?.slice(0, 12000) || '',
      state: globalThis.__TONGXUE_RUNTIME_V159__?.getState?.() || null
    })).catch(() => null);
    fs.writeFileSync(path.join(artifactDir, `${testCase.name}-tongxue-error.txt`), `${String(error?.stack || error)}\n\n${JSON.stringify({ errors, consoleErrors, summaryRequests: summaryRequests.map(String), diagnostic }, null, 2)}`);
    await page.screenshot({ path: path.join(artifactDir, `${testCase.name}-tongxue-failure.png`), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
const result = { release: 'v3.9.65.0', lnRank: [], tongxue: [] };
try {
  for (const testCase of cases) result.lnRank.push(await validateLnRank(browser, testCase));
  for (const testCase of cases) result.tongxue.push(await validateTongxue(browser, testCase));
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(artifactDir, 'production-acceptance.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ok: true, ...result }, null, 2));
