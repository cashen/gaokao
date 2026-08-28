import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.HOME_RELEASE_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.V3970_HOME_ARTIFACT_DIR || '/tmp/v3990-0-home-browser';
fs.mkdirSync(artifactDir, { recursive: true });

const devices = [
  { name: 'android-360', width: 360, height: 800 },
  { name: 'android-390', width: 390, height: 844 },
  { name: 'ipad-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 }
];

const browser = await chromium.launch({ headless: true });
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
      globalThis.__GAOKAO_HOME_RUNTIME__?.version === 'family-home-runtime-v3990_1'
      && globalThis.__GAOKAO_UI__?.version === 'family-shell-v3990_1'
    );

    const state = await page.evaluate(() => {
      const majorPathEntry = document.querySelector('[data-home-major-path-entry]');
      const industryEntry = document.querySelector('[data-home-industry-map-entry]');
      const supportLinks = [...document.querySelectorAll('.grid .link')];
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
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      };
    });

    assert.equal(state.bodyRelease, 'v3.9.90.1', `${device.name}: body release`);
    assert.equal(state.htmlRelease, 'v3.9.90.1', `${device.name}: html release`);
    assert.equal(state.bodyGeneration, 'v3990_1', `${device.name}: body generation`);
    assert.equal(state.htmlGeneration, 'v3990_1', `${device.name}: html generation`);
    assert.equal(state.visibleRelease, 'v3.9.90.1', `${device.name}: visible release`);
    assert.equal(state.runtime?.version, 'family-home-runtime-v3990_1', `${device.name}: runtime`);
    assert.equal(state.runtime?.generation, 'v3990_1', `${device.name}: runtime generation`);
    assert.equal(state.runtime?.release, 'v3.9.90.1', `${device.name}: runtime release`);
    assert.match(state.runtime?.shellOwner || '', /family-shell\.v3990_1\.js$/);
    assert.match(state.runtime?.stateOwner || '', /family-decision-contract\.v3970_0\.js$/);
    assert.equal(state.shell?.version, 'family-shell-v3990_1', `${device.name}: shell owner`);
    assert.equal(state.shell?.generation, 'v3990_1', `${device.name}: shell generation`);
    assert.equal(state.shell?.release, 'v3.9.90.1', `${device.name}: shell release`);
    assert.equal(state.scripts.length, 1, `${device.name}: one bootstrap script`);
    assert.ok(state.scripts[0].includes('/ln-rank/js/ux/family-home.v3990_1.js?v=3990_1'), `${device.name}: current home script`);
    assert.ok(state.scripts.every(src => !/family-home\.v3972_5\.js\?v=3972_5/.test(src)), `${device.name}: retired home script`);
    assert.ok(state.styles.some(src => src.includes('/shared/ui/shell/family-shell.v3972_5.css?v=3972_5')), `${device.name}: stable shell CSS`);
    assert.ok(state.styles.some(src => src.includes('/shared/ui/components/family-plan-entry.v3972_5.css?v=3972_5')), `${device.name}: stable family entry CSS`);
    assert.match(state.title || '', /家庭方案/);
    assert.equal(state.action, '继续检查家庭方案');
    assert.equal(state.actionHref, '/ln-rank/selection-pool.html#family-review');
    assert.equal(state.majorPathEntryCount, 1, `${device.name}: one major path entry`);
    assert.equal(state.majorPathTitle, '专业升学地图', `${device.name}: major path title`);
    assert.equal(state.majorPathHref, '/major-path/', `${device.name}: major path route`);
    assert.equal(state.majorPathOrder, 1, `${device.name}: major path follows primary major selection`);
    assert.equal(state.scoreOrder, 2, `${device.name}: score history follows major path`);
    assert.ok(state.industryOrder > state.scoreOrder, `${device.name}: industry map follows core professional understanding links`);
    assert.equal(state.industryEntryCount, 1, `${device.name}: one industry map entry`);
    assert.equal(state.industryTitle, '全国上市公司产业落地图', `${device.name}: industry map title`);
    assert.equal(state.industryHref, '/Public_company/', `${device.name}: industry map route`);
    assert.ok(Number.isFinite(state.countdown) && state.countdown >= 0, `${device.name}: countdown`);
    assert.ok(state.scrollWidth <= state.clientWidth + 1, `${device.name}: horizontal overflow ${state.scrollWidth}/${state.clientWidth}`);
    assert.equal(errors.length, 0, `${device.name}: ${errors.join(' | ')}`);

    const screenshot = path.join(artifactDir, `${device.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    await Promise.all([
      page.waitForURL(url => url.pathname === '/major-path/' || url.pathname === '/major-path/index.html'),
      page.locator('[data-home-major-path-entry]').click()
    ]);
    await page.waitForSelector('[data-major-path-version="major-path-v0.01"]');
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
  release: 'v3.9.90.1',
  generation: 'v3990_1',
  runtime: 'family-home-runtime-v3990_1',
  shell: 'family-shell-v3990_1',
  stableCss: ['family-shell.v3972_5.css', 'family-plan-entry.v3972_5.css'],
  devices: results
}, null, 2));