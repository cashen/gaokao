import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SCHOOL_SOCIAL_LABEL_SOURCE_VERSION,
  SCHOOL_SOCIAL_LABEL_SOURCE_META,
  SCHOOL_SOCIAL_LABELS,
  getSchoolSocialLabels,
  getSchoolSocialLabelsForNames,
  getSchoolSocialLabelSchools,
  hasSchoolSocialLabel
} from '../shared/resources/schools/school-social-labels.v002_1.js';

const resource = fs.readFileSync('shared/resources/schools/school-social-labels.v002_1.js', 'utf8');

assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_VERSION, 'school-social-labels-v002.1');
assert.equal(SCHOOL_SOCIAL_LABELS.length, 29);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.sourceLabelCount, 29);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.sourceRelationCount, 839);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.resolvedRelationCount, 824);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.unresolvedRelationCount, 15);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.materializedSchoolLabelPairs, 804);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.materializedSchoolCount, 443);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.majorRelationCount, 0);
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_META.relationPolicy, 'source-derived-only; shared-school-profile-resolved; unresolved-fail-closed');

const hit = getSchoolSocialLabels('哈尔滨工业大学');
assert.equal(hit.length, 10);
for (const label of ['101计划','985','C9','E9','中坚九校','双一流','国防七子','建筑老八校','强基','机械五虎']) {
  assert.ok(hit.includes(label), `哈尔滨工业大学 missing ${label}`);
}

assert.equal(getSchoolSocialLabels('辽宁科技大学').length, 0);
assert.ok(getSchoolSocialLabels('东北大学秦皇岛分校').includes('985'));
assert.ok(getSchoolSocialLabels('哈尔滨工业大学（深圳）').includes('机械五虎'));
assert.deepEqual(getSchoolSocialLabelsForNames(['哈尔滨工业大学', '清华大学']), [...new Set([...getSchoolSocialLabels('哈尔滨工业大学'), ...getSchoolSocialLabels('清华大学')])].sort((a,b)=>a.localeCompare(b,'zh-CN')));
assert.ok(getSchoolSocialLabelSchools('C9').includes('哈尔滨工业大学'));
assert.equal(hasSchoolSocialLabel('哈尔滨工业大学', 'C9'), true);
assert.equal(hasSchoolSocialLabel('哈尔滨工业大学', '不存在的标签'), false);

assert.match(resource, /resolveSchoolProfile/);
assert.doesNotMatch(resource, /fuzzy/i);
assert.doesNotMatch(resource, /inferred/i);

console.log('school social labels v002.1 verified: 29 labels; 839 source relations; 824 resolved; 804 materialized pairs; 0 tagged-major relations');
