export const CANONICAL_POSITION_VERSION = 'canonical-position-v3960_0';

const SCORE_PRESETS = Object.freeze({
  standard: Object.freeze({
    upper: Object.freeze({ min: 1, max: 10 }),
    near: Object.freeze({ min: -10, max: 0 }),
    steady: Object.freeze({ min: -25, max: -11 })
  }),
  wide: Object.freeze({
    upper: Object.freeze({ min: 1, max: 20 }),
    near: Object.freeze({ min: -15, max: 0 }),
    steady: Object.freeze({ min: -40, max: -16 })
  }),
  safe: Object.freeze({
    upper: Object.freeze({ min: 1, max: 5 }),
    near: Object.freeze({ min: -10, max: 0 }),
    steady: Object.freeze({ min: -20, max: -11 })
  })
});

const BAND_META = Object.freeze({
  upper: Object.freeze({ label: '稍高目标', group: 'rush', order: 10 }),
  near: Object.freeze({ label: '主要参考', group: 'stable', order: 20 }),
  steady: Object.freeze({ label: '低分侧补充', group: 'safe', order: 30 }),
  outside: Object.freeze({ label: '当前范围外', group: 'outside', order: 40 }),
  unknown: Object.freeze({ label: '待核验', group: 'unknown', order: 50 })
});

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizePositionPreset(value) {
  const key = String(value || '').trim();
  return Object.prototype.hasOwnProperty.call(SCORE_PRESETS, key) ? key : 'standard';
}

export function scoreBandForDelta(delta, presetLike = 'standard') {
  const n = number(delta);
  if (n == null) return 'unknown';
  const preset = SCORE_PRESETS[normalizePositionPreset(presetLike)];
  for (const key of ['upper', 'near', 'steady']) {
    const range = preset[key];
    if (n >= range.min && n <= range.max) return key;
  }
  return 'outside';
}

function statusForDelta(delta) {
  const n = number(delta);
  if (n == null) return { key: 'unknown', label: '待核验', position: '需补齐2026投档位置后再判断' };
  if (n <= -41) return { key: 'tooLow', label: '超低参考', position: '少量低分侧补充或特殊偏好' };
  if (n <= -26) return { key: 'low', label: '偏低参考', position: '少量低分侧补充' };
  if (n <= -16) return { key: 'guard', label: '低分侧补充参考', position: '低分侧补充' };
  if (n <= -6) return { key: 'steady', label: '主要参考补充', position: '主体偏稳' };
  if (n <= 3) return { key: 'match', label: '主要参考', position: '主体讨论' };
  if (n <= 8) return { key: 'smallRush', label: '稍高目标参考', position: '前部可放' };
  if (n <= 15) return { key: 'midRush', label: '稍高目标参考', position: '前部搭配' };
  if (n <= 30) return { key: 'bigRush', label: '稍高目标参考', position: '前部少量' };
  return { key: 'superRush', label: '稍高目标参考', position: '最前面少量' };
}

function evidenceStrength(candidateRank, recordRank, scoreDelta) {
  if (candidateRank != null && recordRank != null) return 'strong';
  if (scoreDelta != null) return 'medium';
  return 'weak';
}

export function resolveCanonicalPosition(input = {}) {
  const candidateScore = number(input.candidateScore);
  const recordScore = number(input.recordScore ?? input.score2026 ?? input.score);
  const candidateRank = number(input.candidateRank ?? input.candidateReferenceRank2026);
  const recordRank = number(input.recordRank ?? input.rank2026 ?? input.rank);
  const scoreDelta = number(input.scoreDelta ?? (candidateScore != null && recordScore != null ? recordScore - candidateScore : null));
  const rankGap = number(input.rankGap ?? (candidateRank != null && recordRank != null ? candidateRank - recordRank : null));
  const rankGapRatio = rankGap != null && candidateRank != null && candidateRank > 0 ? rankGap / candidateRank : null;
  const bandKey = scoreBandForDelta(scoreDelta, input.rangePreset);
  const band = BAND_META[bandKey] || BAND_META.unknown;
  const status = statusForDelta(scoreDelta);
  const rankDistance = rankGapRatio == null ? null : Math.abs(rankGapRatio);
  const scoreDistance = scoreDelta == null ? null : Math.abs(scoreDelta);
  const positionDistance = rankDistance != null ? rankDistance : (scoreDistance == null ? Number.POSITIVE_INFINITY : scoreDistance / 100);
  const basis = rankGap != null ? 'rank-aware-score-window' : (scoreDelta != null ? 'score-window-fallback' : 'unresolved');
  const reasonCodes = [];
  if (rankGap != null) reasonCodes.push('RANK_GAP_AVAILABLE');
  else reasonCodes.push('RANK_GAP_MISSING');
  if (scoreDelta != null) reasonCodes.push(`SCORE_BAND_${bandKey.toUpperCase()}`);
  if (bandKey === 'outside') reasonCodes.push('OUTSIDE_ACTIVE_SCORE_WINDOW');

  return Object.freeze({
    version: CANONICAL_POSITION_VERSION,
    bandKey,
    bandLabel: band.label,
    group: band.group,
    bandOrder: band.order,
    statusKey: status.key,
    statusLabel: status.label,
    position: status.position,
    candidateScore,
    recordScore,
    scoreDelta,
    candidateRank,
    recordRank,
    rankGap,
    rankGapRatio,
    positionDistance,
    classificationBasis: basis,
    evidenceStrength: evidenceStrength(candidateRank, recordRank, scoreDelta),
    reasonCodes: Object.freeze(reasonCodes)
  });
}

export function canonicalBandOrder(value) {
  const key = typeof value === 'string' ? value : value?.bandKey;
  return (BAND_META[key] || BAND_META.unknown).order;
}

export function canonicalBandLabel(value) {
  const key = typeof value === 'string' ? value : value?.bandKey;
  return (BAND_META[key] || BAND_META.unknown).label;
}
