import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const viewports=[{name:'android',width:390,height:844},{name:'pad',width:768,height:1024},{name:'desktop',width:1280,height:900}];
for(const viewport of viewports){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},locale:'zh-CN'});
  await context.addInitScript(()=>{localStorage.clear();localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify({version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'555',rank:10000,volunteers:[{id:'v016-1',order:1,school:'',majorCode:'',majorName:'',familyStatus:'待讨论',history:{years:{}}}],selectionPool:[]}))});
  const page=await context.newPage();
  const errors=[];const requests=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(r.url().includes('/api/ai/major-history'))requests.push(r.url())});
  await page.route('**/api/ai/major-history**',async route=>{const u=new URL(route.request().url());const major=u.searchParams.get('major')||'';const school=u.searchParams.get('schoolKeyword')||'';if(major.includes('网络失败')){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,message:'mock unavailable'})});return}const records=school.includes('东北大学')?[{school:'东北大学',standardMajorName:'自动化',majorCode2026:'080801'},{school:'东北大学',standardMajorName:'机械工程',majorCode2026:'080201'},{school:'东北大学',standardMajorName:'机械设计制造及其自动化',majorCode2026:'080202'},{school:'东北大学',standardMajorName:'机械电子工程',majorCode2026:'080204'}].filter(r=>!major||r.standardMajorName.includes(major)||r.majorCode2026.startsWith(major)):[];await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,records})})});
  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForSelector('.volunteer-card[data-card-id="v016-1"]',{timeout:10000});
  const school=page.locator('[data-field="school"]').first();const major=page.locator('[data-field="majorCode"]').first();const helper=page.locator('[data-v015-helper]').first();
  await major.fill('机械');await page.waitForTimeout(100);assert.ok(await page.locator('[data-v015-major]').first().isVisible(),`${viewport.name}: 机械输入应立即有目录反馈`);
  await school.fill('东北大学');await page.waitForTimeout(500);const choices=page.locator('[data-v015-school-choice]');assert.ok(await choices.count(),`${viewport.name}: 学校候选必须可确认`);await choices.first().click();
  await major.fill('');await major.pressSequentially('自动化',{delay:15});await page.waitForTimeout(700);assert.equal(await major.inputValue(),'自动化');assert.match(await page.locator('body').innerText(),/自动化/);
  await major.fill('');await major.dispatchEvent('compositionstart');await major.evaluate(el=>{el.value='机械';el.dispatchEvent(new Event('input',{bubbles:true}))});await major.dispatchEvent('compositionend');await page.waitForTimeout(700);assert.equal(await major.inputValue(),'机械');assert.match(await helper.textContent(),/找到|核对|实际专业/);
  await major.fill('');await major.evaluate(el=>{el.focus();const dt=new DataTransfer();dt.setData('text/plain','080301');el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:dt}));el.value='080301';el.dispatchEvent(new Event('input',{bubbles:true,inputType:'insertFromPaste'}))});assert.equal(await major.inputValue(),'080301');
  for(let i=0;i<4;i++)await major.press('Backspace');assert.equal(await major.inputValue(),'08');await major.press('Backspace');await major.press('Backspace');assert.equal(await major.inputValue(),'');
  await major.fill('机械');await page.waitForTimeout(700);assert.match(await page.locator('body').innerText(),/机械工程|机械设计制造及其自动化|机械电子工程/);
  await major.fill('车辆工程');await page.waitForTimeout(700);assert.match(await helper.textContent(),/暂未找到|实际专业记录/);
  await major.fill('网络失败');await page.waitForTimeout(700);assert.match(await helper.textContent(),/在线核对|无法在线|继续输入/);
  await major.fill('车辆工程');await school.fill('东北大学');await page.waitForTimeout(250);await school.fill('大连交通大学');await page.waitForTimeout(650);assert.equal(await major.inputValue(),'车辆工程');assert.match(await helper.textContent(),/学校|识别|专业/);
  const before=requests.length;await major.fill('机械');await page.waitForTimeout(1000);const after=requests.length;assert.ok(after-before<8,`${viewport.name}: API 请求不得失控`);assert.equal(errors.length,0,errors.join('\n'));
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.volunteer-card',{timeout:10000});assert.ok(await page.locator('body').innerText().length>0,`${viewport.name}: refresh should recover draft`);
  await browser.close();
}

// URL inbound: conflicting code/name must be surfaced, not silently coerced.
{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900},locale:'zh-CN'});
  await context.addInitScript(()=>{localStorage.clear();localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify({version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'',volunteers:[{id:'inbound-1',order:1,school:'',majorCode:'',majorName:'',familyStatus:'待讨论',history:{years:{}}}],selectionPool:[]}))});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html?school=%E4%B8%9C%E5%8C%97%E5%A4%A7%E5%AD%A6&majorCode=080301&majorName=%E8%87%AA%E5%8A%A8%E5%8C%96',{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForTimeout(700);assert.match(await page.locator('body').innerText(),/代码与专业名称不一致/,'URL inbound conflict must be visible');
  await browser.close();
}
console.log('simulation-workspace-v016.1 browser: PASS');
