from pathlib import Path


def replace_once(text, before, after, label):
    if before not in text:
        raise RuntimeError(f'missing patch anchor: {label}')
    return text.replace(before, after, 1)


# Child bucket engine: remove traces that the parent deterministically rebuilds.
path = Path('functions/_lib/major-bands-bucket-engine.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "import { rankResultRecords } from '../../shared/algorithms/ranking/result-ranking.v3967_0.js';\n",
    "import { rankResultRecords } from '../../shared/algorithms/ranking/result-ranking.v3967_0.js';\n"
    "import { compactMajorBandsBucketCandidate } from './major-bands-bucket-transfer.v3972_5.js';\n",
    'bucket transfer import'
)
text = replace_once(
    text,
    """  return rankResultRecords(candidates, {
    intent: 'score-search',
    sortMode: 'canonical-staged',
    diversify: false,
    getSoftPreferenceWeight: record => getBottomLineSortWeight(record, bottomLineMode)
  }).slice(0, maxCandidates);
""",
    """  return rankResultRecords(candidates, {
    intent: 'score-search',
    sortMode: 'canonical-staged',
    diversify: false,
    getSoftPreferenceWeight: record => getBottomLineSortWeight(record, bottomLineMode)
  }).slice(0, maxCandidates).map(compactMajorBandsBucketCandidate);
""",
    'strip child ranking traces'
)
path.write_text(text, encoding='utf-8')

# Child API: declare the transfer contract in every successful payload.
path = Path('functions/api/major-bands-bucket.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "import { processMajorBandsStaticBucket } from '../_lib/major-bands-bucket-engine.js';\n",
    "import { processMajorBandsStaticBucket } from '../_lib/major-bands-bucket-engine.js';\n"
    "import { MAJOR_BANDS_BUCKET_TRANSFER_VERSION } from '../_lib/major-bands-bucket-transfer.v3972_5.js';\n",
    'bucket api transfer import'
)
text = replace_once(
    text,
    "      contract: CONTRACT,\n      architecture: 'build-time-static-score-index-single-bucket-worker',\n",
    "      contract: CONTRACT,\n      candidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION,\n      architecture: 'build-time-static-score-index-single-bucket-worker',\n",
    'bucket api transfer response'
)
path.write_text(text, encoding='utf-8')

# Parent API: validate compact transfer payload and expose its owner in evidence.
path = Path('functions/api/major-bands.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "} from '../_lib/major-bands-bucket-orchestrator.v3972_5.js';\n",
    "} from '../_lib/major-bands-bucket-orchestrator.v3972_5.js';\n"
    "import {\n"
    "  MAJOR_BANDS_BUCKET_TRANSFER_VERSION,\n"
    "  assertCompactMajorBandsBucketCandidate\n"
    "} from '../_lib/major-bands-bucket-transfer.v3972_5.js';\n",
    'parent transfer import'
)
text = replace_once(
    text,
    """  if (!payload?.ok || payload?.contract !== BUCKET_CONTRACT || payload?.bucket?.file !== bucket.file) {
    throw new Error(`分数桶 Worker 合同不匹配：${bucket.file}`);
  }
  return payload;
""",
    """  if (
    !payload?.ok
    || payload?.contract !== BUCKET_CONTRACT
    || payload?.candidateTransferVersion !== MAJOR_BANDS_BUCKET_TRANSFER_VERSION
    || payload?.bucket?.file !== bucket.file
  ) {
    throw new Error(`分数桶 Worker 合同不匹配：${bucket.file}`);
  }
  for (const key of ['upper', 'near', 'steady']) {
    for (const candidate of payload.grouped?.[key]?.candidates || []) {
      assertCompactMajorBandsBucketCandidate(candidate);
    }
  }
  return payload;
""",
    'parent transfer validation'
)
text = replace_once(
    text,
    "        bucketWorkerOrchestrationVersion: bucketExecution.stats.version,\n",
    "        bucketWorkerOrchestrationVersion: bucketExecution.stats.version,\n"
    "        bucketCandidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION,\n",
    'parent transfer evidence'
)
path.write_text(text, encoding='utf-8')

# Current release: one explicit owner for transfer and orchestration contracts.
path = Path('shared/resources/release/current-release.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  majorBandsOrchestrationVersion: 'major-bands-bounded-fanout-v3972_5',\n",
    "  majorBandsOrchestrationVersion: 'major-bands-bounded-fanout-v3972_5',\n"
    "  majorBandsBucketTransferVersion: 'major-bands-bucket-candidate-compact-v3972_5',\n",
    'release transfer version'
)
text = replace_once(
    text,
    "    majorBandsOrchestrator: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',\n",
    "    majorBandsOrchestrator: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',\n"
    "    majorBandsBucketTransfer: '/functions/_lib/major-bands-bucket-transfer.v3972_5.js',\n",
    'release transfer owner'
)
path.write_text(text, encoding='utf-8')

# Global execution contract: transfer compaction is part of the owned graph.
path = Path('shared/governance/resource-execution-contract.v3972_5.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "    orchestrator: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',\n    staticProvider: '/functions/_lib/major-bands-static-provider.js',\n",
    "    orchestrator: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js',\n"
    "    transferOwner: '/functions/_lib/major-bands-bucket-transfer.v3972_5.js',\n"
    "    transferVersion: 'major-bands-bucket-candidate-compact-v3972_5',\n"
    "    staticProvider: '/functions/_lib/major-bands-static-provider.js',\n",
    'execution transfer owner'
)
text = replace_once(
    text,
    "      '/functions/_lib/major-bands-bucket-engine.js'\n",
    "      '/functions/_lib/major-bands-bucket-engine.js',\n"
    "      '/functions/_lib/major-bands-bucket-transfer.v3972_5.js'\n",
    'execution transfer adapter'
)
path.write_text(text, encoding='utf-8')

# Skill: preserve this resource rule for later releases.
path = Path('docs/skills/unified-site-release/SKILL.md')
text = path.read_text(encoding='utf-8')
anchor = "- The response and production evidence must expose peak child-Worker concurrency and retry count.\n"
addition = (
    "- Recomputable ranking and execution traces must be removed from child-Worker transfer payloads and rebuilt only by the owning parent Worker.\n"
    "- When two top-level queries can run concurrently, the per-request child-Worker ceiling must be chosen from the combined production budget, not from an isolated request benchmark.\n"
)
if addition not in text:
    text = replace_once(text, anchor, anchor + addition, 'skill transfer budget')
path.write_text(text, encoding='utf-8')

# Shared local verifier: the production contract is now exactly one child at a time.
path = Path('tools/verify-worker-budget-local-v3972.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    """  const concurrency = Number(source.bucketWorkerConcurrency || 0);
  if (concurrency < 1 || concurrency > 3) {
    throw new Error(`${label} concurrency=${concurrency}`);
  }
""",
    """  const concurrency = Number(source.bucketWorkerConcurrency || 0);
  if (concurrency !== 1) {
    throw new Error(`${label} concurrency=${concurrency}`);
  }
  if (source.bucketCandidateTransferVersion !== 'major-bands-bucket-candidate-compact-v3972_5') {
    throw new Error(`${label} transfer=${source.bucketCandidateTransferVersion || 'missing'}`);
  }
""",
    'local exact concurrency and transfer'
)
path.write_text(text, encoding='utf-8')

# Production verifier: validate the orchestration evidence on every stress cycle.
path = Path('tools/verify-production-v3971.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "const EXPECTED_INDEX = 'local-strength-static-v3971_2';\n",
    "const EXPECTED_INDEX = 'local-strength-static-v3971_2';\n"
    "const EXPECTED_MAJOR_BANDS_ORCHESTRATION = 'major-bands-bounded-fanout-v3972_5';\n"
    "const EXPECTED_MAJOR_BANDS_TRANSFER = 'major-bands-bucket-candidate-compact-v3972_5';\n",
    'production expected contracts'
)
insert_after = """function assertBoundedHealth(health) {
  assert(health?.ok !== false, `health returned ok=false: ${JSON.stringify(health).slice(0, 1000)}`);
  assert(health?.resourcePolicy?.fullDatasetProbeDisabled === true, 'health resource policy does not disable full scan');
  assert(health?.resourcePolicy?.largeChunkModuleCacheDisabled === true, 'health resource policy does not disable large chunk cache');
  assert(health?.resourcePolicy?.maximumProbeChunks === 1, `health maximumProbeChunks=${health?.resourcePolicy?.maximumProbeChunks}`);
  assert(health?.probe?.mode === 'bounded-manifest-plus-one-chunk', `health mode=${health?.probe?.mode}`);
  assert(health?.probe?.fullDatasetScan === false, 'health probe claims full dataset scan');
  assert(Number(health?.probe?.chunksRead || 0) <= 1, `health chunksRead=${health?.probe?.chunksRead}`);
  assert(Number(health?.probe?.rawScanned || 0) <= 2000, `health rawScanned=${health?.probe?.rawScanned}`);
  assert(health?.probe?.resourceBudget?.maxChunksRead === 1, `health probe maxChunksRead=${health?.probe?.resourceBudget?.maxChunksRead}`);
  assert(health?.probe?.resourceBudget?.parsedChunkCache === false, 'health probe parsed chunk cache enabled');
}
"""
assert_function = """
function assertMajorBandsExecution(data, label) {
  const source = data?.source || {};
  assert(source.bucketWorkerOrchestrationVersion === EXPECTED_MAJOR_BANDS_ORCHESTRATION, `${label} orchestration=${source.bucketWorkerOrchestrationVersion || 'missing'}`);
  assert(source.bucketCandidateTransferVersion === EXPECTED_MAJOR_BANDS_TRANSFER, `${label} transfer=${source.bucketCandidateTransferVersion || 'missing'}`);
  assert(Number(source.bucketWorkerConcurrency || 0) === 1, `${label} concurrency=${source.bucketWorkerConcurrency}`);
  assert(Number(source.bucketWorkerMaxAttempts || 0) === 2, `${label} maxAttempts=${source.bucketWorkerMaxAttempts}`);
  const retries = Number(source.bucketWorkerRetries || 0);
  assert(Number.isInteger(retries) && retries >= 0, `${label} retries=${source.bucketWorkerRetries}`);
}
"""
if assert_function not in text:
    text = replace_once(text, insert_after, insert_after + assert_function, 'production execution assertion')
text = replace_once(
    text,
    "  assert(result.pagesRelease.text.includes(\"localStrengthDataVersion: 'local-strength-static-v3971_2'\"), 'Pages LocalStrength owner mismatch');\n",
    "  assert(result.pagesRelease.text.includes(\"localStrengthDataVersion: 'local-strength-static-v3971_2'\"), 'Pages LocalStrength owner mismatch');\n"
    "  assert(result.pagesRelease.text.includes(`majorBandsOrchestrationVersion: '${EXPECTED_MAJOR_BANDS_ORCHESTRATION}'`), 'Pages major-bands orchestration mismatch');\n"
    "  assert(result.pagesRelease.text.includes(`majorBandsBucketTransferVersion: '${EXPECTED_MAJOR_BANDS_TRANSFER}'`), 'Pages major-bands transfer mismatch');\n",
    'production release execution contract'
)
text = replace_once(
    text,
    """  assert(score?.ok !== false && school?.ok !== false, `query ok=false cycle ${cycle}`);
  const scoreRecords = recordCount(score);
""",
    """  assert(score?.ok !== false && school?.ok !== false, `query ok=false cycle ${cycle}`);
  assertMajorBandsExecution(score, `score cycle ${cycle}`);
  assertMajorBandsExecution(school, `school cycle ${cycle}`);
  const scoreRecords = recordCount(score);
""",
    'production cycle execution checks'
)
text = replace_once(
    text,
    """    scoreRecords,
    schoolRecords
  };
""",
    """    scoreRecords,
    schoolRecords,
    scoreConcurrency: Number(score.source.bucketWorkerConcurrency),
    schoolConcurrency: Number(school.source.bucketWorkerConcurrency),
    scoreRetries: Number(score.source.bucketWorkerRetries || 0),
    schoolRetries: Number(school.source.bucketWorkerRetries || 0)
  };
""",
    'production cycle execution evidence'
)
text = replace_once(
    text,
    """  minimumSchoolRecords: Math.min(...cycles.map(item => item.schoolRecords)),
  cloudflare1102Count: 0,
""",
    """  minimumSchoolRecords: Math.min(...cycles.map(item => item.schoolRecords)),
  maximumScoreConcurrency: Math.max(...cycles.map(item => item.scoreConcurrency)),
  maximumSchoolConcurrency: Math.max(...cycles.map(item => item.schoolConcurrency)),
  totalScoreRetries: cycles.reduce((sum, item) => sum + item.scoreRetries, 0),
  totalSchoolRetries: cycles.reduce((sum, item) => sum + item.schoolRetries, 0),
  cloudflare1102Count: 0,
""",
    'production summary execution evidence'
)
path.write_text(text, encoding='utf-8')

# Permanent workflow: 40 Preview cycles and explicit transfer/concurrency gates.
path = Path('.github/workflows/verify-major-bands-bounded-fanout-v3972_5.yml')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "      - 'functions/_lib/major-bands-bucket-orchestrator.v3972_5.js'\n",
    "      - 'functions/_lib/major-bands-bucket-orchestrator.v3972_5.js'\n"
    "      - 'functions/_lib/major-bands-bucket-transfer.v3972_5.js'\n",
    'workflow transfer path'
)
text = replace_once(
    text,
    "          node --check functions/_lib/major-bands-bucket-orchestrator.v3972_5.js\n",
    "          node --check functions/_lib/major-bands-bucket-orchestrator.v3972_5.js\n"
    "          node --check functions/_lib/major-bands-bucket-transfer.v3972_5.js\n",
    'workflow transfer syntax'
)
text = replace_once(
    text,
    "          grep -q \"majorBandsOrchestrator: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js'\" shared/resources/release/current-release.js\n",
    "          grep -q \"majorBandsOrchestrator: '/functions/_lib/major-bands-bucket-orchestrator.v3972_5.js'\" shared/resources/release/current-release.js\n"
    "          grep -q \"majorBandsBucketTransferVersion: 'major-bands-bucket-candidate-compact-v3972_5'\" shared/resources/release/current-release.js\n"
    "          grep -q \"maxConcurrency: 1\" functions/_lib/major-bands-bucket-orchestrator.v3972_5.js\n",
    'workflow exact budget contract'
)
text = text.replace('Verify 24 Preview or 40 production concurrent cycles', 'Verify 40 Preview or production concurrent cycles')
text = replace_once(
    text,
    "            export PRODUCTION_STRESS_CYCLES='24'\n",
    "            export PRODUCTION_STRESS_CYCLES='40'\n",
    'workflow preview cycles'
)
path.write_text(text, encoding='utf-8')
