import { CURRENT_RELEASE } from './release/current-release.js?v=3990_3&r=r037-unified-min-score-navigation';
import { ACTIVE_RESOURCE_MANIFEST } from './release/active-resource-manifest.v3990_3.js?v=3990_3&r=r037-unified-min-score-navigation';
import {
  UI_RESOURCE_REGISTRY_VERSION,
  UI_ACTIVE_RESOURCE_REGISTRY,
  UI_ACTIVE_RESOURCE_CLASSIFICATIONS,
  UI_STABLE_RESOURCE_REGISTRY,
  UI_COMPONENT_REGISTRY,
  UI_CSS_RESOURCE_GRAPH
} from '../ui/ui-resource-registry.v3990_3.js?v=3990_3';

export const SHARED_RESOURCE_CENTER_VERSION = CURRENT_RELEASE.assetVersion;
export const SHARED_RESOURCE_GRAPH_VERSION = CURRENT_RELEASE.sharedResourceGraphVersion;
export const DATA_RESOURCE_GRAPH_VERSION = CURRENT_RELEASE.dataResourceGraphVersion;
export const RESOURCE_DECOMMISSION_POLICY_VERSION = CURRENT_RELEASE.resourceDecommissionPolicyVersion;
export const ACTIVE_RESOURCE_MANIFEST_VERSION = ACTIVE_RESOURCE_MANIFEST.version;

export const SHARED_RESOURCE_REGISTRY = Object.freeze({
  activeResourceManifest: ACTIVE_RESOURCE_MANIFEST,
  aiplusTransitive: ACTIVE_RESOURCE_MANIFEST.aiplus,
  majorSourceProfile: ACTIVE_RESOURCE_MANIFEST.majorSourceProfile,
  schoolDirectory: ACTIVE_RESOURCE_MANIFEST.schoolDirectory,
  minScoreNavigation: Object.freeze({
    id: CURRENT_RELEASE.minScoreNavigationVersion,
    module: CURRENT_RELEASE.resourceOwners.minScoreNavigation,
    cssOwner: CURRENT_RELEASE.resourceOwners.minScoreEntryStyles,
    policy: 'navigation-only-canonical-ln-rank-owner-no-network-no-duplicate-query-owner',
    consumers: Object.freeze(['major-path', 'tongxue'])
  }),
  release: Object.freeze({
    id: 'current-release',
    module: CURRENT_RELEASE.resourceOwners.release,
    activeManifest: CURRENT_RELEASE.resourceOwners.siteActiveManifest,
    policy: 'single-source-release-contract',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'feishu', 'self-check', 'production-verification'])
  }),
  governance: Object.freeze({
    id: 'whole-site-resource-graph',
    version: SHARED_RESOURCE_GRAPH_VERSION,
    module: CURRENT_RELEASE.resourceOwners.resourceRegistry,
    executionContract: CURRENT_RELEASE.resourceOwners.resourceExecution,
    uiRegistry: CURRENT_RELEASE.resourceOwners.uiResourceRegistry,
    activeManifest: CURRENT_RELEASE.resourceOwners.siteActiveManifest,
    decommissionPolicyVersion: RESOURCE_DECOMMISSION_POLICY_VERSION,
    policy: 'current-generation-or-declared-stable-dependency-with-reference-proof-before-removal',
    consumers: Object.freeze(['release-audit', 'css-audit', 'self-check', 'production-verification'])
  }),
  runtimeCache: Object.freeze({
    id: 'ln-rank-runtime-cache-coherence',
    module: CURRENT_RELEASE.resourceOwners.runtimeCache,
    policy: 'single-entry-immutable-changed-interface-and-honest-failure-state',
    consumers: Object.freeze(['ln-rank-search', 'ln-rank-selection-pool', 'release-audit', 'browser-regression'])
  }),
  interaction: Object.freeze({
    id: CURRENT_RELEASE.interactionVersion,
    activationVersion: CURRENT_RELEASE.nativeChooserActivationVersion,
    owner: CURRENT_RELEASE.resourceOwners.interactionRuntime,
    cssOwner: CURRENT_RELEASE.resourceOwners.interactionStyles,
    nativeChooserActivationOwner: CURRENT_RELEASE.resourceOwners.nativeChooserActivation,
    physicalEventFamilyPolicy: 'pointer-or-touch-mouse-fallback-never-both',
    preActivationPolicy: 'memory-only-no-dom-disabled-inert-or-pointer-events-mutation',
    tailGuardPolicy: 'begin-after-input-change-focus-return-or-bounded-close-signal',
    userAgentPolicy: 'no-browser-name-business-branch',
    consumers: Object.freeze(['ln-rank-browser', 'workspace-orchestrator', 'browser-regression', 'production-verification'])
  }),
  exam: Object.freeze({
    id: 'liaoning-physics-exam',
    module: CURRENT_RELEASE.resourceOwners.exam,
    supportedYears: Object.freeze([2024, 2025, 2026]),
    policy: 'single-source-three-year-static-module',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'card-ai', 'reports'])
  }),
  rankTables: Object.freeze({
    id: 'liaoning-physics-rank-tables',
    provider: CURRENT_RELEASE.resourceOwners.rankTables,
    examConfig: CURRENT_RELEASE.resourceOwners.exam,
    evidenceService: CURRENT_RELEASE.resourceOwners.historyScoreRankEvidence,
    evidenceContract: CURRENT_RELEASE.resourceOwners.historyEvidenceContract,
    presenter: CURRENT_RELEASE.resourceOwners.historyEvidencePresenter,
    cssOwner: CURRENT_RELEASE.resourceOwners.historyEvidenceStyles,
    supportedYears: Object.freeze([2024, 2025, 2026]),
    comparisonPopulationPolicy: 'undergraduate-control-line-cumulative',
    executionContract: CURRENT_RELEASE.resourceOwners.resourceExecution,
    policy: 'single-provider-exclusive-consumption-derived-trace-and-evidence',
    consumers: Object.freeze(['functions-api', 'card-ai', 'reports', 'selection-pool', 'school-search', 'trend-analysis'])
  }),
  regions: Object.freeze({
    id: 'china-region-catalog',
    module: CURRENT_RELEASE.resourceOwners.regions,
    interactionOwner: CURRENT_RELEASE.resourceOwners.nativeChooserActivation,
    policy: 'single-source-static-module-browser-owned-native-control-activation',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'school-profile', 'legacy-geo-adapter'])
  }),
  reports: Object.freeze({
    id: 'feishu-report-contract',
    module: CURRENT_RELEASE.resourceOwners.reports,
    yearCaliberVersion: 'ln-physics-report-years-v3966_0',
    frontend: CURRENT_RELEASE.resourceOwners.reportFrontend,
    historyEvidenceOwner: CURRENT_RELEASE.resourceOwners.historyScoreRankEvidence,
    policy: 'single-source-contract-client-year-caliber-evidence-and-operation-state',
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'path-analysis', 'self-check'])
  }),
  schools: Object.freeze({
    id: 'school-resource-center',
    module: '/shared/resources/schools/school-resource-center.js',
    identityModule: CURRENT_RELEASE.resourceOwners.schoolIdentity,
    profileModule: CURRENT_RELEASE.resourceOwners.schools,
    queryContract: CURRENT_RELEASE.resourceOwners.schoolQueryContract,
    queryEngine: CURRENT_RELEASE.resourceOwners.schoolQueryEngine,
    admissionDirectory: CURRENT_RELEASE.resourceOwners.schoolAdmissionDirectory,
    queryProvider: CURRENT_RELEASE.resourceOwners.schoolQueryProvider,
    buildKernel: '/tools/schools/school_resource_bundle.py',
    admissionDirectoryGenerator: '/tools/build-school-admission-directory-v3969.mjs',
    compactEntityPolicy: 'eager-small-static-module',
    fullDirectoryPolicy: 'lazy-single-flight',
    profilePolicy: 'server-sync-official-2026',
    identityPolicy: 'shared-upstream-tongxue-compatibility-export',
    queryPolicy: 'single-directory-single-identity-single-query-intent-and-admission-availability-owner',
    candidatePolicy: 'no-silent-truncation-record-count-tiebreak-only',
    profileFields: Object.freeze(['officialName', 'campusEntity', 'province', 'city', 'nature', '985', '211', 'doubleNon']),
    consumers: Object.freeze(['ln-rank-cards', 'selection-pool', 'reports', 'tongxue', 'school-search', 'score-search', 'future-school-tools', 'academic-background'])
  }),
  majors: Object.freeze({
    id: 'major-catalog-2026',
    resolverModule: CURRENT_RELEASE.resourceOwners.majors,
    policy: 'single-resolver-derived-runtime-formats',
    canonicalCount: 883,
    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'card-ai', 'reports', 'academic-background'])
  }),
  academicBackground: Object.freeze({
    id: 'academic-background-evidence-center',
    contract: CURRENT_RELEASE.resourceOwners.academicBackgroundContract,
    sourceRegistry: CURRENT_RELEASE.resourceOwners.academicBackgroundSources,
    provider: CURRENT_RELEASE.resourceOwners.academicBackgroundProvider,
    service: CURRENT_RELEASE.resourceOwners.academicBackgroundService,
    api: CURRENT_RELEASE.resourceOwners.academicBackgroundApi,
    matcher: CURRENT_RELEASE.resourceOwners.academicBackgroundMatcher,
    browserRuntime: CURRENT_RELEASE.resourceOwners.academicBackgroundRuntime,
    cssOwner: CURRENT_RELEASE.resourceOwners.academicBackgroundStyles,
    scopes: Object.freeze(['liaoning', '211']),
    admissionYears: Object.freeze([2026, 2025, 2024]),
    legacyInputs: Object.freeze(['/functions/_lib/local-mainline-kb.js', '/functions/_lib/211-mainline-kb.js']),
    policy: 'single-evidence-owner-single-provider-single-matcher-source-year-separated-from-admission-year',
    consumers: Object.freeze(['local-mainline', '211-mainline', 'functions-api', 'browser-regression', 'audits'])
  }),
  localStrength: Object.freeze({
    id: CURRENT_RELEASE.localStrengthDataVersion,
    page: CURRENT_RELEASE.resourceOwners.localStrengthPage,
    runtime: CURRENT_RELEASE.resourceOwners.localStrengthRuntime,
    css: Object.freeze([
      CURRENT_RELEASE.resourceOwners.localStrengthStyles,
      UI_STABLE_RESOURCE_REGISTRY.localStrengthScorePositionCss
    ]),
    data: CURRENT_RELEASE.resourceOwners.localStrengthData,
    audit: CURRENT_RELEASE.resourceOwners.localStrengthAudit,
    architecture: CURRENT_RELEASE.localStrengthArchitecture,
    policy: 'declared-stable-static-page-resource'
  }),
  all211: Object.freeze({
    id: CURRENT_RELEASE.all211DataVersion,
    page: CURRENT_RELEASE.resourceOwners.all211Page,
    runtime: CURRENT_RELEASE.resourceOwners.all211Runtime,
    css: CURRENT_RELEASE.resourceOwners.all211Styles,
    data: CURRENT_RELEASE.resourceOwners.all211Data,
    audit: CURRENT_RELEASE.resourceOwners.all211Audit,
    architecture: CURRENT_RELEASE.all211Architecture,
    policy: 'declared-stable-static-page-resource'
  }),
  majorBands: Object.freeze({
    id: CURRENT_RELEASE.majorBandsVersion,
    api: CURRENT_RELEASE.resourceOwners.majorBandsApi,
    rankIndex: CURRENT_RELEASE.resourceOwners.majorBandsRankIndex,
    rankIndexBuilder: CURRENT_RELEASE.resourceOwners.majorBandsRankIndexBuilder,
    queryKernel: CURRENT_RELEASE.resourceOwners.majorBandsOrchestrator,
    bucketLoader: CURRENT_RELEASE.resourceOwners.majorBandsRankBucketLoader,
    resultOrder: CURRENT_RELEASE.resourceOwners.majorBandsResultOrder,
    cacheOwner: CURRENT_RELEASE.resourceOwners.majorBandsBucketCacheOwner,
    cacheImplementation: CURRENT_RELEASE.resourceOwners.majorBandsBucketCache,
    responseTransport: CURRENT_RELEASE.resourceOwners.majorBandsResponseTransport,
    materializationOwner: CURRENT_RELEASE.resourceOwners.majorBandsMaterializationOwner,
    staticProvider: CURRENT_RELEASE.resourceOwners.majorBandsStaticProvider,
    stableBucketApi: CURRENT_RELEASE.resourceOwners.majorBandsBucketApi,
    stableBucketWorker: CURRENT_RELEASE.resourceOwners.majorBandsStableBucketWorker,
    dataArchitecture: 'immutable-score-buckets-with-derived-rank-window-index',
    executionArchitecture: 'single-worker-no-public-http-self-fanout-no-candidate-cap',
    paginationPolicy: 'stable-ordered-id-snapshot-strict-next-offset',
    policy: 'rank-primary-zero-loss-single-worker-page-only-materialization'
  }),
  ui: Object.freeze({
    id: 'family-ui-orchestration',
    version: UI_RESOURCE_REGISTRY_VERSION,
    registry: CURRENT_RELEASE.resourceOwners.uiResourceRegistry,
    pageCatalogAdapter: CURRENT_RELEASE.resourceOwners.uiPageCatalogAdapter,
    active: UI_ACTIVE_RESOURCE_REGISTRY,
    activeClassifications: UI_ACTIVE_RESOURCE_CLASSIFICATIONS,
    stable: UI_STABLE_RESOURCE_REGISTRY,
    components: UI_COMPONENT_REGISTRY,
    cssGraph: UI_CSS_RESOURCE_GRAPH,
    policy: 'single-current-ui-registry-explicit-current-generation-and-declared-stable-css-owners',
    consumers: Object.freeze(['home', 'ln-rank', 'selection-pool', 'ln2026', 'zy2026', 'tongxue', 'local-mainline', '211-mainline'])
  }),
  algorithms: Object.freeze({
    id: 'algorithm-execution-center',
    registry: CURRENT_RELEASE.resourceOwners.algorithms,
    resultRanking: CURRENT_RELEASE.resourceOwners.resultRanking,
    schoolQuery: CURRENT_RELEASE.resourceOwners.schoolQueryEngine,
    trendInterpretation: CURRENT_RELEASE.resourceOwners.trendInterpretation,
    academicBackgroundMatcher: CURRENT_RELEASE.resourceOwners.academicBackgroundMatcher,
    policy: 'single-algorithm-owner-with-intent-trace',
    consumers: Object.freeze(['functions-api', 'browser-runtime', 'selection-pool', 'reports', 'ai-facts', 'academic-background'])
  }),
  trends: Object.freeze({
    id: 'liaoning-major-trend',
    module: CURRENT_RELEASE.resourceOwners.trendResource,
    interpretation: CURRENT_RELEASE.resourceOwners.trendInterpretation,
    data: '/ln-rank/data/major-trend-2026.json',
    policy: 'single-resource-derived-artifact-with-source-trace',
    consumers: Object.freeze(['trend-page', 'selection-pool', 'reports', 'ai-facts'])
  }),
  auxiliaryLiaoningKeySubjects: Object.freeze({
    id: 'liaoning-key-subjects-history-tool',
    module: CURRENT_RELEASE.resourceOwners.liaoningKeySubjects,
    data: '/liaoning_key_subjects_phase2_tuition_data.js',
    selectionAlgorithm: CURRENT_RELEASE.resourceOwners.historicalRankSelection,
    policy: 'independent-experience-shared-release-rank-and-algorithm-owners',
    consumers: Object.freeze(['just-for-liaoning'])
  }),
  campusAssignments: Object.freeze({
    id: 'liaoning-major-campus-assignment',
    module: '/functions/_lib/kb/liaoning-campus-major-kb.generated.js',
    accessor: '/functions/_lib/kb/campus-accessor.js',
    policy: 'separate-major-to-campus-knowledge-linked-to-school-identity',
    consumers: Object.freeze(['cards', 'reports', 'review-checklist'])
  })
});

export function getSharedResource(id) {
  return SHARED_RESOURCE_REGISTRY[id] || null;
}
