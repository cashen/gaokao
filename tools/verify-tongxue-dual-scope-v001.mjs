import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const controller = await readFile(new URL('../tongxue/app/tongxue-runtime-controller-v159.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../tongxue/index.html', import.meta.url), 'utf8');

for (const label of ['MAJOR_CATALOG_2026', 'resolveMajorInput', 'scope:\'major\'', '专业体验线索', '学校体验线索', '看专业怎么说', '看学校怎么说', "writeLocation('major'"]) {
  assert.ok(controller.includes(label), label);
}
for (const label of ['找学校或专业，看看大家怎么说', '输入学校、专业名称或专业代码', '学校看学校体验；专业先看资料']) {
  assert.ok(index.includes(label), label);
}
assert.match(controller, /if \(majorMatch\) \{/);
assert.match(controller, /params\.get\('scope'\) === 'major'/);

console.log(JSON.stringify({ ok: true, scopes: ['school', 'major'], majorInput: true, copySwitching: true }));
