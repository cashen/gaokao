import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  HIGHER_EDUCATION_COMMON_NAME_VERSION,
  HIGHER_EDUCATION_COMMON_NAME_TYPE,
  HIGHER_EDUCATION_COMMON_NAME_NOTICE,
  listHigherEducationCommonNames,
  resolveHigherEducationCommonNameSchools,
  higherEducationCommonNameHandoffPayload
} from '../../shared/resources/higher-education/higher-education-common-names.v003.js';

const wrapper = fs.readFileSync('tongxue/app/tongxue-runtime-result-view-v159.js', 'utf8');
const core = fs.readFileSync('tongxue/app/tongxue-runtime-result-view-core-v159.js', 'utf8');
const resource = fs.readFileSync('shared/resources/higher-education/higher-education-common-names.v003.js', 'utf8');
const directory = JSON.parse(fs.readFileSync('tongxue/data/school-search-index.20260617-v150.json', 'utf8'));
const directoryNames = new Set((directory.schools || []).map(row => String(row?.[0] || '').trim()).filter(Boolean));
const items = listHigherEducationCommonNames();

assert.equal(HIGHER_EDUCATION_COMMON_NAME_VERSION, 'higher-education-common-name-v003');
assert.equal(HIGHER_EDUCATION_COMMON_NAME_TYPE, '高校民间称谓');
assert.match(HIGHER_EDUCATION_COMMON_NAME_NOTICE, /不是教育部门的官方分类/);
assert.equal(items.length, 8);
for (const item of items) {
  const resolved = resolveHigherEducationCommonNameSchools(item.id);
  assert.equal(resolved.status, 'resolved', `${item.name} must fully resolve`);
  assert.equal(resolved.members.length, item.memberSchoolNames.length, `${item.name} member count mismatch`);
  assert.ok(item.sources.length >= 1, `${item.name} source provenance missing`);
  for (const name of item.memberSchoolNames) {
    assert.ok(directoryNames.has(name), `${item.name}: member missing from current MOE school directory: ${name}`);
  }
}

assert.deepEqual(resolveHigherEducationCommonNameSchools('east-china-five').members.map(item => item.displayName), ['复旦大学','上海交通大学','南京大学','浙江大学','中国科学技术大学']);
assert.deepEqual(resolveHigherEducationCommonNameSchools('national-defense-seven').members.map(item => item.displayName), ['北京航空航天大学','北京理工大学','哈尔滨工业大学','哈尔滨工程大学','南京航空航天大学','南京理工大学','西北工业大学']);
assert.deepEqual(resolveHigherEducationCommonNameSchools('mechanical-four-dragons').members.map(item => item.displayName), ['合肥工业大学','湖南大学','吉林大学','燕山大学']);
assert.deepEqual(resolveHigherEducationCommonNameSchools('mechanical-five-tigers').members.map(item => item.displayName), ['清华大学','上海交通大学','华中科技大学','西安交通大学','哈尔滨工业大学']);

const resolved = resolveHigherEducationCommonNameSchools('east-china-five');
assert.ok(resolved.members.every(item => item.resolutionKind === 'identity-center' || item.resolutionKind === 'education-ministry-directory'));
assert.ok(resolved.members.some(item => item.resolutionKind === 'education-ministry-directory'), 'fallback should be exercised by the incomplete entity center');

const payload = higherEducationCommonNameHandoffPayload('上海交通大学', '');
assert.equal(payload.handoffContractVersion, 'higher-education-common-name-handoff-v001');
assert.equal(payload.commonNameType, HIGHER_EDUCATION_COMMON_NAME_TYPE);
assert.equal(payload.sourceSurface, 'tongxue');
assert.equal(payload.sourceAction, 'view_common_name_schools');
assert.equal(payload.canonicalSchoolName, '上海交通大学');
assert.equal(payload.candidateSchoolNames.length, 5);
assert.ok(payload.candidateSchoolIds.length <= payload.candidateSchoolNames.length);

assert.match(wrapper, /createBaseResultView/);
assert.doesNotMatch(wrapper, /MutationObserver/);
assert.doesNotMatch(wrapper, /setInterval\s*\(/);
assert.doesNotMatch(wrapper, /setTimeout\s*\(/);
assert.doesNotMatch(wrapper, /addEventListener\s*\(/);
assert.match(wrapper, /高校民间称谓/);
assert.match(wrapper, /higher-education-common-names\.v003/);
assert.match(wrapper, /renderResult/);
assert.match(wrapper, /renderActiveReviews/);
assert.doesNotMatch(wrapper, /fetch\s*\(/);
assert.match(wrapper, /这是一次独立查询/);
assert.match(wrapper, /回到专业升学地图/);
assert.match(wrapper, /回到刚才的分数结果/);
assert.match(core, /export function createTongxueResultView/);
assert.match(core, /PAGE_VERSION = 'v1\.5\.9-uec01-evidence02'/);
assert.doesNotMatch(core, /高校民间称谓/);
assert.match(resource, /resolveCompactSchoolResource/);
assert.match(resource, /education-ministry-directory/);
assert.match(resource, /directory-name-verified/);

console.log(`higher-education-common-name v003 verified: ${items.length} names; ${items.reduce((n, i) => n + i.memberSchoolNames.length, 0)} directory-backed memberships`);
