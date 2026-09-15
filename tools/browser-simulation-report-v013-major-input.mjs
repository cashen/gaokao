import { chromium } from 'playwright';

const schoolRows = [{ name: '辽宁科技大学', province: '辽宁省', city: '鞍山市' }];
const seedState = (id) => ({ version: 2, studentName: '', subjectTrack: '辽宁物理类（物化生）', totalScore: '555', rank: 29685, volunteers: [{ id, order: 1, school: '辽宁科技大学', majorCode: '', majorName: '', history: null, manualCheck: {}, familyStatus: '待讨论', familyNote: '' }] });

async function typeInput(locator, value) {
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 20 });
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function testViewport(viewport, label) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  await context.addInitScript(state => {
    const key = 'gaokao:simulation-report:v002';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, seedState(`${label}-1`));
  const page = await context.newPage();
  const errors = [];
  const requestFailures = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('requestfailed', r => requestFailures.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText || 'failed'}`));
  await page.route('**/tongxue/data/school-search-index.20260617-v150.json', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ buildId: 'tongxue-v150-region-20260617', asOfDate: '2026-06-17', count: schoolRows.length, schools: schoolRows }) }));
  await page.route('**/api/ai/major-history**', async route => {
    const url = new URL(route.request().url());
    const major = url.searchParams.get('major') || '';
    const school = url.searchParams.get('schoolKeyword') || '';
    const rows = [{ school: '辽宁科技大学', major: '测控技术与仪器', standardMajorName: '测控技术与仪器', majorCode2026: '080301', standardMajorCode: '080301' }];
    let records = [];
    if (school === '辽宁科技大学' && /测控/.test(major)) records = rows;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, records, total: records.length, complete: true, dataYear: 2026, summary: { total: records.length } }) });
  });
  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('.volunteer-card', { timeout: 15000 });
  const card = page.locator('.volunteer-card').first();
  const major = card.locator('[data-field="majorCode"]');
  if ((await major.getAttribute('placeholder')) !== '输入专业代码，如080301') throw new Error(`${label}: current placeholder mismatch`);
  await card.locator('[data-field="school"]').fill('辽宁科技大学');
  await page.waitForFunction(() => document.querySelector('[data-v014-helper]')?.textContent.includes('已识别学校'), null, { timeout: 30000 });
  await typeInput(major, '测空技术与仪器');
  await page.waitForSelector('.major-input-suggestions .major-suggestion', { timeout: 15000 });
  if (!(await card.getByRole('button', { name: /测控技术与仪器/ }).count())) throw new Error(`${label}: typo suggestion missing`);
  if ((await major.inputValue()) !== '测空技术与仪器') throw new Error(`${label}: typo was auto-corrected without confirmation`);
  await card.getByRole('button', { name: /测控技术与仪器/ }).click();
  await page.waitForFunction(() => document.querySelector('[data-field="majorCode"]')?.value === '080301', null, { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('[data-v014-helper]')?.textContent.includes('找到该校'), null, { timeout: 20000 });
  if ((await major.inputValue()) !== '080301') throw new Error(`${label}: confirmed major code not persisted in field`);
  await typeInput(major, '计算机');
  await page.waitForSelector('.major-input-suggestions .major-suggestion', { timeout: 15000 }).catch(() => {});
  if ((await major.inputValue()) !== '计算机') throw new Error(`${label}: broad input was auto-mapped`);
  if (errors.length) throw new Error(`${label}: browser errors: ${errors.join(' | ')}`);
  if (requestFailures.length) throw new Error(`${label}: request failures: ${requestFailures.join(' | ')}`);
  await context.close();
  await browser.close();
}

await testViewport({ width: 1280, height: 900 }, 'desktop');
await testViewport({ width: 390, height: 844 }, 'mobile');
console.log('simulation-report-v013-major-input compatibility browser: PASS');
