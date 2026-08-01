import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.V3972_INTERACTION_BASE || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3972_INTERACTION_ARTIFACT_DIR || '/tmp/v3972-interaction-browser';
fs.mkdirSync(artifactDir, { recursive: true });

const record = {
  id: 'interaction|001', school: '东北大学', major: '自动化类', schoolCode2026: '0141', majorCode2026: '003',
  score: 579, rank: 21051, score2026: 579, rank2026: 21051, rankStart2026: 20760, rankEnd2026: 21051,
  sameCount2026: 292, scoreDelta2026: 0, rankGap2026: 0, statusKey: 'match', statusLabel: '历史位次接近',
  position: '主体讨论', band: 'near', bandKey: 'near', schoolTierTags: ['985', '211'], natureLabel: '公办',
  province: '辽宁', city: '沈阳', lnArea: '沈阳', regionGroups: ['ln', '辽宁省内', 'shenyang', '沈阳'],
  displayLocation: '辽宁 · 沈阳', projectLabel: '普通招生记录',
  schoolEntity: { entityId: 'neu-main', entityType: 'official_school' },
  matchReason: '统一交互事务回归记录',
  canonicalPosition: { bandKey: 'near', classificationBasis: 'rank-primary-2026-position', positionDistance: 0 }
};

function scorePayload(url) {
  const requestUrl = new URL(url);
  const region = requestUrl.searchParams.get('region') || 'all';
  return {
    ok: true,
    meta: {
      audienceYear: 2027, activeDataYear: 2026, candidateScore: 579, candidateReferenceRank2026: 21051,
      candidateReferenceRankStart2026: 20760, candidateReferenceRankEnd2026: 21051, candidateSameCount2026: 292,
      candidateRankLabel: '按2026年成绩分布，同分位置约为第20,760—21,051位',
      rangePreset: requestUrl.searchParams.get('rangePreset') || 'standard',
      dataScope: '辽宁2026物理类专业投档最低分', classificationMode: 'canonical_rank_primary_2026_position',
      specialProjectMode: requestUrl.searchParams.get('specialProjectMode') || 'hide_eligibility_projects', region
    },
    keywordQuery: { rawKeywords: [] }, matchSummary: { exact: 0, related: 0, industry: 0, project: 0 },
    source: { specialProjectHidden: 0, specialProjectShown: 0 }, counts: { upper: 0, near: 1, steady: 0, total: 1 },
    bands: {
      upper: { key: 'upper', title: '稍高目标', rankRangeText: '稍高目标', rangeText: '稍高目标', count: 0, records: [], pagination: { offset: 0, limit: 40, returned: 0, hasMore: false } },
      near: { key: 'near', title: '主要参考', rankRangeText: '主要参考', rangeText: '主要参考', count: 1, records: [record], pagination: { offset: 0, limit: 40, returned: 1, hasMore: false } },
      steady: { key: 'steady', title: '低分侧补充', rankRangeText: '低分侧补充', rangeText: '低分侧补充', count: 0, records: [], pagination: { offset: 0, limit: 40, returned: 0, hasMore: false } }
    }
  };
}

const schoolPayload = {
  ok: true,
  meta: {
    mode: 'school-all', school: '东北大学', schoolEntity: { entityId: 'neu-main', displayName: '东北大学' },
    filteredTotal: 1, candidateScore: 579, dataBoundary: '统一交互事务回归', keywordMode: 'any',
    pagination: { hasMore: false, nextOffset: null }
  },
  summary: { minScore: 579, maxScore: 579, uniqueMajorCount: 1, regularCount: 1, specialCount: 0, nearestRecord: { major: '自动化类', rank2026: 21051 } },
  keywordQuery: { rawKeywords: [] }, records: [record]
};

const cases = [
  { name: 'pc-1280', width: 1280, height: 800 },
  { name: 'pad-820', width: 820, height: 1180, touch: true },
  { name: 'android-390', width: 390, height: 844, touch: true, mobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36' }
];

const pathname = url => new URL(url).pathname;

async function waitForLength(items, expected, label) {
  const started = Date.now();
  while (items.length < expected && Date.now() - started < 10000) await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(items.length, expected, `${label}: expected ${expected}, got ${items.length}`);
}

function updateAction(page, mobile) {
  const primary = page.locator('#queryButton');
  const mobileShortcut = page.locator('#mobileDirtyButton');
  const resolve = async () => mobile && await mobileShortcut.isVisible() ? mobileShortcut : primary;
  return {
    async waitFor(options) { return (await resolve()).waitFor(options); },
    async click(options) { return (await resolve()).click(options); },
    async audit() {
      const primaryVisible = await primary.isVisible();
      const shortcutVisible = mobile ? await mobileShortcut.isVisible() : false;
      assert.equal(primaryVisible, true, 'primary submit owner must remain visible');
      return { primaryVisible, shortcutVisible };
    }
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const testCase of cases) {
    const context = await browser.newContext({
      viewport: { width: testCase.width, height: testCase.height }, hasTouch: Boolean(testCase.touch),
      isMobile: Boolean(testCase.mobile), userAgent: testCase.userAgent, deviceScaleFactor: 1
    });
    const page = await context.newPage();
    const pageErrors = [];
    const majorRequests = [];
    const schoolRequests = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    await page.route('**/api/major-bands**', route => {
      majorRequests.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(scorePayload(route.request().url())) });
    });
    await page.route('**/api/school-majors**', route => {
      schoolRequests.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(schoolPayload) });
    });
    await page.route('**/api/feishu-create-report', route => route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ ok: true, url: 'https://example.invalid/mock' }) }));

    try {
      await page.goto(`${baseUrl}/ln-rank/`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction(() => document.body.dataset.runtimeState === 'ready', null, { timeout: 20000 });

      const staticAudit = await page.evaluate(() => ({
        bootstrap: globalThis.__GAOKAO_RUNTIME_BOOTSTRAP__?.version || '',
        workspace: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.version || '',
        delegate: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.delegateVersion || '',
        interactionVersion: globalThis.__GAOKAO_INTERACTION_TRANSACTION__?.version || '',
        interaction: globalThis.__GAOKAO_INTERACTION_TRANSACTION__?.getState?.(),
        bodyVersion: document.body.dataset.uiInteractionVersion || '',
        disclosureCount: document.querySelectorAll('#familyConditionsDisclosure').length,
        compatibilityCount: document.querySelectorAll('#familyConditionsDetails[data-ui-disclosure-compatibility]').length,
        nonButtonTypes: [...document.querySelectorAll('button')].filter(button => button.getAttribute('type') !== 'button').map(button => button.id || button.textContent?.trim()),
        unlabeledButtons: [...document.querySelectorAll('button')].filter(button => !(button.textContent || '').trim() && !button.getAttribute('aria-label')).map(button => button.id || button.outerHTML.slice(0, 80)),
        nestedButtons: document.querySelectorAll('a button,button a').length,
        duplicateIds: [...document.querySelectorAll('[id]')].map(node => node.id).filter((id, index, all) => all.indexOf(id) !== index),
        controls: document.querySelectorAll('[data-runtime-control]').length,
        disabledControls: [...document.querySelectorAll('[data-runtime-control]')].filter(node => node.disabled).length,
        auxNavigation: [...document.querySelectorAll('.aux-background-card')].map(node => node.dataset.uiNavigation || '')
      }));
      assert.equal(staticAudit.bootstrap, 'resource-execution-v3972_4');
      assert.equal(staticAudit.workspace, 'selection-workspace-orchestration-v3972_4');
      assert.equal(staticAudit.delegate, 'selection-workspace-orchestration-v3969_0');
      assert.equal(staticAudit.interactionVersion, 'interaction-transaction-v3972_4');
      assert.equal(staticAudit.interaction.disclosureOwner, 'interaction-transaction-v3972_4');
      assert.equal(staticAudit.bodyVersion, 'interaction-transaction-v3972_4');
      assert.equal(staticAudit.disclosureCount, 1);
      assert.equal(staticAudit.compatibilityCount, 1);
      assert.deepEqual(staticAudit.nonButtonTypes, [], `${testCase.name}: buttons without type=button`);
      assert.deepEqual(staticAudit.unlabeledButtons, [], `${testCase.name}: unlabeled buttons`);
      assert.equal(staticAudit.nestedButtons, 0, `${testCase.name}: nested button/link`);
      assert.deepEqual(staticAudit.duplicateIds, [], `${testCase.name}: duplicate ids`);
      assert.ok(staticAudit.controls > 8, `${testCase.name}: runtime controls missing`);
      assert.equal(staticAudit.disabledControls, 0, `${testCase.name}: runtime controls stayed disabled`);
      assert.deepEqual(staticAudit.auxNavigation, ['auxiliary-background', 'auxiliary-background']);

      await page.locator('#candidateScore').fill('579');
      await page.locator('#queryButton').click();
      await page.locator('.major-card').first().waitFor({ state: 'visible', timeout: 20000 });
      await waitForLength(majorRequests, 1, `${testCase.name}: first score query`);
      assert.equal(pathname(page.url()), '/ln-rank/');

      const conditions = page.locator('#familyConditionsDisclosure');
      if (!(await conditions.evaluate(node => node.open))) await conditions.locator(':scope > summary').click();
      await page.locator('#region').waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await conditions.evaluate(node => node.open), true);

      const regionValues = ['guangdong', 'beijing', 'shandong', 'ln'];
      for (const region of regionValues) {
        const beforeRequests = majorRequests.length;
        await page.dispatchEvent('#region', 'pointerdown', { pointerType: testCase.touch ? 'touch' : 'mouse', pointerId: 1, isPrimary: true, buttons: 1 });
        await page.locator('#region').evaluate((select, value) => {
          select.value = value;
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }, region);
        await page.waitForTimeout(100);
        assert.equal(await page.locator('#region').inputValue(), region, `${testCase.name}: region state not committed`);
        assert.equal(await conditions.evaluate(node => node.open), true, `${testCase.name}: region change collapsed user disclosure`);
        await page.locator('#specialProjectToggle').waitFor({ state: 'visible', timeout: 3000 });
        assert.equal(majorRequests.length, beforeRequests, `${testCase.name}: region change queried before explicit submit`);

        const blockedBefore = await page.evaluate(() => globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState().blockedNavigations);
        await page.evaluate(() => document.querySelector('a[href="/ln-rank/local-mainline.html"]').click());
        await page.waitForTimeout(80);
        assert.equal(pathname(page.url()), '/ln-rank/', `${testCase.name}: native region tail click escaped to background page`);
        const blockedAfter = await page.evaluate(() => globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState().blockedNavigations);
        assert.equal(blockedAfter, blockedBefore + 1, `${testCase.name}: tail navigation was not owned by transaction guard`);

        const action = updateAction(page, testCase.mobile);
        const actionAudit = await action.audit();
        await action.waitFor({ state: 'visible', timeout: 5000 });
        await action.click();
        await waitForLength(majorRequests, beforeRequests + 1, `${testCase.name}: region update`);
        const requestUrl = new URL(majorRequests.at(-1));
        assert.equal(requestUrl.searchParams.get('region'), region, `${testCase.name}: submitted request lost region ${region}`);
        assert.equal(requestUrl.searchParams.get('interactionVersion'), 'interaction-transaction-v3972_4');
        assert.equal(await conditions.evaluate(node => node.open), true, `${testCase.name}: query commit collapsed user disclosure`);
        assert.equal(pathname(page.url()), '/ln-rank/');
        if (testCase.mobile && !actionAudit.shortcutVisible) assert.match(await page.locator('#queryButton').textContent(), /查看|更新|重新/);
      }

      const beforeRange = majorRequests.length;
      const advanced = page.locator('#scoreAdvancedOptions');
      if (!(await advanced.evaluate(node => node.open))) await advanced.locator(':scope > summary').click();
      await page.locator('[data-preset="wide"]').click();
      assert.equal(majorRequests.length, beforeRange, `${testCase.name}: range queried before submit`);
      await updateAction(page, testCase.mobile).click();
      await waitForLength(majorRequests, beforeRange + 1, `${testCase.name}: range update`);
      assert.equal(new URL(majorRequests.at(-1)).searchParams.get('rangePreset'), 'wide');

      const beforeSpecial = majorRequests.length;
      await page.locator('#specialProjectToggle').click();
      assert.equal(majorRequests.length, beforeSpecial, `${testCase.name}: special-project toggle queried before submit`);
      await updateAction(page, testCase.mobile).click();
      await waitForLength(majorRequests, beforeSpecial + 1, `${testCase.name}: special update`);
      assert.match(new URL(majorRequests.at(-1)).searchParams.get('specialProjectMode') || '', /show/);

      const beforeKeyword = majorRequests.length;
      await page.locator('#majorKeyword').fill('自动化');
      assert.equal(majorRequests.length, beforeKeyword, `${testCase.name}: keyword queried before submit`);
      await updateAction(page, testCase.mobile).click();
      await waitForLength(majorRequests, beforeKeyword + 1, `${testCase.name}: keyword update`);

      const switcherButtons = page.locator('#resultBandSwitcher button');
      if (await switcherButtons.count() > 1) {
        const beforeBand = majorRequests.length;
        await switcherButtons.nth(0).click();
        await page.waitForTimeout(80);
        assert.equal(majorRequests.length, beforeBand, `${testCase.name}: band view switch issued a query`);
      }

      const beforeSchool = schoolRequests.length;
      await page.locator('[data-school-view-mode="school-all"]').click();
      assert.equal(await conditions.evaluate(node => node.open), true, `${testCase.name}: school mode did not expose school controls`);
      await page.locator('#schoolKeyword').fill('东北大学');
      await page.locator('#queryButton').click();
      const schoolStarted = Date.now();
      while (schoolRequests.length === beforeSchool && Date.now() - schoolStarted < 10000) await page.waitForTimeout(50);
      assert.equal(schoolRequests.length, beforeSchool + 1, `${testCase.name}: school submit did not use school owner`);
      await page.locator('.school-major-row').first().waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('#schoolAllBack').click();
      assert.equal(await conditions.evaluate(node => node.open), true, `${testCase.name}: score mode did not restore user disclosure state`);
      assert.equal(pathname(page.url()), '/ln-rank/');

      const beforeNavigation = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        fixedQueryActions: [...document.querySelectorAll('#queryButton,#mobileDirtyButton')].filter(node => ['fixed','sticky'].includes(getComputedStyle(node).position)).length,
        interaction: globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState(),
        workspace: globalThis.__GAOKAO_SELECTION_WORKSPACE__.getState()
      }));
      assert.ok(beforeNavigation.overflow <= 1, `${testCase.name}: horizontal overflow ${beforeNavigation.overflow}`);
      assert.equal(beforeNavigation.fixedQueryActions, 0, `${testCase.name}: query button became fixed/sticky owner`);
      assert.ok(beforeNavigation.interaction.blockedNavigations >= regionValues.length, `${testCase.name}: insufficient guarded tail navigations`);
      assert.equal(beforeNavigation.interaction.disclosureOpen, true);
      assert.equal(beforeNavigation.workspace.interaction.disclosureOwner, 'interaction-transaction-v3972_4');
      assert.deepEqual(pageErrors, [], `${testCase.name}: ${pageErrors.join('\n')}`);

      await page.waitForTimeout(760);
      await Promise.all([
        page.waitForURL(url => url.pathname === '/ln-rank/local-mainline.html', { timeout: 10000 }),
        page.locator('a[href="/ln-rank/local-mainline.html"]').click()
      ]);
      assert.equal(pathname(page.url()), '/ln-rank/local-mainline.html', `${testCase.name}: intentional auxiliary navigation was blocked`);

      results.push({
        name: testCase.name, majorRequests: majorRequests.length, schoolRequests: schoolRequests.length,
        blockedNavigations: beforeNavigation.interaction.blockedNavigations,
        disclosureOpen: beforeNavigation.interaction.disclosureOpen, overflow: beforeNavigation.overflow
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
  contract: 'interaction-transaction-v3972_4',
  scope: 'PC-Pad-Android unified state action navigation and disclosure ownership',
  cases: results
}, null, 2));
