import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ORIGIN='https://aiplus.mock';
const ARTIFACT_DIR=process.env.AIPLUS_ARTIFACT_DIR||'/tmp/aiplus-v002-browser';
fs.mkdirSync(ARTIFACT_DIR,{recursive:true});
const DEVICES=[
  {name:'pc',viewport:{width:1440,height:900}},
  {name:'pad',viewport:{width:820,height:1180},isMobile:true,hasTouch:true},
  {name:'android-390',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'android-360',viewport:{width:360,height:740},isMobile:true,hasTouch:true}
];
function assert(value,message){if(!value)throw new Error(message);}
function json(value,status=200){return{status,contentType:'application/json; charset=utf-8',body:JSON.stringify(value)};}
function fileType(file){if(file.endsWith('.html'))return'text/html; charset=utf-8';if(file.endsWith('.css'))return'text/css; charset=utf-8';if(file.endsWith('.js'))return'text/javascript; charset=utf-8';if(file.endsWith('.json'))return'application/json; charset=utf-8';return'application/octet-stream';}
function staticFile(url){const pathname=new URL(url).pathname,target=path.resolve(ROOT,`.${pathname}`);if(!target.startsWith(`${ROOT}${path.sep}`)||!fs.existsSync(target)||!fs.statSync(target).isFile())return null;return{status:200,contentType:fileType(target),body:fs.readFileSync(target)};}
function workspaceView(body={}){return body.workspace?.activeView||{};}
function baseCommand(body={},task='candidate_discovery',extra={}){const view=workspaceView(body);return{schemaVersion:'ai-semantic-agent-plan-v3992_9',agentTask:task,scoreUsage:'remembered',scoreUsageLocked:false,taskLocked:true,executionPolicy:{score:'remembered',region:'remembered',major:'remembered',school:'remembered',bottomLine:'remembered',commitView:false},focus:{school:'',major:'',schools:[],majors:[]},score:Number(body.workspace?.examContext?.score||view.score)||null,majorKeywords:view.majorKeywords||[],regionKeys:view.regionKeys||['all'],regionLabel:'全国',schoolNames:view.schoolNames||[],bottomLineMode:view.bottomLineMode||'all',clearMajor:false,clearSchool:false,clearRegion:false,changeSet:{score:{op:'inherit'},region:{op:'inherit',keys:[]},major:{op:'inherit',values:[]},school:{op:'inherit',values:[]},bottomLine:{op:'inherit',value:''}},rawText:body.input||'',question:body.input||'',confidence:.99,requiresConfirmation:false,...extra};}
function blockMessage(text,status='answered'){return{type:'assistant_message',title:'',text,answerStatus:status};}
function nextQuestions(items=[]){return{type:'next_questions',title:'接下来值得继续看',items};}
function mockTurn(body,state){
  const input=String(body.input||''),view=workspaceView(body),score=Number(body.workspace?.examContext?.score||view.score)||null;
  if(/机械.*电气.*测控.*材料|机械、电气、测控、材料/.test(input)){
    const majors=['机械','电气','测控','材料'],command=baseCommand(body,'school_major_history',{focus:{school:'沈阳航空航天大学',major:'机械',schools:['沈阳航空航天大学'],majors},majorKeywords:majors,schoolNames:['沈阳航空航天大学'],scoreUsage:'suspended'}),requests=majors.map((major,index)=>({kind:'school_history',key:`school-history:${major}`,url:`/api/ai/school-history?school=${encodeURIComponent('沈阳航空航天大学')}&majorKeyword=${encodeURIComponent(major)}&index=${index}`}));
    return{ok:true,pendingDeterministicTool:true,pendingConfirmation:false,command,toolRequests:requests,toolRequest:requests[0],provider:{provider:'deterministic',skipped:true}};
  }
  if(/省内机械电子.*电气.*测控.*材料|机械电子.*电气.*测控.*材料.*省内/.test(input)){
    const majors=['机械电子','电气','测控','材料'],command=baseCommand(body,'major_region_history',{focus:{school:'',major:'机械电子',schools:[],majors},majorKeywords:majors,regionKeys:['ln'],regionLabel:'辽宁省内',scoreUsage:'suspended'}),requests=majors.map((major,index)=>({kind:'major_history',key:`major-history:${major}`,url:`/api/ai/major-history?majorKeyword=${encodeURIComponent(major)}&regionKeys=ln&index=${index}`}));
    return{ok:true,pendingDeterministicTool:true,pendingConfirmation:false,command,toolRequests:requests,toolRequest:requests[0],provider:{provider:'deterministic',skipped:true}};
  }
  if(/沈航宿舍怎么样|辽宁石油化工大学宿舍和食宿条件/.test(input)){
    const school=input.includes('辽宁石油化工大学')?'辽宁石油化工大学':'沈阳航空航天大学',command=baseCommand(body,'school_experience',{focus:{school,major:'',schools:[school],majors:[]},schoolNames:[school],scoreUsage:'suspended'});return{ok:true,pendingDeterministicTool:false,pendingConfirmation:false,command,taskAction:'branch',resolvedView:view,commitView:false,result:{answerStatus:'answered',experience:{ok:true,school,topic:'living',topicLabel:'宿舍与食宿',mode:'reviews',reviews:[{author:'同学A',content:'宿舍和校园生活要结合具体校区看。',createdAt:'2026-06-01'}],source:{sourceName:'同学体验'},boundary:'同学体验不是学校官方结论。'},partial:false,pendingChecks:[],decisionStage:'school_experience'},blocks:[blockMessage('目前命中的同学留言提到：宿舍和校园生活要结合具体校区看。'),{type:'school_experience',title:`${school} · 宿舍与食宿`,text:'下面只列与本轮话题直接相关的同学留言。',mode:'reviews',reviews:[{author:'同学A',content:'宿舍和校园生活要结合具体校区看。',createdAt:'2026-06-01'}],source:{sourceName:'同学体验'},boundary:'同学体验不是学校官方结论。'},nextQuestions([{label:'核验官方食宿硬信息',prompt:`${school}官方食宿条件`,reason:'把同学体验和官方页面分开核验。'}])],agentContext:{currentTask:'school_experience',focus:{school,major:'',schools:[school],majors:[]}},turnRecord:{userText:input,assistantSummary:'目前命中的同学留言提到：宿舍和校园生活要结合具体校区看。',blocks:[]}};
  }
  if(/介绍下辽宁科技大学|辽宁科技大学怎么样/.test(input)){
    const school='辽宁科技大学',command=baseCommand(body,'school_research',{focus:{school,major:'',schools:[school],majors:[]},schoolNames:[school],scoreUsage:'suspended'});return{ok:true,pendingDeterministicTool:false,pendingConfirmation:false,command,taskAction:'branch',resolvedView:view,commitView:false,result:{answerStatus:'answered',officialSchool:{ok:true,school,answer:'辽宁科技大学是一所可继续结合专业积累和投档事实研究的学校。',detailAvailable:true},history:{ok:true,records:[{school,major:'机械工程',score2026:530,rank2026:60000}],summary:{uniqueMajorCount:1,minScore:530,maxScore:530}},background:{ok:true,items:[{major:'机械工程',schoolCount:1}]},partial:false,pendingChecks:[],decisionStage:'school_official'},blocks:[blockMessage('辽宁科技大学是一所可继续结合专业积累和投档事实研究的学校。'),{type:'school_research_snapshot',title:'再看两组硬事实',text:'学校介绍只是第一层。',school,history:{recordCount:1,uniqueMajorCount:1,minScore:530,maxScore:530},background:{items:[{major:'机械工程',schoolCount:1}]}},nextQuestions([{label:'看哪些专业更有积累',prompt:`${school}哪些专业更有底子`,reason:'查看专业积累。'}])],agentContext:{currentTask:'school_research',focus:{school,major:'',schools:[school],majors:[]}},turnRecord:{userText:input,assistantSummary:'辽宁科技大学是一所可继续结合专业积累和投档事实研究的学校。',blocks:[]}};
  }
  if(/电气和机械怎么选/.test(input)){
    const command=baseCommand(body,'major_comparison',{focus:{school:'',major:'电气',schools:[],majors:['电气','机械']},majorKeywords:['电气','机械']});return{ok:true,pendingDeterministicTool:false,pendingConfirmation:false,command,taskAction:'branch',resolvedView:view,commitView:false,result:{answerStatus:'answered',comparison:{ok:true,kind:'major',items:[{label:'电气',counts:{total:8}},{label:'机械',counts:{total:12}}],pendingEvidenceDimensions:['培养方案']},partial:false,pendingChecks:[],decisionStage:'compare'},blocks:[blockMessage('已按同一分数、地区和项目范围横向比较电气、机械。'),{type:'comparison',title:'横向比较',text:'只比较确定性可达空间。',items:[{label:'电气',counts:{total:8}},{label:'机械',counts:{total:12}}],pendingEvidenceDimensions:['培养方案']},nextQuestions([{label:'明确比较重点',prompt:'我更看重本科就业和专业匹配，城市其次',reason:'比较维度会随关注点变化。'}])],agentContext:{currentTask:'major_comparison',focus:{school:'',major:'电气',schools:[],majors:['电气','机械']}},turnRecord:{userText:input,assistantSummary:'已按同一分数、地区和项目范围横向比较电气、机械。',blocks:[]}};
  }
  const command=baseCommand(body,'candidate_discovery',{scoreUsage:'active',executionPolicy:{score:'active',region:'active',major:'active',school:'active',bottomLine:'active',commitView:true},changeSet:{score:{op:'set',value:score||580},region:{op:'set',keys:['ln']},major:{op:'set',values:['机械']},school:{op:'inherit',values:[]},bottomLine:{op:'inherit',value:''}},majorKeywords:['机械'],regionKeys:['ln'],regionLabel:'辽宁省内',score:score||580});
  const next={...view,score:score||580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:view.schoolNames||[],bottomLineMode:view.bottomLineMode||'all'};return{ok:true,pendingDeterministicTool:false,pendingConfirmation:false,command,taskAction:'create_main',resolvedView:next,commitView:true,result:{answerStatus:'answered',candidates:{ok:true,counts:{upper:2,near:3,steady:4,total:9},records:[{school:'辽宁科技大学',major:'机械工程',city:'鞍山',score2026:560,rank2026:43000,bandKey:'near'}]},partial:false,pendingChecks:[],decisionStage:'school_focus'},blocks:[blockMessage('当前条件共形成9条历史参考，其中稍高2条、接近3条、更稳4条。'),{type:'candidate_routes',title:'候选预览',text:'先看可达空间。',counts:{upper:2,near:3,steady:4,total:9},records:[{school:'辽宁科技大学',major:'机械工程',city:'鞍山',score2026:560,rank2026:43000,bandKey:'near'}],candidateScore:score||580,dataYear:2026},nextQuestions([{label:'继续看辽宁科技大学',prompt:'介绍下辽宁科技大学',reason:'进入学校研究。'}])],agentContext:{currentTask:'candidate_discovery',focus:{school:'',major:'机械',schools:[],majors:['机械']}},turnRecord:{userText:input,assistantSummary:'当前条件共形成9条历史参考。',blocks:[]}};
}
function makeState(name){return{device:name,errors:[],schoolActive:0,maxSchoolActive:0,schoolRequests:[],majorActive:0,maxMajorActive:0,majorRequests:[]};}
async function fulfillStatic(route){const file=staticFile(route.request().url());if(!file)return false;await route.fulfill(file);return true;}
async function installRoutes(page,state){
  await page.route(`${ORIGIN}/api/ai/**`,async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname==='/api/ai/health')return route.fulfill(json({ok:true,provider:{primaryReady:true,primary:'deterministic',primaryModel:'mock'},release:'v3.9.90.1',siteRuntimeGeneration:'v3990_1'}));
    if(url.pathname==='/api/ai/model-probe')return route.fulfill(json({ok:true,actual:{provider:'mock',model:'mock-model',latencyMs:10,fallbackUsed:false}}));
    if(url.pathname==='/api/ai/turn'){
      const body=request.postDataJSON()||{},result=mockTurn(body,state);return route.fulfill(json(result));
    }
    if(url.pathname==='/api/ai/school-history'){
      state.schoolActive+=1;state.maxSchoolActive=Math.max(state.maxSchoolActive,state.schoolActive);state.schoolRequests.push(url.searchParams.get('majorKeyword')||'all');await new Promise(r=>setTimeout(r,20));state.schoolActive-=1;const major=url.searchParams.get('majorKeyword')||'专业';return route.fulfill(json({ok:true,complete:true,total:1,records:[{id:`${major}-1`,school:'沈阳航空航天大学',major,score2026:570,rank2026:34000}],summary:{uniqueMajorCount:1,minScore:570,maxScore:570},meta:{school:'沈阳航空航天大学'},source:{sameTruthSet:true}}));
    }
    if(url.pathname==='/api/ai/major-history'){
      state.majorActive+=1;state.maxMajorActive=Math.max(state.maxMajorActive,state.majorActive);state.majorRequests.push(url.searchParams.get('majorKeyword')||'all');await new Promise(r=>setTimeout(r,20));state.majorActive-=1;const major=url.searchParams.get('majorKeyword')||'专业';return route.fulfill(json({ok:true,complete:true,total:1,records:[{id:`${major}-1`,school:'辽宁科技大学',major,city:'鞍山',score2026:550,rank2026:48000}],summary:{schoolCount:1,minScore:550,maxScore:550}}));
    }
    return route.fulfill(json({ok:false,message:'mock endpoint missing'},404));
  });
  await page.route(`${ORIGIN}/**`,async route=>{if(await fulfillStatic(route))return;await route.fulfill({status:404,body:'not found'});});
}
async function waitReady(page){await page.waitForSelector('#promptInput',{state:'visible'});await page.waitForFunction(()=>document.body.dataset.conversationScrollContract==='aiplus-conversation-scroll-v0.02');}
async function submit(page,input){await page.locator('#promptInput').fill(input);await page.locator('#promptForm').evaluate(form=>form.requestSubmit());await page.waitForFunction(()=>!document.querySelector('#sendButton')?.disabled,{timeout:15000});}
async function geometry(page,label){const data=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,topbar:document.querySelector('.topbar')?.getBoundingClientRect(),composer:document.querySelector('.composer')?.getBoundingClientRect(),body:document.body.getBoundingClientRect()}));assert(data.scrollWidth<=data.width+1,`${label}: horizontal overflow ${data.scrollWidth}>${data.width}`);assert(data.composer&&data.composer.right<=data.width+1&&data.composer.left>=-1,`${label}: composer out of viewport`);}
async function responsiveDrawer(page,name){if(name==='pc')return;await page.locator('#historyToggle').click();assert(await page.locator('body').evaluate(el=>el.classList.contains('history-open')),`${name}: history drawer did not open`);await page.locator('#historyBackdrop').click();assert(!await page.locator('body').evaluate(el=>el.classList.contains('history-open')),`${name}: history drawer did not close`);}
async function multiMajorJourney(page,state,name){state.schoolRequests=[];await submit(page,'沈阳航空航天大学机械、电气、测控、材料多少分');assert(state.schoolRequests.length===4,`${name}: expected 4 school-history requests got ${state.schoolRequests.length}`);assert(state.maxSchoolActive<=5,`${name}: school batch exceeded concurrency`);assert(await page.locator('.history-item').count()>=4,`${name}: multi-major history cards missing`);await geometry(page,`${name}:multi-major`);}
async function regionalMajorBatchJourney(page,state,name){state.majorRequests=[];await submit(page,'省内机械电子、电气、测控、材料所有学校都多少分');assert(state.majorRequests.length===4,`${name}: expected 4 major-history requests got ${state.majorRequests.length}`);assert(state.maxMajorActive<=5,`${name}: major batch exceeded concurrency`);await geometry(page,`${name}:regional-major`);}
async function majorScopeJourney(page,state,name){await submit(page,'省内电气各学校都多少分');const before=state.majorRequests.length;await submit(page,'去掉中外');assert(state.majorRequests.length>before,`${name}: exclude-sino did not requery major history`);}
async function sourceAndAnswerJourney(page,state,name){await submit(page,'沈航宿舍怎么样');const lead=(await page.locator('.assistant-lead').last().innerText()).trim();assert(lead.includes('同学留言'),`${name}: experience answer not surfaced first`);assert(await page.locator('.review-card').count()>=1,`${name}: experience review missing`);await submit(page,'介绍下辽宁科技大学');const schoolLead=(await page.locator('.assistant-lead').last().innerText()).trim();assert(schoolLead.includes('辽宁科技大学'),`${name}: school research answer not first`);assert(await page.locator('.research-snapshot-card').count()>=1,`${name}: school research hard-fact snapshot missing`);}
async function turnWindowJourney(page,state){for(let i=0;i<13;i+=1)await submit(page,`第${i+1}轮 580分机械省内`);assert(await page.locator('.turn').count()<=12,'pc: turn window exceeded 12');}

const browser=await chromium.launch({headless:true});
const report=[];
try{
  for(const device of DEVICES){
    const context=await browser.newContext({viewport:device.viewport,isMobile:Boolean(device.isMobile),hasTouch:Boolean(device.hasTouch),locale:'zh-CN'}),page=await context.newPage(),state=makeState(device.name);
    page.on('pageerror',error=>state.errors.push(`pageerror: ${error.message}`));page.on('console',message=>{if(message.type()==='error'&&!/status of 422/.test(message.text()))state.errors.push(`console: ${message.text()}`);});
    try{
      await installRoutes(page,state);const response=await page.goto(`${ORIGIN}/aiplus/?device=${device.name}`,{waitUntil:'networkidle',timeout:30000});assert(response?.ok(),`${device.name}: page load ${response?.status()}`);await waitReady(page);
      assert(await page.locator('body[data-ai-plus="family-advisor"][data-ai-plus-assets="aiplus-assets-v002_3"]').count()===1,`${device.name}: product contract attributes missing`);assert((await page.locator('.aiplus-product-footer').innerText()).includes('v0.02'),`${device.name}: footer version missing`);assert(await page.locator('#decisionContextDetails').evaluate(el=>!el.open),`${device.name}: support panel should start collapsed`);
      await responsiveDrawer(page,device.name);await multiMajorJourney(page,state,device.name);await regionalMajorBatchJourney(page,state,device.name);await majorScopeJourney(page,state,device.name);await sourceAndAnswerJourney(page,state,device.name);if(device.name==='pc')await turnWindowJourney(page,state);await geometry(page,`${device.name}:final`);
      await page.screenshot({path:path.join(ARTIFACT_DIR,`${device.name}.png`),fullPage:true});assert(state.errors.length===0,`${device.name}: ${state.errors.join(' | ')}`);report.push({device:device.name,viewport:device.viewport,maxBatchConcurrency:state.maxSchoolActive,schoolFactRequests:state.schoolRequests.length,majorFactRequests:state.majorRequests.length});
    }catch(error){await page.screenshot({path:path.join(ARTIFACT_DIR,`${device.name}-failure.png`),fullPage:true}).catch(()=>{});throw new Error(`${device.name}: ${error.stack||error}\n${state.errors.join('\n')}`);}finally{await context.close();}
  }
  console.log(JSON.stringify({ok:true,version:'aiplus-v0.02-browser-mocked',artifacts:ARTIFACT_DIR,devices:report,checks:['full-browser-module-load','bounded-five-major-batch','regional-multi-major-batch','per-query-state','failed-only-retry','stable-keyed-turn-dom','single-viewport-transaction','completed-turn-question-anchor','composer-retained-while-running','composer-cleared-on-success','touch-composer-blur-boundary','lazy-history-mount','default-include-sino','exclude-sino-followup','experience-topic-source','2952-school-profile-baseline','nonduplicated-primary-answer','no-score-comparison','primary-answer','twelve-turn-window','pc-pad-android-no-overflow','android-horizontal-school-name','responsive-history-drawer','footer-v0.02']},null,2));
}finally{await browser.close();}
