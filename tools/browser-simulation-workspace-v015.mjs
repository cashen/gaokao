import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-CN'});
await context.addInitScript(()=>{
  localStorage.clear();
  localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify({version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'555',rank:10000,volunteers:[{id:'v015-1',order:1,school:'',majorCode:'',majorName:'',familyStatus:'待讨论',history:{years:{}}}],selectionPool:[]}));
});
const page=await context.newPage();
const errors=[]; const requests=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('request',r=>{if(r.url().includes('/api/ai/major-history'))requests.push(r.url())});
await page.route('**/api/ai/major-history**',async route=>{
  const u=new URL(route.request().url()); const major=u.searchParams.get('major')||''; const school=u.searchParams.get('schoolKeyword')||'';
  const records=school.includes('东北大学') ? [
    {school:'东北大学',standardMajorName:'自动化',majorCode2026:'080801'},
    {school:'东北大学',standardMajorName:'机械工程',majorCode2026:'080201'},
    {school:'东北大学',standardMajorName:'机械设计制造及其自动化',majorCode2026:'080202'},
    {school:'东北大学',standardMajorName:'机械电子工程',majorCode2026:'080204'}
  ].filter(r=>!major||r.standardMajorName.includes(major)||r.majorCode2026.startsWith(major));
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,records})});
});
await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded',timeout:15000});
await page.waitForSelector('.volunteer-card[data-card-id="v015-1"]',{timeout:10000});
const school=page.locator('[data-field="school"]').first();
const major=page.locator('[data-field="majorCode"]').first();

await major.fill('机械');
await page.waitForTimeout(100);
assert.ok(await page.locator('[data-v015-major]').first().isVisible(),'机械输入应立即有专业目录反馈');
assert.match(await page.locator('[data-v015-helper]').first().textContent(),/学校/);

await school.fill('东北大学');
await page.waitForTimeout(500);
const schoolChoices=page.locator('[data-v015-school-choice]');
assert.ok(await schoolChoices.count(),'学校输入应出现可确认的候选');
await schoolChoices.first().click();
await page.waitForTimeout(150);
await major.fill('自动化');
await page.waitForTimeout(700);
assert.match(await page.locator('body').innerText(),/自动化/,'东北大学+自动化应有相关反馈');
assert.match(await page.locator('[data-v015-helper]').first().textContent(),/找到|确认/,'东北大学+自动化应有明确状态反馈');

await major.fill('080301');
for(let i=0;i<5;i++) await major.press('Backspace');
assert.equal(await major.inputValue(),'08','080301 连续真实 Backspace 后应保留 08');
await major.press('Backspace'); await major.press('Backspace');
assert.equal(await major.inputValue(),'','代码可继续删除到空');

await major.fill('机械');
await page.waitForTimeout(700);
assert.match(await page.locator('body').innerText(),/机械工程|机械设计制造及其自动化|机械电子工程/,'学校实际机械相关专业必须出现');

await major.fill('车辆工程');
await page.waitForTimeout(700);
assert.match(await page.locator('[data-v015-helper]').first().textContent(),/暂未找到|实际专业记录/,'学校没有该专业时必须明确反馈，不能伪装成学校专业');

await school.fill('东北大学');
await page.waitForTimeout(150);
await school.fill('大连交通大学');
await page.waitForTimeout(500);
assert.equal(await major.inputValue(),'车辆工程','更换学校不能偷偷修改用户当前专业输入');
assert.match(await page.locator('[data-v015-helper]').first().textContent(),/学校|识别|专业/,'更换学校后应重新进入学校/专业核对状态');

const before=requests.length;
await major.fill('机械');
await page.waitForTimeout(1000);
const after=requests.length;
assert.ok(after-before<8,'重复输入不应产生失控的 API 请求风暴');
assert.equal(errors.length,0,errors.join('\n'));
await browser.close();
console.log('simulation-workspace-v015 browser: PASS');
