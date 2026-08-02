import {
  RESOURCE_EXECUTION_REGISTRY as STABLE_RESOURCE_EXECUTION_REGISTRY
} from './resource-execution-contract.v3970_0.js?v=3970_0';
import { SITE_RUNTIME_CONTRACT } from '../resources/release/site-runtime-contract.v3972_5.js?v=3972_5';

export const RESOURCE_EXECUTION_VERSION = 'resource-execution-v3972_5';

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
  ...STABLE_RESOURCE_EXECUTION_REGISTRY,
  release: entry({
    owner: SITE_RUNTIME_CONTRACT.owners.release,
    contract: SITE_RUNTIME_CONTRACT.owners.activeGeneration,
    cacheContract: SITE_RUNTIME_CONTRACT.owners.cache,
    executionContract: SITE_RUNTIME_CONTRACT.owners.execution,
    schemaVersion: SITE_RUNTIME_CONTRACT.version,
    allowedConsumers: ['browser-runtime', 'functions', 'reports', 'audits', 'production-verification'],
    generatedArtifacts: ['/ln-rank/site-active-generation.v3972_5.json'],
    validationTools: [
      '/tools/audit-site-runtime-generation-v3972_5.mjs',
      '/tools/browser-interaction-transaction-v3972_5.mjs',
      '/.github/workflows/verify-production-release-v3970.yml'
    ]
  }),
  siteRuntime: entry({
    owner: SITE_RUNTIME_CONTRACT.owners.activeGeneration,
    schemaVersion: SITE_RUNTIME_CONTRACT.version,
    allowedConsumers: ['root-homepage', 'ln-rank', 'selection-pool', 'browser-regression', 'production-verification'],
    allowedAdapters: SITE_RUNTIME_CONTRACT.stableDependencies,
    forbiddenImports: [
      '/shared/ui/interaction/interaction-transaction.v3972_4.js',
      '/ln-rank/js/app.v3972_4.js',
      '/ln-rank/js/app-runtime.v3972_4.js',
      '/ln-rank/js/workspace/selection-workspace-orchestrator.v3972_4.js'
    ],
    forbiddenLiterals: [
      'data-ui-interaction-version="interaction-transaction-v3972_4"',
      'app.v3972_4.js?v=3972_4',
      'interaction-transaction.v3972_4.js?v=3972_4'
    ],
    generatedArtifacts: ['/ln-rank/site-active-generation.v3972_5.json'],
    validationTools: ['/tools/audit-site-runtime-generation-v3972_5.mjs']
  }),
  interaction: entry({
    owner: SITE_RUNTIME_CONTRACT.owners.interaction,
    cssOwner: SITE_RUNTIME_CONTRACT.activeEntrypoints.interactionStyles.split('?')[0],
    disclosureOwner: SITE_RUNTIME_CONTRACT.owners.disclosure,
    auxiliaryNavigationOwner: SITE_RUNTIME_CONTRACT.owners.auxiliaryNavigation,
    schemaVersion: 'interaction-transaction-v3972_5',
    allowedConsumers: ['ln-rank', 'workspace-orchestrator', 'browser-regression'],
    forbiddenLiterals: ['Android', 'Alook', 'a[href="/ln-rank/local-mainline.html"]', 'a[href="/ln-rank/211-mainline.html"]'],
    validationTools: ['/tools/browser-interaction-transaction-v3972_5.mjs']
  }),
  home: entry({
    ...(STABLE_RESOURCE_EXECUTION_REGISTRY.home || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.home,
    shellOwner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    releaseOwner: SITE_RUNTIME_CONTRACT.owners.release,
    schemaVersion: 'family-home-runtime-v3972_5',
    validationTools: [
      '/tools/audit-site-runtime-generation-v3972_5.mjs',
      '/tools/browser-home-release-v3970.mjs',
      '/.github/workflows/verify-production-release-v3970.yml'
    ]
  }),
  uiComponents: entry({
    ...(STABLE_RESOURCE_EXECUTION_REGISTRY.uiComponents || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    familyPlanEntry: SITE_RUNTIME_CONTRACT.owners.familyPlanEntry,
    schemaVersion: 'ui-component-execution-v3972_5',
    allowedAdapters: [
      '/shared/ui/ui-registry.v3970_0.js',
      '/shared/ui/component-registry.v3970_0.js',
      '/shared/ui/contracts/action-contract.v3970_0.js',
      '/shared/ui/contracts/copy-contract.v3970_0.js',
      '/shared/ui/contracts/state-contract.v3970_0.js'
    ],
    validationTools: ['/tools/audit-site-runtime-generation-v3972_5.mjs', '/tools/browser-family-action-v3970.mjs']
  }),
  majorBands: entry({
    owner: '/functions/api/major-bands.js',
    bucketOwner: '/functions/api/major-bands-bucket.js',
    orchestrator: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',
    transferOwner: '/functions/_lib/major-bands-bucket-transfer.v3972_5.js',
    transferVersion: 'major-bands-bucket-candidate-compact-v3972_5',
    transferRole: 'unmaterialized-global-ranking-frontier',
    materializationVersion: 'major-bands-materialized-v3972_5',
    materializationOwner: '/functions/api/major-bands.js',
    materializationStage: 'after-global-ranking-and-pagination',
    responseTransportVersion: 'major-bands-response-compact-v3972_5',
    scoreTransferBudgetChars: 1200000,
    schoolTransferBudgetChars: 300000,
    responseBudgetBytes: 260000,
    transientRetryMaxAttempts: 3,
    transientRetryBackoffMs: '250,500',
    transientRetryPolicyVersion: 'major-bands-transient-retry-v3972_5',
    bucketCacheVersion: 'major-bands-bucket-cache-v3972_5',
    bucketCacheOwner: '/functions/api/major-bands.js',
    bucketCacheImplementation: '/functions/_lib/major-bands-bucket-cache.v3972_5.js',
    bucketCacheTtlSeconds: 300,
    bucketCacheKeyScope: 'all-business-inputs-plus-cache-version',
    bucketCacheKeyExcludes: 'stress,requestToken,bucketAttempt',
    bucketCacheSuccessOnly: true,
    staticProvider: '/functions/_lib/major-bands-static-provider.js',
    schemaVersion: 'major-bands-bounded-fanout-v3972_5',
    allowedConsumers: ['ln-rank', 'production-verification'],
    allowedAdapters: [
      '/functions/api/major-bands-bucket.js',
      '/functions/_lib/major-bands-static-provider.js',
      '/functions/_lib/major-bands-bucket-engine.js',
      '/functions/_lib/major-bands-bucket-cache.v3972_5.js',
      '/functions/_lib/major-bands-bucket-transfer.v3972_5.js'
    ],
    forbiddenLiterals: ['Promise.all(selected.buckets.map'],
    validationTools: [
      '/tools/audit-major-bands-bounded-fanout-v3972_5.mjs',
      '/tools/verify-production-v3971.mjs',
      '/.github/workflows/verify-production-api-health-v3971.yml'
    ]
  }),
  familyAction: entry({
    ...(STABLE_RESOURCE_EXECUTION_REGISTRY.familyAction || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.familyPlanEntry,
    shellOwner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    schemaVersion: 'family-action-v3972_5',
    validationTools: ['/tools/audit-site-runtime-generation-v3972_5.mjs', '/tools/browser-family-action-v3970.mjs']
  })
});

export function getResourceExecutionOwner(id) {
  return RESOURCE_EXECUTION_REGISTRY[id] || null;
}
