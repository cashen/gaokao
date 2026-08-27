import { SITE_RUNTIME_CONTRACT } from './site-runtime-contract.v3990_2.js?v=3990_2&r=r036-major-history-rank-lazy';

const activeGenerationModules = Object.freeze([
  '/shared/resources/release/active-resource-manifest.v3990_2.js',
  '/shared/resources/release/release-presenter.v3990_2.js',
  '/shared/resources/release/runtime-cache-contract.v3990_2.js',
  '/shared/governance/resource-execution-contract.v3990_2.js',
  '/functions/_lib/major-bands-rank-index.v3990_2.js',
  '/functions/_lib/major-bands-rank-query-kernel.v3990_2.js',
  '/functions/_lib/major-bands-rank-bucket-loader.v3990_2.js',
  '/functions/_lib/major-bands-result-order.v3990_2.js',
  '/functions/_lib/major-bands-response-transport.v3990_2.js',
  '/shared/ui/shell/family-shell.v3990_2.js',
  '/shared/ui/components/family-plan-entry.v3990_2.js',
  '/shared/ui/interaction/interaction-transaction.v3990_2.js',
  '/shared/ui/interaction/interaction-transaction.v3990_2.css',
  '/ln-rank/js/ux/family-home.v3990_2.js',
  '/ln-rank/js/app.v3990_2.js',
  '/ln-rank/js/app-runtime.v3990_2.js',
  '/ln-rank/js/feature/major-pool/pagination-snapshot-guard.v3990_2.js',
  '/ln-rank/js/workspace/selection-workspace-orchestrator.v3990_2.js',
  '/ln-rank/js/selection-pool.v3990_2.js',
  '/ln-rank/js/selection-pool-runtime.v3990_2.js'
]);

const declaredTransitiveImplementationModules = Object.freeze([
  '/shared/ai/ai-workspace-contract.v3992_0.js?v=002_4&fdw=003_0',
  '/aiplus/render.v3992_0.js?v=002_4&fdw=003_0&focus=006_0',
  '/aiplus/history-store.v3992_4.js?v=002_4&fdw=003_0'
]);

const declaredCurrentDataModules = Object.freeze([
  '/ln-rank/kb/major-understanding/major-source-profile.generated.js'
]);

const declaredStableActiveModules = Object.freeze([
  '/shared/ui/shell/family-shell.v3972_5.css',
  '/shared/ui/components/family-plan-entry.v3972_5.css'
]);

export const LN_RANK_RUNTIME_CACHE_CONTRACT = Object.freeze({
  version: 'runtime-cache-coherence-v3990_2',
  releaseVersion: SITE_RUNTIME_CONTRACT.releaseVersion,
  assetVersion: SITE_RUNTIME_CONTRACT.generation,
  siteRuntimeContractVersion: SITE_RUNTIME_CONTRACT.version,
  entrypoints: SITE_RUNTIME_CONTRACT.activeEntrypoints,
  entrypointClassifications: SITE_RUNTIME_CONTRACT.activeEntrypointClassifications,
  owners: Object.freeze({
    registry: '/shared/resources/release/runtime-cache-contract.v3990_2.js',
    activeResourceManifest: '/shared/resources/release/active-resource-manifest.v3990_2.js',
    release: SITE_RUNTIME_CONTRACT.owners.release,
    execution: SITE_RUNTIME_CONTRACT.owners.execution,
    majorBandsRankIndex: SITE_RUNTIME_CONTRACT.owners.majorBandsRankIndex,
    majorBandsQueryKernel: SITE_RUNTIME_CONTRACT.owners.majorBandsQueryKernel,
    majorBandsBucketLoader: SITE_RUNTIME_CONTRACT.owners.majorBandsBucketLoader,
    majorBandsResultOrder: SITE_RUNTIME_CONTRACT.owners.majorBandsResultOrder,
    majorBandsResponseTransport: SITE_RUNTIME_CONTRACT.owners.majorBandsResponseTransport,
    home: SITE_RUNTIME_CONTRACT.owners.home,
    sharedShell: SITE_RUNTIME_CONTRACT.owners.sharedShell,
    bootstrap: SITE_RUNTIME_CONTRACT.owners.selectionBootstrap,
    searchRuntime: SITE_RUNTIME_CONTRACT.owners.selectionRuntime,
    majorBandsPaginationSnapshotGuard: SITE_RUNTIME_CONTRACT.owners.selectionRuntime,
    searchState: SITE_RUNTIME_CONTRACT.owners.selectionWorkspace,
    interaction: SITE_RUNTIME_CONTRACT.owners.interaction,
    nativeChooserActivation: SITE_RUNTIME_CONTRACT.owners.nativeChooserActivation,
    disclosure: SITE_RUNTIME_CONTRACT.owners.disclosure,
    auxiliaryNavigation: SITE_RUNTIME_CONTRACT.owners.auxiliaryNavigation,
    familyAction: SITE_RUNTIME_CONTRACT.owners.familyPlanEntry,
    familyPlanBootstrap: SITE_RUNTIME_CONTRACT.owners.familyPlanBootstrap,
    familyPlanRuntime: SITE_RUNTIME_CONTRACT.owners.familyPlanRuntime
  }),
  activeGenerationModules,
  declaredTransitiveImplementationModules,
  declaredCurrentDataModules,
  declaredStableActiveModules,
  stableDependencies: SITE_RUNTIME_CONTRACT.stableDependencies,
  transitiveImplementationManifest: SITE_RUNTIME_CONTRACT.owners.resourceManifest,
  dataResourceManifest: SITE_RUNTIME_CONTRACT.owners.resourceManifest,
  policies: Object.freeze({
    changedInterfacesImmutable: true,
    htmlRevalidate: true,
    runtimeFailureHonest: true,
    executionOwnerRequired: true,
    oneActiveGeneration: true,
    activeEntrypointsMustMatchGenerationOrDeclaredStableDependency: true,
    stableDependenciesMustBeDeclared: true,
    currentInfrastructureCannotImportRetiredReleaseQuery: true,
    auxiliaryNavigationSingleOwner: true,
    nativeChooserActivationSingleOwner: true,
    nativeChooserPreActivationDomMutationForbidden: true,
    nativeChooserSinglePhysicalEventFamilyRequired: true,
    nativeChooserTailGuardAfterOutcomeRequired: true,
    productionReleaseVerificationRequired: true,
    protectedRuntimeUnchanged: true,
    majorBandsRankBucketCacheBounded: true,
    majorBandsSnapshotOrderStable: true,
    majorBandsBrowserSnapshotGuardBounded: true,
    majorBandsBrowserSnapshotMismatchRejectedBeforeMerge: true,
    majorBandsPublicHttpSelfFanoutForbidden: true
  })
});
