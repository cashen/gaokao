import assert from 'node:assert/strict';
import {
  SCHOOL_SOCIAL_LABEL_SOURCE_VERSION,
  SCHOOL_SOCIAL_LABEL_SOURCE_META,
  getSchoolSocialLabels,
  getSchoolSocialLabelsForNames,
  getSchoolSocialLabelSchools,
  hasSchoolSocialLabel
} from '../shared/resources/schools/school-social-labels.v002_1.js';
import {
  SCHOOL_SOCIAL_LABEL_SHARED_VERSION,
  getSchoolSocialLabels as getSharedSchoolSocialLabels
} from '../shared/resources/schools/school-social-labels.shared-v001.js';

assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_VERSION, 'school-social-labels-v002.1');
assert.equal(SCHOOL_SOCIAL_LABEL_SHARED_VERSION, 'school-social-label-shared-v001');
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.labelCount, 29);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.sourceRelationCount, 839);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.resolvedProfileRelations, 824);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.unresolvedRelations, 15);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.encodedUniqueRelations, 804);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.majorRelationCount, 0);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.fuzzyMatching, false);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.inferredRelations, false);

const hitExpected = ['101计划','985','国防七子','机械五虎','建筑老八校','强基','双一流','中坚九校','C9','E9'];
assert.deepEqual(getSchoolSocialLabels('哈尔滨工业大学'), hitExpected);
assert.deepEqual(getSchoolSocialLabels('哈尔滨工业大学（深圳）'), ['101计划','985','国防七子','机械五虎','建筑老八校','双一流','中坚九校','C9','E9'].filter(Boolean));

const lnk = getSharedSchoolSocialLabels('江西现代职业技术学院');
assert.deepEqual(lnk, ['双高']);
assert.deepEqual(getSharedSchoolSocialLabels('江西现代职业学院'), ['双高']);
assert.equal(hasSchoolSocialLabel('江西现代职业技术学院', '双高'), true);
assert.equal(getSchoolSocialLabelSchools('双高').includes('江西现代职业技术学院'), true);

for (const unresolved of [
  '安徽大学纽约石溪学院',
  '复旦大学上海医学院',
  '陆军兵种大学',
  '陆军防化学院',
  '陆军工程大学',
  '西南大学西塔学院',
  '香港中文大学',
  '中国人民解放军陆军军医大学'
]) {
  assert.deepEqual(getSchoolSocialLabels(unresolved), [], unresolved);
}

assert.deepEqual(
  getSchoolSocialLabelsForNames(['哈尔滨工业大学', '辽宁科技大学', '江西现代职业学院']),
  [...new Set([...hitExpected, '双高'])]
);

console.log('school-social-labels-v002.1 source/shared contract: PASS');
