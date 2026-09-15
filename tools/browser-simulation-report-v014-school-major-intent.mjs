import { chromium } from 'playwright';

const seed={version:2,studentName:'',subjectTrack:'辽宁物理类（物化生）',totalScore:'555',rank:29685,volunteers:[{id:'v014-1',order:1,school:'辽宁科技大学',majorCode:'',majorName:'',history:null,manualCheck:{},familyStatus:'待讨论',familyNote:''}]};

async function run(viewport,label){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport,deviceScaleFactor:viewport.width<500?2:1});
  await context.addInitScript(state=>localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify(state)),seed);
  const page=await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/ai/major-history**',async route=>{
    const u=new URL(route.request().url()); const major=u.searchParams.get('major')||''; const school=u.searchParams.get('schoolKeyword')||'';
    const rows=[
      {id:'m-1',school:'辽宁科技大学',major:'机械设计制造及其自动化',standardMajorName:'机械设计制造及其自动化',majorCode2026:'080202',standardMajorCode:'080202',score2026:505,rank2026:50000,score2025:500,rank2025:52000,score2024:490,rank2024:55000},
      {id:'m-2',school:'辽宁科技大学',major:'机械电子工程',standardMajorName:'机械电子工程',majorCode2026:'080204',standardMajorCode:'080204',score2026:498,rank2026:54000,score2025:494,rank2025:57000,score2024:480,rank2024:60000},
      {id:'m-3',school:'辽宁科技大学',major:'测控技术与仪器',standardMajorName:'测控技术与仪器',majorCode2026:'080301',standardMajorCode:'080301',score2026:493,rank2026:56659,score2025:491,rank2025:61050,score2024:476,rank2024:64544}
    ];
    const exact=major==='测控技术与仪器';
    const broad=/机械|网络|计算机/.test(major);
    const records=school==='辽宁科技大学' ? (exact?rows.filter(r=>r.major==='测控技术与仪器'):broad?rows.filter(r=>/机械/.test(r.major)):[]) : [];
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,records,total:records.length,complete:true,dataYear:2026,summary:{total:records.length}})});
  });
  await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForSelector('.volunteer-card',{timeout:15000});
  const c=page.locator('.volunteer-card').first(), school=c.locator('[data-field="school"]'), major=c.locator('[data-field="majorCode"]');
  await school.fill('辽科大');
  await page.waitForFunction(()=>document.body.innerText.includes('辽宁科技大学'),null,{timeout:10000});
  await c.getByRole('button',{name:/辽宁科技大学/}).click();
  await major.fill('机械');
  await page.waitForFunction(()=>document.querySelectorAll('[data-v014-major-box] .major-suggestion').length>=2,null,{timeout:10000});
  if(await major.inputValue()!=='机械')throw new Error(`${label}: broad input was auto-mapped`);
  const candidates=await c.locator('[data-v014-major-box] .major-suggestion strong').allTextContents();
  if(!candidates.includes('机械设计制造及其自动化')||!candidates.includes('机械电子工程'))throw new Error(`${label}: school-grounded major candidates missing`);
  const boxes=await c.locator('[data-v014-major-box] .major-suggestion').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{w:r.width,h:r.height}}));
  if(boxes.some(x=>x.h<42||x.w<180))throw new Error(`${label}: candidate touch target too small`);
  await c.getByRole('button',{name:/机械电子工程/}).click();
  await page.waitForFunction(()=>document.querySelector('[data-field="majorCode"]')?.value==='080204',null,{timeout:5000});
  await major.fill('测空技术与仪器');
  await page.waitForSelector('[data-v014-major-box] .major-suggestion',{timeout:10000});
  if(await major.inputValue()!=='测空技术与仪器')throw new Error(`${label}: typo was auto-corrected without confirmation`);
  if(!(await c.locator('[data-v014-major-box]').innerText()).includes('测控技术与仪器'))throw new Error(`${label}: typo suggestion missing`);
  await c.getByRole('button',{name:/测控技术与仪器/}).click();
  await page.waitForFunction(()=>document.querySelector('[data-field="majorCode"]')?.value==='080301',null,{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('[data-v014-helper]')?.innerText.includes('找到该校'),null,{timeout:10000});
  if(errors.length)throw new Error(`${label}: browser errors: ${errors.join(' | ')}`);
  await context.close(); await browser.close();
}
await run({width:1280,height:900},'desktop');
await run({width:390,height:844},'mobile');
console.log('simulation-report-v014-school-major-intent browser: PASS');
