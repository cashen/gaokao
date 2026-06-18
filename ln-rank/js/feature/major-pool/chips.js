import { DEFAULT_KEYWORD_PRESETS, MORE_KEYWORD_GROUPS, KEYWORD_PRESET_NOTE } from './preset-policy.js?v=3949_0';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeWordItem(item) {
  if (typeof item === 'string') return { label: item };
  return item || { label: '' };
}

function classNames(list) {
  return list.filter(Boolean).join(' ');
}

function renderWordButton(item, baseClass = 'keyword-preset-chip', inheritedTone = '') {
  const normalized = normalizeWordItem(item);
  const label = normalized.label || '';
  const tone = normalized.tone || inheritedTone || 'default';
  const type = normalized.type || '';
  const badge = normalized.badge || (type === 'project_attribute' ? '项目' : '');
  const title = normalized.intent || '';
  const classes = classNames([
    baseClass,
    baseClass.includes('is-secondary') ? '' : '',
    tone ? `tone-${tone}` : '',
    type ? `type-${type}` : '',
    badge ? 'has-badge' : ''
  ]);
  return `
    <button type="button" class="${classes}" data-major-keyword-chip="${escapeHtml(label)}" ${title ? `title="${escapeHtml(title)}"` : ''}>
      <span class="keyword-chip-text">${escapeHtml(label)}</span>
      ${badge ? `<span class="keyword-chip-badge">${escapeHtml(badge)}</span>` : ''}
    </button>`;
}

export function mountKeywordPresetPanel(root, { onKeyword } = {}) {
  if (!root) return;
  root.innerHTML = `
    <div class="keyword-preset-default" aria-label="常用关键词快捷输入">
      <span class="keyword-preset-label">常用方向：不会输入时，可以先点一个看看</span>
      <div class="keyword-preset-chips">
        ${DEFAULT_KEYWORD_PRESETS.map(item => renderWordButton(item)).join('')}
      </div>
      <button type="button" class="keyword-more-toggle" aria-expanded="false">更多方向</button>
    </div>
    <div class="keyword-more-panel" hidden>
      ${MORE_KEYWORD_GROUPS.map(group => `
        <section class="keyword-more-group tone-${escapeHtml(group.tone || 'default')}">
          <div class="keyword-more-title">
            <span>${escapeHtml(group.title)}</span>
            ${group.hint ? `<small>${escapeHtml(group.hint)}</small>` : ''}
          </div>
          <div class="keyword-more-words">
            ${group.words.map(word => renderWordButton(word, 'keyword-preset-chip is-secondary', group.tone || 'default')).join('')}
          </div>
        </section>
      `).join('')}
      <p class="keyword-more-note">${escapeHtml(KEYWORD_PRESET_NOTE)}</p>
      <p class="keyword-more-note is-muted">没有看到的方向也可以直接手动输入，例如：土木、测绘、水利、储能、动医。系统会保留原词参与搜索。</p>
    </div>
  `;

  root.querySelectorAll('[data-major-keyword-chip]').forEach(button => {
    button.addEventListener('click', () => {
      const word = button.dataset.majorKeywordChip;
      if (word && typeof onKeyword === 'function') onKeyword(word);
    });
  });

  const toggle = root.querySelector('.keyword-more-toggle');
  const panel = root.querySelector('.keyword-more-panel');
  toggle?.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.textContent = expanded ? '更多方向' : '收起方向';
    if (panel) panel.hidden = expanded;
  });
}
