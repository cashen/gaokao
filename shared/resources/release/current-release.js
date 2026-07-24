import { LIAONING_PHYSICS_EXAM_CONFIG } from '../exam/liaoning-physics.js';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;

export const CURRENT_RELEASE = Object.freeze({
  display: 'v3.9.62.0',
  version: 'v3.9.62.0',
  asset: '3962_0',
  assetVersion: 'v3962_0',
  release: 'v3.9.62.0-school-all-majors-no-fenxi',
  releaseName: 'v3.9.62.0-school-all-majors-no-fenxi',
  label: 'school-all-majors-no-fenxi',
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
  schoolAllModeVersion: 'school-all-mode-v3962',
  resourceOwners: Object.freeze({
    release: '/shared/resources/release/current-release.js',
    exam: '/shared/resources/exam/liaoning-physics.js',
    regions: '/shared/resources/geo/china-region-catalog.js',
    schools: '/shared/resources/schools/school-profile-center.js',
    schoolIdentity: '/shared/resources/schools/school-identity-center.js',
    majors: '/shared/resources/majors/major-catalog-contract.js',
    reports: '/shared/resources/reports/feishu-report-contract.js',
    ui: '/shared/ui/ui-registry.js',
    algorithms: '/shared/algorithms/algorithm-registry.js'
  })
});

export function getCurrentRelease() {
  return CURRENT_RELEASE;
}

export function currentAssetQuery() {
  return CURRENT_RELEASE.assetVersion;
}
