export const BAND_FOCUS_KEYS = ['upper', 'near', 'steady'];
export const BAND_FOCUS_LABELS = { upper: '稍高目标', near: '主要参考', steady: '低分侧补充' };
export function normalizeBandFocus(value) {
  const key = String(value || '').trim();
  if (key === 'up') return 'upper';
  if (key === 'main') return 'near';
  if (key === 'safe') return 'steady';
  return BAND_FOCUS_KEYS.includes(key) ? key : 'near';
}
export function getBandFocusLabel(value) { return BAND_FOCUS_LABELS[normalizeBandFocus(value)] || '主要参考'; }
