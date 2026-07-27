import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.V3968_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3968_ARTIFACT_DIR || '/tmp/v3968-academic-background-browser';
fs.mkdirSync(artifactDir, { recursive: true });

const cases = [
  { name: 'local-pc-1440', page: '/ln-rank/local-mainline.html', scope: 'liaoning', viewport: { width: 1440, height: 1000 }, school: '锦州医科大学', major: '医学影像学', score: 550, evidenceYear: '2017', sourceTitle: '全国第四轮学科评估结果及教育部学位中心说明' },
  { name: 'local-pad-820', page: '/ln-rank/local-mainline.html', scope: 'liaoning', viewport: { width: 820, height: 1180 }, school: '锦州医科大学', major: '医学影像学', score: 550, evidenceYear: '2017', sourceTitle: '全国第四轮学科评估结果及教育部学位中心说明' },
  { name: 'local-android-390', page: '/ln-rank/local-mainline.html', scope: 'liaoning', viewport: { width: 390, height: 844 }, school: '锦州医科大学', major: '医学影像学', score: 550, evidenceYear: '2017', sourceTitle: '全国第四轮学科评估结果及教育部学位中心说明' },
  { name: '211-pc-1440', page: '/ln-rank/211-mainline.html', scope: '211', viewport: { width: 1440, height: 1000 }, school: '兰州大学', major: '化学（基地班）', score: 625, evidenceYear: '2022', sourceTitle: '第二轮“双一流”建设高校及建设学科名单' },
  { name: '211-pad-820', page: '/ln-rank/211-mainline.html', scope: '211', viewport: { width: 820, height: 1180 }, school: '兰州大学', major: '化学（基地班）', score: 625, evidenceYear: '2022', sourceTitle: '第二轮“双一流”建设高校及建设学科名单' },
  { name: '211-android-360', page: '/ln-rank/211-mainline.html', scope: '211', viewport: { width: 360, height: 800 }, school: '兰州大学', major: '化学（基地班）', score: 625, evidenceYear: '2022', sourceTitle: '第二轮“双一流”建设高校及建设学科名单' }
];

function historyEvidence() {
  return {
    version: 'ln-physics-history-evidence-v3967_0',
    region: 'ln',
    subject: 'physics',
    primaryYear: 2026,
    years: {
      2025: { year: 2025, score: 562, rankStart: 27186, rankEnd: 27602, rank: 27602, evidenceState: 'matched', validationStatus: 'matched', comparable: true, sourceName: '辽宁2025物理类一分一段' },
      2024: { year: 2024, score: 570, rankStart: 23818, rankEnd: 24184, rank: 24184, evidenceState: 'matched', validationStatus: 'matched', comparable: true, sourceName: '辽宁2024物理类一分一段' }
    },
    comparison: { policy: 'rank-first-score-secondary', comparableYears: [2025, 2024], canCompareThreeYears: true }
  };
}

function responseFor(testCase, url) {
  const mode = url.searchParams.get('mode') || 'meta';
  const sourceUrl = testCase.scope === '211'
    ? 'https://hudong.moe.gov.cn/srcsite/A22/s7065/202202/t20220211_598710.html'
    : 'https://www.moe.gov.cn/jyb_xwfb/s271/201712/t20171228_323245.html';
  const meta = {
    providerVersion: 'academic-background-provider-v3968_0',
    matcherVersion: 'academic-background-matcher-v3968_0',
    sourceRegistryVersion: 'academic-background-sources-v3968_0',
    scope: testCase.scope,
    audienceYear: 2027,
    admissionDataYear: 2026,
    historyYears: [2025, 2024],
    rankYear: 2026,
    backgroundEvidenceUsesOwnYear: true,
    boundary: '2026、2025、2024是投档与位次年份；学校背景证据按各自来源年份展示。'
  };
  if (mode === 'meta') {
    return {
      ok: true,
      mode,
      scope: testCase.scope,
      meta,
      schools: [{ school: testCase.school, name: testCase.school, city: testCase.scope === 'liaoning' ? '锦州' : '兰州', overview: '通过权威来源门禁的学校专业背景。', scope: testCase.scope }],
      majors: [{ major: testCase.major, schoolCount: 1, scope: testCase.scope }],
      boundary: meta.boundary
    };
  }
  const record = {
    id: `${testCase.scope}-sample`,
    school: testCase.school,
    major: testCase.major,
    displayLocation: testCase.scope === 'liaoning' ? '辽宁·锦州' : '甘肃·兰州',
    natureLabel: '公办',
    score2026: testCase.score,
    rank2026: testCase.scope === 'liaoning' ? 31674 : 7602,
    rankStart2026: testCase.scope === 'liaoning' ? 31520 : 7540,
    rankEnd2026: testCase.scope === 'liaoning' ? 31674 : 7602,
    scoreDelta2026: 0,
    scoreDelta: 0,
    historyEvidence: historyEvidence(),
    academicBackground: {
      contract: 'academic-background-v3968_0',
      scope: testCase.scope,
      label: '本校方向',
      level: 'primary',
      direction: testCase.scope === '211' ? '化学' : '区域医学',
      verificationStatus: 'verified-source-derived-mapping',
      evidence: [{
        evidenceId: `${testCase.scope}-evidence`,
        evidenceType: testCase.scope === '211' ? 'double-first-class-discipline' : 'discipline-evaluation-fourth-round',
        disciplineName: testCase.scope === '211' ? '化学' : '临床医学',
        grade: testCase.scope === '211' ? '' : 'B-',
        detail: '权威学科背景证据',
        evidenceYear: testCase.evidenceYear,
        sourceId: testCase.scope === '211' ? 'MOE_DOUBLE_FIRST_CLASS_2022' : 'MOE_FOURTH_DISCIPLINE_2017',
        sourceTitle: testCase.sourceTitle,
        sourceUrl,
        authority: testCase.scope === '211' ? '教育部、财政部、国家发展改革委' : '教育部学位与研究生教育发展中心',
        verificationStatus: 'verified-source-derived-mapping',
        canTriggerFrontend: true
      }],
      sources: [{ sourceId: testCase.scope === '211' ? 'MOE_DOUBLE_FIRST_CLASS_2022' : 'MOE_FOURTH_DISCIPLINE_2017', title: testCase.sourceTitle, url: sourceUrl, year: testCase.evidenceYear, authority: '教育部权威来源' }],
      reviewPoints: ['培养方案', '招生章程'],
      note: '学校专业背景只用于家庭复核。'
    },
    rankingTrace: { owner: 'academic-background-position-v3968_0', primaryMetric: 'rank-distance-2026', candidateRank: testCase.scope === 'liaoning' ? 31674 : 7602, rankGap: 0, scoreGap: 0 }
  };
  return {
    ok: true,
    mode: 'position',
    scope: testCase.scope,
    audienceYear: 2027,
    admissionDataYear: 2026,
    historyYears: [2025, 2024],
    rankYear: 2026,
    score: testCase.score,
    records: [record],
    grouped: { near: [record], upper: [], lower: [] },
    count: 1,
    positionContext: { candidateScore: testCase.score, candidateRank: record.rank2026 },
    meta,
    boundary: '输入分数与2026投档记录比较；背景证据按自身来源年份展示。'
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const testCase of cases) {
    const context = await browser.newContext({ viewport: testCase.viewport });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => consoleErrors.push(error.message));
    await page.route('**/api/academic-background**', async route => {
      const requestUrl = new URL(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(responseFor(testCase, requestUrl)) });
    });
    await page.goto(`${baseUrl}${testCase.page}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.dataset.academicBackgroundRuntime === 'ready');
    assert.equal(await page.getAttribute('body', 'data-background-scope'), testCase.scope, `${testCase.name}: scope`);
    const scripts = await page.locator('script[type="module"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src') || ''));
    assert.ok(scripts.some(src => src.includes('academic-background-app.v3968_0.js')), `${testCase.name}: shared runtime missing`);
    assert.ok(!scripts.some(src => /local-mainline-app|211-mainline-app/.test(src)), `${testCase.name}: legacy runtime active`);
    await page.locator('[data-tab="score"]').click();
    await page.locator('#scoreInput').fill(String(testCase.score));
    await page.locator('#scoreQuery').click();
    const card = page.locator('.ab-record').first();
    await card.waitFor({ state: 'visible' });
    const defaultText = await card.innerText();
    for (const marker of ['2026投档参考', '2025：562分', '2024：570分', '背景证据年份', testCase.evidenceYear, '2026位次距离优先']) {
      assert.ok(defaultText.includes(marker), `${testCase.name}: missing ${marker}`);
    }
    assert.ok(!defaultText.includes('2025历史参考'), `${testCase.name}: stale 2025 copy`);
    assert.ok(!defaultText.includes('历史最低分'), `${testCase.name}: ambiguous historical score copy`);
    const sourceDetails = card.locator('.ab-sources');
    await sourceDetails.locator('summary').click();
    const sourceText = await sourceDetails.innerText();
    assert.ok(sourceText.includes(testCase.sourceTitle), `${testCase.name}: missing expanded official source title`);
    const sourceHref = await sourceDetails.locator('.ab-source').first().getAttribute('href');
    assert.match(sourceHref || '', /^https:\/\/(?:www\.|hudong\.)?moe\.gov\.cn\//, `${testCase.name}: official source link`);
    const geometry = await card.evaluate(node => {
      const rect = node.getBoundingClientRect();
      const evidence = node.querySelector('.ab-evidence')?.getBoundingClientRect();
      return { width: rect.width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, evidenceWidth: evidence?.width || 0, height: rect.height };
    });
    const minCardWidth = testCase.viewport.width <= 380 ? 280 : Math.min(320, testCase.viewport.width - 28);
    assert.ok(geometry.width >= minCardWidth, `${testCase.name}: card too narrow ${geometry.width}`);
    assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `${testCase.name}: horizontal overflow`);
    assert.ok(geometry.evidenceWidth >= 180, `${testCase.name}: evidence unreadable ${geometry.evidenceWidth}`);
    assert.ok(geometry.height < 1500, `${testCase.name}: vertical deformation ${geometry.height}`);
    assert.deepEqual(consoleErrors, [], `${testCase.name}: console errors ${consoleErrors.join(' | ')}`);
    await page.screenshot({ path: path.join(artifactDir, `${testCase.name}.png`), fullPage: true });
    results.push({ name: testCase.name, scope: testCase.scope, viewport: testCase.viewport, geometry });
    await context.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(artifactDir, 'result.json'), JSON.stringify({ ok: true, cases: results }, null, 2));
console.log(JSON.stringify({ ok: true, cases: results }, null, 2));
