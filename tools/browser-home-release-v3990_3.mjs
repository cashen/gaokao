import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.HOME_RELEASE_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3970_HOME_ARTIFACT_DIR || '/tmp/v3990-3-home-browser';
fs.mkdirSync(artifactDir, { recursive: true });
const devices = [
  { name: 'android-360', width: 360, height: 800 },
  { name: 'android-390', width: 390, height: 844 },
  { name: 'ipad-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 }
];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
const results = [];
try {
  for (const device of devices) {
    const context = await browser.newContext({ viewport: { width: device.width, height: device.height }, isMobile: device.width < 500 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
    await page.addInitScript(() => {
      localStorage.setItem('lnRank.selectionPool.candidateScore', '580');
      localStorage.setItem('lnRank.selectionPool.lnPhysics.2026.v3951', JSON.stringify({ items: [{ id: 'home-test-1', school: '测试大学', major: '计算机科学与技术', displayLocation: '辽宁 · 沈阳', flags: [] }] }));
    });
    await page.goto(`${baseURL}/?home-release=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => globalThis.__GAOKAO_HOME_RUNTIME__?.version === 'family-home-runtime-v3990_3-r031' && globalThis.__GAOKAO_UI__?.version === 'family-shell-v3990_3');
    const state = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const mainline = [...document.querySelectorAll('[data-tool-group="mainline"] .tool-link')];
      const groups = [...document.querySelectorAll('[data-tool-group]')];
      const simulation = document.querySelector('[data-home-simulation-entry]');
      const major = document.querySelector('[data-tool-group="mainline"] a[href="/ln-rank/"]');
      const simulationBox = simulation?.getBoundingClientRect();
      const understand = document.querySelector('[data-tool-group="understand"] > .tool-toggle');
      return {
        bodyRelease: document.body.dataset.release,
        htmlRelease: document.documentElement.dataset.release,
        bodyGeneration: document.body.dataset.siteRuntimeGeneration,
        htmlGeneration: document.documentElement.dataset.siteRuntimeGeneration,
        visibleRelease: document.querySelector('[data-current-release]')?.textContent?.trim(),
        runtime: globalThis.__GAOKAO_HOME_RUNTIME__,
        homeUiRevision: document.body.dataset.homeUiRevision,
        informationArchitectureRevision: document.body.dataset.homeInformationArchitectureRevision,
        actionSectionCount: document.querySelectorAll('.action-section').length,
        sectionIndexCount: document.querySelectorAll('.section-index').length,
        oldActionCopy: bodyText.includes('现在先做什么'),
        heroSimulationEntryCount: document.querySelectorAll('.hero-primary [data-home-simulation-entry], #homeSimulationAction').length,
        primaryActionCount: document.querySelectorAll('#homePrimaryAction').length,
        toolGroupCount: groups.length,
        toolToggleCount: document.querySelectorAll('.tool-toggle').length,
        openToolGroups: groups.filter(group => group.dataset.open === 'true').map(group => group.dataset.toolGroup),
        toolLinkCount: document.querySelectorAll('.tool-groups .tool-link').length,
        mainlineLinkCount: mainline.length,
        mainlineTitles: mainline.map(link => link.querySelector('strong')?.textContent?.trim()),
        majorSelectionOrder: mainline.indexOf(major),
        simulationEntryCount: document.querySelectorAll('[data-home-simulation-entry]').length,
        simulationEntryTitle: simulation?.querySelector('strong')?.textContent?.trim(),
        simulationEntryHref: simulation?.getAttribute('href'),
        simulationEntryOrder: mainline.indexOf(simulation),
        simulationPointerEvents: simulation ? getComputedStyle(simulation).pointerEvents : null,
        simulationBox: simulationBox ? { width: simulationBox.width, height: simulationBox.height } : null,
        understandPointerEvents: understand ? getComputedStyle(understand).pointerEvents : null,
        majorPathEntryCount: document.querySelectorAll('[data-home-major-path-entry]').length,
        industryEntryCount: document.querySelectorAll('[data-home-industry-map-entry]').length,
        countdownParts: {
          days: Number(document.getElementById('d2027')?.textContent || NaN),
          hours: Number(document.getElementById('h2027')?.textContent || NaN),
          minutes: Number(document.getElementById('m2027')?.textContent || NaN),
          seconds: Number(document.getElementById('s2027')?.textContent || NaN)
        },
        countdownPrecision: document.querySelector('[data-countdown-precision]')?.dataset.countdownPrecision,
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
    assert.equal(state.runtime?.informationArchitectureVersion, 'home-information-architecture-v033', `${device.name}: IA version`);
    assert.equal(state.homeUiRevision, 'r031-home-redesign', `${device.name}: stable UI revision`);
    assert.equal(state.informationArchitectureRevision, 'r033-home-problem-entry', `${device.name}: IA revision`);
    assert.equal(state.actionSectionCount, 0, `${device.name}: retired action section`);
    assert.equal(state.sectionIndexCount, 0, `${device.name}: retired section numbering`);
    assert.equal(state.oldActionCopy, false, `${device.name}: retired action copy`);
    assert.equal(state.heroSimulationEntryCount, 0, `${device.name}: no hero simulation duplicate`);
    assert.equal(state.primaryActionCount, 1, `${device.name}: one hero primary action`);
    assert.equal(state.toolGroupCount, 4, `${device.name}: four tool groups`);
    assert.equal(state.toolToggleCount, 4, `${device.name}: four disclosure controls`);
    assert.deepEqual(state.openToolGroups, ['mainline'], `${device.name}: only mainline opens`);
    assert.equal(state.toolLinkCount, 8, `${device.name}: eight total tool links`);
    assert.equal(state.mainlineLinkCount, 2, `${device.name}: two mainline links`);
    assert.deepEqual(state.mainlineTitles, ['专业初选', '模拟志愿'], `${device.name}: mainline order`);
    assert.equal(state.majorSelectionOrder, 0, `${device.name}: major selection first`);
    assert.equal(state.simulationEntryCount, 1, `${device.name}: one simulation entry`);
    assert.equal(state.simulationEntryTitle, '模拟志愿', `${device.name}: simulation title`);
    assert.equal(state.simulationEntryHref, '/ln-rank/simulation-report.html', `${device.name}: simulation route`);
    assert.equal(state.simulationEntryOrder, 1, `${device.name}: simulation follows major selection`);
    assert.equal(state.simulationPointerEvents, 'auto', `${device.name}: simulation pointer events`);
    assert.ok(state.simulationBox && state.simulationBox.width > 0 && state.simulationBox.height > 0, `${device.name}: simulation has hit area`);
    assert.equal(state.understandPointerEvents, 'auto', `${device.name}: understand toggle pointer events`);
    assert.equal(state.majorPathEntryCount, 1, `${device.name}: one major path entry`);
    assert.equal(state.industryEntryCount, 1, `${device.name}: one industry entry`);
    assert.equal(state.countdownPrecision, 'second', `${device.name}: countdown precision`);
    assert.ok(Number.isFinite(state.countdownParts.days) && state.countdownParts.days >= 0, `${device.name}: countdown`);
    assert.ok(state.scrollWidth <= state.clientWidth + 1, `${device.name}: no horizontal overflow`);
    assert.equal(errors.length, 0, `${device.name}: ${errors.join(' | ')}`);

    const simulationLink = page.locator('[data-home-simulation-entry]');
    await simulationLink.scrollIntoViewIfNeeded();
    const simulationBox = await simulationLink.boundingBox();
    assert.ok(simulationBox, `${device.name}: simulation bounding box`);
    await page.mouse.click(simulationBox.x + simulationBox.width / 2, simulationBox.y + simulationBox.height / 2);
    await page.waitForURL(url => url.pathname === '/ln-rank/simulation-report.html', { timeout: 10000 });
    await page.goBack({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => location.pathname === '/' || location.pathname === '/index.html');

    const toggle = page.locator('[data-tool-group="understand"] > .tool-toggle');
    await toggle.scrollIntoViewIfNeeded();
    const toggleBox = await toggle.boundingBox();
    assert.ok(toggleBox, `${device.name}: understand toggle bounding box`);
    await page.mouse.click(toggleBox.x + toggleBox.width / 2, toggleBox.y + toggleBox.height / 2);
    await page.waitForFunction(() => document.querySelector('[data-tool-group="understand"]')?.dataset.open === 'true');
    assert.equal(await page.locator('#tool-panel-understand').getAttribute('hidden'), null, `${device.name}: understand panel opens by pointer`);
    const href = await page.locator('[data-home-major-path-entry]').getAttribute('href');
    assert.equal(href, '/major-path/', `${device.name}: major path route after touch-like interaction`);

    await page.screenshot({ path: path.join(artifactDir, `${device.name}.png`), fullPage: true });
    results.push({ device: device.name, ...state });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({ ok: true, release: 'v3.9.90.3', generation: 'v3990_3', runtime: 'family-home-runtime-v3990_3-r031', informationArchitecture: 'r033-home-problem-entry', devices: results }, null, 2));
