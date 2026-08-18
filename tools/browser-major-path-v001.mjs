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
    await verifySecondSearch(page,device.name);
    await verifyBrowse(page,device.name);
    assert(!errors.length,`${device.name}: page errors ${errors.join('\n')}`);
    evidence.push({device:device.name,ok:true});
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ok:true,version:'major-path-browser-v0.01',devices:evidence},null,2));
