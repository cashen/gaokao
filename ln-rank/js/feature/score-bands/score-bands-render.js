import { RANGE_PRESETS } from '../../config/range-presets.js';

function scoreLabel(score) {
  return Number.isFinite(Number(score)) ? `${score} 分` : '待输入';
}

function rangeText(candidateScore, band) {
  if (!Number.isFinite(Number(candidateScore))) return '输入分数后生成';
  const a = candidateScore + band.minDelta;
  const b = candidateScore + band.maxDelta;
  return `${Math.min(a,b)}-${Math.max(a,b)} 分`;
}

export function renderBandTabs(state, onSelect) {
  const container = document.getElementById('bandTabs');
  if (!container) return;
  const preset = RANGE_PRESETS[state.rangePreset] || RANGE_PRESETS.standard;
  const counts = state.bands.data?.counts || {};
  container.innerHTML = ['upper','near','steady'].map((key) => {
    const band = preset.bands[key];
    const active = state.activeBand === key ? ' is-active' : '';
    return `<button class="band-tab ${key}${active}" data-band="${key}">
      <div class="band-tab-title"><span>${band.title}</span><span class="band-tab-count">${counts[key] ?? '—'} 条</span></div>
      <div class="band-tab-range">${rangeText(state.candidateScore, band)}</div>
      <div class="band-tab-desc">${band.desc}</div>
    </button>`;
  }).join('');
  container.querySelectorAll('[data-band]').forEach(el => el.addEventListener('click', () => onSelect(el.dataset.band)));
}
