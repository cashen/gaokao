#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const moduleUrl = rel => pathToFileURL(path.join(root, rel));

const { CURRENT_RELEASE } = await import(moduleUrl('shared/resources/release/current-release.js'));
const { SUPPORTED_LIAONING_PHYSICS_YEARS, getExamResourceConfig } = await import(moduleUrl('shared/resources/exam/liaoning-physics.js'));
const {
  SUPPORTED_LIAONING_PHYSICS_RANK_YEARS,
  getRankTableMeta,
  getRankTableRows,
  lookupScoreRank,
  validateScoreRank
} = await import(moduleUrl('functions/_lib/rank-table-provider.js'));
const { buildHistoricalScoreRankEvidence } = await import(moduleUrl('functions/_lib/historical-score-rank-evidence.js'));
const { formatHistoricalEvidenceText, historyRankRangeText } = await import(moduleUrl('shared/resources/exam/historical-score-rank-contract.js'));
const { SHARED_RESOURCE_REGISTRY } = await import(moduleUrl('shared/resources/resource-registry.js'));

assert.equal(CURRENT_RELEASE.display, 'v3.9.68.0');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3968_0');
assert.deepEqual([...SUPPORTED_LIAONING_PHYSICS_YEARS], [2024, 2025, 2026]);
assert.deepEqual([...SUPPORTED_LIAONING_PHYSICS_RANK_YEARS], [2024, 2025, 2026]);
assert.deepEqual([...SHARED_RESOURCE_REGISTRY.rankTables.supportedYears], [2024, 2025, 2026]);
assert.equal(SHARED_RESOURCE_REGISTRY.rankTables.comparisonPopulationPolicy, 'undergraduate-control-line-cumulative');

const anchors = {
  2024: [[708,11],[700,65],[650,3561],[600,14612],[599,14879],[592,16928],[368,116198],[150,149645]],
  2025: [[707,11],[700,29],[693,77],[600,13601],[367,118109],[150,143368]],
  2026: [[708,10],[700,41],[650,2867],[600,14235],[344,119069],[150,141691]]
};

const tableSummary = {};
for (const year of [2024, 2025, 2026]) {
  const config = getExamResourceConfig({ year, region: 'ln', subject: 'physics' });
  assert.equal(config.supported, true, `${year} exam config`);
  const meta = getRankTableMeta({ year, region: 'ln', subject: 'physics' });
  const rows = getRankTableRows({ year, region: 'ln', subject: 'physics' });
  assert.ok(meta && rows.length > 500, `${year} rank table incomplete`);
  let previousScore = Infinity;
  let previousCumulative = 0;
  for (const row of rows) {
    assert.ok(Number(row.score) < previousScore, `${year} score order ${row.score}`);
    assert.ok(Number(row.sameCount) >= 0, `${year} same count ${row.score}`);
    assert.equal(Number(row.cumulative), previousCumulative + Number(row.sameCount), `${year} cumulative ${row.score}`);
    assert.ok(Number(row.rankStart) <= Number(row.rankEnd), `${year} range ${row.score}`);
    previousScore = Number(row.score);
    previousCumulative = Number(row.cumulative);
  }
  for (const [score, expected] of anchors[year]) {
    const row = lookupScoreRank({ year, region: 'ln', subject: 'physics', score });
    assert.equal(Number(row?.rankEnd), expected, `${year} score ${score}`);
  }
  const undergraduate = lookupScoreRank({ year, region: 'ln', subject: 'physics', score: config.undergraduateControlScore });
  tableSummary[year] = {
    rows: rows.length,
    topScore: rows[0].score,
    bottomScore: rows.at(-1).score,
    totalAtBottom: rows.at(-1).cumulative,
    undergraduateScore: config.undergraduateControlScore,
    undergraduatePopulation: undergraduate.rankEnd
  };
}
assert.deepEqual(Object.fromEntries(Object.entries(tableSummary).map(([year, row]) => [year, row.undergraduatePopulation])), {
  2024: 116198,
  2025: 118109,
  2026: 119069
});

const rows = Object.fromEntries([2024,2025,2026].map(year => [year, lookupScoreRank({ year, score: 600, region:'ln', subject:'physics' })]));
const sample = {
  score2026: 600, rank2026: rows[2026].rankEnd,
  score2025: 600, rank2025: rows[2025].rankEnd,
  score2024: 600, rank2024: rows[2024].rankEnd,
  historyMatchLevel: 'exact'
};
const evidence = buildHistoricalScoreRankEvidence(sample);
assert.equal(evidence.version, 'ln-physics-history-evidence-v3967_0');
assert.equal(evidence.comparison.canCompareThreeYears, true);
assert.deepEqual(evidence.comparison.undergraduatePopulation, { 2024:116198, 2025:118109, 2026:119069 });
for (const year of [2024,2025,2026]) {
  assert.equal(evidence.years[year].evidenceState, 'matched');
  assert.equal(evidence.years[year].comparable, true);
  assert.match(historyRankRangeText(evidence.years[year]), /^约第/);
}
const derived = buildHistoricalScoreRankEvidence({ ...sample, rank2024:null });
assert.equal(derived.years[2024].evidenceState, 'derived');
assert.equal(derived.years[2024].comparable, true);
const conflict = buildHistoricalScoreRankEvidence({ ...sample, rank2024:999999 });
assert.equal(conflict.years[2024].evidenceState, 'conflict');
assert.equal(conflict.years[2024].comparable, false);
const missing = buildHistoricalScoreRankEvidence({ score2026:600, rank2026:rows[2026].rankEnd, historyMatchLevel:'unmatched' });
assert.equal(missing.years[2024].evidenceState, 'no-record');
assert.equal(missing.years[2024].comparable, false);
const display = formatHistoricalEvidenceText({ historyEvidence:evidence }, { years:[2025,2024] });
assert.match(display, /2025：600分｜约第/);
assert.match(display, /2024：600分｜约第/);
assert.ok(!display.includes('位次待核验'));
assert.equal(validateScoreRank({ year:2024, score:600, rank:14612 }).status, 'matched');
assert.equal(validateScoreRank({ year:2024, score:600, rank:999999 }).status, 'conflict');

const historicalSummary = { records2024:0, records2025:0, conflicts2024:[], conflicts2025:[] };
const chunkDir = path.join(root, 'fenxi/data/chunks');
for (const name of fs.readdirSync(chunkDir).filter(name => /^rank_.*\.json$/.test(name)).sort()) {
  const payload = JSON.parse(fs.readFileSync(path.join(chunkDir,name),'utf8'));
  const records = Array.isArray(payload) ? payload : payload.records || [];
  for (const record of records) {
    for (const year of [2024,2025]) {
      const score = Number(record[`score${year}`]);
      const rank = Number(record[`rank${year}`]);
      if (!Number.isFinite(score) || !Number.isFinite(rank) || score <= 0 || rank <= 0) continue;
      historicalSummary[`records${year}`] += 1;
      const row = lookupScoreRank({ year, region:'ln', subject:'physics', score });
      if (!row || Number(row.rankEnd) !== rank) {
        historicalSummary[`conflicts${year}`].push({ id:record.id||'', school:record.school||'', major:record.major||'', score, rank, officialRankEnd:row?.rankEnd??null });
      }
    }
  }
}
assert.ok(historicalSummary.records2024 > 5000, `2024 historical coverage ${historicalSummary.records2024}`);
assert.ok(historicalSummary.records2025 > 5000, `2025 historical coverage ${historicalSummary.records2025}`);
assert.deepEqual(historicalSummary.conflicts2024, []);
assert.deepEqual(historicalSummary.conflicts2025, []);

const sourceChecks = {
  normalizer: read('functions/_lib/fenxi-normalizer.js'),
  school: read('ln-rank/js/feature/school-majors/school-all-mode.v3967_0.js'),
  mainCard: read('ln-rank/js/feature/major-pool/render.v3967_0.js'),
  selection: read('ln-rank/js/selection-pool-runtime.v3967_0.js'),
  backgroundBrowser: read('ln-rank/js/academic-background/academic-background-app.v3968_0.js'),
  backgroundService: read('functions/_lib/academic-background-api.js'),
  report: read('functions/_lib/feishu-report-builder.js'),
  selectionReport: read('functions/_lib/feishu-selection-pool-styled-builder.js'),
  ai: read('functions/_lib/ai-card-prompt.js'),
  build: read('tools/ln-2026/build-release.py')
};
assert.match(sourceChecks.normalizer, /buildHistoricalScoreRankEvidence/);
assert.match(sourceChecks.school, /renderThreeYearEvidenceDetail/);
assert.match(sourceChecks.mainCard, /history-score-render\.v3967_0/);
assert.match(sourceChecks.selection, /history-score-render\.v3967_0/);
assert.match(sourceChecks.backgroundBrowser, /formatHistoricalEvidenceText/);
assert.match(sourceChecks.backgroundBrowser, /years: \[2025, 2024\]/);
assert.match(sourceChecks.backgroundService, /historyYears: \[2025, 2024\]/);
assert.match(sourceChecks.report, /formatHistoricalEvidenceText/);
assert.match(sourceChecks.selectionReport, /formatHistoricalEvidenceText/);
assert.match(sourceChecks.ai, /historyEvidence/);
assert.match(sourceChecks.ai, /comparable=true/);
assert.match(sourceChecks.build, /load_rank_population_from_module\(2024, 368\)/);
assert.ok(!sourceChecks.build.includes('max((int(r.get("rank2025")'));

const result = {
  ok:true,
  release:CURRENT_RELEASE.display,
  assetVersion:CURRENT_RELEASE.assetVersion,
  tableSummary,
  historicalCrossCheck:{
    records2024:historicalSummary.records2024,
    records2025:historicalSummary.records2025,
    conflicts2024:0,
    conflicts2025:0
  },
  evidenceStates:['matched','derived','conflict','no-record'],
  comparisonPopulationPolicy:'undergraduate-control-line-cumulative',
  backgroundConsumers:['liaoning','211']
};
fs.writeFileSync(path.join(os.tmpdir(),'three-year-rank-evidence-audit-v3968.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
