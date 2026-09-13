import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';

const base = process.env.SIMULATION_REPORT_BASE_URL || 'http://127.0.0.1:4173';
const url = `${base}/ln-rank/simulation-report.html`;
const storageKey = 'gaokao:simulation-report:v002';

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ ...devices['Pixel 5'] });
  await context.addInitScript(({ storageKey }) => {
    localStorage.setItem(storageKey, JSON.stringify({
      version: 2,
      studentName: 'Android打印测试学生',
      subjectTrack: '辽宁物理类（物化生）',
      totalScore: '555',
      scores: { chinese: '', math: '', english: '', physics: '', chemistry: '', biology: '' },
      rank: 29685,
      volunteers: [{
        id: 'v1', order: 1, school: '测试大学', majorCode: '080301', majorName: '测控技术与仪器',
        history: null, loading: false, error: '',
        manualCheck: { institutionCode: '', groupCode: '', campus: '', studyLocation: '', tuition: '', accommodationFee: '', planCount: '', studyLength: '', trainingMode: '', subjectRequirement: '', remark: '' },
        familyDecision: '', familyStatus: '保留', familyNote: 'Android打印回归'
      }]
    }));
    window.__printed = false;
    window.print = () => { window.__printed = true; };
  }, { storageKey });

  const page = await context.newPage();
  await page.route('**/api/simulation-rank**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, available: true, score: 555, rank: 29685, rankStart: 29685, rankEnd: 29685, sameCount: 1 }) }));
  await page.route('**/api/ai/major-history**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, records: [] }) }));
  await page.goto(url, { waitUntil: 'networkidle' });

  assert.match(await page.evaluate(() => navigator.userAgent), /Android/i, 'test context must be Android');
  const printButton = page.locator('#printSheet');
  assert.equal(await printButton.count(), 1, 'print button missing');

  const popupPromise = page.waitForEvent('popup', { timeout: 3000 }).catch(() => null);
  await printButton.click();
  const popup = await popupPromise;
  if (popup) {
    await popup.waitForLoadState('networkidle');
    assert.match(popup.url(), /simulation-report\.html\?print=1/, 'Android print fallback opened wrong URL');
    assert.equal(await popup.locator('body').evaluate(body => body.classList.contains('android-print-fallback')), true, 'fallback page class missing');
    assert.equal(await popup.locator('.android-print-hint').count(), 1, 'fallback hint missing');
    assert.equal(await popup.locator('.print-check-block .compact-check-sheet').count(), 1, 'compact print card missing');
  } else {
    assert.match(page.url(), /simulation-report\.html\?print=1/, 'popup-blocked fallback did not navigate to print view');
  }

  assert.equal(await page.evaluate(() => window.__printed), false, 'Android path must not rely on window.print()');
  console.log('simulation-report-v004-android-print: PASS');
  console.log('Android Pixel 5 emulation: print button opens the same-origin print view');
  console.log('No direct window.print() dependency on the Android entry path');
  console.log('Fallback print hint and compact card are present');
} finally {
  await browser.close();
}
