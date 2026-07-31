import fs from 'node:fs';
import { performance } from 'node:perf_hooks';

const CHUNKS = [
  'fenxi/data/ln-rank-2026/chunks/rank_10000_20000.json',
  'fenxi/data/ln-rank-2026/chunks/rank_20000_30000.json'
];
const SCORE = 579;

function memory(label) {
  const value = process.memoryUsage();
  return {
    label,
    rssMB: Number((value.rss / 1024 / 1024).toFixed(2)),
    heapUsedMB: Number((value.heapUsed / 1024 / 1024).toFixed(2)),
    heapTotalMB: Number((value.heapTotal / 1024 / 1024).toFixed(2)),
    externalMB: Number((value.external / 1024 / 1024).toFixed(2))
  };
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

function number(value) {
  if (value == null || value === '') return null;
  const match = String(value).replace(/[,，\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return match && Number.isFinite(Number(match[0])) ? Number(match[0]) : null;
}

function rawScore(record = {}) {
  return number(record.score2026 ?? record.score ?? record.minScore ?? record['2026最低分'] ?? record['最低分']);
}

function first(record, keys) {
  for (const key of keys) {
    const value = text(record?.[key]);
    if (value) return value;
  }
  return '';
}

const provinceKeys = ['schoolProvince', 'province', '省份', '学校省份'];
const cityKeys = ['schoolCity', 'city', '城市', '学校城市', '所在地'];
const areaKeys = ['lnArea', '辽宁区域', '地域'];
const schoolKeys = ['school', 'schoolName', '院校名称', '学校名称'];
const majorKeys = ['major', 'majorName', '专业名称'];

const snapshots = [memory('start')];
const parseStarted = performance.now();
const chunkStats = [];
const allRecords = [];
for (const file of CHUNKS) {
  const textValue = fs.readFileSync(file, 'utf8');
  const parsed = JSON.parse(textValue);
  const records = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.records) ? parsed.records : []);
  allRecords.push(...records);
  chunkStats.push({
    file,
    fileBytes: fs.statSync(file).size,
    recordCount: records.length,
    firstRecordKeys: Object.keys(records[0] || {}).sort()
  });
}
const parseMs = performance.now() - parseStarted;
snapshots.push(memory('after-json-parse'));

const { makeBands } = await import('../functions/_lib/band-engine.js');
const bands = makeBands(SCORE, 'standard');
const window = {
  min: Math.min(...Object.values(bands).map(item => item.minScore)),
  max: Math.max(...Object.values(bands).map(item => item.maxScore))
};
const candidates = allRecords.filter(record => {
  const score = rawScore(record);
  return Number.isFinite(score) && score >= window.min && score <= window.max;
});

const fieldCoverage = {
  province: candidates.filter(record => first(record, provinceKeys)).length,
  city: candidates.filter(record => first(record, cityKeys)).length,
  area: candidates.filter(record => first(record, areaKeys)).length,
  provinceOrArea: candidates.filter(record => first(record, provinceKeys) || first(record, areaKeys)).length,
  cityOrArea: candidates.filter(record => first(record, cityKeys) || first(record, areaKeys)).length,
  school: candidates.filter(record => first(record, schoolKeys)).length,
  major: candidates.filter(record => first(record, majorKeys)).length
};
const percentage = Object.fromEntries(Object.entries(fieldCoverage).map(([key, count]) => [key, Number((count * 100 / Math.max(1, candidates.length)).toFixed(2))]));
const uniqueSchools = new Set(candidates.map(record => first(record, schoolKeys)).filter(Boolean));

const lightweightStarted = performance.now();
const lightweight = candidates.map(raw => ({
  school: first(raw, schoolKeys),
  major: first(raw, majorKeys),
  score: rawScore(raw),
  rank: number(raw.rank2026 ?? raw.rank ?? raw['2026最低位次'] ?? raw['最低位次']),
  province: first(raw, provinceKeys),
  city: first(raw, cityKeys),
  lnArea: first(raw, areaKeys),
  nature: first(raw, ['schoolNatureLabel', 'nature', '院校性质']),
  tuition: first(raw, ['tuition2026', 'tuition', 'tuition2025', '学费'])
}));
const lightweightMs = performance.now() - lightweightStarted;
snapshots.push(memory('after-lightweight-normalize'));

const importStarted = performance.now();
const { normalizeRecord } = await import('../functions/_lib/fenxi-normalizer.js');
const normalizeImportMs = performance.now() - importStarted;
snapshots.push(memory('after-full-normalizer-import'));

const fullStarted = performance.now();
const fullyNormalized = candidates.map(record => normalizeRecord(record));
const fullNormalizeMs = performance.now() - fullStarted;
snapshots.push(memory('after-full-normalize'));

const profileLocationSources = {};
for (const record of fullyNormalized) {
  const key = record.locationSource || 'missing';
  profileLocationSources[key] = (profileLocationSources[key] || 0) + 1;
}

const report = {
  candidateScore: SCORE,
  scoreWindow: window,
  bands,
  chunks: chunkStats,
  totalParsedRecords: allRecords.length,
  candidateRecords: candidates.length,
  uniqueSchools: uniqueSchools.size,
  fieldCoverage,
  fieldCoveragePercent: percentage,
  locationSourceAfterFullNormalize: profileLocationSources,
  timingMs: {
    parseChunks: Number(parseMs.toFixed(2)),
    lightweightNormalize: Number(lightweightMs.toFixed(2)),
    fullNormalizerImport: Number(normalizeImportMs.toFixed(2)),
    fullNormalize: Number(fullNormalizeMs.toFixed(2)),
    fullPerRecord: Number((fullNormalizeMs / Math.max(1, candidates.length)).toFixed(4)),
    lightweightPerRecord: Number((lightweightMs / Math.max(1, candidates.length)).toFixed(4))
  },
  memorySnapshots: snapshots,
  sampleRawRecords: candidates.slice(0, 5).map(record => ({
    school: first(record, schoolKeys),
    major: first(record, majorKeys),
    score: rawScore(record),
    province: first(record, provinceKeys),
    city: first(record, cityKeys),
    area: first(record, areaKeys),
    keys: Object.keys(record).sort()
  })),
  sampleLightweightRecords: lightweight.slice(0, 3),
  sampleFullRecords: fullyNormalized.slice(0, 3).map(record => ({
    school: record.school,
    major: record.major,
    score: record.score,
    province: record.province,
    city: record.city,
    lnArea: record.lnArea,
    locationSource: record.locationSource,
    locationConfidence: record.locationConfidence
  }))
};

console.log(JSON.stringify(report, null, 2));

if (!candidates.length) throw new Error('No 579-window candidates found');
if (fieldCoverage.school !== candidates.length || fieldCoverage.major !== candidates.length) {
  throw new Error('Admission record identity coverage is incomplete');
}
