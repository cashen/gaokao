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
      id: 'history-inline-test-1', order: 1, school: '辽宁科技大学', majorCode: '080301', majorName: '测控技术与仪器',
      history: { years: {
        2026: { score: 493, rank: 56659, comparable: true, recordStatus: 'primary-record' },
        2025: { score: 491, rank: 61050, comparable: true, recordStatus: 'primary-record' },
        2024: { score: 476, rank: 64544, comparable: true, recordStatus: 'primary-record' }
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
const inline = card.locator('.history-inline');
await inline.waitFor({ state: 'visible', timeout: 5000 });
if (await inline.locator('.history-inline-item').count() !== 3) throw new Error('inline history should contain 3 years');
const text = await inline.innerText();
for (const expected of ['2026', '493分 / 56,659位', '2025', '491分 / 61,050位', '2024', '476分 / 64,544位']) {
  if (!text.includes(expected)) throw new Error(`missing inline history text: ${expected}`);
}
if (await card.locator('.history-hint').count() !== 0) throw new Error('legacy v008 history card must not be rendered');
if ((await inline.evaluate(el => getComputedStyle(el).whiteSpace)) !== 'nowrap') throw new Error('history summary should remain one visual line');
const box = await inline.boundingBox();
if (!box || box.width < 280) throw new Error(`history inline too narrow: ${box?.width}`);
if (errors.length) throw new Error(`browser page errors: ${errors.join(' | ')}`);
await browser.close();
console.log('simulation-report-v009-history-inline: PASS');
