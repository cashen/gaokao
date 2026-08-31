import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.V3965_BASE_URL || 'http://127.0.0.1:8765';
const viewports = [
  { name:'pc-1366', viewport:{ width:1366, height:768 } },
  { name:'pad-820', viewport:{ width:820, height:1180 }, hasTouch:true },
  { name:'android-390', viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true },
  { name:'android-compact-360', viewport:{ width:360, height:740 }, hasTouch:true, isMobile:true }
];

const majorResponse = {
  ok:true,
  scope:'major',
  mode:'major_reviews',
  major:{ code:'080601', name:'电气工程及其自动化', categoryName:'电气类', sourceId:80601 },
  topic:'general',
  reviews:[{
    content:'课程里有电路、电机和控制相关内容，实验和计算都不少。',
    authorLabel:'同学A',
    createdAt:'2026-08-01T00:00:00Z',
    isVerified:true,
    evidenceScope:'major',
    sourceUrl:'https://srgaoxiao.com/'
  }],
  reviewPagination:{ page:1, hasMore:false },
  evidence:{ scope:'cross_school_major', matchCount:1, scannedCount:1, scannedPages:1, sampleLevel:'single_voice' },
  fetchedAt:'2026-08-21T05:00:00.000Z',
  transport:'mock-browser-major-scope',
  version:'student-voice-source-v0.01-test',
  source:{ name:'测试来源', url:'https://srgaoxiao.com/' }
};

const browser = await chromium.launch({ headless:true });
const evidence = [];
try {
  for (const testCase of viewports) {
    const context = await browser.newContext({
      viewport:testCase.viewport,
      hasTouch:Boolean(testCase.hasTouch),
      isMobile:Boolean(testCase.isMobile),
      deviceScaleFactor:1
    });
    const apiRequests = [];
    const pageErrors = [];
    const consoleErrors = [];
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await context.route('**/ln-rank/kb/major-understanding/major-source-profile.generated.js**', route => route.fulfill({
      status:200,
      contentType:'application/javascript; charset=utf-8',
      body:`export function getMajorSourceProfile(code) { return String(code) === '080601' ? {
        whatIs:'电气工程及其自动化是研究电能、电气设备与控制系统的本科专业。',
        whatLearn:'电路、电机、电力系统、自动控制和工程实践。',
        whatDo:'电气设备、控制系统、工程技术与运行维护等方向。',
        careerPath:'电力、电气设备、自动化控制和工程技术服务等方向。',
        sourceUrl:'https://eo.srgaoxiao.cn/major/080601',
        retrievedAt:'2026-08-24'
      } : null; }`
    }));
    await context.route('**/api/tongxue-summary**', route => {
      const url = new URL(route.request().url());
      apiRequests.push(Object.fromEntries(url.searchParams.entries()));
      return route.fulfill({ status:200, contentType:'application/json; charset=utf-8', body:JSON.stringify(majorResponse) });
    });
    try {
      await page.goto(`${baseUrl}/tongxue/`, { waitUntil:'networkidle', timeout:60000 });
      await page.waitForFunction(() => globalThis.__TONGXUE_RUNTIME_V159__?.getState?.().ready === true, null, { timeout:20000 });
      const scopeMajor = page.locator('[data-scope-switch="major"]');
      const scopeSchool = page.locator('[data-scope-switch="school"]');
      assert.equal(await scopeMajor.count(), 1, `${testCase.name}: major scope switch missing`);
      assert.equal(await scopeSchool.getAttribute('aria-selected'), 'true', `${testCase.name}: school should start selected`);
      await scopeMajor.click();
      assert.equal(new URL(page.url()).searchParams.get('scope'), 'major');
      assert.equal(await page.locator('body').getAttribute('data-tongxue-scope'), 'major');
      assert.equal(await page.locator('#school').getAttribute('placeholder'), '输入专业名称、简称或代码');
      assert.equal(await page.locator('[data-scope-examples="major"]').isVisible(), true);
      assert.equal(await page.locator('[data-scope-examples="school"]').isVisible(), false);

      const input = page.locator('#school');
      await input.fill('机械');
      await page.locator('#queryButton').click();
      await page.waitForFunction(() => document.getElementById('result')?.dataset.viewState === 'confirmation');
      assert.ok(await page.locator('[data-major-choice]').count() > 0, `${testCase.name}: fuzzy major choices missing`);
      assert.equal(apiRequests.length, 0, `${testCase.name}: fuzzy input queried before confirmation`);

      await input.fill('机械/电气');
      await page.locator('#queryButton').click();
      await page.waitForFunction(() => document.getElementById('resultTitle')?.textContent?.includes('一次查看一个专业'));
      assert.equal(apiRequests.length, 0, `${testCase.name}: multi-major input queried`);
      assert.match(await page.locator('#result').textContent(), /不会合并查询多个专业/);
      await scopeSchool.click();
      await page.waitForFunction(() => document.getElementById('result')?.dataset.viewState === 'idle');
      await scopeMajor.click();
      await page.waitForFunction(() => new URL(location.href).searchParams.get('scope') === 'major');

      await input.fill('080601');
      await page.waitForFunction(() => document.getElementById('queryButton')?.disabled === false);
      await page.locator('#queryButton').click();
      try {
        await page.waitForFunction(() => document.getElementById('result')?.dataset.viewState === 'success', null, { timeout:20000 });
      } catch (error) {
        const diagnostic = await page.evaluate(() => ({
          url:location.href,
          viewState:document.getElementById('result')?.dataset.viewState || '',
          resultText:document.getElementById('result')?.textContent || '',
          input:(document.getElementById('school'))?.value || '',
          buttonDisabled:Boolean(document.getElementById('queryButton')?.disabled),
          state:globalThis.__TONGXUE_RUNTIME_V159__?.getState?.() || null
        }));
        throw new Error(`${String(error?.message || error)}\n${JSON.stringify({ apiRequests, diagnostic })}`);
      }
      assert.equal(await page.locator('[data-student-voice-scope="major"][data-major-code="080601"]').count(), 1, `${testCase.name}: major result identity missing`);
      assert.equal(apiRequests.length, 1, `${testCase.name}: exact major queried more than once`);
      assert.deepEqual({ scope:apiRequests[0].scope, majorCode:apiRequests[0].majorCode, major:apiRequests[0].major }, {
        scope:'major', majorCode:'080601', major:'电气工程及其自动化'
      });

      await scopeSchool.click();
      await page.waitForFunction(() => document.getElementById('result')?.dataset.viewState === 'idle');
      assert.equal(new URL(page.url()).search, '');
      assert.equal(await page.locator('body').getAttribute('data-tongxue-scope'), 'school');
      assert.equal(await page.locator('#school').getAttribute('placeholder'), '输入学校、简称或地区');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${testCase.name}: horizontal overflow ${overflow}`);
      assert.deepEqual(pageErrors, [], pageErrors.join('\n'));
      assert.deepEqual(consoleErrors, [], consoleErrors.join('\n'));
      evidence.push({ name:testCase.name, apiRequests:apiRequests.length, overflow });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ ok:true, contract:'tongxue-major-scope-browser-v001', devices:evidence }, null, 2));
