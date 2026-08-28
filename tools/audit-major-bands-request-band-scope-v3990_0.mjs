import assert from 'node:assert/strict';
import {
  MAJOR_BANDS_RANK_BUCKETS,
  selectMajorBandsRankBuckets
} from '../functions/_lib/major-bands-rank-index.v3990_0.js';
import {
  MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION,
  scopeMajorBandsRankBucketsForRequest
} from '../functions/_lib/major-bands-rank-bucket-loader.v3990_0.js';
import {
  lookupScoreRank,
  getRankPopulation
} from '../functions/_lib/rank-table-provider.js';
import {
  rankWindowsForCandidate
} from '../shared/algorithms/position/canonical-position.v3963_0.js';

const presets = ['standard', 'wide', 'safe'];
const bands = ['upper', 'near', 'steady'];
const totalRank = getRankPopulation({
  year: 2026,
  region: 'ln',
  subject: 'physics',
  policy: 'table-total'
});

function overlaps(bucket, range) {
  return Number(bucket.minRank) <= Number(range.maxRank)
    && Number(bucket.maxRank) >= Number(range.minRank);
}

function files(buckets) {
  return buckets.map(bucket => bucket.file);
}

let evaluatedScores = 0;
let unavailableScores = 0;
let scopedCases = 0;
let reducedCases = 0;
let unionBucketTotal = 0;
let scopedBucketTotal = 0;
let maxUnionBuckets = 0;
let maxScopedBuckets = 0;

for (let score = 344; score <= 750; score += 1) {
  const row = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score });
  const candidateRank = Number(row?.rankForGap ?? row?.rankEnd ?? row?.cumulative);
  const hasRank = Number.isFinite(candidateRank) && candidateRank > 0;
  if (hasRank) evaluatedScores += 1;
  else unavailableScores += 1;

  for (const rangePreset of presets) {
    const rankWindows = hasRank
      ? rankWindowsForCandidate(candidateRank, rangePreset, totalRank)
      : null;
    const union = selectMajorBandsRankBuckets(rankWindows);
    const noBand = scopeMajorBandsRankBucketsForRequest(union, {
      candidateScore: score,
      rangePreset,
      band: ''
    });
    assert.equal(noBand.version, MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION);
    assert.equal(noBand.mode, 'all-bands-union');
    assert.equal(noBand.candidateBucketCount, union.length);
    assert.deepEqual(files(noBand.buckets), files(union), `${score}/${rangePreset}: no-band union changed`);

    if (!hasRank) {
      assert.equal(union.length, 0, `${score}/${rangePreset}: unavailable rank selected buckets`);
    }

    for (const band of bands) {
      const scoped = scopeMajorBandsRankBucketsForRequest(union, {
        candidateScore: score,
        rangePreset,
        band
      });
      const expected = rankWindows?.[band]
        ? union.filter(bucket => overlaps(bucket, rankWindows[band]))
        : [];
      assert.equal(scoped.version, MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION);
      assert.equal(scoped.mode, 'requested-band-rank-window');
      assert.equal(scoped.requestedBand, band);
      assert.equal(scoped.candidateBucketCount, union.length);
      assert.deepEqual(
        files(scoped.buckets),
        files(expected),
        `${score}/${rangePreset}/${band}: scoped buckets differ from exact rank-window overlap`
      );
      const unionFiles = new Set(files(union));
      assert.ok(
        scoped.buckets.every(bucket => unionFiles.has(bucket.file)),
        `${score}/${rangePreset}/${band}: scoped bucket escaped union`
      );
      scopedCases += 1;
      unionBucketTotal += union.length;
      scopedBucketTotal += scoped.buckets.length;
      maxUnionBuckets = Math.max(maxUnionBuckets, union.length);
      maxScopedBuckets = Math.max(maxScopedBuckets, scoped.buckets.length);
      if (scoped.buckets.length < union.length) reducedCases += 1;
    }
  }
}

const safe449Rank = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score: 449 })?.rankForGap;
const safe449Windows = rankWindowsForCandidate(safe449Rank, 'safe', totalRank);
const safe449Union = selectMajorBandsRankBuckets(safe449Windows);
const safe449Near = scopeMajorBandsRankBucketsForRequest(safe449Union, {
  candidateScore: 449,
  rangePreset: 'safe',
  band: 'near'
});
assert.equal(safe449Union.length, 22, 'safe-449 union bucket baseline drift');
assert.equal(safe449Near.buckets.length, 6, 'safe-449 near scope did not shrink to exact six buckets');
assert.deepEqual(
  safe449Near.buckets.map(bucket => [bucket.minScore, bucket.maxScore]),
  [[445, 449], [440, 444], [435, 439], [430, 434], [425, 429], [420, 424]],
  'safe-449 near bucket set drift'
);
const safe449UnionRecords = safe449Union.reduce((sum, bucket) => sum + Number(bucket.recordCount || 0), 0);
const safe449NearRecords = safe449Near.buckets.reduce((sum, bucket) => sum + Number(bucket.recordCount || 0), 0);
const safe449UnionBytes = safe449Union.reduce((sum, bucket) => sum + Number(bucket.bytes || 0), 0);
const safe449NearBytes = safe449Near.buckets.reduce((sum, bucket) => sum + Number(bucket.bytes || 0), 0);
assert.equal(safe449UnionRecords, 2737);
assert.equal(safe449NearRecords, 1073);
assert.equal(safe449UnionBytes, 1575975);
assert.equal(safe449NearBytes, 621156);
assert.ok(safe449NearBytes < safe449UnionBytes);
assert.equal(MAJOR_BANDS_RANK_BUCKETS.length, 73);

console.log(JSON.stringify({
  ok: true,
  version: MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION,
  scoreRange: [344, 750],
  evaluatedScores,
  unavailableScores,
  presets,
  bands,
  scopedCases,
  reducedCases,
  unionBucketTotal,
  scopedBucketTotal,
  maxUnionBuckets,
  maxScopedBuckets,
  safe449Near: {
    unionBuckets: safe449Union.length,
    scopedBuckets: safe449Near.buckets.length,
    unionRecords: safe449UnionRecords,
    scopedRecords: safe449NearRecords,
    unionBytes: safe449UnionBytes,
    scopedBytes: safe449NearBytes
  }
}, null, 2));
