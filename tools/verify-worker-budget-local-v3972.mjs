import fs from 'node:fs';

const cycle = String(process.argv[2] || '').trim();
if (!cycle) throw new Error('cycle argument required');

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
  if (Number(source.bucketWorkerTransferChars || 0) < 1) {
    throw new Error(`${label} transferChars=${source.bucketWorkerTransferChars}`);
  }
  if (Number(source.bucketWorkerMaxAttempts || 0) !== 2) {
    throw new Error(`${label} maxAttempts=${source.bucketWorkerMaxAttempts}`);
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
  schoolRetries: Number(school.source.bucketWorkerRetries || 0)
}));
