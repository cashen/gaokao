export const HISTORY_SCORE_RANK_CONTRACT_VERSION = 'ln-physics-history-evidence-v3967_0';
export const HISTORY_SCORE_RANK_YEARS = Object.freeze([2026, 2025, 2024]);
export const HISTORY_SCORE_RANK_STATES = Object.freeze({
  MATCHED: 'matched',
  WITHIN_SCORE_RANGE: 'within-score-range',
  DERIVED: 'derived',
  CONFLICT: 'conflict',
  SCORE_ONLY: 'score-only',
  NO_RECORD: 'no-record',
  RANK_TABLE_UNAVAILABLE: 'rank-table-unavailable',
  LEGACY_UNVERIFIED: 'legacy-unverified'
});

function number(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[,，\s]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export function formatHistoryNumber(value) {
  const parsed = number(value);
  return parsed === null ? '—' : parsed.toLocaleString('zh-CN');
}

export function createLegacyHistoryEvidence(record = {}) {
  const years = {};
  for (const year of HISTORY_SCORE_RANK_YEARS) {
    const score = number(record[`score${year}`] ?? (year === 2026 ? record.score : null));
    const rank = number(record[`rank${year}`] ?? (year === 2026 ? record.rank : null));
    const rankStart = number(record[`rankStart${year}`]) ?? rank;
    const rankEnd = number(record[`rankEnd${year}`]) ?? rank;
    const hasRecord = score !== null || rank !== null;
    years[year] = Object.freeze({
      year,
      score,
      suppliedRank: rank,
      rank: rankEnd,
      rankStart,
      rankEnd,
      rankForGap: rankEnd,
      sameCount: number(record[`sameCount${year}`]),
      evidenceState: hasRecord ? HISTORY_SCORE_RANK_STATES.LEGACY_UNVERIFIED : HISTORY_SCORE_RANK_STATES.NO_RECORD,
      validationStatus: hasRecord ? HISTORY_SCORE_RANK_STATES.LEGACY_UNVERIFIED : HISTORY_SCORE_RANK_STATES.NO_RECORD,
      rankSource: hasRecord ? 'legacy-record' : 'none',
      sourceName: '',
      comparable: false,
      recordStatus: hasRecord ? 'legacy-record' : 'no-record'
    });
  }
  return Object.freeze({
    version: HISTORY_SCORE_RANK_CONTRACT_VERSION,
    region: 'ln',
    subject: 'physics',
    primaryYear: 2026,
    years: Object.freeze(years),
    comparison: Object.freeze({
      policy: 'rank-first-score-secondary',
      populationPolicy: 'undergraduate-control-line-cumulative',
      comparableYears: Object.freeze([]),
      canCompareThreeYears: false,
      legacyFallback: true
    })
  });
}

export function getHistoryScoreRankEvidence(record = {}) {
  const evidence = record?.historyEvidence;
  if (evidence?.years && typeof evidence.years === 'object') return evidence;
  return createLegacyHistoryEvidence(record);
}

export function historyYearEvidence(record = {}, year) {
  const evidence = getHistoryScoreRankEvidence(record);
  return evidence.years?.[year] || evidence.years?.[String(year)] || null;
}

export function historyRankRangeText(yearEvidence = {}, { includeApprox = true } = {}) {
  const state = String(yearEvidence.evidenceState || yearEvidence.validationStatus || '');
  if (state === HISTORY_SCORE_RANK_STATES.CONFLICT) return '历史位次正在复核';
  if (state === HISTORY_SCORE_RANK_STATES.RANK_TABLE_UNAVAILABLE || state === HISTORY_SCORE_RANK_STATES.SCORE_ONLY) return '该年仅有分数记录';
  if (state === HISTORY_SCORE_RANK_STATES.NO_RECORD) return '暂无严格同口径记录';
  const start = number(yearEvidence.rankStart);
  const end = number(yearEvidence.rankEnd ?? yearEvidence.rank ?? yearEvidence.rankForGap);
  if (end === null) return '该年仅有分数记录';
  const prefix = includeApprox ? '约第' : '第';
  if (start !== null && start !== end) return `${prefix}${formatHistoryNumber(start)}—${formatHistoryNumber(end)}位`;
  return `${prefix}${formatHistoryNumber(end)}位`;
}

export function formatHistoryYearText(yearEvidence = {}, options = {}) {
  const year = number(yearEvidence.year) || options.year || '';
  const score = number(yearEvidence.score);
  const state = String(yearEvidence.evidenceState || yearEvidence.validationStatus || '');
  const scoreText = score === null ? '分数记录缺失' : `${formatHistoryNumber(score)}分`;
  let rankText = historyRankRangeText(yearEvidence);
  if (state === HISTORY_SCORE_RANK_STATES.DERIVED) rankText += '（按当年官方一分一段补齐）';
  if (state === HISTORY_SCORE_RANK_STATES.LEGACY_UNVERIFIED) rankText += '（旧记录，待刷新来源）';
  return `${year ? `${year}：` : ''}${scoreText}｜${rankText}`;
}

export function formatHistoricalEvidenceText(record = {}, options = {}) {
  const years = Array.isArray(options.years) ? options.years : [2025, 2024];
  const evidence = getHistoryScoreRankEvidence(record);
  const rows = years.map(year => evidence.years?.[year] || evidence.years?.[String(year)]).filter(Boolean);
  const visible = rows.filter(row => row.evidenceState !== HISTORY_SCORE_RANK_STATES.NO_RECORD || options.includeMissing);
  const text = visible.map(row => formatHistoryYearText(row)).join('；');
  if (text) return options.prefix === false ? text : `历史对照（不参与2026当前分组）：${text}`;
  return options.empty || '历史对照（不参与2026当前分组）：暂无严格同口径记录';
}

export function formatHistoricalEvidenceSummary(record = {}) {
  const evidence = getHistoryScoreRankEvidence(record);
  const labels = [];
  for (const year of [2025, 2024]) {
    const row = evidence.years?.[year] || evidence.years?.[String(year)];
    if (!row || row.evidenceState === HISTORY_SCORE_RANK_STATES.NO_RECORD) {
      labels.push(`${year}无同口径记录`);
    } else if (row.comparable) {
      labels.push(`${year}可比较`);
    } else if (row.evidenceState === HISTORY_SCORE_RANK_STATES.CONFLICT) {
      labels.push(`${year}位次复核中`);
    } else {
      labels.push(`${year}仅作分数线索`);
    }
  }
  return labels.join('｜');
}

export function canUseHistoryForComparison(yearEvidence = {}) {
  return Boolean(yearEvidence?.comparable)
    && ![HISTORY_SCORE_RANK_STATES.CONFLICT, HISTORY_SCORE_RANK_STATES.NO_RECORD, HISTORY_SCORE_RANK_STATES.SCORE_ONLY, HISTORY_SCORE_RANK_STATES.RANK_TABLE_UNAVAILABLE].includes(yearEvidence.evidenceState);
}
