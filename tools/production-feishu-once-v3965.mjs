import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PRODUCTION_BASE_URL || 'https://gaokao.powers.org.cn';
const artifactDir = process.env.PRODUCTION_ARTIFACT_DIR || '/tmp/v3965-production';
fs.mkdirSync(artifactDir, { recursive: true });
const resultPath = path.join(artifactDir, 'feishu-once.json');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
await context.addInitScript(() => {
  globalThis.__acceptanceClipboardMode = 'success';
  globalThis.__acceptanceClipboardValues = [];
  globalThis.__acceptanceOpenedUrl = '';
  Object.defineProperty(Navigator.prototype, 'clipboard', {
    configurable: true,
    get() {
      return {
        writeText: async value => {
          if (globalThis.__acceptanceClipboardMode === 'failure') throw new Error('controlled acceptance clipboard rejection');
          globalThis.__acceptanceClipboardValues.push(String(value));
        }
      };
    }
  });
  globalThis.open = url => {
    globalThis.__acceptanceOpenedUrl = String(url || '');
    return { closed: false };
  };
});
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
const reportRequests = [];
let reportResponse = null;
page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
page.on('console', message => {
  if (message.type() === 'error' && !/favicon|ERR_BLOCKED_BY_CLIENT/i.test(message.text())) consoleErrors.push(message.text());
});
page.on('request', request => {
  const url = new URL(request.url());
  if (url.pathname === '/api/feishu-create-report') reportRequests.push({ method: request.method(), url: request.url() });
});
page.on('response', async response => {
  const url = new URL(response.url());
  if (url.pathname !== '/api/feishu-create-report') return;
  try { reportResponse = await response.json(); } catch { reportResponse = { ok: false, status: response.status() }; }
  fs.writeFileSync(resultPath, JSON.stringify({ phase: 'report-response', reportRequests, reportResponse }, null, 2));
});

try {
  await page.goto(`${baseUrl}/ln-rank/?acceptance=feishu-once-v3965`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => document.body.dataset.runtimeState === 'ready', null, { timeout: 60000 });
  assert.equal(await page.locator('body').getAttribute('data-release'), 'v3.9.65.0');
  await page.locator('#candidateScore').fill('600');
  await page.locator('#majorKeyword').fill('电气/自动化');
  await page.locator('#queryButton').click();
  await page.locator('.major-card').first().waitFor({ state: 'visible', timeout: 90000 });

  const generate = page.locator('#feishuReportMount [data-generate-feishu]');
  await generate.waitFor({ state: 'visible', timeout: 30000 });
  assert.equal(await generate.isEnabled(), true, 'Feishu generate button is disabled');
  await generate.click();
  await page.locator('#feishuReportMount .feishu-box.is-success').waitFor({ state: 'visible', timeout: 120000 });
  assert.equal(reportRequests.length, 1, `expected exactly one report request, got ${reportRequests.length}`);
  assert.equal(reportResponse?.ok, true, `report API failed: ${JSON.stringify(reportResponse)}`);
  assert.equal(reportResponse?.dataYear, 2026);
  assert.equal(reportResponse?.rankYear, 2026);
  assert.equal(reportResponse?.audienceYear, 2027);
  assert.ok(reportResponse?.url, 'report URL missing');
  fs.writeFileSync(resultPath, JSON.stringify({ phase: 'generated', reportRequests, reportResponse }, null, 2));

  const copy = page.locator('#feishuReportMount [data-copy-feishu]');
  await copy.click();
  await page.waitForFunction(() => /报告链接已复制/.test(document.querySelector('[data-feishu-feedback]')?.textContent || ''), null, { timeout: 20000 });
  const copied = await page.evaluate(() => globalThis.__acceptanceClipboardValues.slice());
  assert.deepEqual(copied, [reportResponse.url]);
  assert.equal(await copy.isEnabled(), true);

  await page.evaluate(() => { globalThis.__acceptanceClipboardMode = 'failure'; });
  await page.locator('#feishuReportMount [data-copy-feishu]').click();
  await page.waitForFunction(() => /复制失败/.test(document.querySelector('[data-feishu-feedback]')?.textContent || ''), null, { timeout: 20000 });
  const retryCopy = page.locator('#feishuReportMount [data-copy-feishu]');
  assert.equal(await retryCopy.isEnabled(), true);
  assert.equal((await retryCopy.textContent())?.trim(), '再次复制');

  await page.locator('#feishuReportMount [data-open-feishu]').click();
  await page.waitForFunction(() => /已尝试在新窗口打开报告/.test(document.querySelector('[data-feishu-feedback]')?.textContent || ''), null, { timeout: 20000 });
  const opened = await page.evaluate(() => globalThis.__acceptanceOpenedUrl);
  assert.equal(opened, reportResponse.url);

  assert.deepEqual(pageErrors, [], pageErrors.join('\n'));
  assert.deepEqual(consoleErrors, [], consoleErrors.join('\n'));
  const final = {
    ok: true,
    release: 'v3.9.65.0',
    requests: reportRequests.length,
    documentId: reportResponse.documentId || '',
    url: reportResponse.url,
    copySuccess: true,
    copyFailureRecovered: true,
    openUrlMatched: true
  };
  fs.writeFileSync(resultPath, JSON.stringify(final, null, 2));
  console.log(JSON.stringify(final, null, 2));
} catch (error) {
  const diagnostic = await page.evaluate(() => ({
    url: location.href,
    bodyText: document.body?.innerText?.slice(0, 12000) || '',
    feedback: document.querySelector('[data-feishu-feedback]')?.textContent || '',
    clipboard: globalThis.__acceptanceClipboardValues || [],
    opened: globalThis.__acceptanceOpenedUrl || ''
  })).catch(() => null);
  fs.writeFileSync(resultPath, JSON.stringify({ ok: false, error: String(error?.stack || error), reportRequests, reportResponse, pageErrors, consoleErrors, diagnostic }, null, 2));
  await page.screenshot({ path: path.join(artifactDir, 'feishu-once-failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await context.close();
  await browser.close();
}
