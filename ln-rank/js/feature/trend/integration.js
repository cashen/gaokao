import { buildTrendSummaryForSelection, trendHintText } from './rules.js?v=3951_0';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderSearchTrendHint(root, options = {}) {
  if (!root) return;
  const score = options.score;
  const keyword = String(options.keyword || '').trim();
  const text = keyword ? trendHintText(score, keyword) : '';
  if (!text) {
    root.innerHTML = '';
    root.className = 'major-trend-hint is-empty';
    return;
  }
  root.className = 'major-trend-hint is-active ln-heat-summary-row';
  root.innerHTML = '<div class="major-trend-main"><b>近三年位置观察</b><p>' + escapeHtml(text) + '</p></div><a class="major-trend-link" href="./major-trend-2026.html">查看三年观察</a>';
}

export function renderSelectionTrendBox(summary = {}) {
  if (!summary.visible || !Array.isArray(summary.notes) || !summary.notes.length) return '';
  const items = summary.notes.map(item => '<li>' + escapeHtml(item) + '</li>').join('');
  return '<div class="major-trend-selection-box"><div class="major-trend-selection-title">近三年位置观察入口</div><ul>' + items + '</ul><p>趋势先扣除年度共同位移，只用于理解历史结构；不代表报名人数、专业质量或 2027 年录取结果。</p><a href="/ln-rank/major-trend-2026.html">查看完整三年观察</a></div>';
}

export { buildTrendSummaryForSelection };
