import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.V3970_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3970_ARTIFACT_DIR || '/tmp/v3970-family-action-browser';
fs.mkdirSync(artifactDir, { recursive: true });

const storageKey = 'lnRank.selectionPool.lnPhysics.2026.v3951';
const item = {
  id: 'family-action-test|001',
  school: '东北大学',
  major: '自动化类',
  score2026: 600,
  rank2026: 14235,
  band: 'near',
  bandKey: 'near',
  natureLabel: '公办',
  displayLocation: '辽宁 · 沈阳',
  flags: [],
  reviewPoints: [],
  specialProject: { hasSpecialProject: false }
};

const cases = [
  { name: 'phone-360', width: 360, height: 800, mobile: true, touch: true },
  { name: 'phone-390', width: 390, height: 844, mobile: true, touch: true },
  { name: 'phone-430', width: 430, height: 932, mobile: true, touch: true },
  { name: 'pad-768', width: 768, height: 1024, touch: true },
  { name: 'pc-1280', width: 1280, height: 800 }
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const testCase of cases) {
    const context = await browser.newContext({
      viewport: { width: testCase.width, height: testCase.height },
      isMobile: Boolean(testCase.mobile),
      hasTouch: Boolean(testCase.touch),
      deviceScaleFactor: 1
    });
    await context.addInitScript(({ storageKey, item }) => {
      localStorage.setItem('lnRank.selectionPool.candidateScore', '600');
      localStorage.setItem(storageKey, JSON.stringify([item]));
    }, { storageKey, item });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    try {
      await page.goto(`${baseUrl}/ln-rank/`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.locator('[data-ui-family-plan-header-mount] a').waitFor({ state: 'visible', timeout: 15000 });
      await page.locator('[data-ui-family-plan-results-footer] a').waitFor({ state: 'visible', timeout: 15000 });
      assert.equal(await page.locator('body').getAttribute('data-release'), 'v3.9.72.5');
      assert.match(await page.locator('[data-ui-family-plan-header-mount]').textContent(), /家庭方案\s*1/);
      assert.match(await page.locator('[data-ui-family-plan-results-footer]').textContent(), /查看家庭方案（1）/);
      assert.equal(await page.locator('[data-ui-mobile-nav], [data-ui-mobile-selection], [data-ui-mobile-action-mount]').count(), 0);
      assert.equal(await page.locator('text=已选 1 个 · 去整理').count(), 0);

      const geometry = await page.evaluate(() => {
        const familySelector = '[data-ui-family-plan-header-mount] a,[data-ui-family-plan-results-footer] a';
        const positionedAncestor = element => {
          let current = element;
          while (current) {
            const position = getComputedStyle(current).position;
            if (position === 'fixed' || position === 'sticky') {
              return {
                tag: current.tagName,
                className: String(current.className || ''),
                position
              };
            }
            current = current.parentElement;
          }
          return null;
        };
        const footer = document.querySelector('[data-ui-family-plan-results-footer]');
        const results = document.querySelector('#results');
        const footerRect = footer?.getBoundingClientRect();
        const resultsRect = results?.getBoundingClientRect();
        const familyElements = [...document.querySelectorAll(familySelector)].map(node => ({
          tag: node.tagName,
          text: (node.textContent || '').trim().slice(0, 80),
          position: getComputedStyle(node).position,
          positionedAncestor: positionedAncestor(node),
          rect: node.getBoundingClientRect().toJSON()
        }));
        const bottomFamilyOverlays = [...document.elementsFromPoint(Math.floor(innerWidth / 2), innerHeight - 8)]
          .map(node => node.closest?.(familySelector))
          .filter(Boolean)
          .map(node => ({
            text: (node.textContent || '').trim().slice(0, 80),
            positionedAncestor: positionedAncestor(node)
          }))
          .filter(node => node.positionedAncestor);
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          footerTop: footerRect?.top ?? null,
          resultsBottom: resultsRect?.bottom ?? null,
          familyElements,
          bottomFamilyOverlays,
          bodyPaddingBottom: getComputedStyle(document.body).paddingBottom
        };
      });
      assert.ok(geometry.overflow <= 1, `${testCase.name}: horizontal overflow ${geometry.overflow}`);
      assert.ok(geometry.footerTop >= geometry.resultsBottom - 1, `${testCase.name}: footer is not after results`);
      for (const node of geometry.familyElements) {
        assert.equal(node.positionedAncestor, null, `${testCase.name}: family action escapes document flow ${node.text}`);
      }
      assert.deepEqual(geometry.bottomFamilyOverlays, [], `${testCase.name}: fixed or sticky family action covers viewport bottom`);
      if (testCase.mobile) assert.ok(!/^7[0-9]px$/.test(geometry.bodyPaddingBottom), `${testCase.name}: legacy bottom spacer ${geometry.bodyPaddingBottom}`);

      await page.evaluate(({ storageKey, item }) => {
        localStorage.setItem(storageKey, JSON.stringify([item, { ...item, id: 'family-action-test|002', major: '电气工程及其自动化' }]));
        window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
      }, { storageKey, item });
      await page.waitForFunction(() => /家庭方案\s*2/.test(document.querySelector('[data-ui-family-plan-header-mount]')?.textContent || ''));
      assert.match(await page.locator('[data-ui-family-plan-results-footer]').textContent(), /查看家庭方案（2）/);

      await page.goto(`${baseUrl}/ln-rank/selection-pool.html#family-review`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction(() => document.body.dataset.runtimeState === 'ready', null, { timeout: 20000 });
      const selectionText = await page.locator('body').textContent();
      assert.match(selectionText, /家庭方案报告/);
      assert.match(selectionText, /知道链接的人可以查看/);
      assert.ok(!selectionText.includes('已选 2 个 · 去整理'));
      assert.deepEqual(pageErrors, [], `${testCase.name}: ${pageErrors.join('\n')}`);
      results.push({ name: testCase.name, familyPlanCount: 2, fixedAction: false });
    } catch (error) {
      await page.screenshot({ path: path.join(artifactDir, `${testCase.name}-failure.png`), fullPage: true }).catch(() => {});
      fs.writeFileSync(path.join(artifactDir, `${testCase.name}-error.txt`), String(error?.stack || error));
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ ok: true, contract: 'family-action-browser-v3970_0', release: 'v3.9.72.5', cases: results }, null, 2));
