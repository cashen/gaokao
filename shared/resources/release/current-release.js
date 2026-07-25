import { LIAONING_PHYSICS_EXAM_CONFIG } from '../exam/liaoning-physics.js';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;

export const CURRENT_RELEASE = Object.freeze({
  display: 'v3.9.63.1',
  version: 'v3.9.63.1',
  asset: '3963_1',
  assetVersion: 'v3963_1',
  release: 'v3.9.63.1-runtime-cache-coherence-no-fenxi',
  releaseName: 'v3.9.63.1-runtime-cache-coherence-no-fenxi',
  label: 'runtime-cache-coherence-no-fenxi',
  dataYear: EXAM.dataYear,
  audienceYear: EXAM.audienceYear,
  rankTableYear: EXAM.rankYear,
  region: EXAM.region,
  subject: EXAM.subject,
  noFenxiIncluded: true,
  resourceOwnershipVersion: 'resource-ownership-v3958',
  uiOrchestrationVersion: 'ui-orchestration-v3963_1',
  algorithmOrchestrationVersion: 'algorithm-orchestration-v3963',
  selectionWorkspaceVersion: 'selection-workspace-orchestration-v3963_1',
  searchIntentVersion: 'score-school-search-v3963_1',
  schoolAllModeVersion: 'school-all-mode-v3963_1',
  schoolUiGovernanceVersion: 'school-ui-governance-v3963_1',
  schoolModeMountVersion: 'school-mode-static-mount-v3963_1',
  runtimeCacheVersion: 'runtime-cache-coherence-v3963_1',
  resourceOwners: Object.freeze({
    release: '/shared/resources/release/current-release.js',
    exam: '/shared/resources/exam/liaoning-physics.js',
    regions: '/shared/resources/geo/china-region-catalog.js',
    schools: '/shared/resources/schools/school-profile-center.js',
    schoolIdentity: '/shared/resources/schools/school-identity-center.js',
    majors: '/shared/resources/majors/major-catalog-contract.js',
    reports: '/shared/resources/reports/feishu-report-contract.v3963_1.js',
    ui: '/shared/ui/ui-registry.v3963_1.js',
    uiActions: '/shared/ui/contracts/action-contract.v3959_0.js',
    uiSemantic: '/shared/ui/tokens/semantic.v3959_0.css',
    uiModeSwitch: '/shared/ui/components/mode-switch.v3963_0.css',
    algorithms: '/shared/algorithms/algorithm-registry.js',
    searchIntentStructure: '/ln-rank/index.html',
    runtimeCache: '/shared/resources/release/runtime-cache-contract.v3963_1.js',
    runtimeBootstrap: '/ln-rank/js/app.v3963_1.js',
    searchIntentState: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3963_1.js',
    schoolResults: '/ln-rank/js/feature/school-majors/school-all-mode.v3963_1.js'
  })
});

export function getCurrentRelease() {
  return CURRENT_RELEASE;
}

export function currentAssetQuery() {
  return CURRENT_RELEASE.assetVersion;
}
