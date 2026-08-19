import { state } from '../state/app-state.v3963_1.js?v=3963_1';
import { resolveMajorUnderstanding } from '../knowledge/major-understanding-resolver.js?v=3949_0';
import { scrollToExplicitTarget } from './scroll-policy.v3961_0.js?v=3961_0';
import {
  MAJOR_PATH_NAVIGATION_META,
  buildMajorPathHref
} from '../../../shared/resources/majors/major-path-navigation.v003.js?v=003_0';

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
  link.href = '/ln-rank/css/major-path-handoff.v003.css?v=003_0';
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
  return `${location.pathname}${location.search}${location.hash}`;
}

function makeEntry(target, { context, sourceKey, sourceMajor, school = '', compact = false } = {}) {
  const href = buildMajorPathHref({
    majorCode: target.code,
    canonicalName: target.name,
    context,
    sourceKey,
    sourceMajor,
    school,
    returnTo: currentReturnTarget()
  });
  if (!href) return null;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = compact ? 'major-path-entry major-path-entry--compact' : 'major-path-entry';
  button.dataset.uiNavigation = 'major-path';
  button.dataset.uiNavigationTarget = href;
  button.dataset.majorPathEntry = target.code;
  button.dataset.majorPathSourceKey = sourceKey || '';
  button.setAttribute('aria-label', `了解${target.name}的专业关系和读研方向`);
  button.innerHTML = compact
    ? `<span>了解这个专业</span><small>专业关系和读研方向</small><b aria-hidden="true">→</b>`
    : `<span class="major-path-entry__brand">专业升学地图</span><span class="major-path-entry__text"><strong>了解这个专业</strong><small>专业关系 · 相邻专业 · 读研方向</small></span><b class="major-path-entry__arrow" aria-hidden="true">→</b>`;
  return button;
}

function decorateScoreCards(root = document.getElementById('results')) {
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll('.major-card').forEach(card => {
    if (card.querySelector('[data-major-path-entry]')) return;
    const sourceKey = clean(card.dataset.workspaceRecordKey);
    const sourceMajor = clean(card.querySelector('.major')?.childNodes?.[0]?.textContent || card.querySelector('.major')?.textContent);
    const code = clean(card.querySelector('.major-code-line b')?.textContent);
    const target = concreteMajorFromRendered({ code, name: sourceMajor });
    if (!target) {
      card.dataset.majorPathAvailability = 'unresolved-or-class-level';
      return;
    }
    const school = clean(card.querySelector('.school')?.textContent);
    const entry = makeEntry(target, { context: 'score', sourceKey, sourceMajor, school });
    if (!entry) return;
    const tongxue = card.querySelector('.tongxue-card-entry');
    const hint = card.querySelector('.pool-add-hint');
    if (tongxue) tongxue.before(entry);
    else if (hint) hint.before(entry);
    else card.append(entry);
    card.dataset.majorPathAvailability = 'canonical-major';
  });
}

function decorateSchoolCards(root = document.getElementById('schoolAllContent')) {
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll('[data-school-record]').forEach(card => {
    if (card.querySelector('[data-major-path-entry]')) return;
    const sourceKey = clean(card.dataset.schoolRecord);
    const sourceMajor = clean(card.querySelector('.school-major-title-line h3')?.textContent);
    const target = concreteMajorFromRendered({ name: sourceMajor });
    if (!target) {
      card.dataset.majorPathAvailability = 'unresolved-or-class-level';
      return;
    }
    const school = clean(document.getElementById('schoolAllTitle')?.textContent);
    const entry = makeEntry(target, { context: 'school', sourceKey, sourceMajor, school, compact: true });
    if (!entry) return;
    const main = card.querySelector('.school-major-main');
    if (main) main.append(entry);
    else card.prepend(entry);
    card.dataset.majorPathAvailability = 'canonical-major';
  });
}

function scheduleDecorate() {
  requestAnimationFrame(() => {
    decorateScoreCards();
    decorateSchoolCards();
  });
}

function saveResumeSnapshot(event) {
  let target;
  try { target = new URL(event?.detail?.target || '', location.href); } catch { return; }
  if (target.pathname !== MAJOR_PATH_NAVIGATION_META.targetPath) return;
  const sourceKey = clean(target.searchParams.get('sourceKey'));
  const context = target.searchParams.get('context') === 'school' ? 'school' : 'score';
  if (!sourceKey) return;
  const workspaceState = globalThis.__GAOKAO_SELECTION_WORKSPACE__?.getState?.() || {};
  const committed = workspaceState.committedQuery || null;
  const snapshot = {
    version: MAJOR_PATH_HANDOFF_VERSION,
    createdAt: Date.now(),
    context,
    sourceKey,
    sourceUrl: currentReturnTarget(),
    scrollY: Math.round(globalThis.scrollY || 0),
    resultMode: state.resultMode,
    candidateScore: state.candidateScore,
    rangePreset: state.rangePreset,
    activeBand: state.activeBand,
    bandFocus: state.bandFocus,
    resultViewMode: state.resultViewMode,
    filters: { ...state.filters },
    schoolSelection: { ...state.schoolSelection },
    schoolSort: state.schoolAll.sort,
    committed: committed ? {
      score: committed.score,
      rangePreset: committed.rangePreset,
      filters: { ...(committed.filters || {}) }
    } : null
  };
  history.replaceState({ ...(history.state || {}), [RESUME_KEY]: snapshot }, '', location.href);
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
  state.resultMode = snapshot.resultMode === 'school-all' ? 'school-all' : 'score-bands';
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
    version: MAJOR_PATH_HANDOFF_VERSION,
    navigationVersion: MAJOR_PATH_NAVIGATION_META.version,
    decorate: scheduleDecorate,
    getState: () => Object.freeze({ mounted, resumeInFlight, context: resumeSnapshot?.context || '' })
  });
  globalThis.__GAOKAO_MAJOR_PATH_HANDOFF__ = api;
  document.body.dataset.majorPathHandoff = MAJOR_PATH_HANDOFF_VERSION;
  return api;
}
