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
      text: document.querySelector('#result')?.textContent || '',
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      version: window.__MAJOR_PATH_META__,
      marker: document.body.dataset.majorPathVersion || '',
      sourceHosts: [...document.querySelectorAll('.source-link')].map(a => new URL(a.href).hostname)
    }));
    assert(state.marker === 'major-path-v0.01',`${device.name}: version marker drift`);
    assert(state.version?.undergraduateCount === 883,`${device.name}: undergraduate catalog not loaded`);
    assert(state.version?.searchVersion === 'major-search-intent-v001',`${device.name}: semantic search owner missing`);
    assert(state.text.includes('1201 管理科学与工程'),`${device.name}: academic route missing`);
    assert(state.text.includes('1256 工程管理'),`${device.name}: professional route missing`);
    assert(state.text.includes('125601') && state.text.includes('125604'),`${device.name}: engineering management fields missing`);
    assert(state.sourceHosts.length >= 3 && state.sourceHosts.every(host => host === 'www.moe.gov.cn'),`${device.name}: non-official source leaked`);
    assert(state.overflow <= 1,`${device.name}: horizontal overflow ${state.overflow}`);

    await page.locator('#majorInput').fill('机械');
    await page.waitForSelector('#suggestions:not([hidden])',{timeout:10000});
    const suggestionText = await page.locator('#suggestions').innerText();
    assert(suggestionText.includes('机械工程') && suggestionText.includes('机械电子工程'),`${device.name}: live fuzzy suggestions incomplete`);
    await page.locator('#searchForm .btn').click();
    await page.waitForSelector('[data-disambiguation-query="机械"]',{timeout:10000});
    const fuzzy = await page.locator('#result').innerText();
    assert(fuzzy.includes('先确认你说的是哪个正式专业'),`${device.name}: live fuzzy query did not disambiguate`);
    assert(await page.locator('[data-result-major]').count() === 0,`${device.name}: live fuzzy query silently chose a major`);
    await page.locator('#result [data-major-code="080204"]').click();
    await page.waitForSelector('[data-result-major="080204"]',{timeout:10000});

    await page.locator('#majorInput').fill('计科');
    await page.locator('#searchForm .btn').click();
    await page.waitForSelector('[data-result-major="080901"]',{timeout:10000});
    const jike = await page.locator('#result').innerText();
    assert(jike.includes('搜索识别说明') && jike.includes('家长常用简称'),`${device.name}: live alias recognition context missing`);

    await page.locator('#majorInput').fill('测控');
    await page.locator('#searchForm .btn').click();
    await page.waitForSelector('[data-disambiguation-query="测控"]',{timeout:10000});
    const cekong = await page.locator('#result').innerText();
    assert(cekong.includes('测控技术与仪器') && cekong.includes('智能测控工程'),`${device.name}: live 测控 disambiguation incomplete`);
    assert(await page.locator('[data-result-major]').count() === 0,`${device.name}: live 测控 silently chose a major`);
    await page.locator('#result [data-major-code="080301"]').click();
    await page.waitForSelector('[data-result-major="080301"]',{timeout:10000});

    await page.locator('#majorInput').fill('临床医学');
    await page.locator('#searchForm .btn').click();
    await page.waitForSelector('[data-result-major="100201K"]',{timeout:10000});
    const clinical = await page.locator('#result').innerText();
    assert(clinical.includes('1002 临床医学') && clinical.includes('1051 临床医学'),`${device.name}: clinical academic/professional distinction missing`);
    const finalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(finalOverflow <= 1,`${device.name}: horizontal overflow after semantic journey ${finalOverflow}`);
    assert(!errors.length,`${device.name}: page errors ${errors.join('\n')}`);
    evidence.push({device:device.name,mode:MODE,ok:true});
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ok:true,version:'major-path-live-v0.01',mode:MODE,base:BASE,devices:evidence},null,2));
