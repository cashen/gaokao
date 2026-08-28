import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = await readFile(new URL('../tongxue/app/tongxue-runtime-result-view-v159.js', import.meta.url), 'utf8');
for (const label of ['先看懂这个专业', '专业是什么', '主要学什么', '毕业后做什么', '就业方向', '大学生怎么说']) {
  assert.ok(file.includes(label), label);
}
assert.match(file, /import\('\.\.\/\.\.\/ln-rank\/kb\/major-understanding\/major-source-profile\.generated\.js\?v=pr194-flow002'\)/);
assert.match(file, /mountMajorSourceIntro\(major\)/);
console.log(JSON.stringify({ ok: true, scope: 'tongxue-major', sourceFields: 4, experienceLayer: 'separate' }));
