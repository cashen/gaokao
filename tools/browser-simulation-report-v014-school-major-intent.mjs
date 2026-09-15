import { chromium } from 'playwright';

const schoolRows=Array.from({length:3000},(_,i)=>({name:i===0?'辽宁科技大学':`测试大学${i}`,province:i===0?'辽宁省':'测试省',city:i===0?'鞍山市':'测试市'}));
const seed={version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'555',rank:29685,volunteers:[{id:'v014-1',order:1,school:'辽宁科技大学',majorCode:'',majorName:'',history:null,manualCheck:{},familyStatus:'待讨论',familyNote:''}]};

async function setInput(locator,value,delay=300){await locator.fill(value);await new Promise(resolve=>setTimeout(resolve,delay));}
async function typeMajor(locator,value){await locator.fill('');await locator.pressSequentially(value,{delay:20});await new Promise(resolve=>setTimeout(resolve,500));}

async function run(viewport,label){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport,deviceScaleFactor:viewport.width<500?2:1});
  await context.addInitScript(state=>localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify(state)),seed);
  const page=await context.newPage(); const errors=[],requestFailures=[],requests=[],responses=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('requestfailed',r=>requestFailures.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'failed'}`));
  page.on('request',r=>{const u=r.url();if(u.includes('school-search-index')||u.includes('/api/ai/major-history')||u.includes('simulation-report-v014'))requests.push(`${r.method()} ${u}`);});
  page.on('response',r=>{const u=r.url();if(u.includes('school-search-index')||u.includes('/api/ai/major-history'))responses.push(`${r.status()} ${u}`);});
  await page.route('**/tongxue/data/school-search-index.20260617-v150.json',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({buildId:'tongxue-v150-region-20260617',asOfDate:'2026-06-17',count:schoolRows.length,schools:schoolRows})}));
  await page.route('**/api/ai/major-history**',async route=>{const u=new URL(route.request().url());const major=u.searchParams.get('major')||'';const school=u.searchParams.get('schoolKeyword')||'';const rows=[{id:'m-1',school:'辽宁科技大学',major:'机械设计制造及其自动化',standardMajorName:'机械设计制造及其自动化',majorCode2026:'080202',standardMajorCode:'080202'},{id:'m-2',school:'辽宁科技大学',major:'机械电子工程',standardMajorName:'机械电子工程',majorCode2026:'080204',standardMajorCode:'080204'},{id:'m-3',school:'辽宁科技大学',major:'测控技术与仪器',standardMajorName:'测控技术与仪器',majorCode2026:'080301',standardMajorCode:'080301'},{id:'m-4',school:'辽宁科技大学',major:'网络工程',standardMajorName:'网络工程',majorCode2026:'080903',standardMajorCode:'080903'},{id:'m-5',school:'辽宁科技大学',major:'计算机科学与技术',standardMajorName:'计算机科学与技术',majorCode2026:'080901',standardMajorCode:'080901'}];let records=[];if(school==='辽宁科技大学'){if(/机械/.test(major))records=rows.filter(r=>/机械/.test(r.major));else if(/网络/.test(major))records=rows.filter(r=>/网络/.test(r.major));else if(/计算机/.test(major))records=rows.filter(r=>/计算机/.test(r.major));else if(major==='测控技术与仪器')records=rows.filter(r=>r.major==='测控技术与仪器');}await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,records,total:records.length,complete:true,dataYear:2026,summary:{total:records.length}})});});
  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForSelector('.volunteer-card',{timeout:15000});
  const diagnostic=async()=>await page.evaluate(()=>({errors:[],helpers:[...document.querySelectorAll('[data-v014-helper]')].map(x=>x.textContent),boxes:[...document.querySelectorAll('[data-v014-school-box],[data-v014-major-box]')].map(x=>({hidden:x.hidden,text:x.innerText})),schoolValue:document.querySelector('[data-field="school"]')?.value||'',majorValue:document.querySelector('[data-field="majorCode"]')?.value||'',pageText:document.body.innerText.slice(0,3000)}));
  const c=page.locator('.volunteer-card').first(); const schoolInput=c.locator('[data-field="school"]');
  await setInput(schoolInput,'辽宁科技大学');
  await page.waitForFunction(()=>document.querySelector('[data-v014-helper]')?.textContent.includes('已识别学校'),null,{timeout:30000});
  await schoolInput.fill('辽宁'); await schoolInput.fill(''); await new Promise(resolve=>setTimeout(resolve,250));
  const cleared=await page.evaluate(()=>({school:document.querySelector('[data-field="school"]')?.value||'',schoolBoxHidden:document.querySelector('[data-v014-school-box]')?.hidden??true,schoolBoxText:document.querySelector('[data-v014-school-box]')?.innerText||'',helper:document.querySelector('[data-v014-helper]')?.textContent||''}));
  if(cleared.school!==''||!cleared.schoolBoxHidden||cleared.schoolBoxText)throw new Error(`${label}: stale school state after clear: ${JSON.stringify(cleared)}`);
  const majorInput=c.locator('[data-field="majorCode"]'); await typeMajor(majorInput,'机械');
  await page.waitForSelector('[data-v014-major-box] .major-suggestion',{timeout:30000});
  if(await majorInput.inputValue()!=='机械')throw new Error(`${label}: broad input was auto-mapped`);
  const candidates=await c.locator('[data-v014-major-box] .major-suggestion strong').allTextContents();
  if(!candidates.includes('机械设计制造及其自动化')||!candidates.includes('机械电子工程'))throw new Error(`${label}: mechanical candidates missing`);
  await typeMajor(majorInput,'网络'); await page.waitForSelector('[data-v014-major-box] .major-suggestion strong',{timeout:30000});
  if(await majorInput.inputValue()!=='网络')throw new Error(`${label}: network input was auto-mapped`);
  await typeMajor(majorInput,'计算机'); await page.waitForSelector('[data-v014-major-box] .major-suggestion strong',{timeout:30000});
  if(await majorInput.inputValue()!=='计算机')throw new Error(`${label}: computer input was auto-mapped`);
  await typeMajor(majorInput,'测空技术与仪器'); await page.waitForSelector('[data-v014-major-box] .major-suggestion',{timeout:30000});
  if(await majorInput.inputValue()!=='测空技术与仪器')throw new Error(`${label}: typo was auto-corrected`);
  if(!(await c.locator('[data-v014-major-box]').innerText()).includes('测控技术与仪器'))throw new Error(`${label}: typo suggestion missing`);
  await c.getByRole('button',{name:/测控技术与仪器/}).click();
  await page.waitForFunction(()=>document.querySelector('[data-field="majorCode"]')?.value==='080301',null,{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('[data-v014-helper]')?.innerText.includes('找到该校'),null,{timeout:20000});
  if(errors.length)throw new Error(`${label}: browser errors: ${errors.join(' | ')}`);
  await context.close(); await browser.close();
}
await run({width:1280,height:900},'desktop'); await run({width:390,height:844},'mobile');
console.log('simulation-report-v014-school-major-intent browser clean PR v014.15: PASS');
