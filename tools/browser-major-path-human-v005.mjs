import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright(){
  try { return await import('playwright'); }
  catch (error) {
    if (runtimeModules) return import(pathToFileURL(path.join(runtimeModules,'playwright','index.mjs')).href);
    throw error;
  }
}
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
window.__GAOKAO_SELECTION_WORKSPACE__={version:'mock',getState:()=>({committedQuery:{score:580,rangePreset:'standard',filters:{...state.filters}},activeBand:'near'}),submit:()=>{}};
mountMajorPathHandoff();
document.dispatchEvent(new CustomEvent('gaokao:results-committed',{detail:{commitId:1}}));
document.dispatchEvent(new CustomEvent('gaokao:school-result-render'));
</script></body></html>`; }
async function install(page){ await page.route(`${ORIGIN}/**`,route=>{ const url=new URL(route.request().url()); if(url.pathname==='/ln-rank/mock.html') return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:mockLnRankHtml()}); const file=staticFile(url.pathname); if(file) return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)}); return route.fulfill({status:404,contentType:'text/plain',body:`missing ${url.pathname}`}); }); }
async function stable(page){ await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))); }
async function noOverflow(page,name,stage){ const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth); assert(overflow<=1,`${name}: document overflow ${overflow} at ${stage}`); }
async function waitLanding(page,mode){ await page.waitForFunction(expected=>document.body.dataset.majorPathLanding===expected,mode); await stable(page); }
async function assertHumanDefault(page,name,stage){
  const visible=await page.locator('body').innerText();
  for(const phrase of ['本科目录硬关系','研究生升学导航','跨专业类升学交叉','暂无证据足够强','不补造“1400专业类”','关系边界']) assert(!visible.includes(phrase),`${name}: engineering copy visible at ${stage}: ${phrase}`);
  const details=await page.evaluate(()=>({explore:document.querySelector('[data-major-explore-details]')?.open,evidence:document.querySelector('[data-major-evidence-details]')?.open,exploreText:document.querySelector('[data-major-explore-details] > summary')?.innerText||'',evidenceText:document.querySelector('[data-major-evidence-details] > summary')?.innerText||''}));
  assert(details.explore===false&&details.evidence===false,`${name}: progressive disclosure must stay closed at ${stage}`);
  assert(details.exploreText.includes('相关的专业'),`${name}: human explore summary missing`);
  assert(details.evidenceText.includes('不是固定对应'),`${name}: human evidence summary missing`);
}
async function verifyDirectScoreJourney(page,name){
  await page.goto(`${ORIGIN}/ln-rank/mock.html?score=580`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-workspace-record-key="score-key"] [data-major-path-entry="120103"]');
  assert(!(await page.$('[data-workspace-record-key="class-key"] [data-major-path-entry]')),`${name}: class-level score record received direct entry`);
  const target=await page.locator('[data-workspace-record-key="score-key"] [data-major-path-entry]').getAttribute('data-ui-navigation-target');
  assert(target&&new URL(target,ORIGIN).searchParams.get('majorCode')==='120103',`${name}: score target lost canonical major code`);
  await page.evaluate(href=>location.assign(href),target);
  await page.waitForSelector('[data-major-pathway-focus="120103"]');
  await waitLanding(page,'pathway');
  const state=await page.evaluate(()=>{
    const focus=document.querySelector('[data-major-pathway-focus]');
    const head=document.querySelector('.result-head');
    const graduate=[...focus.querySelectorAll('section')].find(section=>section.querySelector('.section-heading')?.textContent.includes('读研'));
    const topbar=document.querySelector('.topbar');
    const firstDegree=focus.querySelector('.degree-item');
    return {
      version:document.body.dataset.majorPathVersion,
      core:document.body.dataset.majorPathCoreVersion,
      human:document.body.dataset.majorPathHumanVersion,
      direct:document.body.classList.contains('major-path-direct'),
      focusTop:focus.getBoundingClientRect().top,
      headTop:head.getBoundingClientRect().top,
      graduateTop:graduate?.getBoundingClientRect().top??99999,
      firstDegreeTop:firstDegree?.getBoundingClientRect().top??99999,
      viewport:innerHeight,
      topbar:topbar?.getBoundingClientRect().height||0,
      source:focus.querySelector('[data-major-path-source-boundary]')?.innerText||'',
      back:document.querySelector('.back-home')?.innerText||''
    };
  });
  assert(state.version==='major-path-v0.05'&&state.core==='major-path-core-v0.05'&&state.human==='major-path-human-v0.05',`${name}: v0.05/core version boundary wrong`);
  assert(state.direct,`${name}: direct mode missing`);
  assert(state.focusTop>=state.topbar-2&&state.focusTop<=state.topbar+36,`${name}: direct landing not pinned to pathway focus (${state.focusTop}/${state.topbar})`);
  assert(state.headTop<state.focusTop-30,`${name}: direct landing still starts at result header`);
  assert(state.graduateTop<state.viewport,`${name}: graduate path is not visible in first direct viewport`);
  assert(state.firstDegreeTop<state.viewport+120,`${name}: first graduate direction too far from direct landing`);
  assert(state.source.includes('辽宁招生结果')&&state.source.includes('本科到读研'),`${name}: concise score context missing`);
  assert(!state.source.includes('系统')&&!state.source.includes('规范本科专业'),`${name}: AI/engineering source explanation leaked`);
  assert(state.back.includes('返回刚才的专业列表'),`${name}: score return copy missing`);
  await assertHumanDefault(page,name,'direct score');
  await noOverflow(page,name,'direct score');
  await page.locator('[data-major-explore-details] > summary').click();
  assert(await page.locator('.relationship-svg').first().isVisible(),`${name}: relationship graph unavailable after user expands it`);
  const legend=await page.locator('.graph-legend').innerText();
  assert(legend.includes('本科属于哪里')&&legend.includes('读研可以先看'),`${name}: graph legend not translated for parents`);
  await page.locator('[data-major-evidence-details] > summary').click();
  const evidence=await page.locator('[data-major-evidence-details]').innerText();
  assert(evidence.includes('一级学科')&&evidence.includes('招生目录')&&evidence.includes('官方依据'),`${name}: evidence layer lost scientific boundary`);

  const related=page.locator('[data-major-explore-details] button.neighbor-chip[data-major-code]').first();
  assert(await related.count(),`${name}: no related major button available to verify continuation semantics`);
  const nextCode=await related.getAttribute('data-major-code');
  assert(nextCode&&nextCode!=='120103',`${name}: related major button did not point to another professional major`);
  await related.click();
  await page.waitForSelector(`[data-major-pathway-focus="${nextCode}"]`);
  await waitLanding(page,'result');
  const continuation=await page.locator('[data-major-path-source-boundary]').innerText();
  assert(continuation.includes('从刚才的专业继续看'),`${name}: related-major continuation still claims original ln-rank source`);
  assert(!continuation.includes('来自刚才的辽宁招生结果'),`${name}: related-major continuation falsely inherited original score source`);
  await assertHumanDefault(page,name,'direct related-major continuation');

  await page.locator('.back-home').click();
  await page.waitForURL(/\/ln-rank\/mock\.html/);
  await page.waitForSelector('[data-workspace-record-key="score-key"] [data-major-path-entry="120103"]');
}
async function verifyDirectSchoolJourney(page,name){
  await page.goto(`${ORIGIN}/ln-rank/mock.html?mode=school-all`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-school-record="school-key"] [data-major-path-entry="080201"]');
  assert(!(await page.$('[data-school-record="school-class-key"] [data-major-path-entry]')),`${name}: school class-level record received direct entry`);
  const target=await page.locator('[data-school-record="school-key"] [data-major-path-entry]').getAttribute('data-ui-navigation-target');
  await page.evaluate(href=>location.assign(href),target);
  await page.waitForSelector('[data-major-pathway-focus="080201"]');
  await waitLanding(page,'pathway');
  const text=await page.locator('[data-major-path-source-boundary]').innerText();
  assert(text.includes('机械工程（中外合作办学）')&&text.includes('机械工程')&&text.includes('学费、校区和合作项目'),`${name}: school project boundary missing`);
  assert(!text.includes('规范本科专业')&&!text.includes('系统已经确认'),`${name}: school source note still reads like system explanation`);
  assert((await page.locator('.back-home').innerText()).includes('返回沈阳建筑大学的专业'),`${name}: school return label missing`);
  await noOverflow(page,name,'direct school');
}
async function search(page,query){
  await page.goto(`${ORIGIN}/major-path/`,{waitUntil:'domcontentloaded'});
  await page.locator('#majorInput').fill(query);
  await page.locator('#majorInput').press('Enter');
  await page.waitForFunction(()=>!document.getElementById('result').hidden&&document.getElementById('result').textContent.trim().length>0);
  await stable(page);
}
async function verifyExploreMode(page,name){
  await search(page,'工程管理');
  await page.waitForSelector('[data-major-pathway-focus="120103"]');
  await waitLanding(page,'result');
  const normal=await page.evaluate(()=>({hero:getComputedStyle(document.querySelector('.hero')).display,headTop:document.querySelector('.result-head').getBoundingClientRect().top,topbar:document.querySelector('.topbar').getBoundingClientRect().height,focusText:document.querySelector('[data-major-pathway-focus]').innerText}));
  assert(normal.hero!=='none',`${name}: standalone exploration lost search hero`);
  assert(normal.headTop>=normal.topbar-4&&normal.headTop<=normal.topbar+80,`${name}: standalone search must land on result title`);
  assert(normal.focusText.includes('本科到读研，先看这条线')&&normal.focusText.includes('学硕方向')&&normal.focusText.includes('专硕方向'),`${name}: human-first pathway content missing`);
  await assertHumanDefault(page,name,'standalone major');

  await search(page,'计算机科学与技术');
  await page.waitForSelector('[data-major-pathway-focus="080901"]');
  await page.locator('[data-major-explore-details] > summary').click();
  await page.locator('[data-graph-mode="neighbors"]').click();
  await stable(page);
  const relationship=await page.locator('[data-major-explore-details]').innerText();
  assert(relationship.includes('读研方向有重合')||relationship.includes('跨专业也可能衔接'),`${name}: neighbor graph lost human labels`);

  await search(page,'具身智能');
  await page.waitForSelector('[data-major-pathway-focus="140012TK"]');
  const embodied=await page.locator('[data-major-pathway-focus]').innerText();
  assert(embodied.includes('交叉学科'),`${name}: cross-discipline label missing`);
  assert(embodied.includes('专业类未单列'),`${name}: unlisted-major-class boundary missing`);
  assert(embodied.includes('140012TK'),`${name}: legal undergraduate major code missing`);
  assert(!embodied.includes('1400专业类')&&!embodied.includes('本科专业类\n1400')&&!embodied.includes('本科专业类 1400'),`${name}: fabricated 1400 major-class node leaked`);

  await search(page,'计算机类');
  assert(!(await page.$('[data-major-pathway-focus]')),`${name}: class search silently selected a concrete major`);
  assert((await page.locator('#result').innerText()).includes('计算机'),`${name}: class exploration missing`);

  await search(page,'机械');
  assert((await page.locator('#result').innerText()).includes('机械'),`${name}: mechanical ambiguity missing`);
  await search(page,'计科');
  await page.waitForSelector('[data-major-pathway-focus="080901"]');
  await search(page,'测控');
  assert((await page.locator('#result').innerText()).includes('测控'),`${name}: measurement/control ambiguity missing`);
  await noOverflow(page,name,'exploration set');
}

const browser=await chromium.launch({headless:true});
const evidence=[];
try{
  for(const device of DEVICES){
    const context=await browser.newContext(device);
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await install(page);
    await verifyDirectScoreJourney(page,device.name);
    await verifyDirectSchoolJourney(page,device.name);
    await verifyExploreMode(page,device.name);
    assert(!errors.length,`${device.name}: page errors ${errors.join('\n')}`);
    evidence.push({device:device.name,ok:true});
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ok:true,version:'major-path-human-browser-v0.05',devices:evidence},null,2));