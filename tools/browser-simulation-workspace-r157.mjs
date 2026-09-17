import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const school = '辽宁科技大学';
const ordinary = { id: 'ln-2026-0146-05', school, schoolCode2026: '0146', major: '冶金工程', majorCode2026: '05', standardMajorName: '冶金工程', standardMajorCode: '080404', score2026: 497, rank2026: 54846, score2025: 494, rank2025: 59521, score2024: 473, rank2024: 66025 };
const sino = { id: 'ln-2026-0146-H1', school, schoolCode2026: '0146', major: '冶金工程(中外合作办学)', majorCode2026: 'H1', standardMajorName: '冶金工程', standardMajorCode: '080404', score2026: 427, rank2026: 87013, score2025: 448, rank2025: 82763, score2024: 437, rank2024: 83835 };
const missing2024 = { id: 'ln-2026-0146-M1', school, schoolCode2026: '0146', major: '机械工程', majorCode2026: '06', score2026: 505, rank2026: 51000, score2025: 501, rank2025: 54000, score2024: null, rank2024: null };
const makeApi = records => ({ ok: true, records });
const androidUA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36';

async function installRoutes(page) {
  await page.route('**/api/simulation-rank**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rank: 60000 }) }));
  await page.route('**/api/ai/major-history**', route => {
    const query = new URL(route.request().url()).searchParams.get('major') || '';
    if (query === '网络错误') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, code: 'major_history_failed', message: '模拟网络错误' }) });
    if (query === '缺史') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(makeApi([missing2024])) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(makeApi([ordinary, sino])) });
  });
}

async function seedPdfMocks(page) {
  await page.route('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.html2canvas=async()=>{const c=document.createElement("canvas");c.width=794;c.height=1123;c.toDataURL=()=>"data:image/jpeg;base64,AA==";return c};' }));
  await page.route('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.jspdf={jsPDF:class{constructor(){this.pages=1}addPage(){this.pages++}addImage(){}output(){return new Blob(["pdf"])}save(){} }};' }));
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { width: 390, height: 844, name: 'android', userAgent: androidUA },
    { width: 768, height: 1024, name: 'pad', userAgent: androidUA },
    { width: 1280, height: 900, name: 'desktop', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36' }
  ]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, userAgent: viewport.userAgent });
    await context.addInitScript(() => localStorage.clear());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error?.message || error)));
    await installRoutes(page);
    await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html', { waitUntil: 'domcontentloaded' });
    await page.locator('.volunteer-card').first().waitFor({ state: 'visible' });
    const initialMetrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    assert.equal(initialMetrics.scrollWidth, initialMetrics.clientWidth, `${viewport.name}: horizontal overflow on load`);

    await page.locator('[data-field="school"]').first().fill('辽科大');
    await page.locator('.candidate').filter({ hasText: school }).first().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.candidate').filter({ hasText: school }).first().click();
    assert.equal(await page.locator('.input-helper').first().textContent(), `✓ 已确认学校：${school}。现在可以直接输入专业。`);
    let state = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers[0]);
    assert.equal(state.confirmedSchool, school);
    assert.equal(state.schoolCode, '', `${viewport.name}: school directory currently does not expose a school code; do not invent one`);

    const majorInput = page.locator('[data-field="majorCode"]').first();
    await majorInput.fill('冶金工程');
    await page.locator('.candidate').filter({ hasText: '冶金工程(中外合作办学)' }).waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('.candidate').count(), 2, `${viewport.name}: candidates must be actual current-school records`);
    await page.locator('.candidate').filter({ hasText: '冶金工程(中外合作办学)' }).click();
    state = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers[0]);
    assert.equal(state.major, sino.major);
    assert.equal(state.schoolCode, sino.schoolCode2026);
    assert.equal(state.majorCode2026, 'H1');
    assert.equal(state.majorRecordId, sino.id);
    assert.equal(state.canonicalAdmissionKey, sino.id);
    assert.equal(state.admissionProject.kind, 'sino');
    assert.equal(state.threeYearHistory.recordId, sino.id);
    assert.deepEqual(Object.fromEntries([2026, 2025, 2024].map(year => [year, state.threeYearHistory.years[year].score])), { 2026: 427, 2025: 448, 2024: 437 });
    assert.match(await page.locator('.record-identity').textContent(), /H1/);
    assert.ok((await page.url()).includes('majorRecordId=ln-2026-0146-H1'));

    await page.locator('[data-family-note]').first().fill('学费可以接受，但校区需要再核实。');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.volunteer-card').first().waitFor({ state: 'visible' });
    state = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers[0]);
    assert.equal(state.majorRecordId, sino.id, `${viewport.name}: refresh must preserve exact identity`);
    assert.equal(state.familyNote, '学费可以接受，但校区需要再核实。');

    await page.locator('[data-field="majorCode"]').first().fill('缺史');
    await page.locator('.candidate').filter({ hasText: '机械工程' }).waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.candidate').filter({ hasText: '机械工程' }).click();
    const missingCell = page.locator('.history-cell').filter({ hasText: '2024' }).locator('strong');
    await missingCell.waitFor({ state: 'visible' });
    assert.equal(await missingCell.textContent(), '暂无对应投档记录');
    state = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers[0]);
    assert.equal(state.threeYearHistory.years[2024].status, 'missing');

    await page.locator('[data-field="majorCode"]').first().fill('网络错误');
    await page.waitForTimeout(450);
    assert.match(await page.locator('.input-helper').first().textContent(), /暂时无法获取，请稍后重试/);
    state = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers[0]);
    assert.equal(state.threeYearHistory.status, 'error');

    await page.locator('[data-field="majorCode"]').first().fill('冶金工程');
    await page.locator('.candidate').filter({ hasText: '冶金工程(中外合作办学)' }).waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.candidate').filter({ hasText: '冶金工程' }).first().click();
    await page.locator('#wbAdd').click();
    await page.locator('.volunteer-card').nth(1).waitFor({ state: 'visible' });
    await page.locator('[data-field="school"]').nth(1).fill(school);
    await page.locator('.candidate').filter({ hasText: school }).last().click();
    await page.locator('[data-field="majorCode"]').nth(1).fill('冶金工程');
    await page.locator('.candidate').filter({ hasText: '冶金工程' }).first().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.candidate').filter({ hasText: '冶金工程' }).first().click();
    let volunteers = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers);
    assert.equal(volunteers.length, 2);
    assert.notEqual(volunteers[0].id, volunteers[1].id);
    assert.equal(volunteers[0].majorRecordId, ordinary.id);
    assert.equal(volunteers[1].majorRecordId, ordinary.id);
    await page.locator('[data-field="majorCode"]').nth(0).fill('冶金工程(中外合作办学)');
    await page.locator('.candidate').filter({ hasText: '冶金工程(中外合作办学)' }).first().click();
    volunteers = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers);
    assert.equal(volunteers[0].majorRecordId, sino.id);
    assert.equal(volunteers[1].majorRecordId, ordinary.id);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('[data-action="delete"]').nth(0).click();
    await page.waitForTimeout(100);
    volunteers = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers);
    assert.equal(volunteers.length, 1);
    assert.equal(volunteers[0].majorRecordId, ordinary.id);

    if (viewport.name === 'android' || viewport.name === 'desktop') {
      await seedPdfMocks(page);
      await page.evaluate(() => { const original = window.open; window.open = () => ({ closed: false }); window.__restoreWindowOpen = () => { window.open = original; }; });
      await page.locator('#wbPdf').click();
      await page.waitForFunction(() => Boolean(window.__GAOKAO_PDF_SAVED__), null, { timeout: 10000 });
      const pdfState = await page.evaluate(() => ({ release: window.__GAOKAO_PDF_SAVED__.release, recordIds: window.__GAOKAO_PDF_SAVED__.recordIds }));
      assert.equal(pdfState.release, 'v016.67-r157');
      assert.deepEqual(pdfState.recordIds, [ordinary.id]);
    }

    assert.equal(errors.length, 0, `${viewport.name}: page errors ${errors.join('; ')}`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: androidUA });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error?.message || error)));
  await page.route('**/api/ai/major-history**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(makeApi([sino, ordinary])) }));
  const deepUrl = 'http://127.0.0.1:4173/ln-rank/simulation-report.html?school=%E8%BE%BD%E5%AE%81%E7%A7%91%E6%8A%80%E5%A4%A7%E5%AD%A6&schoolCode=0146&majorName=%E5%86%B6%E9%87%91%E5%B7%A5%E7%A8%8B(%E4%B8%AD%E5%A4%96%E5%90%88%E4%BD%9C%E8%BE%9E%E5%AD%A6)&majorCode2026=H1&majorRecordId=ln-2026-0146-H1&source=tongxue&entry=major';
  await page.goto(deepUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002'))?.volunteers?.[0]?.majorRecordId === 'ln-2026-0146-H1', null, { timeout: 10000 });
  const deepState = await page.evaluate(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers[0]);
  assert.equal(deepState.majorRecordId, sino.id);
  assert.equal(deepState.majorCode2026, 'H1');
  assert.equal(deepState.source.module, 'tongxue');
  assert.match(await page.locator('.record-identity').textContent(), /H1/);

  await page.goto('http://127.0.0.1:4173/ln-rank/', { waitUntil: 'domcontentloaded' });
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('gaokao:simulation-report:v002'))?.volunteers?.[0]?.majorRecordId === 'ln-2026-0146-H1', null, { timeout: 10000 });
  await page.goForward({ waitUntil: 'domcontentloaded' });
  assert.equal(errors.length, 0, `deep-link back/forward errors: ${errors.join('; ')}`);
  await context.close();

  console.log('simulation workspace r157 browser contract: PASS');
} finally {
  await browser.close();
}
