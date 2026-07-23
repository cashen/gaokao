import { CURRENT_RELEASE } from './release/current-release.js';

export const SHARED_RESOURCE_CENTER_VERSION = CURRENT_RELEASE.assetVersion;

export const SHARED_RESOURCE_REGISTRY = Object.freeze({
  release: Object.freeze({
    id: 'current-release',
    module: '/shared/resources/release/current-release.js',
    policy: 'single-source-release-contract',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'feishu', 'self-check'])
  }),
  exam: Object.freeze({
    id: 'liaoning-physics-exam',
    module: '/shared/resources/exam/liaoning-physics.js',
    policy: 'single-source-static-module',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'card-ai', 'reports'])
  }),
  rankTables: Object.freeze({
    id: 'liaoning-physics-rank-tables',
    provider: '/functions/_lib/rank-table-provider.js',
    policy: 'single-provider-generated-year-tables',
    consumers: Object.freeze(['functions-api', 'card-ai', 'reports', 'selection-pool'])
  }),
  regions: Object.freeze({
    id: 'china-region-catalog',
    module: '/shared/resources/geo/china-region-catalog.js',
    policy: 'single-source-static-module',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'school-profile', 'legacy-geo-adapter'])
  }),
  reports: Object.freeze({
    id: 'feishu-report-contract',
    module: '/shared/resources/reports/feishu-report-contract.js',
    policy: 'single-source-contract-and-client',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'self-check'])
  }),
  schools: Object.freeze({
    id: 'school-resource-center',
    module: '/shared/resources/schools/school-resource-center.js',
    identityModule: '/shared/resources/schools/school-identity-center.js',
    profileModule: '/shared/resources/schools/school-profile-center.js',
    buildKernel: '/tools/schools/school_resource_bundle.py',
    compactEntityPolicy: 'eager-small-static-module',
    fullDirectoryPolicy: 'lazy-single-flight',
    profilePolicy: 'server-sync-official-2026',
    identityPolicy: 'shared-upstream-tongxue-compatibility-export',
    profileFields: Object.freeze(['officialName','campusEntity','province','city','nature','985','211','doubleNon']),
    consumers: Object.freeze(['ln-rank-cards', 'selection-pool', 'reports', 'tongxue', 'future-school-tools'])
  }),
  majors: Object.freeze({
    id: 'major-catalog-2026',
    resolverModule: '/shared/resources/majors/major-catalog-contract.js',
    policy: 'single-resolver-derived-runtime-formats',
    canonicalCount: 883,
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'card-ai', 'reports'])
  }),
  campusAssignments: Object.freeze({
    id: 'liaoning-major-campus-assignment',
    module: '/functions/_lib/kb/liaoning-campus-major-kb.generated.js',
    accessor: '/functions/_lib/kb/campus-accessor.js',
    policy: 'separate-major-to-campus-knowledge-linked-to-school-identity',
    consumers: Object.freeze(['cards', 'reports', 'review-checklist'])
  })
});
