import { RANGE_PRESETS } from '../../config/range-presets.js?v=3949_0';
import { normalizeScoreBand, normalizeScoreBandsObject, SCORE_BAND_KEYS } from '../../domain/score-band-contract.js?v=3949_0';

const BAND_KEYS = SCORE_BAND_KEYS;
const BAND_COPY = {
  upper: {
    tone: 'upper',
    short: '少量看',
    current: '当前查看：稍高目标',
    explain: '比孩子分数略高，只适合少量看看。'
  },
  near: {
    tone: 'near',
    short: '重点看',
    current: '当前查看：主要参考',
    explain: '和孩子分数更接近，是专业初选时最该重点看的区间。'
  },
  steady: {
    tone: 'steady',
    short: '补后段承接',
    current: '当前查看：低分侧补充',
    explain: '低于孩子分数一些，用来补后段承接。'
  }
};

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPresetBands(state) {
  const preset = RANGE_PRESETS[state?.rangePreset] || RANGE_PRESETS.standard;
  return normalizeScoreBandsObject(preset.bands, {
    candidateScore: state?.candidateScore,
    rangePreset: preset.key || state?.rangePreset || 'standard'
  });
}

function getDisplayBands(state) {
  if (state?.bands?.data?.bands) {
    return normalizeScoreBandsObject(state.bands.data.bands, {
      candidateScore: state.candidateScore,
      rangePreset: state.rangePreset
    });
  }
  return getPresetBands(state || {});
}

function safeRangeText(band) {
  return band?.rangeText && !/NaN|undefined|null|\[object Object\]/.test(String(band.rangeText))
    ? String(band.rangeText)
    : '输入分数后生成';
}

function safeCount(band) {
  const n = Number(band?.count ?? band?.records?.length ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function renderBandLegend(state) {
  const container = document.getElementById('rankBandLegend') || document.getElementById('bandTabs');
  if (!container) return;
  const bands = getPresetBands(state || {});
  const activeKey = BAND_KEYS.includes(state?.activeBand) ? state.activeBand : (BAND_KEYS.includes(state?.bandFocus) ? state.bandFocus : 'near');
  const html = BAND_KEYS.map((key) => {
    const band = normalizeScoreBand(bands[key], { key, candidateScore: state?.candidateScore, rangePreset: state?.rangePreset });
    const copy = BAND_COPY[key] || {};
    const active = activeKey === key;
    return `<button type="button" class="rank-band-chip rank-band-${escapeHtml(copy.tone || key)}${active ? ' is-active' : ''}" data-rank-band="${escapeHtml(key)}" aria-pressed="${active ? 'true' : 'false'}">
      <b>${escapeHtml(band.title)}</b>
      <span>${escapeHtml(safeRangeText(band))}</span>
      <em>${active ? '当前聚焦' : escapeHtml(copy.short || band.desc || '')}</em>
    </button>`;
  }).join('');
  container.innerHTML = `<div class="rank-band-legend-line">${html}</div>`;
  container.setAttribute('data-legend-role', 'band-focus');
  container.setAttribute('aria-label', '分数区间参考，可点击切换当前聚焦区间');
  container.querySelectorAll('[data-rank-band]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.rankBand;
      window.dispatchEvent(new CustomEvent('lnrank:band-focus-request', { detail: { band: key } }));
    });
  });
}

export function renderResultBandSwitcher(state, onSelect) {
  const container = document.getElementById('resultBandSwitcher');
  if (!container) return;
  const data = state?.bands?.data;
  if (!data?.bands) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }
  const bands = getDisplayBands(state || {});
  container.hidden = false;
  container.classList.add('ln-result-band-nav');
  const activeKey = BAND_KEYS.includes(state.activeBand) ? state.activeBand : 'near';
  const activeBand = bands[activeKey] || bands.near;
  const activeCopy = BAND_COPY[activeKey] || {};
  const buttons = BAND_KEYS.map((key) => {
    const band = bands[key] || normalizeScoreBand({}, { key, candidateScore: state?.candidateScore, rangePreset: state?.rangePreset });
    const copy = BAND_COPY[key] || {};
    const active = activeKey === key;
    return `<button type="button" class="result-band-option result-band-${escapeHtml(copy.tone || key)} is-band-${escapeHtml(key)}${active ? ' is-active' : ''}" data-result-band="${escapeHtml(key)}" aria-pressed="${active ? 'true' : 'false'}">
      <span class="result-band-title">${escapeHtml(band.title || '')}</span>
      <span class="result-band-meta">${escapeHtml(safeRangeText(band))}｜${escapeHtml(safeCount(band))} 条</span>
      <span class="result-band-state">${active ? '当前查看' : escapeHtml(copy.short || '切换查看')}</span>
    </button>`;
  }).join('');
  container.innerHTML = `
    <div class="result-band-nav-head">分段查看</div>
    <div class="result-band-options" role="group" aria-label="切换结果区间">${buttons}</div>`;
  container.dataset.currentBandTitle = activeBand.title || '';
  container.dataset.currentBandRange = safeRangeText(activeBand);
  container.dataset.currentBandCount = String(safeCount(activeBand));
  container.dataset.currentBandExplain = activeCopy.explain || activeBand.desc || '';
  container.querySelectorAll('[data-result-band]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.resultBand;
      if (typeof onSelect === 'function') onSelect(key);
    });
  });
}

export function renderBandTabs(state, onSelect) {
  renderBandLegend(state);
  renderResultBandSwitcher(state, onSelect);
}
