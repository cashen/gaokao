export const MAJOR_BANDS_BUCKET_CACHE_VERSION = 'major-bands-bucket-cache-v3972_5';
export const MAJOR_BANDS_BUCKET_CACHE_TTL_SECONDS = 300;

function resolveDefaultCache() {
  try {
    return globalThis.caches?.default || null;
  } catch {
    return null;
  }
}

function sortedEntries(searchParams) {
  return [...searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    const keyOrder = leftKey.localeCompare(rightKey, 'en');
    return keyOrder || leftValue.localeCompare(rightValue, 'zh-CN');
  });
}

export function buildMajorBandsBucketCacheKey(endpoint) {
  const source = endpoint instanceof URL ? endpoint : new URL(String(endpoint));
  const keyUrl = new URL('/__gaokao-internal-cache/major-bands-bucket', source.origin);
  keyUrl.searchParams.set('cacheVersion', MAJOR_BANDS_BUCKET_CACHE_VERSION);
  for (const [key, value] of sortedEntries(source.searchParams)) {
    if (['stress', 'requestToken', 'bucketAttempt'].includes(key)) continue;
    keyUrl.searchParams.append(key, value);
  }
  return new Request(keyUrl.toString(), { method: 'GET' });
}

export async function readMajorBandsBucketCache(endpoint) {
  const cache = resolveDefaultCache();
  if (!cache) return { status: 'unavailable', text: '', cacheKey: null };
  const cacheKey = buildMajorBandsBucketCacheKey(endpoint);
  try {
    const response = await cache.match(cacheKey);
    if (!response) return { status: 'miss', text: '', cacheKey };
    return { status: 'hit', text: await response.text(), cacheKey };
  } catch {
    return { status: 'unavailable', text: '', cacheKey: null };
  }
}

export async function writeMajorBandsBucketCache(cacheKey, text) {
  const cache = resolveDefaultCache();
  if (!cache || !cacheKey || !text) return false;
  try {
    await cache.put(cacheKey, new Response(text, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${MAJOR_BANDS_BUCKET_CACHE_TTL_SECONDS}`,
        'x-gaokao-major-bands-bucket-cache': MAJOR_BANDS_BUCKET_CACHE_VERSION
      }
    }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteMajorBandsBucketCache(cacheKey) {
  const cache = resolveDefaultCache();
  if (!cache || !cacheKey) return false;
  try {
    return await cache.delete(cacheKey);
  } catch {
    return false;
  }
}
