import { RANGE_PRESETS } from '../../config/range-presets.js?v=3961_0';
import {
  normalizeScoreBand,
  normalizeScoreBandsObject,
  SCORE_BAND_KEYS
} from '../../domain/score-band-contract.js?v=3961_0';

const BAND_KEYS = SCORE_BAND_KEYS;
const BAND_COPY = Object.freeze({
  upper: Object.freeze({
    short: '稍高目标',
    explain: '分数位置略高，只建议少量查看并重点核验。',
    tone: 'upper'
  }),
  near: Object.freeze({
    short: '主要参考',
    explain: '和孩子当前分数更接近，建议先从这里开始看。',
    tone: 'near'
  }),
  steady: Object.freeze({
    short: '低分侧',
    explain: '用于补充后段选择，不代表录取结果。',
    tone: 'steady'
  })
});

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
  container.innerHTML = `
    <div class="rank-band-explanation" aria-label="三个历史位置分组说明">
      ${BAND_KEYS.map(key => {
        const band = normalizeScoreBand(bands[key], {
          key,
          candidateScore: state?.candidateScore,
          rangePreset: state?.rangePreset
        });
        return `<span class="rank-band-explanation__item is-${escapeHtml(key)}"><b>${escapeHtml(band.title)}</b><small>${escapeHtml(BAND_COPY[key]?.explain || band.desc || '')}</small></span>`;
      }).join('')}
    </div>`;
  container.dataset.legendRole = 'explanation';
  container.setAttribute('aria-label', '三个历史位置分组说明');
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
  const activeKey = BAND_KEYS.includes(state.activeBand) ? state.activeBand : 'near';
  const activeBand = bands[activeKey] || bands.near;
  const activeCopy = BAND_COPY[activeKey] || BAND_COPY.near;
  container.hidden = false;
  container.className = 'result-band-switcher ln-result-band-nav score-band-workspace';
  container.innerHTML = `
    <div class="result-band-nav-head"><b>分段查看</b><span>只切换当前列表，不重新查询</span></div>
    <div class="score-band-segmented" role="tablist" aria-label="切换结果分段">
      ${BAND_KEYS.map((key, index) => {
        const band = bands[key] || normalizeScoreBand({}, {
          key,
          candidateScore: state?.candidateScore,
          rangePreset: state?.rangePreset
        });
        const active = activeKey === key;
        const label = key === 'steady' ? '低分侧' : band.title;
        return `<button type="button"
          class="score-band-segment is-${escapeHtml(key)}${active ? ' is-active' : ''}"
          role="tab"
          aria-selected="${active ? 'true' : 'false'}"
          aria-posinset="${index + 1}"
          aria-setsize="${BAND_KEYS.length}"
          tabindex="${active ? '0' : '-1'}"
          data-result-band="${escapeHtml(key)}">${escapeHtml(label)}</button>`;
      }).join('')}
    </div>
    <div class="score-band-current" role="tabpanel" aria-live="polite">
      <div class="score-band-current__facts">
        <b>${escapeHtml(activeBand.title || activeCopy.short)}</b>
        <span>${escapeHtml(safeRangeText(activeBand))} · ${escapeHtml(safeCount(activeBand))} 条</span>
      </div>
      <p>${escapeHtml(activeCopy.explain || activeBand.desc || '')}</p>
    </div>`;

  container.dataset.currentBand = activeKey;
  container.dataset.currentBandTitle = activeBand.title || '';
  container.dataset.currentBandRange = safeRangeText(activeBand);
  container.dataset.currentBandCount = String(safeCount(activeBand));

  const buttons = [...container.querySelectorAll('[data-result-band]')];
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => onSelect?.(button.dataset.resultBand));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % buttons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = buttons.length - 1;
      buttons[nextIndex]?.focus();
      onSelect?.(buttons[nextIndex]?.dataset.resultBand);
    });
  });
}

export function renderBandTabs(state, onSelect) {
  renderBandLegend(state);
  renderResultBandSwitcher(state, onSelect);
}
