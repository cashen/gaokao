import { findSchoolEntityByName, getSchoolEntity, publicSchoolEntity } from '../data/school-entities-v150.js?v=150';
import { escapeHtml as html, escapeAttribute as attr } from './tongxue-runtime-utils-v159.js?v=159';

export function setTongxueIndexStatus(ui, message, tone = 'preparing') {
  const container = ui?.indexStatus;
  const messageNode = ui?.indexStatusMessage || container;
  if (!container || !messageNode) return;
  messageNode.textContent = message;
  container.dataset.status = tone;
  if (ui.retryIndex) ui.retryIndex.hidden = tone !== 'error';
}

export function createTongxueSearchView(ui, state) {
  function commit(kind, markup) {
    state.renderCount += 1;
    state.lastRenderKind = kind;
    ui.result.dataset.viewState = kind;
    ui.result.innerHTML = markup;
    syncHero(kind);
  }

  function syncHero(kind) {
    const resultOnly = state.directMode && !['idle', 'confirmation', 'region'].includes(kind);
    if (ui.hero) ui.hero.hidden = resultOnly;
    if (ui.changeSchool) ui.changeSchool.hidden = !resultOnly;
    document.body.classList.toggle('tongxue-direct-result', resultOnly);
    document.body.classList.toggle('tongxue-needs-confirmation', state.directMode && !resultOnly);
  }

  function focusResult() {
    requestAnimationFrame(() => document.getElementById('resultTitle')?.focus({ preventScroll: false }));
  }

  function announce(message) {
    ui.liveStatus.textContent = '';
    requestAnimationFrame(() => { ui.liveStatus.textContent = message; });
  }

  function setIndexStatus(message, tone = 'preparing') {
    setTongxueIndexStatus(ui, message, tone);
  }

  function setSuggestions(candidates, message = '', options = {}) {
    const scope = options.scope === 'major' ? 'major' : 'school';
    state.suggestions = Array.isArray(candidates) ? candidates : [];
    state.activeSuggestion = -1;
    if (!state.suggestions.length) {
      ui.suggestions.innerHTML = `<div class="suggestion-empty">${html(message || '暂时没有找到明显匹配。可以补充地区或输入更完整的名称。')}</div>`;
      openSuggestions();
      return;
    }
    ui.suggestions.innerHTML = state.suggestions.map((item, index) => {
      const meta = state.metadata.get(item.officialName) || {};
      const detail = scope === 'major'
        ? [item.majorCode, item.majorClass].filter(Boolean).join(' · ')
        : [meta.location, meta.level].filter(Boolean).join(' · ');
      return `<button id="schoolOption${index}" class="suggestion" type="button" role="option" data-suggestion-index="${index}" aria-selected="false"><span class="suggestion-main"><span class="suggestion-name">${html(item.officialName)}</span>${detail ? `<span class="suggestion-meta">${html(detail)}</span>` : ''}</span><span class="suggestion-type">${html(matchTypeLabel(item.matchType, scope))}</span></button>`;
    }).join('');
    openSuggestions();
  }

  function openSuggestions() {
    ui.suggestions.hidden = false;
    ui.input.setAttribute('aria-expanded', 'true');
  }

  function closeSuggestions() {
    ui.suggestions.hidden = true;
    ui.input.setAttribute('aria-expanded', 'false');
    ui.input.removeAttribute('aria-activedescendant');
    state.activeSuggestion = -1;
  }

  function setActiveSuggestion(index) {
    state.activeSuggestion = index;
    ui.suggestions.querySelectorAll('[data-suggestion-index]').forEach((button, i) => {
      const active = i === index;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      if (active) {
        button.scrollIntoView({ block: 'nearest' });
        ui.input.setAttribute('aria-activedescendant', button.id);
      }
    });
  }

  function showResolved(input, officialName, options = {}) {
    if (!input || input === officialName) {
      hideResolved();
      return;
    }
    const noun = options.scope === 'major' ? '专业' : '学校';
    ui.resolveHint.innerHTML = `<span>已找到：${html(input)} → ${html(officialName)}</span><button type="button" class="resolve-change" data-change-resolution>不是这个${noun}？</button>`;
    ui.resolveHint.hidden = false;
  }

  function hideResolved() {
    ui.resolveHint.hidden = true;
    ui.resolveHint.textContent = '';
  }

  function renderRegion(region) {
    const countText = region.entityTotal
      ? `${region.officialTotal} 所学校，另有 ${region.entityTotal} 个分校或校区`
      : `${region.total} 所学校`;
    if (region.region.type === 'province' && !region.region.keyword && Array.isArray(region.cityGroups)) {
      const cities = region.cityGroups.map(item => `<button type="button" class="choice-card" data-region-query="${attr(item.query)}"><span class="choice-name">${html(item.city)}</span><span class="choice-note">${item.count} 所学校 · 查看</span></button>`).join('');
      commit('region', `<article class="result-shell"><div class="result-head"><h2 id="resultTitle" tabindex="-1">${html(region.region.label)}高校</h2><span class="badge">地区</span></div><div class="meta"><span class="meta-chip">${html(countText)}</span></div><div class="divider"></div><div class="section-heading">选择城市</div><p class="review-intro">按教育部名单中的所在地展示，不按排名、热度或分数线排序。</p><div class="choice-grid">${cities}</div></article>`);
      focusResult();
      return;
    }
    const official = [];
    const entities = [];
    for (const candidate of region.candidates || []) {
      const meta = state.metadata.get(candidate.officialName) || {};
      (meta.entityType && meta.entityType !== 'official_school' ? entities : official).push(candidate);
    }
    const sections = [];
    if (official.length) sections.push(schoolSection('学校', official));
    if (entities.length) sections.push(schoolSection('分校和校区', entities));
    const more = region.total > (region.candidates || []).length
      ? `<div class="source-note">当前显示前 ${region.candidates.length} 项。继续输入学校关键词可缩小范围。</div>` : '';
    commit('region', `<article class="result-shell"><div class="result-head"><h2 id="resultTitle" tabindex="-1">${html(region.region.label)}高校</h2><span class="badge">地区</span></div><div class="meta"><span class="meta-chip">${html(countText)}</span>${region.region.keyword ? `<span class="meta-chip resolve">关键词：${html(region.region.keyword)}</span>` : ''}</div><div class="divider"></div><p class="review-intro">请选择具体学校。地区搜索只用于缩小范围，不会自动选择学校。</p>${sections.join('')}${more}</article>`);
    focusResult();
  }

  function schoolSection(title, rows) {
    return `<div class="section-heading">${html(title)}</div><div class="choice-grid">${rows.map(item => `<button type="button" class="choice-card" data-region-school="${attr(item.officialName)}"><span class="choice-name">${html(item.officialName)}</span><span class="choice-note">${html(schoolDetail(item.officialName))} · 查看</span></button>`).join('')}</div>`;
  }

  function renderLoading(school) {
    commit('loading', `<div class="state-card loading">正在查找“${html(school)}”的公开评论…</div>`);
  }

  function renderChoices(input, candidates, options = {}) {
    const scope = options.scope === 'major' ? 'major' : 'school';
    state.choiceCandidates = (candidates || []).slice(0, 8);
    const isMajor = scope === 'major';
    const title = isMajor ? '请选择具体专业' : '请选择具体学校';
    const body = isMajor ? `“${html(input)}”可能对应多个专业，请确认专业名称。` : `“${html(input)}”可能对应多所学校，请确认正式校名。`;
    const cards = state.choiceCandidates.map((candidate, index) => {
      if (isMajor) {
        const item = candidate.item || candidate;
        return `<button type="button" class="choice-card" data-major-choice="${index}"><span class="choice-name">${html(item.name || candidate.officialName)}</span><span class="choice-note">${html([item.code, item.majorClass || item.categoryName].filter(Boolean).join(' · ') || '本科专业')} · 选择后查看</span></button>`;
      }
      return `<button type="button" class="choice-card" data-school-choice="${index}"><span class="choice-name">${html(candidate.officialName)}</span><span class="choice-note">${html(schoolDetail(candidate.officialName))} · 选择后查看</span></button>`;
    }).join('');
    commit('confirmation', `<div class="state-card notice"><h2 id="resultTitle" tabindex="-1">${title}</h2><p>${body}</p><div class="choice-grid">${cards}</div></div>`);
    focusResult();
  }

  function renderMajorGuidance(input, resolution) {
    state.choiceCandidates = [];
    const isMulti = resolution?.status === 'multi-major';
    const title = isMulti ? '一次查看一个专业' : '先选一个具体专业';
    const body = isMulti
      ? resolution.message
      : (resolution?.message || '这个说法范围比较大，请先缩小到一个具体本科专业。');
    const directions = (resolution?.directionChoices || []).map(choice => `<button type="button" class="choice-card" data-major-direction="${attr(choice.value)}"><span class="choice-name">${html(choice.label)}</span><span class="choice-note">先看这个方向下的具体专业</span></button>`).join('');
    const candidates = !directions && !isMulti
      ? (resolution?.candidates || []).slice(0, 8).map((candidate, index) => {
        const item = candidate.item || candidate;
        return `<button type="button" class="choice-card" data-major-choice="${index}"><span class="choice-name">${html(item.name || '')}</span><span class="choice-note">${html([item.code, item.majorClass || item.categoryName].filter(Boolean).join(' · ') || '本科专业')} · 选择后查看</span></button>`;
      }).join('')
      : '';
    const choices = directions || candidates;
    commit('confirmation', `<div class="state-card notice"><h2 id="resultTitle" tabindex="-1">${title}</h2><p>${html(body)}</p>${choices ? `<div class="choice-grid">${choices}</div>` : ''}<div class="state-meta"><span class="meta-chip">当前输入：${html(input)}</span><span class="meta-chip">不会合并查询多个专业</span></div></div>`);
    focusResult();
  }

  function renderNotFound(input, candidates = [], options = {}) {
    const isMajor = options.scope === 'major';
    const suggestions = candidates.length
      ? `<div class="state-meta">${candidates.slice(0, 3).map(item => `<span class="meta-chip">${html(isMajor ? (item.item?.name || item.officialName) : item.officialName)}</span>`).join('')}</div>` : '';
    const noun = isMajor ? '专业' : '学校';
    const hint = isMajor ? '可以输入更完整的专业名称或专业代码再试。' : '可以输入更完整的学校名称或所在地区再试。';
    commit('empty', `<div class="state-card notice"><h2 id="resultTitle" tabindex="-1">暂时没找到这个${noun}</h2><p>没有唯一识别“${html(input)}”。${hint}</p>${suggestions}</div>`);
    focusResult();
  }

  function renderLocalFailure(message, options = {}) {
    const isMajor = options.scope === 'major';
    commit('error', `<div class="state-card error"><h2 id="resultTitle" tabindex="-1">${isMajor ? '专业目录暂时不可用' : '学校名单暂时不可用'}</h2><p>${html(message)}</p></div>`);
    focusResult();
  }

  function clearResult() {
    commit('idle', '');
  }

  function schoolDetail(name) {
    const meta = state.metadata.get(name) || {};
    return [meta.location, meta.level, meta.entityTypeLabel].filter(Boolean).join(' · ') || '正式学校实体';
  }

  function entityMeta(name) {
    const entity = findSchoolEntityByName(name);
    if (!entity) return null;
    const parent = entity.parentEntityId ? getSchoolEntity(entity.parentEntityId) : null;
    return { ...publicSchoolEntity(entity), parentName: parent?.displayName || '' };
  }

  return Object.freeze({
    commit,
    syncHero,
    focusResult,
    announce,
    setIndexStatus,
    setSuggestions,
    openSuggestions,
    closeSuggestions,
    setActiveSuggestion,
    showResolved,
    hideResolved,
    renderRegion,
    renderLoading,
    renderChoices,
    renderMajorGuidance,
    renderNotFound,
    renderLocalFailure,
    clearResult,
    schoolDetail,
    entityMeta
  });
}

function matchTypeLabel(type, scope = 'school') {
  const value = String(type || '');
  if (scope === 'major') {
    if (value.includes('code')) return '专业代码';
    if (value.includes('exact')) return '专业名称';
    if (value.includes('category')) return '专业类候选';
    if (value.includes('prefix')) return '名称匹配';
    if (value.includes('contains')) return '名称相近';
    if (value.includes('fuzzy')) return '可能是';
    return '专业候选';
  }
  if (value.includes('official_exact')) return '正式校名';
  if (value.includes('alias_exact')) return '常用简称';
  if (value.includes('initial')) return '首字母匹配';
  if (value.includes('region')) return '地区学校';
  if (value.includes('entity')) return '分校或校区';
  if (value.includes('prefix')) return '名称匹配';
  if (value.includes('contains')) return '名称相近';
  return '学校候选';
}
