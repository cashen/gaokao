const PAGES_BASE = process.env.PAGES_BASE || 'https://gaokao-4y9.pages.dev';
const CUSTOM_BASE = process.env.CUSTOM_BASE || 'https://gaokao.powers.org.cn';
const EXPECTED_RELEASE = 'v3.9.72.1';
const WAIT_MS = Number(process.env.PRODUCTION_VERIFY_WAIT_MS || 10000);
const ATTEMPTS = Number(process.env.PRODUCTION_VERIFY_ATTEMPTS || 15);
const STRESS_CYCLES = 40;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(url, accept = 'application/json') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { accept, 'cache-control': 'no-cache', pragma: 'no-cache' }
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

function parseJson(result) {
  try {
    return JSON.parse(result.text);
  } catch (error) {
    throw new Error(`${result.url} JSON parse failed: ${error.message}; body=${result.text.slice(0, 500)}`);
  }
}

function assertHttp200(result) {
  assert(result.status === 200, `${result.url} returned HTTP ${result.status}; body=${result.text.slice(0, 500)}`);
}

function recordCount(data) {
  return ['upper', 'near', 'steady'].reduce((sum, key) => sum + Number(data?.bands?.[key]?.records?.length || 0), 0);
}

async function verifyDeployment(token) {
  const urls = {
    pagesRelease: `${PAGES_BASE}/shared/resources/release/current-release.js?postmerge=${token}`,
    pages211: `${PAGES_BASE}/ln-rank/211-mainline.html?postmerge=${token}`,
    pages211Data: `${PAGES_BASE}/ln-rank/data/211-static/211-static-index.v3972_0.json?postmerge=${token}`,
    pagesLocalData: `${PAGES_BASE}/ln-rank/data/local-strength/local-strength-index.v3971_2.json?postmerge=${token}`,
    academic211: `${PAGES_BASE}/api/academic-background?scope=211&score=600&postmerge=${token}`,
    legacy211: `${PAGES_BASE}/api/211-mainline?score=600&postmerge=${token}`,
    customRelease: `${CUSTOM_BASE}/shared/resources/release/current-release.js?postmerge=${token}`,
    custom211App: `${CUSTOM_BASE}/ln-rank/js/academic-background/all211-static-app.v3972_0.js?postmerge=${token}`
  };
  const entries = await Promise.all(Object.entries(urls).map(async ([key, url]) => [key, await request(url, key === 'pages211' ? 'text/html' : '*/*')]));
  const results = Object.fromEntries(entries);
  Object.values(results).forEach(assertHttp200);

  assert(results.pagesRelease.text.includes(`display: '${EXPECTED_RELEASE}'`), 'Pages release is not v3.9.72.1');
  assert(results.pagesRelease.text.includes("all211DataVersion: 'all-211-static-v3972_0'"), 'Pages 211 release owner mismatch');
  assert(results.pages211.text.includes('data-release="v3.9.72.1"'), '211 page release mismatch');
  assert(results.pages211.text.includes('all211-static-app.v3972_0.js'), '211 static app missing');
  assert(!results.pages211.text.includes('/api/academic-background'), '211 page still references runtime academic-background API');

  const all211 = parseJson(results.pages211Data);
  assert(all211.version === 'all-211-static-v3972_0', '211 index version mismatch');
  assert(all211.meta?.completeEvaluation === true, '211 index incomplete');
  assert(Array.isArray(all211.records) && all211.records.length === 2494, `211 record count ${all211.records?.length}`);
  assert(Array.isArray(all211.scoreBands) && all211.scoreBands.length === 8, `211 score band count ${all211.scoreBands?.length}`);

  const local = parseJson(results.pagesLocalData);
  assert(local.version === 'local-strength-static-v3971_2', 'LocalStrength index version mismatch');
  assert(local.meta?.matchedRecordCount === 243, `LocalStrength meta count ${local.meta?.matchedRecordCount}`);
  assert(Array.isArray(local.records) && local.records.length === 243, `LocalStrength record count ${local.records?.length}`);

  for (const key of ['academic211', 'legacy211']) {
    const payload = parseJson(results[key]);
    assert(payload.ok === true, `${key} ok=false`);
    assert(payload.migratedToStatic === true, `${key} migration flag`);
    assert(payload.architecture === 'build-time-static-index', `${key} architecture`);
    assert(payload.scannedCount === 0 && payload.matchedCount === 0 && payload.count === 0, `${key} scan counts`);
    assert(Array.isArray(payload.records) && payload.records.length === 0, `${key} records not empty`);
  }

  assert(results.customRelease.text.includes(`display: '${EXPECTED_RELEASE}'`), 'custom-domain release is not v3.9.72.1');
  assert(results.custom211App.text.includes('211-static-index.v3972_0.json'), 'custom-domain 211 app mismatch');

  return {
    release: EXPECTED_RELEASE,
    all211Records: all211.records.length,
    all211ScoreBands: all211.scoreBands.length,
    localStrengthRecords: local.records.length,
    compatibilityScannedCount: 0
  };
}

async function verifyStressCycle(cycle) {
  const token = `${cycle}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const urls = {
    runtime: `${PAGES_BASE}/api/ln-rank-runtime-health?postmerge=${token}`,
    health: `${PAGES_BASE}/api/major-bands-health?probe=1&postmerge=${token}`,
    score: `${PAGES_BASE}/api/major-bands?candidateScore=579&limit=16&postmerge=${token}`,
    school: `${PAGES_BASE}/api/major-bands?candidateScore=650&schoolKeyword=${encodeURIComponent('东北大学')}&limit=16&postmerge=${token}`
  };
  const entries = await Promise.all(Object.entries(urls).map(async ([key, url]) => [key, await request(url)]));
  const results = Object.fromEntries(entries);
  for (const result of Object.values(results)) {
    assertHttp200(result);
    const lower = result.text.toLowerCase();
    assert(!result.text.includes('1102') && !lower.includes('cloudflare error'), `${result.url} returned Cloudflare failure body`);
  }
  const runtime = parseJson(results.runtime);
  const health = parseJson(results.health);
  const score = parseJson(results.score);
  const school = parseJson(results.school);
  assert(runtime?.ok !== false, `runtime ok=false cycle ${cycle}`);
  assert(health?.ok !== false, `health ok=false cycle ${cycle}`);
  assert(score?.ok !== false, `score ok=false cycle ${cycle}`);
  assert(school?.ok !== false, `school ok=false cycle ${cycle}`);
  assert(recordCount(score) > 0, `score query empty cycle ${cycle}`);
  assert(recordCount(school) > 0, `school query empty cycle ${cycle}`);
  return { cycle, scoreRecords: recordCount(score), schoolRecords: recordCount(school) };
}

let deployment;
let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    deployment = await verifyDeployment(`acceptance-${attempt}-${Date.now()}`);
    console.log(JSON.stringify({ phase: 'deployment', attempt, ...deployment }, null, 2));
    break;
  } catch (error) {
    lastError = error;
    console.error(`deployment attempt ${attempt}/${ATTEMPTS}: ${error.message}`);
    if (attempt < ATTEMPTS) await sleep(WAIT_MS);
  }
}
if (!deployment) throw lastError || new Error('v3.9.72.1 deployment verification failed');

const stress = [];
for (let cycle = 1; cycle <= STRESS_CYCLES; cycle += 1) {
  const result = await verifyStressCycle(cycle);
  stress.push(result);
  console.log(JSON.stringify({ phase: 'stress', ...result }));
  if (cycle < STRESS_CYCLES) await sleep(1000);
}

console.log(JSON.stringify({
  ok: true,
  phase: 'complete',
  ...deployment,
  stressCycles: stress.length,
  minimumScoreRecords: Math.min(...stress.map(item => item.scoreRecords)),
  minimumSchoolRecords: Math.min(...stress.map(item => item.schoolRecords)),
  cloudflare1102Count: 0,
  http503Count: 0
}, null, 2));
