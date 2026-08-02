from pathlib import Path


def replace_once(text, before, after, label):
    if before not in text:
        raise RuntimeError(f'missing patch anchor: {label}')
    return text.replace(before, after, 1)


path = Path('functions/_lib/major-bands-bucket-orchestrator.v3972_5.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  maxAttempts: 2,\n  baseDelayMs: 80\n",
    "  maxAttempts: 3,\n  baseDelayMs: 250\n",
    'orchestrator retry budget'
)
path.write_text(text, encoding='utf-8')

path = Path('tools/audit-major-bands-bounded-fanout-v3972_5.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  if (bucket.file === 'bucket-4' && context.attempt === 1) {\n",
    "  if (bucket.file === 'bucket-4' && context.attempt < 3) {\n",
    'third-attempt recovery fixture'
)
text = replace_once(
    text,
    "  maxAttempts: 2,\n  baseDelayMs: 1\n",
    "  maxAttempts: 3,\n  baseDelayMs: 1\n",
    'successful retry options'
)
text = replace_once(
    text,
    "assert.equal(MAJOR_BANDS_BUCKET_ORCHESTRATION.maxConcurrency, 1);\n",
    "assert.equal(MAJOR_BANDS_BUCKET_ORCHESTRATION.maxConcurrency, 1);\n"
    "assert.equal(MAJOR_BANDS_BUCKET_ORCHESTRATION.maxAttempts, 3);\n"
    "assert.equal(MAJOR_BANDS_BUCKET_ORCHESTRATION.baseDelayMs, 250);\n",
    'orchestration retry contract assertions'
)
text = replace_once(text, "assert.equal(successful.stats.retryCount, 1);\n", "assert.equal(successful.stats.retryCount, 2);\n", 'successful retry count')
text = replace_once(text, "assert.equal(calls, 11);\n", "assert.equal(calls, 12);\n", 'successful call count')
text = replace_once(text, "assert.equal(attempts.get('bucket-4'), 2);\n", "assert.equal(attempts.get('bucket-4'), 3);\n", 'successful attempt count')
text = replace_once(
    text,
    "  }, { maxAttempts: 2, baseDelayMs: 0 }),\n",
    "  }, { maxAttempts: 3, baseDelayMs: 0 }),\n",
    'exhausted retry options'
)
text = replace_once(text, "assert.equal(exhaustedCalls, 2);\n", "assert.equal(exhaustedCalls, 3);\n", 'exhausted call count')
path.write_text(text, encoding='utf-8')

path = Path('tools/verify-worker-budget-local-v3972.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  if (Number(source.bucketWorkerMaxAttempts || 0) !== 2) {\n",
    "  if (Number(source.bucketWorkerMaxAttempts || 0) !== 3) {\n",
    'local max attempts'
)
path.write_text(text, encoding='utf-8')

path = Path('tools/verify-production-v3971.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  assert(Number(source.bucketWorkerMaxAttempts || 0) === 2, `${label} maxAttempts=${source.bucketWorkerMaxAttempts}`);\n",
    "  assert(Number(source.bucketWorkerMaxAttempts || 0) === 3, `${label} maxAttempts=${source.bucketWorkerMaxAttempts}`);\n",
    'production max attempts'
)
path.write_text(text, encoding='utf-8')

path = Path('shared/resources/release/current-release.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  majorBandsOrchestrationVersion: 'major-bands-bounded-fanout-v3972_5',\n",
    "  majorBandsOrchestrationVersion: 'major-bands-bounded-fanout-v3972_5',\n"
    "  majorBandsRetryPolicyVersion: 'major-bands-transient-retry-v3972_5',\n",
    'release retry policy version'
)
path.write_text(text, encoding='utf-8')

path = Path('shared/governance/resource-execution-contract.v3972_5.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "    responseBudgetBytes: 260000,\n",
    "    responseBudgetBytes: 260000,\n"
    "    transientRetryMaxAttempts: 3,\n"
    "    transientRetryBackoffMs: '250,500',\n"
    "    transientRetryPolicyVersion: 'major-bands-transient-retry-v3972_5',\n",
    'execution retry contract'
)
path.write_text(text, encoding='utf-8')

path = Path('docs/skills/unified-site-release/SKILL.md')
text = path.read_text(encoding='utf-8')
anchor = "- Retry only transient transport or platform resource failures such as HTTP 429/502/503/504 and Cloudflare 1102 markers.\n"
addition = "- Transient retries must use bounded backoff. For the current major-bands owner the maximum is three total attempts with 250 ms and 500 ms delays; immediate repeated retries are forbidden.\n"
if addition not in text:
    text = replace_once(text, anchor, anchor + addition, 'skill bounded backoff rule')
path.write_text(text, encoding='utf-8')
