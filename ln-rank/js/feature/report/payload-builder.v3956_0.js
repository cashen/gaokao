import { FEISHU_REPORT_CONTRACT } from '../../../../shared/resources/reports/feishu-report-contract.js?v=3956_0';
import { buildKeywordQuery } from '../major-pool/keyword-parser.js?v=3951_0';
import { getRangePresetLabel } from '../../domain/range-policy.js?v=3951_0';
import { getBandFocusLabel } from '../../domain/band-policy.js?v=3951_0';

export function currentBandRecords(state) {
  const key = state?.bandFocus || state?.activeBand || 'near';
  const band = state?.bands?.data?.bands?.[key];
  return Array.isArray(band?.records) ? band.records : [];
}

export function canGenerateFeishuReport(state) {
  if (!state?.bands?.data) return { ok: false, reason: '请先查看符合条件的专业，再生成飞书报告。' };
  const records = currentBandRecords(state);
  if (!records.length) return { ok: false, reason: '当前区间没有可生成的专业结果。' };
  return { ok: true, reason: '' };
}

function array(value, limit = 8) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

function compactRecord(record = {}) {
  const score2026 = Number(record.score2026 ?? record.score);
  const rank2026 = Number(record.rank2026 ?? record.rank);
  return {
    id: record.id || '',
    school: record.school || '',
    major: record.major || '',
    score2026: Number.isFinite(score2026) ? score2026 : null,
    rank2026: Number.isFinite(rank2026) ? rank2026 : null,
    score2025: Number.isFinite(Number(record.score2025)) ? Number(record.score2025) : null,
    rank2025: Number.isFinite(Number(record.rank2025)) ? Number(record.rank2025) : null,
    score2024: Number.isFinite(Number(record.score2024)) ? Number(record.score2024) : null,
    rank2024: Number.isFinite(Number(record.rank2024)) ? Number(record.rank2024) : null,
    scoreDelta2026: Number.isFinite(Number(record.scoreDelta2026 ?? record.scoreDelta)) ? Number(record.scoreDelta2026 ?? record.scoreDelta) : null,
    rankGap2026: Number.isFinite(Number(record.rankGap2026 ?? record.rankGap)) ? Number(record.rankGap2026 ?? record.rankGap) : null,
    band: record.band || record.bandKey || '',
    bandKey: record.bandKey || record.band || '',
    statusLabel: record.statusLabel || '',
    position: record.position || '',
    matchLabel: record.matchLabel || '',
    matchReason: record.matchReason || '',
    matchLevel: record.matchLevel || '',
    matchedKeyword: record.matchedKeyword || '',
    matchedTerms: array(record.matchedTerms, 8),
    displayLocation: record.displayLocation || '',
    geoEntity: record.geoEntity || '',
    locationWarning: record.locationWarning || '',
    natureLabel: record.natureLabel || '',
    schoolTags: array(record.schoolTags, 8),
    flags: array(record.flags, 8),
    reviewPoints: array(record.reviewPoints, 8),
    tuition: record.tuition || '',
    standardMajor: record.standardMajor || {},
    codes: record.codes || {},
    specialProject: record.specialProject || null,
    historyCompare: record.historyCompare || null,
    localStrongChain: record.localStrongChain || null,
    trajectoryChain: record.trajectoryChain || null,
    localStrengthMark: record.localStrengthMark || null,
    majorUnderstanding: record.majorUnderstanding || null
  };
}

export function createReportContext(state) {
  return {
    candidateScore: Number(state?.candidateScore),
    rangePreset: state?.rangePreset || 'standard',
    rangePresetLabel: getRangePresetLabel(state?.rangePreset),
    bandFocus: state?.bandFocus || state?.activeBand || 'near',
    bandFocusLabel: getBandFocusLabel(state?.bandFocus || state?.activeBand),
    region: state?.filters?.region || 'all',
    schoolKeyword: state?.filters?.schoolKeyword || '',
    majorKeyword: state?.filters?.majorKeyword || '',
    ownershipFloor: state?.filters?.bottomLineMode || 'all',
    specialProjectMode: state?.filters?.specialProjectMode || 'hide_eligibility_projects',
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear
  };
}

export function buildFeishuReportPayload(state) {
  const candidateScore = Number(state.candidateScore);
  const majorKeyword = state.filters?.majorKeyword || '';
  const bottomLineMode = state.bands?.data?.meta?.bottomLineMode || state.filters?.bottomLineMode || 'all';
  const selectedRecords = currentBandRecords(state)
    .slice(0, FEISHU_REPORT_CONTRACT.currentBandMaxRecords)
    .map(compactRecord);
  const counts = state.bands?.data?.counts || {};
  return {
    candidateScore,
    rangePreset: state.rangePreset || 'standard',
    activeBand: state.bandFocus || state.activeBand || 'near',
    bandFocus: state.bandFocus || state.activeBand || 'near',
    filters: {
      region: state.filters?.region || 'all',
      schoolKeyword: state.filters?.schoolKeyword || '',
      majorKeyword,
      bottomLineMode,
      specialProjectMode: state.filters?.specialProjectMode || 'hide_eligibility_projects',
      keywordQuery: buildKeywordQuery(majorKeyword)
    },
    reportType: FEISHU_REPORT_CONTRACT.currentBandReportType,
    maxRecords: FEISHU_REPORT_CONTRACT.currentBandMaxRecords,
    selectedRecords,
    counts: {
      upper: Number(counts.upper || 0),
      near: Number(counts.near || 0),
      steady: Number(counts.steady || 0),
      total: Number(counts.total || 0)
    },
    matchSummary: state.bands?.data?.source?.matchSummary || state.bands?.data?.meta?.matchSummary || null,
    dataScope: `辽宁${FEISHU_REPORT_CONTRACT.dataYear}物理类`,
    sourceMode: 'current-visible-band',
    reportContext: createReportContext(state)
  };
}
