export const MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION = 'major-bands-query-execution-cache-serialized-request-timer-v3990_0';
export const MAJOR_BANDS_QUERY_EXECUTION_CACHE_MODE = 'serialized-compact-snapshot-v3990_0';
export const MAJOR_BANDS_QUERY_EXECUTION_GATE_VERSION = 'major-bands-query-execution-gate-v3990_0';
export const MAJOR_BANDS_QUERY_EXECUTION_GATE_MODE = 'request-owned-timer-polling';

const MAX_COMPLETED_QUERIES = 1;
const MAX_COMPLETED_RECORDS = 6000;
const MAX_COMPLETED_ESTIMATED_BYTES = 2_000_000;
const COMPLETED_QUERY_RETENTION_ENABLED = true;
const COMPLETED_TTL_MS = 30_000;
const MAX_RECENT_IDENTITIES = 32;
const MAX_CONCURRENT_EXECUTIONS = 2;
const EXECUTION_SLOT_POLL_MS = 8;
const inFlight = new Map();
const completed = new Map();
const recentIdentities = new Map();
let activeExecutions = 0;
let queuedExecutions = 0;
let peakActiveExecutions = 0;
let peakQueuedExecutions = 0;
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
  for (const [key, expiresAt] of recentIdentities) {
    if (expiresAt <= now) recentIdentities.delete(key);
  }
}

function trimRecentIdentities() {
  while (recentIdentities.size > MAX_RECENT_IDENTITIES) {
    const first = recentIdentities.keys().next().value;
    if (first === undefined) break;
    recentIdentities.delete(first);
  }
}

function retentionStats(value) {
  return {
    recordCount: Math.max(0, Number(value?.cacheRetention?.recordCount || 0)),
    estimatedBytes: Math.max(0, Number(value?.cacheRetention?.estimatedBytes || 0))
  };
}

function completedRetentionPolicy(value) {
  if (value?.cacheRetention?.retainCompleted === true) return 'immediate-opt-in';
  if (value?.cacheRetention?.retainCompleted === false) return 'disabled';
  if (value?.cacheRetention?.mode === 'compact-requested-band-snapshot') return 'second-use';
  return 'disabled';
}

function completedRetentionRequested(value) {
  return completedRetentionPolicy(value) !== 'disabled';
}

function shouldRetainCompleted(key, value, now = Date.now()) {
  if (!completedRetentionRequested(value)) return false;
  const policy = completedRetentionPolicy(value);
  if (policy === 'immediate-opt-in') return true;
  const seenBefore = Number(recentIdentities.get(key) || 0) > now;
  recentIdentities.delete(key);
  recentIdentities.set(key, now + COMPLETED_TTL_MS);
  trimRecentIdentities();
  return seenBefore;
}

function declaredRetentionWithinBudget(value) {
  const stats = retentionStats(value);
  return stats.recordCount <= MAX_COMPLETED_RECORDS
    && stats.estimatedBytes <= MAX_COMPLETED_ESTIMATED_BYTES;
}

function serializeRetainedValue(value) {
  const serialized = JSON.stringify(value);
  return {
    serialized,
    serializedChars: serialized.length
  };
}

function serializedRetentionWithinBudget(serializedChars) {
  return serializedChars <= MAX_COMPLETED_ESTIMATED_BYTES;
}

function readCompletedValue(key, entry) {
  try {
    const value = JSON.parse(entry.serialized);
    touch(entry);
    return value;
  } catch {
    completed.delete(key);
    return null;
  }
}

function waitForOwnTimer(ms) {
  return new Promise(resolve => globalThis.setTimeout(resolve, ms));
}

async function acquireExecutionSlot() {
  if (activeExecutions < MAX_CONCURRENT_EXECUTIONS) {
    activeExecutions += 1;
    peakActiveExecutions = Math.max(peakActiveExecutions, activeExecutions);
    return false;
  }

  queuedExecutions += 1;
  peakQueuedExecutions = Math.max(peakQueuedExecutions, queuedExecutions);
  try {
    while (activeExecutions >= MAX_CONCURRENT_EXECUTIONS) {
      await waitForOwnTimer(EXECUTION_SLOT_POLL_MS);
    }
    activeExecutions += 1;
    peakActiveExecutions = Math.max(peakActiveExecutions, activeExecutions);
    return true;
  } finally {
    queuedExecutions = Math.max(0, queuedExecutions - 1);
  }
}

function releaseExecutionSlot() {
  activeExecutions = Math.max(0, activeExecutions - 1);
}

export async function executeMajorBandsQueryOnce(identity, executor) {
  const key = String(identity || '');
  if (!key) throw new Error('major-bands query execution identity required');
  if (typeof executor !== 'function') throw new Error('major-bands query executor required');

  pruneExpired();
  const cached = completed.get(key);
  if (cached) {
    const value = readCompletedValue(key, cached);
    if (value) {
      return {
        value,
        cacheStatus: 'serialized-compact-hit',
        joinedInFlight: false,
        waitedForExecutionSlot: false
      };
    }
  }

  const pending = inFlight.get(key);
  if (pending) {
    return {
      value: await pending,
      cacheStatus: 'singleflight-hit',
      joinedInFlight: true,
      waitedForExecutionSlot: false
    };
  }

  completed.clear();
  let waitedForExecutionSlot = false;
  let promise;
  promise = (async () => {
    waitedForExecutionSlot = await acquireExecutionSlot();
    try {
      const value = await executor();
      const isolatedExecution = inFlight.size === 1 && inFlight.get(key) === promise;
      if (
        isolatedExecution
        && COMPLETED_QUERY_RETENTION_ENABLED
        && shouldRetainCompleted(key, value)
        && declaredRetentionWithinBudget(value)
      ) {
        const retention = serializeRetainedValue(value);
        if (serializedRetentionWithinBudget(retention.serializedChars)) {
          const stats = retentionStats(value);
          completed.clear();
          const entry = {
            serialized: retention.serialized,
            recordCount: stats.recordCount,
            estimatedBytes: retention.serializedChars,
            expiresAt: Date.now() + COMPLETED_TTL_MS,
            lastAccess: 0
          };
          touch(entry);
          completed.set(key, entry);
        }
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
      joinedInFlight: false,
      waitedForExecutionSlot
    };
  } finally {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  }
}

export function majorBandsQueryExecutionCacheState() {
  pruneExpired();
  return Object.freeze({
    version: MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
    mode: MAJOR_BANDS_QUERY_EXECUTION_CACHE_MODE,
    executionGateVersion: MAJOR_BANDS_QUERY_EXECUTION_GATE_VERSION,
    executionGateMode: MAJOR_BANDS_QUERY_EXECUTION_GATE_MODE,
    executionSlotPollMs: EXECUTION_SLOT_POLL_MS,
    inFlight: inFlight.size,
    activeExecutions,
    queuedExecutions,
    peakActiveExecutions,
    peakQueuedExecutions,
    maxConcurrentExecutions: MAX_CONCURRENT_EXECUTIONS,
    completed: completed.size,
    completedRecords: completedRecordCount(),
    completedEstimatedBytes: completedEstimatedBytes(),
    completedRetentionEnabled: COMPLETED_QUERY_RETENTION_ENABLED,
    explicitRetentionOptIn: true,
    requestScopedSecondUseRetention: true,
    recentExecutionIdentities: recentIdentities.size,
    maxRecentIdentities: MAX_RECENT_IDENTITIES,
    maxCompletedQueries: MAX_COMPLETED_QUERIES,
    maxCompletedRecords: MAX_COMPLETED_RECORDS,
    maxCompletedEstimatedBytes: MAX_COMPLETED_ESTIMATED_BYTES,
    completedTtlMs: COMPLETED_TTL_MS,
    serializedSnapshotOnly: true,
    preflightBudgetBeforeSerialization: true,
    crossRequestSemaphore: true,
    boundedDistinctExecutions: true,
    requestOwnedTimerWait: true,
    crossRequestResolverQueue: false,
    keys: Object.freeze([...completed.keys()])
  });
}

export function clearMajorBandsQueryExecutionCacheForTest() {
  inFlight.clear();
  completed.clear();
  recentIdentities.clear();
  activeExecutions = 0;
  queuedExecutions = 0;
  peakActiveExecutions = 0;
  peakQueuedExecutions = 0;
  accessClock = 0;
}
