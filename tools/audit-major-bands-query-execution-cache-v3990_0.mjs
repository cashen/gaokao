import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  MAJOR_BANDS_QUERY_EXECUTION_CACHE_MODE,
  clearMajorBandsQueryExecutionCacheForTest,
  executeMajorBandsQueryOnce,
  majorBandsQueryExecutionCacheState
} from '../functions/_lib/major-bands-query-execution-cache.v3990_0.js';
import { normalizeScoreBand } from '../ln-rank/js/domain/score-band-contract.v3963_1.js';
import { state as clientState } from '../ln-rank/js/state/app-state.v3963_1.js?v=3963_1';
import { fetchMajorBands as fetchClientMajorBands } from '../ln-rank/js/feature/major-pool/bands-api.v3963_0.js?v=3963_0';

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
      requestedBand: 'near'
    }
  };
}

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
  await delay(15 + index);
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
const afterDistinct = majorBandsQueryExecutionCacheState();
assert.equal(afterDistinct.inFlight, 0);
assert.ok(afterDistinct.completed <= 1, 'distinct queries retained multiple snapshots');
assert.ok(afterDistinct.completedRecords <= afterDistinct.maxCompletedRecords);
assert.ok(afterDistinct.completedEstimatedBytes <= afterDistinct.maxCompletedEstimatedBytes);
assert.equal(afterDistinct.crossRequestSemaphore, false);
assert.equal(afterDistinct.serializedSnapshotOnly, true);
assert.equal(afterDistinct.preflightBudgetBeforeSerialization, true);
assert.equal(afterDistinct.mode, MAJOR_BANDS_QUERY_EXECUTION_CACHE_MODE);

const oversizedRecordValue = compactValue(7000, 'oversized-records', 900_000);
oversizedRecordValue.toJSON = () => {
  throw new Error('record-over-budget value was serialized before rejection');
};
const oversizedRecordResult = await executeMajorBandsQueryOnce('oversized-record-query', async () => oversizedRecordValue);
assert.equal(oversizedRecordResult.value, oversizedRecordValue, 'executor value changed while record-over-budget retention was rejected');
let state = majorBandsQueryExecutionCacheState();
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
assert.equal(state.maxCompletedQueries, 1);
assert.equal(state.maxCompletedRecords, 6000);
assert.equal(state.maxCompletedEstimatedBytes, 2_000_000);
assert.equal(state.completedTtlMs, 30_000);
assert.equal(state.preflightBudgetBeforeSerialization, true);
assert.equal(state.version, 'major-bands-query-execution-cache-serialized-v3990_0');

const apiSource = fs.readFileSync('functions/api/major-bands.js', 'utf8');
for (const required of [
  "band === 'all-bands-execution'",
  'compactRankedPage(ordered, pageOffset, pageLimit)',
  "'compact-current-page-per-band'",
  "'current-page-only'",
  'queryExecutionPageOffset',
  'queryExecutionPageLimit'
]) {
  assert.ok(apiSource.includes(required), `missing bounded all-band retention contract: ${required}`);
}
for (const forbidden of [
  'const retainRecords = !requestedBand || requestedBand === key',
  "requestedBand || 'all'\n        }"
]) {
  assert.ok(!apiSource.includes(forbidden), `unbounded all-band retention path returned: ${forbidden}`);
}

const normalizedSnapshot = normalizeScoreBand({
  key: 'near',
  records: [{ id: 'first' }],
  count: 2,
  pagination: {
    offset: 0,
    limit: 1,
    returned: 1,
    hasMore: true,
    nextOffset: 1,
    order: 'major-bands-result-order-v3990_0',
    snapshot: 'v3990_0-2-client-snapshot'
  }
}, { key: 'near', candidateScore: 579 });
assert.equal(normalizedSnapshot.pagination.snapshot, 'v3990_0-2-client-snapshot', 'client normalizer dropped pagination snapshot');

const bandsApiSource = fs.readFileSync('ln-rank/js/feature/major-pool/bands-api.v3963_0.js', 'utf8');
for (const required of [
  "params.set('snapshot', expectedSnapshot)",
  'expectedBandSnapshot(page)',
  'assertBandSnapshot(payload, band, expectedSnapshot)',
  "error.code = 'pagination_snapshot_mismatch'",
  'actualSnapshot === expectedSnapshot'
]) {
  assert.ok(bandsApiSource.includes(required), `missing client pagination snapshot contract: ${required}`);
}

const originalFetch = globalThis.fetch;
const originalClientBands = clientState.bands.data;
let requestedClientUrl = '';
let clientPayload = {
  ok: true,
  bands: { near: { pagination: { snapshot: 'client-snapshot-a' } } }
};
globalThis.fetch = async input => {
  requestedClientUrl = input instanceof Request ? input.url : String(input || '');
  return new Response(JSON.stringify(clientPayload), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
};
try {
  clientState.bands.data = null;
  await fetchClientMajorBands({
    candidateScore: 579,
    rangePreset: 'standard',
    filters: {},
    page: { limit: 40 }
  });
  assert.ok(!requestedClientUrl.includes('snapshot='), 'initial client request unexpectedly sent a stale snapshot');

  clientState.bands.data = {
    bands: {
      near: { pagination: { snapshot: 'client-snapshot-a' } }
    }
  };
  await fetchClientMajorBands({
    candidateScore: 579,
    rangePreset: 'standard',
    filters: {},
    page: { band: 'near', offset: 40, limit: 40 }
  });
  assert.ok(requestedClientUrl.includes('snapshot=client-snapshot-a'), 'next-page client request omitted expected snapshot');

  clientPayload = {
    ok: true,
    bands: { near: { pagination: { snapshot: 'client-snapshot-b' } } }
  };
  await assert.rejects(
    fetchClientMajorBands({
      candidateScore: 579,
      rangePreset: 'standard',
      filters: {},
      page: { band: 'near', offset: 80, limit: 40 }
    }),
    error => error?.code === 'pagination_snapshot_mismatch'
      && error?.expectedSnapshot === 'client-snapshot-a'
      && error?.actualSnapshot === 'client-snapshot-b',
    'client accepted a different pagination snapshot before merge'
  );
} finally {
  globalThis.fetch = originalFetch;
  clientState.bands.data = originalClientBands;
}

console.log(JSON.stringify({
  ok: true,
  version: MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  mode: MAJOR_BANDS_QUERY_EXECUTION_CACHE_MODE,
  concurrentCallers: concurrent.length,
  executions,
  singleflightHits: concurrent.filter(result => result.cacheStatus === 'singleflight-hit').length,
  completedHit: completedHit.cacheStatus,
  mutationIsolation: secondCompletedHit.value.marker,
  distinctQueries: distinct.length,
  peakDistinct,
  retainedAfterDistinct: afterDistinct.completed,
  completedRetentionEnabled: state.completedRetentionEnabled,
  maxCompletedEstimatedBytes: state.maxCompletedEstimatedBytes,
  preflightBudgetBeforeSerialization: state.preflightBudgetBeforeSerialization,
  allBandRetentionMode: 'compact-current-page-per-band',
  clientPaginationSnapshot: normalizedSnapshot.pagination.snapshot,
  clientSnapshotMismatchRejected: true,
  crossRequestSemaphore: state.crossRequestSemaphore
}, null, 2));
