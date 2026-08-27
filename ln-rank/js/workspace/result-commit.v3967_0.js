import { presentFamilyResults } from './family-card-presenter.v3967_0.js?v=3967_0&r=r032-input-clear-state';
import {
  createScrollSnapshot,
  preserveScrollSnapshot,
  scrollToExplicitTarget
} from './scroll-policy.v3961_0.js?v=3961_0';

let commitSequence = 0;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function insertAfter(reference, node) {
  if (!reference?.parentNode || !node) return;
  reference.parentNode.insertBefore(node, reference.nextSibling);
}

function ensureStatusSlot(root) {
  let slot = root.querySelector(':scope > [data-result-slot="status"]');
  if (slot) return slot;
  slot = document.createElement('div');
  slot.className = 'ln-result-workspace-status';
  slot.dataset.resultSlot = 'status';
  root.prepend(slot);
  return slot;
}

function renderStatus(slot, context) {
  const { dirty, requestLoading, updateError, committedSummary } = context;
  if (requestLoading && context.hasPreviousResult) {
    slot.hidden = false;
    slot.removeAttribute('aria-hidden');
    slot.className = 'ln-result-workspace-status is-updating';
    slot.innerHTML = '<b>正在按新条件更新</b><span>下面暂时保留上一轮结果，更新完成后会一次替换。</span>';
    return;
  }
  if (updateError && context.hasPreviousResult) {
    slot.hidden = false;
    slot.removeAttribute('aria-hidden');
    slot.className = 'ln-result-workspace-status is-error';
    slot.innerHTML = `<b>这次更新没有成功</b><span>下面仍保留上一轮结果。${escapeHtml(updateError)}</span>`;
    return;
  }
  if (dirty && context.hasPreviousResult) {
    slot.hidden = false;
    slot.removeAttribute('aria-hidden');
    slot.className = 'ln-result-workspace-status is-stale';
    slot.innerHTML = `<b>条件已变化</b><span>下面仍显示上一轮结果${committedSummary ? `：${escapeHtml(committedSummary)}` : ''}。点击“更新结果”后再按新条件整理。</span>`;
    return;
  }
  if (context.hasPreviousResult) {
    slot.hidden = false;
    slot.className = 'ln-result-workspace-status is-idle';
    slot.setAttribute('aria-hidden', 'true');
    slot.innerHTML = '<b>当前结果</b><span>已按当前条件整理。</span>';
    return;
  }
  slot.hidden = true;
  slot.className = 'ln-result-workspace-status';
  slot.removeAttribute('aria-hidden');
  slot.textContent = '';
}

function ensureCompareSlot(root, state) {
  const tabs = root.querySelector(':scope > .result-view-tabs');
  const contextBar = root.querySelector(':scope > .result-context-bar');
  let panel = root.querySelector(':scope > .natural-compare-panel');
  if (!panel && state?.bands?.data && !state?.bands?.loading && !state?.bands?.error) {
    panel = document.createElement('section');
    panel.className = 'natural-compare-panel is-compact is-empty workspace-compare-slot';
    panel.setAttribute('aria-label', '同校与同专业比较');
    panel.innerHTML = '<div class="natural-compare-head"><span>同校 / 同专业比较</span><p>当前分段暂时没有直接可比较的组合。</p></div>';
  }
  if (!panel) return null;
  panel.classList.add('workspace-compare-slot');
  const anchor = tabs || contextBar;
  if (anchor) insertAfter(anchor, panel);
  else root.prepend(panel);
  return panel;
}

function orderAssistAfterCompare(root, comparePanel) {
  const assist = root.querySelector(':scope > .result-assist-details');
  if (!assist) return;
  const anchor = comparePanel || root.querySelector(':scope > .result-view-tabs') || root.querySelector(':scope > .result-context-bar');
  if (anchor) insertAfter(anchor, assist);
}

function markStableCards(root) {
  root.querySelectorAll('.major-card').forEach((card, index) => {
    const school = card.querySelector('.school')?.textContent?.trim() || '';
    const major = card.querySelector('.major')?.childNodes?.[0]?.textContent?.trim() || card.querySelector('.major')?.textContent?.trim() || '';
    const score = card.querySelector('.meta-pill')?.textContent?.trim() || '';
    card.dataset.workspaceRecordKey = [school, major, score, index].join('|').replace(/\s+/g, ' ').slice(0, 240);
  });
}

function announceCommit(root, context) {
  document.dispatchEvent(new CustomEvent('gaokao:results-committed', {
    detail: Object.freeze({
      commitId: context.commitId,
      reason: context.reason,
      activeBand: context.state?.activeBand || '',
      dirty: Boolean(context.dirty),
      cardCount: root.querySelectorAll('.major-card').length
    })
  }));
}

export function finalizeResultCommit(root, context) {
  if (!(root instanceof HTMLElement)) return;
  commitSequence += 1;
  const commitId = commitSequence;
  const nextContext = { ...context, commitId };
  const status = ensureStatusSlot(root);
  renderStatus(status, nextContext);
  const comparePanel = ensureCompareSlot(root, context.state);
  orderAssistAfterCompare(root, comparePanel);
  presentFamilyResults(root);
  markStableCards(root);
  root.dataset.workspaceCommit = String(commitId);
  root.dataset.workspaceReason = context.reason || 'render';
  root.removeAttribute('data-workspace-committing');
  announceCommit(root, nextContext);
}


export function updateResultWorkspaceStatus({
  dirty = false,
  requestLoading = false,
  updateError = '',
  committedSummary = '',
  reason = 'status-only'
} = {}) {
  const root = document.getElementById('results');
  if (!(root instanceof HTMLElement)) return;
  const status = ensureStatusSlot(root);
  renderStatus(status, {
    dirty,
    requestLoading,
    updateError,
    committedSummary,
    hasPreviousResult: Boolean(root.querySelector('.major-card, .result-context-bar'))
  });
  root.dataset.workspaceReason = reason;
  document.dispatchEvent(new CustomEvent('gaokao:results-status', {
    detail: Object.freeze({ reason, dirty, requestLoading, updateError: Boolean(updateError) })
  }));
}

export function commitMajorResults({
  renderMajorResults,
  state,
  options,
  dirty = false,
  requestLoading = false,
  updateError = '',
  committedSummary = '',
  reason = 'render',
  preserveScroll = false
}) {
  const root = document.getElementById('results');
  if (!root || typeof renderMajorResults !== 'function') return;
  const snapshot = preserveScroll ? createScrollSnapshot() : null;
  root.dataset.workspaceCommitting = 'true';
  root.__workspaceCommitContext = {
    state,
    options,
    dirty,
    requestLoading,
    updateError,
    committedSummary,
    hasPreviousResult: Boolean(state?.bands?.data),
    reason
  };
  renderMajorResults(state, options);
  finalizeResultCommit(root, root.__workspaceCommitContext);
  if (snapshot) preserveScrollSnapshot(snapshot);
}

export function bindResultCommitBridge(root = document.getElementById('results')) {
  if (!(root instanceof HTMLElement) || root.__workspaceCommitBridgeBound) return;
  root.__workspaceCommitBridgeBound = true;
  root.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const compare = target.closest('[data-compare-action]');
    const view = target.closest('[data-result-view]');
    if (!compare && !view) return;
    const shouldNavigateCompare = Boolean(compare && ['open', 'group', 'chip', 'more'].includes(compare.dataset.compareAction || ''));
    queueMicrotask(() => {
      const context = root.__workspaceCommitContext;
      if (!context) return;
      finalizeResultCommit(root, { ...context, reason: compare ? 'compare-interaction' : 'result-view-interaction' });
      if (shouldNavigateCompare) {
        requestAnimationFrame(() => {
          const panel = root.querySelector('.workspace-compare-slot');
          if (panel) scrollToExplicitTarget(panel);
        });
      }
    });
  }, true);
}

export const RESULT_COMMIT_VERSION = 'result-commit-v3967_0';
