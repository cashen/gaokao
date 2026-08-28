import {
  buildRankingTrace,
  compareRankedRecords,
  rankRecords,
  diversifyRankedRecords
} from './staged-ranking.v3960_0.js';

export const RESULT_RANKING_VERSION = 'result-ranking-v3967_0';

function number(value, fallback = Number.POSITIVE_INFINITY) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function withExecutionTrace(record, intent, sortMode) {
  return {
    ...record,
    resultRankingTrace: Object.freeze({
      version: RESULT_RANKING_VERSION,
      intent,
      sortMode,
      stagedTraceVersion: record.rankingTrace?.version || '',
      reasons: Object.freeze([
        `INTENT_${intent.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`,
        `SORT_${sortMode.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`
      ])
    })
  };
}

export function compareResultRecords(a = {}, b = {}, options = {}) {
  const intent = options.intent === 'school-search' ? 'school-search' : 'score-search';
  const sortMode = String(options.sortMode || (intent === 'school-search' ? 'position-near' : 'canonical-staged'));
  if (sortMode === 'score-asc' || sortMode === 'score-desc') {
    const direction = sortMode === 'score-asc' ? 1 : -1;
    const scoreDiff = direction * (number(a.score2026 ?? a.score, -1) - number(b.score2026 ?? b.score, -1));
    if (scoreDiff) return scoreDiff;
    const rankDiff = -direction * (number(a.rank2026 ?? a.rank) - number(b.rank2026 ?? b.rank));
    if (rankDiff) return rankDiff;
  }
  return compareRankedRecords(a, b, options);
}

export function rankResultRecords(records = [], options = {}) {
  const intent = options.intent === 'school-search' ? 'school-search' : 'score-search';
  const sortMode = String(options.sortMode || (intent === 'school-search' ? 'position-near' : 'canonical-staged'));
  const ranked = rankRecords(records, options)
    .sort((a, b) => compareResultRecords(a, b, { ...options, intent, sortMode }));
  const ordered = intent === 'score-search'
    ? diversifyRankedRecords(ranked, {
        enabled: options.diversify !== false,
        windowSize: options.windowSize || 8,
        maxPerSchool: options.maxPerSchool || 2
      })
    : ranked;
  return ordered.map(record => withExecutionTrace(record, intent, sortMode));
}

export { buildRankingTrace };
