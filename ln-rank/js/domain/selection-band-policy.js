const PRESETS = {
  standard: {
    upper: { min: 1, max: 10 },
    near: { min: -10, max: 0 },
    steady: { min: -25, max: -11 }
  },
  wide: {
    upper: { min: 1, max: 20 },
    near: { min: -15, max: 0 },
    steady: { min: -40, max: -16 }
  },
  safe: {
    upper: { min: 1, max: 5 },
    near: { min: -10, max: 0 },
    steady: { min: -20, max: -11 }
  }
};

export const SELECTION_BAND_LABELS = {
  upper: '稍高目标',
  near: '主要参考',
  steady: '低分侧补充',
  outside: '当前范围外',
  unknown: '待核验'
};

export function normalizeSelectionPreset(value) {
  const key = String(value || '').trim();
  return Object.prototype.hasOwnProperty.call(PRESETS, key) ? key : 'standard';
}

export function classifySelectionDelta(delta, presetLike = 'standard') {
  const n = Number(delta);
  if (!Number.isFinite(n)) {
    return {
      key: 'unknown',
      group: 'unknown',
      detail: SELECTION_BAND_LABELS.unknown,
      className: 'unknown',
      position: '需补齐 2026 投档分后再判断'
    };
  }

  const preset = PRESETS[normalizeSelectionPreset(presetLike)];
  for (const key of ['upper', 'near', 'steady']) {
    const range = preset[key];
    if (n >= range.min && n <= range.max) {
      return {
        key,
        group: key === 'upper' ? 'rush' : key === 'near' ? 'stable' : 'safe',
        detail: SELECTION_BAND_LABELS[key],
        className: key === 'upper' ? 'light-rush' : key === 'near' ? 'stable' : 'light-safe',
        position: `${SELECTION_BAND_LABELS[key]}区`,
        minDelta: range.min,
        maxDelta: range.max
      };
    }
  }

  return {
    key: 'outside',
    group: 'outside',
    detail: SELECTION_BAND_LABELS.outside,
    className: 'unknown',
    position: '不在当前查看范围内'
  };
}

export function selectionBandOrder(item = {}) {
  const key = item.poolBand?.key || item.bandKey || '';
  return ({ upper: 10, near: 20, steady: 30, outside: 40, unknown: 50 })[key] || 99;
}
