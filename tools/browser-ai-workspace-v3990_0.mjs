import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = String(process.env.AI_PREVIEW_BASE || '').replace(/\/+$/, '');
const EXPECTED_SHA = String(process.env.AI_EXPECTED_SHA || '').trim();
const ARTIFACT_DIR = process.env.AI_ARTIFACT_DIR || '/tmp/ai-workspace-browser';

if (!BASE) throw new Error('AI_PREVIEW_BASE is required');
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const devices = [
  { name: 'pc', viewport: { width: 1440, height: 900 } },
  { name: 'pad', viewport: { width: 1024, height: 768 } },
  { name: 'android', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForResult(page, text, timeout = 60000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
}

async function checkGeometry(page, name) {
  const geometry = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  assert(geometry.scrollWidth <= geometry.width + 2, `${name}: document horizontal overflow ${geometry.scrollWidth} > ${geometry.width}`);
  assert(geometry.bodyWidth <= geometry.width + 2, `${name}: body horizontal overflow ${geometry.bodyWidth} > ${geometry.width}`);
}

async function verifyRankPersistence(page, name) {
  const input = page.locator('#promptInput');
  await input.fill('600分位次是多少');
  await page.locator('#sendButton').click();
  await waitForResult(page, '14,235');
  await checkGeometry(page, `${name}:rank`);
  await page.reload({ waitUntil: 'networkidle' });
  await waitForResult(page, '14,235', 30000);
  assert(await page.locator('.block.fact').count() >= 1, `${name}: IndexedDB workspace result did not survive reload`);
}

async function verifySoftPreference(page, name) {
  await page.locator('#promptInput').fill('580分，计算机方向，东北优先');
  await page.locator('#sendButton').click();
  await waitForResult(page, '确定性候选执行结果');
  await waitForResult(page, '偏好 · 地区范围');
  const candidateText = await page.locator('.block').filter({ hasText: '确定性候选执行结果' }).innerText();
  assert(!candidateText.includes('执行地区：ln'), `${name}: soft preference unexpectedly became hard region execution`);
  await checkGeometry(page, `${name}:soft`);
}

async function verifySelectionReview(page, name) {
  await page.evaluate(() => {
    localStorage.setItem('lnRank.selectionPool.lnPhysics.2026.v3951', JSON.stringify({
      items: [{ id: 'browser-test-1', school: '测试大学', major: '计算机科学与技术', bandKey: 'near', rank2026: 20000, displayLocation: '沈阳', tuition: '' }]
    }));
  });
  await page.locator('#importSelection').click();
  await waitForResult(page, '已导入1项只读快照');
  await page.locator('#promptInput').fill('我已经选了一些专业，帮我看看方案还缺什么');
  await page.locator('#sendButton').click();
  await waitForResult(page, '家庭方案结构审查');
  await waitForResult(page, '没有明确学费信息');
  const stored = await page.evaluate(() => localStorage.getItem('lnRank.selectionPool.lnPhysics.2026.v3951'));
  const parsed = JSON.parse(stored || '{}');
  assert(parsed?.items?.[0]?.id === 'browser-test-1', `${name}: AI import mutated ln-rank selection pool`);
  await checkGeometry(page, `${name}:selection`);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const device of devices) {
    const context = await browser.newContext({
      viewport: device.viewport,
      isMobile: Boolean(device.isMobile),
      hasTouch: Boolean(device.hasTouch),
      locale: 'zh-CN'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror:${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });

    const target = `${BASE}/aiplus/?browser=${encodeURIComponent(EXPECTED_SHA || 'preview')}-${device.name}`;
    const response = await page.goto(target, { waitUntil: 'networkidle', timeout: 60000 });
    assert(response?.ok(), `${device.name}: /ai/ returned ${response?.status()}`);
    await waitForResult(page, '工作台已就绪', 30000);
    await checkGeometry(page, `${device.name}:initial`);

    await verifyRankPersistence(page, device.name);
    await verifySoftPreference(page, device.name);
    await verifySelectionReview(page, device.name);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, `${device.name}.png`), fullPage: true });
    assert(errors.length === 0, `${device.name}: browser errors: ${errors.join(' | ')}`);
    await context.close();
  }

  console.log(JSON.stringify({ ok: true, base: BASE, expectedSha: EXPECTED_SHA, devices: devices.map(item => item.name) }, null, 2));
} finally {
  await browser.close();
}