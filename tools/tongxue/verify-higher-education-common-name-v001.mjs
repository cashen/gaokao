import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  HIGHER_EDUCATION_COMMON_NAME_TYPE,
  HIGHER_EDUCATION_COMMON_NAME_NOTICE,
  listHigherEducationCommonNames,
  resolveHigherEducationCommonNameSchools,
  higherEducationCommonNameHandoffPayload
} from '../../shared/resources/higher-education/higher-education-common-names.v001.js';

const wrapper = fs.readFileSync('tongxue/app/tongxue-runtime-result-view-v159.js', 'utf8');
const base = fs.readFileSync('tongxue/app/tongxue-runtime-result-view-base-v159.js', 'utf8');
const resource = fs.readFileSync('shared/resources/higher-education/higher-education-common-names.v001.js', 'utf8');
const items = listHigherEducationCommonNames();

assert.equal(HIGHER_EDUCATION_COMMON_NAME_TYPE, '高校民间称谓');
assert.match(HIGHER_EDUCATION_COMMON_NAME_NOTICE, /不是教育部门的官方分类/);
assert.equal(items.length, 8);
for (const item of items) {
  const resolved = resolveHigherEducationCommonNameSchools(item.id);
  assert.equal(resolved.status, 'resolved', `${item.name} must fully resolve`);
  assert.equal(resolved.members.length, item.memberSchoolNames.length, `${item.name} member count mismatch`);
  assert.ok(item.sources.length >= 1, `${item.name} source provenance missing`);
}

assert.deepEqual(
  resolveHigherEducationCommonNameSchools('east-china-five').members.map(item => item.displayName),
  ['复旦大学','上海交通大学','南京大学','浙江大学','中国科学技术大学']
);
assert.deepEqual(
  resolveHigherEducationCommonNameSchools('national-defense-seven').members.map(item => item.displayName),
  ['北京航空航天大学','北京理工大学','哈尔滨工业大学','哈尔滨工程大学','南京航空航天大学','南京理工大学','西北工业大学']
);
assert.deepEqual(
  resolveHigherEducationCommonNameSchools('mechanical-four-dragons').members.map(item => item.displayName),
  ['合肥工业大学','湖南大学','吉林大学','燕山大学']
);
assert.deepEqual(
  resolveHigherEducationCommonNameSchools('mechanical-five-tigers').members.map(item => item.displayName),
  ['清华大学','上海交通大学','华中科技大学','西安交通大学','哈尔滨工业大学']
);

const payload = higherEducationCommonNameHandoffPayload('上海交通大学', '');
assert.equal(payload.handoffContractVersion, 'higher-education-common-name-handoff-v001');
assert.equal(payload.commonNameType, HIGHER_EDUCATION_COMMON_NAME_TYPE);
assert.equal(payload.sourceSurface, 'tongxue');
assert.equal(payload.sourceAction, 'view_common_name_schools');
assert.equal(payload.canonicalSchoolName, '上海交通大学');
assert.ok(payload.candidateSchoolIds.length === 5);

assert.match(wrapper, /createBaseTongxueResultView/);
assert.match(wrapper, /MutationObserver/);
assert.match(wrapper, /高校民间称谓/);
assert.doesNotMatch(wrapper, /fetch\s*\(/);
assert.doesNotMatch(wrapper, /addEventListener\s*\(/);
assert.match(base, /export function createTongxueResultView/);
assert.match(base, /PAGE_VERSION = 'v1\.5\.9-uec01-evidence02'/);
assert.match(resource, /majorRelation/); // source semantics remain explicit in the staged lineage, not inferred here

console.log(`higher-education-common-name v001 verified: ${items.length} names; ${items.reduce((n, i) => n + i.memberSchoolNames.length, 0)} canonical memberships`);
