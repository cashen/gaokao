import { CURRENT_RELEASE } from './release/current-release.js?v=3966_0';

export const SHARED_RESOURCE_CENTER_VERSION = CURRENT_RELEASE.assetVersion;

export const SHARED_RESOURCE_REGISTRY = Object.freeze({
  release: Object.freeze({
    id: 'current-release',
    module: '/shared/resources/release/current-release.js',
    policy: 'single-source-release-contract',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'feishu', 'self-check'])
  }),
  runtimeCache: Object.freeze({
    id: 'ln-rank-runtime-cache-coherence',
    module: '/shared/resources/release/runtime-cache-contract.v3966_0.js',
    policy: 'single-entry-immutable-changed-interface-and-honest-failure-state',
    consumers: Object.freeze(['ln-rank-search', 'ln-rank-selection-pool', 'release-audit', 'browser-regression'])
  }),
  exam: Object.freeze({
    id: 'liaoning-physics-exam',
    module: '/shared/resources/exam/liaoning-physics.js',
    supportedYears: Object.freeze([2024, 2025, 2026]),
    policy: 'single-source-three-year-static-module',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'card-ai', 'reports'])
  }),
  rankTables: Object.freeze({
    id: 'liaoning-physics-rank-tables',
    provider: '/functions/_lib/rank-table-provider.js',
    examConfig: '/shared/resources/exam/liaoning-physics.js',
    evidenceService: '/functions/_lib/historical-score-rank-evidence.js',
    evidenceContract: '/shared/resources/exam/historical-score-rank-contract.js',
    presenter: '/ln-rank/js/feature/major-pool/history-score-render.v3966_0.js',
    supportedYears: Object.freeze([2024, 2025, 2026]),
    comparisonPopulationPolicy: 'undergraduate-control-line-cumulative',
    policy: 'single-provider-official-generated-year-tables-and-evidence',
    consumers: Object.freeze(['functions-api', 'card-ai', 'reports', 'selection-pool', 'school-search', 'trend-analysis'])
  }),
  regions: Object.freeze({
    id: 'china-region-catalog',
    module: '/shared/resources/geo/china-region-catalog.js',
    policy: 'single-source-static-module',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'school-profile', 'legacy-geo-adapter'])
  }),
  reports: Object.freeze({
    id: 'feishu-report-contract',
    module: '/shared/resources/reports/feishu-report-contract.v3966_0.js',
    yearCaliberVersion: 'ln-physics-report-years-v3966_0',
    frontend: '/ln-rank/js/feature/feishu/index.v3966_0.js',
    historyEvidenceOwner: '/functions/_lib/historical-score-rank-evidence.js',
    policy: 'single-source-contract-client-year-caliber-evidence-and-operation-state',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'path-analysis', 'self-check'])
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
  ui: Object.freeze({
    id: 'family-ui-orchestration',
    registry: '/shared/ui/ui-registry.v3965_0.js',
    foundation: '/shared/ui/tokens/foundation.v3959_0.css',
    semantic: '/shared/ui/tokens/semantic.v3959_0.css',
    modeSwitch: '/shared/ui/components/mode-switch.v3963_0.css',
    shellCss: '/shared/ui/shell/family-shell.v3965_0.css',
    shellJs: '/shared/ui/shell/family-shell.v3965_0.js',
    selectionQuickEntryMount: '/ln-rank/index.html#selectionPoolShell',
    policy: 'single-ui-language-shell-state-responsive-and-tongxue-runtime-contract',
    consumers: Object.freeze(['home','ln-rank','selection-pool','ln2026','zy2026','tongxue'])
  }),
  campusAssignments: Object.freeze({
    id: 'liaoning-major-campus-assignment',
    module: '/functions/_lib/kb/liaoning-campus-major-kb.generated.js',
    accessor: '/functions/_lib/kb/campus-accessor.js',
    policy: 'separate-major-to-campus-knowledge-linked-to-school-identity',
    consumers: Object.freeze(['cards', 'reports', 'review-checklist'])
  })
});
