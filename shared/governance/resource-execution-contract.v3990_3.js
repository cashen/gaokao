import {
  RESOURCE_EXECUTION_REGISTRY as PREVIOUS_RESOURCE_EXECUTION_REGISTRY
} from './resource-execution-contract.v3972_5.js?v=3972_5';
import { SITE_RUNTIME_CONTRACT } from '../resources/release/site-runtime-contract.v3990_3.js?v=3990_3';
import { CURRENT_RELEASE } from '../resources/release/current-release.js?v=3990_3';

export const RESOURCE_EXECUTION_VERSION = 'resource-execution-v3990_3';

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
  ...PREVIOUS_RESOURCE_EXECUTION_REGISTRY,
  release: entry({
    owner: SITE_RUNTIME_CONTRACT.owners.release,
    contract: SITE_RUNTIME_CONTRACT.owners.activeGeneration,
    cacheContract: SITE_RUNTIME_CONTRACT.owners.cache,
    executionContract: SITE_RUNTIME_CONTRACT.owners.execution,
    schemaVersion: SITE_RUNTIME_CONTRACT.version,
    allowedConsumers: ['browser-runtime', 'functions', 'reports', 'audits', 'production-verification'],
    generatedArtifacts: ['/ln-rank/site-active-generation.v3990_3.json', '/shared/resources/release/active-resource-manifest.v3990_3.js'],
    validationTools: [
      '/tools/audit-site-runtime-generation-v3990_3.mjs',
      '/tools/browser-native-chooser-activation-v3990_3.mjs',
      '/.github/workflows/verify-native-chooser-activation-v3972_6.yml'
    ]
  }),
  siteRuntime: entry({
    owner: SITE_RUNTIME_CONTRACT.owners.activeGeneration,
    schemaVersion: SITE_RUNTIME_CONTRACT.version,
    allowedConsumers: ['root-homepage', 'ln-rank', 'selection-pool', 'browser-regression', 'production-verification'],
    allowedAdapters: SITE_RUNTIME_CONTRACT.stableDependencies,
    forbiddenImports: [
      '/shared/ui/interaction/interaction-transaction.v3972_4.js',
      '/shared/ui/interaction/interaction-transaction.v3972_5.js',
      '/shared/ui/interaction/interaction-transaction.v3972_6.js',
      '/shared/ui/shell/family-shell.v3972_5.js',
      '/shared/ui/shell/family-shell.v3972_6.js',
      '/shared/ui/components/family-plan-entry.v3972_5.js',
      '/shared/ui/components/family-plan-entry.v3972_6.js',
      '/ln-rank/js/ux/family-home.v3972_5.js',
      '/ln-rank/js/ux/family-home.v3972_6.js',
      '/ln-rank/js/app.v3972_4.js',
      '/ln-rank/js/app.v3972_5.js',
      '/ln-rank/js/app.v3972_6.js',
      '/ln-rank/js/app-runtime.v3972_4.js',
      '/ln-rank/js/app-runtime.v3972_5.js',
      '/ln-rank/js/app-runtime.v3972_6.js',
      '/ln-rank/js/workspace/selection-workspace-orchestrator.v3972_4.js',
      '/ln-rank/js/workspace/selection-workspace-orchestrator.v3972_5.js',
      '/ln-rank/js/workspace/selection-workspace-orchestrator.v3972_6.js',
      '/ln-rank/js/selection-pool.v3972_5.js',
      '/ln-rank/js/selection-pool.v3972_6.js',
      '/ln-rank/js/selection-pool-runtime.v3972_5.js',
      '/ln-rank/js/selection-pool-runtime.v3972_6.js'
    ],
    forbiddenLiterals: [
      'data-ui-interaction-version="interaction-transaction-v3972_5"',
      'app.v3972_5.js?v=3972_5',
      'interaction-transaction.v3972_5.js?v=3972_5',
      'family-home.v3972_5.js?v=3972_5',
      'family-shell.v3972_5.js?v=3972_5',
      'selection-pool.v3972_5.js?v=3972_5'
    ],
    generatedArtifacts: ['/ln-rank/site-active-generation.v3990_3.json'],
    validationTools: ['/tools/audit-site-runtime-generation-v3990_3.mjs']
  }),
  interaction: entry({
    owner: SITE_RUNTIME_CONTRACT.owners.interaction,
    cssOwner: SITE_RUNTIME_CONTRACT.activeEntrypoints.interactionStyles.split('?')[0],
    disclosureOwner: SITE_RUNTIME_CONTRACT.owners.disclosure,
    auxiliaryNavigationOwner: SITE_RUNTIME_CONTRACT.owners.auxiliaryNavigation,
    nativeChooserActivationOwner: SITE_RUNTIME_CONTRACT.owners.nativeChooserActivation,
    schemaVersion: 'interaction-transaction-v3990_3',
    activationContractVersion: 'native-chooser-activation-integrity-v3990_3',
    allowedConsumers: ['ln-rank', 'workspace-orchestrator', 'browser-regression', 'production-verification'],
    forbiddenLiterals: [
      'navigator.userAgent',
      'Alook',
      'Android',
      'setNavigationAvailability(',
      'action.disabled =',
      'container.inert =',
      'pointer-events: none'
    ],
    validationTools: [
      '/tools/audit-site-runtime-generation-v3990_3.mjs',
      '/tools/browser-native-chooser-activation-v3990_3.mjs'
    ]
  }),
  home: entry({
    ...(PREVIOUS_RESOURCE_EXECUTION_REGISTRY.home || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.home,
    shellOwner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    releaseOwner: SITE_RUNTIME_CONTRACT.owners.release,
    schemaVersion: 'family-home-runtime-v3990_3-r031',
    classification: 'current-generation',
    validationTools: ['/tools/audit-site-runtime-generation-v3990_3.mjs', '/tools/browser-home-release-v3990_3.mjs']
  }),
  uiComponents: entry({
    ...(PREVIOUS_RESOURCE_EXECUTION_REGISTRY.uiComponents || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    familyPlanEntry: SITE_RUNTIME_CONTRACT.owners.familyPlanEntry,
    schemaVersion: 'ui-component-execution-v3990_3',
    classification: 'current-generation-with-stable-css',
    allowedAdapters: [
      '/shared/ui/ui-registry.v3970_0.js',
      '/shared/ui/component-registry.v3970_0.js',
      '/shared/ui/contracts/action-contract.v3970_0.js',
      '/shared/ui/contracts/copy-contract.v3970_0.js',
      '/shared/ui/contracts/state-contract.v3970_0.js',
      '/shared/ui/shell/family-shell.v3972_5.css',
      '/shared/ui/components/family-plan-entry.v3972_5.css'
    ],
    validationTools: ['/tools/audit-site-runtime-generation-v3990_3.mjs', '/tools/browser-family-action-v3990_3.mjs']
  }),
  majorBands: entry({
    owner: '/functions/api/major-bands.js',
    dataOwner: '/ln-rank/data/major-bands-static-v3972_2/manifest.json',
    rankIndexOwner: '/functions/_lib/major-bands-rank-index.v3990_3.js',
    queryKernelOwner: '/functions/_lib/major-bands-rank-query-kernel.v3990_3.js',
    bucketLoaderOwner: '/functions/_lib/major-bands-rank-bucket-loader.v3990_3.js',
    bucketCacheOwner: '/functions/api/major-bands.js',
    resultOrderOwner: '/functions/_lib/major-bands-result-order.v3990_3.js',
    responseTransportOwner: '/functions/_lib/major-bands-response-transport.v3990_3.js',
    materializationOwner: '/functions/_lib/major-bands-static-provider.js',
    stableWorkerOwner: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',
    schemaVersion: 'major-bands-single-worker-rank-window-v3990_3',
    classification: 'current-query-kernel-over-declared-stable-data-and-worker-fallback',
    allowedConsumers: ['major-bands-api', 'browser-runtime', 'reports', 'audits', 'production-verification'],
    allowedAdapters: [
      '/functions/api/major-bands-bucket.js',
      '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',
      '/functions/_lib/major-bands-bucket-cache.v3972_5.js',
      '/functions/_lib/major-bands-bucket-transfer.v3972_5.js'
    ],
    forbiddenLiterals: [
      "new URL('/api/major-bands-bucket'",
      'runMajorBandsBucketWorkers',
      'maxCandidates',
      'selected.buckets.length > 12'
    ],
    generatedArtifacts: ['/functions/_lib/major-bands-rank-index.v3990_3.js'],
    validationTools: [
      '/tools/build-major-bands-rank-index-v3990_3.mjs',
      '/tools/audit-major-bands-rank-kernel-v3990_3.mjs',
      '/tools/verify-major-bands-preview-concurrency-v3990_3.mjs'
    ]
  }),
  familyAction: entry({
    ...(PREVIOUS_RESOURCE_EXECUTION_REGISTRY.familyAction || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.familyPlanEntry,
    shellOwner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    bootstrapOwner: SITE_RUNTIME_CONTRACT.owners.familyPlanBootstrap,
    runtimeOwner: SITE_RUNTIME_CONTRACT.owners.familyPlanRuntime,
    schemaVersion: 'family-action-v3990_3',
    classification: 'current-generation',
    validationTools: ['/tools/audit-site-runtime-generation-v3990_3.mjs', '/tools/browser-family-action-v3990_3.mjs']
  }),
  resourceManifest: entry({
    owner: SITE_RUNTIME_CONTRACT.owners.resourceManifest,
    schemaVersion: 'active-resource-manifest-v3990_3',
    classification: 'current-release-resource-control-plane',
    allowedConsumers: ['browser-runtime', 'functions', 'resource-registry', 'release-audits', 'production-verification'],
    generatedArtifacts: [
      '/shared/resources/release/active-resource-manifest.v3990_3.js',
      '/ln-rank/site-active-generation.v3990_3.json'
    ],
    validationTools: [
      '/tools/audit-architecture-handoff-v3990_3.mjs',
      '/tools/verify-production-resource-graph-v3990_1.mjs'
    ]
  }),
  aiplusTransitive: entry({
    owner: SITE_RUNTIME_CONTRACT.owners.aiplusWorkspaceImplementation,
    renderOwner: SITE_RUNTIME_CONTRACT.owners.aiplusRenderImplementation,
    historyOwner: SITE_RUNTIME_CONTRACT.owners.aiplusHistoryImplementation,
    schemaVersion: 'aiplus-transitive-implementation-v3990_3',
    classification: 'declared-transitive-implementation',
    allowedConsumers: ['aiplus-browser', 'aiplus-verification', 'production-verification'],
    validationTools: [
      '/tools/verify-ai-workspace-v3990_3.mjs',
      '/tools/verify-aiplus-decision-focus-v006.mjs',
      '/tools/verify-aiplus-selection-workbench-v005.mjs'
    ]
  }),
  majorSourceProfile: entry({
    owner: SITE_RUNTIME_CONTRACT.owners.majorSourceProfile,
    canonicalIdentityOwner: CURRENT_RELEASE.resourceOwners.majors,
    schemaVersion: 'pr194-major-source-profile-v001',
    classification: 'current-data-resource-additive-knowledge',
    allowedConsumers: ['major-understanding', 'tongxue-major', 'aiplus-knowledge', 'source-verification'],
    forbiddenDirectFields: ['score2026', 'rank2026', 'admissionProbability', 'recommendationScore'],
    validationTools: [
      '/tools/verify-major-source-profile-v001.mjs',
      '/tools/verify-tongxue-major-source-intro-v001.mjs'
    ]
  }),
  schoolDirectory: entry({
    owner: CURRENT_RELEASE.resourceOwners.schoolResourceCenter,
    identityOwner: CURRENT_RELEASE.resourceOwners.schoolIdentity,
    directoryLoader: CURRENT_RELEASE.resourceOwners.schoolDirectoryLoader,
    schemaVersion: 'school-resource-center-v3990_3',
    classification: 'current-shared-school-resource-with-legacy-compatible-loader',
    allowedConsumers: ['tongxue', 'school-query-provider', 'ln-rank', 'aiplus'],
    validationTools: [
      '/tools/audit-school-query-v3970.mjs',
      '/tools/verify-ai-region-school-directory-v002.mjs'
    ]
  }),
});

export function getResourceExecutionOwner(id) {
  return RESOURCE_EXECUTION_REGISTRY[id] || null;
}
