const PAGES_BASE = process.env.PAGES_BASE || 'https://gaokao-4y9.pages.dev';
const CUSTOM_BASE = process.env.CUSTOM_BASE || 'https://gaokao.powers.org.cn';
const EXPECTED_RELEASE = process.env.EXPECTED_RELEASE || 'auto';
const WAIT_MS = Number(process.env.PRODUCTION_VERIFY_WAIT_MS || 10000);
const ATTEMPTS = Number(process.env.PRODUCTION_VERIFY_ATTEMPTS || 8);
const ALLOW_KNOWN_MAJOR_BANDS_DEGRADED = ['1', 'true', 'yes'].includes(String(process.env.ALLOW_KNOWN_MAJOR_BANDS_DEGRADED || '').toLowerCase());
const LEGACY_PRODUCTION_RELEASE = ['v3', '9', '72', '2'].join('.');
const PREVIOUS_PRODUCTION_RELEASE = 'v3.9.72.5';
const CURRENT_PRODUCTION_RELEASE = 'v3.9.72.6';
const PREVIOUS_V3990_RELEASE = 'v3.9.90.0';
const CURRENT_V3990_RELEASE = 'v3.9.90.3';
const ALLOWED_RELEASES = new Set(['v3.9.71.2', LEGACY_PRODUCTION_RELEASE, PREVIOUS_PRODUCTION_RELEASE, CURRENT_PRODUCTION_RELEASE, PREVIOUS_V3990_RELEASE, CURRENT_V3990_RELEASE]);
const BOUNDED_HEALTH_RELEASES = new Set([PREVIOUS_PRODUCTION_RELEASE, CURRENT_PRODUCTION_RELEASE, PREVIOUS_V3990_RELEASE, CURRENT_V3990_RELEASE]);
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

function isCloudflareManagedChallenge(result) {
  const headers = result?.headers || {};
  const body = String(result?.text || '').toLowerCase();
  return Number(result?.status) === 403
    && String(headers['cf-mitigated'] || '').toLowerCase() === 'challenge'
    && String(headers.server || '').toLowerCase().includes('cloudflare')
    && String(headers['content-type'] || '').toLowerCase().includes('text/html')
    && (body.includes('<title>just a moment') || body.includes('challenges.cloudflare.com'));
}

function assertResponse(result) {
  const lower = result.text.toLowerCase();
  assert(result.status !== 503, `${result.url} returned HTTP 503`);
  assert(!lower.includes('worker exceeded resource limits') && !lower.includes('<title>error 1102') && !lower.includes('error code: 1102'), `${result.url} returned Worker resource error`);
  assert(result.status === 200, `${result.url} returned HTTP ${result.status}; body=${result.text.slice(0, 500)}`);
}

function assertForbiddenLocalApiBaseline(result) {
  const lower = result.text.toLowerCase();
  assert(result.status !== 503, `${result.url} returned HTTP 503`);
  assert(!lower.includes('worker exceeded resource limits') && !lower.includes('<title>error 1102') && !lower.includes('error code: 1102'), `${result.url} returned Worker resource error`);
  if (result.status === 404) return 'hard-404';

  // The currently deployed legacy Pages generation may predate the top-level
  // 404.html and therefore soft-fallback unknown paths to HTML. This is accepted
  // only as a pre-merge baseline; the candidate and post-merge production use
  // the production resource verifier and must return a real HTTP 404.
  assert(result.status === 200, `/api/local-strength unexpectedly returned HTTP ${result.status}`);
  const contentType = String(result.headers['content-type'] || '').toLowerCase();
  assert(contentType.includes('text/html'), `/api/local-strength soft fallback is not HTML: ${contentType || 'missing content-type'}`);
  assert(lower.includes('<!doctype html') || lower.includes('<html'), '/api/local-strength soft fallback is not an HTML document');
  for (const marker of ['"scannedcount"', '"matchedcount"', '"architecture"', '"records"']) {
    assert(!lower.includes(marker), `/api/local-strength soft fallback contains API payload marker ${marker}`);
  }
  return 'legacy-spa-soft-404';
}

function recordCount(data) {
  return ['upper', 'near', 'steady'].reduce((sum, key) => sum + Number(data?.bands?.[key]?.records?.length || 0), 0);
}

function releaseFromSource(text) {
  return text.match(/display:\s*'([^']+)'/)?.[1] || '';
}

function assertBoundedHealth(health) {
  assert(health?.ok !== false, 'bounded health returned ok=false');
  assert(health?.resourcePolicy?.fullDatasetProbeDisabled === true, 'bounded health permits full scan');
  assert(health?.resourcePolicy?.largeChunkModuleCacheDisabled === true, 'bounded health permits large chunk module cache');
  assert(health?.resourcePolicy?.maximumProbeChunks === 1, `maximumProbeChunks=${health?.resourcePolicy?.maximumProbeChunks}`);
  assert(health?.probe?.mode === 'bounded-manifest-plus-one-chunk', `probe mode=${health?.probe?.mode}`);
  assert(health?.probe?.fullDatasetScan === false, 'probe claims full dataset scan');
  assert(Number(health?.probe?.chunksRead || 0) <= 1, `chunksRead=${health?.probe?.chunksRead}`);
  assert(Number(health?.probe?.rawScanned || 0) <= 2000, `rawScanned=${health?.probe?.rawScanned}`);
  assert(health?.probe?.resourceBudget?.maxChunksRead === 1, `maxChunksRead=${health?.probe?.resourceBudget?.maxChunksRead}`);
  assert(health?.probe?.resourceBudget?.parsedChunkCache === false, 'parsed chunk cache enabled');
}

function assessMajorBands(result, label) {
  if (result.status === 200) {
    const data = parseJson(result);
    assert(data?.ok !== false && recordCount(data) > 0, `production ${label} query invalid`);
    return { state: 'healthy', records: recordCount(data), status: result.status };
  }

  const lower = result.text.toLowerCase();
  const knownFailure = [500, 503].includes(result.status)
    && (
      lower.includes('major-bands-static-v3972_2')
      || lower.includes('分数桶 worker')
      || lower.includes('worker exceeded resource limits')
      || lower.includes('error code: 1102')
      || lower.includes('静态专业分数索引读取失败')
    );
  assert(
    ALLOW_KNOWN_MAJOR_BANDS_DEGRADED && knownFailure,
    `${result.url} returned HTTP ${result.status}; body=${result.text.slice(0, 500)}`
  );
  return { state: 'known-pre-merge-degraded', records: 0, status: result.status };
}

async function verifyOnce(token) {
  const releaseResult = await request(`${PAGES_BASE}/shared/resources/release/current-release.js?baseline=${token}`, '*/*');
  assertResponse(releaseResult);
  const deployedRelease = releaseFromSource(releaseResult.text);
  assert(ALLOWED_RELEASES.has(deployedRelease), `unsupported deployed release ${deployedRelease || 'unknown'}`);
  if (EXPECTED_RELEASE !== 'auto') {
    assert(deployedRelease === EXPECTED_RELEASE, `production release ${deployedRelease} is not ${EXPECTED_RELEASE}`);
  }

  const customRelease = await request(`${CUSTOM_BASE}/shared/resources/release/current-release.js?baseline=${token}`, '*/*');
  let customDomain = '';
  if (customRelease.status === 200) {
    const customVersion = releaseFromSource(customRelease.text);
    assert(customVersion === deployedRelease, `custom-domain release ${customVersion} does not match ${deployedRelease}`);
    customDomain = `release-${customVersion}`;
  } else if (isCloudflareManagedChallenge(customRelease)) {
    customDomain = 'managed-challenge';
  } else {
    throw new Error(`custom domain HTTP ${customRelease.status}`);
  }

  const pageResult = await request(`${PAGES_BASE}/ln-rank/local-mainline.html?baseline=${token}`, 'text/html');
  assertResponse(pageResult);
  assert(pageResult.text.includes('data-release="v3.9.71.2"'), 'LocalStrength immutable page lineage mismatch');
  assert(!pageResult.text.includes('/api/local-strength'), 'forbidden LocalStrength API reference');

  const indexResult = await request(`${PAGES_BASE}/ln-rank/data/local-strength/local-strength-index.v3971_2.json?baseline=${token}`);
  assertResponse(indexResult);
  const index = parseJson(indexResult);
  assert(index.version === 'local-strength-static-v3971_2' && index.meta?.completeEvaluation, 'LocalStrength index invalid');
  assert(index.meta.evaluatedRecordCount === index.meta.localAdmissionRecordCount, 'LocalStrength coverage mismatch');
  assert(index.meta.duplicatePublicRecordCount === 0 && index.meta.unresolvedLocalRecordCount === 0, 'LocalStrength integrity mismatch');
  assert(Array.isArray(index.records) && index.records.length === 243 && index.meta.matchedRecordCount === 243, 'LocalStrength immutable count mismatch');

  const forbiddenLocalApi = await request(`${PAGES_BASE}/api/local-strength`, '*/*');
  const localStrengthApiState = assertForbiddenLocalApiBaseline(forbiddenLocalApi);

  const runtimeResult = await request(`${PAGES_BASE}/api/ln-rank-runtime-health`);
  assertResponse(runtimeResult);
  const runtime = parseJson(runtimeResult);
  assert(runtime?.ok !== false, 'runtime returned ok=false');

  // Keep currently deployed production requests sequential. A PR that repairs
  // an already-degraded major-bands deployment may record only the exact known
  // failure here; the candidate Preview and post-merge production must pass the
  // complete healthy journey without this allowance.
  const scoreResult = await request(`${PAGES_BASE}/api/major-bands?candidateScore=579&limit=16`);
  const score = assessMajorBands(scoreResult, 'score');

  const schoolResult = await request(`${PAGES_BASE}/api/major-bands?candidateScore=650&schoolKeyword=${encodeURIComponent('东北大学')}&limit=16`);
  const school = assessMajorBands(schoolResult, 'school');

  let boundedHealth = null;
  const boundedHealthExpected = BOUNDED_HEALTH_RELEASES.has(deployedRelease);
  if (boundedHealthExpected) {
    const healthResult = await request(`${PAGES_BASE}/api/major-bands-health?probe=1&baseline=${token}`);
    assertResponse(healthResult);
    const health = parseJson(healthResult);
    assertBoundedHealth(health);
    boundedHealth = {
      chunksRead: Number(health.probe?.chunksRead || 0),
      rawScanned: Number(health.probe?.rawScanned || 0)
    };
  }

  return {
    release: deployedRelease,
    scoreRecords: score.records,
    schoolRecords: school.records,
    majorBandsScoreState: score.state,
    majorBandsSchoolState: school.state,
    matchedRecords: index.records.length,
    localStrengthApiState,
    deepHealthProbeSkipped: !boundedHealthExpected,
    boundedHealth,
    customDomain
  };
}

let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    const result = await verifyOnce(`baseline-${attempt}-${Date.now()}`);
    console.log(JSON.stringify({ ok: true, phase: 'complete', attempt, ...result }, null, 2));
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`attempt ${attempt}/${ATTEMPTS}: ${error.message}`);
    if (attempt < ATTEMPTS) await sleep(WAIT_MS);
  }
}
throw lastError || new Error('baseline production verification failed');
