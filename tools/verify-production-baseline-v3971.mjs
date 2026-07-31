const PAGES_BASE = process.env.PAGES_BASE || 'https://gaokao-4y9.pages.dev';
const CUSTOM_BASE = process.env.CUSTOM_BASE || 'https://gaokao.powers.org.cn';
const EXPECTED_RELEASE = process.env.EXPECTED_RELEASE || 'v3.9.71.2';
const WAIT_MS = Number(process.env.PRODUCTION_VERIFY_WAIT_MS || 10000);
const ATTEMPTS = Number(process.env.PRODUCTION_VERIFY_ATTEMPTS || 15);
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

function parseJson(result) {
  try {
    return JSON.parse(result.text);
  } catch (error) {
    throw new Error(`${result.url} JSON parse failed: ${error.message}; body=${result.text.slice(0, 500)}`);
  }
}

function recordCount(data) {
  return ['upper', 'near', 'steady'].reduce((sum, key) => sum + Number(data?.bands?.[key]?.records?.length || 0), 0);
}

async function verifyOnce(token) {
  const urls = {
    runtime: `${PAGES_BASE}/api/ln-rank-runtime-health?release-check=${token}`,
    health: `${PAGES_BASE}/api/major-bands-health?probe=1&release-check=${token}`,
    score: `${PAGES_BASE}/api/major-bands?candidateScore=579&limit=16&release-check=${token}`,
    school: `${PAGES_BASE}/api/major-bands?candidateScore=650&schoolKeyword=${encodeURIComponent('东北大学')}&limit=16&release-check=${token}`,
    page: `${PAGES_BASE}/ln-rank/local-mainline.html?release-check=${token}`,
    index: `${PAGES_BASE}/ln-rank/data/local-strength/local-strength-index.v3971_2.json?release-check=${token}`,
    custom: `${CUSTOM_BASE}/api/major-bands?candidateScore=579&limit=16&release-check=${token}`
  };
  const [runtimeResult, healthResult, scoreResult, schoolResult, pageResult, indexResult, customResult] = await Promise.all([
    request(urls.runtime), request(urls.health), request(urls.score), request(urls.school),
    request(urls.page, 'text/html'), request(urls.index), request(urls.custom)
  ]);
  for (const result of [runtimeResult, healthResult, scoreResult, schoolResult, pageResult, indexResult]) {
    if (result.status !== 200) throw new Error(`${result.url} returned HTTP ${result.status}; body=${result.text.slice(0, 500)}`);
  }
  const runtime = parseJson(runtimeResult);
  const health = parseJson(healthResult);
  const score = parseJson(scoreResult);
  const school = parseJson(schoolResult);
  const index = parseJson(indexResult);
  if (runtime?.ok === false || health?.ok === false || score?.ok === false || school?.ok === false) throw new Error('production API returned ok=false');
  if (recordCount(score) < 1 || recordCount(school) < 1) throw new Error('production query returned no records');
  if (!pageResult.text.includes(`data-release="${EXPECTED_RELEASE}"`)) throw new Error(`production release is not ${EXPECTED_RELEASE}`);
  if (pageResult.text.includes('/api/local-strength')) throw new Error('forbidden LocalStrength API reference');
  if (index.version !== 'local-strength-static-v3971_2' || !index.meta?.completeEvaluation) throw new Error('LocalStrength index invalid');
  if (index.meta.evaluatedRecordCount !== index.meta.localAdmissionRecordCount) throw new Error('LocalStrength coverage mismatch');
  if (index.meta.duplicatePublicRecordCount !== 0 || index.meta.unresolvedLocalRecordCount !== 0) throw new Error('LocalStrength integrity mismatch');
  if (!Array.isArray(index.records) || index.records.length !== index.meta.matchedRecordCount) throw new Error('LocalStrength count mismatch');
  let customDomain = '';
  if (customResult.status === 200) {
    const custom = parseJson(customResult);
    if (custom?.ok === false || recordCount(custom) < 1) throw new Error('custom domain query invalid');
    customDomain = 'json-200';
  } else if (String(customResult.headers['cf-mitigated'] || '').toLowerCase() === 'challenge') {
    customDomain = 'managed-challenge';
  } else {
    throw new Error(`custom domain HTTP ${customResult.status}`);
  }
  return {
    release: EXPECTED_RELEASE,
    scoreRecords: recordCount(score),
    schoolRecords: recordCount(school),
    matchedRecords: index.meta.matchedRecordCount,
    customDomain
  };
}

let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    const result = await verifyOnce(`baseline-${attempt}-${Date.now()}`);
    console.log(JSON.stringify({ attempt, ...result }, null, 2));
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`attempt ${attempt}/${ATTEMPTS}: ${error.message}`);
    if (attempt < ATTEMPTS) await sleep(WAIT_MS);
  }
}
throw lastError || new Error('baseline production verification failed');
