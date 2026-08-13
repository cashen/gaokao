import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { loadMatchingRecordsFromFiles, loadExactSchoolRecordsFromFiles, clearExactSchoolRecordCacheForTest, exactSchoolRecordCacheState } from '../functions/_lib/ln-rank-manifest.js';
import { rawSchool } from '../functions/_lib/fenxi-normalizer.js';
import { runSchoolMajorHistory } from '../functions/_lib/ai/tool-registry.js';
import {
  applyAiWorkspaceEvent,
  compactSchoolHistoryFactPayload,
  createAiWorkspace
} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import { deterministicCommand } from '../functions/_lib/ai/command-interpreter.js';
import { orchestrateAiTurn } from '../functions/_lib/ai/turn-orchestrator.js';
import {
  AI_SCHOOL_HISTORY_MAX_RECORDS,
  aiSchoolHistoryFactCacheState,
  clearAiSchoolHistoryFactCacheForTest,
  queryAiSchoolHistoryFact
} from '../functions/_lib/ai/school-history-fact-source.js';
import { onRequest as schoolHistoryOnRequest } from '../functions/api/ai/school-history.js';
import { onRequest as publicSchoolMajorsOnRequest } from '../functions/api/school-majors.js';

const tool=fs.readFileSync('functions/_lib/ai/tool-registry.js','utf8');
const orchestrator=fs.readFileSync('functions/_lib/ai/turn-orchestrator.js','utf8');
const app=fs.readFileSync('aiplus/app.v3990_1.js','utf8');
assert.ok(!/import\s+\{[^}]*queryAiSchoolHistory[^}]*\}\s+from\s+['"]\.\/school-history-adapter\.js['"]/.test(tool),'AI base graph must not statically import school-history-adapter');
assert.ok(tool.includes("kind:'school_history'"),'school history deterministic tool kind missing');
assert.ok(tool.includes("new URL('/api/ai/school-history'"),'school history must use the bounded AIPLuS fact bridge');
assert.ok(tool.includes("url.searchParams.set('limit','120')"),'school history must return the complete largest current school record set');
assert.ok(tool.includes('normalizedScore=normalizeOptionalCandidateScore(candidateScore)'),'school history must preserve null candidate score');
assert.ok(tool.includes("normalizedScore===null?'score-desc':'position-near'"),'school history null score sort boundary missing');
assert.ok(tool.includes('majorKeywords=[]'),'school history adapter must accept multiple major keywords');
assert.ok(tool.includes('queryResults.push'),'school history batch must preserve per-query status');
assert.ok(tool.includes('partial,allFailed'),'school history batch must distinguish partial and all-failed states');
assert.ok(tool.includes('AI_FACT_BRIDGE_CONTRACT_VERSION'),'server tool registry must use shared fact bridge version');
const factBridge=fs.readFileSync('shared/ai/ai-workspace-contract.v3992_0.js','utf8');
assert.ok(factBridge.includes("AI_FACT_BRIDGE_CONTRACT_VERSION='ai-fact-bridge-v3992_10'"),'shared fact bridge version drift');
assert.ok(factBridge.includes('data.records.slice(0,120)'),'school history bridge must not truncate the 117-record maximum school');
assert.ok(factBridge.includes('queryErrorMessage'),'shared fact bridge error provenance missing');
assert.ok(orchestrator.includes('majorKeywords:focus.majors'),'orchestrator must pass multiple major keywords without joining them into one query');
assert.ok(orchestrator.includes('result.history'),'school-history deterministic continuation missing');assert.ok(orchestrator.includes('result.majorHistory'),'major-history deterministic continuation missing');assert.ok(orchestrator.includes('result.fit'),'fit deterministic continuation missing');
assert.ok(orchestrator.includes('preserveResolvedFocus=false'),'confirmed-command focus preservation boundary missing');
assert.ok(orchestrator.includes('deterministicContinuation=Object.keys(executionContext.aiDeterministicToolResults).length>0'),'deterministic continuation detection missing');
assert.ok(orchestrator.includes('focus:stableFocus'),'resolved focus must survive deterministic continuation');
assert.ok(app.includes("tool.kind==='school_history'&&tool.url.startsWith('/api/ai/school-history?')"),'browser school-history tool contract missing');
assert.ok(app.includes('budget:48*1024'),'school-history bridge byte budget missing');
assert.ok(app.includes('compactSchoolHistoryFactPayload'), 'related-major suggestions must use the shared browser bridge');
assert.ok(factBridge.includes('majorSuggestions:Array.isArray(data.majorSuggestions)'), 'related-major suggestions must survive the shared bridge contract');
assert.ok(app.includes('AI_FACT_BRIDGE_CONTRACT_VERSION'), 'shared fact bridge version missing');
assert.ok(app.includes('compactSchoolHistoryFactPayload'), 'shared school-history bridge contract missing');
assert.ok(factBridge.includes('queryResults:Array.isArray(data.queryResults)'), 'per-query batch status must survive the shared browser bridge');
assert.ok(app.includes('beginViewportTransaction'), 'viewport transaction owner missing');
assert.ok(!app.includes('restoreViewportIntent'), 'legacy multi-owner viewport restore remains');
const html=fs.readFileSync('aiplus/index.html','utf8');
assert.ok(html.includes('data-ai-plus-assets="aiplus-assets-v002_1"'), 'AIPLuS asset cache version not refreshed');
assert.ok(html.includes('/aiplus/app.v3990_1.js?v=002_1'), 'AIPLuS app cache key not refreshed');
assert.ok(app.includes('Number(payload?.error_code)===1102'),'1102 detection missing');
assert.ok(app.includes('!error?.workerResourceLimit'),'1102 no-retry guard missing');
assert.ok(app.includes('SCHOOL_HISTORY_SESSION_CACHE_TTL_MS=5*60*1000'),'school-history session cache TTL missing');
assert.ok(app.includes('SCHOOL_HISTORY_SESSION_CACHE_MAX_ENTRIES=4'),'school-history session cache entry cap missing');
assert.ok(app.includes('schoolHistorySessionCache.get(tool.url)'),'school-history session cache must key by exact tool URL');
assert.ok(app.includes('const cached=readSchoolHistorySessionCache(tool);if(cached)return cached'),'school-history cache read must happen before network fetch');
assert.ok(app.includes('putSchoolHistorySessionCache(tool,entry);return entry'),'successful bounded school-history fact must enter session cache');


const manifest=JSON.parse(fs.readFileSync('fenxi/data/ln-rank-2026/manifest.json','utf8'));
const directory=JSON.parse(fs.readFileSync('shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json','utf8'));
const chunkFiles=new Set((manifest.chunks||[]).map(item=>item.file||item.path).filter(Boolean));
for(const school of directory.schools||[]){assert.ok(Array.isArray(school.chunkFiles2026)&&school.chunkFiles2026.length>0,`chunk locator missing: ${school.officialName}`);for(const file of school.chunkFiles2026)assert.ok(chunkFiles.has(file),`unknown chunk locator ${file}: ${school.officialName}`);}
const industrial=(directory.schools||[]).find(item=>item.officialName==='沈阳工业大学');
const aviation=(directory.schools||[]).find(item=>item.officialName==='沈阳航空航天大学');
const science=(directory.schools||[]).find(item=>item.officialName==='辽宁科技大学');
assert.ok(industrial?.chunkFiles2026?.length&&aviation?.chunkFiles2026?.length&&science?.chunkFiles2026?.length,'journey school chunk locators missing');
const provider=fs.readFileSync('functions/_lib/school-query-provider.v3969.js','utf8');
const manifestLoader=fs.readFileSync('functions/_lib/ln-rank-manifest.js','utf8');
const endpoint=fs.readFileSync('functions/api/school-majors.js','utf8');
const aiEndpoint=fs.readFileSync('functions/api/ai/school-history.js','utf8');
const aiSource=fs.readFileSync('functions/_lib/ai/school-history-fact-source.js','utf8');
const aiContract=fs.readFileSync('functions/_lib/ai/school-history-fact-contract.js','utf8');
const health=fs.readFileSync('functions/api/ai/health.js','utf8');
assert.ok(provider.includes('chunkFiles2026: Object.freeze'),'exact school provider must expose chunk locator');
assert.ok(manifestLoader.includes('loadMatchingRecordsFromFiles'),'bounded manifest loader missing');
assert.ok(manifestLoader.includes('loadExactSchoolRecordsFromFiles'),'exact-school native loader missing');
assert.ok(manifestLoader.includes("mode: 'record-stream'"),'matching loader must stream individual records');
assert.ok(manifestLoader.includes("mode: 'exact-school-native-text-scan'"),'exact-school native text scan marker missing');
assert.ok(manifestLoader.includes('EXACT_SCHOOL_CACHE_TTL_MS = 45 * 1000'),'exact-school server cache TTL missing');
assert.ok(manifestLoader.includes('EXACT_SCHOOL_CACHE_MAX_ENTRIES = 8'),'exact-school server cache entry cap missing');
assert.ok(manifestLoader.includes('EXACT_SCHOOL_CACHE_MAX_RECORDS = 800'),'exact-school server cache record cap missing');
assert.ok(endpoint.includes('chunkFiles2026.length')&&endpoint.includes('loadExactSchoolRecordsFromFiles'),'school-majors must use exact-school native chunk loader');
assert.ok(aiEndpoint.includes("from '../../_lib/ai/school-history-fact-source.js'"),'AIPLuS endpoint must delegate to one fact-source contract');
assert.ok(aiSource.includes("from './school-history-fact-contract.js'"),'AIPLuS fact source must use the central contract');
assert.ok(aiContract.includes("'/data/zy2026/school-index.json'"),'AIPLuS school index path missing');
assert.ok(aiContract.includes("'/data/zy2026/chunks/'"),'AIPLuS school shard path missing');
assert.ok(aiContract.includes('AI_SCHOOL_HISTORY_MAX_RECORDS = 120'),'AIPLuS all-school record cap drift');
assert.ok(aiContract.includes('AI_SCHOOL_HISTORY_SOURCE_TOTAL_RECORDS = 11628'),'AIPLuS source record identity drift');
assert.equal(aiSource.includes('ln-rank-manifest.js'),false,'AIPLuS school fact path must not cold-scan rank chunks');
assert.equal(aiSource.includes('school-query-provider'),false,'AIPLuS exact-school fact path must not build the full school resolver');
assert.ok(aiSource.includes('standard-major-mapper.js'),'AIPLuS fact path must share the canonical 883-major mapping contract');
assert.ok(aiSource.includes('SHARD_CACHE_MAX_ENTRIES = 4'),'AIPLuS school shard cache cap missing');
assert.ok(health.includes('AI_SCHOOL_HISTORY_FACT_CONTRACT'),'health must expose the active school-history resource contract without importing its runtime source');

async function verifyPartialSchoolHistoryBatch(){
  const context={request:new Request('https://preview.example/api/ai/turn'),aiDeterministicToolResults:{}};
  const first=await runSchoolMajorHistory(context,{school:'测试大学',majorKeywords:['机械','电气']});
  assert.equal(first.code,'client_tool_required','batch must request first deterministic fact');
  assert.match(first.toolRequest.url,/^\/api\/ai\/school-history\?/,'school batch must use the AIPLuS fact endpoint');
  const successPayload={ok:true,meta:{school:'测试大学'},records:[{id:'mechanical-1',school:'测试大学',major:'机械工程',score2026:500,rank2026:30000}],summary:{total:1,schoolCount:1,minScore:500,maxScore:500},source:{dataYear:2026}};
  context.aiDeterministicToolResults[first.toolRequest.key]={kind:'school_history',key:first.toolRequest.key,url:first.toolRequest.url,status:200,payload:successPayload};
  const second=await runSchoolMajorHistory(context,{school:'测试大学',majorKeywords:['机械','电气']});
  assert.equal(second.code,'client_tool_required','batch must continue to the next major after first success');
  context.aiDeterministicToolResults[second.toolRequest.key]={kind:'school_history',key:second.toolRequest.key,url:second.toolRequest.url,status:503,payload:{ok:false,code:'timeout',message:'电气查询暂时失败'}};
  const result=await runSchoolMajorHistory(context,{school:'测试大学',majorKeywords:['机械','电气']});
  assert.equal(result.ok,true,'partial batch must remain usable');
  assert.equal(result.partial,true,'partial batch flag missing');
  assert.equal(result.records.length,1,'successful major records must survive failed sibling query');
  assert.deepEqual(result.queryResults.map(item=>item.status),['success','failed'],'per-major status order drift');
  assert.equal(result.queryResults[1].errorCode,'timeout','failure provenance lost');
}
const rawChunkCache=new Map();
function chunkRows(file){if(rawChunkCache.has(file))return rawChunkCache.get(file);const data=JSON.parse(fs.readFileSync(`fenxi/${file}`,'utf8')),rows=Array.isArray(data)?data:(Array.isArray(data.records)?data.records:[]);rawChunkCache.set(file,rows);return rows;}

function verifyPreaggregatedTruthSet(){
  const index=JSON.parse(fs.readFileSync('data/zy2026/school-index.json','utf8')),byName=new Map(Object.values(index.schools||{}).map(item=>[item.name,item])),shards=new Map();
  const shardFor=file=>{if(!shards.has(file))shards.set(file,JSON.parse(fs.readFileSync(`data/zy2026/chunks/${file}`,'utf8')));return shards.get(file);};
  let checked=0,maxSchool=null;
  for(const school of directory.schools||[]){
    const info=byName.get(school.officialName)||(school.admissionNames||[]).map(name=>byName.get(name)).find(Boolean);
    assert.ok(info,`preaggregated school index missing: ${school.officialName}`);
    const compact=(shardFor(info.chunk)?.schools?.[info.key]?.relations||[]).flatMap(relation=>relation.records2026||[]);
    const accepted=new Set([school.officialName,...(school.admissionNames||[])]),raw=school.chunkFiles2026.flatMap(chunkRows).filter(record=>accepted.has(String(rawSchool(record)||'').trim()));
    assert.equal(compact.length,Number(school.recordCount2026),`preaggregated count drift: ${school.officialName}`);
    assert.deepEqual(new Set(compact.map(record=>record.uid)),new Set(raw.map(record=>record.id)),`preaggregated identity drift: ${school.officialName}`);
    checked+=1;if(!maxSchool||compact.length>maxSchool.count)maxSchool={name:school.officialName,count:compact.length};
  }
  assert.equal(checked,(directory.schools||[]).length,'not every 2026 admission school was checked');
  assert.equal(maxSchool.count,117,'current all-major maximum changed; revisit bridge budget and limit');
  assert.ok(maxSchool.count<=AI_SCHOOL_HISTORY_MAX_RECORDS,'AIPLuS school history limit truncates a school');
  return{checked,maxSchool,indexVersion:index.version};
}

async function verifyAiSchoolHistoryFactPath(){
  const requests=[];
  const aiEnv={ASSETS:{fetch:async request=>{const pathname=new URL(request.url).pathname,path=`.${pathname}`;assert.ok(fs.existsSync(path),`AIPLuS fact fixture missing: ${pathname}`);requests.push({pathname,bytes:fs.statSync(path).size});return new Response(fs.readFileSync(path),{status:200,headers:{'content-type':'application/json'}});}}};
  const context={request:new Request('https://preview.example/api/ai/school-history'),env:aiEnv};
  clearAiSchoolHistoryFactCacheForTest();
  const response=await schoolHistoryOnRequest({...context,request:new Request('https://preview.example/api/ai/school-history?school=%E6%B2%88%E9%98%B3%E5%B7%A5%E4%B8%9A%E5%A4%A7%E5%AD%A6&offset=0&limit=120&sort=score-desc')});
  assert.equal(response.status,200,'AIPLuS exact-school endpoint failed');
  const industrialPayload=await response.json();
  assert.equal(industrialPayload.records.length,65,'沈阳工业 all-major truth set unexpectedly tiny');
  assert.equal(industrialPayload.meta.schoolRecordTotal,65,'沈阳工业 source count drift');
  assert.equal(industrialPayload.source.mode,'ai-school-history-preaggregated-school-shard');
  assert.equal(industrialPayload.source.sameTruthSet,true);
  assert.deepEqual(requests.map(item=>item.pathname),['/data/zy2026/school-index.json','/data/zy2026/chunks/school-06.json'],'cold query must read one index and one school shard only');
  const coldAssetBytes=requests.reduce((sum,item)=>sum+item.bytes,0);
  assert.ok(coldAssetBytes<1.5*1024*1024,'cold school fact path exceeded the bounded asset budget');

  clearAiSchoolHistoryFactCacheForTest();requests.length=0;
  const [mechanical,instrumentation,materials]=await Promise.all([
    queryAiSchoolHistoryFact(context,{school:'沈阳航空航天大学',majorKeyword:'机械'}),
    queryAiSchoolHistoryFact(context,{school:'沈阳航空航天大学',majorKeyword:'测控技术与仪器'}),
    queryAiSchoolHistoryFact(context,{school:'沈阳航空航天大学',majorKeyword:'材料'})
  ]);
  assert.equal(mechanical.records.length,8,'spoken mechanical family did not expand against the shared major catalog');
  assert.equal(instrumentation.records.length,1,'canonical instrumentation major did not resolve');
  assert.equal(materials.records.length,4,'spoken materials family did not resolve through the shared major catalog');
  assert.equal(requests.filter(item=>item.pathname==='/data/zy2026/school-index.json').length,1,'concurrent fact queries did not coalesce the school index');
  assert.equal(requests.filter(item=>item.pathname==='/data/zy2026/chunks/school-14.json').length,1,'concurrent same-school fact queries did not coalesce the shard');

  const fit=await queryAiSchoolHistoryFact(context,{school:'沈阳航空航天大学',majorKeyword:'机械',candidateScore:560,sort:'position-near'});
  assert.equal(fit.meta.candidateReferenceRank2026,27783,'candidate rank bridge drift');
  assert.ok(fit.summary.nearestRecord?.major,'candidate fit nearest record missing');
  const sino=await queryAiSchoolHistoryFact(context,{school:'沈阳大学'});
  assert.ok(sino.records.some(record=>record.projectLabel==='中外合作/高收费'&&record.isSinoForeign),'Sino/high-fee project classification missing');
  const largest=await queryAiSchoolHistoryFact(context,{school:'沈阳农业大学',limit:120});
  assert.equal(largest.records.length,117,'all-major fact bridge truncated the largest current school');
  assert.equal(compactSchoolHistoryFactPayload(largest).records.length,117,'browser fact bridge truncated the largest current school');
  assert.ok(Buffer.byteLength(JSON.stringify(compactSchoolHistoryFactPayload(largest)))<48*1024,'complete largest-school payload exceeds browser bridge budget');
  const state=aiSchoolHistoryFactCacheState();
  assert.equal(state.ttlMs,5*60*1000,'AIPLuS fact cache TTL drift');
  assert.equal(state.indexMaxEntries,1,'AIPLuS index cache cap drift');
  assert.equal(state.shardMaxEntries,4,'AIPLuS shard cache cap drift');
  assert.equal(state.bounded,true,'AIPLuS fact caches must remain bounded');
  return{coldAssetBytes,largestSchoolRecords:largest.records.length};
}

async function runActualSchoolHistoryTurn({workspace,input,env}){
  const turnRequest=new Request('https://preview.example/api/ai/turn',{method:'POST'});
  const command=deterministicCommand(input,workspace);
  const pending=await orchestrateAiTurn({request:turnRequest,env},{input,workspace,confirmedCommand:command});
  assert.equal(pending.pendingDeterministicTool,true,`parent journey did not request deterministic facts: ${input}`);
  assert.ok(pending.toolRequests.length>=1,`parent journey did not emit a fact batch: ${input}`);
  const deterministicToolResults={};
  for(const toolRequest of pending.toolRequests){
    assert.equal(toolRequest.kind,'school_history',`unexpected parent journey tool: ${toolRequest.kind}`);
    const response=await schoolHistoryOnRequest({request:new Request(new URL(toolRequest.url,turnRequest.url)),env});
    const rawPayload=await response.json();
    const payload=compactSchoolHistoryFactPayload(rawPayload);
    assert.ok(Buffer.byteLength(JSON.stringify(payload))<48*1024,`parent journey fact bridge exceeded 48 KiB: ${toolRequest.url}`);
    deterministicToolResults[toolRequest.key]={kind:toolRequest.kind,key:toolRequest.key,url:toolRequest.url,status:response.status,payload};
  }
  const completed=await orchestrateAiTurn({request:turnRequest,env},{input,workspace,confirmedCommand:pending.command,deterministicToolResults});
  assert.equal(completed.ok,true,`parent journey failed: ${input}`);
  assert.equal(completed.pendingDeterministicTool,false,`parent journey did not converge: ${input}`);
  assert.equal(completed.result?.answerStatus,'answered',`parent journey did not produce a primary answer: ${input}`);
  let nextWorkspace=applyAiWorkspaceEvent(workspace,completed.event);
  nextWorkspace=applyAiWorkspaceEvent(nextWorkspace,{type:'result_committed',payload:{taskId:nextWorkspace.mainTaskId,result:completed.result,turn:completed.turnRecord}});
  return{command,pending,completed,workspace:nextWorkspace};
}

async function verifyActualParentJourneys(){
  const env={ASSETS:{fetch:async request=>{const pathname=new URL(request.url).pathname,path=`.${pathname}`;assert.ok(fs.existsSync(path),`parent journey fixture missing: ${pathname}`);return new Response(fs.readFileSync(path),{status:200,headers:{'content-type':'application/json'}});}}};
  clearAiSchoolHistoryFactCacheForTest();
  const multi=await runActualSchoolHistoryTurn({
    workspace:createAiWorkspace(),
    input:'沈阳航空航天大学机械多少分 电气多少分 测控多少分 材料多少分',
    env
  });
  assert.deepEqual(multi.command.majorKeywords,['机械','电气','测控技术与仪器','材料'],'natural repeated questions must become one four-major batch');
  assert.equal(multi.completed.result.history.queryResults.length,4,'four-major batch status missing');
  assert.ok(multi.completed.result.history.queryResults.every(item=>item.status==='success'&&item.recordCount>0),'four-major batch must return usable records for every requested major');
  assert.ok(multi.completed.blocks.some(block=>block.type==='history_records'),'four-major parent answer must render a scan-friendly history block');

  const compactCompound=await runActualSchoolHistoryTurn({
    workspace:createAiWorkspace(),
    input:'沈阳航空航天大学机械测控与材料多少分',
    env
  });
  assert.deepEqual(compactCompound.command.majorKeywords,['机械','测控技术与仪器','材料'],'compact spoken majors must split before fact lookup');
  assert.deepEqual(compactCompound.completed.result.history.queryResults.map(item=>item.recordCount),[8,1,4],'compact spoken-major fact counts drift');

  const allMajors=await runActualSchoolHistoryTurn({
    workspace:createAiWorkspace(),
    input:'沈阳工业大学所有专业最低分',
    env
  });
  assert.equal(allMajors.command.agentTask,'school_history');
  assert.equal(allMajors.completed.result.history.total,65,'all-major parent journey returned an incomplete school');
  assert.equal(allMajors.completed.result.history.meta.pagination?.hasMore,false,'all-major parent journey silently paginated the school');

  const excludeSino=await runActualSchoolHistoryTurn({workspace:allMajors.workspace,input:'去掉中外',env});
  assert.equal(excludeSino.command.bottomLineMode,'exclude_sino','natural follow-up did not preserve the prior school while changing project scope');
  assert.equal(excludeSino.completed.result.history.school,'沈阳工业大学','natural project-scope follow-up lost the school focus');
  assert.equal(excludeSino.completed.result.history.total,64,'natural project-scope follow-up did not remove exactly the Sino/high-fee record');
  assert.ok(excludeSino.completed.result.history.records.every(record=>record.projectLabel!=='中外合作/高收费'),'excluded project leaked into the follow-up answer');
  return{fourMajorQueries:multi.completed.result.history.queryResults.length,compactMajorCounts:compactCompound.completed.result.history.queryResults.map(item=>item.recordCount),allMajorRecords:allMajors.completed.result.history.total,withoutSinoRecords:excludeSino.completed.result.history.total};
}

async function verifyPublicMajorFilterParity(){
  const asset=async request=>{const pathname=new URL(typeof request==='string'?request:request.url).pathname,path=`.${pathname}`;return fs.existsSync(path)?new Response(fs.readFileSync(path),{status:200,headers:{'content-type':'application/json'}}):new Response(`missing ${pathname}`,{status:404});};
  const env={ASSETS:{fetch:asset}},previousFetch=globalThis.fetch,matrix=[
    ['沈阳航空航天大学','机械'],['沈阳航空航天大学','测控技术与仪器'],['沈阳航空航天大学','材料'],['沈阳航空航天大学','电气'],
    ['沈阳工业大学',''],['沈阳工业大学','电气工程及其自动化'],['沈阳工业大学','化工'],['辽宁科技大学','机械']
  ];
  globalThis.fetch=asset;clearAiSchoolHistoryFactCacheForTest();
  try{
    for(const [school,majorKeyword] of matrix){
      const query=new URLSearchParams({school,schoolIntent:'school',offset:'0',limit:'100',sort:'score-desc'});if(majorKeyword)query.set('majorKeyword',majorKeyword);
      const [publicResponse,aiResponse]=await Promise.all([
        publicSchoolMajorsOnRequest({request:new Request(`https://preview.example/api/school-majors?${query}`),env}),
        schoolHistoryOnRequest({request:new Request(`https://preview.example/api/ai/school-history?${query}`),env})
      ]);
      assert.equal(publicResponse.status,200,`public major filter fixture failed: ${school} ${majorKeyword}`);assert.equal(aiResponse.status,200,`AIPLuS major filter fixture failed: ${school} ${majorKeyword}`);
      const [publicPayload,aiPayload]=await Promise.all([publicResponse.json(),aiResponse.json()]),ids=payload=>[...new Set((payload.records||[]).map(record=>record.id))].sort();
      assert.deepEqual(ids(aiPayload),ids(publicPayload),`shared major filter meaning drift: ${school} ${majorKeyword}`);
    }
  }finally{globalThis.fetch=previousFetch;}
  return{queries:matrix.length,schools:new Set(matrix.map(item=>item[0])).size};
}

const preaggregated=verifyPreaggregatedTruthSet();
const aiFactPath=await verifyAiSchoolHistoryFactPath();
const parentJourneys=await verifyActualParentJourneys();
const majorFilterParity=await verifyPublicMajorFilterParity();
const expectedIndustrial=industrial.chunkFiles2026.flatMap(chunkRows).filter(raw=>String(rawSchool(raw)||'').trim()==='沈阳工业大学');
const expectedScanned=industrial.chunkFiles2026.reduce((sum,file)=>sum+chunkRows(file).length,0);
const originalFetch=globalThis.fetch;
globalThis.fetch=async input=>{
  const url=new URL(typeof input==='string'?input:input.url);
  if(url.pathname==='/fenxi/data/ln-rank-2026/manifest.json')return new Response(fs.readFileSync('fenxi/data/ln-rank-2026/manifest.json'),{status:200,headers:{'content-type':'application/json'}});
  throw new Error(`unexpected network fetch in streaming verifier: ${url.pathname}`);
};
let assetFetchCount=0;
const env={ASSETS:{fetch:async request=>{assetFetchCount+=1;
  const url=new URL(request.url);
  const relative=url.pathname.replace(/^\/fenxi\//,'');
  const path=`fenxi/${relative}`;
  assert.ok(fs.existsSync(path),`stream fixture missing: ${path}`);
  const response=new Response(Readable.toWeb(fs.createReadStream(path,{highWaterMark:509})),{status:200,headers:{'content-type':'application/json'}});
  Object.defineProperty(response,'json',{value:async()=>{throw new Error(`chunk response.json forbidden: ${relative}`);}});
  return response;
}}};
try{
  clearExactSchoolRecordCacheForTest();
  const request=new Request('https://preview.example/api/school-majors');
  const streamed=await loadMatchingRecordsFromFiles(request,env,industrial.chunkFiles2026,raw=>String(rawSchool(raw)||'').trim()==='沈阳工业大学');
  assert.equal(streamed.scanned,expectedScanned,'streaming locator scanned-count drift');
  assert.deepEqual(streamed.records,expectedIndustrial,'streaming exact-school truth set drift');
  assert.equal(streamed.records.length,Number(industrial.recordCount2026),'streaming exact-school record count drift');
  for(const schoolEntry of [industrial,aviation,science]){
    const accepted=new Set([schoolEntry.officialName,...(schoolEntry.admissionNames||[])]);
    const expected=schoolEntry.chunkFiles2026.flatMap(chunkRows).filter(raw=>accepted.has(String(rawSchool(raw)||'').trim()));
    const exact=await loadExactSchoolRecordsFromFiles(request,env,schoolEntry.chunkFiles2026,[...(schoolEntry.admissionNames||[]),schoolEntry.officialName],raw=>accepted.has(String(rawSchool(raw)||'').trim()));
    assert.deepEqual(exact.records,expected,`native exact-school truth set drift: ${schoolEntry.officialName}`);
    assert.equal(exact.records.length,Number(schoolEntry.recordCount2026),`native exact-school record count drift: ${schoolEntry.officialName}`);
    assert.ok(exact.modes.length===schoolEntry.chunkFiles2026.length&&exact.modes.every(mode=>mode==='exact-school-native-text-scan'),`native exact-school fast path did not hold: ${schoolEntry.officialName} ${exact.modes.join(',')}`);
  if(schoolEntry===industrial){
    const beforeCacheHitFetches=assetFetchCount;
    const cached=await loadExactSchoolRecordsFromFiles(request,env,schoolEntry.chunkFiles2026,[...(schoolEntry.admissionNames||[]),schoolEntry.officialName],raw=>accepted.has(String(rawSchool(raw)||'').trim()));
    assert.equal(cached.cacheStatus,'hit','second exact-school read must hit bounded server cache');
    assert.equal(assetFetchCount,beforeCacheHitFetches,'exact-school cache hit must not fetch chunk asset again');
    assert.deepEqual(cached.records,expected,'exact-school cache hit truth set drift');
    assert.notEqual(cached.records,exact.records,'cache hit must return a fresh records array');
    const cacheState=exactSchoolRecordCacheState();
    assert.equal(cacheState.ttlMs,45000,'exact-school cache TTL drift');
    assert.equal(cacheState.maxEntries,8,'exact-school cache entry cap drift');
    assert.equal(cacheState.maxRecords,800,'exact-school cache record cap drift');
    assert.equal(cacheState.bounded,true,'exact-school cache must remain bounded');
  }
}
const allFiles=[...chunkFiles];
  const fullScan=await loadMatchingRecordsFromFiles(request,env,allFiles,()=>false);
  assert.equal(fullScan.scanned,Number(manifest.totalRecords),'stream parser must consume all 2026 source records without loss');
  assert.equal(fullScan.records.length,0,'false predicate must not retain source rows');
}finally{
  globalThis.fetch=originalFetch;
}

await verifyPartialSchoolHistoryBatch();
console.log(JSON.stringify({ok:true,checks:['isolated-aiplus-school-history-fact-source','956-school-preaggregated-truth-set-equal','one-index-one-shard-cold-path','concurrent-same-school-fetch-coalescing','complete-117-record-school','48k-complete-school-bridge-budget','actual-four-major-parent-journey','actual-compact-major-parent-journey','actual-all-major-parent-journey','actual-exclude-sino-follow-up','shared-major-filter-parity','spoken-and-canonical-major-matching','candidate-fit-position','sino-project-classification','history-fit-continuation','1102-no-retry','record-stream-no-response-json','stream-truth-set-equal','exact-school-native-text-scan-truth-set-equal','bounded-exact-school-server-cache','bounded-aiplus-school-fact-cache','bounded-school-history-session-cache'],preaggregated,aiFactPath,parentJourneys,majorFilterParity,streamedSchools:['沈阳工业大学','沈阳航空航天大学','辽宁科技大学'],sourceRecords:manifest.totalRecords},null,2));
