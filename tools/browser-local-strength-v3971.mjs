import { chromium } from 'playwright';

const BASE = process.env.LOCAL_STRENGTH_BASE || 'http://127.0.0.1:8788';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const browser = await chromium.launch({ headless: true });
const errors = [];

async function openPage(viewport, url = '/ln-rank/local-mainline.html?view=list_all', isMobile = false) {
  const page = await browser.newPage({ viewport, isMobile });
  page.on('console', message => { if (message.type() === 'error') errors.push(`${viewport.width}: ${message.text()}`); });
  page.on('pageerror', error => errors.push(`${viewport.width}: ${error.message}`));
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('body[data-local-strength-runtime="ready"]', { timeout: 30000 });
  return page;
}

try {
  const api = await fetch(`${BASE}/api/local-strength?mode=meta`).then(async response => {
    const data = await response.json();
    assert(response.ok && data.ok, `meta api failed: ${response.status} ${JSON.stringify(data)}`);
    return data;
  });
  assert(api.meta.completeEvaluation === true, 'local admission records were not fully evaluated');
  assert(api.meta.evaluatedRecordCount === api.meta.localAdmissionRecordCount, 'coverage totals mismatch');
  assert(api.meta.matchedRecordCount > 0, 'no LocalStrength records generated');
  assert(api.meta.duplicatePublicRecordCount === 0, 'duplicate public records detected');
  assert(api.schools.some(item => item.officialName === '辽宁科技大学'), '辽宁科技大学 missing from local school coverage');

  const list = await fetch(`${BASE}/api/local-strength?mode=list_all&page=1&pageSize=20`).then(response => response.json());
  assert(list.ok && list.page.total === api.meta.matchedRecordCount, 'list_all total does not equal full matched total');
  for (let i = 1; i < list.records.length; i += 1) {
    assert(Number(list.records[i - 1].score2026) >= Number(list.records[i].score2026), 'list_all score ordering is not descending');
  }

  const desktop = await openPage({ width: 1280, height: 800 });
  assert(await desktop.locator('.ls-record').count() === 20, 'desktop must render 20 records per page');
  assert((await desktop.locator('[data-stat-records]').textContent()).trim() !== '—', 'summary stats not rendered');
  await desktop.locator('[data-view="school"]').click();
  await desktop.locator('#schoolInput').fill('辽宁科技大学');
  await desktop.locator('#schoolSubmit').click();
  await desktop.waitForSelector('.ls-record, .ls-empty');
  const schoolBody = await desktop.locator('#records').innerText();
  assert(schoolBody.includes('辽宁科技大学') || schoolBody.includes('当前没有可公开'), '辽宁科技大学 result context missing');
  await desktop.locator('[data-view="score"]').click();
  assert((await desktop.locator('#resultsTitle').innerText()) === '按分数位置查看', 'score idle title leaked from list_all');
  assert(await desktop.locator('.ls-empty').count() === 0, 'score idle state must not render a large error card');
  await desktop.locator('#scoreInput').fill('579');
  await desktop.locator('#scoreSubmit').click();
  await desktop.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.includes('560—589'));
  assert((await desktop.locator('#resultsTitle').innerText()).includes('560—589'), '579 score did not map to the correct band');
  const desktopBandGeometry = await desktop.locator('#scoreBandButtons').evaluate(root => ({
    overflow: root.scrollWidth > root.clientWidth + 1,
    columns: new Set([...root.children].map(node => Math.round(node.getBoundingClientRect().left))).size,
    count: root.children.length
  }));
  assert(!desktopBandGeometry.overflow && desktopBandGeometry.count === 8, 'desktop score bands are incomplete or overflow');

  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    const page = await openPage(viewport, '/ln-rank/local-mainline.html?view=score', true);
    const initial = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      title: document.querySelector('#resultsTitle')?.textContent,
      emptyCount: document.querySelectorAll('.ls-empty').length,
      filterHidden: document.querySelector('[data-filter-shell]')?.hidden,
      workspaceTop: document.querySelector('.ls-workspace')?.getBoundingClientRect().top,
      summaryTop: document.querySelector('.ls-summary')?.getBoundingClientRect().top,
      tabTexts: [...document.querySelectorAll('.ls-view-tab')].map(node => node.innerText.trim())
    }));
    assert(initial.scrollWidth <= initial.clientWidth + 1, `${viewport.width}px page horizontal overflow`);
    assert(initial.title === '按分数位置查看', `${viewport.width}px wrong score idle title`);
    assert(initial.emptyCount === 0, `${viewport.width}px shows duplicate empty/error card before input`);
    assert(initial.filterHidden === true, `${viewport.width}px filters appear before a score result exists`);
    assert(initial.workspaceTop < initial.summaryTop, `${viewport.width}px statistics still block the primary task`);
    assert(initial.tabTexts.join('|') === '按分数|按学校|全部目录', `${viewport.width}px mobile tab labels are not compact`);

    await page.locator('#scoreBandDisclosure').evaluate(node => { node.open = true; });
    const bands = await page.locator('#scoreBandButtons').evaluate(root => {
      const buttons = [...root.querySelectorAll('button')];
      const rootRect = root.getBoundingClientRect();
      return {
        count: buttons.length,
        overflow: root.scrollWidth > root.clientWidth + 1,
        clipped: buttons.some(button => {
          const rect = button.getBoundingClientRect();
          return rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1;
        }),
        columns: new Set(buttons.map(button => Math.round(button.getBoundingClientRect().left))).size,
        rows: new Set(buttons.map(button => Math.round(button.getBoundingClientRect().top))).size,
        labels: buttons.map(button => button.textContent.trim())
      };
    });
    assert(bands.count === 8, `${viewport.width}px does not show all eight score bands`);
    assert(!bands.overflow && !bands.clipped, `${viewport.width}px score bands still require horizontal scrolling`);
    assert(bands.columns === 2 && bands.rows === 4, `${viewport.width}px score bands are not a two-column four-row grid`);
    assert(bands.labels.every(label => label.length >= 6), `${viewport.width}px score band label is truncated`);

    await page.locator('[data-score-band="560-589"]').click();
    await page.waitForFunction(() => document.querySelector('#resultsTitle')?.textContent?.includes('560—589'));
    assert(await page.locator('[data-score-band="560-589"]').getAttribute('aria-pressed') === 'true', `${viewport.width}px selected score band state missing`);
    assert((await page.locator('#scoreContext').innerText()).includes('560—589'), `${viewport.width}px current score context missing`);
    assert(await page.locator('.ls-record').count() <= 10, `${viewport.width}px mobile page size exceeds 10`);
    const mobilePagination = await page.locator('#pagination').evaluate(root => root.children.length ? ({
      rows: new Set([...root.children].map(node => Math.round(node.getBoundingClientRect().top))).size,
      text: root.innerText
    }) : ({ rows: 0, text: '' }));
    if (mobilePagination.rows) {
      assert(mobilePagination.rows === 1, `${viewport.width}px pagination wrapped to multiple rows`);
      assert(mobilePagination.text.includes('第 ') && mobilePagination.text.includes(' 页'), `${viewport.width}px simplified page status missing`);
    }
    await page.close();
  }

  for (const viewport of [{ width: 768, height: 1024 }, { width: 820, height: 1180 }, { width: 1024, height: 768 }]) {
    const page = await openPage(viewport, '/ln-rank/local-mainline.html?view=score&score=579');
    const geometry = await page.locator('#scoreBandButtons').evaluate(root => ({
      overflow: root.scrollWidth > root.clientWidth + 1,
      count: root.children.length,
      columns: new Set([...root.children].map(node => Math.round(node.getBoundingClientRect().left))).size,
      rows: new Set([...root.children].map(node => Math.round(node.getBoundingClientRect().top))).size
    }));
    assert(!geometry.overflow && geometry.count === 8, `${viewport.width}px Pad score bands incomplete or overflow`);
    assert(geometry.columns === 4 && geometry.rows === 2, `${viewport.width}px Pad score bands are not four columns by two rows`);
    assert(await page.locator('.ls-record').count() <= (viewport.width < 1024 ? 15 : 20), `${viewport.width}px page size mismatch`);
    await page.close();
  }

  const isolation = await openPage({ width: 390, height: 844 }, '/ln-rank/local-mainline.html?view=list_all&q=自动化&minScore=500&city=沈阳', true);
  await isolation.locator('[data-view="school"]').click();
  const isolatedUrl = new URL(isolation.url());
  assert(!isolatedUrl.searchParams.has('q') && !isolatedUrl.searchParams.has('minScore'), 'list-only filters leak into school mode URL');
  assert(isolatedUrl.searchParams.get('city') === '沈阳', 'common city filter should remain explicit across modes');
  await isolation.close();

  assert(errors.length === 0, `browser console errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({
    ok: true,
    release: 'v3.9.71.1',
    meta: api.meta,
    viewports: ['360x800','390x844','430x932','768x1024','820x1180','1024x768','1280x800'],
    checks: ['score-band-grid','idle-context','filter-timing','mode-isolation','mobile-pagination','responsive-page-size','no-overflow']
  }, null, 2));
} finally {
  await browser.close();
}