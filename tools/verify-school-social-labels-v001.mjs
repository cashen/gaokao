import assert from 'node:assert/strict';
import {
  getSchoolSocialLabels,
  getSchoolSocialLabelsForNames,
  getSchoolSocialLabelRelationFingerprint,
  listSchoolSocialLabelRelations,
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
assert.equal(listSchoolSocialLabelRelations().length, 839);
assert.equal(getSchoolSocialLabelRelationFingerprint(), 'e13d08d2');

const expectedCounts = {
  '101计划':91,'211':82,'985':50,'八大美院':8,'兵工七子':7,'电力部老六校':6,
  '电气二龙':3,'电气四虎':5,'国防七子':9,'华东五虎':8,'机械四小龙':5,'机械五虎':8,
  '建筑老八校':10,'建筑新八校':11,'军地四医':4,'军工六校':6,'两财一贸':3,'两电一邮':3,
  '南北双药':2,'七所海大':7,'强基':39,'师大六姐妹':7,'双高':248,'双一流':164,
  '五院四系':11,'医药双雄':4,'中坚九校':11,'C9':15,'E9':12
};
const actualCounts = Object.fromEntries(listSchoolSocialLabels().map(label => [label, 0]));
for (const row of listSchoolSocialLabelRelations()) actualCounts[row.label] = (actualCounts[row.label] || 0) + 1;
assert.deepEqual(actualCounts, expectedCounts);

assert.deepEqual(getSchoolSocialLabels('辽宁科技大学'), []);
assert.deepEqual(getSchoolSocialLabels('沈阳航空航天大学'), []);
assert.deepEqual(getSchoolSocialLabels('大连交通大学'), []);
assert.deepEqual(getSchoolSocialLabels('大连理工大学'), ['101计划','985','建筑新八校','强基','双一流','E9']);
assert.deepEqual(getSchoolSocialLabelsForNames(['中国人民解放军海军军医大学']), ['211','军地四医','双一流']);
assert.deepEqual(getSchoolSocialLabelsForNames(['不存在的学校']), []);

console.log(JSON.stringify({
  ok:true,
  version:SCHOOL_SOCIAL_LABEL_SOURCE_VERSION,
  relationCount:listSchoolSocialLabelRelations().length,
  fingerprint:getSchoolSocialLabelRelationFingerprint(),
  labels:listSchoolSocialLabels().length
}, null, 2));
