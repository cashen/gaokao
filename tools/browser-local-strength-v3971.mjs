import { chromium } from 'playwright';

const BASE = process.env.LOCAL_STRENGTH_BASE || 'http://127.0.0.1:8788';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const browser = await chromium.launch({ headless: true });
try {
  const api = await fetch(`${BASE}/api/local-strength?mode=meta`).then(async response => {
    const data = await response.json();
    assert(response.ok && data.ok, `meta api failed: ${response.status} ${JSON.stringify(data)}`);
    return data;
  });
  assert(api.meta.completeEvaluation === true, 'local admission records were not fully evaluated');
  assert(api.meta.evaluatedRecordCount === api.meta.localAdmissionRecordCount, 'coverage totals mismatch');
  assert(api.meta.matchedRecordCount > 0, 'no LocalStrength records generated');
  assert(api.meta.matchedSchoolCount > 0, 'no matched schools generated');
  assert(api.meta.duplicatePublicRecordCount === 0, 'duplicate public records detected');
  assert(api.schools.some(item => item.officialName === '辽宁科技大学'), '辽宁科技大学 missing from local school coverage');

  const list = await fetch(`${BASE}/api/local-strength?mode=list_all&page=1&pageSize=20`).then(response => response.json());
  assert(list.ok && list.page.total === api.meta.matchedRecordCount, 'list_all total does not equal full matched total');
  assert(list.records.length > 0 && list.records.length <= 20, 'list_all pagination invalid');
  for (let i = 1; i < list.records.length; i += 1) {
    assert(Number(list.records[i - 1].score2026) >= Number(list.records[i].score2026), 'list_all score ordering is not descending');
  }

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  desktop.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  desktop.on('pageerror', error => errors.push(error.message));
  await desktop.goto(`${BASE}/ln-rank/local-mainline.html?view=list_all`, { waitUntil: 'networkidle' });
  await desktop.waitForSelector('body[data-local-strength-runtime="ready"]', { timeout: 30000 });
  assert(await desktop.locator('.ls-record').count() > 0, 'desktop list did not render records');
  assert((await desktop.locator('[data-stat-records]').textContent()).trim() !== '—', 'summary stats not rendered');

  await desktop.locator('[data-view="school"]').click();
  await desktop.locator('#schoolInput').fill('辽宁科技大学');
  await desktop.locator('#schoolSubmit').click();
  await desktop.waitForTimeout(800);
  const schoolRecords = await desktop.locator('.ls-record').count();
  const schoolEmpty = await desktop.locator('.ls-empty').count();
  assert(schoolRecords > 0 || schoolEmpty > 0, '辽宁科技大学 school state did not resolve');
  const schoolBody = await desktop.locator('#records').innerText();
  assert(schoolBody.includes('辽宁科技大学') || schoolBody.includes('当前没有可公开'), '辽宁科技大学 result context missing');

  await desktop.locator('[data-view="score"]').click();
  await desktop.locator('#scoreInput').fill('579');
  await desktop.locator('#scoreSubmit').click();
  await desktop.waitForTimeout(800);
  assert((await desktop.locator('#resultsTitle').innerText()).includes('560—589'), '579 score did not map to the correct band');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobile.goto(`${BASE}/ln-rank/local-mainline.html?view=list_all`, { waitUntil: 'networkidle' });
  await mobile.waitForSelector('body[data-local-strength-runtime="ready"]', { timeout: 30000 });
  const geometry = await mobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    records: document.querySelectorAll('.ls-record').length
  }));
  assert(geometry.scrollWidth <= geometry.clientWidth + 1, `mobile horizontal overflow: ${geometry.scrollWidth}/${geometry.clientWidth}`);
  assert(geometry.records > 0, 'mobile list did not render');
  assert(errors.length === 0, `browser console errors: ${errors.join(' | ')}`);

  console.log(JSON.stringify({
    ok: true,
    meta: api.meta,
    desktopSchoolRecords: schoolRecords,
    mobile: geometry
  }, null, 2));
} finally {
  await browser.close();
}
