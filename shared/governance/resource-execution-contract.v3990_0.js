import {
  RESOURCE_EXECUTION_REGISTRY as PREVIOUS_RESOURCE_EXECUTION_REGISTRY
} from './resource-execution-contract.v3972_5.js?v=3972_5';
import { SITE_RUNTIME_CONTRACT } from '../resources/release/site-runtime-contract.v3990_0.js?v=3990_0';

export const RESOURCE_EXECUTION_VERSION = 'resource-execution-v3990_0';

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
    generatedArtifacts: ['/ln-rank/site-active-generation.v3990_0.json'],
    validationTools: [
      '/tools/audit-site-runtime-generation-v3990_0.mjs',
      '/tools/browser-native-chooser-activation-v3990_0.mjs',
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
    generatedArtifacts: ['/ln-rank/site-active-generation.v3990_0.json'],
    validationTools: ['/tools/audit-site-runtime-generation-v3990_0.mjs']
  }),
  interaction: entry({
    owner: SITE_RUNTIME_CONTRACT.owners.interaction,
    cssOwner: SITE_RUNTIME_CONTRACT.activeEntrypoints.interactionStyles.split('?')[0],
    disclosureOwner: SITE_RUNTIME_CONTRACT.owners.disclosure,
    auxiliaryNavigationOwner: SITE_RUNTIME_CONTRACT.owners.auxiliaryNavigation,
    nativeChooserActivationOwner: SITE_RUNTIME_CONTRACT.owners.nativeChooserActivation,
    schemaVersion: 'interaction-transaction-v3990_0',
    activationContractVersion: 'native-chooser-activation-integrity-v3990_0',
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
      '/tools/audit-site-runtime-generation-v3990_0.mjs',
      '/tools/browser-native-chooser-activation-v3990_0.mjs'
    ]
  }),
  home: entry({
    ...(PREVIOUS_RESOURCE_EXECUTION_REGISTRY.home || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.home,
    shellOwner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    releaseOwner: SITE_RUNTIME_CONTRACT.owners.release,
    schemaVersion: 'family-home-runtime-v3990_0',
    classification: 'current-generation',
    validationTools: ['/tools/audit-site-runtime-generation-v3990_0.mjs', '/tools/browser-home-release-v3990_0.mjs']
  }),
  uiComponents: entry({
    ...(PREVIOUS_RESOURCE_EXECUTION_REGISTRY.uiComponents || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    familyPlanEntry: SITE_RUNTIME_CONTRACT.owners.familyPlanEntry,
    schemaVersion: 'ui-component-execution-v3990_0',
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
    validationTools: ['/tools/audit-site-runtime-generation-v3990_0.mjs', '/tools/browser-family-action-v3990_0.mjs']
  }),
  majorBands: entry({
    owner: '/functions/api/major-bands.js',
    dataOwner: '/ln-rank/data/major-bands-static-v3972_2/manifest.json',
    rankIndexOwner: '/functions/_lib/major-bands-rank-index.v3990_0.js',
    queryKernelOwner: '/functions/_lib/major-bands-rank-query-kernel.v3990_0.js',
    bucketLoaderOwner: '/functions/_lib/major-bands-rank-bucket-loader.v3990_0.js',
    bucketCacheOwner: '/functions/api/major-bands.js',
    resultOrderOwner: '/functions/_lib/major-bands-result-order.v3990_0.js',
    responseTransportOwner: '/functions/_lib/major-bands-response-transport.v3990_0.js',
    materializationOwner: '/functions/_lib/major-bands-static-provider.js',
    stableWorkerOwner: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',
    schemaVersion: 'major-bands-single-worker-rank-window-v3990_0',
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
    generatedArtifacts: ['/functions/_lib/major-bands-rank-index.v3990_0.js'],
    validationTools: [
      '/tools/build-major-bands-rank-index-v3990_0.mjs',
      '/tools/audit-major-bands-rank-kernel-v3990_0.mjs',
      '/tools/verify-major-bands-preview-concurrency-v3990_0.mjs'
    ]
  }),
  familyAction: entry({
    ...(PREVIOUS_RESOURCE_EXECUTION_REGISTRY.familyAction || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.familyPlanEntry,
    shellOwner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    bootstrapOwner: SITE_RUNTIME_CONTRACT.owners.familyPlanBootstrap,
    runtimeOwner: SITE_RUNTIME_CONTRACT.owners.familyPlanRuntime,
    schemaVersion: 'family-action-v3990_0',
    classification: 'current-generation',
    validationTools: ['/tools/audit-site-runtime-generation-v3990_0.mjs', '/tools/browser-family-action-v3990_0.mjs']
  })
});

export function getResourceExecutionOwner(id) {
  return RESOURCE_EXECUTION_REGISTRY[id] || null;
}
