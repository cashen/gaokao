import assert from 'node:assert/strict';
import {
  STANDARD_MAJOR_CATALOG_2026_FULL,
  STANDARD_MAJOR_CATEGORIES_2026_FULL
} from '../functions/_lib/kb/standard-major-catalog-2026-full.generated.js';
import { createMajorDomainOwner } from '../shared/resources/majors/major-domain-owner.v001.js';

const rows = STANDARD_MAJOR_CATALOG_2026_FULL;
assert.ok(Array.isArray(rows) && rows.length >= 800, 'the canonical catalog must contain the full undergraduate major set');
assert.equal(new Set(rows.map(row => row.code)).size, rows.length, 'canonical major codes must be unique');

const calls = [];
const owner = createMajorDomainOwner({
  majorRows: rows,
  categories: STANDARD_MAJOR_CATEGORIES_2026_FULL,
  knowledgeResolver: async request => {
    calls.push(['knowledge', request]);
    return request.majorCodes;
  },
  schoolMajorResolver: async request => {
    calls.push(['schoolMajor', request]);
    return { school: request.school, majorCodes: request.majorCodes };
  },
  admissionResolver: async request => {
    calls.push(['admission', request]);
    return { region: request.region, majorCodes: request.majorCodes, includeCooperation: request.includeCooperation };
  },
  experienceResolver: async request => {
    calls.push(['experience', request]);
    return { majorCodes: request.majorCodes };
  }
});

for (const row of rows) {
  const resolved = owner.resolveIdentity(row.code);
  assert.equal(resolved.status, 'resolved', 'catalog code did not resolve: ' + row.code);
  assert.equal(resolved.major.code, row.code, 'catalog code resolved to another major: ' + row.code);
}

const electrical = owner.resolveIdentity('电气工程及其自动化');
assert.equal(electrical.status, 'resolved');
assert.equal(electrical.major.code, '080601');

const multi = await owner.planSchoolMajorQuery({
  school: '沈阳航空航天大学',
  majors: ['机械电子工程', '电气工程及其自动化', '自动化'],
  includeCooperation: true
});
assert.equal(multi.status, 'ok');
assert.deepEqual(multi.identity.majors.map(item => item.name), [
  '机械电子工程',
  '电气工程及其自动化',
  '自动化'
]);
assert.equal(multi.layers.schoolMajor.status, 'available');
assert.equal(multi.layers.admission.status, 'available');
assert.equal(multi.layers.experience.status, 'available');

const province = await owner.planProvinceMajorQuery({
  region: '辽宁',
  major: '电气工程及其自动化',
  includeCooperation: false,
  sort: 'score-desc'
});
assert.equal(province.status, 'ok');
assert.deepEqual(province.layers.admission.data, {
  region: '辽宁',
  majorCodes: ['080601'],
  includeCooperation: false
});
assert.ok(calls.some(([name]) => name === 'knowledge'));
assert.ok(calls.some(([name]) => name === 'schoolMajor'));
assert.ok(calls.some(([name]) => name === 'admission'));
assert.ok(calls.some(([name]) => name === 'experience'));

const unresolved = owner.resolveIdentity('不存在的专业');
assert.equal(unresolved.status, 'unresolved');
const category = owner.resolveIdentity('工学');
assert.notEqual(category.status, 'resolved', 'a discipline/category must not silently become one major');

assert.deepEqual(owner.meta.pipeline, [
  'major-identity',
  'major-knowledge',
  'school-major-relationship',
  'admission-history',
  'student-experience',
  'human-answer'
]);

console.log('PR193 major domain owner verification passed:', rows.length, 'majors');
