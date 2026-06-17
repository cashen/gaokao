function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
export function renderFilterConflicts(root, conflicts = []) {
  if (!root) return;
  if (!Array.isArray(conflicts) || !conflicts.length) { root.hidden = true; root.innerHTML = ''; return; }
  root.hidden = false;
  root.innerHTML = `<div class="ln-filter-conflict-head"><b>条件关系提醒</b><span>这不是报错，是提醒你哪些条件会互相排掉结果。</span></div>` + conflicts.map(conflict => `
    <article class="ln-filter-conflict-card is-${escapeHtml(conflict.level || 'warn')}" data-conflict-type="${escapeHtml(conflict.type || '')}">
      <p>${escapeHtml(conflict.message || '')}</p>
      ${conflict.explanation ? `<small>${escapeHtml(conflict.explanation)}</small>` : ''}
      <div class="ln-filter-conflict-actions">${(conflict.actions || []).map(action => `<button type="button" data-filter-conflict-action="${escapeHtml(action.type)}" data-target="${escapeHtml(action.target || '')}" data-conflict-signature="${escapeHtml(conflict.signature || '')}">${escapeHtml(action.label || '处理')}</button>`).join('')}</div>
    </article>`).join('');
}
