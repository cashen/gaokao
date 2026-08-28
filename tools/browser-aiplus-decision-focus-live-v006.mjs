import path from 'node:path';
import {pathToFileURL} from 'node:url';

const runtimeModules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright(){
  try{return await import('playwright');}
  catch(error){if(runtimeModules)return import(pathToFileURL(path.join(runtimeModules,'playwright','index.mjs')).href);throw error;}
}
const {chromium}=await loadPlaywright();
const BASE=String(process.env.DECISION_FOCUS_LIVE_BASE||process.env.PREVIEW_BASE||'').replace(/\/$/,'');
const EXPECTED_SHA=String(process.env.EXPECTED_SHA||'').trim();
const MODE=String(process.env.DECISION_FOCUS_LIVE_MODE||'preview');
if(!BASE)throw new Error('DECISION_FOCUS_LIVE_BASE/PREVIEW_BASE is required');

const DEVICES=[
  {name:'pc',viewport:{width:1440,height:900}},
  {name:'pad',viewport:{width:1024,height:768},hasTouch:true},
  {name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
function assert(value,message){if(!value)throw new Error(message);}

async function seed(page){
  await page.evaluate(async()=>{
    const {createAiWorkspace}=await import('/shared/ai/ai-workspace-contract.v3992_0.js?v=002_4&fdw=003_0');
    const {saveCurrentWorkspace}=await import('/aiplus/history-store.v3992_4.js?v=002_4&fdw=003_0');
    const pairA={school:'沈阳工业大学',major:'电气工程及其自动化',label:'沈阳工业大学 · 电气工程及其自动化'};
    const pairB={school:'大连交通大学',major:'自动化',label:'大连交通大学 · 自动化'};
    const claims=[
      {claimId:'C-live-a',subject:pairA.label,subjectType:'school_major',subjectId:`${pairA.school}|${pairA.major}`,dimension:'employment',value:'2025届该专业毕业去向已由学院按当年口径发布。',year:2025,sourceScope:'school_major',source:{sourceName:'学院就业材料',sourceUrl:'https://example.edu.cn/a'}},
      {claimId:'C-live-b',subject:pairB.school,subjectType:'school',subjectId:pairB.school,dimension:'employment',value:'2025届学校毕业生就业质量报告已发布。',year:2025,sourceScope:'school',source:{sourceName:'学校就业质量报告',sourceUrl:'https://example.edu.cn/b'}}
    ];
    const workspace=createAiWorkspace({
      id:'decision-focus-live',
      examContext:{score:578,rank:25000},
      decisionProfile:{explicit:{priorities:['employment','cost'],familyResourceSensitivity:'resource_sensitive',studyDurationTolerance:'prefer_short'}},
      agentContext:{currentTask:'decision_research',semanticFrame:{version:'live-focus',schools:[pairA.school,pairB.school],majors:[pairA.major,pairB.major],pairs:[pairA,pairB],comparisonPairs:[pairA,pairB],evidenceNeeds:['employment','cost'],currentEvidenceNeeds:['employment'],compositeDecision:true}},
      selectionSnapshot:{version:'live-selection',items:[{id:'a',...pairA,score2026:575,rank2026:26000,tuition:'5200元/年'},{id:'b',...pairB,score2026:572,rank2026:27500}]},
      tasks:[{id:'research',kind:'main',status:'complete',result:{decisionResearch:{claims}}}]
    });
    await saveCurrentWorkspace(workspace);
  });
}

async function panelIntersectsViewport(panel){
  return panel.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    return rect.width>0&&rect.height>0&&rect.right>0&&rect.left<window.innerWidth&&rect.bottom>0&&rect.top<window.innerHeight;
  }).catch(()=>false);
}
async function openDecisionBook(page,deviceName){
  const panel=page.locator('#historyPanel');
  if(!await panelIntersectsViewport(panel)){
    const mobileStrip=page.locator('#mobileDecisionStrip'),topToggle=page.locator('#historyToggle');
    if(await mobileStrip.isVisible().catch(()=>false))await mobileStrip.click();
    else if(await topToggle.isVisible().catch(()=>false))await topToggle.click();
    else throw new Error(`${deviceName}: no visible control can open the decision drawer`);
    await page.waitForFunction(()=>{
      const element=document.querySelector('#historyPanel');
      if(!element)return false;
      const rect=element.getBoundingClientRect();
      return document.body.classList.contains('history-open')&&rect.right>0&&rect.left<window.innerWidth&&rect.bottom>0&&rect.top<window.innerHeight;
    },null,{timeout:3000});
  }
  assert(await panelIntersectsViewport(panel),`${deviceName}: decision drawer is not inside the visual viewport`);
  const details=page.locator('#decisionBookDetails'),summary=details.locator('summary');
  if(!await details.evaluate(element=>element.open)){
    await summary.evaluate(element=>element.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
    await page.waitForTimeout(100);
    const summaryInsidePanel=await summary.evaluate(element=>{
      const panel=element.closest('#historyPanel');
      if(!panel)return false;
      const rect=element.getBoundingClientRect(),panelRect=panel.getBoundingClientRect();
      const top=Math.max(panelRect.top,0),bottom=Math.min(panelRect.bottom,window.innerHeight);
      return rect.bottom>top&&rect.top<bottom&&rect.right>Math.max(panelRect.left,0)&&rect.left<Math.min(panelRect.right,window.innerWidth);
    });
    assert(summaryInsidePanel,`${deviceName}: Decision Book summary did not become visible inside the real drawer scroll owner`);
    await summary.focus();
    await summary.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#decisionBookDetails')?.open===true,null,{timeout:3000});
  }
  const firstAction=page.locator('.decision-focus-action').first();
  await firstAction.evaluate(element=>element.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
  await page.waitForTimeout(100);
  await firstAction.waitFor({state:'visible',timeout:8000});
}

async function verifyDevice(browser,device){
  const context=await browser.newContext(device),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`${BASE}/aiplus/`,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.body?.dataset?.aiDecisionFocus==='aiplus-decision-focus-v0.06'&&document.querySelector('#sendButton')?.textContent?.trim()==='发送',null,{timeout:20000});
  await seed(page);
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll('.decision-focus-card').length===2&&document.querySelector('.decision-focus-next'),null,{timeout:20000});
  await openDecisionBook(page,device.name);

  const state=await page.evaluate(()=>{
    const root=document.documentElement,panel=document.querySelector('#historyPanel'),grid=document.querySelector('.decision-focus-grid');
    const text=document.querySelector('#decisionBookContent')?.textContent||'',next=document.querySelector('.decision-focus-next')?.textContent||'';
    const app=[...document.scripts].find(script=>script.src.includes('/aiplus/app.v3990_2.js'))?.src||'';
    const css=[...document.styleSheets].map(sheet=>sheet.href||'').find(href=>href.includes('decision-focus.v006.css'))||'';
    return{marker:document.body.dataset.aiDecisionFocus||'',text,next,overflow:root.scrollWidth-root.clientWidth,panelOverflow:panel?panel.scrollWidth-panel.clientWidth:0,columns:grid?getComputedStyle(grid).gridTemplateColumns:'',app,css};
  });
  assert(state.marker==='aiplus-decision-focus-v0.06',`${device.name}: capability marker missing`);
  assert(state.text.includes('真正需要比较的差异')&&state.text.includes('学校级参考')&&state.text.includes('有直接依据'),`${device.name}: comparison evidence states missing ${state.text}`);
  assert(state.next.includes('大连交通大学')&&state.next.includes('本科就业证据'),`${device.name}: next best question missing ${state.next}`);
  assert(state.app.includes('focus=006_0'),`${device.name}: top-level app cache edge missing ${state.app}`);
  assert(state.css.includes('decision-focus.v006.css')&&state.css.includes('v=006_0'),`${device.name}: decision focus stylesheet cache edge missing ${state.css}`);
  assert(state.overflow<=1,`${device.name}: horizontal overflow ${state.overflow}`);
  assert(state.panelOverflow<=1,`${device.name}: panel overflow ${state.panelOverflow}`);
  assert(!state.columns.includes(' '),`${device.name}: narrow rail must remain single-column ${state.columns}`);

  await page.evaluate(()=>{
    window.__decisionFocusSaveEvent=null;
    document.addEventListener('aiplus:decision-save',event=>{window.__decisionFocusSaveEvent=event.detail||null;},{once:true});
  });
  const pending=page.locator('.decision-focus-card').first().locator('.decision-focus-action',{hasText:'还要核实'});
  await pending.click({timeout:8000});
  await page.waitForFunction(()=>window.__decisionFocusSaveEvent?.kind==='school_major'&&window.__decisionFocusSaveEvent?.status==='pending',null,{timeout:3000});
  await page.waitForFunction(async()=>{
    const {loadCurrentWorkspace}=await import('/aiplus/history-store.v3992_4.js?v=002_4&fdw=003_0');
    const ws=await loadCurrentWorkspace();
    return ws?.decisions?.some(item=>item?.kind==='school_major'&&item?.status==='pending'&&item?.subject?.school==='沈阳工业大学');
  },null,{timeout:8000});
  const saved=await page.evaluate(async()=>{
    const {loadCurrentWorkspace}=await import('/aiplus/history-store.v3992_4.js?v=002_4&fdw=003_0');
    const ws=await loadCurrentWorkspace();
    return ws?.decisions?.find(item=>item?.kind==='school_major'&&item?.subject?.school==='沈阳工业大学')||null;
  });
  assert(saved?.status==='pending',`${device.name}: canonical decision_saved path did not persist pending status ${JSON.stringify(saved)}`);
  await page.waitForFunction(()=>document.querySelector('.decision-focus-card .decision-focus-action[aria-pressed="true"]')?.textContent?.includes('还要核实'),null,{timeout:3000}).catch(()=>{throw new Error(`${device.name}: decision persisted as pending but the visible Decision Book did not reflect the canonical workspace state`);});
  assert(!errors.length,`${device.name}: page errors ${errors.join('\n')}`);
  await context.close();
  return{device:device.name,...state,savedStatus:saved.status,eventStatus:'pending',visualStatus:'pending'};
}

const browser=await chromium.launch({headless:true}),evidence=[];
try{for(const device of DEVICES)evidence.push(await verifyDevice(browser,device));}
finally{await browser.close();}

if(MODE==='production'&&EXPECTED_SHA){
  const response=await fetch(`${BASE}/api/ai/health`,{headers:{accept:'application/json'},cache:'no-store'}),health=await response.json();
  assert(response.ok&&health?.ok,'production health unavailable');
  const deploymentSha=String(health?.deployment?.commitSha||'');
  assert(deploymentSha===EXPECTED_SHA,`production health SHA mismatch: ${deploymentSha} != ${EXPECTED_SHA}`);
}
console.log(JSON.stringify({ok:true,version:'aiplus-decision-focus-live-v0.06',mode:MODE,base:BASE,expectedSha:EXPECTED_SHA,devices:evidence},null,2));
