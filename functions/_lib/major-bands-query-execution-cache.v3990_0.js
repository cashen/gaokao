export const MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION = 'major-bands-query-execution-cache-v3990_0';

const MAX_COMPLETED_QUERIES = 1;
const MAX_COMPLETED_RECORDS = 6000;
const MAX_COMPLETED_ESTIMATED_BYTES = 2_000_000;
const COMPLETED_QUERY_RETENTION_ENABLED = true;
const COMPLETED_TTL_MS = 30_000;
const inFlight = new Map();
const completed = new Map();
let accessClock = 0;

function touch(entry) {
  entry.lastAccess = ++accessClock;
}

function completedRecordCount() {
  let count = 0;
  for (const entry of completed.values()) count += Number(entry.recordCount || 0);
  return count;
}

function completedEstimatedBytes() {
  let bytes = 0;
  for (const entry of completed.values()) bytes += Number(entry.estimatedBytes || 0);
  return bytes;
}

function pruneExpired(now = Date.now()) {
  for (const [key, entry] of completed) {
    if (entry.expiresAt <= now) completed.delete(key);
  }
}

function retentionStats(value) {
  return {
    recordCount: Math.max(0, Number(value?.cacheRetention?.recordCount || 0)),
    estimatedBytes: Math.max(0, Number(value?.cacheRetention?.estimatedBytes || 0))
  };
}

function canRetain(value) {
  const stats = retentionStats(value);
  return COMPLETED_QUERY_RETENTION_ENABLED
    && stats.recordCount <= MAX_COMPLETED_RECORDS
    && stats.estimatedBytes <= MAX_COMPLETED_ESTIMATED_BYTES;
}

export async function executeMajorBandsQueryOnce(identity, executor) {
  const key = String(identity || '');
  if (!key) throw new Error('major-bands query execution identity required');
  if (typeof executor !== 'function') throw new Error('major-bands query executor required');

  pruneExpired();
  const cached = completed.get(key);
  if (cached) {
    touch(cached);
    return {
      value: cached.value,
      cacheStatus: 'compact-completed-hit',
      joinedInFlight: false
    };
  }

  const pending = inFlight.get(key);
  if (pending) {
    return {
      value: await pending,
      cacheStatus: 'singleflight-hit',
      joinedInFlight: true
    };
  }

  // Release the prior compact snapshot before constructing a different rank
  // window. Only the requested band's compact reconstruction candidates may
  // survive completion; decoded buckets and full ranking objects never do.
  completed.clear();
  let promise;
  promise = Promise.resolve().then(async () => {
    const value = await executor();
    const isolatedExecution = inFlight.size === 1 && inFlight.get(key) === promise;
    if (isolatedExecution && canRetain(value)) {
      const stats = retentionStats(value);
      completed.clear();
      const entry = {
        value,
        recordCount: stats.recordCount,
        estimatedBytes: stats.estimatedBytes,
        expiresAt: Date.now() + COMPLETED_TTL_MS,
        lastAccess: 0
      };
      touch(entry);
      completed.set(key, entry);
    }
    return value;
  });
  inFlight.set(key, promise);
  try {
    return {
      value: await promise,
      cacheStatus: 'miss',
      joinedInFlight: false
    };
  } finally {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  }
}

export function majorBandsQueryExecutionCacheState() {
  pruneExpired();
  return Object.freeze({
    version: MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
    inFlight: inFlight.size,
    completed: completed.size,
    completedRecords: completedRecordCount(),
    completedEstimatedBytes: completedEstimatedBytes(),
    completedRetentionEnabled: COMPLETED_QUERY_RETENTION_ENABLED,
    maxCompletedQueries: MAX_COMPLETED_QUERIES,
    maxCompletedRecords: MAX_COMPLETED_RECORDS,
    maxCompletedEstimatedBytes: MAX_COMPLETED_ESTIMATED_BYTES,
    completedTtlMs: COMPLETED_TTL_MS,
    compactSnapshotOnly: true,
    crossRequestSemaphore: false,
    keys: Object.freeze([...completed.keys()])
  });
}

export function clearMajorBandsQueryExecutionCacheForTest() {
  inFlight.clear();
  completed.clear();
  accessClock = 0;
}
