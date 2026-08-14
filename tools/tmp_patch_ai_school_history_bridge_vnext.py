from pathlib import Path

p=Path('tools/verify-ai-school-history-bridge-v3992_2.mjs')
s=p.read_text(encoding='utf-8')
s=s.replace("import { loadMatchingRecordsFromFiles, loadExactSchoolRecordsFromFiles, clearExactSchoolRecordCacheForTest, exactSchoolRecordCacheState } from '../functions/_lib/ln-rank-manifest.js';\n", "import { loadSchoolRuntimeRecords, schoolRuntimeProjectionCachePolicy } from '../functions/_lib/school-record-runtime-provider.vnext.js';\n")
s=s.replace("const manifestLoader=fs.readFileSync('functions/_lib/ln-rank-manifest.js','utf8');\n", "const manifestLoader=fs.readFileSync('functions/_lib/ln-rank-manifest.js','utf8');\nconst runtimeProvider=fs.readFileSync('functions/_lib/school-record-runtime-provider.vnext.js','utf8');\n")
old="""assert.ok(provider.includes('chunkFiles2026: Object.freeze'),'exact school provider must expose chunk locator');
assert.ok(manifestLoader.includes('loadMatchingRecordsFromFiles'),'bounded manifest loader missing');
assert.ok(manifestLoader.includes('loadExactSchoolRecordsFromFiles'),'exact-school native loader missing');
assert.ok(manifestLoader.includes(\"mode: 'record-stream'\"),'matching loader must stream individual records');
assert.ok(manifestLoader.includes(\"mode: 'exact-school-native-text-scan'\"),'exact-school native text scan marker missing');
assert.ok(manifestLoader.includes('EXACT_SCHOOL_CACHE_TTL_MS = 45 * 1000'),'exact-school server cache TTL missing');
assert.ok(manifestLoader.includes('EXACT_SCHOOL_CACHE_MAX_ENTRIES = 8'),'exact-school server cache entry cap missing');
assert.ok(manifestLoader.includes('EXACT_SCHOOL_CACHE_MAX_RECORDS = 800'),'exact-school server cache record cap missing');
assert.ok(endpoint.includes('chunkFiles2026.length')&&endpoint.includes('loadExactSchoolRecordsFromFiles'),'school-majors must use exact-school native chunk loader');
"""
new="""assert.ok(provider.includes('chunkFiles2026: Object.freeze'),'school query directory must keep build-time chunk provenance');
assert.equal(manifestLoader.includes('loadAllRecords'),false,'production manifest loader must not expose full admissions loading');
assert.ok(runtimeProvider.includes(\"SCHOOL_RUNTIME_PROJECTION_VERSION = 'ln-rank-school-runtime-projection-vnext-100-shard-v1'\"),'school runtime projection version missing');
assert.ok(runtimeProvider.includes('SCHOOL_RUNTIME_PROJECTION_TOTAL_RECORDS = 11628'),'school runtime projection truth count drift');
assert.ok(runtimeProvider.includes('SCHOOL_RUNTIME_PROJECTION_SCHOOL_COUNT = 956'),'school runtime projection school count drift');
assert.ok(runtimeProvider.includes('SCHOOL_RUNTIME_PROJECTION_SHARD_COUNT = 100'),'school runtime projection shard count drift');
assert.ok(runtimeProvider.includes('INDEX_CACHE_MAX_ENTRIES = 1'),'school runtime index cache cap missing');
assert.ok(runtimeProvider.includes('SHARD_CACHE_MAX_ENTRIES = 4'),'school runtime shard cache cap missing');
assert.ok(runtimeProvider.includes('loadSchoolRuntimeRecords'),'school runtime exact loader missing');
assert.ok(endpoint.includes('school-record-runtime-provider.vnext.js')&&endpoint.includes('loadSchoolRuntimeRecords'),'school-majors must use bounded school runtime projection');
assert.ok(endpoint.includes(\"mode: 'school-runtime-projection-vnext'\"),'school-majors source mode must expose bounded projection ownership');
assert.equal(endpoint.includes('loadExactSchoolRecordsFromFiles'),false,'school-majors must not fall back to legacy rank chunk exact scan');
assert.equal(endpoint.includes('loadMatchingRecords('),false,'school-majors must not fall back to full matching scan');
"""
if old not in s: raise SystemExit('legacy school-majors bridge assertion block not found')
s=s.replace(old,new,1)
old_path="assert.deepEqual(requests.map(item=>item.pathname),['/data/zy2026/school-index.json','/data/zy2026/chunks/school-06.json'],'cold query must read one index and one school shard only');"
new_path="assert.equal(requests.length,2,'cold query must read exactly one index and one school shard');\n  assert.equal(requests[0]?.pathname,'/data/zy2026/school-index.json','cold query must read school index first');\n  assert.match(requests[1]?.pathname,/^\\/data\\/zy2026\\/chunks\\/school-\\d{2}\\.json$/,'cold query must read exactly one bounded school runtime shard');"
if old_path not in s: raise SystemExit('hard-coded cold school shard assertion not found')
s=s.replace(old_path,new_path,1)
old_concurrent="assert.equal(requests.filter(item=>item.pathname==='/data/zy2026/chunks/school-14.json').length,1,'concurrent same-school fact queries did not coalesce the shard');"
new_concurrent="assert.equal(requests.filter(item=>/^\\/data\\/zy2026\\/chunks\\/school-\\d{2}\\.json$/.test(item.pathname)).length,1,'cold concurrent same-school fact queries must coalesce to exactly one shard fetch');"
if old_concurrent not in s: raise SystemExit('hard-coded concurrent school shard assertion not found')
s=s.replace(old_concurrent,new_concurrent,1)
old_parity="const [publicPayload,aiPayload]=await Promise.all([publicResponse.json(),aiResponse.json()]),ids=payload=>[...new Set((payload.records||[]).map(record=>record.id))].sort();\n      assert.deepEqual(ids(aiPayload),ids(publicPayload),`shared major filter meaning drift: ${school} ${majorKeyword}`);"
new_parity="const [publicPayload,aiPayload]=await Promise.all([publicResponse.json(),aiResponse.json()]);\n      const semanticKeys=payload=>[...new Set((payload.records||[]).map(record=>[record.school,record.major,record.score2026,record.rank2026,record.schoolCode2026,record.majorCode2026].map(value=>String(value??'').trim()).join('|'))) ].sort();\n      assert.deepEqual(semanticKeys(aiPayload),semanticKeys(publicPayload),`shared major filter meaning drift: ${school} ${majorKeyword}`);"
if old_parity not in s: raise SystemExit('public/AI id parity block not found')
s=s.replace(old_parity,new_parity,1)
start=s.index('const expectedIndustrial=industrial.chunkFiles2026')
end=s.index('\nawait verifyPartialSchoolHistoryBatch();',start)
replacement=r'''const rawSemanticKey=raw=>[
  String(rawSchool(raw)||'').trim(),
  String(raw?.major||raw?.majorName||'').trim(),
  String(raw?.score2026??raw?.score??'').trim(),
  String(raw?.rank2026??raw?.rank??'').trim(),
  String(raw?.schoolCode2026??raw?.schoolCode??'').trim(),
  String(raw?.majorCode2026??raw?.majorCode??'').trim()
].join('|');
const expectedForSchool=schoolEntry=>{
  const accepted=new Set([schoolEntry.officialName,...(schoolEntry.admissionNames||[])]);
  return schoolEntry.chunkFiles2026.flatMap(chunkRows).filter(raw=>accepted.has(String(rawSchool(raw)||'').trim()));
};
const originalFetch=globalThis.fetch;
let assetFetchCount=0;
const runtimePaths=[];
const runtimeEnv={ASSETS:{fetch:async request=>{
  assetFetchCount+=1;
  const url=new URL(request.url);
  runtimePaths.push(url.pathname);
  assert.ok(url.pathname==='/data/zy2026/school-index.json'||/^\/data\/zy2026\/chunks\/school-\d{2}\.json$/.test(url.pathname),`unexpected runtime projection asset: ${url.pathname}`);
  const localPath=url.pathname.replace(/^\//,'');
  assert.ok(fs.existsSync(localPath),`runtime projection fixture missing: ${localPath}`);
  return new Response(fs.readFileSync(localPath),{status:200,headers:{'content-type':'application/json; charset=utf-8'}});
}}};
try{
  const request=new Request('https://runtime-cache-test.example/api/school-majors');
  const policy=schoolRuntimeProjectionCachePolicy();
  assert.equal(policy.ttlMs,5*60*1000,'school runtime cache TTL drift');
  assert.equal(policy.indexMaxEntries,1,'school runtime index cache cap drift');
  assert.equal(policy.shardMaxEntries,4,'school runtime shard cache cap drift');
  for(const schoolEntry of [industrial,aviation,science]){
    const names=[schoolEntry.officialName,...(schoolEntry.admissionNames||[])];
    const expected=expectedForSchool(schoolEntry);
    const before=assetFetchCount;
    const exact=await loadSchoolRuntimeRecords({request,env:runtimeEnv},{schoolNames:names});
    const actualKeys=[...new Set(exact.records.map(rawSemanticKey))].sort();
    const expectedKeys=[...new Set(expected.map(rawSemanticKey))].sort();
    assert.deepEqual(actualKeys,expectedKeys,`school runtime projection truth drift: ${schoolEntry.officialName}`);
    assert.equal(exact.records.length,Number(schoolEntry.recordCount2026),`school runtime projection count drift: ${schoolEntry.officialName}`);
    assert.equal(exact.shardFiles.length,1,`school runtime projection must read one shard: ${schoolEntry.officialName}`);
    assert.match(exact.shardFiles[0],/^school-\d{2}\.json$/,`school runtime projection shard format drift: ${schoolEntry.officialName}`);
    if(schoolEntry===industrial){
      assert.equal(assetFetchCount-before,2,'cold school runtime read must fetch one index and one shard');
      const beforeWarm=assetFetchCount;
      const cached=await loadSchoolRuntimeRecords({request,env:runtimeEnv},{schoolNames:names});
      assert.equal(assetFetchCount,beforeWarm,'warm school runtime read must reuse bounded promise caches');
      assert.deepEqual([...new Set(cached.records.map(rawSemanticKey))].sort(),expectedKeys,'warm school runtime truth drift');
    }
  }
  assert.equal(runtimePaths.filter(path=>path==='/data/zy2026/school-index.json').length,1,'runtime school index must be cached after first read');
}finally{
  globalThis.fetch=originalFetch;
}
'''
s=s[:start]+replacement+s[end:]
s=s.replace("'record-stream-no-response-json','stream-truth-set-equal','exact-school-native-text-scan-truth-set-equal','bounded-exact-school-server-cache'", "'school-runtime-projection-truth-set-equal','bounded-school-runtime-promise-cache'")
s=s.replace("streamedSchools:['沈阳工业大学','沈阳航空航天大学','辽宁科技大学'],sourceRecords:manifest.totalRecords", "runtimeProjectionSchools:['沈阳工业大学','沈阳航空航天大学','辽宁科技大学'],sourceRecords:11628")
p.write_text(s,encoding='utf-8')
print('updated AI school-history verifier for bounded owner, semantic parity, and runtime cache contract')
