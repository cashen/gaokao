import assert from 'node:assert/strict';
import {
  MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  MAJOR_BANDS_QUERY_EXECUTION_CACHE_MODE,
  clearMajorBandsQueryExecutionCacheForTest,
  executeMajorBandsQueryOnce,
  majorBandsQueryExecutionCacheState
} from '../functions/_lib/major-bands-query-execution-cache.v3990_0.js';

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
assert.equal(afterDistinct.mode, MAJOR_BANDS_QUERY_EXECUTION_CACHE_MODE);

await executeMajorBandsQueryOnce('oversized-record-query', async () => compactValue(7000, 'oversized-records', 900_000));
let state = majorBandsQueryExecutionCacheState();
assert.equal(state.completed, 0, 'record-over-budget query entered completed cache');

await executeMajorBandsQueryOnce('oversized-byte-query', async () => compactValue(1000, 'oversized-bytes', 2_100_000));
state = majorBandsQueryExecutionCacheState();
assert.equal(state.completed, 0, 'byte-over-budget query entered completed cache');
assert.equal(state.completedRecords, 0);
assert.equal(state.completedEstimatedBytes, 0);
assert.equal(state.completedRetentionEnabled, true);
assert.equal(state.maxCompletedQueries, 1);
assert.equal(state.maxCompletedRecords, 6000);
assert.equal(state.maxCompletedEstimatedBytes, 2_000_000);
assert.equal(state.completedTtlMs, 30_000);
assert.equal(state.version, 'major-bands-query-execution-cache-serialized-v3990_0');

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
  crossRequestSemaphore: state.crossRequestSemaphore
}, null, 2));
