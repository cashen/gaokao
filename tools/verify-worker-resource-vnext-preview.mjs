import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';

const base = String(process.env.TARGET_BASE || process.argv[2] || '').replace(/\/$/, '');
const expectedSha = String(process.env.EXPECTED_SHA || '').trim();
const evidencePath = process.env.WORKER_VNEXT_PREVIEW_EVIDENCE || '/tmp/worker-resource-vnext-preview.json';
const timeoutMs = Math.max(5000, Number(process.env.REQUEST_TIMEOUT_MS || 30000));
const p95LimitMs = Math.max(1000, Number(process.env.P95_LIMIT_MS || 15000));
const hardLimitMs = Math.max(p95LimitMs, Number(process.env.HARD_LIMIT_MS || 30000));
const concurrencyLevels = [1, 5, 10, 25, 50];
const projectionVersion = 'ln-rank-school-runtime-projection-vnext-100-shard-v1';

assert.ok(/^https:\/\//.test(base), 'TARGET_BASE must be an https Preview URL');

const schools = Object.freeze([
  '东北大学',
  '东北大学秦皇岛分校',
  '沈阳工业大学',
  '沈阳农业大学',
  '沈阳航空航天大学',
  '辽宁科技大学'
]);

const majorBandPaths = Object.freeze([
  '/api/major-bands?candidateScore=579&rangePreset=standard&band=near&limit=20&offset=0',
  '/api/major-bands?candidateScore=508&rangePreset=standard&band=near&limit=20&offset=0',
  '/api/major-bands?candidateScore=680&rangePreset=wide&band=steady&limit=20&offset=0',
  '/api/major-bands?candidateScore=449&rangePreset=safe&band=near&limit=20&offset=0'
]);

function percentile(values, fraction) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)] || 0;
}

function latencySummary(values) {
  return {
    count: values.length,
    minMs: Number(Math.min(...values).toFixed(2)),
    p50Ms: Number(percentile(values, 0.5).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    maxMs: Number(Math.max(...values).toFixed(2))
  };
}

function detects1102(text, payload) {
  const lower = String(text || '').toLowerCase();
  return lower.includes('error code: 1102')
    || lower.includes('<title>error 1102')
    || lower.includes('worker exceeded resource limits')
    || Number(payload?.error_code) === 1102
    || payload?.error_name === 'worker_exceeded_resources';
}

async function getJson(pathname, label) {
  const separator = pathname.includes('?') ? '&' : '?';
  const url = `${base}${pathname}${separator}vnextStress=${encodeURIComponent(label)}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const started = performance.now();
  let response;
  let text = '';
  try {
    response = await fetch(url, {
      redirect: 'follow',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      signal: AbortSignal.timeout(timeoutMs)
    });
    text = await response.text();
  } catch (error) {
    return { label, url, status: 0, elapsedMs: performance.now() - started, error: String(error?.message || error), cloudflare1102: false, payload: null };
  }
  let payload = null;
  try { payload = JSON.parse(text); } catch {}
  return {
    label,
    url,
    status: response.status,
    elapsedMs: performance.now() - started,
    cloudflare1102: detects1102(text, payload),
    payload,
    bodyPrefix: payload ? '' : text.slice(0, 500)
  };
}

function validateBase(result) {
  assert.equal(result.status, 200, `${result.label}: HTTP ${result.status} ${result.error || result.payload?.message || result.bodyPrefix || ''}`);
  assert.equal(result.cloudflare1102, false, `${result.label}: Cloudflare 1102`);
  assert.ok(result.elapsedMs <= hardLimitMs, `${result.label}: latency ${result.elapsedMs.toFixed(1)}ms > ${hardLimitMs}ms`);
  assert.equal(result.payload?.ok, true, `${result.label}: ok=false ${result.payload?.message || ''}`);
}

function validateSchool(result) {
  validateBase(result);
  assert.equal(result.payload?.source?.mode, 'school-runtime-projection-vnext', `${result.label}: school owner mode`);
  assert.equal(result.payload?.source?.projectionVersion, projectionVersion, `${result.label}: school projection version`);
  assert.ok(Number(result.payload?.source?.shardCount) >= 1 && Number(result.payload?.source?.shardCount) <= 2, `${result.label}: shard count ${result.payload?.source?.shardCount}`);
  assert.equal(Number(result.payload?.source?.rawScanned), Number(result.payload?.source?.exactSchoolRecords), `${result.label}: raw scan must equal exact school records`);
  assert.equal(Number(result.payload?.meta?.schoolRecordTotal), Number(result.payload?.source?.exactSchoolRecords), `${result.label}: school truth count drift`);
  assert.ok(Number(result.payload?.source?.rawScanned) < 500, `${result.label}: exact school request unexpectedly scanned ${result.payload?.source?.rawScanned}`);
}

function validateMajorBands(result) {
  validateBase(result);
  const source = result.payload?.source || {};
  assert.equal(source.queryKernelVersion, 'major-bands-rank-query-kernel-v3990_3', `${result.label}: major-bands query kernel`);
  assert.equal(source.architecture, 'single-worker-rank-window-over-immutable-static-buckets', `${result.label}: major-bands architecture`);
  assert.equal(Number(source.totalRecords), 11628, `${result.label}: major-bands truth count`);
  assert.equal(source.publicHttpSelfFanout, false, `${result.label}: public HTTP self-fanout must remain disabled`);
  assert.equal(Number(source.bucketWorkerCount || 0), 0, `${result.label}: bucket sub-workers must remain disabled`);
  const chunksRead = Number(source.chunksRead || 0);
  const chunksTotal = Number(source.chunksTotal || 0);
  assert.ok(chunksRead > 0 && chunksTotal > 0 && chunksRead < chunksTotal, `${result.label}: bounded bucket selection ${chunksRead}/${chunksTotal}`);
  assert.ok(chunksRead < 30, `${result.label}: major-bands bucket fanout unexpectedly large: ${chunksRead}`);
}

function validateAiSchoolHistory(result) {
  validateBase(result);
  assert.equal(result.payload?.complete, true, `${result.label}: AI school history must be complete`);
  assert.equal(result.payload?.source?.sameTruthSet, true, `${result.label}: AI school history truth-set marker`);
  assert.equal(result.payload?.source?.mode, 'ai-school-history-preaggregated-school-shard', `${result.label}: AI school history source mode`);
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function healthGate() {
  let consecutive = 0;
  let last = null;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const health = await getJson('/api/ai/health', `health-${attempt}`);
    last = health;
    if (health.status === 200 && health.payload?.ok === true) {
      const commitSha = String(health.payload?.deployment?.commitSha || '').trim();
      if (!expectedSha || commitSha === expectedSha) {
        consecutive += 1;
        if (consecutive >= 3) {
          return { commitSha, branch: health.payload?.deployment?.branch || '', url: health.payload?.deployment?.url || '', stableChecks: consecutive, attempts: attempt };
        }
      } else {
        consecutive = 0;
      }
    } else {
      consecutive = 0;
    }
    if (attempt < 30) await delay(2000);
  }
  validateBase(last || { status: 0, label: 'health-stability', payload: null, cloudflare1102: false, elapsedMs: 0 });
  const commitSha = String(last?.payload?.deployment?.commitSha || '').trim();
  assert.equal(commitSha, expectedSha, `Preview SHA failed to stabilize: ${commitSha} != ${expectedSha}`);
  throw new Error(`Preview SHA ${expectedSha} did not remain stable for 3 consecutive health probes.`);
}

async function schoolWave(level) {
  const tasks = Array.from({ length: level }, (_, index) => {
    const school = schools[index % schools.length];
    const candidateScore = 560 + (index % 21);
    const params = new URLSearchParams({ school, schoolIntent: 'school', candidateScore: String(candidateScore), limit: '20', offset: '0' });
    return getJson(`/api/school-majors?${params}`, `school-${level}-${index}-${school}`);
  });
  const results = await Promise.all(tasks);
  results.forEach(validateSchool);
  const latency = latencySummary(results.map(item => item.elapsedMs));
  assert.ok(latency.p95Ms <= p95LimitMs, `school concurrency ${level}: p95 ${latency.p95Ms}ms > ${p95LimitMs}ms`);
  return { level, latency, requests: results.length, maxRawScanned: Math.max(...results.map(item => Number(item.payload?.source?.rawScanned || 0))), maxShardCount: Math.max(...results.map(item => Number(item.payload?.source?.shardCount || 0))) };
}

async function mixedWave() {
  const tasks = [];
  for (let index = 0; index < 20; index += 1) {
    const school = schools[index % schools.length];
    const params = new URLSearchParams({ school, schoolIntent: 'school', candidateScore: String(565 + (index % 17)), limit: '20', offset: '0' });
    tasks.push(getJson(`/api/school-majors?${params}`, `mixed-school-${index}`).then(result => ({ kind: 'school', result })));
  }
  for (let index = 0; index < 20; index += 1) {
    tasks.push(getJson(majorBandPaths[index % majorBandPaths.length], `mixed-major-bands-${index}`).then(result => ({ kind: 'major-bands', result })));
  }
  for (let index = 0; index < 10; index += 1) {
    const school = schools[(index + 2) % schools.length];
    const params = new URLSearchParams({ school, offset: '0', limit: '120', sort: 'score-desc' });
    tasks.push(getJson(`/api/ai/school-history?${params}`, `mixed-ai-school-history-${index}`).then(result => ({ kind: 'ai-school-history', result })));
  }
  const settled = await Promise.all(tasks);
  for (const item of settled) {
    if (item.kind === 'school') validateSchool(item.result);
    else if (item.kind === 'major-bands') validateMajorBands(item.result);
    else validateAiSchoolHistory(item.result);
  }
  const latency = latencySummary(settled.map(item => item.result.elapsedMs));
  assert.ok(latency.p95Ms <= p95LimitMs, `mixed workload p95 ${latency.p95Ms}ms > ${p95LimitMs}ms`);
  return {
    requests: settled.length,
    school: settled.filter(item => item.kind === 'school').length,
    majorBands: settled.filter(item => item.kind === 'major-bands').length,
    aiSchoolHistory: settled.filter(item => item.kind === 'ai-school-history').length,
    latency,
    cloudflare1102: settled.filter(item => item.result.cloudflare1102).length
  };
}

const evidence = { targetBase: base, expectedSha, startedAt: new Date().toISOString(), health: null, schoolWaves: [], mixed: null };
try {
  evidence.health = await healthGate();
  for (const level of concurrencyLevels) evidence.schoolWaves.push(await schoolWave(level));
  evidence.mixed = await mixedWave();
  evidence.ok = true;
  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  evidence.ok = false;
  evidence.error = String(error?.stack || error?.message || error);
  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  console.error(JSON.stringify(evidence, null, 2));
  throw error;
}
