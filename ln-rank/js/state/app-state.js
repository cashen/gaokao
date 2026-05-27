import { DEFAULT_PRESET, SLIDER_PRESETS } from "../config/slider-presets.js";
import { getViewScore } from "../core/score-utils.js";

const initialPreset = SLIDER_PRESETS[DEFAULT_PRESET];
export const state = {
  candidateScore: 520,
  rangePreset: DEFAULT_PRESET,
  minDelta: initialPreset.min,
  maxDelta: initialPreset.max,
  viewDelta: 0,
  viewScore: 520,
  customMinAbs: 50,
  customMaxAbs: 100,
  filters: { region: "all", schoolKeyword: "", majorKeyword: "" },
  majorPool: { loading: false, error: null, groups: null, meta: null, counts: null }
};

const listeners = new Set();
export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function notify() { listeners.forEach((listener) => listener(state)); }
export function setState(partial) {
  Object.assign(state, partial);
  state.viewScore = getViewScore(state.candidateScore, state.viewDelta);
  notify();
}
export function setFilters(partial) {
  state.filters = { ...state.filters, ...partial };
  notify();
}
export function setMajorPool(partial) {
  state.majorPool = { ...state.majorPool, ...partial };
  notify();
}
