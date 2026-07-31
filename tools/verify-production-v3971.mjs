const PAGES_BASE = process.env.PAGES_BASE || 'https://gaokao-4y9.pages.dev';
const CUSTOM_BASE = process.env.CUSTOM_BASE || 'https://gaokao.powers.org.cn';
const EXPECTED_RELEASE = process.env.EXPECTED_RELEASE || 'v3.9.72.2';
const EXPECTED_INDEX = 'local-strength-static-v3971_2';
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
  assert(!result.text.includes('1102'), `${result.url} returned Cloudflare Error 1102`);
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

async function verifyStaticContracts(token) {
  const urls = {
    runtime: `${PAGES_BASE}/api/ln-rank-runtime-health?release-check=${token}`,
    localPage: `${PAGES_BASE}/ln-rank/local-mainline.html?release-check=${token}`,
    localIndex: `${PAGES_BASE}/ln-rank/data/local-strength/local-strength-index.v3971_2.json?release-check=${token}`,
    all211Page: `${PAGES_BASE}/ln-rank/211-mainline.html?release-check=${token}`,
    all211Index: `${PAGES_BASE}/ln-rank/data/211-static/211-static-index.v3972_0.json?release-check=${token}`,
    compat211: `${PAGES_BASE}/api/academic-background?scope=211&mode=score&score=579&release-check=${token}`,
    legacy211: `${PAGES_BASE}/api/211-mainline?score=579&release-check=${token}`,
    customRelease: `${CUSTOM_BASE}/shared/resources/release/current-release.js?release-check=${token}`
  };
  const entries = await Promise.all(Object.entries(urls).map(async ([key, url]) => [key, await request(url, key.endsWith('Page') ? 'text/html' : '*/*')]));
  const result = Object.fromEntries(entries);
  for (const value of Object.values(result)) assert200(value);

  const runtime = parseJson(result.runtime);
  assert(runtime?.ok !== false, `runtime returned ok=false: ${result.runtime.text.slice(0, 1000)}`);

  assert(result.localPage.text.includes(`data-release="${EXPECTED_RELEASE}"`), 'LocalStrength production page release mismatch');
  assert(result.localPage.text.includes('local-strength-app.v3971_2.js?v=3971_2'), 'LocalStrength production runtime mismatch');
  assert(!result.localPage.text.includes('/api/local-strength'), 'LocalStrength page references forbidden API');
  const localIndex = parseJson(result.localIndex);
  assert(localIndex.version === EXPECTED_INDEX, `LocalStrength index version ${localIndex.version}`);
  assert(localIndex.meta?.completeEvaluation === true, 'LocalStrength coverage incomplete');
  assert(localIndex.meta?.matchedRecordCount === 243 && localIndex.records?.length === 243, `LocalStrength count ${localIndex.meta?.matchedRecordCount}/${localIndex.records?.length}`);
  assert(localIndex.meta?.evaluatedRecordCount === localIndex.meta?.localAdmissionRecordCount, 'LocalStrength evaluation mismatch');
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
    localStrengthRecords: localIndex.records.length,
    all211Records: all211.records.length,
    all211Bands: all211.scoreBands.length
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
  const runtime = parseJson(result.runtime);
  const health = parseJson(result.health);
  const score = parseJson(result.score);
  const school = parseJson(result.school);
  assert(runtime?.ok !== false, `runtime ok=false cycle ${cycle}`);
  assertBoundedHealth(health);
  assert(score?.ok !== false && school?.ok !== false, `query ok=false cycle ${cycle}`);
  const scoreRecords = recordCount(score);
  const schoolRecords = recordCount(school);
  assert(scoreRecords > 0, `579 query empty cycle ${cycle}`);
  assert(schoolRecords > 0, `东北大学 query empty cycle ${cycle}`);
  return {
    cycle,
    chunksRead: Number(health.probe?.chunksRead || 0),
    rawScanned: Number(health.probe?.rawScanned || 0),
    scoreRecords,
    schoolRecords
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
  cloudflare1102Count: 0,
  http503Count: 0
}, null, 2));
