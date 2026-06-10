import { state } from './state/app-state.js?v=3923_1';
import { toInt } from './core/number-utils.js?v=3923_1';
import { getScoreGuard } from './core/score-guard.js?v=3923_1';
import { REGION_OPTIONS } from './config/region-options.js?v=3923_1';
import { fetchMajorBands } from './feature/major-pool/index.js?v=3923_1';
import { renderBandLegend, renderResultBandSwitcher } from './feature/score-bands/index.js?v=3923_1';
import { renderMajorResults } from './feature/major-pool/index.js?v=3923_1';
import { buildKeywordQuery } from './feature/major-pool/index.js?v=3923_1';
import { mountKeywordPresetPanel } from './feature/major-pool/index.js?v=3923_1';
import { initFeishuReport, renderFeishuReport, clearFeishuReport } from './feature/feishu/index.js?v=3923_1';
import { initSelectionPool, refreshSelectionPool, createSelectionPoolAdapter } from './feature/selection-pool/index.js?v=3923_1';
import { renderSearchTrendHint } from './feature/trend/index.js?v=3923_1';
import { getQueryButtonLabel, getQueryButtonClass, initBottomLineSheet, bottomLineLabel as uiBottomLineLabel, initRankBandLegend } from './feature/ui/index.js?v=3923_1';
import { getRangePresetLabel } from './domain/range-policy.js?v=3923_1';
import { getBandFocusLabel } from './domain/band-policy.js?v=3923_1';
import { setRangePreset, setBandFocus, syncRangeState } from './state/range-state.js?v=3923_1';
import { syncControlConsoleState } from './ui/control-console.js?v=3923_1';
import { normalizeMajorBandsResponse } from './domain/score-band-contract.js?v=3923_1';
import { normalizeSpecialProjectMode, SPECIAL_PROJECT_STORAGE_KEY, SPECIAL_PROJECT_HIDE_MODE, SPECIAL_PROJECT_SHOW_MODE, specialProjectStatusCopy, specialProjectToggleLabel, specialProjectHelpCopy } from './domain/special-project-policy.js?v=3923_1';
import { initDirectionExplorer } from './feature/direction-explorer/direction-explorer-render.js?v=3923_1';

let hasQueried = false;
let dirty = false;
const selectionPool = createSelectionPoolAdapter();
syncRangeState(state);
document.body?.classList?.add('has-floating-pool-entry','ln-new-parent-flow');
// v3.9.16：公办底线前端菜单只在【本科线 <= 分数 <= 特控线】显示。
// 2026 年公布后，应把这里替换为当年辽宁物理类本科线与特控线，禁止使用“特控线 + 10 分缓冲”。
const UNDERGRADUATE_CONTROL_SCORE = 367;
const SPECIAL_CONTROL_SCORE = 515;
const BOTTOMLINE_STORAGE_KEY = 'lnRank.bottomLineMode.current';
const BOTTOMLINE_LEGACY_KEYS = ['lnRank.bottomLineMode.v3980', 'lnRank.bottomLineMode.v3962', 'lnRank.bottomLineMode.v3960', 'lnRank.bottomLineMode.v3912'];
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
    bottomLineMode: getEffectiveBottomLineMode(score),
    specialProjectMode: normalizeSpecialProjectMode(state.filters.specialProjectMode)
  };
}

function bottomLineLabel(mode) { return uiBottomLineLabel(normalizeBottomLineMode(mode)); }

function rangePresetLabel(preset = state.rangePreset) { return getRangePresetLabel(preset); }
function bandFocusLabel(band = state.bandFocus || state.activeBand) { return getBandFocusLabel(band); }

function renderFilterSummary() {
  const root = document.getElementById('filterSummary');
  if (!root) return;
  const parts = [`${rangePresetLabel()}`, `${bandFocusLabel()}`];
  const regionSelect = document.getElementById('region');
  const regionText = regionSelect?.selectedOptions?.[0]?.textContent?.trim();
  parts.push(regionText && regionText !== '不限' ? `${regionText}` : '地区不限');
  if (state.filters.schoolKeyword) parts.push(`学校：${state.filters.schoolKeyword}`);
  if (state.filters.majorKeyword) parts.push(`关键词：${state.filters.majorKeyword}`); else parts.push('未限定专业方向');
  const effectiveBottomLine = getEffectiveBottomLineMode(state.candidateScore);
  parts.push(effectiveBottomLine !== 'all' ? `${bottomLineLabel(effectiveBottomLine)}` : '全部院校');
  parts.push(normalizeSpecialProjectMode(state.filters.specialProjectMode) === SPECIAL_PROJECT_SHOW_MODE ? '特殊项目：已显示' : '特殊项目：默认隐藏');
  root.textContent = `当前查看：${parts.join('｜')}`;
}

function loadBottomLineMode() {
  try {
    const current = localStorage.getItem(BOTTOMLINE_STORAGE_KEY);
    if (current) return normalizeBottomLineMode(current);
    const legacy = BOTTOMLINE_LEGACY_KEYS.map(k => localStorage.getItem(k)).find(Boolean);
    return normalizeBottomLineMode(legacy);
  } catch { return 'all'; }
}

function saveBottomLineMode(mode) {
  state.filters.bottomLineMode = normalizeBottomLineMode(mode);
  try { localStorage.setItem(BOTTOMLINE_STORAGE_KEY, state.filters.bottomLineMode); } catch {}
}

function loadSpecialProjectMode() {
  try { return normalizeSpecialProjectMode(localStorage.getItem(SPECIAL_PROJECT_STORAGE_KEY)); } catch { return SPECIAL_PROJECT_HIDE_MODE; }
}

function saveSpecialProjectMode(mode) {
  state.filters.specialProjectMode = normalizeSpecialProjectMode(mode);
  try { localStorage.setItem(SPECIAL_PROJECT_STORAGE_KEY, state.filters.specialProjectMode); } catch {}
}

state.filters.bottomLineMode = loadBottomLineMode();
state.filters.specialProjectMode = loadSpecialProjectMode();
let bottomLineSheetController = null;
let directionExplorerController = null;

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
  try {
    if (state.candidateScore) {
      localStorage.setItem('lnRank.selectionPool.candidateScore', String(state.candidateScore));
      localStorage.setItem('lnRank.selectionPool.candidateScore.v3949', String(state.candidateScore));
    } else {
      localStorage.removeItem('lnRank.selectionPool.candidateScore');
    }
  } catch {}
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

function syncMobileDirtyBar(g) {
  const bar = document.getElementById('mobileDirtyBar');
  if (!bar) return;
  const keyword = state.filters.majorKeyword ? `｜${state.filters.majorKeyword}` : '';
  const show = Boolean(dirty && g?.canQuery);
  bar.hidden = !show;
  bar.classList.toggle('is-visible', show);
  const text = bar.querySelector('.mobile-dirty-text');
  if (text) text.textContent = `当前条件已变化${keyword}`;
}

function setActionButton() {
  const g = guard();
  document.body.classList.toggle('is-filter-dirty', Boolean(dirty && g.canQuery));
  syncMobileDirtyBar(g);
  const button = document.getElementById('queryButton');
  const guide = document.getElementById('queryGuide');
  if (!button) return;

  button.disabled = Boolean(state.bands.loading);

  if (state.bands.loading) {
    button.textContent = '正在查找可讨论专业…';
    button.className = getQueryButtonClass({ loading: true });
    if (guide) guide.textContent = '正在查找可讨论专业，请稍候。';
    return;
  }

  if (state.bands.error) {
    button.textContent = '重新尝试';
    button.className = getQueryButtonClass({ error: true });
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
    button.textContent = getQueryButtonLabel({ hasQueried, dirty: false, topRange: g.key === 'topRange' });
    button.className = getQueryButtonClass({ ready: true, level: g.level, primary: true });
    if (guide) guide.textContent = g.guide;
    return;
  }

  if (dirty) {
    button.textContent = getQueryButtonLabel({ hasQueried, dirty: true, topRange: g.key === 'topRange' });
    button.className = getQueryButtonClass({ ready: true, level: g.level, primary: true });
    if (guide) guide.textContent = '条件已变化，点击后会按新条件重新查看。';
    return;
  }

  button.textContent = getQueryButtonLabel({ hasQueried, dirty: false, topRange: g.key === 'topRange' });
  button.className = getQueryButtonClass({ ready: true, level: g.level, primary: true });
  if (guide) guide.textContent = '已按当前条件更新结果，可继续调整后重新查看。';
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
  const mobileLabel = document.getElementById('bottomLineMobileLabel');
  if (mobileLabel) mobileLabel.textContent = bottomLineLabel(state.filters.bottomLineMode);
  bottomLineSheetController?.sync?.();
  if (summary) {
    summary.textContent = visible
      ? `这个分数段建议先看清学校性质、学费和校区。当前已选择：${bottomLineLabel(state.filters.bottomLineMode)}。`
      : score ? '当前分数不在本科线—特控线区间，前端不启用办学性质提醒。' : '输入分数后，本科线—特控线区间会显示办学性质提醒。';
  }
}


function renderSpecialProjectPanel() {
  const panel = document.getElementById('specialProjectPanel');
  if (!panel) return;
  const mode = normalizeSpecialProjectMode(state.filters.specialProjectMode);
  const hidden = Number(state.bands?.data?.source?.specialProjectHidden || state.bands?.data?.source?.specialProjectStats?.hidden || 0);
  panel.dataset.mode = mode;
  panel.classList.toggle('is-showing', mode === SPECIAL_PROJECT_SHOW_MODE);
  const status = document.getElementById('specialProjectStatus');
  const help = document.getElementById('specialProjectHelp');
  const toggle = document.getElementById('specialProjectToggle');
  if (status) status.textContent = specialProjectStatusCopy(mode, hidden);
  if (help) help.textContent = specialProjectHelpCopy(mode);
  if (toggle) toggle.textContent = specialProjectToggleLabel(mode);
}

function renderAll() {
  syncRangeState(state);
  syncControlConsoleState(state);
  renderBandLegend(state);
  renderResultBandSwitcher(state, (band) => {
    if (!band || state.activeBand === band) return;
    setBandFocus(state, band);
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
  renderSpecialProjectPanel();
  renderSearchTrendHint(document.getElementById('majorTrendHint'), { score: state.candidateScore, keyword: state.filters.majorKeyword });
  directionExplorerController?.render?.();
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
    const rawBandsResponse = await fetchMajorBands({
      candidateScore: state.candidateScore,
      rangePreset: state.rangePreset,
      filters: buildEffectiveFilters(state.candidateScore)
    });
    state.bands.data = normalizeMajorBandsResponse(rawBandsResponse, {
      candidateScore: state.candidateScore,
      rangePreset: state.rangePreset
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


function setMajorKeywordFromDirectionExplorer(value) {
  const input = document.getElementById('majorKeyword');
  if (!input) return;
  input.value = value || '';
  state.filters.majorKeyword = input.value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function removeDirectionExplorerKeywords(applied = {}) {
  const input = document.getElementById('majorKeyword');
  if (!input) return;
  const removeSource = Array.isArray(applied.addedKeywords) ? applied.addedKeywords : (applied.keywords || []);
  const remove = new Set(removeSource.map(x => String(x || '').trim()).filter(Boolean));
  if (!remove.size) return;
  const current = String(input.value || '').split(/[,\s，、/；;|]+/).map(x => x.trim()).filter(Boolean);
  const next = current.filter(word => !remove.has(word));
  input.value = next.join('/');
  state.filters.majorKeyword = input.value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function initDirectionExplorerBridge() {
  directionExplorerController = initDirectionExplorer({
    entryMount: document.getElementById('directionExplorerEntryMount'),
    panelMount: document.getElementById('directionExplorerPanelMount'),
    getMajorKeyword: () => state.filters.majorKeyword || document.getElementById('majorKeyword')?.value || '',
    setMajorKeyword: (value) => setMajorKeywordFromDirectionExplorer(value),
    onApplied: () => {
      const g = guard();
      if (g.canQuery) loadData();
      else markDirty();
    },
    onCleared: (applied) => {
      removeDirectionExplorerKeywords(applied || {});
      markDirty();
    }
  });
  if (location.hash === '#direction-explorer') {
    setTimeout(() => {
      document.getElementById('direction-explorer')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      directionExplorerController?.highlightEntry?.();
    }, 160);
  }
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


  window.addEventListener('lnrank:band-focus-request', (event) => {
    const band = event?.detail?.band;
    if (!band || state.activeBand === band) return;
    setBandFocus(state, band);
    clearFeishuReport();
    renderAll();
  });

  document.getElementById('rangeButtons').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-preset]');
    if (!btn) return;
    setRangePreset(state, btn.dataset.preset, { resetBand: true });
    markDirty();
  });

  document.getElementById('bottomLinePanel')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-bottomline-mode]');
    if (!btn) return;
    saveBottomLineMode(btn.dataset.bottomlineMode);
    markDirty();
  });

  document.getElementById('specialProjectToggle')?.addEventListener('click', (event) => {
    event.preventDefault();
    const current = normalizeSpecialProjectMode(state.filters.specialProjectMode);
    saveSpecialProjectMode(current === SPECIAL_PROJECT_SHOW_MODE ? SPECIAL_PROJECT_HIDE_MODE : SPECIAL_PROJECT_SHOW_MODE);
    markDirty();
  });

  bottomLineSheetController = initBottomLineSheet({
    getMode: () => state.filters.bottomLineMode,
    setMode: (mode) => saveBottomLineMode(mode),
    onApply: () => markDirty()
  });
  initRankBandLegend();

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

  mountKeywordPresetPanel(document.getElementById('keywordPresetMount'), { onKeyword: appendMajorKeyword });

  document.getElementById('queryButton').addEventListener('click', (event) => {
    event.preventDefault();
    loadData();
  });
  document.getElementById('mobileDirtyButton')?.addEventListener('click', (event) => {
    event.preventDefault();
    loadData();
  });
  document.getElementById('majorKeyword')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadData();
    }
  });
}

renderRegionOptions();
renderBottomLinePanel();
initFeishuReport(state);
initSelectionPool(state, { onChanged: () => renderAll() });
setReadyStatus('ready', '数据已准备好');
initDirectionExplorerBridge();
bind();
setMessageFromGuard(guard());
renderAll();
