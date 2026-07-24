const INTERNAL_SCROLL_WINDOW_MS = 120;

let userScrollRevision = 0;
let internalScrollUntil = 0;
let querySequence = 0;

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function isInternalScroll() {
  return now() <= internalScrollUntil;
}

function markInternalScroll() {
  internalScrollUntil = now() + INTERNAL_SCROLL_WINDOW_MS;
}

function markUserMotion() {
  if (!isInternalScroll()) userScrollRevision += 1;
}

function keyboardOpen() {
  return document.body?.classList?.contains('ui-keyboard-open')
    || document.body?.classList?.contains('is-keyboard-open');
}

function viewportContains(element, margin = 24) {
  if (!(element instanceof Element)) return false;
  const rect = element.getBoundingClientRect();
  const viewportHeight = globalThis.visualViewport?.height || globalThis.innerHeight || 0;
  return rect.top >= margin && rect.top <= Math.max(margin, viewportHeight - margin);
}

export function createScrollSnapshot() {
  return Object.freeze({
    y: globalThis.scrollY || document.documentElement.scrollTop || 0,
    revision: userScrollRevision
  });
}

export function preserveScrollSnapshot(snapshot) {
  if (!snapshot) return;
  requestAnimationFrame(() => {
    if (snapshot.revision !== userScrollRevision) return;
    const current = globalThis.scrollY || document.documentElement.scrollTop || 0;
    if (Math.abs(current - snapshot.y) <= 1) return;
    markInternalScroll();
    globalThis.scrollTo({ top: snapshot.y, left: 0, behavior: 'auto' });
  });
}

export function beginQueryScrollIntent({ allowAutoScroll = false } = {}) {
  querySequence += 1;
  return Object.freeze({
    id: querySequence,
    revision: userScrollRevision,
    allowAutoScroll: Boolean(allowAutoScroll)
  });
}

export function finishQueryScrollIntent(intent, target) {
  if (!intent?.allowAutoScroll) return false;
  if (intent.revision !== userScrollRevision || keyboardOpen()) return false;
  if (!(target instanceof Element) || viewportContains(target)) return false;
  markInternalScroll();
  target.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return true;
}

export function scrollToExplicitTarget(target) {
  if (!(target instanceof Element)) return false;
  markInternalScroll();
  target.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return true;
}

export function getUserScrollRevision() {
  return userScrollRevision;
}

export function markWorkspaceIntent() {
  userScrollRevision += 1;
  return userScrollRevision;
}

function bindUserMotion() {
  globalThis.addEventListener?.('scroll', markUserMotion, { passive: true });
  globalThis.addEventListener?.('wheel', markUserMotion, { passive: true });
  globalThis.addEventListener?.('touchmove', markUserMotion, { passive: true });
  document.addEventListener?.('pointerdown', markUserMotion, { passive: true, capture: true });
  document.addEventListener?.('keydown', (event) => {
    if (['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) markUserMotion();
  }, true);
}

if (typeof document !== 'undefined') {
  bindUserMotion();
  globalThis.__GAOKAO_SCROLL_POLICY__ = Object.freeze({
    version: 'scroll-policy-v3961',
    createScrollSnapshot,
    preserveScrollSnapshot,
    beginQueryScrollIntent,
    finishQueryScrollIntent,
    scrollToExplicitTarget,
    getUserScrollRevision,
    markWorkspaceIntent
  });
}
