import { LIAONING_PHYSICS_EXAM_CONFIG } from '../exam/liaoning-physics.js';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;

export const CURRENT_RELEASE = Object.freeze({
  display: 'v3.9.64.0',
  version: 'v3.9.64.0',
  asset: '3964_0',
  assetVersion: 'v3964_0',
  release: 'v3.9.64.0-human-task-ui-governance-no-fenxi',
  releaseName: 'v3.9.64.0-human-task-ui-governance-no-fenxi',
  label: 'human-task-ui-governance-no-fenxi',
  dataYear: EXAM.dataYear,
  audienceYear: EXAM.audienceYear,
  rankTableYear: EXAM.rankYear,
  region: EXAM.region,
  subject: EXAM.subject,
  noFenxiIncluded: true,
  resourceOwnershipVersion: 'resource-ownership-v3958',
  uiOrchestrationVersion: 'ui-orchestration-v3964_0',
  algorithmOrchestrationVersion: 'algorithm-orchestration-v3963',
  selectionWorkspaceVersion: 'selection-workspace-orchestration-v3964_0',
  searchIntentVersion: 'score-school-search-v3964_0',
  schoolAllModeVersion: 'school-all-mode-v3964_0',
  schoolUiGovernanceVersion: 'school-ui-governance-v3964_0',
  schoolModeMountVersion: 'school-mode-static-mount-v3964_0',
  runtimeCacheVersion: 'runtime-cache-coherence-v3964_0',
  resourceOwners: Object.freeze({
    release: '/shared/resources/release/current-release.js',
    exam: '/shared/resources/exam/liaoning-physics.js',
    regions: '/shared/resources/geo/china-region-catalog.js',
    schools: '/shared/resources/schools/school-profile-center.js',
    schoolIdentity: '/shared/resources/schools/school-identity-center.js',
    majors: '/shared/resources/majors/major-catalog-contract.js',
    reports: '/shared/resources/reports/feishu-report-contract.v3964_0.js',
    ui: '/shared/ui/ui-registry.v3964_0.js',
    uiActions: '/shared/ui/contracts/action-contract.v3959_0.js',
    uiSemantic: '/shared/ui/tokens/semantic.v3959_0.css',
    uiModeSwitch: '/shared/ui/components/mode-switch.v3963_0.css',
    algorithms: '/shared/algorithms/algorithm-registry.js',
    searchIntentStructure: '/ln-rank/index.html',
    runtimeCache: '/shared/resources/release/runtime-cache-contract.v3964_0.js',
    runtimeBootstrap: '/ln-rank/js/app.v3964_0.js',
    searchIntentState: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3964_0.js',
    schoolResults: '/ln-rank/js/feature/school-majors/school-all-mode.v3964_0.js',
    mainPageStyles: '/ln-rank/css/ln-rank-workspace.v3964_0.css',
    selectionPageStyles: '/ln-rank/css/selection-pool.v3964_0.css',
    selectionRuntime: '/ln-rank/js/selection-pool-runtime.v3964_0.js',
    reportHistoryPlacement: 'appendix-only'
  })
});

export function getCurrentRelease() {
  return CURRENT_RELEASE;
}

export function currentAssetQuery() {
  return CURRENT_RELEASE.assetVersion;
}
