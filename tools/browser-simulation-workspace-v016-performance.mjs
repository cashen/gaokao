import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const URL = 'http://127.0.0.1:4173/ln-rank/simulation-report.html';
const samples = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: 'zh-CN'
});
await context.addInitScript(() => {
  localStorage.clear();
  localStorage.setItem('gaokao:simulation-report:v002', JSON.stringify({
    version: 2,
    studentName: '',
    subjectTrack: '辽宁物理类（物化生）',
    totalScore: '',
    volunteers: [{
      id: 'v017-perf-1',
      order: 1,
      school: '',
      majorCode: '',
      majorName: '',
      confirmedSchool: '',
      familyStatus: '待讨论',
      history: { years: {} }
    }],
    selectionPool: []
  }));
});
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));
await page.route('**/api/ai/major-history**', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, records: [] })
  });
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
const card = page.locator('.volunteer-card').first();
await card.waitFor({ state: 'visible', timeout: 10000 });
const school = card.locator('[data-field="school"]');
const major = card.locator('[data-field="majorCode"]');

for (const value of ['沈', '沈阳', '沈阳工', '沈阳工业', '沈阳工业大学', '']) {
  const elapsed = await page.evaluate(value => {
    const input = document.querySelector('.volunteer-card [data-field="school"]');
    const start = performance.now();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return performance.now() - start;
  }, value);
  samples.push({ kind: 'school', value, elapsedMs: elapsed });
}

await school.fill('沈阳工业大学');
for (const value of ['自', '自动', '自动化', '']) {
  const elapsed = await page.evaluate(value => {
    const input = document.querySelector('.volunteer-card [data-field="majorCode"]');
    const start = performance.now();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return performance.now() - start;
  }, value);
  samples.push({ kind: 'major', value, elapsedMs: elapsed });
}

assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
const values = samples.map(sample => sample.elapsedMs);
const sorted = [...values].sort((a, b) => a - b);
const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
const max = Math.max(...values);
assert.ok(max < 100, `input synchronous work exceeded 100ms: max=${max.toFixed(1)}ms`);
assert.ok(p95 < 60, `input p95 exceeded 60ms: p95=${p95.toFixed(1)}ms`);

console.log(`simulation-workspace-v016 input performance: PASS (p95=${p95.toFixed(1)}ms, max=${max.toFixed(1)}ms)`);
await browser.close();
