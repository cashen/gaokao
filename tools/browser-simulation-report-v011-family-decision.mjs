import { chromium } from 'playwright';

const seedState = (id = 'family-decision-test-1') => ({
  version: 2,
  studentName: '',
  subjectTrack: '辽宁物理类（物化生）',
  totalScore: '555',
  rank: 29685,
  volunteers: [{
    id,
    order: 1,
    school: '辽宁科技大学',
    majorCode: '080301',
    majorName: '测控技术与仪器',
    history: { years: {
      2026: { score: 493, rank: 56659, comparable: true, recordStatus: 'primary-record' },
      2025: { score: 491, rank: 61050, comparable: true, recordStatus: 'primary-record' },
      2024: { score: 476, rank: 64544, comparable: true, recordStatus: 'primary-record' }
    } },
    manualCheck: {},
    familyStatus: '待讨论',
    familyNote: ''
  }]
});

async function testViewport(viewport, label) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  await context.addInitScript((state) => {
    if (!localStorage.getItem('gaokao:simulation-report:v002')) {
      localStorage.setItem('gaokao:simulation-report:v002', JSON.stringify(state));
    }
  }, seedState(`${label}-1`));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('.volunteer-card', { timeout: 15000 });
  const card = page.locator('.volunteer-card').first();
  const decision = card.locator('.family-decision');
  await decision.waitFor({ state: 'visible', timeout: 5000 });

  const visibleText = await page.locator('body').innerText();
  if (visibleText.includes('家庭处理：')) throw new Error(`${label}: legacy family label is still visible`);
  for (const expected of ['这所学校怎么处理？', '继续考虑', '候选', '还没决定', '排除']) {
    if (!visibleText.includes(expected)) throw new Error(`${label}: missing visible decision copy: ${expected}`);
  }
  if (await card.locator('.family-option').count() !== 4) throw new Error(`${label}: expected four decision buttons`);
  if ((await card.locator('.family-option[aria-pressed="true"]').count()) !== 1) throw new Error(`${label}: default decision must have exactly one selected option`);

  const boxes = await Promise.all(Array.from({ length: 4 }, (_, i) => card.locator('.family-option').nth(i).boundingBox()));
  if (boxes.some(box => !box || box.width < 100 || box.height < 34)) throw new Error(`${label}: decision buttons are too small for comfortable interaction`);

  await card.locator('.family-option[data-family-option="保留"]').click();
  await page.waitForTimeout(250);
  const storedAfterKeep = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002'))?.volunteers?.[0]?.familyStatus);
  if (storedAfterKeep !== '保留') throw new Error(`${label}: click did not persist 保留, got ${storedAfterKeep}`);
  if (await card.locator('.family-option[data-family-option="保留"][aria-pressed="true"]').count() !== 1) throw new Error(`${label}: continued consideration is not selected`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.volunteer-card').first().locator('.family-decision').waitFor({ state: 'visible', timeout: 5000 });
  const reloadedCard = page.locator('.volunteer-card').first();
  if (await reloadedCard.locator('.family-option[data-family-option="保留"][aria-pressed="true"]').count() !== 1) throw new Error(`${label}: decision did not persist after reload`);

  await reloadedCard.locator('.family-option[data-family-option="已排除"]').click();
  await page.waitForTimeout(250);
  const storedAfterExclude = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002'))?.volunteers?.[0]?.familyStatus);
  if (storedAfterExclude !== '已排除') throw new Error(`${label}: exclude did not persist, got ${storedAfterExclude}`);
  if (errors.length) throw new Error(`${label}: browser page errors: ${errors.join(' | ')}`);

  await context.close();
  await browser.close();
}

await testViewport({ width: 1280, height: 900 }, 'desktop');
await testViewport({ width: 390, height: 844 }, 'mobile');
console.log('simulation-report-v011 compatibility browser on current v014.12 workbench: PASS');
