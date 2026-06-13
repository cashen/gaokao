import { getDirectionExplorerResult } from './direction-explorer-state.js?v=3933_7';
import { buildDirectionExplorerPlainText } from './direction-explorer-engine.js?v=3933_7';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function compactDirectionLabel(item) {
  return item && typeof item === 'object' ? (item.shortLabel || item.label || '') : item;
}
function list(items = [], limit = 4) {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!arr.length) return '';
  const visible = arr.slice(0, limit);
  const tags = visible.map(x => `<span>${escapeHtml(compactDirectionLabel(x))}</span>`).join('');
  return `<div class="direction-report-tags">${tags}${arr.length > limit ? `<span class="direction-more-tag">等 ${arr.length} 个方向</span>` : ''}</div>`;
}
export function buildDirectionExplorerReportText(result = getDirectionExplorerResult()) {
  return buildDirectionExplorerPlainText(result);
}
export function renderDirectionExplorerReportHtml(root, { compact = false } = {}) {
  if (!root) return;
  const result = getDirectionExplorerResult();
  if (!result) {
    root.innerHTML = compact ? '' : `<section class="direction-report-box is-empty"><h3>孩子方向参考</h3><p>还没做方向小判断，不影响生成报告。孩子方向不确定时，可以回到查询页先找几个方向。</p><a class="direction-report-link" href="./index.html#direction-explorer">回查询页看看方向</a></section>`;
    return;
  }
  const summary = (result.visibleDirections || []).slice(0, 4).join(' / ');
  const suffix = (result.visibleDirections || []).length > 4 ? ' 等' : '';
  const detail = `
    ${result.focus?.length ? `<div class="direction-report-row"><b>更值得重点讨论</b>${list(result.focus, 4)}</div>` : ''}
    ${result.explore?.length ? `<div class="direction-report-row"><b>可以先了解</b>${list(result.explore, 4)}<p>没接触过不等于不适合，先看课程和场景。</p></div>` : ''}
    ${result.confirm?.length ? `<div class="direction-report-row"><b>需要再确认</b><ul>${result.confirm.slice(0, 4).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}`;
  if (compact) {
    root.innerHTML = `<section class="direction-report-box is-compact">
      <div class="direction-report-head"><h3>孩子方向参考</h3><p>${summary ? `已加入 ${escapeHtml(summary)}${suffix}，只做讨论路标。` : '已生成方向参考，只做讨论路标。'}</p></div>
      <details class="direction-report-details"><summary>展开方向参考</summary>${detail}</details>
    </section>`;
    return;
  }
  root.innerHTML = `<section class="direction-report-box">
    <div class="direction-report-head"><h3>孩子方向参考</h3><p>这部分只做讨论路标，不替孩子定专业；专业卡片和人工确认仍是主线。</p></div>
    ${detail}
  </section>`;
}
export function getDirectionExplorerReportContext(result = getDirectionExplorerResult()) {
  if (!result) return null;
  return {
    focus: (result.focus || []).map(x => x.label),
    explore: (result.explore || []).map(x => x.label),
    confirm: result.confirm || [],
    visibleDirections: result.visibleDirections || [],
    summary: result.summary || ''
  };
}
