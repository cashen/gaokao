import { formatHistoricalEvidenceText } from '../../../shared/resources/exam/historical-score-rank-contract.js?v=3968_0';
import { fetchApiJson, formatApiErrorForHuman, apiErrorDiagnosticHtml } from '../shared/api-client.js?v=3951_0';

const $ = id => document.getElementById(id);
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const fmt = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString('zh-CN') : '—';
const norm = value => String(value || '').replace(/[（(].*?[）)]/g, '').replace(/\s+/g, '').toLowerCase();
const scope = document.body?.dataset?.backgroundScope === '211' ? '211' : 'liaoning';
const state = { meta: null, schools: [], majors: [], activeTab: 'school' };

const COPY = Object.freeze({
  liaoning: {
    pageName: '省内学校专业背景',
    schoolEmpty: '当前没有通过权威来源门禁的省内专业背景记录。',
    majorEmpty: '当前没有通过权威来源门禁的省内学校专业记录。',
    positionTitle: '按孩子当前位置查看省内学校专业背景',
    sourceLabel: '背景证据来源'
  },
  '211': {
    pageName: '211院校专业背景',
    schoolEmpty: '当前没有通过权威来源门禁的211专业背景记录。',
    majorEmpty: '当前没有通过权威来源门禁的211学校专业记录。',
    positionTitle: '按孩子当前位置查看211院校专业背景',
    sourceLabel: '背景证据来源'
  }
})[scope];

function emptyHtml(title, desc = '') {
  return `<div class="lm-empty"><b>${esc(title)}</b>${desc ? `<p>${esc(desc)}</p>` : ''}</div>`;
}

function loadingHtml(text = '正在读取统一背景证据…') {
  return `<div class="lm-empty is-loading"><b>${esc(text)}</b><p>只显示通过权威来源门禁的记录。</p></div>`;
}

function errorHtml(title, error) {
  const detail = apiErrorDiagnosticHtml(error, esc);
  return `${emptyHtml(title, formatApiErrorForHuman(error, '数据暂时没有读取成功，可以稍后重试。'))}${detail ? `<details class="lm-tech-detail"><summary>展开排查信息</summary>${detail}</details>` : ''}`;
}

function sourceRows(background = {}) {
  const sources = Array.isArray(background.sources) ? background.sources : [];
  if (!sources.length) return '<p class="ab-source-empty">来源未通过门禁，本条不应进入活动结果。</p>';
  return `<div class="ab-source-list">${sources.map(source => `<a class="ab-source" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(source.title)}</b><span>背景证据年份：${esc(source.year || '未标注')}｜${esc(source.authority || '')}</span></a>`).join('')}</div>`;
}

function evidenceRows(background = {}) {
  const evidence = Array.isArray(background.evidence) ? background.evidence : [];
  if (!evidence.length) return '';
  return `<div class="ab-evidence-list">${evidence.map(item => `<div class="ab-evidence"><b>${esc(item.disciplineName || item.detail || '学校学科背景')}</b><span>${esc(item.evidenceYear ? `${item.evidenceYear}年证据` : '背景证据年份未标注')}${item.grade ? `｜${esc(item.grade)}` : ''}</span><small>${esc(item.detail || '')}</small></div>`).join('')}</div>`;
}

function historyHtml(record = {}) {
  const text = formatHistoricalEvidenceText(record, { years: [2025, 2024], prefix: false, empty: '' });
  return text
    ? `<div class="ab-history"><b>历史同口径：</b>${esc(text)}</div>`
    : '<div class="ab-history is-empty"><b>历史同口径：</b>暂无2025/2024严格同口径记录</div>';
}

function rankText(record = {}) {
  const start = Number(record.rankStart2026);
  const end = Number(record.rankEnd2026 ?? record.rank2026);
  if (Number.isFinite(start) && Number.isFinite(end)) return start === end ? fmt(end) : `${fmt(start)}–${fmt(end)}`;
  return fmt(record.rank2026);
}

function recordCard(record = {}) {
  const background = record.academicBackground || {};
  const trace = record.rankingTrace || {};
  return `<article class="lm-record-card ab-record" data-background-scope="${esc(scope)}">
    <div class="lm-record-top"><div><h3>${esc(record.school)}｜${esc(record.major)}</h3><p>${esc(record.displayLocation || '')}${record.natureLabel ? `｜${esc(record.natureLabel)}` : ''}</p></div><span class="lm-pill ${esc(background.level || 'trajectory')}">${esc(background.label || '背景证据')}</span></div>
    <div class="lm-data-row"><span>2026投档参考：<b>${fmt(record.score2026)}分</b></span><span>2026同分位次：<b>${rankText(record)}</b></span>${Number.isFinite(Number(record.scoreDelta2026 ?? record.scoreDelta)) ? `<span>相对参考分数：<b>${Number(record.scoreDelta2026 ?? record.scoreDelta) > 0 ? '+' : ''}${fmt(record.scoreDelta2026 ?? record.scoreDelta)}分</b></span>` : ''}</div>
    ${historyHtml(record)}
    <div class="ab-background-head"><b>${esc(background.label || '背景证据')}｜${esc(background.direction || '学校专业背景')}</b><span>投档年份与背景证据年份分开显示</span></div>
    ${evidenceRows(background)}
    <details class="ab-sources"><summary>${esc(COPY.sourceLabel)}（${fmt(background.sources?.length || 0)}）</summary>${sourceRows(background)}</details>
    <p class="lm-card-note">${esc(background.note || '背景证据只用于学校专业方向复核，需继续查看培养方案和招生章程。')}</p>
    <div class="lm-review-row">建议再看：${(background.reviewPoints || ['培养方案', '招生章程']).map(esc).join(' / ')}</div>
    ${trace.primaryMetric ? `<p class="ab-ranking-trace">位置排序：${esc(trace.primaryMetric === 'rank-distance-2026' ? '2026位次距离优先' : '2026分数距离兜底')}</p>` : ''}
  </article>`;
}

function schoolCard(item = {}) {
  return `<article class="lm-card"><div class="lm-card-top"><div><h3>${esc(item.school || item.name)}</h3><p>${esc(item.city || item.province || (scope === 'liaoning' ? '辽宁' : '211院校'))}</p></div><span class="lm-pill primary">${scope === '211' ? '211' : '省内'}</span></div><p class="lm-card-note">${esc(item.overview || '打开后只显示通过权威来源门禁、并能对应2026招生专业的背景记录。')}</p><button class="lm-card-action" data-school-detail="${esc(item.school || item.name)}">查看统一背景证据</button></article>`;
}

function majorCard(item = {}) {
  return `<article class="lm-card"><div class="lm-card-top"><div><h3>${esc(item.major)}</h3><p>涉及 ${fmt(item.schoolCount)} 所学校的历史背景索引</p></div><span class="lm-pill primary">专业</span></div><p class="lm-card-note">打开后按统一学校身份、专业身份和权威来源门禁重新匹配，不直接使用旧KB结论。</p><button class="lm-card-action" data-major-detail="${esc(item.major)}">查看统一背景证据</button></article>`;
}

function renderSchools() {
  const query = norm($('schoolSearch')?.value || '');
  const list = state.schools.filter(item => !query || norm(`${item.school || item.name}${item.city}${item.overview}`).includes(query));
  $('schoolList').innerHTML = list.length ? list.slice(0, query ? 80 : 42).map(schoolCard).join('') : emptyHtml('没有找到学校', '可以换用学校正式名称。');
  $('schoolList').querySelectorAll('[data-school-detail]').forEach(button => button.addEventListener('click', () => showDetail('school', button.dataset.schoolDetail)));
}

function renderMajors() {
  const query = norm($('majorSearch')?.value || '');
  const list = state.majors.filter(item => !query || norm(item.major).includes(query));
  $('majorList').innerHTML = list.length ? list.slice(0, query ? 100 : 48).map(majorCard).join('') : emptyHtml('没有找到专业', '可以换用教育部专业目录中的标准专业名称。');
  $('majorList').querySelectorAll('[data-major-detail]').forEach(button => button.addEventListener('click', () => showDetail('major', button.dataset.majorDetail)));
}

async function showDetail(mode, value) {
  const root = mode === 'school' ? $('schoolDetail') : $('majorDetail');
  root.hidden = false;
  root.innerHTML = loadingHtml();
  try {
    const data = await fetchApiJson(`/api/academic-background?scope=${encodeURIComponent(scope)}&mode=${encodeURIComponent(mode)}&${mode}=${encodeURIComponent(value)}&max=320`, { userMessage: '统一背景证据暂时没有读取成功。' });
    root.innerHTML = `<div class="lm-detail-head"><h2>${esc(value)}：统一背景证据</h2><p>${esc(data.boundary || state.meta?.boundary || '')}</p></div>${data.records?.length ? `<div class="lm-record-list">${data.records.map(recordCard).join('')}</div>` : emptyHtml(mode === 'school' ? COPY.schoolEmpty : COPY.majorEmpty, '旧KB中缺少精确权威来源的线索已被拦截，不会伪装成确定背景。')}`;
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    root.innerHTML = errorHtml('统一背景证据暂时没有读取成功', error);
  }
}

function renderScoreSection(title, desc, records = []) {
  return `<section class="lm-score-section"><h3>${esc(title)}</h3><p class="lm-score-section-desc">${esc(desc)}</p>${records.length ? records.map(recordCard).join('') : emptyHtml('这一段没有通过来源门禁的记录', '不使用待核验旧线索填充结果。')}</section>`;
}

async function queryScore() {
  const score = Number($('scoreInput')?.value);
  const root = $('scoreResult');
  if (!Number.isFinite(score) || score < 344 || score > 750) {
    root.innerHTML = emptyHtml('请输入344—750之间的参考分数', '输入的是模考或预估分数，不是录取结论。');
    return;
  }
  root.innerHTML = loadingHtml('正在按2026位置和权威背景证据整理结果…');
  try {
    const level = $('scoreLevel')?.value || 'primary_secondary';
    const natureMode = $('scoreNature')?.value || 'all';
    const data = await fetchApiJson(`/api/academic-background?scope=${encodeURIComponent(scope)}&mode=position&score=${encodeURIComponent(score)}&level=${encodeURIComponent(level)}&natureMode=${encodeURIComponent(natureMode)}&max=360`, { userMessage: '位置背景查询暂时没有读取成功。' });
    root.innerHTML = `<div class="lm-detail-head"><h2>${esc(COPY.positionTitle)}</h2><p>${esc(data.boundary || '')}</p><p class="ab-year-caliber">投档：2026｜历史对照：2025、2024｜背景证据：按每条来源的实际年份</p></div>
      ${data.count === 0 ? emptyHtml('附近没有通过权威来源门禁的记录', data.humanMessage || '') : ''}
      ${renderScoreSection('接近当前位置', `${fmt(score - 10)}–${fmt(score)}分范围；内部排序优先使用2026位次距离。`, data.grouped?.near || [])}
      ${renderScoreSection('稍高一点可少量了解', `${fmt(score + 1)}–${fmt(score + 10)}分范围，只作历史讨论。`, data.grouped?.upper || [])}
      ${renderScoreSection('低一些的可讨论选择', `${fmt(score - 25)}–${fmt(score - 11)}分范围，不代表安全或录取概率。`, data.grouped?.lower || [])}`;
  } catch (error) {
    root.innerHTML = errorHtml('位置背景查询暂时没有读取成功', error);
  }
}

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.lm-tab').forEach(button => button.classList.toggle('is-active', button.dataset.tab === tab));
  document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== tab; });
}

function bind() {
  document.querySelectorAll('.lm-tab').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
  document.querySelectorAll('[data-start-tab]').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.startTab)));
  $('schoolSearch')?.addEventListener('input', renderSchools);
  $('majorSearch')?.addEventListener('input', renderMajors);
  $('scoreQuery')?.addEventListener('click', queryScore);
  $('scoreInput')?.addEventListener('keydown', event => { if (event.key === 'Enter') queryScore(); });
}

async function boot() {
  document.body.dataset.academicBackgroundRuntime = 'loading';
  bind();
  try {
    const data = await fetchApiJson(`/api/academic-background?scope=${encodeURIComponent(scope)}&mode=meta`, { userMessage: `${COPY.pageName}索引暂时没有读取成功。` });
    state.meta = data.meta || null;
    state.schools = Array.isArray(data.schools) ? data.schools : [];
    state.majors = Array.isArray(data.majors) ? data.majors : [];
    renderSchools();
    renderMajors();
    const params = new URLSearchParams(location.search);
    if (params.get('score')) { switchTab('score'); $('scoreInput').value = params.get('score'); queryScore(); }
    else if (params.get('major')) { switchTab('major'); $('majorSearch').value = params.get('major'); renderMajors(); }
    else if (params.get('school')) { switchTab('school'); $('schoolSearch').value = params.get('school'); renderSchools(); }
    document.body.dataset.academicBackgroundRuntime = 'ready';
  } catch (error) {
    document.body.dataset.academicBackgroundRuntime = 'error';
    $('schoolList').innerHTML = errorHtml(`${COPY.pageName}索引暂时没有读取成功`, error);
    $('majorList').innerHTML = errorHtml(`${COPY.pageName}索引暂时没有读取成功`, error);
  }
}

boot();
