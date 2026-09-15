import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL='http://127.0.0.1:4173/ln-rank/simulation-report.html';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
const page=await context.newPage();
const requests=[];
const responseDelay=700;

await page.route('**/api/ai/major-history**',async route=>{
  const url=new URL(route.request().url());const majors=url.searchParams.getAll('major');const school=url.searchParams.get('schoolKeyword')||'';
  requests.push({school,majors,started:Date.now()});
  await new Promise(resolve=>setTimeout(resolve,responseDelay));
  const codeMap={自动化:'080801',机械工程:'080201',机械电子工程:'080204'};
  const allowed=school.includes('东北大学')?['自动化','机械工程','机械电子工程']:[];
  const records=majors.filter(name=>allowed.includes(name)).map(name=>({id:`${school}-${name}`,school,major:name,standardMajorName:name,majorCode2026:codeMap[name]||'',standardMajorCode:codeMap[name]||''}));
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,records,total:records.length,complete:true})});
});

await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/添加志愿/}).first().click();
const card=page.locator('.volunteer-card').last();const school=card.locator('[data-field="school"]');const major=card.locator('[data-field="majorCode"]');const helper=card.locator('[data-v017-helper]');

const t0=performance.now();await school.fill('东北大学');await page.waitForFunction(el=>el?.value==='东北大学',await school.elementHandle());assert.ok(performance.now()-t0<250,'school input must update immediately without resolver/network');
await card.locator('[data-v017-school-choice="东北大学"]').waitFor({state:'visible',timeout:5000});
await card.locator('[data-v017-school-choice="东北大学"]').click();await page.waitForFunction(el=>/已确认学校：东北大学/.test(el?.textContent||''),await helper.elementHandle(),{timeout:5000});

const m0=performance.now();await major.fill('机械');await card.locator('[data-v017-major]').waitFor({state:'visible',timeout:350});assert.ok(performance.now()-m0<350,'major local feedback must render without network');
assert.match(await card.locator('[data-v017-major]').textContent(),/专业目录候选/);
await page.waitForFunction(el=>/找到|东北大学/.test(el?.textContent||''),await helper.elementHandle(),{timeout:5000});
const firstMajorRequests=requests.filter(x=>x.school==='东北大学');assert.equal(firstMajorRequests.length,1,'major verification must use one request, not serial fan-out');assert.ok(firstMajorRequests[0].majors.length>=1&&firstMajorRequests[0].majors.length<=12);

const previousRequestCount=requests.length;await major.fill('机');await major.fill('机械');await major.fill('机械工');await page.waitForTimeout(900);const newRequests=requests.slice(previousRequestCount);assert.ok(newRequests.length<=2,'rapid major typing must cancel stale verification rather than create linear request fan-out');

const schoolSwitchBefore=requests.length;await school.fill('');await school.fill('大工');await card.locator('[data-v017-school-choice="大连理工大学"]').waitFor({state:'visible',timeout:5000});await card.locator('[data-v017-school-choice="大连理工大学"]').click();await page.waitForFunction(el=>/已确认学校：大连理工大学/.test(el?.textContent||''),await helper.elementHandle(),{timeout:5000});assert.ok(requests.length>=schoolSwitchBefore);
await major.fill('机械');await page.waitForTimeout(200);assert.doesNotMatch(await card.locator('[data-v017-major]').textContent(),/东北大学 · 仅显示该校实际专业记录/);assert.doesNotMatch(await helper.textContent(),/东北大学/);

console.log(JSON.stringify({ok:true,schoolInputMs:'<250ms',majorLocalFeedbackMs:'<350ms',firstMajorRequests:firstMajorRequests.length,firstRequestMajorCount:firstMajorRequests[0].majors.length,newRequestsDuringRapidTyping:newRequests.length,schoolSwitchPreserved:true}));
await browser.close();
