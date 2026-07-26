import { getExamResourceConfig } from '../../shared/resources/exam/liaoning-physics.js';
import {
  HISTORY_SCORE_RANK_CONTRACT_VERSION,
  HISTORY_SCORE_RANK_STATES,
  HISTORY_SCORE_RANK_YEARS,
  formatHistoricalEvidenceText
} from '../../shared/resources/exam/historical-score-rank-contract.js';
import { getRankTableMeta, lookupScoreRank } from './rank-table-provider.js';

function number(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[,，\s]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function historicalRecordStatus(record = {}, year) {
  if (year === 2026) return 'primary-record';
  const level = String(record.historyMatchLevel || '').trim();
  if (!level) return 'legacy-strict-unknown';
  return ['exact', 'exact_code'].includes(level) ? 'strict-match' : level;
}

function isStrictHistoricalRecord(record = {}, year) {
  if (year === 2026) return true;
  const level = String(record.historyMatchLevel || '').trim();
  return !level || ['exact', 'exact_code'].includes(level);
}

function buildYearEvidence(record = {}, year) {
  const score = number(record[`score${year}`] ?? (year === 2026 ? record.score : null));
  const suppliedRank = number(record[`rank${year}`] ?? (year === 2026 ? record.rank : null));
  const recordStatus = historicalRecordStatus(record, year);
  if (score === null && suppliedRank === null) {
    return Object.freeze({
      year,
      score: null,
      suppliedRank: null,
      rank: null,
      rankStart: null,
      rankEnd: null,
      rankForGap: null,
      sameCount: null,
      evidenceState: HISTORY_SCORE_RANK_STATES.NO_RECORD,
      validationStatus: HISTORY_SCORE_RANK_STATES.NO_RECORD,
      rankSource: 'none',
      sourceName: '',
      sourceMeta: null,
      recordStatus: 'no-record',
      comparable: false,
      missingReason: 'no-strict-record'
    });
  }

  const tableMeta = getRankTableMeta({ year, region: 'ln', subject: 'physics' });
  const row = score === null ? null : lookupScoreRank({ year, region: 'ln', subject: 'physics', score });
  if (!row || !tableMeta) {
    return Object.freeze({
      year,
      score,
      suppliedRank,
      rank: suppliedRank,
      rankStart: suppliedRank,
      rankEnd: suppliedRank,
      rankForGap: suppliedRank,
      sameCount: null,
      evidenceState: score !== null ? HISTORY_SCORE_RANK_STATES.RANK_TABLE_UNAVAILABLE : HISTORY_SCORE_RANK_STATES.CONFLICT,
      validationStatus: score !== null ? HISTORY_SCORE_RANK_STATES.RANK_TABLE_UNAVAILABLE : HISTORY_SCORE_RANK_STATES.CONFLICT,
      rankSource: suppliedRank !== null ? 'legacy-record' : 'unavailable',
      sourceName: '',
      sourceMeta: null,
      recordStatus,
      comparable: false,
      missingReason: score === null ? 'rank-without-score' : 'rank-table-unavailable'
    });
  }

  const rankStart = number(row.rankStart);
  const rankEnd = number(row.rankEnd ?? row.cumulative ?? row.rankForGap);
  const sameCount = number(row.sameCount);
  let evidenceState = HISTORY_SCORE_RANK_STATES.DERIVED;
  if (suppliedRank !== null) {
    if (rankEnd !== null && suppliedRank === rankEnd) evidenceState = HISTORY_SCORE_RANK_STATES.MATCHED;
    else if (rankStart !== null && rankEnd !== null && suppliedRank >= rankStart && suppliedRank <= rankEnd) evidenceState = HISTORY_SCORE_RANK_STATES.WITHIN_SCORE_RANGE;
    else evidenceState = HISTORY_SCORE_RANK_STATES.CONFLICT;
  }
  const strict = isStrictHistoricalRecord(record, year);
  const comparable = strict && evidenceState !== HISTORY_SCORE_RANK_STATES.CONFLICT;
  return Object.freeze({
    year,
    score,
    suppliedRank,
    rank: rankEnd,
    rankStart,
    rankEnd,
    rankForGap: number(row.rankForGap) ?? rankEnd,
    sameCount,
    emptyScore: Boolean(row.emptyScore),
    evidenceState,
    validationStatus: evidenceState,
    rankSource: 'official-score-rank-table',
    sourceName: tableMeta.tableName || tableMeta.sourceName || `${year}年辽宁物理类成绩统计表`,
    sourceMeta: Object.freeze({ ...tableMeta }),
    recordStatus,
    comparable,
    missingReason: '',
    conflict: evidenceState === HISTORY_SCORE_RANK_STATES.CONFLICT
      ? Object.freeze({ suppliedRank, officialRankStart: rankStart, officialRankEnd: rankEnd })
      : null
  });
}

export function buildHistoricalScoreRankEvidence(record = {}) {
  const years = {};
  for (const year of HISTORY_SCORE_RANK_YEARS) years[year] = buildYearEvidence(record, year);
  const comparableYears = HISTORY_SCORE_RANK_YEARS.filter(year => years[year].comparable);
  const configs = Object.fromEntries(HISTORY_SCORE_RANK_YEARS.map(year => [year, getExamResourceConfig({ year, region: 'ln', subject: 'physics' })]));
  const undergraduatePopulation = Object.fromEntries(HISTORY_SCORE_RANK_YEARS.map(year => {
    const score = configs[year]?.undergraduateControlScore;
    const row = lookupScoreRank({ year, region: 'ln', subject: 'physics', score });
    return [year, number(row?.rankEnd ?? row?.cumulative ?? row?.rankForGap)];
  }));
  return Object.freeze({
    version: HISTORY_SCORE_RANK_CONTRACT_VERSION,
    region: 'ln',
    subject: 'physics',
    primaryYear: 2026,
    years: Object.freeze(years),
    comparison: Object.freeze({
      policy: 'rank-first-score-secondary',
      populationPolicy: 'undergraduate-control-line-cumulative',
      undergraduatePopulation: Object.freeze(undergraduatePopulation),
      comparableYears: Object.freeze(comparableYears),
      canCompareThreeYears: comparableYears.length === HISTORY_SCORE_RANK_YEARS.length,
      scoreOnlyCannotCreateTrend: true,
      conflictCannotCreateTrend: true
    })
  });
}

export function formatHistoricalScoreRankForReport(record = {}, options = {}) {
  return formatHistoricalEvidenceText(record, options);
}

export function enrichHistoricalScoreRankEvidence(record = {}) {
  const historyEvidence = buildHistoricalScoreRankEvidence(record);
  return {
    ...record,
    historyEvidence,
    rank2026Source: historyEvidence.years[2026].rankSource,
    rank2025Source: historyEvidence.years[2025].rankSource,
    rank2024Source: historyEvidence.years[2024].rankSource
  };
}
