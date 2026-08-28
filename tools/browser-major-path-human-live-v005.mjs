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
const BASE = String(process.env.MAJOR_PATH_LIVE_BASE || '').replace(/\/$/, '');
const MODE = process.env.MAJOR_PATH_LIVE_MODE || 'live';
if (!BASE) throw new Error('MAJOR_PATH_LIVE_BASE is required');
const DEVICES = [
  {name:'pc',viewport:{width:1440,height:900}},
  {name:'pad',viewport:{width:1024,height:768},hasTouch:true},
  {name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
function assert(value,message){ if(!value) throw new Error(message); }
async function stable(page){ await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))); }
async function noOverflow(page,name,stage){ const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth); assert(overflow<=1,`${MODE}/${name}: document overflow ${overflow} at ${stage}`); }
async function waitLanding(page,mode){ await page.waitForFunction(expected=>document.body.dataset.majorPathLanding===expected,mode,{timeout:20000}); await stable(page); }
async function direct(page,name,params){
  await page.goto(`${BASE}/major-path/?${new URLSearchParams(params)}`,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForSelector(`[data-major-pathway-focus="${params.majorCode}"]`,{timeout:20000});
  await waitLanding(page,'pathway');
  const state=await page.evaluate(()=>{
    const focus=document.querySelector('[data-major-pathway-focus]');
    const graduate=[...focus.querySelectorAll('section')].find(section=>section.querySelector('.section-heading')?.textContent.includes('读研'));
    const topbar=document.querySelector('.topbar');
    return {
      version:document.body.dataset.majorPathVersion,
      core:document.body.dataset.majorPathCoreVersion,
      human:document.body.dataset.majorPathHumanVersion,
      focusTop:focus.getBoundingClientRect().top,
      topbar:topbar?.getBoundingClientRect().height||0,
      graduateTop:graduate?.getBoundingClientRect().top??99999,
      viewport:innerHeight,
      visible:document.body.innerText,
      explore:document.querySelector('[data-major-explore-details]')?.open,
      evidence:document.querySelector('[data-major-evidence-details]')?.open,
      source:focus.querySelector('[data-major-path-source-boundary]')?.innerText||''
    };
  });
  assert(state.version==='major-path-v0.05'&&state.core==='major-path-v0.02'&&state.human==='major-path-human-v0.05',`${MODE}/${name}: version boundary wrong`);
  assert(state.focusTop>=state.topbar-2&&state.focusTop<=state.topbar+40,`${MODE}/${name}: direct pathway landing wrong`);
  assert(state.graduateTop<state.viewport,`${MODE}/${name}: graduate route not in first direct viewport`);
  assert(state.explore===false&&state.evidence===false,`${MODE}/${name}: progressive disclosure opened by default`);
  for(const phrase of ['本科目录硬关系','研究生升学导航','跨专业类升学交叉','暂无证据足够强','不补造“1400专业类”','关系边界']) assert(!state.visible.includes(phrase),`${MODE}/${name}: engineering copy visible: ${phrase}`);
  assert(!state.source.includes('系统已经确认')&&!state.source.includes('规范本科专业'),`${MODE}/${name}: source note too system-like`);
  await noOverflow(page,name,'direct');
  await page.locator('[data-major-explore-details] > summary').click();
  assert(await page.locator('.relationship-svg').first().isVisible(),`${MODE}/${name}: graph unavailable after expand`);
  const legend=await page.locator('.graph-legend').innerText();
  assert(legend.includes('本科属于哪里')&&legend.includes('读研可以先看'),`${MODE}/${name}: graph legend not humanized`);
}
async function search(page,name,query,expectedCode){
  await page.goto(`${BASE}/major-path/`,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#majorInput').fill(query);
  await page.locator('#majorInput').press('Enter');
  if(expectedCode) await page.waitForSelector(`[data-major-pathway-focus="${expectedCode}"]`,{timeout:20000});
  else await page.waitForFunction(()=>document.getElementById('result').textContent.trim().length>0);
  await stable(page);
  await noOverflow(page,name,`search ${query}`);
}

const browser=await chromium.launch({headless:true});
const evidence=[];
try{
  for(const device of DEVICES){
    const context=await browser.newContext(device);
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await direct(page,device.name,{majorCode:'120103',from:'ln-rank',context:'score',sourceKey:'score-key',sourceMajor:'工程管理',returnTo:'/ln-rank/?score=580'});
    await direct(page,device.name,{majorCode:'080201',from:'ln-rank',context:'school',sourceKey:'school-key',sourceMajor:'机械工程（中外合作办学）',school:'沈阳建筑大学',returnTo:'/ln-rank/?mode=school-all&school=沈阳建筑大学'});
    await search(page,device.name,'具身智能','140012TK');
    const embodied=await page.locator('[data-major-pathway-focus]').innerText();
    assert(embodied.includes('交叉学科'),`${MODE}/${device.name}: cross-discipline label missing`);
    assert(embodied.includes('专业类未单列'),`${MODE}/${device.name}: unlisted-major-class boundary missing`);
    assert(embodied.includes('140012TK'),`${MODE}/${device.name}: legal undergraduate major code missing`);
    assert(!embodied.includes('1400专业类')&&!embodied.includes('本科专业类\n1400')&&!embodied.includes('本科专业类 1400'),`${MODE}/${device.name}: fabricated 1400 major-class node leaked`);
    await search(page,device.name,'计算机类','');
    assert(!(await page.$('[data-major-pathway-focus]')),`${MODE}/${device.name}: class search silently selected a concrete major`);
    assert(!errors.length,`${MODE}/${device.name}: page errors ${errors.join('\n')}`);
    evidence.push({device:device.name,ok:true});
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ok:true,version:'major-path-human-live-v0.04',mode:MODE,base:BASE,devices:evidence},null,2));