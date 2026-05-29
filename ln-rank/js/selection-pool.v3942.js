import {
  clearPoolItems,
  getPoolItems,
  getPoolStats,
  movePoolItem,
  removePoolItem,
  classifyPoolItem
} from './feature/selection-pool/selection-pool-store.v3942.js';
import { requestPathAnalysis } from './feature/selection-pool/path-analysis-api.v3942.js';
import { createSelectionPoolFeishuReport } from './feature/selection-pool/feishu-selection-report-api.v3942.js';

const SCORE_KEY = 'lnRank.selectionPool.candidateScore.v3942';
const LEGACY_SCORE_KEYS = ['lnRank.selectionPool.candidateScore.v3941', 'lnRank.selectionPool.candidateScore.v3940'];
let currentAnalysis = null;
let feishuStatus = null;

function $(id) { return document.getElementById(id); }
function fmt(value) { const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—'; }
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
  return Number(raw) || null;
}

function readScoreFromInput() {
  const input = $('pathCandidateScore');
  const raw = input ? input.value.trim() : '';
  if (raw) localStorage.setItem(SCORE_KEY, raw);
  return Number(raw) || null;
}

function statHtml(stats) {
  return `<div class="pool-stats workspace-stats">
    <div><strong>${stats.total}</strong><span>总数</span></div>
    <div><strong>${stats.rushCount}</strong><span>冲刺</span></div>
    <div><strong>${stats.stableCount}</strong><span>稳妥</span></div>
    <div><strong>${stats.safeCount}</strong><span>保底</span></div>
  </div>`;
}

function itemHtml(item, index, total) {
  const band = item.poolBand || classifyPoolItem(item);
  const score = Number.isFinite(Number(item.score2025)) ? `${item.score2025} 分` : '分数待核验';
  const rank = Number.isFinite(Number(item.rank2025)) ? `位次 ${fmt(item.rank2025)}` : '位次待核验';
  const delta = Number.isFinite(Number(item.scoreDelta)) ? `相对考生 ${item.scoreDelta > 0 ? '+' : ''}${item.scoreDelta} 分` : '分差待核验';
  const location = item.displayLocation ? `<span>${escapeHtml(item.displayLocation)}</span>` : '';
  return `<article class="workspace-item band-${bandClass(item)}" data-id="${escapeHtml(item.id)}">
    <div class="workspace-order">${index + 1}</div>
    <div class="workspace-item-main">
      <div class="workspace-item-title"><span>${escapeHtml(item.school)}</span><b>·</b><span>${escapeHtml(item.major)}</span></div>
      <div class="workspace-item-meta">
        <span class="is-band">${band.detail}</span><span>${score}</span><span>${rank}</span><span>${delta}</span>${location}
      </div>
    </div>
    <div class="workspace-item-actions">
      <button class="workspace-mini-button" data-up="${escapeHtml(item.id)}" ${index === 0 ? 'disabled' : ''}>上移</button>
      <button class="workspace-mini-button" data-down="${escapeHtml(item.id)}" ${index === total - 1 ? 'disabled' : ''}>下移</button>
      <button class="workspace-mini-button danger" data-remove="${escapeHtml(item.id)}">删除</button>
    </div>
  </article>`;
}

function renderList() {
  const items = getPoolItems();
  const stats = getPoolStats(items);
  const statsRoot = $('workspaceStats');
  const listRoot = $('workspaceList');
  const sendOnly = $('sendSelectionPool');
  const sendAnalyzed = $('sendAnalyzedPool');
  const runAnalysis = $('runAnalysis');
  if (statsRoot) statsRoot.innerHTML = statHtml(stats);
  if (sendOnly) sendOnly.disabled = !items.length;
  if (sendAnalyzed) sendAnalyzed.disabled = !items.length;
  if (runAnalysis) runAnalysis.disabled = !items.length;
  if (!listRoot) return;
  listRoot.innerHTML = items.length
    ? items.map((item, index) => itemHtml(item, index, items.length)).join('')
    : '<div class="pool-empty">自选池为空。请返回查询页，先在专业卡片中点击“加入自选池”。</div>';

  listRoot.querySelectorAll('[data-up]').forEach(btn => btn.addEventListener('click', () => { movePoolItem(btn.dataset.up, 'up'); currentAnalysis = null; feishuStatus = null; renderAll(); }));
  listRoot.querySelectorAll('[data-down]').forEach(btn => btn.addEventListener('click', () => { movePoolItem(btn.dataset.down, 'down'); currentAnalysis = null; feishuStatus = null; renderAll(); }));
  listRoot.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => { removePoolItem(btn.dataset.remove); currentAnalysis = null; feishuStatus = null; renderAll(); }));
}

function renderAnalysis() {
  const root = $('analysisResult');
  if (!root) return;
  if (!currentAnalysis) {
    root.innerHTML = '<div class="pool-empty diagnose-empty">点击“检查当前排序”，系统会帮你看这套志愿是否冲得太多、稳得是否接得住、保底是否够用。</div>';
    return;
  }
  root.innerHTML = `<div class="analysis-box">
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
    <a class="pool-feishu-link" href="${escapeHtml(feishuStatus.url)}" target="_blank" rel="noopener">打开飞书报告</a>
    <button id="copyFeishuUrl" class="pool-feishu-link pool-feishu-copy" type="button">复制链接</button>
  </div>` : '';
  root.innerHTML = `<div class="pool-feishu-status ${feishuStatus.ok ? 'is-ok' : 'is-error'}">${escapeHtml(feishuStatus.message || '')}${links}</div>`;
  $('copyFeishuUrl')?.addEventListener('click', async () => {
    if (!feishuStatus?.url) return;
    try {
      await navigator.clipboard.writeText(feishuStatus.url);
      feishuStatus = { ...feishuStatus, ok: true, message: '飞书报告链接已复制。' };
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
  if (button) { button.disabled = true; button.textContent = '检查中…'; }
  try {
    currentAnalysis = await requestPathAnalysis({ items: getPoolItems(), candidateScore: readScoreFromInput() || loadScore() });
  } finally {
    if (button) { button.disabled = !getPoolItems().length; button.textContent = '检查当前排序'; }
    renderAll();
  }
}

async function sendFeishu({ withAnalysis = false } = {}) {
  const items = getPoolItems();
  if (!items.length) { alert('请先加入专业志愿。'); return; }
  const btn = withAnalysis ? $('sendAnalyzedPool') : $('sendSelectionPool');
  if (btn) { btn.disabled = true; btn.textContent = withAnalysis ? '生成报告中…' : '发送中…'; }
  feishuStatus = { ok: true, message: withAnalysis ? '正在检查当前排序，并生成飞书诊断报告…' : '正在生成当前排序飞书清单…' };
  renderFeishuStatus();
  try {
    let analysis = currentAnalysis;
    if (withAnalysis && !analysis) {
      analysis = await requestPathAnalysis({ items, candidateScore: readScoreFromInput() || loadScore() });
      currentAnalysis = analysis;
    }
    const data = await createSelectionPoolFeishuReport({
      reportType: withAnalysis ? 'selectionPoolWithAnalysis' : 'selectionPoolOnly',
      candidateScore: readScoreFromInput() || loadScore(),
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
  } finally {
    if (btn) { btn.disabled = !getPoolItems().length; btn.textContent = withAnalysis ? '发送诊断报告到飞书' : '发送当前排序到飞书'; }
    renderAll();
  }
}

function bind() {
  $('runAnalysis')?.addEventListener('click', runAnalysis);
  $('sendSelectionPool')?.addEventListener('click', () => sendFeishu({ withAnalysis: false }));
  $('sendAnalyzedPool')?.addEventListener('click', () => sendFeishu({ withAnalysis: true }));
  $('clearPool')?.addEventListener('click', () => {
    if (!confirm('确认清空自选池吗？')) return;
    clearPoolItems();
    currentAnalysis = null;
    feishuStatus = null;
    renderAll();
  });
  $('pathCandidateScore')?.addEventListener('input', () => readScoreFromInput());
}

loadScore();
bind();
renderAll();
