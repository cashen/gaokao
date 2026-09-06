import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createDecisionContext, encodeDecisionContext } from '../shared/decision-context/decision-context.v001.js';

const baseUrl = process.env.V3965_BASE_URL || 'http://127.0.0.1:8765';
const viewports = [
  { name:'pc-1366', viewport:{ width:1366, height:768 } },
  { name:'pad-820', viewport:{ width:820, height:1180 }, hasTouch:true },
  { name:'android-390', viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true },
  { name:'android-compact-360', viewport:{ width:360, height:740 }, hasTouch:true, isMobile:true }
];
const sourceContext = createDecisionContext({
  sourceSurface:'ln-rank',
  sourceAction:'view_major_path',
  returnTo:'/ln-rank/?mode=major-all&region=%E6%B2%88%E9%98%B3',
  province:'辽宁',
  admissionYear:2026,
  track:'物理类',
  score:580,
  regionLabel:'沈阳',
  school:'测试大学',
  major:'机械工程',
  majorCode:'080201',
  projectMode:'all',
  candidateIds:['record-1']
});
const dc = encodeDecisionContext(sourceContext);
const browser = await chromium.launch({headless:true});
const evidence = [];
try {
  for (const testCase of viewports) {
    const context = await browser.newContext({viewport:testCase.viewport, hasTouch:Boolean(testCase.hasTouch), isMobile:Boolean(testCase.isMobile), deviceScaleFactor:1});
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await context.route('**/api/tongxue-summary**', route => route.fulfill({
      status:200,
      contentType:'application/json; charset=utf-8',
      body:JSON.stringify({
        ok:true,scope:'major',mode:'major_reviews',
        major:{code:'080201',name:'机械工程',categoryName:'机械类'},
        reviews:[{content:'机械原理、工程制图和实验都不少。',authorLabel:'同学A',createdAt:'2026-08-01T00:00:00Z',evidenceScope:'major',sourceUrl:'https://srgaoxiao.com/'}],
        reviewPagination:{page:1,hasMore:false},
        evidence:{scope:'cross_school_major',matchCount:1,scannedCount:1,scannedPages:1,sampleLevel:'single_voice'},
        fetchedAt:'2026-08-21T05:00:00.000Z',transport:'mock',version:'test',
        source:{name:'测试来源',url:'https://srgaoxiao.com/'}
      })
    }));
    await page.goto(`${baseUrl}/aiplus/?dc=${encodeURIComponent(dc)}`, {waitUntil:'networkidle', timeout:60000});
    await page.waitForSelector('#decisionContextStrip:not([hidden])', {timeout:20000});
    const aiText = await page.locator('#decisionContextStrip').textContent();
    assert.match(aiText,/580分/,`${testCase.name}: AIPLuS lost score context`);
    assert.match(aiText,/不会自动修改家庭方案/,`${testCase.name}: AIPLuS missing readonly boundary`);

    await page.goto(`${baseUrl}/tongxue/?scope=major&majorCode=080201&major=%E6%9C%BA%E6%A2%B0%E5%B7%A5%E7%A8%8B&dc=${encodeURIComponent(dc)}`, {waitUntil:'networkidle', timeout:60000});
    await page.waitForSelector('[data-decision-context-strip="readonly"]', {timeout:20000});
    const tongxueText = await page.locator('[data-decision-context-strip="readonly"]').textContent();
    assert.match(tongxueText,/580分/,`${testCase.name}: Tongxue lost score context`);
    assert.match(tongxueText,/跨校同专业留言，不代表某一所学校/,`${testCase.name}: Tongxue scope boundary missing`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1,`${testCase.name}: horizontal overflow ${overflow}`);
    assert.deepEqual(pageErrors,[],pageErrors.join('\n'));
    assert.deepEqual(consoleErrors,[],consoleErrors.join('\n'));
    evidence.push({name:testCase.name,overflow});
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({ok:true,contract:'cross-module-journey-browser-v0.01',devices:evidence},null,2));
