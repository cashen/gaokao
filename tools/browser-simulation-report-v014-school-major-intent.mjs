import { chromium } from 'playwright';

const schoolRows=Array.from({length:3000},(_,i)=>({name:i===0?'辽宁科技大学':`测试大学${i}`,province:i===0?'辽宁省':'测试省',city:i===0?'鞍山市':'测试市'}));
const seed={version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'555',rank:29685,volunteers:[{id:'v014-1',order:1,school:'辽宁科技大学',majorCode:'',majorName:'',history:null,manualCheck:{},familyStatus:'待讨论',familyNote:''}]};

async function setInput(locator,value){await locator.evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);await new Promise(resolve=>setTimeout(resolve,180));}

async function run(viewport,label){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport,deviceScaleFactor:viewport.width<500?2:1});
  await context.addInitScript(state=>localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify(state)),seed);
  const page=await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/tongxue/data/school-search-index.20260617-v150.json',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({buildId:'tongxue-v150-region-20260617',asOfDate:'2026-06-17',count:schoolRows.length,schools:schoolRows})}));
  await page.route('**/api/ai/major-history**',async route=>{
    const u=new URL(route.request().url()); const major=u.searchParams.get('major')||''; const school=u.searchParams.get('schoolKeyword')||'';
    const rows=[
      {id:'m-1',school:'辽宁科技大学',major:'机械设计制造及其自动化',standardMajorName:'机械设计制造及其自动化',majorCode2026:'080202',standardMajorCode:'080202',score2026:505,rank2026:50000,score2025:500,rank2025:52000,score2024:490,rank2024:55000},
      {id:'m-2',school:'辽宁科技大学',major:'机械电子工程',standardMajorName:'机械电子工程',majorCode2026:'080204',standardMajorCode:'080204',score2026:498,rank2026:54000,score2025:494,rank2025:57000,score2024:480,rank2024:60000},
      {id:'m-3',school:'辽宁科技大学',major:'测控技术与仪器',standardMajorName:'测控技术与仪器',majorCode2026:'080301',standardMajorCode:'080301',score2026:493,rank2026:56659,score2025:491,rank2025:61050,score2024:476,rank2024:64544},
      {id:'m-4',school:'辽宁科技大学',major:'网络工程',standardMajorName:'网络工程',majorCode2026:'080903',standardMajorCode:'080903',score2026:487,rank2026:59000,score2025:483,rank2025:62500,score2024:470,rank2024:69000},
      {id:'m-5',school:'辽宁科技大学',major:'计算机科学与技术',standardMajorName:'计算机科学与技术',majorCode2026:'080901',standardMajorCode:'080901',score2026:515,rank2026:46000,score2025:509,rank2025:49500,score2024:500,rank2024:53000}
    ];
    let records=[];
    if(school==='辽宁科技大学'){
      if(/机械/.test(major))records=rows.filter(r=>/机械/.test(r.major));
      else if(/网络/.test(major))records=rows.filter(r=>/网络/.test(r.major));
      else if(/计算机/.test(major))records=rows.filter(r=>/计算机/.test(r.major));
      else if(major==='测控技术与仪器')records=rows.filter(r=>r.major==='测控技术与仪器');
      else records=[];
    }
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,records,total:records.length,complete:true,dataYear:2026,summary:{total:records.length}})});
  });
  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForSelector('.volunteer-card',{timeout:15000});
  let c=page.locator('.volunteer-card').first();
  const schoolResponse=page.waitForResponse(response=>response.url().includes('/tongxue/data/school-search-index.20260617-v150.json')&&response.ok(),{timeout:15000});
  await setInput(c.locator('[data-field="school"]'),'辽宁科技大学');
  await schoolResponse;
  await setInput(page.locator('.volunteer-card').first().locator('[data-field="majorCode"]'),'机械');
  await page.waitForSelector('[data-v014-major-box] .major-suggestion',{timeout:15000});
  let currentMajor=page.locator('.volunteer-card').first().locator('[data-field="majorCode"]');
  if(await currentMajor.inputValue()!=='机械')throw new Error(`${label}: broad input was auto-mapped`);
  const candidates=await page.locator('.volunteer-card').first().locator('[data-v014-major-box] .major-suggestion strong').allTextContents();
  if(!candidates.includes('机械设计制造及其自动化')||!candidates.includes('机械电子工程'))throw new Error(`${label}: school-grounded mechanical candidates missing`);
  currentMajor=page.locator('.volunteer-card').first().locator('[data-field="majorCode"]');
  await setInput(currentMajor,'网络');
  await page.waitForSelector('[data-v014-major-box] .major-suggestion strong',{timeout:15000});
  if(await currentMajor.inputValue()!=='网络')throw new Error(`${label}: network input was auto-mapped`);
  const networkCandidates=await page.locator('.volunteer-card').first().locator('[data-v014-major-box] .major-suggestion strong').allTextContents();
  if(!networkCandidates.includes('网络工程'))throw new Error(`${label}: network school-grounded candidate missing`);
  currentMajor=page.locator('.volunteer-card').first().locator('[data-field="majorCode"]');
  await setInput(currentMajor,'计算机');
  await page.waitForSelector('[data-v014-major-box] .major-suggestion strong',{timeout:15000});
  if(await currentMajor.inputValue()!=='计算机')throw new Error(`${label}: computer input was auto-mapped`);
  const computerCandidates=await page.locator('.volunteer-card').first().locator('[data-v014-major-box] .major-suggestion strong').allTextContents();
  if(!computerCandidates.includes('计算机科学与技术'))throw new Error(`${label}: computer school-grounded candidate missing`);
  currentMajor=page.locator('.volunteer-card').first().locator('[data-field="majorCode"]');
  await setInput(currentMajor,'测空技术与仪器');
  await page.waitForSelector('[data-v014-major-box] .major-suggestion',{timeout:15000});
  if(await currentMajor.inputValue()!=='测空技术与仪器')throw new Error(`${label}: typo was auto-corrected without confirmation`);
  if(!(await page.locator('.volunteer-card').first().locator('[data-v014-major-box]').innerText()).includes('测控技术与仪器'))throw new Error(`${label}: typo suggestion missing`);
  await page.locator('.volunteer-card').first().getByRole('button',{name:/测控技术与仪器/}).click();
  await page.waitForFunction(()=>document.querySelector('[data-field="majorCode"]')?.value==='080301',null,{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('[data-v014-helper]')?.innerText.includes('找到该校'),null,{timeout:10000});
  if(errors.length)throw new Error(`${label}: browser errors: ${errors.join(' | ')}`);
  await context.close(); await browser.close();
}
await run({width:1280,height:900},'desktop');
await run({width:390,height:844},'mobile');
console.log('simulation-report-v014-school-major-intent browser: PASS');
