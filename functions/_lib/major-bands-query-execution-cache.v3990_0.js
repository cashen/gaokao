export const MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION = 'major-bands-query-execution-cache-v3990_0';

const MAX_COMPLETED_QUERIES = 1;
const MAX_COMPLETED_RECORDS = 6000;
const COMPLETED_TTL_MS = 30_000;
const inFlight = new Map();
const completed = new Map();
let accessClock = 0;

function touch(entry) {
  entry.lastAccess = ++accessClock;
}

function resultRecordCount(value) {
  return ['upper', 'near', 'steady'].reduce(
    (sum, key) => sum + Number(value?.processed?.grouped?.[key]?.count || 0),
    0
  );
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

function evictCompleted() {
  while (completed.size > MAX_COMPLETED_QUERIES || completedRecordCount() > MAX_COMPLETED_RECORDS) {
    let victim = null;
    for (const [key, entry] of completed) {
      if (!victim || entry.lastAccess < victim.entry.lastAccess) victim = { key, entry };
    }
    if (!victim) return;
    completed.delete(victim.key);
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

  // Do not let a previous fully classified window overlap a different query.
  // Cloudflare request contexts must never wait on a manually resolved global
  // semaphore, so distinct queries run normally; completed retention is only
  // allowed when this is the isolate's sole active query execution.
  completed.clear();
  let promise;
  promise = Promise.resolve().then(async () => {
    const value = await executor();
    const recordCount = resultRecordCount(value);
    const isolatedExecution = inFlight.size === 1 && inFlight.get(key) === promise;
    if (isolatedExecution && recordCount <= MAX_COMPLETED_RECORDS) {
      completed.clear();
      const entry = {
        value,
        recordCount,
        expiresAt: Date.now() + COMPLETED_TTL_MS,
        lastAccess: 0
      };
      touch(entry);
      completed.set(key, entry);
      evictCompleted();
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
    maxCompletedQueries: MAX_COMPLETED_QUERIES,
    maxCompletedRecords: MAX_COMPLETED_RECORDS,
    completedTtlMs: COMPLETED_TTL_MS,
    retainOnlyWhenIsolated: true,
    crossRequestSemaphore: false,
    keys: Object.freeze([...completed.keys()])
  });
}

export function clearMajorBandsQueryExecutionCacheForTest() {
  inFlight.clear();
  completed.clear();
  accessClock = 0;
}
