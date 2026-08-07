import { lookupScoreRank, getRankTableMeta } from '../rank-table-provider.js';
import { onRequest as majorBandsOnRequest } from '../../api/major-bands.js';

export const AI_TOOL_REGISTRY_VERSION = 'ai-tool-registry-v3990_0';
export const AI_MAJOR_BANDS_ADAPTER_VERSION = 'ai-major-bands-adapter-v3990_0';

export const AI_TOOL_REGISTRY = Object.freeze({
  rank_lookup: Object.freeze({ name: 'rank_lookup', deterministic: true, maxConcurrency: 1 }),
  major_band_search: Object.freeze({ name: 'major_band_search', deterministic: true, maxConcurrency: 1 }),
  school_compare: Object.freeze({ name: 'school_compare', deterministic: true, maxConcurrency: 1 })
});

function clean(value, max = 220) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function unique(values, max = 12) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => clean(value, 100)).filter(Boolean))].slice(0, max);
}

function normalizeRegionKeys(values = []) {
  const source = unique(values, 8);
  if (!source.length || source.includes('all')) return ['all'];
  if (source.includes('outside')) return ['outside'];
  if (source.includes('ln')) return ['ln', ...source.filter(key => !['shenyang', 'dalian', 'ln-other'].includes(key) && key !== 'ln')].slice(0, 3);
  return source.slice(0, 3);
}

function constraintValues(workspace = {}, key) {
  const item = (workspace?.hardConstraints || []).find(entry => entry?.key === key);
  return unique(item?.values || [], 12);
}

export function resolveRegionExecution(intent = {}, workspace = {}) {
  const existingInclude = constraintValues(workspace, 'regionInclude');
  const existingExclude = constraintValues(workspace, 'regionExclude');
  const explicitInclude = unique(intent.regionIncludeKeys || [], 8);
  const explicitExclude = unique(intent.regionExcludeKeys || [], 8);
  const include = explicitInclude.length ? explicitInclude : existingInclude;
  const exclude = unique([...existingExclude, ...explicitExclude], 12);

  if (!include.length) {
    return {
      includeKeys: ['all'],
      excludeKeys: exclude,
      exact: exclude.length === 0,
      warning: exclude.length ? '当前只有排除地区、没有可安全相减的明确地区集合；本轮不删除候选，先保留原结果并请求确认地区范围。' : ''
    };
  }

  const expanded = include.includes('ln')
    ? include
    : include;
  const remaining = expanded.filter(key => !exclude.includes(key));
  return {
    includeKeys: normalizeRegionKeys(remaining.length ? remaining : include),
    excludeKeys: exclude,
    exact: remaining.length > 0,
    warning: remaining.length ? '' : '地区条件相互冲突，本轮不执行候选删除。'
  };
}

export function runRankLookup(score) {
  const numeric = Math.round(Number(score));
  if (!Number.isFinite(numeric) || numeric < 150 || numeric > 750) {
    return { ok: false, code: 'invalid_score', message: '参考分数需在150—750之间。' };
  }
  const row = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score: numeric });
  const meta = getRankTableMeta({ year: 2026, region: 'ln', subject: 'physics' }) || {};
  if (!row) return { ok: false, code: 'rank_unavailable', score: numeric, message: '2026辽宁物理类成绩统计表没有可识别的对应位置。' };
  return {
    ok: true,
    score: numeric,
    rankStart: Number(row.rankStart),
    rankEnd: Number(row.rankEnd),
    rankForGap: Number(row.rankForGap),
    sameCount: Number(row.sameCount || 0),
    emptyScore: Boolean(row.emptyScore),
    source: {
      level: 'A',
      sourceName: '辽宁省2026年普通高校招生考试成绩统计表',
      sourceUrl: 'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2026063014014729932/index.shtml',
      dataYear: 2026,
      internalSourceSha256: clean(meta.sourceSha256, 100)
    }
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
  if (!response.ok || !payload?.ok) {
    return { ok: false, status: response.status, message: clean(payload?.message || '专业候选查询失败。', 260), payload };
  }
  const records = [];
  for (const key of ['upper', 'near', 'steady']) {
    for (const record of payload?.bands?.[key]?.records || []) {
      records.push({ ...record, bandKey: record.bandKey || key });
    }
  }
  return {
    ok: true,
    meta: payload.meta,
    counts: payload.counts,
    records,
    searchAdvices: payload.searchAdvices || [],
    filterConflicts: payload.filterConflicts || [],
    keywordWarnings: payload.keywordWarnings || [],
    source: payload.source || {},
    region: params.region || 'all'
  };
}

function mergeCandidateExecutions(executions = []) {
  const successful = executions.filter(item => item?.ok);
  const byId = new Map();
  const counts = { upper: 0, near: 0, steady: 0, total: 0 };
  const warnings = [];
  for (const execution of successful) {
    counts.upper += Number(execution.counts?.upper || 0);
    counts.near += Number(execution.counts?.near || 0);
    counts.steady += Number(execution.counts?.steady || 0);
    for (const record of execution.records || []) {
      const key = clean(record?.id, 220) || `${record?.school || ''}|${record?.major || ''}`;
      if (key && !byId.has(key)) byId.set(key, record);
    }
    for (const advice of execution.searchAdvices || []) {
      const message = clean(advice?.message || advice, 260);
      if (message && !warnings.includes(message)) warnings.push(message);
    }
  }
  counts.total = counts.upper + counts.near + counts.steady;
  const records = [...byId.values()].slice(0, 48);
  return {
    ok: successful.length > 0,
    regionsQueried: successful.map(item => item.region),
    counts,
    records,
    previewOnly: true,
    previewLimit: 48,
    warnings: warnings.slice(0, 8),
    failures: executions.filter(item => !item?.ok).map(item => ({ status: item?.status || 0, message: item?.message || '查询失败' })),
    source: successful[0]?.source || {},
    meta: successful[0]?.meta || null,
    adapterVersion: AI_MAJOR_BANDS_ADAPTER_VERSION
  };
}

export async function runMajorBandSearch(context, { score, majorKeywords = [], regionKeys = ['all'], bottomLineMode = 'all', schoolKeyword = '' } = {}) {
  const numeric = Math.round(Number(score));
  if (!Number.isFinite(numeric)) return { ok: false, code: 'score_required', message: '需要参考分数后才能执行候选查询。' };
  const regions = normalizeRegionKeys(regionKeys);
  const keyword = unique(majorKeywords, 6).join('/');
  const executions = [];
  for (const region of regions.slice(0, 3)) {
    executions.push(await executeMajorBandsOnce(context, {
      score: numeric,
      rangePreset: 'standard',
      region,
      majorKeyword: keyword,
      schoolKeyword,
      bottomLineMode,
      limit: 16
    }));
  }
  return mergeCandidateExecutions(executions);
}

export async function runSchoolComparison(context, { score, schoolNames = [], majorKeywords = [], bottomLineMode = 'all' } = {}) {
  const schools = unique(schoolNames, 3);
  if (schools.length < 2) return { ok: false, code: 'comparison_requires_two_schools', message: '至少需要两所明确学校才能执行比较。' };
  const items = [];
  for (const school of schools) {
    const result = await runMajorBandSearch(context, {
      score,
      majorKeywords,
      regionKeys: ['all'],
      bottomLineMode,
      schoolKeyword: school
    });
    items.push({ school, result });
  }
  return {
    ok: items.some(item => item.result?.ok),
    items,
    deterministic: true,
    adapterVersion: AI_MAJOR_BANDS_ADAPTER_VERSION
  };
}