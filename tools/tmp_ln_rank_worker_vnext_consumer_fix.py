from pathlib import Path
import json, re
from collections import Counter

ROOT = Path('.')
MAJOR_PROJECTION_VERSION = 'ln-rank-major-runtime-projection-vnext-100-shard-v1'
MAJOR_SHARD_COUNT = 100


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


def relation_records(obj, key='records2026'):
    out = []
    for rel in obj.get('relations', []) or []:
        out.extend(rel.get(key, []) or [])
    return out


def fnv1a(text):
    h = 2166136261
    for b in str(text).encode('utf-8'):
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
        payload = json.loads(path.read_text(encoding='utf-8'))
        records.extend(payload if isinstance(payload, list) else payload.get('records', []))
    return manifest, records


def stats(rows):
    scores = [int(r.get('score') if r.get('score') is not None else r.get('score2026')) for r in rows if str(r.get('score') if r.get('score') is not None else r.get('score2026', '')).strip().lstrip('-').isdigit()]
    ranks = [int(r.get('rank') if r.get('rank') is not None else r.get('rank2026')) for r in rows if str(r.get('rank') if r.get('rank') is not None else r.get('rank2026', '')).strip().lstrip('-').isdigit() and int(r.get('rank') if r.get('rank') is not None else r.get('rank2026')) > 0]
    majors = []
    schools = []
    for r in rows:
        major = str(r.get('major') or r.get('majorName') or '').strip()
        school = str(r.get('school') or r.get('schoolName') or '').strip()
        if major and major not in majors:
            majors.append(major)
        if school and school not in schools:
            schools.append(school)
    return {
        'count': len(rows),
        'minScore': min(scores) if scores else None,
        'maxScore': max(scores) if scores else None,
        'bestRank': min(ranks) if ranks else None,
        'uniqueMajorCount': len(majors),
        'uniqueSchoolCount': len(schools),
        'sampleMajors': majors[:8],
        'sampleSchools': schools[:8],
    }


def augment_school_index():
    index_path = ROOT / 'data/zy2026/school-index.json'
    chunks_dir = ROOT / 'data/zy2026/chunks'
    index = json.loads(index_path.read_text(encoding='utf-8'))
    items = index.get('schools') or []
    shard_cache = {}
    for item in items:
        chunk = item.get('chunk')
        key = item.get('key') or item.get('name')
        if not chunk or not key:
            continue
        if chunk not in shard_cache:
            shard_cache[chunk] = json.loads((chunks_dir / chunk).read_text(encoding='utf-8'))
        school = (shard_cache[chunk].get('schools') or {}).get(key)
        if not school:
            raise SystemExit(f'school index projection missing: {item.get("name") or key}')
        s26 = stats(relation_records(school, 'records2026'))
        s25 = stats(relation_records(school, 'records2025'))
        item['recordCount2026'] = s26['count']
        item['uniqueMajorCount2026'] = s26['uniqueMajorCount']
        item['minScore2026'] = s26['minScore']
        item['maxScore2026'] = s26['maxScore']
        item['bestRank2026'] = s26['bestRank']
        item['minScore2025'] = s25['minScore']
        item['maxScore2025'] = s25['maxScore']
        item['bestRank2025'] = s25['bestRank']
        item['sampleMajors2026'] = s26['sampleMajors']
    index['catalogProjectionVersion'] = 'zy2026-index-catalog-vnext-v1'
    compact_dump(index_path, index)


def repartition_major_projection():
    index_path = ROOT / 'data/zy2026/major-index.json'
    chunks_dir = ROOT / 'data/zy2026/chunks'
    index = json.loads(index_path.read_text(encoding='utf-8'))
    old_files = sorted(chunks_dir.glob('major-*.json'))
    if not old_files:
        raise SystemExit('no existing major projection shards')
    major_map = {}
    template = None
    for path in old_files:
        payload = json.loads(path.read_text(encoding='utf-8'))
        if template is None:
            template = {k: v for k, v in payload.items() if k != 'majors'}
        majors = payload.get('majors') or {}
        if not isinstance(majors, dict):
            raise SystemExit(f'major shard majors is not object: {path.name}')
        for key, major in majors.items():
            if key in major_map:
                raise SystemExit(f'duplicate major key: {key}')
            major_map[key] = major

    raw_manifest, raw_records = load_raw_truth()
    projected = []
    for major in major_map.values():
        projected.extend(relation_records(major, 'records2026'))
    raw_counter = Counter(rec_identity(r) for r in raw_records)
    proj_counter = Counter(rec_identity(r) for r in projected)
    if len(raw_records) != 11628 or len(projected) != 11628 or raw_counter != proj_counter:
        raise SystemExit(f'major projection parity failed raw={len(raw_records)} projected={len(projected)} missing={list((raw_counter-proj_counter).items())[:3]} extra={list((proj_counter-raw_counter).items())[:3]}')
    if any(v != 1 for v in proj_counter.values()):
        raise SystemExit('major projection duplicate semantic identity')

    buckets = [dict() for _ in range(MAJOR_SHARD_COUNT)]
    for key in sorted(major_map):
        buckets[fnv1a(key) % MAJOR_SHARD_COUNT][key] = major_map[key]
    for path in old_files:
        path.unlink()
    shard_stats = []
    for idx, majors in enumerate(buckets):
        filename = f'major-{idx:02d}.json'
        rows = sum(len(relation_records(m, 'records2026')) for m in majors.values())
        payload = dict(template or {})
        payload['projectionVersion'] = MAJOR_PROJECTION_VERSION
        payload['shard'] = filename
        payload['majorCount'] = len(majors)
        payload['recordCount'] = rows
        payload['majors'] = majors
        compact_dump(chunks_dir / filename, payload)
        shard_stats.append({'file': filename, 'majorCount': len(majors), 'recordCount': rows})

    items = index.get('majors') or []
    if not isinstance(items, list):
        raise SystemExit('major index is not list-form')
    for item in items:
        key = item.get('key') or item.get('label')
        if key not in major_map:
            raise SystemExit(f'major index key missing: {key}')
        item['chunk'] = f'major-{fnv1a(key) % MAJOR_SHARD_COUNT:02d}.json'
        s26 = stats(relation_records(major_map[key], 'records2026'))
        s25 = stats(relation_records(major_map[key], 'records2025'))
        item['recordCount2026'] = s26['count']
        item['minScore2026'] = s26['minScore']
        item['maxScore2026'] = s26['maxScore']
        item['bestRank2026'] = s26['bestRank']
        item['minScore2025'] = s25['minScore']
        item['maxScore2025'] = s25['maxScore']
        item['bestRank2025'] = s25['bestRank']
        item['sampleSchools2026'] = s26['sampleSchools']
        item['projectionVersion'] = MAJOR_PROJECTION_VERSION
    index['runtimeProjectionVersion'] = MAJOR_PROJECTION_VERSION
    index['runtimeProjectionShardCount'] = MAJOR_SHARD_COUNT
    index['runtimeProjectionRecordCount'] = len(projected)
    index['runtimeProjectionMajorCount'] = len(major_map)
    index['runtimeProjectionShards'] = shard_stats
    index['sourceManifestVersion'] = raw_manifest.get('version', '')
    compact_dump(index_path, index)
    max_bytes = max((chunks_dir / s['file']).stat().st_size for s in shard_stats)
    if max_bytes > 350_000:
        raise SystemExit(f'major projection shard exceeds 350KB budget: {max_bytes}')
    print(json.dumps({'majorProjectionRecords': len(projected), 'majorKeys': len(major_map), 'majorShards': MAJOR_SHARD_COUNT, 'maxMajorShardBytes': max_bytes}, ensure_ascii=False))


def extend_runtime_provider():
    path = ROOT / 'functions/_lib/school-record-runtime-provider.vnext.js'
    s = path.read_text(encoding='utf-8')
    marker = "export function schoolRuntimeProjectionCachePolicy() {\n"
    if marker not in s:
        raise SystemExit('runtime provider insertion marker missing')
    addition = r'''export const MAJOR_RUNTIME_PROJECTION_VERSION = 'ln-rank-major-runtime-projection-vnext-100-shard-v1';
export const MAJOR_RUNTIME_PROJECTION_INDEX_PATH = '/data/zy2026/major-index.json';
export const MAJOR_RUNTIME_PROJECTION_CHUNK_PREFIX = '/data/zy2026/chunks/';
export const MAJOR_RUNTIME_PROJECTION_TOTAL_RECORDS = 11628;
export const MAJOR_RUNTIME_PROJECTION_SHARD_COUNT = 100;
const majorIndexCache = new Map();
const majorShardCache = new Map();
function normalizeMajor(value) {
  return clean(value, 220).normalize('NFKC').toLowerCase()
    .replace(/[（【\[]/g, '(').replace(/[）】\]]/g, ')')
    .replace(/[\s·•・,，。；;：:'"“”‘’!！?？_—-]+/g, '');
}
function loadMajorIndex(context) {
  const key = `${new URL(context.request.url).origin}${MAJOR_RUNTIME_PROJECTION_INDEX_PATH}`;
  return cacheWrite(majorIndexCache, key, () => fetchAssetJson(context, MAJOR_RUNTIME_PROJECTION_INDEX_PATH), 1);
}
function loadMajorShard(context, chunk) {
  if (!/^major-\d{2}\.json$/.test(chunk)) throw new Error('专业运行时投影分片标识无效');
  const pathname = `${MAJOR_RUNTIME_PROJECTION_CHUNK_PREFIX}${chunk}`;
  const key = `${new URL(context.request.url).origin}${pathname}`;
  return cacheWrite(majorShardCache, key, () => fetchAssetJson(context, pathname), 4);
}
function recordsFromMajor(major = {}) {
  const records = [], seen = new Set();
  for (const relation of major.relations || []) {
    for (const raw of relation.records2026 || []) {
      const id = clean(raw?.uid, 240) || [raw?.schoolCode, raw?.majorCode, raw?.school, raw?.major, raw?.score, raw?.rank].join('|');
      if (!id || seen.has(id)) continue;
      seen.add(id); records.push(raw);
    }
  }
  return records;
}
export async function loadMajorRuntimeRecords(context, options = {}) {
  const started = Date.now();
  const queries = [...new Set((options.majorNames || []).map(normalizeMajor).filter(Boolean))];
  if (!queries.length) throw new Error('专业运行时投影缺少专业名称');
  const index = await loadMajorIndex(context);
  if (index?.runtimeProjectionVersion !== MAJOR_RUNTIME_PROJECTION_VERSION
      || Number(index?.runtimeProjectionRecordCount) !== MAJOR_RUNTIME_PROJECTION_TOTAL_RECORDS
      || Number(index?.runtimeProjectionShardCount) !== MAJOR_RUNTIME_PROJECTION_SHARD_COUNT) {
    throw new Error('专业运行时投影覆盖合同异常');
  }
  const scored = (Array.isArray(index?.majors) ? index.majors : []).map(item => {
    const key = normalizeMajor(item?.key || item?.label);
    let score = 0;
    for (const q of queries) {
      if (key === q) score = Math.max(score, 4);
      else if (key.startsWith(q) || q.startsWith(key)) score = Math.max(score, 3);
      else if (key.includes(q) || q.includes(key)) score = Math.max(score, 2);
    }
    return { item, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || Number(b.item?.projects2026 || 0) - Number(a.item?.projects2026 || 0));
  if (!scored.length) return { manifest: index, records: [], rawScanned: 0, shardFiles: [], modes: ['major-runtime-projection'], cacheStatus: 'bounded-projection', elapsedMs: Date.now() - started };
  const selected = scored.slice(0, 24).map(x => x.item);
  const shardFiles = [...new Set(selected.map(item => item.chunk).filter(Boolean))];
  if (shardFiles.length > 12) throw new Error(`专业运行时投影查询过宽，请输入更具体的专业名称：${shardFiles.length} shards`);
  const shardByFile = new Map();
  for (const file of shardFiles) shardByFile.set(file, await loadMajorShard(context, file));
  const records = [], seen = new Set();
  for (const item of selected) {
    const key = item.key || item.label;
    const major = shardByFile.get(item.chunk)?.majors?.[key];
    if (!major) throw new Error(`专业运行时投影缺失：${item.label || key}`);
    for (const raw of recordsFromMajor(major)) {
      const id = clean(raw?.uid, 240) || [raw?.schoolCode, raw?.majorCode, raw?.school, raw?.major, raw?.score, raw?.rank].join('|');
      if (seen.has(id)) continue;
      seen.add(id); records.push(raw);
    }
  }
  return { manifest: index, records, rawScanned: records.length, shardFiles, modes: ['major-runtime-projection'], cacheStatus: 'bounded-projection', elapsedMs: Date.now() - started, projectionVersion: MAJOR_RUNTIME_PROJECTION_VERSION };
}

'''
    s = s.replace(marker, addition + marker, 1)
    path.write_text(s, encoding='utf-8')


def rewrite_background_engine():
    path = ROOT / 'functions/_lib/background-position-engine.js'
    s = path.read_text(encoding='utf-8')
    s = s.replace("import { loadAllRecords, loadManifest } from './ln-rank-manifest.js';\nimport { fetchFenxiJson } from './fenxi-fetcher.js';", "import { selectMajorBandsStaticBuckets, loadMajorBandsStaticBucket } from './major-bands-static-provider.js';\nimport { loadSchoolRuntimeRecords, loadMajorRuntimeRecords } from './school-record-runtime-provider.vnext.js';")
    start = s.index('export async function loadBackgroundMatchedRecords')
    end = s.index('\nexport function sortByPositionDistance', start)
    replacement = r'''export async function loadBackgroundMatchedRecords(request, env, filters = {}, config = {}) {
  const out = [];
  const max = Math.max(20, Math.min(500, Number(filters.max || 180)));
  const hasScoreWindow = Number.isFinite(Number(filters.maxScore)) || Number.isFinite(Number(filters.minScore));
  let manifest = null;
  let rawTotal = 0;
  let windowCandidateCount = 0;
  let normalizedCount = 0;
  let matchedBeforeLimit = 0;
  let failedChunk = '';
  let chunksRead = 0;
  let chunksSkipped = 0;
  let runtimeMode = '';

  const handleRaw = raw => {
    rawTotal += 1;
    if (hasScoreWindow && !inScoreWindowRaw(raw, filters)) return;
    if (!rawTextPass(raw, filters)) return;
    windowCandidateCount += 1;
    const normalized = raw?.school && raw?.major && Number.isFinite(Number(raw?.score2026 ?? raw?.score))
      ? { ...raw, score: Number(raw.score2026 ?? raw.score), rank: Number(raw.rank2026 ?? raw.rank) }
      : normalizeRecord(raw);
    const record = normalized;
    if (!record.school || !record.major || !Number.isFinite(Number(record.score2026 ?? record.score))) return;
    normalizedCount += 1;
    record.rawText = JSON.stringify(raw).slice(0, 1600);
    const hit = config.matchRecord(record, raw);
    if (!hit) return;
    if (!levelPass(hit.level, filters.level || 'all')) return;
    if (!publicPass(record, filters.natureMode || 'all')) return;
    matchedBeforeLimit += 1;
    if (out.length < max) out.push(shapeBackgroundRecord(record, hit, filters, config));
  };

  try {
    if (hasScoreWindow) {
      const min = Number.isFinite(Number(filters.minScore)) ? Number(filters.minScore) : 0;
      const maxScore = Number.isFinite(Number(filters.maxScore)) ? Number(filters.maxScore) : 750;
      const selected = await selectMajorBandsStaticBuckets(request, { min, max: maxScore, minScore: min, maxScore }, { assets: env?.ASSETS });
      manifest = selected.manifest;
      const buckets = selected.buckets || [];
      for (const bucket of buckets) {
        const loaded = await loadMajorBandsStaticBucket(request, bucket.file, { min, max: maxScore, minScore: min, maxScore }, { assets: env?.ASSETS });
        chunksRead += 1;
        for (const raw of loaded.records || []) handleRaw(raw);
      }
      runtimeMode = 'bounded-score-buckets';
    } else if (clean(filters.school || '', 80)) {
      const loaded = await loadSchoolRuntimeRecords({ request, env: env || {} }, { schoolNames: [filters.school] });
      manifest = loaded.manifest;
      chunksRead = loaded.shardFiles?.length || 0;
      for (const raw of loaded.records || []) handleRaw(raw);
      runtimeMode = 'bounded-school-projection';
    } else if (clean(filters.major || '', 80)) {
      const loaded = await loadMajorRuntimeRecords({ request, env: env || {} }, { majorNames: [filters.major] });
      manifest = loaded.manifest;
      chunksRead = loaded.shardFiles?.length || 0;
      for (const raw of loaded.records || []) handleRaw(raw);
      runtimeMode = 'bounded-major-projection';
    } else {
      runtimeMode = 'no-unbounded-query';
    }
  } catch (error) {
    failedChunk = error?.message || String(error);
    throw error;
  }

  const candidate = Number(filters.candidateScore);
  const rawKey = config.rawKey || 'backgroundRaw';
  out.sort((a, b) => {
    if (Number.isFinite(candidate)) {
      const da = Math.abs(Number(a.score2026 || 0) - candidate);
      const db = Math.abs(Number(b.score2026 || 0) - candidate);
      if (da !== db) return da - db;
    }
    return levelWeightByRaw(b, rawKey) - levelWeightByRaw(a, rawKey)
      || Number(b.score2026 || 0) - Number(a.score2026 || 0)
      || rankSort(a.rank2026) - rankSort(b.rank2026);
  });

  return {
    records: out,
    scannedCount: rawTotal,
    rawScanned: rawTotal,
    windowCandidateCount,
    normalizedCount,
    matchedCount: matchedBeforeLimit,
    dataReadOk: true,
    failedChunk,
    manifest,
    chunksRead,
    chunksSkipped,
    runtimeMode,
    positionContext: buildCandidatePositionContext(filters.candidateScore)
  };
}
'''
    s = s[:start] + replacement + s[end:]
    path.write_text(s, encoding='utf-8')


def rewrite_major_window():
    path = ROOT / 'functions/api/major-window.js'
    path.write_text(r'''import { hasFenxiSecret } from '../_lib/fenxi-session.js';
import { selectMajorBandsStaticBuckets, loadMajorBandsStaticBucket } from '../_lib/major-bands-static-provider.js';
import { buildMajorWindow } from '../_lib/major-window-engine.js';
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function clean(value,max=50){return String(value||'').trim().slice(0,max);}
async function loadWindow(request,env,viewScore){
  const scoreWindow={min:viewScore-25,max:viewScore+10,minScore:viewScore-25,maxScore:viewScore+10};
  const options={assets:env?.ASSETS};
  const {manifest,buckets}=await selectMajorBandsStaticBuckets(request,scoreWindow,options);
  const records=[];const bucketFiles=[];let decodedRows=0;
  for(const bucket of buckets||[]){const loaded=await loadMajorBandsStaticBucket(request,bucket.file,scoreWindow,options);records.push(...(loaded.records||[]));decodedRows+=Number(loaded.rowCount||0);bucketFiles.push(bucket.file);}
  return{manifest,records,bucketFiles,decodedRows};
}
// 兼容旧版滑轨接口；运行时不再允许全量招生表扫描。
export async function onRequest(context){
  if(context.request.method!=='GET')return json({ok:false,message:'只支持 GET 请求。'},405);
  try{
    const url=new URL(context.request.url);const candidateScore=Math.round(Number(url.searchParams.get('candidateScore')||520));const viewScore=Math.round(Number(url.searchParams.get('viewScore')||candidateScore));
    const filters={region:clean(url.searchParams.get('region')||'all',20),schoolKeyword:clean(url.searchParams.get('schoolKeyword')||'',40),majorKeyword:clean(url.searchParams.get('majorKeyword')||'',40)};
    if(!Number.isFinite(candidateScore)||!Number.isFinite(viewScore))return json({ok:false,message:'分数格式不正确。'},400);
    const loaded=await loadWindow(context.request,context.env||{},viewScore);const groups=buildMajorWindow(loaded.records,{candidateScore,viewScore,filters});
    const counts={upper:groups.upper.count,near:groups.near.count,lower:groups.lower.count};counts.total=counts.upper+counts.near+counts.lower;
    return json({ok:true,legacy:true,message:'这是旧版 /api/major-window 兼容接口；已改为按当前分数窗口读取静态 score buckets。',meta:{candidateScore,viewScore,dataScope:'辽宁2026物理类'},groups,counts,source:{manifestVersion:loaded.manifest?.version||'',totalRecords:loaded.manifest?.recordCount||11628,mode:'bounded-major-bands-static-buckets',bucketFiles:loaded.bucketFiles,decodedRows:loaded.decodedRows,sessionMode:hasFenxiSecret(context.env||{})?'server-signed-cookie':'no-secret-detected'}});
  }catch(error){return json({ok:false,message:error?.message||String(error),hint:'请检查 major-bands-static-v3972_2 静态资源。'},500);}
}
''', encoding='utf-8')


def rewrite_school_geo_audit():
    path = ROOT / 'functions/api/school-geo-audit.js'
    path.write_text(r'''import { normalizeSchoolGeo, getSchoolGeoDbSize, getSchoolGeoSourceMeta } from '../_lib/school-geo-normalizer.js';
import { aliasCount } from '../_lib/school-alias-map.js';
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function clean(value,max=60){return String(value||'').trim().slice(0,max);}
async function fetchIndex(context){const url=new URL('/data/zy2026/school-index.json',context.request.url);const req=new Request(url,{headers:{accept:'application/json'}});const res=context.env?.ASSETS?.fetch?await context.env.ASSETS.fetch(req):await fetch(req);if(!res.ok)throw new Error(`学校投影索引读取失败 HTTP ${res.status}`);return res.json();}
export async function onRequest(context){
  if(context.request.method!=='GET')return json({ok:false,message:'只支持 GET 请求。'},405);
  try{
    const url=new URL(context.request.url);const limit=Math.max(10,Math.min(1000,Number(url.searchParams.get('limit')||300)));const keyword=clean(url.searchParams.get('keyword')||'',50);const index=await fetchIndex(context);
    const schools=[];
    for(const item of Array.isArray(index?.schools)?index.schools:[]){if(keyword&&!String(item.name||'').includes(keyword))continue;const geo=normalizeSchoolGeo(item.name||'')||{};const recordCount=Number(item.recordCount2026??item.projects2026??0);schools.push({school:item.name||'',count:recordCount,majors:Number(item.uniqueMajorCount2026||0),displayLocation:geo.displayLocation||[item.province,item.city].filter(Boolean).join(' · '),province:geo.province||item.province||'',city:geo.city||item.city||'',geoEntity:geo.geoEntity||'',schoolCanonical:geo.schoolCanonical||item.name||'',locationSource:geo.locationSource||'zy2026-school-index',locationConfidence:geo.locationConfidence||((item.province||item.city)?'medium':'low'),locationWarning:geo.locationWarning||'',geoSourceMethod:geo.geoSourceMethod||'',geoSourceYear:geo.geoSourceYear||'',geoMatchNote:geo.geoMatchNote||'',schoolIdentifier:geo.schoolIdentifier||'',status:(geo.locationConfidence==='low'||(!geo.geoEntity&&!item.province&&!item.city))?'needs-review':'mapped'});}
    schools.sort((a,b)=>b.count-a.count||a.school.localeCompare(b.school,'zh-CN'));const summary={uniqueSchools:schools.length,mapped:schools.filter(s=>s.status==='mapped').length,needsReview:schools.filter(s=>s.status==='needs-review').length,geoDbSize:getSchoolGeoDbSize(),aliasCount:aliasCount(),sourceMeta:getSchoolGeoSourceMeta?getSchoolGeoSourceMeta():null,manifestVersion:index?.version||'',projectionVersion:index?.runtimeProjectionVersion||'',totalRecords:Number(index?.runtimeProjectionRecordCount||0),runtimeMode:'school-index-only-no-admission-scan'};
    return json({ok:true,summary,schools:schools.slice(0,limit)});
  }catch(error){return json({ok:false,message:error?.message||String(error),hint:'请确认 /data/zy2026/school-index.json 已部署。'},500);}
}
''', encoding='utf-8')


def rewrite_fenxi_catalog():
    path = ROOT / 'functions/api/fenxi-catalog.js'
    path.write_text(r'''function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function clean(value,max=60){return String(value||'').trim().slice(0,max);}
async function fetchAssetJson(context,pathname){const url=new URL(pathname,context.request.url);const req=new Request(url,{headers:{accept:'application/json'}});const res=context.env?.ASSETS?.fetch?await context.env.ASSETS.fetch(req):await fetch(req);if(!res.ok)throw new Error(`静态目录读取失败 ${pathname} HTTP ${res.status}`);return res.json();}
function schoolRow(item={}){return{school:item.name||'',recordCount:Number(item.recordCount2026??item.projects2026??0),majorCount:Number(item.uniqueMajorCount2026||0),minScore2025:item.minScore2025??'',maxScore2025:item.maxScore2025??'',bestRank2025:item.bestRank2025??'',displayLocation:[item.province,item.city].filter(Boolean).join(' · '),province:item.province||'',city:item.city||'',geoEntity:'',schoolCanonical:item.name||'',natureLabel:item.nature||'',schoolTags:'',locationConfidence:(item.province||item.city)?'medium':'low',locationWarning:'',sampleMajors:Array.isArray(item.sampleMajors2026)?item.sampleMajors2026.join('；'):''};}
function majorRow(item={}){return{major:item.label||item.key||'',direction:item.direction||'',recordCount:Number(item.recordCount2026??item.projects2026??0),schoolCount:Number(item.schools2026||0),minScore2025:item.minScore2025??'',maxScore2025:item.maxScore2025??'',bestRank2025:item.bestRank2025??'',sampleSchools:Array.isArray(item.sampleSchools2026)?item.sampleSchools2026.join('；'):'',summary:item.summary||''};}
export async function onRequest(context){
  if(context.request.method!=='GET')return json({ok:false,message:'只支持 GET 请求。'},405);
  try{
    const url=new URL(context.request.url);const type=clean(url.searchParams.get('type')||'summary',30);const format=clean(url.searchParams.get('format')||'json',20);const keyword=clean(url.searchParams.get('keyword')||'',60);const limit=Math.max(1,Math.min(5000,Number(url.searchParams.get('limit')||1000)));
    if(format==='csv'||type==='school-major'){return json({ok:false,code:'legacy_full_scan_catalog_retired',message:'旧版动态全表导出已退役，因为它会在 Worker 内扫描全部招生记录。请使用 build-time ZY2026 学校/专业索引；不会用运行时全表扫描模拟旧接口。',resources:{schools:'/data/zy2026/school-index.json',majors:'/data/zy2026/major-index.json'}},410);}
    const [schoolIndex,majorIndex]=await Promise.all([fetchAssetJson(context,'/data/zy2026/school-index.json'),fetchAssetJson(context,'/data/zy2026/major-index.json')]);
    let schools=(Array.isArray(schoolIndex?.schools)?schoolIndex.schools:[]).map(schoolRow);let majors=(Array.isArray(majorIndex?.majors)?majorIndex.majors:[]).map(majorRow);
    if(keyword){schools=schools.filter(x=>x.school.includes(keyword)||x.sampleMajors.includes(keyword));majors=majors.filter(x=>x.major.includes(keyword)||x.direction.includes(keyword)||x.sampleSchools.includes(keyword));}
    const summary={ok:true,legacy:true,runtimeMode:'build-time-index-only',manifestVersion:schoolIndex?.sourceManifestVersion||majorIndex?.sourceManifestVersion||'',totalRawRecords:Number(schoolIndex?.runtimeProjectionRecordCount||majorIndex?.runtimeProjectionRecordCount||11628),uniqueSchools:schools.length,majorCatalogEntries:majors.length,keyword,generatedAt:null,resources:{schools:'/data/zy2026/school-index.json',majors:'/data/zy2026/major-index.json'}};
    if(type==='schools')return json({...summary,type,schools:schools.slice(0,limit)});
    if(type==='major-pool')return json({...summary,type,majorPool:majors.slice(0,limit),majorPoolMode:'major-index-summary-not-runtime-record-scan'});
    return json({...summary,type:'summary',preview:{schools:schools.slice(0,20),majorPool:majors.slice(0,20),schoolMajor:[]},downloads:{schoolsJson:'/data/zy2026/school-index.json',majorIndexJson:'/data/zy2026/major-index.json'}});
  }catch(error){return json({ok:false,message:error?.message||String(error),hint:'请确认 ZY2026 build-time indexes 已部署。'},500);}
}
''', encoding='utf-8')


def strip_fenxi_full_loader():
    path = ROOT / 'functions/_lib/fenxi-manifest.js'
    path.write_text("import{fetchFenxiJson}from'./fenxi-fetcher.js';let mc=null;const TTL=5*60*1000;function fresh(i){return i&&Date.now()-i.time<TTL}export async function loadManifest(request,env){if(fresh(mc))return mc.data;const data=await fetchFenxiJson(request,env,'manifest.json');mc={time:Date.now(),data};return data}\n", encoding='utf-8')


def write_verifier():
    path = ROOT / 'tools/verify-major-runtime-projection-vnext.mjs'
    path.write_text(r'''import fs from 'node:fs';import path from 'node:path';
const norm=v=>String(v??'').trim().replaceAll(' ','');const id=r=>[r.schoolCode2026??r.schoolCode,r.majorCode2026??r.majorCode,r.school??r.schoolName,r.major??r.majorName,r.score2026??r.score,r.rank2026??r.rank].map(norm).join('|');
const rawManifest=JSON.parse(fs.readFileSync('fenxi/data/ln-rank-2026/manifest.json','utf8'));const raw=[];for(const ch of rawManifest.chunks||[]){const rel=ch.file||ch.path;const candidates=[path.join('fenxi',rel),rel,path.join('fenxi/data/ln-rank-2026',path.basename(rel))];const f=candidates.find(fs.existsSync);if(!f)throw new Error(`raw missing ${rel}`);const d=JSON.parse(fs.readFileSync(f,'utf8'));raw.push(...(Array.isArray(d)?d:d.records||[]));}
const index=JSON.parse(fs.readFileSync('data/zy2026/major-index.json','utf8'));if(index.runtimeProjectionShardCount!==100||index.runtimeProjectionRecordCount!==11628)throw new Error('major projection metadata');const projected=[];const chunks=new Set();for(const item of index.majors||[]){chunks.add(item.chunk);const payload=JSON.parse(fs.readFileSync(path.join('data/zy2026/chunks',item.chunk),'utf8'));const major=payload.majors?.[item.key];if(!major)throw new Error(`major missing ${item.key}`);projected.push(...(major.relations||[]).flatMap(r=>r.records2026||[]));}
const count=a=>{const m=new Map();for(const r of a)m.set(id(r),(m.get(id(r))||0)+1);return m};const a=count(raw),b=count(projected);const mismatch=[...a].filter(([k,v])=>(b.get(k)||0)!==v).length+[...b].filter(([k,v])=>(a.get(k)||0)!==v).length;if(raw.length!==11628||projected.length!==11628||mismatch||[...b.values()].some(v=>v!==1))throw new Error(JSON.stringify({raw:raw.length,projected:projected.length,mismatch}));const files=fs.readdirSync('data/zy2026/chunks').filter(x=>/^major-\d{2}\.json$/.test(x));const maxBytes=Math.max(...files.map(x=>fs.statSync(path.join('data/zy2026/chunks',x)).size));if(files.length!==100||maxBytes>350000)throw new Error(JSON.stringify({files:files.length,maxBytes}));console.log(JSON.stringify({ok:true,sourceRecords:raw.length,projectionRecords:projected.length,majorEntries:(index.majors||[]).length,shards:files.length,maxBytes,missing:0,duplicate:0},null,2));
''', encoding='utf-8')


def strengthen_audit():
    path = ROOT / 'tools/audit-worker-resource-architecture-vnext.mjs'
    s = path.read_text(encoding='utf-8')
    insert = """
const majorIndex=JSON.parse(fs.readFileSync('data/zy2026/major-index.json','utf8'));
if(majorIndex.runtimeProjectionShardCount!==100||majorIndex.runtimeProjectionRecordCount!==11628) violations.push('major projection: coverage metadata invalid');
const majorShardFiles=fs.readdirSync('data/zy2026/chunks').filter(n=>/^major-\\d{2}\\.json$/.test(n));
if(majorShardFiles.length!==100) violations.push(`major projection: shard count ${majorShardFiles.length}`);
const maxMajorBytes=Math.max(...majorShardFiles.map(n=>fs.statSync(path.join('data/zy2026/chunks',n)).size));
if(maxMajorBytes>350000) violations.push(`major projection: shard budget exceeded ${maxMajorBytes}`);
for(const required of ['functions/_lib/background-position-engine.js','functions/api/major-window.js','functions/api/school-geo-audit.js','functions/api/fenxi-catalog.js']){const t=fs.readFileSync(required,'utf8');if(t.includes('loadAllRecords'))violations.push(`${required}: legacy full loader remains`);}
const bg=fs.readFileSync('functions/_lib/background-position-engine.js','utf8');if(!bg.includes('loadMajorRuntimeRecords')||!bg.includes('loadSchoolRuntimeRecords')||!bg.includes('loadMajorBandsStaticBucket'))violations.push('background-position-engine: bounded owners missing');
const legacy=fs.readFileSync('functions/api/major-window.js','utf8');if(!legacy.includes('bounded-major-bands-static-buckets'))violations.push('major-window: bounded compatibility owner missing');
const catalog=fs.readFileSync('functions/api/fenxi-catalog.js','utf8');if(!catalog.includes('legacy_full_scan_catalog_retired'))violations.push('fenxi-catalog: unsafe full export not retired');
"""
    s = s.replace("if(violations.length){", insert + "\nif(violations.length){", 1)
    s = s.replace("reportOwner:'major-bands-static-v3972_2'", "reportOwner:'major-bands-static-v3972_2',majorProjection:{records:11628,shards:100,maxBytes:maxMajorBytes}")
    path.write_text(s, encoding='utf-8')


augment_school_index()
repartition_major_projection()
extend_runtime_provider()
rewrite_background_engine()
rewrite_major_window()
rewrite_school_geo_audit()
rewrite_fenxi_catalog()
strip_fenxi_full_loader()
write_verifier()
strengthen_audit()
print('remaining Worker full-load consumers migrated to bounded projection owners')
