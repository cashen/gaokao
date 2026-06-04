import {
  clearPoolItems,
  getPoolItems,
  getPoolStats,
  movePoolItem,
  movePoolItemTo,
  movePoolItemByOffset,
  removePoolItem,
  sortPoolItems,
  classifyPoolItem,
  getPoolOrderSignature
} from './feature/selection-pool/selection-pool-store.v3949.js';
import { requestPathAnalysis } from './feature/selection-pool/path-analysis-api.v3949.js';
import { createSelectionPoolFeishuReport } from './feature/selection-pool/feishu-selection-report-api.v3949.js';

const SCORE_KEY = 'lnRank.selectionPool.candidateScore.v3949';
const LEGACY_SCORE_KEYS = ['lnRank.selectionPool.candidateScore.v3948', 'lnRank.selectionPool.candidateScore.v3947', 'lnRank.selectionPool.candidateScore.v3946', 'lnRank.selectionPool.candidateScore.v3945', 'lnRank.selectionPool.candidateScore.v3944', 'lnRank.selectionPool.candidateScore.v3943', 'lnRank.selectionPool.candidateScore.v3942', 'lnRank.selectionPool.candidateScore.v3941', 'lnRank.selectionPool.candidateScore.v3940'];
const LONG_PRESS_MS = 220;
const DRAG_MOVE_TOLERANCE = 7;
let currentAnalysis = null;
let currentAnalysisSignature = '';
let currentAnalysisScore = '';
let feishuStatus = null;
let openMoveMenuId = null;
let dragState = null;
let pendingDrag = null;

function $(id) { return document.getElementById(id); }
function fmt(value) { const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—'; }
function parseNumText(value) {
  const n = Number(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function bandClass(item) { return (item.poolBand || classifyPoolItem(item)).className; }

function loadScore() {
  const raw = localStorage.getItem(SCORE_KEY) || LEGACY_SCORE_KEYS.map(k => localStorage.getItem(k)).find(Boolean) || '';
  const input = $('pathCandidateScore');
  if (input && raw) input.value = raw;
  return parseNumText(raw);
}

function readScoreFromInput() {
  const input = $('pathCandidateScore');
  const raw = input ? input.value.trim() : '';
  const score = parseNumText(raw);
  if (score) localStorage.setItem(SCORE_KEY, String(score));
  return score;
}


function statHtml(stats, items) {
  const count = stats.total || 0;
  const lastOrder = count ? Math.max(...items.map(item => Number(item.userOrder) || 0)) : 0;
  const orderText = count
    ? `当前 ${count} 个专业已按第 1-${lastOrder || count} 位重新编号并保存，飞书会读取这里看到的最终顺序。`
    : '自选池为空，先回查询页把可讨论的专业加入自选池。';
  return `<div class="pool-stats workspace-stats">
    <div><strong>${stats.total}</strong><span>总数</span></div>
    <div><strong>${stats.rushCount}</strong><span>冲刺</span></div>
    <div><strong>${stats.stableCount}</strong><span>稳妥</span></div>
    <div><strong>${stats.safeCount}</strong><span>保底</span></div>
  </div><div class="pool-stats-tip">${escapeHtml(orderText)}</div>`;
}

function moveMenuHtml(item, index, total) {
  if (openMoveMenuId !== item.id) return '';
  return `<div class="workspace-move-menu" data-move-menu="${escapeHtml(item.id)}">
    <button type="button" data-top="${escapeHtml(item.id)}" ${index === 0 ? 'disabled' : ''}>置顶</button>
    <button type="button" data-up5="${escapeHtml(item.id)}" ${index === 0 ? 'disabled' : ''}>上移 5 位</button>
    <button type="button" data-jump="${escapeHtml(item.id)}">移到第…</button>
    <button type="button" data-down5="${escapeHtml(item.id)}" ${index === total - 1 ? 'disabled' : ''}>下移 5 位</button>
    <button type="button" data-bottom="${escapeHtml(item.id)}" ${index === total - 1 ? 'disabled' : ''}>置底</button>
  </div>`;
}

function itemHtml(item, index, total) {
  const band = item.poolBand || classifyPoolItem(item);
  const score = Number.isFinite(Number(item.score2025)) ? `${item.score2025} 分` : '分数待核验';
  const rank = Number.isFinite(Number(item.rank2025)) ? `位次 ${fmt(item.rank2025)}` : '位次待核验';
  const delta = Number.isFinite(Number(item.scoreDelta)) ? `相对考生 ${item.scoreDelta > 0 ? '+' : ''}${item.scoreDelta} 分` : '分差待核验';
  const location = item.displayLocation ? `<span>${escapeHtml(item.displayLocation)}</span>` : '';
  return `<article class="workspace-item band-${bandClass(item)}" data-id="${escapeHtml(item.id)}" data-index="${index}">
    <button class="workspace-drag-handle" type="button" data-drag-id="${escapeHtml(item.id)}" aria-label="拖拽调整第 ${index + 1} 个志愿顺序">☰</button>
    <div class="workspace-order">${index + 1}</div>
    <div class="workspace-item-main">
      <div class="workspace-item-title"><span>${escapeHtml(item.school)}</span><b>·</b><span>${escapeHtml(item.major)}</span></div>
      <div class="workspace-item-meta">
        <span class="is-band">${band.detail}</span><span>${score}</span><span>${rank}</span><span>${delta}</span>${location}
      </div>
    </div>
    <div class="workspace-item-actions">
      <button class="workspace-mini-button icon" title="上移一位" data-up="${escapeHtml(item.id)}" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button class="workspace-mini-button icon" title="下移一位" data-down="${escapeHtml(item.id)}" ${index === total - 1 ? 'disabled' : ''}>↓</button>
      <button class="workspace-mini-button" data-move-toggle="${escapeHtml(item.id)}">移动</button>
      <button class="workspace-mini-button danger" data-remove="${escapeHtml(item.id)}">删除</button>
      ${moveMenuHtml(item, index, total)}
    </div>
  </article>`;
}

function markChanged() {
  currentAnalysis = null;
  currentAnalysisSignature = '';
  currentAnalysisScore = '';
  feishuStatus = null;
}

function analysisIsFresh(items = getPoolItems(), score = readScoreFromInput() || loadScore()) {
  return Boolean(currentAnalysis)
    && currentAnalysisSignature === getPoolOrderSignature(items)
    && String(currentAnalysisScore || '') === String(score || '');
}

function attachAnalysisFreshness(analysis, items, score) {
  currentAnalysis = analysis;
  currentAnalysisSignature = getPoolOrderSignature(items);
  currentAnalysisScore = String(score || '');
  if (currentAnalysis && typeof currentAnalysis === 'object') {
    currentAnalysis.orderSignature = currentAnalysisSignature;
    currentAnalysis.candidateScore = score || null;
  }
}

function afterOrderChanged({ keepMoveMenu = false } = {}) {
  markChanged();
  if (!keepMoveMenu) openMoveMenuId = null;
  renderAll();
}

function bindListEvents(listRoot) {
  listRoot.querySelectorAll('[data-up]').forEach(btn => btn.addEventListener('click', () => { movePoolItem(btn.dataset.up, 'up'); afterOrderChanged(); }));
  listRoot.querySelectorAll('[data-down]').forEach(btn => btn.addEventListener('click', () => { movePoolItem(btn.dataset.down, 'down'); afterOrderChanged(); }));
  listRoot.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => { removePoolItem(btn.dataset.remove); afterOrderChanged(); }));
  listRoot.querySelectorAll('[data-move-toggle]').forEach(btn => btn.addEventListener('click', (event) => {
    event.stopPropagation();
    openMoveMenuId = openMoveMenuId === btn.dataset.moveToggle ? null : btn.dataset.moveToggle;
    renderAll();
  }));
  listRoot.querySelectorAll('[data-top]').forEach(btn => btn.addEventListener('click', () => { movePoolItemTo(btn.dataset.top, 0); afterOrderChanged(); }));
  listRoot.querySelectorAll('[data-bottom]').forEach(btn => btn.addEventListener('click', () => { movePoolItemTo(btn.dataset.bottom, getPoolItems().length - 1); afterOrderChanged(); }));
  listRoot.querySelectorAll('[data-up5]').forEach(btn => btn.addEventListener('click', () => { movePoolItemByOffset(btn.dataset.up5, -5); afterOrderChanged(); }));
  listRoot.querySelectorAll('[data-down5]').forEach(btn => btn.addEventListener('click', () => { movePoolItemByOffset(btn.dataset.down5, 5); afterOrderChanged(); }));
  listRoot.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => {
    const total = getPoolItems().length;
    const input = prompt(`移动到第几位？请输入 1-${total} 的数字。`);
    if (input == null) return;
    const n = Number(String(input).replace(/[^0-9]/g, ''));
    if (!Number.isFinite(n) || n < 1 || n > total) {
      alert(`请输入 1-${total} 之间的序号。`);
      return;
    }
    movePoolItemTo(btn.dataset.jump, n - 1);
    afterOrderChanged();
  }));
  listRoot.querySelectorAll('[data-drag-id]').forEach(handle => handle.addEventListener('pointerdown', onDragPointerDown));
}

function renderList() {
  const items = getPoolItems();
  const stats = getPoolStats(items);
  const statsRoot = $('workspaceStats');
  const listRoot = $('workspaceList');
  const sendOnly = $('sendSelectionPool');
  const sendAnalyzed = $('sendAnalyzedPool');
  const runAnalysis = $('runAnalysis');
  const sortByBand = $('sortByBand');
  if (statsRoot) statsRoot.innerHTML = statHtml(stats, items);
  if (sendOnly) sendOnly.disabled = !items.length;
  if (sendAnalyzed) sendAnalyzed.disabled = !items.length;
  if (runAnalysis) runAnalysis.disabled = !items.length;
  if (sortByBand) sortByBand.disabled = items.length < 2;
  if (!listRoot) return;
  listRoot.innerHTML = items.length
    ? items.map((item, index) => itemHtml(item, index, items.length)).join('')
    : '<div class="pool-empty">自选池为空。请返回查询页，先在专业卡片中点击“加入自选池”。</div>';

  bindListEvents(listRoot);
}

function renderAnalysis() {
  const root = $('analysisResult');
  if (!root) return;
  if (!currentAnalysis) {
    root.innerHTML = '<div class="pool-empty diagnose-empty">点击“检查当前排序”，系统会按当前顺序检查冲刺是否过多、稳妥段能否承接、保底是否够用。</div>';
    return;
  }
  const fresh = analysisIsFresh();
  const staleNotice = fresh ? '' : '<div class="analysis-stale">排序或分数已经变化，请重新点击“检查当前排序”后再发送诊断报告。</div>';
  root.innerHTML = `<div class="analysis-box">${staleNotice}
    <div class="analysis-summary">${escapeHtml(currentAnalysis.summary || '')}</div>
    ${(currentAnalysis.sections || []).map(section => `<div class="analysis-section"><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.content)}</p></div>`).join('')}
    <div class="analysis-section"><h3>主要风险</h3><ol class="analysis-list">${(currentAnalysis.risks || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol></div>
    <div class="analysis-section"><h3>调整建议</h3><ol class="analysis-list">${(currentAnalysis.actions || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol></div>
  </div>`;
}

function renderFeishuStatus() {
  const root = $('feishuSelectionStatus');
  if (!root) return;
  if (!feishuStatus) { root.innerHTML = ''; return; }
  const links = feishuStatus.url ? `<div class="pool-feishu-links">
    <a class="pool-feishu-link" href="${escapeHtml(feishuStatus.url)}" target="_blank" rel="noopener">打开飞书文档</a>
    <button id="copyFeishuUrl" class="pool-feishu-link pool-feishu-copy" type="button">复制链接</button>
  </div>` : '';
  root.innerHTML = `<div class="pool-feishu-status ${feishuStatus.ok ? 'is-ok' : 'is-error'}">${escapeHtml(feishuStatus.message || '')}${links}</div>`;
  $('copyFeishuUrl')?.addEventListener('click', async () => {
    if (!feishuStatus?.url) return;
    try {
      await navigator.clipboard.writeText(feishuStatus.url);
      feishuStatus = { ...feishuStatus, ok: true, message: '飞书文档链接已复制。' };
    } catch {
      feishuStatus = { ...feishuStatus, ok: false, message: '浏览器不允许自动复制，请打开飞书报告后手动复制链接。' };
    }
    renderFeishuStatus();
  });
}

function renderAll() {
  renderList();
  renderAnalysis();
  renderFeishuStatus();
}

async function runAnalysis() {
  const button = $('runAnalysis');
  const items = getPoolItems();
  const score = readScoreFromInput() || loadScore();
  const signature = getPoolOrderSignature(items);
  if (button) { button.disabled = true; button.textContent = '检查中…'; }
  try {
    const analysis = await requestPathAnalysis({ items, candidateScore: score, orderSignature: signature });
    if (getPoolOrderSignature(getPoolItems()) === signature && String(readScoreFromInput() || loadScore() || '') === String(score || '')) {
      attachAnalysisFreshness(analysis, items, score);
    } else {
      currentAnalysis = null;
      currentAnalysisSignature = '';
      currentAnalysisScore = '';
    feishuStatus = { ok: false, message: '检查过程中排序或分数发生了变化，请重新点击“检查当前排序”。' };
    }
  } finally {
    if (button) { button.disabled = !getPoolItems().length; button.textContent = '检查当前排序'; }
    renderAll();
  }
}

async function sendFeishu({ withAnalysis = false } = {}) {
  const startingItems = getPoolItems();
  if (!startingItems.length) { alert('请先加入专业志愿。'); return; }
  const btn = withAnalysis ? $('sendAnalyzedPool') : $('sendSelectionPool');
  const score = readScoreFromInput() || loadScore();
  if (btn) { btn.disabled = true; btn.textContent = withAnalysis ? '生成报告中…' : '发送中…'; }
  feishuStatus = { ok: true, message: withAnalysis ? '正在按当前最终排序生成飞书诊断报告…' : '正在把当前排序清单发送到飞书…' };
  renderFeishuStatus();
  try {
    let itemsForReport = getPoolItems();
    let analysis = currentAnalysis;
    if (withAnalysis && !analysisIsFresh(itemsForReport, score)) {
      const signature = getPoolOrderSignature(itemsForReport);
      analysis = await requestPathAnalysis({ items: itemsForReport, candidateScore: score, orderSignature: signature });
      attachAnalysisFreshness(analysis, itemsForReport, score);
    }
    itemsForReport = getPoolItems();
    if (withAnalysis && currentAnalysisSignature !== getPoolOrderSignature(itemsForReport)) {
      const signature = getPoolOrderSignature(itemsForReport);
      analysis = await requestPathAnalysis({ items: itemsForReport, candidateScore: score, orderSignature: signature });
      attachAnalysisFreshness(analysis, itemsForReport, score);
    }
    const data = await createSelectionPoolFeishuReport({
      reportType: withAnalysis ? 'selectionPoolWithAnalysis' : 'selectionPoolOnly',
      candidateScore: score,
      items: itemsForReport,
      orderSignature: getPoolOrderSignature(itemsForReport),
      analysis: withAnalysis ? analysis : null
    });
    const warningText = data.warning ? ` ${data.warning}` : '';
    feishuStatus = {
      ok: true,
      message: data.partial
        ? `飞书文档已创建，但内容写入可能不完整。${data.permissionWarning || ''}`
        : withAnalysis
          ? `诊断报告已发送到飞书，${data.sharePublic ? '已设置为获得链接的人可阅读。' : '共享权限需要人工确认。'}${warningText}`
          : `当前排序清单已发送到飞书，${data.sharePublic ? '已设置为获得链接的人可阅读。' : '共享权限需要人工确认。'}${warningText}`,
      url: data.url || ''
    };
  } catch (error) {
    feishuStatus = { ok: false, message: error?.message || String(error) };
  } finally {
    if (btn) { btn.disabled = !getPoolItems().length; btn.textContent = withAnalysis ? '发送诊断报告到飞书' : '发送当前排序到飞书'; }
    renderAll();
  }
}

function bind() {
  $('runAnalysis')?.addEventListener('click', runAnalysis);
  $('sendSelectionPool')?.addEventListener('click', () => sendFeishu({ withAnalysis: false }));
  $('sendAnalyzedPool')?.addEventListener('click', () => sendFeishu({ withAnalysis: true }));
  $('sortByBand')?.addEventListener('click', () => {
    if (!getPoolItems().length) return;
    if (!confirm('将按 高冲→小冲→边稳→稳妥→小保→强保→兜底 重新整理当前自选池。确认执行吗？')) return;
    sortPoolItems('band');
    afterOrderChanged();
  });
  $('clearPool')?.addEventListener('click', () => {
    if (!confirm('确认清空自选池吗？')) return;
    clearPoolItems();
    currentAnalysis = null;
    currentAnalysisSignature = '';
    currentAnalysisScore = '';
    feishuStatus = null;
    openMoveMenuId = null;
    renderAll();
  });
  $('pathCandidateScore')?.addEventListener('input', () => {
    readScoreFromInput();
    if (currentAnalysis) {
      currentAnalysis = null;
      currentAnalysisSignature = '';
      currentAnalysisScore = '';
      renderAll();
    }
  });
  document.addEventListener('click', (event) => {
    if (!openMoveMenuId) return;
    if (event.target.closest('[data-move-menu]') || event.target.closest('[data-move-toggle]')) return;
    openMoveMenuId = null;
    renderAll();
  });
}

function onDragPointerDown(event) {
  const handle = event.currentTarget;
  const item = handle.closest('.workspace-item');
  const listRoot = $('workspaceList');
  if (!item || !listRoot) return;
  const start = { x: event.clientX, y: event.clientY };
  const id = handle.dataset.dragId;
  const fromIndex = Number(item.dataset.index) || 0;
  try { handle.setPointerCapture(event.pointerId); } catch {}

  const startNow = () => beginDrag({ event, id, fromIndex, item, listRoot, start });
  const cleanupPending = () => {
    if (!pendingDrag) return;
    if (pendingDrag.timer) clearTimeout(pendingDrag.timer);
    window.removeEventListener('pointermove', pendingDrag.onMove, true);
    window.removeEventListener('pointerup', pendingDrag.onUp, true);
    window.removeEventListener('pointercancel', pendingDrag.onUp, true);
    pendingDrag = null;
  };

  const onMove = (moveEvent) => {
    const dx = Math.abs(moveEvent.clientX - start.x);
    const dy = Math.abs(moveEvent.clientY - start.y);
    if (!dragState && moveEvent.pointerType !== 'mouse' && (dx > DRAG_MOVE_TOLERANCE || dy > DRAG_MOVE_TOLERANCE)) {
      cleanupPending();
    }
  };
  const onUp = () => cleanupPending();

  if (event.pointerType === 'mouse') {
    event.preventDefault();
    startNow();
    return;
  }
  pendingDrag = { timer: setTimeout(() => { cleanupPending(); startNow(); }, LONG_PRESS_MS), onMove, onUp };
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);
}

function beginDrag({ event, id, fromIndex, item, listRoot, start }) {
  if (dragState) return;
  const rect = item.getBoundingClientRect();
  const ghost = item.cloneNode(true);
  ghost.classList.add('pool-drag-ghost');
  ghost.style.width = `${rect.width}px`;
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.transform = 'translate3d(0,0,0)';
  document.body.appendChild(ghost);
  item.classList.add('is-dragging-source');
  document.body.classList.add('is-pool-dragging');
  openMoveMenuId = null;
  dragState = {
    id,
    fromIndex,
    targetIndex: fromIndex,
    startX: start.x,
    startY: start.y,
    offsetX: start.x - rect.left,
    offsetY: start.y - rect.top,
    ghost,
    source: item,
    listRoot
  };
  window.addEventListener('pointermove', onDragging, true);
  window.addEventListener('pointerup', endDrag, true);
  window.addEventListener('pointercancel', cancelDrag, true);
  onDragging(event);
}

function onDragging(event) {
  if (!dragState) return;
  event.preventDefault();
  const x = event.clientX - dragState.offsetX;
  const y = event.clientY - dragState.offsetY;
  dragState.ghost.style.transform = `translate3d(${x - Number(dragState.ghost.style.left.replace('px',''))}px, ${y - Number(dragState.ghost.style.top.replace('px',''))}px, 0)`;
  updateDragTarget(event.clientX, event.clientY);
  autoScrollWhileDragging(event.clientY);
}

function updateDragTarget(clientX, clientY) {
  document.querySelectorAll('.workspace-item.is-drop-before, .workspace-item.is-drop-after').forEach(el => {
    el.classList.remove('is-drop-before', 'is-drop-after');
  });
  if (!dragState) return;
  dragState.ghost.style.pointerEvents = 'none';
  const el = document.elementFromPoint(clientX, clientY);
  const target = el?.closest?.('.workspace-item');
  if (!target || !dragState.listRoot.contains(target) || target === dragState.source) return;
  const targetIndex = Number(target.dataset.index) || 0;
  const rect = target.getBoundingClientRect();
  const after = clientY > rect.top + rect.height / 2;
  target.classList.add(after ? 'is-drop-after' : 'is-drop-before');
  const insertion = targetIndex + (after ? 1 : 0);
  let finalIndex = insertion;
  if (finalIndex > dragState.fromIndex) finalIndex -= 1;
  dragState.targetIndex = Math.max(0, Math.min(getPoolItems().length - 1, finalIndex));
}

function autoScrollWhileDragging(clientY) {
  const margin = 84;
  const speed = 13;
  if (clientY < margin) window.scrollBy({ top: -speed, behavior: 'auto' });
  if (window.innerHeight - clientY < margin) window.scrollBy({ top: speed, behavior: 'auto' });
}

function endDrag(event) {
  if (!dragState) return;
  event.preventDefault();
  const { id, fromIndex, targetIndex } = dragState;
  cleanupDrag();
  if (targetIndex !== fromIndex) {
    movePoolItemTo(id, targetIndex);
    afterOrderChanged();
  } else {
    renderAll();
  }
}

function cancelDrag() {
  cleanupDrag();
  renderAll();
}

function cleanupDrag() {
  if (!dragState) return;
  window.removeEventListener('pointermove', onDragging, true);
  window.removeEventListener('pointerup', endDrag, true);
  window.removeEventListener('pointercancel', cancelDrag, true);
  dragState.source?.classList.remove('is-dragging-source');
  dragState.ghost?.remove();
  dragState = null;
  document.body.classList.remove('is-pool-dragging');
  document.querySelectorAll('.workspace-item.is-drop-before, .workspace-item.is-drop-after').forEach(el => {
    el.classList.remove('is-drop-before', 'is-drop-after');
  });
}

loadScore();
bind();
renderAll();
