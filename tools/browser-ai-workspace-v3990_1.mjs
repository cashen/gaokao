import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE=String(process.env.AI_PREVIEW_BASE||'').replace(/\/+$/,'');
const EXPECTED_SHA=String(process.env.AI_EXPECTED_SHA||'').trim();
const ARTIFACT_DIR=process.env.AI_ARTIFACT_DIR||'/tmp/ai-workspace-browser-v3991_0';
if(!BASE)throw new Error('AI_PREVIEW_BASE is required');
fs.mkdirSync(ARTIFACT_DIR,{recursive:true});
const devices=[{name:'pc',viewport:{width:1440,height:920}},{name:'pad',viewport:{width:1024,height:768}},{name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true}];
function assert(condition,message){if(!condition)throw new Error(message);}
function bodySummary(data){try{return JSON.stringify(data).replace(/\s+/g,' ').slice(0,900);}catch{return String(data||'').slice(0,900);}}
async function waitForHealth(page,timeout=30000){await page.waitForFunction(()=>{const t=document.querySelector('#healthBar')?.textContent||'';return t.includes('顾问可用')||t.includes('确定性查询仍可用');},null,{timeout});}
async function checkGeometry(page,label){const g=await page.evaluate(()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert(g.doc<=g.inner+2,`${label}: document overflow ${g.doc}>${g.inner}`);assert(g.body<=g.inner+2,`${label}: body overflow ${g.body}>${g.inner}`);}
function responseMatchesInput(response,text){if(!response.url().includes('/api/ai/turn')||response.request().method()!=='POST')return false;try{return response.request().postDataJSON()?.input===text;}catch{return false;}}
async function waitIdle(page,timeout=90000){await page.waitForFunction(()=>document.querySelector('#sendButton')?.textContent?.trim()==='发送',null,{timeout});}
async function submitTurn(page,text,requirements={}){const responsePromise=page.waitForResponse(r=>responseMatchesInput(r,text),{timeout:90000});await page.locator('#promptInput').fill(text);await page.locator('#sendButton').click();const response=await responsePromise;let data=null;try{data=await response.json();}catch{data={parseError:true};}assert(response.status()===200,`${text}: HTTP ${response.status()} ${bodySummary(data)}`);assert(data?.ok===true,`${text}: payload not ok ${bodySummary(data)}`);assert(data?.pendingConfirmation!==true,`${text}: unexpected confirmation ${bodySummary(data?.command)}`);if(requirements.candidates)assert(data?.result?.candidates?.ok===true,`${text}: candidates not ok ${bodySummary(data?.result?.candidates)}`);if(requirements.rank)assert(data?.result?.rank?.ok===true,`${text}: rank not ok`);await waitIdle(page);return data;}
async function viewText(page){return (await page.locator('#activeViewChips').innerText()).replace(/\s+/g,' ').trim();}
async function assertView(page,parts,notParts=[]){const t=await viewText(page);for(const p of parts)assert(t.includes(p),`view missing ${p}: ${t}`);for(const p of notParts)assert(!t.includes(p),`view unexpectedly has ${p}: ${t}`);}
async function reset(page){page.once('dialog',d=>d.accept());await page.locator('#newWorkspace').click();await page.waitForTimeout(200);}
async function turnCount(page){return page.locator('#conversationStream .turn').count();}

async function coreHumanJourney(page,name){
  await reset(page);
  await submitTurn(page,'580分，先看看机械',{candidates:true});await assertView(page,['580分','全国','机械']);assert(await turnCount(page)===1,`${name}: first turn missing`);
  await submitTurn(page,'省内',{candidates:true});await assertView(page,['580分','辽宁省内','机械']);assert(await turnCount(page)===2,`${name}: second turn missing`);assert(await page.getByText('580分，先看看机械',{exact:true}).count()>0,`${name}: previous user turn disappeared`);
  await submitTurn(page,'沈阳',{candidates:true});await assertView(page,['580分','沈阳','机械'],['辽宁省内']);assert(await turnCount(page)===3,`${name}: third turn missing`);const stream=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' ');assert(stream.includes('继续只缩地区')||stream.includes('地区从辽宁省内'),`${name}: no causal region explanation: ${stream.slice(-1200)}`);assert(stream.includes('2026参考'),`${name}: candidate year/score/rank reference missing`);assert(/\d+分/.test(stream)&&/\d{1,3}(,\d{3})*位/.test(stream),`${name}: candidate score/rank pair missing`);assert(!stream.includes('upper ·'),`${name}: raw upper label leaked`);assert(!stream.includes('near ·'),`${name}: raw near label leaked`);assert(!stream.includes('steady ·'),`${name}: raw steady label leaked`);assert(await page.locator('.question-button').count()>0,`${name}: next decision questions missing`);
  await checkGeometry(page,`${name}:core`);
}

async function profilePersistence(page,name){
  if(name!=='pc')return;
  await submitTurn(page,'普通家庭，更看重本科就业，不想把读研当必选项');
  assert(await turnCount(page)===4,`${name}: profile turn missing`);
  const before=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' ');assert(before.includes('普通家庭')||before.includes('本科就业'),`${name}: mentor behavior not visible`);
  await page.reload({waitUntil:'networkidle'});await waitForHealth(page);assert(await turnCount(page)>=4,`${name}: turn history lost after reload`);await assertView(page,['580分','沈阳','机械']);await page.locator('#decisionContextDetails').evaluate(el=>el.open=true);const support=(await page.locator('#constraintList').innerText()).replace(/\s+/g,' ');assert(support.includes('就业')||support.includes('培养周期'),`${name}: explicit decision profile not persisted: ${support}`);
}

async function latestWins(page,name){
  if(name!=='pc')return;
  let delayed=true;await page.route('**/api/ai/turn',async route=>{const body=route.request().postData()||'';if(delayed&&body.includes('只看大连')){delayed=false;await new Promise(r=>setTimeout(r,2200));try{await route.continue();}catch{}return;}await route.continue();});
  await page.locator('#promptInput').fill('只看大连');await page.locator('#sendButton').click();await page.waitForTimeout(150);assert((await page.locator('#sendButton').innerText()).includes('改口'),`${name}: running input not interruptible`);
  const latest='只看沈阳';const p=page.waitForResponse(r=>responseMatchesInput(r,latest),{timeout:90000});await page.locator('#promptInput').fill(latest);await page.locator('#sendButton').click();const response=await p;assert(response.status()===200,`${name}: latest response failed`);await waitIdle(page);await page.waitForTimeout(2400);await assertView(page,['沈阳'],['大连']);await page.unroute('**/api/ai/turn');
}

async function selectionAndModel(page,name){
  await page.evaluate(()=>localStorage.setItem('lnRank.selectionPool.lnPhysics.2026.v3951',JSON.stringify({items:[{id:'browser-1',school:'测试大学',major:'机械工程',rank2026:20000,bandKey:'near',displayLocation:'沈阳',tuition:'5200',userNote:'这段私有备注不能发给模型'}]})));
  await page.locator('#decisionContextDetails').evaluate(el=>el.open=true);await page.locator('#importSelection').click();await page.getByText('已导入1项',{exact:false}).waitFor({state:'visible',timeout:10000});
  if(name==='pc'){const config=(await page.locator('#modelConfig').innerText()).trim();assert(config&&!config.includes('读取'),`${name}: model config echo missing`);if(!config.includes('本地规则')&&!config.includes('未就绪')){await page.locator('#probeModel').click();await page.waitForFunction(()=>{const t=document.querySelector('#modelProbeResult')?.textContent||'';return t.includes('实测：')||t.includes('实测失败：');},null,{timeout:50000});const result=await page.locator('#modelProbeResult').innerText();assert(result.includes('实测：'),`${name}: model probe failed: ${result}`);}}
}

const browser=await chromium.launch({headless:true});
try{
  for(const device of devices){const context=await browser.newContext({viewport:device.viewport,isMobile:Boolean(device.isMobile),hasTouch:Boolean(device.hasTouch),locale:'zh-CN'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(`pageerror:${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`console:${m.text()}`);});try{const response=await page.goto(`${BASE}/ai/?browser=${encodeURIComponent(EXPECTED_SHA||'preview')}-${device.name}`,{waitUntil:'networkidle',timeout:60000});assert(response?.ok(),`${device.name}: /ai HTTP ${response?.status()}`);await waitForHealth(page);assert(await page.locator('#decisionContextDetails').evaluate(el=>!el.open),`${device.name}: engineering/support panel should default collapsed`);await coreHumanJourney(page,device.name);await profilePersistence(page,device.name);await latestWins(page,device.name);await selectionAndModel(page,device.name);await checkGeometry(page,`${device.name}:final`);await page.screenshot({path:path.join(ARTIFACT_DIR,`${device.name}.png`),fullPage:true});assert(errors.length===0,`${device.name}: browser errors ${errors.join(' | ')}`);}catch(error){fs.writeFileSync(path.join(ARTIFACT_DIR,`${device.name}-failure.txt`),`${error.stack||error}\n${errors.join('\n')}`);await page.screenshot({path:path.join(ARTIFACT_DIR,`${device.name}-failure.png`),fullPage:true}).catch(()=>{});throw error;}finally{await context.close();}}
  console.log(JSON.stringify({ok:true,base:BASE,expectedSha:EXPECTED_SHA,devices:devices.map(d=>d.name),checks:['continuous-turn-history','580-mechanical-liaoning-shenyang','unmentioned-dimensions-inherit','causal-change-copy','candidate-score-rank-year-gap','no-raw-band-key','dynamic-next-questions','decision-profile-persistence','support-panel-collapsed','latest-write-wins','selection-readonly','responsive-no-overflow','live-model-probe-pc']},null,2));
}finally{await browser.close();}
