import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.V3972_INTERACTION_BASE || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3972_INTERACTION_ARTIFACT_DIR || '/tmp/v3972-5-interaction-browser';
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
  { name: 'android-360', width: 360, height: 800, touch: true, mobile: true },
  { name: 'android-390', width: 390, height: 844, touch: true, mobile: true },
  { name: 'android-430', width: 430, height: 932, touch: true, mobile: true },
  { name: 'pad-768', width: 768, height: 1024, touch: true },
  { name: 'pad-820', width: 820, height: 1180, touch: true },
  { name: 'pad-1024', width: 1024, height: 1366, touch: true },
  { name: 'pc-1280', width: 1280, height: 800 },
  { name: 'pc-1366', width: 1366, height: 768 },
  { name: 'pc-1440', width: 1440, height: 900 },
  { name: 'pc-1920', width: 1920, height: 1080 }
];

const regionValues = ['guangdong', 'beijing', 'shandong', 'ln', 'all'];
const pathname = url => new URL(url).pathname;

async function waitForLength(items, expected, label) {
  const started = Date.now();
  while (items.length < expected && Date.now() - started < 12000) await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(items.length, expected, `${label}: expected ${expected}, got ${items.length}`);
}

async function updateAction(page, mobile) {
  const mobileAction = page.locator('#mobileDirtyButton');
  if (mobile && await mobileAction.isVisible()) return mobileAction;
  return page.locator('#queryButton');
}

async function replayNativeChooserTail(page, value, navigationSelector) {
  return page.evaluate(({ value, navigationSelector }) => {
    const select = document.querySelector('#region');
    const action = document.querySelector(navigationSelector);
    if (!(select instanceof HTMLSelectElement) || !(action instanceof HTMLButtonElement)) {
      throw new Error('native chooser or navigation action missing');
    }

    const dispatch = event => action.dispatchEvent(event);
    select.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, composed: true,
      pointerId: 71, pointerType: 'touch', isPrimary: true, buttons: 1
    }));
    select.focus();
    select.value = value;
    select.dispatchEvent(new Event('input', { bubbles: true, cancelable: false, composed: true }));
    select.dispatchEvent(new Event('change', { bubbles: true, cancelable: false, composed: true }));
    select.blur();

    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
      const before = globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState();
      const results = {
        touchstart: dispatch(new Event('touchstart', { bubbles: true, cancelable: true, composed: true })),
        pointerdown: dispatch(new PointerEvent('pointerdown', {
          bubbles: true, cancelable: true, composed: true,
          pointerId: 72, pointerType: 'touch', isPrimary: true, buttons: 1
        })),
        pointerup: dispatch(new PointerEvent('pointerup', {
          bubbles: true, cancelable: true, composed: true,
          pointerId: 72, pointerType: 'touch', isPrimary: true, buttons: 0
        })),
        touchend: dispatch(new Event('touchend', { bubbles: true, cancelable: true, composed: true })),
        click: dispatch(new MouseEvent('click', {
          bubbles: true, cancelable: true, composed: true, detail: 1, button: 0, buttons: 0
        }))
      };
      const after = globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState();
      resolve({ before, after, results });
    })));
  }, { value, navigationSelector });
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [caseIndex, testCase] of cases.entries()) {
    const context = await browser.newContext({
      viewport: { width: testCase.width, height: testCase.height },
      hasTouch: Boolean(testCase.touch),
      isMobile: Boolean(testCase.mobile),
      userAgent: testCase.mobile
        ? 'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36'
        : undefined,
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    const pageErrors = [];
    const majorRequests = [];
    const schoolRequests = [];
    const documentNavigationRequests = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    page.on('request', request => {
      if (request.isNavigationRequest() && request.resourceType() === 'document') documentNavigationRequests.push(request.url());
    });
    await page.addInitScript(() => {
      globalThis.__GAOKAO_TEST_LIFECYCLE__ = { beforeunload: 0, pagehide: 0, popstate: 0 };
      addEventListener('beforeunload', () => { globalThis.__GAOKAO_TEST_LIFECYCLE__.beforeunload += 1; });
      addEventListener('pagehide', () => { globalThis.__GAOKAO_TEST_LIFECYCLE__.pagehide += 1; });
      addEventListener('popstate', () => { globalThis.__GAOKAO_TEST_LIFECYCLE__.popstate += 1; });
    });
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
        bootstrap: globalThis.__GAOKAO_RUNTIME_BOOTSTRAP__,
        workspace: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.getState?.(),
        workspaceVersion: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.version || '',
        delegateVersion: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.delegateVersion || '',
        interaction: globalThis.__GAOKAO_INTERACTION_TRANSACTION__?.getState?.(),
        interactionVersion: globalThis.__GAOKAO_INTERACTION_TRANSACTION__?.version || '',
        bodyGeneration: document.body.dataset.siteRuntimeGeneration || '',
        disclosureCount: document.querySelectorAll('#familyConditionsDisclosure').length,
        compatibilityCount: document.querySelectorAll('#familyConditionsDetails[data-ui-disclosure-compatibility]').length,
        auxiliaryAnchors: document.querySelectorAll('a[href="/ln-rank/local-mainline.html"],a[href="/ln-rank/211-mainline.html"]').length,
        auxiliaryButtons: [...document.querySelectorAll('[data-ui-navigation="auxiliary-background"]')].map(node => ({
          tag: node.tagName, type: node.getAttribute('type'), target: node.dataset.uiNavigationTarget
        })),
        nonButtonTypes: [...document.querySelectorAll('button')].filter(button => button.getAttribute('type') !== 'button').map(button => button.id || button.textContent?.trim()),
        nestedButtons: document.querySelectorAll('a button,button a').length,
        duplicateIds: [...document.querySelectorAll('[id]')].map(node => node.id).filter((id, index, all) => all.indexOf(id) !== index),
        disabledRuntimeControls: [...document.querySelectorAll('[data-runtime-control]')].filter(node => node.disabled).length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      }));
      assert.equal(staticAudit.bootstrap.version, 'resource-execution-v3972_5');
      assert.equal(staticAudit.bootstrap.generation, 'v3972_5');
      assert.equal(staticAudit.workspaceVersion, 'selection-workspace-orchestration-v3972_5');
      assert.equal(staticAudit.delegateVersion, 'selection-workspace-orchestration-v3969_0');
      assert.equal(staticAudit.interactionVersion, 'interaction-transaction-v3972_5');
      assert.equal(staticAudit.interaction.generation, 'v3972_5');
      assert.equal(staticAudit.bodyGeneration, 'v3972_5');
      assert.equal(staticAudit.disclosureCount, 1);
      assert.equal(staticAudit.compatibilityCount, 1);
      assert.equal(staticAudit.auxiliaryAnchors, 0);
      assert.deepEqual(staticAudit.auxiliaryButtons, [
        { tag: 'BUTTON', type: 'button', target: '/ln-rank/local-mainline.html' },
        { tag: 'BUTTON', type: 'button', target: '/ln-rank/211-mainline.html' }
      ]);
      assert.deepEqual(staticAudit.nonButtonTypes, [], `${testCase.name}: buttons without type=button`);
      assert.equal(staticAudit.nestedButtons, 0, `${testCase.name}: nested button/link`);
      assert.deepEqual(staticAudit.duplicateIds, [], `${testCase.name}: duplicate ids`);
      assert.equal(staticAudit.disabledRuntimeControls, 0, `${testCase.name}: runtime controls stayed disabled`);
      assert.ok(staticAudit.overflow <= 1, `${testCase.name}: horizontal overflow ${staticAudit.overflow}`);

      await page.locator('#candidateScore').fill('579');
      await page.locator('#queryButton').click();
      await page.locator('.major-card').first().waitFor({ state: 'visible', timeout: 20000 });
      await waitForLength(majorRequests, 1, `${testCase.name}: first score query`);
      assert.equal(pathname(page.url()), '/ln-rank/');

      const conditions = page.locator('#familyConditionsDisclosure');
      if (!(await conditions.evaluate(node => node.open))) await conditions.locator(':scope > summary').click();
      assert.equal(await conditions.evaluate(node => node.open), true);

      for (const [regionIndex, region] of regionValues.entries()) {
        const beforeRequests = majorRequests.length;
        const beforeNavRequests = documentNavigationRequests.length;
        const beforeHistory = await page.evaluate(() => history.length);
        const beforeLifecycle = await page.evaluate(() => ({ ...globalThis.__GAOKAO_TEST_LIFECYCLE__ }));
        const navigationSelector = regionIndex % 2 === 0
          ? '[data-ui-navigation-target="/ln-rank/local-mainline.html"]'
          : '[data-ui-navigation-target="/ln-rank/211-mainline.html"]';

        const replay = await replayNativeChooserTail(page, region, navigationSelector);
        await page.waitForTimeout(80);

        assert.equal(await page.locator('#region').inputValue(), region, `${testCase.name}: region state not retained`);
        assert.equal(await conditions.evaluate(node => node.open), true, `${testCase.name}: disclosure collapsed`);
        assert.equal(majorRequests.length, beforeRequests, `${testCase.name}: region changed without explicit submit`);
        assert.equal(pathname(page.url()), '/ln-rank/', `${testCase.name}: tail sequence navigated away`);
        assert.equal(documentNavigationRequests.length, beforeNavRequests, `${testCase.name}: tail sequence issued document navigation`);
        assert.equal(await page.evaluate(() => history.length), beforeHistory, `${testCase.name}: tail sequence changed history`);
        assert.deepEqual(await page.evaluate(() => ({ ...globalThis.__GAOKAO_TEST_LIFECYCLE__ })), beforeLifecycle, `${testCase.name}: tail sequence triggered lifecycle`);
        assert.equal(replay.before.phase, 'native-chooser-stabilizing');
        assert.equal(replay.after.phase, 'native-chooser-stabilizing');
        assert.ok(replay.after.blockedNavigations > replay.before.blockedNavigations, `${testCase.name}: tail sequence was not blocked`);
        assert.equal(replay.results.click, false, `${testCase.name}: click should be canceled`);

        await page.waitForFunction(() => globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState().phase === 'ready', null, { timeout: 8000 });
        const action = await updateAction(page, testCase.mobile);
        await action.click();
        await waitForLength(majorRequests, beforeRequests + 1, `${testCase.name}: explicit region update`);
        const requestUrl = new URL(majorRequests.at(-1));
        assert.equal(requestUrl.searchParams.get('region'), region, `${testCase.name}: submitted request lost region`);
        assert.equal(requestUrl.searchParams.get('interactionVersion'), 'interaction-transaction-v3972_5');
        assert.equal(requestUrl.searchParams.get('siteRuntimeGeneration'), 'v3972_5');
        assert.equal(pathname(page.url()), '/ln-rank/');
      }

      if ([0, 4, 6].includes(caseIndex)) {
        const beforeRange = majorRequests.length;
        const advanced = page.locator('#scoreAdvancedOptions');
        if (!(await advanced.evaluate(node => node.open))) await advanced.locator(':scope > summary').click();
        await page.locator('[data-preset="wide"]').click();
        assert.equal(majorRequests.length, beforeRange);
        await (await updateAction(page, testCase.mobile)).click();
        await waitForLength(majorRequests, beforeRange + 1, `${testCase.name}: range update`);

        const beforeSpecial = majorRequests.length;
        await page.locator('#specialProjectToggle').click();
        assert.equal(majorRequests.length, beforeSpecial);
        await (await updateAction(page, testCase.mobile)).click();
        await waitForLength(majorRequests, beforeSpecial + 1, `${testCase.name}: special update`);

        const beforeKeyword = majorRequests.length;
        await page.locator('#majorKeyword').fill('自动化');
        assert.equal(majorRequests.length, beforeKeyword);
        await (await updateAction(page, testCase.mobile)).click();
        await waitForLength(majorRequests, beforeKeyword + 1, `${testCase.name}: keyword update`);

        const beforeSchool = schoolRequests.length;
        await page.locator('[data-school-view-mode="school-all"]').click();
        await page.locator('#schoolKeyword').fill('东北大学');
        await page.locator('#queryButton').click();
        await waitForLength(schoolRequests, beforeSchool + 1, `${testCase.name}: school query`);
        await page.locator('.school-major-row').first().waitFor({ state: 'visible', timeout: 10000 });
        await page.locator('#schoolAllBack').click();
        assert.equal(await conditions.evaluate(node => node.open), true);
      }

      const beforeProgrammatic = await page.evaluate(() => globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState().blockedNavigations);
      await page.evaluate(() => document.querySelector('[data-ui-navigation-target="/ln-rank/local-mainline.html"]').click());
      await page.waitForTimeout(60);
      assert.equal(pathname(page.url()), '/ln-rank/', `${testCase.name}: unowned programmatic click navigated`);
      const afterProgrammatic = await page.evaluate(() => globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState().blockedNavigations);
      assert.equal(afterProgrammatic, beforeProgrammatic + 1);
      assert.deepEqual(pageErrors, [], `${testCase.name}: ${pageErrors.join('\n')}`);

      await Promise.all([
        page.waitForURL(url => url.pathname === '/ln-rank/local-mainline.html', { timeout: 10000 }),
        page.locator('[data-ui-navigation-target="/ln-rank/local-mainline.html"]').click()
      ]);
      assert.equal(pathname(page.url()), '/ln-rank/local-mainline.html', `${testCase.name}: intentional navigation blocked`);

      results.push({
        name: testCase.name,
        majorRequests: majorRequests.length,
        schoolRequests: schoolRequests.length,
        documentNavigationRequests: documentNavigationRequests.length,
        regions: regionValues.length
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
  contract: 'site-runtime-coherence-v3972_5',
  interaction: 'interaction-transaction-v3972_5',
  scope: 'full native chooser lifecycle, layout stability, explicit navigation ownership and multi-terminal regression',
  cases: results
}, null, 2));
