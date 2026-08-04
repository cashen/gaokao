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

const completedHit = await executeMajorBandsQueryOnce('same-query', async () => {
  throw new Error('completed cache did not serve identical query');
});
assert.equal(completedHit.cacheStatus, 'completed-hit');
assert.equal(completedHit.value.marker, 'singleflight');

let previousReleasedBeforeNext = false;
await executeMajorBandsQueryOnce('next-query', async () => {
  previousReleasedBeforeNext = majorBandsQueryExecutionCacheState().completed === 0;
  return valueWithRecords(1200, 'next');
});
assert.equal(previousReleasedBeforeNext, true, 'previous completed query overlapped next execution');
assert.deepEqual(majorBandsQueryExecutionCacheState().keys, ['next-query']);

clearMajorBandsQueryExecutionCacheForTest();
let activeDistinct = 0;
let peakDistinct = 0;
const distinct = await Promise.all(Array.from({ length: 5 }, (_, index) => executeMajorBandsQueryOnce(`distinct-${index}`, async () => {
  activeDistinct += 1;
  peakDistinct = Math.max(peakDistinct, activeDistinct);
  await delay(15);
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
const afterDistinct = majorBandsQueryExecutionCacheState();
assert.equal(afterDistinct.inFlight, 0);
assert.equal(afterDistinct.completed, 0, 'concurrent distinct queries retained a heavy completed window');
assert.equal(afterDistinct.crossRequestSemaphore, false);
assert.equal(afterDistinct.retainOnlyWhenIsolated, true);

await executeMajorBandsQueryOnce('paged-query', async () => valueWithRecords(3500, 'paged'));
const pagedHit = await executeMajorBandsQueryOnce('paged-query', async () => {
  throw new Error('paged query was recomputed');
});
assert.equal(pagedHit.cacheStatus, 'completed-hit');
assert.equal(pagedHit.value.marker, 'paged');

await executeMajorBandsQueryOnce('replacement-query', async () => valueWithRecords(1200, 'replacement'));
const bounded = majorBandsQueryExecutionCacheState();
assert.equal(bounded.version, MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION);
assert.ok(bounded.completed <= bounded.maxCompletedQueries);
assert.ok(bounded.completedRecords <= bounded.maxCompletedRecords);
assert.equal(bounded.completed, 1);
assert.deepEqual(bounded.keys, ['replacement-query']);

await executeMajorBandsQueryOnce('oversized-query', async () => valueWithRecords(7000, 'oversized'));
const afterOversized = majorBandsQueryExecutionCacheState();
assert.ok(!afterOversized.keys.includes('oversized-query'), 'oversized query entered completed cache');
assert.equal(afterOversized.completed, 0, 'previous result overlapped oversized execution');
assert.equal(afterOversized.inFlight, 0);

console.log(JSON.stringify({
  ok: true,
  version: MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  concurrentCallers: concurrent.length,
  executions,
  singleflightHits: concurrent.filter(result => result.cacheStatus === 'singleflight-hit').length,
  distinctQueries: distinct.length,
  peakDistinct,
  completed: afterOversized.completed,
  completedRecords: afterOversized.completedRecords,
  crossRequestSemaphore: afterOversized.crossRequestSemaphore
}, null, 2));
