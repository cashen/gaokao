#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || process.env.V3965_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless:true });
const results = [];

function payload(school) {
  return {
    ok:true,
    mode:'recent_reviews',
    scope:'school',
    topic:'general',
    school,
    summary:null,
    reviews:[{ content:`${school} 学生公开留言测试。`, createdAt:'2026-09-17T00:00:00.000Z', authorLabel:'测试留言', likes:0, replies:0 }],
    reviewPagination:{ page:1, hasMore:false },
    schoolMeta:{ id:9527, name:school, province:school.includes('深圳')?'广东省':school.includes('江西')?'江西省':school.includes('辽宁')?'辽宁省':'黑龙江省', city:school.includes('深圳')?'深圳市':school.includes('江西')?'南昌市':school.includes('辽宁')?'鞍山市':'哈尔滨市', type:'本科', reviewCount:1 },
    source:{ name:'测试来源', url:'https://eo.srgaoxiao.com/' },
    fetchedAt:'2026-09-17T00:00:00.000Z',
    transport:'mock-tongxue-social-labels-v005'
  };
}

async function runCase({ name, school, expectLabels = [], expectNoSocialLabels = false }) {
  const context = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error?.stack || error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await context.route('**/api/tongxue-summary*', route => route.fulfill({ status:200, contentType:'application/json; charset=utf-8', body:JSON.stringify(payload(school)) }));
  try {
    await page.goto(`${baseUrl}/tongxue/?school=${encodeURIComponent(school)}&social_label_test=1`, { waitUntil:'domcontentloaded', timeout:60000 });
    await page.waitForFunction(() => globalThis.__TONGXUE_RUNTIME_V159__?.getState?.().ready === true, null, { timeout:20000 });
    await page.waitForFunction(() => ['success','empty','error','region'].includes(document.getElementById('result')?.dataset.viewState || ''), null, { timeout:20000 });
    const details = page.locator('#tongxue-common-name-ui-v004');
    const detailsCount = await details.count();
    const social = page.locator('[data-social-labels-version="school-social-labels-v002.1"] .tongxue-social-label');
    const socialCount = await social.count();
    const socialText = await social.allTextContents();
    if (expectNoSocialLabels) assert.equal(socialCount, 0, `${school} should not receive inferred social labels`);
    for (const label of expectLabels) assert.ok(socialText.includes(label), `${school} should show source label ${label}`);
    if (expectLabels.length) assert.equal(socialCount, expectLabels.length, `${school} source label count changed unexpectedly`);
    results.push({ name, school, detailsCount, socialCount, socialText, errors });
    assert.equal(errors.length, 0, `${school} emitted browser errors: ${errors.join('\n')}`);
  } finally {
    await context.close();
  }
}

await runCase({ name:'source-derived labels are shown for an exact school', school:'哈尔滨工业大学', expectLabels:['101计划','985','国防七子','机械五虎','建筑老八校','强基','双一流','中坚九校','C9','E9'] });
await runCase({ name:'missing source relation stays empty instead of being inferred', school:'辽宁科技大学', expectNoSocialLabels:true });
await runCase({ name:'campus label set follows the source campus relation', school:'哈尔滨工业大学（深圳）', expectLabels:['985','C9','E9','中坚九校','双一流','国防七子','建筑老八校','强基','机械五虎'] });
await runCase({ name:'explicit source-name normalization preserves verified school relation', school:'江西现代职业技术学院', expectLabels:['双高'] });

await browser.close();
console.log(JSON.stringify({ ok:true, version:'tongxue-common-name-v004-social-labels-v002.1', baseUrl, cases:results }, null, 2));