from pathlib import Path
import json, re, hashlib
from collections import Counter

ROOT = Path('.')
PROJECTION_VERSION = 'ln-rank-school-runtime-projection-vnext-100-shard-v1'
SHARD_COUNT = 100


def compact_dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def norm(v):
    return str(v or '').strip().replace(' ', '')


def rec_identity(r):
    return '|'.join([
        norm(r.get('schoolCode2026', r.get('schoolCode', ''))),
        norm(r.get('majorCode2026', r.get('majorCode', ''))),
        norm(r.get('school', r.get('schoolName', ''))),
        norm(r.get('major', r.get('majorName', ''))),
        norm(r.get('score2026', r.get('score', ''))),
        norm(r.get('rank2026', r.get('rank', ''))),
    ])


def school_records(school_obj):
    out = []
    for rel in school_obj.get('relations', []) or []:
        out.extend(rel.get('records2026', []) or [])
    return out


def fnv1a(text):
    h = 2166136261
    for b in text.encode('utf-8'):
        h ^= b
        h = (h * 16777619) & 0xffffffff
    return h


def load_raw_truth():
    manifest_path = ROOT / 'fenxi/data/ln-rank-2026/manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    records = []
    for ch in manifest.get('chunks', []):
        rel = ch.get('file') or ch.get('path')
        if not rel:
            continue
        candidates = [ROOT / 'fenxi' / rel, ROOT / rel, manifest_path.parent / Path(rel).name]
        path = next((p for p in candidates if p.exists()), None)
        if path is None:
            raise SystemExit(f'raw chunk missing: {rel}')
        data = json.loads(path.read_text(encoding='utf-8'))
        rows = data if isinstance(data, list) else data.get('records', [])
        records.extend(rows)
    return manifest, records


def rebuild_school_projection():
    index_path = ROOT / 'data/zy2026/school-index.json'
    chunks_dir = ROOT / 'data/zy2026/chunks'
    index = json.loads(index_path.read_text(encoding='utf-8'))
    old_files = sorted(chunks_dir.glob('school-*.json'))
    if not old_files:
        raise SystemExit('no existing school projection shards')

    school_map = {}
    templates = []
    for path in old_files:
        payload = json.loads(path.read_text(encoding='utf-8'))
        templates.append({k: v for k, v in payload.items() if k != 'schools'})
        for key, school in (payload.get('schools') or {}).items():
            if key in school_map:
                raise SystemExit(f'duplicate school key in old projection: {key}')
            school_map[key] = school

    if len(school_map) != 956:
        raise SystemExit(f'projection school count before repartition != 956: {len(school_map)}')

    template = templates[0] if templates else {}
    buckets = [dict() for _ in range(SHARD_COUNT)]
    for key in sorted(school_map):
        bucket = fnv1a(key) % SHARD_COUNT
        buckets[bucket][key] = school_map[key]

    for p in old_files:
        p.unlink()

    shard_stats = []
    for idx, schools in enumerate(buckets):
        filename = f'school-{idx:02d}.json'
        recs = sum(len(school_records(s)) for s in schools.values())
        payload = dict(template)
        payload['projectionVersion'] = PROJECTION_VERSION
        payload['shard'] = filename
        payload['schoolCount'] = len(schools)
        payload['recordCount'] = recs
        payload['schools'] = schools
        compact_dump(chunks_dir / filename, payload)
        shard_stats.append({'file': filename, 'schoolCount': len(schools), 'recordCount': recs})

    schools_index = index.get('schools') or {}
    for key, item in schools_index.items():
        actual_key = item.get('key') or key
        if actual_key not in school_map:
            raise SystemExit(f'index school key missing from projection: {actual_key}')
        item['chunk'] = f'school-{fnv1a(actual_key) % SHARD_COUNT:02d}.json'
        item['projectionVersion'] = PROJECTION_VERSION

    index['runtimeProjectionVersion'] = PROJECTION_VERSION
    index['runtimeProjectionShardCount'] = SHARD_COUNT
    index['runtimeProjectionRecordCount'] = sum(x['recordCount'] for x in shard_stats)
    index['runtimeProjectionSchoolCount'] = len(school_map)
    index['runtimeProjectionShards'] = shard_stats
    compact_dump(index_path, index)

    raw_manifest, raw_records = load_raw_truth()
    projected_records = []
    for s in school_map.values():
        projected_records.extend(school_records(s))
    raw_counter = Counter(rec_identity(r) for r in raw_records)
    projection_counter = Counter(rec_identity(r) for r in projected_records)
    if len(raw_records) != 11628 or len(projected_records) != 11628:
        raise SystemExit(f'truth count mismatch raw={len(raw_records)} projection={len(projected_records)}')
    if raw_counter != projection_counter:
        missing = list((raw_counter - projection_counter).items())[:5]
        extra = list((projection_counter - raw_counter).items())[:5]
        raise SystemExit(f'projection truth mismatch missing={missing} extra={extra}')
    if any(v != 1 for v in projection_counter.values()):
        raise SystemExit('projection duplicate semantic record identity detected')
    for key, item in schools_index.items():
        actual_key = item.get('key') or key
        expected = item.get('recordCount2026')
        if expected is not None and int(expected) != len(school_records(school_map[actual_key])):
            raise SystemExit(f'school recordCount2026 mismatch: {item.get("name") or actual_key}')

    max_bytes = max((chunks_dir / x['file']).stat().st_size for x in shard_stats)
    if max_bytes > 350_000:
        raise SystemExit(f'projection shard exceeds 350KB budget: {max_bytes}')
    print(json.dumps({
        'projectionVersion': PROJECTION_VERSION,
        'sourceManifestVersion': raw_manifest.get('version', ''),
        'sourceRecords': len(raw_records),
        'projectionRecords': len(projected_records),
        'schools': len(school_map),
        'shards': SHARD_COUNT,
        'maxShardBytes': max_bytes,
        'missing': 0,
        'duplicate': 0,
    }, ensure_ascii=False, indent=2))


def write_provider():
    p = ROOT / 'functions/_lib/school-record-runtime-provider.vnext.js'
    p.write_text(r'''export const SCHOOL_RUNTIME_PROJECTION_VERSION = 'ln-rank-school-runtime-projection-vnext-100-shard-v1';
export const SCHOOL_RUNTIME_PROJECTION_INDEX_PATH = '/data/zy2026/school-index.json';
export const SCHOOL_RUNTIME_PROJECTION_CHUNK_PREFIX = '/data/zy2026/chunks/';
export const SCHOOL_RUNTIME_PROJECTION_TOTAL_RECORDS = 11628;
export const SCHOOL_RUNTIME_PROJECTION_SCHOOL_COUNT = 956;
export const SCHOOL_RUNTIME_PROJECTION_SHARD_COUNT = 100;

const CACHE_TTL_MS = 5 * 60 * 1000;
const INDEX_CACHE_MAX_ENTRIES = 1;
const SHARD_CACHE_MAX_ENTRIES = 4;
const indexCache = new Map();
const shardCache = new Map();

function clean(value, max = 180) { return String(value == null ? '' : value).trim().slice(0, max); }
function normalizeSchool(value) {
  return clean(value).normalize('NFKC').toLowerCase()
    .replace(/[（【\[]/g, '(').replace(/[）】\]]/g, ')')
    .replace(/[\s·•・,，。；;：:'"“”‘’!！?？_—-]+/g, '');
}
function cacheRead(map, key) {
  const entry = map.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) { map.delete(key); return null; }
  map.delete(key); map.set(key, entry); return entry.promise;
}
function cacheWrite(map, key, loader, maxEntries) {
  const current = cacheRead(map, key); if (current) return current;
  let guarded;
  guarded = Promise.resolve().then(loader).catch(error => {
    if (map.get(key)?.promise === guarded) map.delete(key);
    throw error;
  });
  map.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, promise: guarded });
  while (map.size > maxEntries) map.delete(map.keys().next().value);
  return guarded;
}
async function fetchAssetJson(context, pathname) {
  const url = new URL(pathname, context.request.url);
  const req = new Request(url.toString(), { method: 'GET', headers: { accept: 'application/json' } });
  const response = context.env?.ASSETS?.fetch ? await context.env.ASSETS.fetch(req) : await fetch(req);
  if (!response.ok) throw new Error(`学校运行时投影读取失败：${pathname}（HTTP ${response.status}）`);
  const type = String(response.headers.get('content-type') || '').toLowerCase();
  if (type.includes('text/html')) throw new Error(`学校运行时投影错误返回 HTML：${pathname}`);
  return response.json();
}
function loadIndex(context) {
  const key = `${new URL(context.request.url).origin}${SCHOOL_RUNTIME_PROJECTION_INDEX_PATH}`;
  return cacheWrite(indexCache, key, () => fetchAssetJson(context, SCHOOL_RUNTIME_PROJECTION_INDEX_PATH), INDEX_CACHE_MAX_ENTRIES);
}
function loadShard(context, chunk) {
  if (!/^school-\d{2}\.json$/.test(chunk)) throw new Error('学校运行时投影分片标识无效');
  const pathname = `${SCHOOL_RUNTIME_PROJECTION_CHUNK_PREFIX}${chunk}`;
  const key = `${new URL(context.request.url).origin}${pathname}`;
  return cacheWrite(shardCache, key, () => fetchAssetJson(context, pathname), SHARD_CACHE_MAX_ENTRIES);
}
function schoolNamesOf(item = {}) {
  return [item.name, item.officialName, item.admissionName, ...(item.admissionNames || []), ...(item.aliases || [])]
    .map(normalizeSchool).filter(Boolean);
}
function recordsFromSchool(school = {}) {
  const records = [], seen = new Set();
  for (const relation of school.relations || []) {
    for (const raw of relation.records2026 || []) {
      const id = clean(raw?.uid, 240) || [raw?.schoolCode, raw?.majorCode, raw?.school, raw?.major, raw?.score, raw?.rank].join('|');
      if (!id || seen.has(id)) continue;
      seen.add(id); records.push(raw);
    }
  }
  return records;
}
export async function loadSchoolRuntimeRecords(context, options = {}) {
  const started = Date.now();
  const needles = new Set((options.schoolNames || []).map(normalizeSchool).filter(Boolean));
  if (!needles.size) throw new Error('学校运行时投影缺少精确学校名称');
  const index = await loadIndex(context);
  if (index?.runtimeProjectionVersion !== SCHOOL_RUNTIME_PROJECTION_VERSION) {
    throw new Error(`学校运行时投影版本异常：${index?.runtimeProjectionVersion || 'unknown'}`);
  }
  if (Number(index?.runtimeProjectionRecordCount) !== SCHOOL_RUNTIME_PROJECTION_TOTAL_RECORDS
      || Number(index?.runtimeProjectionSchoolCount) !== SCHOOL_RUNTIME_PROJECTION_SCHOOL_COUNT
      || Number(index?.runtimeProjectionShardCount) !== SCHOOL_RUNTIME_PROJECTION_SHARD_COUNT) {
    throw new Error('学校运行时投影覆盖合同异常');
  }
  const matches = Object.values(index?.schools || {}).filter(item => schoolNamesOf(item).some(name => needles.has(name)));
  if (!matches.length) return { manifest: index, records: [], rawScanned: 0, shardFiles: [], modes: [], cacheStatus: 'miss', elapsedMs: Date.now() - started };
  const shardFiles = [...new Set(matches.map(item => item.chunk).filter(Boolean))];
  if (shardFiles.length > 2) throw new Error(`学校运行时投影分片范围异常：${shardFiles.length}`);
  const shardByFile = new Map();
  for (const file of shardFiles) shardByFile.set(file, await loadShard(context, file));
  const records = [], seen = new Set();
  for (const item of matches) {
    const school = shardByFile.get(item.chunk)?.schools?.[item.key];
    if (!school) throw new Error(`学校运行时投影缺失：${item.name || item.key}`);
    for (const raw of recordsFromSchool(school)) {
      const id = clean(raw?.uid, 240) || [raw?.schoolCode, raw?.majorCode, raw?.school, raw?.major, raw?.score, raw?.rank].join('|');
      if (seen.has(id)) continue;
      seen.add(id); records.push(raw);
    }
  }
  return {
    manifest: index,
    records,
    rawScanned: records.length,
    shardFiles,
    modes: ['school-runtime-projection'],
    cacheStatus: 'bounded-projection',
    elapsedMs: Date.now() - started,
    projectionVersion: SCHOOL_RUNTIME_PROJECTION_VERSION
  };
}
export function schoolRuntimeProjectionCachePolicy() {
  return Object.freeze({ ttlMs: CACHE_TTL_MS, indexMaxEntries: INDEX_CACHE_MAX_ENTRIES, shardMaxEntries: SHARD_CACHE_MAX_ENTRIES });
}
''', encoding='utf-8')


def patch_school_majors():
    p = ROOT / 'functions/api/school-majors.js'
    s = p.read_text(encoding='utf-8')
    s = s.replace("import { loadMatchingRecords, loadExactSchoolRecordsFromFiles } from '../_lib/ln-rank-manifest.js';", "import { loadSchoolRuntimeRecords, SCHOOL_RUNTIME_PROJECTION_VERSION } from '../_lib/school-record-runtime-provider.vnext.js';")
    old = re.compile(r"    const acceptedNames = acceptedNamesForSelection\(selection, entity\);\n    const chunkFiles2026 = .*?\n    const \{ manifest, records: exactRaw, scanned: rawScanned \} = exactLoad;", re.S)
    replacement = """    const acceptedNames = acceptedNamesForSelection(selection, entity);\n    const exactSchoolNames2026 = [...new Set([\n      ...(Array.isArray(selection?.admissionNames) ? selection.admissionNames : []),\n      selection?.admissionName,\n      selection?.officialName,\n      ...acceptedNames\n    ].map(value => String(value || '').trim()).filter(Boolean))];\n    const exactLoad = await loadSchoolRuntimeRecords(context, { schoolNames: exactSchoolNames2026 });\n    const { manifest, records: exactRaw, rawScanned } = exactLoad;\n    const chunkFiles2026 = exactLoad.shardFiles || [];"""
    s, n = old.subn(replacement, s, count=1)
    if n != 1:
        raise SystemExit('school-majors exact-load block patch failed')
    s = s.replace("mode: chunkFiles2026.length ? 'unified-school-query-exact-admission-chunks' : 'unified-school-query-exact-admission-names',", "mode: 'school-runtime-projection-vnext',\n        projectionVersion: SCHOOL_RUNTIME_PROJECTION_VERSION,")
    s = s.replace("chunkReadModes: Array.isArray(exactLoad.modes) ? exactLoad.modes : []", "chunkReadModes: Array.isArray(exactLoad.modes) ? exactLoad.modes : [],\n        shardCount: chunkFiles2026.length,\n        cacheStatus: exactLoad.cacheStatus || ''")
    p.write_text(s, encoding='utf-8')


def patch_report():
    p = ROOT / 'functions/_lib/report-data-service-v3956.js'
    s = p.read_text(encoding='utf-8')
    s = s.replace("import { loadAllRecords } from './ln-rank-manifest.js';", "import { selectMajorBandsStaticBuckets, loadMajorBandsStaticBucket } from './major-bands-static-provider.js';")
    anchor = "function minMaxScore(bands) {\n  const all = [bands.upper, bands.near, bands.steady];\n  return { min: Math.min(...all.map(item => item.minScore)), max: Math.max(...all.map(item => item.maxScore)) };\n}\n"
    helper = anchor + """\nasync function loadBoundedReportRecords(request, env, scoreWindow) {\n  const options = { assets: env?.ASSETS };\n  const { manifest, buckets } = await selectMajorBandsStaticBuckets(request, scoreWindow, options);\n  const records = [];\n  const bucketFiles = [];\n  let decodedRows = 0;\n  for (const bucket of buckets) {\n    const loaded = await loadMajorBandsStaticBucket(request, bucket.file, scoreWindow, options);\n    decodedRows += Number(loaded.rowCount || 0);\n    bucketFiles.push(bucket.file);\n    records.push(...loaded.records);\n  }\n  return { manifest, records, decodedRows, bucketFiles };\n}\n"""
    if anchor not in s:
        raise SystemExit('report minMax anchor missing')
    s = s.replace(anchor, helper, 1)
    s = s.replace("  const { manifest, records: rawRecords } = await loadAllRecords(request, env || {});\n  const scoreWindow = minMaxScore(bandsMeta);", "  const scoreWindow = minMaxScore(bandsMeta);\n  const boundedLoad = await loadBoundedReportRecords(request, env || {}, scoreWindow);\n  const { manifest, records: rawRecords } = boundedLoad;")
    s = s.replace("sourceMode,\n    ...extra", "sourceMode,\n    ...extra")
    s = s.replace("return baseReportOutput(params, bandsMeta, selectedRecords, counts, 'canonical-server-rebuild-2026', {", "return baseReportOutput(params, bandsMeta, selectedRecords, counts, 'bounded-major-bands-server-rebuild-2026', {")
    s = s.replace("    manifest,\n    bands: grouped,", "    manifest,\n    runtimeBuckets: boundedLoad.bucketFiles,\n    runtimeDecodedRows: boundedLoad.decodedRows,\n    bands: grouped,")
    p.write_text(s, encoding='utf-8')


def patch_manifest():
    p = ROOT / 'functions/_lib/ln-rank-manifest.js'
    s = p.read_text(encoding='utf-8')
    s = s.replace('const chunkCache = new Map();\n', '')
    s, n = re.subn(r"\nexport async function loadAllRecords\(request, env\) \{.*?\n\}\n\nexport async function loadMatchingRecords", "\nexport async function loadMatchingRecords", s, count=1, flags=re.S)
    if n != 1:
        raise SystemExit('loadAllRecords removal failed')
    p.write_text(s, encoding='utf-8')


def write_audit():
    p = ROOT / 'tools/audit-worker-resource-architecture-vnext.mjs'
    p.write_text(r'''import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const functionFiles=walk(path.join(root,'functions')).filter(f=>/\.(?:js|mjs)$/.test(f));
const violations=[];
for(const file of functionFiles){
  const rel=path.relative(root,file).replaceAll('\\','/');
  const text=fs.readFileSync(file,'utf8');
  if(/\bloadAllRecords\s*\(/.test(text)) violations.push(`${rel}: production loadAllRecords`);
  if(/Promise\.all\s*\(\s*chunks\.map/.test(text)) violations.push(`${rel}: all-chunk Promise.all fanout`);
  if(/const\s+chunkCache\s*=\s*new\s+Map/.test(text)) violations.push(`${rel}: module-global parsed chunk cache`);
}
const school=fs.readFileSync('functions/api/school-majors.js','utf8');
if(!school.includes('school-record-runtime-provider.vnext.js')) violations.push('school-majors: shared school runtime provider missing');
if(school.includes('loadExactSchoolRecordsFromFiles')||school.includes('loadMatchingRecords(')) violations.push('school-majors: legacy large-chunk fallback remains');
const report=fs.readFileSync('functions/_lib/report-data-service-v3956.js','utf8');
if(!report.includes('loadMajorBandsStaticBucket')||report.includes('loadAllRecords')) violations.push('report: bounded major-bands owner missing');
const provider=fs.readFileSync('functions/_lib/school-record-runtime-provider.vnext.js','utf8');
if(!provider.includes('SHARD_CACHE_MAX_ENTRIES = 4')||!provider.includes('INDEX_CACHE_MAX_ENTRIES = 1')) violations.push('school provider: cache budget contract missing');
const index=JSON.parse(fs.readFileSync('data/zy2026/school-index.json','utf8'));
if(index.runtimeProjectionShardCount!==100||index.runtimeProjectionRecordCount!==11628||index.runtimeProjectionSchoolCount!==956) violations.push('school projection: coverage metadata invalid');
const shardFiles=fs.readdirSync('data/zy2026/chunks').filter(n=>/^school-\d{2}\.json$/.test(n));
if(shardFiles.length!==100) violations.push(`school projection: shard count ${shardFiles.length}`);
const maxBytes=Math.max(...shardFiles.map(n=>fs.statSync(path.join('data/zy2026/chunks',n)).size));
if(maxBytes>350000) violations.push(`school projection: shard budget exceeded ${maxBytes}`);
if(violations.length){console.error(violations.join('\n'));process.exit(1);}
console.log(JSON.stringify({ok:true,productionFullLoadUsage:0,productionAllChunkPromiseFanout:0,schoolProjection:{records:11628,schools:956,shards:100,maxBytes},reportOwner:'major-bands-static-v3972_2'},null,2));
''', encoding='utf-8')


def write_projection_verifier():
    p = ROOT / 'tools/verify-school-runtime-projection-vnext.mjs'
    p.write_text(r'''import fs from 'node:fs';import path from 'node:path';
const norm=v=>String(v??'').trim().replaceAll(' ','');
const identity=r=>[r.schoolCode2026??r.schoolCode,r.majorCode2026??r.majorCode,r.school??r.schoolName,r.major??r.majorName,r.score2026??r.score,r.rank2026??r.rank].map(norm).join('|');
const rawManifest=JSON.parse(fs.readFileSync('fenxi/data/ln-rank-2026/manifest.json','utf8'));
const raw=[];
for(const ch of rawManifest.chunks||[]){const rel=ch.file||ch.path;const candidates=[path.join('fenxi',rel),rel,path.join('fenxi/data/ln-rank-2026',path.basename(rel))];const file=candidates.find(fs.existsSync);if(!file)throw new Error(`raw chunk missing ${rel}`);const data=JSON.parse(fs.readFileSync(file,'utf8'));raw.push(...(Array.isArray(data)?data:data.records||[]));}
const index=JSON.parse(fs.readFileSync('data/zy2026/school-index.json','utf8'));const projected=[];const schools=new Set();const chunks=new Set();
for(const info of Object.values(index.schools||{})){chunks.add(info.chunk);const payload=JSON.parse(fs.readFileSync(path.join('data/zy2026/chunks',info.chunk),'utf8'));const school=payload.schools?.[info.key];if(!school)throw new Error(`missing projected school ${info.name||info.key}`);schools.add(info.key);const rows=(school.relations||[]).flatMap(r=>r.records2026||[]);projected.push(...rows);if(info.recordCount2026!=null&&Number(info.recordCount2026)!==rows.length)throw new Error(`record count mismatch ${info.name||info.key}`);}
const count=arr=>{const m=new Map();for(const r of arr){const k=identity(r);m.set(k,(m.get(k)||0)+1);}return m;};const a=count(raw),b=count(projected);const missing=[...a].filter(([k,v])=>(b.get(k)||0)!==v);const extra=[...b].filter(([k,v])=>(a.get(k)||0)!==v);
if(raw.length!==11628||projected.length!==11628||schools.size!==956||chunks.size>100||missing.length||extra.length||[...b.values()].some(v=>v!==1))throw new Error(JSON.stringify({raw:raw.length,projected:projected.length,schools:schools.size,chunks:chunks.size,missing:missing.slice(0,3),extra:extra.slice(0,3)}));
console.log(JSON.stringify({ok:true,sourceRecords:raw.length,projectionRecords:projected.length,schools:schools.size,usedShards:chunks.size,missing:0,duplicate:0,sourceManifestVersion:rawManifest.version||''},null,2));
''', encoding='utf-8')


rebuild_school_projection()
write_provider()
patch_school_majors()
patch_report()
patch_manifest()
write_audit()
write_projection_verifier()
print('ln-rank worker vNext source builder completed')
