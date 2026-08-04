import assert from 'node:assert/strict';
import {
  MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  clearMajorBandsQueryExecutionCacheForTest,
  executeMajorBandsQueryOnce,
  majorBandsQueryExecutionCacheState
} from '../functions/_lib/major-bands-query-execution-cache.v3990_0.js';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function valueWithRecords(total, marker) {
  return {
    marker,
    processed: {
      grouped: {
        upper: { count: total, ordered: [] },
        near: { count: 0, ordered: [] },
        steady: { count: 0, ordered: [] }
      }
    }
  };
}

clearMajorBandsQueryExecutionCacheForTest();
let executions = 0;
const concurrent = await Promise.all(Array.from({ length: 50 }, () => executeMajorBandsQueryOnce('same-query', async () => {
  executions += 1;
  await delay(20);
  return valueWithRecords(1001, 'singleflight');
})));
assert.equal(executions, 1, 'identical concurrent queries executed more than once');
assert.equal(concurrent.filter(result => result.cacheStatus === 'miss').length, 1);
assert.equal(concurrent.filter(result => result.cacheStatus === 'singleflight-hit').length, 49);
assert.ok(concurrent.every(result => result.value.marker === 'singleflight'));

const repeated = await executeMajorBandsQueryOnce('same-query', async () => {
  executions += 1;
  return valueWithRecords(1001, 'recomputed-after-completion');
});
assert.equal(repeated.cacheStatus, 'miss');
assert.equal(repeated.value.marker, 'recomputed-after-completion');
assert.equal(executions, 2, 'completed query was retained across requests');

clearMajorBandsQueryExecutionCacheForTest();
let activeDistinct = 0;
let peakDistinct = 0;
const distinct = await Promise.all(Array.from({ length: 5 }, (_, index) => executeMajorBandsQueryOnce(`distinct-${index}`, async () => {
  activeDistinct += 1;
  peakDistinct = Math.max(peakDistinct, activeDistinct);
  await delay(15 + index);
  activeDistinct -= 1;
  return valueWithRecords(1000 + index, `distinct-${index}`);
})));
assert.deepEqual(distinct.map(result => result.value.marker), [
  'distinct-0',
  'distinct-1',
  'distinct-2',
  'distinct-3',
  'distinct-4'
]);

const state = majorBandsQueryExecutionCacheState();
assert.equal(state.version, MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION);
assert.equal(state.inFlight, 0);
assert.equal(state.completed, 0);
assert.equal(state.completedRecords, 0);
assert.equal(state.completedRetentionEnabled, false);
assert.equal(state.maxCompletedQueries, 0);
assert.equal(state.maxCompletedRecords, 0);
assert.equal(state.completedTtlMs, 0);
assert.equal(state.singleflightOnly, true);
assert.equal(state.crossRequestSemaphore, false);
assert.deepEqual(state.keys, []);

console.log(JSON.stringify({
  ok: true,
  version: MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  concurrentCallers: concurrent.length,
  executions,
  singleflightHits: concurrent.filter(result => result.cacheStatus === 'singleflight-hit').length,
  distinctQueries: distinct.length,
  peakDistinct,
  completedRetentionEnabled: state.completedRetentionEnabled,
  completed: state.completed,
  completedRecords: state.completedRecords,
  crossRequestSemaphore: state.crossRequestSemaphore
}, null, 2));
