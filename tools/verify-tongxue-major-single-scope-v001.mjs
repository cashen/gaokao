import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STANDARD_MAJOR_CATALOG_2026_FULL } from '../functions/_lib/kb/standard-major-catalog-2026-full.generated.js';
import { resolveTongxueMajorInput, getTongxueMajorResolver } from '../shared/resources/majors/tongxue-single-major-adapter.v001.js';

const controller = await readFile(new URL('../tongxue/app/tongxue-runtime-controller-v159.js', import.meta.url), 'utf8');
const searchView = await readFile(new URL('../tongxue/app/tongxue-runtime-search-view-v159.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../tongxue/index.html', import.meta.url), 'utf8');
const resolver = getTongxueMajorResolver();

assert.equal(resolver.count, 883, 'canonical major count');
assert.equal(new Set(STANDARD_MAJOR_CATALOG_2026_FULL.map(item => item.categoryName).filter(Boolean)).size, 92, 'canonical category count');
assert.equal(new Set(STANDARD_MAJOR_CATALOG_2026_FULL.map(item => item.disciplineName).filter(Boolean)).size, 13, 'canonical discipline count');

const exact = resolveTongxueMajorInput('电气工程及其自动化');
assert.equal(exact.status, 'resolved');
assert.equal(exact.major.code, '080601');
assert.equal(exact.candidates.length, 0);

const code = resolveTongxueMajorInput('080601');
assert.equal(code.status, 'resolved');
assert.equal(code.major.name, '电气工程及其自动化');
assert.equal(code.matchType, 'code_exact');

for (const input of ['电气', '机械', '计算机', '软甲工程', '网络安全']) {
  const result = resolveTongxueMajorInput(input);
  assert.equal(result.status, 'ambiguous', `${input} must ask for a concrete major`);
  assert.ok(result.candidates.length > 0, `${input} candidates`);
}

for (const input of ['机', '工科', '医学', '一级学科机械工程']) {
  const result = resolveTongxueMajorInput(input);
  assert.equal(result.status, 'too-broad', `${input} must not query directly`);
  assert.ok(result.directionChoices.length > 0, `${input} direction choices`);
}

assert.equal(resolveTongxueMajorInput('计算机类').status, 'ambiguous');
assert.equal(resolveTongxueMajorInput('机械/电气').status, 'multi-major');
assert.equal(resolveTongxueMajorInput('机械、电气').status, 'multi-major');
assert.equal(resolveTongxueMajorInput('机械+电气').status, 'multi-major');

for (const label of [
  "resolveTongxueMajorInput",
  "searchView.renderMajorGuidance",
  "scope:'major'",
  "majorCode",
  "major",
  "data-major-direction",
  "data-major-choice",
  "writeLocation('query', input, '', options.historyMode || 'push', { scope:'major' })"
]) {
  assert.ok(controller.includes(label), `controller contract: ${label}`);
}
assert.match(controller, /const scopeReady = state\.scope === 'major' \|\| state\.ready/);
assert.match(controller, /const majorQuery = normalizeSchool\(params\.get\('q'\)\)/);
assert.match(controller, /data-scope-switch/);
assert.match(controller, /输入专业名称、简称或代码/);
assert.match(searchView, /一次查看一个专业/);
assert.match(searchView, /不会合并查询多个专业/);
assert.match(index, /data-scope-switch="major"/);
assert.match(index, /data-scope-examples="major"/);

console.log(JSON.stringify({
  ok: true,
  catalogCount: resolver.count,
  categoryCount: new Set(STANDARD_MAJOR_CATALOG_2026_FULL.map(item => item.categoryName).filter(Boolean)).size,
  disciplineCount: new Set(STANDARD_MAJOR_CATALOG_2026_FULL.map(item => item.disciplineName).filter(Boolean)).size,
  singleMajorOnly: true,
  multiMajorRequests: 0
}));
