import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildMajorMinScoreHref,
  buildSchoolMinScoreHref,
  buildMinScoreEntryModel,
  sanitizeMinScoreReturnTarget
} from '../shared/resources/admissions/min-score-navigation.v001.js';
import { buildSchoolAllHref } from '../shared/resources/schools/school-resource-center.js';

const read = path => fs.readFileSync(path, 'utf8');

const majorHref = buildMajorMinScoreHref({
  majorCode: '080601',
  majorName: '电气工程及其自动化',
  returnTo: '/major-path/?major=080601',
  sourceSurface: 'major-path'
});
const majorParams = new URL(majorHref, 'https://gaokao.powers.org.cn').searchParams;
assert.equal(majorParams.get('mode'), 'major-all');
assert.equal(majorParams.get('majorKeyword'), '电气工程及其自动化');
assert.equal(majorParams.get('majorCode'), '080601');
assert.equal(majorParams.get('autoQuery'), '1');
assert.equal(majorParams.get('returnTo'), '/major-path/?major=080601');
assert.equal(majorParams.get('sourceSurface'), 'major-path');
assert.equal(majorParams.get('focus'), 'major-all');
assert.equal(new URL(majorHref, 'https://gaokao.powers.org.cn').hash, '#majorAllResultsPanel');

const schoolHref = buildSchoolMinScoreHref({
  school: '测试大学',
  entityId: 'admission:temporary-school',
  returnTo: '/tongxue/?school=测试大学',
  sourceSurface: 'tongxue-school'
});
const schoolParams = new URL(schoolHref, 'https://gaokao.powers.org.cn').searchParams;
assert.equal(schoolParams.get('mode'), 'school-all');
assert.equal(schoolParams.get('school'), '测试大学');
assert.equal(schoolParams.get('schoolEntity'), null, 'temporary admission identity must not cross the boundary');
assert.equal(schoolParams.get('autoQuery'), '1');
assert.equal(schoolParams.get('focus'), 'school-all');
assert.equal(new URL(schoolHref, 'https://gaokao.powers.org.cn').hash, '#schoolAllResultsPanel');
assert.equal(schoolParams.get('returnTo'), '/tongxue/?school=%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6');
const schoolAllHref = buildSchoolAllHref({ school: '测试大学', focus: 'school-all' });
const schoolAllUrl = new URL(`https://gaokao.test${schoolAllHref}`);
assert.equal(schoolAllUrl.searchParams.get('focus'), 'school-all');
assert.equal(schoolAllUrl.hash, '#schoolAllResultsPanel');

assert.equal(sanitizeMinScoreReturnTarget('https://evil.example/steal'), '/ln-rank/');
assert.equal(sanitizeMinScoreReturnTarget('javascript:alert(1)'), '/ln-rank/');
assert.equal(sanitizeMinScoreReturnTarget('/tongxue/?school=测试大学'), '/tongxue/?school=%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6');
assert.equal(buildMinScoreEntryModel({ kind: 'major', majorCode: '080601' }).label, '查这个专业在辽宁各校的最低分');
assert.equal(buildMinScoreEntryModel({ kind: 'school', school: '测试大学' }).label, '查这所学校在辽宁各专业的最低分');

const majorPath = read('major-path/app.v005.js');
const majorPathView = read('shared/resources/majors/undergrad-graduate-pathway-view.v001.js');
const tongxue = read('tongxue/app/tongxue-runtime-result-view-v159.js');
const majorAll = read('ln-rank/js/feature/major-all/major-all-mode.v001.js');
const schoolAll = read('ln-rank/js/feature/school-majors/school-all-mode.v3969_2.js');
const workspace = read('ln-rank/js/workspace/selection-workspace-orchestrator.v3969_2.js');
const runtime = read('ln-rank/js/app-runtime.v3990_3.js');
const release = read('shared/resources/release/current-release.js');
const majorIndex = read('major-path/index.html');
const tongxueIndex = read('tongxue/index.html');

assert.match(majorPath, /buildMajorMinScoreHref/);
assert.match(majorPathView, /data-min-score-entry="major"/);
assert.match(majorPathView, /min-score-navigation\.v001\.js\?v=001&r=r042-direct-min-score-handoff/);
assert.match(tongxue, /data-min-score-entry=/);
assert.match(tongxue, /暂时没有找到可展示的学生留言/);
assert.match(majorAll, /当前条件下没有找到辽宁最低分记录/);
assert.match(majorAll, /专业本身不一定不存在/);
assert.match(schoolAll, /当前条件下没有找到这所学校的辽宁最低分记录/);
assert.match(schoolAll, /这不一定代表学校没有招生/);
assert.match(majorAll, /autoQuery/);
const renderRecord = majorAll.slice(majorAll.indexOf('function renderRecord'), majorAll.indexOf('function mergeRecords'));
assert.match(renderRecord, /focus:'school-all'/);
assert.doesNotMatch(renderRecord, /majorKeyword/);
assert.match(workspace, /state\.filters\.majorKeyword = ''/);
assert.match(workspace, /url\.searchParams\.delete\('majorCode'\)/);
assert.match(workspace, /url\.searchParams\.delete\('majorConfirmed'\)/);
assert.match(workspace, /updateSearchUrl\(\{ push: true, focus: MODE_SCHOOL \}\)/);
assert.match(runtime, /r=r046-ln-rank-dynamic-focus-scroll/);
assert.match(release, /lnRankNavigationRevision: 'r046-ln-rank-dynamic-focus-scroll'/);
const lnRankIndex = read('ln-rank/index.html');
const lnRankBootstrap = read('ln-rank/js/app.v3990_3.js');
assert.match(lnRankIndex, /min-score-handoff-loading/);
assert.match(lnRankIndex, /正在读取辽宁最低分记录/);
assert.match(lnRankBootstrap, /MIN_SCORE_HANDOFF_TARGETS/);
assert.match(lnRankBootstrap, /gaokao:major-result-render/);
assert.match(lnRankBootstrap, /behavior: 'auto'/);
assert.match(lnRankBootstrap, /const nextFocus = new URLSearchParams/);
assert.match(majorIndex, /min-score-entry\.v001\.css\?v=001_0/);
assert.match(tongxueIndex, /min-score-entry\.v001\.css\?v=001_0/);

console.log(JSON.stringify({
  ok: true,
  version: 'v001',
  checks: ['major-route', 'school-route', 'identity-boundary', 'return-target-safety', 'friendly-empty-state', 'shared-ui-css']
}, null, 2));
