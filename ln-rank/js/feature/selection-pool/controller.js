import {
  addPoolItem,
  getPoolItems,
  getPoolStats,
  hasPoolItem,
  removePoolItem,
  movePoolItem
} from './store.js?v=3933_13';
import { REPORT_COPY } from '../../domain/human-copy-dictionary.js?v=3933_13';

let mounted = false;
let latestState = null;
let onChanged = () => {};
let bumpUntil = 0;
let toastUntil = 0;
let toastState = { visible: false, kind: 'add', title: '', detail: '', count: 0, href: '', until: 0 };
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
  return `<a${idAttr} class="${cls} ${isBumped ? 'is-bumped' : ''}" href="${getPoolHref()}" aria-label="进入生成报告前确认页">
      <span class="pool-fab-title">${REPORT_COPY.selectedCount(countLabel(items.length))}</span>
      ${variant === 'desktop' ? '<span class="pool-fab-sub">生成报告</span>' : ''}
    </a>`;
}

function renderStickyBar(items, isBumped = false) {
  if (!items.length) return '';
  return `<div class="pool-result-sticky-bar ${isBumped ? 'is-pulsing' : ''}" role="status">
    <span>已选 <b>${countLabel(items.length)}</b> 个专业</span>
    <a href="${getPoolHref()}">生成报告</a>
  </div>`;
}

function renderToast() {
  if (!toastState.visible || Date.now() >= toastState.until) return '';
  const href = toastState.href || getPoolHref();
  const cls = toastState.kind === 'warn' ? ' is-warn' : '';
  return `<div class="pool-entry-toast pool-entry-action-toast${cls}" role="status" aria-live="polite">
    <div class="pool-entry-toast-copy">
      <b>${escapeHtml(toastState.title || REPORT_COPY.added)}</b>
      <span>${escapeHtml(toastState.detail || '可以继续添加，也可以先生成一份给家里看')}</span>
    </div>
    <a class="pool-entry-toast-action" href="${escapeHtml(href)}">${REPORT_COPY.generate}</a>
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

function showActionToast(options = {}) {
  const count = getPoolItems().length;
  toastState = {
    visible: true,
    kind: options.kind || 'add',
    title: options.title || `已放进报告 · 共 ${countLabel(count)} 个`,
    detail: options.detail || '可以继续添加，也可以先生成一份给家里看',
    count,
    href: getPoolHref(),
    until: Date.now() + 3800
  };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastState.visible = false;
    render();
  }, 3900);
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
        showActionToast({ title: `已放进报告 · 共 ${countLabel(count)} 个`, detail: '可以继续添加，也可以先生成一份给家里看' });
        emitPoolUpdated({ action: 'add', count });
      } else if (/最多|已较多/.test(String(result.message || ''))) {
        showActionToast({
          kind: 'warn',
          title: '已选专业数量较多',
          detail: '建议先生成报告或移除几个后再继续添加'
        });
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
