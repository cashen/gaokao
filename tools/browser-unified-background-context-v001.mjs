import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeModules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright(){try{return await import('playwright');}catch(error){if(runtimeModules)return import(pathToFileURL(path.join(runtimeModules,'playwright','index.mjs')).href);throw error;}}
const {chromium}=await loadPlaywright();
const ROOT=process.cwd();
const ORIGIN='https://background.test';
const DEVICES=[
  {name:'pc',viewport:{width:1440,height:900}},
  {name:'pad',viewport:{width:1024,height:768},hasTouch:true},
  {name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'android-compact',viewport:{width:360,height:740},isMobile:true,hasTouch:true}
];
function assert(value,message){if(!value)throw new Error(message);}
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function mime(file){if(file.endsWith('.css'))return'text/css; charset=utf-8';if(file.endsWith('.js')||file.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(file.endsWith('.html'))return'text/html; charset=utf-8';if(file.endsWith('.json'))return'application/json; charset=utf-8';if(file.endsWith('.svg'))return'image/svg+xml';return'application/octet-stream';}
function staticFile(pathname){const routeMap={'/major-path/':'/major-path/index.html','/ln-rank/local-mainline':'/ln-rank/local-mainline.html','/ln-rank/211-mainline':'/ln-rank/211-mainline.html'};const mapped=routeMap[pathname]||pathname;const resolved=path.resolve(ROOT,`.${decodeURIComponent(mapped)}`);if(!resolved.startsWith(`${ROOT}${path.sep}`)||!fs.existsSync(resolved)||!fs.statSync(resolved).isFile())return null;return resolved;}
const snapshot=JSON.parse(fs.readFileSync(path.join(ROOT,'ln-rank/data/background-context/background-context-index.v001.json'),'utf8'));
const byPair=new Map();
for(const record of snapshot.records||[]){const key=`${record.schoolIdentity||record.school}|${record.canonicalMajor?.code||''}`,item=byPair.get(key)||{school:record.schoolIdentity||record.school,major:record.canonicalMajor,scopes:new Set()};item.scopes.add(record.scope);byPair.set(key,item);}
const DUAL=[...byPair.values()].find(item=>item.major?.code&&item.scopes.has('liaoning')&&item.scopes.has('211'));
assert(DUAL,'no real dual-scope school-major sample');
function mockLnRankHtml(){return `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="candidateScore"></div><select id="region"><option value="辽宁">辽宁</option></select><input id="schoolKeyword"><input id="majorKeyword"><select id="schoolAllSort"><option value="position-near">position-near</option></select>
<div id="schoolAllTitle">${esc(DUAL.school)}</div>
<div id="results">
  <article class="major-card" data-workspace-record-key="score-dual"><div class="school">${esc(DUAL.school)}</div><div class="major">${esc(DUAL.major.name)}</div><div class="major-code-line"><b>${esc(DUAL.major.code)}</b>｜${esc(DUAL.major.name)}</div><div class="pool-add-hint"></div></article>
  <article class="major-card" data-workspace-record-key="score-class"><div class="school">${esc(DUAL.school)}</div><div class="major">计算机类</div><div class="major-code-line is-category"><b>0809</b>｜计算机类</div><div class="pool-add-hint"></div></article>
</div>
<div id="schoolAllContent">
  <article class="school-major-row" data-school-record="school-dual"><div class="school-major-main"><div class="school-major-title-line"><h3>${esc(DUAL.major.name)}</h3></div></div></article>
  <article class="school-major-row" data-school-record="school-class"><div class="school-major-main"><div class="school-major-title-line"><h3>计算机类</h3></div></div></article>
</div>
<script type="module">
import {state} from '/ln-rank/js/state/app-state.v3963_1.js?v=3963_1';
import {mountMajorPathHandoff} from '/ln-rank/js/workspace/major-path-handoff.v003.js?v=003_0';
state.candidateScore=580;state.rangePreset='standard';state.activeBand='near';state.resultMode='score-bands';state.filters.region='辽宁';
window.__GAOKAO_SELECTION_WORKSPACE__={version:'mock',getState:()=>({committedQuery:{score:580,rangePreset:'standard',filters:{...state.filters}},activeBand:'near'}),submit:()=>{}};
mountMajorPathHandoff();
document.dispatchEvent(new CustomEvent('gaokao:results-committed',{detail:{commitId:1}}));
document.dispatchEvent(new CustomEvent('gaokao:school-result-render'));
</script></body></html>`;}
function mockBackgroundHtml(){return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/ln-rank/css/background-context-direct.v001.css?v=001_0"></head><body data-local-strength-runtime="ready"><main><section class="ls-workspace"></section><div id="records">
<article class="ls-record" data-mock="canonical"><div class="ls-record-top"><div><div class="ls-school">${esc(DUAL.school)}</div><h3>${esc(DUAL.major.name)}</h3></div></div><div class="ls-record-actions"></div></article>
<article class="ls-record" data-mock="class"><div class="ls-record-top"><div><div class="ls-school">${esc(DUAL.school)}</div><h3>计算机类</h3></div></div><div class="ls-record-actions"></div></article>
</div></main><script type="module" src="/ln-rank/js/academic-background/background-context-direct.v001.js?v=001_0"></script></body></html>`;}
async function install(page){await page.route(`${ORIGIN}/**`,route=>{const url=new URL(route.request().url());if(url.pathname==='/ln-rank/mock-background-handoff.html')return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:mockLnRankHtml()});if(url.pathname==='/ln-rank/mock-background-records.html')return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:mockBackgroundHtml()});const file=staticFile(url.pathname);if(file)return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)});return route.fulfill({status:404,contentType:'text/plain',body:`missing ${url.pathname}`});});}
async function stable(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function noOverflow(page,name,stage){const n=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert(n<=1,`${name}: overflow ${n} at ${stage}`);}
async function waitBackground(page){await page.waitForSelector(`[data-major-pathway-focus="${DUAL.major.code}"]`);await page.waitForFunction(code=>document.querySelector(`[data-major-background-context="${code}"]`)?.dataset.majorBackgroundState==='matched',DUAL.major.code);await stable(page);}
async function verifyLnRankScoreToBackground(page,name){
  await page.goto(`${ORIGIN}/ln-rank/mock-background-handoff.html?score=580`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector(`[data-workspace-record-key="score-dual"] [data-major-path-entry="${DUAL.major.code}"]`);
  assert(!(await page.$('[data-workspace-record-key="score-class"] [data-major-path-entry]')),`${name}: class-level score card received entry`);
  const target=await page.locator('[data-workspace-record-key="score-dual"] [data-major-path-entry]').getAttribute('data-ui-navigation-target');
  const url=new URL(target,ORIGIN);
  assert(url.searchParams.get('majorCode')===DUAL.major.code,`${name}: score handoff lost canonical major`);
  assert(url.searchParams.get('school')===DUAL.school,`${name}: score handoff lost school identity`);
  assert(url.searchParams.get('sourceKey')==='score-dual',`${name}: score handoff lost source record`);
  await page.evaluate(href=>location.assign(href),target);
  await waitBackground(page);
  const state=await page.evaluate(code=>{const focus=document.querySelector(`[data-major-pathway-focus="${code}"]`),background=document.querySelector(`[data-major-background-context="${code}"]`);return{focusText:focus?.innerText||'',backgroundText:background?.innerText||'',adjacent:focus?.nextElementSibling===background,links:[...background?.querySelectorAll('[data-major-background-scope-link]')||[]].map(a=>({scope:a.dataset.majorBackgroundScopeLink,href:a.getAttribute('href')}))};},DUAL.major.code);
  assert(state.focusText.includes('本科到读研'),`${name}: human pathway missing before background`);
  assert(state.adjacent,`${name}: background context is not immediately after pathway answer`);
  assert(state.backgroundText.includes(DUAL.school),`${name}: exact school background heading missing`);
  assert(state.backgroundText.includes('省内专业背景')&&state.backgroundText.includes('211专业背景'),`${name}: dual evidence scopes not shown`);
  assert(state.backgroundText.includes('不叠加')||state.backgroundText.includes('不相加'),`${name}: dual-scope non-scoring boundary missing`);
  assert(new Set(state.links.map(x=>x.scope)).has('liaoning')&&new Set(state.links.map(x=>x.scope)).has('211'),`${name}: scope detail actions missing`);
  await noOverflow(page,name,'major-path exact school-major background');
  const detail=state.links.find(x=>x.scope==='211')?.href;
  assert(detail,`${name}: no 211 detail href`);
  const detailUrl=new URL(detail,ORIGIN);
  assert(detailUrl.pathname==='/ln-rank/211-mainline'&&detailUrl.searchParams.get('school')===DUAL.school&&detailUrl.searchParams.get('majorCode')===DUAL.major.code,`${name}: 211 detail identity wrong`);
  await page.goto(detailUrl.href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.backgroundDirectReady==='1');
  const direct=await page.locator('[data-background-direct]').innerText();
  assert(direct.includes(DUAL.school)&&direct.includes(DUAL.major.name)&&direct.includes('211专业背景'),`${name}: 211 exact direct answer missing`);
  assert(!direct.includes('推荐分')&&!direct.includes('学校排名'),`${name}: background detail became a ranking`);
  const backMajor=page.locator('[data-background-direct] .background-direct-major-link');
  assert(await backMajor.count(),`${name}: background detail cannot return to major-path`);
  await backMajor.click();
  await waitBackground(page);
  const returned=await page.evaluate(()=>({source:document.querySelector('[data-major-path-source-boundary]')?.innerText||'',back:document.querySelector('.back-home')?.innerText||'',href:document.querySelector('.back-home')?.getAttribute('href')||''}));
  assert(returned.source.includes('专业背景依据'),`${name}: major-path did not recognize background source surface`);
  assert(returned.back.includes('返回背景依据'),`${name}: background return copy missing`);
  assert(returned.href.includes('/ln-rank/211-mainline'),`${name}: background return target lost`);
}
async function verifyLnRankSchoolHandoff(page,name){
  await page.goto(`${ORIGIN}/ln-rank/mock-background-handoff.html?mode=school-all`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector(`[data-school-record="school-dual"] [data-major-path-entry="${DUAL.major.code}"]`);
  assert(!(await page.$('[data-school-record="school-class"] [data-major-path-entry]')),`${name}: class-level school row received entry`);
  const target=await page.locator('[data-school-record="school-dual"] [data-major-path-entry]').getAttribute('data-ui-navigation-target');
  const url=new URL(target,ORIGIN);
  assert(url.searchParams.get('school')===DUAL.school&&url.searchParams.get('sourceKey')==='school-dual',`${name}: school-mode identity/source record drift`);
  await page.goto(url.href,{waitUntil:'domcontentloaded'});await waitBackground(page);
  assert((await page.locator(`[data-major-background-context="${DUAL.major.code}"]`).innerText()).includes(DUAL.school),`${name}: school-mode exact background absent`);
}
async function verifyIndependentMajor(page,name){
  await page.goto(`${ORIGIN}/major-path/`,{waitUntil:'domcontentloaded'});
  await page.locator('#majorInput').fill(DUAL.major.name);await page.locator('#majorInput').press('Enter');
  await page.waitForSelector(`[data-major-pathway-focus="${DUAL.major.code}"]`);await page.waitForSelector(`[data-major-background-context="${DUAL.major.code}"]`);await stable(page);
  const block=page.locator(`[data-major-background-context="${DUAL.major.code}"]`),text=await block.innerText();
  assert(text.includes('哪些学校')&&text.includes('不按“强弱”给学校排榜'),`${name}: independent major background exploration not human-safe`);
  assert(await block.locator('[data-major-background-scope-link="liaoning"]').count(),`${name}: independent Liaoning action missing`);
  assert(await block.locator('[data-major-background-scope-link="211"]').count(),`${name}: independent 211 action missing`);
  await noOverflow(page,name,'independent major exploration');
}
async function verifyBackgroundRecordHandoff(page,name){
  await page.goto(`${ORIGIN}/ln-rank/mock-background-records.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector(`[data-mock="canonical"] [data-background-major-entry="${DUAL.major.code}"]`);
  assert(!(await page.$('[data-mock="class"] [data-background-major-entry]')),`${name}: class-level background record received major-path entry`);
  const href=await page.locator('[data-mock="canonical"] [data-background-major-entry]').getAttribute('href');
  const url=new URL(href,ORIGIN);
  assert(url.pathname==='/major-path/'&&url.searchParams.get('sourceSurface')==='academic-background'&&url.searchParams.get('school')===DUAL.school,`${name}: background record handoff identity wrong`);
}
async function verifyRealBackgroundPages(page,name){
  for(const [scope,pathname,recordSelector] of [['liaoning','/ln-rank/local-mainline','.ls-record [data-background-major-entry]'],['211','/ln-rank/211-mainline','.a211-card [data-background-major-entry]']]){
    const p=new URLSearchParams({view:'school',school:DUAL.school});
    await page.goto(`${ORIGIN}${pathname}?${p}`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(expected=>document.body.dataset[expected]==='ready',scope==='211'?'all211Runtime':'localStrengthRuntime',{timeout:30000});
    await page.waitForFunction(()=>document.body.dataset.backgroundRecordHandoffReady==='1',{timeout:30000});
    await page.waitForSelector(recordSelector,{timeout:30000});
    const target=await page.locator(recordSelector).first().getAttribute('href');
    const u=new URL(target,ORIGIN);
    assert(u.pathname==='/major-path/'&&u.searchParams.get('school')===DUAL.school&&u.searchParams.get('sourceSurface')==='academic-background',`${name}: ${scope} real record did not expose canonical major handoff`);
    await noOverflow(page,name,`${scope} background records`);
  }
}
const browser=await chromium.launch({headless:true});const evidence=[];
try{for(const device of DEVICES){const context=await browser.newContext(device),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await install(page);await verifyLnRankScoreToBackground(page,device.name);await verifyLnRankSchoolHandoff(page,device.name);await verifyIndependentMajor(page,device.name);await verifyBackgroundRecordHandoff(page,device.name);await verifyRealBackgroundPages(page,device.name);assert(!errors.length,`${device.name}: page errors ${errors.join('\n')}`);evidence.push({device:device.name,ok:true});await context.close();}}finally{await browser.close();}
console.log(JSON.stringify({ok:true,version:'unified-background-context-browser-v0.01',sample:{school:DUAL.school,major:DUAL.major},devices:evidence},null,2));
