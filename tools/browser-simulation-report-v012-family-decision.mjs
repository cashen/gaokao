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
    const key = 'gaokao:simulation-report:v002';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, seedState(`${label}-1`));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('.volunteer-card', { timeout: 15000 });
  const card = page.locator('.volunteer-card').first();
  const decision = card.locator('.family-decision');
  await decision.waitFor({ state: 'visible', timeout: 5000 });

  if (await card.locator('.family-option').count() !== 4) throw new Error(`${label}: expected four options`);
  if (await card.locator('.family-option[aria-pressed="true"]').count() !== 1) throw new Error(`${label}: expected one initially selected option`);
  for (const value of ['继续考虑', '候选', '还没决定', '排除']) {
    if (!await card.getByRole('button', { name: value }).isVisible()) throw new Error(`${label}: missing ${value}`);
  }

  const boxes = await Promise.all(Array.from({length:4}, (_, i) => card.locator('.family-option').nth(i).boundingBox()));
  if (boxes.some(box => !box || box.width < 120 || box.height < 36)) throw new Error(`${label}: decision option touch target too small`);

  const cases = [
    ['继续考虑', '保留', 'family-option-keep'],
    ['候选', '备选', 'family-option-candidate'],
    ['还没决定', '待讨论', 'family-option-undecided'],
    ['排除', '已排除', 'family-option-exclude']
  ];
  for (const [labelText, value, className] of cases) {
    await card.getByRole('button', { name: labelText }).click();
    await page.waitForTimeout(120);
    if (await card.locator(`[data-family-option="${value}"][aria-pressed="true"]`).count() !== 1) throw new Error(`${label}: ${labelText} did not become selected immediately`);
    if (await card.locator(`.${className}[aria-pressed="true"]`).count() !== 1) throw new Error(`${label}: ${labelText} missing visual state`);
    const current = await card.locator('[data-family-current]').innerText();
    if (!current.includes(labelText)) throw new Error(`${label}: current label did not update to ${labelText}`);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002'))?.volunteers?.[0]?.familyStatus);
    if (stored !== value) throw new Error(`${label}: ${labelText} was not persisted; got ${stored}`);
  }

  await page.getByRole('button', { name: '排除' }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.volunteer-card').first().locator('.family-decision').waitFor({ state: 'visible', timeout: 5000 });
  if (await page.locator('.volunteer-card').first().locator('[data-family-option="已排除"][aria-pressed="true"]').count() !== 1) throw new Error(`${label}: selection did not survive reload`);
  if (errors.length) throw new Error(`${label}: browser errors: ${errors.join(' | ')}`);

  await context.close();
  await browser.close();
}

await testViewport({ width: 1280, height: 900 }, 'desktop');
await testViewport({ width: 390, height: 844 }, 'mobile');
console.log('simulation-report-v012-family-decision: PASS');
