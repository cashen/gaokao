import { CURRENT_RELEASE } from '../resources/release/current-release.js?v=3972_5';

export const PRODUCTION_RESOURCE_VERIFICATION_CONTRACT = Object.freeze({
  version: 'production-resource-graph-verification-v3972_5',
  statusContext: 'production/resource-graph-v3972.5',
  releaseVersion: CURRENT_RELEASE.display,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  resourceGraphVersion: CURRENT_RELEASE.sharedResourceGraphVersion,
  uiRegistryVersion: CURRENT_RELEASE.uiResourceRegistryVersion,
  cssGraphVersion: CURRENT_RELEASE.cssResourceGraphVersion,
  dataGraphVersion: CURRENT_RELEASE.dataResourceGraphVersion,
  pagesBase: 'https://gaokao-4y9.pages.dev',
  customBase: 'https://gaokao.powers.org.cn',
  requiredStaticResources: Object.freeze({
    release: '/shared/resources/release/current-release.js',
    resourceRegistry: '/shared/resources/resource-registry.js',
    uiRegistry: '/shared/ui/ui-resource-registry.v3972_5.js',
    activeManifest: '/ln-rank/site-active-generation.v3972_5.json',
    selfCheck: '/ln-rank/self-check.html',
    selfCheckRuntime: '/ln-rank/js/self-check.v3972_5.js'
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
    retiredResourcesMustReturn404: true,
    runtimeHealthMustMatchGeneration: true,
    commitStatusRequired: true,
    sourceAndProductionEvidenceRequired: true,
    customHtmlChallengeBoundarySeparate: true
  })
});
