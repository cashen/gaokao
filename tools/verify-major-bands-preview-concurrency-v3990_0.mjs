import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';

const base = String(process.env.TARGET_BASE || process.argv[2] || 'http://127.0.0.1:8793').replace(/\/$/, '');
const levels = String(process.env.CONCURRENCY_LEVELS || '1,5,10,25,50')
  .split(',')
  .map(value => Number(value.trim()))
  .filter(value => Number.isInteger(value) && value > 0);
const waves = Math.max(2, Number(process.env.CONCURRENCY_WAVES || 2));
const timeoutMs = Math.max(5000, Number(process.env.REQUEST_TIMEOUT_MS || 25000));
const coldHardMs = Math.max(1000, Number(process.env.COLD_HARD_LIMIT_MS || 15000));
const p95LimitMs = Math.max(1000, Number(process.env.P95_LIMIT_MS || 8000));
const p99LimitMs = Math.max(p95LimitMs, Number(process.env.P99_LIMIT_MS || 15000));
const hardLimitMs = Math.max(p99LimitMs, Number(process.env.HARD_LIMIT_MS || 25000));
const evidencePath = process.env.MAJOR_BANDS_CONCURRENCY_EVIDENCE || '/tmp/major-bands-concurrency-v3990_0.json';
const expectedQueryCacheVersion = 'major-bands-query-execution-cache-serialized-v3990_0';

const scenarios = Object.freeze([
  Object.freeze({ name: 'standard-579-near', path: '/api/major-bands?candidateScore=579&rangePreset=standard&band=near&limit=37&offset=0', band: 'near' }),
  Object.freeze({ name: 'standard-508-near', path: '/api/major-bands?candidateScore=508&rangePreset=standard&band=near&limit=37&offset=0', band: 'near' }),
  Object.freeze({ name: 'wide-680-steady', path: '/api/major-bands?candidateScore=680&rangePreset=wide&band=steady&limit=37&offset=0', band: 'steady' }),
  Object.freeze({ name: 'safe-449-near', path: '/api/major-bands?candidateScore=449&rangePreset=safe&band=near&limit=37&offset=0', band: 'near' }),
  Object.freeze({ name: 'high-750-empty', path: '/api/major-bands?candidateScore=750&rangePreset=wide&band=near&limit=37&offset=0', band: 'near', empty: true })
]);

function percentile(values, fraction) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)] || 0;
}

function summary(values) {
  return {
    count: values.length,
    minMs: Number(Math.min(...values).toFixed(2)),
    p50Ms: Number(percentile(values, 0.50).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    p99Ms: Number(percentile(values, 0.99).toFixed(2)),
    maxMs: Number(Math.max(...values).toFixed(2))
  };
}

async function requestScenario(scenario, token) {
  const separator = scenario.path.includes('?') ? '&' : '?';
  const url = `${base}${scenario.path}${separator}stress=${encodeURIComponent(token)}`;
  const started = performance.now();
  let response;
  let text;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs)
    });
    text = await response.text();
  } catch (error) {
    return { scenario: scenario.name, url, status: 0, elapsedMs: performance.now() - started, error: String(error?.message || error), cloudflare1102: false };
  }
  const elapsedMs = performance.now() - started;
  const lower = text.toLowerCase();
  const cloudflare1102 = lower.includes('error code: 1102')
    || lower.includes('<title>error 1102')
    || lower.includes('worker exceeded resource limits');
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {}
  return {
    scenario: scenario.name,
    url,
    status: response.status,
    elapsedMs,
    cloudflare1102,
    payload,
    bodyPrefix: payload ? '' : text.slice(0, 240)
  };
}

function validateResult(result) {
  assert.equal(result.status, 200, `${result.scenario}: HTTP ${result.status} ${result.error || result.bodyPrefix || ''}`);
  assert.equal(result.cloudflare1102, false, `${result.scenario}: Cloudflare 1102`);
  assert.ok(result.elapsedMs <= hardLimitMs, `${result.scenario}: hard latency ${result.elapsedMs.toFixed(1)}ms`);
  assert.equal(result.payload?.ok, true, `${result.scenario}: API ok=false ${result.payload?.message || ''}`);
  assert.equal(result.payload?.source?.queryKernelVersion, 'major-bands-rank-query-kernel-v3990_0', `${result.scenario}: query kernel`);
  assert.equal(result.payload?.source?.queryExecutionCacheVersion, expectedQueryCacheVersion, `${result.scenario}: query execution cache`);
  assert.equal(result.payload?.source?.publicHttpSelfFanout, false, `${result.scenario}: self fanout`);
  assert.equal(result.payload?.source?.bucketWorkerCount, 0, `${result.scenario}: bucket worker count`);
  assert.equal(result.payload?.source?.bucketWorkerTransferChars, 0, `${result.scenario}: bucket transfer`);
  const scenario = scenarios.find(item => item.name === result.scenario);
  const group = result.payload?.bands?.[scenario.band];
  assert.ok(group, `${result.scenario}: missing band`);
  assert.ok(group.pagination?.snapshot, `${result.scenario}: missing snapshot`);
  if (group.pagination?.hasMore) {
    assert.ok(Number(group.pagination.nextOffset) > Number(group.pagination.offset), `${result.scenario}: nextOffset not strict`);
  } else {
    assert.equal(group.pagination?.nextOffset, null, `${result.scenario}: terminal nextOffset`);
  }
  if (scenario.empty) {
    assert.equal(result.payload.meta?.classificationMode, 'rank_unavailable_empty');
    assert.equal(Number(result.payload.counts?.total || 0), 0);
    assert.equal(Number(group.count || 0), 0);
  }
}

async function runConcurrent(level, sampleCount) {
  const results = [];
  let launched = 0;
  while (launched < sampleCount) {
    const batchSize = Math.min(level, sampleCount - launched);
    const batch = Array.from({ length: batchSize }, (_, index) => {
      const ordinal = launched + index;
      const scenario = scenarios[ordinal % scenarios.length];
      return requestScenario(scenario, `v3990-${level}-${ordinal}-${Date.now()}`);
    });
    results.push(...await Promise.all(batch));
    launched += batchSize;
  }
  results.forEach(validateResult);
  return results;
}

async function exhaustPagination(scenario) {
  const seen = new Set();
  let offset = 0;
  let count = null;
  let snapshot = '';
  let requests = 0;
  while (requests < 240) {
    const url = new URL(scenario.path, 'https://contract.local');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', '80');
    const path = `${url.pathname}?${url.searchParams}`;
    const result = await requestScenario({ ...scenario, path }, `page-${scenario.name}-${offset}-${Date.now()}`);
    validateResult(result);
    requests += 1;
    const group = result.payload.bands[scenario.band];
    if (count == null) count = Number(group.count || 0);
    assert.equal(Number(group.count || 0), count, `${scenario.name}: count drift`);
    if (!snapshot) snapshot = group.pagination.snapshot;
    assert.equal(group.pagination.snapshot, snapshot, `${scenario.name}: snapshot drift`);
    for (const record of group.records || []) {
      assert.ok(record.id, `${scenario.name}: missing id`);
      assert.ok(!seen.has(record.id), `${scenario.name}: duplicate id ${record.id}`);
      seen.add(record.id);
    }
    if (!group.pagination.hasMore) {
      assert.equal(group.pagination.nextOffset, null);
      break;
    }
    const nextOffset = Number(group.pagination.nextOffset);
    assert.ok(nextOffset > offset, `${scenario.name}: nextOffset not strict`);
    offset = nextOffset;
  }
  assert.equal(seen.size, count, `${scenario.name}: paged ID union ${seen.size} != ${count}`);
  return { scenario: scenario.name, count, ids: seen.size, requests, snapshot };
}

const cold = [];
for (let index = 0; index < scenarios.length; index += 1) {
  const result = await requestScenario(scenarios[index], `cold-${index}-${Date.now()}`);
  validateResult(result);
  assert.ok(result.elapsedMs <= coldHardMs, `${result.scenario}: cold hard latency ${result.elapsedMs.toFixed(1)}ms`);
  cold.push(result.elapsedMs);
}

for (let round = 0; round < 3; round += 1) {
  for (let index = 0; index < scenarios.length; index += 1) {
    validateResult(await requestScenario(scenarios[index], `warm-${round}-${index}`));
  }
}

const concurrency = [];
let totalRequests = cold.length + scenarios.length * 3;
for (const level of levels) {
  const sampleCount = Math.max(20, level * waves);
  const results = await runConcurrent(level, sampleCount);
  const latencies = results.map(result => result.elapsedMs);
  const latency = summary(latencies);
  assert.ok(latency.p95Ms <= p95LimitMs, `concurrency ${level}: p95 ${latency.p95Ms}ms`);
  assert.ok(latency.p99Ms <= p99LimitMs, `concurrency ${level}: p99 ${latency.p99Ms}ms`);
  concurrency.push({
    level,
    latency,
    status5xx: results.filter(result => result.status >= 500).length,
    cloudflare1102: results.filter(result => result.cloudflare1102).length
  });
  totalRequests += results.length;
}

const pagination = [];
for (const scenario of scenarios) pagination.push(await exhaustPagination(scenario));
totalRequests += pagination.reduce((sum, item) => sum + item.requests, 0);

const evidence = {
  version: 'major-bands-real-concurrency-v3990_0',
  queryExecutionCacheVersion: expectedQueryCacheVersion,
  base,
  levels,
  waves,
  thresholds: { timeoutMs, coldHardMs, p95LimitMs, p99LimitMs, hardLimitMs },
  cold: summary(cold),
  concurrency,
  pagination,
  totalRequests,
  status5xx: concurrency.reduce((sum, item) => sum + item.status5xx, 0),
  cloudflare1102: concurrency.reduce((sum, item) => sum + item.cloudflare1102, 0)
};
assert.equal(evidence.status5xx, 0);
assert.equal(evidence.cloudflare1102, 0);
fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
