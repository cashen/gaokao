import { DEFAULT_KEYWORD_PRESETS, MORE_KEYWORD_GROUPS } from './keyword-preset-policy.v3971.js';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderWordButton(word, className = 'keyword-preset-chip') {
  return `<button type="button" class="${className}" data-major-keyword-chip="${escapeHtml(word)}">${escapeHtml(word)}</button>`;
}

export function mountKeywordPresetPanel(root, { onKeyword } = {}) {
  if (!root) return;
  root.innerHTML = `
    <div class="keyword-preset-default" aria-label="常用关键词快捷输入">
      <span class="keyword-preset-label">常用：</span>
      <div class="keyword-preset-chips">
        ${DEFAULT_KEYWORD_PRESETS.map(item => renderWordButton(item.label)).join('')}
      </div>
      <button type="button" class="keyword-more-toggle" aria-expanded="false">更多方向</button>
    </div>
    <div class="keyword-more-panel" hidden>
      ${MORE_KEYWORD_GROUPS.map(group => `
        <section class="keyword-more-group">
          <div class="keyword-more-title">${escapeHtml(group.title)}</div>
          <div class="keyword-more-words">
            ${group.words.map(word => renderWordButton(word, 'keyword-preset-chip is-secondary')).join('')}
          </div>
        </section>
      `).join('')}
      <p class="keyword-more-note">没有看到的方向也可以直接手动输入，例如：土木、测绘、水利、储能、动医。系统会保留原词参与搜索。</p>
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
