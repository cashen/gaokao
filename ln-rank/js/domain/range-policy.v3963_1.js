import { RANGE_PRESETS } from '../config/range-presets.v3963_1.js?v=3963_1';

export const RANGE_PRESET_KEYS = ['standard', 'wide', 'safe'];
export function normalizeRangePreset(value) {
  const key = String(value || '').trim();
  if (key === 'normal') return 'standard';
  return RANGE_PRESET_KEYS.includes(key) ? key : 'standard';
}
export function getRangePresetConfig(value) {
  const key = normalizeRangePreset(value);
  return RANGE_PRESETS[key] || RANGE_PRESETS.standard;
}
export function getRangePresetLabel(value) {
  return getRangePresetConfig(value).label || '正常查看';
}
