export const RESOURCE_EXECUTION_VERSION = 'resource-execution-v3968_0';

const entry = value => Object.freeze({
  ...value,
  allowedConsumers: Object.freeze(value.allowedConsumers || []),
  allowedAdapters: Object.freeze(value.allowedAdapters || []),
  forbiddenDirectFields: Object.freeze(value.forbiddenDirectFields || []),
  forbiddenLiterals: Object.freeze(value.forbiddenLiterals || []),
  forbiddenImports: Object.freeze(value.forbiddenImports || []),
  generatedArtifacts: Object.freeze(value.generatedArtifacts || []),
  validationTools: Object.freeze(value.validationTools || [])
});

export const RESOURCE_EXECUTION_REGISTRY = Object.freeze({
  release: entry({
    owner: '/shared/resources/release/current-release.js',
    schemaVersion: 'current-release-v3968_0',
    allowedConsumers: ['browser-runtime','functions','reports','audits'],
    generatedArtifacts: ['/ln-rank/active-assets.json','/ln-rank/release-meta.json'],
    validationTools: ['/tools/ln-2026/verify-final-release-v10.py','/tools/audit-derived-assets-v3967.mjs','/tools/audit-academic-background-v3968.mjs']
  }),
  exam: entry({
    owner: '/shared/resources/exam/liaoning-physics.js',
    schemaVersion: 'ln-physics-three-year-resource-v3966_0',
    allowedConsumers: ['rank-provider','functions','browser-runtime','reports','trend-builder','academic-background'],
    forbiddenDirectFields: ['undergraduateControlScore','specialControlScore','vocationalControlScore'],
    validationTools: ['/tools/audit-three-year-rank-evidence-v3967.mjs']
  }),
  rankTables: entry({
    owner: '/functions/_lib/rank-table-provider.js',
    schemaVersion: 'ln-physics-rank-provider-v3967_0',
    allowedConsumers: ['functions','history-evidence','trend-builder','academic-background','audits'],
    forbiddenLiterals: ['141691','119069','118109','116198'],
    validationTools: ['/tools/audit-three-year-rank-evidence-v3967.mjs','/tools/audit-resource-execution-v3967.mjs']
  }),
  historyEvidence: entry({
    owner: '/functions/_lib/historical-score-rank-evidence.js',
    contract: '/shared/resources/exam/historical-score-rank-contract.js',
    presenter: '/ln-rank/js/feature/major-pool/history-score-render.v3967_0.js',
    cssOwner: '/ln-rank/css/history-evidence.v3967_0.css',
    schemaVersion: 'ln-physics-history-evidence-v3967_0',
    allowedConsumers: ['major-results','school-results','selection-pool','reports','ai-facts','academic-background','audits'],
    allowedAdapters: [
      '/shared/resources/exam/historical-score-rank-contract.js',
      '/ln-rank/js/feature/selection-pool/store.v3967_0.js',
      '/ln-rank/js/feature/diagnose/api.v3967_0.js',
      '/ln-rank/js/feature/report/payload-builder.v3967_0.js',
      '/ln-rank/js/academic-background/academic-background-app.v3968_0.js',
      '/functions/_lib/background-position-engine.js',
      '/functions/api/fenxi-catalog.js'
    ],
    forbiddenDirectFields: ['score2024','rank2024','score2025','rank2025','historyCompare'],
    validationTools: ['/tools/audit-resource-execution-v3967.mjs','/tools/audit-three-year-rank-evidence-v3967.mjs','/tools/audit-academic-background-v3968.mjs']
  }),
  academicBackground: entry({
    owner: '/shared/resources/background/academic-background-contract.v3968_0.js',
    sourceRegistry: '/shared/resources/background/academic-background-source-registry.v3968_0.js',
    provider: '/functions/_lib/academic-background-provider.js',
    service: '/functions/_lib/academic-background-api.js',
    api: '/functions/api/academic-background.js',
    matcher: '/shared/algorithms/background/academic-background-matcher.v3968_0.js',
    browserRuntime: '/ln-rank/js/academic-background/academic-background-app.v3968_0.js',
    cssOwner: '/ln-rank/css/academic-background.v3968_0.css',
    schemaVersion: 'academic-background-v3968_0',
    allowedConsumers: ['local-mainline','211-mainline','functions-api','browser-regression','audits'],
    allowedAdapters: ['/functions/api/local-mainline.js','/functions/api/211-mainline.js'],
    forbiddenDirectFields: ['score2025','rank2025','score2024','rank2024'],
    forbiddenImports: [
      '/ln-rank/js/local-mainline/local-mainline-app.v3951_0.js',
      '/ln-rank/js/local-mainline/local-mainline-app.v3967_0.js',
      '/ln-rank/js/211-mainline/211-mainline-app.v3951_0.js'
    ],
    generatedArtifacts: [
      '/ln-rank/local-mainline.html',
      '/ln-rank/211-mainline.html',
      '/ln-rank/active-assets.json'
    ],
    validationTools: ['/tools/audit-academic-background-v3968.mjs','/tools/browser-academic-background-v3968.mjs']
  }),
  ranking: entry({
    owner: '/shared/algorithms/ranking/result-ranking.v3967_0.js',
    upstreamOwner: '/shared/algorithms/ranking/staged-ranking.v3960_0.js',
    schemaVersion: 'result-ranking-v3967_0',
    allowedConsumers: ['major-bands-api','school-majors-api','selection-pool','audits'],
    validationTools: ['/tools/audit-algorithm-parity-v3967.mjs']
  }),
  trend: entry({
    owner: '/shared/resources/trends/liaoning-major-trend.v3967_0.js',
    algorithm: '/shared/algorithms/trend/trend-interpretation.v3967_0.js',
    schemaVersion: 'liaoning-major-trend-execution-v3967_0',
    allowedConsumers: ['trend-page','selection-pool','reports','ai-facts','audits'],
    generatedArtifacts: ['/ln-rank/data/major-trend-2026.json','/functions/_lib/kb/major-trend-2026.generated.js'],
    validationTools: ['/tools/audit-algorithm-parity-v3967.mjs','/tools/ln-2026/verify-generated-release-v3967.py']
  }),
  uiComponents: entry({
    owner: '/shared/ui/component-registry.v3967_0.js',
    schemaVersion: 'ui-component-execution-v3967_0',
    allowedConsumers: ['ln-rank','selection-pool','school-search','academic-background','audits'],
    validationTools: ['/tools/audit-css-component-isolation-v3967.mjs','/tools/browser-resource-execution-v3967.mjs','/tools/browser-academic-background-v3968.mjs']
  }),
  auxiliaryLiaoningKeySubjects: entry({
    owner: '/shared/resources/auxiliary/liaoning-key-subjects.v3967_0.js',
    dataOwner: '/liaoning_key_subjects_phase2_tuition_data.js',
    algorithmOwner: '/shared/algorithms/position/historical-rank-selection.v3967_0.js',
    schemaVersion: 'liaoning-key-subjects-execution-v3967_0',
    allowedConsumers: ['just-for-liaoning'],
    allowedAdapters: ['/just_for_liaoning.html'],
    validationTools: ['/tools/audit-resource-execution-v3967.mjs','/tools/audit-algorithm-parity-v3967.mjs']
  }),
  reports: entry({
    owner: '/shared/resources/reports/feishu-report-contract.v3966_0.js',
    frontendOwner: '/ln-rank/js/feature/feishu/index.v3967_0.js',
    payloadOwner: '/ln-rank/js/feature/report/payload-builder.v3967_0.js',
    schemaVersion: 'feishu-report-execution-v3967_0',
    allowedConsumers: ['main-search','selection-pool','functions','audits'],
    allowedAdapters: ['/ln-rank/js/shared/feishu-api-client.v3966_0.js','/ln-rank/js/feature/selection-pool/feishu-report-api.v3966_0.js'],
    validationTools: ['/tools/audit-resource-execution-v3967.mjs','/tools/browser-resource-execution-v3967.mjs']
  })
});

export function getResourceExecutionOwner(id) {
  return RESOURCE_EXECUTION_REGISTRY[id] || null;
}
