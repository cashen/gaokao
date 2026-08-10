from pathlib import Path

api_path = Path('functions/api/major-bands.js')
verify_path = Path('tools/verify-major-bands-preview-concurrency-v3990_1.mjs')
api = api_path.read_text(encoding='utf-8')
verify = verify_path.read_text(encoding='utf-8')

# 1) Versioned requested-band final-response edge cache.
anchor = "const REQUESTED_BAND_ORDER_EDGE_CACHE_TTL_SECONDS = 180;"
insert = """const REQUESTED_BAND_ORDER_EDGE_CACHE_TTL_SECONDS = 180;
export const MAJOR_BANDS_REQUESTED_BAND_RESPONSE_EDGE_CACHE_VERSION = 'major-bands-requested-band-response-edge-cache-canonical-v3990_1';
const REQUESTED_BAND_RESPONSE_EDGE_CACHE_TTL_SECONDS = 60;"""
if api.count(anchor) != 1:
    raise SystemExit(f'edge cache constant anchor count {api.count(anchor)}')
api = api.replace(anchor, insert, 1)

anchor = """function allBandsEdgeCacheHandle() {
  const cache = globalThis.caches?.default;
  return cache && typeof cache.match === 'function' && typeof cache.put === 'function' ? cache : null;
}
"""
addition = anchor + """
function requestedBandResponseEdgeCacheRequest(sourceUrl) {
  const url = new URL(sourceUrl);
  url.searchParams.delete('stress');
  url.searchParams.delete('deploy');
  url.searchParams.set('__requestedBandResponseEdgeCache', MAJOR_BANDS_REQUESTED_BAND_RESPONSE_EDGE_CACHE_VERSION);
  url.searchParams.sort();
  return new Request(url.toString(), { method: 'GET' });
}

function responseWithRequestedBandResponseEdgeCacheStatus(response, status) {
  const headers = new Headers(response.headers);
  headers.set('x-gaokao-requested-band-response-edge-cache', status);
  headers.set('x-gaokao-requested-band-response-edge-cache-version', MAJOR_BANDS_REQUESTED_BAND_RESPONSE_EDGE_CACHE_VERSION);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function readRequestedBandResponseEdgeCache(cache, request) {
  try {
    return await cache.match(request);
  } catch {
    return null;
  }
}

async function writeRequestedBandResponseEdgeCache(cache, request, response) {
  if (response.status !== 200) return false;
  try {
    const cached = responseWithRequestedBandResponseEdgeCacheStatus(response.clone(), 'stored');
    const headers = new Headers(cached.headers);
    headers.set('cache-control', `public, max-age=0, s-maxage=${REQUESTED_BAND_RESPONSE_EDGE_CACHE_TTL_SECONDS}, stale-while-revalidate=120`);
    await cache.put(request, new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers
    }));
    return true;
  } catch {
    return false;
  }
}
"""
if api.count(anchor) != 1:
    raise SystemExit(f'edge cache handle anchor count {api.count(anchor)}')
api = api.replace(anchor, addition, 1)

# 2) Read canonical response cache before any requested-band heavy work.
anchor = """    if (!Number.isFinite(candidateScore) || candidateScore < 1 || candidateScore > 750) {
      return json({ ok: false, message: '参考分数格式不正确。' }, 400);
    }

    const allBandsPageCacheReleasedBeforeBandQuery = requestedBand
"""
replacement = """    if (!Number.isFinite(candidateScore) || candidateScore < 1 || candidateScore > 750) {
      return json({ ok: false, message: '参考分数格式不正确。' }, 400);
    }

    const requestedBandResponseEdgeCache = requestedBand ? allBandsEdgeCacheHandle() : null;
    const requestedBandResponseEdgeCacheRequest = requestedBandResponseEdgeCache
      ? requestedBandResponseEdgeCacheRequest(url)
      : null;
    if (requestedBandResponseEdgeCache && requestedBandResponseEdgeCacheRequest) {
      const cached = await readRequestedBandResponseEdgeCache(
        requestedBandResponseEdgeCache,
        requestedBandResponseEdgeCacheRequest
      );
      if (cached) return responseWithRequestedBandResponseEdgeCacheStatus(cached, 'hit');
    }

    const allBandsPageCacheReleasedBeforeBandQuery = requestedBand
"""
if api.count(anchor) != 1:
    raise SystemExit(f'onRequest cache read anchor count {api.count(anchor)}')
api = api.replace(anchor, replacement, 1)

# Avoid shadowing function name with local variable.
api = api.replace(
    "const requestedBandResponseEdgeCacheRequest = requestedBandResponseEdgeCache\n      ? requestedBandResponseEdgeCacheRequest(url)\n      : null;",
    "const requestedBandResponseCacheKey = requestedBandResponseEdgeCache\n      ? requestedBandResponseEdgeCacheRequest(url)\n      : null;"
)
api = api.replace(
    "if (requestedBandResponseEdgeCache && requestedBandResponseEdgeCacheRequest) {\n      const cached = await readRequestedBandResponseEdgeCache(\n        requestedBandResponseEdgeCache,\n        requestedBandResponseEdgeCacheRequest\n      );",
    "if (requestedBandResponseEdgeCache && requestedBandResponseCacheKey) {\n      const cached = await readRequestedBandResponseEdgeCache(\n        requestedBandResponseEdgeCache,\n        requestedBandResponseCacheKey\n      );"
)

# 3) Wrap only the final successful requested-band response, write 200 only.
needle = "    return json({\n      ok: true,\n      meta: {"
pos = api.rfind(needle)
if pos < 0:
    raise SystemExit('final requested-band response anchor missing')
api = api[:pos] + api[pos:].replace("    return json({\n      ok: true,\n      meta: {", "    const response = json({\n      ok: true,\n      meta: {", 1)

anchor = """        mode: 'single-worker-canonical-rank-query-stable-snapshot-paged'
      }
    });
  } catch (error) {
"""
replacement = """        mode: 'single-worker-canonical-rank-query-stable-snapshot-paged'
      }
    });
    if (requestedBandResponseEdgeCache && requestedBandResponseCacheKey) {
      const stored = await writeRequestedBandResponseEdgeCache(
        requestedBandResponseEdgeCache,
        requestedBandResponseCacheKey,
        response
      );
      return responseWithRequestedBandResponseEdgeCacheStatus(response, stored ? 'stored' : 'write-failed');
    }
    return responseWithRequestedBandResponseEdgeCacheStatus(response, 'unavailable');
  } catch (error) {
"""
if api.count(anchor) != 1:
    raise SystemExit(f'final response cache write anchor count {api.count(anchor)}')
api = api.replace(anchor, replacement, 1)
api_path.write_text(api, encoding='utf-8')

# 4) Permanent live verifier contract: header/version, canonical cache hits on HTTPS.
anchor = "const expectedOrderEdgeCacheVersion = 'major-bands-requested-band-order-edge-cache-canonical-v3990_1';"
replacement = anchor + "\nconst expectedRequestedBandResponseEdgeCacheVersion = 'major-bands-requested-band-response-edge-cache-canonical-v3990_1';"
if verify.count(anchor) != 1:
    raise SystemExit(f'verifier version anchor count {verify.count(anchor)}')
verify = verify.replace(anchor, replacement, 1)

anchor = """    allBandsEdgeCacheVersion: response.headers.get('x-gaokao-all-bands-edge-cache-version') || '',
    payload,
"""
replacement = """    allBandsEdgeCacheVersion: response.headers.get('x-gaokao-all-bands-edge-cache-version') || '',
    requestedBandResponseEdgeCacheStatus: response.headers.get('x-gaokao-requested-band-response-edge-cache') || '',
    requestedBandResponseEdgeCacheVersion: response.headers.get('x-gaokao-requested-band-response-edge-cache-version') || '',
    payload,
"""
if verify.count(anchor) != 1:
    raise SystemExit(f'verifier response header anchor count {verify.count(anchor)}')
verify = verify.replace(anchor, replacement, 1)

anchor = """  assert.equal(result.payload?.source?.bucketWorkerTransferChars, 0, `${result.scenario}: bucket transfer`);

  if (result.allBands) {
"""
replacement = """  assert.equal(result.payload?.source?.bucketWorkerTransferChars, 0, `${result.scenario}: bucket transfer`);

  if (!result.allBands) {
    assert.equal(result.requestedBandResponseEdgeCacheVersion, expectedRequestedBandResponseEdgeCacheVersion, `${result.scenario}: requested-band response edge cache version`);
    assert.ok(['hit', 'stored', 'write-failed', 'unavailable'].includes(result.requestedBandResponseEdgeCacheStatus), `${result.scenario}: requested-band response edge cache status`);
  }

  if (result.allBands) {
"""
if verify.count(anchor) != 1:
    raise SystemExit(f'verifier validate anchor count {verify.count(anchor)}')
verify = verify.replace(anchor, replacement, 1)

anchor = """const pagination = [];
for (const scenario of paginationScenarios) pagination.push(await exhaustPagination(scenario));
if (base.startsWith('https://')) {
"""
replacement = """const pagination = [];
for (const scenario of paginationScenarios) pagination.push(await exhaustPagination(scenario));
if (base.startsWith('https://')) {
  const responseEdgeHits = concurrencyModes
    .flatMap(mode => concurrency[mode])
    .reduce((sum, item) => sum + Number(item.responseEdgeHits || 0), 0);
  assert.ok(responseEdgeHits > 0, 'requested-band production response edge cache did not record any hit');
"""
if verify.count(anchor) != 1:
    raise SystemExit(f'verifier https anchor count {verify.count(anchor)}')
verify = verify.replace(anchor, replacement, 1)

anchor = """      status5xx: results.filter(result => result.status >= 500).length,
      cloudflare1102: results.filter(result => result.cloudflare1102).length
"""
replacement = """      status5xx: results.filter(result => result.status >= 500).length,
      cloudflare1102: results.filter(result => result.cloudflare1102).length,
      responseEdgeHits: results.filter(result => result.requestedBandResponseEdgeCacheStatus === 'hit').length,
      responseEdgeStores: results.filter(result => result.requestedBandResponseEdgeCacheStatus === 'stored').length
"""
if verify.count(anchor) != 1:
    raise SystemExit(f'verifier concurrency evidence anchor count {verify.count(anchor)}')
verify = verify.replace(anchor, replacement, 1)

verify_path.write_text(verify, encoding='utf-8')
print('patched canonical requested-band final-response edge cache and live verifier')
