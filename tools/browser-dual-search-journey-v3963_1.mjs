import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.DUAL_SEARCH_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.DUAL_SEARCH_ARTIFACT_DIR || '/tmp/dual-search-v3963_1';
fs.mkdirSync(artifactDir, { recursive: true });

const scoreRecord = {
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
    upper: {
      key: 'upper',
      title: '稍高目标',
      rankRangeText: '约第 11,388—14,234 位',
      rangeText: '约第 11,388—14,234 位',
      count: 0,
      records: [],
      pagination: { offset: 0, limit: 40, returned: 0, hasMore: false }
    },
    near: {
      key: 'near',
      title: '主要参考',
      rankRangeText: '约第 14,235—17,794 位',
      rangeText: '约第 14,235—17,794 位',
      count: 1,
      records: [scoreRecord],
      pagination: { offset: 0, limit: 40, returned: 1, hasMore: false }
    },
    steady: {
      key: 'steady',
      title: '低分侧补充',
      rankRangeText: '约第 17,795—28,470 位',
      rangeText: '约第 17,795—28,470 位',
      count: 0,
      records: [],
      pagination: { offset: 0, limit: 40, returned: 0, hasMore: false }
    }
  }
};

const schoolRecords = [
  {
    ...scoreRecord,
    scoreDelta2026: -5,
    rankGap2026: -2265,
    canonicalPosition: { classificationBasis: 'rank-primary-2026-position', positionDistance: 0.16 }
  },
  {
    id: 'neu-main|0141|006',
    school: '东北大学',
    major: '生物医学工程（中外合作办学）',
    schoolCode2026: '0141',
    majorCode2026: '006',
    score2026: 575,
    rank2026: 23800,
    score2025: 572,
    score2024: 569,
    scoreDelta2026: -25,
    rankGap2026: -9565,
    statusKey: 'guard',
    statusLabel: '历史位次靠后',
    position: '低分侧补充',
    bandKey: 'steady',
    schoolTierTags: ['985', '211'],
    natureLabel: '公办',
    displayLocation: '辽宁 · 沈阳',
    projectLabel: '中外合作办学',
    isSinoForeign: true,
    isHighFee: true,
    specialProject: { hasSpecialProject: true, reviewPoints: ['学费与培养方式'] },
    schoolEntity: { entityId: 'neu-main', entityType: 'official_school' },
    matchReason: '专业方向关联“电气/自动化”',
    canonicalPosition: { classificationBasis: 'rank-primary-2026-position', positionDistance: 0.67 }
  }
];

function schoolPayload(score) {
  return {
    ok: true,
    meta: {
      mode: 'school-all',
      school: '东北大学',
      schoolEntity: { entityId: 'neu-main', displayName: '东北大学' },
      filteredTotal: 2,
      candidateScore: score || null,
      dataBoundary: '只展示该校在辽宁2026物理类投档表中的招生专业与项目，不代表该校全国全部本科专业，也不判断2027录取结果。',
      keywordMode: 'any',
      pagination: { hasMore: false, nextOffset: null }
    },
    summary: {
      minScore: 575,
      maxScore: 615,
      uniqueMajorCount: 2,
      regularCount: 1,
      specialCount: 1,
      nearestRecord: score ? { major: '自动化类', rank2026: 16500 } : null
    },
    keywordQuery: { rawKeywords: ['电气', '自动化'] },
    records: schoolRecords
  };
}

const cases = [
  { name: 'pc-1366', width: 1366, height: 900 },
  { name: 'pad-820', width: 820, height: 1180, touch: true },
  { name: 'android-390', width: 390, height: 844, touch: true, mobile: true }
];

const yearCaliberVersion = 'ln-physics-report-years-v3963_1';
function feishuSuccess(reportType) {
  return {
    ok: true,
    partial: false,
    sharePublic: true,
    reportType,
    dataYear: 2026,
    rankYear: 2026,
    audienceYear: 2027,
    yearCaliberVersion,
    title: '浏览器流程模拟报告',
    documentId: `mock-${reportType}`,
    url: `https://example.feishu.cn/docx/mock-${reportType}`
  };
}

function pathAnalysisSuccess() {
  return {
    ok: true,
    version: 'v3.9.63.1',
    dataYear: 2026,
    rankYear: 2026,
    audienceYear: 2027,
    yearCaliberVersion,
    level: 'medium',
    summary: '当前已选专业可以继续作为家庭讨论清单，但仍需核验正式计划。',
    stats: { total: 1, rushCount: 0, stableCount: 1, safeCount: 0, highRushCount: 0 },
    risks: ['低分侧补充仍需增加。'],
    actions: ['核验2027招生计划、学费、校区和培养方式。'],
    sections: [],
    candidateZones: [{ zoneKey: 'industry-entry-zone', zoneName: '行业入口选择区' }],
    rankZone: {
      zoneKey: 'industry-entry-zone',
      zoneName: '行业入口选择区',
      candidateRankLabel: '位次 12,001–12,320',
      specialControlScore: 508,
      specialControlRankLabel: '位次 49,001–49,824',
      density: { sameCount: 320, up5Count: 1100, down5Count: 1300 }
    },
    narrative: {
      overall: '先确认孩子是否愿意读，再核验2027正式资料。',
      zoneJudgement: '当前判断只依据2026主数据。',
      structureDiagnosis: '当前主要参考有1项，低分侧补充仍需增加。',
      actions: ['核验2027招生计划、学费、校区和培养方式。'],
      disclaimer: '2025、2024只作历史对照，不代表2027录取结果。'
    }
  };
}

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
    const scoreQueries = [];
    const schoolQueries = [];
    const currentReportPosts = [];
    const pathAnalysisPosts = [];
    const selectionReportPosts = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    page.on('dialog', dialog => dialog.accept());
    await page.route('**/api/major-bands**', route => {
      scoreQueries.push(new URL(route.request().url()));
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(scorePayload)
      });
    });
    await page.route('**/api/school-majors**', route => {
      const url = new URL(route.request().url());
      schoolQueries.push(url);
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(schoolPayload(Number(url.searchParams.get('candidateScore')) || null))
      });
    });
    await page.route('**/api/feishu-create-report', async route => {
      currentReportPosts.push(await route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(feishuSuccess('currentBand'))
      });
    });
    await page.route('**/api/path-analysis', async route => {
      pathAnalysisPosts.push(await route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(pathAnalysisSuccess())
      });
    });
    await page.route('**/api/feishu-create-selection-pool-report', async route => {
      selectionReportPosts.push(await route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(feishuSuccess('selectionPoolWithAnalysis'))
      });
    });

    try {
      await page.goto(`${baseUrl}/ln-rank/`, { waitUntil: 'networkidle', timeout: 60000 });
      const switcher = page.locator('#schoolViewModeMount');
      await switcher.waitFor({ state: 'visible', timeout: 15000 });
      const initial = await page.evaluate(() => {
        const doc = document.documentElement;
        const consoleBox = document.querySelector('.ln-console')?.getBoundingClientRect();
        const switchBox = document.getElementById('schoolViewModeMount')?.getBoundingClientRect();
        const buttons = [...document.querySelectorAll('[data-school-view-mode]')];
        return {
          overflow: doc.scrollWidth - doc.clientWidth,
          switchInsideConsole: Boolean(
            consoleBox && switchBox
            && switchBox.left >= consoleBox.left - 1
            && switchBox.right <= consoleBox.right + 1
          ),
          buttonTexts: buttons.map(button => button.textContent.trim()),
          buttonHeights: buttons.map(button => button.getBoundingClientRect().height),
          writingModes: buttons.map(button => getComputedStyle(button).writingMode),
          mode: document.body.dataset.resultMode
        };
      });
      assert.ok(initial.overflow <= 1, `${testCase.name}: initial horizontal overflow ${initial.overflow}`);
      assert.equal(initial.switchInsideConsole, true, `${testCase.name}: switch escaped static console`);
      assert.deepEqual(initial.buttonTexts, ['按分数找学校和专业', '按学校看全部专业']);
      assert.ok(initial.writingModes.every(mode => mode === 'horizontal-tb'));
      assert.equal(initial.mode, 'score-bands');
      if (testCase.touch) assert.ok(initial.buttonHeights.every(height => height >= 44), `${testCase.name}: mode touch target ${initial.buttonHeights}`);

      await page.locator('#candidateScore').fill('600');
      await page.locator('#majorKeyword').fill('电气/自动化');
      await page.locator('#queryButton').click();
      await page.locator('.major-card').first().waitFor({ state: 'visible', timeout: 20000 });
      assert.equal(scoreQueries.length, 1, `${testCase.name}: score query submitted more than once`);
      assert.equal(scoreQueries[0].searchParams.get('majorKeyword'), '电气/自动化');
      assert.equal(await page.locator('.major-card .school-all-entry-button').first().textContent(), '看该校全部专业');
      assert.match(await page.locator('#activeBandBadge').textContent(), /位/);

      const currentReportButton = page.locator('#feishuReportMount [data-generate-feishu]');
      await currentReportButton.waitFor({ state: 'visible' });
      assert.equal(await currentReportButton.isEnabled(), true, `${testCase.name}: current-band Feishu button disabled`);
      await currentReportButton.click();
      await page.locator('#feishuReportMount .feishu-box.is-success').waitFor({ state: 'visible', timeout: 10000 });
      assert.equal(currentReportPosts.length, 1, `${testCase.name}: current-band report POST count`);
      assert.equal(currentReportPosts[0].candidateScore, 600);
      assert.equal(currentReportPosts[0].dataYear, 2026);
      assert.equal(currentReportPosts[0].rankYear, 2026);
      assert.equal(currentReportPosts[0].audienceYear, 2027);
      assert.equal(currentReportPosts[0].yearCaliberVersion, yearCaliberVersion);
      assert.equal(currentReportPosts[0].selectedRecords[0].score2026, 595);
      assert.equal(currentReportPosts[0].selectedRecords[0].rank2026, 16500);

      await page.locator('.major-card .school-all-entry-button').first().click();
      await page.locator('.school-major-row').first().waitFor({ state: 'visible', timeout: 20000 });
      assert.equal(schoolQueries.length, 1, `${testCase.name}: school handoff submitted more than once`);
      assert.equal(schoolQueries[0].searchParams.get('school'), '东北大学');
      assert.equal(schoolQueries[0].searchParams.get('schoolEntityId'), 'neu-main');
      assert.equal(schoolQueries[0].searchParams.get('majorKeyword'), '电气/自动化');
      assert.equal(schoolQueries[0].searchParams.get('candidateScore'), '600');
      assert.equal(await page.locator('[data-school-view-mode="school-all"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.school-record-group:not(.is-special) .school-major-row').count(), 1);
      assert.equal(await page.locator('.school-record-group.is-special .school-major-row').count(), 1);

      const detailButton = page.locator('[data-school-detail-toggle]').first();
      await detailButton.click();
      const detailPanel = page.locator('.school-major-detail').first();
      await detailPanel.waitFor({ state: 'visible' });
      const schoolRowCount = await page.locator('.school-major-row').count();
      await page.locator('[data-school-selection-action]').first().click();
      assert.equal(await page.locator('.school-major-row').count(), schoolRowCount, `${testCase.name}: selection rerendered school rows`);
      assert.equal(await detailPanel.isVisible(), true, `${testCase.name}: selection collapsed the open detail`);
      assert.equal(await page.locator('[data-school-selection-action]').first().textContent(), '移出已选');

      await page.locator('#candidateScore').fill('610');
      await page.waitForFunction(() => globalThis.__GAOKAO_SCHOOL_ALL_MODE__?.getState?.().schoolAll.dirty === true);
      await page.waitForFunction(() => /更新学校专业/.test(document.getElementById('queryButton')?.textContent || ''));
      assert.equal(schoolQueries.length, 1, `${testCase.name}: changing shared input queried immediately`);
      assert.match(await page.locator('#queryButton').textContent(), /更新学校专业/);
      await page.locator('#queryButton').click();
      await page.waitForFunction(() => globalThis.__GAOKAO_SCHOOL_ALL_MODE__?.getState?.().schoolAll.loading === false);
      assert.equal(schoolQueries.length, 2, `${testCase.name}: school update must issue one request`);

      await page.locator('[data-school-view-mode="score-bands"]').click();
      await page.locator('#resultsPanel').waitFor({ state: 'visible' });
      assert.equal(await page.locator('.major-card').count(), 1, `${testCase.name}: retained score results disappeared`);
      await page.waitForFunction(() => /更新结果/.test(document.getElementById('queryButton')?.textContent || ''));
      assert.match(await page.locator('#queryButton').textContent(), /更新结果/);

      const finalMetrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const mode = document.getElementById('schoolViewModeMount');
        const query = document.getElementById('queryButton');
        return {
          overflow: doc.scrollWidth - doc.clientWidth,
          switchOverflow: mode ? mode.scrollWidth - mode.clientWidth : 999,
          queryHeight: query?.getBoundingClientRect().height || 0,
          release: document.body.dataset.release,
          workspaceVersion: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.version || '',
          schoolVersion: globalThis.__GAOKAO_SCHOOL_ALL_MODE__?.version || ''
        };
      });
      assert.ok(finalMetrics.overflow <= 1, `${testCase.name}: final horizontal overflow ${finalMetrics.overflow}`);
      assert.ok(finalMetrics.switchOverflow <= 1, `${testCase.name}: switch overflow ${finalMetrics.switchOverflow}`);
      if (testCase.touch) assert.ok(finalMetrics.queryHeight >= 44, `${testCase.name}: query touch target ${finalMetrics.queryHeight}`);
      assert.equal(finalMetrics.release, 'v3.9.63.1');
      assert.equal(finalMetrics.workspaceVersion, 'selection-workspace-orchestration-v3963_1');
      assert.equal(finalMetrics.schoolVersion, 'school-all-mode-v3963_1');

      await page.goto(`${baseUrl}/ln-rank/selection-pool.html?from=search&score=610`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.locator('#sendAnalyzedPool').waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForFunction(() => {
        const button = document.getElementById('sendAnalyzedPool');
        return button && !button.disabled;
      });
      await page.locator('#sendAnalyzedPool').click();
      await page.waitForFunction(() => /报告生成好了/.test(document.getElementById('feishuSelectionStatus')?.textContent || ''), null, { timeout: 15000 });
      assert.equal(pathAnalysisPosts.length, 1, `${testCase.name}: path analysis POST count`);
      assert.equal(pathAnalysisPosts[0].year, 2026);
      assert.equal(pathAnalysisPosts[0].dataYear, 2026);
      assert.equal(pathAnalysisPosts[0].rankYear, 2026);
      assert.equal(pathAnalysisPosts[0].audienceYear, 2027);
      assert.equal(pathAnalysisPosts[0].yearCaliberVersion, yearCaliberVersion);
      assert.equal(selectionReportPosts.length, 1, `${testCase.name}: selection report POST count`);
      assert.equal(selectionReportPosts[0].reportType, 'selectionPoolWithAnalysis');
      assert.equal(selectionReportPosts[0].year, 2026);
      assert.equal(selectionReportPosts[0].dataYear, 2026);
      assert.equal(selectionReportPosts[0].rankYear, 2026);
      assert.equal(selectionReportPosts[0].audienceYear, 2027);
      assert.equal(selectionReportPosts[0].yearCaliberVersion, yearCaliberVersion);
      assert.equal(selectionReportPosts[0].reportPayload.activeDataYear, 2026);
      assert.equal(selectionReportPosts[0].reportPayload.rankYear, 2026);
      assert.equal(selectionReportPosts[0].reportPayload.audienceYear, 2027);
      assert.equal(selectionReportPosts[0].items[0].score2026, 595);
      assert.equal(selectionReportPosts[0].items[0].rank2026, 16500);
      assert.equal(await page.locator('#feishuSelectionStatus a').textContent(), '打开飞书报告');
      assert.deepEqual(pageErrors, [], `${testCase.name}: page errors\n${pageErrors.join('\n')}`);

      results.push({
        name: testCase.name,
        scoreRequests: scoreQueries.length,
        schoolRequests: schoolQueries.length,
        currentReportRequests: currentReportPosts.length,
        pathAnalysisRequests: pathAnalysisPosts.length,
        selectionReportRequests: selectionReportPosts.length,
        ...finalMetrics
      });
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

console.log(JSON.stringify({
  ok: true,
  contract: 'dual-search-real-journey-v3963_1',
  cases: results
}, null, 2));
