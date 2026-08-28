import '../../shared/resources/release/release-presenter.v3990_1.js?v=3990_1';
import './domain/family-plan-copy-adapter.v3970_0.js?v=3970_0';
import '../../shared/ui/shell/family-shell.v3990_1.js?v=3990_1';
import { CURRENT_RELEASE } from '../../shared/resources/release/current-release.js?v=3990_1';
import { SITE_RUNTIME_CONTRACT } from '../../shared/resources/release/site-runtime-contract.v3990_1.js?v=3990_1';
import { ALGORITHM_CONTRACT } from '../../shared/algorithms/algorithm-registry.js?v=3969_0';

globalThis.__GAOKAO_SHARED_RESOURCES__ = Object.freeze({
  ...(globalThis.__GAOKAO_SHARED_RESOURCES__ || {}),
  release: CURRENT_RELEASE,
  siteRuntime: SITE_RUNTIME_CONTRACT,
  algorithm: ALGORITHM_CONTRACT,
  familyAction: CURRENT_RELEASE.familyActionVersion
});

const reload = document.getElementById('selectionRuntimeReload');
reload?.addEventListener('click', () => location.reload());

document.body.dataset.siteRuntimeGeneration = SITE_RUNTIME_CONTRACT.generation;

try {
  await import('./selection-pool-runtime.v3990_1.js?v=3990_1');
  if (globalThis.__GAOKAO_SELECTION_POOL_RUNTIME__?.generation !== SITE_RUNTIME_CONTRACT.generation) {
    throw new Error('family-plan runtime generation mismatch');
  }
  document.body.dataset.runtimeState = 'ready';
  const panel = document.getElementById('selectionRuntimeStatus');
  if (panel) panel.hidden = true;
  document.dispatchEvent(new CustomEvent('gaokao:runtime-state', {
    detail: Object.freeze({
      state: 'ready',
      version: 'selection-runtime-v3990_1',
      generation: SITE_RUNTIME_CONTRACT.generation
    })
  }));
} catch (error) {
  document.body.dataset.runtimeState = 'error';
  const panel = document.getElementById('selectionRuntimeStatus');
  const title = document.getElementById('selectionRuntimeTitle');
  const message = document.getElementById('selectionRuntimeMessage');
  if (panel) panel.className = 'runtime-status-panel is-error';
  if (title) title.textContent = '家庭方案功能没有完整加载';
  if (message) message.textContent = '已经加入家庭方案的专业不会被清空，但当前按钮暂时不可用。请重新加载后再继续。';
  if (reload) reload.hidden = false;
  document.dispatchEvent(new CustomEvent('gaokao:runtime-state', {
    detail: Object.freeze({
      state: 'error',
      version: 'selection-runtime-v3990_1',
      generation: SITE_RUNTIME_CONTRACT.generation
    })
  }));
  console.error('[selection-runtime-v3990_1] initialization failed', error);
}

