import {
  clearPoolItems,
  getPoolItems,
  getPoolStats,
  movePoolItem,
  removePoolItem,
  classifyPoolItem
} from './feature/selection-pool/selection-pool-store.v3940.js';
import { requestPathAnalysis } from './feature/selection-pool/path-analysis-api.v3940.js';

const SCORE_KEY = 'lnRank.selectionPool.candidateScore.v3940';
let currentAnalysis = null;

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
  const raw = localStorage.getItem(SCORE_KEY) || '';
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
  const score = Number.isFinite(Number(item.score2025)) ? `${item.score2025} 分` : '分数缺失';
  const rank = Number.isFinite(Number(item.rank2025)) ? `位次 ${fmt(item.rank2025)}` : '位次缺失';
  const delta = Number.isFinite(Number(item.scoreDelta)) ? `相对考生 ${item.scoreDelta > 0 ? '+' : ''}${item.scoreDelta} 分` : '分差缺失';
  return `<article class="workspace-item band-${bandClass(item)}" data-id="${escapeHtml(item.id)}">
    <div class="workspace-order">${index + 1}</div>
    <div>
      <div class="workspace-item-title">${escapeHtml(item.school)}</div>
      <div class="workspace-item-major">${escapeHtml(item.major)}</div>
      <div class="workspace-item-meta">
        <span>${band.detail}</span><span>${score}</span><span>${rank}</span><span>${delta}</span>${item.displayLocation ? `<span>${escapeHtml(item.displayLocation)}</span>` : ''}
      </div>
    </div>
    <div class="workspace-item-actions">
      <button class="workspace-mini-button" data-up="${escapeHtml(item.id)}" ${index === 0 ? 'disabled' : ''}>上移</button>
      <button class="workspace-mini-button" data-down="${escapeHtml(item.id)}" ${index === total - 1 ? 'disabled' : ''}>下移</button>
      <button class="workspace-mini-button" data-remove="${escapeHtml(item.id)}">删除</button>
    </div>
  </article>`;
}

function renderList() {
  const items = getPoolItems();
  const stats = getPoolStats(items);
  const statsRoot = $('workspaceStats');
  const listRoot = $('workspaceList');
  if (statsRoot) statsRoot.innerHTML = statHtml(stats);
  if (!listRoot) return;
  listRoot.innerHTML = items.length
    ? items.map((item, index) => itemHtml(item, index, items.length)).join('')
    : '<div class="pool-empty">自选池为空。请返回首页查询专业，并点击“加入自选池”。</div>';

  listRoot.querySelectorAll('[data-up]').forEach(btn => btn.addEventListener('click', () => { movePoolItem(btn.dataset.up, 'up'); currentAnalysis = null; renderAll(); }));
  listRoot.querySelectorAll('[data-down]').forEach(btn => btn.addEventListener('click', () => { movePoolItem(btn.dataset.down, 'down'); currentAnalysis = null; renderAll(); }));
  listRoot.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => { removePoolItem(btn.dataset.remove); currentAnalysis = null; renderAll(); }));
}

function renderAnalysis() {
  const root = $('analysisResult');
  if (!root) return;
  if (!currentAnalysis) {
    root.innerHTML = '<div class="pool-empty">点击“生成路径分析”后，这里会输出整体判断、冲稳保风险、调整建议和可复制报告文本。</div>';
    return;
  }
  root.innerHTML = `<div class="analysis-box">
    <div class="analysis-summary">${escapeHtml(currentAnalysis.summary || '')}</div>
    ${(currentAnalysis.sections || []).map(section => `<div class="analysis-section"><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.content)}</p></div>`).join('')}
    <div class="analysis-section"><h3>主要风险</h3><ol class="analysis-list">${(currentAnalysis.risks || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol></div>
    <div class="analysis-section"><h3>调整建议</h3><ol class="analysis-list">${(currentAnalysis.actions || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol></div>
    <textarea id="reportText" class="report-textarea" readonly>${escapeHtml(currentAnalysis.reportText || '')}</textarea>
  </div>`;
}

function renderAll() {
  renderList();
  renderAnalysis();
}

async function runAnalysis() {
  const button = $('runAnalysis');
  if (button) { button.disabled = true; button.textContent = '分析中…'; }
  try {
    currentAnalysis = await requestPathAnalysis({ items: getPoolItems(), candidateScore: readScoreFromInput() || loadScore() });
  } finally {
    if (button) { button.disabled = false; button.textContent = '生成路径分析'; }
    renderAll();
  }
}

function bind() {
  $('runAnalysis')?.addEventListener('click', runAnalysis);
  $('clearPool')?.addEventListener('click', () => {
    if (!confirm('确认清空自选池吗？')) return;
    clearPoolItems();
    currentAnalysis = null;
    renderAll();
  });
  $('copyReport')?.addEventListener('click', async () => {
    const text = currentAnalysis?.reportText || $('reportText')?.value || '';
    if (!text) { alert('请先生成路径分析。'); return; }
    try {
      await navigator.clipboard.writeText(text);
      alert('报告文本已复制，可直接粘贴到飞书文档。');
    } catch {
      alert('浏览器不允许自动复制，请手动选中报告文本复制。');
    }
  });
  $('downloadJson')?.addEventListener('click', () => {
    const payload = { version: 'v3.9.40', candidateScore: readScoreFromInput(), items: getPoolItems(), analysis: currentAnalysis };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ln-rank-selection-pool-v3940.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  });
  $('pathCandidateScore')?.addEventListener('input', () => readScoreFromInput());
}

loadScore();
bind();
renderAll();
