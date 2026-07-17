/* v3.9.49.4 multi-terminal human journey protection layer.
   Additive only: it observes existing UI, protects scroll/focus and improves
   mobile browser behavior without replacing ranking, selection or report logic. */

const UX_VERSION = 'v3949_4';
const root = document.documentElement;
const body = document.body;
const isAndroid = /Android/i.test(navigator.userAgent || '');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cssEscape = globalThis.CSS?.escape || ((value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&'));

let resultObserver = null;
let reportObserver = null;
let compareHistoryPushed = false;
let ignoreNextComparePop = false;
let mutationQueued = false;
let lastScopeAnnouncement = '';

const pending = {
  query: false,
  anchorKey: '',
  anchorTop: 0,
  focusSelector: '',
  reportButton: null
};

function announce(message) {
  const live = document.getElementById('lnV39494Live');
  if (!live || !message) return;
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = String(message); });
}

function ensureLiveRegion() {
  if (document.getElementById('lnV39494Live')) return;
  const live = document.createElement('div');
  live.id = 'lnV39494Live';
  live.className = 'ln-v39494-live-region';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  body.appendChild(live);
}

function updateViewportContract() {
  const viewport = visualViewport;
  const height = Math.round(viewport?.height || innerHeight || 0);
  if (height) root.style.setProperty('--ln-v39494-visual-height', `${height}px`);
  body.classList.toggle('is-android-device', isAndroid);
  const keyboardOpen = Boolean(viewport && innerHeight && viewport.height < innerHeight * 0.78);
  body.classList.toggle('is-keyboard-open', keyboardOpen);
  body.dataset.uxViewport = innerWidth <= 390
    ? 'phone-375'
    : innerWidth < 768
      ? 'phone'
      : innerWidth <= 1180
        ? 'tablet-landscape'
        : 'desktop-wide';
  body.dataset.uxVersion = UX_VERSION;
}

function normalizedCardKey(card, index = 0) {
  const school = card.querySelector('.school')?.textContent?.trim() || '';
  const major = card.querySelector('.major')?.textContent?.trim() || '';
  const score = card.querySelector('.meta-pill')?.textContent?.trim() || '';
  return [school, major, score, index].join('|').replace(/\s+/g, ' ').slice(0, 220);
}

function markStableCards(results) {
  results?.querySelectorAll('.major-card').forEach((card, index) => {
    card.dataset.uxRecordKey = normalizedCardKey(card, index);
  });
}

function recordMoreAnchor(button) {
  const results = button?.closest?.('#results');
  if (!results) return;
  markStableCards(results);
  const cards = [...results.querySelectorAll('.major-card')];
  const anchor = cards.at(-1);
  if (!anchor) return;
  pending.anchorKey = anchor.dataset.uxRecordKey || '';
  pending.anchorTop = anchor.getBoundingClientRect().top;
}

function restoreMoreAnchor(results) {
  if (!pending.anchorKey) return;
  const selector = `[data-ux-record-key="${cssEscape(pending.anchorKey)}"]`;
  const anchor = results.querySelector(selector);
  if (anchor) {
    const delta = anchor.getBoundingClientRect().top - pending.anchorTop;
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
  }
  pending.anchorKey = '';
  pending.anchorTop = 0;
}

function resultReady(results) {
  if (!results) return false;
  if (results.classList.contains('loading')) return false;
  return Boolean(results.querySelector('.result-context-bar, .major-card, .api-error-card, .stale-result-card, .empty'));
}

function finishQueryJourney(results) {
  if (!pending.query || !resultReady(results)) return;
  pending.query = false;
  const queryButton = document.getElementById('queryButton');
  queryButton?.removeAttribute('aria-busy');
  const panel = document.getElementById('resultsPanel');
  panel?.querySelector('.results-head')?.scrollIntoView({
    block: 'start',
    behavior: reducedMotion ? 'auto' : 'smooth'
  });
}

function restoreFocus(results) {
  if (!pending.focusSelector) return;
  const target = results.querySelector(pending.focusSelector);
  pending.focusSelector = '';
  if (!target) return;
  try { target.focus({ preventScroll: true }); } catch { target.focus(); }
}

function enhanceResultControls(results) {
  markStableCards(results);
  results.querySelectorAll('.more-button').forEach((button) => {
    button.setAttribute('aria-live', 'polite');
    if (/正在加载/.test(button.textContent || '') && button.getAttribute('aria-busy') !== 'true') {
      button.setAttribute('aria-busy', 'true');
    }
  });
  results.querySelectorAll('.natural-compare-panel').forEach((panel) => panel.setAttribute('tabindex', '-1'));
  results.querySelectorAll('.major-card').forEach((card) => card.setAttribute('data-human-journey-card', 'true'));
}

function announceScope(results) {
  const scope = results.querySelector('.result-context-scope')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
  if (!scope || scope === lastScopeAnnouncement) return;
  lastScopeAnnouncement = scope;
  announce(scope);
}

function afterResultMutation() {
  mutationQueued = false;
  const results = document.getElementById('results');
  if (!results) return;
  enhanceResultControls(results);
  restoreMoreAnchor(results);
  finishQueryJourney(results);
  restoreFocus(results);
  announceScope(results);
}

function queueResultMutation() {
  if (mutationQueued) return;
  mutationQueued = true;
  requestAnimationFrame(afterResultMutation);
}

function compareSelector(button) {
  const action = button.dataset.compareAction || '';
  const type = button.dataset.compareType || '';
  const key = button.dataset.compareKey || '';
  let selector = `[data-compare-action="${cssEscape(action)}"]`;
  if (type) selector += `[data-compare-type="${cssEscape(type)}"]`;
  if (key) selector += `[data-compare-key="${cssEscape(key)}"]`;
  return selector;
}

function pushCompareHistory() {
  if (compareHistoryPushed) return;
  history.pushState({ ...(history.state || {}), lnRankCompareLayer: true }, '', location.href);
  compareHistoryPushed = true;
}

function closeCompareFromHistory() {
  const close = document.querySelector('#results [data-compare-action="close"]');
  compareHistoryPushed = false;
  if (close) close.click();
}

function setBusyAfterCurrentClick(button, message) {
  queueMicrotask(() => {
    if (!button?.isConnected) return;
    button.setAttribute('aria-busy', 'true');
    announce(message);
  });
}

function handleJourneyClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const more = target.closest('.more-button[data-more]');
  if (more) {
    if (more.disabled || more.getAttribute('aria-busy') === 'true') {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    recordMoreAnchor(more);
    setBusyAfterCurrentClick(more, '正在准备下一批专业，当前阅读位置会保留。');
    return;
  }

  const query = target.closest('#queryButton');
  if (query) {
    if (query.getAttribute('aria-busy') === 'true') {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    pending.query = true;
    setBusyAfterCurrentClick(query, '正在按当前分数和条件查看专业。');
    return;
  }

  const compare = target.closest('#results [data-compare-action]');
  if (compare) {
    const action = compare.dataset.compareAction || '';
    const compareAlreadyOpen = Boolean(document.querySelector('#results [data-compare-action="close"]'));
    if ((action === 'open' || action === 'chip') && !compareAlreadyOpen) pushCompareHistory();
    if (action === 'group' || action === 'chip' || action === 'more') pending.focusSelector = compareSelector(compare);
    if (action === 'close' && compareHistoryPushed) {
      ignoreNextComparePop = true;
      compareHistoryPushed = false;
      setTimeout(() => history.back(), 0);
    }
    return;
  }

  const view = target.closest('#results [data-result-view]');
  if (view) {
    pending.focusSelector = `[data-result-view="${cssEscape(view.dataset.resultView || 'all')}"]`;
    return;
  }

  const pool = target.closest('#results [data-pool-index]');
  if (pool) {
    setTimeout(() => {
      const hint = pool.closest('.major-card')?.querySelector('.pool-add-hint')?.textContent?.trim();
      announce(hint || '已处理自选专业。');
    }, 0);
    return;
  }

  const report = target.closest('#sendAnalyzedPool, #sendSelectionPool, #runAnalysis');
  if (report) {
    if (report.getAttribute('aria-busy') === 'true') {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    pending.reportButton = report;
    setBusyAfterCurrentClick(report, report.id === 'runAnalysis' ? '正在检查当前方案结构。' : '正在生成报告，请保留当前页面。');
    setTimeout(() => {
      if (pending.reportButton !== report) return;
      report.removeAttribute('aria-busy');
      pending.reportButton = null;
    }, 15000);
  }
}

function keepFocusedControlVisible(event) {
  if (!isAndroid) return;
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target?.matches('input, select, textarea')) return;
  setTimeout(() => {
    const viewport = visualViewport;
    if (!viewport) return;
    const rect = target.getBoundingClientRect();
    const visibleBottom = viewport.offsetTop + viewport.height - 16;
    if (rect.bottom > visibleBottom || rect.top < viewport.offsetTop + 8) {
      target.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, 180);
}

function installResultObserver() {
  const results = document.getElementById('results');
  if (!results) return;
  resultObserver?.disconnect();
  resultObserver = new MutationObserver(queueResultMutation);
  resultObserver.observe(results, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'disabled', 'aria-busy'] });
  afterResultMutation();
}

function installReportObserver() {
  const status = document.getElementById('feishuSelectionStatus');
  if (!status) return;
  reportObserver?.disconnect();
  reportObserver = new MutationObserver(() => {
    const text = status.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    if (text) announce(text);
    if (pending.reportButton && text) {
      pending.reportButton.removeAttribute('aria-busy');
      pending.reportButton = null;
    }
  });
  reportObserver.observe(status, { childList: true, subtree: true, characterData: true });
}

function installAndroidBackContract() {
  addEventListener('popstate', () => {
    if (ignoreNextComparePop) {
      ignoreNextComparePop = false;
      return;
    }
    if (compareHistoryPushed || document.querySelector('#results [data-compare-action="close"]')) {
      closeCompareFromHistory();
    }
  });
}

function installKeyboardEscapeContract() {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const compareClose = document.querySelector('#results [data-compare-action="close"]');
    if (compareClose) {
      event.preventDefault();
      compareClose.click();
      return;
    }
    const expanded = document.querySelector('#results [aria-expanded="true"][data-result-context-toggle], #results [aria-expanded="true"][data-major-understanding-toggle], #results [aria-expanded="true"][data-local-strength-toggle], #results [aria-expanded="true"][data-review-points-toggle]');
    expanded?.click();
  });
}

function boot() {
  ensureLiveRegion();
  updateViewportContract();
  installResultObserver();
  installReportObserver();
  installAndroidBackContract();
  installKeyboardEscapeContract();
  document.addEventListener('click', handleJourneyClick, true);
  document.addEventListener('focusin', keepFocusedControlVisible, true);
  addEventListener('resize', updateViewportContract, { passive: true });
  visualViewport?.addEventListener('resize', updateViewportContract, { passive: true });
  visualViewport?.addEventListener('scroll', updateViewportContract, { passive: true });
  addEventListener('pageshow', () => {
    updateViewportContract();
    installResultObserver();
    installReportObserver();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
