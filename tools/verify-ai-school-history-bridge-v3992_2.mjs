import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { loadMatchingRecordsFromFiles, loadExactSchoolRecordsFromFiles, clearExactSchoolRecordCacheForTest, exactSchoolRecordCacheState } from '../functions/_lib/ln-rank-manifest.js';
import { rawSchool } from '../functions/_lib/fenxi-normalizer.js';
import { runSchoolMajorHistory } from '../functions/_lib/ai/tool-registry.js';

const tool=fs.readFileSync('functions/_lib/ai/tool-registry.js','utf8');
const orchestrator=fs.readFileSync('functions/_lib/ai/turn-orchestrator.js','utf8');
const app=fs.readFileSync('aiplus/app.v3990_1.js','utf8');
assert.ok(!/import\s+\{[^}]*queryAiSchoolHistory[^}]*\}\s+from\s+['"]\.\/school-history-adapter\.js['"]/.test(tool),'AI base graph must not statically import school-history-adapter');
assert.ok(tool.includes("kind:'school_history'"),'school history deterministic tool kind missing');
assert.ok(tool.includes("new URL('/api/school-majors'"),'school history must reuse public deterministic school-majors endpoint');
assert.ok(tool.includes("url.searchParams.set('schoolIntent','school')"),'school history exact-school intent missing');
assert.ok(tool.includes('normalizedScore=normalizeOptionalCandidateScore(candidateScore)'),'school history must preserve null candidate score');
assert.ok(tool.includes("normalizedScore===null?'score-desc':'position-near'"),'school history null score sort boundary missing');
assert.ok(tool.includes('majorKeywords=[]'),'school history adapter must accept multiple major keywords');
assert.ok(tool.includes('queryResults.push'),'school history batch must preserve per-query status');
assert.ok(tool.includes('partial,allFailed'),'school history batch must distinguish partial and all-failed states');
assert.ok(tool.includes('AI_FACT_BRIDGE_CONTRACT_VERSION'),'server tool registry must use shared fact bridge version');
const factBridge=fs.readFileSync('shared/ai/ai-workspace-contract.v3992_0.js','utf8');
assert.ok(factBridge.includes("AI_FACT_BRIDGE_CONTRACT_VERSION='ai-fact-bridge-v3992_9'"),'shared fact bridge version drift');
assert.ok(factBridge.includes('queryErrorMessage'),'shared fact bridge error provenance missing');
assert.ok(orchestrator.includes('majorKeywords:focus.majors'),'orchestrator must pass multiple major keywords without joining them into one query');
assert.ok(orchestrator.includes('result.history'),'school-history deterministic continuation missing');assert.ok(orchestrator.includes('result.majorHistory'),'major-history deterministic continuation missing');assert.ok(orchestrator.includes('result.fit'),'fit deterministic continuation missing');
assert.ok(orchestrator.includes('preserveResolvedFocus=false'),'confirmed-command focus preservation boundary missing');
assert.ok(orchestrator.includes('deterministicContinuation=Object.keys(executionContext.aiDeterministicToolResults).length>0'),'deterministic continuation detection missing');
assert.ok(orchestrator.includes('focus:stableFocus'),'resolved focus must survive deterministic continuation');
assert.ok(app.includes("tool.kind==='school_history'&&tool.url.startsWith('/api/school-majors?')"),'browser school-history tool contract missing');
assert.ok(app.includes('budget:48*1024'),'school-history bridge byte budget missing');
assert.ok(app.includes('majorSuggestions:Array.isArray(data.majorSuggestions)'), 'related-major suggestions must survive the browser bridge');
assert.ok(app.includes('AI_FACT_BRIDGE_CONTRACT_VERSION'), 'shared fact bridge version missing');
assert.ok(app.includes('compactSchoolHistoryFactPayload'), 'shared school-history bridge contract missing');
assert.ok(app.includes('queryResults'), 'per-query batch status must survive the browser bridge');
assert.ok(app.includes('beginViewportTransaction'), 'viewport transaction owner missing');
assert.ok(!app.includes('restoreViewportIntent'), 'legacy multi-owner viewport restore remains');
assert.ok(app.includes("v=3992_9"), 'AIPLuS asset cache version not refreshed');
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
assert.ok(provider.includes('chunkFiles2026: Object.freeze'),'exact school provider must expose chunk locator');
assert.ok(manifestLoader.includes('loadMatchingRecordsFromFiles'),'bounded manifest loader missing');
assert.ok(manifestLoader.includes('loadExactSchoolRecordsFromFiles'),'exact-school native loader missing');
assert.ok(manifestLoader.includes("mode: 'record-stream'"),'matching loader must stream individual records');
assert.ok(manifestLoader.includes("mode: 'exact-school-native-text-scan'"),'exact-school native text scan marker missing');
assert.ok(manifestLoader.includes('EXACT_SCHOOL_CACHE_TTL_MS = 45 * 1000'),'exact-school server cache TTL missing');
assert.ok(manifestLoader.includes('EXACT_SCHOOL_CACHE_MAX_ENTRIES = 8'),'exact-school server cache entry cap missing');
assert.ok(manifestLoader.includes('EXACT_SCHOOL_CACHE_MAX_RECORDS = 800'),'exact-school server cache record cap missing');
assert.ok(endpoint.includes('chunkFiles2026.length')&&endpoint.includes('loadExactSchoolRecordsFromFiles'),'school-majors must use exact-school native chunk loader');

async function verifyPartialSchoolHistoryBatch(){
  const context={request:new Request('https://preview.example/api/ai/turn'),aiDeterministicToolResults:{}};
  const first=await runSchoolMajorHistory(context,{school:'测试大学',majorKeywords:['机械','电气']});
  assert.equal(first.code,'client_tool_required','batch must request first deterministic fact');
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
function chunkRows(file){const data=JSON.parse(fs.readFileSync(`fenxi/${file}`,'utf8'));return Array.isArray(data)?data:(Array.isArray(data.records)?data.records:[]);}
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
console.log(JSON.stringify({ok:true,checks:['no-static-school-history-adapter','reuse-public-school-majors','history-fit-continuation','48k-school-history-bridge-budget','1102-no-retry','record-stream-no-response-json','stream-truth-set-equal','exact-school-native-text-scan-truth-set-equal','bounded-exact-school-server-cache','bounded-school-history-session-cache'],streamedSchools:['沈阳工业大学','沈阳航空航天大学','辽宁科技大学'],sourceRecords:manifest.totalRecords},null,2));
