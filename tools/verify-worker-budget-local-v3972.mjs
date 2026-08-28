import fs from 'node:fs';

const cycle = String(process.argv[2] || '').trim();
if (!cycle) throw new Error('cycle argument required');
const SCORE_TRANSFER_BUDGET_CHARS = 1200000;
const SCHOOL_TRANSFER_BUDGET_CHARS = 300000;
const EXPECTED_BUCKET_CACHE = 'major-bands-bucket-cache-v3972_5';

function read(name) {
  return JSON.parse(fs.readFileSync(`/tmp/v3972-${name}-${cycle}.json`, 'utf8'));
}

function count(data) {
  return ['upper', 'near', 'steady'].reduce(
    (sum, key) => sum + Number(data?.bands?.[key]?.records?.length || 0),
    0
  );
}

function assertBoundedOrchestration(data, label) {
  const source = data?.source || {};
  if (source.bucketWorkerOrchestrationVersion !== 'major-bands-bounded-fanout-v3972_5') {
    throw new Error(`${label} orchestration version=${source.bucketWorkerOrchestrationVersion || 'missing'}`);
  }
  const concurrency = Number(source.bucketWorkerConcurrency || 0);
  if (concurrency !== 1) {
    throw new Error(`${label} concurrency=${concurrency}`);
  }
  if (source.bucketCandidateTransferVersion !== 'major-bands-bucket-candidate-compact-v3972_5') {
    throw new Error(`${label} transfer=${source.bucketCandidateTransferVersion || 'missing'}`);
  }
  if (source.responseTransportVersion !== 'major-bands-response-compact-v3972_5') {
    throw new Error(`${label} response=${source.responseTransportVersion || 'missing'}`);
  }
  const transferChars = Number(source.bucketWorkerTransferChars || 0);
  if (transferChars < 1) throw new Error(`${label} transferChars=${source.bucketWorkerTransferChars}`);
  const transferBudget = label === 'score' ? SCORE_TRANSFER_BUDGET_CHARS : SCHOOL_TRANSFER_BUDGET_CHARS;
  if (transferChars > transferBudget) {
    throw new Error(`${label} transferChars=${transferChars} budget=${transferBudget}`);
  }
  if (Number(source.bucketWorkerMaxAttempts || 0) !== 3) {
    throw new Error(`${label} maxAttempts=${source.bucketWorkerMaxAttempts}`);
  }
  if (source.bucketWorkerCacheVersion !== EXPECTED_BUCKET_CACHE) {
    throw new Error(`${label} cacheVersion=${source.bucketWorkerCacheVersion || 'missing'}`);
  }
  const cacheHits = Number(source.bucketWorkerCacheHits || 0);
  const cacheMisses = Number(source.bucketWorkerCacheMisses || 0);
  const cacheUnavailable = Number(source.bucketWorkerCacheUnavailable || 0);
  const workerCount = Number(source.bucketWorkerCount || 0);
  if (![cacheHits, cacheMisses, cacheUnavailable].every(Number.isInteger)) {
    throw new Error(`${label} invalid cache accounting`);
  }
  if (cacheHits + cacheMisses + cacheUnavailable !== workerCount) {
    throw new Error(`${label} cache accounting=${cacheHits}/${cacheMisses}/${cacheUnavailable}/${workerCount}`);
  }
  const retries = Number(source.bucketWorkerRetries || 0);
  if (!Number.isInteger(retries) || retries < 0) {
    throw new Error(`${label} retries=${source.bucketWorkerRetries}`);
  }
}

const health = read('health');
const score = read('score');
const school = read('school');
const scoreBytes = fs.statSync(`/tmp/v3972-score-${cycle}.json`).size;
const schoolBytes = fs.statSync(`/tmp/v3972-school-${cycle}.json`).size;
if (scoreBytes > 260000) throw new Error(`score response bytes=${scoreBytes}`);
if (schoolBytes > 180000) throw new Error(`school response bytes=${schoolBytes}`);

if (health?.ok === false || score?.ok === false || school?.ok === false) {
  throw new Error(JSON.stringify({ health, score, school }).slice(0, 3000));
}
if (health?.resourcePolicy?.fullDatasetProbeDisabled !== true) {
  throw new Error('health full-dataset probe is not disabled');
}
if (health?.resourcePolicy?.largeChunkModuleCacheDisabled !== true) {
  throw new Error('health large-chunk module cache is not disabled');
}
if (health?.resourcePolicy?.maximumProbeChunks !== 1) {
  throw new Error(`maximumProbeChunks=${health?.resourcePolicy?.maximumProbeChunks}`);
}
if (health?.probe?.mode !== 'bounded-manifest-plus-one-chunk') {
  throw new Error(`probe mode=${health?.probe?.mode}`);
}
if (health?.probe?.fullDatasetScan !== false) {
  throw new Error('probe reports full dataset scan');
}
if (Number(health?.probe?.chunksRead || 0) > 1) {
  throw new Error(`probe chunksRead=${health?.probe?.chunksRead}`);
}
if (Number(health?.probe?.rawScanned || 0) > 2000) {
  throw new Error(`probe rawScanned=${health?.probe?.rawScanned}`);
}
if (health?.probe?.resourceBudget?.maxChunksRead !== 1) {
  throw new Error(`probe maxChunksRead=${health?.probe?.resourceBudget?.maxChunksRead}`);
}
if (health?.probe?.resourceBudget?.parsedChunkCache !== false) {
  throw new Error('probe parsed chunk cache is enabled');
}

assertBoundedOrchestration(score, 'score');
assertBoundedOrchestration(school, 'school');

const scoreRecords = count(score);
const schoolRecords = count(school);
if (scoreRecords < 1 || schoolRecords < 1) {
  throw new Error(`empty query ${scoreRecords}/${schoolRecords}`);
}

console.log(JSON.stringify({
  cycle,
  chunksRead: Number(health.probe?.chunksRead || 0),
  rawScanned: Number(health.probe?.rawScanned || 0),
  scoreRecords,
  schoolRecords,
  scoreBytes,
  schoolBytes,
  scoreTransferChars: Number(score.source.bucketWorkerTransferChars),
  schoolTransferChars: Number(school.source.bucketWorkerTransferChars),
  scoreConcurrency: Number(score.source.bucketWorkerConcurrency),
  schoolConcurrency: Number(school.source.bucketWorkerConcurrency),
  scoreRetries: Number(score.source.bucketWorkerRetries || 0),
  schoolRetries: Number(school.source.bucketWorkerRetries || 0),
  scoreCacheHits: Number(score.source.bucketWorkerCacheHits || 0),
  scoreCacheMisses: Number(score.source.bucketWorkerCacheMisses || 0),
  scoreCacheUnavailable: Number(score.source.bucketWorkerCacheUnavailable || 0),
  schoolCacheHits: Number(school.source.bucketWorkerCacheHits || 0),
  schoolCacheMisses: Number(school.source.bucketWorkerCacheMisses || 0),
  schoolCacheUnavailable: Number(school.source.bucketWorkerCacheUnavailable || 0)
}));
