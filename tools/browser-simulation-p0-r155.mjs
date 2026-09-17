import { strict as assert } from 'node:assert';
import { chromium } from 'playwright';

const school = '辽宁科技大学';
const records = [
  { id: 'ln-2026-0146-05', school, major: '冶金工程', majorCode2026: '05', standardMajorName: '冶金工程', standardMajorCode: '080404', score2026: 497, rank2026: 54846, score2025: 494, rank2025: 59521, score2024: 473, rank2024: 66025 },
  { id: 'ln-2026-0146-H1', school, major: '冶金工程(中外合作办学)', majorCode2026: 'H1', standardMajorName: '冶金工程', standardMajorCode: '080404', score2026: 427, rank2026: 87013, score2025: 448, rank2025: 82763, score2024: 437, rank2024: 83835 }
];
const directory = { schools: [{ officialName: school, province: '辽宁省', city: '鞍山市', level: '本科', searchNames: ['辽科大'] }] };

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 390, height: 844, name: 'android' }, { width: 768, height: 1024, name: 'pad' }, { width: 1280, height: 900, name: 'desktop' }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, userAgent: viewport.name === 'android' ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36' : undefined });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error));
    await page.route('**/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(directory) }));
    await page.route('**/api/simulation-rank**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rank: 60000, available: true }) }));
    await page.route('**/api/ai/major-history**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, records }) }));
    await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html', { waitUntil: 'domcontentloaded' });
    await page.locator('.volunteer-card').first().waitFor({ state: 'visible' });

    const bodyMetrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    assert.equal(bodyMetrics.scrollWidth, bodyMetrics.clientWidth, `${viewport.name}: page horizontally overflows`);

    const schoolInput = page.locator('[data-field="school"]').first();
    await schoolInput.fill(school);
    await page.locator('.candidate').filter({ hasText: school }).first().waitFor({ state: 'visible' });
    await page.locator('.candidate').filter({ hasText: school }).first().click();

    assert.equal(await page.locator('.input-helper').first().textContent(), `✓ 已确认学校：${school}。现在可以直接输入专业。`);
    assert.equal(await page.locator('.step-rail li').nth(0).locator('.step-copy small').textContent(), '已确认');

    const majorInput = page.locator('[data-field="majorCode"]').first();
    await majorInput.fill('冶金工程');
    await page.locator('.candidate').filter({ hasText: '冶金工程(中外合作办学)' }).waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('.candidate').count(), 2);
    assert.ok((await page.locator('.candidate').nth(0).textContent()).includes('招生代码'));
    assert.ok((await page.locator('.candidate').nth(1).textContent()).includes('招生代码'));

    await page.locator('.candidate').filter({ hasText: '冶金工程(中外合作办学)' }).click();
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers[0]);
    assert.equal(state.confirmedSchool, school);
    assert.equal(state.majorName, '冶金工程(中外合作办学)');
    assert.equal(state.majorCode, 'H1');
    assert.equal(state.majorRecordId, 'ln-2026-0146-H1');
    assert.equal(state.history.years[2026].score, 427);
    assert.equal(state.history.years[2025].score, 448);
    assert.equal(state.history.years[2024].score, 437);
    assert.equal(await page.locator('.history-cell').nth(1).locator('strong').textContent(), '448分 / 82,763位');
    assert.equal(await page.locator('.step-rail li').nth(1).locator('.step-copy small').textContent(), '已确认');
    assert.equal(await page.locator('.step-rail li').nth(2).locator('.step-copy small').textContent(), '随同一招生记录');

    await majorInput.fill('冶金工程');
    await page.locator('.candidate').filter({ hasText: '冶金工程' }).first().waitFor({ state: 'visible' });
    await page.locator('.candidate').filter({ hasText: '冶金工程' }).first().click();
    const ordinary = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers[0]);
    assert.equal(ordinary.majorCode, '05');
    assert.equal(ordinary.majorRecordId, 'ln-2026-0146-05');
    assert.equal(ordinary.history.years[2026].score, 497);
    assert.equal(ordinary.history.years[2025].score, 494);
    assert.equal(ordinary.history.years[2024].score, 473);

    const finalMetrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, cardWidth: document.querySelector('.volunteer-card')?.getBoundingClientRect().width || 0, viewport: window.innerWidth }));
    assert.equal(finalMetrics.scrollWidth, finalMetrics.clientWidth, `${viewport.name}: overflow after selecting record`);
    assert.ok(finalMetrics.cardWidth <= finalMetrics.viewport, `${viewport.name}: card is wider than viewport`);
    assert.equal(pageErrors.length, 0, `${viewport.name}: page errors ${pageErrors.map(e => e.message).join('; ')}`);

    await context.close();
  }
  console.log('simulation p0 r155 school-major-mobile browser contract: PASS');
} finally {
  await browser.close();
}
