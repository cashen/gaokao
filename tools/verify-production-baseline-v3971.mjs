const PAGES_BASE = process.env.PAGES_BASE || 'https://gaokao-4y9.pages.dev';
const EXPECTED_RELEASE = 'v3.9.71.2';
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
    return { url, status: response.status, text: await response.text() };
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

async function verifyRelease() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const token = `stable-release-${attempt}-${Date.now()}`;
    const page = await request(`${PAGES_BASE}/ln-rank/local-mainline.html?stress=${token}`, 'text/html');
    if (page.status === 200 && page.text.includes(`data-release="${EXPECTED_RELEASE}"`)) {
      console.log(JSON.stringify({ phase: 'release', attempt, release: EXPECTED_RELEASE }));
      return;
    }
    console.error(`release attempt ${attempt}/20: HTTP ${page.status}`);
    if (attempt < 20) await sleep(10000);
  }
  throw new Error(`production did not return ${EXPECTED_RELEASE}`);
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

await verifyRelease();
const rows = [];
for (let cycle = 1; cycle <= STRESS_CYCLES; cycle += 1) {
  const row = await verifyCycle(cycle);
  rows.push(row);
  console.log(JSON.stringify({ phase: 'stress', ...row }));
  if (cycle < STRESS_CYCLES) await sleep(1000);
}
console.log(JSON.stringify({
  ok: true,
  release: EXPECTED_RELEASE,
  stressCycles: rows.length,
  minimumScoreRecords: Math.min(...rows.map(row => row.scoreRecords)),
  minimumSchoolRecords: Math.min(...rows.map(row => row.schoolRecords)),
  cloudflare1102Count: 0,
  http503Count: 0
}, null, 2));
