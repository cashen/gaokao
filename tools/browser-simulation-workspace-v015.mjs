import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-CN'});
await context.addInitScript(()=>{
  localStorage.clear();
  localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify({version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'555',rank:10000,volunteers:[{id:'v015-1',order:1,school:'',majorCode:'',majorName:'',familyStatus:'待讨论',history:{years:{}}}],selectionPool:[]}));
});
const page=await context.newPage();
const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
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
if(await schoolChoices.count()) await schoolChoices.first().click();
await page.waitForTimeout(100);
await major.fill('自动化');
await page.waitForTimeout(700);
const body=await page.locator('body').innerText();
assert.match(body,/自动化/,'东北大学+自动化应有相关反馈');

await major.fill('080301');
for(const value of ['08030','0803','080','08','0','']){
  await major.press('Control+A');
  if(value) await major.type(value); else await major.press('Backspace');
  assert.equal(await major.inputValue(),value,`代码删除中间态 ${value} 必须可编辑`);
}
await major.fill('机械');
await page.waitForTimeout(700);
assert.match(await page.locator('body').innerText(),/机械工程|机械设计制造及其自动化|机械电子工程/,'学校实际机械相关专业必须出现');
assert.equal(errors.length,0,errors.join('\n'));
await browser.close();
console.log('simulation-workspace-v015 browser: PASS');
