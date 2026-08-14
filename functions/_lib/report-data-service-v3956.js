import { selectMajorBandsStaticBuckets, loadMajorBandsStaticBucket } from './major-bands-static-provider.js';
import { normalizeRecord, rawScore, rawSchool } from './fenxi-normalizer.js';
import { makeBands } from './band-engine.js';
import { matchRegion } from './major-filter.js';
import { buildDisplayTags } from './school-display-tags.js';
import {
  normalizeBottomLineMode,
  getBottomLineEligibility,
  getBottomLineSortWeight,
  enrichBottomLineFields,
  bottomLineModeSummary
} from './bottomline-policy.js';
import { buildKeywordQuery } from './keyword-query.js';
import { matchMajorProject } from './major-project-matcher.js';
import { buildSearchIndex } from './search-index-builder.js';
import { normalizeFenxiCodes } from './fenxi-code-normalizer.js';
import { mapStandardMajor } from './standard-major-mapper.js';
import { lookupScoreRank } from './rank-table-provider.js';
import { resolveAdmissionSchoolQuery } from './school-query-provider.v3969.js';
import { SCHOOL_QUERY_STATUSES, normalizeSchoolQueryIntent } from '../../shared/resources/schools/school-query-contract.v3969_0.js';
import { acceptedAdmissionSchoolNames, normalizeUnifiedSchoolName } from '../../shared/resources/schools/school-query-engine.v3969_0.js';
import { FEISHU_REPORT_CONTRACT, validateFeishuCandidateScore } from '../../shared/resources/reports/feishu-report-contract.js';
import { resolveCanonicalPosition } from '../../shared/algorithms/position/canonical-position.v3963_0.js';
import { rankRecords } from '../../shared/algorithms/ranking/staged-ranking.v3960_0.js';
import { makeDecisionSnapshot } from '../../shared/algorithms/contracts/decision-snapshot.v3960_0.js';
import { ALGORITHM_ORCHESTRATION_VERSION } from '../../shared/algorithms/algorithm-registry.js';

function clean(value, max = 50) {
  return String(value || '').trim().slice(0, max);
}

function finite(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function initGrouped(bands) {
  return {
    upper: { ...bands.upper, records: [], count: 0 },
    near: { ...bands.near, records: [], count: 0 },
    steady: { ...bands.steady, records: [], count: 0 }
  };
}

function rawSchoolPass(raw, acceptedSchoolNames) {
  return !acceptedSchoolNames?.size || acceptedSchoolNames.has(normalizeUnifiedSchoolName(rawSchool(raw)));
}

function candidateRankForScore(score) {
  const row = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score });
  return finite(row?.rankForGap ?? row?.rankEnd, null);
}

export function normalizeReportParams(input = {}) {
  const candidate = validateFeishuCandidateScore(input.candidateScore);
  if (!candidate.valid) {
    throw new Error(`请先输入 ${FEISHU_REPORT_CONTRACT.candidateScoreMin}～${FEISHU_REPORT_CONTRACT.candidateScoreMax} 之间的有效分数后再生成飞书报告。`);
  }
  const activeBand = clean(input.activeBand || input.bandFocus || 'near', 20);
  if (!['upper', 'near', 'steady'].includes(activeBand)) throw new Error('飞书报告区间参数不正确。');
  const rangePreset = clean(input.rangePreset || 'standard', 20);
  const maxRecordsRaw = Math.round(Number(input.maxRecords || FEISHU_REPORT_CONTRACT.currentBandMaxRecords));
  const maxRecords = Math.max(1, Math.min(30, Number.isFinite(maxRecordsRaw) ? maxRecordsRaw : FEISHU_REPORT_CONTRACT.currentBandMaxRecords));
  const majorKeyword = clean(input.filters?.majorKeyword || '', 160);
  return {
    candidateScore: candidate.score,
    candidateReferenceRank2026: finite(input.candidateReferenceRank2026, candidateRankForScore(candidate.score)),
    activeBand,
    rangePreset,
    maxRecords,
    filters: {
      region: clean(input.filters?.region || 'all', 30),
      schoolKeyword: clean(input.filters?.schoolKeyword || '', 40),
      schoolQueryIntent: normalizeSchoolQueryIntent(input.filters?.schoolQueryIntent || 'auto'),
      majorKeyword,
      bottomLineMode: normalizeBottomLineMode(input.filters?.bottomLineMode || 'all'),
      keywordQuery: input.filters?.keywordQuery || buildKeywordQuery(majorKeyword)
    }
  };
}

function minMaxScore(bands) {
  const all = [bands.upper, bands.near, bands.steady];
  return { min: Math.min(...all.map(item => item.minScore)), max: Math.max(...all.map(item => item.maxScore)) };
}

async function loadBoundedReportRecords(request, env, scoreWindow) {
  const options = { assets: env?.ASSETS };
  const { manifest, buckets } = await selectMajorBandsStaticBuckets(request, scoreWindow, options);
  const records = [];
  const bucketFiles = [];
  let decodedRows = 0;
  for (const bucket of buckets) {
    const loaded = await loadMajorBandsStaticBucket(request, bucket.file, scoreWindow, options);
    decodedRows += Number(loaded.rowCount || 0);
    bucketFiles.push(bucket.file);
    records.push(...loaded.records);
  }
  return { manifest, records, decodedRows, bucketFiles };
}

function normalizeCodesAndMajor(record, raw = record) {
  const codes = record.codes && typeof record.codes === 'object' ? record.codes : normalizeFenxiCodes(raw);
  const standardMajor = record.standardMajor?.code || record.standardMajor?.categoryCode
    ? record.standardMajor
    : mapStandardMajor({
        majorName: record.major,
        standardMajorCode: codes.standardMajorCode || (codes.rawFenxiMajorCodeLooksStandard ? codes.rawFenxiMajorCode : '')
      });
  if (!codes.standardMajorCode && standardMajor?.code) codes.standardMajorCode = standardMajor.code;
  return { codes, standardMajor };
}

function normalizeCanonicalRecord(raw = {}, params, fallbackBand = '') {
  const score = finite(raw.score2026 ?? raw.score, null);
  if (!raw.school || !raw.major || score == null) return null;
  const rank = finite(raw.rank2026 ?? raw.rank ?? raw.minRank ?? raw.lowestRank ?? raw.referenceRank, null);
  const display = buildDisplayTags({ ...raw, score, rank });
  const mapped = normalizeCodesAndMajor({ ...raw, score, rank }, raw);
  const bottomLine = enrichBottomLineFields(raw);
  const eligibility = getBottomLineEligibility({ ...raw, ...bottomLine }, params.filters.bottomLineMode);
  const canonicalPosition = resolveCanonicalPosition({
    candidateScore: params.candidateScore,
    candidateRank: params.candidateReferenceRank2026,
    recordScore: score,
    recordRank: rank,
    scoreDelta: raw.scoreDelta2026 ?? raw.scoreDelta,
    rankGap: raw.rankGap2026 ?? raw.rankGap,
    rangePreset: params.rangePreset
  });
  const bandKey = canonicalPosition.bandKey === 'outside' || canonicalPosition.bandKey === 'unknown'
    ? fallbackBand
    : canonicalPosition.bandKey;
  return {
    ...raw,
    ...display,
    ...mapped,
    ...bottomLine,
    score,
    rank,
    score2026: score,
    rank2026: rank,
    scoreDelta2026: canonicalPosition.scoreDelta,
    scoreDelta: canonicalPosition.scoreDelta,
    rankGap2026: canonicalPosition.rankGap,
    rankGap: canonicalPosition.rankGap,
    band: bandKey,
    bandKey,
    statusKey: canonicalPosition.statusKey,
    statusLabel: canonicalPosition.statusLabel,
    position: canonicalPosition.position,
    canonicalPosition,
    bottomLineEligibility: eligibility.status,
    bottomLineEligibilityReason: eligibility.reason
  };
}

function baseReportOutput(params, bandsMeta, selectedRecords, counts, sourceMode, extra = {}) {
  const selectedBand = { ...bandsMeta[params.activeBand], records: selectedRecords, count: selectedRecords.length };
  const decisionSnapshot = makeDecisionSnapshot({
    candidateScore: params.candidateScore,
    candidateReferenceRank2026: params.candidateReferenceRank2026,
    rangePreset: params.rangePreset,
    filters: params.filters,
    records: selectedRecords
  });
  return {
    ...params,
    dataScope: `辽宁${FEISHU_REPORT_CONTRACT.dataYear}物理类`,
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
    algorithmOrchestrationVersion: ALGORITHM_ORCHESTRATION_VERSION,
    bands: {
      upper: { ...bandsMeta.upper, records: params.activeBand === 'upper' ? selectedRecords : [], count: counts.upper },
      near: { ...bandsMeta.near, records: params.activeBand === 'near' ? selectedRecords : [], count: counts.near },
      steady: { ...bandsMeta.steady, records: params.activeBand === 'steady' ? selectedRecords : [], count: counts.steady }
    },
    counts,
    selectedBand,
    selectedRecords,
    decisionSnapshot,
    bandRanges: bandsMeta,
    keywordQuery: params.filters.keywordQuery,
    bottomLine: bottomLineModeSummary(params.filters.bottomLineMode),
    sourceMode,
    ...extra
  };
}

function directReportData(input, params, bandsMeta) {
  const raw = Array.isArray(input.selectedRecords) ? input.selectedRecords : [];
  if (!raw.length) return null;
  const selectedRecords = raw
    .slice(0, params.maxRecords)
    .map(item => normalizeCanonicalRecord(item, params, params.activeBand))
    .filter(Boolean);
  if (!selectedRecords.length) throw new Error('当前页面传入的专业记录不完整，无法生成报告。');
  const countsInput = input.counts && typeof input.counts === 'object' ? input.counts : {};
  const counts = {
    upper: finite(countsInput.upper, params.activeBand === 'upper' ? selectedRecords.length : 0),
    near: finite(countsInput.near, params.activeBand === 'near' ? selectedRecords.length : 0),
    steady: finite(countsInput.steady, params.activeBand === 'steady' ? selectedRecords.length : 0)
  };
  counts.total = finite(countsInput.total, counts.upper + counts.near + counts.steady);
  return baseReportOutput(params, bandsMeta, selectedRecords, counts, 'current-decision-snapshot', {
    manifest: null,
    bottomLineExcluded: 0,
    bottomLineUnresolved: selectedRecords.filter(item => item.bottomLineEligibility === 'unresolved').length,
    keywordExcluded: 0,
    matchSummary: input.matchSummary || null
  });
}

async function rebuildCanonicalReportData(request, env, input, params, bandsMeta) {
  const scoreWindow = minMaxScore(bandsMeta);
  const boundedLoad = await loadBoundedReportRecords(request, env || {}, scoreWindow);
  const { manifest, records: rawRecords } = boundedLoad;
  const grouped = initGrouped(bandsMeta);
  const keywordQuery = buildKeywordQuery(params.filters.majorKeyword);
  const filters = { ...params.filters, keywordQuery };
  let acceptedSchoolNames = null;
  if (filters.schoolKeyword) {
    const schoolQueryResult = await resolveAdmissionSchoolQuery(request, {
      query: filters.schoolKeyword,
      intent: filters.schoolQueryIntent,
      limit: 500
    });
    if (schoolQueryResult.status !== SCHOOL_QUERY_STATUSES.RESOLVED) {
      throw new Error('学校条件需要先在主页面确认一所准确学校；城市范围请使用地区条件。');
    }
    acceptedSchoolNames = acceptedAdmissionSchoolNames(schoolQueryResult);
  }
  let bottomLineExcluded = 0;
  let bottomLineUnresolved = 0;
  let keywordExcluded = 0;
  const matchSummary = { exact: 0, related: 0, industry: 0, project: 0, weak: 0 };

  for (const raw of rawRecords) {
    const score = rawScore(raw);
    if (!Number.isFinite(score) || score < scoreWindow.min || score > scoreWindow.max) continue;
    if (!rawSchoolPass(raw, acceptedSchoolNames)) continue;
    const record = { ...normalizeRecord(raw), rawText: JSON.stringify(raw).slice(0, 1600) };
    Object.assign(record, normalizeCodesAndMajor(record, raw));
    Object.assign(record, enrichBottomLineFields(record));
    if (!record.school || !record.major || !Number.isFinite(record.score)) continue;
    if (!matchRegion(record, filters.region)) continue;
    if (filters.schoolKeyword && !acceptedSchoolNames?.has(normalizeUnifiedSchoolName(record.school))) continue;
    const match = matchMajorProject(buildSearchIndex([record])[0], keywordQuery);
    if (!match.matched) { keywordExcluded += 1; continue; }
    Object.assign(record, {
      matchBadges: match.badges,
      matchLevel: match.matchLevel || '',
      matchLabel: match.matchLabel || '',
      matchReason: match.matchReason || match.reason || '',
      matchedKeyword: match.matchedKeyword || '',
      matchedTerms: match.matchedTerms || [],
      matchScore: match.score
    });
    const normalized = normalizeCanonicalRecord(record, params, '');
    if (!normalized || !['upper', 'near', 'steady'].includes(normalized.bandKey)) continue;
    if (normalized.bottomLineEligibility === 'fail') { bottomLineExcluded += 1; continue; }
    if (normalized.bottomLineEligibility === 'unresolved') bottomLineUnresolved += 1;
    if (normalized.matchLevel && Object.prototype.hasOwnProperty.call(matchSummary, normalized.matchLevel)) matchSummary[normalized.matchLevel] += 1;
    grouped[normalized.bandKey].records.push(normalized);
    grouped[normalized.bandKey].count += 1;
  }

  for (const key of ['upper', 'near', 'steady']) {
    grouped[key].records = rankRecords(grouped[key].records, {
      getSoftPreferenceWeight: record => getBottomLineSortWeight(record, filters.bottomLineMode)
    });
  }
  const counts = { upper: grouped.upper.count, near: grouped.near.count, steady: grouped.steady.count };
  counts.total = counts.upper + counts.near + counts.steady;
  const selectedRecords = grouped[params.activeBand].records.slice(0, params.maxRecords);
  if (!selectedRecords.length) throw new Error('当前筛选条件下没有可生成的专业结果。');
  return baseReportOutput(params, bandsMeta, selectedRecords, counts, 'bounded-major-bands-server-rebuild-2026', {
    manifest,
    runtimeBuckets: boundedLoad.bucketFiles,
    runtimeDecodedRows: boundedLoad.decodedRows,
    bands: grouped,
    selectedBand: { ...grouped[params.activeBand], records: selectedRecords, count: selectedRecords.length },
    bottomLineExcluded,
    bottomLineUnresolved,
    keywordExcluded,
    matchSummary
  });
}

export async function buildReportDataV3956(request, env, input = {}) {
  const params = normalizeReportParams(input);
  const bandsMeta = makeBands(params.candidateScore, params.rangePreset);
  return directReportData(input, params, bandsMeta)
    || rebuildCanonicalReportData(request, env, input, params, bandsMeta);
}
