import {
  resolveCanonicalPosition,
  canonicalBandOrder,
  canonicalBandLabel,
  normalizePositionPreset
} from '../../../shared/algorithms/position/canonical-position.v3963_0.js?v=3963_0';

export const SELECTION_BAND_LABELS = {
  upper: '稍高目标',
  near: '主要参考',
  steady: '低分侧补充',
  outside: '当前范围外',
  unknown: '待核验'
};

export function normalizeSelectionPreset(value) {
  return normalizePositionPreset(value);
}

function classNameFor(key) {
  return key === 'upper' ? 'light-rush' : key === 'near' ? 'stable' : key === 'steady' ? 'light-safe' : 'unknown';
}

export function classifySelectionPosition(input = {}) {
  const canonicalPosition = resolveCanonicalPosition({
    candidateScore: input.candidateScore,
    candidateRank: input.candidateRank,
    recordScore: input.recordScore,
    recordRank: input.recordRank,
    scoreDelta: input.scoreDelta,
    rankGap: input.rankGap,
    rangePreset: input.rangePreset || input.preset || 'standard'
  });
  const key = canonicalPosition.bandKey;
  return {
    key,
    group: canonicalPosition.group,
    detail: canonicalPosition.bandLabel,
    className: classNameFor(key),
    position: key === 'unknown'
      ? '需补齐 2026 投档位置后再判断'
      : key === 'outside'
        ? '不在当前查看范围内'
        : `${canonicalPosition.bandLabel}区`,
    scoreDelta: canonicalPosition.scoreDelta,
    rankGap: canonicalPosition.rankGap,
    canonicalPosition
  };
}

export function classifySelectionDelta(delta, presetLike = 'standard') {
  return classifySelectionPosition({ scoreDelta: delta, rangePreset: presetLike });
}

export function selectionBandOrder(item = {}) {
  const key = item.poolBand?.key || item.canonicalPosition?.bandKey || item.bandKey || '';
  return canonicalBandOrder(key) || 99;
}

export function selectionBandLabel(item = {}) {
  const key = typeof item === 'string' ? item : item.poolBand?.key || item.canonicalPosition?.bandKey || item.bandKey || '';
  return canonicalBandLabel(key);
}
