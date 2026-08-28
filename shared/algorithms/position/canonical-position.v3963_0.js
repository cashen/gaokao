export const CANONICAL_POSITION_VERSION = 'canonical-position-v3963_0';

// 分数区间只在缺少同年位次时兜底；2026 位次齐全时由 RANK_PRESETS 决定分组。
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
    steady: Object.freeze({ min: -35, max: -11 })
  })
});

const RANK_PRESETS = Object.freeze({
  standard: Object.freeze({
    upper: Object.freeze({ ratio: 0.20, minGap: 50, maxGap: 8000 }),
    near: Object.freeze({ ratio: 0.25, minGap: 100, maxGap: 12000 }),
    steady: Object.freeze({ ratio: 1.00, minGap: 500, maxGap: 30000 })
  }),
  wide: Object.freeze({
    upper: Object.freeze({ ratio: 0.40, minGap: 100, maxGap: 16000 }),
    near: Object.freeze({ ratio: 0.40, minGap: 200, maxGap: 20000 }),
    steady: Object.freeze({ ratio: 1.60, minGap: 1000, maxGap: 45000 })
  }),
  safe: Object.freeze({
    upper: Object.freeze({ ratio: 0.10, minGap: 50, maxGap: 4000 }),
    near: Object.freeze({ ratio: 0.25, minGap: 100, maxGap: 12000 }),
    steady: Object.freeze({ ratio: 1.40, minGap: 800, maxGap: 40000 })
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

function boundedGap(candidateRank, rule) {
  return Math.round(Math.max(rule.minGap, Math.min(rule.maxGap, candidateRank * rule.ratio)));
}

function formatRank(value) {
  const n = number(value);
  return n == null ? '—' : Math.max(1, Math.round(n)).toLocaleString('zh-CN');
}

export function normalizePositionPreset(value) {
  const key = String(value || '').trim();
  return Object.prototype.hasOwnProperty.call(SCORE_PRESETS, key) ? key : 'standard';
}

export function rankWindowsForCandidate(candidateRankLike, presetLike = 'standard', totalRankLike = null) {
  const candidateRank = number(candidateRankLike);
  if (candidateRank == null || candidateRank <= 0) return null;
  const preset = RANK_PRESETS[normalizePositionPreset(presetLike)];
  const totalRank = number(totalRankLike);
  const cap = value => totalRank && totalRank > 0 ? Math.min(totalRank, Math.max(1, value)) : Math.max(1, value);
  const upperGap = boundedGap(candidateRank, preset.upper);
  const nearGap = boundedGap(candidateRank, preset.near);
  const steadyGap = Math.max(nearGap + 1, boundedGap(candidateRank, preset.steady));
  return Object.freeze({
    candidateRank,
    upper: Object.freeze({
      maxGap: upperGap,
      minRank: cap(candidateRank - upperGap),
      maxRank: cap(candidateRank - 1)
    }),
    near: Object.freeze({
      maxGap: nearGap,
      minRank: cap(candidateRank),
      maxRank: cap(candidateRank + nearGap)
    }),
    steady: Object.freeze({
      maxGap: steadyGap,
      minRank: cap(candidateRank + nearGap + 1),
      maxRank: cap(candidateRank + steadyGap)
    })
  });
}

export function rankBandRangeText(candidateRank, bandKey, presetLike = 'standard', totalRank = null) {
  const windows = rankWindowsForCandidate(candidateRank, presetLike, totalRank);
  const range = windows?.[bandKey];
  if (!range) return '';
  return `约第 ${formatRank(range.minRank)}—${formatRank(range.maxRank)} 位`;
}

export function rankBandForGap(rankGapLike, candidateRankLike, presetLike = 'standard') {
  const rankGap = number(rankGapLike);
  const candidateRank = number(candidateRankLike);
  const windows = rankWindowsForCandidate(candidateRank, presetLike);
  if (rankGap == null || !windows) return 'unknown';
  if (rankGap > 0) return rankGap <= windows.upper.maxGap ? 'upper' : 'outside';
  const lowerDistance = Math.abs(rankGap);
  if (lowerDistance <= windows.near.maxGap) return 'near';
  if (lowerDistance <= windows.steady.maxGap) return 'steady';
  return 'outside';
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

function statusForPosition({ bandKey, rankGap, rankWindows, scoreDelta }) {
  if (bandKey === 'unknown') return { key: 'unknown', label: '待核验', position: '需补齐2026投档位次后再判断' };
  if (bandKey === 'outside') {
    const harder = rankGap != null ? rankGap > 0 : number(scoreDelta) > 0;
    return harder
      ? { key: 'superRush', label: '当前讨论范围外', position: '历史位次明显靠前' }
      : { key: 'tooLow', label: '当前讨论范围外', position: '历史位次明显靠后' };
  }
  if (bandKey === 'near') return { key: 'match', label: '历史位次接近', position: '主体讨论' };
  if (bandKey === 'steady') return { key: 'guard', label: '历史位次靠后', position: '低分侧补充' };
  const upperGap = rankWindows?.upper?.maxGap || Math.max(1, Math.abs(number(scoreDelta) || 1));
  const used = Math.abs(number(rankGap) ?? number(scoreDelta) ?? upperGap);
  if (used <= upperGap * 0.45) return { key: 'smallRush', label: '历史位次略靠前', position: '前部少量核验' };
  if (used <= upperGap * 0.75) return { key: 'midRush', label: '历史位次靠前', position: '前部搭配核验' };
  return { key: 'bigRush', label: '历史位次较靠前', position: '前部少量核验' };
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
  const preset = normalizePositionPreset(input.rangePreset);
  const rankWindows = rankWindowsForCandidate(candidateRank, preset, input.totalRank);
  const hasRankPair = candidateRank != null && recordRank != null && rankGap != null;
  const bandKey = hasRankPair ? rankBandForGap(rankGap, candidateRank, preset) : scoreBandForDelta(scoreDelta, preset);
  const band = BAND_META[bandKey] || BAND_META.unknown;
  const status = statusForPosition({ bandKey, rankGap, rankWindows, scoreDelta });
  const rankDistance = rankGapRatio == null ? null : Math.abs(rankGapRatio);
  const scoreDistance = scoreDelta == null ? null : Math.abs(scoreDelta);
  const positionDistance = rankDistance != null ? rankDistance : (scoreDistance == null ? Number.POSITIVE_INFINITY : scoreDistance / 100);
  const basis = hasRankPair ? 'rank-primary-2026-position' : (scoreDelta != null ? 'score-window-fallback' : 'unresolved');
  const reasonCodes = [
    hasRankPair ? 'RANK_PRIMARY_AVAILABLE' : 'RANK_PAIR_MISSING',
    `${hasRankPair ? 'RANK' : 'SCORE'}_BAND_${bandKey.toUpperCase()}`
  ];
  if (bandKey === 'outside') reasonCodes.push('OUTSIDE_ACTIVE_POSITION_WINDOW');

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
    rankWindow: rankWindows?.[bandKey] || null,
    rankRangeText: rankBandRangeText(candidateRank, bandKey, preset, input.totalRank),
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
