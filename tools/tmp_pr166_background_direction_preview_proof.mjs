import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const BASE='https://73644295.gaokao-4y9.pages.dev';
const EXPECTED='f29da1e9a7464137389101417f38e0b869bba305';

function summary(value){try{return JSON.stringify(value).replace(/\s+/g,' ').slice(0,1800);}catch{return String(value||'').slice(0,1800);}}
function responseMatchesInput(response,text){if(!response.url().includes('/api/ai/turn')||response.request().method()!=='POST')return false;try{return response.request().postDataJSON()?.input===text;}catch{return false;}}
async function waitFinal(page,text,timeout=150000){return page.waitForResponse(async response=>{if(!responseMatchesInput(response,text)||[502,503,504].includes(response.status()))return false;try{const data=await response.json();return data?.pendingDeterministicTool!==true;}catch{return true;}},{timeout});}
async function waitIdle(page,timeout=90000){await page.waitForFunction(()=>document.querySelector('#sendButton')?.textContent?.trim()==='发送',null,{timeout});}
async function submit(page,text){const responsePromise=waitFinal(page,text);await page.locator('#promptInput').fill(text);await page.locator('#sendButton').click();const response=await responsePromise;const data=await response.json();assert.equal(response.status(),200,`${text}: HTTP ${response.status()} ${summary(data)}`);assert.equal(data?.ok,true,`${text}: payload not ok ${summary(data)}`);await waitIdle(page);return data;}

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto(`${BASE}/aiplus/`,{waitUntil:'networkidle',timeout:60000});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#promptInput')&&document.querySelector('#sendButton')&&document.body?.dataset?.aiPlus==='family-advisor',null,{timeout:30000});

  const background=await submit(page,'沈阳工业大学哪些专业更有底子');
  assert.equal(background.command?.agentTask,'school_background','background task');
  assert.equal(background.result?.background?.ok,true,`background result ${summary(background.result?.background)}`);
  const motor=(background.result.background.items||[]).find(item=>item?.direction==='电机电器与装备制造');
  assert.ok(motor,'motor/equipment background direction missing');
  assert.equal(motor.entityKind,'background_direction');
  assert.equal(motor.historyQueryable,false);
  assert.ok((motor.admissionMajors||[]).includes('电气工程及其自动化'),'real admissions major missing from direction');
  assert.ok((motor.admissionMajors||[]).includes('自动化'),'automation admissions major missing from direction');
  const backgroundJson=JSON.stringify(background);
  assert.ok(!backgroundJson.includes('沈阳工业大学电机电器与装备制造多少分'),'server next action still treats direction as admissions major');
  assert.ok(backgroundJson.includes('沈阳工业大学电气工程及其自动化多少分')||backgroundJson.includes('电气工程及其自动化'),'server response does not expose queryable admissions major');
  const firstTurn=page.locator('#conversationStream .turn').last();
  const firstText=(await firstTurn.innerText()).replace(/\s+/g,' ');
  assert.ok(firstText.includes('专业方向 / 专业群（不是招生专业名）'),`UI direction label missing: ${firstText.slice(-1600)}`);
  assert.ok(firstText.includes('可查招生专业')&&firstText.includes('电气工程及其自动化'),`UI queryable major missing: ${firstText.slice(-1600)}`);
  const bgButtons=(await firstTurn.locator('.background-school-prompt').allInnerTexts()).join(' | ');
  assert.ok(!bgButtons.includes('电机电器与装备制造多少分'),`UI still exposes direction score CTA: ${bgButtons}`);

  const direction=await submit(page,'沈阳工业大学电机电器与装备制造多少分');
  assert.equal(direction.command?.agentTask,'school_major_history','manual direction history task');
  assert.equal(direction.result?.history?.ok,true,`direction history result ${summary(direction.result?.history)}`);
  assert.equal(direction.result.history.directionRedirect?.kind,'background_direction',`direction redirect missing ${summary(direction.result.history)}`);
  assert.equal(direction.result.history.directionRedirect?.queryable,false);
  assert.equal((direction.result.history.records||[]).length,0,'direction itself must not become fake admissions records');
  assert.ok((direction.result.history.directionRedirect?.admissionMajors||[]).includes('电气工程及其自动化'));
  const directionJson=JSON.stringify(direction);
  if(directionJson.includes('最低0分')||directionJson.includes('最高0分')){
    console.log('ZERO_SCORE_LEAK_DIAGNOSTIC');
    console.log(JSON.stringify({history:direction.result?.history,blocks:direction.blocks,nextActions:direction.nextActions,assistant:direction.assistantMessage,decisionBook:direction.decisionBook,workspace:direction.workspace},null,2));
  }
  assert.ok(!directionJson.includes('最低0分')&&!directionJson.includes('最高0分'),'null score summary leaked as zero in API response');
  const directionTurn=page.locator('#conversationStream .turn').last();
  const directionText=(await directionTurn.innerText()).replace(/\s+/g,' ');
  assert.ok(directionText.includes('不是招生专业名')||directionText.includes('不是当前招生专业名'),`premise correction missing: ${directionText.slice(-1800)}`);
  assert.ok(directionText.includes('电气工程及其自动化'),`corrective actual major missing: ${directionText.slice(-1800)}`);
  assert.ok(!directionText.includes('最低0分')&&!directionText.includes('最高0分'),'UI rendered fake zero score summary');

  const actual=await submit(page,'沈阳工业大学电气工程及其自动化多少分');
  assert.equal(actual.command?.agentTask,'school_major_history','real major history task');
  assert.equal(actual.result?.history?.ok,true,`actual history ${summary(actual.result?.history)}`);
  assert.ok((actual.result.history.records||[]).length>0,'real admissions major must return actual records');
  assert.equal(actual.result.history.directionRedirect??null,null,'real admissions major must not be redirected as a direction');
  assert.ok((actual.result.history.records||[]).some(record=>Number(record.score2026)>0),'real score evidence missing');
  const actualTurn=page.locator('#conversationStream .turn').last();
  const actualText=(await actualTurn.innerText()).replace(/\s+/g,' ');
  assert.ok(actualText.includes('电气工程及其自动化')&&/\d+分/.test(actualText),`real major score not rendered: ${actualText.slice(-1800)}`);

  const renderer=await (await page.request.get(`${BASE}/aiplus/render.v3992_0.js`,{headers:{'cache-control':'no-cache'}})).text();
  assert.ok(renderer.includes('专业方向 / 专业群（不是招生专业名）'),'exact Preview renderer asset is stale');
  assert.ok(!renderer.includes("const major=item.major||bg.major"),'old direction-as-major renderer survived exact Preview');

  console.log(JSON.stringify({ok:true,expectedHead:EXPECTED,preview:BASE,proofs:['background-direction-contract','queryable-major-cta','manual-direction-premise-correction','null-score-not-zero','actual-major-real-history','exact-renderer-asset'],realMajorRecords:actual.result.history.records.length},null,2));
} finally {
  await browser.close();
}
