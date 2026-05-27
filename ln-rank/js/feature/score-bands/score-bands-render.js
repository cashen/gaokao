import { RANGE_PRESETS } from '../../config/range-presets.js';
function rangeText(candidateScore, band) {
  const a = candidateScore + band.minDelta;
  const b = candidateScore + band.maxDelta;
  return `${Math.min(a,b)}-${Math.max(a,b)}`;
}
export function renderBandTabs(state, onSelect) {
  const container = document.getElementById('bandTabs');
  const preset = RANGE_PRESETS[state.rangePreset] || RANGE_PRESETS.standard;
  const counts = state.bands.data?.counts || {};
  container.innerHTML = ['upper','near','steady'].map((key) => {
    const band = preset.bands[key];
    const active = state.activeBand === key ? ' is-active' : '';
    return `<button class="band-tab ${key}${active}" data-band="${key}">
      <div class="band-tab-title"><span>${band.title}</span><span class="band-tab-count">${counts[key] ?? '—'} 条</span></div>
      <div class="band-tab-range">${rangeText(state.candidateScore, band)} 分</div>
      <div class="band-tab-desc">${band.desc}</div>
    </button>`;
  }).join('');
  container.querySelectorAll('[data-band]').forEach(el => el.addEventListener('click', () => onSelect(el.dataset.band)));
}
