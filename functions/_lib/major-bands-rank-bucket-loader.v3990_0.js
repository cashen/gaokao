import { loadMajorBandsStaticRankBucket } from './major-bands-static-provider.js';
import { lookupScoreRank, getRankPopulation } from './rank-table-provider.js';
import {
  normalizePositionPreset,
  rankWindowsForCandidate
} from '../../shared/algorithms/position/canonical-position.v3963_0.js';

export const MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION = 'major-bands-rank-bucket-loader-bounded-all-band-v3990_0';
export const MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION = 'major-bands-rank-bucket-cache-v3990_0';
export const MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION = 'major-bands-request-band-scope-v3990_0';

const MAX_CACHED_BUCKETS = 6;
const MAX_CACHED_BYTES = 900_000;
const MAX_RETAINED_QUERY_BUCKETS = 12;
const COMPLETED_BUCKET_RETENTION_ENABLED = false;
const MAX_LOAD_CONCURRENCY = 4;
const ALL_BANDS_LOAD_CONCURRENCY = 2;
const REQUEST_BANDS = new Set(['upper', 'near', 'steady']);
const bucketCache = new Map();
let accessClock = 0;

function touch(entry) {
  entry.lastAccess = ++accessClock;
}

function completedCacheBytes() {
  let bytes = 0;
  for (const entry of bucketCache.values()) {
    if (!entry.pending) bytes += Number(entry.bytes || 0);
  }
  return bytes;
}

function overlaps(bucket, range) {
  return Number(bucket?.minRank) <= Number(range?.maxRank)
    && Number(bucket?.maxRank) >= Number(range?.minRank);
}

function rankContextForRequestScore(candidateScore) {
  const row = lookupScoreRank({
    year: 2026,
    region: 'ln',
    subject: 'physics',
    score: candidateScore
  });
  if (!row) return null;
  const rankForGap = Number(row.rankForGap ?? row.rankEnd ?? row.cumulative);
  return Number.isFinite(rankForGap) && rankForGap > 0 ? rankForGap : null;
}

export function scopeMajorBandsRankBucketsForRequest(selectedBuckets = [], input = {}) {
  const buckets = Array.isArray(selectedBuckets) ? selectedBuckets : [];
  const requestedBand = String(input.band || '').trim();
  if (!REQUEST_BANDS.has(requestedBand)) {
    return Object.freeze({
      version: MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION,
      requestedBand: '',
      mode: 'all-bands-union',
      candidateBucketCount: buckets.length,
      buckets
    });
  }

  const candidateScore = Math.round(Number(input.candidateScore));
  const candidateRank = rankContextForRequestScore(candidateScore);
  const totalRank = getRankPopulation({
    year: 2026,
    region: 'ln',
    subject: 'physics',
    policy: 'table-total'
  });
  const rangePreset = normalizePositionPreset(input.rangePreset || 'standard');
  const rankWindows = rankWindowsForCandidate(candidateRank, rangePreset, totalRank);
  const requestedRange = rankWindows?.[requestedBand] || null;
  const scoped = requestedRange
    ? buckets.filter(bucket => overlaps(bucket, requestedRange))
    : [];

  return Object.freeze({
    version: MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION,
    requestedBand,
    mode: 'requested-band-rank-window',
    candidateScore,
    candidateRank,
    rangePreset,
    requestedRange,
    candidateBucketCount: buckets.length,
    buckets: scoped
  });
}

function scopeBucketsFromRequest(context, selectedBuckets) {
  let url;
  try {
    url = new URL(context?.request?.url || 'https://contract.local/api/major-bands');
  } catch {
    return scopeMajorBandsRankBucketsForRequest(selectedBuckets);
  }
  const scope = scopeMajorBandsRankBucketsForRequest(selectedBuckets, {
    candidateScore: url.searchParams.get('candidateScore'),
    rangePreset: url.searchParams.get('rangePreset'),
    band: url.searchParams.get('band')
  });

  // selectMajorBandsRankBuckets returns a request-local mutable array. Narrow it
  // in place so the API's chunksRead/chunksSkipped metadata remains truthful
  // without retaining a second union array for the rest of the request.
  if (Array.isArray(selectedBuckets) && scope.buckets !== selectedBuckets) {
    selectedBuckets.splice(0, selectedBuckets.length, ...scope.buckets);
  }
  return scope;
}

function assertLoadedBucket(indexBucket, loaded) {
  if (loaded.bucket.file !== indexBucket.file) throw new Error(`位次桶路径不一致：${indexBucket.file}`);
  if (Number(loaded.rowCount) !== Number(indexBucket.recordCount)) {
    throw new Error(`位次桶记录数不一致：${indexBucket.file}`);
  }
  if (String(loaded.bucket.sha256 || '') !== String(indexBucket.sha256 || '')) {
    throw new Error(`位次桶完整性摘要不一致：${indexBucket.file}`);
  }
}

async function readBucket(context, indexBucket) {
  const existing = bucketCache.get(indexBucket.file);
  if (existing) {
    touch(existing);
    return { loaded: await existing.promise, cacheStatus: 'hit' };
  }

  const entry = { pending: true, bytes: 0, lastAccess: 0, promise: null };
  touch(entry);
  entry.promise = loadMajorBandsStaticRankBucket(context.request, indexBucket.file, {
    assets: context.env?.ASSETS
  }).then(loaded => {
    assertLoadedBucket(indexBucket, loaded);
    entry.pending = false;
    entry.bytes = Number(loaded.bytes || 0);
    touch(entry);
    return loaded;
  }).finally(() => {
    // Query-level singleflight and short-lived completed query retention now
    // own reuse. Decoded buckets remain shared only while their asset read is
    // pending, then are released before another rank window is constructed.
    bucketCache.delete(indexBucket.file);
  });
  bucketCache.set(indexBucket.file, entry);
  return { loaded: await entry.promise, cacheStatus: 'miss' };
}

export async function loadMajorBandsRankWindow(context, selectedBuckets = []) {
  const scope = scopeBucketsFromRequest(context, selectedBuckets);
  const buckets = Array.isArray(scope.buckets) ? scope.buckets : [];
  const loadConcurrency = scope.mode === 'all-bands-union'
    ? ALL_BANDS_LOAD_CONCURRENCY
    : MAX_LOAD_CONCURRENCY;
  if (!buckets.length) {
    return {
      records: [],
      stats: {
        version: MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION,
        cacheVersion: MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION,
        requestBandScopeVersion: MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION,
        requestBandScopeMode: scope.mode,
        requestedBand: scope.requestedBand,
        candidateBucketCount: scope.candidateBucketCount,
        selectedBucketCount: 0,
        loadedRecordCount: 0,
        staticIndexBytes: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheRetention: 'none',
        peakConcurrency: 0,
        maxConcurrency: loadConcurrency
      }
    };
  }

  const results = new Array(buckets.length);
  let cursor = 0;
  let active = 0;
  let peakConcurrency = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= buckets.length) return;
      active += 1;
      peakConcurrency = Math.max(peakConcurrency, active);
      try {
        results[index] = await readBucket(context, buckets[index]);
      } finally {
        active -= 1;
      }
    }
  }

  await Promise.all(Array.from(
    { length: Math.min(loadConcurrency, buckets.length) },
    () => worker()
  ));

  const records = [];
  let cacheHits = 0;
  let cacheMisses = 0;
  let staticIndexBytes = 0;
  for (const result of results) {
    records.push(...result.loaded.records);
    staticIndexBytes += Number(result.loaded.bytes || 0);
    if (result.cacheStatus === 'hit') cacheHits += 1;
    else cacheMisses += 1;
  }

  return {
    records,
    stats: {
      version: MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION,
      cacheVersion: MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION,
      requestBandScopeVersion: MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION,
      requestBandScopeMode: scope.mode,
      requestedBand: scope.requestedBand,
      candidateBucketCount: scope.candidateBucketCount,
      selectedBucketCount: buckets.length,
      loadedRecordCount: records.length,
      staticIndexBytes,
      cacheHits,
      cacheMisses,
      cacheRetention: 'singleflight-only',
      peakConcurrency,
      maxConcurrency: loadConcurrency
    }
  };
}

export function majorBandsRankBucketCacheState() {
  return Object.freeze({
    version: MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION,
    requestBandScopeVersion: MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION,
    size: bucketCache.size,
    completedBytes: completedCacheBytes(),
    completedRetentionEnabled: COMPLETED_BUCKET_RETENTION_ENABLED,
    maxSize: COMPLETED_BUCKET_RETENTION_ENABLED ? MAX_CACHED_BUCKETS : 0,
    maxBytes: COMPLETED_BUCKET_RETENTION_ENABLED ? MAX_CACHED_BYTES : 0,
    maxRetainedQueryBuckets: COMPLETED_BUCKET_RETENTION_ENABLED ? MAX_RETAINED_QUERY_BUCKETS : 0,
    requestBandMaxConcurrency: MAX_LOAD_CONCURRENCY,
    allBandsMaxConcurrency: ALL_BANDS_LOAD_CONCURRENCY,
    files: Object.freeze([...bucketCache.keys()])
  });
}

export function clearMajorBandsRankBucketCacheForTest() {
  bucketCache.clear();
  accessClock = 0;
}
