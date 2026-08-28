const VIEWPORT_VERSION = 'viewport-orchestration-v3961';
const isAndroid = /Android/i.test(navigator.userAgent || '');

let baseViewportHeight = 0;
let lastViewportWidth = 0;
let scheduled = false;
let currentState = Object.freeze({
  keyboardOpen: false,
  viewportKind: 'desktop',
  visualHeight: 0,
  width: 0,
  isAndroid
});

function viewportKind(width) {
  if (width <= 390) return 'phone-375';
  if (width < 768) return 'phone';
  if (width <= 1180) return 'tablet';
  return 'desktop';
}

function measure() {
  scheduled = false;
  const visual = globalThis.visualViewport;
  const visualHeight = Math.round(visual?.height || globalThis.innerHeight || 0);
  const width = Math.round(visual?.width || globalThis.innerWidth || document.documentElement.clientWidth || 0);
  if (!lastViewportWidth || Math.abs(width - lastViewportWidth) > 80) baseViewportHeight = visualHeight;
  lastViewportWidth = width;
  if (!baseViewportHeight || visualHeight > baseViewportHeight) baseViewportHeight = visualHeight;
  const keyboardOpen = Boolean(visual && baseViewportHeight - visualHeight > 140);
  const next = Object.freeze({
    keyboardOpen,
    viewportKind: viewportKind(width),
    visualHeight,
    width,
    isAndroid
  });
  currentState = next;
  const body = document.body;
  const root = document.documentElement;
  root.style.setProperty('--ln-visual-height', `${visualHeight}px`);
  body.classList.toggle('ui-keyboard-open', keyboardOpen);
  body.classList.toggle('is-keyboard-open', keyboardOpen);
  body.classList.toggle('is-android-device', isAndroid);
  body.dataset.uxViewport = next.viewportKind;
  body.dataset.viewportOrchestration = VIEWPORT_VERSION;
  document.dispatchEvent(new CustomEvent('gaokao:viewport-state', { detail: next }));
}

function scheduleMeasure() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(measure);
}

export function getViewportState() {
  return currentState;
}

export function mountViewportOrchestrator() {
  globalThis.visualViewport?.addEventListener('resize', scheduleMeasure, { passive: true });
  globalThis.visualViewport?.addEventListener('scroll', scheduleMeasure, { passive: true });
  globalThis.addEventListener('resize', scheduleMeasure, { passive: true });
  globalThis.addEventListener('orientationchange', () => {
    baseViewportHeight = 0;
    lastViewportWidth = 0;
    scheduleMeasure();
  }, { passive: true });
  measure();
  globalThis.__GAOKAO_VIEWPORT_ORCHESTRATOR__ = Object.freeze({
    version: VIEWPORT_VERSION,
    getState: getViewportState,
    scheduleMeasure
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountViewportOrchestrator, { once: true });
  } else {
    mountViewportOrchestrator();
  }
}
