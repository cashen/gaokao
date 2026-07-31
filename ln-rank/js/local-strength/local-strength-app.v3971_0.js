import { CURRENT_RELEASE } from '../../../shared/resources/release/current-release.js?v=3971_0';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const fmt = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString('zh-CN') : '—';
const API = '/api/local-strength';

const state = {
  meta: null,
  schools: [],
  directions: [],
  scoreBands: [],
  view: 'list_all',
  score: '',
  school: '',
  q: '',
  direction: '',
  evidence: '',
  city: '',
  projectMode: 'all',
  minScore: '',
  maxScore: '',
  page: 1,
  pageSize: 20,
  loading: false
};

function pageSizeForViewport() {
  if (matchMedia('(max-width: 767px)').matches) return 10;
  if (matchMedia('(max-width: 1023px)').matches) return 15;
  return 20;
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  const legacyScore = params.get('score');
  const legacySchool = params.get('school');
  const legacyMajor = params.get('major');
  state.view = params.get('view') || (legacyScore ? 'score' : legacySchool ? 'school' : 'list_all');
  if (!['score', 'school', 'list_all'].includes(state.view)) state.view = 'list_all';
  state.score = legacyScore || params.get('candidateScore') || '';
  state.school = legacySchool || '';
  state.q = params.get('q') || legacyMajor || '';
  state.direction = params.get('direction') || '';
  state.evidence = params.get('evidence') || '';
  state.city = params.get('city') || '';
  state.projectMode = params.get('projectMode') || 'all';
  state.minScore = params.get('minScore') || '';
  state.maxScore = params.get('maxScore') || '';
  state.page = Math.max(1, Number(params.get('page') || 1));
  state.pageSize = pageSizeForViewport();
}

function writeUrl(replace = false) {
  const params = new URLSearchParams();
  params.set('view', state.view);
  if (state.score) params.set('score', state.score);
  if (state.school) params.set('school', state.school);
  if (state.q) params.set('q', state.q);
  if (state.direction) params.set('direction', state.direction);
  if (state.evidence) params.set('evidence', state.evidence);
  if (state.city) params.set('city', state.city);
  if (state.projectMode !== 'all') params.set('projectMode', state.projectMode);
  if (state.minScore) params.set('minScore', state.minScore);
  if (state.maxScore) params.set('maxScore', state.maxScore);
  if (state.page > 1) params.set('page', String(state.page));
  const query = params.toString();
  const url = query ? `${location.pathname}?${query}` : location.pathname;
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
}

async function getJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.message || `请求失败（${response.status}）`);
  return data;
}

function setRuntime(status, message = '') {
  document.body.dataset.localStrengthRuntime = status;
  const root = $('[data-runtime-status]');
  if (!root) return;
  root.className = `ls-runtime is-${status}`;
  root.innerHTML = status === 'ready'
    ? '<span class="ls-runtime-dot"></span><span>全量目录已准备</span>'
    : status === 'loading'
      ? '<span class="ls-runtime-dot"></span><span>正在核对全省投档专业与背景证据…</span>'
      : `<span class="ls-runtime-dot"></span><span>${esc(message || '目录暂时没有读取成功')}</span>`;
}

function renderStats() {
  const meta = state.meta || {};
  $('[data-stat-schools]').textContent = fmt(meta.localAdmissionSchoolCount);
  $('[data-stat-matched-schools]').textContent = fmt(meta.matchedSchoolCount);
  $('[data-stat-records]').textContent = fmt(meta.matchedRecordCount);
  $('[data-stat-range]').textContent = meta.scoreMin == null ? '—' : `${fmt(meta.scoreMin)}—${fmt(meta.scoreMax)}分`;
  const coverage = $('[data-coverage-note]');
  coverage.innerHTML = meta.completeEvaluation
    ? `已逐条检查 <b>${fmt(meta.localAdmissionRecordCount)}</b> 条省内2026物理类投档记录；公开目录收录 <b>${fmt(meta.matchedRecordCount)}</b> 条通过背景证据门禁的专业项目。`
    : '覆盖审计未完成，当前结果不应视为全量目录。';
}

function renderOptions() {
  $('#schoolOptions').innerHTML = state.schools.map(item => `<option value="${esc(item.officialName)}"></option>`).join('');
  const direction = $('#directionFilter');
  direction.innerHTML = '<option value="">全部背景方向</option>' + state.directions.map(item => `<option value="${esc(item.direction)}">${esc(item.direction)}（${fmt(item.count)}）</option>`).join('');
  direction.value = state.direction;
  $('#scoreBandButtons').innerHTML = state.scoreBands.map(item => `<button type="button" class="ls-chip" data-score-band="${esc(item.key)}" data-min="${item.min}" data-max="${item.max}">${esc(item.label)}</button>`).join('');
}

function syncControls() {
  $$('.ls-view-tab').forEach(button => {
    const active = button.dataset.view === state.view;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $$('[data-view-panel]').forEach(panel => { panel.hidden = panel.dataset.viewPanel !== state.view; });
  $('#scoreInput').value = state.score;
  $('#schoolInput').value = state.school;
  $('#queryInput').value = state.q;
  $('#directionFilter').value = state.direction;
  $('#evidenceFilter').value = state.evidence;
  $('#cityFilter').value = state.city;
  $('#projectFilter').value = state.projectMode;
  $('#minScoreFilter').value = state.minScore;
  $('#maxScoreFilter').value = state.maxScore;
}

function evidenceClass(label) {
  if (label === '学校主线') return 'is-primary';
  if (label === '学校相关') return 'is-secondary';
  return 'is-clue';
}

function historyLine(record) {
  const parts = [];
  if (record.score2025 != null) parts.push(`2025：${fmt(record.score2025)}分 / 位次${fmt(record.rank2025)}`);
  if (record.score2024 != null) parts.push(`2024：${fmt(record.score2024)}分 / 位次${fmt(record.rank2024)}`);
  return parts.length ? parts.join('；') : '暂无2025/2024严格同口径记录';
}

function recordHtml(record) {
  const background = record.background || {};
  const evidence = Array.isArray(background.evidence) ? background.evidence : [];
  const sources = Array.isArray(background.sources) ? background.sources : [];
  const verify = Array.isArray(background.reviewPoints) && background.reviewPoints.length ? background.reviewPoints : ['培养方案', '招生章程', '课程方向'];
  const project = Array.isArray(record.projectTags) && record.projectTags.length
    ? `<div class="ls-project-tags">${record.projectTags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>`
    : '';
  const returnUrl = `/ln-rank/?school=${encodeURIComponent(record.school)}&major=${encodeURIComponent(record.major)}&score=${encodeURIComponent(record.score2026 || '')}`;
  return `<article class="ls-record" data-record-id="${esc(record.id)}">
    <div class="ls-record-main">
      <div class="ls-record-identity">
        <p class="ls-school">${esc(record.school)}</p>
        <h3>${esc(record.major)}</h3>
        <p class="ls-location">${esc(record.displayLocation || record.city || '辽宁')} ${record.natureLabel ? `· ${esc(record.natureLabel)}` : ''}</p>
      </div>
      <div class="ls-position">
        <span><small>2026最低投档分</small><b>${fmt(record.score2026)}分</b></span>
        <span><small>对应累计位次</small><b>${fmt(record.rank2026)}</b></span>
      </div>
      <div class="ls-background">
        <span class="ls-evidence ${evidenceClass(background.evidenceLabel)}">${esc(background.evidenceLabel || '背景提示')}</span>
        <b>${esc(background.direction || '学校专业背景')}</b>
        <p>${esc(background.note || '该专业与学校办学或学科背景存在可复核连接，建议继续查看培养方案和招生章程。')}</p>
      </div>
    </div>
    ${project}
    <div class="ls-record-actions">
      <details class="ls-evidence-details">
        <summary>查看依据与核验项</summary>
        <div class="ls-detail-body">
          <p><strong>历史同口径：</strong>${esc(historyLine(record))}</p>
          ${evidence.length ? `<div><strong>背景依据：</strong>${evidence.map(item => `<span class="ls-evidence-row">${esc(item.disciplineName || item.detail || '学校学科背景')}${item.grade ? ` · ${esc(item.grade)}` : ''}${item.evidenceYear ? ` · ${esc(item.evidenceYear)}年` : ''}</span>`).join('')}</div>` : '<p><strong>背景依据：</strong>当前证据已通过前台门禁，详细来源见下方。</p>'}
          <p><strong>填报前再确认：</strong>${verify.map(esc).join(' / ')}</p>
          ${sources.length ? `<div class="ls-source-list"><strong>公开来源：</strong>${sources.map(source => `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title || source.authority || '来源')}</a>`).join('')}</div>` : ''}
          <p class="ls-boundary">${esc(background.boundary || '背景提示不代表录取判断、专业排名或就业承诺。')}</p>
        </div>
      </details>
      <a class="ui-button ui-button--compact ui-button--secondary" href="${returnUrl}">在专业初选中查看</a>
    </div>
  </article>`;
}

function emptyHtml(data) {
  if (state.view === 'school' && data.schoolStatus) {
    const school = data.schoolStatus;
    if (school.recordCount2026 > 0 && school.matchedRecordCount === 0) {
      return `<div class="ls-empty"><h3>${esc(school.officialName)}当前没有可公开的背景专业记录</h3><p>已检查该校 ${fmt(school.recordCount2026)} 条辽宁2026物理类投档专业，但当前背景证据不足以触发前台提示。这不代表学校没有优势专业。</p><a class="ui-button ui-button--secondary" href="/ln-rank/?school=${encodeURIComponent(school.officialName)}">查看该校全部在辽专业</a></div>`;
    }
  }
  return '<div class="ls-empty"><h3>当前条件下没有背景专业记录</h3><p>可以放宽分数段、清除筛选或换用学校正式名称。未显示不代表学校没有优势专业。</p></div>';
}

function renderPagination(page) {
  const root = $('#pagination');
  if (!page || page.total === 0 || page.pageCount <= 1) {
    root.innerHTML = '';
    return;
  }
  const start = Math.max(1, page.page - 2);
  const end = Math.min(page.pageCount, page.page + 2);
  const numbers = [];
  for (let number = start; number <= end; number += 1) numbers.push(number);
  root.innerHTML = `<button type="button" data-page="${page.page - 1}" ${page.hasPrevious ? '' : 'disabled'}>上一页</button>
    ${start > 1 ? '<span>…</span>' : ''}
    ${numbers.map(number => `<button type="button" data-page="${number}" class="${number === page.page ? 'is-active' : ''}" aria-current="${number === page.page ? 'page' : 'false'}">${number}</button>`).join('')}
    ${end < page.pageCount ? '<span>…</span>' : ''}
    <button type="button" data-page="${page.page + 1}" ${page.hasNext ? '' : 'disabled'}>下一页</button>`;
  root.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
    state.page = Number(button.dataset.page);
    writeUrl();
    loadResults({ scroll: true });
  }));
}

function activeScoreBand() {
  const score = Number(state.score);
  if (!Number.isFinite(score)) return null;
  return state.scoreBands.find(item => score >= item.min && score <= item.max) || null;
}

function resultParams() {
  const params = new URLSearchParams({ mode: 'list_all', page: String(state.page), pageSize: String(state.pageSize) });
  if (state.view === 'school') {
    if (state.school) params.set('school', state.school);
  } else if (state.view === 'score') {
    const band = activeScoreBand();
    const min = state.minScore || band?.min;
    const max = state.maxScore || band?.max;
    if (min) params.set('minScore', String(min));
    if (max) params.set('maxScore', String(max));
  }
  if (state.q) params.set('q', state.q);
  if (state.direction) params.set('direction', state.direction);
  if (state.evidence) params.set('evidence', state.evidence);
  if (state.city) params.set('city', state.city);
  if (state.projectMode !== 'all') params.set('projectMode', state.projectMode);
  if (state.view === 'list_all') {
    if (state.minScore) params.set('minScore', state.minScore);
    if (state.maxScore) params.set('maxScore', state.maxScore);
  }
  return params;
}

function renderResultContext(data) {
  const page = data.page || {};
  let title = '全部背景专业';
  let desc = '按2026最低投档分从高到低排列。';
  if (state.view === 'school') {
    title = state.school || '按学校查询';
    desc = data.schoolStatus ? `该校2026物理类投档专业 ${fmt(data.schoolStatus.recordCount2026)} 条，背景专业 ${fmt(data.schoolStatus.matchedRecordCount)} 条。` : '请输入学校正式名称。';
  } else if (state.view === 'score') {
    const band = activeScoreBand();
    title = band ? `${band.label}的省内背景专业` : '按分数位置查看';
    desc = band ? `显示2026历史最低投档分位于${band.label}的记录。` : '请输入344—750之间的参考分数。';
  }
  $('#resultsTitle').textContent = title;
  $('#resultsMeta').textContent = `${desc} 共 ${fmt(page.total || 0)} 条，当前第 ${fmt(page.page || 1)} / ${fmt(page.pageCount || 1)} 页。`;
}

async function loadResults({ scroll = false } = {}) {
  if (state.loading) return;
  if (state.view === 'school' && !state.school) {
    $('#records').innerHTML = '<div class="ls-empty"><h3>输入一所辽宁省内院校</h3><p>支持学校正式名称和招生名称；查询后会展示该校全部已通过背景证据门禁的专业项目。</p></div>';
    $('#pagination').innerHTML = '';
    return;
  }
  if (state.view === 'score') {
    const score = Number(state.score);
    if (!Number.isFinite(score) || score < 344 || score > 750) {
      $('#records').innerHTML = '<div class="ls-empty"><h3>请输入344—750之间的参考分数</h3><p>系统会定位到对应历史分数段，不计算录取概率。</p></div>';
      $('#pagination').innerHTML = '';
      return;
    }
  }
  state.loading = true;
  $('#records').innerHTML = '<div class="ls-loading">正在整理全部符合条件的背景专业…</div>';
  try {
    const data = await getJson(`${API}?${resultParams().toString()}`);
    renderResultContext(data);
    $('#records').innerHTML = data.records?.length ? data.records.map(recordHtml).join('') : emptyHtml(data);
    renderPagination(data.page);
    if (scroll) $('#resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    $('#records').innerHTML = `<div class="ls-empty is-error"><h3>目录暂时没有读取成功</h3><p>${esc(error.message)}</p><button type="button" class="ui-button ui-button--secondary" data-retry>重新加载</button></div>`;
    $('[data-retry]')?.addEventListener('click', () => loadResults());
  } finally {
    state.loading = false;
  }
}

function resetFilters() {
  state.q = '';
  state.direction = '';
  state.evidence = '';
  state.city = '';
  state.projectMode = 'all';
  state.minScore = '';
  state.maxScore = '';
  state.page = 1;
  syncControls();
  writeUrl();
  loadResults();
}

function bind() {
  $$('.ls-view-tab').forEach(button => button.addEventListener('click', () => {
    state.view = button.dataset.view;
    state.page = 1;
    syncControls();
    writeUrl();
    loadResults();
  }));
  $('#scoreSubmit').addEventListener('click', () => {
    state.score = $('#scoreInput').value.trim();
    state.minScore = '';
    state.maxScore = '';
    state.page = 1;
    writeUrl();
    loadResults({ scroll: true });
  });
  $('#scoreInput').addEventListener('keydown', event => { if (event.key === 'Enter') $('#scoreSubmit').click(); });
  $('#schoolSubmit').addEventListener('click', () => {
    state.school = $('#schoolInput').value.trim();
    state.page = 1;
    writeUrl();
    loadResults({ scroll: true });
  });
  $('#schoolInput').addEventListener('keydown', event => { if (event.key === 'Enter') $('#schoolSubmit').click(); });
  $('#scoreBandButtons').addEventListener('click', event => {
    const button = event.target.closest('[data-score-band]');
    if (!button) return;
    state.minScore = button.dataset.min;
    state.maxScore = button.dataset.max;
    state.score = button.dataset.max;
    state.page = 1;
    syncControls();
    writeUrl();
    loadResults({ scroll: true });
  });
  const applyCurrentFilters = () => {
    state.q = $('#queryInput').value.trim();
    state.direction = $('#directionFilter').value;
    state.evidence = $('#evidenceFilter').value;
    state.city = $('#cityFilter').value.trim();
    state.projectMode = $('#projectFilter').value;
    state.minScore = $('#minScoreFilter').value.trim();
    state.maxScore = $('#maxScoreFilter').value.trim();
    state.page = 1;
    writeUrl();
    loadResults({ scroll: true });
  };
  $('#querySubmit').addEventListener('click', applyCurrentFilters);
  $('#applyFilters').addEventListener('click', applyCurrentFilters);
  $('#resetFilters').addEventListener('click', resetFilters);
  $('#queryInput').addEventListener('keydown', event => { if (event.key === 'Enter') $('#querySubmit').click(); });
  window.addEventListener('popstate', () => {
    readUrl();
    syncControls();
    loadResults();
  });
}

async function boot() {
  readUrl();
  state.pageSize = pageSizeForViewport();
  setRuntime('loading');
  bind();
  try {
    const data = await getJson(`${API}?mode=meta`);
    state.meta = data.meta;
    state.schools = data.schools || [];
    state.directions = data.directions || [];
    state.scoreBands = data.scoreBands || [];
    renderStats();
    renderOptions();
    syncControls();
    setRuntime('ready');
    await loadResults();
    document.body.dataset.release = CURRENT_RELEASE.display;
  } catch (error) {
    setRuntime('error', error.message);
    $('#records').innerHTML = `<div class="ls-empty is-error"><h3>全量目录初始化失败</h3><p>${esc(error.message)}</p></div>`;
  }
}

boot();
