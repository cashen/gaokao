import { loadMajorBandsStaticRankBucket } from './major-bands-static-provider.js';

export const MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION = 'major-bands-rank-bucket-loader-v3990_0';
export const MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION = 'major-bands-rank-bucket-cache-v3990_0';

const MAX_CACHED_BUCKETS = 18;
const MAX_LOAD_CONCURRENCY = 4;
const bucketCache = new Map();
let accessClock = 0;

function touch(entry) {
  entry.lastAccess = ++accessClock;
}

function evictCompletedBuckets() {
  while (bucketCache.size > MAX_CACHED_BUCKETS) {
    let victim = null;
    for (const [file, entry] of bucketCache) {
      if (entry.pending) continue;
      if (!victim || entry.lastAccess < victim.entry.lastAccess) victim = { file, entry };
    }
    if (!victim) return;
    bucketCache.delete(victim.file);
  }
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

  const entry = { pending: true, lastAccess: 0, promise: null };
  touch(entry);
  entry.promise = loadMajorBandsStaticRankBucket(context.request, indexBucket.file, {
    assets: context.env?.ASSETS
  }).then(loaded => {
    assertLoadedBucket(indexBucket, loaded);
    entry.pending = false;
    touch(entry);
    evictCompletedBuckets();
    return loaded;
  }).catch(error => {
    bucketCache.delete(indexBucket.file);
    throw error;
  });
  bucketCache.set(indexBucket.file, entry);
  return { loaded: await entry.promise, cacheStatus: 'miss' };
}

export async function loadMajorBandsRankWindow(context, selectedBuckets = []) {
  const buckets = Array.isArray(selectedBuckets) ? selectedBuckets : [];
  if (!buckets.length) {
    return {
      records: [],
      stats: {
        version: MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION,
        cacheVersion: MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION,
        selectedBucketCount: 0,
        loadedRecordCount: 0,
        staticIndexBytes: 0,
        cacheHits: 0,
        cacheMisses: 0,
        peakConcurrency: 0,
        maxConcurrency: MAX_LOAD_CONCURRENCY
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
    { length: Math.min(MAX_LOAD_CONCURRENCY, buckets.length) },
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
      selectedBucketCount: buckets.length,
      loadedRecordCount: records.length,
      staticIndexBytes,
      cacheHits,
      cacheMisses,
      peakConcurrency,
      maxConcurrency: MAX_LOAD_CONCURRENCY
    }
  };
}

export function majorBandsRankBucketCacheState() {
  return Object.freeze({
    version: MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION,
    size: bucketCache.size,
    maxSize: MAX_CACHED_BUCKETS,
    files: Object.freeze([...bucketCache.keys()])
  });
}

export function clearMajorBandsRankBucketCacheForTest() {
  bucketCache.clear();
  accessClock = 0;
}

