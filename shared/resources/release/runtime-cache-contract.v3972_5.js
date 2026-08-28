import { SITE_RUNTIME_CONTRACT } from './site-runtime-contract.v3972_5.js?v=3972_5';

const activeGenerationModules = Object.freeze([
  '/shared/resources/release/release-presenter.v3972_5.js',
  '/shared/resources/release/runtime-cache-contract.v3972_5.js',
  '/shared/governance/resource-execution-contract.v3972_5.js',
  '/shared/ui/shell/family-shell.v3972_5.js',
  '/shared/ui/shell/family-shell.v3972_5.css',
  '/shared/ui/components/family-plan-entry.v3972_5.js',
  '/shared/ui/components/family-plan-entry.v3972_5.css',
  '/shared/ui/interaction/interaction-transaction.v3972_5.js',
  '/shared/ui/interaction/interaction-transaction.v3972_5.css',
  '/ln-rank/js/ux/family-home.v3972_5.js',
  '/ln-rank/js/app.v3972_5.js',
  '/ln-rank/js/app-runtime.v3972_5.js',
  '/ln-rank/js/workspace/selection-workspace-orchestrator.v3972_5.js',
  '/ln-rank/js/selection-pool.v3972_5.js',
  '/ln-rank/js/selection-pool-runtime.v3972_5.js'
]);

export const LN_RANK_RUNTIME_CACHE_CONTRACT = Object.freeze({
  version: 'runtime-cache-coherence-v3972_5',
  releaseVersion: SITE_RUNTIME_CONTRACT.releaseVersion,
  assetVersion: SITE_RUNTIME_CONTRACT.generation,
  siteRuntimeContractVersion: SITE_RUNTIME_CONTRACT.version,
  entrypoints: SITE_RUNTIME_CONTRACT.activeEntrypoints,
  owners: Object.freeze({
    registry: '/shared/resources/release/runtime-cache-contract.v3972_5.js',
    release: SITE_RUNTIME_CONTRACT.owners.release,
    execution: SITE_RUNTIME_CONTRACT.owners.execution,
    home: SITE_RUNTIME_CONTRACT.owners.home,
    bootstrap: SITE_RUNTIME_CONTRACT.owners.selectionBootstrap,
    searchRuntime: SITE_RUNTIME_CONTRACT.owners.selectionRuntime,
    searchState: SITE_RUNTIME_CONTRACT.owners.selectionWorkspace,
    interaction: SITE_RUNTIME_CONTRACT.owners.interaction,
    disclosure: SITE_RUNTIME_CONTRACT.owners.disclosure,
    auxiliaryNavigation: SITE_RUNTIME_CONTRACT.owners.auxiliaryNavigation,
    familyAction: SITE_RUNTIME_CONTRACT.owners.familyPlanEntry,
    familyPlanBootstrap: SITE_RUNTIME_CONTRACT.owners.familyPlanBootstrap
  }),
  activeGenerationModules,
  stableDependencies: SITE_RUNTIME_CONTRACT.stableDependencies,
  policies: Object.freeze({
    changedInterfacesImmutable: true,
    htmlRevalidate: true,
    runtimeFailureHonest: true,
    executionOwnerRequired: true,
    oneActiveGeneration: true,
    activeEntrypointsMustMatchGeneration: true,
    stableDependenciesMustBeDeclared: true,
    auxiliaryNavigationSingleOwner: true,
    nativeChooserStableFrameGateRequired: true,
    productionReleaseVerificationRequired: true,
    protectedRuntimeUnchanged: true
  })
});
