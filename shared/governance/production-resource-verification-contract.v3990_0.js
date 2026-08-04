import { CURRENT_RELEASE } from '../resources/release/current-release.js?v=3990_0';

export const PRODUCTION_RESOURCE_VERIFICATION_CONTRACT = Object.freeze({
  version: 'production-resource-graph-verification-v3990_0',
  statusContext: 'production/resource-graph-v3990.0',
  releaseVersion: CURRENT_RELEASE.display,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  queryVersion: CURRENT_RELEASE.asset,
  resourceGraphVersion: CURRENT_RELEASE.sharedResourceGraphVersion,
  uiRegistryVersion: CURRENT_RELEASE.uiResourceRegistryVersion,
  cssGraphVersion: CURRENT_RELEASE.cssResourceGraphVersion,
  dataGraphVersion: CURRENT_RELEASE.dataResourceGraphVersion,
  interactionVersion: CURRENT_RELEASE.interactionVersion,
  nativeChooserActivationVersion: CURRENT_RELEASE.nativeChooserActivationVersion,
  pagesBase: 'https://gaokao-4y9.pages.dev',
  customBase: 'https://gaokao.powers.org.cn',
  requiredStaticResources: Object.freeze({
    release: '/shared/resources/release/current-release.js',
    siteRuntimeContract: '/shared/resources/release/site-runtime-contract.v3990_0.js',
    runtimeCache: '/shared/resources/release/runtime-cache-contract.v3990_0.js',
    resourceRegistry: '/shared/resources/resource-registry.js',
    uiRegistry: '/shared/ui/ui-resource-registry.v3990_0.js',
    executionContract: '/shared/governance/resource-execution-contract.v3990_0.js',
    productionContract: '/shared/governance/production-resource-verification-contract.v3990_0.js',
    activeManifest: '/ln-rank/site-active-generation.v3990_0.json',
    selectionPage: '/ln-rank/',
    interactionRuntime: '/shared/ui/interaction/interaction-transaction.v3990_0.js',
    interactionStyles: '/shared/ui/interaction/interaction-transaction.v3990_0.css',
    selectionBootstrap: '/ln-rank/js/app.v3990_0.js',
    selectionRuntime: '/ln-rank/js/app-runtime.v3990_0.js',
    selectionWorkspace: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3990_0.js',
    majorBandsPaginationSnapshotGuard: '/ln-rank/js/feature/major-pool/pagination-snapshot-guard.v3990_0.js',
    selfCheck: '/ln-rank/self-check.html',
    selfCheckRuntime: '/ln-rank/js/self-check.v3990_0.js'
  }),
  retiredResources: Object.freeze([
    '/ln-rank/active-assets.json',
    '/ln-rank/release-meta.json'
  ]),
  dynamicResources: Object.freeze({
    runtimeHealth: '/api/ln-rank-runtime-health',
    majorBandsHealth: '/api/major-bands-health?probe=1',
    majorBandsStandard: '/api/major-bands?candidateScore=579&rangePreset=standard&band=near&limit=37&offset=0',
    majorBandsWide: '/api/major-bands?candidateScore=680&rangePreset=wide&band=steady&limit=37&offset=0',
    majorBandsSafe: '/api/major-bands?candidateScore=449&rangePreset=safe&band=near&limit=37&offset=0',
    majorBandsHighBoundary: '/api/major-bands?candidateScore=750&rangePreset=wide&band=near&limit=37&offset=0'
  }),
  policies: Object.freeze({
    pagesStaticResourcesMustReturn200: true,
    customStaticResourcesMustReturn200: true,
    selectionPageMustMountCurrentInteraction: true,
    interactionRuntimeMustDeclarePreActivationIntegrity: true,
    interactionCssMustNotDisableHitTesting: true,
    retiredResourcesMustReturn404: true,
    runtimeHealthMustMatchGeneration: true,
    commitStatusRequired: true,
    sourceAndProductionEvidenceRequired: true,
    customHtmlChallengeBoundarySeparate: true,
    majorBandsRankKernelMustMatchSource: true,
    majorBandsPaginationMustExhaustIds: true,
    majorBandsNextOffsetMustAdvance: true,
    majorBandsHighBoundaryMustReturnEmpty200: true,
    majorBandsConcurrencyMustHaveZero1102AndZero5xx: true,
    majorBandsPaginationSnapshotGuardMustReturn200: true,
    majorBandsPaginationSnapshotGuardVersionMustMatch: true,
    majorBandsPaginationSnapshotManifestMustMatch: true,
    majorBandsPaginationSnapshotMismatchMustRejectBeforeMerge: true
  })
});
