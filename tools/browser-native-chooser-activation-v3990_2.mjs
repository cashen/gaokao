import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.V3990_2_BASE || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3990_2_ARTIFACT_DIR || '/tmp/v3990-0-native-chooser';
fs.mkdirSync(artifactDir, { recursive: true });

function scorePayload(url) {
  const requestUrl = new URL(url);
  return {
    ok: true,
    meta: {
      rangePreset: requestUrl.searchParams.get('rangePreset') || 'standard',
      classificationMode: 'interaction_fixture_empty',
      specialProjectMode: requestUrl.searchParams.get('specialProjectMode') || 'hide_eligibility_projects',
      region: requestUrl.searchParams.get('region') || 'all'
    },
    keywordQuery: { rawKeywords: [] },
    matchSummary: { exact: 0, related: 0, industry: 0, project: 0 },
    source: { specialProjectHidden: 0, specialProjectShown: 0 },
    counts: { upper: 0, near: 0, steady: 0, total: 0 },
    bands: {
      upper: { key: 'upper', title: '稍高目标', rangeText: '稍高目标', count: 0, records: [], pagination: { offset: 0, limit: 40, returned: 0, hasMore: false, nextOffset: null } },
      near: { key: 'near', title: '主要参考', rangeText: '主要参考', count: 0, records: [], pagination: { offset: 0, limit: 40, returned: 0, hasMore: false, nextOffset: null } },
      steady: { key: 'steady', title: '低分侧补充', rangeText: '低分侧补充', count: 0, records: [], pagination: { offset: 0, limit: 40, returned: 0, hasMore: false, nextOffset: null } }
    }
  };
}

const profiles = [
  {
    name: 'android-chrome-390-pointer', width: 390, height: 844, mobile: true, touch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36'
  },
  {
    name: 'android-alook-shell-390-pointer', width: 390, height: 844, mobile: true, touch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 Chrome/136.0 Mobile Safari/537.36 AlookBrowser/10'
  },
  {
    name: 'android-alook-shell-360-pointer', width: 360, height: 800, mobile: true, touch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/132.0 Mobile Safari/537.36 AlookBrowser/9'
  },
  {
    name: 'android-pad-alook-820-pointer', width: 820, height: 1180, mobile: false, touch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Tablet) AppleWebKit/537.36 Chrome/136.0 Safari/537.36 AlookBrowser/10'
  },
  {
    name: 'android-pad-1024-pointer', width: 1024, height: 1366, mobile: false, touch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Tablet) AppleWebKit/537.36 Chrome/140.0 Safari/537.36'
  },
  {
    name: 'legacy-webview-390-touch-fallback', width: 390, height: 844, mobile: true, touch: true,
    disablePointerEvents: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 10; wv) AppleWebKit/537.36 Version/4.0 Chrome/83.0 Mobile Safari/537.36'
  }
];

async function waitForReady(page) {
  await page.waitForFunction(() => globalThis.__GAOKAO_INTERACTION_TRANSACTION__?.getState?.().phase === 'ready', null, { timeout: 10000 });
}

async function installMutationProbe(page) {
  await page.evaluate(() => {
    globalThis.__NATIVE_CHOOSER_MUTATIONS__ = [];
    const observer = new MutationObserver(records => {
      for (const record of records) {
        const target = record.target;
        globalThis.__NATIVE_CHOOSER_MUTATIONS__.push({
          target: target instanceof Element ? (target.id || target.className || target.tagName) : String(target),
          attribute: record.attributeName || '',
          value: target instanceof Element && record.attributeName ? target.getAttribute(record.attributeName) : null
        });
      }
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'inert', 'style', 'class', 'data-ui-interaction-transaction', 'data-ui-navigation-enabled']
    });
    globalThis.__NATIVE_CHOOSER_MUTATION_OBSERVER__ = observer;
  });
}

async function synchronousActivationSnapshot(page, fallback) {
  return page.evaluate(({ fallback }) => {
    const select = document.querySelector('#region');
    const actions = [...document.querySelectorAll('[data-ui-navigation="auxiliary-background"]')];
    if (!(select instanceof HTMLSelectElement) || actions.length !== 2) throw new Error('activation targets missing');
    globalThis.__NATIVE_CHOOSER_MUTATIONS__.length = 0;
    const before = {
      state: globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState(),
      bodyPhase: document.body.dataset.uiInteractionTransaction,
      actions: actions.map(action => ({ disabled: action.disabled, inert: action.closest('.aux-background-entry')?.hasAttribute('inert') || false }))
    };
    let accepted;
    if (fallback) {
      accepted = select.dispatchEvent(new Event('touchstart', { bubbles: true, cancelable: true, composed: true }));
      select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true, detail: 1 }));
    } else {
      accepted = select.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, composed: true,
        pointerId: 41, pointerType: 'touch', isPrimary: true, buttons: 1
      }));
      select.dispatchEvent(new Event('touchstart', { bubbles: true, cancelable: true, composed: true }));
      select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true, detail: 1 }));
    }
    const after = {
      state: globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState(),
      bodyPhase: document.body.dataset.uiInteractionTransaction,
      actions: actions.map(action => ({ disabled: action.disabled, inert: action.closest('.aux-background-entry')?.hasAttribute('inert') || false })),
      mutations: [...globalThis.__NATIVE_CHOOSER_MUTATIONS__]
    };
    return { accepted, before, after };
  }, { fallback });
}

async function completeSelection(page, value, fallback) {
  return page.evaluate(({ value, fallback }) => {
    const select = document.querySelector('#region');
    const action = document.querySelector('[data-ui-navigation-target="/ln-rank/local-mainline.html"]');
    if (!(select instanceof HTMLSelectElement) || !(action instanceof HTMLButtonElement)) throw new Error('selection targets missing');
    select.focus();
    select.value = value;
    select.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    select.blur();
    const beforeTail = globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState();
    const tail = {};
    if (fallback) {
      tail.touchstart = action.dispatchEvent(new Event('touchstart', { bubbles: true, cancelable: true, composed: true }));
      tail.touchend = action.dispatchEvent(new Event('touchend', { bubbles: true, cancelable: true, composed: true }));
    } else {
      tail.pointerdown = action.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, composed: true,
        pointerId: 42, pointerType: 'touch', isPrimary: true, buttons: 1
      }));
      tail.pointerup = action.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, cancelable: true, composed: true,
        pointerId: 42, pointerType: 'touch', isPrimary: true, buttons: 0
      }));
    }
    tail.click = action.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, composed: true, detail: 1, button: 0
    }));
    const afterTail = globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState();
    return { beforeTail, afterTail, tail, value: select.value, pathname: location.pathname };
  }, { value, fallback });
}

async function exerciseCancelAndFocusReturn(page, fallback) {
  const result = await page.evaluate(({ fallback }) => {
    const select = document.querySelector('#region');
    if (!(select instanceof HTMLSelectElement)) throw new Error('region select missing');
    if (fallback) select.dispatchEvent(new Event('touchstart', { bubbles: true, cancelable: true, composed: true }));
    else select.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, composed: true,
      pointerId: 51, pointerType: 'touch', isPrimary: true, buttons: 1
    }));
    select.focus();
    select.blur();
    const immediate = globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState();
    globalThis.dispatchEvent(new FocusEvent('focus'));
    const afterFocus = globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState();
    return { immediate, afterFocus };
  }, { fallback });
  assert.notEqual(result.immediate.phase, 'ready');
  assert.equal(result.immediate.publishedPhase, 'ready');
  assert.equal(result.afterFocus.phase, 'native-chooser-stabilizing');
  await waitForReady(page);
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      hasTouch: profile.touch,
      isMobile: profile.mobile,
      userAgent: profile.userAgent,
      deviceScaleFactor: 1
    });
    if (profile.disablePointerEvents) {
      await context.addInitScript(() => {
        try { Object.defineProperty(globalThis, 'PointerEvent', { value: undefined, configurable: true }); } catch {}
      });
    }
    const page = await context.newPage();
    const pageErrors = [];
    const majorRequests = [];
    const navigations = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    page.on('request', request => {
      if (request.url().includes('/api/major-bands')) majorRequests.push(request.url());
      if (request.isNavigationRequest() && request.resourceType() === 'document') navigations.push(request.url());
    });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      const file = url.pathname === '/ln-rank/local-mainline'
        ? 'ln-rank/local-mainline.html'
        : url.pathname === '/ln-rank/211-mainline'
          ? 'ln-rank/211-mainline.html'
          : '';
      if (file) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(file) });
      return route.continue();
    });
    await page.route('**/api/major-bands**', route => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(scorePayload(route.request().url()))
    }));
    await page.route('**/api/school-majors**', route => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true, meta: { mode: 'school-all', pagination: { hasMore: false, nextOffset: null } }, summary: {}, keywordQuery: { rawKeywords: [] }, records: [] })
    }));
    await page.route('**/api/feishu-create-report', route => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true, url: 'https://example.invalid/mock' })
    }));

    try {
      await page.goto(`${baseUrl}/ln-rank/`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction(() => document.body.dataset.runtimeState === 'ready', null, { timeout: 20000 });
      const initial = await page.evaluate(() => ({
        release: document.body.dataset.release,
        generation: document.body.dataset.siteRuntimeGeneration,
        interactionVersion: globalThis.__GAOKAO_INTERACTION_TRANSACTION__?.version,
        interaction: globalThis.__GAOKAO_INTERACTION_TRANSACTION__?.getState?.(),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        auxiliaryLinks: [...document.querySelectorAll('a.aux-background-card')].map(link => ({ href: link.getAttribute('href'), target: link.getAttribute('target'), navigationTarget: link.getAttribute('data-ui-navigation-target') })),
        duplicateIds: [...document.querySelectorAll('[id]')].map(node => node.id).filter((id, index, all) => all.indexOf(id) !== index)
      }));
      assert.equal(initial.release, 'v3.9.90.2');
      assert.equal(initial.generation, 'v3990_2');
      assert.equal(initial.interactionVersion, 'interaction-transaction-v3990_2');
      assert.equal(initial.interaction.preActivationDomMutationPolicy, 'forbidden');
      assert.equal(initial.interaction.tailGuardStartsAfterOutcome, true);
      assert.equal(initial.interaction.synchronousActivationDomMutations, 0);
      assert.ok(initial.overflow <= 1, `${profile.name}: horizontal overflow ${initial.overflow}`);
      assert.deepEqual(initial.duplicateIds, []);
      assert.deepEqual(initial.auxiliaryLinks, [
        { href: '/ln-rank/local-mainline', target: null, navigationTarget: null },
        { href: '/ln-rank/211-mainline', target: null, navigationTarget: null }
      ]);
      for (const href of ['/ln-rank/local-mainline', '/ln-rank/211-mainline']) {
        await Promise.all([
          page.waitForURL(url => new URL(url).pathname === href, { timeout: 10000 }),
          page.locator(`a.aux-background-card[href="${href}"]`).click()
        ]);
        assert.equal(new URL(page.url()).pathname, href, `${profile.name}: native background link did not navigate`);
        await page.goto(`${baseUrl}/ln-rank/`, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForFunction(() => document.body.dataset.runtimeState === 'ready', null, { timeout: 20000 });
      }
      if (profile.disablePointerEvents) assert.equal(initial.interaction.physicalEventFamily, 'touch-mouse-fallback');
      else assert.equal(initial.interaction.physicalEventFamily, 'pointer');

      const disclosure = page.locator('#familyConditionsDisclosure');
      if (!(await disclosure.evaluate(node => node.open))) await disclosure.locator(':scope > summary').click();
      await installMutationProbe(page);

      const activation = await synchronousActivationSnapshot(page, profile.disablePointerEvents);
      assert.equal(activation.accepted, true, `${profile.name}: native control start was canceled`);
      assert.equal(activation.after.state.phase, 'native-chooser-pending');
      assert.equal(activation.after.state.publishedPhase, 'ready');
      assert.equal(activation.after.state.sequence, activation.before.state.sequence + 1, `${profile.name}: duplicate event family created multiple transactions`);
      assert.equal(activation.after.bodyPhase, activation.before.bodyPhase, `${profile.name}: body phase mutated before default action`);
      assert.deepEqual(activation.after.actions, activation.before.actions, `${profile.name}: actions mutated before default action`);
      assert.deepEqual(activation.after.mutations, [], `${profile.name}: synchronous activation DOM mutations: ${JSON.stringify(activation.after.mutations)}`);

      await page.waitForTimeout(20);
      const deferred = await page.evaluate(() => globalThis.__GAOKAO_INTERACTION_TRANSACTION__.getState());
      assert.equal(deferred.phase, 'native-chooser-active');
      assert.equal(deferred.publishedPhase, 'ready');
      assert.equal(deferred.synchronousActivationDomMutations, 0);

      const actionState = await page.evaluate(() => [...document.querySelectorAll('[data-ui-navigation="auxiliary-background"]')].map(action => ({
        disabled: action.disabled ?? false,
        inert: action.closest('.aux-background-entry')?.hasAttribute('inert') || false,
        pointerEvents: getComputedStyle(action).pointerEvents
      })));
      assert.deepEqual(actionState, [
        { disabled: false, inert: false, pointerEvents: 'auto' },
        { disabled: false, inert: false, pointerEvents: 'auto' }
      ], `${profile.name}: chooser guard altered unrelated DOM hit targets`);
      await waitForReady(page);

      const beforeRequests = majorRequests.length;
      await page.locator('#candidateScore').fill('520');
      await page.locator('#queryButton').click();
      await page.waitForFunction(count => globalThis.performance && count < 999999, beforeRequests, { timeout: 1000 });
      const started = Date.now();
      while (majorRequests.length < beforeRequests + 1 && Date.now() - started < 15000) await page.waitForTimeout(50);
      assert.equal(majorRequests.length, beforeRequests + 1, `${profile.name}: explicit query missing`);
      const requestUrl = new URL(majorRequests.at(-1));
      assert.equal(requestUrl.searchParams.get('region'), 'guangdong');
      assert.equal(requestUrl.searchParams.get('interactionVersion'), 'interaction-transaction-v3990_2');
      assert.equal(requestUrl.searchParams.get('siteRuntimeGeneration'), 'v3990_2');

      await exerciseCancelAndFocusReturn(page, profile.disablePointerEvents);
      assert.deepEqual(pageErrors, [], `${profile.name}: ${pageErrors.join('\n')}`);

      results.push({
        name: profile.name,
        physicalEventFamily: initial.interaction.physicalEventFamily,
        synchronousActivationMutations: activation.after.mutations.length,
        blockedTail: activation.after.state.blockedNavigations - activation.before.state.blockedNavigations,
        explicitRegion: requestUrl.searchParams.get('region')
      });
    } catch (error) {
      await page.screenshot({ path: path.join(artifactDir, `${profile.name}-failure.png`), fullPage: true }).catch(() => {});
      fs.writeFileSync(path.join(artifactDir, `${profile.name}-error.txt`), String(error?.stack || error));
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(artifactDir, 'summary.json'), JSON.stringify({ ok: true, results }, null, 2));
console.log(JSON.stringify({
  ok: true,
  release: 'v3.9.90.2',
  generation: 'v3990_2',
  interaction: 'interaction-transaction-v3990_2',
  scope: 'pre-activation DOM integrity, single physical event family, outcome-first tail guard, cancel/focus return and Android/Pad matrix',
  results
}, null, 2));
