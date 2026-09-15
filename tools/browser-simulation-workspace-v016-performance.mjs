import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL='http://127.0.0.1:4173/ln-rank/simulation-report.html';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
const page=await context.newPage();
const requests=[];
const responseDelay=700;

await page.route('**/api/ai/major-history**',async route=>{
  const url=new URL(route.request().url());
  const majors=url.searchParams.getAll('major');
  const school=url.searchParams.get('schoolKeyword')||'';
  requests.push({school,majors});
  await new Promise(resolve=>setTimeout(resolve,responseDelay));
  const codeMap={自动化:'080801',机械工程:'080201',机械电子工程:'080204'};
  const allowed=school.includes('东北大学')?['自动化','机械工程','机械电子工程']:[];
  const records=majors.filter(name=>allowed.includes(name)).map(name=>({
    id:`${school}-${name}`,
    school,
    major:name,
    standardMajorName:name,
    majorCode2026:codeMap[name]||'',
    standardMajorCode:codeMap[name]||''
  }));
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,records,total:records.length,complete:true})});
});

await page.goto(baseURL,{waitUntil:'domcontentloaded'});
await page.getByRole('button',{name:/添加志愿/}).first().click();
const card=page.locator('.volunteer-card').last();
const school=card.locator('[data-field="school"]');
const major=card.locator('[data-field="majorCode"]');

const t0=Date.now();
await school.fill('东北大学');
await page.waitForFunction(el=>el?.value==='东北大学',await school.elementHandle());
const immediateMs=Date.now()-t0;
assert.ok(immediateMs<250,'school input must update immediately without waiting for resolver/network');
assert.match(await card.locator('[data-v017-helper]').textContent(),/查找学校候选/);
await card.locator('[data-v017-school-choice="东北大学"]').waitFor({state:'visible',timeout:2500});

await card.locator('[data-v017-school-choice="东北大学"]').click();
await card.locator('[data-v017-helper]').waitFor({state:'visible'});
await page.waitForFunction(el=>el?.textContent?.includes('已确认学校'),await card.locator('[data-v017-helper]').elementHandle(),{timeout:2500});

await major.fill('机械');
await card.locator('[data-v017-major]').waitFor({state:'visible',timeout:350});
assert.match(await card.locator('[data-v017-major]').textContent(),/专业目录候选|东北大学/,'major candidates must render before slow fact response');
await card.locator('[data-v017-major-code]').first().waitFor({state:'visible',timeout:2500});

const majorRequestCountAfterFirst= requests.length;
assert.equal(majorRequestCountAfterFirst,1,'major verification should use one multi-major request, not serial fan-out');
assert.ok(requests[0].majors.length>=1 && requests[0].majors.length<=12,'multi-major request must stay bounded');

const firstMajorChoice=card.locator('[data-v017-major-code]').filter({hasText:'机械工程'}).first();
await firstMajorChoice.waitFor({state:'visible',timeout:1500});
await firstMajorChoice.click();
await page.waitForFunction(el=>el?.textContent?.includes('已确认：东北大学'),await card.locator('[data-v017-helper]').elementHandle(),{timeout:2500});

await school.fill('大连理工大学');
await card.locator('[data-v017-school-choice="大连理工大学"]').waitFor({state:'visible',timeout:2500});
await card.locator('[data-v017-school-choice="大连理工大学"]').click();
await page.waitForFunction(el=>el?.textContent?.includes('已确认学校：大连理工大学'),await card.locator('[data-v017-helper]').elementHandle(),{timeout:2500});

await major.fill('机械');
await page.waitForTimeout(120);
assert.doesNotMatch(await card.locator('[data-v017-major]').textContent(),/东北大学 · 仅显示该校实际专业记录/,'old school fact label must not survive school switch');
await page.waitForFunction(el=>el?.textContent?.includes('暂未找到')||el?.hidden===true,await card.locator('[data-v017-major]').elementHandle(),{timeout:2500});

await browser.close();
console.log(JSON.stringify({ok:true,immediateInputMs:immediateMs,majorRequests:requests.length,firstRequestMajorCount:requests[0].majors.length}));
