import { LIAONING_PHYSICS_EXAM_CONFIG } from '../exam/liaoning-physics.js';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;

export const CURRENT_RELEASE = Object.freeze({
  display: 'v3.9.62.1',
  version: 'v3.9.62.1',
  asset: '3962_1',
  assetVersion: 'v3962_1',
  release: 'v3.9.62.1-school-ui-governance-no-fenxi',
  releaseName: 'v3.9.62.1-school-ui-governance-no-fenxi',
  label: 'school-ui-governance-no-fenxi',
  dataYear: EXAM.dataYear,
  audienceYear: EXAM.audienceYear,
  rankTableYear: EXAM.rankYear,
  region: EXAM.region,
  subject: EXAM.subject,
  noFenxiIncluded: true,
  resourceOwnershipVersion: 'resource-ownership-v3958',
  uiOrchestrationVersion: 'ui-orchestration-v3961',
  algorithmOrchestrationVersion: 'algorithm-orchestration-v3960',
  selectionWorkspaceVersion: 'selection-workspace-orchestration-v3961',
  schoolAllModeVersion: 'school-all-mode-v3962_1',
  schoolUiGovernanceVersion: 'school-ui-governance-v3962_1',
  resourceOwners: Object.freeze({
    release: '/shared/resources/release/current-release.js',
    exam: '/shared/resources/exam/liaoning-physics.js',
    regions: '/shared/resources/geo/china-region-catalog.js',
    schools: '/shared/resources/schools/school-profile-center.js',
    schoolIdentity: '/shared/resources/schools/school-identity-center.js',
    majors: '/shared/resources/majors/major-catalog-contract.js',
    reports: '/shared/resources/reports/feishu-report-contract.js',
    ui: '/shared/ui/ui-registry.js',
    uiActions: '/shared/ui/contracts/action-contract.v3959_0.js',
    uiSemantic: '/shared/ui/tokens/semantic.v3959_0.css',
    algorithms: '/shared/algorithms/algorithm-registry.js'
  })
});

export function getCurrentRelease() {
  return CURRENT_RELEASE;
}

export function currentAssetQuery() {
  return CURRENT_RELEASE.assetVersion;
}
