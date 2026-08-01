import { CURRENT_RELEASE } from '../../../shared/resources/release/current-release.js?v=3972_3';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const fmt = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString('zh-CN') : '—';
const INDEX_URL = '/ln-rank/data/local-strength/local-strength-index.v3971_2.json?v=3971_2';
const RANK_URL = '/fenxi/data/rank_2026_physics.json?v=3972_3';
const SCORE_POSITION_VERSION = 'local-strength-score-position-v3972_3';
const SCORE_POSITION_GROUPS = new Set(['near', 'upper', 'lower', 'band']);

const state = {
  index: null,
  rankMap: null,
  meta: null,
  schools: [],
  directions: [],
  scoreBands: [],
  records: [],
  view: 'list_all',
  scoreView: { score: '', band: '', positionGroup: 'near' },
  schoolView: { school: '' },
  listView: { q: '', minScore: '', maxScore: '' },
  commonFilters: { direction: '', evidence: '', city: '', projectMode: 'all' },
  page: 1,
  pageSize: 20,
  hasLoadedResults: false,
  scoreValidationMessage: ''
};

function pageSizeForViewport() {
  if (matchMedia('(max-width: 767px)').matches) return 10;
  if (matchMedia('(max-width: 1023px)').matches) return 15;
  return 20;
}

function normalizeText(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[（【\[]/g, '(').replace(/[）】\]]/g, ')').replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '');
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  const legacyScore = params.get('score');
  const legacyBand = params.get('band');
  const legacySchool = params.get('school');
  const legacyMajor = params.get('major');
  state.view = params.get('view') || (legacyScore || legacyBand ? 'score' : legacySchool ? 'school' : 'list_all');
  if (!['score', 'school', 'list_all'].includes(state.view)) state.view = 'list_all';
  state.scoreView.score = legacyScore || params.get('candidateScore') || '';
  state.scoreView.band = legacyBand || '';
  const requestedGroup = params.get('group') || (state.scoreView.band ? 'band' : 'near');
  state.scoreView.positionGroup = SCORE_POSITION_GROUPS.has(requestedGroup) ? requestedGroup : 'near';
  if (state.scoreView.band) state.scoreView.positionGroup = 'band';
  state.schoolView.school = legacySchool || '';
  state.listView.q = params.get('q') || legacyMajor || '';
  state.listView.minScore = params.get('minScore') || '';
  state.listView.maxScore = params.get('maxScore') || '';
  state.commonFilters.direction = params.get('direction') || '';
  state.commonFilters.evidence = params.get('evidence') || '';
  state.commonFilters.city = params.get('city') || '';
  state.commonFilters.projectMode = params.get('projectMode') || 'all';
  state.page = Math.max(1, Number(params.get('page') || 1));
  state.pageSize = pageSizeForViewport();
}

function writeUrl(replace = false) {
  const params = new URLSearchParams();
  params.set('view', state.view);
  if (state.view === 'score') {
    if (state.scoreView.score) params.set('score', state.scoreView.score);
    if (state.scoreView.band) params.set('band', state.scoreView.band);
    if (state.scoreView.score && state.scoreView.positionGroup !== 'near') params.set('group', state.scoreView.positionGroup);
  } else if (state.view === 'school') {
    if (state.schoolView.school) params.set('school', state.schoolView.school);
  } else {
    if (state.listView.q) params.set('q', state.listView.q);
    if (state.listView.minScore) params.set('minScore', state.listView.minScore);
    if (state.listView.maxScore) params.set('maxScore', state.listView.maxScore);
  }
  if (state.commonFilters.direction) params.set('direction', state.commonFilters.direction);
  if (state.commonFilters.evidence) params.set('evidence', state.commonFilters.evidence);
  if (state.commonFilters.city) params.set('city', state.commonFilters.city);
  if (state.commonFilters.projectMode !== 'all') params.set('projectMode', state.commonFilters.projectMode);
  if (state.page > 1) params.set('page', String(state.page));
  const query = params.toString();
  history[replace ? 'replaceState' : 'pushState'](null, '', query ? `${location.pathname}?${query}` : location.pathname);
}

async function getStaticResources() {
  const [indexResponse, rankResponse] = await Promise.all([
    fetch(INDEX_URL, { headers: { accept: 'application/json' }, cache: 'force-cache' }),
    fetch(RANK_URL, { headers: { accept: 'application/json' }, cache: 'force-cache' })
  ]);
  if (!indexResponse.ok) throw new Error(`静态目录读取失败（${indexResponse.status}）`);
  if (!rankResponse.ok) throw new Error(`2026位次表读取失败（${rankResponse.status}）`);
  const [data, rankMap] = await Promise.all([indexResponse.json(), rankResponse.json()]);
  if (data.version !== 'local-strength-static-v3971_2') throw new Error('静态目录版本不匹配');
  if (!data.meta?.completeEvaluation) throw new Error('静态目录覆盖审计未完成');
  if (!Array.isArray(data.records) || data.records.length !== data.meta.matchedRecordCount) throw new Error('静态目录记录数不一致');
  if (!rankMap || Number(rankMap['579']) !== 21051 || Number(rankMap['530']) !== 40119) throw new Error('2026位次表合同不匹配');
  return { data, rankMap };
}

function setRuntime(status, message = '') {
  document.body.dataset.localStrengthRuntime = status;
  const root = $('[data-runtime-status]');
  if (!root) return;
  root.className = `ls-runtime is-${status}`;
  root.innerHTML = status === 'ready'
    ? '<span class="ls-runtime-dot"></span><span>静态全量目录与位次表已准备</span>'
    : status === 'loading'
      ? '<span class="ls-runtime-dot"></span><span>正在读取静态背景目录…</span>'
      : `<span class="ls-runtime-dot"></span><span>${esc(message || '目录暂时没有读取成功')}</span>`;
}

function renderStats() {
  const meta = state.meta || {};
  $('[data-stat-schools]').textContent = fmt(meta.localAdmissionSchoolCount);
  $('[data-stat-matched-schools]').textContent = fmt(meta.matchedSchoolCount);
  $('[data-stat-records]').textContent = fmt(meta.matchedRecordCount);
  $('[data-stat-range]').textContent = meta.scoreMin == null ? '—' : `${fmt(meta.scoreMin)}—${fmt(meta.scoreMax)}分`;
  $('[data-summary-compact]').innerHTML = `<b>${fmt(meta.localAdmissionSchoolCount)}</b>所省内院校 · <b>${fmt(meta.matchedSchoolCount)}</b>所有背景专业 · <b>${fmt(meta.matchedRecordCount)}</b>条记录`;
  const coverageHtml = `已在构建阶段逐条检查 <b>${fmt(meta.localAdmissionRecordCount)}</b> 条省内2026物理类投档记录；公开目录收录 <b>${fmt(meta.matchedRecordCount)}</b> 条通过背景证据门禁的专业项目。页面查询、位次排序和翻页只读取静态资源，不占用专业初选接口。`;
  $('[data-coverage-note]').innerHTML = coverageHtml;
  $('[data-coverage-note-mobile]').innerHTML = coverageHtml;
}

function activeScoreBand() {
  if (state.scoreView.band) {
    const explicit = state.scoreBands.find(item => item.key === state.scoreView.band);
    if (explicit) return explicit;
  }
  const score = Number(state.scoreView.score);
  if (!Number.isFinite(score)) return null;
  return state.scoreBands.find(item => score >= item.min && score <= item.max) || null;
}

function candidateRank() {
  const score = Number(state.scoreView.score);
  if (!Number.isFinite(score) || !state.rankMap) return null;
  const rounded = Math.round(score);
  const direct = Number(state.rankMap[String(rounded)]);
  if (Number.isFinite(direct)) return direct;
  const known = Object.keys(state.rankMap).map(Number).filter(Number.isFinite).sort((a, b) => Math.abs(a - rounded) - Math.abs(b - rounded));
  return known.length ? Number(state.rankMap[String(known[0])]) : null;
}

function scoreBandMetrics(band) {
  const records = state.records.filter(record => Number(record.score2026) >= band.min && Number(record.score2026) <= band.max);
  return { records: records.length, schools: new Set(records.map(record => record.school)).size };
}

function renderOptions() {
  $('#schoolOptions').innerHTML = state.schools.map(item => `<option value="${esc(item.officialName)}"></option>`).join('');
  $('#directionFilter').innerHTML = '<option value="">全部背景方向</option>' + state.directions.map(item => `<option value="${esc(item.direction)}">${esc(item.direction)}（${fmt(item.count)}）</option>`).join('');
  $('#scoreBandButtons').innerHTML = state.scoreBands.map(item => {
    const metrics = scoreBandMetrics(item);
    return `<button type="button" class="ls-chip" data-score-band="${esc(item.key)}" aria-pressed="false"><b>${esc(item.label)}</b><span>${fmt(metrics.records)}条 · ${fmt(metrics.schools)}校</span></button>`;
  }).join('');
}

function commonFilterCount() {
  return [state.commonFilters.direction, state.commonFilters.evidence, state.commonFilters.city, state.commonFilters.projectMode !== 'all' ? state.commonFilters.projectMode : ''].filter(Boolean).length;
}
function listFilterCount() { return [state.listView.q, state.listView.minScore, state.listView.maxScore].filter(Boolean).length; }
function filterCountForCurrentView() { return commonFilterCount() + (state.view === 'list_all' ? listFilterCount() : 0); }

function syncTabs() {
  $$('.ls-view-tab').forEach(button => {
    const active = button.dataset.view === state.view;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  $$('[data-view-panel]').forEach(panel => {
    const active = panel.dataset.viewPanel === state.view;
    panel.hidden = !active;
    panel.setAttribute('aria-hidden', String(!active));
  });
}

function syncControls() {
  syncTabs();
  $('#scoreInput').value = state.scoreView.score;
  $('#schoolInput').value = state.schoolView.school;
  $('#queryInput').value = state.listView.q;
  $('#directionFilter').value = state.commonFilters.direction;
  $('#evidenceFilter').value = state.commonFilters.evidence;
  $('#cityFilter').value = state.commonFilters.city;
  $('#projectFilter').value = state.commonFilters.projectMode;
  $('#minScoreFilter').value = state.listView.minScore;
  $('#maxScoreFilter').value = state.listView.maxScore;
  const band = activeScoreBand();
  const rank = candidateRank();
  $$('#scoreBandButtons [data-score-band]').forEach(button => {
    const active = Boolean(band && button.dataset.scoreBand === band.key);
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const disclosure = $('#scoreBandDisclosure');
  if (disclosure && !matchMedia('(max-width: 767px)').matches) disclosure.open = true;
  $('#scoreContext').hidden = !band;
  $('#scoreContext').textContent = band
    ? state.scoreView.score && rank
      ? `${state.scoreView.score}分参考累计位次 ${fmt(rank)}；所在历史区间：${band.label}`
      : `当前区间：${band.label}`
    : '';
  const positionGroups = $('#scorePositionGroups');
  positionGroups.hidden = !(state.view === 'score' && state.scoreView.score && rank);
  $$('#scorePositionGroups [data-position-group]').forEach(button => {
    const active = button.dataset.positionGroup === state.scoreView.positionGroup;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#scoreError').hidden = !state.scoreValidationMessage;
  $('#scoreError').textContent = state.scoreValidationMessage;
  const canFilter = state.view === 'list_all' || state.hasLoadedResults;
  $('[data-filter-shell]').hidden = !canFilter;
  const count = filterCountForCurrentView();
  $('[data-filter-summary]').textContent = count ? `筛选 · ${count}` : '更多筛选';
  $('#scoreRangeFields').hidden = state.view !== 'list_all';
  renderActiveFilters();
}

function renderActiveFilters() {
  const root = $('#activeFilters');
  const items = [];
  if (state.view === 'list_all' && state.listView.q) items.push({ key: 'q', label: `关键词：${state.listView.q}` });
  if (state.commonFilters.direction) items.push({ key: 'direction', label: state.commonFilters.direction });
  if (state.commonFilters.evidence) items.push({ key: 'evidence', label: state.commonFilters.evidence });
  if (state.commonFilters.city) items.push({ key: 'city', label: state.commonFilters.city });
  if (state.commonFilters.projectMode !== 'all') items.push({ key: 'projectMode', label: state.commonFilters.projectMode === 'regular' ? '只看普通项目' : '只看特殊项目' });
  if (state.view === 'list_all' && (state.listView.minScore || state.listView.maxScore)) items.push({ key: 'scoreRange', label: `${state.listView.minScore || '本科线'}—${state.listView.maxScore || '750'}分` });
  root.hidden = items.length === 0;
  root.innerHTML = items.map(item => `<button type="button" data-remove-filter="${item.key}">${esc(item.label)} <span aria-hidden="true">×</span></button>`).join('');
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
  const sources = Array.isArray(background.sources) ? background.sources.filter(source => source.url) : [];
  const verify = Array.isArray(background.reviewPoints) && background.reviewPoints.length ? background.reviewPoints : ['培养方案', '招生章程', '课程方向'];
  const project = record.projectTags?.length ? `<div class="ls-project-tags">${record.projectTags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>` : '';
  const returnUrl = `/ln-rank/?school=${encodeURIComponent(record.school)}&major=${encodeURIComponent(record.major)}&score=${encodeURIComponent(record.score2026 || '')}`;
  return `<article class="ls-record" data-record-id="${esc(record.id)}"><div class="ls-record-main"><div class="ls-record-identity"><p class="ls-school">${esc(record.school)}</p><h3>${esc(record.major)}</h3><p class="ls-location">${esc(record.displayLocation || record.city || '辽宁')}${record.natureLabel ? ` · ${esc(record.natureLabel)}` : ''}</p></div><div class="ls-position"><span><small>2026最低投档分</small><b>${fmt(record.score2026)}分</b></span><span><small>对应累计位次</small><b>${fmt(record.rank2026)}</b></span></div><div class="ls-background"><span class="ls-evidence ${evidenceClass(background.evidenceLabel)}">${esc(background.evidenceLabel || '背景提示')}</span><b>${esc(background.direction || '学校专业背景')}</b><p>${esc(background.note || '该专业与学校办学或学科背景存在可复核连接，建议继续查看培养方案和招生章程。')}</p></div></div>${project}<div class="ls-record-actions"><details class="ls-evidence-details"><summary>查看依据与核验项</summary><div class="ls-detail-body"><p><strong>历史同口径：</strong>${esc(historyLine(record))}</p>${evidence.length ? `<div><strong>背景依据：</strong>${evidence.map(item => `<span class="ls-evidence-row">${esc(item.disciplineName || item.detail || '学校学科背景')}${item.grade ? ` · ${esc(item.grade)}` : ''}${item.evidenceYear ? ` · ${esc(item.evidenceYear)}年` : ''}</span>`).join('')}</div>` : '<p><strong>背景依据：</strong>当前证据已通过前台门禁。</p>'}<p><strong>填报前再确认：</strong>${verify.map(esc).join(' / ')}</p>${sources.length ? `<div class="ls-source-list"><strong>公开来源：</strong>${sources.map(source => `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title || source.authority || '来源')}</a>`).join('')}</div>` : ''}<p class="ls-boundary">${esc(background.boundary || '背景提示不代表录取判断、专业排名或就业承诺。')}</p></div></details><a class="ui-button ui-button--compact ui-button--secondary" href="${returnUrl}">在专业初选中查看</a></div></article>`;
}

function resolveSchoolStatus(query) {
  const key = normalizeText(query);
  if (!key) return null;
  return state.schools.find(item => [item.officialName, ...(item.admissionNames || []), ...(item.searchNames || [])].some(name => normalizeText(name) === key)) || null;
}

function matchesQuery(record, query) {
  const q = normalizeText(query);
  if (!q) return true;
  return normalizeText([record.school, record.major, record.city, record.displayLocation, record.background?.direction, record.background?.evidenceLabel, ...(record.schoolTags || []), ...(record.projectTags || [])].join(' ')).includes(q);
}

function matchesCommonFilters(record) {
  if (state.commonFilters.direction && record.background?.direction !== state.commonFilters.direction) return false;
  if (state.commonFilters.evidence && record.background?.evidenceLabel !== state.commonFilters.evidence) return false;
  if (state.commonFilters.city && !normalizeText(`${record.displayLocation} ${record.city}`).includes(normalizeText(state.commonFilters.city))) return false;
  if (state.commonFilters.projectMode === 'regular' && record.projectTags?.length) return false;
  if (state.commonFilters.projectMode === 'special' && !record.projectTags?.length) return false;
  return true;
}

function rankDistance(record, rank) {
  const recordRank = Number(record.rank2026);
  return Number.isFinite(recordRank) ? Math.abs(recordRank - rank) : Number.MAX_SAFE_INTEGER;
}

function scorePositionModel() {
  const band = activeScoreBand();
  const score = Number(state.scoreView.score);
  const rank = candidateRank();
  const bandRecords = band ? state.records.filter(record => Number(record.score2026) >= band.min && Number(record.score2026) <= band.max) : [];
  if (!Number.isFinite(score) || !Number.isFinite(rank)) {
    return { band, candidateRank: null, group: 'band', records: bandRecords };
  }
  const ordered = [...state.records].sort((a, b) =>
    rankDistance(a, rank) - rankDistance(b, rank)
    || Math.abs(Number(a.score2026) - score) - Math.abs(Number(b.score2026) - score)
    || Number(b.score2026) - Number(a.score2026)
    || Number(a.rank2026) - Number(b.rank2026)
    || String(a.school || '').localeCompare(String(b.school || ''), 'zh-CN')
  );
  const near = ordered.slice(0, 36);
  // These are alternate views, not mutually exclusive buckets. Keep the
  // closest records in upper/lower even when they also appear in “near”.
  const upper = ordered.filter(record => Number(record.rank2026) < rank);
  const lower = ordered.filter(record => Number(record.rank2026) > rank);
  const groups = { near, upper, lower, band: bandRecords };
  const group = SCORE_POSITION_GROUPS.has(state.scoreView.positionGroup) ? state.scoreView.positionGroup : 'near';
  return { band, candidateRank: rank, group, records: groups[group], groupCounts: Object.fromEntries(Object.entries(groups).map(([key, value]) => [key, value.length])) };
}

function filterRecords() {
  const schoolStatus = state.view === 'school' ? resolveSchoolStatus(state.schoolView.school) : null;
  const schoolKey = schoolStatus ? normalizeText(schoolStatus.officialName) : '';
  const q = state.view === 'list_all' ? state.listView.q : '';
  const minScore = state.view === 'list_all' && state.listView.minScore ? Number(state.listView.minScore) : null;
  const maxScore = state.view === 'list_all' && state.listView.maxScore ? Number(state.listView.maxScore) : null;
  const scoreModel = state.view === 'score' ? scorePositionModel() : null;
  const base = state.view === 'score' ? scoreModel.records : state.records;
  const records = base.filter(record => {
    if (state.view === 'school' && (!schoolStatus || normalizeText(record.school) !== schoolKey)) return false;
    if (!matchesQuery(record, q)) return false;
    if (!matchesCommonFilters(record)) return false;
    if (Number.isFinite(minScore) && Number(record.score2026) < minScore) return false;
    if (Number.isFinite(maxScore) && Number(record.score2026) > maxScore) return false;
    return true;
  });
  return { records, schoolStatus, scoreModel };
}

function paginate(records) {
  const pageCount = Math.max(1, Math.ceil(records.length / state.pageSize));
  state.page = Math.max(1, Math.min(state.page, pageCount));
  const offset = (state.page - 1) * state.pageSize;
  return { page: state.page, pageSize: state.pageSize, pageCount, total: records.length, offset, hasPrevious: state.page > 1, hasNext: state.page < pageCount, records: records.slice(offset, offset + state.pageSize) };
}

function emptyHtml(schoolStatus) {
  if (state.view === 'school' && schoolStatus) {
    if (schoolStatus.recordCount2026 > 0 && schoolStatus.matchedRecordCount === 0) return `<div class="ls-empty"><h3>${esc(schoolStatus.officialName)}当前没有可公开的背景专业记录</h3><p>已检查该校 ${fmt(schoolStatus.recordCount2026)} 条辽宁2026物理类投档专业，但当前背景证据不足以触发前台提示。这不代表学校没有优势专业。</p><a class="ui-button ui-button--secondary" href="/ln-rank/?school=${encodeURIComponent(schoolStatus.officialName)}">查看该校全部在辽专业</a></div>`;
    if (schoolStatus.recordCount2026 === 0) return `<div class="ls-empty"><h3>${esc(schoolStatus.officialName)}当前没有识别到物理类投档记录</h3><p>可能与招生科类、批次、年份或学校实体有关，不能据此判断该校不招生。</p></div>`;
  }
  if (state.view === 'school' && state.schoolView.school) return '<div class="ls-empty"><h3>没有识别到这所辽宁省内院校</h3><p>请从学校建议中选择正式名称，避免简称或校区名称歧义。</p></div>';
  if (state.view === 'score' && state.scoreView.score) return '<div class="ls-empty"><h3>这个位置暂时没有通过背景证据门禁的专业</h3><p>可以切换“冲一冲”“稳一稳”或所在分数段。未显示不代表学校没有优势专业，也不代表录取概率为零。</p></div>';
  return '<div class="ls-empty"><h3>当前条件下没有背景专业记录</h3><p>可以放宽条件、清除筛选或换用学校正式名称。未显示不代表学校没有优势专业。</p></div>';
}

function bindPaginationButtons(root) {
  root.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
    state.page = Number(button.dataset.page);
    writeUrl();
    loadResults({ scroll: true });
  }));
}

function renderPagination(page) {
  const root = $('#pagination');
  if (!page || page.total === 0 || page.pageCount <= 1) { root.innerHTML = ''; return; }
  if (matchMedia('(max-width: 767px)').matches) {
    root.innerHTML = `<button type="button" data-page="${page.page - 1}" ${page.hasPrevious ? '' : 'disabled'}>上一页</button><span class="ls-page-status">第 ${page.page} / ${page.pageCount} 页</span><button type="button" data-page="${page.page + 1}" ${page.hasNext ? '' : 'disabled'}>下一页</button>`;
    bindPaginationButtons(root);
    return;
  }
  const start = Math.max(1, page.page - 2);
  const end = Math.min(page.pageCount, page.page + 2);
  const numbers = [];
  for (let n = start; n <= end; n += 1) numbers.push(n);
  root.innerHTML = `<button type="button" data-page="${page.page - 1}" ${page.hasPrevious ? '' : 'disabled'}>上一页</button>${start > 1 ? '<span>…</span>' : ''}${numbers.map(n => `<button type="button" data-page="${n}" class="${n === page.page ? 'is-active' : ''}" aria-current="${n === page.page ? 'page' : 'false'}">${n}</button>`).join('')}${end < page.pageCount ? '<span>…</span>' : ''}<button type="button" data-page="${page.page + 1}" ${page.hasNext ? '' : 'disabled'}>下一页</button>`;
  bindPaginationButtons(root);
}

function setResultsIdle(title, message) {
  state.hasLoadedResults = false;
  $('#resultsPanel').classList.add('is-idle');
  $('#resultsTitle').textContent = title;
  $('#resultsMeta').textContent = message;
  $('#records').innerHTML = '';
  $('#pagination').innerHTML = '';
  syncControls();
}

function renderResultContext(page, schoolStatus, scoreModel) {
  let title = '全部背景专业';
  let desc = '按2026最低投档分从高到低排列。';
  if (state.view === 'school') {
    title = schoolStatus?.officialName || state.schoolView.school || '按学校查询';
    desc = schoolStatus ? `该校2026物理类投档专业 ${fmt(schoolStatus.recordCount2026)} 条，背景专业 ${fmt(schoolStatus.matchedRecordCount)} 条。` : '没有识别到准确学校。';
  } else if (state.view === 'score') {
    const band = scoreModel?.band || activeScoreBand();
    const score = state.scoreView.score;
    if (score && scoreModel?.candidateRank) {
      const copy = {
        near: [`${score}分附近｜${band?.label || '所在分数段'}的省内背景专业`, `按2026累计位次距离排序，先看与参考位次 ${fmt(scoreModel.candidateRank)} 最接近的公开背景专业。`],
        upper: [`${score}分冲一冲的省内背景专业`, `最低投档位次比参考位次更靠前，按位次距离由近到远排列。`],
        lower: [`${score}分稳一稳的省内背景专业`, `最低投档位次比参考位次更靠后，按位次距离由近到远排列。`],
        band: [`${band?.label || `${score}分所在区间`}的省内背景专业`, `完整显示所在历史分数段内通过背景证据门禁的记录。`]
      };
      [title, desc] = copy[scoreModel.group] || copy.near;
    } else {
      title = band ? `${band.label}的省内背景专业` : '按分数位置查看';
      desc = band ? `显示2026历史最低投档分位于${band.label}的记录。` : '输入分数或选择一个分数段。';
    }
  }
  $('#resultsPanel').classList.remove('is-idle');
  $('#resultsTitle').textContent = title;
  $('#resultsMeta').textContent = `${desc} 共 ${fmt(page.total)} 条，当前第 ${fmt(page.page)} / ${fmt(page.pageCount)} 页。`;
}

function currentViewIsRunnable() {
  if (state.view === 'list_all') return true;
  if (state.view === 'school') return Boolean(state.schoolView.school);
  return Boolean(activeScoreBand());
}

function loadResults({ scroll = false } = {}) {
  if (!state.index) return;
  if (state.view === 'school' && !state.schoolView.school) { setResultsIdle('按学校查询', '输入一所辽宁省内院校后，再查看该校已通过背景证据门禁的专业。'); return; }
  if (state.view === 'score' && !activeScoreBand()) { setResultsIdle('按分数位置查看', '输入344—750之间的参考分数，或展开分数段浏览。'); return; }
  const filtered = filterRecords();
  const page = paginate(filtered.records);
  state.hasLoadedResults = true;
  renderResultContext(page, filtered.schoolStatus, filtered.scoreModel);
  $('#records').innerHTML = page.records.length ? page.records.map(recordHtml).join('') : emptyHtml(filtered.schoolStatus);
  renderPagination(page);
  syncControls();
  if (scroll) $('#resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetFilters() {
  state.listView.q = '';
  state.listView.minScore = '';
  state.listView.maxScore = '';
  state.commonFilters = { direction: '', evidence: '', city: '', projectMode: 'all' };
  state.page = 1;
  syncControls();
  writeUrl();
  loadResults();
}

function applyCurrentFilters() {
  state.listView.q = $('#queryInput').value.trim();
  state.commonFilters.direction = $('#directionFilter').value;
  state.commonFilters.evidence = $('#evidenceFilter').value;
  state.commonFilters.city = $('#cityFilter').value.trim();
  state.commonFilters.projectMode = $('#projectFilter').value;
  state.listView.minScore = $('#minScoreFilter').value.trim();
  state.listView.maxScore = $('#maxScoreFilter').value.trim();
  state.page = 1;
  writeUrl();
  loadResults({ scroll: true });
}

function removeFilter(key) {
  if (key === 'q') state.listView.q = '';
  if (key === 'direction') state.commonFilters.direction = '';
  if (key === 'evidence') state.commonFilters.evidence = '';
  if (key === 'city') state.commonFilters.city = '';
  if (key === 'projectMode') state.commonFilters.projectMode = 'all';
  if (key === 'scoreRange') { state.listView.minScore = ''; state.listView.maxScore = ''; }
  state.page = 1;
  syncControls();
  writeUrl();
  loadResults();
}

function submitScore() {
  const value = $('#scoreInput').value.trim();
  const score = Number(value);
  if (!Number.isInteger(score) || score < 344 || score > 750) {
    state.scoreValidationMessage = '请输入344—750之间的整数参考分数。';
    syncControls();
    $('#scoreInput').focus();
    return;
  }
  state.scoreView.score = String(score);
  state.scoreView.band = '';
  state.scoreView.positionGroup = 'near';
  state.scoreValidationMessage = '';
  state.page = 1;
  writeUrl();
  syncControls();
  loadResults({ scroll: true });
}

function selectScoreBand(button) {
  state.scoreView.score = '';
  state.scoreView.band = button.dataset.scoreBand;
  state.scoreView.positionGroup = 'band';
  state.scoreValidationMessage = '';
  state.page = 1;
  writeUrl();
  syncControls();
  loadResults({ scroll: true });
}

function selectPositionGroup(button) {
  if (!state.scoreView.score) return;
  const group = button.dataset.positionGroup;
  if (!SCORE_POSITION_GROUPS.has(group)) return;
  state.scoreView.positionGroup = group;
  state.page = 1;
  writeUrl();
  syncControls();
  loadResults({ scroll: true });
}

function switchView(view) {
  state.view = view;
  state.page = 1;
  state.hasLoadedResults = false;
  state.scoreValidationMessage = '';
  syncControls();
  writeUrl();
  loadResults();
}

function bindTabsKeyboard() {
  const tabs = $$('.ls-view-tab');
  tabs.forEach((button, index) => button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    tabs[next].focus();
    switchView(tabs[next].dataset.view);
  }));
}

function bind() {
  $$('.ls-view-tab').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  bindTabsKeyboard();
  $('#scoreSubmit').addEventListener('click', submitScore);
  $('#scoreInput').addEventListener('input', () => {
    state.scoreValidationMessage = '';
    state.scoreView.score = $('#scoreInput').value.trim();
    state.scoreView.band = '';
    state.scoreView.positionGroup = 'near';
    syncControls();
  });
  $('#scoreInput').addEventListener('keydown', event => { if (event.key === 'Enter') submitScore(); });
  $('#schoolSubmit').addEventListener('click', () => { state.schoolView.school = $('#schoolInput').value.trim(); state.page = 1; writeUrl(); loadResults({ scroll: true }); });
  $('#schoolInput').addEventListener('keydown', event => { if (event.key === 'Enter') $('#schoolSubmit').click(); });
  $('#scoreBandButtons').addEventListener('click', event => { const button = event.target.closest('[data-score-band]'); if (button) selectScoreBand(button); });
  $('#scorePositionGroups').addEventListener('click', event => { const button = event.target.closest('[data-position-group]'); if (button) selectPositionGroup(button); });
  $('#querySubmit').addEventListener('click', applyCurrentFilters);
  $('#applyFilters').addEventListener('click', applyCurrentFilters);
  $('#resetFilters').addEventListener('click', resetFilters);
  $('#queryInput').addEventListener('keydown', event => { if (event.key === 'Enter') $('#querySubmit').click(); });
  $('#activeFilters').addEventListener('click', event => { const button = event.target.closest('[data-remove-filter]'); if (button) removeFilter(button.dataset.removeFilter); });
  window.addEventListener('popstate', () => { readUrl(); state.hasLoadedResults = false; syncControls(); loadResults(); });
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nextPageSize = pageSizeForViewport();
      if (nextPageSize === state.pageSize) return;
      const firstRecordIndex = Math.max(0, (state.page - 1) * state.pageSize);
      state.pageSize = nextPageSize;
      state.page = Math.floor(firstRecordIndex / nextPageSize) + 1;
      writeUrl(true);
      if (currentViewIsRunnable()) loadResults();
    }, 180);
  });
}

async function boot() {
  readUrl();
  setRuntime('loading');
  bind();
  try {
    const { data, rankMap } = await getStaticResources();
    state.index = data;
    state.rankMap = rankMap;
    state.meta = data.meta;
    state.schools = data.schools || [];
    state.directions = data.directions || [];
    state.scoreBands = data.scoreBands || [];
    state.records = data.records || [];
    renderStats();
    renderOptions();
    syncControls();
    setRuntime('ready');
    loadResults();
    document.body.dataset.release = CURRENT_RELEASE.display;
    document.body.dataset.localStrengthScorePosition = SCORE_POSITION_VERSION;
  } catch (error) {
    setRuntime('error', error.message);
    $('#resultsPanel').classList.remove('is-idle');
    $('#records').innerHTML = `<div class="ls-empty is-error"><h3>静态目录初始化失败</h3><p>${esc(error.message)}</p></div>`;
  }
}

boot();
