import { LN_RANK_INTERACTION_RUNTIME_CONTRACT } from '../../resources/release/interaction-runtime-contract.v3972_5.js?v=3972_5';

const VERSION = 'interaction-transaction-v3972_5';
const CONTROL_SELECTOR = 'select,input,textarea,[contenteditable="true"]';
const NAVIGATION_SELECTOR = '[data-ui-navigation][data-ui-navigation-target]';
const LEGACY_DISCLOSURE_ID = 'familyConditionsDetails';
const DISCLOSURE_ID = 'familyConditionsDisclosure';
const QUARANTINE_MS = LN_RANK_INTERACTION_RUNTIME_CONTRACT.policies.nativeChooserQuarantineMs;
const POINTER_ACTIVATION_MS = 2400;
const ACTIVE_SAFETY_MS = 30000;

const state = {
  sequence: 0,
  phase: 'booting',
  phaseReason: 'booting',
  activeControl: null,
  quarantineUntil: 0,
  releaseTimer: 0,
  safetyTimer: 0,
  pointerAction: null,
  pointerAt: 0,
  lastPhysicalTarget: null,
  lastPhysicalAt: 0,
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

function navigationActions() {
  return [...document.querySelectorAll(NAVIGATION_SELECTOR)];
}

function navigationContainer(action) {
  return action?.closest?.('.aux-background-entry') || null;
}

function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail: Object.freeze({ version: VERSION, ...detail }) }));
}

function clearTimer(name) {
  if (!state[name]) return;
  globalThis.clearTimeout(state[name]);
  state[name] = 0;
}

function setBodyState() {
  const body = document.body;
  if (!body) return;
  body.dataset.uiInteractionVersion = VERSION;
  body.dataset.uiInteractionTransaction = state.phase;
  body.dataset.uiNavigationOwner = VERSION;
}

function setNavigationAvailability(enabled, reason) {
  for (const action of navigationActions()) {
    action.dataset.uiNavigationOwner = VERSION;
    action.dataset.uiNavigationEnabled = String(Boolean(enabled));
    action.disabled = !enabled;
    action.setAttribute('aria-disabled', String(!enabled));
    const container = navigationContainer(action);
    if (container) {
      container.dataset.uiNavigationOwner = VERSION;
      container.dataset.uiNavigationPhase = state.phase;
      container.dataset.uiNavigationReason = reason;
      if ('inert' in container) container.inert = !enabled;
    }
  }
}

function setPhase(phase, reason) {
  state.phase = phase;
  state.phaseReason = reason;
  setBodyState();
  setNavigationAvailability(phase === 'ready', reason);
  emit('gaokao:interaction-transaction', {
    sequence: state.sequence,
    phase,
    reason,
    controlId: state.activeControl?.id || ''
  });
}

function releaseToReady(sequence, reason = 'quarantine-complete') {
  if (sequence !== state.sequence) return;
  if (state.phase === 'native-chooser-quarantine' && now() < state.quarantineUntil) return;
  clearTimer('releaseTimer');
  clearTimer('safetyTimer');
  state.activeControl = null;
  state.quarantineUntil = 0;
  state.pointerAction = null;
  state.pointerAt = 0;
  setPhase('ready', reason);
}

function enterNativeChooser(control, reason) {
  if (!isNativeChooser(control)) return;
  clearTimer('releaseTimer');
  clearTimer('safetyTimer');
  if (state.phase !== 'native-chooser-active' || state.activeControl !== control) state.sequence += 1;
  state.activeControl = control;
  state.quarantineUntil = 0;
  state.pointerAction = null;
  state.pointerAt = 0;
  setPhase('native-chooser-active', reason);
  const sequence = state.sequence;
  state.safetyTimer = globalThis.setTimeout(() => {
    if (sequence !== state.sequence || state.phase !== 'native-chooser-active') return;
    beginQuarantine(control, 'native-chooser-safety-release');
  }, ACTIVE_SAFETY_MS);
}

function beginQuarantine(control, reason) {
  if (!isNativeChooser(control) && state.phase !== 'native-chooser-active') return;
  clearTimer('releaseTimer');
  clearTimer('safetyTimer');
  if (state.phase !== 'native-chooser-active') state.sequence += 1;
  state.activeControl = isNativeChooser(control) ? control : state.activeControl;
  state.quarantineUntil = now() + QUARANTINE_MS;
  state.pointerAction = null;
  state.pointerAt = 0;
  setPhase('native-chooser-quarantine', reason);
  const sequence = state.sequence;
  state.releaseTimer = globalThis.setTimeout(() => releaseToReady(sequence), QUARANTINE_MS + 40);
}

function blockNavigation(event, action, reason) {
  event?.preventDefault?.();
  event?.stopImmediatePropagation?.();
  state.blockedNavigations += 1;
  emit('gaokao:navigation-blocked', {
    sequence: state.sequence,
    target: action?.dataset?.uiNavigationTarget || '',
    reason,
    phase: state.phase,
    controlId: state.activeControl?.id || ''
  });
}

function rememberPhysicalStart(event) {
  const target = event.target;
  const stamp = now();
  if (state.lastPhysicalTarget === target && stamp - state.lastPhysicalAt < 48) return;
  state.lastPhysicalTarget = target;
  state.lastPhysicalAt = stamp;

  const control = closestElement(target, CONTROL_SELECTOR);
  if (isNativeChooser(control)) {
    enterNativeChooser(control, event.type);
    return;
  }

  const action = closestElement(target, NAVIGATION_SELECTOR);
  if (!action) return;
  if (state.phase !== 'ready' || action.disabled) {
    state.pointerAction = null;
    state.pointerAt = 0;
    blockNavigation(event, action, `navigation-start-during-${state.phase}`);
    return;
  }
  state.pointerAction = action;
  state.pointerAt = stamp;
}

function guardPhysicalEnd(event) {
  const action = closestElement(event.target, NAVIGATION_SELECTOR);
  if (!action) return;
  if (state.phase !== 'ready' || action.disabled) blockNavigation(event, action, `navigation-end-during-${state.phase}`);
}

function activateNavigation(event) {
  const action = closestElement(event.target, NAVIGATION_SELECTOR);
  if (!action) return;
  event.preventDefault();

  if (state.phase !== 'ready' || action.disabled) {
    blockNavigation(event, action, `navigation-click-during-${state.phase}`);
    return;
  }

  const keyboardActivation = Number(event.detail || 0) === 0 && document.activeElement === action;
  const pointerActivation = state.pointerAction === action && now() - state.pointerAt <= POINTER_ACTIVATION_MS;
  state.pointerAction = null;
  state.pointerAt = 0;

  if (!keyboardActivation && !pointerActivation) {
    blockNavigation(event, action, 'navigation-without-owned-activation');
    return;
  }

  const target = String(action.dataset.uiNavigationTarget || '').trim();
  if (!target) {
    blockNavigation(event, action, 'navigation-target-missing');
    return;
  }

  state.acceptedNavigations += 1;
  emit('gaokao:navigation-accepted', {
    sequence: state.sequence,
    target,
    activation: keyboardActivation ? 'keyboard' : 'pointer'
  });
  location.assign(target);
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

  document.addEventListener('gaokao:workspace-state', event => syncDisclosureMode(event.detail?.mode, 'workspace-state'));
  document.addEventListener('gaokao:result-mode-change', event => syncDisclosureMode(event.detail?.mode, 'result-mode-change'));
}

function bind() {
  document.addEventListener('pointerdown', rememberPhysicalStart, true);
  document.addEventListener('mousedown', rememberPhysicalStart, true);
  document.addEventListener('touchstart', rememberPhysicalStart, { capture: true, passive: false });
  document.addEventListener('pointerup', guardPhysicalEnd, true);
  document.addEventListener('mouseup', guardPhysicalEnd, true);
  document.addEventListener('touchend', guardPhysicalEnd, { capture: true, passive: false });

  document.addEventListener('focusin', event => {
    const control = closestElement(event.target, CONTROL_SELECTOR);
    if (isNativeChooser(control)) enterNativeChooser(control, 'focusin');
  }, true);
  document.addEventListener('focusout', event => {
    const control = closestElement(event.target, CONTROL_SELECTOR);
    if (isNativeChooser(control) && state.activeControl === control) beginQuarantine(control, 'focusout');
  }, true);
  document.addEventListener('change', event => {
    const control = closestElement(event.target, CONTROL_SELECTOR);
    if (isNativeChooser(control)) beginQuarantine(control, 'change');
  }, true);
  document.addEventListener('click', activateNavigation, true);

  globalThis.addEventListener('pagehide', () => {
    clearTimer('releaseTimer');
    clearTimer('safetyTimer');
    state.activeControl = null;
    state.quarantineUntil = 0;
    state.pointerAction = null;
  });
}

installDisclosureOwnership();
bind();
setPhase('ready', 'initialized');

globalThis.__GAOKAO_INTERACTION_TRANSACTION__ = Object.freeze({
  version: VERSION,
  contractVersion: LN_RANK_INTERACTION_RUNTIME_CONTRACT.version,
  disclosureId: DISCLOSURE_ID,
  getState: () => Object.freeze({
    sequence: state.sequence,
    phase: state.phase,
    phaseReason: state.phaseReason,
    settling: state.phase !== 'ready',
    activeControlId: state.activeControl?.id || '',
    quarantineRemainingMs: Math.max(0, Math.ceil(state.quarantineUntil - now())),
    blockedNavigations: state.blockedNavigations,
    acceptedNavigations: state.acceptedNavigations,
    disclosureOpen: Boolean(state.disclosure?.open),
    scoreDisclosureOpen: state.scoreDisclosureOpen,
    resultMode: state.resultMode,
    disclosureOwner: state.disclosure?.dataset.uiDisclosureOwner || '',
    auxiliaryNavigationOwner: VERSION
  })
});
