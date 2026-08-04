export const MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION = 'major-bands-query-execution-cache-v3990_0';

const MAX_COMPLETED_QUERIES = 1;
const MAX_COMPLETED_RECORDS = 6000;
const COMPLETED_QUERY_RETENTION_ENABLED = false;
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

function pruneExpired(now = Date.now()) {
  for (const [key, entry] of completed) {
    if (entry.expiresAt <= now) completed.delete(key);
  }
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
      cacheStatus: 'completed-hit',
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

  // Only concurrent callers of the exact same query share work. Completed
  // classified and ordered windows are deliberately not retained: clearing a
  // global Map does not force edge GC before the next request, and overlapping
  // generations can exceed the isolate memory budget.
  const promise = Promise.resolve().then(executor);
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
    completedRetentionEnabled: COMPLETED_QUERY_RETENTION_ENABLED,
    maxCompletedQueries: COMPLETED_QUERY_RETENTION_ENABLED ? MAX_COMPLETED_QUERIES : 0,
    maxCompletedRecords: COMPLETED_QUERY_RETENTION_ENABLED ? MAX_COMPLETED_RECORDS : 0,
    completedTtlMs: COMPLETED_QUERY_RETENTION_ENABLED ? COMPLETED_TTL_MS : 0,
    singleflightOnly: true,
    crossRequestSemaphore: false,
    keys: Object.freeze([...completed.keys()])
  });
}

export function clearMajorBandsQueryExecutionCacheForTest() {
  inFlight.clear();
  completed.clear();
  accessClock = 0;
}
