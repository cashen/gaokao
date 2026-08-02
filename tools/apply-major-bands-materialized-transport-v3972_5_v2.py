from pathlib import Path


def replace_once(text, before, after, label):
    if before not in text:
        raise RuntimeError(f'missing patch anchor: {label}')
    return text.replace(before, after, 1)


# Static materialization: explicit identity and idempotent parent consumption.
path = Path('functions/_lib/major-bands-static-provider.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "const MANIFEST_PATH = '/ln-rank/data/major-bands-static-v3972_2/manifest.json';\n",
    "export const MAJOR_BANDS_MATERIALIZATION_VERSION = 'major-bands-materialized-v3972_5';\n\n"
    "const MANIFEST_PATH = '/ln-rank/data/major-bands-static-v3972_2/manifest.json';\n",
    'materialization version'
)
text = replace_once(
    text,
    "export function materializeMajorBandsStaticRecord(record = {}) {\n  const historyCompare = buildHistoryScore(record);\n",
    "export function materializeMajorBandsStaticRecord(record = {}) {\n"
    "  if (record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION) return record;\n"
    "  const historyCompare = buildHistoryScore(record);\n",
    'idempotent materialization'
)
text = replace_once(
    text,
    """  return {
    ...expanded,
    historyEvidence,
    rank2026Source: historyEvidence.years[2026].rankSource,
""",
    """  return {
    ...expanded,
    majorBandsMaterializationVersion: MAJOR_BANDS_MATERIALIZATION_VERSION,
    historyEvidence,
    rank2026Source: historyEvidence.years[2026].rankSource,
""",
    'materialization marker'
)
path.write_text(text, encoding='utf-8')

# Parent API: accept child materialization once and compact browser transport.
path = Path('functions/api/major-bands.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    """import {
  selectMajorBandsStaticBuckets,
  materializeMajorBandsStaticRecord
} from '../_lib/major-bands-static-provider.js';
""",
    """import {
  MAJOR_BANDS_MATERIALIZATION_VERSION,
  selectMajorBandsStaticBuckets,
  materializeMajorBandsStaticRecord
} from '../_lib/major-bands-static-provider.js';
""",
    'materialization import'
)
text = replace_once(
    text,
    """import {
  MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
  assertCompactMajorBandsBucketCandidate
} from '../_lib/major-bands-bucket-transfer.v3972_5.js';
""",
    """import {
  MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
  MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
  assertCompactMajorBandsBucketCandidate,
  compactMajorBandsResponseRecord
} from '../_lib/major-bands-bucket-transfer.v3972_5.js';
""",
    'response transport import'
)
text = replace_once(
    text,
    """function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}
""",
    """function json(payload, status = 200) {
  const body = JSON.stringify(payload);
  return new Response(body, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-gaokao-response-transport': MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION
    }
  });
}
""",
    'single serialization and transport header'
)
text = replace_once(
    text,
    """function finalizeRecordForResponse(record) {
  const item = materializeMajorBandsStaticRecord(record);
  return { ...item, ...buildDisplayTags(item) };
}
""",
    """function finalizeRecordForResponse(record) {
  const item = record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION
    ? record
    : materializeMajorBandsStaticRecord(record);
  return { ...item, ...buildDisplayTags(item) };
}
""",
    'avoid duplicate parent materialization'
)
text = replace_once(
    text,
    """  }
  return payload;
}

export async function onRequest(context) {
""",
    """  }
  payload.transportChars = text.length;
  return payload;
}

export async function onRequest(context) {
""",
    'child transfer size evidence'
)
text = replace_once(
    text,
    """      const records = requestedBand && requestedBand !== key
        ? []
        : diversified.slice(offset, offset + pageLimit).map(finalizeRecordForResponse);
""",
    """      const records = requestedBand && requestedBand !== key
        ? []
        : diversified.slice(offset, offset + pageLimit).map(record => compactMajorBandsResponseRecord(
          finalizeRecordForResponse(record)
        ));
""",
    'compact final browser records'
)
text = replace_once(
    text,
    """        bucketWorkerCandidateLimit: maxCandidates,
        bucketWorkerOrchestrationVersion: bucketExecution.stats.version,
        bucketCandidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
""",
    """        bucketWorkerCandidateLimit: maxCandidates,
        bucketWorkerOrchestrationVersion: bucketExecution.stats.version,
        bucketCandidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
        responseTransportVersion: MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
        bucketWorkerTransferChars: bucketResults.reduce((sum, result) => sum + Number(result.transportChars || 0), 0),
""",
    'response and child transfer evidence'
)
path.write_text(text, encoding='utf-8')

# Current release owns materialization and browser transport.
path = Path('shared/resources/release/current-release.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  majorBandsBucketTransferVersion: 'major-bands-bucket-candidate-compact-v3972_5',\n",
    "  majorBandsBucketTransferVersion: 'major-bands-bucket-candidate-compact-v3972_5',\n"
    "  majorBandsMaterializationVersion: 'major-bands-materialized-v3972_5',\n"
    "  majorBandsResponseTransportVersion: 'major-bands-response-compact-v3972_5',\n",
    'release transport versions'
)
text = replace_once(
    text,
    "    majorBandsBucketTransfer: '/functions/_lib/major-bands-bucket-transfer.v3972_5.js',\n",
    "    majorBandsBucketTransfer: '/functions/_lib/major-bands-bucket-transfer.v3972_5.js',\n"
    "    majorBandsMaterialization: '/functions/_lib/major-bands-static-provider.js',\n"
    "    majorBandsResponseTransport: '/functions/_lib/major-bands-bucket-transfer.v3972_5.js',\n",
    'release transport owners'
)
path.write_text(text, encoding='utf-8')

# Global execution contract records one-time materialization and hard byte budget.
path = Path('shared/governance/resource-execution-contract.v3972_5.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "    transferVersion: 'major-bands-bucket-candidate-compact-v3972_5',\n",
    "    transferVersion: 'major-bands-bucket-candidate-compact-v3972_5',\n"
    "    materializationVersion: 'major-bands-materialized-v3972_5',\n"
    "    responseTransportVersion: 'major-bands-response-compact-v3972_5',\n"
    "    responseBudgetBytes: 260000,\n",
    'execution response budget'
)
path.write_text(text, encoding='utf-8')

# Release skill: preserve the resource ownership rule for later generations.
path = Path('docs/skills/unified-site-release/SKILL.md')
text = path.read_text(encoding='utf-8')
anchor = "- Recomputable ranking and execution traces must be removed from child-Worker transfer payloads and rebuilt only by the owning parent Worker.\n"
addition = (
    "- A record may be materialized only once in a distributed request. The parent must accept the child materialization marker instead of rebuilding school, geography and historical evidence.\n"
    "- Browser responses require an explicit transport owner and byte budget. Server-only profiles, repeated source metadata and ranking internals must not be serialized to the client.\n"
)
if addition not in text:
    text = replace_once(text, anchor, anchor + addition, 'skill materialized response rule')
path.write_text(text, encoding='utf-8')

# Shared local verifier: enforce response owner and local response budgets.
path = Path('tools/verify-worker-budget-local-v3972.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    """  if (source.bucketCandidateTransferVersion !== 'major-bands-bucket-candidate-compact-v3972_5') {
    throw new Error(`${label} transfer=${source.bucketCandidateTransferVersion || 'missing'}`);
  }
""",
    """  if (source.bucketCandidateTransferVersion !== 'major-bands-bucket-candidate-compact-v3972_5') {
    throw new Error(`${label} transfer=${source.bucketCandidateTransferVersion || 'missing'}`);
  }
  if (source.responseTransportVersion !== 'major-bands-response-compact-v3972_5') {
    throw new Error(`${label} response=${source.responseTransportVersion || 'missing'}`);
  }
  if (Number(source.bucketWorkerTransferChars || 0) < 1) {
    throw new Error(`${label} transferChars=${source.bucketWorkerTransferChars}`);
  }
""",
    'local response contract'
)
text = replace_once(
    text,
    """const health = read('health');
const score = read('score');
const school = read('school');
""",
    """const health = read('health');
const score = read('score');
const school = read('school');
const scoreBytes = fs.statSync(`/tmp/v3972-score-${cycle}.json`).size;
const schoolBytes = fs.statSync(`/tmp/v3972-school-${cycle}.json`).size;
if (scoreBytes > 260000) throw new Error(`score response bytes=${scoreBytes}`);
if (schoolBytes > 180000) throw new Error(`school response bytes=${schoolBytes}`);
""",
    'local response byte budget'
)
text = replace_once(
    text,
    """  scoreRecords,
  schoolRecords,
  scoreConcurrency: Number(score.source.bucketWorkerConcurrency),
""",
    """  scoreRecords,
  schoolRecords,
  scoreBytes,
  schoolBytes,
  scoreTransferChars: Number(score.source.bucketWorkerTransferChars),
  schoolTransferChars: Number(school.source.bucketWorkerTransferChars),
  scoreConcurrency: Number(score.source.bucketWorkerConcurrency),
""",
    'local response evidence'
)
path.write_text(text, encoding='utf-8')

# Production verifier: enforce real response bytes and transport ownership.
path = Path('tools/verify-production-v3971.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "const EXPECTED_MAJOR_BANDS_TRANSFER = 'major-bands-bucket-candidate-compact-v3972_5';\n",
    "const EXPECTED_MAJOR_BANDS_TRANSFER = 'major-bands-bucket-candidate-compact-v3972_5';\n"
    "const EXPECTED_MAJOR_BANDS_MATERIALIZATION = 'major-bands-materialized-v3972_5';\n"
    "const EXPECTED_MAJOR_BANDS_RESPONSE = 'major-bands-response-compact-v3972_5';\n"
    "const SCORE_RESPONSE_BUDGET_BYTES = 260000;\n"
    "const SCHOOL_RESPONSE_BUDGET_BYTES = 180000;\n",
    'production response contracts'
)
text = replace_once(
    text,
    """  assert(source.bucketCandidateTransferVersion === EXPECTED_MAJOR_BANDS_TRANSFER, `${label} transfer=${source.bucketCandidateTransferVersion || 'missing'}`);
  assert(Number(source.bucketWorkerConcurrency || 0) === 1, `${label} concurrency=${source.bucketWorkerConcurrency}`);
""",
    """  assert(source.bucketCandidateTransferVersion === EXPECTED_MAJOR_BANDS_TRANSFER, `${label} transfer=${source.bucketCandidateTransferVersion || 'missing'}`);
  assert(source.responseTransportVersion === EXPECTED_MAJOR_BANDS_RESPONSE, `${label} response=${source.responseTransportVersion || 'missing'}`);
  assert(Number(source.bucketWorkerTransferChars || 0) > 0, `${label} transferChars=${source.bucketWorkerTransferChars}`);
  assert(Number(source.bucketWorkerConcurrency || 0) === 1, `${label} concurrency=${source.bucketWorkerConcurrency}`);
""",
    'production execution response assertion'
)
text = replace_once(
    text,
    "  assert(result.pagesRelease.text.includes(`majorBandsBucketTransferVersion: '${EXPECTED_MAJOR_BANDS_TRANSFER}'`), 'Pages major-bands transfer mismatch');\n",
    "  assert(result.pagesRelease.text.includes(`majorBandsBucketTransferVersion: '${EXPECTED_MAJOR_BANDS_TRANSFER}'`), 'Pages major-bands transfer mismatch');\n"
    "  assert(result.pagesRelease.text.includes(`majorBandsMaterializationVersion: '${EXPECTED_MAJOR_BANDS_MATERIALIZATION}'`), 'Pages major-bands materialization mismatch');\n"
    "  assert(result.pagesRelease.text.includes(`majorBandsResponseTransportVersion: '${EXPECTED_MAJOR_BANDS_RESPONSE}'`), 'Pages major-bands response transport mismatch');\n",
    'production release response contract'
)
text = replace_once(
    text,
    """  const runtime = parseJson(result.runtime);
  const health = parseJson(result.health);
  const score = parseJson(result.score);
  const school = parseJson(result.school);
""",
    """  const scoreBytes = Buffer.byteLength(result.score.text, 'utf8');
  const schoolBytes = Buffer.byteLength(result.school.text, 'utf8');
  assert(scoreBytes <= SCORE_RESPONSE_BUDGET_BYTES, `score response bytes=${scoreBytes}`);
  assert(schoolBytes <= SCHOOL_RESPONSE_BUDGET_BYTES, `school response bytes=${schoolBytes}`);
  assert(result.score.headers['x-gaokao-response-transport'] === EXPECTED_MAJOR_BANDS_RESPONSE, `score response header=${result.score.headers['x-gaokao-response-transport'] || 'missing'}`);
  assert(result.school.headers['x-gaokao-response-transport'] === EXPECTED_MAJOR_BANDS_RESPONSE, `school response header=${result.school.headers['x-gaokao-response-transport'] || 'missing'}`);
  const runtime = parseJson(result.runtime);
  const health = parseJson(result.health);
  const score = parseJson(result.score);
  const school = parseJson(result.school);
""",
    'production response size checks'
)
text = replace_once(
    text,
    """    scoreRecords,
    schoolRecords,
    scoreConcurrency: Number(score.source.bucketWorkerConcurrency),
""",
    """    scoreRecords,
    schoolRecords,
    scoreBytes,
    schoolBytes,
    scoreTransferChars: Number(score.source.bucketWorkerTransferChars || 0),
    schoolTransferChars: Number(school.source.bucketWorkerTransferChars || 0),
    scoreConcurrency: Number(score.source.bucketWorkerConcurrency),
""",
    'production cycle response evidence'
)
text = replace_once(
    text,
    """  minimumSchoolRecords: Math.min(...cycles.map(item => item.schoolRecords)),
  maximumScoreConcurrency: Math.max(...cycles.map(item => item.scoreConcurrency)),
""",
    """  minimumSchoolRecords: Math.min(...cycles.map(item => item.schoolRecords)),
  maximumScoreResponseBytes: Math.max(...cycles.map(item => item.scoreBytes)),
  maximumSchoolResponseBytes: Math.max(...cycles.map(item => item.schoolBytes)),
  maximumScoreTransferChars: Math.max(...cycles.map(item => item.scoreTransferChars)),
  maximumSchoolTransferChars: Math.max(...cycles.map(item => item.schoolTransferChars)),
  maximumScoreConcurrency: Math.max(...cycles.map(item => item.scoreConcurrency)),
""",
    'production summary response evidence'
)
path.write_text(text, encoding='utf-8')
