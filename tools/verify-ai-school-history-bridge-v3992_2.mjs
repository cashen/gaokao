import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { loadMatchingRecordsFromFiles, loadExactSchoolRecordsFromFiles } from '../functions/_lib/ln-rank-manifest.js';
import { rawSchool } from '../functions/_lib/fenxi-normalizer.js';

const tool=fs.readFileSync('functions/_lib/ai/tool-registry.js','utf8');
const orchestrator=fs.readFileSync('functions/_lib/ai/turn-orchestrator.js','utf8');
const app=fs.readFileSync('aiplus/app.v3990_1.js','utf8');
assert.ok(!/import\s+\{[^}]*queryAiSchoolHistory[^}]*\}\s+from\s+['"]\.\/school-history-adapter\.js['"]/.test(tool),'AI base graph must not statically import school-history-adapter');
assert.ok(tool.includes("kind:'school_history'"),'school history deterministic tool kind missing');
assert.ok(tool.includes("new URL('/api/school-majors'"),'school history must reuse public deterministic school-majors endpoint');
assert.ok(tool.includes("url.searchParams.set('schoolIntent','school')"),'school history exact-school intent missing');
assert.ok(tool.includes('normalizedScore=normalizeOptionalCandidateScore(candidateScore)'),'school history must preserve null candidate score');
assert.ok(tool.includes("normalizedScore===null?'score-desc':'position-near'"),'school history null score sort boundary missing');
assert.ok(orchestrator.includes('result.history,result.fit'),'history/fit deterministic continuation missing');
assert.ok(orchestrator.includes('preserveResolvedFocus=false'),'confirmed-command focus preservation boundary missing');
assert.ok(orchestrator.includes('deterministicContinuation=Object.keys(executionContext.aiDeterministicToolResults).length>0'),'deterministic continuation detection missing');
assert.ok(orchestrator.includes('focus:stableFocus'),'resolved focus must survive deterministic continuation');
assert.ok(app.includes("tool.kind==='school_history'&&tool.url.startsWith('/api/school-majors?')"),'browser school-history tool contract missing');
assert.ok(app.includes('budget:48*1024'),'school-history bridge byte budget missing');
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
assert.ok(endpoint.includes('chunkFiles2026.length')&&endpoint.includes('loadExactSchoolRecordsFromFiles'),'school-majors must use exact-school native chunk loader');

function chunkRows(file){const data=JSON.parse(fs.readFileSync(`fenxi/${file}`,'utf8'));return Array.isArray(data)?data:(Array.isArray(data.records)?data.records:[]);}
const expectedIndustrial=industrial.chunkFiles2026.flatMap(chunkRows).filter(raw=>String(rawSchool(raw)||'').trim()==='沈阳工业大学');
const expectedScanned=industrial.chunkFiles2026.reduce((sum,file)=>sum+chunkRows(file).length,0);
const originalFetch=globalThis.fetch;
globalThis.fetch=async input=>{
  const url=new URL(typeof input==='string'?input:input.url);
  if(url.pathname==='/fenxi/data/ln-rank-2026/manifest.json')return new Response(fs.readFileSync('fenxi/data/ln-rank-2026/manifest.json'),{status:200,headers:{'content-type':'application/json'}});
  throw new Error(`unexpected network fetch in streaming verifier: ${url.pathname}`);
};
const env={ASSETS:{fetch:async request=>{
  const url=new URL(request.url);
  const relative=url.pathname.replace(/^\/fenxi\//,'');
  const path=`fenxi/${relative}`;
  assert.ok(fs.existsSync(path),`stream fixture missing: ${path}`);
  const response=new Response(Readable.toWeb(fs.createReadStream(path,{highWaterMark:509})),{status:200,headers:{'content-type':'application/json'}});
  Object.defineProperty(response,'json',{value:async()=>{throw new Error(`chunk response.json forbidden: ${relative}`);}});
  return response;
}}};
try{
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
  }
  const allFiles=[...chunkFiles];
  const fullScan=await loadMatchingRecordsFromFiles(request,env,allFiles,()=>false);
  assert.equal(fullScan.scanned,Number(manifest.totalRecords),'stream parser must consume all 2026 source records without loss');
  assert.equal(fullScan.records.length,0,'false predicate must not retain source rows');
}finally{
  globalThis.fetch=originalFetch;
}

console.log(JSON.stringify({ok:true,checks:['no-static-school-history-adapter','reuse-public-school-majors','history-fit-continuation','48k-school-history-bridge-budget','1102-no-retry','record-stream-no-response-json','stream-truth-set-equal','exact-school-native-text-scan-truth-set-equal','bounded-school-history-session-cache'],streamedSchools:['沈阳工业大学','沈阳航空航天大学','辽宁科技大学'],sourceRecords:manifest.totalRecords},null,2));
