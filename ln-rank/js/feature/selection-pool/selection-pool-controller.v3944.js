import {
  addPoolItem,
  getPoolItems,
  getPoolStats,
  hasPoolItem,
  removePoolItem,
  movePoolItem
} from './selection-pool-store.v3944.js';

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
  root.className = 'selection-pool-shell selection-pool-shell-direct';
  document.body.appendChild(root);
  return root;
}

function getPoolHref() {
  return './selection-pool.html';
}

function render() {
  const root = ensureShell();
  const items = getPoolItems();
  const stats = getPoolStats(items);
  const isBumped = Date.now() < bumpUntil;
  const showToast = toastText && Date.now() < toastUntil;

  root.className = 'selection-pool-shell selection-pool-shell-direct';
  root.innerHTML = `<a id="selectionPoolFab" class="selection-pool-fab direct-pool-entry ${isBumped ? 'is-bumped' : ''}" href="${getPoolHref()}" aria-label="进入自选池完整整理页">
      <span class="pool-fab-title">自选池</span>
      <span class="pool-fab-count">${countLabel(items.length)}</span>
      <span class="pool-fab-sub">完整整理</span>
    </a>
    ${showToast ? `<div class="pool-entry-toast">${escapeHtml(toastText)}</div>` : ''}`;
}

function showToast(message) {
  toastText = message || '已加入自选池，点右侧进入完整整理。';
  toastUntil = Date.now() + 2200;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => render(), 2300);
}

export function initSelectionPool(state, options = {}) {
  latestState = state || latestState;
  onChanged = typeof options.onChanged === 'function' ? options.onChanged : onChanged;
  if (!mounted) {
    mounted = true;
    window.addEventListener('lnrank-selection-pool-updated', () => render());
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
        bumpUntil = Date.now() + 520;
        showToast(result.message || '已加入自选池，点右侧进入完整整理。');
      }
      onChanged();
      render();
      return result;
    },
    remove(id) {
      const result = removePoolItem(id);
      onChanged();
      render();
      return result;
    },
    move(id, direction) {
      const result = movePoolItem(id, direction);
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
