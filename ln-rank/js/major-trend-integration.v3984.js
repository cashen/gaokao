import { buildTrendSummaryForSelection, trendHintText } from './major-trend-rules.v3984.js';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderSearchTrendHint(root, { score, keyword } = {}) {
  if (!root) return;
  const text = trendHintText(score, keyword);
  if (!text) {
    root.innerHTML = '<a class="major-trend-link" href="./major-trend-2025.html">查看 2024/2025 专业热度变化参考</a><span>输入专业方向或项目关键词后，这里会给出对应分段的热度提醒。</span>';
    root.className = 'major-trend-hint is-soft';
    return;
  }
  root.className = 'major-trend-hint is-active';
  root.innerHTML = `<div><b>专业热度参考</b><p>${escapeHtml(text.replace(/^专业热度参考：/, ''))}</p></div><a class="major-trend-link" href="./major-trend-2025.html">查看完整热度页</a>`;
}

export function renderSelectionTrendBox(summary = {}) {
  if (!summary?.visible || !Array.isArray(summary.notes) || !summary.notes.length) return '';
  return `<div class="major-trend-selection-box"><div class="major-trend-selection-title">专业热度变化参考</div><ul>${summary.notes.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul><p>以上只反映 2024/2025 两年同校同专业录取位次变化，不代表 2026 年录取结果。</p></div>`;
}

export { buildTrendSummaryForSelection };
