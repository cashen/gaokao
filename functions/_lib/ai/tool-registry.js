import { lookupScoreRank, getRankTableMeta } from '../rank-table-provider.js';
import { onRequest as majorBandsOnRequest } from '../../api/major-bands.js';

export const AI_TOOL_REGISTRY_VERSION = 'ai-tool-registry-v3990_1';
export const AI_MAJOR_BANDS_ADAPTER_VERSION = 'ai-major-bands-adapter-v3990_1';

export const AI_TOOL_REGISTRY = Object.freeze({
  rank_lookup: Object.freeze({ name: 'rank_lookup', deterministic: true, maxConcurrency: 1 }),
  major_band_search: Object.freeze({ name: 'major_band_search', deterministic: true, maxConcurrency: 1 }),
  school_compare: Object.freeze({ name: 'school_compare', deterministic: true, maxConcurrency: 1 }),
  major_compare: Object.freeze({ name: 'major_compare', deterministic: true, maxConcurrency: 1 })
});

function clean(value, max = 220) { return String(value == null ? '' : value).trim().slice(0, max); }
function unique(values, max = 12) { return [...new Set((Array.isArray(values) ? values : []).map(value => clean(value, 100)).filter(Boolean))].slice(0, max); }

function normalizeRegionKeys(values = []) {
  const source = unique(values, 8);
  if (!source.length || source.includes('all')) return ['all'];
  if (source.includes('outside')) return ['outside'];
  const normalized = source.map(key => {
    if (key === 'ln') return 'province:辽宁';
    return key;
  });
  return unique(normalized, 4);
}

function constraintValues(workspace = {}, key) {
  const item = (workspace?.hardConstraints || []).find(entry => entry?.key === key);
  return unique(item?.values || [], 12);
}

export function resolveRegionExecution(view = {}, workspace = {}) {
  const familyInclude = constraintValues(workspace, 'regionInclude');
  const familyExclude = constraintValues(workspace, 'regionExclude');
  const active = normalizeRegionKeys(view.regionKeys || []);
  let include = active.length ? active : (familyInclude.length ? normalizeRegionKeys(familyInclude) : ['all']);
  const exclude = unique(familyExclude, 12);

  if (include.includes('all') && exclude.length) {
    return {
      includeKeys: ['all'], excludeKeys: exclude, exact: false,
      warning: '家庭存在长期排除地区，但当前观察范围是全国；为避免用不完整集合做减法，本轮不自动删除，待用户明确观察范围后再执行。'
    };
  }
  const remaining = include.filter(key => !exclude.includes(key));
  if (!remaining.length) return { includeKeys: include, excludeKeys: exclude, exact: false, warning: '当前观察范围与家庭长期排除条件冲突，本轮不执行候选删除。' };
  return { includeKeys: normalizeRegionKeys(remaining), excludeKeys: exclude, exact: true, warning: '' };
}

export function runRankLookup(score) {
  const numeric = Math.round(Number(score));
  if (!Number.isFinite(numeric) || numeric < 150 || numeric > 750) return { ok: false, code: 'invalid_score', message: '参考分数需在150—750之间。' };
  const row = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score: numeric });
  const meta = getRankTableMeta({ year: 2026, region: 'ln', subject: 'physics' }) || {};
  if (!row) return { ok: false, code: 'rank_unavailable', score: numeric, message: '2026辽宁物理类成绩统计表没有可识别的对应位置。' };
  return {
    ok: true, score: numeric, rankStart: Number(row.rankStart), rankEnd: Number(row.rankEnd), rankForGap: Number(row.rankForGap),
    sameCount: Number(row.sameCount || 0), emptyScore: Boolean(row.emptyScore),
    source: { level: 'A', sourceName: '辽宁省2026年普通高校招生考试成绩统计表', sourceUrl: 'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2026063014014729932/index.shtml', dataYear: 2026, internalSourceSha256: clean(meta.sourceSha256, 100) }
  };
}

function requestForMajorBands(context, params = {}) {
  const sourceUrl = new URL(context.request.url);
  const url = new URL('/api/major-bands', sourceUrl.origin);
  url.searchParams.set('candidateScore', String(params.score));
  url.searchParams.set('rangePreset', params.rangePreset || 'standard');
  url.searchParams.set('region', params.region || 'all');
  if (params.majorKeyword) url.searchParams.set('majorKeyword', params.majorKeyword);
  if (params.schoolKeyword) url.searchParams.set('schoolKeyword', params.schoolKeyword);
  url.searchParams.set('bottomLineMode', params.bottomLineMode || 'all');
  url.searchParams.set('specialProjectMode', 'hide_eligibility_projects');
  url.searchParams.set('limit', String(Math.max(16, Math.min(24, Number(params.limit || 16)))));
  return new Request(url.toString(), { method: 'GET', headers: { accept: 'application/json' } });
}

async function executeMajorBandsOnce(context, params) {
  const response = await majorBandsOnRequest({ ...context, request: requestForMajorBands(context, params) });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok || !payload?.ok) return { ok: false, status: response.status, message: clean(payload?.message || '专业候选查询失败。', 260), payload, region: params.region || 'all' };
  const records = [];
  for (const key of ['upper', 'near', 'steady']) for (const record of payload?.bands?.[key]?.records || []) records.push({ ...record, bandKey: record.bandKey || key });
  return { ok: true, meta: payload.meta, counts: payload.counts, records, searchAdvices: payload.searchAdvices || [], filterConflicts: payload.filterConflicts || [], keywordWarnings: payload.keywordWarnings || [], source: payload.source || {}, region: params.region || 'all' };
}

function mergeCandidateExecutions(executions = []) {
  const successful = executions.filter(item => item?.ok);
  const byId = new Map();
  const counts = { upper: 0, near: 0, steady: 0, total: 0 };
  const warnings = [];
  for (const execution of successful) {
    counts.upper += Number(execution.counts?.upper || 0); counts.near += Number(execution.counts?.near || 0); counts.steady += Number(execution.counts?.steady || 0);
    for (const record of execution.records || []) {
      const key = clean(record?.id, 220) || `${record?.school || ''}|${record?.major || ''}`;
      if (key && !byId.has(key)) byId.set(key, record);
    }
    for (const advice of execution.searchAdvices || []) {
      const message = clean(advice?.message || advice, 260); if (message && !warnings.includes(message)) warnings.push(message);
    }
  }
  counts.total = counts.upper + counts.near + counts.steady;
  return {
    ok: successful.length > 0, regionsQueried: successful.map(item => item.region), counts,
    records: [...byId.values()].slice(0, 48), previewOnly: true, previewLimit: 48, warnings: warnings.slice(0, 8),
    failures: executions.filter(item => !item?.ok).map(item => ({ status: item?.status || 0, message: item?.message || '查询失败' })),
    source: successful[0]?.source || {}, meta: successful[0]?.meta || null, adapterVersion: AI_MAJOR_BANDS_ADAPTER_VERSION
  };
}

export async function runMajorBandSearch(context, { score, majorKeywords = [], regionKeys = ['all'], bottomLineMode = 'all', schoolKeyword = '' } = {}) {
  const numeric = Math.round(Number(score));
  if (!Number.isFinite(numeric)) return { ok: false, code: 'score_required', message: '需要参考分数后才能执行候选查询。' };
  const regions = normalizeRegionKeys(regionKeys);
  const keyword = unique(majorKeywords, 8).join('/');
  const executions = [];
  // Bounded sequential execution: no unbounded Promise.all and no public HTTP self-call.
  for (const region of regions.slice(0, 4)) executions.push(await executeMajorBandsOnce(context, { score: numeric, rangePreset: 'standard', region, majorKeyword: keyword, schoolKeyword, bottomLineMode, limit: 16 }));
  return mergeCandidateExecutions(executions);
}

function uniqueField(records, field, max = 80) { return unique((records || []).map(item => item?.[field]).filter(Boolean), max); }
function comparisonItem(label, result, objectType) {
  const records = result?.records || [];
  return {
    label, objectType, ok: Boolean(result?.ok), counts: result?.counts || { upper:0, near:0, steady:0, total:0 },
    reachableSchoolCount: uniqueField(records, 'school', 200).length,
    reachableMajorCount: uniqueField(records, 'major', 200).length,
    sampleSchools: uniqueField(records, 'school', 8),
    sampleMajors: uniqueField(records, 'major', 8),
    records: records.slice(0, 8),
    note: '只比较当前分数、当前范围内的确定性可达空间；培养方案、就业、推免等没有统一官方口径时不作优劣结论。'
  };
}

export async function runSchoolComparison(context, { score, schoolNames = [], majorKeywords = [], regionKeys = ['all'], bottomLineMode = 'all' } = {}) {
  const schools = unique(schoolNames, 3);
  if (schools.length < 2) return { ok: false, code: 'comparison_requires_two_schools', message: '至少需要两所明确学校才能执行学校比较。' };
  const items = [];
  for (const school of schools) {
    const result = await runMajorBandSearch(context, { score, majorKeywords, regionKeys, bottomLineMode, schoolKeyword: school });
    items.push(comparisonItem(school, result, 'school'));
  }
  return { ok: items.some(item => item.ok), kind: 'school', items, deterministic: true, comparableDimensions: ['当前位次可达记录','冲/主要参考/低分侧结构','可见专业样本'], pendingEvidenceDimensions: ['培养方案','就业口径','推免政策','校区与具体学费'], adapterVersion: AI_MAJOR_BANDS_ADAPTER_VERSION };
}

export async function runMajorComparison(context, { score, majorKeywords = [], regionKeys = ['all'], bottomLineMode = 'all' } = {}) {
  const majors = unique(majorKeywords, 3);
  if (majors.length < 2) return { ok: false, code: 'comparison_requires_two_majors', message: '至少需要两个明确专业方向才能执行专业比较。' };
  const items = [];
  for (const major of majors) {
    const result = await runMajorBandSearch(context, { score, majorKeywords: [major], regionKeys, bottomLineMode });
    items.push(comparisonItem(major, result, 'major'));
  }
  return { ok: items.some(item => item.ok), kind: 'major', items, deterministic: true, comparableDimensions: ['当前位次可达记录','候选学校覆盖','冲/主要参考/低分侧结构'], pendingEvidenceDimensions: ['课程体系','培养方案','就业路径的学校级证据'], adapterVersion: AI_MAJOR_BANDS_ADAPTER_VERSION };
}
