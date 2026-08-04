import assert from 'node:assert/strict';
import {
  MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  clearMajorBandsQueryExecutionCacheForTest,
  executeMajorBandsQueryOnce,
  majorBandsQueryExecutionCacheState
} from '../functions/_lib/major-bands-query-execution-cache.v3990_0.js';

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
  await new Promise(resolve => setTimeout(resolve, 20));
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

await executeMajorBandsQueryOnce('query-b', async () => valueWithRecords(1200, 'b'));
await executeMajorBandsQueryOnce('query-c', async () => valueWithRecords(1200, 'c'));
const bounded = majorBandsQueryExecutionCacheState();
assert.equal(bounded.version, MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION);
assert.ok(bounded.completed <= bounded.maxCompletedQueries);
assert.ok(bounded.completedRecords <= bounded.maxCompletedRecords);
assert.equal(bounded.completed, 2);
assert.ok(!bounded.keys.includes('same-query'), 'least-recently-used query was not evicted');

await executeMajorBandsQueryOnce('oversized-query', async () => valueWithRecords(3000, 'oversized'));
const afterOversized = majorBandsQueryExecutionCacheState();
assert.ok(!afterOversized.keys.includes('oversized-query'), 'oversized query entered completed cache');
assert.ok(afterOversized.completedRecords <= afterOversized.maxCompletedRecords);

console.log(JSON.stringify({
  ok: true,
  version: MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  concurrentCallers: concurrent.length,
  executions,
  singleflightHits: concurrent.filter(result => result.cacheStatus === 'singleflight-hit').length,
  completed: afterOversized.completed,
  completedRecords: afterOversized.completedRecords
}, null, 2));
