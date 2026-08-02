import { SITE_RUNTIME_CONTRACT } from '../../resources/release/site-runtime-contract.v3972_5.js?v=3972_5';

const VERSION = 'interaction-transaction-v3972_5';
const GENERATION = SITE_RUNTIME_CONTRACT.generation;
const CONTROL_SELECTOR = 'select,input,textarea,[contenteditable="true"]';
const NAVIGATION_SELECTOR = '[data-ui-navigation][data-ui-navigation-target]';
const LEGACY_DISCLOSURE_ID = 'familyConditionsDetails';
const DISCLOSURE_ID = 'familyConditionsDisclosure';
const MIN_TAIL_GUARD_MS = 900;
const MAX_STABILIZE_MS = 4200;
const POINTER_ACTIVATION_MS = 1800;
const ACTIVE_SAFETY_MS = 30000;
const REQUIRED_STABLE_FRAMES = Number(SITE_RUNTIME_CONTRACT.policies.nativeChooserRequiresStableFrames || 2);
const GEOMETRY_EPSILON = 0.75;

const state = {
  sequence: 0,
  phase: 'booting',
  phaseReason: 'booting',
  activeControl: null,
  transactionStartedAt: 0,
  minReleaseAt: 0,
  maxReleaseAt: 0,
  stableFrames: 0,
  lastLayoutSnapshot: null,
  rafId: 0,
  safetyTimer: 0,
  pointerAction: null,
  lastPhysicalTarget: null,
  lastPhysicalAt: 0,
  blockedNavigations: 0,
  acceptedNavigations: 0,
  disclosure: null,
  scoreDisclosureOpen: false,
  resultMode: 'score-bands',
  internalDisclosureChange: false,
  observer: null,
  readyResolvers: []
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
  document.dispatchEvent(new CustomEvent(name, {
    detail: Object.freeze({ version: VERSION, generation: GENERATION, ...detail })
  }));
}

function clearTimer(name) {
  if (!state[name]) return;
  globalThis.clearTimeout(state[name]);
  state[name] = 0;
}

function cancelFrame() {
  if (!state.rafId) return;
  globalThis.cancelAnimationFrame(state.rafId);
  state.rafId = 0;
}

function setBodyState() {
  const body = document.body;
  if (!body) return;
  body.dataset.uiInteractionVersion = VERSION;
  body.dataset.uiInteractionTransaction = state.phase;
  body.dataset.uiNavigationOwner = VERSION;
  body.dataset.siteRuntimeGeneration = GENERATION;
}

function setNavigationAvailability(enabled, reason) {
  const containers = new Set();
  for (const action of navigationActions()) {
    action.dataset.uiNavigationOwner = VERSION;
    action.dataset.uiNavigationEnabled = String(Boolean(enabled));
    action.disabled = !enabled;
    action.setAttribute('aria-disabled', String(!enabled));
    const container = navigationContainer(action);
    if (container) containers.add(container);
  }
  for (const container of containers) {
    container.dataset.uiNavigationOwner = VERSION;
    container.dataset.uiNavigationPhase = state.phase;
    container.dataset.uiNavigationReason = reason;
    container.toggleAttribute('inert', !enabled);
    if ('inert' in container) container.inert = !enabled;
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
    controlId: state.activeControl?.id || '',
    stableFrames: state.stableFrames
  });
  if (phase === 'ready') {
    const resolvers = state.readyResolvers.splice(0);
    for (const resolve of resolvers) resolve(getPublicState());
  }
}

function rounded(value) {
  return Math.round(Number(value || 0) * 4) / 4;
}

function rectSnapshot(selector) {
  const node = document.querySelector(selector);
  if (!(node instanceof Element)) return null;
  const rect = node.getBoundingClientRect();
  return {
    top: rounded(rect.top),
    left: rounded(rect.left),
    width: rounded(rect.width),
    height: rounded(rect.height)
  };
}

function layoutSnapshot() {
  const viewport = globalThis.visualViewport;
  const scrolling = document.scrollingElement || document.documentElement;
  return {
    scrollX: rounded(globalThis.scrollX),
    scrollY: rounded(globalThis.scrollY),
    scrollHeight: rounded(scrolling?.scrollHeight),
    scrollWidth: rounded(scrolling?.scrollWidth),
    viewportWidth: rounded(viewport?.width || globalThis.innerWidth),
    viewportHeight: rounded(viewport?.height || globalThis.innerHeight),
    viewportOffsetTop: rounded(viewport?.offsetTop || 0),
    viewportOffsetLeft: rounded(viewport?.offsetLeft || 0),
    viewportScale: rounded(viewport?.scale || 1),
    disclosure: rectSnapshot(`#${DISCLOSURE_ID}`),
    filterPanel: rectSnapshot('.ln-filter-panel'),
    mobileDirtyBar: rectSnapshot('#mobileDirtyBar'),
    resultsPanel: rectSnapshot('#resultsPanel'),
    auxiliaryEntry: rectSnapshot('.aux-background-entry')
  };
}

function nearlyEqual(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= GEOMETRY_EPSILON;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if (!nearlyEqual(a[key], b[key])) return false;
  return true;
}

function stopObserver() {
  state.observer?.disconnect?.();
  state.observer = null;
}

function markLayoutUnstable(reason = 'layout-change') {
  if (state.phase === 'ready' || state.phase === 'booting') return;
  state.stableFrames = 0;
  state.lastLayoutSnapshot = null;
  state.phaseReason = reason;
  scheduleStabilityFrame();
}

function startObserver() {
  stopObserver();
  const root = document.querySelector('.ln-page-shell') || document.body;
  if (!root || !globalThis.MutationObserver) return;
  state.observer = new MutationObserver(() => markLayoutUnstable('dom-mutation'));
  state.observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['hidden', 'open', 'class', 'style', 'aria-expanded', 'aria-busy']
  });
}

function releaseToReady(sequence, reason = 'layout-stable') {
  if (sequence !== state.sequence) return;
  cancelFrame();
  clearTimer('safetyTimer');
  stopObserver();
  state.activeControl = null;
  state.transactionStartedAt = 0;
  state.minReleaseAt = 0;
  state.maxReleaseAt = 0;
  state.stableFrames = 0;
  state.lastLayoutSnapshot = null;
  state.pointerAction = null;
  setPhase('ready', reason);
}

function stabilityFrame(sequence) {
  state.rafId = 0;
  if (sequence !== state.sequence || state.phase !== 'native-chooser-stabilizing') return;

  const stamp = now();
  const snapshot = layoutSnapshot();
  if (state.lastLayoutSnapshot && nearlyEqual(snapshot, state.lastLayoutSnapshot)) state.stableFrames += 1;
  else state.stableFrames = 0;
  state.lastLayoutSnapshot = snapshot;

  const minGuardComplete = stamp >= state.minReleaseAt;
  const layoutStable = state.stableFrames >= REQUIRED_STABLE_FRAMES;
  if (minGuardComplete && layoutStable) {
    releaseToReady(sequence, 'lifecycle-and-layout-stable');
    return;
  }
  if (stamp >= state.maxReleaseAt) {
    releaseToReady(sequence, 'bounded-stability-release');
    return;
  }
  scheduleStabilityFrame();
}

function scheduleStabilityFrame() {
  if (state.rafId || state.phase !== 'native-chooser-stabilizing') return;
  const sequence = state.sequence;
  state.rafId = globalThis.requestAnimationFrame(() => stabilityFrame(sequence));
}

function enterNativeChooser(control, reason) {
  if (!isNativeChooser(control)) return;
  cancelFrame();
  clearTimer('safetyTimer');
  stopObserver();
  if (state.phase === 'ready' || state.activeControl !== control) state.sequence += 1;
  state.activeControl = control;
  state.transactionStartedAt = now();
  state.minReleaseAt = 0;
  state.maxReleaseAt = 0;
  state.stableFrames = 0;
  state.lastLayoutSnapshot = null;
  state.pointerAction = null;
  setPhase('native-chooser-active', reason);
  const sequence = state.sequence;
  state.safetyTimer = globalThis.setTimeout(() => {
    if (sequence !== state.sequence || state.phase !== 'native-chooser-active') return;
    beginStabilization(control, 'native-chooser-safety-close');
  }, ACTIVE_SAFETY_MS);
}

function beginStabilization(control, reason) {
  if (!isNativeChooser(control) && state.phase === 'ready') return;
  clearTimer('safetyTimer');
  if (state.phase === 'ready') state.sequence += 1;
  state.activeControl = isNativeChooser(control) ? control : state.activeControl;
  const stamp = now();
  state.minReleaseAt = Math.max(state.minReleaseAt, stamp + MIN_TAIL_GUARD_MS);
  state.maxReleaseAt = Math.max(state.maxReleaseAt, stamp + MAX_STABILIZE_MS);
  state.stableFrames = 0;
  state.lastLayoutSnapshot = null;
  state.pointerAction = null;
  setPhase('native-chooser-stabilizing', reason);
  startObserver();
  scheduleStabilityFrame();
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
    blockNavigation(event, action, `navigation-start-during-${state.phase}`);
    return;
  }
  state.pointerAction = Object.freeze({
    action,
    at: stamp,
    pointerId: Number(event.pointerId || 0),
    eventType: event.type
  });
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
  const pointerActivation = state.pointerAction?.action === action && now() - state.pointerAction.at <= POINTER_ACTIVATION_MS;
  state.pointerAction = null;

  if (!keyboardActivation && !pointerActivation) {
    blockNavigation(event, action, 'navigation-without-owned-activation');
    return;
  }

  const target = String(action.dataset.uiNavigationTarget || '').trim();
  if (!target) {
    blockNavigation(event, action, 'navigation-target-missing');
    return;
  }

  let destination;
  try {
    destination = new URL(target, location.href);
  } catch {
    blockNavigation(event, action, 'navigation-target-invalid');
    return;
  }
  if (destination.origin !== location.origin) {
    blockNavigation(event, action, 'navigation-target-cross-origin');
    return;
  }

  state.acceptedNavigations += 1;
  emit('gaokao:navigation-accepted', {
    sequence: state.sequence,
    target: `${destination.pathname}${destination.search}${destination.hash}`,
    activation: keyboardActivation ? 'keyboard' : 'pointer'
  });
  location.assign(destination.href);
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
  const nextMode = mode === 'school-all' ? 'school-all' : 'score-bands';
  const previousMode = state.resultMode;
  const disclosure = state.disclosure;

  if (nextMode === previousMode) {
    if (nextMode === 'score-bands' && disclosure instanceof HTMLDetailsElement && !state.internalDisclosureChange) {
      state.scoreDisclosureOpen = disclosure.open;
    }
    return;
  }

  if (previousMode === 'score-bands' && disclosure instanceof HTMLDetailsElement) {
    state.scoreDisclosureOpen = disclosure.open;
  }
  state.resultMode = nextMode;
  if (nextMode === 'school-all') setDisclosureOpen(true, reason);
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
    markLayoutUnstable(`workspace-${event.detail?.reason || 'state'}`);
  });
  document.addEventListener('gaokao:result-mode-change', event => {
    syncDisclosureMode(event.detail?.mode, 'result-mode-change');
    markLayoutUnstable('result-mode-change');
  });
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
  document.addEventListener('input', event => {
    const control = closestElement(event.target, CONTROL_SELECTOR);
    if (isNativeChooser(control)) beginStabilization(control, 'input');
  }, true);
  document.addEventListener('change', event => {
    const control = closestElement(event.target, CONTROL_SELECTOR);
    if (isNativeChooser(control)) beginStabilization(control, 'change');
  }, true);
  document.addEventListener('focusout', event => {
    const control = closestElement(event.target, CONTROL_SELECTOR);
    if (isNativeChooser(control) && state.activeControl === control) beginStabilization(control, 'focusout');
  }, true);
  document.addEventListener('click', activateNavigation, true);

  globalThis.addEventListener('resize', () => markLayoutUnstable('window-resize'), true);
  globalThis.addEventListener('scroll', () => markLayoutUnstable('window-scroll'), true);
  globalThis.visualViewport?.addEventListener('resize', () => markLayoutUnstable('visual-viewport-resize'));
  globalThis.visualViewport?.addEventListener('scroll', () => markLayoutUnstable('visual-viewport-scroll'));

  globalThis.addEventListener('pagehide', () => {
    cancelFrame();
    clearTimer('safetyTimer');
    stopObserver();
    state.activeControl = null;
    state.pointerAction = null;
  });
}

function getPublicState() {
  return Object.freeze({
    sequence: state.sequence,
    phase: state.phase,
    phaseReason: state.phaseReason,
    settling: state.phase !== 'ready',
    activeControlId: state.activeControl?.id || '',
    minGuardRemainingMs: Math.max(0, Math.ceil(state.minReleaseAt - now())),
    stableFrames: state.stableFrames,
    requiredStableFrames: REQUIRED_STABLE_FRAMES,
    blockedNavigations: state.blockedNavigations,
    acceptedNavigations: state.acceptedNavigations,
    disclosureOpen: Boolean(state.disclosure?.open),
    scoreDisclosureOpen: state.scoreDisclosureOpen,
    resultMode: state.resultMode,
    disclosureOwner: state.disclosure?.dataset.uiDisclosureOwner || '',
    auxiliaryNavigationOwner: VERSION,
    generation: GENERATION
  });
}

installDisclosureOwnership();
bind();
setPhase('ready', 'initialized');

globalThis.__GAOKAO_INTERACTION_TRANSACTION__ = Object.freeze({
  version: VERSION,
  generation: GENERATION,
  contractVersion: SITE_RUNTIME_CONTRACT.version,
  disclosureId: DISCLOSURE_ID,
  getState: getPublicState,
  waitUntilReady: () => state.phase === 'ready'
    ? Promise.resolve(getPublicState())
    : new Promise(resolve => state.readyResolvers.push(resolve))
});
