import { CURRENT_RELEASE } from '../../../shared/resources/release/current-release.js?v=3972_0';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const fmt = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString('zh-CN') : '—';
const INDEX_URL = '/ln-rank/data/211-static/211-static-index.v3972_0.json?v=3972_0';
const SOURCE_URL = 'https://hudong.moe.gov.cn/srcsite/A22/s7065/202202/t20220211_598710.html';

const state = {
  index: null,
  view: 'score',
  score: '',
  band: '',
  positionGroup: 'near',
  school: '',
  major: '',
  q: '',
  evidence: 'all',
  tier: 'all',
  project: 'all',
  page: 1,
  pageSize: 20
};

function pageSize() {
  if (matchMedia('(max-width: 767px)').matches) return 10;
  if (matchMedia('(max-width: 1023px)').matches) return 15;
  return 20;
}
function normalize(value) {
  return String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[（【[]/g, '(').replace(/[）】\]]/g, ')')
    .replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '');
}
function readUrl() {
  const p = new URLSearchParams(location.search);
  state.view = ['score', 'school', 'major', 'directory'].includes(p.get('view')) ? p.get('view') : 'score';
  state.score = p.get('score') || '';
  state.band = p.get('band') || '';
  state.positionGroup = ['near', 'upper', 'lower', 'band'].includes(p.get('group')) ? p.get('group') : 'near';
  state.school = p.get('school') || '';
  state.major = p.get('major') || '';
  state.q = p.get('q') || '';
  state.evidence = p.get('evidence') || 'all';
  state.tier = p.get('tier') || 'all';
  state.project = p.get('project') || 'all';
  state.page = Math.max(1, Number(p.get('page') || 1));
  state.pageSize = pageSize();
}
function writeUrl(replace = false) {
  const p = new URLSearchParams();
  p.set('view', state.view);
  if (state.view === 'score') {
    if (state.score) p.set('score', state.score);
    if (state.band) p.set('band', state.band);
    if (state.positionGroup !== 'near') p.set('group', state.positionGroup);
  }
  if (state.view === 'school' && state.school) p.set('school', state.school);
  if (state.view === 'major' && state.major) p.set('major', state.major);
  if (state.view === 'directory' && state.q) p.set('q', state.q);
  if (state.evidence !== 'all') p.set('evidence', state.evidence);
  if (state.tier !== 'all') p.set('tier', state.tier);
  if (state.project !== 'all') p.set('project', state.project);
  if (state.page > 1) p.set('page', String(state.page));
  history[replace ? 'replaceState' : 'pushState'](null, '', `${location.pathname}?${p}`);
}

async function loadIndex() {
  const response = await fetch(INDEX_URL, { headers: { accept: 'application/json' }, cache: 'force-cache' });
  if (!response.ok) throw new Error(`静态目录读取失败（${response.status}）`);
  const index = await response.json();
  if (index.version !== 'all-211-static-v3972_0') throw new Error('静态目录版本不匹配');
  if (!index.meta?.completeEvaluation || index.records?.length !== index.meta.admission211RecordCount) throw new Error('静态目录完整性校验失败');
  return index;
}
function setRuntime(status, message = '') {
  document.body.dataset.all211Runtime = status;
  const root = $('[data-runtime]');
  if (!root) return;
  root.className = `a211-runtime is-${status}`;
  root.innerHTML = status === 'ready'
    ? '<span></span>全量静态目录已准备'
    : status === 'loading'
      ? '<span></span>正在读取静态目录…'
      : `<span></span>${esc(message || '目录暂时没有读取成功')}`;
}

function activeBand() {
  if (state.band) {
    const explicit = state.index.scoreBands.find(item => item.key === state.band);
    if (explicit) return explicit;
  }
  const score = Number(state.score);
  if (!Number.isFinite(score)) return null;
  return state.index.scoreBands.find(item => score >= item.min && score <= item.max)
    || (score > state.index.meta.scoreMax ? state.index.scoreBands[0] : state.index.scoreBands.at(-1));
}
function candidateRank() {
  const score = Number(state.score);
  if (!Number.isFinite(score)) return null;
  const direct = Number(state.index.candidateRankByScore[String(score)]);
  if (Number.isFinite(direct)) return direct;
  const known = Object.keys(state.index.candidateRankByScore).map(Number).filter(Number.isFinite).sort((a, b) => Math.abs(a - score) - Math.abs(b - score));
  return known.length ? Number(state.index.candidateRankByScore[String(known[0])]) : null;
}

function baseRecords() {
  const records = state.index.records;
  if (state.view === 'school') {
    const q = normalize(state.school);
    return q ? records.filter(item => normalize(item.school).includes(q) || normalize(item.schoolIdentity).includes(q)) : [];
  }
  if (state.view === 'major') {
    const q = normalize(state.major);
    return q ? records.filter(item => normalize(item.major).includes(q) || normalize(item.background?.direction).includes(q)) : [];
  }
  if (state.view === 'directory') {
    const q = normalize(state.q);
    return q ? records.filter(item => [item.school, item.schoolIdentity, item.major, item.city, item.province, item.background?.direction].some(value => normalize(value).includes(q))) : records;
  }
  const band = activeBand();
  if (!band) return [];
  const inBand = records.filter(item => item.score2026 >= band.min && item.score2026 <= band.max);
  const rank = candidateRank();
  if (!rank || !state.score) return inBand;
  const sorted = [...records].sort((a, b) => Math.abs(Number(a.rank2026) - rank) - Math.abs(Number(b.rank2026) - rank) || Number(b.score2026) - Number(a.score2026));
  const near = sorted.slice(0, 36);
  const nearIds = new Set(near.map(item => item.id));
  const upper = sorted.filter(item => Number(item.rank2026) < rank && !nearIds.has(item.id)).slice(0, 60);
  const lower = sorted.filter(item => Number(item.rank2026) > rank && !nearIds.has(item.id)).slice(0, 60);
  if (state.positionGroup === 'upper') return upper;
  if (state.positionGroup === 'lower') return lower;
  if (state.positionGroup === 'band') return inBand;
  return near;
}
function filteredRecords() {
  return baseRecords().filter(item => {
    if (state.evidence === 'verified' && item.background?.status !== 'verified') return false;
    if (state.evidence === 'insufficient' && item.background?.status === 'verified') return false;
    if (state.tier === '985' && !item.is985) return false;
    if (state.tier === '211-only' && item.is985) return false;
    const special = Array.isArray(item.projectTags) && item.projectTags.length > 0;
    if (state.project === 'regular' && special) return false;
    if (state.project === 'special' && !special) return false;
    return true;
  });
}

function renderStats() {
  const m = state.index.meta;
  $('[data-stat-schools]').textContent = fmt(m.admission211SchoolCount);
  $('[data-stat-records]').textContent = fmt(m.admission211RecordCount);
  $('[data-stat-evidence]').textContent = fmt(m.evidenceRecordCount);
  $('[data-stat-range]').textContent = `${m.scoreMin}—${m.scoreMax}分`;
  $('[data-coverage]').innerHTML = `构建阶段已逐条检查 <b>${fmt(m.evaluatedRecordCount)}</b> 条辽宁2026物理类211投档记录，覆盖 <b>${fmt(m.admission211SchoolCount)}</b> 所有投档记录的211院校。页面查询、筛选和翻页只读取不可变静态索引。`;
}
function renderBands() {
  $('#scoreBands').innerHTML = state.index.scoreBands.map(item => `
    <button type="button" class="a211-band" data-band="${esc(item.key)}" aria-pressed="false">
      <b>${esc(item.label)}</b>
      <span>${fmt(item.admissionRecordCount)}条 · ${fmt(item.schoolCount)}校</span>
    </button>`).join('');
}
function renderOptions() {
  $('#schoolOptions').innerHTML = state.index.schools.filter(item => item.admissionRecordCount > 0)
    .map(item => `<option value="${esc(item.officialName)}"></option>`).join('');
  $('#directionOptions').innerHTML = state.index.directions.map(item => `<option value="${esc(item.direction)}"></option>`).join('');
}
function syncControls() {
  $$('.a211-tab').forEach(button => {
    const active = button.dataset.view === state.view;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $$('[data-view-panel]').forEach(panel => { panel.hidden = panel.dataset.viewPanel !== state.view; });
  $('#scoreInput').value = state.score;
  $('#schoolInput').value = state.school;
  $('#majorInput').value = state.major;
  $('#directoryInput').value = state.q;
  $('#evidenceFilter').value = state.evidence;
  $('#tierFilter').value = state.tier;
  $('#projectFilter').value = state.project;
  const band = activeBand();
  $$('#scoreBands [data-band]').forEach(button => {
    const active = band?.key === button.dataset.band;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $$('.a211-position-tab').forEach(button => {
    const active = button.dataset.group === state.positionGroup;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#positionGroups').hidden = !(state.view === 'score' && state.score && candidateRank());
  $('#scoreContext').hidden = !band;
  if (band) $('#scoreContext').textContent = state.score
    ? `${state.score}分参考位次 ${fmt(candidateRank())}；所在真实区间：${band.label}`
    : `当前区间：${band.label}`;
}

function historyText(record) {
  const parts = [];
  if (record.score2025 != null) parts.push(`2025：${record.score2025}分 / 位次${fmt(record.rank2025)}`);
  if (record.score2024 != null) parts.push(`2024：${record.score2024}分 / 位次${fmt(record.rank2024)}`);
  return parts.length ? parts.join('；') : '暂无严格同口径历史记录';
}
function card(record) {
  const bg = record.background || {};
  const verified = bg.status === 'verified';
  const tags = Array.isArray(record.projectTags) ? record.projectTags : [];
  const returnUrl = `/ln-rank/?school=${encodeURIComponent(record.school)}&major=${encodeURIComponent(record.major)}&score=${encodeURIComponent(record.score2026 || '')}`;
  return `<article class="a211-card">
    <div class="a211-card-head">
      <div><p class="a211-school">${esc(record.school)}</p><h3>${esc(record.major)}</h3><p>${esc(record.displayLocation || record.province || '')}${record.is985 ? ' · 985/211' : ' · 211'}</p></div>
      <div class="a211-position"><span><small>2026投档分</small><b>${fmt(record.score2026)}</b></span><span><small>累计位次</small><b>${fmt(record.rank2026)}</b></span></div>
    </div>
    <div class="a211-evidence ${verified ? 'is-verified' : 'is-insufficient'}">
      <span>${esc(bg.evidenceLabel || '当前证据不足')}</span>
      <div><b>${verified ? esc(bg.direction || bg.disciplineName) : '211身份已核验，专业背景不推断'}</b><p>${esc(bg.note || '')}</p></div>
    </div>
    ${tags.length ? `<div class="a211-tags">${tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>` : ''}
    <details><summary>查看历史、证据与复核项</summary><div class="a211-detail">
      <p><strong>历史同口径：</strong>${esc(historyText(record))}</p>
      <p><strong>背景证据：</strong>${verified ? `${esc(bg.disciplineName || bg.direction)} · ${esc(bg.evidenceYear || '2022')}年` : '当前没有达到前台展示门禁的专业—学科映射证据'}</p>
      <p><strong>填报前复核：</strong>${(bg.reviewPoints || ['本科培养方案', '2026招生章程']).map(esc).join(' / ')}</p>
      ${verified ? `<a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">查看教育部官方建设学科来源</a>` : ''}
      <p class="a211-boundary">${esc(bg.boundary || '211身份不等同于具体专业优势、录取结果或就业承诺。')}</p>
    </div></details>
    <div class="a211-actions"><a href="${returnUrl}">在专业初选中继续查看</a></div>
  </article>`;
}
function emptyText() {
  if (state.view === 'school' && !state.school) return '输入学校名称后查看该校全部2026投档专业。';
  if (state.view === 'major' && !state.major) return '输入专业名称或背景方向后跨学校查看。';
  if (state.view === 'score' && !activeBand()) return '输入参考分数，或直接点击一个真实分数段。';
  return '当前条件下没有记录。可清空筛选或切换相邻分数段。';
}
function renderResults() {
  const rows = filteredRecords();
  const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.pageSize;
  const visible = rows.slice(start, start + state.pageSize);
  $('#resultSummary').innerHTML = rows.length
    ? `找到 <b>${fmt(rows.length)}</b> 条记录 · 第 ${state.page}/${pages} 页`
    : emptyText();
  $('#results').innerHTML = visible.map(card).join('');
  $('#pager').hidden = rows.length <= state.pageSize;
  $('#pageInfo').textContent = `${state.page} / ${pages}`;
  $('#prevPage').disabled = state.page <= 1;
  $('#nextPage').disabled = state.page >= pages;
}
function render() {
  syncControls();
  renderResults();
}

function resetPage() { state.page = 1; }
function bind() {
  $$('.a211-tab').forEach(button => button.addEventListener('click', () => {
    state.view = button.dataset.view; resetPage(); writeUrl(); render();
  }));
  $('#scoreSubmit').addEventListener('click', () => {
    const score = Number($('#scoreInput').value);
    if (!Number.isFinite(score) || score < 344 || score > 750) {
      $('#scoreError').hidden = false;
      $('#scoreError').textContent = '请输入344—750之间的整数分数。';
      return;
    }
    $('#scoreError').hidden = true;
    state.score = String(Math.round(score)); state.band = ''; state.positionGroup = 'near'; resetPage(); writeUrl(); render();
  });
  $('#scoreInput').addEventListener('keydown', event => { if (event.key === 'Enter') $('#scoreSubmit').click(); });
  $('#scoreBands').addEventListener('click', event => {
    const button = event.target.closest('[data-band]'); if (!button) return;
    state.band = button.dataset.band; state.score = ''; state.positionGroup = 'band'; resetPage(); writeUrl(); render();
  });
  $('#positionGroups').addEventListener('click', event => {
    const button = event.target.closest('[data-group]'); if (!button) return;
    state.positionGroup = button.dataset.group; resetPage(); writeUrl(); render();
  });
  const queries = [
    ['#schoolSubmit', '#schoolInput', 'school'],
    ['#majorSubmit', '#majorInput', 'major'],
    ['#directorySubmit', '#directoryInput', 'q']
  ];
  for (const [buttonSelector, inputSelector, key] of queries) {
    $(buttonSelector).addEventListener('click', () => { state[key] = $(inputSelector).value.trim(); resetPage(); writeUrl(); render(); });
    $(inputSelector).addEventListener('keydown', event => { if (event.key === 'Enter') $(buttonSelector).click(); });
  }
  for (const [selector, key] of [['#evidenceFilter', 'evidence'], ['#tierFilter', 'tier'], ['#projectFilter', 'project']]) {
    $(selector).addEventListener('change', event => { state[key] = event.target.value; resetPage(); writeUrl(); render(); });
  }
  $('#clearFilters').addEventListener('click', () => { state.evidence = 'all'; state.tier = 'all'; state.project = 'all'; resetPage(); writeUrl(); render(); });
  $('#prevPage').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; writeUrl(); renderResults(); scrollTo({ top: $('#resultArea').offsetTop - 80, behavior: 'smooth' }); } });
  $('#nextPage').addEventListener('click', () => { state.page += 1; writeUrl(); renderResults(); scrollTo({ top: $('#resultArea').offsetTop - 80, behavior: 'smooth' }); });
  addEventListener('popstate', () => { readUrl(); render(); });
  addEventListener('resize', () => { const next = pageSize(); if (next !== state.pageSize) { state.pageSize = next; resetPage(); renderResults(); } });
}

async function init() {
  readUrl();
  setRuntime('loading');
  try {
    state.index = await loadIndex();
    document.body.dataset.release = CURRENT_RELEASE.display;
    renderStats();
    renderBands();
    renderOptions();
    bind();
    setRuntime('ready');
    render();
  } catch (error) {
    console.error(error);
    setRuntime('error', error.message);
    $('#resultSummary').textContent = '静态目录读取失败，请返回专业初选首页。';
  }
}
init();
