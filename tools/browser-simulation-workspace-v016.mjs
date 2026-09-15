import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const viewports=[{name:'android',width:390,height:844},{name:'pad',width:768,height:1024},{name:'desktop',width:1280,height:900}];
for(const viewport of viewports){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},locale:'zh-CN',isMobile:viewport.name!=='desktop'});
  await context.addInitScript(()=>{localStorage.clear();localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify({version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'555',rank:10000,volunteers:[{id:'v016-1',order:1,school:'',majorCode:'',majorName:'',confirmedSchool:'',familyStatus:'待讨论',history:{years:{}}}],selectionPool:[]}))});
  const page=await context.newPage();
  const errors=[];const requests=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(r.url().includes('/api/ai/major-history'))requests.push(r.url())});
  await page.route('**/api/ai/major-history**',async route=>{const u=new URL(route.request().url());const majorInputs=u.searchParams.getAll('major');const major=(majorInputs[0]||'');const school=u.searchParams.get('schoolKeyword')||'';if(major.includes('网络失败')){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,message:'mock unavailable'})});return}const records=school.includes('东北大学')?[{school:'东北大学',standardMajorName:'自动化',majorCode2026:'080801'},{school:'东北大学',standardMajorName:'机械工程',majorCode2026:'080201'},{school:'东北大学',standardMajorName:'机械设计制造及其自动化',majorCode2026:'080202'},{school:'东北大学',standardMajorName:'机械电子工程',majorCode2026:'080204'}].filter(r=>!majorInputs.length||majorInputs.includes(r.standardMajorName)||r.standardMajorName.includes(major)||r.majorCode2026.startsWith(major)):[];await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,records})})});
  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForSelector('.volunteer-card[data-card-id="v016-1"]',{timeout:10000});
  const school=page.locator('[data-field="school"]').first();const major=page.locator('[data-field="majorCode"]').first();const helper=page.locator('[data-v017-helper]').first();
  const started=performance.now();await school.fill('东北大学');await page.waitForFunction(el=>el?.value==='东北大学',await school.elementHandle());assert.ok(performance.now()-started<250,`${viewport.name}: school input must update without waiting`);
  await page.locator('[data-v017-school-choice="东北大学"]').first().waitFor({state:'visible',timeout:5000});await page.locator('[data-v017-school-choice="东北大学"]').first().click();await page.waitForFunction(el=>/已确认学校：东北大学/.test(el?.textContent||''),await helper.elementHandle(),{timeout:5000});
  const majorStarted=performance.now();await major.fill('');await major.pressSequentially('机械',{delay:15});await page.locator('[data-v017-major]').first().waitFor({state:'visible',timeout:350});assert.ok(performance.now()-majorStarted<350,`${viewport.name}: major local candidates must render without network`);await page.waitForFunction(el=>el?.textContent?.includes('东北大学')||el?.textContent?.includes('找到'),await helper.elementHandle(),{timeout:5000});
  const majorRequests=requests.filter(url=>new URL(url).searchParams.get('schoolKeyword')==='东北大学');assert.equal(majorRequests.length,1,`${viewport.name}: first major verification must be one bounded request`);assert.ok(new URL(majorRequests[0]).searchParams.getAll('major').length<=12);
  const choice=page.locator('[data-v017-major-code]').filter({hasText:'机械工程'}).first();await choice.waitFor({state:'visible',timeout:3000});await choice.click();await page.waitForFunction(el=>el?.textContent?.includes('已确认：东北大学'),await helper.elementHandle(),{timeout:3000});
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers[0]);assert.equal(persisted.school,'东北大学');assert.equal(persisted.confirmedSchool,'东北大学');assert.equal(persisted.majorName,'机械工程');
  await major.fill('');await major.dispatchEvent('compositionstart');await major.evaluate(el=>{el.value='机械';el.dispatchEvent(new Event('input',{bubbles:true}))});await major.dispatchEvent('compositionend');await page.waitForTimeout(700);assert.equal(await major.inputValue(),'机械');
  await major.fill('网络失败');await page.waitForTimeout(700);assert.match(await helper.textContent(),/在线核对|无法在线|继续输入/);
  await school.fill('');await school.fill('大工');const localSchoolBox=school.locator('xpath=..');await localSchoolBox.locator('[data-v017-school-choice="大连理工大学"]').waitFor({state:'visible',timeout:5000});await localSchoolBox.locator('[data-v017-school-choice="大连理工大学"]').click();await page.waitForFunction(el=>/已确认学校：大连理工大学/.test(el?.textContent||''),await helper.elementHandle(),{timeout:5000});
  await major.fill('机械');await page.waitForTimeout(200);assert.doesNotMatch(await page.locator('[data-v017-major]').first().textContent(),/东北大学 · 仅显示该校实际专业记录/);assert.doesNotMatch(await helper.textContent(),/东北大学/);
  await major.fill('');await major.fill('车辆工程');await page.waitForTimeout(500);assert.doesNotMatch(await helper.textContent(),/已确认.*车辆工程/);assert.equal(errors.length,0,`${viewport.name}: page errors: ${errors.join('\n')}`);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.volunteer-card',{timeout:10000});assert.ok((await page.locator('body').innerText()).length>0,`${viewport.name}: refresh should recover draft`);
  await browser.close();
}

{
  const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1280,height:900},locale:'zh-CN'});
  await context.addInitScript(()=>{localStorage.clear();localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify({version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'',volunteers:[{id:'inbound-1',order:1,school:'',majorCode:'',majorName:'',familyStatus:'待讨论',history:{years:{}}}],selectionPool:[]}))});
  const page=await context.newPage();await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html?school=%E4%B8%9C%E5%8C%97%E5%A4%A7%E5%AD%A6&majorCode=080301&majorName=%E8%87%AA%E5%8A%A8%E5%8C%96',{waitUntil:'domcontentloaded',timeout:15000});await page.waitForTimeout(700);assert.match(await page.locator('body').innerText(),/代码与专业名称不一致/);await browser.close();
}

{
  const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1280,height:900},locale:'zh-CN'});
  await context.addInitScript(()=>{localStorage.clear();localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify({version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'',volunteers:[{id:'duplicate-1',order:1,school:'东北大学',majorCode:'080801',majorName:'自动化',familyStatus:'待讨论',history:{years:{}}}],selectionPool:[]}))});
  const page=await context.newPage();await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html?school=%E4%B8%9C%E5%8C%97%E5%A4%A7%E5%AD%A6&majorCode=080801&majorName=%E8%87%AA%E5%8A%A8%E5%8C%96',{waitUntil:'domcontentloaded',timeout:15000});await page.waitForTimeout(700);assert.equal(await page.locator('.volunteer-card').count(),1);assert.match(await page.locator('body').innerText(),/已经在志愿 1/);await browser.close();
}

console.log('simulation-workspace-v016.31 browser: PASS');
