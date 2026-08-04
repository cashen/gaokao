export const MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION = 'major-bands-query-execution-cache-v3990_0';

const MAX_COMPLETED_QUERIES = 1;
const MAX_COMPLETED_RECORDS = 6000;
const MAX_ACTIVE_EXECUTIONS = 1;
const COMPLETED_TTL_MS = 30_000;
const inFlight = new Map();
const completed = new Map();
const executionWaiters = [];
let activeExecutions = 0;
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

async function acquireExecutionSlot() {
  if (activeExecutions >= MAX_ACTIVE_EXECUTIONS) {
    await new Promise(resolve => executionWaiters.push(resolve));
  }
  activeExecutions += 1;
}

function releaseExecutionSlot() {
  activeExecutions = Math.max(0, activeExecutions - 1);
  const next = executionWaiters.shift();
  if (next) next();
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

  const promise = (async () => {
    await acquireExecutionSlot();
    try {
      // A completed query contains the fully classified and ordered window.
      // Release it before constructing a different heavy window so the two
      // generations never overlap inside the same edge isolate.
      completed.clear();
      const value = await executor();
      const recordCount = resultRecordCount(value);
      completed.clear();
      if (recordCount <= MAX_COMPLETED_RECORDS) {
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
    } finally {
      releaseExecutionSlot();
    }
  })();
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
    activeExecutions,
    waitingExecutions: executionWaiters.length,
    maxActiveExecutions: MAX_ACTIVE_EXECUTIONS,
    completed: completed.size,
    completedRecords: completedRecordCount(),
    maxCompletedQueries: MAX_COMPLETED_QUERIES,
    maxCompletedRecords: MAX_COMPLETED_RECORDS,
    completedTtlMs: COMPLETED_TTL_MS,
    keys: Object.freeze([...completed.keys()])
  });
}

export function clearMajorBandsQueryExecutionCacheForTest() {
  inFlight.clear();
  completed.clear();
  executionWaiters.splice(0, executionWaiters.length);
  activeExecutions = 0;
  accessClock = 0;
}
