import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'ln-rank/data/major-bands-static-v3972_2');
const SOURCE_MANIFEST = path.join(SOURCE_DIR, 'manifest.json');
const OUTPUT_DIR = path.join(ROOT, 'ln-rank/data/ai-major-history-v3990_3');
const VERSION = 'ai-major-history-index-v3990_3';
const SHARD_COUNT = 16;
const ROW_SCHEMA = Object.freeze([
  'id','school','major','score2026','rank2026','score2025','rank2025','score2024','rank2024',
  'province','city','lnArea','displayLocation','standardMajorCode','standardMajorName','schoolCode2026','majorCode2026'
]);

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value)); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function text(value) { return String(value == null ? '' : value).trim(); }
function norm(value) { return text(value).normalize('NFKC').toLowerCase().replace(/[\s·•,，。；;：:'"“”‘’!！?？_—\-（）()【】\[\]]+/g, ''); }
function shardFor(key) { return parseInt(crypto.createHash('sha1').update(key).digest('hex')[0], 16); }
function numberOrNull(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }

const source = readJson(SOURCE_MANIFEST);
if (source?.version !== 'major-bands-static-v3972_2' || Number(source?.recordCount) !== 11628) {
  throw new Error(`unexpected source manifest ${source?.version || 'unknown'} / ${source?.recordCount || 0}`);
}
const sourceIndexes = Object.fromEntries((source.recordSchema || []).map((key, index) => [key, index]));
for (const required of ['id','school','major','score2026','rank2026','province','city','lnArea','standardMajorName']) {
  if (!Number.isInteger(sourceIndexes[required])) throw new Error(`source field missing: ${required}`);
}

const groups = new Map();
const ids = new Set();
let total = 0;
for (const bucket of source.buckets || []) {
  const payload = readJson(path.join(ROOT, String(bucket.file || '').replace(/^\//, '')));
  for (const row of payload.rows || []) {
    const rawMajor = text(row[sourceIndexes.major]);
    const standardMajorName = text(row[sourceIndexes.standardMajorName]);
    const key = standardMajorName || rawMajor;
    if (!key) throw new Error('major history key missing');
    const id = text(row[sourceIndexes.id]);
    if (!id || ids.has(id)) throw new Error(`duplicate/missing id: ${id}`);
    ids.add(id);
    const record = [
      id,
      text(row[sourceIndexes.school]),
      rawMajor,
      numberOrNull(row[sourceIndexes.score2026]),
      numberOrNull(row[sourceIndexes.rank2026]),
      numberOrNull(row[sourceIndexes.score2025]),
      numberOrNull(row[sourceIndexes.rank2025]),
      numberOrNull(row[sourceIndexes.score2024]),
      numberOrNull(row[sourceIndexes.rank2024]),
      text(row[sourceIndexes.province]),
      text(row[sourceIndexes.city]),
      text(row[sourceIndexes.lnArea]),
      text(row[sourceIndexes.displayLocation]),
      text(row[sourceIndexes.standardMajorCode]),
      standardMajorName,
      text(row[sourceIndexes.schoolCode2026]),
      text(row[sourceIndexes.majorCode2026])
    ];
    if (!Number.isFinite(record[3])) throw new Error(`score missing for ${id}`);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
    total += 1;
  }
}
if (total !== 11628 || ids.size !== 11628) throw new Error(`major history coverage mismatch ${total}/${ids.size}`);

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(OUTPUT_DIR, 'shards'), { recursive: true });
const shards = Array.from({ length: SHARD_COUNT }, () => ({}));
const majors = {};
const lookup = {};
for (const key of [...groups.keys()].sort((a,b) => a.localeCompare(b, 'zh-Hans-CN'))) {
  const records = groups.get(key).sort((a,b) => Number(b[3]) - Number(a[3]) || Number(a[4] ?? Number.MAX_SAFE_INTEGER) - Number(b[4] ?? Number.MAX_SAFE_INTEGER) || String(a[1]).localeCompare(String(b[1]), 'zh-Hans-CN') || String(a[2]).localeCompare(String(b[2]), 'zh-Hans-CN') || String(a[0]).localeCompare(String(b[0]), 'zh-Hans-CN'));
  const shard = shardFor(key);
  shards[shard][key] = records;
  const scores = records.map(row => Number(row[3])).filter(Number.isFinite);
  majors[key] = { shard, count: records.length, minScore: Math.min(...scores), maxScore: Math.max(...scores) };
  const normalized = norm(key);
  if (normalized && !lookup[normalized]) lookup[normalized] = key;
}

const shardEntries = [];
for (let shard = 0; shard < SHARD_COUNT; shard += 1) {
  const relative = `shards/${shard.toString(16)}.json`;
  const file = path.join(OUTPUT_DIR, relative);
  const majorMap = shards[shard];
  writeJson(file, { version: VERSION, shard, rowSchema: ROW_SCHEMA, majors: majorMap });
  shardEntries.push({ shard, file: `/ln-rank/data/ai-major-history-v3990_3/${relative}`, bytes: fs.statSync(file).size, sha256: sha256(file), majorCount: Object.keys(majorMap).length, recordCount: Object.values(majorMap).reduce((sum, rows) => sum + rows.length, 0) });
}
const manifest = {
  version: VERSION,
  architecture: 'derived-canonical-major-history-shards',
  source: { version: source.version, recordCount: source.recordCount, manifestSha256: sha256(SOURCE_MANIFEST) },
  dataYear: 2026,
  audienceYear: 2027,
  recordCount: total,
  majorCount: Object.keys(majors).length,
  shardCount: SHARD_COUNT,
  rowSchema: ROW_SCHEMA,
  majors,
  lookup,
  shards: shardEntries,
  integrity: { sameTruthSet: true, sourceRecordCount: 11628, indexedRecordCount: total, duplicateIds: 0 }
};
writeJson(path.join(OUTPUT_DIR, 'manifest.json'), manifest);
console.log(JSON.stringify({ ok: true, version: VERSION, recordCount: total, majorCount: manifest.majorCount, shardCount: SHARD_COUNT, largestShardBytes: Math.max(...shardEntries.map(item => item.bytes)) }, null, 2));
