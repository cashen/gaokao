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
async function waitForAppReady(page,timeout=30000){await page.waitForFunction(()=>document.querySelector('#promptInput')&&document.querySelector('#sendButton')&&document.body?.dataset?.aiPlus==='family-advisor',null,{timeout});}
async function checkGeometry(page,label){const g=await page.evaluate(()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert(g.doc<=g.inner+2,`${label}: document overflow ${g.doc}>${g.inner}`);assert(g.body<=g.inner+2,`${label}: body overflow ${g.body}>${g.inner}`);}
function responseMatchesInput(response,text){if(!response.url().includes('/api/ai/turn')||response.request().method()!=='POST')return false;try{return response.request().postDataJSON()?.input===text;}catch{return false;}}
async function waitForFinalTurnResponse(page,text,timeout=150000){return page.waitForResponse(async response=>{if(!responseMatchesInput(response,text)||[502,503,504].includes(response.status()))return false;try{const data=await response.json();return data?.pendingDeterministicTool!==true;}catch{return true;}},{timeout});}
async function waitIdle(page,timeout=90000){await page.waitForFunction(()=>document.querySelector('#sendButton')?.textContent?.trim()==='发送',null,{timeout});}
async function submitTurn(page,text,requirements={}){const responsePromise=waitForFinalTurnResponse(page,text,requirements.timeout||150000);await page.locator('#promptInput').fill(text);await page.locator('#sendButton').click();let response;try{response=await responsePromise;}catch(error){throw new Error(`${text}: ${error?.message||error}`);}let data=null;try{data=await response.json();}catch{data={parseError:true};}assert(response.status()===200,`${text}: HTTP ${response.status()} ${bodySummary(data)}`);assert(data?.ok===true,`${text}: payload not ok ${bodySummary(data)}`);assert(data?.pendingConfirmation!==true,`${text}: unexpected confirmation ${bodySummary(data?.command)}`);if(requirements.candidates)assert(data?.result?.candidates?.ok===true,`${text}: candidates not ok ${bodySummary(data?.result?.candidates)}`);if(requirements.rank)assert(data?.result?.rank?.ok===true,`${text}: rank not ok`);if(requirements.history)assert(data?.result?.history?.ok===true,`${text}: history not ok ${bodySummary(data?.result?.history)}`);if(requirements.majorHistory)assert(data?.result?.majorHistory?.ok===true,`${text}: major history not ok ${bodySummary(data?.result?.majorHistory)}`);if(requirements.background)assert(data?.result?.background?.ok===true,`${text}: background not ok ${bodySummary(data?.result?.background)}`);await waitIdle(page);return data;}
async function viewText(page){return (await page.locator('#activeViewChips').innerText()).replace(/\s+/g,' ').trim();}

async function viewportStabilityJourney(page,name){
  if(name!=='pc')return;
  await reset(page);
  await page.evaluate(()=>{
    window.__aiPlusScrollTrace=[];
    const nativeScrollTo=window.scrollTo.bind(window);
    window.scrollTo=(...args)=>{window.__aiPlusScrollTrace.push({kind:'window',args});return nativeScrollTo(...args);};
    const nativeScrollIntoView=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(...args){window.__aiPlusScrollTrace.push({kind:'element',args});return nativeScrollIntoView.apply(this,args);};
  });
  await submitTurn(page,'辽科大怎么样',{timeout:150000});
  const trace=await page.evaluate(()=>window.__aiPlusScrollTrace||[]);
  assert(!trace.some(item=>JSON.stringify(item).includes('smooth')),`${name}: AIPLuS result path must not use smooth scrolling: ${JSON.stringify(trace)}`);
  assert(!trace.some(item=>item.kind==='element'),`${name}: AIPLuS result path must not call scrollIntoView: ${JSON.stringify(trace)}`);
  assert(trace.length<=1,`${name}: one answer transaction may restore viewport at most once: ${JSON.stringify(trace)}`);
  assert(await page.locator('.processing-dot').count()===0,`${name}: processing state still mounts AI pulse marker`);
}
async function assertView(page,parts,notParts=[]){const t=await viewText(page);for(const p of parts)assert(t.includes(p),`view missing ${p}: ${t}`);for(const p of notParts)assert(!t.includes(p),`view unexpectedly has ${p}: ${t}`);}
async function turnCount(page){return page.locator('#conversationStream .turn').count();}
async function currentWorkspaceId(page){return page.evaluate(()=>new Promise(resolve=>{const request=indexedDB.open('gaokao-ai-workspace-v3990_0',1);request.onerror=()=>resolve('');request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('workspace')){db.close();resolve('');return;}const tx=db.transaction('workspace','readonly'),get=tx.objectStore('workspace').get('current');get.onsuccess=()=>{const id=String(get.result?.id||'');db.close();resolve(id);};get.onerror=()=>{db.close();resolve('');};};}));}
async function openNewTopic(page){
  const hadTurns=(await turnCount(page))>0;let dialogSeen=false;
  if(hadTurns)page.once('dialog',async dialog=>{dialogSeen=true;await dialog.accept();});
  const before=await turnCount(page);await page.locator('#newWorkspace').click();await page.waitForTimeout(250);
  assert((await turnCount(page))===before,'new topic must preserve prior family conversation evidence');
  if(hadTurns)assert(dialogSeen,'new topic confirmation missing');
}
async function openNewFamilyProfile(page){
  const hadTurns=(await turnCount(page))>0,previousId=await currentWorkspaceId(page);let dialogSeen=false;
  assert(previousId,'current family workspace id missing before reset');
  if(hadTurns)page.once('dialog',async dialog=>{dialogSeen=true;await dialog.accept();});
  await page.locator('#newFamilyProfile').evaluate(el=>el.click());
  const deadline=Date.now()+15000;let nextId='';
  while(Date.now()<deadline){if((await turnCount(page))===0){nextId=await currentWorkspaceId(page);if(nextId&&nextId!==previousId)break;}await page.waitForTimeout(50);}
  assert((await turnCount(page))===0,'new family profile did not clear the prior conversation');
  assert(nextId&&nextId!==previousId,`new family profile did not commit an independent workspace: ${previousId} -> ${nextId||'(missing)'}`);
  if(hadTurns)assert(dialogSeen,'new family profile confirmation missing');
}
async function reset(page){await openNewFamilyProfile(page);}
async function transientMajorBandsRecovery(page,name){
  if(name!=='pc')return;
  await reset(page);let injected=false;page.__expectedSyntheticMajorBands503Count=0;
  await page.route('**/api/major-bands**',async route=>{if(!injected){injected=true;page.__expectedSyntheticMajorBands503Count=1;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,message:'synthetic transient 503'})});return;}await route.continue();});
  try{const data=await submitTurn(page,'500分，辽宁省内先看能上的学校',{candidates:true});await page.waitForTimeout(150);assert(injected,`${name}: transient 503 was not injected`);assert(page.__expectedSyntheticMajorBands503Count===0,`${name}: synthetic 503 console evidence was not observed exactly once`);assert(data.result?.candidates?.ok===true,`${name}: deterministic bridge did not recover after transient 503`);}finally{page.__expectedSyntheticMajorBands503Count=0;await page.unroute('**/api/major-bands**');}
}

async function transientAiTurnRecovery(page,name){if(name!=='pc')return;await reset(page);let injected=false;page.__expectedSyntheticAiTurn503Count=0;await page.route('**/api/ai/turn',async route=>{const body=route.request().postData()||'';if(!injected&&body.includes('500分，辽宁省内先看能上的学校')){injected=true;page.__expectedSyntheticAiTurn503Count=1;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,message:'synthetic transient AI turn failure'})});return;}await route.continue();});try{const data=await submitTurn(page,'500分，辽宁省内先看能上的学校',{candidates:true});assert(injected,`${name}: transient AI turn was not injected`);assert(page.__expectedSyntheticAiTurn503Count===0,`${name}: AI turn retry did not consume the synthetic failure`);assert(data.result?.candidates?.ok===true,`${name}: AI turn retry did not complete the deterministic journey`);}finally{page.__expectedSyntheticAiTurn503Count=0;await page.unroute('**/api/ai/turn');}}
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
  assert(await turnCount(page)>=1,`${name}: profile turn missing`);
  await submitTurn(page,'不接受倒班');await submitTurn(page,'编程可以接受');
  const profileBefore=(await page.locator('#decisionProfileSummary').innerText()).replace(/\s+/g,' ');
  assert(profileBefore.includes('就业')&&profileBefore.includes('倒班')&&profileBefore.includes('编程'),`${name}: family profile not visible: ${profileBefore}`);
  await page.reload({waitUntil:'networkidle'});await waitForAppReady(page);
  const profileAfter=(await page.locator('#decisionProfileSummary').innerText()).replace(/\s+/g,' ');
  assert(profileAfter.includes('就业')&&profileAfter.includes('倒班')&&profileAfter.includes('编程'),`${name}: explicit family profile not persisted: ${profileAfter}`);
  const beforeTurns=await turnCount(page);await openNewTopic(page);
  assert(await turnCount(page)===beforeTurns,`${name}: new topic lost family conversation evidence`);
  const profileTopic=(await page.locator('#decisionProfileSummary').innerText()).replace(/\s+/g,' ');
  assert(profileTopic.includes('倒班')&&profileTopic.includes('编程'),`${name}: new topic lost confirmed family conditions`);
  const view=await viewText(page);assert(!view.includes('机械')&&!view.includes('沈阳')&&!view.includes('大连'),`${name}: new topic retained temporary query focus: ${view}`);
}

async function latestWins(page,name){
  if(name!=='pc')return;
  let delayed=true;await page.route('**/api/ai/turn',async route=>{const body=route.request().postData()||'';if(delayed&&body.includes('只看大连')){delayed=false;await new Promise(r=>setTimeout(r,2200));try{await route.continue();}catch{}return;}await route.continue();});
  await page.locator('#promptInput').fill('只看大连');await page.locator('#sendButton').click();await page.waitForTimeout(150);assert((await page.locator('#sendButton').innerText()).includes('改口'),`${name}: running input not interruptible`);
  const latest='只看沈阳';const p=waitForFinalTurnResponse(page,latest);await page.locator('#promptInput').fill(latest);await page.locator('#sendButton').click();const response=await p;assert(response.status()===200,`${name}: latest response failed`);await waitIdle(page);await page.waitForTimeout(2400);await assertView(page,['沈阳'],['大连']);await page.unroute('**/api/ai/turn');
}

async function parentEntryUiJourney(page,name){
  if(name!=='pc')return;
  await reset(page);
  assert(await page.locator('body[data-ai-plus="family-advisor"]').count()===1,'AI Plus body contract missing');
  const assetVersion=await page.locator('body').getAttribute('data-ai-plus-assets');assert(assetVersion==='aiplus-assets-v002_4',`AIPLuS asset version drift: ${assetVersion}`);assert(await page.locator('body').getAttribute('data-ai-family-decision')==='aiplus-family-decision-v0.03','FDW capability identity missing');assert(await page.locator('body').getAttribute('data-ai-feedback-log')==='aiplus-feedback-log-v0.04','Feedback Log capability identity missing');const assetHrefs=await page.locator('link[rel="stylesheet"],script[type="module"]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')||node.getAttribute('src')||''));const feedbackAssets=['/aiplus/feedback-log.v004.css?v=004_0','/aiplus/feedback-log-ui.v004.js?v=004_0'];for(const feedbackAsset of feedbackAssets)assert(assetHrefs.filter(href=>href===feedbackAsset).length===1,`Feedback Log additive asset drift: ${feedbackAsset} in ${JSON.stringify(assetHrefs)}`);const coreAssetHrefs=assetHrefs.filter(href=>!feedbackAssets.includes(href));assert(coreAssetHrefs.length===assetHrefs.length-feedbackAssets.length,`Unexpected additive AIPLuS entry asset: ${JSON.stringify(assetHrefs)}`);assert(coreAssetHrefs.every(href=>href.includes('fdw=003_0')),`FDW core cache subtransaction missing: ${JSON.stringify(coreAssetHrefs)}`);
  const footer=page.locator('.aiplus-product-footer');assert(await footer.isVisible(),'AIPLuS v0.02 footer is not visible');assert((await footer.innerText()).includes('v0.02'),'AIPLuS v0.02 footer text missing');const footerLayout=await footer.evaluate(el=>{const rect=el.getBoundingClientRect(),style=getComputedStyle(el);return{position:style.position,width:rect.width,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth};});assert(footerLayout.position==='static',`AIPLuS v0.02 footer must not be fixed over the composer: ${JSON.stringify(footerLayout)}`);assert(footerLayout.width<=footerLayout.viewport+2&&footerLayout.scrollWidth<=footerLayout.viewport+2,`AIPLuS v0.02 footer overflows viewport: ${JSON.stringify(footerLayout)}`);
  const promptLabel=(await page.locator('label[for="promptInput"]').innerText()).replace(/\s+/g,' ').trim();
  assert(promptLabel==='问学校、专业、分数或怎么选',`AI Plus prompt label drift: ${promptLabel}`);
  const promptPlaceholder=String(await page.locator('#promptInput').getAttribute('placeholder')||'');
  assert(promptPlaceholder.includes('568分')&&promptPlaceholder.includes('普通家庭')&&promptPlaceholder.includes('怎么选'),'AI Plus parent decision placeholder missing');
  const score=page.locator('#starterScore'),apply=page.locator('#starterScoreApply');
  const initial=(await page.locator('#starterScenarios').innerText()).replace(/\s+/g,' ');assert(initial.includes('先输入一个大概分数'),`family advisor should not start in school-only mode: ${initial}`);
  await score.fill('580');await apply.click();const familyStarters=(await page.locator('#starterScenarios').innerText()).replace(/\s+/g,' ');
  assert(familyStarters.includes('本科就业优先')&&familyStarters.includes('211中外'),`580 family starters missing: ${familyStarters}`);
  assert(!familyStarters.includes('先把学校看懂'),`school-only starter leaked into family advisor: ${familyStarters}`);
}
async function regionSchoolDirectoryJourney(page,name){await reset(page);const first=await submitTurn(page,'吉林有那些大学');assert(first.command.agentTask==='region_school_directory',`${name}: 吉林目录 task ${first.command.agentTask}`);assert(first.result?.regionSchools?.ok===true,`${name}: 吉林目录 missing`);assert(await page.locator('.region-directory').count()===1,`${name}: dedicated region directory card missing`);assert(await page.locator('.region-school-name').count()>0,`${name}: school links missing`);assert(await page.locator('.region-school-tab').count()===3,`${name}: local level tabs missing`);await checkGeometry(page,`${name}:region-directory`);const previousView=await viewText(page);const firstSchool=(await page.locator('.region-school-name').first().innerText()).trim();const responsePromise=waitForFinalTurnResponse(page,`介绍下${firstSchool}`);await page.locator('.region-school-name').first().click();const response=await responsePromise;const data=await response.json();assert(response.status()===200&&data?.ok===true,`${name}: school link did not continue conversation`);assert(data.command.agentTask==='school_research',`${name}: school link task ${data.command.agentTask}`);await waitIdle(page);assert(await viewText(page)===previousView,`${name}: region knowledge click polluted candidate view`);await reset(page);await submitTurn(page,'辽宁科技大学怎么样');const polluted=await submitTurn(page,'北京的大学有哪些');assert(polluted.command.agentTask==='region_school_directory',`${name}: prior school polluted Beijing directory: ${polluted.command.agentTask}`);assert(polluted.result?.regionSchools?.region?.label==='北京',`${name}: Beijing region mismatch`);}
async function schoolHistoryAliasJourney(page,name){if(name!=='pc')return;await reset(page);let data=await submitTurn(page,'580分，省内电气有哪些学校',{candidates:true});assert(data.result?.candidates?.ok===true,'580 electric candidate');data=await submitTurn(page,'沈阳工业 测控多少分',{history:true});assert(data.command.agentTask==='school_major_history','沈阳工业 测控 task');assert(data.result.history.school==='沈阳工业大学','沈阳工业 shorthand school');assert(String(data.result.history.majorKeyword||'').includes('测控'),'沈阳工业 测控 major');data=await submitTurn(page,'沈阳工业 所有专业最低分',{history:true});assert(data.command.agentTask==='school_history','沈阳工业 all-major task');assert(data.result.history.school==='沈阳工业大学','沈阳工业 all-major school');assert((data.result.history.records||[]).length>10,'沈阳工业 all-major records unexpectedly tiny');data=await submitTurn(page,'大连交通 都多少分',{history:true});assert(data.command.agentTask==='school_history','大连交通 colloquial all-major task');assert(data.result.history.school==='大连交通大学','大连交通 colloquial school');assert((data.result.history.records||[]).length>10,'大连交通 colloquial all-major records unexpectedly tiny');data=await submitTurn(page,'沈阳工业大学自动化多少分',{history:true});assert(data.command.agentTask==='school_major_history','industrial automation task');assert(data.result.history.school==='沈阳工业大学','industrial school');assert(!bodySummary(data).includes('参考分数格式不正确'),'null score leaked into school history');data=await submitTurn(page,'沈阳工业大学所有专业的最低录取分',{history:true});assert(data.command.agentTask==='school_history','all-major history task');assert((data.result.history.records||[]).length>10,'all-major records unexpectedly tiny');assert(Number.isFinite(Number(data.result.history.summary?.minScore)),'all-major min score missing');data=await submitTurn(page,'沈航的电气呢',{history:true});assert(data.result.history.school==='沈阳航空航天大学',`沈航 alias failed: ${bodySummary(data.result.history)}`);data=await submitTurn(page,'沈航 机械多少分 电气多少分 测控多少分',{history:true});assert(data.command.agentTask==='school_major_history','沈航 multi-major task');assert(data.command.majorKeywords?.length===3,'沈航 multi-major aliases collapsed');assert(data.result.history.majorKeywords?.length===3,'沈航 multi-major query list missing');assert((data.result.history.records||[]).length>0,'沈航 multi-major history unexpectedly empty');assert(await page.locator('.major-suggestions').count()>0,'broad major should expose optional related-major prompts');data=await submitTurn(page,'沈阳航空航天大学机械测控与材料多少分',{history:true});assert(data.command.majorKeywords?.length===3,'compact multi-major aliases not segmented');assert((data.result.history.records||[]).length>0,'compact multi-major history unexpectedly empty');data=await submitTurn(page,'辽科大的电气呢',{history:true});assert(data.result.history.school==='辽宁科技大学',`辽科大 alias failed: ${bodySummary(data.result.history)}`);data=await submitTurn(page,'电气在辽宁哪些学校有背景证据',{background:true});assert(data.command.agentTask==='major_background','major background task');assert((data.result.background.items||[]).some(item=>Array.isArray(item.schools)&&item.schools.length),'background school objects missing');await page.locator('.background-schools').first().evaluate(el=>el.open=true);assert(await page.locator('.background-school-link').count()>0,'background school links missing');const href=await page.locator('.background-school-link').first().getAttribute('href');assert(href?.includes('/ln-rank/?mode=school-all&school='),`background link invalid ${href}`);data=await submitTurn(page,'辽科大',{history:true});assert(data.result.history.school==='辽宁科技大学','school continuation lost');assert(data.result.history.majorKeyword?.includes('电气'),'major focus lost after background');}
async function majorRegionHistoryJourney(page,name){if(name!=='pc')return;await reset(page);const data=await submitTurn(page,'测控专业 省内都多少分',{majorHistory:true});assert(data.command.agentTask==='major_region_history',`major history task drift: ${data.command.agentTask}`);assert(data.resolvedView?.majorKeywords?.includes('测控技术与仪器'),'major history view major missing');assert(data.resolvedView?.regionKeys?.some(key=>key==='ln'||key==='province:辽宁'),'major history view region missing');assert((data.result.majorHistory.records||[]).length>0,'major history records missing');assert((data.result.majorHistory.records||[]).every(item=>item.province==='辽宁'),'major history leaked outside Liaoning');const stream=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' ');assert(stream.includes('测控技术与仪器'),'major history major not rendered');assert(/最低\d+分/.test(stream)&&/最高\d+分/.test(stream),`major history score range not rendered: ${stream.slice(-1500)}`);assert(stream.includes('2026参考'),'major history record cards missing');}

async function schoolResearchAndHistoryJourney(page,name){
  if(name!=='pc')return;
  await reset(page);
  const data=await submitTurn(page,'介绍下辽宁科技大学',{timeout:150000});
  assert(data.command.agentTask==='school_research',`school research task drift: ${data.command.agentTask}`);
  assert(data.commitView===false||data.command?.executionPolicy?.commitView===false,'school research must not mutate active candidate view');
  assert(data.result?.execution?.plan?.mode==='multi_tool_research',`research plan missing: ${bodySummary(data.result?.execution?.plan)}`);
  assert(data.result?.officialSchool?.ok===true,`official school research missing: ${bodySummary(data.result?.officialSchool)}`);
  assert(data.result?.history?.ok===true,`school research history missing: ${bodySummary(data.result?.history)}`);
  const stream=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' ');
  assert(stream.includes('辽宁科技大学'),'school research answer missing school name');
  const researchTurn=page.locator('#conversationStream .turn[data-turn-id]').last(),primary=researchTurn.locator('.assistant-lead[data-answer-status="answered"] p'),primaryText=(await primary.innerText()).replace(/\s+/g,' ').trim();
  assert(primaryText.length>40&&primaryText.includes('辽宁科技大学'),`direct school primary answer missing: ${primaryText}`);
  assert(!/(这轮切到|建立可行范围|先给结论)/.test(primaryText),`AI-style answer preface leaked: ${primaryText}`);
  const answerFirst=await researchTurn.evaluate(el=>{const lead=el.querySelector('.assistant-lead'),support=el.querySelector('.result-card,.turn-understanding,.details-card');return Boolean(lead&&support&&(lead.compareDocumentPosition(support)&Node.DOCUMENT_POSITION_FOLLOWING));});
  assert(answerFirst,'school primary answer must precede support cards in DOM order');
  assert(stream.includes('2026辽宁物理类投档'),'research hard-fact snapshot missing');
  assert(!stream.includes('学校 不限学校 → 介绍下辽宁科技大学'),'legacy mutation copy leaked');
  await page.waitForFunction(()=>document.querySelectorAll('#historyList .history-item').length>=1,null,{timeout:10000});
  const firstCount=await page.locator('#historyList .history-item').count();
  assert(firstCount>=1,'history did not persist current conversation');
  await openNewFamilyProfile(page);
  await submitTurn(page,'大连交通 都多少分',{history:true});
  await page.waitForFunction(()=>document.querySelectorAll('#historyList .history-item').length>=2,null,{timeout:10000});
  assert(await page.locator('#historyList .history-item').count()>=2,'new family profile did not preserve prior History');
  await page.locator('.decision-history-card').evaluate(el=>el.open=true);
  const historySearch=page.locator('#historySearch');
  await historySearch.fill('辽宁科技大学');
  await page.waitForFunction(()=>{const items=document.querySelectorAll('#historyList .history-item'),t=document.querySelector('#historyList')?.textContent||'';return items.length>=1&&t.includes('学校研究')&&t.includes('辽宁科技大学')&&!t.includes('大连交通');},null,{timeout:10000});
  let historyText=(await page.locator('#historyList').innerText()).replace(/\s+/g,' ');
  assert(historyText.includes('辽宁科技大学')&&!historyText.includes('大连交通'),`History school search leaked sessions: ${historyText}`);
  await page.locator('#historyList .history-item .history-open-item').first().click();
  await page.waitForFunction(()=>{const t=document.querySelector('#conversationStream')?.textContent||'';return t.includes('介绍下辽宁科技大学')&&!t.includes('大连交通 都多少分');},null,{timeout:10000});
  let switchedStream=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' ');
  assert(switchedStream.includes('介绍下辽宁科技大学')&&!switchedStream.includes('大连交通 都多少分'),`History switch leaked discussion state: ${switchedStream.slice(0,1200)}`);
  assert(!(await page.locator('#activeViewBar').isVisible()),'school research session unexpectedly restored candidate filters');
  await historySearch.fill('大连交通');
  await page.waitForFunction(()=>{const items=document.querySelectorAll('#historyList .history-item'),t=document.querySelector('#historyList')?.textContent||'';return items.length>=1&&t.includes('大连交通')&&!t.includes('辽宁科技大学');},null,{timeout:10000});
  historyText=(await page.locator('#historyList').innerText()).replace(/\s+/g,' ');
  assert(historyText.includes('大连交通')&&!historyText.includes('辽宁科技大学'),`History second search leaked sessions: ${historyText}`);
  await page.locator('#historyList .history-item .history-open-item').first().click();
  await page.waitForFunction(()=>{const t=document.querySelector('#conversationStream')?.textContent||'';return t.includes('大连交通 都多少分')&&!t.includes('介绍下辽宁科技大学');},null,{timeout:10000});
  switchedStream=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' ');
  assert(switchedStream.includes('大连交通 都多少分')&&!switchedStream.includes('介绍下辽宁科技大学'),`History second switch leaked discussion state: ${switchedStream.slice(0,1200)}`);
  await historySearch.fill('');
  await submitTurn(page,'580分省内机械看看',{candidates:true});
  const filtered=await submitTurn(page,'只看辽宁科技大学',{timeout:150000});
  assert(['candidate_discovery','candidate_refinement'].includes(filtered.command?.agentTask),`explicit school filter task drift: ${filtered.command?.agentTask}`);
  assert(filtered.command?.executionPolicy?.commitView===true&&filtered.commitView===true,'explicit school filter must commit active view');
  assert(JSON.stringify(filtered.command?.schoolNames)===JSON.stringify(['辽宁科技大学']),'explicit school entity must exclude filter verb');
  assert(JSON.stringify(filtered.command?.changeSet?.school)===JSON.stringify({op:'set',values:['辽宁科技大学']}),'explicit school filter patch drift');
  assert(JSON.stringify(filtered.resolvedView?.schoolNames)===JSON.stringify(['辽宁科技大学']),'explicit school filter did not reach active view');
  await assertView(page,['辽宁科技大学']);
  await historySearch.fill('介绍下辽宁科技大学');
  await page.waitForFunction(()=>{const items=document.querySelectorAll('#historyList .history-item'),t=document.querySelector('#historyList')?.textContent||'';return items.length===1&&t.includes('学校研究')&&t.includes('辽宁科技大学')&&!t.includes('只看辽宁科技大学');},null,{timeout:10000});
  await page.locator('#historyList .history-item .history-open-item').first().click();
  await page.waitForFunction(()=>{const t=document.querySelector('#conversationStream')?.textContent||'';return t.includes('介绍下辽宁科技大学')&&!document.querySelector('#activeViewBar')?.offsetParent;},null,{timeout:10000});
  assert(!(await page.locator('#activeViewBar').isVisible()),'candidate state leaked into school research discussion');
  await historySearch.fill('大连交通');
  await page.waitForFunction(()=>{const items=document.querySelectorAll('#historyList .history-item'),t=document.querySelector('#historyList')?.textContent||'';return items.length>=1&&t.includes('只看辽宁科技大学')&&!t.includes('学校研究');},null,{timeout:10000});
  await page.locator('#historyList .history-item .history-open-item').first().click();
  await page.waitForFunction(()=>{const t=document.querySelector('#activeViewChips')?.textContent||'';return t.includes('580分')&&t.includes('机械')&&t.includes('辽宁科技大学');},null,{timeout:10000});
  await assertView(page,['580分','机械','辽宁科技大学']);
  await historySearch.fill('');
}

async function singleSchoolPromptJourney(page,name){
  await reset(page);
  const data=await submitTurn(page,'大连交通 都多少分',{history:true});
  assert(data.command.agentTask==='school_history',`${name}: single-school history task drift`);
  const prompts=(await page.locator('.question-button strong').allTextContents()).map(text=>text.trim());
  assert(prompts.includes('回到学校整体介绍'),`${name}: school profile follow-up missing`);
  assert(prompts.includes('看校园环境与同学体验'),`${name}: school environment follow-up missing`);
  assert(prompts.includes('看哪些专业更有积累'),`${name}: school major-background follow-up missing`);
  const historyCard=page.locator('.result-card .history-list .history-item').first();
  if(await historyCard.count()){const metrics=await historyCard.evaluate(el=>{const school=el.querySelector('.candidate-school'),major=el.querySelector('.candidate-major');return{display:getComputedStyle(el).display,cardWidth:el.getBoundingClientRect().width,cardScroll:el.scrollWidth,schoolWidth:school?.getBoundingClientRect().width||0,schoolScroll:school?.scrollWidth||0,majorWidth:major?.getBoundingClientRect().width||0,majorScroll:major?.scrollWidth||0,inner:innerWidth};});assert(metrics.display==='block',`${name}: result history card inherited sidebar grid layout ${JSON.stringify(metrics)}`);assert(metrics.cardScroll<=metrics.cardWidth+2&&metrics.schoolScroll<=metrics.schoolWidth+2&&metrics.majorScroll<=metrics.majorWidth+2,`${name}: result history card text overflow ${JSON.stringify(metrics)}`);}
  await checkGeometry(page,`${name}:single-school-prompts`);
  if(name!=='pc')return;
  const experience=await submitTurn(page,'学校环境呢',{timeout:120000});
  assert(experience.command.agentTask==='school_experience',`school experience task drift: ${experience.command.agentTask}`);
  assert(experience.result?.experience?.ok===true,`school experience unavailable: ${bodySummary(experience.result?.experience)}`);
  assert((experience.result.experience.mode==='summary')||(experience.result.experience.reviews||[]).length<=4,'school experience fallback must be summary or at most four reviews');
  const stream=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' ');
  assert(stream.includes('用户生成内容')&&stream.includes('不能代表所有学生'),'school experience boundary missing');
}

async function responsiveHistoryDrawerJourney(page,name){
  const panel=page.locator('#historyPanel'),close=page.locator('#historyClose');
  if(name==='pc'){assert(await panel.isVisible(),'pc: History sidebar should stay visible');assert(!(await close.isVisible()),'pc: drawer close button should not displace sidebar');return;}
  await reset(page);
  assert(!(await page.locator('body').evaluate(el=>el.classList.contains('history-open'))),`${name}: History drawer should start closed`);
  await page.locator('#historyToggle').click();
  await page.waitForFunction(()=>document.body.classList.contains('history-open'),null,{timeout:10000});
  await page.waitForTimeout(250);
  assert(await close.isVisible(),`${name}: History drawer has no visible close control`);
  const drawer=await page.evaluate(()=>{const p=document.querySelector('#historyPanel')?.getBoundingClientRect();return{inner:innerWidth,left:p?.left,right:p?.right,width:p?.width};});
  assert(drawer.left>=-2&&drawer.right<=drawer.inner+2&&drawer.width<=drawer.inner+2,`${name}: History drawer escapes viewport ${JSON.stringify(drawer)}`);
  await close.click();
  await page.waitForFunction(()=>!document.body.classList.contains('history-open'),null,{timeout:10000});
  await page.locator('#promptInput').click();
  const composer=await page.evaluate(()=>{const r=document.querySelector('.composer')?.getBoundingClientRect(),v=window.visualViewport;return{top:r?.top,bottom:r?.bottom,width:r?.width,inner:innerWidth,height:v?.height||innerHeight};});
  assert(composer.top>=-2&&composer.bottom<=composer.height+2&&composer.width<=composer.inner+2,`${name}: composer escapes visual viewport ${JSON.stringify(composer)}`);
  await checkGeometry(page,`${name}:history-drawer`);
}

async function scoreBandParentJourneys(page,name){if(name!=='pc')return;const basePrompts=new Map([[350,'350分，全国先看还能研究哪些学校'],[440,'440分，辽宁省内先看能上的学校'],[500,'500分，辽宁省内先看能上的学校'],[580,'580分，省内机械看看'],[620,'620分，全国先看能上的学校'],[630,'630分，全国电气看看'],[650,'650分，全国先看能上的学校']]);for(const [score,prompt] of basePrompts){await reset(page);const first=await submitTurn(page,prompt,{candidates:true});assert(Number(first.resolvedView?.score)===score,`${score}: score drift`);assert(first.result?.candidates?.ok===true,`${score}: candidate failed`);if(score===440){let q=await submitTurn(page,'民办也可以，看看能增加哪些选择',{candidates:true});assert(q.resolvedView?.bottomLineMode==='all','440 private broaden');q=await submitTurn(page,'中外合作也可以，预算可以上浮',{candidates:true});assert(q.resolvedView?.bottomLineMode==='public_include_sino','440 sino');q=await submitTurn(page,'新疆、西藏也可以，优先公办',{candidates:true});assert(q.resolvedView?.regionKeys?.includes('province:新疆')&&q.resolvedView?.regionKeys?.includes('province:西藏'),'440 far-region');}if(score===580){const q=await submitTurn(page,'愿意加预算，看看有没有211中外或高收费项目值得研究',{candidates:true});assert(q.command.platformTarget==='211','580 platform target');assert(q.result.candidates?.platformUpgrade?.target==='211','580 platform preview');assert(q.result.candidates.platformUpgrade.complete===false,'211 preview must not claim complete');}if(score===620){const advice=await submitTurn(page,'学校平台和专业质量怎么平衡');assert(Number(advice.resolvedView?.score)===620,'620 advisory lost score context');assert(advice.commitView===false,'620 advisory must not mutate candidate view');const q=await submitTurn(page,'愿意加预算，看看有没有985中外或高收费项目值得研究',{candidates:true});assert(q.command.platformTarget==='985','620 platform target');assert(q.result.candidates?.platformUpgrade?.target==='985','620 platform preview');assert(q.result.candidates.platformUpgrade.complete===false,'985 preview must not claim complete');}if(score===650){const advice=await submitTurn(page,'不只看学校层次，优先比较专业质量和培养路径');assert(Number(advice.resolvedView?.score)===650,'650 advisory lost score context');assert(advice.commitView===false,'650 advisory must not mutate candidate view');}}}
async function selectionAndModel(page,name){
  await page.evaluate(()=>localStorage.setItem('lnRank.selectionPool.lnPhysics.2026.v3951',JSON.stringify({items:[{id:'browser-1',school:'测试大学',major:'机械工程',rank2026:20000,bandKey:'near',displayLocation:'沈阳',tuition:'5200',userNote:'这段私有备注不能发给模型'}]})));
  if(name!=='pc'){
    await page.locator('#historyToggle').click();
    await page.waitForFunction(()=>document.body.classList.contains('history-open'),null,{timeout:5000});
  }
  await page.locator('.decision-support-card').evaluate(el=>el.open=true);
  await page.locator('#historyPanel').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await page.locator('#importSelection').click();
  await page.locator('#importStatus').filter({hasText:'已导入1项'}).waitFor({state:'visible',timeout:10000});
  assert(await page.locator('#healthBar,#modelConfig,#modelProbeResult,#probeModel').count()===0,`${name}: engineering/model controls leaked into parent UI`);
  const progress=(await page.locator('#decisionProgressList').innerText()).replace(/\s+/g,' ');assert(progress.includes('志愿方案'),`${name}: imported plan missing from decision progress`);
  if(name!=='pc'){
    await page.locator('#historyClose').click();
    await page.waitForFunction(()=>!document.body.classList.contains('history-open'),null,{timeout:5000});
  }
}

const browser=await chromium.launch({headless:true});
try{
  for(const device of devices){const context=await browser.newContext({viewport:device.viewport,isMobile:Boolean(device.isMobile),hasTouch:Boolean(device.hasTouch),locale:'zh-CN'});const page=await context.newPage();const errors=[];page.__expectedSyntheticMajorBands503Count=0;page.__expectedSyntheticAiTurn503Count=0;page.__aiPlusNetworkTrace=[];page.on('request',request=>{const url=request.url();if(url.includes('/api/ai/turn')||url.includes('/api/major-bands'))page.__aiPlusNetworkTrace.push({kind:'request',method:request.method(),url,postData:request.postData()?.slice(0,2000)||''});});page.on('response',response=>{const url=response.url();if(url.includes('/api/ai/turn')||url.includes('/api/major-bands'))page.__aiPlusNetworkTrace.push({kind:'response',status:response.status(),url});});page.on('pageerror',e=>errors.push(`pageerror:${e.message}`));page.on('console',m=>{if(m.type()!=='error')return;const text=m.text();if((page.__expectedSyntheticMajorBands503Count>0||page.__expectedSyntheticAiTurn503Count>0)&&/Failed to load resource:.*status of 503/.test(text)){if(page.__expectedSyntheticMajorBands503Count>0)page.__expectedSyntheticMajorBands503Count-=1;else page.__expectedSyntheticAiTurn503Count-=1;return;}errors.push(`console:${text}`);});try{const response=await page.goto(`${BASE}/aiplus/?browser=${encodeURIComponent(EXPECTED_SHA||'preview')}-${device.name}`,{waitUntil:'networkidle',timeout:60000});assert(response?.ok(),`${device.name}: /aiplus HTTP ${response?.status()}`);await waitForAppReady(page);assert(await page.locator('#decisionProgressList .decision-progress-item').count()===6,`${device.name}: six-stage decision progress missing`);assert(await page.locator('#healthBar,#modelConfig,#modelProbeResult,#probeModel,#decisionContextDetails').count()===0,`${device.name}: engineering UI leaked into workbench`);await coreHumanJourney(page,device.name);await profilePersistence(page,device.name);await responsiveHistoryDrawerJourney(page,device.name);await transientMajorBandsRecovery(page,device.name);await transientAiTurnRecovery(page,device.name);await parentEntryUiJourney(page,device.name);await regionSchoolDirectoryJourney(page,device.name);await viewportStabilityJourney(page,device.name);await singleSchoolPromptJourney(page,device.name);await schoolResearchAndHistoryJourney(page,device.name);await schoolHistoryAliasJourney(page,device.name);await majorRegionHistoryJourney(page,device.name);await scoreBandParentJourneys(page,device.name);await latestWins(page,device.name);await selectionAndModel(page,device.name);await checkGeometry(page,`${device.name}:final`);await page.screenshot({path:path.join(ARTIFACT_DIR,`${device.name}.png`),fullPage:true});assert(errors.length===0,`${device.name}: browser errors ${errors.join(' | ')}`);}catch(error){fs.writeFileSync(path.join(ARTIFACT_DIR,`${device.name}-failure.txt`),`${error.stack||error}\n${errors.join('\n')}\nnetworkTrace=${JSON.stringify(page.__aiPlusNetworkTrace,null,2)}\nui=${await page.locator('body').innerText().catch(()=>'' )}`);await page.screenshot({path:path.join(ARTIFACT_DIR,`${device.name}-failure.png`),fullPage:true}).catch(()=>{});throw error;}finally{await context.close();}}
  console.log(JSON.stringify({ok:true,base:BASE,expectedSha:EXPECTED_SHA,devices:devices.map(d=>d.name),checks:['aiplus-school-entry-contract','continuous-turn-history','580-mechanical-liaoning-shenyang','unmentioned-dimensions-inherit','causal-change-copy','candidate-score-rank-year-gap','no-raw-band-key','dynamic-next-questions','decision-profile-persistence','six-stage-decision-progress','human-school-shorthand-history','colloquial-school-all-major-history','school-research-direct-primary-answer','browser-history-multi-session','history-search-switch-isolation','history-drawer-close-pad-android','composer-viewport-pad-android','explicit-school-filter-normalization','latest-write-wins','selection-readonly','responsive-no-overflow','engineering-ui-absent']},null,2));
}finally{await browser.close();}