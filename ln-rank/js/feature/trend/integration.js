import { buildTrendSummaryForSelection, trendHintText } from './rules.js?v=3920_1';

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
  const rawKeyword = String(keyword || '').trim();
  const text = rawKeyword ? trendHintText(score, rawKeyword) : '';
  if (!text) {
    // v3.9.12：无专业/关键词时不展开热度说明，避免右侧辅助区变成窄列说明文。
    root.innerHTML = '';
    root.className = 'major-trend-hint is-empty';
    return;
  }
  root.className = 'major-trend-hint is-active';
  const clean = escapeHtml(text.replace(/^专业热度参考：/, ''));
  root.innerHTML = `<div><b>热度参考</b><p>${clean}</p></div><a class="major-trend-link" href="./major-trend-2025.html">完整热度</a>`;
}

export function renderSelectionTrendBox(summary = {}) {
  if (!summary?.visible || !Array.isArray(summary.notes) || !summary.notes.length) return '';
  return `<div class="major-trend-selection-box"><div class="major-trend-selection-title">专业热度变化参考</div><ul>${summary.notes.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul><p>以上只反映 2024/2025 两年同校同专业录取位次变化，不代表 2026 年录取结果。</p></div>`;
}

export { buildTrendSummaryForSelection };
