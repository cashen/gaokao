export const UI_ORCHESTRATION_VERSION = 'v3970_0';

export const UI_PAGE_REGISTRY = Object.freeze({
  home: Object.freeze({ route: '/', label: '家庭首页', density: 'reading', role: 'primary' }),
  selection: Object.freeze({ route: '/ln-rank/', label: '专业初选', density: 'workspace', role: 'primary' }),
  selected: Object.freeze({ route: '/ln-rank/selection-pool.html#selected-list', label: '家庭方案', density: 'workspace', role: 'primary' }),
  review: Object.freeze({ route: '/ln-rank/selection-pool.html#family-review', label: '家庭复核', density: 'workspace', role: 'primary' }),
  difficulty: Object.freeze({ route: '/ln2026.html', label: '难度变化', density: 'reading', role: 'evidence' }),
  background: Object.freeze({ route: '/ln-rank/local-mainline.html', label: '院校背景', density: 'workspace', role: 'evidence' }),
  structure: Object.freeze({ route: '/zy2026/', label: '招生变化', density: 'workspace', role: 'evidence' }),
  tongxue: Object.freeze({ route: '/tongxue/', label: '同学你好', density: 'reading', role: 'evidence', brand: 'tongxue' })
});

export const UI_RESOURCE_REGISTRY = Object.freeze({
  foundation: '/shared/ui/tokens/foundation.v3959_0.css',
  semantic: '/shared/ui/tokens/semantic.v3959_0.css',
  modeSwitch: '/shared/ui/components/mode-switch.v3963_0.css',
  shellCss: '/shared/ui/shell/family-shell.v3970_0.css',
  shellJs: '/shared/ui/shell/family-shell.v3970_0.js',
  familyPlanEntryCss: '/shared/ui/components/family-plan-entry.v3970_0.css',
  familyPlanEntryJs: '/shared/ui/components/family-plan-entry.v3970_0.js',
  workspaceCss: '/ln-rank/css/ln-rank-workspace.v3967_0.css',
  workspaceJs: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3969_0.js',
  runtimeBootstrap: '/ln-rank/js/app.v3970_0.js',
  runtimeContract: '/shared/resources/release/runtime-cache-contract.v3970_0.js',
  reportFrontend: '/ln-rank/js/feature/feishu/index.v3967_0.js',
  tongxueRuntime: '/tongxue/app/tongxue-runtime-v159-r3968.js',
  viewportOrchestrator: '/ln-rank/js/workspace/viewport-orchestrator.v3961_0.js',
  resultCommit: '/ln-rank/js/workspace/result-commit.v3967_0.js',
  actionContract: '/shared/ui/contracts/action-contract.v3970_0.js',
  stateContract: '/shared/ui/contracts/state-contract.v3970_0.js',
  copyContract: '/shared/ui/contracts/copy-contract.v3970_0.js',
  componentRegistry: '/shared/ui/component-registry.v3970_0.js'
});

export const UI_ACTION_PRIORITY = Object.freeze({
  normal: 'navigation',
  filterDirty: 'update-results',
  loading: 'progress',
  keyboardOpen: 'hidden',
  error: 'retry'
});

export const SELECTION_WORKSPACE_CONTRACT = Object.freeze({
  version: 'selection-workspace-orchestration-v3970_0',
  filterChangeQueriesImmediately: false,
  preservePreviousResultsWhileDirty: true,
  bandSwitchIsViewOnly: true,
  compareLayoutOwner: 'result-commit',
  cardPresentationMode: 'synchronous-first-commit',
  scrollOwner: 'scroll-policy',
  viewportOwner: 'viewport-orchestrator',
  resultStructuralObserverAllowed: false,
  singleSemanticSelectionEvent: true,
  schoolModeMountOwner: 'static-selection-console',
  schoolModeControlOwner: 'shared-ui-mode-switch',
  searchIntentStructureOwner: 'ln-rank-index',
  searchIntentStateOwner: 'selection-workspace-orchestrator',
  sharedSubmitOwner: 'selection-workspace-orchestrator',
  schoolResultOwner: 'school-all-mode',
  schoolKeywordMode: 'any',
  scoreSchoolSelectionPoolShared: true,
  runtimeControlOwner: 'ln-rank-runtime-bootstrap',
  runtimeFailureStructureOwner: 'ln-rank-index',
  changedInterfaceCachePolicy: 'new-immutable-url',
  globalHeaderStructureOwner: 'static-page-mount',
  globalHeaderStateOwner: 'shared-family-shell',
  familyPlanEntryOwner: 'shared-family-plan-entry',
  familyPlanEntryVariants: Object.freeze(['header-compact', 'results-footer']),
  fixedMobileFamilyPlanActionAllowed: false,
  floatingFamilyPlanActionAllowed: false,
  mobileActionNeverSubmitsSearch: true,
  resultCardDisclosureOwner: 'major-pool-render',
  reportHistoryPlacement: 'appendix-only',
  reportFeedbackOwner: 'feishu-report-controller-v3967_0',
  reportCopyUsesEventObjectAfterAwait: false,
  tongxueStateOwner: 'tongxue-runtime-v159',
  tongxueResultObserverAllowed: false,
  tongxueCopyObserverAllowed: false,
  tongxueRegionOwner: 'tongxue-runtime-v159'
});

export function getUiPage(key) {
  return UI_PAGE_REGISTRY[key] || UI_PAGE_REGISTRY.home;
}
