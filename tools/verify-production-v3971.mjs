const PAGES_BASE = process.env.PAGES_BASE || 'https://gaokao-4y9.pages.dev';
const CUSTOM_BASE = process.env.CUSTOM_BASE || 'https://gaokao.powers.org.cn';
const EXPECTED_RELEASE = 'v3.9.71.2';
const EXPECTED_INDEX = 'local-strength-static-v3971_2';
const WAIT_MS = Number(process.env.PRODUCTION_VERIFY_WAIT_MS || 10000);
const ATTEMPTS = Number(process.env.PRODUCTION_VERIFY_ATTEMPTS || 30);

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
    const text = await response.text();
    return {
      url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      text
    };
  } finally {
    clearTimeout(timer);
  }
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

async function verifyOnce(token) {
  const urls = {
    runtime: `${PAGES_BASE}/api/ln-rank-runtime-health?release-check=${token}`,
    health: `${PAGES_BASE}/api/major-bands-health?probe=1&release-check=${token}`,
    score: `${PAGES_BASE}/api/major-bands?candidateScore=579&limit=16&release-check=${token}`,
    school: `${PAGES_BASE}/api/major-bands?candidateScore=650&schoolKeyword=${encodeURIComponent('东北大学')}&limit=16&release-check=${token}`,
    localPage: `${PAGES_BASE}/ln-rank/local-mainline.html?release-check=${token}`,
    localIndex: `${PAGES_BASE}/ln-rank/data/local-strength/local-strength-index.v3971_2.json?release-check=${token}`,
    customScore: `${CUSTOM_BASE}/api/major-bands?candidateScore=579&limit=16&release-check=${token}`
  };

  const [runtimeResult, healthResult, scoreResult, schoolResult, pageResult, indexResult, customResult] = await Promise.all([
    request(urls.runtime),
    request(urls.health),
    request(urls.score),
    request(urls.school),
    request(urls.localPage, 'text/html'),
    request(urls.localIndex),
    request(urls.customScore)
  ]);

  for (const result of [runtimeResult, healthResult, scoreResult, schoolResult, pageResult, indexResult]) {
    if (result.status !== 200) throw new Error(`${result.url} returned HTTP ${result.status}; body=${result.text.slice(0, 500)}`);
  }

  const runtime = parseJson(runtimeResult);
  const health = parseJson(healthResult);
  const score = parseJson(scoreResult);
  const school = parseJson(schoolResult);
  const index = parseJson(indexResult);

  for (const [name, data] of Object.entries({ runtime, health, score, school })) {
    if (data?.ok === false) throw new Error(`${name} returned ok=false: ${JSON.stringify(data).slice(0, 1000)}`);
  }
  if (recordCount(score) < 1) throw new Error('579 score query returned no records');
  if (recordCount(school) < 1) throw new Error('650 东北大学 query returned no records');

  if (!pageResult.text.includes(`data-release="${EXPECTED_RELEASE}"`)) throw new Error('LocalStrength production page release mismatch');
  if (!pageResult.text.includes('local-strength-app.v3971_2.js?v=3971_2')) throw new Error('LocalStrength production runtime mismatch');
  if (pageResult.text.includes('/api/local-strength')) throw new Error('LocalStrength production page references forbidden full-scan API');

  if (index.version !== EXPECTED_INDEX) throw new Error(`LocalStrength index version mismatch: ${index.version}`);
  if (!index.meta?.completeEvaluation) throw new Error('LocalStrength production index coverage incomplete');
  if (index.meta.localAdmissionSchoolCount !== 62) throw new Error(`LocalStrength school count mismatch: ${index.meta.localAdmissionSchoolCount}`);
  if (index.meta.evaluatedRecordCount !== 1992) throw new Error(`LocalStrength evaluated count mismatch: ${index.meta.evaluatedRecordCount}`);
  if (index.meta.matchedRecordCount !== 243) throw new Error(`LocalStrength matched count mismatch: ${index.meta.matchedRecordCount}`);

  let customDomain;
  if (customResult.status === 200) {
    const custom = parseJson(customResult);
    if (custom?.ok === false || recordCount(custom) < 1) throw new Error(`custom domain score query invalid: ${customResult.text.slice(0, 1000)}`);
    customDomain = 'json-200';
  } else if (String(customResult.headers['cf-mitigated'] || '').toLowerCase() === 'challenge') {
    customDomain = 'managed-challenge';
  } else {
    throw new Error(`custom domain returned HTTP ${customResult.status}; headers=${JSON.stringify(customResult.headers)}; body=${customResult.text.slice(0, 500)}`);
  }

  return {
    release: EXPECTED_RELEASE,
    pagesRuntime: runtimeResult.status,
    pagesHealth: healthResult.status,
    scoreRecords: recordCount(score),
    schoolRecords: recordCount(school),
    localStrength: {
      index: index.version,
      schools: index.meta.localAdmissionSchoolCount,
      evaluated: index.meta.evaluatedRecordCount,
      matched: index.meta.matchedRecordCount
    },
    customDomain
  };
}

let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  const token = `${process.env.GITHUB_SHA || 'manual'}-${attempt}-${Date.now()}`;
  try {
    const result = await verifyOnce(token);
    console.log(JSON.stringify({ attempt, ...result }, null, 2));
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`attempt ${attempt}/${ATTEMPTS}: ${error.message}`);
    if (attempt < ATTEMPTS) await sleep(WAIT_MS);
  }
}
throw lastError || new Error('production verification failed');
