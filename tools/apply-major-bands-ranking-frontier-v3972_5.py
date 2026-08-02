from pathlib import Path


def replace_once(text, before, after, label):
    if before not in text:
        raise RuntimeError(f'missing patch anchor: {label}')
    return text.replace(before, after, 1)


# Child Worker owns filtering and local ranking, not expensive materialization.
path = Path('functions/_lib/major-bands-bucket-engine.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "import { lookupScoreRank } from './rank-table-provider.js';\nimport { materializeMajorBandsStaticRecord } from './major-bands-static-provider.js';\nimport { buildDisplayTags } from './school-display-tags.js';\n",
    "import { lookupScoreRank } from './rank-table-provider.js';\n",
    'remove child materialization imports'
)
text = replace_once(
    text,
    """  // The child Worker owns expensive record materialization. It resolves
  // historical evidence, geography and the canonical school profile once
  // before the compact transfer boundary. The parent consumes the marker and
  // compact schoolProfile instead of repeating those lookups.
  const materialized = materializeMajorBandsStaticRecord(record);
  const displayTags = buildDisplayTags(materialized);
  const item = {
    ...materialized,
    ...displayTags,
""",
    """  const item = {
    ...record,
""",
    'child ranking frontier only'
)
path.write_text(text, encoding='utf-8')

# Parent owns one-time materialization only after global ranking and pagination.
path = Path('functions/api/major-bands.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    """import {
  MAJOR_BANDS_MATERIALIZATION_VERSION,
  selectMajorBandsStaticBuckets,
  materializeMajorBandsStaticRecord
} from '../_lib/major-bands-static-provider.js';
""",
    """import {
  selectMajorBandsStaticBuckets,
  materializeMajorBandsStaticRecord
} from '../_lib/major-bands-static-provider.js';
""",
    'parent materialization import'
)
text = replace_once(
    text,
    """function finalizeRecordForResponse(record) {
  const item = record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION
    ? record
    : materializeMajorBandsStaticRecord(record);
  return { ...item, ...buildDisplayTags(item) };
}
""",
    """function finalizeRecordForResponse(record) {
  const item = materializeMajorBandsStaticRecord(record);
  return { ...item, ...buildDisplayTags(item) };
}
""",
    'parent final materialization owner'
)
path.write_text(text, encoding='utf-8')

# Permanent audit proves the two-stage ownership and transfer boundary.
path = Path('tools/audit-major-bands-bounded-fanout-v3972_5.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    """assert.equal(compactCandidate.majorBandsMaterializationVersion, MAJOR_BANDS_MATERIALIZATION_VERSION);
assert.equal(compactCandidate.schoolProfile.standardSchoolName, '示例大学');
assert.equal(compactCandidate.schoolProfile.largeUnusedProfileField, undefined);
assert.equal(compactCandidate.historyEvidence.years['2024'].sourceMeta, undefined);
assert.equal(compactCandidate.canonicalPosition.ignoredInternalField, undefined);
assert.equal(compactCandidate.rankingTrace, undefined);
assert.equal(compactCandidate.resultRankingTrace, undefined);

const responseRecord = compactMajorBandsResponseRecord({
  ...compactCandidate,
  schoolProfileDisplayTags: ['公办', '辽宁 · 沈阳']
});
""",
    """assert.equal(compactCandidate.majorBandsMaterializationVersion, undefined);
assert.equal(compactCandidate.schoolProfile, undefined);
assert.equal(compactCandidate.historyEvidence, undefined);
assert.equal(compactCandidate.historyCompare, undefined);
assert.equal(compactCandidate.canonicalPosition.ignoredInternalField, undefined);
assert.equal(compactCandidate.rankingTrace, undefined);
assert.equal(compactCandidate.resultRankingTrace, undefined);

const responseRecord = compactMajorBandsResponseRecord(tracedCandidate);
""",
    'audit unmaterialized ranking transfer'
)
text = replace_once(
    text,
    """assert.ok(JSON.stringify(compactCandidate).length < JSON.stringify(tracedCandidate).length);
assert.ok(JSON.stringify(responseRecord).length < JSON.stringify(compactCandidate).length);
""",
    """assert.ok(JSON.stringify(compactCandidate).length < JSON.stringify(tracedCandidate).length);
assert.ok(JSON.stringify(responseRecord).length < JSON.stringify(tracedCandidate).length);
""",
    'audit independent transfer and response compaction'
)
text = replace_once(
    text,
    """assert.ok(source.includes('compactMajorBandsResponseRecord'));
assert.ok(source.includes("record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION"));
assert.ok(source.includes("'x-gaokao-response-transport'"));
""",
    """assert.ok(source.includes('compactMajorBandsResponseRecord'));
assert.ok(source.includes('const item = materializeMajorBandsStaticRecord(record);'));
assert.ok(!source.includes('record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION'));
assert.ok(source.includes("'x-gaokao-response-transport'"));
""",
    'audit parent finalization owner'
)
text = replace_once(
    text,
    """assert.ok(bucketEngine.includes("import { materializeMajorBandsStaticRecord } from './major-bands-static-provider.js';"));
assert.ok(bucketEngine.includes("import { buildDisplayTags } from './school-display-tags.js';"));
assert.ok(bucketEngine.includes('const materialized = materializeMajorBandsStaticRecord(record);'));
assert.ok(bucketEngine.includes('const displayTags = buildDisplayTags(materialized);'));
assert.ok(bucketEngine.includes('...materialized'));
assert.ok(bucketEngine.includes('...displayTags'));
assert.ok(bucketEngine.includes('.slice(0, maxCandidates).map(compactMajorBandsBucketCandidate)'));
""",
    """assert.ok(!bucketEngine.includes("import { materializeMajorBandsStaticRecord } from './major-bands-static-provider.js';"));
assert.ok(!bucketEngine.includes("import { buildDisplayTags } from './school-display-tags.js';"));
assert.ok(!bucketEngine.includes('materializeMajorBandsStaticRecord(record)'));
assert.ok(bucketEngine.includes('...record'));
assert.ok(bucketEngine.includes('.slice(0, maxCandidates).map(compactMajorBandsBucketCandidate)'));
""",
    'audit child ranking-only owner'
)
text = replace_once(
    text,
    """assert.ok(productionVerifier.includes('SCORE_RESPONSE_BUDGET_BYTES = 260000'));
assert.ok(productionVerifier.includes('SCHOOL_RESPONSE_BUDGET_BYTES = 180000'));
""",
    """assert.ok(productionVerifier.includes('SCORE_RESPONSE_BUDGET_BYTES = 260000'));
assert.ok(productionVerifier.includes('SCHOOL_RESPONSE_BUDGET_BYTES = 180000'));
assert.ok(productionVerifier.includes('SCORE_TRANSFER_BUDGET_CHARS = 1200000'));
assert.ok(productionVerifier.includes('SCHOOL_TRANSFER_BUDGET_CHARS = 300000'));
""",
    'audit transfer budgets'
)
path.write_text(text, encoding='utf-8')

# Local stress gate enforces aggregate cross-Worker payload budgets.
path = Path('tools/verify-worker-budget-local-v3972.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    """const cycle = String(process.argv[2] || '').trim();
if (!cycle) throw new Error('cycle argument required');
""",
    """const cycle = String(process.argv[2] || '').trim();
if (!cycle) throw new Error('cycle argument required');
const SCORE_TRANSFER_BUDGET_CHARS = 1200000;
const SCHOOL_TRANSFER_BUDGET_CHARS = 300000;
""",
    'local transfer budget constants'
)
text = replace_once(
    text,
    """  if (Number(source.bucketWorkerTransferChars || 0) < 1) {
    throw new Error(`${label} transferChars=${source.bucketWorkerTransferChars}`);
  }
""",
    """  const transferChars = Number(source.bucketWorkerTransferChars || 0);
  if (transferChars < 1) throw new Error(`${label} transferChars=${source.bucketWorkerTransferChars}`);
  const transferBudget = label === 'score' ? SCORE_TRANSFER_BUDGET_CHARS : SCHOOL_TRANSFER_BUDGET_CHARS;
  if (transferChars > transferBudget) {
    throw new Error(`${label} transferChars=${transferChars} budget=${transferBudget}`);
  }
""",
    'local aggregate transfer assertion'
)
path.write_text(text, encoding='utf-8')

# Preview/production stress gate enforces the same transfer budgets.
path = Path('tools/verify-production-v3971.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    """const SCORE_RESPONSE_BUDGET_BYTES = 260000;
const SCHOOL_RESPONSE_BUDGET_BYTES = 180000;
""",
    """const SCORE_RESPONSE_BUDGET_BYTES = 260000;
const SCHOOL_RESPONSE_BUDGET_BYTES = 180000;
const SCORE_TRANSFER_BUDGET_CHARS = 1200000;
const SCHOOL_TRANSFER_BUDGET_CHARS = 300000;
""",
    'production transfer budget constants'
)
text = replace_once(
    text,
    """  const scoreRecords = recordCount(score);
  const schoolRecords = recordCount(school);
  assert(scoreRecords > 0, `579 query empty cycle ${cycle}`);
  assert(schoolRecords > 0, `东北大学 query empty cycle ${cycle}`);
  return {
""",
    """  const scoreRecords = recordCount(score);
  const schoolRecords = recordCount(school);
  const scoreTransferChars = Number(score.source.bucketWorkerTransferChars || 0);
  const schoolTransferChars = Number(school.source.bucketWorkerTransferChars || 0);
  assert(scoreRecords > 0, `579 query empty cycle ${cycle}`);
  assert(schoolRecords > 0, `东北大学 query empty cycle ${cycle}`);
  assert(scoreTransferChars > 0 && scoreTransferChars <= SCORE_TRANSFER_BUDGET_CHARS, `score transfer chars=${scoreTransferChars}`);
  assert(schoolTransferChars > 0 && schoolTransferChars <= SCHOOL_TRANSFER_BUDGET_CHARS, `school transfer chars=${schoolTransferChars}`);
  return {
""",
    'production aggregate transfer assertion'
)
text = replace_once(
    text,
    """    scoreTransferChars: Number(score.source.bucketWorkerTransferChars || 0),
    schoolTransferChars: Number(school.source.bucketWorkerTransferChars || 0),
""",
    """    scoreTransferChars,
    schoolTransferChars,
""",
    'production transfer evidence variables'
)
path.write_text(text, encoding='utf-8')

# Release and execution centers declare the materialization owner and budgets.
path = Path('shared/resources/release/current-release.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  majorBandsMaterializationVersion: 'major-bands-materialized-v3972_5',\n",
    "  majorBandsMaterializationVersion: 'major-bands-materialized-v3972_5',\n"
    "  majorBandsMaterializationOwnerVersion: 'major-bands-parent-finalization-v3972_5',\n"
    "  majorBandsTransferBudgetVersion: 'major-bands-transfer-budget-v3972_5',\n",
    'release materialization ownership'
)
text = replace_once(
    text,
    "    majorBandsMaterialization: '/functions/_lib/major-bands-static-provider.js',\n",
    "    majorBandsMaterialization: '/functions/_lib/major-bands-static-provider.js',\n"
    "    majorBandsMaterializationOwner: '/functions/api/major-bands.js',\n",
    'release materialization owner path'
)
path.write_text(text, encoding='utf-8')

path = Path('shared/governance/resource-execution-contract.v3972_5.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    """    transferVersion: 'major-bands-bucket-candidate-compact-v3972_5',
    materializationVersion: 'major-bands-materialized-v3972_5',
    responseTransportVersion: 'major-bands-response-compact-v3972_5',
    responseBudgetBytes: 260000,
""",
    """    transferVersion: 'major-bands-bucket-candidate-compact-v3972_5',
    transferRole: 'unmaterialized-global-ranking-frontier',
    materializationVersion: 'major-bands-materialized-v3972_5',
    materializationOwner: '/functions/api/major-bands.js',
    materializationStage: 'after-global-ranking-and-pagination',
    responseTransportVersion: 'major-bands-response-compact-v3972_5',
    scoreTransferBudgetChars: 1200000,
    schoolTransferBudgetChars: 300000,
    responseBudgetBytes: 260000,
""",
    'execution ranking frontier contract'
)
path.write_text(text, encoding='utf-8')

# Skill records the global rule rather than one implementation accident.
path = Path('docs/skills/unified-site-release/SKILL.md')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "- A record may be materialized only once in a distributed request. The parent must accept the child materialization marker instead of rebuilding school, geography and historical evidence.\n",
    "- A record may be materialized only once in a distributed request. Child Workers transfer an unmaterialized ranking frontier; the parent materializes only globally selected records after ranking and pagination.\n"
    "- Aggregate child-Worker transfer size requires an explicit sustained-load budget. Passing the browser response budget does not permit a multi-megabyte internal transfer.\n",
    'skill ranking frontier ownership'
)
path.write_text(text, encoding='utf-8')
