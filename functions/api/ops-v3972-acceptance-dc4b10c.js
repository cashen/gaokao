const PAGES_BASE = 'https://gaokao-4y9.pages.dev';
const CUSTOM_BASE = 'https://gaokao.powers.org.cn';
const ACCESS_KEY = 'v3972-dc4b10c-40cycle-20260801';
const EXPECTED_RELEASE = 'v3.9.72.2';
const EXPECTED_LOCAL_PAGE_RELEASE = 'v3.9.71.2';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(url, accept = 'application/json') {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      accept,
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    }
  });
  const text = await response.text();
  return {
    url,
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    text
  };
}

function assertNoResourceError(result) {
  const lower = result.text.toLowerCase();
  assert(result.status !== 503, `${result.url} returned HTTP 503`);
  assert(!result.text.includes('1102'), `${result.url} returned Error 1102`);
  assert(!lower.includes('worker exceeded resource limits'), `${result.url} exceeded Worker resource limits`);
}

function assert200(result) {
  assertNoResourceError(result);
  assert(result.status === 200, `${result.url} returned HTTP ${result.status}; body=${result.text.slice(0, 300)}`);
  assert(!result.contentType.toLowerCase().includes('text/html'), `${result.url} returned HTML instead of API data`);
}

function parseJson(result) {
  try {
    return JSON.parse(result.text);
  } catch (error) {
    throw new Error(`${result.url} JSON parse failed: ${error.message}; body=${result.text.slice(0, 300)}`);
  }
}

function recordCount(data) {
  return ['upper', 'near', 'steady'].reduce(
    (sum, key) => sum + Number(data?.bands?.[key]?.records?.length || 0),
    0
  );
}

function assertBoundedHealth(health) {
  assert(health?.ok !== false, 'health ok=false');
  assert(health?.resourcePolicy?.fullDatasetProbeDisabled === true, 'full dataset probe not disabled');
  assert(health?.resourcePolicy?.largeChunkModuleCacheDisabled === true, 'large chunk module cache not disabled');
  assert(health?.resourcePolicy?.maximumProbeChunks === 1, `maximumProbeChunks=${health?.resourcePolicy?.maximumProbeChunks}`);
  assert(health?.probe?.mode === 'bounded-manifest-plus-one-chunk', `probe mode=${health?.probe?.mode}`);
  assert(health?.probe?.fullDatasetScan === false, 'fullDatasetScan is not false');
  assert(Number(health?.probe?.chunksRead || 0) <= 1, `chunksRead=${health?.probe?.chunksRead}`);
  assert(Number(health?.probe?.rawScanned || 0) <= 2000, `rawScanned=${health?.probe?.rawScanned}`);
  assert(health?.probe?.resourceBudget?.maxChunksRead === 1, `maxChunksRead=${health?.probe?.resourceBudget?.maxChunksRead}`);
  assert(health?.probe?.resourceBudget?.parsedChunkCache === false, 'parsedChunkCache is enabled');
}

async function verifyStaticContracts(token) {
  const urls = {
    pagesRelease: `${PAGES_BASE}/shared/resources/release/current-release.js?ops-static=${token}`,
    customRelease: `${CUSTOM_BASE}/shared/resources/release/current-release.js?ops-static=${token}`,
    localPage: `${PAGES_BASE}/ln-rank/local-mainline.html?ops-static=${token}`,
    localIndex: `${PAGES_BASE}/ln-rank/data/local-strength/local-strength-index.v3971_2.json?ops-static=${token}`,
    all211Page: `${PAGES_BASE}/ln-rank/211-mainline.html?ops-static=${token}`,
    all211Index: `${PAGES_BASE}/ln-rank/data/211-static/211-static-index.v3972_0.json?ops-static=${token}`,
    compat211: `${PAGES_BASE}/api/academic-background?scope=211&mode=score&score=579&ops-static=${token}`,
    legacy211: `${PAGES_BASE}/api/211-mainline?score=579&ops-static=${token}`,
    forbiddenLocalApi: `${PAGES_BASE}/api/local-strength?ops-static=${token}`
  };
  const entries = await Promise.all(Object.entries(urls).map(async ([key, url]) => [key, await request(url, '*/*')]));
  const results = Object.fromEntries(entries);

  for (const [key, result] of Object.entries(results)) {
    if (key !== 'forbiddenLocalApi') {
      assertNoResourceError(result);
      assert(result.status === 200, `${key} returned HTTP ${result.status}`);
    }
  }
  assertNoResourceError(results.forbiddenLocalApi);
  assert(results.forbiddenLocalApi.status === 404, `/api/local-strength returned HTTP ${results.forbiddenLocalApi.status}`);

  assert(results.pagesRelease.text.includes(`display: '${EXPECTED_RELEASE}'`), 'Pages release mismatch');
  assert(results.customRelease.text.includes(`display: '${EXPECTED_RELEASE}'`), 'custom-domain release mismatch');
  assert(results.pagesRelease.text.includes("all211Architecture: 'build-time-static-index'"), '211 architecture mismatch');
  assert(results.pagesRelease.text.includes("localStrengthDataVersion: 'local-strength-static-v3971_2'"), 'LocalStrength owner mismatch');

  assert(results.localPage.text.includes(`data-release="${EXPECTED_LOCAL_PAGE_RELEASE}"`), 'LocalStrength page generation mismatch');
  assert(!results.localPage.text.includes('/api/local-strength'), 'LocalStrength page references forbidden API');
  const localIndex = parseJson(results.localIndex);
  assert(localIndex.version === 'local-strength-static-v3971_2', `LocalStrength version=${localIndex.version}`);
  assert(localIndex.meta?.completeEvaluation === true, 'LocalStrength incomplete');
  assert(localIndex.meta?.matchedRecordCount === 243 && localIndex.records?.length === 243, `LocalStrength count=${localIndex.meta?.matchedRecordCount}/${localIndex.records?.length}`);
  assert(localIndex.meta?.evaluatedRecordCount === localIndex.meta?.localAdmissionRecordCount, 'LocalStrength evaluation mismatch');
  assert(Number(localIndex.meta?.duplicatePublicRecordCount) === 0, 'LocalStrength duplicates');
  assert(Number(localIndex.meta?.unresolvedLocalRecordCount) === 0, 'LocalStrength unresolved records');

  assert(results.all211Page.text.includes(`data-release="${EXPECTED_RELEASE}"`), '211 page release mismatch');
  assert(results.all211Page.text.includes('all211-static-app.v3972_0.js'), '211 static runtime missing');
  assert(!results.all211Page.text.includes('/api/academic-background'), '211 page references runtime background API');
  const all211 = parseJson(results.all211Index);
  assert(all211.version === 'all-211-static-v3972_0', `211 version=${all211.version}`);
  assert(all211.meta?.completeEvaluation === true, '211 evaluation incomplete');
  assert(all211.records?.length === 2494, `211 records=${all211.records?.length}`);
  assert(all211.scoreBands?.length === 8, `211 score bands=${all211.scoreBands?.length}`);

  for (const key of ['compat211', 'legacy211']) {
    const payload = parseJson(results[key]);
    assert(payload?.ok === true, `${key} ok=false`);
    assert(payload?.migratedToStatic === true, `${key} migration flag missing`);
    assert(payload?.architecture === 'build-time-static-index', `${key} architecture mismatch`);
    assert(Number(payload?.scannedCount) === 0, `${key} scannedCount=${payload?.scannedCount}`);
    assert(Number(payload?.matchedCount) === 0, `${key} matchedCount=${payload?.matchedCount}`);
    assert(Number(payload?.count) === 0, `${key} count=${payload?.count}`);
    assert(Array.isArray(payload?.records) && payload.records.length === 0, `${key} returned records`);
  }

  return {
    release: EXPECTED_RELEASE,
    localStrengthPageRelease: EXPECTED_LOCAL_PAGE_RELEASE,
    localStrengthRecords: localIndex.records.length,
    all211Records: all211.records.length,
    all211Bands: all211.scoreBands.length,
    localStrengthApiStatus: results.forbiddenLocalApi.status
  };
}

async function verifyCycle(cycle, batchToken) {
  const token = `${batchToken}-${cycle}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const urls = {
    runtime: `${PAGES_BASE}/api/ln-rank-runtime-health?ops-stress=${token}`,
    health: `${PAGES_BASE}/api/major-bands-health?probe=1&ops-stress=${token}`,
    score: `${PAGES_BASE}/api/major-bands?candidateScore=579&limit=16&ops-stress=${token}`,
    school: `${PAGES_BASE}/api/major-bands?candidateScore=650&schoolKeyword=${encodeURIComponent('东北大学')}&limit=16&ops-stress=${token}`
  };
  const entries = await Promise.all(Object.entries(urls).map(async ([key, url]) => [key, await request(url)]));
  const results = Object.fromEntries(entries);
  for (const result of Object.values(results)) assert200(result);

  const runtime = parseJson(results.runtime);
  const health = parseJson(results.health);
  const score = parseJson(results.score);
  const school = parseJson(results.school);
  assert(runtime?.ok !== false, `runtime ok=false cycle ${cycle}`);
  assertBoundedHealth(health);
  assert(score?.ok !== false, `579 query ok=false cycle ${cycle}`);
  assert(school?.ok !== false, `school query ok=false cycle ${cycle}`);
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

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.get('key') !== ACCESS_KEY) {
    return Response.json({ ok: false, error: 'not found' }, { status: 404 });
  }

  const start = Number(requestUrl.searchParams.get('start') || 1);
  const count = Number(requestUrl.searchParams.get('count') || 10);
  if (!Number.isInteger(start) || !Number.isInteger(count) || start < 1 || count < 1 || count > 10 || start + count - 1 > 40) {
    return Response.json({ ok: false, error: 'invalid batch range' }, { status: 400 });
  }

  const batchToken = `dc4b10c-${start}-${count}-${Date.now()}`;
  try {
    const staticContracts = start === 1 ? await verifyStaticContracts(batchToken) : null;
    const cycles = [];
    for (let cycle = start; cycle < start + count; cycle += 1) {
      cycles.push(await verifyCycle(cycle, batchToken));
    }
    return Response.json({
      ok: true,
      executor: 'temporary-cloudflare-preview-acceptance-runner',
      targetPrHead: 'dc4b10c5cff6f9c5847c688dabb7e72be6718a01',
      batchStart: start,
      batchCount: count,
      staticContracts,
      stressCycles: cycles.length,
      maximumChunksRead: Math.max(...cycles.map(item => item.chunksRead)),
      maximumRawScanned: Math.max(...cycles.map(item => item.rawScanned)),
      minimumScoreRecords: Math.min(...cycles.map(item => item.scoreRecords)),
      minimumSchoolRecords: Math.min(...cycles.map(item => item.schoolRecords)),
      cloudflare1102Count: 0,
      http503Count: 0,
      cycles
    }, {
      headers: {
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow'
      }
    });
  } catch (error) {
    return Response.json({
      ok: false,
      executor: 'temporary-cloudflare-preview-acceptance-runner',
      targetPrHead: 'dc4b10c5cff6f9c5847c688dabb7e72be6718a01',
      batchStart: start,
      batchCount: count,
      error: error?.stack || error?.message || String(error)
    }, {
      status: 500,
      headers: {
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow'
      }
    });
  }
}
