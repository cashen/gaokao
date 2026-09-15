import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const viewports=[
  {name:'android',width:390,height:844},
  {name:'pad',width:768,height:1024},
  {name:'desktop',width:1280,height:900}
];

for(const viewport of viewports){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},locale:'zh-CN'});
  await context.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify({version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'555',rank:10000,volunteers:[{id:'v015-1',order:1,school:'',majorCode:'',majorName:'',familyStatus:'待讨论',history:{years:{}}}],selectionPool:[]}));
  });
  const page=await context.newPage();
  const errors=[];
  const requests=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{if(r.url().includes('/api/ai/major-history'))requests.push(r.url())});
  await page.route('**/api/ai/major-history**',async route=>{
    const u=new URL(route.request().url());
    const major=u.searchParams.get('major')||'';
    const school=u.searchParams.get('schoolKeyword')||'';
    if(major.includes('网络失败')){
      await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,message:'mock unavailable'})});
      return;
    }
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
  const helper=page.locator('[data-v015-helper]').first();

  // Local feedback must be immediate, without waiting for the fact API.
  await major.fill('机械');
  await page.waitForTimeout(100);
  assert.ok(await page.locator('[data-v015-major]').first().isVisible(),`${viewport.name}: 机械输入应立即有专业目录反馈`);
  assert.match(await helper.textContent(),/学校/);

  // Fast sequential typing must not lose the final value or flood requests.
  await school.fill('东北大学');
  await page.waitForTimeout(500);
  const schoolChoices=page.locator('[data-v015-school-choice]');
  assert.ok(await schoolChoices.count(),`${viewport.name}: 学校输入应出现可确认候选`);
  await schoolChoices.first().click();
  await major.fill('');
  await major.pressSequentially('自动化',{delay:15});
  await page.waitForTimeout(700);
  assert.equal(await major.inputValue(),'自动化',`${viewport.name}: 快速输入最终值应完整保留`);
  assert.match(await page.locator('body').innerText(),/自动化/);

  // IME lifecycle: composition events must not let legacy handlers consume partial text.
  await major.fill('');
  await major.dispatchEvent('compositionstart');
  await major.evaluate(el=>{el.value='机械';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await major.dispatchEvent('compositionend');
  await page.waitForTimeout(700);
  assert.equal(await major.inputValue(),'机械',`${viewport.name}: compositionend 后应保留最终输入`);
  assert.match(await helper.textContent(),/找到|核对|实际专业/);

  // Paste path: final pasted value should enter the same controller path.
  await major.fill('');
  await major.evaluate(el=>{
    el.focus();
    const dt=new DataTransfer();
    dt.setData('text/plain','080301');
    el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:dt}));
    el.value='080301';
    el.dispatchEvent(new Event('input',{bubbles:true,inputType:'insertFromPaste'}));
  });
  assert.equal(await major.inputValue(),'080301',`${viewport.name}: 粘贴后值应完整保留`);

  // Real Backspace deletion through every legal intermediate prefix.
  for(let i=0;i<4;i++) await major.press('Backspace');
  assert.equal(await major.inputValue(),'08',`${viewport.name}: 080301 连续 Backspace 后应保留 08`);
  await major.press('Backspace');
  await major.press('Backspace');
  assert.equal(await major.inputValue(),'','代码可继续删除到空');

  await major.fill('机械');
  await page.waitForTimeout(700);
  assert.match(await page.locator('body').innerText(),/机械工程|机械设计制造及其自动化|机械电子工程/,`${viewport.name}: 学校实际机械相关专业必须出现`);

  await major.fill('车辆工程');
  await page.waitForTimeout(700);
  assert.match(await helper.textContent(),/暂未找到|实际专业记录/,`${viewport.name}: 学校没有该专业时必须明确反馈`);

  // Network failure must not be presented as a school-major mismatch.
  await major.fill('网络失败');
  await page.waitForTimeout(700);
  assert.match(await helper.textContent(),/在线核对|无法在线|继续输入/ ,`${viewport.name}: 网络故障应与事实不匹配区分`);

  // Changing school invalidates dependent confirmation but preserves user input.
  await major.fill('车辆工程');
  await school.fill('东北大学');
  await page.waitForTimeout(200);
  await school.fill('大连交通大学');
  await page.waitForTimeout(600);
  assert.equal(await major.inputValue(),'车辆工程',`${viewport.name}: 更换学校不能偷偷修改专业输入`);
  assert.match(await helper.textContent(),/学校|识别|专业/);

  const before=requests.length;
  await major.fill('机械');
  await page.waitForTimeout(1000);
  const after=requests.length;
  assert.ok(after-before<8,`${viewport.name}: 重复输入不应产生失控 API 请求风暴`);
  assert.equal(errors.length,0,`${viewport.name}: ${errors.join('\n')}`);
  await browser.close();
}

console.log('simulation-workspace-v015 browser: PASS');
