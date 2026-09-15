import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await context.addInitScript(() => {
  const key = 'gaokao:simulation-report:v002';
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, JSON.stringify({ version: 2, studentName: '', subjectTrack: '辽宁物理类（物化生）', totalScore: '555', rank: 29685, volunteers: [{ id: 'history-test-1', order: 1, school: '辽宁科技大学', majorCode: '080301', majorName: '测控技术与仪器', history: { years: { 2026: { score: 501, rank: 43100, comparable: true, recordStatus: 'primary-record' }, 2025: { score: 498, rank: 44500, comparable: true, recordStatus: 'primary-record' }, 2024: { score: 493, rank: 47000, comparable: true, recordStatus: 'primary-record' } } }, manualCheck: {}, familyStatus: '待讨论', familyNote: '' }] }));
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForSelector('.volunteer-card', { timeout: 15000 });
const card = page.locator('.volunteer-card').first();
const history = card.locator('.history-inline');
await history.waitFor({ state: 'visible', timeout: 5000 });
const text = await history.innerText();
for (const expected of ['2026', '501分', '43,100位', '2025', '498分', '44,500位', '2024', '493分', '47,000位']) if (!text.includes(expected)) throw new Error(`current history missing ${expected}`);
if ((await history.evaluate(el => getComputedStyle(el).whiteSpace)) !== 'nowrap') throw new Error('history summary should remain one visual line');
const box = await history.boundingBox();
if (!box || box.width < 280) throw new Error(`history summary too narrow: ${box?.width}`);
if (errors.length) throw new Error(`browser page errors: ${errors.join(' | ')}`);
await context.close();
await browser.close();
console.log('simulation-report-v008 compatibility browser on current workbench: PASS');
