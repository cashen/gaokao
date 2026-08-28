import fs from 'node:fs';
import assert from 'node:assert/strict';
import { loadSchoolRuntimeRecords, schoolRuntimeProjectionCachePolicy } from '../functions/_lib/school-record-runtime-provider.vnext.js';
import { clearSchoolQueryProviderCacheForTest } from '../functions/_lib/school-query-provider.v3969.js';
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

const SCHOOL_IDENTITY_PATH='/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json';
const SCHOOL_INDEX_PATH='/data/zy2026/school-index.json';
const SCHOOL_SHARD_RE=/^\/data\/zy2026\/chunks\/school-\d{2}\.json$/;
const read=path=>fs.readFileSync(path,'utf8');
const tool=read('functions/_lib/ai/tool-registry.js');
const orchestrator=read('functions/_lib/ai/turn-orchestrator.js');
const app=read('aiplus/app.v3990_2.js');
const factBridge=read('shared/ai/ai-workspace-contract.v3992_0.js');
const provider=read('functions/_lib/school-query-provider.v3969.js');
const manifestLoader=read('functions/_lib/ln-rank-manifest.js');
const runtimeProvider=read('functions/_lib/school-record-runtime-provider.vnext.js');
const endpoint=read('functions/api/school-majors.js');
const aiEndpoint=read('functions/api/ai/school-history.js');
const aiSource=read('functions/_lib/ai/school-history-fact-source.js');
const aiContract=read('functions/_lib/ai/school-history-fact-contract.js');
const health=read('functions/api/ai/health.js');
const html=read('aiplus/index.html');

assert.ok(!/import\s+\{[^}]*queryAiSchoolHistory[^}]*\}\s+from\s+['"]\.\/school-history-adapter\.js['"]/.test(tool),'AI base graph must not statically import school-history-adapter');
assert.ok(tool.includes("kind:'school_history'"),'school history deterministic tool kind missing');
assert.ok(tool.includes("new URL('/api/ai/school-history'"),'school history must use the bounded AIPLuS fact bridge');
assert.ok(tool.includes("url.searchParams.set('limit','120')"),'school history must return the complete largest current school record set');
assert.ok(tool.includes('normalizedScore=normalizeOptionalCandidateScore(candidateScore)'),'school history must preserve null candidate score');
assert.ok(tool.includes("normalizedScore===null?'score-desc':'position-near'"),'school history null score sort boundary missing');
assert.ok(tool.includes('majorKeywords=[]')&&tool.includes('queryResults.push')&&tool.includes('partial,allFailed'),'school history batch contract drift');
assert.ok(tool.includes('AI_FACT_BRIDGE_CONTRACT_VERSION'),'server tool registry must use shared fact bridge version');
assert.ok(factBridge.includes("AI_FACT_BRIDGE_CONTRACT_VERSION='ai-fact-bridge-v3992_10'"),'shared fact bridge version drift');
assert.ok(factBridge.includes('data.records.slice(0,120)'),'school history bridge must not truncate the 117-record maximum school');
assert.ok(factBridge.includes('queryErrorMessage')&&factBridge.includes('queryResults:Array.isArray(data.queryResults)'),'shared fact bridge provenance/status drift');
assert.ok(orchestrator.includes('majorKeywords:focus.majors'),'orchestrator must pass multiple major keywords without joining them');
assert.ok(orchestrator.includes('result.history')&&orchestrator.includes('result.majorHistory')&&orchestrator.includes('result.fit'),'deterministic continuation owners missing');
assert.ok(orchestrator.includes('deterministicResolvedCommand')&&orchestrator.includes('confirmed=await validateConfirmedCommand'),'confirmed-command canonical resolver missing');
assert.ok(orchestrator.includes('return{...fallback,semanticFrame:null')&&!orchestrator.includes('...fallback,...value'),'client command must not overwrite server semantics');
assert.ok(app.includes("tool.kind==='school_history'&&tool.url.startsWith('/api/ai/school-history?')"),'browser school-history tool contract missing');
assert.ok(app.includes('budget:48*1024')&&app.includes('compactSchoolHistoryFactPayload'),'browser fact bridge budget/compaction drift');
assert.ok(app.includes('beginViewportTransaction')&&!app.includes('restoreViewportIntent'),'single viewport owner drift');
assert.ok(html.includes('data-ai-plus-assets="aiplus-assets-v002_4"')&&html.includes('/aiplus/app.v3990_2.js?v=002_4'),'AIPLuS asset identity drift');
assert.ok(app.includes('Number(payload?.error_code)===1102')&&app.includes('!error?.workerResourceLimit'),'1102 no-retry guard missing');
assert.ok(app.includes('SCHOOL_HISTORY_SESSION_CACHE_TTL_MS=5*60*1000')&&app.includes('SCHOOL_HISTORY_SESSION_CACHE_MAX_ENTRIES=4'),'browser school-history cache bounds drift');
assert.ok(app.includes('schoolHistorySessionCache.get(tool.url)')&&app.includes('putSchoolHistorySessionCache(tool,entry);return entry'),'browser session cache owner drift');

assert.ok(provider.includes('chunkFiles2026: Object.freeze'),'school query directory must keep build-time chunk provenance');
assert.ok(provider.includes('source?.env?.ASSETS?.fetch'),'canonical school identity provider must prefer deployment ASSETS');
assert.ok(provider.includes('function loadCached'),'canonical school identity provider must coalesce cold asset reads');
assert.ok(provider.includes("'deployment-assets' : 'origin-fetch'"),'school identity cache must separate deployment assets from origin fallback');
assert.equal(manifestLoader.includes('loadAllRecords'),false,'production manifest loader must not expose full admissions loading');
assert.ok(runtimeProvider.includes("SCHOOL_RUNTIME_PROJECTION_VERSION = 'ln-rank-school-runtime-projection-vnext-100-shard-v1'"),'school runtime projection version missing');
assert.ok(runtimeProvider.includes('SCHOOL_RUNTIME_PROJECTION_TOTAL_RECORDS = 11628'),'school runtime projection truth count drift');
assert.ok(runtimeProvider.includes('SCHOOL_RUNTIME_PROJECTION_SCHOOL_COUNT = 956'),'school runtime projection school count drift');
assert.ok(runtimeProvider.includes('SCHOOL_RUNTIME_PROJECTION_SHARD_COUNT = 100'),'school runtime projection shard count drift');
assert.ok(runtimeProvider.includes('INDEX_CACHE_MAX_ENTRIES = 1')&&runtimeProvider.includes('SHARD_CACHE_MAX_ENTRIES = 4'),'school runtime bounded cache drift');
assert.ok(endpoint.includes('school-record-runtime-provider.vnext.js')&&endpoint.includes('loadSchoolRuntimeRecords'),'school-majors must use bounded school runtime projection');
assert.ok(endpoint.includes("mode: 'school-runtime-projection-vnext'"),'school-majors source mode must expose bounded projection ownership');
assert.equal(endpoint.includes('loadExactSchoolRecordsFromFiles'),false,'school-majors must not fall back to legacy rank chunk exact scan');
assert.equal(endpoint.includes('loadMatchingRecords('),false,'school-majors must not fall back to full matching scan');
assert.ok(aiEndpoint.includes("from '../../_lib/ai/school-history-fact-source.js'"),'AIPLuS endpoint must delegate to one fact-source contract');
assert.ok(aiSource.includes("from './school-history-fact-contract.js'"),'AIPLuS fact source must use central contract');
assert.ok(aiSource.includes("from '../school-query-provider.v3969.js'"),'AIPLuS exact-school identity must reuse canonical provider');
assert.ok(aiSource.includes('resolveExactAdmissionSchool(context, schoolInput)'),'AIPLuS school identity must bind to Cloudflare context');
assert.ok(aiSource.includes('getAdmissionSchoolDirectoryMeta(context)'),'AIPLuS directory provenance must bind to same context');
assert.ok(aiSource.includes("identityOwner: 'school-query-provider.v3969'"),'AIPLuS school identity provenance missing');
assert.equal(aiSource.includes('function findExactSchool'),false,'AIPLuS must not recreate exact-school resolver');
assert.equal(aiSource.includes('function normalizeSchool('),false,'AIPLuS must not recreate school-name normalization');
assert.equal(aiSource.includes('const indexCache'),false,'AIPLuS must not own a second school index cache');
assert.equal(aiSource.includes('const shardCache'),false,'AIPLuS must not own a second school shard cache');
assert.ok(aiContract.includes("'/data/zy2026/school-index.json'")&&aiContract.includes("'/data/zy2026/chunks/'"),'AIPLuS projection paths drift');
assert.ok(aiContract.includes('AI_SCHOOL_HISTORY_MAX_RECORDS = 120')&&aiContract.includes('AI_SCHOOL_HISTORY_SOURCE_TOTAL_RECORDS = 11628'),'AIPLuS school fact limits/truth identity drift');
assert.equal(aiSource.includes('ln-rank-manifest.js'),false,'AIPLuS school fact path must not cold-scan rank chunks');
assert.ok(aiSource.includes('standard-major-mapper.js'),'AIPLuS fact path must share canonical 883-major mapping');
assert.ok(health.includes('AI_SCHOOL_HISTORY_FACT_CONTRACT'),'health must expose active school-history contract');

const manifest=JSON.parse(read('fenxi/data/ln-rank-2026/manifest.json'));
const directory=JSON.parse(read('shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json'));
const chunkFiles=new Set((manifest.chunks||[]).map(item=>item.file||item.path).filter(Boolean));
for(const school of directory.schools||[]){
  assert.ok(Array.isArray(school.chunkFiles2026)&&school.chunkFiles2026.length>0,`chunk locator missing: ${school.officialName}`);
  for(const file of school.chunkFiles2026)assert.ok(chunkFiles.has(file),`unknown chunk locator ${file}: ${school.officialName}`);
}
const industrial=(directory.schools||[]).find(item=>item.officialName==='沈阳工业大学');
const aviation=(directory.schools||[]).find(item=>item.officialName==='沈阳航空航天大学');
const science=(directory.schools||[]).find(item=>item.officialName==='辽宁科技大学');
assert.ok(industrial?.chunkFiles2026?.length&&aviation?.chunkFiles2026?.length&&science?.chunkFiles2026?.length,'journey school chunk locators missing');

function localAsset(request){
  const pathname=new URL(typeof request==='string'?request:request.url).pathname;
  const path=`.${pathname}`;
  return fs.existsSync(path)
    ? new Response(fs.readFileSync(path),{status:200,headers:{'content-type':'application/json; charset=utf-8'}})
    : new Response(`missing ${pathname}`,{status:404});
}
function countPath(requests,matcher){return requests.filter(item=>typeof matcher==='string'?item.pathname===matcher:matcher.test(item.pathname)).length;}

const rawChunkCache=new Map();
function chunkRows(file){
  if(rawChunkCache.has(file))return rawChunkCache.get(file);
  const data=JSON.parse(read(`fenxi/${file}`));
  const rows=Array.isArray(data)?data:(Array.isArray(data.records)?data.records:[]);
  rawChunkCache.set(file,rows);
  return rows;
}
function verifyPreaggregatedTruthSet(){
  const index=JSON.parse(read('data/zy2026/school-index.json'));
  const byName=new Map(Object.values(index.schools||{}).map(item=>[item.name,item]));
  const shards=new Map();
  const shardFor=file=>{if(!shards.has(file))shards.set(file,JSON.parse(read(`data/zy2026/chunks/${file}`)));return shards.get(file);};
  let checked=0,maxSchool=null;
  for(const school of directory.schools||[]){
    const info=byName.get(school.officialName)||(school.admissionNames||[]).map(name=>byName.get(name)).find(Boolean);
    assert.ok(info,`preaggregated school index missing: ${school.officialName}`);
    const compact=(shardFor(info.chunk)?.schools?.[info.key]?.relations||[]).flatMap(relation=>relation.records2026||[]);
    const accepted=new Set([school.officialName,...(school.admissionNames||[])]);
    const raw=school.chunkFiles2026.flatMap(chunkRows).filter(record=>accepted.has(String(rawSchool(record)||'').trim()));
    assert.equal(compact.length,Number(school.recordCount2026),`preaggregated count drift: ${school.officialName}`);
    assert.deepEqual(new Set(compact.map(record=>record.uid)),new Set(raw.map(record=>record.id)),`preaggregated identity drift: ${school.officialName}`);
    checked+=1;
    if(!maxSchool||compact.length>maxSchool.count)maxSchool={name:school.officialName,count:compact.length};
  }
  assert.equal(checked,(directory.schools||[]).length,'not every 2026 admission school was checked');
  assert.equal(maxSchool.count,117,'current all-major maximum changed; revisit bridge budget and limit');
  assert.ok(maxSchool.count<=AI_SCHOOL_HISTORY_MAX_RECORDS,'AIPLuS school history limit truncates a school');
  return{checked,maxSchool,indexVersion:index.version};
}

async function verifyAiSchoolHistoryFactPath(){
  const requests=[];
  const aiEnv={ASSETS:{fetch:async request=>{
    const pathname=new URL(request.url).pathname,path=`.${pathname}`;
    assert.ok(fs.existsSync(path),`AIPLuS fact fixture missing: ${pathname}`);
    requests.push({pathname,bytes:fs.statSync(path).size});
    return new Response(fs.readFileSync(path),{status:200,headers:{'content-type':'application/json'}});
  }}};
  const context={request:new Request('https://preview.example/api/ai/school-history'),env:aiEnv};
  const previousFetch=globalThis.fetch;
  globalThis.fetch=localAsset;
  clearSchoolQueryProviderCacheForTest();
  clearAiSchoolHistoryFactCacheForTest();
  try{
    const response=await schoolHistoryOnRequest({...context,request:new Request('https://preview.example/api/ai/school-history?school=%E6%B2%88%E9%98%B3%E5%B7%A5%E4%B8%9A%E5%A4%A7%E5%AD%A6&offset=0&limit=120&sort=score-desc')});
    assert.equal(response.status,200,'AIPLuS exact-school endpoint failed');
    const payload=await response.json();
    assert.equal(payload.records.length,65,'沈阳工业 all-major truth set unexpectedly tiny');
    assert.equal(payload.meta.schoolRecordTotal,65,'沈阳工业 source count drift');
    assert.equal(payload.meta.admissionDirectorySourceHash,directory.sourceHash,'AIPLuS school identity directory hash drift');
    assert.equal(payload.source.mode,'ai-school-history-preaggregated-school-shard');
    assert.equal(payload.source.identityOwner,'school-query-provider.v3969');
    assert.equal(payload.source.sameTruthSet,true);
    assert.equal(countPath(requests,SCHOOL_IDENTITY_PATH),1,'cold fact query must read canonical identity directory exactly once');
    assert.equal(countPath(requests,SCHOOL_INDEX_PATH),1,'cold fact query must read runtime school index exactly once');
    assert.equal(countPath(requests,SCHOOL_SHARD_RE),1,'cold fact query must read exactly one school shard');
    const runtimeAssetBytes=requests.filter(item=>item.pathname.startsWith('/data/zy2026/')).reduce((sum,item)=>sum+item.bytes,0);
    const identityDirectoryBytes=requests.filter(item=>item.pathname===SCHOOL_IDENTITY_PATH).reduce((sum,item)=>sum+item.bytes,0);
    assert.ok(runtimeAssetBytes<1.5*1024*1024,'cold school runtime path exceeded bounded asset budget');

    clearSchoolQueryProviderCacheForTest();
    clearAiSchoolHistoryFactCacheForTest();
    requests.length=0;
    const [mechanical,instrumentation,materials]=await Promise.all([
      queryAiSchoolHistoryFact(context,{school:'沈阳航空航天大学',majorKeyword:'机械'}),
      queryAiSchoolHistoryFact(context,{school:'沈阳航空航天大学',majorKeyword:'测控技术与仪器'}),
      queryAiSchoolHistoryFact(context,{school:'沈阳航空航天大学',majorKeyword:'材料'})
    ]);
    assert.equal(mechanical.records.length,8,'cold canonical school identity did not resolve spoken mechanical family');
    assert.equal(instrumentation.records.length,1,'cold canonical school identity did not resolve instrumentation');
    assert.equal(materials.records.length,4,'cold canonical school identity did not resolve materials');
    assert.equal(countPath(requests,SCHOOL_IDENTITY_PATH),1,'concurrent school facts must single-flight canonical identity directory');
    assert.equal(countPath(requests,SCHOOL_INDEX_PATH),1,'concurrent school facts must coalesce runtime school index');
    assert.equal(countPath(requests,SCHOOL_SHARD_RE),1,'concurrent same-school facts must coalesce one shard');

    const fit=await queryAiSchoolHistoryFact(context,{school:'沈阳航空航天大学',majorKeyword:'机械',candidateScore:560,sort:'position-near'});
    assert.equal(fit.meta.candidateReferenceRank2026,27783,'candidate rank bridge drift');
    assert.ok(fit.summary.nearestRecord?.major,'candidate fit nearest record missing');
    const sino=await queryAiSchoolHistoryFact(context,{school:'沈阳大学'});
    assert.ok(sino.records.some(record=>record.projectLabel==='中外合作/高收费'&&record.isSinoForeign),'Sino/high-fee project classification missing');
    const largest=await queryAiSchoolHistoryFact(context,{school:'沈阳农业大学',limit:120});
    assert.equal(largest.records.length,117,'all-major fact bridge truncated largest current school');
    assert.equal(compactSchoolHistoryFactPayload(largest).records.length,117,'browser fact bridge truncated largest current school');
    assert.ok(Buffer.byteLength(JSON.stringify(compactSchoolHistoryFactPayload(largest)))<48*1024,'complete largest-school payload exceeds browser bridge budget');
    const state=aiSchoolHistoryFactCacheState();
    assert.equal(state.ttlMs,5*60*1000,'AIPLuS fact cache TTL drift');
    assert.equal(state.indexMaxEntries,1,'AIPLuS index cache cap drift');
    assert.equal(state.shardMaxEntries,4,'AIPLuS shard cache cap drift');
    assert.equal(state.bounded,true,'AIPLuS fact caches must remain bounded');
    assert.equal(state.sharedWithSchoolRuntime,true,'AIPLuS fact cache must be canonical runtime cache');
    return{runtimeAssetBytes,identityDirectoryBytes,largestSchoolRecords:largest.records.length};
  }finally{
    globalThis.fetch=previousFetch;
    clearSchoolQueryProviderCacheForTest();
  }
}

async function verifyPartialSchoolHistoryBatch(){
  const context={request:new Request('https://preview.example/api/ai/turn'),aiDeterministicToolResults:{}};
  const first=await runSchoolMajorHistory(context,{school:'测试大学',majorKeywords:['机械','电气']});
  assert.equal(first.code,'client_tool_required','batch must request first deterministic fact');
  assert.match(first.toolRequest.url,/^\/api\/ai\/school-history\?/,'school batch must use AIPLuS fact endpoint');
  const successPayload={ok:true,meta:{school:'测试大学'},records:[{id:'mechanical-1',school:'测试大学',major:'机械工程',score2026:500,rank2026:30000}],summary:{total:1,schoolCount:1,minScore:500,maxScore:500},source:{dataYear:2026}};
  context.aiDeterministicToolResults[first.toolRequest.key]={kind:'school_history',key:first.toolRequest.key,url:first.toolRequest.url,status:200,payload:successPayload};
  const second=await runSchoolMajorHistory(context,{school:'测试大学',majorKeywords:['机械','电气']});
  assert.equal(second.code,'client_tool_required','batch must continue after first success');
  context.aiDeterministicToolResults[second.toolRequest.key]={kind:'school_history',key:second.toolRequest.key,url:second.toolRequest.url,status:503,payload:{ok:false,code:'timeout',message:'电气查询暂时失败'}};
  const result=await runSchoolMajorHistory(context,{school:'测试大学',majorKeywords:['机械','电气']});
  assert.equal(result.ok,true,'partial batch must remain usable');
  assert.equal(result.partial,true,'partial batch flag missing');
  assert.equal(result.records.length,1,'successful major records must survive failed sibling query');
  assert.deepEqual(result.queryResults.map(item=>item.status),['success','failed'],'per-major status order drift');
  assert.equal(result.queryResults[1].errorCode,'timeout','failure provenance lost');
}

async function runActualSchoolHistoryTurn({workspace,input,env}){
  const turnRequest=new Request('https://preview.example/api/ai/turn',{method:'POST'});
  const command=deterministicCommand(input,workspace);
  const pending=await orchestrateAiTurn({request:turnRequest,env},{input,workspace,confirmedCommand:command});
  assert.equal(pending.pendingDeterministicTool,true,`parent journey did not request deterministic facts: ${input}`);
  assert.ok(pending.toolRequests.length>=1,`parent journey emitted no fact batch: ${input}`);
  const deterministicToolResults={};
  for(const toolRequest of pending.toolRequests){
    assert.equal(toolRequest.kind,'school_history',`unexpected parent journey tool: ${toolRequest.kind}`);
    const response=await schoolHistoryOnRequest({request:new Request(new URL(toolRequest.url,turnRequest.url)),env});
    const rawPayload=await response.json();
    const payload=compactSchoolHistoryFactPayload(rawPayload);
    assert.ok(Buffer.byteLength(JSON.stringify(payload))<48*1024,`parent journey bridge exceeded 48 KiB: ${toolRequest.url}`);
    deterministicToolResults[toolRequest.key]={kind:toolRequest.kind,key:toolRequest.key,url:toolRequest.url,status:response.status,payload};
  }
  const completed=await orchestrateAiTurn({request:turnRequest,env},{input,workspace,confirmedCommand:pending.command,deterministicToolResults});
  assert.equal(completed.ok,true,`parent journey failed: ${input}`);
  assert.equal(completed.pendingDeterministicTool,false,`parent journey did not converge: ${input}`);
  assert.equal(completed.result?.answerStatus,'answered',`parent journey produced no primary answer: ${input}`);
  let nextWorkspace=applyAiWorkspaceEvent(workspace,completed.event);
  nextWorkspace=applyAiWorkspaceEvent(nextWorkspace,{type:'result_committed',payload:{taskId:nextWorkspace.mainTaskId,result:completed.result,turn:completed.turnRecord}});
  return{command,pending,completed,workspace:nextWorkspace};
}

async function verifyActualParentJourneys(){
  const env={ASSETS:{fetch:localAsset}},previousFetch=globalThis.fetch;
  globalThis.fetch=localAsset;
  clearSchoolQueryProviderCacheForTest();
  clearAiSchoolHistoryFactCacheForTest();
  try{
    const multi=await runActualSchoolHistoryTurn({workspace:createAiWorkspace(),input:'沈阳航空航天大学机械多少分 电气多少分 测控多少分 材料多少分',env});
    assert.deepEqual(multi.command.majorKeywords,['机械','电气','测控技术与仪器','材料'],'natural repeated questions must become one four-major batch');
    assert.equal(multi.completed.result.history.queryResults.length,4,'four-major batch status missing');
    assert.ok(multi.completed.result.history.queryResults.every(item=>item.status==='success'&&item.recordCount>0),'four-major batch must return usable records');
    assert.ok(multi.completed.blocks.some(block=>block.type==='history_records'),'four-major answer must render history block');
    const compact=await runActualSchoolHistoryTurn({workspace:createAiWorkspace(),input:'沈阳航空航天大学机械测控与材料多少分',env});
    assert.deepEqual(compact.command.majorKeywords,['机械','测控技术与仪器','材料'],'compact spoken majors must split before lookup');
    assert.deepEqual(compact.completed.result.history.queryResults.map(item=>item.recordCount),[8,1,4],'compact spoken-major fact counts drift');
    const all=await runActualSchoolHistoryTurn({workspace:createAiWorkspace(),input:'沈阳工业大学所有专业最低分',env});
    assert.equal(all.command.agentTask,'school_history');
    assert.equal(all.completed.result.history.total,65,'all-major parent journey incomplete');
    assert.equal(all.completed.result.history.meta.pagination?.hasMore,false,'all-major journey silently paginated');
    const exclude=await runActualSchoolHistoryTurn({workspace:all.workspace,input:'去掉中外',env});
    assert.equal(exclude.command.bottomLineMode,'exclude_sino','follow-up did not preserve project scope semantics');
    assert.equal(exclude.completed.result.history.school,'沈阳工业大学','follow-up lost school focus');
    assert.equal(exclude.completed.result.history.total,64,'follow-up did not remove exactly Sino/high-fee record');
    assert.ok(exclude.completed.result.history.records.every(record=>record.projectLabel!=='中外合作/高收费'),'excluded project leaked into answer');
    return{fourMajorQueries:multi.completed.result.history.queryResults.length,compactMajorCounts:compact.completed.result.history.queryResults.map(item=>item.recordCount),allMajorRecords:all.completed.result.history.total,withoutSinoRecords:exclude.completed.result.history.total};
  }finally{
    globalThis.fetch=previousFetch;
    clearSchoolQueryProviderCacheForTest();
  }
}

async function verifyPublicMajorFilterParity(){
  const env={ASSETS:{fetch:localAsset}},previousFetch=globalThis.fetch,matrix=[
    ['沈阳航空航天大学','机械'],['沈阳航空航天大学','测控技术与仪器'],['沈阳航空航天大学','材料'],['沈阳航空航天大学','电气'],
    ['沈阳工业大学',''],['沈阳工业大学','电气工程及其自动化'],['沈阳工业大学','化工'],['辽宁科技大学','机械']
  ];
  globalThis.fetch=localAsset;
  clearSchoolQueryProviderCacheForTest();
  clearAiSchoolHistoryFactCacheForTest();
  try{
    for(const [school,majorKeyword] of matrix){
      const query=new URLSearchParams({school,schoolIntent:'school',offset:'0',limit:'100',sort:'score-desc'});if(majorKeyword)query.set('majorKeyword',majorKeyword);
      const [publicResponse,aiResponse]=await Promise.all([
        publicSchoolMajorsOnRequest({request:new Request(`https://preview.example/api/school-majors?${query}`),env}),
        schoolHistoryOnRequest({request:new Request(`https://preview.example/api/ai/school-history?${query}`),env})
      ]);
      assert.equal(publicResponse.status,200,`public major filter failed: ${school} ${majorKeyword}`);
      assert.equal(aiResponse.status,200,`AIPLuS major filter failed: ${school} ${majorKeyword}`);
      const [publicPayload,aiPayload]=await Promise.all([publicResponse.json(),aiResponse.json()]);
      const semanticKeys=payload=>[...new Set((payload.records||[]).map(record=>[record.school,record.major,record.score2026,record.rank2026,record.schoolCode2026,record.majorCode2026].map(value=>String(value??'').trim()).join('|')))].sort();
      assert.deepEqual(semanticKeys(aiPayload),semanticKeys(publicPayload),`shared major filter meaning drift: ${school} ${majorKeyword}`);
    }
  }finally{
    globalThis.fetch=previousFetch;
    clearSchoolQueryProviderCacheForTest();
  }
  return{queries:matrix.length,schools:new Set(matrix.map(item=>item[0])).size};
}

const rawSemanticKey=raw=>[
  String(rawSchool(raw)||'').trim(),String(raw?.major||raw?.majorName||'').trim(),String(raw?.score2026??raw?.score??'').trim(),
  String(raw?.rank2026??raw?.rank??'').trim(),String(raw?.schoolCode2026??raw?.schoolCode??'').trim(),String(raw?.majorCode2026??raw?.majorCode??'').trim()
].join('|');
const expectedForSchool=schoolEntry=>{
  const accepted=new Set([schoolEntry.officialName,...(schoolEntry.admissionNames||[])]);
  return schoolEntry.chunkFiles2026.flatMap(chunkRows).filter(raw=>accepted.has(String(rawSchool(raw)||'').trim()));
};
async function verifyRuntimeProjection(){
  let assetFetchCount=0;const runtimePaths=[];
  const runtimeEnv={ASSETS:{fetch:async request=>{assetFetchCount+=1;const url=new URL(request.url);runtimePaths.push(url.pathname);assert.ok(url.pathname===SCHOOL_INDEX_PATH||SCHOOL_SHARD_RE.test(url.pathname),`unexpected runtime asset: ${url.pathname}`);return localAsset(request);}}};
  const request=new Request('https://runtime-cache-test.example/api/school-majors');
  const policy=schoolRuntimeProjectionCachePolicy();
  assert.equal(policy.ttlMs,5*60*1000,'school runtime cache TTL drift');
  assert.equal(policy.indexMaxEntries,1,'school runtime index cache cap drift');
  assert.equal(policy.shardMaxEntries,4,'school runtime shard cache cap drift');
  clearAiSchoolHistoryFactCacheForTest();
  for(const schoolEntry of [industrial,aviation,science]){
    const names=[schoolEntry.officialName,...(schoolEntry.admissionNames||[])],expected=expectedForSchool(schoolEntry),before=assetFetchCount;
    const exact=await loadSchoolRuntimeRecords({request,env:runtimeEnv},{schoolNames:names});
    const actualKeys=[...new Set(exact.records.map(rawSemanticKey))].sort(),expectedKeys=[...new Set(expected.map(rawSemanticKey))].sort();
    assert.deepEqual(actualKeys,expectedKeys,`runtime projection truth drift: ${schoolEntry.officialName}`);
    assert.equal(exact.records.length,Number(schoolEntry.recordCount2026),`runtime projection count drift: ${schoolEntry.officialName}`);
    assert.equal(exact.shardFiles.length,1,`runtime projection must read one shard: ${schoolEntry.officialName}`);
    if(schoolEntry===industrial){
      assert.equal(assetFetchCount-before,2,'cold runtime read must fetch one index and one shard');
      const beforeWarm=assetFetchCount;const cached=await loadSchoolRuntimeRecords({request,env:runtimeEnv},{schoolNames:names});
      assert.equal(assetFetchCount,beforeWarm,'warm runtime read must reuse bounded promise caches');
      assert.deepEqual([...new Set(cached.records.map(rawSemanticKey))].sort(),expectedKeys,'warm runtime truth drift');
    }
  }
  assert.equal(runtimePaths.filter(path=>path===SCHOOL_INDEX_PATH).length,1,'runtime school index must be cached after first read');
  return{schools:['沈阳工业大学','沈阳航空航天大学','辽宁科技大学'],assetFetchCount};
}

const preaggregated=verifyPreaggregatedTruthSet();
const aiFactPath=await verifyAiSchoolHistoryFactPath();
const parentJourneys=await verifyActualParentJourneys();
const majorFilterParity=await verifyPublicMajorFilterParity();
const runtimeProjection=await verifyRuntimeProjection();
await verifyPartialSchoolHistoryBatch();
console.log(JSON.stringify({
  ok:true,
  checks:[
    'canonical-school-identity-owner','deployment-assets-school-identity','single-flight-school-identity-directory','isolated-aiplus-school-history-fact-source',
    '956-school-preaggregated-truth-set-equal','identity-index-one-shard-cold-path','cold-aviation-identity-resolution','concurrent-same-school-fetch-coalescing',
    'complete-117-record-school','48k-complete-school-bridge-budget','actual-four-major-parent-journey','actual-compact-major-parent-journey',
    'actual-all-major-parent-journey','actual-exclude-sino-follow-up','shared-major-filter-parity','spoken-and-canonical-major-matching',
    'candidate-fit-position','sino-project-classification','history-fit-continuation','1102-no-retry','school-runtime-projection-truth-set-equal',
    'bounded-school-runtime-promise-cache','shared-aiplus-school-fact-cache','bounded-school-history-session-cache'
  ],
  preaggregated,aiFactPath,parentJourneys,majorFilterParity,runtimeProjection,sourceRecords:11628
},null,2));
