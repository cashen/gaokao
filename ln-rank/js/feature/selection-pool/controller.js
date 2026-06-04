import {
  addPoolItem,
  getPoolItems,
  getPoolStats,
  hasPoolItem,
  removePoolItem,
  movePoolItem
} from './store.js';

let mounted = false;
let latestState = null;
let onChanged = () => {};
let bumpUntil = 0;
let toastUntil = 0;
let toastText = '';
let toastTimer = null;

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
    return `./selection-pool.html?from=search&score=${encodeURIComponent(score)}`;
  }
  return './selection-pool.html?from=search';
}

function renderPoolEntry({ items, isBumped, variant = 'desktop' }) {
  const cls = variant === 'inline' ? 'pool-entry-inline' : 'pool-entry-direct pool-entry-desktop';
  const idAttr = variant === 'inline' ? '' : ' id="selectionPoolFab"';
  return `<a${idAttr} class="${cls} ${isBumped ? 'is-bumped' : ''}" href="${getPoolHref()}" aria-label="进入自选专业完整整理页">
      <span class="pool-fab-title">自选专业</span>
      <span class="pool-fab-count">${countLabel(items.length)}</span>
      ${variant === 'desktop' ? '<span class="pool-fab-sub">完整整理页</span>' : ''}
    </a>`;
}

function renderStickyBar(items, isBumped = false) {
  if (!items.length) return '';
  return `<div class="pool-result-sticky-bar ${isBumped ? 'is-pulsing' : ''}" role="status">
    <span>已选 <b>${countLabel(items.length)}</b> 个专业</span>
    <a href="${getPoolHref()}">去整理</a>
  </div>`;
}

function renderToast() {
  if (!toastText || Date.now() >= toastUntil) return '';
  return `<div class="pool-entry-toast" role="status">
    <span>${escapeHtml(toastText)}</span>
  </div>`;
}

function render() {
  const items = getPoolItems();
  getPoolStats(items);
  const isBumped = Date.now() < bumpUntil;

  const root = ensureShell();
  root.className = 'selection-pool-shell pool-entry-direct-shell';
  root.innerHTML = renderPoolEntry({ items, isBumped, variant: 'desktop' }) + renderToast();

  const inlineMount = getInlineMount();
  if (inlineMount) {
    inlineMount.className = 'pool-entry-inline-mount';
    inlineMount.innerHTML = renderPoolEntry({ items, isBumped, variant: 'inline' });
  }

  const stickyMount = getStickyMount();
  if (stickyMount) {
    stickyMount.innerHTML = renderStickyBar(items, isBumped);
  }
}

function showToast(message) {
  toastText = message || `已加入自选专业 · 共 ${getPoolItems().length} 个`;
  toastUntil = Date.now() + 2600;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => render(), 2700);
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
        bumpUntil = Date.now() + 1500;
        window.setTimeout(() => render(), 1550);
        showToast(`已加入自选专业 · 共 ${countLabel(count)} 个`);
        emitPoolUpdated({ action: 'add', count });
      }
      onChanged();
      render();
      return result;
    },
    remove(id) {
      const result = removePoolItem(id);
      emitPoolUpdated({ action: 'remove', count: getPoolItems().length });
      onChanged();
      render();
      return result;
    },
    move(id, direction) {
      const result = movePoolItem(id, direction);
      emitPoolUpdated({ action: 'move', count: getPoolItems().length });
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

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
