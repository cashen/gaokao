export const SCHOOL_RUNTIME_PROJECTION_VERSION = 'ln-rank-school-runtime-projection-vnext-100-shard-v1';
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
  if (!matches.length) return { manifest: index, matchedSchools: [], records: [], rawScanned: 0, shardFiles: [], modes: [], cacheStatus: 'miss', elapsedMs: Date.now() - started };
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
    matchedSchools: matches,
    records,
    rawScanned: records.length,
    shardFiles,
    modes: ['school-runtime-projection'],
    cacheStatus: 'bounded-projection',
    elapsedMs: Date.now() - started,
    projectionVersion: SCHOOL_RUNTIME_PROJECTION_VERSION
  };
}
export const MAJOR_RUNTIME_PROJECTION_VERSION = 'ln-rank-major-runtime-projection-vnext-100-shard-v1';
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
  if (!/^major-runtime-\d{2}\.json$/.test(chunk)) throw new Error('专业运行时投影分片标识无效');
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

export function clearSchoolRuntimeProjectionCacheForTest() {
  indexCache.clear();
  shardCache.clear();
}

export function schoolRuntimeProjectionCacheState() {
  return Object.freeze({
    ttlMs: CACHE_TTL_MS,
    indexEntries: indexCache.size,
    indexMaxEntries: INDEX_CACHE_MAX_ENTRIES,
    shardEntries: shardCache.size,
    shardMaxEntries: SHARD_CACHE_MAX_ENTRIES,
    bounded: indexCache.size <= INDEX_CACHE_MAX_ENTRIES && shardCache.size <= SHARD_CACHE_MAX_ENTRIES
  });
}

export function schoolRuntimeProjectionCachePolicy() {
  return Object.freeze({ ttlMs: CACHE_TTL_MS, indexMaxEntries: INDEX_CACHE_MAX_ENTRIES, shardMaxEntries: SHARD_CACHE_MAX_ENTRIES });
}
