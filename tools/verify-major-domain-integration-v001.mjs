import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STANDARD_MAJOR_CATALOG_2026_FULL,
  STANDARD_MAJOR_CATEGORIES_2026_FULL
} from '../functions/_lib/kb/standard-major-catalog-2026-full.generated.js';
import { createMajorDomainOwner } from '../shared/resources/majors/major-domain-owner.v001.js';
import {
  MAJOR_DOMAIN_RUNTIME_ADAPTER_VERSION,
  resolveMajorDomainQuery
} from '../functions/_lib/major-domain-runtime-adapter.v001.js';

const rows = STANDARD_MAJOR_CATALOG_2026_FULL;
assert.ok(rows.length >= 800, 'the canonical catalog must remain the full undergraduate set');

const owner = createMajorDomainOwner({
  majorRows: rows,
  categories: STANDARD_MAJOR_CATEGORIES_2026_FULL
});
const adapter = resolveMajorDomainQuery('机械电子工程, 电气工程及其自动化 自动化');
assert.equal(adapter.version, MAJOR_DOMAIN_RUNTIME_ADAPTER_VERSION);
assert.equal(adapter.status, 'resolved');
assert.deepEqual(adapter.majorCodes, ['080204', '080601', '080801']);
assert.deepEqual(adapter.majorNames, ['机械电子工程', '电气工程及其自动化', '自动化']);
assert.deepEqual(adapter.unresolvedTerms, []);
assert.equal(adapter.failClosed, true);

const province = resolveMajorDomainQuery('电气工程及其自动化');
assert.deepEqual(province.majorCodes, ['080601']);

const unknown = resolveMajorDomainQuery('不存在的专业');
assert.equal(unknown.status, 'partial');
assert.deepEqual(unknown.majorCodes, []);
assert.deepEqual(unknown.unresolvedTerms, ['不存在的专业']);

const category = resolveMajorDomainQuery('电气类');
assert.equal(category.status, 'ambiguous');
assert.equal(category.failClosed, true);
assert.ok(category.ambiguousTerms[0].candidates.length > 0);

for (const path of ['functions/api/school-majors.js', 'functions/api/major-bands.js']) {
  const source = readFileSync(path, 'utf8');
  assert.match(source, /major-domain-runtime-adapter\.v001\.js/);
  assert.match(source, /majorDomain/);
}
assert.match(readFileSync('functions/api/school-majors.js', 'utf8'), /majorDomain,/);
assert.match(readFileSync('functions/api/major-bands.js', 'utf8'), /majorDomain,/);

console.log('PR193 runtime integration verification passed:', rows.length, 'majors');
