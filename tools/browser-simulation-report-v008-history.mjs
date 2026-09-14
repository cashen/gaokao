import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await context.addInitScript(() => {
  localStorage.setItem('gaokao:simulation-report:v002', JSON.stringify({
    version: 2,
    studentName: '',
    subjectTrack: '辽宁物理类（物化生）',
    totalScore: '555',
    rank: 29685,
    volunteers: [{
      id: 'history-test-1', order: 1, school: '辽宁科技大学', majorCode: '080301', majorName: '测控技术与仪器',
      history: { years: {
        2026: { score: 501, rank: 43100, comparable: true, recordStatus: 'primary-record' },
        2025: { score: 498, rank: 44500, comparable: true, recordStatus: 'primary-record' },
        2024: { score: 493, rank: 47000, comparable: true, recordStatus: 'primary-record' }
      } }, manualCheck: {}, familyStatus: '待讨论', familyNote: ''
    }]
  }));
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForSelector('.volunteer-card', { timeout: 15000 });

const card = page.locator('.volunteer-card').first();
await card.locator('.history-hint').waitFor({ state: 'visible', timeout: 5000 });
if (await card.locator('.history-hint-item').count() !== 3) throw new Error('three-year history should have 3 year cells');
for (const year of ['2026', '2025', '2024']) {
  const cell = card.locator('.history-hint-item').filter({ hasText: year });
  if (!(await cell.isVisible())) throw new Error(`${year} history is not visible by default`);
}
if (await card.locator('.detail-panel').isVisible()) throw new Error('detail panel must remain collapsed by default');
if ((await card.locator('.history-hint').innerText()).includes('501分') === false) throw new Error('2026 history score missing');
if ((await card.locator('.history-hint').innerText()).includes('43,100位') === false) throw new Error('2026 history rank missing');
const box = await card.locator('.history-hint').boundingBox();
if (!box || box.width < 300) throw new Error(`history hint too narrow: ${box?.width}`);
if (errors.length) throw new Error(`browser page errors: ${errors.join(' | ')}`);

await browser.close();
console.log('simulation-report-v008-history: PASS');
