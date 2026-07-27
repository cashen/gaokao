import {
  addPoolItem,
  getPoolItems,
  getPoolStats,
  hasPoolItem,
  removePoolItem,
  movePoolItem
} from './store.v3967_0.js?v=3967_0';
import { REPORT_COPY } from '../../domain/human-copy-dictionary.js?v=3961_0';

let mounted = false;
let latestState = null;
let onChanged = () => {};

function countLabel(count) {
  if (count <= 0) return '0';
  return count > 99 ? '99+' : String(count);
}

function getStaticShell() {
  return document.getElementById('selectionPoolShell');
}

function getPoolHref() {
  const score = latestState?.candidateScore;
  if (score && Number.isFinite(Number(score))) {
    return `./selection-pool.html?from=search&score=${encodeURIComponent(score)}#selected-list`;
  }
  return './selection-pool.html?from=search#selected-list';
}

function renderPoolEntry({ items, variant = 'desktop' }) {
  const cls = variant === 'inline' ? 'pool-entry-inline' : 'pool-entry-direct pool-entry-desktop';
  const idAttr = variant === 'inline' ? '' : ' id="selectionPoolFab"';
  return `<a${idAttr} class="${cls}" href="${getPoolHref()}" aria-label="进入已选专业清单">
      <span class="pool-fab-title">${REPORT_COPY.selectedCount(countLabel(items.length))}</span>
      ${variant === 'desktop' ? '<span class="pool-fab-sub">整理与复核</span>' : ''}
    </a>`;
}

function render() {
  const items = getPoolItems();
  getPoolStats(items);
  const root = getStaticShell();
  if (!root) return;
  root.className = 'selection-pool-shell pool-entry-direct-shell';
  root.innerHTML = renderPoolEntry({ items, variant: 'desktop' });

  const inlineMount = document.getElementById('poolEntryInlineMount');
  if (inlineMount) {
    inlineMount.className = 'pool-entry-inline-mount';
    inlineMount.innerHTML = renderPoolEntry({ items, variant: 'inline' });
  }
  const stickyMount = document.getElementById('poolResultStickyMount');
  if (stickyMount) stickyMount.innerHTML = '';
}

function emitSelectionChanged(detail = {}) {
  const payload = Object.freeze({ ...detail, count: getPoolItems().length, quiet: true });
  window.dispatchEvent(new CustomEvent('gaokao:selection-change', { detail: payload }));
  window.dispatchEvent(new CustomEvent('lnrank-selection-pool-updated', { detail: payload }));
}

function commitChange(detail) {
  render();
  emitSelectionChanged(detail);
  onChanged(detail);
}

export function initSelectionPool(state, options = {}) {
  latestState = state || latestState;
  onChanged = typeof options.onChanged === 'function' ? options.onChanged : onChanged;
  if (!mounted) {
    mounted = true;
    window.addEventListener('storage', render);
  }
  render();
}

export function refreshSelectionPool(state) {
  latestState = state || latestState;
  render();
}

export function createSelectionPoolAdapter() {
  return {
    has: hasPoolItem,
    add(record) {
      const result = addPoolItem(record);
      if (result.ok) {
        commitChange({ action: 'add', id: record?.id || '' });
      }
      return result;
    },
    remove(id) {
      const result = removePoolItem(id);
      if (result.ok !== false) commitChange({ action: 'remove', id });
      return result;
    },
    move(id, direction) {
      const result = movePoolItem(id, direction);
      if (result.ok !== false) commitChange({ action: 'move', id, direction });
      return result;
    },
    items: getPoolItems,
    stats: getPoolStats,
    open() { window.location.href = getPoolHref(); },
    close() {}
  };
}
