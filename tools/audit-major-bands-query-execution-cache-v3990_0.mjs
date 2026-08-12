import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  MAJOR_BANDS_QUERY_EXECUTION_CACHE_MODE,
  MAJOR_BANDS_QUERY_EXECUTION_GATE_VERSION,
  MAJOR_BANDS_QUERY_EXECUTION_GATE_MODE,
  clearMajorBandsQueryExecutionCacheForTest,
  executeMajorBandsQueryOnce,
  majorBandsQueryExecutionCacheState
} from '../functions/_lib/major-bands-query-execution-cache.v3990_0.js';
import {
  MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION,
  clearMajorBandsAllBandsPageCacheForTest,
  executeMajorBandsAllBandsPageOnce,
  majorBandsAllBandsPageCacheState,
  releaseMajorBandsAllBandsCompletedPage
} from '../functions/_lib/major-bands-all-bands-page-cache.v3990_0.js';
import {
  MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION,
  createMajorBandsPaginationSnapshotGuard
} from '../ln-rank/js/feature/major-pool/pagination-snapshot-guard.v3990_0.js';

const ALL_BANDS_EXECUTION_MODE = 'sequential-internal-band-requests-v3990_0';
const ALL_BANDS_SHARED_PROJECTION_VERSION = 'major-bands-all-bands-shared-projection-v3990_0';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function compactValue(recordCount, marker, estimatedBytes = recordCount * 320) {
  return {
    marker,
    compactGrouped: {
      upper: { ordered: [], count: 0, snapshot: 'upper' },
      near: { ordered: [{ id: `${marker}-first`, school: '测试大学', major: '测试专业' }], count: recordCount, snapshot: `near-${recordCount}` },
      steady: { ordered: [], count: 0, snapshot: 'steady' }
    },
    cacheRetention: {
      mode: 'compact-requested-band-snapshot',
      recordCount,
      estimatedBytes,
      requestedBand: 'near',
      retainCompleted: true
    }
  };
}


clearMajorBandsAllBandsPageCacheForTest();
let allBandsPageExecutions = 0;
const allBandsPageConcurrent = await Promise.all(Array.from({ length: 20 }, () => executeMajorBandsAllBandsPageOnce('same-all-band-page', async () => {
  allBandsPageExecutions += 1;
  await delay(20);
  return { ok: true, marker: 'all-band-page', bands: { upper: {}, near: {}, steady: {} } };
})));
assert.equal(allBandsPageExecutions, 1, 'identical all-band page requests executed more than once');
assert.equal(allBandsPageConcurrent.filter(result => result.cacheStatus === 'miss').length, 1);
assert.equal(allBandsPageConcurrent.filter(result => result.cacheStatus === 'page-singleflight-hit').length, 19);
const allBandsPageHit = await executeMajorBandsAllBandsPageOnce('same-all-band-page', async () => {
  throw new Error('serialized final all-band page was not reused');
});
assert.equal(allBandsPageHit.cacheStatus, 'serialized-page-hit');
assert.equal(JSON.parse(allBandsPageHit.body).marker, 'all-band-page');
const allBandsPageState = majorBandsAllBandsPageCacheState();
assert.equal(allBandsPageState.version, MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION);
assert.equal(allBandsPageState.completed, 1);
assert.equal(allBandsPageState.maxCompletedPages, 1);
assert.equal(allBandsPageState.maxSerializedChars, 500_000);
assert.equal(allBandsPageState.completedTtlMs, 15_000);
assert.equal(allBandsPageState.serializedFinalPageOnly, true);
assert.equal(allBandsPageState.releaseOnRequestedBandSwitch, true);
assert.equal(allBandsPageState.releaseMode, 'release-completed-on-requested-band-switch-v3990_0');
assert.equal(allBandsPageState.retainsDecodedBuckets, false);
assert.equal(allBandsPageState.retainsFullBandSnapshots, false);
assert.equal(releaseMajorBandsAllBandsCompletedPage(), true, 'completed all-band page was not released');
const releasedAllBandsPageState = majorBandsAllBandsPageCacheState();
assert.equal(releasedAllBandsPageState.completed, 0);
assert.equal(releasedAllBandsPageState.releasedOnRequestedBandSwitch, 1);
assert.equal(releaseMajorBandsAllBandsCompletedPage(), false, 'empty all-band page release should be false');
clearMajorBandsAllBandsPageCacheForTest();

clearMajorBandsQueryExecutionCacheForTest();
let executions = 0;
const concurrent = await Promise.all(Array.from({ length: 50 }, () => executeMajorBandsQueryOnce('same-query', async () => {
  executions += 1;
  await delay(20);
  return compactValue(1001, 'singleflight');
})));
assert.equal(executions, 1, 'identical concurrent queries executed more than once');
assert.equal(concurrent.filter(result => result.cacheStatus === 'miss').length, 1);
assert.equal(concurrent.filter(result => result.cacheStatus === 'singleflight-hit').length, 49);
assert.ok(concurrent.every(result => result.value.marker === 'singleflight'));

const originalValue = concurrent[0].value;
const completedHit = await executeMajorBandsQueryOnce('same-query', async () => {
  throw new Error('serialized compact snapshot was not reused');
});
assert.equal(completedHit.cacheStatus, 'serialized-compact-hit');
assert.equal(completedHit.value.marker, 'singleflight');
assert.notEqual(completedHit.value, originalValue, 'completed hit reused retained object graph');
assert.notEqual(completedHit.value.compactGrouped.near.ordered, originalValue.compactGrouped.near.ordered);
completedHit.value.marker = 'mutated-client-copy';
const secondCompletedHit = await executeMajorBandsQueryOnce('same-query', async () => {
  throw new Error('serialized compact snapshot was not reusable');
});
assert.equal(secondCompletedHit.value.marker, 'singleflight', 'completed hit mutation leaked into serialized cache');

let previousReleasedBeforeNext = false;
await executeMajorBandsQueryOnce('next-query', async () => {
  previousReleasedBeforeNext = majorBandsQueryExecutionCacheState().completed === 0;
  return compactValue(1200, 'next');
});
assert.equal(previousReleasedBeforeNext, true, 'previous serialized snapshot overlapped next execution');
assert.deepEqual(majorBandsQueryExecutionCacheState().keys, ['next-query']);

clearMajorBandsQueryExecutionCacheForTest();
let activeDistinct = 0;
let peakDistinct = 0;
const distinct = await Promise.all(Array.from({ length: 5 }, (_, index) => executeMajorBandsQueryOnce(`distinct-${index}`, async () => {
  activeDistinct += 1;
  peakDistinct = Math.max(peakDistinct, activeDistinct);
  await delay(25);
  activeDistinct -= 1;
  return compactValue(1000 + index, `distinct-${index}`);
})));
assert.deepEqual(distinct.map(result => result.value.marker), [
  'distinct-0',
  'distinct-1',
  'distinct-2',
  'distinct-3',
  'distinct-4'
]);
assert.equal(peakDistinct, 1, 'distinct-query execution gate did not enforce one active execution');
assert.equal(distinct.filter(result => result.waitedForExecutionSlot).length, 4, 'expected four distinct queries to wait for the single heavy execution slot');
const afterDistinct = majorBandsQueryExecutionCacheState();
assert.equal(afterDistinct.inFlight, 0);
assert.equal(afterDistinct.activeExecutions, 0);
assert.equal(afterDistinct.queuedExecutions, 0);
assert.ok(afterDistinct.completed <= 1, 'distinct queries retained multiple snapshots');
assert.ok(afterDistinct.completedRecords <= afterDistinct.maxCompletedRecords);
assert.ok(afterDistinct.completedEstimatedBytes <= afterDistinct.maxCompletedEstimatedBytes);
assert.equal(afterDistinct.crossRequestSemaphore, true);
assert.equal(afterDistinct.boundedDistinctExecutions, true);
assert.equal(afterDistinct.executionGateVersion, MAJOR_BANDS_QUERY_EXECUTION_GATE_VERSION);
assert.equal(afterDistinct.executionGateMode, MAJOR_BANDS_QUERY_EXECUTION_GATE_MODE);
assert.equal(afterDistinct.requestOwnedTimerWait, true);
assert.equal(afterDistinct.crossRequestResolverQueue, false);
assert.equal(afterDistinct.executionSlotPollMs, 8);
assert.equal(afterDistinct.maxConcurrentExecutions, 1);
assert.equal(afterDistinct.peakActiveExecutions, 1);
assert.ok(afterDistinct.peakQueuedExecutions >= 4);
assert.equal(afterDistinct.serializedSnapshotOnly, true);
assert.equal(afterDistinct.preflightBudgetBeforeSerialization, true);
assert.equal(afterDistinct.explicitRetentionOptIn, true);
assert.equal(afterDistinct.mode, MAJOR_BANDS_QUERY_EXECUTION_CACHE_MODE);

const requestScopedValue = compactValue(1000, 'request-scoped', 500_000);
requestScopedValue.cacheRetention.retainCompleted = false;
requestScopedValue.toJSON = () => {
  throw new Error('request-scoped API value was serialized after completion');
};
const requestScopedResult = await executeMajorBandsQueryOnce('request-scoped-query', async () => requestScopedValue);
assert.equal(requestScopedResult.value, requestScopedValue);
let state = majorBandsQueryExecutionCacheState();
assert.equal(state.completed, 0, 'request-scoped API value entered completed cache');

const oversizedRecordValue = compactValue(7000, 'oversized-records', 900_000);
oversizedRecordValue.toJSON = () => {
  throw new Error('record-over-budget value was serialized before rejection');
};
const oversizedRecordResult = await executeMajorBandsQueryOnce('oversized-record-query', async () => oversizedRecordValue);
assert.equal(oversizedRecordResult.value, oversizedRecordValue, 'executor value changed while record-over-budget retention was rejected');
state = majorBandsQueryExecutionCacheState();
assert.equal(state.completed, 0, 'record-over-budget query entered completed cache');

const oversizedByteValue = compactValue(1000, 'oversized-bytes', 2_100_000);
oversizedByteValue.toJSON = () => {
  throw new Error('byte-over-budget value was serialized before rejection');
};
const oversizedByteResult = await executeMajorBandsQueryOnce('oversized-byte-query', async () => oversizedByteValue);
assert.equal(oversizedByteResult.value, oversizedByteValue, 'executor value changed while byte-over-budget retention was rejected');
state = majorBandsQueryExecutionCacheState();
assert.equal(state.completed, 0, 'byte-over-budget query entered completed cache');
assert.equal(state.completedRecords, 0);
assert.equal(state.completedEstimatedBytes, 0);
assert.equal(state.completedRetentionEnabled, true);
assert.equal(state.explicitRetentionOptIn, true);
assert.equal(state.maxCompletedQueries, 1);
assert.equal(state.maxCompletedRecords, 6000);
assert.equal(state.maxCompletedEstimatedBytes, 2_000_000);
assert.equal(state.completedTtlMs, 30_000);
assert.equal(state.preflightBudgetBeforeSerialization, true);
assert.equal(state.version, 'major-bands-query-execution-cache-single-heavy-v3990_0');
assert.equal(state.executionGateVersion, 'major-bands-query-execution-gate-v3990_0');
assert.equal(state.executionGateMode, 'request-owned-timer-polling');
assert.equal(state.crossRequestSemaphore, true);
assert.equal(state.requestOwnedTimerWait, true);
assert.equal(state.crossRequestResolverQueue, false);
assert.equal(state.maxConcurrentExecutions, 1);

const apiSource = fs.readFileSync('functions/api/major-bands.js', 'utf8');
for (const required of [
  `MAJOR_BANDS_ALL_BANDS_EXECUTION_MODE = '${ALL_BANDS_EXECUTION_MODE}'`,
  'function compactRankedPage',
  'const retainRequestedBand = requestedBand === key;',
  "mode: 'compact-requested-band-current-page'",
  'retainCompleted: false',
  'rankingCandidateMode: aggregate.rankingCandidateMode',
  'executeRequestedBandOrderedPage',
  'requestedBandOrderCacheVersion: MAJOR_BANDS_REQUESTED_BAND_ORDER_CACHE_VERSION',
  "mode: 'compact-requested-band-current-page-from-ordered-ids'",
  'requestedBandOrderCacheEntries: Number(execution.orderCacheState?.entries || 0)',
  'requestedBandOrderCacheBounded: execution.orderCacheState?.bounded !== false',
  'requestedBandOrderProjectionVersion: execution.orderProjectionVersion',
  'orderProjectionVersion: retained.orderProjectionVersion',
  'projection: minimalOrderProjection ? MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION : undefined',
  'decodeMajorBandsStaticRow(record.majorBandsRawRow, record.majorBandsRawSchema)',
  'requestedBandOrderPageSourceVersion: execution.orderPageSourceVersion',
  'requestedBandOrderColdSecondAssetPass: execution.orderColdSecondAssetPass === true',
  '|current-page:${pageOffset}:${pageLimit}',
  "'compact-requested-band-current-page'",
  'async function executeAllBandsSequentially',
  `MAJOR_BANDS_ALL_BANDS_SHARED_PROJECTION_VERSION = '${ALL_BANDS_SHARED_PROJECTION_VERSION}'`,
  'majorBandsAllBandsShared: allBandsShared',
  'allBandsShared?.processed',
  "orderCacheStatus = 'all-bands-shared-projection'",
  "orderPageSource = 'all-bands-shared-projection'",
  'allBandsPhysicalProjectionPasses:',
  'allBandsSharedProjectionReuses:',
  'allBandsFallbackPageRefetches:',
  'allBandsPhysicalAssetPasses:',
  'allBandsTransientProjectionReleased:',
  'allBandsShared.processed = null',
  'for (const band of BAND_KEYS)',
  'requestForBand(context.request, sourceUrl, band, input.pageLimit)',
  'request: requestForBand(context.request, sourceUrl, band, input.pageLimit)',
  'return executeAllBandsSequentially(context, url',
  "queryExecutionCacheStatus: 'sequential-band-orchestration'",
  "queryExecutionRetentionMode: 'compact-current-page-per-band'",
  'queryExecutionPageOffset: input.pageOffset',
  'queryExecutionPageLimit: input.pageLimit',
  'MAJOR_BANDS_ALL_BANDS_PAGE_LIMIT_CAP = 16',
  'allBandsEffectivePageLimit: input.pageLimit',
  "MAJOR_BANDS_ALL_BANDS_EDGE_CACHE_VERSION = 'major-bands-all-bands-edge-cache-canonical-v3990_0'",
  "cache.put(request, allBandsResponse(execution, 'stored'))",
  "MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION = 'major-bands-requested-band-order-edge-cache-score-hints-v3990_0'",
  "MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION = 'major-bands-requested-band-page-score-hints-v3990_0'",
  "MAJOR_BANDS_REQUESTED_BAND_RESPONSE_EDGE_CACHE_VERSION = 'major-bands-requested-band-response-edge-cache-score-hints-v3990_0'",
  'selectRequestedBandPageBucketsByScoreHints',
  'requestedBandOrderPageBucketHintStatus: execution.orderPageBucketHintStatus',
  'requestedBandOrderPageScoreHints: Number(execution.orderPageScoreHintCount || 0)',
  'requestedBandResponseEdgeCacheRequest',
  'context?.majorBandsInternalBandRequest !== true',
  'predecodeRegion: filters.region',
  'MAJOR_BANDS_NON_BUSINESS_CACHE_PARAMS',
  "'stress'",
  "'deploy'",
  "'candidate'",
  "'production-resource-check'",
  'stripMajorBandsNonBusinessCacheParams(url)',
  "url.searchParams.delete('offset')",
  "writeRequestedBandOrderEdgeSnapshot(orderEdgeCache, orderEdgeCacheRequest, retained)",
  'allBandsExecutionMode: MAJOR_BANDS_ALL_BANDS_EXECUTION_MODE',
  'allBandsPageCacheVersion: MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION',
  "allBandsPageCacheReleaseMode: 'release-completed-on-requested-band-switch-v3990_0'",
  'releaseMajorBandsAllBandsCompletedPage()',
  'rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION',
  'rankRowsSkipped: loadedStats.rankRowsSkipped',

  'sequentialBandPasses: BAND_KEYS.length',
  'rankBucketReadsTotal:',
  "architecture: 'single-worker-sequential-band-pages-over-immutable-static-buckets'",
  "mode: 'single-worker-sequential-band-query-stable-snapshot-paged'"
]) {
  assert.ok(apiSource.includes(required), `missing sequential all-band contract: ${required}`);
}
for (const forbidden of [
  'const retainRecords = !requestedBand || requestedBand === key',
  'const retainCurrentPage = !requestedBand',
  'retainCompleted: true',
  'await fetch(',
  "new URL('/api/major-bands-bucket'"
]) {
  assert.ok(!apiSource.includes(forbidden), `unbounded, retained-completed or public self-fanout API path returned: ${forbidden}`);
}

const allBandsPageCacheSource = fs.readFileSync('functions/_lib/major-bands-all-bands-page-cache.v3990_0.js', 'utf8');
for (const required of [
  "MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION = 'major-bands-all-bands-page-cache-release-on-band-switch-v3990_0'",
  'MAX_COMPLETED_PAGES = 1',
  'MAX_SERIALIZED_CHARS = 500_000',
  'COMPLETED_TTL_MS = 15_000',
  'serializedFinalPageOnly: true',
  'releaseOnRequestedBandSwitch: true',
  "releaseMode: 'release-completed-on-requested-band-switch-v3990_0'",
  'releaseMajorBandsAllBandsCompletedPage',
  'retainsDecodedBuckets: false',
  'retainsFullBandSnapshots: false'
]) assert.ok(allBandsPageCacheSource.includes(required), `bounded final all-band page cache missing ${required}`);

const executionCacheSource = fs.readFileSync('functions/_lib/major-bands-query-execution-cache.v3990_0.js', 'utf8');
for (const required of [
  "MAJOR_BANDS_QUERY_EXECUTION_GATE_MODE = 'request-owned-timer-polling'",
  'EXECUTION_SLOT_POLL_MS = 8',
  'completedRetentionRequested',
  "value?.cacheRetention?.retainCompleted === true",
  'explicitRetentionOptIn: true',
  'waitForOwnTimer',
  'requestOwnedTimerWait: true',
  'crossRequestResolverQueue: false'
]) assert.ok(executionCacheSource.includes(required), `request-owned timer or explicit retention gate missing ${required}`);
for (const forbidden of ['executionWaiters', 'executionWaiters.push', 'executionWaiters.shift']) {
  assert.ok(!executionCacheSource.includes(forbidden), `cross-request resolver queue returned: ${forbidden}`);
}

const concurrencyVerifierSource = fs.readFileSync('tools/verify-major-bands-preview-concurrency-v3990_0.mjs', 'utf8');
for (const required of [
  `expectedAllBandsExecutionMode = '${ALL_BANDS_EXECUTION_MODE}'`,
  `expectedAllBandsSharedProjectionVersion = '${ALL_BANDS_SHARED_PROJECTION_VERSION}'`,
  "expectedAllBandsPageCacheVersion = 'major-bands-all-bands-page-cache-release-on-band-switch-v3990_0'",
  'allBandsPhysicalProjectionPasses), 1',
  'allBandsSharedProjectionReuses), 2',
  'allBandsFallbackPageRefetches), 0',
  'allBandsPhysicalAssetPasses) <= 1',
  'allBandsTransientProjectionReleased, true',
  "['sequential-band-orchestration']",
  'verifyAllBandPageEquivalence',
  'all-band/${band}: count differs from requested-band page',
  'all-band/${band}: snapshot differs from requested-band page',
  'all-band/${band}: page IDs differ from requested-band page',
  'all-band/${band}: nextOffset differs from requested-band page',
  'allBandsExecutionMode: expectedAllBandsExecutionMode',
  'sequentialBandPasses), 3'
]) assert.ok(concurrencyVerifierSource.includes(required), `sequential all-band verifier missing ${required}`);

const snapshotGuard = createMajorBandsPaginationSnapshotGuard({ maxEntries: 12 });
const initialUrl = new URL('https://preview.invalid/api/major-bands?candidateScore=579&rangePreset=standard&region=all&limit=40&offset=0');
const initialRewrite = snapshotGuard.rewrite(initialUrl);
assert.equal(initialRewrite.applies, true);
assert.equal(initialRewrite.expectedSnapshot, '');
assert.equal(initialRewrite.url.searchParams.has('snapshot'), false, 'initial page sent stale snapshot');
const initialInspection = snapshotGuard.inspect(initialRewrite.url, {
  ok: true,
  bands: {
    upper: { pagination: { snapshot: 'upper-snapshot-a' } },
    near: { pagination: { snapshot: 'near-snapshot-a' } },
    steady: { pagination: { snapshot: 'steady-snapshot-a' } }
  }
});
assert.equal(initialInspection.ok, true);
assert.equal(snapshotGuard.getState().size, 3, 'initial response did not retain all three compact snapshots');

const nextUrl = new URL('https://preview.invalid/api/major-bands?candidateScore=579&rangePreset=standard&region=all&band=near&limit=40&offset=40');
const nextRewrite = snapshotGuard.rewrite(nextUrl);
assert.equal(nextRewrite.expectedSnapshot, 'near-snapshot-a');
assert.equal(nextRewrite.url.searchParams.get('snapshot'), 'near-snapshot-a', 'next page omitted expected snapshot');
const matchingInspection = snapshotGuard.inspect(nextRewrite.url, {
  ok: true,
  bands: { near: { pagination: { snapshot: 'near-snapshot-a' } } }
});
assert.equal(matchingInspection.ok, true, 'matching pagination snapshot was rejected');
const mismatchingInspection = snapshotGuard.inspect(nextRewrite.url, {
  ok: true,
  bands: { near: { pagination: { snapshot: 'near-snapshot-b' } } }
});
assert.equal(mismatchingInspection.ok, false, 'different pagination snapshot was accepted');
assert.equal(mismatchingInspection.code, 'pagination_snapshot_mismatch');
assert.equal(mismatchingInspection.expectedSnapshot, 'near-snapshot-a');
assert.equal(mismatchingInspection.actualSnapshot, 'near-snapshot-b');

for (let index = 0; index < 20; index += 1) {
  const url = new URL(`https://preview.invalid/api/major-bands?candidateScore=${400 + index}&rangePreset=standard&region=all`);
  snapshotGuard.inspect(url, {
    ok: true,
    bands: {
      upper: { pagination: { snapshot: `upper-${index}` } },
      near: { pagination: { snapshot: `near-${index}` } },
      steady: { pagination: { snapshot: `steady-${index}` } }
    }
  });
}
assert.equal(snapshotGuard.getState().bounded, true);
assert.ok(snapshotGuard.getState().size <= 12, 'browser snapshot guard exceeded bounded retention');
assert.equal(snapshotGuard.getState().version, MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION);

const appRuntimeSource = fs.readFileSync('ln-rank/js/app-runtime.v3990_0.js', 'utf8');
for (const required of [
  'pagination-snapshot-guard.v3990_0.js?v=3990_0',
  'majorBandsPaginationSnapshotGuard.rewrite(url)',
  'majorBandsPaginationSnapshotGuard.inspect(snapshotContext.url, payload)',
  '__GAOKAO_MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD__',
  'status: 409',
  'code: inspection.code'
]) {
  assert.ok(appRuntimeSource.includes(required), `missing v3990 browser snapshot ownership: ${required}`);
}

const stableBandsApiSource = fs.readFileSync('ln-rank/js/feature/major-pool/bands-api.v3963_0.js', 'utf8');
const stableScoreContractSource = fs.readFileSync('ln-rank/js/domain/score-band-contract.v3963_1.js', 'utf8');
assert.ok(!stableBandsApiSource.includes('pagination_snapshot_mismatch'), 'immutable v3963 bands API was modified');
assert.ok(!stableBandsApiSource.includes("params.set('snapshot'"), 'immutable v3963 bands API owns v3990 snapshot behavior');
assert.ok(!stableScoreContractSource.includes("snapshot: String(source.snapshot"), 'immutable v3963 score contract was modified');

console.log(JSON.stringify({
  ok: true,
  version: MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  mode: MAJOR_BANDS_QUERY_EXECUTION_CACHE_MODE,
  executionGateVersion: MAJOR_BANDS_QUERY_EXECUTION_GATE_VERSION,
  executionGateMode: MAJOR_BANDS_QUERY_EXECUTION_GATE_MODE,
  concurrentCallers: concurrent.length,
  executions,
  singleflightHits: concurrent.filter(result => result.cacheStatus === 'singleflight-hit').length,
  completedHit: completedHit.cacheStatus,
  mutationIsolation: secondCompletedHit.value.marker,
  distinctQueries: distinct.length,
  peakDistinct,
  waitedDistinctQueries: distinct.filter(result => result.waitedForExecutionSlot).length,
  retainedAfterDistinct: afterDistinct.completed,
  completedRetentionEnabled: state.completedRetentionEnabled,
  explicitRetentionOptIn: state.explicitRetentionOptIn,
  requestScopedRetentionRejected: true,
  maxCompletedEstimatedBytes: state.maxCompletedEstimatedBytes,
  preflightBudgetBeforeSerialization: state.preflightBudgetBeforeSerialization,
  allBandRetentionMode: 'compact-current-page-per-band',
  requestedBandFirstPageRetentionMode: 'compact-requested-band-current-page',
  allBandsExecutionMode: ALL_BANDS_EXECUTION_MODE,
  allBandsPageCacheVersion: MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION,
  allBandEquivalenceGate: true,
  browserSnapshotGuard: MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION,
  browserSnapshotMismatchRejected: true,
  browserSnapshotEntries: snapshotGuard.getState().size,
  immutableV3963Restored: true,
  crossRequestSemaphore: state.crossRequestSemaphore,
  requestOwnedTimerWait: state.requestOwnedTimerWait,
  crossRequestResolverQueue: state.crossRequestResolverQueue,
  maxConcurrentExecutions: state.maxConcurrentExecutions,
  peakQueuedExecutions: state.peakQueuedExecutions
}, null, 2));
