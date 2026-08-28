import { normalizeRangePreset } from '../domain/range-policy.v3963_1.js?v=3963_1';
import { normalizeBandFocus } from '../domain/band-policy.js?v=3949_0';
export function syncRangeState(state) {
  state.rangePreset = normalizeRangePreset(state.rangePreset);
  state.bandFocus = normalizeBandFocus(state.bandFocus || state.activeBand);
  state.activeBand = state.bandFocus;
  return state;
}
export function setRangePreset(state, value, { resetBand = true } = {}) {
  state.rangePreset = normalizeRangePreset(value);
  if (resetBand) { state.bandFocus = 'near'; state.activeBand = 'near'; }
  return syncRangeState(state);
}
export function setBandFocus(state, value) {
  state.bandFocus = normalizeBandFocus(value);
  state.activeBand = state.bandFocus;
  return syncRangeState(state);
}
