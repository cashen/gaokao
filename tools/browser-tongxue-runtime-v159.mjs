import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.V3965_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3965_ARTIFACT_DIR || '/tmp/v3965-tongxue';
fs.mkdirSync(artifactDir, { recursive: true });

const viewports = [
  { name: 'pc-1366', viewport: { width: 1366, height: 768 } },
  { name: 'pad-820', viewport: { width: 820, height: 1180 }, hasTouch: true },
  { name: 'android-390', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
];

function responseFor(school, entityId = '') {
  const entity = entityId
    ? {
        entityId,
        displayName: school,
        entityType: entityId === 'hit-shenzhen' ? 'admission_campus' : 'official_school',
        typeLabel: entityId === 'hit-shenzhen' ? '独立招生校区' : '学校',
        separateExperience: entityId === 'hit-shenzhen'
      }
    : null;
  if (school.includes('深圳')) {
    return {
      ok: true,
      mode: 'ai_summary',
      school,
      entity,
      summary: '深圳校区的评论常提到课程节奏、城市实习机会和住宿安排。不同专业体验差异较大，报考前仍需核对具体培养地点与专业课程。',
      schoolMeta: { id: 844, name: school, province: '广东省', city: '深圳市', type: '普通本科', reviewCount: 18 },
      fetchedAt: new Date().toISOString(),
      transport: 'mock-browser',
      version: 'test-v159',
      source: { name: '测试来源', url: 'https://srgaoxiao.com/' }
    };
  }
  return {
    ok: true,
    mode: 'no_content',
    school,
    entity,
    schoolMeta: { name: school, province: '辽宁省', city: school.includes('大连') ? '大连市' : '沈阳市', type: '普通本科', reviewCount: 0 },
    fetchedAt: new Date().toISOString(),
    transport: 'mock-browser',
    version: 'test-v159',
    source: { name: '测试来源', url: 'https://srgaoxiao.com/' }
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const testCase of viewports) {
    const context = await browser.newContext({
      viewport: testCase.viewport,
      hasTouch: Boolean(testCase.hasTouch),
      isMobile: Boolean(testCase.isMobile),
      deviceScaleFactor: 1
    });
    await context.addInitScript(() => {
      globalThis.__tongxueLongTasks = [];
      try {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) globalThis.__tongxueLongTasks.push(entry.duration);
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {}
      globalThis.addEventListener('unhandledrejection', event => {
        globalThis.__tongxueUnhandled = String(event.reason?.stack || event.reason || 'unhandled rejection');
      });
    });
    const summaryRequests = [];
    const entityRequests = [];
    await context.route('**/tongxue/data/school-search-index.20260617-v150.json*', async route => {
      const response = await route.fetch();
      await new Promise(resolve => setTimeout(resolve, 250));
      await route.fulfill({ response });
    });
    await context.route('**/api/tongxue-summary**', route => {
      const url = new URL(route.request().url());
      const school = url.searchParams.get('school') || '';
      const entityId = url.searchParams.get('entity') || '';
      summaryRequests.push(school);
      entityRequests.push(entityId);
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(responseFor(school, entityId))
      });
    });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    try {
      await page.goto(`${baseUrl}/tongxue/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#indexStatus[data-status="preparing"]', { timeout: 10000 });
      assert.match(await page.locator('#indexStatusMessage').textContent(), /正在准备学校和专业目录/);
      const earlyInput = page.locator('#school');
      await earlyInput.fill('深圳大学');
      assert.equal(await page.locator('#queryButton').isEnabled(), true, `${testCase.name}: query should be available for early-submit queue`);
      await page.locator('#queryButton').click();
      await page.waitForFunction(() => globalThis.__TONGXUE_RUNTIME_V159__?.getState?.().ready === true, null, { timeout: 20000 });
      await page.waitForFunction(() => document.getElementById('result')?.dataset.viewState === 'success', null, { timeout: 20000 });
      assert.equal(summaryRequests[0], '深圳大学', `${testCase.name}: early input was not resumed after catalog ready`);
      assert.equal(await page.locator('#indexStatus').getAttribute('data-status'), 'ready');
      assert.equal(await page.locator('#retryIndex').isHidden(), true);
      // The early-submit contract intentionally exercises one school request;
      // isolate the following region contract from that expected request.
      summaryRequests.length = 0;
      entityRequests.length = 0;
      const initial = await page.evaluate(() => globalThis.__TONGXUE_RUNTIME_V159__.getState());
      assert.equal(initial.observerCount, 0);
      // The startup retry control adds one intentional listener to the stable
      // v1.5.9 contract; keep the guard bounded without rejecting that control.
      assert.ok(initial.listenerCount >= 8 && initial.listenerCount <= 21, `${testCase.name}: listener count ${initial.listenerCount}`);
      assert.equal(initial.currentEntityId, '');
      await page.evaluate(() => { globalThis.__tongxueLongTasks = []; });

      const input = page.locator('#school');
      const button = page.locator('#queryButton');
      for (const region of ['深圳', '大连', '辽宁']) {
        await input.fill(region);
        assert.equal(await button.isEnabled(), true, `${testCase.name}: query button stayed disabled after typing ${region}`);
        await button.click();
        await page.waitForFunction(expected => document.getElementById('result')?.dataset.viewState === 'region'
          && document.getElementById('resultTitle')?.textContent?.includes(expected), region);
      }
      assert.equal(summaryRequests.length, 0, `${testCase.name}: region switching must not submit school API`);
      assert.match(await page.locator('#resultTitle').textContent(), /辽宁/);
      assert.ok(await page.locator('[data-region-query]').count() > 0, `${testCase.name}: province city list empty`);

      for (const region of ['深圳', '大连', '辽宁', '深圳', '大连']) {
        await input.fill(region);
        await button.click();
      }
      await page.waitForFunction(expected => document.getElementById('result')?.dataset.viewState === 'region'
        && document.getElementById('resultTitle')?.textContent?.includes(expected)
        && document.querySelectorAll('[data-region-school]').length > 0, '大连');
      const afterSwitch = await page.evaluate(() => globalThis.__TONGXUE_RUNTIME_V159__.getState());
      assert.equal(afterSwitch.listenerCount, initial.listenerCount, `${testCase.name}: listeners were registered again`);
      assert.equal(afterSwitch.observerCount, 0);
      assert.equal(afterSwitch.currentEntityId, '');
      assert.equal(summaryRequests.length, 0);
      assert.match(await page.locator('#resultTitle').textContent(), /大连/);

      const firstSchool = page.locator('[data-region-school]').first();
      const selectedName = await firstSchool.getAttribute('data-region-school');
      assert.ok(selectedName, `${testCase.name}: latest region did not expose a school entity`);
      await firstSchool.click();
      await page.waitForFunction(() => ['success', 'empty'].includes(document.getElementById('result')?.dataset.viewState), null, { timeout: 15000 });
      assert.equal(summaryRequests.length, 1, `${testCase.name}: school selection submitted more than once`);
      assert.equal(summaryRequests[0], selectedName);
      assert.match(new URL(page.url()).searchParams.get('school') || '', /.+/);

      await page.goBack({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.getElementById('result')?.dataset.viewState === 'region'
        && document.getElementById('resultTitle')?.textContent?.includes('大连'));
      await page.goForward({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => ['success', 'empty'].includes(document.getElementById('result')?.dataset.viewState), null, { timeout: 15000 });

      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => globalThis.__TONGXUE_RUNTIME_V159__?.getState?.().ready === true
        && ['success', 'empty'].includes(document.getElementById('result')?.dataset.viewState), null, { timeout: 20000 });
      assert.equal(await page.locator('.hero').isHidden(), true, `${testCase.name}: direct refresh did not enter result-only mode`);
      assert.equal(await page.locator('[data-change-school]').isVisible(), true);

      await page.goto(`${baseUrl}/tongxue/?school=${encodeURIComponent('哈尔滨工业大学（深圳）')}&entity=hit-shenzhen`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction(() => globalThis.__TONGXUE_RUNTIME_V159__?.getState?.().ready === true
        && document.getElementById('result')?.dataset.viewState === 'success', null, { timeout: 20000 });
      const directState = await page.evaluate(() => globalThis.__TONGXUE_RUNTIME_V159__.getState());
      assert.equal(directState.currentEntityId, 'hit-shenzhen');
      assert.equal(entityRequests.at(-1), 'hit-shenzhen', `${testCase.name}: direct API request lost entity ID`);
      assert.equal(await page.locator('[data-school-entity="hit-shenzhen"]').count(), 1);
      assert.equal(await page.locator('[data-school-entity-type="admission_campus"]').count(), 1);
      assert.match(await page.locator('#result').textContent(), /独立招生实体/);
      await page.locator('[data-change-school]').click();
      await page.waitForFunction(() => document.getElementById('result')?.dataset.viewState === 'idle');
      assert.equal(new URL(page.url()).pathname, '/tongxue/');
      assert.equal(new URL(page.url()).search, '');
      assert.equal((await page.evaluate(() => globalThis.__TONGXUE_RUNTIME_V159__.getState())).currentEntityId, '');

      await input.focus();
      if (testCase.isMobile) {
        const mobile = await page.evaluate(() => {
          const inputBox = document.getElementById('school')?.getBoundingClientRect();
          const buttonBox = document.getElementById('queryButton')?.getBoundingClientRect();
          const navElement = document.querySelector('[data-ui-mobile-nav]');
          const navVisible = navElement && getComputedStyle(navElement).display !== 'none' && navElement.getBoundingClientRect().height > 0;
          const nav = navVisible ? navElement.getBoundingClientRect() : null;
          return {
            inputBottom: inputBox?.bottom || 0,
            buttonBottom: buttonBox?.bottom || 0,
            viewportHeight: window.innerHeight,
            navTop: nav?.top || window.innerHeight
          };
        });
        assert.ok(mobile.inputBottom <= mobile.viewportHeight);
        assert.ok(mobile.buttonBottom <= mobile.viewportHeight);
        assert.ok(mobile.buttonBottom <= mobile.navTop + 1, `${testCase.name}: mobile action overlaps search button`);
      }

      const diagnostics = await page.evaluate(() => ({
        state: globalThis.__TONGXUE_RUNTIME_V159__.getState(),
        longTasks: globalThis.__tongxueLongTasks || [],
        unhandled: globalThis.__tongxueUnhandled || '',
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      }));
      const maxLongTask = diagnostics.longTasks.length ? Math.max(...diagnostics.longTasks) : 0;
      assert.ok(maxLongTask < 1000, `${testCase.name}: long task ${maxLongTask}ms`);
      assert.equal(diagnostics.state.observerCount, 0);
      assert.equal(diagnostics.unhandled, '');
      assert.ok(diagnostics.overflow <= 1, `${testCase.name}: horizontal overflow ${diagnostics.overflow}`);
      assert.deepEqual(pageErrors, [], pageErrors.join('\n'));
      assert.deepEqual(consoleErrors, [], consoleErrors.join('\n'));
      results.push({
        name: testCase.name,
        listenerCount: diagnostics.state.listenerCount,
        submitCount: diagnostics.state.submitCount,
        summaryRequests: summaryRequests.length,
        entityRequests: entityRequests.filter(Boolean),
        maxLongTask,
        overflow: diagnostics.overflow
      });
    } catch (error) {
      const diagnostic = await page.evaluate(() => ({
        url: location.href,
        viewState: document.getElementById('result')?.dataset.viewState || '',
        resultText: document.getElementById('result')?.textContent || '',
        runtime: globalThis.__TONGXUE_RUNTIME_V159__?.getState?.() || null
      })).catch(() => null);
      await page.screenshot({ path: path.join(artifactDir, `${testCase.name}-failure.png`), fullPage: true }).catch(() => {});
      fs.writeFileSync(path.join(artifactDir, `${testCase.name}-error.txt`), `${String(error?.stack || error)}\n\n${JSON.stringify({ summaryRequests, entityRequests, pageErrors, consoleErrors, diagnostic }, null, 2)}`);
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ ok: true, contract: 'tongxue-runtime-v159-browser', cases: results }, null, 2));
