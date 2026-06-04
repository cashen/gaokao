import { state } from './state/app-state.js';
import { toInt } from './core/number-utils.v3912.js';
import { getScoreGuard } from './core/score-guard.v3912.js';
import { REGION_OPTIONS } from './config/region-options.v3912.js';
import { fetchMajorBands } from './feature/major-pool/major-bands-api.v3912.js';
import { renderBandTabs } from './feature/score-bands/score-bands-render.v3912.js';
import { renderMajorResults } from './feature/major-pool/major-pool-render.v3970.js';
import { buildKeywordQuery } from './feature/major-pool/keyword-parser.v3970.js';
import { initFeishuReport, renderFeishuReport, clearFeishuReport } from './feature/feishu/feishu-report-controller.v3916.js';
import { initSelectionPool, refreshSelectionPool, createSelectionPoolAdapter } from './feature/selection-pool/selection-pool-controller.v3970.js';

let hasQueried = false;
let dirty = false;
const selectionPool = createSelectionPoolAdapter();
document.body?.classList?.add('has-floating-pool-entry');
// v3.9.6.2：公办底线前端菜单只在【本科线 <= 分数 <= 特控线】显示。
// 2026 年公布后，应把这里替换为当年辽宁物理类本科线与特控线，禁止使用“特控线 + 10 分缓冲”。
const UNDERGRADUATE_CONTROL_SCORE = 367;
const SPECIAL_CONTROL_SCORE = 515;
const BOTTOMLINE_STORAGE_KEY = 'lnRank.bottomLineMode.v3970';
const BOTTOMLINE_MODES = new Set(['all', 'public_first', 'public_regular_only', 'public_include_sino']);

function normalizeBottomLineMode(value) {
  const key = String(value || '').trim();
  return BOTTOMLINE_MODES.has(key) ? key : 'all';
}

function shouldShowBottomLinePanel(score) {
  const n = Number(score);
  return Number.isFinite(n)
    && n >= UNDERGRADUATE_CONTROL_SCORE
    && n <= SPECIAL_CONTROL_SCORE;
}

function getEffectiveBottomLineMode(score = state.candidateScore) {
  return shouldShowBottomLinePanel(score) ? normalizeBottomLineMode(state.filters.bottomLineMode) : 'all';
}

function buildEffectiveFilters(score = state.candidateScore) {
  const majorKeyword = state.filters.majorKeyword || '';
  return {
    ...state.filters,
    majorKeyword,
    keywordQuery: buildKeywordQuery(majorKeyword),
    bottomLineMode: getEffectiveBottomLineMode(score)
  };
}

function bottomLineLabel(mode) {
  return ({
    all: '全部院校',
    public_first: '公办优先',
    public_regular_only: '只看公办普通',
    public_include_sino: '公办含中外/高收费'
  })[normalizeBottomLineMode(mode)] || '全部院校';
}

function rangePresetLabel(preset = state.rangePreset) {
  return ({ standard: '标准范围', wide: '放宽范围', safe: '保守范围' })[preset] || '标准范围';
}

function renderFilterSummary() {
  const root = document.getElementById('filterSummary');
  if (!root) return;
  const parts = [rangePresetLabel()];
  const regionSelect = document.getElementById('region');
  const regionText = regionSelect?.selectedOptions?.[0]?.textContent?.trim();
  parts.push(regionText && regionText !== '不限' ? `地域：${regionText}` : '地域不限');
  if (state.filters.schoolKeyword) parts.push(`学校：${state.filters.schoolKeyword}`);
  if (state.filters.majorKeyword) parts.push(`关键词：${state.filters.majorKeyword}`);
  const effectiveBottomLine = getEffectiveBottomLineMode(state.candidateScore);
  if (effectiveBottomLine !== 'all') parts.push(`公办底线：${bottomLineLabel(effectiveBottomLine)}`);
  root.textContent = `当前条件：${parts.join('｜')}`;
}

function loadBottomLineMode() {
  try { return normalizeBottomLineMode(localStorage.getItem(BOTTOMLINE_STORAGE_KEY)); } catch { return 'all'; }
}

function saveBottomLineMode(mode) {
  state.filters.bottomLineMode = normalizeBottomLineMode(mode);
  try { localStorage.setItem(BOTTOMLINE_STORAGE_KEY, state.filters.bottomLineMode); } catch {}
}

state.filters.bottomLineMode = loadBottomLineMode();

function resetVisible() {
  state.visible = { upper: 16, near: 16, steady: 16 };
}

function scoreInput() {
  return document.getElementById('candidateScore');
}

function parseScoreFromInput() {
  const input = scoreInput();
  const raw = input ? input.value.trim() : '';
  state.candidateScore = raw ? toInt(raw, null) : null;
  try { if (state.candidateScore) localStorage.setItem('lnRank.selectionPool.candidateScore.v3949', String(state.candidateScore)); } catch {}
  return state.candidateScore;
}

function guard() {
  parseScoreFromInput();
  return getScoreGuard(state.candidateScore);
}

function setReadyStatus(mode, text) {
  const badge = document.getElementById('appReadyBadge');
  if (!badge) return;
  badge.className = `ready-badge is-${mode}`;
  const label = badge.querySelector('.ready-text');
  if (label) label.textContent = text;
}

function setMessageFromGuard(g) {
  state.bands.loading = false;
  state.bands.error = null;
  state.bands.data = null;
  state.bands.title = g.resultTitle;
  state.bands.badge = g.resultBadge;
  state.bands.meta = g.key === 'normal' ? '等待点击查看' : '暂不查询专业池';
  state.bands.message = g.resultMessage;
  state.bands.noticeClass = `notice-${g.key}`;
}

function setActionButton() {
  const g = guard();
  const button = document.getElementById('queryButton');
  const guide = document.getElementById('queryGuide');
  if (!button) return;

  button.disabled = Boolean(state.bands.loading);

  if (state.bands.loading) {
    button.textContent = '正在查询…';
    button.className = 'query-button is-loading';
    if (guide) guide.textContent = '正在读取 /fenxi 专业数据，请稍候。';
    return;
  }

  if (state.bands.error) {
    button.textContent = '重新尝试';
    button.className = 'query-button is-error';
    if (guide) guide.textContent = '读取异常，可以检查网络或稍后重新尝试。';
    return;
  }

  if (!g.canQuery) {
    button.textContent = g.buttonText;
    button.className = `query-button is-${g.level}`;
    if (guide) guide.textContent = g.guide;
    return;
  }

  if (!hasQueried) {
    button.textContent = g.key === 'topRange' ? '查看高分段专业' : '查看符合条件的专业';
    button.className = `query-button is-ready is-primary is-${g.level}`;
    if (guide) guide.textContent = g.guide;
    return;
  }

  if (dirty) {
    button.textContent = '更新结果';
    button.className = `query-button is-ready is-primary is-${g.level}`;
    if (guide) guide.textContent = '筛选条件已变化，点击按钮更新下方结果。';
    return;
  }

  button.textContent = g.key === 'topRange' ? '查看高分段专业' : '查看符合条件的专业';
  button.className = `query-button is-ready is-${g.level}`;
  if (guide) guide.textContent = '可以继续调整地域、学校或专业关键词后更新结果。';
}

function renderRegionOptions() {
  const select = document.getElementById('region');
  if (!select) return;
  select.innerHTML = REGION_OPTIONS.map(o => `<option value="${o.key}">${o.label}</option>`).join('');
  select.value = state.filters.region;
}

function renderBottomLinePanel() {
  const panel = document.getElementById('bottomLinePanel');
  const summary = document.getElementById('bottomLineSummary');
  if (!panel) return;
  const score = state.candidateScore || parseScoreFromInput();
  const visible = shouldShowBottomLinePanel(score);
  panel.hidden = !visible;
  panel.classList.toggle('is-visible', visible);
  document.querySelectorAll('[data-bottomline-mode]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.bottomlineMode === state.filters.bottomLineMode);
  });
  if (summary) {
    summary.textContent = visible
      ? `当前处于本科线至特控线区间，可先确认公办底线；已选“${bottomLineLabel(state.filters.bottomLineMode)}”。筛选只缩小结果，不改变查看范围。`
      : score ? '当前分数不在本科线至特控线区间，前端不启用公办底线；中外上探由AI诊断和报告解释。' : '输入分数后，本科线至特控线区间会显示公办底线。';
  }
}

function renderAll() {
  renderBandTabs(state, (band) => {
    state.activeBand = band;
    clearFeishuReport();
    renderAll();
  });
  renderMajorResults(state, {
    onMore: (band) => {
      state.visible[band] = (state.visible[band] || 16) + 16;
      renderAll();
    },
    selectionPool,
    onSelectionChange: () => refreshSelectionPool(state)
  });
  renderFeishuReport(state);
  refreshSelectionPool(state);
  renderBottomLinePanel();
  renderFilterSummary();
  setActionButton();
}

function markDirty() {
  const g = guard();
  dirty = true;
  resetVisible();
  clearFeishuReport();

  if (!g.canQuery) {
    setMessageFromGuard(g);
    setReadyStatus(g.level === 'warn' ? 'loading' : 'ready', g.statusText);
  } else {
    setReadyStatus(g.key === 'topRange' ? 'ready' : 'ready', g.key === 'topRange' ? '高分段' : '条件已变化');
  }

  renderAll();
}

async function loadData() {
  const g = guard();

  if (!g.canQuery) {
    setMessageFromGuard(g);
    setReadyStatus(g.level === 'warn' ? 'loading' : 'ready', g.statusText);
    renderAll();
    if (g.key === 'empty') scoreInput()?.focus();
    return;
  }

  state.bands.loading = true;
  state.bands.error = null;
  state.bands.message = '';
  state.bands.noticeClass = '';
  setReadyStatus('loading', '正在查询');
  renderAll();

  try {
    state.bands.data = await fetchMajorBands({
      candidateScore: state.candidateScore,
      rangePreset: state.rangePreset,
      filters: buildEffectiveFilters(state.candidateScore)
    });
    hasQueried = true;
    dirty = false;
    clearFeishuReport();
    setReadyStatus('ready', g.key === 'topRange' ? '高分段完成' : '查询完成');
    document.getElementById('resultsPanel')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  } catch (error) {
    state.bands.error = error.message || String(error);
    state.bands.data = null;
    setReadyStatus('error', '查询异常');
  } finally {
    state.bands.loading = false;
    renderAll();
  }
}

function appendMajorKeyword(word) {
  const input = document.getElementById('majorKeyword');
  if (!input || !word) return;
  const current = String(input.value || '').trim();
  const parts = current.split(/[,\s，、/；;|]+/).map(s => s.trim()).filter(Boolean);
  if (!parts.includes(word)) {
    input.value = current ? `${current}/${word}` : word;
  }
  state.filters.majorKeyword = input.value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function bind() {
  const input = scoreInput();

  parseScoreFromInput();

  const onScoreChanged = () => {
    const g = guard();
    if (!g.canQuery) {
      hasQueried = false;
      dirty = false;
      clearFeishuReport();
      setMessageFromGuard(g);
      setReadyStatus(g.level === 'warn' ? 'loading' : 'ready', g.statusText);
      renderAll();
      return;
    }
    markDirty();
  };

  ['input', 'change', 'keyup', 'paste', 'compositionend', 'blur'].forEach((eventName) => {
    input.addEventListener(eventName, () => setTimeout(onScoreChanged, 0));
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadData();
    }
  });

  document.getElementById('rangeButtons').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-preset]');
    if (!btn) return;
    state.rangePreset = btn.dataset.preset;
    document.querySelectorAll('[data-preset]').forEach(el => el.classList.toggle('is-active', el === btn));
    markDirty();
  });

  document.getElementById('bottomLinePanel')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-bottomline-mode]');
    if (!btn) return;
    saveBottomLineMode(btn.dataset.bottomlineMode);
    markDirty();
  });

  document.getElementById('region').addEventListener('change', (event) => {
    state.filters.region = event.target.value;
    markDirty();
  });

  document.getElementById('schoolKeyword').addEventListener('input', (event) => {
    state.filters.schoolKeyword = event.target.value;
    markDirty();
  });

  document.getElementById('majorKeyword').addEventListener('input', (event) => {
    state.filters.majorKeyword = event.target.value;
    markDirty();
  });

  document.querySelectorAll('[data-major-keyword-chip]').forEach(btn => {
    btn.addEventListener('click', () => appendMajorKeyword(btn.dataset.majorKeywordChip));
  });

  document.getElementById('queryButton').addEventListener('click', (event) => {
    event.preventDefault();
    loadData();
  });
}

renderRegionOptions();
renderBottomLinePanel();
initFeishuReport(state);
initSelectionPool(state, { onChanged: () => renderAll() });
setReadyStatus('ready', '程序就绪');
bind();
setMessageFromGuard(guard());
renderAll();
