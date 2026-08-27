import { CURRENT_RELEASE } from './current-release.js';

export const ACTIVE_RESOURCE_MANIFEST_VERSION = 'active-resource-manifest-v3990_2';

const entry = (owner, classification, details = {}) => Object.freeze({
  owner,
  classification,
  releaseVersion: CURRENT_RELEASE.version,
  runtimeGeneration: CURRENT_RELEASE.siteRuntimeGeneration,
  ...details
});

export const ACTIVE_RESOURCE_MANIFEST = Object.freeze({
  version: ACTIVE_RESOURCE_MANIFEST_VERSION,
  release: Object.freeze({
    version: CURRENT_RELEASE.version,
    generation: CURRENT_RELEASE.siteRuntimeGeneration,
    assetQuery: CURRENT_RELEASE.asset,
    releaseOwner: CURRENT_RELEASE.resourceOwners.release,
    releaseFooter: entry(CURRENT_RELEASE.resourceOwners.releaseFooter, 'current-generation'),
    releaseFooterStyles: entry(CURRENT_RELEASE.resourceOwners.releaseFooterStyles, 'current-generation'),
    releaseLog: CURRENT_RELEASE.resourceOwners.releaseLog
  }),
  lnRankHumanQueryInput: entry(CURRENT_RELEASE.resourceOwners.lnRankHumanQueryInput, 'current-generation', {
    featureVersion: CURRENT_RELEASE.lnRankHumanQueryInputVersion,
    revision: CURRENT_RELEASE.lnRankCacheRevision,
    cacheRevision: CURRENT_RELEASE.lnRankCacheRevision,
    contract: 'typed-draft-confirm-commit-v001'
  }),
  lnRankMajorFilterContext: entry(CURRENT_RELEASE.resourceOwners.lnRankMajorFilterContext, 'current-generation', {
    featureVersion: CURRENT_RELEASE.lnRankMajorFilterContextVersion,
    revision: CURRENT_RELEASE.lnRankCacheRevision,
    contract: 'shared-major-confirm-before-submit-v001',
    modes: Object.freeze(['score-bands', 'school-all', 'major-all'])
  }),
  moduleNavigation: entry(CURRENT_RELEASE.resourceOwners.moduleNavigation, 'current-generation', {
    implementationVersion: CURRENT_RELEASE.moduleNavigationVersion,
    stylesOwner: CURRENT_RELEASE.resourceOwners.moduleNavigationStyles,
    stylesVersion: CURRENT_RELEASE.moduleNavigationStylesVersion,
    featureVersion: CURRENT_RELEASE.lnRankHumanQueryInputVersion,
    revision: CURRENT_RELEASE.lnRankHumanQueryInputRevision,
    cacheRevision: CURRENT_RELEASE.lnRankCacheRevision
  }),
  selectionWorkspace: Object.freeze({
    classification: 'current-generation-with-declared-stable-implementation',
    owner: CURRENT_RELEASE.resourceOwners.searchIntentState,
    stableImplementation: entry(CURRENT_RELEASE.resourceOwners.selectionWorkspaceStableImplementation, 'declared-stable-dependency', {
      implementationVersion: CURRENT_RELEASE.selectionWorkspaceStableImplementationVersion,
      featureVersion: CURRENT_RELEASE.lnRankHumanQueryInputVersion,
      revision: CURRENT_RELEASE.lnRankHumanQueryInputRevision,
      majorFilterContext: CURRENT_RELEASE.lnRankMajorFilterContextVersion
    })
  }),
  aiplus: Object.freeze({
    classification: 'current-generation-with-declared-transitive-implementation',
    browserOwner: CURRENT_RELEASE.resourceOwners.aiRuntime,
    workspaceOwner: CURRENT_RELEASE.resourceOwners.aiWorkspaceContract,
    transitiveImplementation: Object.freeze({
      workspaceContract: entry('/shared/ai/ai-workspace-contract.v3992_0.js?v=002_4&fdw=003_0', 'declared-transitive-implementation', {
        implementationGeneration: 'v3992_0',
        modelGeneration: 'v3992_1'
      }),
      render: entry('/aiplus/render.v3992_0.js?v=002_4&fdw=003_0&focus=006_0', 'declared-transitive-implementation', {
        implementationGeneration: 'v3992_0'
      }),
      history: entry('/aiplus/history-store.v3992_4.js?v=002_4&fdw=003_0', 'declared-transitive-implementation', {
        implementationGeneration: 'v3992_4',
        persistenceOwner: 'aiplus-history-store'
      }),
      factBridge: entry('/shared/ai/ai-workspace-contract.v3992_0.js?v=002_4&fdw=003_0', 'declared-transitive-implementation', {
        implementationGeneration: 'ai-fact-bridge-v3992_10'
      })
    }),
    policy: 'one-workspace-one-history-one-render-owner; transitive implementation must be declared and cannot become a second site release'
  }),
  majorSourceProfile: Object.freeze({
    classification: 'current-data-resource-additive-knowledge',
    owner: '/ln-rank/kb/major-understanding/major-source-profile.generated.js',
    manifestVersion: 'pr194-major-source-profile-v001',
    source: 'eo.srgaoxiao.cn',
    sourceApi: '/api/specialties/{slug}',
    retrievedAt: '2026-08-24',
    canonicalIdentityOwner: CURRENT_RELEASE.resourceOwners.majors,
    chunkCount: 13,
    chunkCacheIdentities: Object.freeze(['pr194', 'pr194-flow002']),
    policy: 'source-backed-explanation-only; never admissions truth; code-bound to canonical 2026 major catalog'
  }),
  schoolDirectory: Object.freeze({
    classification: 'current-shared-school-resource-with-legacy-compatible-loader',
    identityOwner: CURRENT_RELEASE.resourceOwners.schoolIdentity,
    resourceCenter: '/shared/resources/schools/school-resource-center.js',
    directoryLoader: '/tongxue/data/school-name-resolver-v150.js',
    directoryData: '/tongxue/data/school-search-index.20260617-v150.json',
    admissionDirectory: CURRENT_RELEASE.resourceOwners.schoolAdmissionDirectory,
    policy: 'one-school-identity-truth; bounded shared directory loading; compatibility exports may not create a second entity truth'
  }),
  verification: Object.freeze({
    sourceGraphOwner: CURRENT_RELEASE.resourceOwners.resourceRegistry,
    runtimeGraphOwner: CURRENT_RELEASE.resourceOwners.siteRuntimeContract,
    cacheGraphOwner: CURRENT_RELEASE.resourceOwners.runtimeCache,
    executionGraphOwner: CURRENT_RELEASE.resourceOwners.resourceExecution,
    productionGraphOwner: CURRENT_RELEASE.resourceOwners.productionResourceVerification,
    noUnclassifiedBrowserResource: true,
    activePublicVersion: CURRENT_RELEASE.version
  })
});

export function getActiveResourceManifest() {
  return ACTIVE_RESOURCE_MANIFEST;
}
