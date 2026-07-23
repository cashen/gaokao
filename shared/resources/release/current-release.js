import { LIAONING_PHYSICS_EXAM_CONFIG } from '../exam/liaoning-physics.js';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;

export const CURRENT_RELEASE = Object.freeze({
  display: 'v3.9.60.0',
  version: 'v3.9.60.0',
  asset: '3960_0',
  assetVersion: 'v3960_0',
  release: 'v3.9.60.0-resource-ui-algorithm-orchestration-no-fenxi',
  releaseName: 'v3.9.60.0-resource-ui-algorithm-orchestration-no-fenxi',
  label: 'resource-ui-algorithm-orchestration-no-fenxi',
  dataYear: EXAM.dataYear,
  audienceYear: EXAM.audienceYear,
  rankTableYear: EXAM.rankYear,
  region: EXAM.region,
  subject: EXAM.subject,
  noFenxiIncluded: true,
  resourceOwnershipVersion: 'resource-ownership-v3958',
  uiOrchestrationVersion: 'ui-orchestration-v3960',
  algorithmOrchestrationVersion: 'algorithm-orchestration-v3960',
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
