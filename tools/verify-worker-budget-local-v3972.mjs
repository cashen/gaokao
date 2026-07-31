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

const health = read('health');
const score = read('score');
const school = read('school');

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
  schoolRecords
}));
