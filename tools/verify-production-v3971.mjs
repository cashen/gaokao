const PAGES_BASE = process.env.PAGES_BASE || 'https://gaokao-4y9.pages.dev';
const CUSTOM_BASE = process.env.CUSTOM_BASE || 'https://gaokao.powers.org.cn';
const EXPECTED_RELEASE = process.env.EXPECTED_RELEASE || 'v3.9.72.5';
const EXPECTED_LOCAL_STRENGTH_PAGE_RELEASE = process.env.EXPECTED_LOCAL_STRENGTH_PAGE_RELEASE || 'v3.9.71.2';
const EXPECTED_LOCAL_STRENGTH_SCORE_POSITION = process.env.EXPECTED_LOCAL_STRENGTH_SCORE_POSITION || 'local-strength-score-position-v3972_3';
const EXPECTED_INDEX = 'local-strength-static-v3971_2';
const EXPECTED_MAJOR_BANDS_ORCHESTRATION = 'major-bands-bounded-fanout-v3972_5';
const EXPECTED_MAJOR_BANDS_TRANSFER = 'major-bands-bucket-candidate-compact-v3972_5';
const EXPECTED_MAJOR_BANDS_MATERIALIZATION = 'major-bands-materialized-v3972_5';
const EXPECTED_MAJOR_BANDS_RESPONSE = 'major-bands-response-compact-v3972_5';
const EXPECTED_MAJOR_BANDS_BUCKET_CACHE = 'major-bands-bucket-cache-v3972_5';
const SCORE_RESPONSE_BUDGET_BYTES = 260000;
const SCHOOL_RESPONSE_BUDGET_BYTES = 180000;
const SCORE_TRANSFER_BUDGET_CHARS = 1200000;
const SCHOOL_TRANSFER_BUDGET_CHARS = 300000;
const WAIT_MS = Number(process.env.PRODUCTION_VERIFY_WAIT_MS || 10000);
const ATTEMPTS = Number(process.env.PRODUCTION_VERIFY_ATTEMPTS || 30);
const STRESS_CYCLES = Number(process.env.PRODUCTION_STRESS_CYCLES || 40);
const STRESS_WAIT_MS = Number(process.env.PRODUCTION_STRESS_WAIT_MS || 1000);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(url, accept = 'application/json') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept,
        'cache-control': 'no-cache',
        pragma: 'no-cache'
      }
    });
    return {
      url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      text: await response.text()
    };
  } finally {
    clearTimeout(timer);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoCloudflareResourceError(result) {
  const lower = result.text.toLowerCase();
  assert(result.status !== 503, `${result.url} returned HTTP 503; body=${result.text.slice(0, 500)}`);
  assert(!lower.includes('<title>error 1102') && !lower.includes('error code: 1102'), `${result.url} returned Cloudflare Error 1102`);
  assert(!lower.includes('worker exceeded resource limits'), `${result.url} exceeded Worker resource limits`);
}

function assert200(result) {
  assertNoCloudflareResourceError(result);
  assert(result.status === 200, `${result.url} returned HTTP ${result.status}; body=${result.text.slice(0, 500)}`);
}

function parseJson(result) {
  try {
    return JSON.parse(result.text);
  } catch (error) {
    throw new Error(`${result.url} JSON parse failed: ${error.message}; body=${result.text.slice(0, 500)}`);
  }
}

function recordCount(data) {
  return ['upper', 'near', 'steady'].reduce(
    (sum, key) => sum + Number(data?.bands?.[key]?.records?.length || 0),
    0
  );
}

function assertBoundedHealth(health) {
  assert(health?.ok !== false, `health returned ok=false: ${JSON.stringify(health).slice(0, 1000)}`);
  assert(health?.resourcePolicy?.fullDatasetProbeDisabled === true, 'health resource policy does not disable full scan');
  assert(health?.resourcePolicy?.largeChunkModuleCacheDisabled === true, 'health resource policy does not disable large chunk cache');
  assert(health?.resourcePolicy?.maximumProbeChunks === 1, `health maximumProbeChunks=${health?.resourcePolicy?.maximumProbeChunks}`);
  assert(health?.probe?.mode === 'bounded-manifest-plus-one-chunk', `health mode=${health?.probe?.mode}`);
  assert(health?.probe?.fullDatasetScan === false, 'health probe claims full dataset scan');
  assert(Number(health?.probe?.chunksRead || 0) <= 1, `health chunksRead=${health?.probe?.chunksRead}`);
  assert(Number(health?.probe?.rawScanned || 0) <= 2000, `health rawScanned=${health?.probe?.rawScanned}`);
  assert(health?.probe?.resourceBudget?.maxChunksRead === 1, `health probe maxChunksRead=${health?.probe?.resourceBudget?.maxChunksRead}`);
  assert(health?.probe?.resourceBudget?.parsedChunkCache === false, 'health probe parsed chunk cache enabled');
}

function assertMajorBandsExecution(data, label) {
  const source = data?.source || {};
  assert(source.bucketWorkerOrchestrationVersion === EXPECTED_MAJOR_BANDS_ORCHESTRATION, `${label} orchestration=${source.bucketWorkerOrchestrationVersion || 'missing'}`);
  assert(source.bucketCandidateTransferVersion === EXPECTED_MAJOR_BANDS_TRANSFER, `${label} transfer=${source.bucketCandidateTransferVersion || 'missing'}`);
  assert(source.responseTransportVersion === EXPECTED_MAJOR_BANDS_RESPONSE, `${label} response=${source.responseTransportVersion || 'missing'}`);
  assert(Number(source.bucketWorkerTransferChars || 0) > 0, `${label} transferChars=${source.bucketWorkerTransferChars}`);
  assert(Number(source.bucketWorkerConcurrency || 0) === 1, `${label} concurrency=${source.bucketWorkerConcurrency}`);
  assert(Number(source.bucketWorkerMaxAttempts || 0) === 3, `${label} maxAttempts=${source.bucketWorkerMaxAttempts}`);
  assert(source.bucketWorkerCacheVersion === EXPECTED_MAJOR_BANDS_BUCKET_CACHE, `${label} cacheVersion=${source.bucketWorkerCacheVersion || 'missing'}`);
  const cacheHits = Number(source.bucketWorkerCacheHits || 0);
  const cacheMisses = Number(source.bucketWorkerCacheMisses || 0);
  const cacheUnavailable = Number(source.bucketWorkerCacheUnavailable || 0);
  const workerCount = Number(source.bucketWorkerCount || 0);
  assert([cacheHits, cacheMisses, cacheUnavailable].every(Number.isInteger), `${label} invalid cache accounting`);
  assert(cacheHits + cacheMisses + cacheUnavailable === workerCount, `${label} cache accounting=${cacheHits}/${cacheMisses}/${cacheUnavailable}/${workerCount}`);
  assert(cacheUnavailable === 0, `${label} Cache API unavailable`);
  const retries = Number(source.bucketWorkerRetries || 0);
  assert(Number.isInteger(retries) && retries >= 0, `${label} retries=${source.bucketWorkerRetries}`);
}

async function verifyStaticContracts(token) {
  const urls = {
    pagesRelease: `${PAGES_BASE}/shared/resources/release/current-release.js?release-check=${token}`,
    runtime: `${PAGES_BASE}/api/ln-rank-runtime-health?release-check=${token}`,
    localPage: `${PAGES_BASE}/ln-rank/local-mainline.html?release-check=${token}`,
    localRuntime: `${PAGES_BASE}/ln-rank/js/local-strength/local-strength-app.v3971_2.js?release-check=${token}`,
    localScorePositionStyles: `${PAGES_BASE}/ln-rank/css/local-strength-score-position.v3972_3.css?release-check=${token}`,
    localRankMap: `${PAGES_BASE}/fenxi/data/rank_2026_physics.json?release-check=${token}`,
    localIndex: `${PAGES_BASE}/ln-rank/data/local-strength/local-strength-index.v3971_2.json?release-check=${token}`,
    forbiddenLocalApi: `${PAGES_BASE}/api/local-strength?release-check=${token}`,
    all211Page: `${PAGES_BASE}/ln-rank/211-mainline.html?release-check=${token}`,
    all211Index: `${PAGES_BASE}/ln-rank/data/211-static/211-static-index.v3972_0.json?release-check=${token}`,
    compat211: `${PAGES_BASE}/api/academic-background?scope=211&mode=score&score=579&release-check=${token}`,
    legacy211: `${PAGES_BASE}/api/211-mainline?score=579&release-check=${token}`,
    customRelease: `${CUSTOM_BASE}/shared/resources/release/current-release.js?release-check=${token}`
  };
  const entries = await Promise.all(Object.entries(urls).map(async ([key, url]) => [key, await request(url, key.endsWith('Page') ? 'text/html' : '*/*')]));
  const result = Object.fromEntries(entries);
  for (const [key, value] of Object.entries(result)) {
    if (key !== 'forbiddenLocalApi') assert200(value);
  }
  assertNoCloudflareResourceError(result.forbiddenLocalApi);
  assert(result.forbiddenLocalApi.status === 404, `/api/local-strength returned HTTP ${result.forbiddenLocalApi.status}`);

  assert(result.pagesRelease.text.includes(`display: '${EXPECTED_RELEASE}'`), 'Pages release contract mismatch');
  assert(result.pagesRelease.text.includes("all211Architecture: 'build-time-static-index'"), 'Pages 211 architecture contract mismatch');
  assert(result.pagesRelease.text.includes("localStrengthDataVersion: 'local-strength-static-v3971_2'"), 'Pages LocalStrength owner mismatch');
  assert(result.pagesRelease.text.includes(`majorBandsOrchestrationVersion: '${EXPECTED_MAJOR_BANDS_ORCHESTRATION}'`), 'Pages major-bands orchestration mismatch');
  assert(result.pagesRelease.text.includes(`majorBandsBucketTransferVersion: '${EXPECTED_MAJOR_BANDS_TRANSFER}'`), 'Pages major-bands transfer mismatch');
  assert(result.pagesRelease.text.includes(`majorBandsMaterializationVersion: '${EXPECTED_MAJOR_BANDS_MATERIALIZATION}'`), 'Pages major-bands materialization mismatch');
  assert(result.pagesRelease.text.includes(`majorBandsResponseTransportVersion: '${EXPECTED_MAJOR_BANDS_RESPONSE}'`), 'Pages major-bands response transport mismatch');

  const runtime = parseJson(result.runtime);
  assert(runtime?.ok !== false, `runtime returned ok=false: ${result.runtime.text.slice(0, 1000)}`);

  assert(result.localPage.text.includes(`data-release="${EXPECTED_LOCAL_STRENGTH_PAGE_RELEASE}"`), `LocalStrength page lineage is not ${EXPECTED_LOCAL_STRENGTH_PAGE_RELEASE}`);
  assert(result.localPage.text.includes('data-local-strength-score-position="local-strength-score-position-v3972_3"'), 'LocalStrength score position page contract missing');
  assert(result.localPage.text.includes('local-strength-app.v3971_2.js?v=3972_3'), 'LocalStrength cache-busted runtime mismatch');
  assert(result.localPage.text.includes('local-strength-score-position.v3972_3.css?v=3972_3'), 'LocalStrength score position styles missing');
  assert(result.localPage.text.includes('id="scorePositionGroups"'), 'LocalStrength position group controls missing');
  assert(!result.localPage.text.includes('/api/local-strength'), 'LocalStrength page references forbidden API');
  assert(result.localRuntime.text.includes(`SCORE_POSITION_VERSION = '${EXPECTED_LOCAL_STRENGTH_SCORE_POSITION}'`), 'LocalStrength score position runtime mismatch');
  assert(result.localRuntime.text.includes('/fenxi/data/rank_2026_physics.json?v=3972_3'), 'LocalStrength static rank lookup missing');
  assert(result.localRuntime.text.includes('rankDistance(a, rank) - rankDistance(b, rank)'), 'LocalStrength rank-distance sort missing');
  assert(result.localScorePositionStyles.text.includes('.ls-score-position-groups'), 'LocalStrength score position CSS contract missing');
  const rankMap = parseJson(result.localRankMap);
  assert(Number(rankMap?.['530']) === 40119 && Number(rankMap?.['579']) === 21051, 'LocalStrength score-rank lookup mismatch');
  const localIndex = parseJson(result.localIndex);
  assert(localIndex.version === EXPECTED_INDEX, `LocalStrength index version ${localIndex.version}`);
  assert(localIndex.meta?.completeEvaluation === true, 'LocalStrength coverage incomplete');
  assert(localIndex.meta?.matchedRecordCount === 243 && localIndex.records?.length === 243, `LocalStrength count ${localIndex.meta?.matchedRecordCount}/${localIndex.records?.length}`);
  assert(localIndex.meta?.evaluatedRecordCount === localIndex.meta?.localAdmissionRecordCount, 'LocalStrength coverage mismatch');
  assert(Number(localIndex.meta?.duplicatePublicRecordCount) === 0 && Number(localIndex.meta?.unresolvedLocalRecordCount) === 0, 'LocalStrength integrity mismatch');

  assert(result.all211Page.text.includes(`data-release="${EXPECTED_RELEASE}"`), '211 page release mismatch');
  assert(result.all211Page.text.includes('all211-static-app.v3972_0.js'), '211 static runtime missing');
  assert(!result.all211Page.text.includes('/api/academic-background'), '211 page references runtime background API');
  const all211 = parseJson(result.all211Index);
  assert(all211.version === 'all-211-static-v3972_0', `211 index version ${all211.version}`);
  assert(all211.meta?.completeEvaluation === true, '211 index incomplete');
  assert(all211.records?.length === 2494 && all211.scoreBands?.length === 8, `211 integrity ${all211.records?.length}/${all211.scoreBands?.length}`);

  for (const key of ['compat211', 'legacy211']) {
    const payload = parseJson(result[key]);
    assert(payload?.ok === true, `${key} ok=false`);
    assert(payload?.migratedToStatic === true && payload?.architecture === 'build-time-static-index', `${key} is not static migration`);
    assert(Number(payload?.scannedCount) === 0 && Number(payload?.matchedCount) === 0 && Number(payload?.count) === 0, `${key} performed runtime scan`);
    assert(Array.isArray(payload?.records) && payload.records.length === 0, `${key} returned runtime records`);
  }

  assert(result.customRelease.text.includes(`display: '${EXPECTED_RELEASE}'`), 'custom-domain release mismatch');
  return {
    release: EXPECTED_RELEASE,
    localStrengthPageRelease: EXPECTED_LOCAL_STRENGTH_PAGE_RELEASE,
    localStrengthScorePosition: EXPECTED_LOCAL_STRENGTH_SCORE_POSITION,
    localStrengthRecords: localIndex.records.length,
    rank530: Number(rankMap['530']),
    rank579: Number(rankMap['579']),
    all211Records: all211.records.length,
    all211Bands: all211.scoreBands.length,
    localStrengthApiStatus: result.forbiddenLocalApi.status
  };
}

async function verifyConcurrentCycle(cycle) {
  const token = `${process.env.GITHUB_SHA || 'manual'}-${cycle}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const urls = {
    runtime: `${PAGES_BASE}/api/ln-rank-runtime-health?stress=${token}`,
    health: `${PAGES_BASE}/api/major-bands-health?probe=1&stress=${token}`,
    score: `${PAGES_BASE}/api/major-bands?candidateScore=579&limit=16&stress=${token}`,
    school: `${PAGES_BASE}/api/major-bands?candidateScore=650&schoolKeyword=${encodeURIComponent('东北大学')}&limit=16&stress=${token}`
  };
  const entries = await Promise.all(Object.entries(urls).map(async ([key, url]) => [key, await request(url)]));
  const result = Object.fromEntries(entries);
  for (const value of Object.values(result)) assert200(value);
  const scoreBytes = Buffer.byteLength(result.score.text, 'utf8');
  const schoolBytes = Buffer.byteLength(result.school.text, 'utf8');
  assert(scoreBytes <= SCORE_RESPONSE_BUDGET_BYTES, `score response bytes=${scoreBytes}`);
  assert(schoolBytes <= SCHOOL_RESPONSE_BUDGET_BYTES, `school response bytes=${schoolBytes}`);
  assert(result.score.headers['x-gaokao-response-transport'] === EXPECTED_MAJOR_BANDS_RESPONSE, `score response header=${result.score.headers['x-gaokao-response-transport'] || 'missing'}`);
  assert(result.school.headers['x-gaokao-response-transport'] === EXPECTED_MAJOR_BANDS_RESPONSE, `school response header=${result.school.headers['x-gaokao-response-transport'] || 'missing'}`);
  const runtime = parseJson(result.runtime);
  const health = parseJson(result.health);
  const score = parseJson(result.score);
  const school = parseJson(result.school);
  assert(runtime?.ok !== false, `runtime ok=false cycle ${cycle}`);
  assertBoundedHealth(health);
  assert(score?.ok !== false && school?.ok !== false, `query ok=false cycle ${cycle}`);
  assertMajorBandsExecution(score, `score cycle ${cycle}`);
  assertMajorBandsExecution(school, `school cycle ${cycle}`);
  const scoreRecords = recordCount(score);
  const schoolRecords = recordCount(school);
  const scoreTransferChars = Number(score.source.bucketWorkerTransferChars || 0);
  const schoolTransferChars = Number(school.source.bucketWorkerTransferChars || 0);
  assert(scoreRecords > 0, `579 query empty cycle ${cycle}`);
  assert(schoolRecords > 0, `东北大学 query empty cycle ${cycle}`);
  assert(scoreTransferChars > 0 && scoreTransferChars <= SCORE_TRANSFER_BUDGET_CHARS, `score transfer chars=${scoreTransferChars}`);
  assert(schoolTransferChars > 0 && schoolTransferChars <= SCHOOL_TRANSFER_BUDGET_CHARS, `school transfer chars=${schoolTransferChars}`);
  const scoreCacheHits = Number(score.source.bucketWorkerCacheHits || 0);
  const schoolCacheHits = Number(school.source.bucketWorkerCacheHits || 0);
  if (cycle >= 2) {
    assert(scoreCacheHits > 0, `score cache did not warm by cycle ${cycle}`);
    assert(schoolCacheHits > 0, `school cache did not warm by cycle ${cycle}`);
  }
  return {
    cycle,
    chunksRead: Number(health.probe?.chunksRead || 0),
    rawScanned: Number(health.probe?.rawScanned || 0),
    scoreRecords,
    schoolRecords,
    scoreBytes,
    schoolBytes,
    scoreTransferChars,
    schoolTransferChars,
    scoreConcurrency: Number(score.source.bucketWorkerConcurrency),
    schoolConcurrency: Number(school.source.bucketWorkerConcurrency),
    scoreRetries: Number(score.source.bucketWorkerRetries || 0),
    schoolRetries: Number(school.source.bucketWorkerRetries || 0),
    scoreCacheHits,
    schoolCacheHits,
    scoreCacheMisses: Number(score.source.bucketWorkerCacheMisses || 0),
    schoolCacheMisses: Number(school.source.bucketWorkerCacheMisses || 0)
  };
}

let staticContracts;
let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    staticContracts = await verifyStaticContracts(`deployment-${attempt}-${Date.now()}`);
    console.log(JSON.stringify({ phase: 'deployment', attempt, ...staticContracts }, null, 2));
    break;
  } catch (error) {
    lastError = error;
    console.error(`deployment attempt ${attempt}/${ATTEMPTS}: ${error.message}`);
    if (attempt < ATTEMPTS) await sleep(WAIT_MS);
  }
}
if (!staticContracts) throw lastError || new Error('production deployment verification failed');

const cycles = [];
for (let cycle = 1; cycle <= STRESS_CYCLES; cycle += 1) {
  const result = await verifyConcurrentCycle(cycle);
  cycles.push(result);
  console.log(JSON.stringify({ phase: 'stress', ...result }));
  if (cycle < STRESS_CYCLES) await sleep(STRESS_WAIT_MS);
}

console.log(JSON.stringify({
  ok: true,
  phase: 'complete',
  ...staticContracts,
  stressCycles: cycles.length,
  maximumChunksRead: Math.max(...cycles.map(item => item.chunksRead)),
  maximumRawScanned: Math.max(...cycles.map(item => item.rawScanned)),
  minimumScoreRecords: Math.min(...cycles.map(item => item.scoreRecords)),
  minimumSchoolRecords: Math.min(...cycles.map(item => item.schoolRecords)),
  maximumScoreResponseBytes: Math.max(...cycles.map(item => item.scoreBytes)),
  maximumSchoolResponseBytes: Math.max(...cycles.map(item => item.schoolBytes)),
  maximumScoreTransferChars: Math.max(...cycles.map(item => item.scoreTransferChars)),
  maximumSchoolTransferChars: Math.max(...cycles.map(item => item.schoolTransferChars)),
  maximumScoreConcurrency: Math.max(...cycles.map(item => item.scoreConcurrency)),
  maximumSchoolConcurrency: Math.max(...cycles.map(item => item.schoolConcurrency)),
  totalScoreRetries: cycles.reduce((sum, item) => sum + item.scoreRetries, 0),
  totalSchoolRetries: cycles.reduce((sum, item) => sum + item.schoolRetries, 0),
  totalScoreCacheHits: cycles.reduce((sum, item) => sum + item.scoreCacheHits, 0),
  totalSchoolCacheHits: cycles.reduce((sum, item) => sum + item.schoolCacheHits, 0),
  maximumScoreCacheMisses: Math.max(...cycles.map(item => item.scoreCacheMisses)),
  maximumSchoolCacheMisses: Math.max(...cycles.map(item => item.schoolCacheMisses)),
  cloudflare1102Count: 0,
  http503Count: 0
}, null, 2));
