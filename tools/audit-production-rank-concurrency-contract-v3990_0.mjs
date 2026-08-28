import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflowPath = '.github/workflows/verify-production-resource-graph-v3972_6.yml';
const workflow = fs.readFileSync(workflowPath, 'utf8');
const bucketLoader = fs.readFileSync('functions/_lib/major-bands-rank-bucket-loader.v3990_0.js', 'utf8');
const api = fs.readFileSync('functions/api/major-bands.js', 'utf8');
const concurrencyVerifier = fs.readFileSync('tools/verify-major-bands-preview-concurrency-v3990_0.mjs', 'utf8');

const expectedApiMarker = '\"rankBucketMaxConcurrency\":1';
const retiredApiMarker = '\"rankBucketMaxConcurrency\":2';

assert.ok(bucketLoader.includes('MAX_LOAD_CONCURRENCY = 1'), 'requested-band bucket loader concurrency is not 1');
assert.ok(api.includes('rankBucketMaxConcurrency: loadedStats.maxConcurrency'), 'requested-band API no longer publishes loader max concurrency');
assert.ok(api.includes('rankBucketMaxConcurrency: sharedLoadedStats ? Number(sharedLoadedStats.maxConcurrency || 0)'), 'all-band API no longer publishes shared loader max concurrency');
assert.ok(concurrencyVerifier.includes('requestedBandBucketMaxConcurrency: 1'), 'concurrency verifier no longer requires requested-band concurrency 1');
assert.ok(concurrencyVerifier.includes('allBandBucketMaxConcurrency: 1'), 'concurrency verifier no longer requires bounded all-band observed concurrency 1');
assert.ok(concurrencyVerifier.includes('cloudflare1102'), 'concurrency verifier no longer detects Cloudflare 1102');

assert.ok(workflow.includes('Wait for bounded rank-query production deployment'), 'production workflow lost rank deployment wait gate');
assert.ok(workflow.includes(expectedApiMarker), 'production workflow does not wait for rankBucketMaxConcurrency 1');
assert.ok(!workflow.includes(retiredApiMarker), 'production workflow retains retired rankBucketMaxConcurrency 2');
assert.ok(workflow.includes('verify-major-bands-preview-concurrency-v3990_0.mjs'), 'production workflow lost real concurrency verification');
assert.ok(workflow.includes('CONCURRENCY_LEVELS: 1,5,10,25,50'), 'production workflow lost 50-concurrency coverage');

console.log(JSON.stringify({
  ok: true,
  version: 'production-rank-concurrency-contract-v3990_0',
  requestedBandBucketMaxConcurrency: 1,
  retiredRequestedBandBucketMaxConcurrency: 2,
  productionConcurrencyLevels: [1, 5, 10, 25, 50],
  cloudflare1102DetectionRequired: true,
  realProductionConcurrencyRequired: true
}, null, 2));
