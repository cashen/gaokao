import { fetchApiJson, formatApiErrorForHuman, apiErrorDiagnosticHtml } from '../shared/api-client.js?v=3933_10';
const state = { meta: null, activeTab: 'school', schools: [], majors: [] };
function $(id) { return document.getElementById(id); }
function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function fmt(value) { const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—'; }
function norm(value) { return String(value || '').replace(/\s+/g, '').toLowerCase(); }
function contains(a, b) { return norm(a).includes(norm(b)); }
function levelClass(level) { return level === 'primary' ? 'primary' : level === 'secondary' ? 'secondary' : 'trajectory'; }
function levelText(level) { return level === 'primary' ? '本校方向' : level === 'secondary' ? '本校相关' : '方向提醒'; }
function levelHumanLabel(level) {
  if (level === 'primary') return '背景更明确';
  if (level === 'secondary') return '相关专业';
  return '需要再看';
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
    state.schools = data.schools || state.meta?.allSchools || [];
    state.majors = data.majors || state.meta?.majors || [];
  } catch (error) {
    const fallback = await fetchStaticJson('/ln-rank/data/local-mainline/local-mainline-index.generated.json');
    state.meta = fallback;
    state.schools = fallback.allSchools || [];
    state.majors = fallback.majors || [];
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
  const total = Number(school.primaryCount || 0) + Number(school.secondaryCount || 0) + Number(school.trajectoryCount || 0);
  const note = hasMainline
    ? (school.overview || '这个学校已有可复核的省内专业背景。')
    : '当前没有足够公开证据做省内专业背景提示，可以先按分数和专业继续看。';
  return `<article class="lm-card ${hasMainline ? '' : 'is-soft-muted'}">
    <div class="lm-card-top"><div><h3>${esc(school.name)}</h3><p>${esc(school.city || '辽宁')}</p></div>${hasMainline ? '<span class="lm-pill primary">已整理</span>' : '<span class="lm-pill muted">先按分数看</span>'}</div>
    <p class="lm-card-note">${esc(note)}</p>
    ${hasMainline ? `<div class="lm-stat-row"><span>本校方向 ${fmt(school.primaryCount)}</span><span>本校相关 ${fmt(school.secondaryCount)}</span><span>方向提醒 ${fmt(school.trajectoryCount)}</span></div>` : ''}
    <div class="lm-evidence-row">${renderEvidenceTags(school)}</div>
    ${hasMainline ? `<button class="lm-card-action" data-school-detail="${esc(school.name)}">查看这个学校的专业背景</button>` : `<a class="lm-card-text-link" href="/ln-rank/?school=${encodeURIComponent(school.name)}&source=local-mainline">回到专业初选继续看</a>`}
  </article>`;
}
function renderSchools() {
  const q = $('schoolSearch')?.value || '';
  const base = q ? state.schools : state.schools.filter(s => s.hasMainline);
  const arr = base.filter(s => !q || contains(s.name + s.city + s.overview, q));
  $('schoolList').innerHTML = arr.length ? arr.slice(0, q ? 80 : 36).map(schoolCard).join('') : emptyHtml('没有找到明确的省内专业背景', '这不代表学校不好。可以换个学校名，或回到专业初选工具按分数和专业继续看。');
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
    ['计算机/软件','计算机'],['电气/自动化','电气'],['机械/智能制造','机械'],['医学/药学','临床医学'],['财经/管理','会计学'],['师范/法学','法学'],['化工/材料','化学工程与工艺'],['土木/建筑','土木工程']
  ];
  $('majorQuickRow').innerHTML = keys.map(([label, q]) => `<button type="button" data-major-quick="${esc(q)}">${esc(label)}</button>`).join('');
}
function renderMajors() {
  const q = $('majorSearch')?.value || '';
  const arr = state.majors.filter(m => !q || contains(m.major, q) || (m.schools || []).some(s => contains(s.school + s.direction, q)));
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
    <div class="lm-data-row"><span>2025最低分：<b>${fmt(r.score2025)}分</b></span><span>2025最低位次：<b>${fmt(r.rank2025)}</b></span>${Number.isFinite(Number(r.scoreDelta)) ? `<span>相对孩子：<b>${r.scoreDelta > 0 ? '+' : ''}${fmt(r.scoreDelta)}分</b></span>` : ''}</div>
    ${historyLine(r)}
    <div class="lm-mainline-row"><span>${esc(ev.label || levelText(level))}｜${esc(ev.direction || '')}</span></div>
    <div class="lm-evidence-row">${(ev.evidence || []).slice(0,3).map(x => `<span class="lm-evidence-chip">${esc(String(x).replace('支撑','').replace('评估记录','学科评估'))}</span>`).join('') || '<span class="lm-evidence-chip">省内背景证据</span>'}</div>
    <p class="lm-card-note">${esc(ev.note || '这个专业需要结合学校办学方向、课程和招生章程再看。')}</p>
    <div class="lm-review-row">建议再看：${(ev.reviewPoints || ['培养方案','课程设置','招生章程']).slice(0,4).map(esc).join(' / ')}</div>
    <div class="lm-card-links"><a href="${link}">回到初选工具查看</a></div>
  </article>`;
}
function emptyHtml(title, desc) { return `<div class="lm-empty"><b>${esc(title)}</b><p>${esc(desc)}</p></div>`; }
function loadingHtml(text = '正在读取 2025 历史数据…') { return `<div class="lm-empty is-loading"><b>${esc(text)}</b><p>如果网络较慢，可以稍后重试，或返回专业初选继续查询。</p></div>`; }
async function showSchoolDetail(school) {
  const root = $('schoolDetail');
  root.hidden = false;
  root.innerHTML = loadingHtml();
  try {
    const data = await fetchApiJson(`/api/local-mainline?mode=school&school=${encodeURIComponent(school)}&max=240`, { userMessage: '该校专业背景数据暂时没有读取成功。可以稍后重试。' });
    root.innerHTML = `<div class="lm-detail-head"><h2>${esc(school)}：2025 历史数据中的省内背景专业</h2><p>先看 2025/2024 历史数据，再看本校方向、本校相关和方向提醒。这里不是录取判断。</p></div>${data.records?.length ? data.records.map(r => recordCard(r)).join('') : emptyHtml('暂无 2025 分数条目', '当前有省内专业背景记录，但 2025 专业数据里暂未匹配到明确专业。')}`;
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { root.innerHTML = errorHtml('数据暂时没有读取成功', error, '请稍后重试。'); }
}
async function showMajorDetail(major) {
  const root = $('majorDetail');
  root.hidden = false;
  root.innerHTML = loadingHtml();
  try {
    const data = await fetchApiJson(`/api/local-mainline?mode=major&major=${encodeURIComponent(major)}&max=240`, { userMessage: '该专业的学校差异数据暂时没有读取成功。可以稍后重试。' });
    root.innerHTML = `<div class="lm-detail-head"><h2>${esc(major)}：省内学校方向差异</h2><p>同名专业在不同学校可能对应不同培养方向，先看硬数据，再看证据。</p></div>${data.records?.length ? data.records.map(r => recordCard(r)).join('') : emptyHtml('暂无明确匹配', '没有找到同时具备 2025 分数和省内背景证据的条目。')}`;
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { root.innerHTML = errorHtml('数据暂时没有读取成功', error, '请稍后重试。'); }
}
async function queryScore() {
  const score = Number($('scoreInput').value || 0);
  const level = $('scoreLevel').value;
  const natureMode = $('scoreNature')?.value || 'all';
  const root = $('scoreResult');
  if (!Number.isFinite(score) || score <= 0) { root.innerHTML = emptyHtml('请先输入孩子分数', '例如 580。'); return; }
  root.innerHTML = loadingHtml('正在按 2025 历史分数整理结果…');
  try {
    const data = await fetchApiJson(`/api/local-mainline?mode=score&score=${encodeURIComponent(score)}&level=${encodeURIComponent(level)}&natureMode=${encodeURIComponent(natureMode)}&max=300`, { userMessage: '分数入口数据暂时没有读取成功。可以稍后重试。' });
    const label = level === 'primary' ? '背景更明确的专业' : level === 'primary_secondary' ? '背景明确或相关的专业' : '包含方向提醒的专业';
    const under = data.grouped?.under || [];
    const upper = data.grouped?.upper || [];
    root.innerHTML = `<div class="lm-detail-head"><h2>2025 历史数据中，最低分不高于 ${fmt(score)} 分的${esc(label)}</h2><p>${esc(data.boundary || '这里不是录取概率，只是把 2025 年历史最低分不高于该分数、且有省内专业背景记录的条目列出来，方便家庭先讨论。')}</p></div>
      <section class="lm-score-section"><h3>不高于该分数</h3>${under.length ? under.map(r => recordCard(r, score)).join('') : emptyHtml('暂无不高于该分数的明确条目', '可以切换到“多看一些相关专业”，或回到专业初选工具扩大查看范围。')}</section>
      <section class="lm-score-section"><h3>稍高一点可少量了解</h3>${upper.length ? upper.slice(0,40).map(r => recordCard(r, score)).join('') : '<p class="lm-muted">暂无 +10 分内的省内背景条目。</p>'}</section>`;
  } catch (error) { root.innerHTML = errorHtml('数据暂时没有读取成功', error, '请稍后重试，或返回专业初选工具。'); }
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
