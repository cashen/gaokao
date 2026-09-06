import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.V3965_BASE_URL || 'http://127.0.0.1:8765';
const expectedReturnTo = '/ln-rank/?mode=school-all&schoolSort=position-near&school=沈阳建筑大学';
const sourceKey = '沈阳建筑大学-电气工程及其自动化-562-27032';
const viewports = [
  { name:'pc-1366', viewport:{ width:1366, height:768 } },
  { name:'pad-820', viewport:{ width:820, height:1180 }, hasTouch:true },
  { name:'android-390', viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true },
  { name:'android-compact-360', viewport:{ width:360, height:740 }, hasTouch:true, isMobile:true }
];

function responseForMajor() {
  return {
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
    transport:'mock-browser-major',
    version:'student-voice-source-v0.01-test',
    source:{ name:'测试来源', url:'https://srgaoxiao.com/' }
  };
}

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
    const moduleRequests = [];
    const apiRequests = [];
    const pageErrors = [];
    const consoleErrors = [];
    const page = await context.newPage();
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/tongxue/app/tongxue-runtime-controller-v159.js' || url.pathname === '/tongxue/app/tongxue-runtime-result-view-v159.js') {
        moduleRequests.push({ path:url.pathname, version:url.searchParams.get('v') || '' });
      }
    });
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await context.route('**/ln-rank/kb/major-understanding/major-source-profile.generated.js**', route => route.fulfill({
      status:200,
      contentType:'application/javascript; charset=utf-8',
      body:`export function getMajorSourceProfile(code) {
  return String(code) === '080601' ? {
    whatIs:'电气工程及其自动化是研究电能、电气设备与控制系统的本科专业。',
    whatLearn:'电路、电机、电力系统、自动控制和工程实践。',
    whatDo:'电气设备、控制系统、工程技术与运行维护等方向。',
    careerPath:'电力、电气设备、自动化控制和工程技术服务等方向。',
    sourceUrl:'https://eo.srgaoxiao.cn/major/080601',
    retrievedAt:'2026-08-24'
  } : null;
}`
    }));

    await context.route('**/api/tongxue-summary**', route => {
      const url = new URL(route.request().url());
      apiRequests.push(Object.fromEntries(url.searchParams.entries()));
      return route.fulfill({
        status:200,
        contentType:'application/json; charset=utf-8',
        body:JSON.stringify(responseForMajor())
      });
    });

    try {
      const params = new URLSearchParams({
        scope:'major',
        majorCode:'080601',
        major:'电气工程及其自动化',
        sourceKey,
        context:'school',
        returnTo:expectedReturnTo
      });
      await page.goto(`${baseUrl}/tongxue/?${params}`, { waitUntil:'networkidle', timeout:60000 });
      await page.waitForFunction(() => globalThis.__TONGXUE_RUNTIME_V159__?.getState?.().ready === true, null, { timeout:20000 });
      await page.waitForSelector('[data-student-voice-scope="major"][data-major-code="080601"]', { timeout:20000 });

      const state = await page.evaluate(() => globalThis.__TONGXUE_RUNTIME_V159__.getState());
      assert.equal(state.voiceScope, 'major', `${testCase.name}: direct handoff did not enter major scope`);
      assert.equal(state.currentMajorCode, '080601', `${testCase.name}: major code lost`);
      assert.equal(state.currentMajorName, '电气工程及其自动化', `${testCase.name}: major name lost`);
      assert.equal(documentSafe(await page.locator('#result').getAttribute('data-view-state')), 'success');
      assert.match(await page.locator('#resultTitle').textContent(), /电气工程及其自动化/);
      const resultText = await page.locator('#result').textContent();
      assert.match(resultText, /不同学校的学生/);
      assert.match(resultText, /跨校同专业留言|不同学校学生留言/);
      assert.doesNotMatch(resultText, /provenance|AI总结/);
      assert.doesNotMatch(resultText, /eo\.srgaoxiao\.cn|抓取日期：/);
      assert.equal(await page.locator('[data-major-pathway="080601"]').count(), 1, `${testCase.name}: pathway surface missing`);
      const footerSource = page.locator('[data-major-source-footer-note]');
      assert.equal(await footerSource.count(), 1, `${testCase.name}: footer source slot missing`);
      assert.equal(await footerSource.isVisible(), true, `${testCase.name}: footer source attribution is not visible after profile success`);
      assert.match(await footerSource.textContent(), /eo\.srgaoxiao\.cn/);
      assert.match(await footerSource.textContent(), /抓取日期：2026-08-24/);

      assert.equal(apiRequests.length, 1, `${testCase.name}: direct handoff submitted ${apiRequests.length} API requests`);
      assert.equal(apiRequests[0].scope, 'major');
      assert.equal(apiRequests[0].majorCode, '080601');
      assert.equal(apiRequests[0].major, '电气工程及其自动化');
      assert.equal(apiRequests[0].page, '1');

      const current = new URL(page.url());
      assert.equal(current.searchParams.get('returnTo'), expectedReturnTo, `${testCase.name}: returnTo changed`);
      assert.equal(current.searchParams.get('sourceKey'), sourceKey, `${testCase.name}: sourceKey changed`);
      assert.equal((current.href.match(/https:\/\/gaokao\.powers\.org\.cn\/tongxue\//g) || []).length, 0, `${testCase.name}: target contains concatenated production Tongxue URL`);

      const controllerRequest = moduleRequests.find(item => item.path.endsWith('tongxue-runtime-controller-v159.js'));
      const resultViewRequest = moduleRequests.find(item => item.path.endsWith('tongxue-runtime-result-view-v159.js'));
      assert.equal(controllerRequest?.version, '159-startup001', `${testCase.name}: stale controller cache identity used`);
      assert.equal(resultViewRequest?.version, '159-flow006', `${testCase.name}: stale result-view cache identity used`);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${testCase.name}: horizontal overflow ${overflow}`);
      assert.deepEqual(pageErrors, [], pageErrors.join('\n'));
      assert.deepEqual(consoleErrors, [], consoleErrors.join('\n'));
      evidence.push({ name:testCase.name, controllerVersion:controllerRequest.version, resultViewVersion:resultViewRequest.version, apiRequests:apiRequests.length, overflow });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

function documentSafe(value) {
  return String(value || '');
}

console.log(JSON.stringify({
  ok:true,
  contract:'tongxue-major-direct-browser-v0.01',
  scenario:'沈阳建筑大学 → 电气工程及其自动化 → 跨校同专业留言',
  returnTo:expectedReturnTo,
  devices:evidence
}, null, 2));
