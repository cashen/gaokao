import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAJOR_BANDS_BUCKET_ORCHESTRATION,
  MajorBandsBucketWorkerError,
  runMajorBandsBucketWorkers
} from '../functions/_lib/major-bands-bucket-orchestrator.v3972_5.js';
import {
  MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
  compactMajorBandsBucketCandidate,
  assertCompactMajorBandsBucketCandidate
} from '../functions/_lib/major-bands-bucket-transfer.v3972_5.js';

const buckets = Array.from({ length: 10 }, (_, index) => ({ file: `bucket-${index}` }));
let active = 0;
let observedPeak = 0;
let calls = 0;
const attempts = new Map();

const successful = await runMajorBandsBucketWorkers(buckets, async (bucket, context) => {
  calls += 1;
  active += 1;
  observedPeak = Math.max(observedPeak, active);
  attempts.set(bucket.file, context.attempt);
  await new Promise(resolve => setTimeout(resolve, 8));
  active -= 1;
  if (bucket.file === 'bucket-4' && context.attempt === 1) {
    throw new MajorBandsBucketWorkerError('temporary HTTP 503', {
      status: 503,
      retryable: true,
      bucketFile: bucket.file
    });
  }
  return bucket.file;
}, {
  concurrency: 3,
  maxAttempts: 2,
  baseDelayMs: 1
});

assert.deepEqual(successful.results, buckets.map(bucket => bucket.file));
assert.equal(successful.stats.version, MAJOR_BANDS_BUCKET_ORCHESTRATION.version);
assert.equal(MAJOR_BANDS_BUCKET_ORCHESTRATION.maxConcurrency, 1);
assert.equal(successful.stats.concurrency, 1);
assert.equal(successful.stats.peakConcurrency, 1);
assert.equal(observedPeak, 1);
assert.equal(successful.stats.retryCount, 1);
assert.equal(calls, 11);
assert.equal(attempts.get('bucket-4'), 2);

let nonRetryableCalls = 0;
await assert.rejects(
  runMajorBandsBucketWorkers([{ file: 'invalid-contract' }], async () => {
    nonRetryableCalls += 1;
    throw new MajorBandsBucketWorkerError('contract mismatch', {
      status: 400,
      retryable: false,
      bucketFile: 'invalid-contract'
    });
  }),
  /contract mismatch/
);
assert.equal(nonRetryableCalls, 1);

let exhaustedCalls = 0;
await assert.rejects(
  runMajorBandsBucketWorkers([{ file: 'always-503' }], async () => {
    exhaustedCalls += 1;
    throw new MajorBandsBucketWorkerError('Worker exceeded resource limits', {
      status: 503,
      retryable: true,
      bucketFile: 'always-503'
    });
  }, { maxAttempts: 2, baseDelayMs: 0 }),
  /resource limits/
);
assert.equal(exhaustedCalls, 2);

const tracedCandidate = {
  school: '示例大学',
  major: '示例专业',
  score2026: 579,
  canonicalPosition: { positionDistance: 3, evidenceStrength: 'strong' },
  rankingTrace: { version: 'staged-ranking-v3960_0', reasons: ['A', 'B', 'C'] },
  resultRankingTrace: { version: 'result-ranking-v3967_0', reasons: ['D', 'E'] }
};
const compactCandidate = compactMajorBandsBucketCandidate(tracedCandidate);
assertCompactMajorBandsBucketCandidate(compactCandidate);
assert.equal(compactCandidate.school, tracedCandidate.school);
assert.equal(compactCandidate.major, tracedCandidate.major);
assert.deepEqual(compactCandidate.canonicalPosition, tracedCandidate.canonicalPosition);
assert.ok(JSON.stringify(compactCandidate).length < JSON.stringify(tracedCandidate).length);
assert.equal(MAJOR_BANDS_BUCKET_TRANSFER_VERSION, 'major-bands-bucket-candidate-compact-v3972_5');

const source = fs.readFileSync('functions/api/major-bands.js', 'utf8');
const bucketApi = fs.readFileSync('functions/api/major-bands-bucket.js', 'utf8');
const bucketEngine = fs.readFileSync('functions/_lib/major-bands-bucket-engine.js', 'utf8');
assert.ok(source.includes('major-bands-bucket-orchestrator.v3972_5.js'));
assert.ok(source.includes('major-bands-bucket-transfer.v3972_5.js'));
assert.ok(/runMajorBandsBucketWorkers\s*\(\s*selected\.buckets/.test(source));
assert.ok(!source.includes('Promise.all(selected.buckets.map'));
assert.ok(source.includes('bucketWorkerConcurrency: bucketExecution.stats.peakConcurrency'));
assert.ok(source.includes('bucketWorkerRetries: bucketExecution.stats.retryCount'));
assert.ok(source.includes('bucketCandidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION'));
assert.ok(source.includes('isRetryableBucketWorkerFailure(error) ? 503 : 500'));
assert.ok(bucketApi.includes('candidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION'));
assert.ok(bucketEngine.includes('.slice(0, maxCandidates).map(compactMajorBandsBucketCandidate)'));

console.log(JSON.stringify({
  ok: true,
  version: MAJOR_BANDS_BUCKET_ORCHESTRATION.version,
  transferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
  workerCount: successful.stats.workerCount,
  peakConcurrency: successful.stats.peakConcurrency,
  retryCount: successful.stats.retryCount,
  nonRetryableCalls,
  exhaustedCalls,
  tracedBytes: JSON.stringify(tracedCandidate).length,
  compactBytes: JSON.stringify(compactCandidate).length
}, null, 2));
