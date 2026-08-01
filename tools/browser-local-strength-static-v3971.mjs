import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.LOCAL_STRENGTH_BASE || 'http://127.0.0.1:8789';
const INDEX = JSON.parse(fs.readFileSync('ln-rank/data/local-strength/local-strength-index.v3971_2.json', 'utf8'));
const RANK = JSON.parse(fs.readFileSync('fenxi/data/rank_2026_physics.json', 'utf8'));
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

function numeric(text) {
  return Number(String(text || '').replace(/[^0-9.-]/g, ''));
}

const browser = await chromium.launch({ headless: true });
const report = [];
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const apiCalls = [];
    const requests = [];
    const failures = [];
    page.on('request', request => {
      requests.push(request.url());
      if (request.url().includes('/api/')) apiCalls.push(request.url());
    });
    page.on('requestfailed', request => failures.push(`${request.url()} ${request.failure()?.errorText || ''}`));
    await page.goto(`${BASE}/ln-rank/local-mainline.html?view=score`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.body.dataset.localStrengthRuntime === 'ready');

    const summary = await page.locator('[data-summary-compact]').textContent();
    assert(summary.includes(String(expected.localAdmissionSchoolCount)) && summary.includes(String(expected.matchedSchoolCount)) && summary.includes(String(expected.matchedRecordCount)), `${viewport.name}: summary counts`);
    assert(apiCalls.length === 0, `${viewport.name}: unexpected API calls ${apiCalls.join(',')}`);
    assert(requests.some(url => url.includes('/fenxi/data/rank_2026_physics.json?v=3972_3')), `${viewport.name}: static rank map request missing`);
    assert(failures.length === 0, `${viewport.name}: request failures ${failures.join(',')}`);

    const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(bodyOverflow <= 1, `${viewport.name}: body horizontal overflow ${bodyOverflow}`);

    if (viewport.width <= 767) await page.locator('#scoreBandDisclosure > summary').click();
    const chips = page.locator('#scoreBandButtons .ls-chip');
    assert(await chips.count() === 8, `${viewport.name}: score band count`);
    const texts = await chips.allTextContents();
    assert(texts.some(text => text.includes('650分及以上')) && texts.some(text => text.includes('本科线—469分')), `${viewport.name}: complete score labels`);
    assert(texts.every(text => /条\s*·\s*\d+校/.test(text)), `${viewport.name}: score band metrics`);
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

    await page.locator('#scoreInput').fill('530');
    await page.locator('#scoreSubmit').click();
    await page.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.includes('530分附近'));
    const activeBandText = await page.locator('#scoreBandButtons .ls-chip.is-active').textContent();
    assert(activeBandText.includes('530—559分'), `${viewport.name}: active 530 band`);
    assert((await page.locator('#scoreContext').textContent()).includes('40,119'), `${viewport.name}: candidate rank 530`);
    assert(await page.locator('#scorePositionGroups').isVisible(), `${viewport.name}: position groups visible`);
    assert(await page.locator('#scorePositionGroups [data-position-group]').count() === 4, `${viewport.name}: four position groups`);
    assert(await page.locator('#scorePositionGroups [data-position-group="near"]').getAttribute('aria-pressed') === 'true', `${viewport.name}: near group default`);
    assert((await page.locator('.ls-record').count()) > 0, `${viewport.name}: score results`);

    const visibleRanks = await page.locator('.ls-record .ls-position span:nth-child(2) b').allTextContents();
    const candidateRank = Number(RANK['530']);
    const distances = visibleRanks.map(text => Math.abs(numeric(text) - candidateRank));
    assert(distances.every((value, index) => index === 0 || distances[index - 1] <= value), `${viewport.name}: exact score must be rank-distance ordered`);
    assert(distances[0] < Math.abs(Number(RANK['559']) - candidateRank), `${viewport.name}: exact 530 must not start from 559 band ceiling`);

    const expectedUpperDistance = Math.min(...INDEX.records.filter(record => Number(record.rank2026) < candidateRank).map(record => candidateRank - Number(record.rank2026)));
    const expectedLowerDistance = Math.min(...INDEX.records.filter(record => Number(record.rank2026) > candidateRank).map(record => Number(record.rank2026) - candidateRank));
    await page.locator('#scorePositionGroups [data-position-group="upper"]').click();
    await page.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.includes('冲一冲'));
    const upperRanks = (await page.locator('.ls-record .ls-position span:nth-child(2) b').allTextContents()).map(numeric);
    assert(upperRanks.length > 0 && upperRanks.every(value => value < candidateRank), `${viewport.name}: upper side rank direction`);
    assert(candidateRank - upperRanks[0] === expectedUpperDistance, `${viewport.name}: upper side must start from closest record`);
    await page.locator('#scorePositionGroups [data-position-group="lower"]').click();
    await page.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.includes('稳一稳'));
    const lowerRanks = (await page.locator('.ls-record .ls-position span:nth-child(2) b').allTextContents()).map(numeric);
    assert(lowerRanks.length > 0 && lowerRanks.every(value => value > candidateRank), `${viewport.name}: lower side rank direction`);
    assert(lowerRanks[0] - candidateRank === expectedLowerDistance, `${viewport.name}: lower side must start from closest record`);
    await page.locator('#scorePositionGroups [data-position-group="band"]').click();
    await page.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.startsWith('530—559分'));
    assert((await page.locator('#resultsMeta').textContent()).includes('共 43 条'), `${viewport.name}: explicit 530-559 band total`);
    assert(new URL(page.url()).searchParams.get('group') === 'band', `${viewport.name}: band group URL`);
    await page.locator('#scorePositionGroups [data-position-group="near"]').click();
    await page.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.includes('530分附近'));

    if (viewport.name === 'android-390' || viewport.name === 'desktop-1280') {
      await page.goto(`${BASE}/ln-rank/local-mainline.html?band=530-559`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.body.dataset.localStrengthRuntime === 'ready');
      await page.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.startsWith('530—559分'));
      assert(await page.locator('[data-view="score"]').getAttribute('aria-selected') === 'true', `${viewport.name}: direct band URL opens score view`);

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
      await page.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.includes('579分附近'));
      assert((await page.locator('#scoreContext').textContent()).includes('21,051'), `${viewport.name}: candidate rank 579`);
      assert((await page.locator('.ls-record').count()) > 0, `${viewport.name}: hidden list keyword must not pollute score mode`);
    }

    report.push({ ...viewport, scoreGrid, apiCalls: apiCalls.length, bodyOverflow, exact530FirstDistance: distances[0] });
    await page.close();
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
