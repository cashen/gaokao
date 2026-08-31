import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.HOME_RELEASE_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3970_HOME_ARTIFACT_DIR || '/tmp/v3990-2-home-browser';
fs.mkdirSync(artifactDir, { recursive: true });

const devices = [
  { name: 'android-360', width: 360, height: 800 },
  { name: 'android-390', width: 390, height: 844 },
  { name: 'ipad-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 }
];

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined
});
const results = [];
try {
  for (const device of devices) {
    const context = await browser.newContext({ viewport: { width: device.width, height: device.height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    await page.addInitScript(() => {
      localStorage.setItem('lnRank.selectionPool.candidateScore', '580');
      localStorage.setItem('lnRank.selectionPool.lnPhysics.2026.v3951', JSON.stringify({
        items: [
          { id: 'home-test-1', school: '测试大学', major: '计算机科学与技术', displayLocation: '辽宁 · 沈阳', flags: [] },
          { id: 'home-test-2', school: '测试大学分校', major: '自动化', displayLocation: '辽宁 · 大连校区', flags: ['校区待确认'] }
        ]
      }));
    });
    await page.goto(`${baseURL}/?home-release=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() =>
      globalThis.__GAOKAO_HOME_RUNTIME__?.version === 'family-home-runtime-v3990_3-r031'
      && globalThis.__GAOKAO_UI__?.version === 'family-shell-v3990_3'
    );

    const state = await page.evaluate(() => {
      const majorPathEntry = document.querySelector('[data-home-major-path-entry]');
      const industryEntry = document.querySelector('[data-home-industry-map-entry]');
      const supportLinks = [...document.querySelectorAll('.tool-groups .tool-link')];
      const groups = [...document.querySelectorAll('[data-tool-group]')];
      return {
        bodyRelease: document.body.dataset.release,
        htmlRelease: document.documentElement.dataset.release,
        bodyGeneration: document.body.dataset.siteRuntimeGeneration,
        htmlGeneration: document.documentElement.dataset.siteRuntimeGeneration,
        visibleRelease: document.querySelector('[data-current-release]')?.textContent?.trim(),
        runtime: globalThis.__GAOKAO_HOME_RUNTIME__,
        shell: globalThis.__GAOKAO_UI__,
        scripts: [...document.scripts].map(node => node.src).filter(Boolean),
        styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map(node => node.href),
        title: document.getElementById('homeTitle')?.textContent?.trim(),
        action: document.querySelector('#homePrimaryAction span')?.textContent?.trim(),
        actionHref: document.getElementById('homePrimaryAction')?.getAttribute('href'),
        homeUiRevision: document.body.dataset.homeUiRevision,
        homeLayout: document.querySelector('.shell')?.dataset.homeLayout,
        primaryActionCount: document.querySelectorAll('#homePrimaryAction').length,
        toolGroupCount: groups.length,
        openToolGroups: groups.filter(group => group.dataset.open === 'true').map(group => group.dataset.toolGroup),
        toolToggleCount: document.querySelectorAll('.tool-toggle').length,
        toolLinkCount: supportLinks.length,
        majorPathEntryCount: document.querySelectorAll('[data-home-major-path-entry]').length,
        majorPathTitle: majorPathEntry?.querySelector('strong')?.textContent?.trim(),
        majorPathHref: majorPathEntry?.getAttribute('href'),
        majorPathOrder: supportLinks.indexOf(majorPathEntry),
        scoreOrder: supportLinks.indexOf(document.querySelector('[data-score-equivalence-entry="home"]')),
        industryEntryCount: document.querySelectorAll('[data-home-industry-map-entry]').length,
        industryTitle: industryEntry?.querySelector('strong')?.textContent?.trim(),
        industryHref: industryEntry?.getAttribute('href'),
        industryOrder: supportLinks.indexOf(industryEntry),
        countdown: Number(document.getElementById('d2027')?.textContent || NaN),
        countdownParts: {
          days: Number(document.getElementById('d2027')?.textContent || NaN),
          hours: Number(document.getElementById('h2027')?.textContent || NaN),
          minutes: Number(document.getElementById('m2027')?.textContent || NaN),
          seconds: Number(document.getElementById('s2027')?.textContent || NaN)
        },
        countdownCellCount: document.querySelectorAll('[data-countdown-precision="second"] > div').length,
        countdownPrecision: document.querySelector('[data-countdown-precision]')?.dataset.countdownPrecision,
        nowText: document.getElementById('nowText')?.textContent?.trim(),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      };
    });

    assert.equal(state.bodyRelease, 'v3.9.90.3', `${device.name}: body release`);
    assert.equal(state.htmlRelease, 'v3.9.90.3', `${device.name}: html release`);
    assert.equal(state.bodyGeneration, 'v3990_3', `${device.name}: body generation`);
    assert.equal(state.htmlGeneration, 'v3990_3', `${device.name}: html generation`);
    assert.equal(state.visibleRelease, 'v3.9.90.3', `${device.name}: visible release`);
    assert.equal(state.runtime?.version, 'family-home-runtime-v3990_3-r031', `${device.name}: runtime`);
    assert.equal(state.runtime?.uiRevision, 'r031-home-redesign', `${device.name}: UI revision`);
    assert.equal(state.runtime?.generation, 'v3990_3', `${device.name}: runtime generation`);
    assert.equal(state.runtime?.release, 'v3.9.90.3', `${device.name}: runtime release`);
    assert.equal(state.homeUiRevision, 'r031-home-redesign', `${device.name}: body UI revision`);
    assert.equal(state.homeLayout, 'r031-home-redesign', `${device.name}: layout marker`);
    assert.equal(state.primaryActionCount, 1, `${device.name}: one primary action`);
    assert.equal(state.toolGroupCount, 4, `${device.name}: four grouped tool areas`);
    assert.equal(state.toolToggleCount, 4, `${device.name}: four explicit disclosure controls`);
    assert.deepEqual(state.openToolGroups, ['mainline'], `${device.name}: only mainline group open initially`);
    assert.equal(state.toolLinkCount, 8, `${device.name}: all existing tool links retained`);
    assert.match(state.runtime?.shellOwner || '', /family-shell\.v3990_3\.js$/);
    assert.match(state.runtime?.stateOwner || '', /family-decision-contract\.v3970_0\.js$/);
    assert.equal(state.shell?.version, 'family-shell-v3990_3', `${device.name}: shell owner`);
    assert.equal(state.shell?.generation, 'v3990_3', `${device.name}: shell generation`);
    assert.equal(state.shell?.release, 'v3.9.90.3', `${device.name}: shell release`);
    assert.equal(state.scripts.length, 1, `${device.name}: one bootstrap script`);
    assert.ok(state.scripts[0].includes('/ln-rank/js/ux/family-home.v3990_3.js?v=3990_3'), `${device.name}: current home script`);
    assert.ok(state.scripts.every(src => !/family-home\.v3972_5\.js\?v=3972_5/.test(src)), `${device.name}: retired home script`);
    assert.ok(state.styles.some(src => src.includes('/shared/ui/shell/family-shell.v3972_5.css?v=3972_5')), `${device.name}: stable shell CSS`);
    assert.ok(state.styles.some(src => src.includes('/shared/ui/components/family-plan-entry.v3972_5.css?v=3972_5')), `${device.name}: stable family entry CSS`);
    assert.match(state.title || '', /家庭方案/);
    assert.equal(state.action, '继续检查家庭方案');
    assert.equal(state.actionHref, '/ln-rank/selection-pool.html#family-review');
    assert.equal(state.majorPathEntryCount, 1, `${device.name}: one major path entry`);
    assert.equal(state.majorPathTitle, '专业升学地图', `${device.name}: major path title`);
    assert.equal(state.majorPathHref, '/major-path/', `${device.name}: major path route`);
    assert.ok(state.majorPathOrder >= 0 && state.majorPathOrder < state.scoreOrder, `${device.name}: major path follows primary major selection`);
    assert.ok(state.scoreOrder < state.industryOrder, `${device.name}: score history follows major path and precedes industry map`);
    assert.ok(state.industryOrder > state.scoreOrder, `${device.name}: industry map follows core professional understanding links`);
    assert.equal(state.industryEntryCount, 1, `${device.name}: one industry map entry`);
    assert.equal(state.industryTitle, '全国上市公司产业落地图', `${device.name}: industry map title`);
    assert.equal(state.industryHref, '/Public_company/', `${device.name}: industry map route`);
    assert.ok(Number.isFinite(state.countdown) && state.countdown >= 0, `${device.name}: countdown`);
    assert.equal(state.countdownCellCount, 4, `${device.name}: four countdown cells`);
    assert.equal(state.countdownPrecision, 'second', `${device.name}: second precision marker`);
    assert.equal(state.runtime?.countdownPrecision, 'second', `${device.name}: runtime second precision`);
    assert.equal(state.runtime?.countdownIntervalMs, 1000, `${device.name}: one-second cadence`);
    assert.equal(state.countdownParts.hours >= 0 && state.countdownParts.hours <= 23, true, `${device.name}: hour range`);
    assert.equal(state.countdownParts.minutes >= 0 && state.countdownParts.minutes <= 59, true, `${device.name}: minute range`);
    assert.equal(state.countdownParts.seconds >= 0 && state.countdownParts.seconds <= 59, true, `${device.name}: second range`);
    assert.match(state.nowText || '', /\d{2}:\d{2}:\d{2}/, `${device.name}: Beijing clock includes seconds`);

    const beforeTotal = state.countdownParts.days * 86400 + state.countdownParts.hours * 3600 + state.countdownParts.minutes * 60 + state.countdownParts.seconds;
    await page.waitForTimeout(1150);
    const afterParts = await page.evaluate(() => ({
      days: Number(document.getElementById('d2027')?.textContent || NaN),
      hours: Number(document.getElementById('h2027')?.textContent || NaN),
      minutes: Number(document.getElementById('m2027')?.textContent || NaN),
      seconds: Number(document.getElementById('s2027')?.textContent || NaN),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    const afterTotal = afterParts.days * 86400 + afterParts.hours * 3600 + afterParts.minutes * 60 + afterParts.seconds;
    assert.ok(afterTotal < beforeTotal && beforeTotal - afterTotal <= 2, `${device.name}: countdown advances by second (${beforeTotal} -> ${afterTotal})`);
    assert.ok(afterParts.scrollWidth <= afterParts.clientWidth + 1, `${device.name}: no overflow after second tick`);
    assert.ok(state.scrollWidth <= state.clientWidth + 1, `${device.name}: horizontal overflow ${state.scrollWidth}/${state.clientWidth}`);
    assert.equal(errors.length, 0, `${device.name}: ${errors.join(' | ')}`);

    const screenshot = path.join(artifactDir, `${device.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    const understandToggle = page.locator('[data-tool-group="understand"] > .tool-toggle');
    await understandToggle.scrollIntoViewIfNeeded();
    const scrollBeforeDisclosure = await page.evaluate(() => window.scrollY);
    await understandToggle.click();
    await page.waitForTimeout(50);
    const disclosureState = await page.evaluate(() => ({
      scrollY: window.scrollY,
      groupOpen: document.querySelector('[data-tool-group="understand"]')?.dataset.open,
      expanded: document.querySelector('[data-tool-group="understand"] > .tool-toggle')?.getAttribute('aria-expanded'),
      panelHidden: document.getElementById('tool-panel-understand')?.hidden
    }));
    assert.equal(disclosureState.groupOpen, 'true', `${device.name}: understand group expands before navigation`);
    assert.equal(disclosureState.expanded, 'true', `${device.name}: understand button announces expansion`);
    assert.equal(disclosureState.panelHidden, false, `${device.name}: understand panel becomes visible`);
    assert.ok(Math.abs(disclosureState.scrollY - scrollBeforeDisclosure) <= 2, `${device.name}: disclosure preserves scroll position`);
    await Promise.all([
      page.waitForURL(url => url.pathname === '/major-path/' || url.pathname === '/major-path/index.html'),
      page.locator('[data-home-major-path-entry]').click()
    ]);
    await page.waitForSelector('[data-major-path-version="major-path-v0.05"]');
    assert.match(await page.title(), /专业升学地图/, `${device.name}: destination title`);
    assert.equal(errors.length, 0, `${device.name}: destination ${errors.join(' | ')}`);

    results.push({ device: device.name, ...state, screenshot, majorPathDestination: new URL(page.url()).pathname });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({
  ok: true,
  release: 'v3.9.90.3',
  generation: 'v3990_3',
  runtime: 'family-home-runtime-v3990_3-r031',
  uiRevision: 'r031-home-redesign',
  shell: 'family-shell-v3990_3',
  stableCss: ['family-shell.v3972_5.css', 'family-plan-entry.v3972_5.css'],
  devices: results
}, null, 2));
