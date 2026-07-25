import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const moduleUrl = file => `${pathToFileURL(path.join(root, file)).href}?audit=${Date.now()}-${Math.random()}`;

const page = read('ln-rank/index.html');
const app = read('ln-rank/js/app.v3963_1.js');
const appRuntime = read('ln-rank/js/app-runtime.v3963_1.js');
const orchestrator = read('ln-rank/js/workspace/selection-workspace-orchestrator.v3963_1.js');
const schoolRuntime = read('ln-rank/js/feature/school-majors/school-all-mode.v3963_1.js');
const scoreRenderer = read('ln-rank/js/feature/major-pool/render.v3963_1.js');
const schoolApi = read('functions/api/school-majors.js');
const scoreApi = read('functions/api/major-bands.js');
const releaseContract = read('functions/_lib/release-contract.js');
const uiRegistry = read('shared/ui/ui-registry.v3963_1.js');

const { CURRENT_RELEASE } = await import(moduleUrl('shared/resources/release/current-release.js'));
const {
  ALGORITHM_ORCHESTRATION_VERSION
} = await import(moduleUrl('shared/algorithms/algorithm-registry.js'));
const {
  resolveCanonicalPosition,
  rankWindowsForCandidate
} = await import(moduleUrl('shared/algorithms/position/canonical-position.v3963_0.js'));

assert.equal(CURRENT_RELEASE.display, 'v3.9.63.1');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3963_1');
assert.equal(CURRENT_RELEASE.searchIntentVersion, 'score-school-search-v3963_1');
assert.equal(CURRENT_RELEASE.uiOrchestrationVersion, 'ui-orchestration-v3963_1');
assert.equal(CURRENT_RELEASE.selectionWorkspaceVersion, 'selection-workspace-orchestration-v3963_1');
assert.equal(CURRENT_RELEASE.schoolAllModeVersion, 'school-all-mode-v3963_1');
assert.equal(CURRENT_RELEASE.runtimeCacheVersion, 'runtime-cache-coherence-v3963_1');
assert.equal(CURRENT_RELEASE.algorithmOrchestrationVersion, ALGORITHM_ORCHESTRATION_VERSION);

for (const marker of [
  'id="schoolViewModeMount"',
  '按分数找学校和专业',
  '按学校看全部专业',
  'id="schoolAllResultsPanel"',
  'id="candidateScoreLabel"',
  'id="searchWorkbenchTitle"',
  'data-release="v3.9.63.1"',
  'data-runtime-state="loading"',
  'id="runtimeStatusPanel"',
  'app.v3963_1.js?v=3963_1',
  'mode-switch.v3963_0.css?v=3963_0',
  'selection-workspace.v3963_1.css?v=3963_1',
  'school-all-mode.v3963_0.css?v=3963_0'
]) assert.ok(page.includes(marker), `page missing ${marker}`);
assert.ok(page.indexOf('id="schoolViewModeMount"') < page.indexOf('id="candidateScore"'), 'search intent switch must precede both flows');
assert.ok(page.indexOf('id="schoolViewModeMount"') < page.indexOf('class="search-grid-top'), 'search intent switch must not be nested in a filter field');

for (const marker of [
  'submitActiveSearch',
  'setResultMode',
  'restoreSearchIntentFromUrl',
  'gaokao:school-search-submit',
  'gaokao:view-school-all',
  'gaokao:school-search-state',
  'SCHOOL_FLOW_STEPS',
  "version: 'selection-workspace-orchestration-v3963_1'"
]) assert.ok(orchestrator.includes(marker), `shared search owner missing ${marker}`);
assert.equal((orchestrator.match(/getElementById\('queryButton'\)\?\.addEventListener\('click'/g) || []).length, 1, 'query button must have one active owner');

for (const forbidden of [
  "getElementById('queryButton')",
  'mobileDirtyButton',
  'schoolViewModeMount',
  'stopImmediatePropagation',
  'MutationObserver',
  'setTimeout(',
  'document.createElement',
  'insertAdjacentElement',
  'ensureModeMount',
  'ensureWorkspace',
  'injectStylesheet'
]) assert.ok(!schoolRuntime.includes(forbidden), `school result owner contains shared/runtime patch ${forbidden}`);
for (const marker of [
  "const API_PATH = '/api/school-majors'",
  'gaokao:school-search-submit',
  'gaokao:school-search-state',
  "version: 'school-all-mode-v3963_1'",
  "sharedControlOwner: 'selection-workspace-orchestration-v3963_1'",
  '普通招生记录',
  '需要单独核验的特殊项目',
  'syncSelectionActions'
]) assert.ok(schoolRuntime.includes(marker), `school result owner missing ${marker}`);
assert.ok(app.includes("import('./app-runtime.v3963_1.js?v=3963_1')"), 'single bootstrap must load the current runtime');
assert.ok(app.includes("setRuntimeState('error')"), 'single bootstrap must expose initialization failure');
assert.ok(appRuntime.includes('selectionWorkspaceReady'), 'runtime must wait for the workspace owner');
assert.ok(appRuntime.includes('schoolAllModeReady'), 'runtime must wait for the school owner');

assert.ok(scoreRenderer.includes('data-view-school-all'), 'score cards need a direct school-all handoff');
assert.ok(scoreRenderer.includes("new CustomEvent('gaokao:view-school-all'"), 'score cards must use the shared handoff event');
assert.ok(!scoreRenderer.includes('stopImmediatePropagation'), 'score result owner must not suppress sibling owners');

for (const api of [schoolApi, scoreApi]) {
  assert.ok(api.includes('buildKeywordQuery'), 'both searches must use the shared keyword query');
  assert.ok(api.includes('matchMajorProject'), 'both searches must use the shared major matcher');
}
assert.ok(schoolApi.includes("keywordMode: 'any'"), 'school keyword semantics must disclose OR matching');
assert.ok(scoreApi.includes('schoolEntityId'), 'score search must preserve exact school entity filtering');
assert.ok(scoreApi.includes('canonical_rank_primary_2026_position'), 'score search must disclose rank-primary classification');

for (const marker of [
  "searchIntentStateOwner: 'selection-workspace-orchestrator'",
  "sharedSubmitOwner: 'selection-workspace-orchestrator'",
  "schoolResultOwner: 'school-all-mode'",
  "schoolKeywordMode: 'any'"
]) assert.ok(uiRegistry.includes(marker), `UI registry missing ${marker}`);
for (const marker of [
  'LN_RANK_RELEASE_CONTRACT',
  'RELEASE_CONTRACT',
  'dualSearchIntentContract: true',
  'singleSearchActionOwnerContract: true',
  'rankPrimary2026PositionContract: true'
]) assert.ok(releaseContract.includes(marker), `release contract missing ${marker}`);

const canonical = resolveCanonicalPosition({
  candidateScore: 600,
  candidateRank: 14235,
  recordScore: 595,
  recordRank: 16500,
  rangePreset: 'standard'
});
assert.equal(canonical.bandKey, 'near');
assert.equal(canonical.rankGap, -2265);
assert.equal(canonical.classificationBasis, 'rank-primary-2026-position');
assert.equal(canonical.evidenceStrength, 'strong');
assert.ok(rankWindowsForCandidate(14235, 'standard').steady.maxRank > 16500);

for (const file of ['ln-rank/active-assets.json', 'ln-rank/release-meta.json']) {
  const meta = json(file);
  assert.equal(meta.version, 'v3.9.63.1');
  assert.equal(meta.assetVersion, 'v3963_1');
  assert.equal(meta.searchIntentVersion, 'score-school-search-v3963_1');
  assert.equal(meta.runtimeCacheContractVersion, 'runtime-cache-coherence-v3963_1');
  assert.equal(meta.dualSearchIntentContract, true);
  assert.equal(meta.schoolKeywordAnyModeContract, true);
  assert.equal(meta.rankPrimary2026PositionContract, true);
  assert.ok(meta.jsEntry.includes('js/workspace/selection-workspace-orchestrator.v3963_1.js'));
  assert.ok(meta.jsEntry.includes('js/feature/school-majors/school-all-mode.v3963_1.js'));
  assert.ok(meta.cssEntry.includes('../shared/ui/components/mode-switch.v3963_0.css'));
  assert.ok(meta.cssEntry.includes('css/school-all-mode.v3963_0.css'));
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async input => {
  const raw = input instanceof Request ? input.url : String(input);
  const url = new URL(raw, 'http://local.test');
  if (!url.pathname.startsWith('/fenxi/')) throw new Error(`unexpected local audit fetch: ${url.pathname}`);
  const localPath = path.join(root, url.pathname.replace(/^\/+/, ''));
  if (!fs.existsSync(localPath)) return new Response('not found', { status: 404 });
  return new Response(fs.readFileSync(localPath), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
};

async function call(handler, pathname, query) {
  const response = await handler({
    request: new Request(`http://local.test${pathname}?${query}`, { method: 'GET' }),
    env: {}
  });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(payload.ok, true, JSON.stringify(payload));
  return payload;
}

try {
  const { onRequest: schoolHandler } = await import(moduleUrl('functions/api/school-majors.js'));
  const { onRequest: scoreHandler } = await import(moduleUrl('functions/api/major-bands.js'));
  const schoolBase = 'schoolEntityId=neu-main&school=%E4%B8%9C%E5%8C%97%E5%A4%A7%E5%AD%A6&limit=100';
  const noScore = await call(schoolHandler, '/api/school-majors', schoolBase);
  const at580 = await call(schoolHandler, '/api/school-majors', `${schoolBase}&candidateScore=580&sort=position-near`);
  const at620 = await call(schoolHandler, '/api/school-majors', `${schoolBase}&candidateScore=620&sort=position-near`);
  const keyword = await call(schoolHandler, '/api/school-majors', `${schoolBase}&candidateScore=600&majorKeyword=%E7%94%B5%E6%B0%94%2F%E8%87%AA%E5%8A%A8%E5%8C%96`);
  const branch = await call(schoolHandler, '/api/school-majors', 'schoolEntityId=neu-qhd&school=%E4%B8%9C%E5%8C%97%E5%A4%A7%E5%AD%A6%E7%A7%A6%E7%9A%87%E5%B2%9B%E5%88%86%E6%A0%A1&candidateScore=600&limit=100');

  assert.ok(noScore.meta.filteredTotal > 0);
  assert.equal(noScore.meta.filteredTotal, at580.meta.filteredTotal);
  assert.equal(at580.meta.filteredTotal, at620.meta.filteredTotal);
  assert.equal(noScore.meta.schoolEntity.entityId, 'neu-main');
  assert.equal(branch.meta.schoolEntity.entityId, 'neu-qhd');
  assert.ok(noScore.records.every(record => record.school === '东北大学'));
  assert.ok(branch.records.every(record => record.school === '东北大学秦皇岛分校'));
  assert.equal(keyword.meta.keywordMode, 'any');
  assert.deepEqual(keyword.meta.keywordTerms, ['电气', '自动化']);
  assert.ok(keyword.meta.filteredTotal > 0, '电气/自动化 must be an OR query, not an impossible combined substring');
  assert.ok(keyword.records.every(record => record.matchReason || record.matchedKeyword || record.matchedTerms?.length));
  assert.ok(at580.records.every(record => record.canonicalPosition?.classificationBasis === 'rank-primary-2026-position'));
  assert.equal(noScore.summary.regularCount + noScore.summary.specialCount, noScore.meta.filteredTotal);

  const score = await call(
    scoreHandler,
    '/api/major-bands',
    'candidateScore=630&rangePreset=wide&region=all&schoolKeyword=%E4%B8%9C%E5%8C%97%E5%A4%A7%E5%AD%A6&schoolEntityId=neu-main&majorKeyword=%E7%94%B5%E6%B0%94%2F%E8%87%AA%E5%8A%A8%E5%8C%96&bottomLineMode=all&specialProjectMode=show_eligibility_projects&limit=80'
  );
  const scoreRecords = ['upper', 'near', 'steady'].flatMap(key => score.bands[key].records || []);
  assert.ok(scoreRecords.length > 0);
  assert.ok(scoreRecords.every(record => record.school === '东北大学'));
  assert.equal(score.meta.schoolMatchMode, 'exact-entity');
  assert.equal(score.meta.classificationMode, 'canonical_rank_primary_2026_position');
  assert.ok(['upper', 'near', 'steady'].every(key => /位/.test(score.bands[key].rangeText)));

  console.log(JSON.stringify({
    ok: true,
    contract: 'dual-search-intent-v3963_1',
    schoolTotal: noScore.meta.filteredTotal,
    keywordTotal: keyword.meta.filteredTotal,
    exactScoreRecords: scoreRecords.length,
    scoreInvariant: [noScore.meta.filteredTotal, at580.meta.filteredTotal, at620.meta.filteredTotal],
    protectedReleaseExports: true
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
