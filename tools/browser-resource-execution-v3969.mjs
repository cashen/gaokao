import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { UI_COMPONENT_REGISTRY } from '../shared/ui/component-registry.v3967_0.js';

const baseUrl = process.env.V3969_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3969_ARTIFACT_DIR || '/tmp/v3969-resource-execution-browser';
const historyMinReadableWidth = UI_COMPONENT_REGISTRY.historyEvidence.minReadableWidth;
fs.mkdirSync(artifactDir, { recursive: true });

function yearEvidence(year, score, rankStart, rankEnd) {
  return {
    year,
    score,
    suppliedRank: rankEnd,
    rank: rankEnd,
    rankStart,
    rankEnd,
    rankForGap: rankEnd,
    sameCount: rankEnd - rankStart + 1,
    evidenceState: 'matched',
    validationStatus: 'matched',
    rankSource: 'official-score-rank-table',
    sourceName: `${year}年辽宁省普通高校招生考试成绩统计表（物理学科类）`,
    recordStatus: year === 2026 ? 'primary-record' : 'strict-match',
    comparable: true
  };
}

const historyEvidence = {
  version: 'ln-physics-history-evidence-v3967_0',
  region: 'ln',
  subject: 'physics',
  primaryYear: 2026,
  years: {
    2026: yearEvidence(2026, 600, 13929, 14235),
    2025: yearEvidence(2025, 600, 13272, 13601),
    2024: yearEvidence(2024, 600, 14353, 14612)
  },
  comparison: {
    policy: 'rank-first-score-secondary',
    populationPolicy: 'undergraduate-control-line-cumulative',
    undergraduatePopulation: { 2024: 116198, 2025: 118109, 2026: 119069 },
    comparableYears: [2026, 2025, 2024],
    canCompareThreeYears: true,
    scoreOnlyCannotCreateTrend: true,
    conflictCannotCreateTrend: true
  }
};

const record = {
  id: 'neu-main|0141|003',
  school: '东北大学',
  major: '自动化类',
  schoolCode2026: '0141',
  majorCode2026: '003',
  score: 600,
  rank: 14235,
  score2026: 600,
  rank2026: 14235,
  rankStart2026: 13929,
  rankEnd2026: 14235,
  sameCount2026: 307,
  historyEvidence,
  scoreDelta2026: 0,
  rankGap2026: 0,
  statusKey: 'match',
  statusLabel: '历史位次接近',
  position: '主体讨论',
  band: 'near',
  bandKey: 'near',
  schoolTierTags: ['985', '211'],
  natureLabel: '公办',
  displayLocation: '辽宁 · 沈阳',
  projectLabel: '普通招生记录',
  schoolEntity: { entityId: 'neu-main', entityType: 'official_school' },
  matchReason: '专业名称命中“自动化”',
  canonicalPosition: { bandKey: 'near', classificationBasis: 'rank-primary-2026-position', positionDistance: 0 }
};

const scorePayload = {
  ok: true,
  meta: {
    audienceYear: 2027,
    activeDataYear: 2026,
    candidateScore: 600,
    candidateReferenceRank2026: 14235,
    candidateReferenceRankStart2026: 13929,
    candidateReferenceRankEnd2026: 14235,
    candidateSameCount2026: 307,
    candidateRankLabel: '按2026年成绩分布，同分位置约为第13,929—14,235位',
    rangePreset: 'standard',
    dataScope: '辽宁2026物理类专业投档最低分',
    classificationMode: 'canonical_rank_primary_2026_position',
    specialProjectMode: 'hide_eligibility_projects'
  },
  keywordQuery: { rawKeywords: ['电气', '自动化'] },
  matchSummary: { exact: 1, related: 0, industry: 0, project: 0 },
  source: { specialProjectHidden: 0, specialProjectShown: 0 },
  counts: { upper: 0, near: 1, steady: 0, total: 1 },
  bands: {
    upper: { key: 'upper', title: '稍高目标', rankRangeText: '约第11,388—13,928位', rangeText: '约第11,388—13,928位', count: 0, records: [], pagination: { offset: 0, limit: 40, returned: 0, hasMore: false } },
    near: { key: 'near', title: '主要参考', rankRangeText: '约第13,929—17,794位', rangeText: '约第13,929—17,794位', count: 1, records: [record], pagination: { offset: 0, limit: 40, returned: 1, hasMore: false } },
    steady: { key: 'steady', title: '低分侧补充', rankRangeText: '约第17,795—28,470位', rangeText: '约第17,795—28,470位', count: 0, records: [], pagination: { offset: 0, limit: 40, returned: 0, hasMore: false } }
  }
};

function schoolPayload() {
  return {
    ok: true,
    meta: {
      mode: 'school-all',
      school: '东北大学',
      schoolEntity: { entityId: 'neu-main', displayName: '东北大学' },
      filteredTotal: 1,
      candidateScore: 600,
      dataBoundary: '只展示该校在辽宁2026物理类投档表中的招生专业与项目，不代表2027录取结果。',
      keywordMode: 'any',
      pagination: { hasMore: false, nextOffset: null }
    },
    summary: { minScore: 600, maxScore: 600, uniqueMajorCount: 1, regularCount: 1, specialCount: 0, nearestRecord: { major: '自动化类', rank2026: 14235 } },
    keywordQuery: { rawKeywords: ['自动化'] },
    records: [record]
  };
}

const cases = [
  { name: 'pc-1920', width: 1920, height: 1080 },
  { name: 'pc-1440', width: 1440, height: 960 },
  { name: 'pc-1366', width: 1366, height: 900 },
  { name: 'pc-1280', width: 1280, height: 800 },
  { name: 'pad-1024', width: 1024, height: 768, touch: true },
  { name: 'pad-820', width: 820, height: 1180, touch: true },
  { name: 'android-430', width: 430, height: 900, touch: true, mobile: true },
  { name: 'android-390', width: 390, height: 844, touch: true, mobile: true },
  { name: 'android-360', width: 360, height: 800, touch: true, mobile: true }
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const testCase of cases) {
    const context = await browser.newContext({
      viewport: { width: testCase.width, height: testCase.height },
      hasTouch: Boolean(testCase.touch),
      isMobile: Boolean(testCase.mobile),
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    const pageErrors = [];
    const reportPosts = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    page.on('dialog', dialog => dialog.accept());
    await page.route('**/api/major-bands**', route => route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(scorePayload) }));
    await page.route('**/api/school-majors**', route => route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(schoolPayload()) }));
    await page.route('**/api/feishu-create-report', async route => {
      reportPosts.push(await route.request().postDataJSON());
      return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ ok: true, partial: false, sharePublic: true, reportType: 'currentBand', dataYear: 2026, rankYear: 2026, audienceYear: 2027, yearCaliberVersion: 'ln-physics-report-years-v3966_0', title: '三年证据回归报告', documentId: 'mock-v3966', url: 'https://example.feishu.cn/docx/mock-v3966' }) });
    });
    try {
      await page.goto(`${baseUrl}/ln-rank/`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.locator('#candidateScore').fill('600');
      await page.locator('#majorKeyword').fill('电气/自动化');
      await page.locator('#queryButton').click();
      await page.locator('.major-card').first().waitFor({ state: 'visible', timeout: 20000 });
      assert.equal(await page.locator('body').getAttribute('data-runtime-state'), 'ready');
      const runtime = await page.evaluate(() => ({
        release: document.body.dataset.release,
        workspace: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.version || '',
        school: globalThis.__GAOKAO_SCHOOL_ALL_MODE__?.version || '',
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      }));
      assert.equal(runtime.release, 'v3.9.69.0');
      assert.equal(runtime.workspace, 'selection-workspace-orchestration-v3969_2');
      assert.equal(runtime.school, 'school-all-mode-v3969_2');
      assert.ok(runtime.overflow <= 1, `${testCase.name}: horizontal overflow ${runtime.overflow}`);

      const cardDetails = page.locator('.major-card-details').first();
      await cardDetails.locator('summary').click();
      const history = page.locator('.ln-history-evidence--compact').first();
      await history.waitFor({ state: 'visible' });
      const historyText = await history.textContent();
      assert.match(historyText, /2025/);
      assert.match(historyText, /2024/);
      assert.match(historyText, /约第13,272—13,601位/);
      assert.match(historyText, /约第14,353—14,612位/);
      assert.match(historyText, /跨年优先比较位次/);
      assert.ok(!historyText.includes('位次待核验'));
      const historyGeometry = await history.evaluate(root => {
        const rootRect = root.getBoundingClientRect();
        const years = [...root.querySelectorAll('.ln-history-evidence__year')].map(node => {
          const rect = node.getBoundingClientRect();
          const value = node.querySelector('.ln-history-evidence__value');
          return { width: rect.width, height: rect.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, grid: value ? getComputedStyle(value).gridTemplateColumns : '' };
        });
        return { rootWidth: rootRect.width, rootHeight: rootRect.height, years, legacy: Boolean(root.matches('.history-score,.history-evidence') || root.querySelector('.history-score,.history-evidence')) };
      });
      assert.equal(historyGeometry.legacy, false, `${testCase.name}: legacy history class leaked`);
      assert.ok(historyGeometry.rootWidth >= historyMinReadableWidth + 20, `${testCase.name}: history root too narrow ${historyGeometry.rootWidth}`);
      for (const row of historyGeometry.years) {
        assert.ok(row.width >= historyMinReadableWidth, `${testCase.name}: history year unreadable width ${row.width}`);
        assert.ok(row.scrollWidth <= row.clientWidth + 1, `${testCase.name}: history year overflow`);
        assert.ok(row.height / row.width < 4, `${testCase.name}: history year vertical distortion ${row.width}x${row.height}`);
      }

      const reportButton = page.locator('#feishuReportMount [data-generate-feishu]');
      await reportButton.waitFor({ state: 'visible' });
      await reportButton.click();
      await page.locator('#feishuReportMount .feishu-box.is-success').waitFor({ state: 'visible', timeout: 10000 });
      assert.equal(reportPosts.length, 1);
      assert.equal(reportPosts[0].yearCaliberVersion, 'ln-physics-report-years-v3966_0');
      assert.equal(reportPosts[0].selectedRecords[0].historyEvidence.version, 'ln-physics-history-evidence-v3967_0');
      assert.equal(reportPosts[0].selectedRecords[0].historyEvidence.years['2024'].comparable, true);

      await page.locator('.major-card .school-all-entry-button').first().click();
      await page.locator('.school-major-row').first().waitFor({ state: 'visible', timeout: 20000 });
      const currentText = await page.locator('.school-major-score').first().textContent();
      assert.match(currentText, /600分/);
      assert.match(currentText, /约第13,929—14,235位/);
      await page.locator('[data-school-detail-toggle]').first().click();
      const detail = page.locator('.ln-history-evidence--detail').first();
      await detail.waitFor({ state: 'visible' });
      const detailText = await detail.textContent();
      for (const year of ['2026', '2025', '2024']) assert.match(detailText, new RegExp(year));
      assert.match(detailText, /优先比较位次/);
      assert.ok(!detailText.includes('位次待核验'));
      const detailGeometry = await detail.evaluate(root => [...root.querySelectorAll('.ln-history-evidence__year')].map(node => { const rect=node.getBoundingClientRect(); return { width:rect.width, height:rect.height, overflow:node.scrollWidth-node.clientWidth }; }));
      for (const row of detailGeometry) {
        assert.ok(row.width >= historyMinReadableWidth, `${testCase.name}: detail year unreadable width ${row.width}`);
        assert.ok(row.overflow <= 1, `${testCase.name}: detail year overflow ${row.overflow}`);
        assert.ok(row.height / row.width < 4.5, `${testCase.name}: detail vertical distortion`);
      }

      await page.locator('[data-school-selection-action]').first().click();
      await page.goto(`${baseUrl}/ln-rank/selection-pool.html?from=search&score=600`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction(() => document.body.dataset.runtimeState === 'ready');
      await page.locator('.workspace-item').first().waitFor({ state: 'visible', timeout: 15000 });
      const selectionHistory = page.locator('.workspace-item-history').first();
      await selectionHistory.locator('summary').click();
      const selectionText = await selectionHistory.textContent();
      assert.match(selectionText, /2025：600分｜约第13,272—13,601位/);
      assert.match(selectionText, /2024：600分｜约第14,353—14,612位/);
      const finalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(finalOverflow <= 1, `${testCase.name}: selection overflow ${finalOverflow}`);
      assert.deepEqual(pageErrors, [], `${testCase.name}: ${pageErrors.join('\n')}`);

      results.push({ name: testCase.name, release: runtime.release, workspace: runtime.workspace, school: runtime.school, reportPosts: reportPosts.length });
    } catch (error) {
      await page.screenshot({ path: path.join(artifactDir, `${testCase.name}-failure.png`), fullPage: true }).catch(() => {});
      fs.writeFileSync(path.join(artifactDir, `${testCase.name}-error.txt`), String(error?.stack || error));
      throw error;
    } finally {
      await context.close();
    }
  }

  for (const testCase of [
    { name: 'auxiliary-pc-1440', width: 1440, height: 960 },
    { name: 'auxiliary-android-390', width: 390, height: 844, touch: true, mobile: true }
  ]) {
    const context = await browser.newContext({ viewport: { width: testCase.width, height: testCase.height }, hasTouch: Boolean(testCase.touch), isMobile: Boolean(testCase.mobile) });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    try {
      await page.goto(`${baseUrl}/just_for_liaoning.html`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.locator('.subject-card').first().waitFor({ state: 'visible', timeout: 20000 });
      const state = await page.evaluate(() => ({
        release: document.body.dataset.release,
        resource: globalThis.__GAOKAO_LIAONING_KEY_SUBJECTS_RESOURCE__?.version || '',
        algorithm: globalThis.__GAOKAO_LIAONING_KEY_SUBJECTS_RESOURCE__?.selectionAlgorithmVersion || '',
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      }));
      assert.equal(state.release, 'v3.9.69.0');
      assert.equal(state.resource, 'liaoning-key-subjects-execution-v3967_0');
      assert.equal(state.algorithm, 'historical-rank-selection-v3967_0');
      assert.ok(state.overflow <= 1, `${testCase.name}: horizontal overflow ${state.overflow}`);
      assert.deepEqual(pageErrors, [], `${testCase.name}: ${pageErrors.join('\n')}`);
      results.push({ name: testCase.name, release: state.release, auxiliaryResource: state.resource });
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

console.log(JSON.stringify({ ok: true, contract: 'resource-execution-browser-v3967_0', cases: results }, null, 2));
