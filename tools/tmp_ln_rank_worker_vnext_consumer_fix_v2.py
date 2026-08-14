from pathlib import Path
import json, re, runpy
from collections import Counter, defaultdict

ROOT = Path('.')
MAJOR_PROJECTION_VERSION = 'ln-rank-major-runtime-projection-vnext-100-shard-v1'
SHARD_COUNT = 100


def dump(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def norm(v):
    return str(v or '').strip().replace(' ', '')


def identity(r):
    return '|'.join([
        norm(r.get('schoolCode2026', r.get('schoolCode', ''))),
        norm(r.get('majorCode2026', r.get('majorCode', ''))),
        norm(r.get('school', r.get('schoolName', ''))),
        norm(r.get('major', r.get('majorName', ''))),
        norm(r.get('score2026', r.get('score', ''))),
        norm(r.get('rank2026', r.get('rank', ''))),
    ])


def fnv1a(text):
    h = 2166136261
    for b in str(text).encode('utf-8'):
        h ^= b
        h = (h * 16777619) & 0xffffffff
    return h


def relation_rows(node, field='records2026'):
    out = []
    for rel in node.get('relations', []) or []:
        out.extend(rel.get(field, []) or [])
    return out


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


def numeric(values):
    out = []
    for value in values:
        try:
            n = int(float(value))
            out.append(n)
        except (TypeError, ValueError):
            pass
    return out


def add_school_catalog_fields():
    index_path = ROOT / 'data/zy2026/school-index.json'
    chunks_dir = ROOT / 'data/zy2026/chunks'
    index = json.loads(index_path.read_text(encoding='utf-8'))
    cache = {}
    for item in index.get('schools') or []:
        chunk, key = item.get('chunk'), item.get('key')
        if not chunk or not key:
            continue
        if chunk not in cache:
            cache[chunk] = json.loads((chunks_dir / chunk).read_text(encoding='utf-8'))
        node = (cache[chunk].get('schools') or {}).get(key)
        if node is None:
            raise SystemExit(f'school projection node missing: {key}')
        rows26 = relation_rows(node, 'records2026')
        rows25 = relation_rows(node, 'records2025')
        # School relations are identity-preserving for 2026 after relation assignment.
        unique26 = {identity(r): r for r in rows26}
        scores26 = numeric(r.get('score') for r in unique26.values())
        ranks26 = [n for n in numeric(r.get('rank') for r in unique26.values()) if n > 0]
        scores25 = numeric(r.get('score') for r in rows25)
        ranks25 = [n for n in numeric(r.get('rank') for r in rows25) if n > 0]
        majors = []
        for r in unique26.values():
            m = str(r.get('major') or '').strip()
            if m and m not in majors:
                majors.append(m)
        item.update({
            'recordCount2026': len(unique26),
            'uniqueMajorCount2026': len(majors),
            'minScore2026': min(scores26) if scores26 else None,
            'maxScore2026': max(scores26) if scores26 else None,
            'bestRank2026': min(ranks26) if ranks26 else None,
            'minScore2025': min(scores25) if scores25 else None,
            'maxScore2025': max(scores25) if scores25 else None,
            'bestRank2025': min(ranks25) if ranks25 else None,
            'sampleMajors2026': majors[:8],
        })
    index['catalogProjectionVersion'] = 'zy2026-index-catalog-vnext-v1'
    dump(index_path, index)


def repartition_major_with_exact_runtime():
    index_path = ROOT / 'data/zy2026/major-index.json'
    chunks_dir = ROOT / 'data/zy2026/chunks'
    index = json.loads(index_path.read_text(encoding='utf-8'))
    old_files = sorted(chunks_dir.glob('major-*.json'))
    if not old_files:
        raise SystemExit('major projection shards missing')
    nodes = {}
    template = {}
    for file in old_files:
        payload = json.loads(file.read_text(encoding='utf-8'))
        if not template:
            template = {k: v for k, v in payload.items() if k != 'majors'}
        for key, node in (payload.get('majors') or {}).items():
            if key in nodes:
                # Original generator keys by base; if repeated, relation payload must be identical enough to merge.
                existing = nodes[key]
                seen = {r.get('relationId') for r in existing.get('relations', [])}
                for rel in node.get('relations', []) or []:
                    if rel.get('relationId') not in seen:
                        existing.setdefault('relations', []).append(rel)
                continue
            nodes[key] = node

    raw_manifest, raw_rows = load_raw_truth()
    zy = runpy.run_path(str(ROOT / 'tools/ln-2026/build-zy2026-structure.py'), run_name='zybuild_runtime_projection')
    code_names = {}
    for row in raw_rows:
        school_code = str(row.get('schoolCode2026') or row.get('schoolCode') or '').strip()
        school = str(row.get('school') or row.get('schoolName') or '').strip()
        if school_code and school:
            code_names[school_code] = zy['school_alias'](school)
    exact_records = zy['make_records'](raw_rows, 2026, code_names)
    if len(exact_records) != 11628:
        raise SystemExit(f'canonical ZY record build mismatch: {len(exact_records)}')
    runtime = defaultdict(list)
    labels = {}
    for record in exact_records:
        key = record.base or zy['normalize'](record.major)
        if not key:
            key = f'raw:{record.uid}'
        runtime[key].append(record.compact())
        labels.setdefault(key, re.sub(r'\([^()]*\)', '', record.major).strip() or record.major)

    for key, rows in runtime.items():
        node = nodes.setdefault(key, {'summary': {'key': key, 'label': labels.get(key, key)}, 'relations': []})
        node['runtimeRecords2026'] = rows
        node['runtimeRecordCount2026'] = len(rows)
    for key, node in nodes.items():
        node.setdefault('runtimeRecords2026', [])
        node['runtimeRecordCount2026'] = len(node['runtimeRecords2026'])

    projected = [r for key in sorted(runtime) for r in runtime[key]]
    a, b = Counter(identity(r) for r in raw_rows), Counter(identity(r) for r in projected)
    if len(projected) != 11628 or a != b or any(v != 1 for v in b.values()):
        raise SystemExit(f'exact major runtime parity failed projected={len(projected)} missing={list((a-b).items())[:3]} extra={list((b-a).items())[:3]}')

    buckets = [dict() for _ in range(SHARD_COUNT)]
    for key in sorted(nodes):
        buckets[fnv1a(key) % SHARD_COUNT][key] = nodes[key]
    for file in old_files:
        file.unlink()
    shard_stats = []
    for i, majors in enumerate(buckets):
        filename = f'major-{i:02d}.json'
        runtime_count = sum(len(node.get('runtimeRecords2026') or []) for node in majors.values())
        payload = dict(template)
        payload.update({'projectionVersion': MAJOR_PROJECTION_VERSION, 'shard': filename, 'majorCount': len(majors), 'runtimeRecordCount2026': runtime_count, 'majors': majors})
        dump(chunks_dir / filename, payload)
        shard_stats.append({'file': filename, 'majorCount': len(majors), 'runtimeRecordCount2026': runtime_count})

    ui_items = index.get('majors') or []
    for item in ui_items:
        key = item.get('key') or item.get('label')
        if key in nodes:
            item['chunk'] = f'major-{fnv1a(key) % SHARD_COUNT:02d}.json'
    runtime_items = []
    for key in sorted(runtime):
        rows = runtime[key]
        scores = numeric(r.get('score') for r in rows)
        ranks = [n for n in numeric(r.get('rank') for r in rows) if n > 0]
        schools = []
        for r in rows:
            school = str(r.get('school') or '').strip()
            if school and school not in schools:
                schools.append(school)
        runtime_items.append({
            'key': key,
            'label': labels.get(key, key),
            'chunk': f'major-{fnv1a(key) % SHARD_COUNT:02d}.json',
            'recordCount2026': len(rows),
            'schoolCount2026': len(schools),
            'minScore2026': min(scores) if scores else None,
            'maxScore2026': max(scores) if scores else None,
            'bestRank2026': min(ranks) if ranks else None,
            'sampleSchools2026': schools[:8],
        })
    index.update({
        'runtimeProjectionVersion': MAJOR_PROJECTION_VERSION,
        'runtimeProjectionShardCount': SHARD_COUNT,
        'runtimeProjectionRecordCount': 11628,
        'runtimeProjectionMajorCount': len(runtime_items),
        'runtimeProjectionShards': shard_stats,
        'runtimeMajors': runtime_items,
        'sourceManifestVersion': raw_manifest.get('version', ''),
    })
    dump(index_path, index)
    max_bytes = max((chunks_dir / s['file']).stat().st_size for s in shard_stats)
    if max_bytes > 350_000:
        raise SystemExit(f'major projection shard exceeds 350KB budget: {max_bytes}')
    print(json.dumps({'majorRuntimeRecords': 11628, 'runtimeMajorKeys': len(runtime_items), 'shards': SHARD_COUNT, 'maxShardBytes': max_bytes, 'missing': 0, 'duplicate': 0}, ensure_ascii=False))


def append_major_runtime_provider():
    path = ROOT / 'functions/_lib/school-record-runtime-provider.vnext.js'
    s = path.read_text(encoding='utf-8')
    marker = 'export function schoolRuntimeProjectionCachePolicy() {'
    if marker not in s:
        raise SystemExit('school runtime provider marker missing')
    addition = r'''export const MAJOR_RUNTIME_PROJECTION_VERSION = 'ln-rank-major-runtime-projection-vnext-100-shard-v1';
export const MAJOR_RUNTIME_PROJECTION_INDEX_PATH = '/data/zy2026/major-index.json';
export const MAJOR_RUNTIME_PROJECTION_TOTAL_RECORDS = 11628;
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
  const pathname = `${SCHOOL_RUNTIME_PROJECTION_CHUNK_PREFIX}${chunk}`;
  const key = `${new URL(context.request.url).origin}${pathname}`;
  return cacheWrite(majorShardCache, key, () => fetchAssetJson(context, pathname), 4);
}
export async function loadMajorRuntimeRecords(context, options = {}) {
  const started = Date.now();
  const queries = [...new Set((options.majorNames || []).map(normalizeMajor).filter(Boolean))];
  if (!queries.length) throw new Error('专业运行时投影缺少专业名称');
  const index = await loadMajorIndex(context);
  if (index?.runtimeProjectionVersion !== MAJOR_RUNTIME_PROJECTION_VERSION
      || Number(index?.runtimeProjectionRecordCount) !== MAJOR_RUNTIME_PROJECTION_TOTAL_RECORDS
      || Number(index?.runtimeProjectionShardCount) !== 100) throw new Error('专业运行时投影覆盖合同异常');
  const candidates = (Array.isArray(index?.runtimeMajors) ? index.runtimeMajors : []).map(item => {
    const key = normalizeMajor(item?.key || item?.label);
    let score = 0;
    for (const q of queries) {
      if (key === q) score = Math.max(score, 4);
      else if (key.startsWith(q) || q.startsWith(key)) score = Math.max(score, 3);
      else if (key.includes(q) || q.includes(key)) score = Math.max(score, 2);
    }
    return { item, score };
  }).filter(x => x.score > 0).sort((a,b)=>b.score-a.score || Number(b.item.recordCount2026||0)-Number(a.item.recordCount2026||0));
  if (!candidates.length) return { manifest:index, records:[], rawScanned:0, shardFiles:[], modes:['major-runtime-projection'], cacheStatus:'bounded-projection', elapsedMs:Date.now()-started };
  const selected = candidates.slice(0, 48).map(x=>x.item);
  const shardFiles = [...new Set(selected.map(item=>item.chunk).filter(Boolean))];
  if (shardFiles.length > 16) throw new Error('专业名称范围过宽，请输入更具体的专业名称。');
  const shardByFile = new Map();
  for (const file of shardFiles) shardByFile.set(file, await loadMajorShard(context, file));
  const records=[], seen=new Set();
  for (const item of selected) {
    const node = shardByFile.get(item.chunk)?.majors?.[item.key];
    if (!node) throw new Error(`专业运行时投影缺失：${item.label||item.key}`);
    for (const raw of node.runtimeRecords2026 || []) {
      const id = clean(raw?.uid,240) || [raw?.schoolCode,raw?.majorCode,raw?.school,raw?.major,raw?.score,raw?.rank].join('|');
      if (!id || seen.has(id)) continue;
      seen.add(id); records.push(raw);
    }
  }
  return { manifest:index, records, rawScanned:records.length, shardFiles, modes:['major-runtime-projection'], cacheStatus:'bounded-projection', elapsedMs:Date.now()-started, projectionVersion:MAJOR_RUNTIME_PROJECTION_VERSION };
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
  const out=[]; const max=Math.max(20,Math.min(500,Number(filters.max||180)));
  const hasScoreWindow=Number.isFinite(Number(filters.maxScore))||Number.isFinite(Number(filters.minScore));
  let manifest=null,rawTotal=0,windowCandidateCount=0,normalizedCount=0,matchedBeforeLimit=0,failedChunk='',chunksRead=0,chunksSkipped=0,runtimeMode='';
  const handleRaw=raw=>{
    rawTotal+=1; if(hasScoreWindow&&!inScoreWindowRaw(raw,filters))return; if(!rawTextPass(raw,filters))return; windowCandidateCount+=1;
    const record=normalizeRecord(raw); if(!record.school||!record.major||!Number.isFinite(Number(record.score2026??record.score)))return; normalizedCount+=1; record.rawText=JSON.stringify(raw).slice(0,1600);
    const hit=config.matchRecord(record,raw); if(!hit||!levelPass(hit.level,filters.level||'all')||!publicPass(record,filters.natureMode||'all'))return;
    matchedBeforeLimit+=1; if(out.length<max)out.push(shapeBackgroundRecord(record,hit,filters,config));
  };
  try{
    if(hasScoreWindow){
      const min=Number.isFinite(Number(filters.minScore))?Number(filters.minScore):0,maxScore=Number.isFinite(Number(filters.maxScore))?Number(filters.maxScore):750;
      const scoreWindow={min,max:maxScore}; const options={assets:env?.ASSETS}; const selected=await selectMajorBandsStaticBuckets(request,scoreWindow,options); manifest=selected.manifest;
      for(const bucket of selected.buckets||[]){const loaded=await loadMajorBandsStaticBucket(request,bucket.file,scoreWindow,options);chunksRead+=1;for(const raw of loaded.records||[])handleRaw(raw);} runtimeMode='bounded-score-buckets';
    }else if(clean(filters.school||'',80)){
      const loaded=await loadSchoolRuntimeRecords({request,env:env||{}},{schoolNames:[filters.school]});manifest=loaded.manifest;chunksRead=loaded.shardFiles?.length||0;for(const raw of loaded.records||[])handleRaw(raw);runtimeMode='bounded-school-projection';
    }else if(clean(filters.major||'',80)){
      const loaded=await loadMajorRuntimeRecords({request,env:env||{}},{majorNames:[filters.major]});manifest=loaded.manifest;chunksRead=loaded.shardFiles?.length||0;for(const raw of loaded.records||[])handleRaw(raw);runtimeMode='bounded-major-projection';
    }else runtimeMode='no-unbounded-query';
  }catch(error){failedChunk=error?.message||String(error);throw error;}
  const candidate=Number(filters.candidateScore),rawKey=config.rawKey||'backgroundRaw';
  out.sort((a,b)=>{if(Number.isFinite(candidate)){const da=Math.abs(Number(a.score2026||0)-candidate),db=Math.abs(Number(b.score2026||0)-candidate);if(da!==db)return da-db;}return levelWeightByRaw(b,rawKey)-levelWeightByRaw(a,rawKey)||Number(b.score2026||0)-Number(a.score2026||0)||rankSort(a.rank2026)-rankSort(b.rank2026);});
  return{records:out,scannedCount:rawTotal,rawScanned:rawTotal,windowCandidateCount,normalizedCount,matchedCount:matchedBeforeLimit,dataReadOk:true,failedChunk,manifest,chunksRead,chunksSkipped,runtimeMode,positionContext:buildCandidatePositionContext(filters.candidateScore)};
}
'''
    s = s[:start] + replacement + s[end:]
    path.write_text(s, encoding='utf-8')


def rewrite_major_window():
    (ROOT / 'functions/api/major-window.js').write_text(r'''import { hasFenxiSecret } from '../_lib/fenxi-session.js';
import { selectMajorBandsStaticBuckets, loadMajorBandsStaticBucket } from '../_lib/major-bands-static-provider.js';
import { buildMajorWindow } from '../_lib/major-window-engine.js';
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}function clean(v,m=50){return String(v||'').trim().slice(0,m);}
async function loadWindow(request,env,viewScore){const scoreWindow={min:viewScore-25,max:viewScore+10},options={assets:env?.ASSETS};const {manifest,buckets}=await selectMajorBandsStaticBuckets(request,scoreWindow,options),records=[],bucketFiles=[];let decodedRows=0;for(const bucket of buckets||[]){const loaded=await loadMajorBandsStaticBucket(request,bucket.file,scoreWindow,options);records.push(...(loaded.records||[]));decodedRows+=Number(loaded.rowCount||0);bucketFiles.push(bucket.file);}return{manifest,records,bucketFiles,decodedRows};}
export async function onRequest(context){if(context.request.method!=='GET')return json({ok:false,message:'只支持 GET 请求。'},405);try{const url=new URL(context.request.url),candidateScore=Math.round(Number(url.searchParams.get('candidateScore')||520)),viewScore=Math.round(Number(url.searchParams.get('viewScore')||candidateScore)),filters={region:clean(url.searchParams.get('region')||'all',20),schoolKeyword:clean(url.searchParams.get('schoolKeyword')||'',40),majorKeyword:clean(url.searchParams.get('majorKeyword')||'',40)};if(!Number.isFinite(candidateScore)||!Number.isFinite(viewScore))return json({ok:false,message:'分数格式不正确。'},400);const loaded=await loadWindow(context.request,context.env||{},viewScore),groups=buildMajorWindow(loaded.records,{candidateScore,viewScore,filters}),counts={upper:groups.upper.count,near:groups.near.count,lower:groups.lower.count};counts.total=counts.upper+counts.near+counts.lower;return json({ok:true,legacy:true,message:'旧版 major-window 已迁移为当前分数窗口静态桶读取。',meta:{candidateScore,viewScore,dataScope:'辽宁2026物理类'},groups,counts,source:{manifestVersion:loaded.manifest?.version||'',totalRecords:loaded.manifest?.recordCount||11628,mode:'bounded-major-bands-static-buckets',bucketFiles:loaded.bucketFiles,decodedRows:loaded.decodedRows,sessionMode:hasFenxiSecret(context.env||{})?'server-signed-cookie':'no-secret-detected'}});}catch(error){return json({ok:false,message:error?.message||String(error),hint:'请检查 major-bands-static-v3972_2 静态资源。'},500);}}
''', encoding='utf-8')


def rewrite_geo_audit():
    (ROOT / 'functions/api/school-geo-audit.js').write_text(r'''import { normalizeSchoolGeo,getSchoolGeoDbSize,getSchoolGeoSourceMeta } from '../_lib/school-geo-normalizer.js';import { aliasCount } from '../_lib/school-alias-map.js';
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}function clean(v,m=60){return String(v||'').trim().slice(0,m);}async function idx(context){const u=new URL('/data/zy2026/school-index.json',context.request.url),r=new Request(u,{headers:{accept:'application/json'}}),res=context.env?.ASSETS?.fetch?await context.env.ASSETS.fetch(r):await fetch(r);if(!res.ok)throw new Error(`学校投影索引读取失败 HTTP ${res.status}`);return res.json();}
export async function onRequest(context){if(context.request.method!=='GET')return json({ok:false,message:'只支持 GET 请求。'},405);try{const url=new URL(context.request.url),limit=Math.max(10,Math.min(1000,Number(url.searchParams.get('limit')||300))),keyword=clean(url.searchParams.get('keyword')||'',50),index=await idx(context),schools=[];for(const item of Array.isArray(index?.schools)?index.schools:[]){if(keyword&&!String(item.name||'').includes(keyword))continue;const geo=normalizeSchoolGeo(item.name||'')||{},confidence=geo.locationConfidence||((item.province||item.city)?'medium':'low');schools.push({school:item.name||'',count:Number(item.recordCount2026??item.projects2026??0),majors:Number(item.uniqueMajorCount2026||0),displayLocation:geo.displayLocation||[item.province,item.city].filter(Boolean).join(' · '),province:geo.province||item.province||'',city:geo.city||item.city||'',geoEntity:geo.geoEntity||'',schoolCanonical:geo.schoolCanonical||item.name||'',locationSource:geo.locationSource||'zy2026-school-index',locationConfidence:confidence,locationWarning:geo.locationWarning||'',geoSourceMethod:geo.geoSourceMethod||'',geoSourceYear:geo.geoSourceYear||'',geoMatchNote:geo.geoMatchNote||'',schoolIdentifier:geo.schoolIdentifier||'',status:confidence==='low'?'needs-review':'mapped'});}schools.sort((a,b)=>b.count-a.count||a.school.localeCompare(b.school,'zh-CN'));const summary={uniqueSchools:schools.length,mapped:schools.filter(s=>s.status==='mapped').length,needsReview:schools.filter(s=>s.status==='needs-review').length,geoDbSize:getSchoolGeoDbSize(),aliasCount:aliasCount(),sourceMeta:getSchoolGeoSourceMeta(),manifestVersion:index?.version||'',projectionVersion:index?.runtimeProjectionVersion||'',totalRecords:Number(index?.runtimeProjectionRecordCount||0),runtimeMode:'school-index-only-no-admission-scan'};return json({ok:true,summary,schools:schools.slice(0,limit)});}catch(error){return json({ok:false,message:error?.message||String(error),hint:'请确认 ZY2026 学校索引已部署。'},500);}}
''', encoding='utf-8')


def rewrite_catalog():
    (ROOT / 'functions/api/fenxi-catalog.js').write_text(r'''function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}function clean(v,m=60){return String(v||'').trim().slice(0,m);}async function asset(context,p){const u=new URL(p,context.request.url),r=new Request(u,{headers:{accept:'application/json'}}),res=context.env?.ASSETS?.fetch?await context.env.ASSETS.fetch(r):await fetch(r);if(!res.ok)throw new Error(`静态目录读取失败 ${p} HTTP ${res.status}`);return res.json();}
function schoolRow(i={}){return{school:i.name||'',recordCount:Number(i.recordCount2026??i.projects2026??0),majorCount:Number(i.uniqueMajorCount2026||0),minScore2025:i.minScore2025??'',maxScore2025:i.maxScore2025??'',bestRank2025:i.bestRank2025??'',displayLocation:[i.province,i.city].filter(Boolean).join(' · '),province:i.province||'',city:i.city||'',schoolCanonical:i.name||'',natureLabel:i.nature||'',sampleMajors:Array.isArray(i.sampleMajors2026)?i.sampleMajors2026.join('；'):''};}function majorRow(i={}){return{major:i.label||i.key||'',direction:i.direction||'',recordCount:Number(i.projects2026||0),schoolCount:Number(i.schools2026||0),summary:i.summary||''};}
export async function onRequest(context){if(context.request.method!=='GET')return json({ok:false,message:'只支持 GET 请求。'},405);try{const url=new URL(context.request.url),type=clean(url.searchParams.get('type')||'summary',30),format=clean(url.searchParams.get('format')||'json',20),keyword=clean(url.searchParams.get('keyword')||'',60),limit=Math.max(1,Math.min(5000,Number(url.searchParams.get('limit')||1000)));if(format==='csv'||type==='school-major')return json({ok:false,code:'legacy_full_scan_catalog_retired',message:'旧版动态全表导出已退役：它会在 Worker 内扫描全部招生记录。请使用 build-time ZY2026 索引。',resources:{schools:'/data/zy2026/school-index.json',majors:'/data/zy2026/major-index.json'}},410);const [si,mi]=await Promise.all([asset(context,'/data/zy2026/school-index.json'),asset(context,'/data/zy2026/major-index.json')]);let schools=(si.schools||[]).map(schoolRow),majors=(mi.majors||[]).map(majorRow);if(keyword){schools=schools.filter(x=>x.school.includes(keyword)||x.sampleMajors.includes(keyword));majors=majors.filter(x=>x.major.includes(keyword)||x.direction.includes(keyword));}const summary={ok:true,legacy:true,runtimeMode:'build-time-index-only',manifestVersion:si.sourceManifestVersion||mi.sourceManifestVersion||'',totalRawRecords:Number(si.runtimeProjectionRecordCount||mi.runtimeProjectionRecordCount||11628),uniqueSchools:schools.length,majorCatalogEntries:majors.length,keyword,resources:{schools:'/data/zy2026/school-index.json',majors:'/data/zy2026/major-index.json'}};if(type==='schools')return json({...summary,type,schools:schools.slice(0,limit)});if(type==='major-pool')return json({...summary,type,majorPool:majors.slice(0,limit),majorPoolMode:'major-index-summary-not-runtime-record-scan'});return json({...summary,type:'summary',preview:{schools:schools.slice(0,20),majorPool:majors.slice(0,20),schoolMajor:[]}});}catch(error){return json({ok:false,message:error?.message||String(error),hint:'请确认 ZY2026 build-time indexes 已部署。'},500);}}
''', encoding='utf-8')


def strip_fenxi_loader():
    (ROOT / 'functions/_lib/fenxi-manifest.js').write_text("import{fetchFenxiJson}from'./fenxi-fetcher.js';let mc=null;const TTL=5*60*1000;function fresh(i){return i&&Date.now()-i.time<TTL}export async function loadManifest(request,env){if(fresh(mc))return mc.data;const data=await fetchFenxiJson(request,env,'manifest.json');mc={time:Date.now(),data};return data}\n", encoding='utf-8')


def write_major_verifier():
    (ROOT / 'tools/verify-major-runtime-projection-vnext.mjs').write_text(r'''import fs from'node:fs';import path from'node:path';const norm=v=>String(v??'').trim().replaceAll(' ','');const id=r=>[r.schoolCode2026??r.schoolCode,r.majorCode2026??r.majorCode,r.school??r.schoolName,r.major??r.majorName,r.score2026??r.score,r.rank2026??r.rank].map(norm).join('|');const manifest=JSON.parse(fs.readFileSync('fenxi/data/ln-rank-2026/manifest.json','utf8')),raw=[];for(const ch of manifest.chunks||[]){const rel=ch.file||ch.path,c=[path.join('fenxi',rel),rel,path.join('fenxi/data/ln-rank-2026',path.basename(rel))],f=c.find(fs.existsSync);if(!f)throw new Error(`raw missing ${rel}`);const d=JSON.parse(fs.readFileSync(f,'utf8'));raw.push(...(Array.isArray(d)?d:d.records||[]));}const index=JSON.parse(fs.readFileSync('data/zy2026/major-index.json','utf8'));if(index.runtimeProjectionShardCount!==100||index.runtimeProjectionRecordCount!==11628)throw new Error('major metadata');const projected=[],chunks=new Set();for(const item of index.runtimeMajors||[]){chunks.add(item.chunk);const p=JSON.parse(fs.readFileSync(path.join('data/zy2026/chunks',item.chunk),'utf8')),node=p.majors?.[item.key];if(!node)throw new Error(`runtime major missing ${item.key}`);const rows=node.runtimeRecords2026||[];if(rows.length!==Number(item.recordCount2026))throw new Error(`runtime major count ${item.key}`);projected.push(...rows);}const count=a=>{const m=new Map();for(const r of a)m.set(id(r),(m.get(id(r))||0)+1);return m},a=count(raw),b=count(projected),missing=[...a].filter(([k,v])=>(b.get(k)||0)!==v),extra=[...b].filter(([k,v])=>(a.get(k)||0)!==v);if(raw.length!==11628||projected.length!==11628||missing.length||extra.length||[...b.values()].some(v=>v!==1))throw new Error(JSON.stringify({raw:raw.length,projected:projected.length,missing:missing.slice(0,3),extra:extra.slice(0,3)}));const files=fs.readdirSync('data/zy2026/chunks').filter(x=>/^major-\d{2}\.json$/.test(x)),maxBytes=Math.max(...files.map(x=>fs.statSync(path.join('data/zy2026/chunks',x)).size));if(files.length!==100||maxBytes>350000)throw new Error(JSON.stringify({files:files.length,maxBytes}));console.log(JSON.stringify({ok:true,sourceRecords:raw.length,projectionRecords:projected.length,runtimeMajors:(index.runtimeMajors||[]).length,shards:files.length,maxBytes,missing:0,duplicate:0},null,2));
''', encoding='utf-8')


def strengthen_audit():
    path=ROOT/'tools/audit-worker-resource-architecture-vnext.mjs';s=path.read_text(encoding='utf-8');insert="""
const majorIndex=JSON.parse(fs.readFileSync('data/zy2026/major-index.json','utf8'));
if(majorIndex.runtimeProjectionShardCount!==100||majorIndex.runtimeProjectionRecordCount!==11628)violations.push('major projection: coverage metadata invalid');
const majorShardFiles=fs.readdirSync('data/zy2026/chunks').filter(n=>/^major-\\d{2}\\.json$/.test(n));
if(majorShardFiles.length!==100)violations.push(`major projection: shard count ${majorShardFiles.length}`);
const maxMajorBytes=Math.max(...majorShardFiles.map(n=>fs.statSync(path.join('data/zy2026/chunks',n)).size));if(maxMajorBytes>350000)violations.push(`major projection: shard budget exceeded ${maxMajorBytes}`);
for(const required of ['functions/_lib/background-position-engine.js','functions/api/major-window.js','functions/api/school-geo-audit.js','functions/api/fenxi-catalog.js']){const t=fs.readFileSync(required,'utf8');if(t.includes('loadAllRecords'))violations.push(`${required}: legacy full loader remains`);}
const bg=fs.readFileSync('functions/_lib/background-position-engine.js','utf8');if(!bg.includes('loadMajorRuntimeRecords')||!bg.includes('loadSchoolRuntimeRecords')||!bg.includes('loadMajorBandsStaticBucket'))violations.push('background-position-engine: bounded owners missing');
const legacy=fs.readFileSync('functions/api/major-window.js','utf8');if(!legacy.includes('bounded-major-bands-static-buckets'))violations.push('major-window: bounded owner missing');
const catalog=fs.readFileSync('functions/api/fenxi-catalog.js','utf8');if(!catalog.includes('legacy_full_scan_catalog_retired'))violations.push('fenxi-catalog: unsafe export not retired');
""";s=s.replace('if(violations.length){',insert+'\nif(violations.length){',1);s=s.replace("reportOwner:'major-bands-static-v3972_2'","reportOwner:'major-bands-static-v3972_2',majorProjection:{records:11628,shards:100,maxBytes:maxMajorBytes}");path.write_text(s,encoding='utf-8')


add_school_catalog_fields()
repartition_major_with_exact_runtime()
append_major_runtime_provider()
rewrite_background_engine()
rewrite_major_window()
rewrite_geo_audit()
rewrite_catalog()
strip_fenxi_loader()
write_major_verifier()
strengthen_audit()
print('canonical major runtime projection and all remaining consumers migrated')
