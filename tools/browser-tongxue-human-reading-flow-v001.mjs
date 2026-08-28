import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { encodeDecisionContext, validateDecisionContext } from '../shared/decision-context/decision-context.v001.js';

const baseUrl = process.env.V3965_BASE_URL || 'http://127.0.0.1:8765';
const viewports = [
  { name:'pc-1366', viewport:{ width:1366, height:768 } },
  { name:'pad-820', viewport:{ width:820, height:1180 }, hasTouch:true },
  { name:'android-390', viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true },
  { name:'android-compact-360', viewport:{ width:360, height:740 }, hasTouch:true, isMobile:true }
];

const expectedReturnTo = '/ln-rank/?mode=school-all&schoolSort=position-near&school=沈阳建筑大学&score=562';
const decisionContext = validateDecisionContext({
  contextId:'human-reading-flow-test',
  sourceSurface:'ln-rank',
  sourceAction:'view_student_voice',
  createdAt:'2026-08-28T00:00:00.000Z',
  returnTo:expectedReturnTo,
  province:'辽宁',
  admissionYear:2026,
  track:'物理类',
  score:562,
  school:'沈阳建筑大学',
  major:'电气工程及其自动化',
  majorCode:'080601',
  projectMode:'ordinary-only',
  candidateIds:['沈阳建筑大学-电气工程及其自动化-562-27032']
});
const encodedDecisionContext = encodeDecisionContext(decisionContext);
const schoolContext = validateDecisionContext({
  contextId:'human-reading-school-test',
  sourceSurface:'ln-rank',
  sourceAction:'view_student_voice',
  createdAt:'2026-08-28T00:00:00.000Z',
  returnTo:'/ln-rank/?score=562',
  province:'辽宁',
  admissionYear:2026,
  track:'物理类',
  score:562,
  school:'吉林大学'
});
const encodedSchoolContext = encodeDecisionContext(schoolContext);

function schoolResponse() {
  return {
    ok:true,
    mode:'ai_summary',
    school:'吉林大学',
    schoolMeta:{ name:'吉林大学', province:'吉林省', city:'长春市', type:'综合类', reviewCount:53 },
    summary:'学生常提到校园资源丰富、学习节奏较快。宿舍和具体校区安排需要结合专业继续核对。',
    evidence:{ matchCount:5, scannedCount:12, scannedPages:2 },
    studentEvidence:[{
      id:'school-review-1',
      content:'校园资源比较丰富，课程节奏也比较快，具体体验还要看专业和校区。',
      authorLabel:'同学A',
      createdAt:'2026-08-01T00:00:00Z',
      sourceUrl:'https://srgaoxiao.com/'
    }],
    fetchedAt:'2026-08-21T05:00:00.000Z',
    transport:'mock-human-reading-school',
    version:'student-voice-source-v0.01-test',
    source:{ name:'测试来源', url:'https://srgaoxiao.com/' }
  };
}

function majorResponse() {
  return {
    ok:true,
    scope:'major',
    mode:'major_reviews',
    major:{ code:'080601', name:'电气工程及其自动化', categoryName:'电气类', sourceId:80601 },
    topic:'general',
    reviews:[{
      id:'major-review-1',
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
    transport:'mock-human-reading-major',
    version:'student-voice-source-v0.01-test',
    source:{ name:'测试来源', url:'https://srgaoxiao.com/' }
  };
}

async function openPage(browser, testCase, path) {
  const context = await browser.newContext({
    viewport:testCase.viewport,
    hasTouch:Boolean(testCase.hasTouch),
    isMobile:Boolean(testCase.isMobile),
    deviceScaleFactor:1
  });
  const pageErrors = [];
  const consoleErrors = [];
  const moduleRequests = [];
  const apiRequests = [];
  pageErrors.length = 0;
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.includes('tongxue-runtime-result-view-v159.js')) moduleRequests.push(url);
    if (url.pathname === '/api/tongxue-summary') apiRequests.push(url);
  });
  await context.route('**/ln-rank/kb/major-understanding/major-source-profile.generated.js**', route => route.fulfill({
    status:200,
    contentType:'application/javascript; charset=utf-8',
    body:`export const MAJOR_SOURCE_PROFILE_META = { version:'pr194-major-source-profile-v001', source:'eo.srgaoxiao.cn' };
export function getMajorSourceProfile(code) { return String(code) === '080601' ? {
      whatIs:'电气工程及其自动化是研究电能、电气设备与控制系统的本科专业。',
      whatLearn:'电路、电机、电力系统、自动控制和工程实践。',
      whatDo:'电气设备、控制系统、工程技术与运行维护等方向。',
      careerPath:'电力、电气设备、自动化控制和工程技术服务等方向。',
      sourceUrl:'https://eo.srgaoxiao.cn/major/080601',
      retrievedAt:'2026-08-24'
    } : null; }
export function majorSourceInterpretation(code) {
  const profile = getMajorSourceProfile(code);
  return profile ? { available:true, status:'verified', source:{ site:'eo.srgaoxiao.cn', url:profile.sourceUrl, retrievedAt:profile.retrievedAt }, fields:profile } : { available:false, status:'missing', source:null, fields:{} };
}`
  }));
  await context.route('**/api/tongxue-summary**', route => {
    const url = new URL(route.request().url());
    return route.fulfill({
      status:200,
      contentType:'application/json; charset=utf-8',
      body:JSON.stringify(url.searchParams.get('scope') === 'major' ? majorResponse() : schoolResponse())
    });
  });
  await page.goto(`${baseUrl}${path}`, { waitUntil:'domcontentloaded', timeout:60000 });
  await page.waitForFunction(() => globalThis.__TONGXUE_RUNTIME_V159__?.getState?.().ready === true, null, { timeout:20000 });
  await page.waitForFunction(() => ['success','empty','error','region'].includes(document.getElementById('result')?.dataset.viewState || ''), null, { timeout:20000 });
  return { context, page, pageErrors, consoleErrors, moduleRequests, apiRequests };
}

async function finish(opened, name) {
  const { context, page, pageErrors, consoleErrors, moduleRequests } = opened;
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${name}: horizontal overflow ${overflow}`);
  assert.deepEqual(pageErrors, [], `${name}: ${pageErrors.join('\n')}`);
  assert.deepEqual(consoleErrors, [], `${name}: ${consoleErrors.join('\n')}`);
  const resultModule = moduleRequests.at(-1);
  assert.equal(resultModule?.searchParams.get('v'), '159-flow004', `${name}: result cache identity drift`);
  assert.equal(resultModule?.searchParams.get('r'), 'r040-human-reading-flow', `${name}: UI cache revision drift`);
  await context.close();
  return { overflow, resultView:`${resultModule?.searchParams.get('v')}&${resultModule?.searchParams.get('r')}` };
}

const browser = await chromium.launch({ headless:true });
const evidence = [];
try {
  for (const testCase of viewports) {
    const manual = await openPage(browser, testCase, '/tongxue/?q=%E5%90%89%E6%9E%97%E5%A4%A7%E5%AD%A6');
    assert.equal(manual.apiRequests.length, 1, `${testCase.name}: manual school query count`);
    assert.equal(await manual.page.locator('#resultTitle').textContent(), '吉林大学', `${testCase.name}: manual school result`);
    assert.equal(await manual.page.locator('.hero-logo-link').isVisible(), false, `${testCase.name}: duplicate hero still visible after result`);
    assert.equal(await manual.page.locator('.hero').isVisible(), true, `${testCase.name}: compact search rail disappeared`);
    const compactRailLimit = testCase.name.startsWith('android') ? 260 : 180;
    assert.ok(await manual.page.locator('.hero').evaluate((node, limit) => node.getBoundingClientRect().height < limit, compactRailLimit), `${testCase.name}: result search rail is not compact`);
    const manualEvidence = await finish(manual, `${testCase.name}/manual-school`);

    const school = await openPage(browser, testCase, `/tongxue/?school=%E5%90%89%E6%9E%97%E5%A4%A7%E5%AD%A6&dc=${encodeURIComponent(encodedSchoolContext)}`);
    const schoolStrip = school.page.locator('[data-decision-context-strip]');
    assert.equal(await schoolStrip.count(), 1, `${testCase.name}: school context strip missing`);
    assert.equal(await schoolStrip.locator('.decision-context-return').getAttribute('href'), '/ln-rank/?score=562', `${testCase.name}: school return target`);
    assert.match(await school.page.locator('#result').textContent(), /学校公开体验/);
    assert.doesNotMatch(await school.page.locator('#result').textContent(), /电气工程及其自动化/);
    assert.equal(await schoolStrip.evaluate(node => getComputedStyle(node).borderLeftWidth), '4px', `${testCase.name}: school context rendered as raw text`);
    const schoolEvidence = await finish(school, `${testCase.name}/direct-school`);

    const major = await openPage(browser, testCase, `/tongxue/?scope=major&majorCode=080601&major=%E7%94%B5%E6%B0%94%E5%B7%A5%E7%A8%8B%E5%8F%8A%E5%85%B6%E8%87%AA%E5%8A%A8%E5%8C%96&returnTo=${encodeURIComponent(expectedReturnTo)}&dc=${encodeURIComponent(encodedDecisionContext)}`);
    const majorStrip = major.page.locator('[data-decision-context-strip]');
    assert.equal(await majorStrip.count(), 1, `${testCase.name}: major context strip missing`);
    assert.match(await major.page.locator('#result').textContent(), /跨学校专业体验/);
    assert.match(await major.page.locator('#result').textContent(), /不同学校的学生/);
    const pathwayHref = await major.page.locator('[data-major-pathway-full-link]').getAttribute('href');
    const pathwayUrl = new URL(pathwayHref, major.page.url());
    assert.equal(pathwayUrl.pathname, '/major-path/', `${testCase.name}: pathway target`);
    assert.equal(decodeURIComponent(pathwayUrl.searchParams.get('returnTo')), expectedReturnTo, `${testCase.name}: pathway returnTo lost`);
    assert.equal(pathwayUrl.searchParams.get('dc'), encodedDecisionContext, `${testCase.name}: pathway decision context lost`);
    assert.equal(await major.page.locator('.hero').isVisible(), false, `${testCase.name}: direct major hero visible`);
    await major.page.goto(`${baseUrl}${pathwayUrl.pathname}${pathwayUrl.search}`, { waitUntil:'domcontentloaded', timeout:60000 });
    try {
      await major.page.waitForFunction(() => document.body.dataset.majorPathDirect === 'major-path-human-v0.04', null, { timeout:20000 });
    } catch (error) {
      const diagnostic = await major.page.evaluate(() => ({
        url:location.href,
        majorPathDirect:document.body.dataset.majorPathDirect || '',
        majorPathClass:document.body.className,
        resultText:document.getElementById('result')?.textContent?.slice(0, 500) || '',
        sourceScript:[...document.scripts].map(script => script.src).filter(Boolean)
      }));
      throw new Error(`${testCase.name}: major-path direct boot timeout\n${JSON.stringify(diagnostic)}\n${major.pageErrors.join('\n')}\n${String(error?.message || error)}`);
    }
    assert.equal(await major.page.locator('body').evaluate(node => node.classList.contains('major-path-direct')), true, `${testCase.name}: Tongxue did not direct-boot major path`);
    const majorPathBack = new URL(await major.page.locator('.back-home').getAttribute('href'), major.page.url());
    assert.equal(decodeURIComponent(majorPathBack.pathname + majorPathBack.search), expectedReturnTo, `${testCase.name}: major path return button lost context`);
    const majorEvidence = await finish(major, `${testCase.name}/direct-major`);
    evidence.push({ device:testCase.name, manualSchool:manualEvidence, directSchool:schoolEvidence, directMajor:majorEvidence });
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ ok:true, contract:'tongxue-human-reading-flow-browser-v001', devices:evidence }, null, 2));
