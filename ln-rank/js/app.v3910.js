import { state } from './state/app-state.js';
import { toInt } from './core/number-utils.v3910.js';
import { REGION_OPTIONS } from './config/region-options.v3910.js';
import { fetchMajorBands } from './feature/major-pool/major-bands-api.v3910.js';
import { renderBandTabs } from './feature/score-bands/score-bands-render.v3910.js';
import { renderMajorResults } from './feature/major-pool/major-pool-render.v3910.js';

let hasQueried = false;
let dirty = false;

function resetVisible() {
  state.visible = { upper: 16, near: 16, steady: 16 };
}

function parseScoreFromInput() {
  const input = document.getElementById('candidateScore');
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
  const button = document.getElementById('queryButton');
  const guide = document.getElementById('queryGuide');
  if (!button) return;

  button.disabled = state.bands.loading || !hasValidScore();

  if (!hasValidScore()) {
    button.textContent = '请输入分数后查看';
    button.className = 'query-button is-disabled';
    if (guide) guide.textContent = '第一步：在上方输入考生分数。输入后这个按钮会变成可点击。';
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
    if (guide) guide.textContent = '点击按钮后，结果会显示在下方专业列表。';
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
  const input = document.getElementById('candidateScore');

  // 不预设 520，但如果浏览器自动保留了输入值，要读进 state，避免按钮仍然灰。
  parseScoreFromInput();

  input.addEventListener('input', () => {
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
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loadData();
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

  document.getElementById('queryButton').addEventListener('click', loadData);
}

renderRegionOptions();
setReadyStatus('ready', '程序就绪');
bind();
renderAll();
