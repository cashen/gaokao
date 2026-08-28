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
async function verifyEngineeringManagement(page,name){
  await page.goto(`${ORIGIN}/major-path/?major=${encodeURIComponent('工程管理')}`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-result-major="120103"]');
  const state = await page.evaluate(() => ({
    text: document.querySelector('#result')?.textContent || '',
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    resultWidth: document.querySelector('.result-shell')?.getBoundingClientRect().width || 0,
    viewport: document.documentElement.clientWidth,
    sourceHosts: [...document.querySelectorAll('.source-link')].map(a => new URL(a.href).hostname),
    version: window.__MAJOR_PATH_META__
  }));
  assert(state.text.includes('本科专业代码 120103'),`${name}: undergraduate code missing`);
  assert(state.text.includes('1201 管理科学与工程'),`${name}: academic 1201 missing`);
  assert(state.text.includes('1256 工程管理'),`${name}: professional 1256 missing`);
  for(const code of ['125601','125602','125603','125604']) assert(state.text.includes(code),`${name}: field ${code} missing`);
  assert(state.text.includes('不是国家目录规定的一一对应关系') || state.text.includes('不存在国家统一一一对应表'),`${name}: relation boundary missing`);
  assert(state.sourceHosts.length >= 3 && state.sourceHosts.every(host => host === 'www.moe.gov.cn'),`${name}: source host drift ${state.sourceHosts.join(',')}`);
  assert(state.overflow <= 1,`${name}: horizontal overflow ${state.overflow}`);
  assert(state.resultWidth <= state.viewport + 1,`${name}: result wider than viewport`);
  assert(state.version?.undergraduateCount === 883,`${name}: runtime undergraduate count drift`);
  assert(state.version?.searchVersion === 'major-search-intent-v001',`${name}: semantic search owner missing`);
}
async function verifyParentLanguage(page,name){
  await page.locator('#majorInput').fill('机械');
  await page.waitForSelector('#suggestions:not([hidden])');
  const suggest = await page.locator('#suggestions').innerText();
  assert(suggest.includes('你可能在找下面这些专业'),`${name}: fuzzy suggestion framing missing`);
  assert(suggest.includes('机械工程'),`${name}: fuzzy suggestion lost 机械工程`);
  assert(suggest.includes('机械设计制造及其自动化'),`${name}: fuzzy suggestion lost 机械设计制造及其自动化`);
  assert(suggest.includes('机械电子工程'),`${name}: fuzzy suggestion lost 机械电子工程`);
  await page.locator('#searchForm .btn').click();
  await page.waitForSelector('[data-disambiguation-query="机械"]');
  const disambiguation = await page.locator('#result').innerText();
  assert(disambiguation.includes('先确认你说的是哪个正式专业'),`${name}: disambiguation title missing`);
  assert(disambiguation.includes('不能默认替你选成其中一个'),`${name}: no-silent-selection explanation missing`);
  assert(await page.locator('[data-result-major]').count() === 0,`${name}: 机械 silently selected a concrete major`);
  await page.locator('#result [data-major-code="080204"]').click();
  await page.waitForSelector('[data-result-major="080204"]');
  const mechatronics = await page.locator('#result').innerText();
  assert(mechatronics.includes('机械电子工程'),`${name}: disambiguation choice did not open 080204`);
  assert(mechatronics.includes('0802 机械工程'),`${name}: 机械电子工程 academic route missing`);
  assert(mechatronics.includes('0855 机械'),`${name}: 机械电子工程 professional route missing`);

  await page.locator('#majorInput').fill('计科');
  await page.locator('#searchForm .btn').click();
  await page.waitForSelector('[data-result-major="080901"]');
  const jike = await page.locator('#result').innerText();
  assert(jike.includes('搜索识别说明'),`${name}: alias recognition notice missing`);
  assert(jike.includes('家长常用简称'),`${name}: alias recognition evidence missing`);
  assert(jike.includes('计算机科学与技术'),`${name}: 计科 did not resolve to official major`);

  await page.locator('#majorInput').fill('测控');
  await page.waitForSelector('#suggestions:not([hidden])');
  const cekongSuggest = await page.locator('#suggestions').innerText();
  assert(cekongSuggest.includes('测控技术与仪器'),`${name}: 测控 suggestions lost 080301`);
  assert(cekongSuggest.includes('智能测控工程'),`${name}: 测控 suggestions lost 080720T`);
  await page.locator('#searchForm .btn').click();
  await page.waitForSelector('[data-disambiguation-query="测控"]');
  const cekongChoice = await page.locator('#result').innerText();
  assert(cekongChoice.includes('测控技术与仪器') && cekongChoice.includes('智能测控工程'),`${name}: 测控 must expose both official candidates`);
  assert(await page.locator('[data-result-major]').count() === 0,`${name}: 测控 silently selected a concrete major`);
  await page.locator('#result [data-major-code="080301"]').click();
  await page.waitForSelector('[data-result-major="080301"]');
  const cekong = await page.locator('#result').innerText();
  assert(cekong.includes('测控技术与仪器'),`${name}: 测控 candidate 080301 did not open`);
  assert(cekong.includes('0804 仪器科学与技术'),`${name}: 测控技术与仪器 academic route missing`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1,`${name}: overflow after semantic-search journeys ${overflow}`);
}
async function verifySecondSearch(page,name){
  await page.locator('#majorInput').fill('电气工程及其自动化');
  await page.locator('#searchForm .btn').click();
  await page.waitForSelector('[data-result-major="080601"]');
  const text = await page.locator('#result').innerText();
  assert(text.includes('0808 电气工程'),`${name}: electrical academic route missing`);
  assert(text.includes('0858 能源动力'),`${name}: electrical professional route missing`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1,`${name}: overflow after second search ${overflow}`);
}
async function verifyBrowse(page,name){
  const management = page.locator('[data-discipline="管理学"]');
  await management.click();
  await page.waitForSelector('[data-major-class="管理科学与工程类"]');
  await page.locator('[data-major-class="管理科学与工程类"]').click();
  const classText = await page.locator('#classBrowser').innerText();
  assert(classText.includes('工程管理'),`${name}: catalog browse lost 工程管理`);
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
    await verifyParentLanguage(page,device.name);
    await verifySecondSearch(page,device.name);
    await verifyBrowse(page,device.name);
    assert(!errors.length,`${device.name}: page errors ${errors.join('\n')}`);
    evidence.push({device:device.name,ok:true});
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ok:true,version:'major-path-browser-v0.01',devices:evidence},null,2));
