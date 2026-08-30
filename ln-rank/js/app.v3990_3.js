import { SITE_RUNTIME_CONTRACT } from '../../shared/resources/release/site-runtime-contract.v3990_3.js?v=3990_3&r=r046-ln-rank-dynamic-focus-scroll';
import { mountMajorPathHandoff } from './workspace/major-path-handoff.v003.js?v=003_0&r=r046-ln-rank-dynamic-focus-scroll';

const RUNTIME_VERSION = 'resource-execution-v3990_3';
const CONTROL_SELECTOR = '[data-runtime-control]';

function byId(id) { return document.getElementById(id); }

const MIN_SCORE_HANDOFF_TARGETS = Object.freeze({
  'school-all': 'schoolAllResultsPanel',
  'major-all': 'majorAllResultsPanel'
});

function mountMinScoreHandoff() {
  const focus = new URLSearchParams(location.search).get('focus');
  let targetId = MIN_SCORE_HANDOFF_TARGETS[focus];
  if (!targetId) return null;
  let target = byId(targetId);
  if (!target) return null;
  let activeFocus = focus;
  let userMoved = false;
  const markUserMoved = () => { userMoved = true; };
  ['wheel', 'touchmove'].forEach(type => {
    globalThis.addEventListener(type, markUserMoved, { passive: true, capture: true });
  });
  globalThis.addEventListener('keydown', event => {
    if (['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) userMoved = true;
  }, true);
  const focusTarget = () => {
    if (userMoved) return;
    const nextFocus = new URLSearchParams(location.search).get('focus') || activeFocus;
    const nextTargetId = MIN_SCORE_HANDOFF_TARGETS[nextFocus];
    const nextTarget = byId(nextTargetId);
    if (!nextTarget) return;
    activeFocus = nextFocus;
    targetId = nextTargetId;
    target = nextTarget;
    target.hidden = false;
    target.dataset.minScoreHandoff = activeFocus;
    target.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  const scheduleFocus = event => {
    if (userMoved) return;
    if (event?.type === 'gaokao:major-result-render'
      || (event?.type === 'gaokao:school-search-state' && event.detail?.loading === false)) {
      target.removeAttribute('aria-busy');
    }
    requestAnimationFrame(() => requestAnimationFrame(focusTarget));
  };
  [
    'gaokao:result-mode-change',
    'gaokao:school-search-state',
    'gaokao:major-result-render',
    'gaokao:workspace-state',
    'gaokao:runtime-state'
  ].forEach(type => document.addEventListener(type, scheduleFocus));
  focusTarget();
  return Object.freeze({ focus, targetId, focusTarget });
}

mountMinScoreHandoff();

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
  const runtime = await import('./app-runtime.v3990_3.js?v=3990_3-nav003&r=r046-ln-rank-dynamic-focus-scroll');
  await runtime.startLnRankRuntime();
  mountMajorPathHandoff();
  currentState = 'ready';
  unlockRuntimeControls();
  setRuntimeState('ready');
} catch (error) {
  currentState = 'error';
  setRuntimeState('error');
  console.error('[ln-rank-runtime-v3990_3] initialization failed', error);
}
