import {
  MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
  MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
  MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION,
  loadMajorBandsStaticRankBucket
} from './major-bands-static-provider.js';
import { lookupScoreRank, getRankPopulation } from './rank-table-provider.js';
import {
  normalizePositionPreset,
  rankWindowsForCandidate
} from '../../shared/algorithms/position/canonical-position.v3963_0.js';

export const MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION = 'major-bands-rank-bucket-loader-bounded-all-band-v3990_3';
export const MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION = 'major-bands-rank-bucket-cache-v3990_3';
export const MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION = 'major-bands-request-band-scope-v3990_3';
export const MAJOR_BANDS_RANK_BUCKET_RECORD_OWNERSHIP = 'miss-owned-hit-shallow-cloned-v3990_3';
export { MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION, MAJOR_BANDS_RANK_ROW_FILTER_VERSION, MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION };

const MAX_CACHED_BUCKETS = 6;
const MAX_CACHED_BYTES = 900_000;
const MAX_RETAINED_QUERY_BUCKETS = 12;
const COMPLETED_BUCKET_RETENTION_ENABLED = false;
const MAX_LOAD_CONCURRENCY = 1;
const ALL_BANDS_LOAD_CONCURRENCY = 3;
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

function cloneLoadedForSharedQuery(loaded) {
  return {
    ...loaded,
    records: Array.isArray(loaded?.records)
      ? loaded.records.map(record => ({ ...record }))
      : []
  };
}

function attachRecordExecutionContext(records, scope) {
  Object.defineProperties(records, {
    majorBandsRequestedBand: {
      value: scope.requestedBand || '',
      enumerable: false,
      configurable: false,
      writable: false
    },
    majorBandsMutateSourceRecords: {
      value: true,
      enumerable: false,
      configurable: false,
      writable: false
    },
    majorBandsRecordOwnership: {
      value: MAJOR_BANDS_RANK_BUCKET_RECORD_OWNERSHIP,
      enumerable: false,
      configurable: false,
      writable: false
    }
  });
  return records;
}


function pageIdFingerprint(allowedIds) {
  if (!(allowedIds instanceof Set) || !allowedIds.size) return 'all-ids';
  let hash = 0x811c9dc5;
  for (const id of [...allowedIds].sort()) {
    const value = String(id || '');
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return `${allowedIds.size}:${hash.toString(16).padStart(8, '0')}`;
}

function bucketReadKey(indexBucket, scope = {}, options = {}) {
  const range = scope.requestedRange;
  const suffix = range && Number.isFinite(Number(range.minRank)) && Number.isFinite(Number(range.maxRank))
    ? `${Number(range.minRank)}:${Number(range.maxRank)}`
    : 'all-ranks';
  const projection = options.projection || 'full-record-v3990_3';
  const rawRowStorage = options.rawRowStorage === 'serialized-json' ? 'serialized-json' : 'array-reference';
  const predecodeRegion = String(options.predecodeRegion || 'all').trim() || 'all';
  const platformTarget = String(options.platformTarget || '').trim() || 'all';
  return `${indexBucket.file}|${suffix}|${pageIdFingerprint(options.allowedIds)}|${projection}|${rawRowStorage}|region:${predecodeRegion}|platform:${platformTarget}`;
}

async function readBucket(context, indexBucket, scope, options = {}) {
  const cacheKey = bucketReadKey(indexBucket, scope, options);
  const existing = bucketCache.get(cacheKey);
  if (existing) {
    touch(existing);
    const shared = await existing.promise;
    // The first reader owns the decoded row objects and may safely transform
    // them in place. A different query joining the pending asset read receives
    // shallow-cloned rows so request-local enrichment cannot leak across queries.
    return { loaded: cloneLoadedForSharedQuery(shared), cacheStatus: 'hit-cloned' };
  }

  const entry = { pending: true, bytes: 0, lastAccess: 0, promise: null };
  touch(entry);
  entry.promise = loadMajorBandsStaticRankBucket(context.request, indexBucket.file, {
    assets: context.env?.ASSETS,
    rankRange: scope.requestedRange,
    bucketRankBounds: {
      minRank: Number(indexBucket.minRank),
      maxRank: Number(indexBucket.maxRank)
    },
    allowedIds: options.allowedIds,
    predecodeRegion: options.predecodeRegion,
    platformTarget: options.platformTarget,
    projection: options.projection,
    rawRowStorage: options.rawRowStorage
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
    bucketCache.delete(cacheKey);
  });
  bucketCache.set(cacheKey, entry);
  return { loaded: await entry.promise, cacheStatus: 'miss-owned' };
}

export async function loadMajorBandsRankWindow(context, selectedBuckets = [], options = {}) {
  const scope = scopeBucketsFromRequest(context, selectedBuckets);
  const buckets = Array.isArray(scope.buckets) ? scope.buckets : [];
  const loadConcurrency = scope.mode === 'all-bands-union'
    ? ALL_BANDS_LOAD_CONCURRENCY
    : MAX_LOAD_CONCURRENCY;
  if (!buckets.length) {
    return {
      records: attachRecordExecutionContext([], scope),
      stats: {
        version: MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION,
        cacheVersion: MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION,
        recordOwnership: MAJOR_BANDS_RANK_BUCKET_RECORD_OWNERSHIP,
        requestBandScopeVersion: MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION,
        requestBandScopeMode: scope.mode,
        requestedBand: scope.requestedBand,
        candidateBucketCount: scope.candidateBucketCount,
        selectedBucketCount: 0,
        loadedRecordCount: 0,
        decodedRowCount: 0,
        rawRowCount: 0,
        rankRowsSkipped: 0,
        rankOnlyRowsSkipped: 0,
        regionRowsSkipped: 0,
        platformRowsSkipped: 0,
        platformTarget: String(options.platformTarget || '').trim(),
        predecodeRegion: String(options.predecodeRegion || 'all').trim() || 'all',
        predecodeRegionFilterVersion: MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION,
        pageIdRowsSkipped: 0,
        pageIdFilterCount: options.allowedIds instanceof Set ? options.allowedIds.size : 0,
        pageIdFilterVersion: 'major-bands-page-id-predecode-filter-v3990_3',
        projectionVersion: options.projection || 'full-record-v3990_3',
        minimalProjection: options.projection === MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
        rawRowStorage: options.projection === MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION
          ? (options.rawRowStorage === 'serialized-json' ? 'serialized-json' : 'array-reference')
          : 'full-record',
        rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
        staticIndexBytes: 0,
        cacheHits: 0,
        cacheMisses: 0,
        sharedRowsCloned: 0,
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
        results[index] = await readBucket(context, buckets[index], scope, options);
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
  let sharedRowsCloned = 0;
  let staticIndexBytes = 0;
  let rawRowCount = 0;
  let decodedRowCount = 0;
  let rankRowsSkipped = 0;
  let rankOnlyRowsSkipped = 0;
  let regionRowsSkipped = 0;
  let platformRowsSkipped = 0;
  let pageIdRowsSkipped = 0;
  for (const result of results) {
    records.push(...result.loaded.records);
    staticIndexBytes += Number(result.loaded.bytes || 0);
    rawRowCount += Number(result.loaded.rowCount || 0);
    decodedRowCount += Number(result.loaded.decodedRowCount ?? result.loaded.records.length ?? 0);
    rankRowsSkipped += Number(result.loaded.rankRowsSkipped || 0);
    rankOnlyRowsSkipped += Number(result.loaded.rankOnlyRowsSkipped || 0);
    regionRowsSkipped += Number(result.loaded.regionRowsSkipped || 0);
    platformRowsSkipped += Number(result.loaded.platformRowsSkipped || 0);
    pageIdRowsSkipped += Number(result.loaded.pageIdRowsSkipped || 0);
    if (result.cacheStatus === 'hit-cloned') {
      cacheHits += 1;
      sharedRowsCloned += result.loaded.records.length;
    } else {
      cacheMisses += 1;
    }
  }
  attachRecordExecutionContext(records, scope);

  return {
    records,
    stats: {
      version: MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION,
      cacheVersion: MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION,
      recordOwnership: MAJOR_BANDS_RANK_BUCKET_RECORD_OWNERSHIP,
      requestBandScopeVersion: MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION,
      requestBandScopeMode: scope.mode,
      requestedBand: scope.requestedBand,
      candidateBucketCount: scope.candidateBucketCount,
      selectedBucketCount: buckets.length,
      loadedRecordCount: records.length,
      decodedRowCount,
      rawRowCount,
      rankRowsSkipped,
      rankOnlyRowsSkipped,
      regionRowsSkipped,
      platformRowsSkipped,
      platformTarget: String(options.platformTarget || '').trim(),
      predecodeRegion: String(options.predecodeRegion || 'all').trim() || 'all',
      predecodeRegionFilterVersion: MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION,
      pageIdRowsSkipped,
      pageIdFilterCount: options.allowedIds instanceof Set ? options.allowedIds.size : 0,
      pageIdFilterVersion: 'major-bands-page-id-predecode-filter-v3990_3',
      projectionVersion: results[0]?.loaded?.projectionVersion || options.projection || 'full-record-v3990_3',
      minimalProjection: results.every(result => result?.loaded?.minimalProjection === true),
      rawRowStorage: results[0]?.loaded?.rawRowStorage || 'full-record',
      rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
      staticIndexBytes,
      cacheHits,
      cacheMisses,
      sharedRowsCloned,
      cacheRetention: 'singleflight-only',
      peakConcurrency,
      maxConcurrency: loadConcurrency
    }
  };
}

export function majorBandsRankBucketCacheState() {
  return Object.freeze({
    version: MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION,
    recordOwnership: MAJOR_BANDS_RANK_BUCKET_RECORD_OWNERSHIP,
    requestBandScopeVersion: MAJOR_BANDS_REQUEST_BAND_SCOPE_VERSION,
    rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
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
