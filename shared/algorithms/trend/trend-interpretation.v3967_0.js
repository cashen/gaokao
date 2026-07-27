export const TREND_INTERPRETATION_VERSION = 'trend-interpretation-v3967_0';

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function resolveTrendInterpretation(row = {}, policy = {}) {
  const value = number(row.medianRelativePctPoint26vs25);
  const threshold = number(policy.neutralThresholdPctPoint ?? policy.threshold) ?? 1;
  const strongMultiplier = number(policy.strongMultiplier) ?? 2.2;
  if (value === null) return Object.freeze({ version:TREND_INTERPRETATION_VERSION, key:'stable', strength:'unknown', title:'暂时看不出明显变化', short:'变化不明显', explanation:'现有可比较记录不足以给出清楚方向。', value:null, threshold });
  if (value < -threshold) {
    const strong = Math.abs(value) >= threshold * strongMultiplier;
    return Object.freeze({ version:TREND_INTERPRETATION_VERSION, key:'harder', strength:strong?'strong':'normal', title:strong?'相比多数专业，明显更难报了':'相比多数专业，有所变难', short:strong?'明显更难报':'有所变难', explanation:'2026年达到这类专业通常需要更靠前的位次。', value, threshold });
  }
  if (value > threshold) {
    const strong = Math.abs(value) >= threshold * strongMultiplier;
    return Object.freeze({ version:TREND_INTERPRETATION_VERSION, key:'easier', strength:strong?'strong':'normal', title:strong?'相比多数专业，明显更容易报了':'相比多数专业，有所变容易', short:strong?'明显更容易报':'有所变容易', explanation:'2026年达到这类专业所需位次相对没有多数专业那么靠前。', value, threshold });
  }
  return Object.freeze({ version:TREND_INTERPRETATION_VERSION, key:'stable', strength:'normal', title:'和多数专业的变化接近', short:'变化不明显', explanation:'现有历史记录看不出明显变难或变容易。', value, threshold });
}
