import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAJOR_BANDS_BUCKET_ORCHESTRATION,
  MajorBandsBucketWorkerError,
  runMajorBandsBucketWorkers
} from '../functions/_lib/major-bands-bucket-orchestrator.v3972_5.js';
import { MAJOR_BANDS_MATERIALIZATION_VERSION } from '../functions/_lib/major-bands-static-provider.js';
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
assert.equal(compactCandidate.majorBandsMaterializationVersion, MAJOR_BANDS_MATERIALIZATION_VERSION);
assert.equal(compactCandidate.schoolProfile.standardSchoolName, '示例大学');
assert.equal(compactCandidate.schoolProfile.largeUnusedProfileField, undefined);
assert.equal(compactCandidate.historyEvidence.years['2024'].sourceMeta, undefined);
assert.equal(compactCandidate.canonicalPosition.ignoredInternalField, undefined);
assert.equal(compactCandidate.rankingTrace, undefined);
assert.equal(compactCandidate.resultRankingTrace, undefined);

const responseRecord = compactMajorBandsResponseRecord({
  ...compactCandidate,
  schoolProfileDisplayTags: ['公办', '辽宁 · 沈阳']
});
assert.equal(responseRecord.school, '示例大学');
assert.equal(responseRecord.major, '示例专业');
assert.deepEqual(responseRecord.schoolProfileDisplayTags, ['公办', '辽宁 · 沈阳']);
assert.equal(responseRecord.schoolProfile, undefined);
assert.equal(responseRecord.majorBandsMaterializationVersion, undefined);
assert.equal(responseRecord.schoolName, undefined);
assert.equal(responseRecord.majorName, undefined);
assert.equal(responseRecord.historyEvidence.years['2025'].rankEnd, 21300);
assert.ok(JSON.stringify(compactCandidate).length < JSON.stringify(tracedCandidate).length);
assert.ok(JSON.stringify(responseRecord).length < JSON.stringify(compactCandidate).length);
assert.equal(MAJOR_BANDS_BUCKET_TRANSFER_VERSION, 'major-bands-bucket-candidate-compact-v3972_5');
assert.equal(MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION, 'major-bands-response-compact-v3972_5');
assert.equal(MAJOR_BANDS_MATERIALIZATION_VERSION, 'major-bands-materialized-v3972_5');

const source = fs.readFileSync('functions/api/major-bands.js', 'utf8');
const bucketApi = fs.readFileSync('functions/api/major-bands-bucket.js', 'utf8');
const bucketEngine = fs.readFileSync('functions/_lib/major-bands-bucket-engine.js', 'utf8');
const staticProvider = fs.readFileSync('functions/_lib/major-bands-static-provider.js', 'utf8');
const productionVerifier = fs.readFileSync('tools/verify-production-v3971.mjs', 'utf8');
assert.ok(source.includes('major-bands-bucket-orchestrator.v3972_5.js'));
assert.ok(source.includes('major-bands-bucket-transfer.v3972_5.js'));
assert.ok(/runMajorBandsBucketWorkers\s*\(\s*selected\.buckets/.test(source));
assert.ok(!source.includes('Promise.all(selected.buckets.map'));
assert.ok(source.includes('bucketWorkerConcurrency: bucketExecution.stats.peakConcurrency'));
assert.ok(source.includes('bucketWorkerRetries: bucketExecution.stats.retryCount'));
assert.ok(source.includes('bucketCandidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION'));
assert.ok(source.includes('responseTransportVersion: MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION'));
assert.ok(source.includes('compactMajorBandsResponseRecord'));
assert.ok(source.includes("record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION"));
assert.ok(source.includes("'x-gaokao-response-transport'"));
assert.ok(source.includes('isRetryableBucketWorkerFailure(error) ? 503 : 500'));
assert.ok(bucketApi.includes('candidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION'));
assert.ok(bucketEngine.includes("import { materializeMajorBandsStaticRecord } from './major-bands-static-provider.js';"));
assert.ok(bucketEngine.includes("import { buildDisplayTags } from './school-display-tags.js';"));
assert.ok(bucketEngine.includes('const materialized = materializeMajorBandsStaticRecord(record);'));
assert.ok(bucketEngine.includes('const displayTags = buildDisplayTags(materialized);'));
assert.ok(bucketEngine.includes('...materialized'));
assert.ok(bucketEngine.includes('...displayTags'));
assert.ok(bucketEngine.includes('.slice(0, maxCandidates).map(compactMajorBandsBucketCandidate)'));
assert.ok(staticProvider.includes("if (record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION) return record;"));
assert.ok(productionVerifier.includes('SCORE_RESPONSE_BUDGET_BYTES = 260000'));
assert.ok(productionVerifier.includes('SCHOOL_RESPONSE_BUDGET_BYTES = 180000'));

console.log(JSON.stringify({
  ok: true,
  version: MAJOR_BANDS_BUCKET_ORCHESTRATION.version,
  transferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
  responseTransportVersion: MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
  materializationVersion: MAJOR_BANDS_MATERIALIZATION_VERSION,
  workerCount: successful.stats.workerCount,
  peakConcurrency: successful.stats.peakConcurrency,
  retryCount: successful.stats.retryCount,
  nonRetryableCalls,
  exhaustedCalls,
  tracedBytes: Buffer.byteLength(JSON.stringify(tracedCandidate), 'utf8'),
  transferBytes: Buffer.byteLength(JSON.stringify(compactCandidate), 'utf8'),
  responseBytes: Buffer.byteLength(JSON.stringify(responseRecord), 'utf8')
}, null, 2));
