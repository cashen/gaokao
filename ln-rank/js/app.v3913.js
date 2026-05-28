import { state } from './state/app-state.js';
import { toInt } from './core/number-utils.v3912.js';
import { getScoreGuard } from './core/score-guard.v3912.js';
import { REGION_OPTIONS } from './config/region-options.v3912.js';
import { fetchMajorBands } from './feature/major-pool/major-bands-api.v3912.js';
import { renderBandTabs } from './feature/score-bands/score-bands-render.v3912.js';
import { renderMajorResults } from './feature/major-pool/major-pool-render.v3912.js';
import { initFeishuReport, renderFeishuReport, clearFeishuReport } from './feature/feishu/feishu-report-controller.v3913.js';

let hasQueried = false;
let dirty = false;

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
    }
  });
  renderFeishuReport(state);
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
      filters: state.filters
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

  document.getElementById('queryButton').addEventListener('click', (event) => {
    event.preventDefault();
    loadData();
  });
}

renderRegionOptions();
initFeishuReport(state);
setReadyStatus('ready', '程序就绪');
bind();
setMessageFromGuard(guard());
renderAll();
