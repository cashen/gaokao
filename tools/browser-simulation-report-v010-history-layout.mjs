import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await context.addInitScript(() => {
  localStorage.setItem('gaokao:simulation-report:v002', JSON.stringify({
    version: 2,
    studentName: '',
    subjectTrack: '辽宁物理类（物化生）',
    totalScore: '555',
    rank: 29685,
    volunteers: [{
      id: 'history-layout-test-1', order: 1, school: '辽宁科技大学', majorCode: '080301', majorName: '测控技术与仪器',
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
const top = card.locator('.volunteer-top');
const school = card.locator('.card-field').first().locator('input');
const inline = card.locator('.history-inline');
await inline.waitFor({ state: 'visible', timeout: 5000 });

const text = await inline.innerText();
for (const expected of ['2026', '493分 / 56,659位', '2025', '491分 / 61,050位', '2024', '476分 / 64,544位', '历史投档参考']) {
  if (!text.includes(expected)) throw new Error(`missing history text: ${expected}`);
}
if ((await inline.evaluate(el => getComputedStyle(el).whiteSpace)) !== 'nowrap') throw new Error('history summary should remain one visual line');
const schoolBox = await school.boundingBox();
const inlineBox = await inline.boundingBox();
if (!schoolBox || !inlineBox) throw new Error('missing school/history geometry');
if (Math.abs(schoolBox.x - inlineBox.x) > 2.5) throw new Error(`history left edge not aligned: school=${schoolBox.x}, history=${inlineBox.x}`);
const geometry = await inline.evaluate(el => ({ clientWidth: el.clientWidth, scrollWidth: el.scrollWidth }));
if (geometry.scrollWidth > geometry.clientWidth + 1) throw new Error(`desktop history is clipped: ${geometry.clientWidth}/${geometry.scrollWidth}`);
if (await top.locator('.history-inline').count() !== 0) throw new Error('history row must not be nested inside volunteer-top');
if (errors.length) throw new Error(`browser page errors: ${errors.join(' | ')}`);

await context.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await mobileContext.addInitScript(() => {
  localStorage.setItem('gaokao:simulation-report:v002', JSON.stringify({
    version: 2,
    volunteers: [{
      id: 'history-layout-test-mobile', order: 1, school: '辽宁科技大学', majorCode: '080301', majorName: '测控技术与仪器',
      history: { years: {
        2026: { score: 493, rank: 56659, comparable: true, recordStatus: 'primary-record' },
        2025: { score: 491, rank: 61050, comparable: true, recordStatus: 'primary-record' },
        2024: { score: 476, rank: 64544, comparable: true, recordStatus: 'primary-record' }
      } }, manualCheck: {}, familyStatus: '待讨论', familyNote: ''
    }]
  }));
});
const mobilePage = await mobileContext.newPage();
const mobileErrors = [];
mobilePage.on('pageerror', e => mobileErrors.push(String(e)));
await mobilePage.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
await mobilePage.waitForSelector('.volunteer-card', { timeout: 15000 });
const mobileCard = mobilePage.locator('.volunteer-card').first();
const mobileSchool = mobileCard.locator('.card-field').first().locator('input');
const mobileInline = mobileCard.locator('.history-inline');
await mobileInline.waitFor({ state: 'visible', timeout: 5000 });
const mobileSchoolBox = await mobileSchool.boundingBox();
const mobileInlineBox = await mobileInline.boundingBox();
if (!mobileSchoolBox || !mobileInlineBox) throw new Error('missing mobile geometry');
if (Math.abs(mobileSchoolBox.x - mobileInlineBox.x) > 2.5) throw new Error(`mobile history left edge not aligned: school=${mobileSchoolBox.x}, history=${mobileInlineBox.x}`);
if ((await mobileInline.evaluate(el => getComputedStyle(el).whiteSpace)) !== 'nowrap') throw new Error('mobile history summary wrapped');
if (mobileErrors.length) throw new Error(`mobile browser page errors: ${mobileErrors.join(' | ')}`);
await mobileContext.close();
await browser.close();
console.log('simulation-report-v010-history-layout: PASS');
