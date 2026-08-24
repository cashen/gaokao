import { loadSchoolCatalog } from '../data/school-name-resolver-v150.js?v=150';
import { getSchoolEntity, findSchoolEntityByName } from '../data/school-entities-v150.js?v=150';
import { createTongxueSearchView } from './tongxue-runtime-search-view-v159.js?v=159-fuzzy001';
import { createTongxueResultView } from './tongxue-runtime-result-view-v159.js?v=159';
import { MAJOR_CATALOG_2026 } from '../../ln-rank/kb/major-understanding/major-catalog-2026.generated.js?v=3949_0';
import { createMajorCatalogResolver, normalizeMajorText } from '../../shared/resources/majors/major-catalog-contract.js?v=3958';
import {
  TongxueError,
  normalizeSchool,
  isUsefulSummary,
  looksLikeHtml,
  cloneData,
  isAbortError,
  dedupeReviews,
  reviewKey
} from './tongxue-runtime-utils-v159.js?v=159';

const RUNTIME_VERSION = 'tongxue-runtime-v159';
const EXPERIENCE_TTL = Object.freeze({
  ai_summary:300000,
  recent_reviews:120000,
  major_reviews:180000,
  topic_reviews:180000,
  topic_no_content:120000,
  topic_not_found_within_budget:90000,
  no_content:120000
});
const VALID_MODES = new Set(Object.keys(EXPERIENCE_TTL));
const MAJOR_RESOLVER = createMajorCatalogResolver(MAJOR_CATALOG_2026);
let installed = false;

function majorKey(value = '') {
  return normalizeMajorText(value).toLowerCase();
}

function resolveMajorInput(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (majorKey(raw).length < 2) return { status:'not_found', input:raw, candidates:[], matchType:'none', confidence:0 };
  const exact = MAJOR_RESOLVER.resolve(raw, { allowContains:false });
  if (exact?.kind === 'major') return { status:'resolved', major:exact.item, matchType:exact.matchType, confidence:exact.confidence, candidates:[] };
  if (exact?.kind === 'category') {
    const candidates = exact.item.codes.map(code => MAJOR_RESOLVER.findByCode(code)).filter(Boolean).map(item => ({ item, score:0.72, matchType:'category_name' }));
    return { status:'ambiguous', input:raw, matchType:exact.matchType, confidence:exact.confidence, candidates };
  }
  const matches = MAJOR_RESOLVER.search(raw, { limit:8 });
  if (!matches.length) return { status:'not_found', input:raw, candidates:[], matchType:'none', confidence:0 };
  const first = matches[0], second = matches[1], margin = first.score - (second?.score || 0);
  const autoThreshold = raw.length >= 4 ? 0.82 : 0.9;
  const requiredMargin = raw.length >= 4 ? 0.08 : 0.12;
  if (first.score >= autoThreshold && margin >= requiredMargin) return { status:'resolved', input:raw, major:first.item, matchType:first.matchType, confidence:first.score, candidates:matches.slice(1,4) };
  const plausible = matches.filter(candidate => candidate.score >= 0.57);
  if (plausible.length === 1 && plausible[0].score >= 0.86) return { status:'resolved', input:raw, major:plausible[0].item, matchType:plausible[0].matchType, confidence:plausible[0].score, candidates:[] };
  return { status:'ambiguous', input:raw, candidates:plausible, matchType:'fuzzy', confidence:first.score };
}

function majorSuggestionRows(value = '', limit = 8) {
  const resolution = resolveMajorInput(value);
  if (resolution?.status === 'resolved') {
    return [{ officialName:resolution.major.name, majorCode:resolution.major.code, majorClass:resolution.major.majorClass || resolution.major.categoryName || '', score:resolution.confidence, matchType:resolution.matchType }];
  }
  return (resolution?.candidates || []).slice(0, limit).map(candidate => ({
    officialName:candidate.item.name,
    majorCode:candidate.item.code,
    majorClass:candidate.item.majorClass || candidate.item.categoryName || '',
    score:candidate.score,
    matchType:candidate.matchType
  }));
}

function shouldPreferSchool(state, input, majorResolution) {
  if (!state.resolver || !majorResolution) return false;
  const schoolResolution = state.resolver.resolve(input, { limit:24 });
  if (!schoolResolution) return false;
  const exactMajor = majorResolution.status === 'resolved'
    && ['code', 'name_exact', 'alias_exact', 'admission_suffix_clean'].includes(majorResolution.matchType);
  if (exactMajor) return false;
  if (schoolResolution.status === 'resolved' || schoolResolution.status === 'region') return true;
  if (schoolResolution.status === 'ambiguous' && majorResolution.status === 'ambiguous') {
    const schoolScore = Number(schoolResolution.candidates?.[0]?.score || 0);
    return schoolScore >= Number(majorResolution.confidence || 0) + 0.05;
  }
  return false;
}

function applyScopePresentation(ui, scope = 'school') {
  const isMajor = scope === 'major';
  const sourceNote = document.querySelector('[data-major-source-footer-note]');
  if (sourceNote) {
    sourceNote.hidden = true;
    sourceNote.textContent = '';
  }
  document.body.dataset.tongxueScope = isMajor ? 'major' : 'school';
  const brand = document.querySelector('.topbar .brand');
  const title = ui.hero?.querySelector('.hero-title');
  const description = ui.hero?.querySelector('.hero-description');
  if (brand) brand.textContent = isMajor ? '专业体验线索' : '学校体验线索';
  if (title) title.textContent = isMajor ? '找专业，看看大家怎么说' : '找学校，看看大家怎么说';
  if (description) description.textContent = isMajor
    ? '先看专业资料，再看学生公开留言，了解学习与发展体验'
    : '整理学生公开留言，帮你了解学校的学习、生活和就业体验';
  if (ui.input) {
    ui.input.placeholder = isMajor ? '输入专业名称或专业代码' : '输入学校、简称或地区';
    ui.input.setAttribute('aria-label', isMajor ? '专业名称或专业代码' : '学校名称或地区');
  }
  if (ui.changeSchool) ui.changeSchool.textContent = isMajor ? '换一个专业' : '换一所学校';
}


export async function startTongxueRuntime() {
  if (installed) return globalThis.__TONGXUE_RUNTIME_V159__;
  installed = true;

  const ui = collectUi();
  applyScopePresentation(ui, 'school');
  const state = {
    resolver:null,
    metadata:new Map(),
    ready:false,
    resolverError:null,
    composing:false,
    suggestionFrame:0,
    suggestions:[],
    activeSuggestion:-1,
    selectedOfficialName:'',
    currentResolution:null,
    choiceCandidates:[],
    currentSchool:'',
    currentEntityId:'',
    voiceScope:'school',
    currentMajorCode:'',
    currentMajorName:'',
    currentTopic:'general',
    returnTo:'',
    directMode:false,
    requestInFlight:false,
    activeQueryController:null,
    activeQueryPromise:null,
    activeQueryKey:'',
    querySerial:0,
    loadingMore:false,
    loadMoreController:null,
    loadMoreSerial:0,
    activeReviewState:null,
    cache:new Map(),
    inflight:new Map(),
    renderCount:0,
    lastRenderKind:'idle',
    listenerCount:0,
    submitCount:0
  };
  const searchView = createTongxueSearchView(ui, state);
  const resultView = createTongxueResultView(ui, state, searchView);

  bindEvents(ui, state, searchView, resultView);
  searchView.setIndexStatus('正在准备学校名单…');
  ui.inputState.hidden = false;
  updateButton(ui, state);

  try {
    const catalog = await loadSchoolCatalog();
    state.resolver = catalog.resolver;
    state.metadata = catalog.metadata;
    state.ready = true;
    searchView.setIndexStatus(`学校名单已准备好：支持 ${catalog.count.toLocaleString('zh-CN')} 所普通高校及独立招生实体`);
  } catch (error) {
    state.resolverError = error;
    searchView.setIndexStatus('高校名单暂时没有加载完成，请重新加载后再试。');
  } finally {
    ui.inputState.hidden = true;
    updateButton(ui, state);
  }

  if (state.ready) await restoreFromLocation(ui, state, searchView, resultView);

  const api = Object.freeze({
    version:RUNTIME_VERSION,
    owner:'tongxue-runtime-controller-v159',
    submit:options => submitInput(ui, state, searchView, resultView, options),
    getState:() => Object.freeze({
      ready:state.ready,
      currentSchool:state.currentSchool,
      currentEntityId:state.currentEntityId,
      voiceScope:state.voiceScope,
      currentMajorCode:state.currentMajorCode,
      currentMajorName:state.currentMajorName,
      currentTopic:state.currentTopic,
      directMode:state.directMode,
      requestInFlight:state.requestInFlight,
      loadingMore:state.loadingMore,
      renderCount:state.renderCount,
      lastRenderKind:state.lastRenderKind,
      listenerCount:state.listenerCount,
      submitCount:state.submitCount,
      observerCount: 0
    })
  });
  globalThis.__TONGXUE_RUNTIME_V159__ = api;
  document.body.dataset.tongxueRuntime = RUNTIME_VERSION;
  return api;
}

function collectUi() {
  const required = {
    input:document.getElementById('school'),
    button:document.getElementById('queryButton'),
    result:document.getElementById('result'),
    suggestions:document.getElementById('schoolSuggestions'),
    resolveHint:document.getElementById('resolveHint'),
    indexStatus:document.getElementById('indexStatus'),
    inputState:document.getElementById('inputState'),
    liveStatus:document.getElementById('liveStatus'),
    hero:document.querySelector('.hero'),
    changeSchool:document.querySelector('[data-change-school]')
  };
  for (const [key, value] of Object.entries(required)) {
    if (!value && !['changeSchool'].includes(key)) throw new Error(`Tongxue v1.5.9 missing UI node: ${key}`);
  }
  return required;
}

function bindEvents(ui, state, searchView, resultView) {
  const on = (target, type, listener, options) => {
    target.addEventListener(type, listener, options);
    state.listenerCount += 1;
  };

  on(ui.input, 'compositionstart', () => {
    state.composing = true;
    cancelAnimationFrame(state.suggestionFrame);
    searchView.closeSuggestions();
  });
  on(ui.input, 'compositionend', () => {
    state.composing = false;
    resetResolution(state, searchView);
    scheduleSuggestions(ui, state, searchView);
    updateButton(ui, state);
  });
  on(ui.input, 'input', event => {
    if (event.isComposing || state.composing) return;
    if (state.voiceScope !== 'school') {
      leaveMajorDirectState(state);
      applyScopePresentation(ui, 'school');
    }
    resetResolution(state, searchView);
    scheduleSuggestions(ui, state, searchView);
    updateButton(ui, state);
  });
  on(ui.input, 'focus', () => {
    if (!state.composing && ui.input.value.trim().length >= 2) updateSuggestions(ui, state, searchView);
  });
  on(ui.input, 'keydown', event => {
    if (event.isComposing || state.composing) return;
    if (!ui.suggestions.hidden && state.suggestions.length) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        searchView.setActiveSuggestion(Math.min(state.activeSuggestion + 1, state.suggestions.length - 1));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        searchView.setActiveSuggestion(Math.max(state.activeSuggestion - 1, 0));
        return;
      }
      if (event.key === 'Escape') {
        searchView.closeSuggestions();
        return;
      }
      if (event.key === 'Enter' && state.activeSuggestion >= 0) {
        event.preventDefault();
        chooseSuggestion(ui, state, searchView, state.suggestions[state.activeSuggestion]);
        return;
      }
    }
    if (event.key === 'Enter' && !ui.button.disabled) {
      event.preventDefault();
      submitInput(ui, state, searchView, resultView);
    }
  });
  on(ui.button, 'click', () => submitInput(ui, state, searchView, resultView));
  on(ui.suggestions, 'pointerdown', event => {
    if (event.target.closest('[data-suggestion-index]')) event.preventDefault();
  });
  on(ui.suggestions, 'click', event => {
    const button = event.target.closest('[data-suggestion-index]');
    if (!button) return;
    chooseSuggestion(ui, state, searchView, state.suggestions[Number(button.dataset.suggestionIndex)]);
  });
  on(document, 'pointerdown', event => {
    if (!event.target.closest('.input-wrap')) searchView.closeSuggestions();
  });
  document.querySelectorAll('[data-example]').forEach(button => on(button, 'click', () => {
    leaveMajorDirectState(state);
    ui.input.value = button.dataset.example || '';
    resetResolution(state, searchView);
    submitInput(ui, state, searchView, resultView);
  }));
  on(ui.result, 'click', event => handleResultClick(event, ui, state, searchView, resultView));
  on(window, 'popstate', () => restoreFromLocation(ui, state, searchView, resultView));
  if (ui.changeSchool) on(ui.changeSchool, 'click', () => resetToSchoolHome(ui, state, searchView));
}

function scheduleSuggestions(ui, state, searchView) {
  cancelAnimationFrame(state.suggestionFrame);
  state.suggestionFrame = requestAnimationFrame(() => updateSuggestions(ui, state, searchView));
}

function updateSuggestions(ui, state, searchView) {
  const query = normalizeSchool(ui.input.value);
  const majorResolution = resolveMajorInput(query);
  if (shouldPreferSchool(state, query, majorResolution)) {
    if (state.composing || !state.resolver || query.length < 2) {
      searchView.closeSuggestions();
      return;
    }
    const schoolResolution = state.resolver.resolve(query, { limit:8 });
    if (schoolResolution.status === 'region') {
      state.suggestions = [];
      searchView.closeSuggestions();
      return;
    }
    searchView.setSuggestions(state.resolver.search(query, { limit:8 }));
    return;
  }
  const majorRows = majorSuggestionRows(query);
  if (majorRows.length) {
    searchView.setSuggestions(majorRows, '', { scope:'major' });
    return;
  }
  if (state.composing || !state.resolver || query.length < 2) {
    searchView.closeSuggestions();
    return;
  }
  const resolution = state.resolver.resolve(query, { limit:8 });
  if (resolution.status === 'region') {
    state.suggestions = [];
    searchView.closeSuggestions();
    return;
  }
  searchView.setSuggestions(state.resolver.search(query, { limit:8 }));
}

function chooseSuggestion(ui, state, searchView, candidate) {
  if (!candidate) return;
  if (candidate.majorCode) {
    const original = normalizeSchool(ui.input.value);
    state.voiceScope = 'major';
    state.currentMajorCode = candidate.majorCode;
    state.currentMajorName = candidate.officialName;
    state.currentTopic = 'general';
    state.currentSchool = '';
    state.currentEntityId = '';
    state.currentResolution = null;
    state.selectedOfficialName = '';
    ui.input.value = candidate.officialName;
    searchView.closeSuggestions();
    searchView.showResolved(original, candidate.officialName, { scope:'major' });
    applyScopePresentation(ui, 'major');
    updateButton(ui, state);
    return;
  }
  const original = normalizeSchool(ui.input.value);
  state.selectedOfficialName = candidate.officialName;
  state.currentResolution = {
    status:'resolved', input:original, resolvedName:candidate.officialName, candidates:[],
    matchType:candidate.matchType || 'candidate', confidence:candidate.score || 0, entityId:candidate.entityId || ''
  };
  ui.input.value = candidate.officialName;
  searchView.closeSuggestions();
  searchView.showResolved(original, candidate.officialName);
  updateButton(ui, state);
}

function resetResolution(state, searchView) {
  state.selectedOfficialName = '';
  state.currentEntityId = '';
  state.currentResolution = null;
  searchView.hideResolved();
}

async function submitInput(ui, state, searchView, resultView, options = {}) {
  const input = normalizeSchool(options.input ?? ui.input.value);
  if (!input) {
    ui.input.focus();
    return null;
  }
  const majorResolution = resolveMajorInput(input);
  const preferSchool = shouldPreferSchool(state, input, majorResolution);
  if (preferSchool) {
    applyScopePresentation(ui, 'school');
  }
  if (!preferSchool && majorResolution?.status === 'ambiguous') {
    abortActive(state);
    state.voiceScope = 'major';
    state.currentMajorCode = '';
    state.currentMajorName = '';
    state.currentSchool = '';
    state.currentEntityId = '';
    state.currentResolution = majorResolution;
    state.directMode = Boolean(options.directMode ?? state.directMode);
    applyScopePresentation(ui, 'major');
    searchView.renderChoices(input, majorResolution.candidates, { scope:'major' });
    writeLocation('query', input, '', options.historyMode || 'push');
    updateButton(ui, state);
    return majorResolution;
  }
  if (!preferSchool && majorResolution?.status === 'resolved') {
    const majorMatch = majorResolution.major;
    abortActive(state);
    state.voiceScope = 'major';
    state.currentMajorCode = String(majorMatch.code || '').trim();
    state.currentMajorName = String(majorMatch.name || input).trim();
    state.currentTopic = cleanTopic(options.topic || 'general');
    state.currentSchool = '';
    state.currentEntityId = '';
    state.currentResolution = null;
    state.selectedOfficialName = '';
    state.directMode = Boolean(options.directMode ?? state.directMode);
    state.returnTo = safeReturnTo(options.returnTo || '');
    ui.input.value = state.currentMajorName;
    searchView.closeSuggestions();
    searchView.hideResolved();
    applyScopePresentation(ui, 'major');
    writeLocation('major', state.currentMajorName, '', options.historyMode || 'push', { majorCode:state.currentMajorCode, topic:state.currentTopic, returnTo:state.returnTo });
    updateButton(ui, state);
    return performMajorExperienceQuery(ui, state, searchView, resultView, { majorCode:state.currentMajorCode, major:state.currentMajorName, topic:state.currentTopic });
  }
  applyScopePresentation(ui, 'school');
  if (!state.resolver) {
    searchView.renderLocalFailure('高校名单还没有加载完成。');
    return null;
  }
  leaveMajorDirectState(state);
  state.submitCount += 1;
  searchView.closeSuggestions();
  const resolution = state.selectedOfficialName && state.selectedOfficialName === input
    ? state.currentResolution || { status:'resolved', input, resolvedName:input, candidates:[], matchType:'candidate', confidence:1 }
    : state.resolver.resolve(input, { limit:24 });

  if (resolution.status === 'region') {
    abortActive(state);
    state.currentSchool = '';
    state.currentEntityId = '';
    state.currentResolution = resolution;
    state.activeReviewState = null;
    state.directMode = Boolean(options.directMode);
    searchView.hideResolved();
    searchView.renderRegion(resolution);
    writeLocation('region', resolution.input, '', options.historyMode || 'push');
    updateButton(ui, state);
    return resolution;
  }
  if (resolution.status === 'ambiguous') {
    abortActive(state);
    state.currentSchool = '';
    state.currentEntityId = '';
    state.currentResolution = resolution;
    state.directMode = Boolean(options.directMode ?? state.directMode);
    searchView.renderChoices(input, resolution.candidates);
    writeLocation('query', input, '', options.historyMode || 'push');
    updateButton(ui, state);
    return resolution;
  }
  if (resolution.status !== 'resolved' || !resolution.resolvedName) {
    abortActive(state);
    state.currentSchool = '';
    state.currentEntityId = '';
    state.currentResolution = resolution;
    state.directMode = false;
    searchView.renderNotFound(input, resolution.candidates || []);
    writeLocation('query', input, '', options.historyMode || 'push');
    updateButton(ui, state);
    return resolution;
  }

  state.selectedOfficialName = resolution.resolvedName;
  state.currentResolution = resolution;
  state.currentSchool = resolution.resolvedName;
  state.voiceScope = 'school';
  state.currentTopic = cleanTopic(options.topic || 'general');
  const entity = (resolution.entityId && getSchoolEntity(resolution.entityId)) || findSchoolEntityByName(resolution.resolvedName);
  state.currentEntityId = entity?.entityId || options.entityId || '';
  state.directMode = Boolean(options.directMode ?? state.directMode);
  ui.input.value = resolution.resolvedName;
  searchView.showResolved(input, resolution.resolvedName);
  writeLocation('school', resolution.resolvedName, state.currentEntityId, options.historyMode || 'push', { topic:state.currentTopic });
  return performExperienceQuery(ui, state, searchView, resultView, resolution.resolvedName, input, resolution, { ...options, entityId:state.currentEntityId, topic:state.currentTopic });
}

async function performExperienceQuery(ui, state, searchView, resultView, school, originalInput, resolution, options = {}) {
  return performVoiceQuery(ui, state, searchView, resultView, {
    scope:'school',
    school,
    originalInput,
    resolution,
    entityId:options.entityId || state.currentEntityId || '',
    topic:cleanTopic(options.topic || state.currentTopic || 'general'),
    forceRefresh:Boolean(options.forceRefresh)
  });
}

async function performMajorExperienceQuery(ui, state, searchView, resultView, { majorCode='', major='', topic='general', forceRefresh=false } = {}) {
  const canonicalCode = cleanMajorCode(majorCode);
  const majorName = cleanMajorName(major);
  state.voiceScope = 'major';
  state.currentMajorCode = canonicalCode;
  state.currentMajorName = majorName;
  state.currentTopic = cleanTopic(topic);
  state.currentSchool = '';
  state.currentEntityId = '';
  state.currentResolution = null;
  state.selectedOfficialName = '';
  searchView.hideResolved();
  return performVoiceQuery(ui, state, searchView, resultView, {
    scope:'major', majorCode:canonicalCode, major:majorName, topic:state.currentTopic, forceRefresh:Boolean(forceRefresh), resolution:null
  });
}

async function performVoiceQuery(ui, state, searchView, resultView, query) {
  const key = experienceKey(query, 1);
  if (state.activeQueryPromise && state.activeQueryKey === key && !query.forceRefresh) return state.activeQueryPromise;
  abortActive(state);
  const serial = ++state.querySerial;
  const controller = new AbortController();
  state.activeQueryController = controller;
  state.activeQueryKey = key;
  state.requestInFlight = true;
  state.activeReviewState = null;
  const display = query.scope === 'major' ? (query.major || query.majorCode || '这个专业') : query.school;
  searchView.renderLoading(display);
  updateButton(ui, state);

  state.activeQueryPromise = (async () => {
    try {
      const data = await fetchExperience(state, query, 1, { forceRefresh:Boolean(query.forceRefresh), signal:controller.signal });
      if (serial !== state.querySerial) return null;
      if (query.scope === 'major' && data.major) {
        state.currentMajorCode = data.major.code || state.currentMajorCode;
        state.currentMajorName = data.major.name || state.currentMajorName;
      }
      resultView.renderResult(data, display, query.resolution || null);
      return data;
    } catch (error) {
      if (isAbortError(error) || serial !== state.querySerial) return null;
      resultView.renderFailure(error, display, query.resolution || null);
      return null;
    } finally {
      if (serial === state.querySerial) {
        state.requestInFlight = false;
        state.activeQueryController = null;
        state.activeQueryPromise = null;
        state.activeQueryKey = '';
        updateButton(ui, state);
      }
    }
  })();
  return state.activeQueryPromise;
}

async function fetchExperience(state, query, page = 1, options = {}) {
  const normalizedQuery = { ...query, topic:cleanTopic(query.topic || 'general') };
  const key = experienceKey(normalizedQuery, page);
  const cached = state.cache.get(key);
  if (!options.forceRefresh && cached && cached.expiresAt > Date.now()) return cloneData(cached.data);
  if (!options.forceRefresh && state.inflight.has(key)) return cloneData(await state.inflight.get(key));
  const request = (async () => {
    const params = new URLSearchParams({ scope:normalizedQuery.scope || 'school', page:String(page) });
    if (normalizedQuery.topic && normalizedQuery.topic !== 'general') params.set('topic', normalizedQuery.topic);
    if (normalizedQuery.scope === 'major') {
      if (normalizedQuery.majorCode) params.set('majorCode', normalizedQuery.majorCode);
      if (normalizedQuery.major) params.set('major', normalizedQuery.major);
    } else {
      params.set('school', normalizedQuery.school || '');
      if (normalizedQuery.entityId) params.set('entity', normalizedQuery.entityId);
      if (normalizedQuery.originalInput) params.set('input', normalizedQuery.originalInput);
    }
    if (options.forceRefresh) params.set('refresh', '1');
    let response;
    try {
      response = await fetch(`/api/tongxue-summary?${params.toString()}`, { cache:'default', headers:{ accept:'application/json' }, signal:options.signal });
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new TongxueError('network_error', '暂时无法连接大学生声音服务。', { cause:String(error), scope:normalizedQuery.scope });
    }
    const raw = await response.text();
    if (looksLikeHtml(raw)) throw new TongxueError('api_route_missed', '大学生声音服务没有正常运行。', { raw:raw.slice(0,180), scope:normalizedQuery.scope });
    let data;
    try { data = JSON.parse(raw || '{}'); }
    catch { throw new TongxueError('api_invalid_json', '大学生声音服务返回了无法识别的内容。', { raw:raw.slice(0,300), scope:normalizedQuery.scope }); }
    if (!response.ok || data.ok === false || data.error) throw new TongxueError(data.error || 'api_error', data.message || '暂时没有取得大学生声音。', data);
    if (!VALID_MODES.has(data.mode)) throw new TongxueError('mode_invalid', '暂时无法识别来源内容。', data);
    if (data.mode === 'ai_summary' && !isUsefulSummary(data.summary)) throw new TongxueError('summary_invalid', '来源摘要暂时无法正常显示。', data);
    if (['recent_reviews','major_reviews','topic_reviews'].includes(data.mode) && (!Array.isArray(data.reviews) || !data.reviews.length)) throw new TongxueError('reviews_invalid', '公开学生声音暂时无法正常显示。', data);
    const ttl = EXPERIENCE_TTL[data.mode] || 0;
    if (ttl) state.cache.set(key, { data:cloneData(data), expiresAt:Date.now() + ttl });
    return data;
  })();
  state.inflight.set(key, request);
  try { return cloneData(await request); }
  finally { if (state.inflight.get(key) === request) state.inflight.delete(key); }
}

async function handleResultClick(event, ui, state, searchView, resultView) {
  const expand = event.target.closest('[data-expand-review]');
  if (expand) {
    const content = document.getElementById(`reviewContent${expand.dataset.expandReview}`);
    if (!content) return;
    const collapsed = content.classList.toggle('collapsed');
    expand.textContent = collapsed ? '展开全文' : '收起全文';
    expand.setAttribute('aria-expanded', String(!collapsed));
    return;
  }
  if (event.target.closest('#loadMoreReviews')) {
    await loadMoreReviews(ui, state, searchView, resultView);
    return;
  }
  if (event.target.closest('[data-retry-school]') && state.currentSchool) {
    await performExperienceQuery(ui, state, searchView, resultView, state.currentSchool, state.currentResolution?.input || state.currentSchool, state.currentResolution, { forceRefresh:true, entityId:state.currentEntityId, topic:state.currentTopic });
    return;
  }
  const choice = event.target.closest('[data-school-choice]');
  if (choice) {
    const candidate = state.choiceCandidates[Number(choice.dataset.schoolChoice)];
    if (!candidate) return;
    resetResolution(state, searchView);
    await submitInput(ui, state, searchView, resultView, { input:candidate.officialName, historyMode:'replace', directMode:state.directMode });
    return;
  }
  const majorChoice = event.target.closest('[data-major-choice]');
  if (majorChoice) {
    const candidate = state.choiceCandidates[Number(majorChoice.dataset.majorChoice)];
    if (!candidate?.item) return;
    await submitInput(ui, state, searchView, resultView, { input:candidate.item.name, historyMode:'replace', directMode:state.directMode });
    return;
  }
  const region = event.target.closest('[data-region-query]');
  if (region) {
    ui.input.value = region.dataset.regionQuery || '';
    resetResolution(state, searchView);
    await submitInput(ui, state, searchView, resultView, { historyMode:'push', directMode:false });
    return;
  }
  const school = event.target.closest('[data-region-school]');
  if (school) {
    ui.input.value = school.dataset.regionSchool || '';
    resetResolution(state, searchView);
    await submitInput(ui, state, searchView, resultView, { historyMode:'push', directMode:false });
  }
}

async function loadMoreReviews(ui, state, searchView, resultView) {
  const active = state.activeReviewState;
  const button = document.getElementById('loadMoreReviews');
  if (!active || !button || !active.pagination?.hasMore || state.loadingMore) return;
  if (!['recent_reviews','major_reviews'].includes(active.mode)) return;
  state.loadingMore = true;
  state.loadMoreController?.abort();
  const controller = new AbortController();
  const serial = ++state.loadMoreSerial;
  state.loadMoreController = controller;
  button.disabled = true;
  button.textContent = '正在加载';
  try {
    const nextPage = Number(active.pagination.page || 1) + 1;
    const query = active.scope === 'major'
      ? { scope:'major', majorCode:active.major?.code || state.currentMajorCode, major:active.major?.name || state.currentMajorName, topic:'general' }
      : { scope:'school', school:active.school, originalInput:active.originalInput, entityId:active.entityId || '', topic:'general' };
    const data = await fetchExperience(state, query, nextPage, { signal:controller.signal });
    if (serial !== state.loadMoreSerial || state.activeReviewState !== active) return;
    const expectedMode = active.scope === 'major' ? 'major_reviews' : 'recent_reviews';
    if (data.mode !== expectedMode) throw new TongxueError('reviews_page_invalid', '后续评论页没有返回同一范围的评论列表。', data);
    const existing = new Set(active.reviews.map(reviewKey));
    const added = dedupeReviews(data.reviews || []).filter(review => !existing.has(reviewKey(review)));
    resultView.appendReviews(added, active.reviews.length);
    active.reviews.push(...added);
    active.pagination = data.reviewPagination || { ...active.pagination, page:nextPage, hasMore:false };
    active.fetchedAt = data.fetchedAt || active.fetchedAt;
    active.transport = data.transport || active.transport;
    resultView.updateLoadMore();
    searchView.announce(`已新增 ${added.length} 条评论`);
  } catch (error) {
    if (isAbortError(error) || serial !== state.loadMoreSerial) return;
    button.disabled = false;
    button.textContent = '加载失败，点击重试';
    button.title = error?.message || '加载失败';
    searchView.announce('评论加载失败，可以再次点击重试');
  } finally {
    if (serial === state.loadMoreSerial) {
      state.loadingMore = false;
      state.loadMoreController = null;
    }
  }
}

async function restoreFromLocation(ui, state, searchView, resultView) {
  abortActive(state);
  state.currentSchool = '';
  state.currentEntityId = '';
  state.currentResolution = null;
  state.selectedOfficialName = '';
  state.activeReviewState = null;
  searchView.hideResolved();
  const params = new URLSearchParams(location.search);
  const scope = params.get('scope') === 'major' ? 'major' : 'school';
  const topic = cleanTopic(params.get('topic') || 'general');
  if (scope === 'major') {
    applyScopePresentation(ui, 'major');
    const majorCode = cleanMajorCode(params.get('majorCode'));
    const major = cleanMajorName(params.get('major'));
    if (majorCode || major) {
      state.directMode = true;
      state.returnTo = safeReturnTo(params.get('returnTo'));
      state.voiceScope = 'major';
      state.currentMajorCode = majorCode;
      state.currentMajorName = major;
      state.currentTopic = topic;
      ui.input.value = major || majorCode;
      document.body.dataset.studentVoiceScope = 'major';
      return performMajorExperienceQuery(ui, state, searchView, resultView, { majorCode, major, topic });
    }
  }
  applyScopePresentation(ui, 'school');
  const entityId = normalizeSchool(params.get('entity'));
  const entity = entityId ? getSchoolEntity(entityId) : null;
  const school = normalizeSchool(entity?.displayName || params.get('school'));
  const query = normalizeSchool(params.get('q'));
  state.voiceScope = 'school';
  state.currentTopic = topic;
  delete document.body.dataset.studentVoiceScope;
  if (school) {
    state.directMode = true;
    ui.input.value = school;
    return submitInput(ui, state, searchView, resultView, { input:school, entityId, historyMode:'none', directMode:true, topic });
  }
  if (query) {
    state.directMode = false;
    ui.input.value = query;
    return submitInput(ui, state, searchView, resultView, { input:query, historyMode:'none', directMode:false });
  }
  state.directMode = false;
  ui.input.value = '';
  searchView.clearResult();
  updateButton(ui, state);
  return null;
}

function writeLocation(kind, value, entityId, mode, extra = {}) {
  if (mode === 'none') return;
  const url = new URL(location.href);
  for (const key of ['school','entity','q','scope','major','majorCode','topic','returnTo']) url.searchParams.delete(key);
  if (kind === 'school') {
    url.searchParams.set('school', value);
    if (entityId) url.searchParams.set('entity', entityId);
    if (extra.topic && extra.topic !== 'general') url.searchParams.set('topic', extra.topic);
  } else if (kind === 'major') {
    url.searchParams.set('scope', 'major');
    url.searchParams.set('major', value);
    if (extra.majorCode) url.searchParams.set('majorCode', extra.majorCode);
    if (extra.topic && extra.topic !== 'general') url.searchParams.set('topic', extra.topic);
    if (extra.returnTo) url.searchParams.set('returnTo', extra.returnTo);
  } else if (value) {
    url.searchParams.set('q', value);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (next === current) return;
  const method = mode === 'replace' ? 'replaceState' : 'pushState';
  history[method]({ tongxue:kind, value, entityId }, '', next);
}

function resetToSchoolHome(ui, state, searchView) {
  abortActive(state);
  leaveMajorDirectState(state);
  state.directMode = false;
  state.currentSchool = '';
  state.currentEntityId = '';
  state.currentResolution = null;
  state.selectedOfficialName = '';
  state.currentTopic = 'general';
  ui.input.value = '';
  searchView.hideResolved();
  searchView.clearResult();
  history.pushState({ tongxue:'home' }, '', '/tongxue/');
  applyScopePresentation(ui, 'school');
  updateButton(ui, state);
  ui.input.focus();
}

function leaveMajorDirectState(state) {
  state.voiceScope = 'school';
  state.currentMajorCode = '';
  state.currentMajorName = '';
  state.currentTopic = 'general';
  state.returnTo = '';
  delete document.body.dataset.studentVoiceScope;
}

function abortActive(state) {
  state.querySerial += 1;
  state.activeQueryController?.abort();
  state.activeQueryController = null;
  state.activeQueryPromise = null;
  state.activeQueryKey = '';
  state.requestInFlight = false;
  state.loadMoreSerial += 1;
  state.loadMoreController?.abort();
  state.loadMoreController = null;
  state.loadingMore = false;
}

function updateButton(ui, state) {
  ui.button.disabled = !state.ready || Boolean(state.resolverError) || !ui.input.value.trim() || state.requestInFlight;
  // Legacy contract retained for v1.5.9 checks: ui.button.textContent = state.requestInFlight ? '正在查找' : '看同学怎么说';
  ui.button.textContent = state.requestInFlight ? '正在查找' : (state.voiceScope === 'major' ? '看专业怎么说' : '看学校怎么说');
}

function experienceKey(query, page) {
  const scope = query.scope === 'major' ? 'major' : 'school';
  if (scope === 'major') return `major|${cleanMajorCode(query.majorCode)}|${cleanMajorName(query.major)}|${cleanTopic(query.topic)}|${Number(page || 1)}`;
  return `school|${normalizeSchool(query.school)}|${String(query.entityId || '')}|${cleanTopic(query.topic)}|${Number(page || 1)}`;
}

function cleanMajorCode(value) {
  const text = String(value || '').trim().toUpperCase();
  return /^[0-9A-Z]{4,10}$/.test(text) ? text : '';
}

function cleanMajorName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function cleanTopic(value) {
  const text = String(value || '').trim();
  return /^[a-z_]{1,40}$/.test(text) ? text : 'general';
}

function safeReturnTo(value) {
  const text = String(value || '').trim();
  if (!text.startsWith('/') || text.startsWith('//')) return '';
  try {
    const url = new URL(text, location.origin);
    return url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : '';
  } catch { return ''; }
}
