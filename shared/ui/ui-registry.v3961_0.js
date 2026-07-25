export const UI_ORCHESTRATION_VERSION = 'v3961_0';

export const UI_PAGE_REGISTRY = Object.freeze({
  home: Object.freeze({ route: '/', label: '家庭首页', density: 'reading', role: 'primary' }),
  selection: Object.freeze({ route: '/ln-rank/', label: '专业初选', density: 'workspace', role: 'primary' }),
  selected: Object.freeze({ route: '/ln-rank/selection-pool.html#selected-list', label: '已选专业', density: 'workspace', role: 'primary' }),
  review: Object.freeze({ route: '/ln-rank/selection-pool.html#family-review', label: '家庭复核', density: 'workspace', role: 'primary' }),
  difficulty: Object.freeze({ route: '/ln2026.html', label: '难度变化', density: 'reading', role: 'evidence' }),
  structure: Object.freeze({ route: '/zy2026/', label: '招生变化', density: 'workspace', role: 'evidence' }),
  tongxue: Object.freeze({ route: '/tongxue/', label: '同学你好', density: 'reading', role: 'evidence', brand: 'tongxue' })
});

export const UI_RESOURCE_REGISTRY = Object.freeze({
  foundation: '/shared/ui/tokens/foundation.v3959_0.css',
  semantic: '/shared/ui/tokens/semantic.v3959_0.css',
  modeSwitch: '/shared/ui/components/mode-switch.v3962_2.css',
  shellCss: '/shared/ui/shell/family-shell.v3960_0.css',
  shellJs: '/shared/ui/shell/family-shell.v3961_0.js',
  workspaceCss: '/ln-rank/css/selection-workspace.v3961_0.css',
  workspaceJs: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3961_0.js',
  viewportOrchestrator: '/ln-rank/js/workspace/viewport-orchestrator.v3961_0.js',
  resultCommit: '/ln-rank/js/workspace/result-commit.v3961_0.js',
  actionContract: '/shared/ui/contracts/action-contract.v3959_0.js',
  stateContract: '/shared/ui/contracts/state-contract.v3959_0.js',
  copyContract: '/shared/ui/contracts/copy-contract.v3959_0.js'
});

export const UI_ACTION_PRIORITY = Object.freeze({
  normal: 'navigation',
  filterDirty: 'update-results',
  loading: 'progress',
  keyboardOpen: 'hidden',
  error: 'retry'
});

export const SELECTION_WORKSPACE_CONTRACT = Object.freeze({
  version: 'selection-workspace-orchestration-v3961',
  filterChangeQueriesImmediately: false,
  preservePreviousResultsWhileDirty: true,
  bandSwitchIsViewOnly: true,
  compareLayoutOwner: 'result-commit',
  cardPresentationMode: 'synchronous-first-commit',
  scrollOwner: 'scroll-policy',
  viewportOwner: 'viewport-orchestrator',
  resultStructuralObserverAllowed: false,
  singleSemanticSelectionEvent: true,
  schoolModeMountOwner: 'static-selection-filter-grid',
  schoolModeControlOwner: 'shared-ui-mode-switch'
});

export function getUiPage(key) {
  return UI_PAGE_REGISTRY[key] || UI_PAGE_REGISTRY.home;
}
