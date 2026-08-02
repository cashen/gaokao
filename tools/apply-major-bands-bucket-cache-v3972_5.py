from pathlib import Path


def replace_once(text, before, after, label):
    if before not in text:
        raise RuntimeError(f'missing patch anchor: {label}')
    return text.replace(before, after, 1)


# Parent API owns the versioned internal cache. Only validated successful child
# responses enter the cache; retry and telemetry parameters never enter keys.
path = Path('functions/api/major-bands.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    """} from '../_lib/major-bands-bucket-orchestrator.v3972_5.js';
import {
  MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
""",
    """} from '../_lib/major-bands-bucket-orchestrator.v3972_5.js';
import {
  MAJOR_BANDS_BUCKET_CACHE_VERSION,
  readMajorBandsBucketCache,
  writeMajorBandsBucketCache,
  deleteMajorBandsBucketCache
} from '../_lib/major-bands-bucket-cache.v3972_5.js';
import {
  MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
""",
    'bucket cache import'
)
start = text.find('async function fetchBucketWorker(context, bucket, options) {')
end = text.find('\nexport async function onRequest(context) {', start)
if start < 0 or end < 0:
    raise RuntimeError('missing fetchBucketWorker block')
replacement = """function parseBucketPayload(response, text, bucketFile) {
  assertBucketResponse(response, text, bucketFile);
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(`分数桶 Worker JSON 解析失败：${bucketFile}。${error?.message || String(error)}`);
  }
  if (
    !payload?.ok
    || payload?.contract !== BUCKET_CONTRACT
    || payload?.candidateTransferVersion !== MAJOR_BANDS_BUCKET_TRANSFER_VERSION
    || payload?.bucket?.file !== bucketFile
  ) {
    throw new Error(`分数桶 Worker 合同不匹配：${bucketFile}`);
  }
  for (const key of ['upper', 'near', 'steady']) {
    for (const candidate of payload.grouped?.[key]?.candidates || []) {
      assertCompactMajorBandsBucketCandidate(candidate);
    }
  }
  return payload;
}

async function fetchBucketWorker(context, bucket, options) {
  const endpoint = new URL('/api/major-bands-bucket', context.request.url);
  endpoint.searchParams.set('candidateScore', String(options.candidateScore));
  endpoint.searchParams.set('rangePreset', options.rangePreset);
  endpoint.searchParams.set('bucketFile', bucket.file);
  endpoint.searchParams.set('region', options.region);
  endpoint.searchParams.set('majorKeyword', options.majorKeyword);
  endpoint.searchParams.set('bottomLineMode', options.bottomLineMode);
  endpoint.searchParams.set('specialProjectMode', options.specialProjectMode);
  endpoint.searchParams.set('schoolFilter', options.schoolFilter ? '1' : '0');
  endpoint.searchParams.set('maxCandidates', String(options.maxCandidates));
  const acceptedSchoolNames = [...options.acceptedSchoolNames]
    .sort((left, right) => String(left).localeCompare(String(right), 'zh-CN'));
  for (const name of acceptedSchoolNames.slice(0, 32)) endpoint.searchParams.append('schoolName', name);

  const cached = await readMajorBandsBucketCache(endpoint);
  if (cached.status === 'hit') {
    try {
      const payload = parseBucketPayload({ status: 200, ok: true }, cached.text, bucket.file);
      payload.transportChars = cached.text.length;
      payload.bucketCacheStatus = 'hit';
      payload.bucketCacheVersion = MAJOR_BANDS_BUCKET_CACHE_VERSION;
      return payload;
    } catch {
      await deleteMajorBandsBucketCache(cached.cacheKey);
    }
  }

  let response;
  try {
    response = await fetch(endpoint.toString(), {
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        'x-gaokao-major-bands-bucket': BUCKET_CONTRACT
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
  } catch (error) {
    throw new MajorBandsBucketWorkerError(`分数桶 Worker 网络失败：${bucket.file}`, {
      status: 0,
      retryable: true,
      bucketFile: bucket.file,
      cause: error
    });
  }

  const responseText = await response.text();
  const payload = parseBucketPayload(response, responseText, bucket.file);
  const cacheStatus = cached.status === 'unavailable' ? 'unavailable' : 'miss';
  if (cacheStatus === 'miss') await writeMajorBandsBucketCache(cached.cacheKey, responseText);
  payload.transportChars = responseText.length;
  payload.bucketCacheStatus = cacheStatus;
  payload.bucketCacheVersion = MAJOR_BANDS_BUCKET_CACHE_VERSION;
  return payload;
}
"""
text = text[:start] + replacement + text[end:]
text = replace_once(
    text,
    """    const maxCandidates = Math.max(48, Math.min(240, pageOffset + pageLimit + 64));
    const requestToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const bucketExecution = await runMajorBandsBucketWorkers(
      selected.buckets,
      (bucket, execution) => fetchBucketWorker(context, bucket, {
""",
    """    const maxCandidates = Math.max(48, Math.min(240, pageOffset + pageLimit + 64));
    const bucketExecution = await runMajorBandsBucketWorkers(
      selected.buckets,
      bucket => fetchBucketWorker(context, bucket, {
""",
    'remove request token and retry key inputs'
)
text = replace_once(
    text,
    """        acceptedSchoolNames: schoolNames,
        maxCandidates,
        requestToken,
        bucketAttempt: execution.attempt
      }),
""",
    """        acceptedSchoolNames: schoolNames,
        maxCandidates
      }),
""",
    'remove attempt-specific child inputs'
)
text = replace_once(
    text,
    """        bucketWorkerOrchestrationVersion: bucketExecution.stats.version,
        bucketCandidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
""",
    """        bucketWorkerOrchestrationVersion: bucketExecution.stats.version,
        bucketWorkerCacheVersion: MAJOR_BANDS_BUCKET_CACHE_VERSION,
        bucketWorkerCacheHits: bucketResults.filter(result => result.bucketCacheStatus === 'hit').length,
        bucketWorkerCacheMisses: bucketResults.filter(result => result.bucketCacheStatus === 'miss').length,
        bucketWorkerCacheUnavailable: bucketResults.filter(result => result.bucketCacheStatus === 'unavailable').length,
        bucketCandidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
""",
    'bucket cache evidence'
)
path.write_text(text, encoding='utf-8')

# Release center declares cache version, implementation and parent owner.
path = Path('shared/resources/release/current-release.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  majorBandsRetryPolicyVersion: 'major-bands-transient-retry-v3972_5',\n",
    "  majorBandsRetryPolicyVersion: 'major-bands-transient-retry-v3972_5',\n"
    "  majorBandsBucketCacheVersion: 'major-bands-bucket-cache-v3972_5',\n",
    'release cache version'
)
text = replace_once(
    text,
    "    majorBandsOrchestrator: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',\n",
    "    majorBandsOrchestrator: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',\n"
    "    majorBandsBucketCache: '/functions/_lib/major-bands-bucket-cache.v3972_5.js',\n"
    "    majorBandsBucketCacheOwner: '/functions/api/major-bands.js',\n",
    'release cache owner'
)
path.write_text(text, encoding='utf-8')

# Global execution contract describes deterministic key ownership and safety.
path = Path('shared/governance/resource-execution-contract.v3972_5.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    """    transientRetryPolicyVersion: 'major-bands-transient-retry-v3972_5',
    staticProvider: '/functions/_lib/major-bands-static-provider.js',
""",
    """    transientRetryPolicyVersion: 'major-bands-transient-retry-v3972_5',
    bucketCacheVersion: 'major-bands-bucket-cache-v3972_5',
    bucketCacheOwner: '/functions/api/major-bands.js',
    bucketCacheImplementation: '/functions/_lib/major-bands-bucket-cache.v3972_5.js',
    bucketCacheTtlSeconds: 300,
    bucketCacheKeyScope: 'all-business-inputs-plus-cache-version',
    bucketCacheKeyExcludes: 'stress,requestToken,bucketAttempt',
    bucketCacheSuccessOnly: true,
    staticProvider: '/functions/_lib/major-bands-static-provider.js',
""",
    'execution cache contract'
)
text = replace_once(
    text,
    "      '/functions/_lib/major-bands-bucket-engine.js',\n",
    "      '/functions/_lib/major-bands-bucket-engine.js',\n"
    "      '/functions/_lib/major-bands-bucket-cache.v3972_5.js',\n",
    'execution cache adapter'
)
path.write_text(text, encoding='utf-8')

# Skill records the reusable immutable-result cache rule.
path = Path('docs/skills/unified-site-release/SKILL.md')
text = path.read_text(encoding='utf-8')
anchor = "- Aggregate child-Worker transfer size requires an explicit sustained-load budget. Passing the browser response budget does not permit a multi-megabyte internal transfer.\n"
addition = (
    "- Deterministic child-Worker results derived from immutable static packages require a versioned internal cache owned by the parent orchestrator. The key must include every business input and the cache version, while excluding telemetry and retry-attempt fields.\n"
    "- Only successfully parsed and contract-validated child results may enter the internal cache. HTTP errors, Cloudflare resource errors, invalid JSON and contract mismatches must never be cached.\n"
)
if addition not in text:
    text = replace_once(text, anchor, anchor + addition, 'skill internal cache rule')
path.write_text(text, encoding='utf-8')

# Audit verifies cache helper, key exclusions, parent use and success-only write.
path = Path('tools/audit-major-bands-bounded-fanout-v3972_5.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "import { MAJOR_BANDS_MATERIALIZATION_VERSION } from '../functions/_lib/major-bands-static-provider.js';\n",
    "import { MAJOR_BANDS_MATERIALIZATION_VERSION } from '../functions/_lib/major-bands-static-provider.js';\n"
    "import {\n"
    "  MAJOR_BANDS_BUCKET_CACHE_VERSION,\n"
    "  MAJOR_BANDS_BUCKET_CACHE_TTL_SECONDS,\n"
    "  buildMajorBandsBucketCacheKey\n"
    "} from '../functions/_lib/major-bands-bucket-cache.v3972_5.js';\n",
    'audit cache import'
)
insert_anchor = "const tracedCandidate = {\n"
cache_test = """const cacheEndpoint = new URL('https://example.test/api/major-bands-bucket');
cacheEndpoint.searchParams.set('candidateScore', '579');
cacheEndpoint.searchParams.set('bucketFile', '/ln-rank/data/major-bands-static-v3972_2/buckets/score_575_579.json');
cacheEndpoint.searchParams.append('schoolName', '乙大学');
cacheEndpoint.searchParams.append('schoolName', '甲大学');
cacheEndpoint.searchParams.set('stress', 'ignored');
cacheEndpoint.searchParams.set('requestToken', 'ignored');
cacheEndpoint.searchParams.set('bucketAttempt', '3');
const cacheKeyUrl = new URL(buildMajorBandsBucketCacheKey(cacheEndpoint).url);
assert.equal(cacheKeyUrl.pathname, '/__gaokao-internal-cache/major-bands-bucket');
assert.equal(cacheKeyUrl.searchParams.get('cacheVersion'), MAJOR_BANDS_BUCKET_CACHE_VERSION);
assert.equal(cacheKeyUrl.searchParams.has('stress'), false);
assert.equal(cacheKeyUrl.searchParams.has('requestToken'), false);
assert.equal(cacheKeyUrl.searchParams.has('bucketAttempt'), false);
assert.deepEqual(cacheKeyUrl.searchParams.getAll('schoolName'), ['甲大学', '乙大学']);
assert.equal(MAJOR_BANDS_BUCKET_CACHE_TTL_SECONDS, 300);

"""
if cache_test not in text:
    text = replace_once(text, insert_anchor, cache_test + insert_anchor, 'audit cache key test')
text = replace_once(
    text,
    "const bucketEngine = fs.readFileSync('functions/_lib/major-bands-bucket-engine.js', 'utf8');\n",
    "const bucketEngine = fs.readFileSync('functions/_lib/major-bands-bucket-engine.js', 'utf8');\n"
    "const bucketCache = fs.readFileSync('functions/_lib/major-bands-bucket-cache.v3972_5.js', 'utf8');\n",
    'audit cache source'
)
text = replace_once(
    text,
    "assert.ok(source.includes('major-bands-bucket-transfer.v3972_5.js'));\n",
    "assert.ok(source.includes('major-bands-bucket-transfer.v3972_5.js'));\n"
    "assert.ok(source.includes('major-bands-bucket-cache.v3972_5.js'));\n"
    "assert.ok(source.includes('readMajorBandsBucketCache(endpoint)'));\n"
    "assert.ok(source.includes('writeMajorBandsBucketCache(cached.cacheKey, responseText)'));\n"
    "assert.ok(source.indexOf('parseBucketPayload(response, responseText, bucket.file)') < source.indexOf('writeMajorBandsBucketCache(cached.cacheKey, responseText)'));\n"
    "assert.ok(!source.includes(\"endpoint.searchParams.set('requestToken'\"));\n"
    "assert.ok(!source.includes(\"endpoint.searchParams.set('bucketAttempt'\"));\n"
    "assert.ok(source.includes('bucketWorkerCacheHits:'));\n"
    "assert.ok(source.includes('bucketWorkerCacheMisses:'));\n"
    "assert.ok(source.includes('bucketWorkerCacheUnavailable:'));\n"
    "assert.ok(bucketCache.includes(\"['stress', 'requestToken', 'bucketAttempt'].includes(key)\"));\n"
    "assert.ok(bucketCache.includes('await cache.put(cacheKey, new Response(text'));
"
    "assert.ok(bucketCache.includes('MAJOR_BANDS_BUCKET_CACHE_TTL_SECONDS = 300'));
",
    'audit cache ownership assertions'
)
text = replace_once(
    text,
    "  materializationVersion: MAJOR_BANDS_MATERIALIZATION_VERSION,\n",
    "  materializationVersion: MAJOR_BANDS_MATERIALIZATION_VERSION,\n"
    "  bucketCacheVersion: MAJOR_BANDS_BUCKET_CACHE_VERSION,\n"
    "  bucketCacheTtlSeconds: MAJOR_BANDS_BUCKET_CACHE_TTL_SECONDS,\n",
    'audit cache evidence output'
)
path.write_text(text, encoding='utf-8')

# Local verifier accepts unavailable Cache API but requires complete accounting.
path = Path('tools/verify-worker-budget-local-v3972.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "const SCHOOL_TRANSFER_BUDGET_CHARS = 300000;\n",
    "const SCHOOL_TRANSFER_BUDGET_CHARS = 300000;\n"
    "const EXPECTED_BUCKET_CACHE = 'major-bands-bucket-cache-v3972_5';\n",
    'local cache constant'
)
text = replace_once(
    text,
    """  if (Number(source.bucketWorkerMaxAttempts || 0) !== 3) {
    throw new Error(`${label} maxAttempts=${source.bucketWorkerMaxAttempts}`);
  }
""",
    """  if (Number(source.bucketWorkerMaxAttempts || 0) !== 3) {
    throw new Error(`${label} maxAttempts=${source.bucketWorkerMaxAttempts}`);
  }
  if (source.bucketWorkerCacheVersion !== EXPECTED_BUCKET_CACHE) {
    throw new Error(`${label} cacheVersion=${source.bucketWorkerCacheVersion || 'missing'}`);
  }
  const cacheHits = Number(source.bucketWorkerCacheHits || 0);
  const cacheMisses = Number(source.bucketWorkerCacheMisses || 0);
  const cacheUnavailable = Number(source.bucketWorkerCacheUnavailable || 0);
  const workerCount = Number(source.bucketWorkerCount || 0);
  if (![cacheHits, cacheMisses, cacheUnavailable].every(Number.isInteger)) {
    throw new Error(`${label} invalid cache accounting`);
  }
  if (cacheHits + cacheMisses + cacheUnavailable !== workerCount) {
    throw new Error(`${label} cache accounting=${cacheHits}/${cacheMisses}/${cacheUnavailable}/${workerCount}`);
  }
""",
    'local cache accounting'
)
text = replace_once(
    text,
    "  schoolRetries: Number(school.source.bucketWorkerRetries || 0)\n",
    "  schoolRetries: Number(school.source.bucketWorkerRetries || 0),\n"
    "  scoreCacheHits: Number(score.source.bucketWorkerCacheHits || 0),\n"
    "  scoreCacheMisses: Number(score.source.bucketWorkerCacheMisses || 0),\n"
    "  scoreCacheUnavailable: Number(score.source.bucketWorkerCacheUnavailable || 0),\n"
    "  schoolCacheHits: Number(school.source.bucketWorkerCacheHits || 0),\n"
    "  schoolCacheMisses: Number(school.source.bucketWorkerCacheMisses || 0),\n"
    "  schoolCacheUnavailable: Number(school.source.bucketWorkerCacheUnavailable || 0)\n",
    'local cache evidence output'
)
path.write_text(text, encoding='utf-8')

# Preview and production must use the Cache API and demonstrate warm hits.
path = Path('tools/verify-production-v3971.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "const EXPECTED_MAJOR_BANDS_RESPONSE = 'major-bands-response-compact-v3972_5';\n",
    "const EXPECTED_MAJOR_BANDS_RESPONSE = 'major-bands-response-compact-v3972_5';\n"
    "const EXPECTED_MAJOR_BANDS_BUCKET_CACHE = 'major-bands-bucket-cache-v3972_5';\n",
    'production cache constant'
)
text = replace_once(
    text,
    """  assert(Number(source.bucketWorkerMaxAttempts || 0) === 3, `${label} maxAttempts=${source.bucketWorkerMaxAttempts}`);
  const retries = Number(source.bucketWorkerRetries || 0);
""",
    """  assert(Number(source.bucketWorkerMaxAttempts || 0) === 3, `${label} maxAttempts=${source.bucketWorkerMaxAttempts}`);
  assert(source.bucketWorkerCacheVersion === EXPECTED_MAJOR_BANDS_BUCKET_CACHE, `${label} cacheVersion=${source.bucketWorkerCacheVersion || 'missing'}`);
  const cacheHits = Number(source.bucketWorkerCacheHits || 0);
  const cacheMisses = Number(source.bucketWorkerCacheMisses || 0);
  const cacheUnavailable = Number(source.bucketWorkerCacheUnavailable || 0);
  const workerCount = Number(source.bucketWorkerCount || 0);
  assert([cacheHits, cacheMisses, cacheUnavailable].every(Number.isInteger), `${label} invalid cache accounting`);
  assert(cacheHits + cacheMisses + cacheUnavailable === workerCount, `${label} cache accounting=${cacheHits}/${cacheMisses}/${cacheUnavailable}/${workerCount}`);
  assert(cacheUnavailable === 0, `${label} Cache API unavailable`);
  const retries = Number(source.bucketWorkerRetries || 0);
""",
    'production cache accounting'
)
text = replace_once(
    text,
    """  assert(schoolTransferChars > 0 && schoolTransferChars <= SCHOOL_TRANSFER_BUDGET_CHARS, `school transfer chars=${schoolTransferChars}`);
  return {
""",
    """  assert(schoolTransferChars > 0 && schoolTransferChars <= SCHOOL_TRANSFER_BUDGET_CHARS, `school transfer chars=${schoolTransferChars}`);
  const scoreCacheHits = Number(score.source.bucketWorkerCacheHits || 0);
  const schoolCacheHits = Number(school.source.bucketWorkerCacheHits || 0);
  if (cycle >= 2) {
    assert(scoreCacheHits > 0, `score cache did not warm by cycle ${cycle}`);
    assert(schoolCacheHits > 0, `school cache did not warm by cycle ${cycle}`);
  }
  return {
""",
    'production warm cache assertions'
)
text = replace_once(
    text,
    """    scoreRetries: Number(score.source.bucketWorkerRetries || 0),
    schoolRetries: Number(school.source.bucketWorkerRetries || 0)
""",
    """    scoreRetries: Number(score.source.bucketWorkerRetries || 0),
    schoolRetries: Number(school.source.bucketWorkerRetries || 0),
    scoreCacheHits,
    schoolCacheHits,
    scoreCacheMisses: Number(score.source.bucketWorkerCacheMisses || 0),
    schoolCacheMisses: Number(school.source.bucketWorkerCacheMisses || 0)
""",
    'production cache cycle evidence'
)
text = replace_once(
    text,
    """  totalSchoolRetries: cycles.reduce((sum, item) => sum + item.schoolRetries, 0),
  cloudflare1102Count: 0,
""",
    """  totalSchoolRetries: cycles.reduce((sum, item) => sum + item.schoolRetries, 0),
  totalScoreCacheHits: cycles.reduce((sum, item) => sum + item.scoreCacheHits, 0),
  totalSchoolCacheHits: cycles.reduce((sum, item) => sum + item.schoolCacheHits, 0),
  maximumScoreCacheMisses: Math.max(...cycles.map(item => item.scoreCacheMisses)),
  maximumSchoolCacheMisses: Math.max(...cycles.map(item => item.schoolCacheMisses)),
  cloudflare1102Count: 0,
""",
    'production cache summary'
)
path.write_text(text, encoding='utf-8')
