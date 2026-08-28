import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const url = rel => pathToFileURL(`${root}/${rel}`);
const read = rel => fs.readFileSync(rel, 'utf8');
const json = rel => JSON.parse(read(rel));

const { CURRENT_RELEASE } = await import(url('shared/resources/release/current-release.js'));
const { ALGORITHM_CONTRACT, ALGORITHM_ORCHESTRATION_VERSION } = await import(url('shared/algorithms/algorithm-registry.js'));
const { resolveCanonicalPosition } = await import(url('shared/algorithms/position/canonical-position.v3963_0.js'));
const { rankRecords, diversifyRankedRecords } = await import(url('shared/algorithms/ranking/staged-ranking.v3960_0.js'));
const { makeDecisionSnapshot, isCompatibleDecisionSnapshot } = await import(url('shared/algorithms/contracts/decision-snapshot.v3960_0.js'));
const { getBottomLineEligibility } = await import(url('functions/_lib/bottomline-policy.js'));
const { classifySelectionPosition } = await import(url('ln-rank/js/domain/selection-band-policy.v3963_1.js'));

assert.equal(CURRENT_RELEASE.display, 'v3.9.65.0');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3965_0');
assert.equal(CURRENT_RELEASE.algorithmOrchestrationVersion, ALGORITHM_ORCHESTRATION_VERSION);
assert.equal(CURRENT_RELEASE.selectionWorkspaceVersion, 'selection-workspace-orchestration-v3965_0');
assert.equal(CURRENT_RELEASE.runtimeCacheVersion, 'runtime-cache-coherence-v3965_0');
assert.equal(CURRENT_RELEASE.reportFrontendVersion, 'feishu-browser-v3965_0');
assert.equal(CURRENT_RELEASE.tongxueRuntimeVersion, 'tongxue-runtime-v159');
assert.equal(CURRENT_RELEASE.schoolAllModeVersion, 'school-all-mode-v3964_0');
assert.equal(CURRENT_RELEASE.schoolUiGovernanceVersion, 'school-ui-governance-v3964_0');
assert.equal(ALGORITHM_CONTRACT.activeDataYear, 2026);
assert.equal(ALGORITHM_CONTRACT.audienceYear, 2027);
assert.ok(ALGORITHM_CONTRACT.principles.includes('ai-explains-but-does-not-rank'));

const canonical = resolveCanonicalPosition({
  candidateScore: 600,
  candidateRank: 14235,
  recordScore: 595,
  recordRank: 16500,
  rangePreset: 'standard'
});
assert.equal(canonical.bandKey, 'near');
assert.equal(canonical.scoreDelta, -5);
assert.equal(canonical.rankGap, -2265);
assert.equal(canonical.classificationBasis, 'rank-primary-2026-position');
assert.equal(canonical.evidenceStrength, 'strong');

const selection = classifySelectionPosition({
  candidateScore: 600,
  candidateRank: 14235,
  recordScore: 595,
  recordRank: 16500,
  rangePreset: 'standard'
});
assert.equal(selection.key, canonical.bandKey);
assert.equal(selection.canonicalPosition.statusKey, canonical.statusKey);
assert.equal(selection.canonicalPosition.rankGap, canonical.rankGap);

const unresolved = getBottomLineEligibility({ schoolNature: 'public', feeType: 'unknown' }, 'public_regular_only');
assert.equal(unresolved.status, 'unresolved');
const confirmed = getBottomLineEligibility({ schoolNature: 'public', feeType: 'normal' }, 'public_regular_only');
assert.equal(confirmed.status, 'pass');
const rejected = getBottomLineEligibility({ schoolNature: 'private', feeType: 'normal' }, 'public_regular_only');
assert.equal(rejected.status, 'fail');

const records = [
  {
    id: 'industry-public', school: 'A大学', major: '普通自动化', matchLevel: 'industry',
    schoolNature: 'public', feeType: 'normal', canonicalPosition: resolveCanonicalPosition({ candidateScore: 600, candidateRank: 14235, recordScore: 600, recordRank: 14235 })
  },
  {
    id: 'exact-nonpreferred', school: 'B大学', major: '电气工程及其自动化', matchLevel: 'exact',
    schoolNature: 'private', feeType: 'normal', canonicalPosition: resolveCanonicalPosition({ candidateScore: 600, candidateRank: 14235, recordScore: 599, recordRank: 15000 })
  }
];
const ranked = rankRecords(records, { getSoftPreferenceWeight: record => record.schoolNature === 'public' ? 30 : 0 });
assert.equal(ranked[0].id, 'exact-nonpreferred', 'soft public preference must not outrank exact intent');
assert.ok(ranked[0].rankingTrace.reasons.includes('INTENT_EXACT'));

const duplicated = rankRecords([
  ...Array.from({ length: 4 }, (_, i) => ({ id: `a-${i}`, school: 'A大学', major: `专业${i}`, matchLevel: 'exact', canonicalPosition: canonical })),
  { id: 'b-1', school: 'B大学', major: '专业B', matchLevel: 'exact', canonicalPosition: canonical },
  { id: 'c-1', school: 'C大学', major: '专业C', matchLevel: 'exact', canonicalPosition: canonical },
  { id: 'd-1', school: 'D大学', major: '专业D', matchLevel: 'exact', canonicalPosition: canonical },
  { id: 'e-1', school: 'E大学', major: '专业E', matchLevel: 'exact', canonicalPosition: canonical }
]);
const diversified = diversifyRankedRecords(duplicated, { windowSize: 6, maxPerSchool: 2 });
assert.ok(diversified.slice(0, 6).filter(item => item.school === 'A大学').length <= 2);
assert.deepEqual(new Set(diversified.map(item => item.id)), new Set(duplicated.map(item => item.id)));

const snapshot = makeDecisionSnapshot({
  candidateScore: 600,
  candidateReferenceRank2026: 14235,
  rangePreset: 'standard',
  filters: { majorKeyword: '电气' },
  records: ranked
});
assert.equal(isCompatibleDecisionSnapshot(snapshot), true);
assert.equal(snapshot.dataYear, 2026);
assert.equal(snapshot.audienceYear, 2027);
assert.ok(snapshot.signature.includes('exact-nonpreferred'));

const majorBands = read('functions/api/major-bands.js');
for (const marker of ['resolveCanonicalPosition','rankRecords','getBottomLineEligibility','algorithmOrchestrationVersion','canonical_rank_primary_2026_position']) assert.ok(majorBands.includes(marker), `major-bands missing ${marker}`);
assert.ok(!majorBands.includes("classificationMode: 'score_delta'"));

const advisor = read('functions/_lib/advisor-fact-builder.js');
assert.ok(advisor.includes('score2026'));
assert.ok(advisor.includes('rank2026'));
assert.ok(advisor.includes('ALGORITHM_ORCHESTRATION_VERSION'));
assert.ok(!advisor.includes('const score2025 = num(item.score2025 ?? item.score'));

const report = read('functions/_lib/report-data-service-v3956.js');
assert.ok(report.includes('makeDecisionSnapshot'));
assert.ok(report.includes("'current-decision-snapshot'"));
assert.ok(report.includes("'canonical-server-rebuild-2026'"));

for (const rel of ['ln-rank/release-meta.json', 'ln-rank/active-assets.json']) {
  const meta = json(rel);
  assert.equal(meta.version, CURRENT_RELEASE.display);
  assert.equal(meta.assetVersion, CURRENT_RELEASE.assetVersion);
  assert.equal(meta.algorithmOrchestrationVersion, ALGORITHM_ORCHESTRATION_VERSION);
  assert.equal(meta.schoolAllModeVersion, 'school-all-mode-v3964_0');
  assert.equal(meta.schoolUiGovernanceVersion, 'school-ui-governance-v3964_0');
  for (const key of ['algorithmOrchestrationContract', 'canonicalPositionContract', 'rankAwarePositionContract','stagedRankingTraceContract', 'intentBeforeSoftPreferenceContract', 'bottomLineUnknownTriStateContract','explicitSpecialProjectIntentContract', 'decisionSnapshotContract', 'aiExplainsButDoesNotRankContract']) assert.equal(meta[key], true, `${rel} missing ${key}`);
}

console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  assetVersion: CURRENT_RELEASE.assetVersion,
  algorithm: ALGORITHM_ORCHESTRATION_VERSION,
  canonicalExample: canonical,
  rankingOrder: ranked.map(item => item.id),
  snapshotSignature: snapshot.signature
}, null, 2));
