import { loadAllRecords } from './fenxi-manifest.js';
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

function clean(value, max = 50) {
  return String(value || '').trim().slice(0, max);
}

function rankSortValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER;
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
  if (!keyword) return true;
  return rawSchool(raw).includes(keyword);
}

export function normalizeReportParams(input = {}) {
  const candidateScore = Math.round(Number(input.candidateScore));
  const activeBand = clean(input.activeBand || 'near', 20);
  const rangePreset = clean(input.rangePreset || 'standard', 20);
  const maxRecordsRaw = Math.round(Number(input.maxRecords || 20));
  const maxRecords = Math.max(1, Math.min(30, Number.isFinite(maxRecordsRaw) ? maxRecordsRaw : 20));

  if (!Number.isFinite(candidateScore) || candidateScore < 400 || candidateScore > 750) {
    throw new Error('请先输入 400～750 之间的有效分数后再生成飞书报告。');
  }

  if (!['upper', 'near', 'steady'].includes(activeBand)) {
    throw new Error('飞书报告区间参数不正确。');
  }

  const majorKeyword = clean(input.filters?.majorKeyword || '', 160);
  return {
    candidateScore,
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
  return {
    min: Math.min(...all.map(b => b.minScore)),
    max: Math.max(...all.map(b => b.maxScore))
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
    scoreDelta: delta,
    statusKey: status.key,
    statusLabel: status.label,
    position: status.position
  });
  grouped[band].count += 1;
}

export async function buildReportData(request, env, rawParams) {
  const params = normalizeReportParams(rawParams);
  const { manifest, records: rawRecords } = await loadAllRecords(request, env || {});
  const bandsMeta = makeBands(params.candidateScore, params.rangePreset);
  const scoreWindow = minMaxScore(bandsMeta);
  const grouped = initGrouped(bandsMeta);
  const keywordQuery = buildKeywordQuery(params.filters.majorKeyword);
  const filters = { ...params.filters, keywordQuery };
  let bottomLineExcluded = 0;
  let keywordExcluded = 0;
  const matchSummary = { exact: 0, related: 0, industry: 0, project: 0, weak: 0 };

  for (const raw of rawRecords) {
    const score = rawScore(raw);
    if (!Number.isFinite(score)) continue;
    if (score < scoreWindow.min || score > scoreWindow.max) continue;
    if (!rawSchoolPass(raw, filters.schoolKeyword)) continue;

    const record = { ...normalizeRecord(raw), rawText: JSON.stringify(raw).slice(0, 1600) };
    record.codes = normalizeFenxiCodes(raw);
    record.standardMajor = mapStandardMajor({
      majorName: record.major,
      standardMajorCode: record.codes.standardMajorCode || (record.codes.rawFenxiMajorCodeLooksStandard ? record.codes.rawFenxiMajorCode : '')
    });
    if (!record.codes.standardMajorCode && record.standardMajor?.code) record.codes.standardMajorCode = record.standardMajor.code;
    Object.assign(record, enrichBottomLineFields(record));

    if (!record.school || !record.major || !Number.isFinite(record.score)) continue;
    if (!matchRegion(record, filters.region)) continue;
    if (filters.schoolKeyword && !record.school.includes(filters.schoolKeyword)) continue;

    const indexed = buildSearchIndex([record])[0];
    const match = matchMajorProject(indexed, keywordQuery);
    if (!match.matched) { keywordExcluded += 1; continue; }
    record.matchBadges = match.badges;
    record.matchLevel = match.matchLevel || '';
    record.matchLabel = match.matchLabel || '';
    record.matchReason = match.matchReason || match.reason || '';
    record.matchedKeyword = match.matchedKeyword || '';
    record.matchedTerms = match.matchedTerms || [];
    record.matchScore = match.score;

    if (!passBottomLineMode(record, filters.bottomLineMode)) {
      bottomLineExcluded += 1;
      continue;
    }

    const band = classifyBand(record.score, bandsMeta);
    if (!band) continue;
    if (record.matchLevel && Object.prototype.hasOwnProperty.call(matchSummary, record.matchLevel)) matchSummary[record.matchLevel] += 1;
    pushRecord(grouped, band, record, params.candidateScore);
  }

  for (const key of ['upper', 'near', 'steady']) {
    grouped[key].records.sort((a, b) => (Number(b.matchScore || 0) - Number(a.matchScore || 0)) || Math.abs(a.score - params.candidateScore) - Math.abs(b.score - params.candidateScore) || rankSortValue(a.rank) - rankSortValue(b.rank));
    grouped[key].count = grouped[key].records.length;
  }

  const counts = {
    upper: grouped.upper.count,
    near: grouped.near.count,
    steady: grouped.steady.count
  };
  counts.total = counts.upper + counts.near + counts.steady;

  const selectedBand = grouped[params.activeBand];
  if (!selectedBand || !selectedBand.records.length) {
    throw new Error('当前筛选条件下没有可生成的专业结果。');
  }

  return {
    ...params,
    dataScope: '辽宁2025物理类',
    manifest,
    bands: grouped,
    counts,
    selectedBand,
    selectedRecords: selectedBand.records.slice(0, params.maxRecords),
    bandRanges: makeBands(params.candidateScore, params.rangePreset),
    keywordQuery,
    bottomLine: bottomLineModeSummary(filters.bottomLineMode),
    bottomLineExcluded,
    keywordExcluded,
    matchSummary
  };
}
