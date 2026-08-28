import { fetchApiJson, formatApiErrorForHuman, apiErrorDiagnosticHtml } from '../shared/api-client.js?v=3947_1';

const state = { meta: null, activeTab: 'school', schools: [], majors: [] };
const LEVEL_ORDER = { primary: 3, secondary: 2, trajectory: 1 };
const HIGH_FREQUENCY_MAJOR_HINTS = [
  '计算机科学与技术','软件工程','数据科学与大数据技术','人工智能','电气工程及其自动化','自动化','机械设计制造及其自动化','智能制造工程',
  '临床医学','口腔医学','药学','中医学','会计学','金融学','法学','通信工程','电子信息工程','车辆工程','土木工程','化学工程与工艺'
];

function $(id) { return document.getElementById(id); }
function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function fmt(value) { const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—'; }
function norm(value) { return String(value || '').replace(/[（(].*?[）)]/g, '').replace(/\s+/g, '').toLowerCase(); }
function contains(a, b) { return norm(a).includes(norm(b)); }
function levelClass(level) { return level === 'primary' ? 'primary' : level === 'secondary' ? 'secondary' : 'trajectory'; }
function levelText(level) { return level === 'primary' ? '本校方向' : level === 'secondary' ? '本校相关' : '方向提醒'; }
function levelHumanLabel(level) { return level === 'primary' ? '背景更明确' : level === 'secondary' ? '相关专业' : '需要再看'; }
function levelWeight(record) { const level = record?.localMainlineRaw?.level || record?.level || 'trajectory'; return LEVEL_ORDER[level] || 0; }
function scoreNum(record) { const n = Number(record?.score2025); return Number.isFinite(n) ? n : -1; }
function rankNum(record) { const n = Number(record?.rank2025); return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER; }
function scoreRange(records = []) {
  const scores = records.map(scoreNum).filter(n => Number.isFinite(n) && n > 0);
  if (!scores.length) return '';
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return min === max ? `${fmt(min)}分` : `${fmt(min)}–${fmt(max)}分`;
}
function reviewPoints(records = [], fallback = ['培养方案','课程设置','招生章程']) {
  const out = [];
  for (const r of records) {
    const ev = r.localMainline || {};
    for (const item of ev.reviewPoints || r.reviewPoints || []) {
      if (item && !out.includes(item)) out.push(item);
      if (out.length >= 4) break;
    }
    if (out.length >= 4) break;
  }
  return out.length ? out : fallback;
}
function sortRecordsForSchool(records = []) {
  return [...records].sort((a,b) => levelWeight(b)-levelWeight(a) || scoreNum(b)-scoreNum(a) || rankNum(a)-rankNum(b) || String(a.major).localeCompare(String(b.major),'zh-Hans-CN'));
}
function sortRecordsByCloseness(records = [], score = null) {
  const candidate = Number(score);
  return [...records].sort((a,b) => {
    if (Number.isFinite(candidate)) {
      const da = Math.abs(scoreNum(a) - candidate);
      const db = Math.abs(scoreNum(b) - candidate);
      if (da !== db) return da - db;
    }
    return levelWeight(b)-levelWeight(a) || scoreNum(b)-scoreNum(a) || rankNum(a)-rankNum(b);
  });
}
function sortSchoolsForHuman(schools = []) {
  return [...schools].sort((a,b) => {
    const mainA = Number(a.primaryCount || 0), mainB = Number(b.primaryCount || 0);
    const relatedA = Number(a.secondaryCount || 0), relatedB = Number(b.secondaryCount || 0);
    const hintA = Number(a.trajectoryCount || 0), hintB = Number(b.trajectoryCount || 0);
    const evidenceA = Number(a.doctoralCount || 0) + Number(a.evaluationCount || 0);
    const evidenceB = Number(b.doctoralCount || 0) + Number(b.evaluationCount || 0);
    const visibleA = a.hasMainline ? 1 : 0;
    const visibleB = b.hasMainline ? 1 : 0;
    return visibleB-visibleA || mainB-mainA || relatedB-relatedA || evidenceB-evidenceA || hintB-hintA || String(a.name).localeCompare(String(b.name),'zh-Hans-CN');
  });
}
function majorPriority(major = '') {
  const idx = HIGH_FREQUENCY_MAJOR_HINTS.findIndex(x => norm(x) === norm(major) || norm(major).includes(norm(x)) || norm(x).includes(norm(major)));
  return idx >= 0 ? (1000 - idx) : 0;
}
function sortMajorsForHuman(majors = []) {
  return [...majors].sort((a,b) => majorPriority(b.major)-majorPriority(a.major) || Number(b.primaryCount||0)-Number(a.primaryCount||0) || Number(b.secondaryCount||0)-Number(a.secondaryCount||0) || Number(b.schoolCount||0)-Number(a.schoolCount||0) || String(a.major).localeCompare(String(b.major),'zh-Hans-CN'));
}
async function fetchStaticJson(url) {
  const res = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
  const raw = await res.text();
  if (!res.ok) throw new Error(`静态索引读取失败：${res.status}`);
  return JSON.parse(raw);
}
function technicalDetails(error) {
  const diagnostic = apiErrorDiagnosticHtml(error, esc);
  if (!diagnostic) return '';
  return `<details class="lm-tech-detail"><summary>展开排查信息</summary>${diagnostic}</details>`;
}
function errorHtml(title, error, fallback = '数据暂时没有读取成功。可以稍后重试。') {
  return emptyHtml(title, `${formatApiErrorForHuman(error, fallback)}`) + technicalDetails(error);
}
async function loadMeta() {
  try {
    const data = await fetchApiJson('/api/local-mainline?mode=meta', { userMessage: '省内专业背景索引暂时没有读取成功，正在改用本地摘要。' });
    state.meta = data.index || null;
    state.schools = sortSchoolsForHuman(data.schools || state.meta?.allSchools || []);
    state.majors = sortMajorsForHuman(data.majors || state.meta?.majors || []);
  } catch (error) {
    const fallback = await fetchStaticJson('/ln-rank/data/local-mainline/local-mainline-index.generated.json');
    state.meta = fallback;
    state.schools = sortSchoolsForHuman(fallback.allSchools || []);
    state.majors = sortMajorsForHuman(fallback.majors || []);
  }
}
function renderEvidenceTags(item = {}) {
  const tags = [];
  const ev = item.localMainline || item;
  if (ev.evidence?.includes?.('博士点支撑') || ev.evidence?.doctoral?.length || item.doctoralCount) tags.push('博士点');
  if (ev.evidence?.includes?.('第四轮评估记录') || ev.evidence?.disciplineEvaluation?.length || item.evaluationCount) tags.push('学科评估记录');
  if (item.hasMainline || ev.direction) tags.push('专业对应');
  return tags.slice(0, 3).map(t => `<span class="lm-evidence-chip">${esc(t)}</span>`).join('');
}
function schoolCard(school) {
  const hasMainline = Boolean(school.hasMainline);
  const note = hasMainline
    ? (school.overview || '这个学校已有可复核的省内专业背景。')
    : '当前没有足够公开证据做省内专业背景提示，可以先按孩子位置和专业继续看。';
  return `<article class="lm-card ${hasMainline ? '' : 'is-soft-muted'}">
    <div class="lm-card-top"><div><h3>${esc(school.name)}</h3><p>${esc(school.city || '辽宁')}</p></div>${hasMainline ? '<span class="lm-pill primary">已整理</span>' : '<span class="lm-pill muted">先按孩子位置看</span>'}</div>
    <p class="lm-card-note">${esc(note)}</p>
    ${hasMainline ? `<div class="lm-stat-row"><span>本校方向 ${fmt(school.primaryCount)}</span><span>本校相关 ${fmt(school.secondaryCount)}</span><span>方向提醒 ${fmt(school.trajectoryCount)}</span></div><p class="lm-card-note is-subtle">打开后看方向分组和统一位置参考，不默认铺该校全部专业分数。</p>` : ''}
    <div class="lm-evidence-row">${renderEvidenceTags(school)}</div>
    ${hasMainline ? `<button class="lm-card-action" data-school-detail="${esc(school.name)}">查看该校专业背景</button>` : `<p class="lm-card-note is-subtle">暂无可触发的省内背景提示，建议直接看招生章程和培养方案。</p>`}
  </article>`;
}
function renderSchools() {
  const q = $('schoolSearch')?.value || '';
  const base = q ? state.schools : state.schools.filter(s => s.hasMainline);
  const arr = sortSchoolsForHuman(base.filter(s => !q || contains(s.name + s.city + s.overview, q)));
  $('schoolList').innerHTML = arr.length ? arr.slice(0, q ? 80 : 36).map(schoolCard).join('') : emptyHtml('没有找到明确的省内专业背景', '这不代表学校不好。可以换个学校名，或直接查看招生章程和培养方案。');
}
function majorCard(major) {
  return `<article class="lm-card">
    <div class="lm-card-top"><div><h3>${esc(major.major)}</h3><p>省内 ${fmt(major.schoolCount)} 所学校有可复核的专业背景</p></div><span class="lm-pill primary">省内差异</span></div>
    <div class="lm-stat-row"><span>本校方向 ${fmt(major.primaryCount)}</span><span>本校相关 ${fmt(major.secondaryCount)}</span><span>方向提醒 ${fmt(major.trajectoryCount)}</span></div>
    <p class="lm-card-note">同名专业在不同学校可能偏课程、实验室、行业场景或培养路径，建议按学校逐条看。</p>
    <button class="lm-card-action" data-major-detail="${esc(major.major)}">查看不同学校的方向差异</button>
  </article>`;
}
function renderMajorQuick() {
  const keys = [
    ['计算机/软件','计算机'],['电气/自动化','电气'],['机械/智能制造','机械'],['医学/药学','临床医学'],['财经/管理','会计学'],['师范/法学','法学'],['化工/材料','化学工程与工艺'],['交通/航空','车辆工程']
  ];
  $('majorQuickRow').innerHTML = keys.map(([label, q]) => `<button type="button" data-major-quick="${esc(q)}">${esc(label)}</button>`).join('');
}
function renderMajors() {
  const q = $('majorSearch')?.value || '';
  const arr = sortMajorsForHuman(state.majors.filter(m => !q || contains(m.major, q) || (m.schools || []).some(s => contains(s.school + s.direction, q))));
  $('majorList').innerHTML = arr.length ? arr.slice(0, 80).map(majorCard).join('') : emptyHtml('没有找到专业', '可以换成更标准的专业名称，例如“电气工程及其自动化”。');
}
function historyLine(r) {
  if (r.score2024 || r.rank2024) return `<div class="lm-history">2024同口径参考：${r.score2024 ? `${fmt(r.score2024)}分` : '分数暂无'} / ${r.rank2024 ? `${fmt(r.rank2024)}位` : '位次暂无'}${r.historyCompare?.rankTrendText ? `｜${esc(r.historyCompare.rankTrendText)}` : ''}</div>`;
  return '';
}
function recordCard(r, score = '') {
  const ev = r.localMainline || {};
  const level = r.localMainlineRaw?.level || (ev.label === '本校方向' ? 'primary' : ev.label === '本校相关' ? 'secondary' : 'trajectory');
  const scoreParam = score ? `score=${encodeURIComponent(score)}&` : '';
  const link = `/ln-rank/?${scoreParam}school=${encodeURIComponent(r.school)}&major=${encodeURIComponent(r.major)}&source=local-mainline`;
  return `<article class="lm-record-card">
    <div class="lm-record-top"><div><h3>${esc(r.school)}｜${esc(r.major)}</h3><p>${esc(r.displayLocation || '')}${r.natureLabel ? `｜${esc(r.natureLabel)}` : ''}</p></div><span class="lm-pill ${levelClass(level)}">${esc(levelHumanLabel(level))}</span></div>
    <div class="lm-data-row"><span>2025历史参考：<b>${fmt(r.score2025)}分</b></span><span>最低位次：<b>${fmt(r.rank2025)}</b></span>${Number.isFinite(Number(r.scoreDelta)) ? `<span>相对孩子：<b>${r.scoreDelta > 0 ? '+' : ''}${fmt(r.scoreDelta)}分</b></span>` : ''}</div>
    ${historyLine(r)}
    <div class="lm-mainline-row"><span>${esc(ev.label || levelText(level))}｜${esc(ev.direction || '')}</span></div>
    <div class="lm-evidence-row">${(ev.evidence || []).slice(0,3).map(x => `<span class="lm-evidence-chip">${esc(String(x).replace('支撑','').replace('评估记录','学科评估'))}</span>`).join('') || '<span class="lm-evidence-chip">省内背景证据</span>'}</div>
    <p class="lm-card-note">${esc(ev.note || '这个专业需要结合学校办学方向、课程和招生章程再看。')}</p>
    <div class="lm-review-row">建议再看：${(ev.reviewPoints || ['培养方案','课程设置','招生章程']).slice(0,4).map(esc).join(' / ')}</div>
    
  </article>`;
}
function miniRecordRow(r, score = '') {
  const ev = r.localMainline || {};
  const level = r.localMainlineRaw?.level || (ev.label === '本校方向' ? 'primary' : ev.label === '本校相关' ? 'secondary' : 'trajectory');
  const scorePart = Number.isFinite(Number(r.score2025)) ? `｜2025历史参考 ${fmt(r.score2025)}分 / ${fmt(r.rank2025)}位` : '';
  const scoreParam = score ? `score=${encodeURIComponent(score)}&` : '';
  const link = `/ln-rank/?${scoreParam}school=${encodeURIComponent(r.school)}&major=${encodeURIComponent(r.major)}&source=local-mainline`;
  return `<li class="lm-mini-record"><span class="lm-mini-title">${esc(r.major)}</span><span class="lm-mini-meta">${scorePart}｜${esc(levelText(level))}</span><a href="${link}">看分数位置</a></li>`;
}
function buildDirectionGroups(records = []) {
  const groups = new Map();
  for (const record of sortRecordsForSchool(records)) {
    const ev = record.localMainline || {};
    const direction = ev.direction || '需要再看';
    if (!groups.has(direction)) groups.set(direction, { direction, primary: [], secondary: [], trajectory: [], all: [] });
    const group = groups.get(direction);
    const level = record.localMainlineRaw?.level || (ev.label === '本校方向' ? 'primary' : ev.label === '本校相关' ? 'secondary' : 'trajectory');
    if (level === 'primary') group.primary.push(record);
    else if (level === 'secondary') group.secondary.push(record);
    else group.trajectory.push(record);
    group.all.push(record);
  }
  return [...groups.values()].sort((a,b) => (b.primary.length-a.primary.length) || (b.secondary.length-a.secondary.length) || scoreNum(b.all[0])-scoreNum(a.all[0]) || a.direction.localeCompare(b.direction,'zh-Hans-CN'));
}
function renderLevelList(title, records, score = '') {
  if (!records.length) return '';
  return `<div class="lm-direction-level"><b>${esc(title)}</b><ul>${sortRecordsForSchool(records).map(r => miniRecordRow(r, score)).join('')}</ul></div>`;
}
function renderDirectionGroup(group) {
  const range = scoreRange(group.all);
  const points = reviewPoints(group.all).map(esc).join(' / ');
  return `<section class="lm-direction-group">
    <div class="lm-direction-head"><h3>${esc(group.direction)}方向</h3>${range ? `<span>2025历史参考：${esc(range)}</span>` : ''}</div>
    ${renderLevelList('本校方向', group.primary)}
    ${renderLevelList('本校相关', group.secondary)}
    ${renderLevelList('方向提醒', group.trajectory)}
    <p class="lm-review-row">建议再看：${points}</p>
  </section>`;
}
function renderMajorLevelGroup(title, records, score = '') {
  if (!records.length) return '';
  return `<section class="lm-major-group"><h3>${esc(title)}</h3><div class="lm-record-list">${sortRecordsForSchool(records).map(r => recordCard(r, score)).join('')}</div></section>`;
}
function majorDifferenceText(major) {
  const n = norm(major);
  if (/电气|自动化/.test(n)) return `同样叫“${major}”，在不同学校里可能偏电力系统、电机电器、轨道交通、矿山电气或自动化控制。`;
  if (/计算机|软件|数据|人工智能/.test(n)) return `同样是“${major}”，不同学校可能偏软件开发、数据处理、行业信息化或智能应用，建议再看课程和实践方向。`;
  if (/机械|智能制造|车辆/.test(n)) return `同样是“${major}”，不同学校可能偏装备制造、车辆交通、航空制造或现场生产场景。`;
  if (/临床|口腔|医学|药学|中医/.test(n)) return `同样是“${major}”，不同学校在培养周期、执业路径、课程和体检要求上都需要重点核验。`;
  return `同样叫“${major}”，在不同学校里可能对应不同课程方向、学院背景和培养场景。`;
}
function buildMajorSchoolGroups(records = []) {
  return {
    primary: records.filter(r => (r.localMainlineRaw?.level || '') === 'primary'),
    secondary: records.filter(r => (r.localMainlineRaw?.level || '') === 'secondary'),
    trajectory: records.filter(r => !['primary','secondary'].includes(r.localMainlineRaw?.level || ''))
  };
}
function emptyHtml(title, desc) { return `<div class="lm-empty"><b>${esc(title)}</b><p>${esc(desc)}</p></div>`; }
function loadingHtml(text = '正在读取历史数据…') { return `<div class="lm-empty is-loading"><b>${esc(text)}</b><p>如果网络较慢，可以稍后重试。</p></div>`; }
async function showSchoolDetail(school) {
  const root = $('schoolDetail');
  root.hidden = false;
  root.innerHTML = loadingHtml();
  try {
    const data = await fetchApiJson(`/api/local-mainline?mode=school&school=${encodeURIComponent(school)}&max=240`, { userMessage: '该校专业背景数据暂时没有读取成功。可以稍后重试。' });
    const summary = state.schools.find(s => norm(s.name) === norm(school));
    const groups = buildDirectionGroups(data.records || []);
    root.innerHTML = `<div class="lm-detail-head"><h2>${esc(school)}：先看学校方向，再看 2025 历史参考</h2><p>${esc(summary?.overview || '这个学校的相关专业可以先按方向分组看，不默认展开全部专业分数。')}</p></div>${groups.length ? groups.map(renderDirectionGroup).join('') : emptyHtml('暂无 2025 分数条目', '当前有省内专业背景记录，但 2025 专业数据里暂未匹配到明确专业。')}`;
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { root.innerHTML = errorHtml('数据暂时没有读取成功', error, '请稍后重试。'); }
}
async function showMajorDetail(major) {
  const root = $('majorDetail');
  root.hidden = false;
  root.innerHTML = loadingHtml();
  try {
    const data = await fetchApiJson(`/api/local-mainline?mode=major&major=${encodeURIComponent(major)}&max=240`, { userMessage: '该专业的学校差异数据暂时没有读取成功。可以稍后重试。' });
    const split = buildMajorSchoolGroups(data.records || []);
    root.innerHTML = `<div class="lm-detail-head"><h2>${esc(major)}：省内学校方向差异</h2><p>${esc(majorDifferenceText(major))}</p></div>${data.records?.length ? [renderMajorLevelGroup('本校方向', split.primary), renderMajorLevelGroup('本校相关', split.secondary), renderMajorLevelGroup('方向提醒', split.trajectory)].join('') : emptyHtml('暂无明确匹配', '没有找到同时具备 2025 分数和省内背景证据的条目。')}`;
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { root.innerHTML = errorHtml('数据暂时没有读取成功', error, '请稍后重试。'); }
}
function fallbackScoreGroups(records = [], score) {
  const candidate = Number(score);
  const near = records.filter(r => Number(r.score2025) >= candidate - 10 && Number(r.score2025) <= candidate);
  const upper = records.filter(r => Number(r.score2025) > candidate && Number(r.score2025) <= candidate + 10);
  const lower = records.filter(r => Number(r.score2025) >= candidate - 25 && Number(r.score2025) < candidate - 10);
  return { near, upper, lower };
}
function renderScoreSection(title, desc, records, score, empty) {
  return `<section class="lm-score-section"><h3>${esc(title)}</h3><p class="lm-score-section-desc">${esc(desc)}</p>${records.length ? sortRecordsByCloseness(records, score).slice(0, 40).map(r => recordCard(r, score)).join('') : emptyHtml(empty, '可以调整查看方式，或先按学校 / 专业入口复核。')}</section>`;
}
async function queryScore() {
  const score = Number($('scoreInput').value || 0);
  const level = $('scoreLevel').value;
  const natureMode = $('scoreNature')?.value || 'all';
  const root = $('scoreResult');
  if (!Number.isFinite(score) || score <= 0) { root.innerHTML = emptyHtml('请先输入孩子当前位置', '例如 666。'); return; }
  root.innerHTML = loadingHtml('正在按孩子当前位置整理结果…');
  try {
    const data = await fetchApiJson(`/api/local-mainline?mode=position&score=${encodeURIComponent(score)}&level=${encodeURIComponent(level)}&natureMode=${encodeURIComponent(natureMode)}&max=300`, { userMessage: '分数入口数据暂时没有读取成功。可以稍后重试。' });
    const label = level === 'primary' ? '背景更明确的专业' : level === 'primary_secondary' ? '背景明确或相关的专业' : '包含方向提醒的专业';
    const grouped = data.grouped?.near ? data.grouped : fallbackScoreGroups(data.records || [], score);
    root.innerHTML = `<div class="lm-detail-head"><h2>按孩子当前位置查看${esc(label)}</h2><p>${esc(data.boundary || '这里不判断录取结果，只按 2025 历史最低分和省内专业背景整理，方便家庭先讨论。')}</p></div>
      ${renderScoreSection('接近当前位置', `${fmt(score - 10)}–${fmt(score)} 分之间，优先看离孩子当前位置近、同时有省内背景的专业。`, grouped.near || [], score, '暂无接近当前位置的明确条目')}
      ${renderScoreSection('稍高一点可少量了解', `${fmt(score + 1)}–${fmt(score + 10)} 分之间，只建议少量看看，不代表录取判断。`, grouped.upper || [], score, '暂无稍高一点的明确条目')}
      ${renderScoreSection('低一些的可讨论选择', `${fmt(score - 25)}–${fmt(score - 11)} 分之间，可作为家庭讨论的补充选择，不代表一定安全。`, grouped.lower || [], score, '暂无低一些的明确条目')}`;
  } catch (error) { root.innerHTML = errorHtml('数据暂时没有读取成功', error, '请稍后重试；这不影响主页面专业初选。'); }
}
function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.lm-tab').forEach(x => x.classList.toggle('is-active', x.dataset.tab === tab));
  document.querySelectorAll('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== tab);
  document.querySelector(`[data-panel="${tab}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function bind() {
  document.querySelectorAll('.lm-tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  document.querySelectorAll('[data-start-tab]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.startTab)));
  $('schoolSearch')?.addEventListener('input', renderSchools);
  $('majorSearch')?.addEventListener('input', renderMajors);
  $('scoreQuery')?.addEventListener('click', queryScore);
  document.addEventListener('click', event => {
    const school = event.target.closest('[data-school-detail]')?.dataset.schoolDetail;
    if (school) showSchoolDetail(school);
    const major = event.target.closest('[data-major-detail]')?.dataset.majorDetail;
    if (major) showMajorDetail(major);
    const q = event.target.closest('[data-major-quick]')?.dataset.majorQuick;
    if (q) { switchTab('major'); $('majorSearch').value = q; renderMajors(); }
  });
}
async function init() {
  bind();
  await loadMeta();
  renderSchools();
  renderMajorQuick();
  renderMajors();
}
init().catch(error => {
  document.body.insertAdjacentHTML('afterbegin', `<div class="lm-fatal">${esc(error.message || '页面初始化失败')}</div>`);
});
