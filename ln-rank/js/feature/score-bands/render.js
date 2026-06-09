import { RANGE_PRESETS } from '../../config/range-presets.js';

const BAND_KEYS = ['upper', 'near', 'steady'];
const BAND_COPY = {
  upper: {
    tone: 'upper',
    short: '少量看看',
    current: '当前查看：稍高目标',
    explain: '比孩子分数略高，只适合少量放在前段核验。'
  },
  near: {
    tone: 'near',
    short: '重点核验',
    current: '当前查看：主要参考',
    explain: '和孩子分数更接近，是专业初选时最该重点看的区间。'
  },
  steady: {
    tone: 'steady',
    short: '补安全感',
    current: '当前查看：稳妥补充',
    explain: '低于孩子分数一些，用来补后段承接和安全感。'
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

function formatScoreRange(min, max) {
  const a = Number(min);
  const b = Number(max);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
  return `${Math.min(a, b)}-${Math.max(a, b)} 分`;
}

function rangeText(candidateScore, band) {
  if (!band || typeof band !== 'object') return '输入分数后生成';

  // API 返回的结果分组使用 minScore/maxScore/rangeText；
  // 前端配置使用 minDelta/maxDelta。这里必须同时兼容，避免结果区显示 NaN-NaN 分。
  const byScore = formatScoreRange(band.minScore, band.maxScore);
  if (byScore) return byScore;

  if (band.rangeText) {
    const text = String(band.rangeText).trim();
    if (/^-?\d+(?:\.\d+)?\s*-\s*-?\d+(?:\.\d+)?$/.test(text)) return `${text} 分`;
    if (text && !/NaN/i.test(text)) return text.includes('分') ? text : `${text} 分`;
  }

  const score = Number(candidateScore);
  const minDelta = Number(band.minDelta);
  const maxDelta = Number(band.maxDelta);
  if (!Number.isFinite(score) || !Number.isFinite(minDelta) || !Number.isFinite(maxDelta)) {
    return '输入分数后生成';
  }

  return formatScoreRange(score + minDelta, score + maxDelta) || '输入分数后生成';
}

function getPreset(state) {
  return RANGE_PRESETS[state.rangePreset] || RANGE_PRESETS.standard;
}

function getBand(state, key) {
  return getPreset(state).bands[key] || RANGE_PRESETS.standard.bands[key];
}

export function renderBandLegend(state) {
  const container = document.getElementById('rankBandLegend') || document.getElementById('bandTabs');
  if (!container) return;
  const html = BAND_KEYS.map((key) => {
    const band = getBand(state, key);
    const copy = BAND_COPY[key] || {};
    const active = (state.bandFocus || state.activeBand || 'near') === key;
    return `<button type="button" class="rank-band-chip rank-band-${escapeHtml(copy.tone || key)}${active ? ' is-active' : ''}" data-rank-band="${escapeHtml(key)}" aria-pressed="${active ? 'true' : 'false'}">
      <b>${escapeHtml(band.title)}</b>
      <span>${escapeHtml(rangeText(state.candidateScore, band))}</span>
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
  const data = state.bands?.data;
  if (!data?.bands) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }
  container.hidden = false;
  const activeKey = BAND_KEYS.includes(state.activeBand) ? state.activeBand : 'near';
  const activeBand = data.bands[activeKey] || getBand(state, activeKey);
  const activeCopy = BAND_COPY[activeKey] || {};
  const buttons = BAND_KEYS.map((key) => {
    const group = data.bands[key] || getBand(state, key);
    const copy = BAND_COPY[key] || {};
    const active = activeKey === key;
    const count = Number.isFinite(Number(group?.records?.length)) ? group.records.length : (data.counts?.[key] ?? 0);
    return `<button type="button" class="result-band-option result-band-${escapeHtml(copy.tone || key)}${active ? ' is-active' : ''}" data-result-band="${escapeHtml(key)}" aria-pressed="${active ? 'true' : 'false'}">
      <span class="result-band-title">${escapeHtml(group.title || '')}</span>
      <span class="result-band-meta">${escapeHtml(rangeText(state.candidateScore, group))}｜${escapeHtml(count)} 条</span>
      <span class="result-band-state">${active ? '当前查看' : escapeHtml(copy.short || '切换查看')}</span>
    </button>`;
  }).join('');
  container.innerHTML = `
    <div class="result-band-current result-band-current-${escapeHtml(activeCopy.tone || activeKey)}">
      <div>
        <span class="result-band-current-kicker">当前查看</span>
        <strong>${escapeHtml(activeBand.title || '')}</strong>
        <p>${escapeHtml(activeCopy.explain || activeBand.desc || '')}</p>
      </div>
    </div>
    <div class="result-band-options" role="group" aria-label="切换结果区间">${buttons}</div>`;
  container.querySelectorAll('[data-result-band]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.resultBand;
      if (typeof onSelect === 'function') onSelect(key);
    });
  });
}

// Backward-compatible export: old callers render only the static explanation now.
export function renderBandTabs(state, onSelect) {
  renderBandLegend(state);
  renderResultBandSwitcher(state, onSelect);
}
