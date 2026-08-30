import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const port = Number(process.env.MIN_SCORE_NAVIGATION_PORT || 8765);
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
  stdio: ['ignore', 'pipe', 'pipe']
});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${base}/major-path/`);
      if (response.ok) break;
    } catch {}
    await wait(100);
  }

  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {})
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await page.route('**/api/tongxue-summary*', route => {
      const requestUrl = new URL(route.request().url());
      const isMajor = requestUrl.searchParams.get('scope') === 'major';
      const payload = isMajor
        ? {
            ok: true,
            mode: 'major_reviews',
            scope: 'major',
            major: { code: '080601', name: '电气工程及其自动化', categoryName: '工学' },
            reviews: [{ content: '课程和项目体验示例。', createdAt: '2026-08-01', authorLabel: '同学甲' }],
            evidence: { sampleSize: 1 },
            source: { url: 'https://example.com', label: '测试来源' },
            fetchedAt: '2026-08-29T00:00:00Z'
          }
        : {
            ok: true,
            mode: 'ai_summary',
            scope: 'school',
            school: requestUrl.searchParams.get('school') || '吉林大学',
            summary: '学校公开体验示例：校园生活和学习资源各有特点，仍需结合校区、专业和正式资料继续核验。',
            schoolMeta: { province: '吉林省', city: '长春市', type: '综合类' },
            source: { url: 'https://example.com', label: '测试来源' },
            fetchedAt: '2026-08-29T00:00:00Z'
          };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
    });
    await page.route('**/api/ai/major-history*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        records: [{ id: 'demo-1', school: '辽宁大学', major: '电气工程及其自动化', standardMajorCode: '080601', score2026: 600, rank2026: 1000, score2025: 590, rank2025: 1200, score2024: 580, rank2024: 1400 }],
        summary: { schoolCount: 1, total: 1 },
        nextOffset: null,
        candidateScore: null,
        projectMode: 'all'
      })
    }));

    await page.goto(`${base}/major-path/?majorCode=080601&from=ln-rank&returnTo=%2Fln-rank%2F`, { waitUntil: 'networkidle' });
    await page.locator('[data-min-score-entry="major"] .min-score-entry__link').waitFor();
    const majorEntry = page.locator('[data-min-score-entry="major"] .min-score-entry__link');
    assert.match(await majorEntry.getAttribute('href'), /mode=major-all/);
    assert.match(await majorEntry.getAttribute('href'), /majorCode=080601/);
    assert.match(await majorEntry.getAttribute('href'), /focus=major-all/);
    assert.match(await majorEntry.getAttribute('href'), /#majorAllResultsPanel$/);

    await page.goto(`${base}/tongxue/?scope=major&majorCode=080601&major=${encodeURIComponent('电气工程及其自动化')}&returnTo=%2Fln-rank%2F`, { waitUntil: 'networkidle' });
    await page.locator('[data-min-score-entry="major"] .min-score-entry__link').waitFor();
    assert.equal(await page.locator('[data-min-score-entry="major"]').count(), 1);
    assert.match(await page.locator('[data-min-score-entry="major"] .min-score-entry__link').getAttribute('href'), /major-all/);
    assert.equal(await page.locator('body').evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, '390px viewport must not overflow horizontally');

    await page.goto(`${base}/tongxue/?school=${encodeURIComponent('吉林大学')}`, { waitUntil: 'networkidle' });
    await page.locator('[data-min-score-entry="school"] .min-score-entry__link').waitFor();
    const schoolEntry = page.locator('[data-min-score-entry="school"] .min-score-entry__link');
    assert.equal(await schoolEntry.innerText(), '查这所学校在辽宁各专业的最低分');
    assert.match(await schoolEntry.getAttribute('href'), /mode=school-all/);
    assert.match(await schoolEntry.getAttribute('href'), /school=%E5%90%89%E6%9E%97%E5%A4%A7%E5%AD%A6/);
    assert.match(await schoolEntry.getAttribute('href'), /focus=school-all/);
    assert.match(await schoolEntry.getAttribute('href'), /#schoolAllResultsPanel$/);

    await page.goto(`${base}/ln-rank/?mode=school-all&school=${encodeURIComponent('吉林大学')}&autoQuery=1&focus=school-all#schoolAllResultsPanel`, { waitUntil: 'domcontentloaded' });
    await page.locator('#schoolAllResultsPanel').waitFor();
    assert.equal(await page.locator('#schoolAllResultsPanel').evaluate(node => node.hidden), false);
    assert.equal(await page.locator('#schoolAllResultsPanel').getAttribute('data-min-score-handoff'), 'school-all');
    assert.match(await page.locator('#schoolAllContent').innerText(), /正在读取辽宁最低分记录/);
    assert.equal(await page.evaluate(() => document.querySelector('#schoolAllResultsPanel').getBoundingClientRect().top < 120), true);

    await page.goto(`${base}/ln-rank/?mode=major-all&majorKeyword=${encodeURIComponent('电气工程及其自动化')}&majorCode=080601&autoQuery=1&focus=major-all#majorAllResultsPanel`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#majorAllResultsPanel').evaluate(node => node.hidden), false);
    assert.equal(await page.locator('#majorAllResultsPanel').getAttribute('data-min-score-handoff'), 'major-all');
    assert.equal(await page.evaluate(() => document.querySelector('#majorAllResultsPanel').getBoundingClientRect().top < 120), true);
    await page.locator('.major-all-record').waitFor();
    assert.equal(await page.locator('.major-all-record').count(), 1);

    console.log(JSON.stringify({ ok: true, viewport: '390x844', journeys: ['major-path', 'tongxue-major', 'tongxue-school', 'ln-rank-major-auto-query'] }, null, 2));
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGTERM');
}
