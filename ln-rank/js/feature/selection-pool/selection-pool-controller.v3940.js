import {
  addPoolItem,
  clearPoolItems,
  getPoolItems,
  getPoolStats,
  hasPoolItem,
  removePoolItem,
  movePoolItem,
  classifyPoolItem
} from './selection-pool-store.v3940.js';
import { requestPathAnalysis } from './path-analysis-api.v3940.js';

let drawerOpen = false;
let mounted = false;
let latestState = null;
let onChanged = () => {};

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function countLabel(count) {
  if (count <= 0) return '0';
  return count > 99 ? '99+' : String(count);
}

function ensureShell() {
  let root = document.getElementById('selectionPoolShell');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'selectionPoolShell';
  root.className = 'selection-pool-shell';
  document.body.appendChild(root);
  return root;
}

function bandClass(item) {
  return (item.poolBand || classifyPoolItem(item)).className;
}

function miniItem(item, index) {
  const band = item.poolBand || classifyPoolItem(item);
  const score = Number.isFinite(Number(item.score2025)) ? `${item.score2025}分` : '分数缺失';
  const rank = Number.isFinite(Number(item.rank2025)) ? `位次${fmt(item.rank2025)}` : '位次缺失';
  return `<div class="pool-mini-item band-${bandClass(item)}" data-pool-id="${escapeHtml(item.id)}">
    <div class="pool-mini-order">${index + 1}</div>
    <div class="pool-mini-main">
      <div class="pool-mini-title">${escapeHtml(item.school)}</div>
      <div class="pool-mini-major">${escapeHtml(item.major)}</div>
      <div class="pool-mini-meta">${score}｜${rank}</div>
    </div>
    <span class="pool-band-chip">${band.detail}</span>
    <button class="pool-icon-button" type="button" title="移除" data-pool-remove="${escapeHtml(item.id)}">×</button>
  </div>`;
}

function analysisHtml(result) {
  if (!result) return '<div class="pool-analysis-empty">点击“快速路径分析”后生成自选池整体意见。</div>';
  return `<div class="pool-analysis-result level-${escapeHtml(result.level || 'medium')}">
    <div class="pool-analysis-summary">${escapeHtml(result.summary || '')}</div>
    <div class="pool-analysis-columns">
      <div><strong>主要风险</strong>${(result.risks || []).slice(0, 4).map(x => `<p>${escapeHtml(x)}</p>`).join('')}</div>
      <div><strong>调整建议</strong>${(result.actions || []).slice(0, 4).map(x => `<p>${escapeHtml(x)}</p>`).join('')}</div>
    </div>
  </div>`;
}

let lastAnalysis = null;

function render() {
  const root = ensureShell();
  const items = getPoolItems();
  const stats = getPoolStats(items);
  root.className = `selection-pool-shell ${drawerOpen ? 'is-open' : ''}`;
  root.innerHTML = `<button id="selectionPoolFab" class="selection-pool-fab" type="button" aria-label="打开自选池">
      <span class="pool-fab-title">自选池</span>
      <span class="pool-fab-count">${countLabel(items.length)}</span>
    </button>
    <div id="selectionPoolMask" class="selection-pool-mask"></div>
    <aside class="selection-pool-drawer" aria-label="自选池抽屉">
      <div class="pool-drawer-head">
        <div>
          <div class="pool-eyebrow">辽宁物理类 · 自选池</div>
          <h2>已选 ${items.length} 个专业志愿</h2>
        </div>
        <button id="selectionPoolClose" class="pool-close" type="button">关闭</button>
      </div>
      <div class="pool-stats">
        <div><strong>${stats.rushCount}</strong><span>冲刺</span></div>
        <div><strong>${stats.stableCount}</strong><span>稳妥</span></div>
        <div><strong>${stats.safeCount}</strong><span>保底</span></div>
      </div>
      <div class="pool-drawer-actions">
        <button id="poolQuickAnalysis" class="pool-primary" type="button" ${items.length ? '' : 'disabled'}>快速路径分析</button>
        <a class="pool-secondary" href="./selection-pool.html">进入完整排序</a>
      </div>
      <div id="poolAnalysisSlot" class="pool-analysis-slot">${analysisHtml(lastAnalysis)}</div>
      <div class="pool-mini-list">
        ${items.length ? items.map(miniItem).join('') : '<div class="pool-empty">还没有加入专业。查询结果卡片里点击“加入自选池”，这里会实时显示数量和排序入口。</div>'}
      </div>
      <div class="pool-drawer-foot">
        <button id="poolClear" class="pool-danger" type="button" ${items.length ? '' : 'disabled'}>清空自选池</button>
        <span>本地保存 · 刷新不丢</span>
      </div>
    </aside>`;
  bindShell(root);
}

function bindShell(root) {
  root.querySelector('#selectionPoolFab')?.addEventListener('click', () => { drawerOpen = true; render(); });
  root.querySelector('#selectionPoolMask')?.addEventListener('click', () => { drawerOpen = false; render(); });
  root.querySelector('#selectionPoolClose')?.addEventListener('click', () => { drawerOpen = false; render(); });
  root.querySelectorAll('[data-pool-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      removePoolItem(btn.dataset.poolRemove);
      lastAnalysis = null;
      onChanged();
      render();
    });
  });
  root.querySelector('#poolClear')?.addEventListener('click', () => {
    if (!confirm('确认清空自选池吗？')) return;
    clearPoolItems();
    lastAnalysis = null;
    onChanged();
    render();
  });
  root.querySelector('#poolQuickAnalysis')?.addEventListener('click', async () => {
    const btn = root.querySelector('#poolQuickAnalysis');
    btn.disabled = true;
    btn.textContent = '分析中…';
    const items = getPoolItems();
    lastAnalysis = await requestPathAnalysis({ items, candidateScore: latestState?.candidateScore || null });
    render();
    drawerOpen = true;
  });
}

export function initSelectionPool(state, options = {}) {
  latestState = state || latestState;
  onChanged = typeof options.onChanged === 'function' ? options.onChanged : onChanged;
  if (!mounted) {
    mounted = true;
    window.addEventListener('lnrank-selection-pool-updated', () => render());
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && drawerOpen) { drawerOpen = false; render(); }
    });
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
        drawerOpen = true;
        lastAnalysis = null;
      }
      onChanged();
      render();
      return result;
    },
    remove(id) {
      const result = removePoolItem(id);
      lastAnalysis = null;
      onChanged();
      render();
      return result;
    },
    move(id, direction) {
      const result = movePoolItem(id, direction);
      lastAnalysis = null;
      onChanged();
      render();
      return result;
    },
    items: getPoolItems,
    stats: getPoolStats,
    open() { drawerOpen = true; render(); },
    close() { drawerOpen = false; render(); }
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
