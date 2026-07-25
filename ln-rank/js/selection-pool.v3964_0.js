import '../../shared/resources/release/release-presenter.v3964_0.js?v=3964_0';
import '../../shared/ui/shell/family-shell.v3964_0.js?v=3964_0';
import { CURRENT_RELEASE } from '../../shared/resources/release/current-release.js?v=3964_0';
import { ALGORITHM_CONTRACT } from '../../shared/algorithms/algorithm-registry.js?v=3963_0';

globalThis.__GAOKAO_SHARED_RESOURCES__ = Object.freeze({
  ...(globalThis.__GAOKAO_SHARED_RESOURCES__ || {}),
  release: CURRENT_RELEASE,
  algorithm: ALGORITHM_CONTRACT
});

const reload = document.getElementById('selectionRuntimeReload');
reload?.addEventListener('click', () => location.reload());

try {
  await import('./selection-pool-runtime.v3964_0.js?v=3964_0');
  document.body.dataset.runtimeState = 'ready';
  const panel = document.getElementById('selectionRuntimeStatus');
  if (panel) panel.hidden = true;
  document.dispatchEvent(new CustomEvent('gaokao:runtime-state', {
    detail: Object.freeze({ state: 'ready', version: 'selection-runtime-v3964_0' })
  }));
} catch (error) {
  document.body.dataset.runtimeState = 'error';
  const panel = document.getElementById('selectionRuntimeStatus');
  const title = document.getElementById('selectionRuntimeTitle');
  const message = document.getElementById('selectionRuntimeMessage');
  if (panel) panel.className = 'runtime-status-panel is-error';
  if (title) title.textContent = '已选专业功能没有完整加载';
  if (message) message.textContent = '已选记录不会被清空，但当前按钮保持不可用。请重新加载后再继续。';
  if (reload) reload.hidden = false;
  document.dispatchEvent(new CustomEvent('gaokao:runtime-state', {
    detail: Object.freeze({ state: 'error', version: 'selection-runtime-v3964_0' })
  }));
  console.error('[selection-runtime-v3964_0] initialization failed', error);
}

function ensureDecisionAnchors() {
  const list = document.querySelector('.ln-selection-list-panel');
  if (list && !list.id) list.id = 'selected-list';
  const review = document.querySelector('.ln-selection-action-panel');
  if (review && !review.id) review.id = 'family-review';
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureDecisionAnchors, { once: true });
else ensureDecisionAnchors();
