import { CURRENT_RELEASE } from '../resources/release/current-release.js?v=3972_6';

export const PRODUCTION_RESOURCE_VERIFICATION_CONTRACT = Object.freeze({
  version: 'production-resource-graph-verification-v3972_6',
  statusContext: 'production/resource-graph-v3972.6',
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
    siteRuntimeContract: '/shared/resources/release/site-runtime-contract.v3972_6.js',
    runtimeCache: '/shared/resources/release/runtime-cache-contract.v3972_6.js',
    resourceRegistry: '/shared/resources/resource-registry.js',
    uiRegistry: '/shared/ui/ui-resource-registry.v3972_6.js',
    executionContract: '/shared/governance/resource-execution-contract.v3972_6.js',
    productionContract: '/shared/governance/production-resource-verification-contract.v3972_6.js',
    activeManifest: '/ln-rank/site-active-generation.v3972_6.json',
    selectionPage: '/ln-rank/',
    interactionRuntime: '/shared/ui/interaction/interaction-transaction.v3972_6.js',
    interactionStyles: '/shared/ui/interaction/interaction-transaction.v3972_6.css',
    selectionBootstrap: '/ln-rank/js/app.v3972_6.js',
    selectionRuntime: '/ln-rank/js/app-runtime.v3972_6.js',
    selectionWorkspace: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3972_6.js',
    selfCheck: '/ln-rank/self-check.html',
    selfCheckRuntime: '/ln-rank/js/self-check.v3972_6.js'
  }),
  retiredResources: Object.freeze([
    '/ln-rank/active-assets.json',
    '/ln-rank/release-meta.json'
  ]),
  dynamicResources: Object.freeze({
    runtimeHealth: '/api/ln-rank-runtime-health'
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
    customHtmlChallengeBoundarySeparate: true
  })
});
