import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const viewports=[
  {name:'android',width:390,height:844,isMobile:true},
  {name:'pad',width:768,height:1024,isMobile:true},
  {name:'desktop',width:1280,height:900,isMobile:false},
];

function historyFor(school, name, code) {
  return {
    school,
    standardMajorName:name,
    majorCode2026:code,
    score2026:560,
    rank2026:9000,
    score2025:552,
    rank2025:9200,
    score2024:548,
    rank2024:9500,
    historyEvidence:{years:{
      2026:{score:560,rank:9000,comparable:true,recordStatus:'primary-record'},
      2025:{score:552,rank:9200,comparable:true,recordStatus:'strict-match'},
      2024:{score:548,rank:9500,comparable:true,recordStatus:'strict-match'},
    }},
  };
}

for(const viewport of viewports){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},locale:'zh-CN',isMobile:viewport.isMobile});
  await context.addInitScript(()=>{localStorage.clear();localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify({version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'555',rank:10000,volunteers:[{id:'v017-action-1',order:1,school:'',majorCode:'',majorName:'',confirmedSchool:'',familyStatus:'待讨论',history:{years:{}}}],selectionPool:[]}))});
  const page=await context.newPage();
  const errors=[];
  const requests=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{if(r.url().includes('/api/ai/major-history'))requests.push(r.url())});
  await page.route('**/api/ai/major-history**',async route=>{
    const u=new URL(route.request().url());
    const majorInputs=u.searchParams.getAll('major');
    const school=u.searchParams.get('schoolKeyword')||'';
    const records=school==='东北大学' ? [
      historyFor('东北大学','自动化','080801'),
      historyFor('东北大学','机械工程','080201'),
      historyFor('东北大学','机械设计制造及其自动化','080202'),
      historyFor('东北大学','机械电子工程','080204'),
    ].filter(r=>!majorInputs.length||majorInputs.some(x=>r.standardMajorName.includes(x)||r.majorCode2026.startsWith(x))) : [];
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,records})});
  });

  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded',timeout:15000});
  const card=page.locator('.volunteer-card').first();
  await card.waitFor({state:'visible',timeout:10000});
  const school=card.locator('[data-field="school"]');
  const helper=card.locator('[data-v017-helper]');

  await school.fill('东北大学');
  const schoolChoice=card.locator('[data-v017-school-choice="东北大学"]').first();
  await schoolChoice.waitFor({state:'visible',timeout:5000});
  await schoolChoice.getByText('选这所',{exact:true}).click();
  await page.waitForFunction(el=>/已确认学校：东北大学/.test(el?.textContent||''),await helper.elementHandle(),{timeout:5000});

  const major=card.locator('[data-field="majorCode"]');
  await major.fill('机械');
  const majorChoice=card.locator('[data-v017-major-code]').filter({hasText:'机械工程'}).first();
  await majorChoice.waitFor({state:'visible',timeout:5000});
  await majorChoice.getByText('选这个',{exact:true}).click();
  await page.waitForFunction(el=>/已确认：东北大学 · 机械工程 · 080201/.test(el?.textContent||''),await helper.elementHandle(),{timeout:5000});

  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers[0]);
  assert.equal(persisted.school,'东北大学');
  assert.equal(persisted.confirmedSchool,'东北大学');
  assert.equal(persisted.majorCode,'080201');
  assert.equal(persisted.majorName,'机械工程');
  assert.equal(persisted.history.years[2026].score,560);
  assert.equal(persisted.history.years[2025].score,552);
  assert.equal(persisted.history.years[2024].score,548);
  assert.equal(requests.filter(url=>new URL(url).searchParams.get('schoolKeyword')==='东北大学').length,1);
  assert.equal(errors.length,0,`${viewport.name}: ${errors.join('\n')}`);
  await browser.close();
}

// Concrete regression: after confirming Shenyang Industrial University, a broad major query
// such as “电气” must keep its candidate controls alive long enough for a human to click them.
// It must also hydrate the same row.history state consumed by the three-year history display.
{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900},locale:'zh-CN'});
  await context.addInitScript(()=>{localStorage.clear();localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify({version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'555',rank:10000,volunteers:[{id:'v017-shenyang-pc',order:1,school:'',majorCode:'',majorName:'',confirmedSchool:'',familyStatus:'待讨论',history:{years:{}}}],selectionPool:[]}))});
  const page=await context.newPage();
  const errors=[];const requests=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{if(r.url().includes('/api/ai/major-history'))requests.push(r.url())});
  await page.route('**/api/ai/major-history**',async route=>{
    const u=new URL(route.request().url());
    const names=u.searchParams.getAll('major');
    const school=u.searchParams.get('schoolKeyword')||'';
    const records=school==='沈阳工业大学' ? [
      historyFor('沈阳工业大学','电气工程及其自动化','080601'),
      historyFor('沈阳工业大学','电气工程与智能控制','080604'),
      historyFor('沈阳工业大学','自动化','080801'),
      historyFor('沈阳工业大学','机械设计制造及其自动化','080202'),
    ].filter(r=>!names.length||names.some(x=>r.standardMajorName.includes(x)||r.majorCode2026.startsWith(x))) : [];
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,records})});
  });
  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded',timeout:15000});
  const card=page.locator('.volunteer-card').first();await card.waitFor({state:'visible',timeout:10000});
  const school=card.locator('[data-field="school"]');const helper=card.locator('[data-v017-helper]');
  await school.fill('沈阳工业大学');
  const exact=card.locator('[data-v017-school-choice="沈阳工业大学"]').first();
  await exact.waitFor({state:'visible',timeout:5000});
  const text=await exact.textContent();assert.match(text,/辽宁省/);assert.match(text,/沈阳市/);assert.match(text,/本科/);assert.match(text,/名称完全一致/);assert.match(text,/选这所/);
  await exact.getByText('选这所',{exact:true}).click();
  await page.waitForFunction(el=>/已确认学校：沈阳工业大学/.test(el?.textContent||''),await helper.elementHandle(),{timeout:5000});

  const major=card.locator('[data-field="majorCode"]');
  await major.fill('电气');
  const electricalChoice=card.locator('[data-v017-major-code]').filter({hasText:'电气工程及其自动化'}).first();
  await electricalChoice.waitFor({state:'visible',timeout:5000});
  await page.waitForTimeout(1000);
  await electricalChoice.getByText('选这个',{exact:true}).click();
  await page.waitForFunction(el=>/已确认：沈阳工业大学 · 电气工程及其自动化 · 080601/.test(el?.textContent||'') ,await helper.elementHandle(),{timeout:5000});

  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('gaokao:simulation-report:v002')).volunteers[0]);
  assert.equal(persisted.school,'沈阳工业大学');
  assert.equal(persisted.confirmedSchool,'沈阳工业大学');
  assert.equal(persisted.majorCode,'080601');
  assert.equal(persisted.majorName,'电气工程及其自动化');
  assert.equal(persisted.history.years[2026].score,560);
  assert.equal(persisted.history.years[2025].rank,9200);
  assert.equal(persisted.history.years[2024].rank,9500);
  assert.ok(requests.some(url=>new URL(url).searchParams.get('schoolKeyword')==='沈阳工业大学'));
  assert.equal(errors.length,0,errors.join('\n'));
  await browser.close();
}

console.log('simulation-workspace-v016.42 direct-action browser: PASS');
