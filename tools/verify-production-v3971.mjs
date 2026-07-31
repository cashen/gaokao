const PAGES_BASE = process.env.PAGES_BASE || 'https://gaokao-4y9.pages.dev';
const CUSTOM_BASE = process.env.CUSTOM_BASE || 'https://gaokao.powers.org.cn';
const EXPECTED_RELEASE = 'v3.9.71.2';
const EXPECTED_INDEX = 'local-strength-static-v3971_2';
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
  try { return JSON.parse(result.text); }
  catch (error) { throw new Error(`${result.url} JSON parse failed: ${error.message}; body=${result.text.slice(0, 500)}`); }
}

function recordCount(data) {
  return ['upper', 'near', 'steady'].reduce((sum, key) => sum + Number(data?.bands?.[key]?.records?.length || 0), 0);
}

async function verifyStaticRelease() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const token = `stable-${attempt}-${Date.now()}`;
    const [page, index] = await Promise.all([
      request(`${PAGES_BASE}/ln-rank/local-mainline.html?stress=${token}`, 'text/html'),
      request(`${PAGES_BASE}/ln-rank/data/local-strength/local-strength-index.v3971_2.json?stress=${token}`)
    ]);
    try {
      assert(page.status === 200, `page HTTP ${page.status}`);
      assert(index.status === 200, `index HTTP ${index.status}`);
      assert(page.text.includes(`data-release="${EXPECTED_RELEASE}"`), 'release mismatch');
      assert(!page.text.includes('/api/local-strength'), 'forbidden LocalStrength API reference');
      const data = parseJson(index);
      assert(data.version === EXPECTED_INDEX, `index version ${data.version}`);
      assert(data.meta?.matchedRecordCount === 243 && data.records?.length === 243, 'LocalStrength count mismatch');
      console.log(JSON.stringify({ phase: 'release', attempt, release: EXPECTED_RELEASE, localStrengthRecords: 243 }));
      return;
    } catch (error) {
      console.error(`release attempt ${attempt}/20: ${error.message}`);
      if (attempt < 20) await sleep(10000);
    }
  }
  throw new Error(`production did not stabilize on ${EXPECTED_RELEASE}`);
}

async function verifyCycle(cycle) {
  const token = `${cycle}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const urls = {
    runtime: `${PAGES_BASE}/api/ln-rank-runtime-health?stress=${token}`,
    health: `${PAGES_BASE}/api/major-bands-health?probe=1&stress=${token}`,
    score: `${PAGES_BASE}/api/major-bands?candidateScore=579&limit=16&stress=${token}`,
    school: `${PAGES_BASE}/api/major-bands?candidateScore=650&schoolKeyword=${encodeURIComponent('东北大学')}&limit=16&stress=${token}`
  };
  const entries = await Promise.all(Object.entries(urls).map(async ([key, url]) => [key, await request(url)]));
  const results = Object.fromEntries(entries);
  for (const result of Object.values(results)) {
    const lower = result.text.toLowerCase();
    assert(result.status === 200, `${result.url} HTTP ${result.status}; body=${result.text.slice(0, 500)}`);
    assert(!result.text.includes('1102') && !lower.includes('worker exceeded resource limits'), `${result.url} Cloudflare 1102`);
  }
  const runtime = parseJson(results.runtime);
  const health = parseJson(results.health);
  const score = parseJson(results.score);
  const school = parseJson(results.school);
  assert(runtime?.ok !== false && health?.ok !== false && score?.ok !== false && school?.ok !== false, `ok=false cycle ${cycle}`);
  assert(recordCount(score) > 0, `score query empty cycle ${cycle}`);
  assert(recordCount(school) > 0, `school query empty cycle ${cycle}`);
  return { cycle, scoreRecords: recordCount(score), schoolRecords: recordCount(school) };
}

await verifyStaticRelease();
const rows = [];
for (let cycle = 1; cycle <= STRESS_CYCLES; cycle += 1) {
  const row = await verifyCycle(cycle);
  rows.push(row);
  console.log(JSON.stringify({ phase: 'stress', ...row }));
  if (cycle < STRESS_CYCLES) await sleep(1000);
}

const custom = await request(`${CUSTOM_BASE}/api/major-bands?candidateScore=579&limit=16&stress=final-${Date.now()}`);
const customMode = custom.status === 200
  ? 'json-200'
  : String(custom.headers['cf-mitigated'] || '').toLowerCase() === 'challenge'
    ? 'managed-challenge'
    : `http-${custom.status}`;
assert(customMode !== `http-${custom.status}`, `custom domain HTTP ${custom.status}`);

console.log(JSON.stringify({
  ok: true,
  release: EXPECTED_RELEASE,
  stressCycles: rows.length,
  minimumScoreRecords: Math.min(...rows.map(row => row.scoreRecords)),
  minimumSchoolRecords: Math.min(...rows.map(row => row.schoolRecords)),
  cloudflare1102Count: 0,
  http503Count: 0,
  customDomain: customMode
}, null, 2));
