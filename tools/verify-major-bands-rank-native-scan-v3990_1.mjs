import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION,
  MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION,
  MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION,
  majorBandsRankValueMatchesRange,
  scanMajorBandsStaticRankRowsText
} from '../functions/_lib/major-bands-static-provider.js';

const manifest = JSON.parse(fs.readFileSync('ln-rank/data/major-bands-static-v3972_2/manifest.json', 'utf8'));
const schema = Array.isArray(manifest.recordSchema) ? manifest.recordSchema : [];
const rankIndex = schema.indexOf('rank2026');
const idIndex = schema.indexOf('id');
assert.ok(rankIndex >= 0 && idIndex >= 0, 'rank/id schema indexes missing');
assert.equal(MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION, 'major-bands-rank-row-native-scan-v3990_1');
assert.equal(MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION, 'major-bands-page-id-native-prefilter-v3990_1');
assert.equal(MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION, 'major-bands-page-id-direct-row-lookup-v3990_1');

const selectiveRange = Object.freeze({ minRank: 25000, maxRank: 65000 });
let total = 0;
let selectiveTruth = 0;
let selectiveScanned = 0;
let allowedTruth = 0;
let allowedScanned = 0;
let allowedFullRowParses = 0;
let allowedScalarPrefilters = 0;
let allowedDirectLookups = 0;
let allowedDirectHits = 0;

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
  assert.equal(selective.mode, 'native-page-id-direct-row-lookup', `${bucket.file}: direct lookup mode`);
  assert.equal(selective.pageIdPrefilterVersion, MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION, `${bucket.file}: direct lookup version`);
  assert.equal(selective.pageIdScalarPrefilterCount, 0, `${bucket.file}: scalar scan should be bypassed`);
  assert.equal(selective.pageIdDirectLookupCount, allowedIds.size, `${bucket.file}: direct lookup count`);
  assert.equal(selective.pageIdDirectLookupHits, allowedRowsTruth.length, `${bucket.file}: direct lookup hits`);
  assert.equal(selective.fullRowParseCount, allowedRowsTruth.length, `${bucket.file}: full row parse count`);
  selectiveTruth += rankTruth.length;
  selectiveScanned += rankTruth.length;
  allowedTruth += allowedRowsTruth.length;
  allowedScanned += selective.rows.length;
  allowedFullRowParses += selective.fullRowParseCount;
  allowedScalarPrefilters += selective.pageIdScalarPrefilterCount;
  allowedDirectLookups += selective.pageIdDirectLookupCount;
  allowedDirectHits += selective.pageIdDirectLookupHits;
}

assert.equal(total, Number(manifest.recordCount), 'full manifest record total');
assert.equal(selectiveScanned, selectiveTruth, 'selective rank truth total');
assert.equal(allowedScanned, allowedTruth, 'selective allowed-ID truth total');
assert.equal(allowedFullRowParses, allowedTruth, 'allowed-ID full row parse total');
assert.equal(allowedScalarPrefilters, 0, 'allowed-ID scalar prefilter bypass total');
assert.equal(allowedDirectHits, allowedTruth, 'allowed-ID direct hit total');
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
  pageIdDirectLookupVersion: MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION,
  pageIdFullRowParses: allowedFullRowParses,
  pageIdScalarPrefilters: allowedScalarPrefilters,
  pageIdDirectLookups: allowedDirectLookups,
  pageIdDirectHits: allowedDirectHits,
  fullRowParseOnlyForAllowedIds: true,
  wholeBucketResponseJsonRequired: false
}, null, 2));
