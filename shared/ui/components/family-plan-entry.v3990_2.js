import { buildFamilyStatus } from '../../../ln-rank/js/domain/family-decision-contract.v3970_0.js?v=3970_0';
import { FAMILY_PLAN_COPY } from '../contracts/copy-contract.v3970_0.js?v=3970_0';

export const FAMILY_PLAN_ENTRY_VERSION = 'family-plan-entry-v3990_2';

let mounted = false;
let scheduled = false;
let lastCount = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function poolHref() {
  return '/ln-rank/selection-pool.html#selected-list';
}

function renderHeader(count) {
  const root = document.querySelector('[data-ui-family-plan-header-mount]');
  if (!root) return;
  if (count <= 0) {
    root.replaceChildren();
    root.hidden = true;
    return;
  }
  root.hidden = false;
  const current = document.body?.dataset?.uiPage === 'selected' ? ' aria-current="page"' : '';
  root.innerHTML = `<a class="ui-family-plan-entry ui-family-plan-entry--header" href="${poolHref()}"${current}>
    <span>${escapeHtml(FAMILY_PLAN_COPY.header(count))}</span>
  </a>`;
}

function renderFooter(count) {
  const root = document.querySelector('[data-ui-family-plan-results-footer]');
  if (!root) return;
  if (count <= 0) {
    root.replaceChildren();
    root.hidden = true;
    return;
  }
  root.hidden = false;
  root.innerHTML = `<section class="ui-family-plan-entry ui-family-plan-entry--results-footer" aria-label="家庭方案入口">
    <div class="ui-family-plan-entry__copy">
      <strong>${escapeHtml(FAMILY_PLAN_COPY.footerTitle(count))}</strong>
      <span>${escapeHtml(FAMILY_PLAN_COPY.footerHint)}</span>
    </div>
    <a class="ui-family-plan-entry__action" href="${poolHref()}">${escapeHtml(FAMILY_PLAN_COPY.view(count))}</a>
  </section>`;
}

function announce(action, count) {
  const root = document.querySelector('[data-ui-family-plan-live]');
  if (!root || lastCount === null || lastCount === count) return;
  if (action === 'add') root.textContent = FAMILY_PLAN_COPY.liveAdded(count);
  else if (action === 'remove') root.textContent = FAMILY_PLAN_COPY.liveRemoved(count);
  else root.textContent = '';
}

function render(action = '') {
  scheduled = false;
  const status = buildFamilyStatus();
  renderHeader(status.selectedCount);
  renderFooter(status.selectedCount);
  announce(action, status.selectedCount);
  lastCount = status.selectedCount;
  document.documentElement.dataset.familyPlanCount = String(status.selectedCount);
}

function schedule(action = '') {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => render(action));
}

function onSelectionChange(event) {
  schedule(String(event?.detail?.action || ''));
}

export function refreshFamilyPlanEntry() {
  schedule();
}

export function mountFamilyPlanEntry() {
  if (mounted || typeof document === 'undefined') return;
  mounted = true;
  window.addEventListener('storage', () => schedule('storage'));
  window.addEventListener('gaokao:selection-change', onSelectionChange);
  document.addEventListener('lnrank-query-completed', () => schedule('query'));
  render();
  globalThis.__GAOKAO_FAMILY_PLAN_ENTRY__ = Object.freeze({
    version: FAMILY_PLAN_ENTRY_VERSION,
    generation: 'v3990_2',
    refresh: refreshFamilyPlanEntry
  });
}

