from pathlib import Path

# Keep public /api/school-majors record identity stable across the AI fact bridge.
fact=Path('functions/_lib/ai/school-history-fact-source.js')
fsrc=fact.read_text(encoding='utf-8')
old_id="""  const record = {
    id: clean(raw?.uid, 220),
    school: clean(raw?.school || schoolInfo.name, 120),
    major,
"""
new_id="""  const school = clean(raw?.school || schoolInfo.name, 120);
  const record = {
    id: `${school}-${major}-${score2026}-${rank2026}`,
    school,
    major,
"""
if old_id not in fsrc:
    raise SystemExit('AI school-history record id block not found')
fsrc=fsrc.replace(old_id,new_id,1)
fact.write_text(fsrc,encoding='utf-8')

p=Path('tools/verify-ai-school-history-bridge-v3992_2.mjs')
s=p.read_text(encoding='utf-8')
s=s.replace("import { loadMatchingRecordsFromFiles, loadExactSchoolRecordsFromFiles, clearExactSchoolRecordCacheForTest, exactSchoolRecordCacheState } from '../functions/_lib/ln-rank-manifest.js';\n",'')
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
assert.ok(runtimeProvider.includes("SCHOOL_RUNTIME_PROJECTION_VERSION = 'ln-rank-school-runtime-projection-vnext-100-shard-v1'"),'school runtime projection version missing');
assert.ok(runtimeProvider.includes('SCHOOL_RUNTIME_PROJECTION_TOTAL_RECORDS = 11628'),'school runtime projection truth count drift');
assert.ok(runtimeProvider.includes('SCHOOL_RUNTIME_PROJECTION_SCHOOL_COUNT = 956'),'school runtime projection school count drift');
assert.ok(runtimeProvider.includes('SCHOOL_RUNTIME_PROJECTION_SHARD_COUNT = 100'),'school runtime projection shard count drift');
assert.ok(runtimeProvider.includes('INDEX_CACHE_MAX_ENTRIES = 1'),'school runtime index cache cap missing');
assert.ok(runtimeProvider.includes('SHARD_CACHE_MAX_ENTRIES = 4'),'school runtime shard cache cap missing');
assert.ok(runtimeProvider.includes('loadSchoolRuntimeRecords'),'school runtime exact loader missing');
assert.ok(endpoint.includes('school-record-runtime-provider.vnext.js')&&endpoint.includes('loadSchoolRuntimeRecords'),'school-majors must use bounded school runtime projection');
assert.ok(endpoint.includes("mode: 'school-runtime-projection-vnext'"),'school-majors source mode must expose bounded projection ownership');
assert.equal(endpoint.includes('loadExactSchoolRecordsFromFiles'),false,'school-majors must not fall back to legacy rank chunk exact scan');
assert.equal(endpoint.includes('loadMatchingRecords('),false,'school-majors must not fall back to full matching scan');
"""
if old not in s:
    raise SystemExit('legacy school-majors bridge assertion block not found')
s=s.replace(old,new,1)
old_path="assert.deepEqual(requests.map(item=>item.pathname),['/data/zy2026/school-index.json','/data/zy2026/chunks/school-06.json'],'cold query must read one index and one school shard only');"
new_path="assert.equal(requests.length,2,'cold query must read exactly one index and one school shard');\n  assert.equal(requests[0]?.pathname,'/data/zy2026/school-index.json','cold query must read school index first');\n  assert.match(requests[1]?.pathname,/^\\/data\\/zy2026\\/chunks\\/school-\\d{2}\\.json$/,'cold query must read exactly one bounded school runtime shard');"
if old_path not in s:
    raise SystemExit('hard-coded cold school shard assertion not found')
s=s.replace(old_path,new_path,1)
old_concurrent="assert.equal(requests.filter(item=>item.pathname==='/data/zy2026/chunks/school-14.json').length,1,'concurrent same-school fact queries did not coalesce the shard');"
new_concurrent="assert.equal(requests.filter(item=>/^\\/data\\/zy2026\\/chunks\\/school-\\d{2}\\.json$/.test(item.pathname)).length,1,'cold concurrent same-school fact queries must coalesce to exactly one shard fetch');"
if old_concurrent not in s:
    raise SystemExit('hard-coded concurrent school shard assertion not found')
s=s.replace(old_concurrent,new_concurrent,1)
p.write_text(s,encoding='utf-8')
print('updated AI school-history fact identity and verifier for bounded school runtime projection')
