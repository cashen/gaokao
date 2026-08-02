import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAJOR_BANDS_BUCKET_ORCHESTRATION,
  MajorBandsBucketWorkerError,
  runMajorBandsBucketWorkers
} from '../functions/_lib/major-bands-bucket-orchestrator.v3972_5.js';
import { MAJOR_BANDS_MATERIALIZATION_VERSION } from '../functions/_lib/major-bands-static-provider.js';
import {
  MAJOR_BANDS_BUCKET_CACHE_VERSION,
  MAJOR_BANDS_BUCKET_CACHE_TTL_SECONDS,
  buildMajorBandsBucketCacheKey
} from '../functions/_lib/major-bands-bucket-cache.v3972_5.js';
import {
  MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
  MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
  compactMajorBandsBucketCandidate,
  compactMajorBandsResponseRecord,
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
  if (bucket.file === 'bucket-4' && context.attempt < 3) {
    throw new MajorBandsBucketWorkerError('temporary HTTP 503', {
      status: 503,
      retryable: true,
      bucketFile: bucket.file
    });
  }
  return bucket.file;
}, {
  concurrency: 3,
  maxAttempts: 3,
  baseDelayMs: 1
});

assert.deepEqual(successful.results, buckets.map(bucket => bucket.file));
assert.equal(successful.stats.version, MAJOR_BANDS_BUCKET_ORCHESTRATION.version);
assert.equal(MAJOR_BANDS_BUCKET_ORCHESTRATION.maxConcurrency, 1);
assert.equal(MAJOR_BANDS_BUCKET_ORCHESTRATION.maxAttempts, 3);
assert.equal(MAJOR_BANDS_BUCKET_ORCHESTRATION.baseDelayMs, 250);
assert.equal(successful.stats.concurrency, 1);
assert.equal(successful.stats.peakConcurrency, 1);
assert.equal(observedPeak, 1);
assert.equal(successful.stats.retryCount, 2);
assert.equal(calls, 12);
assert.equal(attempts.get('bucket-4'), 3);

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
  }, { maxAttempts: 3, baseDelayMs: 0 }),
  /resource limits/
);
assert.equal(exhaustedCalls, 3);

const cacheEndpoint = new URL('https://example.test/api/major-bands-bucket');
cacheEndpoint.searchParams.set('candidateScore', '579');
cacheEndpoint.searchParams.set('bucketFile', '/ln-rank/data/major-bands-static-v3972_2/buckets/score_575_579.json');
cacheEndpoint.searchParams.append('schoolName', '乙大学');
cacheEndpoint.searchParams.append('schoolName', '甲大学');
cacheEndpoint.searchParams.set('stress', 'ignored');
cacheEndpoint.searchParams.set('requestToken', 'ignored');
cacheEndpoint.searchParams.set('bucketAttempt', '3');
const cacheKeyUrl = new URL(buildMajorBandsBucketCacheKey(cacheEndpoint).url);
assert.equal(cacheKeyUrl.pathname, '/__gaokao-internal-cache/major-bands-bucket');
assert.equal(cacheKeyUrl.searchParams.get('cacheVersion'), MAJOR_BANDS_BUCKET_CACHE_VERSION);
assert.equal(cacheKeyUrl.searchParams.has('stress'), false);
assert.equal(cacheKeyUrl.searchParams.has('requestToken'), false);
assert.equal(cacheKeyUrl.searchParams.has('bucketAttempt'), false);
assert.deepEqual(cacheKeyUrl.searchParams.getAll('schoolName'), ['甲大学', '乙大学']);
assert.equal(MAJOR_BANDS_BUCKET_CACHE_TTL_SECONDS, 300);

const tracedCandidate = {
  id: 'ln-2026-demo',
  school: '示例大学',
  schoolName: '示例大学',
  major: '示例专业',
  majorName: '示例专业',
  score2026: 579,
  rank2026: 21051,
  majorBandsMaterializationVersion: MAJOR_BANDS_MATERIALIZATION_VERSION,
  canonicalPosition: {
    version: 'canonical-position-v3963_0',
    bandKey: 'near',
    bandLabel: '主要参考',
    group: 'stable',
    positionDistance: 3,
    evidenceStrength: 'strong',
    candidateScore: 579,
    candidateRank: 21051,
    recordScore: 579,
    recordRank: 21051,
    rankGap: 0,
    scoreDelta: 0,
    ignoredInternalField: 'drop-me'
  },
  schoolProfile: {
    school: '示例大学',
    standardSchoolName: '示例大学',
    schoolIdentifier: 'demo-school',
    province: '辽宁省',
    city: '沈阳市',
    displayLocation: '辽宁 · 沈阳',
    natureType: 'public',
    natureLabel: '公办',
    is985: false,
    is211: false,
    isNon985211: true,
    schoolTierTags: ['双非（非985/211）'],
    entityType: 'official_school',
    entityTypeLabel: '学校本部',
    regionGroups: ['东北'],
    sourceVersion: 'school-profile-v2026',
    sourceAsOfDate: '2026-06-18',
    sourceName: '教育部名单',
    sourceUrl: 'https://example.invalid/school',
    confidence: 'official',
    doubleNonDefinition: '非985且非211；不等同于非双一流',
    largeUnusedProfileField: 'X'.repeat(800)
  },
  historyCompare: {
    primaryYear: 2026,
    has2026: true,
    has2025: true,
    has2024: true,
    rankDelta26vs25: 110,
    rankTrendText: '三年位次接近',
    repeatedInternalDetails: 'Y'.repeat(500)
  },
  historyEvidence: {
    version: 'ln-physics-history-evidence-v3967_0',
    region: 'ln',
    subject: 'physics',
    primaryYear: 2026,
    years: {
      2024: {
        year: 2024,
        score: 575,
        rankStart: 21500,
        rankEnd: 21600,
        sameCount: 101,
        evidenceState: 'matched',
        validationStatus: 'matched',
        rankSource: 'official-rank-table',
        sourceName: '辽宁2024一分一段',
        recordStatus: 'matched',
        comparable: true,
        sourceMeta: { sourceUrl: 'https://example.invalid/2024', raw: 'A'.repeat(600) },
        suppliedRank: 21600,
        rank: 21600,
        rankForGap: 21600
      },
      2025: {
        year: 2025,
        score: 577,
        rankStart: 21200,
        rankEnd: 21300,
        sameCount: 101,
        evidenceState: 'matched',
        validationStatus: 'matched',
        rankSource: 'official-rank-table',
        sourceName: '辽宁2025一分一段',
        recordStatus: 'matched',
        comparable: true,
        sourceMeta: { sourceUrl: 'https://example.invalid/2025', raw: 'B'.repeat(600) },
        suppliedRank: 21300,
        rank: 21300,
        rankForGap: 21300
      },
      2026: {
        year: 2026,
        score: 579,
        rankStart: 21000,
        rankEnd: 21051,
        sameCount: 52,
        evidenceState: 'matched',
        validationStatus: 'matched',
        rankSource: 'official-rank-table',
        sourceName: '辽宁2026一分一段',
        recordStatus: 'matched',
        comparable: true,
        sourceMeta: { sourceUrl: 'https://example.invalid/2026', raw: 'C'.repeat(600) },
        suppliedRank: 21051,
        rank: 21051,
        rankForGap: 21051
      }
    },
    comparison: {
      policy: 'rank-first-score-secondary',
      populationPolicy: 'undergraduate-control-line-cumulative',
      comparableYears: [2024, 2025, 2026],
      canCompareThreeYears: true,
      sourceMeta: { raw: 'D'.repeat(500) }
    },
    sourceMeta: { raw: 'E'.repeat(800) }
  },
  rankingTrace: { version: 'staged-ranking-v3960_0', reasons: ['A', 'B', 'C'] },
  resultRankingTrace: { version: 'result-ranking-v3967_0', reasons: ['D', 'E'] },
  schoolProfileDisplayTags: ['公办', '辽宁 · 沈阳'],
  schoolProfileSourceUrl: 'https://example.invalid/profile',
  geoSourceUrl: 'https://example.invalid/geo',
  rawText: 'F'.repeat(800)
};

const compactCandidate = compactMajorBandsBucketCandidate(tracedCandidate);
assertCompactMajorBandsBucketCandidate(compactCandidate);
assert.equal(compactCandidate.school, tracedCandidate.school);
assert.equal(compactCandidate.major, tracedCandidate.major);
assert.equal(compactCandidate.majorBandsMaterializationVersion, undefined);
assert.equal(compactCandidate.schoolProfile, undefined);
assert.equal(compactCandidate.historyEvidence, undefined);
assert.equal(compactCandidate.historyCompare, undefined);
assert.equal(compactCandidate.canonicalPosition.bandKey, 'near');
assert.equal(compactCandidate.canonicalPosition.positionDistance, 3);
assert.equal(compactCandidate.canonicalPosition.evidenceStrength, 'strong');
assert.equal(compactCandidate.canonicalPosition.version, undefined);
assert.equal(compactCandidate.canonicalPosition.candidateScore, undefined);
assert.equal(compactCandidate.canonicalPosition.ignoredInternalField, undefined);
assert.equal(compactCandidate.rankingTrace, undefined);
assert.equal(compactCandidate.resultRankingTrace, undefined);

const responseRecord = compactMajorBandsResponseRecord(tracedCandidate);
assert.equal(responseRecord.school, '示例大学');
assert.equal(responseRecord.major, '示例专业');
assert.deepEqual(responseRecord.schoolProfileDisplayTags, ['公办', '辽宁 · 沈阳']);
assert.equal(responseRecord.schoolProfile, undefined);
assert.equal(responseRecord.majorBandsMaterializationVersion, undefined);
assert.equal(responseRecord.schoolName, undefined);
assert.equal(responseRecord.majorName, undefined);
assert.equal(responseRecord.historyEvidence.years['2025'].rankEnd, 21300);
assert.ok(JSON.stringify(compactCandidate).length < JSON.stringify(tracedCandidate).length);
assert.ok(JSON.stringify(responseRecord).length < JSON.stringify(tracedCandidate).length);
assert.equal(MAJOR_BANDS_BUCKET_TRANSFER_VERSION, 'major-bands-bucket-candidate-compact-v3972_5');
assert.equal(MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION, 'major-bands-response-compact-v3972_5');
assert.equal(MAJOR_BANDS_MATERIALIZATION_VERSION, 'major-bands-materialized-v3972_5');

const source = fs.readFileSync('functions/api/major-bands.js', 'utf8');
const bucketApi = fs.readFileSync('functions/api/major-bands-bucket.js', 'utf8');
const bucketEngine = fs.readFileSync('functions/_lib/major-bands-bucket-engine.js', 'utf8');
const bucketCache = fs.readFileSync('functions/_lib/major-bands-bucket-cache.v3972_5.js', 'utf8');
const staticProvider = fs.readFileSync('functions/_lib/major-bands-static-provider.js', 'utf8');
const productionVerifier = fs.readFileSync('tools/verify-production-v3971.mjs', 'utf8');
assert.ok(source.includes('major-bands-bucket-orchestrator.v3972_5.js'));
assert.ok(source.includes('major-bands-bucket-transfer.v3972_5.js'));
assert.ok(source.includes('major-bands-bucket-cache.v3972_5.js'));
assert.ok(source.includes('readMajorBandsBucketCache(endpoint)'));
assert.ok(source.includes('writeMajorBandsBucketCache(cached.cacheKey, responseText)'));
assert.ok(source.indexOf('parseBucketPayload(response, responseText, bucket.file)') < source.indexOf('writeMajorBandsBucketCache(cached.cacheKey, responseText)'));
assert.ok(!source.includes("endpoint.searchParams.set('requestToken'"));
assert.ok(!source.includes("endpoint.searchParams.set('bucketAttempt'"));
assert.ok(source.includes('bucketWorkerCacheHits:'));
assert.ok(source.includes('bucketWorkerCacheMisses:'));
assert.ok(source.includes('bucketWorkerCacheUnavailable:'));
assert.ok(bucketCache.includes("['stress', 'requestToken', 'bucketAttempt'].includes(key)"));
assert.ok(bucketCache.includes('await cache.put(cacheKey, new Response(text'));
assert.ok(bucketCache.includes('MAJOR_BANDS_BUCKET_CACHE_TTL_SECONDS = 300'));
assert.ok(/runMajorBandsBucketWorkers\s*\(\s*selected\.buckets/.test(source));
assert.ok(!source.includes('Promise.all(selected.buckets.map'));
assert.ok(source.includes('bucketWorkerConcurrency: bucketExecution.stats.peakConcurrency'));
assert.ok(source.includes('bucketWorkerRetries: bucketExecution.stats.retryCount'));
assert.ok(source.includes('bucketCandidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION'));
assert.ok(source.includes('responseTransportVersion: MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION'));
assert.ok(source.includes('compactMajorBandsResponseRecord'));
assert.ok(source.includes('resolveCanonicalPosition, rankBandRangeText'));
assert.ok(source.includes('const item = materializeMajorBandsStaticRecord(source);'));
assert.ok(source.includes('分桶排序位置与父级重建不一致'));
assert.ok(source.includes('finalizeRecordForResponse(record, { candidateScore, candidateRank, rangePreset })'));
assert.ok(!source.includes('record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION'));
assert.ok(source.includes("'x-gaokao-response-transport'"));
assert.ok(source.includes('isRetryableBucketWorkerFailure(error) ? 503 : 500'));
assert.ok(bucketApi.includes('candidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION'));
assert.ok(!bucketEngine.includes("import { materializeMajorBandsStaticRecord } from './major-bands-static-provider.js';"));
assert.ok(!bucketEngine.includes("import { buildDisplayTags } from './school-display-tags.js';"));
assert.ok(!bucketEngine.includes('materializeMajorBandsStaticRecord(record)'));
assert.ok(bucketEngine.includes('...record'));
assert.ok(bucketEngine.includes('.slice(0, maxCandidates).map(compactMajorBandsBucketCandidate)'));
assert.ok(staticProvider.includes("if (record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION) return record;"));
assert.ok(productionVerifier.includes('SCORE_RESPONSE_BUDGET_BYTES = 260000'));
assert.ok(productionVerifier.includes('SCHOOL_RESPONSE_BUDGET_BYTES = 180000'));
assert.ok(productionVerifier.includes('SCORE_TRANSFER_BUDGET_CHARS = 1200000'));
assert.ok(productionVerifier.includes('SCHOOL_TRANSFER_BUDGET_CHARS = 300000'));

console.log(JSON.stringify({
  ok: true,
  version: MAJOR_BANDS_BUCKET_ORCHESTRATION.version,
  transferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
  responseTransportVersion: MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
  materializationVersion: MAJOR_BANDS_MATERIALIZATION_VERSION,
  bucketCacheVersion: MAJOR_BANDS_BUCKET_CACHE_VERSION,
  bucketCacheTtlSeconds: MAJOR_BANDS_BUCKET_CACHE_TTL_SECONDS,
  workerCount: successful.stats.workerCount,
  peakConcurrency: successful.stats.peakConcurrency,
  retryCount: successful.stats.retryCount,
  nonRetryableCalls,
  exhaustedCalls,
  tracedBytes: Buffer.byteLength(JSON.stringify(tracedCandidate), 'utf8'),
  transferBytes: Buffer.byteLength(JSON.stringify(compactCandidate), 'utf8'),
  responseBytes: Buffer.byteLength(JSON.stringify(responseRecord), 'utf8')
}, null, 2));
