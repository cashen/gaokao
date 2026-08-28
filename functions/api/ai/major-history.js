import { matchRegionRule, normalizeCityName } from '../../../shared/resources/geo/china-region-catalog.v3990_2.js';
import { enrichBottomLineFields, passBottomLineMode } from '../../_lib/bottomline-policy.js';

export const AI_MAJOR_HISTORY_API_VERSION = 'ai-major-region-history-api-v3990_2';
export const AI_MAJOR_HISTORY_INDEX_VERSION = 'ai-major-history-index-v3990_1';
const MANIFEST_PATH = '/ln-rank/data/ai-major-history-v3990_1/manifest.json';
const MANIFEST_TTL_MS = 5 * 60 * 1000;
const SHARD_TTL_MS = 60 * 1000;
const SHARD_CACHE_MAX = 2;
let manifestCache = null;
const shardCache = new Map();
let rankLookupPromise = null;

const MAJOR_QUERY_ALIASES = Object.freeze({
  '电气工程及自动化': '电气工程及其自动化',
  '电气自动化': '电气工程及其自动化',
  '计科': '计算机科学与技术',
  '软工': '软件工程',
  '测控': '测控技术与仪器',
  '机械电子': '机械电子工程'
});

const BROAD_MAJOR_INPUTS = new Set(['机', '工科', '工学', '教育', '生命科学', '医疗']);

function clean(value, max = 220) { return String(value == null ? '' : value).trim().slice(0, max); }
function norm(value) { return clean(value, 220).normalize('NFKC').toLowerCase().replace(/[\s·•,，。；;：:'"“”‘’!！?？_—\-（）()【】\[\]]+/g, ''); }
function int(value, fallback = 0) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? n : fallback; }
function scoreBound(value) { if (value === null || value === undefined || String(value).trim() === '') return null; const n = Math.round(Number(value)); return Number.isFinite(n) && n >= 150 && n <= 750 ? n : null; }
function positive(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
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
  return mode === 'sino-only' ? info.isSino : mode === 'ordinary-only' ? !info.isSino && !info.isSpecial : true;
}
function indexes(schema = []) { return Object.fromEntries(schema.map((key, index) => [key, index])); }
function fresh(entry, ttl) { return entry && Date.now() - entry.time < ttl; }
function assetRequest(request, pathname) { const url = new URL(pathname, new URL(request.url).origin); return new Request(url.toString(), { method: 'GET', headers: { accept: 'application/json' } }); }
async function lookupCandidateRank(score) {
  if (score === null) return null;
  rankLookupPromise ||= import('../../_lib/rank-table-provider.js').then(module => module.lookupScoreRank);
  const lookupScoreRank = await rankLookupPromise;
  return lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score });
}
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
function normalizeMajorScope(value) { return String(value || '').trim() === 'admission-groups' ? 'admission-groups' : 'core'; }
function isAdmissionGroupKey(value) { return /类|试验班|实验班|招生大类|[\[\]]/.test(String(value || '')); }
function resolveMajorKeys(manifest, query, scope = 'core') {
  const normalized = norm(query);
  if (!normalized) return [];
  const exact = manifest.lookup?.[normalized];
  const keys = Object.keys(manifest.majors || {});
  const fuzzy = keys.filter(key => {
    const candidate = norm(key);
    const scopeMatch = scope === 'admission-groups' ? isAdmissionGroupKey(key) : !isAdmissionGroupKey(key);
    return (candidate.includes(normalized) || normalized.includes(candidate)) && scopeMatch;
  });
  if (scope !== 'admission-groups' && exact) return [exact];
  return [...new Set([...(exact ? [exact] : []), ...fuzzy])].slice(0, 8);
}

// The manifest is already the canonical query index for this endpoint. Keep
// exact and bounded fuzzy resolution on that index so a cold Worker does not
// load the 420KB undergraduate catalogue and scan it before reading one
// pre-aggregated history shard. Complex language normalization belongs to the
// command parser; direct API inputs fail closed into the same choice state.
function manifestIntentForInput(manifest, rawInput = '') {
  const raw = String(rawInput || '').trim();
  const query = norm(raw);
  if (!query) return { rawInput: raw, query, status: 'missing', intentLevel: 'unknown', confidence: 'none', coreMajorNames: [], relatedMajorNames: [] };
  if (BROAD_MAJOR_INPUTS.has(raw)) {
    return { rawInput: raw, query, status: 'too-broad', intentLevel: 'broad-field', confidence: 'high', coreMajorNames: [], relatedMajorNames: [], warnings: ['这个说法范围较宽，先选一个具体专业方向。'] };
  }
  const canonical = MAJOR_QUERY_ALIASES[raw] || manifest.lookup?.[query] || '';
  if (canonical && manifest.majors?.[canonical]) {
    return { rawInput: raw, query, status: 'ready', intentLevel: 'exact-major', matchType: canonical === raw ? 'manifest_exact' : 'manifest_alias', confidence: 'high', coreMajorNames: [canonical], relatedMajorNames: [], matchedTerms: [raw] };
  }
  const candidates = Object.keys(manifest.majors || {})
    .filter(name => { const candidate = norm(name); return candidate.includes(query) || query.includes(candidate); })
    .sort((a, b) => a.length - b.length || a.localeCompare(b, 'zh-CN'))
    .slice(0, 12);
  if (candidates.length) {
    return { rawInput: raw, query, status: 'needs-choice', intentLevel: 'unknown', matchType: 'manifest_candidates', confidence: 'candidate', coreMajorNames: [], relatedMajorNames: candidates, matchedTerms: [raw], warnings: ['这不是完整的正式专业名，请从候选中确认。'] };
  }
  return { rawInput: raw, query, status: 'unresolved', intentLevel: 'unknown', confidence: 'none', coreMajorNames: [], relatedMajorNames: [], matchedTerms: [raw], warnings: ['暂时没有安全匹配到本科专业，请换一个更完整的名称或代码。'] };
}

function resolveMajorInputs(manifest, inputs = []) {
  const intentRows = inputs.map(input => ({ input, intent: manifestIntentForInput(manifest, input) }));
  const blocked = intentRows.filter(item => ['broad-field', 'discipline', 'major-class'].includes(item.intent.intentLevel) && item.intent.status !== 'ready');
  const expanded = [...new Set(intentRows.flatMap(item => item.intent.status === 'ready' && item.intent.coreMajorNames?.length ? item.intent.coreMajorNames : [item.input]))];
  return { intentRows, blocked, inputs: blocked.length ? [] : expanded };
}
function rowRecord(row, ix) {
  const record = {
    id: clean(row[ix.id], 220), school: clean(row[ix.school], 120), major: clean(row[ix.major], 180),
    score2026: positive(row[ix.score2026]), rank2026: positive(row[ix.rank2026]),
    score2025: positive(row[ix.score2025]), rank2025: positive(row[ix.rank2025]),
    score2024: positive(row[ix.score2024]), rank2024: positive(row[ix.rank2024]),
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
  const scores = records.map(item => Number(item.score2026)).filter(value => Number.isFinite(value) && value > 0);
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
    const majorScope = normalizeMajorScope(url.searchParams.get('majorScope'));
    const bottomLineMode = clean(url.searchParams.get('bottomLineMode'), 40) || 'all';
    const candidateScore = scoreBound(url.searchParams.get('candidateScore'));
    const requestedSort = ['position-near', 'score-desc', 'score-asc'].includes(String(url.searchParams.get('sort') || '').trim())
      ? String(url.searchParams.get('sort')).trim()
      : (candidateScore !== null ? 'position-near' : 'score-desc');
    const candidateRow = await lookupCandidateRank(candidateScore);
    const candidateRank = Number(candidateRow?.rankForGap ?? candidateRow?.rankEnd);
    const rawMinScore = scoreBound(url.searchParams.get('minScore')), rawMaxScore = scoreBound(url.searchParams.get('maxScore'));
    const minScore = rawMinScore !== null && rawMaxScore !== null ? Math.min(rawMinScore, rawMaxScore) : rawMinScore, maxScore = rawMinScore !== null && rawMaxScore !== null ? Math.max(rawMinScore, rawMaxScore) : rawMaxScore;
    const scoreRange = { kind: minScore !== null && maxScore !== null ? 'range' : minScore !== null ? 'min' : maxScore !== null ? 'max' : 'none', min: minScore, max: maxScore };
    const offset = Math.max(0, int(url.searchParams.get('offset'), 0));
    const requestedLimit = Math.max(1, Math.min(120, int(url.searchParams.get('limit'), 100)));
    if (!majorInputs.length) return json({ ok: false, code: 'major_required', message: '需要先明确一个或多个具体专业方向。', apiVersion: AI_MAJOR_HISTORY_API_VERSION }, 400);
    const manifest = await loadManifest(context);
    const resolvedInputs = resolveMajorInputs(manifest, majorInputs);
    if (resolvedInputs.blocked.length) {
      return json({
        ok: false,
        code: 'major_query_requires_choice',
        message: '这个专业说法范围较宽，请先选择具体方向或专业后再读取三年历史。',
        majorInputs,
        majorIntent: resolvedInputs.blocked.map(item => item.intent),
        apiVersion: AI_MAJOR_HISTORY_API_VERSION
      }, 409);
    }
    const directionQuery = resolvedInputs.intentRows.some(item => item.intent.intentLevel === 'direction' && item.intent.status === 'ready');
    const limit = directionQuery ? Math.max(requestedLimit, 200) : requestedLimit;
    const executionInputs = [...new Set([...resolvedInputs.inputs, ...(majorScope === 'admission-groups' ? majorInputs : [])])];
    const matchedByInput = executionInputs.map(input => ({ input, keys: resolveMajorKeys(manifest, input, majorScope) }));
    const majorKeys = [...new Set(matchedByInput.flatMap(item => item.keys))];
    if (!majorKeys.length) return json({ ok: true, majorInputs, region, projectMode, majorScope, bottomLineMode, matchedMajors: [], majorIntent: resolvedInputs.intentRows.map(item => item.intent), total: 0, records: [], summary: { total: 0, schoolCount: 0, minScore: null, maxScore: null }, complete: true, dataYear: 2026, apiVersion: AI_MAJOR_HISTORY_API_VERSION, indexVersion: AI_MAJOR_HISTORY_INDEX_VERSION, boundary: '这是2026辽宁物理类实际投档数据的专业历史查询；未命中不等于该专业全国不存在。' });
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
          records.push({
            ...record,
            candidateScore,
            candidateReferenceRank2026: Number.isFinite(candidateRank) ? candidateRank : null,
            positionDistance2026: Number.isFinite(candidateRank) && Number.isFinite(Number(record.rank2026))
              ? Math.abs(Number(record.rank2026) - candidateRank)
              : null
          });
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
      ok: true, major: majorInputs.join('、'), majorInputs, region, projectMode, majorScope, schoolKeyword, bottomLineMode, scoreRange, candidateScore, candidateReferenceRank2026: Number.isFinite(candidateRank) ? candidateRank : null, sort: requestedSort || (candidateRank ? 'position-near' : 'score-desc'), matchedMajors: majorKeys, matchedByInput, total, offset, limit, nextOffset: offset + page.length < total ? offset + page.length : null,
      records: page, summary: stats, complete: offset === 0 && page.length === total, dataYear: 2026, audienceYear: 2027,
      source: { level: 'B', sourceName: '辽宁2026物理类专业投档静态真值索引', sourceVersion: manifest.source?.version || '', sourceRecordCount: Number(manifest.source?.recordCount || 0), derivedIndex: true, sameTruthSet: manifest.integrity?.sameTruthSet === true },
      apiVersion: AI_MAJOR_HISTORY_API_VERSION, indexVersion: AI_MAJOR_HISTORY_INDEX_VERSION,
      boundary: `这里列的是2026辽宁物理类实际投档记录${scoreRange.kind!=='none'?`，并按${minScore!==null?`${minScore}分以上`:''}${minScore!==null&&maxScore!==null?'且':''}${maxScore!==null?`${maxScore}分以下`:''}过滤`:''}；${majorScope==='admission-groups'?'已保留学校原始招生大类/试验班名称，具体包含专业和分流规则需逐校核对；':'默认按核心专业集合查询，招生大类不自动混入；'}默认包含普通项目和中外/高收费项目，若明确排除则按项目性质过滤。它不是2027录取承诺，正式填报仍要核对当年招生计划。`
    });
  } catch (error) {
    return json({ ok: false, code: 'major_history_failed', message: clean(error?.message || error, 320), apiVersion: AI_MAJOR_HISTORY_API_VERSION }, 500);
  }
}
