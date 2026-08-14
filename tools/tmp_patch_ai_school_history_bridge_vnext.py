from pathlib import Path

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
p.write_text(s,encoding='utf-8')
print('updated AI school-history bridge verifier for bounded school runtime projection')
