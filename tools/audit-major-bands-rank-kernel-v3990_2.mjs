import assert from 'node:assert/strict';
import './verify-major-bands-rank-native-scan-v3990_2.mjs';
import './verify-major-bands-predecode-region-v3990_2.mjs';
import './verify-major-bands-refinement-projection-v3990_2.mjs';
import './verify-major-bands-platform-upgrade-v3990_2.mjs';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  MAJOR_BANDS_RANK_BUCKETS,
  MAJOR_BANDS_RANK_INDEX_RECORD_COUNT,
  assertMajorBandsRankIndex,
  selectMajorBandsRankBuckets
} from '../functions/_lib/major-bands-rank-index.v3990_2.js';
import { processMajorBandsRankWindow } from '../functions/_lib/major-bands-rank-query-kernel.v3990_2.js';
import {
  MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
  MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
  buildMajorBandsRankOrderProjectionSchema,
  decodeMajorBandsRankOrderRow,
  decodeMajorBandsStaticRow,
  majorBandsRankValueMatchesRange
} from '../functions/_lib/major-bands-static-provider.js';
import {
  scopeMajorBandsRankBucketsForRequest
} from '../functions/_lib/major-bands-rank-bucket-loader.v3990_2.js';
import {
  majorBandsSnapshotId,
  paginateMajorBandsRecords
} from '../functions/_lib/major-bands-result-order.v3990_2.js';
import {
  rankWindowsForCandidate,
  resolveCanonicalPosition
} from '../shared/algorithms/position/canonical-position.v3963_0.js';
import {
  LN_2026_PHYSICS_SCORE_RANK_META,
  lookupLn2026PhysicsScore
} from '../functions/_lib/ln-2026-physics-score-rank.js';

const manifest = JSON.parse(fs.readFileSync('ln-rank/data/major-bands-static-v3972_2/manifest.json', 'utf8'));
const schema = manifest.recordSchema;
const buckets = new Map();
const projectedBuckets = new Map();
const allRecords = [];
const projectionSchema = buildMajorBandsRankOrderProjectionSchema(schema);

function decodeRow(row) {
  const record = {};
  for (let index = 0; index < schema.length; index += 1) {
    const value = row[index];
    if (value !== null && value !== undefined) record[schema[index]] = value;
  }
  record.schoolName = record.school;
  record.majorName = record.major;
  record.score = record.score2026;
  record.rank = record.rank2026;
  record.region = record.lnArea;
  record.codes = {
    rawFenxiMajorCode: record.rawFenxiMajorCode || '',
    standardMajorCode: record.standardMajorCode || '',
    rawFenxiMajorCodeLooksStandard: Boolean(record.rawFenxiMajorCodeLooksStandard)
  };
  record.standardMajor = record.standardMajorCode || record.standardMajorName
    ? {
        code: record.standardMajorCode || '',
        name: record.standardMajorName || '',
        categoryCode: record.standardMajorCategoryCode || '',
        categoryName: record.standardMajorCategoryName || ''
      }
    : null;
  record.specialProject = {
    hasSpecialProject: Boolean(record.specialHas),
    keys: Array.isArray(record.specialKeys) ? record.specialKeys : [],
    labels: Array.isArray(record.specialLabels) ? record.specialLabels : [],
    primaryLabel: record.specialPrimaryLabel || '',
    reviewPoints: Array.isArray(record.specialReviewPoints) ? record.specialReviewPoints : []
  };
  return record;
}

for (const bucket of manifest.buckets) {
  const payload = JSON.parse(fs.readFileSync(bucket.file.replace(/^\//, ''), 'utf8'));
  const records = payload.rows.map(decodeRow);
  const projectedRecords = payload.rows.map(row => decodeMajorBandsRankOrderRow(row, projectionSchema));
  if (projectedRecords.length) {
    const projected = projectedRecords[0];
    assert.equal(Object.prototype.propertyIsEnumerable.call(projected, 'majorBandsRawRow'), false, 'raw row reference enumerable');
    assert.equal(Object.prototype.propertyIsEnumerable.call(projected, 'majorBandsRawSchema'), false, 'raw schema reference enumerable');
    assert.ok(Array.isArray(projected.majorBandsRawRow), 'raw row reference absent');
    assert.ok(Array.isArray(projected.majorBandsRawSchema), 'raw schema reference absent');
    const restored = decodeMajorBandsStaticRow(projected.majorBandsRawRow, projected.majorBandsRawSchema);
    assert.equal(restored.id, projected.id, 'raw row page decode id');
    assert.equal(restored.school, projected.school, 'raw row page decode school');
    const serialized = JSON.stringify(projected);
    assert.ok(!serialized.includes('majorBandsRawRow'), 'raw row reference serialized');
    assert.ok(!serialized.includes('majorBandsRawSchema'), 'raw schema reference serialized');
    const serializedProjected = decodeMajorBandsRankOrderRow(payload.rows[0], projectionSchema, {
      rawRowStorage: 'serialized-json'
    });
    assert.equal(typeof serializedProjected.majorBandsRawRow, 'string', 'serialized raw row absent');
    assert.equal(serializedProjected.majorBandsRawRowStorage, 'serialized-json', 'serialized raw row storage');
    assert.equal(Object.prototype.propertyIsEnumerable.call(serializedProjected, 'majorBandsRawRow'), false, 'serialized raw row enumerable');
    const serializedRestored = decodeMajorBandsStaticRow(
      serializedProjected.majorBandsRawRow,
      serializedProjected.majorBandsRawSchema
    );
    assert.equal(serializedRestored.id, serializedProjected.id, 'serialized raw row page decode id');
    assert.equal(serializedRestored.school, serializedProjected.school, 'serialized raw row page decode school');
  }
  buckets.set(bucket.file, records);
  projectedBuckets.set(bucket.file, projectedRecords);
  allRecords.push(...records);
}

assertMajorBandsRankIndex();
assert.equal(manifest.version, 'major-bands-static-v3972_2');
assert.equal(manifest.recordCount, MAJOR_BANDS_RANK_INDEX_RECORD_COUNT);
assert.equal(allRecords.length, MAJOR_BANDS_RANK_INDEX_RECORD_COUNT);
assert.equal(new Set(allRecords.map(record => record.id)).size, allRecords.length);
assert.equal(MAJOR_BANDS_RANK_BUCKETS.length, manifest.buckets.length);

const manifestBuckets = new Map(manifest.buckets.map(bucket => [bucket.file, bucket]));
for (const indexBucket of MAJOR_BANDS_RANK_BUCKETS) {
  const manifestBucket = manifestBuckets.get(indexBucket.file);
  assert.ok(manifestBucket, `${indexBucket.file}: absent from stable manifest`);
  const records = buckets.get(indexBucket.file) || [];
  const scores = records.map(record => Number(record.score2026));
  const ranks = records.map(record => Number(record.rank2026));
  assert.equal(records.length, Number(indexBucket.recordCount), `${indexBucket.file}: index recordCount`);
  assert.equal(indexBucket.recordCount, Number(manifestBucket.recordCount), `${indexBucket.file}: manifest recordCount`);
  assert.equal(indexBucket.bytes, Number(manifestBucket.bytes), `${indexBucket.file}: manifest bytes`);
  assert.equal(indexBucket.sha256, manifestBucket.sha256, `${indexBucket.file}: manifest sha256`);
  assert.equal(indexBucket.minScore, Math.min(...scores), `${indexBucket.file}: minScore`);
  assert.equal(indexBucket.maxScore, Math.max(...scores), `${indexBucket.file}: maxScore`);
  assert.equal(indexBucket.minRank, Math.min(...ranks), `${indexBucket.file}: minRank`);
  assert.equal(indexBucket.maxRank, Math.max(...ranks), `${indexBucket.file}: maxRank`);
}

function setOf(records) {
  return new Set(records.map(record => record.id));
}

function assertEqualSets(actual, expected, label) {
  assert.equal(actual.size, expected.size, `${label}: size`);
  for (const id of expected) assert.ok(actual.has(id), `${label}: missing ${id}`);
  for (const id of actual) assert.ok(expected.has(id), `${label}: unexpected ${id}`);
}

function canonical(record, candidateScore, candidateRank, preset) {
  return resolveCanonicalPosition({
    candidateScore,
    candidateRank,
    recordScore: record.score2026,
    recordRank: record.rank2026,
    rangePreset: preset,
    totalRank: LN_2026_PHYSICS_SCORE_RANK_META.totalAt150
  });
}

function selectedRecords(selected) {
  return selected.flatMap(bucket => buckets.get(bucket.file) || []);
}

function selectedProjectedRecords(selected) {
  return selected.flatMap(bucket => projectedBuckets.get(bucket.file) || []);
}

function kernelFor(score, preset) {
  const row = lookupLn2026PhysicsScore(score);
  const candidateRank = row ? { rankForGap: row.rankForGap } : null;
  const windows = rankWindowsForCandidate(
    candidateRank?.rankForGap,
    preset,
    LN_2026_PHYSICS_SCORE_RANK_META.totalAt150
  );
  const selected = selectMajorBandsRankBuckets(windows);
  const records = selectedRecords(selected);
  const result = processMajorBandsRankWindow(records, {
    candidateScore: score,
    candidateRank,
    rangePreset: preset,
    region: 'all',
    majorKeyword: '',
    bottomLineMode: 'all',
    specialProjectMode: 'show_eligibility_projects',
    schoolFilter: false,
    acceptedSchoolNames: []
  });
  return { row, candidateRank, windows, selected, records, result };
}

const presets = ['standard', 'wide', 'safe'];
const summary = {
  version: 'major-bands-full-recall-audit-v3990_2',
  sourceRecords: allRecords.length,
  queries: 0,
  rankQueries: 0,
  rankUnavailableQueries: 0,
  truthSetEqualQueries: 0,
  kernelSetEqualQueries: 0,
  paginationBands: 0,
  paginationIds: 0,
  maxSelectedBuckets: 0,
  rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
  orderProjectionVersion: MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
  orderProjectionCases: 0,
  rankRowFilterCases: 0,
  rankRowFilterRawRows: 0,
  rankRowFilterDecodedRows: 0,
  rankRowFilterSkippedRows: 0,
  rankRowFilterMaxRawRows: 0,
  rankRowFilterMaxDecodedRows: 0,
  rankRowFilterWorstCase: null,
  presetBucketCounts: Object.fromEntries(presets.map(preset => [preset, { min: Infinity, max: 0, queries: 0 }])),
  highBoundary: []
};

for (let score = 344; score <= 750; score += 1) {
  for (const preset of presets) {
    summary.queries += 1;
    const query = kernelFor(score, preset);
    if (!query.row) {
      summary.rankUnavailableQueries += 1;
      assert.ok(score > LN_2026_PHYSICS_SCORE_RANK_META.topScore, `${score}/${preset}: unexpected missing rank`);
      assert.equal(query.selected.length, 0, `${score}/${preset}: high boundary selected buckets`);
      assert.equal(query.result.stats.rankUnavailable, true, `${score}/${preset}: missing-rank contract`);
      assert.equal(query.result.grouped.upper.count + query.result.grouped.near.count + query.result.grouped.steady.count, 0);
      summary.highBoundary.push({ score, preset, status: 200, count: 0, bucketCount: 0 });
      continue;
    }

    summary.rankQueries += 1;
    summary.maxSelectedBuckets = Math.max(summary.maxSelectedBuckets, query.selected.length);
    assert.ok(query.selected.length > 0, `${score}/${preset}: no executable rank buckets`);
    const bucketEvidence = summary.presetBucketCounts[preset];
    bucketEvidence.min = Math.min(bucketEvidence.min, query.selected.length);
    bucketEvidence.max = Math.max(bucketEvidence.max, query.selected.length);
    bucketEvidence.queries += 1;

    const truthByBand = { upper: [], near: [], steady: [] };
    for (const record of allRecords) {
      const position = canonical(record, score, query.candidateRank.rankForGap, preset);
      if (truthByBand[position.bandKey]) truthByBand[position.bandKey].push(record);
    }
    const truth = setOf([...truthByBand.upper, ...truthByBand.near, ...truthByBand.steady]);
    for (const band of ['upper', 'near', 'steady']) {
      const scoped = scopeMajorBandsRankBucketsForRequest(query.selected, {
        candidateScore: score,
        rangePreset: preset,
        band
      });
      const rawScopedRecords = selectedRecords(scoped.buckets);
      const filteredRecords = rawScopedRecords.filter(record => (
        majorBandsRankValueMatchesRange(record.rank2026, query.windows[band])
      ));
      const projectedFilteredRecords = selectedProjectedRecords(scoped.buckets).filter(record => (
        majorBandsRankValueMatchesRange(record.rank2026, query.windows[band])
      ));
      const defaultOptions = {
        candidateScore: score,
        candidateRank: query.candidateRank,
        rangePreset: preset,
        region: 'all',
        majorKeyword: '',
        bottomLineMode: 'all',
        specialProjectMode: 'hide_eligibility_projects',
        schoolFilter: false,
        acceptedSchoolNames: [],
        requestedBand: band,
        mutateSourceRecords: false
      };
      const fullOrder = processMajorBandsRankWindow(filteredRecords, defaultOptions).grouped[band].ordered.map(record => record.id);
      const projectedOrder = processMajorBandsRankWindow(projectedFilteredRecords, defaultOptions).grouped[band].ordered.map(record => record.id);
      assert.deepEqual(projectedOrder, fullOrder, `${score}/${preset}/${band}: minimal projection order`);
      summary.orderProjectionCases += 1;
      assertEqualSets(
        setOf(filteredRecords),
        setOf(truthByBand[band]),
        `${score}/${preset}/${band}: predecode rank-row filter truth`
      );
      summary.rankRowFilterCases += 1;
      summary.rankRowFilterRawRows += rawScopedRecords.length;
      summary.rankRowFilterDecodedRows += filteredRecords.length;
      summary.rankRowFilterSkippedRows += rawScopedRecords.length - filteredRecords.length;
      summary.rankRowFilterMaxRawRows = Math.max(summary.rankRowFilterMaxRawRows, rawScopedRecords.length);
      summary.rankRowFilterMaxDecodedRows = Math.max(summary.rankRowFilterMaxDecodedRows, filteredRecords.length);
      if (score === 358 && preset === 'safe' && band === 'upper') {
        summary.rankRowFilterWorstCase = {
          score,
          preset,
          band,
          scopedBuckets: scoped.buckets.length,
          rawRows: rawScopedRecords.length,
          decodedRows: filteredRecords.length,
          skippedRows: rawScopedRecords.length - filteredRecords.length
        };
      }
    }
    const recalled = setOf(query.records.filter(record => {
      const band = canonical(record, score, query.candidateRank.rankForGap, preset).bandKey;
      return ['upper', 'near', 'steady'].includes(band);
    }));
    assertEqualSets(recalled, truth, `${score}/${preset}: truth vs rank buckets`);
    summary.truthSetEqualQueries += 1;

    const kernelUnion = setOf([
      ...query.result.grouped.upper.ordered,
      ...query.result.grouped.near.ordered,
      ...query.result.grouped.steady.ordered
    ]);
    assertEqualSets(kernelUnion, truth, `${score}/${preset}: truth vs kernel`);
    summary.kernelSetEqualQueries += 1;

    for (const band of ['upper', 'near', 'steady']) {
      const ordered = query.result.grouped[band].ordered;
      const expected = setOf(truthByBand[band]);
      assertEqualSets(setOf(ordered), expected, `${score}/${preset}/${band}: band truth`);
      const seen = new Set();
      const queryIdentity = `${score}|${preset}|${band}`;
      const expectedSnapshot = majorBandsSnapshotId(ordered, queryIdentity);
      let offset = 0;
      let previousOffset = -1;
      while (true) {
        const page = paginateMajorBandsRecords(ordered, {
          offset,
          limit: 37,
          queryIdentity
        });
        assert.equal(page.count, ordered.length);
        assert.equal(page.pagination.snapshot, expectedSnapshot);
        assert.ok(page.pagination.offset > previousOffset, `${score}/${preset}/${band}: offset did not move`);
        for (const record of page.records) {
          assert.ok(!seen.has(record.id), `${score}/${preset}/${band}: duplicate page ID ${record.id}`);
          seen.add(record.id);
        }
        if (!page.pagination.hasMore) {
          assert.equal(page.pagination.nextOffset, null);
          break;
        }
        assert.ok(page.pagination.nextOffset > offset, `${score}/${preset}/${band}: nextOffset not strict`);
        previousOffset = offset;
        offset = page.pagination.nextOffset;
      }
      assertEqualSets(seen, expected, `${score}/${preset}/${band}: paged union`);
      summary.paginationBands += 1;
      summary.paginationIds += seen.size;
    }
  }
}

assert.equal(summary.queries, 407 * presets.length);
assert.equal(summary.rankQueries, 365 * presets.length);
assert.equal(summary.rankUnavailableQueries, 42 * presets.length);
assert.equal(summary.truthSetEqualQueries, summary.rankQueries);
assert.equal(summary.kernelSetEqualQueries, summary.rankQueries);
assert.equal(summary.orderProjectionCases, 365 * presets.length * 3);
assert.ok(summary.highBoundary.every(item => item.status === 200 && item.count === 0));
for (const preset of presets) {
  const bucketEvidence = summary.presetBucketCounts[preset];
  assert.equal(bucketEvidence.queries, 365, `${preset}: executable query count`);
  assert.ok(Number.isFinite(bucketEvidence.min) && bucketEvidence.min > 0, `${preset}: minimum bucket count`);
  assert.ok(bucketEvidence.max >= bucketEvidence.min, `${preset}: maximum bucket count`);
}

const staticProviderSource = fs.readFileSync('functions/_lib/major-bands-static-provider.js', 'utf8');
for (const required of [
  "MAJOR_BANDS_RANK_ROW_FILTER_VERSION = 'major-bands-rank-row-filter-v3990_2'",
  "MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION = 'major-bands-rank-row-native-scan-v3990_2'",
  'scanMajorBandsStaticRankRowsText',
  'majorBandsRankValueMatchesRange(scalarValues.get(rankIndex), rankRange)',
  "MAJOR_BANDS_PAGE_ID_ID_FIRST_PREFILTER_VERSION = 'major-bands-page-id-id-first-prefilter-v3990_2'",
  "'native-page-id-id-first-prefilter' : 'native-row-text-scan'"
]) assert.ok(staticProviderSource.includes(required), `predecode native rank-row filter missing ${required}`);
const bucketLoaderSource = fs.readFileSync('functions/_lib/major-bands-rank-bucket-loader.v3990_2.js', 'utf8');
for (const required of [
  'function bucketReadKey',
  'rankRange: scope.requestedRange',
  'const MAX_LOAD_CONCURRENCY = 1',
  'const ALL_BANDS_LOAD_CONCURRENCY = 3'
]) assert.ok(bucketLoaderSource.includes(required), `bounded rank-row loader missing ${required}`);

const queryKernelSource = fs.readFileSync('functions/_lib/major-bands-rank-query-kernel.v3990_2.js', 'utf8');
for (const required of [
  "MAJOR_BANDS_RANK_QUERY_MEMORY_MODE = 'requested-band-lightweight-order-current-page-v3990_2'",
  'compactCanonicalPositionForRanking',
  'deferResponseEnrichment = !hasKeywordSearch',
  "rankingCandidateMode: deferResponseEnrichment",
  'responseEnrichedCandidates: deferResponseEnrichment ? 0 : normalized'
]) assert.ok(queryKernelSource.includes(required), `lightweight current-page ranking contract missing ${required}`);

const apiSource = fs.readFileSync('functions/api/major-bands.js', 'utf8');
for (const required of [
  "MAJOR_BANDS_REQUESTED_BAND_ORDER_CACHE_VERSION = 'major-bands-requested-band-order-id-lru-v3990_2'",
  'executeRequestedBandOrderedPage',
  'orderedIds: ordered.map(record => record.id)',
  'allowedIds: new Set(pageIds)',
  'requestedBandOrderCacheRetainsDecodedRows: false',
  'requestedBandOrderCacheRetainsEnrichedRecords: false',
  "MAJOR_BANDS_ORDER_PAGE_SOURCE_VERSION = 'major-bands-order-page-raw-row-reuse-v3990_2'",
  "orderPageSource: rawRowReuse ? 'raw-row-reuse' : 'full-record-reuse'",
  "orderColdSecondAssetPass: orderCacheStatus === 'ordered-id-miss'",
  'requestedBandRawRowReferenceNonEnumerable: execution.rawRowReferenceNonEnumerable === true',
  'const requestedBandOrderCache = new Map()',
  'REQUESTED_BAND_ORDER_CACHE_MAX_ENTRIES = 8',
  'REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_IDS = 12_000',
  'REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_CHARS = 750_000',
  'evictOldestRequestedBandOrderEntry',
  'requestedBandOrderCacheBounded: execution.orderCacheState?.bounded !== false'
]) assert.ok(apiSource.includes(required), `ordered-ID pagination contract missing ${required}`);
for (const forbidden of [
  'major-bands-bucket-orchestrator',
  'runMajorBandsBucketWorkers',
  "new URL('/api/major-bands-bucket'",
  'maxCandidates',
  'selected.buckets.length > 12'
]) {
  assert.ok(!apiSource.includes(forbidden), `retired fanout path remains: ${forbidden}`);
}
for (const required of [
  'rank_unavailable_empty',
  'publicHttpSelfFanout: false',
  'candidateLimit: null',
  'stable-full-id-snapshot-v3990_2',
  's-maxage=60'
]) {
  assert.ok(apiSource.includes(required), `missing v3990 contract: ${required}`);
}

const benchmarkCases = [
  [579, 'standard'],
  [508, 'standard'],
  [680, 'wide'],
  [449, 'safe']
];
const benchmark = [];
for (const [score, preset] of benchmarkCases) {
  kernelFor(score, preset);
  kernelFor(score, preset);
  const samples = [];
  for (let index = 0; index < 9; index += 1) {
    const started = performance.now();
    const value = kernelFor(score, preset);
    samples.push(performance.now() - started);
    assert.ok(value.result.stats.rawScanned > 0);
  }
  const ordered = [...samples].sort((left, right) => left - right);
  const median = ordered[Math.floor(ordered.length / 2)];
  const p95 = ordered[Math.ceil(ordered.length * 0.95) - 1];
  assert.ok(median < 180, `${score}/${preset}: median ${median.toFixed(1)}ms`);
  assert.ok(p95 < 350, `${score}/${preset}: p95 ${p95.toFixed(1)}ms`);
  benchmark.push({ score, preset, medianMs: Number(median.toFixed(2)), p95Ms: Number(p95.toFixed(2)) });
}
summary.benchmark = benchmark;

const evidencePath = process.env.MAJOR_BANDS_RANK_AUDIT_EVIDENCE || '/tmp/major-bands-rank-kernel-v3990_2.json';
fs.writeFileSync(evidencePath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
