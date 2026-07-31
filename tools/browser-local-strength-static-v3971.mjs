import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.LOCAL_STRENGTH_BASE || 'http://127.0.0.1:8789';
const INDEX = JSON.parse(fs.readFileSync('ln-rank/data/local-strength/local-strength-index.v3971_2.json', 'utf8'));
const expected = INDEX.meta;
const viewports = [
  { name: 'android-360', width: 360, height: 800, columns: 2 },
  { name: 'android-390', width: 390, height: 844, columns: 2 },
  { name: 'android-430', width: 430, height: 932, columns: 2 },
  { name: 'pad-768', width: 768, height: 1024, columns: 4 },
  { name: 'pad-820', width: 820, height: 1180, columns: 4 },
  { name: 'pad-landscape-1024', width: 1024, height: 768, columns: 4 },
  { name: 'desktop-1280', width: 1280, height: 800, columns: 8 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const report = [];
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const apiCalls = [];
    const failures = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) apiCalls.push(request.url());
    });
    page.on('requestfailed', request => failures.push(`${request.url()} ${request.failure()?.errorText || ''}`));
    await page.goto(`${BASE}/ln-rank/local-mainline.html?view=score`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.body.dataset.localStrengthRuntime === 'ready');

    const summary = await page.locator('[data-summary-compact]').textContent();
    assert(summary.includes(String(expected.localAdmissionSchoolCount)) && summary.includes(String(expected.matchedSchoolCount)) && summary.includes(String(expected.matchedRecordCount)), `${viewport.name}: summary counts`);
    assert(apiCalls.length === 0, `${viewport.name}: unexpected API calls ${apiCalls.join(',')}`);
    assert(failures.length === 0, `${viewport.name}: request failures ${failures.join(',')}`);

    const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(bodyOverflow <= 1, `${viewport.name}: body horizontal overflow ${bodyOverflow}`);

    if (viewport.width <= 767) await page.locator('#scoreBandDisclosure > summary').click();
    const chips = page.locator('#scoreBandButtons .ls-chip');
    assert(await chips.count() === 8, `${viewport.name}: score band count`);
    const texts = await chips.allTextContents();
    assert(texts.includes('650分及以上') && texts.includes('本科线—469分'), `${viewport.name}: complete score labels`);
    const scoreGrid = await page.locator('#scoreBandButtons').evaluate(element => {
      const style = getComputedStyle(element);
      return {
        columns: style.gridTemplateColumns.split(' ').filter(Boolean).length,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        overflowX: style.overflowX
      };
    });
    assert(scoreGrid.columns === viewport.columns, `${viewport.name}: expected ${viewport.columns} score columns, got ${scoreGrid.columns}`);
    assert(scoreGrid.scrollWidth <= scoreGrid.clientWidth + 1, `${viewport.name}: score grid scroll overflow`);
    assert(!['auto', 'scroll'].includes(scoreGrid.overflowX), `${viewport.name}: score grid scroll mode`);

    await page.locator('#scoreInput').fill('579');
    await page.locator('#scoreSubmit').click();
    await page.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.includes('560—589分'));
    assert(await page.locator('#scoreBandButtons .ls-chip.is-active').textContent() === '560—589分', `${viewport.name}: active 579 band`);
    assert((await page.locator('.ls-record').count()) > 0, `${viewport.name}: score results`);

    if (viewport.name === 'android-390' || viewport.name === 'desktop-1280') {
      await page.locator('[data-view="school"]').click();
      assert((await page.locator('#resultsTitle').textContent()).includes('按学校查询'), `${viewport.name}: school idle title`);
      await page.locator('#schoolInput').fill('辽宁科技大学');
      await page.locator('#schoolSubmit').click();
      await page.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.includes('辽宁科技大学'));
      assert(await page.locator('.ls-record').count() === 6, `${viewport.name}: 辽宁科技大学 six records`);

      await page.locator('[data-view="list_all"]').click();
      await page.waitForFunction(count => document.querySelector('#resultsMeta')?.textContent?.includes(`共 ${count} 条`), expected.matchedRecordCount);
      const next = page.locator('#pagination button').filter({ hasText: '下一页' });
      await next.click();
      await page.waitForFunction(() => new URL(location.href).searchParams.get('page') === '2');
      assert((await page.locator('.ls-record').count()) > 0, `${viewport.name}: static page two records`);
      assert(apiCalls.length === 0, `${viewport.name}: pagination must not call API`);

      await page.locator('#queryInput').fill('自动化');
      await page.locator('#querySubmit').click();
      await page.locator('[data-view="score"]').click();
      await page.locator('#scoreInput').fill('579');
      await page.locator('#scoreSubmit').click();
      await page.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.includes('560—589分'));
      assert((await page.locator('.ls-record').count()) > 0, `${viewport.name}: hidden list keyword must not pollute score mode`);
    }

    report.push({ ...viewport, scoreGrid, apiCalls: apiCalls.length, bodyOverflow });
    await page.close();
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
