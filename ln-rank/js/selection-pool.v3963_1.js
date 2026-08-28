import '../../shared/resources/release/release-presenter.v3963_1.js?v=3963_1';
import '../../shared/ui/shell/family-shell.v3963_1.js?v=3963_1';
import { CURRENT_RELEASE } from '../../shared/resources/release/current-release.js?v=3963_1';
import { ALGORITHM_CONTRACT } from '../../shared/algorithms/algorithm-registry.js?v=3963_0';

globalThis.__GAOKAO_SHARED_RESOURCES__ = Object.freeze({
  ...(globalThis.__GAOKAO_SHARED_RESOURCES__ || {}),
  release: CURRENT_RELEASE,
  algorithm: ALGORITHM_CONTRACT
});

await import('./selection-pool-runtime.v3963_1.js?v=3963_1');

function ensureDecisionAnchors() {
  const list = document.querySelector('.ln-selection-list-panel');
  if (list && !list.id) list.id = 'selected-list';
  const review = document.querySelector('.ln-selection-action-panel');
  if (review && !review.id) review.id = 'family-review';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureDecisionAnchors, { once: true });
else ensureDecisionAnchors();
