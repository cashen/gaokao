import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveSchoolMajorBackgroundContext } from '../shared/resources/background/academic-background-context.v001.js';
import { claimsFromAcademicBackground } from '../functions/_lib/ai/claim-evidence.js';

const BASE=(process.env.BASE_URL||'').replace(/\/$/,'');
if(!BASE)throw new Error('BASE_URL required');
const EXPECTED_SHA=process.env.EXPECTED_SHA||'';
const runtimeModules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright(){try{return await import('playwright');}catch(error){if(runtimeModules)return import(pathToFileURL(path.join(runtimeModules,'playwright','index.mjs')).href);throw error;}}
const {chromium}=await loadPlaywright();
const snapshot=JSON.parse(fs.readFileSync('ln-rank/data/background-context/background-context-index.v001.json','utf8'));
function norm(v){return String(v||'').normalize('NFKC').replace(/\s+/g,'').toLowerCase();}
function assert(v,m){if(!v)throw new Error(m);}
const pairs=new Map();
for(const record of snapshot.records||[]){const key=`${norm(record.schoolIdentity||record.school)}|${record.canonicalMajor?.code||''}`,item=pairs.get(key)||{school:record.schoolIdentity||record.school,major:record.canonicalMajor,scopes:new Set(),records:[]};item.scopes.add(record.scope);item.records.push(record);pairs.set(key,item);}
function claimsForPair(item){
  if(!item?.school||!item?.major?.code)return[];
  const context=resolveSchoolMajorBackgroundContext(snapshot,{school:item.school,majorCode:item.major.code,majorName:item.major.name,scope:'auto'});
  if(!context.matched)return[];
  return claimsFromAcademicBackground({
    ok:true,
    school:context.school||item.school,
    major:context.canonicalMajor?.name||item.major.name,
    scope:'auto',
    boundary:context.boundary,
    items:[{
      school:context.school||item.school,
      canonicalMajor:context.canonicalMajor||item.major,
      scopesMatched:context.scopesMatched,
      evidence:context.evidence,
      sources:context.sources,
      boundary:context.boundary
    }]
  });
}
function claimScopes(claims=[]){return new Set((claims||[]).flatMap(claim=>String(claim?.evidenceScope||'').split('+')).filter(Boolean));}
const DUAL=[...pairs.values()].find(item=>item.major?.code&&item.scopes.has('liaoning')&&item.scopes.has('211')&&claimsForPair(item).length>0);
assert(DUAL,'no dual-scope school-major sample with canonical claim provenance');
const DUAL_CLAIMS=claimsForPair(DUAL),DUAL_CLAIM_SCOPES=claimScopes(DUAL_CLAIMS);
assert(DUAL_CLAIM_SCOPES.has('211'),'dual-scope live sample lost claimable 211 provenance');
const schools211=new Set(snapshot.records.filter(r=>r.scope==='211').map(r=>norm(r.schoolIdentity||r.school)));
const LOCAL_ONLY=snapshot.records.find(r=>r.scope==='liaoning'&&!schools211.has(norm(r.schoolIdentity||r.school)));
assert(LOCAL_ONLY,'no local-only live sample');
const DEVICES=[
  {name:'pc',viewport:{width:1440,height:900}},
  {name:'pad',viewport:{width:1024,height:768},hasTouch:true},
  {name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
async function stable(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function noOverflow(page,name,stage){const n=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert(n<=1,`${name}: overflow ${n} at ${stage}`);}
async function verifyBrowser(page,name){
  const q=new URLSearchParams({majorCode:DUAL.major.code,canonicalName:DUAL.major.name,from:'ln-rank',context:'score',sourceKey:'live-dual',sourceMajor:DUAL.major.name,school:DUAL.school,returnTo:'/ln-rank/'});
  await page.goto(`${BASE}/major-path/?${q}`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector(`[data-major-pathway-focus="${DUAL.major.code}"]`,{timeout:30000});
  await page.waitForFunction(code=>document.querySelector(`[data-major-background-context="${code}"]`)?.dataset.majorBackgroundState==='matched',DUAL.major.code,{timeout:30000});
  await stable(page);
  const block=page.locator(`[data-major-background-context="${DUAL.major.code}"]`),text=await block.innerText();
  assert(text.includes(DUAL.school)&&text.includes('省内专业背景')&&text.includes('211专业背景'),`${name}: exact dual-scope major-path background missing`);
  assert(text.includes('不叠加')||text.includes('不相加'),`${name}: no non-scoring boundary`);
  const href=await block.locator('[data-major-background-scope-link="211"]').getAttribute('href');
  assert(href,`${name}: 211 scope detail missing`);
  await page.goto(new URL(href,BASE).href,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.body.dataset.backgroundDirectReady==='1',{timeout:30000});
  const direct=await page.locator('[data-background-direct]').innerText();
  assert(direct.includes(DUAL.school)&&direct.includes(DUAL.major.name)&&direct.includes('211专业背景'),`${name}: exact 211 detail missing`);
  const majorHref=await page.locator('[data-background-direct] .background-direct-major-link').getAttribute('href');
  assert(majorHref,`${name}: detail cannot return to major-path`);
  const backUrl=new URL(majorHref,BASE);assert(backUrl.searchParams.get('sourceSurface')==='academic-background',`${name}: source surface lost`);
  await page.goto(backUrl.href,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector(`[data-major-pathway-focus="${DUAL.major.code}"]`,{timeout:30000});
  assert((await page.locator('[data-major-path-source-boundary]').innerText()).includes('专业背景依据'),`${name}: background return source note missing`);
  assert((await page.locator('.back-home').innerText()).includes('返回背景依据'),`${name}: background return copy missing`);
  await noOverflow(page,name,'exact roundtrip');

  await page.goto(`${BASE}/major-path/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#majorInput').fill(DUAL.major.name);await page.locator('#majorInput').press('Enter');
  await page.waitForSelector(`[data-major-background-context="${DUAL.major.code}"]`,{timeout:30000});
  const independent=page.locator(`[data-major-background-context="${DUAL.major.code}"]`),independentText=await independent.innerText();
  assert(independentText.includes('不按“强弱”给学校排榜'),`${name}: independent major page became ranking-like`);
  assert(await independent.locator('[data-major-background-scope-link="liaoning"]').count(),`${name}: independent Liaoning action missing`);
  assert(await independent.locator('[data-major-background-scope-link="211"]').count(),`${name}: independent 211 action missing`);

  for(const [scope,pathname,readyKey,selector] of [
    ['liaoning','/ln-rank/local-mainline','localStrengthRuntime','.ls-record [data-background-major-entry]'],
    ['211','/ln-rank/211-mainline','all211Runtime','.a211-card [data-background-major-entry]']
  ]){
    const params=new URLSearchParams({view:'school',school:DUAL.school});
    await page.goto(`${BASE}${pathname}?${params}`,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(key=>document.body.dataset[key]==='ready',readyKey,{timeout:30000});
    await page.waitForFunction(()=>document.body.dataset.backgroundRecordHandoffReady==='1',{timeout:30000});
    await page.waitForSelector(selector,{timeout:30000});
    const target=await page.locator(selector).first().getAttribute('href'),u=new URL(target,BASE);
    assert(u.pathname==='/major-path/'&&u.searchParams.get('sourceSurface')==='academic-background'&&u.searchParams.get('school')===DUAL.school,`${name}: ${scope} record handoff wrong`);
  }
}
async function postTurn(input,workspace={}){
  const url=`${BASE}/api/ai/turn?ubc=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json','cache-control':'no-cache'},body:JSON.stringify({input,workspace,deterministicToolResults:{}})});
  const text=await response.text();let payload;try{payload=JSON.parse(text);}catch{throw new Error(`turn non-json ${response.status}: ${text.slice(0,400)}`);}
  assert(response.ok&&payload?.ok===true,`turn failed ${response.status}: ${text.slice(0,500)}`);return payload;
}
async function verifyAi(){
  const scoped=await postTurn('211里哪些学校通信工程有背景');
  assert(scoped.command?.agentTask==='major_background','live 211 phrase task drift');
  assert(scoped.command?.backgroundScope==='211'&&scoped.command?.backgroundScopeExplicit===true,'live 211 evidence scope drift');
  assert(scoped.pendingDeterministicTool!==true,'background evidence unexpectedly forked into client tool bridge');
  assert(scoped.result?.background?.scope==='211','live 211 tool silently fell back to another scope');
  assert(scoped.command?.scoreUsage!=='active','pure background question activated admissions score');

  const exact=await postTurn(`${DUAL.school}的${DUAL.major.name}有什么背景`);
  assert(exact.command?.agentTask==='school_background','live exact school-major background task drift');
  assert(exact.command?.backgroundScope==='auto','live exact school-major should inspect both scopes');
  assert(exact.result?.background?.ok===true,'live exact dual-scope evidence did not execute');
  const matched=new Set((exact.result.background.items||[]).flatMap(item=>item.scopesMatched||[]));
  assert(matched.has('liaoning')&&matched.has('211'),'live exact school-major did not expose both evidence scopes');
  const claims=exact.result.background.claims||[];
  assert(claims.length>0,'live exact background produced no typed claims');
  const liveClaimScopes=claimScopes(claims);
  assert([...DUAL_CLAIM_SCOPES].every(scope=>liveClaimScopes.has(scope)),'live typed claims lost canonical claimable scope provenance');
  assert([...liveClaimScopes].every(scope=>DUAL_CLAIM_SCOPES.has(scope)),'live typed claims invented an evidence scope without canonical claim provenance');
  assert(claims.every(claim=>claim.subjectType==='school_major'&&claim.evidenceId&&claim.sourceId&&(/^(?:https:\/\/|\/)/.test(claim.source?.sourceUrl||''))),'live background claim provenance incomplete');

  const miss=await postTurn(`${LOCAL_ONLY.schoolIdentity||LOCAL_ONLY.school}的${LOCAL_ONLY.canonicalMajor.name}的211专业背景怎么样`);
  assert(miss.command?.agentTask==='school_background','live explicit-211 miss task drift');
  assert(miss.command?.backgroundScope==='211','live explicit-211 miss scope drift');
  assert(miss.result?.background?.ok===false&&miss.result?.background?.code==='background_no_evidence','explicit 211 miss did not fail closed');
  assert(miss.result?.background?.scope==='211','explicit 211 miss fell back to local evidence');
  return{scoped:{task:scoped.command.agentTask,scope:scoped.command.backgroundScope,ok:scoped.result.background?.ok},exact:{school:DUAL.school,major:DUAL.major,claims:claims.length,claimScopes:[...liveClaimScopes]},miss:{school:LOCAL_ONLY.schoolIdentity||LOCAL_ONLY.school,major:LOCAL_ONLY.canonicalMajor,code:miss.result.background.code}};
}
const browser=await chromium.launch({headless:true});const devices=[];
try{for(const device of DEVICES){const context=await browser.newContext(device),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await verifyBrowser(page,device.name);assert(!errors.length,`${device.name}: page errors ${errors.join('\n')}`);devices.push({device:device.name,ok:true});await context.close();}}finally{await browser.close();}
const ai=await verifyAi();
console.log(JSON.stringify({ok:true,version:'unified-background-context-live-v0.01',base:BASE,expectedSha:EXPECTED_SHA,sample:{school:DUAL.school,major:DUAL.major,claimScopes:[...DUAL_CLAIM_SCOPES]},devices,ai},null,2));
