import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE=String(process.env.AI_PREVIEW_BASE||'').replace(/\/+$/,'');
const EXPECTED_SHA=String(process.env.AI_EXPECTED_SHA||'').trim();
const ARTIFACT_DIR=process.env.AI_ARTIFACT_DIR||'/tmp/ai-workspace-browser-v3990_1';
if(!BASE)throw new Error('AI_PREVIEW_BASE is required');fs.mkdirSync(ARTIFACT_DIR,{recursive:true});
const devices=[{name:'pc',viewport:{width:1440,height:900}},{name:'pad',viewport:{width:1024,height:768}},{name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true}];
function assert(condition,message){if(!condition)throw new Error(message);}
async function waitForText(page,text,timeout=30000){await page.getByText(text,{exact:false}).first().waitFor({state:'visible',timeout});}
async function waitForHealthState(page,timeout=30000){await page.waitForFunction(()=>{const text=document.querySelector('#health')?.textContent||'';return text.includes('工作台已就绪')||text.includes('确定性业务可继续');},null,{timeout});}
async function checkGeometry(page,name){const g=await page.evaluate(()=>({width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth}));assert(g.scrollWidth<=g.width+2,`${name}: document overflow ${g.scrollWidth}>${g.width}`);assert(g.bodyWidth<=g.width+2,`${name}: body overflow ${g.bodyWidth}>${g.width}`);}
async function submit(page,text){const input=page.locator('#promptInput');await input.fill(text);await page.locator('#sendButton').click();}
async function waitIdle(page,timeout=70000){await page.waitForFunction(()=>document.querySelector('#sendButton')?.textContent?.trim()==='执行',null,{timeout});}
async function viewChips(page){return (await page.locator('#activeViewChips .view-chip').allTextContents()).map(text=>text.replace(/\s+/g,' ').trim());}
function chipMatches(chip,part){return /分$/.test(part)?chip.startsWith(`${part} ·`):chip===part;}
async function assertView(page,parts,notParts=[]){const chips=await viewChips(page);for(const part of parts)assert(chips.some(chip=>chipMatches(chip,part)),`active view missing ${part}: ${chips.join(' | ')}`);for(const part of notParts)assert(!chips.some(chip=>chipMatches(chip,part)),`active view unexpectedly has ${part}: ${chips.join(' | ')}`);}
async function resetWorkspace(page){page.once('dialog',dialog=>dialog.accept());await page.locator('#newWorkspace').click();await page.waitForTimeout(150);}
function responseMatchesInput(response,text){if(!response.url().includes('/api/ai/turn')||response.request().method()!=='POST')return false;try{return response.request().postDataJSON()?.input===text;}catch{return (response.request().postData()||'').includes(text);}}
async function pageDiagnostic(page){return page.evaluate(()=>({send:document.querySelector('#sendButton')?.textContent?.trim()||'',view:document.querySelector('#activeViewChips')?.textContent?.replace(/\s+/g,' ').trim()||'',result:document.querySelector('#resultStream')?.textContent?.replace(/\s+/g,' ').trim().slice(0,1200)||''}));}
function bodySummary(data){try{return JSON.stringify(data).replace(/\s+/g,' ').slice(0,700);}catch{return String(data||'').slice(0,700);}}
function verifyTurnPayload(data,label,{requireCandidates=false,requireComparison=false,requireRank=false,requireSelectionReview=false}={}){assert(data?.ok===true,`${label}: turn payload not ok: ${bodySummary(data)}`);assert(data?.pendingConfirmation!==true,`${label}: unexpected confirmation: ${bodySummary(data?.command)}`);if(requireCandidates)assert(data?.result?.candidates?.ok===true,`${label}: candidates not ok: ${bodySummary(data?.result?.candidates)}`);if(requireComparison)assert(data?.result?.comparison?.ok===true,`${label}: comparison not ok: ${bodySummary(data?.result?.comparison)}`);if(requireRank)assert(data?.result?.rank?.ok===true,`${label}: rank not ok: ${bodySummary(data?.result?.rank)}`);if(requireSelectionReview)assert(data?.result?.selectionReview&&!data.result.selectionReview.importRequired,`${label}: selection review not ready: ${bodySummary(data?.result?.selectionReview)}`);}
async function submitTurn(page,text,requirements={}){const responsePromise=page.waitForResponse(response=>responseMatchesInput(response,text),{timeout:70000});await submit(page,text);let response;try{response=await responsePromise;}catch(error){const diag=await pageDiagnostic(page);throw new Error(`${text}: /api/ai/turn response timeout; ${bodySummary(diag)}; ${error.message}`);}let data=null;try{data=await response.json();}catch{data={parseError:true,text:(await response.text().catch(()=>'' )).slice(0,700)};}assert(response.status()===200,`${text}: /api/ai/turn HTTP ${response.status()}: ${bodySummary(data)}`);verifyTurnPayload(data,text,requirements);await waitIdle(page);const diag=await pageDiagnostic(page);assert(!diag.result.includes('本轮没有修改工作区'),`${text}: UI reported transaction failure: ${bodySummary(diag)}`);return data;}
async function clickTurn(page,locator,label,requirements={}){const responsePromise=page.waitForResponse(response=>response.url().includes('/api/ai/turn')&&response.request().method()==='POST',{timeout:70000});await locator.click();let response;try{response=await responsePromise;}catch(error){const diag=await pageDiagnostic(page);throw new Error(`${label}: /api/ai/turn response timeout; ${bodySummary(diag)}; ${error.message}`);}let data=null;try{data=await response.json();}catch{data={parseError:true,text:(await response.text().catch(()=>'' )).slice(0,700)};}assert(response.status()===200,`${label}: /api/ai/turn HTTP ${response.status()}: ${bodySummary(data)}`);verifyTurnPayload(data,label,requirements);await waitIdle(page);return data;}

async function verifyHumanSemanticJourney(page,name){
  await resetWorkspace(page);
  await submitTurn(page,'580分，先看看电气',{requireCandidates:true});await waitForText(page,'确定性候选执行结果',10000);await assertView(page,['580分','全国','电气']);
  await submitTurn(page,'机械呢',{requireCandidates:true});await assertView(page,['机械'],['电气']);
  await submitTurn(page,'省内机械',{requireCandidates:true});await assertView(page,['辽宁','机械']);
  await submitTurn(page,'电气呢',{requireCandidates:true});await assertView(page,['辽宁','电气'],['机械']);
  await submitTurn(page,'那安徽呢',{requireCandidates:true});await assertView(page,['安徽','电气'],['辽宁']);
  await submitTurn(page,'也看看机械',{requireCandidates:true});await assertView(page,['安徽','电气','机械']);
  await submitTurn(page,'电气和机械怎么选',{requireComparison:true});await waitForText(page,'专业可达空间比较',10000);await waitForText(page,'不作优劣结论',10000);await assertView(page,['安徽','电气','机械']);
  const clear=page.getByRole('button',{name:'暂时不限专业'}).last();assert(await clear.count()>0,`${name}: contextual clear-major action missing`);await clickTurn(page,clear,'contextual clear major',{requireCandidates:true});await assertView(page,['安徽'],['电气','机械']);
  const back=page.getByRole('button',{name:'回到上一批'}).last();assert(await back.count()>0,`${name}: restore menu missing`);await clickTurn(page,back,'contextual restore',{requireCandidates:true});await assertView(page,['安徽','电气','机械']);
  await checkGeometry(page,`${name}:semantic`);
}

async function verifyInterruptionLatestWins(page,name){
  await resetWorkspace(page);await submitTurn(page,'580分，先看看电气',{requireCandidates:true});
  let delayNext=true;
  await page.route('**/api/ai/turn',async route=>{const body=route.request().postData()||'';if(delayNext&&body.includes('省内机械')){delayNext=false;await new Promise(resolve=>setTimeout(resolve,2200));try{await route.continue();}catch{}return;}await route.continue();});
  await submit(page,'省内机械');await page.waitForTimeout(180);assert((await page.locator('#sendButton').innerText()).includes('改口'),`${name}: input was locked instead of allowing interruption`);
  const latest='那安徽电气';const responsePromise=page.waitForResponse(response=>responseMatchesInput(response,latest),{timeout:70000});await submit(page,latest);const response=await responsePromise;let data=null;try{data=await response.json();}catch{}assert(response.status()===200,`${name}: latest interruption HTTP ${response.status()}: ${bodySummary(data)}`);verifyTurnPayload(data,latest,{requireCandidates:true});await waitIdle(page);await page.waitForTimeout(2400);await assertView(page,['安徽','电气'],['辽宁','机械']);
  await page.unroute('**/api/ai/turn');await checkGeometry(page,`${name}:interrupt`);
}

async function verifyModelEcho(page,name){
  const config=(await page.locator('#modelConfig').innerText()).trim();assert(config&&!config.includes('读取模型配置'),`${name}: configured model echo missing`);assert(await page.locator('#probeModel').count()===1,`${name}: model probe control missing`);if(name!=='pc')return;if(config.includes('未配置'))return;await page.locator('#probeModel').click();await page.waitForFunction(()=>{const text=document.querySelector('#modelProbeResult')?.textContent||'';return text.includes('本次实测：')||text.includes('实测失败：');},{timeout:45000});const result=(await page.locator('#modelProbeResult').innerText()).trim();assert(result.includes('本次实测：'),`${name}: configured model probe failed: ${result}`);
}

async function verifyPersistenceAndSelection(page,name){
  await resetWorkspace(page);await submitTurn(page,'600分位次是多少',{requireRank:true});await waitForText(page,'14,235',10000);await page.reload({waitUntil:'networkidle'});await waitForText(page,'14,235',30000);
  await page.evaluate(()=>localStorage.setItem('lnRank.selectionPool.lnPhysics.2026.v3951',JSON.stringify({items:[{id:'browser-test-1',school:'测试大学',major:'计算机科学与技术',bandKey:'near',rank2026:20000,displayLocation:'沈阳',tuition:'',userNote:'这段私有备注不能发给模型'}]})));
  await page.locator('#importSelection').click();await waitForText(page,'已导入1项只读快照');await submitTurn(page,'审查我当前的家庭方案',{requireSelectionReview:true});await waitForText(page,'家庭方案结构审查',10000);
  const stored=JSON.parse(await page.evaluate(()=>localStorage.getItem('lnRank.selectionPool.lnPhysics.2026.v3951'))||'{}');assert(stored?.items?.[0]?.userNote==='这段私有备注不能发给模型',`${name}: selection pool mutated`);await checkGeometry(page,`${name}:persistence`);
}

const browser=await chromium.launch({headless:true});
try{
  for(const device of devices){const context=await browser.newContext({viewport:device.viewport,isMobile:Boolean(device.isMobile),hasTouch:Boolean(device.hasTouch),locale:'zh-CN'});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(`pageerror:${error.message}`));page.on('console',message=>{if(message.type()==='error')errors.push(`console:${message.text()}`);});try{const target=`${BASE}/ai/?browser=${encodeURIComponent(EXPECTED_SHA||'preview')}-${device.name}`;const response=await page.goto(target,{waitUntil:'networkidle',timeout:60000});assert(response?.ok(),`${device.name}: /ai/ ${response?.status()}`);await waitForHealthState(page,30000);await checkGeometry(page,`${device.name}:initial`);await verifyModelEcho(page,device.name);if(device.name==='pc'){await verifyHumanSemanticJourney(page,device.name);await verifyInterruptionLatestWins(page,device.name);}else{await resetWorkspace(page);await submitTurn(page,'580分，省内机械',{requireCandidates:true});await waitForText(page,'确定性候选执行结果',10000);await assertView(page,['580分','辽宁','机械']);await checkGeometry(page,`${device.name}:semantic-smoke`);}await verifyPersistenceAndSelection(page,device.name);await page.screenshot({path:path.join(ARTIFACT_DIR,`${device.name}.png`),fullPage:true});assert(errors.length===0,`${device.name}: browser errors ${errors.join(' | ')}`);}catch(error){const diag=await pageDiagnostic(page).catch(()=>({}));fs.writeFileSync(path.join(ARTIFACT_DIR,`${device.name}-failure.txt`),`${error.stack||error}\n${JSON.stringify(diag,null,2)}\n${errors.join('\n')}`);await page.screenshot({path:path.join(ARTIFACT_DIR,`${device.name}-failure.png`),fullPage:true}).catch(()=>{});throw error;}finally{await context.close();}}
  console.log(JSON.stringify({ok:true,base:BASE,expectedSha:EXPECTED_SHA,devices:devices.map(item=>item.name),checks:['turn-http-200-and-ok','candidate-execution-ok','colloquial-semantic-chain','contextual-menu','latest-write-wins-interruption','model-echo','configured-model-probe','indexeddb-persistence','selection-readonly','responsive-no-overflow']},null,2));
}finally{await browser.close();}
