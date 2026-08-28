import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { interpretAiCommand } from '../functions/_lib/ai/command-interpreter.js';
import { orchestrateAiTurn } from '../functions/_lib/ai/turn-orchestrator.js';
import { onRequestGet as majorHistoryGet } from '../functions/api/ai/major-history.js';
import { createAiWorkspace } from '../shared/ai/ai-workspace-contract.v3992_0.js';
import { extractSchoolRecords } from '../tongxue/data/school-name-resolver-v150.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function assert(value,message){if(!value)throw new Error(message);}
function normProvince(value){return String(value||'').replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市)$/u,'').trim();}
function normCity(value){return String(value||'').replace(/(自治州|地区|盟|市)$/u,'').trim();}
function fileForUrl(url){return path.join(ROOT,new URL(url).pathname.replace(/^\//,''));}
const assets={async fetch(request){const file=fileForUrl(request.url);if(!fs.existsSync(file))return new Response('not found',{status:404,headers:{'content-type':'text/plain'}});const type=file.endsWith('.json')?'application/json':'text/javascript';return new Response(fs.readFileSync(file),{status:200,headers:{'content-type':type}});}};
const context={request:new Request('https://example.test/api/ai/turn',{method:'POST'}),env:{ASSETS:assets}};
const directoryPayload=JSON.parse(fs.readFileSync(path.join(ROOT,'tongxue/data/school-search-index.20260617-v150.json'),'utf8'));
const truth=extractSchoolRecords(directoryPayload).filter(row=>['本科','专科'].includes(String(row.level||'')));
function truthRows({province='',city='',level='all'}){return truth.filter(row=>(!province||normProvince(row.province)===province)&&(!city||normCity(row.city)===city)&&(level==='all'||String(row.level||'')===level));}
async function command(input,workspace=createAiWorkspace()){return (await interpretAiCommand(input,workspace,context.env,context.request)).command;}
async function run(input,workspace=createAiWorkspace()){let confirmed=null,toolResults={};for(let i=0;i<4;i+=1){const out=await orchestrateAiTurn(context,{input,workspace,confirmedCommand:confirmed,deterministicToolResults:toolResults});assert(out?.ok!==false,`${input} failed: ${out?.message}`);if(!out.pendingDeterministicTool)return out;for(const tool of out.toolRequests||[out.toolRequest]){assert(tool.kind==='major_history',`${input} unexpected tool ${tool.kind}`);const response=await majorHistoryGet({request:new Request(new URL(tool.url,'https://example.test').toString()),env:{ASSETS:assets}}),payload=await response.json();toolResults[tool.key]={kind:tool.kind,key:tool.key,url:tool.url,status:response.status,payload};}confirmed=out.command;}throw new Error(`${input} did not converge`);}
function continuedWorkspace(base,out){return createAiWorkspace({...base,agentContext:out.agentContext,lastResult:out.result,lastTurn:out.turnRecord,activeView:out.commitView?out.resolvedView:base.activeView,turnHistory:[...(base.turnHistory||[]),out.turnRecord]});}
function assertDirectory(out,{province='',city='',level='all'}){assert(out.command.agentTask==='region_school_directory',`unexpected task ${out.command.agentTask}`);assert(out.commitView===false,'directory query must not commit candidate view');assert(out.result?.regionSchools?.ok===true,'region school result missing');const expected=truthRows({province,city,level}),actual=out.result.regionSchools.records||[];assert(out.result.regionSchools.total===expected.length,`truth count mismatch expected ${expected.length} got ${out.result.regionSchools.total}`);assert(new Set(actual.map(x=>x.school)).size===actual.length,'duplicate schools returned');assert(actual.every(x=>(!province||x.province===province)&&(!city||x.city===city)&&(level==='all'||x.level===level)),'region/level leaked');assert(out.blocks.some(x=>x.type==='region_school_directory'),'dedicated region school UI block missing');assert(!out.blocks.some(x=>x.type==='background_routes'&&x.background?.scope==='region_school_directory'),'region directory leaked through background renderer');assert(out.blocks.some(x=>x.type==='next_questions'),'next questions missing');}

const empty=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['all'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'}});
const shenyang=await run('沈阳有哪些大学？',empty);assertDirectory(shenyang,{province:'辽宁',city:'沈阳'});assert(JSON.stringify(shenyang.resolvedView.regionKeys)===JSON.stringify(empty.activeView.regionKeys),'knowledge query changed active region');assert(shenyang.result.regionSchools.summary.regionTotal===shenyang.result.regionSchools.summary.regionUndergraduateCount+shenyang.result.regionSchools.summary.regionJuniorCollegeCount,'count split mismatch');assert(!shenyang.blocks.find(x=>x.type==='next_questions')?.items?.some(x=>x.id==='region-first-school'||/继续看/.test(x.label||'')),'directory must not invent a first-school recommendation');
assertDirectory(await run('辽宁有多少大学？'),{province:'辽宁'});
assertDirectory(await run('辽宁有哪些本科院校？'),{province:'辽宁',level:'本科'});
assertDirectory(await run('沈阳有多少专科？'),{province:'辽宁',city:'沈阳',level:'专科'});
const shenzhen=await run('深圳有哪些大学？');assertDirectory(shenzhen,{province:'广东',city:'深圳'});assert(shenzhen.command.regionKeys?.[0]==='city:深圳','generic city key not normalized');
assertDirectory(await run('广东深圳有哪些本科？'),{province:'广东',city:'深圳',level:'本科'});
const followWorkspace=continuedWorkspace(empty,shenyang),undergradFollow=await run('本科呢？',followWorkspace);assertDirectory(undergradFollow,{province:'辽宁',city:'沈阳',level:'本科'});assert(undergradFollow.command.regionContext?.inherited===true,'region follow-up did not inherit conversation region');


const uniqueRegions=[];
for(const row of truth){const province=normProvince(row.province),city=normCity(row.city);if(province&&!uniqueRegions.some(x=>x.type==='province'&&x.label===province))uniqueRegions.push({type:'province',label:province,province});if(city&&!uniqueRegions.some(x=>x.type==='city'&&x.label===city&&x.province===province))uniqueRegions.push({type:'city',label:city,province,city});}
for(const region of uniqueRegions){const query=region.type==='city'?(region.province===region.label?`${region.label}市有哪些大学`:`${region.province}${region.label}有哪些大学`):`${region.label}有哪些大学`;const out=await run(query);const expected=truthRows({province:region.province,city:region.city||''}).length,actual=Number(out.result?.regionSchools?.total||0);if(expected!==actual)throw new Error(`region matrix mismatch query=${query} expected=${expected} actual=${actual} resolved=${JSON.stringify(out.result?.regionSchools?.region||{})}`);assertDirectory(out,{province:region.province,city:region.city||''});}
assertDirectory(await run('吉林有那些大学'),{province:'吉林'});
assertDirectory(await run('吉林市有哪些大学'),{province:'吉林',city:'吉林'});
const pollutedBase=createAiWorkspace({agentContext:{currentTask:'school_research',focus:{school:'辽宁科技大学'}},lastTurn:{userText:'辽宁科技大学怎么样'},activeView:{regionKeys:['all'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'}});
for(const text of ['北京有哪些大学','吉林有那些大学','上海的大学有哪些','天津高校都有哪些','重庆高校列表','南京所有本科院校','武汉都有什么大学','深圳给我看看高校']){const out=await run(text,pollutedBase);assert(out.command.agentTask==='region_school_directory',`${text} polluted by prior school: ${out.command.agentTask}`);assert(out.commitView===false,`${text} must not commit view`);}
for(const text of ['吉林大学怎么样','北京大学有哪些专业','南京大学电气多少分','沈阳工业大学有哪些强项','大连交通大学所有专业多少分']){const cmd=await command(text);assert(cmd.agentTask!=='region_school_directory',`${text} false-positive region directory`);}

const syMajor=await command('沈阳电气有哪些学校');assert(syMajor.agentTask==='major_region_history',`沈阳+专业 task drifted ${syMajor.agentTask}`);assert(syMajor.regionKeys.includes('shenyang'),'沈阳专业查询 region missing');
const szMajor=await command('深圳电气有哪些学校');assert(szMajor.agentTask==='major_region_history',`深圳+专业 task drifted ${szMajor.agentTask}`);assert(szMajor.regionKeys.includes('city:深圳'),'深圳专业查询 city key missing');assert(szMajor.transientRegionView===true,'generic city major query must be transient');const szMajorOut=await run('深圳电气有哪些学校');assert(szMajorOut.commitView===false,'generic city major history polluted candidate view');assert((szMajorOut.result?.majorHistory?.records||[]).every(row=>normCity(row.city)==='深圳'),'generic city major-history leaked other cities');

assert((await command('沈阳工业大学怎么样')).agentTask==='school_research','沈阳工业大学 must remain school research');
assert((await command('辽宁大学怎么样')).agentTask==='school_research','辽宁大学 must remain school research');
const scoreSy=await command('580分沈阳有哪些学校');assert(['candidate_discovery','candidate_refinement'].includes(scoreSy.agentTask),`score+沈阳 must remain candidate query: ${scoreSy.agentTask}`);
const candidateWorkspace=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:[],bottomLineMode:'all'}});assert((await command('只看沈阳',candidateWorkspace)).agentTask==='candidate_refinement','explicit candidate region refinement drifted');
const scoreSz=await command('580分深圳有哪些学校');assert(scoreSz.agentTask==='region_school_directory','unsupported generic-city candidate must degrade to truthful directory instead of silently querying nationwide');assert(scoreSz.scoreDeferred===true,'deferred score boundary missing');

console.log(JSON.stringify({ok:true,buildId:directoryPayload.buildId,count:truth.length,shenyang:shenyang.result.regionSchools.summary,shenzhen:shenzhen.result.regionSchools.summary,genericCityMajorRecords:szMajorOut.result?.majorHistory?.records?.length||0},null,2));
