import { state } from '../state/app-state.v3963_1.js?v=3963_1';
import { createHumanInputProposal, parseScoreInput, scoreQueryValue } from '../query/human-query-input-protocol.v001.js?v=3990_2';
import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  isPublicBottomLineVisible
} from '../../../shared/resources/exam/liaoning-physics.js?v=3967_0';
import { getScoreGuard } from '../core/score-guard.js?v=3961_0';
import { REGION_OPTIONS } from '../config/region-options.js?v=3961_0';
import {
  fetchMajorBands,
  renderMajorResults,
  buildKeywordQuery,
  mountKeywordPresetPanel
} from '../feature/major-pool/index.v3967_0.js?v=3967_0';
import {
  renderBandLegend,
  renderResultBandSwitcher
} from '../feature/score-bands/index.v3963_1.js?v=3963_1';
import {
  initFeishuReport,
  renderFeishuReport,
  clearFeishuReport
} from '../feature/feishu/index.v3967_0.js?v=3967_0';
import {
  initSelectionPool,
  refreshSelectionPool,
  createSelectionPoolAdapter
} from '../feature/selection-pool/index.v3967_0.js?v=3967_0';
import { renderSearchTrendHint } from '../feature/trend/index.v3967_0.js?v=3967_0';
import {
  getQueryButtonLabel,
  getQueryButtonClass,
  bottomLineLabel as uiBottomLineLabel,
  initRankBandLegend
} from '../feature/ui/index.js?v=3961_0';
import { getRangePresetLabel } from '../domain/range-policy.v3963_1.js?v=3963_1';
import { getBandFocusLabel } from '../domain/band-policy.js?v=3961_0';
import {
  setRangePreset,
  setBandFocus,
  syncRangeState
} from '../state/range-state.v3963_1.js?v=3963_1';
import { syncControlConsoleState } from '../ui/control-console.v3963_1.js?v=3963_1';
import { normalizeMajorBandsResponse } from '../domain/score-band-contract.v3963_1.js?v=3963_1';
import {
  normalizeSpecialProjectMode,
  SPECIAL_PROJECT_STORAGE_KEY,
  SPECIAL_PROJECT_HIDE_MODE,
  SPECIAL_PROJECT_SHOW_MODE,
  specialProjectStatusCopy,
  specialProjectToggleLabel,
  specialProjectHelpCopy
} from '../domain/special-project-policy.js?v=3961_0';
import { initDirectionExplorer } from '../feature/direction-explorer/direction-explorer-render.js?v=3961_0';
import { formatApiErrorForHuman } from '../shared/api-client.js?v=3961_0';
import {
  resolveMainFlowStep,
  SCHOOL_FLOW_STEPS,
  clearFlowAction
} from '../domain/flow-step-contract.v3963_1.js?v=3963_1';
import { resolveCompactSchoolResource } from '../../../shared/resources/schools/school-resource-center.js?v=3963_0';
import {
  buildQuerySignature,
  saveSuccessfulQuerySignature,
  resolveResultFreshness
} from '../domain/query-session-contract.js?v=3961_0';
import { resolveHumanWorkflowState } from '../domain/human-workflow-state-contract.js?v=3961_0';
import {
  expireReport,
  readReportFreshness
} from '../domain/report-freshness-contract.js?v=3961_0';
import { renderMainFlowStepper } from '../feature/flow-stepper/flow-stepper-render.v3963_1.js?v=3963_1';
import {
  buildFilterConflicts,
  removeKeywordGroup,
  readConfirmedConflictSignatures,
  confirmFilterConflict,
  clearConfirmedConflictsForNewQuery
} from '../domain/filter-conflict-contract.js?v=3961_0';
import { renderFilterConflicts } from '../feature/filter-conflict/filter-conflict-render.js?v=3961_0';
import {
  bindResultCommitBridge,
  commitMajorResults,
  updateResultWorkspaceStatus
} from './result-commit.v3967_0.js?v=3967_0';
import {
  beginQueryScrollIntent,
  finishQueryScrollIntent,
  markWorkspaceIntent,
  scrollToExplicitTarget
} from './scroll-policy.v3961_0.js?v=3961_0';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;
const MODE_SCORE = 'score-bands';
const MODE_SCHOOL = 'school-all';
const MODE_MAJOR = 'major-all';
const BOTTOMLINE_STORAGE_KEY = 'lnRank.bottomLineMode.current';
const BOTTOMLINE_LEGACY_KEYS = [
  'lnRank.bottomLineMode.v3980',
  'lnRank.bottomLineMode.v3962',
  'lnRank.bottomLineMode.v3960',
  'lnRank.bottomLineMode.v3912'
];
const BOTTOMLINE_MODES = new Set(['all', 'public_first', 'public_regular_only', 'public_include_sino']);
const RESULT_PAGE_SIZE = 40;
const DEBUG = new URLSearchParams(location.search).get('debugUi') === '1';

let hasQueried = false;
let dirty = false;
let committedQuery = null;
let committedSummary = '';
let directionExplorerController = null;
let requestSequence = 0;
let activeController = null;
let pendingCommit = false;
let pendingPreserveScroll = false;
const pendingReasons = new Set();
let lastNormalizedScore = null;
let lastScoreDraft = '';

const requestState = {
  loading: false,
  updateError: '',
  requestId: 0
};

const diagnostics = {
  intents: 0,
  commits: 0,
  requests: 0
};

const selectionPool = createSelectionPoolAdapter();

syncRangeState(state);
document.body?.classList?.add('has-floating-pool-entry', 'ln-new-parent-flow');
document.body.dataset.scoreState = 'empty';
  document.body.dataset.workspaceOrchestration = 'selection-workspace-orchestration-v3969_2';

function log(...args) {
  if (DEBUG) console.info('[selection-workspace-v3969]', ...args);
}

function emitWorkspaceState(reason) {
  const schoolMode = state.resultMode === MODE_SCHOOL;
  const majorMode = state.resultMode === MODE_MAJOR;
  const majorState = majorMode ? (globalThis.__GAOKAO_MAJOR_ALL_MODE__?.getState?.() || {}) : null;
  document.dispatchEvent(new CustomEvent('gaokao:workspace-state', {
    detail: Object.freeze({
      reason,
      mode: state.resultMode,
      dirty: schoolMode ? Boolean(state.schoolAll.dirty) : majorMode ? Boolean(majorState?.dirty) : dirty,
      loading: schoolMode
        ? Boolean(state.schoolAll.loading || state.schoolAll.loadingMore)
        : majorMode
          ? Boolean(majorState?.loading)
          : requestState.loading,
      hasResult: schoolMode ? Boolean(state.schoolAll.data) : majorMode ? Boolean(majorState?.data) : Boolean(state.bands?.data),
      activeBand: state.activeBand,
      resultSignature: schoolMode || majorMode ? '' : (state.bands?.resultSignature || ''),
      currentSignature: schoolMode || majorMode ? '' : currentQuerySignature()
    })
  }));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function schoolInputValue() {
  return String(document.getElementById('schoolKeyword')?.value || state.filters.schoolKeyword || '').trim();
}

function resolveSchoolSelectionFromInput() {
  const input = schoolInputValue();
  const resolved = input ? resolveCompactSchoolResource(input) : null;
  state.schoolSelection = {
    status: !input ? 'empty' : (resolved?.entityId ? 'resolved' : 'input'),
    input,
    entityId: resolved?.entityId || '',
    displayName: resolved?.school || input,
    entityType: resolved?.entityType || '',
    parentEntityId: resolved?.parentEntityId || ''
  };
  state.filters.schoolKeyword = input;
  state.filters.schoolEntityId = state.schoolSelection.entityId;
  return state.schoolSelection;
}

function normalizeSchoolSort(value) {
  const key = String(value || '').trim();
  return ['position-near', 'score-desc', 'score-asc'].includes(key) ? key : 'position-near';
}

function updateSearchUrl({ push = false } = {}) {
  const url = new URL(location.href);
  const score = scoreQueryValue(scoreInput()?.value);
  const school = state.schoolSelection?.displayName || schoolInputValue();
  const major = String(state.filters.majorKeyword || '').trim();
  if (state.resultMode === MODE_SCHOOL || state.resultMode === MODE_MAJOR) url.searchParams.set('mode', state.resultMode);
  else url.searchParams.delete('mode');
  if (score != null) url.searchParams.set('score', String(score));
  else url.searchParams.delete('score');
  if (school) url.searchParams.set('school', school);
  else url.searchParams.delete('school');
  if (state.schoolSelection?.entityId) url.searchParams.set('schoolEntity', state.schoolSelection.entityId);
  else url.searchParams.delete('schoolEntity');
  if (major) url.searchParams.set('majorKeyword', major);
  else url.searchParams.delete('majorKeyword');
  if (state.resultMode === MODE_SCHOOL) url.searchParams.set('schoolSort', normalizeSchoolSort(state.schoolAll.sort));
  else url.searchParams.delete('schoolSort');
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  if (push) history.pushState(history.state, '', nextUrl);
  else history.replaceState(history.state, '', nextUrl);
}

function schoolSortLabel(value) {
  return ({
    'position-near': '离参考位次最近',
    'score-desc': '历史投档位次靠前',
    'score-asc': '历史投档位次靠后'
  })[normalizeSchoolSort(value)] || '离参考位次最近';
}

function syncSearchIntentUi() {
  const schoolMode = state.resultMode === MODE_SCHOOL;
  const majorMode = state.resultMode === MODE_MAJOR;
  const selection = state.schoolSelection || {};
  document.body.dataset.resultMode = majorMode ? MODE_MAJOR : (schoolMode ? MODE_SCHOOL : MODE_SCORE);
  document.getElementById('resultsPanel')?.toggleAttribute('hidden', schoolMode || majorMode);
  document.getElementById('schoolAllResultsPanel')?.toggleAttribute('hidden', !schoolMode);
  document.getElementById('majorAllResultsPanel')?.toggleAttribute('hidden', !majorMode);
  document.getElementById('specialProjectPanel')?.toggleAttribute('hidden', majorMode);
  document.querySelectorAll('[data-school-view-mode]').forEach(button => {
    const active = button.dataset.schoolViewMode === state.resultMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const scoreLabel = document.getElementById('candidateScoreLabel');
  const scoreHelp = document.getElementById('candidateScoreHelp');
  const workbenchTitle = document.getElementById('searchWorkbenchTitle');
  const workbenchDesc = document.getElementById('searchWorkbenchDesc');
  const schoolLabel = document.getElementById('schoolKeywordLabel');
  const schoolHelp = document.getElementById('schoolKeywordHelp');
  if (scoreLabel) scoreLabel.textContent = schoolMode || majorMode ? '参考分数（可不填）' : '确认孩子目前的位置';
  if (scoreHelp) scoreHelp.textContent = majorMode
    ? '可不填；填写后只用于按2026历史位次排序，不会删掉专业记录。'
    : schoolMode
      ? '不填也会展示该校记录；填写后只用于标出与2026历史位次的距离，不会删掉该校专业。'
      : '系统会换算为辽宁2026物理类历史位次，再按位次关系分组。';
  if (workbenchTitle) workbenchTitle.textContent = majorMode
    ? '先确认孩子想看的专业，再看有哪些学校'
    : schoolMode
      ? '先确认学校，再缩小校内专业范围'
      : '说清想看的专业和家庭条件';
  if (workbenchDesc) workbenchDesc.textContent = majorMode
    ? '支持单专业或多个专业；模糊输入先确认规范本科专业，可选分数、地区、学校和普通/中外项目条件。'
    : schoolMode
      ? '学校本部、分校和校区要准确区分。专业方向可以不填，也可以用“电气/自动化”一次看任意一个方向。'
      : '不知道具体专业名，也可以先输入大方向。孩子是否真正接受，还要结合课程内容继续确认。';
  if (schoolLabel) schoolLabel.textContent = majorMode ? '学校名称关键词，可不填' : (schoolMode ? '目标学校' : '学校名称关键词，可不填');
  if (schoolHelp) schoolHelp.textContent = majorMode
    ? '可用正式校名或简称筛选学校；城市范围请用地区条件。'
    : schoolMode
      ? '可以输入完整学校名、简称或城市。城市与校名片段冲突时会分组列出，必须再选择准确学校。'
      : '学校条件只接受统一目录解析后的学校；查看城市学校请使用地区条件，避免把城市词误当校名片段。';

  const moreConditions = document.getElementById('familyConditionsDetails');
  // In score mode this is a user-owned disclosure. Reassigning `open = false`
  // on every draft commit made Android close/reflow the panel while a region
  // select or major input was being edited. School/major modes still expose
  // their required secondary conditions once, but score mode preserves the
  // user's local open state and browser scroll anchor.
  if (moreConditions && (schoolMode || majorMode) && !moreConditions.open) {
    moreConditions.open = true;
  }

  const status = document.getElementById('schoolResolveStatus');
  if (status) {
    if (majorMode) {
      status.textContent = '按专业查询：先确认一个或多个具体本科专业，分数、地区和学校条件都可以不填。';
    } else if (!schoolMode) {
      status.textContent = selection.input
        ? `当前按分数查看，并保留学校条件：${selection.displayName || selection.input}。`
        : '当前从参考分数开始；也可以先输入目标学校，再切换查看该校全部专业。';
    } else if (!selection.input) {
      status.textContent = '请先输入完整学校名称；参考分数可以不填。';
    } else if (selection.status === 'resolved' && selection.entityId) {
      status.textContent = `当前学校：${selection.displayName}（已按学校实体区分本部、分校或校区）`;
    } else if (selection.status === 'unresolved' || selection.status === 'needs-confirmation') {
      status.textContent = '先确认准确学校名称，再查看这所学校的历史专业记录。';
    } else {
      status.textContent = `将按完整名称核对“${selection.displayName || selection.input}”；如有本部、分校或校区差异，会让你确认。`;
    }
  }

  const sort = document.getElementById('schoolAllSort');
  if (sort && sort.value !== normalizeSchoolSort(state.schoolAll.sort)) sort.value = normalizeSchoolSort(state.schoolAll.sort);
  const back = document.getElementById('schoolAllBack');
  if (back) back.textContent = state.bands?.data ? '回到刚才的分数结果' : '切到按分数查看';
}

function setResultMode(mode, { updateHistory = true } = {}) {
  const next = mode === MODE_SCHOOL ? MODE_SCHOOL : (mode === MODE_MAJOR ? MODE_MAJOR : MODE_SCORE);
  const changed = state.resultMode !== next;
  if (next === MODE_SCHOOL && state.schoolSelection?.input !== schoolInputValue()) {
    resolveSchoolSelectionFromInput();
  }
  state.resultMode = next;
  syncSearchIntentUi();
  if (updateHistory) updateSearchUrl({ push: changed });
  scheduleWorkspaceCommit('result-mode-changed', true);
  document.dispatchEvent(new CustomEvent('gaokao:result-mode-change', { detail: { mode: next } }));
  if (next === MODE_SCHOOL) document.dispatchEvent(new CustomEvent('gaokao:school-result-render'));
}

function restoreSearchIntentFromUrl() {
  const params = new URLSearchParams(location.search);
  const school = String(params.get('school') || '').trim();
  const major = String(params.get('majorKeyword') || '').trim();
  const score = String(params.get('score') || '').replace(/[^0-9]/g, '');
  const schoolInput = document.getElementById('schoolKeyword');
  const majorInput = document.getElementById('majorKeyword');
  const candidateInput = document.getElementById('candidateScore');
  if (schoolInput && school) schoolInput.value = school;
  if (majorInput && major) majorInput.value = major;
  if (candidateInput && score && !candidateInput.value) candidateInput.value = score;
  state.filters.schoolKeyword = school;
  state.filters.majorKeyword = major;
  state.schoolAll.sort = normalizeSchoolSort(params.get('schoolSort'));
  resolveSchoolSelectionFromInput();
  const requestedEntity = String(params.get('schoolEntity') || '').trim();
  if (requestedEntity && state.schoolSelection.input) {
    state.schoolSelection.status = 'resolved';
    state.schoolSelection.entityId = requestedEntity;
    state.filters.schoolEntityId = requestedEntity;
  }
  state.resultMode = params.get('mode') === MODE_SCHOOL
    ? MODE_SCHOOL
    : (params.get('mode') === MODE_MAJOR ? MODE_MAJOR : MODE_SCORE);
}

function normalizeBottomLineMode(value) {
  const key = String(value || '').trim();
  return BOTTOMLINE_MODES.has(key) ? key : 'all';
}

function shouldShowBottomLinePanel(score) {
  return isPublicBottomLineVisible(score, EXAM);
}

function getEffectiveBottomLineMode(score = state.candidateScore, filters = state.filters) {
  return shouldShowBottomLinePanel(score) ? normalizeBottomLineMode(filters.bottomLineMode) : 'all';
}

function buildEffectiveFilters(score = state.candidateScore, filters = state.filters) {
  const majorKeyword = filters.majorKeyword || '';
  return {
    ...filters,
    majorKeyword,
    schoolEntityId: state.schoolSelection?.entityId || filters.schoolEntityId || '',
    keywordQuery: buildKeywordQuery(majorKeyword),
    bottomLineMode: getEffectiveBottomLineMode(score, filters),
    specialProjectMode: normalizeSpecialProjectMode(filters.specialProjectMode)
  };
}

function querySnapshotFromDraft() {
  return Object.freeze({
    score: state.candidateScore,
    rangePreset: state.rangePreset,
    filters: Object.freeze({ ...buildEffectiveFilters(state.candidateScore) })
  });
}

function signatureForSnapshot(snapshot) {
  return buildQuerySignature({
    score: snapshot?.score,
    rangePreset: snapshot?.rangePreset,
    bandFocus: 'all-bands',
    filters: snapshot?.filters || {}
  });
}

function currentQuerySignature() {
  return signatureForSnapshot(querySnapshotFromDraft());
}

function currentResultFreshness() {
  return resolveResultFreshness({
    currentSignature: currentQuerySignature(),
    resultSignature: state.bands?.resultSignature || state.bands?.querySignature || '',
    hasResult: Boolean(state.bands?.data),
    loading: requestState.loading && !state.bands?.data,
    error: state.bands?.error
  });
}

function bottomLineLabel(mode) {
  return uiBottomLineLabel(normalizeBottomLineMode(mode));
}

function regionLabel(key) {
  return REGION_OPTIONS.find(item => item.key === key)?.label || '不限';
}

function summaryForSnapshot(snapshot) {
  if (!snapshot) return '';
  const parts = [];
  if (snapshot.score) parts.push(`${snapshot.score}分`);
  const region = regionLabel(snapshot.filters?.region);
  if (region && region !== '不限') parts.push(region);
  const bottom = snapshot.filters?.bottomLineMode || 'all';
  if (bottom !== 'all') parts.push(bottomLineLabel(bottom));
  const major = String(snapshot.filters?.majorKeyword || '').trim();
  if (major) parts.push(`方向：${major.length > 12 ? `${major.slice(0, 12)}…` : major}`);
  return parts.join('，');
}

function rangePresetLabel(preset = state.rangePreset) {
  return getRangePresetLabel(preset);
}

function bandFocusLabel(band = state.bandFocus || state.activeBand) {
  return getBandFocusLabel(band);
}

function filterSummaryItem(label, value) {
  return { label, value: String(value || '').trim() };
}

function compactSummaryValue(value, limit = 14) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function syncScoreState(g) {
  const key = g?.key || 'empty';
  document.body.dataset.scoreState = key;
  document.querySelector('.ln-filter-panel')?.setAttribute('data-score-state', key);
}

function renderScoreInterpretation() {
  const root = document.getElementById('scoreInterpretation');
  if (!root) return;
  const input = scoreInput();
  const raw = input ? input.value.trim() : '';
  const interpretation = state.scoreInterpretation || parseScoreInput(raw);
  root.hidden = !raw;
  root.dataset.state = interpretation.kind;
  root.textContent = raw ? '我理解为：' + interpretation.message : '';
}

function scoreInputHasBlockingError() {
  const input = scoreInput();
  const raw = input ? input.value.trim() : '';
  const interpretation = state.scoreInterpretation || parseScoreInput(raw);
  return Boolean(raw) && !interpretation.canSubmit;
}

function updateGuideNote(guide, g, text) {
  if (!guide) return;
  guide.textContent = text || g?.guide || '';
  guide.className = 'filter-action-note';
  const key = g?.key || 'normal';
  if (['belowCoverage', 'topRange', 'invalidHigh'].includes(key)) {
    guide.classList.add('score-guard-notice', `is-${key}`);
  }
}

function renderFilterSummary() {
  const root = document.getElementById('filterSummary');
  if (!root) return;
  const regionSelect = document.getElementById('region');
  const regionText = regionSelect?.selectedOptions?.[0]?.textContent?.trim();
  const regionValue = regionText && regionText !== '不限' ? regionText : '不限';
  const schoolKeyword = String(state.filters.schoolKeyword || '').trim();
  const majorKeyword = String(state.filters.majorKeyword || '').trim();
  if (state.resultMode === MODE_SCHOOL) {
    const score = state.candidateScore || parseScoreFromInput();
    const schoolChips = [
      filterSummaryItem('学校', schoolKeyword || '待输入'),
      filterSummaryItem('范围', '该校辽宁2026记录')
    ];
    if (majorKeyword) schoolChips.push(filterSummaryItem('方向任一', majorKeyword));
    const schoolDetails = [
      filterSummaryItem('学校实体', state.schoolSelection?.entityId ? `${state.schoolSelection.displayName}（已区分实体）` : (schoolKeyword || '待输入')),
      filterSummaryItem('专业关键词', majorKeyword ? `${majorKeyword}（任意一个词匹配）` : '不限定'),
      filterSummaryItem('参考分数', score ? `${score}分，仅用于位次对照` : '未填写，不影响专业数量'),
      filterSummaryItem('普通与特殊项目', '分组展示，不混在一起'),
      filterSummaryItem('排序', schoolSortLabel(state.schoolAll.sort))
    ];
    root.innerHTML = `
      <div class="ln-filter-summary-main" aria-label="当前学校查看条件摘要">
        <span class="ln-filter-summary-title">当前查看</span>
        <div class="ln-filter-summary-chips">${schoolChips.map(item => `
          <span class="ln-filter-summary-chip">
            <span class="ln-filter-summary-chip-label">${escapeHtml(item.label)}</span>
            <b>${escapeHtml(compactSummaryValue(item.value))}</b>
          </span>`).join('')}</div>
      </div>
      <details class="ln-filter-summary-details">
        <summary>查看完整条件</summary>
        <dl>${schoolDetails.map(item => `
          <div class="ln-filter-summary-row"><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join('')}</dl>
      </details>`;
    return;
  }
  if (state.resultMode === MODE_MAJOR) {
    const score = state.candidateScore || parseScoreFromInput();
    const projectValue = String(document.getElementById('majorProjectMode')?.value || 'all');
    const projectText = projectValue === 'ordinary-only'
      ? '仅普通项目'
      : projectValue === 'sino-only'
        ? '仅中外/高收费项目'
        : '普通与中外项目分开显示';
    const majorChips = [
      filterSummaryItem('专业', majorKeyword || '待确认'),
      filterSummaryItem('地区', regionValue),
      filterSummaryItem('参考分数', score ? `${score}分` : '未填写')
    ];
    const majorDetails = [
      filterSummaryItem('专业方向', majorKeyword || '待确认具体本科专业'),
      filterSummaryItem('学校', schoolKeyword || '不限'),
      filterSummaryItem('地区', regionValue),
      filterSummaryItem('参考分数', score ? `${score}分，仅用于位置排序` : '未填写，不影响记录召回'),
      filterSummaryItem('项目口径', projectText),
      filterSummaryItem('历史年份', '2026主口径，严格对应展示2025/2024')
    ];
    root.innerHTML = '<div class="ln-filter-summary-main" aria-label="当前按专业查看条件摘要">'
      + '<span class="ln-filter-summary-title">当前按专业查看</span>'
      + '<div class="ln-filter-summary-chips">' + majorChips.map(item => '<span class="ln-filter-summary-chip"><span class="ln-filter-summary-chip-label">' + escapeHtml(item.label) + '</span><b>' + escapeHtml(compactSummaryValue(item.value)) + '</b></span>').join('') + '</div></div>'
      + '<details class="ln-filter-summary-details"><summary>查看完整条件</summary><dl>' + majorDetails.map(item => '<div class="ln-filter-summary-row"><dt>' + escapeHtml(item.label) + '</dt><dd>' + escapeHtml(item.value) + '</dd></div>').join('') + '</dl></details>';
    return;
  }
  const effectiveBottomLine = getEffectiveBottomLineMode();
  const bottomLineText = effectiveBottomLine !== 'all' ? bottomLineLabel(effectiveBottomLine) : '全部院校';
  const specialText = normalizeSpecialProjectMode(state.filters.specialProjectMode) === SPECIAL_PROJECT_SHOW_MODE ? '已显示' : '默认隐藏';

  const chips = [
    filterSummaryItem('查看', bandFocusLabel()),
    filterSummaryItem('院校', bottomLineText)
  ];
  if (schoolKeyword) chips.push(filterSummaryItem('学校', schoolKeyword));
  if (majorKeyword) chips.push(filterSummaryItem('方向', majorKeyword));

  const detailItems = [
    filterSummaryItem('查看范围', rangePresetLabel()),
    filterSummaryItem('分数位置', bandFocusLabel()),
    filterSummaryItem('地区', regionValue),
    filterSummaryItem('学校', schoolKeyword || '不限'),
    filterSummaryItem('专业方向', majorKeyword || '未限定'),
    filterSummaryItem('院校范围', bottomLineText),
    filterSummaryItem('特殊项目', specialText)
  ];

  root.innerHTML = `
    <div class="ln-filter-summary-main" aria-label="当前查看条件摘要">
      <span class="ln-filter-summary-title">当前查看</span>
      <div class="ln-filter-summary-chips">${chips.map(item => `
        <span class="ln-filter-summary-chip">
          <span class="ln-filter-summary-chip-label">${escapeHtml(item.label)}</span>
          <b>${escapeHtml(compactSummaryValue(item.value))}</b>
        </span>`).join('')}</div>
    </div>
    <details class="ln-filter-summary-details">
      <summary>查看完整条件</summary>
      <dl>${detailItems.map(item => `
        <div class="ln-filter-summary-row"><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join('')}</dl>
    </details>`;
}

function loadBottomLineMode() {
  try {
    const current = localStorage.getItem(BOTTOMLINE_STORAGE_KEY);
    if (current) return normalizeBottomLineMode(current);
    const legacy = BOTTOMLINE_LEGACY_KEYS.map(key => localStorage.getItem(key)).find(Boolean);
    return normalizeBottomLineMode(legacy);
  } catch {
    return 'all';
  }
}

function saveBottomLineMode(mode) {
  state.filters.bottomLineMode = normalizeBottomLineMode(mode);
  try {
    localStorage.setItem(BOTTOMLINE_STORAGE_KEY, state.filters.bottomLineMode);
  } catch {}
}

function loadSpecialProjectMode() {
  try {
    return normalizeSpecialProjectMode(localStorage.getItem(SPECIAL_PROJECT_STORAGE_KEY));
  } catch {
    return SPECIAL_PROJECT_HIDE_MODE;
  }
}

function saveSpecialProjectMode(mode) {
  state.filters.specialProjectMode = normalizeSpecialProjectMode(mode);
  try {
    localStorage.setItem(SPECIAL_PROJECT_STORAGE_KEY, state.filters.specialProjectMode);
  } catch {}
}

state.filters.bottomLineMode = loadBottomLineMode();
state.filters.specialProjectMode = loadSpecialProjectMode();

function resetVisible() {
  state.visible = { upper: 16, near: 16, steady: 16 };
  state.resultViewMode = 'all';
  state.bands.loadingMoreBand = '';
  state.bands.moreError = '';
}

function resultRecordKey(record = {}) {
  return [
    record.id,
    record.schoolCode2026,
    record.majorCode2026,
    record.school,
    record.major,
    record.score2026 ?? record.score,
    record.rank2026 ?? record.rank
  ].filter(value => value != null && value !== '').join('__');
}

function mergeBandRecords(existing = [], incoming = []) {
  const seen = new Set();
  return [...existing, ...incoming].filter(record => {
    const key = resultRecordKey(record);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreInput() {
  return document.getElementById('candidateScore');
}

function parseScoreFromInput() {
  const input = scoreInput();
  const raw = input ? input.value.trim() : '';
  const interpretation = parseScoreInput(raw);
  state.scoreInterpretation = interpretation;
  state.scoreProposal = createHumanInputProposal({ field: 'score', raw, interpretation });
  state.candidateScore = interpretation.canSubmit ? interpretation.value : null;
  try {
    if (state.candidateScore != null) {
      localStorage.setItem('lnRank.selectionPool.candidateScore', String(state.candidateScore));
      localStorage.setItem('lnRank.selectionPool.candidateScore.v3949_0', String(state.candidateScore));
    } else {
      localStorage.removeItem('lnRank.selectionPool.candidateScore');
    }
  } catch {}
  return state.candidateScore;
}

function guard() {
  parseScoreFromInput();
  return getScoreGuard(state.candidateScore);
}

function majorInputState() {
  return globalThis.__GAOKAO_MAJOR_ALL_MODE__?.getInputState?.() || { blocking: false, ready: true, draftText: '' };
}

function majorInputBlocking() {
  return state.resultMode !== MODE_MAJOR && Boolean(majorInputState().blocking);
}

function setReadyStatus(mode, text) {
  const badge = document.getElementById('appReadyBadge');
  if (!badge) return;
  badge.className = `ready-badge is-${mode}`;
  const label = badge.querySelector('.ready-text');
  if (label) label.textContent = text;
}

function setMessageFromGuard(g) {
  state.bands.loading = false;
  state.bands.error = null;
  if (!state.bands.data) {
    state.bands.title = g.resultTitle;
    state.bands.badge = g.resultBadge;
    state.bands.meta = g.key === 'normal' ? '等待点击查看' : '暂不查询专业池';
    state.bands.message = g.resultMessage;
    state.bands.noticeClass = `notice-${g.key}`;
  }
}

function syncMobileDirtyBar(g) {
  const bar = document.getElementById('mobileDirtyBar');
  if (!bar) return;
  if (state.resultMode === MODE_MAJOR) {
    const majorState = globalThis.__GAOKAO_MAJOR_ALL_MODE__?.getState?.() || {};
    const show = Boolean(majorState.data && majorState.dirty && !majorState.loading);
    bar.hidden = !show;
    bar.classList.toggle('is-visible', show);
    const text = bar.querySelector('.mobile-dirty-text');
    const action = bar.querySelector('button');
    if (text) text.textContent = '专业或筛选条件已变化';
    if (action) action.textContent = '更新专业结果';
    return;
  }
  if (state.resultMode === MODE_SCHOOL) {
    const show = Boolean(state.schoolAll.data && state.schoolAll.dirty && !state.schoolAll.loading && !state.schoolAll.loadingMore);
    bar.hidden = !show;
    bar.classList.toggle('is-visible', show);
    const text = bar.querySelector('.mobile-dirty-text');
    const action = bar.querySelector('button');
    if (text) text.textContent = '学校或专业条件已变化';
    if (action) action.textContent = '更新学校专业';
    return;
  }
  const keyword = state.filters.majorKeyword ? `｜${state.filters.majorKeyword}` : '';
  const show = Boolean(dirty && g?.canQuery);
  bar.hidden = !show;
  bar.classList.toggle('is-visible', show);
  const text = bar.querySelector('.mobile-dirty-text');
  if (text) text.textContent = `当前条件已变化${keyword}`;
}

function setActionButton() {
  if (state.resultMode === MODE_MAJOR) {
    const majorState = globalThis.__GAOKAO_MAJOR_ALL_MODE__?.getState?.() || {};
    const activeDirty = Boolean(majorState.dirty);
    const activeLoading = Boolean(majorState.loading);
    document.body.classList.toggle('is-filter-dirty', activeDirty);
    document.body.classList.toggle('is-workspace-updating', activeLoading);
    document.body.classList.toggle('has-query-results', Boolean(majorState.data));
    syncMobileDirtyBar(null);
    document.dispatchEvent(new CustomEvent('gaokao:major-action-sync'));
    return;
  }
  const g = guard();
  const scoreBlocking = scoreInputHasBlockingError();
  const majorBlocking = majorInputBlocking();
  renderScoreInterpretation();
  const schoolMode = state.resultMode === MODE_SCHOOL;
  const schoolLoading = Boolean(state.schoolAll.loading || state.schoolAll.loadingMore);
  const activeLoading = schoolMode ? schoolLoading : requestState.loading;
  const activeDirty = schoolMode ? Boolean(state.schoolAll.dirty) : Boolean(dirty && g.canQuery);
  syncScoreState(g);
  document.body.classList.toggle('is-filter-dirty', activeDirty);
  document.body.classList.toggle('is-workspace-updating', activeLoading);
  const hasActiveResults = schoolMode ? Boolean(state.schoolAll.data) : Boolean(state.bands.data);
  document.body.classList.toggle('has-query-results', hasActiveResults);
  syncMobileDirtyBar(g);
  const button = document.getElementById('queryButton');
  const guide = document.getElementById('queryGuide');
  if (!button) return;
  if (schoolMode) {
    const selection = state.schoolSelection || {};
    const label = selection.displayName || selection.input || '这所学校';
    button.disabled = Boolean(schoolLoading || !selection.input || scoreBlocking || majorBlocking);
    if (schoolLoading) {
      button.textContent = state.schoolAll.loadingMore ? '正在继续加载…' : '正在读取该校招生专业…';
      button.className = getQueryButtonClass({ loading: true });
      updateGuideNote(guide, g, state.schoolAll.data ? '正在更新，下面暂时保留上一轮学校结果。' : '正在核对学校实体和辽宁2026招生记录。');
      return;
    }
    if (scoreBlocking) {
      button.textContent = '先确认分数';
      button.className = 'query-button is-waiting';
      updateGuideNote(guide, g, state.scoreInterpretation?.message || '请先确认分数。');
      return;
    }
    if (majorBlocking) {
      button.textContent = '先确认专业';
      button.className = 'query-button is-waiting';
      updateGuideNote(guide, g, '专业条件还没有确认；请先从候选中选择规范专业，或移除这次专业输入。');
      return;
    }
    if (!selection.input) {
      button.textContent = '输入学校后查看在辽投档专业';
      button.className = 'query-button is-waiting';
      updateGuideNote(guide, g, '请先输入完整学校名称；参考分数可以不填。');
      return;
    }
    if (state.schoolAll.error && !state.schoolAll.data) {
      button.textContent = '重新读取该校专业';
      button.className = getQueryButtonClass({ error: true });
      updateGuideNote(guide, g, '读取异常，可以检查学校名称或稍后重试。');
      return;
    }
    if (state.schoolAll.data && state.schoolAll.dirty) {
      button.textContent = '按新条件更新学校专业';
      button.className = getQueryButtonClass({ ready: true, primary: true });
      updateGuideNote(guide, g, '条件已变化；下面保留上一轮学校结果，点击后统一更新。');
      return;
    }
    button.textContent = state.schoolAll.data ? `重新查看${label}在辽专业` : `查看${label}在辽2026物理类投档专业`;
    button.className = getQueryButtonClass({ ready: true, primary: true });
    updateGuideNote(guide, g, '参考分数可以不填；填写后只增加位次对照，不会减少该校专业数量。');
    return;
  }
  button.disabled = Boolean(requestState.loading || scoreBlocking || majorBlocking);

  if (scoreBlocking) {
    button.textContent = '先确认分数';
    button.className = 'query-button is-waiting';
    updateGuideNote(guide, g, state.scoreInterpretation?.message || '请先确认分数。');
    return;
  }
  if (majorBlocking) {
    button.textContent = '先确认专业';
    button.className = 'query-button is-waiting';
    updateGuideNote(guide, g, '专业条件还没有确认；请先从候选中选择规范专业，或移除这次专业输入。');
    return;
  }
  if (requestState.loading) {
    button.textContent = state.bands.data ? '正在更新结果…' : '正在查找可讨论专业…';
    button.className = getQueryButtonClass({ loading: true });
    updateGuideNote(guide, g, state.bands.data ? '正在按新条件更新，下面暂时保留上一轮结果。' : '正在查找可讨论专业，请稍候。');
    return;
  }
  if (state.bands.error && !state.bands.data) {
    button.textContent = '重新尝试';
    button.className = getQueryButtonClass({ error: true });
    updateGuideNote(guide, g, '读取异常，可以检查网络或稍后重新尝试。');
    return;
  }
  if (!g.canQuery) {
    button.textContent = g.buttonText;
    button.className = `query-button is-${g.level}`;
    updateGuideNote(guide, g, g.guide);
    return;
  }
  if (!hasQueried) {
    button.textContent = getQueryButtonLabel({ hasQueried, dirty: false, topRange: g.key === 'topRange' });
    button.className = getQueryButtonClass({ ready: true, level: g.level, primary: true });
    updateGuideNote(guide, g, g.guide);
    return;
  }
  if (dirty) {
    button.textContent = '更新结果';
    button.className = getQueryButtonClass({ ready: true, level: g.level, primary: true });
    updateGuideNote(guide, g, '条件已变化；下面保留上一轮结果，确认后再统一更新。');
    return;
  }
  button.textContent = getQueryButtonLabel({ hasQueried, dirty: false, topRange: g.key === 'topRange' });
  button.className = getQueryButtonClass({ ready: true, level: g.level, primary: true });
  updateGuideNote(guide, g, '已按当前条件更新结果，可继续调整后重新查看。');
}

function renderRegionOptions() {
  const select = document.getElementById('region');
  if (!select) return;
  select.innerHTML = REGION_OPTIONS.map(option => `<option value="${option.key}">${option.label}</option>`).join('');
  select.value = state.filters.region;
}

function renderBottomLinePanel() {
  const panel = document.getElementById('bottomLinePanel');
  const summary = document.getElementById('bottomLineSummary');
  if (!panel) return;
  const score = state.candidateScore || parseScoreFromInput();
  const visible = state.resultMode !== MODE_SCHOOL && state.resultMode !== MODE_MAJOR && shouldShowBottomLinePanel(score);
  panel.hidden = !visible;
  panel.classList.toggle('is-visible', visible);
  document.querySelectorAll('[data-bottomline-mode]').forEach(button => {
    const active = button.dataset.bottomlineMode === state.filters.bottomLineMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (summary) {
    summary.textContent = visible
      ? `这个分数段建议先看清学校性质、学费和校区。当前已选择：${bottomLineLabel(state.filters.bottomLineMode)}。`
      : score
        ? '当前分数不在本科线—特控线区间，前端不启用办学性质提醒。'
        : '输入分数后，本科线—特控线区间会显示办学性质提醒。';
  }
}

function renderSpecialProjectPanel() {
  const panel = document.getElementById('specialProjectPanel');
  if (!panel) return;
  const mode = normalizeSpecialProjectMode(state.filters.specialProjectMode);
  const hidden = Number(state.bands?.data?.source?.specialProjectHidden || state.bands?.data?.source?.specialProjectStats?.hidden || 0);
  panel.dataset.mode = mode;
  panel.classList.toggle('is-showing', mode === SPECIAL_PROJECT_SHOW_MODE);
  const status = document.getElementById('specialProjectStatus');
  const help = document.getElementById('specialProjectHelp');
  const toggle = document.getElementById('specialProjectToggle');
  if (status) status.textContent = specialProjectStatusCopy(mode, hidden);
  if (help) help.textContent = specialProjectHelpCopy(mode);
  if (toggle) toggle.textContent = specialProjectToggleLabel(mode);
}

function hasActiveFilters() {
  return Boolean(
    String(state.filters.majorKeyword || '').trim()
    || String(state.filters.schoolKeyword || '').trim()
    || (state.filters.region && state.filters.region !== 'all' && state.filters.region !== '不限')
    || getEffectiveBottomLineMode() !== 'all'
    || normalizeSpecialProjectMode(state.filters.specialProjectMode) === SPECIAL_PROJECT_SHOW_MODE
  );
}

function computeFilterConflicts() {
  const effective = buildEffectiveFilters();
  return buildFilterConflicts({
    keywordQuery: effective.keywordQuery,
    rawKeywordText: state.filters.majorKeyword || '',
    bottomLineMode: effective.bottomLineMode,
    specialProjectMode: effective.specialProjectMode,
    querySignature: currentQuerySignature(),
    confirmedSignatures: readConfirmedConflictSignatures()
  });
}

function renderConflictsOnly() {
  renderFilterConflicts(
    document.getElementById('filterConflictPanel'),
    state.resultMode === MODE_SCHOOL ? [] : computeFilterConflicts()
  );
}

function renderFlowAndConflicts() {
  const flowRoot = document.querySelector('.ln-parent-compact-stepper');
  if (state.resultMode === MODE_SCHOOL) {
    const hasSchool = Boolean(state.schoolSelection?.input || schoolInputValue());
    const hasResult = Boolean(state.schoolAll.data);
    const selectionCount = selectionPool.items?.()?.length || 0;
    let resolved;
    if (state.schoolAll.error && !hasResult) {
      resolved = {
        current: hasSchool ? 'filter' : 'input',
        completed: hasSchool ? ['input'] : [],
        status: 'failed',
        note: '学校专业暂时没有读取成功，请核对学校名称后重新尝试。'
      };
    } else if (state.schoolAll.loading || state.schoolAll.loadingMore) {
      resolved = {
        current: 'filter',
        completed: hasSchool ? ['input'] : [],
        status: 'loading',
        note: '正在核对学校实体，并读取辽宁2026物理类招生记录。'
      };
    } else if (hasResult && state.schoolAll.dirty) {
      resolved = {
        current: 'filter',
        completed: ['input'],
        status: 'stale',
        note: '学校、专业方向或参考分数已变化，请更新后再继续取舍。'
      };
    } else if (hasResult && selectionCount > 0) {
      resolved = {
        current: 'select',
        completed: ['input', 'filter'],
        status: 'active',
        note: `同一已选清单已有 ${selectionCount} 个专业，可继续比较后和孩子逐项讨论。`
      };
    } else if (hasResult) {
      resolved = {
        current: 'select',
        completed: ['input', 'filter'],
        status: 'active',
        note: '普通招生与特殊项目已分开；把孩子愿意读、家庭能承担的专业加入已选。'
      };
    } else if (hasSchool) {
      resolved = {
        current: 'filter',
        completed: ['input'],
        status: 'active',
        note: '可以不填参考分数；填写专业方向时，多个词按“任意一个”匹配。'
      };
    } else {
      resolved = {
        current: 'input',
        completed: [],
        status: 'active',
        note: '先输入完整学校名称，避免把本部、分校和校区混在一起。'
      };
    }
    renderMainFlowStepper(flowRoot, resolved, SCHOOL_FLOW_STEPS);
    renderFilterConflicts(document.getElementById('filterConflictPanel'), []);
    return;
  }
  const conflicts = computeFilterConflicts();
  const freshness = currentResultFreshness();
  const selectionCount = selectionPool.items?.()?.length || 0;
  const reportFreshness = selectionCount > 0 ? readReportFreshness(state.bands?.resultSignature || currentQuerySignature()) : 'none';
  const workflow = resolveHumanWorkflowState({
    hasValidScore: Boolean(state.candidateScore),
    hasFilters: hasActiveFilters(),
    hasFreshResults: freshness === 'fresh',
    resultFreshness: freshness,
    selectionCount,
    reportFreshness,
    blockingConflicts: conflicts,
    errorState: { active: Boolean(state.bands?.error || requestState.updateError) }
  });
  const resolved = resolveMainFlowStep({
    hasValidScore: Boolean(state.candidateScore),
    hasFilters: hasActiveFilters(),
    hasFreshResults: freshness === 'fresh',
    hasStaleResults: freshness === 'stale',
    resultFreshness: freshness,
    selectionCount,
    hasBlockingConflicts: Boolean(conflicts.length),
    reportFreshness,
    reportActive: Boolean(state.feishu?.loading || state.feishu?.url),
    reportFailed: Boolean(state.feishu?.error),
    errorActive: Boolean(state.bands?.error || requestState.updateError)
  });
  resolved.note = workflow.note || resolved.note;
  renderMainFlowStepper(flowRoot, resolved);
  renderFilterConflicts(document.getElementById('filterConflictPanel'), conflicts);
}

function resultOptions() {
  return {
    onMore: band => {
      const group = state.bands.data?.bands?.[band];
      const visible = state.visible[band] || 16;
      const loaded = Array.isArray(group?.records) ? group.records.length : 0;
      if (visible < loaded) {
        state.visible[band] = Math.min(loaded, visible + 16);
        scheduleWorkspaceCommit('show-more-loaded', true);
        return;
      }
      loadMoreBand(band);
    },
    selectionPool,
    // The selection adapter owns the single semantic change callback.
    // The legacy renderer still invokes this hook after add; keep it inert to avoid duplicate commits.
    onSelectionChange: () => {}
  };
}

function handleBandSelection(band, source = 'band-switcher') {
  if (!band || state.activeBand === band) return;
  diagnostics.intents += 1;
  markWorkspaceIntent();
  setBandFocus(state, band);
  state.resultViewMode = 'all';
  scheduleWorkspaceCommit(source, true);
}

function renderResultRegion(reason, preserveScroll) {
  syncRangeState(state);
  renderResultBandSwitcher(state, band => handleBandSelection(band, 'result-band-switcher'));
  commitMajorResults({
    renderMajorResults,
    state,
    options: resultOptions(),
    dirty,
    requestLoading: requestState.loading,
    updateError: requestState.updateError,
    committedSummary,
    reason,
    preserveScroll
  });
  renderFeishuReport(state);
}

function renderDraftChrome(reason) {
  syncRangeState(state);
  syncControlConsoleState(state);
  syncSearchIntentUi();
  renderScoreInterpretation();
  renderBottomLinePanel();
  renderFilterSummary();
  renderSpecialProjectPanel();
  renderSearchTrendHint(document.getElementById('majorTrendHint'), {
    score: state.candidateScore,
    keyword: state.filters.majorKeyword
  });
  directionExplorerController?.renderEntry?.();
  renderConflictsOnly();
  setActionButton();
  updateResultWorkspaceStatus({
    dirty,
    requestLoading: requestState.loading,
    updateError: requestState.updateError,
    committedSummary,
    reason
  });
}

function isResultOnlyReason(reason) {
  return /band-switcher|legend-band|show-more-loaded|load-more/.test(reason);
}

function shouldKeepRenderedResult(reason) {
  if (!state.bands?.data) return false;
  if (isResultOnlyReason(reason)) return false;
  if (reason.includes('query-finish') && !requestState.updateError) return false;
  return /changed|score_|score-|conflict|query-start|query-blocked|keyword|range|bottomline|special|region|preset/.test(reason)
    || Boolean(requestState.updateError);
}

function renderWorkspace(reason = 'render', preserveScroll = false) {
  diagnostics.commits += 1;

  if (state.resultMode === MODE_MAJOR) {
    syncSearchIntentUi();
    renderBottomLinePanel();
    renderFilterSummary();
    setActionButton();
    emitWorkspaceState(reason);
    log('major-mode shared commit', diagnostics.commits, reason);
    return;
  }

  if (state.resultMode === MODE_SCHOOL) {
    syncRangeState(state);
    syncControlConsoleState(state);
    syncSearchIntentUi();
    refreshSelectionPool(state);
    renderBottomLinePanel();
    renderFilterSummary();
    renderSpecialProjectPanel();
    directionExplorerController?.renderEntry?.();
    renderFlowAndConflicts();
    setActionButton();
    emitWorkspaceState(reason);
    log('school-mode shared commit', diagnostics.commits, reason);
    return;
  }

  if (isResultOnlyReason(reason)) {
    renderResultRegion(reason, preserveScroll);
    emitWorkspaceState(reason);
    log('result-only commit', diagnostics.commits, reason);
    return;
  }

  if (shouldKeepRenderedResult(reason)) {
    renderDraftChrome(reason);
    emitWorkspaceState(reason);
    log('draft commit', diagnostics.commits, reason, { dirty, requestState: { ...requestState } });
    return;
  }

  syncRangeState(state);
  syncControlConsoleState(state);
  syncSearchIntentUi();
  renderBandLegend(state);
  renderResultRegion(reason, preserveScroll);
  refreshSelectionPool(state);
  renderBottomLinePanel();
  renderFilterSummary();
  renderSpecialProjectPanel();
  renderSearchTrendHint(document.getElementById('majorTrendHint'), {
    score: state.candidateScore,
    keyword: state.filters.majorKeyword
  });
  directionExplorerController?.renderEntry?.();
  renderFlowAndConflicts();
  setActionButton();
  emitWorkspaceState(reason);
  log('full commit', diagnostics.commits, reason, { dirty, requestState: { ...requestState } });
}

function scheduleWorkspaceCommit(reason = 'state-change', preserveScroll = false) {
  pendingReasons.add(reason);
  pendingPreserveScroll ||= preserveScroll;
  if (pendingCommit) return;
  pendingCommit = true;
  requestAnimationFrame(() => {
    pendingCommit = false;
    const reasons = [...pendingReasons];
    pendingReasons.clear();
    const preserve = pendingPreserveScroll;
    pendingPreserveScroll = false;
    renderWorkspace(reasons.join('+') || reason, preserve);
  });
}

function markDirty(reason = 'filter_changed') {
  diagnostics.intents += 1;
  dirty = Boolean(state.bands?.data || hasQueried);
  requestState.updateError = '';
  clearFlowAction('report');
  expireReport(reason);
  clearConfirmedConflictsForNewQuery();
  const g = guard();
  if (!g.canQuery && !state.bands.data) {
    setMessageFromGuard(g);
    setReadyStatus(g.level === 'warn' ? 'loading' : 'ready', g.statusText);
  } else {
    setReadyStatus('ready', g.key === 'topRange' ? '高分段' : '条件已变化');
  }
  scheduleWorkspaceCommit(reason, true);
}

function markSchoolDirty(reason = 'school_filter_changed') {
  state.schoolAll.dirty = Boolean(state.schoolAll.data);
  state.schoolAll.error = null;
  scheduleWorkspaceCommit(reason, true);
}

function markSharedInputDirty(reason = 'shared_filter_changed') {
  markDirty(reason);
  markSchoolDirty(reason);
  if (state.resultMode === MODE_SCHOOL) setReadyStatus('ready', '学校条件已变化');
  updateSearchUrl();
}

function submitActiveSearch() {
  if (majorInputBlocking()) {
    setActionButton();
    document.getElementById('majorKeyword')?.focus();
    return;
  }
  if (state.resultMode === MODE_MAJOR) {
    updateSearchUrl();
    document.dispatchEvent(new CustomEvent('gaokao:major-search-submit'));
    return;
  }
  if (state.resultMode === MODE_SCHOOL) {
    const selection = resolveSchoolSelectionFromInput();
    syncSearchIntentUi();
    updateSearchUrl();
    if (!selection.input) {
      setActionButton();
      document.getElementById('schoolKeyword')?.focus();
      return;
    }
    if (!selection.entityId) {
      state.schoolSelection.status = 'needs-confirmation';
      syncSearchIntentUi();
      document.dispatchEvent(new CustomEvent('gaokao:school-search-needs-confirmation', {
        detail: Object.freeze({
          school: selection.input,
          entityId: ''
        })
      }));
      return;
    }
    document.dispatchEvent(new CustomEvent('gaokao:school-search-submit', {
      detail: Object.freeze({
        school: selection.displayName || selection.input,
        entityId: selection.entityId || ''
      })
    }));
    return;
  }
  loadData();
}

async function loadMoreBand(band) {
  const data = state.bands.data;
  const group = data?.bands?.[band];
  const page = group?.pagination || {};
  if (!group || !page.hasMore || state.bands.loadingMoreBand || !committedQuery) return;
  const signature = state.bands.resultSignature || '';
  const offset = Number.isFinite(Number(page.nextOffset)) ? Number(page.nextOffset) : (group.records || []).length;
  state.bands.loadingMoreBand = band;
  state.bands.moreError = '';
  scheduleWorkspaceCommit('load-more-start', true);
  try {
    const raw = await fetchMajorBands({
      candidateScore: committedQuery.score,
      rangePreset: committedQuery.rangePreset,
      filters: committedQuery.filters,
      page: { band, offset, limit: RESULT_PAGE_SIZE }
    });
    if (signature !== state.bands.resultSignature) return;
    const normalized = normalizeMajorBandsResponse(raw, {
      candidateScore: committedQuery.score,
      rangePreset: committedQuery.rangePreset
    });
    const incoming = normalized?.bands?.[band];
    if (!incoming) throw new Error('下一批专业数据格式不完整。');
    const records = mergeBandRecords(group.records, incoming.records);
    group.records = records;
    group.count = incoming.count;
    group.displayedCount = records.length;
    group.truncated = Boolean(incoming.pagination?.hasMore);
    group.pagination = { ...(incoming.pagination || {}), loadedCount: records.length };
  } catch (error) {
    state.bands.moreError = formatApiErrorForHuman(error, '下一批专业暂时没有读取成功，可以稍后再试。');
  } finally {
    state.bands.loadingMoreBand = '';
    scheduleWorkspaceCommit('load-more-finish', true);
  }
}

async function loadData() {
  const g = guard();
  if (!g.canQuery) {
    setMessageFromGuard(g);
    setReadyStatus(g.level === 'warn' ? 'loading' : 'ready', g.statusText);
    scheduleWorkspaceCommit('query-blocked', true);
    if (g.key === 'empty') scoreInput()?.focus();
    return;
  }

  const snapshot = querySnapshotFromDraft();
  const submittedSignature = signatureForSnapshot(snapshot);
  const hadPreviousResult = Boolean(state.bands.data);
  requestSequence += 1;
  requestState.requestId = requestSequence;
  requestState.loading = true;
  requestState.updateError = '';
  diagnostics.requests += 1;
  activeController?.abort?.();
  activeController = new AbortController();
  const requestId = requestSequence;
  const scrollIntent = beginQueryScrollIntent({ allowAutoScroll: !hadPreviousResult });

  if (!hadPreviousResult) resetVisible();
  state.bands.loading = !hadPreviousResult;
  state.bands.loadingMoreBand = '';
  state.bands.moreError = '';
  state.bands.error = null;
  state.bands.message = '';
  state.bands.noticeClass = '';
  setReadyStatus('loading', hadPreviousResult ? '正在更新' : '正在查询');
  scheduleWorkspaceCommit('query-start', false);

  try {
    const raw = await fetchMajorBands({
      candidateScore: snapshot.score,
      rangePreset: snapshot.rangePreset,
      filters: snapshot.filters,
      page: { limit: RESULT_PAGE_SIZE },
      signal: activeController.signal
    });
    if (requestId !== requestSequence) return;
    const normalized = normalizeMajorBandsResponse(raw, {
      candidateScore: snapshot.score,
      rangePreset: snapshot.rangePreset
    });
    state.bands.data = normalized;
    try {
      const rankMeta = normalized?.meta || {};
      const values = {
        'lnRank.selectionPool.candidateRank2026': rankMeta.candidateReferenceRank2026,
        'lnRank.selectionPool.candidateRankStart2026': rankMeta.candidateReferenceRankStart2026,
        'lnRank.selectionPool.candidateRankEnd2026': rankMeta.candidateReferenceRankEnd2026,
        'lnRank.selectionPool.candidateSameCount2026': rankMeta.candidateSameCount2026,
        'lnRank.selectionPool.candidateRankLabel2026': rankMeta.candidateRankLabel
      };
      Object.entries(values).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') localStorage.setItem(key, String(value));
        else localStorage.removeItem(key);
      });
    } catch {}

    committedQuery = snapshot;
    committedSummary = summaryForSnapshot(snapshot);
    state.bands.querySignature = submittedSignature;
    state.bands.resultSignature = submittedSignature;
    state.bands.stale = false;
    state.bands.staleReason = '';
    resetVisible();
    saveSuccessfulQuerySignature(submittedSignature);
    hasQueried = true;
    dirty = currentQuerySignature() !== submittedSignature;
    clearFeishuReport();
    clearFlowAction('report');
    setReadyStatus('ready', g.key === 'topRange' ? '高分段完成' : '查询完成');
    document.dispatchEvent(new CustomEvent('lnrank-query-completed', {
      detail: { signature: submittedSignature, dirtyAfterCommit: dirty }
    }));
  } catch (error) {
    if (error?.name === 'AbortError' || requestId !== requestSequence) return;
    const message = formatApiErrorForHuman(error, '专业数据暂时没有读取成功。可以稍后重试。');
    if (hadPreviousResult) {
      requestState.updateError = message;
      dirty = true;
    } else {
      state.bands.error = message;
      state.bands.data = null;
      state.bands.querySignature = '';
      state.bands.resultSignature = '';
      setReadyStatus('error', '查询异常');
    }
  } finally {
    if (requestId !== requestSequence) return;
    requestState.loading = false;
    state.bands.loading = false;
    scheduleWorkspaceCommit('query-finish', false);
    requestAnimationFrame(() => {
      finishQueryScrollIntent(scrollIntent, document.querySelector('#resultsPanel .results-head'));
    });
  }
}

function handleFilterConflictAction(action, target, signature = '') {
  if (action === 'switch_bottomline' && target) {
    saveBottomLineMode(target);
    markDirty('bottomline_changed');
    return true;
  }
  if (action === 'switch_special_project' && target) {
    saveSpecialProjectMode(target);
    markDirty('special_project_changed');
    return true;
  }
  if (action === 'remove_keyword_group' && target) {
    const next = removeKeywordGroup(state.filters.majorKeyword || '', target);
    state.filters.majorKeyword = next;
    const input = document.getElementById('majorKeyword');
    if (input) input.value = next;
    markDirty('keyword_group_removed');
    return true;
  }
  if (action === 'keep_current') {
    if (signature) confirmFilterConflict(signature);
    else {
      const match = computeFilterConflicts().find(item => (item.actions || []).some(actionItem => actionItem.type === 'keep_current'));
      if (match?.signature) confirmFilterConflict(match.signature);
    }
    scheduleWorkspaceCommit('conflict-confirmed', true);
    return true;
  }
  return false;
}

function appendMajorKeyword(word) {
  const input = document.getElementById('majorKeyword');
  if (!input || !word) return;
  const current = String(input.value || '').trim();
  const parts = current.split(/[,\s，、/；;|]+/).map(item => item.trim()).filter(Boolean);
  if (!parts.includes(word)) input.value = current ? `${current}/${word}` : word;
  state.filters.majorKeyword = input.value;
  markSharedInputDirty('preset_keyword_added');
}

function setMajorKeywordFromDirectionExplorer(value) {
  const input = document.getElementById('majorKeyword');
  if (!input) return;
  input.value = value || '';
  state.filters.majorKeyword = input.value;
}

function removeDirectionExplorerKeywords(applied = {}) {
  const input = document.getElementById('majorKeyword');
  if (!input) return;
  const source = Array.isArray(applied.addedKeywords) ? applied.addedKeywords : (applied.keywords || []);
  const remove = new Set(source.map(value => String(value || '').trim()).filter(Boolean));
  if (!remove.size) return;
  const current = String(input.value || '').split(/[,\s，、/；;|]+/).map(value => value.trim()).filter(Boolean);
  input.value = current.filter(word => !remove.has(word)).join('/');
  state.filters.majorKeyword = input.value;
}

function initDirectionExplorerBridge() {
  directionExplorerController = initDirectionExplorer({
    entryMount: document.getElementById('directionExplorerEntryMount'),
    panelMount: document.getElementById('directionExplorerPanelMount'),
    getMajorKeyword: () => state.filters.majorKeyword || document.getElementById('majorKeyword')?.value || '',
    setMajorKeyword: setMajorKeywordFromDirectionExplorer,
    onApplied: () => markSharedInputDirty('direction_keywords_changed'),
    onCleared: applied => {
      removeDirectionExplorerKeywords(applied || {});
      markSharedInputDirty('direction_keywords_cleared');
    }
  });
  if (location.hash === '#direction-explorer') {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = document.getElementById('direction-explorer');
      if (target) scrollToExplicitTarget(target);
      directionExplorerController?.highlightEntry?.();
    }));
  }
}

function bind() {
  const input = scoreInput();
  parseScoreFromInput();
  lastNormalizedScore = state.candidateScore;
  lastScoreDraft = input?.value?.trim() || '';

  const onScoreInput = () => {
    const before = lastScoreDraft;
    parseScoreFromInput();
    const after = input?.value?.trim() || '';
    lastScoreDraft = after;
    lastNormalizedScore = state.candidateScore;
    if (before === after) return;
    markSharedInputDirty('score_changed');
  };

  input?.addEventListener('input', onScoreInput);
  input?.addEventListener('compositionend', onScoreInput);
  input?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitActiveSearch();
    }
  });

  window.addEventListener('lnrank:band-focus-request', event => {
    handleBandSelection(event?.detail?.band, 'legend-band-switcher');
  });

  document.getElementById('rangeButtons')?.addEventListener('click', event => {
    const button = event.target.closest('[data-preset]');
    if (!button) return;
    setRangePreset(state, button.dataset.preset, { resetBand: !state.bands?.data });
    markDirty('range_changed');
  });

  document.getElementById('bottomLinePanel')?.addEventListener('click', event => {
    const button = event.target.closest('[data-bottomline-mode]');
    if (!button) return;
    const next = normalizeBottomLineMode(button.dataset.bottomlineMode);
    if (next === state.filters.bottomLineMode) return;
    saveBottomLineMode(next);
    markDirty('bottomline_changed');
  });

  document.getElementById('specialProjectToggle')?.addEventListener('click', event => {
    event.preventDefault();
    const current = normalizeSpecialProjectMode(state.filters.specialProjectMode);
    saveSpecialProjectMode(current === SPECIAL_PROJECT_SHOW_MODE ? SPECIAL_PROJECT_HIDE_MODE : SPECIAL_PROJECT_SHOW_MODE);
    markDirty('special_project_changed');
  });

  initRankBandLegend();

  document.getElementById('region')?.addEventListener('change', event => {
    if (state.filters.region === event.target.value) return;
    state.filters.region = event.target.value;
    markDirty('region_changed');
  });

  document.getElementById('schoolKeyword')?.addEventListener('input', event => {
    if (state.filters.schoolKeyword === event.target.value) return;
    state.filters.schoolKeyword = event.target.value;
    resolveSchoolSelectionFromInput();
    markSharedInputDirty('school_keyword_changed');
  });

  document.getElementById('majorKeyword')?.addEventListener('input', event => {
    if (state.filters.majorKeyword === event.target.value) return;
    state.filters.majorKeyword = event.target.value;
    markSharedInputDirty('major_keyword_changed');
  });

  document.getElementById('schoolKeyword')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitActiveSearch();
    }
  });

  document.getElementById('majorKeyword')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitActiveSearch();
    }
  });

  mountKeywordPresetPanel(document.getElementById('keywordPresetMount'), { onKeyword: appendMajorKeyword });

  document.getElementById('filterConflictPanel')?.addEventListener('click', event => {
    const button = event.target.closest('[data-filter-conflict-action]');
    if (!button) return;
    event.preventDefault();
    handleFilterConflictAction(
      button.dataset.filterConflictAction,
      button.dataset.target,
      button.dataset.conflictSignature
    );
  });

  document.getElementById('queryButton')?.addEventListener('click', event => {
    event.preventDefault();
    submitActiveSearch();
  });

  document.addEventListener('gaokao:major-input-state', () => {
    renderFilterSummary();
    setActionButton();
  });

  document.getElementById('mobileDirtyButton')?.addEventListener('click', event => {
    event.preventDefault();
    submitActiveSearch();
  });

  document.getElementById('schoolViewModeMount')?.addEventListener('click', event => {
    const button = event.target.closest('[data-school-view-mode]');
    if (!button) return;
    event.preventDefault();
    setResultMode(button.dataset.schoolViewMode);
  });

  document.getElementById('schoolAllBack')?.addEventListener('click', event => {
    event.preventDefault();
    setResultMode(MODE_SCORE);
  });

  document.addEventListener('gaokao:major-filter-restored', () => {
    syncSearchIntentUi();
    renderFilterSummary();
    setActionButton();
  });

  document.addEventListener('gaokao:school-search-state', event => {
    updateSearchUrl();
    scheduleWorkspaceCommit(`school-${event.detail?.reason || 'state'}`, true);
  });

  document.addEventListener('gaokao:school-candidate-selected', event => {
    const detail = event.detail || {};
    const entityId = String(detail.entityId || '').trim();
    if (entityId) {
      const displayName = String(detail.school || schoolInputValue()).trim();
      state.schoolSelection = {
        status: 'resolved',
        input: displayName,
        entityId,
        displayName,
        entityType: String(detail.entityType || ''),
        parentEntityId: String(detail.parentEntityId || '')
      };
      state.filters.schoolKeyword = displayName;
      state.filters.schoolEntityId = entityId;
    } else {
      resolveSchoolSelectionFromInput();
    }
    syncSearchIntentUi();
    updateSearchUrl();
    scheduleWorkspaceCommit('school-candidate-selected', true);
  });

  document.addEventListener('gaokao:view-school-all', event => {
    const school = String(event.detail?.school || '').trim();
    if (!school) return;
    const schoolInput = document.getElementById('schoolKeyword');
    if (schoolInput) schoolInput.value = school;
    state.filters.schoolKeyword = school;
    state.schoolSelection = {
      status: event.detail?.entityId ? 'resolved' : 'input',
      input: school,
      entityId: String(event.detail?.entityId || ''),
      displayName: school,
      entityType: String(event.detail?.entityType || ''),
      parentEntityId: String(event.detail?.parentEntityId || '')
    };
    state.filters.schoolEntityId = state.schoolSelection.entityId;
    markDirty('school_handoff_changed');
    state.schoolAll.dirty = Boolean(state.schoolAll.data);
    setResultMode(MODE_SCHOOL);
    submitActiveSearch();
  });

  window.addEventListener('popstate', () => {
    restoreSearchIntentFromUrl();
    parseScoreFromInput();
    lastNormalizedScore = state.candidateScore;
    syncSearchIntentUi();
    scheduleWorkspaceCommit('history-restored', true);
    document.dispatchEvent(new CustomEvent('gaokao:result-mode-change', {
      detail: { mode: state.resultMode }
    }));
    if (state.resultMode === MODE_SCHOOL) document.dispatchEvent(new CustomEvent('gaokao:school-result-render'));
  });

  window.addEventListener('storage', () => {
    refreshSelectionPool(state);
    emitWorkspaceState('storage');
  });

}

let mounted = false;
let resolveWorkspaceReady;
let rejectWorkspaceReady;

export const selectionWorkspaceReady = new Promise((resolve, reject) => {
  resolveWorkspaceReady = resolve;
  rejectWorkspaceReady = reject;
});

export function mountSelectionWorkspace() {
  if (mounted) return globalThis.__GAOKAO_SELECTION_WORKSPACE__;
  mounted = true;
  renderRegionOptions();
  restoreSearchIntentFromUrl();
  renderBottomLinePanel();
  initFeishuReport(state);
  initSelectionPool(state, {
    onChanged: () => {
      refreshSelectionPool(state);
      renderFeishuReport(state);
      renderFlowAndConflicts();
      setActionButton();
    }
  });
  setReadyStatus('ready', '历史参考数据已加载');
  initDirectionExplorerBridge();
  bind();
  bindResultCommitBridge(document.getElementById('results'));
  setMessageFromGuard(guard());
  renderWorkspace('initial', false);
  globalThis.__GAOKAO_SELECTION_WORKSPACE__ = Object.freeze({
    version: 'selection-workspace-orchestration-v3969_2',
    getState: () => ({
      dirty,
      committedQuery,
      committedSummary,
      requestState: { ...requestState },
      activeBand: state.activeBand,
      diagnostics: { ...diagnostics }
    }),
    submit: submitActiveSearch,
    selectBand: handleBandSelection
  });
  resolveWorkspaceReady(globalThis.__GAOKAO_SELECTION_WORKSPACE__);
  log('mounted');
  return globalThis.__GAOKAO_SELECTION_WORKSPACE__;
}

function mountSelectionWorkspaceSafely() {
  try {
    mountSelectionWorkspace();
  } catch (error) {
    mounted = false;
    rejectWorkspaceReady(error);
    throw error;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountSelectionWorkspaceSafely, { once: true });
} else {
  mountSelectionWorkspaceSafely();
}
