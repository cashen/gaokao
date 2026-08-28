import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright(){ try { return await import('playwright'); } catch (error) { if(runtimeModules) return import(pathToFileURL(path.join(runtimeModules,'playwright','index.mjs')).href); throw error; } }
const { chromium } = await loadPlaywright();
const ROOT = process.cwd();
const ORIGIN = 'https://major-path.test';
const DEVICES = [
  {name:'pc',viewport:{width:1440,height:900}},
  {name:'pad',viewport:{width:1024,height:768},hasTouch:true},
  {name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'android-compact',viewport:{width:360,height:740},isMobile:true,hasTouch:true}
];
function assert(value,message){ if(!value) throw new Error(message); }
function mime(file){ if(file.endsWith('.css')) return 'text/css; charset=utf-8'; if(file.endsWith('.js')||file.endsWith('.mjs')) return 'text/javascript; charset=utf-8'; if(file.endsWith('.html')) return 'text/html; charset=utf-8'; if(file.endsWith('.json')) return 'application/json; charset=utf-8'; return 'application/octet-stream'; }
function staticFile(pathname){ const mapped=pathname==='/major-path/'?'/major-path/index.html':pathname; const resolved=path.resolve(ROOT,`.${decodeURIComponent(mapped)}`); if(!resolved.startsWith(`${ROOT}${path.sep}`)||!fs.existsSync(resolved)||!fs.statSync(resolved).isFile()) return null; return resolved; }
function mockLnRankHtml(){ return `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="candidateScore"></div><select id="region"><option value="all">all</option><option value="辽宁">辽宁</option></select><input id="schoolKeyword"><input id="majorKeyword"><select id="schoolAllSort"><option value="position-near">position-near</option></select>
<div id="schoolAllTitle">沈阳建筑大学</div>
<div id="results">
  <article class="major-card" data-workspace-record-key="score-key"><div class="major">工程管理</div><div class="major-code-line"><b>120103</b>｜工程管理</div><div class="pool-add-hint"></div></article>
  <article class="major-card" data-workspace-record-key="class-key"><div class="major">计算机类</div><div class="major-code-line is-category"><b>0809</b>｜计算机类</div><div class="pool-add-hint"></div></article>
</div>
<div id="schoolAllContent">
  <article class="school-major-row" data-school-record="school-key"><div class="school-major-main"><div class="school-major-title-line"><h3>机械工程（中外合作办学）</h3></div></div></article>
  <article class="school-major-row" data-school-record="school-class-key"><div class="school-major-main"><div class="school-major-title-line"><h3>计算机类</h3></div></div></article>
</div>
<script type="module">
import { state } from '/ln-rank/js/state/app-state.v3963_1.js?v=3963_1';
import { mountMajorPathHandoff } from '/ln-rank/js/workspace/major-path-handoff.v003.js?v=003_0';
state.candidateScore=580; state.rangePreset='standard'; state.activeBand='near'; state.resultMode='score-bands'; state.filters.region='辽宁';
window.__SUBMITS__=0;
window.__GAOKAO_SELECTION_WORKSPACE__={version:'mock',getState:()=>({committedQuery:{score:580,rangePreset:'standard',filters:{...state.filters}},activeBand:'near'}),submit:()=>{window.__SUBMITS__+=1;}};
mountMajorPathHandoff();
document.dispatchEvent(new CustomEvent('gaokao:results-committed',{detail:{commitId:1}}));
document.dispatchEvent(new CustomEvent('gaokao:school-result-render'));
</script></body></html>`; }
async function install(page){ await page.route(`${ORIGIN}/**`,route=>{ const url=new URL(route.request().url()); if(url.pathname==='/ln-rank/mock.html') return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:mockLnRankHtml()}); const file=staticFile(url.pathname); if(file) return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)}); return route.fulfill({status:404,contentType:'text/plain',body:`missing ${url.pathname}`}); }); }
async function noOverflow(page,name,stage){ const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth); assert(overflow<=1,`${name}: document overflow ${overflow} at ${stage}`); }
async function verifyHandoffDecoration(page,name){
  await page.goto(`${ORIGIN}/ln-rank/mock.html?score=580`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-workspace-record-key="score-key"] [data-major-path-entry="120103"]');
  await page.waitForSelector('[data-school-record="school-key"] [data-major-path-entry="080201"]');
  const state=await page.evaluate(()=>({
    version:window.__GAOKAO_MAJOR_PATH_HANDOFF__?.version,
    scoreTarget:document.querySelector('[data-workspace-record-key="score-key"] [data-major-path-entry]')?.dataset.uiNavigationTarget||'',
    schoolTarget:document.querySelector('[data-school-record="school-key"] [data-major-path-entry]')?.dataset.uiNavigationTarget||'',
    classEntry:document.querySelector('[data-workspace-record-key="class-key"] [data-major-path-entry]')?.dataset.majorPathEntry||'',
    schoolClassEntry:document.querySelector('[data-school-record="school-class-key"] [data-major-path-entry]')?.dataset.majorPathEntry||''
  }));
  assert(state.version==='major-path-ln-rank-handoff-v0.03',`${name}: handoff version drift`);
  const score=new URL(state.scoreTarget,ORIGIN), school=new URL(state.schoolTarget,ORIGIN);
  assert(score.searchParams.get('majorCode')==='120103'&&score.searchParams.get('context')==='score',`${name}: score direct target wrong`);
  assert(score.searchParams.get('sourceKey')==='score-key',`${name}: score source key missing`);
  assert(school.searchParams.get('majorCode')==='080201'&&school.searchParams.get('context')==='school',`${name}: school direct target wrong`);
  assert(school.searchParams.get('sourceMajor')==='机械工程（中外合作办学）',`${name}: school source major missing`);
  assert(!state.classEntry&&!state.schoolClassEntry,`${name}: class-level record received concrete-major entry`);
  await page.evaluate(()=>{ const button=document.querySelector('[data-workspace-record-key="score-key"] [data-major-path-entry]'); const url=new URL(button.dataset.uiNavigationTarget,location.href); document.dispatchEvent(new CustomEvent('gaokao:navigation-accepted',{detail:{target:`${url.pathname}${url.search}${url.hash}`}})); });
  const resume=await page.evaluate(()=>history.state?.lnRankMajorPathResumeV003||null);
  assert(resume?.sourceKey==='score-key'&&resume?.candidateScore===580&&resume?.filters?.region==='辽宁',`${name}: history resume snapshot incomplete`);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__SUBMITS__>=1);
  await page.waitForFunction(()=>!history.state?.lnRankMajorPathResumeV003);
  await noOverflow(page,name,'ln-rank handoff');
}
async function verifyDirectMode(page,name){
  const params=new URLSearchParams({majorCode:'120103',from:'ln-rank',context:'score',sourceKey:'score-key',sourceMajor:'工程管理',returnTo:'/ln-rank/?score=580'});
  await page.goto(`${ORIGIN}/major-path/?${params}`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-result-major="120103"]');
  const direct=await page.evaluate(()=>({
    core:document.body.dataset.majorPathVersion,
    handoff:document.body.dataset.majorPathHandoffVersion,
    direct:document.body.dataset.majorPathDirect,
    heroDisplay:getComputedStyle(document.querySelector('.hero')).display,
    back:document.querySelector('.back-home')?.textContent||'',
    backHref:document.querySelector('.back-home')?.getAttribute('href')||'',
    note:document.querySelector('[data-major-path-source-boundary]')?.textContent||'',
    input:document.querySelector('#majorInput')?.value||'',
    coreMeta:window.__MAJOR_PATH_META__?.version,
    directMeta:window.__MAJOR_PATH_DIRECT_META__?.version
  }));
  assert(direct.core==='major-path-v0.02'&&direct.handoff==='major-path-handoff-v0.03',`${name}: version boundary wrong`);
  assert(direct.coreMeta==='major-path-v0.02'&&direct.directMeta==='major-path-direct-v0.03',`${name}: runtime capability boundary wrong`);
  assert(direct.heroDisplay==='none'&&direct.input==='工程管理',`${name}: direct mode did not bypass search`);
  assert(direct.back.includes('返回刚才的专业列表')&&direct.backHref==='/ln-rank/?score=580',`${name}: return copy/target wrong`);
  assert(direct.note.includes('按分数查看')&&direct.note.includes('工程管理'),`${name}: score source note missing`);
  await noOverflow(page,name,'direct score');

  const schoolParams=new URLSearchParams({majorCode:'080201',from:'ln-rank',context:'school',sourceKey:'school-key',sourceMajor:'机械工程（中外合作办学）',school:'沈阳建筑大学',returnTo:'/ln-rank/?mode=school-all&school=沈阳建筑大学'});
  await page.goto(`${ORIGIN}/major-path/?${schoolParams}`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-result-major="080201"]');
  const school=await page.evaluate(()=>({back:document.querySelector('.back-home')?.textContent||'',note:document.querySelector('[data-major-path-source-boundary]')?.textContent||''}));
  assert(school.back.includes('返回沈阳建筑大学的专业'),`${name}: school return copy missing`);
  assert(school.note.includes('机械工程（中外合作办学）')&&school.note.includes('规范本科专业“机械工程”')&&school.note.includes('项目、校区、学费'),`${name}: project/source boundary missing`);
  await noOverflow(page,name,'direct school');

  const evilParams=new URLSearchParams({majorCode:'120103',from:'ln-rank',context:'score',returnTo:'https://evil.example/ln-rank/?score=580'});
  await page.goto(`${ORIGIN}/major-path/?${evilParams}`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-result-major="120103"]');
  assert(await page.locator('.back-home').getAttribute('href')==='/ln-rank/',`${name}: cross-origin return target was not rejected`);
}

const browser=await chromium.launch({headless:true}); const evidence=[];
try{ for(const device of DEVICES){ const context=await browser.newContext(device); const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(String(e))); await install(page); await verifyHandoffDecoration(page,device.name); await verifyDirectMode(page,device.name); assert(!errors.length,`${device.name}: page errors ${errors.join('\n')}`); evidence.push({device:device.name,ok:true}); await context.close(); } } finally { await browser.close(); }
console.log(JSON.stringify({ok:true,version:'major-path-handoff-browser-v0.03',devices:evidence},null,2));
