import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { PRODUCTION_RESOURCE_VERIFICATION_CONTRACT as CONTRACT } from '../shared/governance/production-resource-verification-contract.v3990_0.js';

const manifest = JSON.parse(fs.readFileSync('ln-rank/site-active-generation.v3990_0.json', 'utf8'));
const exists = value => fs.existsSync(String(value).split('?')[0].replace(/^\//, ''));
const PAGINATION_SNAPSHOT_GUARD_PATH = '/ln-rank/js/feature/major-pool/pagination-snapshot-guard.v3990_0.js';
const PAGINATION_SNAPSHOT_GUARD_MANIFEST_PATH = `${PAGINATION_SNAPSHOT_GUARD_PATH}?v=3990_0`;
const QUERY_CACHE_VERSION = 'major-bands-query-execution-cache-single-heavy-v3990_0';
const EXECUTION_GATE_VERSION = 'major-bands-query-execution-gate-v3990_0';
const EXECUTION_GATE_MODE = 'request-owned-timer-polling';
const QUERY_MEMORY_MODE = 'requested-band-lightweight-order-current-page-v3990_0';
const REQUEST_BAND_LOADER_VERSION = 'major-bands-rank-bucket-loader-bounded-all-band-v3990_0';
const RANK_ROW_FILTER_VERSION = 'major-bands-rank-row-filter-v3990_0';
const RECORD_OWNERSHIP = 'miss-owned-hit-shallow-cloned-v3990_0';
const RESULT_ORDER_VERSION = 'major-bands-result-order-ephemeral-v3990_0';
const RANKING_MEMORY_MODE = 'ephemeral-compact-tuples-v3990_0';

assert.equal(CONTRACT.version, 'production-resource-graph-verification-v3990_0');
assert.equal(CONTRACT.statusContext, 'production/resource-graph-v3990.0');
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
assert.equal(CONTRACT.requiredStaticResources.majorBandsPaginationSnapshotGuard, PAGINATION_SNAPSHOT_GUARD_PATH);

for (const value of Object.values(CONTRACT.requiredStaticResources)) {
  assert.ok(exists(value), `production verification references missing resource: ${value}`);
}
for (const value of CONTRACT.retiredResources) {
  assert.ok(!exists(value), `retired resource remains in source: ${value}`);
}
assert.equal(CONTRACT.dynamicResources.runtimeHealth, '/api/ln-rank-runtime-health');
assert.ok(CONTRACT.dynamicResources.majorBandsHealth.includes('/api/major-bands-health'));
assert.ok(CONTRACT.dynamicResources.majorBandsStandard.includes('rangePreset=standard'));
assert.ok(CONTRACT.dynamicResources.majorBandsWide.includes('rangePreset=wide'));
assert.ok(CONTRACT.dynamicResources.majorBandsSafe.includes('rangePreset=safe'));
assert.ok(CONTRACT.dynamicResources.majorBandsHighBoundary.includes('candidateScore=750'));
for (const [key, value] of Object.entries(CONTRACT.policies)) assert.equal(value, true, `production policy disabled: ${key}`);

assert.equal(manifest.resourceGraph.productionVerificationVersion, CONTRACT.version);
assert.equal(manifest.resourceGraph.productionVerificationOwner, '/shared/governance/production-resource-verification-contract.v3990_0.js');
assert.equal(manifest.policies.productionVerificationStatusRequired, true);
assert.equal(manifest.interactionContract.version, CONTRACT.interactionVersion);
assert.equal(manifest.interactionContract.activationVersion, CONTRACT.nativeChooserActivationVersion);
assert.equal(
  manifest.currentGenerationInternalModules.majorBandsPaginationSnapshotGuard,
  PAGINATION_SNAPSHOT_GUARD_MANIFEST_PATH
);
assert.equal(manifest.policies.currentInternalModulesDeclared, true);
assert.equal(manifest.policies.majorBandsBrowserSnapshotGuardBounded, true);
assert.equal(manifest.policies.majorBandsBrowserSnapshotMismatchRejectedBeforeMerge, true);

const workflow = fs.readFileSync('.github/workflows/verify-production-resource-graph-v3972_6.yml', 'utf8');
for (const marker of [
  'push:',
  'branches: [main]',
  'statuses: write',
  'production/resource-graph-v3990.0',
  'verify-production-resource-graph-v3990_0.mjs',
  'verify-production-pagination-snapshot-guard-v3990_0.mjs',
  'pagination-snapshot-guard.v3990_0.js',
  'PRODUCTION_PAGINATION_SNAPSHOT_EVIDENCE',
  'v3990-0-production-pagination-snapshot-guard.json',
  'Wait for bounded rank-query production deployment',
  QUERY_CACHE_VERSION,
  REQUEST_BAND_LOADER_VERSION,
  RESULT_ORDER_VERSION,
  '"publicHttpSelfFanout":false',
  '"bucketWorkerCount":0',
  'PRODUCTION_RESOURCE_ATTEMPTS',
  'PRODUCTION_RESOURCE_WAIT_MS'
]) assert.ok(workflow.includes(marker), `production workflow missing ${marker}`);
for (const forbidden of [
  '"executionGateVersion":"major-bands-query-execution-gate-v3990_0"',
  '"maxConcurrentExecutions":2',
  '"crossRequestSemaphore":true'
]) assert.ok(!workflow.includes(forbidden), `production workflow reads unpublished API field: ${forbidden}`);

const deployWorkflow = fs.readFileSync('.github/workflows/deploy-cloudflare-pages-main.yml', 'utf8');
for (const marker of [
  'pull_request:',
  'branches: [main]',
  'types: [opened, synchronize, reopened, ready_for_review]',
  'source-contract:',
  'deploy-production:',
  "github.event_name == 'push'",
  "display: 'v3.9.90.0'",
  "siteRuntimeGeneration: 'v3990_0'",
  'audit-canonical-release-version-v3990_0.mjs',
  'audit-production-resource-verification-v3990_0.mjs',
  'audit-site-runtime-generation-v3990_0.mjs',
  'wrangler@4.28.1 pages deploy .',
  '--commit-hash="$GITHUB_SHA"',
  'verify-production-resource-graph-v3990_0.mjs',
  'verify-production-baseline-v3971.mjs',
  'EXPECTED_RELEASE: v3.9.90.0',
  'RELEASE_SHA: ${{ github.sha }}',
  'cloudflare-pages-v3990-0-production'
]) assert.ok(deployWorkflow.includes(marker), `main deploy workflow missing ${marker}`);
for (const forbidden of [
  'v3.9.72.5',
  'distributed-bucket-workers',
  '/api/major-bands-bucket',
  'major-bands-bucket-v3972_2',
  'verify-production-v3971.mjs',
  'cloudflare-pages-v3972-3-production'
]) assert.ok(!deployWorkflow.includes(forbidden), `main deploy workflow retains retired contract: ${forbidden}`);

const verifier = fs.readFileSync('tools/verify-production-resource-graph-v3990_0.mjs', 'utf8');
for (const marker of [
  'CONTRACT.requiredStaticResources',
  'CONTRACT.retiredResources',
  'validateStaticSet',
  'validatePages',
  'interactionRuntime',
  'interactionStyles',
  'runtimeHealth',
  'productionVerificationVersion',
  'nativeChooserActivationVersion',
  'verifyMajorBandsPagination',
  'nextOffset did not strictly increase',
  'rank_unavailable_empty',
  'isCloudflareManagedChallenge',
  "headers['cf-mitigated']",
  'customHtmlChallengeBoundarySeparate',
  'custom API challenge not corroborated by HTML challenge boundary',
  'custom-domain-cloudflare-managed-challenge',
  "pagesMajorBands = await verifyMajorBandsBase('pages'"
]) assert.ok(verifier.includes(marker), `production verifier missing ${marker}`);

const baselineVerifier = fs.readFileSync('tools/verify-production-baseline-v3971.mjs', 'utf8');
for (const marker of [
  "CURRENT_V3990_RELEASE = 'v3.9.90.0'",
  'ALLOWED_RELEASES',
  'BOUNDED_HEALTH_RELEASES',
  'isCloudflareManagedChallenge',
  "headers['cf-mitigated']",
  "customDomain = 'managed-challenge'"
]) assert.ok(baselineVerifier.includes(marker), `production baseline verifier missing ${marker}`);

const snapshotVerifier = fs.readFileSync('tools/verify-production-pagination-snapshot-guard-v3990_0.mjs', 'utf8');
for (const marker of [
  'CONTRACT.requiredStaticResources.majorBandsPaginationSnapshotGuard',
  'createMajorBandsPaginationSnapshotGuard',
  'verifySourceStateMachine',
  'pagination_snapshot_mismatch',
  'currentGenerationInternalModules',
  'majorBandsBrowserSnapshotGuardBounded',
  'majorBandsBrowserSnapshotMismatchRejectedBeforeMerge',
  'selection runtime snapshot owner',
  'runtime cache snapshot registration',
  'self-check snapshot coverage',
  'source guard retention exceeded budget',
  'isCloudflareManagedChallenge',
  "headers['cf-mitigated']",
  'customHtmlChallengeBoundarySeparate',
  "mode: 'cloudflare-managed-challenge'",
  'allowCloudflareChallenge: true',
  'manifestBoundary'
]) assert.ok(snapshotVerifier.includes(marker), `pagination snapshot production verifier missing ${marker}`);

const concurrencyVerifier = fs.readFileSync('tools/verify-major-bands-preview-concurrency-v3990_0.mjs', 'utf8');
for (const marker of [
  QUERY_CACHE_VERSION,
  EXECUTION_GATE_VERSION,
  EXECUTION_GATE_MODE,
  QUERY_MEMORY_MODE,
  REQUEST_BAND_LOADER_VERSION,
  RANK_ROW_FILTER_VERSION,
  RESULT_ORDER_VERSION,
  RANKING_MEMORY_MODE,
  'queryExecutionCacheVersion',
  'queryExecutionCacheStatus',
  'rankRowFilterVersion',
  'rankRawRowCount',
  'rankDecodedRowCount',
  'rankRowsSkipped',
  'source?.resultOrderVersion',
  'pagination?.order',
  'allBandBucketMaxConcurrency: 1',
  'requestedBandBucketMaxConcurrency: 1',
  "requestedBandFastPath: 'target-band-only-in-place'",
  'requested-band performed more than one sort',
  'hidden ${hiddenBand} band was classified',
  "result.scenario === 'safe-449-near'",
  "source?.chunksRead), 6",
  "source?.staticIndexBytes), 621156"
]) assert.ok(concurrencyVerifier.includes(marker), `production concurrency verifier missing ${marker}`);
for (const forbidden of [
  'queryCacheState.crossRequestSemaphore',
  'queryCacheState.boundedDistinctExecutions',
  'queryCacheState.maxConcurrentExecutions'
]) assert.ok(!concurrencyVerifier.includes(forbidden), `concurrency verifier reads unpublished API state: ${forbidden}`);

const executionCache = fs.readFileSync('functions/_lib/major-bands-query-execution-cache.v3990_0.js', 'utf8');
for (const marker of [
  `MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION = '${QUERY_CACHE_VERSION}'`,
  `MAJOR_BANDS_QUERY_EXECUTION_GATE_VERSION = '${EXECUTION_GATE_VERSION}'`,
  `MAJOR_BANDS_QUERY_EXECUTION_GATE_MODE = '${EXECUTION_GATE_MODE}'`,
  'MAX_CONCURRENT_EXECUTIONS = 1',
  'EXECUTION_SLOT_POLL_MS = 8',
  'waitForOwnTimer',
  'crossRequestSemaphore: true',
  'boundedDistinctExecutions: true',
  'requestOwnedTimerWait: true',
  'crossRequestResolverQueue: false'
]) assert.ok(executionCache.includes(marker), `bounded execution cache missing ${marker}`);
for (const forbidden of [
  'executionWaiters',
  'executionWaiters.push',
  'executionWaiters.shift'
]) assert.ok(!executionCache.includes(forbidden), `cross-request resolver queue returned: ${forbidden}`);

const queryKernel = fs.readFileSync('functions/_lib/major-bands-rank-query-kernel.v3990_0.js', 'utf8');
for (const marker of [
  `MAJOR_BANDS_RANK_QUERY_MEMORY_MODE = '${QUERY_MEMORY_MODE}'`,
  'records?.majorBandsRequestedBand',
  'records?.majorBandsMutateSourceRecords',
  'requestedBand && canonicalPosition.bandKey !== requestedBand',
  'const record = mutateSourceRecords ? source : { ...source }',
  'const sortKeys = requestedBand ? [requestedBand] : BAND_KEYS',
  'Requested-band pagination also rejects',
  'commitCandidate(candidate.source, candidate.canonicalPosition, matchAllKeywordResult())'
]) assert.ok(queryKernel.includes(marker), `requested-band in-place query kernel missing ${marker}`);

const staticProvider = fs.readFileSync('functions/_lib/major-bands-static-provider.js', 'utf8');
for (const marker of [
  `MAJOR_BANDS_RANK_ROW_FILTER_VERSION = '${RANK_ROW_FILTER_VERSION}'`,
  "const rankIndex = schema.indexOf('rank2026')",
  'payload.rows.filter(row => majorBandsRankValueMatchesRange',
  'rankRowsSkipped: payload.rows.length - selectedRows.length'
]) assert.ok(staticProvider.includes(marker), `predecode rank-row provider missing ${marker}`);

const majorBandsApi = fs.readFileSync('functions/api/major-bands.js', 'utf8');
for (const marker of [
  'MAJOR_BANDS_ALL_BANDS_PAGE_LIMIT_CAP = 16',
  'requestForBand(context.request, sourceUrl, band, input.pageLimit)',
  'allBandsEffectivePageLimit: input.pageLimit',
  "MAJOR_BANDS_ALL_BANDS_EDGE_CACHE_VERSION = 'major-bands-all-bands-edge-cache-canonical-v3990_0'",
  "url.searchParams.delete('stress')",
  "url.searchParams.delete('deploy')",
  "cache.put(request, allBandsResponse(execution, 'stored'))",
  "MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION = 'major-bands-requested-band-order-edge-cache-canonical-v3990_0'",
  "url.searchParams.delete('offset')",
  "writeRequestedBandOrderEdgeSnapshot(orderEdgeCache, orderEdgeCacheRequest, retained)"
]) assert.ok(majorBandsApi.includes(marker), `all-bands API page budget missing ${marker}`);

const bucketLoader = fs.readFileSync('functions/_lib/major-bands-rank-bucket-loader.v3990_0.js', 'utf8');
for (const marker of [
  `MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION = '${REQUEST_BAND_LOADER_VERSION}'`,
  `MAJOR_BANDS_RANK_BUCKET_RECORD_OWNERSHIP = '${RECORD_OWNERSHIP}'`,
  'MAX_LOAD_CONCURRENCY = 1',
  'ALL_BANDS_LOAD_CONCURRENCY = 3',
  'rankRange: scope.requestedRange',
  'rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION',
  'cloneLoadedForSharedQuery',
  "cacheStatus: 'hit-cloned'",
  'attachRecordExecutionContext',
  'majorBandsRequestedBand',
  'majorBandsMutateSourceRecords',
  "scope.mode === 'all-bands-union'",
  'allBandsMaxConcurrency: ALL_BANDS_LOAD_CONCURRENCY'
]) assert.ok(bucketLoader.includes(marker), `request-owned bucket loader missing ${marker}`);

const resultOrder = fs.readFileSync('functions/_lib/major-bands-result-order.v3990_0.js', 'utf8');
for (const marker of [
  `MAJOR_BANDS_RESULT_ORDER_VERSION = '${RESULT_ORDER_VERSION}'`,
  `MAJOR_BANDS_RANKING_MEMORY_MODE = '${RANKING_MEMORY_MODE}'`,
  'compactRankingTuple',
  'const tuples = new WeakMap()',
  'diversifyWithoutRecordCopies',
  'deferred.push(record)'
]) assert.ok(resultOrder.includes(marker), `ephemeral result order missing ${marker}`);
for (const forbidden of [
  'record.rankingTrace =',
  'deferred.push({ ...record',
  'reasons: Object.freeze'
]) assert.ok(!resultOrder.includes(forbidden), `ranking object graph returned: ${forbidden}`);

console.log(JSON.stringify({
  ok: true,
  release: CONTRACT.releaseVersion,
  generation: CONTRACT.generation,
  verification: CONTRACT.version,
  statusContext: CONTRACT.statusContext,
  requiredStaticResources: Object.keys(CONTRACT.requiredStaticResources).length,
  retiredResources: CONTRACT.retiredResources.length,
  paginationSnapshotGuard: CONTRACT.requiredStaticResources.majorBandsPaginationSnapshotGuard,
  paginationSnapshotProductionGate: true,
  queryExecutionCacheVersion: QUERY_CACHE_VERSION,
  executionGateVersion: EXECUTION_GATE_VERSION,
  executionGateMode: EXECUTION_GATE_MODE,
  queryMemoryMode: QUERY_MEMORY_MODE,
  resultOrderVersion: RESULT_ORDER_VERSION,
  rankingMemoryMode: RANKING_MEMORY_MODE,
  maxConcurrentExecutions: 1,
  allBandBucketMaxConcurrency: 1,
  requestedBandBucketMaxConcurrency: 1,
  requestOwnedTimerWait: true,
  crossRequestResolverQueue: false,
  requestBandLoaderVersion: REQUEST_BAND_LOADER_VERSION,
  rankRowFilterVersion: RANK_ROW_FILTER_VERSION,
  recordOwnership: RECORD_OWNERSHIP,
  requestedBandFastPath: true,
  publishedApiContractOnly: true,
  boundedExecutionProductionGate: true
}, null, 2));
