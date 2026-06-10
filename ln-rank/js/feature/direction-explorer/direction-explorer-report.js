import { getDirectionExplorerResult } from './direction-explorer-state.js?v=3923';
import { buildDirectionExplorerPlainText } from './direction-explorer-engine.js?v=3923';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function list(items = []) { return items.length ? `<div class="direction-report-tags">${items.map(x => `<span>${escapeHtml(x.label || x)}</span>`).join('')}</div>` : ''; }
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
  root.innerHTML = `<section class="direction-report-box">
    <div class="direction-report-head"><h3>孩子方向参考</h3><p>这部分不是给孩子定专业，只是帮家里讨论哪些方向值得看、哪些只是没接触过、哪些地方需要再确认。</p></div>
    ${result.focus?.length ? `<div class="direction-report-row"><b>更值得重点讨论</b>${list(result.focus)}</div>` : ''}
    ${result.explore?.length ? `<div class="direction-report-row"><b>可以先了解</b>${list(result.explore)}<p>孩子接触不多的方向，不建议因为“没感觉”就直接排除。</p></div>` : ''}
    ${result.confirm?.length ? `<div class="direction-report-row"><b>需要再确认</b><ul>${result.confirm.slice(0, 4).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
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
