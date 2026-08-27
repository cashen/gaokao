import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSchoolAllHref, buildTongxueSchoolHref } from '../shared/resources/schools/school-resource-center.js';
import { readTongxueDirectHandoff } from '../tongxue/app/tongxue-direct-handoff-v155.js';

const stale = buildTongxueSchoolHref({ school: '辽东学院', entityId: 'admission:辽东学院' });
assert.equal(stale, '/tongxue/?school=%E8%BE%BD%E4%B8%9C%E5%AD%A6%E9%99%A2');
assert.doesNotMatch(stale, /admission%3A|entity=/, 'admission 临时标识不能进入 Tongxue 链接');

const canonical = buildTongxueSchoolHref({ school: '哈尔滨工业大学（威海）', entityId: 'hit-weihai' });
assert.match(canonical, /school=%E5%93%88%E5%B0%94%E6%BB%A8%E5%B7%A5%E4%B8%9A%E5%A4%A7%E5%AD%A6%EF%BC%88%E5%A8%81%E6%B5%B7%EF%BC%89/);
assert.match(canonical, /entity=hit-weihai/);

const schoolHref = buildSchoolAllHref({ school: '东南大学', majorKeyword: '机械工程/测控技术与仪器', score: 640 });
const schoolUrl = new URL(`https://gaokao.test${schoolHref}`);
assert.equal(schoolUrl.pathname, '/ln-rank/');
assert.equal(schoolUrl.searchParams.get('mode'), 'school-all');
assert.equal(schoolUrl.searchParams.get('school'), '东南大学');
assert.equal(schoolUrl.searchParams.get('majorKeyword'), '机械工程/测控技术与仪器');
assert.equal(schoolUrl.searchParams.get('score'), '640');
assert.equal(schoolUrl.searchParams.get('entity'), null);

const legacyHandoff = readTongxueDirectHandoff('?school=%E8%BE%BD%E4%B8%9C%E5%AD%A6%E9%99%A2&entity=admission%3A%E8%BE%BD%E4%B8%9C%E5%AD%A6%E9%99%A2');
assert.equal(legacyHandoff.school, '辽东学院');
assert.equal(legacyHandoff.entityId, '');
assert.equal(legacyHandoff.shouldAutoQuery, true);

const majorAll = fs.readFileSync('ln-rank/js/feature/major-all/major-all-mode.v001.js', 'utf8');
const majorCss = fs.readFileSync('ln-rank/css/major-all-mode.v001.css', 'utf8');
const api = fs.readFileSync('functions/api/tongxue-summary.js', 'utf8');
const runtimeController = fs.readFileSync('tongxue/app/tongxue-runtime-controller-v159.js', 'utf8');
const release = fs.readFileSync('shared/resources/release/current-release.js', 'utf8');
const manifest = fs.readFileSync('shared/resources/release/active-resource-manifest.v3990_2.js', 'utf8');
const generation = fs.readFileSync('ln-rank/site-active-generation.v3990_2.json', 'utf8');
assert.match(majorAll, /buildSchoolAllHref/);
assert.match(majorAll, /class="major-all-school-link"/);
assert.match(majorAll, /majorKeyword:draftMajorText(),score:scoreValue()||''/);
assert.match(majorCss, /\.major-all-school-link/);
assert.match(api, /isLegacyAdmissionHandoff/);
assert.match(api, /legacyEntityFallback=true/);
assert.match(runtimeController, /requestedEntityId/);
assert.match(runtimeController, /const entityId = entity\?\.entityId \|\| ''/);
assert.match(release, /lnRankSchoolEntryVersion: 'ln-rank-school-entry-v001'/);
assert.match(release, /tongxueEntityHandoffVersion: 'tongxue-entity-handoff-v001'/);
assert.match(release, /lnRankCacheRevision: 'r034-worker-1102-bounded-api'/);
assert.match(manifest, /CURRENT_RELEASE\.lnRankCacheRevision/);
assert.match(generation, /major-filter-context-v004&r=r034-worker-1102-bounded-api/);

console.log(JSON.stringify({
  ok: true,
  staleAdmissionHandoff: 'name-only fallback',
  canonicalHandoff: 'canonical entity preserved',
  majorSchoolLink: 'native school-all href with major and score context',
  revision: 'r034-worker-1102-bounded-api'
}, null, 2));
