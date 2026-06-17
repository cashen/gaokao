import {
  clearPoolItems,
  getPoolItems,
  movePoolItem,
  movePoolItemTo,
  movePoolItemByOffset,
  removePoolItem,
  classifyPoolItem,
  getPoolOrderSignature,
  savePoolItems
} from './feature/selection-pool/index.js?v=3920_7';
import { requestPathAnalysis } from './feature/selection-pool/index.js?v=3920_7';
import { buildCandidateContext, buildComputedSignature } from './feature/selection-pool/index.js?v=3920_7';
import { getComputedStats, recomputeSelectionPool, sortComputedByBand, stripComputedForStorage } from './feature/selection-pool/index.js?v=3920_7';
import { renderHealthLights } from './feature/selection-pool/index.js?v=3920_7';
import { createSelectionPoolFeishuReport } from './feature/selection-pool/index.js?v=3920_7';
import { buildTrendSummaryForSelection, renderSelectionTrendBox } from './feature/trend/index.js?v=3920_7';
import { renderParentCoach } from './feature/decision-coach/index.js?v=3920_7';
import { getCampusForRecord } from './feature/campus/index.js?v=3920_7';
import { buildReviewChecklist, renderReviewChecklist } from './feature/review-checklist/index.js?v=3920_7';
import { normalizeSelectedMajors } from './domain/selection-contract.js?v=3920_7';
import { buildReportPayload } from './domain/report-payload-contract.js?v=3920_7';
import { toHumanCopy } from './domain/human-copy-dictionary.js?v=3920_7';

const SCORE_KEY = 'lnRank.selectionPool.candidateScore';
const BOTTOMLINE_STORAGE_KEY = 'lnRank.bottomLineMode.current';
const BOTTOMLINE_LEGACY_KEYS = ['lnRank.bottomLineMode.v3980', 'lnRank.bottomLineMode.v3962', 'lnRank.bottomLineMode.v3960', 'lnRank.bottomLineMode.v3912'];
const LEGACY_SCORE_KEYS = ['lnRank.selectionPool.candidateScore.v3959', 'lnRank.selectionPool.candidateScore.v3955', 'lnRank.selectionPool.candidateScore.v3949', 'lnRank.selectionPool.candidateScore.v3948', 'lnRank.selectionPool.candidateScore.v3947', 'lnRank.selectionPool.candidateScore.v3946', 'lnRank.selectionPool.candidateScore.v3945', 'lnRank.selectionPool.candidateScore.v3944', 'lnRank.selectionPool.candidateScore.v3943', 'lnRank.selectionPool.candidateScore.v3942', 'lnRank.selectionPool.candidateScore.v3941', 'lnRank.selectionPool.candidateScore.v3940'];
const LONG_PRESS_MS = 220;
const DRAG_MOVE_TOLERANCE = 7;
let currentAnalysis = null;
let currentAnalysisSignature = '';
let currentAnalysisScore = '';
let currentComputedState = null;
let feishuStatus = null;
let openMoveMenuId = null;
let dragState = null;
let pendingDrag = null;
let undoState = null;

function $(id) { return document.getElementById(id); }
function fmt(value) { const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—'; }
function parseNumText(value) {
  const n = Number(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
function bottomLineMode() {
  try {
    return localStorage.getItem(BOTTOMLINE_STORAGE_KEY) || BOTTOMLINE_LEGACY_KEYS.map(k => localStorage.getItem(k)).find(Boolean) || 'all';
  } catch { return 'all'; }
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function snapshotPoolItems() { return getPoolItems().map(item => ({ ...item })); }
function setUndoState(message, beforeItems) { undoState = { message: toHumanCopy(message || '已调整自选专业。'), beforeItems: Array.isArray(beforeItems) ? beforeItems : [] }; }
function renderUndoStatus() {
  const root = $('selectionUndoStatus');
  if (!root) return;
  root.innerHTML = undoState ? `<div class="ln-undo-toast"><span>${escapeHtml(undoState.message)}</span><button type="button" data-undo-selection="1">撤销</button></div>` : '';
}
function undoLastSelectionChange() {
  if (!undoState) return;
  savePoolItems(undoState.beforeItems || []);
  undoState = null;
  markChanged();
  renderAll();
}
function bandClass(item) { return (item.poolBand || classifyPoolItem(item)).className; }

function loadScore() {
  let raw = '';
  try {
    raw = localStorage.getItem(SCORE_KEY) || '';
    if (!raw) {
      raw = LEGACY_SCORE_KEYS.map(k => localStorage.getItem(k)).find(Boolean) || '';
      if (raw) localStorage.setItem(SCORE_KEY, raw);
    }
  } catch {}
  const input = $('pathCandidateScore');
  if (input && raw) input.value = raw;
  return parseNumText(raw);
}

function hydrateScoreFromUrl() {
  try {
    const params = new URLSearchParams(location.search);
    const score = params.get('score');
    const n = parseNumText(score);
    if (!n) return;
    const input = $('pathCandidateScore');
    if (input) input.value = String(n);
    try { localStorage.setItem(SCORE_KEY, String(n)); } catch {}
  } catch {}
}

function readScoreFromInput() {
  const input = $('pathCandidateScore');
  const raw = input ? input.value.trim() : '';
  if (!raw) {
    try { localStorage.removeItem(SCORE_KEY); } catch {}
    return null;
  }
  const score = parseNumText(raw);
  if (score) {
    try { localStorage.setItem(SCORE_KEY, String(score)); } catch {}
    return score;
  }
  return null;
}


function buildCurrentState({ persistScore = true } = {}) {
  const rawItems = getPoolItems();
  const score = readScoreFromInput();
  const candidateContext = buildCandidateContext(score);
  const computedItems = normalizeSelectedMajors(recomputeSelectionPool(candidateContext, rawItems), { candidateScore: score, rangePreset: 'standard' });
  const stats = getComputedStats(computedItems);
  const orderSignature = getPoolOrderSignature(rawItems);
  const signature = buildComputedSignature(candidateContext, orderSignature);
  const majorTrendSummary = buildTrendSummaryForSelection(computedItems, score);
  const reviewChecklist = buildReviewChecklist(computedItems);
  currentComputedState = { rawItems, items: computedItems, stats, candidateContext: { ...candidateContext, bottomLineMode: bottomLineMode() }, orderSignature, signature, score, bottomLineMode: bottomLineMode(), majorTrendSummary, reviewChecklist };
  return currentComputedState;
}

function getState() {
  return buildCurrentState();
}

function contextStatusHtml(state) {
  const score = state?.candidateContext?.score;
  const total = state?.items?.length || 0;
  const signature = state?.signature || '';
  const fresh = currentAnalysis && currentAnalysisSignature === signature;
  const cls = score ? (fresh || !currentAnalysis ? 'is-fresh' : 'is-stale') : 'is-missing';
  const text = score
    ? `当前计算口径：2025 辽宁物理类 · 孩子 ${score} 分 · 已按当前成绩重算 ${total} 个专业。排序、方案解读和家庭讨论报告都会先使用这个口径。`
    : '当前计算口径：考生分数待填写。请先填写分数，再进行排序、方案解读或家庭讨论报告。';
  const stale = score && currentAnalysis && !fresh ? '<b>成绩或排序已变化，旧方案解读已过期。</b>' : '';
  return `<div class="candidate-context-bar ${cls}">${escapeHtml(text)}${stale}</div>`;
}


function statHtml(stats, items, state) {
  const count = stats.total || 0;
  const lastOrder = count ? Math.max(...items.map(item => Number(item.userOrder) || 0)) : 0;
  const orderText = count
    ? `当前 ${count} 个专业已按第 1-${lastOrder || count} 位重新编号并保存，报告会读取这里看到的最终顺序。`
    : '自选专业为空，先回查询页把可讨论的专业加入这里。';
  return `${contextStatusHtml(state)}<div class="pool-stats workspace-stats">
    <div><strong>${stats.total}</strong><span>总数</span></div>
    <div><strong>${stats.rushCount}</strong><span>稍高目标</span></div>
    <div><strong>${stats.stableCount}</strong><span>主要参考</span></div>
    <div><strong>${stats.safeCount}</strong><span>稳妥补充</span></div>
  </div>${renderHealthLights(state)}<div class="pool-stats-tip">${escapeHtml(orderText)}</div>`;
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


function itemCodeText(item = {}) {
  const sm = item.standardMajor || {};
  if (sm.code && sm.name) return `<span class="workspace-code-line">专业代码 ${escapeHtml(sm.code)}｜${escapeHtml(sm.name)}</span>`;
  if (sm.categoryCode && sm.categoryName && sm.mappingStatus === 'category') return `<span class="workspace-code-line">专业类 ${escapeHtml(sm.categoryCode)}｜${escapeHtml(sm.categoryName)}</span>`;
  return '';
}

function itemHtml(item, index, total) {
  const band = item.poolBand || classifyPoolItem(item);
  const score = Number.isFinite(Number(item.score2025)) ? `${item.score2025} 分` : '分数待核验';
  const rank = Number.isFinite(Number(item.rank2025)) ? `位次 ${fmt(item.rank2025)}` : '位次待核验';
  const delta = Number.isFinite(Number(item.scoreDelta)) ? `相对当前口径 ${item.scoreDelta > 0 ? '+' : ''}${item.scoreDelta} 分` : '分差待核验';
  const campus = getCampusForRecord(item);
  const location = item.displayLocation ? `<span>${escapeHtml(item.displayLocation)}</span>` : '';
  const campusTag = campus?.displayTag ? `<span class="workspace-campus-tag">${escapeHtml(campus.displayTag)}</span>` : '';
  const campusReview = campus?.reviewSummary ? `<span class="workspace-review-summary">需核验：${escapeHtml(campus.reviewSummary).slice(0, 42)}</span>` : '';
  return `<article class="workspace-item band-${bandClass(item)}" data-id="${escapeHtml(item.id)}" data-index="${index}">
    <button class="workspace-drag-handle" type="button" data-drag-id="${escapeHtml(item.id)}" aria-label="拖动调整第 ${index + 1} 个自选专业顺序">拖动</button>
    <div class="workspace-order">${index + 1}</div>
    <div class="workspace-item-main">
      <div class="workspace-item-title"><span class="workspace-school">${escapeHtml(item.school)}</span><span class="workspace-major-name">${escapeHtml(item.major)}</span></div>
      <div class="workspace-item-meta">
        <span class="is-band">${escapeHtml(band.detail || '')}</span><span>2025最低分 ${score}</span><span>${rank}</span><span>${delta}</span>${location}${campusTag}${itemCodeText(item)}
      </div>
      ${campusReview ? `<div class="workspace-item-review">${campusReview}</div>` : ''}
    </div>
    <div class="workspace-item-actions">
      <button class="workspace-mini-button icon" title="上移一位" data-up="${escapeHtml(item.id)}" ${index === 0 ? 'disabled' : ''}>上移</button>
      <button class="workspace-mini-button icon" title="下移一位" data-down="${escapeHtml(item.id)}" ${index === total - 1 ? 'disabled' : ''}>下移</button>
      <button class="workspace-mini-button" data-move-toggle="${escapeHtml(item.id)}">移到第…</button>
      <button class="workspace-mini-button danger" data-remove="${escapeHtml(item.id)}">删除</button>
      ${moveMenuHtml(item, index, total)}
    </div>
  </article>`;
}

function markChanged() {
  currentAnalysisSignature = '';
  currentAnalysisScore = '';
  feishuStatus = null;
}

function analysisIsFresh(state = getState()) {
  return Boolean(currentAnalysis) && currentAnalysisSignature === state.signature;
}

function attachAnalysisFreshness(analysis, state) {
  currentAnalysis = analysis;
  currentAnalysisSignature = state.signature;
  currentAnalysisScore = String(state.score || '');
  if (currentAnalysis && typeof currentAnalysis === 'object') {
    currentAnalysis.orderSignature = state.orderSignature;
    currentAnalysis.computedSignature = state.signature;
    currentAnalysis.contextSignature = state.candidateContext.signature;
    currentAnalysis.candidateScore = state.score || null;
    currentAnalysis.majorTrendSummary = state.majorTrendSummary || buildTrendSummaryForSelection(state.items, state.score);
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
  listRoot.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => { const before=snapshotPoolItems(); const item=before.find(x=>x.id===btn.dataset.remove)||{}; removePoolItem(btn.dataset.remove); setUndoState(`已删除：${item.school||'学校'} · ${item.major||'专业'}。`, before); afterOrderChanged(); }));
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
  const state = getState();
  const items = state.items;
  const stats = state.stats;
  const statsRoot = $('workspaceStats');
  const listRoot = $('workspaceList');
  const sendOnly = $('sendSelectionPool');
  const sendAnalyzed = $('sendAnalyzedPool');
  const copyText = $('copySelectionText');
  const runAnalysis = $('runAnalysis');
  const sortByBand = $('sortByBand');
  if (statsRoot) statsRoot.innerHTML = statHtml(stats, items, state);
  const hasScore = Boolean(state.candidateContext.score);
  if (sendOnly) sendOnly.disabled = !items.length || !hasScore;
  if (sendAnalyzed) sendAnalyzed.disabled = !items.length || !hasScore;
  if (copyText) copyText.disabled = !items.length || !hasScore;
  if (runAnalysis) runAnalysis.disabled = !items.length || !hasScore;
  if (sortByBand) sortByBand.disabled = items.length < 2 || !hasScore;
  if (!listRoot) return;
  listRoot.innerHTML = items.length
    ? items.map((item, index) => itemHtml(item, index, items.length)).join('')
    : `<div class="pool-empty ln-selection-empty"><h3>还没有加入自选专业</h3><p>请先回到查询页，输入考生分数，把可以讨论的专业加入这里。加入后可以在本页调整顺序、检查方案，并生成家庭讨论报告。</p><a class="workspace-button primary" href="./index.html">返回查询页</a></div>`;

  bindListEvents(listRoot);
}

function listHtml(items = []) {
  return Array.isArray(items) && items.length
    ? `<ol class="analysis-list">${items.map(x => `<li>${escapeHtml(String(x || '').replace(/^\s*[-•]\s*/, '').replace(/^\s*\d+[\.、]\s*/, ''))}</li>`).join('')}</ol>`
    : '';
}

function renderAnalysis() {
  const root = $('analysisResult');
  if (!root) return;
  if (!currentAnalysis) {
    root.innerHTML = '<div class="pool-empty diagnose-empty">点击“检查这套方案”，这里会显示一句话结论、分段结构、主要风险和下一步建议。</div>';
    return;
  }
  const state = getState();
  const trendSummary = currentAnalysis.majorTrendSummary || state.majorTrendSummary || buildTrendSummaryForSelection(state.items, state.score);
  const fresh = analysisIsFresh(state);
  const staleNotice = fresh ? '' : '<div class="analysis-stale">排序或分数已经变化，请重新点击“检查这套方案”后再生成解读版报告。</div>';
  const rz = currentAnalysis.rankZone || currentAnalysis.candidateContext || {};
  const narrative = currentAnalysis.narrative || currentAnalysis.aiNarrative || null;
  const density = rz.density || currentAnalysis.facts?.density || {};
  const finalZone = narrative?.finalZone || {};
  const candidateZoneText = Array.isArray(currentAnalysis.candidateZones) && currentAnalysis.candidateZones.length
    ? currentAnalysis.candidateZones.map(z => `${z.zoneName || z.humanName || z.zoneKey}`).join(' / ')
    : (rz.zoneName || '待判断');
  const stats = currentAnalysis.stats || currentAnalysis.facts?.poolStructure || {};
  const rankZoneCard = `<div class="analysis-rankzone">
    <div class="rankzone-main">
      <span class="rankzone-label">考生位次定位</span>
      <strong>${escapeHtml(finalZone.zoneName || rz.zoneName || '待判断')}</strong>
      <p>${escapeHtml(narrative?.rankZoneExplain || narrative?.zoneJudgement || rz.note || '分数只是展示口径，系统会优先按当年一分一段位次、控制线锚点和自选专业结构判断。')}</p>
      <div class="rankzone-candidates">候选区：${escapeHtml(candidateZoneText)}</div>
    </div>
    <div class="rankzone-grid">
      <div><span>考生位次</span><b>${escapeHtml(rz.candidateRankLabel || currentAnalysis.facts?.candidate?.rankLabel || '待核验')}</b></div>
      <div><span>特控线锚点</span><b>${escapeHtml((rz.specialControlScore ? `${rz.specialControlScore}分｜` : '') + (rz.specialControlRankLabel || '待核验'))}</b></div>
      <div><span>附近人数</span><b>同分 ${escapeHtml(fmt(density.sameCount))}｜上5分 ${escapeHtml(fmt(density.up5Count))}｜下5分 ${escapeHtml(fmt(density.down5Count))}</b></div>
    </div>
  </div>`;

  const baseRisks = Array.isArray(narrative?.riskDiagnosis) && narrative.riskDiagnosis.length
    ? narrative.riskDiagnosis
    : (Array.isArray(currentAnalysis.risks) ? currentAnalysis.risks : []);
  const trendRisks = Array.isArray(trendSummary?.risks) ? trendSummary.risks : [];
  const risks = [...baseRisks, ...trendRisks].slice(0, 8);
  const actions = Array.isArray(narrative?.actions) && narrative.actions.length
    ? narrative.actions
    : (Array.isArray(currentAnalysis.actions) ? currentAnalysis.actions : []);
  const structureText = narrative?.structureDiagnosis
    || (stats.total ? `当前自选专业共 ${fmt(stats.total)} 个：稍高目标 ${fmt(stats.rushCount)} 个，主要参考 ${fmt(stats.stableCount)} 个，稳妥补充 ${fmt(stats.safeCount)} 个。建议重点看中段是否接得住、后段是否够稳。` : '当前自选专业数量和前中后段结构待核验。');
  const rankText = narrative?.rankZoneExplain || narrative?.zoneJudgement || rz.note || '当前分数和位次需要结合 2026 年一分一段、招生计划和专业备注再做人工复核。';
  const overallText = narrative?.overall || currentAnalysis.summary || '这套自选专业可以先作为家庭讨论稿，后续需要按当年位次、招生计划和专业备注逐条复核。';
  const narrativeCard = `<div class="analysis-ai-card">
    <div class="analysis-ai-head"><span>方案解读</span></div>
    <section class="analysis-ai-section"><h3>一句话结论</h3><p>${escapeHtml(overallText)}</p></section>
    <section class="analysis-ai-section"><h3>当前分数和位次定位</h3><p>${escapeHtml(rankText)}</p></section>
    <section class="analysis-ai-section"><h3>自选专业结构</h3><p>${escapeHtml(structureText)}</p></section>
    <section class="analysis-section"><h3>主要风险</h3>${risks.length ? listHtml(risks) : '<p>暂未发现必须立即处理的结构风险，但仍需按当年招生计划、学费、校区和专业备注人工复核。</p>'}</section>
    <section class="analysis-section"><h3>下一步调整建议</h3>${actions.length ? listHtml(actions) : '<p>建议先补齐考生位次、确认可接受城市和专业方向，再按主要参考与稳妥补充顺序逐条核验。</p>'}</section>
    ${narrative?.disclaimer ? `<div class="analysis-ai-disclaimer">${escapeHtml(narrative.disclaimer)}</div>` : ''}
  </div>`;
  const dataReview = `<details class="analysis-raw-details"><summary>展开查看前中后段快速复核</summary>
    <div class="analysis-mini-grid">
      <div><span>稍高目标</span><b>${escapeHtml(fmt(stats.rushCount))}</b></div>
      <div><span>主要参考</span><b>${escapeHtml(fmt(stats.stableCount))}</b></div>
      <div><span>稳妥补充</span><b>${escapeHtml(fmt(stats.safeCount))}</b></div>
      <div><span>稍高目标</span><b>${escapeHtml(fmt(stats.highRushCount))}</b></div>
      <div><span>推免参考匹配</span><b>${escapeHtml(fmt((currentAnalysis.pushRateSummary || currentAnalysis.facts?.pushRateSummary || {}).matchedCount))}</b></div>
    </div>
    ${(currentAnalysis.risks || []).length ? `<h3>需要关注</h3>${listHtml(currentAnalysis.risks)}` : ''}
    ${(currentAnalysis.actions || []).length ? `<h3>可调整方向</h3>${listHtml(currentAnalysis.actions)}` : ''}
  </details>`;
  const trendBox = renderSelectionTrendBox(trendSummary);
  root.innerHTML = toHumanCopy(`<div class="analysis-box">${staleNotice}${rankZoneCard}${trendBox}${narrativeCard}${dataReview}</div>`);
}

function renderReviewChecklistPanel() {
  const root = $('reviewChecklistPanel');
  if (!root) return;
  const state = getState();
  root.innerHTML = renderReviewChecklist(state.reviewChecklist || buildReviewChecklist(state.items || []));
}

function renderFeishuStatus() {
  const root = $('feishuSelectionStatus');
  if (!root) return;
  if (!feishuStatus) { root.innerHTML = ''; return; }
  const links = feishuStatus.url ? `<div class="pool-feishu-links">
    <a class="pool-feishu-link" href="${escapeHtml(feishuStatus.url)}" target="_blank" rel="noopener">打开报告文档</a>
    <button id="copyFeishuUrl" class="pool-feishu-link pool-feishu-copy" type="button">复制链接</button>
  </div>` : '';
  const detail = feishuStatus.detail ? `<details class="pool-feishu-tech"><summary>查看技术详情</summary><pre>${escapeHtml(feishuStatus.detail)}</pre></details>` : '';
  root.innerHTML = `<div class="pool-feishu-status ${feishuStatus.ok ? 'is-ok' : 'is-error'}">${escapeHtml(toHumanCopy(feishuStatus.message || ''))}${links}${detail}</div>`;
  $('copyFeishuUrl')?.addEventListener('click', async () => {
    if (!feishuStatus?.url) return;
    try {
      await navigator.clipboard.writeText(feishuStatus.url);
      feishuStatus = { ...feishuStatus, ok: true, message: '报告文档链接已复制。' };
    } catch {
      feishuStatus = { ...feishuStatus, ok: false, message: '浏览器不允许自动复制，请打开报告后手动复制链接。' };
    }
    renderFeishuStatus();
  });
}


function renderActionPanelState() {
  const state = getState();
  const root = $('selectionActionHint');
  if (!root) return;
  const hasItems = Boolean(state.items?.length);
  const hasScore = Boolean(state.candidateContext?.score);
  const fresh = analysisIsFresh(state);
  if (!hasItems) {
    root.innerHTML = '<div class="ln-action-hint is-empty">请先从查询页加入至少 1 个自选专业，再检查方案或生成报告。</div>';
    return;
  }
  if (!hasScore) {
    root.innerHTML = '<div class="ln-action-hint is-warn">请先确认考生分数。清单、检查和报告都会按这里的分数重新计算。</div>';
    return;
  }
  if (fresh) {
    root.innerHTML = '<div class="ln-action-hint is-ok">方案解读已按当前分数和顺序生成，可以直接生成解读版报告。</div>';
    return;
  }
  if (currentAnalysis) {
    root.innerHTML = '<div class="ln-action-hint is-warn">分数或顺序已变化，建议先重新检查这套方案，再生成解读版报告。</div>';
    return;
  }
  root.innerHTML = '<div class="ln-action-hint">建议先点击“检查这套方案”，再生成解读版或清单版报告。</div>';
}

function renderAll() {
  renderList();
  renderUndoStatus();
  renderActionPanelState();
  renderReviewChecklistPanel();
  renderAnalysis();
  renderFeishuStatus();
}

async function runAnalysis() {
  const button = $('runAnalysis');
  const state = getState();
  if (!state.items.length) { alert('请先加入至少 1 个自选专业。'); return; }
  if (!state.candidateContext.score) { alert('请先填写考生分数。'); return; }
  if (button) { button.disabled = true; button.textContent = '检查中…'; }
  try {
    const analysis = await requestPathAnalysis({
      items: state.items,
      rawItems: state.rawItems,
      candidateScore: state.score,
      candidateContext: state.candidateContext,
      contextSignature: state.candidateContext.signature,
      computedSignature: state.signature,
      orderSignature: state.orderSignature,
      bottomLineMode: state.bottomLineMode
    });
    const latest = getState();
    if (latest.signature === state.signature) {
      attachAnalysisFreshness(analysis, state);
    } else {
      currentAnalysis = null;
      currentAnalysisSignature = '';
      currentAnalysisScore = '';
      feishuStatus = { ok: false, message: '检查过程中排序或分数发生了变化，请重新点击“检查这套方案”。' };
    }
  } catch (error) {
    feishuStatus = { ok: false, message: '方案解读暂时生成失败。可以先检查自选专业和分数，稍后再试。', detail: error?.message || String(error) };
  } finally {
    const latest = getState();
    if (button) { button.disabled = !latest.items.length || !latest.candidateContext.score; button.textContent = '检查这套方案'; }
    renderAll();
  }
}

function createReportContext(state = getState()) {
  return { candidateScore: state.score || null, selectedCount: state.items?.length || 0, bottomLineMode: state.bottomLineMode || 'all', rangePreset: 'standard', activeBand: null, generatedAt: new Date().toISOString(), version: 'v3.9.20.7' };
}

function plainTextReport(state = getState()) {
  const lines = [];
  lines.push('辽宁 2026 物理类专业初选参考报告');
  lines.push('基于辽宁 2025 年物理类历史数据生成，用于家庭讨论和人工复核；正式填报以 2026 年一分一段、招生计划、院校招生章程和辽宁志愿填报系统为准。');
  lines.push('');
  lines.push(`考生分数：${state.score || '待填写'} 分`);
  lines.push(`自选专业数量：${state.items.length} 个`);
  lines.push(`结构概览：稍高目标 ${state.stats.rushCount || 0} 个｜主要参考 ${state.stats.stableCount || 0} 个｜稳妥补充 ${state.stats.safeCount || 0} 个`);
  lines.push('');
  lines.push('自选专业清单：');
  state.items.forEach((item, index) => {
    const sm = item.standardMajor || {};
    const code = sm.code && sm.name
      ? `专业代码：${sm.code}｜${sm.name}`
      : (sm.categoryCode && sm.categoryName && sm.mappingStatus === 'category' ? `专业类：${sm.categoryCode}｜${sm.categoryName}` : '专业代码：待人工复核');
    lines.push(`${index + 1}. ${item.school || '学校待核验'} · ${item.major || '专业待核验'}`);
    lines.push(`   ${code}`);
    lines.push(`   2025最低分：${fmt(item.score2025 ?? item.score)}｜2025最低位次：${fmt(item.rank2025 ?? item.rank)}｜相对孩子：${item.scoreDelta == null ? '待核验' : (Number(item.scoreDelta) >= 0 ? '+' : '') + fmt(item.scoreDelta)} 分`);
    lines.push(`   匹配关系：${item.poolBand?.detail || item.statusLabel || '待判断'}`);
    const review = Array.isArray(item.flags) && item.flags.length ? item.flags.slice(0, 3).join(' / ') : '招生计划、校区、学费、体检和专业备注需人工复核';
    lines.push(`   需要复核：${review}`);
  });
  lines.push('');
  lines.push('下一步建议：先确认孩子是否接受城市、学费、校区和专业方向，再按当年位次、招生计划和招生章程逐条人工复核。');
  return toHumanCopy(lines.join('\n'));
}

async function copyPlainTextReport() {
  const state = getState();
  if (!state.items.length) { alert('请先加入至少 1 个自选专业。'); return; }
  if (!state.candidateContext.score) { alert('请先填写考生分数。'); return; }
  const text = plainTextReport(state);
  try {
    await navigator.clipboard.writeText(text);
    feishuStatus = { ok: true, message: '文字版报告已复制，可以直接粘贴到微信、文档或表格中。' };
  } catch {
    feishuStatus = { ok: false, message: '浏览器不允许自动复制。下面已生成文字版报告，请手动复制。', detail: text };
  }
  renderFeishuStatus();
}

async function sendFeishu({ withAnalysis = false } = {}) {
  let state = getState();
  if (!state.items.length) { alert('请先加入至少 1 个自选专业。'); return; }
  if (!state.candidateContext.score) { alert('请先填写考生分数。'); return; }
  if (withAnalysis && !analysisIsFresh(state)) {
    const ok = confirm('当前还没有按最新分数和顺序完成方案检查。系统将先检查这套方案，再生成解读版报告。继续吗？');
    if (!ok) return;
  }
  const btn = withAnalysis ? $('sendAnalyzedPool') : $('sendSelectionPool');
  if (btn) { btn.disabled = true; btn.textContent = withAnalysis ? '生成报告中…' : '发送中…'; }
  feishuStatus = { ok: true, message: withAnalysis ? '正在按当前成绩口径重新计算，并生成解读版报告…' : '正在按当前成绩口径生成清单版报告…' };
  renderFeishuStatus();
  try {
    const reportState = state;
    let analysis = currentAnalysis;
    if (withAnalysis && !analysisIsFresh(reportState)) {
      analysis = await requestPathAnalysis({
        items: reportState.items,
        rawItems: reportState.rawItems,
        candidateScore: reportState.score,
        candidateContext: reportState.candidateContext,
        contextSignature: reportState.candidateContext.signature,
        computedSignature: reportState.signature,
        orderSignature: reportState.orderSignature,
        bottomLineMode: reportState.bottomLineMode
      });
      attachAnalysisFreshness(analysis, reportState);
    }
    state = reportState;
    const reportContext = createReportContext(state);
    const reportPayload = buildReportPayload({ selectedMajors: state.items, candidateScore: state.score, candidateContext: state.candidateContext, reportContext, mode: withAnalysis ? 'analysis' : 'list', analysis: withAnalysis && analysis ? analysis : null });
    const data = await createSelectionPoolFeishuReport({
      reportPayload,
      reportContext,
      reportType: withAnalysis ? 'selectionPoolWithAnalysis' : 'selectionPoolOnly',
      candidateScore: state.score,
      candidateContext: state.candidateContext,
      contextSignature: state.candidateContext.signature,
      computedSignature: state.signature,
      items: state.items,
      rawItems: state.rawItems,
      orderSignature: state.orderSignature,
      bottomLineMode: state.bottomLineMode,
      majorTrendSummary: state.majorTrendSummary || buildTrendSummaryForSelection(state.items, state.score),
      reviewChecklist: state.reviewChecklist || buildReviewChecklist(state.items),
      analysis: withAnalysis && analysis ? { ...analysis, majorTrendSummary: state.majorTrendSummary || buildTrendSummaryForSelection(state.items, state.score) } : null
    });
    const warningText = data.warning ? ` ${data.warning}` : '';
    feishuStatus = {
      ok: true,
      message: data.partial
        ? `报告文档已创建，但内容写入可能不完整。${data.permissionWarning || ''}`
        : withAnalysis
          ? `带解读的报告已生成，${data.sharePublic ? '已设置为获得链接的人可阅读。' : '共享权限需要人工确认。'}${warningText}`
          : `家庭讨论报告已生成，${data.sharePublic ? '已设置为获得链接的人可阅读。' : '共享权限需要人工确认。'}${warningText}`,
      url: data.url || ''
    };
  } catch (error) {
    feishuStatus = { ok: false, message: '报告暂时生成失败。可以先复制文字版报告，稍后再试。', detail: error?.message || String(error) };
  } finally {
    const latest = getState();
    if (btn) { btn.disabled = !latest.items.length || !latest.candidateContext.score; btn.textContent = withAnalysis ? '生成解读版报告' : '生成清单版报告'; }
    renderAll();
  }
}

function bind() {
  $('runAnalysis')?.addEventListener('click', runAnalysis);
  $('sendSelectionPool')?.addEventListener('click', () => sendFeishu({ withAnalysis: false }));
  $('sendAnalyzedPool')?.addEventListener('click', () => sendFeishu({ withAnalysis: true }));
  $('copySelectionText')?.addEventListener('click', copyPlainTextReport);
  $('sortByBand')?.addEventListener('click', () => {
    const state = getState();
    if (!state.items.length) return;
    if (!state.candidateContext.score) { alert('请先填写考生分数，再按当前成绩整理建议位置。'); return; }
    if (!confirm(`将按当前 ${state.candidateContext.score} 分口径，把当前自选专业按“稍高目标→主要参考→稳妥补充”的顺序重新整理。确认执行吗？`)) return;
    const before = snapshotPoolItems();
    const sorted = sortComputedByBand(state.items).map(stripComputedForStorage);
    savePoolItems(sorted);
    setUndoState('已按建议位置整理自选专业顺序。', before);
    afterOrderChanged();
  });
  $('clearPool')?.addEventListener('click', () => {
    if (!confirm('确定清空所有自选专业吗？清空后需要回到查询页重新加入。')) return;
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
    undoState = null;
    markChanged();
    renderAll();
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-undo-selection]')) { undoLastSelectionChange(); return; }
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

hydrateScoreFromUrl();
loadScore();
bind();
renderAll();
