import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION,
  majorBandsRankValueMatchesRange,
  scanMajorBandsStaticRankRowsText
} from '../functions/_lib/major-bands-static-provider.js';

const manifest = JSON.parse(fs.readFileSync('ln-rank/data/major-bands-static-v3972_2/manifest.json', 'utf8'));
const schema = Array.isArray(manifest.recordSchema) ? manifest.recordSchema : [];
const rankIndex = schema.indexOf('rank2026');
const idIndex = schema.indexOf('id');
assert.ok(rankIndex >= 0 && idIndex >= 0, 'rank/id schema indexes missing');
assert.equal(MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION, 'major-bands-rank-row-native-scan-v3990_1');

const selectiveRange = Object.freeze({ minRank: 25000, maxRank: 65000 });
let total = 0;
let selectiveTruth = 0;
let selectiveScanned = 0;
let allowedTruth = 0;
let allowedScanned = 0;

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
  assert.equal(selective.rankMatchedCount, rankTruth.length, `${bucket.file}: rank truth count`);
  assert.deepEqual(selective.rows, allowedRowsTruth, `${bucket.file}: rank/id truth mismatch`);
  selectiveTruth += rankTruth.length;
  selectiveScanned += selective.rankMatchedCount;
  allowedTruth += allowedRowsTruth.length;
  allowedScanned += selective.rows.length;
}

assert.equal(total, Number(manifest.recordCount), 'full manifest record total');
assert.equal(selectiveScanned, selectiveTruth, 'selective rank truth total');
assert.equal(allowedScanned, allowedTruth, 'selective allowed-ID truth total');
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
  wholeBucketResponseJsonRequired: false
}, null, 2));
