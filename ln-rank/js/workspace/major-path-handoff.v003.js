import { state } from '../state/app-state.v3963_1.js?v=3963_1';
import { resolveMajorUnderstanding } from '../knowledge/major-understanding-resolver.js?v=3949_0';
import { createDecisionContext } from '../../../shared/decision-context/decision-context.v001.js';
import { captureCurrentReturnSnapshot } from '../../../shared/decision-context/return-snapshot.v001.js';
import { scrollToExplicitTarget } from './scroll-policy.v3961_0.js?v=3961_0';
import {
  MAJOR_PATH_NAVIGATION_META,
  buildMajorPathHref
} from '../../../shared/resources/majors/major-path-navigation.v004.js?v=004_0';
import {
  STUDENT_VOICE_NAVIGATION_META,
  buildStudentVoiceMajorHref
} from '../../../shared/resources/experience/student-voice-navigation.v001.js';

export const MAJOR_PATH_HANDOFF_VERSION = 'major-path-ln-rank-handoff-v0.03';
const RESUME_KEY = 'lnRankMajorPathResumeV003';
let mounted = false;
let resumeInFlight = false;
let resumeSnapshot = null;

function clean(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeSelector(value = '') {
  return globalThis.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, '\\$&');
}

function ensureStylesheet() {
  if (document.querySelector('link[data-major-path-handoff-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/ln-rank/css/major-path-handoff.v003.css?v=003_0&r=r036-major-history-rank-lazy';
  link.dataset.majorPathHandoffStyle = MAJOR_PATH_HANDOFF_VERSION;
  document.head.append(link);
}

function concreteMajorFromRendered({ code = '', name = '' } = {}) {
  const majorCode = clean(code).toUpperCase();
  const rawName = clean(name);
  const record = majorCode
    ? { major: rawName, standardMajor: { code: majorCode, name: rawName, mappingStatus: 'exact' } }
    : { major: rawName };
  const info = resolveMajorUnderstanding(record);
  if (!info?.matched || info.isClassLevel || !info.code || !info.name) return null;
  if (majorCode && info.code !== majorCode) return null;
  if (!majorCode) {
    const allowed = new Set(['name_exact', 'admission_suffix_clean', 'alias_exact']);
    if (!allowed.has(String(info.matchType || '')) || info.confidence !== 'high') return null;
  }
  return Object.freeze({ code: info.code, name: info.name, matchType: info.matchType, confidence: info.confidence });
}

function currentReturnTarget() {
  const url = new URL(location.href);
  if (!url.hash) {
    url.hash = state.resultMode === 'school-all'
      ? 'schoolAllResultsPanel'
      : state.resultMode === 'major-all'
        ? 'majorAllResultsPanel'
        : 'resultsPanel';
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function rememberBeforeNavigate(link, context, anchorId = 'resultsPanel', recordKey = '') {
  if (!link || !context?.contextId || link.dataset.returnSnapshotBound === '1') return;
  link.dataset.returnSnapshotBound = '1';
  link.addEventListener('click', () => {
    captureCurrentReturnSnapshot({
      contextId: context.contextId,
      returnTo: context.returnTo,
      sourceSurface: context.sourceSurface,
      resultMode: context.resultMode,
      anchorId: context.returnAnchor || anchorId,
      recordKey,
      focusId: context.returnAnchor || anchorId
    });
  }, { passive: true });
}

function makeDecisionContext(target, {
  sourceAction,
  sourceKey = '',
  sourceMajor = '',
  school = ''
} = {}) {
  const filters = state.filters || {};
  const region = clean(filters.region || filters.regionLabel || '');
  const projectMode = clean(filters.projectMode || state.projectMode || '');
  return createDecisionContext({
    sourceSurface: 'ln-rank',
    sourceAction,
    returnTo: currentReturnTarget(),
    resultMode: state.resultMode || 'score-bands',
    returnAnchor: state.resultMode === 'school-all' ? 'schoolAllResultsPanel' : state.resultMode === 'major-all' ? 'majorAllResultsPanel' : 'resultsPanel',
    province: '辽宁',
    admissionYear: 2026,
    track: '物理类',
    score: state.candidateScore,
    rank: null,
    regionKeys: region ? [region] : [],
    regionLabel: region,
    school,
    major: target?.name || sourceMajor,
    majorCode: target?.code || '',
    majorKeywords: [sourceMajor].filter(Boolean),
    projectMode: ['all', 'ordinary-only', 'sino-only'].includes(projectMode) ? projectMode : 'all',
    candidateIds: sourceKey ? [sourceKey] : [],
    evidenceRefs: [{ kind: 'ln-rank-result', label: '当前专业初选结果', ref: sourceKey }]
  });
}

function makeEntry(target, { context, sourceKey, sourceMajor, school = '', compact = false } = {}) {
  const decisionContext = makeDecisionContext(target, { sourceAction:'view_major_path', sourceKey, sourceMajor, school });
  const href = buildMajorPathHref({
    majorCode: target.code,
    canonicalName: target.name,
    context,
    sourceKey,
    sourceMajor,
    school,
    sourceSurface: context === 'school' ? 'ln-rank-school' : context === 'major' ? 'ln-rank-major' : 'ln-rank-score',
    returnTo: currentReturnTarget(),
    decisionContext
  });
  if (!href) return null;
  const link = document.createElement('a');
  link.href = href;
  link.className = compact ? 'major-path-entry major-path-entry--compact' : 'major-path-entry';
  link.dataset.uiNavigation = 'major-path';
  link.dataset.uiNavigationTarget = href;
  link.dataset.majorPathEntry = target.code;
  link.dataset.scopeGroup = 'major';
  link.dataset.majorPathSourceKey = sourceKey || '';
  link.setAttribute('aria-label', `了解${target.name}的专业关系和读研方向`);
  link.innerHTML = compact
    ? `<span>专业升学路径</span><small>了解这个专业的关系与读研方向</small><b aria-hidden="true">→</b>`
    : `<span class="major-path-entry__brand">专业升学路径</span><span class="major-path-entry__text"><strong>了解这个专业</strong><small>专业关系 · 相邻专业 · 读研方向</small></span><b class="major-path-entry__arrow" aria-hidden="true">→</b>`;
  rememberBeforeNavigate(link, decisionContext, 'resultsPanel', sourceKey);
  return link;
}

function makeStudentVoiceEntry(target, { context, sourceKey, sourceMajor = '', school = '', compact = false } = {}) {
  const decisionContext = makeDecisionContext(target, { sourceAction:'view_student_voice', sourceKey, sourceMajor, school });
  const href = buildStudentVoiceMajorHref({
    majorCode:target.code,
    canonicalName:target.name,
    sourceKey,
    context,
    sourceSurface: context === 'school' ? 'ln-rank-school' : context === 'major' ? 'ln-rank-major' : 'ln-rank-score',
    returnTo:currentReturnTarget(),
    decisionContext
  });
  if (!href) return null;
  const link = document.createElement('a');
  link.href = href;
  link.className = compact ? 'student-voice-entry student-voice-entry--compact' : 'student-voice-entry';
  link.dataset.uiNavigation = 'student-voice';
  link.dataset.uiNavigationTarget = href;
  link.dataset.studentVoiceEntry = target.code;
  link.dataset.studentVoiceScope = 'major';
  link.dataset.scopeGroup = 'major';
  link.setAttribute('aria-label', `查看不同学校学生对${target.name}的公开体验`);
  link.title = '这里是不同学校学生对同一专业的个人体验，不代表当前学校的培养情况，也不参与录取排序或推荐分。';
  link.innerHTML = compact
    ? `<span>跨校学生留言</span><small>不同学校谈这个专业</small><b aria-hidden="true">→</b>`
    : `<span class="student-voice-entry__brand">跨校学生留言</span><span class="student-voice-entry__text"><strong>不同学校学生谈这个专业</strong><small>不代表当前学校的专业体验</small></span><b class="student-voice-entry__arrow" aria-hidden="true">→</b>`;
  rememberBeforeNavigate(link, decisionContext, 'resultsPanel', sourceKey);
  return link;
}

function normalizeSchoolExperienceEntry(card) {
  const entry = card.querySelector('.tongxue-card-entry');
  if (!entry) return;
  entry.classList.add('tongxue-card-entry--compact');
  entry.dataset.scopeGroup = 'school';
  const brand = entry.querySelector('.tongxue-card-entry__brand');
  const text = entry.querySelector('.tongxue-card-entry__text');
  if (brand) brand.textContent = '学生谈这所学校';
  if (text) text.textContent = '看看学校整体的学习和生活体验';
  entry.setAttribute('aria-label', '查看学生对这所学校的整体体验');
  entry.title = '这里是学生分享，不代表学校官方结论。';
}

function insertScoreEntry(card, entry) {
  if (!entry) return;
  const tongxue = card.querySelector('.tongxue-card-entry');
  const hint = card.querySelector('.pool-add-hint');
  if (tongxue) tongxue.before(entry);
  else if (hint) hint.before(entry);
  else card.append(entry);
}

function decorateScoreCards(root = document.getElementById('results')) {
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll('.major-card').forEach(card => {
    normalizeSchoolExperienceEntry(card);
    const sourceKey = clean(card.dataset.workspaceRecordKey);
    const sourceMajor = clean(card.querySelector('.major')?.childNodes?.[0]?.textContent || card.querySelector('.major')?.textContent);
    const code = clean(card.querySelector('.major-code-line b')?.textContent);
    const target = concreteMajorFromRendered({ code, name: sourceMajor });
    if (!target) {
      card.dataset.majorPathAvailability = 'unresolved-or-class-level';
      card.dataset.studentVoiceAvailability = 'unresolved-or-class-level';
      return;
    }
    const school = clean(card.querySelector('.school')?.textContent);
    if (!card.querySelector('[data-major-path-entry]')) insertScoreEntry(card, makeEntry(target, { context:'score', sourceKey, sourceMajor, school, compact:true }));
    if (!card.querySelector('[data-student-voice-entry]')) insertScoreEntry(card, makeStudentVoiceEntry(target, { context:'score', sourceKey, sourceMajor, school, compact:true }));
    card.dataset.majorPathAvailability = 'canonical-major';
    card.dataset.studentVoiceAvailability = 'canonical-major-cross-school';
  });
}

function decorateSchoolCards(root = document.getElementById('schoolAllContent')) {
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll('[data-school-record]').forEach(card => {
    const sourceKey = clean(card.dataset.schoolRecord);
    const sourceMajor = clean(card.dataset.majorName || card.querySelector('.school-major-title-line h3')?.textContent);
    const code = clean(card.dataset.majorCode);
    const target = concreteMajorFromRendered({ code, name:sourceMajor });
    if (!target) {
      card.dataset.majorPathAvailability = 'unresolved-or-class-level';
      card.dataset.studentVoiceAvailability = 'unresolved-or-class-level';
      return;
    }
    const school = clean(document.getElementById('schoolAllTitle')?.textContent);
    const main = card.querySelector('.school-major-main');
    if (!card.querySelector('[data-major-path-entry]')) {
      const entry = makeEntry(target, { context:'school', sourceKey, sourceMajor, school, compact:true });
      if (entry) (main || card).append(entry);
    }
    if (!card.querySelector('[data-student-voice-entry]')) {
      const voice = makeStudentVoiceEntry(target, { context:'school', sourceKey, sourceMajor, school, compact:true });
      if (voice) (main || card).append(voice);
    }
    card.dataset.majorPathAvailability = 'canonical-major';
    card.dataset.studentVoiceAvailability = 'canonical-major-cross-school';
  });
}

function decorateMajorAllCards(root = document.getElementById('majorAllContent')) {
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll('[data-major-path-record]').forEach(card => {
    const sourceKey = clean(card.dataset.workspaceRecordKey || card.dataset.majorRecordKey);
    const sourceMajorLine = clean(card.querySelector('.major-all-record-head p')?.textContent);
    const sourceMajor = sourceMajorLine.split('·').at(-1)?.trim() || sourceMajorLine;
    const codeLine = clean(card.querySelector('.major-all-record-meta')?.textContent);
    const code = codeLine.match(/专业代码\s*([A-Z0-9]+)/i)?.[1] || '';
    const target = concreteMajorFromRendered({ code, name: sourceMajor });
    if (!target) {
      card.dataset.majorPathAvailability = 'unresolved-or-class-level';
      card.dataset.studentVoiceAvailability = 'unresolved-or-class-level';
      return;
    }
    const school = clean(card.querySelector('.major-all-record-head h3')?.textContent);
    const actions = card.querySelector('.major-all-record-actions') || card;
    if (!card.querySelector('[data-major-path-entry]')) {
      const entry = makeEntry(target, { context:'major', sourceKey, sourceMajor, school, compact:true });
      if (entry) actions.append(entry);
    }
    if (!card.querySelector('[data-student-voice-entry]')) {
      const voice = makeStudentVoiceEntry(target, { context:'major', sourceKey, sourceMajor, school, compact:true });
      if (voice) actions.append(voice);
    }
    card.dataset.majorPathAvailability = 'canonical-major';
    card.dataset.studentVoiceAvailability = 'canonical-major-cross-school';
  });
}

function scheduleDecorate() {
  requestAnimationFrame(() => {
    decorateScoreCards();
    decorateSchoolCards();
    decorateMajorAllCards();
  });
}

function saveResumeSnapshot(event) {
  let target;
  try { target = new URL(event?.detail?.target || '', location.href); } catch { return; }
  const resumable = target.pathname === MAJOR_PATH_NAVIGATION_META.targetPath || target.pathname === STUDENT_VOICE_NAVIGATION_META.targetPath;
  if (!resumable) return;
  const sourceKey = clean(target.searchParams.get('sourceKey'));
  const context = target.searchParams.get('context') === 'school'
    ? 'school'
    : (target.searchParams.get('context') === 'major' ? 'major' : 'score');
  if (!sourceKey) return;
  const workspaceState = globalThis.__GAOKAO_SELECTION_WORKSPACE__?.getState?.() || {};
  const committed = workspaceState.committedQuery || null;
  const snapshot = {
    version:MAJOR_PATH_HANDOFF_VERSION,
    createdAt:Date.now(),
    context,
    sourceKey,
    sourceUrl:currentReturnTarget(),
    scrollY:Math.round(globalThis.scrollY || 0),
    resultMode:state.resultMode,
    candidateScore:state.candidateScore,
    rangePreset:state.rangePreset,
    activeBand:state.activeBand,
    bandFocus:state.bandFocus,
    resultViewMode:state.resultViewMode,
    filters:{ ...state.filters },
    schoolSelection:{ ...state.schoolSelection },
    schoolSort:state.schoolAll.sort,
    committed:committed ? { score:committed.score, rangePreset:committed.rangePreset, filters:{ ...(committed.filters || {}) } } : null
  };
  history.replaceState({ ...(history.state || {}), [RESUME_KEY]:snapshot }, '', location.href);
}

function clearResumeState() {
  const current = history.state || {};
  if (!current[RESUME_KEY]) return;
  const next = { ...current };
  delete next[RESUME_KEY];
  history.replaceState(next, '', location.href);
}

function restoreDom(snapshot) {
  const filters = snapshot.filters || {};
  state.candidateScore = snapshot.candidateScore == null ? null : Number(snapshot.candidateScore);
  state.rangePreset = snapshot.rangePreset || 'standard';
  state.activeBand = snapshot.activeBand || 'near';
  state.bandFocus = snapshot.bandFocus || state.activeBand;
  state.resultViewMode = snapshot.resultViewMode || 'all';
  state.resultMode = snapshot.resultMode === 'school-all'
    ? 'school-all'
    : (snapshot.resultMode === 'major-all' ? 'major-all' : 'score-bands');
  Object.assign(state.filters, filters);
  state.schoolSelection = { ...state.schoolSelection, ...(snapshot.schoolSelection || {}) };
  state.schoolAll.sort = snapshot.schoolSort || 'position-near';
  const score = document.getElementById('candidateScore');
  const region = document.getElementById('region');
  const school = document.getElementById('schoolKeyword');
  const major = document.getElementById('majorKeyword');
  const schoolSort = document.getElementById('schoolAllSort');
  if (score && state.candidateScore != null) score.value = String(state.candidateScore);
  if (region && filters.region) region.value = filters.region;
  if (school) school.value = filters.schoolKeyword || snapshot.schoolSelection?.displayName || '';
  if (major) major.value = filters.majorKeyword || '';
  if (schoolSort) schoolSort.value = state.schoolAll.sort;
}

function focusResumeTarget() {
  if (!resumeSnapshot?.sourceKey) return false;
  const selector = resumeSnapshot.context === 'school'
    ? `[data-school-record="${escapeSelector(resumeSnapshot.sourceKey)}"]`
    : `[data-workspace-record-key="${escapeSelector(resumeSnapshot.sourceKey)}"]`;
  const target = document.querySelector(selector);
  if (!(target instanceof HTMLElement)) return false;
  target.classList.add('major-path-return-target');
  scrollToExplicitTarget(target);
  requestAnimationFrame(() => requestAnimationFrame(() => target.classList.remove('major-path-return-target')));
  clearResumeState();
  resumeInFlight = false;
  resumeSnapshot = null;
  return true;
}

function maybeFocusAfterRender() {
  if (!resumeInFlight) return;
  requestAnimationFrame(() => requestAnimationFrame(focusResumeTarget));
}

function resumeFromHistoryIfNeeded() {
  const snapshot = history.state?.[RESUME_KEY];
  if (!snapshot || snapshot.version !== MAJOR_PATH_HANDOFF_VERSION || snapshot.sourceUrl !== currentReturnTarget()) return;
  resumeSnapshot = snapshot;
  resumeInFlight = true;
  restoreDom(snapshot);
  const workspace = globalThis.__GAOKAO_SELECTION_WORKSPACE__;
  if (!workspace?.submit) {
    resumeInFlight = false;
    return;
  }
  workspace.submit();
  maybeFocusAfterRender();
}

export function mountMajorPathHandoff() {
  if (mounted) return globalThis.__GAOKAO_MAJOR_PATH_HANDOFF__;
  mounted = true;
  ensureStylesheet();
  document.addEventListener('gaokao:results-committed', () => {
    decorateScoreCards();
    maybeFocusAfterRender();
  });
  document.addEventListener('gaokao:school-result-render', scheduleDecorate);
  document.addEventListener('gaokao:major-result-render', scheduleDecorate);
  document.addEventListener('gaokao:school-search-state', () => {
    scheduleDecorate();
    maybeFocusAfterRender();
  });
  document.addEventListener('gaokao:navigation-accepted', saveResumeSnapshot);
  window.addEventListener('pageshow', event => {
    if (event.persisted) clearResumeState();
  });
  scheduleDecorate();
  resumeFromHistoryIfNeeded();
  const api = Object.freeze({
    version:MAJOR_PATH_HANDOFF_VERSION,
    navigationVersion:MAJOR_PATH_NAVIGATION_META.version,
    studentVoiceNavigationVersion:STUDENT_VOICE_NAVIGATION_META.version,
    decorate:scheduleDecorate,
    getState:() => Object.freeze({ mounted, resumeInFlight, context:resumeSnapshot?.context || '' })
  });
  globalThis.__GAOKAO_MAJOR_PATH_HANDOFF__ = api;
  document.body.dataset.majorPathHandoff = MAJOR_PATH_HANDOFF_VERSION;
  return api;
}
