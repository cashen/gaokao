import {
  addPoolItem,
  getPoolItems,
  getPoolStats,
  hasPoolItem,
  removePoolItem,
  movePoolItem
} from './store.js?v=3960_0';
import { REPORT_COPY } from '../../domain/human-copy-dictionary.js?v=3960_0';

let mounted = false;
let latestState = null;
let onChanged = () => {};
let bumpUntil = 0;

function countLabel(count) {
  if (count <= 0) return '0';
  return count > 99 ? '99+' : String(count);
}

function ensureShell() {
  let root = document.getElementById('selectionPoolShell');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'selectionPoolShell';
  root.className = 'selection-pool-shell pool-entry-direct-shell';
  document.body.appendChild(root);
  return root;
}

function getInlineMount() {
  return document.getElementById('poolEntryInlineMount');
}

function getStickyMount() {
  return document.getElementById('poolResultStickyMount');
}

function getPoolHref() {
  const score = latestState?.candidateScore;
  if (score && Number.isFinite(Number(score))) {
    return `./selection-pool.html?from=search&score=${encodeURIComponent(score)}#selected-list`;
  }
  return './selection-pool.html?from=search#selected-list';
}

function renderPoolEntry({ items, isBumped, variant = 'desktop' }) {
  const cls = variant === 'inline' ? 'pool-entry-inline' : 'pool-entry-direct pool-entry-desktop';
  const idAttr = variant === 'inline' ? '' : ' id="selectionPoolFab"';
  return `<a${idAttr} class="${cls} ${isBumped ? 'is-bumped' : ''}" href="${getPoolHref()}" aria-label="进入已选专业清单">
      <span class="pool-fab-title">${REPORT_COPY.selectedCount(countLabel(items.length))}</span>
      ${variant === 'desktop' ? '<span class="pool-fab-sub">整理与复核</span>' : ''}
    </a>`;
}

function render() {
  const items = getPoolItems();
  getPoolStats(items);
  const isBumped = Date.now() < bumpUntil;

  const root = ensureShell();
  root.className = 'selection-pool-shell pool-entry-direct-shell';
  root.innerHTML = renderPoolEntry({ items, isBumped, variant: 'desktop' });

  const inlineMount = getInlineMount();
  if (inlineMount) {
    inlineMount.className = 'pool-entry-inline-mount';
    inlineMount.innerHTML = renderPoolEntry({ items, isBumped, variant: 'inline' });
  }

  const stickyMount = getStickyMount();
  if (stickyMount) stickyMount.innerHTML = '';
}

function emitPoolUpdated(detail = {}) {
  window.dispatchEvent(new CustomEvent('lnrank:pool-updated', { detail }));
  window.dispatchEvent(new CustomEvent('lnrank-selection-pool-updated', { detail }));
}

export function initSelectionPool(state, options = {}) {
  latestState = state || latestState;
  onChanged = typeof options.onChanged === 'function' ? options.onChanged : onChanged;
  if (!mounted) {
    mounted = true;
    window.addEventListener('lnrank-selection-pool-updated', () => render());
    window.addEventListener('lnrank:pool-updated', () => render());
    window.addEventListener('storage', () => render());
    window.addEventListener('resize', () => render());
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
        const count = getPoolItems().length;
        bumpUntil = Date.now() + 760;
        window.setTimeout(() => render(), 800);
        emitPoolUpdated({ action: 'add', count, quiet: true });
      }
      onChanged();
      render();
      return result;
    },
    remove(id) {
      const result = removePoolItem(id);
      emitPoolUpdated({ action: 'remove', count: getPoolItems().length, quiet: true });
      onChanged();
      render();
      return result;
    },
    move(id, direction) {
      const result = movePoolItem(id, direction);
      emitPoolUpdated({ action: 'move', count: getPoolItems().length, quiet: true });
      onChanged();
      render();
      return result;
    },
    items: getPoolItems,
    stats: getPoolStats,
    open() { window.location.href = getPoolHref(); },
    close() {}
  };
}
