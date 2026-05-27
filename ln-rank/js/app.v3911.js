import { state } from './state/app-state.js';
import { toInt } from './core/number-utils.v3911.js';
import { REGION_OPTIONS } from './config/region-options.v3911.js';
import { fetchMajorBands } from './feature/major-pool/major-bands-api.v3911.js';
import { renderBandTabs } from './feature/score-bands/score-bands-render.v3911.js';
import { renderMajorResults } from './feature/major-pool/major-pool-render.v3911.js';

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

function hasValidScore() {
  const n = Number(state.candidateScore);
  return Number.isFinite(n) && n > 0;
}

function setReadyStatus(mode, text) {
  const badge = document.getElementById('appReadyBadge');
  if (!badge) return;
  badge.className = `ready-badge is-${mode}`;
  const label = badge.querySelector('.ready-text');
  if (label) label.textContent = text;
}

function setActionButton() {
  parseScoreFromInput();

  const button = document.getElementById('queryButton');
  const guide = document.getElementById('queryGuide');
  if (!button) return;

  // 不再因为“未识别到分数”而禁用按钮。
  // 这样即使浏览器没有触发 input 事件，用户点按钮时也会重新读取输入框当前值。
  button.disabled = Boolean(state.bands.loading);

  if (!hasValidScore()) {
    button.textContent = '输入分数后查看专业';
    button.className = 'query-button is-waiting';
    if (guide) guide.textContent = '请先输入考生分数，例如 520。输入后可直接点击按钮查看专业。';
    return;
  }

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

  if (!hasQueried) {
    button.textContent = '查看符合条件的专业';
    button.className = 'query-button is-ready is-primary';
    if (guide) guide.textContent = '点击后，结果会显示在下方专业列表。也可以直接按 Enter。';
    return;
  }

  if (dirty) {
    button.textContent = '更新结果';
    button.className = 'query-button is-ready is-primary';
    if (guide) guide.textContent = '筛选条件已变化，点击按钮更新下方结果。';
    return;
  }

  button.textContent = '查看符合条件的专业';
  button.className = 'query-button is-ready';
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
    renderAll();
  });
  renderMajorResults(state, {
    onMore: (band) => {
      state.visible[band] = (state.visible[band] || 16) + 16;
      renderAll();
    }
  });
  setActionButton();
}

function markDirty() {
  parseScoreFromInput();
  dirty = true;
  resetVisible();
  setReadyStatus('ready', hasValidScore() ? '条件已变化' : '程序就绪');
  renderAll();
}

async function loadData() {
  parseScoreFromInput();

  if (!hasValidScore()) {
    state.bands.loading = false;
    state.bands.error = null;
    state.bands.data = null;
    state.bands.message = '请输入考生分数后查看专业列表。';
    setReadyStatus('ready', '程序就绪');
    renderAll();
    scoreInput()?.focus();
    return;
  }

  state.bands.loading = true;
  state.bands.error = null;
  state.bands.message = '';
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
    setReadyStatus('ready', '查询完成');
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
    parseScoreFromInput();
    if (!hasValidScore()) {
      state.bands.data = null;
      state.bands.error = null;
      state.bands.loading = false;
      hasQueried = false;
      dirty = false;
      setReadyStatus('ready', '程序就绪');
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
setReadyStatus('ready', '程序就绪');
bind();
renderAll();
