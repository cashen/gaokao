import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION,
  MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION,
  MAJOR_BANDS_PAGE_ID_ID_FIRST_PREFILTER_VERSION,
  MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
  MAJOR_BANDS_RANK_BUCKET_DECODE_POLICY_VERSION,
  majorBandsRankValueMatchesRange,
  scanMajorBandsStaticRankRowsText,
  shouldUseMajorBandsNativeWholeBucketJson
} from '../functions/_lib/major-bands-static-provider.js';

const manifest = JSON.parse(fs.readFileSync('ln-rank/data/major-bands-static-v3972_2/manifest.json', 'utf8'));
const schema = Array.isArray(manifest.recordSchema) ? manifest.recordSchema : [];
const rankIndex = schema.indexOf('rank2026');
const idIndex = schema.indexOf('id');
assert.ok(rankIndex >= 0 && idIndex >= 0, 'rank/id schema indexes missing');
assert.equal(idIndex, 0, 'canonical id must remain schema index 0 for allocation-free page prefilter');
assert.equal(MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION, 'major-bands-rank-row-native-scan-v3990_3');
assert.equal(MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION, 'major-bands-page-id-native-prefilter-v3990_3');
assert.equal(MAJOR_BANDS_PAGE_ID_ID_FIRST_PREFILTER_VERSION, 'major-bands-page-id-id-first-prefilter-v3990_3');

assert.equal(MAJOR_BANDS_RANK_BUCKET_DECODE_POLICY_VERSION, 'major-bands-rank-bucket-hybrid-decode-v3990_3');
const partialRange = Object.freeze({ minRank: 100, maxRank: 200 });
const coveredBounds = Object.freeze({ minRank: 120, maxRank: 180 });
const boundaryBounds = Object.freeze({ minRank: 80, maxRank: 180 });
const minimalArray = Object.freeze({
  projection: MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
  rawRowStorage: 'array-reference',
  rankRange: partialRange
});
assert.equal(shouldUseMajorBandsNativeWholeBucketJson({ ...minimalArray, bucketRankBounds: coveredBounds }), true, 'fully covered requested-band bucket must stay native');
assert.equal(shouldUseMajorBandsNativeWholeBucketJson({ ...minimalArray, bucketRankBounds: boundaryBounds }), false, 'partial requested-band boundary bucket must use rank scanner');
assert.equal(shouldUseMajorBandsNativeWholeBucketJson({ ...minimalArray, bucketRankBounds: boundaryBounds, rawRowStorage: 'serialized-json' }), true, 'all-band serialized projection must stay native');
assert.equal(shouldUseMajorBandsNativeWholeBucketJson({ ...minimalArray, bucketRankBounds: boundaryBounds, platformTarget: '985' }), true, 'platform upgrade must stay native');
assert.equal(shouldUseMajorBandsNativeWholeBucketJson({ ...minimalArray, bucketRankBounds: boundaryBounds, allowedIds: new Set(['x']) }), false, 'page-ID path must remain scanner-owned');
assert.equal(shouldUseMajorBandsNativeWholeBucketJson({ rankRange: partialRange, bucketRankBounds: boundaryBounds }), true, 'full-record path must stay native');

const selectiveRange = Object.freeze({ minRank: 25000, maxRank: 65000 });
let total = 0;
let selectiveTruth = 0;
let selectiveScanned = 0;
let allowedTruth = 0;
let allowedScanned = 0;
let allowedFullRowParses = 0;
let allowedScalarPrefilters = 0;
let allowedPrimaryTraversalScans = 0;
let allowedRowTextAllocations = 0;
let avoidedRowTextAllocations = 0;

for (const bucket of manifest.buckets || []) {
  const path = `.${bucket.file}`;
  const text = fs.readFileSync(path, 'utf8');
  const payload = JSON.parse(text);
  assert.equal(payload.version, manifest.version, `${bucket.file}: legacy version`);
  assert.equal(payload.rows.length, Number(bucket.recordCount), `${bucket.file}: legacy count`);

  const all = scanMajorBandsStaticRankRowsText(text, {
    expectedVersion: manifest.version,
    expectedRecordCount: Number(bucket.recordCount),
    rankIndex,
    idIndex
  });
  assert.equal(all.mode, 'native-row-text-scan', `${bucket.file}: scan mode`);
  assert.equal(all.scanVersion, MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION, `${bucket.file}: scan version`);
  assert.equal(all.rowCount, payload.rows.length, `${bucket.file}: scan count`);
  assert.deepEqual(all.rows, payload.rows, `${bucket.file}: full truth mismatch`);
  total += all.rowCount;

  const rankTruth = payload.rows.filter(row => majorBandsRankValueMatchesRange(row?.[rankIndex], selectiveRange));
  const allowedIds = new Set(rankTruth.filter((_, index) => index % 3 === 0).map(row => String(row?.[idIndex] || '')));
  const allowedRowsTruth = rankTruth.filter(row => allowedIds.has(String(row?.[idIndex] || '')));
  const selective = scanMajorBandsStaticRankRowsText(text, {
    expectedVersion: manifest.version,
    expectedRecordCount: Number(bucket.recordCount),
    rankIndex,
    idIndex,
    rankRange: selectiveRange,
    allowedIds
  });
  assert.deepEqual(selective.rows, allowedRowsTruth, `${bucket.file}: rank/id truth mismatch`);
  assert.equal(selective.mode, 'native-page-id-id-first-prefilter', `${bucket.file}: ID-first mode`);
  assert.equal(selective.pageIdPrefilterVersion, MAJOR_BANDS_PAGE_ID_ID_FIRST_PREFILTER_VERSION, `${bucket.file}: ID-first version`);
  assert.equal(selective.pageIdScalarPrefilterCount, payload.rows.length, `${bucket.file}: ID-first scan count`);
  assert.equal(selective.pageIdPrimaryTraversalCount, payload.rows.length, `${bucket.file}: primary traversal ID scan count`);
  assert.equal(selective.pageIdRowTextAllocationCount, allowedRowsTruth.length, `${bucket.file}: rowText allocations only for page IDs`);
  assert.equal(selective.pageIdRowTextAvoidedCount, payload.rows.length - allowedRowsTruth.length, `${bucket.file}: avoided non-page rowText allocations`);
  assert.equal(selective.pageIdDirectLookupCount, 0, `${bucket.file}: direct lookup disabled`);
  assert.equal(selective.pageIdDirectLookupHits, 0, `${bucket.file}: direct lookup hits disabled`);
  assert.equal(selective.fullRowParseCount, allowedRowsTruth.length, `${bucket.file}: full row parse count`);
  selectiveTruth += rankTruth.length;
  selectiveScanned += rankTruth.length;
  allowedTruth += allowedRowsTruth.length;
  allowedScanned += selective.rows.length;
  allowedFullRowParses += selective.fullRowParseCount;
  allowedScalarPrefilters += selective.pageIdScalarPrefilterCount;
  allowedPrimaryTraversalScans += selective.pageIdPrimaryTraversalCount;
  allowedRowTextAllocations += selective.pageIdRowTextAllocationCount;
  avoidedRowTextAllocations += selective.pageIdRowTextAvoidedCount;
}

assert.equal(total, Number(manifest.recordCount), 'full manifest record total');
assert.equal(selectiveScanned, selectiveTruth, 'selective rank truth total');
assert.equal(allowedScanned, allowedTruth, 'selective allowed-ID truth total');
assert.equal(allowedFullRowParses, allowedTruth, 'allowed-ID full row parse total');
assert.equal(allowedScalarPrefilters, Number(manifest.recordCount), 'allowed-ID ID-first scan total');
assert.equal(allowedPrimaryTraversalScans, Number(manifest.recordCount), 'primary traversal ID scan total');
assert.equal(allowedRowTextAllocations, allowedTruth, 'rowText allocation only for allowed IDs');
assert.equal(avoidedRowTextAllocations, Number(manifest.recordCount) - allowedTruth, 'non-page rowText allocations avoided');
assert.throws(() => scanMajorBandsStaticRankRowsText('{"version":"major-bands-static-v3972_2","rows":[]}', {
  expectedVersion: manifest.version,
  expectedRecordCount: 1,
  rankIndex,
  idIndex
}), /记录数异常/);

console.log(JSON.stringify({
  ok: true,
  version: MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION,
  manifestRecords: total,
  selectiveRankRows: selectiveTruth,
  allowedRows: allowedTruth,
  fullTruthEqual: true,
  selectiveTruthEqual: true,
  pageIdIdFirstPrefilterVersion: MAJOR_BANDS_PAGE_ID_ID_FIRST_PREFILTER_VERSION,
  pageIdFullRowParses: allowedFullRowParses,
  pageIdIdFirstScans: allowedScalarPrefilters,
  pageIdPrimaryTraversalScans: allowedPrimaryTraversalScans,
  pageIdRowTextAllocations: allowedRowTextAllocations,
  pageIdRowTextAvoided: avoidedRowTextAllocations,
  directLookupDisabled: true,
  fullRowParseOnlyForAllowedIds: true,
  wholeBucketResponseJsonRequired: false
}, null, 2));
