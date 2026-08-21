import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {orchestrateAiTurn} from '../functions/_lib/ai/turn-orchestrator.js';

const runtimeModules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright(){
  try{return await import('playwright');}
  catch(primaryError){
    if(runtimeModules)return import(pathToFileURL(path.join(runtimeModules,'playwright','index.mjs')).href);
    throw new Error(`Playwright is required (npm package or CODEX_PRIMARY_RUNTIME_NODE_MODULES): ${primaryError?.message||primaryError}`);
  }
}
const {chromium}=await loadPlaywright();

const ROOT=process.cwd();
const ORIGIN='https://aiplus.test';
const ARTIFACT_DIR='/tmp/aiplus-v002-browser';
fs.mkdirSync(ARTIFACT_DIR,{recursive:true});

const DEVICES=[
  {name:'pc',viewport:{width:1440,height:920}},
  {name:'pad',viewport:{width:1024,height:768},hasTouch:true},
  {name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'android-compact',viewport:{width:360,height:740},isMobile:true,hasTouch:true}
];

function assert(condition,message){if(!condition)throw new Error(message);}
function json(route,status,payload){return route.fulfill({status,contentType:'application/json; charset=utf-8',body:JSON.stringify(payload)});}
function mime(file){if(file.endsWith('.html'))return'text/html; charset=utf-8';if(file.endsWith('.css'))return'text/css; charset=utf-8';if(file.endsWith('.js')||file.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(file.endsWith('.json'))return'application/json; charset=utf-8';if(file.endsWith('.svg'))return'image/svg+xml';if(file.endsWith('.png'))return'image/png';return'application/octet-stream';}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function number(value){const n=Number(value);return Number.isFinite(n)?n:0;}

const MAJOR_VARIANTS={
  '机械':['机械工程','机械电子工程','机械设计制造及其自动化','智能制造工程'],
  '电气':['电气工程及其自动化','电气工程与智能控制','智能电网信息工程','建筑电气与智能化'],
  '测控技术与仪器':['测控技术与仪器','智能测控工程','仪器类','智能感知工程'],
  '材料':['材料科学与工程','材料成型及控制工程','复合材料与工程','金属材料工程'],
  '自动化':['自动化','机器人工程','轨道交通信号与控制','智能装备与系统']
};
const ALL_MAJORS=Object.values(MAJOR_VARIANTS).flat().concat(['计算机科学与技术','电子信息工程','通信工程','飞行器动力工程','能源与动力工程','安全工程','工业工程','物流管理']);

function schoolHistoryPayload(url){
  const school=url.searchParams.get('school')||'测试大学',query=url.searchParams.get('majorKeyword')||'',candidate=number(url.searchParams.get('candidateScore'))||null;
  const majors=query?(MAJOR_VARIANTS[query]||[query,`${query}（实验班）`,`${query}（专项）`,`${query}（校企合作）`]):ALL_MAJORS;
  const records=majors.map((major,index)=>({
    id:`${school}-${query||'all'}-${index}`,school,major,score2026:626-index*5-(query?0:Math.floor(index/4)),rank2026:11200+index*1370,
    schoolCode2026:'S001',majorCode2026:`${query?`Q${Object.keys(MAJOR_VARIANTS).indexOf(query)+1}`:'A'}M${String(index+1).padStart(3,'0')}`,displayLocation:'辽宁省沈阳市',
    projectLabel:index===3&&query==='电气'?'中外合作/高收费':'',matchLevel:'exact',matchLabel:'名称命中',matchedKeyword:query
  }));
  const scores=records.map(item=>item.score2026),nearest=records.reduce((best,item)=>!best||Math.abs(item.score2026-candidate)<Math.abs(best.score2026-candidate)?item:best,null);
  return{ok:true,meta:{school,candidateScore:candidate,candidateReferenceRank2026:candidate?28000:null,schoolRecordTotal:records.length,filteredTotal:records.length},records,summary:{total:records.length,uniqueMajorCount:new Set(records.map(item=>item.major)).size,minScore:Math.min(...scores),maxScore:Math.max(...scores),nearestRecord:candidate?nearest:null},source:{dataYear:2026,mode:'mock-browser-contract'}};
}

function majorHistoryPayload(url){
  const major=url.searchParams.get('major')||'电气工程及其自动化',scope=url.searchParams.get('bottomLineMode')||'all',schools=['东北大学','大连理工大学','辽宁大学','沈阳工业大学','沈阳航空航天大学','大连交通大学','辽宁科技大学','辽宁工程技术大学','辽宁石油化工大学','沈阳理工大学','沈阳工程学院','大连海洋大学','沈阳化工大学','辽宁工业大学','渤海大学','沈阳大学'];
  let records=schools.map((school,index)=>({id:`major-${scope}-${index}`,school,major:index===6?`${major}（中外合作办学）`:major,score2026:638-index*9,rank2026:9100+index*3100,province:'辽宁',city:index%2?'沈阳':'大连',displayLocation:'辽宁省',isSinoForeign:index===6,feeType:index===6?'sino_foreign':'regular',projectLabel:index===6?'中外合作/高收费':''}));
  if(scope==='exclude_sino'||scope==='public_regular_only')records=records.filter(item=>!item.isSinoForeign);
  const scores=records.map(item=>item.score2026);
  return{ok:true,major,region:url.searchParams.get('region')||'ln',matchedMajors:[major],total:records.length,complete:true,records,summary:{total:records.length,schoolCount:new Set(records.map(item=>item.school)).size,minScore:Math.min(...scores),maxScore:Math.max(...scores)},source:{level:'A',sourceName:'辽宁2026投档数据',sourceVersion:'mock-browser-contract',sourceRecordCount:records.length,derivedIndex:true,sameTruthSet:true},boundary:'只展示2026辽宁物理类实际投档记录。'};
}

function majorBandsPayload(url){
  const band=url.searchParams.get('band')||'near',score=number(url.searchParams.get('candidateScore'))||580,school=url.searchParams.get('schoolKeyword')||'辽宁示例大学',major=url.searchParams.get('majorKeyword')||'不限专业';
  const records=Array.from({length:3},(_,index)=>({id:`${band}-${school}-${major}-${index}`,school:index?school:`${school}长名称校区`,major:index?major:`${major}（智能制造与工程实践联合培养）`,score2026:score+({upper:12,near:1,steady:-14}[band]||0)-index,rank2026:26000+index*900,displayLocation:'辽宁省沈阳市',bandKey:band}));
  return{ok:true,meta:{candidateScore:score},counts:{upper:band==='upper'?3:0,near:band==='near'?3:0,steady:band==='steady'?3:0,total:3},bands:{upper:{count:band==='upper'?3:0,records:band==='upper'?records:[]},near:{count:band==='near'?3:0,records:band==='near'?records:[]},steady:{count:band==='steady'?3:0,records:band==='steady'?records:[]}},source:{dataYear:2026}};
}

function experiencePayload(url){
  const school=url.searchParams.get('school')||'测试大学',topic=url.searchParams.get('topic')||'general';
  return{ok:true,mode:'topic_reviews',scope:'school',topic,school,reviews:[
    {id:'living-1',content:'宿舍是四人间，冬天有暖气，公共洗衣区使用比较方便。',createdAt:'2026-08-10T10:00:00+08:00',authorLabel:'匿名同学',evidenceScope:'school',verificationWeight:'none'},
    {id:'living-2',content:'食堂窗口不少，晚饭高峰期需要排队。',createdAt:'2026-08-08T10:00:00+08:00',authorLabel:'匿名同学',evidenceScope:'school',verificationWeight:'none'}
  ],evidence:{type:'student_voice',scope:'school',topic,matchCount:2,sampleLevel:'two_voices',scannedCount:8,scannedPages:2,exhaustive:true,sourceSummary:false,officialFact:false,rankingInput:false,recommendationScoreInput:false,verificationWeight:'none',disagreementPolicy:'preserve_not_average'},source:{id:'srgaoxiao',name:'神人高校网',url:'https://eo.srgaoxiao.cn/school/mock'},fetchedAt:'2026-08-21T02:00:00Z',transport:'话题定向公开评论 · 神人高校网镜像 1',contractVersion:'student-voice-contract-v0.01',sourceRegistryVersion:'student-voice-source-registry-v0.01',sourceGatewayVersion:'student-voice-source-gateway-v0.01'};
}

function officialPayload(url){
  const school=url.searchParams.get('school')||'测试大学';
  return{ok:true,school,schId:'mock-1',topic:'living',topicLabel:'食宿条件',updatedAt:'2026-06-01',coverage:'阳光高考学校页面',detailAvailable:false,evidenceText:'',sources:[{sourceName:'阳光高考',sourceUrl:'https://gaokao.chsi.com.cn/',scope:'学校官方公开页面',updatedAt:'2026-06-01'}],fetchedAt:'2026-08-13T00:00:00Z',boundary:'没有取得正文时只提供官方入口，不补写学校事实。'};
}

function staticFileFor(pathname){
  let relative=decodeURIComponent(pathname);
  if(relative==='/'||relative==='/aiplus'||relative==='/aiplus/')relative='/aiplus/index.html';
  const resolved=path.resolve(ROOT,`.${relative}`);
  if(!resolved.startsWith(`${ROOT}${path.sep}`)||!fs.existsSync(resolved)||!fs.statSync(resolved).isFile())return null;
  return resolved;
}
async function mockAssetFetch(request){const file=staticFileFor(new URL(request.url).pathname);return file?new Response(fs.readFileSync(file),{status:200,headers:{'content-type':mime(file)}}):new Response('not found',{status:404,headers:{'content-type':'text/plain'}});}

function makeState(name){return{name,failElectricOnce:name==='pc',electricFailed:false,schoolActive:0,maxSchoolActive:0,schoolRequests:[],majorRequests:[],turnResponses:[],errors:[]};}

async function installRoutes(page,state){
  await page.route(`${ORIGIN}/**`,async route=>{
    const request=route.request(),url=new URL(request.url()),pathname=url.pathname;
    try{
      if(pathname==='/api/ai/health')return json(route,200,{ok:true,provider:{primaryReady:false,primary:'deterministic',primaryModel:''}});
      if(pathname==='/api/ai/turn'){
        const payload=JSON.parse(request.postData()||'{}'),result=await orchestrateAiTurn({request:new Request(request.url(),{method:'POST'}),env:{ASSETS:{fetch:mockAssetFetch}}},payload);
        if(!result.pendingDeterministicTool)state.turnResponses.push(result);
        return json(route,number(result.status)||200,result);
      }
      if(pathname==='/api/ai/school-history'){
        const major=url.searchParams.get('majorKeyword')||'';state.schoolRequests.push({major,url:url.pathname+url.search});state.schoolActive+=1;state.maxSchoolActive=Math.max(state.maxSchoolActive,state.schoolActive);
        try{await sleep(70);if(state.failElectricOnce&&!state.electricFailed&&major==='电气'){state.electricFailed=true;return json(route,422,{ok:false,code:'synthetic_major_failure',message:'电气查询暂时未完成'});}return json(route,200,schoolHistoryPayload(url));}finally{state.schoolActive-=1;}
      }
      if(pathname==='/api/ai/major-history'){state.majorRequests.push(url.pathname+url.search);await sleep(50);return json(route,200,majorHistoryPayload(url));}
      if(pathname==='/api/major-bands'){await sleep(40);return json(route,200,majorBandsPayload(url));}
      if(pathname==='/api/tongxue-summary'){await sleep(40);return json(route,200,experiencePayload(url));}
      if(pathname==='/api/ai/school-official'){await sleep(40);return json(route,200,officialPayload(url));}
      if(pathname==='/favicon.ico')return route.fulfill({status:204,body:''});
      const file=staticFileFor(pathname);if(file)return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)});
      return route.fulfill({status:404,contentType:'text/plain',body:`not found: ${pathname}`});
    }catch(error){state.errors.push(`route ${pathname}: ${error.stack||error}`);return json(route,500,{ok:false,message:String(error?.message||error)});}
  });
}

async function waitReady(page){await page.waitForFunction(()=>Boolean(document.body?.matches('body[data-ai-plus="family-advisor"]')&&document.querySelector('#promptForm')&&document.querySelector('#conversationStream')&&document.querySelector('#decisionProgressList')&&document.querySelector('#sendButton')?.textContent?.trim()==='发送'),null,{timeout:15000});}
async function latestTurnId(page){return page.evaluate(()=>{const turns=document.querySelectorAll('#conversationStream .turn[data-turn-id]');return turns[turns.length-1]?.dataset.turnId||'';});}
async function waitTurn(page,beforeTurnId,state,finalBefore){
  await page.waitForFunction(previousTurnId=>{const turns=document.querySelectorAll('#conversationStream .turn[data-turn-id]'),last=turns[turns.length-1];return Boolean(last&&(last.dataset.turnId||'')!==previousTurnId&&document.querySelector('#sendButton')?.textContent?.trim()==='发送');},beforeTurnId,{timeout:30000});
  assert(state.turnResponses.length>finalBefore,'final turn response was not recorded');
  return state.turnResponses.at(-1);
}
async function assertCompletedTurnViewport(page,label='turn'){
  const state=await page.evaluate(()=>{const turns=document.querySelectorAll('#conversationStream .turn[data-turn-id]'),turn=turns[turns.length-1],bubble=turn?.querySelector('.user-bubble'),bar=document.querySelector('.topbar')?.getBoundingClientRect(),root=document.documentElement,safe=(bar?.bottom||0)+16,max=Math.max(0,root.scrollHeight-innerHeight),coarse=Boolean(matchMedia?.('(pointer: coarse)')?.matches)||Number(navigator.maxTouchPoints||0)>0;return{bubbleTop:bubble?.getBoundingClientRect().top??null,safe,y:scrollY,max,input:document.querySelector('#promptInput')?.value??null,inputActive:document.activeElement===document.querySelector('#promptInput'),contract:document.body.dataset.conversationScrollContract||'',coarse};});
  assert(state.contract==='aiplus-conversation-scroll-v0.02',`${label}: scroll contract identity missing ${JSON.stringify(state)}`);assert(state.input==='',`${label}: successful answer did not clear composer ${JSON.stringify(state)}`);if(state.coarse)assert(!state.inputActive,`${label}: touch completion kept composer focused ${JSON.stringify(state)}`);assert(state.bubbleTop!==null,`${label}: completed user bubble missing`);const aligned=Math.abs(state.bubbleTop-state.safe)<=3,topClamp=state.y<=2&&state.bubbleTop<=state.safe+3,bottomClamp=Math.abs(state.y-state.max)<=2&&state.bubbleTop>=state.safe-3;assert(aligned||topClamp||bottomClamp,`${label}: completed turn not anchored to question ${JSON.stringify(state)}`);return state;
}
async function submit(page,state,text,{inspectLoading=false}={}){
  const beforeTurnId=await latestTurnId(page),finalBefore=state.turnResponses.length;
  await page.locator('#promptInput').fill(text);await page.locator('#sendButton').click();
  await page.locator('.processing-card').waitFor({state:'visible',timeout:5000});assert(await page.locator('#promptInput').inputValue()===text,'composer must retain submitted text while answer is running');
  if(inspectLoading){const loading=await page.locator('.processing-card').evaluate(el=>{const style=getComputedStyle(el),pseudo=getComputedStyle(el,'::before');return{left:style.borderLeftColor,top:style.borderTopColor,leftWidth:style.borderLeftWidth,pseudo:pseudo.content};});assert(loading.left===loading.top&&loading.leftWidth==='1px',`loading card has decorative AI bar: ${JSON.stringify(loading)}`);assert(await page.locator('.processing-dot').count()===0,'loading mounts an AI pulse dot');}
  const result=await waitTurn(page,beforeTurnId,state,finalBefore);await assertCompletedTurnViewport(page,'submit');return result;
}
async function reset(page){const count=await page.locator('#conversationStream .turn[data-turn-id]').count();if(count){page.once('dialog',dialog=>dialog.accept());await page.locator('#newFamilyProfile').evaluate(el=>el.click());await page.waitForFunction(()=>document.querySelectorAll('#conversationStream .turn[data-turn-id]').length===0,null,{timeout:10000});}}
async function geometry(page,label){const value=await page.evaluate(()=>{const doc=document.documentElement,answer=document.querySelector('.answer-surface'),composer=document.querySelector('.composer'),footer=document.querySelector('.aiplus-product-footer');return{inner:innerWidth,doc:doc.scrollWidth,body:document.body.scrollWidth,answer:answer?.getBoundingClientRect().width||0,composer:composer?.getBoundingClientRect().width||0,footer:footer?.getBoundingClientRect().width||0};});assert(value.doc<=value.inner+2&&value.body<=value.inner+2,`${label}: horizontal overflow ${JSON.stringify(value)}`);for(const key of ['answer','composer','footer'])assert(!value[key]||value[key]<=value.inner+2,`${label}: ${key} overflow ${JSON.stringify(value)}`);return value;}
async function responsiveDrawer(page,name){const panel=page.locator('#historyPanel');if(name==='pc'){assert(await panel.isVisible(),'pc history sidebar is not visible');return;}await page.locator('#historyToggle').click();await page.waitForFunction(()=>document.body.classList.contains('history-open'));await page.waitForTimeout(250);const box=await panel.evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,inner:innerWidth};});assert(box.left>=-2&&box.right<=box.inner+2&&box.width<=box.inner+2,`${name}: history drawer overflow ${JSON.stringify(box)}`);await page.locator('#historyClose').click();await page.waitForFunction(()=>!document.body.classList.contains('history-open'));}

async function multiMajorJourney(page,state,name){
  await reset(page);const requestStart=state.schoolRequests.length;
  const result=await submit(page,state,'沈阳航空航天大学机械多少分 电气多少分 测控多少分 材料多少分 自动化多少分',{inspectLoading:true});
  assert(result.command?.agentTask==='school_major_history',`${name}: multi-major task drift`);assert(result.command?.majorKeywords?.length===5,`${name}: five majors collapsed`);
  const requests=state.schoolRequests.slice(requestStart);assert(requests.length===5,`${name}: expected five fact requests, got ${requests.length}`);assert(state.maxSchoolActive>1&&state.maxSchoolActive<=3,`${name}: browser fact concurrency drift ${state.maxSchoolActive}`);
  const statusRows=await page.locator('.query-status-row').count();assert(statusRows===5,`${name}: per-major statuses missing (${statusRows})`);
  const firstTurn=page.locator('#conversationStream .turn[data-turn-id]').first();await firstTurn.evaluate(el=>window.__stableFirstTurn=el);
  const history=firstTurn.locator('.history-records-wrap');assert(await history.count()===1,`${name}: history records missing`);const collapsedRows=await history.locator('.history-item').count();assert(collapsedRows===10,`${name}: collapsed history should mount ten rows, got ${collapsedRows}`);assert(await history.locator('.history-more').count()===1,`${name}: lazy history control missing`);
  const card=history.locator('.history-item').first(),cardMetrics=await card.evaluate(el=>{const school=el.querySelector('.candidate-school'),major=el.querySelector('.candidate-major'),r=el.getBoundingClientRect(),sr=school.getBoundingClientRect(),mr=major.getBoundingClientRect();return{display:getComputedStyle(el).display,width:r.width,scroll:el.scrollWidth,schoolWidth:sr.width,schoolHeight:sr.height,majorWidth:mr.width,majorHeight:mr.height,writing:getComputedStyle(school).writingMode};});
  assert(cardMetrics.display==='block'&&cardMetrics.scroll<=cardMetrics.width+2,`${name}: history card inherited sidebar grid ${JSON.stringify(cardMetrics)}`);assert(cardMetrics.writing==='horizontal-tb'&&cardMetrics.schoolWidth>100&&cardMetrics.schoolHeight<80,`${name}: school name collapsed vertically ${JSON.stringify(cardMetrics)}`);
  const specializedBorder=await firstTurn.locator('.result-card.history').evaluate(el=>getComputedStyle(el).borderLeftWidth);assert(specializedBorder==='0px',`${name}: legacy colored AI bar remains (${specializedBorder})`);
  await history.locator('.history-more').evaluate(el=>el.open=true);await page.waitForFunction(()=>document.querySelector('.history-lazy-mount')?.dataset.mounted==='true');assert(await history.locator('.history-item').count()>10,`${name}: lazy records did not mount`);
  await geometry(page,`${name}:multi-major`);
  if(state.failElectricOnce){
    const failed=firstTurn.locator('.query-status-row.is-failed');assert(await failed.count()===1,'partial batch failure not visible');assert(await page.getByRole('button',{name:/重试没有完成的部分/}).count()===1,'failed-only retry action missing');
    await page.evaluate(()=>{scrollTo(0,Math.min(180,document.documentElement.scrollHeight-innerHeight));window.__scrollTrace=[];const native=window.scrollTo.bind(window);window.scrollTo=(...args)=>{window.__scrollTrace.push({kind:'window',args});return native(...args);};const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(...args){window.__scrollTrace.push({kind:'element',args});return original.apply(this,args);};});
    const retryStart=state.schoolRequests.length,beforeTurnId=await latestTurnId(page),finalBefore=state.turnResponses.length;await page.getByRole('button',{name:/重试没有完成的部分/}).click();const y=await page.evaluate(()=>scrollY),retry=await waitTurn(page,beforeTurnId,state,finalBefore);assert(retry.command?.retryFailedOnly===true,'retry command did not preserve failed-only intent');assert(JSON.stringify(retry.command?.majorKeywords)===JSON.stringify(['电气']),'retry queried successful majors again');const retried=state.schoolRequests.slice(retryStart);assert(retried.length===1&&retried[0].major==='电气',`retry fan-out drift ${JSON.stringify(retried)}`);const stability=await page.evaluate(()=>({same:document.querySelector('#conversationStream .turn[data-turn-id]')===window.__stableFirstTurn,trace:window.__scrollTrace,notice:!document.querySelector('#newAnswerNotice')?.hidden}));assert(stability.same,'existing answer card was rerendered after a new turn');assert(!stability.trace.some(item=>item.kind==='element'||JSON.stringify(item.args).includes('smooth')),`smooth/element scrolling leaked ${JSON.stringify(stability.trace)}`);assert(stability.trace.filter(item=>item.kind==='window').length<=1,`multiple viewport owners ${JSON.stringify(stability.trace)}`);assert(!stability.notice,'successful completion should anchor the question instead of showing a new-answer notice');await assertCompletedTurnViewport(page,'failed-only retry');
  }
}

async function regionalMajorBatchJourney(page,state,name){
  await reset(page);const start=state.majorRequests.length,result=await submit(page,state,'省内机械电气测控都多少分'),requests=state.majorRequests.slice(start);
  assert(result.command?.agentTask==='major_region_history',`${name}: regional multi-major task drift`);
  assert(JSON.stringify(result.command?.majorKeywords)===JSON.stringify(['机械','电气','测控技术与仪器']),`${name}: regional multi-major parsing drift`);
  assert(requests.length===3,`${name}: expected one three-major browser batch, got ${requests.length}`);
  assert(result.result?.majorHistory?.queryResults?.every(item=>item.status==='success'),`${name}: regional query status missing`);
  const stream=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' ');assert(stream.includes('3项查询均已完成'),`${name}: regional batch completion not disclosed`);
  await geometry(page,`${name}:regional-major-batch`);
}

async function majorScopeJourney(page,state,name){
  await reset(page);let result=await submit(page,state,'省内电气工程及自动化专业所有的分数');assert(result.command?.agentTask==='major_region_history',`${name}: major-region task drift`);assert(result.resolvedView?.bottomLineMode==='all',`${name}: default scope must include all projects`);assert((result.result?.majorHistory?.records||[]).some(item=>item.projectLabel==='中外合作/高收费'),`${name}: default result omitted Sino/high-fee rows`);let text=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' ');assert(text.includes('默认包含普通项目与中外/高收费项目'),`${name}: default inclusion not explained`);
  result=await submit(page,state,'去掉中外');assert(result.resolvedView?.bottomLineMode==='exclude_sino',`${name}: exclude_sino follow-up lost`);assert((result.result?.majorHistory?.records||[]).every(item=>item.projectLabel!=='中外合作/高收费'),`${name}: excluded project still rendered`);assert(state.majorRequests.at(-1).includes('bottomLineMode=exclude_sino'),`${name}: scope did not cross fact contract`);await geometry(page,`${name}:major-scope`);
}

async function sourceAndAnswerJourney(page,state,name){
  await reset(page);let result=await submit(page,state,'辽宁石油化工大学宿舍和食宿条件怎么样');assert(result.command?.agentTask==='school_experience',`${name}: living question did not route to experience source`);assert(result.result?.experience?.topic==='living',`${name}: living topic missing`);const stream=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' ');assert(stream.includes('神人高校网')&&stream.includes('宿舍')&&stream.includes('食堂'),`${name}: experience source/content missing`);assert(!stream.includes('老师上课认真'),`${name}: unrelated teaching review filled living answer`);assert(stream.includes('核验官方食宿硬信息'),`${name}: official verification branch missing`);
  await reset(page);result=await submit(page,state,'介绍下沈阳师范大学');assert(result.command?.agentTask==='school_research',`${name}: school introduction task drift`);assert(result.result?.profileSupplement?.mode==='moe_directory_baseline',`${name}: 2952-school deterministic profile fallback missing`);const profile=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' '),profilePhrase='根据教育部全国普通高等学校名单';assert(profile.includes('位于辽宁 · 沈阳的公办本科高校'),`${name}: school identity baseline missing`);assert(profile.split(profilePhrase).length-1===1,`${name}: primary school answer was duplicated`);
  await reset(page);result=await submit(page,state,'沈阳工业大学和沈阳航空航天大学哪个好');assert(result.command?.agentTask==='school_comparison',`${name}: comparison task drift`);assert(result.result?.answerStatus==='needs_clarification',`${name}: no-score comparison must ask for score only for reachability`);const compare=(await page.locator('#conversationStream').innerText()).replace(/\s+/g,' ');assert(compare.includes('不带分数时可以先比较学校画像')&&compare.includes('参考分数'),`${name}: no-score comparison answer is not human-readable`);
  await reset(page);result=await submit(page,state,'学校平台和专业质量怎么平衡');assert(result.command?.agentTask==='general_advice'&&result.result?.answerStatus==='answered',`${name}: independent advice lacks primary answer`);const advice=await page.locator('.assistant-lead p').last().innerText();assert(advice.length>40&&!/这轮切到|建立可行范围/.test(advice),`${name}: framework answer regressed: ${advice}`);
}

async function turnWindowJourney(page,state){
  await reset(page);for(let index=1;index<=13;index+=1)await submit(page,state,`第${index}轮，学校平台和专业质量怎么平衡`);
  assert(await page.locator('#conversationStream .turn[data-turn-id]').count()===12,'conversation window must mount only the latest twelve turns');const control=page.locator('.turn-window-control');assert(await control.count()===1,'older-turn load control missing');await control.click();assert(await page.locator('#conversationStream .turn[data-turn-id]').count()===13,'older turns did not mount on demand');
}

const browser=await chromium.launch({headless:true});
const report=[];
try{
  for(const device of DEVICES){
    const context=await browser.newContext({viewport:device.viewport,isMobile:Boolean(device.isMobile),hasTouch:Boolean(device.hasTouch),locale:'zh-CN'}),page=await context.newPage(),state=makeState(device.name);
    page.on('pageerror',error=>state.errors.push(`pageerror: ${error.message}`));page.on('console',message=>{if(message.type()==='error'&&!/status of 422/.test(message.text()))state.errors.push(`console: ${message.text()}`);});
    try{
      await installRoutes(page,state);const response=await page.goto(`${ORIGIN}/aiplus/?device=${device.name}`,{waitUntil:'networkidle',timeout:30000});assert(response?.ok(),`${device.name}: page load ${response?.status()}`);await waitReady(page);
      assert(await page.locator('body[data-ai-plus="family-advisor"][data-ai-plus-assets="aiplus-assets-v002_4"]').count()===1,`${device.name}: product contract attributes missing`);assert((await page.locator('.aiplus-product-footer').innerText()).includes('v0.02'),`${device.name}: footer version missing`);const support=page.locator('.decision-support-card');assert(await support.count()===1&&await support.evaluate(el=>!el.open),`${device.name}: decision support should start collapsed`);
      await responsiveDrawer(page,device.name);await multiMajorJourney(page,state,device.name);await regionalMajorBatchJourney(page,state,device.name);await majorScopeJourney(page,state,device.name);await sourceAndAnswerJourney(page,state,device.name);if(device.name==='pc')await turnWindowJourney(page,state);await geometry(page,`${device.name}:final`);
      await page.screenshot({path:path.join(ARTIFACT_DIR,`${device.name}.png`),fullPage:true});assert(state.errors.length===0,`${device.name}: ${state.errors.join(' | ')}`);report.push({device:device.name,viewport:device.viewport,maxBatchConcurrency:state.maxSchoolActive,schoolFactRequests:state.schoolRequests.length,majorFactRequests:state.majorRequests.length});
    }catch(error){await page.screenshot({path:path.join(ARTIFACT_DIR,`${device.name}-failure.png`),fullPage:true}).catch(()=>{});throw new Error(`${device.name}: ${error.stack||error}\n${state.errors.join('\n')}`);}finally{await context.close();}
  }
  console.log(JSON.stringify({ok:true,version:'aiplus-v0.02-browser-mocked',artifacts:ARTIFACT_DIR,devices:report,checks:['full-browser-module-load','bounded-five-major-batch','regional-multi-major-batch','per-query-state','failed-only-retry','stable-keyed-turn-dom','single-viewport-transaction','completed-turn-question-anchor','composer-retained-while-running','composer-cleared-on-success','touch-composer-blur-boundary','lazy-history-mount','default-include-sino','exclude-sino-followup','experience-topic-source','2952-school-profile-baseline','nonduplicated-primary-answer','no-score-comparison','primary-answer','twelve-turn-window','pc-pad-android-no-overflow','android-horizontal-school-name','responsive-history-drawer','footer-v0.02','family-decision-ready-signal','independent-family-reset']},null,2));
}finally{await browser.close();}