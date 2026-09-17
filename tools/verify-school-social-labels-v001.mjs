import assert from 'node:assert/strict';
import {
  getSchoolSocialLabels,
  getSchoolSocialLabelsForNames,
  listSchoolSocialLabels,
  SCHOOL_SOCIAL_LABEL_SOURCE_VERSION,
  SCHOOL_SOCIAL_LABEL_SOURCE_META
} from '../shared/resources/schools/school-social-labels.v001.js';

assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_VERSION, 'school-social-labels-v001');
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.labelCount, 29);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.relationCount, 839);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.schoolCount, 454);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.majorRelationCount, 0);
assert.equal(listSchoolSocialLabels().length, 29);
assert.deepEqual(getSchoolSocialLabels('辽宁科技大学'), []);
assert.deepEqual(getSchoolSocialLabels('沈阳航空航天大学'), []);
assert.deepEqual(getSchoolSocialLabels('大连交通大学'), []);
assert.deepEqual(getSchoolSocialLabels('大连理工大学'), ['101计划','985','建筑新八校','强基','双一流','E9']);
assert.deepEqual(getSchoolSocialLabelsForNames(['中国人民解放军海军军医大学']), ['211','军地四医','双一流']);
assert.deepEqual(getSchoolSocialLabelsForNames(['不存在的学校']), []);
console.log(JSON.stringify({
  ok:true,
  version:SCHOOL_SOCIAL_LABEL_SOURCE_VERSION,
  labels:listSchoolSocialLabels().length,
  sample:{
    dlut:getSchoolSocialLabels('大连理工大学'),
    lnst:getSchoolSocialLabels('辽宁科技大学'),
    naval:getSchoolSocialLabels('中国人民解放军海军军医大学')
  }
}, null, 2));
