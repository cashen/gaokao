import { ALGORITHM_ORCHESTRATION_VERSION } from '../algorithm-registry.js';

export const DECISION_SNAPSHOT_VERSION = 'decision-snapshot-v3960_0';

function clean(value, max = 240) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function makeDecisionSnapshot(input = {}) {
  const records = (Array.isArray(input.records) ? input.records : []).map((record, index) => ({
    order: index + 1,
    id: clean(record.id, 280),
    school: clean(record.school, 120),
    major: clean(record.major, 180),
    score2026: num(record.score2026 ?? record.score),
    rank2026: num(record.rank2026 ?? record.rank),
    scoreDelta2026: num(record.scoreDelta2026 ?? record.scoreDelta),
    rankGap2026: num(record.rankGap2026 ?? record.rankGap),
    bandKey: clean(record.canonicalPosition?.bandKey || record.bandKey || record.band, 30),
    statusKey: clean(record.canonicalPosition?.statusKey || record.statusKey, 40),
    matchLevel: clean(record.matchLevel, 40),
    rankingReasons: Array.isArray(record.rankingTrace?.reasons) ? record.rankingTrace.reasons.slice(0, 8) : [],
    unresolved: Boolean(record.bottomLineEligibility === 'unresolved' || record.eligibilityStatus === 'unresolved')
  }));
  return Object.freeze({
    version: DECISION_SNAPSHOT_VERSION,
    algorithmVersion: ALGORITHM_ORCHESTRATION_VERSION,
    dataYear: 2026,
    audienceYear: 2027,
    candidateScore: num(input.candidateScore),
    candidateReferenceRank2026: num(input.candidateReferenceRank2026),
    rangePreset: clean(input.rangePreset || 'standard', 30),
    filters: Object.freeze({ ...(input.filters || {}) }),
    records: Object.freeze(records),
    signature: records.map(item => `${item.order}:${item.id}:${item.bandKey}:${item.rankGap2026 ?? ''}`).join('|')
  });
}

export function isCompatibleDecisionSnapshot(snapshot = {}) {
  return snapshot.version === DECISION_SNAPSHOT_VERSION
    && snapshot.algorithmVersion === ALGORITHM_ORCHESTRATION_VERSION
    && Number(snapshot.dataYear) === 2026
    && Array.isArray(snapshot.records);
}
