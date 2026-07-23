export const SHARED_RESOURCE_CENTER_VERSION = 'v3957_0';

export const SHARED_RESOURCE_REGISTRY = Object.freeze({
  exam: Object.freeze({
    id: 'liaoning-physics-exam',
    module: '/shared/resources/exam/liaoning-physics.js',
    policy: 'single-source-static-module',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'card-ai', 'reports'])
  }),
  regions: Object.freeze({
    id: 'china-region-catalog',
    module: '/shared/resources/geo/china-region-catalog.js',
    policy: 'single-source-static-module',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api'])
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
    compactEntityPolicy: 'eager-small-static-module',
    fullDirectoryPolicy: 'lazy-single-flight',
    profileModule: '/shared/resources/schools/school-profile-center.js',
    profilePolicy: 'server-sync-official-2026',
    profileFields: Object.freeze(['officialName','campusEntity','province','city','nature','985','211','doubleNon']),
    consumers: Object.freeze(['ln-rank-cards', 'tongxue', 'future-school-tools'])
  })
});
