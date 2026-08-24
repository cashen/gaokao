import { matchRegionRule, normalizeCityName } from '../../../shared/resources/geo/china-region-catalog.v3990_2.js';
import { enrichBottomLineFields, passBottomLineMode } from '../../_lib/bottomline-policy.js';
import { lookupScoreRank } from '../../_lib/rank-table-provider.js';

export const AI_MAJOR_HISTORY_API_VERSION = 'ai-major-region-history-api-v3990_2';
export const AI_MAJOR_HISTORY_INDEX_VERSION = 'ai-major-history-index-v3990_1';
const MANIFEST_PATH = '/ln-rank/data/ai-major-history-v3990_1/manifest.json';
const MANIFEST_TTL_MS = 5 * 60 * 1000;
const SHARD_TTL_MS = 60 * 1000;
const SHARD_CACHE_MAX = 2;
let manifestCache = null;
const shardCache = new Map();

function clean(value, max = 220) { return String(value == null ? '' : value).trim().slice(0, max); }
function norm(value) { return clean(value, 220).normalize('NFKC').toLowerCase().replace(/[\s·•,，。；;：:'"“”‘’!！?？_—\-（）()【】\[\]]+/g, ''); }
function int(value, fallback = 0) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? n : fallback; }
function scoreBound(value) { if (value === null || value === undefined || String(value).trim() === '') return null; const n = Math.round(Number(value)); return Number.isFinite(n) && n >= 150 && n <= 750 ? n : null; }
function splitMajorInputs(values = []) {
  return [...new Set(values.flatMap(value => String(value || '').split(/[,，、/；;|]+/).map(item => item.trim()).filter(Boolean)))].slice(0, 12);
}
function projectInfo(major = '') {
  const text = String(major || '');
  const sino = /中外|合作办学|国际项目|联合培养|高收费/.test(text);
  const special = /预科|民族班|定向|专项|实验班|试验班|卓越班|拔尖|师范类/.test(text);
  return {
    isSino: sino,
    isSpecial: special,
    projectLabel: sino ? '中外合作/高收费（需核验）' : (special ? '特殊培养/项目（需核验）' : '普通项目')
  };
}
function normalizeProjectMode(value) {
  return ['all', 'ordinary-only', 'sino-only'].includes(String(value || '').trim()) ? String(value).trim() : 'all';
}
function projectMatches(record, mode) {
  const info = projectInfo(record.major);
  return mode === 'sino-only' ? info.isSino : mode === 'ordinary-only' ? !info.isSino : true;
}
function indexes(schema = []) { return Object.fromEntries(schema.map((key, index) => [key, index])); }
function fresh(entry, ttl) { return entry && Date.now() - entry.time < ttl; }
function assetRequest(request, pathname) { const url = new URL(pathname, new URL(request.url).origin); return new Request(url.toString(), { method: 'GET', headers: { accept: 'application/json' } }); }
async function readAssetJson(context, pathname) {
  const request = assetRequest(context.request, pathname);
  const response = context.env?.ASSETS?.fetch ? await context.env.ASSETS.fetch(request) : await fetch(request);
  if (!response.ok) throw new Error(`专业历史索引读取失败：${pathname}，HTTP ${response.status}`);
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) throw new Error(`专业历史索引返回 HTML：${pathname}`);
  return response.json();
}
async function loadManifest(context) {
  if (fresh(manifestCache, MANIFEST_TTL_MS)) return manifestCache.data;
  const manifest = await readAssetJson(context, MANIFEST_PATH);
  if (manifest?.version !== AI_MAJOR_HISTORY_INDEX_VERSION || Number(manifest?.recordCount) !== 11628 || manifest?.integrity?.sameTruthSet !== true) throw new Error('专业历史索引合同异常');
  manifestCache = { time: Date.now(), data: manifest };
  return manifest;
}
function pruneShardCache() {
  const now = Date.now();
  for (const [key, entry] of shardCache) if (!fresh(entry, SHARD_TTL_MS)) shardCache.delete(key);
  while (shardCache.size > SHARD_CACHE_MAX) shardCache.delete(shardCache.keys().next().value);
}
async function loadShard(context, manifest, shard) {
  pruneShardCache();
  const key = String(shard);
  const cached = shardCache.get(key);
  if (fresh(cached, SHARD_TTL_MS)) { shardCache.delete(key); shardCache.set(key, cached); return cached.data; }
  const descriptor = (manifest.shards || []).find(item => Number(item.shard) === Number(shard));
  if (!descriptor?.file) throw new Error(`专业历史分片不存在：${shard}`);
  const payload = await readAssetJson(context, descriptor.file);
  if (payload?.version !== AI_MAJOR_HISTORY_INDEX_VERSION || Number(payload?.shard) !== Number(shard)) throw new Error('专业历史分片合同异常');
  shardCache.set(key, { time: Date.now(), data: payload });
  pruneShardCache();
  return payload;
}
function resolveMajorKeys(manifest, query) {
  const normalized = norm(query);
  if (!normalized) return [];
  const exact = manifest.lookup?.[normalized];
  if (exact) return [exact];
  const keys = Object.keys(manifest.majors || {});
  return keys.filter(key => { const candidate = norm(key); return candidate.includes(normalized) || normalized.includes(candidate); }).slice(0, 8);
}
function rowRecord(row, ix) {
  const record = {
    id: clean(row[ix.id], 220), school: clean(row[ix.school], 120), major: clean(row[ix.major], 180),
    score2026: Number(row[ix.score2026]), rank2026: Number.isFinite(Number(row[ix.rank2026])) ? Number(row[ix.rank2026]) : null,
    score2025: Number.isFinite(Number(row[ix.score2025])) ? Number(row[ix.score2025]) : null, rank2025: Number.isFinite(Number(row[ix.rank2025])) ? Number(row[ix.rank2025]) : null,
    score2024: Number.isFinite(Number(row[ix.score2024])) ? Number(row[ix.score2024]) : null, rank2024: Number.isFinite(Number(row[ix.rank2024])) ? Number(row[ix.rank2024]) : null,
    province: clean(row[ix.province], 80), city: clean(row[ix.city], 80), lnArea: clean(row[ix.lnArea], 80), displayLocation: clean(row[ix.displayLocation], 100),
    standardMajorCode: clean(row[ix.standardMajorCode], 40), standardMajorName: clean(row[ix.standardMajorName], 160),
    schoolCode2026: clean(row[ix.schoolCode2026], 40), majorCode2026: clean(row[ix.majorCode2026], 40)
  };
  const project = projectInfo(record.major);
  return { ...record, ...project, ...enrichBottomLineFields(record) };
}
function regionMatch(record, region) {
  const key = clean(region, 220) || 'all';
  if (key === 'all') return true;
  if (key.startsWith('city:')) return normalizeCityName(record.city) === normalizeCityName(key.slice(5));
  return matchRegionRule(record, key);
}
function summary(records = []) {
  const scores = records.map(item => Number(item.score2026)).filter(Number.isFinite);
  return {
    total: records.length,
    schoolCount: new Set(records.map(item => item.school).filter(Boolean)).size,
    minScore: scores.length ? Math.min(...scores) : null,
    maxScore: scores.length ? Math.max(...scores) : null
  };
}
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status === 200 ? 'public, max-age=60' : 'no-store' } }); }

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const majorInputs = splitMajorInputs([
      ...url.searchParams.getAll('major'),
      ...url.searchParams.getAll('majors')
    ]);
    const region = clean(url.searchParams.get('region'), 220) || 'all';
    const schoolKeyword = norm(url.searchParams.get('schoolKeyword'));
    const projectMode = normalizeProjectMode(url.searchParams.get('projectMode'));
    const bottomLineMode = clean(url.searchParams.get('bottomLineMode'), 40) || 'all';
    const candidateScore = scoreBound(url.searchParams.get('candidateScore'));
    const requestedSort = ['position-near', 'score-desc', 'score-asc'].includes(String(url.searchParams.get('sort') || '').trim())
      ? String(url.searchParams.get('sort')).trim()
      : (candidateScore !== null ? 'position-near' : 'score-desc');
    const candidateRow = candidateScore !== null ? lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score: candidateScore }) : null;
    const candidateRank = Number(candidateRow?.rankForGap ?? candidateRow?.rankEnd);
    const rawMinScore = scoreBound(url.searchParams.get('minScore')), rawMaxScore = scoreBound(url.searchParams.get('maxScore'));
    const minScore = rawMinScore !== null && rawMaxScore !== null ? Math.min(rawMinScore, rawMaxScore) : rawMinScore, maxScore = rawMinScore !== null && rawMaxScore !== null ? Math.max(rawMinScore, rawMaxScore) : rawMaxScore;
    const scoreRange = { kind: minScore !== null && maxScore !== null ? 'range' : minScore !== null ? 'min' : maxScore !== null ? 'max' : 'none', min: minScore, max: maxScore };
    const offset = Math.max(0, int(url.searchParams.get('offset'), 0)), limit = Math.max(1, Math.min(120, int(url.searchParams.get('limit'), 100)));
    if (!majorInputs.length) return json({ ok: false, code: 'major_required', message: '需要先明确一个或多个具体专业方向。', apiVersion: AI_MAJOR_HISTORY_API_VERSION }, 400);
    const manifest = await loadManifest(context);
    const matchedByInput = majorInputs.map(input => ({ input, keys: resolveMajorKeys(manifest, input) }));
    const majorKeys = [...new Set(matchedByInput.flatMap(item => item.keys))];
    if (!majorKeys.length) return json({ ok: true, majorInputs, region, projectMode, bottomLineMode, matchedMajors: [], total: 0, records: [], summary: { total: 0, schoolCount: 0, minScore: null, maxScore: null }, complete: true, dataYear: 2026, apiVersion: AI_MAJOR_HISTORY_API_VERSION, indexVersion: AI_MAJOR_HISTORY_INDEX_VERSION, boundary: '这是2026辽宁物理类实际投档数据的专业历史查询；未命中不等于该专业全国不存在。' });
    const records = [], loaded = new Map(), seenIds = new Set();
    for (const key of majorKeys) {
      const descriptor = manifest.majors[key];
      if (!descriptor) continue;
      let shard = loaded.get(descriptor.shard);
      if (!shard) { shard = await loadShard(context, manifest, descriptor.shard); loaded.set(descriptor.shard, shard); }
      const ix = indexes(shard.rowSchema || manifest.rowSchema || []);
      for (const row of shard.majors?.[key] || []) {
        const record = rowRecord(row, ix);
        if (regionMatch(record, region)
          && (!schoolKeyword || norm(record.school).includes(schoolKeyword))
          && projectMatches(record, projectMode)
          && passBottomLineMode(record, bottomLineMode)
          && (minScore === null || Number(record.score2026) >= minScore)
          && (maxScore === null || Number(record.score2026) <= maxScore)
          && !seenIds.has(record.id)) {
          seenIds.add(record.id);
          records.push(record);
        }
      }
    }
    const distance = record => Number.isFinite(candidateRank) && Number.isFinite(Number(record.rank2026))
      ? Math.abs(Number(record.rank2026) - candidateRank)
      : Number.MAX_SAFE_INTEGER;
    records.sort((a, b) => {
      if (requestedSort === 'position-near') return distance(a) - distance(b)
        || Number(a.rank2026 ?? Number.MAX_SAFE_INTEGER) - Number(b.rank2026 ?? Number.MAX_SAFE_INTEGER)
        || a.school.localeCompare(b.school, 'zh-Hans-CN')
        || a.major.localeCompare(b.major, 'zh-Hans-CN')
        || a.id.localeCompare(b.id, 'zh-Hans-CN');
      if (requestedSort === 'score-asc') return Number(a.score2026 ?? Number.MAX_SAFE_INTEGER) - Number(b.score2026 ?? Number.MAX_SAFE_INTEGER)
        || Number(a.rank2026 ?? Number.MAX_SAFE_INTEGER) - Number(b.rank2026 ?? Number.MAX_SAFE_INTEGER)
        || a.school.localeCompare(b.school, 'zh-Hans-CN')
        || a.major.localeCompare(b.major, 'zh-Hans-CN')
        || a.id.localeCompare(b.id, 'zh-Hans-CN');
      return Number(b.score2026 ?? Number.MIN_SAFE_INTEGER) - Number(a.score2026 ?? Number.MIN_SAFE_INTEGER)
        || Number(a.rank2026 ?? Number.MAX_SAFE_INTEGER) - Number(b.rank2026 ?? Number.MAX_SAFE_INTEGER)
        || a.school.localeCompare(b.school, 'zh-Hans-CN')
        || a.major.localeCompare(b.major, 'zh-Hans-CN')
        || a.id.localeCompare(b.id, 'zh-Hans-CN');
    });
    const total = records.length, page = records.slice(offset, offset + limit), stats = summary(records);
    return json({
      ok: true, major: majorInputs.join('、'), majorInputs, region, projectMode, schoolKeyword, bottomLineMode, scoreRange, candidateScore, candidateReferenceRank2026: Number.isFinite(candidateRank) ? candidateRank : null, sort: requestedSort || (candidateRank ? 'position-near' : 'score-desc'), matchedMajors: majorKeys, matchedByInput, total, offset, limit, nextOffset: offset + page.length < total ? offset + page.length : null,
      records: page, summary: stats, complete: offset === 0 && page.length === total, dataYear: 2026, audienceYear: 2027,
      source: { level: 'B', sourceName: '辽宁2026物理类专业投档静态真值索引', sourceVersion: manifest.source?.version || '', sourceRecordCount: Number(manifest.source?.recordCount || 0), derivedIndex: true, sameTruthSet: manifest.integrity?.sameTruthSet === true },
      apiVersion: AI_MAJOR_HISTORY_API_VERSION, indexVersion: AI_MAJOR_HISTORY_INDEX_VERSION,
      boundary: `这里列的是2026辽宁物理类实际投档记录${scoreRange.kind!=='none'?`，并按${minScore!==null?`${minScore}分以上`:''}${minScore!==null&&maxScore!==null?'且':''}${maxScore!==null?`${maxScore}分以下`:''}过滤`:''}；默认包含普通项目和中外/高收费项目，若明确排除则按项目性质过滤。它不是2027录取承诺，正式填报仍要核对当年招生计划。`
    });
  } catch (error) {
    return json({ ok: false, code: 'major_history_failed', message: clean(error?.message || error, 320), apiVersion: AI_MAJOR_HISTORY_API_VERSION }, 500);
  }
}
