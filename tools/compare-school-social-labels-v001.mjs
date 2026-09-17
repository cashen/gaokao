import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  getSchoolSocialLabelRelationFingerprint,
  listSchoolSocialLabelRelations,
  SCHOOL_SOCIAL_LABEL_SOURCE_META,
  SCHOOL_SOCIAL_LABEL_SOURCE_VERSION
} from '../shared/resources/schools/school-social-labels.v001.js';

const file = process.argv[2];
assert.ok(file, 'harvest payload path is required');
const payload = JSON.parse(await fs.readFile(file, 'utf8'));
const expected = [];
for (const label of payload.labels || []) {
  for (const school of label.schoolMatches || []) expected.push({ label: String(label.label), school: String(school.name) });
}
const actual = listSchoolSocialLabelRelations().map(row => ({ label: String(row.label), school: String(row.school) }));
const key = row => `${row.label}\u0000${row.school}`;
const sortRows = rows => rows.slice().sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans') || a.school.localeCompare(b.school, 'zh-Hans'));
const expectedSorted = sortRows(expected);
const actualSorted = sortRows(actual);
const expectedKeys = new Set(expectedSorted.map(key));
const actualKeys = new Set(actualSorted.map(key));
const missing = expectedSorted.filter(row => !actualKeys.has(key(row)));
const extra = actualSorted.filter(row => !expectedKeys.has(key(row)));

assert.equal(expected.length, SCHOOL_SOCIAL_LABEL_SOURCE_META.relationCount, 'fresh source relation count differs from locked metadata');
assert.equal(expected.length, actual.length, 'committed relation count differs from fresh source');
assert.equal(missing.length, 0, `committed resource is missing ${missing.length} fresh relations: ${JSON.stringify(missing.slice(0, 20))}`);
assert.equal(extra.length, 0, `committed resource adds ${extra.length} relations not present in fresh source: ${JSON.stringify(extra.slice(0, 20))}`);
assert.equal(payload.summary?.totalSchoolLabelRelations, SCHOOL_SOCIAL_LABEL_SOURCE_META.relationCount, 'harvest summary relation count changed');
assert.equal(payload.summary?.totalMajorLabelRelations || 0, 0, 'fresh source unexpectedly exposes major-label relations');
assert.equal(SCHOOL_SOCIAL_LABEL_SOURCE_VERSION, 'school-social-labels-v001');
assert.equal(getSchoolSocialLabelRelationFingerprint(), 'e13d08d2');

console.log(JSON.stringify({
  ok: true,
  relationCount: actual.length,
  schoolCount: new Set(actual.map(row => row.school)).size,
  labelCount: new Set(actual.map(row => row.label)).size,
  fingerprint: getSchoolSocialLabelRelationFingerprint(),
  freshSummary: payload.summary
}, null, 2));
