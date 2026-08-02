from pathlib import Path


def replace_once(text, before, after, label):
    if before not in text:
        raise RuntimeError(f'missing patch anchor: {label}')
    return text.replace(before, after, 1)


api_path = Path('functions/api/major-bands.js')
source = api_path.read_text(encoding='utf-8')
source = replace_once(
    source,
    "import { makeBands } from '../_lib/band-engine.js';\n",
    "import { makeBands } from '../_lib/band-engine.js';\n"
    "import {\n"
    "  MAJOR_BANDS_BUCKET_ORCHESTRATION,\n"
    "  MajorBandsBucketWorkerError,\n"
    "  isRetryableBucketWorkerFailure,\n"
    "  runMajorBandsBucketWorkers\n"
    "} from '../_lib/major-bands-bucket-orchestrator.v3972_5.js';\n",
    'orchestrator import'
)
source = replace_once(
    source,
    """function assertBucketResponse(response, text, bucketFile) {
  const lower = text.toLowerCase();
  if (response.status === 503 || lower.includes('worker exceeded resource limits') || lower.includes('<title>error 1102') || lower.includes('error code: 1102')) {
    throw new Error(`分数桶 Worker 资源超限：${bucketFile}，HTTP ${response.status}`);
  }
  if (!response.ok) throw new Error(`分数桶 Worker 失败：${bucketFile}，HTTP ${response.status}，${text.slice(0, 300)}`);
  if (lower.includes('<!doctype html') || lower.includes('<html')) {
    throw new Error(`分数桶 Worker 返回 HTML：${bucketFile}`);
  }
}
""",
    """function assertBucketResponse(response, text, bucketFile) {
  const lower = text.toLowerCase();
  const retryable = [429, 502, 503, 504].includes(response.status)
    || lower.includes('worker exceeded resource limits')
    || lower.includes('<title>error 1102')
    || lower.includes('error code: 1102')
    || lower.includes('http 503')
    || lower.includes('temporarily unavailable');
  if (retryable) {
    throw new MajorBandsBucketWorkerError(`分数桶 Worker 瞬态失败：${bucketFile}，HTTP ${response.status}`, {
      status: response.status,
      retryable: true,
      bucketFile
    });
  }
  if (!response.ok) {
    throw new MajorBandsBucketWorkerError(`分数桶 Worker 失败：${bucketFile}，HTTP ${response.status}，${text.slice(0, 300)}`, {
      status: response.status,
      retryable: false,
      bucketFile
    });
  }
  if (lower.includes('<!doctype html') || lower.includes('<html')) {
    throw new MajorBandsBucketWorkerError(`分数桶 Worker 返回 HTML：${bucketFile}`, {
      status: response.status,
      retryable: false,
      bucketFile
    });
  }
}
""",
    'bucket response classification'
)
source = replace_once(
    source,
    """  endpoint.searchParams.set('requestToken', options.requestToken);

  const response = await fetch(endpoint.toString(), {
    headers: {
      accept: 'application/json',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'x-gaokao-major-bands-bucket': BUCKET_CONTRACT
    },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
""",
    """  endpoint.searchParams.set('bucketAttempt', String(options.bucketAttempt || 1));
  endpoint.searchParams.set('requestToken', `${options.requestToken}-${options.bucketAttempt || 1}`);

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
""",
    'bucket network failure classification'
)
source = replace_once(
    source,
    """    const requestToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const bucketResults = await Promise.all(selected.buckets.map(bucket => fetchBucketWorker(context, bucket, {
      candidateScore,
      rangePreset,
      region: filters.region,
      majorKeyword: filters.majorKeyword,
      bottomLineMode: filters.bottomLineMode,
      specialProjectMode: filters.specialProjectMode,
      schoolFilter,
      acceptedSchoolNames: schoolNames,
      maxCandidates,
      requestToken
    })));
""",
    """    const requestToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const bucketExecution = await runMajorBandsBucketWorkers(
      selected.buckets,
      (bucket, execution) => fetchBucketWorker(context, bucket, {
        candidateScore,
        rangePreset,
        region: filters.region,
        majorKeyword: filters.majorKeyword,
        bottomLineMode: filters.bottomLineMode,
        specialProjectMode: filters.specialProjectMode,
        schoolFilter,
        acceptedSchoolNames: schoolNames,
        maxCandidates,
        requestToken,
        bucketAttempt: execution.attempt
      }),
      {
        concurrency: MAJOR_BANDS_BUCKET_ORCHESTRATION.maxConcurrency,
        maxAttempts: MAJOR_BANDS_BUCKET_ORCHESTRATION.maxAttempts,
        baseDelayMs: MAJOR_BANDS_BUCKET_ORCHESTRATION.baseDelayMs
      }
    );
    const bucketResults = bucketExecution.results;
""",
    'bounded bucket execution'
)
source = replace_once(
    source,
    """        bucketWorkerCount: bucketResults.length,
        bucketWorkerCandidateLimit: maxCandidates,
""",
    """        bucketWorkerCount: bucketResults.length,
        bucketWorkerCandidateLimit: maxCandidates,
        bucketWorkerOrchestrationVersion: bucketExecution.stats.version,
        bucketWorkerConcurrency: bucketExecution.stats.peakConcurrency,
        bucketWorkerRetries: bucketExecution.stats.retryCount,
        bucketWorkerMaxAttempts: bucketExecution.stats.maxAttempts,
""",
    'response orchestration diagnostics'
)
source = replace_once(
    source,
    """  } catch (error) {
    return json({
      ok: false,
      message: error?.message || String(error),
      userMessage: '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。',
      engineerHint: '请检查 major-bands-static-v3972_2 五分桶、单桶 Worker 合同和分布式查询编排。',
      hint: '可先打开 /api/major-bands-health?probe=1 检查底层数据健康；专业查询不再运行时扫描原始投档分片。'
    }, 500);
  }
}
""",
    """  } catch (error) {
    const retryable = isRetryableBucketWorkerFailure(error);
    return json({
      ok: false,
      retryable,
      message: error?.message || String(error),
      userMessage: retryable
        ? '专业数据遇到短暂拥堵，系统已自动重试但仍未恢复。请稍后再试。'
        : '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。',
      engineerHint: '请检查 major-bands-static-v3972_2 五分桶、有界子 Worker 编排和瞬态重试记录。',
      hint: '可先打开 /api/major-bands-health?probe=1 检查底层数据健康；专业查询不再运行时扫描原始投档分片。'
    }, isRetryableBucketWorkerFailure(error) ? 503 : 500);
  }
}
""",
    'top-level transient status'
)
api_path.write_text(source, encoding='utf-8')

release_path = Path('shared/resources/release/current-release.js')
release = release_path.read_text(encoding='utf-8')
release = replace_once(
    release,
    "  majorBandsVersion: 'major-bands-static-v3972_2',\n",
    "  majorBandsVersion: 'major-bands-static-v3972_2',\n"
    "  majorBandsOrchestrationVersion: 'major-bands-bounded-fanout-v3972_5',\n",
    'release orchestration version'
)
release = replace_once(
    release,
    "    rankTables: '/functions/_lib/rank-table-provider.js',\n",
    "    rankTables: '/functions/_lib/rank-table-provider.js',\n"
    "    majorBandsApi: '/functions/api/major-bands.js',\n"
    "    majorBandsBucketApi: '/functions/api/major-bands-bucket.js',\n"
    "    majorBandsOrchestrator: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',\n"
    "    majorBandsStaticProvider: '/functions/_lib/major-bands-static-provider.js',\n",
    'release major-bands owners'
)
release_path.write_text(release, encoding='utf-8')

execution_path = Path('shared/governance/resource-execution-contract.v3972_5.js')
execution = execution_path.read_text(encoding='utf-8')
execution = replace_once(
    execution,
    """  familyAction: entry({
""",
    """  majorBands: entry({
    owner: '/functions/api/major-bands.js',
    bucketOwner: '/functions/api/major-bands-bucket.js',
    orchestrator: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',
    staticProvider: '/functions/_lib/major-bands-static-provider.js',
    schemaVersion: 'major-bands-bounded-fanout-v3972_5',
    allowedConsumers: ['ln-rank', 'production-verification'],
    allowedAdapters: [
      '/functions/api/major-bands-bucket.js',
      '/functions/_lib/major-bands-static-provider.js',
      '/functions/_lib/major-bands-bucket-engine.js'
    ],
    forbiddenLiterals: ['Promise.all(selected.buckets.map'],
    validationTools: [
      '/tools/audit-major-bands-bounded-fanout-v3972_5.mjs',
      '/tools/verify-production-v3971.mjs',
      '/.github/workflows/verify-production-api-health-v3971.yml'
    ]
  }),
  familyAction: entry({
""",
    'resource execution owner'
)
execution_path.write_text(execution, encoding='utf-8')

skill_path = Path('docs/skills/unified-site-release/SKILL.md')
skill = skill_path.read_text(encoding='utf-8')
section = """
## Distributed Worker orchestration contract

A request must not fan out to every selected Worker with an unbounded `Promise.all`. Distributed reads require an explicit orchestration owner, a small concurrency ceiling, deterministic result ordering and a bounded retry policy for transient platform failures only.

- Static data packages remain immutable and are read through their declared provider.
- Retry only transient transport or platform resource failures such as HTTP 429/502/503/504 and Cloudflare 1102 markers.
- Contract, validation and data-integrity failures must fail immediately and must not be hidden by retries.
- The response and production evidence must expose peak child-Worker concurrency and retry count.
- Preview and production verification must keep sustained concurrent cycles; reducing stress cycles to make a release green is forbidden.

"""
anchor = '## Protected boundaries\n'
if section not in skill:
    skill = replace_once(skill, anchor, section + anchor, 'skill distributed worker section')
skill_path.write_text(skill, encoding='utf-8')
