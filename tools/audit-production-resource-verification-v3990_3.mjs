import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { PRODUCTION_RESOURCE_VERIFICATION_CONTRACT as CONTRACT } from '../shared/governance/production-resource-verification-contract.v3990_3.js';

const read = path => fs.readFileSync(path, 'utf8');
const exists = value => fs.existsSync(String(value).split('?')[0].replace(/^\//, ''));
const manifest = JSON.parse(read('ln-rank/site-active-generation.v3990_3.json'));

function containsAll(source, markers, label) {
  for (const marker of markers) assert.ok(source.includes(marker), `${label} missing ${marker}`);
}
function excludesAll(source, markers, label) {
  for (const marker of markers) assert.ok(!source.includes(marker), `${label} retains forbidden ${marker}`);
}

const PAGINATION_GUARD = '/ln-rank/js/feature/major-pool/pagination-snapshot-guard.v3990_3.js';
const QUERY_CACHE_VERSION = 'major-bands-query-execution-cache-single-heavy-v3990_3';
const EXECUTION_GATE_VERSION = 'major-bands-query-execution-gate-v3990_3';
const QUERY_MEMORY_MODE = 'requested-band-lightweight-order-current-page-v3990_3';
const REQUEST_BAND_LOADER_VERSION = 'major-bands-rank-bucket-loader-bounded-all-band-v3990_3';
const RESULT_ORDER_VERSION = 'major-bands-result-order-ephemeral-v3990_3';

assert.equal(CONTRACT.version, 'production-resource-graph-verification-v3990_3');
assert.equal(CONTRACT.statusContext, 'production/resource-graph-v3990.1');
assert.equal(CONTRACT.releaseVersion, CURRENT_RELEASE.display);
assert.equal(CONTRACT.generation, CURRENT_RELEASE.siteRuntimeGeneration);
assert.equal(CONTRACT.queryVersion, CURRENT_RELEASE.asset);
assert.equal(CONTRACT.resourceGraphVersion, CURRENT_RELEASE.sharedResourceGraphVersion);
assert.equal(CONTRACT.uiRegistryVersion, CURRENT_RELEASE.uiResourceRegistryVersion);
assert.equal(CONTRACT.cssGraphVersion, CURRENT_RELEASE.cssResourceGraphVersion);
assert.equal(CONTRACT.dataGraphVersion, CURRENT_RELEASE.dataResourceGraphVersion);
assert.equal(CONTRACT.interactionVersion, CURRENT_RELEASE.interactionVersion);
assert.equal(CONTRACT.nativeChooserActivationVersion, CURRENT_RELEASE.nativeChooserActivationVersion);
assert.equal(CONTRACT.pagesBase, 'https://gaokao-4y9.pages.dev');
assert.equal(CONTRACT.customBase, 'https://gaokao.powers.org.cn');
assert.equal(CONTRACT.requiredStaticResources.majorBandsPaginationSnapshotGuard, PAGINATION_GUARD);
for (const value of Object.values(CONTRACT.requiredStaticResources)) assert.ok(exists(value), `missing production resource ${value}`);
for (const value of CONTRACT.retiredResources) assert.ok(!exists(value), `retired production resource remains ${value}`);
for (const [key, value] of Object.entries(CONTRACT.policies)) assert.equal(value, true, `production policy disabled ${key}`);
assert.equal(CONTRACT.dynamicResources.runtimeHealth, '/api/ln-rank-runtime-health');
assert.ok(CONTRACT.dynamicResources.majorBandsHealth.includes('/api/major-bands-health'));
assert.ok(CONTRACT.dynamicResources.majorBandsStandard.includes('rangePreset=standard'));
assert.ok(CONTRACT.dynamicResources.majorBandsWide.includes('rangePreset=wide'));
assert.ok(CONTRACT.dynamicResources.majorBandsSafe.includes('rangePreset=safe'));
assert.ok(CONTRACT.dynamicResources.majorBandsHighBoundary.includes('candidateScore=750'));

assert.equal(manifest.resourceGraph.productionVerificationVersion, CONTRACT.version);
assert.equal(manifest.resourceGraph.productionVerificationOwner, '/shared/governance/production-resource-verification-contract.v3990_3.js');
assert.equal(manifest.policies.productionVerificationStatusRequired, true);
assert.equal(manifest.interactionContract.version, CONTRACT.interactionVersion);
assert.equal(manifest.interactionContract.activationVersion, CONTRACT.nativeChooserActivationVersion);
assert.equal(manifest.currentGenerationInternalModules.majorBandsPaginationSnapshotGuard, `${PAGINATION_GUARD}?v=3990_3`);
assert.equal(manifest.policies.currentInternalModulesDeclared, true);
assert.equal(manifest.policies.majorBandsBrowserSnapshotGuardBounded, true);
assert.equal(manifest.policies.majorBandsBrowserSnapshotMismatchRejectedBeforeMerge, true);

const productionWorkflow = read('.github/workflows/verify-production-resource-graph-v3972_6.yml');
containsAll(productionWorkflow, [
  'branches: [main]', 'statuses: write', 'production/resource-graph-v3990.1',
  'verify-production-resource-graph-v3990_3.mjs',
  'verify-production-pagination-snapshot-guard-v3990_3.mjs',
  'pagination-snapshot-guard.v3990_3.js', 'PRODUCTION_PAGINATION_SNAPSHOT_EVIDENCE',
  'Wait for bounded rank-query production deployment', QUERY_CACHE_VERSION,
  REQUEST_BAND_LOADER_VERSION, RESULT_ORDER_VERSION,
  '\"publicHttpSelfFanout\":false', '\"bucketWorkerCount\":0',
  'PRODUCTION_RESOURCE_ATTEMPTS', 'PRODUCTION_RESOURCE_WAIT_MS'
], 'production workflow');
excludesAll(productionWorkflow, [
  '\"executionGateVersion\":\"major-bands-query-execution-gate-v3990_3\"',
  '\"maxConcurrentExecutions\":2', '\"crossRequestSemaphore\":true'
], 'production workflow unpublished API');

const deployWorkflow = read('.github/workflows/deploy-cloudflare-pages-main.yml');
containsAll(deployWorkflow, [
  'pull_request:', 'branches: [main]', 'types: [opened, synchronize, reopened, ready_for_review]',
  'source-contract:', 'deploy-production:', "github.event_name == 'push'",
  "display: 'v3.9.90.3'", "siteRuntimeGeneration: 'v3990_3'",
  'audit-canonical-release-version-v3990_3.mjs',
  'audit-production-resource-verification-v3990_3.mjs',
  'audit-site-runtime-generation-v3990_3.mjs',
  'wrangler@4.28.1 pages deploy .', '--commit-hash="$GITHUB_SHA"',
  'verify-production-resource-graph-v3990_3.mjs', 'verify-production-baseline-v3971.mjs',
  'EXPECTED_RELEASE: v3.9.90.3', 'RELEASE_SHA: ${{ github.sha }}',
  'cloudflare-pages-v3990-1-production'
], 'main deploy workflow');
for (const signature of ['wrangler@4.28.1 pages deploy .', '--commit-hash="$GITHUB_SHA"']) {
  const line = deployWorkflow.split('\n').find(candidate => candidate.includes(signature));
  assert.ok(line?.trimStart().startsWith('#'), `retired direct-upload signature became executable: ${signature}`);
}
excludesAll(deployWorkflow, ['distributed-bucket-workers', '/api/major-bands-bucket', 'major-bands-bucket-v3972_2'], 'main deploy workflow');

// v3990_3 intentionally keeps one maintained verifier algorithm per production
// concern. Current-generation adapters map only release/generation identity,
// execute from tools/ so relative imports remain valid, and delete the transient file.
const adapterPairs = [
  ['tools/verify-production-resource-graph-v3990_3.mjs', 'verify-production-resource-graph-v3990_0.mjs', '.verify-production-resource-graph-v3990_3.generated.mjs'],
  ['tools/verify-production-pagination-snapshot-guard-v3990_3.mjs', 'verify-production-pagination-snapshot-guard-v3990_0.mjs', '.verify-production-pagination-snapshot-guard-v3990_3.generated.mjs']
];
for (const [path, sourceName, generatedName] of adapterPairs) {
  const adapter = read(path);
  containsAll(adapter, [
    sourceName, generatedName,
    ".replaceAll('v3.9.90.0', 'v3.9.90.3')",
    ".replaceAll('v3990_0', 'v3990_3')",
    ".replaceAll('3990_0', '3990_3')",
    'pathToFileURL', 'await import', 'fs.rmSync'
  ], `${path} adapter`);
}

const verifierAlgorithm = read('tools/verify-production-resource-graph-v3990_0.mjs');
containsAll(verifierAlgorithm, [
  'CONTRACT.requiredStaticResources', 'CONTRACT.retiredResources', 'validateStaticSet', 'validatePages',
  'interactionRuntime', 'interactionStyles', 'runtimeHealth', 'productionVerificationVersion',
  'nativeChooserActivationVersion', 'verifyMajorBandsPagination', 'nextOffset did not strictly increase',
  'rank_unavailable_empty', 'isCloudflareManagedChallenge', "headers['cf-mitigated']",
  'customHtmlChallengeBoundarySeparate', 'custom API challenge not corroborated by HTML challenge boundary',
  'custom-domain-cloudflare-managed-challenge', "pagesMajorBands = await verifyMajorBandsBase('pages'"
], 'production verifier algorithm');

const snapshotAlgorithm = read('tools/verify-production-pagination-snapshot-guard-v3990_0.mjs');
containsAll(snapshotAlgorithm, [
  'CONTRACT.requiredStaticResources.majorBandsPaginationSnapshotGuard', 'createMajorBandsPaginationSnapshotGuard',
  'verifySourceStateMachine', 'pagination_snapshot_mismatch', 'currentGenerationInternalModules',
  'majorBandsBrowserSnapshotGuardBounded', 'majorBandsBrowserSnapshotMismatchRejectedBeforeMerge',
  'selection runtime snapshot owner', 'runtime cache snapshot registration', 'self-check snapshot coverage',
  'source guard retention exceeded budget', 'isCloudflareManagedChallenge', "headers['cf-mitigated']",
  'customHtmlChallengeBoundarySeparate', "mode: 'cloudflare-managed-challenge'", 'allowCloudflareChallenge: true',
  'manifestBoundary'
], 'pagination snapshot verifier algorithm');

const concurrencyAlgorithm = read('tools/verify-major-bands-preview-concurrency-v3990_0.mjs');
containsAll(concurrencyAlgorithm, [
  'queryExecutionCacheVersion', 'queryExecutionCacheStatus', 'rankRowFilterVersion',
  'rankRawRowCount', 'rankDecodedRowCount', 'rankRowsSkipped', 'source?.resultOrderVersion',
  'pagination?.order', 'requested-band performed more than one sort',
  'hidden ${hiddenBand} band was classified', "result.scenario === 'safe-449-near'"
], 'production concurrency verifier algorithm');
excludesAll(concurrencyAlgorithm, [
  'queryCacheState.crossRequestSemaphore', 'queryCacheState.boundedDistinctExecutions',
  'queryCacheState.maxConcurrentExecutions'
], 'production concurrency unpublished state');

const baselineVerifier = read('tools/verify-production-baseline-v3971.mjs');
containsAll(baselineVerifier, [
  "PREVIOUS_V3990_RELEASE = 'v3.9.90.0'", "CURRENT_V3990_RELEASE = 'v3.9.90.3'",
  'ALLOWED_RELEASES', 'BOUNDED_HEALTH_RELEASES', 'isCloudflareManagedChallenge',
  "headers['cf-mitigated']", "customDomain = 'managed-challenge'"
], 'production baseline verifier');

const executionCache = read('functions/_lib/major-bands-query-execution-cache.v3990_3.js');
containsAll(executionCache, [
  `MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION = '${QUERY_CACHE_VERSION}'`,
  `MAJOR_BANDS_QUERY_EXECUTION_GATE_VERSION = '${EXECUTION_GATE_VERSION}'`,
  'MAX_CONCURRENT_EXECUTIONS = 1', 'EXECUTION_SLOT_POLL_MS = 8', 'waitForOwnTimer',
  'requestOwnedTimerWait: true', 'crossRequestResolverQueue: false'
], 'bounded execution cache');
excludesAll(executionCache, ['executionWaiters', 'executionWaiters.push', 'executionWaiters.shift'], 'execution cache resolver queue');

const queryKernel = read('functions/_lib/major-bands-rank-query-kernel.v3990_3.js');
containsAll(queryKernel, [
  `MAJOR_BANDS_RANK_QUERY_MEMORY_MODE = '${QUERY_MEMORY_MODE}'`,
  'records?.majorBandsRequestedBand', 'records?.majorBandsMutateSourceRecords',
  'requestedBand && canonicalPosition.bandKey !== requestedBand',
  'const record = mutateSourceRecords ? source : { ...source }',
  'const sortKeys = requestedBand ? [requestedBand] : BAND_KEYS'
], 'requested-band query kernel');

const bucketLoader = read('functions/_lib/major-bands-rank-bucket-loader.v3990_3.js');
containsAll(bucketLoader, [
  `MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION = '${REQUEST_BAND_LOADER_VERSION}'`,
  'MAX_LOAD_CONCURRENCY = 1', 'ALL_BANDS_LOAD_CONCURRENCY = 3',
  'majorBandsRequestedBand', 'majorBandsMutateSourceRecords', 'allBandsMaxConcurrency: ALL_BANDS_LOAD_CONCURRENCY'
], 'rank bucket loader');

const resultOrder = read('functions/_lib/major-bands-result-order.v3990_3.js');
containsAll(resultOrder, [
  `MAJOR_BANDS_RESULT_ORDER_VERSION = '${RESULT_ORDER_VERSION}'`,
  'compactRankingTuple', 'const tuples = new WeakMap()', 'diversifyWithoutRecordCopies', 'deferred.push(record)'
], 'ephemeral result order');
excludesAll(resultOrder, ['record.rankingTrace =', 'deferred.push({ ...record', 'reasons: Object.freeze'], 'result order object graph');

const majorBandsApi = read('functions/api/major-bands.js');
containsAll(majorBandsApi, [
  'MAJOR_BANDS_ALL_BANDS_PAGE_LIMIT_CAP = 16',
  'requestForBand(context.request, sourceUrl, band, input.pageLimit)',
  'allBandsEffectivePageLimit: input.pageLimit',
  "MAJOR_BANDS_ALL_BANDS_EDGE_CACHE_VERSION = 'major-bands-all-bands-edge-cache-canonical-v3990_2'",
  "MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION = 'major-bands-requested-band-order-edge-cache-score-hints-v3990_2'",
  "MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION = 'major-bands-requested-band-page-score-hints-v3990_2'",
  "MAJOR_BANDS_REQUESTED_BAND_RESPONSE_EDGE_CACHE_VERSION = 'major-bands-requested-band-response-edge-cache-score-hints-v3990_2'",
  'selectRequestedBandPageBucketsByScoreHints',
  'requestedBandOrderPageBucketHintStatus',
  'requestedBandOrderPageScoreHints',
  'requestedBandResponseEdgeCacheRequest',
  'context?.majorBandsInternalBandRequest !== true',
  'predecodeRegion: filters.region',
  'MAJOR_BANDS_NON_BUSINESS_CACHE_PARAMS',
  "'production-resource-check'",
  'stripMajorBandsNonBusinessCacheParams(url)'
], 'major-bands API');

const staticProvider = read('functions/_lib/major-bands-static-provider.js');
containsAll(staticProvider, [
  "MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION = 'major-bands-rank-row-native-scan-v3990_2'",
  "MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION = 'major-bands-predecode-region-filter-v3990_2'",
  'readTopLevelArrayScalars',
  'allowedIds.has(String(scalarValues.get(idIndex)',
  'majorBandsRankValueMatchesRange(scalarValues.get(rankIndex), rankRange)',
  'const regionMatch = matchRegionRule',
  'const row = JSON.parse(rowText)'
], 'major-bands native static provider');

containsAll(bucketLoader, [
  'predecodeRegion: options.predecodeRegion',
  'predecodeRegionFilterVersion',
  'regionRowsSkipped'
], 'rank bucket regional predecode');

console.log(JSON.stringify({
  ok: true,
  release: CONTRACT.releaseVersion,
  generation: CONTRACT.generation,
  verification: CONTRACT.version,
  statusContext: CONTRACT.statusContext,
  requiredStaticResources: Object.keys(CONTRACT.requiredStaticResources).length,
  retiredResources: CONTRACT.retiredResources.length,
  verifierOwnership: 'thin-current-generation-adapters-plus-single-maintained-algorithm-source',
  paginationSnapshotGuard: PAGINATION_GUARD,
  queryExecutionCacheVersion: QUERY_CACHE_VERSION,
  executionGateVersion: EXECUTION_GATE_VERSION,
  queryMemoryMode: QUERY_MEMORY_MODE,
  resultOrderVersion: RESULT_ORDER_VERSION,
  maxConcurrentExecutions: 1,
  allBandBucketMaxConcurrency: 1,
  requestedBandBucketMaxConcurrency: 1,
  crossRequestResolverQueue: false,
  requestedBandFastPath: true,
  boundedExecutionProductionGate: true
}, null, 2));
