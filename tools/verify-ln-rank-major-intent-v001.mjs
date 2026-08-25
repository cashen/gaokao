import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STANDARD_MAJOR_CATALOG_2026_FULL } from '../functions/_lib/kb/standard-major-catalog-2026-full.generated.js';
import { createMajorIntentResolver } from '../shared/resources/majors/major-intent-resolver.v001.js';
import { resolveMajorQueryCandidates } from '../ln-rank/js/knowledge/major-understanding-resolver.js';
import { buildKeywordQuery } from '../functions/_lib/keyword-query.js';
import { buildSearchIndex } from '../functions/_lib/search-index-builder.js';
import { matchMajorProject } from '../functions/_lib/major-project-matcher.js';

const resolver = createMajorIntentResolver(STANDARD_MAJOR_CATALOG_2026_FULL, [], { sourceVersion: 'standard-major-catalog-2026' });
const majorHistorySource = readFileSync('functions/api/ai/major-history.js', 'utf8');
assert.match(majorHistorySource, /createMajorIntentResolver/);
assert.match(majorHistorySource, /resolveMajorInputs/);
assert.match(majorHistorySource, /major_query_requires_choice/);
assert.match(majorHistorySource, /majorScope/);
assert.match(majorHistorySource, /isAdmissionGroupKey/);

assert.equal(resolver.count, 883, 'catalog must cover all current undergraduate majors');
assert.equal(resolver.categoryCount, 92, 'cross-discipline label must not become a fake major class');
assert.equal(resolver.disciplineCount, 13, 'catalog must preserve the 13 discipline domains');

const codes = new Set();
const names = new Set();
for (const row of STANDARD_MAJOR_CATALOG_2026_FULL) {
  assert.ok(!codes.has(row.code), `duplicate major code: ${row.code}`);
  assert.ok(!names.has(row.name), `duplicate major name: ${row.name}`);
  codes.add(row.code);
  names.add(row.name);

  const byCode = resolver.resolve(row.code);
  assert.equal(byCode.status, 'ready', `code should resolve: ${row.code}`);
  assert.deepEqual(byCode.coreMajorCodes, [row.code], `code should resolve only itself: ${row.code}`);

  const byName = resolver.resolve(row.name);
  assert.equal(byName.status, 'ready', `name should resolve: ${row.name}`);
  assert.deepEqual(byName.coreMajorCodes, [row.code], `name should resolve only itself: ${row.name}`);
}

function intent(query) {
  return resolver.resolve(query);
}

assert.equal(intent('机械').intentLevel, 'direction');
assert.ok(intent('机械').coreMajorCodes.length >= 10, '机械 must remain a direction collection');
assert.ok(intent('机械').coreMajorCodes.some(code => code === '080204'), '机械方向 must include 机械电子工程');

assert.equal(intent('计算机').intentLevel, 'direction');
assert.ok(intent('计算机').coreMajorCodes.length >= 10, '计算机 must remain a direction collection');
assert.ok(intent('计算机').coreMajorCodes.some(code => code === '080904K'), '计算机方向 must include 信息安全');
assert.ok(intent('计算机').coreMajorCodes.some(code => code === '080911TK'), '计算机方向 must include 网络空间安全');

assert.equal(intent('机').status, 'too-broad');
assert.equal(intent('工科').status, 'too-broad');
assert.equal(intent('医学').status, 'too-broad');
assert.equal(intent('一级学科机械工程').intentLevel, 'discipline');
assert.equal(intent('交叉学科门类').intentLevel, 'discipline');
assert.equal(intent('机械类').intentLevel, 'major-class');
assert.equal(intent('计算机类').intentLevel, 'major-class');

const uiResolver = resolveMajorQueryCandidates('计算机');
assert.equal(uiResolver.catalogCount, 883);
assert.equal(uiResolver.items[0].intentLevel, 'direction');
assert.equal(uiResolver.items[0].intentStatus, 'ready');
assert.ok(uiResolver.items[0].coreMajorNames.includes('网络空间安全'));
assert.ok(uiResolver.items[0].coreMajorNames.includes('信息安全'));

const indexed = buildSearchIndex([
  { standardMajor: { code: '080904K', name: '信息安全' } },
  { standardMajor: { code: '080201', name: '机械工程' } }
]);
const computerQuery = buildKeywordQuery('计算机');
assert.ok(computerQuery.majorCodes.includes('080904K'));
assert.equal(matchMajorProject(indexed[0], computerQuery).matched, true, 'computer direction must include information security');
assert.equal(matchMajorProject(indexed[1], computerQuery).matched, false, 'computer direction must exclude mechanical engineering');
assert.equal(buildKeywordQuery('机').majorIntentFailClosed, true, 'single-character broad input must fail closed');
const combinedQuery = buildKeywordQuery('机械/计算机');
assert.ok(combinedQuery.majorCodes.includes('080201'));
assert.ok(combinedQuery.majorCodes.includes('080901'));

console.log(JSON.stringify({
  ok: true,
  catalogCount: resolver.count,
  categoryCount: resolver.categoryCount,
  disciplineCount: resolver.disciplineCount,
  checkedCodes: codes.size,
  checkedNames: names.size,
  examples: ['机', '机械', '计算机', '网络安全', '医学', '一级学科机械工程', '交叉学科门类']
}, null, 2));
