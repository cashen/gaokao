import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE=String(process.env.AI_PREVIEW_BASE||'').replace(/\/+$/,'');
const EXPECTED_SHA=String(process.env.AI_EXPECTED_SHA||'').trim();
const ARTIFACT_DIR=process.env.AI_ARTIFACT_DIR||'/tmp/ai-workspace-browser-v3990_1';
if(!BASE)throw new Error('AI_PREVIEW_BASE is required');fs.mkdirSync(ARTIFACT_DIR,{recursive:true});
const devices=[{name:'pc',viewport:{width:1440,height:900}},{name:'pad',viewport:{width:1024,height:768}},{name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true}];
function assert(condition,message){if(!condition)throw new Error(message);}
async function waitForText(page,text,timeout=60000){await page.getByText(text,{exact:false}).first().waitFor({state:'visible',timeout});}
async function checkGeometry(page,name){const g=await page.evaluate(()=>({width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth}));assert(g.scrollWidth<=g.width+2,`${name}: document overflow ${g.scrollWidth}>${g.width}`);assert(g.bodyWidth<=g.width+2,`${name}: body overflow ${g.bodyWidth}>${g.width}`);}
async function submit(page,text){const input=page.locator('#promptInput');await input.fill(text);await page.locator('#sendButton').click();}
async function waitIdle(page){await page.locator('#sendButton').filter({hasText:'执行'}).waitFor({state:'visible',timeout:60000});}
async function viewText(page){return (await page.locator('#activeViewChips').innerText()).replace(/\s+/g,' ');}
async function assertView(page,parts,notParts=[]){const text=await viewText(page);for(const part of parts)assert(text.includes(part),`active view missing ${part}: ${text}`);for(const part of notParts)assert(!text.includes(part),`active view unexpectedly has ${part}: ${text}`);}
async function resetWorkspace(page){page.once('dialog',dialog=>dialog.accept());await page.locator('#newWorkspace').click();await page.waitForTimeout(150);}

async function verifyHumanSemanticJourney(page,name){
  await resetWorkspace(page);
  await submit(page,'580分，先看看电气');await waitForText(page,'确定性候选执行结果');await waitIdle(page);await assertView(page,['580分','全国','电气']);
  await submit(page,'机械呢');await waitForText(page,'580分 · 全国 · “机械”');await waitIdle(page);await assertView(page,['机械'],['电气']);
  await submit(page,'省内机械');await waitForText(page,'辽宁省内');await waitIdle(page);await assertView(page,['辽宁','机械']);
  await submit(page,'电气呢');await waitForText(page,'本轮沿用了这些条件');await waitIdle(page);await assertView(page,['辽宁','电气'],['机械']);
  await submit(page,'那安徽呢');await waitForText(page,'580分 · 安徽 · “电气”');await waitIdle(page);await assertView(page,['安徽','电气'],['辽宁']);
  await submit(page,'也看看机械');await waitIdle(page);await assertView(page,['安徽','电气','机械']);
  await submit(page,'电气和机械怎么选');await waitForText(page,'专业可达空间比较');await waitIdle(page);await waitForText(page,'不作优劣结论');await assertView(page,['安徽','电气','机械']);
  const clear=page.getByRole('button',{name:'暂时不限专业'}).last();assert(await clear.count()>0,`${name}: contextual clear-major action missing`);await clear.click();await waitIdle(page);await assertView(page,['安徽'],['电气','机械']);
  const back=page.getByRole('button',{name:'回到上一批'}).last();assert(await back.count()>0,`${name}: restore menu missing`);await back.click();await waitIdle(page);await assertView(page,['安徽','电气','机械']);
  await checkGeometry(page,`${name}:semantic`);
}

async function verifyInterruptionLatestWins(page,name){
  await resetWorkspace(page);await submit(page,'580分，先看看电气');await waitForText(page,'确定性候选执行结果');await waitIdle(page);
  let delayNext=true;
  await page.route('**/api/ai/turn',async route=>{
    const body=route.request().postData()||'';
    if(delayNext&&body.includes('省内机械')){delayNext=false;await new Promise(resolve=>setTimeout(resolve,2200));try{await route.continue();}catch{}return;}
    await route.continue();
  });
  await submit(page,'省内机械');await page.waitForTimeout(180);
  assert((await page.locator('#sendButton').innerText()).includes('改口'),`${name}: input was locked instead of allowing interruption`);
  await submit(page,'那安徽电气');await waitForText(page,'580分 · 安徽 · “电气”');await waitIdle(page);await page.waitForTimeout(2400);
  await assertView(page,['安徽','电气'],['辽宁','机械']);
  await page.unroute('**/api/ai/turn');await checkGeometry(page,`${name}:interrupt`);
}

async function verifyModelEcho(page,name){
  const config=(await page.locator('#modelConfig').innerText()).trim();assert(config&&!config.includes('读取模型配置'),`${name}: configured model echo missing`);
  if(name!=='pc')return;
  await page.locator('#probeModel').click();
  await page.waitForFunction(()=>{const text=document.querySelector('#modelProbeResult')?.textContent||'';return text.includes('本次实测：')||text.includes('实测失败：');},{timeout:45000});
  const result=(await page.locator('#modelProbeResult').innerText()).trim();assert(result.includes('本次实测：')||result.includes('实测失败：'),`${name}: model probe gave no visible result`);
}

async function verifyPersistenceAndSelection(page,name){
  await resetWorkspace(page);await submit(page,'600分位次是多少');await waitForText(page,'14,235');await waitIdle(page);await page.reload({waitUntil:'networkidle'});await waitForText(page,'14,235',30000);
  await page.evaluate(()=>localStorage.setItem('lnRank.selectionPool.lnPhysics.2026.v3951',JSON.stringify({items:[{id:'browser-test-1',school:'测试大学',major:'计算机科学与技术',bandKey:'near',rank2026:20000,displayLocation:'沈阳',tuition:'',userNote:'这段私有备注不能发给模型'}]})));
  await page.locator('#importSelection').click();await waitForText(page,'已导入1项只读快照');await submit(page,'审查我当前的家庭方案');await waitForText(page,'家庭方案结构审查');await waitIdle(page);
  const stored=JSON.parse(await page.evaluate(()=>localStorage.getItem('lnRank.selectionPool.lnPhysics.2026.v3951'))||'{}');assert(stored?.items?.[0]?.userNote==='这段私有备注不能发给模型',`${name}: selection pool mutated`);await checkGeometry(page,`${name}:persistence`);
}

const browser=await chromium.launch({headless:true});
try{
  for(const device of devices){const context=await browser.newContext({viewport:device.viewport,isMobile:Boolean(device.isMobile),hasTouch:Boolean(device.hasTouch),locale:'zh-CN'});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(`pageerror:${error.message}`));page.on('console',message=>{if(message.type()==='error')errors.push(`console:${message.text()}`);});const target=`${BASE}/ai/?browser=${encodeURIComponent(EXPECTED_SHA||'preview')}-${device.name}`;const response=await page.goto(target,{waitUntil:'networkidle',timeout:60000});assert(response?.ok(),`${device.name}: /ai/ ${response?.status()}`);await waitForText(page,'工作台已就绪',30000);await checkGeometry(page,`${device.name}:initial`);await verifyModelEcho(page,device.name);if(device.name==='pc'){await verifyHumanSemanticJourney(page,device.name);await verifyInterruptionLatestWins(page,device.name);}else{await resetWorkspace(page);await submit(page,'580分，省内机械');await waitForText(page,'确定性候选执行结果');await waitIdle(page);await assertView(page,['580分','辽宁','机械']);await checkGeometry(page,`${device.name}:semantic-smoke`);}await verifyPersistenceAndSelection(page,device.name);await page.screenshot({path:path.join(ARTIFACT_DIR,`${device.name}.png`),fullPage:true});assert(errors.length===0,`${device.name}: browser errors ${errors.join(' | ')}`);await context.close();}
  console.log(JSON.stringify({ok:true,base:BASE,expectedSha:EXPECTED_SHA,devices:devices.map(item=>item.name),checks:['colloquial-semantic-chain','contextual-menu','latest-write-wins-interruption','model-echo','model-probe-visible','indexeddb-persistence','selection-readonly','responsive-no-overflow']},null,2));
}finally{await browser.close();}
