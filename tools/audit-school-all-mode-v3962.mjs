import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const app = read('ln-rank/js/app.v3961_0.js');
const state = read('ln-rank/js/state/app-state.js');
const frontend = read('ln-rank/js/feature/school-majors/school-all-mode.v3962_2.js');
const css = read('ln-rank/css/school-all-mode.v3962_2.css');
const page = read('ln-rank/index.html');
const api = read('functions/api/school-majors.js');
const releaseContract = read('functions/_lib/release-contract.js');

assert.ok(app.includes("school-all-mode.v3962_2.js?v=3962_2"), 'main app must mount current school-all mode');
assert.ok(state.includes('resultMode: "score-bands"'), 'state must keep score-bands as default');
assert.ok(state.includes('schoolSelection:'), 'state must own school selection');
assert.ok(state.includes('schoolAll:'), 'state must own school-all request state');
assert.ok(page.includes('id="schoolViewModeMount"'), 'page must own the static school mode mount');
assert.ok(page.includes('id="schoolAllResultsPanel"'), 'page must own the static school results mount');

for (const marker of [
  'resolveCompactSchoolResource','createSelectionPoolAdapter','buildTongxueSchoolHref','UI_ACTION_COPY',
  "const API_PATH = '/api/school-majors'",'schoolEntity','candidateScore','data-school-detail-toggle',
  'ui-button ui-button--compact','ui-chip ui-chip--compact',"mountPolicy: 'static-shared-ui'"
]) assert.ok(frontend.includes(marker), `school-all frontend missing ${marker}`);

for (const forbidden of ['MutationObserver','setTimeout(','lnRank.schoolAll.selectionPool','new Map(SCHOOL','injectStylesheet','ensureModeMount','ensureWorkspace','document.createElement','insertAdjacentElement']) {
  assert.ok(!frontend.includes(forbidden), `school-all frontend contains forbidden owner: ${forbidden}`);
}

for (const marker of [
  '../_lib/ln-rank-manifest.js','../_lib/fenxi-normalizer.js','../_lib/standard-major-mapper.js',
  '../_lib/school-display-tags.js','../_lib/special-project-policy.js','canonical-position.v3960_0.js',
  'school-identity-center.js',"mode: 'school-all'","mode: 'shared-records-school-exact'"
]) assert.ok(api.includes(marker), `school-all API missing shared owner ${marker}`);

assert.ok(!api.includes("from '../_lib/fenxi-manifest.js'"), 'school-all API must not use historical manifest');
assert.ok(!api.includes('SCHOOL_ENTITIES_V150=Object.freeze'), 'school identities must not be duplicated in API');
assert.ok(releaseContract.includes('LN_RANK_RELEASE_CONTRACT'), 'release contract must keep LN_RANK_RELEASE_CONTRACT');
assert.ok(releaseContract.includes('RELEASE_CONTRACT'), 'release contract must keep RELEASE_CONTRACT');

for (const marker of [
  'body[data-result-mode="school-all"]','container-name:school-results','@container school-results (max-width:1040px)',
  '@container school-results (max-width:600px)','@container school-results (max-width:260px)',
  '.school-major-row','.school-all-summary'
]) assert.ok(css.includes(marker), `responsive school-all CSS missing ${marker}`);
assert.ok(!css.includes('.ui-mode-switch'), 'school result CSS must not own the shared mode switch');
assert.ok(!css.includes('.school-view-mode'), 'legacy school mode control CSS must remain inactive');

const originalFetch = globalThis.fetch;
globalThis.fetch = async input => {
  const raw = input instanceof Request ? input.url : String(input);
  const url = new URL(raw, 'http://local.test');
  if (!url.pathname.startsWith('/fenxi/')) throw new Error(`unexpected fetch in audit: ${url.pathname}`);
  const localPath = path.join(root, url.pathname.replace(/^\/+/, ''));
  if (!fs.existsSync(localPath)) return new Response('not found', { status: 404 });
  return new Response(fs.readFileSync(localPath), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
};

const { onRequest } = await import(pathToFileURL(path.join(root, 'functions/api/school-majors.js')).href + `?audit=${Date.now()}`);
async function call(query) {
  const request = new Request(`http://local.test/api/school-majors?${query}`, { method: 'GET' });
  const response = await onRequest({ request, env: {} });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(payload.ok, true, JSON.stringify(payload));
  return payload;
}

try {
  const mainNoScore = await call('schoolEntityId=neu-main&school=%E4%B8%9C%E5%8C%97%E5%A4%A7%E5%AD%A6&limit=100');
  const main580 = await call('schoolEntityId=neu-main&school=%E4%B8%9C%E5%8C%97%E5%A4%A7%E5%AD%A6&candidateScore=580&limit=100');
  const main620 = await call('schoolEntityId=neu-main&school=%E4%B8%9C%E5%8C%97%E5%A4%A7%E5%AD%A6&candidateScore=620&limit=100');
  const qhd = await call('schoolEntityId=neu-qhd&school=%E4%B8%9C%E5%8C%97%E5%A4%A7%E5%AD%A6%E7%A7%A6%E7%9A%87%E5%B2%9B%E5%88%86%E6%A0%A1&candidateScore=580&limit=100');

  assert.ok(mainNoScore.meta.filteredTotal > 0, '东北大学 should have active 2026 records');
  assert.ok(qhd.meta.filteredTotal > 0, '东北大学秦皇岛分校 should have active 2026 records');
  assert.equal(mainNoScore.meta.filteredTotal, main580.meta.filteredTotal, 'score must not change full-school total');
  assert.equal(main580.meta.filteredTotal, main620.meta.filteredTotal, 'different scores must not change full-school total');
  assert.equal(mainNoScore.meta.schoolEntity.entityId, 'neu-main');
  assert.equal(qhd.meta.schoolEntity.entityId, 'neu-qhd');
  assert.ok(mainNoScore.records.every(record => record.school === '东北大学'), 'main school results must not mix branch records');
  assert.ok(qhd.records.every(record => record.school === '东北大学秦皇岛分校'), 'branch results must be exact');
  const mainIds = new Set(mainNoScore.records.map(record => record.id));
  assert.ok(qhd.records.every(record => !mainIds.has(record.id)), 'main and branch record identities must not overlap');
  assert.ok(main580.records.every(record => Number.isFinite(Number(record.scoreDelta2026))), 'score context must add position deltas');
  assert.ok(main580.records.every(record => record.schoolCode2026 && record.majorCode2026), 'records must retain 2026 school/major codes');
  assert.ok(mainNoScore.records.every((record, index, rows) => index === 0 || Number(rows[index - 1].score2026) >= Number(record.score2026)), 'default sort must be score-desc');
  assert.equal(mainNoScore.summary.regularCount + mainNoScore.summary.specialCount, mainNoScore.meta.filteredTotal, 'special projects must remain included in the full-school total');
  assert.equal(mainNoScore.meta.dataBoundary.includes('不代表该校全国全部本科专业'), true);
  assert.equal(mainNoScore.source.mode, 'shared-records-school-exact');

  console.log(JSON.stringify({
    ok: true,
    mode: 'school-all-mode-v3962_2',
    mountPolicy: 'static-shared-ui',
    northeastUniversity: mainNoScore.meta.filteredTotal,
    northeastUniversityQinhuangdao: qhd.meta.filteredTotal,
    scoreInvariant: [mainNoScore.meta.filteredTotal, main580.meta.filteredTotal, main620.meta.filteredTotal],
    sharedSelectionPool: true,
    protectedReleaseExports: true
  }));
} finally {
  globalThis.fetch = originalFetch;
}
