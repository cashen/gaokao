const DATA_URL = '/ln-rank/data/major-trend-2026.json';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function directionState(row, threshold) {
  const value = Number(row?.medianRelativePctPoint26vs25);
  if (!Number.isFinite(value)) {
    return { key: 'stable', title: '暂时看不出明显变化', short: '变化不明显', explanation: '现有可比较记录不足以给出清楚方向。' };
  }
  const t = Number.isFinite(Number(threshold)) ? Number(threshold) : 1;
  if (value < -t) {
    const strong = Math.abs(value) >= t * 2.2;
    return {
      key: 'harder',
      title: strong ? '相比多数专业，明显更难报了' : '相比多数专业，有所变难',
      short: strong ? '明显更难报' : '有所变难',
      explanation: '2026年达到这类专业通常需要更靠前的位次。'
    };
  }
  if (value > t) {
    const strong = Math.abs(value) >= t * 2.2;
    return {
      key: 'easier',
      title: strong ? '相比多数专业，明显更容易报了' : '相比多数专业，有所变容易',
      short: strong ? '明显更容易报' : '有所变容易',
      explanation: '2026年达到这类专业所需位次相对没有多数专业那么靠前。'
    };
  }
  return {
    key: 'stable',
    title: '和多数专业的变化接近',
    short: '变化不明显',
    explanation: '现有历史记录看不出明显变难或变容易。'
  };
}

function sampleSentence(row) {
  const total = Number(row?.sampleCount) || 0;
  const harder = Math.round(total * (Number(row?.relativeForwardRate2026) || 0) / 100);
  const easier = Math.round(total * (Number(row?.relativeBackwardRate2026) || 0) / 100);
  const stable = Math.max(0, total - harder - easier);
  const largest = Math.max(harder, easier, stable);
  if (!total) return '可比较记录不足。';
  if (largest === harder && harder / total >= 0.7) return `${fmt(total)}个可比较专业中，约${fmt(harder)}个都表现为更难报。`;
  if (largest === easier && easier / total >= 0.7) return `${fmt(total)}个可比较专业中，约${fmt(easier)}个都表现为更容易报。`;
  if (largest === stable && stable / total >= 0.45) return `${fmt(total)}个可比较专业中，约${fmt(stable)}个变化不明显。`;
  return `${fmt(total)}个可比较专业中，更难报约${fmt(harder)}个，更容易报约${fmt(easier)}个，变化不明显约${fmt(stable)}个。`;
}

function dataDetails(row) {
  const total = Number(row?.sampleCount) || 0;
  const harder = Number(row?.relativeForwardRate2026) || 0;
  const easier = Number(row?.relativeBackwardRate2026) || 0;
  const stable = Number(row?.stableRate2026) || 0;
  const width = Math.abs(Number(row?.medianRelativePctPoint26vs25) || 0);
  return `
    <details class="data-details">
      <summary>查看计算数据</summary>
      <div class="data-details-grid">
        <span><b>${fmt(total)}</b><small>严格可比较专业</small></span>
        <span><b>${harder.toFixed(1)}%</b><small>表现为更难报</small></span>
        <span><b>${easier.toFixed(1)}%</b><small>表现为更容易报</small></span>
        <span><b>${stable.toFixed(1)}%</b><small>变化不明显</small></span>
      </div>
      <p>校正不同年份考生人数和全体专业共同变化后，这一方向的中位变化幅度约为 ${width.toFixed(2)} 个百分点。这个数字只用于核验计算，不代表分数变化，也不代表报名人数。</p>
    </details>`;
}

function directionCard(row, threshold, compact = false) {
  const state = directionState(row, threshold);
  return `
    <article class="difficulty-card is-${state.key}${compact ? ' is-compact' : ''}">
      <div class="difficulty-card-head">
        <h3>${escapeHtml(row.label || '其他')}</h3>
        <span class="difficulty-status">${escapeHtml(state.short)}</span>
      </div>
      <p class="difficulty-conclusion">${escapeHtml(state.title)}</p>
      <p class="difficulty-explain">${escapeHtml(state.explanation)}</p>
      <p class="difficulty-samples">${escapeHtml(sampleSentence(row))}</p>
      ${dataDetails(row)}
    </article>`;
}

function renderOverview(data) {
  const root = $('#overviewGrid');
  const threshold = data?.policy?.neutralThresholdPctPoint;
  const directions = [...(data?.directions || [])]
    .sort((a, b) => {
      if (a.label === '其他') return 1;
      if (b.label === '其他') return -1;
      return Number(b.sampleCount || 0) - Number(a.sampleCount || 0);
    });
  root.innerHTML = directions.map(row => directionCard(row, threshold)).join('');
}

function scoreBandTitle(band, threshold) {
  const state = directionState(band, threshold);
  return `
    <div class="band-summary is-${state.key}">
      <div>
        <span class="band-summary-kicker">这个分层整体怎么看</span>
        <h3>${escapeHtml(state.title)}</h3>
        <p>${escapeHtml(state.explanation)} 分层按照专业2026年最低投档分归组，不等于这个分数的考生一定能录取。</p>
      </div>
      <div class="band-summary-count"><b>${fmt(band.sampleCount)}</b><span>个严格可比较专业</span></div>
    </div>`;
}

function renderBand(data, bandId) {
  const threshold = data?.policy?.neutralThresholdPctPoint;
  const bands = data?.segments || [];
  const band = bands.find(item => String(item.id || item.key || item.label) === String(bandId)) || bands[0];
  const root = $('#scoreBandContent');
  if (!band) {
    root.innerHTML = '<div class="empty-state">暂时没有可显示的分层数据。</div>';
    return;
  }
  $$('.score-band-button').forEach(button => button.classList.toggle('is-active', button.dataset.bandId === String(band.id || band.key || band.label)));
  const directions = [...(band.directions || [])]
    .filter(row => Number(row.sampleCount || 0) >= 5)
    .sort((a, b) => Math.abs(Number(b.medianRelativePctPoint26vs25 || 0)) - Math.abs(Number(a.medianRelativePctPoint26vs25 || 0)));
  root.innerHTML = scoreBandTitle(band, threshold) + `<div class="difficulty-grid band-grid">${directions.map(row => directionCard(row, threshold, true)).join('')}</div>`;
}

function renderBandButtons(data) {
  const root = $('#scoreBandButtons');
  const bands = [...(data?.segments || [])].sort((a, b) => Number(b.maxScore || 0) - Number(a.maxScore || 0));
  root.innerHTML = bands.map((band, index) => {
    const id = String(band.id || band.key || band.label);
    return `<button type="button" class="score-band-button${index === 0 ? ' is-active' : ''}" data-band-id="${escapeHtml(id)}">${escapeHtml(band.label)}</button>`;
  }).join('');
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-band-id]');
    if (!button) return;
    renderBand(data, button.dataset.bandId);
    history.replaceState(null, '', '#score-band');
  });
  if (bands[0]) renderBand(data, String(bands[0].id || bands[0].key || bands[0].label));
}

function renderMetrics(data) {
  const summary = data?.summary || {};
  const directions = data?.directions || [];
  const segments = data?.segments || [];
  $('#metricSamples').textContent = fmt(summary.strictCompleteCount);
  $('#metricDirections').textContent = fmt(directions.filter(row => row.label !== '其他').length);
  $('#metricBands').textContent = fmt(segments.length);
  $('#metricYears').textContent = (data?.baseYears || []).join('—');
}

function setupTabs() {
  const buttons = $$('.view-tab');
  buttons.forEach(button => button.addEventListener('click', () => {
    const target = button.dataset.target;
    buttons.forEach(item => item.classList.toggle('is-active', item === button));
    $$('.view-panel').forEach(panel => panel.hidden = panel.id !== target);
    history.replaceState(null, '', target === 'scoreBandPanel' ? '#score-band' : '#overview');
  }));
  if (location.hash === '#score-band') {
    $('[data-target="scoreBandPanel"]')?.click();
  }
}

async function boot() {
  const status = $('#pageStatus');
  try {
    const response = await fetch(DATA_URL, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    renderMetrics(data);
    renderOverview(data);
    renderBandButtons(data);
    setupTabs();
    status.textContent = '数据已准备好';
    status.classList.add('is-ready');
  } catch (error) {
    console.error('[major-difficulty-2026]', error);
    status.textContent = '数据暂时没能读取';
    $('#overviewGrid').innerHTML = '<div class="empty-state"><b>暂时没能读取专业变化数据。</b><p>请稍后刷新页面重试。</p></div>';
    $('#scoreBandContent').innerHTML = '<div class="empty-state"><b>暂时没能读取专业变化数据。</b><p>请稍后刷新页面重试。</p></div>';
  }
}

boot();
