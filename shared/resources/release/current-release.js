import { LIAONING_PHYSICS_EXAM_CONFIG } from '../exam/liaoning-physics.js';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;

export const CURRENT_RELEASE = Object.freeze({
  display: 'v3.9.64.1',
  version: 'v3.9.64.1',
  asset: '3964_1',
  assetVersion: 'v3964_1',
  release: 'v3.9.64.1-runtime-cache-recovery-no-fenxi',
  releaseName: 'v3.9.64.1-runtime-cache-recovery-no-fenxi',
  label: 'runtime-cache-recovery-no-fenxi',
  dataYear: EXAM.dataYear,
  audienceYear: EXAM.audienceYear,
  rankTableYear: EXAM.rankYear,
  region: EXAM.region,
  subject: EXAM.subject,
  noFenxiIncluded: true,
  resourceOwnershipVersion: 'resource-ownership-v3964_1',
  uiOrchestrationVersion: 'ui-orchestration-v3964_0',
  algorithmOrchestrationVersion: 'algorithm-orchestration-v3963',
  selectionWorkspaceVersion: 'selection-workspace-orchestration-v3964_0',
  searchIntentVersion: 'score-school-search-v3964_0',
  schoolAllModeVersion: 'school-all-mode-v3964_0',
  schoolUiGovernanceVersion: 'school-ui-governance-v3964_0',
  schoolModeMountVersion: 'school-mode-static-mount-v3964_0',
  runtimeCacheVersion: 'runtime-cache-coherence-v3964_1',
  staticContentTypeOwnershipVersion: 'static-content-type-ownership-v3964_1',
  cacheRecoveryVersion: 'cached-runtime-recovery-v3964_1',
  reportFrontendVersion: 'feishu-browser-v3964_0',
  resourceOwners: Object.freeze({
    release: '/shared/resources/release/current-release.js',
    releasePresenter: '/shared/resources/release/release-presenter.v3964_1.js',
    exam: '/shared/resources/exam/liaoning-physics.js',
    regions: '/shared/resources/geo/china-region-catalog.js',
    schools: '/shared/resources/schools/school-profile-center.js',
    schoolIdentity: '/shared/resources/schools/school-identity-center.js',
    majors: '/shared/resources/majors/major-catalog-contract.js',
    reports: '/shared/resources/reports/feishu-report-contract.v3964_0.js',
    reportFrontend: '/ln-rank/js/feature/feishu/index.v3964_0.js',
    ui: '/shared/ui/ui-registry.v3964_1.js',
    uiActions: '/shared/ui/contracts/action-contract.v3959_0.js',
    uiSemantic: '/shared/ui/tokens/semantic.v3959_0.css',
    uiModeSwitch: '/shared/ui/components/mode-switch.v3963_0.css',
    algorithms: '/shared/algorithms/algorithm-registry.js',
    searchIntentStructure: '/ln-rank/index.html',
    runtimeCache: '/shared/resources/release/runtime-cache-contract.v3964_1.js',
    runtimeBootstrap: '/ln-rank/js/app.v3964_1.js',
    searchIntentState: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3964_0.js',
    schoolResults: '/ln-rank/js/feature/school-majors/school-all-mode.v3964_0.js',
    mainPageStyles: '/ln-rank/css/ln-rank-workspace.v3964_0.css',
    selectionPageStyles: '/ln-rank/css/selection-pool.v3964_0.css',
    selectionRuntime: '/ln-rank/js/selection-pool-runtime.v3964_1.js',
    selectionQuickEntryStructure: '/ln-rank/index.html#selectionPoolShell',
    reportHistoryPlacement: 'appendix-only'
  })
});

export function getCurrentRelease() {
  return CURRENT_RELEASE;
}

export function currentAssetQuery() {
  return CURRENT_RELEASE.assetVersion;
}
