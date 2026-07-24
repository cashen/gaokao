import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.SCHOOL_UI_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.SCHOOL_UI_ARTIFACT_DIR || '/tmp/school-ui-v3962_1';
fs.mkdirSync(artifactDir, { recursive: true });

const majors = [
  ['001', '电子信息类(创新班)(电子信息工程、计算机科学与技术、未来机器人、人工智能、自动化、电气工程及其自动化、光电信息科学与工程、生物医学工程)', 663, 1389, 148],
  ['002', '人工智能(未来卓越班)', 661, 1592, 146],
  ['003', '自动化类', 615, 10234, 100],
  ['004', '计算机科学与技术', 610, 11880, 95],
  ['005', '材料类', 590, 18600, 75],
  ['006', '生物医学工程(中外合作办学)', 575, 23800, 60]
];

const records = majors.map(([majorCode2026, major, score2026, rank2026, scoreDelta2026], index) => ({
  id: `neu-main|0141|${majorCode2026}`,
  school: '东北大学',
  major,
  schoolCode2026: '0141',
  majorCode2026,
  score2026,
  rank2026,
  score2025: index < 4 ? score2026 - 2 : null,
  score2024: index < 3 ? score2026 - 4 : null,
  scoreDelta2026,
  statusLabel: scoreDelta2026 > 0 ? '稍高目标参考' : '历史位置参考',
  schoolTierTags: ['985', '211'],
  natureLabel: '公办',
  displayLocation: '辽宁·沈阳',
  projectLabel: index === 5 ? '中外合作办学' : '普通招生记录',
  isSinoForeign: index === 5,
  isHighFee: index === 5,
  specialProject: index === 5 ? { hasSpecialProject: true, reviewPoints: ['学费与培养方式'] } : { hasSpecialProject: false },
  schoolEntity: { entityId: 'neu-main' }
}));

const payload = {
  ok: true,
  meta: {
    mode: 'school-all',
    school: '东北大学',
    schoolEntity: { entityId: 'neu-main', school: '东北大学' },
    filteredTotal: 52,
    candidateScore: 515,
    dataBoundary: '只展示该校在辽宁2026物理类投档表中的招生专业与项目，不代表该校全国全部本科专业，也不判断2027录取结果。',
    pagination: { hasMore: false, nextOffset: records.length }
  },
  summary: {
    minScore: 575,
    maxScore: 663,
    regularCount: 50,
    specialCount: 2,
    nearCount: 4
  },
  records
};

const cases = [
  { name: 'pc-1440', width: 1440, height: 900, maxClosedHeight: 125 },
  { name: 'pc-zoom-like-1024', width: 1024, height: 820, maxClosedHeight: 165 },
  { name: 'pad-820', width: 820, height: 1180, maxClosedHeight: 175, touch: true },
  { name: 'android-412', width: 412, height: 915, maxClosedHeight: 230, touch: true },
  { name: 'android-360-large-text', width: 360, height: 800, maxClosedHeight: 290, touch: true, largeText: true }
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const testCase of cases) {
    const context = await browser.newContext({
      viewport: { width: testCase.width, height: testCase.height },
      hasTouch: Boolean(testCase.touch),
      isMobile: testCase.width <= 480,
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    await page.route('**/api/school-majors**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(payload)
      });
    });

    try {
      await page.goto(`${baseUrl}/ln-rank/?mode=school-all&school=${encodeURIComponent('东北大学')}&score=515`, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      if (testCase.largeText) {
        await page.addStyleTag({ content: 'html{-webkit-text-size-adjust:125%} body{font-size:18px}' });
      }
      await page.locator('.school-major-row').first().waitFor({ state: 'visible', timeout: 30000 });
      await page.evaluate(async () => { await document.fonts?.ready; });

      const closedMetrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const panel = document.querySelector('#schoolAllResultsPanel');
        const cards = [...document.querySelectorAll('.school-major-row')];
        const first = cards[0];
        const add = first?.querySelector('[data-school-selection-action]');
        const detail = first?.querySelector('[data-school-detail-toggle]');
        return {
          documentOverflow: doc.scrollWidth - doc.clientWidth,
          panelOverflow: panel ? panel.scrollWidth - panel.clientWidth : 999,
          cardOverflow: cards.reduce((max, card) => Math.max(max, card.scrollWidth - card.clientWidth), 0),
          firstHeight: first?.getBoundingClientRect().height || 999,
          addText: add?.textContent?.trim() || '',
          detailText: detail?.textContent?.trim() || '',
          addWhiteSpace: add ? getComputedStyle(add).whiteSpace : '',
          detailWhiteSpace: detail ? getComputedStyle(detail).whiteSpace : '',
          addHeight: add?.getBoundingClientRect().height || 999,
          detailHeight: detail?.getBoundingClientRect().height || 999
        };
      });

      assert.ok(closedMetrics.documentOverflow <= 1, `${testCase.name}: document horizontal overflow ${closedMetrics.documentOverflow}`);
      assert.ok(closedMetrics.panelOverflow <= 1, `${testCase.name}: panel horizontal overflow ${closedMetrics.panelOverflow}`);
      assert.ok(closedMetrics.cardOverflow <= 1, `${testCase.name}: card horizontal overflow ${closedMetrics.cardOverflow}`);
      assert.ok(closedMetrics.firstHeight <= testCase.maxClosedHeight, `${testCase.name}: closed card too tall ${closedMetrics.firstHeight}`);
      assert.equal(closedMetrics.addText, '加入已选', `${testCase.name}: action copy must stay compact`);
      assert.equal(closedMetrics.detailText, '查看详情', `${testCase.name}: detail copy mismatch`);
      assert.equal(closedMetrics.addWhiteSpace, 'nowrap', `${testCase.name}: add action may not wrap`);
      assert.equal(closedMetrics.detailWhiteSpace, 'nowrap', `${testCase.name}: detail action may not wrap`);
      assert.ok(closedMetrics.addHeight <= 46, `${testCase.name}: add action too tall ${closedMetrics.addHeight}`);
      assert.ok(closedMetrics.detailHeight <= 46, `${testCase.name}: detail action too tall ${closedMetrics.detailHeight}`);

      const firstDetailButton = page.locator('[data-school-detail-toggle]').nth(0);
      const secondDetailButton = page.locator('[data-school-detail-toggle]').nth(1);
      await firstDetailButton.click();
      const firstPanelId = await firstDetailButton.getAttribute('aria-controls');
      const firstPanel = page.locator(`#${firstPanelId}`);
      await firstPanel.waitFor({ state: 'visible' });
      const expandedMetrics = await page.evaluate(panelId => {
        const panel = document.getElementById(panelId);
        const card = panel?.closest('[data-school-record]');
        const actions = card?.querySelector('.school-major-actions');
        const panelBox = panel?.getBoundingClientRect();
        const cardBox = card?.getBoundingClientRect();
        const actionBox = actions?.getBoundingClientRect();
        return {
          panelLeft: panelBox?.left || 0,
          panelRight: panelBox?.right || 0,
          panelTop: panelBox?.top || 0,
          cardLeft: cardBox?.left || 0,
          cardRight: cardBox?.right || 0,
          actionBottom: actionBox?.bottom || 0,
          panelOverflow: panel ? panel.scrollWidth - panel.clientWidth : 999
        };
      }, firstPanelId);
      assert.ok(expandedMetrics.panelLeft >= expandedMetrics.cardLeft - 1, `${testCase.name}: detail escaped card left edge`);
      assert.ok(expandedMetrics.panelRight <= expandedMetrics.cardRight + 1, `${testCase.name}: detail escaped card right edge`);
      assert.ok(expandedMetrics.panelTop >= expandedMetrics.actionBottom - 2, `${testCase.name}: detail overlaps action region`);
      assert.ok(expandedMetrics.panelOverflow <= 1, `${testCase.name}: detail panel overflow ${expandedMetrics.panelOverflow}`);

      await secondDetailButton.click();
      const secondPanelId = await secondDetailButton.getAttribute('aria-controls');
      await page.locator(`#${secondPanelId}`).waitFor({ state: 'visible' });
      assert.equal(await firstPanel.isHidden(), true, `${testCase.name}: only one detail may remain expanded`);
      assert.equal(await firstDetailButton.getAttribute('aria-expanded'), 'false', `${testCase.name}: first aria-expanded must reset`);
      assert.equal(await secondDetailButton.getAttribute('aria-expanded'), 'true', `${testCase.name}: second aria-expanded must be true`);

      await page.locator('[data-school-selection-action]').first().click();
      await page.locator('[data-school-selection-action]').first().filter({ hasText: '移出已选' }).waitFor({ state: 'visible' });
      assert.equal(await page.locator(`#${secondPanelId}`).isVisible(), true, `${testCase.name}: selection rerender must preserve open detail`);

      assert.deepEqual(pageErrors, [], `${testCase.name}: browser page errors\n${pageErrors.join('\n')}`);
      results.push({ name: testCase.name, ...closedMetrics, fullRowDetail: true, singleExpanded: true });
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

console.log(JSON.stringify({ ok: true, contract: 'school-ui-browser-v3962_1', cases: results }, null, 2));
