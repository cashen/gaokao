import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright(){ try { return await import('playwright'); } catch (error) { if (runtimeModules) return import(pathToFileURL(path.join(runtimeModules,'playwright','index.mjs')).href); throw error; } }
const { chromium } = await loadPlaywright();
const BASE = String(process.env.MAJOR_PATH_LIVE_BASE || '').replace(/\/$/,'');
const MODE = process.env.MAJOR_PATH_LIVE_MODE || 'preview';
if(!BASE) throw new Error('MAJOR_PATH_LIVE_BASE is required');
const DEVICES = [
  {name:'pc',viewport:{width:1440,height:900}},
  {name:'pad',viewport:{width:1024,height:768},hasTouch:true},
  {name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
function assert(value,message){ if(!value) throw new Error(message); }
async function noOverflow(page,name,stage){ const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth); assert(overflow<=1,`${name}: overflow ${overflow} at ${stage}`); }

const browser = await chromium.launch({headless:true});
const evidence = [];
try {
  for(const device of DEVICES){
    const context = await browser.newContext(device);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(`${BASE}/major-path/?major=${encodeURIComponent('工程管理')}`,{waitUntil:'networkidle',timeout:30000});
    await page.waitForSelector('[data-result-major="120103"]',{timeout:15000});
    const state = await page.evaluate(() => ({
      text:document.querySelector('#result')?.textContent || '', marker:document.body.dataset.majorPathVersion || '', version:window.__MAJOR_PATH_META__,
      relationshipMount:document.querySelector('[data-major-relationship-graph]')?.getAttribute('data-major-relationship-graph') || '',
      svgCount:document.querySelectorAll('.relationship-svg').length,
      sourceHosts:[...document.querySelectorAll('.source-link')].map(a=>new URL(a.href).hostname)
    }));
    assert(state.marker==='major-path-v0.02',`${device.name}: version marker drift`);
    assert(state.version?.version==='major-path-v0.02',`${device.name}: runtime version drift`);
    assert(state.version?.undergraduateCount===883,`${device.name}: undergraduate catalog not loaded`);
    assert(state.version?.relationshipGraphVersion==='major-relationship-graph-v002',`${device.name}: relationship owner missing`);
    assert(state.version?.relationshipStats?.majorClasses===92,`${device.name}: 92 class coverage missing`);
    assert(state.version?.relationshipStats?.disciplines===13,`${device.name}: 13 discipline coverage missing`);
    assert(state.version?.relationshipStats?.directDisciplineMajors>0,`${device.name}: direct-discipline major coverage missing`);
    assert(state.relationshipMount==='120103' && state.svgCount>=1,`${device.name}: major relationship SVG missing`);
    assert(state.text.includes('1201 管理科学与工程') && state.text.includes('1256 工程管理'),`${device.name}: engineering management graduate routes missing`);
    assert(state.text.includes('二级学科与专业领域由学位授予单位'),`${device.name}: graduate second-level boundary missing`);
    assert(state.sourceHosts.length>=3 && state.sourceHosts.every(host=>host==='www.moe.gov.cn'),`${device.name}: non-official source leaked`);
    await noOverflow(page,device.name,'工程管理');

    await page.locator('#majorInput').fill('计算机科学与技术');
    await page.locator('#searchForm .btn').click();
    await page.waitForSelector('[data-result-major="080901"]',{timeout:10000});
    const directory=await page.locator('[data-major-relationship-graph="080901"]').textContent();
    assert(directory.includes('软件工程'),`${device.name}: same-class software node missing`);
    await page.locator('[data-major-relationship-graph="080901"] [data-graph-mode="neighbors"]').click();
    const neighbors=await page.locator('[data-major-relationship-graph="080901"]').textContent();
    assert(neighbors.includes('人工智能'),`${device.name}: evidence-backed AI neighbor missing`);
    assert(neighbors.includes('共享的读研导航'),`${device.name}: graduate neighbor column missing`);
    await noOverflow(page,device.name,'计算机关系图');

    await page.locator('#majorInput').fill('计算机类');
    await page.locator('#searchForm .btn').click();
    await page.waitForSelector('[data-class-relationship-graph="计算机类"]',{timeout:10000});
    const classView=await page.locator('#result').textContent();
    assert(classView.includes('专业家族') && classView.includes('计算机科学与技术') && classView.includes('软件工程'),`${device.name}: class semantic graph incomplete`);
    assert(await page.locator('[data-result-major]').count()===0,`${device.name}: class query silently selected a major`);

    await page.locator('#majorInput').fill('测控');
    await page.locator('#searchForm .btn').click();
    await page.waitForSelector('[data-disambiguation-query="测控"]',{timeout:10000});
    const ambiguous=await page.locator('#result').textContent();
    assert(ambiguous.includes('先看这些候选分别属于哪里'),`${device.name}: ambiguous candidate graph explanation missing`);
    assert(ambiguous.includes('测控技术与仪器')&&ambiguous.includes('智能测控工程'),`${device.name}: 测控 candidates incomplete`);
    assert(await page.locator('#result .relationship-svg').count()>=1,`${device.name}: ambiguous SVG missing`);
    assert(await page.locator('[data-result-major]').count()===0,`${device.name}: 测控 silently selected a major`);

    await page.locator('#majorInput').fill('计科');
    await page.locator('#searchForm .btn').click();
    await page.waitForSelector('[data-result-major="080901"]',{timeout:10000});
    const jike=await page.locator('#result').textContent();
    assert(jike.includes('搜索识别说明')&&jike.includes('家长常用简称'),`${device.name}: alias recognition context missing`);

    await page.locator('#majorInput').fill('具身智能');
    await page.locator('#searchForm .btn').click();
    await page.waitForSelector('[data-result-major="140012TK"]',{timeout:10000});
    const cross=await page.evaluate(() => ({
      text:document.querySelector('#result')?.textContent || '',
      svg:document.querySelector('[data-major-relationship-graph="140012TK"] .relationship-svg')?.textContent || '',
      meta:document.querySelector('[data-result-major="140012TK"] .meta')?.textContent || ''
    }));
    assert(cross.text.includes('专业类未单列')&&cross.text.includes('不补造“1400专业类”'),`${device.name}: cross-discipline boundary missing`);
    assert(cross.svg.includes('交叉学科')&&cross.svg.includes('具身智能'),`${device.name}: direct discipline SVG missing`);
    assert(!cross.svg.includes('本科专业类 1400')&&!cross.meta.includes('1400'),`${device.name}: fabricated 1400 class leaked`);
    await page.locator('[data-discipline="交叉学科"]').click();
    await page.waitForSelector('#classBrowser:not([hidden]) .browse-direct',{timeout:10000});
    const crossBrowse=await page.locator('#classBrowser').textContent();
    assert(crossBrowse.includes('专业类未单列')&&crossBrowse.includes('具身智能'),`${device.name}: cross-discipline browse incomplete`);
    assert(await page.locator('#classBrowser [data-major-class-code]').count()===0,`${device.name}: cross-discipline browse invented class nodes`);
    await noOverflow(page,device.name,'交叉学科');

    assert(!errors.length,`${device.name}: page errors ${errors.join('\n')}`);
    evidence.push({device:device.name,mode:MODE,ok:true});
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ok:true,version:'major-path-live-v0.02',mode:MODE,base:BASE,devices:evidence},null,2));
