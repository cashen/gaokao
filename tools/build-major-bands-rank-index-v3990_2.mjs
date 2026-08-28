import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_VERSION = 'major-bands-static-v3972_2';
const INDEX_VERSION = 'major-bands-rank-index-v3990_2';
const MANIFEST_PATH = 'ln-rank/data/major-bands-static-v3972_2/manifest.json';
const OUTPUT_PATH = 'functions/_lib/major-bands-rank-index.v3990_2.js';

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
assert.equal(manifest.version, SOURCE_VERSION);
assert.equal(manifest.recordCount, 11628);
assert.ok(Array.isArray(manifest.recordSchema));
assert.ok(Array.isArray(manifest.buckets));

const scoreIndex = manifest.recordSchema.indexOf('score2026');
const rankIndex = manifest.recordSchema.indexOf('rank2026');
assert.ok(scoreIndex >= 0 && rankIndex >= 0, 'score/rank schema fields are required');

const entries = manifest.buckets.map(bucket => {
  const filePath = path.resolve(String(bucket.file).replace(/^\/+/, ''));
  const raw = fs.readFileSync(filePath);
  assert.equal(raw.byteLength, Number(bucket.bytes), `${bucket.file}: bytes`);
  assert.equal(
    crypto.createHash('sha256').update(raw).digest('hex'),
    bucket.sha256,
    `${bucket.file}: sha256`
  );
  const payload = JSON.parse(raw.toString('utf8'));
  assert.equal(payload.version, SOURCE_VERSION, `${bucket.file}: version`);
  assert.ok(Array.isArray(payload.rows), `${bucket.file}: rows`);
  assert.equal(payload.rows.length, Number(bucket.recordCount), `${bucket.file}: recordCount`);
  const scores = payload.rows.map(row => Number(row[scoreIndex])).filter(Number.isFinite);
  const ranks = payload.rows.map(row => Number(row[rankIndex])).filter(Number.isFinite);
  assert.equal(scores.length, payload.rows.length, `${bucket.file}: score coverage`);
  assert.equal(ranks.length, payload.rows.length, `${bucket.file}: rank coverage`);
  return {
    file: bucket.file,
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    minRank: Math.min(...ranks),
    maxRank: Math.max(...ranks),
    recordCount: payload.rows.length,
    bytes: Number(bucket.bytes),
    sha256: bucket.sha256
  };
});

const output = `export const MAJOR_BANDS_RANK_INDEX_VERSION = '${INDEX_VERSION}';
export const MAJOR_BANDS_RANK_INDEX_SOURCE = '${SOURCE_VERSION}';
export const MAJOR_BANDS_RANK_INDEX_RECORD_COUNT = ${manifest.recordCount};

export const MAJOR_BANDS_RANK_BUCKETS = Object.freeze(${JSON.stringify(entries, null, 2)}.map(Object.freeze));

function overlaps(bucket, range) {
  return Number(bucket.minRank) <= Number(range.maxRank)
    && Number(bucket.maxRank) >= Number(range.minRank);
}

export function selectMajorBandsRankBuckets(rankWindows) {
  if (!rankWindows) return [];
  const ranges = ['upper', 'near', 'steady']
    .map(key => rankWindows[key])
    .filter(range => Number.isFinite(Number(range?.minRank)) && Number.isFinite(Number(range?.maxRank)));
  if (!ranges.length) return [];
  return MAJOR_BANDS_RANK_BUCKETS.filter(bucket => ranges.some(range => overlaps(bucket, range)));
}

export function assertMajorBandsRankIndex() {
  if (MAJOR_BANDS_RANK_BUCKETS.length !== 73) throw new Error('major-bands rank index bucket count mismatch');
  const records = MAJOR_BANDS_RANK_BUCKETS.reduce((sum, bucket) => sum + Number(bucket.recordCount || 0), 0);
  if (records !== MAJOR_BANDS_RANK_INDEX_RECORD_COUNT) throw new Error('major-bands rank index record count mismatch');
  const files = new Set(MAJOR_BANDS_RANK_BUCKETS.map(bucket => bucket.file));
  if (files.size !== MAJOR_BANDS_RANK_BUCKETS.length) throw new Error('major-bands rank index duplicate bucket');
  for (const bucket of MAJOR_BANDS_RANK_BUCKETS) {
    if (!(bucket.minRank > 0 && bucket.maxRank >= bucket.minRank)) throw new Error(\`major-bands rank index invalid rank range: \${bucket.file}\`);
    if (!(bucket.minScore > 0 && bucket.maxScore >= bucket.minScore)) throw new Error(\`major-bands rank index invalid score range: \${bucket.file}\`);
  }
  return true;
}
`;

fs.writeFileSync(OUTPUT_PATH, output);
console.log(JSON.stringify({
  ok: true,
  version: INDEX_VERSION,
  source: SOURCE_VERSION,
  buckets: entries.length,
  records: entries.reduce((sum, bucket) => sum + bucket.recordCount, 0),
  output: OUTPUT_PATH
}, null, 2));
