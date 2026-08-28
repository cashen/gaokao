import { buildTrendSummaryForSelection, trendHintText } from './rules.v3967_0.js?v=3967_0';

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
  root.innerHTML = '<div class="major-trend-main"><b>过去三年报考难度变化</b><p>' + escapeHtml(text) + '</p></div><a class="major-trend-link" href="/ln2026.html">查看报考难度变化</a>';
}

export function renderSelectionTrendBox(summary = {}) {
  if (!summary.visible || !Array.isArray(summary.notes) || !summary.notes.length) return '';
  const items = summary.notes.map(item => '<li>' + escapeHtml(item) + '</li>').join('');
  return '<div class="major-trend-selection-box"><div class="major-trend-selection-title">过去三年报考难度变化</div><ul>' + items + '</ul><p>这里只观察过去三年的投档记录，不代表报名人数、专业质量或2027年录取结果。</p><a href="/ln2026.html">查看完整变化</a></div>';
}

export { buildTrendSummaryForSelection };
