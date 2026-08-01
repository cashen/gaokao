const VERSION = 'interaction-transaction-v3972_4';
const CONTROL_SELECTOR = 'select,input,textarea,[contenteditable="true"]';
const ACTION_SELECTOR = 'a[href],button,[role="button"]';
const SETTLE_MS = 700;
const POINTER_MATCH_MS = 1600;
const LEGACY_DISCLOSURE_ID = 'familyConditionsDetails';
const DISCLOSURE_ID = 'familyConditionsDisclosure';

const state = {
  sequence: 0,
  activeControl: null,
  settleUntil: 0,
  pointerOrigin: null,
  pointerAt: 0,
  blockedNavigations: 0,
  acceptedNavigations: 0,
  disclosure: null,
  scoreDisclosureOpen: false,
  resultMode: 'score-bands',
  internalDisclosureChange: false
};

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function closestElement(target, selector) {
  return target instanceof Element ? target.closest(selector) : null;
}

function isNativeChooser(control) {
  if (!(control instanceof Element)) return false;
  if (control.matches('select')) return true;
  if (!control.matches('input')) return false;
  return ['date', 'datetime-local', 'month', 'time', 'week', 'color', 'file'].includes(String(control.type || '').toLowerCase());
}

function setBodyState(mode = '') {
  const body = document.body;
  if (!body) return;
  if (mode) body.dataset.uiInteractionTransaction = mode;
  else delete body.dataset.uiInteractionTransaction;
  body.dataset.uiInteractionVersion = VERSION;
}

function setDisclosureOpen(open, reason) {
  const disclosure = state.disclosure;
  if (!(disclosure instanceof HTMLDetailsElement) || disclosure.open === Boolean(open)) return;
  state.internalDisclosureChange = true;
  disclosure.open = Boolean(open);
  state.internalDisclosureChange = false;
  disclosure.dataset.uiDisclosureReason = reason;
}

function syncDisclosureMode(mode, reason = 'workspace-state') {
  state.resultMode = mode === 'school-all' ? 'school-all' : 'score-bands';
  if (state.resultMode === 'school-all') setDisclosureOpen(true, reason);
  else setDisclosureOpen(state.scoreDisclosureOpen, reason);
}

function installDisclosureOwnership() {
  const legacyTarget = document.getElementById(LEGACY_DISCLOSURE_ID);
  if (!(legacyTarget instanceof HTMLDetailsElement)) return;

  legacyTarget.id = DISCLOSURE_ID;
  legacyTarget.dataset.uiDisclosureOwner = VERSION;
  state.disclosure = legacyTarget;
  state.scoreDisclosureOpen = legacyTarget.open;

  const compatibilityBridge = document.createElement('span');
  compatibilityBridge.id = LEGACY_DISCLOSURE_ID;
  compatibilityBridge.hidden = true;
  compatibilityBridge.dataset.uiDisclosureCompatibility = VERSION;
  legacyTarget.before(compatibilityBridge);

  legacyTarget.addEventListener('toggle', () => {
    if (state.internalDisclosureChange || state.resultMode === 'school-all') return;
    state.scoreDisclosureOpen = legacyTarget.open;
  });

  document.addEventListener('gaokao:workspace-state', event => {
    syncDisclosureMode(event.detail?.mode, 'workspace-state');
  });
  document.addEventListener('gaokao:result-mode-change', event => {
    syncDisclosureMode(event.detail?.mode, 'result-mode-change');
  });
}

function beginControlTransaction(control, reason) {
  if (!isNativeChooser(control)) return;
  state.sequence += 1;
  state.activeControl = control;
  state.settleUntil = now() + SETTLE_MS;
  setBodyState('settling');
  document.dispatchEvent(new CustomEvent('gaokao:interaction-transaction', {
    detail: Object.freeze({
      version: VERSION,
      sequence: state.sequence,
      phase: 'settling',
      reason,
      controlId: control.id || '',
      controlName: control.getAttribute('name') || ''
    })
  }));
  globalThis.setTimeout(() => {
    if (now() < state.settleUntil) return;
    state.activeControl = null;
    setBodyState('ready');
    document.dispatchEvent(new CustomEvent('gaokao:interaction-transaction', {
      detail: Object.freeze({
        version: VERSION,
        sequence: state.sequence,
        phase: 'ready',
        reason: 'settled'
      })
    }));
  }, SETTLE_MS + 40);
}

function rememberPointerOrigin(event) {
  state.pointerOrigin = closestElement(event.target, ACTION_SELECTOR) || closestElement(event.target, CONTROL_SELECTOR) || event.target;
  state.pointerAt = now();
  const control = closestElement(event.target, CONTROL_SELECTOR);
  if (isNativeChooser(control)) beginControlTransaction(control, 'pointerdown');
}

function hasMatchingPointerOrigin(action) {
  if (!(action instanceof Element)) return false;
  if (!state.pointerOrigin || now() - state.pointerAt > POINTER_MATCH_MS) return false;
  return state.pointerOrigin === action || action.contains(state.pointerOrigin);
}

function isKeyboardActivation(event) {
  return Number(event.detail || 0) === 0 && !state.pointerOrigin;
}

function guardNavigation(event) {
  const anchor = closestElement(event.target, 'a[href]');
  if (!anchor) return;
  const settling = now() < state.settleUntil;
  if (!settling || hasMatchingPointerOrigin(anchor) || isKeyboardActivation(event)) {
    state.acceptedNavigations += 1;
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  state.blockedNavigations += 1;
  document.dispatchEvent(new CustomEvent('gaokao:navigation-blocked', {
    detail: Object.freeze({
      version: VERSION,
      sequence: state.sequence,
      href: anchor.getAttribute('href') || '',
      reason: 'native-control-tail-click-without-anchor-origin',
      controlId: state.activeControl?.id || ''
    })
  }));
}

function bind() {
  document.addEventListener('pointerdown', rememberPointerOrigin, true);
  document.addEventListener('mousedown', event => {
    if (globalThis.PointerEvent) return;
    rememberPointerOrigin(event);
  }, true);
  document.addEventListener('touchstart', event => {
    if (globalThis.PointerEvent) return;
    rememberPointerOrigin(event);
  }, { capture: true, passive: true });
  document.addEventListener('focusin', event => {
    const control = closestElement(event.target, CONTROL_SELECTOR);
    if (isNativeChooser(control)) beginControlTransaction(control, 'focusin');
  }, true);
  document.addEventListener('change', event => {
    const control = closestElement(event.target, CONTROL_SELECTOR);
    if (isNativeChooser(control)) beginControlTransaction(control, 'change');
  }, true);
  document.addEventListener('click', guardNavigation, true);
  globalThis.addEventListener('pagehide', () => {
    state.activeControl = null;
    state.settleUntil = 0;
    state.pointerOrigin = null;
  });
}

installDisclosureOwnership();
setBodyState('ready');
bind();

globalThis.__GAOKAO_INTERACTION_TRANSACTION__ = Object.freeze({
  version: VERSION,
  disclosureId: DISCLOSURE_ID,
  getState: () => Object.freeze({
    sequence: state.sequence,
    settling: now() < state.settleUntil,
    activeControlId: state.activeControl?.id || '',
    blockedNavigations: state.blockedNavigations,
    acceptedNavigations: state.acceptedNavigations,
    disclosureOpen: Boolean(state.disclosure?.open),
    scoreDisclosureOpen: state.scoreDisclosureOpen,
    resultMode: state.resultMode,
    disclosureOwner: state.disclosure?.dataset.uiDisclosureOwner || ''
  })
});
