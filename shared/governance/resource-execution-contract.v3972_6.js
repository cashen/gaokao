import {
  RESOURCE_EXECUTION_REGISTRY as PREVIOUS_RESOURCE_EXECUTION_REGISTRY
} from './resource-execution-contract.v3972_5.js?v=3972_5';
import { SITE_RUNTIME_CONTRACT } from '../resources/release/site-runtime-contract.v3972_6.js?v=3972_6';

export const RESOURCE_EXECUTION_VERSION = 'resource-execution-v3972_6';

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
    generatedArtifacts: ['/ln-rank/site-active-generation.v3972_6.json'],
    validationTools: [
      '/tools/audit-site-runtime-generation-v3972_6.mjs',
      '/tools/browser-native-chooser-activation-v3972_6.mjs',
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
      '/shared/ui/shell/family-shell.v3972_5.js',
      '/shared/ui/components/family-plan-entry.v3972_5.js',
      '/ln-rank/js/ux/family-home.v3972_5.js',
      '/ln-rank/js/app.v3972_4.js',
      '/ln-rank/js/app.v3972_5.js',
      '/ln-rank/js/app-runtime.v3972_4.js',
      '/ln-rank/js/app-runtime.v3972_5.js',
      '/ln-rank/js/workspace/selection-workspace-orchestrator.v3972_4.js',
      '/ln-rank/js/workspace/selection-workspace-orchestrator.v3972_5.js',
      '/ln-rank/js/selection-pool.v3972_5.js',
      '/ln-rank/js/selection-pool-runtime.v3972_5.js'
    ],
    forbiddenLiterals: [
      'data-ui-interaction-version="interaction-transaction-v3972_5"',
      'app.v3972_5.js?v=3972_5',
      'interaction-transaction.v3972_5.js?v=3972_5',
      'family-home.v3972_5.js?v=3972_5',
      'family-shell.v3972_5.js?v=3972_5',
      'selection-pool.v3972_5.js?v=3972_5'
    ],
    generatedArtifacts: ['/ln-rank/site-active-generation.v3972_6.json'],
    validationTools: ['/tools/audit-site-runtime-generation-v3972_6.mjs']
  }),
  interaction: entry({
    owner: SITE_RUNTIME_CONTRACT.owners.interaction,
    cssOwner: SITE_RUNTIME_CONTRACT.activeEntrypoints.interactionStyles.split('?')[0],
    disclosureOwner: SITE_RUNTIME_CONTRACT.owners.disclosure,
    auxiliaryNavigationOwner: SITE_RUNTIME_CONTRACT.owners.auxiliaryNavigation,
    nativeChooserActivationOwner: SITE_RUNTIME_CONTRACT.owners.nativeChooserActivation,
    schemaVersion: 'interaction-transaction-v3972_6',
    activationContractVersion: 'native-chooser-activation-integrity-v3972_6',
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
      '/tools/audit-site-runtime-generation-v3972_6.mjs',
      '/tools/browser-native-chooser-activation-v3972_6.mjs'
    ]
  }),
  home: entry({
    ...(PREVIOUS_RESOURCE_EXECUTION_REGISTRY.home || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.home,
    shellOwner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    releaseOwner: SITE_RUNTIME_CONTRACT.owners.release,
    schemaVersion: 'family-home-runtime-v3972_6',
    classification: 'current-generation',
    validationTools: ['/tools/audit-site-runtime-generation-v3972_6.mjs', '/tools/browser-home-release-v3972_6.mjs']
  }),
  uiComponents: entry({
    ...(PREVIOUS_RESOURCE_EXECUTION_REGISTRY.uiComponents || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    familyPlanEntry: SITE_RUNTIME_CONTRACT.owners.familyPlanEntry,
    schemaVersion: 'ui-component-execution-v3972_6',
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
    validationTools: ['/tools/audit-site-runtime-generation-v3972_6.mjs', '/tools/browser-family-action-v3972_6.mjs']
  }),
  majorBands: PREVIOUS_RESOURCE_EXECUTION_REGISTRY.majorBands,
  familyAction: entry({
    ...(PREVIOUS_RESOURCE_EXECUTION_REGISTRY.familyAction || {}),
    owner: SITE_RUNTIME_CONTRACT.owners.familyPlanEntry,
    shellOwner: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    bootstrapOwner: SITE_RUNTIME_CONTRACT.owners.familyPlanBootstrap,
    runtimeOwner: SITE_RUNTIME_CONTRACT.owners.familyPlanRuntime,
    schemaVersion: 'family-action-v3972_6',
    classification: 'current-generation',
    validationTools: ['/tools/audit-site-runtime-generation-v3972_6.mjs', '/tools/browser-family-action-v3972_6.mjs']
  })
});

export function getResourceExecutionOwner(id) {
  return RESOURCE_EXECUTION_REGISTRY[id] || null;
}
