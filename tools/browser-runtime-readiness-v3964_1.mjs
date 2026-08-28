import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.RUNTIME_CACHE_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.RUNTIME_CACHE_ARTIFACT_DIR || '/tmp/runtime-cache-v3964_1';
fs.mkdirSync(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

async function captureFailure(page, name, error) {
  await page.screenshot({ path: path.join(artifactDir, `${name}-failure.png`), fullPage: true }).catch(() => {});
  fs.writeFileSync(path.join(artifactDir, `${name}-error.txt`), String(error?.stack || error));
}

try {
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const pageErrors = [];
    let legacyContractRequests = 0;
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    await page.route('**/ln-rank/js/domain/flow-step-contract.js*', route => {
      legacyContractRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        body: "export const SCORE_FLOW_STEPS = Object.freeze([]);"
      });
    });

    try {
      await page.goto(`${baseUrl}/ln-rank/?cache-regression=legacy-flow-contract`, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      await page.waitForFunction(() => document.body.dataset.runtimeState === 'ready', null, { timeout: 20000 });
      assert.equal(legacyContractRequests, 0, 'active graph requested the production-breaking legacy flow contract');
      assert.ok(await page.locator('#region option').count() >= 10, 'region options did not mount');
      assert.equal(await page.locator('#candidateScore').isEnabled(), true);
      assert.equal(await page.locator('#queryButton').isEnabled(), true);
      await page.locator('[data-school-view-mode="school-all"]').click();
      await page.waitForFunction(() => document.body.dataset.resultMode === 'school-all');
      await page.locator('[data-school-view-mode="score-bands"]').click();
      await page.waitForFunction(() => document.body.dataset.resultMode === 'score-bands');
      assert.equal(await page.locator('#runtimeStatusPanel').isHidden(), true);
      assert.deepEqual(pageErrors, [], pageErrors.join('\n'));
      results.push({
        case: 'legacy-cache-isolated',
        runtimeState: 'ready',
        legacyContractRequests,
        regionOptions: await page.locator('#region option').count()
      });
    } catch (error) {
      await captureFailure(page, 'legacy-cache-isolated', error);
      throw error;
    } finally {
      await context.close();
    }
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const pageErrors = [];
    let failedRuntimeRequests = 0;
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    await page.route('**/ln-rank/js/app-runtime.v3964_1.js*', route => {
      failedRuntimeRequests += 1;
      return route.fulfill({
        status: 503,
        contentType: 'text/javascript; charset=utf-8',
        body: "throw new Error('simulated runtime dependency failure');"
      });
    });

    try {
      await page.goto(`${baseUrl}/ln-rank/?cache-regression=runtime-failure`, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      await page.waitForFunction(() => document.body.dataset.runtimeState === 'error', null, { timeout: 15000 });
      assert.equal(failedRuntimeRequests, 1);
      assert.equal(await page.locator('#runtimeStatusPanel').isVisible(), true);
      assert.equal(await page.locator('#runtimeStatusTitle').textContent(), '筛选功能没有完整加载');
      assert.match(await page.locator('#runtimeStatusMessage').textContent(), /页面功能没有完整接管/);
      assert.equal(await page.locator('#runtimeReloadButton').isVisible(), true);
      assert.equal(await page.locator('#candidateScore').isDisabled(), true);
      assert.equal(await page.locator('#schoolKeyword').isDisabled(), true);
      assert.equal(await page.locator('#queryButton').isDisabled(), true);
      assert.equal(await page.locator('[data-school-view-mode="school-all"]').isDisabled(), true);
      assert.deepEqual(pageErrors, [], pageErrors.join('\n'));
      results.push({
        case: 'runtime-failure-honest',
        runtimeState: 'error',
        failedRuntimeRequests,
        controlsDisabled: await page.locator('[data-runtime-control]:disabled').count(),
        retryVisible: true
      });
    } catch (error) {
      await captureFailure(page, 'runtime-failure-honest', error);
      throw error;
    } finally {
      await context.close();
    }
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const pageErrors = [];
    let failedSelectionRequests = 0;
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    await page.route('**/ln-rank/js/selection-pool-runtime.v3964_1.js*', route => {
      failedSelectionRequests += 1;
      return route.fulfill({
        status: 503,
        contentType: 'text/javascript; charset=utf-8',
        body: "throw new Error('simulated selection runtime dependency failure');"
      });
    });
    try {
      await page.goto(`${baseUrl}/ln-rank/selection-pool.html?cache-regression=selection-runtime-failure`, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      await page.waitForFunction(() => document.body.dataset.runtimeState === 'error', null, { timeout: 15000 });
      assert.equal(failedSelectionRequests, 1);
      assert.equal(await page.locator('#selectionRuntimeStatus').isVisible(), true);
      assert.equal(await page.locator('#selectionRuntimeTitle').textContent(), '已选专业功能没有完整加载');
      assert.equal(await page.locator('#selectionRuntimeReload').isVisible(), true);
      assert.equal(await page.locator('#pathCandidateScore').isDisabled(), true);
      assert.equal(await page.locator('#runAnalysis').isDisabled(), true);
      assert.equal(await page.locator('#sendAnalyzedPool').isDisabled(), true);
      assert.equal(await page.locator('#copySelectionText').isDisabled(), true);
      assert.deepEqual(pageErrors, [], pageErrors.join('\n'));
      results.push({
        case: 'selection-runtime-failure-honest',
        runtimeState: 'error',
        failedSelectionRequests,
        controlsDisabled: await page.locator('[data-selection-runtime-control]:disabled').count()
      });
    } catch (error) {
      await captureFailure(page, 'selection-runtime-failure-honest', error);
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({
  ok: true,
  contract: 'runtime-cache-browser-regression-v3964_1',
  cases: results
}, null, 2));
