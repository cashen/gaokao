import { chromium } from 'playwright';

const base = process.env.MAJOR_ALL_BASE || 'http://127.0.0.1:8766/ln-rank/index.html?mode=major-all';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForFunction(() => {
  const button = [...document.querySelectorAll('[data-school-view-mode="major-all"]')][0];
  return button && !button.disabled;
}, null, { timeout: 15000 });
await page.getByRole('button', { name: '按专业找学校' }).click();

const input = page.getByRole('searchbox', { name: '添加想了解的专业（可添加多个）' });
await input.fill('机械');
const mechanicalCandidate = page.getByRole('button', { name: /机械工程 080201/ });
if (await mechanicalCandidate.count() > 0) await mechanicalCandidate.click();
else await page.getByText('已确认 · 080201').waitFor({ state: 'visible', timeout: 10000 });

if (!(await page.getByRole('button', { name: '＋再添加一个专业' }).isVisible())) {
  throw new Error('explicit add-major action is not visible after first confirmation');
}
await page.getByRole('button', { name: '＋再添加一个专业' }).click();
if ((await input.inputValue()) !== '' || await input.getAttribute('placeholder') !== '继续添加一个，如：测控、材料或软件') {
  throw new Error('add-major action did not create a clean next-input state');
}
await input.fill('测控');
await page.getByRole('button', { name: /测控技术与仪器 080301/ }).click();

if (!(await page.getByText('已添加 2 个专业').isVisible())) {
  throw new Error('confirmed-major count is not visible');
}
if (!(await page.getByRole('button', { name: '查询 2 个已确认专业' }).isVisible())) {
  throw new Error('unified confirmed-major query action is not visible');
}

for (const viewport of [{ width: 1366, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
  await page.setViewportSize(viewport);
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    actionHeights: [...document.querySelectorAll('[data-major-add-another], [data-major-clear]')].map(el => Math.round(el.getBoundingClientRect().height))
  }));
  if (geometry.scrollWidth > geometry.clientWidth + 1) throw new Error('horizontal overflow at ' + viewport.width);
  if (geometry.actionHeights.some(height => height < 44)) throw new Error('touch target below 44px at ' + viewport.width);
}

await page.getByRole('button', { name: '清空专业' }).click();
await input.fill('机械/测控/材料');
const body = await page.locator('body').innerText();
if (!body.includes('机械') || !body.includes('测控') || !body.includes('材料')) {
  throw new Error('shortcut multi-major input is not recognized');
}

console.log('major-all UX v002 browser journey passed: explicit add flow, shortcut input, PC/Pad/Android geometry');
await browser.close();
