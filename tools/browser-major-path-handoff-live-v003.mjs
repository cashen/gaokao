import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright(){ try { return await import('playwright'); } catch (error) { if(runtimeModules) return import(pathToFileURL(path.join(runtimeModules,'playwright','index.mjs')).href); throw error; } }
const { chromium } = await loadPlaywright();
const BASE = String(process.env.MAJOR_PATH_LIVE_BASE || '').replace(/\/$/, '');
const MODE = process.env.MAJOR_PATH_LIVE_MODE || 'preview';
if(!BASE) throw new Error('MAJOR_PATH_LIVE_BASE required');
const DEVICES = [
  {name:'pc',viewport:{width:1440,height:900}},
  {name:'pad',viewport:{width:1024,height:768},hasTouch:true},
  {name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
function assert(value,message){ if(!value) throw new Error(message); }
async function noOverflow(page,name,stage){ const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth); assert(overflow<=1,`${name}: overflow ${overflow} at ${stage}`); }
async function waitReady(page){ await page.waitForFunction(()=>document.body?.dataset?.runtimeState==='ready',{timeout:30000}); }
async function scoreJourney(page,name){
  await page.goto(`${BASE}/ln-rank/`,{waitUntil:'domcontentloaded',timeout:60000});
  await waitReady(page);
  await page.locator('#candidateScore').fill('580');
  await page.locator('#majorKeyword').fill('工程管理');
  await page.locator('#queryButton').click();
  const entry=page.locator('.major-card [data-major-path-entry]').first();
  await entry.waitFor({state:'visible',timeout:30000});
  const target=await entry.getAttribute('data-ui-navigation-target');
  assert(target,`${name}: score major-path target missing`);
  const targetUrl=new URL(target,BASE);
  const code=targetUrl.searchParams.get('majorCode');
  assert(code&&targetUrl.searchParams.get('context')==='score',`${name}: score target contract wrong ${target}`);
  const sourceKey=targetUrl.searchParams.get('sourceKey');
  assert(sourceKey,`${name}: score source key missing`);
  await entry.click();
  await page.waitForURL(url=>url.pathname==='/major-path/'&&url.searchParams.get('majorCode')===code,{timeout:30000});
  await page.waitForSelector(`[data-result-major="${code}"]`,{timeout:30000});
  const direct=await page.evaluate(()=>({direct:document.body.dataset.majorPathDirect||'',hero:getComputedStyle(document.querySelector('.hero')).display,back:document.querySelector('.back-home')?.textContent||'',note:document.querySelector('[data-major-path-source-boundary]')?.textContent||''}));
  assert(direct.direct==='major-path-direct-v0.03'&&direct.hero==='none',`${name}: score direct mode missing`);
  assert(direct.back.includes('返回刚才的专业列表')&&direct.note.includes('按分数查看'),`${name}: score return/source copy missing`);
  await noOverflow(page,name,'score major-path');
  await page.locator('.back-home').click();
  await page.waitForURL(url=>url.pathname.startsWith('/ln-rank/'),{timeout:30000});
  await waitReady(page);
  await page.locator('.major-card [data-major-path-entry]').first().waitFor({state:'visible',timeout:30000});
  assert((await page.locator('#candidateScore').inputValue())==='580',`${name}: score context lost after return`);
  await noOverflow(page,name,'score return');
}
async function schoolJourney(page,name){
  const schoolMode=page.locator('[data-school-view-mode="school-all"]');
  await schoolMode.click();
  await page.locator('#schoolKeyword').fill('沈阳建筑大学');
  await page.locator('#majorKeyword').fill('工程管理');
  await page.locator('#queryButton').click();
  const entry=page.locator('[data-school-record] [data-major-path-entry]').first();
  await entry.waitFor({state:'visible',timeout:30000});
  const target=await entry.getAttribute('data-ui-navigation-target');
  assert(target,`${name}: school major-path target missing`);
  const targetUrl=new URL(target,BASE),code=targetUrl.searchParams.get('majorCode');
  assert(code&&targetUrl.searchParams.get('context')==='school',`${name}: school target contract wrong ${target}`);
  assert(targetUrl.searchParams.get('school')?.includes('沈阳建筑大学'),`${name}: school context missing from target`);
  await entry.click();
  await page.waitForURL(url=>url.pathname==='/major-path/'&&url.searchParams.get('majorCode')===code,{timeout:30000});
  await page.waitForSelector(`[data-result-major="${code}"]`,{timeout:30000});
  const direct=await page.evaluate(()=>({back:document.querySelector('.back-home')?.textContent||'',note:document.querySelector('[data-major-path-source-boundary]')?.textContent||''}));
  assert(direct.back.includes('返回沈阳建筑大学的专业'),`${name}: school return copy missing`);
  assert(direct.note.includes('沈阳建筑大学')&&direct.note.includes('学校材料'),`${name}: school source boundary missing`);
  await page.locator('.back-home').click();
  await page.waitForURL(url=>url.pathname.startsWith('/ln-rank/'),{timeout:30000});
  await waitReady(page);
  await page.locator('[data-school-record] [data-major-path-entry]').first().waitFor({state:'visible',timeout:30000});
  const mode=await page.evaluate(()=>document.body.dataset.resultMode);
  assert(mode==='school-all',`${name}: school mode lost after return: ${mode}`);
  assert((await page.locator('#schoolKeyword').inputValue()).includes('沈阳建筑大学'),`${name}: school input lost after return`);
  await noOverflow(page,name,'school return');
}

const browser=await chromium.launch({headless:true}); const evidence=[];
try{for(const device of DEVICES){const context=await browser.newContext({...device,ignoreHTTPSErrors:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));await scoreJourney(page,device.name);await schoolJourney(page,device.name);assert(!errors.length,`${device.name}: page errors ${errors.join('\n')}`);evidence.push({device:device.name,ok:true});await context.close();}}finally{await browser.close();}
console.log(JSON.stringify({ok:true,version:'major-path-handoff-live-v0.03',mode:MODE,base:BASE,devices:evidence},null,2));
