import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.V3965_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3965_ARTIFACT_DIR || '/tmp/v3965-feishu';
fs.mkdirSync(artifactDir, { recursive: true });

const record = {
  id: 'neu-main|0141|003',
  school: '东北大学',
  major: '自动化类',
  schoolCode2026: '0141',
  majorCode2026: '003',
  score2026: 595,
  rank2026: 16500,
  score2025: 592,
  rank2025: 17240,
  score2024: 588,
  rank2024: 18110,
  scoreDelta2026: -5,
  rankGap2026: -2265,
  statusKey: 'match',
  statusLabel: '历史位次接近',
  position: '主体讨论',
  bandKey: 'near',
  schoolTierTags: ['985', '211'],
  natureLabel: '公办',
  displayLocation: '辽宁 · 沈阳',
  projectLabel: '普通招生记录',
  schoolEntity: { entityId: 'neu-main', entityType: 'official_school' },
  matchReason: '专业名称命中“自动化”'
};

const scorePayload = {
  ok: true,
  meta: {
    audienceYear: 2027,
    activeDataYear: 2026,
    candidateScore: 600,
    candidateReferenceRank2026: 14235,
    candidateRankLabel: '按 2026 年成绩分布，历史参考位置约为第 14,235 位',
    rangePreset: 'standard',
    dataScope: '辽宁 2026 物理类专业投档最低分',
    classificationMode: 'canonical_rank_primary_2026_position',
    specialProjectMode: 'hide_eligibility_projects'
  },
  keywordQuery: { rawKeywords: ['电气', '自动化'] },
  matchSummary: { exact: 1, related: 0, industry: 0, project: 0 },
  source: { specialProjectHidden: 0, specialProjectShown: 0 },
  counts: { upper: 0, near: 1, steady: 0, total: 1 },
  bands: {
    upper: { key:'upper', title:'稍高目标', count:0, records:[], pagination:{ offset:0, limit:40, returned:0, hasMore:false } },
    near: { key:'near', title:'主要参考', count:1, records:[record], pagination:{ offset:0, limit:40, returned:1, hasMore:false } },
    steady: { key:'steady', title:'低分侧补充', count:0, records:[], pagination:{ offset:0, limit:40, returned:0, hasMore:false } }
  }
};

const viewports = [
  { name: 'pc-1366', viewport: { width: 1366, height: 768 } },
  { name: 'pad-820', viewport: { width: 820, height: 1180 }, hasTouch: true },
  { name: 'android-390', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
];

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
      globalThis.__clipboardMode = 'success';
      globalThis.__clipboardCalls = [];
      globalThis.__openedUrl = '';
      Object.defineProperty(Navigator.prototype, 'clipboard', {
        configurable: true,
        get() {
          return {
            writeText: async text => {
              globalThis.__clipboardCalls.push(String(text));
              if (globalThis.__clipboardMode === 'fail') throw new Error('simulated clipboard rejection');
            }
          };
        }
      });
      globalThis.open = url => {
        globalThis.__openedUrl = String(url || '');
        return { closed: false };
      };
    });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const reportPosts = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.route('**/api/major-bands**', route => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(scorePayload)
    }));
    await page.route('**/api/feishu-create-report', async route => {
      reportPosts.push(await route.request().postDataJSON());
      await new Promise(resolve => setTimeout(resolve, 180));
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          ok: true,
          partial: false,
          sharePublic: true,
          reportType: 'currentBand',
          dataYear: 2026,
          rankYear: 2026,
          audienceYear: 2027,
          yearCaliberVersion: 'ln-physics-report-years-v3964_0',
          title: 'v3965 浏览器报告',
          documentId: `mock-${testCase.name}`,
          url: `https://example.feishu.cn/docx/mock-${testCase.name}`
        })
      });
    });

    try {
      await page.goto(`${baseUrl}/ln-rank/`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction(() => document.body.dataset.runtimeState === 'ready', null, { timeout: 20000 });
      await page.locator('#candidateScore').fill('600');
      await page.locator('#majorKeyword').fill('电气/自动化');
      await page.locator('#queryButton').click();
      await page.locator('.major-card').first().waitFor({ state: 'visible', timeout: 20000 });

      const generate = page.locator('#feishuReportMount [data-generate-feishu]');
      await generate.waitFor({ state: 'visible', timeout: 10000 });
      await generate.evaluate(button => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await page.locator('#feishuReportMount .feishu-box.is-success').waitFor({ state: 'visible', timeout: 15000 });
      assert.equal(reportPosts.length, 1, `${testCase.name}: repeated click generated ${reportPosts.length} reports`);
      assert.equal(reportPosts[0].candidateScore, 600);
      assert.equal(reportPosts[0].dataYear, 2026);
      assert.equal(reportPosts[0].audienceYear, 2027);

      const copy = page.locator('#feishuReportMount [data-copy-feishu]');
      await copy.click();
      await page.waitForFunction(() => /报告链接已复制/.test(document.querySelector('[data-feishu-feedback]')?.textContent || ''));
      assert.equal(await copy.isEnabled(), true);
      assert.equal((await page.evaluate(() => globalThis.__clipboardCalls)).length, 1);

      await page.evaluate(() => { globalThis.__clipboardMode = 'fail'; });
      await copy.click();
      await page.waitForFunction(() => /复制失败/.test(document.querySelector('[data-feishu-feedback]')?.textContent || ''));
      const copyAfterFailure = page.locator('#feishuReportMount [data-copy-feishu]');
      assert.equal(await copyAfterFailure.isEnabled(), true);
      assert.equal(await copyAfterFailure.textContent(), '再次复制');

      await page.locator('#feishuReportMount [data-open-feishu]').click();
      await page.waitForFunction(() => /已尝试在新窗口打开报告/.test(document.querySelector('[data-feishu-feedback]')?.textContent || ''));
      assert.match(await page.evaluate(() => globalThis.__openedUrl), /example\.feishu\.cn\/docx\/mock-/);

      const metrics = await page.evaluate(() => ({
        release: document.body.dataset.release,
        runtime: document.body.dataset.runtimeState,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        feedbackCount: document.querySelectorAll('[data-feishu-feedback]').length
      }));
      assert.equal(metrics.release, 'v3.9.65.0');
      assert.equal(metrics.runtime, 'ready');
      assert.ok(metrics.overflow <= 1, `${testCase.name}: horizontal overflow ${metrics.overflow}`);
      assert.equal(metrics.feedbackCount, 1);
      assert.deepEqual(pageErrors, [], pageErrors.join('\n'));
      assert.deepEqual(consoleErrors, [], consoleErrors.join('\n'));
      results.push({ name: testCase.name, reportPosts: reportPosts.length, ...metrics });
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

console.log(JSON.stringify({ ok: true, contract: 'feishu-operation-owner-v3965_0', cases: results }, null, 2));
