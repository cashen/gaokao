import { getDirectionExplorerResult } from './direction-explorer-state.js?v=3949_0';
import { buildDirectionExplorerPlainText } from './direction-explorer-engine.js?v=3949_0';

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function compactDirectionLabel(item) { return item && typeof item === 'object' ? (item.shortLabel || item.label || '') : item; }
function list(items = [], limit = 4) {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!arr.length) return '';
  const visible = arr.slice(0, limit);
  const tags = visible.map(x => `<span>${escapeHtml(compactDirectionLabel(x))}</span>`).join('');
  return `<div class="direction-report-tags">${tags}${arr.length > limit ? `<span class="direction-more-tag">等 ${arr.length} 个方向</span>` : ''}</div>`;
}
function noteList(items = [], limit = 5) {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!arr.length) return '';
  return `<ul>${arr.slice(0, limit).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
}
function unique(list = []) { return [...new Set(list.filter(Boolean))]; }
export function buildDirectionExplorerReportText(result = getDirectionExplorerResult()) { return buildDirectionExplorerPlainText(result); }
export function renderDirectionExplorerReportHtml(root, { compact = false } = {}) {
  if (!root) return;
  const result = getDirectionExplorerResult();
  if (!result) {
    root.innerHTML = compact ? '' : `<section class="direction-report-box is-empty"><h3>孩子方向讨论记录</h3><p>还没有使用方向讨论助手，不影响生成报告。方向还不确定时，可以回到查询页先圈出几个可以继续了解的方向。</p><a class="direction-report-link" href="./index.html#direction-explorer">回查询页看看方向</a></section>`;
    return;
  }
  const selected = (result.visibleDirections || []).slice(0, 3).join(' / ');
  const suffix = (result.visibleDirections || []).length > 3 ? ' 等' : '';
  const confirmNotes = unique([...(result.confirm || []).flatMap(x => x.confirmNotes || []), ...(result.globalConfirm || [])]);
  const conflictNotes = unique((result.conflicts || []).flatMap(x => [x.message, x.action]));
  const detail = `
    ${result.respondent?.label ? `<div class="direction-report-row"><b>填写来源</b><p>${escapeHtml(result.respondent.label)}。${escapeHtml(result.respondent.confidenceNote || '')}</p></div>` : ''}
    ${result.apply?.length ? `<div class="direction-report-row"><b>可以先放进查询</b>${list(result.apply, 4)}<p>这些方向有接触或行为线索，但仍要回到分数附近专业池验证。</p></div>` : ''}
    ${result.learn?.length ? `<div class="direction-report-row"><b>可以先了解</b>${list(result.learn, 4)}<p>没接触过不代表要排除，先看课程和真实专业。</p></div>` : ''}
    ${result.confirm?.length ? `<div class="direction-report-row"><b>需要先确认</b>${list(result.confirm, 4)}${noteList(confirmNotes, 5)}</div>` : ''}
    ${conflictNotes.length ? `<div class="direction-report-row"><b>矛盾点提醒</b>${noteList(conflictNotes, 5)}</div>` : ''}
    ${result.familyConstraints?.length ? `<div class="direction-report-row"><b>家庭约束提醒</b>${noteList(result.familyConstraints, 5)}</div>` : ''}
    <div class="direction-report-row"><b>使用边界</b><p>这不是直接定专业，只是家庭讨论记录；正式填报仍需核验 2026 位次、招生计划、院校章程、校区、体检、学费和培养模式。</p></div>`;
  if (compact) {
    root.innerHTML = `<section class="direction-report-box is-compact"><div class="direction-report-head"><h3>孩子方向讨论记录</h3><p>${selected ? `已选择 ${escapeHtml(selected)}${suffix}，只做家庭讨论线索。` : '已生成方向讨论记录，只做家庭讨论线索。'}</p></div><details class="direction-report-details"><summary>展开方向讨论记录</summary>${detail}</details></section>`;
    return;
  }
  root.innerHTML = `<section class="direction-report-box"><div class="direction-report-head"><h3>孩子方向讨论记录</h3><p>这部分只做家庭讨论线索，不替孩子定专业；专业卡片和人工确认仍是主线。</p></div>${detail}</section>`;
}
export function getDirectionExplorerReportContext(result = getDirectionExplorerResult()) {
  if (!result) return null;
  return {
    apply: (result.apply || []).map(x => x.label),
    learn: (result.learn || []).map(x => x.label),
    confirm: (result.confirm || []).map(x => x.label),
    conflicts: (result.conflicts || []).map(x => x.message),
    familyConstraints: result.familyConstraints || [],
    selectedDirectionIds: result.selectedDirectionIds || [],
    visibleDirections: result.visibleDirections || [],
    summary: result.summary || '',
    respondent: result.respondent || null
  };
}
