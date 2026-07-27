import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { RESOURCE_EXECUTION_REGISTRY, RESOURCE_EXECUTION_VERSION } from '../shared/governance/resource-execution-contract.v3968_0.js';
import { UI_COMPONENT_REGISTRY } from '../shared/ui/component-registry.v3967_0.js';
import { ALGORITHM_RESOURCE_REGISTRY } from '../shared/algorithms/algorithm-registry.js';

const read = rel => fs.readFileSync(rel, 'utf8');
const active = JSON.parse(read('ln-rank/active-assets.json'));
const resolveActive = rel => rel.startsWith('../') ? rel.slice(3) : path.posix.join('ln-rank', rel);

assert.equal(CURRENT_RELEASE.display, 'v3.9.68.0');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3968_0');
assert.equal(CURRENT_RELEASE.resourceExecutionVersion, RESOURCE_EXECUTION_VERSION);
assert.equal(RESOURCE_EXECUTION_VERSION, 'resource-execution-v3968_0');
assert.equal(CURRENT_RELEASE.resourceOwners.resourceExecution, '/shared/governance/resource-execution-contract.v3968_0.js');
assert.equal(RESOURCE_EXECUTION_REGISTRY.historyEvidence.presenter, '/ln-rank/js/feature/major-pool/history-score-render.v3967_0.js');
assert.equal(RESOURCE_EXECUTION_REGISTRY.academicBackground.provider, '/functions/_lib/academic-background-provider.js');
assert.equal(RESOURCE_EXECUTION_REGISTRY.academicBackground.service, '/functions/_lib/academic-background-api.js');
assert.equal(RESOURCE_EXECUTION_REGISTRY.academicBackground.matcher, '/shared/algorithms/background/academic-background-matcher.v3968_0.js');
assert.equal(UI_COMPONENT_REGISTRY.historyEvidence.rootClass, 'ln-history-evidence');
assert.equal(ALGORITHM_RESOURCE_REGISTRY.resultRanking, '/shared/algorithms/ranking/result-ranking.v3967_0.js');
assert.equal(ALGORITHM_RESOURCE_REGISTRY.trendInterpretation, '/shared/algorithms/trend/trend-interpretation.v3967_0.js');
assert.equal(ALGORITHM_RESOURCE_REGISTRY.historicalRankSelection, '/shared/algorithms/position/historical-rank-selection.v3967_0.js');
assert.equal(ALGORITHM_RESOURCE_REGISTRY.academicBackgroundMatcher, '/shared/algorithms/background/academic-background-matcher.v3968_0.js');
assert.equal(RESOURCE_EXECUTION_REGISTRY.auxiliaryLiaoningKeySubjects.allowedAdapters[0], '/just_for_liaoning.html');

for (const required of [
  '../shared/governance/resource-execution-contract.v3968_0.js',
  '../shared/ui/component-registry.v3967_0.js',
  '../shared/algorithms/ranking/result-ranking.v3967_0.js',
  '../shared/algorithms/trend/trend-interpretation.v3967_0.js',
  '../shared/resources/trends/liaoning-major-trend.v3967_0.js',
  '../shared/algorithms/position/historical-rank-selection.v3967_0.js',
  '../shared/resources/auxiliary/liaoning-key-subjects.v3967_0.js',
  '../shared/resources/background/academic-background-contract.v3968_0.js',
  '../shared/resources/background/academic-background-source-registry.v3968_0.js',
  '../shared/algorithms/background/academic-background-matcher.v3968_0.js',
  'js/app.v3968_0.js',
  'js/app-runtime.v3968_0.js',
  'js/selection-pool.v3968_0.js',
  'js/workspace/result-commit.v3967_0.js',
  'js/workspace/family-card-presenter.v3967_0.js',
  'js/feature/major-pool/history-score-render.v3967_0.js',
  'js/feature/selection-pool/store.v3967_0.js',
  'js/feature/report/payload-builder.v3967_0.js',
  'js/feature/feishu/index.v3967_0.js',
  'js/feature/diagnose/api.v3967_0.js',
  'js/academic-background/academic-background-app.v3968_0.js'
]) assert.ok(active.jsEntry.includes(required), `active graph missing ${required}`);
assert.equal(active.controlLinesOwnership, 'derived-compatibility-only');
assert.equal(active.controlLinesSource, '../shared/resources/exam/liaoning-physics.js');
assert.equal(active.academicBackgroundOfficialSourceGateContract, true);
assert.equal(active.academicBackgroundEvidenceYearSeparateContract, true);
assert.deepEqual(active.academicBackgroundScopes, ['liaoning', '211']);
assert.deepEqual(active.academicBackgroundAdmissionYears, [2026, 2025, 2024]);

for (const forbiddenActive of [
  'js/app.v3967_0.js',
  'js/app-runtime.v3967_0.js',
  'js/selection-pool.v3967_0.js',
  'js/local-mainline/local-mainline-app.v3967_0.js',
  'js/211-mainline/211-mainline-app.v3951_0.js',
  '../shared/governance/resource-execution-contract.v3967_0.js',
  '../shared/resources/release/release-presenter.v3967_0.js',
  '../shared/resources/release/runtime-cache-contract.v3967_0.js'
]) assert.ok(!active.jsEntry.includes(forbiddenActive), `legacy owner still active: ${forbiddenActive}`);

const majorApi = read('functions/api/major-bands.js');
const schoolApi = read('functions/api/school-majors.js');
assert.match(majorApi, /result-ranking\.v3967_0/);
assert.match(schoolApi, /result-ranking\.v3967_0/);
assert.ok(!majorApi.includes('141691'), 'major-bands hardcodes table population');
assert.ok(!schoolApi.includes('function compareRecords('), 'school API still owns local comparator');
assert.match(majorApi, /getRankPopulation/);

const forbiddenHistory = /\b(?:score2024|rank2024|score2025|rank2025|historyCompare)\b/;
const activeAdapters = new Set([
  ...RESOURCE_EXECUTION_REGISTRY.historyEvidence.allowedAdapters.map(rel => rel.replace(/^\//, '')),
  'shared/governance/resource-execution-contract.v3968_0.js'
]);
const activeJs = active.jsEntry.map(resolveActive).filter(rel => fs.existsSync(rel));
for (const rel of activeJs) {
  if (activeAdapters.has(rel)) continue;
  assert.ok(!forbiddenHistory.test(read(rel)), `${rel} bypasses historyEvidence execution owner`);
}

const governedServerConsumers = [
  'functions/_lib/ai-card-prompt.js',
  'functions/_lib/ai-card-rules.js',
  'functions/_lib/advisor-fact-builder.js',
  'functions/_lib/path-ai-prompt.js',
  'functions/_lib/report-snapshot-builder.js',
  'functions/_lib/feishu-report-builder.js',
  'functions/_lib/feishu-selection-pool-report-builder.js',
  'functions/_lib/feishu-selection-pool-styled-builder.js',
  'functions/_lib/kb/review-checklist-builder.js',
  'functions/api/card-diagnose.js'
];
for (const rel of governedServerConsumers) assert.ok(!forbiddenHistory.test(read(rel)), `${rel} directly consumes historical compatibility fields`);
for (const adapter of RESOURCE_EXECUTION_REGISTRY.historyEvidence.allowedAdapters.map(rel => rel.replace(/^\//, '')).filter(rel => rel.startsWith('functions/'))) {
  assert.ok(fs.existsSync(adapter), `registered history adapter missing: ${adapter}`);
  assert.ok(read(adapter).includes('historyEvidence') || adapter.endsWith('fenxi-catalog.js'), `${adapter} adapter omits canonical evidence`);
}
assert.ok(RESOURCE_EXECUTION_REGISTRY.reports.payloadOwner.endsWith('payload-builder.v3967_0.js'), 'report payload owner is not current');

for (const [rel, scope] of [['functions/api/local-mainline.js', 'liaoning'], ['functions/api/211-mainline.js', '211']]) {
  const source = read(rel);
  assert.match(source, /handleAcademicBackgroundRequest/);
  assert.match(source, new RegExp(`'${scope}'`));
  assert.ok(!source.includes('loadBackgroundMatchedRecords'), `${rel} still owns data loading`);
  assert.ok(!source.includes('score2025'), `${rel} still owns legacy admission facts`);
}
for (const [rel, scope] of [['ln-rank/local-mainline.html', 'liaoning'], ['ln-rank/211-mainline.html', '211']]) {
  const html = read(rel);
  assert.match(html, new RegExp(`data-background-scope="${scope}"`));
  assert.match(html, /academic-background-app\.v3968_0\.js\?v=3968_0/);
  assert.ok(!/local-mainline-app\.v3967_0|211-mainline-app\.v3951_0/.test(html), `${rel} activates legacy background runtime`);
}
const backgroundBrowser = read('ln-rank/js/academic-background/academic-background-app.v3968_0.js');
assert.match(backgroundBrowser, /formatHistoricalEvidenceText/);
assert.match(backgroundBrowser, /\/api\/academic-background/);
assert.ok(!forbiddenHistory.test(backgroundBrowser), 'background browser bypasses canonical history evidence');
const backgroundService = read('functions/_lib/academic-background-api.js');
assert.match(backgroundService, /rank-distance-2026/);
assert.match(backgroundService, /matchAcademicBackground/);
assert.match(backgroundService, /historyYears: \[2025, 2024\]/);

const auxiliaryPage = read('just_for_liaoning.html');
assert.match(auxiliaryPage, /classifyHistoricalRankSelection/);
assert.match(auxiliaryPage, /resolveHistoricalRankChange/);
assert.ok(!auxiliaryPage.includes('const ratio = target \/ my'), 'auxiliary page still owns historical rank thresholds');

const presenter = read('ln-rank/js/feature/major-pool/history-score-render.v3967_0.js');
for (const legacy of ['history-score--appendix','class="history-score','class="history-evidence']) assert.ok(!presenter.includes(legacy), `legacy presenter class ${legacy}`);
assert.match(presenter, /data-ui-component="history-evidence"/);
assert.ok(!read('ln-rank/js/workspace/family-card-presenter.v3967_0.js').includes('rewriteHistory('), 'family presenter still reparses rendered history DOM');

for (const stale of [
  '.github/workflows/bootstrap-release-v3966.yml',
  '.github/workflows/bootstrap-v3966-snapshot.yml',
  '.github/workflows/prepare-v3965.yml',
  '.github/workflows/materialize-v3968-release.yml',
  '.github/workflows/materialize-v3968-release-commit-first.yml',
  '.github/workflows/diagnose-v3968-audit.yml',
  '.github/workflows/patch-v3968-background-year-copy.yml',
  '.github/workflows/patch-v3968-background-year-copy-commit-first.yml',
  '.github/workflows/verify-v3968-development.yml',
  'v3968-audit-diagnostic.txt',
  'tools/run-release-v3966.txt',
  'tools/run-v3966-snapshot.txt'
]) assert.ok(!fs.existsSync(stale), `stale self-mutating or diagnostic mechanism remains: ${stale}`);

console.log(JSON.stringify({
  ok: true,
  version: RESOURCE_EXECUTION_VERSION,
  activeJs: activeJs.length,
  governedServerConsumers: governedServerConsumers.length,
  backgroundOwner: RESOURCE_EXECUTION_REGISTRY.academicBackground.provider,
  backgroundScopes: active.academicBackgroundScopes,
  explicitAdapters: [...activeAdapters]
}, null, 2));
