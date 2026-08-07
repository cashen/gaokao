export const MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION = 'major-bands-all-bands-page-cache-release-on-band-switch-v3990_1';

const MAX_COMPLETED_PAGES = 1;
const MAX_SERIALIZED_CHARS = 500_000;
const COMPLETED_TTL_MS = 15_000;
const inFlight = new Map();
let completed = null;
let releasedOnRequestedBandSwitch = 0;

function responseHeaders(response) {
  return Object.fromEntries(response.headers.entries());
}

function readCompleted(key, now = Date.now()) {
  if (!completed || completed.expiresAt <= now) {
    completed = null;
    return null;
  }
  return completed.key === key ? completed : null;
}

async function normalizeExecutionValue(value) {
  if (value instanceof Response) {
    return {
      body: await value.text(),
      status: value.status,
      headers: responseHeaders(value),
      cacheable: false
    };
  }
  const body = JSON.stringify(value);
  return {
    body,
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    cacheable: body.length <= MAX_SERIALIZED_CHARS
  };
}

export async function executeMajorBandsAllBandsPageOnce(identity, executor) {
  const key = String(identity || '');
  if (!key) throw new Error('major-bands all-band page identity required');
  if (typeof executor !== 'function') throw new Error('major-bands all-band page executor required');

  const cached = readCompleted(key);
  if (cached) {
    return {
      body: cached.body,
      status: cached.status,
      headers: cached.headers,
      cacheStatus: 'serialized-page-hit',
      joinedInFlight: false
    };
  }

  const pending = inFlight.get(key);
  if (pending) {
    const result = await pending;
    return {
      ...result,
      cacheStatus: 'page-singleflight-hit',
      joinedInFlight: true
    };
  }

  // One final page is retained at most. Release a different page before any
  // new all-band execution starts so completed pages never accumulate.
  completed = null;
  let promise;
  promise = (async () => {
    const normalized = await normalizeExecutionValue(await executor());
    if (normalized.cacheable && inFlight.size === 1 && inFlight.get(key) === promise) {
      completed = {
        key,
        body: normalized.body,
        status: normalized.status,
        headers: Object.freeze({ ...normalized.headers }),
        expiresAt: Date.now() + COMPLETED_TTL_MS
      };
    }
    return {
      body: normalized.body,
      status: normalized.status,
      headers: normalized.headers
    };
  })();
  inFlight.set(key, promise);
  try {
    return {
      ...await promise,
      cacheStatus: 'miss',
      joinedInFlight: false
    };
  } finally {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  }
}

export function releaseMajorBandsAllBandsCompletedPage() {
  const released = Boolean(completed);
  completed = null;
  if (released) releasedOnRequestedBandSwitch += 1;
  return released;
}

export function majorBandsAllBandsPageCacheState() {
  readCompleted(completed?.key || '');
  return Object.freeze({
    version: MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION,
    inFlight: inFlight.size,
    completed: completed ? 1 : 0,
    completedChars: completed?.body?.length || 0,
    maxCompletedPages: MAX_COMPLETED_PAGES,
    maxSerializedChars: MAX_SERIALIZED_CHARS,
    completedTtlMs: COMPLETED_TTL_MS,
    serializedFinalPageOnly: true,
    releaseOnRequestedBandSwitch: true,
    releaseMode: 'release-completed-on-requested-band-switch-v3990_1',
    releasedOnRequestedBandSwitch,
    retainsDecodedBuckets: false,
    retainsFullBandSnapshots: false
  });
}

export function clearMajorBandsAllBandsPageCacheForTest() {
  inFlight.clear();
  completed = null;
  releasedOnRequestedBandSwitch = 0;
}
