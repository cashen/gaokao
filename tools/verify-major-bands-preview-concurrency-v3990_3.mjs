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
const transientRetryMaxAttempts = Math.max(1, Math.min(3, Number(process.env.TRANSIENT_RETRY_MAX_ATTEMPTS || 3)));
const transientRetryBackoffMs = Math.max(0, Math.min(1000, Number(process.env.TRANSIENT_RETRY_BACKOFF_MS || 150)));
const transientRetryBudgetMs = Math.max(0, Math.min(5000, Number(process.env.TRANSIENT_RETRY_BUDGET_MS || 5000)));
const evidencePath = process.env.MAJOR_BANDS_CONCURRENCY_EVIDENCE || '/tmp/major-bands-concurrency-v3990_3.json';
const expectedQueryCacheVersion = 'major-bands-query-execution-cache-single-heavy-v3990_3';
const expectedAllBandsPageCacheVersion = 'major-bands-all-bands-page-cache-release-on-band-switch-v3990_3';
const expectedExecutionGateVersion = 'major-bands-query-execution-gate-v3990_3';
const expectedExecutionGateMode = 'request-owned-timer-polling';
const expectedBucketLoaderVersion = 'major-bands-rank-bucket-loader-bounded-all-band-v3990_3';
const expectedRankRowFilterVersion = 'major-bands-rank-row-filter-v3990_3';
const expectedQueryMemoryMode = 'requested-band-lightweight-order-current-page-v3990_3';
const expectedOrderIdCacheVersion = 'major-bands-requested-band-order-id-lru-v3990_3';
const expectedOrderEdgeCacheVersion = 'major-bands-requested-band-order-edge-cache-score-hints-v3990_3';
const expectedPageScoreHintVersion = 'major-bands-requested-band-page-score-hints-v3990_3';
const expectedRequestedBandResponseEdgeCacheVersion = 'major-bands-requested-band-response-edge-cache-score-hints-v3990_3';
const expectedPageIdFilterVersion = 'major-bands-page-id-predecode-filter-v3990_3';
const expectedOrderProjectionVersion = 'major-bands-rank-order-minimal-projection-v3990_3';
const expectedOrderPageSourceVersion = 'major-bands-order-page-raw-row-reuse-v3990_3';
const expectedResultOrderVersion = 'major-bands-result-order-ephemeral-v3990_3';
const expectedRankingMemoryMode = 'ephemeral-compact-tuples-v3990_3';
const expectedAllBandsExecutionMode = 'sequential-internal-band-requests-v3990_3';
const expectedAllBandsSharedProjectionVersion = 'major-bands-all-bands-shared-projection-v3990_3';
const expectedAllBandsPageLimitCap = 16;
const expectedAllBandsEdgeCacheVersion = 'major-bands-all-bands-edge-cache-canonical-v3990_3';

const apiSourceForScoreHintContract = fs.readFileSync('functions/api/major-bands.js', 'utf8');
assert.equal((apiSourceForScoreHintContract.match(/orderedScores: orderedPageScores\(ordered\)/g) || []).length, 2, 'cold and shared ordered snapshots must both persist aligned scores');
assert.ok((apiSourceForScoreHintContract.match(/pageScoreHintVersion: MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION/g) || []).length >= 2, 'cold and shared ordered snapshots must both carry score-hint version');

const sharedScenarios = Object.freeze([
  Object.freeze({ name: 'standard-579-all', path: '/api/major-bands?candidateScore=579&rangePreset=standard&limit=37&offset=0', allBands: true }),
  Object.freeze({ name: 'standard-579-near', path: '/api/major-bands?candidateScore=579&rangePreset=standard&band=near&limit=37&offset=0', band: 'near' }),
  Object.freeze({ name: 'standard-508-near', path: '/api/major-bands?candidateScore=508&rangePreset=standard&band=near&limit=37&offset=0', band: 'near' }),
  Object.freeze({ name: 'wide-680-steady', path: '/api/major-bands?candidateScore=680&rangePreset=wide&band=steady&limit=37&offset=0', band: 'steady' }),
  Object.freeze({ name: 'safe-449-near', path: '/api/major-bands?candidateScore=449&rangePreset=safe&band=near&limit=37&offset=0', band: 'near' }),
  Object.freeze({ name: 'high-750-empty', path: '/api/major-bands?candidateScore=750&rangePreset=wide&band=near&limit=37&offset=0', band: 'near', empty: true })
]);
const paginationScenarios = Object.freeze(sharedScenarios.filter(scenario => !scenario.allBands));
const availableScoreCount = 365;
const presets = Object.freeze(['standard', 'wide', 'safe']);
const bands = Object.freeze(['upper', 'near', 'steady']);

function distinctScenario(ordinal) {
  const score = 344 + ((ordinal * 7) % availableScoreCount);
  const preset = presets[ordinal % presets.length];
  const band = bands[Math.floor(ordinal / presets.length) % bands.length];
  return Object.freeze({
    name: `distinct-${ordinal}-${score}-${preset}-${band}`,
    path: `/api/major-bands?candidateScore=${score}&rangePreset=${preset}&band=${band}&limit=37&offset=0`,
    band,
    distinctIdentity: true
  });
}

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
  const retryFailures = [];
  let attempt = 0;
  let response;
  let text = '';
  let error = null;

  while (attempt < transientRetryMaxAttempts) {
    attempt += 1;
    response = undefined;
    text = '';
    error = null;
    try {
      response = await fetch(url, {
        redirect: 'follow',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
      });
      text = await response.text();
    } catch (caught) {
      error = caught;
    }

    const status = response?.status || 0;
    const retryable = status === 0 || [502, 503, 504].includes(status);
    if (!retryable || attempt >= transientRetryMaxAttempts || performance.now() - started >= transientRetryBudgetMs) {
      break;
    }
    retryFailures.push({
      attempt,
      status,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      error: error ? String(error?.message || error) : '',
      bodyPrefix: text.slice(0, 160)
    });
    await new Promise(resolve => setTimeout(resolve, transientRetryBackoffMs * attempt));
  }

  const elapsedMs = performance.now() - started;
  if (error) {
    return {
      scenario: scenario.name,
      band: scenario.band || '',
      allBands: Boolean(scenario.allBands),
      empty: Boolean(scenario.empty),
      distinctIdentity: Boolean(scenario.distinctIdentity),
      url,
      status: 0,
      elapsedMs,
      error: String(error?.message || error),
      cloudflare1102: false,
      allBandsEdgeCacheStatus: '',
      attempts: attempt,
      retryFailures,
      recoveredAfterRetry: false
    };
  }

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
    band: scenario.band || '',
    allBands: Boolean(scenario.allBands),
    empty: Boolean(scenario.empty),
    distinctIdentity: Boolean(scenario.distinctIdentity),
    url,
    status: response.status,
    elapsedMs,
    cloudflare1102,
    allBandsEdgeCacheStatus: response.headers.get('x-gaokao-all-bands-edge-cache') || '',
    allBandsEdgeCacheVersion: response.headers.get('x-gaokao-all-bands-edge-cache-version') || '',
    requestedBandResponseEdgeCacheStatus: response.headers.get('x-gaokao-requested-band-response-edge-cache') || '',
    requestedBandResponseEdgeCacheVersion: response.headers.get('x-gaokao-requested-band-response-edge-cache-version') || '',
    payload,
    bodyPrefix: payload ? '' : text.slice(0, 240),
    attempts: attempt,
    retryFailures,
    recoveredAfterRetry: retryFailures.length > 0 && response.status === 200
  };
}

function validatePaginationGroup(result, band) {
  const group = result.payload?.bands?.[band];
  assert.ok(group, `${result.scenario}: missing ${band} band`);
  assert.ok(group.pagination?.snapshot, `${result.scenario}/${band}: missing snapshot`);
  assert.equal(group.pagination?.order, expectedResultOrderVersion, `${result.scenario}/${band}: result order deployment`);
  if (group.pagination?.hasMore) {
    assert.ok(Number(group.pagination.nextOffset) > Number(group.pagination.offset), `${result.scenario}/${band}: nextOffset not strict`);
  } else {
    assert.equal(group.pagination?.nextOffset, null, `${result.scenario}/${band}: terminal nextOffset`);
  }
  return group;
}

function validateResult(result) {
  const responseDetail = result.error || result.payload?.message || result.bodyPrefix || '';
  assert.equal(result.status, 200, `${result.scenario}: HTTP ${result.status} ${responseDetail}`);
  assert.equal(result.cloudflare1102, false, `${result.scenario}: Cloudflare 1102`);
  assert.ok(result.elapsedMs <= hardLimitMs, `${result.scenario}: hard latency ${result.elapsedMs.toFixed(1)}ms`);
  assert.equal(result.payload?.ok, true, `${result.scenario}: API ok=false ${result.payload?.message || ''}`);
  assert.equal(result.payload?.source?.queryKernelVersion, 'major-bands-rank-query-kernel-v3990_3', `${result.scenario}: query kernel`);
  assert.equal(result.payload?.source?.queryExecutionCacheVersion, expectedQueryCacheVersion, `${result.scenario}: query execution cache`);
  assert.equal(result.payload?.source?.queryMemoryMode, expectedQueryMemoryMode, `${result.scenario}: query memory deployment`);
  assert.equal(result.payload?.source?.requestedBandOrderCacheVersion, expectedOrderIdCacheVersion, `${result.scenario}: ordered-ID cache deployment`);
  assert.equal(result.payload?.source?.requestedBandOrderEdgeCacheVersion, expectedOrderEdgeCacheVersion, `${result.scenario}: ordered-ID edge cache deployment`);
  assert.equal(result.payload?.source?.requestedBandOrderEdgeCacheCanonicalKey, true, `${result.scenario}: ordered-ID edge cache key`);
  assert.ok(['hit', 'miss', 'stored', 'module-hit', 'unavailable', 'write-failed', 'shared-projection', 'keyword-bypass'].includes(result.payload?.source?.requestedBandOrderEdgeCacheStatus), `${result.scenario}: invalid ordered-ID edge cache status`);
  assert.equal(result.payload?.source?.requestedBandOrderCacheRetainsDecodedRows, false, `${result.scenario}: ordered-ID cache retained decoded rows`);
  assert.equal(result.payload?.source?.requestedBandOrderCacheRetainsEnrichedRecords, false, `${result.scenario}: ordered-ID cache retained enriched records`);
  assert.equal(result.payload?.source?.requestedBandOrderProjectionVersion, expectedOrderProjectionVersion, `${result.scenario}: minimal order projection deployment`);
  assert.equal(result.payload?.source?.requestedBandOrderMinimalProjection, true, `${result.scenario}: default query did not use minimal projection`);
  assert.equal(result.payload?.source?.requestedBandOrderPageSourceVersion, expectedOrderPageSourceVersion, `${result.scenario}: order page source deployment`);
  assert.ok(['raw-row-reuse', 'full-record-reuse', 'page-id-refetch', 'all-bands-shared-projection'].includes(result.payload?.source?.requestedBandOrderPageSource), `${result.scenario}: invalid order page source`);
  assert.equal(result.payload?.source?.requestedBandOrderPageScoreHintVersion, expectedPageScoreHintVersion, `${result.scenario}: page score hint deployment`);
  assert.ok(['not-needed', 'shared-projection', 'applied', 'empty-page', 'fallback-invalid-hints', 'fallback-uncovered-score', 'keyword-bypass'].includes(result.payload?.source?.requestedBandOrderPageBucketHintStatus), `${result.scenario}: invalid page bucket hint status`);
  assert.equal(result.payload?.source?.requestedBandOrderColdSecondAssetPass, false, `${result.scenario}: cold ordered query performed a second asset pass`);
  assert.equal(result.payload?.source?.requestedBandRawRowReferenceNonEnumerable, true, `${result.scenario}: raw row reference contract`);
  assert.equal(
    result.payload?.source?.requestedBandRawRowStorage,
    result.payload?.source?.requestedBandOrderPageSource === 'all-bands-shared-projection'
      ? 'serialized-json'
      : result.payload?.source?.requestedBandOrderPageSource === 'raw-row-reuse'
        ? 'array-reference'
        : 'full-record',
    `${result.scenario}: raw row storage ownership`
  );
  if (!result.allBands && result.payload?.source?.requestedBandOrderCacheStatus === 'ordered-id-miss') {
    assert.equal(result.payload?.source?.requestedBandOrderPageSource, 'raw-row-reuse', `${result.scenario}: cold order page did not reuse raw rows`);
  }
  if (!result.allBands && ['ordered-id-hit', 'ordered-id-edge-hit'].includes(result.payload?.source?.requestedBandOrderCacheStatus)) {
    assert.equal(result.payload?.source?.requestedBandOrderPageSource, 'page-id-refetch', `${result.scenario}: cached order page source`);
  }
  assert.ok(Number(result.payload?.source?.requestedBandPageDecodedRecords || 0) <= Number(result.payload?.meta?.pageSize || 80), `${result.scenario}: page decoded more than page size`);
  assert.equal(result.payload?.source?.requestedBandOrderCacheBounded, true, `${result.scenario}: ordered-ID LRU exceeded budget`);
  assert.ok(Number(result.payload?.source?.requestedBandOrderCacheEntries || 0) <= 8, `${result.scenario}: ordered-ID LRU entries`);
  assert.ok(Number(result.payload?.source?.requestedBandOrderCacheTotalIds || 0) <= 12000, `${result.scenario}: ordered-ID LRU total IDs`);
  assert.ok(Number(result.payload?.source?.requestedBandOrderCacheTotalChars || 0) <= 750000, `${result.scenario}: ordered-ID LRU total chars`);
  if (!result.allBands && !['unavailable', 'keyword-bypass', 'shared-projection'].includes(result.payload?.source?.requestedBandOrderEdgeCacheStatus)) {
    assert.equal(result.payload?.source?.requestedBandOrderModuleCacheEnabled, false, `${result.scenario}: Edge mode retained module ordered-ID cache`);
    assert.equal(Number(result.payload?.source?.requestedBandOrderCacheEntries || 0), 0, `${result.scenario}: Edge mode module ordered-ID entries`);
  }
  assert.equal(result.payload?.source?.pageIdFilterVersion, expectedPageIdFilterVersion, `${result.scenario}: page-ID predecode filter`);
  assert.equal(result.payload?.source?.rankingCandidateMode, 'lightweight-order-current-page-v3990_3', `${result.scenario}: lightweight ranking candidate`);
  assert.equal(result.payload?.source?.deferredResponseEnrichment, true, `${result.scenario}: response enrichment was not deferred`);
  assert.equal(Number(result.payload?.source?.responseEnrichedCandidates || 0), 0, `${result.scenario}: full candidates enriched before pagination`);
  assert.equal(result.payload?.source?.allBandsPageCacheVersion, expectedAllBandsPageCacheVersion, `${result.scenario}: all-band page cache deployment`);
  assert.equal(result.payload?.source?.allBandsPageCacheReleaseMode, 'release-completed-on-requested-band-switch-v3990_3', `${result.scenario}: all-band page cache release mode`);
  const allowedCacheStatuses = result.allBands
    ? ['sequential-band-orchestration']
    : ['miss', 'singleflight-hit', 'serialized-compact-hit', 'ordered-id-hit', 'ordered-id-edge-hit', 'ordered-id-miss', 'ordered-id-singleflight-hit'];
  assert.ok(allowedCacheStatuses.includes(result.payload?.source?.queryExecutionCacheStatus), `${result.scenario}: query execution cache status`);
  assert.equal(result.payload?.source?.bucketLoaderVersion, expectedBucketLoaderVersion, `${result.scenario}: bounded bucket loader`);
  assert.equal(
    Number(result.payload?.source?.rankBucketMaxConcurrency),
    result.allBands ? 3 : 1,
    `${result.scenario}: bucket asset-read concurrency contract`
  );
  assert.ok(
    Number(result.payload?.source?.rankBucketConcurrency || 0) <= Number(result.payload?.source?.rankBucketMaxConcurrency || 0),
    `${result.scenario}: bucket asset-read peak exceeded contract`
  );
  assert.equal(result.payload?.source?.rankRowFilterVersion, expectedRankRowFilterVersion, `${result.scenario}: predecode rank-row filter`);
  assert.ok(Number(result.payload?.source?.rankRawRowCount || 0) >= Number(result.payload?.source?.rankDecodedRowCount || 0), `${result.scenario}: decoded rows exceed raw rows`);
  assert.equal(
    Number(result.payload?.source?.rankRawRowCount || 0),
    Number(result.payload?.source?.rankDecodedRowCount || 0) + Number(result.payload?.source?.rankRowsSkipped || 0),
    `${result.scenario}: rank-row filter accounting`
  );
  assert.equal(result.payload?.source?.resultOrderVersion, expectedResultOrderVersion, `${result.scenario}: ephemeral result order`);
  assert.equal(result.payload?.source?.publicHttpSelfFanout, false, `${result.scenario}: self fanout`);
  assert.equal(result.payload?.source?.bucketWorkerCount, 0, `${result.scenario}: bucket worker count`);
  assert.equal(result.payload?.source?.bucketWorkerTransferChars, 0, `${result.scenario}: bucket transfer`);

  if (!result.allBands) {
    assert.equal(result.requestedBandResponseEdgeCacheVersion, expectedRequestedBandResponseEdgeCacheVersion, `${result.scenario}: requested-band response edge cache version`);
    assert.ok(['hit', 'stored', 'write-failed', 'unavailable'].includes(result.requestedBandResponseEdgeCacheStatus), `${result.scenario}: requested-band response edge cache status`);
  }

  if (result.allBands) {
    const pageSize = Number(result.payload?.meta?.pageSize || 0);
    assert.ok(pageSize > 0, `${result.scenario}: invalid page size`);
    assert.equal(result.payload?.source?.allBandsExecutionMode, expectedAllBandsExecutionMode, `${result.scenario}: sequential all-band execution mode`);
    assert.equal(result.payload?.source?.allBandsPageCacheVersion, expectedAllBandsPageCacheVersion, `${result.scenario}: final all-band page cache deployment`);
    assert.equal(result.payload?.source?.allBandsSharedProjectionVersion, expectedAllBandsSharedProjectionVersion, `${result.scenario}: shared all-band projection deployment`);
    assert.equal(Number(result.payload?.source?.allBandsPageLimitCap), expectedAllBandsPageLimitCap, `${result.scenario}: all-band page limit cap`);
    assert.equal(result.payload?.source?.allBandsEdgeCacheVersion, expectedAllBandsEdgeCacheVersion, `${result.scenario}: all-band edge cache deployment`);
    assert.equal(result.payload?.source?.allBandsEdgeCacheCanonicalKey, true, `${result.scenario}: all-band cache key is not canonical`);
    assert.equal(result.allBandsEdgeCacheVersion, expectedAllBandsEdgeCacheVersion, `${result.scenario}: all-band edge cache header version`);
    assert.ok(['hit', 'miss', 'unavailable', 'write-failed'].includes(result.allBandsEdgeCacheStatus), `${result.scenario}: invalid all-band edge cache status ${result.allBandsEdgeCacheStatus}`);
    assert.ok(Number(result.payload?.source?.allBandsRequestedPageLimit || 0) >= Number(result.payload?.source?.allBandsEffectivePageLimit || 0), `${result.scenario}: effective page limit exceeded requested limit`);
    assert.equal(Number(result.payload?.source?.allBandsEffectivePageLimit), expectedAllBandsPageLimitCap, `${result.scenario}: all-band effective page limit`);
    for (const band of bands) {
      assert.equal(Number(result.payload?.bands?.[band]?.pagination?.limit), expectedAllBandsPageLimitCap, `${result.scenario}/${band}: bounded page limit`);
    }
    assert.equal(Number(result.payload?.source?.allBandsPhysicalProjectionPasses), 1, `${result.scenario}: all-band physical projection passes`);
    assert.equal(Number(result.payload?.source?.allBandsSharedProjectionReuses), 2, `${result.scenario}: all-band projection reuse count`);
    assert.equal(Number(result.payload?.source?.allBandsFallbackPageRefetches), 0, `${result.scenario}: all-band fallback page refetch`);
    assert.ok(Number(result.payload?.source?.allBandsPhysicalAssetPasses) <= 1, `${result.scenario}: all-band physical asset passes`);
    assert.equal(result.payload?.source?.allBandsTransientProjectionReleased, true, `${result.scenario}: all-band transient projection retained`);
    assert.equal(result.payload?.source?.requestedBandOrderPageSource, 'all-bands-shared-projection', `${result.scenario}: all-band page source`);
    assert.equal(Number(result.payload?.source?.sequentialBandPasses), 3, `${result.scenario}: sequential band pass count`);
    assert.equal(result.payload?.source?.architecture, 'single-worker-sequential-band-pages-over-immutable-static-buckets', `${result.scenario}: sequential architecture`);
    assert.equal(result.payload?.source?.mode, 'single-worker-sequential-band-query-stable-snapshot-paged', `${result.scenario}: sequential mode`);
    assert.equal(result.payload?.source?.queryExecutionRetentionMode, 'compact-current-page-per-band', `${result.scenario}: all-band retention mode`);
    assert.equal(Number(result.payload?.source?.queryExecutionPageOffset), 0, `${result.scenario}: all-band page offset`);
    assert.equal(Number(result.payload?.source?.queryExecutionPageLimit), pageSize, `${result.scenario}: all-band page limit`);
    assert.ok(Number(result.payload?.source?.queryExecutionRetainedRecords || 0) <= pageSize * bands.length, `${result.scenario}: retained more than current pages`);
    assert.ok(Number(result.payload?.source?.rankBucketReadsTotal || 0) >= Number(result.payload?.source?.chunksRead || 0), `${result.scenario}: sequential bucket-read telemetry`);
    for (const band of bands) {
      const group = validatePaginationGroup(result, band);
      assert.ok((group.records || []).length <= pageSize, `${result.scenario}/${band}: page exceeds limit`);
    }
  } else {
    const group = validatePaginationGroup(result, result.band);
    assert.ok(['compact-requested-band-current-page', 'compact-requested-band-current-page-from-ordered-ids'].includes(result.payload?.source?.queryExecutionRetentionMode), `${result.scenario}: requested-band retention mode`);
    assert.ok(Number(result.payload?.source?.queryExecutionRetainedRecords || 0) <= Number(group.pagination?.limit || 0), `${result.scenario}: request retained more than current page`);
    assert.equal(Number(result.payload?.source?.queryExecutionPageOffset), Number(group.pagination?.offset), `${result.scenario}: execution page offset`);
    assert.equal(Number(result.payload?.source?.queryExecutionPageLimit), Number(group.pagination?.limit), `${result.scenario}: execution page limit`);
    assert.ok(Number(result.payload?.source?.rankBucketMaxConcurrency || 0) <= 1, `${result.scenario}: requested-band bucket concurrency exceeded one`);
    assert.ok(Number(result.payload?.source?.sortPasses || 0) <= 1, `${result.scenario}: requested-band performed more than one sort`);
    if (['ordered-id-hit', 'ordered-id-edge-hit'].includes(result.payload?.source?.requestedBandOrderCacheStatus)) {
      assert.ok(Number(result.payload?.source?.rankDecodedRowCount || 0) <= Number(group.pagination?.limit || 0), `${result.scenario}: ordered-ID hit decoded more than current page`);
      assert.ok(Number(result.payload?.source?.requestedBandPageDecodedRecords || 0) <= Number(group.pagination?.limit || 0), `${result.scenario}: ordered-ID page exceeded limit`);
      if (Number(group.pagination?.returned || 0) > 0) {
        assert.equal(result.payload?.source?.requestedBandOrderPageBucketHintStatus, 'applied', `${result.scenario}: cached page score hints not applied`);
        assert.equal(Number(result.payload?.source?.requestedBandOrderPageScoreHints || 0), Number(group.pagination?.returned || 0), `${result.scenario}: page score hint count`);
        assert.ok(Number(result.payload?.source?.requestedBandOrderPageSelectedBuckets || 0) > 0, `${result.scenario}: page score hint selected no buckets`);
        assert.ok(Number(result.payload?.source?.requestedBandOrderPageSelectedBuckets || 0) <= Number(result.payload?.source?.requestedBandOrderPageBucketHintCandidates || 0), `${result.scenario}: page score hint expanded buckets`);
      }
    }
    for (const hiddenBand of bands.filter(band => band !== result.band)) {
      assert.equal(Number(result.payload?.bands?.[hiddenBand]?.count || 0), 0, `${result.scenario}: hidden ${hiddenBand} band was classified`);
      assert.equal((result.payload?.bands?.[hiddenBand]?.records || []).length, 0, `${result.scenario}: hidden ${hiddenBand} records leaked`);
    }
    if (result.scenario === 'safe-449-near') {
      if (result.payload?.source?.requestedBandOrderPageSource === 'page-id-refetch') {
        assert.ok(Number(result.payload?.source?.chunksRead) >= 1 && Number(result.payload?.source?.chunksRead) <= 6, 'safe-449-near: page hint bucket scope');
        assert.ok(Number(result.payload?.source?.staticIndexBytes) > 0 && Number(result.payload?.source?.staticIndexBytes) <= 621156, 'safe-449-near: page hint static bytes');
      } else {
        assert.equal(Number(result.payload?.source?.chunksRead), 6, 'safe-449-near: cold requested band must read exactly six buckets');
        assert.equal(Number(result.payload?.source?.staticIndexBytes), 621156, 'safe-449-near: cold scoped static bytes drift');
      }
    }
    if (result.empty) {
      assert.equal(result.payload.meta?.classificationMode, 'rank_unavailable_empty');
      assert.equal(Number(result.payload.counts?.total || 0), 0);
      assert.equal(Number(group.count || 0), 0);
      assert.equal(Number(result.payload?.source?.chunksRead), 0, `${result.scenario}: high boundary read buckets`);
    }
  }
}

function recordIds(group) {
  return (group?.records || []).map(record => record.id);
}

async function verifyAllBandPageEquivalence() {
  const allScenario = sharedScenarios.find(scenario => scenario.allBands);
  const allResult = await requestScenario(allScenario, `equivalence-all-${Date.now()}`);
  validateResult(allResult);
  const edgeCacheProbe = await requestScenario(allScenario, `equivalence-edge-hit-${Date.now()}`);
  validateResult(edgeCacheProbe);
  if (base.startsWith('https://')) {
    assert.equal(edgeCacheProbe.allBandsEdgeCacheStatus, 'hit', 'all-band canonical edge cache did not serve semantic repeat');
  }
  const bandResults = {};
  const effectiveLimit = Number(allResult.payload?.source?.allBandsEffectivePageLimit || 0);
  assert.equal(effectiveLimit, expectedAllBandsPageLimitCap, 'all-band equivalence effective limit');
  for (const band of bands) {
    const bandUrl = new URL(allScenario.path, 'https://contract.local');
    bandUrl.searchParams.set('band', band);
    bandUrl.searchParams.set('limit', String(effectiveLimit));
    const path = `${bandUrl.pathname}?${bandUrl.searchParams}`;
    const result = await requestScenario({
      name: `equivalence-${band}`,
      path,
      band
    }, `equivalence-${band}-${Date.now()}`);
    validateResult(result);
    bandResults[band] = result;
    const allGroup = allResult.payload.bands[band];
    const bandGroup = result.payload.bands[band];
    assert.equal(allGroup.count, bandGroup.count, `all-band/${band}: count differs from requested-band page`);
    assert.equal(allGroup.pagination.snapshot, bandGroup.pagination.snapshot, `all-band/${band}: snapshot differs from requested-band page`);
    assert.deepEqual(recordIds(allGroup), recordIds(bandGroup), `all-band/${band}: page IDs differ from requested-band page`);
    assert.equal(allGroup.pagination.nextOffset, bandGroup.pagination.nextOffset, `all-band/${band}: nextOffset differs from requested-band page`);
  }
  return {
    mode: expectedAllBandsExecutionMode,
    edgeCacheStatus: edgeCacheProbe.allBandsEdgeCacheStatus,
    bands: Object.fromEntries(bands.map(band => [band, {
      count: allResult.payload.bands[band].count,
      returned: allResult.payload.bands[band].records.length,
      snapshot: allResult.payload.bands[band].pagination.snapshot
    }]))
  };
}

async function runConcurrent(level, sampleCount, mode) {
  const results = [];
  let launched = 0;
  while (launched < sampleCount) {
    const batchSize = Math.min(level, sampleCount - launched);
    const batch = Array.from({ length: batchSize }, (_, index) => {
      const ordinal = launched + index;
      const scenario = mode === 'distinct-identities'
        ? distinctScenario(ordinal)
        : sharedScenarios[ordinal % sharedScenarios.length];
      return requestScenario(scenario, `v3990-${mode}-${level}-${ordinal}-${Date.now()}`);
    });
    results.push(...await Promise.all(batch));
    launched += batchSize;
  }
  results.forEach(validateResult);
  if (mode === 'distinct-identities') {
    const identities = new Set(results.map(result => result.scenario));
    assert.equal(identities.size, results.length, `concurrency ${level}: distinct query identities collapsed in test generator`);
  }
  return results;
}

async function exhaustPagination(scenario) {
  const seen = new Set();
  let offset = 0;
  let count = null;
  let snapshot = '';
  let requests = 0;
  let orderEdgeHits = 0;
  while (requests < 240) {
    const url = new URL(scenario.path, 'https://contract.local');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', '80');
    const path = `${url.pathname}?${url.searchParams}`;
    const result = await requestScenario({ ...scenario, path }, `page-${scenario.name}-${offset}-${Date.now()}`);
    validateResult(result);
    if (result.payload?.source?.requestedBandOrderEdgeCacheStatus === 'hit') orderEdgeHits += 1;
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
  return { scenario: scenario.name, count, ids: seen.size, requests, snapshot, orderEdgeHits };
}

const allBandEquivalence = await verifyAllBandPageEquivalence();
const cold = [];
for (let index = 0; index < sharedScenarios.length; index += 1) {
  const result = await requestScenario(sharedScenarios[index], `cold-${index}-${Date.now()}`);
  validateResult(result);
  assert.ok(result.elapsedMs <= coldHardMs, `${result.scenario}: cold hard latency ${result.elapsedMs.toFixed(1)}ms`);
  cold.push(result.elapsedMs);
}

for (let round = 0; round < 3; round += 1) {
  for (let index = 0; index < sharedScenarios.length; index += 1) {
    validateResult(await requestScenario(sharedScenarios[index], `warm-${round}-${index}`));
  }
}

const concurrencyModes = ['shared-identities', 'distinct-identities'];
const concurrency = Object.fromEntries(concurrencyModes.map(mode => [mode, []]));
let totalRequests = 4 + cold.length + sharedScenarios.length * 3;
for (const mode of concurrencyModes) {
  for (const level of levels) {
    const sampleCount = Math.max(20, level * waves);
    console.log(JSON.stringify({ phase: 'concurrency-start', mode, level, sampleCount }));
    const results = await runConcurrent(level, sampleCount, mode);
    const failedResults = results.filter(result => result.status !== 200 || result.cloudflare1102);
    if (failedResults.length) {
      console.error(JSON.stringify({
        phase: 'concurrency-failure',
        mode,
        level,
        failures: failedResults.map(result => ({
          scenario: result.scenario,
          status: result.status,
          elapsedMs: result.elapsedMs,
          cloudflare1102: result.cloudflare1102,
          error: result.error || result.bodyPrefix || ''
        }))
      }, null, 2));
    }
    const latencies = results.map(result => result.elapsedMs);
    const latency = summary(latencies);
    assert.ok(latency.p95Ms <= p95LimitMs, `${mode} concurrency ${level}: p95 ${latency.p95Ms}ms`);
    assert.ok(latency.p99Ms <= p99LimitMs, `${mode} concurrency ${level}: p99 ${latency.p99Ms}ms`);
    concurrency[mode].push({
      level,
      identities: new Set(results.map(result => result.scenario)).size,
      latency,
      status5xx: results.filter(result => result.status >= 500).length,
      cloudflare1102: results.filter(result => result.cloudflare1102).length,
      responseEdgeHits: results.filter(result => result.requestedBandResponseEdgeCacheStatus === 'hit').length,
      responseEdgeStores: results.filter(result => result.requestedBandResponseEdgeCacheStatus === 'stored').length,
      retryRecoveredSamples: results.filter(result => result.recoveredAfterRetry).length,
      retryFailureCount: results.reduce((sum, result) => sum + result.retryFailures.length, 0)
    });
    totalRequests += results.length;
  }
}

const pagination = [];
for (const scenario of paginationScenarios) pagination.push(await exhaustPagination(scenario));
if (base.startsWith('https://')) {
  const responseEdgeHits = concurrencyModes
    .flatMap(mode => concurrency[mode])
    .reduce((sum, item) => sum + Number(item.responseEdgeHits || 0), 0);
  assert.ok(responseEdgeHits > 0, 'requested-band production response edge cache did not record any hit');
  const safePagination = pagination.find(item => item.scenario === 'safe-449-near');
  assert.ok(Number(safePagination?.orderEdgeHits || 0) > 0, 'safe-449-near pagination did not use ordered-ID edge snapshot');
}
totalRequests += pagination.reduce((sum, item) => sum + item.requests, 0);

const allConcurrencyEvidence = concurrencyModes.flatMap(mode => concurrency[mode]);
const evidence = {
  version: 'major-bands-real-concurrency-v3990_3',
  queryExecutionCacheVersion: expectedQueryCacheVersion,
  executionGateVersion: expectedExecutionGateVersion,
  executionGateMode: expectedExecutionGateMode,
  queryMemoryMode: expectedQueryMemoryMode,
  resultOrderVersion: expectedResultOrderVersion,
  rankingMemoryMode: expectedRankingMemoryMode,
  allBandsExecutionMode: expectedAllBandsExecutionMode,
  allBandEquivalence,
  requestedBandFastPath: 'target-band-only-in-place',
  maxConcurrentExecutions: 1,
  bucketLoaderVersion: expectedBucketLoaderVersion,
  rankRowFilterVersion: expectedRankRowFilterVersion,
  orderedIdCacheVersion: expectedOrderIdCacheVersion,
  pageIdFilterVersion: expectedPageIdFilterVersion,
  orderProjectionVersion: expectedOrderProjectionVersion,
  orderPageSourceVersion: expectedOrderPageSourceVersion,
  allBandBucketMaxConcurrency: 1,
  requestedBandBucketMaxConcurrency: 1,
  concurrencyContract: 'shared-and-distinct-query-identities-v3990_3',
  allBandRetentionContract: 'compact-current-page-per-band',
  base,
  levels,
  waves,
  thresholds: { timeoutMs, coldHardMs, p95LimitMs, p99LimitMs, hardLimitMs },
  transientRetryPolicy: {
    maxAttempts: transientRetryMaxAttempts,
    backoffMs: transientRetryBackoffMs,
    budgetMs: transientRetryBudgetMs,
    retryableStatuses: [0, 502, 503, 504]
  },
  cold: summary(cold),
  concurrency,
  pagination,
  totalRequests,
  status5xx: allConcurrencyEvidence.reduce((sum, item) => sum + item.status5xx, 0),
  cloudflare1102: allConcurrencyEvidence.reduce((sum, item) => sum + item.cloudflare1102, 0),
  retryRecoveredSamples: allConcurrencyEvidence.reduce((sum, item) => sum + Number(item.retryRecoveredSamples || 0), 0),
  retryFailureCount: allConcurrencyEvidence.reduce((sum, item) => sum + Number(item.retryFailureCount || 0), 0)
};
assert.equal(evidence.status5xx, 0);
assert.equal(evidence.cloudflare1102, 0);
for (const item of concurrency['distinct-identities']) {
  assert.equal(item.identities, Math.max(20, item.level * waves), `distinct concurrency ${item.level}: identity coverage`);
}
fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
