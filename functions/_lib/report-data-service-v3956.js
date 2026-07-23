import { loadAllRecords } from './ln-rank-manifest.js';
import { normalizeRecord, rawScore, rawSchool } from './fenxi-normalizer.js';
import { classifyBand, makeBands } from './band-engine.js';
import { getStatus } from './status-engine.js';
import { matchRegion } from './major-filter.js';
import { buildDisplayTags } from './school-display-tags.js';
import { normalizeBottomLineMode, passBottomLineMode, enrichBottomLineFields, bottomLineModeSummary } from './bottomline-policy.js';
import { buildKeywordQuery } from './keyword-query.js';
import { matchMajorProject } from './major-project-matcher.js';
import { buildSearchIndex } from './search-index-builder.js';
import { normalizeFenxiCodes } from './fenxi-code-normalizer.js';
import { mapStandardMajor } from './standard-major-mapper.js';
import { FEISHU_REPORT_CONTRACT, validateFeishuCandidateScore } from '../../shared/resources/reports/feishu-report-contract.js';

function clean(value, max = 50) {
  return String(value || '').trim().slice(0, max);
}

function finite(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function rankSortValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : Number.MAX_SAFE_INTEGER;
}

function initGrouped(bands) {
  return {
    upper: { ...bands.upper, records: [], count: 0 },
    near: { ...bands.near, records: [], count: 0 },
    steady: { ...bands.steady, records: [], count: 0 }
  };
}

function rawSchoolPass(raw, schoolKeyword) {
  const keyword = clean(schoolKeyword || '', 40);
  return !keyword || rawSchool(raw).includes(keyword);
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
    activeBand,
    rangePreset,
    maxRecords,
    filters: {
      region: clean(input.filters?.region || 'all', 30),
      schoolKeyword: clean(input.filters?.schoolKeyword || '', 40),
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

function normalizeDirectRecord(raw = {}, candidateScore, fallbackBand = '') {
  const score = finite(raw.score2026 ?? raw.score, null);
  if (!raw.school || !raw.major || score == null) return null;
  const rank = finite(raw.rank2026 ?? raw.rank ?? raw.minRank ?? raw.lowestRank ?? raw.referenceRank, null);
  const delta = finite(raw.scoreDelta2026 ?? raw.scoreDelta, score - candidateScore);
  const status = getStatus(delta);
  const display = buildDisplayTags({ ...raw, score, rank });
  const mapped = normalizeCodesAndMajor({ ...raw, score, rank }, raw);
  return {
    ...raw,
    ...display,
    ...mapped,
    score,
    rank,
    score2026: score,
    rank2026: rank,
    scoreDelta2026: delta,
    scoreDelta: delta,
    rankGap2026: finite(raw.rankGap2026 ?? raw.rankGap, null),
    rankGap: finite(raw.rankGap2026 ?? raw.rankGap, null),
    band: raw.band || raw.bandKey || fallbackBand,
    bandKey: raw.bandKey || raw.band || fallbackBand,
    statusKey: raw.statusKey || status.key,
    statusLabel: raw.statusLabel || status.label,
    position: raw.position || status.position
  };
}

function directReportData(input, params, bandsMeta) {
  const raw = Array.isArray(input.selectedRecords) ? input.selectedRecords : [];
  if (!raw.length) return null;
  const selectedRecords = raw
    .slice(0, params.maxRecords)
    .map(item => normalizeDirectRecord(item, params.candidateScore, params.activeBand))
    .filter(Boolean);
  if (!selectedRecords.length) throw new Error('当前页面传入的专业记录不完整，无法生成报告。');
  const countsInput = input.counts && typeof input.counts === 'object' ? input.counts : {};
  const counts = {
    upper: finite(countsInput.upper, params.activeBand === 'upper' ? selectedRecords.length : 0),
    near: finite(countsInput.near, params.activeBand === 'near' ? selectedRecords.length : 0),
    steady: finite(countsInput.steady, params.activeBand === 'steady' ? selectedRecords.length : 0)
  };
  counts.total = finite(countsInput.total, counts.upper + counts.near + counts.steady);
  const selectedBand = { ...bandsMeta[params.activeBand], records: selectedRecords, count: selectedRecords.length };
  return {
    ...params,
    dataScope: `辽宁${FEISHU_REPORT_CONTRACT.dataYear}物理类`,
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
    manifest: null,
    bands: {
      upper: { ...bandsMeta.upper, records: params.activeBand === 'upper' ? selectedRecords : [], count: counts.upper },
      near: { ...bandsMeta.near, records: params.activeBand === 'near' ? selectedRecords : [], count: counts.near },
      steady: { ...bandsMeta.steady, records: params.activeBand === 'steady' ? selectedRecords : [], count: counts.steady }
    },
    counts,
    selectedBand,
    selectedRecords,
    bandRanges: bandsMeta,
    keywordQuery: input.filters?.keywordQuery || buildKeywordQuery(params.filters.majorKeyword),
    bottomLine: bottomLineModeSummary(params.filters.bottomLineMode),
    bottomLineExcluded: 0,
    keywordExcluded: 0,
    matchSummary: input.matchSummary || null,
    sourceMode: 'current-visible-band'
  };
}

function pushRecord(grouped, band, record, candidateScore) {
  const delta = record.score - candidateScore;
  const status = getStatus(delta);
  const display = buildDisplayTags(record);
  grouped[band].records.push({
    ...record,
    ...display,
    band,
    bandKey: band,
    score2026: record.score,
    rank2026: record.rank,
    scoreDelta2026: delta,
    scoreDelta: delta,
    statusKey: status.key,
    statusLabel: status.label,
    position: status.position
  });
  grouped[band].count += 1;
}

async function rebuildLegacyReportData(request, env, input, params, bandsMeta) {
  const { manifest, records: rawRecords } = await loadAllRecords(request, env || {});
  const scoreWindow = minMaxScore(bandsMeta);
  const grouped = initGrouped(bandsMeta);
  const keywordQuery = buildKeywordQuery(params.filters.majorKeyword);
  const filters = { ...params.filters, keywordQuery };
  let bottomLineExcluded = 0;
  let keywordExcluded = 0;
  const matchSummary = { exact: 0, related: 0, industry: 0, project: 0, weak: 0 };

  for (const raw of rawRecords) {
    const score = rawScore(raw);
    if (!Number.isFinite(score) || score < scoreWindow.min || score > scoreWindow.max) continue;
    if (!rawSchoolPass(raw, filters.schoolKeyword)) continue;
    const record = { ...normalizeRecord(raw), rawText: JSON.stringify(raw).slice(0, 1600) };
    Object.assign(record, normalizeCodesAndMajor(record, raw));
    Object.assign(record, enrichBottomLineFields(record));
    if (!record.school || !record.major || !Number.isFinite(record.score)) continue;
    if (!matchRegion(record, filters.region)) continue;
    if (filters.schoolKeyword && !record.school.includes(filters.schoolKeyword)) continue;
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
    if (!passBottomLineMode(record, filters.bottomLineMode)) { bottomLineExcluded += 1; continue; }
    const band = classifyBand(record.score, bandsMeta);
    if (!band) continue;
    if (record.matchLevel && Object.prototype.hasOwnProperty.call(matchSummary, record.matchLevel)) matchSummary[record.matchLevel] += 1;
    pushRecord(grouped, band, record, params.candidateScore);
  }

  for (const key of ['upper', 'near', 'steady']) {
    grouped[key].records.sort((a, b) => (Number(b.matchScore || 0) - Number(a.matchScore || 0)) || Math.abs(a.score - params.candidateScore) - Math.abs(b.score - params.candidateScore) || rankSortValue(a.rank) - rankSortValue(b.rank));
    grouped[key].count = grouped[key].records.length;
  }
  const counts = { upper: grouped.upper.count, near: grouped.near.count, steady: grouped.steady.count };
  counts.total = counts.upper + counts.near + counts.steady;
  const selectedBand = grouped[params.activeBand];
  if (!selectedBand?.records?.length) throw new Error('当前筛选条件下没有可生成的专业结果。');
  return {
    ...params,
    dataScope: `辽宁${FEISHU_REPORT_CONTRACT.dataYear}物理类`,
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
    manifest,
    bands: grouped,
    counts,
    selectedBand,
    selectedRecords: selectedBand.records.slice(0, params.maxRecords),
    bandRanges: bandsMeta,
    keywordQuery,
    bottomLine: bottomLineModeSummary(filters.bottomLineMode),
    bottomLineExcluded,
    keywordExcluded,
    matchSummary,
    sourceMode: 'legacy-server-rebuild-2026'
  };
}

export async function buildReportDataV3956(request, env, input = {}) {
  const params = normalizeReportParams(input);
  const bandsMeta = makeBands(params.candidateScore, params.rangePreset);
  return directReportData(input, params, bandsMeta)
    || rebuildLegacyReportData(request, env, input, params, bandsMeta);
}
