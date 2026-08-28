import { MAJOR_CATALOG_2026, MAJOR_CATALOG_2026_META } from '../ln-rank/kb/major-understanding/major-catalog-2026.generated.js?v=3949_0';
import { ADMISSION_MAJOR_ALIAS_2026 } from '../ln-rank/kb/major-understanding/admission-major-alias.generated.js?v=3949_0';
import { resolveMajorUnderstanding } from '../ln-rank/js/knowledge/major-understanding-resolver.js?v=3949_0';
import { buildUndergradGraduatePathway, UNDERGRAD_GRADUATE_PATHWAY_META } from '../shared/resources/majors/undergrad-graduate-pathway.v001.js?v=001_0';
import { createMajorSearchIntentResolver, MAJOR_SEARCH_INTENT_META } from '../shared/resources/majors/major-search-intent.v001.js?v=001_0';
import { GRADUATE_CATALOG_SOURCES } from '../shared/resources/graduate/graduate-catalog-2022.v001.js?v=001_0';

const UNDERGRAD_SOURCE = Object.freeze({
  issuer: '教育部',
  title: '普通高等学校本科专业目录（2026年）',
  url: 'https://www.moe.gov.cn/srcsite/A08/moe_1034/s3882/202604/t20260427_1434931.html'
});
const SEARCH = createMajorSearchIntentResolver(MAJOR_CATALOG_2026, ADMISSION_MAJOR_ALIAS_2026);

const els = {
  form: document.querySelector('#searchForm'),
  input: document.querySelector('#majorInput'),
  suggestions: document.querySelector('#suggestions'),
  result: document.querySelector('#result'),
  disciplineChips: document.querySelector('#disciplineChips'),
  classBrowser: document.querySelector('#classBrowser')
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function classCode(major = {}) {
  const explicit = major.categoryCode || major.majorClassCode;
  if (explicit) return String(explicit);
  const raw = String(major.code || '').replace(/[^0-9]/g, '');
  return raw.length >= 4 ? raw.slice(0, 4) : '';
}

function suggestionItem(item, index = 0) {
  return `<button type="button" class="suggestion${index === 0 ? ' active' : ''}" role="option" data-major-code="${escapeHtml(item.code)}">
    <span class="suggestion-main"><span class="suggestion-name">${escapeHtml(item.name)}</span><span class="suggestion-meta">${escapeHtml(item.discipline)} · ${escapeHtml(item.majorClass)}</span></span>
    <span class="suggestion-type">${escapeHtml(item.code)}</span>
  </button>`;
}

function renderSuggestions(query) {
  const intent = SEARCH.resolve(query, { limit: 8 });
  if (intent.kind === 'empty') {
    els.suggestions.hidden = true;
    els.suggestions.innerHTML = '';
    return;
  }
  els.suggestions.hidden = false;
  if (intent.kind === 'none') {
    els.suggestions.innerHTML = '<div class="suggestion-context"><strong>暂时没认出这是哪个本科专业</strong><span>可以输入正式专业名、六位专业代码，或家长常用简称，例如“机械”“电气”“计科”“测控”。</span></div>';
    return;
  }
  if (intent.kind === 'direct') {
    els.suggestions.innerHTML = `${intent.explanation ? `<div class="suggestion-context"><strong>已按家长常用说法识别</strong><span>${escapeHtml(intent.explanation)}</span></div>` : ''}${suggestionItem(intent.major, 0)}`;
    return;
  }
  const more = intent.total > intent.candidates.length ? `还有 ${intent.total - intent.candidates.length} 个同类候选；提交后可以展开全部。` : '先选一个正式本科专业，再看它的读研方向。';
  els.suggestions.innerHTML = `<div class="suggestion-context"><strong>你可能在找下面这些专业</strong><span>${escapeHtml(intent.explanation)} ${escapeHtml(more)}</span></div>${intent.candidates.map(suggestionItem).join('')}`;
}

function degreeItem(item, professional = false) {
  const kind = professional ? '专业学位类别' : '一级学科';
  const masters = item.mastersOnly ? ' · 仅硕士专业学位' : '';
  const note = item.note ? ` · ${escapeHtml(item.note)}` : '';
  return `<div class="degree-item"><div><div class="degree-name"><span class="degree-code">${escapeHtml(item.code)}</span> ${escapeHtml(item.name)}</div><div class="degree-meta">研究生目录 · ${kind}${masters}${note}</div></div><span class="degree-tag${professional ? ' professional' : ''}">${professional ? '专硕' : '学硕'}</span></div>`;
}

function sourceItem(source, detail) {
  return `<div class="source-item"><div class="source-main"><strong>${escapeHtml(source.title)}</strong><span>${escapeHtml(source.issuer)}${detail ? ` · ${escapeHtml(detail)}` : ''}</span></div><a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">查看官方来源</a></div>`;
}

function renderFields(fields = []) {
  if (!fields.length) return '';
  return `<div class="field-block"><h4 class="field-title">当前国家招生规定明确点名的专业学位细分领域</h4><div class="field-grid">${fields.map(field => {
    const required = field.workExperienceRequired;
    const status = required ? '2026 有工作经历要求' : '2026 可按当年招生规定核验';
    return `<div class="field-item"><div class="field-head"><div class="field-name"><span class="degree-code">${escapeHtml(field.code)}</span> ${escapeHtml(field.name)}</div><span class="rule-chip${required ? '' : ' open'}">${escapeHtml(status)}</span></div>${field.note ? `<p>${escapeHtml(field.note)}</p>` : ''}${field.futureRule ? `<p><strong>已公布的变化：</strong>${escapeHtml(field.futureRule)}</p>` : ''}</div>`;
  }).join('')}</div></div>`;
}

function renderMajor(major) {
  const understanding = resolveMajorUnderstanding({
    major: major.name,
    standardMajor: { code: major.code, name: major.name, categoryName: major.majorClass }
  });
  const pathway = buildUndergradGraduatePathway(major);
  const oneLine = understanding?.matched && understanding?.card?.oneLine
    ? understanding.card.oneLine
    : `${major.name}是教育部2026本科专业目录中的本科专业，属于${major.discipline}门类、${major.majorClass}。具体课程与培养方向要继续看学校培养方案。`;
  const academicHtml = pathway.academic.length ? pathway.academic.map(item => degreeItem(item, false)).join('') : '<p class="empty-route">国家目录没有给这个本科专业规定固定的学术学位去向；需要结合目标院校招生目录继续判断。</p>';
  const professionalHtml = pathway.professional.length ? pathway.professional.map(item => degreeItem(item, true)).join('') : '<p class="empty-route">没有可在国家目录层面直接给出的专业学位类别。不要据此理解为“不能考专硕”，应继续看目标招生单位的专业目录。</p>';
  const majorClassCode = classCode(major);
  els.result.innerHTML = `<article class="result-shell" data-result-major="${escapeHtml(major.code)}">
    <header class="result-head"><div><p class="eyebrow">你高考报的是</p><h2>${escapeHtml(major.name)}</h2><div class="meta"><span class="meta-chip">本科门类：${escapeHtml(major.discipline)}</span><span class="meta-chip">本科专业类：${escapeHtml(major.majorClass)}</span></div></div><span class="code-badge">本科专业代码 ${escapeHtml(major.code)}</span></header>
    <section class="answer-first"><strong>一句话先看懂</strong><p>${escapeHtml(oneLine)}</p></section>
    <div class="divider"></div>
    <section><h3 class="section-heading">本科目录里的位置</h3><div class="undergrad-line"><div class="path-node"><small>本科门类</small><strong>${escapeHtml(major.discipline)}</strong></div><span class="path-arrow">→</span><div class="path-node"><small>本科专业类</small><strong>${majorClassCode ? `<code>${escapeHtml(majorClassCode)}</code> ` : ''}${escapeHtml(major.majorClass)}</strong></div><span class="path-arrow">→</span><div class="path-node"><small>本科专业</small><strong><code>${escapeHtml(major.code)}</code> ${escapeHtml(major.name)}</strong></div></div></section>
    <div class="divider"></div>
    <section><h3 class="section-heading">继续读研，可以先看哪些国家目录方向</h3><div class="degree-grid"><div class="degree-card"><h4>学术学位</h4><p>研究生目录里的一级学科。更偏学科研究与学术训练，但不同学校培养方案差异很大。</p><div class="degree-list">${academicHtml}</div></div><div class="degree-card"><h4>专业学位</h4><p>面向职业与应用场景的专业学位类别。代码属于研究生目录，不是本科专业代码的延伸。</p><div class="degree-list">${professionalHtml}</div></div></div>${renderFields(pathway.professionalFields)}<div class="relation-note"><strong>关系边界：</strong>${escapeHtml(pathway.note)}<br>${escapeHtml(pathway.boundary)}</div></section>
    <div class="divider"></div>
    <section><h3 class="section-heading">权威依据</h3><div class="source-list">${sourceItem(UNDERGRAD_SOURCE, `2026本科目录 · 当前库 ${MAJOR_CATALOG_2026_META.total || 883} 个专业`)}${sourceItem(GRADUATE_CATALOG_SOURCES.catalog2022, '研究生一级学科与专业学位类别，自2023年起实施')}${pathway.professionalFields.length ? sourceItem(GRADUATE_CATALOG_SOURCES.admissions2026, '仅用于页面中明确点名的2026报考条件与2027已公布变化') : ''}</div></section>
  </article>`;
  const url = new URL(location.href);
  url.searchParams.set('major', major.name);
  history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
  document.title = `${major.name}：本科专业与读研方向 - 专业升学地图`;
  els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderRecognition(intent) {
  if (!intent?.explanation || ['official_name', 'code'].includes(intent.matchType)) return;
  const shell = els.result.querySelector('.result-shell');
  const header = shell?.querySelector('.result-head');
  if (!shell || !header) return;
  const note = document.createElement('div');
  note.className = 'recognition-note';
  note.setAttribute('data-recognition-query', intent.query || '');
  note.innerHTML = `<strong>搜索识别说明</strong><span>${escapeHtml(intent.explanation)}</span>`;
  header.insertAdjacentElement('afterend', note);
}

function renderDisambiguation(intent, { expanded = false } = {}) {
  const candidates = expanded ? intent.allCandidates : intent.candidates;
  const countText = intent.total > candidates.length ? `先展示最接近的 ${candidates.length} 个，共 ${intent.total} 个候选。` : `共 ${intent.total} 个候选。`;
  els.result.innerHTML = `<section class="result-shell disambiguation-shell" data-disambiguation-query="${escapeHtml(intent.query)}">
    <header class="result-head"><div><p class="eyebrow">先确认你说的是哪个正式专业</p><h2>你说的“${escapeHtml(intent.query)}”，可能是这些</h2></div>${intent.label ? `<span class="code-badge">${escapeHtml(intent.label)}</span>` : ''}</header>
    <section class="answer-first"><strong>为什么不直接替你选一个</strong><p>${escapeHtml(intent.explanation)}</p></section>
    <p class="disambiguation-count">${escapeHtml(countText)}</p>
    <div class="disambiguation-grid">${candidates.map(item => `<button type="button" class="disambiguation-card" data-major-code="${escapeHtml(item.code)}"><span class="disambiguation-name">${escapeHtml(item.name)}</span><span class="disambiguation-meta">${escapeHtml(item.code)} · ${escapeHtml(item.majorClass)}</span></button>`).join('')}</div>
    ${!expanded && intent.total > candidates.length ? `<div class="load-more-wrap"><button type="button" class="load-more" data-expand-disambiguation="${escapeHtml(intent.query)}">展开全部 ${intent.total} 个</button></div>` : ''}
    <div class="relation-note"><strong>这里做的是语义消歧：</strong>家长简称、专业类简称和关键词只用来找候选，不会静默改成某一个正式本科专业。你点中具体专业后，页面才进入本科→研究生路径。</div>
  </section>`;
  els.suggestions.hidden = true;
  els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function submitQuery(query) {
  const intent = SEARCH.resolve(query, { limit: 8 });
  if (intent.kind === 'direct') {
    els.input.value = intent.major.name;
    els.suggestions.hidden = true;
    renderMajor(intent.major);
    renderRecognition(intent);
    return;
  }
  if (intent.kind === 'ambiguous') {
    renderDisambiguation(intent);
    return;
  }
  els.result.innerHTML = '<section class="result-shell"><div class="answer-first"><strong>没有匹配到规范本科专业</strong><p>请尝试输入教育部本科专业全名、六位本科专业代码，或家长常用简称。模糊说法只会进入候选消歧，不会被强行当成一个具体专业。</p></div></section>';
}

function renderBrowse() {
  const disciplineMap = new Map();
  for (const major of MAJOR_CATALOG_2026) {
    if (!disciplineMap.has(major.discipline)) disciplineMap.set(major.discipline, new Map());
    const classMap = disciplineMap.get(major.discipline);
    if (!classMap.has(major.majorClass)) classMap.set(major.majorClass, []);
    classMap.get(major.majorClass).push(major);
  }
  els.disciplineChips.innerHTML = [...disciplineMap.keys()].map(name => `<button type="button" class="discipline-chip" aria-pressed="false" data-discipline="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('');
  els.disciplineChips.addEventListener('click', event => {
    const button = event.target.closest('[data-discipline]');
    if (!button) return;
    const discipline = button.dataset.discipline;
    for (const chip of els.disciplineChips.querySelectorAll('[data-discipline]')) chip.setAttribute('aria-pressed', chip === button ? 'true' : 'false');
    const classMap = disciplineMap.get(discipline);
    els.classBrowser.hidden = false;
    els.classBrowser.innerHTML = `<h3 class="class-title">${escapeHtml(discipline)} · 先选专业类</h3><div class="class-list">${[...classMap.entries()].map(([name, majors]) => `<button type="button" class="class-chip" data-major-class="${escapeHtml(name)}">${escapeHtml(name)} · ${majors.length}</button>`).join('')}</div><div id="browseMajors" class="major-list" hidden></div>`;
    els.classBrowser.querySelector('.class-list').addEventListener('click', classEvent => {
      const classButton = classEvent.target.closest('[data-major-class]');
      if (!classButton) return;
      const majors = classMap.get(classButton.dataset.majorClass) || [];
      const target = els.classBrowser.querySelector('#browseMajors');
      target.hidden = false;
      target.innerHTML = majors.map(item => `<button type="button" class="major-chip" data-major-code="${escapeHtml(item.code)}">${escapeHtml(item.name)}</button>`).join('');
    }, { once: false });
  });
  els.classBrowser.addEventListener('click', event => {
    const button = event.target.closest('.major-chip[data-major-code]');
    if (!button) return;
    const major = MAJOR_CATALOG_2026.find(item => item.code === button.dataset.majorCode);
    if (major) { els.input.value = major.name; renderMajor(major); }
  });
}

els.input.addEventListener('input', () => renderSuggestions(els.input.value));
els.input.addEventListener('keydown', event => {
  if (event.key === 'Escape') els.suggestions.hidden = true;
  if (event.key === 'Enter') {
    event.preventDefault();
    submitQuery(els.input.value);
  }
});
els.suggestions.addEventListener('click', event => {
  const button = event.target.closest('[data-major-code]');
  if (!button) return;
  const intent = SEARCH.resolve(els.input.value, { limit: 8 });
  const major = MAJOR_CATALOG_2026.find(item => item.code === button.dataset.majorCode);
  if (major) {
    els.input.value = major.name;
    els.suggestions.hidden = true;
    renderMajor(major);
    if (intent.kind === 'direct' && intent.major?.code === major.code) renderRecognition(intent);
  }
});
els.result.addEventListener('click', event => {
  const majorButton = event.target.closest('[data-major-code]');
  if (majorButton) {
    const major = MAJOR_CATALOG_2026.find(item => item.code === majorButton.dataset.majorCode);
    if (major) { els.input.value = major.name; renderMajor(major); }
    return;
  }
  const expand = event.target.closest('[data-expand-disambiguation]');
  if (expand) {
    const intent = SEARCH.resolve(expand.dataset.expandDisambiguation, { limit: 100 });
    if (intent.kind === 'ambiguous') renderDisambiguation(intent, { expanded: true });
  }
});
els.form.addEventListener('submit', event => { event.preventDefault(); submitQuery(els.input.value); });
for (const button of document.querySelectorAll('[data-major-example]')) button.addEventListener('click', () => submitQuery(button.dataset.majorExample));
document.addEventListener('click', event => { if (!event.target.closest('.input-wrap')) els.suggestions.hidden = true; });

renderBrowse();
const initial = new URL(location.href).searchParams.get('major');
if (initial) submitQuery(initial);

window.__MAJOR_PATH_META__ = Object.freeze({
  version: 'major-path-v0.01',
  undergraduateCount: MAJOR_CATALOG_2026.length,
  relationVersion: UNDERGRAD_GRADUATE_PATHWAY_META.version,
  searchVersion: MAJOR_SEARCH_INTENT_META.version
});
