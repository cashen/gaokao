import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Contract revision v0.02: the public result-view file is a compatibility/decorator
// entry; major-source introduction behavior is owned by result-view-core.
const entry = await readFile(new URL('../tongxue/app/tongxue-runtime-result-view-v159.js', import.meta.url), 'utf8');
const core = await readFile(new URL('../tongxue/app/tongxue-runtime-result-view-core-v159.js', import.meta.url), 'utf8');

assert.match(entry, /createBaseResultView/);
assert.match(entry, /createTongxueResultView/);
for (const label of ['先看懂这个专业', '专业是什么', '主要学什么', '毕业后做什么', '就业方向', '大学生怎么说']) {
  assert.ok(core.includes(label), label);
}
assert.match(core, /import\('\.\.\/\.\.\/ln-rank\/kb\/major-understanding\/major-source-profile\.generated\.js\?v=pr194-flow002'\)/);
assert.match(core, /mountMajorSourceIntro\(major\)/);
console.log(JSON.stringify({ ok: true, verifier: 'tongxue-major-source-intro-v0.02', scope: 'tongxue-major', sourceFields: 4, experienceLayer: 'separate', resultViewOwner: 'tongxue-runtime-result-view-core-v159' }));
