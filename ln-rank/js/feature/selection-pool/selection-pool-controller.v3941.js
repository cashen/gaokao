import {
  addPoolItem,
  clearPoolItems,
  getPoolItems,
  getPoolStats,
  hasPoolItem,
  removePoolItem,
  movePoolItem,
  classifyPoolItem
} from './selection-pool-store.v3941.js';
import { requestPathAnalysis } from './path-analysis-api.v3941.js';
import { createSelectionPoolFeishuReport } from './feishu-selection-report-api.v3941.js';

let drawerOpen = false;
let mounted = false;
let latestState = null;
let onChanged = () => {};
let lastAnalysis = null;
let feishuStatus = null;
let bumpUntil = 0;

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
  if (!result) return '<div class="pool-analysis-empty">需要时点击“AI路径分析”，生成整体意见后可一键发送飞书。</div>';
  return `<div class="pool-analysis-result level-${escapeHtml(result.level || 'medium')}">
    <div class="pool-analysis-summary">${escapeHtml(result.summary || '')}</div>
    <div class="pool-analysis-columns">
      <div><strong>主要风险</strong>${(result.risks || []).slice(0, 4).map(x => `<p>${escapeHtml(x)}</p>`).join('')}</div>
      <div><strong>调整建议</strong>${(result.actions || []).slice(0, 4).map(x => `<p>${escapeHtml(x)}</p>`).join('')}</div>
    </div>
  </div>`;
}

function feishuStatusHtml() {
  if (!feishuStatus) return '';
  const links = feishuStatus.url ? `<div class="pool-feishu-links">
    <a class="pool-feishu-link" href="${escapeHtml(feishuStatus.url)}" target="_blank" rel="noopener">打开飞书报告</a>
    <button class="pool-feishu-link pool-feishu-copy" type="button" data-copy-feishu-url="${escapeHtml(feishuStatus.url)}">复制链接</button>
  </div>` : '';
  return `<div class="pool-feishu-status ${feishuStatus.ok ? 'is-ok' : 'is-error'}">
    ${escapeHtml(feishuStatus.message || '')}${links}
  </div>`;
}

function render() {
  const root = ensureShell();
  const items = getPoolItems();
  const stats = getPoolStats(items);
  const isBumped = Date.now() < bumpUntil;
  root.className = `selection-pool-shell ${drawerOpen ? 'is-open' : ''}`;
  root.innerHTML = `<button id="selectionPoolFab" class="selection-pool-fab ${isBumped ? 'is-bumped' : ''}" type="button" aria-label="打开自选池">
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
        <a class="pool-secondary" href="./selection-pool.html">整理排序</a>
        <button id="poolQuickAnalysis" class="pool-primary" type="button" ${items.length ? '' : 'disabled'}>AI路径分析</button>
        <button id="poolSendOnly" class="pool-secondary" type="button" ${items.length ? '' : 'disabled'}>发送自选池到飞书</button>
        <button id="poolSendAnalyzed" class="pool-primary" type="button" ${items.length ? '' : 'disabled'}>分析后发送飞书</button>
      </div>
      ${feishuStatusHtml()}
      <div id="poolAnalysisSlot" class="pool-analysis-slot">${analysisHtml(lastAnalysis)}</div>
      <div class="pool-mini-list">
        ${items.length ? items.map(miniItem).join('') : '<div class="pool-empty">还没有加入专业。查询结果卡片里点击“加入自选池”，右侧数量会实时变化。</div>'}
      </div>
      <div class="pool-drawer-foot">
        <button id="poolClear" class="pool-danger" type="button" ${items.length ? '' : 'disabled'}>清空自选池</button>
        <span>需要整理时再打开，不打断查询。</span>
      </div>
    </aside>`;
  bindShell(root);
}

function getCandidateScore() {
  return latestState?.candidateScore || Number(localStorage.getItem('lnRank.selectionPool.candidateScore.v3941')) || Number(localStorage.getItem('lnRank.selectionPool.candidateScore.v3940')) || null;
}

async function copyUrl(url) {
  try {
    await navigator.clipboard.writeText(url);
    feishuStatus = { ok: true, message: '飞书报告链接已复制。', url };
  } catch {
    feishuStatus = { ok: false, message: '浏览器不允许自动复制，请打开飞书报告后手动复制链接。', url };
  }
  render();
  drawerOpen = true;
}

async function runAnalysis(root) {
  const btn = root.querySelector('#poolQuickAnalysis');
  if (btn) { btn.disabled = true; btn.textContent = '分析中…'; }
  feishuStatus = null;
  const items = getPoolItems();
  lastAnalysis = await requestPathAnalysis({ items, candidateScore: getCandidateScore() });
  render();
  drawerOpen = true;
}

async function sendFeishu({ withAnalysis = false } = {}) {
  const items = getPoolItems();
  if (!items.length) return;
  drawerOpen = true;
  feishuStatus = { ok: true, message: withAnalysis ? '正在分析并生成飞书报告…' : '正在生成飞书报告…' };
  render();

  try {
    let analysis = lastAnalysis;
    if (withAnalysis && !analysis) {
      analysis = await requestPathAnalysis({ items, candidateScore: getCandidateScore() });
      lastAnalysis = analysis;
    }
    const data = await createSelectionPoolFeishuReport({
      reportType: withAnalysis ? 'selectionPoolWithAnalysis' : 'selectionPoolOnly',
      candidateScore: getCandidateScore(),
      items,
      analysis: withAnalysis ? analysis : null
    });
    feishuStatus = {
      ok: true,
      message: data.partial
        ? `飞书文档已创建，但内容写入可能不完整。${data.permissionWarning || ''}`
        : `飞书报告已生成，${data.sharePublic ? '已设置为获得链接的人可阅读。' : '共享权限需要人工确认。'}`,
      url: data.url || ''
    };
  } catch (error) {
    feishuStatus = { ok: false, message: error?.message || String(error) };
  }
  render();
  drawerOpen = true;
}

function bindShell(root) {
  root.querySelector('#selectionPoolFab')?.addEventListener('click', () => { drawerOpen = true; render(); });
  root.querySelector('#selectionPoolMask')?.addEventListener('click', () => { drawerOpen = false; render(); });
  root.querySelector('#selectionPoolClose')?.addEventListener('click', () => { drawerOpen = false; render(); });
  root.querySelectorAll('[data-pool-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      removePoolItem(btn.dataset.poolRemove);
      lastAnalysis = null;
      feishuStatus = null;
      onChanged();
      render();
    });
  });
  root.querySelector('#poolClear')?.addEventListener('click', () => {
    if (!confirm('确认清空自选池吗？')) return;
    clearPoolItems();
    lastAnalysis = null;
    feishuStatus = null;
    onChanged();
    render();
  });
  root.querySelector('#poolQuickAnalysis')?.addEventListener('click', () => runAnalysis(root));
  root.querySelector('#poolSendOnly')?.addEventListener('click', () => sendFeishu({ withAnalysis: false }));
  root.querySelector('#poolSendAnalyzed')?.addEventListener('click', () => sendFeishu({ withAnalysis: true }));
  root.querySelector('[data-copy-feishu-url]')?.addEventListener('click', (event) => copyUrl(event.currentTarget.dataset.copyFeishuUrl));
}

export function initSelectionPool(state, options = {}) {
  latestState = state || latestState;
  onChanged = typeof options.onChanged === 'function' ? options.onChanged : onChanged;
  drawerOpen = false;
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
        bumpUntil = Date.now() + 450;
        lastAnalysis = null;
        feishuStatus = null;
      }
      onChanged();
      render();
      return result;
    },
    remove(id) {
      const result = removePoolItem(id);
      lastAnalysis = null;
      feishuStatus = null;
      onChanged();
      render();
      return result;
    },
    move(id, direction) {
      const result = movePoolItem(id, direction);
      lastAnalysis = null;
      feishuStatus = null;
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
