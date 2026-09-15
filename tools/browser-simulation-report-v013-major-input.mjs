import { chromium } from 'playwright';

const seedState = (id) => ({
  version: 2,
  studentName: '',
  subjectTrack: '辽宁物理类（物化生）',
  totalScore: '555',
  rank: 29685,
  volunteers: [{
    id,
    order: 1,
    school: '辽宁科技大学',
    majorCode: '',
    majorName: '',
    history: null,
    manualCheck: {},
    familyStatus: '待讨论',
    familyNote: ''
  }]
});

async function testViewport(viewport, label) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  await context.addInitScript((state) => localStorage.setItem('gaokao:simulation-report:v002', JSON.stringify(state)), seedState(`${label}-1`));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/api/ai/major-history**', async route => {
    const url = new URL(route.request().url());
    const major = url.searchParams.get('major') || '';
    const school = url.searchParams.get('schoolKeyword') || '';
    const matched = major === '测控技术与仪器' && school.includes('辽宁科技大学');
    const record = {
      id: 'mock-080301-lnkjdx',
      school: '辽宁科技大学',
      major: '测控技术与仪器',
      score2026: 493,
      rank2026: 56659,
      score2025: 491,
      rank2025: 61050,
      score2024: 476,
      rank2024: 64544,
      standardMajorCode: '080301',
      standardMajorName: '测控技术与仪器'
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, records: matched ? [record] : [], total: matched ? 1 : 0, summary: { total: matched ? 1 : 0 }, complete: true, dataYear: 2026 })
    });
  });

  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('.volunteer-card', { timeout: 15000 });
  const card = page.locator('.volunteer-card').first();
  const input = card.locator('[data-field="majorCode"]');
  await input.waitFor({ state: 'visible' });
  if ((await input.getAttribute('placeholder')) !== '输入专业名称或代码') throw new Error(`${label}: major placeholder not updated`);

  await input.fill('测空技术与仪器');
  await page.waitForSelector('.major-input-suggestions .major-suggestion', { timeout: 5000 });
  if (!(await card.getByText('测控技术与仪器', { exact: true }).count())) throw new Error(`${label}: typo correction suggestion missing`);
  await card.getByRole('button', { name: /测控技术与仪器/ }).click();
  await page.waitForFunction(() => document.querySelector('[data-field="majorCode"]')?.value === '080301', null, { timeout: 5000 });
  await page.waitForSelector('.state-line.complete', { timeout: 5000 });
  if (!(await card.locator('.major-caption').innerText()).includes('测控技术与仪器')) throw new Error(`${label}: canonical major caption missing`);
  if (!(await card.locator('.state-line').innerText()).includes('已找到该校相关招生记录')) throw new Error(`${label}: school-major match status missing`);

  const storedHistory = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002'))?.volunteers?.[0]?.history);
  if (storedHistory?.years?.[2026]?.rank !== 56659 || storedHistory?.years?.[2025]?.rank !== 61050 || storedHistory?.years?.[2024]?.rank !== 64544) throw new Error(`${label}: matched history was not persisted`);

  await input.fill('临床医学');
  await page.waitForTimeout(700);
  await page.waitForFunction(() => document.querySelector('.state-line')?.innerText.includes('暂未找到'), null, { timeout: 5000 });
  const mismatchText = await card.locator('.state-line').innerText();
  if (!mismatchText.includes('辽宁科技大学') || !mismatchText.includes('临床医学')) throw new Error(`${label}: mismatch explanation incomplete: ${mismatchText}`);
  const storedAfterMismatch = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002'))?.volunteers?.[0]);
  if (storedAfterMismatch?.majorCode !== '临床医学') throw new Error(`${label}: user input should remain editable after mismatch`);
  if (storedAfterMismatch?.majorName !== '临床医学') throw new Error(`${label}: recognized major should be retained after mismatch`);

  await input.fill('计算机');
  await page.waitForSelector('.major-input-suggestions .major-suggestion', { timeout: 5000 });
  if ((await card.locator('.major-input-suggestions .major-suggestion').count()) < 2) throw new Error(`${label}: broad query should show multiple candidates`);

  const boxes = await card.locator('.major-input-suggestions .major-suggestion').evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect();
    return { width: r.width, height: r.height };
  }));
  if (boxes.some(box => box.width < 180 || box.height < 42)) throw new Error(`${label}: suggestion target too small`);
  if (errors.length) throw new Error(`${label}: browser errors: ${errors.join(' | ')}`);

  await context.close();
  await browser.close();
}

await testViewport({ width: 1280, height: 900 }, 'desktop');
await testViewport({ width: 390, height: 844 }, 'mobile');
console.log('simulation-report-v013-major-input: PASS');
