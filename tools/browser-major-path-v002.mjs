import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright(){ try { return await import('playwright'); } catch (error) { if (runtimeModules) return import(pathToFileURL(path.join(runtimeModules,'playwright','index.mjs')).href); throw error; } }
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
function staticFile(pathname){
  const mapped = pathname === '/major-path/' ? '/major-path/index.html' : pathname;
  const resolved = path.resolve(ROOT, `.${decodeURIComponent(mapped)}`);
  if(!resolved.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}
async function install(page){
  await page.route(`${ORIGIN}/**`, route => {
    const url = new URL(route.request().url());
    const file = staticFile(url.pathname);
    if(file) return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)});
    return route.fulfill({status:404,contentType:'text/plain',body:`missing ${url.pathname}`});
  });
}
async function assertNoDocumentOverflow(page,name,stage){
  const state = await page.evaluate(() => ({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,viewport:document.documentElement.clientWidth,graphs:[...document.querySelectorAll('.graph-viewport')].map(node=>({client:node.clientWidth,scroll:node.scrollWidth}))}));
  assert(state.overflow <= 1,`${name}: document overflow at ${stage}: ${state.overflow}`);
  if(name.startsWith('android') && state.graphs.length) assert(state.graphs.some(item=>item.scroll>=item.client),`${name}: graph viewport must own mobile panning at ${stage}`);
}
async function verifyEngineeringManagement(page,name){
  await page.goto(`${ORIGIN}/major-path/?major=${encodeURIComponent('工程管理')}`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-result-major="120103"]');
  const state = await page.evaluate(() => ({
    text: document.querySelector('#result')?.textContent || '',
    marker: document.body.dataset.majorPathVersion || '',
    version: window.__MAJOR_PATH_META__,
    svgCount: document.querySelectorAll('.relationship-svg').length,
    relationshipMount: document.querySelector('[data-major-relationship-graph]')?.getAttribute('data-major-relationship-graph') || '',
    sourceHosts: [...document.querySelectorAll('.source-link')].map(a => new URL(a.href).hostname)
  }));
  assert(state.marker === 'major-path-v0.02',`${name}: page marker drift`);
  assert(state.version?.version === 'major-path-v0.02',`${name}: runtime version drift`);
  assert(state.version?.undergraduateCount === 883,`${name}: undergraduate count drift`);
  assert(state.version?.relationshipGraphVersion === 'major-relationship-graph-v002',`${name}: relationship graph owner missing`);
  assert(state.version?.relationshipStats?.majorClasses === 92,`${name}: relationship class count drift`);
  assert(state.version?.relationshipStats?.disciplines === 13,`${name}: relationship discipline count drift`);
  assert(state.relationshipMount === '120103',`${name}: specific-major graph mount missing`);
  assert(state.svgCount >= 1,`${name}: SVG relationship graph missing`);
  assert(state.text.includes('本科专业代码 120103'),`${name}: undergraduate code missing`);
  assert(state.text.includes('1201 管理科学与工程'),`${name}: academic route missing`);
  assert(state.text.includes('1256 工程管理'),`${name}: professional route missing`);
  assert(state.text.includes('二级学科与专业领域由学位授予单位'),`${name}: second-level boundary missing`);
  assert(state.text.includes('“相邻”不等于“平替”'),`${name}: neighbor boundary missing`);
  assert(state.sourceHosts.length >= 3 && state.sourceHosts.every(host => host === 'www.moe.gov.cn'),`${name}: source host drift ${state.sourceHosts.join(',')}`);
  await assertNoDocumentOverflow(page,name,'工程管理');
}
async function verifyComputingGraph(page,name){
  await page.locator('#majorInput').fill('计算机科学与技术');
  await page.locator('#searchForm .btn').click();
  await page.waitForSelector('[data-result-major="080901"]');
  const directoryText = await page.locator('[data-major-relationship-graph="080901"]').innerText();
  assert(directoryText.includes('计算机类'),`${name}: computing class missing from graph section`);
  assert(directoryText.includes('软件工程'),`${name}: same-class 软件工程 missing`);
  await page.locator('[data-major-relationship-graph="080901"] [data-graph-mode="neighbors"]').click();
  await page.waitForFunction(() => document.querySelector('[data-major-relationship-graph="080901"]')?.dataset.graphMode === 'neighbors');
  const neighborText = await page.locator('[data-major-relationship-graph="080901"]').innerText();
  assert(neighborText.includes('同专业类'),`${name}: same-class neighbor group missing`);
  assert(neighborText.includes('共享的读研导航'),`${name}: graduate-neighbor group missing`);
  assert(neighborText.includes('人工智能'),`${name}: evidence-backed AI cross-class neighbor missing`);
  assert(neighborText.includes('跨专业类'),`${name}: cross-class boundary missing`);
  await assertNoDocumentOverflow(page,name,'计算机科学与技术关系图');
}
async function verifyClassEntry(page,name){
  await page.locator('#majorInput').fill('计算机类');
  await page.locator('#searchForm .btn').click();
  await page.waitForSelector('[data-disambiguation-query="计算机类"]');
  await page.waitForSelector('[data-class-relationship-graph="计算机类"]');
  const text = await page.locator('#result').innerText();
  assert(text.includes('先把“计算机类”当成一个专业家族'),`${name}: class-view warm explanation missing`);
  assert(text.includes('计算机科学与技术'),`${name}: class graph lost CS`);
  assert(text.includes('软件工程'),`${name}: class graph lost software`);
  assert(await page.locator('[data-result-major]').count() === 0,`${name}: class query silently selected concrete major`);
  await page.locator('#result [data-major-code="080902"]').first().click();
  await page.waitForSelector('[data-result-major="080902"]');
  assert((await page.locator('#result').innerText()).includes('软件工程'),`${name}: class graph node did not open software engineering`);
  await assertNoDocumentOverflow(page,name,'计算机类入口');
}
async function verifyParentLanguage(page,name){
  await page.locator('#majorInput').fill('机械');
  await page.waitForSelector('#suggestions:not([hidden])');
  const suggest = await page.locator('#suggestions').innerText();
  assert(suggest.includes('机械工程') && suggest.includes('机械电子工程'),`${name}: fuzzy mechanical suggestions incomplete`);
  await page.locator('#searchForm .btn').click();
  await page.waitForSelector('[data-disambiguation-query="机械"]');
  await page.waitForSelector('[data-class-relationship-graph="机械类"]');
  const mechanical = await page.locator('#result').innerText();
  assert(mechanical.includes('专业家族'),`${name}: mechanical class graph missing`);
  assert(await page.locator('[data-result-major]').count() === 0,`${name}: 机械 silently selected a concrete major`);

  await page.locator('#majorInput').fill('计科');
  await page.locator('#searchForm .btn').click();
  await page.waitForSelector('[data-result-major="080901"]');
  const jike = await page.locator('#result').innerText();
  assert(jike.includes('搜索识别说明') && jike.includes('家长常用简称'),`${name}: 计科 recognition explanation missing`);

  await page.locator('#majorInput').fill('测控');
  await page.locator('#searchForm .btn').click();
  await page.waitForSelector('[data-disambiguation-query="测控"]');
  const cekong = await page.locator('#result').innerText();
  assert(cekong.includes('先看这些候选分别属于哪里'),`${name}: generic ambiguous candidate graph explanation missing`);
  assert(cekong.includes('测控技术与仪器') && cekong.includes('智能测控工程'),`${name}: 测控 candidates incomplete`);
  assert(await page.locator('#result .relationship-svg').count() >= 1,`${name}: 测控 candidate SVG missing`);
  assert(await page.locator('[data-result-major]').count() === 0,`${name}: 测控 silently selected a concrete major`);
  await assertNoDocumentOverflow(page,name,'模糊搜索');
}
async function verifyBrowse(page,name){
  await page.locator('[data-discipline="管理学"]').click();
  await page.waitForSelector('[data-major-class="管理科学与工程类"]');
  await page.locator('[data-major-class="管理科学与工程类"]').click();
  await page.waitForSelector('#browseMajors:not([hidden]) .relationship-svg');
  const text = await page.locator('#classBrowser').innerText();
  assert(text.includes('管理科学与工程类'),`${name}: browse class title missing`);
  assert(text.includes('工程管理'),`${name}: browse graph lost 工程管理`);
  await assertNoDocumentOverflow(page,name,'按门类浏览');
}

const browser = await chromium.launch({headless:true});
const evidence = [];
try {
  for(const device of DEVICES){
    const context = await browser.newContext(device);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await install(page);
    await verifyEngineeringManagement(page,device.name);
    await verifyComputingGraph(page,device.name);
    await verifyClassEntry(page,device.name);
    await verifyParentLanguage(page,device.name);
    await verifyBrowse(page,device.name);
    assert(!errors.length,`${device.name}: page errors ${errors.join('\n')}`);
    evidence.push({device:device.name,ok:true});
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ok:true,version:'major-path-browser-v0.02',devices:evidence},null,2));
