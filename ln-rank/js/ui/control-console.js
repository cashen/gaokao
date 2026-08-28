import { normalizeRangePreset } from '../domain/range-policy.js?v=3949_0';
import { normalizeBandFocus } from '../domain/band-policy.js?v=3949_0';
export function syncControlConsoleState(state) {
  const range = normalizeRangePreset(state?.rangePreset);
  const band = normalizeBandFocus(state?.bandFocus || state?.activeBand);
  document.querySelectorAll('[data-preset]').forEach(el => {
    const active = normalizeRangePreset(el.dataset.preset) === range;
    el.classList.toggle('is-active', active);
    el.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  document.querySelector('.ln-console')?.setAttribute('data-range-preset', range);
  document.querySelector('.ln-console')?.setAttribute('data-band-focus', band);
}
