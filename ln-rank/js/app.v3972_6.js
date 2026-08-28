import { SITE_RUNTIME_CONTRACT } from '../../shared/resources/release/site-runtime-contract.v3972_6.js?v=3972_6';

const RUNTIME_VERSION = 'resource-execution-v3972_6';
const CONTROL_SELECTOR = '[data-runtime-control]';

function byId(id) { return document.getElementById(id); }

function setRuntimeState(state, detail = '') {
  document.body.dataset.runtimeState = state;
  document.body.dataset.siteRuntimeGeneration = SITE_RUNTIME_CONTRACT.generation;
  const panel = byId('runtimeStatusPanel');
  const title = byId('runtimeStatusTitle');
  const message = byId('runtimeStatusMessage');
  const retry = byId('runtimeReloadButton');
  const badge = byId('appReadyBadge');
  const badgeText = badge?.querySelector('.ready-text');
  if (state === 'ready') {
    if (panel) panel.hidden = true;
    if (badge) badge.className = 'ready-badge is-ready';
    if (badgeText) badgeText.textContent = '筛选功能已准备';
  } else if (state === 'error') {
    if (panel) { panel.hidden = false; panel.className = 'runtime-status-panel is-error'; }
    if (title) title.textContent = '筛选功能没有完整加载';
    if (message) message.textContent = '页面功能没有完整接管。输入内容仍保留，但按钮保持不可用；请重新加载后再继续。';
    if (retry) retry.hidden = false;
    if (badge) badge.className = 'ready-badge is-error';
    if (badgeText) badgeText.textContent = '筛选功能未就绪';
  } else {
    if (panel) { panel.hidden = false; panel.className = 'runtime-status-panel is-loading'; }
    if (title) title.textContent = '正在准备筛选功能';
    if (message) message.textContent = detail || '地区、学校和专业选项准备好后，按钮会自动可用。';
    if (retry) retry.hidden = true;
    if (badge) badge.className = 'ready-badge is-loading';
    if (badgeText) badgeText.textContent = '筛选功能正在准备';
  }
  document.dispatchEvent(new CustomEvent('gaokao:runtime-state', {
    detail: Object.freeze({ state, version: RUNTIME_VERSION, generation: SITE_RUNTIME_CONTRACT.generation })
  }));
}

function unlockRuntimeControls() {
  document.querySelectorAll(CONTROL_SELECTOR).forEach(control => {
    control.disabled = false;
    control.removeAttribute('aria-disabled');
  });
}

byId('runtimeReloadButton')?.addEventListener('click', () => location.reload());

let currentState = 'loading';
globalThis.__GAOKAO_RUNTIME_BOOTSTRAP__ = Object.freeze({
  version: RUNTIME_VERSION,
  generation: SITE_RUNTIME_CONTRACT.generation,
  contractVersion: SITE_RUNTIME_CONTRACT.version,
  getState: () => currentState
});

setRuntimeState('loading');
try {
  const runtime = await import('./app-runtime.v3972_6.js?v=3972_6');
  await runtime.startLnRankRuntime();
  currentState = 'ready';
  unlockRuntimeControls();
  setRuntimeState('ready');
} catch (error) {
  currentState = 'error';
  setRuntimeState('error');
  console.error('[ln-rank-runtime-v3972_6] initialization failed', error);
}
