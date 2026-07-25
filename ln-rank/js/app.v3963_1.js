const RUNTIME_VERSION = 'runtime-cache-coherence-v3963_1';
const CONTROL_SELECTOR = '[data-runtime-control]';

function byId(id) {
  return document.getElementById(id);
}

function setRuntimeState(state, detail = '') {
  document.body.dataset.runtimeState = state;
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
    if (panel) {
      panel.hidden = false;
      panel.className = 'runtime-status-panel is-error';
    }
    if (title) title.textContent = '筛选功能没有完整加载';
    if (message) message.textContent = '当前页面没有接管地区、学校和查询按钮。请重新加载后再继续，避免误以为条件已经生效。';
    if (retry) retry.hidden = false;
    if (badge) badge.className = 'ready-badge is-error';
    if (badgeText) badgeText.textContent = '筛选功能未就绪';
  } else {
    if (panel) {
      panel.hidden = false;
      panel.className = 'runtime-status-panel is-loading';
    }
    if (title) title.textContent = '正在准备筛选功能';
    if (message) message.textContent = detail || '地区、学校和专业选项准备好后，按钮会自动可用。';
    if (retry) retry.hidden = true;
    if (badge) badge.className = 'ready-badge is-loading';
    if (badgeText) badgeText.textContent = '筛选功能正在准备';
  }

  document.dispatchEvent(new CustomEvent('gaokao:runtime-state', {
    detail: Object.freeze({ state, version: RUNTIME_VERSION })
  }));
}

function unlockRuntimeControls() {
  document.querySelectorAll(CONTROL_SELECTOR).forEach(control => {
    control.disabled = false;
    control.removeAttribute('aria-disabled');
  });
}

byId('runtimeReloadButton')?.addEventListener('click', event => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = '正在重新加载…';
  location.reload();
});

let currentState = 'loading';
globalThis.__GAOKAO_RUNTIME_BOOTSTRAP__ = Object.freeze({
  version: RUNTIME_VERSION,
  getState: () => currentState
});

setRuntimeState('loading');

try {
  const runtime = await import('./app-runtime.v3963_1.js?v=3963_1');
  await runtime.startLnRankRuntime();
  currentState = 'ready';
  unlockRuntimeControls();
  setRuntimeState('ready');
} catch (error) {
  currentState = 'error';
  setRuntimeState('error');
  console.error('[ln-rank-runtime-v3963_1] initialization failed', error);
}
