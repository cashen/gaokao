import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.V3969_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3969_ARTIFACT_DIR || '/tmp/v3969-school-query-browser';
fs.mkdirSync(artifactDir, { recursive: true });

const historyEvidence = {
  version: 'ln-physics-history-evidence-v3967_0',
  region: 'ln',
  subject: 'physics',
  primaryYear: 2026,
  years: {
    2026: { year: 2026, score: 503, rankStart: 51400, rankEnd: 51800, rank: 51800, comparable: true },
    2025: { year: 2025, score: 501, rankStart: 50900, rankEnd: 51300, rank: 51300, comparable: true },
    2024: { year: 2024, score: 506, rankStart: 49600, rankEnd: 50000, rank: 50000, comparable: true }
  },
  comparison: { policy: 'rank-first-score-secondary', comparableYears: [2026, 2025, 2024], canCompareThreeYears: true }
};

const record = {
  id: 'shenyang-chemical|sample',
  school: '沈阳化工大学',
  major: '化学工程与工艺',
  schoolCode2026: '0001',
  majorCode2026: '001',
  score2026: 503,
  rank2026: 51800,
  rankStart2026: 51400,
  rankEnd2026: 51800,
  historyEvidence,
  statusLabel: '2026历史位置参考',
  position: '主体讨论',
  bandKey: 'near',
  natureLabel: '公办',
  displayLocation: '辽宁 · 沈阳',
  projectLabel: '普通招生记录',
  schoolEntity: { entityId: '', entityType: 'official_school' },
  canonicalPosition: { bandKey: 'near', classificationBasis: 'rank-primary-2026-position' }
};

const ambiguityPayload = {
  ok: false,
  code: 'school_query_requires_choice',
  message: '这个输入同时可能表示学校所在地或学校名称，请先选择你真正想看的学校。',
  candidateTotal: 22,
  candidateReturned: 22,
  candidateHasMore: false,
  schoolQueryContractVersion: 'school-query-contract-v3969_0',
  query: {
    contractVersion: 'school-query-contract-v3969_0',
    status: 'ambiguous',
    ambiguityType: 'region-or-school-name',
    input: '沈阳',
    interpretations: [
      {
        intent: 'region',
        label: '位于沈阳市的招生学校',
        note: '按统一学校地域目录筛选，并只保留辽宁2026物理类有投档记录的学校。',
        total: 12,
        pagination: { total: 12, returned: 12, hasMore: false },
        candidates: [
          { school: '辽宁大学', officialName: '辽宁大学', city: '沈阳市', count: 72, recordCount2026: 72 },
          { school: '东北大学', officialName: '东北大学', city: '沈阳市', count: 45, recordCount2026: 45 },
          { school: '中国医科大学', officialName: '中国医科大学', city: '沈阳市', count: 31, recordCount2026: 31 },
          { school: '沈阳化工大学', officialName: '沈阳化工大学', city: '沈阳市', count: 18, recordCount2026: 18 },
          { school: '沈阳工业大学', officialName: '沈阳工业大学', city: '沈阳市', count: 65, recordCount2026: 65 },
          { school: '沈阳农业大学', officialName: '沈阳农业大学', city: '沈阳市', count: 117, recordCount2026: 117 },
          { school: '沈阳师范大学', officialName: '沈阳师范大学', city: '沈阳市', count: 53, recordCount2026: 53 },
          { school: '沈阳建筑大学', officialName: '沈阳建筑大学', city: '沈阳市', count: 50, recordCount2026: 50 },
          { school: '沈阳航空航天大学', officialName: '沈阳航空航天大学', city: '沈阳市', count: 43, recordCount2026: 43 },
          { school: '沈阳工程学院', officialName: '沈阳工程学院', city: '沈阳市', count: 41, recordCount2026: 41 },
          { school: '沈阳理工大学', officialName: '沈阳理工大学', city: '沈阳市', count: 41, recordCount2026: 41 },
          { school: '沈阳工学院', officialName: '沈阳工学院', city: '沈阳市', count: 35, recordCount2026: 35 }
        ]
      },
      {
        intent: 'school-name',
        label: '校名中包含“沈阳”',
        note: '只按正式校名、招生名称和明确别名解释，不把地域词自动当作学校名。',
        total: 10,
        pagination: { total: 10, returned: 10, hasMore: false },
        candidates: [
          { school: '沈阳农业大学', city: '沈阳市', count: 117 },
          { school: '沈阳工业大学', city: '沈阳市', count: 65 },
          { school: '沈阳师范大学', city: '沈阳市', count: 53 },
          { school: '沈阳建筑大学', city: '沈阳市', count: 50 },
          { school: '沈阳航空航天大学', city: '沈阳市', count: 43 },
          { school: '沈阳工程学院', city: '沈阳市', count: 41 },
          { school: '沈阳理工大学', city: '沈阳市', count: 41 },
          { school: '沈阳工学院', city: '沈阳市', count: 35 },
          { school: '沈阳化工大学', city: '沈阳市', count: 18 },
          { school: '沈阳科技学院', city: '沈阳市', count: 15 }
        ]
      }
    ]
  },
  candidates: []
};

const successPayload = {
  ok: true,
  meta: {
    mode: 'school-all',
    audienceYear: 2027,
    activeDataYear: 2026,
    rankYear: 2026,
    school: '沈阳化工大学',
    schoolQuery: '沈阳化工大学',
    schoolEntity: { entityId: '0001', entityType: 'official_school', displayName: '沈阳化工大学', parentEntityId: '' },
    filteredTotal: 1,
    schoolRecordTotal: 18,
    schoolQueryContractVersion: 'school-query-contract-v3969_0',
    schoolQueryIntent: 'school',
    dataBoundary: '只展示该校在辽宁2026物理类投档表中的招生专业与项目，不代表2027录取结果。',
    pagination: { offset: 0, limit: 40, returned: 1, hasMore: false, nextOffset: null }
  },
  summary: { minScore: 503, maxScore: 503, uniqueMajorCount: 1, regularCount: 1, specialCount: 0, nearestRecord: null },
  keywordQuery: { rawKeywords: [] },
  records: [record]
};

const cases = [
  { name: 'pc-1440', width: 1440, height: 960 },
  { name: 'pad-820', width: 820, height: 1180, touch: true },
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
    const requests = [];
    const schoolModeModules = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.endsWith('/ln-rank/js/feature/school-majors/school-all-mode.v3969_2.js')) schoolModeModules.push(url.searchParams.get('v') || '');
    });
    await page.route('**/api/school-majors**', route => {
      const url = new URL(route.request().url());
      requests.push(url);
      const exact = url.searchParams.get('school') === '沈阳化工大学';
      return route.fulfill({
        status: exact ? 200 : 409,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(exact ? successPayload : ambiguityPayload)
      });
    });
    try {
      await page.goto(`${baseUrl}/ln-rank/`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction(() => document.body.dataset.runtimeState === 'ready');
      assert.equal(await page.locator('body').getAttribute('data-release'), 'v3.9.69.0');
      assert.equal(await page.locator('body').getAttribute('data-school-query'), 'school-query-contract-v3969_0');
      await page.locator('[data-school-view-mode="school-all"]').click();
      await page.locator('#schoolKeyword').fill('沈阳');
      await page.locator('#queryButton').click();
      const boundary = page.locator('.school-candidate-boundary');
      await boundary.waitFor({ state: 'visible', timeout: 15000 });
      assert.match(await boundary.textContent(), /既可能是城市/);
      assert.doesNotMatch(await boundary.textContent(), /系统不会/);
      const groups = page.locator('.school-candidate-group');
      assert.equal(await groups.count(), 2, `${testCase.name}: interpretation group count`);
      const groupText = await groups.allTextContents();
      assert.ok(groupText.some(text => text.includes('位于沈阳市的招生学校')));
      assert.ok(groupText.some(text => text.includes('校名中包含“沈阳”')));
      assert.ok(groupText.every(text => text.includes('当前全部列出可选学校')));
      const chemicalCandidates = page.locator('[data-school-candidate="沈阳化工大学"]');
      assert.equal(await chemicalCandidates.count(), 2, `${testCase.name}: 沈阳化工大学 must appear in both interpretations`);
      const firstGroupNames = await groups.first().locator('[data-school-candidate]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-school-candidate')));
      assert.ok(firstGroupNames.includes('辽宁大学'), `${testCase.name}: region group missing 辽宁大学`);
      assert.ok(firstGroupNames.includes('东北大学'), `${testCase.name}: region group missing 东北大学`);
      assert.ok(firstGroupNames.includes('中国医科大学'), `${testCase.name}: region group missing 中国医科大学`);
      assert.ok(firstGroupNames.includes('沈阳化工大学'), `${testCase.name}: region group missing 沈阳化工大学`);
      assert.notEqual(firstGroupNames.indexOf('沈阳化工大学'), -1);
      await chemicalCandidates.first().click();
      const firstRow = page.locator('.school-major-row').first();
      await firstRow.waitFor({ state: 'visible', timeout: 15000 });
      assert.equal(requests.length, 3, `${testCase.name}: ambiguity, entity preflight, and records query are separate requests`);
      assert.equal(requests[0].searchParams.get('school'), '沈阳');
      assert.equal(requests[0].searchParams.get('resolveOnly'), '1');
      assert.equal(requests[1].searchParams.get('school'), '沈阳化工大学');
      assert.equal(requests[1].searchParams.get('resolveOnly'), '1');
      assert.equal(requests[2].searchParams.get('school'), '沈阳化工大学');
      assert.equal(requests[2].searchParams.get('resolveOnly'), null);
      assert.equal(requests[2].searchParams.get('schoolEntityId'), '0001');
      assert.match(await page.locator('#schoolAllTitle').textContent(), /沈阳化工大学/);
      assert.match(await firstRow.textContent(), /化学工程与工艺/);
      const reviewLink = firstRow.locator('.school-major-review-link');
      assert.equal(await reviewLink.count(), 1, `${testCase.name}: student opinion link missing`);
      assert.equal((await reviewLink.locator('.school-major-review-link__brand').textContent()).trim(), '大学生说学校', `${testCase.name}: school experience CTA must use the unified human brand`);
      assert.match((await reviewLink.locator('small').textContent()).trim(), /看看这所学校的大学生怎么说/, `${testCase.name}: school experience CTA must explain the destination`);
      assert.match(await reviewLink.getAttribute('href'), /\/tongxue\/\?school=/, `${testCase.name}: student opinion href must keep Tongxue handoff`);
      assert.ok(schoolModeModules.includes('3969_2'), `${testCase.name}: active school mode did not use human-copy cache identity`);
      const geometry = await page.evaluate(() => ({
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        candidateOverflow: Math.max(0, ...[...document.querySelectorAll('.school-candidate-list')].map(node => node.scrollWidth - node.clientWidth)),
        resultOverflow: document.getElementById('schoolAllContent')?.scrollWidth - document.getElementById('schoolAllContent')?.clientWidth || 0,
        workspace: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.version || '',
        schoolMode: globalThis.__GAOKAO_SCHOOL_ALL_MODE__?.version || ''
      }));
      assert.ok(geometry.pageOverflow <= 1, `${testCase.name}: page overflow ${geometry.pageOverflow}`);
      assert.ok(geometry.candidateOverflow <= 1, `${testCase.name}: candidate overflow ${geometry.candidateOverflow}`);
      assert.ok(geometry.resultOverflow <= 1, `${testCase.name}: result overflow ${geometry.resultOverflow}`);
      assert.equal(geometry.workspace, 'selection-workspace-orchestration-v3969_0');
      assert.equal(geometry.schoolMode, 'school-all-mode-v3969_2');
      assert.deepEqual(pageErrors, [], `${testCase.name}: page errors ${pageErrors.join(' | ')}`);
      await page.screenshot({ path: path.join(artifactDir, `${testCase.name}.png`), fullPage: true });
      results.push({ name: testCase.name, requests: requests.length, candidates: firstGroupNames.length, reviewCta:'大学生说学校', schoolModeIdentity:schoolModeModules.at(-1) || '', geometry });
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

fs.writeFileSync(path.join(artifactDir, 'result.json'), JSON.stringify({ ok: true, cases: results }, null, 2));
console.log(JSON.stringify({ ok: true, contract: 'school-query-browser-v3969_0', cases: results }, null, 2));
